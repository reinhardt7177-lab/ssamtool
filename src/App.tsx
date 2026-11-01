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

// 색깔 탭이 달린 파일철 세 권을 겹친 표식
function Mark() {
  return (
    <svg width="40" height="34" viewBox="0 0 40 34" aria-hidden="true">
      <path d="M4 6h10l3 3h19v21H4Z" fill="#ffd84d" />
      <path d="M2 11h11l3 3h20v18H2Z" fill="#ff7a59" />
      <path d="M0 16h12l3 3h21v15H0Z" fill="#6fa0ff" />
      <rect x="6" y="23" width="22" height="2.5" rx="1.25" fill="#141414" opacity=".55" />
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
  const found = findTool(route)
  const area = found?.area
  const color = area?.color ?? 'var(--manila)'

  return (
    <div className="desk">
      <header className="desk-top no-print">
        <a className="brand" href="#">
          <Mark />
          <span><b>쌤툴</b><small>선생님 책상 위 잡업무 파일철</small></span>
        </a>
        <p className="desk-note">넣은 파일과 명단은 이 브라우저 안에서만 처리돼요. 서버로 올라가지 않아요.</p>
      </header>

      <nav className="tabs no-print" aria-label="업무 영역">
        <a className="tab" href="#" style={{ '--tc': 'var(--manila)' } as React.CSSProperties} aria-current={!found ? 'page' : undefined}>전체</a>
        {AREAS.map(a => {
          const first = a.tools.find(t => t.status === 'ready')
          const ready = a.tools.filter(t => t.status === 'ready').length
          return (
            <a key={a.id} className="tab" href={first ? `#/${first.id}` : `#area-${a.id}`} style={{ '--tc': a.color } as React.CSSProperties} aria-current={area?.id === a.id ? 'page' : undefined}>
              {a.name}<em className="num">{ready}</em>
            </a>
          )
        })}
      </nav>

      <main className="folder" style={{ '--c': color } as React.CSSProperties}>
        {found && SCREENS[found.tool.id] ? (
          <div className="canvas">
            <header className="title-row no-print">
              <div>
                <nav className="crumb" aria-label={`${found.area.name} 도구`}>
                  {found.area.tools.map(t => t.status === 'ready'
                    ? <a key={t.id} href={`#/${t.id}`} aria-current={t.id === found.tool.id ? 'page' : undefined}>{t.name}</a>
                    : <span key={t.id}>{t.name} · 만드는 중</span>)}
                </nav>
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
  const all = AREAS.flatMap(a => a.tools)
  const ready = all.filter(t => t.status === 'ready').length
  return (
    <div className="canvas">
      <header className="title-row">
        <div>
          <h1>오늘 꺼낼 서류를 고르세요</h1>
          <p>학교 잡업무를 영역별 파일철에 모았어요. 지금 {ready}개 도구를 쓸 수 있고, {all.length - ready}개를 만들고 있어요.</p>
        </div>
      </header>
      <div className="stack-folders">
        {AREAS.map(a => (
          <section key={a.id} id={`area-${a.id}`} className="sf" style={{ '--c': a.color } as React.CSSProperties}>
            <h2 className="sf-tab">{a.name}</h2>
            <div className="sf-body">
              {a.tools.map(t => t.status === 'ready' ? (
                <a key={t.id} className="sheet-card" href={`#/${t.id}`}>
                  <span className="sc-icon"><Icon id={t.id} /></span>
                  <b>{t.name}</b>
                  <span className="sc-sum">{t.summary}</span>
                  <span className="sc-foot">{t.formats?.map(f => <i key={f}>{f}</i>)}<span className="go">열기 →</span></span>
                </a>
              ) : (
                <div key={t.id} className="sheet-card soon">
                  <b>{t.name}</b>
                  <span className="sc-sum">{t.summary}</span>
                  <span className="sc-foot"><span className="stamp">만드는 중</span></span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
