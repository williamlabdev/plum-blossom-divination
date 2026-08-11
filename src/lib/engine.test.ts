import { describe, expect, it } from 'vitest'
import { getChartTime } from './calendar'
import { castByNumbers, castByTime, castManual, drawRandom, randomInt } from './casting'
import { buildNajiaChart } from './najia'

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
