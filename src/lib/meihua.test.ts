import { describe, expect, it } from 'vitest'
import { castManual } from './casting'
import { getChartTime } from './calendar'
import { analyzeMeihua } from './meihua'
import { QUESTION_TYPES, analyzeLiuyao } from './interpret'
import { buildNajiaChart } from './najia'

const T = new Date(2026, 7, 11, 20, 50) // 申月，與 engine.test.ts 同一組基準時間

describe('梅花體用：體卦與用卦的判定', () => {
  it('動爻在下卦（初至三爻）時，下卦為用、上卦為體', () => {
    const ct = getChartTime(T)
    for (const dong of [1, 2, 3]) {
      const m = analyzeMeihua(castManual(1, 5, dong), ct) // 上乾下巽
      expect(m.tiPos).toBe('上卦')
      expect(m.ti.name).toBe('乾')
      expect(m.yong.name).toBe('巽')
    }
  })

  it('動爻在上卦（四至上爻）時，上卦為用、下卦為體', () => {
    const ct = getChartTime(T)
    for (const dong of [4, 5, 6]) {
      const m = analyzeMeihua(castManual(1, 5, dong), ct)
      expect(m.tiPos).toBe('下卦')
      expect(m.ti.name).toBe('巽')
      expect(m.yong.name).toBe('乾')
    }
  })

  it('觀梅占（澤火革初爻動）：體為兌金、用為離火，火剋金為體受剋', () => {
    const ct = getChartTime(T)
    const m = analyzeMeihua(castManual(2, 3, 1), ct)
    expect(m.ti.name).toBe('兌')
    expect(m.yong.name).toBe('離')
    expect(m.tiYongRelation).toContain('剋')
    expect(m.tiYongLuck).toBeLessThan(0) // 用剋體為凶
  })
})

describe('梅花體用：判語分級與六爻斷卦共用同一套刻度', () => {
  const ct = getChartTime(T)

  it('平帶為 ±0.3，與 interpret.ts 一致（原本 ±1.5 是已被校準否定的舊設定）', () => {
    // 掃描全部 64 卦 × 6 動爻，確認落在「平」的卦其分數確實在極窄的帶內
    let flat = 0, total = 0
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        for (let d = 1; d <= 6; d++) {
          const m = analyzeMeihua(castManual(u, l, d), ct)
          total++
          if (m.level === '平') flat++
        }
      }
    }
    expect(total).toBe(384)
    // 收窄平帶後，判「平」應是少數；若回到 ±1.5 這個數字會大幅上升
    expect(flat / total).toBeLessThan(0.15)
  })

  it('分數不含浮點雜訊：所有卦的分數都是 0.1 的整數倍', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        for (let d = 1; d <= 6; d++) {
          const s = analyzeMeihua(castManual(u, l, d), ct).score
          expect(Math.abs(s * 10 - Math.round(s * 10))).toBeLessThan(1e-9)
        }
      }
    }
  })

  it('五級判語與分數方向一致，總斷文字不得與判語自相矛盾', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        for (let d = 1; d <= 6; d++) {
          const m = analyzeMeihua(castManual(u, l, d), ct)
          if (m.level === '大吉' || m.level === '偏吉') expect(m.score).toBeGreaterThan(0)
          if (m.level === '大凶' || m.level === '偏凶') expect(m.score).toBeLessThan(0)
          // 總斷須以結論開頭，論據在後，避免先講理由再給出相反的結論
          expect(m.summary).toContain('論據：')
          expect(m.summary.indexOf('論據：')).toBeGreaterThan(0)
        }
      }
    }
  })

  it('梅花與六爻採同一組標籤，兩者的分級界線可直接比較', () => {
    // 兩套系統在介面上並排顯示同一組五級標籤，刻度必須一致才有可比性。
    // 此處驗證：同一分數在兩套系統會得到相同的級別。
    const chart = buildNajiaChart(castManual(1, 1, 1).ben, 1, ct)
    const r = analyzeLiuyao(chart, ct, QUESTION_TYPES.find(q => q.key === 'general')!)
    const levelOf = (s: number) => s >= 4 ? '大吉' : s >= 0.3 ? '偏吉' : s > -0.3 ? '平' : s > -4 ? '偏凶' : '大凶'
    expect(levelOf(r.score)).toBe(r.verdict)
    for (let u = 1; u <= 8; u++) {
      const m = analyzeMeihua(castManual(u, 1, 1), ct)
      expect(levelOf(m.score)).toBe(m.level)
    }
  })
})

describe('梅花體用：輸出完整性', () => {
  it('每一卦都能產出完整欄位，不得有空字串或未定義', () => {
    const ct = getChartTime(T)
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        for (let d = 1; d <= 6; d++) {
          const m = analyzeMeihua(castManual(u, l, d), ct)
          expect(m.ti.name).toBeTruthy()
          expect(m.yong.name).toBeTruthy()
          expect(m.tiYongText).toBeTruthy()
          expect(m.summary).toBeTruthy()
          expect(['大吉', '偏吉', '平', '偏凶', '大凶']).toContain(m.level)
        }
      }
    }
  })
})
