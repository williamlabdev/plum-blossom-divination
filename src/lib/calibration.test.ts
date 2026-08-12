import { describe, expect, it } from 'vitest'
import { CLASSIC_CASES, HOLDOUT_START, QUESTION_MAP, direction, runAllCases, summarise, xunKongOf } from './calibration'
import { findQuestionType } from './interpret'

describe('古籍實例校準（歷代六爻典籍 101 則實占案例）', () => {
  it('旬空推算：由日干支反推旬空兩支', () => {
    expect(xunKongOf('甲子')).toEqual(['戌', '亥'])
    expect(xunKongOf('癸酉')).toEqual(['戌', '亥']) // 甲子旬末
    expect(xunKongOf('甲戌')).toEqual(['申', '酉'])
    expect(xunKongOf('丙申')).toEqual(['辰', '巳']) // 甲午旬
    expect(xunKongOf('己丑')).toEqual(['午', '未']) // 甲申旬
    expect(xunKongOf('庚辰')).toEqual(['申', '酉']) // 甲戌旬
  })

  it('案例資料完整性：101 則，欄位齊全，卦名與動爻皆合法', () => {
    expect(CLASSIC_CASES).toHaveLength(101)
    for (const c of CLASSIC_CASES) {
      expect(c.dongYao).toBeGreaterThanOrEqual(1)
      expect(c.dongYao).toBeLessThanOrEqual(6)
      expect(c.benGua).toMatch(/^.{2,4}$/)
      expect(c.dayGanZhi).toHaveLength(2)
      expect(['吉', '偏吉', '平', '偏凶', '凶']).toContain(c.verdict)
    }
  })

  it('日干支必須合於六十甲子（天干地支奇偶配對）', () => {
    const G = '甲乙丙丁戊己庚辛壬癸', Z = '子丑寅卯辰巳午未申酉戌亥'
    for (const c of CLASSIC_CASES) {
      const gi = G.indexOf(c.dayGanZhi[0]), zi = Z.indexOf(c.dayGanZhi[1])
      expect(gi, c.dayGanZhi).toBeGreaterThanOrEqual(0)
      expect(zi, c.dayGanZhi).toBeGreaterThanOrEqual(0)
      expect(gi % 2, `${c.dayGanZhi} 非六十甲子之組合`).toBe(zi % 2)
    }
  })

  it('每一則案例都有對應的用神取法，且指向存在的問題類型', () => {
    for (let i = 0; i < CLASSIC_CASES.length; i++) {
      const m = QUESTION_MAP[i]
      expect(m, `第 ${i} 則缺少用神對應`).toBeTruthy()
      expect(findQuestionType(m.qtKey), `第 ${i} 則的 ${m.qtKey} 查無此類型`).toBeTruthy()
    }
  })

  it('全部案例都能被引擎還原並斷出結果，不拋錯', () => {
    const rs = runAllCases()
    expect(rs).toHaveLength(101)
    for (const r of rs) {
      expect(r.report.yongShenLine).not.toBeNull()
      expect(r.report.sections.length).toBeGreaterThan(0)
    }
  })

  // ── 準確度防線 ────────────────────────────────────────────────
  // 門檻設在目前水準略低處，用意是擋住「明顯的退步」，而非宣稱這些數字有統計顯著性。
  // 樣本 101 則，1 則 ≈ 1 個百分點，binomial 雜訊約 ±4.8pp。
  it('整體命中率須維持在 65% 以上，且必須勝過「全部猜吉」的基準', () => {
    const s = summarise(runAllCases())
    expect(s.hitRate).toBeGreaterThan(s.alwaysJi)
    expect(s.hitRate).toBeGreaterThanOrEqual(0.65)
  })

  it('高信心案例（用神取法無爭議者）命中率須維持在 66% 以上', () => {
    const s = summarise(runAllCases().filter(r => r.mapping.confident))
    expect(s.hitRate).toBeGreaterThanOrEqual(0.66)
  })

  // 主導條件是「一條定生死」的格局，若它的命中率掉到與整體相當，就失去獨立存在的理由，
  // 該退回一般計分項（忌神持世就是這樣被移除的）。
  it('主導條件觸發時的命中率須明顯高於整體水準（否則不配稱為決定性）', () => {
    const rs = runAllCases()
    const fired = rs.filter(r => r.report.decisive.length > 0)
    expect(fired.length).toBeGreaterThanOrEqual(8)
    const firedRate = fired.filter(r => r.hit).length / fired.length
    expect(firedRate).toBeGreaterThanOrEqual(0.85)
  })

  // 這是全套測試裡最有意義的一項：第二批從未被用來調參，所以它量的是泛化能力。
  // 訓練集成績再漂亮，只要這裡守不住，就代表參數是在擬合雜訊。
  it('保留測試集（第二批，未曾用於調參）須勝過其基準至少 8 個百分點', () => {
    const rs = runAllCases()
    const holdout = summarise(rs.slice(HOLDOUT_START))
    expect(holdout.n).toBeGreaterThanOrEqual(40)
    expect(holdout.lead).toBeGreaterThanOrEqual(0.08)
  })

  it('引擎不應濫用「平」判語：判平比例須低於一成（古籍實占極少作平論）', () => {
    const rs = runAllCases()
    expect(rs.filter(r => r.actual === 0).length / rs.length).toBeLessThan(0.1)
  })

  it('分數不得含浮點雜訊：所有案例的分數都應是 0.1 的整數倍', () => {
    for (const r of runAllCases()) {
      expect(Math.abs(r.report.score * 10 - Math.round(r.report.score * 10))).toBeLessThan(1e-9)
    }
  })

  it('direction 對五級判語的方向歸類正確', () => {
    expect(direction('大吉')).toBe(1)
    expect(direction('偏吉')).toBe(1)
    expect(direction('平')).toBe(0)
    expect(direction('偏凶')).toBe(-1)
    expect(direction('大凶')).toBe(-1)
  })
})
