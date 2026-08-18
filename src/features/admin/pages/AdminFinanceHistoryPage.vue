<script setup>
import { computed, onMounted, ref } from 'vue'
import { findAdminFinanceUser, getAdminFinanceHistory } from '@/features/admin/api/financeDataApi'
import AppIcon from '@/components/ui/AppIcon.vue'

const ACTION_LABEL = { create: '등록', update: '수정', delete: '삭제' }

const keyword = ref('jijun01')
const actionFilter = ref('all')
const history = ref([])
const userId = ref('')

const filteredHistory = computed(() =>
  actionFilter.value === 'all' ? history.value : history.value.filter((entry) => entry.action === actionFilter.value),
)

async function search() {
  try {
    const user = await findAdminFinanceUser(keyword.value)
    userId.value = user.userId
    history.value = await getAdminFinanceHistory(user.userId)
  } catch {
    userId.value = ''
    history.value = []
  }
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

onMounted(search)
</script>

<template>
  <section class="admin-finance-history">
    <RouterLink to="/admin/finance-data" class="admin-finance-history__back"
      ><AppIcon name="chevron-left" :size="20" />금융데이터 관리</RouterLink
    >
    <header class="admin-finance-history__header">
      <h1>등록·수정·삭제 이력</h1>
      <p>Mock 데이터 등록·수정·삭제 이력을 확인할 수 있어요.</p>
    </header>

    <form class="admin-finance-history__toolbar" @submit.prevent="search">
      <input v-model="keyword" type="text" placeholder="회원 (ID · 이메일 · 닉네임)" />
      <label class="admin-finance-history__type-select">
        <select v-model="actionFilter">
          <option value="all">전체 유형</option>
          <option value="create">등록</option>
          <option value="update">수정</option>
          <option value="delete">삭제</option>
        </select>
      </label>
      <button type="submit">조회</button>
    </form>

    <article class="admin-card">
      <h2>전체 이력</h2>
      <table>
        <thead>
          <tr>
            <th>처리 일시</th>
            <th>회원</th>
            <th>항목</th>
            <th>변경 내용</th>
            <th>유형</th>
            <th>처리자</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filteredHistory" :key="entry.id">
            <td>{{ formatDateTime(entry.at) }}</td>
            <td class="strong">{{ entry.target }}</td>
            <td>{{ entry.item }}</td>
            <td>{{ entry.summary }}</td>
            <td><span :class="['admin-badge', `admin-badge--${entry.action}`]">{{ ACTION_LABEL[entry.action] }}</span></td>
            <td>{{ entry.actor }}</td>
          </tr>
          <tr v-if="filteredHistory.length === 0">
            <td colspan="6" class="admin-finance-history__empty">표시할 이력이 없어요.</td>
          </tr>
        </tbody>
      </table>
      <p class="admin-finance-history__footnote">최근 90일간의 변경 이력만 표시됩니다.</p>
    </article>
  </section>
</template>

<style scoped>
.admin-finance-history__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-history__header {
  margin-top: 10px;
}

.admin-finance-history__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-finance-history__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-finance-history__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

.admin-finance-history__toolbar input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-finance-history__type-select {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance-history__type-select select {
  padding: 10px 14px;
  padding-right: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);

  /* 브라우저 기본 토글 화살표 제거 */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* 커스텀 토글 아이콘(▾) 넣기 및 위치 조절 */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.admin-finance-history__toolbar button {
  padding: 10px 24px;
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
  font-size: var(--font-card-title);
  font-weight: 800;
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

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.admin-badge--create {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--update {
  background: #fef3c7;
  color: #f59e0b;
}

.admin-badge--delete {
  background: #fee2e2;
  color: #ef4444;
}

.admin-finance-history__empty {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-finance-history__footnote {
  margin-top: 12px;
  color: var(--subtle);
  font-size: var(--font-caption);
}
</style>
