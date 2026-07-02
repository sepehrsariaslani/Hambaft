<template>
  <button
    class="fixed z-[var(--z-fab)] flex items-center justify-center border-none cursor-pointer transition-all duration-[var(--duration-fast)] active:scale-[0.9] rounded-[50%]"
    :class="sizeClass"
    :style="fabStyle"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** sm = 48px, md = 56px (default) */
  size: { type: String, default: 'md' }
})

defineEmits(['click'])

const sizeClass = computed(() => {
  return props.size === 'sm'
    ? 'w-12 h-12'
    : 'w-[var(--fab-size)] h-[var(--fab-size)]'
})

const fabStyle = computed(() => ({
  bottom: 'calc(var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom))',
  insetInlineEnd: 'var(--space-4)',
  backgroundColor: 'var(--color-pink)',
  color: 'var(--color-black)',
  boxShadow: 'var(--fab-shadow)'
}))
</script>
