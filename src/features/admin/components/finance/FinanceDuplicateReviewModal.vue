<script setup>
const props = defineProps({
  transaction: { type: Object, required: true },
})
const emit = defineEmits(['close', 'allow', 'duplicate'])

function describe(record) {
  return `${record.merchant} · ${record.amount.toLocaleString()}원 · ${record.date} · ${record.transactionKey}`
}
</script>

<template>
  <div class="finance-modal-backdrop">
    <div class="finance-modal finance-modal--wide">
      <h2>중복 거래 검수</h2>
      <p class="finance-modal__desc">
        동일 거래 고유값(Transaction ID)이 감지되었어요. 두 거래를 비교해 처리해 주세요.
      </p>

      <p class="finance-modal__label">기존 등록 거래</p>
      <p class="finance-modal__record">{{ describe(transaction.duplicateOf) }}</p>

      <hr />

      <p class="finance-modal__label">신규 감지 거래</p>
      <p class="finance-modal__record">{{ describe(transaction) }}</p>

      <p class="finance-modal__hint">두 거래의 고유값이 동일합니다. 중복 여부를 확인해 주세요.</p>

      <div class="finance-modal__actions">
        <button type="button" class="ghost" @click="emit('allow')">등록 허용</button>
        <button type="button" class="danger" @click="emit('duplicate')">중복 처리</button>
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

.finance-modal--wide {
  width: 520px;
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

.finance-modal__label {
  margin-top: 20px;
  color: var(--subtle);
  font-size: var(--font-caption);
}

.finance-modal__record {
  margin-top: 6px;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
}

hr {
  margin-top: 16px;
  border: 0;
  border-top: 1px solid var(--border);
}

.finance-modal__hint {
  margin-top: 18px;
  color: #f59e0b;
  font-size: var(--font-small);
  font-weight: 700;
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

.finance-modal__actions .danger {
  background: #ef4444;
  color: white;
}
</style>
