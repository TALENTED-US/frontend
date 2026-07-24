<script setup>
import BaseButton from '../common/BaseButton.vue'

defineProps({
  title: {
    type: String,
    default: '문제가 발생했어요.',
  },
  description: {
    type: String,
    default: '잠시 후 다시 시도해 주세요.',
  },
  retryLabel: {
    type: String,
    default: '다시 시도',
  },
  showRetry: {
    type: Boolean,
    default: true,
  },
  errorCode: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <section class="error-state" role="alert">
    <div class="error-state__icon" aria-hidden="true">
      <slot name="icon">
        <svg viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="24" fill="currentColor" opacity=".12" />
          <path
            d="M32 18v18M32 45h.01"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
          />
        </svg>
      </slot>
    </div>

    <div class="error-state__content">
      <h2 class="error-state__title">{{ title }}</h2>
      <p v-if="description" class="error-state__description">{{ description }}</p>
      <p v-if="errorCode" class="error-state__code">오류 코드: {{ errorCode }}</p>
    </div>

    <div v-if="showRetry || $slots.actions" class="error-state__actions">
      <slot name="actions">
        <BaseButton v-if="showRetry" @click="emit('retry')">
          {{ retryLabel }}
        </BaseButton>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.error-state {
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

.error-state__icon {
  width: 64px;
  height: 64px;
  color: var(--color-error, #d32f2f);
}

.error-state__icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.error-state__content {
  display: grid;
  gap: var(--spacing-sm, 8px);
  max-width: 320px;
}

.error-state__title,
.error-state__description,
.error-state__code {
  margin: 0;
  font-family: var(--font-family-base, 'Pretendard', sans-serif);
}

.error-state__title {
  color: var(--color-text-body, #222);
  font-size: var(--font-size-title-sm, 18px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.4;
}

.error-state__description {
  color: var(--color-text-secondary, #666);
  font-size: var(--font-size-body-sm, 13px);
  line-height: 1.6;
  white-space: pre-line;
}

.error-state__code {
  color: var(--color-text-placeholder, #999);
  font-size: var(--font-size-caption, 12px);
}

.error-state__actions {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-sm, 8px);
}
</style>
