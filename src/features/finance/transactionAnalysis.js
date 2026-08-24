export function isTransferTransaction(transaction = {}) {
  return transaction?.transactionType === 'TRANSFER' || transaction?.category === '계좌이체'
}

export function transactionKind(transaction = {}) {
  if (transaction.transactionType === 'INCOME') return 'income'
  if (['EXPENSE', 'FIXED'].includes(transaction.transactionType)) return 'expense'
  if (isTransferTransaction(transaction)) return 'transfer'
  return Number(transaction.amount) > 0 ? 'income' : 'expense'
}

export function isAnalyzableTransaction(transaction = {}) {
  return transaction.analysisExcluded !== true && transactionKind(transaction) !== 'transfer'
}

export function isIncomeTransaction(transaction = {}) {
  return isAnalyzableTransaction(transaction) && transactionKind(transaction) === 'income'
}

export function isExpenseTransaction(transaction = {}) {
  return isAnalyzableTransaction(transaction) && transactionKind(transaction) === 'expense'
}

export function analyzableSignedAmount(transaction = {}) {
  if (isIncomeTransaction(transaction)) return Math.abs(Number(transaction.amount) || 0)
  if (isExpenseTransaction(transaction)) return -Math.abs(Number(transaction.amount) || 0)
  return 0
}
