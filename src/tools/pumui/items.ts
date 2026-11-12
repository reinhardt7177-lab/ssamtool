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
  const iAmount = head.findIndex((h, i) => i !== col.price && /^(금액|합계금액|공급가액)/.test(h))
  const items: Item[] = []
  let skipped = 0
  for (const r of hasHead ? rows.slice(1) : rows) {
    let it: Item | null = null
    if (hasHead) {
      const qty = toNum(r[col.qty ?? -1] ?? '') ?? 1
      const price = toNum(r[col.price ?? -1] ?? '')
      // 금액 칸이 있으면 수량×단가와 맞는지 본다: 칸이 밀린 줄을 품목으로 넣지 않으려고
      const amount = iAmount >= 0 ? toNum(r[iAmount] ?? '') : null
      const blankAmount = iAmount < 0 || !(r[iAmount] ?? '').trim() // 금액 칸에 숫자 아닌 글자가 있으면 밀린 줄이다
      const fits = blankAmount || (amount !== null && price !== null && Math.abs(qty * price - amount) <= 1)
      if (r[col.name!] && toNum(r[col.name!]) === null && price !== null && fits) it = { name: r[col.name!], spec: r[col.spec ?? -1] ?? '', unit: r[col.unit ?? -1] ?? '개', qty, price }
    } else {
      const nums = r.map(toNum)
      const texts = r.filter((c, i) => nums[i] === null && c)
      const vals = nums.filter((n): n is number => n !== null)
      if (texts.length && vals.length >= 2) {
        let [qty, price] = vals
        // 숫자 셋이면 수량·단가·금액이 어떤 순서든: 곱이 나머지 하나와 맞는 두 수를 찾아 작은 쪽을 수량으로 본다
        if (vals.length >= 3) {
          const [a, b, c] = vals
          const pair = Math.abs(a * b - c) <= 1 ? [a, b] : Math.abs(a * c - b) <= 1 ? [a, c] : Math.abs(b * c - a) <= 1 ? [b, c] : null
          if (pair) { qty = Math.min(...pair); price = Math.max(...pair) }
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

// 견적서 PDF·한글에서 읽은 글: 표는 칸마다 한 줄로 나오므로, 제목 칸(품명·수량·단가…)이 이어진 곳을 찾아
// 그 칸 수만큼 줄을 묶어 한 행으로 되돌린 뒤 parseItems에 넘긴다. 한 줄에 한 품목인 글이면 그대로 읽는다.
export function itemsFromQuote(text: string): { items: Item[]; skipped: number } {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()) // 빈 줄은 빈 칸일 수 있어 남긴다
  const isHead = (l: string) => Object.values(HEAD).some(r => r.test(l)) || /^(금액|합계금액|공급가액|비고|번호|순번|No\.?)$/i.test(l)
  let best = parseItems(lines.filter(Boolean).join('\n'))
  for (let i = 0; i < lines.length; i++) {
    if (!HEAD.name.test(lines[i])) continue
    let k = i
    while (k < lines.length && isHead(lines[k]) && lines[k].length <= 8) k++
    const w = k - i
    if (w < 3) continue
    const rows = [lines.slice(i, k).join('\t')]
    for (let j = k; j + w <= lines.length && !/^(합\s*계|총\s*계|소\s*계)/.test(lines[j]); j += w) rows.push(lines.slice(j, j + w).join('\t'))
    const got = parseItems(rows.join('\n'))
    if (got.items.length > best.items.length) best = got
    // 빈 칸이 줄로 안 나오는 문서도 있다: 빈 줄을 빼고, 늘 비는 끝 칸(비고 등)을 한두 개 덜어 가며 묶어 본다.
    // 칸 수가 틀리면 수량×단가가 금액과 안 맞아 걸러지므로, 가장 많이 읽힌 쪽이 맞는 쪽이다
    const tight = lines.slice(k).filter(Boolean)
    // 금액 칸까지는 남겨야 그 검사를 할 수 있어서, 금액 칸 뒤의 칸만 덜어 본다
    const amountAt = lines.slice(i, k).findIndex(h => /^(금액|합계금액|공급가액)/.test(h))
    for (let ww = w; amountAt >= 0 && ww > amountAt && ww >= w - 2; ww--) {
      const rows2 = [lines.slice(i, i + ww).join('\t')]
      for (let j = 0; j + ww <= tight.length && !/^(합\s*계|총\s*계|소\s*계)/.test(tight[j]); j += ww) rows2.push(tight.slice(j, j + ww).join('\t'))
      const g = parseItems(rows2.join('\n'))
      if (g.items.length > best.items.length) best = g
    }
  }
  return best
}
