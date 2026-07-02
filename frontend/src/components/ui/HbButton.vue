<template>
  <button
    :class="btnClass"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot v-else />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** primary | secondary | ghost | danger */
  variant: { type: String, default: 'primary' },
  /** sm | md | lg */
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** Full width */
  block: { type: Boolean, default: false }
})

defineEmits(['click'])

const btnClass = computed(() => {
  // Base: pill shape, flex center, bold, transition
  let cls = 'inline-flex items-center justify-center gap-[var(--space-2)] border-none font-bold font-[var(--font-family-primary)] rounded-[var(--radius-full)] transition-all duration-[var(--duration-fast)] active:scale-[0.97] min-h-[var(--tap-target)] disabled:opacity-35 disabled:pointer-events-none'

  // Size variants
  const sizes = {
    sm: 'h-[var(--button-height-sm)] px-[var(--space-4)] text-[var(--text-sm)]',
    md: 'h-[var(--button-height-md)] px-[var(--button-padding-x)] text-[var(--text-base)]',
    lg: 'h-[var(--button-height-lg)] px-[var(--space-6)] text-[var(--text-md)]'
  }
  cls += ` ${sizes[props.size] || sizes.md}`

  // Color variants
  const variants = {
    primary: 'bg-[var(--color-black)] text-[var(--color-text-on-dark)] shadow-[var(--shadow-xs)] active:bg-[#2A2A2A]',
    secondary: 'bg-transparent border-[1.5px] border-[var(--color-border)] text-[var(--color-text-secondary)] active:bg-[var(--color-divider)]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] active:bg-[var(--color-divider)]',
    danger: 'bg-[var(--color-error)] text-[var(--color-text-on-dark)] shadow-[var(--shadow-xs)]',
    pink: 'bg-[var(--color-pink)] text-[var(--color-black)] shadow-[var(--shadow-xs)]'
  }
  cls += ` ${variants[props.variant] || variants.primary}`

  if (props.block) cls += ' w-full'

  return cls
})
</script>
