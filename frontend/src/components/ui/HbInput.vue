<template>
  <div class="flex flex-col">
    <!-- Label -->
    <label
      v-if="label"
      :for="inputId"
      class="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-[var(--space-2)]"
    >
      {{ label }}
      <span v-if="required" class="text-[var(--color-error)] ms-[var(--space-0-5)]">*</span>
    </label>

    <!-- Input wrapper -->
    <div class="relative">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :dir="type === 'tel' || type === 'email' || type === 'url' ? 'ltr' : 'rtl'"
        class="w-full h-[var(--input-height)] px-[var(--input-padding-x)] border-[1.5px] rounded-[var(--radius-md)] bg-[var(--input-bg)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-[var(--duration-fast)] focus:outline-none placeholder:text-[var(--color-text-placeholder)] disabled:opacity-50 disabled:bg-[var(--color-surface-secondary)]"
        :class="inputComputedClass"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />

      <!-- Inline start icon slot -->
      <span v-if="$slots['start-icon']" class="absolute start-[var(--space-3)] top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]">
        <slot name="start-icon" />
      </span>

      <!-- Inline end icon slot -->
      <span v-if="$slots['end-icon']" class="absolute end-[var(--space-3)] top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]">
        <slot name="end-icon" />
      </span>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-[var(--text-sm)] text-[var(--color-error)] mt-[var(--space-1)]" role="alert">
      {{ error }}
    </p>

    <!-- Helper text (only when no error) -->
    <p v-if="helper && !error" class="text-[var(--text-sm)] text-[var(--color-text-placeholder)] mt-[var(--space-1)]">
      {{ helper }}
    </p>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  helper: { type: String, default: '' }
})

defineEmits(['update:modelValue', 'focus', 'blur'])

// Unique ID for label association
const inputId = `hb-input-${useId()}`

const inputComputedClass = computed(() => {
  if (props.error) {
    return 'border-[var(--color-error)] bg-[var(--input-error-bg)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_3px_var(--input-error-ring)]'
  }
  return 'border-[var(--color-border)] focus:border-[var(--color-text-secondary)] focus:shadow-[0_0_0_3px_var(--input-focus-ring)]'
})
</script>
