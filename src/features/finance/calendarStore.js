import { computed, reactive } from 'vue'
import { getCalendarApi } from '@/api/calendar'

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'
let latestRequestId = 0

export const calendarState = reactive({
  key: '',
  transactions: [],
  totalIncome: 0,
  totalExpense: 0,
  netCashFlow: 0,
  categoryExpenses: [],
  loading: false,
  loaded: false,
  error: '',
})

export const calendarTransactions = computed(() => calendarState.transactions)

export async function loadCalendar(year, month, force = false) {
  if (USE_MOCK_API) return null

  const key = `${year}-${String(month).padStart(2, '0')}`
  if (calendarState.loaded && calendarState.key === key && !force) return calendarState

  const requestId = ++latestRequestId
  calendarState.loading = true
  calendarState.error = ''
  try {
    const result = await getCalendarApi(year, month)
    if (requestId !== latestRequestId) return result
    Object.assign(calendarState, result, { key, loaded: true })
    return calendarState
  } catch (error) {
    if (requestId === latestRequestId) {
      calendarState.error = error.message || '캘린더 데이터를 불러오지 못했습니다.'
    }
    throw error
  } finally {
    if (requestId === latestRequestId) calendarState.loading = false
  }
}

export function clearCalendar() {
  latestRequestId += 1
  Object.assign(calendarState, {
    key: '',
    transactions: [],
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    categoryExpenses: [],
    loading: false,
    loaded: false,
    error: '',
  })
}
