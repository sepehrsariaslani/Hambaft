<template>
  <button
    role="switch"
    :aria-checked="modelValue"
    class="relative w-12 h-7 rounded-full transition-colors duration-200"
    :class="modelValue ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-tertiary)]'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
      :class="{ 'translate-x-5': modelValue }"
    />
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>
