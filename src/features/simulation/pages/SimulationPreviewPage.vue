<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import ConfirmedFinancialTimeline from '@/features/simulation/components/ConfirmedFinancialTimeline.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import '@/features/simulation/styles/simulation.css'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
simulation.restoreConfirmedSnapshot()
const category = computed(() => route.params.category)
const wizardSteps = [
  { label: '01 지출 줄이기', to: '/simulation/expense' },
  { label: '02 수입 늘리기', to: '/simulation/income' },
  { label: '03 정책 맞춤 추천', to: '/simulation/policy' },
]
const meta = computed(() => ({
  expense: { step: 1, label: '지출 줄이기', title: '지출 줄이기로', next: '/simulation/income', delta: `지출 월 ${money(simulation.expenseSaving)}원 감소` },
  income: { step: 2, label: '수입 늘리기', title: '수입 늘리기로', next: '/simulation/policy', delta: `월수입 ${money(simulation.recurringIncome)}원 증가` },
  policy: { step: 3, label: '정책 혜택', title: '정책 혜택으로', next: '/simulation/confirm', delta: `정책 ${simulation.state.policies.length}개 반영` },
})[category.value])
// 기간 비교는 확정 시점의 프론트 계산 기준을 사용한다. remoteReport의 기간 값은
// 서버 계산 기준이 달라 확정 화면과 서로 다른 값(예: 15.0 → 68.3)을 만들 수 있다.
const beforeMonths = computed(() => Number(simulation.currentMonths).toFixed(1))
const afterMonths = computed(() => Number(simulation.expectedMonths).toFixed(1))
const extension = computed(() => Math.max(0, Number(afterMonths.value) - Number(beforeMonths.value)).toFixed(1))
const cashflow = computed(() => {
  const beforeMonthlyIncome = Number(simulation.monthlyIncome) || 0
  const beforeMonthlyExpense = Number(simulation.monthlyExpense) || 0
  const appliedIncome = category.value === 'expense' ? 0 : Number(simulation.recurringIncome) || 0
  const appliedPolicy = category.value === 'policy' ? Number(simulation.recurringPolicy) || 0 : 0
  const expenseSaving = simulation.state.expenseApplied ? Number(simulation.expenseSaving) || 0 : 0
  const afterMonthlyIncome = beforeMonthlyIncome + appliedIncome + appliedPolicy
  const afterMonthlyExpense = Math.max(0, beforeMonthlyExpense - expenseSaving)

  return {
    beforeMonthlyIncome,
    afterMonthlyIncome,
    beforeMonthlyExpense,
    afterMonthlyExpense,
    beforeMonthlyNetCashFlow: beforeMonthlyIncome - beforeMonthlyExpense,
    afterMonthlyNetCashFlow: afterMonthlyIncome - afterMonthlyExpense,
  }
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
const compactMoney = (value) => `${money(value)}원`
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
    <button class="sim-back simulation-back-button desktop-only" type="button" aria-label="뒤로가기" @click="router.push(`/simulation/${category}`)"><AppIcon name="chevron-left" :size="22" /></button>
    <div class="wizard-progress-tabs" aria-label="시뮬레이션 진행 단계">
      <RouterLink
        v-for="(wizardStep, index) in wizardSteps"
        :key="wizardStep.to"
        :to="wizardStep.to"
        class="wizard-progress-link"
        :aria-current="index + 1 === meta.step ? 'step' : undefined"
      >
        <span :class="{ active: index + 1 === meta.step, done: index + 1 < meta.step }">
          {{ wizardStep.label }}<i />
        </span>
      </RouterLink>
    </div>
    <h1 class="wizard-title">{{ meta.title }}<br />버티는 기간이 얼마나 늘어날까요?</h1>

    <article class="period-change-card">
      <header><h2>예상 버티는 기간 변화</h2><em>{{ extension }}개월 연장</em></header>
      <div><span><strong>{{ beforeMonths }}개월</strong><small>적용 전</small></span><b>→</b><span><strong>{{ afterMonths }}개월</strong><small>적용 후</small></span></div>
    </article>

    <ConfirmedFinancialTimeline
      class="preview-timeline-section"
      :current-months="Number(beforeMonths)"
      :expected-months="Number(afterMonths)"
      :target-months="Number(simulation.targetMonths)"
      description="계획 적용 시 현재 자금의 유지 기간이 얼마나 늘어나는지 확인하세요."
    />

    <section class="application-result">
      <div class="section-heading"><h2>시뮬레이션 적용 결과</h2></div>
      <div class="result-delta-badges">
        <span v-if="incomeDelta" class="income">{{ deltaLabel('월수입', incomeDelta, '증가', '감소') }}</span><span v-else-if="category === 'expense'" class="same">월평균 수입 동일</span><i v-else />
        <span v-if="expenseDelta" class="expense">{{ deltaLabel('월지출', expenseDelta, '감소', '증가') }}</span><i v-else-if="category === 'policy'" class="policy">{{ meta.delta }}</i><i v-else />
      </div>
      <div class="cashflow-comparison">
        <article><div class="bar-pair"><i class="before" :style="{ height: barHeight(cashflow.beforeMonthlyIncome) }" /><i class="after" :style="{ height: barHeight(cashflow.afterMonthlyIncome) }" /><svg class="bar-change-arrow" viewBox="0 0 90 82" aria-hidden="true"><defs><marker id="income-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" /></marker></defs><path :d="arrowPath(cashflow.beforeMonthlyIncome, cashflow.afterMonthlyIncome)" marker-end="url(#income-arrow-head)" /></svg></div><small><span>{{ compactMoney(cashflow.beforeMonthlyIncome) }}</span><br class="cashflow-mobile-break" /><span> → {{ compactMoney(cashflow.afterMonthlyIncome) }}</span></small><strong>월평균 수입</strong></article>
        <article><div class="bar-pair"><i class="before" :style="{ height: barHeight(cashflow.beforeMonthlyExpense) }" /><i class="after" :style="{ height: barHeight(cashflow.afterMonthlyExpense) }" /><svg class="bar-change-arrow" viewBox="0 0 90 82" aria-hidden="true"><defs><marker id="expense-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" /></marker></defs><path :d="arrowPath(cashflow.beforeMonthlyExpense, cashflow.afterMonthlyExpense)" marker-end="url(#expense-arrow-head)" /></svg></div><small><span>{{ compactMoney(cashflow.beforeMonthlyExpense) }}</span><br class="cashflow-mobile-break" /><span> → {{ compactMoney(cashflow.afterMonthlyExpense) }}</span></small><strong>월평균 지출</strong></article>
      </div>
      <div class="comparison-legend"><span><i />적용 전</span><span><i />적용 후</span></div>
      <div class="net-cashflow-row"><span><strong>월평균 순현금흐름</strong><small>월수입 - 월지출</small></span><b>{{ compactMoney(cashflow.beforeMonthlyNetCashFlow) }} → {{ compactMoney(cashflow.afterMonthlyNetCashFlow) }}</b></div>
    </section>

    <div v-if="category !== 'policy'" class="wizard-actions"><button class="sim-text-button" @click="router.push(`/simulation/${category}`)">이전으로</button><button class="sim-btn sim-btn--yellow simulation-primary-cta" @click="router.push(meta.next)">다음으로</button></div>
    <div v-else class="wizard-actions"><button class="sim-text-button" @click="router.push('/simulation/policy')">이전으로</button><button class="sim-btn sim-btn--yellow simulation-primary-cta" @click="router.push('/simulation/confirm')">시뮬레이션에 적용하기</button></div>
  </section>
</template>

<style scoped>
.preview-page > .wizard-progress-tabs {
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

.preview-page > .wizard-progress-tabs span {
  font-size: 11px;
}

.preview-page > .wizard-progress-tabs span.active {
  font-size: 13px;
  font-weight: 900;
}

:global(#app .app-shell .preview-page .comparison-legend span:last-child i) {
  border: 1px solid var(--sim-butter-deep);
  background: var(--sim-butter);
}

:global(#app .app-shell .preview-page .result-delta-badges .same) {
  background: #f3f4f6;
  color: #6f7682;
}

@media (max-width: 767px) {
  .preview-page > .wizard-progress-tabs {
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
    width: 100%;
    padding-right: 0;
    padding-left: 0;
  }

  .preview-page > .wizard-progress-tabs span {
    font-size: 26px;
  }

  .preview-page > .wizard-progress-tabs span.active {
    font-size: 29px;
  }
}
</style>
