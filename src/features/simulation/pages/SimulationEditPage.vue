<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatPrepMonthsWithUnit, isInfinitePrepMonths } from '@/utils/prepMonths'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const simulation = useSimulationStore()
simulation.clearSyncError()
const toDateInputValue = (value) => {
  const match = String(value || '')
    .trim()
    .match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : ''
}
const startDate = ref(toDateInputValue(simulation.state.startDate))
const endDate = ref(toDateInputValue(simulation.state.endDate))
const periodError = ref('')
const periodSaving = ref(false)
const periodEditing = ref(false)
const showNewSimulationModal = ref(false)

const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const compactWon = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  return `${money(amount)}원`
}
const recurringBenefit = computed(() => simulation.recurringIncome + simulation.recurringPolicy)
const oneTimeBenefit = computed(() => simulation.oneTimeIncome + simulation.oneTimePolicy)
const benefitLine = (recurring, oneTime, emptyText) => {
  const parts = []
  if (Number(recurring) > 0) parts.push(`월 ${compactWon(recurring)}`)
  if (Number(oneTime) > 0) parts.push(`일시 ${compactWon(oneTime)}`)
  return parts.join(' · ') || emptyText
}
const incomeBenefitLine = computed(() =>
  benefitLine(simulation.recurringIncome, simulation.oneTimeIncome, '월 0원 추가 수입'),
)
const policyBenefitLine = computed(() =>
  benefitLine(simulation.recurringPolicy, simulation.oneTimePolicy, '일시 0원 지원'),
)
const currentMonthsLabel = computed(() => formatPrepMonthsWithUnit(simulation.currentMonths))
const expectedMonthsLabel = computed(() => formatPrepMonthsWithUnit(simulation.expectedMonths))
const addedMonthsLabel = computed(() =>
  isInfinitePrepMonths(simulation.expectedMonths)
    ? '∞ 연장'
    : `+${simulation.addedMonths}개월`,
)

onMounted(async () => {
  await simulation.hydrateRunwayBaseline()
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
  if (periodSaving.value) return
  if (!startDate.value || !endDate.value) return
  if (endDate.value <= startDate.value) {
    periodError.value = '종료일은 시작일보다 뒤여야 해요.'
    return
  }

  const previousStartDate = toDateInputValue(simulation.state.startDate)
  const previousEndDate = toDateInputValue(simulation.state.endDate)
  periodError.value = ''
  periodSaving.value = true

  try {
    if (simulation.state.confirmed) {
      const reverted = await simulation.revertConfirmedScenario()
      if (!reverted) {
        periodError.value = simulation.syncError || '시뮬레이션을 수정 상태로 전환하지 못했습니다.'
        return
      }
    }

    const saved = await simulation.savePeriod(startDate.value, endDate.value)
    if (!saved) {
      simulation.state.startDate = previousStartDate
      simulation.state.endDate = previousEndDate
      startDate.value = previousStartDate
      endDate.value = previousEndDate
      periodError.value = simulation.syncError || '시뮬레이션 기간을 저장하지 못했습니다.'
    } else {
      periodEditing.value = false
    }
  } finally {
    periodSaving.value = false
  }
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
    <button
      class="sim-back simulation-back-button desktop-only"
      type="button"
      aria-label="뒤로가기"
      @click="router.push('/simulation')"
    >
      <AppIcon name="chevron-left" :size="22" />
    </button>

    <article class="simulation-edit-shell">
      <header class="simulation-edit-hero">
        <div>
          <span>시뮬레이션 수정</span>
          <h1>현재 계획을 확인하고 수정해보세요</h1>
        </div>

        <section class="simulation-edit-period" aria-label="시뮬레이션 기간">
          <label>
            <span>시작일</span>
            <input
              v-if="periodEditing"
              v-model="startDate"
              type="date"
              aria-label="시뮬레이션 시작일"
              :disabled="periodSaving"
            />
            <strong v-else>{{ startDate }}</strong>
          </label>
          <i>–</i>
          <label>
            <span>종료일 (목표 취업일)</span>
            <input
              v-if="periodEditing"
              v-model="endDate"
              type="date"
              aria-label="시뮬레이션 종료일"
              :disabled="periodSaving"
            />
            <strong v-else>{{ endDate }}</strong>
          </label>
          <button
            type="button"
            :disabled="periodSaving"
            @click="periodEditing ? updatePeriod() : (periodEditing = true)"
          >
            {{ periodSaving ? '저장 중' : periodEditing ? '저장' : '변경' }}
          </button>
        </section>
      </header>

      <div class="simulation-edit-body">
        <section class="simulation-edit-forecast">
          <div class="simulation-edit-runway current">
            <span>현재 버티는 기간</span>
            <strong>{{ currentMonthsLabel }}</strong>
          </div>
          <div class="simulation-edit-growth" aria-label="증가 기간">
            <b>{{ addedMonthsLabel }}</b>
            <i><AppIcon name="arrow-right" :size="18" /></i>
          </div>
          <div class="simulation-edit-runway expected">
            <span>예상 버티는 기간</span>
            <strong>{{ expectedMonthsLabel }}</strong>
          </div>
          <div class="simulation-edit-actions">
            <p>
              반영 혜택 월 {{ compactWon(recurringBenefit)
              }}<template v-if="oneTimeBenefit"> · 일시 {{ compactWon(oneTimeBenefit) }}</template>
            </p>
            <div>
              <button
                class="simulation-edit-all simulation-primary-cta"
                type="button"
                @click="editCategory('expense')"
              >
                시뮬레이션 전체 수정하기
              </button>
              <button
                class="simulation-create-new"
                type="button"
                @click="showNewSimulationModal = true"
              >
                새로 만들기
              </button>
            </div>
          </div>
        </section>

        <section class="simulation-edit-status">
          <h2>시뮬레이션 현황</h2>
          <div class="simulation-edit-cards">
            <article class="simulation-edit-card expense">
              <span class="simulation-edit-card__title"><i />지출 줄이기</span>
              <strong>월 {{ compactWon(simulation.expenseSaving) }} 절약</strong>
              <button type="button" @click="editCategory('expense')">
                수정하기 <span>→</span>
              </button>
            </article>

            <article class="simulation-edit-card income">
              <span class="simulation-edit-card__title"><i />수입 늘리기</span>
              <strong class="simulation-edit-card__benefit-line">{{ incomeBenefitLine }}</strong>
              <button type="button" @click="editCategory('income')">수정하기 <span>→</span></button>
            </article>

            <article class="simulation-edit-card policy">
              <span class="simulation-edit-card__title"><i />정책 혜택</span>
              <strong class="simulation-edit-card__benefit-line">{{ policyBenefitLine }}</strong>
              <button type="button" @click="editCategory('policy')">수정하기 <span>→</span></button>
            </article>
          </div>
        </section>

        <div class="simulation-edit-desktop-actions">
          <button
            class="simulation-create-new"
            type="button"
            @click="showNewSimulationModal = true"
          >
            새 시뮬레이션 만들기
          </button>
          <button
            class="simulation-edit-all simulation-primary-cta"
            type="button"
            @click="editCategory('expense')"
          >
            시뮬레이션 전체 수정하기
          </button>
        </div>

        <div class="simulation-edit-mobile-actions">
          <button
            class="simulation-edit-all simulation-primary-cta"
            type="button"
            @click="editCategory('expense')"
          >
            시뮬레이션 전체 수정하기
          </button>
          <button
            class="simulation-create-new"
            type="button"
            @click="showNewSimulationModal = true"
          >
            새 시뮬레이션 만들기
          </button>
        </div>

        <p v-if="periodSaving" class="api-notice">시뮬레이션 기간을 저장하고 있어요.</p>
        <p v-if="periodError" class="form-error">{{ periodError }}</p>
        <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
      </div>
    </article>

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
        <p>
          새 시뮬레이션을 생성하면 현재 수정 중인 시뮬레이션이 삭제됩니다.<br />그래도 다시
          생성하시겠습니까?
        </p>
        <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
        <div>
          <button
            type="button"
            :disabled="simulation.syncing"
            @click="showNewSimulationModal = false"
          >
            취소
          </button>
          <button
            class="simulation-primary-cta"
            type="button"
            :disabled="simulation.syncing"
            @click="createNewSimulation"
          >
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
  padding: 4px 18px 0;
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

.simulation-edit-period,
.simulation-edit-status {
  margin-top: 24px;
}
.simulation-edit-period {
  background: transparent;
}
:global(#app .app-shell .sim-page section.simulation-edit-period) {
  border: 0 !important;
  border-radius: 0 !important;
  background: var(--background) !important;
  box-shadow: none !important;
}
.simulation-edit-period h2,
.simulation-edit-status > h2 {
  font-size: 17px;
}
.simulation-edit-period > p {
  margin-top: 5px;
  color: #858c99;
  font-size: 11px;
}

.simulation-edit-period__grid {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 14px 1fr;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
}

.simulation-edit-period__grid label {
  position: relative;
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 10px 14px;
  border: 1px solid #dff0e9;
  border-radius: 14px;
  background: #f3fcf8;
  box-shadow: 0 2px 5px rgb(20 40 30 / 9%);
}

.simulation-edit-period__grid label > span {
  color: #858c99;
  font-size: 10px;
  line-height: 1.2;
}
.simulation-edit-period__grid input {
  width: 100%;
  min-width: 0;
  height: 24px;
  padding: 0;
  border: 0;
  outline: 0;
  background: #f3fcf8;
  color: #222;
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  font-weight: 800;
}

.simulation-edit-period__grid input:disabled {
  background: #f3fcf8;
  opacity: 1;
}

:global(#app .app-shell .simulation-edit-page .simulation-edit-period__grid input[type='date']),
:global(
  #app .app-shell .simulation-edit-page .simulation-edit-period__grid input[type='date']:hover
),
:global(
  #app .app-shell .simulation-edit-page .simulation-edit-period__grid input[type='date']:focus
),
:global(
  #app .app-shell .simulation-edit-page .simulation-edit-period__grid input[type='date']:active
),
:global(
  #app .app-shell .simulation-edit-page .simulation-edit-period__grid input[type='date']:disabled
) {
  border: 0 !important;
  border-radius: 0 !important;
  background: #f3fcf8 !important;
  background-color: #f3fcf8 !important;
  background-image: none !important;
  box-shadow: none !important;
  opacity: 1;
  color-scheme: light;
}

.simulation-edit-period__grid input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.72;
}
.simulation-edit-period__grid > i {
  color: #555;
  font-size: 12px;
  font-style: normal;
  text-align: center;
}
.simulation-edit-period .form-error {
  color: #d94f55;
}
.simulation-edit-cards {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

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

.simulation-edit-card__title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
}
.simulation-edit-card__title i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef5757;
}
.simulation-edit-card em {
  align-self: center;
  color: #ef5757;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}
.simulation-edit-card > strong {
  justify-self: end;
  font-size: 16px;
}
.simulation-edit-card > b {
  grid-column: 2;
  justify-self: end;
  color: #777;
  font-size: 11px;
}
.simulation-edit-card.income .simulation-edit-card__title i {
  background: #3ed19a;
}
.simulation-edit-card.income em {
  color: #31bd88;
}
.simulation-edit-card.policy .simulation-edit-card__title i {
  background: #8d77cf;
}
.simulation-edit-card.policy em {
  color: #8d77cf;
}

.simulation-edit-forecast {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 15px;
  background: #fff;
}

.simulation-edit-forecast > div {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 19px 23px;
  background: transparent;
}
.simulation-edit-forecast span {
  color: #666d78;
  font-size: 12px;
  font-weight: 500;
}
.simulation-edit-forecast strong {
  font-size: 34px;
}
.simulation-edit-forecast strong small {
  margin-left: 2px;
  font-size: 13px;
}
.simulation-edit-increase,
.simulation-edit-benefit {
  margin: 0;
  padding: 14px 20px;
  border-top: 1px solid #e2e3e6;
  background: #fff;
  color: #62483b;
  font-size: 13px;
  font-weight: 600;
}
.simulation-edit-benefit {
  text-align: left;
}
.simulation-edit-increase {
  grid-column: 1;
}
.simulation-edit-benefit {
  grid-column: 2;
}
:global(#app .app-shell .simulation-edit-page .simulation-edit-forecast .simulation-edit-benefit) {
  font-size: 13px !important;
  font-weight: 600;
}
.simulation-edit-all {
  display: flex;
  width: 100%;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  font-size: 16px;
  text-align: center;
}

.simulation-create-new {
  display: flex;
  width: 100%;
  min-height: 54px;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  border: 1px solid #e1e1e1;
  border-radius: 13px;
  background: #fff;
  color: #666;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 2px 5px rgb(20 30 60 / 9%);
  text-align: center;
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
  background: #fff8dc;
  color: #e7a21b;
  font-size: 24px;
  font-weight: 900;
}

.simulation-new-modal h2 {
  font-size: 19px;
}
.simulation-new-modal p {
  margin-top: 12px;
  color: #737a87;
  font-size: 12px;
  line-height: 1.65;
}
.simulation-new-modal section > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 24px;
}

.simulation-new-modal section > div button {
  min-height: 48px;
  border-radius: 12px;
  background: #f2f3f6;
  color: #666d78;
  font-size: 14px;
  font-weight: 800;
}

.simulation-new-modal section > div button:last-child {
  background: #ffeca4;
  color: #222;
}

@media (max-width: 767px) {
  .simulation-edit-intro h1 {
    font-size: 18px !important;
    font-weight: 800;
    line-height: 1.5;
  }

  .simulation-edit-period h2,
  .simulation-edit-status > h2 {
    font-size: 16px;
    font-weight: 800;
  }

  .simulation-edit-period > p,
  .simulation-edit-card small,
  .simulation-new-modal p {
    font-size: 12px;
    font-weight: 400;
  }

  .simulation-edit-period__grid label > span,
  .simulation-edit-forecast span {
    font-size: 12px;
    font-weight: 700;
  }

  .simulation-edit-period__grid input {
    font-size: 14px;
    font-weight: 700;
  }

  .simulation-edit-card__title,
  .simulation-edit-card > strong {
    font-size: 14px;
    font-weight: 800;
  }

  .simulation-edit-card em {
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }

  .simulation-edit-card > b {
    font-size: 12px;
    font-weight: 600;
  }

  .simulation-edit-forecast > div {
    min-width: 0;
    grid-template-rows: auto auto;
    align-content: start;
    padding: 18px 16px;
  }

  .simulation-edit-forecast strong {
    display: flex;
    min-width: 0;
    align-items: baseline;
    gap: 2px;
    font-size: 25px;
    font-weight: 800;
    line-height: 1.15;
    white-space: nowrap;
  }

  .simulation-edit-forecast strong small {
    flex: none;
    font-size: 14px;
    font-weight: 600;
  }

  .simulation-edit-increase,
  .simulation-edit-benefit {
    font-size: 13px;
    font-weight: 600;
  }

  .simulation-edit-increase {
    text-align: left;
  }
  .simulation-edit-benefit {
    text-align: left;
  }

  .simulation-edit-all,
  .simulation-new-modal section > div button {
    font-size: var(--type-action-size) !important;
    font-weight: var(--type-action-weight) !important;
  }

  .simulation-create-new {
    font-size: var(--type-action-size) !important;
    font-weight: var(--type-action-secondary-weight) !important;
  }
}

@media (max-width: 430px) {
  .simulation-edit-period__grid {
    grid-template-columns: minmax(0, 1fr) 10px minmax(0, 1fr);
    gap: 4px;
  }

  .simulation-edit-period__grid > i {
    display: block;
    font-size: 11px;
  }

  .simulation-edit-period__grid label {
    gap: 2px;
    padding: 8px;
  }

  .simulation-edit-period__grid label > span {
    font-size: 12px;
    font-weight: 600;
  }

  .simulation-edit-period__grid input {
    height: 22px;
    font-size: 14px;
    font-weight: 700;
  }
}

@media (min-width: 768px) {
  .simulation-edit-page {
    width: min(100%, 1066px);
    padding: 28px 0 80px;
  }
  .simulation-edit-shell,
  :global(#app .app-shell main .simulation-edit-shell) {
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .simulation-edit-hero,
  :global(#app .app-shell main .simulation-edit-hero) {
    padding: 6px 0 24px !important;
    background: transparent !important;
  }
  .simulation-edit-body,
  :global(#app .app-shell main .simulation-edit-body) {
    padding: 0 0 32px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .simulation-edit-intro h1 {
    font-size: 28px;
  }
  .simulation-edit-period h2,
  .simulation-edit-status > h2 {
    font-size: 20px;
  }
  .simulation-edit-period > p {
    font-size: 13px;
  }
  .simulation-edit-period__grid {
    width: 100%;
    max-width: none;
    margin-right: auto;
    margin-left: auto;
  }
  .simulation-edit-period__grid label {
    padding: 12px 16px;
  }
  .simulation-edit-period__grid label > span {
    font-size: 12px;
  }
  .simulation-edit-period__grid input {
    height: 26px;
    font-size: 17px;
  }
  .simulation-edit-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .simulation-edit-card {
    min-height: 178px;
    grid-template-columns: 1fr;
    align-content: start;
  }
  .simulation-edit-card em,
  .simulation-edit-card > strong,
  .simulation-edit-card > b {
    justify-self: start;
    grid-column: 1;
  }
  .simulation-edit-forecast {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
  }
  .simulation-edit-forecast strong {
    font-size: 42px;
  }
  .simulation-edit-all,
  .simulation-create-new {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
  }
  .simulation-new-modal h2 {
    font-size: 21px;
  }
  .simulation-new-modal p {
    font-size: 14px;
  }
  .simulation-edit-actions > div {
    display: none !important;
  }
  .simulation-edit-desktop-actions {
    display: flex !important;
    width: 100%;
    gap: 12px;
    margin-top: 14px;
  }
  .simulation-edit-desktop-actions .simulation-edit-all,
  .simulation-edit-desktop-actions .simulation-create-new {
    width: auto;
    flex: 1 1 0;
    min-height: 50px;
    height: 50px;
    margin: 0;
    font-size: 17px;
  }
  .simulation-edit-forecast {
    grid-template-columns: minmax(0, 1fr) 76px minmax(0, 1fr) !important;
    grid-template-rows: auto auto !important;
  }
  .simulation-edit-runway.expected {
    justify-items: end;
    text-align: right;
  }
  .simulation-edit-growth {
    grid-row: 1;
    grid-column: 2;
    justify-self: center;
    align-self: center;
  }
  .simulation-edit-actions {
    grid-row: 2;
    grid-column: 1 / -1 !important;
    justify-items: center !important;
    width: auto !important;
    padding: 0 !important;
  }
  .simulation-edit-actions p {
    text-align: center;
  }
}

/* 7a 계획 확인·수정 화면 */
.simulation-edit-page {
  width: min(100%, 1052px);
  margin: 0 auto;
  padding: 28px 0 80px;
  color: var(--text);
}

.simulation-edit-page > .sim-back {
  margin: 0 0 18px;
}
.simulation-edit-shell {
  overflow: hidden;
  border: 1px solid rgb(10 22 128 / 12%);
  border-radius: 24px;
  background: #fff;
  box-shadow:
    0 1px 2px rgb(10 22 128 / 5%),
    0 12px 32px rgb(10 22 128 / 5%);
}
.simulation-edit-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 32px;
  background: #fff8dc;
}
.simulation-edit-hero > div {
  display: grid;
  gap: 8px;
}
.simulation-edit-hero > div > span {
  color: #a2905f;
  font-size: 12px;
  font-weight: 600;
}
.simulation-edit-hero h1,
:global(#app .app-shell main .simulation-edit-hero h1) {
  color: #222222 !important;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.6px;
  line-height: 1.35;
}

.simulation-edit-period {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 12px 16px;
  border: 0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 3px rgb(10 22 128 / 8%);
}
:global(#app .app-shell .sim-page section.simulation-edit-period) {
  border-radius: 14px !important;
  background: #fff !important;
  box-shadow: 0 1px 3px rgb(10 22 128 / 8%) !important;
}
.simulation-edit-period label {
  display: grid;
  width: 108px;
  min-width: 108px;
  gap: 2px;
}
.simulation-edit-period label:nth-of-type(2) {
  width: 148px;
  min-width: 148px;
}
.simulation-edit-period label > span {
  color: #a2905f;
  font-size: 10px;
  font-weight: 600;
}
.simulation-edit-period label > strong,
.simulation-edit-period input {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 22px;
  min-height: 22px;
  margin: 0;
  padding: 0 20px 0 0;
  border: 0;
  overflow: hidden;
  background: transparent;
  color: var(--text);
  font-size: 13px !important;
  font-weight: 700;
  line-height: 22px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.simulation-edit-period input {
  position: relative;
  -webkit-appearance: none;
  appearance: none;
  outline: 0;
}
.simulation-edit-period input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 50%;
  right: 2px;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  margin: 0;
  padding: 0;
  cursor: pointer;
  opacity: 0.72;
  transform: translateY(-50%);
}
.simulation-edit-period input::-webkit-datetime-edit {
  padding: 0;
}
.simulation-edit-period > i {
  color: #7e7565;
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}
.simulation-edit-period button {
  min-height: 30px;
  margin-left: 6px;
  padding: 0 10px;
  border-radius: 8px;
  background: #fff8dc;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.simulation-edit-body {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 22px 32px 28px;
}
.simulation-edit-forecast {
  display: grid;
  width: 100%;
  grid-template-columns: auto 76px auto minmax(310px, 1fr);
  align-items: center;
  gap: 24px;
  margin: 0;
  padding: 20px 24px;
  overflow: visible;
  border-radius: 18px;
  background: #fff8dc;
}
.simulation-edit-runway {
  display: grid;
  gap: 5px;
  padding: 0;
  background: transparent;
}
.simulation-edit-runway > span {
  color: #a2905f;
  font-size: 12px;
  font-weight: 600;
}
.simulation-edit-runway.expected > span {
  color: var(--primary);
}
.simulation-edit-runway > strong {
  color: #7e7565;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
  white-space: nowrap;
}
.simulation-edit-runway.expected > strong {
  color: #1e1809;
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -1.5px;
}
.simulation-edit-runway > strong small {
  margin-left: 2px;
  font-size: 15px;
  font-weight: inherit;
}
.simulation-edit-runway.expected > strong small {
  font-size: 20px;
}
.simulation-edit-growth {
  display: grid;
  justify-items: center;
  gap: 6px;
}
.simulation-edit-growth b {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.simulation-edit-growth i {
  position: relative;
  width: 70px;
  border-top: 1.5px dashed rgb(60 48 20 / 20%);
}
.simulation-edit-growth i .app-icon {
  display: none;
}
.simulation-edit-growth i::after {
  position: absolute;
  top: -5px;
  right: -1px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid rgb(60 48 20 / 28%);
  content: '';
}
.simulation-edit-actions {
  display: grid;
  justify-items: end;
  gap: 8px;
}
.simulation-edit-actions p {
  color: #8a8172;
  font-size: 12px;
  font-weight: 500;
  text-align: right;
}
.simulation-edit-actions > div {
  display: flex;
  gap: 8px;
}
.simulation-edit-all,
.simulation-create-new {
  width: auto;
  min-height: 44px;
  margin: 0;
  padding: 0 18px;
  border-radius: 12px;
  box-shadow: none;
  font-size: var(--type-action-size);
}
.simulation-edit-all {
  font-weight: var(--type-action-weight);
}
.simulation-create-new {
  font-weight: var(--type-action-secondary-weight);
}
.simulation-edit-all {
  border: 0;
  background: #fbedb0;
  color: #0a1680;
}
.simulation-create-new {
  padding: 0 16px;
  border: 1px solid #e1e1e1;
  background: #fff;
  color: #666;
}

.simulation-edit-status {
  margin: 0;
}
.simulation-edit-status > h2 {
  margin-bottom: 10px;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}
.simulation-edit-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
}
.simulation-edit-card {
  display: flex;
  min-height: 118px;
  flex-direction: column;
  align-content: initial;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgb(10 22 128 / 12%);
  border-radius: 16px;
  background: #fff;
  color: var(--text);
}
.simulation-edit-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}
.simulation-edit-card__title i {
  width: 8px;
  height: 8px;
}
.simulation-edit-card.expense .simulation-edit-card__title i {
  background: #e5877c;
}
.simulation-edit-card.income .simulation-edit-card__title i {
  background: #7fb894;
}
.simulation-edit-card.policy .simulation-edit-card__title i {
  background: #9b8cc4;
}
.simulation-edit-card > strong {
  justify-self: auto;
  color: #7e7565;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}
.simulation-edit-card > strong.simulation-edit-card__benefit-line {
  max-width: 100%;
  font-size: clamp(10px, 3.2vw, 15px);
  letter-spacing: -0.25px;
  white-space: nowrap;
}
.simulation-edit-card > b {
  margin-top: -7px;
  color: #8a8172;
  font-size: 11px;
  font-weight: 600;
}
.simulation-edit-card > button {
  display: flex;
  width: 100%;
  min-height: 26px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: auto;
  padding-top: 0;
  padding-bottom: 0;
  border: 1px solid rgb(241 185 76 / 40%);
  border-radius: 8px;
  background: #fff8dc;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}
.simulation-edit-card > button:hover {
  background: #fbe6ac;
}
.simulation-edit-body > .api-notice,
.simulation-edit-body > .form-error {
  margin: -10px 0 0;
  font-size: 12px;
}

:global(#app .app-shell .simulation-edit-page .simulation-edit-hero h1) {
  font-size: var(--type-page-title-size) !important;
}
:global(#app .app-shell .simulation-edit-page .simulation-edit-period button) {
  font-size: var(--type-button-small-size) !important;
  font-weight: var(--type-button-small-weight) !important;
}
:global(#app .app-shell .simulation-edit-page .simulation-edit-card > button) {
  font-size: var(--type-button-small-size) !important;
  font-weight: 700 !important;
}
:global(
  #app .app-shell .simulation-edit-page .simulation-edit-actions button:not(.simulation-primary-cta):not(.simulation-create-new)
) {
  font-size: var(--type-button-small-size) !important;
  font-weight: var(--type-button-small-weight) !important;
}

@media (max-width: 767px) {
  .simulation-edit-page {
    width: 100%;
    padding: 10px 12px 28px;
  }
  .simulation-edit-shell {
    border-radius: 20px;
  }
  .simulation-edit-hero {
    display: grid;
    align-items: stretch;
    gap: 18px;
    padding: 22px 18px 18px;
  }
  .simulation-edit-hero h1 {
    font-size: var(--type-page-title-size);
  }
  :global(#app .app-shell .simulation-edit-page .simulation-edit-hero h1) {
    font-size: var(--type-page-title-size) !important;
  }
  .simulation-edit-period {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr);
    gap: 6px;
    padding: 11px 12px;
  }
  .simulation-edit-period label,
  .simulation-edit-period label:nth-of-type(2) {
    width: auto;
    min-width: 0;
  }
  .simulation-edit-period input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding-right: 18px;
    font-size: 12px !important;
  }
  .simulation-edit-period button {
    grid-column: 1 / -1;
    width: 100%;
    margin: 4px 0 0;
  }
  .simulation-edit-body {
    gap: 20px;
    padding: 16px 14px 20px;
  }
  .simulation-edit-forecast {
    grid-template-columns: minmax(0, 1fr) 58px minmax(0, 1.2fr);
    gap: 10px;
    padding: 17px 14px 14px;
  }
  .simulation-edit-runway > strong {
    font-size: 25px;
  }
  .simulation-edit-runway.expected > strong {
    font-size: 34px;
  }
  .simulation-edit-runway > strong small {
    font-size: 13px;
  }
  .simulation-edit-runway.expected > strong small {
    font-size: 16px;
  }
  .simulation-edit-growth i {
    width: 52px;
  }
  .simulation-edit-actions {
    grid-column: 1 / -1;
    justify-items: stretch;
    padding-top: 4px;
  }
  .simulation-edit-actions p {
    text-align: left;
  }
  .simulation-edit-actions > div {
    display: grid;
    grid-template-columns: 1fr auto;
  }
  .simulation-edit-all,
  .simulation-create-new {
    min-height: 42px;
    padding: 0 12px;
  }
  .simulation-edit-cards {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .simulation-edit-card {
    min-height: 0;
    gap: 10px;
    padding: 14px;
  }
  .simulation-edit-card > strong {
    font-size: 15px;
  }
}

@media (max-width: 390px) {
  .simulation-edit-actions > div {
    grid-template-columns: 1fr;
  }
  .simulation-create-new {
    width: 100%;
  }
}

.simulation-edit-mobile-actions {
  display: none;
}

.simulation-edit-desktop-actions {
  display: none;
}

@media (max-width: 767px) {
  :global(#app .app-shell__body:has(.simulation-edit-page)),
  :global(#app .app-shell__content:has(.simulation-edit-page)) {
    background: #fff;
  }

  .simulation-edit-page {
    width: 100%;
    padding: 10px 0 28px;
    background: #fff;
  }
  .simulation-edit-shell {
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: #fff;
    box-shadow: none;
  }
  .simulation-edit-hero {
    gap: 16px;
    padding: 19px 16px 16px;
    border-radius: 0;
    background: #fff;
  }
  .simulation-edit-hero > div {
    gap: 6px;
  }

  .simulation-edit-period {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) auto;
    justify-self: stretch;
    gap: 6px;
    margin: 2px auto 0;
    padding: 10px 12px;
    border: 1px solid #eee4c9;
    box-shadow: 0 1px 3px rgb(10 22 128 / 6%);
  }
  .simulation-edit-period button {
    width: auto;
    min-height: 30px;
    grid-column: auto;
    margin: 0;
    padding: 0 10px;
  }

  .simulation-edit-body {
    gap: 16px;
    padding: 16px;
    border: 0;
    border-radius: 0;
    background: #fff;
    box-shadow: none;
  }

  .simulation-edit-status,
  .simulation-edit-mobile-actions {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .simulation-edit-forecast {
    position: relative;
    grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 14px 8px;
    padding: 15px 16px 13px;
  }
  .simulation-edit-forecast > .simulation-edit-runway {
    align-self: center;
    padding: 0;
  }
  .simulation-edit-runway.expected {
    justify-items: end;
    text-align: right;
  }
  .simulation-edit-forecast > .simulation-edit-growth {
    display: contents;
  }
  .simulation-edit-growth i {
    display: grid;
    width: 100%;
    grid-row: 1;
    grid-column: 2;
    align-self: center;
    justify-self: center;
    place-items: center;
    border-top: 0;
  }
  .simulation-edit-growth i::after {
    content: none;
  }
  .simulation-edit-growth i .app-icon {
    display: block;
    width: 18px;
    height: 18px;
    margin: 0 auto;
    color: var(--primary);
  }
  .simulation-edit-growth b {
    grid-row: 2;
    grid-column: 1;
    align-self: end;
    justify-self: start;
    padding: 3px 9px;
  }
  .simulation-edit-forecast > .simulation-edit-actions {
    grid-row: 2;
    grid-column: 2 / 4;
    align-self: center;
    justify-items: end;
    gap: 0;
    padding: 10px 0 0;
    border-top: 0;
  }
  .simulation-edit-actions p {
    font-size: 11px;
    text-align: right;
  }
  .simulation-edit-actions > div {
    display: none;
  }

  .simulation-edit-cards {
    gap: 10px;
  }
  .simulation-edit-card {
    display: grid;
    min-height: 62px;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 3px 10px;
    padding: 12px;
  }
  .simulation-edit-card__title {
    grid-row: 1;
    grid-column: 1;
  }
  .simulation-edit-card > strong {
    grid-row: 2;
    grid-column: 1;
    align-self: start;
    font-size: 14px;
  }
  .simulation-edit-card > b {
    grid-row: 3;
    grid-column: 1;
    margin: 0;
  }
  .simulation-edit-card > button {
    width: auto;
    min-width: 82px;
    min-height: 36px;
    grid-row: 1 / 4;
    grid-column: 2;
    align-self: center;
    margin: 0;
    padding: 0 12px;
  }

  .simulation-edit-mobile-actions {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .simulation-edit-mobile-actions .simulation-edit-all,
  .simulation-edit-mobile-actions .simulation-create-new {
    width: 100%;
    max-width: none;
    min-height: 44px;
    margin: 0;
    padding: 0 12px;
    font-size: var(--type-action-size) !important;
  }

  .simulation-edit-mobile-actions .simulation-edit-all {
    font-weight: var(--type-action-weight) !important;
  }

  .simulation-edit-mobile-actions .simulation-create-new {
    font-weight: var(--type-action-secondary-weight) !important;
  }
}

@media (max-width: 390px) {
  .simulation-edit-period {
    grid-template-columns: minmax(0, 1fr) 10px minmax(0, 1fr) auto;
  }
}

:global(#app .app-shell .simulation-edit-page .simulation-edit-period label) {
  background: #fff !important;
  background-color: #fff !important;
}

:global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']),
:global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:hover),
:global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:focus),
:global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:active),
:global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:disabled) {
  border: 0 !important;
  background: #fff !important;
  background-color: #fff !important;
  background-image: none !important;
  box-shadow: none !important;
  filter: none !important;
  opacity: 1 !important;
  color-scheme: light;
  -webkit-text-fill-color: var(--text);
  font-size: 13px !important;
}

@media (max-width: 767px) {
  :global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']),
  :global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:hover),
  :global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:focus),
  :global(#app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:active),
  :global(
    #app .app-shell .simulation-edit-page .simulation-edit-period input[type='date']:disabled
  ) {
    font-size: 12px !important;
  }
}

:global(
  #app
    .app-shell
    .simulation-edit-page
    .simulation-edit-period
    input[type='date']::-webkit-datetime-edit
),
:global(
  #app
    .app-shell
    .simulation-edit-page
    .simulation-edit-period
    input[type='date']::-webkit-datetime-edit-fields-wrapper
),
:global(
  #app
    .app-shell
    .simulation-edit-page
    .simulation-edit-period
    input[type='date']::-webkit-datetime-edit-text
),
:global(
  #app
    .app-shell
    .simulation-edit-page
    .simulation-edit-period
    input[type='date']::-webkit-datetime-edit-year-field
),
:global(
  #app
    .app-shell
    .simulation-edit-page
    .simulation-edit-period
    input[type='date']::-webkit-datetime-edit-month-field
),
:global(
  #app
    .app-shell
    .simulation-edit-page
    .simulation-edit-period
    input[type='date']::-webkit-datetime-edit-day-field
) {
  background: #fff !important;
  background-color: #fff !important;
}

/* 화면 폭이 줄어들 때 각 영역의 고정 크기가 부모 박스를 밀어내지 않도록 한다. */
.simulation-edit-page,
.simulation-edit-shell,
.simulation-edit-hero,
.simulation-edit-hero > div,
.simulation-edit-body,
.simulation-edit-period,
.simulation-edit-forecast,
.simulation-edit-runway,
.simulation-edit-actions,
.simulation-edit-status,
.simulation-edit-card,
.simulation-edit-card__title {
  min-width: 0;
  box-sizing: border-box;
}

.simulation-edit-hero h1,
.simulation-edit-actions p,
.simulation-edit-card__title,
.simulation-edit-card > strong,
.simulation-edit-card > b {
  overflow-wrap: anywhere;
}

@media (min-width: 768px) and (max-width: 960px) {
  .simulation-edit-page {
    padding-right: 20px;
    padding-left: 20px;
  }

  .simulation-edit-hero {
    display: grid;
    align-items: stretch;
  }

  .simulation-edit-period {
    width: 100%;
    justify-content: center;
  }

  .simulation-edit-forecast {
    grid-template-columns: minmax(110px, 1fr) 64px minmax(130px, 1fr);
    grid-template-rows: auto auto;
    gap: 16px;
  }

  .simulation-edit-runway.expected {
    justify-items: end;
    text-align: right;
  }

  .simulation-edit-growth {
    grid-row: 1;
    grid-column: 2;
    justify-self: center;
    align-self: center;
  }

  .simulation-edit-forecast > .simulation-edit-actions {
    grid-row: 2;
    grid-column: 1 / -1;
    justify-items: center;
    padding: 0;
  }

  .simulation-edit-actions p {
    text-align: center;
  }

  .simulation-edit-actions > div {
    display: none;
  }

  .simulation-edit-all,
  .simulation-create-new {
    width: 100%;
  }

  .simulation-edit-desktop-actions {
    display: flex;
    width: 100%;
    gap: 12px;
    margin-top: 14px;
  }
  .simulation-edit-desktop-actions .simulation-edit-all,
  .simulation-edit-desktop-actions .simulation-create-new {
    flex: 1 1 0;
    min-height: 50px;
    height: 50px;
    font-size: 17px;
  }
}

@media (max-width: 520px) {
  .simulation-edit-period {
    grid-template-columns: minmax(0, 1fr) 10px minmax(0, 1fr) auto;
    gap: 5px;
  }

  .simulation-edit-period button {
    width: auto;
    min-width: 46px;
    grid-column: 4;
    margin: 0;
    padding-right: 9px;
    padding-left: 9px;
  }

  .simulation-edit-period label > strong,
  .simulation-edit-period input {
    font-size: clamp(11px, 3.4vw, 13px);
  }

  .simulation-edit-forecast {
    grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr);
    padding-right: 12px;
    padding-left: 12px;
  }

  .simulation-edit-runway > strong {
    font-size: clamp(21px, 7vw, 25px);
  }

  .simulation-edit-runway.expected > strong {
    font-size: clamp(27px, 9vw, 34px);
  }

  .simulation-edit-card > button {
    min-width: 74px;
    padding-right: 9px;
    padding-left: 9px;
  }
}

/* 7d 모바일 레이아웃: 398px 기준 간격과 버튼 비율 */
@media (max-width: 767px) {
  .simulation-edit-page {
    width: 100%;
    padding: 2px 0 24px;
  }

  .simulation-edit-shell {
    overflow: hidden;
    border: 1px solid rgb(10 22 128 / 12%);
    border-radius: 22px;
    background: #fff;
    box-shadow:
      0 1px 2px rgb(10 22 128 / 5%),
      0 10px 26px rgb(10 22 128 / 5%);
  }

  .simulation-edit-hero {
    align-items: center;
    gap: 14px;
    padding: 20px 20px 18px;
    background: #fff8dc;
  }

  .simulation-edit-hero > div {
    gap: 6px;
  }

  .simulation-edit-hero h1,
  :global(#app .app-shell .simulation-edit-page .simulation-edit-hero h1) {
    font-size: var(--type-page-title-size) !important;
    letter-spacing: -0.5px;
    line-height: 1.4;
  }

  .simulation-edit-period {
    gap: 10px;
    margin-top: 0;
    padding: 11px 14px;
    border-radius: 13px;
  }

  .simulation-edit-period label > span {
    font-size: 10.5px;
  }

  .simulation-edit-period label > strong,
  .simulation-edit-period input {
    font-size: 13px;
  }

  .simulation-edit-period button {
    min-width: 0;
    min-height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 11.5px !important;
  }

  .simulation-edit-body {
    gap: 18px;
    padding: 18px 20px 20px;
  }

  .simulation-edit-forecast {
    gap: 12px 8px;
    padding: 16px 18px;
    border-radius: 16px;
  }

  .simulation-edit-runway {
    gap: 4px;
  }

  .simulation-edit-runway > span {
    font-size: 11.5px;
  }

  .simulation-edit-runway > strong {
    font-size: 22px;
  }

  .simulation-edit-runway.expected > strong {
    font-size: 32px;
  }

  .simulation-edit-runway > strong small {
    font-size: 13px;
  }

  .simulation-edit-runway.expected > strong small {
    font-size: 15px;
  }

  .simulation-edit-growth b {
    padding: 4px 10px;
    font-size: 12px;
  }

  .simulation-edit-forecast > .simulation-edit-actions {
    padding-top: 10px;
  }

  .simulation-edit-actions p {
    font-size: 7.5px;
  }

  :global(#app .app-shell main .simulation-edit-page .simulation-edit-actions p) {
    font-size: 7.5px !important;
    line-height: 1.25;
  }

  .simulation-edit-status > h2 {
    margin-bottom: 10px;
    font-size: 13.5px;
  }

  .simulation-edit-cards {
    gap: 10px;
  }

  .simulation-edit-card {
    min-height: 0;
    gap: 6px 12px;
    padding: 14px;
    border-radius: 14px;
  }

  .simulation-edit-card__title {
    gap: 7px;
    font-size: 13px;
  }

  .simulation-edit-card__title i {
    width: 8px;
    height: 8px;
  }

  .simulation-edit-card > strong {
    font-size: 15px;
    line-height: 1;
  }

  .simulation-edit-card > button {
    min-width: 0;
    min-height: 24px;
    padding: 0 13px;
    border-radius: 8px;
    font-size: 11.5px !important;
  }

  .simulation-edit-mobile-actions {
    gap: 8px;
  }

  .simulation-edit-mobile-actions .simulation-edit-all {
    min-height: 48px;
    border: 0;
    border-radius: 12px;
    font-size: var(--type-action-size) !important;
    font-weight: var(--type-action-weight) !important;
  }

  .simulation-edit-mobile-actions .simulation-create-new {
    min-height: 46px;
    border-radius: 12px;
    font-size: var(--type-action-size) !important;
    font-weight: var(--type-action-secondary-weight) !important;
  }
}

@media (max-width: 767px) {
  .simulation-edit-hero > .simulation-edit-period,
  :global(
    #app .app-shell .simulation-edit-page .simulation-edit-hero > section.simulation-edit-period
  ) {
    width: 100%;
    max-width: none;
    align-self: stretch;
    justify-self: stretch;
    margin-right: auto;
    margin-left: auto;
    box-sizing: border-box;
  }

  .simulation-edit-card > strong,
  .simulation-edit-card > strong.simulation-edit-card__benefit-line {
    font-size: 12px;
  }

  .simulation-edit-forecast {
    grid-template-columns: minmax(0, 1fr) 58px minmax(0, 1fr);
    grid-template-rows: auto auto;
    row-gap: 12px;
  }

  .simulation-edit-forecast > .simulation-edit-runway {
    grid-row: 1;
    align-self: start;
  }

  .simulation-edit-forecast > .simulation-edit-runway.current {
    grid-column: 1;
  }

  .simulation-edit-forecast > .simulation-edit-runway.expected {
    grid-column: 3;
    justify-items: end;
    text-align: right;
  }

  .simulation-edit-forecast > .simulation-edit-growth {
    position: absolute;
    top: 14px;
    left: 50%;
    display: grid;
    justify-items: center;
    gap: 4px;
    transform: translateX(-50%);
  }

  .simulation-edit-growth b {
    grid-row: 1;
    grid-column: 1;
    align-self: auto;
    justify-self: center;
  }

  .simulation-edit-growth i {
    display: grid;
    width: 48px;
    height: 18px;
    grid-row: 2;
    grid-column: 1;
    place-items: center;
  }

  .simulation-edit-growth i .app-icon {
    width: 22px;
    height: 22px;
  }

  .simulation-edit-forecast > .simulation-edit-actions {
    width: 100%;
    grid-row: 2;
    grid-column: 1 / -1;
    justify-items: center;
    padding: 0;
  }

  .simulation-edit-actions p,
  :global(#app .app-shell main .simulation-edit-page .simulation-edit-actions p) {
    width: 100%;
    font-size: 12px !important;
    font-weight: 500;
    line-height: 1.4;
    text-align: center;
  }
}

.simulation-edit-card > button {
  height: 18px;
  min-height: 18px;
  max-height: 18px;
  padding-top: 0;
  padding-bottom: 0;
  line-height: 1;
}

@media (max-width: 767px) {
  .simulation-edit-card > button {
    height: 16px;
    min-height: 16px;
    max-height: 16px;
    line-height: 1;
  }
}

/*
 * Final word on the period date field: the box (label width/height, padding,
 * icon gutter) and the text (font-size, line-height) must be byte-identical
 * whether showing the plain <strong> value or the live <input type="date">,
 * so toggling "변경/저장" changes nothing but the button label and the icon.
 * This sits last on purpose to beat the scattered breakpoint rules above.
 */
.simulation-edit-period label > strong,
.simulation-edit-period input {
  display: block !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: 22px !important;
  min-height: 22px !important;
  max-height: 22px !important;
  margin: 0 !important;
  padding: 0 20px 0 0 !important;
  border: 0 !important;
  overflow: hidden !important;
  font-size: 13px !important;
  line-height: 22px !important;
  white-space: nowrap !important;
}

@media (max-width: 767px) {
  .simulation-edit-period label > strong,
  .simulation-edit-period input {
    padding: 0 18px 0 0 !important;
    font-size: 12px !important;
  }
}

/* Flatten the edit page: drop the outer card look so content sits directly
   on the page background, with natural spacing instead of a boxed shell. */
@media (max-width: 767px) {
  .simulation-edit-shell,
  :global(#app .app-shell main .simulation-edit-page .simulation-edit-shell) {
    overflow: visible !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .simulation-edit-hero,
  :global(#app .app-shell main .simulation-edit-page .simulation-edit-hero) {
    padding: 4px 4px 18px !important;
    background: transparent !important;
  }

  .simulation-edit-body,
  :global(#app .app-shell main .simulation-edit-page .simulation-edit-body) {
    padding: 0 4px 24px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
}
</style>
