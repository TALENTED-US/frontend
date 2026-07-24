<script setup>
defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value),
  },
  block: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

function handleClick(event) {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    v-bind="$attrs"
    :type="type"
    class="base-button"
    :class="[
      `base-button--${variant}`,
      `base-button--${size}`,
      { 'base-button--block': block, 'base-button--loading': loading },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading"
    @click="handleClick"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <span class="base-button__content" :class="{ 'sr-only': loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  min-width: 44px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.base-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.base-button:active:not(:disabled) {
  transform: translateY(0);
}

.base-button:disabled {
  opacity: 0.5;
}

.base-button--sm {
  min-height: 36px;
  padding: 0 14px;
  font-size: var(--font-size-caption);
}

.base-button--md {
  min-height: var(--size-button-height);
  padding: 0 20px;
  font-size: 14px;
}

.base-button--lg {
  min-height: 52px;
  padding: 0 24px;
  font-size: var(--font-size-body);
}

.base-button--block {
  width: 100%;
}

.base-button--primary {
  color: var(--color-text-body);
  background: var(--color-accent);
  box-shadow: var(--shadow-button);
}

.base-button--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.base-button--secondary {
  color: var(--color-text-white);
  background: var(--color-primary);
}

.base-button--outline {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-surface);
}

.base-button--ghost {
  color: var(--color-primary);
  background: transparent;
}

.base-button--danger {
  color: var(--color-text-white);
  background: var(--color-error);
}

.base-button--loading {
  cursor: wait;
}

.base-button__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentcolor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: base-button-spin 0.7s linear infinite;
}

.base-button__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
