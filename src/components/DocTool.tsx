import { useRef, useState, type ReactNode } from 'react'
import { downloadBlob } from '../lib/files'
import { htmlToHwpx } from '../lib/hwp'
import '../tools/newsletter/newsletter.css'

// 서류 미리보기 공통 모양 (인쇄·한글 저장 모두 인라인 스타일을 그대로 쓴다)
export const S = {
  doc: { fontFamily: '"맑은 고딕", "Malgun Gothic", sans-serif', fontSize: '10.5pt', lineHeight: 1.6, color: '#111' },
  title: { fontSize: '19pt', fontWeight: 700, textAlign: 'center' as const, margin: '0 0 14pt', letterSpacing: '1pt' },
  table: { width: '100%', borderCollapse: 'collapse' as const, margin: '4pt 0 10pt' },
  cell: { border: '1px solid #555', padding: '4pt 7pt', verticalAlign: 'top' as const },
  head: { border: '1px solid #555', padding: '4pt 7pt', background: '#f0f0f0', fontWeight: 700, textAlign: 'center' as const, verticalAlign: 'middle' as const },
  right: { textAlign: 'right' as const },
  center: { textAlign: 'center' as const },
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_')

// 왼쪽은 입력, 오른쪽은 A4 미리보기. 미리보기 아래 버튼으로 인쇄·한글 저장·글 복사
export function DocTool({ form, children, fileName, text }: { form: ReactNode; children: ReactNode; fileName: string; text?: string }) {
  const sheet = useRef<HTMLDivElement>(null)
  const [msg, setMsg] = useState('')
  const saveHwpx = async () => {
    if (!sheet.current) return
    setMsg('한글 파일 만드는 중… (처음 한 번은 한글 엔진을 받아요)')
    try { downloadBlob(await htmlToHwpx(sheet.current.innerHTML), `${safe(fileName)}.hwpx`); setMsg('한글 파일로 저장했어요.') }
    catch (e) { setMsg(`한글 파일을 만들지 못했어요: ${(e as Error).message ?? e}`) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(text ?? sheet.current?.innerText ?? ''); setMsg('글을 복사했어요.') } catch { setMsg('복사하지 못했어요. 미리보기에서 직접 골라 복사해 주세요.') }
  }
  return (
    <div className="nl">
      <div className="stack no-print">
        {form}
        <section className="panel">
          <div className="panel-head"><h2>내보내기</h2></div>
          <div className="row">
            <button className="btn primary" onClick={() => print()}>인쇄 · PDF로 저장</button>
            <button className="btn" onClick={saveHwpx}>한글(HWPX)로 저장</button>
            <button className="btn" onClick={copy}>글 복사</button>
          </div>
          <p className="note" aria-live="polite">{msg || '인쇄 창에서 배율 100%, 머리글·바닥글 끄기로 설정하세요.'}</p>
        </section>
      </div>
      <div className="nl-preview">
        <div className="nl-sheet" ref={sheet}><div style={S.doc}>{children}</div></div>
      </div>
    </div>
  )
}

// 여러 줄 입력을 줄 목록으로 (빈 줄 제외)
export const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)
