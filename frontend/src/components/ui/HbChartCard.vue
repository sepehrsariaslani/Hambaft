<template>
  <HbCard :accent-color="accentColor" class="mb-[var(--space-4)]">
    <div class="flex items-center gap-[var(--space-2)] mb-[var(--space-1)]">
      <span v-if="icon" class="text-lg" aria-hidden="true">{{ icon }}</span>
      <h3 class="text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] m-0">
        {{ title }}
      </h3>
    </div>
    <p v-if="subtitle" class="text-[var(--text-sm)] text-[var(--color-text-secondary)] m-0">
      {{ subtitle }}
    </p>
    <slot />
  </HbCard>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  accentColor: { type: String, default: 'var(--color-pink)' }
})
</script>
