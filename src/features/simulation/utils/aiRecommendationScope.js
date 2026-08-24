import { EXPENSE_CATEGORY_BY_NAME, EXPENSE_CATEGORY_LABELS } from '@/constants/expenseCategories'

export function expensePromptCategories(prompt) {
  const normalizedPrompt = String(prompt || '')
    .replaceAll(' ', '')
    .toLowerCase()
  const categories = new Set()

  Object.entries(EXPENSE_CATEGORY_BY_NAME)
    .filter(([name]) => name !== '기타')
    .forEach(([name, value]) => {
      if (normalizedPrompt.includes(name.replaceAll(' ', '').toLowerCase())) categories.add(value)
    })

  return categories
}

export function aiRecommendationTargets(prompt) {
  const value = String(prompt || '').replaceAll(' ', '')
  const expenseCategories = expensePromptCategories(prompt)

  return {
    expense:
      expenseCategories.size > 0 || /(지출|절약|소비|줄이|아끼|생활비|식비|배달비)/.test(value),
    income: /(수입|소득|알바|아르바이트|일자리|부업|급여|월급|벌고|취업)/.test(value),
    policy: /(정책|지원금|지원받|지원|혜택|보조금|장려금|청년지원|자격증|응시료|월세|주거비)/.test(
      value,
    ),
  }
}

export function targetedRecommendationCategories(prompt) {
  const targets = aiRecommendationTargets(prompt)
  return Object.keys(targets).filter((category) => targets[category])
}

function unwrapRecommendationPayload(response) {
  let payload = response

  for (let depth = 0; depth < 3; depth += 1) {
    if (
      !payload ||
      Array.isArray(payload) ||
      typeof payload !== 'object' ||
      !Object.prototype.hasOwnProperty.call(payload, 'result')
    ) {
      break
    }
    payload = payload.result
  }

  return payload
}

function objectValue(value) {
  return value && !Array.isArray(value) && typeof value === 'object' ? value : {}
}

function firstArray(...values) {
  return values.find(Array.isArray) || []
}

function looksLikePolicy(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false

  return Boolean(
    value.policyId ||
    value.policyName ||
    value.policyUrl ||
    value.policyStatus ||
    value.supportMonthCount != null ||
    value.requiredDocument ||
    (value.id &&
      (value.name || value.title) &&
      (value.supportAmount != null || value.benefit || value.deadline || value.url)),
  )
}

function findPolicyRecommendations(value, depth = 0, visited = new Set()) {
  if (!value || depth > 5 || typeof value !== 'object' || visited.has(value)) return []

  if (Array.isArray(value)) {
    const policies = value.filter(looksLikePolicy)
    if (policies.length) return policies

    for (const item of value) {
      const nestedPolicies = findPolicyRecommendations(item, depth + 1, visited)
      if (nestedPolicies.length) return nestedPolicies
    }
    return []
  }

  if (looksLikePolicy(value)) return [value]
  visited.add(value)

  const preferredKeys = [
    'policyRecommendations',
    'policyRecommendation',
    'recommendedPolicies',
    'policies',
    'policyResults',
    'recommendations',
    'items',
  ]

  for (const key of preferredKeys) {
    const nestedPolicies = findPolicyRecommendations(value[key], depth + 1, visited)
    if (nestedPolicies.length) return nestedPolicies
  }

  for (const nestedValue of Object.values(value)) {
    const nestedPolicies = findPolicyRecommendations(nestedValue, depth + 1, visited)
    if (nestedPolicies.length) return nestedPolicies
  }

  return []
}

export function normalizeCategoryRecommendationResponse(category, response) {
  const payload = unwrapRecommendationPayload(response)
  if (!payload) return payload

  if (category === 'expense') {
    const financialRecommendation = objectValue(payload.financialRecommendation)
    const recommendations = firstArray(
      financialRecommendation.recommendations,
      payload.recommendations,
      Array.isArray(payload) ? payload : undefined,
    )
    return {
      ...objectValue(payload),
      financialRecommendation: {
        ...(Object.keys(financialRecommendation).length
          ? financialRecommendation
          : objectValue(payload)),
        recommendations,
      },
    }
  }

  if (category === 'income') {
    const incomeRecommendation = objectValue(payload.incomeRecommendation)
    const jobs = firstArray(
      incomeRecommendation.jobs,
      payload.jobs,
      Array.isArray(payload) ? payload : undefined,
    )
    return {
      ...objectValue(payload),
      incomeRecommendation: {
        ...(Object.keys(incomeRecommendation).length ? incomeRecommendation : objectValue(payload)),
        jobs,
        links: firstArray(incomeRecommendation.links, payload.links),
      },
    }
  }

  const policyRecommendations = findPolicyRecommendations(payload)

  return {
    ...objectValue(payload),
    policyRecommendations,
  }
}

export function filterExpenseRecommendationsForPrompt(recommendations, prompt) {
  const requestedCategories = expensePromptCategories(prompt)
  if (!requestedCategories.size) return recommendations

  const financialItems = recommendations?.financialRecommendation?.recommendations || []
  const filteredItems = financialItems.filter((item) => {
    const rawCategory = item?.category || item?.expenseCategory
    const categoryValue = EXPENSE_CATEGORY_LABELS[rawCategory]
      ? rawCategory
      : EXPENSE_CATEGORY_BY_NAME[rawCategory]
    return requestedCategories.has(categoryValue)
  })

  return {
    ...recommendations,
    financialRecommendation: {
      ...recommendations.financialRecommendation,
      recommendations: filteredItems,
    },
  }
}
