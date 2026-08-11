import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import './styles.css'
import { GLOSSARY } from './lib/glossary'
import { getChartTime, type ChartTime } from './lib/calendar'
import { castByNumbers, castByTime, castManual, drawRandom, randomInt, type CastResult, type Hexagram } from './lib/casting'
import { buildNajiaChart, type NajiaChart } from './lib/najia'
import { analyzeLiuyao, QUESTION_TYPES, type LiuyaoReport, type QuestionType } from './lib/interpret'
import { analyzeMeihua, type MeihuaAnalysis } from './lib/meihua'
import { TRIGRAMS } from './lib/data/core'

// ── 型別 ──────────────────────────────────────
interface CastInput {
  dateLocal: string // 起卦當地牆鐘時間 YYYY-MM-DDTHH:mm（不存 UTC，跨時區開啟舊紀錄才能重現同一盤）
  method: 'time' | 'number' | 'random' | 'manual'
  numbers?: number[]
  includeHour?: boolean
  manual?: { upper: number; lower: number; dong: number }
  qtKey: string
  question: string
}

function fmtLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseLocal(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s)
  if (!m) return new Date(NaN)
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
}

interface HistoryItem extends CastInput {
  savedAt: string
  guaName: string
  verdict: string
}

interface Reading {
  input: CastInput
  ct: ChartTime
  cast: CastResult
  chart: NajiaChart
  report: LiuyaoReport
  meihua: MeihuaAnalysis
  qt: QuestionType
}

const HISTORY_KEY = 'plum-blossom-history-v1'

const VERDICT_LINE: Record<string, string> = {
  大吉: '用神有力而得助，所謀之事大有可為。',
  偏吉: '整體向好，把握時機、順勢而行可成。',
  平: '吉凶參半，成敗繫於自身努力與應對。',
  偏凶: '阻力偏多，宜守成緩圖，不宜強求。',
  大凶: '凶象明顯，所謀恐難如願，宜另作打算。',
}

// ── 術語解說 ──────────────────────────────────
const GlossaryCtx = createContext<(k: string) => void>(() => {})

function Term({ k, children }: { k: string; children?: ReactNode }) {
  const open = useContext(GlossaryCtx)
  if (!GLOSSARY[k]) return <>{children ?? k}</>
  return (
    <span
      className="term"
      onClick={e => {
        e.stopPropagation()
        open(k)
      }}
    >
      {children ?? k}
    </span>
  )
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw
      // 舊版以 UTC dateISO 儲存 → 以本機時區轉為牆鐘時間（同時區使用者結果不變）
      .map((x) => {
        if (x && typeof x === 'object' && !x.dateLocal && typeof x.dateISO === 'string') {
          const d = new Date(x.dateISO)
          if (!Number.isNaN(d.getTime())) return { ...x, dateLocal: fmtLocal(d) }
        }
        return x
      })
      // 形狀驗證：略過損壞或無法辨識的項目，避免整個 App 掛掉
      .filter((x): x is HistoryItem =>
        !!x && typeof x === 'object'
        && typeof x.dateLocal === 'string' && !Number.isNaN(parseLocal(x.dateLocal).getTime())
        && ['time', 'number', 'random', 'manual'].includes(x.method)
        && typeof x.qtKey === 'string'
        && (x.method !== 'number' || Array.isArray(x.numbers))
        && ((x.method !== 'manual' && x.method !== 'random') || (x.manual && typeof x.manual.upper === 'number')),
      ).slice(0, 50)
  } catch {
    return []
  }
}

function compute(input: CastInput): Reading {
  const ct = getChartTime(parseLocal(input.dateLocal))
  let cast: CastResult
  if (input.method === 'time') {
    cast = castByTime(ct)
  } else if (input.method === 'number') {
    cast = castByNumbers(input.numbers ?? [], input.includeHour ? ct.meihuaHourNum : undefined)
  } else {
    const m = input.manual!
    cast = castManual(m.upper, m.lower, m.dong, input.method === 'random' ? '隨機起卦' : '指定卦象')
  }
  const chart = buildNajiaChart(cast.ben, cast.dong, ct)
  const qt = QUESTION_TYPES.find(q => q.key === input.qtKey) ?? QUESTION_TYPES[0]
  const report = analyzeLiuyao(chart, ct, qt)
  const meihua = analyzeMeihua(cast, ct)
  return { input, ct, cast, chart, report, meihua, qt }
}

// ── 卦圖 ──────────────────────────────────────
function GuaLines({ hex, dong }: { hex: Hexagram; dong?: number }) {
  return (
    <div className="gua-lines">
      {hex.lines.map((v, i) => (
        <div key={i} className={'yao' + (dong === i + 1 ? ' dong' : '')}>
          {v === 1 ? <span className="bar" /> : <><span className="bar" /><span className="bar" /></>}
          {dong === i + 1 && <span className="mark">{v === 1 ? '○' : '×'}</span>}
        </div>
      ))}
    </div>
  )
}

function GuaTrio({ cast }: { cast: CastResult }) {
  return (
    <div className="gua-trio">
      <div className="gua-box">
        <div className="glabel"><Term k="本卦" /></div>
        <GuaLines hex={cast.ben} dong={cast.dong} />
        <div className="gname">{cast.ben.gua.fullName}</div>
      </div>
      <div className="gua-arrow">→</div>
      <div className="gua-box">
        <div className="glabel"><Term k="互卦" /></div>
        <GuaLines hex={cast.hu} />
        <div className="gname">{cast.hu.gua.fullName}</div>
      </div>
      <div className="gua-arrow">→</div>
      <div className="gua-box bian">
        <div className="glabel"><Term k="變卦" /></div>
        <GuaLines hex={cast.bian} />
        <div className="gname">{cast.bian.gua.fullName}</div>
      </div>
    </div>
  )
}

// ── 排盤表 ────────────────────────────────────
function PanTable({ r }: { r: Reading }) {
  const rows = [...r.chart.lines].reverse()
  return (
    <div className="pan-outer">
      <div className="pan-hint">表格可左滑查看「變卦」「伏神」欄 →</div>
      <div className="pan-wrap">
      <table className="pan">
        <thead>
          <tr>
            <th><Term k="六獸" /></th><th><Term k="六親" /></th><th><Term k="世應" /></th><th><Term k="本卦" /></th><th><Term k="裝卦" /></th><th><Term k="變卦" /></th><th><Term k="伏神" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(l => (
            <tr key={l.pos}>
              <td className="t-shou">{l.liushou}</td>
              <td className="t-qin">{l.liuqin}</td>
              <td className="t-shiying">{l.shiYing ?? ''}</td>
              <td>
                <span className={'yao-cell' + (l.isDong ? ' is-dong' : '')}>
                  {l.yang ? <span className="bar" /> : <><span className="bar" /><span className="bar" /></>}
                </span>
                {l.isDong && <span className="t-dong"> {l.yang ? '○' : '×'}</span>}
              </td>
              <td>
                {l.sb.branch}{l.sb.stem}{l.sb.element}
                {l.isXunKong && <span className="t-kong"> 空</span>}
                {l.isYuePo && <span className="t-po"> 月破</span>}
                {!l.isYuePo && l.isRiChong && <span className="t-po"> 日沖</span>}
              </td>
              <td className="t-bian">{l.bian ? `${l.bian.sb.branch}${l.bian.sb.stem}${l.bian.sb.element} ${l.bian.liuqin}` : ''}</td>
              <td className="t-fu">{l.fuShen ? `${l.fuShen.sb.branch}${l.fuShen.sb.stem}${l.fuShen.sb.element} ${l.fuShen.liuqin}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function ShenShaCard({ chart }: { chart: NajiaChart }) {
  const s = chart.shenSha
  const items: [string, string][] = [
    ['空亡', s.xunKong.join('')],
    ['卦身', s.guaShen ?? '—'],
    ['貴人', s.guiRen.join('')],
    ['驛馬', s.yiMa],
    ['桃花', s.taoHua],
    ['劫煞', s.jieSha],
    ['羊刃', s.yangRen],
    ['干祿', s.ganLu],
    ['天喜', s.tianXi],
    ['往亡', s.wangWang],
    ['日沖', s.riChong],
    ['月破', s.yuePo],
  ]
  const wangClass = (w: string) => (w === '旺' ? ' wang' : w === '相' ? ' xiang' : '')
  return (
    <div className="card">
      <h2>神煞 · 旺衰</h2>
      <div className="shensha-grid">
        {items.map(([n, v]) => (
          <div className="ss-item" key={n}>
            <span className="ss-name"><Term k={n} /></span>
            <span className="ss-val">{v}</span>
          </div>
        ))}
      </div>
      <div className="wuxing-strip">
        {chart.wuXingZhuangTai.map(w => (
          <div className={'wx-item' + wangClass(w.wang)} key={w.el}>
            <span className="el">{w.el}</span>
            <span className="st"><Term k="旺相休囚死">{w.wang}</Term> · <Term k="長生十二宮">{w.cs}</Term></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 解析 ──────────────────────────────────────
function Analysis({ r }: { r: Reading }) {
  const dongYao = r.cast.ben.gua.yaoci[r.cast.dong - 1]
  return (
    <>
      <div className="card">
        <h2>六爻斷卦</h2>
        {r.report.sections.map(s => (
          <div className="section" key={s.title}>
            <Term k={s.title}><span className="sec-title">{s.title}</span></Term>{s.text}
          </div>
        ))}
        <div className="section"><Term k="應期"><span className="sec-title">應期</span></Term>{r.report.yingQi}</div>
      </div>

      <div className="card">
        <h2>梅花體用</h2>
        <div className="section">
          <Term k="體用"><span className="sec-title">體用</span></Term>
          體卦{r.meihua.ti.name}（{r.meihua.ti.element}），用卦{r.meihua.yong.name}（{r.meihua.yong.element}），{r.meihua.tiYongRelation}。體卦月令{r.meihua.tiWang}。
        </div>
        <div className="section">
          <Term k="互變"><span className="sec-title">互變</span></Term>
          互卦{r.cast.hu.gua.fullName}看過程（{r.meihua.huLower.rel}、{r.meihua.huUpper.rel}）；變卦{r.cast.bian.gua.fullName}看結局（{r.meihua.bianRel.rel}）。
        </div>
        <div className="section"><span className="sec-title">總斷</span>{r.meihua.summary}</div>
      </div>

      <div className="card">
        <h2>卦辭爻辭</h2>
        <div className="classic">
          <div className="c-name">本卦 · {r.cast.ben.gua.fullName}</div>
          <div className="c-text">{r.cast.ben.gua.guaci}</div>
        </div>
        {dongYao && (
          <div className="classic">
            <div className="c-name">動爻 · {dongYao.name}</div>
            <div className="c-text">{dongYao.text}</div>
          </div>
        )}
        <div className="classic">
          <div className="c-name">變卦 · {r.cast.bian.gua.fullName}</div>
          <div className="c-text">{r.cast.bian.gua.guaci}</div>
        </div>
      </div>
    </>
  )
}

// ── 主程式 ────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<'cast' | 'result' | 'history'>('cast')
  const [question, setQuestion] = useState('')
  const [qtKey, setQtKey] = useState('general')
  const [method, setMethod] = useState<'time' | 'number' | 'random' | 'manual'>('time')
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [customTime, setCustomTime] = useState('')
  const [numA, setNumA] = useState('')
  const [numB, setNumB] = useState('')
  const [includeHour, setIncludeHour] = useState(false)
  const [manUpper, setManUpper] = useState(6)
  const [manLower, setManLower] = useState(5)
  const [manDong, setManDong] = useState(5)
  const [reading, setReading] = useState<Reading | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)
  const [error, setError] = useState('')
  const [glossaryKey, setGlossaryKey] = useState<string | null>(null)
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      // 儲存空間滿或被停用時靜默略過，不影響使用
    }
  }, [history])

  function doCast() {
    setError('')
    try {
      if (method === 'time' && useCustomTime) {
        if (!customTime) {
          setError('請選擇指定時間，或取消勾選改用當下時刻')
          return
        }
        if (Number.isNaN(parseLocal(customTime).getTime())) {
          setError('時間格式不正確，請重新選擇')
          return
        }
      }
      // datetime-local 的值本身就是牆鐘時間，直接沿用；否則取當下本地時間
      const dateLocal = method === 'time' && useCustomTime ? customTime : fmtLocal(new Date())
      const input: CastInput = {
        dateLocal,
        method,
        qtKey,
        question: question.trim(),
      }
      if (method === 'number') {
        const raw = [numA, numB].map(s => s.trim()).filter(s => s !== '')
        if (raw.length === 0) {
          setError('請輸入至少一個數字（或按 🎲 隨機填入）')
          return
        }
        if (raw.some(s => !/^\d{1,9}$/.test(s) || Number(s) < 1)) {
          setError('起卦數字須為 1 以上的整數（最多九位數）')
          return
        }
        input.numbers = raw.map(Number)
        input.includeHour = includeHour
      }
      if (method === 'manual') input.manual = { upper: manUpper, lower: manLower, dong: manDong }
      if (method === 'random') input.manual = drawRandom()
      const r = compute(input)
      setReading(r)
      setTab('result')
      setHistory(h => [{
        ...input,
        savedAt: new Date().toISOString(),
        guaName: `${r.cast.ben.gua.fullName} → ${r.cast.bian.gua.fullName}`,
        verdict: r.report.verdict,
      }, ...h].slice(0, 50))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function openHistory(item: HistoryItem) {
    try {
      setReading(compute(item))
      setTab('result')
    } catch {
      setError('這筆紀錄已損壞，無法重現')
      setTab('cast')
    }
  }

  function deleteHistory(savedAt: string) {
    if (window.confirm('刪除這筆紀錄？')) {
      setHistory(h => h.filter(x => x.savedAt !== savedAt))
    }
  }

  async function shareResult() {
    if (!reading) return
    const r = reading
    const lines = [
      `【梅花易數】${r.input.question ? `所問：${r.input.question}` : `所問類別：${r.qt.label}`}`,
      `${r.ct.solarText}（${r.ct.lunarText}）`,
      `${r.ct.year.stem}${r.ct.year.branch}年 ${r.ct.month.stem}${r.ct.month.branch}月 ${r.ct.day.stem}${r.ct.day.branch}日 ${r.ct.hour.stem}${r.ct.hour.branch}時`,
      `${r.cast.ben.gua.fullName} 之 ${r.cast.bian.gua.fullName}（互卦${r.cast.hu.gua.fullName}）`,
      `六爻斷卦：${r.report.verdict}——${VERDICT_LINE[r.report.verdict]}`,
      `梅花體用：${r.meihua.level}`,
      `應期：${r.report.yingQi}`,
    ]
    const text = lines.join('\n')
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareMsg('已複製到剪貼簿')
        setTimeout(() => setShareMsg(''), 2000)
      }
    } catch {
      // 使用者取消分享或剪貼簿不可用
    }
  }

  return (
    <GlossaryCtx.Provider value={k => setGlossaryKey(k)}>
      <header className="app-header">
        <h1><span className="plum">梅</span>花易數</h1>
        <div className="sub">時間起卦 · 六爻納甲 · 體用生剋</div>
      </header>

      <nav className="tabs">
        <button className={tab === 'cast' ? 'active' : ''} onClick={() => setTab('cast')}>起卦</button>
        <button className={tab === 'result' ? 'active' : ''} onClick={() => setTab('result')} disabled={!reading}>排盤</button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>紀錄</button>
      </nav>

      {tab === 'cast' && (
        <div className="card">
          <h2>所問何事</h2>
          <input type="text" placeholder="想問的事（選填）" value={question} onChange={e => setQuestion(e.target.value)} />
          <label className="field">問題類別（決定用神）</label>
          <div className="chip-row">
            {QUESTION_TYPES.map(q => (
              <button key={q.key} className={'chip' + (qtKey === q.key ? ' active' : '')} onClick={() => setQtKey(q.key)}>
                {q.label}
              </button>
            ))}
          </div>

          <label className="field">起卦方式</label>
          <div className="seg">
            <button className={method === 'time' ? 'active' : ''} onClick={() => { setMethod('time'); setError('') }}>時間</button>
            <button className={method === 'number' ? 'active' : ''} onClick={() => { setMethod('number'); setError('') }}>數字</button>
            <button className={method === 'random' ? 'active' : ''} onClick={() => { setMethod('random'); setError('') }}>隨機</button>
            <button className={method === 'manual' ? 'active' : ''} onClick={() => { setMethod('manual'); setError('') }}>指定卦象</button>
          </div>

          {method === 'time' && (
            <>
              <div className="check-row">
                <input type="checkbox" id="ct" checked={useCustomTime} onChange={e => setUseCustomTime(e.target.checked)} />
                <label htmlFor="ct">指定時間（不勾選則以當下時刻起卦）</label>
              </div>
              {useCustomTime && (
                <input type="datetime-local" value={customTime} onChange={e => setCustomTime(e.target.value)} />
              )}
            </>
          )}

          {method === 'number' && (
            <>
              <div className="num-grid">
                <div>
                  <label className="field">第一數（上卦）</label>
                  <input type="number" inputMode="numeric" min={1} step={1} value={numA} onChange={e => { setNumA(e.target.value); setError('') }} placeholder="如 17" />
                </div>
                <div>
                  <label className="field">第二數（下卦，可留空）</label>
                  <input type="number" inputMode="numeric" min={1} step={1} value={numB} onChange={e => { setNumB(e.target.value); setError('') }} placeholder="如 32" />
                </div>
              </div>
              <div className="check-row">
                <input type="checkbox" id="ih" checked={includeHour} onChange={e => setIncludeHour(e.target.checked)} />
                <label htmlFor="ih">動爻加時辰數（傳統加時法）</label>
              </div>
              <button
                className="dice-btn"
                onClick={() => {
                  setNumA(String(randomInt(99)))
                  setNumB(String(randomInt(99)))
                  setError('')
                }}
              >
                🎲 隨機填入數字（填好後按下方「起卦」）
              </button>
            </>
          )}

          {method === 'random' && (
            <div className="random-hint">
              心中默念所問之事，按下「起卦」，由程式代擲隨機取出上卦、下卦與動爻。
            </div>
          )}

          {method === 'manual' && (
            <div className="tri-grid">
              <div>
                <label className="field">上卦</label>
                <select value={manUpper} onChange={e => setManUpper(Number(e.target.value))}>
                  {TRIGRAMS.map(t => <option key={t.xiantian} value={t.xiantian}>{t.name}（{t.nature}）</option>)}
                </select>
              </div>
              <div>
                <label className="field">下卦</label>
                <select value={manLower} onChange={e => setManLower(Number(e.target.value))}>
                  {TRIGRAMS.map(t => <option key={t.xiantian} value={t.xiantian}>{t.name}（{t.nature}）</option>)}
                </select>
              </div>
              <div>
                <label className="field">動爻</label>
                <select value={manDong} onChange={e => setManDong(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{['初', '二', '三', '四', '五', '上'][d - 1]}爻</option>)}
                </select>
              </div>
            </div>
          )}

          {error && <div className="section" style={{ color: 'var(--accent)' }}>{error}</div>}
          <button className="cast-btn" onClick={doCast}>起卦</button>
        </div>
      )}

      {tab === 'result' && reading && (
        <>
          <div className="card summary-card">
            <div className="verdict-row">
              <div className={'verdict level-' + reading.report.verdict}>{reading.report.verdict}</div>
              <div className="verdict-note">
                {reading.input.question ? `所問：${reading.input.question}` : `所問類別：${reading.qt.label}`}
                <br />
                <strong>{reading.cast.ben.gua.fullName}</strong> 之 <strong>{reading.cast.bian.gua.fullName}</strong>
              </div>
            </div>
            <div className="summary-line">{VERDICT_LINE[reading.report.verdict]}　應期：{reading.report.yingQi}</div>
            <div className="summary-sub">
              梅花<Term k="體用">體用</Term>參斷：{reading.meihua.level}
              {reading.meihua.level !== reading.report.verdict && '（兩法角度不同：六爻依所問取用神為主，梅花以體用氣勢為輔）'}
            </div>
            <button className="share-btn" onClick={shareResult}>分享結果</button>
            {shareMsg && <span className="share-msg">{shareMsg}</span>}
          </div>
          <div className="card">
            <div className="time-info">
              {reading.ct.solarText}（{reading.ct.weekday}）· {reading.ct.lunarText}<br />
              <span className="gz">{reading.ct.year.stem}{reading.ct.year.branch}年 {reading.ct.month.stem}{reading.ct.month.branch}月 {reading.ct.day.stem}{reading.ct.day.branch}日 {reading.ct.hour.stem}{reading.ct.hour.branch}時</span>
              　<span className="kong"><Term k="旬空">旬空</Term> {reading.ct.xunKong.join('')}</span><br />
              {reading.cast.method} · {reading.chart.gong}宮{reading.chart.seqName}（{reading.chart.gongElement}）· 首卦{reading.chart.firstGua.fullName}
            </div>
          </div>
          <div className="card">
            <h2>卦象</h2>
            <GuaTrio cast={reading.cast} />
          </div>
          <div className="card">
            <h2>六爻排盤</h2>
            <PanTable r={reading} />
          </div>
          <ShenShaCard chart={reading.chart} />
          <Analysis r={reading} />
        </>
      )}

      {tab === 'history' && (
        <div className="card">
          <h2>占卜紀錄</h2>
          {history.length === 0 && <div className="history-empty">尚無紀錄，起一卦吧。</div>}
          {history.map(h => (
            <div className="history-item" key={h.savedAt} onClick={() => openHistory(h)}>
              <div>
                <div>{h.question || QUESTION_TYPES.find(q => q.key === h.qtKey)?.label}｜{h.guaName}</div>
                <div className="h-time">{new Date(h.savedAt).toLocaleString('zh-TW')}</div>
              </div>
              <div className="h-verdict">{h.verdict}</div>
              <button
                className="h-delete"
                aria-label="刪除這筆紀錄"
                onClick={e => {
                  e.stopPropagation()
                  deleteHistory(h.savedAt)
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {history.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                className="clear-btn"
                onClick={() => {
                  if (window.confirm('確定要清除全部占卜紀錄嗎？此動作無法復原。')) setHistory([])
                }}
              >
                清除全部紀錄
              </button>
            </div>
          )}
        </div>
      )}

      <div className="footnote">
        梅花易數起卦 · 六爻納甲裝卦（增刪卜易體系）<br />
        卦爻辭為《周易》公有領域原文 · 占卜結果僅供參考<br />
        帶虛線底線的術語可點擊查看解說
      </div>

      {glossaryKey && (
        <div className="glossary-overlay" onClick={() => setGlossaryKey(null)}>
          <div className="glossary-sheet" onClick={e => e.stopPropagation()}>
            <div className="glossary-title">{glossaryKey}</div>
            <div className="glossary-text">{GLOSSARY[glossaryKey]}</div>
            <button className="glossary-close" onClick={() => setGlossaryKey(null)}>知道了</button>
          </div>
        </div>
      )}
    </GlossaryCtx.Provider>
  )
}
