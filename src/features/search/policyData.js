import { normalizePolicyRegion } from '@/mappers/policy'

export const defaultPolicyFilters = []

export const policyFilterGroups = [
  ['취업 준비 상태', ['첫취업', '재취업', '재직자', '예비창업자', '미취업자']],
  ['정책 분야', ['취업', '주거', '복지', '교육', '교통', '청년지원']],
  [
    '정책 지역',
    [
      '전국',
      '서울',
      '경기',
      '인천',
      '부산',
      '대구',
      '경남',
      '경북',
      '광주',
      '전남',
      '전북',
      '대전',
      '울산',
      '세종',
    ],
  ],
  ['신청 상태', ['신청 가능', '마감']],
  ['신청 마감', ['오늘 마감', '3일 이내', '7일 이내', '30일 이내', '상시']],
]

const availableFilters = new Set(policyFilterGroups.flatMap(([, items]) => items))

export function readFilters(query) {
  const value = query.filters
  if (Array.isArray(value)) return value.filter((item) => item && availableFilters.has(item))
  if (Object.prototype.hasOwnProperty.call(query, 'filters') && !value) return []
  if (typeof value === 'string' && value) {
    return value.split('|').filter((item) => item && availableFilters.has(item))
  }
  return [...defaultPolicyFilters]
}

export function toFilterQuery(filters) {
  return filters.join('|')
}

const deadlineFilters = {
  '오늘 마감': 'TODAY',
  '3일 이내': 'WITHIN_3_DAYS',
  '7일 이내': 'WITHIN_7_DAYS',
  '30일 이내': 'WITHIN_30_DAYS',
  상시: 'ALWAYS',
}
const employmentFilters = {
  첫취업: 'FIRST_JOB',
  재취업: 'REEMPLOYMENT',
  재직자: 'EMPLOYED',
  예비창업자: 'PROSPECTIVE_FOUNDER',
  미취업자: 'UNEMPLOYED',
}
const categoryFilters = {
  취업: 'EMPLOYMENT',
  주거: 'HOUSING',
  복지: 'WELFARE',
  교육: 'EDUCATION',
  교통: 'TRANSPORT',
  청년지원: 'YOUTH_SUPPORT',
}

export function toPolicySearchRequest(filters, amount = 0, keyword = '', options = {}) {
  const category = policyFilterGroups[1][1].find((item) => filters.includes(item))
  const employment = policyFilterGroups[0][1].find((item) => filters.includes(item))
  const region = policyFilterGroups[2][1].find((item) => filters.includes(item))
  const policyRegion = normalizePolicyRegion(region || options.policyRegion)
  const deadline = policyFilterGroups[4][1].find((item) => filters.includes(item))
  const available = filters.includes('신청 가능')
  const closed = filters.includes('마감')

  return {
    page: options.page || 1,
    size: options.size || 10,
    ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
    ...(categoryFilters[category] ? { policyCategory: categoryFilters[category] } : {}),
    ...(employmentFilters[employment]
      ? { employmentPrepStatus: employmentFilters[employment] }
      : {}),
    ...(deadlineFilters[deadline] ? { dueDateFilter: deadlineFilters[deadline] } : {}),
    ...(available || closed ? { policyStatus: closed ? 'CLOSED' : 'AVAILABLE' } : {}),
    ...(Number(amount) > 0 ? { policySupportAmount: Number(amount) * 10000 } : {}),
    ...(options.age !== undefined ? { age: options.age } : {}),
    ...(policyRegion ? { policyRegion } : {}),
  }
}
