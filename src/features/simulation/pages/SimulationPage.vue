<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { calculateQuestExp, formatExp, useProgressionStore } from '@/stores/progression'
import SimulationTimelineChart from '@/features/simulation/components/SimulationTimelineChart.vue'
import meltingImage from '@/assets/images/dashboard/buttie-melting.png'
import cautionImage from '@/assets/images/dashboard/buttie-caution.png'
import stableImage from '@/assets/images/dashboard/buttie-stable.png'
import '@/features/simulation/styles/simulation.css'

const router = useRouter()
const simulation = useSimulationStore()
const progression = useProgressionStore()
const money = (value) => new Intl.NumberFormat('ko-KR').format(value)
const manwon = (value) => value ? `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value / 10000)}만원` : '없음'
const expectedLabel = computed(() => simulation.state.confirmed ? `${simulation.expectedMonths}개월` : '?개월')
const statusImages = { danger: meltingImage, caution: cautionImage, safe: stableImage }
const currentStatusImage = computed(() => statusImages[simulation.currentStatus.key])
const expectedStatusImage = computed(() => statusImages[simulation.expectedStatus.key])
const questTab = ref('active')
const compactWon = (value) => {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  return amount >= 10000 && amount % 10000 === 0 ? `${money(amount / 10000)}만원` : `${money(amount)}원`
}
const signedWon = (value) => {
  const amount = Math.round(Number(value) || 0)
  return amount ? `${amount > 0 ? '+' : '-'}${compactWon(Math.abs(amount))}` : compactWon(0)
}
const dateDots = (value) => String(value || '').replaceAll('-', '.')
const questRows = computed(() => [
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
const questMonthKey = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const recurringQuestIds = computed(() => questRows.value.filter((item) => item.recurrence === 'monthly').map((item) => item.id))
watch([questMonthKey, () => recurringQuestIds.value.join('|')], ([monthKey]) => {
  simulation.migrateRecurringQuestCompletions(recurringQuestIds.value, monthKey)
  progression.migrateRecurringQuestClaims(recurringQuestIds.value, monthKey)
}, { immediate: true })
const questCompletionId = (item) => item.recurrence === 'monthly' ? `${item.id}@${questMonthKey.value}` : item.id
const completedQuestIds = computed(() => new Set(simulation.state.completedQuestIds || []))
const isQuestCompleted = (item) => completedQuestIds.value.has(questCompletionId(item))
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
const oneTimeBenefitText = computed(() => simulation.oneTimeIncome + simulation.oneTimePolicy > 0
  ? `일시 수입·혜택 ${compactWon(simulation.oneTimeIncome + simulation.oneTimePolicy)} 별도`
  : '정기 반영 금액 기준')

function toggleQuest(item) {
  const id = questCompletionId(item)
  if (isQuestCompleted(item)) progression.cancelQuestClaim(id, item.amount)
  else progression.claimQuest(id, item.amount)
  simulation.toggleQuestCompletion(id)
}

function start() {
  router.push(simulation.hasDraft ? '/simulation/continue' : '/simulation/new')
}
</script>

<template>
  <section class="page sim-page">
    <header class="sim-heading desktop-only">
      <h1>시뮬레이션</h1>
      <p>계획을 세우고 버티는 기간이 얼마나 늘어나는지 확인해보세요.</p>
    </header>

    <article class="sim-hero">
      <div class="sim-hero__copy">
        <small>💡 시뮬레이션 해보기</small>
        <h2>지출을 10만원 줄이면<br />버티는 기간이 얼마나 늘어날까요?</h2>
        <button class="sim-btn sim-btn--orange desktop-cta" type="button" @click="start">
          {{ simulation.hasDraft ? '시나리오 수정하기 →' : '지금 시뮬레이션 하기 →' }}
        </button>
      </div>
      <div class="sim-hero__result">
        <div><span>현재 버티는 기간</span><strong>{{ simulation.currentMonths }}<em>개월</em></strong><img :src="currentStatusImage" :alt="`${simulation.currentStatus.label} 상태의 버티`" /><b :class="simulation.currentStatus.key">{{ simulation.currentStatus.label }}</b></div>
        <i>→</i>
        <div><span>예상 버티는 기간</span><strong>{{ expectedLabel }}</strong><img v-if="simulation.state.confirmed" :src="expectedStatusImage" :alt="`${simulation.expectedStatus.label} 상태의 버티`" /><b v-if="simulation.state.confirmed" :class="simulation.expectedStatus.key">{{ simulation.expectedStatus.label }}</b></div>
      </div>
      <button class="sim-btn sim-btn--orange mobile-cta" type="button" @click="start">
        {{ simulation.hasDraft ? '시나리오 수정하기 →' : '지금 시뮬레이션 하기 →' }}
      </button>
    </article>

    <section v-if="simulation.state.confirmed" class="sim-quests simulation-quest-status">
      <div class="simulation-quest-heading"><h2>퀘스트 현황</h2><span>확정됨</span></div>
      <article class="simulation-quest-card">
        <div class="simulation-quest-tabs" role="tablist" aria-label="퀘스트 상태"><button type="button" :class="{ active: questTab === 'active' }" @click="questTab = 'active'">진행 중 {{ activeQuestCount }}</button><button type="button" :class="{ active: questTab === 'completed' }" @click="questTab = 'completed'">완료 {{ completedQuestCount }}</button></div>
        <div class="simulation-quest-progress"><div><strong>퀘스트 완료율 {{ questCompletionPercent }}%</strong><span>{{ completedQuestCount }} / {{ questRows.length }} 완료</span></div><div class="simulation-quest-progress__track" role="progressbar" :aria-valuenow="questCompletionPercent" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${questCompletionPercent}%` }" /></div></div>
        <section v-for="section in visibleQuestSections" :key="section.key" class="simulation-quest-period">
          <header><div><h3>{{ section.title }}</h3><p>{{ section.description }}</p></div><span v-if="section.key === 'recurring'">{{ questMonthKey }} 기준</span></header>
          <div v-if="section.groups.length" class="simulation-quest-groups">
            <section v-for="group in section.groups" :key="group.key" class="simulation-quest-group" :class="`simulation-quest-group--${group.key}`">
              <div class="simulation-quest-group__heading"><h3><i />{{ group.title }}</h3><strong v-if="group.amount">{{ signedWon(group.amount) }}</strong><strong v-else>{{ group.action }}</strong></div>
              <button v-for="item in group.rows" :key="item.id" type="button" class="simulation-quest-row" :class="[`simulation-quest-row--${item.kind}`, { completed: isQuestCompleted(item) }]" :aria-pressed="isQuestCompleted(item)" @click="toggleQuest(item)">
                <span class="simulation-quest-row__icon">{{ item.icon }}</span><span class="simulation-quest-row__copy"><strong>{{ item.name }}</strong><small v-if="item.subtitle">{{ item.subtitle }}</small><small class="exp">+{{ formatExp(calculateQuestExp(item.amount)) }} EXP<template v-if="progression.isQuestClaimed(questCompletionId(item))"> · 지급 완료</template></small></span><strong class="simulation-quest-row__amount">{{ signedWon(item.amount) }}</strong><span class="simulation-quest-row__check">{{ isQuestCompleted(item) ? '✓' : '' }}</span>
              </button>
            </section>
          </div>
          <p v-else class="simulation-quest-empty-row">{{ questTab === 'completed' ? '완료한 퀘스트가 없어요.' : '진행 중인 퀘스트가 없어요.' }}</p>
        </section>
        <footer class="simulation-quest-footer"><span>월 순지출 개선액 (지출·수입 기준)</span><strong>{{ compactWon(simulation.monthlyImprovement) }} / 월</strong><p>{{ oneTimeBenefitText }}</p><button type="button" @click="start">시나리오 수정하기 →</button></footer>
      </article>
    </section>
    <section v-else class="sim-quests"><h2>퀘스트 <small>(To Do List)</small></h2><button class="sim-empty" type="button" @click="start"><strong>아직 확정된 시나리오가 없어요</strong><span>시뮬레이션을 실행하고 계획을 확정하면 여기에 실행 목표가 표시돼요.</span></button></section>

    <section class="sim-report">
      <h2>현재 재정 리포트</h2>
      <div class="sim-report-grid">
        <article><span>총자산</span><strong>{{ manwon(simulation.totalAssets) }}</strong></article><article><span>월평균 수입</span><strong>{{ manwon(simulation.monthlyIncome) }}</strong></article><article><span>월평균 지출</span><strong>{{ manwon(simulation.monthlyExpense) }}</strong></article><article><span>순현금흐름</span><strong>{{ simulation.monthlyIncome - simulation.monthlyExpense > 0 ? '+' : '' }}{{ manwon(simulation.monthlyIncome - simulation.monthlyExpense) }}</strong></article>
      </div>
    </section>

    <article class="sim-card sim-timeline"><h2>월별 재정 타임라인</h2><SimulationTimelineChart :assets="simulation.availableAssets" :monthly-expense="simulation.monthlyExpense" :monthly-income="simulation.monthlyIncome" :target-months="simulation.targetMonths" :current-months="simulation.currentMonths" :expected-months="simulation.expectedMonths" :unknown="!simulation.state.confirmed" /></article>
  </section>
</template>

<style scoped>
.mobile-cta { display: none; }
.sim-hero__result .caution { background: #f4b63c; color: #fff; }
.simulation-quest-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.simulation-quest-heading h2 { font-size: 22px; }
.simulation-quest-heading > span { padding: 10px 18px; border-radius: 999px; background: #f6bb37; color: white; font-weight: 800; box-shadow: 0 4px 10px rgb(0 0 0 / 12%); }
.simulation-quest-card { padding: 22px 24px 18px; border: 1px solid #e1e4ea; border-radius: 22px; background: white; box-shadow: 0 2px 8px rgb(0 0 0 / 10%); }
.simulation-quest-tabs { display: grid; width: min(72%, 520px); height: 44px; grid-template-columns: 1fr 1fr; margin-bottom: 20px; padding: 3px; border: 1px solid #e1e4ea; border-radius: 999px; background: #f2f3f6; }
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
.simulation-quest-footer { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 5px 18px; margin-top: 22px; padding-top: 16px; border-top: 1px solid #e4e6ea; }
.simulation-quest-footer span,.simulation-quest-footer p { color: #818793; font-size: 12px; }
.simulation-quest-footer strong { grid-column: 2; grid-row: 1 / span 2; font-size: 18px; white-space: nowrap; }
.simulation-quest-footer button { grid-column: 1 / -1; justify-self: center; margin-top: 7px; font-size: 13px; font-weight: 800; }

@media (max-width: 767px) {
  .sim-hero__copy .desktop-cta { display: none; }
  .sim-hero > .mobile-cta {
    display: inline-flex;
    width: 100%;
  }
  .simulation-quest-heading h2 { font-size: 20px; }
  .simulation-quest-heading > span { padding: 8px 15px; }
  .simulation-quest-card { padding: 14px 12px 16px; }
  .simulation-quest-tabs { width: 100%; height: 52px; margin-bottom: 16px; }
  .simulation-quest-progress__track { height: 14px; }
  .simulation-quest-period + .simulation-quest-period { margin-top: 20px; padding-top: 20px; }
  .simulation-quest-period > header { gap: 10px; margin-bottom: 14px; }
  .simulation-quest-period > header > span { padding: 4px 7px; }
  .simulation-quest-groups { gap: 20px; }
  .simulation-quest-row { min-height: 84px; grid-template-columns: 44px minmax(0,1fr) auto 30px; gap: 8px; padding: 12px 10px; border-radius: 18px; }
  .simulation-quest-row__icon { width: 40px; height: 40px; }
  .simulation-quest-row__copy strong,.simulation-quest-row__amount { font-size: 13px; }
  .simulation-quest-row__copy small { white-space: normal; }
  .simulation-quest-footer strong { font-size: 17px; }
}
</style>
