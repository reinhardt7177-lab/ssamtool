import { daysBetween, fromIso } from '../fieldTrip/days'

export interface Slot { id: string; date: string; start: number } // start: 하루 중 분 (15:10 → 910)
export interface Request {
  name: string
  days: string[] | 'any'   // 날짜(ISO) 목록
  from: number | null      // 희망 시간 범위(분)
  to: number | null
  method: '대면' | '전화'
  raw: string
}

export const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0) }

export function makeSlots(start: string, end: string, dayFrom: string, dayTo: string, len: number, gap: number, off: Record<string, string>): Slot[] {
  const out: Slot[] = []
  const a = toMin(dayFrom), b = toMin(dayTo)
  if (!(len > 0) || b <= a) return out
  for (const d of daysBetween(start, end, off)) {
    if (d.kind !== 'school') continue
    for (let t = a; t + len <= b; t += len + gap) out.push({ id: `${d.date} ${t}`, date: d.date, start: t })
  }
  return out
}

const WD = '일월화수목금토'
const ANY = /아무|상관|언제|무관|모두|전부/

// "김하늘 학부모 | 월, 수 | 15시 이후 | 전화" 같은 한 줄을 희망 조건으로 읽는다
export function parseRequest(line: string, dates: string[]): Request | null {
  const cells = line.split(/\t|\|/).map(c => c.trim())
  const all = cells.join(' ')
  const name = all.match(/[가-힣]{2,4}(?=\s|$|\t|학부모|\()/)?.[0]
  if (!name || /^(이름|성명|학생|희망|날짜|요일|시간|방법)$/.test(name)) return null
  const rest = all.slice(all.indexOf(name) + name.length)

  // 날짜·요일
  let days: string[] | 'any' = 'any'
  const picked = new Set<string>()
  for (const m of rest.matchAll(/(\d{1,2})\s*[/.월]\s*(\d{1,2})\s*일?/g)) {
    const hit = dates.find(d => { const x = fromIso(d); return x.getMonth() + 1 === +m[1] && x.getDate() === +m[2] })
    if (hit) picked.add(hit)
  }
  for (const m of rest.matchAll(/(?<![가-힣])([월화수목금])(?:요일)?(?=[\s,·/)]|$|요)/g)) {
    dates.filter(d => WD[fromIso(d).getDay()] === m[1]).forEach(d => picked.add(d))
  }
  if (picked.size && !ANY.test(rest)) days = [...picked].sort()

  // 시간
  let from: number | null = null, to: number | null = null
  const range = rest.match(/(\d{1,2}):?(\d{2})?\s*[~-]\s*(\d{1,2}):?(\d{2})?/)
  const hour = (h: number) => (h < 9 ? h + 12 : h) // 학교 상담은 오후: "3시"는 15시
  if (range) {
    from = hour(+range[1]) * 60 + (+(range[2] ?? 0))
    to = hour(+range[3]) * 60 + (+(range[4] ?? 0))
  } else {
    const after = rest.match(/(?:오후\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?\s*(이후|부터|넘어)/)
    const before = rest.match(/(?:오후\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?\s*(이전|전에|까지)/)
    if (after) from = hour(+after[1]) * 60 + (+(after[2] ?? 0))
    if (before) to = hour(+before[1]) * 60 + (+(before[2] ?? 0))
  }
  const method = /전화|통화|비대면/.test(rest) ? '전화' : '대면'
  return { name, days, from, to, method, raw: line }
}

const fits = (r: Request, s: Slot, len: number) =>
  (r.days === 'any' || r.days.includes(s.date)) && (r.from === null || s.start >= r.from) && (r.to === null || s.start + len <= r.to)

export function options(r: Request, slots: Slot[], len: number) {
  return slots.filter(s => fits(r, s, len))
}

// 고를 수 있는 시간이 적은 가정부터 이른 시간에 배정한다
export function assign(reqs: Request[], slots: Slot[], len: number, fixed: Record<string, string> = {}): Record<string, string> {
  const taken = new Set(Object.values(fixed))
  const out: Record<string, string> = { ...fixed }
  const order = reqs
    .filter(r => !fixed[r.name])
    .map(r => ({ r, opts: options(r, slots, len) }))
    .sort((a, b) => a.opts.length - b.opts.length)
  for (const { r, opts } of order) {
    const s = opts.find(o => !taken.has(o.id))
    if (s) { out[r.name] = s.id; taken.add(s.id) }
  }
  return out
}
