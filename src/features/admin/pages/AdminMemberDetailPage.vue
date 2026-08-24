<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminMemberDetail, updateAdminMemberStatus } from '@/features/admin/api/memberApi'
import AppIcon from '@/components/ui/AppIcon.vue'

const STATUS_OPTIONS = [
  { value: 'normal', label: '정상' },
  { value: 'restricted', label: '이용 제한' },
  { value: 'withdrawn', label: '탈퇴' },
]
const STATUS_LABEL = { normal: '정상', restricted: '이용제한', withdrawn: '탈퇴' }

const route = useRoute()
const router = useRouter()
const member = ref(null)
const selectedStatus = ref('')
const reason = ref('')
const saving = ref(false)

const isDirty = computed(() => member.value && selectedStatus.value !== member.value.status)

async function load() {
  member.value = await getAdminMemberDetail(route.params.memberId)
  selectedStatus.value = member.value.status
  reason.value = ''
}

function cancelChange() {
  selectedStatus.value = member.value.status
  reason.value = ''
}

async function save() {
  saving.value = true
  member.value = await updateAdminMemberStatus(member.value.id, {
    status: selectedStatus.value,
    reason: reason.value || '사유 미입력',
  })
  reason.value = ''
  saving.value = false
}

onMounted(load)
</script>

<template>
  <section v-if="member" class="admin-member-detail">
    <RouterLink to="/admin/members" class="admin-member-detail__back"
      ><AppIcon name="chevron-left" :size="20" />회원 목록으로</RouterLink
    >
    <header class="admin-member-detail__header">
      <h1>회원 상세 · 상태 변경</h1>
      <p>회원 기본 정보와 상태를 확인하고 수정하세요.</p>
    </header>

    <article class="admin-card">
      <h2>회원 기본 정보</h2>
      <p class="admin-member-detail__caption">수정 후 저장하면 회원 정보에 바로 반영돼요.</p>

      <div class="admin-member-detail__grid">
        <div>
          <p class="field-label">회원 ID</p>
          <p class="field-value">{{ member.id }}</p>
        </div>
        <div>
          <p class="field-label">이메일</p>
          <p class="field-value">{{ member.email }}</p>
        </div>
        <div>
          <p class="field-label">닉네임</p>
          <p class="field-value">{{ member.nickname }}</p>
        </div>
        <div>
          <p class="field-label">가입일</p>
          <p class="field-value">{{ member.joinedAt }}</p>
        </div>
        <div>
          <p class="field-label">최근 로그인 일시</p>
          <p class="field-value">{{ member.lastLoginAt || '로그인 이력 없음' }}</p>
        </div>
        <div>
          <p class="field-label">회원 상태</p>
          <span :class="['admin-badge', `admin-badge--${member.status}`]">{{ STATUS_LABEL[member.status] }}</span>
        </div>
      </div>

      <div class="admin-member-detail__status-change">
        <div class="admin-member-detail__status-change-head">
          <h3>회원 상태 변경</h3>
          <span>변경할 상태를 선택하세요.</span>
        </div>
        <div class="admin-member-detail__status-options">
          <button
            v-for="option in STATUS_OPTIONS"
            :key="option.value"
            type="button"
            :class="['status-option', `status-option--${option.value}`, { active: selectedStatus === option.value }]"
            @click="selectedStatus = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <label class="admin-member-detail__reason">
          변경 사유
          <input v-model="reason" type="text" placeholder="상태 변경 사유를 입력하세요." />
        </label>

        <div class="admin-member-detail__actions">
          <button type="button" class="ghost" @click="cancelChange">취소</button>
          <button type="button" class="primary" :disabled="!isDirty || saving" @click="save">변경사항 저장</button>
        </div>
      </div>
    </article>

    <article class="admin-card">
      <h2>상태 변경 이력</h2>
      <ul class="admin-member-detail__history">
        <li v-for="(entry, index) in member.statusHistory" :key="index">
          <span :class="['admin-badge', `admin-badge--${entry.status}`]">{{ STATUS_LABEL[entry.status] }}</span>
          <p>{{ entry.reason }}</p>
          <time>{{ new Date(entry.changedAt).toLocaleString('ko-KR') }}</time>
        </li>
        <li v-if="member.statusHistory.length === 0" class="admin-member-detail__history-empty">
          변경 이력이 없어요.
        </li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.admin-member-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-member-detail__header {
  margin-top: 10px;
}

.admin-member-detail__header h1 {
  color: var(--text);
  font-size: 28px;
  font-weight: 800;
}

.admin-member-detail__header p {
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

.admin-member-detail__caption {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-member-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin-top: 20px;
}

.field-label {
  margin-bottom: 8px;
  color: var(--text);
  font-size: var(--font-caption);
  font-weight: 700;
}

.field-value {
  padding: 10px 14px;
  border: 1px solid var(--border);
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

.admin-member-detail__status-change {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.admin-member-detail__status-change-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.admin-member-detail__status-change-head h3 {
  color: var(--text);
  font-size: var(--font-body);
  font-weight: 800;
}

.admin-member-detail__status-change-head span {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-member-detail__status-options {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.status-option {
  padding: 10px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.status-option--normal.active {
  border-color: #22c55e;
  background: #22c55e;
  color: white;
}

.status-option--restricted.active {
  border-color: #f59e0b;
  color: #f59e0b;
}

.status-option--withdrawn.active {
  border-color: #ef4444;
  color: #ef4444;
}

.admin-member-detail__reason {
  display: block;
  margin-top: 20px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-member-detail__reason input {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-member-detail__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.admin-member-detail__actions button {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-member-detail__actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.admin-member-detail__actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}

.admin-member-detail__actions .primary:disabled {
  opacity: 0.5;
}

.admin-member-detail__history {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.admin-member-detail__history li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  font-size: var(--font-small);
}

.admin-member-detail__history li:first-child {
  border-top: 0;
}

.admin-member-detail__history time {
  color: var(--subtle);
  font-size: var(--font-caption);
}

.admin-member-detail__history-empty {
  display: block;
  padding: 20px 0;
  color: var(--subtle);
  text-align: center;
}
</style>
