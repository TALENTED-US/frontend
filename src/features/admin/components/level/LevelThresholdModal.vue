<script setup>
import { reactive } from 'vue'

const props = defineProps({
  levels: { type: Array, required: true },
})
const emit = defineEmits(['close', 'save'])

const form = reactive({
  values: props.levels.filter((item) => item.level > 1).map((item) => ({ level: item.level, exp: item.exp })),
})

function save() {
  emit('save', [{ level: 1, exp: 0 }, ...form.values])
}
</script>

<template>
  <div class="finance-modal-backdrop">
    <div class="finance-modal">
      <h2>레벨 승급 기준 수정</h2>
      <p class="finance-modal__desc">EXP 값을 눌러 레벨별 필요 누적 경험치를 바꾸세요.</p>

      <div class="level-threshold__rows">
        <label v-for="row in form.values" :key="row.level" class="level-threshold__row">
          <span>LEVEL {{ row.level }}</span>
          <span class="level-threshold__input">
            <input v-model.number="row.exp" type="number" min="0" />
            <span>EXP</span>
          </span>
        </label>
      </div>

      <div class="level-threshold__warning">
        <p>저장 후 즉시 신규 승급 기준에 반영돼요.</p>
        <small>이미 해당 레벨에 도달한 사용자에게는 소급 적용되지 않아요.</small>
      </div>

      <div class="finance-modal__actions">
        <button type="button" class="ghost" @click="emit('close')">취소</button>
        <button type="button" class="primary" @click="save">기준 저장</button>
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

.level-threshold__rows {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.level-threshold__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.level-threshold__input {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.level-threshold__input input {
  width: 70px;
  border: 0;
  text-align: right;
  font-size: var(--font-small);
  font-weight: 700;
}

.level-threshold__input span {
  color: var(--muted);
  font-size: var(--font-caption);
  font-weight: 400;
}

.level-threshold__warning {
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  background: #fef2f2;
}

.level-threshold__warning p {
  color: #b91c1c;
  font-size: var(--font-caption);
  font-weight: 700;
}

.level-threshold__warning small {
  display: block;
  margin-top: 2px;
  color: #991b1b;
  font-size: 10px;
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
