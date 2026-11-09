// 나이스 출결 엑셀(또는 손으로 쓴 표)을 종류·사유·월·학생별로 센다
export const KINDS = ['결석', '지각', '조퇴', '결과'] as const
export const REASONS = ['질병', '미인정', '인정', '기타'] as const
export interface Rec { name: string; month: number; kind: string; reason: string; days: number }

const col = (headers: string[], re: RegExp) => headers.findIndex(h => re.test(h))

export function toRecords(headers: string[], rows: string[][]): Rec[] {
  const iName = col(headers, /이름|성명/), iDate = col(headers, /날짜|일자|일시|기간|시작/)
  const iKind = col(headers, /구분|출결|종류|유형/), iReason = col(headers, /사유|구분2/), iDays = col(headers, /일수|횟수|^수$/)
  const out: Rec[] = []
  for (const r of rows) {
    const all = r.join(' ')
    const kind = KINDS.find(k => (iKind >= 0 ? r[iKind] : all).includes(k))
    if (!kind) continue
    // "미인정"이 "인정"을 품고 있어서 긴 것부터 찾는다
    const reason = REASONS.find(k => (iReason >= 0 ? r[iReason] + ' ' + (r[iKind] ?? '') : all).includes(k)) ?? '기타'
    const d = (iDate >= 0 ? r[iDate] : all).match(/(?:\d{4}[.\-/년]\s*)?(\d{1,2})\s*[.\-/월]\s*\d{1,2}/)
    out.push({ name: iName >= 0 ? r[iName] : (all.match(/[가-힣]{2,4}/)?.[0] ?? ''), month: d ? Number(d[1]) : 0, kind, reason, days: iDays >= 0 ? Number(r[iDays]) || 1 : 1 })
  }
  return out
}

export function count(recs: Rec[], key: (r: Rec) => string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of recs) m.set(key(r), (m.get(key(r)) ?? 0) + r.days)
  return m
}
