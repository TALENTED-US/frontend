<script setup>
import { reactive, ref, watch } from 'vue'

const props = defineProps({
  mode: { type: String, required: true }, // 'create' | 'edit'
  recordType: { type: String, default: 'account' }, // 'account' | 'card'
  initial: { type: Object, default: null },
  accountOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'submit'])

const type = ref(props.mode === 'edit' ? props.recordType : 'account')
const form = reactive({
  bank: props.initial?.bank || '',
  accountType: props.initial?.type || '입출금',
  balance: props.initial?.balance ?? 0,
  issuer: props.initial?.issuer || '',
  cardType: props.initial?.type || '신용카드',
  limit: props.initial?.limit ?? 0,
  usedAmount: props.initial?.usedAmount ?? 0,
  linkedAccountId: props.initial?.linkedAccountId || props.accountOptions[0]?.id || '',
  status: props.initial?.status || 'normal',
})

watch(() => props.recordType, (value) => {
  if (props.mode === 'edit') type.value = value
})

function submit() {
  if (type.value === 'account') {
    emit('submit', {
      type: 'account',
      payload: { bank: form.bank, type: form.accountType, balance: Number(form.balance), status: form.status },
    })
  } else {
    const linked = props.accountOptions.find((option) => option.id === form.linkedAccountId)
    emit('submit', {
      type: 'card',
      payload: {
        issuer: form.issuer,
        type: form.cardType,
        limit: Number(form.limit),
        usedAmount: Number(form.usedAmount),
        linkedAccountId: form.linkedAccountId,
        linkedAccountLabel: linked?.label || '',
        status: form.status,
      },
    })
  }
}
</script>

<template>
  <div class="finance-modal-backdrop">
    <div class="finance-modal">
      <h2>{{ mode === 'edit' ? '계좌·카드 수정' : '계좌·카드 등록' }}</h2>
      <p class="finance-modal__desc">Mock 계좌 또는 카드 정보를 {{ mode === 'edit' ? '수정하세요.' : '등록하세요.' }}</p>

      <div v-if="mode === 'create'" class="finance-modal__field">
        <label>등록 유형</label>
        <div class="finance-modal__toggle">
          <button type="button" :class="{ active: type === 'account' }" @click="type = 'account'">계좌</button>
          <button type="button" :class="{ active: type === 'card' }" @click="type = 'card'">카드</button>
        </div>
      </div>

      <template v-if="type === 'account'">
        <div class="finance-modal__field">
          <label>금융기관</label>
          <input v-model="form.bank" type="text" placeholder="예: KB국민은행" />
        </div>
        <div class="finance-modal__field">
          <label>계좌유형</label>
          <select v-model="form.accountType">
            <option value="입출금">입출금</option>
            <option value="예·적금">예·적금</option>
          </select>
        </div>
        <div class="finance-modal__field">
          <label>잔액</label>
          <div class="finance-modal__suffix-input">
            <input v-model.number="form.balance" type="number" placeholder="0" />
            <span>원</span>
          </div>
        </div>
        <div class="finance-modal__field">
          <label>상태</label>
          <select v-model="form.status">
            <option value="normal">정상</option>
            <option value="connected">연결됨</option>
          </select>
        </div>
      </template>

      <template v-else>
        <div class="finance-modal__field">
          <label>카드사</label>
          <input v-model="form.issuer" type="text" placeholder="예: 삼성카드" />
        </div>
        <div class="finance-modal__field">
          <label>카드유형</label>
          <select v-model="form.cardType">
            <option value="신용카드">신용카드</option>
            <option value="체크카드">체크카드</option>
          </select>
        </div>
        <div class="finance-modal__field">
          <label>한도</label>
          <div class="finance-modal__suffix-input">
            <input v-model.number="form.limit" type="number" placeholder="0" />
            <span>원</span>
          </div>
        </div>
        <div class="finance-modal__field">
          <label>연결계좌</label>
          <select v-model="form.linkedAccountId">
            <option v-for="option in accountOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
          </select>
        </div>
        <div class="finance-modal__field">
          <label>상태</label>
          <select v-model="form.status">
            <option value="normal">정상</option>
          </select>
        </div>
      </template>

      <div class="finance-modal__actions">
        <button type="button" class="ghost" @click="emit('close')">취소</button>
        <button type="button" class="primary" @click="submit">{{ mode === 'edit' ? '저장' : '등록' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.finance-modal-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
}

.finance-modal {
  width: 420px;
  padding: 28px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.finance-modal h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.finance-modal__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-small);
}

.finance-modal__field {
  margin-top: 18px;
}

.finance-modal__field label {
  display: block;
  margin-bottom: 8px;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.finance-modal__field input,
.finance-modal__field select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
}

.finance-modal__suffix-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.finance-modal__suffix-input input {
  flex: 1;
  padding: 10px 0;
  border: 0;
}

.finance-modal__suffix-input span {
  color: var(--muted);
  font-size: var(--font-small);
}

.finance-modal__toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.finance-modal__toggle button {
  flex: 1;
  padding: 10px;
  border: 0;
  background: var(--surface);
  color: var(--muted);
  font-size: var(--font-small);
  font-weight: 700;
}

.finance-modal__toggle button.active {
  background: var(--accent-strong);
  color: var(--text);
}

.finance-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.finance-modal__actions button {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.finance-modal__actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.finance-modal__actions .primary {
  background: var(--accent-strong);
  color: var(--text);
}
</style>
