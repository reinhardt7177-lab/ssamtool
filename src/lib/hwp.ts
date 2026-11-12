import { PDFDocument } from 'pdf-lib'
import wasmUrl from '@rhwp/core/rhwp_bg.wasm?url'

// rhwp 엔진(27MB)은 한글 파일을 처음 열 때만 받아 온다
let ready: Promise<typeof import('@rhwp/core')> | null = null
function rhwp() {
  ready ??= (async () => {
    let ctx: CanvasRenderingContext2D | null = null
    ;(globalThis as Record<string, unknown>).measureTextWidth = (font: string, text: string) => {
      ctx ??= document.createElement('canvas').getContext('2d')!
      if (ctx.font !== font) ctx.font = font
      return ctx.measureText(text).width
    }
    const m = await import('@rhwp/core')
    await m.default({ module_or_path: wasmUrl })
    return m
  })()
  ready.catch(() => { ready = null })
  return ready
}

export type HwpTarget = 'hwpx' | 'hwp' | 'pdf'

async function open(file: File) {
  const { HwpDocument } = await rhwp()
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (file.name.toLowerCase().endsWith('.pdf')) return HwpDocument.importPdf(bytes, { layout: 'editable' })
  return new HwpDocument(bytes)
}

// shortcut: PDF는 쪽 그림으로 만들어 글자 선택이 안 됨, 글자 검색이 필요해지면 SVG→벡터 PDF로 바꾸기
async function toPdf(doc: { pageCount(): number; getPageInfo(p: number): string; renderPageToCanvas(p: number, c: HTMLCanvasElement, s: number): void }) {
  const out = await PDFDocument.create()
  const canvas = document.createElement('canvas')
  for (let p = 0; p < doc.pageCount(); p++) {
    const { width, height } = JSON.parse(doc.getPageInfo(p)) as { width: number; height: number }
    doc.renderPageToCanvas(p, canvas, 2)
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'destination-over' // 투명한 바탕을 흰색으로
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const jpg = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('쪽 그림 만들기 실패'))), 'image/jpeg', 0.9))
    const img = await out.embedJpg(await jpg.arrayBuffer())
    out.addPage([width * 0.75, height * 0.75]).drawImage(img, { x: 0, y: 0, width: width * 0.75, height: height * 0.75 }) // 화면 px → PDF pt
  }
  return out.save()
}

const TYPES: Record<HwpTarget, string> = { hwpx: 'application/hwp+zip', hwp: 'application/x-hwp', pdf: 'application/pdf' }

export async function convertHwp(file: File, to: HwpTarget): Promise<Blob> {
  const doc = await open(file)
  try {
    const bytes = to === 'hwpx' ? doc.exportHwpx() : to === 'hwp' ? doc.exportHwp() : await toPdf(doc)
    return new Blob([bytes as BlobPart], { type: TYPES[to] })
  } finally {
    doc.free()
  }
}

export const swapExt = (name: string, ext: string) => name.replace(/\.[^.]+$/, '') + '.' + ext

// 미리보기 HTML(인라인 스타일)을 빈 한글 문서에 붙여 HWPX로 만든다
export async function htmlToHwpx(html: string): Promise<Blob> {
  const { HwpDocument } = await rhwp()
  const doc = HwpDocument.createEmpty()
  try {
    doc.createBlankDocument()
    // rhwp는 <p>의 정렬·글자 모양만 읽어서, 글만 든 <div>를 <p>로 바꾼다
    const box = document.createElement('div')
    box.innerHTML = html
    box.querySelectorAll('div').forEach(d => {
      if (d.querySelector('div,p,table')) return d.replaceWith(...d.childNodes) // 감싸는 div는 풀어야 안쪽 모양이 산다
      const p = document.createElement('p')
      p.style.cssText = d.style.cssText
      p.append(...d.childNodes)
      d.replaceWith(p)
    })
    doc.pasteHtml(0, 0, 0, '<p></p>' + box.innerHTML) // 첫 문단은 빈 문서의 문단에 합쳐져 모양을 잃으므로 빈 문단을 먼저 붙인다
    return new Blob([doc.exportHwpx() as BlobPart], { type: TYPES.hwpx })
  } finally {
    doc.free()
  }
}

// 한글 문서의 글 전체 (표 안 글 포함)
export async function hwpText(file: File): Promise<string> {
  const doc = await open(file)
  try { return JSON.parse(doc.getTextFileText()) as string } finally { doc.free() } // rhwp는 JSON 문자열로 준다
}

// 글자를 바꾸고 HWPX로 저장한다. counts[i]는 pairs[i]가 바뀐 곳 수.
// 먼저 모두 임시 글자로 바꾼 뒤 새 글자를 채운다: 차례로 바꾸면 2025→2026이 다시 2026→2027에 걸린다.
// from과 to가 같은 쌍은 "건드리지 말 곳"으로, 다른 쌍이 그 안을 바꾸지 못하게 지켜 준다.
export async function hwpReplace(file: File, pairs: [string, string][]): Promise<{ blob: Blob; counts: number[] }> {
  const doc = await open(file)
  const swap = (a: string, b: string) => (JSON.parse(doc.replaceAll(a, b, true)) as { count?: number }).count ?? 0
  const hold = (i: number) => String.fromCharCode(0xE000, 0xE100 + i, 0xE001) // 문서에 없는 사용자 정의 글자
  try {
    const counts = pairs.map(([a], i) => swap(a, hold(i)))
    pairs.forEach(([, b], i) => { if (counts[i] && swap(hold(i), b) !== counts[i]) throw new Error('바꾼 글자를 되돌리지 못했어요') })
    return { blob: new Blob([doc.exportHwpx() as BlobPart], { type: TYPES.hwpx }), counts }
  } finally {
    doc.free()
  }
}
