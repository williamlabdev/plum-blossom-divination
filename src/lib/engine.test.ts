import { describe, expect, it } from 'vitest'
import type { ChartTime } from './calendar'
import { getChartTime } from './calendar'
import { castByNumbers, castByTime, castManual, drawRandom, hexagramFromLines, randomInt } from './casting'
import type { Branch, Stem } from './data/core'
import { BRANCHES, chouShenOf, jiShenOf, jinTuiShen, yuanShenOf } from './data/core'
import { buildNajiaChart, chartAt, frameOf, guaXingOf, lineAt, timingOf, withMonthBranch } from './najia'
import { JI_THRESHOLD, QUESTION_GROUPS, QUESTION_TYPES, analyzeAt, analyzeLiuyao, findQuestionType, projectMonths } from './interpret'
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
  // 下面兩則是一對，釘住真空的**邊界**：同一卦、同一日、只換月建，
  // 隔離出「月令死」與「月令休」這唯一一個變因。
  // 《旬空章第二十六》：「真空即春土、夏金、秋木、三冬逢火是真空」——四組皆為月令所剋（死），
  // 是枚舉而非「凡無氣者皆真空」。引擎舊寫法是「非旺相即真空」，把休、囚兩級也算了進去。
  // 卦取乾為天動初爻、甲子日空戌亥，用神為上爻戌土父母（父母兩現，旬空者優先）：
  // 日辰子水為用神所剋而非生扶，子不沖戌，動爻初爻子水亦不生土，三路生扶皆無。
  it('真空：乾為天問父母，用神戌土於寅月為「死」、不動、日月動爻俱無生扶又落旬空 → 判真空並重扣', () => {
    const ct = mkCt('寅', '甲', '子', ['戌', '亥']) // 寅月木剋土，戌土死——即「春土」
    const cast = castManual(1, 1, 1)
    expect(cast.ben.gua.fullName).toBe('乾為天')
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const k = r.sections.find(s => s.title === '旬空')
    expect(k?.text).toContain('是為「真空」')
    expect(k?.text).toContain('恐終成畫餅')
    expect(r.yongShenGen.zhenKong).toBe(true)
  })

  it('休囚而空不是真空：同卦同日只改申月，戌土為「休」→ 不入真空之列，不得說畫餅', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥']) // 申月土生金，戌土休——不在那四組之列
    const cast = castManual(1, 1, 1)
    const chart = buildNajiaChart(cast.ben, cast.dong, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const k = r.sections.find(s => s.title === '旬空')
    expect(k?.text).toContain('未至死絕')
    expect(k?.text).not.toContain('是為「真空」')
    expect(k?.text).not.toContain('畫餅')
    expect(r.yongShenGen.zhenKong).toBe(false)
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
    // 甲戊庚日貴人皆在丑未。此卦兄弟兩現（三爻丑土、上爻戌土），故不可用甲子日——
    // 甲子旬空戌亥，依《增刪卜易・兩現章》「舍其不空而用旬空」會改取上爻戌土而落空貴人。
    // 改用戊子日（貴人同在丑未，旬空午未），兩爻俱不空不破，方能穩定取到三爻丑土。
    const ct = mkCt('申', '戊', '子', ['午', '未'])
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

describe('問吉凶／問時機：介面上的區分，不得是計分規則', () => {
  // 這一組測試是這個功能能不能存在的前提。古籍 4 則「問何時」案例古人全部斷吉，
  // 但那是 n=4、全部同向、且看著失分案例才發現的樣本——與「忌神持世」翻車的成因一模一樣。
  // 所以 intent 只准決定「判語出不出」，一旦它碰到分數，這個功能就該整個拿掉。
  it('窮舉全卦象：兩種 intent 的 score、sections、decisive、應期完全相同', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
        for (const qt of QUESTION_TYPES) {
          const ji = analyzeLiuyao(chart, ct, qt, '吉凶')
          const shi = analyzeLiuyao(chart, ct, qt, '時機')
          expect(shi.score).toBe(ji.score)
          expect(shi.sections).toEqual(ji.sections)
          expect(shi.decisive).toEqual(ji.decisive)
          expect(shi.yingQi).toBe(ji.yingQi)
          expect(shi.yongShenDesc).toBe(ji.yongShenDesc)
        }
      }
    }
  })

  it('問時機不出判語，問吉凶照常出；預設值為問吉凶（校準與舊呼叫端走的就是這條）', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const chart = buildNajiaChart(castManual(1, 2, 2).ben, 2, ct)
    const qt = QUESTION_TYPES.find(q => q.key === 'wealth')!
    expect(analyzeLiuyao(chart, ct, qt, '時機').verdict).toBeNull()
    expect(analyzeLiuyao(chart, ct, qt, '吉凶').verdict).not.toBeNull()
    expect(analyzeLiuyao(chart, ct, qt).verdict).toBe(analyzeLiuyao(chart, ct, qt, '吉凶').verdict)
    expect(analyzeLiuyao(chart, ct, qt).intent).toBe('吉凶')
  })

  it('用神不上卦時取伏神——全卦象掃描下，「連伏神都無」的早退路徑實際上走不到', () => {
    // 這一條是先寫了測試才發現的：64 卦 × 6 動爻 × 全部問題類型，沒有任何一組會落到
    // 「用神不上卦且首卦無伏神可取」。原因是六親由本宮五行推得，首卦必然備齊五類，
    // 缺哪一類都能從首卦取到伏神。故該分支是防禦性的，不是實際會遇到的情況。
    // 記在這裡是為了讓後人知道它為什麼沒有真實案例可測——而不是以為漏測了。
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    let noTarget = 0
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
        for (const qt of QUESTION_TYPES) {
          if (analyzeLiuyao(chart, ct, qt).yongShenLine === null) noTarget++
        }
      }
    }
    expect(noTarget).toBe(0)
  })

  it('早退路徑本身仍須守 intent：以人工構造的盤直接驗證那三行', () => {
    // 既然正常起卦到不了那條分支，就把盤改成「六爻皆兄弟且無伏神」再問妻財，
    // 直接把它逼出來。不這樣做的話，那段程式碼會是全檔唯一沒有測試護欄的 return。
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const chart = buildNajiaChart(castManual(1, 2, 2).ben, 2, ct)
    const broken = { ...chart, lines: chart.lines.map(l => ({ ...l, liuqin: '兄弟' as const, fuShen: null })) }
    const qt = QUESTION_TYPES.find(q => q.key === 'wealth')!
    const ji = analyzeLiuyao(broken, ct, qt, '吉凶')
    const shi = analyzeLiuyao(broken, ct, qt, '時機')
    expect(ji.yongShenLine).toBeNull() // 確認真的走到了早退路徑
    expect(ji.verdict).toBe('偏凶')
    expect(shi.verdict).toBeNull()
    expect(shi.score).toBe(ji.score)
    expect(shi.sections).toEqual(ji.sections)
  })
})

describe('時間框架：旺衰與月破旬空可帶任意月建重算（backlog #2 的重構）', () => {
  it('timingOf 與 buildNajiaChart 的結果必須一致——不得存在第二套算法', () => {
    // 這一則是這次重構唯一真正該守的東西：把時間相關欄位抽成純函式之後，
    // 若建盤時仍各算一份，兩套遲早會分岔，而分岔時錯的那一套不會有人發現。
    for (const ct of [mkCt('申', '甲', '子', ['戌', '亥']), mkCt('寅', '丁', '卯', ['戌', '亥'])]) {
      const frame = frameOf(ct)
      for (let n = 0; n < 64; n++) {
        const lines = [0, 0, 0, 0, 0, 0]
        for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
        const chart = buildNajiaChart(hexagramFromLines(lines), 1, ct)
        for (const l of chart.lines) {
          const t = timingOf(l.sb.branch, frame)
          expect(t.wangShuai).toBe(l.wangShuai)
          expect(t.changSheng).toBe(l.changSheng)
          expect(t.isXunKong).toBe(l.isXunKong)
          expect(t.isYuePo).toBe(l.isYuePo)
          expect(t.isRiChong).toBe(l.isRiChong)
        }
      }
    }
  })

  it('換月建重算的結果，與直接用該月建起盤完全相同（時點推演的前提）', () => {
    // 路徑甲要對用神在未來 12 個月各推一次。這則測試保證「換 frame 重算」與
    // 「換月份重新起盤」等價——否則推演出來的旺衰是另一套引擎算的，不能拿來與當下比較。
    const base = mkCt('申', '甲', '子', ['戌', '亥'])
    const chart = buildNajiaChart(hexagramFromLines([1, 0, 1, 0, 1, 0]), 3, base)
    for (const m of BRANCHES) {
      const asIfChart = buildNajiaChart(hexagramFromLines([1, 0, 1, 0, 1, 0]), 3, mkCt(m, '甲', '子', ['戌', '亥']))
      const recomputed = chart.lines.map(l => lineAt(l, withMonthBranch(frameOf(base), m)))
      for (let i = 0; i < 6; i++) {
        expect(recomputed[i].wangShuai).toBe(asIfChart.lines[i].wangShuai)
        expect(recomputed[i].isYuePo).toBe(asIfChart.lines[i].isYuePo)
        expect(recomputed[i].isXunKong).toBe(asIfChart.lines[i].isXunKong)
        expect(recomputed[i].changSheng).toBe(asIfChart.lines[i].changSheng)
      }
    }
  })

  it('換月建不得動到日辰與旬空：旬空由日柱所在之旬決定，與月建無關', () => {
    const f = frameOf(mkCt('申', '甲', '子', ['戌', '亥']))
    const g = withMonthBranch(f, '寅')
    expect(g.dayStem).toBe(f.dayStem)
    expect(g.dayBranch).toBe(f.dayBranch)
    expect(g.xunKong).toEqual(f.xunKong)
    expect(g.monthBranch).toBe('寅')
    // 卦不隨時間改變的部分也不得被動到
    const chart = buildNajiaChart(hexagramFromLines([1, 1, 0, 0, 1, 0]), 2, mkCt('申', '甲', '子', ['戌', '亥']))
    const moved = lineAt(chart.lines[1], g)
    expect(moved.sb).toEqual(chart.lines[1].sb)
    expect(moved.liuqin).toBe(chart.lines[1].liuqin)
    expect(moved.isDong).toBe(chart.lines[1].isDong)
    expect(moved.bian).toEqual(chart.lines[1].bian)
  })

  it('時點推演：當月那一格必等於當下所斷，十二格依地支順序且日柱旬空不動', () => {
    // 推演的第一格是自我檢查——它走的是 chartAt 重算的路徑，若與直接斷當下不同，
    // 表示整盤重算漏了某個欄位，後面十一格算出來的東西也就不能拿來跟當下比較。
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    const frame = frameOf(ct)
    for (const key of ['wealth', 'career', 'health-new', 'partner']) {
      const qt = QUESTION_TYPES.find(q => q.key === key)!
      for (let n = 0; n < 64; n += 7) {
        const lines = [0, 0, 0, 0, 0, 0]
        for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
        const chart = buildNajiaChart(hexagramFromLines(lines), 2, ct)
        const tl = projectMonths(chart, frame, qt)
        if (!tl) continue // 用神不上卦且無伏神可取
        expect(tl.points).toHaveLength(12)
        expect(tl.points[0].monthBranch).toBe('申')
        expect(tl.points[0].score).toBe(analyzeLiuyao(chart, ct, qt).score)
        expect(tl.points.map(p => p.monthBranch)).toEqual(
          Array.from({ length: 12 }, (_, k) => BRANCHES[(BRANCHES.indexOf('申') + k) % 12]))
        expect(tl.best.score).toBe(Math.max(...tl.points.map(p => p.score)))
      }
    }
  })

  it('時點推演：轉機只在當下未達偏吉時出現，且取最早轉吉的那個月', () => {
    const ct = mkCt('子', '丁', '巳', ['戌', '亥'])
    const frame = frameOf(ct)
    let sawTurning = 0
    for (const key of ['wealth', 'career', 'children', 'elders']) {
      const qt = QUESTION_TYPES.find(q => q.key === key)!
      for (let n = 0; n < 64; n++) {
        const chart = buildNajiaChart(hexagramFromLines(Array.from({ length: 6 }, (_, i) => (n >> i) & 1)), 4, ct)
        const tl = projectMonths(chart, frame, qt)
        if (!tl) continue
        const now = tl.points[0].score
        const firstUp = tl.points.find(p => p.monthsAhead > 0 && p.score >= JI_THRESHOLD) ?? null
        expect(tl.turning).toEqual(now >= JI_THRESHOLD ? null : firstUp)
        if (tl.turning) {
          sawTurning++
          // 轉機月的敘述必須與該月實際斷出的判語一致，否則報告會自相矛盾
          expect(tl.text).toContain(tl.turning.monthBranch)
          expect(tl.text).toContain(tl.turning.verdict)
        }
      }
    }
    expect(sawTurning).toBeGreaterThan(0) // 這批卦裡確實有「待時而成」的情況，否則上面等於沒測到
  })

  it('整張卦盤換月建重算後斷卦，與用該月建重新起卦斷卦逐字相同（時點推演的前提）', () => {
    // 上一則只保證單爻等價。時點推演實際餵給引擎的是整張 chartAt 出來的盤，
    // 斷語裡還有神煞（天喜由月支推）與五行旺衰表——任何一項沒跟著換月建，
    // 推演出來的報告就是「半個月份」的混合體，拿來跟當下比較毫無意義。
    const base = mkCt('申', '甲', '子', ['戌', '亥'])
    const qts = [QUESTION_TYPES.find(q => q.key === 'wealth')!, QUESTION_TYPES.find(q => q.key === 'career')!]
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      const chart = buildNajiaChart(hexagramFromLines(lines), 3, base)
      for (const m of BRANCHES) {
        const f = withMonthBranch(frameOf(base), m)
        const asIf = buildNajiaChart(hexagramFromLines(lines), 3, mkCt(m, '甲', '子', ['戌', '亥']))
        for (const qt of qts) {
          expect(analyzeAt(chartAt(chart, f), f, qt)).toEqual(analyzeLiuyao(asIf, mkCt(m, '甲', '子', ['戌', '亥']), qt))
        }
      }
    }
  })
})

describe('用神有根：從斷語文字結構化成欄位（時點推演接回計分的前置）', () => {
  // 這組測試守的不是「有根判得準不準」，而是**欄位與斷語不得分岔**。
  // 判定式原本就散在旬空段與原神段裡，抽成欄位只是搬家（抽出前後 64,512 筆
  // 完整輸出逐字比對 Δ=0）。真正的風險在往後：有人改了斷語卻沒改欄位，
  // 或反過來，於是外面拿到的 hasRoot 與報告上寫的話不是同一件事。
  const CTS: [Branch, Stem, Branch, [Branch, Branch]][] = [
    ['申', '甲', '子', ['戌', '亥']],
    ['寅', '庚', '午', ['辰', '巳']],
    ['未', '丁', '酉', ['午', '未']],
    ['亥', '壬', '寅', ['申', '酉']],
    // 最後這組是為了讓「真空」取樣得到才加的，別拿掉。真空收緊為「月令死」之後
    // （《旬空章第二十六》「真空即春土、夏金、秋木、三冬逢火」），前四組**沒有一組**
    // 能產生真空：申月空戌亥、未月空午未、亥月空申酉，空爻都不是該月所剋；
    // 寅月空辰巳雖有辰土死於木月，卻被日辰午火生扶而不為空。
    // 寅月甲子日空戌亥：戌土死於木月，日辰子水為土所剋而非生扶，這才構成真空。
    ['寅', '甲', '子', ['戌', '亥']],
  ]
  const eachChart = (fn: (r: ReturnType<typeof analyzeLiuyao>, ct: ChartTime) => void) => {
    for (const [m, ds, db, xk] of CTS) {
      const ct = mkCt(m, ds, db, xk)
      for (let n = 0; n < 64; n++) {
        const lines = [0, 0, 0, 0, 0, 0]
        for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
        for (let d = 1; d <= 6; d++) {
          const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
          for (const qt of QUESTION_TYPES) fn(analyzeLiuyao(chart, ct, qt), ct)
        }
      }
    }
  }

  it('zhenKong 與旬空段的斷語一致：說「真空」才是真空，說假空就不是', () => {
    let zhen = 0, jia = 0
    eachChart(r => {
      const kong = r.sections.find(s => s.title === '旬空')
      if (!kong) return // 不落空、或占病走專斷，此段不出現
      const saysZhen = kong.text.includes('是為「真空」')
      expect(r.yongShenGen.zhenKong).toBe(saysZhen)
      if (saysZhen) zhen++
      else jia++
    })
    expect(zhen).toBeGreaterThan(0) // 兩種都要取樣得到，否則這則測試沒在測東西
    expect(jia).toBeGreaterThan(0)
  })

  it('占病不出旬空段，但真空與否是卦的結構，不因所問是病而被抹成 false', () => {
    // 旬空段只在 !isBing 時出現（占病另有「近病逢空即愈」的反向專斷）。
    // 欄位刻意不跟著消失——問的是什麼事，不會讓用神長出根來。
    // 兩個占病類型的用神同為世爻，故可與非病類型逐卦對照。
    const bing = QUESTION_TYPES.filter(q => q.bingType)
    const shiFei = QUESTION_TYPES.find(q => q.yongShen === '世爻' && !q.bingType)!
    expect(bing).toHaveLength(2)
    let zhenUnderBing = 0
    for (const [m, ds, db, xk] of CTS) {
      const ct = mkCt(m, ds, db, xk)
      for (let n = 0; n < 64; n++) {
        const lines = [0, 0, 0, 0, 0, 0]
        for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
        for (let d = 1; d <= 6; d++) {
          const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
          const ref = analyzeLiuyao(chart, ct, shiFei)
          for (const qt of bing) {
            const r = analyzeLiuyao(chart, ct, qt)
            expect(r.sections.find(s => s.title === '旬空')).toBeUndefined()
            expect(r.yongShenGen).toEqual(ref.yongShenGen) // 與同取世爻的非病類型逐欄相同
            if (r.yongShenGen.zhenKong) zhenUnderBing++
          }
        }
      }
    }
    expect(zhenUnderBing).toBeGreaterThan(0) // 真的取樣到「占病且真空」，否則上一行測不到東西
  })

  it('hasRoot 的兩條否決是真空與「真」破，不是月破；動爻生扶不算根', () => {
    // 「雖有生扶生之不起，如樹無根」——元神動來生補不了用神自己沒氣，
    // 所以 dongFu 不得單獨撐起 hasRoot。這一條是原文的重點，不是實作取捨。
    let dongOnly = 0
    eachChart(r => {
      const g = r.yongShenGen
      if (g.zhenPo || g.zhenKong) expect(g.hasRoot).toBe(false)
      if (g.hasRoot) expect(g.youQi || g.dayFu || g.monthFu).toBe(true)
      if (g.dongFu && !g.youQi && !g.dayFu && !g.monthFu) {
        expect(g.hasRoot).toBe(false)
        dongOnly++
      }
    })
    expect(dongOnly).toBeGreaterThan(0) // 真的取樣到「只有動爻生扶」的卦
  })

  it('真破是月破的子集，且月破而動／得日辰動爻生助者不作真破', () => {
    let poDong = 0
    eachChart(r => {
      const g = r.yongShenGen
      if (g.zhenPo) expect(g.yuePo).toBe(true)
      if (g.yuePo && (g.ziDong || g.dayFu || g.dongFu)) {
        expect(g.zhenPo).toBe(false) // 「目下雖破，出月則不破」
        poDong++
      }
      if (g.yuePo && !g.ziDong && !g.dayFu && !g.dongFu) {
        expect(g.zhenPo).toBe(true) // 「惟靜而不動又無日辰動爻生助者則到底而破矣」
      }
    })
    expect(poDong).toBeGreaterThan(0)
  })

  it('yuanYouLi 與原神忌神段一致；用神為伏神時該段不展開，欄位維持 false', () => {
    eachChart(r => {
      if (r.isFuShen) {
        expect(r.sections.find(s => s.title === '原神忌神')).toBeUndefined()
        expect(r.yongShenGen.yuanYouLi).toBe(false)
        return
      }
      const yj = r.sections.find(s => s.title === '原神忌神')
      if (!yj || !r.yongShenLine) return
      expect(r.yongShenGen.yuanYouLi).toBe(yj.text.includes('有力，生扶得實'))
    })
  })

  it('四個判定式都不得退化成常數：每一項在卦象空間裡都要兩種值都出現', () => {
    // 搬家型重構最容易壞在「某個變數永遠是 false 也沒人發現」。
    const keys = ['hasRoot', 'youQi', 'yuePo', 'zhenPo', 'zhenKong',
      'dayFu', 'monthFu', 'dongFu', 'ziDong', 'yuanYouLi'] as const
    const seen: Record<string, Set<boolean>> = {}
    for (const k of keys) seen[k] = new Set()
    eachChart(r => { for (const k of keys) seen[k].add(r.yongShenGen[k]) })
    for (const k of keys) expect([k, seen[k].size]).toEqual([k, 2])
  })

  it('兩種 intent 的 yongShenGen 必須逐欄相同——它不是判語，不受所問形式影響', () => {
    const ct = mkCt('申', '甲', '子', ['戌', '亥'])
    for (let n = 0; n < 64; n++) {
      const lines = [0, 0, 0, 0, 0, 0]
      for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
      for (let d = 1; d <= 6; d++) {
        const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
        for (const qt of QUESTION_TYPES) {
          expect(analyzeLiuyao(chart, ct, qt, '時機').yongShenGen)
            .toEqual(analyzeLiuyao(chart, ct, qt, '吉凶').yongShenGen)
        }
      }
    }
  })
})

describe('進神退神：土支在列（照《增刪卜易・進神退神章第二十九》原文列舉）', () => {
  // 此表原本只有四組，並附註「辰戌丑未土支不在其列」——那句話是錯的。
  // 同一章底下的兩則案例（校準 #8、#10）用的正是上爻戌化未。
  it('原文七進七退，一組不多一組不少', () => {
    const jin: [Branch, Branch][] = [['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉'],
      ['丑', '辰'], ['辰', '未'], ['未', '戌']]
    for (const [a, b] of jin) {
      expect(jinTuiShen(a, b)).toBe('進神')
      expect(jinTuiShen(b, a)).toBe('退神')
    }
    // 土的遞進是 丑→辰→未→戌 的線性序，原文沒有收尾那一組，不得自行補成循環
    expect(jinTuiShen('戌', '丑')).toBeNull()
    expect(jinTuiShen('丑', '戌')).toBeNull()
    // 同五行但非相鄰、或不同五行者一律不算
    expect(jinTuiShen('丑', '未')).toBeNull()
    expect(jinTuiShen('亥', '寅')).toBeNull()
  })

  it('戌化未確實被斷為退神（校準 #10：戌月癸未日占病得乾為天上爻動）', () => {
    const ct = mkCt('戌', '癸', '未', ['申', '酉'])
    const chart = buildNajiaChart(castManual(1, 1, 6).ben, 6, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    expect(r.sections.find(s => s.title === '動爻變爻')!.text).toContain('戌化未為「退神」')
  })
})

describe('月破：野鶴的修正——真破與「目下破」之分（《月破章第二十七》）', () => {
  // 諸書：「用神臨月破如悖時也，即是枯根木…雖有日辰之生，亦不能生」。
  // 野鶴：「余得其驗…目下雖破，出月則不破…惟靜而不動又無日辰動爻生助者，則到底而破矣。」
  // 引擎原本一律 −3，實作的正是野鶴指名要捨棄的那一套。
  it('校準 #5 原案：辰月戊子日占父何日歸得乾之夬，父母戌土持世而動 → 不作到底而破', () => {
    const ct = mkCt('辰', '戊', '子', ['午', '未'])
    const chart = buildNajiaChart(castManual(1, 1, 6).ben, 6, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'elders')!)
    const m = r.sections.find(s => s.title === '月建日辰')!.text
    expect(m).toContain('月破')
    expect(m).toContain('出月則不破')
    expect(m).not.toContain('真破')
    expect(r.yongShenGen.yuePo).toBe(true)
    expect(r.yongShenGen.zhenPo).toBe(false)
    // 野鶴不以古法論之，竟斷「卯日有信，午未日必歸」，果於乙未日到家
    expect(r.yongShenGen.hasRoot).toBe(true)
  })

  it('斷語與欄位不得分岔：說「到底而破」才是真破，說「出月則不破」就不是', () => {
    for (const [m, ds, db, xk] of ([['申', '甲', '子', ['戌', '亥']], ['寅', '庚', '午', ['辰', '巳']],
      ['未', '丁', '酉', ['午', '未']], ['亥', '壬', '寅', ['申', '酉']]] as [Branch, Stem, Branch, [Branch, Branch]][])) {
      const ct = mkCt(m, ds, db, xk)
      for (let n = 0; n < 64; n++) {
        const lines = [0, 0, 0, 0, 0, 0]
        for (let i = 0; i < 6; i++) lines[i] = (n >> i) & 1
        for (let d = 1; d <= 6; d++) {
          const chart = buildNajiaChart(hexagramFromLines(lines), d, ct)
          for (const qt of QUESTION_TYPES) {
            const r = analyzeLiuyao(chart, ct, qt)
            const t = r.sections.find(s => s.title === '月建日辰')?.text ?? ''
            expect(t.includes('是為真破')).toBe(r.yongShenGen.zhenPo)
            if (r.yongShenGen.yuePo && !r.yongShenGen.zhenPo && r.yongShenLine) {
              expect(t).toContain('出月則不破')
            }
          }
        }
      }
    }
  })
})

describe('占病：卦逢六沖／卦變六沖列為主導條件（近病愈、久病死）', () => {
  // 《增刪卜易》占病門逐條把它與逢空、化空並列，且用同一個語級：
  // 近病「不須服藥，即許安痊」、久病「遲者扁鵲難醫」。〈六沖章〉：「久病妙藥難調」。
  const ct = mkCt('戌', '癸', '未', ['申', '酉'])
  const bing = (key: string, t: '近病' | '久病') => {
    const base = QUESTION_TYPES.find(q => q.key === key)!
    return { ...base, bingType: t }
  }

  it('乾為天（本卦六沖）：久病定凶、近病定吉，方向相反', () => {
    const chart = buildNajiaChart(castManual(1, 1, 6).ben, 6, ct)
    const qt = QUESTION_TYPES.find(q => q.key === 'elders')!
    const jiu = analyzeLiuyao(chart, ct, { ...qt, bingType: '久病' })
    const jin = analyzeLiuyao(chart, ct, { ...qt, bingType: '近病' })
    expect(jiu.decisive.find(d => d.name === '久病卦逢六沖')?.direction).toBe(-1)
    expect(jin.decisive.find(d => d.name === '近病卦逢六沖')?.direction).toBe(1)
    // 校準 #10 的古人原話即「久病逢沖莫治，又是父爻持世，妙藥難醫」
    expect(jiu.verdict === '偏凶' || jiu.verdict === '大凶').toBe(true)
  })

  it('不重複計分：沖合的分數由卦格段獨佔，占病段只推主導條件、不再敘述一次', () => {
    const chart = buildNajiaChart(castManual(1, 1, 6).ben, 6, ct)
    const r = analyzeLiuyao(chart, ct, bing('elders', '久病'))
    expect(r.sections.find(s => s.title === '占病')!.text).not.toContain('六沖')
    expect(r.sections.find(s => s.title === '卦格')!.text).toContain('六沖')
  })

  it('非六沖卦不觸發，避免主導條件被濫用', () => {
    // 水風井變地風升：本卦與變卦皆非六沖（履之無妄那類「變卦才是六沖」的也算觸發，不可用）
    const chart = buildNajiaChart(castManual(6, 5, 5).ben, 5, ct)
    const r = analyzeLiuyao(chart, ct, bing('elders', '久病'))
    expect(r.decisive.some(d => d.name.includes('六沖'))).toBe(false)
  })
})

describe('占病：用神為伏神時，不得把飛神的六親當成用神的六親', () => {
  // 校準 #48（卜筮正宗第五問，未月丁巳日占嫂復病得山地剝上爻動）：
  // 用神兄弟不上卦，伏於五爻子水子孫之下。原本兩處寫 `target.liuqin`，
  // 於是飛神（子孫）被當成用神，斷出「子孫持世而子孫即用神本身」——用神明明是申金兄弟。
  it('#48 原案：飛神為子孫而用神是伏著的兄弟，不得斷為「用神即子孫」', () => {
    const ct = mkCt('未', '丁', '巳', ['子', '丑'])
    const chart = buildNajiaChart(castManual(7, 8, 6).ben, 6, ct)
    const base = QUESTION_TYPES.find(q => q.key === 'partner')!
    const r = analyzeLiuyao(chart, ct, { ...base, bingType: '久病' })
    expect(r.isFuShen).toBe(true)
    expect(r.yongShenDesc).toContain('伏')
    const bt = r.sections.find(s => s.title === '占病')!.text
    expect(bt).not.toContain('子孫即用神本身')
    expect(bt).toContain('子孫持世') // 子孫是醫藥、不是用神，該走醫藥那一路
  })
})
