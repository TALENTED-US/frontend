export const defaultPolicyFilters = ['첫취업', '취업', '모집 중', '7일 이내']

export const policyFilterGroups = [
  ['취업 상태', ['첫취업', '재취업']],
  ['정책 분야', ['취업', '주거', '복지', '교육', '교통', '청년지원']],
  ['소득 기준', ['제한 없음', '중위소득 50%', '80%', '100%', '120%', '150%']],
  ['신청 가능 여부', ['신청 가능', '모집 중', '모집 예정', '마감 임박']],
  ['지원 형태', ['현금 지원', '바우처', '대출', '이자 지원', '장학금', '교육 프로그램', '컨설팅', '취업 연계']],
  ['신청 마감', ['오늘 마감', '3일 이내', '7일 이내', '30일 이내', '상시']],
  ['관심 키워드', ['전체', '월세', '취업', '생활비', '자격증', '학자금', '청약']],
  ['신청 방식·기관', ['온라인', '오프라인', '방문 신청', '모바일 신청', '고용노동부', '국토교통부', '지자체']],
]

const baseline = ['첫취업', '취업', '모집 중', '7일 이내']

export const policyItems = [
  {
    id: 'job-seeking-support',
    title: '청년 구직활동지원금',
    description: '취업준비생 · 온라인 신청',
    benefit: '월 50만원',
    deadline: '7일 이내',
    amount: 50,
    url: 'https://www.work24.go.kr/',
    tags: [...baseline, '제한 없음', '현금 지원', '온라인', '고용노동부'],
  },
  {
    id: 'seoul-youth-allowance',
    title: '서울시 청년수당',
    description: '구직활동 계획 제출',
    benefit: '최대 300만원',
    deadline: '모집 중',
    amount: 300,
    url: 'https://youth.seoul.go.kr/',
    tags: [...baseline, '중위소득 150%', '현금 지원', '온라인', '생활비', '지자체'],
  },
  {
    id: 'tomorrow-learning-card',
    title: '국민내일배움카드',
    description: '교육비 · 훈련 과정 선택',
    benefit: '최대 500만원',
    deadline: '상시 모집',
    amount: 500,
    url: 'https://www.work24.go.kr/',
    tags: [...baseline, '재취업', '교육', '바우처', '자격증', '온라인', '고용노동부'],
  },
  {
    id: 'youth-rent-support',
    title: '청년월세 특별지원',
    description: '월세 부담 경감 · 온라인 신청',
    benefit: '최대 240만원',
    deadline: '30일 이내',
    amount: 240,
    url: 'https://www.bokjiro.go.kr/',
    tags: [...baseline, '주거', '청년지원', '현금 지원', '월세', '30일 이내', '온라인', '국토교통부'],
  },
  {
    id: 'national-employment-support',
    title: '국민취업지원제도',
    description: '취업 지원 서비스 · 상담 연계',
    benefit: '월 50만원',
    deadline: '상시 모집',
    amount: 50,
    url: 'https://www.kua.go.kr/',
    tags: [...baseline, '재취업', '복지', '현금 지원', '취업 연계', '상시', '온라인', '고용노동부'],
  },
  {
    id: 'youth-challenge-support',
    title: '청년도전지원사업',
    description: '맞춤형 취업 프로그램',
    benefit: '최대 350만원',
    deadline: '모집 예정',
    amount: 350,
    url: 'https://www.work24.go.kr/',
    tags: [...baseline, '재취업', '청년지원', '교육 프로그램', '취업 연계', '모집 예정', '온라인', '지자체'],
  },
]

export function readFilters(query) {
  const value = query.filters
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string' && value) return value.split('|').filter(Boolean)
  return [...defaultPolicyFilters]
}

export function toFilterQuery(filters) {
  return filters.join('|')
}

export function filterPolicies(items, filters, amount = 0) {
  const selectionsByGroup = policyFilterGroups
    .map(([, groupItems]) => filters.filter((filter) => filter !== '전체' && groupItems.includes(filter)))
    .filter((selections) => selections.length)

  return items.filter((item) =>
    item.amount >= amount
    && selectionsByGroup.every((selections) => selections.some((filter) => item.tags.includes(filter))),
  )
}
