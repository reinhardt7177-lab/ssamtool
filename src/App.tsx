import { useEffect, useState } from 'react'
import { AREAS, findTool } from './registry'
import { DocShrink } from './tools/docShrink/DocShrink'
import { PdfMerge } from './tools/pdfMerge/PdfMerge'
import { LabelMaker } from './tools/labels/LabelMaker'
import { GongmunCheck } from './tools/gongmunCheck/GongmunCheck'
import { Newsletter } from './tools/newsletter/Newsletter'
import { Pumui } from './tools/pumui/Pumui'
import { ReplyCollect } from './tools/replyCollect/ReplyCollect'
import { FieldTrip } from './tools/fieldTrip/FieldTrip'
import { CounselWeek } from './tools/counselWeek/CounselWeek'
import { SafetyHours } from './tools/safetyHours/SafetyHours'

const SCREENS: Record<string, () => React.ReactElement> = {
  'doc-shrink': () => <DocShrink />,
  'pdf-merge': () => <PdfMerge />,
  'label-maker': () => <LabelMaker />,
  'gongmun-check': () => <GongmunCheck />,
  newsletter: () => <Newsletter />,
  pumui: () => <Pumui />,
  'reply-collect': () => <ReplyCollect />,
  'field-trip': () => <FieldTrip />,
  'counsel-week': () => <CounselWeek />,
  'safety-hours': () => <SafetyHours />,
}

function useRoute(): string {
  const read = () => location.hash.replace(/^#\/?/, '')
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

// 라벨지 한 장을 줄인 모양: 쌤툴이 만드는 것(문서·라벨)에서 따온 표식
function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect x="4" y="2" width="22" height="26" rx="3" fill="#141414" />
      <rect x="7.5" y="6" width="6.5" height="4.5" rx="1" fill="#fff" />
      <rect x="16" y="6" width="6.5" height="4.5" rx="1" fill="#fff" />
      <rect x="7.5" y="12.5" width="6.5" height="4.5" rx="1" fill="#fff" />
      <rect x="16" y="12.5" width="6.5" height="4.5" rx="1" fill="#1d5fbf" />
      <rect x="7.5" y="19" width="15" height="2" rx="1" fill="#fff" opacity=".55" />
      <rect x="7.5" y="23" width="9" height="2" rx="1" fill="#fff" opacity=".55" />
    </svg>
  )
}

const ICONS: Record<string, React.ReactElement> = {
  home: <path d="M2.5 7.5 8 3l5.5 4.5V13a.5.5 0 0 1-.5.5h-3.5v-4h-3v4H3a.5.5 0 0 1-.5-.5Z" />,
  'doc-shrink': <><path d="M4 1.5h5.5L12.5 4.5v10h-8.5Z" /><path d="M6.5 9.5 8.5 11.5 10.5 9.5M8.5 6v5.5" /></>,
  'pdf-merge': <><path d="M3 3.5h6.5v9H3Z" /><path d="M9.5 5.5H13v9H6.5v-2" /></>,
  'gongmun-check': <><path d="M3.5 1.5h9v13h-9Z" /><path d="M6 5.5h4M6 8h4M6 10.5l1.2 1.2L10 9" /></>,
  'safety-hours': <><path d="M8 1.5 13.5 4v4c0 3-2.4 5.4-5.5 6.5C4.9 13.4 2.5 11 2.5 8V4Z" /><path d="m5.5 8 1.8 1.8L10.5 6.5" /></>,
  'counsel-week': <><circle cx="5.5" cy="5" r="2" /><circle cx="10.5" cy="5" r="2" /><path d="M2 13c0-2 1.5-3.5 3.5-3.5S9 11 9 13M7 13c0-2 1.5-3.5 3.5-3.5S14 11 14 13" /></>,
  'field-trip': <><rect x="2" y="3" width="12" height="11" rx="1.5" /><path d="M2 6.5h12M5 1.5v3M11 1.5v3M5 9.5h2M9 9.5h2" /></>,
  'reply-collect': <><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><path d="m9.5 11 1.5 1.5 2.5-3" /></>,
  pumui: <><path d="M2.5 3.5h11v9h-11Z" /><path d="M5 6.5h6M5 9.5h3.5M10 9.5h1" /></>,
  newsletter: <><path d="M2 4.5h12v8H2Z" /><path d="m2 4.5 6 4.5 6-4.5" /></>,
  'label-maker': <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 8h11M8 2.5v11" /></>,
}
function Icon({ id }: { id: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {ICONS[id]}
    </svg>
  )
}

export default function App() {
  const route = useRoute()
  const [open, setOpen] = useState(false)
  const found = findTool(route)
  useEffect(() => setOpen(false), [route])

  return (
    <div className="shell">
      <aside className={`side no-print${open ? ' open' : ''}`}>
        <a className="brand" href="#">
          <Mark />
          <span><b>쌤툴</b><small>학교 잡업무 도구함</small></span>
        </a>
        <button className="btn text menu-btn" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? '닫기' : '메뉴'}</button>
        <nav className="nav" aria-label="도구">
          <div className="nav-group">
            <a className="nav-item" href="#" aria-current={!found ? 'page' : undefined}><Icon id="home" />도구함</a>
          </div>
          {AREAS.filter(a => a.tools.some(t => t.status === 'ready')).map(a => (
            <div key={a.id} className="nav-group">
              <div className="nav-label">{a.name}</div>
              {a.tools.filter(t => t.status === 'ready').map(t => (
                <a key={t.id} className="nav-item" href={`#/${t.id}`} aria-current={route === t.id ? 'page' : undefined}>
                  <Icon id={t.id} />{t.name}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <p className="side-foot">넣은 파일은 이 브라우저 안에서만 처리돼요. 서버로 올라가지 않아요.</p>
      </aside>

      <main className="main">
        {found && SCREENS[found.tool.id] ? (
          <div className="canvas">
            <header className="title-row no-print">
              <div>
                <div className="crumb"><a href="#">도구함</a> / {found.area.name}</div>
                <h1>{found.tool.name}</h1>
                <p>{found.tool.summary}</p>
              </div>
            </header>
            {SCREENS[found.tool.id]()}
          </div>
        ) : (
          <Home />
        )}
      </main>
    </div>
  )
}

function Home() {
  const ready = AREAS.flatMap(a => a.tools.map(t => ({ ...t, area: a.name }))).filter(t => t.status === 'ready')
  const soon = AREAS.flatMap(a => a.tools.map(t => ({ ...t, area: a.name }))).filter(t => t.status !== 'ready')
  return (
    <div className="canvas">
      <header className="title-row">
        <div>
          <h1>도구함</h1>
          <p>학교 잡업무를 브라우저 안에서 끝내는 도구들이에요. 지금 {ready.length}개를 쓸 수 있고, {soon.length}개를 만들고 있어요.</p>
        </div>
      </header>

      <section className="grid-3" aria-label="지금 쓸 수 있는 도구">
        {ready.map(t => (
          <a key={t.id} className="tool-card" href={`#/${t.id}`}>
            <span className="area">{t.area}</span>
            <h2>{t.name}</h2>
            <p>{t.summary}</p>
            <span className="foot">
              <span className="formats">{t.formats?.map(f => <span key={f} className="pill">{f}</span>)}</span>
              <span className="go">열기 →</span>
            </span>
          </a>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>만들고 있는 도구</h2>
          <span className="meta num">{soon.length}개</span>
        </div>
        <div className="scroll-x">
          <table className="list roadmap">
            <thead><tr><th>영역</th><th>도구</th><th>하는 일</th><th></th></tr></thead>
            <tbody>
              {soon.map(t => (
                <tr key={t.id}>
                  <td className="area-cell">{t.area}</td>
                  <td>{t.name}</td>
                  <td>{t.summary}</td>
                  <td style={{ textAlign: 'right' }}><span className="pill">만드는 중</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
