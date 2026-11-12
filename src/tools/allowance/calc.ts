// 강사 수당·협의회비 한 줄 계산과 원천징수
export type Tax = 'none' | 'other' | 'biz'
export interface Row { kind: string; who: string; qty: number; unit: string; price: number; tax: Tax }

export const TAX_NAME: Record<Tax, string> = { none: '세금 없음', other: '기타소득 8.8%', biz: '사업소득 3.3%' }
const floor10 = (n: number) => Math.floor(n / 10) * 10 // 원 단위 버림

// 기타소득: 필요경비 60%를 뺀 소득의 20% + 지방소득세 10%. 소득금액 5만 원 이하(지급 12만5천 원 이하)는 과세 최저한
// 사업소득: 지급액의 3% + 지방소득세 10%
export function taxOf(amount: number, tax: Tax): { income: number; local: number } {
  if (tax === 'none' || (tax === 'other' && amount * 0.4 <= 50_000)) return { income: 0, local: 0 }
  const income = floor10(tax === 'other' ? amount * 0.4 * 0.2 : amount * 0.03)
  return { income, local: floor10(income * 0.1) }
}

// 같은 사람에게 같은 소득으로 주는 줄은 합친 금액으로 세금을 매기고(과세 최저한도 합계로 판단), 금액 비율로 줄마다 나눈다
export function calcAll(rows: Row[]) {
  const amounts = rows.map(r => Math.round(r.qty * r.price))
  const key = rows.map((r, i) => (r.who.trim() ? `${r.who.trim()}|${r.tax}` : `#${i}`))
  const total = new Map<string, number>(), left = new Map<string, { income: number; local: number }>()
  key.forEach((k, i) => total.set(k, (total.get(k) ?? 0) + amounts[i]))
  return rows.map((r, i) => {
    const k = key[i], sum = total.get(k)!
    const rest = left.get(k) ?? taxOf(sum, r.tax)
    const last = key.lastIndexOf(k) === i
    const share = (n: number) => (last || !sum ? n : Math.min(n, floor10((n * amounts[i]) / sum)))
    const income = share(rest.income), local = share(rest.local)
    left.set(k, { income: rest.income - income, local: rest.local - local })
    return { amount: amounts[i], income, local, pay: amounts[i] - income - local }
  })
}
