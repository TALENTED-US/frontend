<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { dashboard } from '@/data/mockData'
import { getButtieDashboardApi } from '@/api/dashboard'
import { getMyDataAssetsApi } from '@/api/mydata'
import ButtieImage from '@/components/ui/ButtieImage.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MyDataConnectModal from '@/components/ui/MyDataConnectModal.vue'
import QuestOverview from '@/features/quest/components/QuestOverview.vue'
import { normalizeExternalUrl } from '@/utils/externalUrl'
import { useSessionStore } from '@/stores/session'
import { getButtieLevelImage } from '@/data/buttieLevelAssets'
import { pickButtieMessage } from '@/data/buttieMessages'
import {
  financeState,
  financeTransactions,
  loadTransactions,
} from '@/features/finance/financeStore'
import { analyzePreviousCompletedMonths } from '@/features/finance/financeAnalytics'
import { formatPrepMonths, isInfinitePrepMonths } from '@/utils/prepMonths'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useQuestStore } from '@/features/quest/stores/quest'
import {
  calculateQuestExp,
  formatExp,
  normalizeButtieProgression,
  useProgressionStore,
} from '@/stores/progression'

const router = useRouter()
const session = useSessionStore()
const simulation = useSimulationStore()
const progression = useProgressionStore()
const quests = useQuestStore()
const buttieDashboard = ref(null)
const dashboardApiError = ref('')
const dashboardApiLoading = ref(false)
const financialAssets = ref(null)
const financialAssetsError = ref('')
const showMyDataConnectModal = ref(false)

function isMyDataConnected() {
  return session.myDataConnected || session.currentUser.mydataStatus === 'CONNECTED'
}

function goToMyDataConnect() {
  showMyDataConnectModal.value = false
  router.push({ name: 'onboarding', query: { mode: 'mydata', returnTo: '/dashboard' } })
}

function finiteNumberOrNull(value) {
  const number = Number(value)
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null
}
async function loadButtieDashboard() {
  if (session.isMockMode) return
  dashboardApiLoading.value = true
  dashboardApiError.value = ''
  try {
    buttieDashboard.value = await getButtieDashboardApi()
    const normalized = normalizeButtieProgression(buttieDashboard.value.buttieTotalExp)
    Object.assign(session.currentUser, {
      level: normalized.level,
      exp: normalized.exp,
      totalExp: normalized.totalExp,
      requiredExp: normalized.requiredExp,
      buttieImageUrl: buttieDashboard.value.buttieImageUrl,
      riskLevel: buttieDashboard.value.riskLevel,
      goalDate: buttieDashboard.value.targetEmploymentDate,
    })
  } catch (error) {
    dashboardApiError.value = error.message || '버티 대시보드를 불러오지 못했습니다.'
  } finally {
    dashboardApiLoading.value = false
  }
}

async function loadFinancialAssets() {
  if (session.isMockMode) {
    financialAssets.value = dashboard.totalAssets
    return
  }
  const draft = quests.remoteEnabled ? await simulation.hydrateDraft() : null
  if (draft) {
    quests.resetQuests()
    return
  }
  if (simulation.syncError) return

  if (!isMyDataConnected()) {
    financialAssets.value = null
    financialAssetsError.value = ''
    showMyDataConnectModal.value = true
    return
  }

  financialAssetsError.value = ''
  try {
    const assets = await getMyDataAssetsApi()
    const accounts = Array.isArray(assets?.accounts) ? assets.accounts : []
    financialAssets.value = accounts
      .filter((account) => account.isConsent !== false)
      .reduce((sum, account) => sum + (finiteNumberOrNull(account.balance) ?? 0), 0)
  } catch (error) {
    if (error.code === 'MYDATA_007') {
      financialAssets.value = null
      financialAssetsError.value = ''
      return
    }
    financialAssets.value = null
    financialAssetsError.value = error.message || '계좌 잔액을 불러오지 못했습니다.'
  }
}

onMounted(async () => {
  await Promise.all([
    loadButtieDashboard(),
    loadFinancialAssets(),
    loadTransactions().catch(() => null),
  ])
  const confirmed = await simulation.hydrateConfirmed()
  if (confirmed) await quests.fetchQuests(confirmed.simulationId, confirmed)
})
const DAY_MS = 24 * 60 * 60 * 1000
const AVERAGE_MONTH_DAYS = 365.2425 / 12
const LEVEL_TITLES = Object.freeze({
  1: '새싹 버티',
  2: '기사 버티',
  3: '황금 버티',
  4: '천사 버티',
  5: '수호신 버티',
})
const LEVEL_DESCRIPTIONS = Object.freeze([
  { level: 1, title: '새싹 버티', description: '이제 막 자산관리를 시작한 기본 버티' },
  { level: 2, title: '기사 버티', description: '재정 습관이 자라나는 버티' },
  { level: 3, title: '황금 버티', description: '자산을 불려가는 황금빛 버티' },
  { level: 4, title: '천사 버티', description: '자산을 든든히 지키는 버티' },
  { level: 5, title: '수호신 버티', description: '재정을 완성한 최고 단계 버티' },
])
const POLICY_APPLICATION_URLS = Object.freeze({
  국민취업지원제도: 'https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do',
  '청년 월세 특별지원': 'https://housing.seoul.go.kr/site/main/content/sh01_060513',
  '청년 월세 지원': 'https://housing.seoul.go.kr/site/main/content/sh01_060513',
  청년도약계좌: 'https://www.kinfa.or.kr/financialProduct/youthLeapAccount.do',
  'KB 청년도약계좌': 'https://www.kinfa.or.kr/financialProduct/youthLeapAccount.do',
  'youth-saving': 'https://www.kinfa.or.kr/financialProduct/youthLeapAccount.do',
})
const levelInfoOpen = ref(false)
const levelTitle = computed(() => LEVEL_TITLES[buttieLevel.value] || LEVEL_TITLES[1])
const levelMessage = ref('')

function parseLocalDate(value) {
  const [year, month, day] = String(value || '')
    .replaceAll('.', '-')
    .split('-')
    .map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function startOfToday() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

function differenceInDays(from, to) {
  if (!from || !to) return 0
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS))
}

function addMonthsClamped(date, months) {
  const result = new Date(date)
  const targetDay = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(targetDay, lastDay))
  return result
}

function calendarDuration(from, to) {
  if (!from || !to || to <= from) return { months: 0, days: 0 }

  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth()
  let anchor = addMonthsClamped(from, months)

  if (anchor > to) {
    months -= 1
    anchor = addMonthsClamped(from, months)
  }

  return {
    months,
    days: Math.max(0, Math.round((to.getTime() - anchor.getTime()) / DAY_MS)),
  }
}

function formatWon(value, { sign = false } = {}) {
  const amount = Math.round(Number(value) || 0)
  const prefix = sign && amount > 0 ? '+' : ''
  return `${prefix}${amount.toLocaleString('ko-KR')}원`
}

function formatCompactWon(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0))

  if (amount >= 10000 && amount % 10000 === 0) {
    return `${(amount / 10000).toLocaleString('ko-KR')}만원`
  }

  return formatWon(amount)
}

function formatOptionalCompactWon(value) {
  return finiteNumberOrNull(value) === null ? '-' : formatCompactWon(value)
}

function formatSignedCompactWon(value) {
  const amount = Math.round(Number(value) || 0)
  if (!amount) return formatCompactWon(0)
  return `${amount > 0 ? '+' : '-'}${formatCompactWon(Math.abs(amount))}`
}

function formatMonthLabel(date) {
  return `${String(date.getFullYear()).slice(2)}년 ${date.getMonth() + 1}월`
}

function formatDateDots(value) {
  const date = parseLocalDate(value)
  if (!date) return ''
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('.')
}

function expenseQuestName(name) {
  return name === '교통' ? '교통비' : name
}

const currentUser = computed(() => session.currentUser)
const apiButtieProgression = computed(() =>
  buttieDashboard.value ? normalizeButtieProgression(buttieDashboard.value.buttieTotalExp) : null,
)
const buttieExp = computed(() => apiButtieProgression.value?.exp ?? progression.exp)
const buttieRequiredExp = computed(
  () => apiButtieProgression.value?.requiredExp ?? progression.nextLevelExp,
)
const buttieLevel = computed(() => apiButtieProgression.value?.level ?? progression.level)
const buttieRemainingExp = computed(() => Math.max(0, buttieRequiredExp.value - buttieExp.value))
const buttieProgressPercent = computed(() =>
  buttieRequiredExp.value > 0
    ? Math.min(100, Math.max(0, (buttieExp.value / buttieRequiredExp.value) * 100))
    : 100,
)
const today = computed(() => startOfToday())
const preparationStartDate = computed(() => parseLocalDate(currentUser.value.startDate))
const targetEmploymentDate = computed(() =>
  parseLocalDate(
    buttieDashboard.value?.targetEmploymentDate ||
      currentUser.value.goalDate ||
      currentUser.value.targetDate,
  ),
)

const remainingDays = computed(() => differenceInDays(today.value, targetEmploymentDate.value))
const remainingMonthsValue = computed(() => remainingDays.value / AVERAGE_MONTH_DAYS)
const remainingDuration = computed(() => calendarDuration(today.value, targetEmploymentDate.value))
const preparationDuration = computed(() =>
  calendarDuration(preparationStartDate.value, targetEmploymentDate.value),
)
const preparationMonthsValue = computed(
  () => preparationDuration.value.months + preparationDuration.value.days / AVERAGE_MONTH_DAYS,
)

const totalAssets = computed(() =>
  session.isMockMode
    ? Math.max(0, Number(dashboard.totalAssets) || 0)
    : finiteNumberOrNull(financialAssets.value),
)
const recentFinancialAnalysis = computed(() =>
  analyzePreviousCompletedMonths(financeTransactions.value, today.value),
)
const monthlyExpense = computed(() => recentFinancialAnalysis.value.monthlyExpense)
const monthlyIncome = computed(() => recentFinancialAnalysis.value.monthlyIncome)
const hasConfirmedSimulationDurations = computed(
  () =>
    simulation.recentConfirmed?.currentMonths !== null &&
    simulation.recentConfirmed?.currentMonths !== undefined &&
    simulation.recentConfirmed?.expectedMonths !== null &&
    simulation.recentConfirmed?.expectedMonths !== undefined &&
    Number.isFinite(Number(simulation.recentConfirmed?.currentMonths)) &&
    Number.isFinite(Number(simulation.recentConfirmed?.expectedMonths)),
)

const survivalMonths = computed(() => {
  if (!session.isMockMode) {
    return finiteNumberOrNull(buttieDashboard.value?.currentPrepMonths)
  }
  if (hasConfirmedSimulationDurations.value) {
    return Math.max(0, Number(simulation.recentConfirmed.currentMonths))
  }
  if (!financeState.loaded) return null
  return monthlyExpense.value > 0 ? totalAssets.value / monthlyExpense.value : 0
})
const survivalIsInfinite = computed(() => isInfinitePrepMonths(survivalMonths.value))
const displayedSurvivalMonths = computed(() => formatPrepMonths(survivalMonths.value))
const hasConfirmedScenario = computed(
  () =>
    (!session.isMockMode && finiteNumberOrNull(buttieDashboard.value?.expectPrepMonths) !== null) ||
    hasConfirmedSimulationDurations.value ||
    simulation.state.confirmed,
)
const displayedExpectedMonths = computed(() => {
  if (!session.isMockMode) {
    const expected = finiteNumberOrNull(buttieDashboard.value?.expectPrepMonths)
    return formatPrepMonths(expected)
  }
  if (hasConfirmedSimulationDurations.value) {
    return formatPrepMonths(Math.max(0, Number(simulation.recentConfirmed.expectedMonths)))
  }
  if (!simulation.state.confirmed || simulation.expectedMonths === null) return '-'
  return formatPrepMonths(simulation.expectedMonths)
})
const expectedIsInfinite = computed(() => displayedExpectedMonths.value === '∞')
const confirmedExpenseRows = computed(() =>
  simulation.state.expenseApplied
    ? simulation.selectedExpenses.map((item) => ({
        id: `expense-${item.id}`,
        icon: item.icon,
        name: `${expenseQuestName(item.name)} ${formatCompactWon(item.saving)} 줄이기`,
        subtitle: '',
        amount: -item.saving,
        kind: 'expense',
        recurrence: 'monthly',
      }))
    : [],
)
const confirmedIncomeRows = computed(() =>
  simulation.state.incomes.map((item) => ({
    id: `income-${item.id}`,
    icon: '💼',
    name: item.name,
    subtitle:
      item.type === 'monthly'
        ? `정기수입 · 매월 ${parseLocalDate(item.startDate)?.getDate() || 1}일`
        : `일회성 수입 · ${formatDateDots(item.startDate)}`,
    amount: item.amount,
    kind: 'income',
    recurrence: item.type === 'monthly' ? 'monthly' : 'once',
  })),
)
const confirmedPolicyRows = computed(() =>
  simulation.state.policies.map((item) => ({
    id: `policy-${item.id}`,
    icon: '🏛️',
    name: item.name,
    subtitle:
      item.id === 'youth-saving'
        ? '일시 60만원 · 3년 만기 시 정부지원금'
        : item.detail || item.description || '정책 혜택',
    amount: item.amount,
    kind: 'policy',
    recurrence: item.type === 'monthly' ? 'monthly' : 'once',
    questUrl: normalizeExternalUrl(item.url),
  })),
)
const questTab = ref('active')
const localQuestRows = computed(() => [
  ...confirmedExpenseRows.value,
  ...confirmedIncomeRows.value,
  ...confirmedPolicyRows.value,
])
const allQuestRows = computed(() => (quests.remoteEnabled ? quests.rows : localQuestRows.value))
const questMonthKey = computed(() => {
  const date = today.value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const recurringQuestIds = computed(() =>
  allQuestRows.value.filter((item) => item.recurrence === 'monthly').map((item) => item.id),
)

watch(
  [questMonthKey, () => recurringQuestIds.value.join('|')],
  ([monthKey]) => {
    if (quests.remoteEnabled) return
    simulation.migrateRecurringQuestCompletions(recurringQuestIds.value, monthKey)
    progression.migrateRecurringQuestClaims(recurringQuestIds.value, monthKey)
  },
  { immediate: true },
)

function questCompletionId(item) {
  if (quests.remoteEnabled) return item.id
  return item.recurrence === 'monthly' ? `${item.id}@${questMonthKey.value}` : item.id
}

function policyApplicationUrl(item) {
  if (item?.kind !== 'policy') return ''

  const directUrl =
    item.questUrl ||
    item.applicationUrl ||
    item.applyUrl ||
    item.policyUrl ||
    item.url ||
    item.detailUrl ||
    item.link
  if (directUrl) return directUrl

  const name = String(item.name || '')
  const exactMatch = POLICY_APPLICATION_URLS[item.id] || POLICY_APPLICATION_URLS[name]
  if (exactMatch) return exactMatch

  const partialMatch = Object.entries(POLICY_APPLICATION_URLS).find(
    ([policyName]) => policyName !== 'youth-saving' && name.includes(policyName),
  )
  return partialMatch?.[1] || ''
}
const completedQuestIds = computed(() => new Set(simulation.state.completedQuestIds || []))
const completedQuestCount = computed(() => allQuestRows.value.filter(isQuestCompleted).length)
const activeQuestCount = computed(() => allQuestRows.value.length - completedQuestCount.value)
const questCompletionPercent = computed(() =>
  allQuestRows.value.length
    ? Math.round((completedQuestCount.value / allQuestRows.value.length) * 100)
    : 0,
)
const claimableQuestExp = computed(() => allQuestRows.value
  .filter((item) => !isQuestCompleted(item))
  .reduce((sum, item) => sum + questExp(item), 0))
const questIconName = (item) => ({ expense: 'arrow-down', income: 'briefcase', policy: 'landmark' }[item.kind] || 'check-circle')
function buildQuestGroups(rows) {
  return [
    { key: 'expense', title: '지출 줄이기' },
    { key: 'income', title: '수입 늘리기' },
    { key: 'policy', title: '정책 혜택', action: '신청 가능' },
  ]
    .map((group) => {
      const groupRows = rows.filter((item) => item.kind === group.key)
      return {
        ...group,
        rows: groupRows,
        amount: group.key === 'policy' ? 0 : groupRows.reduce((sum, item) => sum + item.amount, 0),
      }
    })
    .filter((group) => group.rows.length)
}

const questSections = computed(() => [
  {
    key: 'recurring',
    title: '매월 정기 퀘스트',
    description: '지출 절감·정기 수입·정기 정책 퀘스트가 매월 갱신돼요.',
    rows: allQuestRows.value.filter((item) => item.recurrence === 'monthly'),
  },
  {
    key: 'once',
    title: '일회성 퀘스트',
    description: '한 번 완료하면 유지되는 수입·정책 퀘스트예요.',
    rows: allQuestRows.value.filter((item) => item.recurrence === 'once'),
  },
])
const visibleQuestSections = computed(() =>
  questSections.value.map((section) => {
    const rows = section.rows.filter((item) =>
      questTab.value === 'completed' ? isQuestCompleted(item) : !isQuestCompleted(item),
    )
    return { ...section, visibleRows: rows }
  }),
)
function isQuestCompleted(item) {
  if (quests.remoteEnabled) return item.completed
  return completedQuestIds.value.has(questCompletionId(item))
}

function questExp(item) {
  return quests.remoteEnabled ? item.expReward : calculateQuestExp(item.amount)
}

function isQuestRewarded(item) {
  return quests.remoteEnabled ? item.completed : progression.isQuestClaimed(questCompletionId(item))
}

function isQuestPending(item) {
  return quests.remoteEnabled && quests.isPending(item.id)
}

async function toggleQuest(item) {
  if (quests.remoteEnabled) {
    const changed = await quests.toggleQuest(item.id)
    if (changed) await loadButtieDashboard()
    return
  }
  const completionId = questCompletionId(item)
  if (isQuestCompleted(item)) {
    progression.cancelQuestClaim(completionId, item.amount)
  } else {
    progression.claimQuest(completionId, item.amount)
  }
  simulation.toggleQuestCompletion(completionId)
}
const achievementRate = computed(() => {
  if (remainingMonthsValue.value <= 0) return 100
  return Math.min(
    100,
    Math.max(0, Math.round((survivalMonths.value / remainingMonthsValue.value) * 100)),
  )
})
const shortageMonths = computed(() =>
  Math.max(0, remainingMonthsValue.value - survivalMonths.value),
)
const displayedShortageMonths = computed(() => shortageMonths.value.toFixed(1))
const displayedTargetMonths = computed(() => {
  const months = Math.max(0, remainingMonthsValue.value)
  return Number.isInteger(months) ? String(months) : months.toFixed(1)
})
const survivalCardTitle = computed(() =>
  shortageMonths.value > 0
    ? `${displayedShortageMonths.value}개월이 부족해요`
    : '목표 기간을 채울 수 있어요',
)
const financialStatus = computed(() => {
  const apiRisk = buttieDashboard.value?.riskLevel
  const isDanger = apiRisk === 'DANGER' || (!apiRisk && achievementRate.value <= 30)
  const isCaution = apiRisk === 'CAUTION' || (!apiRisk && achievementRate.value < 80)
  const apiImage = buttieDashboard.value?.buttieImageUrl

  if (isDanger) {
    const shortage = Math.max(1, Math.ceil(shortageMonths.value))
    const fallbackImage = getButtieLevelImage(buttieLevel.value, 'danger')
    return {
      key: 'risk',
      label: '위험',
      message: `버티는 기간이 목표보다 ${shortage}개월 부족해서 버티가 녹고 있어요`,
      image: apiImage || fallbackImage,
      fallbackImage,
      imageAlt: '거의 녹아내린 위험 상태의 버티',
    }
  }

  if (isCaution) {
    const fallbackImage = getButtieLevelImage(buttieLevel.value, 'caution')
    return {
      key: 'caution',
      label: '주의',
      message: '버티는 기간이 목표보다 조금 부족해 주의가 필요해요',
      image: apiImage || fallbackImage,
      fallbackImage,
      imageAlt: '조금 녹아내린 주의 상태의 버티',
    }
  }

  const fallbackImage = getButtieLevelImage(buttieLevel.value, 'stable')
  return {
    key: 'stable',
    label: '안정',
    message: '버티는 기간이 목표를 넉넉히 채워서 걱정 없어요',
    image: apiImage || fallbackImage,
    fallbackImage,
    imageAlt: '온전한 안정 상태의 버티',
  }
})

watch(
  [buttieLevel, () => financialStatus.value.key],
  ([level, status]) => {
    levelMessage.value = pickButtieMessage(level, status === 'risk' ? 'danger' : status)
  },
  { immediate: true },
)

const initialAssets = computed(() =>
  session.isMockMode
    ? Math.max(0, Number(dashboard.initialAssets ?? dashboard.totalAssets) || 0)
    : totalAssets.value,
)
const financialRiskAmount = computed(
  () =>
    finiteNumberOrNull(currentUser.value.financialRiskAlertAmount) ??
    (session.isMockMode && initialAssets.value !== null
      ? Math.round(initialAssets.value * 0.2)
      : null),
)
const financialSafetyBuffer = computed(() =>
  Math.max(0, (Number(totalAssets.value) || 0) - (Number(financialRiskAmount.value) || 0)),
)
const hasReachedFinancialRiskAmount = computed(() => {
  const assets = finiteNumberOrNull(totalAssets.value)
  const riskAmount = finiteNumberOrNull(financialRiskAmount.value)
  return assets !== null && riskAmount !== null && assets <= riskAmount
})
const netCashFlow = computed(() => monthlyIncome.value - monthlyExpense.value)
const monthlyNetChange = computed(() => Math.abs(netCashFlow.value))
const monthlyNetChangeLabel = computed(() => {
  if (netCashFlow.value > 0) return '매달 들어오는 금액'
  if (netCashFlow.value < 0) return '매달 나가는 금액'
  return '매달 순변동 금액'
})
const remainingDurationText = computed(() => {
  if (remainingDays.value <= 0) return '목표일 도달'
  return `${remainingDuration.value.months}개월 ${remainingDuration.value.days}일`
})
const targetDateDisplayText = computed(() => {
  const date = targetEmploymentDate.value
  return date ? `${date.getFullYear()}년 ${date.getMonth() + 1}월` : '-'
})
const preparationProgress = computed(() => {
  const start = preparationStartDate.value
  const target = targetEmploymentDate.value
  if (!start || !target) return 0
  const total = target.getTime() - start.getTime()
  if (total <= 0) return 100
  return Math.min(
    100,
    Math.max(0, Math.round(((today.value.getTime() - start.getTime()) / total) * 100)),
  )
})
const currentMonthText = computed(() => formatMonthLabel(today.value))
const targetMonthText = computed(() =>
  targetEmploymentDate.value ? formatMonthLabel(targetEmploymentDate.value) : '-',
)
</script>

<template>
  <section class="page dashboard">
    <div class="dashboard__top">
      <header class="dashboard__heading">
        <p class="app-page-heading__eyebrow">FINANCIAL OVERVIEW</p>
        <h1>버티와 함께하는 취준 여정,<br />지금 확인해 보세요</h1>
        <p class="app-page-heading__description">취업 준비 기간 동안의 재정 상태를 관리해보세요</p>
      </header>
      <section class="level-overview" aria-label="레벨 및 경험치">
        <div>
          <div class="level-overview__level">
            <strong>Lv.{{ buttieLevel }}</strong>
            <b>{{ levelTitle }}</b>
          </div>
          <div :class="['level-info', { 'level-info--open': levelInfoOpen }]">
            <button
              type="button"
              class="level-info__button"
              aria-label="버티 레벨 설명 보기"
              aria-controls="level-info-popover"
              :aria-expanded="levelInfoOpen"
              @click="levelInfoOpen = !levelInfoOpen"
              @keydown.esc="levelInfoOpen = false"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 10.5v6M12 7.5h.01" />
              </svg>
            </button>
            <div id="level-info-popover" class="level-info__popover" role="tooltip">
              <strong class="level-info__title">버티 레벨 안내</strong>
              <ul>
                <li
                  v-for="item in LEVEL_DESCRIPTIONS"
                  :key="item.level"
                  :class="{ current: item.level === buttieLevel }"
                >
                  <b>레벨 {{ item.level }}. {{ item.title }}</b>
                  <span>{{ item.description }}</span>
                </li>
              </ul>
            </div>
          </div>
          <span v-if="buttieLevel < 5">다음 레벨까지 {{ formatExp(buttieRemainingExp) }} EXP</span>
          <span v-else>최고 레벨 달성</span>
        </div>
        <div
          class="level-overview__progress"
          role="progressbar"
          aria-label="현재 레벨 경험치"
          :aria-valuenow="Math.round(buttieProgressPercent)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <b v-if="buttieLevel < 5">
            {{ formatExp(buttieExp) }} / {{ formatExp(buttieRequiredExp) }} EXP
          </b>
          <b v-else>MAX LEVEL</b>
          <i aria-hidden="true">
            <span :style="{ width: `${buttieProgressPercent}%` }" />
          </i>
        </div>
      </section>
    </div>
    <div v-if="dashboardApiError" class="dashboard-api-notice" role="alert">
      <span>{{ dashboardApiError }}</span>
      <button type="button" :disabled="dashboardApiLoading" @click="loadButtieDashboard">
        {{ dashboardApiLoading ? '불러오는 중' : '다시 시도' }}
      </button>
    </div>
    <div v-if="financialAssetsError" class="dashboard-api-notice" role="alert">
      <span>{{ financialAssetsError }}</span>
      <button type="button" @click="loadFinancialAssets">다시 시도</button>
    </div>

    <section class="survival-section" aria-labelledby="survival-title">
      <h2 id="survival-title" class="mobile-only section-label">버티 현황</h2>
      <article :class="['survival-card', `survival-card--${financialStatus.key}`]">
        <header class="survival-card__intro">
          <h3 v-if="survivalMonths !== null">
            지금 자금으로<span class="mobile-only"><br /></span> {{ survivalCardTitle }}
          </h3>
          <h3 v-else>지금 자금으로 버틸 수 있는 기간을 계산 중이에요</h3>
          <p v-if="survivalIsInfinite">
            현재 예상되는 월 수입이 월 지출보다 많아 자산이 소진되지 않는 상태예요.
          </p>
          <p v-else-if="survivalMonths !== null">
            목표 취업 시기까지 {{ displayedTargetMonths }}개월,<br />
            버틸 수 있는 기간은 {{ displayedSurvivalMonths }}개월이에요
          </p>
          <p v-else>재정 정보를 불러오면 버틸 수 있는 기간을 알려드릴게요</p>
        </header>

        <div class="survival-card__metrics">
          <div class="survival-card__metric survival-card__metric--current">
            <span>버티는 기간</span>
            <strong
              >{{ displayedSurvivalMonths
              }}<i v-if="survivalMonths !== null && !survivalIsInfinite">개월</i></strong
            >
          </div>

          <div class="survival-card__metric survival-card__metric--target">
            <span>목표 취업 시기</span>
            <strong>{{ displayedTargetMonths }}<i>개월 후</i></strong>
          </div>

          <div class="survival-card__metric survival-card__metric--expected desktop-only">
            <span>예상 버티는 기간</span>
            <strong>{{ displayedExpectedMonths }} <i v-if="!expectedIsInfinite">개월</i></strong>
            <small v-if="!hasConfirmedScenario">시뮬레이션하면 확인 가능</small>
            <small v-else>확정 시나리오 기준</small>
          </div>
        </div>

        <div class="survival-card__progress-area">
          <b
            ><span>목표 충족률</span><strong>{{ achievementRate }}%</strong></b
          >
          <div
            class="survival-card__progress"
            role="progressbar"
            aria-label="목표 버티는 기간 충족률"
            :aria-valuenow="achievementRate"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span :style="{ width: `${achievementRate}%` }" />
          </div>
          <div class="survival-card__legend">
            <small>현재 {{ currentMonthText }}</small>
            <small>자금 소진 예상</small>
            <small>목표 {{ targetMonthText }}</small>
          </div>
        </div>

        <div class="survival-card__character-panel">
          <div class="survival-card__character">
            <span class="survival-card__character-halo" aria-hidden="true" />
            <ButtieImage
              :src="financialStatus.image"
              :fallback="financialStatus.fallbackImage"
              :alt="financialStatus.imageAlt"
            />
            <b class="survival-card__level survival-card__level--mobile">Lv.{{ buttieLevel }}</b>
          </div>

          <p class="survival-card__speech" aria-live="polite">{{ levelMessage }}</p>

          <div class="survival-card__message">
            <p aria-live="polite">{{ financialStatus.message }}</p>
            <em>{{ financialStatus.label }}</em>
          </div>

          <b class="survival-card__level survival-card__level--desktop">Lv.{{ buttieLevel }}</b>
        </div>
      </article>
    </section>

    <div class="dashboard-overview">
      <section class="summary">
        <div class="section-head">
          <h2>현재 재정 리포트</h2>
          <RouterLink to="/finance">전체 내역 <span>›</span></RouterLink>
        </div>
        <div class="dashboard-report">
          <div class="dashboard-report__summary">
            <article>
              <span>총자산</span>
              <strong>{{ formatOptionalCompactWon(totalAssets) }}</strong>
            </article>
            <article>
              <span>{{ monthlyNetChangeLabel }}</span>
              <strong :class="{ 'is-positive': netCashFlow > 0 }">
                {{ formatCompactWon(monthlyNetChange) }}
              </strong>
            </article>
          </div>
          <div class="dashboard-report__cashflow" aria-label="월평균 수입과 지출">
            <div class="dashboard-report__cashflow-item dashboard-report__cashflow-item--income">
              <span>월평균 수입</span>
              <strong>{{ formatCompactWon(monthlyIncome) }}</strong>
            </div>
            <div class="dashboard-report__cashflow-item dashboard-report__cashflow-item--expense">
              <span>월평균 지출</span>
              <strong>{{ formatCompactWon(monthlyExpense) }}</strong>
            </div>
          </div>
          <p class="dashboard-report__notice">
            <template v-if="survivalMonths === null">
              재정 데이터를 불러오면 버티는 기간을 확인할 수 있어요
            </template>
            <template v-else-if="survivalIsInfinite">
              현재 예상되는 월 수입이 월 지출보다 많아 자산이 소진되지 않는 상태예요.
            </template>
            <template v-else>
              지금 자금으로 버틸 수 있는 기간은
              <strong>약 {{ displayedSurvivalMonths }}개월</strong>이에요
            </template>
          </p>
        </div>
      </section>

      <section class="goal-section">
        <div class="section-head section-head--goal">
          <h2>목표 정보</h2>
        </div>
        <article class="goal-card">
          <section class="goal-card__item">
            <header>
              <span>목표 취업일</span>
              <RouterLink :to="{ name: 'jobInfo', query: { focus: 'goal-date' } }"
                >수정하기 ›</RouterLink
              >
            </header>
            <strong class="goal-card__value">{{ targetDateDisplayText }}</strong>
            <div class="goal-card__progress">
              <i :style="{ width: `${preparationProgress}%` }" />
            </div>
            <footer>
              <span>남은 준비 기간 {{ remainingDurationText }}</span>
              <span>{{ preparationProgress }}% 경과</span>
            </footer>
          </section>
          <section class="goal-card__item">
            <header>
              <span>재정 위험까지 남은 금액</span>
              <RouterLink :to="{ name: 'jobInfo', query: { focus: 'risk-amount' } }"
                >수정하기 ›</RouterLink
              >
            </header>
            <div class="goal-card__amount-row">
              <strong
                class="goal-card__value"
                :class="{ 'goal-card__value--warning': hasReachedFinancialRiskAmount }"
                >{{ formatCompactWon(financialSafetyBuffer) }}</strong
              >
            </div>
            <p class="goal-card__risk-caption">
              현재 {{ formatOptionalCompactWon(totalAssets) }}
              <span aria-hidden="true">·</span>
              위험 기준 {{ formatCompactWon(financialRiskAmount) }}
            </p>
          </section>
        </article>
      </section>
    </div>

    <div class="dashboard__bottom">
      <section class="quest-section">
        <QuestOverview v-if="hasConfirmedScenario" :rows="allQuestRows" :edit-loading="simulation.syncing" />

        <article v-else class="quest-empty">
          <h3>진행 중인 퀘스트가 아직 없어요</h3>
          <p>지출 절감, 수입, 정책 혜택을 조합해 나만의 시나리오를 만들어보세요.</p>
          <RouterLink to="/simulation/new">시뮬레이션 하러가기 <span>→</span></RouterLink>
        </article>
      </section>
    </div>
    <MyDataConnectModal
      :visible="showMyDataConnectModal"
      @close="showMyDataConnectModal = false"
      @connect="goToMyDataConnect"
    />
  </section>
</template>

<style scoped>
.dashboard {
  padding-bottom: 28px;
}

.dashboard__top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  align-items: center;
  gap: 28px;
  margin-bottom: 26px;
}

.level-overview {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 16px 18px;
  border: 1px solid #e2e3e8;
  border-radius: 18px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.level-overview > div:first-child {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.level-overview__level {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.level-overview__level strong {
  font-size: 18px;
}
.level-overview__level b {
  color: #51392e;
  font-size: var(--font-body);
  font-weight: 900;
}
.level-overview > div:first-child span {
  margin-left: auto;
  color: #6b7280;
  font-size: var(--type-supporting-size);
}

.level-info {
  display: inline-flex;
  align-items: center;
}

.level-info__button {
  display: grid;
  width: 22px;
  height: 22px;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #51392e;
  cursor: pointer;
}

.level-info__button:hover,
.level-info__button:focus-visible {
  background: #f5efe9;
  outline: none;
}

.level-info__button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.level-info__popover {
  position: absolute;
  z-index: 20;
  top: calc(100% + 12px);
  left: 0;
  width: min(410px, calc(100vw - 64px));
  padding: 16px;
  border: 1px solid #e4ddd7;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(0 0 0 / 18%);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-5px);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    visibility 0.18s ease;
  visibility: hidden;
  white-space: normal;
}

.level-info:hover .level-info__popover,
.level-info:focus-within .level-info__popover,
.level-info--open .level-info__popover {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  visibility: visible;
}

.level-info__title {
  display: block;
  margin-bottom: 10px;
  color: #2f211b;
  font-size: var(--font-body);
  font-weight: 900;
}

.level-info__popover ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.level-info__popover li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  padding: 7px 9px;
  border-radius: 9px;
  color: #5f514b;
  font-size: var(--font-caption);
  line-height: 1.45;
}

.level-info__popover li.current {
  background: #fff4c7;
  color: #3e2c23;
}

.level-info__popover li b {
  color: inherit;
  font-weight: 900;
}

.level-info__popover li span {
  color: inherit !important;
  font-size: inherit !important;
}

.level-overview__progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-overview__progress b {
  order: 2;
  flex: none;
  color: #51392e;
  font-size: var(--type-supporting-size);
  text-align: right;
}

.level-overview__progress i {
  display: block;
  height: 8px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: #e8eaf0;
}

.level-overview__progress i span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.25s ease;
}

.dashboard__heading {
  margin: 0;
}

.dashboard__heading h1 {
  font-size: var(--type-page-title-size);
  font-weight: var(--type-page-title-weight);
  line-height: 1.35;
}

.dashboard__heading p {
  margin-top: 8px;
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}

.dashboard-api-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -10px 0 22px;
  padding: 12px 16px;
  border: 1px solid #ffc9c9;
  border-radius: 12px;
  background: #fff4f4;
  color: #c23838;
  font-size: var(--font-small);
}

.dashboard-api-notice button {
  flex: none;
  font-weight: 800;
  text-decoration: underline;
}

.dashboard-api-notice button:disabled {
  opacity: 0.55;
}

.section-label {
  margin-bottom: 7px;
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}

.survival-card {
  position: relative;
  width: 100%;
  max-width: 1040px;
  min-height: 300px;
  overflow: hidden;
  border-radius: 28px;
  background: rgb(251 237 176 / 40%);
  box-shadow: none;
  color: #222;
  font-family: Pretendard;
}

.survival-card__metrics,
.survival-card__character-panel {
  display: contents;
}

.survival-card__metric {
  position: absolute;
  z-index: 2;
  top: 28px;
  display: grid;
  gap: 2px;
}

.survival-card__metric--current {
  left: 34px;
}

.survival-card__metric--expected {
  right: 34px;
  justify-items: end;
  text-align: right;
}

.survival-card__metric span {
  color: #2a2927;
  font-size: var(--font-body);
  font-weight: 700;
}

.survival-card__metric strong {
  color: #6b4e3d;
  font-size: var(--font-display);
  line-height: 1.2;
}

.survival-card__metric i {
  color: #5e6470;
  font-size: var(--font-body);
  font-style: normal;
  font-weight: 500;
}

.survival-card__metric small {
  color: #9aa2b1;
  font-size: var(--font-caption);
}

.survival-card__progress-area {
  position: absolute;
  z-index: 2;
  bottom: 23px;
  left: 24px;
  width: 30%;
}

.survival-card__progress-area b {
  display: block;
  margin-bottom: 5px;
  color: #8a5a0e;
  font-size: var(--font-caption);
}

.survival-card__progress {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #fff3c8;
}

.survival-card__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f1b94c;
  transition: width 0.25s ease;
}

.survival-card__legend {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  color: #5f6773;
}

.survival-card__character {
  position: absolute;
  z-index: 1;
  top: 27px;
  left: 50%;
  width: 290px;
  height: 200px;
  transform: translateX(-50%);
}

.survival-card__character-halo {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: rgb(255 255 255 / 57%);
  transform: translateX(-50%);
}

.survival-card__character img {
  position: absolute;
  top: 26px;
  left: 50%;
  width: 286px;
  height: 170px;
  object-fit: contain;
  transform: translateX(-50%);
}

.survival-card__speech {
  position: absolute;
  z-index: 4;
  top: -16px;
  left: calc(50% + 45px);
  display: grid;
  width: clamp(170px, 19%, 205px);
  min-height: 68px;
  place-items: center;
  padding: 11px 15px;
  border-radius: 18px;
  background: white;
  box-shadow: var(--shadow-figma);
  color: #4a3428;
  font-size: var(--font-small);
  font-weight: 800;
  line-height: 1.45;
  text-align: center;
}

.survival-card__speech::after {
  position: absolute;
  bottom: -11px;
  left: 28px;
  border-top: 12px solid white;
  border-right: 12px solid transparent;
  border-left: 3px solid transparent;
  content: '';
  filter: drop-shadow(0 3px 2px rgb(0 0 0 / 8%));
}

.survival-card__level {
  min-width: 58px;
  padding: 5px 13px;
  border-radius: 999px;
  background: var(--primary);
  color: white;
  font-size: var(--font-caption);
  text-align: center;
}

.survival-card__level--mobile {
  display: none;
  position: absolute;
  right: 6px;
  bottom: 8px;
}

.survival-card__level--desktop {
  position: absolute;
  z-index: 3;
  right: 34px;
  bottom: 24px;
}

.survival-card__message {
  position: absolute;
  z-index: 3;
  bottom: 13px;
  left: 50%;
  display: flex;
  width: 34%;
  flex-direction: column-reverse;
  align-items: center;
  gap: 7px;
  text-align: center;
  transform: translateX(-50%);
}

.survival-card__message p {
  color: #4a3428;
  font-size: var(--font-small);
  font-weight: 800;
}

.survival-card__message em {
  display: inline-flex;
  min-width: 58px;
  min-height: 24px;
  align-items: center;
  justify-content: center;
  margin-top: 0;
  border-radius: 999px;
  background: #e4574c;
  color: white;
  font-size: var(--font-caption);
  font-style: normal;
  font-weight: 800;
}

.survival-card--caution .survival-card__message em {
  background: #eea63a;
}

.survival-card--stable .survival-card__message em {
  background: var(--success);
}

.summary {
  min-width: 0;
}

.dashboard-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.85fr);
  align-items: start;
  gap: 28px;
  margin-top: 32px;
}

.goal-section {
  min-width: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h2,
.block-title {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}

.section-head a {
  color: #555;
  font-size: 15px;
  font-weight: var(--type-action-weight);
}

.section-head a span {
  margin-left: 3px;
}

.dashboard-report {
  display: grid;
  gap: 20px;
  margin-top: 10px;
}

.dashboard-report__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dashboard-report__summary article {
  display: grid;
  min-height: 112px;
  align-content: center;
  gap: 6px;
  padding: 20px 24px;
  border-radius: 16px;
  background: #fff;
  box-shadow: none !important;
}

.dashboard-report__summary span {
  color: #657086;
  font-size: 14px;
  font-weight: 600;
}

.dashboard-report__summary strong {
  min-width: 0;
  color: #394760;
  font-size: clamp(16px, 2.2vw, 20px);
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.dashboard-report__summary strong.is-positive {
  color: #16845b;
}

.dashboard-report__cashflow {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid #eaecf0;
  border-bottom: 1px solid #eaecf0;
}

.dashboard-report__cashflow-item {
  display: grid;
  gap: 6px;
  padding: 16px 14px;
}

.dashboard-report__cashflow-item + .dashboard-report__cashflow-item {
  border-left: 1px solid #eaecf0;
}

.dashboard-report__cashflow-item span {
  color: #737b89;
  font-size: 13px;
  font-weight: 600;
}

.dashboard-report__cashflow-item strong {
  color: #0a1680;
  font-size: 18px;
  font-weight: 800;
}

.dashboard-report__cashflow-item--expense strong {
  color: #d94b43;
}

.dashboard-report__notice {
  padding: 14px 18px;
  border-radius: 10px;
  background: #fbf7df;
  color: #555f73;
  font-size: 14px;
  line-height: 1.5;
}

.dashboard-report__notice strong {
  font-weight: 500;
}

.summary__grid {
  display: grid;
  grid-template-columns: 1.15fr repeat(3, 1fr);
  gap: 18px;
}

.summary-card {
  display: grid;
  min-height: 92px;
  align-content: center;
  gap: 4px;
  padding: 16px 22px;
  border-radius: 14px;
}

.summary-card span,
.summary-card small {
  color: #626b79;
  font-size: var(--font-caption);
}

.summary-card strong {
  color: #46556e;
  font-size: var(--font-card-title);
}

.summary-card--asset {
  background: rgb(147 178 248 / 40%);
}

.summary-card--asset strong {
  color: #173d9f;
  font-size: var(--font-page-title);
}

.summary-card--income {
  background: rgb(10 22 128 / 8%);
}

.summary-card--income span {
  color: var(--primary);
}

.summary-card--expense {
  background: rgb(240 87 79 / 10%);
}

.summary-card--expense span {
  color: #f0574f;
}

.summary-card--cash {
  background: #f1eff9;
}

.summary-card--cash span {
  color: #7361ad;
}

.summary-card--cash span small {
  margin-left: 2px;
  color: inherit;
  font-size: var(--font-caption);
}

.dashboard__bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 38px;
}

.block-title {
  margin-bottom: 12px;
}

.simulation-cta {
  display: flex;
  min-height: 182px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
  border-radius: 16px;
  background: rgb(251 237 176 / 62%);
}

.simulation-cta h3 {
  color: #684f3c;
  font-size: var(--font-card-title);
  line-height: 1.4;
}

.simulation-cta p {
  margin-top: 10px;
  color: #766e66;
  font-size: var(--font-caption);
  line-height: 1.65;
}

.simulation-cta__button {
  flex: none;
  padding: 12px 22px;
  border-radius: 999px;
  background: var(--accent-strong);
  color: white;
  font-size: var(--font-small);
  font-weight: 800;
}

.simulation-cta__confirmed {
  display: grid;
  flex: 1;
  gap: 14px;
}

.simulation-cta__result {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.simulation-cta__result span {
  color: #756b62;
  font-size: var(--font-caption);
}

.simulation-cta__result strong {
  color: #573b2c;
  font-size: var(--font-card-title);
}

.simulation-cta__result em {
  padding: 4px 9px;
  border-radius: 999px;
  background: #dff8ee;
  color: #18a971;
  font-size: var(--font-caption);
  font-weight: 800;
}

.simulation-cta__confirmed ul {
  display: grid;
  gap: 7px;
  list-style: none;
}

.simulation-cta__confirmed li {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: var(--font-caption);
}

.simulation-cta__confirmed li strong.is-expense {
  color: var(--danger);
}
.simulation-cta__confirmed li strong.is-income {
  color: #15a66f;
}
.simulation-cta__confirmed li strong.is-policy {
  color: #8167c9;
}

.section-head--goal {
  min-height: 24px;
}

.goal-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none !important;
}

.goal-card__item {
  display: grid;
  min-height: 0;
  align-content: start;
  padding: 24px;
  border: 1px solid #ebeaeb;
  border-radius: 22px;
  background: #fcfdff;
  box-shadow: var(--shadow-sm);
}

.goal-card__item header,
.goal-card__item footer,
.goal-card__amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.goal-card__item header span,
.goal-card__item header a,
.goal-card__item footer span,
.goal-card__amount-row > span,
.goal-card__item p {
  color: var(--type-supporting-color);
  font-size: var(--type-supporting-size);
  font-weight: var(--type-supporting-weight);
}

.goal-card__item header a {
  color: #666;
  white-space: nowrap;
}

.goal-card__value {
  margin-top: 14px;
  color: #666666;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.goal-card__amount-row {
  align-items: end;
}

.goal-card__value--warning {
  color: #b42318;
}

.goal-card__progress {
  height: 10px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: #fff3c8;
}

.goal-card__progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f1b94c;
}

.goal-card__item footer {
  margin-top: 8px;
}

.goal-card__item p {
  margin-top: 12px;
  line-height: 1.55;
}

.goal-card__item .goal-card__risk-caption {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
  color: #737b89;
  font-size: var(--type-supporting-size) !important;
}

.dashboard__bottom {
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
}

.block-heading {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.block-heading h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}

.confirmed-badge {
  padding: 7px 18px;
  border-radius: 999px;
  background: #f4b945;
  box-shadow: var(--shadow-sm);
  color: white;
  font-size: var(--font-small);
  font-weight: 800;
}

.home-quest-card { --quest-ink:#222; --quest-paper:#fcfdff; --quest-navy:#0a1680; --quest-yellow:#fbedb0; --quest-lime:#44d795; --quest-blue:#93b2f8; --quest-peach:#f0574f; overflow:hidden; padding:26px 28px 22px; border:1px solid #e1e1e1; border-radius:32px; background:var(--quest-paper); color:var(--quest-ink); }
.home-quest-header { display:flex; align-items:center; justify-content:space-between; gap:24px; }
.home-quest-header h2 { font-size:20px; font-weight:900; }
.home-quest-tabs { display:grid; min-width:240px; grid-template-columns:1fr 1fr; gap:8px; }
.home-quest-tabs button { min-height:42px; padding:0 18px; border:1px solid #e1e1e1; border-radius:999px; background:#fff; color:#666; font-size:14px; font-weight:700; }
.home-quest-tabs button strong { margin-left:4px; font-size:16px; }
.home-quest-tabs button.active { border-color:var(--quest-navy); background:var(--quest-navy); color:#fff; }
.home-quest-progress { margin-top:20px; padding:17px 20px; border:1px solid rgb(10 22 128 / 12%); border-radius:22px; background:var(--quest-yellow); }
.home-quest-progress__top { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:24px; }
.home-quest-progress__top > strong { font-size:15px; font-weight:900; }
.home-quest-progress__top > span { font-size:13px; font-weight:800; }
.home-quest-progress__top > b { display:grid; grid-row:1 / span 2; grid-column:3; justify-items:end; color:var(--quest-navy); font-size:21px; line-height:1; }
.home-quest-progress__top > b small { margin-top:4px; font-size:11px; font-weight:700; }
.home-quest-progress__track { height:10px; margin-top:11px; overflow:hidden; border-radius:999px; background:rgb(255 255 255 / 72%); }
.home-quest-progress__track span { display:block; height:100%; border-radius:inherit; background:var(--quest-navy); transition:width .3s ease; }
.home-quest-section { margin-top:27px; }
.home-quest-section > header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:16px; }
.home-quest-section > header h3 { font-size:18px; font-weight:900; }
.home-quest-section > header p { margin-top:5px; color:#6b7684; font-size:13px; line-height:1.5; }
.home-quest-section > header > span { flex:none; padding:6px 10px; border:1px solid rgb(10 22 128 / 15%); border-radius:999px; background:var(--quest-yellow); color:var(--quest-navy); font-size:11px; font-weight:800; }
.home-quest-list { display:grid; gap:12px; }
.home-quest-row { display:grid; width:100%; min-height:72px; grid-template-columns:44px minmax(0,1fr) auto auto 32px; align-items:center; gap:12px; padding:10px 14px; border:1px solid rgb(10 22 128 / 12%); border-radius:22px; background:#fff; color:var(--quest-ink); }
.home-quest-row.completed { opacity:.62; }
.home-quest-row.pending { opacity:.5; }
.home-quest-row__icon { display:grid; width:40px; height:40px; place-items:center; border-radius:50%; }
.home-quest-row.is-expense .home-quest-row__icon { background:var(--quest-peach); color:#fff; }
.home-quest-row.is-income .home-quest-row__icon { background:var(--quest-lime); color:var(--quest-ink); }
.home-quest-row.is-policy .home-quest-row__icon { background:var(--quest-blue); color:var(--quest-navy); }
.home-quest-row__copy { display:grid; min-width:0; gap:6px; }
.home-quest-row__copy > strong { overflow:hidden; font-size:15px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }
.home-quest-row__copy small { color:#7a746d; font-size:12px; }
.home-quest-row__copy small b { color:#8a5b00; font-weight:900; }
.home-quest-row__apply { grid-column:3; padding:7px 11px; border-radius:999px; background:var(--quest-navy); color:#fff; font-size:12px; font-weight:800; white-space:nowrap; }
.home-quest-row__amount { grid-column:3; font-size:16px; font-weight:900; white-space:nowrap; }
.home-quest-row.is-policy .home-quest-row__amount { grid-column:4; color:var(--quest-navy); }
.home-quest-row.is-expense .home-quest-row__amount { color:var(--quest-peach); }
.home-quest-row.is-income .home-quest-row__amount { color:#168b5c; }
.home-quest-row__check { display:grid; width:32px !important; min-width:32px; max-width:32px; height:32px !important; min-height:32px !important; max-height:32px; aspect-ratio:1 / 1; grid-column:5; place-self:center; place-items:center; padding:0 !important; border:2px solid #d8d2c4; border-radius:10px; background:#fff; color:#fff; line-height:1; }
.home-quest-row.completed .home-quest-row__check { border-color:var(--quest-navy); background:var(--quest-navy); }
.home-quest-empty-row { display:grid; min-height:116px; align-content:center; justify-items:center; gap:8px; padding:24px 34px; border:1px solid #e1e1e1; border-radius:22px; background:#fff; color:#666; text-align:center; }
.home-quest-empty-row strong { font-size:16px; font-weight:900; }
.home-quest-empty-row span { font-size:13px; }
.home-quest-footer { display:flex; align-items:center; justify-content:space-between; gap:24px; margin-top:32px; padding-top:24px; border-top:1px solid #eee8dc; }
.home-quest-footer p { color:#81776b; font-size:14px; }
.home-quest-footer a { display:inline-flex; min-height:42px; align-items:center; justify-content:center; gap:7px; padding:0 18px; border:0; border-radius:13px; background:#f5f7f9; color:#666; font-size:14px; font-weight:800; }

.quest-card,
.quest-empty,
.goal-setting-card {
  border: 1px solid var(--border);
  border-radius: 22px;
  background: white;
  box-shadow: var(--shadow-sm);
}

.quest-card {
  padding: 22px 24px 18px;
}

.quest-api-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 11px 13px;
  border-radius: 12px;
  background: #f7f8fa;
  color: #727985;
  font-size: var(--font-small);
  font-weight: 700;
}

.quest-api-notice--error {
  background: #fff1f1;
  color: #cf3f3f;
}

.quest-api-notice button {
  flex: none;
  color: inherit;
  font-size: inherit;
  font-weight: 900;
  text-decoration: underline;
}

.quest-tabs {
  display: grid;
  width: min(100%, 440px);
  height: 50px;
  grid-template-columns: 1fr 1fr;
  margin: 0 auto 22px;
  padding: 3px;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid #e1e4ea;
  border-radius: 999px;
  background: #f2f3f6;
}

.quest-tabs button {
  min-width: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #9a9da5;
  font-family: inherit;
  font-size: var(--font-body);
  font-weight: 700;
  cursor: pointer;
}

.quest-tabs button.is-active {
  background: white;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  font-weight: 800;
}

.quest-completion {
  display: grid;
  gap: 8px;
  margin: -4px 0 20px;
}

.quest-completion__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.quest-completion__label strong {
  color: #51392e;
  font-size: var(--font-small);
  font-weight: 900;
}

.quest-completion__label span {
  color: #777e89;
  font-size: var(--font-caption);
  font-weight: 700;
}

.quest-completion__track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid #dfe3e9;
  background: #eef0f3;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 8%);
}

.quest-completion__track span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.3s ease;
}

.quest-periods {
  display: grid;
}

.quest-period + .quest-period {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #dfe2e8;
}

.quest-period__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.quest-period__heading h3 {
  font-size: var(--font-card-title);
  font-weight: 900;
}

.quest-period__heading p {
  margin-top: 4px;
  color: #777e89;
  font-size: var(--font-caption);
  line-height: 1.45;
}

.quest-period__heading > span {
  flex: none;
  padding: 5px 9px;
  border-radius: 999px;
  background: #fff4c7;
  color: #8b6110;
  font-size: var(--font-caption);
  font-weight: 800;
}

.quest-period__empty {
  display: grid;
  min-height: 88px;
  place-items: center;
  border-radius: 14px;
  background: #f8f9fb;
  color: #858b95;
  font-size: var(--font-small);
  font-weight: 700;
}

.quest-groups {
  display: grid;
  gap: 24px;
}

.quest-group {
  display: grid;
  gap: 11px;
}

.quest-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.quest-group__heading h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--font-body);
  font-weight: 800;
}

.quest-group__heading h3 i {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  background: var(--danger);
}

.quest-group--income .quest-group__heading h3 i {
  background: #3ed79d;
}
.quest-group--policy .quest-group__heading h3 i {
  background: #8e79cd;
}

.quest-group__heading > strong {
  color: var(--danger);
  font-size: var(--font-body);
  font-weight: 800;
}

.quest-group--income .quest-group__heading > strong {
  color: #23bb82;
}
.quest-group--policy .quest-group__heading > strong {
  color: #8e79cd;
}

.quest-row {
  display: grid;
  width: 100%;
  min-height: 76px;
  grid-template-columns: 46px minmax(0, 1fr) auto 36px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 14px 14px;
  border: 1px solid #e5e7ec;
  border-left-width: 4px;
  border-radius: 16px;
  background: #fff;
  box-shadow: none;
  color: var(--text);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.quest-row-wrap {
  display: contents;
}

.quest-row-wrap--policy {
  display: grid;
  gap: 10px;
  padding-bottom: 12px;
  overflow: hidden;
  border: 1px solid #e5e7ec;
  border-left: 4px solid var(--accent-strong);
  border-radius: 16px;
  background: #fff;
}

.quest-row-wrap--policy .quest-row {
  border: 0;
  border-radius: 0;
}

.quest-row__policy-link {
  display: inline-flex;
  width: fit-content;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 0 16px 0 auto;
  padding: 0 18px;
  border-radius: 12px;
  background: var(--accent);
  color: var(--primary);
  font-size: var(--font-body);
  font-weight: 800;
  text-decoration: none;
}

.quest-row__policy-link:hover {
  background: var(--accent-strong);
}

.quest-row--expense {
  border-left-color: #ef5a55;
  background: #fff;
}
.quest-row--income {
  border-left-color: #35c992;
  background: #fff;
}
.quest-row--policy {
  border-left-color: var(--accent-strong);
  background: #fff;
}

.quest-row.is-completed {
  background: #f7f8fa;
  color: #777e89;
}

.quest-row:disabled {
  cursor: wait;
  opacity: 0.55;
}

.quest-row__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #e1e4e9;
  border-radius: 50%;
  background: #f7f8fa;
  font-size: 19px;
}

.quest-row__copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.quest-row__copy strong,
.quest-row__amount {
  font-size: var(--font-body);
  font-weight: 800;
}

.quest-groups .quest-row__copy > strong {
  font-weight: 600;
}

.quest-row__copy small {
  overflow: hidden;
  color: #727985;
  font-size: var(--font-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quest-row__copy .quest-row__exp {
  color: #8b5f18;
  font-weight: 800;
}

.quest-row__amount {
  color: var(--danger);
  white-space: nowrap;
}

.quest-row--income .quest-row__amount {
  color: #23bb82;
}
.quest-row--policy .quest-row__amount {
  color: #8e79cd;
}

.quest-row__check {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 2px solid #cfdae7;
  border-radius: 10px;
  background: white;
  color: white;
  font-size: 18px;
  font-weight: 900;
}

.quest-row.is-completed .quest-row__check {
  border-color: #666;
  background: #666;
}

.quest-card__empty {
  display: grid;
  min-height: 210px;
  place-items: center;
  color: #858b95;
  font-weight: 700;
}

.quest-card__footer {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 4px 18px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #e4e6ea;
}

.quest-card__footer > div {
  display: contents;
}

.quest-card__footer span,
.quest-card__footer p {
  color: #818793;
  font-size: var(--font-small);
}

.quest-card__footer strong {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  font-size: var(--font-card-title);
  font-weight: 900;
  white-space: nowrap;
}

.quest-card__footer a {
  grid-column: 1 / -1;
  justify-self: center;
  display: inline-flex;
  width: auto;
  min-width: 190px;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 10px;
  padding: 0 22px;
  color: var(--text);
  font-size: var(--type-primary-action-size);
  font-weight: 800;
}

.quest-empty {
  display: grid;
  min-height: 260px;
  place-content: center;
  gap: 10px;
  padding: 28px;
  text-align: center;
}

.quest-empty h3 {
  font-weight: 800;
}
.quest-empty p {
  max-width: 420px;
  color: #727985;
  line-height: 1.6;
}
.quest-empty a {
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  padding: 0 24px;
  border: 0;
  border-radius: 18px;
  background: #fbedb0;
  box-shadow: 0 2px 6px rgb(20 30 60 / 16%);
  color: #0a1680;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: background .16s ease;
}
@media (hover: hover) {
  .quest-empty a:hover {
    background: #f1b94c;
  }
}

.block-heading--goal a {
  color: #6f7580;
  font-size: var(--font-small);
  font-weight: 700;
}

.goal-setting-card {
  display: grid;
  min-height: 246px;
  grid-template-columns: 1fr 1fr;
  gap: 34px 24px;
  align-content: center;
  padding: 30px 26px;
}

.goal-setting-card > div {
  display: grid;
  gap: 8px;
}

.goal-setting-card span {
  color: #7c8390;
  font-size: var(--font-small);
}

.goal-setting-card strong {
  font-size: var(--font-card-title);
  font-weight: 900;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .survival-card {
    min-height: 460px;
    overflow: hidden;
    border-radius: 24px;
  }

  .survival-card__intro {
    position: absolute;
    top: 42px;
    left: 3.4%;
    display: block;
    width: 52%;
  }

  .survival-card__intro h3 {
    color: #222;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.42;
  }

  .survival-card__intro p {
    margin-top: 12px;
    color: #222;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.55;
  }

  .survival-card__metrics {
    position: absolute;
    top: 164px;
    left: 3.4%;
    display: grid;
    width: 52%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .survival-card__metric {
    position: static;
    min-height: 112px;
    align-content: center;
    gap: 10px;
    padding: 18px 20px;
    border-radius: 16px;
    background: #fff;
  }

  .survival-card__metric--target {
    display: grid;
  }

  .survival-card__metric--current,
  .survival-card__metric--target {
    justify-items: start;
    text-align: left;
  }

  .survival-card__metric--expected {
    display: none;
  }

  .survival-card__metric span {
    color: #222;
    font-size: 13px;
    font-weight: 500;
  }

  .survival-card__metric strong {
    color: #6b4e3d;
    font-size: 28px;
    font-weight: 800;
  }

  .survival-card__metric i {
    margin-left: 2px;
    color: #222;
    font-size: 13px;
    font-weight: 600;
  }

  .survival-card__progress-area {
    bottom: 54px;
    left: 3.4%;
    width: 52%;
  }

  .survival-card__progress-area b {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    color: #222;
    font-size: 13px;
  }

  .survival-card__progress {
    height: 10px;
    background: rgb(241 185 76 / 35%);
  }

  .survival-card__legend {
    margin-top: 9px;
    color: #666;
  }

  .survival-card__character-panel {
    position: absolute;
    top: 26px;
    right: 3.6%;
    bottom: 26px;
    display: block;
    width: 36%;
    overflow: hidden;
    border-radius: 20px;
    background: #fff;
  }

  .survival-card__character {
    top: 112px;
    width: 100%;
    height: 160px;
  }

  .survival-card__character-halo,
  .survival-card__speech,
  .survival-card__level {
    display: none;
  }

  .survival-card__character img {
    top: 0;
    width: min(330px, 88%);
    height: 160px;
  }

  .survival-card__message {
    position: static;
    display: block;
    width: auto;
    text-align: initial;
    transform: none;
  }

  .survival-card__message p {
    position: absolute;
    right: 28px;
    bottom: 38px;
    left: 28px;
    color: #222;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.55;
    text-align: center;
  }

  .survival-card__message em {
    position: absolute;
    top: 28px;
    left: 28px;
    min-width: 52px;
    min-height: 25px;
    background: #fbd8d1;
    color: #d9502d;
    font-size: 11px;
  }

  .survival-card--caution .survival-card__message em,
  .survival-card--stable .survival-card__message em {
    color: #fff;
  }

  .survival-card--caution .survival-card__message em {
    background: #eea63a;
  }

  .survival-card--stable .survival-card__message em {
    background: var(--success);
  }
}

@media (max-width: 1024px) {
  .dashboard__top {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .level-overview {
    max-width: none;
    width: 100%;
  }
}

@media (max-width: 767px) {
  .survival-card__metric span,
  .dashboard-report__summary article span,
  .dashboard-report__cashflow-item span,
  .goal-card__item header span {
    font-size: 14px !important;
    font-weight: 700 !important;
  }

  .survival-card__legend small,
  :global(#app .app-shell main .survival-card__legend small) {
    font-size: 12px !important;
  }

  .dashboard__top {
    display: block;
    margin-bottom: 16px;
  }

  .level-overview {
    display: grid;
    max-width: none;
    grid-template-columns: minmax(0, 1fr);
    justify-content: stretch;
    gap: 10px;
    margin-bottom: 16px;
    padding: 14px 16px;
  }

  .level-overview > div:first-child {
    justify-content: flex-start;
    gap: 6px;
  }

  .level-overview > div:first-child > span {
    margin-left: auto;
  }

  .level-overview__progress {
    width: 100%;
  }

  .dashboard {
    padding-bottom: 8px;
  }

  .dashboard__heading {
    display: none;
  }

  .survival-card {
    min-height: 576px;
    border-radius: 20px;
  }

  .survival-card__intro {
    position: absolute;
    z-index: 3;
    top: 21px;
    right: 17px;
    left: 17px;
  }

  .survival-card__intro h3,
  :global(#app .app-shell main .survival-card__intro h3) {
    max-width: 290px;
    font-size: var(--type-page-title-size) !important;
    font-weight: var(--type-page-title-weight) !important;
    line-height: 1.35;
  }

  .survival-card__intro p {
    max-width: 290px;
    margin-top: 5px;
    color: var(--type-supporting-color);
    font-size: var(--type-supporting-size);
    font-weight: var(--type-supporting-weight);
    line-height: 1.4;
  }

  .survival-card__metrics {
    position: absolute;
    z-index: 3;
    top: 142px;
    right: 17px;
    left: 17px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 11px;
  }

  .survival-card__metric {
    position: static;
    min-height: 100px;
    align-content: center;
    gap: 9px;
    padding: 12px 14px;
    border-radius: 16px;
    background: white;
  }

  .survival-card__metric--target {
    justify-items: start;
    text-align: left;
  }

  .survival-card__metric span {
    font-size: var(--font-small);
  }

  .survival-card__metric strong {
    font-size: 24px;
  }

  .survival-card__metric i {
    margin-left: 2px;
    font-size: var(--font-small);
  }

  .survival-card__progress-area {
    top: 258px;
    bottom: auto;
    left: 17px;
    width: calc(100% - 34px);
  }

  .survival-card__progress-area b,
  :global(#app .app-shell main .survival-card__progress-area b) {
    display: flex;
    justify-content: space-between;
    margin-bottom: 9px;
    font-size: 13px !important;
  }

  .survival-card__progress {
    height: 10px;
  }

  .survival-card__character-panel {
    position: absolute;
    z-index: 2;
    top: 330px;
    right: 17px;
    bottom: 23px;
    left: 17px;
    display: block;
    overflow: hidden;
    border-radius: 18px;
    background: white;
  }

  .survival-card__character {
    top: 43px;
    width: 100%;
    height: 112px;
  }

  .survival-card__speech {
    display: none;
  }

  .survival-card__character-halo {
    display: none;
  }

  .survival-card__character img {
    top: 0;
    width: min(215px, 78%);
    height: 112px;
  }

  .survival-card__level--mobile {
    display: none;
  }

  .survival-card__level--desktop {
    display: none;
  }

  .survival-card__message {
    position: static;
    display: block;
    width: auto;
    min-height: 0;
    padding: 0;
    text-align: left;
    transform: none;
  }

  .survival-card__message p {
    position: absolute;
    right: 18px;
    top: 172px;
    left: 18px;
    color: var(--type-supporting-color);
    font-size: var(--type-supporting-size);
    font-weight: var(--type-supporting-weight);
    line-height: 1.45;
    text-align: center;
  }

  .survival-card__message em {
    position: absolute;
    top: 12px;
    left: 12px;
    min-width: 45px;
    min-height: 23px;
    margin-top: 0;
  }

  .dashboard-overview {
    grid-template-columns: 1fr;
    gap: 22px;
    margin-top: 20px;
  }

  .section-head {
    margin-bottom: 8px;
  }

  .section-head h2,
  .block-title {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }

  .dashboard-report {
    gap: 14px;
  }

  .dashboard-report__summary {
    gap: 9px;
  }

  .dashboard-report__summary article {
    min-height: 104px;
    padding: 14px 16px;
    border-radius: 15px;
  }

  .dashboard-report__summary strong {
    font-size: clamp(15px, 5.6vw, 20px);
    white-space: nowrap;
  }

  .dashboard-report__cashflow-item {
    padding: 14px 10px;
  }

  .dashboard-report__cashflow-item strong {
    font-size: 16px;
  }

  .dashboard-report__notice,
  :global(#app .app-shell main .dashboard-report__notice) {
    padding: 9px 14px;
    font-size: 13px !important;
  }

  .summary__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .summary-card {
    min-height: 82px;
    padding: 13px 10px;
    border-radius: 14px;
    box-shadow: var(--shadow-sm);
  }

  .summary-card--asset {
    grid-column: 1 / -1;
    min-height: 105px;
    padding: 16px;
  }

  .summary-card--asset strong {
    font-size: var(--font-page-title);
  }

  .summary-card:not(.summary-card--asset) span {
    min-width: 0;
    min-height: 2.8em;
    overflow-wrap: anywhere;
    line-height: 1.35;
    white-space: normal;
  }

  .summary-card:not(.summary-card--asset) strong {
    font-size: clamp(11px, 3.2vw, 13px);
    white-space: nowrap;
  }

  .summary-card--cash span {
    white-space: normal !important;
  }

  .summary-card--cash span small {
    display: inline;
  }

  .dashboard__bottom {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-top: 22px;
  }

  .simulation-cta {
    min-height: 180px;
    flex-direction: column;
    justify-content: center;
    gap: 13px;
    padding: 22px 18px;
    text-align: center;
  }

  .simulation-cta__confirmed {
    width: 100%;
    text-align: left;
  }

  .simulation-cta__result {
    justify-content: center;
  }

  .simulation-cta h3 {
    font-size: var(--font-card-title);
  }

  .simulation-cta p {
    margin-top: 8px;
    font-size: var(--font-small);
  }

  .simulation-cta__button {
    padding: 11px 20px;
  }

  .section-head--goal {
    margin-bottom: 8px;
  }

  .goal-card {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .goal-card__item {
    min-height: 0;
    padding: 20px;
    border-radius: 20px;
  }

  .goal-card__value {
    font-size: 24px;
  }

  .dashboard__bottom {
    gap: 22px;
  }

  .block-heading {
    min-height: 34px;
    margin-bottom: 10px;
  }

  .block-heading h2 {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }

  .confirmed-badge {
    padding: 7px 16px;
  }

  .home-quest-card { padding:18px 12px 15px; border-radius:20px; }
  .home-quest-header { display:grid; gap:12px; }
  .home-quest-header h2 { font-size:18px; }
  .home-quest-tabs { width:100%; min-width:0; gap:8px; }
  .home-quest-tabs button { min-height:38px; padding:0 10px; font-size:13px; }
  .home-quest-tabs button strong { font-size:15px; }
  .home-quest-progress { margin-top:16px; padding:14px 13px; border-radius:16px; }
  .home-quest-progress__top { grid-template-columns:1fr auto; gap:8px 12px; }
  .home-quest-progress__top > strong { font-size:14px; }
  .home-quest-progress__top > span { font-size:11px; }
  .home-quest-progress__top > b { grid-row:2; grid-column:1 / -1; justify-items:end; font-size:18px; }
  .home-quest-progress__track { height:8px; }
  .home-quest-section { margin-top:22px; }
  .home-quest-section > header { gap:10px; margin-bottom:13px; }
  .home-quest-section > header h3 { font-size:16px; }
  .home-quest-section > header p { font-size:12px; }
  .home-quest-section > header > span { padding:5px 8px; font-size:10px; }
  .home-quest-row { min-height:68px; grid-template-columns:40px minmax(0,1fr) 30px; gap:8px; padding:10px 9px; border-radius:16px; }
  .home-quest-row__icon { width:36px; height:36px; }
  .home-quest-row__copy > strong { font-size:14px; }
  .home-quest-row__copy small { font-size:10px; }
  .home-quest-row__amount { grid-row:2; grid-column:2; justify-self:start; font-size:14px; }
  .home-quest-row.is-policy { grid-template-columns:40px minmax(0,1fr) auto 30px; }
  .home-quest-row.is-policy .home-quest-row__icon { grid-row:1 / span 2; grid-column:1; }
  .home-quest-row.is-policy .home-quest-row__copy { grid-row:1; grid-column:2 / span 2; }
  .home-quest-row.is-policy .home-quest-row__apply { grid-row:2; grid-column:2; justify-self:end; }
  .home-quest-row.is-policy .home-quest-row__amount { grid-row:2; grid-column:3; }
  .home-quest-row__check { width:30px !important; min-width:30px; max-width:30px; height:30px !important; min-height:30px !important; max-height:30px; grid-row:1 / span 3; grid-column:3; }
  .home-quest-row.is-policy .home-quest-row__check { grid-row:1 / span 2; grid-column:4; }
  .home-quest-empty-row { min-height:106px; justify-items:center; padding:20px 16px; text-align:center; }
  .home-quest-footer { display:grid; gap:16px; margin-top:26px; padding-top:20px; }
  .home-quest-footer p { font-size:12px; }
  .home-quest-footer a { width:100%; min-height:38px; font-size:13px; }

  .quest-card {
    padding: 14px 12px 16px;
    border-radius: 22px;
  }

  .quest-tabs {
    width: min(100%, 360px);
    height: 52px;
    margin: 0 auto 18px;
  }

  .quest-completion {
    margin: 0 0 18px;
  }

  .quest-completion__track {
    height: 10px;
  }

  .quest-period + .quest-period {
    margin-top: 20px;
    padding-top: 20px;
  }

  .quest-period__heading {
    gap: 10px;
    margin-bottom: 14px;
  }

  .quest-period__heading h3 {
    font-size: var(--font-body);
  }

  .quest-period__heading > span {
    padding: 4px 7px;
  }

  .quest-groups {
    gap: 20px;
  }

  .quest-row {
    min-height: 84px;
    grid-template-columns: 48px minmax(0, 1fr) 34px;
    gap: 10px;
    padding: 12px 13px;
    border-radius: 18px;
  }

  .quest-row__icon {
    width: 44px;
    height: 44px;
  }

  .quest-row__copy strong,
  .quest-row__amount {
    font-size: 16px;
  }

  .quest-row__amount {
    grid-column: 2;
    justify-self: start;
    margin-top: -4px;
  }

  .quest-row__check {
    grid-column: 3;
    grid-row: 1 / span 2;
  }

  .quest-row__copy small {
    white-space: normal;
  }

  .quest-row__copy .quest-row__subtitle {
    font-size: 10px;
  }

  .quest-card__footer {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .quest-card__footer strong {
    font-size: 20px;
  }

  .quest-card__footer a {
    width: auto;
    min-width: 188px;
    max-width: 100%;
    min-height: 50px;
  }

  .goal-setting-card {
    min-height: 190px;
    gap: 24px 18px;
    padding: 22px 20px;
  }

  .goal-setting-card strong {
    font-size: 18px;
  }
}

@media (max-width: 390px) {
  .summary-card {
    padding-right: 7px;
    padding-left: 7px;
  }
}

@media (max-width: 767px) {
  .home-quest-footer {
    justify-items: center;
  }

  .home-quest-footer a {
    width: min(100%, 280px);
    justify-self: center;
    gap: 0;
    margin-right: auto;
    margin-left: auto;
    text-align: center;
  }

  .home-quest-footer a .app-icon { display: none; }
}
</style>
