<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminFinancialStates, adminLevels as levelDefs } from '@/features/admin/data/adminMockData'
import {
  getAdminLevelStats,
  getAdminLevels,
  getAdminQuestCategories,
  getAdminRewardErrors,
  getAdminRewardHistory,
  resolveAdminRewardError,
  submitManualReward,
  updateAdminLevelThresholds,
  updateAdminQuestExp,
} from '@/features/admin/api/levelApi'
import LevelThresholdModal from '@/features/admin/components/level/LevelThresholdModal.vue'
import ManualRewardModal from '@/features/admin/components/level/ManualRewardModal.vue'

import stable1 from '@/assets/images/admin/level-mascots/level-stable-1.png'
import stable2 from '@/assets/images/admin/level-mascots/level-stable-2.png'
import stable3 from '@/assets/images/admin/level-mascots/level-stable-3.png'
import stable4 from '@/assets/images/admin/level-mascots/level-stable-4.png'
import stable5 from '@/assets/images/admin/level-mascots/level-stable-5.png'
import caution1 from '@/assets/images/admin/level-mascots/level-caution-1.png'
import caution2 from '@/assets/images/admin/level-mascots/level-caution-2.png'
import caution3 from '@/assets/images/admin/level-mascots/level-caution-3.png'
import caution4 from '@/assets/images/admin/level-mascots/level-caution-4.png'
import caution5 from '@/assets/images/admin/level-mascots/level-caution-5.png'
import risk1 from '@/assets/images/admin/level-mascots/level-risk-1.png'
import risk2 from '@/assets/images/admin/level-mascots/level-risk-2.png'
import risk3 from '@/assets/images/admin/level-mascots/level-risk-3.png'
import risk4 from '@/assets/images/admin/level-mascots/level-risk-4.png'
import risk5 from '@/assets/images/admin/level-mascots/level-risk-5.png'

const MASCOTS = {
  stable: [stable1, stable2, stable3, stable4, stable5],
  caution: [caution1, caution2, caution3, caution4, caution5],
  risk: [risk1, risk2, risk3, risk4, risk5],
}

const stats = ref(null)
const levels = ref([])
const questCategories = ref([])
const editingQuestId = ref('')
const editingExp = ref(0)
const rewardHistory = ref([])
const rewardKeyword = ref('')
const rewardFrom = ref('2026-07-01')
const rewardTo = ref('2026-07-23')
const rewardType = ref('all')

const showLevelModal = ref(false)
const rewardModalMode = ref('')
const rewardErrors = ref([])
const activeRewardError = ref(null)

const financialStates = adminFinancialStates
const levelDefinitions = levelDefs

function mascotFor(stateKey, levelIndex) {
  return MASCOTS[stateKey][levelIndex]
}

async function loadStats() {
  stats.value = await getAdminLevelStats()
}

async function loadLevels() {
  const result = await getAdminLevels()
  levels.value = result.levels
}

async function loadQuests() {
  questCategories.value = await getAdminQuestCategories()
}

async function loadRewardHistory() {
  rewardHistory.value = await getAdminRewardHistory({
    keyword: rewardKeyword.value,
    from: rewardFrom.value,
    to: rewardTo.value,
    type: rewardType.value,
  })
}

async function setAllPeriod() {
  rewardFrom.value = ''
  rewardTo.value = ''
  await loadRewardHistory()
}

async function resetRewardFilters() {
  rewardKeyword.value = ''
  rewardFrom.value = '2026-07-01'
  rewardTo.value = '2026-07-23'
  rewardType.value = 'all'
  await loadRewardHistory()
}

async function loadRewardErrors() {
  rewardErrors.value = await getAdminRewardErrors()
}

function openRewardModal(mode, errorItem) {
  activeRewardError.value = errorItem
  rewardModalMode.value = mode
}

function closeRewardModal() {
  rewardModalMode.value = ''
  activeRewardError.value = null
}

async function saveLevelThresholds(newLevels) {
  levels.value = await updateAdminLevelThresholds(newLevels)
  showLevelModal.value = false
}

function startEditQuest(quest) {
  editingQuestId.value = quest.id
  editingExp.value = quest.exp
}

async function saveQuestExp(quest) {
  await updateAdminQuestExp(quest.id, editingExp.value)
  quest.exp = editingExp.value
  editingQuestId.value = ''
}

async function submitReward(payload) {
  await submitManualReward({ ...payload, action: rewardModalMode.value })
  if (activeRewardError.value) {
    await resolveAdminRewardError(activeRewardError.value.id)
  }
  closeRewardModal()
  await Promise.all([loadRewardHistory(), loadStats(), loadRewardErrors()])
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  await Promise.all([loadStats(), loadLevels(), loadQuests(), loadRewardHistory(), loadRewardErrors()])
})
</script>

<template>
  <section class="admin-level">
    <div class="admin-level__content" :class="{ 'is-dimmed': showLevelModal || rewardModalMode }">
      <header class="admin-level__header">
        <h1>경험치 및 버티 관리</h1>
        <p>퀘스트 보상 경험치와 버티 성장 단계를 설정하고 관리하세요.</p>
      </header>

      <div v-if="stats" class="admin-level__stats">
        <article class="admin-card">
          <p class="label">지급 건수</p>
          <p class="value value--info">{{ stats.grantCount }}건</p>
          <p class="caption">이번 기간 기준</p>
        </article>
        <article class="admin-card">
          <p class="label">회수 건수</p>
          <p class="value value--danger">{{ stats.revokeCount }}개</p>
          <p class="caption">이번 기간 기준</p>
        </article>
        <article class="admin-card">
          <p class="label">지급 정확도</p>
          <p class="value value--success">{{ stats.accuracy }}%</p>
          <p class="caption">오류 재처리 제외 기준</p>
        </article>
        <article class="admin-card">
          <p class="label">퀘스트 100% 달성 인원</p>
          <p class="value value--primary">{{ stats.questCompleteUsers }}명</p>
          <p class="caption">시나리오 전체 완료 기준</p>
        </article>
      </div>

      <div class="admin-level__banner">
        <div class="admin-level__banner-col">
          <p>재정 상태 분류 기준 (목표 취업 시점 대비 예상 생존기간 차이)</p>
          <small>안정: 목표 이상 달성 · 주의: 목표 대비 3개월 이내 부족 · 위험: 목표 대비 3개월 이상 부족</small>
        </div>
        <div class="admin-level__banner-divider" />
        <div class="admin-level__banner-col">
          <p>레벨 · 버티 이미지 변경 안내</p>
          <small>퀘스트를 완료하면 EXP가 오르고, EXP가 쌓이면 레벨이 올라가며 레벨에 따라 버티 이미지가 달라져요.</small>
        </div>
      </div>

      <article class="admin-card">
        <div class="admin-level__section-head">
          <div>
            <h2>레벨 승급 기준 (레벨 × 재정 상태 이미지)</h2>
            <p>누적 EXP로 레벨이 오르고, 재정 상태(안정·주의·위험)에 따라 버티 이미지가 달라져요.</p>
          </div>
          <button type="button" class="admin-level__edit-btn" @click="showLevelModal = true">레벨 승급 기준 수정</button>
        </div>

        <div class="admin-level__grid">
          <div class="admin-level__grid-header">
            <span></span>
            <span v-for="def in levelDefinitions" :key="def.level">LEVEL {{ def.level }} · {{ def.exp }} EXP</span>
          </div>
          <div v-for="state in financialStates" :key="state.key" class="admin-level__grid-row">
            <span class="admin-level__state-label">
              <i :style="{ background: state.color }" />{{ state.label }}
            </span>
            <div v-for="(def, index) in levelDefinitions" :key="def.level" class="admin-level__mascot-cell">
              <img
                :src="mascotFor(state.key, index)"
                :alt="`${state.label} LEVEL ${def.level}`"
                :class="{ 'admin-level__mascot--lg': def.level === 5 }"
              />
            </div>
          </div>
        </div>
      </article>

      <article class="admin-card">
        <h2>퀘스트 관리</h2>
        <p class="admin-level__caption">
          카테고리별 퀘스트는 사용자가 시뮬레이션에서 직접 생성해요. 관리자는 유형별 지급 EXP만 설정해요.
        </p>

        <table>
          <thead>
            <tr>
              <th>카테고리</th>
              <th>지급 조건 (사용자 생성 예시)</th>
              <th>상태</th>
              <th>지급 EXP</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quest in questCategories" :key="quest.id">
              <td><span :class="['admin-badge', `admin-badge--${quest.tone}`]">{{ quest.category }}</span></td>
              <td>{{ quest.example }}</td>
              <td><span class="admin-badge admin-badge--success">{{ quest.active ? '진행중' : '완료' }}</span></td>
              <td class="strong">
                <span v-if="editingQuestId !== quest.id">+{{ quest.exp }} EXP</span>
                <input v-else v-model.number="editingExp" type="number" class="admin-level__inline-input" />
              </td>
              <td>
                <button v-if="editingQuestId !== quest.id" type="button" @click="startEditQuest(quest)">수정</button>
                <span v-else class="admin-level__inline-actions">
                  <button type="button" @click="saveQuestExp(quest)">저장</button>
                  <button type="button" @click="editingQuestId = ''">취소</button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="admin-level__footnote">퀘스트 자체는 사용자가 시뮬레이션에서 만들고, 여기서는 카테고리별 지급 EXP만 관리해요.</p>
      </article>

      <h2 class="admin-level__history-title">보상 능력치 지급 · 회수 이력</h2>
      <form class="admin-level__toolbar" @submit.prevent="loadRewardHistory">
        <input v-model="rewardKeyword" type="text" placeholder="회원 ID · 닉네임" />
        <button type="button" class="admin-level__all-period" @click="setAllPeriod">전체 기간</button>
        <input v-model="rewardFrom" type="date" />
        <input v-model="rewardTo" type="date" />
        <select v-model="rewardType">
          <option value="all">전체 유형</option>
          <option value="grant">지급</option>
          <option value="revoke">회수</option>
        </select>
        <button type="button" class="admin-level__reset" @click="resetRewardFilters">초기화</button>
        <button type="submit">조회</button>
      </form>

      <article class="admin-card">
        <table>
          <thead>
            <tr>
              <th>처리일시</th>
              <th>회원</th>
              <th>사유</th>
              <th>지급 내역</th>
              <th>처리자</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in rewardHistory" :key="entry.id">
              <td>{{ formatDateTime(entry.at) }}</td>
              <td class="strong">{{ entry.member }}</td>
              <td>{{ entry.reason }}</td>
              <td :class="entry.delta > 0 ? 'text-success' : 'text-danger'">
                {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta }} EXP {{ entry.delta > 0 ? '지급' : '회수' }}
              </td>
              <td>{{ entry.actor }}</td>
            </tr>
          </tbody>
        </table>
      </article>

      <footer class="admin-level__footer">
        <div class="admin-level__error-box">
          <div class="admin-level__error-box-head">
            <h3>지급 오류 신고 {{ rewardErrors.length }}건</h3>
            <div class="admin-level__error-box-actions">
              <button type="button" class="admin-level__error-grant" @click="openRewardModal('grant', null)">수동 지급</button>
              <button type="button" class="admin-level__error-revoke" @click="openRewardModal('revoke', null)">수동 회수</button>
            </div>
          </div>
          <p>지급 로직 오류로 확인된 건이 있어요. 수동으로 처리해 주세요.</p>
          <div class="admin-level__error-list">
            <table>
              <thead>
                <tr>
                  <th>처리일시</th>
                  <th>회원</th>
                  <th>내용</th>
                  <th>지급 내역</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in rewardErrors" :key="item.id">
                  <td>{{ formatDateTime(item.at) }}</td>
                  <td class="strong">{{ item.member }}</td>
                  <td class="admin-level__error-reason">{{ item.reason }}</td>
                  <td :class="item.type === 'under' ? 'text-success' : 'text-danger'">
                    {{ item.type === 'under' ? '+' : '-' }}{{ item.exp }} EXP {{ item.type === 'under' ? '지급 필요' : '회수 필요' }}
                  </td>
                  <td>
                    <button v-if="item.type === 'under'" type="button" class="admin-level__error-grant" @click="openRewardModal('grant', item)">수동 지급</button>
                    <button v-else type="button" class="admin-level__error-revoke" @click="openRewardModal('revoke', item)">수동 회수</button>
                  </td>
                </tr>
                <tr v-if="rewardErrors.length === 0">
                  <td colspan="5" class="admin-level__error-empty">처리할 지급 오류가 없어요.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="admin-level__notice">
          <h3>이력 관리 안내</h3>
          <p>· 지급 조건 변경은 이미 지급된 보상에 소급 적용되지 않아요.</p>
          <p>· 경험치 획득 경로는 시뮬레이션 퀘스트 완료로 한정돼요.</p>
          <p>· 자동 지급 오류 발생 시 위에서 수동으로 지급·회수할 수 있어요.</p>
        </div>
      </footer>
    </div>

    <LevelThresholdModal v-if="showLevelModal" :levels="levels" @close="showLevelModal = false" @save="saveLevelThresholds" />
    <ManualRewardModal
      v-if="rewardModalMode"
      :mode="rewardModalMode"
      :prefill="activeRewardError ? { member: activeRewardError.member, exp: activeRewardError.exp, reason: activeRewardError.reason } : {}"
      @close="closeRewardModal"
      @submit="submitReward"
    />
  </section>
</template>

<style scoped>
.admin-level__content.is-dimmed {
  opacity: 0.5;
  pointer-events: none;
}

.admin-level__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-level__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-level__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.admin-card {
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-level__stats .label {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-level__stats .value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 800;
}

.value--info {
  color: #3b82f6;
}

.value--danger {
  color: #ef4444;
}

.value--success {
  color: #22c55e;
}

.value--primary {
  color: #0a1680;
}

.admin-level__stats .caption {
  margin-top: 4px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-level__banner {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 20px;
  margin-top: 16px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  background: var(--primary-soft);
}

.admin-level__banner-col {
  flex: 1 1 260px;
}

.admin-level__banner-divider {
  width: 1px;
  background: rgba(10, 22, 128, 0.15);
  align-self: stretch;
}

.admin-level__banner p {
  color: #0a1680;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-level__banner small {
  display: block;
  margin-top: 4px;
  color: #3b5bdb;
  font-size: var(--font-caption);
}

.admin-level__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.admin-level__section-head h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-level__section-head p {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-card {
  margin-top: 16px;
}

.admin-level__edit-btn {
  padding: 8px 18px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700 !important;
  white-space: nowrap;
}

.admin-level__grid {
  margin-top: 18px;
}

.admin-level__grid-header {
  display: grid;
  grid-template-columns: 80px repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 10px;
  color: var(--text);
  font-size: var(--font-caption);
  font-weight: 700;
  text-align: center;
}

.admin-level__grid-header span:first-child {
  text-align: left;
}

.admin-level__grid-row {
  display: grid;
  grid-template-columns: 80px repeat(5, 1fr);
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
}

.admin-level__state-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-level__state-label i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.admin-level__mascot-cell {
  position: relative;
  display: grid;
  place-items: center;
}

.admin-level__mascot-cell img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.admin-level__mascot-cell img.admin-level__mascot--lg {
  width: 84px;
  height: 84px;
}

.admin-level__caption {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-caption);
}

table {
  width: 100%;
  margin-top: 14px;
  border-collapse: collapse;
  font-size: var(--font-small);
}

th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: var(--font-caption);
  text-align: left;
}

td {
  padding: 12px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
}

td.strong {
  color: var(--text);
  font-weight: 700;
}

.text-success {
  color: #22c55e;
  font-weight: 700;
}

.text-danger {
  color: #ef4444;
  font-weight: 700;
}

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.admin-badge--danger {
  background: #fee2e2;
  color: #ef4444;
}

.admin-badge--warning {
  background: #fef3c7;
  color: #b45309;
}

.admin-badge--purple {
  background: #f3e8ff;
  color: #9333ea;
}

.admin-badge--success {
  background: #dcfce7;
  color: #22c55e;
}

.admin-level__inline-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.admin-level__inline-actions {
  display: flex;
  gap: 8px;
}

td button {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-level__footnote {
  margin-top: 12px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-level__history-title {
  margin-top: 32px;
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
}

.admin-level__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.admin-level__toolbar input,
.admin-level__toolbar select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-level__toolbar select {
  padding-right: 36px;

  /* 브라우저 기본 토글 화살표 제거 */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* 커스텀 토글 아이콘(▾) 넣기 및 위치 조절 */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.admin-level__toolbar input[type='text'] {
  flex: 1 1 0;
  min-width: 140px;
}

.admin-level__toolbar button[type='submit'] {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700 !important;
  white-space: nowrap;
}

.admin-level__reset {
  padding: 10px 16px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-level__all-period {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-level__footer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.admin-level__notice {
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.admin-level__notice h3 {
  color: var(--text);
  font-size: var(--font-body);
  font-weight: 800;
}

.admin-level__notice p {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-level__error-box {
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.admin-level__error-box-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-level__error-box-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.admin-level__error-box h3 {
  color: #222222;
  font-size: var(--font-body);
  font-weight: 800;
}

.admin-level__error-box p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-level__error-list {
  margin-top: 14px;
  max-height: 280px;
  overflow-y: auto;
}

.admin-level__error-list table {
  margin-top: 0;
}

.admin-level__error-list tbody tr {
  border-top: 1px solid #f2f4f7;
}

.admin-level__error-list tbody tr:hover {
  background: #fffdf4;
}

.admin-level__error-reason {
  color: var(--muted);
}

.admin-level__error-grant {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
  color: #222222;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-level__error-grant:hover {
  background: var(--canvas);
}

.admin-level__error-revoke {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
  color: #222222;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-level__error-revoke:hover {
  background: var(--canvas);
}

.admin-level__error-empty {
  padding: 12px 6px;
  color: var(--subtle);
  font-size: 14px;
}

@media (max-width: 1200px) {
  .admin-level__stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
