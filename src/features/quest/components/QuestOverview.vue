<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useQuestStore } from '@/features/quest/stores/quest'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { calculateQuestExp, formatExp, useProgressionStore } from '@/stores/progression'
import { expenseCategoryIconPath } from '@/features/simulation/utils/expenseCategoryIcon'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  editLoading: { type: Boolean, default: false },
})

const quests = useQuestStore()
const simulation = useSimulationStore()
const progression = useProgressionStore()
const tab = ref('active')
const monthKey = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const completionId = (item) => quests.remoteEnabled
  ? item.id
  : item.recurrence === 'monthly' ? `${item.id}@${monthKey.value}` : item.id
const completedIds = computed(() => new Set(simulation.state.completedQuestIds || []))
const isCompleted = (item) => quests.remoteEnabled
  ? item.completed
  : completedIds.value.has(completionId(item))
const completedCount = computed(() => props.rows.filter(isCompleted).length)
const activeCount = computed(() => props.rows.length - completedCount.value)
const completionPercent = computed(() => props.rows.length
  ? Math.round((completedCount.value / props.rows.length) * 100)
  : 0)
const questExp = (item) => quests.remoteEnabled ? item.expReward : calculateQuestExp(item.amount)
const claimableExp = computed(() => props.rows
  .filter((item) => !isCompleted(item))
  .reduce((sum, item) => sum + questExp(item), 0))
const isRewarded = (item) => quests.remoteEnabled
  ? item.completed
  : progression.isQuestClaimed(completionId(item))
const isPending = (item) => quests.remoteEnabled && quests.isPending(item.id)
const iconName = (item) => ({ expense: 'arrow-down', income: 'briefcase', policy: 'landmark' }[item.kind] || 'check-circle')
const signedWon = (value) => {
  const amount = Math.round(Number(value) || 0)
  return `${amount > 0 ? '+' : amount < 0 ? '-' : ''}${Math.abs(amount).toLocaleString('ko-KR')}원`
}
const sections = computed(() => [
  { key: 'recurring', title: '매월 정기 퀘스트', description: '지출 절감·정기 수입·정기 정책 퀘스트가 매월 갱신돼요.', rows: props.rows.filter((item) => item.recurrence === 'monthly') },
  { key: 'once', title: '일회성 퀘스트', description: '한 번 완료하면 유지되는 수입·정책 퀘스트예요.', rows: props.rows.filter((item) => item.recurrence === 'once') },
].map((section) => ({
  ...section,
  visibleRows: section.rows.filter((item) => tab.value === 'completed' ? isCompleted(item) : !isCompleted(item)),
})))

async function toggle(item) {
  if (quests.remoteEnabled) return quests.toggleQuest(item.id)
  const id = completionId(item)
  if (isCompleted(item)) progression.cancelQuestClaim(id, item.amount)
  else progression.claimQuest(id, item.amount)
  simulation.toggleQuestCompletion(id)
}
</script>

<template>
  <article class="quest-overview-card">
    <header class="quest-overview-header">
      <h2>퀘스트 현황</h2>
      <div class="quest-overview-tabs" role="tablist" aria-label="퀘스트 상태">
        <button type="button" :class="{ active: tab === 'active' }" @click="tab = 'active'">진행 중 <strong>{{ activeCount }}</strong></button>
        <button type="button" :class="{ active: tab === 'completed' }" @click="tab = 'completed'">완료 <strong>{{ completedCount }}</strong></button>
      </div>
    </header>
    <div v-if="quests.remoteEnabled && (quests.loading || quests.error)" class="quest-api-notice" :class="{ error: quests.error }" role="status">
      <span>{{ quests.loading ? '퀘스트를 불러오는 중이에요.' : quests.error }}</span>
      <button v-if="quests.error" type="button" @click="quests.fetchQuests()">다시 시도</button>
    </div>
    <section class="quest-overview-progress">
      <div class="quest-overview-progress__top">
        <strong>퀘스트 완료율 {{ completionPercent }}%</strong><span>{{ completedCount }} / {{ rows.length }} 완료</span>
        <b>{{ formatExp(claimableExp) }} EXP<small>획득 가능</small></b>
      </div>
      <div class="quest-overview-progress__track" role="progressbar" :aria-valuenow="completionPercent" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${completionPercent}%` }" /></div>
    </section>
    <section v-for="section in sections" :key="section.key" class="quest-overview-section">
      <header><div><h3>{{ section.title }}</h3><p>{{ section.description }}</p></div><span v-if="section.key === 'recurring'">{{ monthKey }} 기준</span></header>
      <div v-if="section.visibleRows.length" class="quest-overview-list">
        <div v-for="item in section.visibleRows" :key="item.id" class="quest-overview-row-wrap" :class="`is-${item.kind}`">
          <a v-if="item.kind === 'policy' && item.questUrl" class="quest-overview-row__apply quest-overview-row__apply--mobile" :href="item.questUrl" target="_blank" rel="noopener noreferrer" @click.stop>신청하기</a>
          <article class="quest-overview-row" :class="[`is-${item.kind}`, { completed: isCompleted(item), pending: isPending(item) }]">
          <span class="quest-overview-row__icon"><svg v-if="item.kind === 'expense'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="expenseCategoryIconPath(item.expenseCategory || item.name)" /></svg><AppIcon v-else :name="iconName(item)" :size="24" /></span>
          <span class="quest-overview-row__copy">
            <span class="quest-overview-row__title">
              <strong>{{ item.name }}</strong>
              <a v-if="item.kind === 'policy' && item.questUrl" class="quest-overview-row__apply quest-overview-row__apply--inline" :href="item.questUrl" target="_blank" rel="noopener noreferrer" @click.stop>신청하기</a>
            </span>
            <small><template v-if="item.recurrence !== 'monthly'">{{ item.subtitle || '일회성' }} · </template><b>+{{ formatExp(questExp(item)) }} EXP</b><template v-if="isRewarded(item)"> · 지급 완료</template></small>
          </span>
          <strong class="quest-overview-row__amount">{{ signedWon(item.amount) }}</strong>
          <button class="quest-overview-row__check" type="button" :aria-label="`${item.name} ${isCompleted(item) ? '완료 취소' : '완료 처리'}`" :aria-pressed="isCompleted(item)" :disabled="isPending(item)" @click="toggle(item)"><AppIcon v-if="isCompleted(item)" name="check" :size="18" /></button>
          </article>
        </div>
      </div>
      <div v-else class="quest-overview-empty"><strong>{{ tab === 'completed' ? '완료한 퀘스트가 없어요.' : '진행 중인 퀘스트가 없어요.' }}</strong></div>
    </section>
    <footer class="quest-overview-footer"><p>퀘스트를 추가하려면 시뮬레이션을 수정하세요.</p><RouterLink to="/simulation/edit" :class="{ disabled: editLoading }">시뮬레이션 수정하기</RouterLink></footer>
  </article>
</template>

<style scoped>
.quest-overview-card{--ink:#222;--navy:#0a1680;--yellow:#fbedb0;overflow:hidden;padding:26px 28px 22px;border:1px solid #e1e1e1;border-radius:32px;background:#fcfdff;color:var(--ink)}
.quest-overview-header{display:flex;align-items:center;justify-content:space-between;gap:24px}.quest-overview-header h2{font-size:20px;font-weight:900}.quest-overview-tabs{display:grid;min-width:240px;grid-template-columns:1fr 1fr;gap:8px}.quest-overview-tabs button{min-height:42px;padding:0 18px;border:1px solid #e1e1e1;border-radius:999px;background:#fff;color:#666;font-size:14px;font-weight:700}.quest-overview-tabs button.active{border-color:var(--navy);background:var(--navy);color:#fff}
.quest-api-notice{display:flex;justify-content:space-between;margin-top:14px;padding:10px 12px;border-radius:10px;background:#f5f6f8;color:#666}.quest-api-notice.error{background:#fff1f1;color:#c33}
.quest-overview-progress{margin-top:20px;padding:17px 20px;border-radius:22px;background:var(--yellow)}.quest-overview-progress__top{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:24px}.quest-overview-progress__top>b{display:grid;justify-items:end;color:var(--navy);font-size:21px}.quest-overview-progress__top small{font-size:11px}.quest-overview-progress__track{height:10px;margin-top:11px;overflow:hidden;border-radius:99px;background:#ffffffb8}.quest-overview-progress__track span{display:block;height:100%;background:var(--navy)}
.quest-overview-section{margin-top:27px}.quest-overview-section>header{display:flex;justify-content:space-between;gap:20px;margin-bottom:16px}.quest-overview-section h3{font-size:18px}.quest-overview-section p{margin-top:5px;color:#6b7684;font-size:13px}.quest-overview-section>header>span{height:max-content;padding:6px 10px;border-radius:99px;background:var(--yellow);color:var(--navy);font-size:11px;font-weight:800}.quest-overview-list{display:grid;gap:12px}
.quest-overview-row-wrap{position:relative;min-width:0}.quest-overview-row{position:relative;display:grid;min-height:72px;grid-template-columns:44px minmax(0,1fr) auto auto 34px;align-items:center;gap:12px;padding:10px 14px;border:1px solid #e1e1e1;border-radius:22px;background:#fff}.quest-overview-row.completed{opacity:.62}.quest-overview-row__icon{display:grid;width:40px;height:40px;place-items:center;border-radius:50%;background:#93b2f8}.is-expense .quest-overview-row__icon{background:#f0574f;color:#fff}.is-income .quest-overview-row__icon{background:#44d795}.quest-overview-row__copy{display:grid;min-width:0;gap:6px}.quest-overview-row__title{display:flex;min-width:0;align-items:center;gap:8px}.quest-overview-row__title>strong{overflow:hidden;min-width:0;font-size:15px;text-overflow:ellipsis;white-space:nowrap}.quest-overview-row__copy small{color:#7a746d;font-size:12px}.quest-overview-row__copy b{color:#8a5b00}.quest-overview-row__amount{grid-column:3;font-size:16px;white-space:nowrap}.quest-overview-row__apply{flex:none;padding:5px 9px;border-radius:99px;background:var(--navy);color:#fff;font-size:11px;font-weight:800;white-space:nowrap}.quest-overview-row__apply--mobile{display:none}.is-policy.quest-overview-row{grid-template-columns:44px minmax(0,1fr) auto 34px}.is-policy .quest-overview-row__amount{grid-column:3}.is-policy .quest-overview-row__check{grid-column:4}.quest-overview-row__check{display:grid!important;width:32px!important;min-width:32px!important;height:32px!important;min-height:32px!important;grid-column:5;place-items:center;padding:0!important;border:2px solid #d8d2c4;border-radius:10px;background:#fff;color:#fff}.completed .quest-overview-row__check{border-color:var(--navy);background:var(--navy)}
.quest-overview-empty{display:grid;min-height:116px;place-items:center;border:1px solid #e1e1e1;border-radius:22px;background:#fff;color:#666}.quest-overview-footer{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:32px;padding-top:24px;border-top:1px solid #eee8dc}.quest-overview-footer p{color:#81776b;font-size:14px}.quest-overview-footer a{display:flex;min-height:42px;align-items:center;justify-content:center;padding:0 18px;border-radius:13px;background:#f5f7f9;color:#666;font-size:14px;font-weight:800;text-decoration:none}
@media(max-width:767px){.quest-overview-card{padding:18px 12px 15px;border-radius:20px}.quest-overview-header{display:grid;gap:12px}.quest-overview-tabs{width:100%;min-width:0}.quest-overview-tabs button{min-height:38px;padding:0 10px;font-size:13px}.quest-overview-progress{padding:14px 13px}.quest-overview-progress__top{grid-template-columns:1fr auto;gap:8px 12px}.quest-overview-progress__top>b{grid-column:1/-1;font-size:18px}.quest-overview-section>header{gap:10px}.quest-overview-section>header>span{white-space:nowrap}.quest-overview-section h3{font-size:16px}.quest-overview-section p{display:none}.quest-overview-row{min-height:68px;grid-template-columns:40px minmax(0,1fr) 30px;gap:8px;padding:10px 9px;border-radius:16px}.quest-overview-row__icon{width:36px;height:36px}.quest-overview-row__title>strong{font-size:14px}.quest-overview-row__copy small{font-size:10px}.quest-overview-row__amount{grid-row:2;grid-column:2;font-size:14px}.quest-overview-row__check{width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;grid-row:1/span 2;grid-column:3}.is-policy.quest-overview-row-wrap{padding-top:30px}.quest-overview-row__apply--inline{display:none}.quest-overview-row__apply--mobile{position:absolute;top:0;right:0;z-index:1;display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;font-size:10px}.is-policy.quest-overview-row{grid-template-columns:40px minmax(0,1fr) auto 30px}.is-policy .quest-overview-row__copy{grid-column:2}.is-policy .quest-overview-row__amount{grid-row:2;grid-column:3}.is-policy .quest-overview-row__check{grid-column:4}.quest-overview-footer{display:grid;gap:16px}.quest-overview-footer p{display:none}.quest-overview-footer a{width:100%}}
</style>
