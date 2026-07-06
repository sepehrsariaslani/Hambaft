import { describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES, TODAY_DATE } from '../legacy/initialData'
import { createEmptyLifeData, derivePrimaryPriority } from '../app/workspace-defaults'

describe('workspace defaults', () => {
  it('creates an empty DB-backed life data object without sample records', () => {
    expect(createEmptyLifeData()).toMatchObject({
      transactions: [],
      habits: [],
      goals: [],
      tasks: [],
      journalEntries: [],
      subscriptions: [],
      categories: DEFAULT_CATEGORIES,
      bankAccounts: [],
      sleepLogs: [],
      documents: [],
      occasions: [],
      mindfulnessSessions: [],
      weightLogs: [],
      mealLogs: [],
      workoutLogs: [],
      bodyMeasurementLogs: [],
      installments: [],
      contacts: [],
      moodLogs: [],
      budgetSettings: {
        monthlyTotal: 0,
        categoryBudgets: {},
      },
      dietSetting: {
        type: 'none',
        startDate: TODAY_DATE,
      },
    })
  })

  it('derives the main priority from the first incomplete highlighted task', () => {
    expect(
      derivePrimaryPriority(
        [
          {
            id: 'TASK-1',
            title: 'جمع‌بندی تسک‌های امروز',
            completed: false,
            createdAt: TODAY_DATE,
            isDailyHighlight: true,
          },
        ],
        [],
      ),
    ).toMatchObject({
      title: 'جمع‌بندی تسک‌های امروز',
      status: 'کار حیاتی',
    })
  })

  it('falls back to a neutral empty priority when no task exists', () => {
    expect(derivePrimaryPriority([], [])).toMatchObject({
      title: 'اولویت امروز هنوز انتخاب نشده',
      time: 'امروز',
      status: 'نیازمند برنامه‌ریزی',
    })
  })
})
