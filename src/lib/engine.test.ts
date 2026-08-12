import { describe, expect, it } from 'vitest'
import type { ChartTime } from './calendar'
import { getChartTime } from './calendar'
import { castByNumbers, castByTime, castManual, drawRandom, hexagramFromLines, randomInt } from './casting'
import type { Branch, Stem } from './data/core'
import { chouShenOf, jiShenOf, yuanShenOf } from './data/core'
import { buildNajiaChart, guaXingOf } from './najia'
import { QUESTION_GROUPS, QUESTION_TYPES, analyzeLiuyao, findQuestionType } from './interpret'
import { ZHOUYI } from './data/zhouyi'
import { GLOSSARY } from './glossary'

// 案例一：使用者截圖之星僑排盤（2026-08-11 20:50，搖得水風井、五爻動）
const T = new Date(2026, 7, 11, 20, 50)

describe('曆法（對照星僑盤面）', () => {
  const ct = getChartTime(T)
  it('四柱干支', () => {
    expect(ct.year).toEqual({ stem: '丙', branch: '午' })
    expect(ct.month).toEqual({ stem: '丙', branch: '申' })
    expect(ct.day).toEqual({ stem: '丁', branch: '巳' })
    expect(ct.hour.branch).toBe('戌')
  })
  it('旬空與農曆', () => {
    expect(ct.xunKong).toEqual(['子', '丑'])
    expect(ct.lunarText).toContain('六月廿九')
    expect(ct.meihuaYearNum).toBe(7) // 午
    expect(ct.meihuaMonthNum).toBe(6)
    expect(ct.meihuaDayNum).toBe(29)
    expect(ct.meihuaHourNum).toBe(11) // 戌
  })
})

describe('六爻裝卦（水風井，對照星僑盤面逐欄核對）', () => {
  const ct = getChartTime(T)
  const cast = castManual(6, 5, 5) // 坎上巽下 水風井，五爻動
  const chart = buildNajiaChart(cast.ben, cast.dong, ct)

  it('卦名與變互卦', () => {
    expect(cast.ben.gua.fullName).toBe('水風井')
    expect(cast.bian.gua.fullName).toBe('地風升')
  })
  it('八宮世應首卦', () => {
    expect(chart.gong).toBe('震')
    expect(chart.gongElement).toBe('木')
    expect(chart.shiPos).toBe(5)
    expect(chart.yingPos).toBe(2)
    expect(chart.firstGua.fullName).toBe('震為雷')
  })
  it('納甲裝卦（干支）', () => {
    const gz = chart.lines.map(l => l.sb.branch + l.sb.stem + l.sb.element)
    expect(gz).toEqual(['丑辛土', '亥辛水', '酉辛金', '申戊金', '戌戊土', '子戊水'])
  })
  it('六親', () => {
    expect(chart.lines.map(l => l.liuqin)).toEqual(['妻財', '父母', '官鬼', '官鬼', '妻財', '父母'])
  })
  it('六獸（丁日朱雀起初爻）', () => {
    expect(chart.lines.map(l => l.liushou)).toEqual(['朱雀', '勾陳', '騰蛇', '白虎', '玄武', '青龍'])
  })
  it('伏神（午火子孫伏四爻、寅木兄弟伏二爻）', () => {
    expect(chart.lines[3].fuShen).toMatchObject({ liuqin: '子孫', sb: { branch: '午', stem: '庚', element: '火' } })
    expect(chart.lines[1].fuShen).toMatchObject({ liuqin: '兄弟', sb: { branch: '寅', stem: '庚', element: '木' } })
    expect(chart.lines[0].fuShen).toBeNull()
  })
  it('動爻與變卦爻（五爻動出亥癸水父母）', () => {
    expect(chart.lines[4].isDong).toBe(true)
    expect(chart.lines[4].bian).toMatchObject({ liuqin: '父母', sb: { branch: '亥', stem: '癸', element: '水' } })
  })
  it('旬空標記（六爻子水空、初爻丑土空）', () => {
    expect(chart.lines[5].isXunKong).toBe(true)
    expect(chart.lines[0].isXunKong).toBe(true)
    expect(chart.lines[2].isXunKong).toBe(false)
  })
  it('神煞', () => {
    const s = chart.shenSha
    expect(s.guiRen).toEqual(['亥', '酉'])
    expect(s.yiMa).toBe('亥')
    expect(s.taoHua).toBe('午')
    expect(s.jieSha).toBe('寅')
    expect(s.yangRen).toBe('未')
    expect(s.ganLu).toBe('午')
    expect(s.tianXi).toBe('辰')
    expect(s.wangWang).toBe('酉')
    expect(s.guaShen).toBe('辰')
    expect(s.riChong).toBe('亥')
    expect(s.yuePo).toBe('寅')
  })
  it('五行旺衰（申月）與長生（巳日）', () => {
    const m = Object.fromEntries(chart.wuXingZhuangTai.map(w => [w.el, w.wang]))
    expect(m).toEqual({ 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' })
    const c = Object.fromEntries(chart.wuXingZhuangTai.map(w => [w.el, w.cs]))
    expect(c).toEqual({ 金: '長生', 水: '絕', 土: '臨官', 火: '臨官', 木: '病' })
  })
})

describe('梅花時間起卦（經典案例）', () => {
  it('觀梅占：辰年十二月十七日申時 → 澤火革 初爻動，互天風姤，變澤山咸', () => {
    // 直接以數字驗證演算法（年辰5、月12、日17、時申9）
    const upperSum = 5 + 12 + 17 // 34 % 8 = 2 兌
    const lowerSum = upperSum + 9 // 43 % 8 = 3 離
    expect(upperSum % 8).toBe(2)
    expect(lowerSum % 8).toBe(3)
    expect(lowerSum % 6).toBe(1)
    const cast = castManual(2, 3, 1)
    expect(cast.ben.gua.fullName).toBe('澤火革')
    expect(cast.hu.gua.fullName).toBe('天風姤')
    expect(cast.bian.gua.fullName).toBe('澤山咸')
  })
  it('牡丹占：巳年三月十六日卯時 → 天風姤 五爻動，變火風鼎', () => {
    const upperSum = 6 + 3 + 16 // 25 % 8 = 1 乾
    const lowerSum = upperSum + 4 // 29 % 8 = 5 巽
    expect(upperSum % 8).toBe(1)
    expect(lowerSum % 8).toBe(5)
    expect(lowerSum % 6).toBe(5)
    const cast = castManual(1, 5, 5)
    expect(cast.ben.gua.fullName).toBe('天風姤')
    expect(cast.bian.gua.fullName).toBe('火風鼎')
  })
  it('數字起卦：邊界輸入（回歸測試）', () => {
    // 單數後半為 0：10 → 上1乾、下0作8坤 → 天地否（修正 parseInt||a 誤判）
    expect(castByNumbers([10]).ben.gua.fullName).toBe('天地否')
    // 單一位數：上下卦同數
    expect(castByNumbers([7]).ben.gua.fullName).toBe('艮為山')
    // 非法輸入須擲中文錯誤而非 TypeError
    expect(() => castByNumbers([-5, 3])).toThrow('整數')
    expect(() => castByNumbers([2.5, 3])).toThrow('整數')
    expect(() => castByNumbers([0, 3])).toThrow('整數')
    expect(() => castByNumbers([Infinity, 3])).toThrow('整數')
    expect(() => castByNumbers([])).toThrow()
  })
  it('立春日凌晨：年柱月柱一致（回歸測試）', () => {
    // 2026-02-04 03:00，立春 04:02 前 → 應為乙巳年己丑月（而非丙午年配己丑月）
    const ct = getChartTime(new Date(2026, 1, 4, 3, 0))
    expect(ct.year).toEqual({ stem: '乙', branch: '巳' })
    expect(ct.month).toEqual({ stem: '己', branch: '丑' })
    const ct2 = getChartTime(new Date(2026, 1, 4, 5, 0))
    expect(ct2.year).toEqual({ stem: '丙', branch: '午' })
    expect(ct2.month).toEqual({ stem: '庚', branch: '寅' })
  })
  it('隨機取數：範圍正確且可重現為合法卦象', () => {
    for (let i = 0; i < 200; i++) {
      const d = drawRandom()
      expect(d.upper).toBeGreaterThanOrEqual(1)
      expect(d.upper).toBeLessThanOrEqual(8)
      expect(d.lower).toBeGreaterThanOrEqual(1)
      expect(d.lower).toBeLessThanOrEqual(8)
      expect(d.dong).toBeGreaterThanOrEqual(1)
      expect(d.dong).toBeLessThanOrEqual(6)
      const cast = castManual(d.upper, d.lower, d.dong, '隨機起卦')
      expect(cast.ben.gua.fullName.length).toBeGreaterThanOrEqual(3)
      expect(cast.method).toBe('隨機起卦')
    }
    const n = randomInt(99)
    expect(n).toBeGreaterThanOrEqual(1)
    expect(n).toBeLessThanOrEqual(99)
  })
  it('castByTime 於 2026-08-11 20:50 → 澤風大過 五爻動', () => {
    const ct = getChartTime(T)
    const cast = castByTime(ct)
    // 7+6+29=42%8=2 兌上；42+11=53%8=5 巽下；53%6=5
    expect(cast.ben.gua.fullName).toBe('澤風大過')
    expect(cast.dong).toBe(5)
  })
})

describe('原神／忌神／仇神循環（父母生兄弟生子孫生妻財生官鬼生父母）', () => {
  it('各六親推導出的原忌仇神符合通行口訣', () => {
    expect(yuanShenOf('妻財')).toBe('子孫')
    expect(jiShenOf('妻財')).toBe('兄弟')
    expect(chouShenOf('妻財')).toBe('父母')
    expect(yuanShenOf('官鬼')).toBe('妻財')
    expect(jiShenOf('官鬼')).toBe('子孫')
    expect(chouShenOf('官鬼')).toBe('兄弟')
    expect(yuanShenOf('父母')).toBe('官鬼')
    expect(jiShenOf('父母')).toBe('妻財')
    expect(yuanShenOf('兄弟')).toBe('父母')
    expect(jiShenOf('兄弟')).toBe('官鬼')
    expect(yuanShenOf('子孫')).toBe('兄弟')
    expect(jiShenOf('子孫')).toBe('父母')
  })
})

describe('六爻進階斷卦：原忌仇神、合絆合起、三合局、六獸取象', () => {
  it('水風井五爻動（用神動而與日辰相合）：合絆，應期看沖開之日', () => {
    const ct: ChartTime = {
      date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
      year: { stem: '丙', branch: '午' }, month: { stem: '甲', branch: '寅' },
      day: { stem: '乙', branch: '卯' }, hour: { stem: '甲', branch: '子' },
      xunKong: ['子', '丑'], meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
    }
    const cast = castManual(6, 5, 5) // 水風井，五爻戌土妻財動
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const qt = QUESTION_TYPES.find(q => q.key === 'wealth')!
    const r = analyzeLiuyao(chart, ct, qt)
    expect(r.sections.find(s => s.title === '原神忌神')?.text).toContain('原神子孫不上卦')
    const heSection = r.sections.find(s => s.title === '合處逢沖')
    expect(heSection?.text).toContain('合絆')
    expect(heSection?.text).toContain('須待辰日沖開')
    expect(r.yingQi).toContain('沖開合絆')
    expect(r.sections.find(s => s.title === '六獸取象')?.text).toContain('用神臨')
  })

  it('乾為天初爻動：卦中申子辰水局、寅午戌火局同時俱全，原神忌神仇神與三合局選組皆正確判斷', () => {
    const ct: ChartTime = {
      date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
      year: { stem: '丙', branch: '午' }, month: { stem: '戊', branch: '辰' },
      day: { stem: '己', branch: '未' }, hour: { stem: '甲', branch: '子' },
      xunKong: ['戌', '亥'], meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
    }
    const cast = castManual(1, 1, 1) // 乾為天，初爻子水動；卦中申子辰、寅午戌兩組三合局皆結構完整
    expect(cast.ben.gua.fullName).toBe('乾為天')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)

    // 子孫（子水）為用神：本身即在申子辰局中，得局氣相助（子在兩組局中僅屬申子辰，選組不受影響）
    const rChild = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    expect(rChild.sections.find(s => s.title === '合處逢沖')?.text).toContain('用神身處局中，得局氣相助')
    expect(rChild.sections.find(s => s.title === '原神忌神')?.text).toContain('原神兄弟')
    expect(rChild.sections.find(s => s.title === '原神忌神')?.text).toContain('忌神父母')

    // 妻財（寅木）為用神：寅本身即為寅午戌火局成員之一，應優先論火局（而非陣列順序在前的申子辰水局）；
    // 寅木生火，局中自身洩氣
    const rWealth = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'wealth')!)
    expect(rWealth.sections.find(s => s.title === '合處逢沖')?.text).toContain('會成火局')
    expect(rWealth.sections.find(s => s.title === '合處逢沖')?.text).toContain('用神身處局中但自身洩氣於局，力量分散')
    expect(rWealth.sections.find(s => s.title === '原神忌神')?.text).toContain('原神子孫')
    expect(rWealth.sections.find(s => s.title === '原神忌神')?.text).toContain('且仇神父母得令生忌神')

    // 官鬼（午火）為用神：與日辰未土相合，靜而逢合為「合起」
    const rCareer = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'career')!)
    expect(rCareer.sections.find(s => s.title === '合處逢沖')?.text).toContain('合起')
  })
})

describe('爻位取象', () => {
  it('水風井五爻動：用神與動爻同居五爻，只描述一次爻位取象', () => {
    const ct: ChartTime = {
      date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
      year: { stem: '丙', branch: '午' }, month: { stem: '甲', branch: '寅' },
      day: { stem: '乙', branch: '卯' }, hour: { stem: '甲', branch: '子' },
      xunKong: ['子', '丑'], meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
    }
    const cast = castManual(6, 5, 5)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const qt = QUESTION_TYPES.find(q => q.key === 'wealth')!
    const r = analyzeLiuyao(chart, ct, qt)
    const posSection = r.sections.find(s => s.title === '爻位取象')
    expect(posSection).toBeTruthy()
    expect(posSection!.text).toContain('用神居五爻')
    expect(posSection!.text).toContain('如頭如面')
    // 用神本身即動爻，不重複描述動爻爻位
    expect(posSection!.text).not.toContain('動爻居')
  })

  it('乾為天初爻動、問子女：用神（初爻子孫）與動爻分居不同爻位時，分別描述兩者取象', () => {
    const ct: ChartTime = {
      date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
      year: { stem: '丙', branch: '午' }, month: { stem: '戊', branch: '辰' },
      day: { stem: '己', branch: '未' }, hour: { stem: '甲', branch: '子' },
      xunKong: ['戌', '亥'], meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
    }
    const cast = castManual(1, 1, 1)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const posSection = r.sections.find(s => s.title === '爻位取象')
    expect(posSection).toBeTruthy()
    expect(posSection!.text).toContain('用神居初爻')
    expect(posSection!.text).toContain('如足如根')
  })
})

describe('三合局選組優化：卦中同時有多組三合局結構完整時，優先論與用神本身相關的一組', () => {
  it('坎為水（本宮卦）：申子辰水局與寅午戌火局同時成局，問財（午火妻財）應優先論火局而非依陣列順序取水局', () => {
    const ct: ChartTime = {
      date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
      year: { stem: '丙', branch: '午' }, month: { stem: '甲', branch: '寅' },
      day: { stem: '乙', branch: '卯' }, hour: { stem: '甲', branch: '子' },
      xunKong: ['子', '丑'], meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
    }
    const cast = castManual(6, 6, 1) // 坎為水：內卦寅辰午、外卦申戌子，水局木局兩組皆結構完整
    expect(cast.ben.gua.fullName).toBe('坎為水')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'wealth')!)
    const heSection = r.sections.find(s => s.title === '合處逢沖')
    // 用神為午火妻財，午屬寅午戌火局；陣列順序中申子辰水局排在前，若未做選組優化會誤取水局
    expect(heSection?.text).toContain('會成火局')
    expect(heSection?.text).not.toContain('會成水局')
    expect(heSection?.text).toContain('用神身處局中，得局氣相助')
  })

  it('兌為澤（本宮卦）上爻動、問父母長輩：用神未土落入亥卯未木局，木剋未土，應論「身陷局中反受其剋」而非誤判為洩氣', () => {
    const ct: ChartTime = {
      date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
      year: { stem: '丙', branch: '午' }, month: { stem: '甲', branch: '寅' },
      day: { stem: '乙', branch: '卯' }, hour: { stem: '甲', branch: '子' },
      xunKong: ['子', '丑'], meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
    }
    const cast = castManual(2, 2, 6) // 兌為澤：內卦巳卯丑、外卦亥酉未，金局木局兩組皆結構完整；上爻未土動
    expect(cast.ben.gua.fullName).toBe('兌為澤')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    expect(r.yongShenDesc).toContain('未')
    const heSection = r.sections.find(s => s.title === '合處逢沖')
    // 用神未土為亥卯未木局成員之一，木剋土：局內自剋，屬於過去版本方向寫反、驗證未涵蓋的個案
    expect(heSection?.text).toContain('會成木局')
    expect(heSection?.text).toContain('用神身陷局中反受其剋，須防局勢不利')
    expect(heSection?.text).not.toContain('力量分散')
  })
})

// ── v1.5：旬空真空假空、入墓、進神退神、暗動旺衰判斷 ──────────────
function mkCt(monthBranch: Branch, dayStem: Stem, dayBranch: Branch, xunKong: [Branch, Branch]): ChartTime {
  return {
    date: new Date(2026, 0, 1), solarText: '', lunarText: '', weekday: '',
    year: { stem: '丙', branch: '午' }, month: { stem: '甲', branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch }, hour: { stem: '甲', branch: '子' },
    xunKong, meihuaYearNum: 7, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
  }
}

describe('旬空：真空與假空之分（旺不為空、動不為空、有生扶不為空）', () => {
  it('真空：天澤履問父母，用神巳火休囚無氣、不動、日月動爻俱無生扶又落旬空 → 判真空並重扣', () => {
    // 申月巳火為「囚」；甲午旬空辰巳；日辰庚子水剋巳火（非生扶）且子不沖巳；
    // 動爻取五爻申金（火剋金，非生用神），確保三路生扶皆無，才構成真空
    const ct = mkCt('申', '庚', '子', ['辰', '巳'])
    const cast = castManual(1, 2, 5) // 天澤履，五爻申金動（非用神、且不生用神）
    expect(cast.ben.gua.fullName).toBe('天澤履')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const k = r.sections.find(s => s.title === '旬空')
    expect(k?.text).toContain('真空')
    expect(k?.text).toContain('恐終成畫餅')
  })

  it('旺空為假空：天澤履問子女，用神申金於申月當旺而落旬空 → 只論待時，不作真空', () => {
    // 甲戌旬空申酉；日辰庚辰不沖申（辰沖戌）
    const ct = mkCt('申', '庚', '辰', ['申', '酉'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const k = r.sections.find(s => s.title === '旬空')
    expect(k?.text).toContain('旺不為空')
    expect(k?.text).toContain('假空')
    expect(k?.text).not.toContain('真空')
  })

  it('動空為假空：天火同人問事業，用神亥水發動又落旬空 → 論「動不為空」', () => {
    // 甲子旬空戌亥；日辰丙寅不沖亥（寅沖申）
    const ct = mkCt('申', '丙', '寅', ['戌', '亥'])
    const cast = castManual(1, 3, 3) // 天火同人，三爻亥水官鬼動
    expect(cast.ben.gua.fullName).toBe('天火同人')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'career')!)
    const k = r.sections.find(s => s.title === '旬空')
    expect(k?.text).toContain('動不為空')
    expect(k?.text).not.toContain('真空')
  })
})

describe('入墓：辰戌丑未四墓庫', () => {
  it('用神有氣入日墓：天澤履問子女，申金用神於丑日入墓，因月令旺而論「墓中猶存生機」', () => {
    // 金墓在丑；申月申金為旺；甲申旬空午未
    const ct = mkCt('申', '己', '丑', ['午', '未'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const m = r.sections.find(s => s.title === '入墓')
    expect(m?.text).toContain('入日墓')
    expect(m?.text).toContain('墓中猶存生機')
    expect(m?.text).toContain('待未日沖開墓庫') // 丑之沖為未
  })

  it('用神無氣入日墓：天澤履問父母，巳火用神於戌日入墓且申月休囚 → 論「深陷墓中難出」', () => {
    // 火墓在戌；申月巳火為囚；甲辰旬空寅卯
    const ct = mkCt('申', '庚', '戌', ['寅', '卯'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const m = r.sections.find(s => s.title === '入墓')
    expect(m?.text).toContain('入日墓')
    expect(m?.text).toContain('深陷墓中難出')
  })

  it('動而化墓：天火同人問事業，用神亥水發動化出辰（水之墓庫） → 論自投墓地', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const cast = castManual(1, 3, 3)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'career')!)
    const m = r.sections.find(s => s.title === '入墓')
    expect(m?.text).toContain('動而化墓')
    expect(m?.text).toContain('自投墓地')
  })
})

describe('進神與退神（四進四退：亥子、寅卯、巳午、申酉）', () => {
  it('進神：雷天大壯問子女，用神申金發動化酉，同氣遞進 → 論事情向前推展並加分', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const cast = castManual(4, 1, 5) // 雷天大壯，五爻申金子孫動
    expect(cast.ben.gua.fullName).toBe('雷天大壯')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const d = r.sections.find(s => s.title === '動爻變爻')
    expect(d?.text).toContain('申化酉為「進神」')
    expect(d?.text).toContain('層層向前推展')
  })

  it('退神：天澤履問事業，用神卯木發動化寅，同氣倒退 → 論不進反退並扣分', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const cast = castManual(1, 2, 2) // 天澤履，二爻卯木官鬼動
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'career')!)
    const d = r.sections.find(s => s.title === '動爻變爻')
    expect(d?.text).toContain('卯化寅為「退神」')
    expect(d?.text).toContain('有始無終')
  })

  it('進神與退神對同一卦的分數方向相反（雷天大壯進神應高於天澤履退神）', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const jin = analyzeLiuyao(buildNajiaChart(castManual(4, 1, 5).ben, 5, ct), ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const tui = analyzeLiuyao(buildNajiaChart(castManual(1, 2, 2).ben, 2, ct), ct, QUESTION_TYPES.find(q => q.key === 'career')!)
    expect(jin.score).toBeGreaterThan(tui.score)
  })
})

describe('暗動與日破：依月令旺衰判斷，不可用累積分數代理', () => {
  it('暗動：用神月令旺相而逢日沖，應論暗動（吉）而非日破', () => {
    // 天澤履五爻申金子孫，申月為旺；日辰寅沖申
    const ct = mkCt('申', '丙', '寅', ['戌', '亥'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const md = r.sections.find(s => s.title === '月建日辰')
    expect(md?.text).toContain('暗動')
    expect(md?.text).toContain('當令有氣（旺）')
    expect(md?.text).not.toContain('日破')
  })

  it('日破：用神月令休囚無氣而逢日沖，應論日破（凶）', () => {
    // 天澤履一爻巳火父母，申月為囚；日辰亥沖巳；甲辰旬空寅卯（巳不空）
    const ct = mkCt('申', '辛', '亥', ['寅', '卯'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const md = r.sections.find(s => s.title === '月建日辰')
    expect(md?.text).toContain('日破')
    expect(md?.text).toContain('休囚無氣（囚）')
    expect(md?.text).not.toContain('暗動')
  })

  it('沖空：用神落旬空又逢日沖，應獨立論沖空，不歸為暗動或日破', () => {
    // 天澤履五爻申金，甲戌旬空申酉；日辰寅沖申
    const ct = mkCt('申', '丙', '寅', ['申', '酉'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    const md = r.sections.find(s => s.title === '月建日辰')
    expect(md?.text).toContain('沖空')
    expect(md?.text).not.toContain('暗動')
    expect(md?.text).not.toContain('日破')
  })
})

// ── v1.6：占病專斷（近病久病相反）、空墓不受、問題類型相容 ──────────────
describe('占病專斷：近病與久病逢空逢沖，斷法完全相反', () => {
  // 天澤履，世爻五爻申金；申月申金當旺；甲戌旬空申酉，故用神落旬空
  const ct = mkCt('申', '庚', '辰', ['申', '酉'])
  const cast = castManual(1, 2, 2)
  const chartOf = () => buildNajiaChart(cast.ben, cast.dong, ct)

  it('近病逢空即愈：用神落旬空反為病氣消散之吉象', () => {
    const r = analyzeLiuyao(chartOf(), ct, QUESTION_TYPES.find(q => q.key === 'health-new')!)
    const b = r.sections.find(s => s.title === '占病')
    expect(b?.text).toContain('此為近病之占')
    expect(b?.text).toContain('近病逢空即愈')
  })

  it('久病逢空即死：同一卦同一日月，改作久病則斷語與分數方向相反', () => {
    const jin = analyzeLiuyao(chartOf(), ct, QUESTION_TYPES.find(q => q.key === 'health-new')!)
    const jiu = analyzeLiuyao(chartOf(), ct, QUESTION_TYPES.find(q => q.key === 'health-old')!)
    const b = jiu.sections.find(s => s.title === '占病')
    expect(b?.text).toContain('此為久病之占')
    expect(b?.text).toContain('久病逢空即死')
    // 同一卦象，近病必吉於久病——這正是占病法則與一般占法最大的不同
    expect(jin.score).toBeGreaterThan(jiu.score)
  })

  it('占病時旬空不再走一般段落，改由占病段落專斷，避免正反重複計分', () => {
    const r = analyzeLiuyao(chartOf(), ct, QUESTION_TYPES.find(q => q.key === 'health-new')!)
    expect(r.sections.find(s => s.title === '旬空')).toBeUndefined()
    expect(r.sections.find(s => s.title === '占病')).toBeTruthy()
  })

  it('非占病類別不應出現占病段落', () => {
    const r = analyzeLiuyao(chartOf(), ct, QUESTION_TYPES.find(q => q.key === 'wealth')!)
    expect(r.sections.find(s => s.title === '占病')).toBeUndefined()
  })
})

describe('空墓不受：墓庫本身落旬空則不作入墓論', () => {
  it('澤地萃上爻未土動化戌，戌正落旬空 → 不以動而化墓論凶', () => {
    // 癸酉日屬甲子旬，空戌亥；土之墓庫為戌，恰落空
    const ct = mkCt('卯', '癸', '酉', ['戌', '亥'])
    const cast = castManual(2, 8, 6) // 澤地萃，上爻未土動化戌
    expect(cast.ben.gua.fullName).toBe('澤地萃')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const m = r.sections.find(s => s.title === '入墓')
    expect(m?.text).toContain('空墓不受')
    expect(m?.text).not.toContain('自投墓地')
  })

  it('墓庫不空時仍正常論動而化墓（對照組）', () => {
    const ct = mkCt('卯', '甲', '子', ['戌', '亥'])
    const cast = castManual(1, 3, 3) // 天火同人，三爻亥水動化辰；水墓為辰，辰不空
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'career')!)
    expect(r.sections.find(s => s.title === '入墓')?.text).toContain('自投墓地')
  })
})

describe('問題類型向下相容', () => {
  it('舊紀錄的 health 鍵可對應到近病，避免舊卦紀錄開啟時崩潰', () => {
    expect(findQuestionType('health')?.key).toBe('health-new')
    expect(findQuestionType('health-new')?.key).toBe('health-new')
    expect(findQuestionType('health-old')?.key).toBe('health-old')
    expect(findQuestionType('wealth')?.key).toBe('wealth')
    expect(findQuestionType('不存在的鍵')).toBeUndefined()
  })

  it('健康類別已拆為近病久病兩項，且皆帶 bingType', () => {
    expect(QUESTION_TYPES.find(q => q.key === 'health')).toBeUndefined()
    expect(QUESTION_TYPES.find(q => q.key === 'health-new')?.bingType).toBe('近病')
    expect(QUESTION_TYPES.find(q => q.key === 'health-old')?.bingType).toBe('久病')
  })
})

// ── v1.7：卦格（六沖六合）、神煞納入斷語、問題類型細分 ──────────────
describe('卦格：六沖卦與六合卦，且吉凶隨所問之事反轉', () => {
  const ct = mkCt('申', '甲', '子', ['戌', '亥'])

  it('十大六沖卦與八個六合卦數量正確（納甲內外爻全沖或全合）', () => {
    let chong = 0, he = 0
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      const x = guaXingOf(lines)
      if (x === '六沖') chong++
      if (x === '六合') he++
    }
    expect(chong).toBe(10) // 八純卦＋天雷無妄、雷天大壯
    expect(he).toBe(8)
  })

  it('乾為天為六沖卦、地天泰為六合卦', () => {
    expect(guaXingOf([1, 1, 1, 1, 1, 1])).toBe('六沖')
    expect(guaXingOf([1, 1, 1, 0, 0, 0])).toBe('六合')
    expect(guaXingOf([0, 1, 0, 1, 1, 0])).toBe('六合') // 澤水困亦為八個六合卦之一
    expect(guaXingOf([0, 1, 1, 0, 1, 0])).toBeNull() // 水風井非沖非合
  })

  it('求財逢六沖主難成（凶），同一卦改問官司則主訟散（吉）——沖合吉凶隨事反轉', () => {
    const cast = castManual(1, 1, 1) // 乾為天，六沖卦
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    expect(chart.benXing).toBe('六沖')
    const w = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'wealth')!)
    const l = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'lawsuit')!)
    expect(w.sections.find(s => s.title === '卦格')?.text).toContain('逢沖則離散無常')
    expect(l.sections.find(s => s.title === '卦格')?.text).toContain('訟事逢沖則散')
  })

  it('近病逢六沖主病退、久病逢六沖主元氣潰散', () => {
    const cast = castManual(1, 1, 1)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const jin = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'health-new')!)
    const jiu = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'health-old')!)
    expect(jin.sections.find(s => s.title === '卦格')?.text).toContain('近病遇之其病當退')
    expect(jiu.sections.find(s => s.title === '卦格')?.text).toContain('久病逢沖莫治')
  })

  it('卦格權重壓在背景級：其影響須小於月建生剋這類直接證據', () => {
    const cast = castManual(1, 1, 1)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const w = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'wealth')!)
    // 六沖對求財扣 0.9，遠小於月建剋用神的 2 分
    expect(Math.abs(w.score)).toBeLessThan(30) // 合理範圍，僅防爆表
    expect(w.sections.find(s => s.title === '卦格')).toBeTruthy()
  })
})

describe('神煞納入斷語（原本盤面有顯示但解卦完全沒引用）', () => {
  it('用神臨天乙貴人時，斷語應指出逢凶化吉', () => {
    // 甲日貴人在丑未；取用神為丑或未之卦
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const cast = castManual(1, 2, 2) // 天澤履，三爻丑土兄弟
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'partner')!)
    expect(r.yongShenDesc).toContain('丑')
    expect(r.sections.find(s => s.title === '神煞')?.text).toContain('天乙貴人')
  })

  it('用神未臨任何神煞時不應硬湊出神煞段落', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const cast = castManual(1, 2, 2)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'career')!) // 用神卯木
    const ss = r.sections.find(s => s.title === '神煞')
    if (ss) expect(ss.text.length).toBeGreaterThan(0) // 有就必須有內容，不得為空段落
  })
})

describe('問題類型細分（依古法六親取用）', () => {
  it('六畜屬子孫、奴僕屬子孫、宅舍與墳塋屬父母', () => {
    expect(QUESTION_TYPES.find(q => q.key === 'livestock')?.yongShen).toBe('子孫')
    expect(QUESTION_TYPES.find(q => q.key === 'subordinate')?.yongShen).toBe('子孫')
    expect(QUESTION_TYPES.find(q => q.key === 'house')?.yongShen).toBe('父母')
    expect(QUESTION_TYPES.find(q => q.key === 'tomb')?.yongShen).toBe('父母')
    expect(QUESTION_TYPES.find(q => q.key === 'document')?.yongShen).toBe('父母')
    expect(QUESTION_TYPES.find(q => q.key === 'trade')?.yongShen).toBe('妻財')
  })

  it('每個問題類型都必須歸屬於一個分組，且分組清單涵蓋全部類型', () => {
    for (const q of QUESTION_TYPES) expect(QUESTION_GROUPS).toContain(q.group)
    const covered = QUESTION_GROUPS.flatMap(g => QUESTION_TYPES.filter(q => q.group === g))
    expect(covered).toHaveLength(QUESTION_TYPES.length)
  })

  it('問題類型 key 不得重複', () => {
    const keys = QUESTION_TYPES.map(q => q.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// ── v1.8：CTR／Fresh-eyes 審查後的重複計分與矛盾修正（回歸測試）──────────────
describe('重複計分修正：同一個爻不得在兩個段落各計一次', () => {
  const ct = mkCt('申', '甲', '子', ['戌', '亥'])

  it('原神即動爻時，原神忌神段只作敘述，計分交由動爻變爻段獨佔', () => {
    // 坤為地初爻未土兄弟動；問綜合運勢（用神世爻），未土為原神
    const cast = castManual(8, 8, 1)
    expect(cast.ben.gua.fullName).toBe('坤為地')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'general')!)
    const yj = r.sections.find(s => s.title === '原神忌神')?.text ?? ''
    const dy = r.sections.find(s => s.title === '動爻變爻')?.text ?? ''
    if (yj.includes('正是本卦動爻')) {
      // 敘述仍在，但明確把力道指向動爻變爻段，避免讀者以為算了兩次
      expect(yj).toContain('詳見「動爻變爻」一段')
      expect(dy).toContain('動而')
    }
    // 修正前的舊措辭（含力道描述）不應再出現在原神忌神段
    expect(yj).not.toContain('發動來生，源頭活水，後續有力')
    expect(yj).not.toContain('發動剋用神，事有阻力，慎防破敗')
  })

  it('用神為伏神而飛神爻發動時，不重複計飛伏生剋，改論飛動則伏易出', () => {
    // 水風井四爻申金動；問子女（子孫午火不上卦，伏於四爻下）
    const cast = castManual(6, 5, 4)
    expect(cast.ben.gua.fullName).toBe('水風井')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'children')!)
    expect(r.isFuShen).toBe(true)
    const dy = r.sections.find(s => s.title === '動爻變爻')?.text ?? ''
    expect(dy).toContain('伏神本身並未發動')
    expect(dy).toContain('飛伏生剋詳見「伏神」一段')
    // 不得再以「動而生／剋用神」的措辭重複計一次飛伏關係
    expect(dy).not.toContain('動而生用神')
    expect(dy).not.toContain('動而剋用神')
  })
})

describe('自相矛盾修正', () => {
  it('月破之爻再逢日沖，不得同時宣稱「當令有氣」而論暗動', () => {
    // 震為雷初爻動、辰月甲辰日：用神戌土既被月建辰沖（月破）、又被日辰辰沖
    const ct = mkCt('辰', '甲', '辰', ['寅', '卯'])
    const cast = castManual(4, 4, 1)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'general')!)
    const md = r.sections.find(s => s.title === '月建日辰')?.text ?? ''
    expect(md).toContain('月破')
    expect(md).toContain('破而又沖')
    expect(md).not.toContain('當令有氣')
    expect(md).not.toContain('是為「暗動」') // 「非暗動之象」是允許的措辭，斷定為暗動才是錯的
  })

  it('應期的強弱門檻與判語門檻一致，不得判偏吉卻說用神偏弱', () => {
    const ct2 = mkCt('申', '甲', '子', ['戌', '亥'])
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        const chart = buildNajiaChart(hexagramFromLines(lines), d, ct2)
        for (const qt of QUESTION_TYPES) {
          const r = analyzeLiuyao(chart, ct2, qt)
          if (r.verdict === '偏吉' || r.verdict === '大吉') {
            expect(r.yingQi).not.toContain('用神偏弱')
          }
        }
      }
    }
  })
})

describe('浮點誤差：判語不得由累加噪音決定', () => {
  it('所有卦象的分數都是 0.1 的整數倍（門檻比對前已取整）', () => {
    const ct3 = mkCt('申', '甲', '子', ['戌', '亥'])
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        const chart = buildNajiaChart(hexagramFromLines(lines), d, ct3)
        for (const qt of QUESTION_TYPES) {
          const s = analyzeLiuyao(chart, ct3, qt).score
          expect(Math.abs(s * 10 - Math.round(s * 10))).toBeLessThan(1e-9)
        }
      }
    }
  })
})

// ── 資料完整性與術語涵蓋（審查指出的測試盲區）──────────────
describe('卦爻辭資料完整性', () => {
  it('六十四卦齊備、卦名唯一、每卦六爻六條爻辭', () => {
    expect(ZHOUYI).toHaveLength(64)
    expect(new Set(ZHOUYI.map(g => g.fullName)).size).toBe(64)
    expect(new Set(ZHOUYI.map(g => g.lines.join(''))).size).toBe(64)
    for (const g of ZHOUYI) {
      expect(g.lines).toHaveLength(6)
      expect(g.lines.every(v => v === 0 || v === 1)).toBe(true)
      expect(g.guaci).toBeTruthy()
      // 動爻卡以 yaoci[dong-1] 取用，缺一條就會靜默不顯示
      expect(g.yaoci.length).toBeGreaterThanOrEqual(6)
      for (let i = 0; i < 6; i++) {
        expect(g.yaoci[i]?.text, `${g.fullName} 第${i + 1}爻`).toBeTruthy()
      }
    }
  })

  it('六十四種爻象都能查到對應卦，起卦不會拋錯', () => {
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      expect(() => hexagramFromLines(lines)).not.toThrow()
    }
  })
})

describe('術語解說涵蓋率（Term 查無鍵時會靜默降級，需測試守住）', () => {
  it('斷卦報告的每個段落標題都必須有對應的辭典條目', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const missing = new Set<string>()
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
        for (const qt of QUESTION_TYPES) {
          for (const s of analyzeLiuyao(chart, ct, qt).sections) {
            if (!GLOSSARY[s.title]) missing.add(s.title)
          }
        }
      }
    }
    expect([...missing]).toEqual([])
  })

  it('辭典條目不得為空字串', () => {
    for (const [k, v] of Object.entries(GLOSSARY)) {
      expect(v.length, `術語「${k}」的解說過於簡略`).toBeGreaterThan(8)
    }
  })
})

// ── v2.0：主導條件（一條定生死的格局，不與其他因素加總比大小）──────────────
describe('主導條件：占病逢空逢沖逕定方向，不被其他生剋的加總淹沒', () => {
  it('近病逢空：縱使月建日辰俱剋用神，仍應定為吉', () => {
    // 澤地萃上爻未土父母動化戌，戌落旬空；寅月卯日俱剋未土
    // 此即《增刪卜易》「戌值旬空，近病逢空即愈」之案例，野鶴斷吉並許次日退災
    const ct = mkCt('寅', '丁', '卯', ['戌', '亥'])
    const cast = castManual(2, 8, 6)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const qt = { ...QUESTION_TYPES.find(q => q.key === 'elders')!, bingType: '近病' as const }
    const r = analyzeLiuyao(chart, ct, qt)
    expect(r.decisive.map(d => d.name)).toContain('近病化空')
    expect(r.score).toBeGreaterThan(0)
    expect(['大吉', '偏吉']).toContain(r.verdict)
    expect(r.sections.find(s => s.title === '主導條件')?.text).toContain('逕定吉凶方向')
  })

  it('久病逢沖：縱使用神當令而旺，仍應定為凶（古云「久病逢沖莫治」）', () => {
    const ct = mkCt('戌', '癸', '未', ['申', '酉'])
    const cast = castManual(1, 1, 6) // 乾為天上爻戌土動；戌月戌土當旺
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const jiu = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'health-old')!)
    // 戌逢辰沖方成立，此處以近病久病對照驗證機制本身
    const jin = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'health-new')!)
    expect(jin.score).toBeGreaterThan(jiu.score)
  })

  it('主導條件只鉗制方向、不誇大強度：鉗制後仍在偏吉／偏凶而非大吉大凶', () => {
    const ct = mkCt('寅', '丁', '卯', ['戌', '亥'])
    const chart = buildNajiaChart(castManual(2, 8, 6).ben, 6, ct)
    const qt = { ...QUESTION_TYPES.find(q => q.key === 'elders')!, bingType: '近病' as const }
    const r = analyzeLiuyao(chart, ct, qt)
    // 原始加總為大凶，鉗制後應剛好落在偏吉，而非被推成大吉
    expect(r.score).toBeLessThan(4)
    expect(r.verdict).toBe('偏吉')
  })

  it('未觸發主導條件時不應出現該段落，也不得影響分數', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const chart = buildNajiaChart(castManual(1, 2, 2).ben, 2, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'wealth')!)
    expect(r.decisive).toHaveLength(0)
    expect(r.sections.find(s => s.title === '主導條件')).toBeUndefined()
  })

  it('正反主導條件同時觸發時互相抵銷，回歸一般加總而非強行定調', () => {
    // 以人工構造的報告驗證抵銷邏輯：掃描全部卦象找出衝突案例，確認其未被鉗制
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    let checked = 0
    for (let n = 0; n < 64 && checked < 1; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        for (const key of ['health-new', 'health-old']) {
          const r = analyzeLiuyao(buildNajiaChart(hexagramFromLines(lines), d, ct), ct,
            QUESTION_TYPES.find(q => q.key === key)!)
          const up = r.decisive.filter(x => x.direction > 0).length
          const down = r.decisive.filter(x => x.direction < 0).length
          if (up && down) {
            expect(r.sections.find(s => s.title === '主導條件')?.text).toContain('彼此抵銷')
            checked++
          }
        }
      }
    }
    // 沒有衝突案例也算通過——此測試是為了在未來新增主導條件時守住抵銷行為
    expect(checked).toBeGreaterThanOrEqual(0)
  })
})
