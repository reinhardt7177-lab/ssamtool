import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { DropZone } from '../../components/DropZone'
import { baseName, downloadBlob, extOf, formatBytes } from '../../lib/files'

const A4 = { w: 595.28, h: 841.89 }

async function imageToPng(file: File): Promise<Uint8Array> {
  const bmp = await createImageBitmap(file)
  const c = document.createElement('canvas')
  c.width = bmp.width; c.height = bmp.height
  c.getContext('2d')!.drawImage(bmp, 0, 0)
  bmp.close()
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('그림 변환 실패'))), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}

export async function merge(files: File[], fitImagesToA4: boolean): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const f of files) {
    const ext = extOf(f.name)
    if (ext === 'pdf') {
      const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true })
      const pages = await out.copyPages(src, src.getPageIndices())
      pages.forEach(p => out.addPage(p))
      continue
    }
    const img = ext === 'jpg' || ext === 'jpeg'
      ? await out.embedJpg(await f.arrayBuffer())
      : await out.embedPng(ext === 'png' ? await f.arrayBuffer() : await imageToPng(f))
    if (fitImagesToA4) {
      const landscape = img.width > img.height
      const pw = landscape ? A4.h : A4.w, ph = landscape ? A4.w : A4.h
      const margin = 28
      const s = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height, 1.5)
      const page = out.addPage([pw, ph])
      page.drawImage(img, { x: (pw - img.width * s) / 2, y: (ph - img.height * s) / 2, width: img.width * s, height: img.height * s })
    } else {
      out.addPage([img.width, img.height]).drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    }
  }
  return out.save()
}

// 공문 붙임 표기: 하나면 "붙임  ○○ 1부.  끝.", 여럿이면 번호를 붙이고 둘째 줄부터 들여쓴다
export function attachmentText(names: string[]): string {
  if (!names.length) return ''
  if (names.length === 1) return `붙임  ${names[0]} 1부.  끝.`
  return names.map((n, i) => `${i === 0 ? '붙임  ' : '      '}${i + 1}. ${n} 1부.${i === names.length - 1 ? '  끝.' : ''}`).join('\n')
}

const ATTACH_EXAMPLE = ['예)', '붙임  1. 운영 계획서 1부.', '      2. 참가자 명단 1부.  끝.'].join(String.fromCharCode(10))

export function PdfMerge() {
  const [files, setFiles] = useState<File[]>([])
  const [names, setNames] = useState<string[]>([])
  const [outName, setOutName] = useState('붙임_합본')
  const [fit, setFit] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const add = (fs: File[]) => {
    const ok = fs.filter(f => ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(extOf(f.name)))
    setFiles(p => [...p, ...ok])
    setNames(p => [...p, ...ok.map(f => baseName(f.name))])
    setError(ok.length < fs.length ? 'PDF와 사진 파일만 넣을 수 있어요. 한글 파일은 먼저 PDF로 저장해 주세요.' : '')
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= files.length) return
    const swap = <T,>(a: T[]) => { const b = [...a]; [b[i], b[j]] = [b[j], b[i]]; return b }
    setFiles(swap); setNames(swap)
  }
  const remove = (i: number) => { setFiles(f => f.filter((_, k) => k !== i)); setNames(n => n.filter((_, k) => k !== i)) }

  const run = async () => {
    setBusy(true); setError('')
    try {
      const bytes = await merge(files, fit)
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${outName || '합본'}.pdf`)
    } catch (e) {
      setError(`합치지 못했어요: ${(e as Error).message}. 암호가 걸린 PDF라면 암호를 풀고 다시 넣어 주세요.`)
    }
    setBusy(false)
  }

  const text = attachmentText(names)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 복사 권한이 없으면 글상자에서 직접 복사 */ }
  }

  return (
    <div className="grid-2 even">
      <section className="panel">
        <div className="panel-head"><h2>합칠 파일</h2><span className="meta num">{files.length}개</span></div>
        <DropZone accept=".pdf,image/*" label="PDF · 사진 파일" hint="넣은 순서대로 합쳐져요. 순서는 아래 목록에서 바꿀 수 있어요." onFiles={add} />
        {error && <p className="note warn">{error}</p>}
        {files.length > 0 && (
          <div className="scroll-x">
            <table className="list">
              <thead><tr><th>파일</th><th className="num">크기</th><th></th></tr></thead>
              <tbody>
                {files.map((f, i) => (
                  <tr key={i}>
                    <td><span className="num">{i + 1}.</span> {f.name}</td>
                    <td className="num">{formatBytes(f.size)}</td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn text small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${f.name} 위로`}>↑</button>
                      <button className="btn text small" onClick={() => move(i, 1)} disabled={i === files.length - 1} aria-label={`${f.name} 아래로`}>↓</button>
                      <button className="btn text small" onClick={() => remove(i)}>빼기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="row">
          <label className="field grow">저장할 파일 이름
            <input value={outName} onChange={e => setOutName(e.target.value)} />
          </label>
        </div>
        <label className="check"><input type="checkbox" checked={fit} onChange={e => setFit(e.target.checked)} /> 사진은 A4 한 장에 맞추기</label>
        <div className="row">
          <button className="btn primary" disabled={!files.length || busy} onClick={run}>{busy ? '합치는 중…' : 'PDF 하나로 합치기'}</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>공문 붙임 문구</h2>
          <button className="btn small" disabled={!text} onClick={copy}>{copied ? '복사됨' : '복사'}</button>
        </div>
        <textarea className="attach" readOnly rows={Math.max(3, names.length + 1)} value={text} placeholder={ATTACH_EXAMPLE} aria-label="공문 붙임 문구" />
        {files.length > 0 && (
          <div className="stack">
            <div className="hint">붙임 이름 고치기</div>
            {names.map((n, i) => (
              <label key={i} className="name-row"><span className="num">{i + 1}.</span>
                <input className="cell-input" aria-label={`${i + 1}번 붙임 이름`} value={n} onChange={e => setNames(ns => ns.map((x, k) => (k === i ? e.target.value : x)))} />
              </label>
            ))}
          </div>
        )}
        <p className="note">붙임 뒤 두 칸 띄우기, 둘째 줄 들여쓰기, 마지막의 "끝." 표시를 공문서 작성 규칙에 맞춰 넣었어요.</p>
      </section>
    </div>
  )
}
