<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEscape: {
    type: Boolean,
    default: true,
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close', 'opened'])

const dialogRef = ref(null)
let previousOverflow = ''

const titleId = computed(() => (props.title ? 'buttie-modal-title' : undefined))

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdrop() {
  if (props.closeOnBackdrop) close()
}

function handleKeydown(event) {
  if (event.key === 'Escape' && props.closeOnEscape) close()
}

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeydown)
      await nextTick()
      dialogRef.value?.focus()
      emit('opened')
      return
    }

    document.body.style.overflow = previousOverflow
    window.removeEventListener('keydown', handleKeydown)
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="base-modal" role="presentation" @click.self="handleBackdrop">
        <section
          ref="dialogRef"
          class="base-modal__dialog"
          :class="`base-modal__dialog--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
        >
          <header v-if="title || $slots.header || showCloseButton" class="base-modal__header">
            <slot name="header">
              <h2 v-if="title" :id="titleId" class="base-modal__title">{{ title }}</h2>
            </slot>
            <button
              v-if="showCloseButton"
              class="base-modal__close"
              type="button"
              aria-label="모달 닫기"
              @click="close"
            >
              ×
            </button>
          </header>

          <div class="base-modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal {
  position: fixed;
  z-index: var(--z-index-modal);
  inset: 0;
  display: grid;
  place-items: end center;
  padding-top: var(--spacing-lg);
  background: var(--color-overlay);
}

.base-modal__dialog {
  width: 100%;
  max-height: calc(100vh - 24px);
  overflow: auto;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-modal);
  outline: none;
}

.base-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
}

.base-modal__title {
  color: var(--color-primary);
  font-size: var(--font-size-title-sm);
}

.base-modal__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-size: 28px;
  line-height: 1;
}

.base-modal__close:hover {
  background: var(--color-bg-subtle);
}

.base-modal__body {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.base-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-base);
}

.modal-fade-enter-active .base-modal__dialog,
.modal-fade-leave-active .base-modal__dialog {
  transition: transform var(--transition-base);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .base-modal__dialog,
.modal-fade-leave-to .base-modal__dialog {
  transform: translateY(24px);
}

@media (min-width: 768px) {
  .base-modal {
    place-items: center;
    padding: var(--spacing-lg);
  }

  .base-modal__dialog {
    border-radius: var(--radius-lg);
  }

  .base-modal__dialog--sm {
    max-width: 400px;
  }

  .base-modal__dialog--md {
    max-width: 560px;
  }

  .base-modal__dialog--lg {
    max-width: 760px;
  }
}
</style>
