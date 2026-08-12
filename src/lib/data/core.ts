// 基礎資料：天干地支、五行、八卦、納甲
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export type Stem = (typeof STEMS)[number]
export type Branch = (typeof BRANCHES)[number]
export type Element = '金' | '木' | '水' | '火' | '土'
export type LiuQin = '兄弟' | '父母' | '子孫' | '官鬼' | '妻財'
export type LiuShou = '青龍' | '朱雀' | '勾陳' | '騰蛇' | '白虎' | '玄武'

export const BRANCH_ELEMENT: Record<Branch, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
}

// 五行相生：SHENG[x] 為 x 所生
export const SHENG: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
// 五行相剋：KE[x] 為 x 所剋
export const KE: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

export type Relation = '比和' | '我生' | '生我' | '我剋' | '剋我'

export function relation(me: Element, other: Element): Relation {
  if (me === other) return '比和'
  if (SHENG[me] === other) return '我生'
  if (SHENG[other] === me) return '生我'
  if (KE[me] === other) return '我剋'
  return '剋我'
}

// 六親：以卦宮五行為「我」
export function liuQinOf(gong: Element, yao: Element): LiuQin {
  switch (relation(gong, yao)) {
    case '比和': return '兄弟'
    case '生我': return '父母'
    case '我生': return '子孫'
    case '我剋': return '妻財'
    case '剋我': return '官鬼'
  }
}

export function branchIndex(b: Branch): number {
  return BRANCHES.indexOf(b)
}

// 六沖
export function chong(b: Branch): Branch {
  return BRANCHES[(branchIndex(b) + 6) % 12]
}

// 六合
const HE_PAIRS: [Branch, Branch][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]
export function he(b: Branch): Branch {
  for (const [a, c] of HE_PAIRS) {
    if (a === b) return c
    if (c === b) return a
  }
  throw new Error('unreachable')
}

// 三合局：申子辰合水、巳酉丑合金、寅午戌合火、亥卯未合木
export interface SanHeGroup {
  branches: [Branch, Branch, Branch]
  element: Element
}
export const SANHE_GROUPS: SanHeGroup[] = [
  { branches: ['申', '子', '辰'], element: '水' },
  { branches: ['巳', '酉', '丑'], element: '金' },
  { branches: ['寅', '午', '戌'], element: '火' },
  { branches: ['亥', '卯', '未'], element: '木' },
]
// 五行墓庫（辰戌丑未四墓庫）：木墓未、火土同宮墓戌、金墓丑、水墓辰
// 與 najia.ts 的長生十二宮（changShengOf）推出的「墓」位一致
export const MU_BRANCH: Record<Element, Branch> = { 木: '未', 火: '戌', 土: '戌', 金: '丑', 水: '辰' }
// 五行絕地：木絕申、火土絕亥、金絕寅、水絕巳
export const JUE_BRANCH: Record<Element, Branch> = { 木: '申', 火: '亥', 土: '亥', 金: '寅', 水: '巳' }

// 四進神／四退神：動爻化出同五行而地支順進為「進神」、逆退為「退神」
// 古法僅論此四組（亥子、寅卯、巳午、申酉），辰戌丑未土支不在其列
const JINSHEN_PAIRS: [Branch, Branch][] = [['亥', '子'], ['寅', '卯'], ['巳', '午'], ['申', '酉']]
export function jinTuiShen(from: Branch, to: Branch): '進神' | '退神' | null {
  for (const [a, b] of JINSHEN_PAIRS) {
    if (from === a && to === b) return '進神'
    if (from === b && to === a) return '退神'
  }
  return null
}

// 六親相生循環（與宮五行無關，恆定）：父母生兄弟、兄弟生子孫、子孫生妻財、妻財生官鬼、官鬼生父母
// 對應相剋：父母剋子孫、子孫剋官鬼、官鬼剋兄弟、兄弟剋妻財、妻財剋父母
export const LIUQIN_ORDER: LiuQin[] = ['父母', '兄弟', '子孫', '妻財', '官鬼']
function liuqinIdx(lq: LiuQin): number {
  return LIUQIN_ORDER.indexOf(lq)
}
// 原神：生用神者
export function yuanShenOf(lq: LiuQin): LiuQin {
  return LIUQIN_ORDER[(liuqinIdx(lq) + 4) % 5]
}
// 忌神：剋用神者
export function jiShenOf(lq: LiuQin): LiuQin {
  return LIUQIN_ORDER[(liuqinIdx(lq) + 3) % 5]
}
// 仇神：生忌神、剋原神者
export function chouShenOf(lq: LiuQin): LiuQin {
  return LIUQIN_ORDER[(liuqinIdx(lq) + 2) % 5]
}

// ── 八卦 ──
export interface Trigram {
  name: string
  xiantian: number // 先天卦數：乾一兌二離三震四巽五坎六艮七坤八
  lines: [number, number, number] // 由下而上，1=陽
  element: Element
  nature: string // 天澤火雷風水山地
}

export const TRIGRAMS: Trigram[] = [
  { name: '乾', xiantian: 1, lines: [1, 1, 1], element: '金', nature: '天' },
  { name: '兌', xiantian: 2, lines: [1, 1, 0], element: '金', nature: '澤' },
  { name: '離', xiantian: 3, lines: [1, 0, 1], element: '火', nature: '火' },
  { name: '震', xiantian: 4, lines: [1, 0, 0], element: '木', nature: '雷' },
  { name: '巽', xiantian: 5, lines: [0, 1, 1], element: '木', nature: '風' },
  { name: '坎', xiantian: 6, lines: [0, 1, 0], element: '水', nature: '水' },
  { name: '艮', xiantian: 7, lines: [0, 0, 1], element: '土', nature: '山' },
  { name: '坤', xiantian: 8, lines: [0, 0, 0], element: '土', nature: '地' },
]

export const trigramByXiantian = new Map(TRIGRAMS.map(t => [t.xiantian, t]))
export const trigramByName = new Map(TRIGRAMS.map(t => [t.name, t]))
export const trigramByLines = new Map(TRIGRAMS.map(t => [t.lines.join(''), t]))

// ── 納甲 ──
// 各宮卦內外卦所納天干與各爻地支（地支由下而上）
export interface NajiaRule {
  stemInner: Stem
  stemOuter: Stem
  inner: [Branch, Branch, Branch]
  outer: [Branch, Branch, Branch]
}

export const NAJIA: Record<string, NajiaRule> = {
  乾: { stemInner: '甲', stemOuter: '壬', inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  坎: { stemInner: '戊', stemOuter: '戊', inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  艮: { stemInner: '丙', stemOuter: '丙', inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  震: { stemInner: '庚', stemOuter: '庚', inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  巽: { stemInner: '辛', stemOuter: '辛', inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  離: { stemInner: '己', stemOuter: '己', inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  坤: { stemInner: '乙', stemOuter: '癸', inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
  兌: { stemInner: '丁', stemOuter: '丁', inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
}

// 六獸起例：依日干起初爻，向上輪排
export const LIUSHOU_SEQ: LiuShou[] = ['青龍', '朱雀', '勾陳', '騰蛇', '白虎', '玄武']
export function liuShouStart(dayStem: Stem): number {
  switch (dayStem) {
    case '甲': case '乙': return 0 // 青龍
    case '丙': case '丁': return 1 // 朱雀
    case '戊': return 2 // 勾陳
    case '己': return 3 // 騰蛇
    case '庚': case '辛': return 4 // 白虎
    default: return 5 // 壬癸 玄武
  }
}
