// 起卦引擎：梅花易數 時間起卦／數字起卦，並推導互卦、變卦
import type { Trigram } from './data/core'
import { trigramByLines, trigramByXiantian } from './data/core'
import type { ZhouyiGua } from './data/zhouyi'
import { guaByLines } from './data/zhouyi'
import type { ChartTime } from './calendar'

export interface Hexagram {
  lines: number[] // 六爻由下而上，1=陽
  gua: ZhouyiGua
  lower: Trigram
  upper: Trigram
}

export interface CastResult {
  method: string
  ben: Hexagram // 本卦
  dong: number // 動爻 1..6
  bian: Hexagram // 變卦
  hu: Hexagram // 互卦
  numbers: { upper: number; lower: number; sum: number } // 起卦用數（供顯示）
}

export function hexagramFromLines(lines: number[]): Hexagram {
  const gua = guaByLines.get(lines.join(''))
  if (!gua) throw new Error('unknown hexagram: ' + lines.join(''))
  const lower = trigramByLines.get(lines.slice(0, 3).join(''))!
  const upper = trigramByLines.get(lines.slice(3, 6).join(''))!
  return { lines, gua, lower, upper }
}

export function hexagramFromTrigrams(upperN: number, lowerN: number): Hexagram {
  const upper = trigramByXiantian.get(upperN)!
  const lower = trigramByXiantian.get(lowerN)!
  return hexagramFromLines([...lower.lines, ...upper.lines])
}

function mod(n: number, m: number): number {
  const r = n % m
  return r === 0 ? m : r
}

function derive(ben: Hexagram, dong: number, method: string, nums: { upper: number; lower: number; sum: number }): CastResult {
  // 變卦：動爻變
  const bianLines = ben.lines.slice()
  bianLines[dong - 1] = bianLines[dong - 1] === 1 ? 0 : 1
  // 互卦：二三四爻為下卦、三四五爻為上卦
  const huLines = [ben.lines[1], ben.lines[2], ben.lines[3], ben.lines[2], ben.lines[3], ben.lines[4]]
  return {
    method,
    ben,
    dong,
    bian: hexagramFromLines(bianLines),
    hu: hexagramFromLines(huLines),
    numbers: nums,
  }
}

// 時間起卦：（年支序＋農曆月＋農曆日）除8餘數為上卦；再加時辰序除8餘數為下卦；總數除6餘數為動爻
export function castByTime(ct: ChartTime): CastResult {
  const upperSum = ct.meihuaYearNum + ct.meihuaMonthNum + ct.meihuaDayNum
  const lowerSum = upperSum + ct.meihuaHourNum
  const upperN = mod(upperSum, 8)
  const lowerN = mod(lowerSum, 8)
  const dong = mod(lowerSum, 6)
  const ben = hexagramFromTrigrams(upperN, lowerN)
  return derive(ben, dong, '時間起卦', { upper: upperSum, lower: lowerSum, sum: lowerSum })
}

// 數字起卦：兩數 → 前數為上卦、後數為下卦、兩數和（可加時辰）為動爻
// 三數 → 前二數起卦，第三數（總和）定動爻
export function castByNumbers(nums: number[], hourNum?: number): CastResult {
  if (nums.length < 1) throw new Error('請輸入至少一個數字')
  for (const n of nums) {
    if (!Number.isSafeInteger(n) || n < 1) throw new Error('起卦數字須為 1 以上的整數')
  }
  let a: number, b: number, dongSum: number
  if (nums.length === 1) {
    // 單數：拆半，前半為上卦、後半為下卦（單一位數則上下卦同數）
    const s = String(nums[0])
    const half = Math.ceil(s.length / 2)
    a = parseInt(s.slice(0, half), 10)
    const rest = s.slice(half)
    b = rest === '' ? a : parseInt(rest, 10)
    if (b === 0) b = 8 // 後半為 0（如 10、20、100）：0 依慣例作 8（坤）
    dongSum = a + b + (hourNum ?? 0)
  } else if (nums.length === 2) {
    a = nums[0]
    b = nums[1]
    dongSum = a + b + (hourNum ?? 0)
  } else {
    a = nums[0]
    b = nums[1]
    dongSum = nums[0] + nums[1] + nums[2]
  }
  const upperN = mod(a, 8)
  const lowerN = mod(b, 8)
  const dong = mod(dongSum, 6)
  const ben = hexagramFromTrigrams(upperN, lowerN)
  return derive(ben, dong, '數字起卦', { upper: a, lower: b, sum: dongSum })
}

// 直接指定卦（如搖卦結果輸入）：上下卦先天數＋動爻
export function castManual(upperN: number, lowerN: number, dong: number, methodLabel = '指定卦象'): CastResult {
  const ben = hexagramFromTrigrams(upperN, lowerN)
  return derive(ben, dong, methodLabel, { upper: upperN, lower: lowerN, sum: dong })
}

// 安全隨機整數 1..max（優先用 crypto）
export function randomInt(max: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    // 去除模數偏差
    const limit = Math.floor(0xffffffff / max) * max
    let v: number
    do {
      crypto.getRandomValues(buf)
      v = buf[0]
    } while (v >= limit)
    return (v % max) + 1
  }
  return Math.floor(Math.random() * max) + 1
}

// 隨機起卦：隨機產生上卦、下卦、動爻（電腦代擲）
export function drawRandom(): { upper: number; lower: number; dong: number } {
  return { upper: randomInt(8), lower: randomInt(8), dong: randomInt(6) }
}
