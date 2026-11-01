// A4 라벨지 규격. 여백을 따로 적지 않은 규격은 용지 가운데 정렬로 계산한다.
// 제조사마다 여백이 조금씩 달라서, 첫 인쇄는 일반 용지로 겹쳐 보고 '인쇄 위치 보정'으로 맞춘다.
export interface Sheet {
  id: string
  name: string
  cols: number
  rows: number
  w: number      // 칸 너비 mm
  h: number      // 칸 높이 mm
  hgap: number   // 가로 칸 사이 mm
  vgap: number   // 세로 칸 사이 mm
  top?: number
  left?: number
  nameplate?: boolean // 한 사람이 한 장: 위 칸은 뒤집어서 접으면 양면 명패가 됨
}

export const PAGE_W = 210
export const PAGE_H = 297

export const SHEETS: Sheet[] = [
  { id: 's2', name: '2칸 (199.6 × 143.5mm) · 큰 안내문', cols: 1, rows: 2, w: 199.6, h: 143.5, hgap: 0, vgap: 0 },
  { id: 's8', name: '8칸 (99.1 × 67.7mm) · 사물함·책 표지', cols: 2, rows: 4, w: 99.1, h: 67.7, hgap: 2.5, vgap: 0 },
  { id: 's10', name: '10칸 (99.1 × 57mm) · 명찰·책상 이름표', cols: 2, rows: 5, w: 99.1, h: 57, hgap: 2.5, vgap: 0 },
  { id: 's12', name: '12칸 (63.5 × 72mm) · 사진 이름표', cols: 3, rows: 4, w: 63.5, h: 72, hgap: 2.5, vgap: 0 },
  { id: 's14', name: '14칸 (99.1 × 38.1mm) · 주소·서류철', cols: 2, rows: 7, w: 99.1, h: 38.1, hgap: 2.5, vgap: 0 },
  { id: 's16', name: '16칸 (99.1 × 33.9mm) · 우편 라벨', cols: 2, rows: 8, w: 99.1, h: 33.9, hgap: 2.5, vgap: 0 },
  { id: 's21', name: '21칸 (63.5 × 38.1mm) · 신발장·물품', cols: 3, rows: 7, w: 63.5, h: 38.1, hgap: 2.5, vgap: 0 },
  { id: 's24', name: '24칸 (63.5 × 33.9mm) · 물품 라벨', cols: 3, rows: 8, w: 63.5, h: 33.9, hgap: 2.5, vgap: 0 },
  { id: 's40', name: '40칸 (48.5 × 25.4mm) · 학용품 이름', cols: 4, rows: 10, w: 48.5, h: 25.4, hgap: 0, vgap: 0 },
  { id: 's65', name: '65칸 (38.1 × 21.2mm) · 작은 이름 스티커', cols: 5, rows: 13, w: 38.1, h: 21.2, hgap: 2.5, vgap: 0 },
  { id: 'nameplate', name: '회의 명패 (A4 가로 반 접기)', cols: 1, rows: 2, w: 200, h: 140, hgap: 0, vgap: 0, nameplate: true },
]

export function margins(s: Sheet) {
  const left = s.left ?? (PAGE_W - s.cols * s.w - (s.cols - 1) * s.hgap) / 2
  const top = s.top ?? (PAGE_H - s.rows * s.h - (s.rows - 1) * s.vgap) / 2
  return { left, top }
}
