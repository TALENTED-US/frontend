<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  getAdminMemberSummary,
  getAdminMembers,
  updateAdminMemberStatus,
} from '@/features/admin/api/memberApi'

const STATUS_LABEL = { normal: '정상', restricted: '이용제한', withdrawn: '탈퇴' }
const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '정상' },
  { value: 'restricted', label: '이용제한' },
  { value: 'withdrawn', label: '탈퇴' },
]
const PAGE_SIZE_OPTIONS = [10, 20, 50]

const summary = ref(null)
const members = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const filterOpen = ref(false)
const statusMenuOpenFor = ref('')

const appliedFilters = ref({ status: 'all', joinedFrom: '', joinedTo: '' })
const draftFilters = ref({ status: 'all', joinedFrom: '', joinedTo: '' })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))

async function loadSummary() {
  summary.value = await getAdminMemberSummary()
}

async function loadMembers() {
  const result = await getAdminMembers({
    keyword: keyword.value,
    status: appliedFilters.value.status,
    joinedFrom: appliedFilters.value.joinedFrom,
    joinedTo: appliedFilters.value.joinedTo,
    page: page.value,
    pageSize: pageSize.value,
  })
  members.value = result.items
  total.value = result.total
}

function search() {
  page.value = 1
  loadMembers()
}

function openFilter() {
  draftFilters.value = { ...appliedFilters.value }
  filterOpen.value = true
}

function resetFilter() {
  draftFilters.value = { status: 'all', joinedFrom: '', joinedTo: '' }
}

function applyFilter() {
  appliedFilters.value = { ...draftFilters.value }
  filterOpen.value = false
  page.value = 1
  loadMembers()
}

function goToPage(target) {
  if (target < 1 || target > totalPages.value) return
  page.value = target
}

function toggleStatusMenu(memberId) {
  statusMenuOpenFor.value = statusMenuOpenFor.value === memberId ? '' : memberId
}

async function quickChangeStatus(member, status) {
  statusMenuOpenFor.value = ''
  if (status === member.status) return
  await updateAdminMemberStatus(member.id, { status, reason: '관리자 목록 화면에서 상태 변경' })
  await Promise.all([loadMembers(), loadSummary()])
}

watch([page, pageSize], loadMembers)

onMounted(() => {
  loadSummary()
  loadMembers()
})
</script>

<template>
  <section class="admin-members">
    <header class="admin-members__header">
      <h1>회원 관리</h1>
      <p>전체 회원 정보를 조회하고 관리하세요.</p>
    </header>

    <form class="admin-members__toolbar" @submit.prevent="search">
      <input v-model="keyword" type="text" placeholder="회원 ID · 이메일 · 닉네임 검색" />
      <button type="submit">검색</button>
      <div class="admin-members__filter">
        <button type="button" class="admin-members__filter-toggle" @click="openFilter">필터 ▾</button>
        <div v-if="filterOpen" class="admin-members__filter-panel">
          <div class="admin-members__filter-panel-head">
            <h2>회원 필터</h2>
            <button type="button" @click="resetFilter">필터 초기화</button>
          </div>
          <label>
            가입일
            <div class="admin-members__filter-range">
              <input v-model="draftFilters.joinedFrom" type="date" />
              <input v-model="draftFilters.joinedTo" type="date" />
            </div>
          </label>
          <label>
            회원 상태
            <select v-model="draftFilters.status">
              <option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div class="admin-members__filter-actions">
            <button type="button" class="ghost" @click="filterOpen = false">취소</button>
            <button type="button" class="primary" @click="applyFilter">필터 적용</button>
          </div>
        </div>
      </div>
    </form>

    <article v-if="summary" class="admin-card admin-members__summary">
      <h2>회원 상태 요약</h2>
      <div class="admin-members__summary-grid">
        <div>
          <p class="label">정상</p>
          <p class="value value--success">{{ summary.normal.toLocaleString() }}명</p>
        </div>
        <div>
          <p class="label">이용제한</p>
          <p class="value value--warning">{{ summary.restricted.toLocaleString() }}명</p>
        </div>
        <div>
          <p class="label">탈퇴</p>
          <p class="value value--muted">{{ summary.withdrawn.toLocaleString() }}명</p>
        </div>
        <div>
          <p class="label">전체 회원</p>
          <p class="value value--primary">{{ summary.total.toLocaleString() }}명</p>
        </div>
      </div>
    </article>

    <article class="admin-card admin-members__list">
      <header class="admin-members__list-head">
        <h2>회원 목록</h2>
        <span>전체 {{ total.toLocaleString() }}명</span>
      </header>

      <table>
        <thead>
          <tr>
            <th>아이디</th>
            <th>닉네임 · 이메일</th>
            <th>가입일</th>
            <th>최근 로그인</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td class="strong">{{ member.id }}</td>
            <td>{{ member.nickname }} · {{ member.email }}</td>
            <td>{{ member.joinedAt }}</td>
            <td :class="{ muted: !member.lastLoginAt }">{{ member.lastLoginAt || '로그인 이력 없음' }}</td>
            <td>
              <span :class="['admin-badge', `admin-badge--${member.status}`]">{{ STATUS_LABEL[member.status] }}</span>
            </td>
            <td class="admin-members__row-actions">
              <RouterLink :to="`/admin/members/${member.id}`">상세</RouterLink>
              <span>·</span>
              <span class="admin-members__status-menu-anchor">
                <button type="button" @click="toggleStatusMenu(member.id)">상태변경 ▾</button>
                <div v-if="statusMenuOpenFor === member.id" class="admin-members__status-menu">
                  <button
                    v-for="(label, value) in STATUS_LABEL"
                    :key="value"
                    type="button"
                    @click="quickChangeStatus(member, value)"
                  >
                    {{ label }}
                  </button>
                </div>
              </span>
            </td>
          </tr>
          <tr v-if="members.length === 0">
            <td colspan="6" class="admin-members__empty">조건에 맞는 회원이 없어요.</td>
          </tr>
        </tbody>
      </table>

      <p class="admin-members__hint">회원 상태 변경 이력은 회원 상세 화면에서 확인할 수 있어요.</p>

      <footer class="admin-members__pagination">
        <div class="admin-members__pager">
          <button type="button" :disabled="page === 1" @click="goToPage(1)">«</button>
          <button type="button" :disabled="page === 1" @click="goToPage(page - 1)">‹</button>
          <button
            v-for="pageNumber in pageNumbers"
            :key="pageNumber"
            type="button"
            :class="{ active: pageNumber === page }"
            @click="goToPage(pageNumber)"
          >
            {{ pageNumber }}
          </button>
          <button type="button" :disabled="page === totalPages" @click="goToPage(page + 1)">›</button>
          <button type="button" :disabled="page === totalPages" @click="goToPage(totalPages)">»</button>
        </div>
        <label class="admin-members__page-size">
          <select v-model.number="pageSize">
            <option v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="size">{{ size }}개씩 보기</option>
          </select>
        </label>
      </footer>
    </article>
  </section>
</template>

<style scoped>
.admin-members__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-members__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-members__toolbar {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.admin-members__toolbar input[type='text'] {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-members__toolbar > button[type='submit'] {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700;
}

.admin-members__filter {
  position: relative;
}

.admin-members__filter-toggle {
  height: 100%;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
}

.admin-members__filter-panel {
  position: absolute;
  z-index: 30;
  top: 46px;
  right: 0;
  display: grid;
  gap: 14px;
  width: 320px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-members__filter-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-members__filter-panel-head h2 {
  font-size: var(--font-small);
  font-weight: 800;
}

.admin-members__filter-panel-head button {
  border: 0;
  background: transparent;
  color: var(--subtle);
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-members__filter-panel label {
  display: grid;
  gap: 8px;
  color: var(--text);
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-members__filter-panel select,
.admin-members__filter-panel input {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-caption);
}

.admin-members__filter-range {
  display: flex;
  gap: 8px;
}

.admin-members__filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.admin-members__filter-actions button {
  padding: 8px 16px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-members__filter-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.admin-members__filter-actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}

.admin-card {
  margin-top: 16px;
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-members__summary {
  background: var(--accent);
}

.admin-members__summary h2 {
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-members__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 14px;
}

.admin-members__summary-grid .label {
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-members__summary-grid .value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 800;
}

.value--success {
  color: #22c55e;
}

.value--warning {
  color: #f59e0b;
}

.value--muted {
  color: #94a3b8;
}

.value--primary {
  color: #0a1680;
}

.admin-members__list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.admin-members__list-head h2 {
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-members__list-head span {
  color: var(--subtle);
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

td.muted {
  color: var(--subtle);
}

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.admin-badge--normal {
  background: var(--success-soft);
  color: #22c55e;
}

.admin-badge--restricted {
  background: #fef3e2;
  color: #f59e0b;
}

.admin-badge--withdrawn {
  background: #f1f5f9;
  color: #94a3b8;
}

.admin-members__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--subtle);
  white-space: nowrap;
}

.admin-members__row-actions a {
  color: #3b82f6;
  font-weight: 700;
}

.admin-members__status-menu-anchor {
  position: relative;
}

.admin-members__status-menu-anchor > button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
}

.admin-members__status-menu {
  position: absolute;
  z-index: 20;
  top: 24px;
  right: 0;
  display: grid;
  min-width: 100px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-members__status-menu button {
  padding: 6px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: var(--font-caption);
  text-align: left;
}

.admin-members__status-menu button:hover {
  background: var(--primary-soft);
  color: var(--primary);
}

.admin-members__empty {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-members__hint {
  margin-top: 12px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-members__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.admin-members__pager {
  display: flex;
  gap: 4px;
}

.admin-members__pager button {
  min-width: 28px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-members__pager button.active {
  border-color: var(--primary);
  background: var(--primary);
  color: white;
  font-weight: 700;
}

.admin-members__pager button:disabled {
  opacity: 0.4;
}

.admin-members__page-size select {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: var(--font-caption);
}

@media (max-width: 1100px) {
  .admin-members__summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
