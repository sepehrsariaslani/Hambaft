<template>
  <aside v-if="isDesktop" class="calendar-agenda-drawer calendar-agenda-drawer--desktop">
    <div class="calendar-agenda-drawer__content">
      <CalendarDaySummaryCard :bundle="bundle" :headline="headline" />

      <div class="calendar-agenda-drawer__tabs">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="calendar-agenda-drawer__tab"
          :class="{ 'calendar-agenda-drawer__tab--active': section.key === activeSection }"
          @click="$emit('change-section', section.key)"
        >
          {{ section.label }}
        </button>
      </div>

      <CalendarDayView
        :timeline-items="timelineItems"
        :untimed-tasks="untimedTasks"
        :habits="habits"
        :finance-items="financeItems"
        :goals="goals"
        :reminders="reminders"
        :active-section="activeSection"
        @toggle-habit="$emit('toggle-habit', $event)"
        @complete-task="$emit('complete-task', $event)"
        @open-finance="$emit('open-finance', $event)"
      />
    </div>
  </aside>

  <Teleport v-else to="body">
    <div v-if="open" class="calendar-agenda-drawer calendar-agenda-drawer--mobile">
      <div class="calendar-agenda-drawer__overlay" @click="$emit('close')" />
      <div class="calendar-agenda-drawer__sheet">
        <div class="calendar-agenda-drawer__handle" />
        <div class="calendar-agenda-drawer__mobile-head">
          <div>
            <p class="calendar-agenda-drawer__eyebrow">جزئیات روز</p>
            <h3 class="calendar-agenda-drawer__headline">{{ headline }}</h3>
          </div>
          <button type="button" class="calendar-agenda-drawer__close" @click="$emit('close')">بستن</button>
        </div>

        <CalendarDaySummaryCard :bundle="bundle" :headline="headline" />
        <CalendarDayView
          :timeline-items="timelineItems"
          :untimed-tasks="untimedTasks"
          :habits="habits"
          :finance-items="financeItems"
          :goals="goals"
          :reminders="reminders"
          :active-section="activeSection"
          @toggle-habit="$emit('toggle-habit', $event)"
          @complete-task="$emit('complete-task', $event)"
          @open-finance="$emit('open-finance', $event)"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import CalendarDaySummaryCard from '@/components/calendar/CalendarDaySummaryCard.vue'
import CalendarDayView from '@/components/calendar/CalendarDayView.vue'

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  isDesktop: {
    type: Boolean,
    default: false,
  },
  headline: {
    type: String,
    default: '',
  },
  bundle: {
    type: Object,
    default: null,
  },
  activeSection: {
    type: String,
    default: 'overview',
  },
  sections: {
    type: Array,
    default: () => [],
  },
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
})

defineEmits(['close', 'change-section', 'toggle-habit', 'complete-task', 'open-finance'])
</script>

<style scoped>
.calendar-agenda-drawer--desktop {
  position: sticky;
  top: 20px;
}

.calendar-agenda-drawer__content {
  display: grid;
  gap: 16px;
}

.calendar-agenda-drawer__tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.calendar-agenda-drawer__tab {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-text-secondary);
  font-size: 0.76rem;
  font-weight: 700;
}

.calendar-agenda-drawer__tab--active {
  background: #111111;
  color: var(--color-text-on-dark);
}

.calendar-agenda-drawer--mobile {
  position: fixed;
  inset: 0;
  z-index: 120;
}

.calendar-agenda-drawer__overlay {
  position: absolute;
  inset: 0;
  background: rgba(17, 17, 17, 0.34);
  backdrop-filter: blur(4px);
}

.calendar-agenda-drawer__sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: calc(100dvh - 52px);
  overflow: auto;
  border-radius: 28px 28px 0 0;
  padding: 14px 16px calc(120px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(255, 251, 246, 0.98) 0%, rgba(247, 240, 227, 0.98) 100%);
  box-shadow: 0 -24px 56px rgba(17, 17, 17, 0.16);
}

.calendar-agenda-drawer__handle {
  width: 52px;
  height: 5px;
  margin: 0 auto 14px;
  border-radius: 999px;
  background: rgba(17, 17, 17, 0.16);
}

.calendar-agenda-drawer__mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.calendar-agenda-drawer__eyebrow,
.calendar-agenda-drawer__headline {
  margin: 0;
}

.calendar-agenda-drawer__eyebrow {
  font-size: 0.76rem;
  color: var(--color-text-secondary);
}

.calendar-agenda-drawer__headline {
  margin-top: 4px;
  color: var(--color-text);
  font-size: 1.1rem;
}

.calendar-agenda-drawer__close {
  border: 0;
  border-radius: 999px;
  padding: 0 14px;
  min-height: 38px;
  background: rgba(17, 17, 17, 0.06);
  color: var(--color-text);
  font-weight: 700;
}
</style>
