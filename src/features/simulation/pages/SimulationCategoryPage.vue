<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useSessionStore } from '@/stores/session'
import { financeState, loadTransactions } from '@/features/finance/financeStore'
import { policyFilterGroups, toPolicySearchRequest } from '@/features/search/policyData'
import { calculateAge, normalizePolicyRegion } from '@/mappers/policy'
import '@/features/simulation/styles/simulation.css'

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
const selectedExpenseId = ref('식비')
const expenseAmount = ref('')
const activeExpense = computed(
  () =>
    simulation.state.expenses.find((item) => item.id === selectedExpenseId.value) ||
    simulation.state.expenses[0],
)
const visibleBreakdown = computed(() => simulation.expenseBreakdown)
const policyCount = computed(() => simulation.state.policies.length)
const isEditingConfirmedScenario = computed(
  () => Boolean(simulation.recentConfirmed) && !simulation.state.confirmed,
)

function profilePolicyFilters() {
  const employment = session.currentUser.jobType === 'again' ? '재취업' : '첫취업'
  const region = normalizePolicyRegion(session.currentUser.region)
  const supportedRegions = policyFilterGroups[2][1]
  return [employment, ...(supportedRegions.includes(region) ? [region] : []), '신청 가능']
}

const selectedPolicyFilters = ref(profilePolicyFilters())
const policySupportAmount = ref(0)
const policyFilterModalOpen = ref(false)
const draftPolicyFilters = ref([])
const draftPolicySupportAmount = ref(0)

const appliedPolicyEmployment = computed(
  () =>
    policyFilterGroups[0][1].find((item) => selectedPolicyFilters.value.includes(item)) || '전체',
)
const appliedPolicyRegion = computed(
  () =>
    policyFilterGroups[2][1].find((item) => selectedPolicyFilters.value.includes(item)) ||
    normalizePolicyRegion(session.currentUser.region) ||
    '전체',
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
  draftPolicyFilters.value = profilePolicyFilters()
  draftPolicySupportAmount.value = 0
}

async function applyPolicyFilters() {
  selectedPolicyFilters.value = [...draftPolicyFilters.value]
  policySupportAmount.value = draftPolicySupportAmount.value
  const params = toPolicySearchRequest(selectedPolicyFilters.value, policySupportAmount.value, '', {
    page: 1,
    size: 100,
    age: calculateAge(session.currentUser.birth),
    policyRegion: normalizePolicyRegion(session.currentUser.region),
  })
  await simulation.loadPolicyCatalog(params)
  closePolicyFilterModal()
  scrollToPolicies()
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

watch(category, (value, previousValue) => {
  if (value === 'policy' && previousValue !== 'policy') simulation.loadPolicyCatalog()
})

onMounted(async () => {
  if (category.value === 'expense') {
    try {
      await loadTransactions()
    } catch {}
    simulation.initializeExpensesFromAnalysis()
  }
  if (category.value === 'policy') await simulation.loadPolicyCatalog()
  await simulation.hydrateCategory(category.value)
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

function scrollToPolicies() {
  document.querySelector('.policy-catalog-scroll')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

const incomeIcon = (item) => (item.type === 'monthly' ? '♨' : '▦')
const incomeSchedule = (item) =>
  item.type === 'monthly'
    ? `정기수입 · ${item.cycle || '매월'} ${Number(item.startDate?.slice(-2)) || 1}일`
    : `일회성 수입 · ${profileDate(item.startDate)}`

function selectExpense(item, loadSaved = false) {
  selectedExpenseId.value = item.id
  expenseAmount.value = loadSaved && item.saving ? String(item.saving) : ''
}

function updateExpenseAmount(event) {
  const maximum = Number(activeExpense.value?.current) || 0
  const rawAmount = Number(event.target.value.replace(/\D/g, '')) || 0
  const normalized = Math.max(0, Math.min(maximum, Math.trunc(rawAmount)))
  expenseAmount.value = normalized ? String(normalized) : ''
  event.target.value = moneyInput(expenseAmount.value)
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
  expenseAmount.value = ''
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
  router.push('/simulation/confirm')
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
      class="sim-back desktop-only"
      type="button"
      :aria-label="title"
      @click="router.push(backPath)"
    >
      ‹
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
        <div class="expense-analysis-body">
          <div class="donut" :style="donutStyle" aria-label="지난달 카테고리별 소비 비중" />
          <div class="expense-breakdown-list">
            <h2>카테고리별 소비</h2>
            <ul>
              <li v-for="item in visibleBreakdown" :key="item.id">
                <i :style="{ background: item.color }" /><span>{{ item.name }}</span
                ><strong
                  >{{ money(item.current / 10000) }}만원<small
                    >{{
                      Math.round(
                        (item.current / Math.max(1, simulation.totalCurrentExpense)) * 100,
                      )
                    }}%</small
                  ></strong
                >
              </li>
            </ul>
          </div>
        </div>
        <p v-if="financeState.loading">실제 소비 내역을 불러오는 중이에요…</p>
        <p v-else-if="financeState.error" class="form-error">{{ financeState.error }}</p>
      </article>

      <section class="expense-target-card">
        <h2>카테고리별 절약 목표 설정</h2>
        <p>카테고리를 눌러 절약 목표를 설정해보세요.</p>
        <div class="expense-category-tabs">
          <button
            v-for="item in simulation.state.expenses"
            :key="item.id"
            :class="{ active: selectedExpenseId === item.id }"
            type="button"
            @click="selectExpense(item)"
          >
            {{ item.name }}
          </button>
        </div>
        <div v-if="activeExpense" class="expense-target-editor">
          <div class="expense-target-info">
            <i>{{ activeExpense.icon }}</i
            ><strong>{{ activeExpense.name }}</strong
            ><span>저번 달 {{ money(activeExpense.current) }}원</span>
          </div>
          <label
            ><span>
              <template v-if="activeExpense.name === '자격증 비용'"
                >자격증 비용<br />절약 목표</template
              >
              <template v-else>{{ activeExpense.name }} 절약 목표</template>
            </span>
            <div>
              <input
                :value="moneyInput(expenseAmount)"
                type="text"
                inputmode="numeric"
                :disabled="activeExpense.current <= 0"
                placeholder="금액을 입력하세요"
                @keydown="['e', 'E', '+', '-'].includes($event.key) && $event.preventDefault()"
                @input="updateExpenseAmount($event)"
              /><b>원</b>
            </div></label
          >
          <small v-if="activeExpense.current <= 0"
            >지난달 {{ activeExpense.name }} 지출 내역이 없어 목표를 추가할 수 없어요.</small
          >
          <small v-else>최대 {{ money(activeExpense.current) }}원까지 입력할 수 있어요.</small>
          <button
            class="expense-add-button"
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
      </section>

      <section v-if="simulation.selectedExpenses.length" class="added-expense-goals">
        <div class="section-heading">
          <h2><i />추가한 지출 절약 목표</h2>
          <span>총 {{ simulation.selectedExpenses.length }}개</span>
        </div>
        <article v-for="item in simulation.selectedExpenses" :key="item.id">
          <i>{{ item.icon }}</i
          ><strong>{{ item.name }} {{ goalAmount(item.saving) }} 줄이기</strong>
          <div class="expense-goal-controls">
            <strong>-{{ goalAmount(item.saving) }}</strong
            ><span
              ><button @click="editExpenseGoal(item)">수정</button
              ><button @click="deleteExpenseGoal(item)">삭제</button></span
            >
          </div>
        </article>
        <footer>
          <span>지출 절약 합계</span><strong>월 {{ goalAmount(simulation.expenseSaving) }}</strong>
        </footer>
      </section>
      <div class="wizard-actions">
        <button class="sim-text-button" @click="skip">건너뛰기</button>
        <button
          class="sim-btn sim-btn--yellow"
          :disabled="
            (!simulation.expenseSaving && !isEditingConfirmedScenario) || simulation.syncing
          "
          @click="apply('expense')"
        >
          적용하기 →
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
        <button class="income-add-button" type="submit" :disabled="simulation.syncing">
          {{ editingIncomeId ? '수입 계획 수정하기' : '수입 계획 추가하기' }}
        </button>
      </form>
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
              ><button type="button" @click="editIncome(item)">수정</button
              ><button type="button" @click="deleteIncome(item.id)">삭제</button></span
            >
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
          class="sim-btn sim-btn--yellow"
          :disabled="
            (!simulation.state.incomes.length && !isEditingConfirmedScenario) || simulation.syncing
          "
          @click="apply('income')"
        >
          시뮬레이션에 적용
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

      <section class="policy-selected-card">
        <div class="policy-selected-heading">
          <h2><i />추가한 정책</h2>
          <span>총 {{ policyCount }}개</span>
        </div>
        <p v-if="!policyCount" class="policy-selected-empty">선택한 정책이 없어요</p>
        <div v-else class="policy-selected-list">
          <article v-for="item in simulation.state.policies" :key="item.id">
            <i>⚖</i>
            <div>
              <strong>{{ item.name }}</strong
              ><small>{{ item.description }}</small>
            </div>
            <b>{{ item.detail }}</b>
            <button type="button" :disabled="simulation.syncing" @click="deletePolicy(item)">
              삭제
            </button>
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

      <section class="policy-catalog-scroll">
        <div class="policy-catalog-heading">
          <h2>내 조건에 맞는 정책 모두 보기</h2>
          <span>{{ simulation.policyCatalog.length }}개</span>
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
              <p>{{ policy.description }}</p>
            </div>
            <button
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
            <small>자세히 보기 ⌄</small><strong>{{ policy.detail }}</strong>
          </article>
        </div>
      </section>

      <button
        class="sim-btn sim-btn--yellow wide"
        :disabled="simulation.syncing"
        type="button"
        @click="continueFromPolicy"
      >
        {{ policyCount ? '최종 결과 보기' : '정책 건너뛰고 최종 결과 보기' }}
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
              연령과 기본 거주 지역은 프로필 정보로 자동 반영돼요. 다른 지역을 선택하면 선택한
              지역을 우선 적용해요.
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
  font-size: 11px;
  cursor: pointer;
}

.sim-category-page > .wizard-progress-tabs span.active {
  font-size: 13px;
  font-weight: 900;
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

.expense-breakdown-list h2 {
  margin-bottom: 10px;
  color: #333d4b;
  font-size: 14px;
  font-weight: 800;
}

.expense-analysis-body li {
  min-height: 30px;
  padding: 6px 0;
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
  font-size: 12px;
  white-space: nowrap;
}

.expense-analysis-body li small {
  font-size: 10px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  font-size: 9px;
}

.policy-condition-grid strong {
  overflow: hidden;
  color: #222;
  font-size: 11px;
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
  margin-top: 16px;
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
.policy-catalog-heading span {
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
  color: #777e89;
  font-size: 10px;
}

.policy-selected-card footer strong {
  color: #222;
  font-size: 11px;
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
  align-items: center;
  margin: -16px -10px 12px -12px;
  padding: 16px 12px 10px;
  background: #f7f6fc;
}

.policy-catalog-list {
  display: grid;
  gap: 10px;
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

.policy-catalog-list article > small {
  color: #6f7580;
  font-size: 9px;
}

.policy-catalog-list article > strong {
  justify-self: end;
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
    font-size: var(--type-field-label-size);
    font-weight: var(--type-field-label-weight);
  }

  .sim-category-page input.income-field,
  .sim-category-page .income-money-field input,
  .sim-category-page .income-money-field b {
    font-size: 14px;
    font-weight: 700;
  }

  .sim-category-page .income-money-field input,
  .sim-category-page .income-plan-form fieldset button,
  .sim-category-page .income-name-field input.income-field,
  .sim-category-page input.income-field[type='date'],
  .sim-category-page select.income-field {
    font-size: var(--type-input-size);
    font-weight: var(--type-input-weight);
  }

  .sim-category-page .added-expense-goals footer,
  .sim-category-page .added-expense-goals footer strong,
  .sim-category-page .added-income-plans footer,
  .sim-category-page .added-income-plans footer strong,
  .sim-category-page .policy-selected-card footer p,
  .sim-category-page .policy-selected-card footer span,
  .sim-category-page .policy-selected-card footer strong {
    font-size: var(--type-total-size);
    font-weight: var(--type-total-weight);
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
  .policy-condition-grid span,
  .policy-selected-heading span,
  .policy-catalog-heading span,
  .policy-selected-list article small,
  .policy-selected-card footer p,
  .policy-catalog-list p,
  .policy-catalog-list article > small {
    font-size: 12px;
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
  .sim-category-page > .sim-back {
    font-size: 48px;
    font-weight: 900;
  }

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

  .policy-selected-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
</style>
