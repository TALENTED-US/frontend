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

// 이전 UI와 localStorage에 남은 명칭도 새 백엔드 enum으로 변환한다.
export const EXPENSE_CATEGORY_BY_NAME = Object.freeze({
  '식비': 'FOOD',
  '술·유흥': 'ALCOHOL_ENTERTAINMENT',
  '술/유흥': 'ALCOHOL_ENTERTAINMENT',
  '카페·간식': 'CAFE_SNACK',
  '카페/간식': 'CAFE_SNACK',
  '취업 준비': 'JOB_PREPARATION',
  '취업준비': 'JOB_PREPARATION',
  '교육': 'JOB_PREPARATION',
  '교육비': 'JOB_PREPARATION',
  '자격증': 'JOB_PREPARATION',
  '자격증 비용': 'JOB_PREPARATION',
  '쇼핑': 'SHOPPING',
  '취미·여가': 'HOBBY_LEISURE',
  '취미/여가': 'HOBBY_LEISURE',
  '구독': 'HOBBY_LEISURE',
  '구독비': 'HOBBY_LEISURE',
  '주거·통신': 'HOUSING_COMMUNICATION',
  '주거/통신': 'HOUSING_COMMUNICATION',
  '주거': 'HOUSING_COMMUNICATION',
  '월세': 'HOUSING_COMMUNICATION',
  '통신비': 'HOUSING_COMMUNICATION',
  '교통·유류비': 'TRANSPORT_FUEL',
  '교통·주유': 'TRANSPORT_FUEL',
  '교통/주유': 'TRANSPORT_FUEL',
  '교통': 'TRANSPORT_FUEL',
  '교통비': 'TRANSPORT_FUEL',
  '의료·건강': 'HEALTH_FITNESS',
  '건강·운동': 'HEALTH_FITNESS',
  '건강/운동': 'HEALTH_FITNESS',
  '기타 금융': 'OTHER_FINANCE',
  '기타': 'OTHER_FINANCE',
  '보험': 'OTHER_FINANCE',
})

export const DEFAULT_EXPENSE_CATEGORY = 'OTHER_FINANCE'

export function expenseCategoryLabel(category) {
  return EXPENSE_CATEGORY_LABELS[category] || EXPENSE_CATEGORY_LABELS[DEFAULT_EXPENSE_CATEGORY]
}

export function expenseCategoryValue(name) {
  return EXPENSE_CATEGORY_BY_NAME[name] || DEFAULT_EXPENSE_CATEGORY
}
