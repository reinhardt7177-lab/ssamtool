import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

export interface SignPadHandle { clear(): void; toPng(): string | null }

const INK = '#16162a'

// 손가락·펜으로 쓰는 서명 칸. 빠르게 그으면 가늘고 천천히 쓰면 굵어져 펜으로 쓴 느낌이 난다.
export function SignPad({ ref, onInk }: { ref: Ref<SignPadHandle>; onInk: (has: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const inked = useRef(false)

  useEffect(() => {
    const c = canvas.current!
    const ctx = c.getContext('2d')!
    // 화면 배율에 맞춰 선명하게. 크기가 바뀌면(가로로 돌리기) 지워지므로 다시 쓰게 한다
    // getBoundingClientRect는 등장 애니메이션의 기울기까지 재서 칸보다 커진다. 레이아웃 크기(clientWidth)를 쓴다
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 3), w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr)
      if (!w || (c.width === w && c.height === h)) return
      c.width = w; c.height = h
      inked.current = false; onInk(false)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(c)

    let last: { x: number; y: number; t: number; w: number } | null = null
    let pen: number | null = null // 쓰는 손가락 하나만 따른다 (손바닥·두 번째 손가락이 닿아도 선이 튀지 않게)
    const at = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height), t: e.timeStamp } }
    const base = () => c.width / 150 // 칸 너비에 비례한 기본 굵기
    const line = (p: { x: number; y: number; t: number }) => {
      if (!last) return
      const dist = Math.hypot(p.x - last.x, p.y - last.y), speed = dist / Math.max(1, p.t - last.t) / (c.width / 400)
      const w = last.w + (Math.max(.45, Math.min(1.25, 1.3 - speed * .35)) * base() - last.w) * .35 // 굵기는 천천히 따라가게
      ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke()
      last = { ...p, w }
    }
    const down = (e: PointerEvent) => {
      e.preventDefault()
      if (pen !== null) return
      pen = e.pointerId
      try { c.setPointerCapture(e.pointerId) } catch { /* 잡지 못해도 칸 안에서는 그려진다 */ }
      const p = at(e)
      last = { ...p, w: base() }
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y, base() / 2, 0, Math.PI * 2); ctx.fill() // 점만 찍어도 남게
      if (!inked.current) { inked.current = true; onInk(true) }
    }
    const move = (e: PointerEvent) => { if (last && e.pointerId === pen) (e.getCoalescedEvents?.() ?? [e]).forEach(x => line(at(x))) }
    const up = (e: PointerEvent) => { if (e.pointerId === pen) { last = null; pen = null } }
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move)
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up)
    return () => { ro.disconnect(); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up) }
  }, [onInk])

  useImperativeHandle(ref, () => ({
    clear() { const c = canvas.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); inked.current = false; onInk(false) },
    // 서버에 보낼 작은 그림(투명 바탕 PNG, 480×192)
    toPng() {
      if (!inked.current) return null
      const out = document.createElement('canvas')
      out.width = 480; out.height = 192
      out.getContext('2d')!.drawImage(canvas.current!, 0, 0, 480, 192)
      return out.toDataURL('image/png')
    },
  }), [onInk])

  return <canvas ref={canvas} className="sign-pad" aria-label="서명 칸" />
}
