import { apply, check } from '../gongmunCheck/rules'
import { attachmentText } from '../pdfMerge/PdfMerge'

export interface Draft { to: string; title: string; related: string[]; purpose: string; items: string[]; more: string[]; attach: string[] }

const KO = '가나다라마바사아자차카타파하'

// 공문 본문 틀: 1. 관련 → 2. 목적 문장과 가. 나. 항목 → 3. 이후 문장 → 붙임·끝. 표시. 날짜·시간 표기는 규칙 검사기로 고친다
export function draftText(d: Draft): string {
  const body: string[] = []
  let n = 1
  if (d.related.length === 1) body.push(`${n++}. 관련: ${d.related[0]}`)
  else if (d.related.length > 1) { body.push(`${n++}. 관련`); d.related.forEach((r, i) => body.push(`  ${KO[i]}. ${r}`)) }
  if (d.purpose) { body.push(`${n++}. ${d.purpose}`); d.items.forEach((t, i) => body.push(`  ${KO[i]}. ${t}`)) }
  d.more.forEach(m => body.push(`${n++}. ${m}`))
  if (d.attach.length) { body.push(''); body.push(attachmentText(d.attach)) }
  else if (body.length) body[body.length - 1] += '  끝.'
  const text = [`수신  ${d.to || '내부결재'}`, `제목  ${d.title}`, '', ...body].join('\n')
  return apply(text, check(text).filter(i => i.level === 'fix' && i.after !== null))
}
