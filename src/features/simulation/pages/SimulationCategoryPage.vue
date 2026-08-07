<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useSessionStore } from '@/stores/session'
import { financeState, loadTransactions } from '@/features/finance/financeStore'
import '@/features/simulation/styles/simulation.css'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
const session = useSessionStore()
const category = computed(() => route.params.category)
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const goalAmount = (value) => Number(value) % 10000 === 0 ? `${money(Number(value) / 10000)}만원` : `${money(value)}원`
const stepNumber = computed(() => ({ expense: 1, income: 2, policy: 3 })[category.value])
const title = computed(() => ({ expense: '지출 줄이기', income: '수입 늘리기', policy: '정책 혜택' })[category.value])
const backPath = computed(() => ({ expense: '/simulation/new', income: '/simulation/expense/preview', policy: '/simulation/income/preview' })[category.value])
const profileDate = (value) => value ? value.replaceAll('-', '.') : '-'
const jobTypeLabel = computed(() => session.currentUser.jobType === 'first' ? '첫 취업 준비' : '재취업 준비')
const form = reactive({ name: '', amount: '', type: 'monthly', startDate: simulation.state.startDate, cycle: '매월' })
const editingIncomeId = ref(null)
const selectedExpenseId = ref('식비')
const expenseAmount = ref('')
const activeExpense = computed(() => simulation.state.expenses.find((item) => item.id === selectedExpenseId.value) || simulation.state.expenses[0])
const visibleBreakdown = computed(() => simulation.expenseBreakdown.slice(0, 4))

watch(category, (value) => {
  if (value === 'expense') simulation.initializeExpensesFromAnalysis()
}, { immediate: true })

onMounted(async () => {
  if (category.value !== 'expense') return
  try { await loadTransactions() } catch {}
  simulation.initializeExpensesFromAnalysis()
  await simulation.hydrateCategory('expense')
})

const donutStyle = computed(() => {
  const total = simulation.totalCurrentExpense || 1
  let cursor = 0
  return { background: `conic-gradient(${simulation.expenseBreakdown.map((item) => {
    const start = cursor
    cursor += (item.current / total) * 100
    return `${item.color || '#b8bdc8'} ${start}% ${cursor}%`
  }).join(', ')})` }
})

function addIncome() {
  const amount = Number(form.amount)
  if (!form.name.trim() || amount <= 0) return
  const payload = { name: form.name.trim(), amount, type: form.type, startDate: form.startDate, cycle: form.type === 'monthly' ? form.cycle : '1회', remoteSynced: false }
  if (editingIncomeId.value) simulation.updateIncome(editingIncomeId.value, payload)
  else simulation.addIncome(payload)
  resetIncomeForm()
}

function resetIncomeForm() {
  editingIncomeId.value = null
  Object.assign(form, { name: '', amount: '', type: 'monthly', startDate: simulation.state.startDate, cycle: '매월' })
}

function editIncome(item) {
  editingIncomeId.value = item.id
  Object.assign(form, { name: item.name, amount: String(item.amount), type: item.type, startDate: item.startDate, cycle: item.cycle || '매월' })
  document.querySelector('.income-plan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function deleteIncome(id) {
  simulation.removeIncome(id)
  if (editingIncomeId.value === id) resetIncomeForm()
}

const incomeIcon = (item) => item.type === 'monthly' ? '♨' : '▦'
const incomeSchedule = (item) => item.type === 'monthly'
  ? `정기수입 · ${item.cycle || '매월'} ${Number(item.startDate?.slice(-2)) || 1}일`
  : `일회성 수입 · ${profileDate(item.startDate)}`

function selectExpense(item, loadSaved = false) {
  selectedExpenseId.value = item.id
  expenseAmount.value = loadSaved && item.saving ? String(item.saving) : ''
}

function updateExpenseAmount(event) {
  const maximum = Number(activeExpense.value?.current) || 0
  const normalized = Math.max(0, Math.min(maximum, Math.trunc(Number(event.target.value) || 0)))
  expenseAmount.value = normalized ? String(normalized) : ''
  event.target.value = expenseAmount.value
}

function addExpenseGoal() {
  const amount = Number(expenseAmount.value)
  if (!activeExpense.value || amount <= 0 || amount > activeExpense.value.current) return
  simulation.setExpenseSaving(activeExpense.value.id, amount)
  expenseAmount.value = ''
}

function editExpenseGoal(item) {
  selectExpense(item, true)
  document.querySelector('.expense-target-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function deleteExpenseGoal(item) {
  simulation.setExpenseSaving(item.id, 0)
  if (selectedExpenseId.value === item.id) expenseAmount.value = ''
}

async function apply(categoryName) {
  if (categoryName === 'expense') simulation.applyExpenses()
  await simulation.syncCategory(categoryName)
  router.push(`/simulation/${categoryName}/preview`)
}

function skip() {
  router.push(category.value === 'expense' ? '/simulation/income' : category.value === 'income' ? '/simulation/policy' : '/simulation/confirm')
}
</script>

<template>
  <section class="page sim-page sim-wizard sim-category-page">
    <button class="sim-back" type="button" @click="router.push(backPath)">‹ {{ title }}</button>
    <div class="wizard-progress-tabs" aria-label="시뮬레이션 진행 단계">
      <span v-for="(label, index) in ['01 지출 줄이기', '02 수입 늘리기', '03 정책 맞춤 추천']" :key="label" :class="{ active: index + 1 === stepNumber, done: index + 1 < stepNumber }">{{ label }}<i /></span>
    </div>

    <template v-if="category === 'expense'">
      <h1 class="wizard-title">소비 비중을 보고<br />줄이고 싶은 금액을 직접 입력하세요.</h1>
      <article class="expense-analysis-card">
        <div class="expense-analysis-total"><span>지난달 소비</span><strong>{{ money(simulation.totalCurrentExpense) }}원</strong></div>
        <div class="expense-analysis-body">
          <div class="donut" :style="donutStyle" aria-label="지난달 카테고리별 소비 비중" />
          <ul><li v-for="item in visibleBreakdown" :key="item.id"><i :style="{ background: item.color }" /><span>{{ item.name }}</span><strong>{{ money(item.current / 10000) }}만원<small>{{ Math.round(item.current / Math.max(1, simulation.totalCurrentExpense) * 100) }}%</small></strong></li></ul>
        </div>
        <p v-if="financeState.loading">실제 소비 내역을 불러오는 중이에요…</p>
        <p v-else-if="financeState.error" class="form-error">{{ financeState.error }}</p>
      </article>

      <section class="expense-target-card">
        <h2>카테고리별 절약 목표 설정</h2><p>카테고리를 눌러 절약 목표를 설정해보세요.</p>
        <div class="expense-category-tabs"><button v-for="item in simulation.state.expenses" :key="item.id" :class="{ active: selectedExpenseId === item.id }" type="button" @click="selectExpense(item)">{{ item.name }}</button></div>
        <div v-if="activeExpense" class="expense-target-editor">
          <div class="expense-target-info"><i>{{ activeExpense.icon }}</i><strong>{{ activeExpense.name }}</strong><span>저번 달 {{ money(activeExpense.current) }}원</span></div>
          <label><span>{{ activeExpense.name }} 절약 목표</span><div><input :value="expenseAmount" type="number" min="0" :max="activeExpense.current" step="1000" :disabled="activeExpense.current <= 0" placeholder="금액을 입력하세요" @keydown="['e', 'E', '+', '-'].includes($event.key) && $event.preventDefault()" @input="updateExpenseAmount($event)" /><b>원</b></div></label>
          <small v-if="activeExpense.current <= 0">지난달 {{ activeExpense.name }} 지출 내역이 없어 목표를 추가할 수 없어요.</small>
          <small v-else>최대 {{ money(activeExpense.current) }}원까지 입력할 수 있어요.</small>
          <button class="expense-add-button" :disabled="!Number(expenseAmount) || Number(expenseAmount) > activeExpense.current" type="button" @click="addExpenseGoal">{{ activeExpense.selected ? '수정하기' : '추가하기' }}</button>
        </div>
      </section>

      <section v-if="simulation.selectedExpenses.length" class="added-expense-goals">
        <div class="section-heading"><h2><i />추가한 지출 절약 목표</h2><span>총 {{ simulation.selectedExpenses.length }}개</span></div>
        <article v-for="item in simulation.selectedExpenses" :key="item.id"><i>{{ item.icon }}</i><strong>{{ item.name }} {{ goalAmount(item.saving) }} 줄이기</strong><div class="expense-goal-controls"><strong>-{{ goalAmount(item.saving) }}</strong><span><button @click="editExpenseGoal(item)">수정</button><button @click="deleteExpenseGoal(item)">삭제</button></span></div></article>
        <footer><span>지출 절약 합계</span><strong>월 {{ goalAmount(simulation.expenseSaving) }}</strong></footer>
      </section>
      <div class="wizard-actions"><button class="sim-text-button" @click="skip">건너뛰기</button><button class="sim-btn sim-btn--yellow" :disabled="!simulation.expenseSaving || simulation.syncing" @click="apply('expense')">적용하기 →</button></div>
    </template>

    <template v-else-if="category === 'income'">
      <h1 class="wizard-title">수입을 늘릴 계획을 세워보세요</h1>
      <p class="sim-subtitle">추가한 수입은 시뮬레이션에 반영돼요.</p>
      <form class="income-plan-form" @submit.prevent="addIncome">
        <div class="income-form-heading"><strong>수입 계획 입력</strong><button type="button" @click="resetIncomeForm">↻&nbsp; 초기화</button></div>
        <label class="income-name-field"><span>수입명</span><input v-model="form.name" class="income-field" aria-label="수입명" placeholder="예: 주말 카페 아르바이트" required /></label>
        <label>예상 금액<div class="income-money-field"><input v-model="form.amount" type="number" min="1" placeholder="금액 입력" required @keydown="['e', 'E', '+', '-'].includes($event.key) && $event.preventDefault()" /><b>원</b></div></label>
        <fieldset><legend>수입 유형</legend><button type="button" :class="{ active: form.type === 'monthly' }" @click="form.type = 'monthly'">정기 수입</button><button type="button" :class="{ active: form.type === 'once' }" @click="form.type = 'once'">일회성 수입</button></fieldset>
        <label>시작일<input v-model="form.startDate" class="income-field" type="date" required /></label>
        <label v-if="form.type === 'monthly'">반복 주기<select v-model="form.cycle" class="income-field"><option>매월</option></select></label>
        <button class="income-add-button" type="submit">{{ editingIncomeId ? '수입 계획 수정하기' : '수입 계획 추가하기' }}</button>
      </form>
      <section v-if="simulation.state.incomes.length" class="added-income-plans">
        <div class="section-heading"><h2><i />추가한 수입 계획</h2><span>총 {{ simulation.state.incomes.length }}개</span></div>
        <article v-for="item in simulation.state.incomes" :key="item.id"><i>{{ incomeIcon(item) }}</i><div><strong>{{ item.name }} <em v-if="item.type === 'monthly'">↻ 정기</em></strong><small>{{ incomeSchedule(item) }}</small></div><div class="income-plan-controls"><strong>{{ goalAmount(item.amount) }}{{ item.type === 'once' ? ' (일시)' : '' }}</strong><span><button type="button" @click="editIncome(item)">수정</button><button type="button" @click="deleteIncome(item.id)">삭제</button></span></div></article>
        <footer><span>월 정기 수입 합계</span><strong>+{{ goalAmount(simulation.recurringIncome) }} / 월</strong><span>일시 수입 합계</span><strong>+{{ goalAmount(simulation.oneTimeIncome) }}</strong></footer>
      </section>
      <div class="wizard-actions"><button class="sim-text-button" @click="skip">건너뛰기</button><button class="sim-btn sim-btn--yellow" :disabled="!simulation.state.incomes.length || simulation.syncing" @click="apply('income')">시뮬레이션에 적용</button></div>
    </template>

    <template v-else>
      <h1 class="wizard-title">내가 받을 수 있는<br />정책 혜택도 반영해볼까요?</h1>
      <p class="sim-subtitle">취업 준비 정보를 기준으로 신청 가능한 정책을 모았어요.</p>
      <div class="qualification-grid compact"><article><span>생년월일</span><strong>{{ profileDate(session.currentUser.birth) }}</strong></article><article><span>거주지역</span><strong>{{ session.currentUser.region || '-' }}</strong></article><article><span>준비 상태</span><strong>{{ jobTypeLabel }}</strong></article><article><span>가구원 수</span><strong>{{ session.currentUser.family || '-' }}명</strong></article></div>
      <section v-if="simulation.state.policies.length" class="selected-policies"><h2>선택한 정책</h2><article v-for="item in simulation.state.policies" :key="item.id"><div><strong>{{ item.name }}</strong><small>{{ item.detail }}</small></div><button @click="simulation.removePolicy(item.id)">×</button></article></section>
      <section class="policy-list wizard-policy-list"><div class="section-heading"><h2>조건에 맞는 정책</h2><span>{{ simulation.policyCatalog.length }}개</span></div><article v-for="policy in simulation.policyCatalog" :key="policy.id" :class="{ selected: simulation.state.policies.some(item => item.id === policy.id) }"><div><small>신청 가능</small><h2>{{ policy.name }}</h2><p>{{ policy.description }}</p><em>{{ policy.detail }}</em></div><button @click="simulation.togglePolicy(policy)">{{ simulation.state.policies.some(item => item.id === policy.id) ? '✓' : '+' }}</button></article></section>
      <div class="wizard-actions"><button class="sim-text-button" @click="skip">건너뛰기</button><button class="sim-btn sim-btn--yellow" :disabled="!simulation.state.policies.length || simulation.syncing" @click="apply('policy')">결과 확인하기 →</button></div>
    </template>

    <p v-if="simulation.syncError" class="api-notice">서버 저장에 실패했지만 입력 내용은 이 브라우저에 보관했어요. {{ simulation.syncError }}</p>
  </section>
</template>
