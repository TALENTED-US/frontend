import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { dashboard } from '@/data/mockData'
import {
  financeState,
  financialReport,
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
import { calculateAge, mapPolicyPage, normalizePolicyRegion } from '@/mappers/policy'
import {
  EXPENSE_CATEGORY_LABELS,
  expenseCategoryLabel,
  expenseCategoryValue,
} from '@/constants/expenseCategories'

const STORAGE_KEY = 'buttie-simulation-v4'
const CONFIRMED_SNAPSHOT_KEY = 'buttie-simulation-confirmed-snapshot-v1'
const CLIENT_CALCULATION_VERSION = 2
const CATEGORY_META = {
  식비: { icon: '🍚', color: '#ffd0d0' },
  '술·유흥': { icon: '🍻', color: '#e9b8a8' },
  '카페·간식': { icon: '☕', color: '#e8c89a' },
  '취업 준비': { icon: '📚', color: '#77b6df' },
  쇼핑: { icon: '🛍️', color: '#88a9f6' },
  '취미·여가': { icon: '🎮', color: '#c8a8ef' },
  '주거·통신': { icon: '🏠', color: '#ffe197' },
  '교통·주유': { icon: '🚌', color: '#aab5c8' },
  '건강·운동': { icon: '🏥', color: '#8dd5c1' },
  '기타 금융': { icon: '🧾', color: '#b8bdc8' },
}
const EXPENSE_TARGET_CATEGORY_NAMES = Object.entries(EXPENSE_CATEGORY_LABELS)
  .filter(([category]) => category !== 'HOUSING_COMMUNICATION')
  .map(([, name]) => name)
const DAYS_PER_MONTH = 365.2425 / 12

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

function getApiRiskStatus(riskLevel, fallbackStatus) {
  if (riskLevel === 'DANGER') return { ...fallbackStatus, key: 'danger', label: '위험' }
  if (riskLevel === 'CAUTION') return { ...fallbackStatus, key: 'caution', label: '주의' }
  if (riskLevel) return { ...fallbackStatus, key: 'safe', label: '안정' }
  return fallbackStatus
}

const defaultState = () => ({
  startDate: '2026-08-02',
  endDate: '2027-01-01',
  expenses: [
    { id: 'food', name: '식비', icon: '🍚', current: 150000, saving: 0, selected: false },
    { id: 'transport', name: '교통·주유', icon: '🚌', current: 70000, saving: 0, selected: false },
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
  const recentConfirmed = ref(null)
  const remoteDraftExists = ref(null)
  const policyCatalog = ref([])
  const policyCatalogLoading = ref(false)
  const policyCatalogError = ref('')
  const financialDataReady = computed(() => financeState.loaded && !financeState.loading)
  const previousMonthExpenseAnalysis = computed(() =>
    analyzePreviousCompletedMonths(financeTransactions.value, new Date(), 1),
  )

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
      else groupedBreakdown.set(normalizedName, {
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
  const totalAssets = computed(() => financialReport.value.totalAssets)
  const availableAssets = ref(dashboard.liquidAssets ?? dashboard.totalAssets)
  const monthlyIncome = computed(() => financialReport.value.monthlyIncome)
  const monthlyExpense = computed(() => financialReport.value.monthlyExpense)
  const runwayCalculationReady = computed(() =>
    financialDataReady.value && monthlyExpense.value > 0,
  )
  const targetMonths = computed(() =>
    remainingMonthsUntil(session.currentUser.goalDate || session.currentUser.targetDate),
  )
  const currentMonthlyBurn = computed(() => Math.max(1, monthlyExpense.value))
  const localCurrentMonths = computed(() =>
    runwayCalculationReady.value
      ? Math.round((availableAssets.value / currentMonthlyBurn.value) * 10) / 10
      : null,
  )
  // 확정 시점의 기준 기간은 수정 흐름에서도 유지한다. 서버의 draft/report 값은
  // 확정 결과와 계산 기준이 다를 수 있으므로 수정 화면 진입 시 기준값을 덮지 않는다.
  const currentMonths = computed(() =>
    recentConfirmed.value ? recentConfirmed.value.currentMonths : localCurrentMonths.value,
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
  // 확정 결과를 보는 동안에만 확정 스냅샷을 사용한다. 수정(revert) 이후에는
  // 기존 확정값을 비교 기준으로 보존하되, 변경된 항목으로 예상 기간을 다시 계산한다.
  const expectedMonths = computed(() =>
    state.confirmed && recentConfirmed.value
      ? recentConfirmed.value.expectedMonths
      : localExpectedMonths.value,
  )
  const currentStatus = computed(() =>
    getApiRiskStatus(
      session.currentUser.riskLevel,
      getStatus(currentMonths.value, targetMonths.value),
    ),
  )
  const expectedStatus = computed(() => getStatus(expectedMonths.value, targetMonths.value))
  const expensePreviewMonthlyBurn = computed(() =>
    Math.max(1, currentMonthlyBurn.value - expenseSaving.value),
  )
  const expensePreviewMonths = computed(() =>
    Math.min(60, Math.round((availableAssets.value / expensePreviewMonthlyBurn.value) * 10) / 10),
  )
  const addedMonths = computed(() =>
    Math.max(0, Math.round((expectedMonths.value - currentMonths.value) * 10) / 10),
  )
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

  async function fetchPolicyCatalogPages(params) {
    const response = await getPoliciesApi({ ...params, page: 1 })
    const firstPage = mapPolicyPage(response)
    const remainingPages = firstPage.hasNext
      ? await Promise.all(
          Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
            getPoliciesApi({ ...params, page: index + 2 }),
          ),
        )
      : []

    return [...firstPage.content, ...remainingPages.flatMap((page) => mapPolicyPage(page).content)]
  }

  async function loadPolicyCatalog() {
    policyCatalogLoading.value = true
    policyCatalogError.value = ''
    const isReemployment = session.currentUser.jobType === 'again'
    const employmentPrepStatus =
      isReemployment ? '재취업' : '첫취업'
    const policyRegion = normalizePolicyRegion(session.currentUser.region)
    const params = {
      size: 100,
      policyStatus: 'AVAILABLE',
      employmentPrepStatus,
      ...(calculateAge(session.currentUser.birth) !== undefined
        ? { age: calculateAge(session.currentUser.birth) }
        : {}),
      // 백엔드에서 '재취업 + 지역' 조합은 CATALOG_005를 반환한다.
      ...(!isReemployment && policyRegion ? { policyRegion } : {}),
    }

    try {
      let catalog
      try {
        catalog = await fetchPolicyCatalogPages(params)
      } catch (error) {
        if (error.code !== 'CATALOG_005') throw error

        const relaxedParams = { ...params }
        if (relaxedParams.policyRegion) delete relaxedParams.policyRegion
        else delete relaxedParams.employmentPrepStatus
        catalog = await fetchPolicyCatalogPages(relaxedParams)
      }

      // 백엔드의 지역 필터는 해당 지역 전용 정책만 남기고 전국 정책을 제외한다.
      // 정확 조건 결과가 비었을 때는 지역만 완화해 나이와 취업 상태에 맞는
      // 정책까지 모두 사라지는 상황을 방지한다.
      if (!catalog.length && params.policyRegion) {
        const fallbackParams = { ...params }
        delete fallbackParams.policyRegion
        catalog = await fetchPolicyCatalogPages(fallbackParams)
      }

      policyCatalog.value = catalog
      reconcileSelectedPolicies(catalog)
      return catalog
    } catch (error) {
      policyCatalogError.value = error.message || '정책 목록을 불러오지 못했습니다.'
      return []
    } finally {
      policyCatalogLoading.value = false
    }
  }

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
    if (!financialDataReady.value) {
      try {
        await loadTransactions()
      } catch (error) {
        syncError.value = error.message || '거래 내역을 불러온 뒤 다시 시도해 주세요.'
        return false
      }
    }

    const localSnapshot = buildClientConfirmedSnapshot()
    if (!localSnapshot) {
      syncError.value = '거래 내역을 불러온 뒤 다시 시도해 주세요.'
      return false
    }

    syncing.value = true
    syncError.value = ''

    try {
      let confirmed = localSnapshot

      if (remoteEnabled) {
        await confirmSimulationApi()
        const remoteConfirmed = mapConfirmedSimulationResponse(
          await getLatestConfirmedSimulationApi(),
          policyCatalog.value,
        )

        if (!remoteConfirmed) {
          throw new Error('확정된 시뮬레이션 결과를 불러오지 못했습니다.')
        }

        confirmed = {
          ...localSnapshot,
          ...remoteConfirmed,
          clientCalculationVersion: CLIENT_CALCULATION_VERSION,
        }
        applyConfirmedItems(confirmed)
      }

      state.completedQuestIds = []
      state.confirmed = true
      state.draftStarted = false
      state.ignoreRemoteDraft = false
      remoteDraftExists.value = false
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

  function revertConfirmedScenario() {
    return runScenarioMutation(revertConfirmedSimulationApi, () => {
      state.confirmed = false
      state.draftStarted = true
      state.ignoreRemoteDraft = false
      remoteDraftExists.value = true
      // 확정 스냅샷은 수정 중인 시나리오의 비교 기준으로 계속 사용한다.
      // 새 시뮬레이션 생성/삭제/로그아웃 경로에서만 제거한다.
    })
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
  function resetScenario() {
    Object.assign(state, defaultState())
    remoteReport.value = null
    clearConfirmedSnapshot()
    remoteDraftExists.value = null
    syncError.value = ''
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
    clearConfirmedSnapshot()
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
      remoteDraftExists.value = true
      applyRemoteSimulation(data)
      return data
    } catch (error) {
      if (error.status === 404) remoteDraftExists.value = false
      else syncError.value = error.message
      return null
    } finally {
      syncing.value = false
    }
  }

  async function prepareConfirmationPreview() {
    syncing.value = true
    syncError.value = ''
    try {
      await loadTransactions()

      if (remoteEnabled) {
        try {
          const serverReport = await getSimulationReportApi()
          remoteReport.value = state.ignoreRemoteDraft ? null : serverReport
        } catch {
          // 버티는 기간은 거래내역과 현재 선택 항목으로 계산할 수 있으므로
          // 리포트 재조회 실패만으로 확정 화면 전체를 막지 않는다.
        }
      }

      if (!runwayCalculationReady.value) {
        syncError.value = '월 지출 내역이 없어 예상 버티는 기간을 계산할 수 없습니다.'
        return false
      }
      return true
    } catch (error) {
      syncError.value = error.message || '재정 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
      return false
    } finally {
      syncing.value = false
    }
  }

  async function hydrateConfirmed() {
    if (!remoteEnabled) return null
    syncing.value = true
    syncError.value = ''
    try {
      await loadTransactions()
      const restored = restoreConfirmedSnapshot()
      const remoteConfirmed = mapConfirmedSimulationResponse(
        await getLatestConfirmedSimulationApi(),
        policyCatalog.value,
      )
      if (!remoteConfirmed) return null

      const canReuseClientSnapshot =
        restored?.clientCalculationVersion === CLIENT_CALCULATION_VERSION &&
        restored.simulationId === remoteConfirmed.simulationId &&
        restored.confirmedAt === remoteConfirmed.confirmedAt &&
        Number(restored.currentMonths) < 999 &&
        Number(restored.expectedMonths) < 999
      let confirmed

      if (canReuseClientSnapshot) {
        confirmed = {
          ...restored,
          ...remoteConfirmed,
          clientCalculationVersion: CLIENT_CALCULATION_VERSION,
        }
        applyConfirmedItems(confirmed)
      } else {
        applyConfirmedItems(remoteConfirmed)
        recentConfirmed.value = null
        const localConfirmed = buildClientConfirmedSnapshot()
        if (!localConfirmed) throw new Error('거래 내역을 불러온 뒤 시뮬레이션을 다시 확인해 주세요.')
        confirmed = {
          ...localConfirmed,
          ...remoteConfirmed,
          clientCalculationVersion: CLIENT_CALCULATION_VERSION,
        }
        applyConfirmedItems(confirmed)
      }

      recentConfirmed.value = confirmed
      persistConfirmedSnapshot(confirmed)
      state.confirmed = true
      state.draftStarted = false
      state.ignoreRemoteDraft = false
      return confirmed
    } catch (error) {
      if (error.status === 404) {
        clearConfirmedSnapshot()
        state.confirmed = false
      } else syncError.value = error.message
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
      return true
    } catch (error) {
      syncError.value = error.message
      return false
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

  async function syncCategory(category) {
    if (!remoteEnabled) return true
    syncing.value = true
    syncError.value = ''
    try {
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
    policyCatalog,
    policyCatalogLoading,
    policyCatalogError,
    totalAssets,
    availableAssets,
    monthlyIncome,
    monthlyExpense,
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
    remoteReport,
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
    beginSimulation,
    savePeriod,
    restoreConfirmedSnapshot,
    syncCategory,
    refreshCategory,
    hydrateCategory,
    loadPolicyCatalog,
  }
})
