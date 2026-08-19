import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { dashboard } from '@/data/mockData'
import {
  financeState,
  financeTransactions,
  loadTransactions,
} from '@/features/finance/financeStore'
import { analyzePreviousCompletedMonths } from '@/features/finance/financeAnalytics'
import { useSessionStore } from '@/stores/session'
import {
  applySimulationItemApi,
  confirmSimulationApi,
  createSimulationApi,
  deleteConfirmedSimulationApi,
  deleteDraftSimulationApi,
  deleteSimulationItemApi,
  getCurrentSimulationApi,
  getLatestConfirmedSimulationApi,
  getSimulationItemsApi,
  getSimulationReportApi,
  revertConfirmedSimulationApi,
  updateSimulationItemApi,
  updateSimulationPeriodApi,
} from '@/api/simulation'
import {
  mapConfirmedSimulationResponse,
  mapSimulationItemResponse,
  toUpdateSimulationItemRequest,
} from '@/mappers/simulation'
import { getPoliciesApi } from '@/api/policy'
import { getButtieDashboardApi } from '@/api/dashboard'
import { getMyDataAssetsApi } from '@/api/mydata'
import { calculateAge, mapPolicyPage, normalizePolicyRegion } from '@/mappers/policy'
import {
  EXPENSE_CATEGORY_LABELS,
  expenseCategoryLabel,
  expenseCategoryValue,
} from '@/constants/expenseCategories'
import { isInfinitePrepMonths } from '@/utils/prepMonths'

const STORAGE_KEY = 'buttie-simulation-v4'
const CONFIRMED_SNAPSHOT_KEY = 'buttie-simulation-confirmed-snapshot-v1'
const CLIENT_CALCULATION_VERSION = 2
const REMOTE_LOOKUP_CACHE_MS = 4000
const CATEGORY_META = {
  식비: { icon: '🍚', color: '#ffd0d0' },
  '술·유흥': { icon: '🍻', color: '#e9b8a8' },
  '카페·간식': { icon: '☕', color: '#e8c89a' },
  '취업 준비': { icon: '📚', color: '#77b6df' },
  쇼핑: { icon: '🛍️', color: '#88a9f6' },
  '취미·여가': { icon: '🎮', color: '#c8a8ef' },
  '주거·통신': { icon: '🏠', color: '#ffe197' },
  '교통·유류비': { icon: '🚌', color: '#aab5c8' },
  '의료·건강': { icon: '🏥', color: '#8dd5c1' },
  '기타 금융': { icon: '🧾', color: '#b8bdc8' },
}
const EXPENSE_TARGET_CATEGORY_NAMES = Object.entries(EXPENSE_CATEGORY_LABELS)
  .filter(([category]) => category !== 'HOUSING_COMMUNICATION')
  .map(([, name]) => name)
const DAYS_PER_MONTH = 365.2425 / 12

function finiteNumberOrNull(value) {
  const number = Number(value)
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null
}

function dateRangeMonths(startValue, endValue) {
  const startParts = String(startValue || '')
    .split('-')
    .map(Number)
  const endParts = String(endValue || '')
    .split('-')
    .map(Number)
  if (
    startParts.length !== 3 ||
    endParts.length !== 3 ||
    startParts.some((part) => !part) ||
    endParts.some((part) => !part)
  )
    return 0

  const start = Date.UTC(startParts[0], startParts[1] - 1, startParts[2])
  const end = Date.UTC(endParts[0], endParts[1] - 1, endParts[2])
  return Math.max(0, (end - start) / (24 * 60 * 60 * 1000) / DAYS_PER_MONTH)
}

function remainingMonthsUntil(value) {
  const parts = String(value || '')
    .replaceAll('.', '-')
    .split('-')
    .map(Number)
  if (parts.length < 3 || parts.some((part) => !part)) return dashboard.targetMonths
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(parts[0], parts[1] - 1, parts[2])
  return Math.max(0, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000) / (365.2425 / 12))
}

function getStatus(months, targetMonths) {
  const rate =
    targetMonths > 0 ? Math.min(100, Math.max(0, Math.round((months / targetMonths) * 100))) : 100
  if (rate <= 30) return { key: 'danger', label: '위험', rate }
  if (rate < 80) return { key: 'caution', label: '주의', rate }
  return { key: 'safe', label: '안정', rate }
}

function getApiRiskStatus(riskLevel) {
  if (riskLevel === 'DANGER') return { key: 'danger', label: '위험' }
  if (riskLevel === 'CAUTION') return { key: 'caution', label: '주의' }
  if (riskLevel === 'STABLE') return { key: 'safe', label: '안정' }
  return { key: 'unknown', label: '확인 불가' }
}

function getApiSustainableStatus(value) {
  if (value === true) return { key: 'safe', label: '안정' }
  if (value === false) return { key: 'danger', label: '위험' }
  return { key: 'unknown', label: '확인 불가' }
}

const defaultState = () => ({
  startDate: '2026-08-02',
  endDate: '2027-01-01',
  expenses: [
    { id: 'food', name: '식비', icon: '🍚', current: 150000, saving: 0, selected: false },
    {
      id: 'transport',
      name: '교통·유류비',
      icon: '🚌',
      current: 70000,
      saving: 0,
      selected: false,
    },
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
const DEFAULT_SCENARIO_MONTHS = dateRangeMonths(defaultState().startDate, defaultState().endDate)

export const useSimulationStore = defineStore('simulation', () => {
  const session = useSessionStore()
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    saved = null
  }
  const state = reactive({ ...defaultState(), ...(saved || {}) })
  const remoteEnabled = import.meta.env.VITE_USE_MOCK_API !== 'true'
  const syncing = ref(false)
  const syncError = ref('')
  const remoteReport = ref(null)
  const remoteSimulation = ref(null)
  const runwayBaseline = ref(null)
  const currentFinancialAssets = ref(null)
  const financialSnapshotLoading = ref(false)
  const financialSnapshotError = ref('')
  const runwayBaselineError = ref('')
  const recentConfirmed = ref(null)
  const remoteDraftExists = ref(null)
  const policyCatalog = ref([])
  const policyCatalogLoading = ref(false)
  const policyCatalogError = ref('')
  const aiPlanPrompt = ref('')
  const aiPlanRecommendations = ref(null)
  const policyCatalogPageInfo = ref({
    page: 1,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  })
  const financialDataReady = computed(() => financeState.loaded && !financeState.loading)
  const previousMonthExpenseAnalysis = computed(() =>
    analyzePreviousCompletedMonths(financeTransactions.value, new Date(), 1),
  )
  let runwayBaselineRequest = null
  let financialSnapshotRequest = null
  let draftHydrationRequest = null
  let confirmedHydrationRequest = null
  let reportHydrationRequest = null
  let policyCatalogParams = null
  let policyCatalogRequestId = 0
  const policyCatalogPageSize = 10
  const policyStatusCache = {
    AVAILABLE: { totalElements: null, pages: new Map() },
    CLOSED: { totalElements: null, pages: new Map() },
  }
  let policyStatusInitializationRequest = null
  let draftHydratedAt = 0
  let confirmedHydratedAt = 0
  let reportHydratedAt = 0
  let cachedDraft = null
  let cachedConfirmed = null

  const isRecentLookup = (checkedAt) =>
    checkedAt > 0 && Date.now() - checkedAt < REMOTE_LOOKUP_CACHE_MS

  function invalidateRemoteLookups({ draft = true, confirmed = true, report = true } = {}) {
    if (draft) {
      draftHydratedAt = 0
      cachedDraft = null
    }
    if (confirmed) {
      confirmedHydratedAt = 0
      cachedConfirmed = null
    }
    if (report) reportHydratedAt = 0
  }

  async function hydrateFinancialSnapshot(force = false) {
    if (!remoteEnabled) return null
    if (!force && financialSnapshotRequest) return financialSnapshotRequest

    financialSnapshotLoading.value = true
    financialSnapshotError.value = ''
    financialSnapshotRequest = Promise.allSettled([getMyDataAssetsApi(), loadTransactions(force)])
      .then(([assetsResult, transactionsResult]) => {
        const errors = []
        if (assetsResult.status === 'fulfilled') {
          const accounts = Array.isArray(assetsResult.value?.accounts)
            ? assetsResult.value.accounts
            : []
          currentFinancialAssets.value = accounts
            .filter((account) => account.isConsent !== false)
            .reduce((sum, account) => sum + (finiteNumberOrNull(account.balance) ?? 0), 0)
        } else {
          currentFinancialAssets.value = null
          errors.push(assetsResult.reason?.message || '총자산을 불러오지 못했습니다.')
        }

        if (transactionsResult.status === 'rejected') {
          errors.push(transactionsResult.reason?.message || '거래 내역을 불러오지 못했습니다.')
        }

        financialSnapshotError.value = [...new Set(errors)].join(' ')
        return currentFinancialAssets.value
      })
      .finally(() => {
        financialSnapshotLoading.value = false
        financialSnapshotRequest = null
      })
    return financialSnapshotRequest
  }

  async function hydrateRunwayBaseline(force = false) {
    if (!remoteEnabled) return null
    if (!force && runwayBaseline.value) return runwayBaseline.value
    if (runwayBaselineRequest) return runwayBaselineRequest

    runwayBaselineError.value = ''
    runwayBaselineRequest = getButtieDashboardApi()
      .then((data) => {
        runwayBaseline.value = data
        return data
      })
      .catch((error) => {
        runwayBaseline.value = null
        runwayBaselineError.value = error.message || '버티는 기간을 불러오지 못했습니다.'
        return null
      })
      .finally(() => {
        runwayBaselineRequest = null
      })
    return runwayBaselineRequest
  }

  function currentUserKey() {
    return String(session.currentUser.email || '')
      .trim()
      .toLowerCase()
  }

  function clearConfirmedSnapshot() {
    recentConfirmed.value = null
    sessionStorage.removeItem(CONFIRMED_SNAPSHOT_KEY)
  }

  function persistConfirmedSnapshot(snapshot) {
    const userKey = currentUserKey()
    if (!userKey) return
    sessionStorage.setItem(CONFIRMED_SNAPSHOT_KEY, JSON.stringify({ userKey, snapshot }))
  }

  function restoreConfirmedSnapshot() {
    let savedSnapshot = null
    try {
      savedSnapshot = JSON.parse(sessionStorage.getItem(CONFIRMED_SNAPSHOT_KEY) || 'null')
    } catch {
      clearConfirmedSnapshot()
      return null
    }

    const userKey = currentUserKey()
    if (!savedSnapshot?.snapshot || !userKey || savedSnapshot.userKey !== userKey) {
      if (savedSnapshot && userKey && savedSnapshot.userKey !== userKey) clearConfirmedSnapshot()
      return null
    }

    if (savedSnapshot.snapshot.clientCalculationVersion !== CLIENT_CALCULATION_VERSION) {
      clearConfirmedSnapshot()
      return null
    }

    recentConfirmed.value = savedSnapshot.snapshot
    return recentConfirmed.value
  }

  function buildExpenseCategories(existing = state.expenses) {
    const groupedBreakdown = new Map()
    previousMonthExpenseAnalysis.value.categories.forEach(({ name, current }) => {
      const normalizedName = expenseCategoryLabel(expenseCategoryValue(name))
      const previous = groupedBreakdown.get(normalizedName)
      if (previous) previous.current += current
      else
        groupedBreakdown.set(normalizedName, {
          id: normalizedName,
          name: normalizedName,
          icon: CATEGORY_META[normalizedName]?.icon || CATEGORY_META['기타 금융'].icon,
          color: CATEGORY_META[normalizedName]?.color || CATEGORY_META['기타 금융'].color,
          current,
        })
    })
    const breakdownRows = groupedBreakdown.size
      ? [...groupedBreakdown.values()]
      : defaultState().expenses
    const rows = EXPENSE_TARGET_CATEGORY_NAMES.map((name) => {
      const current = groupedBreakdown.get(name)?.current || 0
      const previous = existing.find(
        (item) => expenseCategoryLabel(expenseCategoryValue(item.name)) === name,
      )
      return {
        id: name,
        name,
        icon: CATEGORY_META[name]?.icon || CATEGORY_META['기타 금융'].icon,
        color: CATEGORY_META[name]?.color || CATEGORY_META['기타 금융'].color,
        current,
        saving: Math.min(current, previous?.saving ?? 0),
        selected: current > 0 && (previous?.selected ?? false),
        remoteSynced: previous?.remoteSynced ?? false,
      }
    })
    return {
      rows,
      breakdownRows,
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
    const hasSavedExpensePlan =
      state.expenseApplied ||
      state.expenses.some((item) => item.selected || Number(item.saving) > 0)

    if (!hasSavedExpensePlan) syncExpenseCategories(false)
  }
  watch(financeTransactions, () => syncExpenseCategories(true), { deep: true, immediate: true })
  const firstRemoteProjection = computed(
    () => remoteSimulation.value?.monthlyProjections?.[0] || null,
  )
  const reportOpeningBalance = computed(() => {
    const firstBalance = remoteReport.value?.monthlyBalances?.[0]
    const cashflow = remoteReport.value?.cashflow
    const closingBalance = finiteNumberOrNull(firstBalance?.beforeClosingBalance)
    const income = finiteNumberOrNull(cashflow?.beforeMonthlyIncome)
    const expense = finiteNumberOrNull(cashflow?.beforeMonthlyExpense)
    return closingBalance === null || income === null || expense === null
      ? null
      : closingBalance - income + expense
  })
  const totalAssets = computed(() =>
    remoteEnabled
      ? (finiteNumberOrNull(firstRemoteProjection.value?.openingBalance) ??
        reportOpeningBalance.value ??
        finiteNumberOrNull(currentFinancialAssets.value))
      : dashboard.totalAssets,
  )
  const availableAssets = computed(() =>
    remoteEnabled ? totalAssets.value : (dashboard.liquidAssets ?? dashboard.totalAssets),
  )
  const monthlyIncome = computed(() =>
    remoteEnabled
      ? (finiteNumberOrNull(remoteReport.value?.cashflow?.beforeMonthlyIncome) ??
        finiteNumberOrNull(firstRemoteProjection.value?.expectedIncome))
      : recentAnalysis.value.monthlyIncome,
  )
  const monthlyExpense = computed(() =>
    remoteEnabled
      ? (finiteNumberOrNull(remoteReport.value?.cashflow?.beforeMonthlyExpense) ??
        finiteNumberOrNull(firstRemoteProjection.value?.expectedExpense))
      : recentAnalysis.value.monthlyExpense,
  )
  const targetMonths = computed(() =>
    remainingMonthsUntil(session.currentUser.goalDate || session.currentUser.targetDate),
  )
  const currentMonthlyBurn = computed(() => Math.max(1, monthlyExpense.value || 0))
  const localCurrentMonths = computed(() =>
    runwayCalculationReady.value
      ? Math.round((availableAssets.value / currentMonthlyBurn.value) * 10) / 10
      : null,
  )
  // 실 API 모드는 확정 결과, 보고서, 미확정 시뮬레이션 순으로 서버 계산값을 사용한다.
  const remoteCurrentMonths = computed(
    () =>
      finiteNumberOrNull(state.confirmed ? recentConfirmed.value?.currentMonths : null) ??
      finiteNumberOrNull(remoteReport.value?.currentPrepMonths) ??
      finiteNumberOrNull(remoteSimulation.value?.currentPrepMonths) ??
      finiteNumberOrNull(runwayBaseline.value?.currentPrepMonths),
  )
  const currentMonths = computed(() =>
    remoteEnabled ? remoteCurrentMonths.value : localCurrentMonths.value,
  )

  const selectedExpenses = computed(() => state.expenses.filter((item) => item.selected))
  const totalCurrentExpense = computed(() =>
    expenseBreakdown.value.reduce((sum, item) => sum + item.current, 0),
  )
  const expenseSaving = computed(() =>
    selectedExpenses.value.reduce((sum, item) => sum + item.saving, 0),
  )
  const recurringIncome = computed(() =>
    state.incomes
      .filter((item) => item.type === 'monthly')
      .reduce((sum, item) => sum + item.amount, 0),
  )
  const oneTimeIncome = computed(() =>
    state.incomes
      .filter((item) => item.type === 'once')
      .reduce((sum, item) => sum + item.amount, 0),
  )
  const recurringPolicy = computed(() =>
    state.policies
      .filter((item) => item.type === 'monthly')
      .reduce((sum, item) => sum + item.amount, 0),
  )
  const oneTimePolicy = computed(() =>
    state.policies
      .filter((item) => item.type === 'once')
      .reduce((sum, item) => sum + item.amount, 0),
  )
  const monthlyImprovement = computed(
    () =>
      (state.expenseApplied ? expenseSaving.value : 0) +
      recurringIncome.value +
      recurringPolicy.value,
  )
  const scenarioAssets = computed(
    () => availableAssets.value + oneTimeIncome.value + oneTimePolicy.value,
  )
  const scenarioMonthlyBurn = computed(() =>
    Math.max(1, currentMonthlyBurn.value - monthlyImprovement.value),
  )
  const scenarioStartDate = computed(() => state.startDate)
  const scenarioEndDate = computed(() => state.endDate)
  const scenarioPeriodMonths = computed(() =>
    dateRangeMonths(scenarioStartDate.value, scenarioEndDate.value),
  )
  const baseExpectedMonths = computed(() => scenarioAssets.value / scenarioMonthlyBurn.value)
  const localExpectedMonths = computed(() => {
    if (!runwayCalculationReady.value) return null
    const baseIncrease = Math.max(0, baseExpectedMonths.value - currentMonths.value)
    const periodRatio =
      DEFAULT_SCENARIO_MONTHS > 0 ? scenarioPeriodMonths.value / DEFAULT_SCENARIO_MONTHS : 0
    const adjusted = currentMonths.value + baseIncrease * periodRatio
    return Math.min(60, Math.round(adjusted * 10) / 10)
  })
  // 수정 중에는 보고서/미확정 시뮬레이션 값, 확정 후에는 확정 응답 값을 사용한다.
  const remoteExpectedMonths = computed(
    () =>
      finiteNumberOrNull(state.confirmed ? recentConfirmed.value?.expectedMonths : null) ??
      finiteNumberOrNull(remoteReport.value?.expectPrepMonths) ??
      finiteNumberOrNull(remoteSimulation.value?.expectPrepMonths),
  )
  const expectedMonths = computed(() =>
    remoteEnabled ? remoteExpectedMonths.value : localExpectedMonths.value,
  )
  const runwayCalculationReady = computed(() =>
    remoteEnabled
      ? finiteNumberOrNull(currentMonths.value) !== null &&
        finiteNumberOrNull(expectedMonths.value) !== null
      : financialDataReady.value && monthlyExpense.value > 0,
  )
  const currentStatus = computed(() =>
    remoteEnabled
      ? session.currentUser.riskLevel
        ? getApiRiskStatus(session.currentUser.riskLevel)
        : getApiSustainableStatus(
            remoteReport.value?.currentSustainable ?? recentConfirmed.value?.currentSustainable,
          )
      : getStatus(currentMonths.value, targetMonths.value),
  )
  const expectedStatus = computed(() =>
    remoteEnabled
      ? getApiSustainableStatus(
          remoteReport.value?.expectSustainable ?? recentConfirmed.value?.expectSustainable,
        )
      : getStatus(expectedMonths.value, targetMonths.value),
  )
  const reportCashflow = computed(() => {
    const cashflow = remoteReport.value?.cashflow
    if (!cashflow) return null
    const mapped = {
      beforeMonthlyIncome: finiteNumberOrNull(cashflow.beforeMonthlyIncome),
      afterMonthlyIncome: finiteNumberOrNull(cashflow.afterMonthlyIncome),
      beforeMonthlyExpense: finiteNumberOrNull(cashflow.beforeMonthlyExpense),
      afterMonthlyExpense: finiteNumberOrNull(cashflow.afterMonthlyExpense),
      beforeMonthlyNetCashFlow: finiteNumberOrNull(cashflow.beforeMonthlyNetCashFlow),
      afterMonthlyNetCashFlow: finiteNumberOrNull(cashflow.afterMonthlyNetCashFlow),
      incomeDelta: finiteNumberOrNull(cashflow.incomeDelta),
      expenseDelta: finiteNumberOrNull(cashflow.expenseDelta),
      netCashFlowDelta: finiteNumberOrNull(cashflow.netCashFlowDelta),
    }
    return Object.values(mapped).some((value) => value !== null) ? mapped : null
  })
  const expensePreviewMonthlyBurn = computed(() =>
    Math.max(1, currentMonthlyBurn.value - expenseSaving.value),
  )
  const expensePreviewMonths = computed(() =>
    remoteEnabled
      ? expectedMonths.value
      : Math.min(
          60,
          Math.round((availableAssets.value / expensePreviewMonthlyBurn.value) * 10) / 10,
        ),
  )
  const addedMonths = computed(() => {
    if (currentMonths.value === null || expectedMonths.value === null) return 0
    if (isInfinitePrepMonths(expectedMonths.value)) return expectedMonths.value
    return Math.max(0, Math.round((expectedMonths.value - currentMonths.value) * 10) / 10)
  })
  const completedCategories = computed(
    () =>
      [
        state.expenseApplied && selectedExpenses.value.length > 0,
        state.incomes.length > 0,
        state.policies.length > 0,
      ].filter(Boolean).length,
  )
  const hasDraft = computed(() => state.draftStarted || completedCategories.value > 0)

  function buildClientConfirmedSnapshot(identity = {}) {
    if (remoteEnabled) return null
    if (!runwayCalculationReady.value) return null

    return {
      clientCalculationVersion: CLIENT_CALCULATION_VERSION,
      simulationId: identity.simulationId || '',
      confirmedAt: identity.confirmedAt || '',
      startDate: state.startDate,
      endDate: state.endDate,
      currentMonths: Number(currentMonths.value) || 0,
      expectedMonths: Number(expectedMonths.value) || 0,
      endAmount: Number(identity.endAmount) || 0,
      expenses: selectedExpenses.value.map((item) => ({ ...item })),
      incomes: state.incomes.map((item) => ({ ...item })),
      policies: state.policies.map((item) => ({ ...item })),
      // 서버 projection은 확정 전 미리보기와 계산 기준이 달라질 수 있어
      // 동일한 프론트 계산값으로 그리는 fallback 타임라인을 사용한다.
      monthlyProjections: [],
    }
  }

  function applyConfirmedItems(confirmed) {
    state.startDate = confirmed.startDate || state.startDate
    state.endDate = confirmed.endDate || state.endDate
    state.expenses = state.expenses.map((item) => {
      const remoteItem = confirmed.expenses.find((entry) => entry.name === item.name)
      return remoteItem
        ? {
            ...item,
            saving: Math.max(0, Number(remoteItem.saving) || 0),
            selected: Number(remoteItem.saving) > 0,
            remoteId: remoteItem.remoteId,
            remoteSynced: true,
          }
        : { ...item, saving: 0, selected: false, remoteId: undefined, remoteSynced: false }
    })
    state.incomes = confirmed.incomes.map((item) => ({ ...item }))
    state.policies = confirmed.policies.map((item) => ({ ...item }))
    state.expenseApplied = confirmed.expenses.length > 0
  }

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
    if (item) {
      item.selected = !item.selected
      item.remoteSynced = false
    }
  }
  function applyExpenses() {
    state.expenseApplied = true
  }
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
  function removeIncome(id) {
    state.incomes = state.incomes.filter((item) => item.id !== id)
  }
  function resetIncomes() {
    state.incomes = []
    state.confirmed = false
  }
  function togglePolicy(policy) {
    const exists = state.policies.some((item) => item.id === policy.id)
    state.policies = exists
      ? state.policies.filter((item) => item.id !== policy.id)
      : [...state.policies, { ...policy }]
  }
  function removePolicy(id) {
    state.policies = state.policies.filter((item) => item.id !== id)
  }
  function resetPolicies() {
    state.policies = []
    state.confirmed = false
  }

  function reconcileSelectedPolicies(catalog) {
    state.policies = state.policies.map((selected) => {
      const current = catalog.find((item) => item.id === selected.id)
      const byName = catalog.find((item) => item.name === selected.name)
      const matched = current || byName
      return matched
        ? {
            ...matched,
            remoteId: selected.remoteId,
            remoteSynced: Boolean(selected.remoteId && selected.remoteSynced),
          }
        : selected
    })
  }

  async function fetchPolicyCatalogPage(params, page) {
    return mapPolicyPage(await getPoliciesApi({ ...params, page, size: policyCatalogPageSize }))
  }

  async function initializeAllPolicyStatuses() {
    if (policyStatusInitializationRequest) return policyStatusInitializationRequest

    policyStatusInitializationRequest = Promise.all(
      Object.entries(policyStatusCache).map(async ([policyStatus, cache]) => {
        if (cache.totalElements !== null) return
        const result = await fetchPolicyCatalogPage({ policyStatus }, 1)
        cache.totalElements = result.totalElements
        cache.pages.set(1, result.content)
      }),
    ).catch((error) => {
      policyStatusInitializationRequest = null
      throw error
    })

    return policyStatusInitializationRequest
  }

  async function loadPolicyStatusRange(policyStatus, offset, length) {
    if (length <= 0) return []

    const cache = policyStatusCache[policyStatus]
    const firstPage = Math.floor(offset / policyCatalogPageSize) + 1
    const lastPage = Math.floor((offset + length - 1) / policyCatalogPageSize) + 1
    const missingPages = []

    for (let page = firstPage; page <= lastPage; page += 1) {
      if (!cache.pages.has(page)) missingPages.push(page)
    }

    await Promise.all(
      missingPages.map(async (page) => {
        const result = await fetchPolicyCatalogPage({ policyStatus }, page)
        cache.pages.set(page, result.content)
      }),
    )

    return Array.from({ length }, (_, index) => {
      const absoluteIndex = offset + index
      const page = Math.floor(absoluteIndex / policyCatalogPageSize) + 1
      const indexInPage = absoluteIndex % policyCatalogPageSize
      return cache.pages.get(page)?.[indexInPage]
    }).filter(Boolean)
  }

  async function fetchAllPolicyStatuses(page) {
    await initializeAllPolicyStatuses()

    const availableTotal = policyStatusCache.AVAILABLE.totalElements || 0
    const closedTotal = policyStatusCache.CLOSED.totalElements || 0
    const totalElements = availableTotal + closedTotal
    const totalPages = Math.ceil(totalElements / policyCatalogPageSize)
    const currentPage = totalPages ? Math.min(Math.max(1, page), totalPages) : 1
    const start = (currentPage - 1) * policyCatalogPageSize
    const availableOffset = Math.min(start, availableTotal)
    const availableLength = Math.min(
      policyCatalogPageSize,
      Math.max(0, availableTotal - availableOffset),
    )
    const closedOffset = Math.max(0, start - availableTotal)
    const closedLength = Math.min(
      policyCatalogPageSize - availableLength,
      Math.max(0, closedTotal - closedOffset),
    )

    const [available, closed] = await Promise.all([
      loadPolicyStatusRange('AVAILABLE', availableOffset, availableLength),
      loadPolicyStatusRange('CLOSED', closedOffset, closedLength),
    ])

    return {
      content: [...available, ...closed],
      page: currentPage,
      size: policyCatalogPageSize,
      totalElements,
      totalPages,
      hasNext: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    }
  }

  async function loadPolicyCatalog(customParams) {
    const requestId = ++policyCatalogRequestId
    const isExplicitFilterRequest = Boolean(customParams)
    const loadAllStatuses = customParams?.allStatuses === true
    policyCatalogLoading.value = true
    policyCatalogError.value = ''
    // 정책 API는 명세와 달리 REEMPLOYMENT 조회 시 CATALOG_005를 반환한다.
    // 재취업을 UNEMPLOYED로 임의 변환하지 않고, 서버가 지원하는 첫취업만 자동 조건으로 사용한다.
    const employmentPrepStatus = session.currentUser.jobType === 'first' ? 'FIRST_JOB' : undefined
    const requestedPage = Math.max(1, Number(customParams?.page) || 1)
    const params = customParams
      ? { ...customParams }
      : {
          policyStatus: 'AVAILABLE',
          ...(employmentPrepStatus ? { employmentPrepStatus } : {}),
          ...(calculateAge(session.currentUser.birth) !== undefined
            ? { age: calculateAge(session.currentUser.birth) }
            : {}),
          ...(normalizePolicyRegion(session.currentUser.region)
            ? { policyRegion: normalizePolicyRegion(session.currentUser.region) }
            : {}),
        }
    delete params.page
    delete params.size
    delete params.allStatuses

    try {
      let pageResult
      let effectiveParams = params
      if (loadAllStatuses) {
        pageResult = await fetchAllPolicyStatuses(requestedPage)
        effectiveParams = { allStatuses: true }
      } else {
        try {
          pageResult = await fetchPolicyCatalogPage(params, requestedPage)
        } catch (error) {
          if (error.code !== 'CATALOG_005' || isExplicitFilterRequest) throw error

          const relaxedParams = { ...params }
          if (relaxedParams.policyRegion) delete relaxedParams.policyRegion
          else delete relaxedParams.employmentPrepStatus
          effectiveParams = relaxedParams
          pageResult = await fetchPolicyCatalogPage(relaxedParams, requestedPage)
        }

        // 백엔드의 지역 필터는 해당 지역 전용 정책만 남기고 전국 정책을 제외한다.
        // 정확 조건 결과가 비었을 때는 지역만 완화해 나이와 취업 상태에 맞는
        // 정책까지 모두 사라지는 상황을 방지한다.
        if (
          !isExplicitFilterRequest &&
          !pageResult.totalElements &&
          requestedPage === 1 &&
          effectiveParams.policyRegion
        ) {
          const fallbackParams = { ...params }
          delete fallbackParams.policyRegion
          effectiveParams = fallbackParams
          pageResult = await fetchPolicyCatalogPage(fallbackParams, requestedPage)
        }
      }

      if (requestId !== policyCatalogRequestId) return []
      policyCatalogParams = effectiveParams
      policyCatalog.value = pageResult.content
      policyCatalogPageInfo.value = pageResult
      reconcileSelectedPolicies(pageResult.content)
      return pageResult.content
    } catch (error) {
      if (requestId !== policyCatalogRequestId) return []
      policyCatalogError.value = error.message || '정책 목록을 불러오지 못했습니다.'
      policyCatalog.value = []
      policyCatalogPageInfo.value = {
        page: 1,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      }
      return []
    } finally {
      if (requestId === policyCatalogRequestId) policyCatalogLoading.value = false
    }
  }

  async function loadPolicyCatalogPage(page) {
    return loadPolicyCatalog({ ...(policyCatalogParams || {}), page })
  }

  async function runItemMutation(request, onSuccess) {
    syncing.value = true
    syncError.value = ''
    try {
      const result = await request()
      onSuccess(result)
      if (remoteEnabled) {
        try {
          invalidateRemoteLookups({ draft: false })
          await refreshRemoteReport(true)
        } catch (error) {
          syncError.value = error.message || '시뮬레이션 결과를 새로고침하지 못했습니다.'
        }
      }
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
    if (!remoteEnabled || !item.remoteId) {
      setExpenseSaving(id, saving)
      return true
    }

    return runItemMutation(
      () =>
        updateSimulationItemApi(
          item.remoteId,
          toUpdateSimulationItemRequest({
            amount: saving,
            type: 'monthly',
            startDate: state.startDate,
            endDate: state.endDate,
          }),
        ),
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
    if (!remoteEnabled || !item.remoteId) {
      setExpenseSaving(id, 0)
      return true
    }
    return runItemMutation(
      () => deleteSimulationItemApi(item.remoteId),
      () =>
        Object.assign(item, {
          saving: 0,
          selected: false,
          remoteSynced: false,
          remoteId: undefined,
        }),
    )
  }

  async function saveIncomePlan(id, payload) {
    const item = state.incomes.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) {
      updateIncome(id, payload)
      return true
    }
    return runItemMutation(
      () =>
        updateSimulationItemApi(
          item.remoteId,
          toUpdateSimulationItemRequest({
            ...payload,
            endDate: payload.type === 'monthly' ? state.endDate : payload.startDate,
          }),
        ),
      (updated) =>
        Object.assign(item, payload, {
          amount: Number(updated?.amount) || payload.amount,
          remoteId: updated?.itemId || item.remoteId,
          remoteSynced: true,
        }),
    )
  }

  async function deleteIncomePlan(id) {
    const item = state.incomes.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) {
      removeIncome(id)
      return true
    }
    return runItemMutation(
      () => deleteSimulationItemApi(item.remoteId),
      () => removeIncome(id),
    )
  }

  async function deletePolicyPlan(id) {
    const item = state.policies.find((entry) => entry.id === id)
    if (!item) return false
    if (!remoteEnabled || !item.remoteId) {
      removePolicy(id)
      return true
    }
    return runItemMutation(
      () => deleteSimulationItemApi(item.remoteId),
      () => removePolicy(id),
    )
  }
  async function runScenarioMutation(request, onSuccess, { allowNotFound = false } = {}) {
    syncing.value = true
    syncError.value = ''
    try {
      if (remoteEnabled) await request()
      onSuccess()
      return true
    } catch (error) {
      if (allowNotFound && error.status === 404) {
        onSuccess()
        return true
      }
      syncError.value = error.message
      return false
    } finally {
      syncing.value = false
    }
  }

  async function confirmScenario() {
    if (!remoteEnabled && !financialDataReady.value) {
      try {
        await loadTransactions()
      } catch (error) {
        syncError.value = error.message || '거래 내역을 불러온 뒤 다시 시도해 주세요.'
        return false
      }
    }

    if (remoteEnabled) {
      for (const category of ['expense', 'income', 'policy']) {
        if (!(await syncCategory(category, { refreshReport: false }))) return false
      }
      invalidateRemoteLookups({ draft: false })
      await refreshRemoteReport(true)
    }

    const localSnapshot = remoteEnabled ? null : buildClientConfirmedSnapshot()
    if (!remoteEnabled && !localSnapshot) {
      syncError.value = '거래 내역을 불러온 뒤 다시 시도해 주세요.'
      return false
    }

    syncing.value = true
    syncError.value = ''

    try {
      let confirmed = localSnapshot

      if (remoteEnabled) {
        // 확정 조회 API에는 지속 가능 여부가 없으므로, 확정 직전 보고서에서 받은
        // 서버 판정값을 확정 결과와 함께 보존한다.
        const reportAtConfirmation = remoteReport.value
        await confirmSimulationApi()
        const response = await getLatestConfirmedSimulationApi()
        const remoteConfirmed = mapConfirmedSimulationResponse(response, policyCatalog.value)

        if (!remoteConfirmed) {
          throw new Error('확정된 시뮬레이션 결과를 불러오지 못했습니다.')
        }

        confirmed = {
          ...localSnapshot,
          ...remoteConfirmed,
          ...(typeof reportAtConfirmation?.currentSustainable === 'boolean'
            ? { currentSustainable: reportAtConfirmation.currentSustainable }
            : {}),
          ...(typeof reportAtConfirmation?.expectSustainable === 'boolean'
            ? { expectSustainable: reportAtConfirmation.expectSustainable }
            : {}),
          clientCalculationVersion: CLIENT_CALCULATION_VERSION,
        }
        applyConfirmedItems(confirmed)
        remoteSimulation.value = response
        remoteReport.value = null
      }

      state.completedQuestIds = []
      state.confirmed = true
      state.draftStarted = false
      state.ignoreRemoteDraft = false
      remoteDraftExists.value = false
      invalidateRemoteLookups()
      confirmedHydratedAt = Date.now()
      cachedConfirmed = confirmed
      recentConfirmed.value = confirmed
      persistConfirmedSnapshot(confirmed)
      state.startDate = confirmed.startDate || state.startDate
      state.endDate = confirmed.endDate || state.endDate
      return true
    } catch (error) {
      syncError.value = error.message
      return false
    } finally {
      syncing.value = false
    }
  }

  async function revertConfirmedScenario() {
    const reverted = await runScenarioMutation(revertConfirmedSimulationApi, () => {
      state.confirmed = false
      state.draftStarted = true
      state.ignoreRemoteDraft = false
      remoteDraftExists.value = true
      clearConfirmedSnapshot()
      invalidateRemoteLookups()
    })
    if (reverted && remoteEnabled) {
      await hydrateDraft()
    }
    return reverted
  }

  function deleteConfirmedScenario() {
    return runScenarioMutation(
      deleteConfirmedSimulationApi,
      () => {
        resetScenario()
        remoteDraftExists.value = false
      },
      { allowNotFound: true },
    )
  }

  function deleteDraftScenario() {
    return runScenarioMutation(
      deleteDraftSimulationApi,
      () => {
        resetScenario()
        remoteDraftExists.value = false
      },
      { allowNotFound: true },
    )
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
  function resetScenario({ clearFinancialData = false } = {}) {
    Object.assign(state, defaultState())
    remoteReport.value = null
    remoteSimulation.value = null
    clearConfirmedSnapshot()
    remoteDraftExists.value = null
    if (clearFinancialData) {
      runwayBaseline.value = null
      currentFinancialAssets.value = null
      financialSnapshotError.value = ''
      runwayBaselineError.value = ''
    }
    invalidateRemoteLookups()
    syncError.value = ''
    clearAiPlanRecommendations()
  }

  function setAiPlanRecommendations(prompt, recommendations) {
    aiPlanPrompt.value = String(prompt || '').trim()
    aiPlanRecommendations.value = recommendations || null
  }

  function clearAiPlanRecommendations() {
    aiPlanPrompt.value = ''
    aiPlanRecommendations.value = null
  }

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
    remoteSimulation.value = null
    remoteDraftExists.value = null
    invalidateRemoteLookups()
    clearConfirmedSnapshot()
    syncError.value = ''
  }

  function clearSyncError() {
    syncError.value = ''
  }

  function applyRemoteSimulation(data) {
    if (!data) return
    remoteSimulation.value = data
    if (data.simulationStartDate) state.startDate = data.simulationStartDate
    if (data.simulationDueDate) state.endDate = data.simulationDueDate
  }

  function resetRemoteItemState() {
    state.expenses = state.expenses.map((item) => ({
      ...item,
      remoteId: undefined,
      remoteSynced: false,
    }))
    state.incomes = state.incomes.map((item) => ({
      ...item,
      remoteId: undefined,
      remoteSynced: false,
    }))
    state.policies = state.policies.map((item) => ({
      ...item,
      remoteId: undefined,
      remoteSynced: false,
    }))
  }

  async function ensureRemoteDraft() {
    if (!remoteEnabled) return true

    const existingDraft = await hydrateDraft()
    if (existingDraft) return true
    if (remoteDraftExists.value !== false) {
      throw new Error(syncError.value || '미확정 시뮬레이션 상태를 확인하지 못했습니다.')
    }

    remoteDraftExists.value = false
    remoteSimulation.value = null
    remoteReport.value = null
    resetRemoteItemState()

    const created = await createSimulationApi({
      simulationStartDate: state.startDate,
      simulationDueDate: state.endDate,
    })
    remoteDraftExists.value = true
    state.ignoreRemoteDraft = false
    applyRemoteSimulation(created)
    cachedDraft = created
    draftHydratedAt = Date.now()
    invalidateRemoteLookups({ draft: false })
    return true
  }

  async function refreshRemoteReport(force = false) {
    if (!remoteEnabled || state.ignoreRemoteDraft) return null
    if (reportHydrationRequest) return reportHydrationRequest
    if (!force && isRecentLookup(reportHydratedAt)) return remoteReport.value

    const request = getSimulationReportApi()
      .then((report) => {
        remoteReport.value = report
        reportHydratedAt = Date.now()
        return report
      })
      .catch((error) => {
        reportHydratedAt = 0
        throw error
      })
      .finally(() => {
        if (reportHydrationRequest === request) reportHydrationRequest = null
      })
    reportHydrationRequest = request
    return request
  }

  async function hydrateDraft(force = false) {
    if (!remoteEnabled) return null
    if (draftHydrationRequest) return draftHydrationRequest
    if (!force && isRecentLookup(draftHydratedAt)) return cachedDraft

    const request = (async () => {
      syncing.value = true
      syncError.value = ''
      try {
        const data = await getCurrentSimulationApi()
        remoteDraftExists.value = true
        cachedDraft = data
        draftHydratedAt = Date.now()
        applyRemoteSimulation(data)
        state.ignoreRemoteDraft = false
        await refreshRemoteReport(force)
        return data
      } catch (error) {
        if (error.status === 404) {
          remoteDraftExists.value = false
          cachedDraft = null
          draftHydratedAt = Date.now()
          remoteSimulation.value = null
          remoteReport.value = null
          reportHydratedAt = 0
        } else {
          draftHydratedAt = 0
          syncError.value = error.message
        }
        return null
      } finally {
        syncing.value = false
      }
    })()

    draftHydrationRequest = request
    try {
      return await request
    } finally {
      if (draftHydrationRequest === request) draftHydrationRequest = null
    }
  }

  async function prepareConfirmationPreview() {
    syncing.value = true
    syncError.value = ''
    try {
      await loadTransactions()

      if (remoteEnabled) {
        try {
          const serverReport = await refreshRemoteReport()
          remoteReport.value = state.ignoreRemoteDraft ? null : serverReport
        } catch {
          // 기간 값은 시뮬레이션 응답에서 유지하되, 현금흐름은 임의 계산하지 않고
          // 보고서가 없다는 상태를 화면에서 별도로 안내한다.
        }
      }

      const previewReady = runwayCalculationReady.value
      if (!previewReady) {
        syncError.value = remoteEnabled
          ? '서버에서 시뮬레이션 기간 결과를 불러오지 못했습니다.'
          : '월 지출 내역이 없어 예상 버티는 기간을 계산할 수 없습니다.'
        return false
      }
      return true
    } catch (error) {
      syncError.value =
        error.message || '재정 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      return false
    } finally {
      syncing.value = false
    }
  }

  async function hydrateConfirmed(force = false) {
    if (!remoteEnabled) return null
    if (confirmedHydrationRequest) return confirmedHydrationRequest
    if (!force && isRecentLookup(confirmedHydratedAt)) return cachedConfirmed

    const request = (async () => {
      syncing.value = true
      syncError.value = ''
      try {
        const response = await getLatestConfirmedSimulationApi()
        const remoteConfirmed = mapConfirmedSimulationResponse(response, policyCatalog.value)

        const restored = restoreConfirmedSnapshot()
        const canReuseClientSnapshot =
          restored?.clientCalculationVersion === CLIENT_CALCULATION_VERSION &&
          restored.simulationId === remoteConfirmed.simulationId &&
          restored.confirmedAt === remoteConfirmed.confirmedAt &&
          Number.isFinite(Number(restored.currentMonths)) &&
          Number.isFinite(Number(restored.expectedMonths))
        let confirmed

        if (canReuseClientSnapshot) {
          confirmed = {
            ...restored,
            ...remoteConfirmed,
            clientCalculationVersion: CLIENT_CALCULATION_VERSION,
          }
          applyConfirmedItems(confirmed)
        } else {
          confirmed = {
            ...remoteConfirmed,
            clientCalculationVersion: CLIENT_CALCULATION_VERSION,
          }
          applyConfirmedItems(confirmed)
          recentConfirmed.value = null
        }

        remoteSimulation.value = response
        remoteReport.value = null
        recentConfirmed.value = confirmed
        cachedConfirmed = remoteConfirmed
        confirmedHydratedAt = Date.now()
        persistConfirmedSnapshot(confirmed)
        state.confirmed = true
        state.draftStarted = false
        state.ignoreRemoteDraft = false
        return remoteConfirmed
      } catch (error) {
        if (error.status === 404) {
          clearConfirmedSnapshot()
          cachedConfirmed = null
          confirmedHydratedAt = Date.now()
          remoteSimulation.value = null
          remoteReport.value = null
          state.confirmed = false
        } else {
          confirmedHydratedAt = 0
          syncError.value = error.message
        }
        return null
      } finally {
        syncing.value = false
      }
    })()

    confirmedHydrationRequest = request
    try {
      return await request
    } finally {
      if (confirmedHydrationRequest === request) confirmedHydrationRequest = null
    }
  }

  async function beginSimulation() {
    if (!remoteEnabled) return true
    syncing.value = true
    syncError.value = ''
    const payload = { simulationStartDate: state.startDate, simulationDueDate: state.endDate }
    try {
      if (remoteDraftExists.value === null) {
        try {
          await getCurrentSimulationApi()
          remoteDraftExists.value = true
        } catch (lookupError) {
          if (lookupError.status === 404) remoteDraftExists.value = false
          else throw lookupError
        }
      }

      if (remoteDraftExists.value) {
        await updateSimulationPeriodApi(payload)
      } else {
        let data
        try {
          data = await createSimulationApi(payload)
        } catch (createError) {
          if (createError.code !== 'SIMULATION_901') throw createError

          // 조회 API는 Draft가 없다고 응답하지만 생성 API는 기존 Draft를 감지하는
          // 서버 불일치 상태가 있을 수 있다. 새 시뮬레이션 시작 요청이므로 남은
          // 미확정 Draft를 정리한 뒤 생성 요청을 한 번만 다시 시도한다.
          await deleteDraftSimulationApi()
          data = await createSimulationApi(payload)
        }
        remoteDraftExists.value = true
        applyRemoteSimulation(data)
      }
      const draft = await getCurrentSimulationApi()
      applyRemoteSimulation(draft)
      cachedDraft = draft
      draftHydratedAt = Date.now()
      state.ignoreRemoteDraft = false
      invalidateRemoteLookups({ draft: false })
      await refreshRemoteReport(true)
      return true
    } catch (error) {
      syncError.value = error.message
      return false
    } finally {
      syncing.value = false
    }
  }

  async function savePeriod(startDate, endDate) {
    syncError.value = ''
    state.startDate = startDate
    state.endDate = endDate
    if (!remoteEnabled) return true
    try {
      await updateSimulationPeriodApi({
        simulationStartDate: startDate,
        simulationDueDate: endDate,
      })
      const draft = await getCurrentSimulationApi()
      applyRemoteSimulation(draft)
      cachedDraft = draft
      draftHydratedAt = Date.now()
      invalidateRemoteLookups({ draft: false })
      await refreshRemoteReport(true)
      return true
    } catch (error) {
      syncError.value = error.message
      return false
    }
  }

  async function syncCategory(category, { refreshReport = true } = {}) {
    if (!remoteEnabled) return true
    syncing.value = true
    syncError.value = ''
    try {
      await ensureRemoteDraft()
      const pendingItems =
        category === 'expense'
          ? selectedExpenses.value
              .filter((item) => !item.remoteSynced)
              .map((item) => ({
                item,
                payload: {
                  category: 'EXPENSE',
                  itemName: `${item.name} 줄이기`,
                  expenseCategory: expenseCategoryValue(item.name),
                  amount: item.saving,
                  applyStartDate: state.startDate,
                  applyEndDate: state.endDate,
                  recurrenceType: 'MONTHLY',
                },
              }))
          : category === 'income'
            ? state.incomes
                .filter((item) => !item.remoteSynced)
                .map((item) => ({
                  item,
                  payload: {
                    category: 'INCOME',
                    itemName: item.name,
                    amount: item.amount,
                    expenseCategory: null,
                    applyStartDate: item.startDate || state.startDate,
                    applyEndDate: item.type === 'once' ? null : state.endDate,
                    recurrenceType: item.type === 'once' ? 'ONCE' : 'MONTHLY',
                    policyId: null,
                  },
                }))
            : state.policies
                .filter((item) => !item.remoteSynced && item.policyId)
                .map((item) => ({
                  item,
                  payload: {
                    category: 'POLICY',
                    policyId: String(item.policyId),
                    applyStartDate: state.startDate,
                    itemName: null,
                    amount: null,
                    expenseCategory: null,
                    applyEndDate: null,
                    recurrenceType: null,
                  },
                }))

      for (const { item, payload } of pendingItems) {
        const result = await applySimulationItemApi(payload)
        item.remoteId = result?.itemId || item.remoteId
        item.remoteSynced = true
      }
      invalidateRemoteLookups({ draft: false })
      if (refreshReport) await refreshRemoteReport(true)
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
    const mappedItems = items
      .map((item) => mapSimulationItemResponse(item, policyCatalog.value))
      .filter(Boolean)
    if (category === 'expense') {
      state.expenses = state.expenses.map((item) => {
        const remoteItem = mappedItems.find((entry) => entry.name === item.name)
        return remoteItem
          ? {
              ...item,
              saving: Math.min(item.current, remoteItem.saving),
              selected: remoteItem.saving > 0,
              remoteSynced: true,
              remoteId: remoteItem.remoteId,
            }
          : item
      })
      state.expenseApplied = state.expenses.some((item) => item.selected)
    } else if (category === 'income')
      state.incomes = mappedItems.filter((item) => item.kind === 'income')
    else if (category === 'policy')
      state.policies = mappedItems.filter((item) => item.kind === 'policy')
    return items
  }

  return {
    state,
    remoteEnabled,
    policyCatalog,
    policyCatalogLoading,
    policyCatalogError,
    policyCatalogPageInfo,
    aiPlanPrompt,
    aiPlanRecommendations,
    totalAssets,
    availableAssets,
    monthlyIncome,
    monthlyExpense,
    reportCashflow,
    targetMonths,
    currentMonths,
    currentStatus,
    expectedStatus,
    expenseMonths,
    expenseBreakdown,
    totalCurrentExpense,
    selectedExpenses,
    expenseSaving,
    recurringIncome,
    oneTimeIncome,
    recurringPolicy,
    oneTimePolicy,
    monthlyImprovement,
    addedMonths,
    expectedMonths,
    expensePreviewMonths,
    scenarioStartDate,
    scenarioEndDate,
    completedCategories,
    hasDraft,
    syncing,
    syncError,
    financialSnapshotLoading,
    financialSnapshotError,
    runwayBaselineError,
    clearSyncError,
    setAiPlanRecommendations,
    clearAiPlanRecommendations,
    remoteReport,
    runwayBaseline,
    recentConfirmed,
    financialDataReady,
    runwayCalculationReady,
    adjustExpense,
    setExpenseSaving,
    toggleExpense,
    addIncome,
    updateIncome,
    removeIncome,
    togglePolicy,
    removePolicy,
    applyExpenses,
    resetExpenses,
    saveExpenseGoal,
    deleteExpenseGoal,
    saveIncomePlan,
    deleteIncomePlan,
    deletePolicyPlan,
    initializeExpensesFromAnalysis,
    resetIncomes,
    resetPolicies,
    confirmScenario,
    revertConfirmedScenario,
    deleteConfirmedScenario,
    deleteDraftScenario,
    toggleQuestCompletion,
    migrateRecurringQuestCompletions,
    resetScenario,
    prepareNewScenario,
    hydrateDraft,
    prepareConfirmationPreview,
    hydrateConfirmed,
    hydrateRunwayBaseline,
    hydrateFinancialSnapshot,
    beginSimulation,
    savePeriod,
    restoreConfirmedSnapshot,
    syncCategory,
    refreshCategory,
    hydrateCategory,
    loadPolicyCatalog,
    loadPolicyCatalogPage,
  }
})
