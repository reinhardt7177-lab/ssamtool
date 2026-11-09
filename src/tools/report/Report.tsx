import { useMemo, useState } from 'react'
import { DocTool, S, lines } from '../../components/DocTool'
import { parsePasted } from '../../lib/table'
import { loadSchool } from '../../lib/school'

const SAMPLE = {
  title: '2026학년도 4학년 현장체험학습 결과보고', period: '2026. 11. 20.(금) 09:00~15:00', target: '4학년 학생 112명, 인솔 교사 6명',
  did: '국립중앙과학관 상설 전시관 모둠별 탐구\n천체관 관람 및 과학 원리 체험\n사후 소감문 쓰기(국어 연계)',
  good: '교과서에서 배운 에너지·자석 단원을 직접 체험해 이해가 깊어짐\n모둠 활동으로 협력하는 태도가 길러짐',
  next: '이동 시간이 길어 체험 시간이 부족함 → 내년에는 가까운 장소도 검토',
  survey: '학년\t만족도\t다시 가고 싶은가요\n4\t매우 만족\t예\n4\t만족\t예\n4\t매우 만족\t예\n4\t보통\t아니요\n4\t만족\t예\n4\t매우 만족\t예',
}

// 설문 표: 답이 몇 가지로만 나뉘는 열(8가지 이하)을 문항으로 보고 답별 수와 비율을 센다
function surveyStats(text: string) {
  const t = parsePasted(text, true)
  return t.headers.map((q, i) => {
    const counts = new Map<string, number>()
    t.rows.forEach(r => { const a = (r[i] ?? '').trim(); if (a) counts.set(a, (counts.get(a) ?? 0) + 1) })
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    return { q, total, answers: [...counts].sort((a, b) => b[1] - a[1]) }
  }).filter(s => s.total && s.answers.length > 1 && s.answers.length <= 8 && !/타임스탬프|시간|이름|성명|번호/.test(s.q))
}

export function Report() {
  const [f, setF] = useState(SAMPLE)
  const set = (k: keyof typeof SAMPLE, v: string) => setF(p => ({ ...p, [k]: v }))
  const stats = useMemo(() => surveyStats(f.survey), [f.survey])
  const field = (k: keyof typeof SAMPLE, label: string, rows = 0) => (
    <label className="field grow">{label}
      {rows ? <textarea rows={rows} value={f[k]} onChange={e => set(k, e.target.value)} /> : <input value={f[k]} onChange={e => set(k, e.target.value)} />}
    </label>
  )
  const list = (s: string) => lines(s).map((l, i) => <div key={i} style={{ paddingLeft: '10pt' }}>{'가나다라마바사아자차'[i]}. {l}</div>)
  const form = (
    <>
      <section className="panel">
        <div className="panel-head"><h2>운영 결과</h2><span className="meta">여러 줄 칸은 한 줄에 하나씩</span></div>
        {field('title', '제목')}
        <div className="row">{field('period', '기간')}{field('target', '대상')}</div>
        {field('did', '운영 내용', 3)}
        {field('good', '성과', 3)}
        {field('next', '개선할 점', 2)}
      </section>
      <section className="panel">
        <div className="panel-head"><h2>설문 결과 (선택)</h2><span className="meta num">{stats.length}개 문항</span></div>
        <label className="field">구글 설문·엑셀 응답을 붙여넣기 (첫 줄은 문항)
          <textarea rows={6} value={f.survey} onChange={e => set('survey', e.target.value)} />
        </label>
        <p className="note">답이 8가지 이하로 나뉘는 문항만 표로 셉니다. 이름·번호·타임스탬프 열은 빼요.</p>
      </section>
    </>
  )
  let n = 1
  return (
    <DocTool form={form} fileName={f.title || '결과보고서'}>
      <div style={S.title}>{f.title || '결과보고서'}</div>
      <p style={{ fontWeight: 700 }}>{n++}. 개요</p>
      <div style={{ paddingLeft: '10pt' }}>가. 기간: {f.period}</div>
      <div style={{ paddingLeft: '10pt' }}>나. 대상: {f.target}</div>
      {lines(f.did).length > 0 && <><p style={{ fontWeight: 700 }}>{n++}. 운영 내용</p>{list(f.did)}</>}
      {stats.length > 0 && <>
        <p style={{ fontWeight: 700 }}>{n++}. 설문 결과</p>
        {stats.map(s => (
          <table key={s.q} style={S.table}><tbody>
            <tr><th style={S.head} colSpan={3}>{s.q} (응답 {s.total}명)</th></tr>
            {s.answers.map(([a, c]) => <tr key={a}><td style={S.cell}>{a}</td><td style={{ ...S.cell, ...S.right }}>{c}명</td><td style={{ ...S.cell, ...S.right }}>{((c / s.total) * 100).toFixed(1)}%</td></tr>)}
          </tbody></table>
        ))}
      </>}
      {lines(f.good).length > 0 && <><p style={{ fontWeight: 700 }}>{n++}. 성과</p>{list(f.good)}</>}
      {lines(f.next).length > 0 && <><p style={{ fontWeight: 700 }}>{n++}. 개선할 점</p>{list(f.next)}</>}
      <p style={{ ...S.center, fontWeight: 700, fontSize: '13pt', marginTop: '18pt' }}>{loadSchool().name}</p>
    </DocTool>
  )
}
