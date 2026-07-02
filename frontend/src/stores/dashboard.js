import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDashboardStore = defineStore('dashboard', () => {
  const lifeScore = ref({ score: 72, breakdown: {} })
  const highlights = ref({})
  const financeSummary = ref({})
  const priorityItem = ref(null)
  const agenda = ref([])
  const focusGoal = ref(null)
  const financeSnapshot = ref(null)
  const summaryMetrics = ref([])
  const date = ref(null)
  const loading = ref(false)

  function fetchDashboard() {
    loading.value = true
    return fetch('/api/method/hambaft.hambaft.api.get_dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          const payload = data.data || {}
          lifeScore.value = payload.life_score || lifeScore.value
          highlights.value = payload.highlights || {}
          financeSummary.value = payload.finance_summary || {}
          priorityItem.value = payload.priority_item || null
          agenda.value = payload.agenda || []
          focusGoal.value = payload.focus_goal || null
          financeSnapshot.value = payload.finance_snapshot || null
          summaryMetrics.value = payload.summary_metrics || []
          date.value = payload.date || null
        }
        loading.value = false
      })
      .catch(() => {
        lifeScore.value = { score: 72, breakdown: { habit: 80, task: 65, goal: 60, mood: 75, finance: 90, water: 70 } }
        highlights.value = {
          tasks_due: [
            { name: 'task-1', title: 'مرور نقشه‌ی مالی ماه', status: 'todo', priority: 'high', due_date: '2026-07-01T09:30:00', description: 'بودجه و هزینه‌های ضروری را مرور کن.' },
            { name: 'task-2', title: 'جلسه طراحی هم‌بافت', status: 'todo', priority: 'urgent', due_date: '2026-07-01T12:30:00', description: 'نسخه‌ی اولیه‌ی Home را جمع‌بندی کن.' },
            { name: 'task-3', title: 'پیاده‌روی عصر', status: 'todo', priority: 'medium', due_date: '2026-07-01T17:00:00', description: '۴۵ دقیقه پیاده‌روی سبک.' },
          ],
          habits_pending: [
            { name: 'مکمل صبح' },
            { name: 'مرور شبانه' },
          ],
          events_today: [
            { name: 'event-1', title: 'جلسه UX', starts_at: '2026-07-01T09:30:00', ends_at: '2026-07-01T10:15:00', event_type: 'meeting' },
            { name: 'event-2', title: 'بررسی پیشرفت پروژه', starts_at: '2026-07-01T14:00:00', ends_at: '2026-07-01T14:45:00', event_type: 'work' },
          ],
          water_status: { consumed_ml: 1400, target_ml: 2000, percent: 70 },
          mood_today: { mood: 7, energy: 8 },
          finance_today: { income: 0, expense: 350000 },
          inspiration: { text: 'پیوستگی آرام، از جهش‌های کوتاه‌مدت ماندگارتر است.', author: 'هم‌بافت' },
        }
        financeSummary.value = {
          month_income: 0,
          month_expense: 4200000,
          savings_rate: 28,
        }
        priorityItem.value = {
          type: 'task',
          title: 'طراحی صفحه خانه هم‌بافت',
          starts_at: '2026-07-01T10:00:00',
          ends_at: '2026-07-01T12:30:00',
          subtitle: 'جمع‌بندی visual hierarchy و نسخه‌ی موبایل',
          priority: 'urgent',
          attendees: [{ name: 'پارس' }, { name: 'ملیکا' }, { name: 'بیتا' }],
        }
        agenda.value = [
          { title: 'جلسه UX', starts_at: '2026-07-01T09:30:00', ends_at: '2026-07-01T10:15:00', event_type: 'meeting' },
          { title: 'بررسی پیشرفت پروژه', starts_at: '2026-07-01T14:00:00', ends_at: '2026-07-01T14:45:00', event_type: 'work' },
        ]
        focusGoal.value = {
          title: 'ساخت نسخه‌ی شخصی هم‌بافت',
          progress_percent: 38,
          next_milestone: 'تکمیل Home و مسیر ورود',
          target_date: '2026-07-12',
        }
        financeSnapshot.value = {
          month_expense: 4200000,
          remaining_budget: 15800000,
          next_payment: {
            title: 'اشتراک اینترنت',
            due_date: '2026-07-03',
            amount: 790000,
          },
        }
        summaryMetrics.value = [
          { key: 'tasks', label: 'کارهای امروز', value: 3, suffix: 'کار' },
          { key: 'habits', label: 'عادت‌ها', value: 2, suffix: 'باقی' },
          { key: 'budget', label: 'بودجه', value: 72, suffix: '%' },
          { key: 'water_sleep', label: 'آب و خواب', value: '۶/۸', suffix: '' },
          { key: 'next_plan', label: 'برنامه بعدی', value: '۰۹:۳۰', suffix: '' },
        ]
        date.value = '2026-07-01'
        loading.value = false
      })
  }

  return {
    lifeScore,
    highlights,
    financeSummary,
    priorityItem,
    agenda,
    focusGoal,
    financeSnapshot,
    summaryMetrics,
    date,
    loading,
    fetchDashboard,
  }
})
