<template>
  <button type="button" class="calendar-finance-badge" @click.stop="$emit('open', item)">
    <span class="calendar-finance-badge__title">{{ item.title }}</span>
    <span class="calendar-finance-badge__amount">{{ item.subtitle }}</span>
  </button>
</template>

<script setup>
defineProps({
  item: {
    type: Object,
    required: true,
  },
})

defineEmits(['open'])
</script>

<style scoped>
.calendar-finance-badge {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  padding: 0 12px;
  background: rgba(250, 213, 223, 0.56);
  color: var(--color-text);
}

.calendar-finance-badge__title {
  font-size: 0.75rem;
  font-weight: 800;
}

.calendar-finance-badge__amount {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}
</style>
