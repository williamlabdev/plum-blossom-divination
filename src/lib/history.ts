// 起卦紀錄的儲存與讀取。
// 這裡的邏輯特別需要測試保護：loadHistory 會「丟棄」驗證不過的項目，而介面掛載後
// 會立刻把過濾結果寫回 localStorage——驗證條件只要寫錯一個字，使用者的歷史紀錄
// 就會在下次開啟時被靜默且永久刪除。故將純邏輯抽離元件、以可注入的 storage 實作，
// 讓它能在沒有瀏覽器環境的情況下被完整測試。

export const HISTORY_KEY = 'plum-blossom-history-v1'
export const HISTORY_LIMIT = 50

export interface CastInput {
  dateLocal: string // 起卦當地牆鐘時間 YYYY-MM-DDTHH:mm（不存 UTC，跨時區開啟舊紀錄才能重現同一盤）
  method: 'time' | 'number' | 'random' | 'manual'
  numbers?: number[]
  includeHour?: boolean
  manual?: { upper: number; lower: number; dong: number }
  qtKey: string
  question: string
  /** 問吉凶／問時機。舊紀錄沒有這個欄位，讀回來時一律當作 `吉凶`（見 App 的 compute）。
   *  刻意寫成字面量而不從 interpret 匯入型別：這個模組是純儲存邏輯，不該依賴斷卦引擎。 */
  intent?: '吉凶' | '時機'
}

export interface HistoryItem extends CastInput {
  savedAt: string
  guaName: string
  /** 問時機的紀錄沒有判語，存空字串。介面據此改顯示「問時機」。 */
  verdict: string
}

/** 供測試注入的最小 storage 介面（localStorage 即符合此形狀） */
export interface SimpleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function fmtLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function parseLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s)
  if (!m) return new Date(NaN)
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
}

const METHODS = ['time', 'number', 'random', 'manual']

/** 舊版以 UTC dateISO 儲存 → 以本機時區轉為牆鐘時間（同時區使用者結果不變） */
function migrate(x: unknown): unknown {
  if (x && typeof x === 'object' && !('dateLocal' in x)) {
    const o = x as { dateISO?: unknown }
    if (typeof o.dateISO === 'string') {
      const d = new Date(o.dateISO)
      if (!Number.isNaN(d.getTime())) return { ...x, dateLocal: fmtLocal(d) }
    }
  }
  return x
}

/** 形狀驗證：略過損壞或無法辨識的項目，避免整個 App 掛掉。
 *  刻意寫得寬鬆——寧可留下一筆稍有瑕疵的紀錄，也不要誤刪使用者的資料。 */
export function isValidHistoryItem(x: unknown): x is HistoryItem {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (typeof o.dateLocal !== 'string' || Number.isNaN(parseLocal(o.dateLocal).getTime())) return false
  if (typeof o.method !== 'string' || !METHODS.includes(o.method)) return false
  if (typeof o.qtKey !== 'string') return false
  if (o.method === 'number' && !Array.isArray(o.numbers)) return false
  if ((o.method === 'manual' || o.method === 'random')) {
    const m = o.manual as { upper?: unknown } | undefined
    if (!m || typeof m.upper !== 'number') return false
  }
  return true
}

export function loadHistory(storage: SimpleStorage): HistoryItem[] {
  try {
    const raw: unknown = JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.map(migrate).filter(isValidHistoryItem).slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

/** 儲存空間滿或被停用時靜默略過——寧可少存一筆，也不要讓使用者的起卦流程中斷 */
export function saveHistory(storage: SimpleStorage, items: HistoryItem[]): void {
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)))
  } catch {
    /* 忽略 */
  }
}
