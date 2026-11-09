// 작년 계획서 글에서 연도·날짜를 찾아 올해 것으로 바꿀 목록을 만든다
export interface Change { from: string; to: string; kind: '날짜' | '연도'; context: string; on: boolean }

const DAYS = '일월화수목금토'
const weekday = (y: number, m: number, d: number) => DAYS[new Date(y, m - 1, d).getDay()]
// 법령 개정일·고시처럼 바꾸면 안 되는 연도 (기본으로 체크를 끈다)
const KEEP = /개정|시행령|시행규칙|법령|법률|고시|훈령|제정|발간/

const blank = (s: string) => ' '.repeat(s.length)

export function mostYear(text: string): number {
  const count: Record<string, number> = {}
  for (const m of text.matchAll(/(?<!\d)(20\d\d)(?!\d)/g)) count[m[1]] = (count[m[1]] ?? 0) + 1
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  return top ? Number(top[0]) : new Date().getFullYear() - 1
}

export function findChanges(text: string, from: number, to: number): Change[] {
  const shift = to - from
  const out = new Map<string, Change>()
  const ctx = (i: number, len: number) => text.slice(Math.max(0, i - 14), i + len + 14).replace(/\s+/g, ' ').trim()
  const add = (c: Omit<Change, 'on'>, on = true) => { if (c.from !== c.to && !out.has(c.from)) out.set(c.from, { ...c, on }) }
  let rest = text

  // 1) 연도가 붙은 요일 날짜: 2026. 11. 26.(목) → 2027. 11. 26.(금)
  for (const m of text.matchAll(/(?<!\d)(20\d\d)(\.[ \t]*)(\d{1,2})(\.[ \t]*)(\d{1,2})(\.?[ \t]*)\(([일월화수목금토])\)/g)) {
    const y = Number(m[1])
    if (y !== from && y !== from - 1) continue
    const ny = y + shift
    add({ from: m[0], to: `${ny}${m[2]}${m[3]}${m[4]}${m[5]}${m[6]}(${weekday(ny, +m[3], +m[5])})`, kind: '날짜', context: ctx(m.index, m[0].length) })
    rest = rest.slice(0, m.index) + blank(m[0]) + rest.slice(m.index + m[0].length)
  }
  // 2) 연도 없는 요일 날짜: 11. 26.(목) → 요일만 올해 달력에 맞춤
  for (const m of rest.matchAll(/(?<![\d.])(\d{1,2})(\.[ \t]*)(\d{1,2})(\.?[ \t]*)\(([일월화수목금토])\)/g)) {
    const mo = +m[1], d = +m[3]
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue
    add({ from: m[0], to: `${m[1]}${m[2]}${m[3]}${m[4]}(${weekday(to, mo, d)})`, kind: '날짜', context: ctx(m.index, m[0].length) })
    rest = rest.slice(0, m.index) + blank(m[0]) + rest.slice(m.index + m[0].length)
  }
  // 3) 나머지 연도: 2026학년도, 2026년, 2026. 3. 등 (뒤 글자까지 묶어 같은 연도의 다른 쓰임과 구분)
  for (const m of rest.matchAll(/(?<!\d)(20\d\d)(?!\d)([^\r\n]{0,6})/g)) {
    const y = Number(m[1])
    if (y !== from && y !== from - 1) continue
    const tail = m[2].trimEnd()
    const c = ctx(m.index, m[0].length)
    add({ from: m[1] + tail, to: String(y + shift) + tail, kind: '연도', context: c }, !KEEP.test(text.slice(m.index, m.index + 16)))
  }
  // 긴 것부터 바꿔야 짧은 것이 긴 것의 일부를 먼저 건드리지 않는다
  return [...out.values()].sort((a, b) => b.from.length - a.from.length)
}
