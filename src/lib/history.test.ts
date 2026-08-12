import { describe, expect, it } from 'vitest'
import type { HistoryItem, SimpleStorage } from './history'
import {
  HISTORY_KEY, HISTORY_LIMIT, fmtLocal, isValidHistoryItem, loadHistory, parseLocal, saveHistory,
} from './history'

/** 記憶體版 storage，讓紀錄邏輯能在無瀏覽器環境下完整測試 */
function memStorage(initial?: string): SimpleStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  if (initial !== undefined) data[HISTORY_KEY] = initial
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v },
  }
}

const validItem: HistoryItem = {
  dateLocal: '2026-08-12T20:30', method: 'time', qtKey: 'general', question: '測試',
  savedAt: '2026-08-12T12:30:00.000Z', guaName: '乾為天 → 天風姤', verdict: '偏吉',
}

describe('牆鐘時間格式化與解析', () => {
  it('fmtLocal 產生本地時區的 YYYY-MM-DDTHH:mm', () => {
    expect(fmtLocal(new Date(2026, 7, 12, 20, 30))).toBe('2026-08-12T20:30')
    expect(fmtLocal(new Date(2026, 0, 5, 3, 7))).toBe('2026-01-05T03:07') // 補零
  })

  it('parseLocal 與 fmtLocal 互為逆運算（跨時區不失真）', () => {
    for (const d of [new Date(2026, 0, 1, 0, 0), new Date(2026, 11, 31, 23, 59), new Date(2026, 5, 15, 12, 34)]) {
      expect(fmtLocal(parseLocal(fmtLocal(d)))).toBe(fmtLocal(d))
    }
  })

  it('parseLocal 對格式錯誤回傳 Invalid Date 而非拋錯', () => {
    for (const bad of ['', '亂寫', '2026-13-99', '2026/08/12 20:30', '2026-08-12']) {
      expect(Number.isNaN(parseLocal(bad).getTime())).toBe(true)
    }
  })
})

describe('紀錄形狀驗證（誤刪使用者紀錄的防線）', () => {
  it('合法項目通過驗證', () => {
    expect(isValidHistoryItem(validItem)).toBe(true)
    expect(isValidHistoryItem({ ...validItem, method: 'number', numbers: [3, 5] })).toBe(true)
    expect(isValidHistoryItem({ ...validItem, method: 'manual', manual: { upper: 1, lower: 2, dong: 3 } })).toBe(true)
    expect(isValidHistoryItem({ ...validItem, method: 'random', manual: { upper: 8, lower: 8, dong: 6 } })).toBe(true)
  })

  it('缺少必要欄位或型別錯誤者不通過', () => {
    expect(isValidHistoryItem(null)).toBe(false)
    expect(isValidHistoryItem(undefined)).toBe(false)
    expect(isValidHistoryItem('字串')).toBe(false)
    expect(isValidHistoryItem(123)).toBe(false)
    expect(isValidHistoryItem({})).toBe(false)
    expect(isValidHistoryItem({ ...validItem, dateLocal: '壞掉的時間' })).toBe(false)
    expect(isValidHistoryItem({ ...validItem, method: '不存在的方式' })).toBe(false)
    expect(isValidHistoryItem({ ...validItem, qtKey: 123 })).toBe(false)
    expect(isValidHistoryItem({ ...validItem, method: 'number' })).toBe(false) // 缺 numbers
    expect(isValidHistoryItem({ ...validItem, method: 'manual' })).toBe(false) // 缺 manual
  })

  it('未知的問題類別 key 仍算合法，不得因此刪除紀錄', () => {
    // 問題類別會隨版本增減（health 已拆為 health-new／health-old），
    // 若把「查不到的 key」當成損壞而過濾掉，使用者的舊紀錄會被靜默刪除。
    expect(isValidHistoryItem({ ...validItem, qtKey: 'health' })).toBe(true)
    expect(isValidHistoryItem({ ...validItem, qtKey: '未來才會有的類別' })).toBe(true)
  })

  it('多出未知欄位不影響驗證（向前相容）', () => {
    expect(isValidHistoryItem({ ...validItem, futureField: 'x', another: 42 })).toBe(true)
  })
})

describe('loadHistory：損壞資料不得拖垮 App，也不得誤刪好資料', () => {
  it('空的或不存在的儲存回傳空陣列', () => {
    expect(loadHistory(memStorage())).toEqual([])
    expect(loadHistory(memStorage('[]'))).toEqual([])
  })

  it('無法解析的 JSON 回傳空陣列而非拋錯', () => {
    expect(loadHistory(memStorage('{壞掉的 json'))).toEqual([])
    expect(loadHistory(memStorage('undefined'))).toEqual([])
  })

  it('JSON 合法但不是陣列（如 null、物件、數字）回傳空陣列', () => {
    for (const s of ['null', '{"a":1}', '42', '"字串"', 'true']) {
      expect(loadHistory(memStorage(s))).toEqual([])
    }
  })

  it('壞項目被略過，好項目必須保留', () => {
    const raw = JSON.stringify([validItem, null, { 亂: '資料' }, { ...validItem, question: '第二筆' }])
    const out = loadHistory(memStorage(raw))
    expect(out).toHaveLength(2)
    expect(out[0].question).toBe('測試')
    expect(out[1].question).toBe('第二筆')
  })

  it('舊版 dateISO 格式自動遷移為 dateLocal，且不被當成損壞資料刪除', () => {
    const legacy = {
      dateISO: new Date(2026, 7, 12, 20, 30).toISOString(),
      method: 'time', qtKey: 'general', question: '舊紀錄',
      savedAt: '2026-08-12T12:30:00.000Z', guaName: '乾為天 → 天風姤', verdict: '偏吉',
    }
    const out = loadHistory(memStorage(JSON.stringify([legacy])))
    expect(out).toHaveLength(1)
    expect(out[0].dateLocal).toBe('2026-08-12T20:30')
    expect(out[0].question).toBe('舊紀錄')
  })

  it('超過上限時只取前 50 筆', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ ...validItem, question: `第${i}筆` }))
    const out = loadHistory(memStorage(JSON.stringify(many)))
    expect(out).toHaveLength(HISTORY_LIMIT)
    expect(out[0].question).toBe('第0筆')
  })
})

describe('saveHistory：儲存失敗不得中斷起卦流程', () => {
  it('正常寫入並可原樣讀回', () => {
    const st = memStorage()
    saveHistory(st, [validItem])
    expect(loadHistory(st)).toEqual([validItem])
  })

  it('寫入超過上限時截斷', () => {
    const st = memStorage()
    saveHistory(st, Array.from({ length: 80 }, (_, i) => ({ ...validItem, question: `第${i}筆` })))
    expect(JSON.parse(st.data[HISTORY_KEY])).toHaveLength(HISTORY_LIMIT)
  })

  it('storage 拋錯（配額滿或隱私模式）時靜默略過，不向外拋出', () => {
    const failing: SimpleStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
    }
    expect(() => saveHistory(failing, [validItem])).not.toThrow()
  })
})
