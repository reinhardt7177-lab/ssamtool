import { useState } from 'react'
import * as XLSX from 'xlsx'
import { downloadBlob } from '../../lib/files'
import { htmlToHwpx, hwpText } from '../../lib/hwp'
import { DropZone } from '../../components/DropZone'
import { amountOf, basisLine, itemsFromQuote, moneyText, parseItems, pumuiBody, SAMPLE_ITEMS, won, type Item, type Meta } from './items'

const EMPTY: Item = { name: '', spec: '', unit: '개', qty: 1, price: 0 }
// 지방계약법 시행령 제30조: 추정가격 2천만 원 이하는 1인 견적 수의계약
const ONE_QUOTE_LIMIT = 20_000_000

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const TD = 'border:1px solid #000;padding:3pt 5pt'

// 품의 제목·본문 뒤에 붙임(물품 구입 내역) 표를 이어 붙인 한글 문서용 HTML
function pumuiHtml(title: string, body: string, items: Item[], total: number) {
  const lines = body.split('\n').map(l => `<p>${esc(l).replace(/^ +/, m => '&nbsp;'.repeat(m.length * 2)) || '&nbsp;'}</p>`).join('')
  const rows = items.map(i => `<tr><td style="${TD}">${esc(i.name)}</td><td style="${TD}">${esc(i.spec)}</td><td style="${TD};text-align:center">${esc(i.unit)}</td><td style="${TD};text-align:right">${won(i.qty)}</td><td style="${TD};text-align:right">${won(i.price)}</td><td style="${TD};text-align:right">${won(amountOf(i))}</td></tr>`).join('')
  const head = ['품명', '규격', '단위', '수량', '단가(원)', '금액(원)'].map(h => `<td style="${TD};text-align:center;font-weight:bold;background:#eee">${h}</td>`).join('')
  return `<p style="font-size:15pt;font-weight:bold">${esc(title)}</p>${lines}<p>&nbsp;</p><p style="font-weight:bold">[붙임] 물품 구입 내역</p>`
    + `<table style="border-collapse:collapse;width:100%"><tr>${head}</tr>${rows}<tr><td style="${TD};text-align:center;font-weight:bold" colspan="5">합계</td><td style="${TD};text-align:right;font-weight:bold">${won(total)}</td></tr></table>`
}

export function Pumui() {
  const [items, setItems] = useState<Item[]>(SAMPLE_ITEMS)
  const [isSample, setIsSample] = useState(true)
  const [paste, setPaste] = useState('')
  const [pasteMsg, setPasteMsg] = useState('')
  const [budget, setBudget] = useState('300000')
  const [meta, setMeta] = useState<Meta>({ title: '', purpose: '4학년 수업 자료 제작', account: '', method: '학교장터(S2B) 구매', due: '', related: '' })
  const [copied, setCopied] = useState('')

  const total = items.reduce((s, i) => s + amountOf(i), 0)
  const budgetN = Number(budget.replace(/,/g, '')) || 0
  const left = budgetN - total
  const over = budgetN > 0 && left < 0

  const setItem = (i: number, patch: Partial<Item>) => { setItems(xs => xs.map((x, k) => (k === i ? { ...x, ...patch } : x))); setIsSample(false) }
  const setM = (k: keyof Meta, v: string) => setMeta(m => ({ ...m, [k]: v }))

  const importQuote = async (fs: File[]) => {
    const f = fs[0]
    if (!f || !/\.(pdf|hwpx?)$/i.test(f.name)) { setPasteMsg('견적서는 PDF나 한글 파일로 넣어 주세요.'); return }
    setPasteMsg('견적서 읽는 중… (처음 한 번은 한글 엔진을 받아요)')
    try {
      const { items: got, skipped } = itemsFromQuote(await hwpText(f))
      if (!got.length) { setPasteMsg('견적서에서 품목 표를 찾지 못했어요. 스캔한 견적서는 글자를 읽을 수 없어요. 표를 복사해 아래에 붙여넣어 주세요.'); return }
      setItems(xs => (isSample ? got : [...xs, ...got])); setIsSample(false) // 읽는 동안 고친 표를 잃지 않게 지금 값에 붙인다
      setPasteMsg(`견적서에서 ${got.length}개 품목을 읽었어요.${skipped ? ` 금액이 맞지 않는 ${skipped}줄은 뺐어요.` : ''} 수량·단가가 맞는지 꼭 확인해 주세요.`)
    } catch (e) { setPasteMsg(`견적서를 열지 못했어요: ${(e as Error).message ?? e}`) }
  }

  const importPaste = () => {
    const { items: got, skipped } = parseItems(paste)
    if (!got.length) { setPasteMsg('품목을 찾지 못했어요. 품명·수량·단가가 한 줄에 들어 있는지 확인해 주세요.'); return }
    setItems(isSample ? got : [...items, ...got])
    setIsSample(false)
    setPaste('')
    setPasteMsg(`${got.length}개 품목을 넣었어요.${skipped ? ` 숫자를 찾지 못한 ${skipped}줄은 건너뛰었어요.` : ''}`)
  }

  const body = pumuiBody(meta, items)
  const basis = items.map(basisLine).join('\n') + `\n합계: ${won(total)}원`
  const title = meta.title.trim() || `${meta.purpose.trim() || '교육 활동'} 물품 구입`

  const saveHwpx = async () => {
    setCopied('한글 파일 만드는 중…')
    try {
      downloadBlob(await htmlToHwpx(pumuiHtml(title, body, items, total)), `${title.replace(/[\\/:*?"<>|]/g, '_')}.hwpx`)
      setCopied('')
    } catch (e) { setCopied(`한글 파일 실패(${(e as Error).message ?? e}) —`) }
  }

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what) } catch { setCopied('') }
    setTimeout(() => setCopied(''), 1800)
  }
  const tsv = items.map(i => [i.name, i.spec, i.unit, i.qty, i.price, amountOf(i)].join('\t')).join('\n')

  const saveXlsx = () => {
    const rows = [['품명', '규격', '단위', '수량', '단가', '금액'], ...items.map(i => [i.name, i.spec, i.unit, i.qty, i.price, amountOf(i)]), ['합계', '', '', '', '', total]]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '물품 구입 내역')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${title}_품목내역.xlsx`)
  }

  return (
    <div className="stack pm">
      <section className="panel">
        <div className="panel-head">
          <h2>품목 내역</h2>
          <span className="meta">{isSample ? '예시 품목이에요. 실제 품목으로 바꿔 넣으세요.' : `${items.length}개 품목`}</span>
        </div>
        <div className="scroll-x">
          <table className="list pm-table">
            <thead>
              <tr><th>품명</th><th>규격</th><th>단위</th><th className="num">수량</th><th className="num">단가 (원)</th><th className="num">금액 (원)</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td><input aria-label={`${i + 1}번 품명`} value={it.name} onChange={e => setItem(i, { name: e.target.value })} /></td>
                  <td><input aria-label={`${i + 1}번 규격`} value={it.spec} onChange={e => setItem(i, { spec: e.target.value })} /></td>
                  <td><input aria-label={`${i + 1}번 단위`} className="w-unit" value={it.unit} onChange={e => setItem(i, { unit: e.target.value })} /></td>
                  <td className="num"><input aria-label={`${i + 1}번 수량`} className="w-num" type="number" min="0" step="any" value={it.qty} onChange={e => setItem(i, { qty: Number(e.target.value) || 0 })} /></td>
                  <td className="num"><input aria-label={`${i + 1}번 단가`} className="w-num" inputMode="numeric" value={won(it.price)} onChange={e => setItem(i, { price: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })} /></td>
                  <td className="num">{won(amountOf(it))}</td>
                  <td className="num"><button className="btn text small" onClick={() => { setItems(xs => xs.filter((_, k) => k !== i)); setIsSample(false) }}>빼기</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={5}>합계</td><td className="num">{won(total)}</td><td></td></tr>
            </tfoot>
          </table>
        </div>
        <div className="row">
          <button className="btn small" onClick={() => { setItems(xs => [...(isSample ? [] : xs), { ...EMPTY }]); setIsSample(false) }}>품목 더하기</button>
          <button className="btn text small" onClick={() => { setItems([]); setIsSample(false) }}>모두 지우기</button>
        </div>
        <DropZone accept=".pdf,.hwp,.hwpx" multiple={false} label="견적서 넣기 (PDF · 한글)" hint="견적서의 품목 표를 읽어 위 표에 넣어요. 스캔한 사진 PDF는 못 읽어요." onFiles={importQuote} />
        <details className="pm-paste">
          <summary>엑셀·쇼핑몰 장바구니에서 붙여넣기</summary>
          <div className="stack">
            <textarea rows={4} value={paste} onChange={e => setPaste(e.target.value)} aria-label="붙여넣을 품목" placeholder={'품명\t규격\t수량\t단가\n보드마커\t4색 세트\t10\t5800'} />
            <div className="row">
              <button className="btn small" disabled={!paste.trim()} onClick={importPaste}>품목으로 넣기</button>
              <span className="note" aria-live="polite">{pasteMsg || '첫 줄에 품명·규격·수량·단가 같은 제목이 있으면 열을 알아서 찾아요.'}</span>
            </div>
          </div>
        </details>
      </section>

      <div className="grid-2 even">
        <section className="panel">
          <div className="panel-head"><h2>품의 정보</h2></div>
          <div className="row">
            <label className="field grow">구입 목적<input value={meta.purpose} onChange={e => setM('purpose', e.target.value)} placeholder="4학년 수업 자료 제작" /></label>
          </div>
          <div className="row">
            <label className="field grow">예산 과목 (세부사업)<input value={meta.account} onChange={e => setM('account', e.target.value)} placeholder="교과 활동 운영 / 수업 운영 물품" /></label>
            <label className="field">사업 예산 잔액 (원)<input className="num" inputMode="numeric" value={budget ? won(budgetN) : ''} onChange={e => setBudget(e.target.value.replace(/[^\d]/g, ''))} style={{ width: 150 }} /></label>
          </div>
          <div className="row">
            <label className="field grow">구입 방법<input value={meta.method} onChange={e => setM('method', e.target.value)} /></label>
            <label className="field">납품 기한<input value={meta.due} onChange={e => setM('due', e.target.value)} placeholder="2026. 11. 20." style={{ width: 150 }} /></label>
          </div>
          <label className="field">관련 (선택)<input value={meta.related} onChange={e => setM('related', e.target.value)} placeholder="2026학년도 교육과정 운영 계획(교무부-123, 2026. 2. 20.)" /></label>
          <label className="field">품의 제목<input value={meta.title} onChange={e => setM('title', e.target.value)} placeholder={title} /></label>

          <div className="budget">
            <div className="budget-head">
              <span>소요 예산 <b className="num">{won(total)}원</b></span>
              {budgetN > 0 && <span className={`num${over ? ' warn' : ''}`}>{over ? `잔액보다 ${won(-left)}원 많아요` : `남는 예산 ${won(left)}원`}</span>}
            </div>
            {budgetN > 0 && <div className="meter"><i style={{ width: `${Math.min(100, (total / budgetN) * 100)}%`, background: over ? 'var(--negative)' : undefined }} /></div>}
            <p className="note">{moneyText(total)}</p>
            {total > ONE_QUOTE_LIMIT && <p className="note warn">추정가격 2천만 원을 넘으면 1인 견적 수의계약을 할 수 없어요. 행정실과 계약 방법을 먼저 확인하세요.</p>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>품의 본문</h2>
            <span className="meta" aria-live="polite">{copied && `${copied} 복사됨`}</span>
          </div>
          <div className="pm-out">
            <div className="pm-label">제목</div>
            <div className="pm-title">{title}</div>
            <div className="pm-label">본문</div>
            <pre className="pm-body">{body}</pre>
            <div className="pm-label">산출 기초</div>
            <pre className="pm-body">{basis}</pre>
          </div>
          <div className="row">
            <button className="btn primary" onClick={() => copy(body, '본문')}>본문 복사</button>
            <button className="btn" onClick={() => copy(title, '제목')}>제목 복사</button>
            <button className="btn" onClick={() => copy(basis, '산출 기초')}>산출 기초 복사</button>
          </div>
          <div className="row">
            <button className="btn" onClick={saveHwpx}>품의서 한글(HWPX)로 저장</button>
            <button className="btn" onClick={saveXlsx}>품목 내역 엑셀 저장</button>
            <button className="btn" onClick={() => copy(tsv, '품목 표')}>품목 표 복사 (엑셀 붙여넣기용)</button>
          </div>
          <p className="note">본문은 공문 작성 규칙(날짜·금액·항목 기호·"끝." 표시)에 맞춰 만들어요. 에듀파인에는 선생님이 직접 붙여넣고 확인한 뒤 상신하세요.</p>
        </section>
      </div>
    </div>
  )
}
