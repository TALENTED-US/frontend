export const EXPENSE_CATEGORY_LABELS = Object.freeze({
  FOOD: '식비',
  ALCOHOL_ENTERTAINMENT: '술·유흥',
  CAFE_SNACK: '카페·간식',
  JOB_PREPARATION: '취업 준비',
  SHOPPING: '쇼핑',
  HOBBY_LEISURE: '취미·여가',
  HOUSING_COMMUNICATION: '주거·통신',
  TRANSPORT_FUEL: '교통·유류비',
  HEALTH_FITNESS: '의료·건강',
  OTHER_FINANCE: '기타 금융',
})

export const EXPENSE_CATEGORY_OPTIONS = Object.freeze(Object.values(EXPENSE_CATEGORY_LABELS))

const LEGACY_CATEGORY_ALIASES = Object.freeze({
  교통: 'TRANSPORT_FUEL',
  교통비: 'TRANSPORT_FUEL',
  주거: 'HOUSING_COMMUNICATION',
  월세: 'HOUSING_COMMUNICATION',
  통신: 'HOUSING_COMMUNICATION',
  통신비: 'HOUSING_COMMUNICATION',
  구독: 'OTHER_FINANCE',
  구독비: 'OTHER_FINANCE',
  보험: 'OTHER_FINANCE',
  교육: 'JOB_PREPARATION',
  교육비: 'JOB_PREPARATION',
  자격증: 'JOB_PREPARATION',
  '자격증 비용': 'JOB_PREPARATION',
  기타: 'OTHER_FINANCE',
})

const CATEGORY_BY_LABEL = Object.freeze(
  Object.fromEntries(
    Object.entries(EXPENSE_CATEGORY_LABELS).map(([category, label]) => [label, category]),
  ),
)

export function expenseCategoryToLabel(category) {
  return EXPENSE_CATEGORY_LABELS[category] || EXPENSE_CATEGORY_LABELS.OTHER_FINANCE
}

export function expenseLabelToCategory(label) {
  return CATEGORY_BY_LABEL[label] || LEGACY_CATEGORY_ALIASES[label] || 'OTHER_FINANCE'
}

export function normalizeExpenseCategoryLabel(label) {
  return expenseCategoryToLabel(expenseLabelToCategory(label))
}
