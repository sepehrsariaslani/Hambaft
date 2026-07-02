<template>
  <div class="calendar-shell" dir="rtl">
    <div class="calendar-shell__backdrop" />

    <header class="calendar-shell__header">
      <div class="calendar-shell__hero">
        <p class="calendar-shell__eyebrow">تقویم ترکیبی زندگی</p>
        <h1 class="calendar-shell__title">تقویم</h1>
        <p class="calendar-shell__subtitle">برنامه‌ روز، کارها، عادت‌ها، مالی و هدف‌ها در یک نمای خلاصه و هوشمند</p>
      </div>

      <div class="calendar-shell__header-actions">
        <button type="button" class="calendar-shell__ghost-button" @click="store.jumpToToday()">امروز</button>
        <button type="button" class="calendar-shell__ghost-button" @click="store.refresh()">بازخوانی</button>
      </div>
    </header>

    <div v-if="store.loading && !store.bundles.length" class="calendar-shell__loading">
      <div v-for="index in 3" :key="index" class="calendar-shell__skeleton" />
    </div>

    <div v-else-if="store.error" class="calendar-shell__error">
      <h2>بارگذاری تقویم انجام نشد</h2>
      <p>{{ store.error }}</p>
      <button type="button" class="calendar-shell__primary-button" @click="store.load()">تلاش دوباره</button>
    </div>

    <div v-else class="calendar-shell__body">
      <aside class="calendar-shell__sidebar">
        <section class="calendar-shell__panel">
          <div class="calendar-shell__panel-head">
            <h2>نمایش</h2>
            <span>{{ store.monthTitle }}</span>
          </div>

          <div class="calendar-shell__view-switch">
            <button
              v-for="view in views"
              :key="view.key"
              type="button"
              class="calendar-shell__view-chip"
              :class="{ 'calendar-shell__view-chip--active': store.currentView === view.key }"
              @click="changeView(view.key)"
            >
              {{ view.label }}
            </button>
          </div>

          <div class="calendar-shell__navigator">
            <button type="button" class="calendar-shell__icon-button" @click="store.moveRange(-1)">
              <ChevronRight :size="18" :stroke-width="2.2" />
            </button>
            <div class="calendar-shell__navigator-copy">
              <strong>{{ store.monthTitle }}</strong>
              <span>{{ store.selectedHeadline }}</span>
            </div>
            <button type="button" class="calendar-shell__icon-button" @click="store.moveRange(1)">
              <ChevronLeft :size="18" :stroke-width="2.2" />
            </button>
          </div>
        </section>

        <section class="calendar-shell__panel">
          <div class="calendar-shell__panel-head">
            <h2>فیلترها</h2>
            <span>فقط نمایش را عوض می‌کند</span>
          </div>
          <CalendarFilters :filters="store.filters" :active-filter="store.activeFilter" @change="store.setFilter" />
        </section>

        <section class="calendar-shell__panel">
          <div class="calendar-shell__panel-head">
            <h2>خلاصه‌ی روز انتخاب‌شده</h2>
            <span>{{ store.selectedHeadline }}</span>
          </div>
          <CalendarMiniBadges :badges="store.visibleSelectedBundle?.badges || []" @select="openBadge" />
          <ul class="calendar-shell__facts">
            <li>رویدادها و کارهای زمان‌دار در timeline دیده می‌شوند.</li>
            <li>کارهای بدون زمان جدا نمایش داده می‌شوند تا شلوغی کم بماند.</li>
            <li>مالی، عادت و هدف به‌صورت badge و کارت سبک‌وزن آمده‌اند.</li>
          </ul>
        </section>
      </aside>

      <main class="calendar-shell__main">
        <section class="calendar-shell__toolbar">
          <CalendarFilters class="lg:hidden" :filters="store.filters" :active-filter="store.activeFilter" @change="store.setFilter" />
        </section>

        <CalendarMonthView
          v-if="store.currentView === 'month'"
          :weeks="store.monthWeeks"
          @select-day="handleSelectDay"
          @select-badge="handleBadgeSelection"
        />

        <CalendarWeekView
          v-else-if="store.currentView === 'week'"
          :days="store.weekDays"
          @select-day="handleSelectDay"
          @toggle-habit="store.toggleHabit"
          @complete-task="store.completeTask"
          @select-badge="handleBadgeSelection"
        />

        <div v-else class="calendar-shell__day-main">
          <CalendarDaySummaryCard :bundle="store.visibleSelectedBundle" :headline="store.selectedHeadline" />
          <CalendarDayView
            :timeline-items="store.activeTimelineItems"
            :untimed-tasks="store.selectedUntimedTasks"
            :habits="store.selectedHabits"
            :finance-items="store.selectedFinanceItems"
            :goals="store.selectedGoals"
            :reminders="store.selectedReminders"
            @toggle-habit="store.toggleHabit"
            @complete-task="store.completeTask"
            @open-finance="openFinance"
          />
        </div>
      </main>

      <CalendarAgendaDrawer
        v-if="isDesktop || mobileDetailOpen"
        :open="mobileDetailOpen"
        :is-desktop="isDesktop"
        :headline="store.selectedHeadline"
        :bundle="store.visibleSelectedBundle"
        :active-section="store.activeDetailSection"
        :sections="detailSections"
        :timeline-items="store.activeTimelineItems"
        :untimed-tasks="store.selectedUntimedTasks"
        :habits="store.selectedHabits"
        :finance-items="store.selectedFinanceItems"
        :goals="store.selectedGoals"
        :reminders="store.selectedReminders"
        @close="mobileDetailOpen = false"
        @change-section="store.setDetailSection"
        @toggle-habit="store.toggleHabit"
        @complete-task="store.completeTask"
        @open-finance="openFinance"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import CalendarAgendaDrawer from '@/components/calendar/CalendarAgendaDrawer.vue'
import CalendarDaySummaryCard from '@/components/calendar/CalendarDaySummaryCard.vue'
import CalendarDayView from '@/components/calendar/CalendarDayView.vue'
import CalendarFilters from '@/components/calendar/CalendarFilters.vue'
import CalendarMiniBadges from '@/components/calendar/CalendarMiniBadges.vue'
import CalendarMonthView from '@/components/calendar/CalendarMonthView.vue'
import CalendarWeekView from '@/components/calendar/CalendarWeekView.vue'
import { useCalendarShellStore } from '@/stores/calendarShell'

const store = useCalendarShellStore()
const isDesktop = ref(false)
const mobileDetailOpen = ref(false)
let mediaQuery = null

const views = [
  { key: 'day', label: 'روز' },
  { key: 'week', label: 'هفته' },
  { key: 'month', label: 'ماه' },
]

const detailSections = [
  { key: 'overview', label: 'مرور' },
  { key: 'tasks', label: 'کارها' },
  { key: 'habits', label: 'عادت‌ها' },
  { key: 'finance', label: 'مالی' },
  { key: 'goals', label: 'هدف‌ها' },
]

function updateDesktopState() {
  isDesktop.value = Boolean(mediaQuery?.matches)
  if (isDesktop.value) mobileDetailOpen.value = false
}

async function changeView(view) {
  await store.setView(view)
}

function handleSelectDay(dateKey) {
  store.selectDate(dateKey)
  if (!isDesktop.value) mobileDetailOpen.value = true
}

function handleBadgeSelection({ badge, date }) {
  store.selectDate(date)
  store.setDetailSection(badge.type === 'finance' ? 'finance' : badge.type === 'habit' ? 'habits' : badge.type === 'goal' ? 'goals' : 'overview')
  if (!isDesktop.value) mobileDetailOpen.value = true
}

function openBadge(badge) {
  store.setDetailSection(badge.type === 'finance' ? 'finance' : badge.type === 'habit' ? 'habits' : badge.type === 'goal' ? 'goals' : 'overview')
  if (!isDesktop.value) mobileDetailOpen.value = true
}

function openFinance() {
  store.setDetailSection('finance')
  if (!isDesktop.value) mobileDetailOpen.value = true
}

onMounted(async () => {
  mediaQuery = window.matchMedia('(min-width: 1024px)')
  updateDesktopState()
  mediaQuery.addEventListener('change', updateDesktopState)
  await store.load()
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', updateDesktopState)
})
</script>

<style scoped>
.calendar-shell {
  position: relative;
  min-height: calc(100dvh - 24px);
  padding: 18px 16px 120px;
}

.calendar-shell__backdrop {
  position: absolute;
  inset: 0;
  border-radius: 36px;
  background:
    radial-gradient(circle at top left, rgba(255, 220, 193, 0.52), transparent 30%),
    radial-gradient(circle at top right, rgba(222, 209, 248, 0.4), transparent 24%),
    linear-gradient(180deg, rgba(255, 250, 244, 0.92) 0%, rgba(247, 240, 227, 0.9) 100%);
  pointer-events: none;
}

.calendar-shell__header,
.calendar-shell__body {
  position: relative;
  z-index: 1;
}

.calendar-shell__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.calendar-shell__eyebrow,
.calendar-shell__subtitle,
.calendar-shell__panel-head span,
.calendar-shell__facts {
  color: var(--color-text-secondary);
}

.calendar-shell__eyebrow,
.calendar-shell__subtitle {
  margin: 0;
}

.calendar-shell__eyebrow {
  font-size: 0.82rem;
}

.calendar-shell__title {
  margin: 8px 0 6px;
  font-size: clamp(2.2rem, 6vw, 3.8rem);
  line-height: 0.94;
  color: var(--color-text);
}

.calendar-shell__subtitle {
  max-width: 620px;
  font-size: 0.9rem;
}

.calendar-shell__header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.calendar-shell__ghost-button,
.calendar-shell__primary-button,
.calendar-shell__icon-button,
.calendar-shell__view-chip {
  border: 0;
  border-radius: 999px;
  font-weight: 800;
}

.calendar-shell__ghost-button,
.calendar-shell__icon-button,
.calendar-shell__view-chip {
  background: rgba(255, 255, 255, 0.76);
  color: var(--color-text);
  box-shadow: 0 12px 28px rgba(122, 94, 54, 0.08);
}

.calendar-shell__ghost-button,
.calendar-shell__primary-button {
  min-height: 44px;
  padding: 0 18px;
}

.calendar-shell__primary-button {
  background: #111111;
  color: var(--color-text-on-dark);
}

.calendar-shell__loading {
  display: grid;
  gap: 12px;
}

.calendar-shell__skeleton,
.calendar-shell__error,
.calendar-shell__panel,
.calendar-shell__toolbar {
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 18px 36px rgba(122, 94, 54, 0.08);
}

.calendar-shell__skeleton {
  min-height: 140px;
}

.calendar-shell__error {
  display: grid;
  gap: 10px;
  padding: 24px;
}

.calendar-shell__error h2,
.calendar-shell__error p {
  margin: 0;
}

.calendar-shell__body {
  display: grid;
  gap: 16px;
}

.calendar-shell__sidebar,
.calendar-shell__main {
  display: grid;
  gap: 16px;
}

.calendar-shell__panel,
.calendar-shell__toolbar {
  padding: 16px;
}

.calendar-shell__panel-head,
.calendar-shell__navigator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-shell__panel-head {
  margin-bottom: 12px;
}

.calendar-shell__panel-head h2 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
}

.calendar-shell__view-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.calendar-shell__view-chip {
  min-height: 42px;
  padding: 0 16px;
}

.calendar-shell__view-chip--active {
  background: #111111;
  color: var(--color-text-on-dark);
}

.calendar-shell__navigator {
  border-radius: 24px;
  padding: 12px;
  background: rgba(247, 240, 227, 0.92);
}

.calendar-shell__icon-button {
  display: inline-flex;
  height: 42px;
  width: 42px;
  align-items: center;
  justify-content: center;
}

.calendar-shell__navigator-copy {
  min-width: 0;
  text-align: center;
}

.calendar-shell__navigator-copy strong,
.calendar-shell__navigator-copy span {
  display: block;
}

.calendar-shell__navigator-copy strong {
  color: var(--color-text);
}

.calendar-shell__navigator-copy span {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 0.74rem;
}

.calendar-shell__facts {
  margin: 12px 0 0;
  padding-inline-start: 18px;
  font-size: 0.78rem;
  line-height: 1.8;
}

.calendar-shell__day-main {
  display: grid;
  gap: 16px;
}

@media (min-width: 1024px) {
  .calendar-shell {
    padding: 24px 24px 40px;
  }

  .calendar-shell__body {
    grid-template-columns: 280px minmax(0, 1fr) 360px;
    align-items: start;
  }
}
</style>
