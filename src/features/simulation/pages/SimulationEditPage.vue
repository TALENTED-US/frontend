<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const simulation = useSimulationStore()
const toDateInputValue = (value) => {
  const match = String(value || '').trim().match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : ''
}
const startDate = ref(toDateInputValue(simulation.state.startDate))
const endDate = ref(toDateInputValue(simulation.state.endDate))
const periodError = ref('')
const showNewSimulationModal = ref(false)

const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const compactWon = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  return amount >= 10000 && amount % 10000 === 0 ? `${money(amount / 10000)}만원` : `${money(amount)}원`
}
const recurringIncomeCount = computed(() => simulation.state.incomes.filter((item) => item.type === 'monthly').length)
const oneTimeIncomeCount = computed(() => simulation.state.incomes.filter((item) => item.type === 'once').length)
const selectedPolicyCount = computed(() => simulation.state.policies.length)
const recurringBenefit = computed(() => simulation.recurringIncome + simulation.recurringPolicy)
const oneTimeBenefit = computed(() => simulation.oneTimeIncome + simulation.oneTimePolicy)

onMounted(async () => {
  simulation.restoreConfirmedSnapshot()

  if (simulation.state.draftStarted && !simulation.state.confirmed) {
    await simulation.hydrateDraft()
  } else if (!simulation.state.confirmed) {
    await simulation.hydrateConfirmed()
  }

  startDate.value = toDateInputValue(simulation.state.startDate)
  endDate.value = toDateInputValue(simulation.state.endDate)
})

async function updatePeriod() {
  if (!startDate.value || !endDate.value || endDate.value <= startDate.value) {
    periodError.value = '종료일은 시작일보다 뒤여야 해요.'
    return
  }
  periodError.value = ''
  await simulation.savePeriod(startDate.value, endDate.value)
}

async function editCategory(category) {
  if (simulation.state.confirmed) {
    const reverted = await simulation.revertConfirmedScenario()
    if (!reverted) return
  }
  router.push(`/simulation/${category}`)
}

async function createNewSimulation() {
  const ok = simulation.state.confirmed
    ? await simulation.deleteConfirmedScenario()
    : await simulation.deleteDraftScenario()
  if (!ok) return
  simulation.prepareNewScenario()
  showNewSimulationModal.value = false
  router.push('/simulation/new')
}
</script>

<template>
  <section class="page sim-page simulation-edit-page">
    <button class="sim-back desktop-only" type="button" @click="router.push('/simulation')">‹ 시뮬레이션 수정하기</button>

    <header class="simulation-edit-intro">
      <h1>현재 적용된 계획을 확인하고,<br />변경할 카테고리를 선택해보세요.</h1>
    </header>

    <section class="simulation-edit-period">
      <h2>시뮬레이션 기간</h2>
      <p>시작일은 오늘, 종료일은 목표 취업일이 기본이에요.</p>
      <div class="simulation-edit-period__grid">
        <label><span>시작일</span><input v-model="startDate" type="date" aria-label="시뮬레이션 시작일" @change="updatePeriod" /></label>
        <i>~</i>
        <label><span>종료일</span><input v-model="endDate" type="date" aria-label="시뮬레이션 종료일" @change="updatePeriod" /></label>
      </div>
      <p v-if="periodError" class="form-error">{{ periodError }}</p>
    </section>

    <section class="simulation-edit-status">
      <h2>시뮬레이션 현황</h2>
      <div class="simulation-edit-cards">
        <button class="simulation-edit-card expense" type="button" @click="editCategory('expense')">
          <span class="simulation-edit-card__title"><i />지출 줄이기</span><em>지출 계획으로 이동 →</em>
          <small>월 {{ compactWon(simulation.expenseSaving) }} 절약 · {{ simulation.selectedExpenses.length }}개 항목</small>
          <strong>월 {{ compactWon(simulation.expenseSaving) }} 절약</strong>
        </button>

        <button class="simulation-edit-card income" type="button" @click="editCategory('income')">
          <span class="simulation-edit-card__title"><i />수입 늘리기</span><em>수입 계획으로 이동 →</em>
          <small>월 {{ compactWon(simulation.recurringIncome) }} 정기 · 일시 {{ compactWon(simulation.oneTimeIncome) }} · {{ recurringIncomeCount + oneTimeIncomeCount }}개 계획</small>
          <strong>월 {{ compactWon(simulation.recurringIncome) }}</strong>
          <b v-if="simulation.oneTimeIncome">{{ compactWon(simulation.oneTimeIncome) }}(일회성)</b>
        </button>

        <button class="simulation-edit-card policy" type="button" @click="editCategory('policy')">
          <span class="simulation-edit-card__title"><i />정책 혜택</span><em>정책 혜택으로 이동 →</em>
          <small>{{ selectedPolicyCount }}개 정책 적용 중</small>
          <strong>{{ simulation.recurringPolicy ? `월 ${compactWon(simulation.recurringPolicy)} 지원` : `일시 ${compactWon(simulation.oneTimePolicy)} 지원` }}</strong>
          <b v-if="simulation.recurringPolicy && simulation.oneTimePolicy">일시 {{ compactWon(simulation.oneTimePolicy) }} 지원</b>
        </button>
      </div>
    </section>

    <section class="simulation-edit-forecast">
      <div><span>현재 버티는 기간</span><strong>{{ simulation.currentMonths }}<small>개월</small></strong></div>
      <div><span>예상 버티는 기간</span><strong>{{ simulation.expectedMonths }}<small>개월</small></strong><b>+{{ simulation.addedMonths }}개월</b></div>
    </section>

    <p v-if="recurringBenefit || oneTimeBenefit" class="simulation-edit-benefit">
      반영 혜택: 월 {{ compactWon(recurringBenefit) }}<template v-if="oneTimeBenefit"> · 일시 {{ compactWon(oneTimeBenefit) }}</template>
    </p>
    <button class="sim-btn sim-btn--yellow simulation-edit-all" type="button" @click="editCategory('expense')">시뮬레이션 전체 수정하기</button>
    <button class="simulation-create-new" type="button" @click="showNewSimulationModal = true">새 시뮬레이션 만들기</button>
    <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>

    <div
      v-if="showNewSimulationModal"
      class="simulation-new-modal"
      role="presentation"
      @click.self="showNewSimulationModal = false"
      @keydown.esc="showNewSimulationModal = false"
    >
      <section role="dialog" aria-modal="true" aria-labelledby="new-simulation-title">
        <span class="simulation-new-modal__icon" aria-hidden="true">!</span>
        <h2 id="new-simulation-title">새 시뮬레이션을 만들까요?</h2>
        <p>새 시뮬레이션을 생성하면 현재 수정 중인 시뮬레이션이 삭제됩니다.<br />그래도 다시 생성하시겠습니까?</p>
        <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
        <div>
          <button type="button" :disabled="simulation.syncing" @click="showNewSimulationModal = false">취소</button>
          <button type="button" :disabled="simulation.syncing" @click="createNewSimulation">
            {{ simulation.syncing ? '삭제하는 중…' : '새로 만들기' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.simulation-edit-page {
  width: min(100%, 720px);
  margin: 0 auto;
  padding: 4px 18px 112px;
}

.simulation-edit-page > .sim-back {
  margin-bottom: 24px;
}

.simulation-edit-intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.simulation-edit-intro h1 {
  font-size: 21px;
  line-height: 1.45;
}

.simulation-edit-period, .simulation-edit-status { margin-top: 24px; }
.simulation-edit-period h2, .simulation-edit-status > h2 { font-size: 17px; }
.simulation-edit-period > p { margin-top: 5px; color: #858c99; font-size: 11px; }

.simulation-edit-period__grid {
  display: grid;
  grid-template-columns: 1fr 14px 1fr;
  align-items: center;
  gap: 5px;
  margin-top: 15px;
}

.simulation-edit-period__grid label {
  position: relative;
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 15px 18px;
  border: 1px solid #dff0e9;
  border-radius: 14px;
  background: #f3fcf8;
  box-shadow: 0 2px 5px rgb(20 40 30 / 9%);
}

.simulation-edit-period__grid label > span { color: #858c99; font-size: 10px; }
.simulation-edit-period__grid input {
  width: 100%;
  min-width: 0;
  height: 28px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #222;
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
}

.simulation-edit-period__grid input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: .72;
}
.simulation-edit-period__grid > i { color: #555; font-size: 12px; font-style: normal; text-align: center; }
.simulation-edit-period .form-error { color: #d94f55; }
.simulation-edit-cards { display: grid; gap: 12px; margin-top: 14px; }

.simulation-edit-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 14px;
  padding: 20px;
  border-radius: 15px;
  background: #f8f9fb;
  color: #222;
  text-align: left;
}

.simulation-edit-card__title { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800; }
.simulation-edit-card__title i { width: 10px; height: 10px; border-radius: 50%; background: #ef5757; }
.simulation-edit-card em { align-self: center; color: #ef5757; font-size: 11px; font-style: normal; font-weight: 800; }
.simulation-edit-card small { color: #858b97; font-size: 11px; line-height: 1.5; }
.simulation-edit-card > strong { justify-self: end; font-size: 16px; }
.simulation-edit-card > b { grid-column: 2; justify-self: end; color: #777; font-size: 11px; }
.simulation-edit-card.income .simulation-edit-card__title i { background: #3ed19a; }
.simulation-edit-card.income em { color: #31bd88; }
.simulation-edit-card.policy .simulation-edit-card__title i { background: #8d77cf; }
.simulation-edit-card.policy em { color: #8d77cf; }

.simulation-edit-forecast {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 15px;
  background: #e8e9ed;
}

.simulation-edit-forecast > div { position: relative; display: grid; gap: 12px; padding: 19px 23px; background: #f7f8fa; }
.simulation-edit-forecast span { color: #666d78; font-size: 12px; }
.simulation-edit-forecast strong { font-size: 34px; }
.simulation-edit-forecast strong small { margin-left: 2px; font-size: 13px; }
.simulation-edit-forecast b { position: absolute; right: 15px; bottom: 22px; color: #62483b; font-size: 11px; }
.simulation-edit-benefit { margin: 10px 4px 0; color: #858b97; font-size: 10px; text-align: right; }
.simulation-edit-all { width: 100%; min-height: 56px; margin-top: 20px; font-size: 16px; }

.simulation-create-new {
  width: 100%;
  min-height: 54px;
  margin-top: 12px;
  border: 1px solid #dfe3ea;
  border-radius: 13px;
  background: #fff;
  color: #686f7c;
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 2px 5px rgb(20 30 60 / 9%);
}

.simulation-new-modal {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
  background: rgb(18 22 30 / 48%);
}

.simulation-new-modal > section {
  width: min(100%, 390px);
  padding: 28px 24px 22px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 18px 48px rgb(10 15 25 / 24%);
  text-align: center;
}

.simulation-new-modal__icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin: 0 auto 16px;
  place-items: center;
  border-radius: 50%;
  background: #fff3d2;
  color: #e7a21b;
  font-size: 24px;
  font-weight: 900;
}

.simulation-new-modal h2 { font-size: 19px; }
.simulation-new-modal p { margin-top: 12px; color: #737a87; font-size: 12px; line-height: 1.65; }
.simulation-new-modal section > div { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 24px; }

.simulation-new-modal section > div button {
  min-height: 48px;
  border-radius: 12px;
  background: #f2f3f6;
  color: #666d78;
  font-size: 14px;
  font-weight: 800;
}

.simulation-new-modal section > div button:last-child { background: #ffeca4; color: #222; }

@media (min-width: 768px) {
  .simulation-edit-page { width: min(100%, 1066px); padding: 28px 0 80px; }
  .simulation-edit-intro h1 { font-size: 28px; }
  .simulation-edit-period h2, .simulation-edit-status > h2 { font-size: 20px; }
  .simulation-edit-period > p { font-size: 13px; }
  .simulation-edit-period__grid { max-width: 680px; }
  .simulation-edit-period__grid label { padding: 18px 22px; }
  .simulation-edit-period__grid label > span { font-size: 12px; }
  .simulation-edit-period__grid input { font-size: 19px; }
  .simulation-edit-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .simulation-edit-card { min-height: 178px; grid-template-columns: 1fr; align-content: start; }
  .simulation-edit-card em, .simulation-edit-card > strong, .simulation-edit-card > b { justify-self: start; grid-column: 1; }
  .simulation-edit-card small { min-height: 34px; font-size: 12px; }
  .simulation-edit-forecast { max-width: 680px; margin-right: auto; margin-left: auto; }
  .simulation-edit-forecast strong { font-size: 42px; }
  .simulation-edit-benefit { max-width: 680px; margin-right: auto; margin-left: auto; }
  .simulation-edit-all { display: block; width: min(100%, 520px); margin-right: auto; margin-left: auto; }
  .simulation-create-new { display: block; width: min(100%, 520px); margin-right: auto; margin-left: auto; }
  .simulation-new-modal h2 { font-size: 21px; }
  .simulation-new-modal p { font-size: 14px; }
}
</style>
