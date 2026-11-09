import { useEffect, useState } from 'react'

// 담임 입장의 일반적인 순서. 학교·교육청마다 담당과 서류가 달라서 고칠 수 있게 메모 칸을 둔다
const STEPS = {
  in: [
    ['서류', '전입 서류(전입학 통지서 등)가 교무실·행정실에 접수됐는지 확인'],
    ['나이스', '학적 담당이 나이스 전입 처리 → 우리 반 배정·번호 확인'],
    ['나이스', '이전 학교 생활기록부·건강기록부가 넘어왔는지 확인'],
    ['학생', '보호자 연락처, 알레르기·건강 정보, 하교 방법·돌봄 여부 확인'],
    ['학급', '교과서 지급, 사물함·신발장·책상 이름표 붙이기 (라벨지 메이커)'],
    ['학급', '학급 명단·출석부·모둠 갱신 (회신서 취합의 우리 반 명단도)'],
    ['행정', '급식·우유, 방과후 신청 안내, 학급 소통방·e알리미 초대'],
    ['적응', '반 친구 소개, 짝·도우미 정하기, 1~2주 뒤 적응 상담'],
  ],
  out: [
    ['학생', '보호자에게 전학 예정일·새 학교(주소) 확인'],
    ['나이스', '학적 담당에게 알리고 전출 처리 날짜 맞추기'],
    ['나이스', '전출일 전날까지 출결 입력 마감'],
    ['나이스', '그때까지의 평가·누가 기록, 생활기록부 입력 마무리'],
    ['보건', '건강기록부 확인 (보건실)'],
    ['행정', '급식비·방과후비 정산 안내 (행정실), 우유 중단'],
    ['학급', '교과서·도서관 책·학급 물품 반납, 사물함 비우기'],
    ['학급', '학급 명단에서 빼기, 작별 인사'],
  ],
} as const
type Kind = keyof typeof STEPS
const STORE = 'ssamtool.transfer.v1'
interface State { kind: Kind; name: string; date: string; done: Record<string, boolean>; memo: string }

export function Transfer() {
  const [s, setS] = useState<State>(() => {
    try { return { kind: 'in', name: '', date: '', done: {}, memo: '', ...JSON.parse(localStorage.getItem(STORE) ?? '{}') } } catch { return { kind: 'in', name: '', date: '', done: {}, memo: '' } }
  })
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* 저장 못 해도 동작에는 문제 없음 */ } }, [s])
  const upd = (p: Partial<State>) => setS(x => ({ ...x, ...p }))
  const steps = STEPS[s.kind]
  const left = steps.filter((_, i) => !s.done[`${s.kind}${i}`]).length

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="tpl-tabs" role="tablist" aria-label="전입·전출">
          {(['in', 'out'] as Kind[]).map(k => <button key={k} role="tab" aria-selected={s.kind === k} className={`tpl-tab${s.kind === k ? ' on' : ''}`} onClick={() => upd({ kind: k })}>{k === 'in' ? '전입 학생' : '전출 학생'}</button>)}
        </div>
        <div className="row">
          <label className="field">학생 이름<input value={s.name} onChange={e => upd({ name: e.target.value })} style={{ width: 120 }} /></label>
          <label className="field">{s.kind === 'in' ? '전입일' : '전출일'}<input type="date" value={s.date} onChange={e => upd({ date: e.target.value })} /></label>
        </div>
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 8 }}>
          {steps.map(([tag, text], i) => {
            const key = `${s.kind}${i}`
            return (
              <li key={key}>
                <label className="check" style={{ alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={!!s.done[key]} onChange={e => upd({ done: { ...s.done, [key]: e.target.checked } })} />
                  <span style={{ textDecoration: s.done[key] ? 'line-through' : undefined, color: s.done[key] ? 'var(--muted)' : undefined }}><b className="hint">{tag}</b> {text}</span>
                </label>
              </li>
            )
          })}
        </ul>
        <div className="row">
          <button className="btn" onClick={() => print()}>체크리스트 인쇄</button>
          <button className="btn text small" onClick={() => upd({ done: Object.fromEntries(Object.entries(s.done).filter(([k]) => !k.startsWith(s.kind))), name: '', date: '' })}>새 학생으로 비우기</button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>남은 일 {left}개</h2><span className="meta">이 브라우저에 기억돼요</span></div>
        <label className="field">우리 학교 메모 (담당자·서류 이름 등)
          <textarea rows={10} value={s.memo} onChange={e => upd({ memo: e.target.value })} placeholder={'예) 학적 담당: 교무실 ○○○ 선생님 (내선 123)\n전입 서류는 행정실에서 먼저 받음'} />
        </label>
        <p className="note">학교·교육청마다 담당자와 순서가 조금씩 달라요. 이 목록은 담임이 챙길 일을 빠뜨리지 않게 돕는 것이고, 나이스 처리는 학교 학적 담당자의 안내를 따르세요.</p>
      </section>
    </div>
  )
}
