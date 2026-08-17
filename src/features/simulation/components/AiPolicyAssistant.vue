<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import {
  getExpenseRecommendationsApi,
  getIncomeRecommendationsApi,
  getPolicyRecommendationsApi,
} from '@/api/simulation'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { expenseCategoryLabel } from '@/constants/expenseCategories'
import { mapPolicyResponse } from '@/mappers/policy'
import assistantAvatar from '@/assets/images/simulation/buttie-ai-assistant.png'

const props = defineProps({
  category: {
    type: String,
    default: 'policy',
    validator: (value) => ['expense', 'income', 'policy'].includes(value),
  },
})

const simulation = useSimulationStore()
const open = ref(false)
const prompt = ref('')
const loading = ref(false)
const errorMessage = ref('')
const recommendations = ref([])
const conversation = ref(null)
const input = ref(null)
const panel = ref(null)
let panelAnimation = null
const PROMPT_LINE_HEIGHT = 20
const PROMPT_MAX_LINES = 4

function resizePromptInput() {
  const element = input.value
  if (!element) return

  const maxHeight = PROMPT_LINE_HEIGHT * PROMPT_MAX_LINES
  element.style.height = 'auto'
  const nextHeight = Math.max(PROMPT_LINE_HEIGHT, Math.min(element.scrollHeight, maxHeight))

  element.style.height = `${nextHeight}px`
  element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

watch(
  prompt,
  () => {
    nextTick(resizePromptInput)
  },
  { flush: 'post' },
)

const selectedIds = computed(() => new Set(simulation.state.policies.map((policy) => policy.id)))
const assistantCopy = computed(
  () =>
    ({
      expense: {
        title: '버티 AI 지출 추천',
        description: '줄이고 싶은 소비를 편하게 물어보세요.',
        heading: '어떤 지출을 줄이고 싶으세요?',
        guide: '지난달 소비 내역을 바탕으로 실천 가능한 목표를 추천해요.',
        placeholder: '예: 카페와 배달비를 줄이고 싶어요',
        thinking: '지난달 소비에서 줄일 수 있는 항목을 찾고 있어요.',
        emptyTitle: '조건에 맞는 지출 절약 목표를 찾지 못했어요.',
        emptyGuide: '줄이고 싶은 소비나 월 목표를 조금 더 구체적으로 입력해 보세요.',
        suggestions: [
          '카페와 배달비를 줄이고 싶어요',
          '쇼핑 지출을 줄이고 싶어요',
          '교통비를 아끼고 싶어요',
        ],
      },
      income: {
        title: '버티 AI 수입 추천',
        description: '원하는 일자리를 편하게 물어보세요.',
        heading: '어떤 수입을 늘리고 싶으세요?',
        guide: '희망 조건에 맞는 고용24의 최신 시간제·단기 공고를 찾아요.',
        placeholder: '예: 주말 저녁 카페 알바를 찾고 싶어요',
        thinking: '조건에 맞는 일자리 공고를 찾고 있어요.',
        emptyTitle: '조건에 맞는 일자리 공고를 찾지 못했어요.',
        emptyGuide: '근무 지역이나 요일, 시간대를 조금 더 구체적으로 입력해 보세요.',
        suggestions: ['주말 저녁 카페 알바', '서울 단기 사무 보조', '재택으로 할 수 있는 부업'],
      },
      policy: {
        title: '버티 AI 정책 추천',
        description: '원하는 지원을 편하게 물어보세요.',
        heading: '어떤 지원이 필요하세요?',
        guide: '사용자의 지역·나이·취업 준비 상태는 자동으로 반영돼요.',
        placeholder: '예: 자격증 비용을 지원받고 싶어요',
        thinking: '내 조건에 맞는 정책을 찾고 있어요.',
        emptyTitle: '조건에 맞는 추천 정책을 찾지 못했어요.',
        emptyGuide: '원하는 지원 내용이나 목적을 조금 더 구체적으로 입력해 보세요.',
        suggestions: ['자격증 준비 비용 지원', '취업 준비 생활비 지원', '서울 청년 주거 지원'],
      },
    })[props.category],
)
const canSubmit = computed(() => prompt.value.trim().length > 0 && !loading.value)

const normalizedRecommendations = computed(() => {
  const value = recommendations.value
  if (props.category === 'expense') {
    return value?.financialRecommendation?.recommendations || value?.recommendations || value || []
  }
  if (props.category === 'income') {
    return value?.incomeRecommendation?.jobs || value?.jobs || value || []
  }
  return value?.policyRecommendations || value || []
})

const expenseRecommendations = computed(() =>
  (Array.isArray(normalizedRecommendations.value) ? normalizedRecommendations.value : [])
    .map((item, index) => {
      const category = item?.category || item?.expenseCategory
      const name = expenseCategoryLabel(category)
      const current =
        simulation.state.expenses.find((expense) => expense.name === name)?.current || 0
      const suggested = Math.floor((Number(item?.suggestedMonthlyAmount) || 0) / 100) * 100
      return {
        id: `${category || name}-${index}`,
        category,
        name,
        title: item?.title || `${name} 지출 줄이기`,
        reason: item?.reason || '지난달 소비 내역을 기준으로 추천한 절약 목표예요.',
        amount: Math.min(current, suggested),
        current,
      }
    })
    .filter((item) => item.amount > 0),
)

const incomeRecommendations = computed(() =>
  (Array.isArray(normalizedRecommendations.value) ? normalizedRecommendations.value : []).filter(
    (item) => item && (item.title || item.company),
  ),
)
const incomePayload = computed(
  () => recommendations.value?.incomeRecommendation || recommendations.value || {},
)
const incomeNotice = computed(() => String(incomePayload.value?.notice || '').trim())
const incomeLinks = computed(() =>
  (Array.isArray(incomePayload.value?.links) ? incomePayload.value.links : []).filter(
    (item) => item?.url,
  ),
)

const policyRecommendations = computed(() =>
  (Array.isArray(normalizedRecommendations.value) ? normalizedRecommendations.value : [])
    .map(mapPolicyResponse)
    .filter(Boolean),
)

const hasRecommendations = computed(() => {
  if (props.category === 'expense') return expenseRecommendations.value.length > 0
  if (props.category === 'income') return incomeRecommendations.value.length > 0
  return policyRecommendations.value.length > 0
})

function playPanelAnimation(keyframes, options) {
  panelAnimation?.cancel()

  if (!panel.value?.animate) {
    return Promise.resolve()
  }

  panelAnimation = panel.value.animate(keyframes, options)
  return panelAnimation.finished.catch(() => undefined)
}

async function openAssistant() {
  open.value = true
  await nextTick()
  resizePromptInput()

  await playPanelAnimation(
    [
      { transform: 'translate3d(0, 24px, 0) scale(0.96)', opacity: 0 },
      {
        transform: 'translate3d(0, -2px, 0) scale(1.005)',
        opacity: 1,
        offset: 0.72,
      },
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
    ],
    {
      duration: 500,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    },
  )

  panelAnimation?.cancel()
  panelAnimation = null
  input.value?.focus()
}

async function closeAssistant() {
  await playPanelAnimation(
    [
      { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
      { transform: 'translate3d(0, 12px, 0) scale(0.98)', opacity: 0 },
    ],
    {
      duration: 220,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      fill: 'both',
    },
  )

  open.value = false
  panelAnimation?.cancel()
  panelAnimation = null
}

function recommendationErrorMessage(error) {
  if (error?.status === 503) {
    return 'AI 추천을 지금 생성할 수 없습니다. 잠시 후 다시 시도해주세요.'
  }
  if (
    error?.status === 401 ||
    (error?.status >= 500 && String(error?.message || '').includes('인증 정보'))
  ) {
    return '로그인 인증 정보가 없습니다. 다시 로그인한 뒤 이용해 주세요.'
  }
  return error?.message || 'AI 추천을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

async function submitPrompt() {
  const question = prompt.value.trim()
  if (!question || loading.value) return

  conversation.value = question
  prompt.value = ''
  errorMessage.value = ''
  recommendations.value = []
  loading.value = true

  try {
    recommendations.value =
      props.category === 'expense'
        ? await getExpenseRecommendationsApi(question)
        : props.category === 'income'
          ? await getIncomeRecommendationsApi(question)
          : await getPolicyRecommendationsApi(question)
  } catch (error) {
    errorMessage.value = recommendationErrorMessage(error)
  } finally {
    loading.value = false
    nextTick(() => input.value?.focus())
  }
}

function togglePolicy(policy) {
  simulation.togglePolicy(policy)
}

function addExpenseRecommendation(item) {
  simulation.setExpenseSaving(item.name, item.amount)
}

function expenseSelected(item) {
  const expense = simulation.state.expenses.find((entry) => entry.name === item.name)
  return Boolean(expense?.selected && Number(expense.saving) === Number(item.amount))
}
</script>

<template>
  <Teleport to="body">
    <button
      v-if="!open"
      class="ai-policy-launcher"
      type="button"
      :aria-label="`${assistantCopy.title} 열기`"
      @click="openAssistant"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 18.2 3.8 20l.9-3.6A8 8 0 1 1 7 18.2Z" />
        <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" />
      </svg>
      <span>AI</span>
    </button>

  <section
    v-if="open"
    ref="panel"
    class="ai-policy-panel"
    role="dialog"
    aria-modal="false"
    aria-labelledby="ai-policy-title"
  >
      <header class="ai-policy-panel__header">
        <div>
          <span class="ai-policy-panel__mark">
            <img :src="assistantAvatar" alt="버티 AI 추천" />
          </span>
          <div>
            <h2 id="ai-policy-title">{{ assistantCopy.title }}</h2>
            <p>{{ assistantCopy.description }}</p>
          </div>
        </div>
        <nav aria-label="AI 추천 창 제어">
          <button type="button" aria-label="AI 추천 접기" title="접기" @click="closeAssistant">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12h12" />
            </svg>
          </button>
        </nav>
      </header>

      <div class="ai-policy-panel__body" aria-live="polite">
        <div class="ai-policy-welcome">
          <span class="ai-policy-welcome__spark">✦</span>
          <h3>{{ assistantCopy.heading }}</h3>
          <p>{{ assistantCopy.guide }}</p>
          <div class="ai-policy-suggestions" aria-label="추천 질문">
            <button
              v-for="suggestion in assistantCopy.suggestions"
              :key="suggestion"
              type="button"
              @click="prompt = suggestion"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <div v-if="conversation" class="ai-policy-message ai-policy-message--user">
          {{ conversation }}
        </div>

        <div v-if="loading" class="ai-policy-thinking">
          <span /><span /><span />
          <p>{{ assistantCopy.thinking }}</p>
        </div>

        <div v-else-if="errorMessage" class="ai-policy-error">
          <p>{{ errorMessage }}</p>
          <button type="button" @click="prompt = conversation || ''">다시 입력하기</button>
        </div>

        <div v-else-if="conversation && !hasRecommendations" class="ai-policy-empty">
          <p>{{ assistantCopy.emptyTitle }}</p>
          <span>{{
            category === 'income' && incomeNotice ? incomeNotice : assistantCopy.emptyGuide
          }}</span>
          <div v-if="category === 'income' && incomeLinks.length" class="ai-income-links">
            <a
              v-for="link in incomeLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ link.platform || '채용 사이트' }}에서 직접 찾아보기
            </a>
          </div>
        </div>

        <div
          v-if="category === 'expense' && expenseRecommendations.length"
          class="ai-policy-results"
        >
          <p>이런 절약 목표를 추천해요.</p>
          <article v-for="item in expenseRecommendations" :key="item.id">
            <div>
              <span>AI 추천</span>
              <h3>{{ item.title }}</h3>
              <p>월 {{ item.amount.toLocaleString('ko-KR') }}원 절약</p>
            </div>
            <dl>
              <div>
                <dt>카테고리</dt>
                <dd>{{ item.name }}</dd>
              </div>
              <div>
                <dt>지난달 지출</dt>
                <dd>{{ item.current.toLocaleString('ko-KR') }}원</dd>
              </div>
              <div>
                <dt>추천 이유</dt>
                <dd>{{ item.reason }}</dd>
              </div>
            </dl>
            <footer>
              <button
                type="button"
                :class="{ selected: expenseSelected(item) }"
                @click="addExpenseRecommendation(item)"
              >
                {{ expenseSelected(item) ? '✓ 추가됨' : '+ 시뮬레이션에 추가' }}
              </button>
            </footer>
          </article>
        </div>

        <div v-if="category === 'income' && incomeRecommendations.length" class="ai-policy-results">
          <p>이런 일자리 공고를 추천해요.</p>
          <article
            v-for="(job, index) in incomeRecommendations"
            :key="job.url || `${job.title}-${index}`"
          >
            <div>
              <span>고용24 추천</span>
              <h3>{{ job.title }}</h3>
              <p>{{ job.company || '기업 정보 확인' }}</p>
            </div>
            <dl>
              <div>
                <dt>근무 지역</dt>
                <dd>{{ job.region || '공고에서 확인' }}</dd>
              </div>
              <div>
                <dt>급여</dt>
                <dd>{{ job.pay || '공고에서 확인' }}</dd>
              </div>
              <div>
                <dt>고용 형태</dt>
                <dd>{{ job.employmentType || '공고에서 확인' }}</dd>
              </div>
            </dl>
            <footer>
              <a v-if="job.url" :href="job.url" target="_blank" rel="noopener noreferrer"
                >공고 보기</a
              >
            </footer>
          </article>
        </div>

        <div v-if="category === 'policy' && policyRecommendations.length" class="ai-policy-results">
          <p>이런 정책을 추천해요.</p>
          <article v-for="policy in policyRecommendations" :key="policy.id">
            <div>
              <span>AI 추천</span>
              <h3>{{ policy.name }}</h3>
              <p>{{ policy.detail }}</p>
            </div>
            <dl>
              <div>
                <dt>지원 기간</dt>
                <dd>{{ policy.supportPeriod }}</dd>
              </div>
              <div>
                <dt>신청 기한</dt>
                <dd>{{ policy.deadline }}</dd>
              </div>
              <div>
                <dt>필요 서류</dt>
                <dd>{{ policy.requiredDocument || '상세 페이지에서 확인' }}</dd>
              </div>
            </dl>
            <footer>
              <a v-if="policy.url" :href="policy.url" target="_blank" rel="noopener noreferrer">
                자세히 보기
              </a>
              <button
                type="button"
                :class="{ selected: selectedIds.has(policy.id) }"
                @click="togglePolicy(policy)"
              >
                {{ selectedIds.has(policy.id) ? '✓ 추가됨' : '+ 시뮬레이션에 추가' }}
              </button>
            </footer>
          </article>
        </div>
      </div>

      <form class="ai-policy-composer" @submit.prevent="submitPrompt">
        <textarea
          ref="input"
          v-model="prompt"
          rows="1"
          maxlength="500"
          :placeholder="assistantCopy.placeholder"
          :aria-label="`${assistantCopy.title} 질문`"
          @keydown.enter.exact.prevent="submitPrompt"
        />
        <button type="submit" :disabled="!canSubmit" aria-label="질문 보내기">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 19V5M6.5 10.5 12 5l5.5 5.5" />
          </svg>
        </button>
      </form>
      <p class="ai-policy-disclaimer">
        AI 추천은 참고용이며, 적용 전 추천 금액과 상세 조건을 확인해 주세요.
      </p>
    </section>
  </Teleport>
</template>

<style scoped>
.ai-policy-launcher {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 1600;
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #101b70;
  color: #fff;
  box-shadow: 0 10px 30px rgb(16 27 112 / 28%);
  cursor: pointer;
}

.ai-policy-launcher:hover {
  transform: translateY(-2px);
}
.ai-policy-launcher svg {
  width: 28px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}
.ai-policy-launcher span {
  position: absolute;
  right: -3px;
  top: -3px;
  display: grid;
  min-width: 25px;
  height: 25px;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 999px;
  background: #f5b93f;
  color: #101b70;
  font-size: 9px;
  font-weight: 900;
}

.ai-policy-panel {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 1600;
  display: grid;
  width: min(430px, calc(100vw - 32px));
  height: min(720px, calc(100dvh - 56px));
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  overflow: hidden;
  border: 1px solid #dfe2ea;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 20px 55px rgb(20 26 48 / 22%);
  color: #171d2a;
  transform: translate3d(0, 0, 0);
  transform-origin: right bottom;
  will-change: transform, opacity;
}

.ai-policy-panel__header {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid #eceef3;
}
.ai-policy-panel__header > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}
.ai-policy-panel__mark {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 13px;
  overflow: hidden;
  background: #ffc03c;
}
.ai-policy-panel__mark img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ai-policy-panel__header h2 {
  margin: 0;
  font-size: 16px;
}
.ai-policy-panel__header p {
  margin: 3px 0 0;
  color: #858b98;
  font-size: 11px;
}
.ai-policy-panel__header nav {
  display: flex;
  gap: 3px;
}
.ai-policy-panel__header nav button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #5f6673;
  cursor: pointer;
}
.ai-policy-panel__header nav button:hover {
  background: #f2f3f7;
}
.ai-policy-panel__header nav svg {
  width: 21px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.ai-policy-panel__body {
  min-height: 0;
  overflow-y: auto;
  padding: 22px 18px;
  background: #fafbfe;
}
.ai-policy-welcome {
  display: grid;
  justify-items: center;
  padding: 19px 12px 22px;
  text-align: center;
}
.ai-policy-welcome__spark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 14px;
  background: #fff1bd;
  color: #c58911;
  font-size: 22px;
}
.ai-policy-welcome h3 {
  margin: 13px 0 5px;
  font-size: 19px;
}
.ai-policy-welcome > p {
  max-width: 290px;
  margin: 0;
  color: #707887;
  font-size: 14px;
  line-height: 1.55;
}
.ai-policy-suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin-top: 17px;
}
.ai-policy-suggestions button {
  padding: 8px 11px;
  border: 1px solid #dfe3ec;
  border-radius: 999px;
  background: #fff;
  color: #3d4656;
  font-size: 11px;
  cursor: pointer;
}
.ai-policy-suggestions button:hover {
  border-color: #f0b33a;
  background: #fffaf0;
}

.ai-policy-message {
  width: fit-content;
  max-width: 84%;
  margin: 2px 0 17px auto;
  padding: 10px 14px;
  border-radius: 17px 17px 4px 17px;
  font-size: 12px;
  line-height: 1.5;
}
.ai-policy-message--user {
  background: #101b70;
  color: #fff;
}
.ai-policy-thinking {
  display: flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  padding: 12px 14px;
  border-radius: 4px 17px 17px;
  background: #fff;
  box-shadow: 0 2px 10px rgb(25 33 56 / 7%);
}
.ai-policy-thinking span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e9aa2a;
  animation: ai-policy-bounce 1s infinite alternate;
}
.ai-policy-thinking span:nth-child(2) {
  animation-delay: 0.2s;
}
.ai-policy-thinking span:nth-child(3) {
  animation-delay: 0.4s;
}
.ai-policy-thinking p {
  margin: 0 0 0 6px;
  color: #6f7683;
  font-size: 11px;
}
@keyframes ai-policy-bounce {
  to {
    transform: translateY(-4px);
    opacity: 0.5;
  }
}

.ai-policy-error,
.ai-policy-empty {
  padding: 15px;
  border-radius: 14px;
  background: #fff1f1;
  color: #a64141;
  font-size: 12px;
  line-height: 1.5;
}
.ai-policy-error p,
.ai-policy-empty p {
  margin: 0;
  font-weight: 700;
}
.ai-policy-error button {
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 11px;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.ai-policy-empty {
  background: #f0f2f7;
  color: #596171;
  text-align: center;
}
.ai-policy-empty span {
  display: block;
  margin-top: 4px;
  color: #858b97;
  font-size: 10px;
}
.ai-income-links {
  display: flex;
  justify-content: center;
  margin-top: 11px;
}
.ai-income-links a {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  padding: 0 13px;
  border-radius: 9px;
  background: #101b70;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
}

.ai-policy-results > p {
  margin: 0 0 9px;
  color: #555e6e;
  font-size: 12px;
  font-weight: 700;
}
.ai-policy-results article {
  margin-top: 10px;
  padding: 16px;
  border: 1px solid #e0e3ea;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(24 31 51 / 6%);
}
.ai-policy-results article > div > span {
  display: inline-block;
  padding: 4px 7px;
  border-radius: 999px;
  background: #fff1bd;
  color: #9b6b0b;
  font-size: 9px;
  font-weight: 800;
}
.ai-policy-results h3 {
  margin: 9px 0 5px;
  font-size: 14px;
  line-height: 1.4;
}
.ai-policy-results article > div > p {
  margin: 0;
  color: #192987;
  font-size: 12px;
  font-weight: 800;
}
.ai-policy-results dl {
  display: grid;
  gap: 7px;
  margin: 13px 0 0;
  padding-top: 11px;
  border-top: 1px solid #eef0f4;
}
.ai-policy-results dl div {
  display: grid;
  grid-template-columns: 65px 1fr;
  gap: 8px;
  font-size: 10px;
  line-height: 1.45;
}
.ai-policy-results dt {
  color: #9096a2;
}
.ai-policy-results dd {
  margin: 0;
  color: #4a5260;
}
.ai-policy-results footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 13px;
}
.ai-policy-results footer a,
.ai-policy-results footer button {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
}
.ai-policy-results footer a {
  display: inline-flex;
  align-items: center;
  border: 1px solid #dcdfe7;
  color: #5d6573;
}
.ai-policy-results footer button {
  border: 0;
  background: #101b70;
  color: #fff;
  cursor: pointer;
}
.ai-policy-results footer button.selected {
  background: #eaf7f1;
  color: #23875d;
}

.ai-policy-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  align-items: center;
  gap: 6px;
  margin: 10px 14px 5px;
  padding: 5px 5px 5px 12px;
  border: 1px solid #dfe2e9;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 3px 13px rgb(24 31 51 / 7%);
}
.ai-policy-composer textarea {
  min-width: 0;
  height: 20px;
  min-height: 20px;
  max-height: 80px;
  padding: 0;
  overflow-y: hidden;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: #222a37;
  font: inherit;
  font-size: 14px;
  line-height: 20px;
}
.ai-policy-composer textarea::placeholder {
  color: #a1a6b0;
}
.ai-policy-composer button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #101b70;
  color: #fff;
  cursor: pointer;
}
.ai-policy-composer button:disabled {
  background: #e7e9ee;
  color: #aeb3bd;
  cursor: default;
}
.ai-policy-composer svg {
  width: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}
.ai-policy-disclaimer {
  margin: 0 15px 12px;
  color: #9a9faa;
  font-size: 9px;
  text-align: center;
}

@media (max-width: 767px) {
  .ai-policy-launcher {
    right: 18px;
    bottom: calc(var(--bottom-nav-height) + 18px);
    width: 56px;
    height: 56px;
  }
  .ai-policy-panel {
    right: 10px;
    bottom: calc(var(--bottom-nav-height) + 8px);
    width: calc(100vw - 20px);
    height: min(680px, calc(100dvh - var(--bottom-nav-height) - 20px));
    border-radius: 21px;
    transform-origin: center bottom;
  }
  .ai-policy-panel__header {
    min-height: 70px;
    padding: 13px 15px;
  }
  .ai-policy-panel__body {
    padding: 16px 14px;
  }
  .ai-policy-welcome {
    padding-top: 11px;
  }
}

</style>
