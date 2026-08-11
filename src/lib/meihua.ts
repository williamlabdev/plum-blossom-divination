// 梅花易數 體用生剋分析
import type { Element, Trigram } from './data/core'
import { BRANCH_ELEMENT, relation } from './data/core'
import type { CastResult } from './casting'
import type { ChartTime } from './calendar'
import { wangShuaiOf, type WangShuai } from './najia'

export type MeihuaLevel = '大吉' | '偏吉' | '平' | '偏凶' | '大凶'

export interface MeihuaAnalysis {
  tiPos: '上卦' | '下卦'
  ti: Trigram // 體卦
  yong: Trigram // 用卦
  tiYongRelation: string // 用生體…
  tiYongLuck: number // -2..+2
  tiYongText: string
  tiWang: WangShuai
  huUpper: { rel: string; luck: number }
  huLower: { rel: string; luck: number }
  bianYong: Trigram // 變卦中用卦所變之卦
  bianRel: { rel: string; luck: number }
  level: MeihuaLevel
  summary: string
}

function relLuck(ti: Element, other: Element): { rel: string; luck: number } {
  const r = relation(other, ti) // 以對方為主詞看它對體的作用
  switch (r) {
    case '我生': return { rel: `${other}生${ti}（生體）`, luck: 2 }
    case '我剋': return { rel: `${other}剋${ti}（剋體）`, luck: -2 }
    case '生我': return { rel: `${ti}生${other}（體洩氣）`, luck: -1 }
    case '剋我': return { rel: `${ti}剋${other}（體剋之）`, luck: 1 }
    default: return { rel: `${ti}${other}比和`, luck: 1 }
  }
}

export function analyzeMeihua(cast: CastResult, ct: ChartTime): MeihuaAnalysis {
  const dongInLower = cast.dong <= 3
  const ti = dongInLower ? cast.ben.upper : cast.ben.lower
  const yong = dongInLower ? cast.ben.lower : cast.ben.upper
  const tiPos = dongInLower ? '上卦' : '下卦'

  const main = relLuck(ti.element, yong.element)
  const monthEl = BRANCH_ELEMENT[ct.month.branch]
  const tiWang = wangShuaiOf(ti.element, monthEl)

  const huU = relLuck(ti.element, cast.hu.upper.element)
  const huL = relLuck(ti.element, cast.hu.lower.element)
  const bianYong = dongInLower ? cast.bian.lower : cast.bian.upper
  const bianRel = relLuck(ti.element, bianYong.element)

  let tiYongText: string
  if (main.luck === 2) tiYongText = '用卦生體卦，如他人來助、外緣相扶'
  else if (main.luck === -2) tiYongText = '用卦剋體卦，外力相迫、事多阻逆'
  else if (main.luck === -1) tiYongText = '體卦生用卦，我方付出洩耗、勞而所得有限'
  else if (main.luck === 1 && main.rel.includes('剋')) tiYongText = '體卦剋用卦，事可掌控但須主動出力'
  else tiYongText = '體用比和，同氣相求、諸事和順'

  const wangText = tiWang === '旺' || tiWang === '相' ? '；體卦得令而旺，氣勢強、承受力足' : '；體卦失令而衰，根基較弱、宜守不宜攻'

  const score = main.luck * 2 + (tiWang === '旺' ? 2 : tiWang === '相' ? 1 : tiWang === '死' ? -2 : -1) + (huU.luck + huL.luck) * 0.5 + bianRel.luck * 1.5

  // 總斷以綜合分數為結論主軸，體用與旺衰作為論據，避免前後語氣矛盾
  const huLuck = huU.luck + huL.luck
  const processText = huLuck >= 2 ? '過程有助力' : huLuck <= -2 ? '過程多波折' : '過程平平'
  const endText = bianRel.luck >= 1 ? '結局向好' : bianRel.luck <= -1 ? '結局須防變數' : '結局平穩'

  let level: MeihuaLevel
  let verdictText: string
  if (score >= 4) {
    level = '大吉'
    verdictText = '整體大吉，可放手進行'
  } else if (score >= 1.5) {
    level = '偏吉'
    verdictText = '整體偏吉，終局可成'
  } else if (score >= -1.5) {
    level = '平'
    verdictText = '吉凶參半，成敗繫於自身努力與時機'
  } else if (score >= -4) {
    level = '偏凶'
    verdictText = '整體偏凶，宜守成緩圖，不宜強求'
  } else {
    level = '大凶'
    verdictText = '凶象明顯，所謀恐難如願，宜另作打算'
  }
  const summary = `${verdictText}。論據：${tiYongText}${wangText}；互卦示${processText}，變卦示${endText}。`

  return {
    level,
    tiPos, ti, yong,
    tiYongRelation: main.rel,
    tiYongLuck: main.luck,
    tiYongText,
    tiWang,
    huUpper: huU,
    huLower: huL,
    bianYong,
    bianRel,
    summary,
  }
}
