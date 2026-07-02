<template>
  <Teleport to="body">
    <!-- Backdrop overlay -->
    <div
      class="fixed inset-0 z-[var(--z-overlay)] transition-opacity duration-[var(--duration-normal)]"
      :class="modelValue ? 'opacity-100 bg-[var(--modal-bg)]' : 'opacity-0 bg-transparent pointer-events-none'"
      @click="closeOnBackdrop && $emit('update:modelValue', false)"
    />

    <!-- Bottom sheet -->
    <div
      class="fixed inset-x-0 bottom-0 z-[var(--z-modal)] max-h-[90vh] overflow-y-auto transition-transform duration-[var(--duration-normal)] rounded-t-[var(--radius-xl)]"
      :class="sheetClass"
      :style="sheetStyle"
    >
      <!-- Drag handle -->
      <div class="w-10 h-1 bg-white/20 rounded-full mx-auto mt-[var(--space-3)]" />

      <!-- Close button -->
      <button
        v-if="showClose"
        class="absolute top-[var(--space-4)] start-[var(--space-4)] flex items-center justify-center w-[var(--tap-target)] h-[var(--tap-target)] bg-transparent border-none cursor-pointer text-[var(--color-text-on-dark)] opacity-70 active:opacity-100"
        @click="$emit('update:modelValue', false)"
      >
        <slot name="close-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </slot>
      </button>

      <!-- Title -->
      <h2 v-if="title" class="text-[var(--text-xl)] font-bold text-[var(--color-text-on-dark)] text-center mt-[var(--space-3)] mb-[var(--space-4)]">
        {{ title }}
      </h2>

      <!-- Content -->
      <div class="px-[var(--modal-padding)] pb-[calc(var(--modal-padding)+env(safe-area-inset-bottom))] text-[var(--color-text-on-dark)]">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  showClose: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true }
})

defineEmits(['update:modelValue'])

const sheetClass = computed(() =>
  props.modelValue ? 'translate-y-0' : 'translate-y-full'
)

const sheetStyle = computed(() => ({
  backgroundColor: 'var(--modal-surface-bg)',
  paddingTop: 'var(--space-2)'
}))

// Lock body scroll when modal is open
watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
</script>
