import { useEffect, useState } from 'react'

import { callGet, getList, getProfile } from './frappe'
import { createEmptyLifeData, waterMlToGlasses } from './workspace-defaults'
import {
  parseJsonArray,
  parseDailyHighlights,
  parseTaskTime,
  parseSubcategoriesMap,
} from './workspace-preferences'
import {
  mapBackendGoalCategory,
  mapBackendFinanceType,
  mapBackendTaskCategory,
  mapBackendTaskPriority,
  mapEventToScheduleItem,
} from './hambaft-api'
import type { ScheduleItem } from '../legacy/components/CalendarSection'
import type {
  Area,
  BankAccount,
  Contact,
  Document,
  CategoryDef,
  Goal,
  GoalCategory,
  GoalHabitLink,
  GoalFinanceLink,
  GoalLinkedProject,
  GoalType,
  ProgressMode,
  ContributionType,
  ContributionPeriod,
  Habit,
  JournalEntry,
  LifeData,
  MealLog,
  MindfulnessSession,
  MoodLog,
  Occasion,
  Project,
  SleepLog,
  Task,
  Transaction,
  UserProfile,
  WeightLog,
  WorkoutLog,
  BodyMeasurementLog,
} from '../legacy/types'

type BootstrapState = {
  loading: boolean
  error: string | null
  data: LifeData | null
  scheduleItems: ScheduleItem[]
  waterIntake: number
  settings: Record<string, any>
}

function parseNoteBlocks(raw: any): any[] | undefined {
  if (!raw) return undefined
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function mapTasks(items: any[]): Task[] {
  return items.map((item) => ({
    id: item.name,
    title: item.title || item.subject || item.name,
    completed: ['done', 'completed', 'انجام‌شده', 'انجام شده'].includes(String(item.status || '')),
    status: item.status || undefined,
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    description: item.description || '',
    dueDate: item.due_date ? String(item.due_date).slice(0, 10) : undefined,
    scheduledDate: item.scheduled_date ? String(item.scheduled_date) : undefined,
    scheduledTime: item.scheduled_time ? String(item.scheduled_time).slice(0, 5) : undefined,
    priority: mapBackendTaskPriority(item.priority),
    category: mapBackendTaskCategory(item.category),
    projectId: item.project || undefined,
    parentTaskId: item.parent_task || undefined,
    blockedBy: item.blocked_by_json ? JSON.parse(item.blocked_by_json) : [],
    blocking: item.blocking_json ? JSON.parse(item.blocking_json) : [],
    isDailyHighlight: !!item.is_daily_highlight,
    actualMinutes: item.actual_minutes || undefined,
    estimatedMinutes: item.estimated_minutes || undefined,
    areaId: item.area || undefined,
    effortType: item.effort_type === 'fixed' || item.effort_type === 'ثابت' ? 'fixed' : 'variable',
    noteBlocks: parseNoteBlocks(item.note_blocks_json),
  }))
}

function mapGoals(items: any[]): Goal[] {
  const goalTypeMap: Record<string, GoalType> = {
    'نتیجه‌ای': 'outcome', 'سنجه‌ای': 'metric', 'مبتنی‌بر_عادت': 'habit_driven',
    'تحویل_پروژه': 'project_delivery', 'پس‌انداز_مالی': 'savings', 'سرمایه‌گذاری': 'investment',
    'پرداخت_بدهی': 'debt_payoff', 'سلامت': 'health', 'یادگیری': 'learning', 'ثبات': 'consistency',
  }
  const progressModeMap: Record<string, ProgressMode> = {
    'دستی': 'manual', 'مقدار_سنجه': 'metric_value', 'تجمیع_عادت': 'habit_rollup',
    'تجمیع_پروژه': 'project_rollup', 'موجودی_مالی': 'finance_balance', 'پس‌انداز_مالی': 'finance_savings',
    'پرداخت_بدهی': 'debt_paydown', 'مرکب_وزنی': 'weighted_composite',
  }
  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    'پایین': 'low', 'متوسط': 'medium', 'بالا': 'high', 'فوری': 'urgent',
  }
  const goalLevelMap: Record<string, 'annual' | 'quarterly' | 'monthly' | 'custom'> = {
    'سالانه': 'annual', 'فصلی': 'quarterly', 'ماهانه': 'monthly', 'سفارشی': 'custom',
  }
  const contribTypeMap: Record<string, ContributionType> = {
    'تعداد_انجام': 'completion_count', 'نرخ_انجام': 'completion_rate', 'رکورد': 'streak',
    'مجموع_مقدار': 'quantity_sum', 'میانگین_مقدار': 'average_value', 'بله_خیر': 'boolean_success',
  }
  const contribPeriodMap: Record<string, ContributionPeriod> = {
    'روزانه': 'daily', 'هفتگی': 'weekly', 'ماهانه': 'monthly', 'کل': 'all',
  }
  const finTypeMap: Record<string, 'balance' | 'savings' | 'debt' | 'investment' | 'income_accumulated'> = {
    'موجودی_حساب': 'balance', 'پس‌انداز': 'savings', 'بدهی': 'debt', 'سرمایه‌گذاری': 'investment', 'درآمد_انباشته': 'income_accumulated',
  }

  return items.map((item) => {
    const linkedHabits: GoalHabitLink[] = (item.linked_habits || []).map((h: any) => ({
      habit: h.habit,
      habitTitle: h.habit_title,
      contributionType: contribTypeMap[h.contribution_type] || 'completion_count',
      weight: h.weight ?? 100,
      period: contribPeriodMap[h.period] || 'monthly',
      targetValue: h.target_value ?? undefined,
      capValue: h.cap_value ?? undefined,
      isNegative: !!h.is_negative,
      notes: h.notes,
    }))

    const linkedFinanceAccounts: GoalFinanceLink[] = (item.linked_finance_accounts || []).map((f: any) => ({
      financeAccount: f.finance_account,
      accountName: f.account_name,
      currentBalance: f.current_balance,
      financeType: finTypeMap[f.finance_type] || 'balance',
      initialAmount: f.initial_amount ?? undefined,
      targetAmount: f.target_amount ?? undefined,
      weight: f.weight ?? 100,
      notes: f.notes,
    }))

    const linkedProjects: GoalLinkedProject[] = (item.linked_projects || []).map((p: any) => ({
      name: p.name,
      title: p.title,
      status: p.status,
      progress: p.progress,
    }))

    const goal: Goal = {
      id: item.name,
      title: item.title || item.goal_name || item.name,
      description: item.description || '',
      category: mapBackendGoalCategory(item.category),
      goalType: goalTypeMap[item.goal_type] || undefined,
      progressMode: progressModeMap[item.progress_mode] || undefined,
      areaId: item.area || undefined,
      parentGoalId: item.parent_goal || undefined,
      goalLevel: goalLevelMap[item.goal_level] || undefined,
      targetDate: item.target_date ? String(item.target_date).slice(0, 10) : '',
      startDate: item.start_date ? String(item.start_date).slice(0, 10) : undefined,
      milestones: [],
      createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
      completed: ['done', 'completed', 'تکمیل‌شده', 'تکمیل شده'].includes(String(item.status || '')),
      targetValue: item.target_value ?? undefined,
      currentValue: item.current_value ?? undefined,
      unit: item.unit || undefined,
      progressPercent: item.progress_percent ?? undefined,
      derivedProgressDetail: item.derived_progress_detail || undefined,
      priority: priorityMap[item.priority] || undefined,
      color: item.color || undefined,
      icon: item.icon || undefined,
      status: item.status || undefined,
      metric:
        item.target_value || item.current_value || item.unit
          ? {
              name: item.title || item.goal_name || item.name,
              targetValue: Number(item.target_value || 0),
              startValue: 0,
              currentValue: Number(item.current_value || 0),
              unit: item.unit || '',
              logs: [],
            }
          : undefined,
      linkedHabits,
      linkedFinanceAccounts,
      linkedProjects,
      noteBlocks: parseNoteBlocks(item.note_blocks_json),
    }
    return goal
  })
}

function mapHabits(items: any[], logs: any[]): Habit[] {
  const logsByHabit = new Map<string, string[]>()

  logs.forEach((log) => {
    if (!['done', 'completed', 'انجام‌شده', 'انجام شده'].includes(String(log.status || ''))) return
    const key = log.habit
    const date = String(log.date).slice(0, 10)
    const current = logsByHabit.get(key) ?? []
    current.push(date)
    logsByHabit.set(key, current)
  })

  return items.map((item) => ({
    id: item.name,
    name: item.name,
    description: item.description || '',
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    logs: logsByHabit.get(item.name) ?? [],
    streak: item.streak_current || 0,
    targetQty: item.target_value || undefined,
    unit: item.unit || undefined,
  }))
}

function mapTransactions(items: any[]): Transaction[] {
  return items.map((item) => ({
    id: item.name,
    type: mapBackendFinanceType(item.type),
    amount: Number(item.amount || 0),
    category: item.category || 'other',
    subcategory: item.subcategory || undefined,
    date: item.date ? String(item.date).slice(0, 10) : '',
    description: item.description || item.title || item.name,
    bankAccountId: item.account || undefined,
  }))
}

function mapJournalEntries(notes: any[], moodLogs: any[]): JournalEntry[] {
  const noteEntries = notes.map((note) => ({
    id: note.name,
    date: note.date ? String(note.date).slice(0, 10) : (note.creation || '').slice(0, 10),
    title: note.title || note.name,
    content: note.content || note.note || '',
    mood: 'neutral' as const,
    gratitude: '',
  }))

  const moodEntries = moodLogs
    .filter((log) => log.note || log.gratitude)
    .map((log) => ({
      id: `mood-${log.name}`,
      date: String(log.date).slice(0, 10),
      title: 'ثبت حال و انرژی',
      content: log.note || '',
      mood: 'neutral' as const,
      gratitude: log.gratitude || '',
    }))

  return [...moodEntries, ...noteEntries]
}

function mapBankAccounts(items: any[]): BankAccount[] {
  return items.map((item) => ({
    id: item.name,
    bankName: item.bank_name || item.bank || 'بانک',
    accountName: item.account_name || item.title || item.name,
    balance: Number(item.balance || item.current_balance || 0),
    cardNumber: item.card_number || undefined,
    color: item.color || '#1E3A8A',
  }))
}

function mapCategories(items: any[]): CategoryDef[] {
  return items.map((item) => ({
    id: item.name,
    name: item.category_name || item.title || item.name,
    type: ['income', 'درآمد'].includes(String(item.category_type || '')) ? 'income' : 'expense',
    subcategories: [],
    color: item.color || undefined,
    icon: item.icon || undefined,
  }))
}

function mapProfile(profile: any, settings: any): UserProfile {
  return {
    name: settings?.display_name || profile?.full_name || profile?.name || 'کاربر',
    avatarUrl: '',
    motto: settings?.motto || 'مدیریت توازن هوشمند زندگی',
    workField: settings?.work_field || '',
    dailyWaterGoal: settings?.daily_water_goal || 8,
    sleepGoalHours: settings?.sleep_goal_hours || 7.5,
  }
}

function mapProjects(items: any[]): Project[] {
  return items.map((item) => ({
    id: item.name,
    title: item.title || item.name,
    description: item.description || '',
    notes: item.notes || '',
    completed: ['completed', 'تکمیل‌شده', 'تکمیل شده'].includes(String(item.status || '')),
    tasks: (item.tasks || []).map((task: any) => ({
      id: task.id || task.name,
      title: task.title || task.name,
      completed: Boolean(task.completed || task.status === 'انجام‌شده'),
      status: task.status || undefined,
      createdAt: (task.creation || item.creation || new Date().toISOString()).slice(0, 10),
      description: task.description || '',
      dueDate: task.dueDate || task.due_date || undefined,
      priority: mapBackendTaskPriority(task.priority),
      category: mapBackendTaskCategory(task.category),
    })),
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    linkedGoalId: item.goal || undefined,
    areaId: item.area || undefined,
    parentProjectId: item.parent_project || undefined,
    status:
      (item.status === 'برنامه‌ریزی'
        ? 'waiting'
        : item.status === 'فعال'
          ? 'in_progress'
          : item.status === 'متوقف'
            ? 'paused'
            : item.status === 'تکمیل‌شده'
              ? 'completed'
              : 'in_progress') as Project['status'],
    noteBlocks: parseNoteBlocks(item.note_blocks_json),
  }))
}

function mergeProjectsIntoGoals(goals: Goal[], projects: Project[]) {
  const goalMap = new Map(goals.map((goal) => [goal.id, { ...goal, projects: [...(goal.projects || [])] }]))
  const orphanProjects: Project[] = []

  for (const project of projects) {
    if (project.linkedGoalId && goalMap.has(project.linkedGoalId)) {
      goalMap.get(project.linkedGoalId)?.projects?.push(project)
    } else {
      orphanProjects.push(project)
    }
  }

  const merged = Array.from(goalMap.values())
  if (orphanProjects.length) {
    merged.push({
      id: 'synthetic-projects-goal',
      title: 'پروژه‌های مستقل',
      description: 'پروژه‌هایی که هنوز به هدف اصلی متصل نشده‌اند.',
      category: 'personal',
      targetDate: '',
      milestones: [],
      createdAt: new Date().toISOString().slice(0, 10),
      completed: false,
      projects: orphanProjects,
    })
  }

  return merged
}

function mapDocuments(items: any[]): Document[] {
  return items.map((item) => ({
    id: item.name,
    title: item.title || item.name,
    type: item.document_type || 'other',
    description: item.description || '',
    issuedBy: item.issued_by || undefined,
    issuedDate: item.issued_date || undefined,
    expiryDate: item.expiry_date || undefined,
    tags: item.tags || [],
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    notes: item.notes || undefined,
    linkedBankAccountId: item.linked_bank_account_id || undefined,
    linkedAssetId: item.linked_asset_id || undefined,
    image: item.image_url || undefined,
    reminderDate: item.reminder_date || undefined,
  }))
}

function mapOccasions(items: any[]): Occasion[] {
  return items.map((item) => ({
    id: item.name,
    title: item.title || item.name,
    type: item.occasion_type || 'event',
    date: item.occasion_date || '',
    person: item.person || undefined,
    recurrenceType: item.recurrence_type || 'once',
    reminderDaysBefore: Number(item.reminder_days_before || 0),
    notes: item.notes || undefined,
    color: item.color || undefined,
    estimatedBudget: Number(item.estimated_budget || 0),
    spentAmount: Number(item.spent_amount || 0),
  }))
}

function mapContacts(items: any[]): Contact[] {
  return items.map((item) => ({
    id: item.name,
    name: item.full_name || item.name,
    photoUrl: item.photo_url || undefined,
    category: item.contact_category || 'other',
    birthday: item.birthday || undefined,
    phone: item.phone || undefined,
    email: item.email || undefined,
    traits: item.traits || [],
    strengths: item.strengths || undefined,
    hobbies: item.hobbies || undefined,
    notes: item.notes || undefined,
    lastInteractionDate: item.last_interaction_date || undefined,
    lastInteractionType: item.last_interaction_type || undefined,
    interactionLogs: item.interaction_logs || [],
    relationshipScore: Number(item.relationship_score || 0),
    closenessTier: item.closeness_tier || 'acquaintance',
  }))
}

function mergeContactBirthdayOccasions(occasions: Occasion[], contacts: Contact[]): Occasion[] {
  const merged = [...occasions]
  const existingBirthdays = new Set(
    occasions
      .filter((occasion) => occasion.type === 'birthday')
      .map((occasion) => occasion.title),
  )

  for (const contact of contacts) {
    if (!contact.birthday) continue
    const title = `🎂 تولد: ${contact.name}`
    if (existingBirthdays.has(title)) continue
    merged.push({
      id: `contact-birthday-${contact.id}`,
      title,
      type: 'birthday',
      date: contact.birthday,
      recurrenceType: 'yearly',
      reminderDaysBefore: 3,
      notes: `یادآوری تولد ${contact.name} از دفتر ارتباطات CRM. برای تبریک، تماس بگیرید.`,
    })
  }

  return merged
}

function mapSleepLogs(items: any[]): SleepLog[] {
  return items.map((item) => ({
    id: item.name,
    date: item.log_date || '',
    sleepTime: item.sleep_time || '23:00',
    wakeTime: item.wake_time || '07:00',
    duration: Number(item.duration_hours || 0),
    quality: Number(item.quality || 0),
    energyLevel: Number(item.energy_level || 0),
    notes: item.notes || undefined,
  }))
}

function mapMindfulnessSessions(items: any[]): MindfulnessSession[] {
  return items.map((item) => ({
    id: item.name,
    date: item.session_date || '',
    type: item.session_type || 'meditation',
    durationMinutes: Number(item.duration_minutes || 0),
    stressLevelBefore: Number(item.stress_before || 0),
    stressLevelAfter: Number(item.stress_after || 0),
    notes: item.notes || undefined,
  }))
}

function mapMealLogs(items: any[]): MealLog[] {
  return items.map((item) => ({
    id: item.name,
    date: item.log_date || '',
    time: item.log_time || '12:00',
    type: item.meal_type || 'breakfast',
    foods: item.foods || '',
    calories: Number(item.calories || 0),
    protein: Number(item.protein || 0),
    carbs: Number(item.carbs || 0),
    fat: Number(item.fat || 0),
    waterGlasses: Number(item.water_glasses || 0),
  }))
}

function mapWorkoutLogs(items: any[]): WorkoutLog[] {
  return items.map((item) => ({
    id: item.name,
    date: item.workout_date || '',
    type: item.workout_type || 'other',
    cardioType: item.cardio_type || undefined,
    distanceKm: Number(item.distance_km || 0) || undefined,
    durationMinutes: Number(item.duration_minutes || 0),
    caloriesBurned: Number(item.calories_burned || 0) || undefined,
    gymSets: item.gym_sets || [],
    notes: item.notes || undefined,
  }))
}

function mapMeasurements(items: any[]) {
  const weightLogs: WeightLog[] = []
  const bodyMeasurementLogs: BodyMeasurementLog[] = []

  for (const item of items) {
    const measuredDate = String(item.measured_on || '').slice(0, 10)
    if (item.measurement_type === 'وزن') {
      weightLogs.push({
        id: item.name,
        date: measuredDate,
        weight: Number(item.value || 0),
        note: item.notes || undefined,
      })
    }
  }

  return { weightLogs, bodyMeasurementLogs }
}

function unwrap<T>(result: PromiseSettledResult<T>, fallback: T, label: string, onError?: (err: any) => void): T {
  if (result.status === 'fulfilled') {
    return result.value
  }
  console.warn(`[hambaft] ${label} failed:`, result.reason)
  onError?.(result.reason)
  return fallback
}

export function useBootstrapLifeData() {
  const [state, setState] = useState<BootstrapState>({
    loading: true,
    error: null,
    data: null,
    scheduleItems: [],
    waterIntake: 0,
    settings: {},
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const results = await Promise.allSettled([
          callGet<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_tasks'),
          callGet<{ data?: { goals?: any[] } }>('hambaft.hambaft.api.get_goals'),
          callGet<{ data?: { habits?: any[] } }>('hambaft.hambaft.api.get_habits'),
          callGet<{ data?: { logs?: any[] } }>('hambaft.hambaft.api.get_habit_logs'),
          callGet<{ data?: { notes?: any[] } }>('hambaft.hambaft.api.get_notes'),
          callGet<{ data?: { entries?: any[] } }>('hambaft.hambaft.api.get_finance_entries'),
          callGet<{ data?: { events?: any[] } }>('hambaft.hambaft.api.get_events'),
          getProfile(),
          callGet<{ data?: { settings?: any } }>('hambaft.hambaft.api.get_settings'),
          callGet<{ data?: { logs?: MoodLog[] } }>('hambaft.hambaft.api.get_mood_logs'),
          getList<any>('Hambaft Finance Account', { fields: ['*'], limit: 200 }),
          getList<any>('Hambaft Finance Category', { fields: ['*'], limit: 200 }),
          callGet<{ data?: { projects?: any[] } }>('hambaft.hambaft.api.get_projects'),
          callGet<{ data?: { documents?: any[] } }>('hambaft.hambaft.api.get_documents'),
          callGet<{ data?: { occasions?: any[] } }>('hambaft.hambaft.api.get_occasions'),
          callGet<{ data?: { contacts?: any[] } }>('hambaft.hambaft.api.get_contacts'),
          callGet<{ data?: { sleep_logs?: any[] } }>('hambaft.hambaft.api.get_sleep_logs'),
          callGet<{ data?: { sessions?: any[] } }>('hambaft.hambaft.api.get_mindfulness_sessions'),
          callGet<{ data?: { nutrition_logs?: any[] } }>('hambaft.hambaft.api.get_nutrition_logs'),
          callGet<{ data?: { workout_logs?: any[] } }>('hambaft.hambaft.api.get_workout_logs'),
          getList<any>('Hambaft Measurement', { fields: ['*'], limit: 500 }),
          callGet<{ data?: { consumed_ml?: number } }>('hambaft.hambaft.api.get_water_summary'),
          callGet<{ data?: { areas?: any[] } }>('hambaft.hambaft.api.get_areas'),
        ])

        const [
          tasksResult,
          goalsResult,
          habitsResult,
          habitLogsResult,
          notesResult,
          financeResult,
          eventsResult,
          profileResult,
          settingsResult,
          moodResult,
          accountResult,
          categoryResult,
          projectsResult,
          documentsResult,
          occasionsResult,
          contactsResult,
          sleepResult,
          mindfulnessResult,
          nutritionResult,
          workoutResult,
          measurementsResult,
          waterSummaryResult,
          areasResult,
        ] = results

        const tasks = unwrap(tasksResult, { data: { tasks: [] } }, 'get_tasks').data?.tasks ?? []
        const goals = unwrap(goalsResult, { data: { goals: [] } }, 'get_goals').data?.goals ?? []
        const habits = unwrap(habitsResult, { data: { habits: [] } }, 'get_habits').data?.habits ?? []
        const habitLogs = unwrap(habitLogsResult, { data: { logs: [] } }, 'get_habit_logs').data?.logs ?? []
        const notes = unwrap(notesResult, { data: { notes: [] } }, 'get_notes').data?.notes ?? []
        const financeEntries = unwrap(financeResult, { data: { entries: [] } }, 'get_finance_entries').data?.entries ?? []
        const events = unwrap(eventsResult, { data: { events: [] } }, 'get_events').data?.events ?? []
        const moodLogs = unwrap(moodResult, { data: { logs: [] } }, 'get_mood_logs').data?.logs ?? []
        const settings = unwrap(settingsResult, { data: { settings: {} } }, 'get_settings').data?.settings ?? {}
        const projects = unwrap(projectsResult, { data: { projects: [] } }, 'get_projects').data?.projects ?? []
        const documents = unwrap(documentsResult, { data: { documents: [] } }, 'get_documents').data?.documents ?? []
        const occasions = unwrap(occasionsResult, { data: { occasions: [] } }, 'get_occasions').data?.occasions ?? []
        const contacts = unwrap(contactsResult, { data: { contacts: [] } }, 'get_contacts').data?.contacts ?? []
        const sleepLogs = unwrap(sleepResult, { data: { sleep_logs: [] } }, 'get_sleep_logs').data?.sleep_logs ?? []
        const mindfulnessSessions = unwrap(mindfulnessResult, { data: { sessions: [] } }, 'get_mindfulness_sessions').data?.sessions ?? []
        const nutritionLogs = unwrap(nutritionResult, { data: { nutrition_logs: [] } }, 'get_nutrition_logs').data?.nutrition_logs ?? []
        const workoutLogs = unwrap(workoutResult, { data: { workout_logs: [] } }, 'get_workout_logs').data?.workout_logs ?? []
        const measurementsRows = unwrap(measurementsResult, [], 'get_measurements')
        const waterSummaryPayload = unwrap(waterSummaryResult, { data: { consumed_ml: 0 } }, 'get_water_summary')
        const areasRows = unwrap(areasResult, { data: { areas: [] } }, 'get_areas').data?.areas ?? []

        const profile = unwrap(profileResult, null, 'get_profile')
        const accountRows = unwrap(accountResult, [], 'get_accounts')
        const categoryRows = unwrap(categoryResult, [], 'get_categories')

        // If profile/auth completely failed, surface it as fatal
        if (!profile) {
          if (!cancelled) {
            setState({
              loading: false,
              error: 'نشست کاربر منقضی شده یا ارتباط با سرور برقرار نشد. لطفاً دوباره وارد شوید.',
              data: null,
              scheduleItems: [],
              waterIntake: 0,
              settings: {},
            })
          }
          return
        }

        const measurements = mapMeasurements(measurementsRows)
        const mappedGoals = mergeProjectsIntoGoals(mapGoals(goals), mapProjects(projects))
        const mappedContacts = mapContacts(contacts)
        const mappedOccasions = mergeContactBirthdayOccasions(mapOccasions(occasions), mappedContacts)
        const emptyData = createEmptyLifeData()

        // Restore state stored as JSON blobs on Profile Settings
        const debtsBlob = parseJsonArray<any>(settings.debts_json)
        const subscriptionsBlob = parseJsonArray<any>(settings.subscriptions_json)
        const recurringBlob = parseJsonArray<any>(settings.recurring_transactions_json)
        const assetsBlob = parseJsonArray<any>(settings.assets_json)
        const installmentsBlob = parseJsonArray<any>(settings.installments_json)
        const dietBlob = parseJsonArray<any>(settings.diet_setting_json)
        const dietSetting = dietBlob.length ? dietBlob[0] : undefined
        const budgetBlob = parseJsonArray<any>(settings.budget_settings_json)
        const budgetSettingsOverride = budgetBlob.length ? budgetBlob[0] : null
        const subcategoriesMap = parseSubcategoriesMap(settings.subcategories_json)
        const taskTimeMap = parseTaskTime(settings.task_time_json)
        const dailyHighlightsMap = parseDailyHighlights(settings.daily_highlights_json)
        const goalHabitsMap = parseSubcategoriesMap(settings.goal_habits_json) as unknown as Record<string, any[]>

        const mappedCategories = mapCategories(categoryRows).map((cat) => (
          subcategoriesMap[cat.id]?.length
            ? { ...cat, subcategories: subcategoriesMap[cat.id] }
            : cat
        ))

        const applyTaskEnhancements = (tasksList: any[]): any[] => tasksList.map((task) => ({
          ...task,
          totalTimeSpent: taskTimeMap[task.id] ?? task.totalTimeSpent ?? 0,
          isDailyHighlight: dailyHighlightsMap[task.id] ?? task.isDailyHighlight ?? false,
        }))

        const enhancedGoals = mappedGoals.map((goal) => ({
          ...goal,
          habits: Array.isArray(goalHabitsMap[goal.id]) ? goalHabitsMap[goal.id] : goal.habits,
          projects: (goal.projects || []).map((p: any) => ({
            ...p,
            tasks: applyTaskEnhancements(p.tasks || []),
          })),
        }))

        const data: LifeData = {
          ...emptyData,
          tasks: applyTaskEnhancements(mapTasks(tasks)),
          goals: enhancedGoals,
          habits: mapHabits(habits, habitLogs),
          transactions: mapTransactions(financeEntries),
          journalEntries: mapJournalEntries(notes, moodLogs as any[]),
          categories: mappedCategories,
          bankAccounts: mapBankAccounts(accountRows),
          profile: mapProfile(profile, settings),
          sleepLogs: mapSleepLogs(sleepLogs),
          budgetSettings: budgetSettingsOverride && typeof budgetSettingsOverride === 'object'
            ? budgetSettingsOverride
            : { monthlyTotal: Number(settings.monthly_budget || 0), categoryBudgets: {} },
          documents: mapDocuments(documents),
          occasions: mappedOccasions,
          mindfulnessSessions: mapMindfulnessSessions(mindfulnessSessions),
          weightLogs: measurements.weightLogs,
          mealLogs: mapMealLogs(nutritionLogs),
          workoutLogs: mapWorkoutLogs(workoutLogs),
          bodyMeasurementLogs: measurements.bodyMeasurementLogs,
          contacts: mappedContacts,
          moodLogs: moodLogs as any[],
          debts: debtsBlob,
          subscriptions: subscriptionsBlob,
          recurringTransactions: recurringBlob,
          assets: assetsBlob,
          installments: installmentsBlob,
          dietSetting: dietSetting || emptyData.dietSetting,
          areas: areasRows.map((item: any) => ({
            id: item.name,
            title: item.title || item.name,
            description: item.description || '',
            color: item.color || undefined,
            icon: item.icon || undefined,
            status: item.status === 'فعال' ? 'active' : item.status === 'غیرفعال' ? 'inactive' : item.status === 'بایگانی' ? 'archived' : (item.status || undefined),
            sortOrder: item.sort_order || undefined,
            projectCount: item.project_count || undefined,
            taskCount: item.task_count || undefined,
            goalCount: item.goal_count || undefined,
            completedTasks: item.completed_tasks || undefined,
            completedProjects: item.completed_projects || undefined,
            trackedMinutes: item.tracked_minutes || undefined,
          })),
        }

        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            data,
            scheduleItems: (events || []).map(mapEventToScheduleItem),
            waterIntake: waterMlToGlasses(waterSummaryPayload?.data?.consumed_ml || 0),
            settings,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load hambaft data',
            data: null,
            scheduleItems: [],
            waterIntake: 0,
            settings: {},
          })
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
