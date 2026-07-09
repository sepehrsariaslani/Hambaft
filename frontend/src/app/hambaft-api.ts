import type { ScheduleItem } from '../legacy/components/CalendarSection'
import type {
  BankAccount,
  BodyMeasurementLog,
  CategoryDef,
  Contact,
  Document,
  Goal,
  Habit,
  JournalEntry,
  MealLog,
  MindfulnessSession,
  Occasion,
  Project,
  SleepLog,
  Task,
  Transaction,
  UserProfile,
  WeightLog,
  WorkoutLog,
} from '../legacy/types'
import { call, checkFrappeSession, createDoc, deleteDoc, updateDoc } from './frappe'

const taskPriorityToBackend: Record<string, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
}

const taskPriorityFromBackend: Record<string, Task['priority']> = {
  پایین: 'low',
  متوسط: 'medium',
  بالا: 'high',
  فوری: 'high',
}

const taskCategoryToBackend: Record<string, string> = {
  work: 'شغلی',
  personal: 'شخصی',
  health: 'سلامت',
  finance: 'مالی',
  learning: 'آموزشی',
  other: 'شخصی',
}

const taskCategoryFromBackend: Record<string, Task['category']> = {
  شغلی: 'work',
  شخصی: 'personal',
  سلامت: 'health',
  مالی: 'finance',
  آموزشی: 'learning',
}

const goalCategoryToBackend: Record<string, string> = {
  health: 'سلامت',
  financial: 'مالی',
  career: 'شغلی',
  learning: 'آموزشی',
  personal: 'شخصی',
  other: 'شخصی',
}

const goalCategoryFromBackend: Record<string, Goal['category']> = {
  سلامت: 'health',
  مالی: 'financial',
  شغلی: 'career',
  آموزشی: 'learning',
  شخصی: 'personal',
}

const habitCategoryToBackend: Record<string, string> = {
  health: 'سلامت',
  productivity: 'بهره‌وری',
  mindfulness: 'ذهن‌آگاهی',
  fitness: 'تناسب اندام',
  learning: 'آموزشی',
  social: 'اجتماعی',
}

const financeTypeToBackend: Record<string, string> = {
  income: 'درآمد',
  expense: 'هزینه',
}

const financeTypeFromBackend: Record<string, Transaction['type']> = {
  درآمد: 'income',
  هزینه: 'expense',
}

const eventTypeFromCategory: Record<ScheduleItem['category'], string> = {
  purple: 'جلسه',
  green: 'شخصی',
  blue: 'یادآوری',
  orange: 'مهلت',
  pink: 'سلامتی',
}

const categoryFromEventType: Record<string, ScheduleItem['category']> = {
  جلسه: 'purple',
  شخصی: 'green',
  یادآوری: 'blue',
  مهلت: 'orange',
  سلامتی: 'pink',
}

const projectStatusToBackend: Record<NonNullable<Project['status']>, string> = {
  waiting: 'برنامه‌ریزی',
  in_progress: 'فعال',
  paused: 'متوقف',
  completed: 'تکمیل‌شده',
}

const PERSIAN_DIGIT_MAP: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}

function normalizeAsciiDigits(value?: string | null) {
  return String(value || '').replace(/[۰-۹٠-٩]/g, (digit) => PERSIAN_DIGIT_MAP[digit] || digit)
}

function normalizeClockValue(value?: string | null) {
  const normalized = normalizeAsciiDigits(value).trim().replace(/[：]/g, ':')
  if (!normalized) {
    return '09:00'
  }

  const match = normalized.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) {
    return normalized
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return normalized
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function splitDatetime(value?: string | null): { date?: string; time: string } {
  if (!value) {
    return { time: '09:00' }
  }

  const iso = String(value).replace(' ', 'T')
  const date = iso.slice(0, 10)
  const time = iso.slice(11, 16) || '09:00'
  return { date, time }
}

function combineDateTime(date?: string, time?: string): string | undefined {
  if (!date) return undefined
  const normalizedDate = normalizeAsciiDigits(date)
  const normalizedTime = normalizeClockValue(time)
  return `${normalizedDate} ${normalizedTime || '09:00'}:00`
}

function addHours(date: string | undefined, time: string | undefined, durationHours: number | undefined): string | undefined {
  const start = combineDateTime(date, time)
  if (!start) return undefined
  const startDate = new Date(start.replace(' ', 'T'))
  if (Number.isNaN(startDate.getTime())) {
    return undefined
  }
  const endDate = new Date(startDate.getTime() + Math.max(durationHours || 1, 1) * 60 * 60 * 1000)
  return `${endDate.toISOString().slice(0, 10)} ${endDate.toISOString().slice(11, 19)}`
}

export function mapBackendTaskPriority(value?: string | null): Task['priority'] {
  return taskPriorityFromBackend[String(value || '')] || 'medium'
}

export function mapBackendTaskCategory(value?: string | null): Task['category'] {
  return taskCategoryFromBackend[String(value || '')] || 'other'
}

export function mapBackendGoalCategory(value?: string | null): Goal['category'] {
  return goalCategoryFromBackend[String(value || '')] || 'personal'
}

export function mapBackendFinanceType(value?: string | null): Transaction['type'] {
  return financeTypeFromBackend[String(value || '')] || 'expense'
}

export function mapEventToScheduleItem(event: any): ScheduleItem {
  const start = splitDatetime(event.starts_at)
  const end = splitDatetime(event.ends_at)
  const startDate = event.starts_at ? new Date(String(event.starts_at).replace(' ', 'T')) : null
  const endDate = event.ends_at ? new Date(String(event.ends_at).replace(' ', 'T')) : null
  const durationHours =
    startDate && endDate ? Math.max(1, Math.round(((endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000)) * 10) / 10) : 1

  return {
    id: event.name,
    title: event.title || event.name,
    desc: event.description || '',
    time: start.time,
    completed: false,
    category: categoryFromEventType[event.event_type] || 'green',
    date: start.date,
    endDate: end.date,
    durationHours,
  }
}

export function toTaskPayload(task: Task): Record<string, unknown> {
  return {
    title: task.title,
    description: task.description || '',
    due_date: combineDateTime(task.dueDate, '09:00'),
    priority: taskPriorityToBackend[task.priority || 'medium'] || 'متوسط',
    category: taskCategoryToBackend[task.category || 'other'] || 'شخصی',
    status: task.completed ? 'انجام‌شده' : 'انجام‌نشده',
    project: task.projectId || null,
    noteBlocks: task.noteBlocks || [],
  }
}

export function toGoalPayload(goal: Goal): Record<string, unknown> {
  const metric = goal.metric
  return {
    title: goal.title,
    description: goal.description || '',
    category: goalCategoryToBackend[goal.category || 'personal'] || 'شخصی',
    area: goal.areaId || null,
    target_date: goal.targetDate || null,
    status: goal.completed ? 'تکمیل‌شده' : 'فعال',
    target_value: metric?.targetValue ?? null,
    current_value: metric?.currentValue ?? null,
    unit: metric?.unit ?? null,
    notes: goal.visionAffirmation || '',
    noteBlocks: goal.noteBlocks || [],
  }
}

export function toHabitPayload(name: string, description: string, extras?: Partial<Habit>): Record<string, unknown> {
  const autoTrackCategoryMap: Record<string, string> = {
    sleep: 'سلامت',
    mindfulness: 'ذهن‌آگاهی',
    workout: 'تناسب اندام',
    meal: 'سلامت',
    none: 'بهره‌وری',
  }

  return {
    name,
    title: name,
    description: description || '',
    frequency: 'روزانه',
    category: autoTrackCategoryMap[String(extras?.autoTrackType || 'none')] || 'بهره‌وری',
    start_date: extras?.createdAt || undefined,
    is_active: 1,
  }
}

export function toJournalPayload(entry: Omit<JournalEntry, 'id'>): Record<string, unknown> {
  const categoryMap: Record<string, string> = {
    gratitude: 'قدردانی',
    reflection: 'تأمل',
    idea: 'ایده',
    general: 'عمومی',
    journal: 'یادداشت',
  }

  return {
    title: entry.title,
    content: entry.content,
    date: entry.date,
    category: categoryMap[entry.gratitude ? 'gratitude' : 'journal'] || 'یادداشت',
  }
}

export function toFinancePayload(tx: Omit<Transaction, 'id'>): Record<string, unknown> {
  return {
    title: tx.description || 'تراکنش جدید',
    description: tx.description || '',
    type: financeTypeToBackend[tx.type] || 'هزینه',
    amount: tx.amount,
    category: tx.category,
    date: tx.date,
    account: tx.bankAccountId || '',
  }
}

export function toSchedulePayload(item: Omit<ScheduleItem, 'id' | 'completed'> & { date?: string }): Record<string, unknown> {
  return {
    title: item.title,
    description: item.desc || '',
    starts_at: combineDateTime(item.date, item.time),
    ends_at: addHours(item.date, item.time, item.durationHours),
    event_type: eventTypeFromCategory[item.category] || 'شخصی',
    color: item.category,
  }
}

async function getRequiredSessionUser() {
  const user = await checkFrappeSession()
  if (!user) {
    throw new Error('نشست کاربر منقضی شده است. دوباره وارد شوید.')
  }
  return user
}

export async function createTaskRecord(task: Task) {
  return call('hambaft.hambaft.api.create_task', { data: toTaskPayload(task) })
}

export async function updateTaskRecord(task: Task) {
  return call('hambaft.hambaft.api.update_task', { name: task.id, data: toTaskPayload(task) })
}

export async function deleteTaskRecord(name: string) {
  return call('hambaft.hambaft.api.delete_task', { name })
}

export async function createHabitRecord(name: string, description: string, extras?: Partial<Habit>) {
  return call('hambaft.hambaft.api.create_habit', { data: toHabitPayload(name, description, extras) })
}

export async function updateHabitRecord(habit: Habit) {
  return call('hambaft.hambaft.api.update_habit', {
    name: habit.id,
    data: {
      title: habit.name,
      description: habit.description || '',
      is_active: 1,
    },
  })
}

export async function deleteHabitRecord(name: string) {
  return call('hambaft.hambaft.api.delete_habit', { name })
}

export async function logHabitRecord(habitId: string, date: string, completed: boolean) {
  return call('hambaft.hambaft.api.log_habit', {
    habit: habitId,
    date,
    status: completed ? 'انجام‌شده' : 'ردشده',
    value: completed ? 1 : 0,
  })
}

export async function createGoalRecord(goal: Goal) {
  return call('hambaft.hambaft.api.create_goal', { data: toGoalPayload(goal) })
}

export async function updateGoalRecord(goal: Goal) {
  return call('hambaft.hambaft.api.update_goal', { name: goal.id, data: toGoalPayload(goal) })
}

export async function deleteGoalRecord(name: string) {
  return call('hambaft.hambaft.api.delete_goal', { name })
}

export async function getAreaRecords() {
  return callGet<{ data?: { areas?: any[] } }>('hambaft.hambaft.api.get_areas')
}

export async function createJournalRecord(entry: Omit<JournalEntry, 'id'>) {
  return call('hambaft.hambaft.api.create_note', { data: toJournalPayload(entry) })
}

export async function deleteJournalRecord(name: string) {
  return call('hambaft.hambaft.api.delete_note', { name })
}

export async function logMoodRecord(entry: { date: string; note?: string; gratitude?: string }) {
  return call('hambaft.hambaft.api.log_mood_energy', {
    date: entry.date,
    note: entry.note || '',
    gratitude: entry.gratitude || '',
  })
}

export async function createTransactionRecord(tx: Omit<Transaction, 'id'>) {
  return call('hambaft.hambaft.api.create_finance_entry', { data: toFinancePayload(tx) })
}

export async function updateTransactionRecord(id: string, tx: Omit<Transaction, 'id'>) {
  return call('hambaft.hambaft.api.update_finance_entry', { name: id, data: toFinancePayload(tx) })
}

export async function deleteTransactionRecord(name: string) {
  return call('hambaft.hambaft.api.delete_finance_entry', { name })
}

export async function createScheduleRecord(item: Omit<ScheduleItem, 'id' | 'completed'> & { date?: string }) {
  return call('hambaft.hambaft.api.create_event', { data: toSchedulePayload(item) })
}

export async function updateScheduleRecord(id: string, item: Partial<ScheduleItem> & { date?: string }) {
  const base = toSchedulePayload({
    title: item.title || '',
    desc: item.desc || '',
    time: item.time || '09:00',
    category: item.category || 'green',
    date: item.date,
    endDate: item.endDate,
    durationHours: item.durationHours,
  })

  return call('hambaft.hambaft.api.update_event', { name: id, data: base })
}

export async function deleteScheduleRecord(name: string) {
  return call('hambaft.hambaft.api.delete_event', { name })
}

export async function createBankAccountRecord(account: Omit<BankAccount, 'id'>) {
  const user = await getRequiredSessionUser()
  return createDoc('Hambaft Finance Account', {
    account_name: account.accountName,
    user,
    bank_name: account.bankName,
    account_type: account.isCredit ? 'کارت' : 'بانک',
    currency: 'IRR',
    opening_balance: account.balance,
    color: account.color || '#1E3A8A',
    account_number: account.cardNumber || '',
  })
}

export async function updateBankAccountRecord(id: string, account: Omit<BankAccount, 'id'>) {
  return updateDoc('Hambaft Finance Account', id, {
    account_name: account.accountName,
    bank_name: account.bankName,
    account_type: account.isCredit ? 'کارت' : 'بانک',
    opening_balance: account.balance,
    color: account.color || '#1E3A8A',
    account_number: account.cardNumber || '',
  })
}

export async function deleteBankAccountRecord(id: string) {
  return deleteDoc('Hambaft Finance Account', id)
}

export async function createCategoryRecord(category: Omit<CategoryDef, 'id'>) {
  const user = await getRequiredSessionUser()
  return createDoc('Hambaft Finance Category', {
    category_name: category.name,
    user,
    category_type: category.type === 'income' ? 'درآمد' : 'هزینه',
    color: category.color || '',
    icon: category.icon || '',
    is_group: 0,
  })
}

export async function updateCategoryRecord(id: string, category: Omit<CategoryDef, 'id'>) {
  return updateDoc('Hambaft Finance Category', id, {
    category_name: category.name,
    category_type: category.type === 'income' ? 'درآمد' : 'هزینه',
    color: category.color || '',
    icon: category.icon || '',
  })
}

export async function deleteCategoryRecord(id: string) {
  return deleteDoc('Hambaft Finance Category', id)
}

export async function updateProfileRecord(profile: Partial<UserProfile>) {
  return call('hambaft.hambaft.api.update_profile', {
    data: {
      name: profile.name,
      motto: profile.motto,
      work_field: profile.workField,
      daily_water_goal: profile.dailyWaterGoal,
      sleep_goal_hours: profile.sleepGoalHours,
    },
  })
}

export function toProjectPayload(project: Project, goalId?: string | null) {
  const normalizedGoalId = goalId && !goalId.startsWith('synthetic-')
    ? goalId
    : project.linkedGoalId && !project.linkedGoalId.startsWith('synthetic-')
      ? project.linkedGoalId
      : null

  return {
    title: project.title,
    description: project.description || '',
    notes: project.notes || '',
    goal: normalizedGoalId,
    status: project.status ? projectStatusToBackend[project.status] || 'فعال' : (project.completed ? 'تکمیل‌شده' : 'فعال'),
    priority: 'متوسط',
    start_date: project.createdAt || undefined,
    target_date: undefined,
    progress: project.tasks?.length ? Math.round((project.tasks.filter((task) => task.completed).length / project.tasks.length) * 100) : 0,
    noteBlocks: project.noteBlocks || [],
    tasks: (project.tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      completed: task.completed,
      dueDate: task.dueDate,
      priority: task.priority || 'medium',
      status: task.completed ? 'انجام‌شده' : 'انجام‌نشده',
    })),
  }
}

export async function createProjectRecord(project: Project, goalId?: string | null) {
  return call('hambaft.hambaft.api.create_project', { data: toProjectPayload(project, goalId) })
}

export async function updateProjectRecord(projectId: string, project: Project, goalId?: string | null) {
  return call('hambaft.hambaft.api.update_project', {
    name: projectId,
    data: toProjectPayload(project, goalId),
  })
}

export async function deleteProjectRecord(projectId: string) {
  return call('hambaft.hambaft.api.delete_project', { name: projectId })
}

export async function createDocumentRecord(document: Omit<Document, 'id' | 'createdAt'>) {
  return call('hambaft.hambaft.api.create_document', {
    data: {
      title: document.title,
      document_type: document.type,
      description: document.description,
      issued_by: document.issuedBy,
      issued_date: document.issuedDate,
      expiry_date: document.expiryDate,
      tags: document.tags,
      notes: document.notes,
      linked_bank_account_id: document.linkedBankAccountId,
      linked_asset_id: document.linkedAssetId,
      image_url: document.image,
      reminder_date: document.reminderDate,
    },
  })
}

export async function updateDocumentRecord(id: string, document: Partial<Omit<Document, 'id' | 'createdAt'>>) {
  return call('hambaft.hambaft.api.update_document', {
    name: id,
    data: {
      title: document.title,
      document_type: document.type,
      description: document.description,
      issued_by: document.issuedBy,
      issued_date: document.issuedDate,
      expiry_date: document.expiryDate,
      tags: document.tags,
      notes: document.notes,
      linked_bank_account_id: document.linkedBankAccountId,
      linked_asset_id: document.linkedAssetId,
      image_url: document.image,
      reminder_date: document.reminderDate,
    },
  })
}

export async function deleteDocumentRecord(id: string) {
  return call('hambaft.hambaft.api.delete_document', { name: id })
}

export async function createOccasionRecord(occasion: Omit<Occasion, 'id'>) {
  return call('hambaft.hambaft.api.create_occasion', {
    data: {
      title: occasion.title,
      occasion_type: occasion.type,
      occasion_date: occasion.date,
      person: occasion.person,
      recurrence_type: occasion.recurrenceType,
      reminder_days_before: occasion.reminderDaysBefore,
      notes: occasion.notes,
      color: occasion.color,
      estimated_budget: occasion.estimatedBudget,
      spent_amount: occasion.spentAmount,
    },
  })
}

export async function updateOccasionRecord(occasion: Occasion) {
  return call('hambaft.hambaft.api.update_occasion', {
    name: occasion.id,
    data: {
      title: occasion.title,
      occasion_type: occasion.type,
      occasion_date: occasion.date,
      person: occasion.person,
      recurrence_type: occasion.recurrenceType,
      reminder_days_before: occasion.reminderDaysBefore,
      notes: occasion.notes,
      color: occasion.color,
      estimated_budget: occasion.estimatedBudget,
      spent_amount: occasion.spentAmount,
    },
  })
}

export async function deleteOccasionRecord(id: string) {
  return call('hambaft.hambaft.api.delete_occasion', { name: id })
}

export async function createContactRecord(contact: Omit<Contact, 'id'>) {
  return call('hambaft.hambaft.api.create_contact', {
    data: {
      full_name: contact.name,
      contact_category: contact.category,
      birthday: contact.birthday,
      phone: contact.phone,
      email: contact.email,
      traits: contact.traits,
      strengths: contact.strengths,
      hobbies: contact.hobbies,
      notes: contact.notes,
      last_interaction_date: contact.lastInteractionDate,
      last_interaction_type: contact.lastInteractionType,
      interaction_logs: contact.interactionLogs,
      relationship_score: contact.relationshipScore,
      closeness_tier: contact.closenessTier,
      photo_url: contact.photoUrl,
    },
  })
}

export async function updateContactRecord(contact: Contact) {
  return call('hambaft.hambaft.api.update_contact', {
    name: contact.id,
    data: {
      full_name: contact.name,
      contact_category: contact.category,
      birthday: contact.birthday,
      phone: contact.phone,
      email: contact.email,
      traits: contact.traits,
      strengths: contact.strengths,
      hobbies: contact.hobbies,
      notes: contact.notes,
      last_interaction_date: contact.lastInteractionDate,
      last_interaction_type: contact.lastInteractionType,
      interaction_logs: contact.interactionLogs,
      relationship_score: contact.relationshipScore,
      closeness_tier: contact.closenessTier,
      photo_url: contact.photoUrl,
    },
  })
}

export async function deleteContactRecord(id: string) {
  return call('hambaft.hambaft.api.delete_contact', { name: id })
}

export async function createSleepLogRecord(log: Omit<SleepLog, 'id'>) {
  return call('hambaft.hambaft.api.create_sleep_log', {
    data: {
      log_date: log.date,
      sleep_time: log.sleepTime,
      wake_time: log.wakeTime,
      duration_hours: log.duration,
      quality: log.quality,
      energy_level: log.energyLevel,
      notes: log.notes,
    },
  })
}

export async function updateSleepLogRecord(id: string, log: Partial<SleepLog>) {
  return call('hambaft.hambaft.api.update_sleep_log', {
    name: id,
    data: {
      log_date: log.date,
      sleep_time: log.sleepTime,
      wake_time: log.wakeTime,
      duration_hours: log.duration,
      quality: log.quality,
      energy_level: log.energyLevel,
      notes: log.notes,
    },
  })
}

export async function deleteSleepLogRecord(id: string) {
  return call('hambaft.hambaft.api.delete_sleep_log', { name: id })
}

export async function createMindfulnessRecord(session: Omit<MindfulnessSession, 'id'>) {
  return call('hambaft.hambaft.api.create_mindfulness_session', {
    data: {
      session_date: session.date,
      session_type: session.type,
      duration_minutes: session.durationMinutes,
      stress_before: session.stressLevelBefore,
      stress_after: session.stressLevelAfter,
      notes: session.notes,
    },
  })
}

export async function updateMindfulnessRecord(id: string, session: Partial<Omit<MindfulnessSession, 'id'>>) {
  return call('hambaft.hambaft.api.update_mindfulness_session', {
    name: id,
    data: {
      session_date: session.date,
      session_type: session.type,
      duration_minutes: session.durationMinutes,
      stress_before: session.stressLevelBefore,
      stress_after: session.stressLevelAfter,
      notes: session.notes,
    },
  })
}

export async function deleteMindfulnessRecord(id: string) {
  return call('hambaft.hambaft.api.delete_mindfulness_session', { name: id })
}

export async function createNutritionRecord(log: Omit<MealLog, 'id'>) {
  return call('hambaft.hambaft.api.create_nutrition_log', {
    data: {
      log_date: log.date,
      log_time: log.time,
      meal_type: log.type,
      foods: log.foods,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      water_glasses: log.waterGlasses,
    },
  })
}

export async function updateNutritionRecord(id: string, log: Partial<Omit<MealLog, 'id'>>) {
  return call('hambaft.hambaft.api.update_nutrition_log', {
    name: id,
    data: {
      log_date: log.date,
      log_time: log.time,
      meal_type: log.type,
      foods: log.foods,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      water_glasses: log.waterGlasses,
      notes: log.notes,
    },
  })
}

export async function deleteNutritionRecord(id: string) {
  return call('hambaft.hambaft.api.delete_nutrition_log', { name: id })
}

export async function createWorkoutRecord(log: Omit<WorkoutLog, 'id'>) {
  return call('hambaft.hambaft.api.create_workout_log', {
    data: {
      workout_date: log.date,
      workout_type: log.type,
      cardio_type: log.cardioType,
      distance_km: log.distanceKm,
      duration_minutes: log.durationMinutes,
      calories_burned: log.caloriesBurned,
      gym_sets: log.gymSets,
      notes: log.notes,
    },
  })
}

export async function updateWorkoutRecord(id: string, log: Partial<Omit<WorkoutLog, 'id'>>) {
  return call('hambaft.hambaft.api.update_workout_log', {
    name: id,
    data: {
      workout_date: log.date,
      workout_type: log.type,
      cardio_type: log.cardioType,
      distance_km: log.distanceKm,
      duration_minutes: log.durationMinutes,
      calories_burned: log.caloriesBurned,
      gym_sets: log.gymSets,
      notes: log.notes,
    },
  })
}

export async function deleteWorkoutRecord(id: string) {
  return call('hambaft.hambaft.api.delete_workout_log', { name: id })
}

export async function logWaterRecord(glasses: number, date?: string, glassSizeMl = 250) {
  return call('hambaft.hambaft.api.log_water', {
    date,
    amount_ml: Math.max(0, glasses) * glassSizeMl,
  })
}

export async function createMeasurementRecord(type: string, value: number, date: string, unit?: string, notes?: string) {
  const user = await getRequiredSessionUser()
  return createDoc('Hambaft Measurement', {
    user,
    measurement_type: type,
    value,
    unit: unit || '',
    measured_on: `${date} 00:00:00`,
    notes: notes || '',
  })
}

export async function deleteMeasurementRecord(id: string) {
  return deleteDoc('Hambaft Measurement', id)
}

export async function aiCoachChat(prompt: string, history: Array<{ role: string; text: string }>, lifeData: unknown, conversationId?: string | null) {
  return call<{ data?: { text?: string; conversation_id?: string } }>('hambaft.hambaft.api.ai_coach_chat', {
    prompt,
    history,
    life_data: lifeData,
    conversation_id: conversationId || undefined,
  })
}

export async function loginWithFrappe(email: string, password: string) {
  return call<{ data?: { onboarding_completed?: boolean } }>('hambaft.hambaft.api.login', { email, password })
}

export async function signupWithFrappe(email: string, password: string, displayName: string) {
  return call<{ data?: { onboarding_completed?: boolean } }>('hambaft.hambaft.api.signup', {
    email,
    password,
    display_name: displayName,
  })
}

export async function submitOnboarding(data: Record<string, unknown>) {
  return call('hambaft.hambaft.api.submit_onboarding_step', { step: 1, data })
}

export async function finishOnboardingFlow() {
  return call('hambaft.hambaft.api.finish_onboarding')
}

export async function changePassword(oldPassword: string, newPassword: string) {
  return call('hambaft.hambaft.api.change_password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export async function updateSettingsRecord(data: Record<string, unknown>) {
  return call('hambaft.hambaft.api.update_settings', { data })
}
