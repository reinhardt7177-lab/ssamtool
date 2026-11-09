import { useState } from 'react'
import { DocTool, S } from '../../components/DocTool'
import { won, moneyText } from '../pumui/items'
import { calc, TAX_NAME, type Row, type Tax } from './calc'

const PRESETS: Record<string, Row> = {
  lecture: { kind: '강사 수당', who: '', qty: 2, unit: '시간', price: 100_000, tax: 'other' },
  extra: { kind: '강사 수당(초과)', who: '', qty: 1, unit: '시간', price: 50_000, tax: 'other' },
  meeting: { kind: '협의회비', who: '', qty: 10, unit: '명', price: 8_000, tax: 'none' },
}
const SAMPLE: Row[] = [{ ...PRESETS.lecture, who: '홍길동' }, { ...PRESETS.meeting, who: '학년 협의회' }]

export function Allowance() {
  const [rows, setRows] = useState<Row[]>(SAMPLE)
  const [title, setTitle] = useState('교원 연수 강사 수당 및 협의회비')
  const set = (i: number, p: Partial<Row>) => setRows(rs => rs.map((r, k) => (k === i ? { ...r, ...p } : r)))
  const done = rows.map(r => ({ r, ...calc(r) }))
  const sum = (k: 'amount' | 'income' | 'local' | 'pay') => done.reduce((s, d) => s + d[k], 0)
  const basis = done.map(d => `${d.r.kind}(${d.r.who || '-'}) ${won(d.r.price)}원 × ${d.r.qty}${d.r.unit} = ${won(d.amount)}원`).join('\n') + `\n합계: ${won(sum('amount'))}원`
  const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0

  const form = (
    <section className="panel">
      <div className="panel-head"><h2>지급 내역</h2><span className="meta">단가는 학교·교육청 기준표에 맞게 고치세요</span></div>
      <label className="field grow">건명<input value={title} onChange={e => setTitle(e.target.value)} /></label>
      <div className="scroll-x">
        <table className="list pm-table">
          <thead><tr><th>구분</th><th>대상</th><th className="num">수량</th><th>단위</th><th className="num">단가</th><th>세금</th><th className="num">지급액</th><th></th></tr></thead>
          <tbody>
            {done.map(({ r, amount }, i) => (
              <tr key={i}>
                <td><input aria-label={`${i + 1}번 구분`} value={r.kind} onChange={e => set(i, { kind: e.target.value })} /></td>
                <td><input aria-label={`${i + 1}번 대상`} value={r.who} onChange={e => set(i, { who: e.target.value })} /></td>
                <td className="num"><input aria-label={`${i + 1}번 수량`} className="w-num" inputMode="decimal" value={r.qty} onChange={e => set(i, { qty: num(e.target.value) })} /></td>
                <td><input aria-label={`${i + 1}번 단위`} className="w-unit" value={r.unit} onChange={e => set(i, { unit: e.target.value })} /></td>
                <td className="num"><input aria-label={`${i + 1}번 단가`} className="w-num" inputMode="numeric" value={won(r.price)} onChange={e => set(i, { price: num(e.target.value) })} /></td>
                <td><select aria-label={`${i + 1}번 세금`} value={r.tax} onChange={e => set(i, { tax: e.target.value as Tax })}>{(Object.keys(TAX_NAME) as Tax[]).map(t => <option key={t} value={t}>{TAX_NAME[t]}</option>)}</select></td>
                <td className="num">{won(amount)}</td>
                <td><button className="btn text small" onClick={() => setRows(rs => rs.filter((_, k) => k !== i))}>빼기</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button className="btn small" onClick={() => setRows(rs => [...rs, { ...PRESETS.lecture }])}>강사 수당 더하기</button>
        <button className="btn small" onClick={() => setRows(rs => [...rs, { ...PRESETS.extra }])}>초과 시간 더하기</button>
        <button className="btn small" onClick={() => setRows(rs => [...rs, { ...PRESETS.meeting }])}>협의회비 더하기</button>
      </div>
      <pre className="pm-body">{basis}</pre>
      <p className="note">기타소득은 지급액이 12만 5천 원 이하면 세금이 없어요(과세 최저한). 소득세·지방소득세는 10원 미만을 버려요. 강사가 사업자라면 사업소득 3.3%를 고르세요.</p>
    </section>
  )

  return (
    <DocTool form={form} fileName={`${title} 지급 내역`} text={basis}>
      <div style={S.title}>{title || '수당'} 지급 내역</div>
      <table style={S.table}><tbody>
        <tr>{['구분', '대상', '산출 내역', '지급액', '소득세', '지방소득세', '실지급액'].map(h => <th key={h} style={S.head}>{h}</th>)}</tr>
        {done.map(({ r, amount, income, local, pay }, i) => (
          <tr key={i}>
            <td style={S.cell}>{r.kind}</td><td style={S.cell}>{r.who}</td>
            <td style={S.cell}>{won(r.price)}원 × {r.qty}{r.unit}</td>
            <td style={{ ...S.cell, ...S.right }}>{won(amount)}</td><td style={{ ...S.cell, ...S.right }}>{won(income)}</td>
            <td style={{ ...S.cell, ...S.right }}>{won(local)}</td><td style={{ ...S.cell, ...S.right }}>{won(pay)}</td>
          </tr>
        ))}
        <tr>
          <th style={S.head} colSpan={3}>합계</th>
          {(['amount', 'income', 'local', 'pay'] as const).map(k => <td key={k} style={{ ...S.cell, ...S.right, fontWeight: 700 }}>{won(sum(k))}</td>)}
        </tr>
      </tbody></table>
      <p>소요 예산: {moneyText(sum('amount'))}</p>
    </DocTool>
  )
}
