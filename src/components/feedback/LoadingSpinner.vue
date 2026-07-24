<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  label: {
    type: String,
    default: '불러오는 중입니다.',
  },
})
</script>

<template>
  <span
    class="loading-spinner"
    :class="`loading-spinner--${size}`"
    role="status"
    aria-live="polite"
  >
    <span class="loading-spinner__circle" aria-hidden="true" />
    <span class="loading-spinner__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner__circle {
  width: 100%;
  height: 100%;
  border: 3px solid rgb(147 178 248 / 30%);
  border-top-color: var(--color-primary, #0a1680);
  border-radius: 50%;
  animation: loading-spinner-rotate 0.8s linear infinite;
}

.loading-spinner--sm {
  width: 20px;
  height: 20px;
}

.loading-spinner--md {
  width: 32px;
  height: 32px;
}

.loading-spinner--lg {
  width: 48px;
  height: 48px;
}

.loading-spinner__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes loading-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner__circle {
    animation-duration: 1.6s;
  }
}
</style>
