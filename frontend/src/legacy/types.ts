export type TransactionCategory =
  | 'salary'      // حقوق
  | 'business'    // کسب و کار
  | 'investment'  // سرمایه‌گذاری
  | 'food'        // خوراک و رستوران
  | 'rent'        // مسکن و اجاره
  | 'transport'   // حمل و نقل
  | 'entertainment'// تفریح و سرگرمی
  | 'health'      // سلامت و درمان
  | 'education'   // آموزش
  | 'shopping'    // خرید
  | 'other';      // سایر

export interface CategoryDef {
  id: string;
  name: string;
  type: 'income' | 'expense';
  subcategories: string[];
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string; // support custom category IDs or standard TransactionCategory
  subcategory?: string;
  date: string; // YYYY-MM-DD
  description: string;
  bankAccountId?: string;
  toBankAccountId?: string;
  isCreditPurchase?: boolean;
  projectId?: string; // ID of the linked project
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  createdAt: string; // YYYY-MM-DD
  logs: string[]; // List of YYYY-MM-DD completed dates
  streak: number; // Current streak
  cue?: string;        // محرک
  craving?: string;    // میل
  response?: string;   // پاسخ
  reward?: string;     // پاداش
  stackAfter?: string;   // عادت قبلی / رویداد (مثلاً بعد از قهوه صبح)
  stackAction?: string;  // رفتار جدید (مثلاً ۱۰ دقیقه مطالعه)
  difficulty?: 'easy' | 'medium' | 'hard';
  identityGoal?: string; // هویت هدف (مثلاً یک کتاب‌خوان)
  targetQty?: number;    // مقدار هدف روزانه (مثلاً ۱۰۰)
  unit?: string;         // واحد سنجش (مثلاً صفحه)
  qtyLogs?: Record<string, number>; // مقدار ثبت شده روزانه
  autoTrackType?: 'mindfulness' | 'workout' | 'meal' | 'sleep' | 'none';
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  completed: boolean;
  tasks: Task[];
  createdAt: string;
  milestones?: Milestone[];
  linkedGoalId?: string; // پیوند به هدف (Goal Tree)
  areaId?: string; // پیوند به حوزه
  parentProjectId?: string; // پروژه والد
  status?: 'waiting' | 'in_progress' | 'paused' | 'completed'; // ستون بورد کانبان
  effortType?: 'fixed' | 'variable';
  estimatedHours?: number;
  blockedByJson?: string; // JSON string of blocked-by project IDs
  noteBlocks?: import('../notes/types').Block[]; // Notion-like rich text blocks
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export type GoalCategory = 'financial' | 'health' | 'career' | 'learning' | 'personal' | 'relationship' | 'other';

export type GoalType = 'outcome' | 'metric' | 'habit_driven' | 'project_delivery' | 'savings' | 'investment' | 'debt_payoff' | 'health' | 'learning' | 'consistency';

export type ProgressMode = 'manual' | 'metric_value' | 'habit_rollup' | 'project_rollup' | 'finance_balance' | 'finance_savings' | 'debt_paydown' | 'weighted_composite';

export type ContributionType = 'completion_count' | 'completion_rate' | 'streak' | 'quantity_sum' | 'average_value' | 'boolean_success';

export type ContributionPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface GoalHabitLink {
  habit: string;
  habitTitle?: string;
  contributionType: ContributionType;
  weight: number;
  period: ContributionPeriod;
  targetValue?: number;
  capValue?: number;
  isNegative?: boolean;
  notes?: string;
}

export interface GoalFinanceLink {
  financeAccount: string;
  accountName?: string;
  currentBalance?: number;
  financeType: 'balance' | 'savings' | 'debt' | 'investment' | 'income_accumulated';
  initialAmount?: number;
  targetAmount?: number;
  weight: number;
  notes?: string;
}

export type ProjectContributionType = 'mandatory' | 'recommended' | 'supporting';

export interface GoalLinkedProject {
  project: string;
  title: string;
  status?: string;
  progress?: number;
  effortType?: string;
  estimatedHours?: number;
  actualMinutes?: number;
  totalTasks?: number;
  doneTasks?: number;
  milestoneTotal?: number;
  milestoneDone?: number;
  keyTotal?: number;
  keyDone?: number;
  weight?: number;
  contributionType?: ProjectContributionType;
  isMandatory?: boolean;
  sortOrder?: number;
  notes?: string;
}

export type GoalHealthState = 'on_track' | 'at_risk' | 'off_track' | 'needs_review';
export type CompletionPolicy = 'threshold' | 'threshold_plus_mandatory' | 'metric_plus_mandatory' | 'all_projects' | 'threshold_plus_milestones';

export interface GoalSignalWeights {
  projectProgressWeight: number;
  milestoneWeight: number;
  keyTaskWeight: number;
  trackedTimeWeight: number;
  metricWeight: number;
}

export interface GoalSnapshot {
  progressPct: number;
  healthState: GoalHealthState;
  detail?: any;
  healthDetail?: any;
}

export interface MetricLog {
  id: string;
  date: string;
  value: number;
  note?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  balance: number;
  cardNumber?: string;
  color?: string;
  isCredit?: boolean;
  creditLimit?: number;
  creditDebt?: number;
  creditDueDate?: string;
}

export interface GoalMetric {
  name: string;
  targetValue: number;
  startValue: number;
  currentValue: number;
  unit: string;
  logs: MetricLog[];
  autoTrackSource?: 'workout_count' | 'workout_calories' | 'workout_distance' | 'strength_max_weight' | 'sleep_hours' | 'sleep_quality' | 'meditation_minutes' | 'journal_mood' | 'bank_balance' | 'composite_health' | 'none';
  autoTrackExerciseName?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  goalType?: GoalType;
  progressMode?: ProgressMode;
  areaId?: string;
  targetDate: string;
  milestones: Milestone[];
  createdAt: string;
  completed: boolean;
  projects?: Project[];
  habits?: Habit[];
  linkedBankAccountId?: string;
  metric?: GoalMetric;
  
  // Advanced goal fields
  parentGoalId?: string;
  goalLevel?: 'annual' | 'quarterly' | 'monthly' | 'custom';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  progressPercent?: number;
  derivedProgressDetail?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  color?: string;
  icon?: string;
  startDate?: string;
  status?: string;
  
  // Habit links
  linkedHabits?: GoalHabitLink[];
  
  // Finance links
  linkedFinanceAccounts?: GoalFinanceLink[];
  
  // Linked projects (from backend) — rich with weights
  linkedProjects?: GoalLinkedProject[];
  
  // Project signal weights
  projectProgressWeight?: number;
  milestoneWeight?: number;
  keyTaskWeight?: number;
  trackedTimeWeight?: number;
  metricWeight?: number;
  
  // Health
  healthState?: GoalHealthState;
  healthDetail?: any;
  
  // Completion policy
  completionPolicy?: CompletionPolicy;
  completionThreshold?: number;
  
  // Snapshot
  lastSnapshot?: GoalSnapshot;
  lastSnapshotAt?: string;
  
  keyResults?: { id: string; title: string; completed: boolean; targetValue?: number; currentValue?: number }[];
  visionImages?: string[];
  visionAffirmation?: string;
  noteBlocks?: import('../notes/types').Block[];
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  status?: 'inbox' | 'not_started' | 'next' | 'today' | 'in_progress' | 'done' | 'on_hold' | 'someday' | 'dropped';
  createdAt: string;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:MM
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'work' | 'personal' | 'health' | 'finance' | 'learning' | 'other';
  subTasks?: SubTask[];
  totalTimeSpent?: number; // Total spent time in seconds (derived from sessions)
  isTracking?: boolean;
  trackingStartTime?: number; // Epoch timestamp in ms when tracker started
  milestoneId?: string;
  googleTaskId?: string;
  
  // Planner hierarchy & dependencies
  projectId?: string; // پیوند به پروژه
  parentTaskId?: string; // پیوند به تسک والد
  childTaskIds?: string[]; // شناسه تسک‌های فرزند
  blockedBy?: string[]; // شناسه تسک‌های پیش‌نیاز
  blocking?: string[]; // شناسه تسک‌هایی که این تسک مانع آنهاست
  isBlocked?: boolean; // derived
  isDailyHighlight?: boolean; // تسک برجسته روزانه
  importance?: 'normal' | 'key' | 'milestone'; // اهمیت تسک (عادی/کلیدی/نقطه‌عطف)
  noteBlocks?: import('../notes/types').Block[]; // Notion-like rich text blocks
  
  // Session tracking
  actualMinutes?: number; // derived from backend sessions
  estimatedMinutes?: number; // planned effort
  activeSessionId?: string;
  
  // Area relation (direct or inherited from project)
  areaId?: string;
  
  // Effort type
  effortType?: 'fixed' | 'variable';
}

export interface TaskSession {
  id: string;
  taskId: string;
  startedAt: string;
  stoppedAt?: string;
  durationMinutes: number;
  status: 'active' | 'paused' | 'completed';
  notes?: string;
}

export type MoodType = 'excited' | 'happy' | 'neutral' | 'tired' | 'sad' | 'stressed';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood: MoodType;
  gratitude: string; // What the user is grateful for
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string; // YYYY-MM-DD
  category: string; // entertainment, music, utility, productivity, design, other
  cardUsed: string; // e.g., '•••• 5436'
  provider: string; // Netflix, Spotify, YouTube, Adobe, Dribbble, Notion, Dropbox, etc.
  status: 'active' | 'inactive';
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  motto: string;
  workField?: string;
  dailyWaterGoal?: number;
  sleepGoalHours?: number;
}

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  sleepTime: string; // e.g. "23:00"
  wakeTime: string; // e.g. "07:30"
  duration: number; // calculated hours, e.g. 8.5
  quality: number; // 1 to 10 scale
  energyLevel: number; // 1 to 10 scale
  notes?: string;
}

export interface BudgetSettings {
  monthlyTotal: number;
  categoryBudgets: Record<string, number>;
}

export type DocumentType = 'insurance' | 'contract' | 'certificate' | 'medical' | 'financial' | 'legal' | 'other';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  description: string;
  issuedBy?: string;
  issuedDate?: string;     // YYYY-MM-DD
  expiryDate?: string;     // YYYY-MM-DD
  tags: string[];
  createdAt: string;       // YYYY-MM-DD
  notes?: string;
  linkedBankAccountId?: string;
  linkedAssetId?: string;
  image?: string;          // Base64 document image/photo
  reminderDate?: string;   // YYYY-MM-DD for calendar reminder
}

export type OccasionType = 'birthday' | 'anniversary' | 'event' | 'deadline' | 'reminder';

export interface Occasion {
  id: string;
  title: string;
  type: OccasionType;
  date: string;            // YYYY-MM-DD (or MM-DD for yearly repeats)
  person?: string;
  recurrenceType: 'yearly' | 'monthly' | 'once';
  reminderDaysBefore: number;
  notes?: string;
  color?: string;
  estimatedBudget?: number;
  spentAmount?: number;
}

export interface MindfulnessSession {
  id: string;
  date: string;            // YYYY-MM-DD
  type: 'meditation' | 'breathing' | 'body-scan' | 'gratitude';
  durationMinutes: number;
  stressLevelBefore: number;  // 1-10
  stressLevelAfter: number;   // 1-10
  notes?: string;
}

// ─── Health Tracking ──────────────────────────────────────────────────────────

export interface WeightLog {
  id: string;
  date: string;       // YYYY-MM-DD
  weight: number;     // kg
  note?: string;
}

export interface BodyMeasurementLog {
  id: string;
  date: string;       // YYYY-MM-DD
  waist: number;      // cm (دور کمر)
  arm: number;        // cm (بازو)
  chest: number;      // cm (سینه)
  note?: string;
}

export interface VitalLog {
  id: string;
  date: string;       // YYYY-MM-DD
  systolic?: number;  // blood pressure top (e.g. 120)
  diastolic?: number; // blood pressure bottom (e.g. 80)
  heartRate?: number; // bpm
  bloodSugar?: number;// mg/dL
  temperature?: number; // °C
  oxygenSaturation?: number; // %
  note?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;       // e.g. "۱۰ میلی‌گرم"
  frequency: string;    // e.g. "روزی یک بار"
  startDate: string;    // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD — if ongoing, omit
  prescribedBy?: string;
  notes?: string;
  active: boolean;
  logs: string[];       // YYYY-MM-DD taken dates
}

export interface DoctorVisit {
  id: string;
  date: string;         // YYYY-MM-DD
  doctorName: string;
  specialty: string;
  clinic?: string;
  reason: string;
  diagnosis?: string;
  nextVisitDate?: string;
  notes?: string;
}

export interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory?: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string; // YYYY-MM-DD
  active: boolean;
}

export interface Debt {
  id: string;
  title: string;
  type: 'debt' | 'loan'; // debt = بدهی ما به دیگری, loan = طلب ما از دیگری
  amount: number;
  person: string;
  dueDate?: string; // YYYY-MM-DD
  description?: string;
  completed: boolean;
  createdAt: string;
}

export interface AssetInvestment {
  id: string;
  name: string; // e.g., 'بیت‌کوین', 'تتر', 'طلای ۱۸ عیار', 'سهام خودرو'
  symbol: string; // e.g., 'BTC', 'USDT', 'GOLD', 'KHODRO'
  type: 'crypto' | 'gold' | 'stock' | 'currency' | 'real_estate' | 'other';
  amount: number; // e.g., 0.054, 12.5
  purchasePrice: number; // average buy price in Toman
  currentPrice: number; // current market price in Toman
  notes?: string;
  lastUpdated: string; // YYYY-MM-DD
}

export interface MealLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "13:30"
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: string; // e.g., "چلو کباب به همراه ماست و نوشابه"
  calories: number; // kcal
  protein?: number; // grams
  carbs?: number; // grams
  fat?: number; // grams
  waterGlasses?: number; // glasses of water
}

export interface DietSetting {
  type: 'fasting' | 'keto' | 'low-carb' | 'vegetarian' | 'none';
  startDate: string; // YYYY-MM-DD
  targetWeight?: number; // kg
  dailyCaloriesGoal?: number; // kcal
  fastingWindow?: string; // e.g., "16:8"
  fastingStartTime?: string; // e.g., "20:00"
  fastingEndTime?: string; // e.g., "12:00"
  dietNotes?: string;
  height?: number; // in cm (for BMI)
  age?: number; // years (for BMR)
  gender?: 'male' | 'female'; // for BMR
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active'; // for BMR/TDEE
  weightGoalType?: 'lose' | 'gain' | 'maintain'; // target goal
}

// ─── Fitness Tracking ──────────────────────────────────────────────────────────

export interface GymExerciseSet {
  id: string;
  exerciseName: string;
  weight: number; // kg
  reps: number;
  sets: number;
}

export interface WorkoutLog {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'cardio' | 'strength' | 'other';
  cardioType?: 'running' | 'cycling' | 'swimming' | 'walking';
  distanceKm?: number; // for cardio
  durationMinutes: number;
  caloriesBurned?: number;
  gymSets?: GymExerciseSet[];
  notes?: string;
}

export interface Installment {
  id: string;
  title: string;
  totalAmount: number; // Total price of installment purchase
  installmentAmount: number; // Amount per installment
  totalMonths: number; // Number of months/installments
  paidMonths: number; // Number of paid installments
  startDate: string; // YYYY-MM-DD
  dayOfMonth: number; // Due day of month (1-31)
  category: string; // Expense category
  bankAccountId?: string; // Linked account or credit card
  completed: boolean;
  description?: string;
}

export interface ContactInteractionLog {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'call' | 'meeting' | 'chat' | 'other';
  durationMinutes?: number;
  notes?: string;
  location?: string;
}

export interface Contact {
  id: string;
  name: string;
  photoUrl?: string; // base64 image or placeholder
  category: 'family' | 'friend' | 'work' | 'mentor' | 'partner' | 'other';
  birthday?: string; // YYYY-MM-DD or MM-DD
  phone?: string;
  email?: string;
  traits: string[]; // e.g., ["مهربان", "منظم"]
  strengths?: string;
  hobbies?: string;
  notes?: string;
  lastInteractionDate?: string; // YYYY-MM-DD
  lastInteractionType?: 'call' | 'meeting' | 'chat' | 'other';
  interactionLogs?: ContactInteractionLog[];
  relationshipScore?: number; // 1-100 score of frequency of communication
  closenessTier?: 'inner' | 'outer' | 'acquaintance'; // طلایی (حلقه اول)، نقره‌ای، معمولی
}

export interface MoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  mood: MoodType;
  energyLevel: number; // 1-10
  mentalFocus: number; // 1-10
  triggers: string[]; // e.g., ["work", "exercise", "sleep", "family"]
  notes?: string;
  gratitude?: string;
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'windy';
}

export interface Area {
  id: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'inactive' | 'archived';
  sortOrder?: number;
  projectCount?: number;
  taskCount?: number;
  goalCount?: number;
  completedTasks?: number;
  completedProjects?: number;
  trackedMinutes?: number;
}

export interface LifeData {
  transactions: Transaction[];
  habits: Habit[];
  goals: Goal[];
  tasks: Task[];
  journalEntries: JournalEntry[];
  subscriptions: Subscription[];
  categories?: CategoryDef[];
  bankAccounts?: BankAccount[];
  profile?: UserProfile;
  sleepLogs?: SleepLog[];
  budgetSettings?: BudgetSettings;
  documents?: Document[];
  occasions?: Occasion[];
  mindfulnessSessions?: MindfulnessSession[];
  weightLogs?: WeightLog[];
  vitalLogs?: VitalLog[];
  medications?: Medication[];
  doctorVisits?: DoctorVisit[];
  recurringTransactions?: RecurringTransaction[];
  debts?: Debt[];
  assets?: AssetInvestment[];
  mealLogs?: MealLog[];
  dietSetting?: DietSetting;
  workoutLogs?: WorkoutLog[];
  bodyMeasurementLogs?: BodyMeasurementLog[];
  installments?: Installment[];
  contacts?: Contact[];
  moodLogs?: MoodLog[];
  areas?: Area[];
}
