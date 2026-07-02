<template>
  <div class="w-full">
    <div class="h-2 rounded-full bg-[var(--color-surface-tertiary)] overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :style="{ width: `${Math.min(Math.max(progress, 0), 100)}%`, backgroundColor: barColor }"
      />
    </div>
    <div v-if="showLabel" class="flex justify-between mt-1">
      <span class="text-xs text-[var(--color-text-tertiary)]">{{ label }}</span>
      <span class="text-xs font-medium" :style="{ color: barColor }">{{ toPersianDigits(Math.round(progress)) }}%</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { toPersianDigits } from '@/utils/jalali'

const props = defineProps({
  progress: { type: Number, default: 0 },
  label: { type: String, default: '' },
  showLabel: { type: Boolean, default: false },
  warningThreshold: { type: Number, default: 70 },
  dangerThreshold: { type: Number, default: 80 },
})

const barColor = computed(() => {
  const p = props.progress
  if (p >= 100) return 'var(--color-error)'
  if (p >= props.dangerThreshold) return 'var(--color-error)'
  if (p >= props.warningThreshold) return 'var(--color-yellow)'
  return 'var(--color-success)'
})
</script>
