<template>
  <div class="calendar-filters">
    <button
      v-for="filter in filters"
      :key="filter.key"
      type="button"
      class="calendar-filters__item"
      :class="{ 'calendar-filters__item--active': filter.key === activeFilter }"
      @click="$emit('change', filter.key)"
    >
      {{ filter.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  filters: {
    type: Array,
    default: () => [],
  },
  activeFilter: {
    type: String,
    default: 'all',
  },
})

defineEmits(['change'])
</script>

<style scoped>
.calendar-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-filters__item {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(122, 94, 54, 0.06);
}

.calendar-filters__item--active {
  background: #111111;
  color: var(--color-text-on-dark);
}
</style>
