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
        :type="showPassword ? 'text' : 'password'"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        dir="ltr"
        class="w-full h-[var(--input-height)] ps-[var(--input-padding-x)] pe-[calc(var(--input-padding-x)+2.5rem)] border-[1.5px] rounded-[var(--radius-md)] bg-[var(--input-bg)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-[var(--duration-fast)] focus:outline-none placeholder:text-[var(--color-text-placeholder)] disabled:opacity-50 disabled:bg-[var(--color-surface-secondary)] text-left
        :class="error ? 'border-[var(--color-error)] bg-[var(--input-error-bg)] focus:border-[var(--color-error)] focus:shadow-[0_0_0_3px_var(--input-error-ring)]' : 'border-[var(--color-border)] focus:border-[var(--color-text-secondary)] focus:shadow-[0_0_0_3px_var(--input-focus-ring)]'"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />

      <!-- Toggle visibility button -->
      <button
        v-if="toggleable"
        type="button"
        class="absolute end-[var(--space-3)] top-1/2 -translate-y-1/2 p-[var(--space-1)] bg-transparent border-none cursor-pointer text-[var(--color-text-placeholder)] active:text-[var(--color-text-secondary)] min-w-[var(--tap-target)] min-h-[var(--tap-target)] flex items-center justify-center"
        :aria-label="showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      >
        <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      </button>
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
import { ref, useId } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  helper: { type: String, default: '' },
  autocomplete: { type: String, default: 'current-password' },
  toggleable: { type: Boolean, default: true }
})

defineEmits(['update:modelValue', 'focus', 'blur'])

const inputId = `hb-password-${useId()}`
const showPassword = ref(false)
</script>
