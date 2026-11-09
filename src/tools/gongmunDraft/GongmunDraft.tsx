import { useMemo, useState } from 'react'
import { DocTool, lines } from '../../components/DocTool'
import { check } from '../gongmunCheck/rules'
import { draftText } from './draft'

const SAMPLE = {
  to: '내부결재', title: '2026학년도 4학년 현장체험학습 실시 계획', related: '○○초등학교-1234(2026.10.5.)',
  purpose: '4학년 교육과정과 연계한 현장체험학습을 다음과 같이 실시하고자 합니다.',
  items: '일시: 2026년 11월 20일 오전 9시~오후 3시\n장소: 국립중앙과학관(대전)\n대상: 4학년 학생 112명, 인솔 교사 6명\n소요 예산: 금1,680,000원(금일백육십팔만원)',
  more: '', attach: '현장체험학습 운영 계획서\n안전 교육 자료',
}

export function GongmunDraft() {
  const [f, setF] = useState(SAMPLE)
  const set = (k: keyof typeof SAMPLE, v: string) => setF(p => ({ ...p, [k]: v }))
  const text = useMemo(() => draftText({ to: f.to, title: f.title, related: lines(f.related), purpose: f.purpose.trim(), items: lines(f.items), more: lines(f.more), attach: lines(f.attach) }), [f])
  const left = check(text).filter(i => i.level === 'suggest' || i.after === null)
  const field = (k: keyof typeof SAMPLE, label: string, rows = 0, hint = '') => (
    <label className="field grow">{label}{hint && <span className="hint">{hint}</span>}
      {rows ? <textarea rows={rows} value={f[k]} onChange={e => set(k, e.target.value)} /> : <input value={f[k]} onChange={e => set(k, e.target.value)} />}
    </label>
  )
  const form = (
    <section className="panel">
      <div className="panel-head"><h2>메모</h2><span className="meta">여러 줄 칸은 한 줄에 하나씩</span></div>
      <div className="row">{field('to', '수신')}{field('title', '제목')}</div>
      {field('related', '관련 (없으면 비우기)', 2)}
      {field('purpose', '목적 문장', 2, '"~하고자 합니다."로 끝나게')}
      {field('items', '세부 항목', 4, '가. 나. 번호는 알아서 붙여요. 날짜·시간·금액 표기도 규칙대로 고쳐요')}
      {field('more', '덧붙일 문장 (3. 4. …)', 2)}
      {field('attach', '붙임 문서 이름', 2)}
      <p className={left.length ? 'note warn' : 'note'}>{left.length ? `규칙 검사에서 직접 확인할 곳 ${left.length}개: ${left.slice(0, 3).map(i => i.message).join(' / ')}` : '날짜·시간·금액·항목 기호·붙임·끝. 표시를 공문서 작성 규칙에 맞췄어요.'}</p>
    </section>
  )
  return (
    <DocTool form={form} fileName={f.title || '공문 초안'} text={text}>
      {text.split('\n').map((l, i) => {
        const pad = l.match(/^ */)![0].length
        return <p key={i} style={{ margin: 0, paddingLeft: `${pad * 6}pt`, fontWeight: l.startsWith('제목') ? 700 : 400 }}>{l.trim() || ' '}</p>
      })}
    </DocTool>
  )
}
