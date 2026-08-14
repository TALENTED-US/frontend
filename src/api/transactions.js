import { apiClient, normalizeApiError, unwrapApiResponse } from './client'
import { expenseCategoryToLabel, expenseLabelToCategory } from '@/constants/expenseCategories'

function splitTransactionAt(value = '') {
  const [date = '', rawTime = ''] = String(value).split('T')
  return { date, time: rawTime.slice(0, 5) }
}

export function mapTransactionResponse(row) {
  const { date, time } = splitTransactionAt(row?.transactionAt)
  const isIncome = row?.transactionType === 'INCOME'
  const isTransfer = row?.transactionType === 'TRANSFER'
  const amount = Math.abs(Number(row?.transactionAmount) || 0) * (isIncome ? 1 : -1)

  return {
    id: row?.transactionId,
    apiId: row?.transactionId,
    date,
    time,
    title:
      row?.transactionContent ||
      row?.transactionMemo ||
      (isIncome ? '수입' : isTransfer ? '계좌이체' : '지출'),
    category: isIncome
      ? '수입'
      : isTransfer
        ? '계좌이체'
        : expenseCategoryToLabel(row?.expenseCategory),
    detail: isIncome
      ? '입금'
      : isTransfer
        ? '계좌이체 · 분석 제외'
        : `${row?.transactionType === 'FIXED' ? '고정지출' : '지출'}${row?.analysisExcluded ? ' · 분석 제외' : ''}`,
    amount,
    memo: row?.transactionMemo || '',
    fixed: row?.transactionType === 'FIXED',
    transactionType: row?.transactionType,
    expenseCategory: row?.expenseCategory,
    analysisExcluded: Boolean(row?.analysisExcluded),
    classificationMethod: row?.classificationMethod || '',
    transactionSource: row?.transactionSource || '',
  }
}

export function mapTransactionForm(payload) {
  const isIncome = payload.amount > 0
  return {
    transactionType: isIncome ? 'INCOME' : 'EXPENSE',
    expenseCategory: isIncome ? 'OTHER_FINANCE' : expenseLabelToCategory(payload.category),
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

export async function getFixedExpenseDetailsApi() {
  const rows = await requestResult(() => apiClient.get('transactions/fixed'))
  return Array.isArray(rows)
    ? rows.map((row) => {
        const { date, time } = splitTransactionAt(row?.transactionAt)
        return {
          id: row?.transactionId,
          apiId: row?.transactionId,
          date,
          time,
          title: row?.transactionContent || '고정지출',
          category: expenseCategoryToLabel(row?.expenseCategory),
          detail: '고정지출',
          amount: -Math.abs(Number(row?.transactionAmount) || 0),
          fixed: true,
          transactionType: 'FIXED',
          expenseCategory: row?.expenseCategory,
        }
      })
    : []
}

export function getFixedExpenseSummaryApi() {
  return requestResult(() => apiClient.get('transactions/fixed/sum'))
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

export function updateTransactionMemoApi(transactionId, memo) {
  return requestResult(() =>
    apiClient.patch(`transactions/${encodeURIComponent(transactionId)}/memo`, { memo }),
  )
}

export function classifyTransactionApi(transactionId, { transactionType, expenseCategory }) {
  return requestResult(() =>
    apiClient.patch(`transactions/${encodeURIComponent(transactionId)}/classification`, {
      transactionType,
      expenseCategory,
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

export function unregisterFixedTransactionApi(transactionId) {
  return requestResult(() =>
    apiClient.patch(`transactions/${encodeURIComponent(transactionId)}/fixed/delete`),
  )
}
