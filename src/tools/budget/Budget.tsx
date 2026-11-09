import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { DropZone } from '../../components/DropZone'
import { downloadBlob } from '../../lib/files'
import { parseFile, parsePasted } from '../../lib/table'
import { won } from '../pumui/items'

const SAMPLE = '세부사업\t예산액\t집행액\n학년 교육과정 운영\t3,000,000\t2,450,000\n현장체험학습\t5,600,000\t5,600,000\n도서 구입\t1,200,000\t310,000\n학급 운영비\t2,400,000\t1,980,000\n방과후 학교\t4,000,000\t3,120,000'
const num = (s = '') => Number(s.replace(/[^\d.-]/g, '')) || 0

export function Budget() {
  const [text, setText] = useState(SAMPLE)
  const [isSample, setIsSample] = useState(true)
  const [warn, setWarn] = useState(70)
  const rows = useMemo(() => {
    const t = parsePasted(text, true)
    const find = (re: RegExp) => t.headers.findIndex(h => re.test(h))
    const iName = Math.max(0, find(/사업|과목|항목|명/)), iBudget = find(/예산|배정/), iSpent = find(/집행|지출|사용/)
    if (iBudget < 0 || iSpent < 0) return []
    return t.rows.filter(r => r[iName]).map(r => {
      const budget = num(r[iBudget]), spent = num(r[iSpent])
      return { name: r[iName], budget, spent, left: budget - spent, rate: budget ? (spent / budget) * 100 : 0 }
    })
  }, [text])
  const total = rows.reduce((s, r) => ({ budget: s.budget + r.budget, spent: s.spent + r.spent }), { budget: 0, spent: 0 })
  const low = rows.filter(r => r.rate < warn)

  const save = () => {
    const aoa = [['사업', '예산액', '집행액', '잔액', '집행률(%)'], ...rows.map(r => [r.name, r.budget, r.spent, r.left, Math.round(r.rate * 10) / 10]),
      ['합계', total.budget, total.spent, total.budget - total.spent, total.budget ? Math.round((total.spent / total.budget) * 1000) / 10 : 0]]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), '집행 현황')
    downloadBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer]), '예산_집행_현황.xlsx')
  }

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="panel-head"><h2>에듀파인 자료</h2><span className="meta num">{rows.length}개 사업</span></div>
        <DropZone accept=".xlsx,.xls,.csv" multiple={false} label="에듀파인에서 내려받은 엑셀" hint="사업명·예산액·집행액 열이 있으면 돼요." onFiles={async f => {
          const t = await parseFile(f[0], true)
          setText([t.headers, ...t.rows].map(r => r.join('\t')).join('\n')); setIsSample(false)
        }} />
        <label className="field">표 붙여넣기 (첫 줄은 열 이름)
          <textarea rows={8} value={text} onChange={e => { setText(e.target.value); setIsSample(false) }} />
        </label>
        {!rows.length && <p className="note warn">예산액(또는 배정액)과 집행액(또는 지출액) 열을 찾지 못했어요. 첫 줄에 열 이름이 있는지 확인해 주세요.</p>}
        <div className="row">
          <label className="field">집행률 경고 기준<span className="row" style={{ gap: 6, alignItems: 'center' }}><input type="number" min={0} max={100} value={warn} onChange={e => setWarn(Number(e.target.value))} /> % 미만</span></label>
          <button className="btn primary" disabled={!rows.length} onClick={save}>현황표 엑셀 저장</button>
        </div>
        <p className="note">{isSample && <b className="warn">예시 자료예요. </b>}{low.length ? `집행률이 ${warn}%보다 낮은 사업: ${low.map(r => r.name).join(', ')}` : '모든 사업이 기준 이상 집행됐어요.'}</p>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>집행 현황</h2><span className="meta num">전체 {total.budget ? ((total.spent / total.budget) * 100).toFixed(1) : 0}% · 잔액 {won(total.budget - total.spent)}원</span></div>
        <div className="scroll-x">
          <table className="list">
            <thead><tr><th>사업</th><th className="num">예산액</th><th className="num">집행액</th><th className="num">잔액</th><th>집행률</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td><td className="num">{won(r.budget)}</td><td className="num">{won(r.spent)}</td><td className="num">{won(r.left)}</td>
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: 'var(--raised)', borderRadius: 4 }}><div style={{ width: `${Math.min(100, r.rate)}%`, height: '100%', borderRadius: 4, background: r.rate < warn ? '#d71e1e' : 'var(--primary)' }} /></div>
                      <span className="num">{r.rate.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
