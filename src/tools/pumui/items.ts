import { moneyToHangul } from '../gongmunCheck/rules'

export interface Item { name: string; spec: string; unit: string; qty: number; price: number }

export const amountOf = (i: Item) => Math.round(i.qty * i.price)
export const won = (n: number) => n.toLocaleString('ko-KR')
export const moneyText = (n: number) => `금${won(n)}원(금${moneyToHangul(n)}원)`

const toNum = (s: string) => {
  const t = s.replace(/[,원\s₩]/g, '')
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null
}

const HEAD = {
  name: /품명|상품명|제품명|물품명|품목/,
  spec: /규격|옵션|사양|모델/,
  unit: /단위/,
  qty: /수량|개수/,
  price: /단가|판매가|가격|금액\(단가\)/,
}

// 엑셀·쇼핑몰 장바구니에서 복사한 표를 품목으로 바꾼다.
// 제목 줄이 있으면 열 이름으로 찾고, 없으면 글자 칸은 품명·규격·단위, 숫자 칸은 수량·단가(·금액)로 본다.
export function parseItems(text: string): { items: Item[]; skipped: number } {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) return { items: [], skipped: 0 }
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(',') && !/\d,\d{3}/.test(lines[0]) ? ',' : null
  // 탭·쉼표가 없으면 띄어쓰기로 쓴 줄: 끝의 숫자들은 수량·단가(·금액), 그 앞의 짧은 단위 말, 나머지는 품명
  const UNITS = /^(개|박스|상자|세트|팩|권|장|매|건|통|병|롤|대|식|켤레|묶음|EA|ea|box)$/
  const splitSpaces = (l: string) => {
    const t = l.split(/\s+/)
    const nums: string[] = []
    while (t.length && toNum(t[t.length - 1]) !== null && nums.length < 3) nums.unshift(t.pop()!)
    const unit = t.length > 1 && UNITS.test(t[t.length - 1]) ? t.pop()! : ''
    return [t.join(' '), unit, ...nums]
  }
  const rows = lines.map(l => (sep ? l.split(sep) : splitSpaces(l)).map(c => c.trim()))
  const head = rows[0]
  const col: Partial<Record<keyof typeof HEAD, number>> = {}
  head.forEach((h, i) => {
    for (const k of Object.keys(HEAD) as (keyof typeof HEAD)[]) if (col[k] === undefined && HEAD[k].test(h)) col[k] = i
  })
  const hasHead = col.name !== undefined && (col.qty !== undefined || col.price !== undefined)
  const items: Item[] = []
  let skipped = 0
  for (const r of hasHead ? rows.slice(1) : rows) {
    let it: Item | null = null
    if (hasHead) {
      const qty = toNum(r[col.qty ?? -1] ?? '') ?? 1
      const price = toNum(r[col.price ?? -1] ?? '')
      if (r[col.name!] && price !== null) it = { name: r[col.name!], spec: r[col.spec ?? -1] ?? '', unit: r[col.unit ?? -1] ?? '개', qty, price }
    } else {
      const nums = r.map(toNum)
      const texts = r.filter((c, i) => nums[i] === null && c)
      const vals = nums.filter((n): n is number => n !== null)
      if (texts.length && vals.length >= 2) {
        let qty = vals[0], price = vals[1]
        // 숫자 셋이면 수량·단가·금액: 수량×단가가 금액과 맞는지 보고 순서를 정한다
        if (vals.length >= 3 && Math.abs(vals[0] * vals[1] - vals[2]) > 1 && Math.abs(vals[1] * vals[0] - vals[2]) > 1) {
          price = vals[0]; qty = vals[1]
        }
        const short = texts.find((t, i) => i > 0 && t.length <= 3)
        it = { name: texts[0], spec: texts.find((t, i) => i > 0 && t !== short) ?? '', unit: short ?? '개', qty, price }
      }
    }
    if (it) items.push(it); else skipped++
  }
  return { items, skipped }
}

// 산출 기초: "복사용지(A4 80g) 3박스 × 24,500원 = 73,500원"
export const basisLine = (i: Item) =>
  `${i.name}${i.spec ? `(${i.spec})` : ''} ${won(i.qty)}${i.unit} × ${won(i.price)}원 = ${won(amountOf(i))}원`

export interface Meta {
  title: string
  purpose: string
  account: string
  method: string
  due: string
  related: string
}

export function pumuiBody(meta: Meta, items: Item[]): string {
  const total = items.reduce((s, i) => s + amountOf(i), 0)
  const first = items[0]?.name ?? '물품'
  const what = items.length > 1 ? `${first} 외 ${items.length - 1}종` : first
  const lines: string[] = []
  let n = 1
  if (meta.related.trim()) lines.push(`${n++}. 관련: ${meta.related.trim()}`)
  lines.push(`${n++}. ${meta.purpose.trim() || '교육 활동'}에 필요한 물품을 다음과 같이 구입하고자 합니다.`)
  const sub = [
    `품명: ${what}`,
    `소요 예산: ${moneyText(total)}`,
    meta.account.trim() && `예산 과목: ${meta.account.trim()}`,
    meta.method.trim() && `구입 방법: ${meta.method.trim()}`,
    meta.due.trim() && `납품 기한: ${meta.due.trim()}`,
  ].filter(Boolean) as string[]
  const ko = '가나다라마바사'
  sub.forEach((s, i) => lines.push(`  ${ko[i]}. ${s}`))
  lines.push('')
  lines.push('붙임  물품 구입 내역 1부.  끝.')
  return lines.join('\n')
}

export const SAMPLE_ITEMS: Item[] = [
  { name: '복사용지', spec: 'A4 80g 2,500매', unit: '박스', qty: 3, price: 24500 },
  { name: '보드마커', spec: '4색 세트', unit: '세트', qty: 10, price: 5800 },
  { name: '코팅지', spec: 'A4 100매', unit: '팩', qty: 2, price: 12900 },
  { name: '배송비', spec: '', unit: '건', qty: 1, price: 3000 },
]
