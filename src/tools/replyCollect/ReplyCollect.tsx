import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../../lib/files'
import { loadRoster, parseRoster, saveRoster, type Student } from '../../lib/roster'

interface State {
  title: string
  due: string
  className: string
  options: string[]
  roster: Student[]
  answers: Record<number, number> // 번호 → 고른 선택지 번호. 없으면 미제출
}

const STORE = 'ssamtool.replies.v1'
const SAMPLE_NAMES = '김하늘 이도윤 박서연 최지호 정하은 강민준 조서아 윤시우 장예린 임도현 한지안 오유준 서하린 신은우 권나연 황지후 안소율 송건우 류채원 전태윤 홍다인 문시현 양주원 배수아'.split(' ')
const DEFAULT: State = {
  title: '현장체험학습 참가 동의서',
  due: '11. 13.(금)',
  className: '4학년 2반',
  options: ['동의', '동의하지 않음'],
  roster: SAMPLE_NAMES.map((name, i) => ({ no: i + 1, name })),
  answers: { 1: 0, 2: 0, 3: 0, 5: 1, 6: 0, 7: 0, 9: 0, 10: 0, 11: 0, 12: 0, 14: 0, 15: 0, 16: 0, 18: 0, 19: 0, 20: 0, 21: 1, 23: 0, 24: 0 },
}

function load(): { s: State; sample: boolean } {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    if (v) return { s: v, sample: false }
  } catch { /* 저장된 것이 없으면 예시로 시작 */ }
  const roster = loadRoster()
  if (roster.length) return { s: { ...DEFAULT, roster, answers: {} }, sample: false }
  return { s: DEFAULT, sample: true }
}

export function ReplyCollect() {
  const init = useMemo(load, [])
  const [s, setS] = useState<State>(init.s)
  const [isSample, setIsSample] = useState(init.sample)
  const [rosterText, setRosterText] = useState('')
  const [respText, setRespText] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => { if (!isSample) try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* 저장 못 해도 동작에는 문제 없음 */ } }, [s, isSample])

  // 예시 명단인 동안은 저장하지 않는다. 우리 반 명단을 넣어야(roster) 진짜 기록이 된다
  const upd = (patch: Partial<State>) => { setS(p => ({ ...p, ...patch })); if (patch.roster) setIsSample(false) }
  const [optText, setOptText] = useState(() => init.s.options.join(', '))
  const applyOptions = () => {
    const options = optText.split(',').map(x => x.trim()).filter(Boolean)
    if (!options.length || options.join() === s.options.join()) return
    // 글자만 고쳤으면 응답을 그대로 두고, 선택지 수가 바뀌면 번호가 어긋나므로 비운다
    upd({ options, answers: options.length === s.options.length ? s.answers : {} })
  }

  // 누를 때마다 미제출 → 첫째 선택지 → 둘째 … → 미제출
  const cycle = (no: number) => {
    const cur = s.answers[no]
    const next = cur === undefined ? 0 : cur + 1 < s.options.length ? cur + 1 : undefined
    const answers = { ...s.answers }
    if (next === undefined) delete answers[no]; else answers[no] = next
    upd({ answers })
  }

  const counts = s.options.map((_, k) => s.roster.filter(st => s.answers[st.no] === k).length)
  const missing = s.roster.filter(st => s.answers[st.no] === undefined)
  const submitted = s.roster.length - missing.length

  const applyRoster = () => {
    const roster = parseRoster(rosterText)
    if (!roster.length) { setMsg('명단에서 이름을 찾지 못했어요. 번호와 이름이 한 줄에 하나씩 있는지 확인해 주세요.'); return }
    upd({ roster, answers: {} })
    saveRoster(roster)
    setRosterText('')
    setMsg(`${roster.length}명 명단을 넣었어요. 응답은 모두 미제출로 시작해요.`)
  }

  const applyResponses = () => {
    const answers = { ...s.answers }
    const unmatched: string[] = []
    let n = 0
    respText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const st = s.roster.find(x => line.includes(x.name))
      // 긴 선택지부터 맞춰 봐야 '동의하지 않음'이 '동의'로 잡히지 않는다
      let k = s.options.map((o, i) => ({ o, i })).sort((a, b) => b.o.length - a.o.length).find(({ o }) => line.includes(o))?.i
      // "동의하지 않습니다"처럼 선택지와 글자가 조금 다른 부정 답은 부정 선택지로, 없으면 맞추지 않는다
      const NEG = /않|아니|불참|미참|안\s?함|반대|거부/
      if (NEG.test(st ? line.replace(st.name, '') : line) && !(k !== undefined && NEG.test(s.options[k]))) {
        const neg = s.options.findIndex(o => NEG.test(o))
        k = neg >= 0 ? neg : undefined
      }
      if (st && k !== undefined) { answers[st.no] = k; n++ } else if (!/이름|성명|응답|타임스탬프/.test(line)) unmatched.push(line.slice(0, 20))
    })
    upd({ answers })
    setRespText('')
    setMsg(`${n}명 응답을 넣었어요.${unmatched.length ? ` 맞추지 못한 줄 ${unmatched.length}개: ${unmatched.slice(0, 3).join(' / ')}${unmatched.length > 3 ? ' …' : ''}` : ''}`)
  }

  // 받침이 있으면 '을', 없으면 '를'
  const last = s.title.trim().charCodeAt(s.title.trim().length - 1)
  const eul = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 ? '을' : '를'
  const notice = `[${s.className}] ${s.title}${eul} 아직 내지 않은 학생이 ${missing.length}명 있어요. ${s.due}까지 꼭 보내 주세요. 이미 보내 주신 가정은 감사합니다.`
  const missingList = missing.map(st => `${st.no}. ${st.name}`).join('\n')

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what) } catch { setCopied('') }
    setTimeout(() => setCopied(''), 1800)
  }

  const saveXlsx = () => {
    const rows = [['번호', '이름', '회신'], ...s.roster.map(st => [st.no, st.name, s.answers[st.no] === undefined ? '미제출' : s.options[s.answers[st.no]]])]
    rows.push([], ['합계', '', ''], ...s.options.map((o, k) => ['', o, counts[k]]), ['', '미제출', missing.length])
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '회신 현황')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${s.className} ${s.title} 회신 현황.xlsx`)
  }

  const pct = (n: number) => (s.roster.length ? (n / s.roster.length) * 100 : 0)

  return (
    <div className="stack rc">
      <section className="panel">
        <div className="panel-head">
          <h2>{s.className} · {s.title}</h2>
          <span className="meta">{isSample ? '예시 명단이에요. 아래에서 우리 반 명단을 넣으세요.' : `회신 기한 ${s.due}`}</span>
        </div>
        <div className="rc-summary">
          <div className="rc-big"><b className="num">{submitted}</b><span className="num">/ {s.roster.length}명 제출</span></div>
          <div className="rc-counts">
            {s.options.map((o, k) => <span key={o} className="num"><i className={`sw k${k}`} />{o} {counts[k]}명</span>)}
            <span className="num"><i className="sw miss" />미제출 {missing.length}명</span>
          </div>
        </div>
        <div className="rc-bar" aria-hidden="true">
          {s.options.map((o, k) => <i key={o} className={`k${k}`} style={{ width: `${pct(counts[k])}%` }} />)}
        </div>
        <p className="note">학생 칸을 누를 때마다 {s.options.join(' → ')} → 미제출 순서로 바뀌어요. 종이 회신서를 걷으면서 바로 누르면 돼요.</p>
        <div className="rc-grid">
          {s.roster.map(st => {
            const a = s.answers[st.no]
            return (
              <button key={st.no} className={`rc-st ${a === undefined ? 'miss' : `k${a}`}`} onClick={() => cycle(st.no)} aria-label={`${st.no}번 ${st.name}: ${a === undefined ? '미제출' : s.options[a]}`}>
                <span className="num">{st.no}</span>
                <b>{st.name}</b>
                <small>{a === undefined ? '미제출' : s.options[a]}</small>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid-2 even">
        <section className="panel">
          <div className="panel-head"><h2>미제출 안내</h2><span className="meta" aria-live="polite">{copied && `${copied} 복사됨`}</span></div>
          <div className="pm-label">알림장·문자용 (학생 이름 없이)</div>
          <pre className="pm-body">{missing.length ? notice : '모두 제출했어요.'}</pre>
          <div className="pm-label">선생님 확인용 미제출 명단</div>
          <pre className="pm-body">{missingList || '없음'}</pre>
          <div className="row">
            <button className="btn primary" disabled={!missing.length} onClick={() => copy(notice, '안내 문구')}>안내 문구 복사</button>
            <button className="btn" disabled={!missing.length} onClick={() => copy(missingList, '미제출 명단')}>명단 복사</button>
            <button className="btn" onClick={saveXlsx}>현황 엑셀 저장</button>
          </div>
          <p className="note">여러 가정이 보는 알림장에는 학생 이름을 넣지 않았어요.</p>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>설정과 명단</h2></div>
          <div className="row">
            <label className="field">학급<input value={s.className} onChange={e => upd({ className: e.target.value })} style={{ width: 120 }} /></label>
            <label className="field grow">회신서 이름<input value={s.title} onChange={e => upd({ title: e.target.value })} /></label>
            <label className="field">기한<input value={s.due} onChange={e => upd({ due: e.target.value })} style={{ width: 120 }} /></label>
          </div>
          <label className="field">선택지 (쉼표로 구분)
            <input value={optText} onChange={e => setOptText(e.target.value)} onBlur={applyOptions} />
            <span className="hint">선택지 수를 바꾸면 받은 응답이 비워져요.</span>
          </label>
          <details className="pm-paste">
            <summary>우리 반 명단 넣기 (라벨·상담주간·체험학습에서도 같이 써요)</summary>
            <textarea rows={4} value={rosterText} onChange={e => setRosterText(e.target.value)} aria-label="학급 명단" placeholder={'1\t김하늘\n2\t이도윤'} />
            <div className="row"><button className="btn small" disabled={!rosterText.trim()} onClick={applyRoster}>명단 바꾸기</button></div>
          </details>
          <details className="pm-paste">
            <summary>온라인 응답 붙여넣기 (구글 설문·e알리미 엑셀)</summary>
            <textarea rows={4} value={respText} onChange={e => setRespText(e.target.value)} aria-label="응답 붙여넣기" placeholder={'김하늘\t동의\n이도윤\t동의하지 않음'} />
            <div className="row"><button className="btn small" disabled={!respText.trim()} onClick={applyResponses}>응답 넣기</button></div>
          </details>
          <p className="note" aria-live="polite">{msg || '명단과 응답은 이 브라우저에만 저장돼요. 다른 회신서를 걷을 때는 이름과 선택지만 바꾸면 응답이 비워져요.'}</p>
          <div><button className="btn text small" onClick={() => upd({ answers: {} })}>응답 모두 비우기</button></div>
        </section>
      </div>
    </div>
  )
}
