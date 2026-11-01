import JSZip from 'jszip'
import { extOf } from '../../lib/files'

// 문서 파일(zip 묶음) 안의 사진만 다시 압축한다. 본문 XML은 건드리지 않는다.
// HWPX: 사진은 BinData/ 아래, 목록은 Contents/content.hpf. 본문은 id로만 참조하므로
//       PNG→JPG처럼 확장자가 바뀌어도 content.hpf의 href·media-type만 고치면 된다.
// DOCX/XLSX/PPTX: 사진 경로가 여러 .rels 파일에 퍼져 있어 형식은 유지하고 크기·화질만 줄인다.

export type DocKind = 'hwpx' | 'docx' | 'xlsx' | 'pptx'

export interface ShrinkOptions {
  maxEdge: number      // 긴 변 최대 픽셀
  quality: number      // JPEG 화질 0~1
  pngToJpeg: boolean   // 투명하지 않은 PNG·BMP를 JPG로 (HWPX만)
}

export interface ImageResult {
  path: string
  newPath: string
  before: number
  after: number
  width: number
  height: number
  newWidth: number
  newHeight: number
  note: string
}

export interface ShrinkResult {
  blob: Blob
  before: number
  after: number
  images: ImageResult[]
}

const MEDIA_DIR: Record<DocKind, string> = { hwpx: 'BinData/', docx: 'word/media/', xlsx: 'xl/media/', pptx: 'ppt/media/' }
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'bmp']
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', bmp: 'image/bmp' }

export function kindOf(name: string): DocKind | null {
  const e = extOf(name)
  return e === 'hwpx' || e === 'docx' || e === 'xlsx' || e === 'pptx' ? e : null
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data
  const step = Math.max(4, Math.floor(data.length / 4 / 200_000) * 4)
  for (let i = 3; i < data.length; i += step) if (data[i] < 250) return true
  return false
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))), type, quality))
}

async function recompress(bytes: Uint8Array, ext: string, opt: ShrinkOptions, allowFormatChange: boolean) {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: MIME[ext] }))
  const { width, height } = bitmap
  const scale = Math.min(1, opt.maxEdge / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'

  const isJpeg = ext === 'jpg' || ext === 'jpeg'
  let outExt = ext
  if (!isJpeg && allowFormatChange) {
    ctx.drawImage(bitmap, 0, 0, w, h)
    if (!hasAlpha(ctx, w, h)) outExt = 'jpg'
    ctx.clearRect(0, 0, w, h)
  } else if (ext === 'bmp') {
    // BMP는 형식을 못 바꾸면 그대로 둔다 (브라우저가 BMP로 저장하지 못함)
    bitmap.close()
    return null
  }
  const toJpeg = outExt === 'jpg' || outExt === 'jpeg'
  if (toJpeg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h) }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await toBlob(canvas, toJpeg ? 'image/jpeg' : 'image/png', toJpeg ? opt.quality : undefined)
  return { data: new Uint8Array(await blob.arrayBuffer()), outExt, width, height, w, h }
}

export async function shrinkDocument(file: File, opt: ShrinkOptions, onProgress?: (done: number, total: number) => void): Promise<ShrinkResult> {
  const kind = kindOf(file.name)
  if (!kind) throw new Error('HWPX·DOCX·XLSX·PPTX 파일만 넣을 수 있어요.')
  const zip = await JSZip.loadAsync(file)

  let hpf: string | null = null
  if (kind === 'hwpx') {
    const mt = await zip.file('mimetype')?.async('string')
    if (!mt || !mt.includes('hwp')) throw new Error('HWPX 파일 구조가 아니에요. 한글에서 다시 저장해 보세요.')
    hpf = (await zip.file('Contents/content.hpf')?.async('string')) ?? null
  }

  const dir = MEDIA_DIR[kind]
  const targets = Object.values(zip.files).filter(f => !f.dir && f.name.startsWith(dir) && IMAGE_EXT.includes(extOf(f.name)))
  const images: ImageResult[] = []
  let done = 0

  for (const entry of targets) {
    const ext = extOf(entry.name)
    const bytes = await entry.async('uint8array')
    const base = { path: entry.name, newPath: entry.name, before: bytes.length, after: bytes.length, width: 0, height: 0, newWidth: 0, newHeight: 0 }
    try {
      const hrefRe = hpf ? new RegExp(`(<[\\w:]*item\\b[^>]*?)href="${escapeRe(entry.name)}"([^>]*>)`) : null
      const canRename = kind === 'hwpx' && opt.pngToJpeg && !!hpf && !!hrefRe && hrefRe.test(hpf)
      const r = await recompress(bytes, ext, opt, canRename)
      if (!r) {
        images.push({ ...base, note: '그대로 둠 (BMP)' })
      } else if (r.outExt === ext && r.data.length >= bytes.length) {
        images.push({ ...base, width: r.width, height: r.height, newWidth: r.width, newHeight: r.height, note: '이미 작아서 그대로 둠' })
      } else {
        let newPath = entry.name
        if (r.outExt !== ext && hpf && hrefRe) {
          newPath = entry.name.slice(0, entry.name.length - ext.length) + r.outExt
          if (zip.file(newPath)) throw new Error('같은 이름의 JPG가 이미 있어 건너뜀')
          hpf = hpf.replace(hrefRe, (_m, a: string, b: string) =>
            `${a}href="${newPath}"${b}`.replace(/media-type="[^"]*"/, 'media-type="image/jpeg"'))
          zip.remove(entry.name)
        }
        zip.file(newPath, r.data, { createFolders: false })
        images.push({
          ...base, newPath, after: r.data.length, width: r.width, height: r.height, newWidth: r.w, newHeight: r.h,
          note: r.outExt !== ext ? `${ext.toUpperCase()} → JPG` : r.w < r.width ? '크기 줄임' : '화질 조정',
        })
      }
    } catch (e) {
      images.push({ ...base, note: `건너뜀: ${(e as Error).message}` })
    }
    onProgress?.(++done, targets.length)
  }

  if (hpf !== null) zip.file('Contents/content.hpf', hpf)
  // HWPX·OOXML 모두 mimetype(또는 첫 항목)은 압축하지 않은 채 맨 앞에 있어야 한다
  if (kind === 'hwpx') zip.file('mimetype', await zip.file('mimetype')!.async('uint8array'), { compression: 'STORE' })

  const mime = kind === 'hwpx' ? 'application/hwp+zip' : file.type || 'application/octet-stream'
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: mime })
  return { blob, before: file.size, after: blob.size, images }
}

// 목표 용량이 정해지면 화질과 크기를 단계적으로 낮춰 다시 시도한다
export async function shrinkToTarget(file: File, opt: ShrinkOptions, targetBytes: number | null, onProgress?: (msg: string) => void) {
  let cur = { ...opt }
  let result = await shrinkDocument(file, cur, (d, t) => onProgress?.(`사진 ${d}/${t}`))
  for (let attempt = 1; targetBytes && result.after > targetBytes && attempt <= 5; attempt++) {
    cur = { ...cur, quality: Math.max(0.4, cur.quality - 0.1), maxEdge: Math.max(800, Math.round(cur.maxEdge * 0.8)) }
    onProgress?.(`목표 용량에 맞추는 중 (${attempt}/5)`)
    result = await shrinkDocument(file, cur)
  }
  return { result, used: cur }
}
