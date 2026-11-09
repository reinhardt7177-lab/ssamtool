import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { DropZone } from '../../components/DropZone'
import { baseName, downloadBlob, extOf } from '../../lib/files'
import { hwpReplace, hwpText } from '../../lib/hwp'
import { findChanges, mostYear } from './rewrite'

export function PlanRewrite() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(0)
  const [picks, setPicks] = useState<Record<string, boolean>>({}) // 선생님이 체크를 바꾼 것만 (없으면 기본값)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [missed, setMissed] = useState<string[]>([])

  const add = async (fs: File[]) => {
    const f = fs.find(x => ['hwp', 'hwpx'].includes(extOf(x.name)))
    if (!f) { setMsg('한글 파일(.hwp, .hwpx)만 넣을 수 있어요.'); return }
    setBusy(true); setMsg('여는 중… (처음 한 번은 한글 엔진을 받아요)'); setMissed([])
    try {
      const t = await hwpText(f)
      const y = mostYear(t)
      setFile(f); setText(t); setFrom(y); setTo(y + 1); setPicks({}); setMsg('')
    } catch (e) { setMsg(`열지 못했어요: ${(e as Error).message ?? e}`) }
    setBusy(false)
  }

  const changes = useMemo(() => (text && from && to ? findChanges(text, from, to) : []), [text, from, to])
  const isOn = (from: string, def: boolean) => picks[from] ?? def
  const picked = changes.filter(c => isOn(c.from, c.on))
  const name = file ? `${baseName(file.name).replace(String(from), String(to))}` : ''

  const save = async () => {
    if (!file) return
    setBusy(true); setMsg('바꾸는 중…')
    try {
      const { blob, counts } = await hwpReplace(file, picked.map(c => [c.from, c.to]))
      downloadBlob(blob, `${name === baseName(file.name) ? name + '_' + to : name}.hwpx`)
      const miss = picked.filter((_, i) => !counts[i]).map(c => c.from)
      setMissed(miss)
      setMsg(`${counts.reduce((a, b) => a + b, 0)}곳을 바꿔 저장했어요.${miss.length ? ` 문서 안에서 글자 모양이 나뉘어 있어 못 바꾼 ${miss.length}개는 아래에 빨갛게 표시했어요. 한글에서 직접 고쳐 주세요.` : ''}`)
    } catch (e) { setMsg(`저장하지 못했어요: ${(e as Error).message ?? e}`) }
    setBusy(false)
  }

  const saveTable = () => {
    const rows = [['번호', '종류', '작년', '올해', '앞뒤 글'], ...picked.map((c, i) => [i + 1, c.kind, c.from, c.to, c.context])]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '신구대조')
    downloadBlob(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer]), `${name}_신구대조표.xlsx`)
  }

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="panel-head"><h2>작년 계획서</h2><span className="meta">{file?.name}</span></div>
        <DropZone accept=".hwp,.hwpx" multiple={false} label="한글 파일 (HWP · HWPX)" hint="작년 계획서·안내문을 넣으면 연도와 날짜를 찾아요. 원본은 그대로 둬요." onFiles={add} />
        {file && (
          <div className="row">
            <label className="field">작년 연도<input className="num" type="number" value={from} onChange={e => { setFrom(Number(e.target.value)); setPicks({}) }} style={{ width: 90 }} /></label>
            <label className="field">올해 연도<input className="num" type="number" value={to} onChange={e => { setTo(Number(e.target.value)); setPicks({}) }} style={{ width: 90 }} /></label>
          </div>
        )}
        <p className="note">
          {from ? `${from}년과 그 전해(${from - 1}년)를 한 해씩 올리고, 날짜 뒤 요일을 ${to}년 달력에 맞춰 고쳐요. ` : ''}
          법령 개정일처럼 바꾸면 안 되는 연도는 체크를 끈 채로 보여 줘요. 표를 보고 체크를 고친 뒤 저장하세요.
        </p>
        <div className="row">
          <button className="btn primary" disabled={!picked.length || busy} onClick={save}>{busy ? '처리 중…' : `${to || '올해'}년 판으로 저장 (HWPX)`}</button>
          <button className="btn" disabled={!picked.length} onClick={saveTable}>신구대조표 엑셀 저장</button>
        </div>
        {msg && <p className="note" aria-live="polite">{msg}</p>}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>바꿀 곳 (신구대조)</h2><span className="meta num">{picked.length} / {changes.length}개</span></div>
        {!changes.length ? (
          <p className="note empty-line">{file ? '바꿀 연도나 요일 날짜를 찾지 못했어요. 작년 연도가 맞는지 확인해 주세요.' : '파일을 넣으면 여기에 작년 → 올해 표가 나와요.'}</p>
        ) : (
          <div className="scroll-x">
            <table className="list">
              <thead><tr><th></th><th>작년</th><th>올해</th><th>앞뒤 글</th></tr></thead>
              <tbody>
                {changes.map(c => (
                  <tr key={c.from} className={missed.includes(c.from) ? 'warn' : undefined}>
                    <td><input type="checkbox" aria-label={`${c.from} 바꾸기`} checked={isOn(c.from, c.on)} onChange={e => setPicks(o => ({ ...o, [c.from]: e.target.checked }))} /></td>
                    <td>{c.from}</td>
                    <td><b>{c.to}</b></td>
                    <td className="hint">{c.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
