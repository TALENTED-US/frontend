<script setup>
defineProps({
  message: { type: String, required: true },
})
const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <div class="finance-modal-backdrop">
    <div class="finance-confirm">
      <div class="finance-confirm__icon">!</div>
      <h2>이 항목을 삭제할까요?</h2>
      <p>{{ message }}</p>
      <p class="finance-confirm__warning">삭제하면 되돌릴 수 없어요.</p>
      <div class="finance-confirm__actions">
        <button type="button" class="ghost" @click="emit('close')">취소</button>
        <button type="button" class="danger" @click="emit('confirm')">삭제</button>
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

.finance-confirm {
  width: 380px;
  padding: 32px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
  text-align: center;
}

.finance-confirm__icon {
  display: grid;
  width: 44px;
  height: 44px;
  margin: 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  font-size: 22px;
  font-weight: 800;
}

.finance-confirm h2 {
  margin-top: 16px;
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.finance-confirm p {
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--font-small);
}

.finance-confirm__warning {
  color: #ef4444;
  font-weight: 700;
}

.finance-confirm__actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
}

.finance-confirm__actions button {
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
}

.finance-confirm__actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}

.finance-confirm__actions .danger {
  background: #ef4444;
  color: white;
}
</style>
