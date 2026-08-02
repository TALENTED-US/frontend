<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import SimulationTimelineChart from '@/features/simulation/components/SimulationTimelineChart.vue'
import meltingImage from '@/assets/images/dashboard/buttie-melting.png'
import cautionImage from '@/assets/images/dashboard/buttie-caution.png'
import stableImage from '@/assets/images/dashboard/buttie-stable.png'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const simulation = useSimulationStore()
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const manwon = (value) => value ? `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value / 10000)}만원` : '없음'
const expectedLabel = computed(() => simulation.state.confirmed ? `${simulation.expectedMonths}개월` : '?개월')
const statusImages = { danger: meltingImage, caution: cautionImage, safe: stableImage }
const currentStatusImage = computed(() => statusImages[simulation.currentStatus.key])
const expectedStatusImage = computed(() => statusImages[simulation.expectedStatus.key])

function start() {
  router.push(simulation.hasDraft ? '/simulation/continue' : '/simulation/new')
}
</script>

<template>
  <section class="page sim-page">
    <header class="sim-heading desktop-only">
      <h1>시뮬레이션</h1>
      <p>계획을 세우고 버티는 기간이 얼마나 늘어나는지 확인해보세요.</p>
    </header>

    <article class="sim-hero">
      <div class="sim-hero__copy">
        <small>💡 시뮬레이션 해보기</small>
        <h2>지출을 10만원 줄이면<br />버티는 기간이 얼마나 늘어날까요?</h2>
        <button class="sim-btn sim-btn--orange desktop-cta" type="button" @click="start">
          {{ simulation.hasDraft ? '시나리오 수정하기 →' : '지금 시뮬레이션 하기 →' }}
        </button>
      </div>
      <div class="sim-hero__result">
        <div><span>현재 버티는 기간</span><strong>{{ simulation.currentMonths }}<em>개월</em></strong><img :src="currentStatusImage" :alt="`${simulation.currentStatus.label} 상태의 버티`" /><b :class="simulation.currentStatus.key">{{ simulation.currentStatus.label }}</b></div>
        <i>→</i>
        <div><span>예상 버티는 기간</span><strong>{{ expectedLabel }}</strong><img v-if="simulation.state.confirmed" :src="expectedStatusImage" :alt="`${simulation.expectedStatus.label} 상태의 버티`" /><b v-if="simulation.state.confirmed" :class="simulation.expectedStatus.key">{{ simulation.expectedStatus.label }}</b></div>
      </div>
      <button class="sim-btn sim-btn--orange mobile-cta" type="button" @click="start">
        {{ simulation.hasDraft ? '시나리오 수정하기 →' : '지금 시뮬레이션 하기 →' }}
      </button>
    </article>

    <section v-if="simulation.state.confirmed" class="sim-quests">
      <div class="sim-section-row"><h2>퀘스트 <small>(To Do List)</small></h2><span>진행률 {{ simulation.completedCategories }}/3</span></div>
      <article class="sim-card sim-quest-card">
        <div class="sim-outcome"><span>현재 버티는 기간</span><strong>{{ simulation.currentMonths }}개월</strong><i>→</i><span>예상 버티는 기간</span><strong>{{ simulation.expectedMonths }}개월</strong><b>+{{ simulation.addedMonths }}개월</b></div>
        <div v-if="simulation.state.expenseApplied && simulation.selectedExpenses.length" class="quest-group expense"><h3>● 지출 줄이기 <em>-{{ money(simulation.expenseSaving) }}원</em></h3><p v-for="item in simulation.selectedExpenses" :key="item.id">{{ item.icon }} {{ item.name }} 줄이기 <span>-{{ money(item.saving) }}원</span></p></div>
        <div v-if="simulation.state.incomes.length" class="quest-group income"><h3>● 수입 늘리기 <em>+{{ money(simulation.recurringIncome + simulation.oneTimeIncome) }}원</em></h3><p v-for="item in simulation.state.incomes" :key="item.id">💰 {{ item.name }} <span>+{{ money(item.amount) }}원</span></p></div>
        <div v-if="simulation.state.policies.length" class="quest-group policy"><h3>● 정책 혜택</h3><p v-for="item in simulation.state.policies" :key="item.id">🏛️ {{ item.name }} <span>{{ item.detail }}</span></p></div>
      </article>
    </section>
    <section v-else class="sim-quests"><h2>퀘스트 <small>(To Do List)</small></h2><button class="sim-empty" type="button" @click="start"><strong>아직 확정된 시나리오가 없어요</strong><span>시뮬레이션을 실행하고 계획을 확정하면 여기에 실행 목표가 표시돼요.</span></button></section>

    <section class="sim-report">
      <h2>현재 재정 리포트</h2>
      <div class="sim-report-grid">
        <article><span>총자산</span><strong>{{ manwon(simulation.totalAssets) }}</strong></article><article><span>월평균 수입</span><strong>{{ manwon(simulation.monthlyIncome) }}</strong></article><article><span>월평균 지출</span><strong>{{ manwon(simulation.monthlyExpense) }}</strong></article><article><span>순현금흐름</span><strong>{{ simulation.monthlyIncome - simulation.monthlyExpense > 0 ? '+' : '' }}{{ manwon(simulation.monthlyIncome - simulation.monthlyExpense) }}</strong></article>
      </div>
    </section>

    <article class="sim-card sim-timeline"><h2>월별 재정 타임라인</h2><SimulationTimelineChart :assets="simulation.availableAssets" :monthly-expense="simulation.monthlyExpense" :monthly-income="simulation.monthlyIncome" :target-months="simulation.targetMonths" :current-months="simulation.currentMonths" :expected-months="simulation.expectedMonths" :unknown="!simulation.state.confirmed" /></article>
  </section>
</template>

<style scoped>
.mobile-cta { display: none; }
.sim-hero__result .caution { background: #f4b63c; color: #fff; }

@media (max-width: 767px) {
  .sim-hero__copy .desktop-cta { display: none; }
  .sim-hero > .mobile-cta {
    display: inline-flex;
    width: 100%;
  }
}
</style>
