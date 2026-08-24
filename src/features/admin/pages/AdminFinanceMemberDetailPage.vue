<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getAdminFinancePersonaDatasets } from '@/features/admin/api/financeDataApi'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()

const TYPE_LABEL = { account: '계좌', transaction: '거래' }
const STATUS_LABEL = { connected: '연결됨', disconnected: '연결 끊김', pending: '연결 전' }

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const datasets = ref([])
const member = ref(null)

async function loadMember() {
  datasets.value = await getAdminFinancePersonaDatasets()
  let found = null
  for (const dataset of datasets.value) {
    const match = (dataset.appliedMembers || []).find((item) => item.userId === route.params.memberId)
    if (match) {
      found = {
        userId: match.userId,
        email: match.email,
        nickname: match.nickname,
        datasetKey: dataset.key,
        accountCount: dataset.accountCount,
        transactionCount: dataset.transactionCount,
        appliedAt: match.appliedAt || match.updatedAt,
      }
      break
    }
  }
  member.value =
    found || {
      userId: route.params.memberId,
      email: '-',
      nickname: route.params.memberId,
      datasetKey: '',
      accountCount: 0,
      transactionCount: 0,
      appliedAt: '-',
    }
}

const appliedDatasetName = computed(() => {
  if (!member.value?.datasetKey) return '미지정'
  return datasets.value.find((dataset) => dataset.key === member.value.datasetKey)?.name || '미지정'
})

// Mock 금융 데이터
const records = ref([])
let recordIdCounter = 1

function seedRecords() {
  records.value = [
    { id: `rec-${recordIdCounter++}`, type: 'account', institution: 'KB국민은행', detail: '입출금 계좌', subType: '입출금', amount: 1850000, status: 'connected' },
    {
      id: `rec-${recordIdCounter++}`,
      type: 'transaction',
      institution: '행복요양병원',
      date: '2026-07-07',
      kind: 'expense',
      category: '주거비',
      memo: '월세',
      linkedRecordId: '',
      detail: '2026.07.07 · 지출(월세)',
      amount: -550000,
      status: 'connected',
    },
    {
      id: `rec-${recordIdCounter++}`,
      type: 'transaction',
      institution: '한국전력공사',
      date: '2026-07-05',
      kind: 'expense',
      category: '공과금',
      memo: '공과금',
      linkedRecordId: '',
      detail: '2026.07.05 · 지출(공과금)',
      amount: -68000,
      status: 'connected',
    },
    {
      id: `rec-${recordIdCounter++}`,
      type: 'transaction',
      institution: '아르바이트 급여',
      date: '2026-07-04',
      kind: 'income',
      category: '급여',
      memo: '',
      linkedRecordId: '',
      detail: '2026.07.04 · 수입',
      amount: 450000,
      status: 'connected',
    },
  ]
}

const activeType = ref('all')

const filteredRecords = computed(() => {
  if (activeType.value === 'all') return records.value
  return records.value.filter((record) => record.type === activeType.value)
})

const accountOptions = computed(() => records.value.filter((record) => record.type === 'account'))

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

// 계좌 등록/수정
const ACCOUNT_SUB_TYPES = ['입출금', '예·적금']

const accountModal = ref(null) // { mode: 'create' | 'edit', record }
const accountForm = ref({ type: 'account', institution: '', name: '', subType: '입출금', amount: '', status: 'pending' })
const accountErrors = ref({})

function resetAccountForm() {
  accountForm.value = { type: 'account', institution: '', name: '', subType: '입출금', amount: '', status: 'pending' }
  accountErrors.value = {}
}

function openCreateAccount() {
  resetAccountForm()
  accountModal.value = { mode: 'create' }
}

function openEditAccount(record) {
  accountForm.value = {
    type: record.type,
    institution: record.institution,
    name: record.detail,
    subType: record.subType || ACCOUNT_SUB_TYPES[0],
    amount: record.amount ?? '',
    status: record.status,
  }
  accountErrors.value = {}
  accountModal.value = { mode: 'edit', record }
}

function closeAccountModal() {
  accountModal.value = null
  resetAccountForm()
}

function submitAccount() {
  const errors = {}
  if (!accountForm.value.institution.trim()) errors.institution = '금융기관을 입력해 주세요.'
  if (!accountForm.value.name.trim()) errors.name = '이름을 입력해 주세요.'
  if (accountForm.value.amount === '') errors.amount = '잔액을 입력해 주세요.'
  accountErrors.value = errors
  if (Object.keys(errors).length > 0) return

  const payload = {
    type: 'account',
    institution: accountForm.value.institution,
    detail: accountForm.value.name,
    subType: accountForm.value.subType,
    amount: accountForm.value.amount === '' ? null : Number(accountForm.value.amount),
    status: accountForm.value.status,
  }
  if (accountModal.value.mode === 'edit') {
    Object.assign(accountModal.value.record, payload)
  } else {
    records.value.push({ id: `rec-${recordIdCounter++}`, ...payload })
  }
  closeAccountModal()
}

// 거래 등록/수정
const transactionModal = ref(null) // { mode: 'create' | 'edit', record }
const transactionForm = ref({ linkedRecordId: '', date: '', institution: '', amount: '', kind: 'expense', category: '', memo: '', status: 'pending' })
const transactionErrors = ref({})

function resetTransactionForm() {
  transactionForm.value = { linkedRecordId: '', date: todayStr(), institution: '', amount: '', kind: 'expense', category: '', memo: '', status: 'pending' }
  transactionErrors.value = {}
}

function openCreateTransaction() {
  resetTransactionForm()
  transactionModal.value = { mode: 'create' }
}

function openEditTransaction(record) {
  transactionForm.value = {
    linkedRecordId: record.linkedRecordId || '',
    date: record.date || todayStr(),
    institution: record.institution,
    amount: record.amount === null || record.amount === undefined ? '' : Math.abs(record.amount),
    kind: record.kind || 'expense',
    category: record.category || '',
    memo: record.memo || '',
    status: record.status,
  }
  transactionErrors.value = {}
  transactionModal.value = { mode: 'edit', record }
}

function closeTransactionModal() {
  transactionModal.value = null
  resetTransactionForm()
}

function submitTransaction() {
  const errors = {}
  if (!transactionForm.value.institution.trim()) errors.institution = '거래처를 입력해 주세요.'
  if (transactionForm.value.amount === '') errors.amount = '금액을 입력해 주세요.'
  transactionErrors.value = errors
  if (Object.keys(errors).length > 0) return

  const kindLabel = transactionForm.value.kind === 'income' ? '수입' : '지출'
  const amount = Number(transactionForm.value.amount)
  const signedAmount = transactionForm.value.kind === 'income' ? Math.abs(amount) : -Math.abs(amount)
  const payload = {
    type: 'transaction',
    linkedRecordId: transactionForm.value.linkedRecordId,
    date: transactionForm.value.date,
    institution: transactionForm.value.institution,
    kind: transactionForm.value.kind,
    category: transactionForm.value.category,
    memo: transactionForm.value.memo,
    detail: `${transactionForm.value.date} · ${kindLabel}${transactionForm.value.memo ? `(${transactionForm.value.memo})` : ''}`,
    amount: signedAmount,
    status: transactionForm.value.status,
  }
  if (transactionModal.value.mode === 'edit') {
    Object.assign(transactionModal.value.record, payload)
  } else {
    records.value.push({ id: `rec-${recordIdCounter++}`, ...payload })
  }
  closeTransactionModal()
}

function openEditRecord(record) {
  if (record.type === 'transaction') openEditTransaction(record)
  else openEditAccount(record)
}

function removeRecord(record) {
  if (!window.confirm(`"${record.institution}" 항목을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return
  records.value = records.value.filter((item) => item.id !== record.id)
}

onMounted(async () => {
  await loadMember()
  seedRecords()
})
</script>

<template>
  <section v-if="member" class="admin-finance-member">
    <RouterLink to="/admin/finance-data" class="admin-finance-member__back"
      ><AppIcon name="chevron-left" :size="20" />사용자별 금융데이터 조회</RouterLink
    >

    <header class="admin-finance-member__header">
      <h1>{{ member.nickname }}님의 금융데이터</h1>
      <p>회원에게 적용된 Mock 계좌와 거래내역을 조회하고 관리합니다.</p>
    </header>

    <article class="admin-card admin-finance-member__info">
      <p><span class="muted">회원</span> {{ member.nickname }} <span class="muted">ID</span> {{ member.userId }} <span class="muted">이메일</span> {{ member.email }}</p>
      <p>
        <span class="muted">현재 적용 세트</span> {{ appliedDatasetName }}
        <span class="muted">계좌</span> {{ member.accountCount }}
        <span class="muted">거래</span> {{ member.transactionCount }}
        <span class="muted">적용일</span> {{ member.appliedAt }}
      </p>
    </article>

    <article class="admin-card">
      <div class="admin-finance-member__section-head">
        <h2>Mock 금융 데이터</h2>
        <div class="admin-finance-member__section-actions">
          <button type="button" class="ghost" @click="openCreateAccount">계좌 등록</button>
          <button type="button" class="primary" @click="openCreateTransaction">거래 등록</button>
        </div>
      </div>

      <div class="admin-finance-member__tabs">
        <button type="button" :class="['admin-finance-member__tab', { active: activeType === 'all' }]" @click="activeType = 'all'">전체</button>
        <button type="button" :class="['admin-finance-member__tab', { active: activeType === 'account' }]" @click="activeType = 'account'">계좌</button>
        <button type="button" :class="['admin-finance-member__tab', { active: activeType === 'transaction' }]" @click="activeType = 'transaction'">거래</button>
      </div>

      <div class="admin-finance-member__table-wrap">
        <table>
          <thead>
            <tr>
              <th>유형</th>
              <th>금융기관 · 거래처</th>
              <th>항목 · 메모</th>
              <th>금액 · 잔액</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td><span :class="['admin-badge', `admin-badge--type-${record.type}`]">{{ TYPE_LABEL[record.type] }}</span></td>
              <td class="strong">{{ record.institution }}</td>
              <td>{{ record.detail }}</td>
              <td :class="['strong', amountClass(record)]">{{ amountText(record) }}</td>
              <td><span :class="['admin-badge', `admin-badge--status-${record.status}`]">{{ STATUS_LABEL[record.status] }}</span></td>
              <td class="admin-finance-member__row-actions">
                <button type="button" @click="openEditRecord(record)">수정</button>
                <span>·</span>
                <button type="button" class="danger" @click="removeRecord(record)">삭제</button>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0">
              <td colspan="6" class="admin-finance-member__empty">등록된 Mock 금융 데이터가 없어요.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="admin-finance-member__footer">
        <p>동일 거래 고유값 기준으로 중복 거래는 자동 차단됩니다.</p>
        <RouterLink to="/admin/finance-data/history">등록 · 수정 · 삭제 이력 보기 →</RouterLink>
      </footer>
    </article>

    <div v-if="accountModal" class="admin-finance-member__modal-backdrop">
      <div class="admin-finance-member__modal">
        <h2>{{ accountModal.mode === 'edit' ? '계좌 수정' : '계좌 등록' }}</h2>
        <p class="admin-finance-member__modal-desc">
          {{ accountModal.mode === 'edit' ? 'Mock 계좌 정보를 수정하세요.' : 'Mock 계좌 정보를 등록하세요.' }}
        </p>

        <label>
          금융기관
          <input v-model="accountForm.institution" type="text" placeholder="예: KB국민은행" />
          <small v-if="accountErrors.institution" class="admin-finance-member__field-error">{{ accountErrors.institution }}</small>
        </label>
        <label>
          계좌 이름
          <input v-model="accountForm.name" type="text" placeholder="예: 입출금 계좌" />
          <small v-if="accountErrors.name" class="admin-finance-member__field-error">{{ accountErrors.name }}</small>
        </label>
        <label>
          계좌 유형
          <select v-model="accountForm.subType">
            <option v-for="option in ACCOUNT_SUB_TYPES" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label>
          잔액
          <input v-model.number="accountForm.amount" type="number" placeholder="0" />
          <small v-if="accountErrors.amount" class="admin-finance-member__field-error">{{ accountErrors.amount }}</small>
        </label>
        <label>
          상태
          <select v-model="accountForm.status">
            <option value="connected">연결됨</option>
            <option value="disconnected">연결 끊김</option>
            <option value="pending">연결 전</option>
          </select>
        </label>
        <div class="admin-finance-member__modal-actions">
          <button type="button" class="ghost" @click="closeAccountModal">취소</button>
          <button type="button" class="primary" @click="submitAccount">{{ accountModal.mode === 'edit' ? '저장' : '등록' }}</button>
        </div>
      </div>
    </div>

    <div v-if="transactionModal" class="admin-finance-member__modal-backdrop">
      <div class="admin-finance-member__modal">
        <h2>{{ transactionModal.mode === 'edit' ? '거래 수정' : '거래 등록' }}</h2>
        <p class="admin-finance-member__modal-desc">
          {{ transactionModal.mode === 'edit' ? 'Mock 거래 정보를 수정하세요.' : 'Mock 거래 정보를 등록하세요.' }}
        </p>

        <label>
          연결 계좌
          <select v-model="transactionForm.linkedRecordId">
            <option value="">선택하세요</option>
            <option v-for="option in accountOptions" :key="option.id" :value="option.id">{{ option.institution }} · {{ option.detail }}</option>
          </select>
        </label>
        <label>
          거래일
          <input v-model="transactionForm.date" type="date" />
        </label>
        <label>
          거래처
          <input v-model="transactionForm.institution" type="text" placeholder="예: 스타벅스" />
          <small v-if="transactionErrors.institution" class="admin-finance-member__field-error">{{ transactionErrors.institution }}</small>
        </label>
        <label>
          거래 금액
          <input v-model.number="transactionForm.amount" type="number" placeholder="0" />
          <small v-if="transactionErrors.amount" class="admin-finance-member__field-error">{{ transactionErrors.amount }}</small>
        </label>

        <span class="admin-finance-member__field-label">거래 유형</span>
        <div class="admin-finance-member__modal-tabs">
          <button type="button" :class="['admin-finance-member__modal-tab', { active: transactionForm.kind === 'expense' }]" @click="transactionForm.kind = 'expense'">지출</button>
          <button type="button" :class="['admin-finance-member__modal-tab', { active: transactionForm.kind === 'income' }]" @click="transactionForm.kind = 'income'">수입</button>
        </div>

        <label>
          카테고리
          <input v-model="transactionForm.category" type="text" placeholder="예: 식비" />
        </label>
        <label>
          메모
          <input v-model="transactionForm.memo" type="text" placeholder="예: 점심 식사" />
        </label>
        <label>
          상태
          <select v-model="transactionForm.status">
            <option value="connected">연결됨</option>
            <option value="disconnected">연결 끊김</option>
            <option value="pending">연결 전</option>
          </select>
        </label>
        <p class="admin-finance-member__modal-hint">동일 거래 고유값이 감지되면 자동으로 중복 의심 상태로 등록됩니다.</p>
        <div class="admin-finance-member__modal-actions">
          <button type="button" class="ghost" @click="closeTransactionModal">취소</button>
          <button type="button" class="primary" @click="submitTransaction">{{ transactionModal.mode === 'edit' ? '저장' : '등록' }}</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-finance-member__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-member__header {
  margin-top: 10px;
}

.admin-finance-member__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-finance-member__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-small);
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

.admin-finance-member__info p {
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__info p + p {
  margin-top: 12px;
}

.admin-finance-member__info .muted {
  margin-right: 4px;
  color: var(--subtle);
  font-weight: 400;
}

.admin-finance-member__info .muted:not(:first-child) {
  margin-left: 14px;
}

.admin-finance-member__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-finance-member__section-actions {
  display: flex;
  gap: 10px;
}

.admin-finance-member__section-actions .ghost {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-member__section-actions .primary {
  padding: 8px 18px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-member__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.admin-finance-member__tab {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__tab.active {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance-member__table-wrap {
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
  vertical-align: middle;
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

.admin-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-badge--type-account {
  background: #dbeafe;
  color: #3b82f6;
}

.admin-badge--type-transaction {
  background: #dcfce7;
  color: #22c55e;
}

.admin-badge--status-connected {
  background: #dbeafe;
  color: #3b82f6;
}

.admin-badge--status-disconnected {
  background: #fee2e2;
  color: #ef4444;
}

.admin-badge--status-pending {
  background: #f1f5f9;
  color: #94a3b8;
}

.admin-finance-member__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.admin-finance-member__row-actions button {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance-member__row-actions button.danger {
  color: #ef4444;
}

.admin-finance-member__empty {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-finance-member__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.admin-finance-member__footer p {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance-member__footer a {
  color: #3b82f6;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 30%);
}

.admin-finance-member__modal {
  width: 500px;
  max-height: 90vh;
  padding: 32px;
  overflow-y: auto;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-finance-member__modal h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-finance-member__modal-desc {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-member__modal label {
  display: block;
  margin-top: 16px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__field-label {
  display: block;
  margin-top: 16px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__modal input,
.admin-finance-member__modal select {
  display: block;
  width: 100%;
  height: 42px;
  margin-top: 8px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-finance-member__field-error {
  display: block;
  margin-top: 6px;
  color: #ef4444;
  font-size: var(--font-caption);
  font-weight: 400;
}

.admin-finance-member__modal-tabs {
  display: flex;
  margin-top: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.admin-finance-member__modal-tab {
  flex: 1;
  height: 42px;
  border: 0;
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__modal-tab.active {
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance-member__modal-tab:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.admin-finance-member__modal-hint {
  margin-top: 12px;
  color: #ef4444;
  font-size: var(--font-caption);
}

.admin-finance-member__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.admin-finance-member__modal-actions button {
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-member__modal-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.admin-finance-member__modal-actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}
</style>
