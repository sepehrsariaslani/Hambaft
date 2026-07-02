<template>
  <section class="calendar-week-view">
    <article
      v-for="day in days"
      :key="day.date"
      class="calendar-week-view__day"
      :class="{ 'calendar-week-view__day--selected': day.isSelected }"
      @click="$emit('select-day', day.date)"
    >
      <div class="calendar-week-view__head">
        <div>
          <p class="calendar-week-view__weekday">{{ day.meta.weekdayLabel }}</p>
          <h3 class="calendar-week-view__date">{{ toPersianDigits(day.meta.jd) }} {{ day.meta.monthLabel }}</h3>
        </div>
        <span v-if="day.bundle?.summary_counts?.total" class="calendar-week-view__total">
          {{ toPersianDigits(day.bundle.summary_counts.total) }}
        </span>
      </div>

      <CalendarHabitStrip
        v-if="day.bundle?.habits?.length"
        :items="day.bundle.habits"
        @toggle="$emit('toggle-habit', $event)"
      />

      <div v-if="day.bundle?.finance_items?.length" class="calendar-week-view__finance">
        <CalendarFinanceBadge
          v-for="item in day.bundle.finance_items"
          :key="item.id"
          :item="item"
          @open="$emit('select-badge', { type: 'finance', date: day.date, item: $event })"
        />
      </div>

      <div v-if="timelineItems(day.bundle).length" class="calendar-week-view__timeline">
        <template v-for="item in timelineItems(day.bundle)" :key="item.id">
          <CalendarTaskBlock
            v-if="item.type === 'task'"
            :item="item"
            @toggle="$emit('complete-task', item)"
          />
          <CalendarEventBlock
            v-else
            :item="item"
            compact
          />
        </template>
      </div>

      <div v-if="day.bundle?.untimed_tasks?.length" class="calendar-week-view__untimed">
        <p class="calendar-week-view__section-title">کارهای بدون زمان</p>
        <CalendarTaskBlock
          v-for="task in day.bundle.untimed_tasks"
          :key="task.id"
          :item="task"
          @toggle="$emit('complete-task', task)"
        />
      </div>

      <p v-if="!hasContent(day.bundle)" class="calendar-week-view__empty">این روز فعلاً خلوت است.</p>
    </article>
  </section>
</template>

<script setup>
import { toPersianDigits } from '@/utils/jalali'
import CalendarEventBlock from '@/components/calendar/CalendarEventBlock.vue'
import CalendarFinanceBadge from '@/components/calendar/CalendarFinanceBadge.vue'
import CalendarHabitStrip from '@/components/calendar/CalendarHabitStrip.vue'
import CalendarTaskBlock from '@/components/calendar/CalendarTaskBlock.vue'

defineProps({
  days: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['select-day', 'toggle-habit', 'complete-task', 'select-badge'])

function timelineItems(bundle) {
  if (!bundle) return []
  return [...bundle.timed_tasks, ...bundle.events].sort((a, b) => String(a.starts_at || '').localeCompare(String(b.starts_at || '')))
}

function hasContent(bundle) {
  return Boolean(
    bundle &&
    (bundle.events.length ||
      bundle.timed_tasks.length ||
      bundle.untimed_tasks.length ||
      bundle.habits.length ||
      bundle.finance_items.length ||
      bundle.goals.length ||
      bundle.reminders.length)
  )
}
</script>

<style scoped>
.calendar-week-view {
  display: grid;
  gap: 14px;
}

.calendar-week-view__day {
  display: grid;
  gap: 14px;
  border-radius: 30px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 20px 40px rgba(122, 94, 54, 0.08);
}

.calendar-week-view__day--selected {
  box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.08), 0 20px 40px rgba(122, 94, 54, 0.08);
}

.calendar-week-view__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-week-view__weekday {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.76rem;
}

.calendar-week-view__date {
  margin: 4px 0 0;
  color: var(--color-text);
  font-size: 1.08rem;
}

.calendar-week-view__total {
  display: inline-flex;
  min-height: 34px;
  min-width: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.06);
  font-weight: 800;
}

.calendar-week-view__finance,
.calendar-week-view__timeline,
.calendar-week-view__untimed {
  display: grid;
  gap: 10px;
}

.calendar-week-view__finance {
  display: flex;
  flex-wrap: wrap;
}

.calendar-week-view__section-title,
.calendar-week-view__empty {
  margin: 0;
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

@media (min-width: 1024px) {
  .calendar-week-view {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    align-items: start;
  }

  .calendar-week-view__day {
    min-height: 100%;
  }
}
</style>
