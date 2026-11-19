import * as XLSX from 'xlsx'

export interface Table {
  headers: string[]
  rows: string[][]
}

// 엑셀에서 복사한 내용(탭 구분)이나 쉼표 구분 글을 표로 바꾼다
export function parsePasted(text: string, firstRowIsHeader: boolean): Table {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '')
  if (!lines.length) return { headers: [], rows: [] }
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : '\t'
  const cells = lines.map(l => l.split(sep).map(c => c.trim()))
  return toTable(cells, firstRowIsHeader)
}

export async function parseFile(file: File, firstRowIsHeader: boolean): Promise<Table> {
  const buf = await file.arrayBuffer()
  let wb: XLSX.WorkBook
  if (/\.csv$/i.test(file.name)) {
    // 한국어 엑셀은 CSV를 UTF-8이 아니라 CP949(EUC-KR)로 저장한다. UTF-8로 안 읽히면 그걸로 다시 읽는다
    let text: string
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { text = new TextDecoder('euc-kr').decode(buf) }
    wb = XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string' })
  } else {
    wb = XLSX.read(buf, { type: 'array' })
  }
  const ws = wb.Sheets[wb.SheetNames[0]]
  const cells = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '', raw: false, dateNF: 'yyyy-mm-dd' })
    .map(r => r.map(c => String(c ?? '').trim()))
  return toTable(cells, firstRowIsHeader)
}

function toTable(cells: string[][], firstRowIsHeader: boolean): Table {
  const width = Math.max(0, ...cells.map(r => r.length))
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? '')
  if (firstRowIsHeader) {
    const [head = [], ...rest] = cells
    return { headers: pad(head).map((h, i) => h || `열${i + 1}`), rows: rest.map(pad) }
  }
  return { headers: Array.from({ length: width }, (_, i) => `열${i + 1}`), rows: cells.map(pad) }
}

export function fill(template: string, table: Table, row: string[]): string {
  return template.replace(/\{([^}]+)\}/g, (_m, key: string) => {
    const i = table.headers.indexOf(key.trim())
    return i < 0 ? '' : row[i] ?? ''
  })
}
