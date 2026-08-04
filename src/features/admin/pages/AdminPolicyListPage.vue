<script setup>
import { computed, onMounted, ref } from 'vue'
import { adminPolicyCategories, adminPolicyRegions } from '@/features/admin/data/adminMockData'
import { deleteAdminPolicy, getAdminPolicies, setAdminPolicyRecommendStatus } from '@/features/admin/api/policyApi'

const STATUS_LABEL = { open: '모집중', 'closing-soon': '마감임박', closed: '마감' }
const SOURCE_LABEL = { crawl: '크롤링 자동 수집', manual: '수동 등록' }
const RECOMMEND_LABEL = { active: '추천중', 'auto-excluded': '자동 제외(마감)', 'manual-excluded': '수동 제외(오류)' }

const keyword = ref('')
const category = ref('all')
const region = ref('all')
const status = ref('all')
const policies = ref([])

async function search() {
  policies.value = await getAdminPolicies({ keyword: keyword.value, category: category.value, region: region.value, status: status.value })
}

function resetFilters() {
  keyword.value = ''
  category.value = 'all'
  region.value = 'all'
  status.value = 'all'
  search()
}

async function toggleRecommendExcluded(policy, excluded) {
  const recommendStatus = excluded ? 'manual-excluded' : 'active'
  await setAdminPolicyRecommendStatus(policy.id, recommendStatus)
  policy.recommendStatus = recommendStatus
}

async function removePolicy(policy) {
  await deleteAdminPolicy(policy.id)
  policies.value = policies.value.filter((item) => item.id !== policy.id)
}

const lastCrawledAt = computed(() => '07.16 03:00')

onMounted(search)
</script>

<template>
  <section class="admin-policies">
    <header class="admin-policies__header">
      <h1>정부지원정책 관리</h1>
      <p>크롤링으로 수집된 정책을 확인하고 노출 여부를 관리하세요.</p>
    </header>

    <form class="admin-policies__toolbar" @submit.prevent="search">
      <input v-model="keyword" type="text" placeholder="정책명 검색" />
      <button type="button" class="admin-policies__reset" @click="resetFilters">초기화</button>
      <select v-model="category">
        <option value="all">전체 카테고리</option>
        <option v-for="option in adminPolicyCategories" :key="option" :value="option">{{ option }}</option>
      </select>
      <select v-model="region">
        <option value="all">전체 지역</option>
        <option v-for="option in adminPolicyRegions" :key="option" :value="option">{{ option }}</option>
      </select>
      <select v-model="status">
        <option value="all">전체 상태</option>
        <option value="open">모집중</option>
        <option value="closing-soon">마감임박</option>
        <option value="closed">마감</option>
      </select>
      <button type="submit" class="admin-policies__search">검색 및 조회</button>
    </form>

    <article class="admin-card">
      <div class="admin-policies__list-head">
        <h2>정책 목록</h2>
        <div class="admin-policies__list-head-right">
          <span>매일 새벽 3시 자동 크롤링 · 마지막 갱신 {{ lastCrawledAt }}</span>
          <RouterLink to="/admin/policies/new" class="admin-policies__register">정책 등록</RouterLink>
        </div>
      </div>

      <div class="admin-policies__table-wrap">
        <table>
          <thead>
            <tr>
              <th>정책명 · 대상</th>
              <th>지원금</th>
              <th>신청기간</th>
              <th>상태</th>
              <th>수동 제외</th>
              <th>추천 여부</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="policy in policies" :key="policy.id">
              <td>
                <p class="strong">{{ policy.name }}</p>
                <small class="admin-policies__subtext">{{ policy.target }}</small>
              </td>
              <td class="strong">{{ policy.amount }}</td>
              <td>{{ policy.period }}</td>
              <td>
                <span :class="['admin-badge', `admin-badge--${policy.status}`]">{{ STATUS_LABEL[policy.status] }}</span>
                <br />
                <small class="admin-policies__subtext">{{ SOURCE_LABEL[policy.source] }}</small>
              </td>
              <td>
                <input
                  type="checkbox"
                  :checked="policy.recommendStatus === 'manual-excluded'"
                  @change="toggleRecommendExcluded(policy, $event.target.checked)"
                />
              </td>
              <td>
                <span :class="['admin-badge', `admin-badge--rec-${policy.recommendStatus}`]">{{ RECOMMEND_LABEL[policy.recommendStatus] }}</span>
              </td>
              <td class="admin-policies__actions-cell">
                <div class="admin-policies__row-actions">
                  <RouterLink :to="`/admin/policies/${policy.id}/edit`">수정</RouterLink>
                  <span>·</span>
                  <button type="button" class="danger" @click="removePolicy(policy)">삭제</button>
                </div>
              </td>
            </tr>
            <tr v-if="policies.length === 0">
              <td colspan="7" class="admin-policies__empty">조건에 맞는 정책이 없어요.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="admin-policies__footer">
        <p>마감된 정책은 자동으로 추천 목록에서 제외됩니다. 체크박스를 선택하면 즉시 수동으로 추천에서 제외돼요.</p>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.admin-policies__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-policies__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-policies__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.admin-policies__toolbar input,
.admin-policies__toolbar select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-policies__toolbar input {
  flex: 1 1 200px;
}

.admin-policies__toolbar select {
  flex: 0 1 auto;
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

.admin-policies__search {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700;
  white-space: nowrap;
}

.admin-policies__reset {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-policies__register {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: #222222;
  font-weight: 400;
  white-space: nowrap;
}

.admin-card {
  margin-top: 20px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-policies__list-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-policies__list-head-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-policies__list-head h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-policies__list-head span {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-policies__table-wrap {
  width: 100%;
  margin-top: 14px;
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 720px;
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
  vertical-align: top;
}

td.strong {
  color: var(--text);
  font-weight: 700;
}

.admin-policies__subtext {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.admin-badge--open {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--closing-soon {
  background: #fef3c7;
  color: #f59e0b;
}

.admin-badge--closed {
  background: #f1f5f9;
  color: #94a3b8;
}

.admin-badge--rec-active {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--rec-auto-excluded {
  background: #f1f5f9;
  color: #94a3b8;
}

.admin-badge--rec-manual-excluded {
  background: #fee2e2;
  color: #ef4444;
}

.admin-policies__actions-cell {
  vertical-align: middle;
}

.admin-policies__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.admin-policies__row-actions a {
  color: #3b82f6;
  font-weight: 700;
}

.admin-policies__row-actions button {
  border: 0;
  background: transparent;
  color: #ef4444;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-policies__empty {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-policies__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.admin-policies__footer p {
  color: var(--subtle);
  font-size: var(--font-caption);
}
</style>
