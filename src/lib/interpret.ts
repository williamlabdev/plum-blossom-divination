// 六爻斷卦引擎：依問題類型取用神，以生剋旺衰、旬空月破、動變回頭斷吉凶
import type { Branch, Element, LiuQin } from './data/core'
import { BRANCH_ELEMENT, chong, he, relation } from './data/core'
import type { ChartTime } from './calendar'
import type { LineInfo, NajiaChart } from './najia'

export interface QuestionType {
  key: string
  label: string
  yongShen: LiuQin | '世爻'
  note: string
}

export const QUESTION_TYPES: QuestionType[] = [
  { key: 'general', label: '綜合運勢', yongShen: '世爻', note: '以世爻為用神，看自身氣運' },
  { key: 'wealth', label: '財運求財', yongShen: '妻財', note: '妻財為用神，子孫為原神（財源）' },
  { key: 'career', label: '事業官運', yongShen: '官鬼', note: '官鬼為用神，妻財為原神' },
  { key: 'love-m', label: '感情（男問）', yongShen: '妻財', note: '男測感情以妻財為用神，看對方' },
  { key: 'love-f', label: '感情（女問）', yongShen: '官鬼', note: '女測感情以官鬼為用神，看對方' },
  { key: 'study', label: '學業考試', yongShen: '父母', note: '父母爻主文書成績，參看官鬼（名次）' },
  { key: 'health', label: '健康疾病', yongShen: '世爻', note: '自占病以世爻為用神，官鬼為病、子孫為醫藥' },
  { key: 'children', label: '子女晚輩', yongShen: '子孫', note: '子孫爻為用神' },
  { key: 'elders', label: '父母長輩', yongShen: '父母', note: '父母爻為用神' },
  { key: 'partner', label: '朋友合夥', yongShen: '兄弟', note: '兄弟爻為用神' },
  { key: 'lawsuit', label: '官司口舌', yongShen: '官鬼', note: '官鬼為用神，看官司對頭與官方態度' },
  { key: 'travel', label: '出行遠行', yongShen: '世爻', note: '世爻為用神，參看驛馬' },
]

export interface ReportSection {
  title: string
  text: string
}

export interface LiuyaoReport {
  yongShenDesc: string
  yongShenLine: LineInfo | null
  isFuShen: boolean
  score: number
  verdict: '大吉' | '偏吉' | '平' | '偏凶' | '大凶'
  sections: ReportSection[]
  yingQi: string
}

const posName = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

export function analyzeLiuyao(chart: NajiaChart, ct: ChartTime, qt: QuestionType): LiuyaoReport {
  const sections: ReportSection[] = []
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
      // 多現：先取持世，次取動爻，再取月日有氣者
      target = cands.find(l => l.shiYing === '世')
        ?? cands.find(l => l.isDong)
        ?? cands.find(l => l.wangShuai === '旺' || l.wangShuai === '相')
        ?? cands[0]
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
      yingQi: '難以推斷',
    }
  }

  const yEl: Element = isFuShen ? target.fuShen!.sb.element : target.sb.element
  const yBranch: Branch = isFuShen ? target.fuShen!.sb.branch : target.sb.branch
  const yKong = ct.xunKong.includes(yBranch) // 用神本身（伏神時以伏神地支論）是否旬空
  sections.push({ title: '用神', text: yongShenDesc + `。${qt.note}。` })

  // 2. 月建
  const mEl = BRANCH_ELEMENT[ct.month.branch]
  const mRel = relation(mEl, yEl)
  let mText: string
  if (yBranch === chong(ct.month.branch)) {
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
  if (yBranch === chong(ct.day.branch)) {
    if (score >= 0 && !yKong) {
      dText = `日辰${ct.day.branch}沖用神，用神旺而逢沖為「暗動」，事已暗中萌動`
      score += 0.5
    } else {
      dText = `日辰${ct.day.branch}沖用神，衰而逢沖為「日破」，事有崩解之虞`
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

  // 4. 旬空
  if (yKong) {
    sections.push({
      title: '旬空',
      text: `用神${yBranch}落於旬空（${ct.xunKong.join('')}空），眼下之事尚虛、未見實象，須待出空（${yBranch}值日或逢沖之日）方能落實。`,
    })
    score -= 1
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

  // 6. 動爻與變爻
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
    }
    sections.push({ title: '動爻變爻', text: parts.join('；') + '。' })
  }

  // 7. 世應
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

  // 8. 應期
  const heB = he(yBranch)
  const chongB = chong(yBranch)
  let yingQi: string
  if (yKong) {
    yingQi = `用神旬空，應期先看出空：${yBranch}日（值日填實）或${chongB}日（沖空則實）。`
  } else if (score >= 1) {
    yingQi = `用神有氣，應期可看${yBranch}日（用神值日）或${heB}日（逢合之期）；月份亦同此推。`
  } else {
    yingQi = `用神偏弱，應期待生扶：${SHENG_REV[yEl]}旺之日（生用神）或${yBranch}值日，急事看${chongB}日沖動。`
  }

  // 判語
  let verdict: LiuyaoReport['verdict']
  if (score >= 4) verdict = '大吉'
  else if (score >= 1.5) verdict = '偏吉'
  else if (score >= -1.5) verdict = '平'
  else if (score >= -4) verdict = '偏凶'
  else verdict = '大凶'

  return { yongShenDesc, yongShenLine: target, isFuShen, score, verdict, sections, yingQi }
}

// 生我者（用神之原神五行）
const SHENG_REV: Record<Element, Element> = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }
