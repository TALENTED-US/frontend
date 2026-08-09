import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { dashboard } from '@/data/mockData'
import { financeTransactions } from '@/features/finance/financeStore'
import { analyzePreviousCompletedMonths } from '@/features/finance/financeAnalytics'
import { useSessionStore } from '@/stores/session'
import {
  applySimulationItemApi,
  createSimulationApi,
  deleteSimulationItemApi,
  getCurrentSimulationApi,
  getLatestConfirmedSimulationApi,
  getSimulationItemsApi,
  getSimulationReportApi,
  updateSimulationItemApi,
  updateSimulationPeriodApi,
} from '@/api/simulation'
import {
  mapConfirmedSimulationResponse,
  mapSimulationItemResponse,
  toUpdateSimulationItemRequest,
} from '@/mappers/simulation'

const STORAGE_KEY = 'buttie-simulation-v4'
const CATEGORY_META = {
  주거: { icon: '🏠', color: '#ffe197' }, 월세: { icon: '🏠', color: '#ffe197' },
  식비: { icon: '🍚', color: '#ffd0d0' },
  교통: { icon: '🚌', color: '#aab5c8' }, 교통비: { icon: '🚌', color: '#aab5c8' }, 쇼핑: { icon: '🛍️', color: '#88a9f6' },
  통신비: { icon: '📱', color: '#d8b5ee' }, 구독: { icon: '📺', color: '#c8a8ef' }, 구독비: { icon: '📺', color: '#c8a8ef' }, 의료: { icon: '🏥', color: '#8dd5c1' },
  교육: { icon: '📚', color: '#77b6df' }, 교육비: { icon: '📚', color: '#77b6df' }, 자격증: { icon: '📄', color: '#91c7a9' }, '자격증 비용': { icon: '📄', color: '#91c7a9' }, 보험: { icon: '🛡️', color: '#91c7a9' },
  여가: { icon: '🎮', color: '#f5ae77' }, 기타: { icon: '🧾', color: '#b8bdc8' },
}
const NON_REDUCIBLE_EXPENSES = new Set(['월세', '주거'])
const REDUCTION_CATEGORIES = ['식비', '교통비', '통신비', '구독비', '교육비', '자격증 비용', '기타']
const REDUCTION_CATEGORY_ALIASES = {
  식비: '식비', 교통: '교통비', 교통비: '교통비', 통신: '통신비', 통신비: '통신비',
  구독: '구독비', 구독비: '구독비', 교육: '교육비', 교육비: '교육비',
  자격증: '자격증 비용', '자격증 비용': '자격증 비용',
}
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
  draftStarted: false,
  ignoreRemoteDraft: false,
})
const DEFAULT_SCENARIO_MONTHS = dateRangeMonths(
  defaultState().startDate,
  defaultState().endDate,
)

const policyCatalog = [
  { id: 4, name: '청년내일저축계좌', description: '근로 중인 청년의 자산 형성을 지원해요', amount: 100000, type: 'monthly', months: 12, detail: '월 10만원 × 12개월' },
  { id: 7, name: '청년 구직활동지원금', description: '구직활동 중인 청년 대상 지원금이에요', amount: 300000, type: 'monthly', months: 6, detail: '월 30만원 × 6개월' },
  { id: 2, name: '국민취업지원제도', description: '취업 준비 중인 청년에게 정기 지원돼요', amount: 500000, type: 'monthly', months: 6, detail: '월 50만원 × 6개월' },
]

export const useSimulationStore = defineStore('simulation', () => {
  const session = useSessionStore()
  let saved = null
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { saved = null }
  const state = reactive({ ...defaultState(), ...(saved || {}) })
  const remoteEnabled = import.meta.env.VITE_USE_MOCK_API !== 'true'
  const syncing = ref(false)
  const syncError = ref('')
  const remoteReport = ref(null)
  const recentConfirmed = ref(null)
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
    const totals = Object.fromEntries(REDUCTION_CATEGORIES.map((name) => [name, 0]))
    breakdownRows.filter((item) => !NON_REDUCIBLE_EXPENSES.has(item.name)).forEach((item) => {
      const category = REDUCTION_CATEGORY_ALIASES[item.name] || '기타'
      totals[category] += item.current
    })
    const rows = REDUCTION_CATEGORIES.map((name) => {
      const previous = existing.find((item) => item.id === name || item.name === name)
      const current = totals[name]
      return {
        id: name,
        name,
        icon: CATEGORY_META[name]?.icon || CATEGORY_META.기타.icon,
        color: CATEGORY_META[name]?.color || CATEGORY_META.기타.color,
        current,
        saving: Math.min(current, previous?.saving ?? 0),
        selected: current > 0 && (previous?.selected ?? false),
        remoteSynced: previous?.remoteSynced ?? false,
      }
    })
    return {
      rows,
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
  const localCurrentMonths = computed(() => monthlyExpense.value > 0
    ? Math.round((availableAssets.value / currentMonthlyBurn.value) * 10) / 10
    : 0)
  const currentMonths = computed(() => state.confirmed && recentConfirmed.value
    ? recentConfirmed.value.currentMonths
    : localCurrentMonths.value)

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
  const scenarioStartDate = computed(() => state.startDate)
  const scenarioEndDate = computed(() => state.endDate)
  const scenarioPeriodMonths = computed(() =>
    dateRangeMonths(scenarioStartDate.value, scenarioEndDate.value),
  )
  const baseExpectedMonths = computed(() => scenarioAssets.value / scenarioMonthlyBurn.value)
  const localExpectedMonths = computed(() => {
    const baseIncrease = Math.max(0, baseExpectedMonths.value - currentMonths.value)
    const periodRatio = DEFAULT_SCENARIO_MONTHS > 0
      ? scenarioPeriodMonths.value / DEFAULT_SCENARIO_MONTHS
      : 0
    const adjusted = currentMonths.value + baseIncrease * periodRatio
    return Math.min(60, Math.round(adjusted * 10) / 10)
  })
  const expectedMonths = computed(() => state.confirmed && recentConfirmed.value
    ? recentConfirmed.value.expectedMonths
    : localExpectedMonths.value)
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
  const hasDraft = computed(() => state.draftStarted || completedCategories.value > 0)

  watch(state, (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true })

  function adjustExpense(id, amount) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (item) {
      item.saving = Math.max(0, Math.min(item.current, item.saving + amount))
      if (item.saving > 0) item.selected = true
      if (item.saving === 0) item.selected = false
      item.remoteSynced = false
    }
  }
  function setExpenseSaving(id, amount) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (!item) return
    item.saving = Math.max(0, Math.min(item.current, Number(amount) || 0))
    item.selected = item.saving > 0
    item.remoteSynced = false
  }
  function toggleExpense(id) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (item) { item.selected = !item.selected; item.remoteSynced = false }
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
  function updateIncome(id, payload) {
    const index = state.incomes.findIndex((item) => item.id === id)
    if (index < 0) return
    state.incomes[index] = { ...state.incomes[index], ...payload, remoteSynced: false }
    state.confirmed = false
  }
  function removeIncome(id) { state.incomes = state.incomes.filter((item) => item.id !== id) }
  function resetIncomes() { state.incomes = []; state.confirmed = false }
  function togglePolicy(policy) {
    const exists = state.policies.some((item) => item.id === policy.id)
    state.policies = exists ? state.policies.filter((item) => item.id !== policy.id) : [...state.policies, { ...policy }]
  }
  function removePolicy(id) { state.policies = state.policies.filter((item) => item.id !== id) }
  function resetPolicies() { state.policies = []; state.confirmed = false }

  async function runItemMutation(request, onSuccess) {
    syncing.value = true
    syncError.value = ''
    try {
      const result = await request()
      onSuccess(result)
      state.confirmed = false
      return true
    } catch (error) {
      syncError.value = error.message
      return false
    } finally {
      syncing.value = false
    }
  }

  async function saveExpenseGoal(id, amount) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (!item) return false
    const saving = Math.max(0, Math.min(item.current, Number(amount) || 0))
    if (!remoteEnabled || !item.remoteId) { setExpenseSaving(id, saving); return true }

    return runItemMutation(
      () => updateSimulationItemApi(item.remoteId, toUpdateSimulationItemRequest({
        amount: saving, type: 'monthly', startDate: state.startDate, endDate: state.endDate,
      })),
      (updated) => {
        item.saving = Number(updated?.amount) || saving
        item.selected = item.saving > 0
        item.remoteSynced = true
        item.remoteId = updated?.itemId || item.remoteId
      },
    )
  }

  async function deleteExpenseGoal(id) {
    const item = state.expenses.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) { setExpenseSaving(id, 0); return true }
    return runItemMutation(
      () => deleteSimulationItemApi(item.remoteId),
      () => Object.assign(item, { saving: 0, selected: false, remoteSynced: false, remoteId: undefined }),
    )
  }

  async function saveIncomePlan(id, payload) {
    const item = state.incomes.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) { updateIncome(id, payload); return true }
    return runItemMutation(
      () => updateSimulationItemApi(item.remoteId, toUpdateSimulationItemRequest({
        ...payload, endDate: payload.type === 'monthly' ? state.endDate : payload.startDate,
      })),
      (updated) => Object.assign(item, payload, {
        amount: Number(updated?.amount) || payload.amount,
        remoteId: updated?.itemId || item.remoteId,
        remoteSynced: true,
      }),
    )
  }

  async function deleteIncomePlan(id) {
    const item = state.incomes.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) { removeIncome(id); return true }
    return runItemMutation(() => deleteSimulationItemApi(item.remoteId), () => removeIncome(id))
  }

  async function deletePolicyPlan(id) {
    const item = state.policies.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) { removePolicy(id); return true }
    return runItemMutation(() => deleteSimulationItemApi(item.remoteId), () => removePolicy(id))
  }
  function confirmScenario() {
    state.completedQuestIds = []
    state.confirmed = true
    state.draftStarted = false
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
  function resetScenario() { Object.assign(state, defaultState()); recentConfirmed.value = null }

  function prepareNewScenario() {
    state.expenses = state.expenses.map((item) => ({
      ...item,
      saving: 0,
      selected: false,
      remoteSynced: false,
      remoteId: undefined,
    }))
    state.expenseApplied = false
    state.incomes = []
    state.policies = []
    state.completedQuestIds = []
    state.confirmed = false
    state.draftStarted = true
    state.ignoreRemoteDraft = true
    remoteReport.value = null
    recentConfirmed.value = null
    syncError.value = ''
  }

  function applyRemoteSimulation(data) {
    if (!data) return
    if (data.simulationStartDate) state.startDate = data.simulationStartDate
    if (data.simulationDueDate) state.endDate = data.simulationDueDate
  }

  async function hydrateDraft() {
    if (!remoteEnabled) return null
    syncing.value = true
    syncError.value = ''
    try {
      const data = await getCurrentSimulationApi()
      applyRemoteSimulation(data)
      return data
    } catch (error) {
      if (error.status !== 404) syncError.value = error.message
      return null
    } finally {
      syncing.value = false
    }
  }

  async function hydrateConfirmed() {
    if (!remoteEnabled || state.ignoreRemoteDraft) return null
    syncing.value = true
    syncError.value = ''
    try {
      const confirmed = mapConfirmedSimulationResponse(
        await getLatestConfirmedSimulationApi(),
        policyCatalog,
      )
      if (!confirmed) return null

      recentConfirmed.value = confirmed
      state.startDate = confirmed.startDate || state.startDate
      state.endDate = confirmed.endDate || state.endDate
      state.expenses = state.expenses.map((item) => {
        const remoteItem = confirmed.expenses.find((entry) => entry.name === item.name)
        return remoteItem
          ? { ...item, saving: Math.min(item.current, remoteItem.saving), selected: remoteItem.saving > 0, remoteId: remoteItem.remoteId, remoteSynced: true }
          : { ...item, saving: 0, selected: false, remoteId: undefined, remoteSynced: false }
      })
      state.incomes = confirmed.incomes
      state.policies = confirmed.policies
      state.expenseApplied = confirmed.expenses.length > 0
      state.confirmed = true
      state.draftStarted = false
      state.ignoreRemoteDraft = false
      return confirmed
    } catch (error) {
      if (error.status === 404) { recentConfirmed.value = null; state.confirmed = false }
      else syncError.value = error.message
      return null
    } finally {
      syncing.value = false
    }
  }

  async function beginSimulation() {
    if (!remoteEnabled) return true
    syncing.value = true
    syncError.value = ''
    const payload = { simulationStartDate: state.startDate, simulationDueDate: state.endDate }
    try {
      const data = await createSimulationApi(payload)
      applyRemoteSimulation(data)
      return true
    } catch (createError) {
      try {
        await updateSimulationPeriodApi(payload)
        return true
      } catch (updateError) {
        syncError.value = updateError.message || createError.message
        return true
      }
    } finally {
      syncing.value = false
    }
  }

  async function savePeriod(startDate, endDate) {
    state.startDate = startDate
    state.endDate = endDate
    if (!remoteEnabled) return true
    try {
      await updateSimulationPeriodApi({
        simulationStartDate: startDate,
        simulationDueDate: endDate,
      })
      return true
    } catch (error) {
      syncError.value = error.message
      return false
    }
  }

  const expenseCategoryMap = {
    식비: 'FOOD', 교통: 'TRANSPORT', 교통비: 'TRANSPORT', 주거: 'HOUSING', 월세: 'HOUSING',
    통신비: 'COMMUNICATION', 구독: 'SUBSCRIPTION', 구독비: 'SUBSCRIPTION', 교육: 'EDUCATION', 교육비: 'EDUCATION',
    자격증: 'CERTIFICATE', '자격증 비용': 'CERTIFICATE',
  }

  async function syncCategory(category) {
    if (!remoteEnabled) return true
    syncing.value = true
    syncError.value = ''
    try {
      const pendingItems = category === 'expense'
        ? selectedExpenses.value.filter((item) => !item.remoteSynced).map((item) => ({ item, payload: {
            category: 'EXPENSE', itemName: `${item.name} 줄이기`,
            expenseCategory: expenseCategoryMap[item.name] || 'ETC_EXPENSE', amount: item.saving,
            applyStartDate: state.startDate, applyEndDate: state.endDate, recurrenceType: 'MONTHLY',
          } }))
        : category === 'income'
          ? state.incomes.filter((item) => !item.remoteSynced).map((item) => ({ item, payload: {
              category: 'INCOME', itemName: item.name, amount: item.amount, expenseCategory: null,
              applyStartDate: item.startDate || state.startDate,
              applyEndDate: item.type === 'once' ? null : state.endDate,
              recurrenceType: item.type === 'once' ? 'ONCE' : 'MONTHLY', policyId: null,
            } }))
          : state.policies.filter((item) => !item.remoteSynced && Number.isInteger(Number(item.id))).map((item) => ({ item, payload: {
              category: 'POLICY', policyId: Number(item.id), applyStartDate: state.startDate,
              itemName: null, amount: null, expenseCategory: null, applyEndDate: null, recurrenceType: null,
            } }))

      const results = await Promise.all(pendingItems.map(({ payload }) => applySimulationItemApi(payload)))
      pendingItems.forEach(({ item }, index) => {
        item.remoteId = results[index]?.itemId || item.remoteId
        item.remoteSynced = true
      })
      const serverReport = await getSimulationReportApi()
      remoteReport.value = state.ignoreRemoteDraft ? null : serverReport
      return true
    } catch (error) {
      syncError.value = error.message
      return false
    } finally {
      syncing.value = false
    }
  }

  async function refreshCategory(category) {
    if (!remoteEnabled) return []
    try {
      const data = await getSimulationItemsApi(category.toUpperCase())
      return data?.appliedItems || []
    } catch (error) {
      syncError.value = error.message
      return []
    }
  }

  async function hydrateCategory(category) {
    if (state.ignoreRemoteDraft) return []
    const items = await refreshCategory(category)
    const mappedItems = items.map((item) => mapSimulationItemResponse(item, policyCatalog)).filter(Boolean)
    if (category === 'expense') {
      state.expenses = state.expenses.map((item) => {
        const remoteItem = mappedItems.find((entry) => entry.name === item.name)
        return remoteItem
          ? { ...item, saving: Math.min(item.current, remoteItem.saving), selected: remoteItem.saving > 0, remoteSynced: true, remoteId: remoteItem.remoteId }
          : item
      })
      state.expenseApplied = state.expenses.some((item) => item.selected)
    } else if (category === 'income') state.incomes = mappedItems.filter((item) => item.kind === 'income')
    else if (category === 'policy') state.policies = mappedItems.filter((item) => item.kind === 'policy')
    return items
  }

  return {
    state, policyCatalog, totalAssets, availableAssets, monthlyIncome, monthlyExpense, targetMonths, currentMonths,
    currentStatus, expectedStatus,
    expenseMonths, expenseBreakdown, totalCurrentExpense, selectedExpenses, expenseSaving, recurringIncome,
    oneTimeIncome, recurringPolicy, oneTimePolicy, monthlyImprovement, addedMonths,
    expectedMonths, expensePreviewMonths, scenarioStartDate, scenarioEndDate,
    completedCategories, hasDraft, syncing, syncError, remoteReport, recentConfirmed,
    adjustExpense, setExpenseSaving, toggleExpense,
    addIncome, updateIncome, removeIncome, togglePolicy, removePolicy, applyExpenses, resetExpenses,
    saveExpenseGoal, deleteExpenseGoal, saveIncomePlan, deleteIncomePlan, deletePolicyPlan,
    initializeExpensesFromAnalysis,
    resetIncomes, resetPolicies, confirmScenario, toggleQuestCompletion,
    migrateRecurringQuestCompletions, resetScenario, prepareNewScenario,
    hydrateDraft, hydrateConfirmed, beginSimulation, savePeriod,
    syncCategory, refreshCategory, hydrateCategory,
  }
})
