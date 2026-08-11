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
const getTodayDate = () => {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}
const startDate = ref(step.value === 'categories' ? getTodayDate() : simulation.state.startDate)
const endDate = ref(simulation.state.endDate)
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const manwon = (value) => `${money((Number(value) || 0) / 10000)}만원`
const previewExpectedMonths = computed(() => {
  const currentMonths = Number(simulation.currentMonths) || 0
  const currentBurn = Math.max(1, simulation.monthlyExpense - simulation.monthlyIncome)
  const reducedBurn = Math.max(1, currentBurn - 100000)
  const targetMonths = Math.max(currentMonths, Number(simulation.targetMonths) || currentMonths)
  return Math.round(Math.min(targetMonths, currentMonths * (currentBurn / reducedBurn)) * 10) / 10
})
const previewAddedMonths = computed(
  () => Math.max(0, Math.round((previewExpectedMonths.value - simulation.currentMonths) * 10) / 10),
)
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
  if (step.value === 'categories') startDate.value = getTodayDate()
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
  startDate.value = getTodayDate()
  simulation.state.startDate = startDate.value
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
      <div class="resume-hero">
        <img :src="stableImage" alt="다시 찾아온 버티" />
        <h1>시뮬레이션을 하는 중이었어요.<br />이어서 만드시겠어요?</h1>
      </div>
      <div class="wizard-actions vertical resume-actions">
        <button class="sim-btn sim-btn--yellow" type="button" @click="router.push(nextDraftPath)">
          <span class="desktop-only">이어서 계속하기 →</span>
          <span class="mobile-only">이어서 만들기</span>
        </button>
        <button class="resume-reset" type="button" @click="reset">
          <span class="desktop-only">처음부터 다시 시작하기</span>
          <span class="mobile-only">처음부터 다시 만들기</span>
        </button>
      </div>
    </template>

    <template v-else-if="step === 'categories'">
      <button class="sim-back categories-desktop-back desktop-only" type="button" @click="router.push('/simulation')">
        ‹ 예상 재정 계획 만들기
      </button>
      <h1 class="wizard-title">
        <span class="desktop-only">지출을 매달 10만원 줄이면<br />생존기간이 얼마나 늘어날까요?</span>
        <span class="mobile-only">지출을 매달 10만원 줄이면<br />버티는 기간이 얼마나 늘어날까요?</span>
      </h1>
      <p class="sim-subtitle">
        <span class="desktop-only">생존 기간이 늘어나면 버티도 살아나요!</span>
        <span class="mobile-only">현재 재정 상태를 기준으로 나만의 계획을 만들어보세요.</span>
      </p>

      <div class="buttie-transition" aria-label="현재 상태에서 안정 상태로 변화하는 버티">
        <div><img :src="meltingImage" alt="현재 상태의 버티" /><span>현재</span></div>
        <b>→</b>
        <div><img :src="stableImage" alt="목표 상태의 버티" /><span>목표</span></div>
      </div>

      <section class="period-section">
        <h2><span class="desktop-only">예상 재정 계획 기간</span><span class="mobile-only">시뮬레이션 기간</span></h2>
        <p>
          <span class="desktop-only">시작일은 오늘, 종료일은 목표 취업 시점이 기본이에요</span>
          <span class="mobile-only">오늘부터 목표 취업일까지 자동으로 설정했어요.</span>
        </p>
        <div class="period-grid">
          <label><span>시작일</span><input v-model="startDate" type="date" /></label>
          <i class="period-separator desktop-only">~</i>
          <label><span>종료일</span><input v-model="endDate" type="date" /></label>
        </div>
        <p v-if="endDate && startDate && endDate <= startDate" class="form-error">종료일은 시작일보다 뒤여야 해요.</p>
      </section>

      <section class="baseline-report report-preview">
        <h2>리포트 미리보기</h2>
        <article class="report-preview__card">
          <strong>시뮬레이션을 하면 이런 리포트를 받아볼 수 있어요</strong>
          <span class="report-preview__badge">지출 줄이기</span>
          <div class="report-preview__period">
            <span>예상 버티는 기간 변화</span>
            <p><del>{{ simulation.currentMonths }}개월</del><b>→</b><strong>{{ previewExpectedMonths }}개월</strong></p>
            <em>+{{ previewAddedMonths }}개월 연장</em>
          </div>
          <div class="report-preview__charts">
            <figure>
              <figcaption>월별 타임라인</figcaption>
              <svg viewBox="0 0 180 86" role="img" aria-label="시뮬레이션 전후 재정 타임라인 예시">
                <line x1="12" y1="12" x2="92" y2="72" class="preview-line preview-line--before" />
                <line x1="12" y1="12" x2="162" y2="72" class="preview-line preview-line--after" />
                <circle cx="92" cy="72" r="4" class="preview-dot preview-dot--before" />
                <circle cx="162" cy="72" r="4" class="preview-dot preview-dot--after" />
                <text x="24" y="57" class="preview-text preview-text--before">적용 전</text>
                <text x="116" y="34" class="preview-text preview-text--after">적용 후</text>
              </svg>
            </figure>
            <figure>
              <figcaption>시뮬레이션 적용 결과</figcaption>
              <div class="preview-bars" aria-label="적용 전후 버티는 기간 비교">
                <span class="preview-bar preview-bar--before"><i />적용 전</span>
                <span class="preview-bar preview-bar--after"><i />적용 후</span>
              </div>
            </figure>
          </div>
        </article>
      </section>

      <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
      <button class="sim-btn sim-btn--yellow wide" :disabled="simulation.syncing || !startDate || !endDate || endDate <= startDate" type="button" @click="startSimulation">
        <span v-if="simulation.syncing">불러오는 중…</span>
        <template v-else>
          <span class="desktop-only">예상 재정 계획 만들기 →</span>
          <span class="mobile-only">시뮬레이션 시작하기 →</span>
        </template>
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

<style scoped>
.sim-flow-continue {
  min-height: calc(100vh - var(--header-height));
}

.sim-flow-continue .resume-hero {
  min-height: 540px;
  align-content: center;
  padding-top: 0;
}

.sim-flow-continue .resume-hero img {
  width: 160px;
  height: 160px;
}

.sim-flow-continue .resume-hero h1 {
  margin-top: 46px;
  font-size: 23px;
}

.resume-actions {
  gap: 14px;
  margin-top: 0;
}

.resume-actions .sim-btn,
.resume-actions .resume-reset {
  min-height: 64px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 800;
  box-shadow: 0 2px 6px rgb(20 30 60 / 16%);
}

.resume-actions .resume-reset {
  border: 1px solid #dfe4ee;
  background: #fff;
  color: #777;
}

.report-preview > h2 {
  font-size: 16px;
}

.report-preview__card {
  margin-top: 12px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 2px 7px rgb(20 30 60 / 9%);
}

.report-preview__card > strong {
  display: block;
  font-size: 14px;
}

.report-preview__badge {
  display: inline-flex;
  margin-top: 14px;
  padding: 5px 14px;
  border-radius: 999px;
  background: #edf3ff;
  color: #6c94ee;
  font-size: 11px;
  font-weight: 800;
}

.report-preview__period {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 8px 14px;
  margin-top: 14px;
}

.report-preview__period > span {
  grid-column: 1 / -1;
  color: #555d6c;
  font-size: 12px;
}

.report-preview__period p {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.report-preview__period del {
  color: #a2a7b0;
  font-size: 18px;
  text-decoration: none;
}

.report-preview__period b {
  color: #8e949d;
}

.report-preview__period strong {
  color: #71442e;
  font-size: 27px;
}

.report-preview__period em {
  min-width: 122px;
  padding: 7px 13px;
  border: 1px solid #f4ad24;
  border-radius: 999px;
  color: #e8a01c;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  text-align: center;
}

.report-preview__charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 22px;
}

.report-preview__charts figure {
  min-width: 0;
}

.report-preview__charts figcaption {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 800;
}

.report-preview__charts svg {
  display: block;
  width: 100%;
  min-height: 90px;
}

.preview-line {
  stroke-width: 2;
}

.preview-line--before {
  stroke: #161616;
}

.preview-line--after {
  stroke: #8eaff7;
}

.preview-dot--before {
  fill: #161616;
}

.preview-dot--after {
  fill: #8eaff7;
}

.preview-text {
  font-size: 10px;
  font-weight: 700;
}

.preview-text--before {
  fill: #ef625a;
}

.preview-text--after {
  fill: #7298ed;
}

.preview-bars {
  display: flex;
  min-height: 90px;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
}

.preview-bar {
  display: grid;
  justify-items: center;
  gap: 5px;
  color: #89909d;
  font-size: 9px;
}

.preview-bar i {
  display: block;
  width: 40px;
  height: 58px;
  border: 1px dashed #9da2ab;
  border-radius: 4px 4px 0 0;
  background: #f4f4f4;
}

.preview-bar--after i {
  height: 72px;
  border: 1px solid #6f94ea;
  background: #8faff7;
}

@media (max-width: 767px) {
  .sim-flow-continue {
    padding-bottom: 48px;
  }

  .sim-flow-continue .resume-hero {
    min-height: min(58vh, 560px);
  }

  .report-preview__card {
    padding: 17px 14px;
  }

  .report-preview__card > strong {
    font-size: 14px;
  }

  .report-preview__badge,
  .report-preview__period > span,
  .report-preview__period em {
    font-size: 10px;
    font-weight: 700;
  }

  .report-preview__period {
    gap: 8px;
  }

  .report-preview__period p {
    gap: 7px;
  }

  .report-preview__period del {
    font-size: 16px;
  }

  .report-preview__period strong {
    font-size: 25px;
    font-weight: 800;
  }

  .report-preview__period em {
    min-width: 108px;
    padding: 6px 9px;
    font-size: 12px;
  }

  .report-preview__charts {
    gap: 10px;
  }

  .report-preview__charts figcaption {
    font-size: 9px;
    font-weight: 600;
  }

  .preview-text,
  .preview-bar {
    font-size: 9px;
    font-weight: 600;
  }
}

.sim-flow-categories .period-grid label {
  min-width: 0;
}

.sim-flow-categories .period-grid input[type='date'] {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding-right: 24px;
}

.sim-flow-categories .period-grid input[type='date']::-webkit-calendar-picker-indicator {
  position: absolute;
  right: 2px;
  margin: 0;
}

@media (min-width: 768px) {
  .sim-wizard.sim-flow-categories {
    display: block;
    width: min(100%, 1120px);
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px 0 72px;
  }

  .sim-flow-categories .categories-desktop-back {
    display: flex;
    width: fit-content;
    margin: 0 0 26px;
    color: #181818;
    font-size: 14px;
    font-weight: 800;
  }

  .sim-flow-categories > .wizard-title {
    max-width: none;
    margin: 0;
    font-size: 24px;
    line-height: 1.35;
  }

  .sim-flow-categories > .sim-subtitle {
    margin-top: 4px;
    font-size: 12px;
  }

  .sim-flow-categories > .buttie-transition {
    display: grid;
    width: 100%;
    min-height: 128px;
    grid-template-columns: 1fr 64px 1fr;
    align-items: center;
    margin: 18px 0 28px;
    padding: 0 116px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .sim-flow-categories .buttie-transition > div {
    display: grid;
    place-items: center;
  }

  .sim-flow-categories .buttie-transition img {
    width: 142px;
    height: 104px;
    object-fit: contain;
  }

  .sim-flow-categories .buttie-transition span {
    display: none;
  }

  .sim-flow-categories .buttie-transition > b {
    color: #c4aa58;
    font-size: 28px;
    text-align: center;
  }

  .sim-flow-categories > .period-section,
  .sim-flow-categories > .baseline-report {
    width: 100%;
    margin: 0;
  }

  .sim-flow-categories > .period-section h2,
  .sim-flow-categories > .baseline-report > h2 {
    font-size: 16px;
  }

  .sim-flow-categories > .period-section > p {
    margin-top: 4px;
    font-size: 11px;
  }

  .sim-flow-categories .period-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 16px;
    margin-top: 14px;
  }

  .sim-flow-categories .period-grid label {
    min-height: 62px;
    padding: 11px 18px;
    border-color: #d5eee2;
    background: #edfff6;
  }

  .sim-flow-categories .period-grid input {
    background: transparent;
  }

  .sim-flow-categories .period-separator {
    display: block;
    color: #555;
    font-style: normal;
  }

  .sim-flow-categories > .baseline-report {
    margin-top: 24px;
  }

  .sim-flow-categories .report-preview__card {
    min-height: 350px;
    padding: 24px 28px;
  }

  .sim-flow-categories .report-preview__charts {
    gap: 88px;
    margin-top: 30px;
  }

  .sim-flow-categories .report-preview__charts svg,
  .sim-flow-categories .preview-bars {
    min-height: 142px;
  }

  .sim-flow-categories .preview-bar i {
    width: 54px;
    height: 82px;
  }

  .sim-flow-categories .preview-bar--after i {
    height: 104px;
  }

  .sim-flow-categories > .api-notice,
  .sim-flow-categories > .wide {
    width: 100%;
  }

  .sim-flow-categories > .wide {
    min-height: 58px;
    margin: 28px 0 0;
  }

  .sim-flow-continue {
    position: relative;
    display: grid;
    width: 100%;
    max-width: none;
    min-height: 100dvh;
    grid-template-rows: minmax(360px, 1fr) auto minmax(120px, 0.55fr);
    padding: 0;
    background: #fcfdff;
  }

  .sim-flow-continue .resume-hero {
    min-height: 0;
    align-self: end;
    align-content: end;
  }

  .sim-flow-continue .resume-hero img {
    width: 192px;
    height: 192px;
  }

  .sim-flow-continue .resume-hero h1 {
    margin-top: 40px;
    font-size: 19px;
    line-height: 1.45;
  }

  .resume-actions {
    width: min(720px, calc(100% - 48px));
    align-self: start;
    justify-self: center;
    gap: 10px;
    margin-top: 72px;
  }

  .resume-actions .sim-btn,
  .resume-actions .resume-reset {
    min-height: 58px;
    border-radius: 12px;
    font-size: 15px;
  }
}
</style>
