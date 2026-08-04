<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  assignAdminFinanceDatasetMember,
  createAdminFinanceDatasetRecord,
  deleteAdminFinanceDatasetRecord,
  getAdminFinancePersonaDataset,
  getAdminFinancePersonaDatasets,
  reassignAdminFinanceDatasetMember,
  removeAdminFinanceDatasetMember,
  updateAdminFinanceDatasetRecord,
} from '@/features/admin/api/financeDataApi'

const TYPE_LABEL = { account: '계좌', card: '카드', transaction: '거래' }
const STATUS_LABEL = { connected: '연결됨', disconnected: '연결 끊김', pending: '연결 전' }

const route = useRoute()
const dataset = ref(null)
const allDatasets = ref([])
const recordModal = ref(null) // { mode: 'create' | 'edit', record }
const memberModal = ref(null) // { mode: 'assign' | 'reassign', member }
const recordForm = reactive({ type: 'account', institution: '', detail: '', amount: '', status: 'pending' })
const assignKeyword = ref('')
const reassignTargetKey = ref('')
const activeType = ref('all')

const allMembers = [{ userId: 'jijun01', email: 'user@email.com', nickname: '재준' }]

const otherDatasets = computed(() => allDatasets.value.filter((item) => item.key !== dataset.value?.key))

function isMemberApplied(userId) {
  return dataset.value?.appliedMembers?.some((member) => member.userId === userId) ?? false
}

const filteredRecords = computed(() => {
  if (!dataset.value) return []
  if (activeType.value === 'all') return dataset.value.records
  return dataset.value.records.filter((record) => record.type === activeType.value)
})

function displayStatus(record) {
  if (record.status === 'connected' || record.status === 'disconnected' || record.status === 'pending') return record.status
  const charSum = String(record.id)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return charSum % 2 === 0 ? 'disconnected' : 'pending'
}

async function load() {
  dataset.value = await getAdminFinancePersonaDataset(route.params.datasetKey)
  allDatasets.value = await getAdminFinancePersonaDatasets()
}

function amountText(record) {
  if (record.type === 'card' || record.amount === null || record.amount === undefined) return '-'
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

function openCreateRecord(type) {
  Object.assign(recordForm, { type, institution: '', detail: '', amount: '', status: 'pending' })
  recordModal.value = { mode: 'create' }
}

function openEditRecord(record) {
  Object.assign(recordForm, { type: record.type, institution: record.institution, detail: record.detail, amount: record.amount ?? '', status: displayStatus(record) })
  recordModal.value = { mode: 'edit', record }
}

function closeRecordModal() {
  recordModal.value = null
}

async function submitRecord() {
  const payload = {
    type: recordForm.type,
    institution: recordForm.institution,
    detail: recordForm.detail,
    amount: recordForm.amount === '' ? null : Number(recordForm.amount),
    status: recordForm.status,
  }
  if (recordModal.value.mode === 'edit') {
    await updateAdminFinanceDatasetRecord(dataset.value.key, recordModal.value.record.id, payload)
  } else {
    await createAdminFinanceDatasetRecord(dataset.value.key, payload)
  }
  closeRecordModal()
  await load()
}

async function removeRecord(record) {
  if (!window.confirm(`"${record.institution}" 항목을 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return
  await deleteAdminFinanceDatasetRecord(dataset.value.key, record.id)
  await load()
}

function openAssignMember() {
  assignKeyword.value = ''
  memberModal.value = { mode: 'assign' }
}

function openReassignMember(member) {
  reassignTargetKey.value = otherDatasets.value[0]?.key || ''
  memberModal.value = { mode: 'reassign', member }
}

function closeMemberModal() {
  memberModal.value = null
}

async function submitAssign() {
  await assignAdminFinanceDatasetMember(dataset.value.key, assignKeyword.value)
  closeMemberModal()
  await load()
}

async function submitReassign() {
  await reassignAdminFinanceDatasetMember(dataset.value.key, memberModal.value.member.userId, reassignTargetKey.value)
  closeMemberModal()
  await load()
}

async function removeMember(member) {
  if (!window.confirm(`"${member.nickname}" 회원에게서 이 데이터 세트를 해제할까요?`)) return
  await removeAdminFinanceDatasetMember(dataset.value.key, member.userId)
  await load()
}

onMounted(load)
</script>

<template>
  <section v-if="dataset" class="admin-finance-detail">
    <RouterLink to="/admin/finance-data" class="admin-finance-detail__back">‹ 데이터 세트 관리로</RouterLink>

    <header class="admin-finance-detail__header">
      <h1>{{ dataset.name }}</h1>
      <p class="admin-finance-detail__desc">{{ dataset.description }}</p>
      <p class="admin-finance-detail__meta">
        생성일 {{ dataset.createdAt }} · 최근 수정 {{ dataset.updatedAt }} · 계좌 {{ dataset.accountCount }} · 카드 {{ dataset.cardCount }} · 거래 {{ dataset.transactionCount }}
      </p>
    </header>

    <article class="admin-card">
      <div class="admin-finance-detail__section-head">
        <h2>Mock 금융 데이터</h2>
        <div class="admin-finance-detail__section-actions">
          <button type="button" class="ghost" @click="openCreateRecord('account')">계좌·카드 등록</button>
          <button type="button" class="primary" @click="openCreateRecord('transaction')">거래 등록</button>
        </div>
      </div>

      <div class="admin-finance-detail__tabs">
        <button type="button" :class="['admin-finance-detail__tab', { active: activeType === 'all' }]" @click="activeType = 'all'">전체</button>
        <button type="button" :class="['admin-finance-detail__tab', { active: activeType === 'account' }]" @click="activeType = 'account'">계좌</button>
        <button type="button" :class="['admin-finance-detail__tab', { active: activeType === 'card' }]" @click="activeType = 'card'">카드</button>
        <button type="button" :class="['admin-finance-detail__tab', { active: activeType === 'transaction' }]" @click="activeType = 'transaction'">거래</button>
      </div>

      <div class="admin-finance-detail__table-wrap">
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
              <td><span :class="['admin-badge', `admin-badge--status-${displayStatus(record)}`]">{{ STATUS_LABEL[displayStatus(record)] }}</span></td>
              <td class="admin-finance-detail__row-actions">
                <button type="button" @click="openEditRecord(record)">수정</button>
                <span>·</span>
                <button type="button" class="danger" @click="removeRecord(record)">삭제</button>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0">
              <td colspan="6" class="admin-finance-detail__empty">등록된 금융 데이터가 없어요.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="admin-finance-detail__footer">
        <p>동일 거래 고유값 기준으로 중복 거래는 자동 차단됩니다.</p>
        <RouterLink to="/admin/finance-data/history">등록 · 수정 · 삭제 이력 보기 →</RouterLink>
      </footer>
    </article>

    <article class="admin-card">
      <div class="admin-finance-detail__section-head">
        <h2>이 세트가 적용된 회원 ({{ dataset.appliedMembers.length }}명)</h2>
        <button type="button" class="ghost" @click="openAssignMember">+ 회원 지정</button>
      </div>

      <div class="admin-finance-detail__table-wrap">
        <table>
          <thead>
            <tr>
              <th>회원 (ID · 이메일 · 닉네임)</th>
              <th>적용일</th>
              <th>최근 수정</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in dataset.appliedMembers" :key="member.userId">
              <td class="strong">{{ member.userId }} · {{ member.email }} · {{ member.nickname }}</td>
              <td>{{ member.appliedAt }}</td>
              <td>{{ member.updatedAt }}</td>
              <td class="admin-finance-detail__row-actions">
                <button type="button" @click="openReassignMember(member)">변경</button>
                <span>·</span>
                <button type="button" class="danger" @click="removeMember(member)">해제</button>
              </td>
            </tr>
            <tr v-if="dataset.appliedMembers.length === 0">
              <td colspan="4" class="admin-finance-detail__empty">이 세트가 적용된 회원이 없어요.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div v-if="recordModal" class="admin-finance-detail__modal-backdrop">
      <div class="admin-finance-detail__modal">
        <h2>{{ recordModal.mode === 'edit' ? '금융 데이터 수정' : '금융 데이터 등록' }}</h2>
        <label>
          유형
          <select v-model="recordForm.type">
            <option value="account">계좌</option>
            <option value="card">카드</option>
            <option value="transaction">거래</option>
          </select>
        </label>
        <label>
          금융기관 · 거래처
          <input v-model="recordForm.institution" type="text" placeholder="예: KB국민은행" />
        </label>
        <label>
          항목 · 메모
          <input v-model="recordForm.detail" type="text" placeholder="예: 입출금 계좌" />
        </label>
        <label>
          금액 · 잔액
          <input v-model.number="recordForm.amount" type="number" placeholder="비워두면 '-'로 표시돼요" />
        </label>
        <label>
          상태
          <select v-model="recordForm.status">
            <option value="connected">연결됨</option>
            <option value="disconnected">연결 끊김</option>
            <option value="pending">연결 전</option>
          </select>
        </label>
        <div class="admin-finance-detail__modal-actions">
          <button type="button" class="ghost" @click="closeRecordModal">취소</button>
          <button type="button" class="primary" @click="submitRecord">{{ recordModal.mode === 'edit' ? '저장' : '등록' }}</button>
        </div>
      </div>
    </div>

    <div v-if="memberModal?.mode === 'assign'" class="admin-finance-detail__modal-backdrop">
      <div class="admin-finance-detail__modal">
        <h2>회원 지정</h2>
        <ul class="admin-finance-detail__member-list">
          <li
            v-for="member in allMembers"
            :key="member.userId"
            :class="[
              'admin-finance-detail__member-item',
              { selected: assignKeyword === member.userId, applied: isMemberApplied(member.userId) },
            ]"
            @click="!isMemberApplied(member.userId) && (assignKeyword = member.userId)"
          >
            <div>
              <p class="strong">{{ member.nickname }}</p>
              <small>{{ member.userId }} · {{ member.email }}</small>
            </div>
            <span v-if="isMemberApplied(member.userId)" class="admin-finance-detail__member-status">적용 중</span>
          </li>
        </ul>
        <div class="admin-finance-detail__modal-actions">
          <button type="button" class="ghost" @click="closeMemberModal">취소</button>
          <button type="button" class="primary" :disabled="!assignKeyword" @click="submitAssign">지정</button>
        </div>
      </div>
    </div>

    <div v-if="memberModal?.mode === 'reassign'" class="admin-finance-detail__modal-backdrop">
      <div class="admin-finance-detail__modal">
        <h2>적용 세트 변경</h2>
        <p class="admin-finance-detail__modal-caption">{{ memberModal.member.nickname }} 회원에게 적용할 다른 데이터 세트를 선택하세요.</p>
        <label>
          변경할 데이터 세트
          <select v-model="reassignTargetKey">
            <option v-for="option in otherDatasets" :key="option.key" :value="option.key">{{ option.name }}</option>
          </select>
        </label>
        <div class="admin-finance-detail__modal-actions">
          <button type="button" class="ghost" @click="closeMemberModal">취소</button>
          <button type="button" class="primary" :disabled="!reassignTargetKey" @click="submitReassign">변경</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-finance-detail__back {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-detail__header {
  margin-top: 10px;
}

.admin-finance-detail__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-finance-detail__desc {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-detail__meta {
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

.admin-finance-detail__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-finance-detail__section-head h2 {
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
}

.admin-finance-detail__section-actions {
  display: flex;
  gap: 10px;
}

.admin-finance-detail__section-actions .ghost,
.admin-finance-detail__section-head > .ghost {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-detail__section-actions .primary {
  padding: 8px 18px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-detail__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.admin-finance-detail__tab {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-detail__tab.active {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance-detail__table-wrap {
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
}

.admin-badge--type-account {
  background: #dbeafe;
  color: #3b82f6;
}

.admin-badge--type-card {
  background: #fef3c7;
  color: #f59e0b;
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

.admin-finance-detail__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.admin-finance-detail__row-actions button {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance-detail__row-actions button.danger {
  color: #ef4444;
}

.admin-finance-detail__empty {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-finance-detail__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.admin-finance-detail__footer p {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance-detail__footer a {
  color: #3b82f6;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-detail__modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 30%);
}

.admin-finance-detail__modal {
  width: 420px;
  padding: 32px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-finance-detail__modal h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-finance-detail__modal-caption {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-detail__member-list {
  display: grid;
  gap: 6px;
  margin-top: 16px;
  max-height: 260px;
  overflow-y: auto;
}

.admin-finance-detail__member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.admin-finance-detail__member-item p {
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-detail__member-item small {
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-finance-detail__member-item.selected {
  border-color: var(--accent-strong);
  background: var(--accent);
}

.admin-finance-detail__member-item.applied {
  cursor: not-allowed;
  opacity: 0.6;
}

.admin-finance-detail__member-status {
  padding: 3px 10px;
  border-radius: 999px;
  background: #dcfce7;
  color: #22c55e;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-detail__modal label {
  display: block;
  margin-top: 16px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-detail__modal input,
.admin-finance-detail__modal select {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-finance-detail__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.admin-finance-detail__modal-actions button {
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-detail__modal-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.admin-finance-detail__modal-actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance-detail__modal-actions .primary:disabled {
  opacity: 0.5;
}
</style>
