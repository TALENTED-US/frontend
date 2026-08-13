<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useQuestStore } from '@/features/quest/stores/quest'
import { loadTransactions } from '@/features/finance/financeStore'
import { calculateQuestExp, formatExp, useProgressionStore } from '@/stores/progression'
import simulationBannerButtie from '@/assets/images/dashboard/buttie-melting.png'
import ConfirmedFinancialTimeline from '@/features/simulation/components/ConfirmedFinancialTimeline.vue'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const simulation = useSimulationStore()
const progression = useProgressionStore()
const quests = useQuestStore()
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const questTab = ref('active')
const showNewSimulationModal = ref(false)
const compactWon = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  return `${money(amount)}원`
}
const signedWon = (value) => {
  const amount = Math.round(Number(value) || 0)
  return amount ? `${amount > 0 ? '+' : '-'}${compactWon(Math.abs(amount))}` : compactWon(0)
}
const dateDots = (value) => String(value || '').replaceAll('-', '.')
const localQuestRows = computed(() => [
  ...(simulation.state.expenseApplied ? simulation.selectedExpenses.map((item) => ({
    id: `expense-${item.id}`, icon: item.icon, name: `${item.name === '교통' ? '교통비' : item.name} ${compactWon(item.saving)} 줄이기`, subtitle: '', amount: -item.saving, kind: 'expense', recurrence: 'monthly',
  })) : []),
  ...simulation.state.incomes.map((item) => ({
    id: `income-${item.id}`, icon: '💼', name: item.name,
    subtitle: item.type === 'monthly' ? `정기수입 · ${item.cycle || '매월'} ${Number(item.startDate?.slice(-2)) || 1}일` : `일회성 수입 · ${dateDots(item.startDate)}`,
    amount: item.amount, kind: 'income', recurrence: item.type === 'monthly' ? 'monthly' : 'once',
  })),
  ...simulation.state.policies.map((item) => ({
    id: `policy-${item.id}`, icon: '🏛️', name: item.name, subtitle: item.detail || item.description || '정책 혜택', amount: Number(item.amount) || 0, kind: 'policy', recurrence: item.type === 'monthly' ? 'monthly' : 'once',
  })),
])
const questRows = computed(() => quests.remoteEnabled ? quests.rows : localQuestRows.value)
const questMonthKey = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const recurringQuestIds = computed(() => questRows.value.filter((item) => item.recurrence === 'monthly').map((item) => item.id))
watch([questMonthKey, () => recurringQuestIds.value.join('|')], ([monthKey]) => {
  if (quests.remoteEnabled) return
  simulation.migrateRecurringQuestCompletions(recurringQuestIds.value, monthKey)
  progression.migrateRecurringQuestClaims(recurringQuestIds.value, monthKey)
}, { immediate: true })
const questCompletionId = (item) => quests.remoteEnabled
  ? item.id
  : item.recurrence === 'monthly' ? `${item.id}@${questMonthKey.value}` : item.id
const completedQuestIds = computed(() => new Set(simulation.state.completedQuestIds || []))
const isQuestCompleted = (item) => quests.remoteEnabled
  ? item.completed
  : completedQuestIds.value.has(questCompletionId(item))
const completedQuestCount = computed(() => questRows.value.filter(isQuestCompleted).length)
const activeQuestCount = computed(() => questRows.value.length - completedQuestCount.value)
const questCompletionPercent = computed(() => questRows.value.length ? Math.round(completedQuestCount.value / questRows.value.length * 100) : 0)
const buildQuestGroups = (rows) => [
  { key: 'expense', title: '지출 줄이기' }, { key: 'income', title: '수입 늘리기' }, { key: 'policy', title: '정책 혜택', action: '신청 가능' },
].map((group) => {
  const groupRows = rows.filter((item) => item.kind === group.key)
  return { ...group, rows: groupRows, amount: group.key === 'policy' ? 0 : groupRows.reduce((sum, item) => sum + item.amount, 0) }
}).filter((group) => group.rows.length)
const questSections = computed(() => [
  { key: 'recurring', title: '매월 정기 퀘스트', description: '지출 절감·정기 수입·정기 정책 퀘스트가 매월 갱신돼요.', rows: questRows.value.filter((item) => item.recurrence === 'monthly') },
  { key: 'once', title: '일회성 퀘스트', description: '한 번 완료하면 유지되는 수입·정책 퀘스트예요.', rows: questRows.value.filter((item) => item.recurrence === 'once') },
])
const visibleQuestSections = computed(() => questSections.value.map((section) => ({
  ...section,
  groups: buildQuestGroups(section.rows.filter((item) => questTab.value === 'completed' ? isQuestCompleted(item) : !isQuestCompleted(item))),
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
  try {
    await loadTransactions()
  } catch {
    // hydrateConfirmed에서 동일한 오류를 사용자에게 안내한다.
  }
  // 확정 직후에는 확인 화면에 표시했던 계산 결과를 그대로 유지한다.
  // 새로고침/직접 접근처럼 메모리 스냅샷이 없을 때만 서버 결과를 조회한다.
  simulation.restoreConfirmedSnapshot()
  if (simulation.state.confirmed && simulation.recentConfirmed) {
    await quests.fetchQuests(
      simulation.recentConfirmed.simulationId,
      simulation.recentConfirmed,
    )
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
      <h1>시뮬레이션</h1>
      <p>계획을 세우고 버티는 기간이 얼마나 늘어나는지 확인해보세요.</p>
    </header>

    <article class="simulation-banner">
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
    <p v-if="simulation.syncError" class="api-notice" role="alert">{{ simulation.syncError }}</p>

    <section v-if="simulation.state.confirmed" class="sim-quests simulation-quest-status">
      <div class="simulation-quest-heading"><h2>퀘스트 현황</h2><span>확정됨</span></div>
      <article class="simulation-quest-card">
        <div v-if="quests.remoteEnabled && (quests.loading || quests.error)" class="simulation-quest-api-notice" :class="{ error: quests.error }" role="status">
          <span>{{ quests.loading ? '퀘스트를 불러오는 중이에요.' : quests.error }}</span>
          <button v-if="quests.error" type="button" @click="quests.fetchQuests()">다시 시도</button>
        </div>
        <div class="simulation-quest-tabs" role="tablist" aria-label="퀘스트 상태"><button type="button" :class="{ active: questTab === 'active' }" @click="questTab = 'active'">진행 중 {{ activeQuestCount }}</button><button type="button" :class="{ active: questTab === 'completed' }" @click="questTab = 'completed'">완료 {{ completedQuestCount }}</button></div>
        <div class="simulation-quest-progress"><div><strong>퀘스트 완료율 {{ questCompletionPercent }}%</strong><span>{{ completedQuestCount }} / {{ questRows.length }} 완료</span></div><div class="simulation-quest-progress__track" role="progressbar" :aria-valuenow="questCompletionPercent" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${questCompletionPercent}%` }" /></div></div>
        <section v-for="section in visibleQuestSections" :key="section.key" class="simulation-quest-period">
          <header><div><h3>{{ section.title }}</h3><p>{{ section.description }}</p></div><span v-if="section.key === 'recurring'">{{ questMonthKey }} 기준</span></header>
          <div v-if="section.groups.length" class="simulation-quest-groups">
            <section v-for="group in section.groups" :key="group.key" class="simulation-quest-group" :class="`simulation-quest-group--${group.key}`">
              <div class="simulation-quest-group__heading"><h3><i />{{ group.title }}</h3><strong v-if="group.amount">{{ signedWon(group.amount) }}</strong><strong v-else>{{ group.action }}</strong></div>
              <button v-for="item in group.rows" :key="item.id" type="button" class="simulation-quest-row" :class="[`simulation-quest-row--${item.kind}`, { completed: isQuestCompleted(item) }]" :aria-pressed="isQuestCompleted(item)" :aria-busy="isQuestPending(item)" :disabled="isQuestPending(item)" @click="toggleQuest(item)">
                <span class="simulation-quest-row__icon">{{ item.icon }}</span><span class="simulation-quest-row__copy"><strong>{{ item.name }}</strong><small v-if="item.subtitle">{{ item.subtitle }}</small><small class="exp">+{{ formatExp(questExp(item)) }} EXP<template v-if="isQuestRewarded(item)"> · 지급 완료</template></small></span><strong class="simulation-quest-row__amount">{{ signedWon(item.amount) }}</strong><span class="simulation-quest-row__check">{{ isQuestCompleted(item) ? '✓' : '' }}</span>
              </button>
            </section>
          </div>
          <p v-else class="simulation-quest-empty-row">{{ questTab === 'completed' ? '완료한 퀘스트가 없어요.' : '진행 중인 퀘스트가 없어요.' }}</p>
        </section>
        <footer class="simulation-quest-footer">
          <button type="button" :disabled="simulation.syncing" @click="start">
            {{ simulation.syncing ? '전환하는 중…' : '시뮬레이션 수정하기' }}
          </button>
          <p>퀘스트를 추가하려면 시뮬레이션을 수정하세요.</p>
        </footer>
      </article>
    </section>

    <ConfirmedFinancialTimeline
      v-if="simulation.state.confirmed && simulation.runwayCalculationReady"
      :current-months="Number(simulation.currentMonths)"
      :expected-months="Number(simulation.expectedMonths)"
      :target-months="Number(simulation.targetMonths)"
    />

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
        <p>새 시뮬레이션을 생성하면 기존에 확정된 시뮬레이션이 삭제됩니다.<br />그래도 다시 생성하시겠습니까?</p>
        <p v-if="simulation.syncError" class="api-notice">{{ simulation.syncError }}</p>
        <div>
          <button type="button" :disabled="simulation.syncing" @click="showNewSimulationModal = false">취소</button>
          <button class="simulation-primary-cta" type="button" :disabled="simulation.syncing" @click="createNewSimulation">
            {{ simulation.syncing ? '삭제하는 중…' : '새로 만들기' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.simulation-banner { position: relative; display: grid; min-height: max(500px,calc(100dvh - var(--header-height) - 210px)); grid-template-columns: minmax(0,1fr) minmax(360px,432px); gap: 48px; overflow: hidden; padding: 56px; border-radius: 28px; background: linear-gradient(105deg,#fff3c4 0%,#fff8de 34%,#fffdf6 62%,#fff 100%); box-shadow: 0 2px 16px rgb(120 100 20 / 7%); }
.simulation-banner::after { position: absolute; top: -140px; right: -80px; width: 420px; height: 420px; border-radius: 50%; background: radial-gradient(circle,rgb(255 220 110 / 30%),rgb(255 220 110 / 0%) 70%); content: ''; pointer-events: none; }
.simulation-banner__copy,.simulation-banner__action { position: relative; z-index: 1; }
.simulation-banner__copy { display: flex; min-width: 0; flex-direction: column; }
.simulation-banner__copy > small { color: #b08a16; font-size: 15px; font-weight: 600; }
.simulation-banner__copy h2 { margin-top: 18px; color: #2a2620; font-size: 38px; font-weight: 800; letter-spacing: -1.1px; line-height: 1.36; }
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
.simulation-quest-progress__track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#f6c34c,#f0a93d); transition: width .3s ease; }
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
.confirmed-timeline-track__line { position: absolute; top: 34px; right: 0; left: 0; height: 7px; border-radius: 999px; background: linear-gradient(90deg,var(--primary),#8facf5 68%,var(--accent-strong)); }
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

.simulation-new-modal { position: fixed; z-index: 1000; inset: 0; display: grid; padding: 24px; place-items: center; background: rgb(18 22 30 / 48%); }
.simulation-new-modal > section { width: min(100%, 390px); padding: 28px 24px 22px; border-radius: 20px; background: #fff; box-shadow: 0 18px 48px rgb(10 15 25 / 24%); text-align: center; }
.simulation-new-modal__icon { display: grid; width: 46px; height: 46px; margin: 0 auto 16px; place-items: center; border-radius: 50%; background: #fff3d2; color: #e7a21b; font-size: 24px; font-weight: 900; }
.simulation-new-modal h2 { font-size: 19px; }
.simulation-new-modal p { margin-top: 12px; color: #737a87; font-size: 12px; line-height: 1.65; }
.simulation-new-modal section > div { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 24px; }
.simulation-new-modal section > div button { min-height: 48px; border-radius: 12px; background: #f2f3f6; color: #666d78; font-size: 14px; font-weight: 800; }
.simulation-new-modal section > div button:last-child { background: #ffeca4; color: #222; }

@media (min-width: 768px) {
  .simulation-new-modal h2 { font-size: 21px; }
  .simulation-new-modal p { font-size: 14px; }
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
  .confirmed-timeline-description { font-size: 13px; line-height: 1.5; }
  .confirmed-timeline-track { display: grid; height: auto; gap: 14px; margin: 22px 0 8px; padding-left: 2px; }
  .confirmed-timeline-track__line { top: 18px; right: auto; bottom: 18px; left: 22px; width: 5px; height: auto; background: linear-gradient(180deg,var(--primary),#8facf5 68%,var(--accent-strong)); }
  .confirmed-timeline-marker,
  .confirmed-timeline-marker:last-of-type { position: relative; top: auto; left: auto !important; display: grid; width: 100%; max-width: none; grid-template-columns: 46px minmax(0,1fr) auto; align-items: center; justify-items: start; gap: 12px; transform: none; text-align: left; }
  .confirmed-timeline-marker i { z-index: 1; grid-row: 1; grid-column: 1; width: 44px; height: 44px; }
  .confirmed-timeline-marker__copy,
  .confirmed-timeline-marker.is-staggered .confirmed-timeline-marker__copy { display: grid; width: 100%; grid-row: 1; grid-column: 2 / 4; grid-template-columns: minmax(0,1fr) auto; align-items: center; justify-items: start; gap: 12px; margin: 0; }
  .confirmed-timeline-marker__copy strong { grid-column: 2; margin: 0; font-size: 15px; }
  .confirmed-timeline-marker__copy span { grid-row: 1; grid-column: 1; max-width: none; font-size: 14px; }
  .confirmed-timeline-note { margin-top: 14px; font-size: 13px; text-align: left; }
  .simulation-quest-heading h2 { font-size: var(--type-section-title-size); font-weight: var(--type-section-title-weight); }
  .simulation-quest-heading > span { padding: 8px 15px; font-size: 10px; font-weight: 700; }
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
  .simulation-new-modal p { font-size: 12px; font-weight: 400; line-height: 1.5; }
  .simulation-quest-empty-row {
    font-size: var(--type-empty-size);
    font-weight: var(--type-empty-weight);
  }
  .simulation-quest-period > header > span { font-size: 12px; font-weight: 700; }
  .simulation-quest-row__copy small { white-space: normal; }
  .simulation-quest-footer strong { font-size: 17px; }
  .simulation-new-modal section > div button,
  .simulation-quest-footer button { font-size: 17px; font-weight: 800; }
  .simulation-create-new-bottom { font-size: 15px; font-weight: 700; }
}
</style>
