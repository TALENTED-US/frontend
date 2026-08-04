<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  deleteAdminFinancePersonaDataset,
  duplicateAdminFinancePersonaDataset,
  findAdminFinanceUser,
  getAdminFinancePersonaDatasets,
} from '@/features/admin/api/financeDataApi'

const TYPE_LABEL = { account: '계좌', card: '카드', transaction: '거래' }

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

function scrollToDatasetManagement() {
  document.getElementById('admin-finance-dataset-management')?.scrollIntoView({ behavior: 'smooth' })
}

// 사용자별 금융데이터 조회
const userKeyword = ref('jijun01')
const selectedUser = ref(null)
const userSearched = ref(false)
const activeType = ref('all')

async function searchUser() {
  userSearched.value = true
  activeType.value = 'all'
  try {
    selectedUser.value = await findAdminFinanceUser(userKeyword.value)
  } catch {
    selectedUser.value = null
  }
}

const appliedDatasetName = computed(() => {
  if (!selectedUser.value) return ''
  const match = datasets.value.find((dataset) => dataset.key === selectedUser.value.datasetKey)
  return match ? match.name : selectedUser.value.datasetKey || '미지정'
})

const userRecords = computed(() => {
  if (!selectedUser.value) return []
  const accounts = (selectedUser.value.accounts || []).map((item) => ({
    id: `account-${item.id}`,
    type: 'account',
    date: item.updatedAt ? item.updatedAt.slice(0, 10) : '-',
    institution: item.bank,
    amount: item.balance,
    kind: null,
    category: item.type,
    duplicateSuspect: false,
    raw: item,
  }))
  const cards = (selectedUser.value.cards || []).map((item) => ({
    id: `card-${item.id}`,
    type: 'card',
    date: '-',
    institution: item.issuer,
    amount: item.usedAmount,
    kind: null,
    category: item.type,
    duplicateSuspect: false,
    raw: item,
  }))
  const transactions = (selectedUser.value.transactions || []).map((item) => ({
    id: `transaction-${item.id}`,
    type: 'transaction',
    date: item.date,
    institution: item.merchant,
    amount: item.amount,
    kind: item.kind,
    category: item.category,
    duplicateSuspect: !!item.duplicateSuspect,
    raw: item,
  }))
  return [...accounts, ...cards, ...transactions]
})

const typeCounts = computed(() => ({
  all: userRecords.value.length,
  account: userRecords.value.filter((record) => record.type === 'account').length,
  card: userRecords.value.filter((record) => record.type === 'card').length,
  transaction: userRecords.value.filter((record) => record.type === 'transaction').length,
}))

const filteredRecords = computed(() => {
  if (activeType.value === 'all') return userRecords.value
  return userRecords.value.filter((record) => record.type === activeType.value)
})

function amountText(record) {
  if (record.amount === null || record.amount === undefined) return '-'
  if (record.type === 'transaction') {
    const sign = record.amount >= 0 ? '+' : '-'
    return `${sign}${Math.abs(record.amount).toLocaleString()}원`
  }
  return `${record.amount.toLocaleString()}원`
}

function amountClass(record) {
  if (record.type !== 'transaction') return ''
  return record.amount >= 0 ? 'text-success' : 'text-danger'
}

// 계좌·카드 등록/수정
const accountModal = ref(null) // { mode: 'create' | 'edit', record }
const accountForm = ref({ type: 'account', institution: '', amount: '' })

function openCreateAccount() {
  accountForm.value = { type: 'account', institution: '', amount: '' }
  accountModal.value = { mode: 'create' }
}

function openEditAccount(record) {
  accountForm.value = { type: record.type, institution: record.institution, amount: record.amount ?? '' }
  accountModal.value = { mode: 'edit', record }
}

function closeAccountModal() {
  accountModal.value = null
}

function submitAccount() {
  const amount = accountForm.value.amount === '' ? null : Number(accountForm.value.amount)
  if (accountModal.value.mode === 'edit') {
    const { record } = accountModal.value
    if (record.type === 'account') {
      record.raw.bank = accountForm.value.institution
      record.raw.balance = amount
    } else {
      record.raw.issuer = accountForm.value.institution
      record.raw.usedAmount = amount
    }
  } else if (accountForm.value.type === 'account') {
    selectedUser.value.accounts.push({
      id: `acc-${Date.now()}`,
      bank: accountForm.value.institution,
      type: '입출금',
      balance: amount,
      status: 'normal',
      updatedAt: new Date().toISOString(),
    })
  } else {
    selectedUser.value.cards.push({
      id: `card-${Date.now()}`,
      issuer: accountForm.value.institution,
      type: '신용카드',
      usedAmount: amount,
      limit: amount,
      status: 'normal',
    })
  }
  closeAccountModal()
}

// 거래 등록/수정
const transactionModal = ref(null) // { mode: 'create' | 'edit', record }
const transactionForm = ref({ institution: '', date: '', kind: 'expense', amount: '', category: '' })

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function openCreateTransaction() {
  transactionForm.value = { institution: '', date: todayStr(), kind: 'expense', amount: '', category: '' }
  transactionModal.value = { mode: 'create' }
}

function openEditTransaction(record) {
  transactionForm.value = {
    institution: record.institution,
    date: record.date,
    kind: record.kind || 'expense',
    amount: record.amount === null || record.amount === undefined ? '' : Math.abs(record.amount),
    category: record.category || '',
  }
  transactionModal.value = { mode: 'edit', record }
}

function closeTransactionModal() {
  transactionModal.value = null
}

function submitTransaction() {
  const amount = transactionForm.value.amount === '' ? null : Number(transactionForm.value.amount)
  const signedAmount = amount === null ? null : transactionForm.value.kind === 'income' ? Math.abs(amount) : -Math.abs(amount)
  if (transactionModal.value.mode === 'edit') {
    const { record } = transactionModal.value
    record.raw.merchant = transactionForm.value.institution
    record.raw.date = transactionForm.value.date
    record.raw.kind = transactionForm.value.kind
    record.raw.amount = signedAmount
    record.raw.category = transactionForm.value.category
  } else {
    selectedUser.value.transactions.push({
      id: `txn-${Date.now()}`,
      date: transactionForm.value.date,
      merchant: transactionForm.value.institution,
      amount: signedAmount,
      kind: transactionForm.value.kind,
      category: transactionForm.value.category,
    })
  }
  closeTransactionModal()
}

function openEditRecord(record) {
  if (record.type === 'transaction') openEditTransaction(record)
  else openEditAccount(record)
}

function removeRecord(record) {
  if (!window.confirm(`"${record.institution}" 항목을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return
  if (record.type === 'account') {
    selectedUser.value.accounts = selectedUser.value.accounts.filter((item) => item.id !== record.raw.id)
  } else if (record.type === 'card') {
    selectedUser.value.cards = selectedUser.value.cards.filter((item) => item.id !== record.raw.id)
  } else {
    selectedUser.value.transactions = selectedUser.value.transactions.filter((item) => item.id !== record.raw.id)
  }
}

onMounted(async () => {
  await loadDatasets()
  await searchUser()
})
</script>

<template>
  <section class="admin-finance">
    <div class="admin-finance__content">
      <p class="admin-finance__breadcrumb">관리자 &gt; 금융데이터 관리</p>

      <header class="admin-finance__header">
        <h1>금융데이터 관리</h1>
        <p>사용자별 테스트용 Mock 금융 데이터를 한곳에서 조회하고 관리하세요.</p>
      </header>

      <article class="admin-card admin-finance__user-card">
        <div class="admin-finance__section-head">
          <h2>사용자 조회</h2>
          <button type="button" class="admin-finance__scroll-link" @click="scrollToDatasetManagement">데이터 세트 관리 →</button>
        </div>

        <form class="admin-finance__user-search" @submit.prevent="searchUser">
          <input v-model="userKeyword" type="text" placeholder="회원 (ID · 이메일 · 닉네임)" />
          <button type="submit" class="primary">조회</button>
        </form>

        <div v-if="selectedUser" class="admin-finance__user-result">
          <p><span class="muted">선택 사용자</span> {{ selectedUser.userId }} · {{ selectedUser.email }} · {{ selectedUser.nickname }}</p>
          <p><span class="muted">현재 적용 세트</span> {{ appliedDatasetName }}</p>
          <p class="admin-finance__user-counts">계좌 {{ typeCounts.account }} · 카드 {{ typeCounts.card }} · 거래 {{ typeCounts.transaction }}</p>
        </div>
        <p v-else-if="userSearched" class="admin-finance__user-empty">일치하는 회원을 찾을 수 없어요.</p>
      </article>

      <article class="admin-card">
        <div class="admin-finance__section-head">
          <h2>Mock 금융 데이터</h2>
          <div class="admin-finance__section-actions">
            <button type="button" class="ghost" :disabled="!selectedUser" @click="openCreateAccount">계좌·카드 등록</button>
            <button type="button" class="primary" :disabled="!selectedUser" @click="openCreateTransaction">거래 등록</button>
          </div>
        </div>

        <div class="admin-finance__tabs">
          <button type="button" :class="['admin-finance__tab', { active: activeType === 'all' }]" @click="activeType = 'all'">전체 {{ typeCounts.all }}</button>
          <button type="button" :class="['admin-finance__tab', { active: activeType === 'account' }]" @click="activeType = 'account'">계좌 {{ typeCounts.account }}</button>
          <button type="button" :class="['admin-finance__tab', { active: activeType === 'card' }]" @click="activeType = 'card'">카드 {{ typeCounts.card }}</button>
          <button type="button" :class="['admin-finance__tab', { active: activeType === 'transaction' }]" @click="activeType = 'transaction'">거래 {{ typeCounts.transaction }}</button>
        </div>

        <p v-if="!selectedUser" class="admin-finance__records-empty">조회된 회원이 없어요. 먼저 사용자를 조회해 주세요.</p>
        <p v-else-if="filteredRecords.length === 0" class="admin-finance__records-empty">등록된 Mock 금융 데이터가 없어요.</p>

        <div v-else class="admin-finance__table-wrap">
          <table>
            <thead>
              <tr>
                <th>거래일</th>
                <th>기관명</th>
                <th>거래금액</th>
                <th>수입 · 지출</th>
                <th>카테고리</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredRecords" :key="record.id">
                <td>{{ record.date }}</td>
                <td class="strong">{{ record.institution }}</td>
                <td :class="['strong', amountClass(record)]">{{ amountText(record) }}</td>
                <td>
                  <span v-if="record.kind" :class="['admin-badge', record.kind === 'income' ? 'admin-badge--income' : 'admin-badge--expense']">
                    {{ record.kind === 'income' ? '수입' : '지출' }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td><span class="admin-badge admin-badge--category">{{ record.category || TYPE_LABEL[record.type] }}</span></td>
                <td class="admin-finance__row-actions">
                  <span v-if="record.duplicateSuspect" class="admin-badge admin-badge--warning">중복 의심 · 검수</span>
                  <template v-else>
                    <button type="button" @click="openEditRecord(record)">수정</button>
                    <span>·</span>
                    <button type="button" class="danger" @click="removeRecord(record)">삭제</button>
                    <span>·</span>
                    <RouterLink to="/admin/finance-data/history">이력</RouterLink>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="admin-finance__records-footer">
          <p>동일 거래 고유값 기준으로 중복 거래는 자동 차단됩니다.</p>
          <RouterLink to="/admin/finance-data/history">등록 · 수정 · 삭제 이력 보기 →</RouterLink>
        </footer>
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

    <div v-if="accountModal" class="admin-finance__modal-backdrop">
      <div class="admin-finance__modal">
        <h2>{{ accountModal.mode === 'edit' ? '계좌·카드 수정' : '계좌·카드 등록' }}</h2>
        <label>
          데이터 유형
          <select v-model="accountForm.type" :disabled="accountModal.mode === 'edit'">
            <option value="account">계좌</option>
            <option value="card">카드</option>
          </select>
        </label>
        <label>
          기관명
          <input v-model="accountForm.institution" type="text" placeholder="예: KB국민은행" />
        </label>
        <label>
          금액
          <input v-model.number="accountForm.amount" type="number" placeholder="예: 1000000" />
        </label>
        <div class="admin-finance__modal-actions">
          <button type="button" class="ghost" @click="closeAccountModal">취소</button>
          <button type="button" class="primary" @click="submitAccount">{{ accountModal.mode === 'edit' ? '저장' : '등록' }}</button>
        </div>
      </div>
    </div>

    <div v-if="transactionModal" class="admin-finance__modal-backdrop">
      <div class="admin-finance__modal">
        <h2>{{ transactionModal.mode === 'edit' ? '거래 수정' : '거래 등록' }}</h2>
        <label>
          거래처
          <input v-model="transactionForm.institution" type="text" placeholder="예: 스타벅스" />
        </label>
        <label>
          거래일
          <input v-model="transactionForm.date" type="date" />
        </label>
        <label>
          수입 · 지출
          <select v-model="transactionForm.kind">
            <option value="income">수입</option>
            <option value="expense">지출</option>
          </select>
        </label>
        <label>
          금액
          <input v-model.number="transactionForm.amount" type="number" placeholder="예: 12000" />
        </label>
        <label>
          카테고리
          <input v-model="transactionForm.category" type="text" placeholder="예: 식비" />
        </label>
        <div class="admin-finance__modal-actions">
          <button type="button" class="ghost" @click="closeTransactionModal">취소</button>
          <button type="button" class="primary" @click="submitTransaction">{{ transactionModal.mode === 'edit' ? '저장' : '등록' }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-finance__breadcrumb {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance__header {
  margin-top: 24px;
}

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

.admin-finance__scroll-link {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance__user-search {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.admin-finance__user-search input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-finance__user-search .primary {
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance__user-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: var(--font-small);
}

.admin-finance__user-result p .muted {
  margin-right: 6px;
  color: var(--subtle);
}

.admin-finance__user-result p {
  color: var(--text);
  font-weight: 700;
}

.admin-finance__user-counts {
  color: var(--muted) !important;
  font-weight: 700 !important;
}

.admin-finance__user-empty {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--subtle);
  font-size: var(--font-small);
}

.admin-finance__section-actions {
  display: flex;
  gap: 10px;
}

.admin-finance__section-actions .ghost {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance__section-actions .primary {
  padding: 8px 18px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance__section-actions button:disabled {
  opacity: 0.5;
}

.admin-finance__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.admin-finance__tab {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__tab.active {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance__records-empty {
  padding: 48px 0;
  color: var(--subtle);
  font-size: var(--font-small);
  text-align: center;
}

.admin-finance__table-wrap {
  width: 100%;
  margin-top: 14px;
  overflow-x: auto;
}

.admin-finance__table-wrap table {
  width: 100%;
  min-width: 720px;
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

.admin-finance__table-wrap td.strong {
  color: var(--text);
  font-weight: 700;
}

.text-success {
  color: #22c55e;
}

.text-danger {
  color: #ef4444;
}

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-badge--income {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--expense {
  background: #fee2e2;
  color: #ef4444;
}

.admin-badge--category {
  background: #f1f5f9;
  color: #64748b;
}

.admin-badge--warning {
  background: #fef3c7;
  color: #f59e0b;
}

.admin-finance__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.admin-finance__row-actions button {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance__row-actions button.danger {
  color: #ef4444;
}

.admin-finance__row-actions a {
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance__records-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.admin-finance__records-footer p {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance__records-footer a {
  color: #3b82f6;
  font-size: var(--font-small);
  font-weight: 700;
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
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .admin-finance__grid {
    grid-template-columns: 1fr;
  }
}

.admin-finance__dataset {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-finance__dataset h3 {
  color: var(--text);
  font-size: 20px;
  font-weight: 800;
}

.admin-finance__dataset-desc {
  margin-top: 12px;
  color: var(--muted);
  font-size: var(--font-small);
  line-height: var(--line-height-body);
}

.admin-finance__dataset-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance__dataset-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.admin-finance__dataset-actions button,
.admin-finance__dataset-actions a {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
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

.admin-finance__modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 30%);
}

.admin-finance__modal {
  width: 420px;
  max-height: 90vh;
  padding: 32px;
  overflow-y: auto;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-finance__modal h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-finance__modal label {
  display: block;
  margin-top: 16px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__modal input,
.admin-finance__modal select {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-finance__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.admin-finance__modal-actions button {
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__modal-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.admin-finance__modal-actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}
</style>
