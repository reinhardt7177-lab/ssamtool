import { useMemo, useState } from 'react'
import { apply, check, type Issue } from './rules'

const SAMPLE = `1.관련: 교육과정부-1234(2026.10.28.)
2. 2026학년도 학교 안전교육 연수를 다음과 같이 실시하고자 합니다.
  가. 일시 : 2026년 11월 12일 오후 3시 30분
  나. 장소: 본교 시청각실
  라. 대상: 전 교직원 45명
  마. 강사 수당: 300,000원
3. 참석자는 익일까지 명단을 송부하여 주시기 바랍니다.

첨부 1. 연수 계획서 1부.
     2. 참석자 명단 1부. 끝`

export function GongmunCheck() {
  const [text, setText] = useState(SAMPLE)
  const [isSample, setIsSample] = useState(true)
  const [copied, setCopied] = useState(false)
  const issues = useMemo(() => check(text), [text])
  const fixes = issues.filter(i => i.level === 'fix')
  const suggests = issues.filter(i => i.level === 'suggest')

  const fixOne = (i: Issue) => { setText(t => apply(t, [i])); setIsSample(false) }
  const fixAll = () => { setText(t => apply(t, fixes)); setIsSample(false) }
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 권한이 없으면 글상자에서 직접 복사 */ }
  }

  return (
    <div className="grid-2 even gm">
      <section className="panel">
        <div className="panel-head">
          <h2>공문 본문</h2>
          <span className="meta">{isSample ? '예시 문서예요. 실제 본문으로 바꿔 넣으세요.' : `${text.split('\n').length}줄`}</span>
        </div>
        <textarea
          className="gm-text"
          aria-label="공문 본문"
          spellCheck={false}
          value={text}
          onChange={e => { setText(e.target.value); setIsSample(false) }}
          onFocus={e => { if (isSample) e.currentTarget.select() }}
        />
        <div className="row">
          <button className="btn primary" disabled={!fixes.length} onClick={fixAll}>고칠 것 {fixes.length}개 모두 고치기</button>
          <button className="btn" onClick={copy}>{copied ? '복사됨' : '본문 복사'}</button>
          <button className="btn text" onClick={() => { setText(''); setIsSample(false) }}>비우기</button>
        </div>
        <p className="note">한글 문서에서 본문을 복사해 붙여넣으세요. 들여쓰기 칸 수도 함께 검사해요. 글은 이 브라우저 밖으로 나가지 않아요.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>검사 결과</h2>
          <span className="meta num">고칠 것 {fixes.length} · 제안 {suggests.length}</span>
        </div>
        {!text.trim() ? (
          <p className="note empty-line">본문을 넣으면 날짜·시간·금액·항목 기호·붙임·"끝." 표시를 검사해요.</p>
        ) : !issues.length ? (
          <p className="note empty-line ok">검사한 규칙에 어긋나는 곳이 없어요.</p>
        ) : (
          <ol className="issues">
            {issues.map(i => (
              <li key={i.id}>
                <div className="issue-head">
                  <span className={`pill${i.level === 'fix' ? ' negative' : ''}`}>{i.level === 'fix' ? '고칠 것' : '제안'}</span>
                  <b>{i.rule}</b>
                  <span className="meta num">{i.line}번째 줄</span>
                </div>
                <p className="issue-msg">{i.message}</p>
                {(i.before || i.after) && (
                  <div className="diff">
                    {i.before.trim() && <del>{i.before}</del>}
                    {i.after !== null && <><span aria-hidden="true">→</span><ins>{i.after.trim() || i.after}</ins></>}
                    {i.after !== null && <button className="btn small" onClick={() => fixOne(i)}>고치기</button>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
