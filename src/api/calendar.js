import { apiClient, normalizeApiError, unwrapApiResponse } from './client'
import { expenseCategoryLabel } from '@/constants/expenseCategories'

function splitTransactionAt(value = '') {
  const [date = '', rawTime = ''] = String(value).split('T')
  return { date, time: rawTime.slice(0, 5) }
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
    category: isIncome ? '수입' : expenseCategoryLabel(row?.category),
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
          category: expenseCategoryLabel(item?.category),
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
