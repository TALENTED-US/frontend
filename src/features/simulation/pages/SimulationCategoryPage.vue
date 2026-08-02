<script setup>
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import '@/features/simulation/styles/simulation.css'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
const category = computed(() => route.params.category)
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const analyzedMonth = computed(() => {
  const months = simulation.expenseMonths
  if (!months.length) return '최근 3개월 월평균 소비'
  const first = months[0].replace('-', '.')
  const last = months.at(-1).replace('-', '.')
  return `최근 3개월 월평균 소비 (${first}~${last})`
})
const donutStyle = computed(() => {
  const total = simulation.totalCurrentExpense || 1
  let cursor = 0
  const stops = simulation.expenseBreakdown.map((item) => {
    const start = cursor
    cursor += (item.current / total) * 100
    return `${item.color || '#b8bdc8'} ${start}% ${cursor}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})
const form = reactive({ name: '', amount: '', type: 'monthly', startDate: '2026-08-02', cycle: '매월' })

function addIncome() {
  const amount = Number(form.amount)
  if (!form.name.trim() || !amount) return
  simulation.addIncome({ name: form.name.trim(), amount, type: form.type, startDate: form.startDate, cycle: form.type === 'monthly' ? form.cycle : '1회' })
  Object.assign(form, { name: '', amount: '', type: 'monthly', startDate: '2026-08-02', cycle: '매월' })
}

function resetCategory() {
  if (category.value === 'expense') simulation.resetExpenses()
  if (category.value === 'income') {
    simulation.resetIncomes()
    Object.assign(form, { name: '', amount: '', type: 'monthly', startDate: '2026-08-02', cycle: '매월' })
  }
  if (category.value === 'policy') simulation.resetPolicies()
}
</script>

<template>
  <section class="page sim-page sim-category-page">
    <button class="sim-back" type="button" @click="router.push('/simulation/new')">‹ {{ category === 'expense' ? '지출 줄이기' : category === 'income' ? '수입 늘리기' : '정책 혜택' }}</button>

    <template v-if="category === 'expense'">
      <div class="category-page-heading"><div><h1>소비 카테고리 목표 설정</h1><p class="sim-subtitle">소비 비중을 보고 줄이고 싶은 금액을 직접 입력하세요.</p></div><button class="category-reset" type="button" @click="resetCategory">지출 계획 초기화</button></div>
      <article class="expense-overview">
        <div><span>{{ analyzedMonth }}</span><strong>{{ money(simulation.totalCurrentExpense) }}원</strong><small>직전 3개월 거래내역 기준</small></div>
        <div class="donut" :style="donutStyle" aria-label="카테고리별 지출 비중 그래프" />
        <ul>
          <li v-for="item in simulation.expenseBreakdown" :key="item.id">
            <i :style="{ background: item.color }" />{{ item.name }} <b>{{ money(item.current) }}원</b>
          </li>
        </ul>
      </article>
      <h2 class="flow-section-title">카테고리별 절약 목표 설정</h2><p class="sim-subtitle">+/− 버튼으로 월평균 절약 목표를 바로 정해보세요.</p>
      <div class="expense-list"><article v-for="item in simulation.state.expenses" :key="item.id"><button :class="['select-circle', { active: item.selected }]" @click="simulation.toggleExpense(item.id)">{{ item.icon }}</button><div><strong>{{ item.name }}</strong><small>최근 3개월 월평균 {{ money(item.current) }}원</small></div><label>월평균 절약 목표 <span><button @click="simulation.adjustExpense(item.id, -10000)">−</button><b>{{ money(item.saving / 10000) }}만원</b><button @click="simulation.adjustExpense(item.id, 10000)">＋</button></span></label></article></div>
      <div class="impact-card"><span>입력한 절약 목표 합계</span><strong>{{ money(simulation.expenseSaving) }}원</strong><p>{{ money(simulation.expenseSaving) }}원 절약하면 버티는 기간이 늘어나요 <b>{{ simulation.currentMonths }}개월 → {{ simulation.expensePreviewMonths }}개월</b></p></div>
      <button :disabled="!simulation.selectedExpenses.length || !simulation.expenseSaving" class="sim-btn sim-btn--yellow wide" @click="simulation.applyExpenses(); router.push('/simulation/preview')">절약 목표 적용하기 →</button>
    </template>

    <template v-else-if="category === 'income'">
      <div class="category-page-heading"><div><h1>수입 계획 직접 추가</h1><p class="sim-subtitle">수입명·금액·반복 여부를 입력해 관리해요.</p></div><button class="category-reset" type="button" @click="resetCategory">수입 계획 초기화</button></div>
      <form class="income-form" @submit.prevent="addIncome"><label>수입명<input v-model="form.name" placeholder="예: 주말 카페 아르바이트" required /></label><label>예상 금액<div><input v-model="form.amount" type="number" min="1" placeholder="금액 입력" required /><b>원</b></div></label><fieldset><legend>수입 유형</legend><button type="button" :class="{ active: form.type === 'monthly' }" @click="form.type = 'monthly'">정기 수입</button><button type="button" :class="{ active: form.type === 'once' }" @click="form.type = 'once'">일회성 수입</button></fieldset><label>시작일<input v-model="form.startDate" type="date" /></label><label v-if="form.type === 'monthly'">반복 주기<select v-model="form.cycle"><option>매월</option><option>매주</option><option>격주</option></select></label><button class="sim-btn sim-btn--yellow wide" type="submit">수입 계획 추가하기</button></form>
      <section class="income-plans"><div class="sim-section-row"><h2>추가한 수입 계획</h2><strong>월 +{{ money(simulation.recurringIncome) }}원</strong></div><article v-for="item in simulation.state.incomes" :key="item.id"><div><strong>{{ item.name }}</strong><small>{{ item.type === 'monthly' ? `정기 수입 · ${item.cycle}` : `일회성 수입 · ${item.startDate}` }}</small></div><b>+{{ money(item.amount) }}원</b><button @click="simulation.removeIncome(item.id)">삭제</button></article><div v-if="!simulation.state.incomes.length" class="sim-empty small"><strong>아직 추가한 수입이 없어요</strong><span>위 입력란에서 첫 수입 계획을 등록해보세요.</span></div></section>
      <button v-if="simulation.state.incomes.length" class="sim-btn sim-btn--yellow wide" @click="router.push('/simulation/preview')">시나리오에 적용하기 →</button>
    </template>

    <template v-else>
      <div class="category-page-heading"><div><h1>자격 확인</h1><p class="sim-subtitle">온보딩에서 입력하신 정보로 자동 채워져 있어요.</p></div><button class="category-reset" type="button" @click="resetCategory">정책 선택 초기화</button></div>
      <div class="qualification-grid"><article><span>생년월일</span><strong>1999.03.15</strong></article><article><span>거주지역</span><strong>서울특별시</strong></article><article><span>취업 준비 상태</span><strong>첫 취업 준비</strong></article><article><span>주거 형태</span><strong>자취 (월세)</strong></article></div>
      <button class="sim-btn sim-btn--yellow wide">이 정보로 추천받기 →</button>
      <div class="policy-list"><article v-for="(policy, index) in simulation.policyCatalog" :key="policy.id" :class="{ selected: simulation.state.policies.some(item => item.id === policy.id) }" @click="simulation.togglePolicy(policy)"><div><small>{{ index + 1 }}순위 · 추천</small><h2>{{ policy.name }}</h2><p>{{ policy.description }}</p><em>신청 가능</em></div><strong>{{ policy.detail }}</strong><button>{{ simulation.state.policies.some(item => item.id === policy.id) ? '✓' : '+' }}</button></article></div>
      <article class="policy-summary"><h2>선택한 항목 ({{ simulation.state.policies.length }}개)</h2><p v-for="item in simulation.state.policies" :key="item.id"><span>🏛️ {{ item.name }}</span><b>{{ item.detail }}</b></p><footer><span>월 정기 지원 합계</span><strong>+{{ money(simulation.recurringPolicy) }}원 / 월</strong></footer></article>
      <button :disabled="!simulation.state.policies.length" class="sim-btn sim-btn--yellow wide" @click="router.push('/simulation/preview')">이 항목들로 적용하기 →</button>
    </template>
  </section>
</template>

<style scoped>
.category-page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.category-page-heading h1 { font-size: 30px; }
.category-reset {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #ff8b8f;
  border-radius: 10px;
  background: #fff5f5;
  color: #e94f55;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.category-reset:hover { background: #ffe9ea; }
.income-form select {
  padding-right: 56px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5l5-5' fill='none' stroke='%23222' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 24px center;
  background-size: 12px 8px;
}
@media (max-width: 767px) {
  .category-page-heading { align-items: stretch; flex-direction: column; gap: 12px; }
  .category-page-heading h1 { font-size: 24px; }
  .category-reset { align-self: flex-end; min-height: 36px; }
}
</style>
