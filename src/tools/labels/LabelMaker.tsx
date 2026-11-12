import { useEffect, useMemo, useState } from 'react'
import { DropZone } from '../../components/DropZone'
import { baseName } from '../../lib/files'
import { fill, parseFile, parsePasted, type Table } from '../../lib/table'
import { loadRoster, saveRoster } from '../../lib/roster'
import { margins, PAGE_H, PAGE_W, SHEETS, type Sheet } from './sheets'
import './labels.css'

type Layout = 'text' | 'photo-left' | 'photo-top'
interface Line { text: string; size: number; bold: boolean }
interface Settings {
  sheetId: string
  custom: Sheet
  layout: Layout
  lines: Line[]
  imageMode: 'none' | 'match' | 'common'
  matchColumn: string
  border: boolean
  font: string
  align: 'center' | 'left'
  copies: number
  startAt: number
  offsetX: number
  offsetY: number
}

const SAMPLE = '이름\t학년\t반\t번호\n김하늘\t3\t2\t1\n이도윤\t3\t2\t2\n박서연\t3\t2\t3\n최지호\t3\t2\t4\n정하은\t3\t2\t5'

const DEFAULTS: Settings = {
  sheetId: 's10',
  custom: { id: 'custom', name: '직접 입력', cols: 2, rows: 5, w: 99.1, h: 57, hgap: 2.5, vgap: 0 },
  layout: 'photo-left',
  lines: [
    { text: '{학년}학년 {반}반 {번호}번', size: 12, bold: false },
    { text: '{이름}', size: 26, bold: true },
    { text: '', size: 10, bold: false },
  ],
  imageMode: 'match',
  matchColumn: '이름',
  border: true,
  font: 'Malgun Gothic',
  align: 'center',
  copies: 1,
  startAt: 1,
  offsetX: 0,
  offsetY: 0,
}

const FONTS = [
  { v: 'Malgun Gothic', n: '맑은 고딕' },
  { v: 'NanumGothic', n: '나눔고딕 (설치된 경우)' },
  { v: 'NanumSquare', n: '나눔스퀘어 (설치된 경우)' },
  { v: 'Batang', n: '바탕' },
  { v: 'Gulim', n: '굴림' },
]

const STORE = 'ssamtool.labels.v1'

function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    return s ? { ...DEFAULTS, ...s, startAt: 1 } : DEFAULTS
  } catch { return DEFAULTS }
}

export function LabelMaker() {
  const [s, setS] = useState<Settings>(loadSettings)
  const [text, setText] = useState(SAMPLE)
  const [header, setHeader] = useState(true)
  const [table, setTable] = useState<Table>(() => parsePasted(SAMPLE, true))
  const [isSample, setIsSample] = useState(true)
  const [photos, setPhotos] = useState<Map<string, string>>(new Map())
  const [common, setCommon] = useState<string | null>(null)

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* 저장 못 해도 동작에는 문제 없음 */ } }, [s])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS(p => ({ ...p, [k]: v }))
  const sheet = s.sheetId === 'custom' ? s.custom : SHEETS.find(x => x.id === s.sheetId) ?? SHEETS[0]
  const { left, top } = margins(sheet)
  const perPage = Math.max(1, Math.floor(sheet.cols) * Math.floor(sheet.rows) || 1) // 칸 수를 지우는 동안(0)에도 쪽 나누기가 끝나게

  const applyText = (t: string, h = header) => {
    setText(t); setTable(parsePasted(t, h)); setIsSample(false)
  }
  const [roster, setRoster] = useState(loadRoster)
  const nameCol = table.headers.indexOf('이름')
  // 교직원·동아리 명단으로도 라벨을 만들기 때문에, 우리 반 명단은 버튼을 눌렀을 때만 바꾼다
  const keepRoster = () => {
    const no = table.headers.indexOf('번호')
    const list = table.rows.filter(r => r[nameCol]).map((r, k) => ({ no: Number(r[no]) || k + 1, name: r[nameCol] }))
    saveRoster(list); setRoster(list)
  }

  // 칸에 들어갈 순서: 시작 위치 앞은 비우고, 사람마다 복사 매수만큼 반복
  const cells = useMemo(() => {
    const list: (string[] | null)[] = []
    if (!sheet.nameplate) for (let i = 1; i < s.startAt; i++) list.push(null)
    for (const r of table.rows) for (let c = 0; c < Math.max(1, s.copies); c++) {
      list.push(r)
      if (sheet.nameplate) list.push(r)
    }
    return list
  }, [table, s.copies, s.startAt, sheet.nameplate])

  const pages = useMemo(() => {
    const out: (string[] | null)[][] = []
    for (let i = 0; i < cells.length; i += perPage) out.push(cells.slice(i, i + perPage))
    return out
  }, [cells, perPage])

  const matchIdx = table.headers.indexOf(s.matchColumn)
  const photoFor = (row: string[]) => {
    if (s.imageMode === 'common') return common
    if (s.imageMode === 'match' && matchIdx >= 0) return photos.get(row[matchIdx]?.trim()) ?? null
    return null
  }
  const matched = s.imageMode === 'match' && matchIdx >= 0 ? table.rows.filter(r => photos.has(r[matchIdx]?.trim())).length : 0

  const addPhotos = (files: File[]) => {
    setPhotos(prev => {
      const next = new Map(prev)
      files.filter(f => f.type.startsWith('image/')).forEach(f => next.set(baseName(f.name).trim(), URL.createObjectURL(f)))
      return next
    })
  }

  const showPhoto = s.layout !== 'text' && s.imageMode !== 'none'

  return (
    <div className="labels">
      <div className="stack no-print label-form">
        <section className="panel">
          <div className="panel-head"><h2>라벨지</h2><span className="meta num">한 장에 {perPage}칸</span></div>
          <div className="row">
            <label className="field grow">라벨지 규격
              <select value={s.sheetId} onChange={e => set('sheetId', e.target.value)}>
                {SHEETS.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                <option value="custom">직접 입력</option>
              </select>
            </label>
            {s.sheetId === 'custom' && (['cols', 'rows', 'w', 'h', 'hgap', 'vgap'] as const).map(k => (
              <label key={k} className="field">{({ cols: '가로 칸 수', rows: '세로 칸 수', w: '칸 너비 mm', h: '칸 높이 mm', hgap: '가로 간격 mm', vgap: '세로 간격 mm' })[k]}
                <input type="number" step="0.1" min="0" value={s.custom[k]} onChange={e => set('custom', { ...s.custom, [k]: Number(e.target.value) })} />
              </label>
            ))}
          </div>
          <p className="note">라벨지 포장에 적힌 칸 수와 크기(mm)가 같은 규격을 고르세요. 처음엔 일반 A4에 인쇄해 라벨지와 겹쳐 보고, 어긋나면 아래 '인쇄 위치 보정'으로 맞추세요.</p>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>명단</h2><span className="meta num">{table.rows.length}명</span></div>
          <div className="two">
            <label className="field">엑셀에서 복사해 붙여넣기
              <textarea rows={7} value={text} onChange={e => applyText(e.target.value)} />
            </label>
            <div className="stack" style={{ gap: 10 }}>
              <DropZone accept=".xlsx,.xls,.csv" multiple={false} label="또는 엑셀·CSV 파일" onFiles={async f => {
                const t = await parseFile(f[0], header)
                setTable(t); setIsSample(false)
                setText([t.headers, ...t.rows].map(r => r.join('\t')).join('\n'))
              }} />
              {roster.length > 0 && <button className="btn small" onClick={() => { setHeader(true); applyText(['번호\t이름', ...roster.map(x => `${x.no}\t${x.name}`)].join('\n'), true) }}>우리 반 명단 불러오기 ({roster.length}명)</button>}
              {!isSample && nameCol >= 0 && <button className="btn small" onClick={keepRoster}>이 명단을 우리 반 명단으로 저장</button>}
              <label className="check"><input type="checkbox" checked={header} onChange={e => { setHeader(e.target.checked); applyText(text, e.target.checked) }} /> 첫 줄은 제목(열 이름)</label>
              <p className="note">
                {isSample && <b className="warn">예시 명단이에요. 실제 명단으로 바꿔 넣으세요. </b>}
                열 이름: {table.headers.map(h => `{${h}}`).join(' ')}
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>꾸미기</h2></div>
          <div className="row">
            <label className="field">배치
              <select value={s.layout} onChange={e => set('layout', e.target.value as Layout)}>
                <option value="text">글자만</option>
                <option value="photo-left">사진 왼쪽 + 글자</option>
                <option value="photo-top">사진 위 + 글자</option>
              </select>
            </label>
            <label className="field">글꼴
              <select value={s.font} onChange={e => set('font', e.target.value)}>
                {FONTS.map(f => <option key={f.v} value={f.v}>{f.n}</option>)}
              </select>
            </label>
            <label className="field">정렬
              <select value={s.align} onChange={e => set('align', e.target.value as Settings['align'])}>
                <option value="center">가운데</option><option value="left">왼쪽</option>
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={s.border} onChange={e => set('border', e.target.checked)} /> 칸 테두리 (일반 용지에 인쇄해 자를 때)</label>
          </div>
          <div className="lines">
            {s.lines.map((l, i) => (
              <div key={i} className="row">
                <label className="field grow">{i + 1}번째 줄 (열 이름을 {'{이름}'}처럼 넣으세요)
                  <input value={l.text} onChange={e => set('lines', s.lines.map((x, k) => k === i ? { ...x, text: e.target.value } : x))} />
                </label>
                <label className="field">글자 크기(pt)
                  <input type="number" min="5" max="120" value={l.size} onChange={e => set('lines', s.lines.map((x, k) => k === i ? { ...x, size: Number(e.target.value) } : x))} />
                </label>
                <label className="check"><input type="checkbox" checked={l.bold} onChange={e => set('lines', s.lines.map((x, k) => k === i ? { ...x, bold: e.target.checked } : x))} /> 굵게</label>
              </div>
            ))}
          </div>
          {s.layout !== 'text' && (
            <div className="stack" style={{ gap: 10 }}>
              <div className="row">
                <label className="field">사진
                  <select value={s.imageMode} onChange={e => set('imageMode', e.target.value as Settings['imageMode'])}>
                    <option value="match">사람마다 다른 사진 (파일 이름으로 짝짓기)</option>
                    <option value="common">모두 같은 그림 (학교 로고·아이콘)</option>
                    <option value="none">사진 없음</option>
                  </select>
                </label>
                {s.imageMode === 'match' && (
                  <label className="field">짝지을 열
                    <select value={s.matchColumn} onChange={e => set('matchColumn', e.target.value)}>
                      {table.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                )}
              </div>
              {s.imageMode === 'match' && (
                <>
                  <DropZone accept="image/*" label="사진 여러 장" hint={`파일 이름이 '${s.matchColumn}' 열 값과 같아야 해요. 예: 김하늘.jpg`} onFiles={addPhotos} />
                  <p className="note">사진 {photos.size}장 · 짝지어진 사람 {matched}/{table.rows.length}명
                    {photos.size > 0 && <> · <button className="btn small" onClick={() => setPhotos(new Map())}>사진 비우기</button></>}</p>
                </>
              )}
              {s.imageMode === 'common' && (
                <DropZone accept="image/*" multiple={false} label={common ? '그림 바꾸기' : '로고·아이콘 그림'} onFiles={f => setCommon(URL.createObjectURL(f[0]))} />
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>인쇄</h2><span className="meta num">A4 {pages.length}장</span></div>
          <div className="row">
            <label className="field">사람마다 몇 장
              <input type="number" min="1" max="50" value={s.copies} onChange={e => set('copies', Math.max(1, Number(e.target.value)))} />
            </label>
            {!sheet.nameplate && (
              <label className="field">시작 칸 (쓰다 남은 라벨지)
                <input type="number" min="1" max={perPage} value={s.startAt} onChange={e => set('startAt', Math.min(perPage, Math.max(1, Number(e.target.value))))} />
              </label>
            )}
            <label className="field">인쇄 위치 보정 → (mm)
              <input type="number" step="0.5" value={s.offsetX} onChange={e => set('offsetX', Number(e.target.value))} />
            </label>
            <label className="field">인쇄 위치 보정 ↓ (mm)
              <input type="number" step="0.5" value={s.offsetY} onChange={e => set('offsetY', Number(e.target.value))} />
            </label>
            <button className="btn primary" onClick={() => print()}>인쇄 · PDF로 저장</button>
          </div>
          <p className="note">인쇄 창에서 <b>배율 100%(실제 크기)</b>, <b>여백 없음</b>, <b>머리글·바닥글 끄기</b>로 설정하세요. 'PDF로 저장'을 고르면 PDF 파일이 돼요. </p>
        </section>
      </div>

      <div className="preview">
        {pages.map((page, pi) => (
          <div key={pi} className="sheet" style={{ width: `${PAGE_W}mm`, height: `${PAGE_H}mm`, fontFamily: `"${s.font}", "Malgun Gothic", sans-serif` }}>
            {page.map((row, ci) => {
              const r = Math.floor(ci / sheet.cols), c = ci % sheet.cols
              const flip = sheet.nameplate && r === 0
              const photo = row && showPhoto ? photoFor(row) : null
              return (
                <div
                  key={ci}
                  className={`cell ${s.layout}${s.border ? ' bordered' : ''}${flip ? ' flip' : ''}`}
                  style={{
                    left: `${left + c * (sheet.w + sheet.hgap) + s.offsetX}mm`,
                    top: `${top + r * (sheet.h + sheet.vgap) + s.offsetY}mm`,
                    width: `${sheet.w}mm`, height: `${sheet.h}mm`, textAlign: s.align,
                  }}
                >
                  {row && (
                    <>
                      {showPhoto && <div className="pic">{photo ? <img src={photo} alt="" /> : <span>사진</span>}</div>}
                      <div className="txt" style={{ alignItems: s.align === 'center' ? 'center' : 'flex-start' }}>
                        {s.lines.map((l, i) => {
                          const v = fill(l.text, table, row)
                          return v ? <div key={i} style={{ fontSize: `${l.size}pt`, fontWeight: l.bold ? 700 : 400 }}>{v}</div> : null
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
