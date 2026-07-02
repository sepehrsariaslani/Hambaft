<template>
  <span
    :class="chipClass"
    :style="chipStyle"
    @click="selectable && $emit('click', $event)"
  >
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** default | active | pastel */
  variant: { type: String, default: 'default' },
  /** Pastel color name for pastel variant: pink | yellow | olive | ice-blue | purple */
  pastel: { type: String, default: 'pink' },
  /** Enable click */
  selectable: { type: Boolean, default: false },
  dot: { type: Boolean, default: false }
})

defineEmits(['click'])

const pastelColors = {
  pink: { bg: 'rgba(244,168,211,0.15)', border: 'rgba(244,168,211,0.3)', text: 'var(--color-text-primary)' },
  yellow: { bg: 'rgba(247,217,87,0.15)', border: 'rgba(247,217,87,0.3)', text: 'var(--color-text-primary)' },
  olive: { bg: 'rgba(184,201,122,0.15)', border: 'rgba(184,201,122,0.3)', text: 'var(--color-text-primary)' },
  'ice-blue': { bg: 'rgba(175,199,235,0.15)', border: 'rgba(175,199,235,0.3)', text: 'var(--color-text-primary)' },
  purple: { bg: 'rgba(205,184,240,0.15)', border: 'rgba(205,184,240,0.3)', text: 'var(--color-text-primary)' }
}

const chipClass = computed(() => {
  let cls = 'inline-flex items-center justify-center h-8 px-[var(--space-3)] rounded-[var(--radius-full)] text-[var(--text-sm)] font-medium font-[var(--font-family-primary)] transition-all duration-[var(--duration-fast)] min-w-[var(--tap-target)] gap-[var(--space-1)]'

  if (props.selectable) cls += ' cursor-pointer active:scale-95'

  return cls
})

const chipStyle = computed(() => {
  if (props.variant === 'active') {
    return {
      backgroundColor: 'var(--color-black)',
      color: 'var(--color-text-on-dark)',
      border: 'none'
    }
  }

  if (props.variant === 'pastel') {
    const colors = pastelColors[props.pastel] || pastelColors.pink
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`
    }
  }

  // default
  return {
    backgroundColor: 'var(--color-divider)',
    color: 'var(--color-text-secondary)',
    border: 'none'
  }
})
</script>
