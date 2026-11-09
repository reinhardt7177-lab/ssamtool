// 플랫폼에 들어갈 모든 기능 목록. status가 'ready'인 것만 화면이 열린다.
export type Status = 'ready' | 'soon'

export interface Tool {
  id: string
  name: string
  summary: string
  status: Status
  formats?: string[] // 넣을 수 있는 파일 형식 (홈 카드에 표시)
}

export interface Area {
  id: string
  name: string
  color: string // 파일철 색: 짙은 원색, 탭끼리 일부러 부딪치게
  ink: string   // 그 색 위 글자색
  en: string    // 띠 오른쪽 작은 영문 표기
  short: string // 도구 화면 오른쪽 세로 인덱스용 짧은 이름
  desc: string  // 띠를 펼쳤을 때 보이는 한두 문장
  tools: Tool[]
}

export const AREAS: Area[] = [
  {
    id: 'files',
    short: '문서',
    desc: '첨부 용량이 넘치는 한글·워드 파일, 여기저기 흩어진 PDF와 사진. 공문에 붙이기 전에 한 번에 줄이고 묶어요.',
    color: '#1e4bd7',
    ink: '#ffffff',
    en: 'Documents & Files',
    name: '문서·파일',
    tools: [
      { id: 'doc-shrink', name: '문서 사진 용량 줄이기', summary: 'HWPX·워드·엑셀·PPT 속 사진만 줄여 첨부 용량을 맞춰요.', status: 'ready', formats: ['HWPX', 'DOCX', 'XLSX', 'PPTX'] },
      { id: 'pdf-merge', name: 'PDF 합치기·붙임 문구', summary: 'PDF와 사진을 순서대로 한 파일로 묶고, 공문 붙임 문구를 만들어요.', status: 'ready', formats: ['PDF', 'JPG', 'PNG'] },
      { id: 'convert', name: '한글 형식 변환', summary: 'HWP↔HWPX, 한글→PDF, PDF→한글을 한글 프로그램 없이 바꿔요.', status: 'ready', formats: ['HWP', 'HWPX', 'PDF'] },
    ],
  },
  {
    id: 'labels',
    short: '라벨',
    desc: '사물함·신발장·책상 이름표부터 회의 명패까지. 라벨지 규격을 고르고 명단과 사진을 넣으면 칸에 맞춰 인쇄돼요.',
    color: '#0c7866',
    ink: '#ffffff',
    en: 'Labels & Name Tags',
    name: '라벨·이름표',
    tools: [
      { id: 'label-maker', name: '라벨지·이름표 메이커', summary: '라벨지 규격을 고르고 명단과 사진을 넣어 바로 인쇄해요.', status: 'ready', formats: ['XLSX', 'CSV', '사진'] },
    ],
  },
  {
    id: 'gongmun',
    short: '공문',
    desc: '날짜·시간·금액 표기, 항목 기호 순서, 붙임과 끝 표시. 상신하기 전에 공문서 작성 규칙을 한 번에 확인해요.',
    color: '#581e70',
    ink: '#ffffff',
    en: 'Official Letters',
    name: '공문서·행정',
    tools: [
      { id: 'gongmun-check', name: '공문 작성 규칙 검사', summary: '날짜·시간·금액·항목 기호·붙임·"끝." 표시를 검사하고 고쳐요.', status: 'ready', formats: ['본문 붙여넣기'] },
      { id: 'gongmun-draft', name: '공문 초안', summary: '메모 몇 줄로 기안문 초안을 만들어요.', status: 'soon' },
      { id: 'minutes', name: '회의록·협의록', summary: '안건·참석자·결정 사항으로 회의록을 만들어요.', status: 'soon' },
    ],
  },
  {
    id: 'plans',
    short: '계획',
    desc: '해마다 다시 쓰는 계획서와 결과보고, 영역별로 채워야 하는 안전교육 시수. 작년 것을 바탕으로 빠르게 정리해요.',
    color: '#d71e1e',
    ink: '#ffffff',
    en: 'Plans & Reports',
    name: '계획서·보고서',
    tools: [
      { id: 'plan-rewrite', name: '계획서 다시쓰기', summary: '작년 한글 계획서의 연도와 날짜·요일을 올해로 바꾸고 신구대조표를 만들어요.', status: 'ready', formats: ['HWP', 'HWPX', 'XLSX 저장'] },
      { id: 'report', name: '결과보고서', summary: '설문·실적 엑셀로 통계표가 들어간 결과보고서를 만들어요.', status: 'soon' },
      { id: 'safety-hours', name: '안전교육 시수표', summary: '실시한 안전교육을 기록하면 7대 영역별 누적·부족 시수를 보여 줘요.', status: 'ready', formats: ['엑셀 붙여넣기', 'XLSX 저장'] },
    ],
  },
  {
    id: 'finance',
    short: '재정',
    desc: '견적서와 장바구니를 품목 내역으로, 합계는 한글 금액으로. 품의 본문과 산출 기초까지 한 번에 만들어요.',
    color: '#ffe927',
    ink: '#000000',
    en: 'Budget & Supplies',
    name: '재정·물품',
    tools: [
      { id: 'pumui', name: '품의 준비 도우미', summary: '품목만 넣으면 합계·금액 한글 표기·산출 기초·품의 본문이 만들어져요.', status: 'ready', formats: ['엑셀 붙여넣기', 'XLSX 저장'] },
      { id: 'allowance', name: '수당·협의회비 계산', summary: '강사 수당과 협의회비를 기준표로 계산해요.', status: 'soon' },
      { id: 'budget', name: '예산 집행 현황표', summary: '에듀파인 엑셀로 사업별 집행률을 정리해요.', status: 'soon' },
    ],
  },
  {
    id: 'neis',
    short: '나이스',
    desc: '교외체험학습 신청서와 결과보고서, 수업일 계산과 연간 허용 일수 확인. 나이스에 올리기 전 서류를 갖춰요.',
    color: '#000000',
    ink: '#ffffff',
    en: 'NEIS & Records',
    name: '나이스·학적 서류',
    tools: [
      { id: 'field-trip', name: '교외체험학습 서류', summary: '수업일 수를 세고 연간 허용 일수를 확인해 신청서·결과보고서를 만들어요.', status: 'ready', formats: ['인쇄·PDF'] },
      { id: 'attendance', name: '출결 통계 정리', summary: '나이스 출결 엑셀을 월별·사유별로 요약해요.', status: 'soon' },
    ],
  },
  {
    id: 'parents',
    short: '학부모',
    desc: '가정통신문을 쓰고, 회신서를 걷고, 상담주간 시간을 나눠요. 학부모와 주고받는 종이를 한곳에서 처리해요.',
    color: '#e8571b',
    ink: '#ffffff',
    en: 'Families',
    name: '학부모 소통',
    tools: [
      { id: 'newsletter', name: '가정통신문 메이커', summary: '틀을 골라 내용만 채우면 회신서까지 붙은 가정통신문이 완성돼요.', status: 'ready', formats: ['인쇄·PDF', '한글 붙여넣기'] },
      { id: 'reply-collect', name: '회신서 취합', summary: '학생 칸을 눌러 회신서를 걷고, 미제출 안내 문구와 현황표를 만들어요.', status: 'ready', formats: ['명단 붙여넣기', 'XLSX 저장'] },
      { id: 'counsel-week', name: '상담주간 배정표', summary: '가정별 희망 시간을 겹치지 않게 자동 배정하고 안내 문구를 만들어요.', status: 'ready', formats: ['회신 붙여넣기', 'XLSX 저장'] },
    ],
  },
]

export const findTool = (id: string) => {
  for (const a of AREAS) {
    const t = a.tools.find(t => t.id === id)
    if (t) return { area: a, tool: t }
  }
  return null
}
