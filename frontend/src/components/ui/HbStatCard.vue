<template>
  <div class="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)]">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ backgroundColor: iconBg }">
        <span class="text-sm">{{ icon }}</span>
      </div>
      <span class="text-sm text-[var(--color-text-secondary)]">{{ label }}</span>
    </div>
    <p class="text-h1 font-display text-[var(--color-text)]">{{ value }}</p>
    <p v-if="subtitle" class="text-xs text-[var(--color-text-tertiary)] mt-1">{{ subtitle }}</p>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' },
  iconBg: { type: String, default: 'var(--color-surface-secondary)' },
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
  subtitle: { type: String, default: '' },
})
</script>
