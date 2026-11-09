import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { DropZone } from '../../components/DropZone'
import { downloadBlob } from '../../lib/files'
import { parseFile, parsePasted } from '../../lib/table'
import { count, KINDS, REASONS, toRecords } from './stats'

const SAMPLE = '번호\t이름\t일자\t출결구분\t사유\n1\t김하늘\t2026-03-04\t결석\t질병\n2\t이도윤\t2026-04-02\t지각\t미인정\n1\t김하늘\t2026-04-15\t결석\t인정\n4\t최지호\t2026-05-11\t조퇴\t질병\n2\t이도윤\t2026-05-20\t지각\t미인정\n5\t정하은\t2026-06-03\t결석\t질병'

export function Attendance() {
  const [text, setText] = useState(SAMPLE)
  const [isSample, setIsSample] = useState(true)
  const recs = useMemo(() => { const t = parsePasted(text, true); return toRecords(t.headers, t.rows) }, [text])
  const kr = count(recs, r => `${r.kind}|${r.reason}`)
  const months = [...new Set(recs.map(r => r.month))].sort((a, b) => a - b)
  const mk = count(recs, r => `${r.month}|${r.kind}`)
  const people = [...count(recs, r => r.name)].sort((a, b) => b[1] - a[1])
  const pk = count(recs, r => `${r.name}|${r.kind}`)
  const n = (m: Map<string, number>, k: string) => m.get(k) ?? 0

  const sheets: [string, (string | number)[][]][] = [
    ['종류·사유', [['구분', ...REASONS, '계'], ...KINDS.map(k => [k, ...REASONS.map(r => n(kr, `${k}|${r}`)), REASONS.reduce((s, r) => s + n(kr, `${k}|${r}`), 0)])]],
    ['월별', [['월', ...KINDS], ...months.map(m => [m ? `${m}월` : '날짜 없음', ...KINDS.map(k => n(mk, `${m}|${k}`))])]],
    ['학생별', [['이름', ...KINDS, '계'], ...people.map(([p, t]) => [p, ...KINDS.map(k => n(pk, `${p}|${k}`)), t])]],
  ]
  const save = () => {
    const wb = XLSX.utils.book_new()
    sheets.forEach(([name, rows]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name))
    downloadBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer]), '출결_통계.xlsx')
  }

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="panel-head"><h2>출결 기록</h2><span className="meta num">{recs.length}건 읽음</span></div>
        <DropZone accept=".xlsx,.xls,.csv" multiple={false} label="나이스에서 내려받은 출결 엑셀" hint="또는 아래에 표를 복사해 붙여넣으세요." onFiles={async f => {
          const t = await parseFile(f[0], true)
          setText([t.headers, ...t.rows].map(r => r.join('\t')).join('\n')); setIsSample(false)
        }} />
        <label className="field">표 붙여넣기 (첫 줄은 열 이름)
          <textarea rows={8} value={text} onChange={e => { setText(e.target.value); setIsSample(false) }} />
        </label>
        <p className="note">{isSample && <b className="warn">예시 기록이에요. </b>}이름·일자·구분(결석·지각·조퇴·결과)·사유(질병·미인정·인정·기타) 열을 알아서 찾아요. "질병결석"처럼 한 칸에 함께 써도 돼요. 기록은 브라우저 밖으로 나가지 않아요.</p>
        <div className="row"><button className="btn primary" disabled={!recs.length} onClick={save}>통계 엑셀 저장</button></div>
      </section>

      <section className="panel">
        {sheets.map(([name, rows]) => (
          <div key={name} className="scroll-x">
            <div className="pm-label">{name}</div>
            <table className="list">
              <thead><tr>{rows[0].map((h, i) => <th key={i} className={i ? 'num' : undefined}>{h}</th>)}</tr></thead>
              <tbody>{rows.slice(1).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'num' : undefined}>{c || (j ? '·' : c)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  )
}
