<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import AppFooter from '@/components/navigation/AppFooter.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import FinancialInstitutionLogo from '@/components/ui/FinancialInstitutionLogo.vue'
import buttieLoadingImage from '@/assets/images/onboarding/buttie-loading.png'
import buttieCompletionImage from '@/assets/images/dashboard/levels/buttie-l1-stable.png'
import { loadTransactions, setFixed } from '@/features/finance/financeStore'
import {
  ensureMyDataConnection,
  loadMyDataCatalog,
  mydataState,
  registerMyDataSelection,
  syncMyData,
} from '@/features/mydata/mydataStore'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const isMyDataReconnect = computed(() => route.query.mode === 'mydata')
const step = ref(isMyDataReconnect.value ? 2 : 1)
const consentChecked = ref(true)
const openedConsent = ref('')
const bankSearch = ref('')
const selectedBanks = ref([])
const employmentSubmitting = ref(false)
const employmentError = ref('')
const mydataError = ref('')
const mydataSubmitting = ref(false)
const catalogLoadingStage = ref(0)
const fixedSubmitting = ref(false)

const regions = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '충청북도',
  '충청남도',
  '전라남도',
  '경상북도',
  '경상남도',
  '강원특별자치도',
  '전북특별자치도',
  '제주특별자치도',
]

function formatDateInput(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function addMonthsClamped(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

const onboardingDate = new Date()
const form = ref({
  type: '첫취업',
  startDate: formatDateInput(onboardingDate),
  targetDate: formatDateInput(addMonthsClamped(onboardingDate, 6)),
  region: '서울특별시',
  household: 1,
  minimumLivingFund: '',
})

const accounts = ref([])
const cards = ref([])
const fixedExpenses = ref([])

const banks = computed(() =>
  mydataState.institutions.map((institution) => ({
    name: institution.institutionName,
    accountCount: Number(institution.accountCount) || 0,
    cardCount: Number(institution.cardCount) || 0,
  })),
)

const filteredBanks = computed(() => {
  const keyword = bankSearch.value.trim().toLowerCase()
  if (!keyword) return banks.value
  return banks.value.filter((bank) => bank.name.toLowerCase().includes(keyword))
})

const selectedAccountCount = computed(
  () => accounts.value.filter((account) => account.selected).length,
)
const selectedCardCount = computed(() => cards.value.filter((card) => card.selected).length)
const selectedAssetCount = computed(() => selectedAccountCount.value + selectedCardCount.value)
const hasMinimumLivingFund = computed(() => Number(form.value.minimumLivingFund) >= 1)
const hasValidEmploymentPreparation = computed(() => {
  const household = Number(form.value.household)
  return (
    Boolean(form.value.startDate) &&
    Boolean(form.value.targetDate) &&
    form.value.startDate <= form.value.targetDate &&
    Boolean(form.value.region) &&
    Number.isInteger(household) &&
    household >= 1 &&
    household < 10 &&
    hasMinimumLivingFund.value
  )
})

function preventInvalidHouseholdKey(event) {
  if (['-', '+', 'e', 'E', '.'].includes(event.key)) {
    event.preventDefault()
  }
}

function updateHousehold(event) {
  const value = event.target.value

  if (value === '') {
    form.value.household = ''
    return
  }

  const household = Number(value)
  if (Number.isFinite(household)) {
    const normalizedHousehold = Math.min(9, Math.max(1, Math.trunc(household)))
    form.value.household = normalizedHousehold
    event.target.value = String(normalizedHousehold)
  }
}

const selectedBalance = computed(() =>
  accounts.value
    .filter((account) => account.selected)
    .reduce((total, account) => total + account.amount, 0),
)

function createGroupSelection(kind) {
  const source = kind === 'card' ? cards : accounts
  return computed({
    get: () => {
      const group = source.value
      return group.length > 0 && group.every((account) => account.selected)
    },
    set: (checked) => {
      source.value.forEach((account) => (account.selected = checked))
    },
  })
}

const allAccountsSelected = createGroupSelection('account')
const allCardsSelected = createGroupSelection('card')

const allFixedChecked = computed({
  get: () => fixedExpenses.value.length > 0 && fixedExpenses.value.every((item) => item.checked),
  set: (checked) => fixedExpenses.value.forEach((item) => (item.checked = checked)),
})

const selectedFixedExpenses = computed(() => fixedExpenses.value.filter((item) => item.checked))
const selectedFixedTotal = computed(() =>
  selectedFixedExpenses.value.reduce((total, item) => total + item.amount, 0),
)
const selectedFixedTotalLabel = computed(() => {
  const amountInTenThousands = selectedFixedTotal.value / 10000
  return `${Number.isInteger(amountInTenThousands) ? amountInTenThousands : amountInTenThousands.toFixed(1)}만원`
})

function formatMoneyInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

function updateMinimumLivingFund(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.value.minimumLivingFund = digits ? Number(digits) : ''
  event.target.value = formatMoneyInput(digits)
}

watch(
  step,
  () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  { immediate: true },
)

watch(
  form,
  () => {
    employmentError.value = ''
  },
  { deep: true },
)

function toggleBank(bank) {
  selectedBanks.value = selectedBanks.value.includes(bank)
    ? selectedBanks.value.filter((item) => item !== bank)
    : [...selectedBanks.value, bank]
}

function financialGroupName(name = '') {
  const compact = String(name)
    .toLowerCase()
    .replace(/주식회사|㈜|\(주\)|은행|카드사|카드|금융|저축/g, '')
    .replace(/[^0-9a-z가-힣]/g, '')
  const aliases = [
    [/^(kb|국민)/, 'kb국민'],
    [/^(nh|농협)/, 'nh농협'],
    [/^(ibk|기업)/, 'ibk기업'],
    [/^(신한)/, '신한'],
    [/^(우리)/, '우리'],
    [/^(하나|keb)/, '하나'],
  ]
  return aliases.find(([pattern]) => pattern.test(compact))?.[1] || compact
}

function belongsToSelectedInstitution(institutionName, selectedInstitutions) {
  const group = financialGroupName(institutionName)
  return [...selectedInstitutions].some((selected) => financialGroupName(selected) === group)
}

function hydrateAssets() {
  const selectedInstitutions = new Set(selectedBanks.value)
  accounts.value = mydataState.accounts
    .filter((item) => belongsToSelectedInstitution(item.institutionName, selectedInstitutions))
    .map((item) => ({
      id: String(item.accountId),
      institutionName: item.institutionName,
      name: `${item.institutionName} ${item.accountName}`.trim(),
      meta: `${item.accountNumberMasked} · ${item.accountType || '계좌'}`,
      amount: Number(item.balance) || 0,
      selected: true,
    }))
  cards.value = mydataState.cards
    .filter((item) => belongsToSelectedInstitution(item.institutionName, selectedInstitutions))
    .map((item) => ({
      id: String(item.cardId),
      institutionName: item.institutionName,
      cardName: item.cardName,
      name: `${item.institutionName} ${item.cardName}`.trim(),
      meta: `${item.cardNumberMasked} · ${item.cardType || '카드'}`,
      selected: true,
    }))
}

function mapFixedExpenseCandidates() {
  fixedExpenses.value = mydataState.fixedExpenseCandidates.map((item) => ({
    id: item.representativeTransactionId,
    category: item.expenseCategory || '기타',
    categoryTotal: '',
    color: '#5973e8',
    icon: (item.transactionContent || '고').slice(0, 1),
    name: item.transactionContent || '고정지출 후보',
    day: `매월 ${item.expectedPaymentDay || '-'}일 · ${item.occurrenceCount || 0}회 감지`,
    amount: Math.abs(Number(item.expectedAmount) || 0),
    checked: true,
  }))
}

async function connectAndLoadCatalog() {
  mydataSubmitting.value = true
  mydataError.value = ''
  catalogLoadingStage.value = 0
  step.value = 4
  const loadingSequence = (async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 260))
    catalogLoadingStage.value = 1
    await new Promise((resolve) => window.setTimeout(resolve, 420))
    catalogLoadingStage.value = 2
    await new Promise((resolve) => window.setTimeout(resolve, 420))
    catalogLoadingStage.value = 3
    await new Promise((resolve) => window.setTimeout(resolve, 280))
  })()
  try {
    if (session.isMockMode) {
      mydataState.institutions = [{ institutionName: 'KB국민은행', accountCount: 2, cardCount: 1 }]
      mydataState.accounts = [
        {
          accountId: 'mock-account-1',
          institutionName: 'KB국민은행',
          accountName: '입출금',
          accountType: '입출금',
          accountNumberMasked: '****-**-****-2847',
          balance: 1800000,
          isConsent: true,
        },
        {
          accountId: 'mock-account-2',
          institutionName: 'KB국민은행',
          accountName: '적금',
          accountType: '예·적금',
          accountNumberMasked: '****-**-****-5931',
          balance: 1200000,
          isConsent: true,
        },
      ]
      mydataState.cards = [
        {
          cardId: 'mock-card-1',
          institutionName: 'KB국민카드',
          cardName: '이소비 체크카드',
          cardType: '체크카드',
          cardNumberMasked: '5412-****-****-3020',
          isConsent: true,
        },
      ]
    } else {
      await ensureMyDataConnection()
      await loadMyDataCatalog()
    }
    selectedBanks.value = mydataState.institutions.map((item) => item.institutionName)
    await loadingSequence
    step.value = 5
  } catch (error) {
    mydataError.value = error.message || '마이데이터 금융기관을 불러오지 못했습니다.'
  } finally {
    mydataSubmitting.value = false
  }
}

async function registerAndSyncAssets() {
  mydataSubmitting.value = true
  mydataError.value = ''
  step.value = 7
  try {
    if (session.isMockMode) {
      mydataState.lastSync = {
        insertedTransactionCount: 128,
        lastSyncedAt: new Date().toISOString(),
      }
      fixedExpenses.value = []
      session.refreshMyData(mydataState.lastSync.lastSyncedAt)
      step.value = 8
      return
    }
    await registerMyDataSelection({
      accountIds: accounts.value.filter((item) => item.selected).map((item) => item.id),
      cardIds: cards.value.filter((item) => item.selected).map((item) => item.id),
    })
    const syncResult = await syncMyData()
    await loadTransactions(true)
    mapFixedExpenseCandidates()
    session.refreshMyData(syncResult?.lastSyncedAt)
    step.value = 8
  } catch (error) {
    mydataError.value = error.message || '선택한 금융정보를 동기화하지 못했습니다.'
  } finally {
    mydataSubmitting.value = false
  }
}

function goBack() {
  if (isMyDataReconnect.value && step.value === 2) {
    router.push(String(route.query.returnTo || '/mypage/data'))
    return
  }
  if (step.value === 1) {
    router.push('/auth/login')
    return
  }
  if (step.value === 5) {
    step.value = 3
    return
  }
  if (step.value === 8) {
    step.value = 6
    return
  }
  step.value -= 1
}

async function saveInitialEmploymentPreparation() {
  if (!hasValidEmploymentPreparation.value || employmentSubmitting.value) {
    employmentError.value =
      form.value.startDate > form.value.targetDate
        ? '목표 취업일은 준비 시작일 이후로 설정해 주세요.'
        : '취업 준비 정보를 모두 올바르게 입력해 주세요.'
    return false
  }

  employmentSubmitting.value = true
  employmentError.value = ''
  try {
    await session.saveEmploymentPreparation({
      jobType: form.value.type === '재취업' ? 'again' : 'first',
      startDate: form.value.startDate,
      goalDate: form.value.targetDate,
      region: form.value.region,
      family: Number(form.value.household),
      financialRiskAlertAmount: Number(form.value.minimumLivingFund),
    })
    return true
  } catch (error) {
    employmentError.value = error.message || '취업 준비 정보를 저장하지 못했습니다.'
    return false
  } finally {
    employmentSubmitting.value = false
  }
}

async function next() {
  if (step.value === 1) {
    if (await saveInitialEmploymentPreparation()) step.value = 2
  } else if (step.value === 2) step.value = 3
  else if (step.value === 3 && consentChecked.value) await connectAndLoadCatalog()
  else if (step.value === 5 && selectedBanks.value.length) {
    hydrateAssets()
    step.value = 6
  } else if (step.value === 6 && selectedAssetCount.value) await registerAndSyncAssets()
  else if (step.value === 8) step.value = 9
  else if (step.value === 9) {
    fixedSubmitting.value = true
    mydataError.value = ''
    try {
      const ids = selectedFixedExpenses.value.map((item) => item.id).filter(Boolean)
      if (ids.length && !(await setFixed(ids, true))) {
        throw new Error('선택한 고정지출을 등록하지 못했습니다.')
      }
      session.login()
      router.push(String(route.query.returnTo || '/dashboard'))
    } catch (error) {
      mydataError.value = error.message || '고정지출을 저장하지 못했습니다.'
    } finally {
      fixedSubmitting.value = false
    }
  }
}
</script>

<template>
  <main class="onboarding-page" :class="`onboarding-page--step-${step}`">
    <header class="desktop-header">
      <BrandLogo />
    </header>

    <section class="onboarding-stage" :class="{ 'onboarding-stage--wide': step === 9 }">
      <button v-if="step !== 4 && step !== 7" class="mobile-back" type="button" @click="goBack">
        <span aria-hidden="true">←</span>
        {{ step === 1 ? '로그인으로' : '이전' }}
      </button>

      <template v-if="step === 1">
        <div class="mobile-hero-icon"><AppIcon name="briefcase" :size="27" /></div>
        <div class="stage-heading stage-heading--center-mobile">
          <h1>취업 준비 정보</h1>
          <p>내 현재 상황을 바탕으로 준비 계획을 만들어요.</p>
          <p class="mobile-copy">나만의 분석을 위한 기본 정보를 알려주세요</p>
        </div>

        <div class="flow-card job-form">
          <fieldset class="field-group employment-field">
            <legend><AppIcon name="briefcase" :size="15" /> 취업 준비 유형</legend>
            <div class="choice-row">
              <button
                v-for="type in ['첫취업', '재취업']"
                :key="type"
                class="choice-pill"
                :class="{ selected: form.type === type }"
                type="button"
                @click="form.type = type"
              >
                {{ type }}
              </button>
            </div>
          </fieldset>

          <div class="date-row">
            <label class="field-group">
              <span class="field-label"><AppIcon name="calendar" :size="15" /> 준비 시작일</span>
              <input v-model="form.startDate" class="control" type="date" />
            </label>
            <label class="field-group">
              <span class="field-label"><AppIcon name="clock" :size="15" /> 목표 취업일</span>
              <input v-model="form.targetDate" class="control" type="date" />
            </label>
          </div>

          <label class="field-group">
            <span class="field-label"><AppIcon name="map-pin" :size="16" /> 거주지</span>
            <select v-model="form.region" class="control">
              <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
            </select>
            <small>17개 시·도 중 선택 · 정책 추천에 활용돼요</small>
          </label>

          <label class="field-group">
            <span class="field-label"><AppIcon name="users" :size="16" /> 세대원 수</span>
            <input
              :value="form.household"
              class="control"
              type="number"
              min="1"
              max="9"
              step="1"
              inputmode="numeric"
              placeholder="세대원 수를 입력하세요"
              @keydown="preventInvalidHouseholdKey"
              @input="updateHousehold"
            />
            <small>본인을 포함해 1~9명까지 입력할 수 있어요</small>
          </label>

          <label class="field-group">
            <span class="field-label"
              ><AppIcon name="wallet" :size="16" /> 재정 위험 알림 금액</span
            >
            <input
              :value="formatMoneyInput(form.minimumLivingFund)"
              class="control"
              type="text"
              inputmode="numeric"
              placeholder="재정 위험 알림 금액을 입력하세요"
              @input="updateMinimumLivingFund"
            />
            <small>이 금액 이하로 떨어지면 위험 단계로 알려드릴게요</small>
          </label>
        </div>

        <button
          class="primary-cta"
          type="button"
          :disabled="!hasValidEmploymentPreparation || employmentSubmitting"
          @click="next"
        >
          <strong>{{ employmentSubmitting ? '저장 중...' : '다음: 금융 정보 연결' }}</strong>
        </button>
        <p v-if="employmentError" class="employment-error" role="alert">
          {{ employmentError }}
        </p>
        <p class="bottom-helper">나중에 마이페이지에서 수정할 수 있어요</p>
      </template>

      <template v-else-if="step === 2">
        <div class="mobile-hero-icon"><AppIcon name="shield" :size="31" /></div>
        <div class="stage-heading stage-heading--center-mobile">
          <h1>금융 정보 연결</h1>
          <p class="desktop-copy">필요한 금융 정보만 안전하게 연결해요.</p>
          <p class="mobile-copy mobile-copy--finance">
            금융기관 데이터를 안전하게 연결해<br />
            나의 취업 준비 자금 현황을 자동으로 분석해요
          </p>
        </div>

        <div class="flow-card collect-card">
          <h2>수집하는 정보</h2>
          <ul>
            <li>계좌별 잔액</li>
            <li>입출금내역</li>
            <li>반복지출 자동 인식</li>
          </ul>
        </div>

        <button class="primary-cta" type="button" @click="next">
          <strong>금융정보 연결하기</strong>
        </button>
        <p class="security-note">
          <AppIcon name="lock" :size="12" /> 금융보안원 인증 · 256-bit 암호화 · 조회 전용
        </p>
      </template>

      <template v-else-if="step === 3">
        <div class="stage-heading">
          <h1>정보 제공 동의</h1>
          <p class="desktop-copy consent-desktop-copy">선택한 기관 연결을 위해 동의가 필요해요.</p>
          <p class="mobile-copy consent-mobile-copy">
            선택한 2개 금융기관 정보를 불러오기 위해 동의가 필요해요
          </p>
        </div>

        <div class="consent-list">
          <button
            v-for="item in [
              ['items', '수집 항목', '계좌별 잔액, 입출금 내역, 반복지출 자동 인식'],
              ['purpose', '수집 목적', '재정 현황 분석 및 맞춤형 취업 준비 계획 제공'],
              ['retention', '보유 기간', '서비스 이용 기간 또는 동의 철회 시까지'],
            ]"
            :key="item[0]"
            class="accordion"
            type="button"
            @click="openedConsent = openedConsent === item[0] ? '' : item[0]"
          >
            <span>{{ item[1] }}</span>
            <span>⌄</span>
            <small v-if="openedConsent === item[0]">{{ item[2] }}</small>
          </button>
        </div>

        <label class="required-consent">
          <input v-model="consentChecked" type="checkbox" />
          <span>위 내용에 모두 동의합니다 <strong>[필수]</strong></span>
        </label>
        <button class="primary-cta" type="button" :disabled="!consentChecked" @click="next">
          <strong>인증 진행하기</strong>
        </button>
      </template>

      <template v-else-if="step === 4">
        <div class="loading-screen loading-screen--analysis">
          <div class="loading-buttie-ring" aria-hidden="true">
            <span></span>
            <img class="loading-buttie" :src="buttieLoadingImage" alt="" />
          </div>
          <h1>마이데이터 정보 불러오는 중</h1>
          <p>연결한 금융기관의 계좌와 카드 정보를 확인하고 있어요</p>
          <div class="loading-status">
            <div
              :class="{ completed: catalogLoadingStage >= 1, working: catalogLoadingStage === 0 }"
            >
              <i class="status-dot" :class="catalogLoadingStage >= 1 ? 'done' : 'working'">
                {{ catalogLoadingStage >= 1 ? '✓' : '' }}
              </i>
              <span>마이데이터 인증</span>
              <strong>{{ catalogLoadingStage >= 1 ? '완료' : '인증 중' }}</strong>
            </div>
            <div
              :class="{ completed: catalogLoadingStage >= 2, working: catalogLoadingStage === 1 }"
            >
              <i
                class="status-dot"
                :class="
                  catalogLoadingStage >= 2 ? 'done' : catalogLoadingStage === 1 ? 'working' : ''
                "
                >{{ catalogLoadingStage >= 2 ? '✓' : '' }}</i
              >
              <span>금융기관 조회</span>
              <strong>{{
                catalogLoadingStage >= 2
                  ? '완료'
                  : catalogLoadingStage === 1
                    ? '조회 중'
                    : '대기 중'
              }}</strong>
            </div>
            <div
              :class="{ completed: catalogLoadingStage >= 3, working: catalogLoadingStage === 2 }"
            >
              <i
                class="status-dot"
                :class="
                  catalogLoadingStage >= 3 ? 'done' : catalogLoadingStage === 2 ? 'working' : ''
                "
                >{{ catalogLoadingStage >= 3 ? '✓' : '' }}</i
              >
              <span>계좌·카드 조회</span>
              <strong>{{
                catalogLoadingStage >= 3
                  ? '완료'
                  : catalogLoadingStage === 2
                    ? '조회 중'
                    : '대기 중'
              }}</strong>
            </div>
          </div>
          <div class="progress-track">
            <span :style="{ width: `${Math.max(8, (catalogLoadingStage / 3) * 100)}%` }" />
          </div>
          <small>완료되면 자동으로 다음 화면으로 이동해요</small>
          <p v-if="mydataError" class="employment-error" role="alert">{{ mydataError }}</p>
          <button
            v-if="mydataError"
            class="primary-cta"
            type="button"
            :disabled="mydataSubmitting"
            @click="connectAndLoadCatalog"
          >
            다시 시도
          </button>
        </div>
      </template>

      <template v-else-if="step === 5">
        <div class="stage-heading split-heading">
          <div>
            <h1>금융기관 선택</h1>
            <p>연결할 기관을 선택하세요. 복수 선택 가능</p>
          </div>
          <strong>{{ selectedBanks.length }}개 선택됨</strong>
        </div>

        <input v-model="bankSearch" class="bank-search" placeholder="금융기관 검색" />

        <div v-if="selectedBanks.length" class="selected-chips">
          <button
            v-for="bank in selectedBanks"
            :key="bank"
            type="button"
            :title="bank"
            @click="toggleBank(bank)"
          >
            <span class="selected-chip__name">{{ bank }}</span>
            <span class="selected-chip__remove" aria-hidden="true">×</span>
          </button>
        </div>

        <div class="bank-list">
          <button
            v-for="bank in filteredBanks"
            :key="bank.name"
            class="bank-row"
            :class="{ selected: selectedBanks.includes(bank.name) }"
            type="button"
            @click="toggleBank(bank.name)"
          >
            <FinancialInstitutionLogo :name="bank.name" :size="46" />
            <span class="bank-name">
              <strong>{{ bank.name }}</strong>
              <small
                >계좌 {{ bank.accountCount }}개 · 카드 {{ bank.cardCount }}개 ·
                {{ selectedBanks.includes(bank.name) ? '선택됨' : '연결 가능' }}</small
              >
            </span>
            <span v-if="selectedBanks.includes(bank.name)" class="round-check">✓</span>
          </button>
        </div>

        <button
          class="primary-cta sticky-cta"
          type="button"
          :disabled="!selectedBanks.length"
          @click="next"
        >
          <strong>선택 완료 ({{ selectedBanks.length }}개)</strong>
        </button>
      </template>

      <template v-else-if="step === 6">
        <div class="stage-heading">
          <h1>금융 자산 선택</h1>
          <p>분석에 사용할 계좌와 카드를 선택하세요.</p>
        </div>

        <div class="asset-section">
          <div class="asset-section__header">
            <span>계좌 · {{ accounts.length }}</span>
            <label>전체 선택 <input v-model="allAccountsSelected" type="checkbox" /></label>
          </div>
          <button
            v-for="account in accounts"
            :key="account.id"
            class="asset-card"
            :class="{ selected: account.selected }"
            :aria-pressed="account.selected"
            type="button"
            @click="account.selected = !account.selected"
          >
            <FinancialInstitutionLogo :name="account.institutionName" :size="44" />
            <span>
              <strong>{{ account.name }}</strong>
              <small>{{ account.meta }}</small>
            </span>
            <b>{{ account.amount.toLocaleString() }}원</b>
            <i v-if="account.selected" class="round-check">✓</i>
          </button>
        </div>

        <div v-if="cards.length" class="asset-section">
          <div class="asset-section__header">
            <span>카드 · {{ cards.length }}</span>
            <label>전체 선택 <input v-model="allCardsSelected" type="checkbox" /></label>
          </div>
          <button
            v-for="card in cards"
            :key="card.id"
            class="asset-card"
            :class="{ selected: card.selected }"
            :aria-pressed="card.selected"
            type="button"
            @click="card.selected = !card.selected"
          >
            <FinancialInstitutionLogo
              :name="`${card.institutionName} ${card.cardName}`"
              kind="card"
              :size="44"
            />
            <span>
              <strong>{{ card.name }}</strong>
              <small>{{ card.meta }}</small>
            </span>
            <i v-if="card.selected" class="round-check">✓</i>
          </button>
        </div>

        <div class="selected-balance">
          <span>선택한 자산</span>
          <strong>{{ selectedAssetCount }}개</strong>
          <span>총 잔액</span>
          <b>{{ selectedBalance.toLocaleString() }}원</b>
        </div>
        <button class="primary-cta" type="button" :disabled="!selectedAssetCount" @click="next">
          <strong>선택 완료 ({{ selectedAssetCount }}개)</strong>
        </button>
      </template>

      <template v-else-if="step === 7">
        <div class="loading-screen loading-screen--analysis">
          <div class="loading-buttie-ring" aria-hidden="true">
            <span></span>
            <img class="loading-buttie" :src="buttieLoadingImage" alt="" />
          </div>
          <h1>마이데이터 분석 중</h1>
          <p>계좌와 거래내역을 불러오고 있어요</p>
          <div class="loading-status">
            <div>
              <i class="status-dot done">✓</i><span>선택 자산 등록</span
              ><strong>{{ selectedAssetCount }}개</strong>
            </div>
            <div>
              <i class="status-dot working" /><span>거래내역 동기화 중...</span
              ><strong>진행 중</strong>
            </div>
            <div><i class="status-dot" /><span>재정 현황 계산</span><strong>대기 중</strong></div>
          </div>
          <div class="progress-track"><span /></div>
          <small>완료되면 자동으로 다음 화면으로 이동해요</small>
          <p v-if="mydataError" class="employment-error" role="alert">{{ mydataError }}</p>
          <button
            v-if="mydataError"
            class="primary-cta"
            type="button"
            :disabled="mydataSubmitting"
            @click="registerAndSyncAssets"
          >
            다시 시도
          </button>
        </div>
      </template>

      <template v-else-if="step === 8">
        <div class="completion-screen">
          <div class="completion-character">
            <span aria-hidden="true" />
            <img :src="buttieCompletionImage" alt="마이데이터 연결을 완료한 버티" />
          </div>
          <div class="stage-heading stage-heading--center-mobile">
            <h1>연결 완료!</h1>
            <p>금융 데이터를 성공적으로 불러왔어요.</p>
          </div>
          <div class="completion-summary">
            <span
              >총 자산 <strong>{{ selectedBalance.toLocaleString() }}원</strong></span
            >
            <span
              >연결 자산 <strong>{{ selectedAssetCount }}개</strong></span
            >
            <span
              >가져온 거래
              <strong class="danger"
                >{{ mydataState.lastSync?.insertedTransactionCount || 0 }}건</strong
              ></span
            >
          </div>
          <button class="primary-cta" type="button" @click="next">
            <strong>고정지출 확인하기 →</strong>
          </button>
          <p class="bottom-helper">연결한 데이터를 분석해 고정지출을 확인해요</p>
        </div>
      </template>

      <template v-else>
        <div class="stage-heading fixed-heading">
          <h1>고정지출을 확인해 주세요</h1>
          <p>연결한 마이데이터에서 반복 결제 내역을 찾았어요.</p>
        </div>

        <div class="fixed-summary">
          <span>이번 달 예상 고정지출</span>
          <strong>{{ selectedFixedTotalLabel }}</strong>
          <small>총 {{ selectedFixedExpenses.length }}건</small>
        </div>
        <div class="fixed-controls">
          <p class="fixed-guide">고정지출로 반영할 항목을 체크해 주세요.</p>
          <label class="select-all-fixed">
            <input v-model="allFixedChecked" type="checkbox" :disabled="!fixedExpenses.length" />
            <span>전체 선택</span>
          </label>
        </div>

        <div class="expense-list">
          <div v-if="!fixedExpenses.length" class="fixed-empty">
            <span aria-hidden="true"><AppIcon name="wallet" :size="24" /></span>
            <strong>반복 결제 내역이 없어요</strong>
            <p>나중에 거래내역에서 고정지출을 직접 등록할 수 있어요.</p>
          </div>
          <div v-for="item in fixedExpenses" :key="item.name" class="expense-block">
            <div v-if="item.category" class="expense-category">
              <span><i :style="{ background: item.color }" />{{ item.category }}</span>
              <strong>{{ item.categoryTotal }}</strong>
            </div>
            <label class="expense-row" :class="{ selected: item.checked }">
              <span class="expense-icon">{{ item.icon }}</span>
              <span class="expense-name"
                ><strong>{{ item.name }}</strong
                ><small>{{ item.day }}</small></span
              >
              <b>-{{ item.amount.toLocaleString() }}원</b>
              <input v-model="item.checked" type="checkbox" />
            </label>
          </div>
        </div>

        <p v-if="mydataError" class="employment-error" role="alert">{{ mydataError }}</p>
        <button
          class="primary-cta fixed-cta"
          type="button"
          :disabled="fixedSubmitting"
          @click="next"
        >
          <strong>{{ fixedSubmitting ? '저장 중...' : '확인 완료하고 홈으로 →' }}</strong>
        </button>
        <p class="bottom-helper">체크를 해제한 항목은 고정지출에 반영되지 않아요.</p>
      </template>
    </section>
  </main>
  <AppFooter class="desktop-only" />
</template>

<style scoped>
.onboarding-page {
  --flow-blue: #0a1680;
  --flow-action: #89a8f5;
  --flow-yellow: #fbedb0;
  min-height: 100dvh;
  background: #fcfdff;
  color: #222;
}

.desktop-header {
  position: absolute;
  top: 48px;
  left: 50px;
}

.onboarding-stage {
  position: relative;
  width: min(100% - 40px, 460px);
  margin: 0 auto;
  padding: 195px 0 70px;
}

.onboarding-stage--wide {
  width: min(100% - 48px, 720px);
  padding-top: 130px;
}

.onboarding-page--step-2 .onboarding-stage,
.onboarding-page--step-3 .onboarding-stage,
.onboarding-page--step-4 .onboarding-stage,
.onboarding-page--step-5 .onboarding-stage,
.onboarding-page--step-6 .onboarding-stage,
.onboarding-page--step-7 .onboarding-stage,
.onboarding-page--step-8 .onboarding-stage {
  width: min(100% - 48px, 720px);
  padding-top: 130px;
}

.onboarding-page--step-2 .stage-heading,
.onboarding-page--step-3 .stage-heading,
.onboarding-page--step-5 .stage-heading,
.onboarding-page--step-6 .stage-heading {
  text-align: left;
}

.mobile-hero-icon,
.mobile-copy,
.app-only,
.security-note {
  display: none;
}

.mobile-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin: -52px 0 20px;
  padding: 0 10px 0 0;
  border: 0;
  background: transparent;
  color: #666;
  font-size: var(--font-body);
  font-weight: 700;
  cursor: pointer;
}

.mobile-back > span {
  font-size: 20px;
  line-height: 1;
}

.mobile-back:hover {
  color: #222;
}

.stage-heading h1 {
  margin: 0;
  color: var(--flow-blue);
  font-size: var(--font-page-title);
  line-height: 1.25;
}

.stage-heading p {
  margin: 8px 0 0;
  color: #666;
  font-size: var(--font-body);
  line-height: 1.55;
}

.flow-card {
  margin-top: 42px;
}

.job-form {
  display: grid;
  gap: 18px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none !important;
  filter: none;
}

.primary-cta strong {
  font-family: Pretendard, sans-serif;
  font-weight: 800;
}

.field-group {
  display: grid;
  min-width: 0;
  gap: 7px;
  margin: 0;
  padding: 0;
  border: 0;
}

.field-label,
.field-group legend {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--flow-blue);
  font-size: var(--font-body);
  font-weight: 800;
}

.field-label :deep(.app-icon),
.field-group legend :deep(.app-icon) {
  display: none;
}

.choice-row {
  display: flex;
  gap: 9px;
  margin-top: 10px;
}

.choice-pill {
  min-width: 76px;
  height: 38px;
  padding: 0 18px;
  border: 1px solid #dbdee5;
  border-radius: 999px;
  background: white;
  color: #616670;
  box-shadow: var(--shadow-figma);
  font-family: Pretendard, sans-serif;
  font-size: var(--font-body);
  font-weight: 400;
}

.choice-pill.selected {
  border-color: var(--flow-blue);
  background: var(--primary-soft);
  color: var(--flow-blue);
  font-weight: 800;
}

.control,
.bank-search {
  width: 100%;
  height: 46px;
  padding: 0 16px;
  border: 1px solid #e4ddc5;
  border-radius: 10px;
  outline: none;
  background: #fff;
  box-shadow: var(--shadow-figma);
  color: #222;
  font: inherit;
  font-size: var(--font-body);
}

.control:focus,
.bank-search:focus {
  border-color: var(--flow-action);
  box-shadow: 0 0 0 3px rgb(137 168 245 / 18%);
}

select.control {
  appearance: none;
  padding-right: 48px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='m2 2 4 4 4-4' fill='none' stroke='%23222' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 20px center;
  background-size: 12px 8px;
}

.field-group small {
  color: #999;
  font-size: var(--font-small);
}

.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.primary-cta {
  width: 100%;
  min-height: 52px;
  margin-top: 30px;
  border: 0;
  border-radius: 12px;
  background: var(--flow-action);
  color: #222;
  font-size: var(--font-body);
  font-weight: 800;
  box-shadow: var(--shadow-figma);
  transition:
    transform 0.16s ease,
    filter 0.16s ease;
}

.primary-cta:hover:not(:disabled) {
  filter: brightness(0.98);
  transform: translateY(-1px);
}

.primary-cta:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.employment-error {
  margin-top: 12px;
  color: #e5484d;
  font-size: var(--font-small);
  font-weight: 700;
  text-align: center;
}

.bottom-helper {
  margin: 10px 0 0;
  color: #777;
  font-size: var(--font-small);
  text-align: center;
}

.collect-card {
  padding: 26px 28px;
  border: 1px solid #e7eaf0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(31 42 68 / 7%);
}

.collect-card h2 {
  display: block;
  margin: 0 0 16px;
  color: #252b36;
  font-size: var(--font-section-title);
  font-weight: 800;
}

.collect-card ul {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: #252b36;
  font-size: var(--font-body);
}

.collect-card li::before {
  display: inline-grid;
  width: 24px;
  height: 24px;
  margin-right: 8px;
  place-items: center;
  border-radius: 8px;
  background: #fff1b8;
  color: var(--flow-blue);
  content: '✓';
}

.consent-list {
  display: grid;
  gap: 18px;
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #e7eaf0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(31 42 68 / 7%);
}

.accordion {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  min-height: 56px;
  padding: 0 20px;
  border: 0;
  border-radius: 14px;
  background: #f7f8fb;
  color: #252b36;
  font-size: var(--font-body);
  font-weight: 800;
  text-align: left;
  box-shadow: none;
}

.accordion > span {
  align-self: center;
}

.accordion > span:first-child {
  font-family: Pretendard, sans-serif;
  font-weight: 800;
}

.accordion small {
  grid-column: 1 / -1;
  padding: 0 0 14px;
  color: #666;
  font-size: var(--font-small);
  font-weight: 400;
}

.required-consent {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 50px;
  margin-top: 32px;
  padding: 0 18px;
  border-radius: 12px;
  border: 1px solid #f1dc8a;
  background: #fff9df;
  font-size: var(--font-body);
  font-weight: 800;
}

input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: #666;
}

.required-consent strong {
  color: #ff4e51;
}

.loading-screen {
  display: flex;
  width: 100%;
  min-height: calc(100dvh - 200px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0 60px;
  text-align: center;
}

.loading-buttie {
  display: block;
  width: 171px;
  height: 171px;
  object-fit: cover;
}

.loading-buttie-ring {
  position: relative;
  display: grid;
  width: 205px;
  height: 205px;
  place-items: center;
}

.loading-buttie-ring > span {
  position: absolute;
  inset: 0;
  border: 6px solid #fff1bd;
  border-top-color: #f4b43e;
  border-right-color: #0a1680;
  border-radius: 50%;
  box-shadow: 0 8px 28px rgb(244 180 62 / 16%);
  animation: loading-ring-spin 1.1s linear infinite;
}

.loading-buttie-ring::after {
  position: absolute;
  inset: 14px;
  border: 1px solid #f7e8ad;
  border-radius: 50%;
  content: '';
}

.loading-buttie-ring .loading-buttie {
  position: relative;
  z-index: 1;
  width: 155px;
  height: 155px;
  border-radius: 50%;
}

@keyframes loading-ring-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-buttie-ring > span {
    animation-duration: 2.4s;
  }
}

.loading-screen h1 {
  margin: 24px 0 0;
  color: #222;
  font-family: Pretendard, sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 24px;
}

.loading-screen > p {
  margin: 9px 0 0;
  color: #666;
  font-size: 13px;
  line-height: 16px;
}

.loading-status {
  display: grid;
  width: 100%;
  gap: 13px;
  min-height: 150px;
  margin-top: 29px;
  padding: 20px 24px;
  border: 1px solid #e0e3ea;
  border-radius: 20px;
  background: white;
}

.loading-status div {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 8px;
  color: #222;
  font-size: 13px;
  text-align: left;
}

.loading-status div.working span {
  color: #222;
  font-weight: 700;
}

.loading-status div.completed span {
  color: #222;
  font-weight: 700;
}

.loading-status div.completed strong {
  color: #d99008;
  font-weight: 700;
}

.loading-status strong {
  color: #999;
  font-size: 12px;
  font-weight: 400;
}

.loading-status div:not(.working, .completed) {
  color: #b0b0b0;
}

.loading-status div:not(.working, .completed) strong {
  color: #b0b0b0;
}

.status-dot {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: #eceef2;
  font-size: var(--font-small);
  font-style: normal;
}

.status-dot.done {
  background: #ffb21a;
  color: white;
  animation: status-check-pop 0.38s cubic-bezier(0.2, 1.7, 0.45, 1);
}

.status-dot.working {
  border: 2px dashed #ffb21a;
  background: white;
  animation: spin 1.2s linear infinite;
}

@keyframes status-check-pop {
  0% {
    opacity: 0;
    transform: scale(0.25);
  }
  65% {
    transform: scale(1.28);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.progress-track {
  width: 100%;
  height: 14px;
  margin-top: 24px;
  padding: 3px;
  border-radius: 999px;
  background: #fff8d8;
}

.progress-track span {
  display: block;
  width: 60%;
  height: 100%;
  border-radius: inherit;
  background: #ffb21a;
  transition: width 0.38s ease;
}

.loading-screen > small {
  margin-top: 28px;
  color: #999;
  font-size: 13px;
}

.loading-screen > .primary-cta {
  width: auto;
  min-width: 180px;
  min-height: 50px;
  margin-top: 18px;
  padding: 0 28px;
  border-radius: 14px;
}

.split-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.split-heading > strong {
  padding-top: 9px;
  font-size: var(--font-body);
  white-space: nowrap;
}

.bank-search {
  height: 52px;
  margin-top: 28px;
  border-color: #e7eaf0;
  border-radius: 14px;
  background: white;
  box-shadow: none;
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.selected-chips button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border-radius: 999px;
  background: #fff1b8;
  color: #252b36;
  font-size: var(--font-small);
  font-weight: 800;
}

.bank-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding: 20px;
  border: 1px solid #e7eaf0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(31 42 68 / 7%);
}

#app .onboarding-page--step-5 .bank-list {
  border: 1px solid #e7eaf0;
  background: #fff;
  box-shadow: 0 10px 30px rgb(31 42 68 / 7%) !important;
  filter: none;
}

.bank-row {
  display: grid;
  grid-template-columns: 46px 1fr auto;
  align-items: center;
  min-height: 82px;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #edf0f4;
  border-radius: 16px;
  background: #f8f9fb;
  box-shadow: none;
  filter: none;
  text-align: left;
}

.bank-row.selected {
  border-color: #f2d269;
  background: #fff9df;
}

.bank-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #f0f2f5;
  color: #666;
  font-size: var(--font-small);
  font-weight: 800;
}

.bank-row.selected .bank-mark {
  background: #f7c65c;
  color: #222;
}

.bank-name {
  display: grid;
}

.bank-name strong {
  color: #252b36;
  font-size: var(--font-body);
}

.bank-name small {
  width: fit-content;
  margin-top: 2px;
  padding: 1px 7px;
  border-radius: 999px;
  background: transparent;
  color: #737b89;
  font-size: var(--font-caption);
}

.bank-row.selected .bank-name small {
  background: transparent;
  color: #737b89;
}

.round-check {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 50%;
  background: var(--flow-blue);
  color: white;
  font-size: var(--font-body);
  font-style: normal;
}

.asset-section {
  margin-top: 28px;
  padding: 20px;
  border: 1px solid #e7eaf0;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(31 42 68 / 7%);
}

#app .onboarding-page .asset-section {
  box-shadow: 0 10px 30px rgb(31 42 68 / 7%) !important;
  filter: none;
}

.asset-section + .asset-section {
  margin-top: 16px;
}

.asset-section__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
  color: #252b36;
  font-size: var(--font-body);
  font-weight: 800;
}

.asset-section__header label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5f6877;
  font-size: var(--font-small);
  font-weight: 700;
}

.asset-section__header input {
  width: 20px;
  height: 20px;
  accent-color: var(--flow-blue);
}

.asset-card {
  position: relative;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) minmax(96px, auto) 26px;
  width: 100%;
  min-height: 88px;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
  padding: 14px 16px;
  border: 1px solid #edf0f4;
  border-radius: 16px;
  background: #f8f9fb;
  text-align: left;
  box-shadow: none;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.asset-card:last-child {
  margin-bottom: 0;
}

.asset-card:hover {
  transform: translateY(-1px);
  border-color: #cfd5e1;
}

.asset-card.selected {
  border-color: #f2d269;
  background: #fff9df;
}

.asset-card > span:not(.financial-logo) {
  display: grid;
  grid-column: 2;
  min-width: 0;
  gap: 4px;
}

.asset-card > b {
  grid-column: 3;
}

.asset-card strong,
.asset-card b {
  color: #252b36;
  font-size: var(--font-body);
}

.asset-card strong {
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-card b {
  justify-self: end;
  white-space: nowrap;
}

.asset-card small {
  overflow: hidden;
  color: #737b89;
  font-size: var(--font-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-card .round-check {
  position: static;
  grid-column: 4;
  justify-self: end;
  width: 24px;
  height: 24px;
  background: var(--flow-blue);
  font-size: 13px;
}

.selected-balance {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  padding: 18px 20px;
  border-radius: 16px;
  background: #f7f8fb;
  color: #737b89;
  font-size: var(--font-small);
}

.selected-balance strong {
  color: #252b36;
  font-size: var(--font-body);
  font-weight: 800;
}

.selected-balance b {
  color: var(--flow-blue);
  font-size: 18px;
  font-weight: 800;
}

.completion-screen {
  display: flex;
  min-height: 580px;
  flex-direction: column;
  justify-content: center;
}

.completion-character {
  position: relative;
  display: grid;
  width: 132px;
  height: 112px;
  place-items: center;
  align-self: center;
  margin: 35px 0 45px;
}

.completion-character span {
  position: absolute;
  width: 112px;
  height: 72px;
  border-radius: 50%;
  background: #fff1b8;
  filter: blur(18px);
}

.completion-character img {
  position: relative;
  z-index: 1;
  display: block;
  width: 118px;
  max-height: 108px;
  object-fit: contain;
}

.completion-summary {
  display: grid;
  gap: 12px;
  margin-top: 50px;
  padding: 18px 24px;
  border: 1px solid #dfe1e7;
  border-radius: 14px;
  background: white;
  box-shadow: var(--shadow-figma);
}

.completion-summary span {
  display: flex;
  justify-content: space-between;
  color: #777;
  font-size: var(--font-small);
}

.completion-summary strong {
  color: var(--flow-blue);
  font-size: var(--font-body);
}

.completion-summary .danger {
  color: #ff4e51;
}

.completion-screen .primary-cta {
  box-shadow: var(--shadow-figma);
}

.completion-screen .primary-cta strong {
  font-family: Pretendard, sans-serif;
  font-weight: 800;
}

.fixed-heading {
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e5eb;
}

.fixed-summary {
  position: relative;
  display: grid;
  margin-top: 18px;
  padding: 16px 24px;
  border: 1px solid #dfe1e7;
  border-radius: 14px;
  background: white;
  box-shadow: var(--shadow-figma);
}

.fixed-summary > span {
  color: #666;
  font-size: var(--font-small);
}

.fixed-summary > strong {
  margin-top: 3px;
  color: #222;
  font-size: var(--font-page-title);
}

.fixed-summary > small {
  position: absolute;
  top: 18px;
  right: 24px;
  color: #666;
  font-size: var(--font-small);
}

.fixed-guide {
  margin: 0;
  color: #666;
  font-size: var(--font-body);
}

.fixed-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 22px;
}

.select-all-fixed {
  display: flex;
  align-items: center;
  flex: none;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  background: #f3f5f8;
  font-size: var(--font-small);
  font-weight: 800;
}

.onboarding-page--step-6 .primary-cta {
  box-shadow: var(--shadow-figma);
}

.select-all-fixed input {
  order: -1;
  width: 18px;
  height: 18px;
}

.select-all-fixed:has(input:disabled) {
  color: #9aa1ad;
  cursor: not-allowed;
}

.expense-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
}

.fixed-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 28px;
  border: 1px solid #e6e9ee;
  border-radius: 16px;
  background: #f8f9fb;
  text-align: center;
}

.fixed-empty > span {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 15px;
  background: var(--flow-yellow);
  color: var(--flow-blue);
}

.fixed-empty strong {
  color: #222;
  font-size: var(--font-body);
  font-weight: 800;
}

.fixed-empty p {
  max-width: 360px;
  margin: 0;
  color: #737b89;
  font-size: var(--font-small);
  line-height: 1.55;
}

.expense-category {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
  font-size: var(--font-body);
}

.expense-category span {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 800;
}

.expense-category i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.expense-row {
  display: grid;
  grid-template-columns: 36px 1fr auto 24px;
  min-height: 54px;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border: 1px solid #dfe1e7;
  border-radius: 12px;
  background: white;
  box-shadow: var(--shadow-figma);
}

.expense-row.selected {
  background: #fff8d8;
}

.expense-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: #f0f3ff;
  font-size: var(--font-small);
  font-weight: 800;
}

.expense-name {
  display: grid;
}

.expense-name strong,
.expense-row b {
  font-size: var(--font-body);
}

.expense-name small {
  margin-top: 2px;
  color: #777;
  font-size: var(--font-caption);
}

.expense-row input {
  width: 22px;
  height: 22px;
}

.fixed-cta {
  margin-top: 35px;
  box-shadow: var(--shadow-figma);
}

.fixed-cta strong {
  font-family: Pretendard, sans-serif;
  font-weight: 800;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 768px) {
  .onboarding-page--step-1 .stage-heading h1,
  .onboarding-page--step-1 .field-label,
  .onboarding-page--step-1 .field-group legend {
    color: #222;
  }

  .onboarding-page--step-1 .choice-pill.selected {
    border-color: var(--flow-yellow);
    background: var(--flow-yellow);
    color: #222;
    font-weight: 800;
  }

  .onboarding-page--step-1 .primary-cta {
    background: var(--flow-yellow);
  }

  .onboarding-page--step-2 .onboarding-stage {
    padding-top: 130px;
  }

  .onboarding-page--step-2 .mobile-hero-icon {
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    margin: 0 auto 18px;
    border-radius: 14px;
    background: var(--flow-yellow);
    color: #222;
  }

  .onboarding-page--step-2 .stage-heading {
    text-align: left;
  }

  .onboarding-page--step-2 .stage-heading h1 {
    color: #222;
  }

  .onboarding-page--step-2 .desktop-copy {
    display: none;
  }

  .onboarding-page--step-2 .mobile-copy--finance {
    display: block;
    line-height: 1.7;
  }

  .onboarding-page--step-2 .collect-card {
    margin-top: 28px;
    padding: 26px 28px;
    border: 1px solid #e7eaf0;
    border-radius: 20px;
    background: #fff;
  }

  .onboarding-page--step-2 .collect-card h2 {
    display: block;
    margin: 0 0 14px;
    color: #222;
    font-size: var(--font-body);
  }

  .onboarding-page--step-2 .collect-card .app-only {
    display: list-item;
  }

  .onboarding-page--step-2 .collect-card li::before {
    color: #f6ad18;
  }

  .onboarding-page--step-2 .primary-cta {
    margin-top: 18px;
    background: var(--flow-yellow);
  }

  .onboarding-page--step-2 .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 14px 0 0;
    color: #777;
    font-size: var(--font-small);
  }

  .onboarding-page--step-3 .stage-heading {
    text-align: left;
  }

  .onboarding-page--step-3 .stage-heading h1 {
    color: #222;
  }

  .onboarding-page--step-3 .consent-list {
    margin-top: 30px;
  }

  .onboarding-page--step-3 .accordion {
    color: #222;
  }

  .onboarding-page--step-3 .primary-cta {
    margin-top: 25px;
    background: var(--flow-yellow);
  }

  .onboarding-page--step-5 .onboarding-stage,
  .onboarding-page--step-6 .onboarding-stage {
    width: min(100% - 48px, 720px);
    padding-top: 130px;
  }

  .onboarding-page--step-5 .stage-heading h1,
  .onboarding-page--step-5 .bank-name strong {
    color: #222;
  }

  .onboarding-page--step-5 .bank-row.selected {
    background: #fff9df;
  }

  .onboarding-page--step-5 .bank-row .round-check {
    background: var(--flow-blue);
  }

  .onboarding-page--step-5 .sticky-cta {
    background: var(--flow-yellow);
    color: #222;
  }

  .onboarding-page--step-6 .stage-heading h1,
  .onboarding-page--step-6 .asset-card strong,
  .onboarding-page--step-6 .asset-card b,
  .onboarding-page--step-6 .selected-balance {
    color: #222;
  }

  .onboarding-page--step-6 .asset-card.selected {
    border-color: transparent;
    background: #fff9df;
  }

  .onboarding-page--step-6 .asset-card .round-check {
    background: var(--flow-blue);
  }

  .onboarding-page--step-6 .primary-cta {
    background: var(--flow-yellow);
    color: #222;
  }

  .onboarding-page--step-8 .stage-heading {
    order: -1;
  }

  .onboarding-page--step-8 .stage-heading h1,
  .onboarding-page--step-8 .completion-summary strong {
    color: #222;
  }

  .onboarding-page--step-8 .completion-summary .danger {
    color: #ff4e51;
  }

  .onboarding-page--step-8 .primary-cta {
    background: var(--flow-yellow);
    color: #222;
  }

  .onboarding-page--step-9 .stage-heading h1,
  .onboarding-page--step-9 .fixed-summary > strong,
  .onboarding-page--step-9 .expense-category,
  .onboarding-page--step-9 .expense-category strong,
  .onboarding-page--step-9 .expense-name strong,
  .onboarding-page--step-9 .expense-row b,
  .onboarding-page--step-9 .select-all-fixed {
    color: #222;
  }

  .onboarding-page--step-9 .fixed-summary {
    background: #f7f8fb;
  }

  .onboarding-page--step-9 .expense-row {
    background: #fff;
  }

  .onboarding-page--step-9 .expense-row.selected {
    background: #fff8d8;
  }

  .onboarding-page--step-9 .expense-row input,
  .onboarding-page--step-9 .select-all-fixed input {
    accent-color: #666;
  }

  .onboarding-page--step-9 .fixed-cta {
    background: var(--flow-yellow);
    color: #222;
  }
}

@media (max-width: 767px) {
  .onboarding-page {
    background: white;
  }

  .desktop-header {
    display: none;
  }

  .onboarding-stage,
  .onboarding-stage--wide,
  .onboarding-page--step-2 .onboarding-stage,
  .onboarding-page--step-3 .onboarding-stage,
  .onboarding-page--step-4 .onboarding-stage,
  .onboarding-page--step-5 .onboarding-stage,
  .onboarding-page--step-6 .onboarding-stage,
  .onboarding-page--step-7 .onboarding-stage,
  .onboarding-page--step-8 .onboarding-stage,
  .onboarding-page--step-9 .onboarding-stage {
    width: min(100%, 430px);
    min-height: 100dvh;
    padding: 20px 16px max(40px, env(safe-area-inset-bottom));
  }

  .mobile-back {
    display: inline-flex;
    position: static;
    margin: 0 0 20px;
    color: #666;
    font-size: var(--font-body);
  }

  .mobile-hero-icon {
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    margin: 8px auto 0;
    border-radius: 50%;
    background: var(--flow-yellow);
    color: #222;
  }

  .stage-heading h1 {
    color: #222;
    font-size: var(--font-page-title);
  }

  .stage-heading p {
    font-size: var(--font-body);
  }

  .stage-heading--center-mobile {
    text-align: center;
  }

  .stage-heading--center-mobile h1 {
    margin-top: 10px;
  }

  .desktop-copy {
    display: none;
  }

  .mobile-copy,
  .app-only,
  .security-note {
    display: block;
  }

  .stage-heading--center-mobile > p:not(.mobile-copy) {
    display: none;
  }

  .mobile-copy--finance {
    line-height: 1.7 !important;
  }

  .flow-card {
    margin-top: 0;
    border: 1px solid #e4e6eb;
    border-radius: 18px;
    background: white;
    box-shadow: 0 1px 3px rgb(0 0 0 / 8%);
  }

  .job-form {
    gap: 22px;
    margin-top: -2px;
    padding: 48px 24px 22px;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
    filter: none;
  }

  .field-label,
  .field-group legend {
    color: #222;
    font-size: var(--font-body);
  }

  .field-label :deep(.app-icon),
  .field-group legend :deep(.app-icon) {
    display: block;
  }

  .choice-row {
    margin-top: 7px;
  }

  .choice-pill.selected {
    border-color: #dbdee5;
    background: var(--flow-yellow);
    color: #222;
  }

  .control,
  .bank-search {
    height: 50px;
    border-color: #e1e3e8;
    border-radius: 24px;
    background: white;
    box-shadow: var(--shadow-figma);
  }

  .date-row {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .field-group small {
    font-size: var(--font-caption);
  }

  .primary-cta {
    min-height: 54px;
    margin-top: 50px;
    border-radius: 14px;
    background: var(--flow-yellow);
    box-shadow: var(--shadow-figma);
  }

  .collect-card {
    margin-top: 24px;
    padding: 22px;
    border-radius: 16px;
    background: white;
  }

  .collect-card h2 {
    display: block;
    margin: 0 0 15px;
    font-size: var(--font-body);
  }

  .collect-card ul {
    gap: 11px;
    font-size: var(--font-body);
  }

  .collect-card li::before {
    color: #f6ad18;
  }

  .security-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin: 70px 0 0;
    color: #777;
    font-size: var(--font-small);
  }

  .consent-list {
    gap: 12px;
    margin-top: 18px;
  }

  .accordion {
    min-height: 52px;
    border-radius: 16px;
    color: #222;
  }

  .required-consent {
    min-height: 52px;
    margin-top: 12px;
    border: 1px solid #e1e3e8;
    border-radius: 16px;
    background: white;
    box-shadow: 0 1px 3px rgb(0 0 0 / 12%);
  }

  .sample-note {
    display: none;
  }

  .onboarding-page--step-3 .primary-cta {
    margin-top: 92px;
  }

  .loading-screen {
    min-height: calc(100dvh - 62px);
    justify-content: center;
    padding: 40px 0 70px;
  }

  .loading-buttie {
    width: 171px;
    height: 171px;
  }

  .loading-buttie-ring {
    width: 188px;
    height: 188px;
  }

  .loading-buttie-ring .loading-buttie {
    width: 142px;
    height: 142px;
  }

  .loading-screen h1 {
    margin-top: 10px;
    color: #222;
    font-size: 20px;
    line-height: 24px;
  }

  .loading-status {
    width: 100%;
    min-height: 124px;
    margin-top: 18px;
    padding: 16px 20px;
  }

  .progress-track {
    width: 100%;
    height: 14px;
    margin-top: 24px;
    padding: 3px;
    border-radius: 999px;
  }

  .progress-track span {
    width: 65%;
  }

  .loading-screen > small {
    margin-top: 18px;
    font-size: 12px;
  }

  .loading-screen > .primary-cta {
    width: min(100%, 220px);
    min-width: 0;
    min-height: 52px;
    margin-top: 18px;
  }

  .bank-search {
    margin-top: 14px;
    background: #fff;
    box-shadow: none;
  }

  .selected-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    min-width: 0;
    margin-top: 10px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e3e5e9;
    overflow: visible;
  }

  .selected-chips button {
    display: inline-flex;
    flex: 0 1 auto;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    padding: 7px 12px;
    border-radius: 999px;
    background: var(--flow-yellow);
    font-size: var(--font-small);
    font-weight: 800;
    line-height: 1.25;
    white-space: nowrap;
  }

  .selected-chip__name {
    min-width: 0;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-chip__remove {
    flex: none;
    font-size: 14px;
    line-height: 1;
  }

  .bank-list {
    gap: 12px;
    margin-top: 14px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none !important;
    filter: none;
  }

  .bank-row {
    min-height: 88px;
    padding: 14px 18px;
    border-radius: 16px;
    border: 1px solid #edf0f4;
    background: #f8f9fb;
    box-shadow: none;
    filter: none;
  }

  .bank-row.selected {
    background: #fff9df;
  }

  .bank-name strong {
    color: #222;
    font-size: var(--font-body);
  }

  .bank-row .round-check {
    background: #666;
  }

  .sticky-cta {
    position: sticky;
    bottom: 10px;
    z-index: 3;
    margin-top: 24px;
    font-family: Pretendard, sans-serif;
    font-weight: 800;
  }

  .sticky-cta strong {
    font-family: Pretendard, sans-serif;
    font-weight: 800;
  }

  .asset-section {
    margin-top: 24px;
    padding: 14px;
    border-radius: 18px;
  }

  .asset-section__header label {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #5f6877;
    font-weight: 700;
  }

  .asset-section__header input {
    width: 20px;
    height: 20px;
  }

  .asset-card {
    grid-template-columns: 44px minmax(0, 1fr) 24px;
    min-height: 96px;
    gap: 10px;
    padding: 13px 12px;
    border-radius: 16px;
  }

  .asset-card > span:not(.financial-logo) {
    grid-column: 2;
    grid-row: 1;
  }

  .asset-card > b {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
  }

  .asset-card.selected {
    background: #fff9df;
  }

  .asset-card strong,
  .asset-card b {
    color: #222;
    font-size: var(--font-body);
  }

  .asset-card .round-check {
    grid-column: 3;
    grid-row: 1 / span 2;
    align-self: center;
    background: var(--flow-blue);
  }

  .selected-balance {
    grid-template-columns: auto 1fr;
    gap: 7px 12px;
    margin-top: 14px;
    padding: 16px;
    text-align: left;
  }

  .selected-balance strong,
  .selected-balance b {
    justify-self: end;
  }

  .onboarding-page--step-6 .primary-cta {
    margin-top: 16px;
  }

  .completion-screen {
    min-height: calc(100dvh - 60px);
    justify-content: center;
  }

  .completion-character {
    order: -2;
    width: 120px;
    height: 102px;
    margin: 0 auto 18px;
  }

  .completion-character img {
    width: 108px;
  }

  .completion-summary {
    margin-top: 38px;
  }

  .completion-screen .primary-cta {
    margin-top: 32px;
  }

  .fixed-heading {
    margin-top: 0;
    padding-bottom: 14px;
  }

  .fixed-summary {
    margin-top: 18px;
    padding: 18px;
  }

  .fixed-controls {
    align-items: flex-start;
    margin-top: 18px;
  }

  .fixed-guide {
    max-width: 205px;
    line-height: 1.5;
  }

  .select-all-fixed {
    min-height: 40px;
    padding: 0 11px;
  }

  .expense-list {
    gap: 8px;
    margin-top: 12px;
  }

  .expense-row {
    min-height: 56px;
  }

  .fixed-cta {
    margin-top: 24px;
  }

  .onboarding-page--step-9 .bottom-helper {
    padding: 0 12px;
    line-height: 1.5;
  }
}
</style>
