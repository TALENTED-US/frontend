function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatMoney(value) {
  return `${numberOrZero(value).toLocaleString('ko-KR')}원`
}

export function mapPolicyResponse(policy) {
  const id = String(policy?.policyId || '')
  if (!id) return null

  const amount = numberOrZero(policy.policySupportAmount)
  const months = Math.max(1, numberOrZero(policy.supportMonthCount) || 1)
  const isMonthly = months > 1

  return {
    id,
    policyId: id,
    name: policy.policyName || '정부 지원 정책',
    title: policy.policyName || '정부 지원 정책',
    description: policy.requiredDocument || '정책 상세 내용을 확인해 주세요.',
    amount,
    months,
    type: isMonthly ? 'monthly' : 'once',
    detail: isMonthly ? `월 ${formatMoney(amount)} × ${months}개월` : formatMoney(amount),
    benefit: isMonthly ? `월 ${formatMoney(amount)}` : formatMoney(amount),
    deadline: policy.dueDate || '상시',
    dueDate: policy.dueDate || '',
    url: policy.policyUrl || '',
    status: policy.policyStatus || 'AVAILABLE',
    requiredDocument: policy.requiredDocument || '',
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

export function normalizePolicyRegion(region) {
  const value = String(region || '').trim()
  const match = value.match(/^(서울|경기|인천|부산|대구|광주|대전|울산|세종)/)
  return match?.[1] || value || undefined
}
