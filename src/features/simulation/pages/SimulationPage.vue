<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useQuestStore } from '@/features/quest/stores/quest'
import { calculateQuestExp, formatExp, useProgressionStore } from '@/stores/progression'
import simulationBannerButtie from '@/assets/images/dashboard/buttie-melting.png'
import ConfirmedFinancialTimeline from '@/features/simulation/components/ConfirmedFinancialTimeline.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import QuestOverview from '@/features/quest/components/QuestOverview.vue'
import MyDataConnectModal from '@/components/ui/MyDataConnectModal.vue'
import { normalizeExternalUrl } from '@/utils/externalUrl'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const session = useSessionStore()
const simulation = useSimulationStore()
const progression = useProgressionStore()
const quests = useQuestStore()
const showMyDataConnectModal = ref(false)

function isMyDataConnected() {
  return session.myDataConnected || session.currentUser.mydataStatus === 'CONNECTED'
}

function goToMyDataConnect() {
  showMyDataConnectModal.value = false
  router.push({ name: 'onboarding', query: { mode: 'mydata', returnTo: '/simulation' } })
}
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const questTab = ref('active')
const showNewSimulationModal = ref(false)
const resultStatusKey = computed(() => simulation.expectedStatus.key === 'safe' ? 'stable' : simulation.expectedStatus.key)
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
    id: `policy-${item.id}`, icon: '🏛️', name: item.name, subtitle: item.detail || item.description || '정책 혜택', amount: Number(item.amount) || 0, kind: 'policy', recurrence: item.type === 'monthly' ? 'monthly' : 'once', questUrl: normalizeExternalUrl(item.url),
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
const questCompletionPercent = computed(() => questRows.value.length ? Math.round(completedQuestCount.value / questRows.value.length * 100) : 0)
const claimableQuestExp = computed(() => questRows.value
  .filter((item) => !isQuestCompleted(item))
  .reduce((sum, item) => sum + questExp(item), 0))
const questIconName = (item) => ({ expense: 'arrow-down', income: 'briefcase', policy: 'landmark' }[item.kind] || 'check-circle')
const buildQuestGroups = (rows) => [
  { key: 'expense', title: '지출 줄이기' }, { key: 'income', title: '수입 늘리기' }, { key: 'policy', title: '정책 혜택', action: '신청 가능' },
].map((group) => {
  const groupRows = rows.filter((item) => item.kind === group.key)
  return { ...group, rows: groupRows, amount: group.key === 'policy' ? 0 : groupRows.reduce((sum, item) => sum + item.amount, 0) }
}).filter((group) => group.rows.length)
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
const visibleQuestSections = computed(() => questSections.value.map((section) => ({
  ...section,
  visibleRows: section.rows.filter((item) => questTab.value === 'completed' ? isQuestCompleted(item) : !isQuestCompleted(item)),
})))
const questExp = (item) => quests.remoteEnabled ? item.expReward : calculateQuestExp(item.amount)
const isQuestRewarded = (item) => quests.remoteEnabled
  ? item.completed
  : progression.isQuestClaimed(questCompletionId(item))
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
  if (!session.isMockMode && !isMyDataConnected()) {
    showMyDataConnectModal.value = true
    return
  }

  await Promise.all([
    simulation.hydrateFinancialSnapshot(),
    simulation.hydrateRunwayBaseline(),
  ])
  // Mock 모드에서는 로컬 스냅샷을 복원하고, 실 API 모드에서는 서버 확정 결과를 조회한다.
  simulation.restoreConfirmedSnapshot()

  // 로컬의 과거 확정 스냅샷보다 서버의 현재 Draft 상태를 우선한다.
  // 수정 중인 Draft가 존재하면 /quest가 QUEST_002를 반환하므로 퀘스트를 조회하지 않는다.
  if (quests.remoteEnabled) {
    const draft = await simulation.hydrateDraft()
    if (draft) {
      quests.resetQuests()
      router.replace('/simulation/continue')
      return
    }
    if (simulation.syncError) return
  } else if (simulation.state.confirmed && simulation.recentConfirmed) {
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

  if (!quests.remoteEnabled) {
    const draft = await simulation.hydrateDraft()
    if (draft) {
      router.replace('/simulation/continue')
      return
    }
    if (simulation.syncError) return
  }

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

    <article v-if="!simulation.state.confirmed" class="simulation-banner">
      <div class="simulation-banner__copy">
        <small>💡 시뮬레이션 해보기</small>
        <h2>내 선택에 따라<br />버티는 기간이 얼마나 달라질까요?</h2>
        <p>지출을 줄이고, 수입을 늘리고,<br />받을 수 있는 정책을 적용해보세요.</p>

        <ul class="simulation-banner__benefits" aria-label="시뮬레이션에서 설정할 수 있는 항목">
          <li><i class="expense" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 7.5 10 14l3.5-3.5L20.5 17"/><path d="M20.5 12.6V17h-4.4"/></svg></i><span>지출 줄이기</span></li>
          <li><i class="income" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 16.5 10 10l3.5 3.5L20.5 6.5"/><path d="M16.1 6.5h4.4v4.4"/></svg></i><span>수입 늘리기</span></li>
          <li><i class="policy" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.2 19 6v5.4c0 4.2-2.9 7.5-7 9.4-4.1-1.9-7-5.2-7-9.4V6l7-2.8Z"/><path d="m8.9 11.8 2.2 2.2 4-4.3"/></svg></i><span>정책 혜택</span></li>
        </ul>
      </div>

      <div class="simulation-banner__action">
        <div class="simulation-banner__character">
          <p>계획을 바꾸면<br />버티는 기간도 달라져요</p>
          <img :src="simulationBannerButtie" alt="버티 캐릭터" />
        </div>
        <button class="simulation-primary-cta" type="button" :disabled="simulation.syncing" @click="start">
          {{ simulation.syncing ? '전환하는 중…' : '시뮬레이션 시작' }}
        </button>
      </div>
    </article>
    <article v-else class="simulation-result-banner">
      <div class="simulation-result-banner__copy">
        <small>💡 시뮬레이션 결과</small>
        <h2>계획을 적용하면<br />버티는 기간이 {{ simulation.addedMonths }}개월 늘어나요</h2>
      </div>

      <div class="simulation-result-banner__summary">
        <div class="simulation-result-banner__periods">
          <div>
            <span>현재</span>
            <em :class="`is-${simulation.currentStatus.key}`">{{ simulation.currentStatus.label }}</em>
            <strong>{{ simulation.currentMonths }}<small>개월</small></strong>
          </div>
          <b aria-hidden="true">→</b>
          <i>+{{ simulation.addedMonths }}개월</i>
          <div>
            <span>시뮬레이션 적용 후</span>
            <em :class="`is-${resultStatusKey}`">{{ simulation.expectedStatus.label }}</em>
            <strong>{{ simulation.expectedMonths }}<small>개월</small></strong>
          </div>
        </div>
        <button class="simulation-result-banner__edit" type="button" :disabled="simulation.syncing" @click="start">
          {{ simulation.syncing ? '전환하는 중…' : '시뮬레이션 수정하기' }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
    <p v-if="simulation.syncError" class="api-notice" role="alert">{{ simulation.syncError }}</p>

    <ConfirmedFinancialTimeline
      v-if="simulation.state.confirmed && simulation.runwayCalculationReady"
      :current-months="Number(simulation.currentMonths)"
      :expected-months="Number(simulation.expectedMonths)"
      :target-months="Number(simulation.targetMonths)"
    />

    <section v-if="simulation.state.confirmed" class="sim-quests simulation-quest-status">
      <QuestOverview :rows="questRows" :edit-loading="simulation.syncing" />
    </section>

    <button v-if="simulation.state.confirmed" class="simulation-create-new-bottom" type="button" @click="showNewSimulationModal = true">새 시뮬레이션 만들기</button>

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
          <button type="button" :disabled="simulation.syncing" @click="showNewSimulationModal = false">취소</button>
          <button class="simulation-primary-cta" type="button" :disabled="simulation.syncing" @click="createNewSimulation">
            {{ simulation.syncing ? '삭제하는 중…' : '새로 만들기' }}
          </button>
        </div>
      </section>
    </div>

    <MyDataConnectModal
      :visible="showMyDataConnectModal"
      @close="showMyDataConnectModal = false"
      @connect="goToMyDataConnect"
    />
  </section>
</template>

<style scoped>
.simulation-banner { position: relative; display: grid; min-height: max(500px,calc(100dvh - var(--header-height) - 210px)); grid-template-columns: minmax(0,1fr) minmax(360px,432px); gap: 48px; overflow: hidden; padding: 56px; border-radius: 28px; background: linear-gradient(105deg,#fff3c4 0%,#fff8de 34%,#fffdf6 62%,#fff 100%); box-shadow: 0 2px 16px rgb(120 100 20 / 7%); }
.simulation-banner::after { position: absolute; top: -140px; right: -80px; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle,rgb(255 220 110 / 30%),rgb(255 220 110 / 0%) 70%); content: ''; pointer-events: none; }
.simulation-banner__copy,.simulation-banner__action { position: relative; z-index: 1; }
.simulation-banner__copy { display: flex; min-width: 0; flex-direction: column; }
.simulation-banner__copy > small { color: #b08a16; font-size: 15px; font-weight: 600; }
.simulation-banner__copy h2 { margin-top: 18px; color: var(--text); font-size: 38px; font-weight: 800; letter-spacing: -1.1px; line-height: 1.36; }
.simulation-banner__copy > p { margin-top: 20px; color: #7c7568; font-size: 17px; letter-spacing: -.3px; line-height: 1.65; }
.simulation-banner__benefits { display: grid; gap: 14px; margin-top: auto; padding-top: 36px; }
.simulation-banner__benefits li { display: flex; align-items: center; gap: 14px; color: #3e3930; font-size: 17px; font-weight: 600; }
.simulation-banner__benefits i { display: grid; width: 46px; height: 46px; flex: none; place-items: center; border-radius: 50%; }
.simulation-banner__benefits i.expense { background: #ffe9a8; color: #b37f0c; }
.simulation-banner__benefits i.income { background: #dcf0d6; color: #43823a; }
.simulation-banner__benefits i.policy { background: #e4e6fa; color: #5257c4; }
.simulation-banner__benefits svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
.simulation-banner__action { display: flex; flex-direction: column; justify-content: space-between; gap: 28px; }
.simulation-banner__character { display: flex; flex: 1; align-items: center; justify-content: flex-end; gap: 18px; }
.simulation-banner__character p { position: relative; padding: 16px 20px; border: 1px solid rgb(190 160 50 / 22%); border-radius: 18px; background: #fff; box-shadow: 0 3px 14px rgb(150 120 20 / 9%); color: #5c554a; font-size: 16px; font-weight: 600; letter-spacing: -.3px; line-height: 1.55; }
.simulation-banner__character p::after { position: absolute; top: 50%; right: -7px; width: 13px; height: 13px; margin-top: -7px; border-top: 1px solid rgb(190 160 50 / 22%); border-right: 1px solid rgb(190 160 50 / 22%); background: #fff; content: ''; transform: rotate(45deg); }
.simulation-banner__character img { width: 210px; height: auto; }
.simulation-banner__action > button { display: flex; width: 100%; height: 50px; min-height: 50px; align-items: center; justify-content: center; gap: 10px; border-radius: 18px; background: #f1b94c; box-shadow: 0 4px 0 rgb(198 160 30 / 35%); color: #3a3222; font-size: 20px; font-weight: 700; transition: transform .16s ease,box-shadow .16s ease,background .16s ease; }
.simulation-banner__action > button:hover:not(:disabled) { background: #e5ac3c; box-shadow: 0 6px 0 rgb(198 160 30 / 35%); transform: translateY(-2px); }
.simulation-banner__action > button:active:not(:disabled) { box-shadow: 0 1px 0 rgb(198 160 30 / 35%); transform: translateY(2px); }
.simulation-banner__action > button:disabled { cursor: wait; opacity: .6; }
.simulation-banner__action > button svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.2; }
.simulation-result-banner { display: grid; min-height: 210px; grid-template-columns: minmax(300px,1fr) minmax(390px,1.2fr); align-items: center; gap: 48px; padding: 34px 40px; border-radius: 28px; background: linear-gradient(105deg,#fff4cf 0%,#fff8df 55%,#fff1c5 100%); box-shadow: 0 2px 16px rgb(120 100 20 / 7%); }
.simulation-result-banner__copy small { color: #9a7613; font-size: 14px; font-weight: 700; }
.simulation-result-banner__copy h2 { margin-top: 16px; color: #181818; font-size: 27px; font-weight: 900; letter-spacing: -.8px; line-height: 1.45; }
.simulation-result-banner__summary { display: grid; gap: 20px; }
.simulation-result-banner__periods { display: grid; grid-template-columns: minmax(90px,1fr) 28px 72px minmax(120px,1fr); align-items: center; gap: 8px; }
.simulation-result-banner__periods > div { display: grid; grid-template-columns: auto auto; align-items: center; justify-content: start; gap: 5px 7px; }
.simulation-result-banner__periods span { color: #968d7a; font-size: 15px; font-weight: 700; }
.simulation-result-banner__periods em { padding: 3px 7px; border-radius: 999px; font-size: 14px; font-style: normal; font-weight: 800; }
.simulation-result-banner__periods em.is-danger { background: #ffe4e1; color: #e36c62; }
.simulation-result-banner__periods em.is-caution { background: #fff0bd; color: #bd8613; }
.simulation-result-banner__periods em.is-safe,.simulation-result-banner__periods em.is-stable { background: #e3f5df; color: #5b9b50; }
.simulation-result-banner__periods strong { grid-column: 1 / -1; color: #1c1c1c; font-size: 45px; font-weight: 900; line-height: 1; white-space: nowrap; }
.simulation-result-banner__periods > div:first-child strong { color: #a79d88; font-size: 34px; }
.simulation-result-banner__periods strong small { margin-left: 2px; font-size: 26px; }
.simulation-result-banner__periods > b { color: #c1b8a4; font-size: 21px; text-align: center; }
.simulation-result-banner__periods > i { padding: 7px 9px; border: 1px solid #f1d994; border-radius: 999px; background: white; color: #b17a00; font-size: 11px; font-style: normal; font-weight: 900; text-align: center; white-space: nowrap; }
.simulation-result-banner__summary > button { display: inline-flex; width: auto; height: 38px; min-width: 154px; min-height: 38px; align-items: center; justify-content: center; gap: 6px; justify-self: end; padding: 0 16px; border: 0; border-radius: 11px; background: #fbedb0; box-shadow: 0 2px 6px rgb(20 30 60 / 16%); color: #0a1680; font-size: 16px; font-weight: 700; }
@media (hover: hover) { .simulation-result-banner__summary > button:hover:not(:disabled) { background: #f1b94c; } }
.simulation-quest-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.simulation-quest-heading h2 { font-size: var(--type-section-title-size); font-weight: var(--type-section-title-weight); }
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

.quest-overview-card { --quest-ink: #222; --quest-paper: #fcfdff; --quest-navy: #0a1680; --quest-yellow: #fbedb0; --quest-lime: #44d795; --quest-blue: #93b2f8; --quest-peach: #f0574f; overflow: hidden; padding: 26px 28px 22px; border: 1px solid #e1e1e1; border-radius: 32px; background: var(--quest-paper); color: var(--quest-ink); box-shadow: none; }
.quest-overview-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.quest-overview-header h2 { color: var(--quest-ink); font-size: 20px; font-weight: 900; }
.quest-overview-tabs { display: grid; min-width: 240px; grid-template-columns: 1fr 1fr; gap: 8px; }
.quest-overview-tabs button { min-height: 42px; padding: 0 18px; border: 1px solid #e1e1e1; border-radius: 999px; background: #fff; color: #666; font-size: 14px; font-weight: 700; }
.quest-overview-tabs button strong { margin-left: 4px; font-size: 16px; }
.quest-overview-tabs button.active { border-color: var(--quest-navy); background: var(--quest-navy); color: #fff; }
.quest-overview-progress { margin-top: 20px; padding: 17px 20px; border: 1px solid rgb(10 22 128 / 12%); border-radius: 22px; background: var(--quest-yellow); color: var(--quest-ink); }
.quest-overview-progress__top { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 24px; }
.quest-overview-progress__top > strong { font-size: 15px; font-weight: 900; }
.quest-overview-progress__top > span { font-size: 13px; font-weight: 800; }
.quest-overview-progress__top > b { display: grid; grid-row: 1 / span 2; grid-column: 3; justify-items: end; color: var(--quest-navy); font-size: 21px; line-height: 1; }
.quest-overview-progress__top > b small { margin-top: 4px; font-size: 11px; font-weight: 700; }
.quest-overview-progress__track { height: 10px; margin-top: 11px; overflow: hidden; border-radius: 999px; background: rgb(255 255 255 / 72%); }
.quest-overview-progress__track span { display: block; height: 100%; border-radius: inherit; background: var(--quest-navy); transition: width .3s ease; }
.quest-overview-section { margin-top: 27px; }
.quest-overview-section > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
.quest-overview-section > header h3 { color: var(--quest-ink); font-size: 18px; font-weight: 900; }
.quest-overview-section > header p { margin-top: 5px; color: #6b7684; font-size: 13px; line-height: 1.5; }
.quest-overview-section > header > span { flex: none; padding: 6px 10px; border: 1px solid rgb(10 22 128 / 15%); border-radius: 999px; background: var(--quest-yellow); color: var(--quest-navy); font-size: 11px; font-weight: 800; }
.quest-overview-list { display: grid; gap: 12px; }
.quest-overview-row { display: grid; width: 100%; min-height: 72px; grid-template-columns: 44px minmax(0,1fr) auto auto 34px; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid rgb(10 22 128 / 12%); border-radius: 22px; color: var(--quest-ink); text-align: left; transition: border-color .16s ease,transform .16s ease,opacity .16s ease; }
.quest-overview-row:hover:not(.pending) { border-color: rgb(10 22 128 / 16%); transform: translateY(-1px); }
.quest-overview-row.is-expense,
.quest-overview-row.is-income,
.quest-overview-row.is-policy { background: #fff; }
.quest-overview-row.completed { opacity: .62; }
.quest-overview-row.pending { cursor: wait; opacity: .5; }
.quest-overview-row__icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 50%; }
.is-expense .quest-overview-row__icon { background: var(--quest-peach); color: #fff; }
.is-income .quest-overview-row__icon { background: var(--quest-lime); color: var(--quest-ink); }
.is-policy .quest-overview-row__icon { background: var(--quest-blue); color: var(--quest-navy); }
.quest-overview-row__copy { display: grid; min-width: 0; gap: 6px; }
.quest-overview-row__copy > strong { overflow: hidden; font-size: 15px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.quest-overview-row__copy small { color: #7a746d; font-size: 12px; }
.quest-overview-row__copy small b { color: var(--primary); font-weight: 900; }
.quest-overview-row__amount { grid-column: 3; font-size: 16px; font-weight: 900; white-space: nowrap; }
.is-expense .quest-overview-row__amount { color: var(--quest-peach); }
.is-income .quest-overview-row__amount { color: #168b5c; }
.is-policy .quest-overview-row__amount { grid-column: 4; color: var(--quest-navy); }
.quest-overview-row__apply { grid-column: 4; padding: 7px 11px; border-radius: 999px; background: var(--quest-navy); color: #fff; font-size: 12px; font-weight: 800; white-space: nowrap; }
.is-policy .quest-overview-row__apply { grid-column: 3; }
.quest-overview-row__apply:hover { background: #07105f; }
.quest-overview-row__check { display: grid; width: 32px !important; min-width: 32px; max-width: 32px; height: 32px !important; min-height: 32px !important; max-height: 32px; aspect-ratio: 1 / 1; grid-column: 5; place-self: center; place-items: center; padding: 0 !important; border: 2px solid #d8d2c4; border-radius: 10px; background: #fff; color: #fff; line-height: 1; }
.quest-overview-row.completed .quest-overview-row__check { border-color: var(--quest-navy); background: var(--quest-navy); }
.quest-overview-empty { display: grid; min-height: 116px; align-content: center; justify-items: center; gap: 8px; padding: 24px 34px; border: 1px solid #e1e1e1; border-radius: 22px; background: #fff; color: #666; text-align: center; }
.quest-overview-empty strong { font-size: 16px; font-weight: 900; }
.quest-overview-empty span { font-size: 13px; }
.quest-overview-footer { display: grid; width: 100%; align-items: center; justify-items: center; gap: 16px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee8dc; }
.quest-overview-footer p { width: 100%; color: #81776b; font-size: 14px; }
.quest-overview-footer button { display: inline-flex; width: 100%; min-height: 42px; align-items: center; justify-content: center; justify-self: stretch; gap: 7px; padding: 0 18px; border: 0; border-radius: 13px; background: #f5f7f9; color: #666666; font-size: 14px; font-weight: 800; text-align: center; }
.quest-overview-footer button:hover:not(:disabled) { background: #eef0f2; }

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
  .simulation-banner { min-height: 0; grid-template-columns: 1fr; gap: 26px; padding: 28px 20px 24px; border-radius: 22px; }
  .simulation-banner::after { top: -170px; right: -170px; }
  .simulation-banner__copy > small { font-size: 13px; }
  .simulation-banner__copy h2 { margin-top: 14px; font-size: 25px; letter-spacing: -.7px; line-height: 1.4; }
  .simulation-banner__copy > p { margin-top: 14px; font-size: 14px; }
  .simulation-banner__benefits { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-top: 24px; padding: 0; }
  .simulation-banner__benefits li { min-width: 0; flex-direction: column; gap: 7px; font-size: 13px; text-align: center; }
  .simulation-banner__benefits i { width: 42px; height: 42px; }
  .simulation-banner__benefits svg { width: 21px; height: 21px; }
  .simulation-banner__action { gap: 20px; }
  .simulation-banner__character { justify-content: center; gap: 8px; }
  .simulation-banner__character p { padding: 12px 14px; font-size: 12px; }
  .simulation-banner__character img { width: min(42vw,170px); }
  .simulation-banner__action > button { height: 50px; min-height: 50px; border-radius: 15px; font-size: 17px; }
  .simulation-result-banner { min-height: 0; grid-template-columns: minmax(0,1fr); gap: 22px; padding: 26px 20px 22px; border-radius: 24px; background: #fff6d9; }
  .simulation-result-banner__copy small { font-size: 13px; }
  .simulation-result-banner__copy h2 { margin-top: 22px; font-size: 22px; letter-spacing: -.6px; line-height: 1.55; }
  .simulation-result-banner__summary { grid-column: auto; gap: 20px; }
  .simulation-result-banner__periods { display: grid; min-height: 138px; grid-template-columns: minmax(0,1fr) 52px minmax(0,1fr); grid-template-rows: auto auto auto; align-items: center; gap: 4px; padding: 18px 20px; border-radius: 18px; background: #fff; box-shadow: 0 2px 8px rgb(120 100 20 / 6%); }
  .simulation-result-banner__periods > div { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto auto; align-items: center; justify-items: start; gap: 6px; }
  .simulation-result-banner__periods > div:first-child { grid-row: 1 / 4; grid-column: 1; }
  .simulation-result-banner__periods > div:last-child { grid-row: 1 / 4; grid-column: 3; justify-items: end; text-align: right; }
  .simulation-result-banner__periods > div span { grid-row: 1; grid-column: 1; font-size: 12px; }
  .simulation-result-banner__periods > div strong { grid-row: 2; grid-column: 1; font-size: 35px; }
  .simulation-result-banner__periods > div:first-child strong { color: #7e7565; font-size: 25px; }
  .simulation-result-banner__periods strong small { font-size: 17px; }
  .simulation-result-banner__periods > div:first-child strong small { font-size: 13px; }
  .simulation-result-banner__periods > div em { grid-row: 3; grid-column: 1; justify-self: inherit; padding: 3px 8px; font-size: 11px; }
  .simulation-result-banner__periods > b { grid-row: 2; grid-column: 2; align-self: center; padding: 0; color: #8d846f; font-size: 21px; }
  .simulation-result-banner__periods > i { grid-row: 1; grid-column: 2; align-self: end; justify-self: center; padding: 5px 9px; font-size: 11px; }
  .simulation-result-banner__summary > button { width: 100%; height: 54px; min-width: 0; min-height: 54px; justify-self: stretch; padding: 0 16px; border: 0; border-radius: 14px; background: #fbedb0; box-shadow: 0 2px 6px rgb(20 30 60 / 16%); color: #0a1680; font-size: 16px; font-weight: 700; }
  .quest-overview-card { padding: 18px 12px 15px; border-radius: 20px; }
  .quest-overview-header { display: grid; gap: 12px; }
  .quest-overview-header h2 { font-size: 18px; }
  .quest-overview-tabs { width: 100%; min-width: 0; gap: 8px; }
  .quest-overview-tabs button { min-height: 38px; padding: 0 10px; border-radius: 12px; font-size: 13px; }
  .quest-overview-tabs button strong { font-size: 15px; }
  .quest-overview-progress { margin-top: 16px; padding: 14px 13px; border-radius: 16px; }
  .quest-overview-progress__top { grid-template-columns: 1fr auto; gap: 8px 12px; }
  .quest-overview-progress__top > strong { font-size: 14px; }
  .quest-overview-progress__top > span { font-size: 11px; }
  .quest-overview-progress__top > b { grid-row: 2; grid-column: 1 / -1; justify-items: end; font-size: 18px; }
  .quest-overview-progress__track { height: 8px; }
  .quest-overview-section { margin-top: 22px; }
  .quest-overview-section > header { gap: 10px; margin-bottom: 13px; }
  .quest-overview-section > header h3 { font-size: 16px; }
  .quest-overview-section > header p { font-size: 12px; }
  .quest-overview-section > header > span { padding: 5px 8px; font-size: 10px; }
  .quest-overview-row { min-height: 68px; grid-template-columns: 40px minmax(0,1fr) 30px; gap: 8px; padding: 10px 9px; border-radius: 16px; }
  .quest-overview-row__icon { width: 36px; height: 36px; }
  .quest-overview-row__icon .app-icon { width: 21px; height: 21px; }
  .quest-overview-row__copy > strong { font-size: 14px; }
  .quest-overview-row__copy small { font-size: 10px; line-height: 1.4; }
  .quest-overview-row__amount { grid-row: 2; grid-column: 2; justify-self: start; font-size: 14px; }
  .quest-overview-row__apply { grid-row: 3; grid-column: 2; justify-self: start; padding: 6px 9px; font-size: 11px; }
  .quest-overview-row.is-policy { grid-template-columns: 40px minmax(0,1fr) auto 30px; }
  .is-policy .quest-overview-row__icon { grid-row: 1 / span 2; grid-column: 1; }
  .is-policy .quest-overview-row__copy { grid-row: 1; grid-column: 2 / span 2; }
  .is-policy .quest-overview-row__apply { grid-row: 2; grid-column: 2; justify-self: end; }
  .is-policy .quest-overview-row__amount { grid-row: 2; grid-column: 3; }
  .is-policy .quest-overview-row__check { grid-row: 1 / span 2; grid-column: 4; }
  .quest-overview-row__check { width: 30px !important; min-width: 30px; max-width: 30px; height: 30px !important; min-height: 30px !important; max-height: 30px; grid-row: 1 / span 3; grid-column: 3; border-radius: 9px; }
  .quest-overview-empty { min-height: 106px; justify-items: center; padding: 20px 16px; text-align: center; }
  .quest-overview-empty strong { font-size: 14px; }
  .quest-overview-empty span { font-size: 12px; }
  .quest-overview-footer { display: grid; gap: 16px; margin-top: 26px; padding-top: 20px; }
  .quest-overview-footer p { font-size: 12px; }
  .quest-overview-footer button { width: 100%; min-height: 38px; font-size: 13px; }
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
  .confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy { display: grid; width: 100%; grid-row: 1; grid-column: 2 / 4; grid-template-columns: minmax(0,1fr) auto; align-items: center; justify-items: start; gap: 12px; margin: 0; }
  .confirmed-timeline-marker__copy strong { grid-column: 2; margin: 0; font-size: 15px; }
  .confirmed-timeline-marker__copy span { grid-row: 1; grid-column: 1; max-width: none; font-size: 14px; }
  .confirmed-timeline-note { margin-top: 14px; font-size: 13px; text-align: left; }
  .simulation-quest-heading h2 { font-size: var(--type-section-title-size); font-weight: var(--type-section-title-weight); }
  .simulation-quest-card { padding: 14px 12px 16px; }
  .simulation-quest-tabs { width: 100%; height: 52px; margin-bottom: 16px; }
  .simulation-quest-progress strong { font-size: 15px; }
  .simulation-quest-progress > div:first-child > span { font-size: 13px; }
  .simulation-quest-progress__track { height: 14px; }
  .simulation-quest-period + .simulation-quest-period { margin-top: 20px; padding-top: 20px; }
  .simulation-quest-period > header { gap: 10px; margin-bottom: 14px; }
  .simulation-quest-period > header > span { padding: 6px 10px; }
  .simulation-quest-groups { gap: 20px; }
  .simulation-quest-row { min-height: 84px; grid-template-columns: 44px minmax(0,1fr) auto 30px; gap: 8px; padding: 12px 10px; border-radius: 18px; }
  .simulation-quest-row__icon { width: 40px; height: 40px; }
  .simulation-quest-row__copy strong,.simulation-quest-row__amount { font-size: 14px; font-weight: 800; }
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

@media (max-width: 767px) {
  .simulation-quest-status { margin-top: 20px; }
  .quest-overview-card {
    padding: 24px 20px 20px;
    border-color: #eee9df;
    border-radius: 30px;
    background: #fff;
  }
  .quest-overview-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }
  .quest-overview-header h2 { font-size: 20px; }
  .quest-overview-tabs {
    width: auto;
    min-width: 0;
    grid-template-columns: auto auto;
    gap: 0;
    padding: 4px;
    border-radius: 999px;
    background: #f5f1e8;
  }
  .quest-overview-tabs button {
    min-height: 38px;
    padding: 0 14px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #817665;
  }
  .quest-overview-tabs button.active {
    border: 0;
    background: #f7d778;
    color: #4e3a0c;
  }
  .quest-overview-progress {
    display: grid;
    gap: 12px;
    margin-top: 22px;
    padding: 18px 16px;
    border: 0;
    border-radius: 22px;
    background: #fff5d7;
    color: #755311;
  }
  .quest-overview-progress__top { display: contents; }
  .quest-overview-progress__top > strong { grid-row: 1; grid-column: 1; font-size: 15px; }
  .quest-overview-progress__top > span { grid-row: 1; grid-column: 2; align-self: center; justify-self: end; font-size: 13px; }
  .quest-overview-progress__track { grid-row: 2; grid-column: 1 / 3; height: 9px; margin: 0; background: #ecdca8; }
  .quest-overview-progress__track span { background: #eeb238; }
  .quest-overview-progress__top > b {
    display: flex;
    grid-row: 3;
    grid-column: 1 / 3;
    flex-direction: row-reverse;
    align-items: center;
    justify-content: space-between;
    color: var(--primary);
    font-size: 20px;
  }
  .quest-overview-progress__top > b small { margin: 0; color: var(--primary); font-size: 12px; }
  .quest-overview-section { margin-top: 26px; }
  .quest-overview-section > header { align-items: center; margin-bottom: 14px; }
  .quest-overview-section > header h3 { font-size: 18px; }
  .quest-overview-section > header p { margin-top: 5px; font-size: 12px; }
  .quest-overview-section > header > span { border: 0; background: #fff3cf; color: var(--primary); font-size: 11px; }
  .quest-overview-row,
  .quest-overview-row.is-policy {
    min-height: 76px;
    grid-template-columns: 44px minmax(0, 1fr) auto 34px;
    grid-template-rows: auto auto;
    gap: 3px 10px;
    padding: 12px 14px;
    border: 0;
    border-radius: 20px;
  }
  .quest-overview-row.is-expense { background: #fff3f1; }
  .quest-overview-row.is-income { background: #effaf5; }
  .quest-overview-row.is-policy { background: #f4f1fb; }
  .quest-overview-row__icon,
  .is-policy .quest-overview-row__icon { width: 40px; height: 40px; grid-row: 1 / 3; grid-column: 1; align-self: center; }
  .is-expense .quest-overview-row__icon { background: #f9deda; color: #cf5e54; }
  .is-income .quest-overview-row__icon { background: #dcefe5; color: #238b62; }
  .is-policy .quest-overview-row__icon { background: #e8e1f6; color: #7560ae; }
  .quest-overview-row__copy,
  .is-policy .quest-overview-row__copy { grid-row: 1 / 3; grid-column: 2; align-self: center; gap: 4px; }
  .quest-overview-row__copy > strong { font-size: 15px; }
  .quest-overview-row__copy small { font-size: 11px; }
  .quest-overview-row__amount,
  .is-policy .quest-overview-row__amount { grid-row: 1 / 3; grid-column: 3; align-self: center; justify-self: end; font-size: 15px; }
  .quest-overview-row__check,
  .is-policy .quest-overview-row__check {
    width: 34px !important;
    min-width: 34px;
    max-width: 34px;
    height: 34px !important;
    min-height: 34px !important;
    max-height: 34px;
    grid-row: 1 / 3;
    grid-column: 4;
    border-color: #ded6c5;
    border-radius: 10px;
  }
  .is-policy .quest-overview-row__apply {
    z-index: 1;
    grid-row: 2;
    grid-column: 3;
    justify-self: end;
    padding: 5px 8px;
    font-size: 10px;
    transform: translateY(19px);
  }
  .quest-overview-footer { gap: 16px; margin-top: 28px; padding-top: 20px; }
  .quest-overview-footer button {
    width: 100% !important;
    min-height: 54px;
    align-items: center;
    justify-content: center;
    justify-self: stretch;
    gap: 0;
    border: 0;
    border-radius: 16px;
    background: #f2f3f5;
    color: #666;
    font-size: 16px;
    text-align: center;
  }
  .quest-overview-footer button .app-icon { display: none; }
}
</style>
