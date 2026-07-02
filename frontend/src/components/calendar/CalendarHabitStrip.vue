<template>
  <div class="calendar-habit-strip">
    <button
      v-for="habit in items"
      :key="habit.id"
      type="button"
      class="calendar-habit-strip__item"
      :class="{ 'calendar-habit-strip__item--done': habit.is_completed }"
      @click.stop="$emit('toggle', habit)"
    >
      <span class="calendar-habit-strip__title">{{ habit.title }}</span>
      <span class="calendar-habit-strip__value">{{ habit.subtitle }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['toggle'])
</script>

<style scoped>
.calendar-habit-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.calendar-habit-strip__item {
  display: inline-flex;
  min-width: 118px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  border: 0;
  border-radius: 20px;
  padding: 10px 12px;
  background: rgba(226, 239, 208, 0.68);
  color: var(--color-text);
  text-align: right;
}

.calendar-habit-strip__item--done {
  background: rgba(184, 213, 135, 0.9);
}

.calendar-habit-strip__title {
  font-size: 0.78rem;
  font-weight: 800;
}

.calendar-habit-strip__value {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}
</style>
