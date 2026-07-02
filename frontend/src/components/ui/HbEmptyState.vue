<template>
  <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div class="w-20 h-20 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center mb-4">
      <component
        :is="icon"
        v-if="icon && typeof icon !== 'string'"
        :size="32"
        :stroke-width="2"
        class="text-[var(--color-text-secondary)]"
      />
      <span v-else-if="icon" class="text-3xl">{{ icon }}</span>
    </div>
    <h3 class="text-h3 font-heading text-[var(--color-text)] mb-2">{{ title }}</h3>
    <p class="text-sm text-[var(--color-text-secondary)] max-w-xs mb-4">{{ description }}</p>
    <slot name="action">
      <HbButton v-if="actionLabel" @click="$emit('action')">{{ actionLabel }}</HbButton>
    </slot>
  </div>
</template>

<script setup>
import HbButton from './HbButton.vue'

defineProps({
  icon: { type: [String, Object, Function], default: null },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
})

defineEmits(['action'])
</script>
