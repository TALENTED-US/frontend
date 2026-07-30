<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import ButtieAvatar from '@/components/ui/ButtieAvatar.vue'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const step = ref(1)
const consentChecked = ref(true)
const openedConsent = ref('')
const bankSearch = ref('')
const selectedBanks = ref([])
let loadingTimer

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

const form = ref({
  type: '첫취업',
  startDate: '2026-07-22',
  targetDate: '2027-01-01',
  region: '서울특별시',
  household: 1,
  housing: '전세',
})

const banks = [
  { name: 'KB국민은행', mark: 'KB' },
  { name: 'KB국민카드', mark: 'KB' },
  { name: '신한은행', mark: '신' },
  { name: '우리은행', mark: '우' },
  { name: '하나은행', mark: '하' },
  { name: 'KEB하나은행', mark: 'KEB' },
]

const accounts = ref([
  {
    name: 'KB국민은행 입출금',
    meta: '****-**-****-2847 · 입출금',
    amount: 1800000,
    selected: false,
    kind: 'account',
  },
  {
    name: 'KB국민은행 적금',
    meta: '****-**-****-5931 · 예·적금',
    amount: 900000,
    selected: false,
    kind: 'account',
  },
  {
    name: 'KB국민카드',
    meta: '****-****-****-4821 · 신용카드',
    amount: 300000,
    selected: false,
    kind: 'card',
  },
])

const fixedExpenses = ref([
  {
    category: '보장',
    categoryTotal: '4.5만원',
    color: '#a78bfa',
    icon: '실',
    name: '실비보험',
    day: '매월 5일',
    amount: 45000,
    checked: true,
  },
  {
    category: '구독',
    categoryTotal: '3.2만원',
    color: '#5973e8',
    icon: '넷',
    name: '넷플릭스',
    day: '매월 14일',
    amount: 17000,
    checked: true,
  },
  {
    category: '',
    categoryTotal: '',
    color: '#5973e8',
    icon: '유',
    name: '유튜브 프리미엄',
    day: '매월 20일',
    amount: 14900,
    checked: false,
  },
  {
    category: '월세',
    categoryTotal: '50만원',
    color: '#f0c95d',
    icon: '월',
    name: '월세',
    day: '매월 1일',
    amount: 500000,
    checked: true,
  },
  {
    category: '교통',
    categoryTotal: '5.5만원',
    color: '#f6a3a3',
    icon: '정',
    name: '교통카드 정기권',
    day: '매월 1일',
    amount: 55000,
    checked: true,
  },
])

const filteredBanks = computed(() => {
  const keyword = bankSearch.value.trim().toLowerCase()
  if (!keyword) return banks
  return banks.filter((bank) => bank.name.toLowerCase().includes(keyword))
})

const selectedAccountCount = computed(
  () => accounts.value.filter((account) => account.selected).length,
)

const selectedBalance = computed(() =>
  accounts.value
    .filter((account) => account.selected)
    .reduce((total, account) => total + account.amount, 0),
)

function createGroupSelection(kind) {
  return computed({
    get: () => {
      const group = accounts.value.filter((account) => account.kind === kind)
      return group.length > 0 && group.every((account) => account.selected)
    },
    set: (checked) => {
      accounts.value
        .filter((account) => account.kind === kind)
        .forEach((account) => (account.selected = checked))
    },
  })
}

const allAccountsSelected = createGroupSelection('account')
const allCardsSelected = createGroupSelection('card')

const allFixedChecked = computed({
  get: () => fixedExpenses.value.every((item) => item.checked),
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

watch(
  step,
  (currentStep) => {
    clearTimeout(loadingTimer)
    if (currentStep === 4) loadingTimer = setTimeout(() => (step.value = 5), 1500)
    if (currentStep === 7) loadingTimer = setTimeout(() => (step.value = 8), 1800)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  { immediate: true },
)

onBeforeUnmount(() => clearTimeout(loadingTimer))

function toggleBank(bank) {
  selectedBanks.value = selectedBanks.value.includes(bank)
    ? selectedBanks.value.filter((item) => item !== bank)
    : [...selectedBanks.value, bank]
}

function goBack() {
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

function next() {
  if (step.value === 1) step.value = 2
  else if (step.value === 2) step.value = 3
  else if (step.value === 3 && consentChecked.value) step.value = 4
  else if (step.value === 5 && selectedBanks.value.length) step.value = 6
  else if (step.value === 6 && selectedAccountCount.value) step.value = 7
  else if (step.value === 8) step.value = 9
  else if (step.value === 9) {
    session.login()
    router.push('/')
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
        {{ step === 1 ? '← 로그인으로' : '← 이전' }}
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
              v-model.number="form.household"
              class="control"
              type="number"
              min="1"
              max="99"
              inputmode="numeric"
              placeholder="세대원 수를 입력하세요"
            />
            <small>본인을 포함한 세대원 수를 입력해주세요</small>
          </label>

          <label class="field-group housing-field">
            <span class="field-label"><AppIcon name="house" :size="16" /> 주거 형태</span>
            <select v-model="form.housing" class="control">
              <option>전세</option>
              <option>월세</option>
              <option>자가</option>
            </select>
            <small>재정 분석에 활용돼요</small>
          </label>
        </div>

        <button class="primary-cta" type="button" @click="next">다음: 금융 정보 연결</button>
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
            <li>계좌잔액 · 입출금내역</li>
            <li>카드 이용내역</li>
            <li class="app-only">대출 · 상환 현황</li>
            <li>반복지출 자동 인식</li>
          </ul>
        </div>

        <button class="primary-cta" type="button" @click="next">금융정보 연결하기</button>
        <p class="security-note">
          <AppIcon name="lock" :size="12" /> 금융보안원 인증 · 256-bit 암호화 · 조회 전용
        </p>
      </template>

      <template v-else-if="step === 3">
        <div class="stage-heading">
          <h1>정보 제공 동의</h1>
          <p>선택한 2개 금융기관 정보를 불러오기 위해 동의가 필요해요</p>
        </div>

        <div class="consent-list">
          <button
            v-for="item in [
              ['items', '수집 항목', '계좌 잔액, 입출금 내역, 카드 이용 내역'],
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
          인증 진행하기
        </button>
      </template>

      <template v-else-if="step === 4">
        <div class="loading-screen">
          <ButtieAvatar :size="96" />
          <h1>마이데이터 불러오는 중</h1>
          <p>연결 가능한 금융기관을 확인하고 있어요</p>
          <div class="loading-status">
            <div>
              <i class="status-dot done">✓</i><span>본인 인증 완료</span><strong>완료</strong>
            </div>
            <div>
              <i class="status-dot working" /><span>금융기관 조회 중...</span
              ><strong>진행 중</strong>
            </div>
            <div><i class="status-dot" /><span>연결 정보 준비</span><strong>대기 중</strong></div>
          </div>
          <div class="progress-track"><span class="progress-track__fetch" /></div>
          <small>완료되면 자동으로 다음 화면으로 이동해요</small>
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

        <div class="bank-categories">
          <button class="active" type="button">전체</button>
          <button type="button">시중은행</button>
          <button type="button">지방은행</button>
          <button type="button">특수·협동</button>
          <button type="button">인터넷전문</button>
        </div>

        <div class="selected-chips">
          <button v-for="bank in selectedBanks" :key="bank" type="button" @click="toggleBank(bank)">
            {{ bank }} ×
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
            <span class="bank-mark">{{ bank.mark }}</span>
            <span class="bank-name">
              <strong>{{ bank.name }}</strong>
              <small>{{ selectedBanks.includes(bank.name) ? '연결됨' : '연결 가능' }}</small>
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
          선택 완료 ({{ selectedBanks.length }}개)
        </button>
      </template>

      <template v-else-if="step === 6">
        <div class="stage-heading">
          <h1>계좌·카드 선택</h1>
          <p>분석에 사용할 계좌·카드를 선택하세요.</p>
        </div>

        <div class="asset-section">
          <div class="asset-section__header">
            <span>계좌 · 2</span>
            <label>전체 선택 <input v-model="allAccountsSelected" type="checkbox" /></label>
          </div>
          <button
            v-for="account in accounts.filter((item) => item.kind === 'account')"
            :key="account.name"
            class="asset-card"
            :class="{ selected: account.selected }"
            type="button"
            @click="account.selected = !account.selected"
          >
            <span>
              <strong>{{ account.name }}</strong>
              <small>{{ account.meta }}</small>
              <small class="app-only">갱신 2026-07-15 10:32</small>
            </span>
            <b>{{ account.amount.toLocaleString() }}원</b>
            <i v-if="account.selected" class="round-check">✓</i>
          </button>
        </div>

        <div class="asset-section">
          <div class="asset-section__header">
            <span>카드 · 1</span>
            <label>전체 선택 <input v-model="allCardsSelected" type="checkbox" /></label>
          </div>
          <button
            v-for="account in accounts.filter((item) => item.kind === 'card')"
            :key="account.name"
            class="asset-card"
            :class="{ selected: account.selected }"
            type="button"
            @click="account.selected = !account.selected"
          >
            <span>
              <strong>{{ account.name }}</strong>
              <small>{{ account.meta }}</small>
              <small class="app-only">갱신 2026-07-15 10:32</small>
            </span>
            <b>{{ account.amount.toLocaleString() }}원</b>
            <i v-if="account.selected" class="round-check">✓</i>
          </button>
        </div>

        <p class="selected-balance">총 선택 잔액: {{ selectedBalance.toLocaleString() }}원</p>
        <button class="primary-cta" type="button" :disabled="!selectedAccountCount" @click="next">
          선택 완료 ({{ selectedAccountCount }}개)
        </button>
      </template>

      <template v-else-if="step === 7">
        <div class="loading-screen">
          <ButtieAvatar :size="96" />
          <h1>마이데이터 분석 중</h1>
          <p>계좌와 거래내역을 불러오고 있어요</p>
          <div class="loading-status">
            <div>
              <i class="status-dot done">✓</i><span>계좌 조회 완료</span><strong>3개</strong>
            </div>
            <div>
              <i class="status-dot working" /><span>거래내역 분석 중...</span><strong>128건</strong>
            </div>
            <div><i class="status-dot" /><span>재정 현황 계산</span><strong>대기 중</strong></div>
          </div>
          <div class="progress-track"><span /></div>
          <small>완료되면 자동으로 다음 화면으로 이동해요</small>
        </div>
      </template>

      <template v-else-if="step === 8">
        <div class="completion-screen">
          <div class="completion-check">✓</div>
          <div class="stage-heading stage-heading--center-mobile">
            <h1>연결 완료!</h1>
            <p>금융 데이터를 성공적으로 불러왔어요.</p>
          </div>
          <div class="completion-summary">
            <span>총 자산 <strong>3,000,000원</strong></span>
            <span>연결 계좌 <strong>3개</strong></span>
            <span>월평균 지출 <strong class="danger">80만원</strong></span>
          </div>
          <button class="primary-cta" type="button" @click="next">고정지출 확인하기 →</button>
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
        <p class="fixed-guide">고정지출로 반영할 항목을 체크해 주세요.</p>
        <label class="select-all-fixed">
          전체 선택 <input v-model="allFixedChecked" type="checkbox" />
        </label>

        <div class="expense-list">
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

        <button class="primary-cta fixed-cta" type="button" @click="next">
          확인 완료하고 홈으로 →
        </button>
        <p class="bottom-helper">체크를 해제한 항목은 고정지출에 반영되지 않아요.</p>
      </template>
    </section>
  </main>
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
  width: min(100% - 40px, 460px);
  margin: 0 auto;
  padding: 195px 0 70px;
}

.onboarding-stage--wide {
  width: min(100% - 40px, 510px);
  padding-top: 150px;
}

.mobile-back,
.mobile-hero-icon,
.mobile-copy,
.app-only,
.security-note {
  display: none;
}

.stage-heading h1 {
  margin: 0;
  color: var(--flow-blue);
  font-size: 26px;
  line-height: 1.25;
}

.stage-heading p {
  margin: 8px 0 0;
  color: #666;
  font-size: 14px;
  line-height: 1.55;
}

.flow-card {
  margin-top: 42px;
}

.job-form {
  display: grid;
  gap: 18px;
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
  font-size: 13px;
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
  font-size: 14px;
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
  background: #fff9e5;
  color: #222;
  font: inherit;
  font-size: 14px;
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
  font-size: 11px;
}

.date-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.housing-field {
  display: grid;
}

.primary-cta {
  width: 100%;
  min-height: 52px;
  margin-top: 30px;
  border: 0;
  border-radius: 12px;
  background: var(--flow-action);
  color: #222;
  font-size: 15px;
  font-weight: 800;
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

.bottom-helper {
  margin: 10px 0 0;
  color: #777;
  font-size: 12px;
  text-align: center;
}

.collect-card {
  padding: 23px 30px;
  border-radius: 14px;
  background: #edf2ff;
}

.collect-card h2 {
  display: none;
}

.collect-card ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: #666;
  font-size: 14px;
}

.collect-card li::before {
  content: '✓';
  margin-right: 5px;
}

.consent-list {
  display: grid;
  gap: 18px;
  margin-top: 58px;
}

.accordion {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  min-height: 56px;
  padding: 0 20px;
  border: 1px solid #dfe1e7;
  border-radius: 13px;
  background: white;
  color: var(--flow-blue);
  font-size: 15px;
  font-weight: 800;
  text-align: left;
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
}

.accordion > span {
  align-self: center;
}

.accordion small {
  grid-column: 1 / -1;
  padding: 0 0 14px;
  color: #666;
  font-size: 12px;
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
  background: #edf2ff;
  font-size: 13px;
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
  min-height: 610px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.loading-screen h1 {
  margin: 28px 0 0;
  color: var(--flow-blue);
  font-size: 25px;
}

.loading-screen > p {
  margin: 9px 0 0;
  color: #666;
  font-size: 14px;
}

.loading-status {
  display: grid;
  width: 100%;
  gap: 14px;
  margin-top: 34px;
  padding: 18px 22px;
  border: 1px solid #e0e3ea;
  border-radius: 15px;
  background: white;
}

.loading-status div {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 8px;
  color: #777;
  font-size: 13px;
  text-align: left;
}

.loading-status strong {
  color: #aaa;
  font-size: 12px;
}

.status-dot {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 50%;
  background: #eceef2;
  font-size: 12px;
  font-style: normal;
}

.status-dot.done {
  background: #ffb21a;
  color: white;
}

.status-dot.working {
  border: 2px dashed #ffb21a;
  background: white;
  animation: spin 1.2s linear infinite;
}

.progress-track {
  width: 100%;
  height: 14px;
  margin-top: 32px;
  padding: 4px;
  border-radius: 999px;
  background: #fff8d8;
}

.progress-track span {
  display: block;
  width: 64%;
  height: 100%;
  border-radius: inherit;
  background: #ffb21a;
  animation: progress 1.7s ease-in-out infinite alternate;
}

.progress-track__fetch {
  width: 42% !important;
}

.loading-screen > small {
  margin-top: 16px;
  color: #999;
  font-size: 12px;
}

.split-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.split-heading > strong {
  padding-top: 9px;
  font-size: 13px;
  white-space: nowrap;
}

.bank-search {
  margin-top: 45px;
  background: white;
}

.bank-categories {
  display: none;
}

.selected-chips {
  display: none;
}

.bank-list {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}

.bank-row {
  display: grid;
  grid-template-columns: 46px 1fr auto;
  align-items: center;
  min-height: 52px;
  gap: 12px;
  padding: 7px 18px;
  border: 1px solid #dfe1e7;
  border-radius: 12px;
  background: white;
  text-align: left;
}

.bank-row.selected {
  border-color: transparent;
  background: #edf2ff;
}

.bank-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: #f0f2f5;
  color: #666;
  font-size: 12px;
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
  color: var(--flow-blue);
  font-size: 14px;
}

.bank-name small {
  width: max-content;
  margin-top: 2px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #f0f1f3;
  color: #777;
  font-size: 10px;
}

.bank-row.selected .bank-name small {
  background: #3f2c22;
  color: white;
}

.round-check {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 50%;
  background: var(--flow-blue);
  color: white;
  font-size: 14px;
  font-style: normal;
}

.asset-section {
  margin-top: 38px;
}

.asset-section + .asset-section {
  margin-top: 22px;
}

.asset-section__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #777;
  font-size: 12px;
}

.asset-section__header label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #222;
  font-weight: 800;
}

.asset-section__header input {
  width: 16px;
  height: 16px;
}

.asset-card {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  width: 100%;
  min-height: 82px;
  align-items: center;
  gap: 18px;
  margin-bottom: 12px;
  padding: 16px 22px;
  border: 1px solid #dfe1e7;
  border-radius: 13px;
  background: white;
  text-align: left;
  box-shadow: 0 1px 2px rgb(0 0 0 / 6%);
}

.asset-card.selected {
  border-color: transparent;
  background: #edf2ff;
}

.asset-card > span {
  display: grid;
  gap: 4px;
}

.asset-card strong,
.asset-card b {
  color: var(--flow-blue);
  font-size: 15px;
}

.asset-card small {
  color: #777;
  font-size: 11px;
}

.asset-card .round-check {
  position: absolute;
  right: 12px;
  bottom: 12px;
}

.selected-balance {
  margin: 28px 0 0;
  color: var(--flow-blue);
  font-size: 14px;
  font-weight: 800;
  text-align: right;
}

.completion-screen {
  display: flex;
  min-height: 580px;
  flex-direction: column;
  justify-content: center;
}

.completion-check {
  display: grid;
  width: 88px;
  height: 88px;
  place-items: center;
  align-self: center;
  margin: 35px 0 45px;
  border-radius: 50%;
  background: #edf2ff;
  color: var(--flow-action);
  font-size: 45px;
  font-weight: 300;
}

.completion-summary {
  display: grid;
  gap: 12px;
  margin-top: 50px;
  padding: 18px 24px;
  border: 1px solid #dfe1e7;
  border-radius: 14px;
  background: white;
}

.completion-summary span {
  display: flex;
  justify-content: space-between;
  color: #777;
  font-size: 12px;
}

.completion-summary strong {
  color: var(--flow-blue);
  font-size: 14px;
}

.completion-summary .danger {
  color: #ff4e51;
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
  box-shadow: 0 1px 4px rgb(0 0 0 / 10%);
}

.fixed-summary > span {
  color: #666;
  font-size: 12px;
}

.fixed-summary > strong {
  margin-top: 3px;
  color: #222;
  font-size: 24px;
}

.fixed-summary > small {
  position: absolute;
  top: 18px;
  right: 24px;
  color: #666;
  font-size: 12px;
}

.fixed-guide {
  margin: 22px 0 0;
  color: #666;
  font-size: 13px;
}

.select-all-fixed {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: -20px;
  font-size: 12px;
  font-weight: 800;
}

.select-all-fixed input {
  width: 18px;
  height: 18px;
}

.expense-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.expense-category {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 22px;
  font-size: 13px;
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
  box-shadow: 0 1px 2px rgb(0 0 0 / 7%);
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
  font-size: 12px;
  font-weight: 800;
}

.expense-name {
  display: grid;
}

.expense-name strong,
.expense-row b {
  font-size: 13px;
}

.expense-name small {
  margin-top: 2px;
  color: #777;
  font-size: 10px;
}

.expense-row input {
  width: 22px;
  height: 22px;
}

.fixed-cta {
  margin-top: 35px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes progress {
  to {
    width: 84%;
  }
}

@media (min-width: 768px) {
  .onboarding-page--step-5 .onboarding-stage,
  .onboarding-page--step-6 .onboarding-stage {
    padding-top: 165px;
  }

  .onboarding-page--step-2 .primary-cta {
    margin-top: 48px;
  }

  .onboarding-page--step-3 .primary-cta {
    margin-top: 25px;
  }

  .onboarding-page--step-8 .stage-heading {
    order: -1;
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
  .onboarding-stage--wide {
    width: min(100%, 393px);
    min-height: 100dvh;
    padding: 22px 16px 40px;
  }

  .mobile-back {
    display: block;
    margin-bottom: 20px;
    color: #666;
    font-size: 14px;
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
    font-size: 24px;
  }

  .stage-heading p {
    font-size: 13px;
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
  }

  .field-label,
  .field-group legend {
    color: #222;
    font-size: 14px;
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
    box-shadow: 0 2px 5px rgb(0 0 0 / 16%);
  }

  .date-row {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .field-group small {
    font-size: 10px;
  }

  .housing-field {
    display: grid;
  }

  .housing-field .control {
    border-radius: 8px;
    box-shadow: none;
  }

  .primary-cta {
    min-height: 54px;
    margin-top: 50px;
    border-radius: 14px;
    background: var(--flow-yellow);
    box-shadow: 0 2px 4px rgb(0 0 0 / 16%);
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
    font-size: 14px;
  }

  .collect-card ul {
    gap: 11px;
    font-size: 13px;
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
    font-size: 11px;
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
    justify-content: flex-start;
    padding-top: 160px;
  }

  .loading-screen h1 {
    color: #222;
    font-size: 22px;
  }

  .loading-status {
    margin-top: 28px;
    padding: 18px;
  }

  .progress-track {
    height: 54px;
    padding: 20px 16px;
    border-radius: 14px;
  }

  .bank-search {
    margin-top: 14px;
    background: #fff9e5;
    box-shadow: none;
  }

  .bank-categories {
    display: flex;
    gap: 5px;
    margin-top: 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .bank-categories button {
    flex: none;
    padding: 6px 12px;
    border-radius: 999px;
    color: #666;
    font-size: 12px;
  }

  .bank-categories button.active {
    background: var(--flow-yellow);
    color: #222;
    font-weight: 800;
  }

  .selected-chips {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e3e5e9;
  }

  .selected-chips button {
    padding: 6px 13px;
    border-radius: 999px;
    background: var(--flow-yellow);
    font-size: 11px;
    font-weight: 800;
  }

  .bank-list {
    gap: 12px;
    margin-top: 14px;
  }

  .bank-row {
    min-height: 88px;
    padding: 14px 18px;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgb(0 0 0 / 13%);
  }

  .bank-row.selected {
    background: #fff9df;
  }

  .bank-name strong {
    color: #222;
    font-size: 14px;
  }

  .bank-row .round-check {
    background: #666;
  }

  .sticky-cta {
    position: sticky;
    bottom: 10px;
    z-index: 3;
    margin-top: 24px;
  }

  .asset-section {
    margin-top: 38px;
  }

  .asset-section__header label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #222;
    font-weight: 800;
  }

  .asset-section__header input {
    width: 16px;
    height: 16px;
  }

  .asset-card {
    min-height: 92px;
    padding: 14px 18px;
    border-radius: 16px;
  }

  .asset-card.selected {
    background: #fff9df;
  }

  .asset-card strong,
  .asset-card b {
    color: #222;
    font-size: 14px;
  }

  .asset-card .round-check {
    background: #666;
  }

  .selected-balance {
    margin-top: 45px;
    color: #222;
    text-align: center;
  }

  .onboarding-page--step-6 .primary-cta {
    margin-top: 16px;
  }

  .completion-screen {
    min-height: calc(100dvh - 60px);
    justify-content: center;
  }

  .completion-check {
    order: -2;
    width: 82px;
    height: 82px;
    margin: 0 auto 18px;
    background: var(--flow-yellow);
    color: #f7aa16;
  }

  .completion-summary {
    margin-top: 38px;
  }

  .completion-screen .primary-cta {
    margin-top: 32px;
  }

  .fixed-heading {
    padding-bottom: 14px;
  }

  .fixed-summary {
    margin-top: 18px;
  }

  .expense-list {
    gap: 5px;
  }

  .expense-row {
    min-height: 56px;
  }

  .fixed-cta {
    margin-top: 48px;
  }
}
</style>
