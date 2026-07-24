<script setup>
import LoadingSpinner from './LoadingSpinner.vue'

defineProps({
  message: {
    type: String,
    default: '잠시만 기다려 주세요.',
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div
    class="page-loading"
    :class="{ 'page-loading--fullscreen': fullscreen }"
    aria-busy="true"
  >
    <LoadingSpinner size="lg" :label="message" />
    <p class="page-loading__message">{{ message }}</p>
  </div>
</template>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md, 16px);
  width: 100%;
  min-height: 240px;
  padding: var(--spacing-xl, 32px) var(--spacing-md, 16px);
  text-align: center;
}

.page-loading--fullscreen {
  min-height: 100dvh;
  background-color: var(--color-bg, #fff);
}

.page-loading__message {
  margin: 0;
  color: var(--color-text-secondary, #666);
  font-family: var(--font-family-base, 'Pretendard', sans-serif);
  font-size: var(--font-size-body-sm, 13px);
  line-height: 1.5;
}
</style>
