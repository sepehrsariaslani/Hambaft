<template>
  <div class="rounded-2xl p-5 relative overflow-hidden" :style="{ background: gradient }">
    <div class="relative z-10">
      <p class="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">{{ tag }}</p>
      <p class="text-h2 font-display text-white leading-snug">{{ message }}</p>
      <p v-if="subtitle" class="text-sm text-white/70 mt-2">{{ subtitle }}</p>
    </div>
    <div class="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-white/10" />
    <div class="absolute -left-2 -bottom-2 w-20 h-20 rounded-full bg-white/5" />
  </div>
</template>

<script setup>
defineProps({
  tag: { type: String, default: '' },
  message: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  gradient: { type: String, default: 'linear-gradient(135deg, #D97706, #F59E0B)' },
})
</script>
