// 六爻斷卦引擎：依問題類型取用神，以生剋旺衰、旬空月破、動變回頭、原忌仇神、合沖斷吉凶
import type { Branch, Element, LiuQin, LiuShou } from './data/core'
import {
  BRANCH_ELEMENT, JUE_BRANCH, MU_BRANCH, SANHE_GROUPS,
  chong, chouShenOf, he, jiShenOf, jinTuiShen, relation, yuanShenOf,
} from './data/core'
import type { ChartTime } from './calendar'
import type { LineInfo, NajiaChart } from './najia'
import { wangShuaiOf } from './najia'

/** 占病的新舊之別。古法以百日為界，斷法完全相反：
 *  「近病逢空即愈，久病逢空即死；近病逢沖即愈，久病逢沖即死」——
 *  逢空逢沖對近病是病去之吉象，對久病卻是元氣潰散之凶象。 */
export type BingType = '近病' | '久病'

export type QuestionGroup = '自身' | '財務' | '功名' | '人際' | '居家'

export interface QuestionType {
  key: string
  label: string
  yongShen: LiuQin | '世爻'
  note: string
  group: QuestionGroup
  /** 設定後啟用占病專用法則（逢空逢沖反向、官鬼為病神、子孫為醫藥） */
  bingType?: BingType
}

/** 六親取用依古法《卜筮正宗・用神章》：
 *  父母爻──父母師長、家宅田產、文書契約、車船衣物、墳塋
 *  兄弟爻──兄弟姊妹、同輩朋友、同門合夥
 *  子孫爻──子女晚輩、醫生藥物、僧道、六畜、奴僕、解憂之神
 *  妻財爻──妻妾、財物貨品、倉庫糧食
 *  官鬼爻──官職功名、丈夫、盜賊、憂疑病症、官司對頭 */
export const QUESTION_TYPES: QuestionType[] = [
  // 自身
  { key: 'general', label: '綜合運勢', yongShen: '世爻', group: '自身', note: '以世爻為用神，看自身氣運' },
  {
    key: 'health-new', label: '疾病（近病）', yongShen: '世爻', group: '自身', bingType: '近病',
    note: '自占病以世爻為用神，官鬼為病、子孫為醫藥；近病者百日以內，逢空逢沖反主病去',
  },
  {
    key: 'health-old', label: '疾病（久病）', yongShen: '世爻', group: '自身', bingType: '久病',
    note: '自占病以世爻為用神，官鬼為病、子孫為醫藥；久病者纏綿百日以上，逢空逢沖主元氣潰散',
  },
  { key: 'travel', label: '出行遠行', yongShen: '世爻', group: '自身', note: '世爻為用神，參看驛馬' },
  { key: 'dream', label: '解夢徵兆', yongShen: '世爻', group: '自身', note: '以世爻為用神，看徵兆應於己身之吉凶' },

  // 財務
  { key: 'wealth', label: '財運求財', yongShen: '妻財', group: '財務', note: '妻財為用神，子孫為原神（財源）' },
  { key: 'trade', label: '買賣交易', yongShen: '妻財', group: '財務', note: '貨物錢財皆屬妻財；世為我、應為對方，兩相生合則交易可成' },
  { key: 'lost', label: '尋物失物', yongShen: '妻財', group: '財務', note: '財物以妻財為用神；用神不空不破則物在可尋' },
  { key: 'livestock', label: '六畜寵物', yongShen: '子孫', group: '財務', note: '古法六畜屬子孫爻，買賣牲口、豢養寵物皆以子孫為用神' },

  // 功名
  { key: 'career', label: '事業官運', yongShen: '官鬼', group: '功名', note: '官鬼為用神，妻財為原神' },
  { key: 'study', label: '學業考試', yongShen: '父母', group: '功名', note: '父母爻主文書成績，參看官鬼（名次）' },
  { key: 'document', label: '文書契約', yongShen: '父母', group: '功名', note: '文書、契約、證照、申請呈報皆以父母爻為用神' },
  { key: 'lawsuit', label: '官司口舌', yongShen: '官鬼', group: '功名', note: '官鬼為用神，看官司對頭與官方態度' },

  // 人際
  { key: 'love-m', label: '感情（男問）', yongShen: '妻財', group: '人際', note: '男測感情以妻財為用神，看對方' },
  { key: 'love-f', label: '感情（女問）', yongShen: '官鬼', group: '人際', note: '女測感情以官鬼為用神，看對方' },
  { key: 'children', label: '子女晚輩', yongShen: '子孫', group: '人際', note: '子孫爻為用神' },
  { key: 'elders', label: '父母長輩', yongShen: '父母', group: '人際', note: '父母爻為用神' },
  { key: 'partner', label: '朋友合夥', yongShen: '兄弟', group: '人際', note: '兄弟爻為用神' },
  { key: 'subordinate', label: '部屬員工', yongShen: '子孫', group: '人際', note: '古法奴僕屬子孫爻，部屬、員工、受僱之人皆以子孫為用神' },

  // 居家
  { key: 'house', label: '家宅房產', yongShen: '父母', group: '居家', note: '古法宅舍田產屬父母爻，買屋、租屋、搬遷、修造皆以父母為用神' },
  { key: 'tomb', label: '墳塋風水', yongShen: '父母', group: '居家', note: '古法墳塋屬父母爻；用神安靜有氣為吉，動而受剋則不安' },
]

export const QUESTION_GROUPS: QuestionGroup[] = ['自身', '財務', '功名', '人際', '居家']

/** 舊版紀錄的問題類型 key 對應到現行 key（健康疾病已拆為近病／久病兩類） */
export const LEGACY_QT_KEYS: Record<string, string> = { health: 'health-new' }

export function findQuestionType(key: string): QuestionType | undefined {
  return QUESTION_TYPES.find(q => q.key === key)
    ?? QUESTION_TYPES.find(q => q.key === LEGACY_QT_KEYS[key])
}

export interface ReportSection {
  title: string
  text: string
  /** true 表示此段只描述事情的性質樣貌、完全不影響吉凶計分。
   *  介面據此與決定吉凶的段落做視覺區分，免得讀者以為每段份量相同。 */
  descriptive?: boolean
}

/** 主導條件：古法中有若干格局是「一條定生死」的，不與其他因素加總比大小。
 *  例如野鶴斷近病逢空，直接就說「許次日退災」，並不去衡量月建剋不剋用神。
 *  引擎若把這類條件當成眾多加分項之一，會被次要因素的加總淹沒而判出相反方向。 */
export interface DecisiveCondition {
  name: string
  /** +1 定吉、−1 定凶 */
  direction: 1 | -1
  /** 古籍依據與觸發理由 */
  reason: string
}

export interface LiuyaoReport {
  yongShenDesc: string
  yongShenLine: LineInfo | null
  isFuShen: boolean
  score: number
  verdict: '大吉' | '偏吉' | '平' | '偏凶' | '大凶'
  sections: ReportSection[]
  yingQi: string
  /** 本卦觸發的主導條件（可能為空）。正反同時觸發時互相抵銷，回歸一般加總。 */
  decisive: DecisiveCondition[]
}

/** 主導條件的鉗制幅度。只定方向、不定強度——
 *  古人說「近病逢空即愈」是斷吉凶方向，不是斷「大吉」，故鉗到偏吉／偏凶即可，
 *  真正的強度仍交由各項生剋加總決定。 */
const DECISIVE_CLAMP = 1.2

const posName = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

const LIUSHOU_FLAVOR: Record<LiuShou, string> = {
  青龍: '喜氣臨門、順遂如意，多有貴人相助',
  朱雀: '文書、口舌、消息之事，動則主爭辯是非',
  勾陳: '遲滯遷延、田土牽連，事情進展緩慢',
  騰蛇: '虛驚多變、心緒不寧，事多反覆難料',
  白虎: '剛烈突發、傷損之象，宜防意外',
  玄武: '暗昧不明、隱瞞盜失，慎防背後之事',
}

// 爻位取象：六爻由下而上所居之位，依序象徵事情所涉及的身分、階段與部位
const LINE_POSITION_IMAGERY: string[] = [
  '初爻居事之始，如足如根，主幼輩、基層或事情剛起步',
  '二爻近家宅根基，如腿如股，主家人骨肉或切身自顧之事',
  '三爻居內外轉折，如腰如腹，主同輩手足或事情生變之機',
  '四爻近上而通外，如胸如背，主朋友外緣或事將近身',
  '五爻居尊貴之位，如頭如面，主上司尊長或事業要津',
  '上爻處事之極，如頂如首，主年高之人或事情終局',
]

/** 用神多現時的取捨。這一段刻意不用「取旺相、取不破」的直覺排序，因為兩部典籍都指名
 *  推翻了它：
 *
 *  《增刪卜易・兩現章第三十二》：「用神兩現，如占父母卦中兩爻父母者是也。舍其休囚，用其
 *  旺相；舍其靜爻，而用動爻；舍其月破，而用不破；舍其旬空，用其不空；舍其被傷，用其不傷。
 *  **此古法也。得其驗者，應乎旬空月破——舍其不空，而用旬空；舍其不破，而用月破。**」
 *
 *  《卜筮正宗・第十七問「用神多現，何以取之」》：「予屢驗者，舍其閒爻而用持世，舍其無權
 *  而用月日，舍其不破而用月破，舍其不空而用旬空。**天機盡洩於有病之間，斷法總在醫藥之處。**」
 *
 *  兩書排序一致：持世 → 臨月建日建 → 月破 → 旬空。動爻與旺相只是這四項都不成立時的墊底，
 *  因為它們正是野鶴所謂「此古法也」而不取的那一套。 */
function pickYongShen(cands: LineInfo[], ct: ChartTime): LineInfo {
  const linYueRi = (l: LineInfo) => l.sb.branch === ct.month.branch || l.sb.branch === ct.day.branch
  return cands.find(l => l.shiYing === '世')
    ?? cands.find(l => l.isYuePo)
    ?? cands.find(l => l.isXunKong)
    ?? cands.find(linYueRi)
    ?? cands.find(l => l.isDong)
    ?? cands.find(l => l.wangShuai === '旺' || l.wangShuai === '相')
    ?? cands[0]
}

/** 元神／忌神的「有力／無力」判定，依《增刪卜易・元神忌神衰旺章第十》。
 *
 *  古法不是把元神加幾分、忌神扣幾分再相加，而是先判定這一爻**有力還是無力**：
 *  「元神能生用神者有五：元神旺相或臨日月或日月動爻生扶者一也…元神長生帝旺於日辰三也…」
 *  「元神雖現又有不能生用神者有六：元神休囚不動…休囚又逢自空、月破二也…元神衰而又絕四也，
 *   元神入三墓五也…以上元神無力生用神，無用之元神也，**雖有如無**。」
 *  「忌神雖動不能剋用神者有七：忌神休囚不動…**忌神靜臨空破二也**…忌神入三墓三也，
 *   忌神衰而又絕五也…此忌神者乃無力之忌神也，**諸占化凶為吉**。」
 *
 *  兩處不對稱是古法原文就有的，不是筆誤：
 *  - 元神無力只是「雖有如無」（中性），忌神無力卻是「諸占化凶為吉」。
 *  - 元神須「休囚**又**逢自空月破」才算無力；忌神只要「靜臨空破」即無力。
 *
 *  【改寫理由的誠實紀錄】起初我以為舊版（元神旺 +1、忌神旺 −0.8）兩邊近乎對稱、
 *  會抵銷成常數偏移而不具鑑別力——依據是第一批 53 則的消融測試 Δ=0.0。
 *  **這個判斷是錯的**：窮舉掃描（32,256 組）顯示舊版本來就在 6.33% 的組合裡翻轉吉凶方向，
 *  新版是 6.32%，兩者鑑別力相同。53 則語料的 Δ=0 是取樣不足，不是結構缺陷。
 *  這一版之所以仍然保留，只剩一個理由：它實作了舊版根本沒有的古法判準
 *  （長生帝旺於日辰、入三墓、衰而又絕、忌神靜臨空破），而非因為它比較準——
 *  第一批命中率兩版都是 75.5%，逐案 HIT／MISS 完全相同。**不要把這段當成準確度的改進。**
 *
 *  【必須知道的代價】它讓保留測試集退了 1 則：60.4% → 58.3%（全部 68.3% → 67.3%）。
 *  翻轉的是 #69「午建己巳日占臨產，得姤之鼎」——古人斷吉，本版斷凶。這正是「忌神持世」
 *  被移除時的同一個訊號，別假裝沒看到。#69 是問「何時產」，落在 backlog #1（問吉凶／
 *  問時機的介面區分）要處理的那一類，所以尚無法判定是雜訊還是這版真的較差。
 *  處置見 CLAUDE.md「元神／忌神的有力無力」一節：先做 backlog #1，再回頭看 #69。
 *
 *  未實作：「元神與忌神同動」→ 元神有力、忌神無力（接續相生）。本引擎為單動爻模型，
 *  兩爻同動結構上不可達，與反吟伏吟同屬單爻動模型的先天限制。 */
function yuanShenStrength(l: LineInfo, ct: ChartTime): '有力' | '無力' {
  const wang = l.wangShuai === '旺' || l.wangShuai === '相'
  if (l.changSheng === '墓') return '無力' // 元神入三墓
  if (!wang && l.changSheng === '絕') return '無力' // 元神衰而又絕
  if (!wang && (l.isXunKong || l.isYuePo)) return '無力' // 元神休囚又逢自空、月破
  if (wang) return '有力' // 元神旺相
  if (l.sb.branch === ct.month.branch || l.sb.branch === ct.day.branch) return '有力' // 臨日月
  if (l.changSheng === '長生' || l.changSheng === '帝旺') return '有力' // 長生帝旺於日辰
  return '無力' // 元神休囚不動
}

function jiShenStrength(l: LineInfo, ct: ChartTime): '有力' | '無力' {
  const wang = l.wangShuai === '旺' || l.wangShuai === '相'
  if (l.isXunKong || l.isYuePo) return '無力' // 忌神靜臨空破（不待休囚，與元神不同）
  if (l.changSheng === '墓') return '無力' // 忌神入三墓
  if (!wang && l.changSheng === '絕') return '無力' // 忌神衰而又絕
  if (wang) return '有力' // 忌神旺相
  if (l.sb.branch === ct.month.branch || l.sb.branch === ct.day.branch) return '有力' // 臨日月
  if (l.changSheng === '長生' || l.changSheng === '帝旺') return '有力' // 長生帝旺於日辰
  return '無力' // 忌神休囚不動
}

/** 原神／忌神／仇神的選取。刻意**不**沿用 pickYongShen 的古法排序——兩部典籍講的都是
 *  「用神兩現」，對原神忌神並無此說；實測把 pickYongShen 套用於此對第一批命中率毫無影響
 *  （75.5% 不變），既無依據也無效益，故維持原本的動爻優先。 */
function pickByLiuqin(chart: NajiaChart, lq: LiuQin): LineInfo | undefined {
  const cands = chart.lines.filter(l => l.liuqin === lq)
  if (cands.length === 0) return undefined
  return cands.find(l => l.isDong) ?? cands.find(l => l.wangShuai === '旺' || l.wangShuai === '相') ?? cands[0]
}

export function analyzeLiuyao(chart: NajiaChart, ct: ChartTime, qt: QuestionType): LiuyaoReport {
  const sections: ReportSection[] = []
  const decisive: DecisiveCondition[] = []
  let score = 0

  // 1. 找用神
  let target: LineInfo | null = null
  let isFuShen = false
  if (qt.yongShen === '世爻') {
    target = chart.lines[chart.shiPos - 1]
  } else {
    const cands = chart.lines.filter(l => l.liuqin === qt.yongShen)
    if (cands.length === 1) target = cands[0]
    else if (cands.length > 1) {
      target = pickYongShen(cands, ct)
    } else {
      // 用神不上卦 → 取伏神
      const fuLine = chart.lines.find(l => l.fuShen?.liuqin === qt.yongShen)
      if (fuLine) {
        target = fuLine
        isFuShen = true
      }
    }
  }

  const yongShenDesc = qt.yongShen === '世爻'
    ? `以世爻（${posName[chart.shiPos - 1]}${chart.lines[chart.shiPos - 1].sb.branch}${chart.lines[chart.shiPos - 1].sb.element}）為用神`
    : isFuShen && target
      ? `用神${qt.yongShen}不上卦，取${posName[target.pos - 1]}下所伏之${target.fuShen!.sb.branch}${target.fuShen!.sb.element}${qt.yongShen}為用神`
      : target
        ? `以${posName[target.pos - 1]}${target.sb.branch}${target.sb.element}${qt.yongShen}為用神`
        : `用神${qt.yongShen}不上卦且首卦無伏神可取`

  if (!target) {
    return {
      yongShenDesc, yongShenLine: null, isFuShen, score: -2, verdict: '偏凶',
      sections: [{ title: '用神', text: yongShenDesc + '，事難有著落，所問之事恐無明確頭緒。' }],
      yingQi: '難以推斷', decisive: [],
    }
  }

  // 1b. 卦格：六沖主離散、六合主和合，是全卦最宏觀的一層判斷。
  //     但沖合的吉凶隨所問之事而反轉——古云「六沖卦：占病近病則愈、久病則死；占訟則散；
  //     占求財求名則不成；占行人則歸；占婚姻則不合」。散對想成之事是凶，對想脫之事反是吉，
  //     故此處先依問題性質定出沖合的正負向，再論本卦與變卦。
  if (chart.benXing || chart.bianXing) {
    let chongVal: number // 六沖對此問題的分數方向
    let heVal: number // 六合對此問題的分數方向
    let chongWhy: string
    let heWhy: string
    // 權重刻意壓在「背景級」：卦格是全卦氛圍，而月建日辰生剋是直接證據，
    // 背景不該重過直接證據。53 則案例校準顯示權重超過此值反而拉低命中率。
    if (qt.bingType === '近病') {
      chongVal = 0.9; heVal = -0.9
      chongWhy = '沖散病氣，近病遇之其病當退'
      heWhy = '病與身相合而纏綿，近病遇之反難速去'
    } else if (qt.bingType === '久病') {
      chongVal = -1.2; heVal = -0.3
      chongWhy = '久病之身再受沖激，元氣潰散，古云「久病逢沖莫治」'
      heWhy = '久病遇合，病氣膠著難解，纏綿不去'
    } else if (qt.key === 'lawsuit') {
      chongVal = 0.6; heVal = -0.6
      chongWhy = '訟事逢沖則散，糾纏可解'
      heWhy = '訟事逢合則膠著難散，牽連日久'
    } else if (qt.key === 'travel') {
      chongVal = 0.6; heVal = -0.3
      chongWhy = '沖則主動，出行之事逢之，行程得以啟動'
      heWhy = '合則主靜，行程易生牽絆滯留'
    } else {
      chongVal = -0.9; heVal = 0.9
      chongWhy = '所問之事貴在聚合，逢沖則離散無常，謀事難成'
      heWhy = '所問之事貴在聚合，逢合則人事湊泊、其事易成'
    }

    const gParts: string[] = []
    if (chart.benXing === '六沖') {
      gParts.push(`本卦為六沖卦（六爻內外全沖），${chongWhy}`)
      score += chongVal
    } else if (chart.benXing === '六合') {
      gParts.push(`本卦為六合卦（六爻內外全合），${heWhy}`)
      score += heVal
    }
    // 變卦主後續走向，力道約為本卦之六成
    if (chart.bianXing === '六沖') {
      gParts.push(chart.benXing === '六合'
        ? '而變卦轉為六沖，先合後散，初看順遂終難維持'
        : `變卦亦為六沖，後續之勢仍主離散`)
      score += chongVal * 0.6
    } else if (chart.bianXing === '六合') {
      gParts.push(chart.benXing === '六沖'
        ? '而變卦轉為六合，先散後聚，起初無頭緒、後來反能湊泊'
        : `變卦亦為六合，後續之勢仍主和合`)
      score += heVal * 0.6
    }
    if (gParts.length) sections.push({ title: '卦格', text: gParts.join('；') + '。' })
  }

  const yEl: Element = isFuShen ? target.fuShen!.sb.element : target.sb.element
  const yBranch: Branch = isFuShen ? target.fuShen!.sb.branch : target.sb.branch
  const yKong = ct.xunKong.includes(yBranch) // 用神本身（伏神時以伏神地支論）是否旬空
  sections.push({ title: '用神', text: yongShenDesc + `。${qt.note}。` })

  // 2. 月建
  const mEl = BRANCH_ELEMENT[ct.month.branch]
  const mRel = relation(mEl, yEl)
  // 用神以月令論旺衰（伏神為用神時，以伏神本身五行論，不可用飛神的 wangShuai）
  const yWang = wangShuaiOf(yEl, mEl)
  const yYouQi = yWang === '旺' || yWang === '相' // 月令有氣：旺相為有氣，休囚死為無氣
  const yRiChong = yBranch === chong(ct.day.branch) // 用神是否被日辰所沖
  const yYuePo = yBranch === chong(ct.month.branch) // 用神是否月破
  let mText: string
  if (yYuePo) {
    mText = `用神${yBranch}${yEl}逢月建${ct.month.branch}沖，是為「月破」，大受挫傷`
    score -= 3
  } else if (mRel === '我生') {
    mText = `月建${ct.month.branch}${mEl}生用神，得月令生扶，氣勢有根`
    score += 2
  } else if (mRel === '比和') {
    mText = `用神與月建${ct.month.branch}${mEl}比和，當令而旺`
    score += 2.5
  } else if (mRel === '我剋') {
    mText = `月建${ct.month.branch}${mEl}剋用神，月令受制，先天不足`
    score -= 2
  } else if (mRel === '剋我') {
    mText = `用神剋月建，耗力而氣散`
    score -= 0.5
  } else {
    mText = `用神生月建，洩氣而力減`
    score -= 1
  }

  // 3. 日辰
  const dEl = BRANCH_ELEMENT[ct.day.branch]
  const dRel = relation(dEl, yEl)
  let dText: string
  const isBing = !!qt.bingType
  if (yRiChong && isBing) {
    // 占病逢沖不論暗動日破，改由下方「占病」段落依近病久病反向斷之
    dText = `日辰${ct.day.branch}沖用神，占病逢沖另有專斷（詳見占病一段）`
  } else if (yRiChong) {
    // 旺相之爻逢沖為「暗動」、休囚無氣之爻逢沖為「日破」；旬空逢沖則為「沖空」另論。
    // 但已判月破者不可再論暗動——同一爻不能既「大受挫傷」又「當令有氣」，
    // 破而又沖是雪上加霜，非暗中萌動之吉象。
    if (yYuePo) {
      dText = `日辰${ct.day.branch}復沖用神，月破之爻再逢日沖，破而又沖、傷上加傷，非暗動之象`
      score -= 1
    } else if (yYouQi && !yKong) {
      dText = `日辰${ct.day.branch}沖用神，用神當令有氣（${yWang}）而逢沖，是為「暗動」，事已暗中萌動`
      score += 0.5
    } else if (yKong) {
      dText = `日辰${ct.day.branch}沖用神而用神正落旬空，是為「沖空」，虛而受激，事浮動未實`
      score -= 0.5
    } else {
      dText = `日辰${ct.day.branch}沖用神，用神休囚無氣（${yWang}）而逢沖，是為「日破」，事有崩解之虞`
      score -= 2
    }
  } else if (dRel === '我生') {
    dText = `日辰${ct.day.branch}${dEl}生用神，近助有力`
    score += 1.5
  } else if (dRel === '比和') {
    dText = `日辰${ct.day.branch}${dEl}扶用神，得日辰之助`
    score += 1.5
  } else if (dRel === '我剋') {
    dText = `日辰${ct.day.branch}${dEl}剋用神，眼前多受制肘`
    score -= 1.5
  } else if (dRel === '剋我') {
    dText = `用神剋日辰，費力周旋`
    score -= 0.5
  } else {
    dText = `用神生日辰，有所付出`
    score -= 0.5
  }
  sections.push({ title: '月建日辰', text: `${mText}；${dText}。` })

  // 4. 旬空：古法分真空與假空——旺不為空、動不為空、有生扶不為空
  //    「有生扶」須通盤看：日辰生扶、月建生扶、他爻發動來生皆算，不可只看日辰
  //    唯休囚無氣、又不發動、又全無生扶者，方為「真空」，事乃真正落空
  if (yKong && !isBing) {
    const dayFu = !yRiChong && (dRel === '我生' || dRel === '比和') // 日辰生扶
    const monthFu = mRel === '我生' || mRel === '比和' // 月建生扶
    const dongFu = chart.lines.some(l => // 他爻發動來生用神（原神動）
      l.isDong && l.pos !== target.pos && relation(l.sb.element, yEl) === '我生')
    const kongDong = target.isDong && !isFuShen
    const chuKong = `出空之期在${yBranch}日（值日填實）或${chong(yBranch)}日（沖空則實）`
    let kText: string
    if (kongDong) {
      kText = `用神${yBranch}雖落旬空（${ct.xunKong.join('')}空），然「動不為空」，發動之爻空而有用，事仍在進行，${chuKong}。`
      score -= 0.3
    } else if (yYouQi) {
      kText = `用神${yBranch}雖落旬空（${ct.xunKong.join('')}空），然月令${yWang}而「旺不為空」，此為假空，只是時候未到，${chuKong}。`
      score -= 0.3
    } else if (dayFu || monthFu || dongFu) {
      const fuYuan = dayFu ? `日辰${ct.day.branch}` : monthFu ? `月建${ct.month.branch}` : '動爻'
      kText = `用神${yBranch}落旬空（${ct.xunKong.join('')}空），幸得${fuYuan}生扶，「有生扶不為空」，非真落空，事只是遲而未顯，${chuKong}。`
      score -= 0.6
    } else {
      kText = `用神${yBranch}落旬空（${ct.xunKong.join('')}空），且月令${yWang}無氣、又不發動、亦無日月動爻生扶，是為「真空」，所問之事恐終成畫餅，${chuKong}。`
      score -= 2
    }
    sections.push({ title: '旬空', text: kText })
  }

  // 4a. 占病專斷：古法「近病逢空即愈，久病逢空即死；近病逢沖即愈，久病逢沖即死」
  //     逢空逢沖對近病是病氣消散之吉象，對久病卻是元氣潰散之凶象，與一般占法完全相反。
  //     另以官鬼為病神（旺動則病重）、子孫為醫藥解神（旺則有藥可解）。
  if (isBing) {
    const jin = qt.bingType === '近病'
    const bParts: string[] = []
    const bianKong = target.isDong && !isFuShen && target.bian
      && ct.xunKong.includes(target.bian.sb.branch)

    if (yKong) {
      bParts.push(jin
        ? `用神${yBranch}落旬空，「近病逢空即愈」，病氣隨空而散，待出空之日（${yBranch}日或${chong(yBranch)}日）即見痊可`
        : `用神${yBranch}落旬空，「久病逢空即死」，纏綿之疾而用神落空，是元氣已虛、根本動搖之象，出空之日反須格外提防`)
      score += jin ? 2 : -2.5
      decisive.push({
        name: jin ? '近病逢空' : '久病逢空',
        direction: jin ? 1 : -1,
        reason: jin
          ? '《增刪卜易》斷近病逢空，逕許退災之期，不再權衡月建生剋——病氣既隨空而散，其餘皆為次要'
          : '《增刪卜易》「久病逢空即死」，纏綿之疾而用神落空，縱使用神當令亦不足恃',
      })
    } else if (bianKong) {
      bParts.push(jin
        ? `用神發動化出${target.bian!.sb.branch}而落旬空，病勢化空而去，「近病逢空即愈」，待${chong(target.bian!.sb.branch)}日沖空即可痊癒`
        : `用神發動化出${target.bian!.sb.branch}而落旬空，久病而化空，病去無憑、元氣無所依歸，非吉象`)
      score += jin ? 1.5 : -2
      // 野鶴斷澤地萃上爻未土化戌、戌值旬空之例，原話即「戌值旬空，近病逢空即愈，許次日退災」——
      // 他把「逢空即愈」直接用在化空上，與用神自身落空同論，故此處亦列為主導條件。
      decisive.push({
        name: jin ? '近病化空' : '久病化空',
        direction: jin ? 1 : -1,
        reason: jin
          ? '《增刪卜易》斷用神化空之近病，逕以「近病逢空即愈」許退災之期，不再權衡月建生剋'
          : '久病而化空，病去無憑、元氣無所依歸，古法不作吉論',
      })
    }

    if (yRiChong) {
      bParts.push(jin
        ? `用神逢日辰${ct.day.branch}沖，「近病逢沖即愈」，沖散病氣，其病當退`
        : `用神逢日辰${ct.day.branch}沖，「久病逢沖莫治」，久病之身再受沖激，元氣潰散，凶多吉少`)
      score += jin ? 2 : -2.5
      decisive.push({
        name: jin ? '近病逢沖' : '久病逢沖',
        direction: jin ? 1 : -1,
        reason: jin
          ? '古法「近病逢沖即愈」，沖散病氣即為病去之象'
          : '古法「久病逢沖莫治」，久病之身再受沖激則元氣潰散，此時用神縱旺亦不作吉論',
      })
    }

    // 世爻六親：僅自占病（用神即世爻）時論之——世爻代表病者本身，官鬼持世為病纏其身，
    // 父母持世主憂疑藥不對症。占他人之病時世爻代表問卦者而非病人，此法不適用。
    if (qt.yongShen === '世爻') {
      const shiLine = chart.lines[chart.shiPos - 1]
      if (shiLine.liuqin === '官鬼') {
        bParts.push('官鬼持世，病神纏繞己身，牽連難脫，占病最忌此象')
        score -= 2
      } else if (shiLine.liuqin === '父母') {
        bParts.push('父母持世，主憂疑勞頓、藥不對症，古云「父爻持世，妙藥難醫」')
        score -= 1.5
      }
    }

    // 官鬼為病神（用神本身即官鬼者除外，如妻占夫病，此時官鬼是人不是病）
    if (qt.yongShen !== '官鬼') {
      const guiLine = pickByLiuqin(chart, '官鬼')
      // 自占病而官鬼持世時，人與病本是同一爻——上方「官鬼持世」已就此爻計分。
      // 注意 pickByLiuqin 優先取動爻／旺相而非世爻，卦中若另有官鬼會被選中，
      // 於是同一個「病」被拆到兩爻各算一次，故改以用神自身六親判斷。
      const guiIsTarget = !!guiLine && (guiLine.pos === target.pos || target.liuqin === '官鬼')
      if (guiIsTarget) {
        bParts.push('病神官鬼即是用神本身，人與病同居一爻，吉凶已併於上文論之，不另計')
      } else if (!guiLine) {
        bParts.push('卦中官鬼不上卦，病無形象可尋，其病輕淺易解')
        score += 1
      } else if (guiLine.isXunKong) {
        bParts.push(`病神官鬼（${posName[guiLine.pos - 1]}${guiLine.sb.branch}）落旬空，病氣自散，症候輕減`)
        score += 1
      } else if (guiLine.isDong || guiLine.wangShuai === '旺' || guiLine.wangShuai === '相') {
        bParts.push(`病神官鬼（${posName[guiLine.pos - 1]}${guiLine.sb.branch}${guiLine.sb.element}）${guiLine.isDong ? '發動' : '得令'}，病勢正盛，未可輕忽`)
        score -= guiLine.isDong ? 1.5 : 1
      } else {
        bParts.push(`病神官鬼（${posName[guiLine.pos - 1]}${guiLine.sb.branch}）休囚無力，病勢不烈`)
        score += 0.5
      }
    }

    // 子孫為醫藥解神（用神本身即子孫者除外，如占子病）
    if (qt.yongShen !== '子孫') {
      const ziLine = pickByLiuqin(chart, '子孫')
      // 同理：自占病而子孫持世時，醫藥與用神同爻，避免同一爻重複結算
      const ziIsTarget = !!ziLine && (ziLine.pos === target.pos || target.liuqin === '子孫')
      if (ziIsTarget) {
        bParts.push('子孫持世而子孫即用神本身，解神與己身同居一爻，本主不藥而癒之象')
        score += 1
      } else if (!ziLine) {
        bParts.push('子孫不上卦，醫藥無門，難遇良醫')
        score -= 1
      } else if (ziLine.shiYing === '世') {
        bParts.push(`子孫持世，醫藥得力、解神當令，多有不藥而癒或遇良醫之象`)
        score += 2
      } else if (ziLine.isXunKong) {
        bParts.push(`子孫（醫藥）落旬空，藥石一時罔效，須待出空方得對症`)
        score -= 1
      } else if (ziLine.isDong || ziLine.wangShuai === '旺' || ziLine.wangShuai === '相') {
        bParts.push(`子孫（${posName[ziLine.pos - 1]}${ziLine.sb.branch}${ziLine.sb.element}）${ziLine.isDong ? '發動' : '有氣'}，醫藥有效，可望得治`)
        score += ziLine.isDong ? 1.5 : 1
      } else {
        bParts.push(`子孫（醫藥）休囚無力，用藥效驗有限`)
        score -= 0.5
      }
    }

    sections.push({ title: '占病', text: `此為${qt.bingType}之占。` + bParts.join('；') + '。' })
  }

  // 4b. 入墓：辰戌丑未為四墓庫，用神入墓主事情被困、藏而不顯
  {
    const muB = MU_BRANCH[yEl]
    const muParts: string[] = []
    // 墓庫本身落旬空則庫門洞開，不能收物，是為「空墓不受」，此時不作入墓論
    const muKong = ct.xunKong.includes(muB)
    const ruRiMu = ct.day.branch === muB
    const huaMu = !!(target.isDong && !isFuShen && target.bian && target.bian.sb.branch === muB)
    if (muKong && (ruRiMu || huaMu)) {
      // 空墓不受：墓庫落空則庫門洞開，收不住物，入日墓與動而化墓皆不成立，故完全不計分
      muParts.push(`用神雖遇${muB}墓地，然${yEl}之墓庫${muB}正落旬空，庫虛而門不閉，是為「空墓不受」，不作入墓論，反主開通而無拘束`)
    } else if (ruRiMu) {
      muParts.push(yYouQi
        ? `用神${yBranch}${yEl}入日墓（日辰${ct.day.branch}為${yEl}之墓庫），幸而月令${yWang}有氣，墓中猶存生機，待${chong(muB)}日沖開墓庫，事乃能出`
        : `用神${yBranch}${yEl}入日墓（日辰${ct.day.branch}為${yEl}之墓庫），且月令${yWang}無氣，深陷墓中難出，事被困而不顯，人事多有壓抑閉塞之象`)
      score -= yYouQi ? 0.8 : 2
    }
    if (huaMu && !muKong) {
      muParts.push(`用神發動反化出${target.bian!.sb.branch}墓庫，是為「動而化墓」，自投墓地，愈動愈受困，主事情做了反而把自己困住`)
      score -= 2
    }
    if (muParts.length) sections.push({ title: '入墓', text: muParts.join('；') + '。' })
  }

  // 5. 伏神藏而不現
  if (isFuShen) {
    const fly = target.sb // 飛神
    const fRel = relation(fly.element, target.fuShen!.sb.element)
    if (fRel === '我生') {
      sections.push({ title: '伏神', text: `伏神得飛神${fly.branch}${fly.element}相生，伏而有氣，待引拔而出（${target.fuShen!.sb.branch}值日之期）事可現。` })
      score += 0.5
    } else if (fRel === '我剋') {
      sections.push({ title: '伏神', text: `伏神受飛神${fly.branch}${fly.element}壓制，事情隱而難出，恐有心無力。` })
      score -= 1.5
    } else {
      sections.push({ title: '伏神', text: `用神伏藏不現，事尚在檯面之下，短期難見分曉。` })
      score -= 0.5
    }
  }

  // 6. 原神／忌神／仇神（六親固定生剋循環：父母生兄弟生子孫生妻財生官鬼生父母）
  // 用神為伏神時關係較複雜，暫不展開此段，避免誤導
  if (!isFuShen) {
    const qLiuqin: LiuQin = qt.yongShen === '世爻' ? target.liuqin : qt.yongShen
    const yuanCat = yuanShenOf(qLiuqin)
    const jiCat = jiShenOf(qLiuqin)
    const chouCat = chouShenOf(qLiuqin)
    const yuanLine = pickByLiuqin(chart, yuanCat)
    const jiLine = pickByLiuqin(chart, jiCat)
    const chouLine = pickByLiuqin(chart, chouCat)

    // 職責分離（避免重複計分）：
    //   本段只論原神／忌神的「存在與強弱」——是否上卦、是否當令、是否落空。
    //   若該爻正是動爻，其「發動對用神的生剋作用」一律交由下方「動爻變爻」段獨佔計分，
    //   本段僅作敘述、不計分。否則同一個爻會在兩段各扣（加）一次，合計可達 3.5 分。
    //   （本引擎為單動爻模型，故原神／忌神／仇神至多只有一個會是動爻。）
    // 「亦要用神有氣。倘若用神無根，謂之元神有力亦難生；忌神無力何足喜」——
    // 元神有力與忌神無力這兩個**正向**判定，都要被用神本身有無氣所閘住，故無氣時折半。
    // 野鶴那則自占病的例子正是如此：元神酉金動、忌神未土反生元神，接續相生看似化凶為吉，
    // 但用神亥水月破又被日剋、無根，終究「如樹無根，寒谷不回春」，果卒於癸卯日。
    const genFactor = yYouQi ? 1 : 0.5
    const yuanYouLi = !!yuanLine && !yuanLine.isDong && yuanShenStrength(yuanLine, ct) === '有力'
    const parts: string[] = []
    if (yuanLine) {
      const yuanDesc = `原神${yuanCat}（${posName[yuanLine.pos - 1]}${yuanLine.sb.branch}${yuanLine.sb.element}）`
      if (yuanLine.isDong) {
        parts.push(`${yuanDesc}正是本卦動爻，發動來生用神，源頭活水（其力道詳見「動爻變爻」一段）`)
      } else if (yuanYouLi) {
        parts.push(`${yuanDesc}有力，生扶得實`)
      } else {
        // 「無用之元神也，雖有如無」——古法只說它幫不上忙，並未因此斷凶，故不單獨扣分。
        parts.push(`${yuanDesc}無力，古法謂之「無用之元神，雖有如無」，指望不上`)
      }
    } else {
      parts.push(`原神${yuanCat}不上卦，用神助力無根，稍嫌單薄`)
      score -= 0.5
    }

    const jiYouLi = !!jiLine && !jiLine.isDong && jiShenStrength(jiLine, ct) === '有力'
    if (jiLine) {
      const jiDesc = `忌神${jiCat}（${posName[jiLine.pos - 1]}${jiLine.sb.branch}${jiLine.sb.element}）`
      if (jiLine.isDong) {
        parts.push(`${jiDesc}正是本卦動爻，發動剋用神，事有阻力（其力道詳見「動爻變爻」一段）`)
      } else if (jiYouLi) {
        parts.push(`${jiDesc}有力，古法謂之「如斧戟之忌神」，暗中牽制用神`)
      } else {
        parts.push(`${jiDesc}無力，古法謂之「無力之忌神，諸占化凶為吉」，難以妨事`)
      }
      // 仇神生忌神是「忌神的後援」，與動爻對用神的直接生剋是不同層次的作用，不構成重複計分
      if ((jiLine.isDong || jiYouLi) && chouLine && chouLine.pos !== jiLine.pos
        && (chouLine.isDong || chouLine.wangShuai === '旺' || chouLine.wangShuai === '相')) {
        parts.push(`且仇神${chouCat}${chouLine.isDong ? '發動' : '得令'}生忌神，其勢更盛，尤須謹慎`)
        score -= 0.8
      }
    }
    // 元忌的計分只論**相對強弱**，不對兩者各自加減。理由有二：
    //   一、古法問的是「元神忌神孰強」——元神有力而忌神無力則事成，反之則敗。
    //   二、靜而休囚的忌神本來就不為害，那是常態而非吉兆，單獨給它加分等於把
    //       「沒有壞事」再算一次好事。
    // 這不是紙上推論：先做過「元神有力 +1.2／忌神有力 −1.5／忌神無力 +0.8」的獨立
    // 加減版，第一批掉到 71.7%、判平從 0 竄到 3 則（分數被推向 0）；改為相對比較後
    // 才回到 75.5%。那一版之所以壞，正是因為獎勵了「忌神休囚」這個常態。
    // 動爻不參與此處計分——其生剋力道由「動爻變爻」段獨佔，避免重複計分。
    if (yuanYouLi && !jiYouLi) {
      parts.push('元神有力而忌神無力，生扶勝過牽制，事有依托')
      score += 1.2 * genFactor
    } else if (jiYouLi && !yuanYouLi) {
      parts.push('忌神有力而元神無力，牽制勝過生扶，事多阻滯')
      score -= 1.2
    }
    // 【已試過並移除】忌神持世
    // 古法有「兄弟持世，求財不利」之說，野鶴斷終身財福也逕以「兄爻持世，永無發福之秋」
    // 定案，看似是一條有力的規則，我曾據此加入計分（−1.5）甚至列為主導條件。
    // 但校準結果否定了它：列為主導條件時觸發 13 次只命中 7 次（約當亂猜）；
    // 即使只當一般計分項，也讓保留測試集從 60.4% 退到 58.3%。
    // 它之所以在訓練集上看起來有效，是因為我本來就是看著訓練集裡兩則「占終身財福」
    // 的案例把它加進來的——典型的過擬合。故完全移除，不留計分。
    // 教訓：古籍上有明文的規則，不代表它在實占中具有決定性；仍須以保留集驗證。
    sections.push({ title: '原神忌神', text: parts.join('；') + '。' })
  }

  // 7. 六合三合：日辰合用神、動爻合絆用神、卦中三合局
  let heBan = false // 用神自身發動又與日辰相合，變化受牽制
  if (!isFuShen) {
    const heParts: string[] = []
    if (he(yBranch) === ct.day.branch) {
      if (target.isDong) {
        heBan = true
        heParts.push(`用神${yBranch}與日辰${ct.day.branch}相合，動而逢合為「合絆」，變化受牽制、事情暫時卡住，須待${chong(yBranch)}日沖開方能成事`)
        score -= 1
      } else {
        heParts.push(`用神${yBranch}與日辰${ct.day.branch}相合，靜而逢合為「合起」，暗中得力，後續看好`)
        score += 1
      }
    }
    const otherDong = chart.lines.filter(l => l.isDong && l !== target)
    for (const od of otherDong) {
      if (he(od.sb.branch) === yBranch) {
        heParts.push(`${posName[od.pos - 1]}${od.liuqin}${od.sb.branch}發動來合用神，事受牽絆羈絆，進度易生拖延`)
        score -= 0.5
      }
    }
    // 三合局：卦六爻中至少兩爻同屬一組，第三支可由日辰或月建補齊
    // 若同時有多組結構完整，優先論與用神本身相關的一組，其次才依組別預設順序取
    const formedGroups = SANHE_GROUPS.filter(group => {
      const inGua = group.branches.filter(b => chart.lines.some(l => l.sb.branch === b))
      const present = group.branches.filter(b => inGua.includes(b) || b === ct.day.branch || b === ct.month.branch)
      return present.length === 3 && inGua.length >= 2
    })
    const sanHeGroup = formedGroups.find(g => g.branches.includes(yBranch)) ?? formedGroups[0]
    if (sanHeGroup) {
      // rel 以「局氣（me）對用神（other）」的方向解讀：'我剋'＝局氣剋用神（用神受害）、'剋我'＝用神剋局氣（用神費力但無大礙）
      const rel = relation(sanHeGroup.element, yEl)
      const involved = sanHeGroup.branches.includes(yBranch)
      if (involved) {
        if (rel === '我生' || rel === '比和') {
          heParts.push(`卦中會成${sanHeGroup.element}局，用神身處局中，得局氣相助，力量倍增`)
          score += 2
        } else if (rel === '我剋') {
          heParts.push(`卦中會成${sanHeGroup.element}局，用神身陷局中反受其剋，須防局勢不利`)
          score -= 2
        } else {
          heParts.push(`卦中會成${sanHeGroup.element}局，用神身處局中但自身洩氣於局，力量分散`)
          score -= 0.5
        }
      } else if (rel === '我生') {
        heParts.push(`卦中會成${sanHeGroup.element}局，局氣生用神，外緣相助`)
        score += 1
      } else if (rel === '我剋') {
        heParts.push(`卦中會成${sanHeGroup.element}局，局氣剋用神，外部壓力不小`)
        score -= 1
      } else if (rel === '剋我') {
        heParts.push(`卦中會成${sanHeGroup.element}局，用神力剋局氣，雖可制之但費力周旋`)
        score -= 0.3
      } else if (rel === '生我') {
        heParts.push(`卦中會成${sanHeGroup.element}局，用神生局氣，稍有耗損`)
        score -= 0.3
      }
    }
    if (heParts.length) sections.push({ title: '合處逢沖', text: heParts.join('；') + '。' })
  }

  // 8. 動爻與變爻
  const dongLine = chart.lines.find(l => l.isDong)
  if (dongLine) {
    const dongEl = dongLine.sb.element
    const parts: string[] = []
    if (dongLine === target && !isFuShen) {
      parts.push(`用神自己發動，事在變動之中，主動求變`)
      const bEl = dongLine.bian!.sb.element
      const bRel = relation(bEl, dongEl)
      if (bRel === '我生') {
        parts.push(`變爻${dongLine.bian!.sb.branch}${bEl}回頭生用神，愈變愈好，先動先贏`)
        score += 2.5
      } else if (bRel === '我剋') {
        parts.push(`變爻${dongLine.bian!.sb.branch}${bEl}回頭剋用神，動則生悔，變化反招損`)
        score -= 2.5
      } else if (chong(dongLine.sb.branch) === dongLine.bian!.sb.branch) {
        parts.push(`變爻沖動爻，反覆不定`)
        score -= 1
      } else {
        parts.push(`變爻${dongLine.bian!.sb.branch}${bEl}與用神無大礙，變動平順`)
        score += 0.5
      }
      // 進神／退神：化出同五行而地支順進為進神、逆退為退神
      const jt = jinTuiShen(dongLine.sb.branch, dongLine.bian!.sb.branch)
      if (jt === '進神') {
        parts.push(`且${dongLine.sb.branch}化${dongLine.bian!.sb.branch}為「進神」，同氣而遞進，事情層層向前推展，愈往後愈盛`)
        score += 1.5
      } else if (jt === '退神') {
        parts.push(`且${dongLine.sb.branch}化${dongLine.bian!.sb.branch}為「退神」，同氣而倒退，事情不進反退、有始無終，縱一時有成亦難久守`)
        score -= 1.5
      }
      // 化絕：動爻化出自身五行之絕地，主動而無功
      if (dongLine.bian!.sb.branch === JUE_BRANCH[dongEl]) {
        parts.push(`又化出${dongLine.bian!.sb.branch}為${dongEl}之絕地，是為「化絕」，動而無功、氣盡力竭`)
        score -= 1.5
      }
      // 化空：動爻化出之爻落旬空，主變化落不到實處
      if (ct.xunKong.includes(dongLine.bian!.sb.branch)) {
        parts.push(`且變爻${dongLine.bian!.sb.branch}落旬空，變化尚落不到實處，須待出空`)
        score -= 0.5
      }
    } else if (dongLine === target && isFuShen) {
      // 用神為伏神、而動的是它上面那個飛神爻。伏神本身並未發動——
      // 飛伏之間的生剋已由「伏神」段計分，此處不可再算一次（否則同一關係扣兩次），
      // 只論「飛神發動則伏神易出」這個獨立的作用。
      parts.push(`動的是覆蓋用神的飛神${dongLine.sb.branch}${dongEl}（${dongLine.liuqin}），伏神本身並未發動`)
      parts.push(`飛神既動，覆蓋鬆脫，伏神較易引拔而出，事有浮上檯面之機（飛伏生剋詳見「伏神」一段）`)
      score += 0.5
      const bEl = dongLine.bian!.sb.element
      const bRel = relation(bEl, dongEl)
      if (bRel === '我剋') {
        parts.push(`且飛神化出${dongLine.bian!.sb.branch}${bEl}回頭剋之，飛神自顧不暇，對伏神的壓制隨之鬆動`)
        score += 0.5
      }
    } else {
      const rel2 = relation(dongEl, yEl)
      const dongDesc = `${posName[dongLine.pos - 1]}${dongLine.liuqin}${dongLine.sb.branch}${dongEl}發動`
      if (rel2 === '我生') {
        parts.push(`${dongDesc}，動而生用神，如貴人臨門、事得推力`)
        score += 2
      } else if (rel2 === '我剋') {
        parts.push(`${dongDesc}，動而剋用神，阻力現於途中，防小人與變數`)
        score -= 2
      } else if (rel2 === '比和') {
        parts.push(`${dongDesc}，與用神比和，同類相扶`)
        score += 1
      } else if (rel2 === '剋我') {
        parts.push(`${dongDesc}，用神剋動爻，尚可駕馭，唯多費心力`)
        score -= 0.5
      } else {
        parts.push(`${dongDesc}，用神生動爻，氣洩於外，恐為他人作嫁`)
        score -= 1
      }
      // 變爻回頭對動爻的影響（間接）
      const bEl = dongLine.bian!.sb.element
      const bRel = relation(bEl, dongEl)
      if (bRel === '我剋') parts.push(`且動爻受變爻回頭剋，其力後繼無穩`)
      else if (bRel === '我生') parts.push(`且動爻得變爻回頭生，其勢愈往後愈強`)
      // 他爻動的進退神：影響該動爻本身的力道，再間接及於用神
      const jt2 = jinTuiShen(dongLine.sb.branch, dongLine.bian!.sb.branch)
      if (jt2 === '進神') {
        parts.push(`該動爻${dongLine.sb.branch}化${dongLine.bian!.sb.branch}為「進神」，其力遞增`)
        // 進神加強動爻本身，對用神的作用隨之放大（生用神則更吉、剋用神則更凶）
        if (rel2 === '我生' || rel2 === '比和') score += 0.5
        else if (rel2 === '我剋') score -= 0.8
      } else if (jt2 === '退神') {
        parts.push(`該動爻${dongLine.sb.branch}化${dongLine.bian!.sb.branch}為「退神」，其力遞減`)
        if (rel2 === '我剋') score += 0.8 // 忌神退神，反為用神解圍
        else if (rel2 === '我生' || rel2 === '比和') score -= 0.5
      }
    }
    sections.push({ title: '動爻變爻', text: parts.join('；') + '。' })
  }

  // 9. 六獸取象（描述性質，不計分）
  if (!isFuShen) {
    const flavorParts = [`用神臨${target.liushou}，主${LIUSHOU_FLAVOR[target.liushou]}`]
    if (dongLine && dongLine !== target) {
      flavorParts.push(
        dongLine.liushou === target.liushou
          ? `動爻同臨${dongLine.liushou}，性質加重`
          : `動爻臨${dongLine.liushou}，另主${LIUSHOU_FLAVOR[dongLine.liushou]}`,
      )
    }
    sections.push({ title: '六獸取象', text: flavorParts.join('；') + '。', descriptive: true })
  }

  // 9b. 爻位取象（描述性質，不計分）
  {
    const posParts = [`用神居${posName[target.pos - 1]}，${LINE_POSITION_IMAGERY[target.pos - 1]}`]
    if (dongLine && dongLine.pos !== target.pos) {
      posParts.push(`動爻居${posName[dongLine.pos - 1]}，${LINE_POSITION_IMAGERY[dongLine.pos - 1]}`)
    }
    sections.push({ title: '爻位取象', text: posParts.join('；') + '。', descriptive: true })
  }

  // 10. 世應
  if (qt.yongShen !== '世爻') {
    const shi = chart.lines[chart.shiPos - 1]
    const sRel = relation(yEl, shi.sb.element)
    let sText: string
    if (target.shiYing === '世' && isFuShen) {
      sText = '用神伏於世爻之下，事與己身關係密切，唯尚未浮上檯面，待引出方顯。'
      score += 0.5
    } else if (target.shiYing === '世') {
      sText = '用神持世，事在自己掌中，與我關係緊密，謀之有據。'
      score += 1
    } else if (sRel === '我生') {
      sText = `用神生世爻，事物有向我而來之象，利於求謀。`
      score += 1.5
    } else if (sRel === '我剋') {
      sText = `用神剋世爻，事來逼身，壓力不小，防勞而傷己。`
      score -= 1
    } else if (sRel === '剋我') {
      sText = `世爻剋用神，我可制事，唯須主動出擊、強求而得。`
      score += 0.5
    } else if (sRel === '生我') {
      sText = `世爻生用神，我方付出多、投入深，防有去無回。`
      score -= 0.5
    } else {
      sText = '用神與世爻比和，彼我同心，事可商量。'
      score += 0.5
    }
    sections.push({ title: '世應關係', text: sText })
  }

  // 10b. 神煞：盤面已列出神煞，此處只論落在用神之上者，免得滿盤皆是反失重點。
  //      神煞為輔，不主吉凶大局，故計分從輕。
  {
    const ss = chart.shenSha
    const shenShaParts: string[] = []
    if (ss.guiRen.includes(yBranch)) {
      shenShaParts.push('用神臨天乙貴人，遇難得助、逢凶化吉，多有貴人從旁提攜')
      score += 1
    }
    if (yBranch === ss.tianXi) {
      shenShaParts.push('用神臨天喜，主喜慶之事臨門')
      score += 0.5
    }
    if (yBranch === ss.ganLu) {
      shenShaParts.push('用神臨干祿，主俸祿財位之氣，利於求職求財')
      score += 0.5
    }
    if (yBranch === ss.yiMa) {
      shenShaParts.push(qt.key === 'travel'
        ? '用神臨驛馬，正合出行之問，主動身有期、行程可成'
        : '用神臨驛馬，主奔波走動、事有遷變，靜守之事逢此則不安於位')
      score += qt.key === 'travel' ? 1 : 0
    }
    if (yBranch === ss.taoHua) {
      const isLove = qt.key === 'love-m' || qt.key === 'love-f'
      shenShaParts.push(isLove
        ? '用神臨桃花，正合情緣之問，主情意相牽、人緣有動'
        : '用神臨桃花，主人緣情色之事牽動，所問之事恐涉私情')
      score += isLove ? 1 : 0
    }
    if (yBranch === ss.yangRen) {
      shenShaParts.push('用神臨羊刃，性剛而事烈，防刀傷血光與衝動壞事')
      score -= 0.8
    }
    if (yBranch === ss.jieSha) {
      shenShaParts.push('用神臨劫煞，主劫奪損耗、突發阻礙，財物尤須看守')
      score -= 0.8
    }
    if (yBranch === ss.wangWang && (qt.key === 'travel' || qt.key === 'career')) {
      shenShaParts.push('用神臨往亡，不利出行與興舉大事，宜避其鋒')
      score -= 0.5
    }
    if (ss.guaShen && yBranch === ss.guaShen) {
      shenShaParts.push('用神與卦身同支，所問之事正應其身，事體分明、與己切近')
      score += 0.5
    }
    if (shenShaParts.length) sections.push({ title: '神煞', text: shenShaParts.join('；') + '。' })
  }

  // 分數取到小數一位後才做門檻比對。
  // 分數由 0.2／0.3／0.5／0.8／1.5／2.5 這類十進位小數累加而成，二進位下都不精確，
  // 累加十幾項後會產生 1e-15 級誤差（實測出現過 -3.999999999999999），
  // 使臨界卦的判語由浮點噪音決定且無法重現。四捨五入到 0.1 消除此問題。
  let finalScore = Math.round(score * 10) / 10

  // ── 主導條件鉗制 ────────────────────────────────────────────────
  // 古人斷卦並非把所有因素加總比大小：遇到「一條定生死」的格局時，逕以該條定調。
  // 引擎若一律加總，這類條件會被次要因素淹沒——實測《增刪卜易》近病逢空的兩則案例，
  // 野鶴斷吉並許退災之期，引擎卻因月建剋用神、忌神當令等項累計成大凶。
  // 故此處只鉗制「方向」，不動強度：若主導條件全部指吉，分數至少推到偏吉；
  // 全部指凶則至少推到偏凶；正反同時觸發時視為互相抵銷，仍回歸一般加總。
  const upward = decisive.filter(d => d.direction > 0)
  const downward = decisive.filter(d => d.direction < 0)
  if (upward.length && !downward.length) {
    finalScore = Math.max(finalScore, DECISIVE_CLAMP)
  } else if (downward.length && !upward.length) {
    finalScore = Math.min(finalScore, -DECISIVE_CLAMP)
  }
  if (decisive.length) {
    const conflict = upward.length > 0 && downward.length > 0
    sections.push({
      title: '主導條件',
      text: conflict
        ? `本卦同時觸發指向相反的主導條件（${decisive.map(d => d.name).join('、')}），彼此抵銷，仍依各項生剋通盤權衡：`
          + decisive.map(d => `${d.name}——${d.reason}`).join('；') + '。'
        : `${decisive.map(d => d.name).join('、')}——古法於此有專斷，逕定吉凶方向而不與其他生剋比較輕重。`
          + decisive.map(d => d.reason).join('；') + '。',
    })
  }

  // 11. 應期
  // 強弱門檻與下方判語門檻共用同一個界線，否則會出現「判偏吉、應期卻說用神偏弱」的矛盾。
  const heB = he(yBranch)
  const chongB = chong(yBranch)
  const JI_THRESHOLD = 0.3 // 偏吉起點，亦即「用神有氣」的界線
  let yingQi: string
  if (heBan) {
    yingQi = `用神動而合絆，應期看${chongB}日（沖開合絆，事乃有成）；月份亦同此推。`
  } else if (yKong) {
    yingQi = `用神旬空，應期先看出空：${yBranch}日（值日填實）或${chongB}日（沖空則實）。`
  } else if (finalScore >= JI_THRESHOLD) {
    yingQi = `用神有氣，應期可看${yBranch}日（用神值日）或${heB}日（逢合之期）；月份亦同此推。`
  } else {
    yingQi = `用神偏弱，應期待生扶：${SHENG_REV[yEl]}旺之日（生用神）或${yBranch}值日，急事看${chongB}日沖動。`
  }

  // 判語
  // 分級門檻經《增刪卜易》《卜筮正宗》53 則實占案例校準（見 calibration.ts）：
  // 原本「平」帶寬達 ±1.5，導致 53 則中有 14 則被判為平，而古籍實占僅 1 則作平論——
  // 卦本為決疑而起，模稜兩可的判語沒有意義。
  // 平帶保留 ±0.3，僅供生剋確實勢均力敵者使用。
  let verdict: LiuyaoReport['verdict']
  if (finalScore >= 4) verdict = '大吉'
  else if (finalScore >= JI_THRESHOLD) verdict = '偏吉'
  else if (finalScore > -JI_THRESHOLD) verdict = '平'
  else if (finalScore > -4) verdict = '偏凶'
  else verdict = '大凶'

  return { yongShenDesc, yongShenLine: target, isFuShen, score: finalScore, verdict, sections, yingQi, decisive }
}

// 生我者（用神之原神五行）
const SHENG_REV: Record<Element, Element> = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }
