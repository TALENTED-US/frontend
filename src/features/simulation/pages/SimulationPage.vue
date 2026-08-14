<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useQuestStore } from '@/features/quest/stores/quest'
import { calculateQuestExp, formatExp, useProgressionStore } from '@/stores/progression'
import {
  formatPrepMonths,
  formatPrepMonthsWithUnit,
  isInfinitePrepMonths,
} from '@/utils/prepMonths'
import meltingImage from '@/assets/images/dashboard/buttie-melting.png'
import cautionImage from '@/assets/images/dashboard/buttie-caution.png'
import stableImage from '@/assets/images/dashboard/buttie-stable.png'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const simulation = useSimulationStore()
const progression = useProgressionStore()
const quests = useQuestStore()
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const manwon = (value) =>
  value
    ? `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value / 10000)}만원`
    : '없음'
const currentLabel = computed(() =>
  formatPrepMonths(simulation.currentMonths),
)
const currentIsInfinite = computed(() => isInfinitePrepMonths(simulation.currentMonths))
const expectedLabel = computed(() => {
  if (!simulation.state.confirmed) return '?'
  return formatPrepMonths(simulation.expectedMonths)
})
const expectedIsInfinite = computed(() => isInfinitePrepMonths(simulation.expectedMonths))
const confirmedTimelineItems = computed(() => {
  const current = Math.max(0, Number(simulation.currentMonths) || 0)
  const expected = Math.max(current, Number(simulation.expectedMonths) || 0)
  const target = Math.max(0, Math.ceil(Number(simulation.targetMonths) || 0))
  const scale = Math.max(current, expected, target, 1)
  const position = (value) => `${Math.min(96, Math.max(4, (value / scale) * 92 + 4))}%`
  const sameDuration = current === expected

  return [
    { id: 'now', label: '현재', value: '지금', position: '4%', tone: 'current' },
    {
      id: 'current-limit',
      label: sameDuration ? '현재 자금 · 계획 적용 후' : '현재 자금 기준',
      value: formatPrepMonthsWithUnit(current),
      position: position(current),
      tone: sameDuration ? 'scenario' : 'limit',
    },
    ...(!sameDuration
      ? [
          {
            id: 'scenario',
            label: '계획 적용 후',
            value: formatPrepMonthsWithUnit(expected),
            position: position(expected),
            tone: 'scenario',
            staggered: true,
          },
        ]
      : []),
    ...(target
      ? [
          {
            id: 'target',
            label: '취업 목표',
            value: formatPrepMonthsWithUnit(target),
            position: position(target),
            tone: 'target',
          },
        ]
      : []),
  ]
})
const statusImages = { danger: meltingImage, caution: cautionImage, safe: stableImage }
const currentStatusImage = computed(() => statusImages[simulation.currentStatus.key])
const expectedStatusImage = computed(() => statusImages[simulation.expectedStatus.key])
const questTab = ref('active')
const showNewSimulationModal = ref(false)
const compactWon = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  return amount >= 10000 && amount % 10000 === 0
    ? `${money(amount / 10000)}만원`
    : `${money(amount)}원`
}
const signedWon = (value) => {
  const amount = Math.round(Number(value) || 0)
  return amount ? `${amount > 0 ? '+' : '-'}${compactWon(Math.abs(amount))}` : compactWon(0)
}
const dateDots = (value) => String(value || '').replaceAll('-', '.')
const localQuestRows = computed(() => [
  ...(simulation.state.expenseApplied
    ? simulation.selectedExpenses.map((item) => ({
        id: `expense-${item.id}`,
        icon: item.icon,
        name: `${item.name} ${compactWon(item.saving)} 줄이기`,
        subtitle: '',
        amount: -item.saving,
        kind: 'expense',
        recurrence: 'monthly',
      }))
    : []),
  ...simulation.state.incomes.map((item) => ({
    id: `income-${item.id}`,
    icon: '💼',
    name: item.name,
    subtitle:
      item.type === 'monthly'
        ? `정기수입 · ${item.cycle || '매월'} ${Number(item.startDate?.slice(-2)) || 1}일`
        : `일회성 수입 · ${dateDots(item.startDate)}`,
    amount: item.amount,
    kind: 'income',
    recurrence: item.type === 'monthly' ? 'monthly' : 'once',
  })),
  ...simulation.state.policies.map((item) => ({
    id: `policy-${item.id}`,
    icon: '🏛️',
    name: item.name,
    subtitle: item.detail || item.description || '정책 혜택',
    amount: Number(item.amount) || 0,
    kind: 'policy',
    recurrence: item.type === 'monthly' ? 'monthly' : 'once',
  })),
])
const questRows = computed(() => (quests.remoteEnabled ? quests.rows : localQuestRows.value))
const questMonthKey = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const recurringQuestIds = computed(() =>
  questRows.value.filter((item) => item.recurrence === 'monthly').map((item) => item.id),
)
watch(
  [questMonthKey, () => recurringQuestIds.value.join('|')],
  ([monthKey]) => {
    if (quests.remoteEnabled) return
    simulation.migrateRecurringQuestCompletions(recurringQuestIds.value, monthKey)
    progression.migrateRecurringQuestClaims(recurringQuestIds.value, monthKey)
  },
  { immediate: true },
)
const questCompletionId = (item) =>
  quests.remoteEnabled
    ? item.id
    : item.recurrence === 'monthly'
      ? `${item.id}@${questMonthKey.value}`
      : item.id
const completedQuestIds = computed(() => new Set(simulation.state.completedQuestIds || []))
const isQuestCompleted = (item) =>
  quests.remoteEnabled ? item.completed : completedQuestIds.value.has(questCompletionId(item))
const completedQuestCount = computed(() => questRows.value.filter(isQuestCompleted).length)
const activeQuestCount = computed(() => questRows.value.length - completedQuestCount.value)
const questCompletionPercent = computed(() =>
  questRows.value.length
    ? Math.round((completedQuestCount.value / questRows.value.length) * 100)
    : 0,
)
const buildQuestGroups = (rows) =>
  [
    { key: 'expense', title: '지출 줄이기' },
    { key: 'income', title: '수입 늘리기' },
    { key: 'policy', title: '정책 혜택', action: '신청 가능' },
  ]
    .map((group) => {
      const groupRows = rows.filter((item) => item.kind === group.key)
      return {
        ...group,
        rows: groupRows,
        amount: group.key === 'policy' ? 0 : groupRows.reduce((sum, item) => sum + item.amount, 0),
      }
    })
    .filter((group) => group.rows.length)
const questSections = computed(() => [
  {
    key: 'recurring',
    title: '매월 정기 퀘스트',
    description: '지출 절감·정기 수입·정기 정책 퀘스트가 매월 갱신돼요.',
    rows: questRows.value.filter((item) => item.recurrence === 'monthly'),
  },
  {
    key: 'once',
    title: '일회성 퀘스트',
    description: '한 번 완료하면 유지되는 수입·정책 퀘스트예요.',
    rows: questRows.value.filter((item) => item.recurrence === 'once'),
  },
])
const visibleQuestSections = computed(() =>
  questSections.value.map((section) => ({
    ...section,
    groups: buildQuestGroups(
      section.rows.filter((item) =>
        questTab.value === 'completed' ? isQuestCompleted(item) : !isQuestCompleted(item),
      ),
    ),
  })),
)
const questExp = (item) => (quests.remoteEnabled ? item.expReward : calculateQuestExp(item.amount))
const isQuestRewarded = (item) =>
  quests.remoteEnabled ? item.completed : progression.isQuestClaimed(questCompletionId(item))
const isQuestPending = (item) => quests.remoteEnabled && quests.isPending(item.id)

async function toggleQuest(item) {
  if (quests.remoteEnabled) {
    await quests.toggleQuest(item.id)
    return
  }
  const id = questCompletionId(item)
  if (isQuestCompleted(item)) progression.cancelQuestClaim(id, item.amount)
  else progression.claimQuest(id, item.amount)
  simulation.toggleQuestCompletion(id)
}

async function start() {
  if (simulation.state.confirmed) {
    router.push('/simulation/edit')
    return
  }
  router.push(simulation.hasDraft ? '/simulation/continue' : '/simulation/new')
}

async function createNewSimulation() {
  const ok = await simulation.deleteConfirmedScenario()
  if (!ok) return
  quests.resetQuests()
  simulation.prepareNewScenario()
  showNewSimulationModal.value = false
  router.push('/simulation/new')
}

onMounted(async () => {
  await Promise.all([
    simulation.hydrateFinancialSnapshot(),
    simulation.hydrateRunwayBaseline(),
  ])
  // Mock 모드에서는 로컬 스냅샷을 복원하고, 실 API 모드에서는 서버 확정 결과를 조회한다.
  simulation.restoreConfirmedSnapshot()
  if (simulation.state.confirmed && simulation.recentConfirmed) {
    await quests.fetchQuests(simulation.recentConfirmed.simulationId, simulation.recentConfirmed)
    return
  }

  const confirmed = await simulation.hydrateConfirmed()
  if (confirmed) {
    await quests.fetchQuests(confirmed.simulationId, confirmed)
    return
  }
  quests.resetQuests()
  if (simulation.syncError) return

  const draft = await simulation.hydrateDraft()
  if (draft) {
    router.replace('/simulation/continue')
    return
  }
  if (simulation.syncError) return

  simulation.resetScenario()
})
</script>

<template>
  <section class="page sim-page">
    <header class="sim-heading desktop-only">
      <p class="app-page-heading__eyebrow">FUTURE PLAN</p>
      <h1>시뮬레이션</h1>
      <p class="app-page-heading__description">계획을 세우고 버티는 기간이 얼마나 늘어나는지 확인해보세요.</p>
    </header>

    <article class="sim-hero">
      <div class="sim-hero__copy">
        <small :class="{ 'result-link': simulation.state.confirmed }"
          >💡 {{ simulation.state.confirmed ? '시뮬레이션 결과보기' : '시뮬레이션 해보기' }}</small
        >
        <h2 v-if="simulation.state.confirmed && expectedIsInfinite">
          시뮬레이션 적용 후에도<br />자산이 소진되지 않는 상태예요.
        </h2>
        <h2 v-else-if="simulation.state.confirmed">
          시뮬레이션대로 실천하면<br />{{ simulation.addedMonths }}개월 더 버틸 수 있어요.
        </h2>
        <h2 v-else>지출을 10만원 줄이면<br />버티는 기간이 얼마나 늘어날까요?</h2>
        <button
          class="sim-btn sim-btn--orange desktop-cta"
          type="button"
          :disabled="simulation.syncing"
          @click="start"
        >
          {{
            simulation.syncing
              ? '전환하는 중…'
              : simulation.state.confirmed
                ? '시뮬레이션 수정하기 →'
                : simulation.hasDraft
                  ? '시나리오 수정하기 →'
                  : '지금 시뮬레이션 하기 →'
          }}
        </button>
      </div>
      <div class="sim-hero__result">
        <div>
          <span>현재 버티는 기간</span
          ><strong
            >{{ currentLabel
            }}<em v-if="simulation.currentMonths !== null && !currentIsInfinite">개월</em></strong
          ><img
            v-if="simulation.currentMonths !== null"
            :src="currentStatusImage"
            :alt="`${simulation.currentStatus.label} 상태의 버티`"
          /><b v-if="simulation.currentMonths !== null" :class="simulation.currentStatus.key">{{
            simulation.currentStatus.label
          }}</b>
        </div>
        <i>→</i>
        <div>
          <span>예상 버티는 기간</span
          ><strong
            >{{ expectedLabel
            }}<em
              v-if="
                !expectedIsInfinite &&
                (!simulation.state.confirmed || simulation.expectedMonths !== null)
              "
              >개월</em
            ></strong
          ><img
            v-if="simulation.state.confirmed && simulation.expectedMonths !== null"
            :src="expectedStatusImage"
            :alt="`${simulation.expectedStatus.label} 상태의 버티`"
          /><b
            v-if="simulation.state.confirmed && simulation.expectedMonths !== null"
            :class="simulation.expectedStatus.key"
            >{{ simulation.expectedStatus.label }}</b
          >
        </div>
      </div>
      <button
        class="sim-btn sim-btn--orange mobile-cta"
        type="button"
        :disabled="simulation.syncing"
        @click="start"
      >
        {{
          simulation.syncing
            ? '전환하는 중…'
            : simulation.state.confirmed
              ? '시뮬레이션 수정하기 →'
              : simulation.hasDraft
                ? '시나리오 수정하기 →'
                : '지금 시뮬레이션 하기 →'
        }}
      </button>
    </article>
    <p v-if="simulation.syncError" class="api-notice" role="alert">{{ simulation.syncError }}</p>

    <section v-if="simulation.state.confirmed" class="sim-quests simulation-quest-status">
      <div class="simulation-quest-heading">
        <h2>퀘스트 현황</h2>
        <span>확정됨</span>
      </div>
      <article class="simulation-quest-card">
        <div
          v-if="quests.remoteEnabled && (quests.loading || quests.error)"
          class="simulation-quest-api-notice"
          :class="{ error: quests.error }"
          role="status"
        >
          <span>{{ quests.loading ? '퀘스트를 불러오는 중이에요.' : quests.error }}</span>
          <button v-if="quests.error" type="button" @click="quests.fetchQuests()">다시 시도</button>
        </div>
        <div class="simulation-quest-tabs" role="tablist" aria-label="퀘스트 상태">
          <button
            type="button"
            :class="{ active: questTab === 'active' }"
            @click="questTab = 'active'"
          >
            진행 중 {{ activeQuestCount }}</button
          ><button
            type="button"
            :class="{ active: questTab === 'completed' }"
            @click="questTab = 'completed'"
          >
            완료 {{ completedQuestCount }}
          </button>
        </div>
        <div class="simulation-quest-progress">
          <div>
            <strong>퀘스트 완료율 {{ questCompletionPercent }}%</strong
            ><span>{{ completedQuestCount }} / {{ questRows.length }} 완료</span>
          </div>
          <div
            class="simulation-quest-progress__track"
            role="progressbar"
            :aria-valuenow="questCompletionPercent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span :style="{ width: `${questCompletionPercent}%` }" />
          </div>
        </div>
        <section
          v-for="section in visibleQuestSections"
          :key="section.key"
          class="simulation-quest-period"
        >
          <header>
            <div>
              <h3>{{ section.title }}</h3>
              <p>{{ section.description }}</p>
            </div>
            <span v-if="section.key === 'recurring'">{{ questMonthKey }} 기준</span>
          </header>
          <div v-if="section.groups.length" class="simulation-quest-groups">
            <section
              v-for="group in section.groups"
              :key="group.key"
              class="simulation-quest-group"
              :class="`simulation-quest-group--${group.key}`"
            >
              <div class="simulation-quest-group__heading">
                <h3><i />{{ group.title }}</h3>
                <strong v-if="group.amount">{{ signedWon(group.amount) }}</strong
                ><strong v-else>{{ group.action }}</strong>
              </div>
              <button
                v-for="item in group.rows"
                :key="item.id"
                type="button"
                class="simulation-quest-row"
                :class="[
                  `simulation-quest-row--${item.kind}`,
                  { completed: isQuestCompleted(item) },
                ]"
                :aria-pressed="isQuestCompleted(item)"
                :aria-busy="isQuestPending(item)"
                :disabled="isQuestPending(item)"
                @click="toggleQuest(item)"
              >
                <span class="simulation-quest-row__icon">{{ item.icon }}</span
                ><span class="simulation-quest-row__copy"
                  ><strong>{{ item.name }}</strong
                  ><small v-if="item.subtitle">{{ item.subtitle }}</small
                  ><small class="exp"
                    >+{{ formatExp(questExp(item)) }} EXP<template v-if="isQuestRewarded(item)">
                      · 지급 완료</template
                    ></small
                  ></span
                ><strong class="simulation-quest-row__amount">{{ signedWon(item.amount) }}</strong
                ><span class="simulation-quest-row__check">{{
                  isQuestCompleted(item) ? '✓' : ''
                }}</span>
              </button>
            </section>
          </div>
          <p v-else class="simulation-quest-empty-row">
            {{
              questTab === 'completed' ? '완료한 퀘스트가 없어요.' : '진행 중인 퀘스트가 없어요.'
            }}
          </p>
        </section>
        <footer class="simulation-quest-footer">
          <button type="button" :disabled="simulation.syncing" @click="start">
            {{ simulation.syncing ? '전환하는 중…' : '시뮬레이션 수정하기 →' }}
          </button>
          <p>퀘스트를 추가하려면 시뮬레이션을 수정하세요.</p>
        </footer>
      </article>
    </section>

    <section class="sim-report">
      <h2>현재 재정 리포트</h2>
      <div class="sim-report-grid">
        <article>
          <span>총자산</span><strong>{{ manwon(simulation.totalAssets) }}</strong>
        </article>
        <article>
          <span>월평균 수입</span><strong>{{ manwon(simulation.monthlyIncome) }}</strong>
        </article>
        <article>
          <span>월평균 지출</span><strong>{{ manwon(simulation.monthlyExpense) }}</strong>
        </article>
        <article>
          <span>순현금흐름</span
          ><strong
            >{{ simulation.monthlyIncome - simulation.monthlyExpense > 0 ? '+' : ''
            }}{{ manwon(simulation.monthlyIncome - simulation.monthlyExpense) }}</strong
          >
        </article>
      </div>
    </section>

    <article
      v-if="simulation.state.confirmed && simulation.runwayCalculationReady"
      class="sim-card sim-timeline"
    >
      <h2>월별 재정 타임라인</h2>
      <p class="confirmed-timeline-description">
        확정한 계획이 현재 자금의 유지 기간을 얼마나 늘리는지 확인하세요.
      </p>
      <div class="confirmed-timeline-track" role="list" aria-label="확정 시뮬레이션 재정 주요 시점">
        <div class="confirmed-timeline-track__line" />
        <div
          v-for="item in confirmedTimelineItems"
          :key="item.id"
          class="confirmed-timeline-marker"
          :class="[`confirmed-timeline-marker--${item.tone}`, { 'is-staggered': item.staggered }]"
          :style="{ left: item.position }"
          role="listitem"
        >
          <i />
          <div class="confirmed-timeline-marker__copy">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
      <p class="confirmed-timeline-note">
        직전 3개월 월평균 기준 · 계획 적용 후
        {{ formatPrepMonthsWithUnit(simulation.expectedMonths) }}
      </p>
    </article>

    <button
      v-if="simulation.state.confirmed"
      class="simulation-create-new-bottom"
      type="button"
      @click="showNewSimulationModal = true"
    >
      새 시뮬레이션 만들기
    </button>

    <div
      v-if="showNewSimulationModal"
      class="simulation-new-modal"
      role="presentation"
      @click.self="showNewSimulationModal = false"
      @keydown.esc="showNewSimulationModal = false"
    >
      <section role="dialog" aria-modal="true" aria-labelledby="new-simulation-main-title">
        <span class="simulation-new-modal__icon" aria-hidden="true">!</span>
        <h2 id="new-simulation-main-title">새 시뮬레이션을 만들까요?</h2>
        <p>
          새 시뮬레이션을 생성하면 기존에 확정된 시뮬레이션이 삭제됩니다.<br />그래도 다시
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
          <button type="button" :disabled="simulation.syncing" @click="createNewSimulation">
            {{ simulation.syncing ? '삭제하는 중…' : '새로 만들기' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.mobile-cta {
  display: none;
}
.sim-hero__copy .result-link {
  font-weight: 800;
}
.sim-hero__result {
  background: #fffbef;
}
.sim-hero__result > div > span {
  font-size: 14px !important;
}
.sim-hero__result > div > strong {
  font-size: 34px !important;
  font-weight: 800;
  line-height: 1.15;
}
.sim-hero__result > div > strong em {
  font-size: 16px !important;
  font-weight: 600;
}
.sim-hero__result > div { align-self: stretch; grid-template-rows: auto auto 1fr auto; }
.sim-hero__result > i { color: #b49b58; font-size: 30px; font-style: normal; font-weight: 700; }
.sim-hero__result .danger { background: #ffe5df; color: #ef5b52; }
.sim-hero__result .caution { background: #f4b63c; color: #fff; }
.sim-hero__result .safe { background: #c7ead9; color: #35a87e; }
.sim-report-grid span { font-size: 14px; font-weight: 600; }
.sim-report-grid strong { font-weight: 700 !important; }
.simulation-quest-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.simulation-quest-heading h2 { font-size: var(--type-section-title-size); font-weight: var(--type-section-title-weight); }
.simulation-quest-heading > span { padding: 10px 18px; border-radius: 999px; background: #f6bb37; color: white; font-weight: 800; box-shadow: 0 4px 10px rgb(0 0 0 / 12%); }
.simulation-quest-card { padding: 22px 24px 18px; border: 1px solid #e1e4ea; border-radius: 22px; background: white; box-shadow: 0 2px 8px rgb(0 0 0 / 10%); }
.simulation-quest-api-notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 11px 13px; border-radius: 12px; background: #f7f8fa; color: #727985; font-size: 12px; font-weight: 700; }
.simulation-quest-api-notice.error { background: #fff1f1; color: #cf3f3f; }
.simulation-quest-api-notice button { flex: none; color: inherit; font-size: inherit; font-weight: 900; text-decoration: underline; }
.simulation-quest-tabs { display: grid; width: min(72%, 520px); height: 48px; grid-template-columns: 1fr 1fr; margin: 0 auto 20px; padding: 3px; border: 1px solid #e1e4ea; border-radius: 999px; background: #f2f3f6; }
.simulation-quest-tabs button { border-radius: 999px; color: #9a9da5; font-weight: 700; }
.simulation-quest-tabs button.active { background: white; box-shadow: 0 2px 6px rgb(0 0 0 / 12%); color: #222; font-weight: 800; }
.simulation-quest-progress { display: grid; gap: 8px; margin-bottom: 20px; }
.simulation-quest-progress > div:first-child { display: flex; justify-content: space-between; gap: 16px; }
.simulation-quest-progress strong { color: #51392e; font-size: 13px; }
.simulation-quest-progress span { color: #777e89; font-size: 12px; font-weight: 700; }
.simulation-quest-progress__track { height: 12px; overflow: hidden; border-radius: 999px; background: #eceef2; box-shadow: inset 0 1px 2px rgb(0 0 0 / 8%); }
.simulation-quest-progress__track span { display: block; height: 100%; border-radius: inherit; background: #f1b94c; transition: width .3s ease; }
.simulation-quest-period + .simulation-quest-period { margin-top: 24px; padding-top: 24px; border-top: 1px solid #dfe2e8; }
.simulation-quest-period > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.simulation-quest-period > header h3 { font-size: 16px; font-weight: 900; }
.simulation-quest-period > header p { margin-top: 4px; color: #777e89; font-size: 12px; line-height: 1.45; }
.simulation-quest-period > header > span { flex: none; padding: 5px 9px; border-radius: 999px; background: #fff4c7; color: #8b6110; font-size: 11px; font-weight: 800; }
.simulation-quest-groups { display: grid; gap: 18px; }
.simulation-quest-group { display: grid; gap: 9px; }
.simulation-quest-group__heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.simulation-quest-group__heading h3 { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; }
.simulation-quest-group__heading h3 i { width: 10px; height: 10px; flex: none; border-radius: 50%; background: #ef5b52; }
.simulation-quest-group__heading > strong { color: #ef5b52; font-size: 14px; }
.simulation-quest-group--income .simulation-quest-group__heading h3 i { background: #3ed79d; }
.simulation-quest-group--policy .simulation-quest-group__heading h3 i { background: #8e79cd; }
.simulation-quest-group--income .simulation-quest-group__heading > strong { color: #23bb82; }
.simulation-quest-group--policy .simulation-quest-group__heading > strong { color: #8e79cd; }
.simulation-quest-row { display: grid; width: 100%; min-height: 62px; grid-template-columns: 42px minmax(0,1fr) auto 34px; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid #e5e7ec; border-radius: 16px; box-shadow: 0 2px 6px rgb(0 0 0 / 9%); text-align: left; }
.simulation-quest-row--expense { background: #fff2f2; }
.simulation-quest-row--income { background: #ecfbf5; }
.simulation-quest-row--policy { background: #f6f3fc; }
.simulation-quest-row.completed { opacity: .62; }
.simulation-quest-row:disabled { cursor: wait; opacity: .55; }
.simulation-quest-row__icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid #e1e4e9; border-radius: 50%; background: white; font-size: 17px; }
.simulation-quest-row__copy { display: grid; min-width: 0; gap: 3px; }
.simulation-quest-row__copy strong,.simulation-quest-row__amount { font-size: 14px; font-weight: 800; }
.simulation-quest-row__copy small { overflow: hidden; color: #727985; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.simulation-quest-row__copy .exp { color: #8b5f18; font-weight: 800; }
.simulation-quest-row__amount { color: #ef5b52; white-space: nowrap; }
.simulation-quest-row--income .simulation-quest-row__amount { color: #23bb82; }
.simulation-quest-row--policy .simulation-quest-row__amount { color: #8e79cd; }
.simulation-quest-row__check { display: grid; width: 30px; height: 30px; place-items: center; border: 2px solid #cfdae7; border-radius: 10px; background: white; color: white; font-size: 18px; font-weight: 900; }
.simulation-quest-row.completed .simulation-quest-row__check { border-color: #666; background: #666; }
.simulation-quest-empty-row { display: grid; min-height: 88px; place-items: center; border-radius: 14px; background: #f8f9fb; color: #858b95; font-size: 12px; font-weight: 700; }
.simulation-quest-footer { display: grid; justify-items: center; gap: 5px; margin-top: 22px; padding-top: 16px; border-top: 1px solid #e4e6ea; }
.simulation-quest-footer span,.simulation-quest-footer p { color: #818793; font-size: 12px; }
.simulation-quest-footer strong { grid-column: 2; grid-row: 1 / span 2; font-size: 18px; white-space: nowrap; }
.simulation-quest-footer button { grid-column: 1 / -1; justify-self: center; margin-top: 7px; font-size: 13px; font-weight: 800; }
.simulation-quest-footer p { color: #818793; font-size: 12px; }
.simulation-create-new-bottom { display: block; margin: 28px auto 0; color: #777e89; font-size: 12px; font-weight: 700; text-decoration: underline; }

.confirmed-timeline-description { margin-top: 6px; color: #6b7684; font-size: 14px; }
.confirmed-timeline-track { position: relative; height: 150px; margin: 34px 18px 0; }
.confirmed-timeline-track__line { position: absolute; top: 34px; right: 0; left: 0; height: 7px; border-radius: 999px; background: var(--primary); }
.confirmed-timeline-marker { position: absolute; top: 14px; display: grid; width: max-content; max-width: 130px; justify-items: center; gap: 5px; transform: translateX(-50%); text-align: center; }
.confirmed-timeline-marker--current { transform: translateX(0); }
.confirmed-timeline-marker:last-of-type { transform: translateX(-100%); }
.confirmed-timeline-marker i { width: 46px; height: 46px; border: 6px solid #fff; border-radius: 50%; background: var(--primary); box-shadow: 0 3px 10px rgb(10 22 128 / 20%); }
.confirmed-timeline-marker__copy { display: grid; justify-items: center; gap: 5px; }
.confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy { margin-top: 48px; }
.confirmed-timeline-marker__copy strong { margin-top: 4px; color: #191f28; font-size: 16px; }
.confirmed-timeline-marker__copy span { max-width: 112px; color: #6b7684; font-size: 13px; line-height: 1.3; }
.confirmed-timeline-marker--limit i { background: #8b95a1; }
.confirmed-timeline-marker--scenario i { background: #7e9de9; }
.confirmed-timeline-marker--target i { background: var(--accent-strong); }
.confirmed-timeline-note { margin-top: 6px; color: #6b7684; font-size: 13px; text-align: center; }
.sim-hero__result > div {
  align-self: stretch;
  grid-template-rows: auto auto 1fr auto;
}
.sim-hero__result > i {
  color: #b49b58;
  font-size: 30px;
  font-style: normal;
  font-weight: 700;
}
.sim-hero__result .danger {
  background: #ffe5df;
  color: #ef5b52;
}
.sim-hero__result .caution {
  background: #f4b63c;
  color: #fff;
}
.sim-hero__result .safe {
  background: #c7ead9;
  color: #35a87e;
}
.sim-report-grid span {
  font-size: 14px;
  font-weight: 600;
}
.sim-report-grid strong {
  font-weight: 700 !important;
}
.simulation-quest-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.simulation-quest-heading h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.simulation-quest-heading > span {
  padding: 10px 18px;
  border-radius: 999px;
  background: #f6bb37;
  color: white;
  font-weight: 800;
  box-shadow: 0 4px 10px rgb(0 0 0 / 12%);
}
.simulation-quest-card {
  padding: 22px 24px 18px;
  border: 1px solid #e1e4ea;
  border-radius: 22px;
  background: white;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}
.simulation-quest-api-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 11px 13px;
  border-radius: 12px;
  background: #f7f8fa;
  color: #727985;
  font-size: 12px;
  font-weight: 700;
}
.simulation-quest-api-notice.error {
  background: #fff1f1;
  color: #cf3f3f;
}
.simulation-quest-api-notice button {
  flex: none;
  color: inherit;
  font-size: inherit;
  font-weight: 900;
  text-decoration: underline;
}
.simulation-quest-tabs {
  display: grid;
  width: min(72%, 520px);
  height: 48px;
  grid-template-columns: 1fr 1fr;
  margin: 0 auto 20px;
  padding: 3px;
  border: 1px solid #e1e4ea;
  border-radius: 999px;
  background: #f2f3f6;
}
.simulation-quest-tabs button {
  border-radius: 999px;
  color: #9a9da5;
  font-weight: 700;
}
.simulation-quest-tabs button.active {
  background: white;
  box-shadow: 0 2px 6px rgb(0 0 0 / 12%);
  color: #222;
  font-weight: 800;
}
.simulation-quest-progress {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}
.simulation-quest-progress > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.simulation-quest-progress strong {
  color: #51392e;
  font-size: 13px;
}
.simulation-quest-progress span {
  color: #777e89;
  font-size: 12px;
  font-weight: 700;
}
.simulation-quest-progress__track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #eceef2;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 8%);
}
.simulation-quest-progress__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #f1b94c;
  transition: width 0.3s ease;
}
.simulation-quest-period + .simulation-quest-period {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #dfe2e8;
}
.simulation-quest-period > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.simulation-quest-period > header h3 {
  font-size: 16px;
  font-weight: 900;
}
.simulation-quest-period > header p {
  margin-top: 4px;
  color: #777e89;
  font-size: 12px;
  line-height: 1.45;
}
.simulation-quest-period > header > span {
  flex: none;
  padding: 5px 9px;
  border-radius: 999px;
  background: #fff4c7;
  color: #8b6110;
  font-size: 11px;
  font-weight: 800;
}
.simulation-quest-groups {
  display: grid;
  gap: 18px;
}
.simulation-quest-group {
  display: grid;
  gap: 9px;
}
.simulation-quest-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.simulation-quest-group__heading h3 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 800;
}
.simulation-quest-group__heading h3 i {
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 50%;
  background: #ef5b52;
}
.simulation-quest-group__heading > strong {
  color: #ef5b52;
  font-size: 14px;
}
.simulation-quest-group--income .simulation-quest-group__heading h3 i {
  background: #3ed79d;
}
.simulation-quest-group--policy .simulation-quest-group__heading h3 i {
  background: #8e79cd;
}
.simulation-quest-group--income .simulation-quest-group__heading > strong {
  color: #23bb82;
}
.simulation-quest-group--policy .simulation-quest-group__heading > strong {
  color: #8e79cd;
}
.simulation-quest-row {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: 42px minmax(0, 1fr) auto 34px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid #e5e7ec;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgb(0 0 0 / 9%);
  text-align: left;
}
.simulation-quest-row--expense {
  background: #fff2f2;
}
.simulation-quest-row--income {
  background: #ecfbf5;
}
.simulation-quest-row--policy {
  background: #f6f3fc;
}
.simulation-quest-row.completed {
  opacity: 0.62;
}
.simulation-quest-row:disabled {
  cursor: wait;
  opacity: 0.55;
}
.simulation-quest-row__icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #e1e4e9;
  border-radius: 50%;
  background: white;
  font-size: 17px;
}
.simulation-quest-row__copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.simulation-quest-row__copy strong,
.simulation-quest-row__amount {
  font-size: 14px;
  font-weight: 800;
}
.simulation-quest-row__copy small {
  overflow: hidden;
  color: #727985;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.simulation-quest-row__copy .exp {
  color: #8b5f18;
  font-weight: 800;
}
.simulation-quest-row__amount {
  color: #ef5b52;
  white-space: nowrap;
}
.simulation-quest-row--income .simulation-quest-row__amount {
  color: #23bb82;
}
.simulation-quest-row--policy .simulation-quest-row__amount {
  color: #8e79cd;
}
.simulation-quest-row__check {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 2px solid #cfdae7;
  border-radius: 10px;
  background: white;
  color: white;
  font-size: 18px;
  font-weight: 900;
}
.simulation-quest-row.completed .simulation-quest-row__check {
  border-color: #666;
  background: #666;
}
.simulation-quest-empty-row {
  display: grid;
  min-height: 88px;
  place-items: center;
  border-radius: 14px;
  background: #f8f9fb;
  color: #858b95;
  font-size: 12px;
  font-weight: 700;
}
.simulation-quest-footer {
  display: grid;
  justify-items: center;
  gap: 5px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #e4e6ea;
}
.simulation-quest-footer span,
.simulation-quest-footer p {
  color: #818793;
  font-size: 12px;
}
.simulation-quest-footer strong {
  grid-column: 2;
  grid-row: 1 / span 2;
  font-size: 18px;
  white-space: nowrap;
}
.simulation-quest-footer button {
  grid-column: 1 / -1;
  justify-self: center;
  margin-top: 7px;
  font-size: 13px;
  font-weight: 800;
}
.simulation-quest-footer p {
  color: #818793;
  font-size: 12px;
}
.simulation-create-new-bottom {
  display: block;
  margin: 28px auto 0;
  color: #777e89;
  font-size: 12px;
  font-weight: 700;
  text-decoration: underline;
}

.confirmed-timeline-description {
  margin-top: 6px;
  color: #6b7684;
  font-size: 14px;
}
.confirmed-timeline-track {
  position: relative;
  height: 150px;
  margin: 34px 18px 0;
}
.confirmed-timeline-track__line {
  position: absolute;
  top: 34px;
  right: 0;
  left: 0;
  height: 7px;
  border-radius: 999px;
  background: var(--primary);
}
.confirmed-timeline-marker {
  position: absolute;
  top: 14px;
  display: grid;
  width: max-content;
  max-width: 130px;
  justify-items: center;
  gap: 5px;
  transform: translateX(-50%);
  text-align: center;
}
.confirmed-timeline-marker--current {
  transform: translateX(0);
}
.confirmed-timeline-marker:last-of-type {
  transform: translateX(-100%);
}
.confirmed-timeline-marker i {
  width: 46px;
  height: 46px;
  border: 6px solid #fff;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 3px 10px rgb(10 22 128 / 20%);
}
.confirmed-timeline-marker__copy {
  display: grid;
  justify-items: center;
  gap: 5px;
}
.confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy {
  margin-top: 48px;
}
.confirmed-timeline-marker__copy strong {
  margin-top: 4px;
  color: #191f28;
  font-size: 16px;
}
.confirmed-timeline-marker__copy span {
  max-width: 112px;
  color: #6b7684;
  font-size: 13px;
  line-height: 1.3;
}
.confirmed-timeline-marker--limit i {
  background: #8b95a1;
}
.confirmed-timeline-marker--scenario i {
  background: #7e9de9;
}
.confirmed-timeline-marker--target i {
  background: var(--accent-strong);
}
.confirmed-timeline-note {
  margin-top: 6px;
  color: #6b7684;
  font-size: 13px;
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
  background: #fff3d2;
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

@media (min-width: 768px) {
  .simulation-new-modal h2 {
    font-size: 21px;
  }
  .simulation-new-modal p {
    font-size: 14px;
  }
}

@media (max-width: 767px) {
  .confirmed-timeline-description { font-size: 13px; line-height: 1.5; }
  .confirmed-timeline-track { display: grid; height: auto; gap: 14px; margin: 22px 0 8px; padding-left: 2px; }
  .confirmed-timeline-track__line { top: 18px; right: auto; bottom: 18px; left: 22px; width: 5px; height: auto; background: var(--primary); }
  .confirmed-timeline-description {
    font-size: 13px;
    line-height: 1.5;
  }
  .confirmed-timeline-track {
    display: grid;
    height: auto;
    gap: 14px;
    margin: 22px 0 8px;
    padding-left: 2px;
  }
  .confirmed-timeline-track__line {
    top: 18px;
    right: auto;
    bottom: 18px;
    left: 22px;
    width: 5px;
    height: auto;
    background: var(--primary);
  }
  .confirmed-timeline-marker,
  .confirmed-timeline-marker:last-of-type {
    position: relative;
    top: auto;
    left: auto !important;
    display: grid;
    width: 100%;
    max-width: none;
    grid-template-columns: 46px minmax(0, 1fr) auto;
    align-items: center;
    justify-items: start;
    gap: 12px;
    transform: none;
    text-align: left;
  }
  .confirmed-timeline-marker i {
    z-index: 1;
    grid-row: 1;
    grid-column: 1;
    width: 44px;
    height: 44px;
  }
  .confirmed-timeline-marker__copy,
  .confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy {
    display: grid;
    width: 100%;
    grid-row: 1;
    grid-column: 2 / 4;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    justify-items: start;
    gap: 12px;
    margin: 0;
  }
  .confirmed-timeline-marker__copy strong {
    grid-column: 2;
    margin: 0;
    font-size: 15px;
  }
  .confirmed-timeline-marker__copy span {
    grid-row: 1;
    grid-column: 1;
    max-width: none;
    font-size: 14px;
  }
  .confirmed-timeline-note {
    margin-top: 14px;
    font-size: 13px;
    text-align: left;
  }
  .sim-hero__result {
    padding: 20px 14px 16px;
    border-radius: 36px;
  }
  .sim-hero__result > div {
    gap: 7px;
  }
  .sim-hero__result img {
    width: 112px;
    height: 82px;
  }
  .sim-hero__result b {
    min-width: 72px;
    padding: 6px 18px;
    text-align: center;
  }
  .sim-hero__result > i {
    font-size: 28px;
  }
  .sim-hero__copy .desktop-cta {
    display: none;
  }
  .sim-hero > .mobile-cta {
    display: inline-flex;
    width: 100%;
  }
  .simulation-quest-heading h2 {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }
  .simulation-quest-heading > span {
    padding: 8px 15px;
    font-size: 10px;
    font-weight: 700;
  }
  .simulation-quest-card {
    padding: 14px 12px 16px;
  }
  .simulation-quest-tabs {
    width: 100%;
    height: 52px;
    margin-bottom: 16px;
  }
  .simulation-quest-progress strong {
    font-size: 15px;
  }
  .simulation-quest-progress > div:first-child > span {
    font-size: 13px;
  }
  .simulation-quest-progress__track {
    height: 14px;
  }
  .simulation-quest-period + .simulation-quest-period {
    margin-top: 20px;
    padding-top: 20px;
  }
  .simulation-quest-period > header {
    gap: 10px;
    margin-bottom: 14px;
  }
  .simulation-quest-period > header > span {
    padding: 6px 10px;
  }
  .simulation-quest-groups {
    gap: 20px;
  }
  .simulation-quest-row {
    min-height: 84px;
    grid-template-columns: 44px minmax(0, 1fr) auto 30px;
    gap: 8px;
    padding: 12px 10px;
    border-radius: 18px;
  }
  .simulation-quest-row__icon {
    width: 40px;
    height: 40px;
  }
  .simulation-quest-row__copy strong,
  .simulation-quest-row__amount {
    font-size: 14px;
    font-weight: 800;
  }
  .sim-report-grid strong {
    font-size: 20px;
  }
  .simulation-quest-api-notice,
  .simulation-quest-progress span,
  .simulation-quest-period > header p,
  .simulation-quest-row__copy small,
  .simulation-quest-empty-row,
  .simulation-quest-footer span,
  .simulation-quest-footer p,
  .simulation-new-modal p {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
  }
  .simulation-quest-empty-row {
    font-size: var(--type-empty-size);
    font-weight: var(--type-empty-weight);
  }
  .simulation-quest-period > header > span {
    font-size: 12px;
    font-weight: 700;
  }
  .simulation-quest-row__copy small {
    white-space: normal;
  }
  .simulation-quest-footer strong {
    font-size: 17px;
  }
  .simulation-new-modal section > div button,
  .simulation-quest-footer button {
    font-size: 17px;
    font-weight: 800;
  }
  .simulation-create-new-bottom {
    font-size: 15px;
    font-weight: 700;
  }
}
</style>
