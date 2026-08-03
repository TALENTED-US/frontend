<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import SimulationTimelineChart from '@/features/simulation/components/SimulationTimelineChart.vue'
import '@/features/simulation/styles/simulation.css'

const route = useRoute()
const router = useRouter()
const simulation = useSimulationStore()
const step = computed(() => route.meta.simulationStep)
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const categories = [
  { key: 'expense', icon: '🪽', title: '지출 줄이기', summary: simulation.state.expenseApplied ? `-${money(simulation.expenseSaving)}원/월 적용됨` : '-10만원/월 적용됨', description: '멤버십 수정하기', class: 'blue' },
  { key: 'income', icon: '💼', title: '수입 늘리기', summary: simulation.state.incomes.length ? `항목 ${simulation.state.incomes.length}개` : '알바·부업 찾기', description: '멤버십 추가하기', class: 'green' },
  { key: 'policy', icon: '🏛️', title: '정책 혜택', summary: simulation.state.policies.length ? `정책지원금 ${simulation.state.policies.length}` : '정부지원금 등', description: '멤버십 나에게 맞는 정책 확인하기', class: 'yellow' },
]

function confirm() { simulation.confirmScenario(); router.push('/') }
function reset() { simulation.resetScenario(); router.push('/simulation/new') }
</script>

<template>
  <section class="page sim-page sim-flow">
    <button class="sim-back" type="button" @click="router.push('/simulation')">‹ 시뮬레이션</button>

    <template v-if="step === 'continue'">
      <h1>이어서 만들어볼까요?</h1><p class="sim-subtitle">지난번 만들던 예상 재정 계획이 그대로 남아있어요.</p>
      <article class="sim-card continue-card"><div class="sim-section-row"><h2>지금까지 만든 계획</h2><strong>{{ simulation.completedCategories }}/3 카테고리 완료</strong></div><progress :value="simulation.completedCategories" max="3" />
        <div v-for="(category, index) in categories" :key="category.key" class="continue-row"><i :class="category.class">{{ category.icon }}</i><span><strong>{{ category.title }}</strong><small>{{ index === 0 ? '식비·교통·쇼핑 목표 설정 완료' : index === 1 && simulation.state.incomes.length ? `수입 ${simulation.state.incomes.length}건 등록` : index === 2 && simulation.state.policies.length ? `정책 ${simulation.state.policies.length}건 선택` : '아직 선택한 항목이 없어요' }}</small></span><b :class="{ done: index === 0 || (index === 1 && simulation.state.incomes.length) || (index === 2 && simulation.state.policies.length) }">✓</b></div>
        <footer><span>여기까지 적용하면</span><strong>{{ simulation.currentMonths }}개월 → {{ simulation.expectedMonths }}개월</strong><b>+{{ simulation.addedMonths }}개월</b></footer>
      </article>
      <button class="sim-btn sim-btn--yellow wide" @click="router.push('/simulation/new')">이어서 계속하기 →</button><button class="sim-text-button" @click="reset">처음부터 다시 시작하기</button>
    </template>

    <template v-else-if="step === 'categories'">
      <h1>카테고리를 선택해주세요</h1><h2 class="flow-section-title">카테고리</h2><p class="sim-subtitle">직접 설정한 재정 계획을 시나리오에 추가할 수 있어요.</p>
      <div class="category-choice-grid"><button v-for="category in categories" :key="category.key" :class="['choice-card', category.class]" @click="router.push(`/simulation/${category.key}`)"><i>{{ category.icon }}</i><span><strong>{{ category.title }}</strong><em>{{ category.summary }}</em><small>{{ category.description }}</small></span><b>›</b></button></div>
      <button v-if="simulation.hasDraft" class="sim-btn sim-btn--yellow wide" @click="router.push('/simulation/preview')">현재 계획 미리보기 →</button>
    </template>

    <template v-else-if="step === 'preview'">
      <h1>다른 카테고리도 적용해볼까요?</h1><p class="sim-subtitle">지금까지 적용한 내용으로 버티는 기간이 늘어났어요.</p>
      <article class="preview-summary"><span>예상 버티는 기간</span><p><del>{{ simulation.currentMonths }}개월</del><b>→</b><strong>{{ simulation.expectedMonths }}개월</strong><em>+{{ simulation.addedMonths }}개월</em></p></article>
      <div class="period-grid"><label>시작일<input v-model="simulation.state.startDate" type="date" /></label><label>종료일<input v-model="simulation.state.endDate" type="date" /></label></div>
      <h2 class="flow-section-title">적용한 카테고리</h2><div class="category-choice-grid three"><button v-for="category in categories" :key="category.key" :class="['choice-card', category.class]" @click="router.push(`/simulation/${category.key}`)"><i>{{ category.icon }}</i><span><strong>{{ category.title }}</strong><em>{{ category.summary }}</em></span><b>✓</b></button></div>
      <div class="preview-panels"><article><h3>예상 버티는 기간 변화</h3><strong>{{ simulation.currentMonths }}개월 → {{ simulation.expectedMonths }}개월</strong></article><article><h3>카테고리별 기여</h3><p>지출 줄이기 <b>-{{ money(simulation.expenseSaving) }}원/월</b></p><p>수입 늘리기 <b>+{{ money(simulation.recurringIncome + simulation.oneTimeIncome) }}원</b></p><p>정책 혜택 <b>+{{ money(simulation.recurringPolicy + simulation.oneTimePolicy) }}원</b></p></article></div>
      <article class="sim-card sim-timeline"><h2>월별 재정 타임라인</h2><SimulationTimelineChart :assets="simulation.availableAssets" :monthly-expense="simulation.monthlyExpense" :monthly-income="simulation.monthlyIncome" :target-months="simulation.targetMonths" :current-months="simulation.currentMonths" :expected-months="simulation.expectedMonths" /></article>
      <button class="sim-btn sim-btn--yellow wide" @click="router.push('/simulation/confirm')">이대로 최종 확정하기 →</button>
    </template>

    <template v-else>
      <h1>이대로 확정할까요?</h1><p class="sim-subtitle">지금까지 만든 계획</p>
      <article v-if="simulation.state.expenseApplied" class="confirm-group expense"><div class="sim-section-row"><h2>지출 줄이기</h2><strong>-{{ money(simulation.expenseSaving) }}원</strong></div><div v-for="item in simulation.selectedExpenses" :key="item.id" class="confirm-row"><i>{{ item.icon }}</i><span><strong>{{ item.name }} {{ money(item.saving) }}원 줄이기</strong><small>-{{ money(item.saving) }}원</small></span><button @click="simulation.adjustExpense(item.id, -10000)">−</button><b>{{ money(item.saving) }}원</b><button @click="simulation.adjustExpense(item.id, 10000)">＋</button><button class="trash" @click="simulation.toggleExpense(item.id)">⌫</button></div><button @click="router.push('/simulation/expense')">+ 지출 항목 추가하기</button></article>
      <article class="confirm-group income"><div class="sim-section-row"><h2>수입 늘리기</h2><strong>+{{ money(simulation.recurringIncome + simulation.oneTimeIncome) }}원</strong></div><div v-for="item in simulation.state.incomes" :key="item.id" class="confirm-row"><i>💰</i><span><strong>{{ item.name }}</strong><small>{{ item.type === 'monthly' ? '정기 수입' : '일회성 수입' }}</small></span><b>+{{ money(item.amount) }}원</b><button class="trash" @click="simulation.removeIncome(item.id)">⌫</button></div><button @click="router.push('/simulation/income')">+ 수입 항목 추가하기</button></article>
      <article class="confirm-group policy"><div class="sim-section-row"><h2>정책 혜택</h2><strong>신청 가능</strong></div><div v-for="item in simulation.state.policies" :key="item.id" class="confirm-row"><i>🏛️</i><span><strong>{{ item.name }}</strong><small>{{ item.detail }}</small></span><button class="trash" @click="simulation.removePolicy(item.id)">⌫</button></div><button @click="router.push('/simulation/policy')">+ 정책 혜택 추가하기</button></article>
      <div class="confirm-result"><span>수정 반영 시 예상 결과</span><strong>{{ simulation.currentMonths }}개월 → {{ simulation.expectedMonths }}개월</strong><b>+{{ simulation.addedMonths }}개월</b></div>
      <button class="sim-btn sim-btn--yellow wide" @click="confirm">재정 계획 확정하기 →</button><button class="sim-text-button danger-text" @click="reset">전체 초기화</button>
    </template>
  </section>
</template>
