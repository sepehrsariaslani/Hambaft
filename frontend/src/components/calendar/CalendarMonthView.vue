<template>
  <section class="calendar-month-view">
    <div class="calendar-month-view__weekdays">
      <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
    </div>

    <div class="calendar-month-view__grid">
      <article
        v-for="cell in flatCells"
        :key="cell.bundle.date"
        class="calendar-month-view__cell"
        :class="{
          'calendar-month-view__cell--outside': !cell.isCurrentMonth,
          'calendar-month-view__cell--selected': cell.isSelected,
          'calendar-month-view__cell--today': cell.isToday,
        }"
        role="button"
        tabindex="0"
        @click="$emit('select-day', cell.bundle.date)"
        @keydown.enter.prevent="$emit('select-day', cell.bundle.date)"
        @keydown.space.prevent="$emit('select-day', cell.bundle.date)"
      >
        <div class="calendar-month-view__cell-head">
          <span class="calendar-month-view__day">{{ toPersianDigits(cell.meta.jd) }}</span>
          <span v-if="cell.visibleBundle?.summary_counts?.total" class="calendar-month-view__count">
            {{ toPersianDigits(cell.visibleBundle.summary_counts.total) }}
          </span>
        </div>

        <div class="calendar-month-view__previews">
          <p
            v-for="item in cell.summary.previewItems"
            :key="item.id"
            class="calendar-month-view__preview"
          >
            {{ item.title }}
          </p>
        </div>

        <CalendarMiniBadges :badges="cell.summary.badges" @select="$emit('select-badge', { badge: $event, date: cell.bundle.date })" />

        <p v-if="cell.summary.overflowCount > 0" class="calendar-month-view__overflow">
          +{{ toPersianDigits(cell.summary.overflowCount) }} مورد
        </p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { toPersianDigits } from '@/utils/jalali'
import CalendarMiniBadges from '@/components/calendar/CalendarMiniBadges.vue'

const props = defineProps({
  weeks: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['select-day', 'select-badge'])

const flatCells = computed(() => props.weeks.flat())
const weekdayLabels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
</script>

<style scoped>
.calendar-month-view {
  display: grid;
  gap: 14px;
}

.calendar-month-view__weekdays,
.calendar-month-view__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
}

.calendar-month-view__weekdays span {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.74rem;
  font-weight: 700;
}

.calendar-month-view__cell {
  display: grid;
  gap: 10px;
  min-height: 146px;
  align-content: start;
  border: 0;
  border-radius: 28px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.76);
  text-align: right;
  box-shadow: 0 18px 36px rgba(122, 94, 54, 0.08);
}

.calendar-month-view__cell--outside {
  opacity: 0.45;
}

.calendar-month-view__cell--selected {
  box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.12), 0 18px 36px rgba(122, 94, 54, 0.08);
}

.calendar-month-view__cell--today {
  background: linear-gradient(180deg, rgba(255, 244, 237, 0.96) 0%, rgba(255, 255, 255, 0.78) 100%);
}

.calendar-month-view__cell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.calendar-month-view__day {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-text);
}

.calendar-month-view__count {
  display: inline-flex;
  min-height: 26px;
  min-width: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.06);
  font-size: 0.72rem;
  font-weight: 700;
}

.calendar-month-view__previews {
  display: grid;
  gap: 6px;
}

.calendar-month-view__preview,
.calendar-month-view__overflow {
  margin: 0;
  font-size: 0.72rem;
}

.calendar-month-view__preview {
  color: var(--color-text);
  font-weight: 700;
}

.calendar-month-view__overflow {
  color: var(--color-text-secondary);
}

@media (max-width: 1023px) {
  .calendar-month-view__weekdays,
  .calendar-month-view__grid {
    gap: 8px;
  }

  .calendar-month-view__cell {
    min-height: 110px;
    padding: 10px;
    border-radius: 22px;
  }
}
</style>
