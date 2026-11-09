import { useState } from 'react'
import { DocTool, S, lines } from '../../components/DocTool'
import { loadSchool } from '../../lib/school'

const SAMPLE = {
  title: '4학년 학년 협의회', date: '2026. 11. 12.(목) 15:00~16:00', place: '4학년 연구실', people: '4학년 담임 5명, 교무부장',
  agenda: '현장체험학습 사후 지도\n2학기 평가 일정', talk: '체험학습 소감문은 국어 시간에 함께 쓰기로 함\n평가 일정은 12월 첫째 주로 맞추자는 의견이 많았음',
  decide: '소감문 제출: 11. 20.(금)까지\n2학기 수행평가: 12. 1.(화)~12. 4.(금)', writer: '',
}

export function Minutes() {
  const [f, setF] = useState(SAMPLE)
  const set = (k: keyof typeof SAMPLE, v: string) => setF(p => ({ ...p, [k]: v }))
  const school = loadSchool().name
  const list = (s: string) => lines(s).map((l, i) => <div key={i}>{i + 1}. {l}</div>)
  const field = (k: keyof typeof SAMPLE, label: string, rows = 0) => (
    <label className="field grow">{label}
      {rows ? <textarea rows={rows} value={f[k]} onChange={e => set(k, e.target.value)} /> : <input value={f[k]} onChange={e => set(k, e.target.value)} />}
    </label>
  )
  const form = (
    <section className="panel">
      <div className="panel-head"><h2>회의 내용</h2><span className="meta">여러 줄 칸은 한 줄에 하나씩</span></div>
      <div className="row">{field('title', '회의 이름')}{field('date', '일시')}</div>
      <div className="row">{field('place', '장소')}{field('people', '참석자')}</div>
      {field('agenda', '안건', 3)}
      {field('talk', '협의 내용', 4)}
      {field('decide', '결정 사항', 3)}
      {field('writer', '작성자 (비우면 칸만)')}
    </section>
  )
  return (
    <DocTool form={form} fileName={`${f.title} 협의록`}>
      <div style={S.title}>{f.title || '협의회'} 협의록</div>
      <table style={S.table}><tbody>
        <tr><th style={{ ...S.head, width: '18%' }}>일시</th><td style={S.cell}>{f.date}</td></tr>
        <tr><th style={S.head}>장소</th><td style={S.cell}>{f.place}</td></tr>
        <tr><th style={S.head}>참석자</th><td style={S.cell}>{f.people}</td></tr>
        <tr><th style={S.head}>안건</th><td style={S.cell}>{list(f.agenda)}</td></tr>
        <tr><th style={S.head}>협의 내용</th><td style={{ ...S.cell, height: '120pt' }}>{list(f.talk)}</td></tr>
        <tr><th style={S.head}>결정 사항</th><td style={S.cell}>{list(f.decide)}</td></tr>
      </tbody></table>
      <p style={S.right}>작성자: {f.writer || '　　　　'} (서명)</p>
      <p style={{ ...S.center, fontWeight: 700, fontSize: '13pt' }}>{school}</p>
    </DocTool>
  )
}
