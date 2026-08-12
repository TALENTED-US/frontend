<script setup>
import { computed, onMounted, ref } from 'vue'
import { getTimelineApi } from '@/api/timeline'

const AVERAGE_MONTH_DAYS = 365.2425 / 12
const DAY_MS = 24 * 60 * 60 * 1000
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'
const SUSTAINABLE_MONTHS = 999
const mockTimeline = {
  currentPrepMonths: 2.6,
  expectPrepMonths: 8.2,
  livingFundThreshold: 500000,
  simulationId: 'mock-simulation',
  targetEmploymentDate: '2027-01-01',
}

const timeline = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const selectedEventId = ref('today')

function startOfToday() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

function parseLocalDate(value) {
  const [year, month, day] = String(value || '')
    .split('-')
    .map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addAverageMonths(date, months) {
  const result = new Date(date)
  result.setDate(result.getDate() + Math.round(Number(months) * AVERAGE_MONTH_DAYS))
  return result
}

function formatDate(date) {
  if (!date) return '-'
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatMonth(date) {
  if (!date) return '-'
  return `${String(date.getFullYear()).slice(2)}년 ${date.getMonth() + 1}월`
}

function formatWon(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  return `${amount.toLocaleString('ko-KR')}원`
}

function normalizedMonths(value) {
  const months = Number(value)
  return Number.isFinite(months) && months >= 0 ? months : null
}

function formatPrepMonths(value) {
  const months = normalizedMonths(value)
  if (months === null) return '-'
  if (months >= SUSTAINABLE_MONTHS) return '고갈 예상 없음'
  return `${months.toFixed(1)}개월`
}

const today = computed(() => startOfToday())
const targetDate = computed(() => parseLocalDate(timeline.value?.targetEmploymentDate))
const currentMonths = computed(() => normalizedMonths(timeline.value?.currentPrepMonths))
const expectedMonths = computed(() => normalizedMonths(timeline.value?.expectPrepMonths))
const currentEndDate = computed(() => {
  if (currentMonths.value === null || currentMonths.value >= SUSTAINABLE_MONTHS) return null
  return addAverageMonths(today.value, currentMonths.value)
})
const expectedEndDate = computed(() => {
  if (expectedMonths.value === null || expectedMonths.value >= SUSTAINABLE_MONTHS) return null
  return addAverageMonths(today.value, expectedMonths.value)
})
const hasSimulation = computed(() => Boolean(timeline.value?.simulationId))

const events = computed(() => {
  const rows = [
    {
      id: 'today',
      date: today.value,
      title: '현재 시점',
      description: '현재 자금 상태를 기준으로 계산한 시작 시점이에요.',
      tone: 'primary',
    },
  ]

  if (currentEndDate.value) {
    rows.push({
      id: 'current-end',
      date: currentEndDate.value,
      title: '현재 자금 예상 소진 시점',
      description: `현재 현금 흐름을 유지하면 약 ${currentMonths.value.toFixed(1)}개월 동안 버틸 수 있어요.`,
      tone: 'danger',
    })
  }

  if (hasSimulation.value && expectedEndDate.value) {
    rows.push({
      id: 'expected-end',
      date: expectedEndDate.value,
      title: '계획 적용 후 예상 소진 시점',
      description: `확정한 계획을 적용하면 약 ${expectedMonths.value.toFixed(1)}개월 동안 버틸 수 있어요.`,
      tone: 'scenario',
    })
  }

  if (targetDate.value) {
    rows.push({
      id: 'target',
      date: targetDate.value,
      title: '목표 취업일',
      description: '취업 준비 정보에 등록한 목표 시점이에요.',
      tone: 'warning',
    })
  }

  return rows.sort((a, b) => a.date - b.date)
})

const selectedEvent = computed(
  () => events.value.find((event) => event.id === selectedEventId.value) || events.value[0],
)
const rangeEnd = computed(() => {
  const dates = events.value.map((event) => event.date.getTime())
  return new Date(Math.max(today.value.getTime() + DAY_MS, ...dates))
})
const rangeLabel = computed(() => `${formatMonth(today.value)} — ${formatMonth(rangeEnd.value)}`)

function eventPosition(date) {
  const duration = Math.max(DAY_MS, rangeEnd.value.getTime() - today.value.getTime())
  const elapsed = date.getTime() - today.value.getTime()
  return `${Math.min(100, Math.max(0, (elapsed / duration) * 100))}%`
}

async function loadTimeline() {
  loading.value = true
  errorMessage.value = ''

  try {
    timeline.value = USE_MOCK_API ? mockTimeline : await getTimelineApi()
    selectedEventId.value = targetDate.value ? 'target' : 'today'
  } catch (error) {
    errorMessage.value = error.message || '타임라인을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadTimeline)
</script>

<template>
  <section class="page">
    <header class="page-heading">
      <div>
        <h1 class="page-title">재정 타임라인</h1>
        <p class="page-description">
          현재 자금과 확정한 계획을 기준으로 버티는 기간과 목표 시점을 보여드려요.
        </p>
      </div>
      <span v-if="timeline" class="pill">{{ rangeLabel }}</span>
    </header>

    <article v-if="loading" class="state-card card" aria-live="polite">
      타임라인을 불러오는 중이에요.
    </article>

    <article v-else-if="errorMessage" class="state-card state-card--error card" role="alert">
      <strong>타임라인을 불러오지 못했어요.</strong>
      <span>{{ errorMessage }}</span>
      <button type="button" @click="loadTimeline">다시 시도</button>
    </article>

    <template v-else-if="timeline">
      <div class="summary-grid">
        <article class="summary-card card">
          <span>현재 버티는 기간</span>
          <strong>{{ formatPrepMonths(timeline.currentPrepMonths) }}</strong>
          <small>현재 현금 흐름 기준</small>
        </article>
        <article class="summary-card summary-card--scenario card">
          <span>계획 적용 후</span>
          <strong>{{ hasSimulation ? formatPrepMonths(timeline.expectPrepMonths) : '-' }}</strong>
          <small>{{ hasSimulation ? '확정 시뮬레이션 기준' : '확정된 계획이 없어요' }}</small>
        </article>
        <article class="summary-card summary-card--threshold card">
          <span>생활자금 최소 기준</span>
          <strong>{{ formatWon(timeline.livingFundThreshold) }}</strong>
          <small>이 금액 아래부터 위험 구간이에요</small>
        </article>
      </div>

      <article class="timeline-chart card">
        <header>
          <div>
            <h2 class="section-title">주요 시점</h2>
            <p>표시된 지점을 선택하면 상세 내용을 확인할 수 있어요.</p>
          </div>
          <span>{{ rangeLabel }}</span>
        </header>

        <div class="timeline-track" role="list" aria-label="재정 주요 시점">
          <div class="timeline-track__line" />
          <button
            v-for="event in events"
            :key="event.id"
            type="button"
            class="timeline-marker"
            :class="[`timeline-marker--${event.tone}`, { active: selectedEvent?.id === event.id }]"
            :style="{ left: eventPosition(event.date) }"
            :aria-label="`${formatDate(event.date)} ${event.title}`"
            role="listitem"
            @click="selectedEventId = event.id"
          >
            <i />
            <span>{{ formatMonth(event.date) }}</span>
          </button>
        </div>
      </article>

      <div class="timeline-grid">
        <article v-if="selectedEvent" class="card event-detail">
          <span>{{ formatDate(selectedEvent.date) }}</span>
          <strong>{{ selectedEvent.title }}</strong>
          <p>{{ selectedEvent.description }}</p>
        </article>

        <article class="card events">
          <h2 class="section-title">전체 일정</h2>
          <button
            v-for="event in events"
            :key="event.id"
            type="button"
            :class="{ active: selectedEvent?.id === event.id }"
            @click="selectedEventId = event.id"
          >
            <span>{{ formatDate(event.date) }}</span>
            <i :class="`tone-${event.tone}`" />
            <div>
              <strong>{{ event.title }}</strong>
              <small>{{ event.description }}</small>
            </div>
            <b>›</b>
          </button>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.state-card {
  display: grid;
  min-height: 180px;
  place-content: center;
  gap: 10px;
  color: var(--muted);
  text-align: center;
}

.state-card--error strong {
  color: var(--text);
}

.state-card button {
  justify-self: center;
  padding: 10px 18px;
  border-radius: 10px;
  background: var(--primary);
  color: white;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  display: grid;
  gap: 7px;
  padding: 22px;
  border-top: 4px solid var(--primary);
}

.summary-card--scenario {
  border-top-color: #7e9de9;
}

.summary-card--threshold {
  border-top-color: var(--warning);
}

.summary-card span,
.summary-card small {
  color: var(--muted);
  font-size: var(--font-small);
}

.summary-card strong {
  font-size: clamp(20px, 2.2vw, 30px);
}

.timeline-chart {
  min-height: 260px;
  margin-top: 18px;
  padding: 26px 30px;
}

.timeline-chart header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.timeline-chart header p,
.timeline-chart header > span {
  color: var(--muted);
  font-size: var(--font-small);
}

.timeline-chart header p {
  margin-top: 5px;
}

.timeline-track {
  position: relative;
  height: 120px;
  margin: 48px 30px 0;
}

.timeline-track__line {
  position: absolute;
  top: 18px;
  right: 0;
  left: 0;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), #8facf5 62%, var(--warning));
}

.timeline-marker {
  position: absolute;
  top: 0;
  display: grid;
  width: max-content;
  max-width: 110px;
  justify-items: center;
  gap: 9px;
  transform: translateX(-50%);
  color: var(--muted);
  font-size: 11px;
}

.timeline-marker:first-of-type {
  transform: translateX(0);
}

.timeline-marker:last-of-type {
  transform: translateX(-100%);
}

.timeline-marker i {
  width: 42px;
  height: 42px;
  border: 5px solid white;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 2px 8px rgb(14 26 90 / 22%);
}

.timeline-marker--scenario i {
  background: #7e9de9;
}

.timeline-marker--danger i {
  background: #ef6464;
}

.timeline-marker--warning i {
  background: var(--warning);
}

.timeline-marker.active i {
  outline: 4px solid rgb(10 22 128 / 14%);
}

.timeline-marker.active span {
  color: var(--text);
  font-weight: 800;
}

.timeline-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.6fr);
  gap: 18px;
  margin-top: 18px;
}

.event-detail {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 24px;
  background: var(--sky-soft);
}

.event-detail > span {
  color: var(--primary);
  font-size: var(--font-small);
  font-weight: 800;
}

.event-detail > strong {
  font-size: var(--font-title);
}

.event-detail p {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-body);
  line-height: 1.6;
}

.events {
  padding: 22px;
}

.events h2 {
  margin-bottom: 12px;
}

.events button {
  display: grid;
  grid-template-columns: 88px 10px 1fr 20px;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 13px 8px;
  border-top: 1px solid var(--border);
  border-radius: 8px;
  text-align: left;
}

.events button.active {
  background: var(--sky-soft);
}

.events button > span {
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.events i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
}

.events i.tone-scenario {
  background: #7e9de9;
}

.events i.tone-danger {
  background: #ef6464;
}

.events i.tone-warning {
  background: var(--warning);
}

.events button div {
  display: grid;
  gap: 3px;
}

.events small {
  color: var(--muted);
  font-size: var(--font-small);
}

@media (max-width: 700px) {
  .summary-grid,
  .timeline-grid {
    grid-template-columns: 1fr;
  }

  .timeline-chart {
    min-height: 245px;
    padding: 20px 14px;
  }

  .timeline-chart header > span {
    display: none;
  }

  .timeline-track {
    margin: 42px 12px 0;
  }

  .timeline-marker span {
    max-width: 58px;
  }

  .events button {
    grid-template-columns: 78px 8px 1fr 14px;
    padding-right: 2px;
    padding-left: 2px;
  }
}
</style>
