// 古籍實例校準：把歷代六爻典籍的實占案例還原成本引擎的輸入，
// 比對引擎斷出的吉凶方向與古人斷語是否一致，用來量測與校準斷卦準確度。
//
// ── 訓練／測試分割（很重要，改動參數前務必先讀）──────────────────────────
// 案例分兩批，且**只有第一批被用來調過參數**：
//   第一批 index 0–52  ：《增刪卜易》45 則、《卜筮正宗》8 則。
//                        判語門檻（±0.3）、卦格權重等都是看著這批的命中率調出來的，
//                        因此這批的數字是「訓練集內」成績，必然偏樂觀。
//   第二批 index 53–100：《易隱》《易冒》《易林補遺》《卜筮全書》共 48 則。
//                        擴充時**刻意沒有據此調整任何參數**，所以這批是真正的保留
//                        測試集，它的數字才是誠實的泛化估計。
//
// 這個分割的價值在於：如果哪天有人為了衝高總命中率而去調參數，第二批就會失去
// 保留集的意義。**若要繼續調參，請只看第一批，並把第二批留著當最後的驗收。**
// 需要更多調參用資料時，正確做法是再採集新的一批當測試集，而不是動用現有的。
//
// 案例來源：殆知閣古代文獻藏書之原文電子本。第一批原文附逐爻排盤，動爻由「動」字
// 標記與本變卦爻象比對雙重驗證；第二批多數只記「得某卦之某卦」，動爻由本卦與變卦
// 爻象逐位比對（XOR）推得，全部經獨立重算複核，零誤差。天時類（占晴、占雨）一律
// 排除——其吉凶隨所求而異（求雨者盼雨、曬穀者盼晴），無單一用神可取。
import type { Branch, Stem } from './data/core'
import { BRANCHES, STEMS, trigramByLines } from './data/core'
import type { ChartTime } from './calendar'
import { castManual } from './casting'
import { ZHOUYI } from './data/zhouyi'
import { buildNajiaChart } from './najia'
import type { BingType, LiuyaoReport, QuestionType } from './interpret'
import { analyzeLiuyao, findQuestionType } from './interpret'
import CASES from './data/classic-cases.json'

export interface ClassicCase {
  source: string
  question: string
  benGua: string
  dongYao: number
  monthBranch: string
  dayGanZhi: string
  verdict: string // 古人斷語方向：吉／偏吉／平／偏凶／凶
  outcome: string
  originalText: string
}

/** 問題文字 → 本程式的問題類型 key。
 *  這一層是人工判讀（依古法用神取法），confident=false 者表示古法用神與本程式現有類別
 *  無法精確對應（例如「占奴僕」「占墳塋」），計分時可選擇排除。 */
export interface QuestionMapping {
  qtKey: string
  confident: boolean
  note?: string
  /** 占病案例：古法近病久病斷法相反。引擎的 bingType 是可加在任何用神類型上的修飾，
   *  介面上只開放「自占病」的近病／久病兩類，但校準時可套在占他人病的用神類型上，
   *  才能完整驗證占病法則（古籍病案多為占他人之病）。 */
  bingType?: BingType
}

export const QUESTION_MAP: Record<number, QuestionMapping> = {
  0: { qtKey: 'partner', confident: true, note: '占兄長，用神兄弟' },
  1: { qtKey: 'partner', confident: false, bingType: '近病', note: '占弟病臨危，當日即遇名醫救活，作近病論' },
  2: { qtKey: 'career', confident: true, note: '謁貴求見官長，用神官鬼' },
  3: { qtKey: 'love-m', confident: false, note: '占婚，原文未明言問卦者性別，暫依男問取妻財' },
  4: { qtKey: 'elders', confident: true },
  5: { qtKey: 'elders', confident: true },
  6: { qtKey: 'study', confident: true, note: '鄉試看父母文書' },
  7: { qtKey: 'career', confident: true },
  8: { qtKey: 'career', confident: true },
  9: { qtKey: 'health-new', confident: false, note: '自占病，原文未言病之新舊，因次日用針而愈，作近病論' },
  10: { qtKey: 'health-old', confident: true, note: '原文明言「久病逢沖莫治」' },
  11: { qtKey: 'elders', confident: true, bingType: '近病', note: '原文明言「近病逢空即愈」' },
  12: { qtKey: 'health-old', confident: false, note: '自占病，原文以「出空一定遭傷」斷之，屬久病逢空之凶象' },
  13: { qtKey: 'travel', confident: true },
  14: { qtKey: 'career', confident: true },
  15: { qtKey: 'love-f', confident: true, bingType: '近病', note: '妻占夫病，用神官鬼；次日大愈，作近病論' },
  16: { qtKey: 'career', confident: true },
  17: { qtKey: 'love-m', confident: true, bingType: '近病', note: '占妻病，用神妻財；次日不藥而愈，作近病論' },
  18: { qtKey: 'wealth', confident: true },
  19: { qtKey: 'health-new', confident: true, note: '自占身病，子孫持世不藥而愈，作近病論' },
  20: { qtKey: 'children', confident: true },
  21: { qtKey: 'wealth', confident: true },
  22: { qtKey: 'wealth', confident: true },
  23: { qtKey: 'wealth', confident: true },
  24: { qtKey: 'wealth', confident: true },
  25: { qtKey: 'dream', confident: true, note: '占夢徵兆，以世爻論應於己身之吉凶' },
  26: { qtKey: 'travel', confident: true, note: '避亂遷徙，以世爻論' },
  27: { qtKey: 'elders', confident: true },
  28: { qtKey: 'partner', confident: true },
  29: { qtKey: 'partner', confident: true },
  30: { qtKey: 'children', confident: true },
  31: { qtKey: 'study', confident: true },
  32: { qtKey: 'career', confident: true },
  33: { qtKey: 'career', confident: true },
  34: { qtKey: 'document', confident: false, note: '占上書：呈文屬文書用父母，然亦可用官鬼看上級態度，古法取捨有分歧' },
  35: { qtKey: 'career', confident: true, note: '保全功名，用神官鬼' },
  36: { qtKey: 'trade', confident: true, note: '囤貨候價，貨物屬妻財' },
  37: { qtKey: 'livestock', confident: true, note: '買馬發賣屬六畜，古法用子孫爻（原文正以「未土子孫臨月破」斷不宜買）' },
  38: { qtKey: 'wealth', confident: true, note: '博戲求財，用神妻財' },
  39: { qtKey: 'love-m', confident: false, note: '自占婚，原文未明言性別，暫依男問取妻財' },
  40: { qtKey: 'children', confident: true },
  41: { qtKey: 'subordinate', confident: true, note: '占僕人，古法奴僕屬子孫爻' },
  42: { qtKey: 'children', confident: true, bingType: '近病', note: '原文明言「近病即愈」' },
  43: { qtKey: 'elders', confident: true, bingType: '近病', note: '原文以「沖空即愈」斷之，屬近病逢空之吉象' },
  44: { qtKey: 'tomb', confident: true, note: '占父柩附葬祖塋，墳塋屬父母爻' },
  45: { qtKey: 'trade', confident: true, note: '賣貨，貨物屬妻財' },
  46: { qtKey: 'elders', confident: true },
  47: { qtKey: 'career', confident: true },
  48: { qtKey: 'partner', confident: false, bingType: '久病', note: '占嫂「復病」為舊疾復發，作久病論；古法占嫂用兄弟爻' },
  49: { qtKey: 'trade', confident: true, note: '脫貨求利，貨物屬妻財' },
  50: { qtKey: 'elders', confident: true, bingType: '近病', note: '原文標明「近病」，岳母歸父母爻' },
  51: { qtKey: 'house', confident: false, note: '占買宅，宅舍屬父母爻；然原文斷語針對次要事項（化寅木子孫受剋而損子），非主問之吉凶' },
  52: { qtKey: 'children', confident: true },

  // ── 第二批：《易隱》《易冒》《易林補遺》《卜筮全書》（2026-08-12 擴充）──────
  // 這批的動爻推導方式與第一批不同：第一批《增刪卜易》原文附逐爻排盤，
  // 這批多數只記「得某卦之某卦」，動爻由本卦與變卦的爻象逐位比對（XOR）推得。
  // 全部 90 則可驗證案例都經過獨立重算複核，與採集結果零誤差。
  // 已排除：占晴、憂雪等天時類（吉凶隨所求而異，無單一用神可取）。
  53: { qtKey: 'general', confident: true, note: '占壽數，以世爻論' },
  54: { qtKey: 'house', confident: true, note: '憂遭火災，父母爻主房屋' },
  55: { qtKey: 'partner', confident: false, note: '投托他人，古法看應爻；本程式無應爻類別，原文以兄爻論故暫取朋友合夥' },
  56: { qtKey: 'career', confident: true, note: '占為官安否' },
  57: { qtKey: 'children', confident: true, note: '父卜子回，用神子孫' },
  58: { qtKey: 'love-f', confident: true, note: '妻占夫歸；此則《易隱》與《易林補遺》互見，屬跨書互證' },
  59: { qtKey: 'wealth', confident: false, note: '凶斷而吉果（先受阻後得財），方向歸類有爭議' },
  60: { qtKey: 'wealth', confident: true },
  61: { qtKey: 'wealth', confident: true },
  62: { qtKey: 'elders', confident: true, bingType: '近病', note: '子占父病，果於申酉日痊愈' },
  63: { qtKey: 'children', confident: true, note: '父占子病；原文未言病之新舊，故不加占病修飾' },
  64: { qtKey: 'love-f', confident: true, bingType: '久病', note: '妻占夫病，至甲申日死' },
  65: { qtKey: 'lawsuit', confident: true, note: '與 #6 同一卦，然所問為訟、用神不同，屬另一資料點' },
  66: { qtKey: 'lost', confident: false, note: '占婢走失；古法奴僕用子孫，然原文明以財爻論，故取尋物失物（妻財）' },
  67: { qtKey: 'wealth', confident: true },
  68: { qtKey: 'career', confident: true },
  69: { qtKey: 'children', confident: false, note: '占臨產用子孫；原文重點在斷錯時辰而非吉凶' },
  70: { qtKey: 'wealth', confident: true, note: '標會得否' },
  71: { qtKey: 'children', confident: true, note: '卜子歸期' },
  72: { qtKey: 'love-m', confident: true, bingType: '久病', note: '卜妻病，後待丙子日而死' },
  73: { qtKey: 'house', confident: true },
  74: { qtKey: 'career', confident: true },
  75: { qtKey: 'love-m', confident: false, note: '占婚，原文未明言性別，暫依男問取妻財' },
  76: { qtKey: 'children', confident: true, note: '占孕是否喪胎' },
  77: { qtKey: 'children', confident: false, note: '占是否出痘屬有無題非吉凶題，卦驗中了但「應驗」不等於「吉」' },
  78: { qtKey: 'elders', confident: true, bingType: '久病', note: '占父病，化絕遂不救' },
  79: { qtKey: 'love-m', confident: true, bingType: '近病', note: '占妻病，及冬病愈' },
  80: { qtKey: 'children', confident: true, bingType: '久病', note: '占子病，甲寅日絕' },
  81: { qtKey: 'elders', confident: true, bingType: '久病', note: '占父病，至下歲孟春方絕' },
  82: { qtKey: 'health-new', confident: false, note: '自占病，原文未言新舊；是夕遂卒' },
  83: { qtKey: 'health-new', confident: false, note: '占身病「難愈而不死」；記載的應驗是病因而非病果' },
  84: { qtKey: 'health-new', confident: true, note: '占己病，卯月病愈' },
  85: { qtKey: 'elders', confident: true, bingType: '近病', note: '占父病，亥日即愈' },
  86: { qtKey: 'children', confident: true, bingType: '近病', note: '占女病，其女不死' },
  87: { qtKey: 'children', confident: false, note: '占痘屬有無題，非吉凶題' },
  88: { qtKey: 'wealth', confident: true, note: '占何時得會' },
  89: { qtKey: 'love-f', confident: true, note: '妻占夫歸期' },
  90: { qtKey: 'love-m', confident: true, bingType: '久病', note: '夫占妻病，癸亥日命盡' },
  91: { qtKey: 'career', confident: true, note: '問見官（謁見官長）' },
  92: { qtKey: 'house', confident: false, note: '代占入宅；宅長康泰而宅母染災，同卦兩極' },
  93: { qtKey: 'elders', confident: true, bingType: '久病', note: '子占父病，乙亥日父喪' },
  94: { qtKey: 'children', confident: true, bingType: '久病', note: '父占子病，丙午日死' },
  95: { qtKey: 'partner', confident: true, bingType: '近病', note: '占兄弟病，後果無事' },
  96: { qtKey: 'children', confident: true, bingType: '近病', note: '占子病，丙子日愈' },
  97: { qtKey: 'wealth', confident: true },
  98: { qtKey: 'general', confident: false, note: '卜年時兵災，非個人吉凶，本程式無對應類別' },
  99: { qtKey: 'livestock', confident: true, note: '因雞瘟占雞，古法六畜用子孫' },
  100: { qtKey: 'travel', confident: false, note: '卜倭避亂，以世爻論；結果為官兵之禍非倭禍' },
}

/** 由日干支推旬空：旬首地支 = (日支序 − 日干序 + 12) % 12，其後第 11、12 位即空亡兩支 */
export function xunKongOf(ganzhi: string): [Branch, Branch] {
  const stem = ganzhi[0] as Stem
  const branch = ganzhi[1] as Branch
  const si = STEMS.indexOf(stem)
  const bi = BRANCHES.indexOf(branch)
  if (si < 0 || bi < 0) throw new Error('不合法的日干支：' + ganzhi)
  const xunShou = (bi - si + 12) % 12
  return [BRANCHES[(xunShou + 10) % 12], BRANCHES[(xunShou + 11) % 12]]
}

const GUA_BY_NAME = new Map(ZHOUYI.map(g => [g.fullName, g]))

/** 把案例還原成 ChartTime。年、時柱古籍多未載，以不影響斷卦的預設值填入（本引擎只用月、日、旬空） */
export function caseToChartTime(c: ClassicCase): ChartTime {
  return {
    date: new Date(2026, 0, 1),
    solarText: '', lunarText: '', weekday: '',
    year: { stem: '甲', branch: '子' },
    month: { stem: '甲', branch: c.monthBranch as Branch },
    day: { stem: c.dayGanZhi[0] as Stem, branch: c.dayGanZhi[1] as Branch },
    hour: { stem: '甲', branch: '子' },
    xunKong: xunKongOf(c.dayGanZhi),
    meihuaYearNum: 1, meihuaMonthNum: 1, meihuaDayNum: 1, meihuaHourNum: 1,
  }
}

/** 吉凶方向：+1 吉、0 平、−1 凶。校準以「方向是否一致」為主要指標，
 *  因為五級細分帶有主觀成分，方向才是斷卦真正要回答的問題。 */
export function direction(verdict: string): number {
  if (verdict === '吉' || verdict === '大吉' || verdict === '偏吉') return 1
  if (verdict === '凶' || verdict === '大凶' || verdict === '偏凶') return -1
  return 0
}

export interface CaseResult {
  index: number
  c: ClassicCase
  mapping: QuestionMapping
  report: LiuyaoReport
  expected: number
  actual: number
  hit: boolean
}

export function runCase(c: ClassicCase, index: number): CaseResult {
  const gua = GUA_BY_NAME.get(c.benGua)
  if (!gua) throw new Error('卦名查無：' + c.benGua)
  const lower = trigramByLines.get(gua.lines.slice(0, 3).join(''))!
  const upper = trigramByLines.get(gua.lines.slice(3, 6).join(''))!
  const ct = caseToChartTime(c)
  const cast = castManual(upper.xiantian, lower.xiantian, c.dongYao)
  const chart = buildNajiaChart(cast.ben, cast.dong, ct)
  const mapping = QUESTION_MAP[index]
  const base = findQuestionType(mapping.qtKey)
  if (!base) throw new Error('問題類型查無：' + mapping.qtKey)
  // 占病修飾：把 bingType 疊加到該用神類型上（介面未開放此組合，但古籍病案多屬占他人病）
  const qt: QuestionType = mapping.bingType ? { ...base, bingType: mapping.bingType } : base
  // 校準一律以預設的「問吉凶」跑：古籍案例記的都是古人斷的吉凶方向，沒有「只問時機」的案例。
  // 若哪天有人把 intent 傳進來，寧可在這裡炸掉，也不要讓無判語的報告被 direction() 默默算成 0（平）
  // 而虛報成命中——校準的數字是這個專案唯一的判準，不能有靜默降級的路徑。
  const report = analyzeLiuyao(chart, ct, qt)
  if (report.verdict === null) throw new Error(`校準只跑問吉凶，不應出現無判語的報告：#${index}`)
  const expected = direction(c.verdict)
  const actual = direction(report.verdict)
  return { index, c, mapping, report, expected, actual, hit: expected === actual }
}

export const CLASSIC_CASES = CASES as ClassicCase[]

export function runAllCases(): CaseResult[] {
  return CLASSIC_CASES.map((c, i) => runCase(c, i))
}

/** 第一批（訓練集）與第二批（保留測試集）的分界索引 */
export const HOLDOUT_START = 53

/** 命中率與「全部猜吉」基準的對照。基準＝資料集中古人斷吉的比例，
 *  引擎必須明顯勝過它才算有價值——只報命中率而不報基準是會誤導人的。 */
export function summarise(rs: CaseResult[]) {
  const n = rs.length
  const hitRate = n ? rs.filter(r => r.hit).length / n : 0
  const alwaysJi = n ? rs.filter(r => r.expected === 1).length / n : 0
  return { n, hitRate, alwaysJi, lead: hitRate - alwaysJi }
}
