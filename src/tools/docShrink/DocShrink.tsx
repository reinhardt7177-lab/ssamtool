import { useState } from 'react'
import JSZip from 'jszip'
import { DropZone } from '../../components/DropZone'
import { downloadBlob, extOf, formatBytes, withSuffix } from '../../lib/files'
import { convertHwp, swapExt } from '../../lib/hwp'
import { kindOf, shrinkToTarget, type ShrinkOptions, type ShrinkResult } from './shrink'

interface Job {
  file: File
  status: 'wait' | 'run' | 'done' | 'error'
  message: string
  result?: ShrinkResult
}

const PRESETS = [
  { id: 'gentle', name: '살짝 (화면용 화질 유지)', maxEdge: 2400, quality: 0.85 },
  { id: 'normal', name: '보통 (공문 첨부 추천)', maxEdge: 1600, quality: 0.75 },
  { id: 'strong', name: '많이 (용량 최우선)', maxEdge: 1200, quality: 0.6 },
]

export function DocShrink() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [preset, setPreset] = useState('normal')
  const [pngToJpeg, setPngToJpeg] = useState(true)
  const [targetMb, setTargetMb] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])

  const add = (files: File[]) => {
    const can = (f: File) => kindOf(f.name) || extOf(f.name) === 'hwp'
    const ok = files.filter(can)
    setRejected(files.filter(f => !can(f)).map(f => f.name))
    setJobs(j => [...j, ...ok.map(file => ({ file, status: 'wait' as const, message: '대기' }))])
  }

  const update = (i: number, patch: Partial<Job>) => setJobs(js => js.map((j, k) => (k === i ? { ...j, ...patch } : j)))

  const run = async () => {
    setBusy(true)
    const p = PRESETS.find(p => p.id === preset)!
    const opt: ShrinkOptions = { maxEdge: p.maxEdge, quality: p.quality, pngToJpeg }
    const target = Number(targetMb) > 0 ? Number(targetMb) * 1024 * 1024 : null
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].status === 'done') continue
      update(i, { status: 'run', message: '여는 중' })
      try {
        let file = jobs[i].file
        if (extOf(file.name) === 'hwp') {
          update(i, { message: 'HWPX로 바꾸는 중' })
          file = new File([await convertHwp(file, 'hwpx')], swapExt(file.name, 'hwpx'))
          update(i, { file })
        }
        const { result } = await shrinkToTarget(file, opt, target, msg => update(i, { message: msg }))
        const missed = target && result.after > target
        update(i, {
          status: 'done', result,
          message: missed ? `목표(${targetMb}MB)까지는 못 줄였어요. 사진 말고 다른 내용이 큰 파일일 수 있어요.` : '완료',
        })
      } catch (e) {
        update(i, { status: 'error', message: (e as Error).message })
      }
    }
    setBusy(false)
  }

  const save = (j: Job) => j.result && downloadBlob(j.result.blob, withSuffix(j.file.name, '_용량줄임'))

  const saveAll = async () => {
    const done = jobs.filter(j => j.result)
    if (done.length === 1) return save(done[0])
    const zip = new JSZip()
    done.forEach(j => zip.file(withSuffix(j.file.name, '_용량줄임'), j.result!.blob))
    downloadBlob(await zip.generateAsync({ type: 'blob' }), '용량줄인_문서.zip')
  }

  const totalBefore = jobs.reduce((s, j) => s + (j.result?.before ?? 0), 0)
  const totalAfter = jobs.reduce((s, j) => s + (j.result?.after ?? 0), 0)

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="panel-head"><h2>파일 넣기</h2><span className="meta">여러 개 한 번에</span></div>
        <DropZone
          accept=".hwp,.hwpx,.docx,.xlsx,.pptx"
          label="한글 · 워드 · 엑셀 · PPT 파일"
          hint="예전 한글 형식(.hwp)은 HWPX로 바꾼 뒤 줄여서 .hwpx로 저장해요."
          onFiles={add}
        />
        {rejected.length > 0 && (
          <p className="note warn">
            넣지 못한 파일: {rejected.join(', ')}
          </p>
        )}
        <div className="row">
          <label className="field">줄이는 정도
            <select value={preset} onChange={e => setPreset(e.target.value)}>
              {PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="field">목표 용량 (선택)
            <span className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input type="number" min="0" step="0.5" placeholder="10" value={targetMb} onChange={e => setTargetMb(e.target.value)} /> MB 이하
            </span>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={pngToJpeg} onChange={e => setPngToJpeg(e.target.checked)} />
          투명하지 않은 PNG는 JPG로 바꾸기 (HWPX만)
        </label>
        <p className="note">사진만 다시 압축하고 글·표·서식은 그대로 둬요. 원본은 그대로 두고 "_용량줄임"이 붙은 새 파일로 저장해요.</p>
        <div className="row">
          <button className="btn primary" disabled={!jobs.length || busy} onClick={run}>{busy ? '줄이는 중…' : `용량 줄이기${jobs.length ? ` (${jobs.length}개)` : ''}`}</button>
          <button className="btn" disabled={!jobs.length || busy} onClick={() => setJobs([])}>목록 비우기</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>결과</h2>
          <button className="btn small" disabled={!jobs.some(j => j.result) || busy} onClick={saveAll}>모두 저장</button>
        </div>
        {jobs.length === 0 ? (
          <>
            <p className="note empty-line">파일을 넣으면 여기에 원래 용량과 줄인 용량이 나와요.</p>
            <table className="list">
              <thead><tr><th>줄이는 정도</th><th className="num">사진 긴 변</th><th className="num">JPG 화질</th></tr></thead>
              <tbody>
                {PRESETS.map(p => (
                  <tr key={p.id}><td>{p.name}</td><td className="num">{p.maxEdge.toLocaleString()} px</td><td className="num">{Math.round(p.quality * 100)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="note">사진 긴 변이 기준보다 크면 줄이고, 작으면 크기는 두고 화질만 맞춰요. 목표 용량을 적으면 맞을 때까지 다섯 번까지 더 줄여요.</p>
          </>
        ) : (
          <div className="scroll-x">
            <table className="list">
              <thead><tr><th>파일</th><th className="num">원래</th><th className="num">줄인 뒤</th><th></th></tr></thead>
              <tbody>
                {jobs.map((j, i) => (
                  <tr key={i}>
                    <td>
                      {j.file.name}
                      {j.result ? (
                        <span className="sub">
                          <span className="meter" style={{ display: 'block', margin: '6px 0 4px' }}><i style={{ width: `${Math.max(2, (j.result.after / j.result.before) * 100)}%` }} /></span>
                          {Math.round((1 - j.result.after / j.result.before) * 100)}% 줄임 · 사진 {j.result.images.length}장 중 {j.result.images.filter(x => x.after < x.before).length}장 압축
                        </span>
                      ) : (
                        <span className={`sub${j.status === 'error' ? ' warn' : ''}`}>{j.message}</span>
                      )}
                      {j.result && j.message !== '완료' && <span className="sub warn">{j.message}</span>}
                    </td>
                    <td className="num">{formatBytes(j.file.size)}</td>
                    <td className="num">{j.result ? formatBytes(j.result.after) : '–'}</td>
                    <td className="num">{j.result && <button className="btn small" onClick={() => save(j)}>저장</button>}</td>
                  </tr>
                ))}
              </tbody>
              {totalBefore > 0 && (
                <tfoot><tr><td>합계</td><td className="num">{formatBytes(totalBefore)}</td><td className="num">{formatBytes(totalAfter)}</td><td className="num">{Math.round((1 - totalAfter / totalBefore) * 100)}%↓</td></tr></tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
