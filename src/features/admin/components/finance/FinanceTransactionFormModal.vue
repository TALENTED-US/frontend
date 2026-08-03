<script setup>
import { reactive } from 'vue'

const props = defineProps({
  mode: { type: String, required: true }, // 'create' | 'edit'
  initial: { type: Object, default: null },
})
const emit = defineEmits(['close', 'submit'])

const form = reactive({
  date: props.initial?.date || new Date().toISOString().slice(0, 10),
  merchant: props.initial?.merchant || '',
  kind: props.initial?.kind || 'expense',
  amount: props.initial ? Math.abs(props.initial.amount) : 0,
})

function submit() {
  const signedAmount = form.kind === 'expense' ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount))
  emit('submit', {
    date: form.date,
    merchant: form.merchant,
    kind: form.kind,
    amount: signedAmount,
    category: props.initial?.category || '기타',
  })
}
</script>

<template>
  <div class="finance-modal-backdrop">
    <div class="finance-modal">
      <h2>거래 {{ mode === 'edit' ? '수정' : '등록' }}</h2>
      <p class="finance-modal__desc">Mock 거래 내역을 {{ mode === 'edit' ? '수정하세요.' : '등록하세요.' }}</p>

      <div class="finance-modal__field">
        <label>거래일시</label>
        <input v-model="form.date" type="date" />
      </div>
      <div class="finance-modal__field">
        <label>거래처</label>
        <input v-model="form.merchant" type="text" placeholder="예: 스타벅스" />
      </div>
      <div class="finance-modal__field">
        <label>유형</label>
        <select v-model="form.kind">
          <option value="income">수입</option>
          <option value="expense">지출</option>
        </select>
      </div>
      <div class="finance-modal__field">
        <label>금액</label>
        <div class="finance-modal__suffix-input">
          <input v-model.number="form.amount" type="number" placeholder="0" />
          <span>원</span>
        </div>
      </div>
      <p class="finance-modal__hint">동일 거래 고유값이 감지되면 자동으로 중복 검수 상태로 등록됩니다.</p>

      <div class="finance-modal__actions">
        <button type="button" class="ghost" @click="emit('close')">취소</button>
        <button type="button" class="primary" @click="submit">거래 {{ mode === 'edit' ? '저장' : '등록' }}</button>
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

.finance-modal__hint {
  margin-top: 12px;
  color: #f59e0b;
  font-size: var(--font-caption);
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
