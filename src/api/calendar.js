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

function splitTransactionAt(value = '') {
  const [date = '', rawTime = ''] = String(value).split('T')
  return { date, time: rawTime.slice(0, 5) }
}

function resolveExpenseCategory(row) {
  const mappedCategory = apiCategoryToUi[row?.category] || '기타'
  if (mappedCategory !== '기타') return mappedCategory

  const transactionText = `${row?.transactionContent || ''} ${row?.transactionMemo || ''}`
  if (/월세|임대료|관리비|공과금/.test(transactionText)) return '주거'
  return mappedCategory
}

export function mapCalendarTransaction(row) {
  const { date, time } = splitTransactionAt(row?.transactionAt)
  const isIncome = row?.transactionType === 'INCOME'
  const amount = Math.abs(Number(row?.amount) || 0) * (isIncome ? 1 : -1)

  return {
    id: row?.transactionId,
    apiId: row?.transactionId,
    date,
    time,
    title: row?.transactionContent || (isIncome ? '수입' : '지출'),
    category: isIncome ? '수입' : resolveExpenseCategory(row),
    detail: row?.institutionName || (isIncome ? '입금' : '지출'),
    amount,
    memo: row?.transactionContent || '',
    fixed: row?.transactionType === 'FIXED',
    transactionType: row?.transactionType,
    expenseCategory: row?.category,
  }
}

export function mapCalendarResponse(result = {}) {
  return {
    totalIncome: Number(result?.totalIncome) || 0,
    totalExpense: Number(result?.totalExpense) || 0,
    netCashFlow: Number(result?.netCashFlow) || 0,
    categoryExpenses: Array.isArray(result?.categoryExpenses)
      ? result.categoryExpenses.map((item) => ({
          category: apiCategoryToUi[item?.category] || '기타',
          amount: Number(item?.amount) || 0,
        }))
      : [],
    transactions: Array.isArray(result?.transactions)
      ? result.transactions.map(mapCalendarTransaction)
      : [],
  }
}

export async function getCalendarApi(year, month) {
  try {
    const result = unwrapApiResponse(
      await apiClient.get('calendar', {
        params: { year: Number(year), month: Number(month) },
      }),
    )
    return mapCalendarResponse(result)
  } catch (error) {
    throw normalizeApiError(error)
  }
}
