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
    const ni = cells.findIndex(c => /^[가-힣]{2,5}$/.test(c) && !/^(번호|이름|성명|학년)$/.test(c))
    if (ni < 0) return
    // "4 2 7 김하늘"(학년 반 번호 이름)이면 이름 바로 앞 숫자가 번호. 앞에 숫자가 없으면 뒤에서 찾는다
    const no = cells.slice(0, ni).reverse().find(c => /^\d{1,3}$/.test(c)) ?? cells.slice(ni + 1).find(c => /^\d{1,3}$/.test(c))
    out.push({ no: no ? Number(no) : out.length + 1, name: cells[ni] })
  })
  // 번호는 응답을 구분하는 열쇠라 겹치면 안 된다
  return new Set(out.map(s => s.no)).size === out.length ? out : out.map((s, i) => ({ ...s, no: i + 1 }))
}
