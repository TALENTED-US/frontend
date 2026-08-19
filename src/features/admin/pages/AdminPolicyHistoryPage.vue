<script setup>
import { onMounted, ref } from 'vue'
import { getAdminPolicyHistory, getAdminPolicyReviewQueue, setPolicyReviewExcluded } from '@/features/admin/api/policyApi'
import AppIcon from '@/components/ui/AppIcon.vue'

const TYPE_LABEL = { auto: '자동 수집', manual: '수정' }

const history = ref([])
const reviewQueue = ref([])
const saved = ref(false)

async function load() {
  history.value = await getAdminPolicyHistory()
  reviewQueue.value = await getAdminPolicyReviewQueue()
}

async function toggleExclude(item) {
  const next = !item.excludedFromRecommend
  await setPolicyReviewExcluded(item.id, next)
  item.excludedFromRecommend = next
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

function save() {
  saved.value = true
  setTimeout(() => (saved.value = false), 1500)
}

onMounted(load)
</script>

<template>
  <section class="admin-policy-history">
    <RouterLink to="/admin/policies" class="admin-policy-history__back"
      ><AppIcon name="chevron-left" :size="20" />정부지원정책 관리</RouterLink
    >
    <header class="admin-policy-history__header">
      <div>
        <h1>정책 변경 이력·검수</h1>
        <p>크롤링으로 수집된 정책 변경 사항을 확인하고 검수하세요.</p>
      </div>
      <button type="button" class="admin-policy-history__save" @click="save">{{ saved ? '저장됨' : '저장하기' }}</button>
    </header>

    <article class="admin-card">
      <h2>변경 이력</h2>
      <p class="admin-policy-history__caption">최근 크롤링·수동 수정 이력을 시간순으로 표시합니다.</p>
      <ul class="admin-policy-history__list">
        <li v-for="entry in history" :key="entry.id">
          <span>{{ formatDateTime(entry.at) }} · {{ entry.summary }}</span>
          <span :class="['admin-badge', `admin-badge--${entry.type}`]">{{ TYPE_LABEL[entry.type] }}</span>
        </li>
      </ul>
    </article>

    <article class="admin-card">
      <h2>신규 크롤링 정책 검수</h2>
      <p class="admin-policy-history__caption">새로 수집된 정책 정보를 확인하고 노출 여부를 결정하세요.</p>
      <div v-for="item in reviewQueue" :key="item.id" class="admin-policy-history__review-item">
        <p class="admin-policy-history__review-name">{{ item.name }}</p>
        <div class="admin-policy-history__review-tags">
          <span class="admin-badge admin-badge--category">{{ item.category }}</span>
          <span class="admin-badge admin-badge--open">모집중</span>
        </div>
        <button type="button" :class="{ active: item.excludedFromRecommend }" @click="toggleExclude(item)">
          {{ item.excludedFromRecommend ? '추천 목록에서 제외됨' : '추천 목록에서 제외' }}
        </button>
      </div>
      <p v-if="reviewQueue.length === 0" class="admin-policy-history__empty">검수할 신규 정책이 없어요.</p>
    </article>
  </section>
</template>

<style scoped>
.admin-policy-history__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-policy-history__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-top: 10px;
}

.admin-policy-history__header h1 {
  color: var(--text);
  font-size: 28px;
  font-weight: 800;
}

.admin-policy-history__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-policy-history__save {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700;
}

.admin-card {
  margin-top: 20px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-card h2 {
  color: var(--text);
  font-size: var(--font-body);
  font-weight: 800;
}

.admin-policy-history__caption {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-policy-history__list {
  display: grid;
  gap: 4px;
  margin-top: 16px;
}

.admin-policy-history__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: var(--canvas);
  color: var(--text);
  font-size: var(--font-small);
}

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-badge--auto {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--manual {
  background: #fef3c7;
  color: #f59e0b;
}

.admin-badge--category {
  background: #f3e8ff;
  color: #9333ea;
}

.admin-badge--open {
  background: #dcfce7;
  color: #22c55e;
}

.admin-policy-history__review-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.admin-policy-history__review-name {
  color: var(--text);
  font-weight: 700;
}

.admin-policy-history__review-tags {
  display: flex;
  gap: 8px;
}

.admin-policy-history__review-item button {
  margin-left: auto;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-policy-history__review-item button.active {
  border-color: #ef4444;
  color: #ef4444;
}

.admin-policy-history__empty {
  margin-top: 16px;
  color: var(--subtle);
  font-size: var(--font-small);
}
</style>
