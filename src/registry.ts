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
  color: string // 파일철 색: 탭끼리 일부러 부딪치게 고른 밝은 색
  tools: Tool[]
}

export const AREAS: Area[] = [
  {
    id: 'files',
    color: '#ff7a59',
    name: '문서·파일',
    tools: [
      { id: 'doc-shrink', name: '문서 사진 용량 줄이기', summary: 'HWPX·워드·엑셀·PPT 속 사진만 줄여 첨부 용량을 맞춰요.', status: 'ready', formats: ['HWPX', 'DOCX', 'XLSX', 'PPTX'] },
      { id: 'pdf-merge', name: 'PDF 합치기·붙임 문구', summary: 'PDF와 사진을 순서대로 한 파일로 묶고, 공문 붙임 문구를 만들어요.', status: 'ready', formats: ['PDF', 'JPG', 'PNG'] },
      { id: 'convert', name: '형식 변환', summary: 'HWP↔HWPX, 한글→PDF 등 형식 바꾸기.', status: 'soon' },
    ],
  },
  {
    id: 'labels',
    color: '#ffd84d',
    name: '라벨·이름표',
    tools: [
      { id: 'label-maker', name: '라벨지·이름표 메이커', summary: '라벨지 규격을 고르고 명단과 사진을 넣어 바로 인쇄해요.', status: 'ready', formats: ['XLSX', 'CSV', '사진'] },
    ],
  },
  {
    id: 'gongmun',
    color: '#6fa0ff',
    name: '공문서·행정',
    tools: [
      { id: 'gongmun-check', name: '공문 작성 규칙 검사', summary: '날짜·시간·금액·항목 기호·붙임·"끝." 표시를 검사하고 고쳐요.', status: 'ready', formats: ['본문 붙여넣기'] },
      { id: 'gongmun-draft', name: '공문 초안', summary: '메모 몇 줄로 기안문 초안을 만들어요.', status: 'soon' },
      { id: 'minutes', name: '회의록·협의록', summary: '안건·참석자·결정 사항으로 회의록을 만들어요.', status: 'soon' },
    ],
  },
  {
    id: 'plans',
    color: '#4fd19b',
    name: '계획서·보고서',
    tools: [
      { id: 'plan-rewrite', name: '계획서 다시쓰기', summary: '작년 계획서로 올해 초안과 바뀐 곳 비교표를 만들어요.', status: 'soon' },
      { id: 'report', name: '결과보고서', summary: '설문·실적 엑셀로 통계표가 들어간 결과보고서를 만들어요.', status: 'soon' },
      { id: 'safety-hours', name: '안전교육 시수표', summary: '실시한 안전교육을 기록하면 7대 영역별 누적·부족 시수를 보여 줘요.', status: 'ready', formats: ['엑셀 붙여넣기', 'XLSX 저장'] },
    ],
  },
  {
    id: 'finance',
    color: '#ffa3d1',
    name: '재정·물품',
    tools: [
      { id: 'pumui', name: '품의 준비 도우미', summary: '품목만 넣으면 합계·금액 한글 표기·산출 기초·품의 본문이 만들어져요.', status: 'ready', formats: ['엑셀 붙여넣기', 'XLSX 저장'] },
      { id: 'allowance', name: '수당·협의회비 계산', summary: '강사 수당과 협의회비를 기준표로 계산해요.', status: 'soon' },
      { id: 'budget', name: '예산 집행 현황표', summary: '에듀파인 엑셀로 사업별 집행률을 정리해요.', status: 'soon' },
    ],
  },
  {
    id: 'neis',
    color: '#3fd0e0',
    name: '나이스·학적 서류',
    tools: [
      { id: 'field-trip', name: '교외체험학습 서류', summary: '수업일 수를 세고 연간 허용 일수를 확인해 신청서·결과보고서를 만들어요.', status: 'ready', formats: ['인쇄·PDF'] },
      { id: 'attendance', name: '출결 통계 정리', summary: '나이스 출결 엑셀을 월별·사유별로 요약해요.', status: 'soon' },
    ],
  },
  {
    id: 'parents',
    color: '#ffa53a',
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
