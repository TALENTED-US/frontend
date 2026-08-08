<script setup>
import { reactive } from 'vue'

const props = defineProps({
  mode: { type: String, required: true }, // 'grant' | 'revoke'
  prefill: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'submit'])

const form = reactive({
  member: props.prefill.member ?? '',
  exp: props.prefill.exp ?? 0,
  reason: props.prefill.reason ?? '',
})

function submit() {
  emit('submit', { member: form.member, exp: form.exp, reason: form.reason })
}
</script>

<template>
  <div class="finance-modal-backdrop">
    <div class="finance-modal">
      <h2>{{ mode === 'grant' ? '수동 EXP 지급' : '수동 EXP 회수' }}</h2>
      <p class="finance-modal__desc">
        {{ mode === 'grant' ? '지급 오류가 확인된 회원에게 EXP를 직접 지급하세요.' : '지급 오류가 확인된 회원의 EXP를 직접 회수하세요.' }}
      </p>

      <div class="finance-modal__field">
        <label>회원 ID · 닉네임</label>
        <input v-model="form.member" type="text" placeholder="예: jijun01 · 김재준" />
      </div>
      <div class="finance-modal__field">
        <label>EXP</label>
        <input v-model.number="form.exp" type="number" min="0" placeholder="0" />
      </div>
      <div class="finance-modal__field">
        <label>사유</label>
        <input v-model="form.reason" type="text" placeholder="사유를 입력하세요." />
      </div>

      <div class="finance-modal__actions">
        <button type="button" class="ghost" @click="emit('close')">취소</button>
        <button type="button" :class="mode === 'grant' ? 'grant' : 'revoke'" @click="submit">
          {{ mode === 'grant' ? '지급하기' : '회수하기' }}
        </button>
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
  width: 380px;
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

.finance-modal__field input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
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

.finance-modal__actions .grant {
  background: #3b82f6;
  color: white;
}

.finance-modal__actions .revoke {
  background: #ef4444;
  color: white;
}
</style>
