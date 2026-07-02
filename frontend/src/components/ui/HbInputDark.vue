<template>
  <div class="flex flex-col">
    <label
      v-if="label"
      :for="inputId"
      class="block text-[var(--text-sm)] font-medium text-white/60 mb-[var(--space-2)]"
    >
      {{ label }}
      <span v-if="required" class="text-[var(--color-error)] ms-[var(--space-0-5)]">*</span>
    </label>

    <div class="relative">
      <input
        v-if="!isTextarea"
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :dir="type === 'tel' || type === 'email' || type === 'url' ? 'ltr' : 'rtl'"
        class="w-full h-[var(--input-height)] px-[var(--input-padding-x)] border-none rounded-[var(--radius-md)] bg-white/8 text-[var(--color-text-on-dark)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-[var(--duration-fast)] focus:outline-none placeholder:text-white/40 disabled:opacity-50"
        :class="inputComputedClass"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />

      <textarea
        v-else
        :id="inputId"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :rows="rows"
        class="w-full min-h-[96px] px-[var(--input-padding-x)] py-[var(--space-3)] border-none rounded-[var(--radius-md)] bg-white/8 text-[var(--color-text-on-dark)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-[var(--duration-fast)] focus:outline-none resize-y placeholder:text-white/40 disabled:opacity-50"
        :class="inputComputedClass"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />
    </div>

    <p v-if="error" class="text-[var(--text-sm)] text-[var(--color-error)] mt-[var(--space-1)]" role="alert">
      {{ error }}
    </p>
    <p v-if="helper && !error" class="text-[var(--text-sm)] text-white/40 mt-[var(--space-1)]">
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
  helper: { type: String, default: '' },
  /** Multiline textarea */
  textarea: { type: Boolean, default: false },
  rows: { type: Number, default: 3 }
})

defineEmits(['update:modelValue', 'focus', 'blur'])

const inputId = `hb-input-dark-${useId()}`
const isTextarea = props.textarea || props.type === 'textarea'

const inputComputedClass = computed(() => {
  if (props.error) {
    return 'bg-[var(--input-error-bg)] shadow-[0_0_0_2px_var(--color-error)] focus:shadow-[0_0_0_3px_var(--input-error-ring)]'
  }
  return 'focus:bg-white/12 focus:shadow-[0_0_0_2px_white/20]'
})
</script>
