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
import { call, callGet, checkFrappeSession, createDoc, deleteDoc, updateDoc } from './frappe'

const taskPriorityToBackend: Record<string, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
  urgent: 'فوری',
}

const taskPriorityFromBackend: Record<string, Task['priority']> = {
  پایین: 'low',
  متوسط: 'medium',
  بالا: 'high',
  فوری: 'urgent',
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
  relationship: 'رابطه',
  other: 'سفارشی',
}

const goalCategoryFromBackend: Record<string, Goal['category']> = {
  سلامت: 'health',
  مالی: 'financial',
  شغلی: 'career',
  آموزشی: 'learning',
  شخصی: 'personal',
  رابطه: 'relationship',
  سفارشی: 'other',
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
  const importanceMap: Record<string, string> = {
    normal: 'عادی',
    key: 'کلیدی',
    milestone: 'نقطه‌عطف',
  }
  return {
    title: task.title,
    description: task.description || '',
    due_date: combineDateTime(task.dueDate, '09:00'),
    scheduled_date: task.scheduledDate || null,
    scheduled_time: task.scheduledTime || null,
    priority: taskPriorityToBackend[task.priority || 'medium'] || 'متوسط',
    category: taskCategoryToBackend[task.category || 'other'] || 'شخصی',
    status: task.status || (task.completed ? 'انجام‌شده' : 'inbox'),
    project: task.projectId || null,
    parent_task: task.parentTaskId || null,
    blocked_by_json: JSON.stringify(task.blockedBy || []),
    importance: importanceMap[task.importance || 'normal'] || 'عادی',
    is_daily_highlight: task.isDailyHighlight ? 1 : 0,
    estimated_minutes: task.estimatedMinutes || null,
    effort_type: task.effortType === 'fixed' ? 'ثابت' : 'متغیر',
    area: task.areaId || null,
    goal: task.goalId || null,
    noteBlocks: task.noteBlocks || [],
  }
}

export function toGoalPayload(goal: Goal): Record<string, unknown> {
  const metric = goal.metric
  const goalTypeMap: Record<string, string> = {
    outcome: 'نتیجه‌ای', metric: 'سنجه‌ای', habit_driven: 'مبتنی‌بر_عادت',
    project_delivery: 'تحویل_پروژه', savings: 'پس‌انداز_مالی', investment: 'سرمایه‌گذاری',
    debt_payoff: 'پرداخت_بدهی', health: 'سلامت', learning: 'یادگیری', consistency: 'ثبات',
  }
  const progressModeMap: Record<string, string> = {
    manual: 'دستی', metric_value: 'مقدار_سنجه', habit_rollup: 'تجمیع_عادت',
    project_rollup: 'تجمیع_پروژه', finance_balance: 'موجودی_مالی', finance_savings: 'پس‌انداز_مالی',
    debt_paydown: 'پرداخت_بدهی', weighted_composite: 'مرکب_وزنی',
  }
  const priorityMap: Record<string, string> = {
    low: 'پایین', medium: 'متوسط', high: 'بالا', urgent: 'فوری',
  }
  const goalLevelMap: Record<string, string> = {
    annual: 'سالانه', quarterly: 'فصلی', monthly: 'ماهانه', custom: 'سفارشی',
  }
  const contribTypeMap: Record<string, string> = {
    completion_count: 'تعداد_انجام', completion_rate: 'نرخ_انجام', streak: 'رکورد',
    quantity_sum: 'مجموع_مقدار', average_value: 'میانگین_مقدار', boolean_success: 'بله_خیر',
  }
  const contribPeriodMap: Record<string, string> = {
    daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه', all: 'کل',
  }
  const finTypeMap: Record<string, string> = {
    balance: 'موجودی_حساب', savings: 'پس‌انداز', debt: 'بدهی', investment: 'سرمایه‌گذاری', income_accumulated: 'درآمد_انباشته',
  }

  const contribTypeProjectMap: Record<string, string> = {
    mandatory: 'اجباری', recommended: 'پیشنهادی', supporting: 'پشتیبان',
  }
  const completionPolicyMap: Record<string, string> = {
    threshold: 'آستانه_پیشرفت', threshold_plus_mandatory: 'آستانه_به_علاوه_پروژه‌های_اجباری',
    metric_plus_mandatory: 'سنجه_به_علاوه_پروژه‌های_اجباری', all_projects: 'همه_پروژه‌ها_تکمیل',
    threshold_plus_milestones: 'آستانه_به_علاوه_نقاط_عطف',
  }

  return {
    title: goal.title,
    description: goal.description || '',
    category: goalCategoryToBackend[goal.category || 'personal'] || 'شخصی',
    goal_type: goalTypeMap[goal.goalType || 'outcome'] || 'نتیجه‌ای',
    progress_mode: progressModeMap[goal.progressMode || 'manual'] || 'دستی',
    area: goal.areaId || null,
    parent_goal: goal.parentGoalId || null,
    goal_level: goalLevelMap[goal.goalLevel || 'annual'] || 'سالانه',
    target_date: goal.targetDate || null,
    start_date: goal.startDate || null,
    status: goal.status || (goal.completed ? 'تکمیل‌شده' : 'فعال'),
    target_value: goal.targetValue ?? metric?.targetValue ?? null,
    current_value: goal.currentValue ?? metric?.currentValue ?? null,
    unit: goal.unit ?? metric?.unit ?? null,
    priority: priorityMap[goal.priority || 'medium'] || 'متوسط',
    color: goal.color || undefined,
    icon: goal.icon || undefined,
    notes: goal.visionAffirmation || '',
    noteBlocks: goal.noteBlocks || [],
    project_progress_weight: goal.projectProgressWeight ?? undefined,
    milestone_weight: goal.milestoneWeight ?? undefined,
    key_task_weight: goal.keyTaskWeight ?? undefined,
    tracked_time_weight: goal.trackedTimeWeight ?? undefined,
    metric_weight: goal.metricWeight ?? undefined,
    completion_policy: goal.completionPolicy ? (completionPolicyMap[goal.completionPolicy] || undefined) : undefined,
    completion_threshold: goal.completionThreshold ?? undefined,
    linked_habits: (goal.linkedHabits || []).map(h => ({
      habit: h.habit,
      contribution_type: contribTypeMap[h.contributionType] || 'تعداد_انجام',
      weight: h.weight ?? 100,
      period: contribPeriodMap[h.period || 'monthly'] || 'ماهانه',
      target_value: h.targetValue ?? null,
      cap_value: h.capValue ?? null,
      is_negative: h.isNegative ? 1 : 0,
      notes: h.notes || '',
    })),
    linked_finance_accounts: (goal.linkedFinanceAccounts || []).map(f => ({
      finance_account: f.financeAccount,
      finance_type: finTypeMap[f.financeType] || 'موجودی_حساب',
      initial_amount: f.initialAmount ?? null,
      target_amount: f.targetAmount ?? null,
      weight: f.weight ?? 100,
      notes: f.notes || '',
    })),
    linked_projects: (goal.linkedProjects || []).map(p => ({
      project: p.project,
      contribution_type: contribTypeProjectMap[p.contributionType || 'mandatory'] || 'اجباری',
      weight: p.weight ?? 100,
      is_mandatory: p.isMandatory ? 1 : 0,
      sort_order: p.sortOrder ?? 0,
      notes: p.notes || '',
    })),
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

export async function bulkUpdateTasks(names: string[], updates: Record<string, any>) {
  return call('hambaft.hambaft.api.bulk_update_tasks', {
    names: JSON.stringify(names),
    updates: JSON.stringify(updates),
  })
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
    area: project.areaId || null,
    parent_project: project.parentProjectId || null,
    status: project.status ? projectStatusToBackend[project.status] || 'فعال' : (project.completed ? 'تکمیل‌شده' : 'فعال'),
    priority: 'متوسط',
    start_date: project.createdAt || undefined,
    target_date: undefined,
    progress: project.tasks?.length ? Math.round((project.tasks.filter((task) => task.completed).length / project.tasks.length) * 100) : 0,
    noteBlocks: project.noteBlocks || [],
    effort_type: project.effortType || undefined,
    estimated_hours: project.estimatedHours || undefined,
    blocked_by_json: project.blockedByJson || undefined,
    tasks: (project.tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      completed: task.completed,
      dueDate: task.dueDate,
      priority: taskPriorityToBackend[task.priority || 'medium'] || 'متوسط',
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

// ─── Planner Task Sessions ──────────────────────────────────────

export async function startTaskSession(taskId: string) {
  return call<{ data?: { session?: any } }>('hambaft.hambaft.api.start_task_session', { task: taskId })
}

export async function stopTaskSession(sessionId: string) {
  return call<{ data?: { session?: any } }>('hambaft.hambaft.api.stop_task_session', { session_name: sessionId })
}

export async function resumeTaskSession(sessionId: string) {
  return call<{ data?: { session?: any } }>('hambaft.hambaft.api.resume_task_session', { session_name: sessionId })
}

export async function finishTaskSession(sessionId: string) {
  return call<{ data?: { session?: any } }>('hambaft.hambaft.api.finish_task_session', { session_name: sessionId })
}

export async function getTaskSessions(taskId: string, limit = 50) {
  return call<{ data?: { sessions?: any[] } }>('hambaft.hambaft.api.get_task_sessions', { task: taskId, limit })
}

export async function getActiveTaskSession() {
  return call<{ data?: { session?: any } }>('hambaft.hambaft.api.get_active_session', {})
}

// ─── Task Hierarchy ─────────────────────────────────────────────

export async function getTaskChildren(parentTaskId: string) {
  return call<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_task_children', { parent_task: parentTaskId })
}

export async function getTaskHierarchy(taskId: string) {
  return call<{ data?: { task?: any } }>('hambaft.hambaft.api.get_task_hierarchy', { task_name: taskId })
}

// ─── Task Dependencies ──────────────────────────────────────────

export async function addTaskDependency(taskId: string, dependsOnTaskId: string) {
  return call<{ data?: { blocked_by?: string[] } }>('hambaft.hambaft.api.add_task_dependency', { task_name: taskId, depends_on_task: dependsOnTaskId })
}

export async function removeTaskDependency(taskId: string, dependsOnTaskId: string) {
  return call<{ data?: { blocked_by?: string[] } }>('hambaft.hambaft.api.remove_task_dependency', { task_name: taskId, depends_on_task: dependsOnTaskId })
}

export async function isTaskBlocked(taskId: string) {
  return call<{ data?: { blocked?: boolean; reason?: string } }>('hambaft.hambaft.api.is_task_blocked', { task_name: taskId })
}

// ─── Planner Views ──────────────────────────────────────────────

export async function getPlannerInbox(limit = 100) {
  return call<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_planner_inbox', { limit })
}

export async function getPlannerToday(limit = 100) {
  return call<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_planner_today', { limit })
}

export async function getPlannerNext(limit = 100) {
  return call<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_planner_next', { limit })
}

export async function getPlannerScheduled(fromDate?: string, toDate?: string, limit = 100) {
  return call<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_planner_scheduled', { from_date: fromDate, to_date: toDate, limit })
}

export async function getPlannerSomeday(limit = 100) {
  return call<{ data?: { tasks?: any[] } }>('hambaft.hambaft.api.get_planner_someday', { limit })
}

export async function moveTaskToBucket(taskId: string, bucket: Task['status']) {
  return call<{ data?: { task?: any } }>('hambaft.hambaft.api.move_task_to_bucket', { task_name: taskId, bucket })
}

export async function transitionTaskStatus(taskId: string, newStatus: Task['status']) {
  return call<{ data?: { task?: any } }>('hambaft.hambaft.api.transition_task_status', { task_name: taskId, new_status: newStatus })
}

// ─── Area CRUD ──────────────────────────────────────────────

export async function createAreaRecord(data: Record<string, unknown>) {
  return call<{ data?: { area?: any } }>('hambaft.hambaft.api.create_area', { data })
}

export async function updateAreaRecord(name: string, data: Record<string, unknown>) {
  return call<{ data?: { area?: any } }>('hambaft.hambaft.api.update_area', { name, data })
}

export async function deleteAreaRecord(name: string) {
  return call<{ data?: { ok?: boolean } }>('hambaft.hambaft.api.delete_area', { name })
}

export async function getAreaSummary(name: string) {
  return callGet<{ data?: { summary?: any } }>(`hambaft.hambaft.api.get_area_summary?name=${encodeURIComponent(name)}`)
}

export async function getAreasWithSummaries(limit = 50) {
  return callGet<{ data?: { areas?: any[] } }>(`hambaft.hambaft.api.get_areas_with_summaries?limit=${limit}`)
}

// ─── Project Dependencies ──────────────────────────────────

export async function addProjectDependency(projectName: string, dependsOn: string) {
  return call<{ data?: { blocked_by?: string[] } }>('hambaft.hambaft.api.add_project_dependency', { project_name: projectName, depends_on_project: dependsOn })
}

export async function removeProjectDependency(projectName: string, dependsOn: string) {
  return call<{ data?: { blocked_by?: string[] } }>('hambaft.hambaft.api.remove_project_dependency', { project_name: projectName, depends_on_project: dependsOn })
}

export async function isProjectBlocked(projectName: string) {
  return call<{ data?: { blocked?: boolean; reason?: string } }>('hambaft.hambaft.api.is_project_blocked', { project_name: projectName })
}

export async function getProjectSubprojects(projectName: string) {
  return call<{ data?: { projects?: any[] } }>('hambaft.hambaft.api.get_project_subprojects', { project_name: projectName })
}

export async function getProjectTrackedMinutes(projectName: string) {
  return callGet<{ data?: { tracked_minutes?: number } }>(`hambaft.hambaft.api.get_project_tracked_minutes?project_name=${encodeURIComponent(projectName)}`)
}

// ─── Planner Calendar / Timeline Feeds ─────────────────────

export async function getPlannerDailyTimeline(date?: string) {
  const params = date ? `date=${encodeURIComponent(date)}` : ''
  return callGet<{ data?: { date?: string; tasks?: any[]; time_blocks?: any[]; active_session?: any; events?: any[] } }>(`hambaft.hambaft.api.get_planner_daily_timeline${params ? '?' + params : ''}`)
}

export async function getPlannerWeek(startDate?: string) {
  const params = startDate ? `start_date=${encodeURIComponent(startDate)}` : ''
  return callGet<{ data?: { start_date?: string; days?: Record<string, any[]> } }>(`hambaft.hambaft.api.get_planner_week${params ? '?' + params : ''}`)
}

export async function getPlannerMonth(year?: number, month?: number) {
  const params: string[] = []
  if (year) params.push(`year=${year}`)
  if (month) params.push(`month=${month}`)
  return callGet<{ data?: { year?: number; month?: number; from_date?: string; to_date?: string; days?: Record<string, any[]> } }>(`hambaft.hambaft.api.get_planner_month${params.length ? '?' + params.join('&') : ''}`)
}

// ─── Project Board ─────────────────────────────────────────

export async function getProjectBoard(projectName: string) {
  return callGet<{ data?: { project?: any; status_groups?: Record<string, any[]>; total_tasks?: number; completed_tasks?: number } }>(`hambaft.hambaft.api.get_project_board?project_name=${encodeURIComponent(projectName)}`)
}

// ─── Projects by Area ─────────────────────────────────────

export async function getProjectsByArea(areaName: string) {
  return callGet<{ data?: { projects?: any[] } }>(`hambaft.hambaft.api.get_projects_by_area?area_name=${encodeURIComponent(areaName)}`)
}

// ─── Tracked Time Rollups ─────────────────────────────────

export async function getTaskTrackedMinutes(taskName: string) {
  return callGet<{ data?: { tracked_minutes?: number } }>(`hambaft.hambaft.api.get_task_tracked_minutes?task_name=${encodeURIComponent(taskName)}`)
}

export async function getAreaTrackedMinutes(areaName: string) {
  return callGet<{ data?: { tracked_minutes?: number } }>(`hambaft.hambaft.api.get_area_tracked_minutes?area_name=${encodeURIComponent(areaName)}`)
}

// ─── Planner Board Views ──────────────────────────────────

export async function getTasksByProject(limit = 100) {
  return callGet<{ data?: { by_project?: Record<string, any[]> } }>(`hambaft.hambaft.api.get_tasks_by_project?limit=${limit}`)
}

export async function getTasksGroupedByStatus(limit = 200) {
  return callGet<{ data?: { status_groups?: Record<string, any[]> } }>(`hambaft.hambaft.api.get_tasks_grouped_by_status?limit=${limit}`)
}

// ─── Advanced Goal APIs ──────────────────────────────────────

export async function getGoalDetail(name: string) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.get_goal_detail', { name })
}

export async function computeGoalProgress(name: string) {
  return call<{ data?: { progress_percent?: number; detail?: any; goal?: any } }>('hambaft.hambaft.api.compute_goal_progress', { name })
}

export async function linkGoalHabit(goalName: string, habit: string, contributionType?: string, weight?: number, period?: string, targetValue?: number, capValue?: number, isNegative?: number, notes?: string) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.link_goal_habit', {
    goal_name: goalName,
    habit,
    contribution_type: contributionType || 'تعداد_انجام',
    weight: weight ?? 100,
    period: period || 'ماهانه',
    target_value: targetValue,
    cap_value: capValue,
    is_negative: isNegative ?? 0,
    notes,
  })
}

export async function unlinkGoalHabit(goalName: string, habit: string) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.unlink_goal_habit', { goal_name: goalName, habit })
}

export async function linkGoalFinance(goalName: string, financeAccount: string, financeType?: string, initialAmount?: number, targetAmount?: number, weight?: number, notes?: string) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.link_goal_finance', {
    goal_name: goalName,
    finance_account: financeAccount,
    finance_type: financeType || 'موجودی_حساب',
    initial_amount: initialAmount,
    target_amount: targetAmount,
    weight: weight ?? 100,
    notes,
  })
}

export async function unlinkGoalFinance(goalName: string, financeAccount: string) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.unlink_goal_finance', { goal_name: goalName, finance_account: financeAccount })
}

export async function linkGoalProject(
  goalName: string,
  projectName: string,
  contributionType: string = 'اجباری',
  weight: number = 100,
  isMandatory: boolean = true,
  sortOrder: number = 0,
  notes?: string,
) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.link_goal_project', {
    goal_name: goalName,
    project_name: projectName,
    contribution_type: contributionType,
    weight,
    is_mandatory: isMandatory ? 1 : 0,
    sort_order: sortOrder,
    notes,
  })
}

export async function unlinkGoalProject(goalName: string, projectName: string) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.unlink_goal_project', { goal_name: goalName, project_name: projectName })
}

export async function updateGoalProjectWeights(goalName: string, weights: Array<{ project: string; weight?: number; is_mandatory?: number; contribution_type?: string; sort_order?: number; notes?: string }>) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.update_goal_project_weights', { goal_name: goalName, weights })
}

export async function updateGoalSignalWeights(
  goalName: string,
  opts: {
    projectProgressWeight?: number
    milestoneWeight?: number
    keyTaskWeight?: number
    trackedTimeWeight?: number
    metricWeight?: number
  }
) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.update_goal_signal_weights', {
    goal_name: goalName,
    project_progress_weight: opts.projectProgressWeight,
    milestone_weight: opts.milestoneWeight,
    key_task_weight: opts.keyTaskWeight,
    tracked_time_weight: opts.trackedTimeWeight,
    metric_weight: opts.metricWeight,
  })
}

export async function updateGoalCompletionPolicy(goalName: string, completionPolicy?: string, completionThreshold?: number) {
  return call<{ data?: { goal?: any } }>('hambaft.hambaft.api.update_goal_completion_policy', {
    goal_name: goalName,
    completion_policy: completionPolicy,
    completion_threshold: completionThreshold,
  })
}

export async function getGoalSnapshots(goalName: string, limit = 30) {
  return callGet<{ data?: { snapshots?: any[] } }>(`hambaft.hambaft.api.get_goal_snapshots?goal_name=${encodeURIComponent(goalName)}&limit=${limit}`)
}

export async function getGoalTrend(goalName: string, days = 30) {
  return callGet<{ data?: { trend?: any[]; days?: number } }>(`hambaft.hambaft.api.get_goal_trend?goal_name=${encodeURIComponent(goalName)}&days=${days}`)
}

export async function getGoalsWithDetails(limit = 100) {
  return callGet<{ data?: { goals?: any[] } }>(`hambaft.hambaft.api.get_goals_with_details?limit=${limit}`)
}

export async function recomputeAllGoalProgress() {
  return call<{ data?: { recomputed?: number; results?: any[] } }>('hambaft.hambaft.api.recompute_all_goal_progress', {})
}

export async function getAreaDetail(name: string) {
  return callGet<{ data?: any }>(`hambaft.hambaft.api.get_area_detail?name=${encodeURIComponent(name)}`)
}

// ─── Task Management V2 APIs ──────────────────────────────────

export async function getTaskImpactDetail(taskName: string) {
  return call<{ data?: { task?: string; importance?: string; project?: any; goal?: any; blocked_by_details?: any[] } }>(
    'hambaft.hambaft.api.get_task_impact_detail', { task_name: taskName }
  )
}

export async function updateTaskImportance(taskName: string, importance: 'normal' | 'key' | 'milestone') {
  const importanceMap: Record<string, string> = { normal: 'عادی', key: 'کلیدی', milestone: 'نقطه‌عطف' }
  return call<{ data?: { task?: any } }>(
    'hambaft.hambaft.api.update_task_importance',
    { task_name: taskName, importance: importanceMap[importance] || 'عادی' }
  )
}

export async function resolveBlockedTasks() {
  return call<{ data?: { resolvable_tasks?: any[] } }>(
    'hambaft.hambaft.api.resolve_blocked_tasks', {}
  )
}

// ─── Saved Planner View APIs ──────────────────────────────────

export async function getOverdueTasks(limit = 100) {
  return callGet<{ data?: { tasks?: any[] } }>(`hambaft.hambaft.api.get_overdue_tasks?limit=${limit}`)
}

export async function getKeyTasks(limit = 100) {
  return callGet<{ data?: { tasks?: any[] } }>(`hambaft.hambaft.api.get_key_tasks?limit=${limit}`)
}

export async function getMilestoneTasks(limit = 100) {
  return callGet<{ data?: { tasks?: any[] } }>(`hambaft.hambaft.api.get_milestone_tasks?limit=${limit}`)
}

export async function getUnscheduledTasks(limit = 100) {
  return callGet<{ data?: { tasks?: any[] } }>(`hambaft.hambaft.api.get_unscheduled_tasks?limit=${limit}`)
}

export async function getBlockedTasksView(limit = 100) {
  return callGet<{ data?: { tasks?: any[] } }>(`hambaft.hambaft.api.get_blocked_tasks_view?limit=${limit}`)
}

export async function getHighImpactTasks(limit = 50) {
  return callGet<{ data?: { tasks?: any[] } }>(`hambaft.hambaft.api.get_high_impact_tasks?limit=${limit}`)
}

export async function getAreaBoard(areaName: string) {
  return callGet<{ data?: any }>(`hambaft.hambaft.api.get_area_board?area_name=${encodeURIComponent(areaName)}`)
}

export async function getProjectDetailWithTasks(projectName: string) {
  return callGet<{ data?: any }>(`hambaft.hambaft.api.get_project_detail_with_tasks?project_name=${encodeURIComponent(projectName)}`)
}

// ─── Quick Add Task with Context-Aware Defaults ──────────────

export async function quickAddTask(
  title: string,
  options?: {
    project?: string
    area?: string
    goal?: string
    importance?: 'normal' | 'key' | 'milestone'
    status?: string
    priority?: string
    scheduledDate?: string
    dueDate?: string
    context?: 'planner_today' | 'planner_inbox' | 'planner_next' | 'planner_scheduled' | 'area_board' | 'project_detail' | 'task_manager'
  }
) {
  const importanceMap: Record<string, string> = { normal: 'عادی', key: 'کلیدی', milestone: 'نقطه‌عطف' }
  const priorityMap: Record<string, string> = { low: 'پایین', medium: 'متوسط', high: 'بالا', urgent: 'فوری' }
  const params: Record<string, string> = { title }
  if (options?.project) params.project = options.project
  if (options?.area) params.area = options.area
  if (options?.goal) params.goal = options.goal
  if (options?.importance) params.importance = importanceMap[options.importance]
  if (options?.status) params.status = options.status
  if (options?.priority) params.priority = priorityMap[options.priority] || options.priority
  if (options?.scheduledDate) params.scheduled_date = options.scheduledDate
  if (options?.dueDate) params.due_date = options.dueDate
  if (options?.context) params.context = options.context
  return call<{ data?: { task?: any } }>('hambaft.hambaft.api.quick_add_task', params)
}
