import { describe, expect, it } from 'vitest'
import { CLASSIC_CASES, direction, runAllCases, xunKongOf } from './calibration'

describe('古籍實例校準（《增刪卜易》《卜筮正宗》53 則實占案例）', () => {
  it('旬空推算：由日干支反推旬空兩支', () => {
    expect(xunKongOf('甲子')).toEqual(['戌', '亥'])
    expect(xunKongOf('癸酉')).toEqual(['戌', '亥']) // 甲子旬末
    expect(xunKongOf('甲戌')).toEqual(['申', '酉'])
    expect(xunKongOf('丙申')).toEqual(['辰', '巳']) // 甲午旬
    expect(xunKongOf('己丑')).toEqual(['午', '未']) // 甲申旬
    expect(xunKongOf('庚辰')).toEqual(['申', '酉']) // 甲戌旬
  })

  it('案例資料完整性：53 則，欄位齊全，卦名與動爻皆合法', () => {
    expect(CLASSIC_CASES).toHaveLength(53)
    for (const c of CLASSIC_CASES) {
      expect(c.dongYao).toBeGreaterThanOrEqual(1)
      expect(c.dongYao).toBeLessThanOrEqual(6)
      expect(c.benGua).toMatch(/^.{2,4}$/)
      expect(c.dayGanZhi).toHaveLength(2)
      expect(['吉', '偏吉', '平', '偏凶', '凶']).toContain(c.verdict)
    }
  })

  it('全部案例都能被引擎還原並斷出結果，不拋錯', () => {
    const rs = runAllCases()
    expect(rs).toHaveLength(53)
    for (const r of rs) {
      expect(r.report.yongShenLine).not.toBeNull()
      expect(r.report.sections.length).toBeGreaterThan(0)
    }
  })

  // 這是準確度的回歸防線：改動斷卦規則後若命中率掉到基準以下，此測試會失敗。
  // 對照組：本資料集古人斷吉者 32 則，故「全部猜吉」的命中率為 60.4%，引擎必須勝過此線。
  it('方向命中率須維持在 62% 以上（且勝過全猜吉的 60.4% 基準）', () => {
    const rs = runAllCases()
    const hits = rs.filter(r => r.hit).length
    const rate = hits / rs.length
    const alwaysJi = rs.filter(r => r.expected === 1).length / rs.length
    expect(rate).toBeGreaterThan(alwaysJi)
    expect(rate).toBeGreaterThanOrEqual(0.62)
  })

  it('高信心案例（用神取法無爭議者）命中率須維持在 60% 以上', () => {
    const rs = runAllCases().filter(r => r.mapping.confident)
    const rate = rs.filter(r => r.hit).length / rs.length
    expect(rate).toBeGreaterThanOrEqual(0.60)
  })

  it('引擎不應濫用「平」判語：判平比例須低於一成（古籍實占僅 1/53 作平論）', () => {
    const rs = runAllCases()
    const flat = rs.filter(r => r.actual === 0).length
    expect(flat / rs.length).toBeLessThan(0.1)
  })

  it('direction 對五級判語的方向歸類正確', () => {
    expect(direction('大吉')).toBe(1)
    expect(direction('偏吉')).toBe(1)
    expect(direction('平')).toBe(0)
    expect(direction('偏凶')).toBe(-1)
    expect(direction('大凶')).toBe(-1)
  })
})
