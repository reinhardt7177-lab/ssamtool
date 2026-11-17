import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type FocusEvent, type KeyboardEvent as ReactKey } from 'react'
import { createPortal } from 'react-dom'
import qrcode from 'qrcode-generator'
import { DocTool, S } from '../../components/DocTool'
import { extOf } from '../../lib/files'
import { hwpText } from '../../lib/hwp'
import { parseRoster } from '../../lib/roster'
import { loadSchool } from '../../lib/school'
import { createSheet, listSigns, removeSign, signLink, type Entry } from '../../lib/sign'
import { parseFile } from '../../lib/table'
import './sign.css'

// 서류 틀: 제목 말과 기본으로 받을 항목만 다르다. 협의록 서명란은 이름·서명을 두 줄로 나란히 놓는다
const TPLS = {
  attend: { name: '연수·회의 출석부', heading: '참석자 출석부', fields: '소속, 직위' },
  minutes: { name: '협의록 서명란', heading: '참석자 서명', fields: '' },
  edu: { name: '교육 등록부', heading: '교육 등록부', fields: '소속, 연락처' },
  roster: { name: '인명부', heading: '인명부', fields: '소속, 직위, 연락처' },
} as const
type Tpl = keyof typeof TPLS

interface State {
  tpl: Tpl; title: string; date: string; place: string; fields: string; names: string
  session: { id: string; key: string } | null
  entries: Entry[]
}
const STORE = 'ssamtool.signsheet.v1'
const FRESH: State = { tpl: 'attend', title: '2학기 학교안전교육 교직원 연수', date: '', place: '', fields: TPLS.attend.fields, names: '', session: null, entries: [] }
const load = (): State => { try { return { ...FRESH, ...JSON.parse(localStorage.getItem(STORE) ?? '{}') } } catch { return FRESH } }
const split = (s: string) => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean)
const clean = (list: string[]) => [...new Set(list.map(n => n.trim().slice(0, 20)).filter(Boolean))].slice(0, 300)

// 같은 교직원 명단으로 여러 번 받으니, 서명을 받았던 명단(이름만)을 이 브라우저에 다섯 개까지 기억한다
interface Past { title: string; names: string[] }
const PAST = 'ssamtool.signsheet.rosters.v1'
const loadPast = (): Past[] => { try { return JSON.parse(localStorage.getItem(PAST) ?? '[]') } catch { return [] } }

// 명단 파일에서 이름만 뽑는다. 엑셀은 '이름·성명' 열을, 없으면 줄마다 첫 이름꼴 낱말을 쓴다
async function namesFromFile(file: File): Promise<string[]> {
  if (['hwp', 'hwpx', 'pdf'].includes(extOf(file.name))) return parseRoster(await hwpText(file)).map(s => s.name)
  const t = await parseFile(file, true)
  const col = t.headers.findIndex(h => /이름|성명/.test(h))
  if (col >= 0) return t.rows.map(r => r[col])
  return parseRoster([t.headers, ...t.rows].map(r => r.join('\t')).join('\n')).map(s => s.name)
}

function Qr({ text }: { text: string }) {
  const d = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(text); q.make()
    const n = q.getModuleCount()
    let path = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`
    return { n, path }
  }, [text])
  return <svg className="sg-qr" viewBox={`-2 -2 ${d.n + 4} ${d.n + 4}`} role="img" aria-label="서명 링크 QR"><rect x="-2" y="-2" width={d.n + 4} height={d.n + 4} fill="#fff" /><path d={d.path} fill="#141414" /></svg>
}

export function SignSheet() {
  const [s, setS] = useState<State>(load)
  const [past, setPast] = useState<Past[]>(loadPast)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [big, setBig] = useState(false)
  const [ending, setEnding] = useState(false)
  const [copied, setCopied] = useState(false)
  const [over, setOver] = useState(false)
  const seen = useRef(new Set(s.entries.map(e => e.name))) // 이미 보여 준 서명은 다시 번지지 않게
  const paper = useRef<HTMLDivElement>(null)
  const dragFrom = useRef<number | null>(null)
  const upd = (p: Partial<State>) => setS(x => ({ ...x, ...p }))
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { setMsg('브라우저 저장 공간이 가득 찼어요. 서명은 화면에 남아 있으니 지금 인쇄하거나 저장해 주세요.') } }, [s])

  const fields = split(s.fields).slice(0, 5).map(f => f.slice(0, 12))
  const names = clean(s.names.split('\n'))
  const setNames = (list: string[]) => upd({ names: clean(list).join('\n') })
  const live = !!s.session
  const link = s.session ? signLink(s.session.id) : ''

  // 서명 받는 동안 4초마다 새 서명을 가져온다 (탭이 가려져 있으면 쉰다)
  useEffect(() => {
    if (!s.session) return
    const { id, key } = s.session
    let stop = false
    const pull = async () => {
      if (document.hidden) return
      try { const entries = await listSigns(id, key); if (!stop) setS(x => (x.session?.id === id ? { ...x, entries } : x)) } catch { /* 다음 차례에 다시 */ }
    }
    pull()
    const t = setInterval(pull, 4000)
    return () => { stop = true; clearInterval(t) }
  }, [s.session])
  useEffect(() => {
    const t = setTimeout(() => s.entries.forEach(e => seen.current.add(e.name)), 900) // 번지는 동안은 새 서명으로 둔다
    return () => clearTimeout(t)
  }, [s.entries])
  useEffect(() => {
    if (!big) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false) }
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [big])

  const start = async () => {
    if (!s.title.trim()) { setMsg('제목을 먼저 적어 주세요.'); return }
    setBusy(true); setMsg('')
    try {
      const session = await createSheet(s.title.trim().slice(0, 100), fields, names)
      seen.current.clear(); upd({ session, entries: [] })
      if (names.length) {
        const next = [{ title: s.title.trim(), names }, ...past.filter(p => p.names.join() !== names.join())].slice(0, 5)
        setPast(next); try { localStorage.setItem(PAST, JSON.stringify(next)) } catch { /* 기억 못 해도 서명은 받는다 */ }
      }
    } catch (e) { setMsg(`서명부를 만들지 못했어요: ${(e as Error).message}`) }
    setBusy(false)
  }
  const end = async () => {
    if (!s.session) return
    setBusy(true)
    try {
      const entries = await listSigns(s.session.id, s.session.key) // 마지막으로 한 번 더 받고 지운다
      await removeSign(s.session.id, s.session.key)
      upd({ session: null, entries }); setMsg('서버에서 지웠어요. 받은 서명은 이 브라우저에만 남아 있어요.')
    } catch (e) { setMsg(`끝내지 못했어요: ${(e as Error).message}. 인터넷 연결을 확인해 주세요.`) }
    setBusy(false); setEnding(false)
  }
  const redo = async (name: string) => {
    if (s.session) { try { await removeSign(s.session.id, s.session.key, name) } catch { setMsg('지우지 못했어요. 인터넷 연결을 확인해 주세요.'); return } }
    seen.current.delete(name)
    upd({ entries: s.entries.filter(e => e.name !== name) })
  }
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 링크 칸에서 직접 복사 */ } }

  const importFile = async (file?: File) => {
    if (!file || live) return
    setMsg('명단 파일을 읽는 중…')
    try {
      const got = clean(await namesFromFile(file))
      if (!got.length) { setMsg('파일에서 이름을 찾지 못했어요. 이름 열이 있는 엑셀이나 한 줄에 한 명씩 적힌 파일을 넣어 주세요.'); return }
      setNames([...names, ...got]); setMsg(`${file.name}에서 ${got.length}명을 넣었어요. 서류에서 확인하고 고쳐 주세요.`)
    } catch (e) { setMsg(`파일을 읽지 못했어요: ${(e as Error).message ?? e}`) }
  }

  // ── 서류의 성명 칸에 바로 쓰기 ──
  // i번째 칸에 적은 글을 명단에 넣는다. 엑셀에서 여러 줄을 붙이면 줄마다 한 명이 된다. 비우면 그 줄이 빠진다
  const commit = (i: number, raw: string) => {
    const parts = raw.split(/[\n\t,]/).map(x => x.trim()).filter(Boolean)
    const next = [...names]
    next.splice(i, i < names.length ? 1 : 0, ...parts)
    setNames(next)
    return parts.length
  }
  const focusCell = (i: number) => setTimeout(() => {
    const el = paper.current?.querySelector<HTMLElement>(`[data-name="${i}"]`)
    if (!el) return
    el.focus()
    getSelection()?.selectAllChildren(el); getSelection()?.collapseToEnd()
  }, 30)
  // 고칠 수 있는 성명 칸. 서명 받는 동안에는 잠근다. 칸은 값이 바뀌면 새로 그려서(key) 손으로 고친 글과 어긋나지 않게 한다
  const nameCell = (i: number, style: object) => {
    const name = names[i] ?? ''
    if (live) return <td key={`n${i}`} style={style}>{name}</td>
    return (
      <td key={`n${i}-${name}-${names.length}`} style={style} className="sg-edit" data-name={i} data-ph={i === names.length ? '이름 쓰기' : undefined}
        contentEditable="plaintext-only" suppressContentEditableWarning spellCheck={false} role="textbox" aria-label={i < names.length ? `${i + 1}번 이름` : '새 이름'}
        onBlur={(e: FocusEvent<HTMLElement>) => { const t = (e.currentTarget.textContent ?? '').trim(); if (t !== name) commit(i, t) }}
        onKeyDown={(e: ReactKey<HTMLElement>) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return // 한글 조합 중 Enter는 글자 확정이다
          e.preventDefault()
          const t = (e.currentTarget.textContent ?? '').trim()
          const n = t === name ? 1 : commit(i, t)
          focusCell(i + Math.max(n, i < names.length ? 1 : 0))
        }}
        onPaste={(e: ClipboardEvent<HTMLElement>) => {
          const t = e.clipboardData.getData('text')
          if (!/[\n\t,]/.test(t.trim())) return // 한 낱말은 그냥 붙인다
          e.preventDefault()
          focusCell(i + commit(i, `${e.currentTarget.textContent ?? ''}\n${t}`))
        }}
      >{name}</td>
    )
  }
  const del = (i: number) => <button className="sg-del no-print" aria-label={`${names[i]} 빼기`} onClick={() => setNames(names.filter((_, k) => k !== i))}>×</button>
  const drop = (to: number) => {
    const from = dragFrom.current
    dragFrom.current = null
    if (from === null || from === to) return
    const next = [...names]
    next.splice(to, 0, next.splice(from, 1)[0])
    setNames(next)
  }
  const fileDrag = (e: DragEvent) => e.dataTransfer.types.includes('Files')

  // 서류에 들어갈 줄: 명단 순서(안 한 사람은 빈칸), 그 뒤에 명단에 없던 사람
  const by = new Map(s.entries.map(e => [e.name, e]))
  const extra = s.entries.filter(e => !names.includes(e.name))
  const signedCount = s.entries.length
  const waiting = names.filter(n => !by.has(n))
  const sign = (e?: Entry) => e && <img src={e.image} alt={`${e.name} 서명`} className={seen.current.has(e.name) ? undefined : 'ink-in'} style={{ height: '24pt', width: 'auto', display: 'block', margin: '0 auto' }} />
  const tpl = TPLS[s.tpl]
  const signCell = { ...S.cell, ...S.center, height: '30pt', padding: '2pt 4pt', verticalAlign: 'middle' as const, position: 'relative' as const }
  const mid = { ...S.cell, ...S.center, verticalAlign: 'middle' as const }
  const editable = !live
  // 명단도 서명도 없을 때 종이가 비어 보이지 않게 넣는 빈 줄 수 (인쇄용 빈 서명부로도 쓴다)
  const pad = names.length + extra.length ? 0 : 6

  const form = (
    <>
      <section className="panel">
        <div className="panel-head"><h2>서류</h2><span className="meta">{live ? '서명 받는 동안에는 받을 항목과 명단을 바꿀 수 없어요' : '어떤 서류에 서명을 받을지 골라요'}</span></div>
        <div className="tpl-tabs" role="tablist" aria-label="서류 틀">
          {(Object.keys(TPLS) as Tpl[]).map(k => <button key={k} role="tab" aria-selected={s.tpl === k} className={`tpl-tab${s.tpl === k ? ' on' : ''}`} onClick={() => upd(live ? { tpl: k } : { tpl: k, fields: TPLS[k].fields })}>{TPLS[k].name}</button>)}
        </div>
        <label className="field grow">제목 (연수·회의·교육 이름)<input value={s.title} maxLength={100} onChange={e => upd({ title: e.target.value })} /></label>
        <div className="row">
          <label className="field grow">일시<input value={s.date} placeholder="2026. 11. 20.(금) 15:00" onChange={e => upd({ date: e.target.value })} /></label>
          <label className="field grow">장소<input value={s.place} placeholder="시청각실" onChange={e => upd({ place: e.target.value })} /></label>
        </div>
        <label className="field grow">이름·서명 말고 더 받을 항목 (쉼표로 구분, 5개까지)
          <input value={s.fields} disabled={live} placeholder="비우면 이름과 서명만 받아요" onChange={e => upd({ fields: e.target.value })} />
          <span className="hint">연락처처럼 민감한 항목은 서류에 꼭 필요할 때만 넣으세요.</span>
        </label>
        <div className="sg-roster">
          <div className="sg-roster-head"><b>명단</b><span className="num">{names.length ? `${names.length}명` : '없음 · 오는 사람이 이름을 직접 적어요'}</span></div>
          <p className="note">오른쪽 서류의 <b>성명 칸에 바로 쓰세요.</b> Enter로 다음 줄, 엑셀에서 복사해 붙이면 줄마다 한 명씩 들어가요. 명단 파일은 서류 위에 끌어다 놓아도 돼요.</p>
          {!live && (
            <div className="row">
              <label className="btn small">명단 파일 넣기<input type="file" hidden accept=".xlsx,.xls,.csv,.hwp,.hwpx" onChange={e => { importFile(e.target.files?.[0]); e.target.value = '' }} /></label>
              {names.length > 0 && <button className="btn text small" onClick={() => setNames([])}>명단 비우기</button>}
            </div>
          )}
          {!live && past.length > 0 && (
            <div className="sg-past">
              <span className="hint">지난 명단</span>
              {past.map((p, i) => <button key={i} className="sg-past-btn" onClick={() => setNames(p.names)}>{p.title}<small className="num">{p.names.length}명</small></button>)}
            </div>
          )}
        </div>
      </section>

      <section className="panel sg-collect">
        <div className="panel-head"><h2>서명 받기</h2><span className="meta num">{signedCount}{names.length ? ` / ${names.length}` : ''}명 서명</span></div>
        {!live ? (
          <>
            <p className="note">시작하면 링크와 QR이 생겨요. 참석자가 각자 폰으로 열어 서명하면 오른쪽 서류에 바로 채워져요.</p>
            <p className="note sg-privacy">서명을 받는 동안 <b>제목·명단·적은 항목·서명 그림</b>이 서버(서울)에 저장돼요. 쌤툴에서 이 도구만 그래요. 끝내기를 누르면 바로 지워지고, 누르지 않아도 7일 뒤 지워져요.</p>
            <div className="row">
              <button className="btn primary" disabled={busy} onClick={start}>{busy ? '만드는 중…' : s.entries.length ? '새로 서명 받기 (지금 서명은 비워져요)' : '서명 받기 시작'}</button>
            </div>
          </>
        ) : (
          <>
            <div className="sg-share">
              <button className="sg-qr-btn" onClick={() => setBig(true)} aria-label="QR 크게 보기"><Qr text={link} /></button>
              <div className="stack" style={{ gap: 8 }}>
                <input className="sg-link" readOnly value={link} aria-label="서명 링크" onFocus={e => e.target.select()} />
                <div className="row">
                  <button className="btn primary" onClick={() => setBig(true)}>QR 크게 띄우기</button>
                  <button className="btn" onClick={copy}>{copied ? '복사됨' : '링크 복사'}</button>
                </div>
                <p className="note">{waiting.length ? `아직: ${waiting.slice(0, 12).join(', ')}${waiting.length > 12 ? ` 외 ${waiting.length - 12}명` : ''}` : names.length ? '모두 서명했어요.' : '서명이 오면 서류에 채워져요.'}</p>
              </div>
            </div>
            <div className="row">
              {ending ? (
                <>
                  <span className="note warn">서버의 서명을 지우고 링크를 닫아요. 받은 서명은 이 브라우저에 남아요.</span>
                  <button className="btn primary" disabled={busy} onClick={end}>{busy ? '지우는 중…' : '끝내고 지우기'}</button>
                  <button className="btn" onClick={() => setEnding(false)}>계속 받기</button>
                </>
              ) : <button className="btn" onClick={() => setEnding(true)}>서명 받기 끝내기</button>}
            </div>
          </>
        )}
        {s.entries.length > 0 && (
          <details className="pm-paste">
            <summary>받은 서명 {s.entries.length}개 관리</summary>
            <ul className="sg-got">
              {s.entries.map(e => <li key={e.name}><span>{e.name}</span><img src={e.image} alt="" /><button className="btn text small" onClick={() => redo(e.name)}>{live ? '지우고 다시 받기' : '빼기'}</button></li>)}
            </ul>
          </details>
        )}
        {msg && <p className="note" aria-live="polite">{msg}</p>}
      </section>

      {/* 파일철이 3D로 기울어 있어 그 안에서는 화면 전체를 덮지 못한다. body에 바로 붙인다 */}
      {big && live && createPortal(
        <div className="sg-wall no-print" role="dialog" aria-label="서명 QR" onClick={() => setBig(false)}>
          <div className="sg-wall-card">
            <div className="sg-kicker">SIGN-IN SHEET<span>폰 카메라로 찍어 주세요</span></div>
            <h2>{s.title}</h2>
            <Qr text={link} />
            <div className="sg-wall-count"><b className="num">{signedCount}</b>{names.length ? <span className="num"> / {names.length}명</span> : <span>명</span>} 서명</div>
            <p className="sg-wall-last">{s.entries.slice(-6).reverse().map(e => e.name).join(' · ') || '첫 서명을 기다리고 있어요'}</p>
          </div>
          <span className="sg-wall-close">화면을 누르면 닫혀요</span>
        </div>, document.body)}
    </>
  )

  // 협의록 서명란은 두 명씩 나란히: 명단 칸 + (고칠 수 있으면) 새 이름 칸 + 명단 밖 서명 + 빈 줄
  const slots: { i?: number; e?: Entry; blank?: boolean }[] = [
    ...names.map((n, i) => ({ i, e: by.get(n) })),
    ...(editable ? [{ i: names.length }] : []),
    ...extra.map(e => ({ e })),
    ...Array.from({ length: pad }, () => ({ blank: true })),
  ]

  return (
    <DocTool form={form} fileName={`${s.title || '서명부'} ${tpl.heading}`}>
      <div ref={paper} className={`sg-paper${over ? ' over' : ''}`}
        onDragOver={e => { if (fileDrag(e) && editable) { e.preventDefault(); setOver(true) } }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { if (fileDrag(e) && editable) { e.preventDefault(); setOver(false); importFile(e.dataTransfer.files[0]) } }}>
        <div style={S.title}>{s.tpl === 'minutes' ? `${s.title || '협의회'} ${tpl.heading}` : tpl.heading}</div>
        <table style={S.table}><tbody>
          {s.tpl !== 'minutes' && <tr><th style={{ ...S.head, width: '16%' }}>{s.tpl === 'edu' ? '교육명' : '제목'}</th><td style={S.cell} colSpan={3}>{s.title}</td></tr>}
          <tr><th style={{ ...S.head, width: '16%' }}>일시</th><td style={S.cell}>{s.date}</td><th style={{ ...S.head, width: '16%' }}>장소</th><td style={S.cell}>{s.place}</td></tr>
        </tbody></table>
        {s.tpl === 'minutes' ? (
          <table style={S.table}><tbody>
            <tr>{['성명', '서명', '성명', '서명'].map((h, i) => <th key={i} style={{ ...S.head, width: i % 2 ? '32%' : '18%' }}>{h}</th>)}</tr>
            {Array.from({ length: Math.ceil(slots.length / 2) }, (_, r) => (
              <tr key={r}>{[slots[r * 2], slots[r * 2 + 1]].map((x, k) => {
                const isNew = x?.i === names.length
                return [
                  x?.i !== undefined ? nameCell(x.i, { ...mid, ...(isNew ? { borderStyle: 'dashed' } : {}) }) : <td key={`x${k}`} style={mid}>{x?.e?.name}</td>,
                  <td key={`s${k}`} style={isNew ? { ...signCell, borderStyle: 'dashed' } : signCell}>{sign(x?.e)}{editable && x?.i !== undefined && !isNew && !x.e && del(x.i)}</td>,
                ]
              })}</tr>
            ))}
          </tbody></table>
        ) : (
          <table style={S.table}><tbody>
            <tr><th style={{ ...S.head, width: '9%' }}>연번</th>{fields.map(f => <th key={f} style={S.head}>{f}</th>)}<th style={{ ...S.head, width: '18%' }}>성명</th><th style={{ ...S.head, width: '24%' }}>서명</th></tr>
            {names.map((n, i) => (
              <tr key={`${i}-${n}`} onDragOver={e => { if (dragFrom.current !== null) e.preventDefault() }} onDrop={() => drop(i)}>
                <td style={{ ...mid, position: 'relative' }}>{editable && <span className="sg-grip no-print" draggable aria-hidden="true" title="끌어서 순서 바꾸기" onDragStart={() => { dragFrom.current = i }} onDragEnd={() => { dragFrom.current = null }}>⠿</span>}{i + 1}</td>
                {fields.map(f => <td key={f} style={mid}>{by.get(n)?.info[f]}</td>)}
                {nameCell(i, mid)}
                <td style={signCell}>{sign(by.get(n))}{editable && !by.get(n) && del(i)}</td>
              </tr>
            ))}
            {editable && (
              <tr className="no-print">
                <td style={{ ...mid, borderStyle: 'dashed' }}>+</td>{fields.map(f => <td key={f} style={{ ...mid, borderStyle: 'dashed' }} />)}
                {nameCell(names.length, { ...mid, borderStyle: 'dashed' })}
                <td style={{ ...signCell, borderStyle: 'dashed' }} />
              </tr>
            )}
            {extra.map((e, k) => (
              <tr key={e.name}><td style={mid}>{names.length + k + 1}</td>{fields.map(f => <td key={f} style={mid}>{e.info[f]}</td>)}<td style={mid}>{e.name}</td><td style={signCell}>{sign(e)}</td></tr>
            ))}
            {Array.from({ length: pad }, (_, k) => (
              <tr key={`b${k}`}><td style={mid}>{k + 1}</td>{fields.map(f => <td key={f} style={mid} />)}<td style={mid} /><td style={signCell} /></tr>
            ))}
          </tbody></table>
        )}
        <p style={{ ...S.center, fontWeight: 700, fontSize: '13pt', marginTop: '14pt' }}>{loadSchool().name}</p>
        {over && <div className="sg-dropnote no-print">여기에 놓으면 명단으로 넣어요</div>}
      </div>
    </DocTool>
  )
}
