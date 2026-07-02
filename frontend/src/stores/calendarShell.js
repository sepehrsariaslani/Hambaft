import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { buildCalendarDayBundles, buildMonthCellSummary, getDateKey } from '@/calendar/calendarBundle'
import {
  addDays,
  addMonths,
  buildDateList,
  formatDateKey,
  getJalaliDateMeta,
  getMonthGridRange,
  getMonthTitle,
  getTodayKey,
  getWeekRange,
  isSameJalaliMonth,
  parseDateKey,
  shiftJalaliMonth,
} from '@/calendar/calendarDate'
import { call } from '@/utils/frappe'

const FILTER_DEFINITIONS = [
  { key: 'all', label: 'همه' },
  { key: 'task', label: 'کارها' },
  { key: 'event', label: 'رویدادها' },
  { key: 'habit', label: 'عادت‌ها' },
  { key: 'finance', label: 'مالی' },
  { key: 'goal', label: 'هدف‌ها' },
  { key: 'reminder', label: 'یادآوری‌ها' },
]

function ensureSuccess(response) {
  if (response?.status === 'success') return response.data || {}
  if (response?.message?.status === 'success') return response.message.data || {}
  return response?.data || response?.message || {}
}

function inRange(dateKey, fromDate, toDate) {
  return Boolean(dateKey && dateKey >= fromDate && dateKey <= toDate)
}

function buildSupplementReminders(supplements, fromDate, toDate) {
  const reminders = []
  const dates = buildDateList(fromDate, toDate)

  for (const supplement of supplements || []) {
    if (supplement.is_active === 0 || supplement.is_active === false) continue
    for (const date of dates) {
      reminders.push({
        name: `${supplement.name}-${date}`,
        title: supplement.name,
        note: [supplement.dosage, supplement.notes].filter(Boolean).join(' · '),
        category: supplement.category || 'supplement',
        date,
        status: 'pending',
      })
    }
  }

  return reminders
}

function filterTasksForRange(tasks, fromDate, toDate) {
  return (tasks || []).filter((task) => {
    const key = getDateKey(task.due_date || task.starts_at)
    return inRange(key, fromDate, toDate)
  })
}

function buildVisibleBundle(bundle, filterKey) {
  if (!bundle || filterKey === 'all') return bundle

  const visible = {
    ...bundle,
    events: filterKey === 'event' ? bundle.events : [],
    timed_tasks: filterKey === 'task' ? bundle.timed_tasks : [],
    untimed_tasks: filterKey === 'task' ? bundle.untimed_tasks : [],
    habits: filterKey === 'habit' ? bundle.habits : [],
    finance_items: filterKey === 'finance' ? bundle.finance_items : [],
    goals: filterKey === 'goal' ? bundle.goals : [],
    reminders: filterKey === 'reminder' ? bundle.reminders : [],
  }

  visible.summary_counts = {
    ...bundle.summary_counts,
    events: visible.events.length,
    timed_tasks: visible.timed_tasks.length,
    untimed_tasks: visible.untimed_tasks.length,
    habits_due: visible.habits.length,
    habits_done: visible.habits.filter((item) => item.is_completed).length,
    finance_due: visible.finance_items.length,
    goals: visible.goals.length,
    reminders: visible.reminders.length,
  }
  visible.summary_counts.total =
    visible.events.length +
    visible.timed_tasks.length +
    visible.untimed_tasks.length +
    visible.habits.length +
    visible.finance_items.length +
    visible.goals.length +
    visible.reminders.length
  visible.badges = bundle.badges.filter((badge) => filterKey === 'all' || badge.type === filterKey)
  return visible
}

export const useCalendarShellStore = defineStore('calendar-shell', () => {
  const currentView = ref('month')
  const selectedDateKey = ref(getTodayKey())
  const anchorDateKey = ref(getTodayKey())
  const activeFilter = ref('all')
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref('')
  const activeDetailSection = ref('overview')

  const rawEvents = ref([])
  const rawTasks = ref([])
  const rawHabits = ref([])
  const rawHabitLogs = ref([])
  const rawFinanceEntries = ref([])
  const rawGoals = ref([])
  const rawReminders = ref([])

  const filters = FILTER_DEFINITIONS

  const visibleRange = computed(() => {
    if (currentView.value === 'week') return getWeekRange(anchorDateKey.value)
    if (currentView.value === 'day') return { fromDate: selectedDateKey.value, toDate: selectedDateKey.value }
    return getMonthGridRange(anchorDateKey.value)
  })

  const bundles = computed(() => buildCalendarDayBundles({
    fromDate: visibleRange.value.fromDate,
    toDate: visibleRange.value.toDate,
    events: rawEvents.value,
    tasks: rawTasks.value,
    habits: rawHabits.value,
    habitLogs: rawHabitLogs.value,
    financeEntries: rawFinanceEntries.value,
    goals: rawGoals.value,
    reminders: rawReminders.value,
  }))

  const bundleMap = computed(() => new Map(bundles.value.map((bundle) => [bundle.date, bundle])))

  const selectedBundle = computed(() => bundleMap.value.get(selectedDateKey.value) || null)

  const visibleSelectedBundle = computed(() => buildVisibleBundle(selectedBundle.value, activeFilter.value))

  const monthTitle = computed(() => getMonthTitle(anchorDateKey.value))

  const monthCells = computed(() => bundles.value.map((bundle) => ({
    bundle,
    visibleBundle: buildVisibleBundle(bundle, activeFilter.value),
    summary: buildMonthCellSummary(buildVisibleBundle(bundle, activeFilter.value)),
    isCurrentMonth: isSameJalaliMonth(bundle.date, anchorDateKey.value),
    isSelected: bundle.date === selectedDateKey.value,
    isToday: bundle.date === getTodayKey(),
    meta: getJalaliDateMeta(bundle.date),
  })))

  const monthWeeks = computed(() => {
    const weeks = []
    for (let index = 0; index < monthCells.value.length; index += 7) {
      weeks.push(monthCells.value.slice(index, index + 7))
    }
    return weeks
  })

  const weekDays = computed(() => {
    const range = getWeekRange(selectedDateKey.value)
    return buildDateList(range.fromDate, range.toDate).map((dateKey) => {
      const bundle = bundleMap.value.get(dateKey) || selectedBundle.value
      return {
        date: dateKey,
        bundle: buildVisibleBundle(bundleMap.value.get(dateKey), activeFilter.value),
        summary: bundleMap.value.get(dateKey),
        meta: getJalaliDateMeta(dateKey),
        isSelected: selectedDateKey.value === dateKey,
        isToday: dateKey === getTodayKey(),
      }
    })
  })

  const activeTimelineItems = computed(() => {
    const bundle = visibleSelectedBundle.value
    if (!bundle) return []
    return [...bundle.timed_tasks, ...bundle.events].sort((a, b) => String(a.starts_at || '').localeCompare(String(b.starts_at || '')))
  })

  const selectedUntimedTasks = computed(() => visibleSelectedBundle.value?.untimed_tasks || [])
  const selectedHabits = computed(() => visibleSelectedBundle.value?.habits || [])
  const selectedFinanceItems = computed(() => visibleSelectedBundle.value?.finance_items || [])
  const selectedGoals = computed(() => visibleSelectedBundle.value?.goals || [])
  const selectedReminders = computed(() => visibleSelectedBundle.value?.reminders || [])

  const selectedHeadline = computed(() => {
    const meta = getJalaliDateMeta(selectedDateKey.value)
    return `${meta.weekdayLabel} ${meta.jd ? meta.jd.toLocaleString('fa-IR') : ''} ${meta.monthLabel}`
  })

  async function fetchDomainData(fromDate, toDate) {
    const tasksParams = new URLSearchParams({ limit: '300' }).toString()
    const eventParams = new URLSearchParams({ from_date: fromDate, to_date: toDate, limit: '300' }).toString()
    const habitLogParams = new URLSearchParams({ from_date: fromDate, to_date: toDate, limit: '600' }).toString()
    const financeParams = new URLSearchParams({ from_date: fromDate, to_date: toDate, limit: '300' }).toString()

    const requests = [
      fetch(`/api/method/hambaft.hambaft.api.get_events?${eventParams}`, { credentials: 'same-origin' }).then((res) => res.json()),
      fetch(`/api/method/hambaft.hambaft.api.get_tasks?${tasksParams}`, { credentials: 'same-origin' }).then((res) => res.json()),
      fetch('/api/method/hambaft.hambaft.api.get_habits?is_active=1&limit=120', { credentials: 'same-origin' }).then((res) => res.json()),
      fetch(`/api/method/hambaft.hambaft.api.get_habit_logs?${habitLogParams}`, { credentials: 'same-origin' }).then((res) => res.json()),
      fetch(`/api/method/hambaft.hambaft.api.get_finance_entries?${financeParams}`, { credentials: 'same-origin' }).then((res) => res.json()),
      fetch('/api/method/hambaft.hambaft.api.get_goals?limit=120', { credentials: 'same-origin' }).then((res) => res.json()),
      fetch('/api/method/hambaft.hambaft.api.get_supplements?is_active=1&limit=120', { credentials: 'same-origin' }).then((res) => res.json()),
    ]

    const [
      eventsResponse,
      tasksResponse,
      habitsResponse,
      habitLogsResponse,
      financeResponse,
      goalsResponse,
      supplementsResponse,
    ] = await Promise.all(requests)

    rawEvents.value = ensureSuccess(eventsResponse).events || []
    rawTasks.value = filterTasksForRange(ensureSuccess(tasksResponse).tasks || [], fromDate, toDate)
    rawHabits.value = ensureSuccess(habitsResponse).habits || []
    rawHabitLogs.value = ensureSuccess(habitLogsResponse).logs || []
    rawFinanceEntries.value = ensureSuccess(financeResponse).entries || []
    rawGoals.value = ensureSuccess(goalsResponse).goals || []
    rawReminders.value = buildSupplementReminders(ensureSuccess(supplementsResponse).supplements || [], fromDate, toDate)
  }

  async function load({ silent = false } = {}) {
    const { fromDate, toDate } = visibleRange.value
    if (silent) refreshing.value = true
    else loading.value = true
    error.value = ''

    try {
      await fetchDomainData(fromDate, toDate)
    } catch (err) {
      error.value = err?.message || 'بارگذاری تقویم انجام نشد.'
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  async function setView(view) {
    currentView.value = view
    anchorDateKey.value = selectedDateKey.value
    await load()
  }

  async function moveRange(direction) {
    if (currentView.value === 'month') {
      anchorDateKey.value = shiftJalaliMonth(anchorDateKey.value, direction)
      selectedDateKey.value = anchorDateKey.value
    } else if (currentView.value === 'week') {
      anchorDateKey.value = addDays(anchorDateKey.value, direction * 7)
      selectedDateKey.value = addDays(selectedDateKey.value, direction * 7)
    } else {
      anchorDateKey.value = addDays(anchorDateKey.value, direction)
      selectedDateKey.value = addDays(selectedDateKey.value, direction)
    }
    await load()
  }

  async function jumpToToday() {
    selectedDateKey.value = getTodayKey()
    anchorDateKey.value = getTodayKey()
    await load()
  }

  function selectDate(dateKey) {
    selectedDateKey.value = formatDateKey(dateKey)
    if (currentView.value === 'day') {
      anchorDateKey.value = selectedDateKey.value
    }
  }

  function setFilter(filterKey) {
    activeFilter.value = filterKey
  }

  function setDetailSection(sectionKey) {
    activeDetailSection.value = sectionKey
  }

  async function completeTask(item) {
    if (!item?.source?.name) return
    const response = await call('hambaft.hambaft.api.complete_task', { name: item.source.name })
    const task = response?.message?.data?.task || response?.data?.task || response?.message?.task || response?.task
    if (task) {
      const index = rawTasks.value.findIndex((entry) => entry.name === task.name)
      if (index !== -1) rawTasks.value[index] = task
    }
  }

  async function toggleHabit(item) {
    if (!item?.source?.name) return
    const nextValue = item.is_completed ? 0 : (item.target_value || 1)
    const nextStatus = item.is_completed ? 'pending' : 'done'
    const response = await call('hambaft.hambaft.api.log_habit', {
      habit: item.source.name,
      date: selectedDateKey.value,
      status: nextStatus,
      value: nextValue,
    })
    const log = response?.message?.data?.log || response?.data?.log || response?.message?.log || response?.log
    if (!log) return
    const index = rawHabitLogs.value.findIndex((entry) => entry.habit === log.habit && getDateKey(entry.date) === getDateKey(log.date))
    if (index === -1) rawHabitLogs.value.push(log)
    else rawHabitLogs.value[index] = log
  }

  async function refresh() {
    await load({ silent: true })
  }

  return {
    currentView,
    selectedDateKey,
    anchorDateKey,
    activeFilter,
    activeDetailSection,
    filters,
    loading,
    refreshing,
    error,
    bundles,
    selectedBundle,
    visibleSelectedBundle,
    monthTitle,
    monthWeeks,
    weekDays,
    activeTimelineItems,
    selectedUntimedTasks,
    selectedHabits,
    selectedFinanceItems,
    selectedGoals,
    selectedReminders,
    selectedHeadline,
    load,
    setView,
    moveRange,
    jumpToToday,
    selectDate,
    setFilter,
    setDetailSection,
    completeTask,
    toggleHabit,
    refresh,
    buildMonthCellSummary,
    getJalaliDateMeta,
    parseDateKey,
    addDays,
    addMonths,
  }
})
