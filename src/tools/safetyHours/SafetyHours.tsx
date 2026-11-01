import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../../lib/files'
import { fmt } from '../fieldTrip/days'
import { AREAS, findArea, nextId, SAMPLE, VIA, type Record } from './areas'

const STORE = 'ssamtool.safety.v1'
interface Saved { records: Record[]; targets: { [id: string]: number }; className: string }

function load(): { s: Saved; sample: boolean } {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    if (v) return { s: v, sample: false }
  } catch { /* 처음이면 예시로 시작 */ }
  return { s: { records: SAMPLE, targets: Object.fromEntries(AREAS.map(a => [a.id, a.target])), className: '4학년 2반' }, sample: true }
}

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function SafetyHours() {
  const init = useMemo(load, [])
  const [s, setS] = useState<Saved>(init.s)
  const [isSample, setIsSample] = useState(init.sample)
  const [draft, setDraft] = useState<Omit<Record, 'id'>>({ date: todayIso(), area: 'life', topic: '', hours: 1, via: VIA[2] })
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => { if (!isSample) try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* 저장 못 해도 동작에는 문제 없음 */ } }, [s, isSample])
  const upd = (patch: Partial<Saved>) => { setS(p => ({ ...p, ...patch })); setIsSample(false) }

  const done = Object.fromEntries(AREAS.map(a => [a.id, s.records.filter(r => r.area === a.id).reduce((n, r) => n + r.hours, 0)]))
  const totalTarget = AREAS.reduce((n, a) => n + (s.targets[a.id] ?? 0), 0)
  const totalDone = AREAS.reduce((n, a) => n + done[a.id], 0)
  const short = AREAS.filter(a => done[a.id] < (s.targets[a.id] ?? 0))
  const scale = Math.max(...AREAS.map(a => Math.max(s.targets[a.id] ?? 0, done[a.id])), 1)

  const add = () => {
    if (!draft.topic.trim() || !(draft.hours > 0)) return
    upd({ records: [...(isSample ? [] : s.records), { ...draft, topic: draft.topic.trim(), id: nextId() }].sort((a, b) => a.date.localeCompare(b.date)) })
    setDraft(d => ({ ...d, topic: '' }))
  }

  const importPaste = () => {
    const got: Record[] = []
    let skipped = 0
    paste.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const cells = line.split('\t').map(c => c.trim())
      const area = findArea(line)
      const dm = line.match(/(\d{4})\s*[-.]\s*(\d{1,2})\s*[-.]\s*(\d{1,2})/)
      const hours = Number(cells.find(c => /^\d+(\.\d)?$/.test(c)) ?? (line.match(/(\d+)\s*(?:차시|시간)/)?.[1] ?? 1))
      const topic = cells.filter(c => c && !/^\d+(\.\d)?$/.test(c) && !/\d{4}\s*[-.]/.test(c) && !VIA.includes(c) && !AREAS.some(a => c === a.name || (a.keys.test(c) && c.length <= 4))).sort((a, b) => b.length - a.length)[0] ?? ''
      if (area && dm) got.push({ id: nextId(), date: `${dm[1]}-${dm[2].padStart(2, '0')}-${dm[3].padStart(2, '0')}`, area, topic: topic || AREAS.find(a => a.id === area)!.name, hours, via: VIA.find(v => line.includes(v.slice(0, 4))) ?? VIA[2] })
      else skipped++
    })
    if (got.length) upd({ records: [...(isSample ? [] : s.records), ...got].sort((a, b) => a.date.localeCompare(b.date)) })
    setPaste('')
    setMsg(got.length ? `${got.length}건을 넣었어요.${skipped ? ` 날짜나 영역을 찾지 못한 ${skipped}줄은 건너뛰었어요.` : ''}` : '날짜와 영역(생활·교통·폭력·약물·재난·직업·응급)을 찾지 못했어요.')
  }

  const saveXlsx = () => {
    const sum = [['영역', '목표 시수', '실시 시수', '차이'], ...AREAS.map(a => [a.name, s.targets[a.id] ?? 0, done[a.id], done[a.id] - (s.targets[a.id] ?? 0)]), ['합계', totalTarget, totalDone, totalDone - totalTarget]]
    const list = [['날짜', '영역', '주제', '시수', '운영 방법'], ...s.records.map(r => [r.date, AREAS.find(a => a.id === r.area)?.name ?? '', r.topic, r.hours, r.via])]
    const wb = XLSX.utils.book_new()
    const w1 = XLSX.utils.aoa_to_sheet(sum); w1['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 8 }]
    const w2 = XLSX.utils.aoa_to_sheet(list); w2['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 6 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, w1, '영역별 시수')
    XLSX.utils.book_append_sheet(wb, w2, '실시 기록')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${s.className} 안전교육 시수.xlsx`)
  }

  const rows = filter ? s.records.filter(r => r.area === filter) : s.records

  return (
    <div className="stack sh">
      <section className="panel">
        <div className="panel-head">
          <h2>{s.className} 영역별 시수</h2>
          <span className="meta">{isSample ? '예시 기록이에요. 첫 기록을 넣으면 지워져요.' : `기록 ${s.records.length}건`}</span>
        </div>
        <div className="sh-top">
          <div className="rc-big"><b className="num">{totalDone}</b><span className="num">/ {totalTarget}차시</span></div>
          <p className="note">{short.length ? `모자란 영역: ${short.map(a => `${a.name} ${(s.targets[a.id] ?? 0) - done[a.id]}차시`).join(', ')}` : '모든 영역이 목표 시수를 채웠어요.'}</p>
        </div>
        <div className="sh-bars">
          {AREAS.map(a => {
            const t = s.targets[a.id] ?? 0, d = done[a.id]
            return (
              <button key={a.id} className={`sh-row${filter === a.id ? ' on' : ''}`} onClick={() => setFilter(f => (f === a.id ? '' : a.id))} aria-pressed={filter === a.id}>
                <span className="sh-name">{a.name}</span>
                <span className="sh-track" style={{ width: `${(t / scale) * 100}%` }}>
                  <i style={{ width: `${t ? Math.min(100, (d / t) * 100) : 0}%` }} />
                </span>
                <span className={`sh-val num${d < t ? ' short' : ''}`}>{d} / {t}</span>
              </button>
            )
          })}
        </div>
        <p className="note">영역을 누르면 아래 기록이 그 영역만 보여요. 막대 길이는 목표 시수, 채운 부분은 실시 시수예요.</p>
      </section>

      <div className="grid-2 even">
        <section className="panel">
          <div className="panel-head"><h2>실시 기록{filter && ` · ${AREAS.find(a => a.id === filter)?.name}`}</h2><span className="meta num">{rows.length}건</span></div>
          <div className="scroll-x sh-list">
            <table className="list">
              <thead><tr><th>날짜</th><th>영역</th><th>주제</th><th className="num">시수</th><th></th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmt(r.date).replace(/^\d{4}\. /, '')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{AREAS.find(a => a.id === r.area)?.name}</td>
                    <td>{r.topic}<span className="sub">{r.via}</span></td>
                    <td className="num">{r.hours}</td>
                    <td className="num"><button className="btn text small" onClick={() => upd({ records: s.records.filter(x => x.id !== r.id) })}>빼기</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="note empty-line">아직 기록이 없어요.</p>}
          </div>
          <div className="row">
            <button className="btn" onClick={saveXlsx}>엑셀 저장 (영역별 시수 + 실시 기록)</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>기록 넣기</h2></div>
          <div className="row">
            <label className="field">날짜<input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></label>
            <label className="field">영역<select value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value })}>{AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="field">시수<input type="number" min={1} value={draft.hours} onChange={e => setDraft({ ...draft, hours: Number(e.target.value) })} /></label>
          </div>
          <div className="row">
            <label className="field grow">주제<input value={draft.topic} onChange={e => setDraft({ ...draft, topic: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="화재 대피 훈련" /></label>
            <label className="field">운영 방법<select value={draft.via} onChange={e => setDraft({ ...draft, via: e.target.value })}>{VIA.map(v => <option key={v}>{v}</option>)}</select></label>
          </div>
          <div className="row"><button className="btn primary" disabled={!draft.topic.trim()} onClick={add}>기록 넣기</button></div>

          <details className="pm-paste">
            <summary>엑셀·나이스에서 여러 줄 붙여넣기</summary>
            <textarea rows={4} value={paste} onChange={e => setPaste(e.target.value)} aria-label="붙여넣을 기록" placeholder={'2026-11-05\t재난안전\t지진 대피 훈련\t1'} />
            <div className="row"><button className="btn small" disabled={!paste.trim()} onClick={importPaste}>기록으로 넣기</button></div>
          </details>
          <p className="note" aria-live="polite">{msg || '한 줄에 날짜·영역·주제·시수가 있으면 읽어요. 영역 이름 대신 "화재", "심폐", "스마트폰" 같은 말로도 영역을 찾아요.'}</p>

          <details className="pm-paste">
            <summary>학급과 영역별 목표 시수</summary>
            <div className="stack" style={{ marginTop: 8 }}>
              <label className="field">학급<input value={s.className} onChange={e => upd({ className: e.target.value })} style={{ width: 140 }} /></label>
              <div className="sh-targets">
                {AREAS.map(a => (
                  <label key={a.id} className="field">{a.name}
                    <input type="number" min={0} value={s.targets[a.id] ?? 0} onChange={e => upd({ targets: { ...s.targets, [a.id]: Number(e.target.value) } })} />
                  </label>
                ))}
              </div>
              <p className="note">기본값은 초등학교 연간 51차시 기준이에요. 학교 안전교육 계획에 맞게 고치세요.</p>
            </div>
          </details>
        </section>
      </div>
    </div>
  )
}
