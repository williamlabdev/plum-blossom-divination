// 六爻裝卦引擎：八宮世應、納甲、六親、六獸、伏神、旬空、神煞、旺衰、長生
import type { Branch, Element, LiuQin, LiuShou, Stem } from './data/core'
import {
  BRANCHES, BRANCH_ELEMENT, KE, LIUSHOU_SEQ, NAJIA, SHENG,
  branchIndex, chong, he, liuQinOf, liuShouStart, trigramByLines, trigramByName,
} from './data/core'
import type { ZhouyiGua } from './data/zhouyi'
import { guaByLines } from './data/zhouyi'
import type { ChartTime } from './calendar'
import type { Hexagram } from './casting'

// ── 八宮歸屬與世應 ──────────────────────────────
interface GongInfo {
  gong: string // 宮名（乾兌離震巽坎艮坤）
  gongElement: Element
  shi: number // 世爻位置 1..6
  seq: number // 0本宮 1一世 … 5五世 6游魂 7歸魂
  firstLines: number[] // 本宮首卦爻象
}

const SEQ_NAMES = ['本宮', '一世', '二世', '三世', '四世', '五世', '游魂', '歸魂']
const SHI_BY_SEQ = [6, 1, 2, 3, 4, 5, 4, 3]

function buildGongMap(): Map<string, GongInfo> {
  const map = new Map<string, GongInfo>()
  for (const name of ['乾', '兌', '離', '震', '巽', '坎', '艮', '坤']) {
    const t = trigramByName.get(name)!
    const firstLines = [...t.lines, ...t.lines]
    let cur = firstLines.slice()
    for (let seq = 0; seq <= 7; seq++) {
      if (seq >= 1 && seq <= 5) {
        cur[seq - 1] = cur[seq - 1] === 1 ? 0 : 1 // 依序變初～五爻
      } else if (seq === 6) {
        cur[3] = cur[3] === 1 ? 0 : 1 // 游魂：五世卦回變第四爻
      } else if (seq === 7) {
        for (let i = 0; i < 3; i++) cur[i] = cur[i] === 1 ? 0 : 1 // 歸魂：游魂卦下三爻復原
      }
      map.set(cur.join(''), {
        gong: name,
        gongElement: t.element,
        shi: SHI_BY_SEQ[seq],
        seq,
        firstLines: firstLines.slice(),
      })
    }
  }
  return map
}

const GONG_MAP = buildGongMap()

export function gongOf(lines: number[]): GongInfo {
  const info = GONG_MAP.get(lines.join(''))
  if (!info) throw new Error('gong not found: ' + lines.join(''))
  return info
}

// ── 納甲：取某卦六爻干支 ──────────────────────────
export interface StemBranch {
  stem: Stem
  branch: Branch
  element: Element
}

export function najiaLines(lines: number[]): StemBranch[] {
  const lower = trigramByLines.get(lines.slice(0, 3).join(''))!
  const upper = trigramByLines.get(lines.slice(3, 6).join(''))!
  const rl = NAJIA[lower.name]
  const ru = NAJIA[upper.name]
  const result: StemBranch[] = []
  for (let i = 0; i < 3; i++) result.push({ stem: rl.stemInner, branch: rl.inner[i], element: BRANCH_ELEMENT[rl.inner[i]] })
  for (let i = 0; i < 3; i++) result.push({ stem: ru.stemOuter, branch: ru.outer[i], element: BRANCH_ELEMENT[ru.outer[i]] })
  return result
}

// ── 神煞 ──────────────────────────────────────
export interface ShenSha {
  guiRen: Branch[] // 天乙貴人（日干）
  yiMa: Branch // 驛馬（日支）
  taoHua: Branch // 桃花（日支）
  jieSha: Branch // 劫煞（日支）
  yangRen: Branch // 羊刃（日干）
  ganLu: Branch // 干祿（日干）
  tianXi: Branch // 天喜（月令四季）
  wangWang: Branch // 往亡（月建）
  guaShen: Branch | null // 卦身
  riChong: Branch // 日沖
  yuePo: Branch // 月破
  xunKong: [Branch, Branch]
}

const GUIREN: Record<Stem, [Branch, Branch]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['巳', '卯'], 癸: ['巳', '卯'],
  辛: ['午', '寅'],
}

function sanHeStart(b: Branch): number {
  // 三合局首字：申子辰→申、寅午戌→寅、巳酉丑→巳、亥卯未→亥
  const i = branchIndex(b)
  return (i % 4)
}

function yiMaOf(day: Branch): Branch {
  // 申子辰馬在寅、寅午戌馬在申、巳酉丑馬在亥、亥卯未馬在巳
  switch (sanHeStart(day)) {
    case 0: return '寅' // 申子辰（子=0）
    case 1: return '亥' // 巳酉丑（丑=1）
    case 2: return '申' // 寅午戌（寅=2）
    default: return '巳' // 亥卯未（卯=3）
  }
}

function taoHuaOf(day: Branch): Branch {
  // 申子辰在酉、寅午戌在卯、巳酉丑在午、亥卯未在子
  switch (sanHeStart(day)) {
    case 0: return '酉'
    case 1: return '午'
    case 2: return '卯'
    default: return '子'
  }
}

function jieShaOf(day: Branch): Branch {
  // 申子辰劫在巳、寅午戌劫在亥、巳酉丑劫在寅、亥卯未劫在申
  switch (sanHeStart(day)) {
    case 0: return '巳'
    case 1: return '寅'
    case 2: return '亥'
    default: return '申'
  }
}

const YANGREN: Record<Stem, Branch> = {
  甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑',
}

const GANLU: Record<Stem, Branch> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
}

function tianXiOf(monthBranch: Branch): Branch {
  // 春戌 夏丑 秋辰 冬未
  const i = branchIndex(monthBranch)
  if (i >= 2 && i <= 4) return '戌' // 寅卯辰
  if (i >= 5 && i <= 7) return '丑' // 巳午未
  if (i >= 8 && i <= 10) return '辰' // 申酉戌
  return '未' // 亥子丑
}

const WANGWANG: Record<Branch, Branch> = {
  // 正月起：寅巳申亥卯午酉子辰未戌丑
  寅: '寅', 卯: '巳', 辰: '申', 巳: '亥', 午: '卯', 未: '午',
  申: '酉', 酉: '子', 戌: '辰', 亥: '未', 子: '戌', 丑: '丑',
}

// ── 六沖卦與六合卦 ─────────────────────────────
// 內外卦對應之爻（初與四、二與五、三與六）納甲地支若全部相沖，即為六沖卦（共十卦）；
// 若全部相合，即為六合卦（共八卦）。六沖主事散難成、六合主事易成，是斷卦的宏觀格局。
export type GuaXing = '六沖' | '六合' | null

export function guaXingOf(lines: number[]): GuaXing {
  const sbs = najiaLines(lines)
  let allChong = true
  let allHe = true
  for (let i = 0; i < 3; i++) {
    if (chong(sbs[i].branch) !== sbs[i + 3].branch) allChong = false
    if (he(sbs[i].branch) !== sbs[i + 3].branch) allHe = false
  }
  if (allChong) return '六沖'
  if (allHe) return '六合'
  return null
}

// ── 旺衰與長生 ──────────────────────────────────
export type WangShuai = '旺' | '相' | '休' | '囚' | '死'

export function wangShuaiOf(el: Element, monthEl: Element): WangShuai {
  if (el === monthEl) return '旺'
  if (SHENG[monthEl] === el) return '相' // 當令所生
  if (SHENG[el] === monthEl) return '休' // 生當令者
  if (KE[el] === monthEl) return '囚' // 剋當令者
  return '死' // 當令所剋
}

export const CHANGSHENG_SEQ = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'] as const
export type ChangSheng = (typeof CHANGSHENG_SEQ)[number]

const CS_START: Record<Element, Branch> = { 木: '亥', 火: '寅', 土: '寅', 金: '巳', 水: '申' } // 火土同宮

export function changShengOf(el: Element, ref: Branch): ChangSheng {
  const start = branchIndex(CS_START[el])
  const diff = (branchIndex(ref) - start + 12) % 12
  return CHANGSHENG_SEQ[diff]
}

// ── 時間框架 ──────────────────────────────────
/** 旺衰、長生、月破、旬空、日沖所需的**全部**時間輸入，且僅止於此。
 *
 *  為什麼不直接傳 `ChartTime`：那是曆法的產物（公農曆文字、年時干支、梅花起卦數、
 *  原始 Date），帶著它就無法問「同一卦若在寅月會如何」——而未來時點推演（backlog #3）
 *  與多爻作用結算層（#4）要問的正是這個。把時間收斂成這四個欄位之後，
 *  `withMonthBranch` 才能造出「只換月建、其餘一律不動」的框架。 */
export interface TimeFrame {
  monthBranch: Branch
  dayStem: Stem
  dayBranch: Branch
  xunKong: readonly [Branch, Branch]
}

export function frameOf(ct: ChartTime): TimeFrame {
  return { monthBranch: ct.month.branch, dayStem: ct.day.stem, dayBranch: ct.day.branch, xunKong: ct.xunKong }
}

/** 只換月建、其餘不動。逐月重算旺衰時用它。
 *
 *  注意旬空**刻意不跟著換**：旬空由日柱所在的旬決定，與月建無關。
 *  推演「若在某月」時，問的是同一日所起之卦在不同月令下的氣勢，日柱本就不該變。 */
export function withMonthBranch(frame: TimeFrame, monthBranch: Branch): TimeFrame {
  return { ...frame, monthBranch }
}

/** 一個地支在給定時間框架下的旺衰、長生、月破、旬空、日沖。
 *  純函式——同樣輸入必得同樣輸出，不讀取任何卦盤狀態，可帶任意月建重算。 */
export interface BranchTiming {
  wangShuai: WangShuai
  changSheng: ChangSheng
  isXunKong: boolean
  isYuePo: boolean
  isRiChong: boolean
}

export function timingOf(branch: Branch, frame: TimeFrame): BranchTiming {
  const el = BRANCH_ELEMENT[branch]
  return {
    wangShuai: wangShuaiOf(el, BRANCH_ELEMENT[frame.monthBranch]),
    changSheng: changShengOf(el, frame.dayBranch), // 長生以日支論
    isXunKong: branch === frame.xunKong[0] || branch === frame.xunKong[1],
    isYuePo: branch === chong(frame.monthBranch),
    isRiChong: branch === chong(frame.dayBranch),
  }
}

// ── 完整裝卦 ──────────────────────────────────
export interface FuShen {
  liuqin: LiuQin
  sb: StemBranch
  pos: number
}

export interface LineInfo {
  pos: number // 1..6
  yang: boolean
  isDong: boolean
  shiYing: '世' | '應' | null
  sb: StemBranch
  liuqin: LiuQin
  liushou: LiuShou
  isXunKong: boolean
  isYuePo: boolean
  isRiChong: boolean
  fuShen: FuShen | null
  bian: { sb: StemBranch; liuqin: LiuQin } | null // 動爻對應之變卦爻
  wangShuai: WangShuai
  changSheng: ChangSheng // 以日支論
}

/** 把一爻搬到另一個時間框架下重算。
 *
 *  只有隨時間改變的五個欄位（旺衰、長生、月破、旬空、日沖）會被換掉；納甲、六親、
 *  世應、動變、伏神都是卦本身的結構，與時間無關，原樣保留。
 *  這是「可帶任意月建重算」的入口：`lineAt(l, withMonthBranch(frame, '寅'))`。 */
export function lineAt(line: LineInfo, frame: TimeFrame): LineInfo {
  return { ...line, ...timingOf(line.sb.branch, frame) }
}

export interface NajiaChart {
  gong: string
  gongElement: Element
  seqName: string // 本宮/一世/…/歸魂
  shiPos: number
  yingPos: number
  firstGua: ZhouyiGua // 首卦
  lines: LineInfo[]
  shenSha: ShenSha
  benXing: GuaXing // 本卦格局：六沖／六合／無
  bianXing: GuaXing // 變卦格局
  wuXingZhuangTai: { el: Element; wang: WangShuai; cs: ChangSheng }[] // 五行旺衰（月令）與長生（日支）
}

/** 把整張卦盤搬到另一個時間框架下重算。
 *
 *  只有隨時間改變的東西會換：六爻的旺衰長生空破沖（`lineAt`）、五行旺衰表、
 *  以及神煞裡由月建推得的天喜與旺日、月破。納甲、六親、世應、動變、伏神、卦格
 *  都是卦本身的結構，與時間無關，原樣保留。
 *
 *  日柱相關的神煞（貴人、驛馬、桃花、劫煞、羊刃、干祿）也不動：`withMonthBranch`
 *  推演的是「同一日所起之卦在別的月令下」，日柱本就不該變（見 `withMonthBranch`）。 */
export function chartAt(chart: NajiaChart, frame: TimeFrame): NajiaChart {
  const ELS: Element[] = ['金', '木', '水', '火', '土']
  const monthEl = BRANCH_ELEMENT[frame.monthBranch]
  return {
    ...chart,
    lines: chart.lines.map(l => lineAt(l, frame)),
    shenSha: {
      ...chart.shenSha,
      tianXi: tianXiOf(frame.monthBranch),
      wangWang: WANGWANG[frame.monthBranch],
      riChong: chong(frame.dayBranch),
      yuePo: chong(frame.monthBranch),
      xunKong: [...frame.xunKong],
    },
    wuXingZhuangTai: ELS.map(el => ({ el, wang: wangShuaiOf(el, monthEl), cs: changShengOf(el, frame.dayBranch) })),
  }
}

export function buildNajiaChart(ben: Hexagram, dong: number, ct: ChartTime): NajiaChart {
  const info = gongOf(ben.lines)
  const shiPos = info.shi
  const yingPos = ((shiPos + 2) % 6) + 1 // 世+3（1..6 循環）
  const sbs = najiaLines(ben.lines)
  const monthEl = BRANCH_ELEMENT[ct.month.branch]

  // 變卦
  const bianLines = ben.lines.slice()
  bianLines[dong - 1] = bianLines[dong - 1] === 1 ? 0 : 1
  const bianSbs = najiaLines(bianLines)

  // 首卦納甲與六親（伏神用）
  const firstSbs = najiaLines(info.firstLines)
  const firstLiuqin = firstSbs.map(sb => liuQinOf(info.gongElement, sb.element))
  const firstGua = guaByLines.get(info.firstLines.join(''))!

  // 本卦六親
  const benLiuqin = sbs.map(sb => liuQinOf(info.gongElement, sb.element))

  // 伏神：本卦缺的六親，從首卦取
  const present = new Set(benLiuqin)
  const fuShenByPos = new Map<number, FuShen>()
  const ALL: LiuQin[] = ['父母', '兄弟', '子孫', '妻財', '官鬼']
  for (const lq of ALL) {
    if (!present.has(lq)) {
      for (let i = 0; i < 6; i++) {
        if (firstLiuqin[i] === lq) {
          fuShenByPos.set(i + 1, { liuqin: lq, sb: firstSbs[i], pos: i + 1 })
        }
      }
    }
  }

  const shouStart = liuShouStart(ct.day.stem)
  // 隨時間變動的五個欄位一律由 timingOf 產出，這裡不再各自算一份——
  // 否則「帶任意月建重算」與「起卦當下」會是兩套算法，遲早對不上
  const frame = frameOf(ct)

  const lines: LineInfo[] = []
  for (let i = 0; i < 6; i++) {
    const pos = i + 1
    const sb = sbs[i]
    lines.push({
      pos,
      yang: ben.lines[i] === 1,
      isDong: pos === dong,
      shiYing: pos === shiPos ? '世' : pos === yingPos ? '應' : null,
      sb,
      liuqin: benLiuqin[i],
      liushou: LIUSHOU_SEQ[(shouStart + i) % 6],
      fuShen: fuShenByPos.get(pos) ?? null,
      bian: pos === dong
        ? { sb: bianSbs[i], liuqin: liuQinOf(info.gongElement, bianSbs[i].element) }
        : null,
      ...timingOf(sb.branch, frame),
    })
  }

  // 卦身：世爻為陽從子起初爻、為陰從午起初爻，數至世爻
  const shiYang = ben.lines[shiPos - 1] === 1
  const start = shiYang ? 0 : 6
  const guaShen = BRANCHES[(start + shiPos - 1) % 12]

  const shenSha: ShenSha = {
    guiRen: [...GUIREN[ct.day.stem]],
    yiMa: yiMaOf(ct.day.branch),
    taoHua: taoHuaOf(ct.day.branch),
    jieSha: jieShaOf(ct.day.branch),
    yangRen: YANGREN[ct.day.stem],
    ganLu: GANLU[ct.day.stem],
    tianXi: tianXiOf(ct.month.branch),
    wangWang: WANGWANG[ct.month.branch],
    guaShen,
    riChong: chong(frame.dayBranch),
    yuePo: chong(frame.monthBranch),
    xunKong: ct.xunKong,
  }

  const ELS: Element[] = ['金', '木', '水', '火', '土']
  return {
    gong: info.gong,
    gongElement: info.gongElement,
    seqName: SEQ_NAMES[info.seq] + (info.seq >= 1 && info.seq <= 5 ? '卦' : info.seq === 0 ? '' : '卦'),
    shiPos,
    yingPos,
    firstGua,
    lines,
    shenSha,
    benXing: guaXingOf(ben.lines),
    bianXing: guaXingOf(bianLines),
    wuXingZhuangTai: ELS.map(el => ({ el, wang: wangShuaiOf(el, monthEl), cs: changShengOf(el, ct.day.branch) })),
  }
}

