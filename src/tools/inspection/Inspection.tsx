import { useState } from 'react'
import { DocTool, S } from '../../components/DocTool'
import { DropZone } from '../../components/DropZone'
import { downloadBlob, extOf } from '../../lib/files'
import { loadSchool } from '../../lib/school'
import { merge } from '../pdfMerge/PdfMerge'
import { amountOf, moneyText, parseItems, won } from '../pumui/items'

const SAMPLE = {
  title: '4학년 수업 자료 제작 물품 구입', vendor: '○○문구', delivered: '2026. 11. 10.', checked: '2026. 11. 10.',
  inspector: '교사 ○○○', witness: '행정실 주무관 ○○○',
  items: '품명\t규격\t단위\t수량\t단가\n복사용지\tA4 80g\t박스\t3\t24500\n보드마커\t4색 세트\t세트\t10\t5800',
}

export function Inspection() {
  const [f, setF] = useState(SAMPLE)
  const [proof, setProof] = useState<File[]>([])
  const [msg, setMsg] = useState('')
  const set = (k: keyof typeof SAMPLE, v: string) => setF(p => ({ ...p, [k]: v }))
  const items = parseItems(f.items).items
  const total = items.reduce((s, i) => s + amountOf(i), 0)
  const field = (k: keyof typeof SAMPLE, label: string) => <label className="field grow">{label}<input value={f[k]} onChange={e => set(k, e.target.value)} /></label>

  const bundle = async () => {
    setMsg('묶는 중…')
    try { downloadBlob(new Blob([(await merge(proof, true)) as BlobPart], { type: 'application/pdf' }), `${f.title}_증빙.pdf`); setMsg('') }
    catch (e) { setMsg(`묶지 못했어요: ${(e as Error).message}`) }
  }

  const form = (
    <>
      <section className="panel">
        <div className="panel-head"><h2>검수 정보</h2></div>
        {field('title', '건명')}
        <div className="row">{field('vendor', '납품 업체')}{field('delivered', '납품일')}{field('checked', '검수일')}</div>
        <div className="row">{field('inspector', '검수자')}{field('witness', '입회자')}</div>
        <label className="field">품목 (품의 도우미의 "품목 표 복사"를 그대로 붙여넣어도 돼요)
          <textarea rows={5} value={f.items} onChange={e => set('items', e.target.value)} />
        </label>
        <p className="note num">{items.length}개 품목 · 합계 {won(total)}원</p>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>증빙 묶기</h2><span className="meta num">{proof.length}개</span></div>
        <DropZone accept=".pdf,image/*" label="견적서 · 거래명세서 · 사진" hint="넣은 순서대로 PDF 하나로 묶어요." onFiles={fs => setProof(p => [...p, ...fs.filter(x => ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(extOf(x.name)))])} />
        {proof.length > 0 && <p className="note">{proof.map((p, i) => `${i + 1}. ${p.name}`).join('  ')}</p>}
        <div className="row">
          <button className="btn primary" disabled={!proof.length} onClick={bundle}>증빙 PDF 하나로 저장</button>
          <button className="btn" disabled={!proof.length} onClick={() => setProof([])}>비우기</button>
        </div>
        {msg && <p className="note">{msg}</p>}
      </section>
    </>
  )

  return (
    <DocTool form={form} fileName={`${f.title} 검수조서`}>
      <div style={S.title}>검 수 조 서</div>
      <table style={S.table}><tbody>
        <tr><th style={{ ...S.head, width: '18%' }}>건명</th><td style={S.cell} colSpan={3}>{f.title}</td></tr>
        <tr><th style={S.head}>납품 업체</th><td style={S.cell}>{f.vendor}</td><th style={{ ...S.head, width: '18%' }}>금액</th><td style={S.cell}>{moneyText(total)}</td></tr>
        <tr><th style={S.head}>납품일</th><td style={S.cell}>{f.delivered}</td><th style={S.head}>검수일</th><td style={S.cell}>{f.checked}</td></tr>
      </tbody></table>
      <table style={S.table}><tbody>
        <tr>{['품명', '규격', '단위', '수량', '단가', '금액'].map(h => <th key={h} style={S.head}>{h}</th>)}</tr>
        {items.map((i, k) => (
          <tr key={k}><td style={S.cell}>{i.name}</td><td style={S.cell}>{i.spec}</td><td style={{ ...S.cell, ...S.center }}>{i.unit}</td>
            <td style={{ ...S.cell, ...S.right }}>{won(i.qty)}</td><td style={{ ...S.cell, ...S.right }}>{won(i.price)}</td><td style={{ ...S.cell, ...S.right }}>{won(amountOf(i))}</td></tr>
        ))}
        <tr><th style={S.head} colSpan={5}>합계</th><td style={{ ...S.cell, ...S.right, fontWeight: 700 }}>{won(total)}</td></tr>
      </tbody></table>
      <p>위 물품을 검수한 결과 규격·수량·품질에 이상이 없음을 확인합니다.</p>
      <p style={S.right}>{f.checked}</p>
      <p style={S.right}>검수자: {f.inspector} (인)</p>
      <p style={S.right}>입회자: {f.witness} (인)</p>
      <p style={{ ...S.center, fontWeight: 700, fontSize: '13pt', marginTop: '14pt' }}>{loadSchool().name}장 귀하</p>
    </DocTool>
  )
}
