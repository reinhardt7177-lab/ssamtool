import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AREAS, findTool, type Area } from './registry'
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

gsap.registerPlugin(useGSAP)

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

const vars = (o: Record<string, string>) => o as React.CSSProperties
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const route = useRoute()
  const found = findTool(route)
  const area = found?.area
  const root = useRef<HTMLDivElement>(null)

  // 도구를 열 때: 파일철이 아래에서 올라오고, 제목·서류가 차례로 들어온다
  useGSAP(() => {
    if (reduce() || !found) return
    gsap.from('.folder', { y: 40, opacity: 0, duration: .55, ease: 'power3.out' })
    gsap.from('.folder .title-row > div > *', { y: 24, opacity: 0, duration: .5, stagger: .07, delay: .12, ease: 'power3.out' })
    gsap.from('.folder .canvas > :not(.title-row)', { y: 30, opacity: 0, duration: .55, delay: .3, ease: 'power3.out' })
  }, { scope: root, dependencies: [route] })

  return (
    <div className="desk" ref={root}>
      <header className="topbar no-print">
        {found ? <a className="back" href="#">← 전체 파일철</a> : <span />}
        <a className="brand" href="#">SSAMTOOL</a>
        <span className="safe">파일과 명단은 이 브라우저 안에서만 처리돼요</span>
      </header>

      {found && SCREENS[found.tool.id] ? (
        <>
          <nav className="area-tabs no-print" aria-label="업무 영역">
            {AREAS.map(a => {
              const first = a.tools.find(t => t.status === 'ready')
              return (
                <a key={a.id} className="ctab" href={first ? `#/${first.id}` : '#'} style={vars({ '--b': a.color, '--i': a.ink })} aria-current={area?.id === a.id ? 'page' : undefined}>{a.name}</a>
              )
            })}
          </nav>
          <main className="folder" style={vars({ '--c': area!.color, '--ci': area!.ink })}>
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
          </main>
        </>
      ) : (
        <Home />
      )}
    </div>
  )
}

function Band({ a, open, onToggle }: { a: Area; open: boolean; onToggle: () => void }) {
  const more = useRef<HTMLDivElement>(null)
  const ready = a.tools.filter(t => t.status === 'ready')

  // 띠를 누르면 안쪽 서류가 펼쳐지고 접힌다
  useGSAP(() => {
    const el = more.current!
    if (reduce()) { el.style.height = open ? 'auto' : '0px'; return }
    gsap.to(el, { height: open ? 'auto' : 0, duration: .5, ease: 'power3.inOut' })
    if (open) gsap.from(el.querySelectorAll('.doc'), { y: 26, opacity: 0, duration: .45, stagger: .05, delay: .12, ease: 'power3.out' })
  }, { dependencies: [open] })

  return (
    <section className={`band${open ? ' open' : ''}`} id={`area-${a.id}`} style={vars({ '--bb': a.color, '--bi': a.ink })}>
      <div className="band-tabs">
        {ready.map(t => <a key={t.id} className="ctab" href={`#/${t.id}`}>{t.name}</a>)}
      </div>
      <div className="band-body">
        <button className="band-bar" aria-expanded={open} onClick={onToggle}>
          <span className="ko">{a.name}</span>
          <span className="en">{a.en} · {ready.length}/{a.tools.length} <span className="chev" aria-hidden="true">‹</span></span>
        </button>
        <div className="band-more" ref={more}>
          <div className="band-inner">
            {a.tools.map(t => t.status === 'ready' ? (
              <a key={t.id} className="doc" href={`#/${t.id}`}>
                <b>{t.name}</b>
                <span>{t.summary}</span>
                <span className="doc-foot">{t.formats?.join(' · ')}<span className="go">열기 →</span></span>
              </a>
            ) : (
              <div key={t.id} className="doc soon">
                <b>{t.name}</b>
                <span>{t.summary}</span>
                <span className="doc-foot" style={{ color: 'inherit' }}>만드는 중</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Home() {
  const scope = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<string | null>(AREAS[0].id)
  const all = AREAS.flatMap(a => a.tools)
  const ready = all.filter(t => t.status === 'ready').length

  // 처음 열 때: 큰 제목이 올라오고, 띠가 아래에서부터 한 장씩 쌓인다
  useGSAP(() => {
    if (reduce()) return
    gsap.from('.hero h1', { y: 60, opacity: 0, duration: .9, ease: 'power4.out' })
    gsap.from('.hero p', { y: 20, opacity: 0, duration: .7, delay: .25, ease: 'power3.out' })
    gsap.from('.band', { y: 80, opacity: 0, duration: .7, stagger: .08, delay: .3, ease: 'power3.out' })
  }, { scope })

  return (
    <div ref={scope}>
      <header className="hero">
        <h1>Teacher's Files<span>선생님 잡업무 파일철</span></h1>
        <p>공문·품의·가정통신문·라벨 출력까지, 학교 잡업무를 색깔 파일철에 모았어요. 지금 {ready}개 도구를 쓸 수 있고 {all.length - ready}개를 만들고 있어요.</p>
      </header>
      <div className="bands">
        {AREAS.map(a => <Band key={a.id} a={a} open={open === a.id} onToggle={() => setOpen(o => (o === a.id ? null : a.id))} />)}
      </div>
    </div>
  )
}
