import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCalendarDayBundles,
  buildMonthCellSummary,
  getDateKey,
} from '../calendarBundle.js'

test('buildCalendarDayBundles groups mixed domain data into per-day bundles', () => {
  const bundles = buildCalendarDayBundles({
    fromDate: '2026-07-01',
    toDate: '2026-07-02',
    events: [
      {
        name: 'evt-1',
        title: 'جلسه تیم',
        event_type: 'meeting',
        starts_at: '2026-07-02 10:00:00',
        ends_at: '2026-07-02 11:30:00',
      },
    ],
    tasks: [
      {
        name: 'task-1',
        title: 'طراحی وایرفریم',
        priority: 'high',
        status: 'todo',
        due_date: '2026-07-02 09:30:00',
      },
      {
        name: 'task-2',
        title: 'مرور متن صفحه',
        priority: 'medium',
        status: 'todo',
        due_date: '2026-07-02',
      },
    ],
    habits: [
      {
        name: 'habit-1',
        title: 'نوشیدن آب',
        target_value: 8,
        unit: 'لیوان',
        is_active: 1,
      },
    ],
    habitLogs: [
      {
        name: 'log-1',
        habit: 'habit-1',
        date: '2026-07-02',
        status: 'done',
        value: 6,
      },
    ],
    financeEntries: [
      {
        name: 'fin-1',
        title: 'قسط اینترنت',
        type: 'expense',
        amount: 380000,
        category: 'اشتراک',
        date: '2026-07-02',
      },
    ],
    goals: [
      {
        name: 'goal-1',
        title: 'ساخت تقویم جدید',
        status: 'active',
        progress_percent: 42,
        target_date: '2026-07-15',
      },
    ],
    reminders: [
      {
        name: 'rem-1',
        title: 'تماس با پزشک',
        reminder_at: '2026-07-02 16:00:00',
        status: 'pending',
      },
    ],
  })

  assert.equal(bundles.length, 2)

  const target = bundles.find((bundle) => bundle.date === '2026-07-02')
  assert.ok(target)
  assert.equal(target.events.length, 1)
  assert.equal(target.timed_tasks.length, 1)
  assert.equal(target.untimed_tasks.length, 1)
  assert.equal(target.habits.length, 1)
  assert.equal(target.finance_items.length, 1)
  assert.equal(target.goals.length, 1)
  assert.equal(target.reminders.length, 1)
  assert.equal(target.summary_counts.total, 7)
  assert.equal(target.summary_counts.habits_done, 1)
  assert.equal(target.badges.some((badge) => badge.type === 'habit'), true)
})

test('buildMonthCellSummary limits visible previews and collapses overflow', () => {
  const bundles = buildCalendarDayBundles({
    fromDate: '2026-07-02',
    toDate: '2026-07-02',
    events: [
      { name: 'evt-1', title: 'جلسه محصول', event_type: 'meeting', starts_at: '2026-07-02 10:00:00' },
      { name: 'evt-2', title: 'هماهنگی تیم', event_type: 'meeting', starts_at: '2026-07-02 11:00:00' },
    ],
    tasks: [
      { name: 'task-1', title: 'ارسال ایمیل', priority: 'urgent', status: 'todo', due_date: '2026-07-02 08:30:00' },
      { name: 'task-2', title: 'مرور اسناد', priority: 'medium', status: 'todo', due_date: '2026-07-02' },
    ],
    habits: [
      { name: 'habit-1', title: 'آب', target_value: 8, unit: 'لیوان', is_active: 1 },
    ],
    habitLogs: [],
    financeEntries: [],
    goals: [],
    reminders: [],
  })

  const summary = buildMonthCellSummary(bundles[0])
  assert.equal(summary.previewItems.length, 2)
  assert.equal(summary.overflowCount, 2)
  assert.equal(summary.previewItems[0].title, 'ارسال ایمیل')
})

test('getDateKey normalizes ISO and datetime inputs to day strings', () => {
  assert.equal(getDateKey('2026-07-02 10:45:00'), '2026-07-02')
  assert.equal(getDateKey('2026-07-02T10:45:00'), '2026-07-02')
  assert.equal(getDateKey('2026-07-02'), '2026-07-02')
})
