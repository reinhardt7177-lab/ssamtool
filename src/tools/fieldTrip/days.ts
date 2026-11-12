// 교외체험학습 일수: 기간 중 수업일(평일 - 공휴일·학교 휴업일)만 센다.
// 2026·2027년 공휴일(대체공휴일 포함). 학교 재량휴업일은 화면에서 더 넣는다. 해가 바뀌면 다음 해를 더해야 한다.
export const HOLIDAY_YEARS = [2026, 2027]
export const HOLIDAYS: Record<string, string> = {
  '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
  '2026-03-02': '삼일절 대체', '2026-05-01': '노동절', '2026-05-05': '어린이날', '2026-05-25': '부처님오신날 대체',
  '2026-06-03': '지방선거', '2026-07-17': '제헌절', '2026-08-17': '광복절 대체', '2026-09-24': '추석 연휴', '2026-09-25': '추석',
  '2026-10-05': '개천절 대체', '2026-10-09': '한글날', '2026-12-25': '성탄절',
  '2027-01-01': '신정', '2027-02-08': '설날 연휴', '2027-02-09': '설날 대체', '2027-03-01': '삼일절',
  '2027-05-03': '노동절 대체', '2027-05-05': '어린이날', '2027-05-13': '부처님오신날', '2027-07-19': '제헌절 대체',
  '2027-08-16': '광복절 대체', '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴',
  '2027-10-04': '개천절 대체', '2027-10-11': '한글날 대체', '2027-12-27': '성탄절 대체',
}

export const DAY_KO = '일월화수목금토'

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const fromIso = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const fmt = (s: string) => { const d = fromIso(s); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.(${DAY_KO[d.getDay()]})` }

export type DayKind = 'school' | 'weekend' | 'holiday'
export interface Day { date: string; kind: DayKind; note: string }

export function daysBetween(start: string, end: string, extraOff: Record<string, string>): Day[] {
  if (!start || !end || end < start) return []
  const out: Day[] = []
  const off = { ...HOLIDAYS, ...extraOff }
  for (let d = fromIso(start); iso(d) <= end && out.length < 62; d.setDate(d.getDate() + 1)) {
    const key = iso(d)
    const wd = d.getDay()
    if (wd === 0 || wd === 6) out.push({ date: key, kind: 'weekend', note: wd === 0 ? '일요일' : '토요일' })
    else if (off[key]) out.push({ date: key, kind: 'holiday', note: off[key] })
    else out.push({ date: key, kind: 'school', note: '' })
  }
  return out
}

// "2026-11-02 재량휴업일" 같은 줄을 읽는다. 2026. 11. 2. 형식도 받는다.
export function parseOffDays(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/(\d{4})\s*[-.]\s*(\d{1,2})\s*[-.]\s*(\d{1,2})\.?\s*(.*)/)
    if (m) out[`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`] = m[4].trim() || '학교 휴업일'
  }
  return out
}
