import { getPersianMonthName, getPersianWeekday, toPersianDigits } from '../utils/jalali.js'

const DOMAIN_PRIORITY = {
  task: 0,
  event: 1,
  finance: 2,
  habit: 3,
  goal: 4,
  reminder: 5,
}

const IMPORTANCE_PRIORITY = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  return new Date(String(value).replace(' ', 'T'))
}

export function getDateKey(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  const date = toDate(value)
  if (!date || Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function dateRange(fromDate, toDate) {
  const days = []
  const start = toDateOnly(fromDate)
  const end = toDateOnly(toDate)
  while (start <= end) {
    days.push(start.toISOString().slice(0, 10))
    start.setDate(start.getDate() + 1)
  }
  return days
}

function toDateOnly(value) {
  const date = toDate(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toJalaliMeta(dateKey) {
  const date = toDateOnly(dateKey)
  const weekdayLabel = getPersianWeekday(date)
  return {
    year: Number(toPersianDigits(date.getFullYear()).replace(/[^\d۰-۹]/g, '')) || undefined,
    month: date.getMonth() + 1,
    day: date.getDate(),
    month_label: getPersianMonthName(date),
    weekday_index: (date.getDay() + 1) % 7,
    weekday_label: weekdayLabel,
    weekday_short: WEEKDAY_SHORT[(date.getDay() + 1) % 7],
    short_label: `${toPersianDigits(date.getDate())} ${getPersianMonthName(date)}`,
  }
}

function normalizeImportance(value) {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('urgent') || normalized.includes('فوری')) return 'urgent'
  if (normalized.includes('high') || normalized.includes('بالا')) return 'high'
  if (normalized.includes('low') || normalized.includes('پایین')) return 'low'
  return 'medium'
}

function getVisualConfig(type, subtype, importance) {
  if (type === 'event') {
    if (subtype === 'meeting') return { color_token: 'orange', icon_key: 'calendar', emphasis: 'solid' }
    if (subtype === 'health') return { color_token: 'green', icon_key: 'heart', emphasis: 'soft' }
    return { color_token: 'purple', icon_key: 'calendar', emphasis: 'soft' }
  }
  if (type === 'task') {
    return {
      color_token: importance === 'urgent' ? 'orange' : importance === 'high' ? 'yellow' : 'blue',
      icon_key: 'check-square',
      emphasis: importance === 'urgent' ? 'solid' : 'soft',
    }
  }
  if (type === 'habit') return { color_token: 'green', icon_key: 'leaf', emphasis: 'soft' }
  if (type === 'finance') return { color_token: 'pink', icon_key: 'wallet', emphasis: 'soft' }
  if (type === 'goal') return { color_token: 'purple', icon_key: 'target', emphasis: 'outline' }
  return { color_token: 'blue', icon_key: 'bell', emphasis: 'soft' }
}

function baseItem(item) {
  const importance = normalizeImportance(item.priority || item.importance)
  return {
    id: item.name || item.id,
    title: item.title || item.subject || item.name,
    subtitle: item.description || item.note || item.category || null,
    importance,
    is_completed: ['done', 'completed', 'انجام‌شده'].includes(String(item.status || '').toLowerCase()),
  }
}

function normalizeEvent(event) {
  const base = baseItem(event)
  return {
    ...base,
    type: 'event',
    subtype: event.event_type || 'event',
    starts_at: event.starts_at || null,
    ends_at: event.ends_at || null,
    is_all_day: Boolean(event.all_day),
    visual: getVisualConfig('event', event.event_type, base.importance),
    source: {
      doctype: 'Calendar Event',
      name: event.name,
      route: '/calendar',
      can_open: true,
      can_edit: true,
    },
  }
}

function normalizeTask(task) {
  const base = baseItem(task)
  const startsAt = task.due_date || task.starts_at || null
  const hasTime = Boolean(startsAt && String(startsAt).includes(':'))
  return {
    ...base,
    type: 'task',
    subtype: hasTime ? 'timed_task' : 'untimed_task',
    starts_at: startsAt,
    ends_at: task.ends_at || null,
    is_all_day: !hasTime,
    visual: getVisualConfig('task', null, base.importance),
    source: {
      doctype: 'Task',
      name: task.name,
      route: '/tasks',
      can_open: true,
      can_edit: true,
    },
  }
}

function normalizeHabit(habit, log) {
  const progressValue = log?.value ?? 0
  const targetValue = habit.target_value || 1
  return {
    id: habit.name,
    type: 'habit',
    subtype: habit.category || 'habit',
    title: habit.title || habit.name,
    subtitle: `${toPersianDigits(progressValue)}/${toPersianDigits(targetValue)} ${habit.unit || ''}`.trim(),
    starts_at: null,
    ends_at: null,
    is_all_day: true,
    is_completed: log?.status === 'done',
    importance: 'medium',
    current_value: progressValue,
    target_value: targetValue,
    visual: getVisualConfig('habit'),
    source: {
      doctype: 'Habit',
      name: habit.name,
      route: '/habits',
      can_open: true,
      can_edit: true,
    },
  }
}

function normalizeFinance(entry) {
  const isExpense = String(entry.type || '').toLowerCase() === 'expense'
  return {
    id: entry.name,
    type: 'finance',
    subtype: isExpense ? 'expense' : 'income',
    title: entry.title || entry.category || entry.name,
    subtitle: `${toPersianDigits(entry.amount || 0)} تومان`,
    starts_at: entry.date || null,
    ends_at: null,
    is_all_day: true,
    is_completed: false,
    importance: isExpense ? 'high' : 'medium',
    amount: entry.amount || 0,
    visual: getVisualConfig('finance'),
    source: {
      doctype: 'Finance Entry',
      name: entry.name,
      route: '/finance',
      can_open: true,
      can_edit: true,
    },
  }
}

function normalizeGoal(goal) {
  return {
    id: goal.name,
    type: 'goal',
    subtype: goal.category || 'goal',
    title: goal.title || goal.name,
    subtitle: `${toPersianDigits(Math.round(goal.progress_percent || 0))}٪ پیشرفت`,
    starts_at: goal.target_date || null,
    ends_at: null,
    is_all_day: true,
    is_completed: ['completed', 'done'].includes(String(goal.status || '').toLowerCase()),
    importance: 'medium',
    progress_percent: goal.progress_percent || 0,
    visual: getVisualConfig('goal'),
    source: {
      doctype: 'Goal',
      name: goal.name,
      route: '/goals',
      can_open: true,
      can_edit: true,
    },
  }
}

function isGoalActive(goal) {
  const status = String(goal.status || '').toLowerCase()
  return !['completed', 'done', 'cancelled', 'canceled', 'archived'].includes(status)
}

function normalizeReminder(reminder) {
  const startsAt = reminder.reminder_at || reminder.date || reminder.due_date || null
  return {
    id: reminder.name,
    type: 'reminder',
    subtype: reminder.linked_doctype || reminder.category || 'reminder',
    title: reminder.title || reminder.subject || reminder.name,
    subtitle: reminder.note || reminder.description || null,
    starts_at: startsAt,
    ends_at: null,
    is_all_day: !String(startsAt || '').includes(':'),
    is_completed: ['done', 'completed', 'sent'].includes(String(reminder.status || '').toLowerCase()),
    importance: 'medium',
    visual: getVisualConfig('reminder'),
    source: {
      doctype: reminder.doctype || 'Reminder',
      name: reminder.name,
      route: '/calendar',
      can_open: true,
      can_edit: true,
    },
  }
}

function sortBundleItems(items) {
  return items.slice().sort((a, b) => {
    const importanceDiff = (IMPORTANCE_PRIORITY[a.importance] ?? 9) - (IMPORTANCE_PRIORITY[b.importance] ?? 9)
    if (importanceDiff !== 0) return importanceDiff
    const typeDiff = (DOMAIN_PRIORITY[a.type] ?? 9) - (DOMAIN_PRIORITY[b.type] ?? 9)
    if (typeDiff !== 0) return typeDiff
    const aStart = a.starts_at || ''
    const bStart = b.starts_at || ''
    return String(aStart).localeCompare(String(bStart))
  })
}

function computeBadges(bundle) {
  const badges = []
  if (bundle.habits.length) {
    const done = bundle.habits.filter((item) => item.is_completed).length
    badges.push({
      id: `${bundle.date}-habit`,
      type: 'habit',
      label: `${toPersianDigits(done)}/${toPersianDigits(bundle.habits.length)}`,
      icon_key: 'leaf',
      color_token: 'green',
      count: bundle.habits.length,
      action: 'open-section',
    })
  }
  if (bundle.finance_items.length) {
    badges.push({
      id: `${bundle.date}-finance`,
      type: 'finance',
      label: toPersianDigits(bundle.finance_items.length),
      icon_key: 'wallet',
      color_token: 'pink',
      count: bundle.finance_items.length,
      action: 'open-section',
    })
  }
  if (bundle.goals.length) {
    badges.push({
      id: `${bundle.date}-goal`,
      type: 'goal',
      label: toPersianDigits(bundle.goals.length),
      icon_key: 'target',
      color_token: 'purple',
      count: bundle.goals.length,
      action: 'open-section',
    })
  }
  if (bundle.reminders.length) {
    badges.push({
      id: `${bundle.date}-reminder`,
      type: 'reminder',
      label: toPersianDigits(bundle.reminders.length),
      icon_key: 'bell',
      color_token: 'blue',
      count: bundle.reminders.length,
      action: 'open-section',
    })
  }
  return badges
}

function computeDominantColor(bundle) {
  const top = sortBundleItems([
    ...bundle.events,
    ...bundle.timed_tasks,
    ...bundle.untimed_tasks,
    ...bundle.finance_items,
    ...bundle.habits,
    ...bundle.goals,
    ...bundle.reminders,
  ])[0]
  return top?.visual?.color_token || 'neutral'
}

function computeDayScore(bundle) {
  const habitsScore = bundle.summary_counts.habits_due
    ? (bundle.summary_counts.habits_done / bundle.summary_counts.habits_due) * 4
    : 1.5
  const taskScore = (bundle.timed_tasks.filter((item) => item.is_completed).length + bundle.untimed_tasks.filter((item) => item.is_completed).length) * 1.25
  const eventScore = Math.min(bundle.events.length * 0.4, 1.2)
  const financePenalty = bundle.finance_items.filter((item) => item.subtype === 'expense').length * 0.2
  return Math.max(0, Math.min(10, Number((habitsScore + taskScore + eventScore + 2 - financePenalty).toFixed(1))))
}

export function buildCalendarDayBundles({
  fromDate,
  toDate,
  events = [],
  tasks = [],
  habits = [],
  habitLogs = [],
  financeEntries = [],
  goals = [],
  reminders = [],
}) {
  const bundles = new Map()
  for (const day of dateRange(fromDate, toDate)) {
    bundles.set(day, {
      date: day,
      jalali_date: toJalaliMeta(day),
      events: [],
      timed_tasks: [],
      untimed_tasks: [],
      habits: [],
      finance_items: [],
      goals: [],
      reminders: [],
      summary_counts: {
        total: 0,
        events: 0,
        timed_tasks: 0,
        untimed_tasks: 0,
        habits_due: 0,
        habits_done: 0,
        finance_due: 0,
        goals: 0,
        reminders: 0,
      },
      badges: [],
      dominant_color: 'neutral',
      day_score: 0,
    })
  }

  for (const event of events) {
    const key = getDateKey(event.starts_at)
    if (!bundles.has(key)) continue
    bundles.get(key).events.push(normalizeEvent(event))
  }

  for (const task of tasks) {
    const key = getDateKey(task.due_date || task.starts_at)
    if (!bundles.has(key)) continue
    const normalized = normalizeTask(task)
    if (normalized.subtype === 'timed_task') bundles.get(key).timed_tasks.push(normalized)
    else bundles.get(key).untimed_tasks.push(normalized)
  }

  const logsByHabitDate = new Map()
  for (const log of habitLogs) {
    logsByHabitDate.set(`${log.habit}::${getDateKey(log.date)}`, log)
  }

  for (const [date, bundle] of bundles.entries()) {
    for (const habit of habits) {
      if (habit.is_active === 0 || habit.is_active === false) continue
      const log = logsByHabitDate.get(`${habit.name}::${date}`)
      bundle.habits.push(normalizeHabit(habit, log))
    }
  }

  for (const entry of financeEntries) {
    const key = getDateKey(entry.date)
    if (!bundles.has(key)) continue
    bundles.get(key).finance_items.push(normalizeFinance(entry))
  }

  for (const goal of goals) {
    const normalized = normalizeGoal(goal)
    const targetKey = getDateKey(goal.target_date)
    for (const [date, bundle] of bundles.entries()) {
      if (!isGoalActive(goal)) {
        if (targetKey && targetKey === date) bundle.goals.push(normalized)
        continue
      }
      if (!targetKey || date <= targetKey) {
        bundle.goals.push(normalized)
      }
    }
  }

  for (const reminder of reminders) {
    const key = getDateKey(reminder.reminder_at || reminder.date || reminder.due_date)
    if (!bundles.has(key)) continue
    bundles.get(key).reminders.push(normalizeReminder(reminder))
  }

  return Array.from(bundles.values()).map((bundle) => {
    bundle.events = sortBundleItems(bundle.events)
    bundle.timed_tasks = sortBundleItems(bundle.timed_tasks)
    bundle.untimed_tasks = sortBundleItems(bundle.untimed_tasks)
    bundle.finance_items = sortBundleItems(bundle.finance_items)
    bundle.goals = sortBundleItems(bundle.goals)
    bundle.reminders = sortBundleItems(bundle.reminders)
    bundle.summary_counts.events = bundle.events.length
    bundle.summary_counts.timed_tasks = bundle.timed_tasks.length
    bundle.summary_counts.untimed_tasks = bundle.untimed_tasks.length
    bundle.summary_counts.habits_due = bundle.habits.length
    bundle.summary_counts.habits_done = bundle.habits.filter((item) => item.is_completed).length
    bundle.summary_counts.finance_due = bundle.finance_items.length
    bundle.summary_counts.goals = bundle.goals.length
    bundle.summary_counts.reminders = bundle.reminders.length
    bundle.summary_counts.total =
      bundle.events.length +
      bundle.timed_tasks.length +
      bundle.untimed_tasks.length +
      bundle.habits.length +
      bundle.finance_items.length +
      bundle.goals.length +
      bundle.reminders.length
    bundle.badges = computeBadges(bundle)
    bundle.dominant_color = computeDominantColor(bundle)
    bundle.day_score = computeDayScore(bundle)
    return bundle
  })
}

export function buildMonthCellSummary(bundle) {
  const previewCandidates = sortBundleItems([
    ...bundle.timed_tasks,
    ...bundle.events,
    ...bundle.untimed_tasks,
  ])
  const previewItems = previewCandidates.slice(0, 2)
  return {
    previewItems,
    badges: bundle.badges.slice(0, 3),
    overflowCount: Math.max(0, bundle.summary_counts.total - previewItems.length - bundle.badges.slice(0, 3).length),
  }
}
