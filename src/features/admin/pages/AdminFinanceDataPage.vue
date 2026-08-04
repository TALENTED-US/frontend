<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  deleteAdminFinancePersonaDataset,
  duplicateAdminFinancePersonaDataset,
  getAdminFinancePersonaDatasets,
} from '@/features/admin/api/financeDataApi'

const datasets = ref([])

async function loadDatasets() {
  datasets.value = await getAdminFinancePersonaDatasets()
}

async function duplicateDataset(dataset) {
  const copy = await duplicateAdminFinancePersonaDataset(dataset.key)
  const index = datasets.value.findIndex((item) => item.key === dataset.key)
  datasets.value.splice(index + 1, 0, copy)
}

async function removeDataset(dataset) {
  if (!window.confirm(`"${dataset.name}" 데이터 세트를 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return
  await deleteAdminFinancePersonaDataset(dataset.key)
  datasets.value = datasets.value.filter((item) => item.key !== dataset.key)
}

// 사용자 목록
function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const unassignedUsers = ref([]) // 데이터 세트 미지정으로 변경된 회원 (목록 유지용)
const pendingSelection = ref({}) // userId -> 드롭다운에서 아직 저장하지 않은 선택값

const users = computed(() => {
  const map = new Map()
  datasets.value.forEach((dataset) => {
    ;(dataset.appliedMembers || []).forEach((member) => {
      map.set(member.userId, {
        userId: member.userId,
        email: member.email,
        nickname: member.nickname,
        datasetKey: dataset.key,
        accountCount: dataset.accountCount,
        cardCount: dataset.cardCount,
        transactionCount: dataset.transactionCount,
        updatedAt: member.updatedAt || member.appliedAt,
      })
    })
  })
  unassignedUsers.value.forEach((member) => {
    if (!map.has(member.userId)) {
      map.set(member.userId, {
        userId: member.userId,
        email: member.email,
        nickname: member.nickname,
        datasetKey: '',
        accountCount: 0,
        cardCount: 0,
        transactionCount: 0,
        updatedAt: member.updatedAt,
      })
    }
  })
  return Array.from(map.values())
})

const memberKeyword = ref('')
const memberDatasetFilter = ref('all')

const filteredUsers = computed(() => {
  const keyword = memberKeyword.value.trim().toLowerCase()
  return users.value.filter((user) => {
    const matchesKeyword =
      !keyword || [user.userId, user.email, user.nickname].some((value) => value.toLowerCase().includes(keyword))
    const matchesDataset = memberDatasetFilter.value === 'all' || user.datasetKey === memberDatasetFilter.value
    return matchesKeyword && matchesDataset
  })
})

function datasetName(key) {
  if (!key) return '미지정'
  return datasets.value.find((dataset) => dataset.key === key)?.name || '미지정'
}

function selectedKeyFor(user) {
  const pending = pendingSelection.value[user.userId]
  return pending !== undefined ? pending : user.datasetKey || ''
}

function onSelectDataset(user, value) {
  pendingSelection.value = { ...pendingSelection.value, [user.userId]: value }
}

function isDirty(user) {
  const pending = pendingSelection.value[user.userId]
  return pending !== undefined && pending !== (user.datasetKey || '')
}

function saveDatasetAssignment(user) {
  const targetKey = pendingSelection.value[user.userId] ?? ''
  const fromDataset = datasets.value.find((dataset) => dataset.key === user.datasetKey)
  if (fromDataset) {
    fromDataset.appliedMembers = fromDataset.appliedMembers.filter((member) => member.userId !== user.userId)
  }
  unassignedUsers.value = unassignedUsers.value.filter((member) => member.userId !== user.userId)

  if (targetKey) {
    const toDataset = datasets.value.find((dataset) => dataset.key === targetKey)
    if (toDataset) {
      toDataset.appliedMembers.push({
        userId: user.userId,
        email: user.email,
        nickname: user.nickname,
        appliedAt: todayStr(),
        updatedAt: todayStr(),
      })
    }
  } else {
    unassignedUsers.value = [...unassignedUsers.value, { userId: user.userId, email: user.email, nickname: user.nickname, updatedAt: todayStr() }]
  }

  const next = { ...pendingSelection.value }
  delete next[user.userId]
  pendingSelection.value = next
}

onMounted(loadDatasets)
</script>

<template>
  <section class="admin-finance">
    <div class="admin-finance__content">
      <header class="admin-finance__header">
        <h1>금융데이터 관리</h1>
        <p>사용자별 테스트용 Mock 금융 데이터를 한곳에서 조회하고 관리하세요.</p>
      </header>

      <article class="admin-card admin-finance__user-card">
        <div class="admin-finance__section-head">
          <h2>사용자 목록</h2>
        </div>

        <div class="admin-finance__user-toolbar">
          <input v-model="memberKeyword" type="text" placeholder="회원 이름, ID 또는 이메일로 검색" />
          <select v-model="memberDatasetFilter">
            <option value="all">전체 데이터 세트</option>
            <option v-for="dataset in datasets" :key="dataset.key" :value="dataset.key">{{ dataset.name }}</option>
            <option value="">미지정</option>
          </select>
        </div>

        <div class="admin-finance__table-wrap">
          <table>
            <thead>
              <tr>
                <th>회원 정보</th>
                <th>현재 적용 세트</th>
                <th>계좌</th>
                <th>카드</th>
                <th>거래</th>
                <th>최근 적용일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.userId">
                <td>
                  <p class="strong">{{ user.nickname }}</p>
                  <small class="admin-finance__member-sub">{{ user.userId }} · {{ user.email }}</small>
                </td>
                <td>
                  <div class="admin-finance__assign-cell">
                    <select :value="selectedKeyFor(user)" @change="onSelectDataset(user, $event.target.value)">
                      <option v-for="dataset in datasets" :key="dataset.key" :value="dataset.key">{{ dataset.name }}</option>
                      <option value="">미지정</option>
                    </select>
                    <button v-if="isDirty(user)" type="button" class="admin-finance__assign-save" @click="saveDatasetAssignment(user)">저장</button>
                  </div>
                </td>
                <td>{{ user.accountCount }}</td>
                <td>{{ user.cardCount }}</td>
                <td>{{ user.transactionCount }}</td>
                <td>{{ user.updatedAt || '-' }}</td>
                <td class="admin-finance__row-actions">
                  <RouterLink :to="`/admin/finance-data/members/${user.userId}`">상세보기</RouterLink>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="7" class="admin-finance__member-empty">조건에 맞는 회원이 없어요.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <div id="admin-finance-dataset-management" class="admin-finance__section-head">
        <h2>데이터 세트 관리</h2>
        <RouterLink to="/admin/finance-data/datasets/create" class="admin-finance__add">+ 새 데이터 세트</RouterLink>
      </div>

      <div class="admin-finance__grid">
        <article v-for="dataset in datasets" :key="dataset.key" class="admin-finance__dataset">
          <h3>{{ dataset.name }}</h3>
          <p class="admin-finance__dataset-desc">{{ dataset.description }}</p>
          <p class="admin-finance__dataset-stats">
            계좌 {{ dataset.accountCount }} · 카드 {{ dataset.cardCount }} · 거래 {{ dataset.transactionCount }}
          </p>
          <div class="admin-finance__dataset-actions">
            <RouterLink :to="`/admin/finance-data/${dataset.key}`" class="primary">상세보기</RouterLink>
            <button type="button" class="ghost" @click="duplicateDataset(dataset)">복사</button>
            <button type="button" class="danger" @click="removeDataset(dataset)">삭제</button>
          </div>
        </article>

        <p v-if="datasets.length === 0" class="admin-finance__empty">등록된 데이터 세트가 없어요.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-finance__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-finance__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-card {
  margin-top: 24px;
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

.admin-finance__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 32px;
}

.admin-finance__user-card .admin-finance__section-head {
  margin-top: 0;
}

.admin-finance__section-head h2 {
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
}

.admin-finance__user-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.admin-finance__user-toolbar input {
  flex: 1;
  min-width: 220px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-finance__user-toolbar select {
  padding: 10px 36px 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);

  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.admin-finance__table-wrap {
  width: 100%;
  margin-top: 16px;
  overflow-x: auto;
}

.admin-finance__table-wrap table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: var(--font-small);
}

.admin-finance__table-wrap th {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  font-size: var(--font-caption);
  text-align: left;
}

.admin-finance__table-wrap td {
  padding: 12px 8px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  vertical-align: middle;
}

.admin-finance__table-wrap td.strong,
.admin-finance__table-wrap td p.strong {
  color: var(--text);
  font-weight: 700;
}

.admin-finance__member-sub {
  display: block;
  margin-top: 2px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance__assign-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-finance__assign-cell select {
  min-width: 190px;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-caption);

  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.admin-finance__assign-save {
  padding: 8px 14px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-caption);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance__row-actions button,
.admin-finance__row-actions a {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
  text-decoration: none;
}

.admin-finance__member-empty {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-finance__add {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700 !important;
  white-space: nowrap;
}

.admin-finance__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .admin-finance__grid {
    grid-template-columns: 1fr;
  }
}

.admin-finance__dataset {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-finance__dataset h3 {
  color: var(--text);
  font-size: 16px;
  font-weight: 800;
  line-height: var(--line-height-tight);
}

.admin-finance__dataset-desc {
  margin-top: 10px;
  color: var(--muted);
  font-size: var(--font-caption);
  line-height: var(--line-height-body);
}

.admin-finance__dataset-stats {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-finance__dataset-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.admin-finance__dataset-actions button,
.admin-finance__dataset-actions a {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  padding: 8px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--font-caption);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
}

.admin-finance__dataset-actions .primary {
  border: 0;
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance__dataset-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.admin-finance__dataset-actions .danger {
  border: 1px solid #ef4444;
  background: var(--surface);
  color: #ef4444;
}

.admin-finance__empty {
  grid-column: 1 / -1;
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}
</style>
