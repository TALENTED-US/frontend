<script setup>
import BaseButton from '../common/BaseButton.vue'

defineProps({
  title: {
    type: String,
    default: '표시할 내용이 없어요.',
  },
  description: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['action'])
</script>

<template>
  <section class="empty-state" role="status" aria-live="polite">
    <div class="empty-state__icon" aria-hidden="true">
      <slot name="icon">
        <svg viewBox="0 0 64 64" fill="none">
          <path
            d="M12 22a6 6 0 0 1 6-6h28a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V22Z"
            fill="currentColor"
            opacity=".12"
          />
          <path
            d="M12 28h13l4 6h6l4-6h13M22 16v-3a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v3"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </slot>
    </div>

    <div class="empty-state__content">
      <h2 class="empty-state__title">{{ title }}</h2>
      <p v-if="description" class="empty-state__description">{{ description }}</p>
    </div>

    <div v-if="actionLabel || $slots.actions" class="empty-state__actions">
      <slot name="actions">
        <BaseButton variant="outline" @click="emit('action')">
          {{ actionLabel }}
        </BaseButton>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.empty-state {
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

.empty-state__icon {
  width: 64px;
  height: 64px;
  color: var(--color-accent-blue, #93b2f8);
}

.empty-state__icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.empty-state__content {
  display: grid;
  gap: var(--spacing-sm, 8px);
  max-width: 320px;
}

.empty-state__title,
.empty-state__description {
  margin: 0;
  font-family: var(--font-family-base, 'Pretendard', sans-serif);
}

.empty-state__title {
  color: var(--color-text-body, #222);
  font-size: var(--font-size-title-sm, 18px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.4;
}

.empty-state__description {
  color: var(--color-text-secondary, #666);
  font-size: var(--font-size-body-sm, 13px);
  line-height: 1.6;
  white-space: pre-line;
}

.empty-state__actions {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-sm, 8px);
}
</style>
