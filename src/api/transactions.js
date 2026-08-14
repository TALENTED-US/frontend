import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

const apiCategoryToUi = {
  FOOD: '식비',
  TRANSPORT: '교통',
  HOUSING: '주거',
  COMMUNICATION: '통신비',
  SUBSCRIPTION: '구독',
  EDUCATION: '교육',
  CERTIFICATE: '자격증',
  ETC_EXPENSE: '기타',
}

const uiCategoryToApi = Object.fromEntries(
  Object.entries(apiCategoryToUi).map(([apiCategory, uiCategory]) => [uiCategory, apiCategory]),
)

function splitTransactionAt(value = '') {
  const [date = '', rawTime = ''] = String(value).split('T')
  return { date, time: rawTime.slice(0, 5) }
}

function resolveExpenseCategory(row) {
  const mappedCategory = apiCategoryToUi[row?.expenseCategory] || '기타'
  if (mappedCategory !== '기타') return mappedCategory

  const transactionText = `${row?.transactionContent || ''} ${row?.transactionMemo || ''}`
  if (/월세|임대료|관리비|공과금/.test(transactionText)) return '주거'
  return mappedCategory
}

export function mapTransactionResponse(row) {
  const { date, time } = splitTransactionAt(row?.transactionAt)
  const isIncome = row?.transactionType === 'INCOME'
  const amount = Math.abs(Number(row?.transactionAmount) || 0) * (isIncome ? 1 : -1)

  return {
    id: row?.transactionId,
    apiId: row?.transactionId,
    date,
    time,
    title: row?.transactionContent || row?.transactionMemo || (isIncome ? '수입' : '지출'),
    category: isIncome ? '수입' : resolveExpenseCategory(row),
    detail: isIncome ? '입금' : row?.transactionType === 'FIXED' ? '고정지출' : '지출',
    amount,
    memo: row?.transactionMemo || '',
    fixed: row?.transactionType === 'FIXED',
    transactionType: row?.transactionType,
    expenseCategory: row?.expenseCategory,
  }
}

export function mapTransactionForm(payload) {
  const isIncome = payload.amount > 0
  return {
    transactionType: isIncome ? 'INCOME' : 'EXPENSE',
    expenseCategory: isIncome ? 'ETC_EXPENSE' : uiCategoryToApi[payload.category] || 'ETC_EXPENSE',
    transactionAmount: Math.abs(Math.trunc(Number(payload.amount) || 0)),
    transactionContent: payload.title || payload.memo || (isIncome ? '수입' : payload.category),
    transactionMemo: payload.memo || '',
    transactionDate: `${payload.date}T${payload.time || '00:00'}:00`,
  }
}

async function requestResult(request) {
  try {
    return unwrapApiResponse(await request())
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function getTransactionsApi() {
  return requestResult(() => apiClient.get('transactions'))
}

export function getTransactionDetailApi(transactionId) {
  return requestResult(() => apiClient.get(`transactions/${encodeURIComponent(transactionId)}`))
}

export function createTransactionApi(payload) {
  return requestResult(() => apiClient.post('transactions', mapTransactionForm(payload)))
}

export function updateTransactionApi(transactionId, payload) {
  const mapped = mapTransactionForm(payload)
  return requestResult(() =>
    apiClient.patch(`transactions/${encodeURIComponent(transactionId)}`, {
      expenseCategory: mapped.expenseCategory,
      transactionAmount: mapped.transactionAmount,
      transactionDate: mapped.transactionDate,
      transactionMemo: mapped.transactionMemo,
    }),
  )
}

export function deleteTransactionApi(transactionId) {
  return requestResult(() => apiClient.delete(`transactions/${encodeURIComponent(transactionId)}`))
}

export function registerFixedTransactionApi(transactionId) {
  return requestResult(() =>
    apiClient.patch(`transactions/${encodeURIComponent(transactionId)}/fixed`),
  )
}
