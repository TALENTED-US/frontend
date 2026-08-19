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
    policy: /(정책|지원금|지원받|혜택|보조금|장려금|청년지원)/.test(value),
  }
}

export function targetedRecommendationCategories(prompt) {
  const targets = aiRecommendationTargets(prompt)
  return Object.keys(targets).filter((category) => targets[category])
}

export function normalizeCategoryRecommendationResponse(category, response) {
  if (!response) return response

  if (category === 'expense') {
    if (response.financialRecommendation) return response
    const recommendations = Array.isArray(response)
      ? response
      : Array.isArray(response.recommendations)
        ? response.recommendations
        : []
    return {
      financialRecommendation: {
        ...(Array.isArray(response) ? {} : response),
        recommendations,
      },
    }
  }

  if (category === 'income') {
    if (response.incomeRecommendation) return response
    const jobs = Array.isArray(response)
      ? response
      : Array.isArray(response.jobs)
        ? response.jobs
        : []
    return {
      incomeRecommendation: {
        ...(Array.isArray(response) ? {} : response),
        jobs,
      },
    }
  }

  if (response.policyRecommendations) return response
  const policyRecommendations = Array.isArray(response)
    ? response
    : Array.isArray(response.recommendations)
      ? response.recommendations
      : []
  return { policyRecommendations }
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
