<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createAdminFinancePersonaDataset } from '@/features/admin/api/financeDataApi'

const router = useRouter()

const DATASET_TYPES = ['독립 자취생', '퇴사 후 재취업', '첫 취업 준비생', '지방 상경 취준생']
const TYPE_LABEL = { account: '계좌', card: '카드', transaction: '거래' }
const STATUS_LABEL = { connected: '연결됨', disconnected: '연결 끊김', pending: '연결 전' }

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const form = ref({ name: '', type: '', createdAt: todayStr(), description: '' })

const activeType = ref('all')
const records = ref([])
let recordIdCounter = 1

const filteredRecords = computed(() => {
  if (activeType.value === 'all') return records.value
  return records.value.filter((record) => record.type === activeType.value)
})

const accountCardOptions = computed(() => records.value.filter((record) => record.type === 'account' || record.type === 'card'))

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

// 계좌·카드 등록 모달
const accountModal = ref(null) // { mode: 'create' | 'edit', record }
const accountForm = ref({ type: 'account', institution: '', name: '', number: '', amount: '', status: 'pending' })

function openCreateAccount() {
  accountForm.value = { type: 'account', institution: '', name: '', number: '', amount: '', status: 'pending' }
  accountModal.value = { mode: 'create' }
}

function openEditAccount(record) {
  accountForm.value = {
    type: record.type,
    institution: record.institution,
    name: record.detail,
    number: record.number || '',
    amount: record.amount ?? '',
    status: record.status,
  }
  accountModal.value = { mode: 'edit', record }
}

function closeAccountModal() {
  accountModal.value = null
}

function submitAccount() {
  const payload = {
    type: accountForm.value.type,
    institution: accountForm.value.institution,
    detail: accountForm.value.name,
    number: accountForm.value.number,
    amount: accountForm.value.type === 'card' || accountForm.value.amount === '' ? null : Number(accountForm.value.amount),
    status: accountForm.value.status,
  }
  if (accountModal.value.mode === 'edit') {
    Object.assign(accountModal.value.record, payload)
  } else {
    records.value.push({ id: `rec-${recordIdCounter++}`, ...payload })
  }
  closeAccountModal()
}

// 거래 등록 모달
const transactionModal = ref(null) // { mode: 'create' | 'edit', record }
const transactionForm = ref({ linkedRecordId: '', institution: '', date: todayStr(), kind: 'expense', amount: '', memo: '', status: 'pending' })

function openCreateTransaction() {
  transactionForm.value = { linkedRecordId: '', institution: '', date: todayStr(), kind: 'expense', amount: '', memo: '', status: 'pending' }
  transactionModal.value = { mode: 'create' }
}

function openEditTransaction(record) {
  transactionForm.value = {
    linkedRecordId: record.linkedRecordId || '',
    institution: record.institution,
    date: record.date || todayStr(),
    kind: record.kind || 'expense',
    amount: record.amount === null || record.amount === undefined ? '' : Math.abs(record.amount),
    memo: record.memo || '',
    status: record.status,
  }
  transactionModal.value = { mode: 'edit', record }
}

function closeTransactionModal() {
  transactionModal.value = null
}

function submitTransaction() {
  const kindLabel = transactionForm.value.kind === 'income' ? '수입' : '지출'
  const amountValue = transactionForm.value.amount === '' ? null : Number(transactionForm.value.amount)
  const payload = {
    type: 'transaction',
    linkedRecordId: transactionForm.value.linkedRecordId,
    institution: transactionForm.value.institution,
    date: transactionForm.value.date,
    kind: transactionForm.value.kind,
    memo: transactionForm.value.memo,
    detail: `${transactionForm.value.date} · ${kindLabel}${transactionForm.value.memo ? `(${transactionForm.value.memo})` : ''}`,
    amount: amountValue === null ? null : transactionForm.value.kind === 'income' ? Math.abs(amountValue) : -Math.abs(amountValue),
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
  records.value = records.value.filter((item) => item.id !== record.id)
}

// 이 세트를 적용할 회원
const allMembers = ref([
  { userId: 'hyunwoo55', email: 'hyunwoo@email.com', nickname: '현우', currentDataset: '퇴사 후 재취업' },
  { userId: 'minji92', email: 'minji@email.com', nickname: '민지', currentDataset: '독립 자취생' },
  { userId: 'seojun01', email: 'seojun@email.com', nickname: '서준', currentDataset: '첫 취업 준비생' },
  { userId: 'jiyoung88', email: 'jiyoung@email.com', nickname: '지영', currentDataset: '' },
  { userId: 'dohyun77', email: 'dohyun@email.com', nickname: '도현', currentDataset: '지방 상경 취준생' },
  { userId: 'eunji03', email: 'eunji@email.com', nickname: '은지', currentDataset: '' },
  { userId: 'taehyun44', email: 'taehyun@email.com', nickname: '태현', currentDataset: '첫 취업 준비생' },
  { userId: 'subin19', email: 'subin@email.com', nickname: '수빈', currentDataset: '' },
])

const memberKeyword = ref('')
const memberFilter = ref('all') // all | selected | unselected
const selectedMemberIds = ref(['hyunwoo55', 'minji92'])
const memberPage = ref(1)
const MEMBER_PAGE_SIZE = 5

const filteredMembers = computed(() => {
  const keyword = memberKeyword.value.trim().toLowerCase()
  return allMembers.value.filter((member) => {
    const matchesKeyword =
      !keyword || [member.userId, member.email, member.nickname].some((value) => value.toLowerCase().includes(keyword))
    const isSelected = selectedMemberIds.value.includes(member.userId)
    const matchesFilter =
      memberFilter.value === 'all' || (memberFilter.value === 'selected' ? isSelected : !isSelected)
    return matchesKeyword && matchesFilter
  })
})

const memberTotalPages = computed(() => Math.max(1, Math.ceil(filteredMembers.value.length / MEMBER_PAGE_SIZE)))

const pagedMembers = computed(() => {
  const start = (memberPage.value - 1) * MEMBER_PAGE_SIZE
  return filteredMembers.value.slice(start, start + MEMBER_PAGE_SIZE)
})

watch([memberKeyword, memberFilter], () => {
  memberPage.value = 1
})

function isMemberSelected(userId) {
  return selectedMemberIds.value.includes(userId)
}

function toggleMember(userId) {
  if (selectedMemberIds.value.includes(userId)) {
    selectedMemberIds.value = selectedMemberIds.value.filter((id) => id !== userId)
  } else {
    selectedMemberIds.value = [...selectedMemberIds.value, userId]
  }
}

function goToMemberPage(page) {
  memberPage.value = Math.min(Math.max(1, page), memberTotalPages.value)
}

const reassignModal = ref(null) // { member }
const reassignChoice = ref(DATASET_TYPES[0])

function openReassignMember(member) {
  reassignChoice.value = member.currentDataset || DATASET_TYPES[0]
  reassignModal.value = { member }
}

function closeReassignModal() {
  reassignModal.value = null
}

function submitReassign() {
  const target = allMembers.value.find((member) => member.userId === reassignModal.value.member.userId)
  if (target) target.currentDataset = reassignChoice.value
  selectedMemberIds.value = selectedMemberIds.value.filter((id) => id !== reassignModal.value.member.userId)
  closeReassignModal()
}

// 데이터 세트 생성
async function submitDataset() {
  if (!form.value.name.trim() || !form.value.type) {
    window.alert('데이터 세트 이름과 유형을 입력해 주세요.')
    return
  }
  const accountCount = records.value.filter((record) => record.type === 'account').length
  const cardCount = records.value.filter((record) => record.type === 'card').length
  const transactionCount = records.value.filter((record) => record.type === 'transaction').length
  const appliedMembers = selectedMemberIds.value.map((userId) => {
    const member = allMembers.value.find((item) => item.userId === userId)
    return { userId: member.userId, email: member.email, nickname: member.nickname, appliedAt: form.value.createdAt, updatedAt: form.value.createdAt }
  })

  await createAdminFinancePersonaDataset({
    name: form.value.name.trim(),
    description: form.value.description,
    accountCount,
    cardCount,
    transactionCount,
    createdAt: form.value.createdAt,
    updatedAt: form.value.createdAt,
    records: records.value.map((record) => ({ ...record })),
    appliedMembers,
  })

  router.push('/admin/finance-data')
}
</script>

<template>
  <section class="admin-finance-create">
    <RouterLink to="/admin/finance-data" class="admin-finance-create__back">‹ 데이터 세트 관리</RouterLink>
    <header class="admin-finance-create__header">
      <h1>새 데이터 세트 등록</h1>
      <p>회원에게 적용할 금융 데이터 세트를 생성하고 Mock 데이터를 구성합니다.</p>
    </header>

    <article class="admin-card">
      <h2>데이터 세트 기본 정보</h2>
      <div class="admin-finance-create__grid">
        <label>
          데이터 세트 이름 <span class="admin-finance-create__required">*</span>
          <input v-model="form.name" type="text" placeholder="데이터 세트 이름을 입력하세요" />
        </label>
        <label>
          유형
          <select v-model="form.type">
            <option value="" disabled>유형을 선택하세요</option>
            <option v-for="option in DATASET_TYPES" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label>
          생성일
          <input v-model="form.createdAt" type="date" />
        </label>
      </div>
      <label class="admin-finance-create__description">
        설명
        <textarea v-model="form.description" rows="3" placeholder="이 데이터 세트의 특징과 활용 목적을 입력하세요" />
      </label>
    </article>

    <article class="admin-card">
      <div class="admin-finance-create__section-head">
        <h2>Mock 금융 데이터</h2>
        <div class="admin-finance-create__section-actions">
          <button type="button" class="ghost" @click="openCreateAccount">계좌·카드 등록</button>
          <button type="button" class="primary" @click="openCreateTransaction">거래 등록</button>
        </div>
      </div>

      <div class="admin-finance-create__tabs">
        <button type="button" :class="['admin-finance-create__tab', { active: activeType === 'all' }]" @click="activeType = 'all'">전체</button>
        <button type="button" :class="['admin-finance-create__tab', { active: activeType === 'account' }]" @click="activeType = 'account'">계좌</button>
        <button type="button" :class="['admin-finance-create__tab', { active: activeType === 'card' }]" @click="activeType = 'card'">카드</button>
        <button type="button" :class="['admin-finance-create__tab', { active: activeType === 'transaction' }]" @click="activeType = 'transaction'">거래</button>
      </div>

      <div v-if="filteredRecords.length === 0" class="admin-finance-create__empty">
        <span class="admin-finance-create__empty-icon">+</span>
        <p>등록된 Mock 금융 데이터가 없습니다.</p>
        <small>계좌·카드 등록 또는 거래 등록 버튼을 눌러 데이터를 추가해 주세요.</small>
      </div>

      <div v-else class="admin-finance-create__table-wrap">
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
              <td class="admin-finance-create__row-actions">
                <button type="button" @click="openEditRecord(record)">수정</button>
                <span>·</span>
                <button type="button" class="danger" @click="removeRecord(record)">삭제</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="admin-finance-create__footer">
        <p>동일 거래 고유값 기준으로 중복 거래는 자동 차단됩니다.</p>
      </footer>
    </article>

    <article class="admin-card">
      <div class="admin-finance-create__section-head">
        <h2>이 세트를 적용할 회원</h2>
        <span class="admin-finance-create__selected-count">선택된 회원 {{ selectedMemberIds.length }}명</span>
      </div>

      <div class="admin-finance-create__member-toolbar">
        <div class="admin-finance-create__search">
          <span class="admin-finance-create__search-icon">⌕</span>
          <input v-model="memberKeyword" type="text" placeholder="회원 이름, ID 또는 이메일로 검색" />
        </div>
        <select v-model="memberFilter">
          <option value="all">전체 회원</option>
          <option value="selected">선택됨</option>
          <option value="unselected">미선택</option>
        </select>
      </div>

      <div class="admin-finance-create__table-wrap">
        <table>
          <thead>
            <tr>
              <th>선택</th>
              <th>회원 정보</th>
              <th>현재 데이터 세트</th>
              <th>적용 상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in pagedMembers"
              :key="member.userId"
              :class="{ 'admin-finance-create__member-row--selected': isMemberSelected(member.userId) }"
              @click="toggleMember(member.userId)"
            >
              <td @click.stop="toggleMember(member.userId)">
                <input type="checkbox" :checked="isMemberSelected(member.userId)" @click.stop="toggleMember(member.userId)" />
              </td>
              <td class="strong">{{ member.userId }} · {{ member.email }} · {{ member.nickname }}</td>
              <td>{{ member.currentDataset || '미지정' }}</td>
              <td>
                <span :class="['admin-badge', isMemberSelected(member.userId) ? 'admin-badge--pending' : 'admin-badge--muted']">
                  {{ isMemberSelected(member.userId) ? '적용 예정' : '미선택' }}
                </span>
              </td>
              <td class="admin-finance-create__row-actions">
                <template v-if="isMemberSelected(member.userId)">
                  <button type="button" @click.stop="openReassignMember(member)">변경</button>
                  <span>·</span>
                  <button type="button" class="danger" @click.stop="toggleMember(member.userId)">해제</button>
                </template>
                <button v-else type="button" @click.stop="toggleMember(member.userId)">적용</button>
              </td>
            </tr>
            <tr v-if="pagedMembers.length === 0">
              <td colspan="5" class="admin-finance-create__empty-row">조건에 맞는 회원이 없어요.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="admin-finance-create__footer">
        <p>선택한 회원에게 새 데이터 세트가 적용됩니다.</p>
        <div class="admin-finance-create__pagination">
          <button type="button" :disabled="memberPage === 1" @click="goToMemberPage(memberPage - 1)">‹</button>
          <button
            v-for="page in memberTotalPages"
            :key="page"
            type="button"
            :class="{ active: page === memberPage }"
            @click="goToMemberPage(page)"
          >
            {{ page }}
          </button>
          <button type="button" :disabled="memberPage === memberTotalPages" @click="goToMemberPage(memberPage + 1)">›</button>
        </div>
      </footer>
    </article>

    <div class="admin-finance-create__actions">
      <RouterLink to="/admin/finance-data" class="ghost">취소</RouterLink>
      <button type="button" class="primary" @click="submitDataset">데이터 세트 생성</button>
    </div>

    <div v-if="accountModal" class="admin-finance-create__modal-backdrop">
      <div class="admin-finance-create__modal">
        <h2>계좌·카드 등록</h2>
        <label>
          데이터 유형
          <select v-model="accountForm.type">
            <option value="account">계좌</option>
            <option value="card">카드</option>
          </select>
        </label>
        <label>
          금융기관
          <input v-model="accountForm.institution" type="text" placeholder="예: KB국민은행" />
        </label>
        <label>
          계좌 또는 카드 이름
          <input v-model="accountForm.name" type="text" placeholder="예: 입출금 계좌" />
        </label>
        <label>
          계좌번호 또는 카드번호
          <input v-model="accountForm.number" type="text" placeholder="예: 123-456-789012" />
        </label>
        <label>
          잔액
          <input v-model.number="accountForm.amount" type="number" placeholder="비워두면 '-'로 표시돼요" />
        </label>
        <label>
          상태
          <select v-model="accountForm.status">
            <option value="connected">연결됨</option>
            <option value="disconnected">연결 끊김</option>
            <option value="pending">연결 전</option>
          </select>
        </label>
        <div class="admin-finance-create__modal-actions">
          <button type="button" class="ghost" @click="closeAccountModal">취소</button>
          <button type="button" class="primary" @click="submitAccount">등록</button>
        </div>
      </div>
    </div>

    <div v-if="transactionModal" class="admin-finance-create__modal-backdrop">
      <div class="admin-finance-create__modal">
        <h2>거래 등록</h2>
        <label>
          연결 계좌 또는 카드
          <select v-model="transactionForm.linkedRecordId">
            <option value="">선택하세요</option>
            <option v-for="option in accountCardOptions" :key="option.id" :value="option.id">{{ option.institution }} · {{ option.detail }}</option>
          </select>
        </label>
        <label>
          거래처
          <input v-model="transactionForm.institution" type="text" placeholder="예: 스타벅스" />
        </label>
        <label>
          거래일
          <input v-model="transactionForm.date" type="date" />
        </label>
        <label>
          거래 구분
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
        <div class="admin-finance-create__modal-actions">
          <button type="button" class="ghost" @click="closeTransactionModal">취소</button>
          <button type="button" class="primary" @click="submitTransaction">등록</button>
        </div>
      </div>
    </div>

    <div v-if="reassignModal" class="admin-finance-create__modal-backdrop">
      <div class="admin-finance-create__modal">
        <h2>적용 데이터 세트 변경</h2>
        <p class="admin-finance-create__modal-caption">{{ reassignModal.member.nickname }} 회원에게 적용할 데이터 세트를 선택하세요.</p>
        <label>
          데이터 세트
          <select v-model="reassignChoice">
            <option v-for="option in DATASET_TYPES" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <div class="admin-finance-create__modal-actions">
          <button type="button" class="ghost" @click="closeReassignModal">취소</button>
          <button type="button" class="primary" @click="submitReassign">변경</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-finance-create__back {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-create__header {
  margin-top: 10px;
}

.admin-finance-create__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-finance-create__header p {
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

.admin-finance-create__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.admin-finance-create__grid label,
.admin-finance-create__description {
  display: block;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-create__required {
  color: #ef4444;
}

.admin-finance-create__description {
  margin-top: 16px;
}

.admin-finance-create__grid input,
.admin-finance-create__grid select,
.admin-finance-create__description input,
.admin-finance-create__description textarea {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-finance-create__description textarea {
  resize: vertical;
  font-family: inherit;
}

.admin-finance-create__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-finance-create__section-actions {
  display: flex;
  gap: 10px;
}

.admin-finance-create__section-actions .ghost,
.admin-finance-create__actions .ghost {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-create__section-actions .primary,
.admin-finance-create__actions .primary {
  padding: 8px 18px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance-create__tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.admin-finance-create__tab {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-create__tab.active {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance-create__empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 48px 0;
  text-align: center;
}

.admin-finance-create__empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--text);
  font-size: 20px;
  font-weight: 700;
}

.admin-finance-create__empty p {
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-create__empty small {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance-create__table-wrap {
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

.admin-badge--pending {
  background: var(--accent);
  color: var(--text);
}

.admin-badge--muted {
  background: #f1f5f9;
  color: #94a3b8;
}

.admin-finance-create__row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.admin-finance-create__row-actions button {
  border: 0;
  background: transparent;
  color: #3b82f6;
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance-create__row-actions button.danger {
  color: #ef4444;
}

.admin-finance-create__empty-row {
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-finance-create__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}

.admin-finance-create__footer p {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-finance-create__selected-count {
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-create__member-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.admin-finance-create__search {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.admin-finance-create__search-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--subtle);
}

.admin-finance-create__search input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.admin-finance-create__member-toolbar select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

tbody tr[class*='admin-finance-create__member-row'] {
  cursor: pointer;
}

.admin-finance-create__member-row--selected {
  background: #fffbea;
}

.admin-finance-create__pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.admin-finance-create__pagination button {
  min-width: 28px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-caption);
  font-weight: 700;
}

.admin-finance-create__pagination button.active {
  border-color: var(--accent-strong);
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance-create__pagination button:disabled {
  opacity: 0.4;
}

.admin-finance-create__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.admin-finance-create__modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 30%);
}

.admin-finance-create__modal {
  width: 420px;
  max-height: 90vh;
  padding: 32px;
  overflow-y: auto;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-finance-create__modal h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-finance-create__modal-caption {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance-create__modal label {
  display: block;
  margin-top: 16px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-create__modal input,
.admin-finance-create__modal select {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-finance-create__modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.admin-finance-create__modal-actions button {
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-finance-create__modal-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.admin-finance-create__modal-actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}

@media (max-width: 900px) {
  .admin-finance-create__grid {
    grid-template-columns: 1fr;
  }
}
</style>
