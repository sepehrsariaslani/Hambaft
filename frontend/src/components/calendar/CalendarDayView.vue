<template>
  <section class="calendar-day-view">
    <div v-if="isSectionVisible('schedule')" class="calendar-day-view__section">
      <div class="calendar-day-view__section-head">
        <h3>برنامه‌ها و تایم‌بلاک‌ها</h3>
        <span>{{ toPersianDigits(timelineItems.length) }}</span>
      </div>
      <div v-if="timelineItems.length" class="calendar-day-view__stack">
        <template v-for="item in timelineItems" :key="item.id">
          <CalendarTaskBlock v-if="item.type === 'task'" :item="item" @toggle="$emit('complete-task', item)" />
          <CalendarEventBlock v-else :item="item" />
        </template>
      </div>
      <p v-else class="calendar-day-view__empty">برای این روز برنامه‌ی زمان‌دار ثبت نشده است.</p>
    </div>

    <div v-if="isSectionVisible('tasks')" class="calendar-day-view__section">
      <div class="calendar-day-view__section-head">
        <h3>کارها</h3>
        <span>{{ toPersianDigits(untimedTasks.length) }}</span>
      </div>
      <div v-if="untimedTasks.length" class="calendar-day-view__stack">
        <CalendarTaskBlock v-for="task in untimedTasks" :key="task.id" :item="task" @toggle="$emit('complete-task', task)" />
      </div>
      <p v-else class="calendar-day-view__empty">کار بدون زمان برای این روز دیده نمی‌شود.</p>
    </div>

    <div v-if="isSectionVisible('habits')" class="calendar-day-view__section">
      <div class="calendar-day-view__section-head">
        <h3>عادت‌ها</h3>
        <span>{{ toPersianDigits(habits.length) }}</span>
      </div>
      <CalendarHabitStrip v-if="habits.length" :items="habits" @toggle="$emit('toggle-habit', $event)" />
      <p v-else class="calendar-day-view__empty">عادت فعالی برای نمایش در این روز پیدا نشد.</p>
    </div>

    <div v-if="isSectionVisible('finance')" class="calendar-day-view__section">
      <div class="calendar-day-view__section-head">
        <h3>مالی و پرداخت‌ها</h3>
        <span>{{ toPersianDigits(financeItems.length) }}</span>
      </div>
      <div v-if="financeItems.length" class="calendar-day-view__finance">
        <CalendarFinanceBadge
          v-for="item in financeItems"
          :key="item.id"
          :item="item"
          @open="$emit('open-finance', $event)"
        />
      </div>
      <p v-else class="calendar-day-view__empty">آیتم مالی ثبت‌شده‌ای برای این روز نیست.</p>
    </div>

    <div v-if="isSectionVisible('goals')" class="calendar-day-view__section">
      <div class="calendar-day-view__section-head">
        <h3>هدف‌ها و یادآوری‌ها</h3>
        <span>{{ toPersianDigits(goals.length + reminders.length) }}</span>
      </div>
      <div v-if="goals.length || reminders.length" class="calendar-day-view__stack">
        <CalendarGoalBadge v-for="goal in goals" :key="goal.id" :item="goal" />
        <article v-for="reminder in reminders" :key="reminder.id" class="calendar-day-view__reminder">
          <p>{{ reminder.title }}</p>
          <small>{{ reminder.subtitle || 'یادآوری روزانه' }}</small>
        </article>
      </div>
      <p v-else class="calendar-day-view__empty">هدف یا یادآوری ویژه‌ای برای این روز دیده نمی‌شود.</p>
    </div>
  </section>
</template>

<script setup>
import { toPersianDigits } from '@/utils/jalali'
import CalendarEventBlock from '@/components/calendar/CalendarEventBlock.vue'
import CalendarFinanceBadge from '@/components/calendar/CalendarFinanceBadge.vue'
import CalendarGoalBadge from '@/components/calendar/CalendarGoalBadge.vue'
import CalendarHabitStrip from '@/components/calendar/CalendarHabitStrip.vue'
import CalendarTaskBlock from '@/components/calendar/CalendarTaskBlock.vue'

const props = defineProps({
  timelineItems: {
    type: Array,
    default: () => [],
  },
  untimedTasks: {
    type: Array,
    default: () => [],
  },
  habits: {
    type: Array,
    default: () => [],
  },
  financeItems: {
    type: Array,
    default: () => [],
  },
  goals: {
    type: Array,
    default: () => [],
  },
  reminders: {
    type: Array,
    default: () => [],
  },
  activeSection: {
    type: String,
    default: 'overview',
  },
})

defineEmits(['toggle-habit', 'complete-task', 'open-finance'])

function isSectionVisible(sectionKey) {
  if (props.activeSection === 'overview') return true
  if (sectionKey === 'schedule') return props.activeSection === 'tasks'
  return props.activeSection === sectionKey
}
</script>

<style scoped>
.calendar-day-view {
  display: grid;
  gap: 16px;
}

.calendar-day-view__section {
  display: grid;
  gap: 12px;
  border-radius: 28px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 18px 36px rgba(122, 94, 54, 0.08);
}

.calendar-day-view__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-day-view__section-head h3,
.calendar-day-view__empty,
.calendar-day-view__reminder p,
.calendar-day-view__reminder small {
  margin: 0;
}

.calendar-day-view__section-head h3 {
  font-size: 1rem;
  color: var(--color-text);
}

.calendar-day-view__section-head span,
.calendar-day-view__empty,
.calendar-day-view__reminder small {
  color: var(--color-text-secondary);
  font-size: 0.76rem;
}

.calendar-day-view__stack {
  display: grid;
  gap: 10px;
}

.calendar-day-view__finance {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-day-view__reminder {
  border-radius: 22px;
  padding: 14px;
  background: rgba(198, 215, 247, 0.56);
}

.calendar-day-view__reminder p {
  color: var(--color-text);
  font-weight: 800;
}
</style>
