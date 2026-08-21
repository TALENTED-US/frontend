<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useSessionStore } from '@/stores/session'
import { financeState, loadTransactions } from '@/features/finance/financeStore'
import { policyFilterGroups, toPolicySearchRequest } from '@/features/search/policyData'
import { calculateAge, mapPolicyResponse, normalizePolicyRegionFilter } from '@/mappers/policy'
import { expenseCategoryLabel } from '@/constants/expenseCategories'
import {
  getCustomRecommendationsApi,
  getSimulationRecommendationsApi,
} from '@/api/simulation'
import '@/features/simulation/styles/simulation.css'
import { expenseCategoryIconPath } from '@/features/simulation/utils/expenseCategoryIcon'
import AppIcon from '@/components/ui/AppIcon.vue'
import AiRecommendationLoader from '@/features/simulation/components/AiRecommendationLoader.vue'
import AiRecommendationPrompt from '@/features/simulation/components/AiRecommendationPrompt.vue'
import ButtieAiLogo from '@/features/simulation/components/ButtieAiLogo.vue'
import {
  aiRecommendationTargets,
  filterExpenseRecommendationsForPrompt,
  normalizeCategoryRecommendationResponse,
} from '@/features/simulation/utils/aiRecommendationScope'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
const session = useSessionStore()
simulation.restoreConfirmedSnapshot()
const category = computed(() => route.params.category)
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const moneyInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}
const goalAmount = (value) =>
  Number(value) % 10000 === 0 ? `${money(Number(value) / 10000)}만원` : `${money(value)}원`
const stepNumber = computed(() => ({ expense: 1, income: 2, policy: 3 })[category.value])
const wizardSteps = [
  { label: '01 지출 줄이기', to: '/simulation/expense' },
  { label: '02 수입 늘리기', to: '/simulation/income' },
  { label: '03 정책 맞춤 추천', to: '/simulation/policy' },
]
const title = computed(
  () =>
    ({ expense: '지출 줄이기', income: '수입 늘리기', policy: '정책 맞춤 추천' })[category.value],
)
const backPath = computed(
  () =>
    ({
      expense: '/simulation/new',
      income: '/simulation/expense/preview',
      policy: '/simulation/income/preview',
    })[category.value],
)
const profileDate = (value) => (value ? value.replaceAll('-', '.') : '-')
const form = reactive({
  name: '',
  amount: '',
  type: 'monthly',
  startDate: simulation.state.startDate,
  cycle: '매월',
})
const editingIncomeId = ref(null)
const aiRecommendations = ref(null)
const usingCustomAiRecommendations = ref(false)
const aiRecommendationLoading = ref(false)
const aiRecommendationError = ref('')
const aiIncomeAmounts = reactive({})
const selectedExpenseId = ref('식비')
const expenseAmount = ref('')
const activeExpense = computed(
  () =>
    simulation.state.expenses.find((item) => item.id === selectedExpenseId.value) ||
    simulation.state.expenses[0],
)
watch(
  () => simulation.state.expenses.map((item) => item.id).join('|'),
  () => {
    if (!simulation.state.expenses.some((item) => item.id === selectedExpenseId.value)) {
      selectedExpenseId.value = simulation.state.expenses[0]?.id || ''
      expenseAmount.value = ''
    }
  },
  { immediate: true },
)
const expenseRangeProgress = computed(() => {
  const maximum = Number(activeExpense.value?.current) || 0
  return maximum ? Math.min(100, (Number(expenseAmount.value) / maximum) * 100) : 0
})
const expenseRangeMaximum = computed(
  () => Math.floor((Number(activeExpense.value?.current) || 0) / 100) * 100,
)
const expenseRangeStyle = computed(() => ({
  '--expense-range-progress': `${expenseRangeProgress.value}%`,
}))
const expenseQuickAmounts = [30000, 50000, 100000]
const breakdownPage = ref(0)
const breakdownPageSize = 4
const breakdownPageCount = computed(() =>
  Math.max(1, Math.ceil(simulation.expenseBreakdown.length / breakdownPageSize)),
)
const breakdownPages = computed(() =>
  Array.from({ length: breakdownPageCount.value }, (_, index) => index),
)
const visibleBreakdown = computed(() => {
  const start = breakdownPage.value * breakdownPageSize
  return simulation.expenseBreakdown.slice(start, start + breakdownPageSize)
})
const moveBreakdownPage = (direction) => {
  breakdownPage.value = Math.min(
    breakdownPageCount.value - 1,
    Math.max(0, breakdownPage.value + direction),
  )
}
const expenseIconPath = expenseCategoryIconPath
const policyCount = computed(() => simulation.state.policies.length)
const policyCatalogScroll = ref(null)
const policyPageNumbers = computed(() => {
  const totalPages = simulation.policyCatalogPageInfo.totalPages || 0
  const currentPage = simulation.policyCatalogPageInfo.page || 1
  if (!totalPages) return []
  const groupStart = Math.floor((currentPage - 1) / 5) * 5 + 1
  return Array.from(
    { length: Math.min(5, totalPages - groupStart + 1) },
    (_, index) => groupStart + index,
  )
})
const jobTypeLabel = computed(() =>
  session.currentUser.jobType === 'first'
    ? '첫취업'
    : session.currentUser.jobType === 'again'
      ? '재취업'
      : '미입력',
)
const expandedPolicyIds = ref(new Set())
function togglePolicyDetails(policyId) {
  const next = new Set(expandedPolicyIds.value)
  if (next.has(policyId)) next.delete(policyId)
  else next.add(policyId)
  expandedPolicyIds.value = next
}
const policyApplicationPeriod = (policy) => policy.deadline || policy.dueDate || '상시'
const isEditingConfirmedScenario = computed(
  () => Boolean(simulation.recentConfirmed) && !simulation.state.confirmed,
)

const aiExpenseRecommendations = computed(() =>
  (aiRecommendations.value?.financialRecommendation?.recommendations || [])
    .map((item, index) => {
      const name = expenseCategoryLabel(item?.category || item?.expenseCategory)
      const expense = simulation.state.expenses.find(
        (entry) => entry.name === name || entry.expenseCategory === item?.category,
      )
      const suggestedAmount = Math.floor((Number(item?.suggestedMonthlyAmount) || 0) / 100) * 100
      return {
        id: `${item?.category || name}-${index}`,
        expenseId: expense?.id,
        name,
        title: item?.title || `${name} 지출 줄이기`,
        reason: item?.reason || '최근 소비 내역을 바탕으로 추천한 절약 목표예요.',
        current: Number(expense?.current) || 0,
        amount: Math.min(Number(expense?.current) || 0, suggestedAmount),
      }
    })
    .filter((item) => item.expenseId && item.amount > 0)
    .slice(0, 3),
)

const aiIncomeRecommendations = computed(() =>
  (aiRecommendations.value?.incomeRecommendation?.jobs || [])
    .filter((item) => item && (item.title || item.company))
    .map((item, index) => {
      const suggestedAmount = Number(
        item.suggestedMonthlyAmount || item.monthlyAmount || item.monthlyIncome || item.amount,
      )
      return {
        ...item,
        id: item.url || `${item.title || item.company}-${index}`,
        suggestedAmount,
        hasSuggestedAmount: Number.isFinite(suggestedAmount) && suggestedAmount > 0,
      }
    })
    .slice(0, 3),
)

const aiIncomeLinks = computed(() =>
  (aiRecommendations.value?.incomeRecommendation?.links || [])
    .filter((item) => item?.url)
    .map((item, index) => ({
      id: item.url || `${item.platform || 'job-platform'}-${index}`,
      platform: item.platform || '채용 플랫폼',
      url: item.url,
    }))
    .slice(0, 3),
)

const aiIncomeSearchKeyword = computed(
  () => aiRecommendations.value?.incomeRecommendation?.searchKeyword || '',
)

const aiPolicyRecommendations = computed(() =>
  (aiRecommendations.value?.policyRecommendations || [])
    .map(mapPolicyResponse)
    .filter(Boolean)
    .slice(0, 3),
)

const activeAiRecommendations = computed(() => {
  if (category.value === 'expense') return aiExpenseRecommendations.value
  if (category.value === 'income') return aiIncomeRecommendations.value
  return aiPolicyRecommendations.value
})

const hasActiveAiRecommendations = computed(() =>
  category.value === 'income'
    ? aiIncomeRecommendations.value.length > 0 || aiIncomeLinks.value.length > 0
    : activeAiRecommendations.value.length > 0,
)

const aiRecommendationCopy = computed(
  () =>
    ({
      expense: {
        title: 'AI 지출 절약 추천',
        description: '최근 소비 내역을 바탕으로 실천 가능한 목표를 추천했어요.',
        empty: '현재 추가할 수 있는 지출 절약 추천이 없어요.',
      },
      income: {
        title: 'AI 수입 늘리기 추천',
        description: '내 조건에 맞는 일자리와 수입 계획을 추천했어요.',
        empty: '현재 조건에 맞는 수입 추천이 없어요.',
      },
      policy: {
        title: 'AI 맞춤 정책 추천',
        description: '프로필과 재정 상태를 바탕으로 정책을 추천했어요.',
        empty: '현재 추가할 수 있는 맞춤 정책 추천이 없어요.',
      },
    })[category.value],
)

const aiRecommendationDescription = computed(() => {
  const prompt = simulation.aiPlanPrompt
  if (!prompt || !usingCustomAiRecommendations.value) return aiRecommendationCopy.value.description
  return `“${prompt}” 컨셉을 바탕으로 추천했어요.`
})

function scopedCustomRecommendations(recommendations, currentCategory, prompt) {
  if (!recommendations || !prompt) return null

  const targets = aiRecommendationTargets(prompt)
  const financialItems = recommendations?.financialRecommendation?.recommendations || []
  const incomeItems = recommendations?.incomeRecommendation?.jobs || []
  const incomeLinks = recommendations?.incomeRecommendation?.links || []
  const policyItems = recommendations?.policyRecommendations || []
  const responseHasCategory = {
    expense: financialItems.length > 0,
    income: incomeItems.length > 0 || incomeLinks.length > 0,
    policy: policyItems.length > 0,
  }
  const hasExplicitTarget = Object.values(targets).some(Boolean)

  if (hasExplicitTarget ? !targets[currentCategory] : !responseHasCategory[currentCategory]) {
    return null
  }

  if (currentCategory !== 'expense') return recommendations

  return filterExpenseRecommendationsForPrompt(recommendations, prompt)
}

async function requestCustomRecommendationsForCategory(currentCategory, prompt) {
  return normalizeCategoryRecommendationResponse(
    currentCategory,
    await getCustomRecommendationsApi(String(prompt || '').trim()),
  )
}

async function submitAiRecommendationPrompt(prompt) {
  if (!prompt || aiRecommendationLoading.value) return

  aiRecommendationLoading.value = true
  aiRecommendationError.value = ''
  usingCustomAiRecommendations.value = true

  try {
    const recommendations = await requestCustomRecommendationsForCategory(category.value, prompt)
    const scopedRecommendations =
      category.value === 'expense'
        ? filterExpenseRecommendationsForPrompt(recommendations, prompt)
        : recommendations

    simulation.setAiPlanRecommendations(prompt, scopedRecommendations)
    aiRecommendations.value = scopedRecommendations
  } catch (error) {
    aiRecommendationError.value = aiRecommendationErrorMessage(error)
  } finally {
    aiRecommendationLoading.value = false
  }
}

function aiRecommendationErrorMessage(error) {
  if (error?.status === 503) return 'AI 추천을 지금 생성할 수 없어요. 잠시 후 다시 시도해 주세요.'
  if (error?.status === 401) return '로그인 정보가 없어 AI 추천을 불러오지 못했어요.'
  return error?.message || 'AI 추천을 불러오지 못했어요.'
}

async function loadAiRecommendations(regenerate = false) {
  if (aiRecommendationLoading.value) return

  const storedCustomRecommendations = scopedCustomRecommendations(
    simulation.aiPlanRecommendations,
    category.value,
    simulation.aiPlanPrompt,
  )

  if (!regenerate && storedCustomRecommendations) {
    aiRecommendations.value = storedCustomRecommendations
    usingCustomAiRecommendations.value = true
    aiRecommendationError.value = ''
    return
  }

  aiRecommendationLoading.value = true
  aiRecommendationError.value = ''
  try {
    if (regenerate && storedCustomRecommendations) {
      const recommendations = await requestCustomRecommendationsForCategory(
        category.value,
        simulation.aiPlanPrompt,
      )
      simulation.setAiPlanRecommendations(simulation.aiPlanPrompt, recommendations)
      aiRecommendations.value =
        scopedCustomRecommendations(recommendations, category.value, simulation.aiPlanPrompt) ||
        recommendations
      usingCustomAiRecommendations.value = true
    } else {
      aiRecommendations.value = normalizeCategoryRecommendationResponse(
        category.value,
        await getSimulationRecommendationsApi(),
      )
      usingCustomAiRecommendations.value = false
    }
  } catch (error) {
    aiRecommendationError.value = aiRecommendationErrorMessage(error)
  } finally {
    aiRecommendationLoading.value = false
  }
}

function aiExpenseSelected(item) {
  const expense = simulation.state.expenses.find((entry) => entry.id === item.expenseId)
  return Boolean(expense?.selected && Number(expense.saving) === Number(item.amount))
}

async function addAiExpense(item) {
  if (aiExpenseSelected(item) || simulation.syncing) return
  await simulation.saveExpenseGoal(item.expenseId, item.amount)
}

function aiIncomeAmount(item) {
  const enteredAmount = Number(aiIncomeAmounts[item.id])
  if (enteredAmount > 0) return enteredAmount
  return Number.isFinite(item.suggestedAmount) && item.suggestedAmount > 0
    ? item.suggestedAmount
    : 0
}

function updateAiIncomeAmount(item, event) {
  const digits = String(event.target.value || '').replace(/\D/g, '')
  aiIncomeAmounts[item.id] = digits ? String(Number(digits)) : ''
  event.target.value = moneyInput(aiIncomeAmounts[item.id])
}

function aiIncomeSelected(item) {
  return simulation.state.incomes.some(
    (income) =>
      income.aiRecommendationId === item.id || (item.url && income.sourceUrl === item.url),
  )
}

function addAiIncome(item) {
  const amount = aiIncomeAmount(item)
  if (!amount || aiIncomeSelected(item) || simulation.syncing) return
  simulation.addIncome({
    name: item.title || item.company || 'AI 추천 수입 계획',
    amount,
    type: 'monthly',
    startDate: simulation.state.startDate,
    cycle: '매월',
    sourceUrl: item.url || '',
    aiRecommendationId: item.id,
    remoteSynced: false,
  })
}

function aiPolicySelected(policy) {
  return simulation.state.policies.some((item) => item.id === policy.id)
}

function addAiPolicy(policy) {
  if (aiPolicySelected(policy) || simulation.syncing) return
  simulation.togglePolicy(policy)
}

function profilePolicyFilters() {
  // 현재 정책 API는 REEMPLOYMENT를 받으면 CATALOG_005를 반환한다.
  // 재취업 사용자를 미취업자로 간주하지 않고, 지원되는 첫취업만 자동 적용한다.
  const employment = session.currentUser.jobType === 'first' ? ['첫취업'] : []
  const region = normalizePolicyRegionFilter(session.currentUser.region)
  const supportedRegions = policyFilterGroups[2][1]
  return [...employment, ...(supportedRegions.includes(region) ? [region] : []), '신청 가능']
}

const selectedPolicyFilters = ref(profilePolicyFilters())
const policySupportAmount = ref(0)
const policyFilterModalOpen = ref(false)
const draftPolicyFilters = ref([])
const draftPolicySupportAmount = ref(0)

async function loadProfilePolicyCatalog() {
  selectedPolicyFilters.value = profilePolicyFilters()
  policySupportAmount.value = 0

  const params = toPolicySearchRequest(selectedPolicyFilters.value, 0, '', {
    page: 1,
    size: 10,
    age: calculateAge(session.currentUser.birth),
  })

  await simulation.loadPolicyCatalog(params)
}

const appliedPolicyEmployment = computed(
  () =>
    policyFilterGroups[0][1].find((item) => selectedPolicyFilters.value.includes(item)) || '전체',
)
const appliedPolicyRegion = computed(
  () =>
    policyFilterGroups[2][1].find((item) => selectedPolicyFilters.value.includes(item)) || '전체',
)
const appliedPolicyBadges = computed(() =>
  policyFilterGroups.flatMap(([label, items]) => {
    const selected = items.find((item) => selectedPolicyFilters.value.includes(item))
    return selected ? [{ label, value: selected }] : []
  }),
)

function openPolicyFilterModal() {
  draftPolicyFilters.value = [...selectedPolicyFilters.value]
  draftPolicySupportAmount.value = policySupportAmount.value
  policyFilterModalOpen.value = true
}

function closePolicyFilterModal() {
  policyFilterModalOpen.value = false
}

function togglePolicyFilter(group, item) {
  const [, groupItems] = group
  if (draftPolicyFilters.value.includes(item)) {
    draftPolicyFilters.value = draftPolicyFilters.value.filter((value) => value !== item)
    return
  }
  draftPolicyFilters.value = [
    ...draftPolicyFilters.value.filter((value) => !groupItems.includes(value)),
    item,
  ]
}

function resetPolicyFilters() {
  // 초기화 후에는 화면에 보이지 않는 프로필 조건도 요청에 포함하지 않는다.
  draftPolicyFilters.value = []
  draftPolicySupportAmount.value = 0
}

async function applyPolicyFilters() {
  selectedPolicyFilters.value = [...draftPolicyFilters.value]
  policySupportAmount.value = draftPolicySupportAmount.value
  const hasVisibleConditions =
    selectedPolicyFilters.value.length > 0 || policySupportAmount.value > 0
  const params = hasVisibleConditions
    ? toPolicySearchRequest(selectedPolicyFilters.value, policySupportAmount.value, '', {
        page: 1,
        size: 10,
        age: calculateAge(session.currentUser.birth),
      })
    : { page: 1, allStatuses: true }
  await simulation.loadPolicyCatalog(params)
  closePolicyFilterModal()
  policyCatalogScroll.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function movePolicyPage(page) {
  if (
    page < 1 ||
    page > simulation.policyCatalogPageInfo.totalPages ||
    page === simulation.policyCatalogPageInfo.page ||
    simulation.policyCatalogLoading
  )
    return
  await simulation.loadPolicyCatalogPage(page)
  policyCatalogScroll.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function retryPolicyFilters() {
  draftPolicyFilters.value = [...selectedPolicyFilters.value]
  draftPolicySupportAmount.value = policySupportAmount.value
  await applyPolicyFilters()
}

watch(
  category,
  (value) => {
    if (value === 'expense') simulation.initializeExpensesFromAnalysis()
  },
  { immediate: true },
)

watch(category, async (value, previousValue) => {
  if (value === 'policy' && previousValue !== 'policy') await loadProfilePolicyCatalog()
  if (!previousValue || value === previousValue) return

  aiRecommendations.value = null
  usingCustomAiRecommendations.value = false
  aiRecommendationError.value = ''
  await simulation.hydrateCategory(value)
  await loadAiRecommendations()
})

onMounted(async () => {
  if (category.value === 'expense') {
    try {
      await loadTransactions()
    } catch {}
    simulation.initializeExpensesFromAnalysis()
  }
  if (category.value === 'policy') await loadProfilePolicyCatalog()
  await simulation.hydrateCategory(category.value)
  await loadAiRecommendations()
})

const donutStyle = computed(() => {
  const total = simulation.totalCurrentExpense || 1
  let cursor = 0
  return {
    background: `conic-gradient(${simulation.expenseBreakdown
      .map((item) => {
        const start = cursor
        cursor += (item.current / total) * 100
        return `${item.color || '#b8bdc8'} ${start}% ${cursor}%`
      })
      .join(', ')})`,
  }
})

async function addIncome() {
  const amount = Number(form.amount)
  if (!form.name.trim() || amount <= 0) return
  const payload = {
    name: form.name.trim(),
    amount,
    type: form.type,
    startDate: form.startDate,
    cycle: form.type === 'monthly' ? form.cycle : '1회',
    remoteSynced: false,
  }
  if (editingIncomeId.value) {
    if (!(await simulation.saveIncomePlan(editingIncomeId.value, payload))) return
  } else simulation.addIncome(payload)
  resetIncomeForm()
}

function resetIncomeForm() {
  editingIncomeId.value = null
  Object.assign(form, {
    name: '',
    amount: '',
    type: 'monthly',
    startDate: simulation.state.startDate,
    cycle: '매월',
  })
}

function editIncome(item) {
  editingIncomeId.value = item.id
  Object.assign(form, {
    name: item.name,
    amount: String(item.amount),
    type: item.type,
    startDate: item.startDate,
    cycle: item.cycle || '매월',
  })
  document
    .querySelector('.income-plan-form')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function deleteIncome(id) {
  if (!(await simulation.deleteIncomePlan(id))) return
  if (editingIncomeId.value === id) resetIncomeForm()
}

const incomeIcon = (item) => (item.type === 'monthly' ? '♨' : '▦')
const incomeSchedule = (item) =>
  item.type === 'monthly'
    ? `${item.cycle || '매월'} ${Number(item.startDate?.slice(-2)) || 1}일`
    : `일회성 수입 · ${profileDate(item.startDate)}`

function selectExpense(item, loadSaved = false) {
  selectedExpenseId.value = item.id
  expenseAmount.value = loadSaved && item.saving ? String(item.saving) : ''
}

function updateExpenseAmount(event) {
  const maximum = Number(activeExpense.value?.current) || 0
  const rawValue = String(event.target.value ?? '').replace(/[^0-9]/g, '')
  const value = Math.max(0, Math.min(maximum, Math.trunc(Number(rawValue) || 0)))
  const normalized = event.target.type === 'range' ? Math.round(value / 100) * 100 : value
  expenseAmount.value = normalized ? String(normalized) : ''
  if (event.target.type !== 'range') event.target.value = moneyInput(expenseAmount.value)
}

function addQuickExpenseAmount(amount) {
  const maximum = Number(activeExpense.value?.current) || 0
  expenseAmount.value = String(Math.min(maximum, Number(expenseAmount.value || 0) + amount))
}

function updateIncomeAmount(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.amount = digits ? String(Number(digits)) : ''
  event.target.value = moneyInput(form.amount)
}

async function addExpenseGoal() {
  const amount = Number(expenseAmount.value)
  if (!activeExpense.value || amount <= 0 || amount > activeExpense.value.current) return
  if (!(await simulation.saveExpenseGoal(activeExpense.value.id, amount))) return
  const currentIndex = simulation.state.expenses.findIndex(
    (item) => item.id === activeExpense.value.id,
  )
  const nextExpense = simulation.state.expenses
    .slice(currentIndex + 1)
    .concat(simulation.state.expenses.slice(0, currentIndex + 1))
    .find((item) => !item.selected && item.current > 0)
  if (nextExpense) selectExpense(nextExpense)
  else expenseAmount.value = String(amount)
}

function editExpenseGoal(item) {
  selectExpense(item, true)
  document
    .querySelector('.expense-target-editor')
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function deleteExpenseGoal(item) {
  if (!(await simulation.deleteExpenseGoal(item.id))) return
  if (selectedExpenseId.value === item.id) expenseAmount.value = ''
}

async function deletePolicy(item) {
  await simulation.deletePolicyPlan(item.id)
}

async function apply(categoryName) {
  if (categoryName === 'expense') simulation.applyExpenses()
  const synced = await simulation.syncCategory(categoryName)
  if (!synced) return
  router.push(`/simulation/${categoryName}/preview`)
}

async function continueFromPolicy() {
  const synced = await simulation.syncCategory('policy')
  if (!synced) return
  router.push('/simulation/policy/preview')
}

function skip() {
  router.push(
    category.value === 'expense'
      ? '/simulation/income'
      : category.value === 'income'
        ? '/simulation/policy'
        : '/simulation/confirm',
  )
}
</script>

<template>
  <section class="page sim-page sim-wizard sim-category-page">
    <button
      class="sim-back simulation-back-button desktop-only"
      type="button"
      aria-label="뒤로가기"
      @click="router.push(backPath)"
    >
      <AppIcon name="chevron-left" :size="22" />
    </button>
    <div class="wizard-progress-tabs" aria-label="시뮬레이션 진행 단계">
      <RouterLink
        v-for="(step, index) in wizardSteps"
        :key="step.to"
        :to="step.to"
        class="wizard-progress-link"
        :aria-current="index + 1 === stepNumber ? 'step' : undefined"
      >
        <span :class="{ active: index + 1 === stepNumber, done: index + 1 < stepNumber }">
          {{ step.label }}<i />
        </span>
      </RouterLink>
    </div>

    <template v-if="category === 'expense'">
      <h1 class="wizard-title">소비 비중을 보고<br />줄이고 싶은 금액을 직접 입력하세요.</h1>
      <article class="expense-analysis-card">
        <div class="expense-analysis-total">
          <span>지난달 소비</span><strong>{{ money(simulation.totalCurrentExpense) }}원</strong>
        </div>
        <div class="expense-breakdown-heading">
          <h2>카테고리별 소비</h2>
        </div>
        <div class="expense-analysis-body">
          <div class="donut" :style="donutStyle" aria-label="지난달 카테고리별 소비 비중" />
          <div class="expense-breakdown-list">
            <ul class="expense-breakdown-list--mobile">
              <li v-for="item in visibleBreakdown" :key="item.id">
                <i :style="{ background: item.color }" /><span>{{ item.name }}</span
                ><strong
                  >{{ money(item.current) }}원<small
                    >{{
                      Math.round(
                        (item.current / Math.max(1, simulation.totalCurrentExpense)) * 100,
                      )
                    }}%</small
                  ></strong
                >
              </li>
            </ul>
            <ul class="expense-breakdown-list--desktop">
              <li v-for="item in simulation.expenseBreakdown" :key="item.id">
                <i :style="{ background: item.color }" /><span>{{ item.name }}</span
                ><strong
                  >{{ money(item.current) }}원<small
                    >{{
                      Math.round(
                        (item.current / Math.max(1, simulation.totalCurrentExpense)) * 100,
                      )
                    }}%</small
                  ></strong
                >
              </li>
            </ul>
            <div v-if="breakdownPageCount > 1" class="expense-breakdown-controls">
              <button
                class="arrow"
                type="button"
                aria-label="이전 소비 카테고리"
                :disabled="breakdownPage === 0"
                @click="moveBreakdownPage(-1)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                v-for="page in breakdownPages"
                :key="page"
                class="page-number"
                :class="{ active: page === breakdownPage }"
                type="button"
                :aria-label="`${page + 1}페이지`"
                :aria-current="page === breakdownPage ? 'page' : undefined"
                @click="breakdownPage = page"
              >
                {{ page + 1 }}
              </button>
              <button
                class="arrow"
                type="button"
                aria-label="다음 소비 카테고리"
                :disabled="breakdownPage === breakdownPageCount - 1"
                @click="moveBreakdownPage(1)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>
        <p v-if="financeState.loading">실제 소비 내역을 불러오는 중이에요…</p>
        <p v-else-if="financeState.error" class="form-error">{{ financeState.error }}</p>
      </article>

      <section class="expense-target-card">
        <header class="expense-target-heading">
          <h2>카테고리별 절약 목표 설정</h2>
        </header>
        <div class="expense-category-tabs">
          <button
            v-for="item in simulation.state.expenses"
            :key="item.id"
            :class="{ active: selectedExpenseId === item.id, done: item.selected }"
            type="button"
            @click="selectExpense(item, item.selected)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path :d="expenseIconPath(item.name)" />
            </svg>
            <span>{{ item.name }}</span>
          </button>
        </div>
        <div v-if="activeExpense" class="expense-target-editor">
          <div class="expense-target-info">
            <i
              ><svg viewBox="0 0 24 24" aria-hidden="true">
                <path :d="expenseIconPath(activeExpense.name)" /></svg></i
            ><strong>{{ activeExpense.name }}</strong
            ><span><small>저번 달 지출</small>{{ money(activeExpense.current) }}원</span>
          </div>
          <label class="expense-amount-field">
            <input
              class="expense-amount-input"
              :value="expenseAmount ? money(expenseAmount) : ''"
              type="text"
              inputmode="numeric"
              :disabled="activeExpense.current <= 0"
              placeholder="금액을 입력하세요"
              @input="updateExpenseAmount($event)"
            /><b>원</b>
          </label>
          <small class="expense-range-maximum">최대 {{ money(activeExpense.current) }}원까지</small>
          <input
            class="expense-amount-range"
            type="range"
            min="0"
            :max="expenseRangeMaximum"
            step="100"
            :value="Number(expenseAmount) || 0"
            :style="expenseRangeStyle"
            :disabled="expenseRangeMaximum <= 0"
            aria-label="절약 목표 금액"
            @input="updateExpenseAmount($event)"
          />
          <div class="expense-amount-options">
            <div>
              <button
                v-for="amount in expenseQuickAmounts"
                :key="amount"
                type="button"
                :disabled="activeExpense.current <= 0"
                @click="addQuickExpenseAmount(amount)"
              >
                +{{ money(amount) }}원
              </button>
            </div>
          </div>
          <small v-if="activeExpense.current <= 0"
            >지난달 {{ activeExpense.name }} 지출 내역이 없어 목표를 추가할 수 없어요.</small
          >
          <div class="expense-target-actions">
            <button
              v-if="activeExpense.selected"
              class="expense-remove-active"
              type="button"
              :disabled="simulation.syncing"
              @click="deleteExpenseGoal(activeExpense)"
            >
              삭제
            </button>
            <button
              class="expense-add-button simulation-primary-cta"
              :disabled="
                !Number(expenseAmount) ||
                Number(expenseAmount) > activeExpense.current ||
                simulation.syncing
              "
              type="button"
              @click="addExpenseGoal"
            >
              {{ activeExpense.selected ? '수정하기' : '추가하기' }}
            </button>
          </div>
        </div>
      </section>

      <AiRecommendationPrompt
        :category="category"
        :loading="aiRecommendationLoading"
        @submit="submitAiRecommendationPrompt"
      />
      <section class="ai-inline-recommendations" aria-live="polite">
        <header>
          <ButtieAiLogo class="ai-inline-recommendations__logo" />
          <div>
            <h2>{{ aiRecommendationCopy.title }}</h2>
            <p>{{ aiRecommendationDescription }}</p>
          </div>
          <button
            type="button"
            :disabled="aiRecommendationLoading"
            aria-label="AI 지출 추천 다시 불러오기"
            @click="loadAiRecommendations(true)"
          >
            ↻
          </button>
        </header>
        <AiRecommendationLoader v-if="aiRecommendationLoading" />
        <div v-else-if="aiRecommendationError" class="ai-inline-state ai-inline-state--error">
          <span>{{ aiRecommendationError }}</span>
          <button type="button" @click="loadAiRecommendations(true)">다시 시도</button>
        </div>
        <p v-else-if="!hasActiveAiRecommendations" class="ai-inline-state">
          {{ aiRecommendationCopy.empty }}
        </p>
        <div v-else class="ai-inline-list">
          <article v-for="item in aiExpenseRecommendations" :key="item.id">
            <div class="ai-inline-card-copy">
              <span>{{ item.name }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.reason }}</p>
              <small>지난달 {{ money(item.current) }}원 · 월 {{ money(item.amount) }}원 절약</small>
            </div>
            <button
              type="button"
              :class="{ added: aiExpenseSelected(item) }"
              :disabled="aiExpenseSelected(item) || simulation.syncing"
              @click="addAiExpense(item)"
            >
              {{ aiExpenseSelected(item) ? '추가됨' : '+ 추가' }}
            </button>
          </article>
        </div>
      </section>

      <section class="added-expense-goals">
        <div class="section-heading">
          <h2><i />추가한 지출 절약 목표</h2>
          <span>총 {{ simulation.selectedExpenses.length }}개</span>
        </div>
        <div v-if="!simulation.selectedExpenses.length" class="expense-goals-empty">
          아직 추가한 목표가 없어요.<br />위에서 카테고리를 골라 금액을 정해보세요.
        </div>
        <article v-for="item in simulation.selectedExpenses" :key="item.id">
          <i class="expense-goal-icon"
            ><svg viewBox="0 0 24 24" aria-hidden="true">
              <path :d="expenseIconPath(item.name)" /></svg></i
          ><strong class="expense-goal-name">{{ item.name }} 줄이기</strong>
          <div class="expense-goal-controls">
            <strong>-{{ goalAmount(item.saving) }}</strong
            ><span
              ><button
                class="expense-goal-edit"
                type="button"
                aria-label="수정"
                title="수정"
                @click="editExpenseGoal(item)"
              >
                <AppIcon name="edit" :size="17" /></button
              ><button
                class="expense-goal-delete"
                type="button"
                aria-label="삭제"
                title="삭제"
                @click="deleteExpenseGoal(item)"
              >
                <AppIcon name="trash" :size="17" /></button
            ></span>
          </div>
        </article>
        <footer>
          <span>지출 절약 합계</span><strong>월 {{ goalAmount(simulation.expenseSaving) }}</strong>
        </footer>
      </section>
      <div class="wizard-actions">
        <button class="sim-text-button" @click="skip">건너뛰기</button>
        <button
          class="sim-btn sim-btn--yellow simulation-primary-cta"
          :disabled="
            (!simulation.expenseSaving && !isEditingConfirmedScenario) || simulation.syncing
          "
          @click="apply('expense')"
        >
          적용하기
        </button>
      </div>
    </template>

    <template v-else-if="category === 'income'">
      <h1 class="wizard-title">수입을 늘릴 계획을 세워보세요</h1>
      <p class="sim-subtitle">추가한 수입은 시뮬레이션에 반영돼요.</p>
      <form class="income-plan-form" @submit.prevent="addIncome">
        <div class="income-form-heading">
          <strong>수입 계획 입력</strong
          ><button type="button" @click="resetIncomeForm">↻&nbsp; 초기화</button>
        </div>
        <label class="income-name-field"
          ><span>수입명</span
          ><input
            v-model="form.name"
            class="income-field"
            aria-label="수입명"
            placeholder="예: 주말 카페 아르바이트"
            required
        /></label>
        <label
          >예상 금액
          <div class="income-money-field">
            <input
              :value="moneyInput(form.amount)"
              type="text"
              inputmode="numeric"
              placeholder="금액 입력"
              required
              @keydown="['e', 'E', '+', '-'].includes($event.key) && $event.preventDefault()"
              @input="updateIncomeAmount"
            /><b>원</b>
          </div></label
        >
        <fieldset>
          <legend>수입 유형</legend>
          <button
            type="button"
            :class="{ active: form.type === 'monthly' }"
            @click="form.type = 'monthly'"
          >
            정기 수입</button
          ><button
            type="button"
            :class="{ active: form.type === 'once' }"
            @click="form.type = 'once'"
          >
            일회성 수입
          </button>
        </fieldset>
        <label
          >시작일<input v-model="form.startDate" class="income-field" type="date" required
        /></label>
        <label v-if="form.type === 'monthly'"
          >반복 주기<select v-model="form.cycle" class="income-field">
            <option>매월</option>
          </select></label
        >
        <button
          class="income-add-button simulation-primary-cta"
          type="submit"
          :disabled="simulation.syncing"
        >
          {{ editingIncomeId ? '수입 계획 수정하기' : '수입 계획 추가하기' }}
        </button>
      </form>
      <AiRecommendationPrompt
        :category="category"
        :loading="aiRecommendationLoading"
        @submit="submitAiRecommendationPrompt"
      />
      <section class="ai-inline-recommendations" aria-live="polite">
        <header>
          <ButtieAiLogo class="ai-inline-recommendations__logo" />
          <div>
            <h2>{{ aiRecommendationCopy.title }}</h2>
            <p>{{ aiRecommendationDescription }}</p>
          </div>
          <button
            type="button"
            :disabled="aiRecommendationLoading"
            aria-label="AI 수입 추천 다시 불러오기"
            @click="loadAiRecommendations(true)"
          >
            ↻
          </button>
        </header>
        <AiRecommendationLoader v-if="aiRecommendationLoading" />
        <div v-else-if="aiRecommendationError" class="ai-inline-state ai-inline-state--error">
          <span>{{ aiRecommendationError }}</span>
          <button type="button" @click="loadAiRecommendations(true)">다시 시도</button>
        </div>
        <p v-else-if="!hasActiveAiRecommendations" class="ai-inline-state">
          {{ aiRecommendationCopy.empty }}
        </p>
        <div v-else class="ai-inline-list">
          <article v-for="item in aiIncomeRecommendations" :key="item.id">
            <div class="ai-inline-card-copy">
              <span>{{ item.company || '추천 일자리' }}</span>
              <strong>{{ item.title || '수입 늘리기 계획' }}</strong>
              <p>
                {{ item.region || '지역 정보 없음' }} ·
                {{ item.employmentType || '고용 형태 확인 필요' }}
              </p>
              <small>
                {{ item.pay || '급여는 공고에서 확인해 주세요.' }}
                <template v-if="item.hasSuggestedAmount">
                  · 예상 월수입 {{ money(item.suggestedAmount) }}원
                </template>
              </small>
              <label v-if="!item.hasSuggestedAmount">
                <span>예상 월수입</span>
                <input
                  :value="moneyInput(aiIncomeAmounts[item.id])"
                  type="text"
                  inputmode="numeric"
                  placeholder="금액 입력"
                  @input="updateAiIncomeAmount(item, $event)"
                />
                <b>원</b>
              </label>
            </div>
            <div class="ai-inline-card-actions">
              <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer"
                >공고 보기</a
              >
              <button
                type="button"
                :class="{ added: aiIncomeSelected(item) }"
                :disabled="!aiIncomeAmount(item) || aiIncomeSelected(item) || simulation.syncing"
                @click="addAiIncome(item)"
              >
                {{ aiIncomeSelected(item) ? '추가됨' : '+ 추가' }}
              </button>
            </div>
          </article>
          <article v-for="link in aiIncomeLinks" :key="link.id">
            <div class="ai-inline-card-copy">
              <span>추천 채용 플랫폼</span>
              <strong>{{ link.platform }}</strong>
              <p v-if="aiIncomeSearchKeyword">
                “{{ aiIncomeSearchKeyword }}” 검색 결과를 확인해 보세요.
              </p>
              <p v-else>내 조건에 맞는 채용 공고를 확인해 보세요.</p>
            </div>
            <div class="ai-inline-card-actions">
              <a
                class="ai-income-platform-link"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                >공고 찾기</a
              >
            </div>
          </article>
        </div>
      </section>
      <section v-if="simulation.state.incomes.length" class="added-income-plans">
        <div class="section-heading">
          <h2><i />추가한 수입 계획</h2>
          <span>총 {{ simulation.state.incomes.length }}개</span>
        </div>
        <article v-for="item in simulation.state.incomes" :key="item.id">
          <i>{{ incomeIcon(item) }}</i>
          <div>
            <strong>{{ item.name }} <em v-if="item.type === 'monthly'">↻ 정기</em></strong
            ><small>{{ incomeSchedule(item) }}</small>
          </div>
          <div class="income-plan-controls">
            <strong>{{ goalAmount(item.amount) }}{{ item.type === 'once' ? ' (일시)' : '' }}</strong
            ><span
              ><button type="button" aria-label="수정" title="수정" @click="editIncome(item)">
                <AppIcon name="edit" :size="17" /></button
              ><button type="button" aria-label="삭제" title="삭제" @click="deleteIncome(item.id)">
                <AppIcon name="trash" :size="17" /></button
            ></span>
          </div>
        </article>
        <footer>
          <span>월 정기 수입 합계</span
          ><strong>+{{ goalAmount(simulation.recurringIncome) }} / 월</strong
          ><span>일시 수입 합계</span><strong>+{{ goalAmount(simulation.oneTimeIncome) }}</strong>
        </footer>
      </section>
      <div class="wizard-actions">
        <button class="sim-text-button" @click="skip">건너뛰기</button>
        <button
          class="sim-btn sim-btn--yellow simulation-primary-cta"
          :disabled="
            (!simulation.state.incomes.length && !isEditingConfirmedScenario) || simulation.syncing
          "
          @click="apply('income')"
        >
          시뮬레이션에 적용하기
        </button>
      </div>
    </template>

    <template v-else>
      <h1 class="wizard-title">나에게 맞는 정책을 찾아보세요</h1>

      <section class="policy-qualification">
        <div class="policy-section-heading">
          <div>
            <h2>자격 확인</h2>
            <p>프로필 정보가 초기 조건으로 적용돼요.</p>
          </div>
          <button
            class="policy-filter-icon-button"
            type="button"
            aria-label="정책 필터 수정"
            @click="openPolicyFilterModal"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>
        <div class="policy-condition-grid">
          <span
            >거주지역<strong>{{ appliedPolicyRegion }}</strong></span
          >
          <span
            >취업 준비 상태<strong>{{ appliedPolicyEmployment }}</strong></span
          >
          <span
            >가구원 수<strong>{{ session.currentUser.family || 1 }}명</strong></span
          >
        </div>
      </section>

      <section ref="policyCatalogScroll" class="policy-catalog-scroll">
        <div class="policy-catalog-heading">
          <h2>내 조건에 맞는 정책 모두 보기</h2>
          <div class="policy-profile-badges" aria-label="맞춤 정책 검색 조건">
            <span v-for="badge in appliedPolicyBadges" :key="`${badge.label}-${badge.value}`">
              <small>{{ badge.label }}</small
              >{{ badge.value }}
            </span>
            <span v-if="policySupportAmount">
              <small>지원 금액</small>{{ policySupportAmount }}만원 이상
            </span>
            <span v-if="!appliedPolicyBadges.length && !policySupportAmount">
              <small>상세 조건</small>제한 없음
            </span>
            <span
              ><small>가구원 수</small
              >{{ session.currentUser.family ? `${session.currentUser.family}명` : '미입력' }}</span
            >
          </div>
          <span>
            {{
              simulation.policyCatalogLoading
                ? '정책 조회 중'
                : `${simulation.policyCatalogPageInfo.totalElements}개`
            }}
          </span>
        </div>
        <p v-if="simulation.policyCatalogLoading" class="policy-selected-empty">
          맞춤 정책을 불러오는 중이에요.
        </p>
        <div v-else-if="simulation.policyCatalogError" class="api-notice">
          {{ simulation.policyCatalogError }}
          <button type="button" @click="retryPolicyFilters">다시 시도</button>
        </div>
        <p v-else-if="!simulation.policyCatalog.length" class="policy-selected-empty">
          현재 조건에 맞는 정책이 없어요.
        </p>
        <div v-else class="policy-catalog-list">
          <article
            v-for="policy in simulation.policyCatalog"
            :key="policy.id"
            :class="{ selected: simulation.state.policies.some((item) => item.id === policy.id) }"
          >
            <div>
              <h2>{{ policy.name }}</h2>
              <p>신청 기간 {{ policyApplicationPeriod(policy) }}</p>
              <button
                class="policy-detail-toggle"
                type="button"
                :aria-expanded="expandedPolicyIds.has(`catalog:${policy.id}`)"
                :aria-controls="`policy-details-${policy.id}`"
                @click="togglePolicyDetails(`catalog:${policy.id}`)"
              >
                <span>자세히 보기</span>
                <svg
                  :class="{ open: expandedPolicyIds.has(`catalog:${policy.id}`) }"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
            </div>
            <div
              v-if="expandedPolicyIds.has(`catalog:${policy.id}`)"
              :id="`policy-details-${policy.id}`"
              class="policy-detail-panel"
            >
              <p>
                <span>지원 혜택</span><strong>{{ policy.benefit || policy.detail }}</strong>
              </p>
              <p>
                <span>지원 기간</span><strong>{{ policy.months }}개월</strong>
              </p>
              <p>
                <span>신청 기한</span><strong>{{ policy.deadline }}</strong>
              </p>
              <p>
                <span>필요 서류</span
                ><strong>{{ policy.requiredDocument || '상세 페이지에서 확인' }}</strong>
              </p>
              <a v-if="policy.url" :href="policy.url" target="_blank" rel="noopener noreferrer"
                >정책 상세 페이지 열기</a
              >
            </div>
            <button
              class="policy-add-button"
              :class="{ added: simulation.state.policies.some((item) => item.id === policy.id) }"
              type="button"
              :disabled="simulation.syncing"
              @click="simulation.togglePolicy(policy)"
            >
              {{
                simulation.state.policies.some((item) => item.id === policy.id)
                  ? '✓ 추가됨'
                  : '+ 추가하기'
              }}
            </button>
            <strong>+{{ policy.detail }}</strong>
          </article>
        </div>
        <nav
          v-if="!simulation.policyCatalogLoading && simulation.policyCatalogPageInfo.totalPages > 1"
          class="policy-catalog-pagination"
          aria-label="맞춤 정책 페이지"
        >
          <button
            type="button"
            aria-label="이전 정책 페이지"
            :disabled="!simulation.policyCatalogPageInfo.hasPrevious"
            @click="movePolicyPage(simulation.policyCatalogPageInfo.page - 1)"
          >
            ‹
          </button>
          <button
            v-for="page in policyPageNumbers"
            :key="page"
            type="button"
            :class="{ active: page === simulation.policyCatalogPageInfo.page }"
            :aria-current="page === simulation.policyCatalogPageInfo.page ? 'page' : undefined"
            @click="movePolicyPage(page)"
          >
            {{ page }}
          </button>
          <button
            type="button"
            aria-label="다음 정책 페이지"
            :disabled="!simulation.policyCatalogPageInfo.hasNext"
            @click="movePolicyPage(simulation.policyCatalogPageInfo.page + 1)"
          >
            ›
          </button>
        </nav>
      </section>

      <AiRecommendationPrompt
        :category="category"
        :loading="aiRecommendationLoading"
        @submit="submitAiRecommendationPrompt"
      />
      <section class="ai-inline-recommendations" aria-live="polite">
        <header>
          <ButtieAiLogo class="ai-inline-recommendations__logo" />
          <div>
            <h2>{{ aiRecommendationCopy.title }}</h2>
            <p>{{ aiRecommendationDescription }}</p>
          </div>
          <button
            type="button"
            :disabled="aiRecommendationLoading"
            aria-label="AI 정책 추천 다시 불러오기"
            @click="loadAiRecommendations(true)"
          >
            ↻
          </button>
        </header>
        <AiRecommendationLoader v-if="aiRecommendationLoading" />
        <div v-else-if="aiRecommendationError" class="ai-inline-state ai-inline-state--error">
          <span>{{ aiRecommendationError }}</span>
          <button type="button" @click="loadAiRecommendations(true)">다시 시도</button>
        </div>
        <p v-else-if="!hasActiveAiRecommendations" class="ai-inline-state">
          {{ aiRecommendationCopy.empty }}
        </p>
        <div v-else class="ai-inline-list">
          <article v-for="policy in aiPolicyRecommendations" :key="policy.id">
            <div class="ai-inline-card-copy">
              <span>맞춤 정책</span>
              <strong>{{ policy.name }}</strong>
              <p>{{ policy.benefit || policy.detail }}</p>
              <p v-if="policy.recommendationReason" class="ai-policy-recommendation-reason">
                <b>추천 이유</b>
                {{ policy.recommendationReason }}
              </p>
              <small>신청 기한 {{ policy.deadline }}</small>
            </div>
            <div class="ai-inline-card-actions">
              <a v-if="policy.url" :href="policy.url" target="_blank" rel="noopener noreferrer"
                >상세 보기</a
              >
              <button
                type="button"
                :class="{ added: aiPolicySelected(policy) }"
                :disabled="aiPolicySelected(policy) || simulation.syncing"
                @click="addAiPolicy(policy)"
              >
                {{ aiPolicySelected(policy) ? '추가됨' : '+ 추가' }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="policy-selected-card">
        <div class="policy-selected-heading">
          <h2><i />추가한 정책</h2>
          <span>총 {{ policyCount }}개</span>
        </div>
        <p v-if="!policyCount" class="policy-selected-empty">선택한 정책이 없어요</p>
        <div v-else class="policy-selected-list">
          <article v-for="item in simulation.state.policies" :key="item.id">
            <i>⚖</i>
            <div class="policy-selected-copy">
              <strong>{{ item.name }}</strong
              ><small>신청 기간 {{ policyApplicationPeriod(item) }}</small>
            </div>
            <div class="policy-selected-meta">
              <button
                class="policy-detail-toggle"
                type="button"
                :aria-expanded="expandedPolicyIds.has(`selected:${item.id}`)"
                :aria-controls="`selected-policy-details-${item.id}`"
                @click="togglePolicyDetails(`selected:${item.id}`)"
              >
                <span>자세히 보기</span>
                <svg
                  :class="{ open: expandedPolicyIds.has(`selected:${item.id}`) }"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>
              <b>{{ item.detail }}</b>
            </div>
            <button
              class="policy-delete-action"
              type="button"
              aria-label="삭제"
              title="삭제"
              :disabled="simulation.syncing"
              @click="deletePolicy(item)"
            >
              <AppIcon name="trash" :size="17" />
            </button>
            <div
              v-if="expandedPolicyIds.has(`selected:${item.id}`)"
              :id="`selected-policy-details-${item.id}`"
              class="policy-detail-panel"
            >
              <p>
                <span>지원 혜택</span><strong>{{ item.benefit || item.detail }}</strong>
              </p>
              <p>
                <span>지원 기간</span><strong>{{ item.months }}개월</strong>
              </p>
              <p>
                <span>신청 기한</span><strong>{{ item.deadline }}</strong>
              </p>
              <p>
                <span>필요 서류</span
                ><strong>{{ item.requiredDocument || '상세 페이지에서 확인' }}</strong>
              </p>
              <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer"
                >정책 상세 페이지 열기</a
              >
            </div>
          </article>
        </div>
        <footer>
          <p>
            <span>월 정기 지원 합계</span
            ><strong>+{{ goalAmount(simulation.recurringPolicy) }} / 월</strong>
          </p>
          <p>
            <span>일시 지원 합계</span><strong>+{{ goalAmount(simulation.oneTimePolicy) }}</strong>
          </p>
        </footer>
      </section>

      <button
        class="sim-btn sim-btn--yellow wide simulation-primary-cta"
        :disabled="simulation.syncing"
        type="button"
        @click="continueFromPolicy"
      >
        시뮬레이션에 적용하기
      </button>
    </template>

    <Teleport to="body">
      <div
        v-if="policyFilterModalOpen"
        class="policy-filter-modal-backdrop"
        role="presentation"
        @click.self="closePolicyFilterModal"
      >
        <section
          class="policy-filter-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-filter-modal-title"
        >
          <header>
            <div>
              <h2 id="policy-filter-modal-title">정책 상세 필터</h2>
              <p>필요한 조건을 선택해 맞춤 정책을 다시 찾아보세요.</p>
            </div>
            <button type="button" aria-label="필터 닫기" @click="closePolicyFilterModal">×</button>
          </header>

          <div class="policy-filter-modal-body">
            <p class="policy-filter-guide">
              연령과 정책 조회 API가 지원하는 기본 거주 지역은 자동 반영돼요. 다른 지역을 선택하면
              선택한 지역을 우선 적용해요. 경남·경북은 대구, 전남·전북은 광주 정책으로 임시
              조회돼요.
            </p>
            <div class="policy-filter-groups">
              <section v-for="group in policyFilterGroups" :key="group[0]">
                <h3>{{ group[0] }}</h3>
                <div>
                  <button
                    v-for="item in group[1]"
                    :key="item"
                    type="button"
                    :class="{ active: draftPolicyFilters.includes(item) }"
                    @click="togglePolicyFilter(group, item)"
                  >
                    {{ item }}
                  </button>
                </div>
              </section>
              <section class="policy-amount-filter">
                <h3>지원 금액</h3>
                <div>
                  <input
                    v-model.number="draftPolicySupportAmount"
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    aria-label="최소 지원 금액"
                  />
                  <strong>
                    {{
                      draftPolicySupportAmount
                        ? `${draftPolicySupportAmount}만원 이상`
                        : '제한 없음'
                    }}
                  </strong>
                </div>
              </section>
            </div>
          </div>

          <footer>
            <button class="policy-filter-reset-button" type="button" @click="resetPolicyFilters">
              초기화
            </button>
            <button
              class="policy-filter-button"
              type="button"
              :disabled="simulation.policyCatalogLoading"
              @click="applyPolicyFilters"
            >
              {{
                simulation.policyCatalogLoading ? '정책을 찾는 중...' : '선택한 조건으로 정책 보기'
              }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>

    <p v-if="simulation.syncError" class="api-notice">
      서버 저장에 실패했습니다. 입력 내용은 유지되니 잠시 후 다시 시도해 주세요.
      {{ simulation.syncError }}
    </p>
  </section>
</template>

<style scoped>
.sim-category-page > .wizard-progress-tabs {
  margin: -4px -18px 28px;
  padding: 10px 18px 14px;
  background: transparent;
}

.wizard-progress-link {
  display: block;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.wizard-progress-link:focus-visible {
  border-radius: 4px;
  outline: 2px solid #f4ad1d;
  outline-offset: 4px;
}

.sim-category-page > .wizard-progress-tabs span {
  width: 100%;
  grid-template-columns: minmax(0, 1fr);
  font-size: 11px;
  cursor: pointer;
}

.sim-category-page > .wizard-progress-tabs span.active {
  font-size: 13px;
  font-weight: 900;
}

.ai-inline-recommendations {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgb(26 42 153 / 12%);
  border-radius: 22px;
  background: linear-gradient(145deg, #f7f8ff, #fff);
  box-shadow: 0 8px 24px rgb(26 42 153 / 7%);
}

.ai-recommendation-prompt + .ai-inline-recommendations {
  margin-top: 10px;
}

@media (min-width: 1280px) {
  .sim-category-page > .ai-recommendation-prompt,
  .sim-category-page > .ai-inline-recommendations {
    grid-column: 1 / -1;
    width: 100%;
    box-sizing: border-box;
    justify-self: stretch;
  }
}

.ai-inline-recommendations > header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 34px;
  gap: 11px;
  align-items: center;
}

.ai-inline-recommendations__logo {
  display: block;
  width: 42px;
  height: 42px;
}

.ai-inline-recommendations > header h2 {
  margin: 0;
  color: #17203a;
  font-size: 16px;
  font-weight: 900;
}

.ai-inline-recommendations > header p {
  margin: 4px 0 0;
  color: #747d90;
  font-size: 11px;
  line-height: 1.45;
}

.ai-inline-recommendations > header > button {
  width: 34px;
  height: 34px;
  border: 1px solid #e3e6f1;
  border-radius: 50%;
  background: #fff;
  color: #15239c;
  font-size: 18px;
}

.ai-inline-recommendations > header > button:disabled {
  opacity: 0.45;
}

.ai-inline-state {
  margin: 0;
  padding: 22px 14px;
  border-radius: 14px;
  background: #f3f4f8;
  color: #737b8b;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

.ai-inline-state--error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff1f1;
  color: #b34b4b;
  text-align: left;
}

.ai-inline-state--error button {
  flex: none;
  padding: 7px 10px;
  border-radius: 9px;
  background: #fff;
  color: #9f3333;
  font-size: 11px;
  font-weight: 800;
}

.ai-inline-list {
  display: grid;
  gap: 10px;
}

.ai-inline-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 15px;
  border: 1px solid #e8eaf3;
  border-radius: 16px;
  background: #fff;
}

.ai-inline-card-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.ai-inline-card-copy > span {
  color: #5662b4;
  font-size: 10px;
  font-weight: 800;
}

.ai-inline-card-copy > strong {
  overflow: hidden;
  color: #20263a;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
}

.ai-inline-card-copy > p,
.ai-inline-card-copy > small {
  margin: 0;
  color: #747d8f;
  font-size: 10px;
  line-height: 1.45;
}

.ai-inline-card-copy > small {
  color: #4d5870;
  font-weight: 700;
}

.ai-inline-card-copy > .ai-policy-recommendation-reason {
  display: grid;
  gap: 3px;
  margin: 3px 0;
  padding: 8px 9px;
  border-radius: 9px;
  background: #f3f4ff;
  color: #4c5572;
  font-size: 11px;
  line-height: 1.5;
}

.ai-policy-recommendation-reason b {
  color: #2634a7;
  font-size: 10px;
  font-weight: 900;
}

.ai-inline-card-copy > label {
  display: grid;
  grid-template-columns: auto minmax(90px, 1fr) auto;
  gap: 7px;
  align-items: center;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f4f5fa;
  color: #5b6477;
  font-size: 10px;
}

.ai-inline-card-copy > label input {
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #20263a;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.ai-inline-card-copy > label b {
  font-size: 10px;
}

.ai-inline-list article > button,
.ai-inline-card-actions > button {
  min-width: 58px;
  padding: 9px 11px;
  border-radius: 10px;
  background: #15239c;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.ai-inline-list button.added,
.ai-inline-list button:disabled {
  background: #eceef5;
  color: #8b92a2;
}

.ai-inline-card-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.ai-inline-card-actions a {
  color: #5360ad;
  font-size: 10px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ai-inline-card-actions .ai-income-platform-link {
  display: inline-flex;
  min-width: 74px;
  align-items: center;
  justify-content: center;
  padding: 9px 11px;
  border-radius: 10px;
  background: #15239c;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

@media (max-width: 420px) {
  .ai-inline-list article {
    grid-template-columns: 1fr;
  }

  .ai-inline-list article > button,
  .ai-inline-card-actions {
    width: 100%;
  }

  .ai-inline-card-actions {
    grid-template-columns: auto 1fr;
    align-items: center;
  }

  .ai-inline-card-actions > button {
    width: 100%;
  }
}

.expense-category-tabs button {
  font-size: 11px;
  font-weight: 500;
}

.expense-category-tabs button.active {
  font-weight: 700;
}

.sim-category-page .expense-target-info > strong {
  font-size: 15px;
}

.expense-target-info > span,
.expense-target-editor > label > span,
.expense-target-editor label b {
  font-size: 14px;
}

.expense-target-editor > label > span,
.expense-target-editor label b {
  font-size: 14px;
  font-weight: 700;
}

.expense-target-editor input::placeholder {
  font-size: 14px;
  font-weight: 700;
}

.expense-target-editor input,
.expense-target-editor label b {
  line-height: 14px;
}

.expense-target-editor label b {
  align-self: center;
}

.expense-analysis-body ul {
  gap: 9px;
}

.expense-breakdown-list {
  min-width: 0;
}

.expense-breakdown-list--desktop {
  display: none;
}

.expense-breakdown-heading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 12px;
  margin-bottom: 4px;
}

.expense-breakdown-heading h2 {
  margin-bottom: 0;
  color: #333d4b;
  font-size: 14px;
  font-weight: 800;
}

.expense-breakdown-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.expense-breakdown-controls button {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #8f8f8f;
}

.expense-breakdown-controls button svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.expense-breakdown-controls button:disabled {
  cursor: default;
  opacity: 0.28;
}

.expense-breakdown-controls .page-number {
  width: 25px !important;
  min-width: 25px !important;
  max-width: 25px !important;
  height: 25px !important;
  min-height: 25px !important;
  max-height: 25px !important;
  flex: 0 0 25px;
  padding: 0 !important;
  box-sizing: border-box;
  border-radius: 9px;
  background: #f4f4f2;
  color: #303030;
  font-size: 14px;
  font-weight: 700;
}

.expense-breakdown-controls .page-number.active {
  width: 25px !important;
  min-width: 25px !important;
  max-width: 25px !important;
  height: 25px !important;
  min-height: 25px !important;
  max-height: 25px !important;
  background: #ffedbd;
  color: #9b6400;
}

.expense-breakdown-controls .arrow {
  margin: 0 3px;
}

.expense-analysis-total > span {
  font-size: 20px !important;
  font-weight: 700 !important;
}

.sim-category-page .expense-analysis-card {
  padding: clamp(22px, 3vw, 30px);
}

.expense-analysis-body li {
  grid-template-columns: 9px minmax(0, 1fr) auto;
  column-gap: 7px;
  min-height: 30px;
  padding: 4px 0;
  border-bottom: 1px solid #eef0f2;
  font-size: 12px;
}

.expense-analysis-body li:last-child {
  border-bottom: 0;
}

.expense-analysis-body li > i,
.expense-analysis-body li > span {
  align-self: start;
}

.expense-analysis-body li > i {
  margin-top: 5px;
}

.expense-analysis-body li > strong {
  align-self: start;
  margin-left: 8px;
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}

.expense-analysis-body li small {
  font-size: 10px;
}

.expense-target-info svg,
.added-expense-goals article > i svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.expense-target-info > i,
.added-expense-goals article > i {
  color: #626c7b;
}

/* 첨부 디자인의 구성과 상태 표현을 적용하되 기존 페이지의 글자 규격은 유지한다. */
.sim-category-page .expense-target-card,
.sim-category-page .added-expense-goals {
  border: 1px solid rgb(0 0 0 / 6%);
  border-radius: 22px;
  background: #fff;
  box-shadow: none;
}

.sim-category-page .expense-target-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 22px 22px;
}

.expense-target-heading {
  display: grid;
  gap: 5px;
}

.sim-category-page .expense-target-heading h2 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.sim-category-page .expense-target-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 400;
}

.sim-category-page .expense-category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sim-category-page .expense-category-tabs button {
  display: inline-flex;
  width: auto;
  min-width: 0;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1.5px solid rgb(0 0 0 / 8%);
  border-radius: 999px;
  background: #f7f6f3;
  color: #57503f;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}

.sim-category-page .expense-category-tabs button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.sim-category-page .expense-category-tabs button.done {
  border-color: #f1b94c;
  background: #fbedb0;
  color: #7a5504;
  font-weight: 700;
}

.sim-category-page .expense-category-tabs button.active {
  border-color: #f1b94c;
  background: #f1b94c;
  color: #5e4204;
  font-weight: 700;
  box-shadow: 0 2px 6px rgb(210 160 40 / 28%);
}

.sim-category-page .expense-target-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgb(190 160 50 / 22%);
  border-radius: 18px;
  background: linear-gradient(160deg, #fef8de, #fbedb0);
}

.sim-category-page .expense-target-info {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
}

.sim-category-page .expense-target-info > i {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  color: #222;
}

.sim-category-page .expense-target-info > strong {
  color: var(--text);
  font-size: 15px;
  font-weight: 800;
}

.sim-category-page .expense-target-info > span {
  display: grid;
  justify-items: end;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.sim-category-page .expense-target-info > span small {
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}

.sim-category-page .expense-amount-field {
  position: relative;
  display: flex;
  height: 50px;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border: 1.5px solid rgb(190 160 50 / 30%);
  border-radius: 14px;
  background: #fff !important;
  background-color: #fff !important;
  box-shadow: none;
  overflow: hidden;
}

.sim-category-page .expense-amount-field input {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 50px !important;
  min-width: 0;
  padding: 0 44px 0 16px !important;
  border: 0 !important;
  outline: 0;
  appearance: none;
  background: #fff !important;
  background-color: #fff !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
  text-align: right;
}

:global(#app .app-shell .sim-page input.expense-amount-input),
:global(#app .app-shell .sim-page input.expense-amount-input:hover),
:global(#app .app-shell .sim-page input.expense-amount-input:focus),
:global(#app .app-shell .sim-page input.expense-amount-input:active) {
  border: 0 !important;
  border-radius: 14px !important;
  background: #fff !important;
  background-color: #fff !important;
  background-image: none !important;
  box-shadow: none !important;
}

.sim-category-page input.expense-amount-input,
.sim-category-page input.expense-amount-input:hover,
.sim-category-page input.expense-amount-input:focus,
.sim-category-page input.expense-amount-input:active {
  background: #fff !important;
  background-color: #fff !important;
  background-image: none !important;
  box-shadow: none !important;
  color-scheme: light;
}

.sim-category-page .expense-amount-field input:disabled {
  background: #fff !important;
  background-color: #fff !important;
  color: var(--muted);
  opacity: 1;
  -webkit-text-fill-color: var(--muted);
}

.sim-category-page .expense-amount-field b {
  position: relative;
  z-index: 1;
  margin-left: auto;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.sim-category-page .expense-amount-range {
  display: block;
  width: 100%;
  min-height: 0 !important;
  max-height: 22px !important;
  height: 22px !important;
  margin: 8px 0;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 999px;
  outline: none;
  appearance: none;
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

:global(#app .app-shell .sim-page input.expense-amount-range),
:global(#app .app-shell .sim-page input.expense-amount-range:hover),
:global(#app .app-shell .sim-page input.expense-amount-range:focus),
:global(#app .app-shell .sim-page input.expense-amount-range:active) {
  border: 0 !important;
  border-radius: 0 !important;
  background: #fff !important;
  background-color: #fff !important;
  background-image: none !important;
  box-shadow: none !important;
}

.sim-category-page .expense-amount-range::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    #f1b94c 0 var(--expense-range-progress),
    #fff var(--expense-range-progress) 100%
  );
}

.sim-category-page .expense-amount-range::-webkit-slider-thumb {
  width: 22px;
  height: 22px;
  appearance: none;
  border: 2.5px solid #f1b94c;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 18%);
  cursor: pointer;
  margin-top: -8px;
}

.sim-category-page .expense-amount-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 2.5px solid #f1b94c;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 18%);
}

.sim-category-page .expense-amount-range::-moz-range-track {
  width: 100%;
  height: 6px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    #f1b94c 0 var(--expense-range-progress),
    #fff var(--expense-range-progress) 100%
  );
}

.expense-amount-options,
.expense-amount-options > div,
.expense-target-actions {
  display: flex;
  align-items: center;
}

.expense-amount-options {
  justify-content: space-between;
  gap: 8px;
}

.expense-amount-options > div {
  flex-wrap: wrap;
  gap: 6px;
}

.sim-category-page .expense-amount-options button {
  padding: 6px 14px;
  border: 1px solid rgb(190 160 50 / 30%);
  border-radius: 999px;
  background: rgb(255 255 255 / 75%);
  color: #8a6407;
  font-size: var(--type-button-choice-size) !important;
  font-weight: var(--type-button-choice-weight) !important;
}

.expense-amount-options > small {
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.expense-range-maximum {
  display: block;
  align-self: flex-end;
  margin-bottom: -10px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  text-align: right;
  white-space: nowrap;
}

.expense-target-actions {
  gap: 8px;
}

.sim-category-page .expense-target-actions .expense-remove-active {
  height: 50px;
  padding: 0 18px;
  border: 1.5px solid rgb(0 0 0 / 9%);
  border-radius: 14px;
  background: #fff;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.sim-category-page .expense-target-actions .expense-add-button {
  min-width: 0;
  flex: 1;
  font-size: 14px;
}

.sim-category-page .added-expense-goals {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
}

.expense-goals-empty {
  padding: 26px;
  border: 1.5px dashed rgb(0 0 0 / 10%);
  border-radius: 16px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  text-align: center;
}

.sim-category-page .added-expense-goals article {
  padding: 14px 16px;
  border: 1px solid rgb(190 160 50 / 20%);
  border-radius: 16px;
  background: #fef8de;
  box-shadow: none;
}

.sim-category-page .added-expense-goals article > i {
  background: #fff;
  color: #222;
}

.sim-category-page .added-expense-goals article > strong {
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.sim-category-page .added-expense-goals .expense-goal-controls > strong {
  color: #222;
  font-size: 12px;
  font-weight: 800;
}

.sim-category-page .added-expense-goals .expense-goal-controls button,
.sim-category-page .added-expense-goals .expense-goal-controls button:first-child,
.sim-category-page .added-expense-goals .expense-goal-controls button:last-child {
  padding: 6px 7px;
  color: #666 !important;
  font-size: 11px;
  font-weight: 700;
}

.sim-category-page .added-expense-goals footer {
  margin-top: 0;
  padding-top: 14px;
  border-top: 1px solid rgb(0 0 0 / 7%);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.sim-category-page .added-expense-goals footer strong {
  color: var(--text);
  font-size: 16px;
  font-weight: 800;
}

@media (min-width: 768px) {
  .sim-category-page .expense-amount-options {
    flex-direction: column;
    align-items: flex-start;
  }

  .sim-category-page .expense-amount-options > div {
    width: 100%;
    flex-wrap: nowrap;
  }

  .sim-category-page .expense-amount-options > div > button {
    flex: 1 1 0;
    white-space: nowrap;
  }

  .sim-category-page .expense-amount-options > small {
    display: block;
    width: 100%;
  }

  .sim-category-page .expense-analysis-card {
    display: flex;
    flex-direction: column;
    padding: clamp(22px, 3vw, 30px);
  }

  .sim-category-page .expense-analysis-body {
    flex: 1;
    grid-template-columns: minmax(240px, 3fr) minmax(150px, 2fr);
    align-content: center;
    gap: 18px;
    margin-top: 8px;
  }

  .sim-category-page .expense-analysis-body .donut {
    width: min(100%, 260px);
    height: auto;
    aspect-ratio: 1;
    align-self: center;
    justify-self: center;
  }

  .sim-category-page .expense-breakdown-list {
    width: 100%;
  }

  .sim-category-page .expense-breakdown-list--mobile,
  .sim-category-page .expense-breakdown-controls {
    display: none;
  }

  .sim-category-page .expense-breakdown-list--desktop {
    display: grid;
  }

  .sim-category-page .expense-analysis-body li > span {
    font-size: 16px !important;
    font-weight: 900 !important;
  }

  .sim-category-page .expense-analysis-body li > strong {
    font-size: 15px !important;
    font-weight: 900 !important;
  }

  .sim-category-page .expense-analysis-body li small {
    font-size: 14px !important;
    font-weight: 600 !important;
  }
}

.policy-qualification {
  margin-top: 26px;
}

.policy-section-heading,
.policy-selected-heading,
.policy-catalog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.policy-section-heading h2,
.policy-selected-heading h2,
.policy-catalog-heading h2 {
  font-size: 16px;
}

.policy-section-heading p {
  margin-top: 4px;
  color: #8e95a2;
  font-size: 10px;
}

.policy-filter-icon-button {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  place-items: center;
  border: 1px solid #e4e6eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 6px rgb(20 30 60 / 10%);
}

.policy-filter-icon-button svg {
  width: 20px;
  fill: none;
  stroke: #14228f;
  stroke-linecap: round;
  stroke-width: 2;
}

.policy-condition-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.policy-condition-grid span {
  display: grid;
  min-width: 0;
  gap: 5px;
  padding: 12px;
  border-radius: 13px;
  background: #fff8d8;
  color: #9298a4;
  font-size: 14px;
}

.policy-condition-grid strong {
  overflow: hidden;
  color: #222;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.policy-filter-modal-backdrop {
  position: fixed;
  z-index: 2000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(20 25 45 / 52%);
}

.policy-filter-modal {
  display: flex;
  width: min(720px, 100%);
  max-height: min(820px, calc(100dvh - 40px));
  flex-direction: column;
  overflow: hidden;
  border-radius: 24px;
  background: #f7f8fa;
  box-shadow: 0 18px 60px rgb(0 0 0 / 25%);
}

.policy-filter-modal > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #e7e9ee;
  background: #fff;
}

.policy-filter-modal > header h2 {
  font-size: 20px;
}

.policy-filter-modal > header p {
  margin-top: 5px;
  color: #747c89;
  font-size: 13px;
}

.policy-filter-modal > header button {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  background: #f1f3f6;
  color: #48505d;
  font-size: 24px;
  line-height: 1;
}

.policy-filter-modal-body {
  min-height: 0;
  padding: 20px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.policy-filter-guide {
  padding: 14px 16px;
  border: 1px solid #f3cf69;
  border-radius: 14px;
  background: #fff0b5;
  color: #5d4b19;
  font-size: 12px;
  line-height: 1.55;
}

.policy-filter-groups {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.policy-filter-groups > section {
  display: grid;
  gap: 9px;
  padding: 12px;
  border-radius: 13px;
  background: #f7f6fc;
}

.policy-filter-groups h3 {
  font-size: 12px;
}

.policy-filter-groups section > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}

.policy-filter-groups button {
  min-height: 32px;
  padding: 7px 11px;
  border: 1px solid #e8eaf0;
  border-radius: 999px;
  background: #fff;
  color: #646b78;
  font-size: 10px;
  font-weight: 700;
}

.policy-filter-groups button.active {
  border-color: #efbd45;
  background: #ffeca4;
  color: #14228f;
}

.policy-amount-filter input {
  min-width: 120px;
  flex: 1;
  accent-color: #14228f;
}

.policy-amount-filter strong {
  flex: none;
  padding: 7px 10px;
  border-radius: 10px;
  background: #ffeca4;
  color: #14228f;
  font-size: 10px;
}

.policy-filter-button {
  min-width: 220px;
  min-height: 44px;
  border-radius: 999px;
  background: #ffeca4;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 2px 5px rgb(0 0 0 / 12%);
}

.policy-filter-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.policy-filter-modal > footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e7e9ee;
  background: #fff;
}

.policy-filter-reset-button {
  min-width: 90px;
  min-height: 44px;
  border-radius: 999px;
  background: #eef0f3;
  color: #68707d;
  font-weight: 700;
}

.policy-selected-card {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #e2e4e9;
  border-radius: 17px;
  background: #fff;
  box-shadow: 0 2px 6px rgb(20 30 60 / 12%);
}

.policy-selected-heading {
  align-items: center;
}

.policy-selected-heading h2 {
  display: flex;
  align-items: center;
  gap: 7px;
}

.policy-selected-heading i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8e79cd;
}

.policy-selected-heading span,
.policy-catalog-heading > span {
  color: #8e79cd;
  font-size: 11px;
  font-weight: 800;
}

.policy-selected-empty {
  min-height: 70px;
  display: grid;
  place-items: center;
  color: #777e8b;
  font-size: 12px;
}

.policy-selected-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.policy-selected-list article {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 11px;
  background: #f6f3fc;
}

.policy-selected-list article > i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  color: #8e79cd;
  font-style: normal;
}

.policy-selected-list article > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.policy-selected-list article strong,
.policy-selected-list article b {
  font-size: 10px;
}

.policy-selected-list article small {
  overflow: hidden;
  color: #8a8f9a;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.policy-selected-list article button {
  grid-column: 3;
  color: #ef6262;
  font-size: 9px;
}

.policy-selected-card footer {
  display: grid;
  gap: 7px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e7e8ec;
}

.policy-selected-card footer p {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #222222;
  font-size: 13px;
  font-weight: 700;
}

.policy-selected-card footer p > span {
  color: #222222;
  font-weight: 700;
}

.policy-selected-card footer strong {
  color: #222222;
  font-size: 14px;
  font-weight: 700;
}

.policy-catalog-scroll {
  max-height: 440px;
  margin-top: 16px;
  padding: 16px 10px 16px 12px;
  overflow-y: auto;
  overscroll-behavior-y: auto;
  border-radius: 17px;
  background: #f7f6fc;
  scrollbar-color: #c6c9d2 transparent;
  scrollbar-width: thin;
}

.policy-catalog-heading {
  position: sticky;
  z-index: 1;
  top: -16px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 14px;
  margin: -16px -10px 12px -12px;
  padding: 16px 12px 10px;
  background: #f7f6fc;
}

.policy-catalog-list {
  display: grid;
  gap: 10px;
}

.policy-catalog-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
}

.sim-category-page .policy-catalog-pagination button {
  display: grid;
  flex: 0 0 30px !important;
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  max-width: 30px !important;
  max-height: 30px !important;
  aspect-ratio: 1 / 1;
  place-items: center;
  box-sizing: border-box;
  padding: 0;
  border: 1px solid #e1e3ea;
  border-radius: 50%;
  background: #fff;
  color: #626977;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.sim-category-page .policy-catalog-pagination button.active {
  border-color: var(--primary, #0a1680);
  background: var(--primary, #0a1680);
  color: #fff;
}

.sim-category-page .policy-catalog-pagination button:disabled {
  cursor: default;
  opacity: 0.35;
}

.policy-catalog-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e2e4e9;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 1px 4px rgb(20 30 60 / 7%);
}

.policy-catalog-list article.selected {
  border-color: #a995df;
  background: #fcfaff;
}

.policy-catalog-list h2 {
  font-size: 13px;
}

.policy-catalog-list p {
  margin-top: 4px;
  color: #858c99;
  font-size: 9px;
}

.policy-catalog-list button {
  align-self: start;
  padding: 7px 10px;
  border-radius: 999px;
  background: #f6f3fc;
  color: #8e79cd;
  font-size: 9px;
  font-weight: 800;
}

.sim-category-page .policy-catalog-list .policy-add-button {
  grid-row: 3;
  grid-column: 2;
  justify-self: end;
}

.sim-category-page :is(.policy-catalog-list, .policy-selected-list) .policy-detail-toggle {
  display: inline-flex !important;
  height: 24px;
  min-height: 24px;
  align-items: center;
  justify-content: flex-start;
  justify-self: start;
  gap: 5px;
  padding: 0;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--primary, #0a1680) !important;
  font-size: 13px !important;
  font-weight: 400;
  line-height: 24px;
  white-space: nowrap;
  visibility: visible !important;
  opacity: 1 !important;
}

.sim-category-page .policy-catalog-list .policy-detail-toggle {
  z-index: 1;
  margin-top: 6px;
}

.sim-category-page :is(.policy-catalog-list, .policy-selected-list) .policy-detail-toggle:hover,
.sim-category-page :is(.policy-catalog-list, .policy-selected-list) .policy-detail-toggle:focus,
.sim-category-page :is(.policy-catalog-list, .policy-selected-list) .policy-detail-toggle:active {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.policy-detail-toggle > span {
  display: inline-flex;
  height: 24px;
  align-items: center;
  line-height: 24px;
  white-space: nowrap;
}

.policy-detail-toggle > svg {
  display: block;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
  transform-origin: center;
  transition: transform 0.18s ease;
}

.policy-detail-toggle > svg.open {
  transform: rotate(180deg);
}

.policy-detail-panel {
  display: grid;
  grid-column: 1 / -1;
  gap: 8px;
  padding: 12px;
  border-radius: 11px;
  background: #f7f6fc;
}

.sim-category-page .policy-catalog-list article > .policy-detail-panel {
  grid-row: 2;
  grid-column: 1 / -1;
  margin-top: 4px;
}

.sim-category-page .policy-detail-panel p {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 10px;
  margin: 0;
  font-size: 14px;
}

.policy-detail-panel p > span {
  color: #858c99;
}

.policy-detail-panel p > strong {
  color: #333d4b;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.policy-detail-panel > a {
  justify-self: end;
  color: #7e66c6;
  font-size: 12px;
  font-weight: 700;
  text-decoration: underline;
}

.policy-catalog-list article > small {
  color: #6f7580;
  font-size: 9px;
}

.policy-catalog-list article > strong {
  grid-row: 1;
  grid-column: 2;
  justify-self: end;
  margin-right: 0;
  text-align: right;
  font-size: 11px;
}

@media (max-width: 767px) {
  .policy-filter-modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .policy-filter-modal {
    width: 100%;
    max-height: 90dvh;
    border-radius: 22px 22px 0 0;
  }

  .policy-filter-modal > header {
    padding: 18px 20px 15px;
  }

  .policy-filter-modal > header h2 {
    font-size: 18px;
  }

  .policy-filter-modal > header p {
    font-size: 11px;
  }

  .policy-filter-modal-body {
    padding: 16px 18px;
  }

  .policy-filter-modal > footer {
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
  }

  .policy-filter-button {
    min-width: 0;
    flex: 1;
  }

  .sim-category-page > .wizard-progress-tabs {
    margin-top: -10px;
  }

  .sim-category-page .policy-catalog-heading {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 10px 8px;
  }

  .sim-category-page .policy-catalog-heading > h2 {
    min-width: 0;
    grid-row: 1;
    grid-column: 1;
    line-height: 1.35;
  }

  .sim-category-page .policy-catalog-heading > span {
    grid-row: 1;
    grid-column: 2;
    justify-self: end;
    white-space: nowrap;
  }

  .sim-category-page .policy-selected-empty {
    font-size: var(--type-empty-size);
    font-weight: var(--type-empty-weight);
  }

  .sim-category-page .added-expense-goals .expense-goal-controls > span > button {
    font-size: 12px !important;
  }

  .sim-category-page .added-expense-goals .expense-goal-controls > strong {
    font-size: 13px;
  }

  .sim-category-page .added-expense-goals .section-heading h2,
  .sim-category-page .added-income-plans .section-heading h2,
  .sim-category-page .policy-selected-heading h2 {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }

  .sim-category-page .added-expense-goals .section-heading > span,
  .sim-category-page .added-income-plans .section-heading > span,
  .sim-category-page .policy-selected-heading > span,
  .sim-category-page .policy-catalog-heading > span {
    font-size: var(--type-meta-size);
    font-weight: var(--type-meta-weight);
  }

  .sim-category-page .added-expense-goals article > strong {
    font-size: var(--type-item-size);
    font-weight: var(--type-item-weight);
  }

  .sim-category-page .added-income-plans article > div:nth-child(2) > strong,
  .sim-category-page .policy-selected-list article strong {
    font-size: var(--type-item-size);
    font-weight: var(--type-item-weight);
  }

  .sim-category-page .policy-catalog-list h2 {
    font-size: var(--type-item-size);
    font-weight: var(--type-item-weight);
  }

  .sim-category-page .added-income-plans .income-plan-controls > strong {
    font-size: 13px;
  }

  .sim-category-page .income-plan-form label,
  .sim-category-page .income-plan-form legend {
    font-size: var(--type-field-label-size);
    font-weight: var(--type-field-label-weight);
  }

  .sim-category-page .income-form-heading strong::after {
    font-size: 15px;
    font-weight: var(--type-field-label-weight);
  }

  .sim-category-page .income-form-heading {
    margin-bottom: -6px;
  }

  .sim-category-page input.income-field,
  .sim-category-page .income-money-field input,
  .sim-category-page .income-money-field b {
    font-size: 14px;
    font-weight: 700;
  }

  .sim-category-page .income-money-field input,
  .sim-category-page .income-name-field input.income-field,
  .sim-category-page input.income-field[type='date'],
  .sim-category-page select.income-field {
    font-size: var(--type-input-size);
    font-weight: var(--type-input-weight);
  }

  .sim-category-page .income-plan-form fieldset button {
    font-size: var(--type-button-choice-size) !important;
    font-weight: 700 !important;
  }

  .sim-category-page .added-expense-goals footer,
  .sim-category-page .added-expense-goals footer strong,
  .sim-category-page .added-income-plans footer,
  .sim-category-page .added-income-plans footer strong,
  .sim-category-page .policy-selected-card footer p,
  .sim-category-page .policy-selected-card footer span,
  .sim-category-page .policy-selected-card footer strong {
    font-size: var(--type-total-size) !important;
    font-weight: var(--type-total-weight) !important;
  }

  .sim-category-page .policy-selected-card footer p,
  .sim-category-page .policy-selected-card footer span,
  .sim-category-page .policy-selected-card footer strong {
    color: #222222 !important;
  }

  .expense-analysis-total > span {
    font-size: 14px;
  }

  .expense-analysis-body li > span {
    font-size: 14px;
    font-weight: 700;
  }

  .expense-analysis-body li > strong {
    font-size: 13px;
  }

  .expense-analysis-body li small {
    font-size: 12px;
  }

  .sim-category-page > .wizard-progress-tabs span {
    grid-template-rows: 20px 3px;
    align-items: end;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .sim-category-page > .wizard-progress-tabs span.active {
    font-size: 14px;
    font-weight: 700;
  }

  .policy-section-heading p,
  .policy-section-heading button,
  .policy-selected-heading span,
  .policy-catalog-heading > span,
  .policy-selected-list article small,
  .policy-selected-card footer p,
  .policy-catalog-list p,
  .policy-catalog-list article > small {
    font-size: 12px;
    font-weight: 400;
  }

  .policy-condition-grid span {
    font-size: 14px;
    font-weight: 400;
  }

  .policy-filter-button,
  .sim-category-page > .sim-btn.wide {
    font-size: 17px;
    font-weight: 800;
  }

  .policy-selected-list article button,
  .policy-catalog-list button {
    font-size: 12px;
    font-weight: 400;
  }

  .policy-section-heading h2,
  .policy-selected-heading h2,
  .policy-catalog-heading h2 {
    font-size: 16px;
    font-weight: 800;
  }

  .policy-condition-grid strong,
  .policy-selected-list article strong,
  .policy-selected-list article b,
  .policy-selected-card footer strong,
  .policy-catalog-list article > strong {
    font-size: 14px;
    font-weight: 700;
  }
}

@media (min-width: 768px) {
  .sim-category-page > .wizard-progress-tabs {
    width: 100%;
    padding-right: 0;
    padding-left: 0;
  }

  .sim-category-page > .wizard-progress-tabs span {
    font-size: 26px;
  }

  .sim-category-page > .wizard-progress-tabs span.active {
    font-size: 29px;
  }

  .expense-analysis-body li,
  .expense-analysis-body li > strong {
    font-size: 13px;
  }

  .expense-analysis-body li small {
    font-size: 11px;
  }

  .policy-section-heading h2,
  .policy-selected-heading h2,
  .policy-catalog-heading h2 {
    font-size: 18px;
  }

  .policy-section-heading p,
  .policy-section-heading button {
    font-size: 12px;
  }

  .policy-filter-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .policy-filter-groups > section {
    padding: 16px;
  }

  .policy-filter-groups h3,
  .policy-filter-groups button,
  .policy-amount-filter strong,
  .policy-filter-button {
    font-size: 14px;
  }

  .policy-amount-filter {
    grid-column: 1 / -1;
  }

  .policy-selected-card,
  .policy-catalog-scroll {
    padding: 22px;
  }

  .policy-catalog-heading {
    top: -22px;
    margin: -22px -22px 16px;
    padding: 22px 22px 12px;
  }

  .policy-catalog-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .policy-catalog-list h2 {
    font-size: 15px;
  }

  .policy-catalog-list p,
  .policy-catalog-list button,
  .policy-catalog-list article > small {
    font-size: 11px;
  }

  .policy-catalog-list article > strong {
    font-size: 13px;
  }
}
/* 추천 목록과 추가 목록에서 동일한 정책 정보는 같은 타이포그래피를 사용한다. */
.sim-category-page .policy-catalog-list h2,
.sim-category-page .policy-selected-list article > div > strong {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.sim-category-page .policy-catalog-list p,
.sim-category-page .policy-selected-list article > div > small {
  color: #858c99;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
}

.sim-category-page .policy-catalog-list article > strong,
.sim-category-page .policy-selected-list .policy-selected-meta > b {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.sim-category-page .policy-catalog-list article > strong {
  font-size: 15px;
  font-weight: 800;
}

.sim-category-page .policy-selected-list article {
  position: relative;
  grid-template-columns: 42px minmax(0, 1fr) !important;
  grid-template-rows: auto auto;
  align-items: center;
  padding: 14px;
}

.sim-category-page .policy-selected-list article > i {
  grid-row: 1;
  grid-column: 1;
  align-self: start;
}

.sim-category-page .policy-selected-list article > .policy-selected-copy {
  grid-row: 1;
  grid-column: 2;
  padding-right: 44px;
}

.sim-category-page .policy-selected-list article > .policy-selected-meta {
  display: flex;
  grid-row: 2;
  grid-column: 2;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  margin-top: 6px;
}

.sim-category-page .policy-selected-list .policy-selected-meta > b {
  margin-left: auto;
  text-align: right;
}

.sim-category-page .policy-selected-list article > button {
  position: absolute;
  top: 10px;
  right: 10px;
  grid-column: auto;
  margin: 0;
  padding: 5px 7px;
}

.sim-category-page .policy-selected-list article > .policy-detail-panel {
  grid-row: 3;
  grid-column: 1 / -1;
  margin-top: 4px;
}

.sim-category-page .policy-catalog-heading > span,
.sim-category-page .policy-selected-heading > span {
  font-size: 15px;
  font-weight: 800;
}

.sim-category-page .policy-selected-card footer strong {
  font-size: 14px;
}

@media (max-width: 767px) {
  .sim-category-page .expense-target-card {
    gap: 10px;
    margin-top: 10px;
    padding-top: 18px;
  }

  .sim-category-page .expense-target-heading,
  .sim-category-page .expense-target-heading h2 {
    margin-top: 0;
    margin-bottom: 0;
  }

  .sim-category-page .expense-category-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin-top: 3px;
    margin-bottom: 3px;
  }

  .sim-category-page .expense-target-editor {
    gap: 10px;
    margin-top: 0;
    padding: 14px;
  }

  .sim-category-page .expense-target-info {
    padding-bottom: 8px;
  }

  .sim-category-page .expense-target-editor > .expense-amount-field {
    margin-top: 0;
  }

  .sim-category-page .expense-target-editor > .expense-range-maximum {
    margin-top: 0;
    margin-bottom: 0;
  }

  .sim-category-page .expense-target-editor > .expense-amount-range {
    margin-top: 0;
    margin-bottom: 0;
  }

  .sim-category-page .expense-target-actions .expense-add-button {
    margin-top: 0;
  }

  :global(#app .app-shell .sim-category-page .expense-category-tabs button) {
    width: 100%;
    min-width: 0;
    min-height: 36px;
    justify-content: center;
    gap: 0;
    padding: 6px 2px;
    font-size: var(--type-button-choice-size) !important;
    font-weight: var(--type-button-choice-weight) !important;
    letter-spacing: -0.4px;
  }

  .sim-category-page .expense-category-tabs button svg {
    display: none;
  }

  .sim-category-page .expense-amount-options > div {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
  }

  :global(#app .app-shell .sim-category-page .expense-amount-options button) {
    width: 100%;
    min-width: 0;
    min-height: 24px;
    padding: 2px;
    font-size: 13px !important;
    font-weight: 600;
    white-space: nowrap;
  }
}

/* 추가된 절약 목표 행은 모든 화면에서 한 줄 높이와 동작 간격을 작게 유지한다. */
.sim-category-page .added-expense-goals article {
  min-height: 0;
  gap: 8px;
  padding: 9px 12px;
}

.sim-category-page .added-expense-goals article > i {
  width: 26px;
  height: 26px;
}

.sim-category-page .added-expense-goals .expense-goal-controls {
  display: grid;
  min-width: 0;
  justify-items: end;
  gap: 2px;
}

.sim-category-page .added-expense-goals .expense-goal-controls > span {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.sim-category-page .added-expense-goals .expense-goal-controls > span > button,
.sim-category-page .added-expense-goals .expense-goal-controls > span > button:first-child,
.sim-category-page .added-expense-goals .expense-goal-controls > span > button:last-child {
  width: auto;
  min-width: 0;
  min-height: 0;
  margin: 0;
  padding: 2px 1px;
  line-height: 1.2;
}

.sim-category-page .added-expense-goals {
  gap: 7px;
}

.sim-category-page .added-expense-goals article {
  grid-template-columns: 20px minmax(0, 1fr) auto !important;
  column-gap: 8px;
  row-gap: 0;
  margin-top: 0;
  padding: 6px 10px;
}

.sim-category-page .added-expense-goals article > i {
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  justify-self: center;
}

.sim-category-page .added-expense-goals article > i svg {
  width: 16px;
  height: 16px;
}

.sim-category-page .added-expense-goals article > strong {
  min-width: 0;
  align-self: center;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sim-category-page .added-expense-goals .expense-goal-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  padding-right: 1px;
}

.sim-category-page .added-expense-goals .expense-goal-controls > strong {
  line-height: 1.2;
  white-space: nowrap;
}

.sim-category-page .added-expense-goals .expense-goal-controls > span {
  gap: 6px;
  white-space: nowrap;
}

.sim-category-page .expense-goal-controls > span > button,
.sim-category-page .income-plan-controls > span > button {
  display: grid;
  width: 24px;
  min-width: 24px;
  height: 24px;
  min-height: 24px;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-decoration: none;
}

.sim-category-page .expense-goal-controls > span > button:hover,
.sim-category-page .income-plan-controls > span > button:hover {
  background: #f5f2ea;
}

.sim-category-page .expense-goal-controls > span > button .app-icon,
.sim-category-page .income-plan-controls > span > button .app-icon {
  width: 17px;
  height: 17px;
}

.sim-category-page .expense-goal-controls > span > button:first-child,
.sim-category-page .income-plan-controls > span > button:first-child {
  color: #5f8df7 !important;
}

.sim-category-page .expense-goal-controls > span > button:last-child,
.sim-category-page .income-plan-controls > span > button:last-child {
  color: #ef5b5b !important;
}

.sim-category-page .policy-selected-list article > button.policy-delete-action {
  display: grid;
  width: 24px;
  min-width: 24px;
  height: 24px;
  min-height: 24px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #ef5b5b !important;
}

.sim-category-page .policy-selected-list article > button.policy-delete-action:hover {
  background: #fff0f0;
}

.sim-category-page .policy-selected-list article > button.policy-delete-action .app-icon {
  width: 17px;
  height: 17px;
}

@media (max-width: 767px) {
  .sim-category-page .added-expense-goals article {
    grid-template-columns: 18px minmax(0, 1fr) auto !important;
    column-gap: 6px;
  }

  .sim-category-page .added-expense-goals article > i {
    width: 16px;
    height: 16px;
  }

  .sim-category-page .added-expense-goals article > i svg {
    width: 14px;
    height: 14px;
  }

  :global(#app .app-shell main .sim-category-page .added-expense-goals article > strong),
  :global(
    #app .app-shell main .sim-category-page .added-expense-goals .expense-goal-controls > strong
  ),
  :global(
    #app
      .app-shell
      main
      .sim-category-page
      .added-expense-goals
      .expense-goal-controls
      > span
      > button
  ) {
    font-size: 13px !important;
  }
}

/* 기존 공통 !important 규칙보다 우선해 지출 목표 행의 실제 배치를 고정한다. */
:global(#app .app-shell main .sim-category-page .added-expense-goals article) {
  grid-template-columns: 30px minmax(0, 1fr) auto !important;
  column-gap: 10px !important;
  padding: 6px 14px !important;
}

:global(
  #app .app-shell main .sim-category-page .added-expense-goals article > i.expense-goal-icon
) {
  display: grid !important;
  width: 30px !important;
  min-width: 30px !important;
  height: 30px !important;
  min-height: 30px !important;
  justify-self: center;
  place-items: center;
  box-sizing: border-box;
}

:global(
  #app .app-shell main .sim-category-page .added-expense-goals article > i.expense-goal-icon svg
) {
  /* 실제 SVG 아이콘 */
  width: 20px !important;
  height: 20px !important;
}

:global(
  #app .app-shell main .sim-category-page .added-expense-goals article > strong.expense-goal-name
) {
  min-width: 0 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(#app .app-shell main .sim-category-page .added-expense-goals button.expense-goal-edit) {
  color: #5f8df7 !important;
}

:global(#app .app-shell main .sim-category-page .added-expense-goals button.expense-goal-delete) {
  color: #ef5b5b !important;
}
</style>
