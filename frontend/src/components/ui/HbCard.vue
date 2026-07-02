<template>
  <div
    :class="cardClass"
    :style="{ '--card-accent': accentColor }"
  >
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** Visual variant */
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'accent', 'flat', 'elevated'].includes(v)
  },
  /** Accent color for the inline-start border (any CSS color value) */
  accentColor: {
    type: String,
    default: 'var(--color-pink)'
  },
  /** Enable press interaction (scale + shadow change) */
  interactive: {
    type: Boolean,
    default: false
  },
  /** Flat: no shadow, secondary background */
  flat: {
    type: Boolean,
    default: false
  },
  /** Padding override */
  padding: {
    type: String,
    default: ''
  },
  /** Extra classes */
  class: {
    type: String,
    default: ''
  }
})

const cardClass = computed(() => {
  // Base card: white bg, lg radius, sm shadow
  let cls = 'relative bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-[var(--card-padding)] transition-all duration-[var(--duration-fast)]'

  if (props.variant === 'flat') {
    cls = 'relative bg-[var(--color-surface-secondary)] rounded-[var(--radius-lg)] p-[var(--card-padding)] transition-all duration-[var(--duration-fast)]'
  }

  if (props.variant === 'elevated') {
    cls = 'relative bg-[var(--color-surface-elevated)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] p-[var(--card-padding)] transition-all duration-[var(--duration-fast)]'
  }

  // Accent bar on inline-start
  if (props.variant === 'accent') {
    cls += ' border-s-[3px] border-s-[var(--card-accent)]'
  }

  // Interactive: scale on active
  if (props.interactive) {
    cls += ' cursor-pointer active:scale-[0.98] active:shadow-[var(--shadow-xs)]'
  }

  if (props.padding) {
    cls += ` ${props.padding}`
  }

  if (props.class) {
    cls += ` ${props.class}`
  }

  return cls
})
</script>
