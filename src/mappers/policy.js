function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatMoney(value) {
  return `${numberOrZero(value).toLocaleString('ko-KR')}원`
}

export function mapPolicyResponse(policy) {
  const id = String(policy?.policyId || policy?.id || '')
  if (!id) return null

  const amount = numberOrZero(policy.policySupportAmount ?? policy.supportAmount ?? policy.amount)
  const months = Math.max(1, numberOrZero(policy.supportMonthCount ?? policy.months) || 1)
  const isMonthly = months > 1
  const name = policy.policyName || policy.name || policy.title || '정부 지원 정책'
  const deadline = policy.dueDate || policy.deadline || '상시'

  return {
    id,
    policyId: id,
    name,
    title: name,
    description: policy.description || policy.requiredDocument || '정책 상세 내용을 확인해 주세요.',
    amount,
    months,
    type: policy.type || (isMonthly ? 'monthly' : 'once'),
    detail:
      policy.detail ||
      (isMonthly ? `월 ${formatMoney(amount)} × ${months}개월` : formatMoney(amount)),
    benefit: policy.benefit || (isMonthly ? `월 ${formatMoney(amount)}` : formatMoney(amount)),
    supportPeriod: policy.supportPeriod || (isMonthly ? `${months}개월` : '1회 지원'),
    deadline,
    dueDate: policy.dueDate || policy.deadline || '',
    url: policy.policyUrl || policy.url || '',
    status: policy.policyStatus || policy.status || 'AVAILABLE',
    requiredDocument: policy.requiredDocument || '',
    recommendationReason: policy.recommendationReason || '',
  }
}

export function mapPolicyPage(response) {
  return {
    content: (response?.content || []).map(mapPolicyResponse).filter(Boolean),
    page: Number(response?.page) || 1,
    size: Number(response?.size) || 10,
    totalElements: Number(response?.totalElements) || 0,
    totalPages: Number(response?.totalPages) || 0,
    hasNext: Boolean(response?.hasNext),
    hasPrevious: Boolean(response?.hasPrevious),
  }
}

export function calculateAge(birthDate, today = new Date()) {
  const [year, month, day] = String(birthDate || '')
    .split('-')
    .map(Number)
  if (!year || !month || !day) return undefined
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1
  }
  return age >= 0 ? age : undefined
}

export function normalizePolicyRegionFilter(region) {
  const value = String(region || '').trim()
  if (!value || ['전체', '미입력', '선택 안 함'].includes(value)) return undefined
  if (/^(경상남|경남)/.test(value)) return '경남'
  if (/^(경상북|경북)/.test(value)) return '경북'
  if (/^(전라남|전남)/.test(value)) return '전남'
  if (/^(전라북|전북)/.test(value)) return '전북'
  const match = value.match(/^(서울|경기|인천|부산|대구|광주|대전|울산|세종|전국)/)
  return match?.[1]
}

export function normalizePolicyRegion(region) {
  const filterRegion = normalizePolicyRegionFilter(region)
  if (filterRegion === '경남' || filterRegion === '경북') return '대구'
  if (filterRegion === '전남' || filterRegion === '전북') return '광주'
  return filterRegion
}
