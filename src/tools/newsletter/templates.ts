// 가정통신문의 틀. 내용은 예시이며 선생님이 바꿔 쓴다.
export interface Row { label: string; value: string }
export interface Reply {
  enabled: boolean
  title: string
  question: string
  options: string      // 쉼표로 구분
  fields: string       // 쉼표로 구분: 보호자가 적을 칸
  due: string          // 회신 기한 (예: 2026. 11. 14.(금))
}
export interface Letter {
  title: string
  body: string
  rows: Row[]
  closing: string
  reply: Reply
}

export const SEASON_GREETING: Record<number, string> = {
  1: '새해 복 많이 받으시고, 가정에 건강과 웃음이 가득하시기를 바랍니다.',
  2: '한 학년을 잘 마무리하도록 늘 함께해 주셔서 감사합니다.',
  3: '새 학년을 맞아 설렘으로 학교에 오는 아이들을 반갑게 맞이합니다.',
  4: '봄꽃이 피어나는 계절, 가정에 따뜻한 기운이 가득하시기를 바랍니다.',
  5: '싱그러운 오월, 가정의 달을 맞아 가정마다 웃음이 함께하시기를 바랍니다.',
  6: '초여름 햇살이 짙어지는 때, 늘 건강하시기를 바랍니다.',
  7: '무더위가 이어지는 요즘, 가정에 건강과 평안이 함께하시기를 바랍니다.',
  8: '방학 동안 한 뼘 더 자란 아이들을 다시 만날 날을 기다리고 있습니다.',
  9: '선선한 바람이 부는 가을, 가정에 기쁨이 가득하시기를 바랍니다.',
  10: '높고 푸른 가을 하늘처럼 가정에 맑은 일만 가득하시기를 바랍니다.',
  11: '깊어 가는 가을, 학부모님 가정에 건강과 행복이 함께하시기를 바랍니다.',
  12: '한 해를 마무리하는 12월, 한 해 동안 보내 주신 관심과 사랑에 감사드립니다.',
}

const NO_REPLY: Reply = { enabled: false, title: '', question: '', options: '', fields: '', due: '' }

export const TEMPLATES: { id: string; name: string; letter: Letter }[] = [
  {
    id: 'event',
    name: '행사 안내',
    letter: {
      title: '학예 발표회 안내',
      body: '우리 학교에서는 한 해 동안 아이들이 갈고닦은 솜씨를 나누는 학예 발표회를 아래와 같이 엽니다. 아이들의 무대를 함께 보시고 큰 박수로 격려해 주시기 바랍니다.',
      rows: [
        { label: '일시', value: '2026. 12. 4.(금) 10:00~12:00' },
        { label: '장소', value: '본교 강당' },
        { label: '대상', value: '전교생 및 학부모' },
        { label: '안내', value: '주차 공간이 좁으니 대중교통을 이용해 주세요.' },
      ],
      closing: '바쁘시더라도 많이 오셔서 자리를 빛내 주시기 바랍니다.',
      reply: NO_REPLY,
    },
  },
  {
    id: 'consent',
    name: '참가 동의서',
    letter: {
      title: '방과후 독서 교실 참가 안내',
      body: '책 읽는 즐거움을 함께 나누는 방과후 독서 교실을 아래와 같이 운영합니다. 참가를 원하는 학생은 아래 회신서를 작성하여 담임 선생님께 제출해 주시기 바랍니다.',
      rows: [
        { label: '기간', value: '2026. 11. 16.(월)~12. 11.(금), 매주 월·수' },
        { label: '시간', value: '14:40~15:40' },
        { label: '장소', value: '도서관' },
        { label: '인원', value: '학년별 15명 (신청 순)' },
        { label: '비용', value: '없음' },
      ],
      closing: '아이들이 즐겁게 참여할 수 있도록 관심을 부탁드립니다.',
      reply: { enabled: true, title: '방과후 독서 교실 참가 회신서', question: '방과후 독서 교실에', options: '참가합니다, 참가하지 않습니다', fields: '', due: '2026. 11. 11.(수)' },
    },
  },
  {
    id: 'field-trip',
    name: '현장체험학습',
    letter: {
      title: '현장체험학습 안내 및 동의서',
      body: '교과 학습과 연계한 현장체험학습을 아래와 같이 실시합니다. 안전한 체험학습이 되도록 가정에서도 지도해 주시고, 회신서를 기한까지 보내 주시기 바랍니다.',
      rows: [
        { label: '일시', value: '2026. 11. 20.(금) 09:00~15:00' },
        { label: '장소', value: '국립중앙과학관 (대전)' },
        { label: '대상', value: '4학년 전체' },
        { label: '이동', value: '전세 버스' },
        { label: '준비물', value: '도시락, 물, 편한 운동화, 필기도구' },
        { label: '비용', value: '없음 (교육청 지원)' },
      ],
      closing: '아이들에게 뜻깊은 하루가 되도록 정성껏 준비하겠습니다.',
      reply: { enabled: true, title: '현장체험학습 참가 동의서', question: '현장체험학습 참가에', options: '동의합니다, 동의하지 않습니다', fields: '건강상 유의할 점(알레르기, 멀미 등), 비상 연락처', due: '2026. 11. 13.(금)' },
    },
  },
  {
    id: 'counsel',
    name: '학부모 상담주간',
    letter: {
      title: '2학기 학부모 상담주간 안내',
      body: '학생의 학교생활과 성장에 대해 학부모님과 이야기를 나누는 상담주간을 운영합니다. 희망하시는 날짜와 방법을 회신서에 적어 보내 주시면 시간을 조정하여 다시 안내해 드리겠습니다.',
      rows: [
        { label: '기간', value: '2026. 11. 23.(월)~11. 27.(금)' },
        { label: '시간', value: '14:30~17:00 (한 가정 20분)' },
        { label: '방법', value: '대면 상담 또는 전화 상담' },
      ],
      closing: '편안한 마음으로 신청해 주시기 바랍니다.',
      reply: { enabled: true, title: '학부모 상담 신청서', question: '상담 방법', options: '대면 상담, 전화 상담', fields: '희망 날짜, 희망 시간, 상담하고 싶은 내용', due: '2026. 11. 18.(수)' },
    },
  },
  {
    id: 'blank',
    name: '직접 쓰기',
    letter: { title: '', body: '', rows: [{ label: '일시', value: '' }], closing: '', reply: NO_REPLY },
  },
]
