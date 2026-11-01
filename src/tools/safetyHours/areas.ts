// 학교안전교육 7대 영역. 목표 시수의 기본값은 초등학교 연간 51차시 기준으로 넣었다.
// 학교·교육청 계획마다 다를 수 있어 화면에서 고칠 수 있다.
export interface Area { id: string; name: string; target: number; keys: RegExp }

export const AREAS: Area[] = [
  { id: 'life', name: '생활안전', target: 12, keys: /생활/ },
  { id: 'traffic', name: '교통안전', target: 11, keys: /교통|보행|자전거/ },
  { id: 'violence', name: '폭력예방·신변보호', target: 8, keys: /폭력|신변|성폭력|아동학대|유괴|학교폭력/ },
  { id: 'drug', name: '약물·사이버 중독 예방', target: 10, keys: /약물|사이버|중독|흡연|음주|인터넷|스마트폰/ },
  { id: 'disaster', name: '재난안전', target: 6, keys: /재난|화재|지진|대피|소방|태풍|홍수|미세먼지/ },
  { id: 'job', name: '직업안전', target: 2, keys: /직업/ },
  { id: 'firstaid', name: '응급처치', target: 2, keys: /응급|심폐|CPR|하임리히/ },
]

export interface Record { id: number; date: string; area: string; topic: string; hours: number; via: string }

export const VIA = ['안전한 생활(1~2학년)', '교과 연계', '창의적 체험활동', '학교 행사', '외부 강사']

// '생활'은 "안전한 생활" 같은 말에도 들어 있어 다른 영역을 먼저 찾고 마지막에 본다
export const findArea = (text: string) =>
  (AREAS.find(a => a.id !== 'life' && a.keys.test(text)) ?? AREAS.find(a => a.id === 'life' && a.keys.test(text)))?.id ?? null

let seq = 1
export const nextId = () => Date.now() * 100 + (seq++ % 100)

export const SAMPLE: Record[] = [
  { id: 1, date: '2026-03-05', area: 'life', topic: '학교 시설물 바르게 이용하기', hours: 2, via: '창의적 체험활동' },
  { id: 2, date: '2026-03-12', area: 'traffic', topic: '안전한 등하굣길', hours: 2, via: '창의적 체험활동' },
  { id: 3, date: '2026-04-02', area: 'disaster', topic: '화재 대피 훈련', hours: 2, via: '학교 행사' },
  { id: 4, date: '2026-04-16', area: 'violence', topic: '학교폭력 예방 교육', hours: 2, via: '외부 강사' },
  { id: 5, date: '2026-05-07', area: 'drug', topic: '스마트폰 바르게 쓰기', hours: 2, via: '교과 연계' },
  { id: 6, date: '2026-06-04', area: 'firstaid', topic: '심폐소생술 실습', hours: 2, via: '외부 강사' },
  { id: 7, date: '2026-06-18', area: 'life', topic: '여름철 물놀이 안전', hours: 2, via: '창의적 체험활동' },
  { id: 8, date: '2026-09-10', area: 'traffic', topic: '자전거 안전하게 타기', hours: 2, via: '교과 연계' },
  { id: 9, date: '2026-09-24', area: 'violence', topic: '아동학대·유괴 예방', hours: 2, via: '창의적 체험활동' },
  { id: 10, date: '2026-10-15', area: 'disaster', topic: '지진 대피 훈련', hours: 1, via: '학교 행사' },
]
