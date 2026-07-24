<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'change'])

const generatedId = useId()
const checkboxId = computed(() => props.id || `buttie-checkbox-${generatedId}`)

function handleChange(event) {
  emit('update:modelValue', event.target.checked)
  emit('change', event.target.checked)
}
</script>

<template>
  <label class="base-checkbox" :class="{ 'base-checkbox--disabled': disabled }" :for="checkboxId">
    <input
      :id="checkboxId"
      class="base-checkbox__native"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    />
    <span class="base-checkbox__box" aria-hidden="true">
      <span class="base-checkbox__check">✓</span>
    </span>
    <span v-if="label || $slots.default" class="base-checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 24px;
  color: var(--color-text-body);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.base-checkbox__native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.base-checkbox__box {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: 5px;
  background: var(--color-surface);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.base-checkbox__check {
  color: var(--color-text-white);
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.base-checkbox__native:checked + .base-checkbox__box {
  border-color: var(--color-primary);
  background: var(--color-primary);
}

.base-checkbox__native:checked + .base-checkbox__box .base-checkbox__check {
  opacity: 1;
  transform: scale(1);
}

.base-checkbox__native:focus-visible + .base-checkbox__box {
  box-shadow: 0 0 0 3px rgb(147 178 248 / 35%);
}

.base-checkbox--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
