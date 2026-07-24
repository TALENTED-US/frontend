<script setup>
defineProps({
  tag: {
    type: String,
    default: 'section',
  },
  padding: {
    type: String,
    default: 'md',
    validator: (value) => ['none', 'sm', 'md', 'lg'].includes(value),
  },
  interactive: {
    type: Boolean,
    default: false,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <component
    :is="tag"
    class="base-card"
    :class="[
      `base-card--padding-${padding}`,
      { 'base-card--interactive': interactive, 'base-card--selected': selected },
    ]"
  >
    <header v-if="$slots.header" class="base-card__header">
      <slot name="header" />
    </header>
    <div class="base-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped>
.base-card {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.base-card--padding-sm {
  padding: var(--spacing-sm);
}

.base-card--padding-md {
  padding: var(--spacing-md);
}

.base-card--padding-lg {
  padding: var(--spacing-lg);
}

.base-card--interactive {
  cursor: pointer;
}

.base-card--interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgb(15 23 42 / 10%);
}

.base-card--selected {
  border-color: var(--color-primary);
}

.base-card__header {
  margin-bottom: var(--spacing-md);
}

.base-card__footer {
  margin-top: var(--spacing-md);
}
</style>
