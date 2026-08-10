const EXPENSE_NAMES = {
  FOOD: '식비',
  TRANSPORT: '교통비',
  HOUSING: '주거',
  COMMUNICATION: '통신비',
  SUBSCRIPTION: '구독비',
  EDUCATION: '교육비',
  CERTIFICATE: '자격증 비용',
  ETC_EXPENSE: '기타',
}

function numberOrZero(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function recurrenceToType(value) {
  return value === 'ONCE' ? 'once' : 'monthly'
}

export function toUpdateSimulationItemRequest(item) {
  const recurrenceType = item.type === 'once' ? 'ONCE' : 'MONTHLY'
  const applyStartDate = item.startDate

  return {
    amount: numberOrZero(item.amount),
    applyStartDate,
    recurrenceType,
    ...(recurrenceType === 'MONTHLY' && item.endDate
      ? { applyEndDate: item.endDate }
      : {}),
    ...(item.name ? { itemName: item.name.trim() } : {}),
  }
}

export function mapSimulationItemResponse(item, policyCatalog = []) {
  if (!item?.itemId || !item.itemCategory) return null

  const common = {
    remoteId: item.itemId,
    remoteSynced: true,
    amount: numberOrZero(item.amount),
    startDate: item.applyStartDate || '',
    endDate: item.applyEndDate || '',
    type: recurrenceToType(item.recurrenceType),
  }

  if (item.itemCategory === 'EXPENSE') {
    const name = EXPENSE_NAMES[item.expenseCategory] || '기타'
    return {
      ...common,
      kind: 'expense',
      id: name,
      name,
      saving: common.amount,
      selected: common.amount > 0,
    }
  }

  if (item.itemCategory === 'INCOME') {
    return {
      ...common,
      kind: 'income',
      id: item.itemId,
      name: item.displayName || '추가 수입',
      cycle: common.type === 'monthly' ? '매월' : '1회',
    }
  }

  if (item.itemCategory === 'POLICY') {
    const policy = item.policy || {}
    const catalogItem = policyCatalog.find((entry) => entry.name === policy.policyName)
    return {
      ...(catalogItem || {}),
      ...common,
      kind: 'policy',
      id: catalogItem?.id ?? policy.policyId ?? item.itemId,
      name: policy.policyName || item.displayName || '정책 혜택',
      description: catalogItem?.description || policy.policyCategory || '',
      amount: numberOrZero(policy.policySupportAmount || item.amount),
      months: numberOrZero(policy.appliedSupportMonthCount || policy.supportMonthCount),
      detail:
        catalogItem?.detail ||
        (policy.policySupportAmount
          ? `월 ${numberOrZero(policy.policySupportAmount).toLocaleString('ko-KR')}원`
          : ''),
      policy,
    }
  }

  return null
}

export function mapConfirmedSimulationResponse(response, policyCatalog = []) {
  if (!response?.simulationId) return null

  const items = (response.appliedItems || [])
    .map((item) => mapSimulationItemResponse(item, policyCatalog))
    .filter(Boolean)

  return {
    simulationId: response.simulationId,
    startDate: response.simulationStartDate || '',
    endDate: response.simulationDueDate || '',
    confirmedAt: response.confirmedAt || '',
    currentMonths: numberOrZero(response.currentPrepMonths),
    expectedMonths: numberOrZero(response.expectPrepMonths),
    endAmount: numberOrZero(response.simulationEndAmount),
    expenses: items.filter((item) => item.kind === 'expense'),
    incomes: items.filter((item) => item.kind === 'income'),
    policies: items.filter((item) => item.kind === 'policy'),
    monthlyProjections: Array.isArray(response.monthlyProjections)
      ? response.monthlyProjections
      : [],
  }
}
