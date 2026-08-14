import { isExpenseTransaction, isIncomeTransaction } from '@/features/finance/transactionAnalysis'

export function getPreviousCompletedMonthKeys(referenceDate = new Date(), count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - count + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

export function analyzePreviousCompletedMonths(
  transactions,
  referenceDate = new Date(),
  count = 3,
) {
  const monthKeys = getPreviousCompletedMonthKeys(referenceDate, count)
  const rows = transactions.filter((item) => item.date && monthKeys.includes(item.date.slice(0, 7)))
  const categoryTotals = {}
  let income = 0
  let expense = 0

  rows.forEach((item) => {
    if (isIncomeTransaction(item)) income += Math.abs(item.amount)
    if (isExpenseTransaction(item)) {
      const amount = Math.abs(item.amount)
      expense += amount
      const category = item.category || '기타'
      categoryTotals[category] = (categoryTotals[category] || 0) + amount
    }
  })

  return {
    monthKeys,
    monthlyIncome: Math.round(income / count),
    monthlyExpense: Math.round(expense / count),
    categories: Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, current: Math.round(total / count) }))
      .sort((a, b) => b.current - a.current),
  }
}
