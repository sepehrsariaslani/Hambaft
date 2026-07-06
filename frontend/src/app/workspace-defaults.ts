import type { LifeData, Task } from '../legacy/types'
import type { ScheduleItem } from '../legacy/components/CalendarSection'

import { DEFAULT_CATEGORIES, TODAY_DATE } from '../legacy/initialData'

export function createEmptyLifeData(): LifeData {
  return {
    transactions: [],
    habits: [],
    goals: [],
    tasks: [],
    journalEntries: [],
    subscriptions: [],
    categories: DEFAULT_CATEGORIES,
    bankAccounts: [],
    profile: {
      name: 'کاربر هم‌بافت',
      avatarUrl: '',
      motto: 'مدیریت توازن هوشمند زندگی',
      dailyWaterGoal: 8,
      sleepGoalHours: 7.5,
    },
    sleepLogs: [],
    budgetSettings: { monthlyTotal: 0, categoryBudgets: {} },
    documents: [],
    occasions: [],
    mindfulnessSessions: [],
    weightLogs: [],
    vitalLogs: [],
    medications: [],
    doctorVisits: [],
    recurringTransactions: [],
    debts: [],
    assets: [],
    mealLogs: [],
    dietSetting: {
      type: 'none',
      startDate: TODAY_DATE,
    },
    workoutLogs: [],
    bodyMeasurementLogs: [],
    installments: [],
    contacts: [],
    moodLogs: [],
  }
}

function firstIncompleteTask(tasks: Task[]) {
  return tasks.find((task) => task.isDailyHighlight && !task.completed) || tasks.find((task) => !task.completed) || null
}

export function derivePrimaryPriority(tasks: Task[], scheduleItems: ScheduleItem[]) {
  const task = firstIncompleteTask(tasks)
  if (task) {
    return {
      title: task.title,
      time: task.dueDate || 'امروز',
      status: task.isDailyHighlight ? 'کار حیاتی' : 'در صف انجام',
    }
  }

  const scheduleItem = scheduleItems.find((item) => !item.completed)
  if (scheduleItem) {
    return {
      title: scheduleItem.title,
      time: scheduleItem.time || 'امروز',
      status: 'برنامه امروز',
    }
  }

  return {
    title: 'اولویت امروز هنوز انتخاب نشده',
    time: 'امروز',
    status: 'نیازمند برنامه‌ریزی',
  }
}

export function waterMlToGlasses(consumedMl: number, glassSizeMl = 250) {
  return Math.max(0, Math.round(Number(consumedMl || 0) / Math.max(glassSizeMl, 1)))
}
