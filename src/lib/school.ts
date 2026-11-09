// 우리 학교 정보: 한 도구에서 고치면 다른 도구에도 그대로 들어간다 (이 브라우저에만 저장)
export interface School { name: string; principal: string; contact: string; logo: string | null }

const STORE = 'ssamtool.school.v1'
const OLD = 'ssamtool.newsletter.school.v1' // 공유 전 가정통신문이 쓰던 자리
export const DEFAULT_SCHOOL: School = { name: '○○초등학교', principal: '○○초등학교장', contact: '담임 ○○○ · 전화 000-000-0000', logo: null }

export function loadSchool(): School {
  try {
    const old = localStorage.getItem(OLD) ?? '{}'
    const fieldTripName = localStorage.getItem('ssamtool.fieldtrip.school.v1')
    return { ...DEFAULT_SCHOOL, ...(fieldTripName ? { name: fieldTripName } : {}), ...JSON.parse(old), ...JSON.parse(localStorage.getItem(STORE) ?? '{}') }
  } catch { return DEFAULT_SCHOOL }
}

export function saveSchool(patch: Partial<School>) {
  try { localStorage.setItem(STORE, JSON.stringify({ ...loadSchool(), ...patch })) } catch { /* 저장 못 해도 동작에는 문제 없음 */ }
}
