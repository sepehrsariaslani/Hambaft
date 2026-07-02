<template>
  <article class="calendar-task-block" :class="{ 'calendar-task-block--done': item.is_completed }">
    <button type="button" class="calendar-task-block__toggle" @click.stop="$emit('toggle', item)">
      <Check v-if="item.is_completed" :size="15" :stroke-width="2.4" />
      <Circle v-else :size="15" :stroke-width="2.2" />
    </button>

    <div class="calendar-task-block__body">
      <div class="calendar-task-block__head">
        <p class="calendar-task-block__title">{{ item.title }}</p>
        <span class="calendar-task-block__priority" :class="`calendar-task-block__priority--${item.importance || 'medium'}`">
          {{ priorityLabel }}
        </span>
      </div>
      <p v-if="item.subtitle" class="calendar-task-block__subtitle">{{ item.subtitle }}</p>
      <p class="calendar-task-block__meta">{{ timeLabel }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { Check, Circle } from 'lucide-vue-next'

import { formatTimeLabel } from '@/calendar/calendarDate'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

defineEmits(['toggle'])

const priorityLabel = computed(() => {
  const labels = {
    urgent: 'فوری',
    high: 'بالا',
    medium: 'عادی',
    low: 'سبک',
  }
  return labels[props.item.importance] || 'عادی'
})

const timeLabel = computed(() => props.item.starts_at ? formatTimeLabel(props.item.starts_at) : 'بدون زمان')
</script>

<style scoped>
.calendar-task-block {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: 22px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 28px rgba(122, 94, 54, 0.08);
}

.calendar-task-block--done {
  opacity: 0.68;
}

.calendar-task-block__toggle {
  display: inline-flex;
  height: 38px;
  width: 38px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 14px;
  background: rgba(17, 17, 17, 0.06);
  color: var(--color-text);
}

.calendar-task-block__body {
  min-width: 0;
  flex: 1;
}

.calendar-task-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.calendar-task-block__title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--color-text);
}

.calendar-task-block__subtitle,
.calendar-task-block__meta {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.calendar-task-block__priority {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
}

.calendar-task-block__priority--urgent {
  background: rgba(247, 133, 84, 0.2);
  color: #8d3412;
}

.calendar-task-block__priority--high {
  background: rgba(250, 222, 131, 0.38);
  color: #705202;
}

.calendar-task-block__priority--medium {
  background: rgba(198, 215, 247, 0.38);
  color: #294a7f;
}

.calendar-task-block__priority--low {
  background: rgba(206, 231, 188, 0.4);
  color: #41622a;
}
</style>
