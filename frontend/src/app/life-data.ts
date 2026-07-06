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
  BankAccount,
  Contact,
  Document,
  CategoryDef,
  Goal,
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

function mapTasks(items: any[]): Task[] {
  return items.map((item) => ({
    id: item.name,
    title: item.title || item.subject || item.name,
    completed: ['done', 'completed', 'انجام‌شده', 'انجام شده'].includes(String(item.status || '')),
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    description: item.description || '',
    dueDate: item.due_date ? String(item.due_date).slice(0, 10) : undefined,
    priority: mapBackendTaskPriority(item.priority),
    category: mapBackendTaskCategory(item.category),
  }))
}

function mapGoals(items: any[]): Goal[] {
  return items.map((item) => ({
    id: item.name,
    title: item.title || item.goal_name || item.name,
    description: item.description || '',
    category: mapBackendGoalCategory(item.category),
    targetDate: item.target_date ? String(item.target_date).slice(0, 10) : '',
    milestones: [],
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    completed: ['done', 'completed', 'تکمیل‌شده', 'تکمیل شده'].includes(String(item.status || '')),
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
  }))
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
    name: settings?.display_name || profile.full_name || profile.name || 'کاربر',
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
      createdAt: (task.creation || item.creation || new Date().toISOString()).slice(0, 10),
      description: task.description || '',
      dueDate: task.dueDate || task.due_date || undefined,
      priority: mapBackendTaskPriority(task.priority),
      category: mapBackendTaskCategory(task.category),
    })),
    createdAt: (item.creation || item.modified || new Date().toISOString()).slice(0, 10),
    linkedGoalId: item.goal || undefined,
    status:
      item.status === 'برنامه‌ریزی'
        ? 'waiting'
        : item.status === 'فعال'
          ? 'in_progress'
          : item.status === 'متوقف'
            ? 'paused'
            : item.status === 'تکمیل‌شده'
              ? 'completed'
              : 'in_progress',
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
        const [
          tasksPayload,
          goalsPayload,
          habitsPayload,
          habitLogsPayload,
          notesPayload,
          financePayload,
          eventsPayload,
          profile,
          settingsPayload,
          moodPayload,
          accountRows,
          categoryRows,
          projectsPayload,
          documentsPayload,
          occasionsPayload,
          contactsPayload,
          sleepPayload,
          mindfulnessPayload,
          nutritionPayload,
          workoutPayload,
          measurementsRows,
          waterSummaryPayload,
        ] = await Promise.all([
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
        ])

        const tasks = tasksPayload?.data?.tasks ?? []
        const goals = goalsPayload?.data?.goals ?? []
        const habits = habitsPayload?.data?.habits ?? []
        const habitLogs = habitLogsPayload?.data?.logs ?? []
        const notes = notesPayload?.data?.notes ?? []
        const financeEntries = financePayload?.data?.entries ?? []
        const events = eventsPayload?.data?.events ?? []
        const moodLogs = moodPayload?.data?.logs ?? []
        const settings = settingsPayload?.data?.settings ?? {}
        const projects = projectsPayload?.data?.projects ?? []
        const documents = documentsPayload?.data?.documents ?? []
        const occasions = occasionsPayload?.data?.occasions ?? []
        const contacts = contactsPayload?.data?.contacts ?? []
        const sleepLogs = sleepPayload?.data?.sleep_logs ?? []
        const mindfulnessSessions = mindfulnessPayload?.data?.sessions ?? []
        const nutritionLogs = nutritionPayload?.data?.nutrition_logs ?? []
        const workoutLogs = workoutPayload?.data?.workout_logs ?? []
        const measurements = mapMeasurements(measurementsRows)
        const mappedGoals = mergeProjectsIntoGoals(mapGoals(goals), mapProjects(projects))
        const mappedContacts = mapContacts(contacts)
        const mappedOccasions = mergeContactBirthdayOccasions(mapOccasions(occasions), mappedContacts)
        const emptyData = createEmptyLifeData()

        const data: LifeData = {
          ...emptyData,
          tasks: mapTasks(tasks),
          goals: mappedGoals,
          habits: mapHabits(habits, habitLogs),
          transactions: mapTransactions(financeEntries),
          journalEntries: mapJournalEntries(notes, moodLogs as any[]),
          categories: mapCategories(categoryRows),
          bankAccounts: mapBankAccounts(accountRows),
          profile: mapProfile(profile, settings),
          sleepLogs: mapSleepLogs(sleepLogs),
          budgetSettings: { monthlyTotal: Number(settings.monthly_budget || 0), categoryBudgets: {} },
          documents: mapDocuments(documents),
          occasions: mappedOccasions,
          mindfulnessSessions: mapMindfulnessSessions(mindfulnessSessions),
          weightLogs: measurements.weightLogs,
          mealLogs: mapMealLogs(nutritionLogs),
          workoutLogs: mapWorkoutLogs(workoutLogs),
          bodyMeasurementLogs: measurements.bodyMeasurementLogs,
          contacts: mappedContacts,
          moodLogs: moodLogs as any[],
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
