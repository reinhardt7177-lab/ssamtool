import { useEffect, useMemo, useRef, useState } from 'react'
import { daysBetween, DAY_KO, fmt, fromIso, iso, parseOffDays } from './days'
import '../newsletter/newsletter.css'
import { loadSchool, saveSchool } from '../../lib/school'
import { loadRoster } from '../../lib/roster'
import { htmlToHwpx } from '../../lib/hwp'
import { downloadBlob } from '../../lib/files'

interface Form {
  school: string; grade: string; cls: string; no: string; name: string
  start: string; end: string
  kind: string; place: string; purpose: string
  guardian: string; relation: string; phone: string; companions: string
  plans: Record<string, string>
  review: string
  applyDate: string
}
interface Rules { maxDays: number; used: number; leadDays: number; offText: string }

const KINDS = ['가족 동반 여행', '친인척 방문', '견학 활동', '체험 활동', '기타']
const STORE_RULES = 'ssamtool.fieldtrip.rules.v1'

const plus = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return iso(d) }

const SAMPLE: Form = {
  school: '○○초등학교', grade: '4', cls: '2', no: '7', name: '조서아',
  start: plus(9), end: plus(11),
  kind: '가족 동반 여행', place: '경상북도 경주시 일원',
  purpose: '불국사·석굴암과 국립경주박물관을 둘러보며 사회 시간에 배운 신라 문화를 직접 보고 느낀다.',
  guardian: '조○○', relation: '부', phone: '010-0000-0000', companions: '어머니, 동생',
  plans: {}, review: '', applyDate: iso(new Date()),
}

function loadRules(): Rules {
  try { return { maxDays: 20, used: 0, leadDays: 3, offText: '', ...JSON.parse(localStorage.getItem(STORE_RULES) ?? '{}') } } catch { return { maxDays: 20, used: 0, leadDays: 3, offText: '' } }
}

const cell = { border: '1px solid #555', padding: '5pt 8pt', verticalAlign: 'top' as const }
const head = { ...cell, background: '#f0f0f0', fontWeight: 700, textAlign: 'center' as const, width: '18%', verticalAlign: 'middle' as const }
const docStyle = { fontFamily: '"맑은 고딕", "Malgun Gothic", sans-serif', fontSize: '10.5pt', lineHeight: 1.6, color: '#111' }
const titleStyle = { fontSize: '19pt', fontWeight: 700, textAlign: 'center' as const, margin: '0 0 14pt', letterSpacing: '1pt' }
const table = { width: '100%', borderCollapse: 'collapse' as const }

export function FieldTrip() {
  const [f, setF] = useState<Form>(() => {
    return { ...SAMPLE, school: loadSchool().name }
  })
  const [isSample, setIsSample] = useState(true)
  const [rules, setRules] = useState<Rules>(loadRules)
  const [doc, setDoc] = useState<'apply' | 'report'>('apply')

  useEffect(() => { try { localStorage.setItem(STORE_RULES, JSON.stringify(rules)) } catch { /* 저장 못 해도 동작에는 문제 없음 */ } }, [rules])
  useEffect(() => saveSchool({ name: f.school }), [f.school])
  const sheet = useRef<HTMLDivElement>(null)
  const roster = useMemo(loadRoster, [])
  const [hwpMsg, setHwpMsg] = useState('')
  const saveHwpx = async () => {
    if (!sheet.current) return
    setHwpMsg('한글 파일 만드는 중… (처음 한 번은 한글 엔진을 받아요)')
    try {
      downloadBlob(await htmlToHwpx(sheet.current.innerHTML), `교외체험학습_${doc === 'apply' ? '신청서' : '결과보고서'}_${f.name || '학생'}.hwpx`)
      setHwpMsg('')
    } catch (e) { setHwpMsg(`한글 파일을 만들지 못했어요: ${(e as Error).message ?? e}`) }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF(p => ({ ...p, [k]: v })); setIsSample(false) }
  const days = useMemo(() => daysBetween(f.start, f.end, parseOffDays(rules.offText)), [f.start, f.end, rules.offText])
  const schoolDays = days.filter(d => d.kind === 'school').length
  const left = rules.maxDays - rules.used - schoolDays
  const lead = f.start ? Math.round((fromIso(f.start).getTime() - fromIso(f.applyDate).getTime()) / 86400000) : 0
  const tooLate = !!f.start && lead < rules.leadDays
  const stu = `${f.grade}학년 ${f.cls}반 ${f.no}번`
  const period = days.length ? `${fmt(f.start)} ~ ${fmt(f.end)}` : ''
  const periodLine = days.length ? `${period}  (수업일 ${schoolDays}일${days.length > schoolDays ? `, 전체 ${days.length}일` : ''})` : ''

  const Signature = ({ who }: { who: string }) => (
    <div style={{ marginTop: '14pt', textAlign: 'right' as const, lineHeight: 2.2 }}>
      <div>{fmt(f.applyDate).replace(/\(.\)$/, '')}</div>
      <div>{who}: {f.guardian || '　　　　'} (서명)</div>
    </div>
  )

  return (
    <div className="nl">
      <div className="stack no-print">
        <section className="panel">
          <div className="panel-head"><h2>학생과 기간</h2><span className="meta">{isSample ? '예시 내용이에요. 실제 내용으로 바꿔 넣으세요.' : stu}</span></div>
          <div className="row">
            <label className="field grow">학교<input value={f.school} onChange={e => set('school', e.target.value)} /></label>
            <label className="field">학년<input className="num" value={f.grade} onChange={e => set('grade', e.target.value)} style={{ width: 56 }} /></label>
            <label className="field">반<input className="num" value={f.cls} onChange={e => set('cls', e.target.value)} style={{ width: 56 }} /></label>
            <label className="field">번호<input className="num" value={f.no} onChange={e => set('no', e.target.value)} style={{ width: 56 }} /></label>
            <label className="field">이름<input value={f.name} onChange={e => set('name', e.target.value)} style={{ width: 110 }} /></label>
            {roster.length > 0 && (
              <label className="field">우리 반에서 고르기
                <select value="" onChange={e => { const x = roster[Number(e.target.value)]; if (x) { set('no', String(x.no)); set('name', x.name) } }}>
                  <option value="">학생 선택</option>
                  {roster.map((x, k) => <option key={k} value={k}>{x.no}. {x.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="row">
            <label className="field">시작일<input type="date" value={f.start} onChange={e => set('start', e.target.value)} /></label>
            <label className="field">끝나는 날<input type="date" value={f.end} min={f.start} onChange={e => set('end', e.target.value)} /></label>
            <label className="field">신청일<input type="date" value={f.applyDate} onChange={e => set('applyDate', e.target.value)} /></label>
          </div>

          {days.length > 0 && (
            <div className="ft-days" aria-label="기간 달력">
              {days.map(d => {
                const dt = fromIso(d.date)
                return (
                  <span key={d.date} className={`ft-day ${d.kind}`} title={d.note || '수업일'}>
                    <b className="num">{dt.getMonth() + 1}/{dt.getDate()}</b><small>{DAY_KO[dt.getDay()]}</small>
                  </span>
                )
              })}
            </div>
          )}
          <div className="ft-sum">
            <div><b className="num">{schoolDays}</b> 수업일 <span className="note">{days.length > schoolDays ? `(주말·공휴일 ${days.length - schoolDays}일 빼고)` : ''}</span></div>
            <div className={`num${left < 0 ? ' warn' : ''}`}>{left < 0 ? `연간 허용 ${rules.maxDays}일을 ${-left}일 넘어요` : `올해 남는 일수 ${left}일 (허용 ${rules.maxDays}일, 이미 사용 ${rules.used}일)`}</div>
          </div>
          {tooLate && <p className="note warn">학교 규정상 시작 {rules.leadDays}일 전까지 신청해야 해요. 지금은 {lead < 0 ? '이미 시작일이 지났어요' : `${lead}일 전`}이에요.</p>}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>체험학습 내용</h2></div>
          <div className="row">
            <label className="field">형태<select value={f.kind} onChange={e => set('kind', e.target.value)}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></label>
            <label className="field grow">장소<input value={f.place} onChange={e => set('place', e.target.value)} /></label>
          </div>
          <label className="field">목적<textarea rows={2} value={f.purpose} onChange={e => set('purpose', e.target.value)} /></label>
          <div className="row">
            <label className="field">보호자(인솔자)<input value={f.guardian} onChange={e => set('guardian', e.target.value)} style={{ width: 110 }} /></label>
            <label className="field">관계<input value={f.relation} onChange={e => set('relation', e.target.value)} style={{ width: 70 }} /></label>
            <label className="field">연락처<input value={f.phone} onChange={e => set('phone', e.target.value)} style={{ width: 150 }} /></label>
            <label className="field grow">동행자<input value={f.companions} onChange={e => set('companions', e.target.value)} /></label>
          </div>
          {days.length > 0 && (
            <div className="field">날짜별 계획
              <div className="kv">
                {days.map(d => (
                  <div key={d.date} className="kv-row">
                    <span className="num hint" style={{ fontSize: 13 }}>{fmt(d.date).replace(/^\d{4}\. /, '')}</span>
                    <input aria-label={`${fmt(d.date)} 계획`} value={f.plans[d.date] ?? ''} onChange={e => set('plans', { ...f.plans, [d.date]: e.target.value })} placeholder={d.kind === 'school' ? '예) 불국사, 석굴암 관람' : d.note} />
                    <span />
                  </div>
                ))}
              </div>
            </div>
          )}
          <label className="field">결과보고서: 체험 내용과 느낀 점 (학생이 씀)<textarea rows={3} value={f.review} onChange={e => set('review', e.target.value)} placeholder="결과보고서에 들어가요. 비워 두면 손으로 쓰는 칸이 생겨요." /></label>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>학교 규정</h2><span className="meta">이 브라우저에 기억돼요</span></div>
          <div className="row">
            <label className="field">연간 허용 일수<input type="number" min={0} value={rules.maxDays} onChange={e => setRules({ ...rules, maxDays: Number(e.target.value) })} /></label>
            <label className="field">이미 사용한 일수<input type="number" min={0} value={rules.used} onChange={e => setRules({ ...rules, used: Number(e.target.value) })} /></label>
            <label className="field">신청 기한 (시작 며칠 전)<input type="number" min={0} value={rules.leadDays} onChange={e => setRules({ ...rules, leadDays: Number(e.target.value) })} /></label>
          </div>
          <label className="field">학교 휴업일 (한 줄에 하나, 예: 2026-11-02 재량휴업일)
            <textarea rows={2} value={rules.offText} onChange={e => setRules({ ...rules, offText: e.target.value })} />
          </label>
          <p className="note">2026년 공휴일과 대체공휴일은 이미 빼고 셉니다. 허용 일수와 신청 기한은 학교·교육청마다 다르니 학교 규정에 맞게 고치세요.</p>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>인쇄</h2></div>
          <div className="tpl-tabs" role="tablist" aria-label="서류 종류">
            <button role="tab" aria-selected={doc === 'apply'} className={`tpl-tab${doc === 'apply' ? ' on' : ''}`} onClick={() => setDoc('apply')}>신청서</button>
            <button role="tab" aria-selected={doc === 'report'} className={`tpl-tab${doc === 'report' ? ' on' : ''}`} onClick={() => setDoc('report')}>결과보고서</button>
          </div>
          <div className="row"><button className="btn primary" onClick={() => print()}>{doc === 'apply' ? '신청서' : '결과보고서'} 인쇄 · PDF로 저장</button><button className="btn" onClick={saveHwpx}>한글(HWPX)로 저장</button></div>
          {hwpMsg && <p className="note" aria-live="polite">{hwpMsg}</p>}
        </section>
      </div>

      <div className="nl-preview">
        <div className="nl-sheet" ref={sheet}>
          {doc === 'apply' ? (
            <div style={docStyle}>
              <div style={titleStyle}>교외체험학습 신청서</div>
              <table style={table}><tbody>
                <tr><th style={head}>학생</th><td style={cell}>{stu} &nbsp; 이름: {f.name}</td></tr>
                <tr><th style={head}>기간</th><td style={cell}>{periodLine || '　'}</td></tr>
                <tr><th style={head}>형태</th><td style={cell}>{KINDS.map(k => <span key={k} style={{ marginRight: '10pt', whiteSpace: 'nowrap' }}>{k === f.kind ? '■' : '□'} {k}</span>)}</td></tr>
                <tr><th style={head}>장소</th><td style={cell}>{f.place}</td></tr>
                <tr><th style={head}>목적</th><td style={{ ...cell, height: '40pt' }}>{f.purpose}</td></tr>
                <tr><th style={head}>보호자<br />(인솔자)</th><td style={cell}>이름: {f.guardian} &nbsp; (관계: {f.relation}) &nbsp; 연락처: {f.phone}</td></tr>
                <tr><th style={head}>동행자</th><td style={cell}>{f.companions || '　'}</td></tr>
              </tbody></table>
              <div style={{ fontWeight: 700, margin: '12pt 0 4pt' }}>일정별 계획</div>
              <table style={table}><tbody>
                <tr><th style={{ ...head, width: '28%' }}>날짜</th><th style={{ ...head, width: 'auto' }}>체험 내용</th></tr>
                {(days.length ? days : [{ date: '', kind: 'school', note: '' }]).map((d, i) => (
                  <tr key={i}><td style={{ ...cell, textAlign: 'center' }}>{d.date ? fmt(d.date) : '　'}</td><td style={{ ...cell, height: '18pt' }}>{d.date ? f.plans[d.date] ?? '' : ''}</td></tr>
                ))}
              </tbody></table>
              <p style={{ margin: '12pt 0 0' }}>위와 같이 교외체험학습을 신청합니다. 체험학습 기간 동안 학생의 안전은 보호자가 책임지며, 다녀온 뒤 7일 안에 결과보고서를 내겠습니다.</p>
              <Signature who="보호자" />
              <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 700, margin: '16pt 0 12pt', letterSpacing: '2pt' }}>{f.school}장 귀하</div>
              <table style={table}><tbody>
                <tr><th style={head}>담임 확인</th><td style={cell}>□ 승인 &nbsp; □ 불허 &nbsp;&nbsp; 담임: <span style={{ display: 'inline-block', minWidth: '80pt', borderBottom: '1px solid #555' }}>&nbsp;</span> (인)</td></tr>
              </tbody></table>
            </div>
          ) : (
            <div style={docStyle}>
              <div style={titleStyle}>교외체험학습 결과보고서</div>
              <table style={table}><tbody>
                <tr><th style={head}>학생</th><td style={cell}>{stu} &nbsp; 이름: {f.name}</td></tr>
                <tr><th style={head}>기간</th><td style={cell}>{periodLine || '　'}</td></tr>
                <tr><th style={head}>장소</th><td style={cell}>{f.place}</td></tr>
                <tr><th style={head}>형태</th><td style={cell}>{f.kind}</td></tr>
                <tr><th style={head}>체험 내용과<br />느낀 점</th><td style={{ ...cell, height: '210pt', whiteSpace: 'pre-wrap' }}>{f.review}</td></tr>
                <tr><th style={head}>사진</th><td style={{ ...cell, height: '170pt', color: '#999', textAlign: 'center', verticalAlign: 'middle' }}>(체험 사진을 붙이세요)</td></tr>
              </tbody></table>
              <p style={{ margin: '12pt 0 0' }}>위와 같이 교외체험학습 결과를 보고합니다.</p>
              <Signature who="보호자" />
              <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 700, margin: '16pt 0 12pt', letterSpacing: '2pt' }}>{f.school}장 귀하</div>
              <table style={table}><tbody>
                <tr><th style={head}>담임 확인</th><td style={cell}>출석 인정 일수: {schoolDays}일 &nbsp;&nbsp; 담임: <span style={{ display: 'inline-block', minWidth: '80pt', borderBottom: '1px solid #555' }}>&nbsp;</span> (인)</td></tr>
              </tbody></table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
