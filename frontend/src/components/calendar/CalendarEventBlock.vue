<template>
  <article class="calendar-event-block" :class="[`calendar-event-block--${item.visual?.color_token || 'neutral'}`, compact ? 'calendar-event-block--compact' : '']">
    <div class="calendar-event-block__time">
      <span>{{ timeLabel }}</span>
    </div>
    <div class="calendar-event-block__body">
      <p class="calendar-event-block__title">{{ item.title }}</p>
      <p v-if="item.subtitle" class="calendar-event-block__subtitle">{{ item.subtitle }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

import { formatTimeLabel } from '@/calendar/calendarDate'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const timeLabel = computed(() => {
  if (!props.item.starts_at) return 'بدون زمان'
  if (!props.item.ends_at) return formatTimeLabel(props.item.starts_at)
  return `${formatTimeLabel(props.item.starts_at)} تا ${formatTimeLabel(props.item.ends_at)}`
})
</script>

<style scoped>
.calendar-event-block {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 10px;
  border-radius: 22px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 18px 34px rgba(122, 94, 54, 0.08);
}

.calendar-event-block--compact {
  grid-template-columns: 72px minmax(0, 1fr);
  padding: 10px;
}

.calendar-event-block__time {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.78rem;
  font-weight: 700;
}

.calendar-event-block__body {
  min-width: 0;
}

.calendar-event-block__title {
  margin: 0;
  color: var(--color-text);
  font-size: 0.92rem;
  font-weight: 800;
}

.calendar-event-block__subtitle {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.calendar-event-block--orange {
  background: linear-gradient(135deg, rgba(252, 143, 96, 0.96) 0%, rgba(245, 108, 72, 0.94) 100%);
  color: #fff7f2;
}

.calendar-event-block--orange .calendar-event-block__title,
.calendar-event-block--orange .calendar-event-block__subtitle,
.calendar-event-block--orange .calendar-event-block__time {
  color: #fff7f2;
}

.calendar-event-block--orange .calendar-event-block__time {
  background: rgba(17, 17, 17, 0.16);
}

.calendar-event-block--purple {
  background: rgba(228, 214, 249, 0.78);
}

.calendar-event-block--green {
  background: rgba(206, 231, 188, 0.78);
}

.calendar-event-block--blue {
  background: rgba(198, 215, 247, 0.82);
}
</style>
