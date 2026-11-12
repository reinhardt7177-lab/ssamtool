import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { AREAS, findTool, type Area } from './registry'
import { DocShrink } from './tools/docShrink/DocShrink'
import { PdfMerge } from './tools/pdfMerge/PdfMerge'
import { Convert } from './tools/convert/Convert'
import { PlanRewrite } from './tools/planRewrite/PlanRewrite'
import { Allowance } from './tools/allowance/Allowance'
import { Minutes } from './tools/minutes/Minutes'
import { GongmunDraft } from './tools/gongmunDraft/GongmunDraft'
import { Attendance } from './tools/attendance/Attendance'
import { Budget } from './tools/budget/Budget'
import { Report } from './tools/report/Report'
import { Inspection } from './tools/inspection/Inspection'
import { Transfer } from './tools/transfer/Transfer'
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
  convert: () => <Convert />,
  'plan-rewrite': () => <PlanRewrite />,
  'allowance': () => <Allowance />,
  'minutes': () => <Minutes />,
  'gongmun-draft': () => <GongmunDraft />,
  'attendance': () => <Attendance />,
  'budget': () => <Budget />,
  'report': () => <Report />,
  'inspection': () => <Inspection />,
  'transfer': () => <Transfer />,
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
const EASE = 'power3.inOut'

// 탭 곡선: 글자 상자에 붙은 쪽은 위가 평평하고, 바깥쪽은 S자로 내려가 띠에 붙는다.
// 레퍼런스와 같은 짜임(같은 SVG를 왼쪽은 좌우 반전)으로, 곡선 모양은 새로 그렸다.
const CURVE = 'M0 0C11 0 17.5 3.4 23 11.2L38.6 33C43.6 40.1 50.4 44 62 44H0Z'

function Tag({ href, bg, fg, current, children }: { href: string; bg: string; fg: string; current?: boolean; children: React.ReactNode }) {
  return (
    <a className="tag" href={href} style={vars({ '--bg': bg, '--fg': fg })} aria-current={current ? 'page' : undefined}>
      <svg className="tag__start" viewBox="0 0 62 44" preserveAspectRatio="none" aria-hidden="true"><path d={CURVE} fill="currentColor" /></svg>
      <span className="tag__mid">{children}</span>
      <svg className="tag__end" viewBox="0 0 62 44" preserveAspectRatio="none" aria-hidden="true"><path d={CURVE} fill="currentColor" /></svg>
    </a>
  )
}

// 글자 단위로 쪼갠 제목: 단어마다 가림막을 두고 글자가 아래·옆에서 들어온다
function Split({ text }: { text: string }) {
  return (
    <span className="split" aria-label={text}>
      {text.split(' ').map((w, i, all) => (
        <span key={i} aria-hidden="true">
          <span className="w">{[...w].map((c, k) => <span key={k} className="ch" style={vars({ '--i': String(text.split(' ').slice(0, i).join('').length + k) })}>{c}</span>)}</span>
          {i < all.length - 1 && ' '}
        </span>
      ))}
    </span>
  )
}

const READY = AREAS.flatMap(a => a.tools.filter(t => t.status === 'ready').map(t => ({ tool: t, area: a })))

function useLenis() {
  useEffect(() => {
    if (reduce()) return
    // 표·미리보기·글상자처럼 안에서 따로 스크롤되는 곳은 Lenis가 건드리지 않는다
    const lenis = new Lenis({ lerp: 0.075, prevent: (node: HTMLElement) => !!node.closest?.('textarea, select, .scroll-x, .preview, .nl-preview, .issues, .sh-list, .cw-notice, .pm-body') })
    let id = 0
    const raf = (t: number) => { lenis.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    const top = () => lenis.scrollTo(0, { immediate: true })
    addEventListener('hashchange', top)
    return () => { cancelAnimationFrame(id); removeEventListener('hashchange', top); lenis.destroy() }
  }, [])
}

export default function App() {
  const route = useRoute()
  const found = findTool(route)
  useLenis()

  return (
    <div className="desk">
      <header className="topbar no-print">
        {found ? <a className="back" href="#">← 전체 파일철</a> : <span />}
        <a className="brand" href="#">Ssamtool</a>
        <span className="safe">파일과 명단은 이 브라우저 안에서만 처리돼요</span>
      </header>
      {found && SCREENS[found.tool.id] ? <Case key={found.tool.id} areaId={found.area.id} toolId={found.tool.id} /> : <Home />}
    </div>
  )
}

function Case({ areaId, toolId }: { areaId: string; toolId: string }) {
  const area = AREAS.find(a => a.id === areaId)!
  const tool = area.tools.find(t => t.id === toolId)!
  const root = useRef<HTMLDivElement>(null)
  const [showNext, setShowNext] = useState(false)
  const [tagsLen, setTagsLen] = useState(0)

  // 세로 인덱스는 화면을 따라 내려오며 늘 전부 보인다. 파일철이 인덱스보다 짧아지지 않게만 맞춘다.
  useLayoutEffect(() => {
    const tags = root.current?.querySelector('.side-tags') as HTMLElement | null
    if (!tags) return
    const measure = () => setTagsLen(tags.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(tags)
    return () => ro.disconnect()
  }, [])
  const idx = READY.findIndex(r => r.tool.id === toolId)
  const next = READY[(idx + 1) % READY.length]

  useEffect(() => {
    const on = () => setShowNext(scrollY > 300)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])

  // 들어올 때: 파일철이 아래에서 솟고, 표지가 책장처럼 넘어가고, 제목 글자가 왼쪽에서 들어온다
  useGSAP(() => {
    if (reduce()) return
    const tl = gsap.timeline()
    tl.from('.case-folder', { y: '70vh', duration: 1, ease: EASE }, 0)
      .set('.cover', { display: 'block' }, 0)
      .fromTo('.cover', { rotateY: 0 }, { rotateY: -180, duration: 1.1, ease: EASE }, .55)
      .set('.cover', { display: 'none' })
      .from('.case-title .ch', { xPercent: -150, opacity: 0, duration: .8, stagger: .025, ease: 'power4.out' }, .15)
      .from('.case-meta', { y: 16, opacity: 0, duration: .6, ease: 'power3.out' }, .5)
      .from('.side-tags .tag', { y: '110%', duration: .6, stagger: .06, ease: 'power3.out', clearProps: 'transform' }, .85)
      .from('.paper__body > *', { y: 40, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out' }, 1.1)
  }, { scope: root })

  return (
    <div className="case" ref={root}>
      <h1 className="case-title no-print"><Split text={tool.name} /></h1>
      <div className="case-meta no-print">
        <span>{area.en}</span>
        {area.tools.map(t => t.status === 'ready'
          ? <a key={t.id} href={`#/${t.id}`} aria-current={t.id === tool.id ? 'page' : undefined} style={vars({ '--c': area.color === '#000000' ? '#fdfaf7' : area.color })}>{t.name}</a>
          : <span key={t.id} aria-disabled="true">{t.name} · 만드는 중</span>)}
      </div>

      <div className="case-folder" style={vars({ '--c': area.color, '--ci': area.ink })}>
        <div className="side-rail no-print"><div className="side-sticky" style={{ height: tagsLen || undefined }}>
        <nav className="side-tags" aria-label="다른 영역">
          {AREAS.map(a => {
            const first = a.tools.find(t => t.status === 'ready')
            return first ? <Tag key={a.id} href={`#/${first.id}`} bg={a.color} fg={a.ink} current={a.id === area.id}>{a.short}</Tag> : null
          })}
        </nav></div></div>
        <div className="case-folder__inner" style={{ minHeight: tagsLen ? tagsLen + 24 : undefined }}>
          <div className="paper">
            <div className="paper__clip no-print" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div>
            <svg className="paperclip no-print" viewBox="0 0 24 107" aria-hidden="true"><path d="M17 20v62a7 7 0 0 1-14 0V12a9 9 0 0 1 18 0v66a3.5 3.5 0 0 1-7 0V22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            <div className="paper__body canvas">
              <p className="paper-lede no-print">{tool.summary}</p>
              {SCREENS[tool.id]()}
            </div>
          </div>
          <div className="cover" aria-hidden="true" />
        </div>
      </div>

      <a className={`next-card no-print${showNext ? ' show' : ''}`} href={`#/${next.tool.id}`} style={vars({ '--nb': next.area.color, '--ni': next.area.ink })} aria-label={`다음 도구: ${next.tool.name}`}>
        <b>{next.tool.name}</b>
        <small>{next.area.en}</small>
        <span className="go">다음 →</span>
      </a>
    </div>
  )
}

const PALETTE = AREAS.map(x => ({ color: x.color, ink: x.ink }))
function tabColor(a: Area, k: number) {
  if (k === 0) return { color: a.color, ink: a.ink }
  const others = PALETTE.filter(p => p.color !== a.color)
  return others[(AREAS.indexOf(a) * 2 + k) % others.length]
}

function Band({ a, i, open, hover, onToggle, onHover, onLeave, onOpenTool }: {
  a: Area; i: number; open: boolean; hover: number | null; onToggle: () => void; onHover: (i: number) => void; onLeave: () => void; onOpenTool: (e: React.MouseEvent, id: string) => void
}) {
  const more = useRef<HTMLDivElement>(null)
  const ready = a.tools.filter(t => t.status === 'ready')

  // 띠를 누르면 안쪽 서류가 펼쳐지고 접힌다 (레퍼런스와 같은 0.65초 곡선)
  useGSAP(() => {
    const el = more.current!
    if (reduce()) { el.style.height = open ? 'auto' : '0px'; return }
    gsap.to(el, { height: open ? 'auto' : 0, duration: .65, ease: 'power3.out' })
    if (open) gsap.from(el.querySelectorAll('.doc'), { y: 30, opacity: 0, duration: .5, stagger: .05, delay: .1, ease: 'power3.out', clearProps: 'transform,opacity' })
  }, { dependencies: [open] })

  return (
    <section
      className={`band${open ? ' open' : ''}${hover !== null && i > hover ? ' is-rotated' : ''}${hover === i ? ' is-hover' : ''}`}
      id={`area-${a.id}`}
      style={vars({ '--bb': a.color, '--bi': a.ink, '--i': String(i) })}
      onMouseEnter={() => onHover(i)}
      onMouseLeave={onLeave}
    >
      <div className={`band-tabs${ready.length > 3 ? ' many' : ''}`} onClick={e => { const t = (e.target as HTMLElement).closest('a.tag') as HTMLAnchorElement | null; if (t) onOpenTool(e, t.hash.replace('#/', '')) }}>
        {ready.map((t, k) => { const c = tabColor(a, k); return <Tag key={t.id} href={`#/${t.id}`} bg={c.color} fg={c.ink}>{t.name}</Tag> })}
      </div>
      <div className="band-body">
        <button className="band-bar" aria-expanded={open} onClick={onToggle}>
          <span className="en">{a.name} · {a.en} <span className="chev" aria-hidden="true">‹</span></span>
        </button>
        <div className="band-more" ref={more}>
          <p className="band-desc">{a.desc}</p>
          <div className="band-inner">
            {a.tools.map(t => t.status === 'ready' ? (
              <a key={t.id} className="doc" href={`#/${t.id}`} onClick={e => onOpenTool(e, t.id)}>
                <b>{t.name}</b>
                <span>{t.summary}</span>
                <span className="doc-foot">{t.formats?.join(' · ')}<span className="go">열기 →</span></span>
              </a>
            ) : (
              <div key={t.id} className="doc soon">
                <b>{t.name}</b>
                <span>{t.summary}</span>
                <span className="doc-foot">만드는 중</span>
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
  const [hover, setHover] = useState<number | null>(null)
  const leaving = useRef(false)
  // 마우스를 띠에 잠깐 올려 두면 그 띠가 펼쳐진다 (지나가기만 할 때 출렁이지 않게 0.2초 기다림)
  const hoverTimer = useRef<number>(0)
  const hoverBand = (i: number | null) => {
    setHover(i)
    clearTimeout(hoverTimer.current)
    if (i !== null && matchMedia('(hover: hover)').matches) hoverTimer.current = window.setTimeout(() => setOpen(AREAS[i].id), 200)
  }
  const all = AREAS.flatMap(a => a.tools)
  const ready = all.filter(t => t.status === 'ready').length

  // 처음 등장(제목 글자가 솟고 띠가 크게 날아와 쌓이는 것)은 CSS 애니메이션으로 한다.
  // 띠에는 마우스용 CSS 전환이 있어 GSAP 값이 남으면 띠가 확대된 채 멈출 수 있었다.

  // 도구를 고르면: 다른 띠는 아래로 빠지고 제목은 흩어진 뒤 이동한다
  const { contextSafe } = useGSAP({ scope })
  const openTool = contextSafe((e: React.MouseEvent, id: string) => {
    if (reduce() || leaving.current || e.metaKey || e.ctrlKey) return
    e.preventDefault()
    leaving.current = true
    const picked = (e.currentTarget as HTMLElement).closest('.band')
    const others = [...document.querySelectorAll('.band')].filter(b => b !== picked)
    const tl = gsap.timeline({ onComplete: () => { location.hash = `/${id}` } })
    tl.to('.hero .ch', { yPercent: 100, duration: .45, stagger: -.004, ease: 'power2.in' }, 0)
      .to('.hero p', { y: 32, opacity: 0, duration: .4, ease: 'power2.in' }, 0)
      .to(others, { yPercent: 120, opacity: 0, duration: .75, stagger: .06, ease: 'power2.out' }, 0)
      .to(picked, { y: -40, duration: .75, ease: 'power2.out' }, 0)
  })

  return (
    <div ref={scope}>
      <header className="hero">
        <h1><Split text="Teacher's Files" /><span className="ko"><Split text="선생님 잡업무 파일철" /></span></h1>
        <p>공문·품의·가정통신문·라벨 출력까지, 학교 잡업무를 색깔 파일철에 모았어요. 지금 {ready}개 도구를 쓸 수 있어요.{all.length > ready ? ` ${all.length - ready}개는 만들고 있어요.` : ''}</p>
      </header>
      <div className="bands-stack" onMouseLeave={() => hoverBand(null)}>
        {AREAS.map((a, i) => (
          <Band key={a.id} a={a} i={i} open={open === a.id} hover={hover}
            onToggle={() => setOpen(o => (o === a.id ? null : a.id))}
            onHover={hoverBand} onLeave={() => {}} onOpenTool={openTool} />
        ))}
      </div>
    </div>
  )
}
