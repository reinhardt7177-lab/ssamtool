// 우리 반 명단: 한 도구에서 넣으면 다른 도구에서 불러 쓴다 (이 브라우저에만 저장)
export interface Student { no: number; name: string }

const STORE = 'ssamtool.roster.v1'

export function loadRoster(): Student[] {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '[]') } catch { return [] }
}

export function saveRoster(list: Student[]) {
  if (list.length) try { localStorage.setItem(STORE, JSON.stringify(list)) } catch { /* 저장 못 해도 동작에는 문제 없음 */ }
}

// "1 김하늘", "김하늘", 엑셀 복사(번호·이름 칸) 등 한 줄에 한 명씩
export function parseRoster(text: string): Student[] {
  const out: Student[] = []
  text.replace(/\r/g, '').split('\n').forEach(line => {
    const cells = line.split(/\t|,|\s+/).map(c => c.trim()).filter(Boolean)
    const no = cells.find(c => /^\d{1,3}$/.test(c))
    const name = cells.find(c => /^[가-힣]{2,5}$/.test(c) && !/^(번호|이름|성명)$/.test(c))
    if (name) out.push({ no: no ? Number(no) : out.length + 1, name })
  })
  return out
}
