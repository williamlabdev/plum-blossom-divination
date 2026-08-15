# -*- coding: utf-8 -*-
"""
古籍卦例採集器（2026-08-15）

用途：從殆知閣古籍純文字檔裡撈出「月建 + 日干支 + 本卦 + 單一動爻 + 應驗」齊全的六爻卦例，
      並自動排除已收語料。**這支工具只負責撈候選，收不收要人自己讀原文判斷。**

先取原文：
    mkdir -p books && cd books
    for p in 易藏/术数/增删卜易.txt 易藏/术数/易冒.txt 易藏/术数/易隐.txt \
             易藏/术数/卜筮全书.txt 易藏/术数/卜筮正宗.txt 易藏/术数/易林补遗.txt; do
      enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$p")
      curl -sL -O "https://raw.githubusercontent.com/garychowcmu/daizhigev20/master/$enc"
    done

再跑：
    python3 tools/collect-cases.py books

--------------------------------------------------------------------------
踩過的坑（都寫在 CLAUDE.md「案例從哪裡來」，這裡是程式對應）：

1. 易冒寫「X建」不寫「X月」        → RE_MONTH_DAY 的 [月建]
2. 增刪卜易用「變」不用「之」且用全名 → 掃 '之变變' 三個字，卦名雙向試 1..4 字
3. 卜筮全書用數字月份「七月乙未日」  → NUM2ZHI
4. 月日錨點離卦例太遠會抓到前一則的日期 → WINDOW=35 且不跨句號（放寬到 100 會錯 4/24）
--------------------------------------------------------------------------
"""
import re, sys, json, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WINDOW = 35          # 錨點→卦名對的最大距離；放寬會抓到前一則案例的日期

# ── 卦表：直接吃 src/lib/data/zhouyi.ts，不另外維護一份 ──────────────────
def load_gua():
    t = open(os.path.join(ROOT, 'src/lib/data/zhouyi.ts'), encoding='utf-8').read()
    s = t.index('ZhouyiGua[] = ') + len('ZhouyiGua[] = ')
    e = t.index('\n];', s)
    return json.loads(t[s:e + 2])

GUA = load_gua()
NAMES = {g['name'] for g in GUA}
FULL = {g['fullName']: g['name'] for g in GUA}
LINES = {g['name']: g['lines'] for g in GUA}
FULLOF = {g['name']: g['fullName'] for g in GUA}

# 底本是簡體 OCR：只轉卦名會用到的字，避免波及正文
S2T = str.maketrans({
    '讼': '訟', '师': '師', '谦': '謙', '随': '隨', '蛊': '蠱', '临': '臨', '观': '觀',
    '贲': '賁', '剥': '剝', '复': '復', '无': '無', '颐': '頤', '过': '過', '离': '離',
    '恒': '恆', '遁': '遯', '壮': '壯', '晋': '晉', '损': '損', '渐': '漸', '归': '歸',
    '丰': '豐', '兑': '兌', '涣': '渙', '节': '節', '济': '濟', '风': '風', '泽': '澤',
    '为': '為',
})
ALIAS = {'遁': '遯', '无妄': '無妄', '大壮': '大壯'}

GAN, ZHI = '甲乙丙丁戊己庚辛壬癸', '子丑寅卯辰巳午未申酉戌亥'
JIAZI = {GAN[i % 10] + ZHI[i % 12] for i in range(60)}
NUM2ZHI = {'正': '寅', '一': '寅', '二': '卯', '三': '辰', '四': '巳', '五': '午', '六': '未',
           '七': '申', '八': '酉', '九': '戌', '十': '亥', '十一': '子', '十二': '丑'}

RE_MONTH_DAY = re.compile(
    r'([子丑寅卯辰巳午未申酉戌亥]|十[一二]|[正一二三四五六七八九十])[月建]'
    r'[^。；]{0,8}?([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])日')
RE_VERIFIED = re.compile(
    r'果|後|后|卒于|卒於|死于|死於|愈|驗|验|竟|遂|已而|'
    r'至[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥][日月]')
RE_HAN = re.compile(r'[一-龥]')
# 章名有三種寫法：「日辰章第十七」「《星煞章》第三十三」「增刪《黃金策千金賦》第三十四」。
# 只認第一種會漏掉整段章名，導致回溯到很前面的章、把出處標錯。
RE_CHAPTER = re.compile(
    r'((?:《[一-龥]{2,14}》|[一-龥]{2,12}章》?)第[一二三四五六七八九十百]+)')
CHAPTER_MAX_GAP = 8000   # 離最近章名超過這個距離就不標章，寧可只寫書名也不要標錯出處
# 粗篩用：天時類與「法則示範」在收錄標準裡都是排除項，先標出來省人力
RE_TIANSHI = re.compile(r'晴|雨|雪|阴晴|陰晴|天时|天時')
RE_DEMO = re.compile(r'用(官|父|子|财|財|兄|神)')


def match_gua(s):
    """只接受完整卦名（單名或全名）。不做尾綴猜測——猜測會把『天小畜』之類的 OCR 殘字收進來。"""
    r = ALIAS.get(s.translate(S2T), s.translate(S2T))
    if r in NAMES:
        return r
    if r in FULL:
        return FULL[r]
    return None


def dong_yao(ben, bian):
    a, b = LINES[ben], LINES[bian]
    return [i + 1 for i in range(6) if a[i] != b[i]]


def scan(text, book, out):
    for md in RE_MONTH_DAY.finditer(text):
        seg = text[md.end(): md.end() + WINDOW]
        if '。' in seg:
            seg = seg[:seg.index('。')]
        for j, ch in enumerate(seg):
            if ch not in '之变變':
                continue
            i = md.end() + j
            ben = bian = None
            bl = br = 0
            for k in (4, 3, 2, 1):                       # 左側先試全名（乾為天）再試單名（乾）
                s = text[max(0, i - k):i]
                if len(s) == k and all(RE_HAN.match(c) for c in s):
                    g = match_gua(s)
                    if g:
                        ben, bl = g, k
                        break
            if not ben:
                continue
            for k in (4, 3, 2, 1):
                s = text[i + 1: i + 1 + k]
                if len(s) == k and all(RE_HAN.match(c) for c in s):
                    g = match_gua(s)
                    if g:
                        bian, br = g, k
                        break
            if not bian or ben == bian:
                continue
            d = dong_yao(ben, bian)
            if len(d) != 1:                              # 引擎是單一動爻模型，多爻另存
                continue
            end = i + 1 + br
            if not RE_VERIFIED.search(text[end:end + 450]):
                continue
            gz = md.group(2)
            if gz not in JIAZI:
                continue
            key = (gz, FULLOF[ben], FULLOF[bian])
            if key in out:
                break
            chapters = [m for m in RE_CHAPTER.finditer(text[:i])
                        if i - m.start() <= CHAPTER_MAX_GAP]
            mid = text[md.end():i - bl]
            out[key] = {
                'book': book,
                'chapter': chapters[-1].group(1) if chapters else None,
                'monthBranch': NUM2ZHI.get(md.group(1), md.group(1)),
                'dayGanZhi': gz,
                'benGua': FULLOF[ben], 'bianGua': FULLOF[bian], 'dongYao': d,
                'question': mid.strip('，,、 '),
                # 粗分類，仍須人工複核
                'flag': ('天時' if RE_TIANSHI.search(mid)
                         else '法則示範' if (RE_DEMO.search(mid) and '占' not in mid)
                         else ''),
                'ctx': text[max(0, i - bl - 150): end + 460].replace('\n', '').replace('　', ''),
            }
            break


def main(root):
    seen = set()
    for f in ('classic-cases.json', 'classic-cases-multi.json'):
        p = os.path.join(ROOT, 'src/lib/data', f)
        if os.path.exists(p):
            seen |= {(c['dayGanZhi'], c['benGua']) for c in json.load(open(p, encoding='utf-8'))}

    out = {}
    files = glob.glob(os.path.join(root, '**', '*.txt'), recursive=True)
    for f in files:
        text = open(f, encoding='utf-8', errors='replace').read()
        if not RE_MONTH_DAY.search(text):
            continue
        scan(text, os.path.relpath(f, root)[:-4], out)

    new = [v for v in out.values() if (v['dayGanZhi'], v['benGua']) not in seen]
    dst = os.path.join(ROOT, 'tools/candidates.json')
    json.dump(new, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    from collections import Counter
    print(f'掃 {len(files)} 檔 → 命中 {len(out)} → 未收 {len(new)}')
    print('  書別 :', dict(Counter(v['book'] for v in new)))
    print('  粗分類:', dict(Counter(v['flag'] or '待人工判讀' for v in new)))
    print(f'→ {dst}')
    print('\n候選不等於可收。逐則讀 ctx 確認「有真實占事」且「有應驗結果」，再依收錄標準取捨。')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'books')
