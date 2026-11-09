import { useState } from 'react'
import JSZip from 'jszip'
import { DropZone } from '../../components/DropZone'
import { downloadBlob, extOf, formatBytes } from '../../lib/files'
import { convertHwp, swapExt, type HwpTarget } from '../../lib/hwp'

interface Job {
  file: File
  status: 'wait' | 'run' | 'done' | 'error'
  message: string
  blob?: Blob
  name?: string
}

const TARGETS: { id: HwpTarget; name: string; from: string[] }[] = [
  { id: 'hwpx', name: 'HWPX (새 한글 형식)', from: ['hwp', 'pdf'] },
  { id: 'hwp', name: 'HWP (예전 한글 형식)', from: ['hwpx', 'pdf'] },
  { id: 'pdf', name: 'PDF', from: ['hwp', 'hwpx'] },
]
const ACCEPT = ['hwp', 'hwpx', 'pdf']

export function Convert() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [to, setTo] = useState<HwpTarget>('hwpx')
  const [busy, setBusy] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])

  const add = (files: File[]) => {
    const ok = files.filter(f => ACCEPT.includes(extOf(f.name)))
    setRejected(files.filter(f => !ACCEPT.includes(extOf(f.name))).map(f => f.name))
    setJobs(j => [...j, ...ok.map(file => ({ file, status: 'wait' as const, message: '대기' }))])
  }
  const update = (i: number, patch: Partial<Job>) => setJobs(js => js.map((j, k) => (k === i ? { ...j, ...patch } : j)))
  const target = TARGETS.find(t => t.id === to)!

  const run = async () => {
    setBusy(true)
    for (let i = 0; i < jobs.length; i++) {
      const { file } = jobs[i]
      if (!target.from.includes(extOf(file.name))) { update(i, { status: 'error', blob: undefined, name: undefined, message: `이미 ${to.toUpperCase()}이거나 이 형식으로는 못 바꿔요` }); continue }
      update(i, { status: 'run', message: i === 0 ? '한글 엔진 받는 중 (처음 한 번)' : '바꾸는 중' })
      await new Promise(r => setTimeout(r, 30)) // 진행 문구가 먼저 그려지게
      try {
        const blob = await convertHwp(file, to)
        update(i, { status: 'done', blob, name: swapExt(file.name, to), message: '완료' })
      } catch (e) {
        update(i, { status: 'error', message: `바꾸지 못했어요: ${(e as Error).message ?? e}` })
      }
    }
    setBusy(false)
  }

  const saveAll = async () => {
    const done = jobs.filter(j => j.blob)
    if (done.length === 1) return downloadBlob(done[0].blob!, done[0].name!)
    const zip = new JSZip()
    done.forEach(j => zip.file(j.name!, j.blob!))
    downloadBlob(await zip.generateAsync({ type: 'blob' }), '형식변환.zip')
  }

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="panel-head"><h2>파일 넣기</h2><span className="meta">여러 개 한 번에</span></div>
        <DropZone accept=".hwp,.hwpx,.pdf" label="HWP · HWPX · PDF 파일" hint="한글 프로그램 없이 이 브라우저 안에서 바꿔요." onFiles={add} />
        {rejected.length > 0 && <p className="note warn">넣지 못한 파일: {rejected.join(', ')} — 한글(HWP·HWPX)과 PDF만 바꿀 수 있어요.</p>}
        <label className="field">바꿀 형식
          <select value={to} onChange={e => setTo(e.target.value as HwpTarget)}>
            {TARGETS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <p className="note">
          {to === 'pdf'
            ? 'PDF는 쪽마다 그림으로 만들어요. 인쇄·첨부용으로 충분하지만 글자를 복사할 수는 없어요.'
            : 'PDF를 한글로 바꾸면 글자와 배치를 최대한 살려요. 스캔한 PDF(사진)는 글자를 읽지 못해요.'}
          {' '}처음 쓸 때 한글 엔진(약 10MB)을 한 번 받아요.
        </p>
        <div className="row">
          <button className="btn primary" disabled={!jobs.length || busy} onClick={run}>{busy ? '바꾸는 중…' : `${to.toUpperCase()}로 바꾸기${jobs.length ? ` (${jobs.length}개)` : ''}`}</button>
          <button className="btn" disabled={!jobs.length || busy} onClick={() => setJobs([])}>목록 비우기</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>결과</h2>
          <button className="btn small" disabled={!jobs.some(j => j.blob) || busy} onClick={saveAll}>모두 저장</button>
        </div>
        {jobs.length === 0 ? (
          <p className="note empty-line">파일을 넣으면 여기에 바뀐 파일이 나와요. 원본은 그대로 두고 새 파일로 저장해요.</p>
        ) : (
          <div className="scroll-x">
            <table className="list">
              <thead><tr><th>파일</th><th className="num">크기</th><th>상태</th><th></th></tr></thead>
              <tbody>
                {jobs.map((j, i) => (
                  <tr key={i}>
                    <td>{j.file.name}{j.name && <> → <b>{j.name}</b></>}</td>
                    <td className="num">{formatBytes(j.file.size)}{j.blob && <> → {formatBytes(j.blob.size)}</>}</td>
                    <td className={j.status === 'error' ? 'warn' : undefined}>{j.message}</td>
                    <td>{j.blob && <button className="btn text small" onClick={() => downloadBlob(j.blob!, j.name!)}>저장</button>}</td>
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
