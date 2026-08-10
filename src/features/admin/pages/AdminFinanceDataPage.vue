<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  applyAdminFinanceDataset,
  createAdminFinanceAccount,
  createAdminFinanceCard,
  createAdminFinanceTransaction,
  deleteAdminFinanceRecord,
  findAdminFinanceUser,
  getAdminFinanceDatasets,
  resolveAdminFinanceDuplicate,
  updateAdminFinanceRecord,
} from '@/features/admin/api/financeDataApi'
import FinanceAccountCardFormModal from '@/features/admin/components/finance/FinanceAccountCardFormModal.vue'
import FinanceTransactionFormModal from '@/features/admin/components/finance/FinanceTransactionFormModal.vue'
import FinanceDeleteConfirmModal from '@/features/admin/components/finance/FinanceDeleteConfirmModal.vue'
import FinanceDuplicateReviewModal from '@/features/admin/components/finance/FinanceDuplicateReviewModal.vue'

const TABS = [
  { key: 'accounts', label: '계좌' },
  { key: 'cards', label: '카드' },
  { key: 'transactions', label: '거래' },
]

const datasets = ref([])
const keyword = ref('jijun01')
const user = ref(null)
const notFound = ref(false)
const activeTab = ref('accounts')
const selectedDatasetKey = ref('')

const modal = ref(null) // { type: 'account-card' | 'transaction' | 'delete' | 'duplicate', mode, record, listKey }

const registerLabel = computed(() => (activeTab.value === 'cards' ? '카드 등록' : '계좌 등록'))
const accountOptions = computed(
  () => user.value?.accounts.map((account) => ({ id: account.id, label: `${account.bank} ${account.type}` })) || [],
)

function datasetLabel(key) {
  return datasets.value.find((dataset) => dataset.key === key)?.label || key
}

async function loadDatasets() {
  datasets.value = await getAdminFinanceDatasets()
}

async function search() {
  try {
    user.value = await findAdminFinanceUser(keyword.value)
    selectedDatasetKey.value = user.value.datasetKey
    notFound.value = false
  } catch {
    user.value = null
    notFound.value = true
  }
}

async function applyDataset() {
  if (!user.value) return
  await applyAdminFinanceDataset(user.value.userId, selectedDatasetKey.value)
  user.value.datasetKey = selectedDatasetKey.value
}

function openCreateModal() {
  modal.value =
    activeTab.value === 'transactions'
      ? { type: 'transaction', mode: 'create' }
      : { type: 'account-card', mode: 'create', recordType: activeTab.value === 'cards' ? 'card' : 'account' }
}

function openEditModal(listKey, record) {
  if (listKey === 'transactions') {
    modal.value = { type: 'transaction', mode: 'edit', listKey, record }
  } else {
    modal.value = { type: 'account-card', mode: 'edit', listKey, record, recordType: listKey === 'accounts' ? 'account' : 'card' }
  }
}

function openDeleteModal(listKey, record, message) {
  modal.value = { type: 'delete', listKey, record, message }
}

function openDuplicateModal(record) {
  modal.value = { type: 'duplicate', record }
}

function closeModal() {
  modal.value = null
}

async function submitAccountCard({ type, payload }) {
  const listKey = type === 'account' ? 'accounts' : 'cards'
  if (modal.value.mode === 'edit') {
    const updated = await updateAdminFinanceRecord(user.value.userId, listKey, modal.value.record.id, payload)
    const index = user.value[listKey].findIndex((item) => item.id === updated.id)
    user.value[listKey][index] = updated
  } else {
    const created = type === 'account'
      ? await createAdminFinanceAccount(user.value.userId, payload)
      : await createAdminFinanceCard(user.value.userId, payload)
    user.value[listKey].push(created)
  }
  closeModal()
}

async function submitTransaction(payload) {
  if (modal.value.mode === 'edit') {
    const updated = await updateAdminFinanceRecord(user.value.userId, 'transactions', modal.value.record.id, payload)
    const index = user.value.transactions.findIndex((item) => item.id === updated.id)
    user.value.transactions[index] = updated
  } else {
    const created = await createAdminFinanceTransaction(user.value.userId, payload)
    user.value.transactions.unshift(created)
  }
  closeModal()
}

async function confirmDelete() {
  const { listKey, record } = modal.value
  await deleteAdminFinanceRecord(user.value.userId, listKey, record.id)
  user.value[listKey] = user.value[listKey].filter((item) => item.id !== record.id)
  closeModal()
}

async function allowDuplicate() {
  const { record } = modal.value
  await resolveAdminFinanceDuplicate(user.value.userId, record.id, 'allow')
  const target = user.value.transactions.find((item) => item.id === record.id)
  if (target) {
    target.duplicateSuspect = false
    delete target.duplicateOf
  }
  closeModal()
}

async function markDuplicate() {
  const { record } = modal.value
  await resolveAdminFinanceDuplicate(user.value.userId, record.id, 'duplicate')
  user.value.transactions = user.value.transactions.filter((item) => item.id !== record.id)
  closeModal()
}

function formatWon(amount) {
  return `${Math.abs(amount).toLocaleString()}원`
}

onMounted(async () => {
  await loadDatasets()
  await search()
})
</script>

<template>
  <section class="admin-finance">
    <div class="admin-finance__content" :class="{ 'is-dimmed': modal }">
    <header class="admin-finance__header">
      <h1>금융데이터 관리</h1>
      <p>사용자별 테스트용 Mock 금융 데이터를 한곳에서 조회하고 관리하세요.</p>
    </header>

    <article class="admin-card">
      <div class="admin-finance__lookup-head">
        <h2>사용자 및 데이터 세트 조회 · 배정</h2>
        <RouterLink to="/admin/finance-data/history" class="admin-finance__manage-link">데이터 세트 관리 →</RouterLink>
      </div>
      <form class="admin-finance__lookup" @submit.prevent="search">
        <input v-model="keyword" type="text" placeholder="회원 (ID · 이메일 · 닉네임)" />
        <select v-model="selectedDatasetKey">
          <option v-for="dataset in datasets" :key="dataset.key" :value="dataset.key">{{ dataset.label }}</option>
        </select>
        <button type="submit">조회</button>
        <button v-if="user" type="button" class="admin-finance__apply" @click="applyDataset">적용</button>
      </form>

      <p v-if="notFound" class="admin-finance__not-found">해당 회원을 찾을 수 없어요.</p>

      <div v-if="user" class="admin-finance__selected">
        <div>
          <p class="label">선택 사용자</p>
          <p class="value">{{ user.userId }} · {{ user.email }} · {{ user.nickname }}</p>
        </div>
        <div>
          <p class="label">현재 적용 세트</p>
          <p class="value">{{ datasetLabel(user.datasetKey) }}</p>
        </div>
        <p class="admin-finance__counts">
          계좌 {{ user.accounts.length }} · 카드 {{ user.cards.length }} · 거래 {{ user.transactions.length }}
        </p>
      </div>
    </article>

    <article v-if="user" class="admin-card">
      <div class="admin-finance__data-head">
        <h2>Mock 금융 데이터</h2>
        <div class="admin-finance__register-buttons">
          <button type="button" class="ghost" @click="openCreateModal">{{ registerLabel }}</button>
          <button type="button" class="primary" @click="modal = { type: 'transaction', mode: 'create' }">거래 등록</button>
        </div>
      </div>

      <div class="admin-finance__tabs">
        <span class="admin-finance__tabs-total">전체 {{ user.accounts.length + user.cards.length + user.transactions.length }}</span>
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          :class="['admin-finance__tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }} {{ user[tab.key].length }}
        </button>
      </div>

      <table v-if="activeTab === 'accounts'">
        <thead>
          <tr>
            <th>은행</th>
            <th>계좌유형</th>
            <th>잔액</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in user.accounts" :key="account.id">
            <td class="strong">{{ account.bank }}</td>
            <td>{{ account.type }}</td>
            <td class="strong">{{ formatWon(account.balance) }}</td>
            <td>
              <span :class="['admin-badge', account.status === 'connected' ? 'admin-badge--info' : 'admin-badge--success']">
                {{ account.status === 'connected' ? '연결됨' : '정상' }}
              </span>
            </td>
            <td class="admin-finance__row-actions">
              <button type="button" @click="openEditModal('accounts', account)">수정</button>
              <span>·</span>
              <button type="button" class="danger" @click="openDeleteModal('accounts', account, `“${account.bank} ${account.type}” 계좌를 삭제합니다.`)">삭제</button>
              <span>·</span>
              <RouterLink to="/admin/finance-data/history">이력</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <template v-else-if="activeTab === 'cards'">
        <table>
          <thead>
            <tr>
              <th>카드사</th>
              <th>이용액 · 한도</th>
              <th>연결계좌</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="card in user.cards" :key="card.id">
              <td>
                <p class="strong">{{ card.issuer }}</p>
                <small class="admin-finance__subtext">{{ card.type }}</small>
              </td>
              <td>
                <p class="strong">이용액 {{ formatWon(card.usedAmount) }}</p>
                <small class="admin-finance__subtext">한도 {{ formatWon(card.limit) }}</small>
              </td>
              <td>{{ card.linkedAccountLabel }}</td>
              <td><span class="admin-badge admin-badge--success">정상</span></td>
              <td class="admin-finance__row-actions">
                <button type="button" @click="openEditModal('cards', card)">수정</button>
                <span>·</span>
                <button type="button" class="danger" @click="openDeleteModal('cards', card, `“${card.issuer}” 카드를 삭제합니다.`)">삭제</button>
                <span>·</span>
                <RouterLink to="/admin/finance-data/history">이력</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="admin-finance__footnote">카드 이용액은 "거래" 탭의 지출 내역과 자동 연동됩니다.</p>
      </template>

      <template v-else>
        <table>
          <thead>
            <tr>
              <th>거래일</th>
              <th>거래처</th>
              <th>거래금액</th>
              <th>수입/지출</th>
              <th>카테고리</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="txn in user.transactions" :key="txn.id">
              <td>{{ txn.date }}</td>
              <td class="strong">{{ txn.merchant }}</td>
              <td :class="['strong', txn.kind === 'income' ? 'text-success' : 'text-danger']">
                {{ txn.kind === 'income' ? '+' : '-' }}{{ formatWon(txn.amount) }}
              </td>
              <td>
                <span :class="['admin-badge', txn.kind === 'income' ? 'admin-badge--success' : 'admin-badge--danger']">
                  {{ txn.kind === 'income' ? '수입' : '지출' }}
                </span>
              </td>
              <td>
                <span v-if="txn.category === '대출상환'" class="admin-badge admin-badge--purple">대출상환</span>
                <template v-else>{{ txn.category }}</template>
              </td>
              <td class="admin-finance__row-actions">
                <template v-if="txn.duplicateSuspect">
                  <button type="button" class="admin-finance__duplicate-badge" @click="openDuplicateModal(txn)">중복 의심 · 검수</button>
                </template>
                <template v-else>
                  <button type="button" @click="openEditModal('transactions', txn)">수정</button>
                  <span>·</span>
                  <button type="button" class="danger" @click="openDeleteModal('transactions', txn, `“${txn.merchant}” 거래를 삭제합니다.`)">삭제</button>
                  <span>·</span>
                  <RouterLink to="/admin/finance-data/history">이력</RouterLink>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="admin-finance__footnote">동일 거래 고유값 기준으로 중복 거래는 자동 차단됩니다.</p>
      </template>

      <RouterLink to="/admin/finance-data/history" class="admin-finance__history-link">등록·수정·삭제 이력 보기 →</RouterLink>
    </article>
    </div>

    <FinanceAccountCardFormModal
      v-if="modal?.type === 'account-card'"
      :mode="modal.mode"
      :record-type="modal.recordType"
      :initial="modal.record"
      :account-options="accountOptions"
      @close="closeModal"
      @submit="submitAccountCard"
    />
    <FinanceTransactionFormModal
      v-if="modal?.type === 'transaction'"
      :mode="modal.mode"
      :initial="modal.record"
      @close="closeModal"
      @submit="submitTransaction"
    />
    <FinanceDeleteConfirmModal
      v-if="modal?.type === 'delete'"
      :message="modal.message"
      @close="closeModal"
      @confirm="confirmDelete"
    />
    <FinanceDuplicateReviewModal
      v-if="modal?.type === 'duplicate'"
      :transaction="modal.record"
      @close="closeModal"
      @allow="allowDuplicate"
      @duplicate="markDuplicate"
    />
  </section>
</template>

<style scoped>
.admin-finance__content.is-dimmed {
  opacity: 0.5;
  pointer-events: none;
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
  margin-top: 20px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-finance__lookup-head,
.admin-finance__data-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.admin-finance__lookup-head h2,
.admin-finance__data-head h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-finance__manage-link {
  color: #0a1680;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__lookup {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.admin-finance__lookup input,
.admin-finance__lookup select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-finance__lookup input {
  flex: 1;
}

.admin-finance__lookup button,
.admin-finance__apply {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700;
}

.admin-finance__not-found {
  margin-top: 12px;
  color: var(--subtle);
  font-size: var(--font-small);
}

.admin-finance__selected {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.admin-finance__selected .label {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance__selected .value {
  margin-top: 4px;
  color: var(--text);
  font-size: var(--font-body);
  font-weight: 700;
}

.admin-finance__counts {
  margin-left: auto;
  color: #0a1680;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__register-buttons {
  display: flex;
  gap: 10px;
}

.admin-finance__register-buttons .ghost {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__register-buttons .primary {
  padding: 8px 18px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__tabs {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

.admin-finance__tabs-total {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance__tab {
  padding: 6px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance__tab.active {
  background: var(--accent);
  color: var(--text);
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
}

.text-danger {
  color: #ef4444;
}

.admin-finance__subtext {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.admin-badge--success {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--danger {
  background: #fee2e2;
  color: #ef4444;
}

.admin-badge--info {
  background: #dbeafe;
  color: #3b82f6;
}

.admin-badge--purple {
  background: #f3e8ff;
  color: #9333ea;
}

.admin-finance__duplicate-badge {
  padding: 4px 10px;
  border: 0;
  border-radius: 999px;
  background: #f59e0b;
  color: white;
  font-size: 11px;
  font-weight: 700;
}

.admin-finance__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--subtle);
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
  color: var(--muted);
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance__footnote {
  margin-top: 12px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance__history-link {
  display: block;
  margin-top: 16px;
  color: #0a1680;
  font-size: var(--font-caption);
  font-weight: 700;
  text-align: right;
}
</style>
