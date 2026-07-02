<template>
  <div class="relative inline-flex items-center justify-center">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="size/2" :cy="size/2" :r="radius"
        fill="none"
        stroke="var(--color-surface-tertiary)"
        :stroke-width="strokeWidth"
      />
      <circle
        :cx="size/2" :cy="size/2" :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="circumference - (progress / 100) * circumference"
        class="transition-all duration-500 ease-out"
      />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  progress: { type: Number, default: 0 },
  size: { type: Number, default: 64 },
  strokeWidth: { type: Number, default: 6 },
  color: { type: String, default: 'var(--color-accent)' },
})

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
</script>
