// 曆法模組：包裝 lunar-typescript，輸出占卦所需的干支與農曆資訊
import { Solar } from 'lunar-typescript'
import type { Branch, Stem } from './data/core'
import { branchIndex } from './data/core'

export interface GanZhi {
  stem: Stem
  branch: Branch
}

export interface ChartTime {
  date: Date
  solarText: string // 公元 2026年8月11日 20:50
  lunarText: string // 農曆六月廿九日戌時
  weekday: string
  // 四柱（年以立春換年、月以節氣換月，供六爻旺衰神煞用）
  year: GanZhi
  month: GanZhi
  day: GanZhi
  hour: GanZhi
  xunKong: [Branch, Branch] // 日柱旬空
  // 梅花起卦用數（年支序以農曆正月初一換年）
  meihuaYearNum: number // 子1……亥12
  meihuaMonthNum: number // 農曆月（閏月同本月）
  meihuaDayNum: number // 農曆日
  meihuaHourNum: number // 時辰地支序 子1……亥12
}

function parseGZ(gz: string): GanZhi {
  return { stem: gz[0] as Stem, branch: gz[1] as Branch }
}

export function getChartTime(date: Date): ChartTime {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  const year = parseGZ(lunar.getYearInGanZhiExact()) // 以立春精確時刻換年，與月柱一致
  const month = parseGZ(lunar.getMonthInGanZhiExact())
  const day = parseGZ(lunar.getDayInGanZhiExact()) // 晚子時（23:00 後）日柱算次日
  const hour = parseGZ(lunar.getTimeInGanZhi())
  const kong = lunar.getDayXunKongExact()

  // 梅花起卦：年支以農曆年（正月初一換年）
  const meihuaYearBranch = lunar.getYearZhi() as Branch

  return {
    date,
    solarText: `公元${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    lunarText: `農曆${lunar.getMonthInChinese().replace('闰', '閏')}月${lunar.getDayInChinese()}日${lunar.getTimeZhi()}時`,
    weekday: '星期' + solar.getWeekInChinese(),
    year,
    month,
    day,
    hour,
    xunKong: [kong[0] as Branch, kong[1] as Branch],
    meihuaYearNum: branchIndex(meihuaYearBranch) + 1,
    meihuaMonthNum: Math.abs(lunar.getMonth()),
    meihuaDayNum: lunar.getDay(),
    meihuaHourNum: branchIndex(lunar.getTimeZhi() as Branch) + 1,
  }
}

