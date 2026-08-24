<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { expenseCategoryIconPath } from '@/features/simulation/utils/expenseCategoryIcon'
import { getCustomRecommendationsApi, getSimulationRecommendationsApi } from '@/api/simulation'
import AppIcon from '@/components/ui/AppIcon.vue'
import SimulationEntryLoader from '@/features/simulation/components/SimulationEntryLoader.vue'
import assistantAvatar from '@/assets/images/simulation/buttie-ai-assistant.png'
import { formatPrepMonthsWithUnit, isInfinitePrepMonths } from '@/utils/prepMonths'
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
const selectedPeriod = ref(null)
const starting = ref(false)
const preparingResult = ref(step.value === 'confirm')
const aiPrompt = ref('')
const aiRecommendations = ref(null)
const aiLoading = ref(false)
const aiError = ref('')
const aiRecommendationCompleted = ref(false)
const periodOptions = [1, 3, 6, 12]

function addMonths(dateValue, months) {
  const [year, month, day] = String(dateValue).split('-').map(Number)
  if (!year || !month || !day) return ''
  const result = new Date(year, month - 1 + months, day)
  return [
    result.getFullYear(),
    String(result.getMonth() + 1).padStart(2, '0'),
    String(result.getDate()).padStart(2, '0'),
  ].join('-')
}

function selectPeriod(months) {
  if (!startDate.value) startDate.value = getTodayDate()
  selectedPeriod.value = months
  endDate.value = addMonths(startDate.value, months)
}

function clearSelectedPeriod() {
  selectedPeriod.value = null
}
const money = (value) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(value) || 0))
const confirmAmount = (item, kind) => {
  const amount = kind === 'expense' ? item.saving : item.amount
  const sign = kind === 'expense' ? '-' : '+'
  return item.type === 'once' ? `${sign}${money(amount)}원` : `${sign}${money(amount)}원/월`
}
const policySupportMonths = (item) => {
  const months = Number(item.months)
  return item.type !== 'once' && Number.isFinite(months) && months > 0 ? money(months) : ''
}
const expenseIconPath = (item) =>
  expenseCategoryIconPath(item.expenseCategory || item.category || item.name)
const hasRunwayResult = computed(
  () =>
    Number.isFinite(Number(simulation.currentMonths)) &&
    Number.isFinite(Number(simulation.expectedMonths)),
)
const financialSummary = computed(() =>
  String(aiRecommendations.value?.financialRecommendation?.summary || '').trim(),
)
const aiPromptLength = computed(() => aiPrompt.value.length)
const nextDraftPath = computed(() => {
  if (!simulation.state.expenseApplied) return '/simulation/expense'
  if (!simulation.state.incomes.length) return '/simulation/income'
  if (!simulation.state.policies.length) return '/simulation/policy'
  return '/simulation/confirm'
})

function recommendationErrorMessage(error) {
  const status = error?.response?.status || error?.status
  if (status === 503) return 'AI 추천을 지금 생성할 수 없어요. 잠시 후 다시 시도해 주세요.'
  if (status === 401) return '로그인 정보가 없어 AI 추천을 불러오지 못했어요.'
  return error?.response?.data?.message || error?.message || 'AI 추천을 불러오지 못했어요.'
}

async function loadAiRecommendations(prompt) {
  if (aiLoading.value) return
  aiLoading.value = true
  aiError.value = ''

  try {
    const recommendations = await getCustomRecommendationsApi(prompt)
    aiRecommendations.value = recommendations
    if (prompt) simulation.setAiPlanRecommendations(prompt, recommendations)
    aiRecommendationCompleted.value = true
    return true
  } catch (error) {
    aiError.value = recommendationErrorMessage(error)
    return false
  } finally {
    aiLoading.value = false
  }
}

async function submitAiPrompt() {
  const prompt = aiPrompt.value.trim()
  if (!prompt) return
  const recommended = await loadAiRecommendations(prompt)
  if (recommended) await startSimulation()
}

async function loadInitialAiSummary() {
  if (aiLoading.value) return

  aiLoading.value = true
  try {
    const recommendations = await getSimulationRecommendationsApi()
    aiRecommendations.value = recommendations
    simulation.setAiPlanRecommendations('', recommendations)
  } catch {
    // 첫 진입 추천은 제목 보조 정보이므로, 실패해도 기본 문구로 화면을 유지한다.
  } finally {
    aiLoading.value = false
  }
}

async function initializeNewCategories() {
  startDate.value = getTodayDate()
  aiPrompt.value = ''
  aiError.value = ''
  aiRecommendationCompleted.value = false
  simulation.clearAiPlanRecommendations()
  await loadInitialAiSummary()
}

onMounted(async () => {
  await simulation.hydrateRunwayBaseline()

  // 새 시뮬레이션 화면은 기존 미확정 시뮬레이션을 삭제한 뒤 진입한다.
  // 여기서 다시 조회하면 정상적인 "데이터 없음" 응답이 404 오류처럼 노출된다.
  if (step.value === 'categories') {
    await initializeNewCategories()
    return
  }

  const data = await simulation.hydrateDraft()
  if (data) {
    startDate.value = simulation.state.startDate
    endDate.value = simulation.state.endDate
    if (step.value === 'confirm') {
      await simulation.prepareConfirmationPreview()
      preparingResult.value = false
    }
    return
  }

  if (step.value === 'confirm') preparingResult.value = false

  // 이어갈 미확정 시뮬레이션이 실제로 없다면 빈 이어하기 화면에 머물지 않는다.
  if (step.value === 'continue' && !simulation.syncError) {
    simulation.prepareNewScenario()
    await router.replace('/simulation/new')
    await initializeNewCategories()
  }
})

async function startSimulation() {
  if (starting.value || !startDate.value || !endDate.value || endDate.value <= startDate.value)
    return
  starting.value = true

  try {
    // 로컬의 Draft 존재 여부는 다른 탭이나 이전 요청 이후 오래된 값일 수 있다.
    // 생성 직전에 서버를 다시 확인해 동일 사용자의 미확정 시뮬레이션 중복 생성을 막는다.
    const existingDraft = await simulation.hydrateDraft()
    if (existingDraft) {
      router.replace('/simulation/continue')
      return
    }
    if (simulation.syncError) return

    // 대시보드 등에서 /simulation/new로 바로 진입한 경우에도 확정 계획을
    // 먼저 Draft로 되돌려 새 시뮬레이션 생성 요청(409)을 방지한다.
    const confirmed = await simulation.hydrateConfirmed()
    if (confirmed) {
      const reverted = await simulation.revertConfirmedScenario()
      if (!reverted) return
    } else if (simulation.syncError) {
      return
    }

    simulation.prepareNewScenario()
    simulation.state.startDate = startDate.value
    simulation.state.endDate = endDate.value
    const ok = await simulation.beginSimulation()
    if (ok) router.push('/simulation/expense')
  } finally {
    starting.value = false
  }
}

async function reset() {
  const ok = await simulation.deleteDraftScenario()
  if (!ok) return
  simulation.prepareNewScenario()
  startDate.value = getTodayDate()
  simulation.state.startDate = startDate.value
  endDate.value = simulation.state.endDate
  await router.push('/simulation/new')
  await initializeNewCategories()
}

async function confirm() {
  const ok = await simulation.confirmScenario()
  if (ok) router.push('/simulation')
}
</script>

<template>
  <section class="page sim-page sim-wizard" :class="`sim-flow-${step}`">
    <Teleport to="body">
      <Transition name="simulation-ai-page-loader">
        <div
          v-if="step === 'categories' && aiLoading"
          class="simulation-ai-page-loader"
          role="status"
          aria-live="polite"
          aria-busy="true"
          @wheel.prevent
          @touchmove.prevent
        >
          <SimulationEntryLoader />
        </div>
      </Transition>
    </Teleport>

    <template v-if="step === 'continue'">
      <div class="resume-hero">
        <button
          class="resume-hero__close"
          type="button"
          aria-label="처음부터 다시 시작하기"
          @click="reset"
        >
          <AppIcon name="close" :size="20" />
        </button>
        <img :src="stableImage" alt="다시 찾아온 버티" />
        <h1>시뮬레이션을 하는 중이었어요.<br />이어서 만드시겠어요?</h1>
      </div>
      <div class="wizard-actions vertical resume-actions">
        <button
          class="sim-btn sim-btn--yellow simulation-primary-cta"
          type="button"
          @click="router.push(nextDraftPath)"
        >
          <span class="desktop-only">이어서 계속하기</span>
          <span class="mobile-only">이어서 만들기</span>
        </button>
        <button class="resume-reset" type="button" @click="reset">
          <span class="desktop-only">처음부터 다시 시작하기</span>
          <span class="mobile-only">처음부터 다시 만들기</span>
        </button>
      </div>
    </template>

    <template v-else-if="step === 'categories'">
      <button
        class="sim-back simulation-back-button desktop-only"
        type="button"
        aria-label="뒤로가기"
        @click="router.push('/simulation')"
      >
        <AppIcon name="chevron-left" :size="22" />
      </button>
      <h1 class="wizard-title">
        <template v-if="financialSummary">{{ financialSummary }}</template>
        <template v-else>
          나에게 맞는 재정 계획으로<br />버티는 기간을 늘려볼까요?
        </template>
      </h1>
      <div class="category-intro-card">
        <p class="sim-subtitle">생존 기간이 늘어나면 버티도 살아나요</p>

        <div class="buttie-transition" aria-label="현재 상태에서 안정 상태로 변화하는 버티">
          <div>
            <span>지금</span><img :src="meltingImage" alt="현재 위험 상태의 버티" /><small
              class="danger"
              >위험</small
            >
          </div>
          <b aria-hidden="true"><i />→</b>
          <div>
            <span>아끼면</span><img :src="stableImage" alt="절약 후 안정 상태의 버티" /><small
              class="safe"
              >안정</small
            >
          </div>
        </div>
      </div>

      <section class="period-section">
        <h2>시뮬레이션 기간</h2>
        <p>시작일은 오늘, 종료일은 목표 취업 시점이 기본이에요</p>
        <div class="period-presets" aria-label="시뮬레이션 기간 빠른 선택">
          <button
            v-for="months in periodOptions"
            :key="months"
            type="button"
            :class="{ active: selectedPeriod === months }"
            @click="selectPeriod(months)"
          >
            {{ months }}개월
          </button>
        </div>
        <div class="period-grid">
          <label
            ><span>시작일</span><input v-model="startDate" type="date" @input="clearSelectedPeriod"
          /></label>
          <i class="period-separator">~</i>
          <label
            ><span>종료일</span><input v-model="endDate" type="date" @input="clearSelectedPeriod"
          /></label>
        </div>
        <p v-if="endDate && startDate && endDate <= startDate" class="form-error">
          종료일은 시작일보다 뒤여야 해요.
        </p>
      </section>

      <section class="baseline-report ai-plan-recommendation">
        <div class="ai-plan-recommendation__heading">
          <img :src="assistantAvatar" alt="" aria-hidden="true" />
          <div>
            <h2>버티 AI 맞춤 계획</h2>
            <p>지출·수입·정책을 한 번에 추천받아 보세요.</p>
          </div>
        </div>

        <form class="ai-plan-recommendation__form" @submit.prevent="submitAiPrompt">
          <label for="simulation-ai-concept">원하는 계획 컨셉</label>
          <div class="ai-plan-recommendation__input">
            <input
              id="simulation-ai-concept"
              v-model="aiPrompt"
              type="text"
              maxlength="50"
              placeholder="원하는 컨셉을 넣어보세요"
              :disabled="aiLoading"
            />
            <span>{{ aiPromptLength }}/50</span>
            <button type="submit" :disabled="aiLoading || !aiPrompt.trim()">추천받기</button>
          </div>
          <small v-if="aiRecommendationCompleted" class="ai-plan-recommendation__success">
            추천이 준비됐어요. 이제 시뮬레이션을 시작해서 결과를 확인해 보세요!
          </small>
          <small v-else>
            예: 취업 준비 6개월 동안 배달비를 줄이고 자격증 지원을 받고 싶어요.
          </small>
        </form>

        <p v-if="aiError" class="ai-plan-recommendation__error">{{ aiError }}</p>
      </section>

      <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
      <button
        class="sim-btn sim-btn--yellow wide simulation-primary-cta"
        :disabled="starting || simulation.syncing || !startDate || !endDate || endDate <= startDate"
        type="button"
        @click="startSimulation"
      >
        <span v-if="simulation.syncing">불러오는 중…</span>
        <span v-else>시뮬레이션 시작하기</span>
      </button>
    </template>

    <template v-else>
      <button
        class="sim-back simulation-back-button desktop-only"
        type="button"
        aria-label="뒤로가기"
        @click="router.push('/simulation/policy/preview')"
      >
        <AppIcon name="chevron-left" :size="22" />
      </button>
      <h1 class="wizard-title">지금까지 만든 계획을<br />한 번 더 확인해 주세요</h1>

      <div class="final-result" :aria-busy="preparingResult">
        <span>예상 버티는 기간</span>
        <p v-if="preparingResult">계산 중...</p>
        <template v-else>
          <p>
            <del>{{ formatPrepMonthsWithUnit(simulation.currentMonths) }}</del
            ><b>→</b><strong>{{ formatPrepMonthsWithUnit(simulation.expectedMonths) }}</strong>
          </p>
          <em v-if="hasRunwayResult">
            {{
              isInfinitePrepMonths(simulation.expectedMonths)
                ? '∞ 연장'
                : `+${simulation.addedMonths}개월 연장`
            }}
          </em>
          <em v-else>계산 결과를 불러오지 못했어요</em>
        </template>
      </div>

      <section class="edit-summary expense">
        <header>
          <div>
            <span class="confirm-section-dot" aria-hidden="true"></span>
            <h2>지출 줄이기</h2>
          </div>
          <button
            class="confirm-edit-action"
            type="button"
            aria-label="지출 줄이기 수정"
            title="수정"
            @click="router.push('/simulation/expense')"
          >
            <AppIcon name="edit" :size="18" />
          </button>
        </header>
        <p v-for="item in simulation.selectedExpenses" :key="item.id">
          <span class="confirm-item-name">
            <i>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path :d="expenseIconPath(item)" />
              </svg>
            </i>
            {{ item.name }}
          </span>
          <strong class="confirm-item-amount">{{ confirmAmount(item, 'expense') }}</strong>
        </p>
        <p v-if="!simulation.selectedExpenses.length" class="empty-row">건너뛴 단계예요.</p>
      </section>
      <section class="edit-summary income">
        <header>
          <div>
            <span class="confirm-section-dot" aria-hidden="true"></span>
            <h2>수입 늘리기</h2>
          </div>
          <button
            class="confirm-edit-action"
            type="button"
            aria-label="수입 늘리기 수정"
            title="수정"
            @click="router.push('/simulation/income')"
          >
            <AppIcon name="edit" :size="18" />
          </button>
        </header>
        <p v-for="item in simulation.state.incomes" :key="item.id">
          <span class="confirm-item-name"
            ><i><AppIcon name="briefcase" :size="18" /></i>{{ item.name }}</span
          ><strong class="confirm-item-amount">{{ confirmAmount(item, 'income') }}</strong>
        </p>
        <p v-if="!simulation.state.incomes.length" class="empty-row">건너뛴 단계예요.</p>
      </section>
      <section class="edit-summary policy">
        <header>
          <div>
            <span class="confirm-section-dot" aria-hidden="true"></span>
            <h2>정책 혜택</h2>
          </div>
          <button
            class="confirm-edit-action"
            type="button"
            aria-label="정책 혜택 수정"
            title="수정"
            @click="router.push('/simulation/policy')"
          >
            <AppIcon name="edit" :size="18" />
          </button>
        </header>
        <p v-for="item in simulation.state.policies" :key="item.id">
          <span class="confirm-item-name"
            ><i><AppIcon name="landmark" :size="18" /></i>{{ item.name }}</span
          ><strong class="confirm-item-amount confirm-policy-amount"
            ><span>{{ confirmAmount(item, 'policy') }}</span
            ><span v-if="policySupportMonths(item)" class="confirm-policy-duration"
              >x {{ policySupportMonths(item) }}개월</span
            ></strong
          >
        </p>
        <p v-if="!simulation.state.policies.length" class="empty-row">건너뛴 단계예요.</p>
      </section>

      <p class="api-notice neutral">확정하면 이 계획을 기준으로 퀘스트가 생성됩니다.</p>
      <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
      <div class="wizard-actions confirm-actions">
        <button
          class="sim-btn sim-btn--yellow simulation-primary-cta"
          :disabled="simulation.syncing"
          type="button"
          @click="confirm"
        >
          {{ simulation.syncing ? '확정하는 중…' : '시뮬레이션 확정하기' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.simulation-ai-page-loader {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 45%, rgb(83 99 221 / 9%), transparent 34%),
    rgb(244 247 252 / 97%);
  backdrop-filter: blur(6px);
}

.simulation-ai-page-loader-enter-active,
.simulation-ai-page-loader-leave-active {
  transition: opacity 0.22s ease;
}

.simulation-ai-page-loader-enter-active :deep(.simulation-entry-loader),
.simulation-ai-page-loader-leave-active :deep(.simulation-entry-loader) {
  transition: transform 0.22s ease;
}

.simulation-ai-page-loader-enter-from,
.simulation-ai-page-loader-leave-to {
  opacity: 0;
}

.simulation-ai-page-loader-enter-from :deep(.simulation-entry-loader),
.simulation-ai-page-loader-leave-to :deep(.simulation-entry-loader) {
  transform: translateY(10px) scale(0.98);
}

.final-result em {
  display: inline-flex;
  height: 35px;
  align-items: center;
  border: 0 !important;
}

.category-intro-card {
  margin-top: 20px;
  padding: 15px 18px 17px;
  border: 1px solid rgb(0 0 0 / 6%);
  border-radius: 20px;
  background: #fff;
}

.sim-flow-continue,
:global(#app .app-shell main .sim-flow-continue) {
  min-height: calc(100vh - var(--header-height));
}

@media (min-width: 1280px) {
  .sim-flow-continue,
  :global(#app .app-shell main .sim-flow-continue) {
    width: min(100%, 1090px) !important;
  }
}

.sim-flow-continue .resume-hero {
  position: relative;
  width: min(100%, 1052px);
  min-height: 540px;
  margin: 0 auto;
  align-content: center;
  padding-top: 0;
}

.resume-hero__close {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #8b95a1;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

@media (hover: hover) {
  .resume-hero__close:hover {
    background: #f4f5f8;
    color: #475569;
  }
}

.sim-flow-continue .resume-hero img {
  width: 160px;
  height: 160px;
}

.sim-flow-continue .resume-hero h1 {
  margin-top: 46px;
  font-size: 23px;
}

.resume-actions,
:global(#app .app-shell main .resume-actions) {
  width: min(100%, 1052px) !important;
  grid-template-columns: 1fr !important;
  gap: 14px;
  margin: 32px auto 0 !important;
}

.resume-actions .sim-btn,
.resume-actions .resume-reset,
:global(#app .app-shell main .resume-actions .sim-btn),
:global(#app .app-shell main .resume-actions .resume-reset) {
  width: 100%;
  min-height: 64px;
  border-radius: 14px;
  font-size: var(--type-action-size) !important;
}

.resume-actions .sim-btn,
:global(#app .app-shell main .resume-actions .sim-btn) {
  font-weight: var(--type-action-weight) !important;
}

.resume-actions .resume-reset,
:global(#app .app-shell main .resume-actions .resume-reset) {
  font-weight: var(--type-action-secondary-weight) !important;
}

.resume-actions .resume-reset {
  border: 1px solid #dfe4ee;
  background: #fff;
  box-shadow: none;
  color: #777;
}

.report-preview > h2 {
  font-size: 16px;
}

.ai-plan-recommendation {
  padding: 18px;
  border: 1px solid #e1e5ee;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(26 39 78 / 9%);
}

.ai-plan-recommendation__heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-plan-recommendation__heading > img {
  display: block;
  width: 42px;
  flex: 0 0 42px;
  height: 42px;
  border-radius: 13px;
  object-fit: cover;
}

.ai-plan-recommendation__heading h2 {
  font-size: 16px;
}

.ai-plan-recommendation__heading p {
  margin-top: 3px;
  color: #858d9d;
  font-size: 11px;
}

.ai-plan-recommendation__form {
  margin-top: 18px;
}

.ai-plan-recommendation__form > label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
}

.ai-plan-recommendation__input {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  overflow: hidden;
  border: 1px solid #dfe3ec;
  border-radius: 13px;
  background: #f8f9fc;
}

.ai-plan-recommendation__input input {
  min-width: 0;
  height: 48px;
  padding: 0 12px;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}

.ai-plan-recommendation__input > span {
  padding: 0 9px;
  color: #9aa1ae;
  font-size: 10px;
}

.ai-plan-recommendation__input button,
.ai-plan-recommendation__results article > button {
  border: 0;
  background: #101c83;
  color: #fff;
  font-weight: 800;
}

.ai-plan-recommendation__input button {
  align-self: stretch;
  min-width: 78px;
  padding: 0 12px;
  font-size: 11px;
}

.ai-plan-recommendation__input button:disabled {
  background: #dfe3eb;
  color: #9da4b0;
}

.ai-plan-recommendation__form > small {
  display: block;
  margin-top: 7px;
  color: #9aa1ae;
  font-size: 9px;
  line-height: 1.45;
}

.ai-plan-recommendation__results {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.ai-plan-recommendation__results article {
  display: flex;
  min-width: 0;
  min-height: 176px;
  flex-direction: column;
  padding: 12px;
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  background: #fbfcff;
}

.ai-plan-recommendation__results header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-plan-recommendation__results header span {
  color: #111d82;
  font-size: 15px;
  font-weight: 900;
}

.ai-plan-recommendation__results header b {
  color: #8b93a2;
  font-size: 12px;
}

.ai-plan-recommendation__results article > p {
  margin-top: 8px;
  color: #6f7787;
  font-size: 12px;
  line-height: 1.45;
}

.ai-plan-recommendation__results ul {
  display: grid;
  gap: 7px;
  margin-top: 9px;
  padding: 0;
  list-style: none;
}

.ai-plan-recommendation__results li {
  min-width: 0;
}

.ai-plan-recommendation__results li strong,
.ai-plan-recommendation__results li small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-plan-recommendation__results li strong {
  font-size: 13px;
}

.ai-plan-recommendation__results li small {
  margin-top: 2px;
  color: #969daa;
  font-size: 11px;
}

.ai-plan-recommendation__results article > button {
  width: 100%;
  min-height: 30px;
  margin-top: auto;
  border-radius: 8px;
  font-size: 12px;
}

.ai-plan-recommendation__empty,
.ai-plan-recommendation__error {
  margin-top: 16px;
  padding: 18px 12px;
  border-radius: 12px;
  font-size: 10px;
  line-height: 1.55;
  text-align: center;
}

.ai-plan-recommendation__empty {
  background: #f4f6fa;
  color: #7e8695;
}

.ai-plan-recommendation__error {
  background: #fff0f0;
  color: #d94f55;
}

@media (max-width: 560px) {
  .simulation-ai-page-loader {
    padding: 18px;
  }

  .ai-plan-recommendation__input {
    grid-template-columns: 1fr auto;
  }

  .ai-plan-recommendation__input button {
    grid-column: 1 / -1;
    min-height: 40px;
  }

  .ai-plan-recommendation__results {
    grid-template-columns: 1fr;
  }

  .ai-plan-recommendation__results article {
    min-height: 150px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .simulation-ai-page-loader,
  .simulation-entry-loader {
    transition: none !important;
  }
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
  font-size: 14px;
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
  font-size: 13px;
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
  font-size: 12px;
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
  font-size: 11px;
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

.confirm-item-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.confirm-item-name > i {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: #f4f5f7;
  color: #555;
}

.confirm-item-name > i svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.edit-summary.expense .confirm-item-name > i {
  background: #ffe8e5;
  color: #d85b52;
}
.edit-summary.income .confirm-item-name > i {
  background: #e2f7ed;
  color: #288d67;
}
.edit-summary.policy .confirm-item-name > i {
  background: #eeeafb;
  color: #7561b1;
}

.confirm-section-dot {
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 50%;
  background: #e95858;
}

.edit-summary.income .confirm-section-dot {
  background: #2fbb85;
}

.edit-summary.policy .confirm-section-dot {
  background: #7e66c6;
}

.edit-summary header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.edit-summary header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 767px) {
  .sim-flow-continue {
    padding-bottom: 48px;
  }

  .sim-flow-confirm .edit-summary h2 {
    font-size: 16px;
    font-weight: 800;
  }

  .sim-flow-confirm .confirm-back-button {
    color: #222;
    font-size: 16px;
    font-weight: 700;
    text-decoration: none;
  }

  .sim-flow-confirm .edit-summary header button {
    font-size: 12px;
    font-weight: 400;
  }

  .sim-flow-confirm .edit-summary > p,
  .sim-flow-confirm .edit-summary > p strong {
    font-size: var(--type-item-size);
    font-weight: var(--type-item-weight);
  }

  .sim-flow-confirm .edit-summary > .empty-row {
    font-size: var(--type-empty-size) !important;
    font-weight: var(--type-empty-weight);
  }

  .sim-flow-confirm .final-result > span {
    font-size: 13px;
    font-weight: 600;
  }

  .sim-flow-confirm .final-result del {
    font-size: 14px;
  }

  .sim-flow-confirm .final-result strong {
    font-size: var(--type-result-size);
    font-weight: var(--type-result-weight);
  }

  .sim-flow-confirm .final-result em {
    font-size: 13px;
    font-weight: 700;
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

  .report-preview__period > span {
    font-size: 12px;
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
    font-size: 11px;
    font-weight: 600;
  }

  .preview-text,
  .preview-bar {
    font-size: 11px;
    font-weight: 600;
  }
}

.sim-flow-categories .period-grid label {
  min-width: 0;
  background: #fcfdff;
  box-shadow: none;
}

.sim-flow-categories .period-grid input[type='date'] {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding-right: 24px;
  background: #fcfdff;
}

.sim-flow-categories .period-grid input[type='date']::-webkit-calendar-picker-indicator {
  position: absolute;
  right: 2px;
  margin: 0;
}

@media (min-width: 768px) {
  .sim-flow-confirm > .confirm-actions {
    grid-column: 1 / -1;
    width: 100%;
    max-width: none;
    justify-self: stretch;
  }

  .sim-flow-confirm > .final-result {
    grid-column: 1 / -1;
    width: 100%;
    max-width: none;
    justify-self: stretch;
  }

  .sim-wizard.sim-flow-categories {
    display: block;
    width: min(100%, 1120px);
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px 0 72px;
  }

  .sim-flow-categories > .wizard-title {
    max-width: none;
    margin: 0;
    font-size: 24px;
    line-height: 1.35;
  }

  .category-intro-card {
    margin-top: 22px;
    padding: 24px 40px;
  }

  .category-intro-card > .sim-subtitle {
    margin-top: 4px;
    font-size: 13px;
  }

  .category-intro-card > .buttie-transition {
    display: grid;
    width: 100%;
    min-height: 128px;
    grid-template-columns: 1fr 64px 1fr;
    align-items: center;
    margin: 18px 0 0;
    padding: 0 76px;
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

  .sim-flow-categories > .period-section {
    width: 100%;
    margin: 22px 0 0;
  }

  .sim-flow-categories > .period-section h2 {
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
    background: #fcfdff;
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
    background: #fff;
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
  .resume-actions .resume-reset,
  :global(#app .app-shell main .resume-actions .sim-btn),
  :global(#app .app-shell main .resume-actions .resume-reset) {
    min-height: 58px;
    border-radius: 12px;
    font-size: var(--type-action-size) !important;
  }

  .resume-actions .sim-btn,
  :global(#app .app-shell main .resume-actions .sim-btn) {
    font-weight: var(--type-action-weight) !important;
  }

  .resume-actions .resume-reset,
  :global(#app .app-shell main .resume-actions .resume-reset) {
    font-weight: var(--type-action-secondary-weight) !important;
  }

  .resume-actions .resume-reset .mobile-only,
  .resume-actions .resume-reset .desktop-only,
  :global(#app .app-shell main .resume-actions .resume-reset .mobile-only),
  :global(#app .app-shell main .resume-actions .resume-reset .desktop-only) {
    font-size: inherit !important;
    font-weight: inherit !important;
  }
}

/* Renewed /simulation/new layout */
.sim-wizard.sim-flow-categories {
  width: min(100%, 700px);
  max-width: 700px;
  margin: 0 auto;
  padding: 10px 0 24px;
}

.sim-flow-categories > .wizard-title {
  margin: 0;
  color: var(--text);
  font-size: 27px !important;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.38;
}

.sim-flow-categories > .wizard-title em {
  color: inherit;
  font-style: normal;
}

.category-intro-card > .sim-subtitle {
  margin-top: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
}

.category-intro-card > .buttie-transition {
  display: grid;
  width: 100%;
  min-height: 158px;
  grid-template-columns: 1fr 70px 1fr;
  align-items: center;
  margin: 14px 0 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none !important;
  background-image: none !important;
  box-shadow: none;
}

.sim-flow-categories .buttie-transition > div {
  display: grid;
  justify-items: center;
  gap: 5px;
}

.sim-flow-categories .buttie-transition span {
  display: block;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.sim-flow-categories .buttie-transition img {
  width: 112px;
  height: 76px;
  object-fit: contain;
}

.sim-flow-categories .buttie-transition > div:last-child img {
  width: 86px;
}

.sim-flow-categories .buttie-transition small {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.sim-flow-categories .buttie-transition small.danger {
  background: #fce3e1;
  color: #c0473f;
}

.sim-flow-categories .buttie-transition small.safe {
  background: #dff1d9;
  color: #3e7a34;
}

.sim-flow-categories .buttie-transition > b {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d99b19;
  font-size: 25px;
  font-weight: 500;
}

.sim-flow-categories .buttie-transition > b i {
  display: none;
}

.sim-flow-categories > .period-section {
  width: 100%;
  margin: 16px 0 0;
  padding: 15px 18px 17px;
  border: 1px solid rgb(0 0 0 / 6%);
  border-radius: 20px;
  background: #fff;
}

.sim-flow-categories > .period-section h2 {
  color: var(--text);
  font-size: 17px;
  font-weight: 800;
}

.sim-flow-categories > .period-section > p {
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
}

.sim-flow-categories .period-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 10px;
}

.sim-flow-categories .period-presets button {
  min-height: 34px;
  padding: 0 16px;
  border: 1px solid #dedfe5;
  border-radius: 999px;
  background: #fff;
  color: #57503f;
  font-size: var(--type-button-choice-size) !important;
  font-weight: var(--type-button-choice-weight) !important;
}

.sim-flow-categories .period-presets button.active {
  border-color: var(--accent-strong);
  background: #fff6dc;
  color: #8a6407;
  font-weight: 700;
}

.sim-flow-categories .period-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  margin-top: 11px;
}

.sim-flow-categories .period-grid label {
  min-height: 62px;
  padding: 8px 13px;
  border: 1px solid rgb(190 160 50 / 24%);
  border-radius: 14px;
  background: #fffbec;
  box-shadow: none;
}

.sim-flow-categories .period-grid label > span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.sim-flow-categories .period-grid input[type='date'] {
  height: 30px;
  padding: 0 24px 0 0;
  border: 0;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--text);
  font-size: 16px;
  font-weight: 700;
}

.sim-flow-categories .period-separator {
  display: block;
  color: var(--muted);
  font-size: 15px;
  font-style: normal;
  text-align: center;
}

.sim-flow-categories > .wide {
  width: 100%;
  min-height: 56px;
  margin: 18px 0 0;
  border-radius: 16px;
  background: var(--accent-strong);
  box-shadow: 0 4px 0 rgb(180 140 30 / 30%);
  color: #3a3222;
  font-size: 18px;
  font-weight: 800;
}

@media (max-width: 767px) {
  .sim-wizard.sim-flow-categories {
    width: 100%;
    padding: 2px 4px 82px;
  }

  .sim-flow-categories > .wizard-title {
    font-size: 22px !important;
  }

  .category-intro-card > .sim-subtitle {
    font-size: 14px;
  }

  .category-intro-card > .buttie-transition {
    min-height: 148px;
    grid-template-columns: 1fr 48px 1fr;
    margin: 12px 0 0;
    padding: 0;
  }

  .category-intro-card {
    padding: 14px 14px 16px;
  }

  .sim-flow-categories .buttie-transition img {
    width: 96px;
    height: 66px;
  }

  .sim-flow-categories .buttie-transition > div:last-child img {
    width: 76px;
  }

  .sim-flow-categories .buttie-transition > b i {
    width: 22px;
  }

  .sim-flow-categories > .period-section {
    padding: 14px 14px 16px;
  }

  .sim-flow-categories .period-grid {
    grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr) !important;
    gap: 5px;
  }

  .sim-flow-categories .period-grid label {
    min-height: 60px;
    padding: 8px 9px;
  }

  .sim-flow-categories .period-grid input[type='date'] {
    font-size: 14px;
  }

  .sim-flow-categories > .wide {
    min-height: 54px;
    margin-top: 16px;
    font-size: 17px;
  }
}

/* 확정 항목 이름과 금액의 반응형 타이포그래피를 동일한 굵기로 통일한다. */
:global(#app .app-shell main .sim-flow-confirm .edit-summary > p > .confirm-item-name),
:global(#app .app-shell main .sim-flow-confirm .edit-summary > p > strong) {
  font-size: 16px !important;
  font-weight: 500 !important;
}

@media (max-width: 767px) {
  :global(#app .app-shell main .sim-flow-confirm .edit-summary > p > .confirm-item-name),
  :global(#app .app-shell main .sim-flow-confirm .edit-summary > p > strong) {
    font-size: 14px !important;
    font-weight: 500 !important;
  }
}

:global(#app .app-shell main .sim-flow-confirm .confirm-policy-amount) {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0 4px;
  text-align: right;
}

:global(#app .app-shell main .sim-flow-confirm .confirm-policy-amount > span) {
  white-space: nowrap;
}

:global(#app .app-shell main .sim-flow-confirm .edit-summary header button.confirm-edit-action) {
  display: grid;
  width: 28px;
  min-width: 28px;
  height: 28px;
  min-height: 28px;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #5f8df7;
  text-decoration: none;
}

:global(
  #app .app-shell main .sim-flow-confirm .edit-summary header button.confirm-edit-action:hover
) {
  background: #f0f4ff;
}

:global(
  #app .app-shell main .sim-flow-confirm .edit-summary header button.confirm-edit-action .app-icon
) {
  width: 18px;
  height: 18px;
}

/* confirm 버튼이 430px 기본 wizard 폭에 갇히지 않도록 상위 컨테이너부터 확장한다. */
@media (min-width: 768px) {
  :global(#app .app-shell main .sim-wizard.sim-flow-confirm) {
    width: min(100%, 1066px) !important;
    max-width: 1066px !important;
  }

  :global(#app .app-shell main .sim-wizard.sim-flow-confirm > .wizard-actions.confirm-actions) {
    display: grid !important;
    width: 100% !important;
    max-width: none !important;
    grid-template-columns: minmax(0, 1fr) !important;
    justify-self: stretch !important;
    margin-right: 0 !important;
    margin-left: 0 !important;
  }

  :global(
    #app .app-shell main .sim-wizard.sim-flow-confirm > .wizard-actions.confirm-actions > button
  ) {
    width: 100% !important;
    max-width: none !important;
    justify-self: stretch !important;
  }
}
@media (min-width: 768px) {
  :global(#app .app-shell main .sim-flow-confirm .final-result > span) {
    font-weight: 600 !important;
  }
}
</style>
