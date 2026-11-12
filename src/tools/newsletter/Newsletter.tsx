import { useEffect, useRef, useState } from 'react'
import { SEASON_GREETING, TEMPLATES, type Letter, type Row } from './templates'
import './newsletter.css'
import { loadSchool, saveSchool, type School } from '../../lib/school'
import { htmlToHwpx } from '../../lib/hwp'
import { downloadBlob } from '../../lib/files'

const DAYS = '일월화수목금토'
function today() {
  const d = new Date()
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.(${DAYS[d.getDay()]})`
}

// 쉼표로 나누되 괄호 안의 쉼표는 나누지 않는다: "유의할 점(알레르기, 멀미 등), 비상 연락처"
const split = (s: string) => {
  const out: string[] = []
  let cur = '', depth = 0
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out.map(x => x.trim()).filter(Boolean)
}

// 미리보기와 '한글에 붙여넣기'가 같은 모양이 되도록 서식은 모두 인라인 스타일로 둔다
const S = {
  doc: { fontFamily: '"맑은 고딕", "Malgun Gothic", sans-serif', fontSize: '11pt', lineHeight: 1.6, color: '#111' },
  top: { display: 'flex', alignItems: 'center', gap: '8pt', fontSize: '10pt', color: '#333' },
  title: { fontSize: '20pt', fontWeight: 700, textAlign: 'center' as const, margin: '8pt 0 4pt', letterSpacing: '-0.5pt' },
  meta: { fontSize: '9.5pt', color: '#333', textAlign: 'right' as const, borderBottom: '2pt solid #111', paddingBottom: '5pt', marginBottom: '12pt' },
  p: { margin: '0 0 6pt', textIndent: '10pt' },
  below: { textAlign: 'center' as const, margin: '8pt 0 6pt' },
  table: { width: '100%', borderCollapse: 'collapse' as const, margin: '0 0 12pt', fontSize: '10.5pt' },
  th: { width: '22%', border: '1px solid #555', background: '#f0f0f0', padding: '3pt 8pt', fontWeight: 700, textAlign: 'center' as const },
  td: { border: '1px solid #555', padding: '3pt 10pt' },
  sign: { textAlign: 'center' as const, margin: '12pt 0 0' },
  signName: { textAlign: 'center' as const, fontSize: '15pt', fontWeight: 700, letterSpacing: '2pt', margin: '6pt 0 0' },
  cut: { borderTop: '1.5pt dashed #555', margin: '20pt 0 10pt', textAlign: 'center' as const, fontSize: '9pt', color: '#555', lineHeight: 0 },
  cutLabel: { background: '#fff', padding: '0 8pt' },
  replyTitle: { fontSize: '15pt', fontWeight: 700, textAlign: 'center' as const, margin: '10pt 0 8pt' },
  line: { borderBottom: '1px solid #555', display: 'inline-block', minWidth: '120pt' },
}

function Doc({ school, letter, date, greeting }: { school: School; letter: Letter; date: string; greeting: boolean }) {
  const month = Number(date.match(/^\d{4}\.\s*(\d{1,2})\./)?.[1] ?? new Date().getMonth() + 1)
  const paras = letter.body.split(/\n\s*\n|\n/).map(s => s.trim()).filter(Boolean)
  const rows = letter.rows.filter(r => r.label.trim() || r.value.trim())
  const r = letter.reply
  return (
    <div style={S.doc}>
      <div style={S.top}>
        {school.logo && <img src={school.logo} alt="" style={{ height: '26pt', width: 'auto' }} />}
        <span>{school.name} 가정통신문</span>
      </div>
      <div style={S.title}>{letter.title || '제목을 입력하세요'}</div>
      <div style={S.meta}>{date}{school.contact && <> &nbsp;|&nbsp; {school.contact}</>}</div>

      <p style={{ ...S.p, textIndent: 0 }}>학부모님, 안녕하십니까?</p>
      {greeting && SEASON_GREETING[month] && <p style={S.p}>{SEASON_GREETING[month]}</p>}
      {paras.map((t, i) => <p key={i} style={S.p}>{t}</p>)}

      {rows.length > 0 && (
        <>
          <div style={S.below}>- 아 래 -</div>
          <table style={S.table}>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}><th style={S.th}>{row.label}</th><td style={S.td}>{row.value}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {letter.closing && <p style={S.p}>{letter.closing}</p>}

      <div style={S.sign}>{date.replace(/\(.\)$/, '')}</div>
      <div style={S.signName}>{school.principal}</div>

      {r.enabled && (
        <div style={{ breakInside: 'avoid' }}>
          <div style={S.cut}><span style={S.cutLabel}>자르는 선</span></div>
          <div style={S.replyTitle}>{r.title || '회신서'}</div>
          {split(r.options).length > 0 && (
            <p style={{ margin: '0 0 8pt' }}>
              {r.question && <>{r.question} &nbsp;</>}
              {split(r.options).map((o, i) => <span key={i} style={{ marginRight: '18pt', whiteSpace: 'nowrap' }}>□ {o}</span>)}
            </p>
          )}
          {split(r.fields).map((f, i) => (
            <p key={i} style={{ margin: '0 0 8pt' }}>{f}: <span style={{ ...S.line, minWidth: '300pt' }}>&nbsp;</span></p>
          ))}
          <p style={{ margin: '12pt 0 4pt', textAlign: 'right' }}>
            (&nbsp;&nbsp;&nbsp;)학년 (&nbsp;&nbsp;&nbsp;)반 (&nbsp;&nbsp;&nbsp;)번 &nbsp; 학생 이름: <span style={S.line}>&nbsp;</span>
          </p>
          <p style={{ margin: '0 0 12pt', textAlign: 'right' }}>보호자: <span style={S.line}>&nbsp;</span> (서명)</p>
          {r.due && <p style={{ margin: '0', fontSize: '10pt' }}>※ {r.due}까지 담임 선생님께 보내 주세요.</p>}
          <div style={{ ...S.signName, fontSize: '12pt', marginTop: '12pt' }}>{school.principal} 귀하</div>
        </div>
      )}
    </div>
  )
}

export function Newsletter() {
  const [school, setSchool] = useState<School>(loadSchool)
  const [tplId, setTplId] = useState('field-trip')
  const [letter, setLetter] = useState<Letter>(() => structuredClone(TEMPLATES.find(t => t.id === 'field-trip')!.letter))
  const [date, setDate] = useState(today)
  const [greeting, setGreeting] = useState(true)
  const [copied, setCopied] = useState('')
  const docRef = useRef<HTMLDivElement>(null)

  useEffect(() => saveSchool(school), [school])

  const pickTemplate = (id: string) => {
    setTplId(id)
    setLetter(structuredClone(TEMPLATES.find(t => t.id === id)!.letter))
  }
  const setL = <K extends keyof Letter>(k: K, v: Letter[K]) => setLetter(l => ({ ...l, [k]: v }))
  const setRow = (i: number, patch: Partial<Row>) => setL('rows', letter.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const setReply = (patch: Partial<Letter['reply']>) => setL('reply', { ...letter.reply, ...patch })

  const saveHwpx = async () => {
    if (!docRef.current) return
    setCopied('한글 파일 만드는 중… (처음 한 번은 한글 엔진을 받아요)')
    try {
      downloadBlob(await htmlToHwpx(docRef.current.innerHTML), `${(letter.title || '가정통신문').replace(/[\\/:*?"<>|]/g, '_')}.hwpx`)
      setCopied('한글 파일로 저장했어요.')
    } catch (e) { setCopied(`한글 파일을 만들지 못했어요: ${(e as Error).message ?? e}`) }
  }

  const copyForHwp = async () => {
    const node = docRef.current
    if (!node) return
    const html = `<html><body>${node.innerHTML}</body></html>`
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([node.innerText], { type: 'text/plain' }),
      })])
      setCopied('복사했어요. 한글에서 Ctrl+V로 붙여넣으세요.')
    } catch {
      const range = document.createRange()
      range.selectNodeContents(node)
      const sel = getSelection()
      sel?.removeAllRanges(); sel?.addRange(range)
      const ok = document.execCommand('copy')
      sel?.removeAllRanges()
      setCopied(ok ? '복사했어요. 한글에서 Ctrl+V로 붙여넣으세요.' : '복사하지 못했어요. 미리보기를 드래그해서 복사해 주세요.')
    }
    setTimeout(() => setCopied(''), 4000)
  }

  return (
    <div className="nl">
      <div className="stack no-print">
        <section className="panel">
          <div className="panel-head"><h2>학교 정보</h2><span className="meta">이 브라우저에 기억돼요</span></div>
          <div className="row">
            <label className="field grow">학교 이름<input value={school.name} onChange={e => setSchool({ ...school, name: e.target.value })} /></label>
            <label className="field grow">발행 명의<input value={school.principal} onChange={e => setSchool({ ...school, principal: e.target.value })} /></label>
          </div>
          <div className="row">
            <label className="field grow">담당·연락처<input value={school.contact} onChange={e => setSchool({ ...school, contact: e.target.value })} /></label>
            <label className="field">학교 로고 (선택)
              <input type="file" accept="image/*" onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                // 로고는 학교 정보와 함께 브라우저에 저장하는데, 크면 저장 한도를 넘어 다른 정보까지 저장이 안 된다
                if (f.size > 300_000) { setCopied('로고는 300KB 이하 그림으로 넣어 주세요.'); e.target.value = ''; return }
                const rd = new FileReader()
                rd.onload = () => setSchool(s => ({ ...s, logo: String(rd.result) }))
                rd.readAsDataURL(f)
              }} />
            </label>
            {school.logo && <button className="btn text" onClick={() => setSchool({ ...school, logo: null })}>로고 빼기</button>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>내용</h2><span className="meta">틀을 고르면 예시 내용이 채워져요</span></div>
          <div className="tpl-tabs" role="tablist" aria-label="가정통신문 틀">
            {TEMPLATES.map(t => (
              <button key={t.id} role="tab" aria-selected={tplId === t.id} className={`tpl-tab${tplId === t.id ? ' on' : ''}`} onClick={() => pickTemplate(t.id)}>{t.name}</button>
            ))}
          </div>
          <div className="row">
            <label className="field grow">제목<input value={letter.title} onChange={e => setL('title', e.target.value)} /></label>
            <label className="field">발행일<input value={date} onChange={e => setDate(e.target.value)} style={{ width: 150 }} /></label>
          </div>
          <label className="check"><input type="checkbox" checked={greeting} onChange={e => setGreeting(e.target.checked)} /> 계절 인사 넣기 (발행일의 달에 맞춰 바뀌어요)</label>
          <label className="field">본문
            <textarea rows={5} value={letter.body} onChange={e => setL('body', e.target.value)} />
          </label>
          <div className="field">안내 표
            <div className="kv">
              {letter.rows.map((r, i) => (
                <div key={i} className="kv-row">
                  <input aria-label={`${i + 1}번째 항목 이름`} value={r.label} onChange={e => setRow(i, { label: e.target.value })} />
                  <input aria-label={`${i + 1}번째 항목 내용`} value={r.value} onChange={e => setRow(i, { value: e.target.value })} />
                  <button className="btn text small" onClick={() => setL('rows', letter.rows.filter((_, k) => k !== i))}>빼기</button>
                </div>
              ))}
            </div>
            <div><button className="btn small" onClick={() => setL('rows', [...letter.rows, { label: '', value: '' }])}>줄 더하기</button></div>
          </div>
          <label className="field">맺음말<input value={letter.closing} onChange={e => setL('closing', e.target.value)} /></label>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>회신서</h2>
            <label className="check"><input type="checkbox" checked={letter.reply.enabled} onChange={e => setReply({ enabled: e.target.checked })} /> 붙이기</label>
          </div>
          {letter.reply.enabled ? (
            <>
              <div className="row">
                <label className="field grow">회신서 제목<input value={letter.reply.title} onChange={e => setReply({ title: e.target.value })} /></label>
                <label className="field">회신 기한<input value={letter.reply.due} onChange={e => setReply({ due: e.target.value })} style={{ width: 150 }} /></label>
              </div>
              <div className="row">
                <label className="field grow">묻는 말<input value={letter.reply.question} onChange={e => setReply({ question: e.target.value })} /></label>
                <label className="field grow">고를 것 (쉼표로 구분)<input value={letter.reply.options} onChange={e => setReply({ options: e.target.value })} /></label>
              </div>
              <label className="field">보호자가 적을 칸 (쉼표로 구분)<input value={letter.reply.fields} onChange={e => setReply({ fields: e.target.value })} placeholder="비상 연락처, 건강상 유의할 점" /></label>
            </>
          ) : <p className="note">회신이 필요하면 '붙이기'를 켜세요. 자르는 선 아래에 회신서가 붙어요.</p>}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>내보내기</h2></div>
          <div className="row">
            <button className="btn primary" onClick={() => print()}>인쇄 · PDF로 저장</button>
            <button className="btn" onClick={saveHwpx}>한글(HWPX)로 저장</button>
            <button className="btn" onClick={copyForHwp}>한글에 붙여넣기용 복사</button>
          </div>
          <p className="note" aria-live="polite">{copied || '인쇄 창에서 배율 100%, 머리글·바닥글 끄기로 설정하세요. 한글에 붙여넣으면 글자와 표가 함께 들어가요.'}</p>
        </section>
      </div>

      <div className="nl-preview">
        <div className="nl-sheet" ref={docRef}>
          <Doc school={school} letter={letter} date={date} greeting={greeting} />
        </div>
      </div>
    </div>
  )
}
