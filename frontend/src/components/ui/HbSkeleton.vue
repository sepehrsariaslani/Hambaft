<template>
  <div :class="skeletonClass" :style="style">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'text',  // text | circle | card | rectangular
    validator: (v) => ['text', 'circle', 'card', 'rectangular', 'rounded'].includes(v)
  },
  width: { type: [String, Number], default: null },
  height: { type: [String, Number], default: null },
  lines: { type: Number, default: 1 },  // for text variant
  class: { type: String, default: '' }
})

const skeletonClass = computed(() => {
  let cls = 'animate-pulse bg-[var(--color-surface-secondary)]'

  switch (props.variant) {
    case 'circle':
      cls += ' rounded-full'
      break
    case 'card':
      cls += ' rounded-[var(--radius-lg)]'
      break
    case 'rounded':
      cls += ' rounded-[var(--radius-md)]'
      break
    default:
      cls += ' rounded-[var(--radius-sm)]'
  }

  if (props.class) cls += ` ${props.class}`
  return cls
})

const style = computed(() => {
  const s = {}
  if (props.width) s.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  if (props.height) s.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  return s
})
</script>
