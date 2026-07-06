type MaybeJson = string | null | undefined

export type SleepPreferences = {
  targetWakeTime: string
  targetSleepDuration: number
  birthdate: string
}

export type FinanceQuickTemplate = {
  id: string
  title: string
  type: 'income' | 'expense'
  amount: number
  category: string
  subcategory?: string
  description?: string
  bankAccountId?: string
  iconName?: string
}

export type CalendarPreferences = {
  weeklyDaysCount: number
  timelineFullDay: boolean
  showEvents: boolean
  showTasks: boolean
  showFinance: boolean
  showHabits: boolean
  showNutrition: boolean
  showSleep: boolean
  showWorkouts: boolean
}

export type CustomCalendarPreference = {
  id: string
  name: string
  color: 'purple' | 'green' | 'blue' | 'orange' | 'pink'
  active: boolean
}

export type NotionPagePreference = {
  id: string
  title: string
  blocks: Array<{
    id: string
    type: 'text' | 'h1' | 'h2' | 'todo' | 'bullet' | 'quote' | 'code'
    content: string
    completed?: boolean
  }>
  parentId?: string
  createdAt: string
}

export const DEFAULT_NOTION_PAGES: NotionPagePreference[] = [
  {
    id: 'blank-page',
    title: 'یادداشت جدید',
    createdAt: '2026-07-04',
    blocks: [
      {
        id: 'blank-title',
        type: 'h1',
        content: 'عنوان یادداشت',
      },
      {
        id: 'blank-body',
        type: 'text',
        content: '',
      },
    ],
  },
]

export const DEFAULT_SLEEP_PREFERENCES: SleepPreferences = {
  targetWakeTime: '06:30',
  targetSleepDuration: 8,
  birthdate: '2000-01-01',
}

export const DEFAULT_CUSTOM_EXERCISES: string[] = [
  'پرس سینه (Bench Press)',
  'اسکوات پا (Squat)',
  'ددلیفت (Deadlift)',
  'پرس سرشانه هالتر (Military Press)',
  'جلو بازو دمبل (Bicep Curl)',
  'پشت بازو سیم‌کش (Tricep Pushdown)',
  'زیربغل سیم‌کش (Lat Pulldown)',
  'پرس پا ماشین (Leg Press)',
]

export const DEFAULT_FINANCE_QUICK_TEMPLATES: FinanceQuickTemplate[] = [
  { id: 'qt-snapp', title: '🚕 اسنپ / تاکسی', type: 'expense', amount: 45000, category: 'transport', description: 'کرایه اسنپ' },
  { id: 'qt-super', title: '🛒 سوپرمارکت', type: 'expense', amount: 150000, category: 'food', description: 'خرید سوپرمارکتی' },
  { id: 'qt-bread', title: '🍞 خرید نان', type: 'expense', amount: 15000, category: 'food', description: 'نانوایی' },
  { id: 'qt-building', title: '🏢 شارژ ساختمان', type: 'expense', amount: 200000, category: 'rent', description: 'شارژ آپارتمان' },
]

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  weeklyDaysCount: 7,
  timelineFullDay: false,
  showEvents: true,
  showTasks: true,
  showFinance: true,
  showHabits: true,
  showNutrition: true,
  showSleep: true,
  showWorkouts: true,
}

export const DEFAULT_CUSTOM_CALENDARS: CustomCalendarPreference[] = [
  { id: 'work', name: 'کاری 💼', color: 'purple', active: true },
  { id: 'personal', name: 'شخصی 🏠', color: 'green', active: true },
  { id: 'family', name: 'خانواده 👨‍👩‍👧', color: 'orange', active: true },
  { id: 'general', name: 'عمومی 🌐', color: 'blue', active: true },
]

function parseJson<T>(value: MaybeJson, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function parseNotionPages(value: MaybeJson) {
  return parseJson<NotionPagePreference[]>(value, DEFAULT_NOTION_PAGES)
}

export function parseSleepPreferences(value: MaybeJson): SleepPreferences {
  return { ...DEFAULT_SLEEP_PREFERENCES, ...parseJson<Partial<SleepPreferences>>(value, DEFAULT_SLEEP_PREFERENCES) }
}

export function parseCustomExercises(value: MaybeJson) {
  return parseJson<string[]>(value, DEFAULT_CUSTOM_EXERCISES)
}

export function parseFinanceQuickTemplates(value: MaybeJson) {
  return parseJson<FinanceQuickTemplate[]>(value, DEFAULT_FINANCE_QUICK_TEMPLATES)
}

export function parseCalendarPreferences(value: MaybeJson): CalendarPreferences {
  return { ...DEFAULT_CALENDAR_PREFERENCES, ...parseJson<Partial<CalendarPreferences>>(value, DEFAULT_CALENDAR_PREFERENCES) }
}

export function parseCustomCalendars(value: MaybeJson) {
  return parseJson<CustomCalendarPreference[]>(value, DEFAULT_CUSTOM_CALENDARS)
}

// ─── Generic JSON blob helpers (state without dedicated DocTypes) ─────────

export function parseJsonArray<T>(value: MaybeJson): T[] {
  return parseJson<T[]>(value, [])
}

export function parseJsonObject<T extends object>(value: MaybeJson, fallback: T): T {
  return { ...fallback, ...parseJson<Partial<T>>(value, fallback) }
}

export type DailyHighlightsMap = Record<string, boolean>
export type TaskTimeMap = Record<string, number>
export type SubcategoriesMap = Record<string, string[]>

export function parseDailyHighlights(value: MaybeJson): DailyHighlightsMap {
  return parseJson<DailyHighlightsMap>(value, {})
}

export function parseTaskTime(value: MaybeJson): TaskTimeMap {
  return parseJson<TaskTimeMap>(value, {})
}

export function parseSubcategoriesMap(value: MaybeJson): SubcategoriesMap {
  return parseJson<SubcategoriesMap>(value, {})
}

