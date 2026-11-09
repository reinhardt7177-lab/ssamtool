import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../../lib/files'
import { DAY_KO, fmt, fromIso, iso } from '../fieldTrip/days'
import { loadRoster } from '../../lib/roster'
import { assign, hm, makeSlots, options, parseRequest, type Request } from './schedule'

const nextMonday = () => { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7) + 14); return iso(d) }
const addDays = (s: string, n: number) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d) }
const short = (s: string) => fmt(s).replace(/^\d{4}\. /, '')

const SAMPLE_REQ = `김하늘\t월, 화\t15시 이후\t대면
이도윤\t아무 때나\t\t전화
박서연\t수\t14:30~15:30\t대면
최지호\t수\t14:30~15:30\t대면
정하은\t목, 금\t16시 이후\t대면
강민준\t월\t\t전화
조서아\t화\t15:00~16:00\t대면
윤시우\t금\t16시 이전\t대면
장예린\t수, 목\t\t대면
임도현\t수\t14:30~15:10\t대면`

export function CounselWeek() {
  const [start, setStart] = useState(nextMonday)
  const [end, setEnd] = useState(() => addDays(nextMonday(), 4))
  const [dayFrom, setDayFrom] = useState('14:30')
  const [dayTo, setDayTo] = useState('17:00')
  const [len, setLen] = useState(20)
  const [gap, setGap] = useState(0)
  const [text, setText] = useState(SAMPLE_REQ)
  const [isSample, setIsSample] = useState(true)
  const [fixed, setFixed] = useState<Record<string, string>>({})
  const [className, setClassName] = useState('4학년 2반')
  const [copied, setCopied] = useState('')

  const slots = useMemo(() => makeSlots(start, end, dayFrom, dayTo, len, gap, {}), [start, end, dayFrom, dayTo, len, gap])
  const dates = useMemo(() => [...new Set(slots.map(s => s.date))], [slots])
  const times = useMemo(() => [...new Set(slots.map(s => s.start))].sort((a, b) => a - b), [slots])
  const reqs = useMemo(() => text.split('\n').map(l => l.trim()).filter(Boolean).map(l => parseRequest(l, dates)).filter((r): r is Request => !!r), [text, dates])
  const plan = useMemo(() => assign(reqs, slots, len, Object.fromEntries(Object.entries(fixed).filter(([n, id]) => reqs.some(r => r.name === n) && slots.some(s => s.id === id)))), [reqs, slots, len, fixed])
  const bySlot = useMemo(() => Object.fromEntries(Object.entries(plan).map(([n, id]) => [id, n])), [plan])
  const unassigned = reqs.filter(r => !plan[r.name])
  const slotOf = (id: string) => slots.find(s => s.id === id)!
  const reqOf = (n: string) => reqs.find(r => r.name === n)!

  const wishText = (r: Request) => [
    r.days === 'any' ? '아무 날' : r.days.map(d => `${DAY_KO[fromIso(d).getDay()]}`).join('·'),
    r.from !== null || r.to !== null ? `${r.from !== null ? hm(r.from) : ''}~${r.to !== null ? hm(r.to) : ''}` : '',
    r.method,
  ].filter(Boolean).join(' · ')

  const noticeFor = (n: string) => {
    const s = slotOf(plan[n]), r = reqOf(n)
    return `${n} 학부모님, 상담 일정은 ${short(s.date)} ${hm(s.start)}~${hm(s.start + len)} ${r.method} 상담으로 정해졌어요.${r.method === '전화' ? ' 이 시간에 담임 선생님이 전화드릴게요.' : ' 시간에 맞춰 교실로 와 주세요.'} 사정이 생기면 미리 알려 주세요.`
  }
  const notices = reqs.filter(r => plan[r.name]).sort((a, b) => plan[a.name].localeCompare(plan[b.name], 'en', { numeric: true })).map(r => noticeFor(r.name)).join('\n\n')

  const copy = async (t: string, what: string) => {
    try { await navigator.clipboard.writeText(t); setCopied(what) } catch { setCopied('') }
    setTimeout(() => setCopied(''), 1800)
  }

  const saveXlsx = () => {
    const rows: (string | number)[][] = [['시간', ...dates.map(short)]]
    times.forEach(t => rows.push([`${hm(t)}~${hm(t + len)}`, ...dates.map(d => { const n = bySlot[`${d} ${t}`]; return n ? `${n} (${reqOf(n).method})` : '' })]))
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 13 }, ...dates.map(() => ({ wch: 16 }))]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '상담 배정표')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${className} 상담주간 배정표.xlsx`)
  }

  return (
    <div className="stack cw">
      <section className="panel cw-print">
        <div className="panel-head">
          <h2>{className} 상담 배정표</h2>
          <span className="meta num">{isSample ? '예시 희망 시간이에요. ' : ''}{reqs.length}가정 중 {reqs.length - unassigned.length}가정 배정 · 남은 시간 {slots.length - Object.keys(plan).length}칸</span>
        </div>
        {dates.length === 0 ? <p className="note empty-line">기간과 상담 시간을 정하면 시간표가 만들어져요.</p> : (
          <div className="scroll-x">
            <table className="cw-grid">
              <thead><tr><th></th>{dates.map(d => <th key={d} className="num">{short(d)}</th>)}</tr></thead>
              <tbody>
                {times.map(t => (
                  <tr key={t}>
                    <th className="num">{hm(t)}</th>
                    {dates.map(d => {
                      const id = `${d} ${t}`, n = bySlot[id]
                      return <td key={id} className={n ? `on${reqOf(n).method === '전화' ? ' phone' : ''}${fixed[n] ? ' fixed' : ''}` : ''}>{n && <><b>{n}</b><small>{reqOf(n).method}</small></>}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {unassigned.length > 0 && (
          <p className="note warn">시간을 찾지 못한 가정: {unassigned.map(r => `${r.name}(${wishText(r)})`).join(', ')} — 희망 시간이 겹쳐요. 아래 목록에서 다른 시간으로 옮기거나 다시 여쭤보세요.</p>
        )}
      </section>

      <div className="grid-2 even no-print">
        <section className="panel">
          <div className="panel-head"><h2>희망 시간</h2><span className="meta">회신서 내용을 한 줄에 한 가정씩</span></div>
          <textarea className="cw-text" rows={10} value={text} onChange={e => { setText(e.target.value); setIsSample(false); setFixed({}) }} aria-label="가정별 희망 시간" />
          {loadRoster().length > 0 && <div className="row"><button className="btn small" onClick={() => { setText(loadRoster().map(x => `${x.name}\t`).join('\n')); setIsSample(false); setFixed({}) }}>우리 반 명단으로 채우기</button></div>}
          <p className="note">이름, 희망 요일이나 날짜(월·수, 11/24), 시간(15시 이후, 14:30~15:30), 방법(대면·전화)을 탭이나 | 로 나눠 적으세요. 시간을 안 적으면 아무 때나 괜찮은 것으로 봐요.</p>
          {reqs.length > 0 && (
            <table className="list">
              <thead><tr><th>가정</th><th>읽은 희망</th><th>배정</th></tr></thead>
              <tbody>
                {reqs.map(r => {
                  const opts = options(r, slots, len)
                  return (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td className="hint">{wishText(r)} <span className="num">({opts.length}칸)</span></td>
                      <td>
                        <select aria-label={`${r.name} 배정 시간`} value={plan[r.name] ?? ''} onChange={e => setFixed(f => { const x = { ...f }; if (e.target.value) x[r.name] = e.target.value; else delete x[r.name]; return x })}>
                          <option value="">{plan[r.name] ? '자동 배정' : '배정 못 함'}</option>
                          {slots.map(s => {
                            const who = bySlot[s.id]
                            return <option key={s.id} value={s.id} disabled={!!who && who !== r.name}>{short(s.date)} {hm(s.start)}{who && who !== r.name ? ` (${who})` : ''}{opts.includes(s) ? '' : ' · 희망 밖'}</option>
                          })}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>상담 시간 설정</h2></div>
          <div className="row">
            <label className="field">학급<input value={className} onChange={e => setClassName(e.target.value)} style={{ width: 120 }} /></label>
            <label className="field">시작일<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
            <label className="field">끝나는 날<input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} /></label>
          </div>
          <div className="row">
            <label className="field">하루 시작<input type="time" value={dayFrom} onChange={e => setDayFrom(e.target.value)} /></label>
            <label className="field">하루 끝<input type="time" value={dayTo} onChange={e => setDayTo(e.target.value)} /></label>
            <label className="field">한 가정 (분)<input type="number" min={5} step={5} value={len} onChange={e => setLen(Number(e.target.value))} /></label>
            <label className="field">쉬는 시간 (분)<input type="number" min={0} step={5} value={gap} onChange={e => setGap(Number(e.target.value))} /></label>
          </div>
          <p className="note">주말과 공휴일은 빼고 시간표를 만들어요. 하루 {times.length}칸 × {dates.length}일 = {slots.length}칸.</p>

          <div className="panel-head" style={{ marginTop: 8 }}><h2>가정별 안내 문구</h2><span className="meta" aria-live="polite">{copied && `${copied} 복사됨`}</span></div>
          <pre className="pm-body cw-notice">{notices || '배정된 가정이 없어요.'}</pre>
          <div className="row">
            <button className="btn primary" disabled={!notices} onClick={() => copy(notices, '안내 문구')}>안내 문구 모두 복사</button>
            <button className="btn" onClick={saveXlsx}>배정표 엑셀 저장</button>
            <button className="btn" onClick={() => print()}>배정표 인쇄</button>
          </div>
        </section>
      </div>
    </div>
  )
}
