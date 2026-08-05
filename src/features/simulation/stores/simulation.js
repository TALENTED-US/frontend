import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { dashboard } from '@/data/mockData'
import { financeTransactions } from '@/features/finance/financeStore'
import { analyzePreviousCompletedMonths } from '@/features/finance/financeAnalytics'
import { useSessionStore } from '@/stores/session'

const STORAGE_KEY = 'buttie-simulation-v3'
const CATEGORY_META = {
  주거: { icon: '🏠', color: '#ffe197' }, 월세: { icon: '🏠', color: '#ffe197' },
  식비: { icon: '🍚', color: '#ffd0d0' },
  교통: { icon: '🚌', color: '#aab5c8' }, 쇼핑: { icon: '🛍️', color: '#88a9f6' },
  구독: { icon: '📺', color: '#c8a8ef' }, 의료: { icon: '🏥', color: '#8dd5c1' },
  교육: { icon: '📚', color: '#77b6df' }, 보험: { icon: '🛡️', color: '#91c7a9' },
  여가: { icon: '🎮', color: '#f5ae77' }, 기타: { icon: '🧾', color: '#b8bdc8' },
}
const NON_REDUCIBLE_EXPENSES = new Set(['월세', '주거'])
const DAYS_PER_MONTH = 365.2425 / 12

function dateRangeMonths(startValue, endValue) {
  const startParts = String(startValue || '').split('-').map(Number)
  const endParts = String(endValue || '').split('-').map(Number)
  if (
    startParts.length !== 3
    || endParts.length !== 3
    || startParts.some((part) => !part)
    || endParts.some((part) => !part)
  ) return 0

  const start = Date.UTC(startParts[0], startParts[1] - 1, startParts[2])
  const end = Date.UTC(endParts[0], endParts[1] - 1, endParts[2])
  return Math.max(0, (end - start) / (24 * 60 * 60 * 1000) / DAYS_PER_MONTH)
}

function remainingMonthsUntil(value) {
  const parts = String(value || '').replaceAll('.', '-').split('-').map(Number)
  if (parts.length < 3 || parts.some((part) => !part)) return dashboard.targetMonths
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(parts[0], parts[1] - 1, parts[2])
  return Math.max(0, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) / (365.2425 / 12))
}

function getStatus(months, targetMonths) {
  const rate = targetMonths > 0 ? Math.min(100, Math.max(0, Math.round((months / targetMonths) * 100))) : 100
  if (rate <= 30) return { key: 'danger', label: '위험', rate }
  if (rate < 80) return { key: 'caution', label: '주의', rate }
  return { key: 'safe', label: '안정', rate }
}

const defaultState = () => ({
  startDate: '2026-08-02',
  endDate: '2027-01-01',
  expenses: [
    { id: 'food', name: '식비', icon: '🍚', current: 150000, saving: 0, selected: false },
    { id: 'transport', name: '교통', icon: '🚌', current: 70000, saving: 0, selected: false },
    { id: 'shopping', name: '쇼핑', icon: '🛍️', current: 80000, saving: 0, selected: false },
  ],
  expenseApplied: false,
  incomes: [],
  policies: [],
  completedQuestIds: [],
  confirmed: false,
})
const DEFAULT_SCENARIO_MONTHS = dateRangeMonths(
  defaultState().startDate,
  defaultState().endDate,
)

const policyCatalog = [
  { id: 'youth-saving', name: '청년내일저축계좌', description: '3년 만기 시 정부지원금을 받을 수 있어요', amount: 600000, type: 'once', detail: '지원금액: 60만원 (일시)' },
  { id: 'job-seeking', name: '청년구직활동지원금', description: '구직활동 중인 청년 대상 지원금이에요', amount: 300000, type: 'monthly', months: 6, detail: '월 30만원 × 6개월' },
  { id: 'employment', name: '국민취업지원제도', description: '취업 준비 중인 청년에게 정기 지원돼요', amount: 100000, type: 'monthly', months: 6, detail: '월 10만원 × 6개월' },
]

export const useSimulationStore = defineStore('simulation', () => {
  const session = useSessionStore()
  let saved = null
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { saved = null }
  const state = reactive({ ...defaultState(), ...(saved || {}) })
  const recentAnalysis = computed(() => analyzePreviousCompletedMonths(financeTransactions.value))
  const previousMonthExpenseAnalysis = computed(() =>
    analyzePreviousCompletedMonths(financeTransactions.value, new Date(), 1),
  )

  function buildExpenseCategories(existing = state.expenses) {
    const breakdownRows = previousMonthExpenseAnalysis.value.categories.map(({ name, current }) => ({
      id: name,
      name,
      icon: CATEGORY_META[name]?.icon || CATEGORY_META.기타.icon,
      color: CATEGORY_META[name]?.color || CATEGORY_META.기타.color,
      current,
    }))
    const rows = breakdownRows.filter((item) => !NON_REDUCIBLE_EXPENSES.has(item.name)).map(({ id, name, icon, color, current }) => {
      const previous = existing.find((item) => item.id === name || item.name === name)
      return {
        id,
        name,
        icon,
        color,
        current,
        saving: Math.min(current, previous?.saving ?? 0),
        selected: previous?.selected ?? false,
      }
    })
    return {
      rows: rows.length ? rows : defaultState().expenses,
      breakdownRows: breakdownRows.length ? breakdownRows : defaultState().expenses,
      monthKeys: previousMonthExpenseAnalysis.value.monthKeys,
    }
  }

  const expenseMonths = ref([])
  const expenseBreakdown = ref([])
  function syncExpenseCategories(preserve = true) {
    const analyzed = buildExpenseCategories(preserve ? state.expenses : [])
    state.expenses = analyzed.rows
    expenseBreakdown.value = analyzed.breakdownRows
    expenseMonths.value = analyzed.monthKeys
  }

  function initializeExpensesFromAnalysis() {
    const hasSavedExpensePlan = state.expenseApplied
      || state.expenses.some((item) => item.selected || Number(item.saving) > 0)

    if (!hasSavedExpensePlan) syncExpenseCategories(false)
  }
  watch(financeTransactions, () => syncExpenseCategories(true), { deep: true, immediate: true })
  const totalAssets = ref(dashboard.totalAssets)
  const availableAssets = ref(dashboard.liquidAssets ?? dashboard.totalAssets)
  const monthlyIncome = computed(() => recentAnalysis.value.monthlyIncome)
  const monthlyExpense = computed(() => recentAnalysis.value.monthlyExpense)
  const targetMonths = computed(() => remainingMonthsUntil(session.currentUser.goalDate || session.currentUser.targetDate))
  const currentMonthlyBurn = computed(() => Math.max(1, monthlyExpense.value))
  const currentMonths = computed(() => monthlyExpense.value > 0
    ? Math.round((availableAssets.value / currentMonthlyBurn.value) * 10) / 10
    : 0)

  const selectedExpenses = computed(() => state.expenses.filter((item) => item.selected))
  const totalCurrentExpense = computed(() => expenseBreakdown.value.reduce((sum, item) => sum + item.current, 0))
  const expenseSaving = computed(() => selectedExpenses.value.reduce((sum, item) => sum + item.saving, 0))
  const recurringIncome = computed(() => state.incomes.filter((item) => item.type === 'monthly').reduce((sum, item) => sum + item.amount, 0))
  const oneTimeIncome = computed(() => state.incomes.filter((item) => item.type === 'once').reduce((sum, item) => sum + item.amount, 0))
  const recurringPolicy = computed(() => state.policies.filter((item) => item.type === 'monthly').reduce((sum, item) => sum + item.amount, 0))
  const oneTimePolicy = computed(() => state.policies.filter((item) => item.type === 'once').reduce((sum, item) => sum + item.amount, 0))
  const monthlyImprovement = computed(() => (state.expenseApplied ? expenseSaving.value : 0) + recurringIncome.value + recurringPolicy.value)
  const scenarioAssets = computed(() => availableAssets.value + oneTimeIncome.value + oneTimePolicy.value)
  const scenarioMonthlyBurn = computed(() => Math.max(1, currentMonthlyBurn.value - monthlyImprovement.value))
  const scenarioStartDate = computed(() => session.currentUser.startDate || defaultState().startDate)
  const scenarioEndDate = computed(() =>
    session.currentUser.goalDate || session.currentUser.targetDate || defaultState().endDate,
  )
  const scenarioPeriodMonths = computed(() =>
    dateRangeMonths(scenarioStartDate.value, scenarioEndDate.value),
  )
  const baseExpectedMonths = computed(() => scenarioAssets.value / scenarioMonthlyBurn.value)
  const expectedMonths = computed(() => {
    const baseIncrease = Math.max(0, baseExpectedMonths.value - currentMonths.value)
    const periodRatio = DEFAULT_SCENARIO_MONTHS > 0
      ? scenarioPeriodMonths.value / DEFAULT_SCENARIO_MONTHS
      : 0
    const adjusted = currentMonths.value + baseIncrease * periodRatio
    return Math.min(60, Math.round(adjusted * 10) / 10)
  })
  const currentStatus = computed(() => getStatus(currentMonths.value, targetMonths.value))
  const expectedStatus = computed(() => getStatus(expectedMonths.value, targetMonths.value))
  const expensePreviewMonthlyBurn = computed(() => Math.max(1, currentMonthlyBurn.value - expenseSaving.value))
  const expensePreviewMonths = computed(() => Math.min(60, Math.round((availableAssets.value / expensePreviewMonthlyBurn.value) * 10) / 10))
  const addedMonths = computed(() => Math.max(0, Math.round((expectedMonths.value - currentMonths.value) * 10) / 10))
  const completedCategories = computed(() => [
    state.expenseApplied && selectedExpenses.value.length > 0,
    state.incomes.length > 0,
    state.policies.length > 0,
  ].filter(Boolean).length)
  const hasDraft = computed(() => completedCategories.value > 0)

  watch(state, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

  function adjustExpense(id, amount) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (item) {
      item.saving = Math.max(0, Math.min(item.current, item.saving + amount))
      if (item.saving > 0) item.selected = true
      if (item.saving === 0) item.selected = false
    }
  }
  function toggleExpense(id) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (item) item.selected = !item.selected
  }
  function applyExpenses() { state.expenseApplied = true }
  function resetExpenses() {
    syncExpenseCategories(false)
    state.expenseApplied = false
    state.confirmed = false
  }
  function addIncome(payload) {
    state.incomes.push({ id: Date.now().toString(), ...payload })
  }
  function removeIncome(id) { state.incomes = state.incomes.filter((item) => item.id !== id) }
  function resetIncomes() { state.incomes = []; state.confirmed = false }
  function togglePolicy(policy) {
    const exists = state.policies.some((item) => item.id === policy.id)
    state.policies = exists ? state.policies.filter((item) => item.id !== policy.id) : [...state.policies, { ...policy }]
  }
  function removePolicy(id) { state.policies = state.policies.filter((item) => item.id !== id) }
  function resetPolicies() { state.policies = []; state.confirmed = false }
  function confirmScenario() {
    state.completedQuestIds = []
    state.confirmed = true
  }
  function toggleQuestCompletion(id) {
    const completed = new Set(state.completedQuestIds || [])
    if (completed.has(id)) completed.delete(id)
    else completed.add(id)
    state.completedQuestIds = [...completed]
  }
  function migrateRecurringQuestCompletions(ids, monthKey) {
    if (!monthKey || !Array.isArray(ids) || !ids.length) return
    const recurringIds = new Set(ids)
    let changed = false
    const migrated = (state.completedQuestIds || []).map((id) => {
      if (!recurringIds.has(id)) return id
      changed = true
      return `${id}@${monthKey}`
    })
    if (changed) state.completedQuestIds = [...new Set(migrated)]
  }
  function resetScenario() { Object.assign(state, defaultState()) }

  return {
    state, policyCatalog, totalAssets, availableAssets, monthlyIncome, monthlyExpense, targetMonths, currentMonths,
    currentStatus, expectedStatus,
    expenseMonths, expenseBreakdown, totalCurrentExpense, selectedExpenses, expenseSaving, recurringIncome,
    oneTimeIncome, recurringPolicy, oneTimePolicy, monthlyImprovement, addedMonths,
    expectedMonths, expensePreviewMonths, scenarioStartDate, scenarioEndDate,
    completedCategories, hasDraft, adjustExpense, toggleExpense,
    addIncome, removeIncome, togglePolicy, removePolicy, applyExpenses, resetExpenses,
    initializeExpensesFromAnalysis,
    resetIncomes, resetPolicies, confirmScenario, toggleQuestCompletion,
    migrateRecurringQuestCompletions, resetScenario,
  }
})
