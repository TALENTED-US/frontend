export const INFINITE_PREP_MONTHS_THRESHOLD = 999

export function isInfinitePrepMonths(value) {
  const months = Number(value)
  return Number.isFinite(months) && months >= INFINITE_PREP_MONTHS_THRESHOLD
}

export function formatPrepMonths(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  if (isInfinitePrepMonths(value)) return '∞'
  const months = Number(value)
  return Number.isFinite(months) ? months.toFixed(1) : fallback
}

export function formatPrepMonthsWithUnit(value, fallback = '-') {
  const formatted = formatPrepMonths(value, fallback)
  return formatted === '∞' || formatted === fallback ? formatted : `${formatted}개월`
}
