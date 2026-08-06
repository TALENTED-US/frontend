<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import meltingImage from '@/assets/images/dashboard/buttie-melting.png'
import stableImage from '@/assets/images/dashboard/buttie-stable.png'
import '@/features/simulation/styles/simulation.css'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
const step = computed(() => route.meta.simulationStep)
const startDate = ref(simulation.state.startDate)
const endDate = ref(simulation.state.endDate)
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const manwon = (value) => `${money((Number(value) || 0) / 10000)}만원`
const nextDraftPath = computed(() => {
  if (!simulation.state.expenseApplied) return '/simulation/expense'
  if (!simulation.state.incomes.length) return '/simulation/income'
  if (!simulation.state.policies.length) return '/simulation/policy'
  return '/simulation/confirm'
})

onMounted(async () => {
  const data = await simulation.hydrateDraft()
  if (data) {
    startDate.value = simulation.state.startDate
    endDate.value = simulation.state.endDate
  }
})

async function startSimulation() {
  if (!startDate.value || !endDate.value || endDate.value <= startDate.value) return
  simulation.prepareNewScenario()
  simulation.state.startDate = startDate.value
  simulation.state.endDate = endDate.value
  const ok = await simulation.beginSimulation()
  if (ok) router.push('/simulation/expense')
}

function reset() {
  simulation.resetScenario()
  startDate.value = simulation.state.startDate
  endDate.value = simulation.state.endDate
  router.push('/simulation/new')
}

function confirm() {
  simulation.confirmScenario()
  router.push('/simulation')
}
</script>

<template>
  <section class="page sim-page sim-wizard" :class="`sim-flow-${step}`">
    <template v-if="step === 'continue'">
      <button class="sim-back" type="button" @click="router.push('/simulation')">‹ 시뮬레이션</button>
      <div class="resume-hero">
        <img :src="stableImage" alt="다시 찾아온 버티" />
        <h1>시뮬레이션을 하는 중이었어요.<br />이어서 만드시겠어요?</h1>
        <p>지금까지 입력한 내용은 안전하게 저장되어 있어요.</p>
      </div>
      <div class="wizard-actions vertical">
        <button class="sim-btn sim-btn--yellow" type="button" @click="router.push(nextDraftPath)">이어서 만들기 →</button>
        <button class="sim-text-button" type="button" @click="reset">처음부터 다시 시작하기</button>
      </div>
    </template>

    <template v-else-if="step === 'categories'">
      <button class="sim-back" type="button" @click="router.push('/simulation')">‹ 시뮬레이션</button>
      <h1 class="wizard-title">지출을 매달 10만원 줄이면<br />버티는 기간이 얼마나 늘어날까요?</h1>
      <p class="sim-subtitle">현재 재정 상태를 기준으로 나만의 계획을 만들어보세요.</p>

      <div class="buttie-transition" aria-label="현재 상태에서 안정 상태로 변화하는 버티">
        <div><img :src="meltingImage" alt="현재 상태의 버티" /><span>현재</span></div>
        <b>→</b>
        <div><img :src="stableImage" alt="목표 상태의 버티" /><span>목표</span></div>
      </div>

      <section class="period-section">
        <h2>시뮬레이션 기간</h2>
        <p>오늘부터 목표 취업일까지 자동으로 설정했어요.</p>
        <div class="period-grid">
          <label><span>시작일</span><input v-model="startDate" type="date" /></label>
          <label><span>종료일</span><input v-model="endDate" type="date" /></label>
        </div>
        <p v-if="endDate && startDate && endDate <= startDate" class="form-error">종료일은 시작일보다 뒤여야 해요.</p>
      </section>

      <section class="baseline-report">
        <div class="section-heading"><h2>현재 재정 리포트</h2><span>최근 거래내역 기준</span></div>
        <div class="report-grid-compact">
          <article><span>사용 가능 자산</span><strong>{{ manwon(simulation.availableAssets) }}</strong></article>
          <article><span>월평균 수입</span><strong class="income">+{{ manwon(simulation.monthlyIncome) }}</strong></article>
          <article><span>월평균 지출</span><strong class="expense">-{{ manwon(simulation.monthlyExpense) }}</strong></article>
          <article><span>현재 버티는 기간</span><strong>{{ simulation.currentMonths }}개월</strong></article>
        </div>
      </section>

      <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
      <button class="sim-btn sim-btn--yellow wide" :disabled="simulation.syncing || !startDate || !endDate || endDate <= startDate" type="button" @click="startSimulation">
        {{ simulation.syncing ? '불러오는 중…' : '시뮬레이션 시작하기 →' }}
      </button>
    </template>

    <template v-else>
      <button class="sim-back" type="button" @click="router.push('/simulation/policy/preview')">‹ 입력 내용 수정</button>
      <h1 class="wizard-title">지금까지 만든 계획을<br />한 번 더 확인해 주세요</h1>
      <p class="sim-subtitle">항목을 눌러 각 단계로 돌아가 수정할 수 있어요.</p>

      <section class="edit-summary expense">
        <header><div><i>01</i><h2>지출 줄이기</h2></div><button @click="router.push('/simulation/expense')">수정</button></header>
        <p v-for="item in simulation.selectedExpenses" :key="item.id"><span>{{ item.icon }} {{ item.name }}</span><strong>-{{ money(item.saving) }}원 / 월</strong></p>
        <p v-if="!simulation.selectedExpenses.length" class="empty-row">건너뛴 단계예요.</p>
      </section>
      <section class="edit-summary income">
        <header><div><i>02</i><h2>수입 늘리기</h2></div><button @click="router.push('/simulation/income')">수정</button></header>
        <p v-for="item in simulation.state.incomes" :key="item.id"><span>💰 {{ item.name }}</span><strong>+{{ money(item.amount) }}원</strong></p>
        <p v-if="!simulation.state.incomes.length" class="empty-row">건너뛴 단계예요.</p>
      </section>
      <section class="edit-summary policy">
        <header><div><i>03</i><h2>정책 혜택</h2></div><button @click="router.push('/simulation/policy')">수정</button></header>
        <p v-for="item in simulation.state.policies" :key="item.id"><span>🏛️ {{ item.name }}</span><strong>{{ item.detail }}</strong></p>
        <p v-if="!simulation.state.policies.length" class="empty-row">건너뛴 단계예요.</p>
      </section>

      <div class="final-result"><span>예상 버티는 기간</span><p><del>{{ simulation.currentMonths }}개월</del><b>→</b><strong>{{ simulation.expectedMonths }}개월</strong></p><em>+{{ simulation.addedMonths }}개월 연장</em></div>
      <p class="api-notice neutral">최종 확정 API가 준비되기 전까지 이 결과는 브라우저에 임시 저장됩니다.</p>
      <button class="sim-btn sim-btn--yellow wide" type="button" @click="confirm">시뮬레이션 확정하기 →</button>
    </template>
  </section>
</template>
