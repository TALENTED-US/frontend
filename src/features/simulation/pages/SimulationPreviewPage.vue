<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import SimulationTimelineChart from '@/features/simulation/components/SimulationTimelineChart.vue'
import '@/features/simulation/styles/simulation.css'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
simulation.restoreConfirmedSnapshot()
const category = computed(() => route.params.category)
const meta = computed(() => ({
  expense: { step: 1, label: '지출 줄이기', title: '지출 줄이기로', next: '/simulation/income', delta: `지출 월 ${Math.round(simulation.expenseSaving / 10000)}만원 감소` },
  income: { step: 2, label: '수입 늘리기', title: '수입 늘리기로', next: '/simulation/policy', delta: `월수입 ${Math.round(simulation.recurringIncome / 10000)}만원 증가` },
  policy: { step: 3, label: '정책 혜택', title: '정책 혜택으로', next: '/simulation/confirm', delta: `정책 ${simulation.state.policies.length}개 반영` },
})[category.value])
const report = computed(() => simulation.remoteReport || {})
// 기간 비교는 확정 시점의 프론트 계산 기준을 사용한다. remoteReport의 기간 값은
// 서버 계산 기준이 달라 확정 화면과 서로 다른 값(예: 15.0 → 68.3)을 만들 수 있다.
const beforeMonths = computed(() => Number(simulation.currentMonths).toFixed(1))
const afterMonths = computed(() => Number(simulation.expectedMonths).toFixed(1))
const extension = computed(() => Math.max(0, Number(afterMonths.value) - Number(beforeMonths.value)).toFixed(1))
const cashflow = computed(() => report.value.cashflow || {
  beforeMonthlyIncome: simulation.monthlyIncome,
  afterMonthlyIncome: simulation.monthlyIncome + simulation.recurringIncome + simulation.recurringPolicy,
  beforeMonthlyExpense: simulation.monthlyExpense,
  afterMonthlyExpense: Math.max(0, simulation.monthlyExpense - (simulation.state.expenseApplied ? simulation.expenseSaving : 0)),
  beforeMonthlyNetCashFlow: simulation.monthlyIncome - simulation.monthlyExpense,
  afterMonthlyNetCashFlow: simulation.monthlyIncome + simulation.recurringIncome + simulation.recurringPolicy - Math.max(0, simulation.monthlyExpense - simulation.expenseSaving),
})
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const comparisonMaximum = computed(() => Math.max(
  Number(cashflow.value.beforeMonthlyIncome) || 0,
  Number(cashflow.value.afterMonthlyIncome) || 0,
  Number(cashflow.value.beforeMonthlyExpense) || 0,
  Number(cashflow.value.afterMonthlyExpense) || 0,
  1,
))
const barPixelHeight = (value) => Math.max(20, Math.round((Math.max(0, Number(value) || 0) / comparisonMaximum.value) * 76))
const barHeight = (value) => `${barPixelHeight(value)}px`
const compactMoney = (value) => Number(value) % 10000 === 0
  ? `${money(Number(value) / 10000)}만원`
  : `${money(value)}원`
const incomeDelta = computed(() => (Number(cashflow.value.afterMonthlyIncome) || 0) - (Number(cashflow.value.beforeMonthlyIncome) || 0))
const expenseDelta = computed(() => (Number(cashflow.value.beforeMonthlyExpense) || 0) - (Number(cashflow.value.afterMonthlyExpense) || 0))
const deltaLabel = (prefix, value, positiveWord, negativeWord) => {
  const amount = Math.abs(Number(value) || 0)
  return `${prefix} ${compactMoney(amount)} ${value >= 0 ? positiveWord : negativeWord}`
}
const arrowPath = (before, after) => {
  const startY = 78 - barPixelHeight(before)
  const endY = 78 - barPixelHeight(after)
  const controlY = Math.min(startY, endY) - 13
  return `M 25 ${startY} Q 45 ${controlY} 65 ${endY}`
}
</script>

<template>
  <section class="page sim-page sim-wizard preview-page">
    <button class="sim-back desktop-only" type="button" @click="router.push(`/simulation/${category}`)">‹ 미리보기</button>
    <div class="wizard-progress-tabs"><span v-for="(label, index) in ['01 지출 줄이기', '02 수입 늘리기', '03 정책 맞춤 추천']" :key="label" :class="{ active: index + 1 === meta.step, done: index + 1 < meta.step }">{{ label }}<i /></span></div>
    <h1 class="wizard-title">{{ meta.title }}<br />버티는 기간이 얼마나 늘어날까요?</h1>

    <article class="period-change-card">
      <header><h2>예상 버티는 기간 변화</h2><em>{{ extension }}개월 연장</em></header>
      <div><span><strong>{{ beforeMonths }}개월</strong><small>{{ meta.label }} 전</small></span><b>→</b><span><strong>{{ afterMonths }}개월</strong><small>{{ meta.label }} 후</small></span></div>
    </article>

    <section class="preview-timeline-section">
      <div class="preview-section-title"><h2>버티는 기간 타임라인</h2><p>시뮬레이션 전후, 자금 소진 시점의 변화를 알 수 있어요.</p></div>
      <SimulationTimelineChart preview-mode :assets="simulation.availableAssets" :monthly-expense="simulation.monthlyExpense" :monthly-income="simulation.monthlyIncome" :target-months="simulation.targetMonths" :current-months="Number(beforeMonths)" :expected-months="Number(afterMonths)" />
    </section>

    <section class="application-result">
      <div class="section-heading"><h2>시뮬레이션 적용 결과</h2></div>
      <div class="result-delta-badges">
        <span v-if="incomeDelta" class="income">{{ deltaLabel('월수입', incomeDelta, '증가', '감소') }}</span><i v-else />
        <span v-if="expenseDelta" class="expense">{{ deltaLabel('월지출', expenseDelta, '감소', '증가') }}</span><i v-else-if="category === 'policy'" class="policy">{{ meta.delta }}</i><i v-else />
      </div>
      <div class="cashflow-comparison">
        <article><div class="bar-pair"><i class="before" :style="{ height: barHeight(cashflow.beforeMonthlyIncome) }" /><i class="after" :style="{ height: barHeight(cashflow.afterMonthlyIncome) }" /><svg class="bar-change-arrow" viewBox="0 0 90 82" aria-hidden="true"><defs><marker id="income-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" /></marker></defs><path :d="arrowPath(cashflow.beforeMonthlyIncome, cashflow.afterMonthlyIncome)" marker-end="url(#income-arrow-head)" /></svg></div><small>{{ compactMoney(cashflow.beforeMonthlyIncome) }} → {{ compactMoney(cashflow.afterMonthlyIncome) }}</small><strong>월평균 수입</strong></article>
        <article><div class="bar-pair"><i class="before" :style="{ height: barHeight(cashflow.beforeMonthlyExpense) }" /><i class="after" :style="{ height: barHeight(cashflow.afterMonthlyExpense) }" /><svg class="bar-change-arrow" viewBox="0 0 90 82" aria-hidden="true"><defs><marker id="expense-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" /></marker></defs><path :d="arrowPath(cashflow.beforeMonthlyExpense, cashflow.afterMonthlyExpense)" marker-end="url(#expense-arrow-head)" /></svg></div><small>{{ compactMoney(cashflow.beforeMonthlyExpense) }} → {{ compactMoney(cashflow.afterMonthlyExpense) }}</small><strong>월평균 지출</strong></article>
      </div>
      <div class="comparison-legend"><span><i />적용 전</span><span><i />적용 후</span></div>
      <div class="net-cashflow-row"><span><strong>월평균 순현금흐름</strong><small>월수입 - 월지출</small></span><b>{{ compactMoney(cashflow.beforeMonthlyNetCashFlow) }} → {{ compactMoney(cashflow.afterMonthlyNetCashFlow) }}</b></div>
    </section>

    <div v-if="category !== 'policy'" class="wizard-actions"><button class="sim-text-button" @click="router.push(`/simulation/${category}`)">이전으로</button><button class="sim-btn sim-btn--yellow" @click="router.push(meta.next)">다음으로 →</button></div>
    <div v-else class="wizard-actions vertical"><button class="sim-btn sim-btn--yellow" @click="router.push('/simulation/confirm')">시뮬레이션 확인하기 →</button><button class="sim-text-button" @click="router.push('/simulation/confirm')">입력 내용 수정하기</button></div>
  </section>
</template>

<style scoped>
.preview-page > .wizard-progress-tabs {
  position: sticky;
  z-index: 30;
  top: var(--header-height);
  margin: -4px -18px 28px;
  padding: 10px 18px 14px;
  background: rgb(252 253 255 / 96%);
  box-shadow: 0 1px 0 rgb(20 30 60 / 7%);
  backdrop-filter: blur(8px);
}

.preview-page > .wizard-progress-tabs span {
  font-size: 11px;
}

.preview-page > .wizard-progress-tabs span.active {
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 767px) {
  .preview-page > .wizard-progress-tabs {
    top: 64px;
    margin-top: -10px;
  }

  .preview-page > .wizard-progress-tabs span {
    font-size: 12px;
  }

  .preview-page > .wizard-progress-tabs span.active {
    font-size: 14px;
  }
}

@media (min-width: 768px) {
  .preview-page > .wizard-progress-tabs {
    width: min(100%, 760px);
    margin-right: auto;
    margin-left: auto;
    padding-right: 0;
    padding-left: 0;
  }

  .preview-page > .wizard-progress-tabs span {
    font-size: 14px;
  }

  .preview-page > .wizard-progress-tabs span.active {
    font-size: 15px;
  }
}
</style>
