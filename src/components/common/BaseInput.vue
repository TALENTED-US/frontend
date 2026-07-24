<script setup>
import { computed, useId } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  name: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  autocomplete: {
    type: String,
    default: 'off',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'focus', 'blur'])

const generatedId = useId()
const inputId = computed(() => props.id || `buttie-input-${generatedId}`)
const describedBy = computed(() => {
  if (props.error) return `${inputId.value}-error`
  if (props.hint) return `${inputId.value}-hint`
  return undefined
})

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="base-input" :class="{ 'base-input--error': error, 'base-input--disabled': disabled }">
    <label v-if="label" class="base-input__label" :for="inputId">
      {{ label }}
      <span v-if="required" class="base-input__required" aria-hidden="true">*</span>
    </label>

    <div class="base-input__control">
      <span v-if="$slots.prefix" class="base-input__affix">
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        v-bind="$attrs"
        class="base-input__field"
        :value="modelValue"
        :type="type"
        :name="name"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        @input="handleInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />

      <span v-if="$slots.suffix" class="base-input__affix">
        <slot name="suffix" />
      </span>
    </div>

    <p v-if="error" :id="`${inputId}-error`" class="base-input__message base-input__message--error">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="base-input__message">
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
.base-input {
  display: grid;
  gap: 7px;
  width: 100%;
}

.base-input__label {
  color: var(--color-primary);
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.base-input__required {
  color: var(--color-primary);
}

.base-input__control {
  display: flex;
  align-items: center;
  min-height: var(--size-input-height);
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--color-accent) 38%, var(--color-bg));
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
}

.base-input__control:focus-within {
  border-color: var(--color-accent-blue);
  box-shadow: 0 0 0 3px rgb(147 178 248 / 20%);
  background: var(--color-surface);
}

.base-input__field {
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0 var(--spacing-md);
  border: 0;
  outline: none;
  color: var(--color-text-body);
  background: transparent;
  font-size: 14px;
}

.base-input__field::placeholder {
  color: var(--color-text-placeholder);
  opacity: 1;
}

.base-input__affix {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding-inline: 14px;
  color: var(--color-text-secondary);
}

.base-input__message {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}

.base-input__message--error,
.base-input--error .base-input__label {
  color: var(--color-error);
}

.base-input--error .base-input__control {
  border-color: var(--color-error);
}

.base-input--disabled {
  opacity: 0.55;
}
</style>
