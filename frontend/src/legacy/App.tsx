import React, { useState, useEffect, useRef } from 'react';
import { LifeData, Transaction, Habit, Goal, Task, JournalEntry, GoalCategory, TransactionCategory, MoodType, Subscription, CategoryDef, Project, BankAccount, UserProfile, SleepLog, BudgetSettings, Document as LifeDocument, Occasion, MindfulnessSession, RecurringTransaction, Debt, AssetInvestment, MealLog, DietSetting, WeightLog, WorkoutLog, BodyMeasurementLog, Installment, Milestone } from './types';
import { MOOD_LABELS, DEFAULT_CATEGORIES } from './initialData';
import { createEmptyLifeData, derivePrimaryPriority } from '../app/workspace-defaults';
import { useToday } from '../app/use-today';
import { subscribeAction } from '../app/navigation-bus';
import {
  parseCalendarPreferences,
  parseCustomCalendars,
  parseCustomExercises,
  parseFinanceQuickTemplates,
  parseNotionPages,
  parseSleepPreferences,
} from '../app/workspace-preferences';
import {
  createContactRecord,
  createDocumentRecord,
  createBankAccountRecord,
  createCategoryRecord,
  createGoalRecord,
  createHabitRecord,
  createJournalRecord,
  createMeasurementRecord,
  createMindfulnessRecord,
  createNutritionRecord,
  createOccasionRecord,
  createProjectRecord,
  createScheduleRecord,
  createSleepLogRecord,
  createTaskRecord,
  createTransactionRecord,
  createWorkoutRecord,
  deleteContactRecord,
  deleteDocumentRecord,
  deleteBankAccountRecord,
  deleteCategoryRecord,
  deleteGoalRecord,
  deleteHabitRecord,
  deleteJournalRecord,
  deleteMeasurementRecord,
  deleteMindfulnessRecord,
  deleteNutritionRecord,
  deleteOccasionRecord,
  deleteProjectRecord,
  deleteScheduleRecord,
  deleteSleepLogRecord,
  deleteTaskRecord,
  deleteTransactionRecord,
  deleteWorkoutRecord,
  finishTaskSession,
  getActiveTaskSession,
  getTaskTrackedMinutes,
  logHabitRecord,
  logMoodRecord,
  logWaterRecord,
  resumeTaskSession,
  startTaskSession,
  stopTaskSession,
  updateBankAccountRecord,
  updateContactRecord,
  updateGoalRecord,
  updateHabitRecord,
  updateOccasionRecord,
  updateProjectRecord,
  updateProfileRecord,
  updateScheduleRecord,
  updateSleepLogRecord,
  updateMindfulnessRecord,
  updateSettingsRecord,
  updateTaskRecord,
  updateTransactionRecord,
} from '../app/hambaft-api';

// Import Section Components — primary (eager)
import DashboardOverview from './components/DashboardOverview';
import CalendarSection, { ScheduleItem } from './components/CalendarSection';
import TaskManagerSection from './components/TaskManagerSection';
import NotionNotesSection from './components/NotionNotesSection';
import { useNotesStore, initOnboardingPages } from '../notes/useNotesStore';

// Lazy-loaded secondary sections — reduces initial bundle ~68%
const FinanceSection = React.lazy(() => import('./components/FinanceSection'));
const HabitSection = React.lazy(() => import('./components/HabitSection'));
const GoalDashboard = React.lazy(() => import('./components/GoalDashboard'));
const GoalDetailView = React.lazy(() => import('./components/GoalDetailView'));
const AiCoachSection = React.lazy(() => import('./components/AiCoachSection'));
const ProfileSection = React.lazy(() => import('./components/ProfileSection'));
const ProjectDashboard = React.lazy(() => import('./components/ProjectDashboard'));
const ProjectDetailView = React.lazy(() => import('./components/ProjectDetailView'));
const SleepSection = React.lazy(() => import('./components/SleepSection'));
const DocumentsSection = React.lazy(() => import('./components/DocumentsSection'));
const MindfulnessSection = React.lazy(() => import('./components/MindfulnessSection'));
const OccasionsSection = React.lazy(() => import('./components/OccasionsSection'));
const AreasSection = React.lazy(() => import('./components/AreasSection'));
const NotesLayout = React.lazy(() => import('../notes/components/NotesLayout'));
const NutritionSection = React.lazy(() => import('./components/NutritionSection'));
const PlannerSection = React.lazy(() => import('./components/PlannerSection'));
const FitnessSection = React.lazy(() => import('./components/FitnessSection'));
const MoodSection = React.lazy(() => import('./components/MoodSection'));
const BalanceReportSection = React.lazy(() => import('./components/BalanceReportSection'));
const ContactsSection = React.lazy(() => import('./components/ContactsSection'));
import { Contact, MoodLog } from './types';

import { 
  LayoutDashboard, 
  Wallet, 
  Flame, 
  Target, 
  BookOpen, 
  Sparkles, 
  Menu, 
  X,
  Heart,
  Calendar,
  Plus,
  Clock,
  User,
  PlusCircle,
  Briefcase,
  TrendingDown,
  TrendingUp,
  Info,
  ChevronLeft,
  Coffee,
  Smile,
  Meh,
  Moon,
  Frown,
  FolderKanban,
  AlertCircle,
  FolderOpen,
  Wind,
  Gift,
  Play,
  Pause,
  Square,
  RotateCcw,
  FileText,
  CheckSquare,
  Apple,
  Dumbbell,
  Users,
  Activity,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const NAVIGATION_GROUPS = [
  {
    title: 'عمومی و خانه',
    items: [
      { id: 'dashboard', label: 'داشبورد خانه', icon: LayoutDashboard },
      { id: 'coach', label: 'مربی هوش مصنوعی (کوچ)', icon: Sparkles },
      { id: 'contacts', label: 'مخاطبان و صمیمیت (CRM)', icon: Users }
    ]
  },
    {
    title: 'برنامه‌ریزی و زمان',
    items: [
      { id: 'journal', label: 'دفترچه یادداشت‌ها', icon: BookOpen },
      { id: 'planner', label: 'برنامه‌ریز شخصی', icon: Layers },
      { id: 'tasks', label: 'مدیریت تسک‌ها', icon: FileText },
      { id: 'calendar', label: 'تقویم توازن زندگی', icon: Calendar },
      { id: 'occasions', label: 'تقویم مناسبت‌ها', icon: Gift },
      { id: 'balance_report', label: 'گزارش توازن زندگی', icon: Activity }
    ]
  },
  {
    title: 'توازن و تندرستی',
    items: [
      { id: 'sleep', label: 'ریتم خواب و بیوریتم', icon: Moon },
      { id: 'mindfulness', label: 'تمرین ذهن‌آگاهی', icon: Wind },
      { id: 'mood', label: 'ارزیابی احساسات و مود', icon: Smile },
      { id: 'habits', label: 'عادت‌های طلایی', icon: Flame },
      { id: 'nutrition', label: 'تغذیه و رژیم غذایی', icon: Apple },
      { id: 'fitness', label: 'ورزش و باشگاه بدنسازی', icon: Dumbbell }
    ]
  },
  {
    title: 'رشد و کارآمدی',
    items: [
      { id: 'goals', label: 'اهداف بلندمدت', icon: Target },
      { id: 'projects', label: 'مدیریت پروژه‌ها', icon: FolderKanban },
      { id: 'areas', label: 'حوزه‌های زندگی', icon: Layers },
      { id: 'notes', label: 'یادداشت‌ها (Notion)', icon: FileText },
      { id: 'finance', label: 'امور مالی و مخارج', icon: Wallet },
      { id: 'documents', label: 'مدیریت اسناد', icon: FolderOpen },
      { id: 'profile', label: 'پروفایل و تنظیمات', icon: User }
    ]
  }
];

function getMoodIcon(iconName: string, className = "w-4 h-4") {
  switch (iconName) {
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Smile': return <Smile className={className} />;
    case 'Meh': return <Meh className={className} />;
    case 'Moon': return <Moon className={className} />;
    case 'Frown': return <Frown className={className} />;
    case 'AlertCircle': return <AlertCircle className={className} />;
    default: return <Smile className={className} />;
  }
}

export function toPersianDigits(num: number | string): string {
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

export function formatTimeDigital(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const hStr = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
  const mStr = `${m.toString().padStart(2, '0')}:`;
  const sStr = s.toString().padStart(2, '0');
  
  return toPersianDigits(hStr + mStr + sStr);
}

export function formatTimeHuman(seconds: number): string {
  if (!seconds || seconds === 0) return 'ثبت نشده';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const parts = [];
  if (h > 0) parts.push(`${toPersianDigits(h)} ساعت`);
  if (m > 0) parts.push(`${toPersianDigits(m)} دقیقه`);
  if (s > 0 || parts.length === 0) parts.push(`${toPersianDigits(s)} ثانیه`);
  
  return parts.join(' و ');
}

// TODAY_DATE was previously a hard-coded system-simulated date; it is now a
// live value from useToday() inside the component. SEED_TODAY_DATE is only
// used for constant defaults exported by initialData.


type AppProps = {
  initialTab?: string;
  initialTaskId?: string | null;
  initialGoalId?: string | null;
  initialProjectId?: string | null;
  onNavigate?: (path: string) => void;
  seedLifeData?: LifeData | null;
  seedScheduleItems?: ScheduleItem[] | null;
  seedWaterIntake?: number | null;
  seedSettings?: Record<string, any> | null;
}

function tabToPath(tab: string, ids: { taskId?: string | null; goalId?: string | null; projectId?: string | null } = {}) {
  switch (tab) {
    case 'coach': return '/coach';
    case 'contacts': return '/contacts';
    case 'inbox': return '/planner';
    case 'journal': return '/journal';
    case 'tasks': return '/tasks';
    case 'mood': return '/mood';
    case 'calendar': return '/calendar';
    case 'occasions': return '/occasions';
    case 'balance_report': return '/balance-report';
    case 'sleep': return '/sleep';
    case 'mindfulness': return '/mindfulness';
    case 'habits': return '/habits';
    case 'nutrition': return '/nutrition';
    case 'fitness': return '/fitness';
    case 'goals': return ids.goalId ? `/goals/${ids.goalId}` : '/goals';
    case 'projects': return ids.projectId ? `/projects/${ids.projectId}` : '/projects';
    case 'areas': return '/areas';
    case 'notes': return '/notes';
    case 'finance': return '/finance';
    case 'documents': return '/documents';
    case 'profile': return '/profile';
    case 'task-detail': return ids.taskId ? `/task/${ids.taskId}` : '/tasks';
    case 'planner-timeline': return '/planner/timeline';
    case 'planner-week': return '/planner/week';
    case 'planner-month': return '/planner/month';
    case 'planner-board': return '/planner/board';
    case 'planner-areas': return '/planner/areas';
    case 'planner': return '/planner';
    case 'home':
    case 'dashboard':
    default:
      return '/';
  }
}

export default function App({
  initialTab = 'dashboard',
  initialTaskId = null,
  initialGoalId = null,
  initialProjectId = null,
  onNavigate,
  seedLifeData = null,
  seedScheduleItems = null,
  seedWaterIntake = null,
  seedSettings = null,
}: AppProps) {
  // Live "today" (ISO YYYY-MM-DD). Replaces the former hard-coded constant so
  // all streak/agenda/date logic below tracks the real current day and
  // re-renders at local midnight. See use-today.ts.
  const TODAY_DATE = useToday();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(initialGoalId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const runSync = (label: string, job: () => Promise<void>) => {
    void job().catch((error) => {
      console.error(`[hambaft] ${label} failed`, error);
    });
  };

  const [settingsState, setSettingsState] = useState<Record<string, any>>(() => seedSettings || {});
  const settingsStateRef = useRef<Record<string, any>>(seedSettings || {});
  
  // App core state
  const [lifeData, setLifeData] = useState<LifeData>(() => seedLifeData || createEmptyLifeData());

  // Notes store
  initOnboardingPages();
  const notesStore = useNotesStore();

  useEffect(() => {
    if (seedLifeData) {
      setLifeData(seedLifeData);
    }
  }, [seedLifeData]);

  // 1. Water Intake State
  const [waterIntake, setWaterIntake] = useState<number>(() => seedWaterIntake || 0);

  // 3. Today's Schedule Agenda State
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => {
    return seedScheduleItems || [];
  });

  // 4. Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => settingsState.theme === 'تاریک');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedTaskId(initialTaskId);
  }, [initialTaskId]);

  useEffect(() => {
    setSelectedGoalId(initialGoalId);
  }, [initialGoalId]);

  useEffect(() => {
    setSelectedProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (seedScheduleItems) {
      setScheduleItems(seedScheduleItems);
    }
  }, [seedScheduleItems]);

  useEffect(() => {
    if (seedWaterIntake !== null && seedWaterIntake !== undefined) {
      setWaterIntake(seedWaterIntake);
    }
  }, [seedWaterIntake]);

  useEffect(() => {
    if (seedSettings) {
      setSettingsState(seedSettings);
    }
  }, [seedSettings]);

  useEffect(() => {
    settingsStateRef.current = settingsState;
  }, [settingsState]);

  useEffect(() => {
    setDarkMode(settingsState.theme === 'تاریک');
  }, [settingsState.theme]);

  const patchSettings = (patch: Record<string, unknown>) => {
    const changedEntries = Object.entries(patch).filter(([fieldname, value]) => settingsStateRef.current[fieldname] !== value);
    if (changedEntries.length === 0) {
      return;
    }

    const changedPatch = Object.fromEntries(changedEntries);
    const nextState = { ...settingsStateRef.current, ...changedPatch };
    settingsStateRef.current = nextState;
    setSettingsState(nextState);
    runSync('update settings', async () => {
      await updateSettingsRecord(changedPatch);
    });
  };

  // ─── Auto-persist collections without dedicated DocTypes ────────────────
  // Debounced JSON-blob sync for state that used to live only in memory.
  const hasHydratedRef = useRef(false);
  const persistTimerRef = useRef<any>(null);
  const lastPersistedRef = useRef<string>('');

  useEffect(() => {
    // Skip the very first pass so we do not overwrite hydrated data with empty defaults.
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    // Extract subcategory overrides map from categories.
    const subcategoriesMap: Record<string, string[]> = {};
    for (const cat of (lifeData.categories || [])) {
      if (cat && Array.isArray(cat.subcategories)) {
        subcategoriesMap[cat.id] = cat.subcategories;
      }
    }

    // Extract task time + daily highlight maps across general tasks and project tasks.
    const taskTimeMap: Record<string, number> = {};
    const dailyHighlightsMap: Record<string, boolean> = {};
    const collectTask = (task: any) => {
      if (!task || !task.id) return;
      if (typeof task.totalTimeSpent === 'number' && task.totalTimeSpent > 0) {
        taskTimeMap[task.id] = task.totalTimeSpent;
      }
      if (task.isDailyHighlight) {
        dailyHighlightsMap[task.id] = true;
      }
    };
    (lifeData.tasks || []).forEach(collectTask);
    (lifeData.goals || []).forEach((g: any) => {
      (g.projects || []).forEach((p: any) => (p.tasks || []).forEach(collectTask));
    });

    // Extract goal-scoped habits map (habits attached to a Goal, not the global habits list).
    const goalHabitsMap: Record<string, any[]> = {};
    for (const goal of (lifeData.goals || [])) {
      if (Array.isArray((goal as any).habits) && (goal as any).habits.length) {
        goalHabitsMap[goal.id] = (goal as any).habits;
      }
    }

    const snapshot = {
      debts_json: JSON.stringify(lifeData.debts || []),
      subscriptions_json: JSON.stringify(lifeData.subscriptions || []),
      recurring_transactions_json: JSON.stringify(lifeData.recurringTransactions || []),
      assets_json: JSON.stringify(lifeData.assets || []),
      installments_json: JSON.stringify(lifeData.installments || []),
      diet_setting_json: JSON.stringify(lifeData.dietSetting ? [lifeData.dietSetting] : []),
      budget_settings_json: JSON.stringify(lifeData.budgetSettings ? [lifeData.budgetSettings] : []),
      subcategories_json: JSON.stringify(subcategoriesMap),
      task_time_json: JSON.stringify(taskTimeMap),
      daily_highlights_json: JSON.stringify(dailyHighlightsMap),
      goal_habits_json: JSON.stringify(goalHabitsMap),
    };

    const signature = JSON.stringify(snapshot);
    if (signature === lastPersistedRef.current) {
      return;
    }

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      lastPersistedRef.current = signature;
      runSync('persist blob state', async () => {
        await updateSettingsRecord(snapshot);
      });
    }, 600);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lifeData.debts,
    lifeData.subscriptions,
    lifeData.recurringTransactions,
    lifeData.assets,
    lifeData.installments,
    lifeData.dietSetting,
    lifeData.budgetSettings,
    lifeData.categories,
    lifeData.tasks,
    lifeData.goals,
  ]);

  const notionPages = parseNotionPages(settingsState.notion_pages_json);
  const sleepPreferences = parseSleepPreferences(settingsState.sleep_preferences_json);
  const customExercises = parseCustomExercises(settingsState.custom_exercises_json);
  const financeQuickTemplates = parseFinanceQuickTemplates(settingsState.finance_quick_templates_json);
  const calendarPreferences = parseCalendarPreferences(settingsState.calendar_preferences_json);
  const customCalendars = parseCustomCalendars(settingsState.custom_calendars_json);

  const goToTab = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'task-detail') setSelectedTaskId(null);
    if (tab !== 'goals') setSelectedGoalId(null);
    if (tab !== 'projects') setSelectedProjectId(null);
    onNavigate?.(tabToPath(tab));
  };

  const goToTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveTab('task-detail');
    onNavigate?.(tabToPath('task-detail', { taskId }));
  };

  const goToGoal = (goalId?: string | null) => {
    setSelectedGoalId(goalId || null);
    setActiveTab('goals');
    onNavigate?.(tabToPath('goals', { goalId }));
  };

  const goToProject = (projectId?: string | null) => {
    setSelectedProjectId(projectId || null);
    setActiveTab('projects');
    onNavigate?.(tabToPath('projects', { projectId }));
  };

  // Sync dark mode class to root element
  useEffect(() => {
    const root = document.getElementById('app-root');
    const docHtml = document.documentElement;
    const docBody = document.body;
    if (darkMode) {
      docHtml.classList.add('dark');
      docBody.classList.add('dark');
      if (root) root.classList.add('dark');
    } else {
      docHtml.classList.remove('dark');
      docBody.classList.remove('dark');
      if (root) root.classList.remove('dark');
    }
  }, [darkMode]);

  // Quick Add Overlay States
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'task' | 'habit' | 'expense' | 'journal' | 'goal' | 'mood' | 'asset' | null>(null);

  // Forms state for quick add popup
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickHabitName, setQuickHabitName] = useState('');
  const [quickHabitDesc, setQuickHabitDesc] = useState('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickExpenseCat, setQuickExpenseCat] = useState<TransactionCategory>('food');
  const [quickExpenseDesc, setQuickExpenseDesc] = useState('');
  const [quickJournalTitle, setQuickJournalTitle] = useState('');
  const [quickJournalContent, setQuickJournalContent] = useState('');
  const [quickJournalMood, setQuickJournalMood] = useState<MoodType>('happy');
  const [quickJournalGratitude, setQuickJournalGratitude] = useState('');
  const [quickGoalTitle, setQuickGoalTitle] = useState('');
  const [quickGoalDesc, setQuickGoalDesc] = useState('');
  const [quickGoalCat, setQuickGoalCat] = useState<GoalCategory>('personal');
  const [quickGoalTarget, setQuickGoalTarget] = useState('2026-12-30');
  const [quickMoodSelect, setQuickMoodSelect] = useState<MoodType>('happy');

  // Asset Form State
  const [quickAssetName, setQuickAssetName] = useState('');
  const [quickAssetSymbol, setQuickAssetSymbol] = useState('');
  const [quickAssetType, setQuickAssetType] = useState<'crypto' | 'gold' | 'stock' | 'currency' | 'real_estate' | 'other'>('gold');
  const [quickAssetAmount, setQuickAssetAmount] = useState('');
  const [quickAssetBuyPrice, setQuickAssetBuyPrice] = useState('');
  const [quickAssetCurrentPrice, setQuickAssetCurrentPrice] = useState('');

  // ─── Session-based Time Tracker ────────────────────────────
  // Replaces local timer with backend session API
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // State to prompt the user to log a financial transaction when a related task is completed
  const [financePrompt, setFinancePrompt] = useState<{
    show: boolean;
    taskTitle: string;
    suggestedType: 'income' | 'expense';
    suggestedAmount: number;
    suggestedCategory: string;
  } | null>(null);

  const [dependencyError, setDependencyError] = useState<{
    show: boolean;
    taskTitle: string;
    blockingTaskTitle: string;
  } | null>(null);

  // Time Tracker interval ticking effect
  useEffect(() => {
    let interval: any = null;
    if (activeTimerTaskId && isTimerRunning) {
      interval = setInterval(() => {
        setActiveTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimerTaskId, isTimerRunning]);

  // Restore active session on mount
  useEffect(() => {
    (async () => {
      try {
        const resp: any = await getActiveTaskSession();
        const sess = resp?.data?.session;
        if (sess) {
          setActiveSessionId(sess.name);
          setActiveTimerTaskId(sess.task);
          setActiveTimerSeconds(0);
          setIsTimerRunning(true);
        }
      } catch {
        // no active session
      }
    })();
  }, []);

  // Time Tracker handlers — now using backend session API
  const handleStartTimer = async (taskId: string) => {
    try {
      // If there's already an active session, stop it first
      if (activeSessionId) {
        await stopTaskSession(activeSessionId);
      }
      const resp: any = await startTaskSession(taskId);
      const sess = resp?.data?.session;
      if (sess) {
        setActiveSessionId(sess.name);
        setActiveTimerTaskId(taskId);
        setActiveTimerSeconds(0);
        setIsTimerRunning(true);
      }
    } catch (e) {
      console.error('startTaskSession error:', e);
    }
  };

  const handlePauseTimer = async () => {
    if (!activeSessionId) return;
    try {
      await stopTaskSession(activeSessionId);
      setIsTimerRunning(false);
      // Keep the task as active but paused
    } catch (e) {
      console.error('pauseTaskSession error:', e);
    }
  };

  const handleResumeTimer = async () => {
    if (!activeSessionId) return;
    try {
      await resumeTaskSession(activeSessionId);
      setIsTimerRunning(true);
      setActiveTimerSeconds(0);
    } catch (e) {
      console.error('resumeTaskSession error:', e);
    }
  };

  const handleStopTimer = async () => {
    if (!activeSessionId) return;
    try {
      const resp: any = await finishTaskSession(activeSessionId);
      // Update task's actualMinutes from the session result
      const sess = resp?.data?.session;
      if (sess?.task) {
        const minsResp: any = await getTaskTrackedMinutes(sess.task);
        const totalMinutes = minsResp?.data?.tracked_minutes;
        if (totalMinutes !== undefined) {
          setLifeData(prev => {
            const updatedTasks = prev.tasks.map(t => {
              if (t.id === sess.task) {
                return { ...t, actualMinutes: totalMinutes, totalTimeSpent: totalMinutes * 60 };
              }
              return t;
            });
            return { ...prev, tasks: updatedTasks };
          });
        }
      }
      setActiveSessionId(null);
      setActiveTimerTaskId(null);
      setActiveTimerSeconds(0);
      setIsTimerRunning(false);
    } catch (e) {
      console.error('stopTaskSession error:', e);
    }
  };

  const handleResetTimerForTask = async (taskId: string) => {
    if (activeSessionId && activeTimerTaskId === taskId) {
      try {
        await stopTaskSession(activeSessionId);
      } catch (e) {
        console.error('resetTimer stop error:', e);
      }
      setActiveSessionId(null);
      setActiveTimerSeconds(0);
      setIsTimerRunning(false);
      setActiveTimerTaskId(null);
    }
    // Note: We don't reset actualMinutes from backend — that would need a separate API
    // The session duration is already recorded. Reset only clears the UI state.
  };

  // Auto-process subscription renewals on mount
  useEffect(() => {
    const today = TODAY_DATE;
    setLifeData(prev => {
      const subs = prev.subscriptions || [];
      let newTransactions = [...prev.transactions];
      const updatedSubs = subs.map(sub => {
        if (sub.status !== 'active') return sub;
        if (sub.nextBillingDate > today) return sub;

        // Create a transaction for each missed billing cycle
        let billingDate = sub.nextBillingDate;
        let updated = { ...sub };

        while (billingDate <= today) {
          const alreadyLogged = newTransactions.some(
            t => t.description === `تمدید خودکار: ${sub.name}` && t.date === billingDate
          );
          if (!alreadyLogged) {
            newTransactions.push({
              id: `t-sub-${sub.id}-${billingDate}`,
              type: 'expense',
              amount: sub.billingCycle === 'yearly' ? sub.price : sub.price,
              category: 'other',
              date: billingDate,
              description: `تمدید خودکار: ${sub.name}`
            });
          }

          // Advance to next billing date
          const d = new Date(billingDate);
          if (sub.billingCycle === 'monthly') {
            d.setMonth(d.getMonth() + 1);
          } else {
            d.setFullYear(d.getFullYear() + 1);
          }
          billingDate = d.toISOString().split('T')[0];
          updated = { ...updated, nextBillingDate: billingDate };
        }

        return updated;
      });

      const hasChanges =
        JSON.stringify(updatedSubs) !== JSON.stringify(subs) ||
        newTransactions.length !== prev.transactions.length;

      if (!hasChanges) return prev;
      return { ...prev, subscriptions: updatedSubs, transactions: newTransactions };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Streak Recalculation Algorithm
  const calculateStreak = (logs: string[]): number => {
    if (logs.length === 0) return 0;
    const uniqueSorted = Array.from(new Set(logs)).sort((a, b) => b.localeCompare(a));
    
    const today = new Date(TODAY_DATE);
    const formatObj = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatObj(today);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatObj(yesterday);

    if (!uniqueSorted.includes(todayStr) && !uniqueSorted.includes(yesterdayStr)) {
      return 0;
    }

    let currentStreak = 0;
    let checkDate = uniqueSorted.includes(todayStr) ? today : yesterday;

    while (true) {
      const checkStr = formatObj(checkDate);
      if (uniqueSorted.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  };

  // --- HANDLERS ---

  // Water increment/decrement
  const handleIncrementWater = () => {
    setWaterIntake(prev => {
      const next = Math.min(12, prev + 1);
      runSync('log water intake', async () => {
        await logWaterRecord(next, TODAY_DATE);
      });
      return next;
    });
  };
  const handleDecrementWater = () => {
    setWaterIntake(prev => {
      const next = Math.max(0, prev - 1);
      runSync('log water intake', async () => {
        await logWaterRecord(next, TODAY_DATE);
      });
      return next;
    });
  };

  // Schedule items handlers
  const handleAddScheduleItem = (item: Omit<ScheduleItem, 'id' | 'completed'> & { id?: string }) => {
    const newItem: ScheduleItem = {
      ...item,
      id: item.id || `s-${Date.now()}`,
      completed: false
    };
    setScheduleItems(prev => [...prev, newItem]);
    runSync('create schedule item', async () => {
      const response: any = await createScheduleRecord(newItem);
      const saved = response?.data?.event;
      if (!saved?.name) return;
      setScheduleItems(prev => prev.map(scheduleItem => (
        scheduleItem.id === newItem.id ? { ...scheduleItem, id: saved.name } : scheduleItem
      )));
    });
  };

  const handleToggleScheduleItem = (id: string) => {
    const current = scheduleItems.find(item => item.id === id);
    setScheduleItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
    if (current && !id.startsWith('s-')) {
      runSync('toggle schedule item', async () => {
        await updateScheduleRecord(id, { ...current, completed: !current.completed });
      });
    }
  };

  const handleDeleteScheduleItem = (id: string) => {
    setScheduleItems(prev => prev.filter(item => item.id !== id));
    if (!id.startsWith('s-')) {
      runSync('delete schedule item', async () => {
        await deleteScheduleRecord(id);
      });
    }
  };

  const handleUpdateScheduleItem = (id: string, updatedFields: Partial<ScheduleItem>) => {
    setScheduleItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
    if (!id.startsWith('s-')) {
      const current = scheduleItems.find(item => item.id === id);
      if (current) {
        runSync('update schedule item', async () => {
          await updateScheduleRecord(id, { ...current, ...updatedFields });
        });
      }
    }
  };

  // --- Sleep & Biorhythm Handlers ---
  const handleAddSleepLog = (newLog: Omit<SleepLog, 'id'>) => {
    const log: SleepLog = {
      ...newLog,
      id: `sl-${Date.now()}`
    };
    setLifeData(prev => {
      const date = newLog.date;
      const updatedHabits = prev.habits.map(h => {
        if (h.autoTrackType === 'sleep') {
          if (!h.logs.includes(date)) {
            const newLogs = [...h.logs, date];
            return {
              ...h,
              logs: newLogs,
              streak: calculateStreak(newLogs)
            };
          }
        }
        return h;
      });
      return {
        ...prev,
        sleepLogs: [...(prev.sleepLogs || []), log],
        habits: updatedHabits
      };
    });
    runSync('create sleep log', async () => {
      const response: any = await createSleepLogRecord(newLog);
      const saved = response?.data?.sleep_log;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        sleepLogs: (prev.sleepLogs || []).map(item => item.id === log.id ? { ...item, id: saved.name } : item)
      }));
    });
  };

  const handleDeleteSleepLog = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      sleepLogs: (prev.sleepLogs || []).filter(log => log.id !== id)
    }));
    if (!id.startsWith('sl-')) {
      runSync('delete sleep log', async () => {
        await deleteSleepLogRecord(id);
      });
    }
  };

  const handleUpdateSleepLog = (id: string, updatedFields: Partial<SleepLog>) => {
    setLifeData(prev => ({
      ...prev,
      sleepLogs: (prev.sleepLogs || []).map(log => log.id === id ? { ...log, ...updatedFields } : log)
    }));
    if (!id.startsWith('sl-')) {
      const current = (lifeData.sleepLogs || []).find(log => log.id === id);
      if (current) {
        runSync('update sleep log', async () => {
          await updateSleepLogRecord(id, { ...current, ...updatedFields });
        });
      }
    }
  };

  // 1. Incomes & Expenses
  const handleAddTransaction = (newT: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newT,
      id: `t-${Date.now()}`
    };
    setLifeData(prev => {
      let updatedAccounts = prev.bankAccounts || [];
      if (transaction.type === 'transfer') {
        if (transaction.bankAccountId) {
          updatedAccounts = updatedAccounts.map(b => {
            if (b.id === transaction.bankAccountId) {
              const newBalance = b.balance - transaction.amount;
              const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
              return { ...b, balance: newBalance, creditDebt: newDebt };
            }
            return b;
          });
        }
        if (transaction.toBankAccountId) {
          updatedAccounts = updatedAccounts.map(b => {
            if (b.id === transaction.toBankAccountId) {
              const newBalance = b.balance + transaction.amount;
              const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
              return { ...b, balance: newBalance, creditDebt: newDebt };
            }
            return b;
          });
        }
      } else {
        if (transaction.bankAccountId) {
          updatedAccounts = updatedAccounts.map(b => {
            if (b.id === transaction.bankAccountId) {
              const diff = transaction.type === 'expense' ? -transaction.amount : transaction.amount;
              const newBalance = b.balance + diff;
              const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
              return { ...b, balance: newBalance, creditDebt: newDebt };
            }
            return b;
          });
        }
      }
      return {
        ...prev,
        transactions: [...prev.transactions, transaction],
        bankAccounts: updatedAccounts
      };
    });
    runSync('create transaction', async () => {
      const response: any = await createTransactionRecord(newT);
      const saved = response?.data?.entry;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        transactions: prev.transactions.map(item => (
          item.id === transaction.id ? { ...item, id: saved.name } : item
        ))
      }));
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setLifeData(prev => {
      const t = prev.transactions.find(tx => tx.id === id);
      let updatedAccounts = prev.bankAccounts || [];
      if (t) {
        if (t.type === 'transfer') {
          if (t.bankAccountId) {
            updatedAccounts = updatedAccounts.map(b => {
              if (b.id === t.bankAccountId) {
                const newBalance = b.balance + t.amount;
                const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
                return { ...b, balance: newBalance, creditDebt: newDebt };
              }
              return b;
            });
          }
          if (t.toBankAccountId) {
            updatedAccounts = updatedAccounts.map(b => {
              if (b.id === t.toBankAccountId) {
                const newBalance = b.balance - t.amount;
                const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
                return { ...b, balance: newBalance, creditDebt: newDebt };
              }
              return b;
            });
          }
        } else {
          if (t.bankAccountId) {
            updatedAccounts = updatedAccounts.map(b => {
              if (b.id === t.bankAccountId) {
                const diff = t.type === 'expense' ? t.amount : -t.amount;
                const newBalance = b.balance + diff;
                const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
                return { ...b, balance: newBalance, creditDebt: newDebt };
              }
              return b;
            });
          }
        }
      }
      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        bankAccounts: updatedAccounts
      };
    });
    if (!id.startsWith('t-')) {
      runSync('delete transaction', async () => {
        await deleteTransactionRecord(id);
      });
    }
  };

  const handleEditTransaction = (id: string, updated: Omit<Transaction, 'id'>) => {
    setLifeData(prev => {
      const oldT = prev.transactions.find(tx => tx.id === id);
      let updatedAccounts = prev.bankAccounts || [];
      
      // Reverse old effect
      if (oldT) {
        if (oldT.type === 'transfer') {
          if (oldT.bankAccountId) {
            updatedAccounts = updatedAccounts.map(b => {
              if (b.id === oldT.bankAccountId) {
                const newBalance = b.balance + oldT.amount;
                const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
                return { ...b, balance: newBalance, creditDebt: newDebt };
              }
              return b;
            });
          }
          if (oldT.toBankAccountId) {
            updatedAccounts = updatedAccounts.map(b => {
              if (b.id === oldT.toBankAccountId) {
                const newBalance = b.balance - oldT.amount;
                const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
                return { ...b, balance: newBalance, creditDebt: newDebt };
              }
              return b;
            });
          }
        } else {
          if (oldT.bankAccountId) {
            updatedAccounts = updatedAccounts.map(b => {
              if (b.id === oldT.bankAccountId) {
                const diff = oldT.type === 'expense' ? oldT.amount : -oldT.amount;
                const newBalance = b.balance + diff;
                const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
                return { ...b, balance: newBalance, creditDebt: newDebt };
              }
              return b;
            });
          }
        }
      }
      
      // Apply new effect
      if (updated.type === 'transfer') {
        if (updated.bankAccountId) {
          updatedAccounts = updatedAccounts.map(b => {
            if (b.id === updated.bankAccountId) {
              const newBalance = b.balance - updated.amount;
              const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
              return { ...b, balance: newBalance, creditDebt: newDebt };
            }
            return b;
          });
        }
        if (updated.toBankAccountId) {
          updatedAccounts = updatedAccounts.map(b => {
            if (b.id === updated.toBankAccountId) {
              const newBalance = b.balance + updated.amount;
              const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
              return { ...b, balance: newBalance, creditDebt: newDebt };
            }
            return b;
          });
        }
      } else {
        if (updated.bankAccountId) {
          updatedAccounts = updatedAccounts.map(b => {
            if (b.id === updated.bankAccountId) {
              const diff = updated.type === 'expense' ? -updated.amount : updated.amount;
              const newBalance = b.balance + diff;
              const newDebt = b.isCredit ? Math.max(0, (b.creditLimit ?? 0) - newBalance) : undefined;
              return { ...b, balance: newBalance, creditDebt: newDebt };
            }
            return b;
          });
        }
      }
      
      return {
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? { ...updated, id } : t),
        bankAccounts: updatedAccounts
      };
    });
    if (!id.startsWith('t-')) {
      runSync('update transaction', async () => {
        await updateTransactionRecord(id, updated);
      });
    }
  };

  // 1.5 Debts and Loans
  const handleAddDebt = (debt: Omit<Debt, 'id' | 'createdAt' | 'completed'>) => {
    const newDebt: Debt = {
      ...debt,
      id: `dbt-${Date.now()}`,
      createdAt: TODAY_DATE,
      completed: false
    };
    setLifeData(prev => ({
      ...prev,
      debts: [...(prev.debts || []), newDebt]
    }));
  };

  const handleDeleteDebt = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      debts: (prev.debts || []).filter(d => d.id !== id)
    }));
  };

  const handleToggleDebtCompletion = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      debts: (prev.debts || []).map(d => d.id === id ? { ...d, completed: !d.completed } : d)
    }));
  };

  const handleAddCategory = (cat: Omit<CategoryDef, 'id'>) => {
    const newCat: CategoryDef = {
      ...cat,
      id: `cat-${Date.now()}`
    };
    setLifeData(prev => ({
      ...prev,
      categories: [...(prev.categories || DEFAULT_CATEGORIES), newCat]
    }));
    runSync('create category', async () => {
      const response: any = await createCategoryRecord(cat);
      // Frappe REST returns the doc as `{ data: {...} }`; call() unwraps to payload.message.
      // Support both shapes to be safe.
      const saved = response?.name || response?.data?.name || response?.message?.name;
      if (!saved) return;
      setLifeData(prev => ({
        ...prev,
        categories: (prev.categories || DEFAULT_CATEGORIES).map(category => (
          category.id === newCat.id ? { ...category, id: saved } : category
        ))
      }));
    });
  };

  const handleDeleteCategory = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      categories: (prev.categories || DEFAULT_CATEGORIES).filter(c => c.id !== id)
    }));
    if (!id.startsWith('cat-')) {
      runSync('delete category', async () => {
        await deleteCategoryRecord(id);
      });
    }
  };

  const handleAddSubcategory = (catId: string, subName: string) => {
    setLifeData(prev => {
      const currentCats = prev.categories || DEFAULT_CATEGORIES;
      const updatedCats = currentCats.map(c => {
        if (c.id === catId) {
          if (c.subcategories.includes(subName)) return c;
          return {
            ...c,
            subcategories: [...c.subcategories, subName]
          };
        }
        return c;
      });
      return {
        ...prev,
        categories: updatedCats
      };
    });
  };

  // Budget settings handler
  const handleUpdateBudgetSettings = (settings: BudgetSettings) => {
    setLifeData(prev => ({ ...prev, budgetSettings: settings }));
  };

  // ─── Documents ────────────────────────────────────────────────────────────────
  const handleAddDocument = (doc: Omit<LifeDocument, 'id' | 'createdAt'>) => {
    const newDoc: LifeDocument = { ...doc, id: `doc-${Date.now()}`, createdAt: TODAY_DATE };
    setLifeData(prev => {
      let updatedOccasions = prev.occasions || [];
      const schedDate = doc.reminderDate || doc.expiryDate;
      if (schedDate) {
        const docOccasion: Occasion = {
          id: `occ-doc-${Date.now()}`,
          title: `🛡️ یادآور سند: ${doc.title}`,
          date: schedDate,
          type: 'deadline',
          recurrenceType: 'once',
          reminderDaysBefore: 0,
          notes: `موعد یا یادآوری انقضای مدرک "${doc.title}". ${doc.description || ''}`
        };
        updatedOccasions = [...updatedOccasions, docOccasion];
      }
      return {
        ...prev,
        documents: [...(prev.documents || []), newDoc],
        occasions: updatedOccasions
      };
    });
    runSync('create document', async () => {
      const response: any = await createDocumentRecord(doc);
      const saved = response?.data?.document;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        documents: (prev.documents || []).map(item => item.id === newDoc.id ? { ...item, id: saved.name } : item)
      }));
      // Persist the auto-created occasion reminder to backend
      if (schedDate) {
        try {
          const docOcc: Omit<Occasion, 'id'> = {
            title: `🛡️ یادآور سند: ${doc.title}`,
            date: schedDate,
            type: 'deadline',
            recurrenceType: 'once',
            reminderDaysBefore: 0,
            notes: `موعد یا یادآوری انقضای مدرک "${doc.title}". ${doc.description || ''}`
          };
          await createOccasionRecord(docOcc);
        } catch { /* non-critical — occasion will be local-only */ }
      }
    });
  };
  const handleDeleteDocument = (id: string) => {
    setLifeData(prev => ({ ...prev, documents: (prev.documents || []).filter(d => d.id !== id) }));
    if (!id.startsWith('doc-')) {
      runSync('delete document', async () => {
        await deleteDocumentRecord(id);
      });
    }
  };

  // ─── Occasions ────────────────────────────────────────────────────────────────
  const handleAddOccasion = (o: Omit<Occasion, 'id'>) => {
    const newOcc: Occasion = { ...o, id: `occ-${Date.now()}` };
    setLifeData(prev => ({ ...prev, occasions: [...(prev.occasions || []), newOcc] }));
    runSync('create occasion', async () => {
      const response: any = await createOccasionRecord(o);
      const saved = response?.data?.occasion;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        occasions: (prev.occasions || []).map(item => item.id === newOcc.id ? { ...item, id: saved.name } : item)
      }));
    });
  };
  const handleDeleteOccasion = (id: string) => {
    setLifeData(prev => ({ ...prev, occasions: (prev.occasions || []).filter(o => o.id !== id) }));
    if (!id.startsWith('occ-')) {
      runSync('delete occasion', async () => {
        await deleteOccasionRecord(id);
      });
    }
  };
  const handleUpdateOccasion = (updated: Occasion) => {
    setLifeData(prev => ({ ...prev, occasions: (prev.occasions || []).map(o => o.id === updated.id ? updated : o) }));
    if (!updated.id.startsWith('occ-')) {
      runSync('update occasion', async () => {
        await updateOccasionRecord(updated);
      });
    }
  };

  // ─── Installment helpers & handlers ──────────────────────────────────────────
  const getNextMonthDate = (startDateStr: string, monthsToAdd: number, targetDay: number): string => {
    try {
      const parts = startDateStr.split('-');
      if (parts.length !== 3) return startDateStr;
      let year = parseInt(parts[0]);
      let month = parseInt(parts[1]) - 1; // 0-indexed
      
      month += monthsToAdd;
      year += Math.floor(month / 12);
      month = (month % 12 + 12) % 12;
      
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(targetDay, daysInMonth);
      
      const yStr = year.toString();
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    } catch (e) {
      return startDateStr;
    }
  };

  const handleAddInstallment = (inst: Omit<Installment, 'id' | 'completed'>) => {
    const id = `inst-${Date.now()}`;
    const newInst: Installment = {
      ...inst,
      id,
      completed: inst.paidMonths >= inst.totalMonths
    };

    // Automatically create occasions for future installments
    const newOccasions: Occasion[] = [];
    const startIdx = inst.paidMonths; // Only create occasions for unpaid months
    for (let i = startIdx; i < inst.totalMonths; i++) {
      const dueDate = getNextMonthDate(inst.startDate, i, inst.dayOfMonth);
      
      newOccasions.push({
        id: `occ-inst-${id}-${i}`,
        title: `قسط ${i + 1} از ${inst.totalMonths} - ${inst.title}`,
        type: 'reminder',
        date: dueDate,
        recurrenceType: 'once',
        reminderDaysBefore: 2,
        notes: `سررسید خرید اقساطی ${inst.title}. مبلغ قسط: ${inst.installmentAmount.toLocaleString('fa-IR')} تومان.`,
        estimatedBudget: inst.installmentAmount
      });
    }

    setLifeData(prev => {
      const updatedInstallments = [...(prev.installments || []), newInst];
      const updatedOccasions = [...(prev.occasions || []), ...newOccasions];
      return {
        ...prev,
        installments: updatedInstallments,
        occasions: updatedOccasions
      };
    });
  };

  const handleDeleteInstallment = (id: string) => {
    setLifeData(prev => {
      const updatedInstallments = (prev.installments || []).filter(inst => inst.id !== id);
      // Remove automatically created occasions
      const updatedOccasions = (prev.occasions || []).filter(occ => !occ.id.startsWith(`occ-inst-${id}`));
      return {
        ...prev,
        installments: updatedInstallments,
        occasions: updatedOccasions
      };
    });
  };

  const handlePayInstallment = (id: string, bankAccountId: string) => {
    let installmentTx: Transaction | null = null;
    setLifeData(prev => {
      const installments = prev.installments || [];
      const instIndex = installments.findIndex(inst => inst.id === id);
      if (instIndex === -1) return prev;

      const inst = installments[instIndex];
      if (inst.paidMonths >= inst.totalMonths) return prev;

      const nextPaidMonths = inst.paidMonths + 1;
      const isCompleted = nextPaidMonths >= inst.totalMonths;

      const updatedInst = {
        ...inst,
        paidMonths: nextPaidMonths,
        completed: isCompleted
      };

      const updatedInstallments = [...installments];
      updatedInstallments[instIndex] = updatedInst;

      // Add a real transaction
      const transaction: Transaction = {
        id: `t-inst-${Date.now()}`,
        type: 'expense',
        amount: inst.installmentAmount,
        category: inst.category,
        date: TODAY_DATE,
        description: `پرداخت قسط ${nextPaidMonths} از ${inst.totalMonths} بابت ${inst.title}`,
        bankAccountId
      };
      installmentTx = transaction;

      // Update bank account balance or credit card debt
      const updatedAccounts = (prev.bankAccounts || []).map(b => {
        if (b.id === bankAccountId) {
          return { ...b, balance: b.balance - inst.installmentAmount };
        }
        return b;
      });

      // Update corresponding occasion in calendar
      const occIdToUpdate = `occ-inst-${id}-${inst.paidMonths}`;
      const updatedOccasions = (prev.occasions || []).map(occ => {
        if (occ.id === occIdToUpdate) {
          return { ...occ, spentAmount: inst.installmentAmount, notes: `${occ.notes || ''} (پرداخت شده)` };
        }
        return occ;
      });

      return {
        ...prev,
        installments: updatedInstallments,
        transactions: [...prev.transactions, transaction],
        bankAccounts: updatedAccounts,
        occasions: updatedOccasions
      };
    });

    if (installmentTx) {
      const txId = (installmentTx as Transaction).id;
      runSync('create installment transaction', async () => {
        const response: any = await createTransactionRecord(installmentTx as Transaction);
        const saved = response?.data?.entry;
        if (!saved?.name) return;
        setLifeData(prev => ({
          ...prev,
          transactions: prev.transactions.map(item => (
            item.id === txId ? { ...item, id: saved.name } : item
          ))
        }));
      });
    }
  };

  // ─── Mindfulness ──────────────────────────────────────────────────────────────
  const handleAddMindfulnessSession = (s: Omit<MindfulnessSession, 'id'>) => {
    const newS: MindfulnessSession = { ...s, id: `ms-${Date.now()}` };
    setLifeData(prev => {
      const sessionDate = s.date;
      const updatedHabits = prev.habits.map(h => {
        if (h.autoTrackType === 'mindfulness') {
          if (!h.logs.includes(sessionDate)) {
            const newLogs = [...h.logs, sessionDate];
            return {
              ...h,
              logs: newLogs,
              streak: calculateStreak(newLogs)
            };
          }
        }
        return h;
      });
      return {
        ...prev,
        mindfulnessSessions: [...(prev.mindfulnessSessions || []), newS],
        habits: updatedHabits
      };
    });
    runSync('create mindfulness session', async () => {
      const response: any = await createMindfulnessRecord(s);
      const saved = response?.data?.session;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        mindfulnessSessions: (prev.mindfulnessSessions || []).map(item => item.id === newS.id ? { ...item, id: saved.name } : item)
      }));
    });
  };
  const handleDeleteMindfulnessSession = (id: string) => {
    setLifeData(prev => ({ ...prev, mindfulnessSessions: (prev.mindfulnessSessions || []).filter(s => s.id !== id) }));
    if (!id.startsWith('ms-')) {
      runSync('delete mindfulness session', async () => {
        await deleteMindfulnessRecord(id);
      });
    }
  };

  const handleUpdateMindfulnessSession = (id: string, updates: Partial<MindfulnessSession>) => {
    setLifeData(prev => ({
      ...prev,
      mindfulnessSessions: (prev.mindfulnessSessions || []).map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
    if (!id.startsWith('ms-')) {
      runSync('update mindfulness session', async () => {
        await updateMindfulnessRecord(id, updates);
      });
    }
  };

  // ─── Nutrition & Diets ──────────────────────────────────────────────────────────
  const handleAddMealLog = (m: Omit<MealLog, 'id'>) => {
    const newM: MealLog = { ...m, id: `ml-meal-${Date.now()}` };
    setLifeData(prev => {
      const date = m.date;
      const updatedHabits = prev.habits.map(h => {
        if (h.autoTrackType === 'meal') {
          if (!h.logs.includes(date)) {
            const newLogs = [...h.logs, date];
            return {
              ...h,
              logs: newLogs,
              streak: calculateStreak(newLogs)
            };
          }
        }
        return h;
      });
      return {
        ...prev,
        mealLogs: [...(prev.mealLogs || []), newM],
        habits: updatedHabits
      };
    });
    runSync('create nutrition log', async () => {
      const response: any = await createNutritionRecord(m);
      const saved = response?.data?.nutrition_log;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        mealLogs: (prev.mealLogs || []).map(item => item.id === newM.id ? { ...item, id: saved.name } : item)
      }));
    });
  };
  const handleDeleteMealLog = (id: string) => {
    setLifeData(prev => ({ ...prev, mealLogs: (prev.mealLogs || []).filter(m => m.id !== id) }));
    if (!id.startsWith('ml-meal-')) {
      runSync('delete nutrition log', async () => {
        await deleteNutritionRecord(id);
      });
    }
  };
  const handleUpdateDietSetting = (setting: DietSetting) => {
    setLifeData(prev => ({ ...prev, dietSetting: setting }));
  };
  const handleAddWeightLog = (w: Omit<WeightLog, 'id'>) => {
    const newW: WeightLog = { ...w, id: `wl-${Date.now()}` };
    setLifeData(prev => ({ ...prev, weightLogs: [...(prev.weightLogs || []), newW] }));
    runSync('create weight measurement', async () => {
      const response: any = await createMeasurementRecord('وزن', w.weight, w.date, 'kg', w.note);
      const saved = response?.name || response?.data?.name;
      if (!saved) return;
      setLifeData(prev => ({
        ...prev,
        weightLogs: (prev.weightLogs || []).map(item => item.id === newW.id ? { ...item, id: saved } : item)
      }));
    });
  };
  const handleAddBodyMeasurementLog = (b: Omit<BodyMeasurementLog, 'id'>) => {
    const newB: BodyMeasurementLog = { ...b, id: `bml-${Date.now()}` };
    setLifeData(prev => ({ ...prev, bodyMeasurementLogs: [...(prev.bodyMeasurementLogs || []), newB] }));
    runSync('create body measurement', async () => {
      const response: any = await createMeasurementRecord('سفارشی', b.waist, b.date, 'cm', b.note);
      const saved = response?.name || response?.data?.name;
      if (!saved) return;
      setLifeData(prev => ({
        ...prev,
        bodyMeasurementLogs: (prev.bodyMeasurementLogs || []).map(item => item.id === newB.id ? { ...item, id: saved } : item)
      }));
    });
  };
  const handleDeleteBodyMeasurementLog = (id: string) => {
    setLifeData(prev => ({ ...prev, bodyMeasurementLogs: (prev.bodyMeasurementLogs || []).filter(b => b.id !== id) }));
    if (!id.startsWith('bml-')) {
      runSync('delete body measurement', async () => {
        await deleteMeasurementRecord(id);
      });
    }
  };
  const handleUpdateGoalMetric = (goalId: string, newValue: number) => {
    let syncedGoal: Goal | null = null;
    setLifeData(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id === goalId && g.metric) {
          const newMetricLog = {
            id: `ml-${Date.now()}`,
            date: TODAY_DATE,
            value: newValue,
            note: 'بروزرسانی خودکار شاخص'
          };
          const nextGoal = {
            ...g,
            metric: {
              ...g.metric,
              currentValue: newValue,
              logs: [...(g.metric.logs || []), newMetricLog]
            }
          };
          syncedGoal = nextGoal;
          return nextGoal;
        }
        return g;
      })
    }));
    if (syncedGoal && !goalId.startsWith('g-')) {
      runSync('update goal metric', async () => {
        await updateGoalRecord(syncedGoal as Goal);
      });
    }
  };

  // ─── Fitness & Workouts ────────────────────────────────────────────────────────
  const handleAddWorkoutLog = (w: Omit<WorkoutLog, 'id'>) => {
    const newW: WorkoutLog = { ...w, id: `wl-fit-${Date.now()}` };
    setLifeData(prev => {
      const date = w.date;
      const updatedHabits = prev.habits.map(h => {
        if (h.autoTrackType === 'workout') {
          if (!h.logs.includes(date)) {
            const newLogs = [...h.logs, date];
            return {
              ...h,
              logs: newLogs,
              streak: calculateStreak(newLogs)
            };
          }
        }
        return h;
      });
      return {
        ...prev,
        workoutLogs: [...(prev.workoutLogs || []), newW],
        habits: updatedHabits
      };
    });
    runSync('create workout log', async () => {
      const response: any = await createWorkoutRecord(w);
      const saved = response?.data?.workout_log;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        workoutLogs: (prev.workoutLogs || []).map(item => item.id === newW.id ? { ...item, id: saved.name } : item)
      }));
    });
  };

  const handleDeleteWorkoutLog = (id: string) => {
    setLifeData(prev => ({ ...prev, workoutLogs: (prev.workoutLogs || []).filter(w => w.id !== id) }));
    if (!id.startsWith('wl-fit-')) {
      runSync('delete workout log', async () => {
        await deleteWorkoutRecord(id);
      });
    }
  };

  const handleDeleteSubcategory = (catId: string, subName: string) => {
    setLifeData(prev => {
      const currentCats = prev.categories || DEFAULT_CATEGORIES;
      const updatedCats = currentCats.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            subcategories: c.subcategories.filter(s => s !== subName)
          };
        }
        return c;
      });
      return {
        ...prev,
        categories: updatedCats
      };
    });
  };

  // 2. Habits
  const handleToggleHabitLog = (habitId: string, date: string) => {
    let completed = false;
    setLifeData(prev => {
      const updatedHabits = prev.habits.map(h => {
        if (h.id === habitId) {
          const exists = h.logs.includes(date);
          const newLogs = exists 
            ? h.logs.filter(d => d !== date)
            : [...h.logs, date];
          completed = !exists;
          
          return {
            ...h,
            logs: newLogs,
            streak: calculateStreak(newLogs)
          };
        }
        return h;
      });
      return { ...prev, habits: updatedHabits };
    });
    if (!habitId.startsWith('h-')) {
      runSync('log habit', async () => {
        await logHabitRecord(habitId, date, completed);
      });
    }
  };

  const handleAddHabit = (name: string, description: string, extras?: Partial<Habit>) => {
    const newHabit: Habit = {
      id: `h-${Date.now()}`,
      name,
      description,
      createdAt: TODAY_DATE,
      logs: [],
      streak: 0,
      ...extras
    };
    setLifeData(prev => ({
      ...prev,
      habits: [...prev.habits, newHabit]
    }));
    runSync('create habit', async () => {
      const response: any = await createHabitRecord(name, description, extras);
      const saved = response?.data?.habit;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        habits: prev.habits.map(habit => (
          habit.id === newHabit.id ? { ...habit, id: saved.name, name: saved.title || habit.name } : habit
        ))
      }));
    });
  };

  const handleUpdateHabit = (id: string, updates: Partial<Habit>) => {
    const existingHabit = lifeData.habits.find(habit => habit.id === id);
    setLifeData(prev => ({
      ...prev,
      habits: prev.habits.map(h => {
        if (h.id === id) {
          const merged = { ...h, ...updates };
          if (updates.logs) {
            merged.streak = calculateStreak(updates.logs);
          }
          return merged;
        }
        return h;
      })
    }));
    if (!id.startsWith('h-') && existingHabit) {
      runSync('update habit', async () => {
        await updateHabitRecord({ ...existingHabit, ...updates });
      });
    }
  };

  const handleDeleteHabit = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      habits: prev.habits.filter(h => h.id !== id)
    }));
    if (!id.startsWith('h-')) {
      runSync('delete habit', async () => {
        await deleteHabitRecord(id);
      });
    }
  };

  // 3. Goals
  const handleAddGoal = (newG: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => {
    const goal: Goal = {
      ...newG,
      id: `g-${Date.now()}`,
      createdAt: TODAY_DATE,
      completed: false
    };
    setLifeData(prev => ({
      ...prev,
      goals: [...prev.goals, goal]
    }));
    runSync('create goal', async () => {
      const response: any = await createGoalRecord(goal);
      const saved = response?.data?.goal;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        goals: prev.goals.map(item => (
          item.id === goal.id ? { ...item, id: saved.name, createdAt: String(saved.creation || item.createdAt).slice(0, 10) } : item
        ))
      }));
    });
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    let syncedGoal: Goal | null = null;
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.map(m => {
            if (m.id === milestoneId) {
              return { ...m, completed: !m.completed };
            }
            return m;
          });
          // Check if all milestones are completed
          const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.completed);
          const nextGoal = {
            ...g,
            milestones: updatedMilestones,
            completed: allDone ? true : g.completed
          };
          syncedGoal = nextGoal;
          return nextGoal;
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    if (syncedGoal && !goalId.startsWith('g-')) {
      runSync('toggle milestone', async () => {
        await updateGoalRecord(syncedGoal as Goal);
      });
    }
  };

  const handleAddMilestone = (goalId: string, title: string) => {
    let syncedGoal: Goal | null = null;
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const newM = {
            id: `m-direct-${Date.now()}`,
            title,
            completed: false
          };
          const nextGoal = {
            ...g,
            milestones: [...g.milestones, newM],
            completed: false // Adding milestone resets completion
          };
          syncedGoal = nextGoal;
          return nextGoal;
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    if (syncedGoal && !goalId.startsWith('g-')) {
      runSync('add milestone', async () => {
        await updateGoalRecord(syncedGoal as Goal);
      });
    }
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setLifeData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g)
    }));
    if (!updatedGoal.id.startsWith('g-')) {
      runSync('update goal', async () => {
        await updateGoalRecord(updatedGoal);
      });
    }
  };

  const handleToggleGoalCompletion = (id: string) => {
    let syncedGoal: Goal | null = null;
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === id) {
          const nowCompleted = !g.completed;
          // Sync all milestones if completing
          const updatedMilestones = g.milestones.map(m => ({
            ...m,
            completed: nowCompleted ? true : m.completed
          }));
          return {
            ...g,
            completed: nowCompleted,
            milestones: updatedMilestones
          };
        }
        return g;
      });
      syncedGoal = updatedGoals.find(goal => goal.id === id) || null;
      return { ...prev, goals: updatedGoals };
    });
    if (syncedGoal && !id.startsWith('g-')) {
      runSync('toggle goal', async () => {
        await updateGoalRecord(syncedGoal as Goal);
      });
    }
  };

  const handleDeleteGoal = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    }));
    if (!id.startsWith('g-')) {
      runSync('delete goal', async () => {
        await deleteGoalRecord(id);
      });
    }
  };

  const handleAddProjectToGoal = (goalId: string, title: string, description: string) => {
    const tempProjectId = `p-${Date.now()}`;
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const newProject: Project = {
            id: tempProjectId,
            title,
            description,
            completed: false,
            tasks: [],
            createdAt: TODAY_DATE,
            status: 'waiting'
          };
          return {
            ...g,
            projects: [...(g.projects || []), newProject]
          };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    syncProjectState(goalId, tempProjectId, 'create project');
  };

  const handleDeleteProjectFromGoal = (goalId: string, projectId: string) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          return {
            ...g,
            projects: (g.projects || []).filter(p => p.id !== projectId)
          };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    if (!projectId.startsWith('p-')) {
      runSync('delete project', async () => {
        await deleteProjectRecord(projectId);
      });
    }
  };

  const handleAddTaskToProject = (goalId: string, projectId: string, titleOrTask: string | Task) => {
    const newTask: Task = typeof titleOrTask === 'object' ? titleOrTask : {
      id: `tk-p-${Date.now()}`,
      title: titleOrTask,
      completed: false,
      createdAt: TODAY_DATE
    };
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedProjects = (g.projects || []).map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                tasks: [...(p.tasks || []), newTask],
                status: p.status === 'waiting' ? 'in_progress' : p.status
              };
            }
            return p;
          });
          return { ...g, projects: updatedProjects };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    syncProjectState(goalId, projectId, 'update project');
  };

  const handleToggleTaskInProject = (goalId: string, projectId: string, taskId: string) => {
    // Find task first
    let projectTask: Task | null = null;
    for (const g of lifeData.goals) {
      if (g.id === goalId) {
        for (const p of (g.projects || [])) {
          if (p.id === projectId) {
            projectTask = (p.tasks || []).find(t => t.id === taskId) || null;
          }
        }
      }
    }

    if (projectTask && !projectTask.completed) {
      const blockingTitle = checkTaskDependencies(projectTask);
      if (blockingTitle) {
        setDependencyError({
          show: true,
          taskTitle: projectTask.title,
          blockingTaskTitle: blockingTitle
        });
        return;
      }
    }

    setLifeData(prev => {
      let completedFinanceTask: any = null;
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedProjects = (g.projects || []).map(p => {
            if (p.id === projectId) {
              const updatedTasks = p.tasks.map(t => {
                if (t.id === taskId) {
                  const nextCompleted = !t.completed;
                  if (nextCompleted) {
                    completedFinanceTask = t;
                  }
                  return { ...t, completed: nextCompleted };
                }
                return t;
              });
              const allDone = updatedTasks.length > 0 && updatedTasks.every(t => t.completed);
              return {
                ...p,
                tasks: updatedTasks,
                completed: allDone,
                status: allDone ? 'completed' : 'in_progress'
              };
            }
            return p;
          });
          return { ...g, projects: updatedProjects };
        }
        return g;
      });

      if (completedFinanceTask) {
        const title = completedFinanceTask.title;
        const cat = completedFinanceTask.category;
        const isFinanceWord = (t: string) => {
          const words = ['pay', 'rent', 'settle', 'invoice', 'salary', 'income', 'expense', 'fee', 'bill', 'قسط', 'اجاره', 'حقوق', 'قبض', 'بیمه', 'تسویه', 'خرید', 'فروش', 'واریز', 'برداشت', 'یارانه', 'سود', 'کارت به کارت'];
          return words.some(w => t.toLowerCase().includes(w));
        };
        if (cat === 'finance' || isFinanceWord(title)) {
          setTimeout(() => {
            setFinancePrompt({
              show: true,
              taskTitle: title,
              suggestedType: (title.includes('حقوق') || title.includes('دریافت') || title.includes('salary') || title.includes('income')) ? 'income' : 'expense',
              suggestedAmount: title.includes('اجاره') ? 8000000 : (title.includes('قبض') ? 150000 : 500000),
              suggestedCategory: title.includes('اجاره') ? 'rent' : (title.includes('قبض') ? 'other' : 'shopping')
            });
          }, 400);
        }
      }

      return { ...prev, goals: updatedGoals };
    });
    syncProjectState(goalId, projectId, 'update project');
  };

  const handleToggleTaskTracking = async (goalId: string, projectId: string, taskId: string) => {
    // Use backend session API for tracking
    const task = lifeData.goals
      .filter(g => g.id === goalId)
      .flatMap(g => (g.projects || []))
      .filter(p => p.id === projectId)
      .flatMap(p => p.tasks || [])
      .find(t => t.id === taskId);

    if (task?.isTracking) {
      // Stop tracking — use the global timer stop
      if (activeTimerTaskId === taskId) {
        await handleStopTimer();
      }
    } else {
      // Start tracking — use the global timer start
      await handleStartTimer(taskId);
    }
  };

  const handleDeleteTaskFromProject = (goalId: string, projectId: string, taskId: string) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedProjects = (g.projects || []).map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                tasks: p.tasks.filter(t => t.id !== taskId),
                completed: false,
                status: 'in_progress'
              };
            }
            return p;
          });
          return { ...g, projects: updatedProjects };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    syncProjectState(goalId, projectId, 'update project');
  };

  const handleToggleProjectCompletion = (goalId: string, projectId: string) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedProjects = (g.projects || []).map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                completed: !p.completed,
                status: !p.completed ? 'completed' : 'in_progress'
              };
            }
            return p;
          });
          return { ...g, projects: updatedProjects };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    syncProjectState(goalId, projectId, 'update project');
  };

  const handleUpdateProjectDetails = (goalId: string, projectId: string, updates: { title?: string; description?: string; notes?: string; milestones?: Milestone[]; tasks?: Task[] }) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedProjects = (g.projects || []).map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                ...updates
              };
            }
            return p;
          });
          return { ...g, projects: updatedProjects };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
    syncProjectState(goalId, projectId, 'update project');
  };

  const handleAddHabitToGoal = (goalId: string, name: string, description: string) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const newHabit: Habit = {
            id: `h-g-${Date.now()}`,
            name,
            description,
            createdAt: TODAY_DATE,
            logs: [],
            streak: 0
          };
          return {
            ...g,
            habits: [...(g.habits || []), newHabit]
          };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
  };

  const handleToggleHabitLogInGoal = (goalId: string, habitId: string, date: string) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const updatedHabits = (g.habits || []).map(h => {
            if (h.id === habitId) {
              const exists = h.logs.includes(date);
              const newLogs = exists 
                ? h.logs.filter(d => d !== date)
                : [...h.logs, date];
              return {
                ...h,
                logs: newLogs,
                streak: calculateStreak(newLogs)
              };
            }
            return h;
          });
          return { ...g, habits: updatedHabits };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
  };

  const handleDeleteHabitFromGoal = (goalId: string, habitId: string) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          return {
            ...g,
            habits: (g.habits || []).filter(h => h.id !== habitId)
          };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
  };

  const handleLinkBankAccountToGoal = (goalId: string, bankAccountId: string | undefined) => {
    setLifeData(prev => {
      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          return { ...g, linkedBankAccountId: bankAccountId };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
  };

  const handleLinkHabitToGoal = (goalId: string, habitId: string) => {
    setLifeData(prev => {
      const habitToLink = prev.habits.find(h => h.id === habitId);
      if (!habitToLink) return prev;

      const updatedGoals = prev.goals.map(g => {
        if (g.id === goalId) {
          const alreadyLinked = (g.habits || []).some(h => h.name.trim().toLowerCase() === habitToLink.name.trim().toLowerCase());
          if (alreadyLinked) return g;
          return {
            ...g,
            habits: [...(g.habits || []), { ...habitToLink }]
          };
        }
        return g;
      });
      return { ...prev, goals: updatedGoals };
    });
  };

  const handleAddBankAccount = (bankAccount: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = { ...bankAccount, id: `b-${Date.now()}` };
    setLifeData(prev => {
      return { ...prev, bankAccounts: [...(prev.bankAccounts || []), newAcc] };
    });
    runSync('create bank account', async () => {
      const response: any = await createBankAccountRecord(bankAccount);
      const saved = response?.name || response?.data?.name;
      if (!saved) return;
      setLifeData(current => ({
        ...current,
        bankAccounts: (current.bankAccounts || []).map(account => (
          account.id === newAcc.id ? { ...account, id: saved } : account
        ))
      }));
    });
  };

  const handleDeleteBankAccount = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).filter(b => b.id !== id)
    }));
    if (!id.startsWith('b-')) {
      runSync('delete bank account', async () => {
        await deleteBankAccountRecord(id);
      });
    }
  };

  const handleUpdateBankAccount = (id: string, updated: Omit<BankAccount, 'id'>) => {
    setLifeData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(b => b.id === id ? { ...updated, id } : b)
    }));
    if (!id.startsWith('b-')) {
      runSync('update bank account', async () => {
        await updateBankAccountRecord(id, updated);
      });
    }
  };

  const handleAddAsset = (asset: Omit<AssetInvestment, 'id'>) => {
    setLifeData(prev => ({
      ...prev,
      assets: [...(prev.assets || []), { ...asset, id: `asset-${Date.now()}` }]
    }));
  };

  const handleDeleteAsset = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      assets: (prev.assets || []).filter(a => a.id !== id)
    }));
  };

  const handleUpdateAsset = (id: string, updated: Omit<AssetInvestment, 'id'>) => {
    setLifeData(prev => ({
      ...prev,
      assets: (prev.assets || []).map(a => a.id === id ? { ...updated, id } : a)
    }));
  };

  // 4. Tasks
  const findTaskById = (id: string): Task | null => {
    // Check general tasks
    const gt = lifeData.tasks.find(t => t.id === id);
    if (gt) return gt;
    // Check project tasks
    for (const g of lifeData.goals) {
      for (const p of (g.projects || [])) {
        const pt = (p.tasks || []).find(t => t.id === id);
        if (pt) return pt;
      }
    }
    return null;
  };

  const checkTaskDependencies = (task: Task): string | null => {
    if (!task.blockedBy || task.blockedBy.length === 0) return null;
    for (const depId of task.blockedBy) {
      const depTask = findTaskById(depId);
      if (depTask && !depTask.completed) {
        return depTask.title;
      }
    }
    return null;
  };

  const findProjectByIds = (goalId: string, projectId: string): Project | null => {
    const goal = lifeData.goals.find(g => g.id === goalId);
    if (!goal) return null;
    return (goal.projects || []).find(project => project.id === projectId) || null;
  };

  const syncProjectState = (goalId: string, projectId: string, label: string) => {
    const project = findProjectByIds(goalId, projectId);
    if (!project) return;

    if (project.id.startsWith('p-')) {
      runSync(label, async () => {
        const response: any = await createProjectRecord(project, goalId);
        const saved = response?.data?.project;
        if (!saved?.name) return;
        setLifeData(prev => ({
          ...prev,
          goals: prev.goals.map(goal => (
            goal.id === goalId
              ? {
                  ...goal,
                  projects: (goal.projects || []).map(item => (
                    item.id === projectId
                      ? {
                          ...item,
                          id: saved.name,
                          createdAt: String(saved.creation || item.createdAt).slice(0, 10),
                        }
                      : item
                  )),
                }
              : goal
          )),
        }));
      });
      return;
    }

    runSync(label, async () => {
      await updateProjectRecord(project.id, project, goalId);
    });
  };

  const handleToggleDailyHighlight = (id: string) => {
    const task = lifeData.tasks.find(t => t.id === id) || lifeData.goals.flatMap(g => (g.projects || []).flatMap(p => p.tasks || [])).find(t => t.id === id);
    setLifeData(prev => {
      const updatedTasks = prev.tasks.map(t => t.id === id ? { ...t, isDailyHighlight: !t.isDailyHighlight } : t);
      const updatedGoals = prev.goals.map(g => {
        const updatedProjects = (g.projects || []).map(p => {
          const updatedProjTasks = (p.tasks || []).map(t => t.id === id ? { ...t, isDailyHighlight: !t.isDailyHighlight } : t);
          return { ...p, tasks: updatedProjTasks };
        });
        return { ...g, projects: updatedProjects };
      });
      return { ...prev, tasks: updatedTasks, goals: updatedGoals };
    });
    if (task) {
      runSync('toggle daily highlight', async () => {
        await updateTaskRecord({ ...task, isDailyHighlight: !task.isDailyHighlight });
      });
    }
  };

  const handleAddTask = (titleOrTask: string | Task) => {
    if (typeof titleOrTask === 'object') {
      setLifeData(prev => ({
        ...prev,
        tasks: [...prev.tasks, titleOrTask]
      }));
      runSync('create task', async () => {
        const response: any = await createTaskRecord(titleOrTask);
        const saved = response?.data?.task;
        if (!saved?.name) return;
        setLifeData(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => (
            task.id === titleOrTask.id
              ? { ...task, id: saved.name, createdAt: String(saved.creation || task.createdAt).slice(0, 10) }
              : task
          ))
        }));
      });
    } else {
      const newTask: Task = {
        id: `tk-${Date.now()}`,
        title: titleOrTask,
        completed: false,
        createdAt: TODAY_DATE
      };
      setLifeData(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask]
      }));
      runSync('create task', async () => {
        const response: any = await createTaskRecord(newTask);
        const saved = response?.data?.task;
        if (!saved?.name) return;
        setLifeData(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => (
            task.id === newTask.id
              ? { ...task, id: saved.name, createdAt: String(saved.creation || task.createdAt).slice(0, 10) }
              : task
          ))
        }));
      });
    }
  };

  const handleToggleTask = (id: string) => {
    const taskToToggle = lifeData.tasks.find(t => t.id === id);
    if (taskToToggle && !taskToToggle.completed) {
      const blockingTitle = checkTaskDependencies(taskToToggle);
      if (blockingTitle) {
        setDependencyError({
          show: true,
          taskTitle: taskToToggle.title,
          blockingTaskTitle: blockingTitle
        });
        return;
      }
    }

    let syncedTask: Task | null = null;
    setLifeData(prev => {
      let isStopping = false;
      let completedFinanceTask: any = null;
      const updatedTasks = prev.tasks.map(t => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          if (nextCompleted && activeTimerTaskId === id) {
            isStopping = true;
          }
          if (nextCompleted) {
            completedFinanceTask = t;
          }
          return { ...t, completed: nextCompleted };
        }
        return t;
      });
      if (isStopping) {
        setTimeout(() => handleStopTimer(), 0);
      }

      if (completedFinanceTask) {
        const title = completedFinanceTask.title;
        const cat = completedFinanceTask.category;
        const isFinanceWord = (t: string) => {
          const words = ['pay', 'rent', 'settle', 'invoice', 'salary', 'income', 'expense', 'fee', 'bill', 'قسط', 'اجاره', 'حقوق', 'قبض', 'بیمه', 'تسویه', 'خرید', 'فروش', 'واریز', 'برداشت', 'یارانه', 'سود', 'کارت به کارت'];
          return words.some(w => t.toLowerCase().includes(w));
        };
        if (cat === 'finance' || isFinanceWord(title)) {
          setTimeout(() => {
            setFinancePrompt({
              show: true,
              taskTitle: title,
              suggestedType: (title.includes('حقوق') || title.includes('دریافت') || title.includes('salary') || title.includes('income')) ? 'income' : 'expense',
              suggestedAmount: title.includes('اجاره') ? 8000000 : (title.includes('قبض') ? 150000 : 500000),
              suggestedCategory: title.includes('اجاره') ? 'rent' : (title.includes('قبض') ? 'other' : 'shopping')
            });
          }, 400);
        }
      }

      syncedTask = updatedTasks.find(task => task.id === id) || null;
      return { ...prev, tasks: updatedTasks };
    });

    if (syncedTask && !id.startsWith('tk-')) {
      runSync('toggle task', async () => {
        await updateTaskRecord(syncedTask as Task);
      });
    }
  };

  const handleDeleteTask = (id: string) => {
    if (activeTimerTaskId === id) {
      setActiveTimerTaskId(null);
      setActiveTimerSeconds(0);
      setIsTimerRunning(false);
    }
    setLifeData(prev => {
      const updatedTasks = prev.tasks.filter(t => t.id !== id);
      const updatedGoals = prev.goals.map(g => {
        const updatedProjects = (g.projects || []).map(p => {
          return { ...p, tasks: (p.tasks || []).filter(t => t.id !== id) };
        });
        return { ...g, projects: updatedProjects };
      });
      return { ...prev, tasks: updatedTasks, goals: updatedGoals };
    });
    if (!id.startsWith('tk-')) {
      runSync('delete task', async () => {
        await deleteTaskRecord(id);
      });
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    if (updatedTask.completed && activeTimerTaskId === updatedTask.id) {
      setTimeout(() => handleStopTimer(), 0);
    }
    setLifeData(prev => {
      const updatedTasks = prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      const updatedGoals = prev.goals.map(g => {
        const updatedProjects = (g.projects || []).map(p => {
          const updatedProjTasks = (p.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t);
          return { ...p, tasks: updatedProjTasks };
        });
        return { ...g, projects: updatedProjects };
      });
      return { ...prev, tasks: updatedTasks, goals: updatedGoals };
    });
    if (!updatedTask.id.startsWith('tk-')) {
      runSync('update task', async () => {
        await updateTaskRecord(updatedTask);
      });
    }
  };

  // 5. Journal
  const handleAddJournalEntry = (newJ: Omit<JournalEntry, 'id'>) => {
    const journal: JournalEntry = {
      ...newJ,
      id: `j-${Date.now()}`
    };
    setLifeData(prev => ({
      ...prev,
      journalEntries: [...prev.journalEntries, journal]
    }));
    runSync('create journal entry', async () => {
      await createJournalRecord(newJ);
      if (newJ.content || newJ.gratitude) {
        await logMoodRecord({
          date: newJ.date,
          note: newJ.content,
          gratitude: newJ.gratitude,
        });
      }
    });
  };

  const handleDeleteJournalEntry = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      journalEntries: prev.journalEntries.filter(j => j.id !== id)
    }));
    if (!id.startsWith('j-')) {
      runSync('delete journal entry', async () => {
        await deleteJournalRecord(id);
      });
    }
  };

  // 5.5 Subscriptions Handlers
  const handleAddSubscription = (newSub: Omit<Subscription, 'id'>) => {
    const sub: Subscription = {
      ...newSub,
      id: `sub-${Date.now()}`
    };
    setLifeData(prev => ({
      ...prev,
      subscriptions: [...(prev.subscriptions || []), sub]
    }));
  };

  const handleDeleteSubscription = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      subscriptions: (prev.subscriptions || []).filter(s => s.id !== id)
    }));
  };

  const handleToggleSubscriptionStatus = (id: string) => {
    setLifeData(prev => {
      const updated = (prev.subscriptions || []).map(s => {
        if (s.id === id) {
          return { ...s, status: (s.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' };
        }
        return s;
      });
      return { ...prev, subscriptions: updated };
    });
  };

  const handleEditSubscription = (id: string, updated: Omit<Subscription, 'id'>) => {
    setLifeData(prev => ({
      ...prev,
      subscriptions: (prev.subscriptions || []).map(s => s.id === id ? { ...updated, id } : s)
    }));
  };

  // Recurring transactions
  const handleAddRecurring = (r: Omit<RecurringTransaction, 'id'>) => {
    setLifeData(prev => ({
      ...prev,
      recurringTransactions: [...(prev.recurringTransactions || []), { ...r, id: `rec-${Date.now()}` }]
    }));
  };

  const handleDeleteRecurring = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      recurringTransactions: (prev.recurringTransactions || []).filter(r => r.id !== id)
    }));
  };

  const handleToggleRecurring = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      recurringTransactions: (prev.recurringTransactions || []).map(r =>
        r.id === id ? { ...r, active: !r.active } : r
      )
    }));
  };

  const handleApplyRecurring = (id: string) => {
    const rec = (lifeData.recurringTransactions || []).find(r => r.id === id);
    if (!rec) return;
    handleAddTransaction({ type: rec.type, amount: rec.amount, category: rec.category, subcategory: rec.subcategory, description: rec.description, date: TODAY_DATE });
  };

  // 6. Data restore/backup import
  const handleImportData = (newData: LifeData) => {
    setLifeData(newData);
  };

  // 6.1 Mood Tracker Handlers
  const handleAddMoodLog = (newMood: Omit<MoodLog, 'id'>) => {
    const log: MoodLog = {
      ...newMood,
      id: `mld-${Date.now()}`
    };
    setLifeData(prev => ({
      ...prev,
      moodLogs: [...(prev.moodLogs || []), log]
    }));
    runSync('create mood log', async () => {
      await logMoodRecord({
        date: newMood.date,
        note: newMood.notes,
        gratitude: newMood.gratitude,
      });
    });
  };

  const handleDeleteMoodLog = (id: string) => {
    setLifeData(prev => ({
      ...prev,
      moodLogs: (prev.moodLogs || []).filter(l => l.id !== id)
    }));
  };

  // 6.2 Contacts CRM Handlers
  const handleAddContact = (newC: Omit<Contact, 'id'>) => {
    const tempContactId = `c-${Date.now()}`;
    const contact: Contact = {
      ...newC,
      id: tempContactId
    };
    setLifeData(prev => {
      const nextOccasions = [...(prev.occasions || [])];
      if (contact.birthday) {
        nextOccasions.push({
          id: `occ-bday-${Date.now()}`,
          title: `🎂 تولد: ${contact.name}`,
          type: 'birthday',
          date: contact.birthday,
          recurrenceType: 'yearly',
          reminderDaysBefore: 3,
          notes: `یادآوری تولد ${contact.name} از دفتر ارتباطات CRM. برای تبریک، تماس بگیرید.`
        });
      }
      return {
        ...prev,
        contacts: [...(prev.contacts || []), contact],
        occasions: nextOccasions
      };
    });
    runSync('create contact', async () => {
      const response: any = await createContactRecord(newC);
      const saved = response?.data?.contact;
      if (!saved?.name) return;
      setLifeData(prev => ({
        ...prev,
        contacts: (prev.contacts || []).map(c => (
          c.id === tempContactId
            ? { ...c, id: saved.name }
            : c
        ))
      }));
      // Persist the auto-created birthday occasion to backend
      if (contact.birthday) {
        try {
          const bdayOcc: Omit<Occasion, 'id'> = {
            title: `🎂 تولد: ${contact.name}`,
            type: 'birthday',
            date: contact.birthday,
            recurrenceType: 'yearly',
            reminderDaysBefore: 3,
            notes: `یادآوری تولد ${contact.name} از دفتر ارتباطات CRM. برای تبریک، تماس بگیرید.`
          };
          await createOccasionRecord(bdayOcc);
        } catch { /* non-critical */ }
      }
    });
  };

  const handleDeleteContact = (id: string) => {
    const contact = (lifeData.contacts || []).find(c => c.id === id);
    setLifeData(prev => {
      let updatedOccasions = prev.occasions || [];
      if (contact && contact.birthday) {
        updatedOccasions = updatedOccasions.filter(o => o.title !== `🎂 تولد: ${contact.name}`);
      }
      return {
        ...prev,
        contacts: (prev.contacts || []).filter(c => c.id !== id),
        occasions: updatedOccasions
      };
    });
    if (!id.startsWith('c-')) {
      runSync('delete contact', async () => {
        await deleteContactRecord(id);
      });
    }
  };

  const handleUpdateContact = (updatedC: Contact) => {
    const oldC = (lifeData.contacts || []).find(c => c.id === updatedC.id);
    setLifeData(prev => {
      let updatedOccasions = prev.occasions || [];
      if (oldC) {
        const oldBdayTitle = `🎂 تولد: ${oldC.name}`;
        const newBdayTitle = `🎂 تولد: ${updatedC.name}`;
        
        let foundOccasion = false;
        updatedOccasions = updatedOccasions.map(o => {
          if (o.title === oldBdayTitle && o.type === 'birthday') {
            foundOccasion = true;
            return {
              ...o,
              title: newBdayTitle,
              date: updatedC.birthday || o.date,
              notes: `یادآوری تولد ${updatedC.name} از دفتر ارتباطات CRM. برای تبریک، تماس بگیرید.`
            };
          }
          return o;
        });

        if (!foundOccasion && updatedC.birthday) {
          const newOcc: Occasion = {
            id: `occ-bday-${Date.now()}`,
            title: newBdayTitle,
            type: 'birthday',
            date: updatedC.birthday,
            recurrenceType: 'yearly',
            reminderDaysBefore: 3,
            notes: `یادآوری تولد ${updatedC.name} از دفتر ارتباطات CRM. برای تبریک، تماس بگیرید.`
          };
          updatedOccasions = [...updatedOccasions, newOcc];
        } else if (foundOccasion && !updatedC.birthday) {
          updatedOccasions = updatedOccasions.filter(o => o.title !== newBdayTitle);
        }
      }

      return {
        ...prev,
        contacts: (prev.contacts || []).map(c => c.id === updatedC.id ? updatedC : c),
        occasions: updatedOccasions
      };
    });
    if (!updatedC.id.startsWith('c-')) {
      runSync('update contact', async () => {
        await updateContactRecord(updatedC);
      });
    }
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setLifeData(prev => ({
      ...prev,
      profile: {
        ...(prev.profile || {
          name: 'کاربر',
          avatarUrl: '',
          motto: '',
          workField: '',
          dailyWaterGoal: 8,
          sleepGoalHours: 7.5
        }),
        ...updates
      }
    }));
    runSync('update profile', async () => {
      await updateProfileRecord(updates);
    });
  };

  const primaryPriority = derivePrimaryPriority(lifeData.tasks || [], scheduleItems);
  const handleToggleTheme = () => {
    setDarkMode((current) => {
      const next = !current;
      patchSettings({ theme: next ? 'تاریک' : 'روشن' });
      return next;
    });
  };

  // Quick Add Popup Form Submissions
  const submitQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    handleAddTask(quickTaskTitle.trim());
    setQuickTaskTitle('');
    setQuickAddType(null);
  };

  const submitQuickHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHabitName.trim()) return;
    handleAddHabit(quickHabitName.trim(), quickHabitDesc.trim());
    setQuickHabitName('');
    setQuickHabitDesc('');
    setQuickAddType(null);
    goToTab('tasks'); // Route to tasks view
  };

  const submitQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(quickExpenseAmount);
    if (!parsedAmount || isNaN(parsedAmount)) return;
    handleAddTransaction({
      type: 'expense',
      amount: parsedAmount,
      category: quickExpenseCat,
      description: quickExpenseDesc.trim() || 'ثبت هزینه سریع',
      date: TODAY_DATE
    });
    setQuickExpenseAmount('');
    setQuickExpenseDesc('');
    setQuickAddType(null);
    goToTab('finance'); // Route to budget view
  };

  const submitQuickJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJournalTitle.trim() || !quickJournalContent.trim()) return;
    handleAddJournalEntry({
      date: TODAY_DATE,
      title: quickJournalTitle.trim(),
      content: quickJournalContent.trim(),
      mood: quickJournalMood,
      gratitude: quickJournalGratitude.trim() || 'ثبت لحظات زیبای زندگی'
    });
    setQuickJournalTitle('');
    setQuickJournalContent('');
    setQuickJournalGratitude('');
    setQuickAddType(null);
    goToTab('journal'); // Route to journal logs
  };

  const submitQuickGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoalTitle.trim()) return;
    handleAddGoal({
      title: quickGoalTitle.trim(),
      description: quickGoalDesc.trim() || 'یک هدف الهام‌بخش جدید برای زندگی',
      category: quickGoalCat,
      targetDate: quickGoalTarget,
      milestones: []
    });
    setQuickGoalTitle('');
    setQuickGoalDesc('');
    setQuickAddType(null);
    goToTab('goals'); // Route to goals view
  };

  const submitQuickMood = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddJournalEntry({
      date: TODAY_DATE,
      title: `ثبت مود روزانه`,
      content: `من امروز در ساعت ${new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})} حال و انرژی خود را ثبت کردم. وضعیت انرژی من: ${MOOD_LABELS[quickMoodSelect]?.label || quickMoodSelect}`,
      mood: quickMoodSelect,
      gratitude: 'ثبت آرامش و خودآگاهی'
    });
    setQuickAddType(null);
    goToTab('home');
  };

  const submitQuickAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssetName.trim()) return;
    const amount = Number(quickAssetAmount) || 0;
    const purchasePrice = Number(quickAssetBuyPrice) || 0;
    const currentPrice = Number(quickAssetCurrentPrice) || 0;

    handleAddAsset({
      name: quickAssetName.trim(),
      symbol: quickAssetSymbol.trim() || 'ASSET',
      type: quickAssetType,
      amount,
      purchasePrice,
      currentPrice,
      notes: 'ثبت سریع از پنل میانبر همبافت',
      lastUpdated: TODAY_DATE
    });

    setQuickAssetName('');
    setQuickAssetSymbol('');
    setQuickAssetAmount('');
    setQuickAssetBuyPrice('');
    setQuickAssetCurrentPrice('');
    setQuickAddType(null);
    goToTab('finance');
  };

  const renderActiveSection = () => (
    <React.Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#7C8363] border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-[#8D7F72]">در حال بارگذاری...</span>
        </div>
      </div>
    }>
      {renderActiveSectionInner()}
    </React.Suspense>
  )

  const renderActiveSectionInner = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'home':
        return (
          <DashboardOverview 
            data={lifeData} 
            setActiveTab={goToTab} 
            todayDate={TODAY_DATE} 
            waterIntake={waterIntake}
            onIncrementWater={handleIncrementWater}
            onDecrementWater={handleDecrementWater}
            primaryPriority={primaryPriority}
            scheduleItems={scheduleItems}
            onToggleScheduleItem={handleToggleScheduleItem}
            onToggleTask={handleToggleTask}
            onToggleTaskInProject={handleToggleTaskInProject}
            onToggleDailyHighlight={handleToggleDailyHighlight}
          />
        );
      case 'calendar':
        return (
          <CalendarSection 
            scheduleItems={scheduleItems}
            onAddScheduleItem={handleAddScheduleItem}
            onToggleScheduleItem={handleToggleScheduleItem}
            onDeleteScheduleItem={handleDeleteScheduleItem}
            onUpdateScheduleItem={handleUpdateScheduleItem}
            transactions={lifeData.transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleEditTransaction}
            tasks={lifeData.tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            habits={lifeData.habits}
            onToggleHabitLog={handleToggleHabitLog}
            todayDate={TODAY_DATE}
            mealLogs={lifeData.mealLogs || []}
            workoutLogs={lifeData.workoutLogs || []}
            sleepLogs={lifeData.sleepLogs || []}
            initialPreferences={calendarPreferences}
            initialCalendars={customCalendars}
            onPreferencesChange={(preferences) => patchSettings({ calendar_preferences_json: JSON.stringify(preferences) })}
            onCalendarsChange={(calendars) => patchSettings({ custom_calendars_json: JSON.stringify(calendars) })}
          />
        );
      case 'finance':
        return (
          <FinanceSection 
            transactions={lifeData.transactions} 
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            subscriptions={lifeData.subscriptions || []}
            onAddSubscription={handleAddSubscription}
            onDeleteSubscription={handleDeleteSubscription}
            onToggleSubscriptionStatus={handleToggleSubscriptionStatus}
            onEditSubscription={handleEditSubscription}
            categories={lifeData.categories || DEFAULT_CATEGORIES}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSubcategory={handleAddSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            budgetSettings={lifeData.budgetSettings}
            onUpdateBudgetSettings={handleUpdateBudgetSettings}
            bankAccounts={lifeData.bankAccounts || []}
            onAddBankAccount={handleAddBankAccount}
            onDeleteBankAccount={handleDeleteBankAccount}
            onUpdateBankAccount={handleUpdateBankAccount}
            recurringTransactions={lifeData.recurringTransactions || []}
            onAddRecurring={handleAddRecurring}
            onDeleteRecurring={handleDeleteRecurring}
            onToggleRecurring={handleToggleRecurring}
            onApplyRecurring={handleApplyRecurring}
            todayDate={TODAY_DATE}
            debts={lifeData.debts || []}
            onAddDebt={handleAddDebt}
            onDeleteDebt={handleDeleteDebt}
            onToggleDebtCompletion={handleToggleDebtCompletion}
            assets={lifeData.assets || []}
            onAddAsset={handleAddAsset}
            onDeleteAsset={handleDeleteAsset}
            onUpdateAsset={handleUpdateAsset}
            documents={lifeData.documents || []}
            installments={lifeData.installments || []}
            onAddInstallment={handleAddInstallment}
            onDeleteInstallment={handleDeleteInstallment}
            onPayInstallment={handlePayInstallment}
            initialQuickTemplates={financeQuickTemplates}
            onQuickTemplatesChange={(templates) => patchSettings({ finance_quick_templates_json: JSON.stringify(templates) })}
          />
        );
      case 'habits':
        return (
          <HabitSection 
            habits={lifeData.habits}
            onToggleHabitLog={handleToggleHabitLog}
            onAddHabit={handleAddHabit}
            onDeleteHabit={handleDeleteHabit}
            onUpdateHabit={handleUpdateHabit}
            todayDate={TODAY_DATE}
          />
        );
      case 'journal':
        return (
          <NotionNotesSection
            initialPages={notionPages}
            onPagesChange={(pages) => patchSettings({ notion_pages_json: JSON.stringify(pages) })}
          />
        );
      case 'tasks':
        return (
          <TaskManagerSection
            tasks={lifeData.tasks}
            goals={lifeData.goals}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
            onViewTaskDetails={(id) => {
              goToTaskDetail(id);
            }}
            todayDate={TODAY_DATE}
          />
        );
      case 'planner':
      case 'inbox':
        return <PlannerSection initialView="buckets" />;
      case 'planner-timeline':
        return <PlannerSection initialView="timeline" />;
      case 'planner-week':
        return <PlannerSection initialView="week" />;
      case 'planner-month':
        return <PlannerSection initialView="month" />;
      case 'planner-board':
        return <PlannerSection initialView="board" />;
      case 'planner-areas':
        return <PlannerSection initialView="areas" />;
      case 'task-detail':
        // Deep-link: show task list with the drawer open for the selected task.
        // This replaces the old TaskDetailView full-page, which duplicated
        // functionality now in TaskDetailDrawer.
        return (
          <TaskManagerSection
            tasks={lifeData.tasks}
            goals={lifeData.goals}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
            onViewTaskDetails={(id) => {
              goToTaskDetail(id);
            }}
            todayDate={TODAY_DATE}
            initialDrawerTaskId={selectedTaskId}
          />
        );
      case 'goals':
        if (selectedGoalId) {
          const matchedGoal = lifeData.goals.find(g => g.id === selectedGoalId);
          if (matchedGoal) {
            return (
              <GoalDetailView 
                goal={matchedGoal}
                globalHabits={lifeData.habits || []}
                bankAccounts={lifeData.bankAccounts || []}
                workoutLogs={lifeData.workoutLogs || []}
                sleepLogs={lifeData.sleepLogs || []}
                mindfulnessSessions={lifeData.mindfulnessSessions || []}
                journalEntries={lifeData.journalEntries || []}
                onBack={() => goToGoal(null)}
                onUpdateGoal={handleUpdateGoal}
                onAddProjectToGoal={handleAddProjectToGoal}
                onDeleteProjectFromGoal={handleDeleteProjectFromGoal}
                onAddTaskToProject={handleAddTaskToProject}
                onToggleTaskInProject={handleToggleTaskInProject}
                onDeleteTaskFromProject={handleDeleteTaskFromProject}
                onAddHabitToGoal={handleAddHabitToGoal}
                onToggleHabitLogInGoal={handleToggleHabitLogInGoal}
                onDeleteHabitFromGoal={handleDeleteHabitFromGoal}
                onToggleMilestone={handleToggleMilestone}
                onAddMilestone={handleAddMilestone}
                onDeleteGoal={handleDeleteGoal}
                onToggleGoalCompletion={handleToggleGoalCompletion}
                onLinkBankAccountToGoal={handleLinkBankAccountToGoal}
                onLinkHabitToGoal={handleLinkHabitToGoal}
                onAddBankAccount={handleAddBankAccount}
              />
            );
          }
        }
        return (
          <GoalDashboard 
            goals={lifeData.goals}
            onAddGoal={handleAddGoal}
            onToggleMilestone={handleToggleMilestone}
            onAddMilestone={handleAddMilestone}
            onDeleteGoal={handleDeleteGoal}
            onToggleGoalCompletion={handleToggleGoalCompletion}
            setActiveTab={goToTab}
            onSelectGoal={goToGoal}
            onAddProjectToGoal={handleAddProjectToGoal}
            onDeleteProjectFromGoal={handleDeleteProjectFromGoal}
            onAddTaskToProject={handleAddTaskToProject}
            onToggleTaskInProject={handleToggleTaskInProject}
            onDeleteTaskFromProject={handleDeleteTaskFromProject}
            onAddHabitToGoal={handleAddHabitToGoal}
            onToggleHabitLogInGoal={handleToggleHabitLogInGoal}
            onDeleteHabitFromGoal={handleDeleteHabitFromGoal}
            onUpdateGoal={handleUpdateGoal}
          />
        );
      case 'projects':
        if (selectedProjectId) {
          // Find the project across all goals
          let matchedProject: any = null;
          for (const g of lifeData.goals) {
            const found = (g.projects || []).find(p => p.id === selectedProjectId);
            if (found) {
              matchedProject = {
                ...found,
                goalId: g.id,
                goalTitle: g.title,
                goalCategory: g.category
              };
              break;
            }
          }
          if (matchedProject) {
            return (
              <ProjectDetailView 
                project={matchedProject}
                transactions={lifeData.transactions}
                bankAccounts={lifeData.bankAccounts}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onToggleTaskTracking={handleToggleTaskTracking}
                onBack={() => goToProject(null)}
                onAddTaskToProject={handleAddTaskToProject}
                onToggleTaskInProject={handleToggleTaskInProject}
                onDeleteTaskFromProject={handleDeleteTaskFromProject}
                onToggleProjectCompletion={handleToggleProjectCompletion}
                onUpdateProjectDetails={handleUpdateProjectDetails}
              />
            );
          }
        }
        return (
          <ProjectDashboard 
            goals={lifeData.goals}
            onAddProjectToGoal={handleAddProjectToGoal}
            onDeleteProjectFromGoal={handleDeleteProjectFromGoal}
            onAddTaskToProject={handleAddTaskToProject}
            onToggleTaskInProject={handleToggleTaskInProject}
            onDeleteTaskFromProject={handleDeleteTaskFromProject}
            setActiveTab={goToTab}
            onSelectGoal={(id) => {
              goToGoal(id);
            }}
            onSelectProject={goToProject}
            onUpdateProjectDetails={handleUpdateProjectDetails}
          />
        );
      case 'sleep':
        return (
          <SleepSection 
            sleepLogs={lifeData.sleepLogs || []}
            sleepGoalHours={lifeData.profile?.sleepGoalHours || 7.5}
            onAddSleepLog={handleAddSleepLog}
            onDeleteSleepLog={handleDeleteSleepLog}
            onUpdateSleepLog={handleUpdateSleepLog}
            todayDate={TODAY_DATE}
            initialPreferences={sleepPreferences}
            onPreferencesChange={(preferences) => patchSettings({ sleep_preferences_json: JSON.stringify(preferences) })}
          />
        );
      case 'documents':
        return (
          <DocumentsSection
            documents={lifeData.documents || []}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            bankAccounts={lifeData.bankAccounts || []}
            assets={lifeData.assets || []}
          />
        );
      case 'occasions':
        return (
          <OccasionsSection
            occasions={lifeData.occasions || []}
            onAddOccasion={handleAddOccasion}
            onDeleteOccasion={handleDeleteOccasion}
            onUpdateOccasion={handleUpdateOccasion}
            onAddTransaction={handleAddTransaction}
            bankAccounts={lifeData.bankAccounts || []}
          />
        );
      case 'mindfulness':
        return (
          <MindfulnessSection
            sessions={lifeData.mindfulnessSessions || []}
            onAddSession={handleAddMindfulnessSession}
            onDeleteSession={handleDeleteMindfulnessSession}
            onUpdateSession={handleUpdateMindfulnessSession}
          />
        );
      case 'nutrition':
        return (
          <NutritionSection
            mealLogs={lifeData.mealLogs || []}
            dietSetting={lifeData.dietSetting || { type: 'none', startDate: TODAY_DATE }}
            goals={lifeData.goals || []}
            weightLogs={lifeData.weightLogs || []}
            todayDate={TODAY_DATE}
            onAddMealLog={handleAddMealLog}
            onDeleteMealLog={handleDeleteMealLog}
            onUpdateDietSetting={handleUpdateDietSetting}
            onAddWeightLog={handleAddWeightLog}
            onUpdateGoalMetric={handleUpdateGoalMetric}
          />
        );
      case 'fitness':
        return (
          <FitnessSection
            workoutLogs={lifeData.workoutLogs || []}
            goals={lifeData.goals || []}
            weightLogs={lifeData.weightLogs || []}
            bodyMeasurementLogs={lifeData.bodyMeasurementLogs || []}
            todayDate={TODAY_DATE}
            onAddWorkoutLog={handleAddWorkoutLog}
            onDeleteWorkoutLog={handleDeleteWorkoutLog}
            onUpdateGoalMetric={handleUpdateGoalMetric}
            onAddWeightLog={handleAddWeightLog}
            onAddBodyMeasurementLog={handleAddBodyMeasurementLog}
            onDeleteBodyMeasurementLog={handleDeleteBodyMeasurementLog}
            initialCustomExercises={customExercises}
            onCustomExercisesChange={(exercises) => patchSettings({ custom_exercises_json: JSON.stringify(exercises) })}
          />
        );
      case 'mood':
        return (
          <MoodSection
            moodLogs={lifeData.moodLogs || []}
            onAddMoodLog={handleAddMoodLog}
            onDeleteMoodLog={handleDeleteMoodLog}
          />
        );
      case 'balance_report':
        return (
          <BalanceReportSection
            scheduleItems={scheduleItems}
            tasks={lifeData.tasks || []}
            sleepLogs={lifeData.sleepLogs || []}
            workoutLogs={lifeData.workoutLogs || []}
            sessions={lifeData.mindfulnessSessions || []}
            contacts={lifeData.contacts || []}
            todayDate={TODAY_DATE}
            onNavigate={(section) => goToTab(section)}
          />
        );
      case 'contacts':
        return (
          <ContactsSection
            contacts={lifeData.contacts || []}
            onAddContact={handleAddContact}
            onDeleteContact={handleDeleteContact}
            onUpdateContact={handleUpdateContact}
            onAddOccasion={handleAddOccasion}
            todayDate={TODAY_DATE}
          />
        );

      case 'areas':
        return (
          <AreasSection
            areas={lifeData.areas || []}
            goals={lifeData.goals}
            tasks={lifeData.tasks}
            onSelectGoal={(id) => goToGoal(id)}
            onSelectProject={(id) => goToProject(id)}
            onSelectTask={(id) => goToTaskDetail(id)}
            onUpdateAreas={(areas) => setLifeData(prev => ({ ...prev, areas }))}
          />
        );
      case 'notes':
        return (
          <NotesLayout
            pages={notesStore.pages}
            onAddPage={notesStore.addPage}
            onUpdatePage={notesStore.updatePage}
            onDeletePage={notesStore.deletePage}
            onDuplicatePage={notesStore.duplicatePage}
            onMovePage={notesStore.movePage}
            onAddBlock={notesStore.addBlock}
            onUpdateBlock={notesStore.updateBlock}
            onDeleteBlock={notesStore.deleteBlock}
            onMoveBlock={notesStore.moveBlock}
            onReorderBlocks={notesStore.reorderBlocks}
            savingState={notesStore.getSavingState()}
          />
        );
      case 'coach':
        return (
          <AiCoachSection 
            lifeData={lifeData}
            onImportData={handleImportData}
          />
        );
      case 'profile':
        return (
          <ProfileSection 
            lifeData={lifeData}
            onUpdateProfile={handleUpdateProfile}
            onImportData={handleImportData}
          />
        );
      default:
        return (
          <DashboardOverview 
            data={lifeData} 
            setActiveTab={goToTab} 
            todayDate={TODAY_DATE} 
            waterIntake={waterIntake}
            onIncrementWater={handleIncrementWater}
            onDecrementWater={handleDecrementWater}
            primaryPriority={primaryPriority}
            scheduleItems={scheduleItems}
            onToggleScheduleItem={handleToggleScheduleItem}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EBE1] dark:bg-[#131510] text-[#3D3D3D] dark:text-[#E8ECE0] flex items-center justify-center p-0 md:p-6 transition-colors" dir="rtl" id="app-root">
      
      {/* 1. Responsive Widescreen Desktop View (Renders on md screens and up, unless mobile-only is forced) */}
      <div className="hidden md:flex fixed inset-0 w-screen h-screen bg-[#F9F6EE] dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] overflow-hidden transition-colors">
          {/* Right Sidebar (RTL Sidebar) */}
          <aside className="w-64 xl:w-80 bg-[#2D3025] text-[#D6CFC3] flex flex-col shrink-0 relative border-l border-white/5 shadow-2xl">
            {/* Header / Brand */}
            <div className="p-6 border-b border-[#3D4133] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E26645] flex items-center justify-center text-xl shadow-md">
                🌿
              </div>
              <div className="text-right">
                <h1 className="text-base font-black text-white font-serif-elegant tracking-tight">هَـمـبـافـت</h1>
                <span className="text-[9px] text-[#DDE2D5]/60 font-bold block mt-0.5">مدیریت توازن هوشمند زندگی</span>
              </div>
            </div>

            {/* Quick Profile / Score */}
            <button 
              onClick={() => {
                goToTab('profile');
              }}
              className="p-4 mx-4 my-5 rounded-2xl bg-[#3D4133] hover:bg-[#4E5342] border border-white/5 flex items-center gap-3 shrink-0 cursor-pointer transition-all hover:scale-[1.02] text-right w-[calc(100%-2rem)]"
            >
              <div className="w-10 h-10 rounded-full bg-[#E8ECE0] flex items-center justify-center text-lg select-none">
                👨‍💻
              </div>
              <div className="text-right flex-1">
                <h3 className="font-extrabold text-xs text-white">سلام، {lifeData.profile?.name || 'کاربر'} عزیز</h3>
                <span className="text-[9px] text-[#DDE2D5]/70 block font-semibold mt-0.5">توازن زندگی • هم‌بافت</span>
              </div>
            </button>

            {/* Sidebar Links */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {NAVIGATION_GROUPS.map((group, gIdx) => (
                <div key={group.title} className={gIdx > 0 ? 'mt-4 pt-3 border-t border-white/5' : ''}>
                  <span className="px-4 text-[9px] font-black text-[#DDE2D5]/40 tracking-wider block mb-1.5 uppercase text-right">
                    {group.title}
                  </span>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id || (item.id === 'dashboard' && activeTab === 'home');
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            goToTab(item.id);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-[#E26645] text-white shadow-md font-black scale-[1.01]' 
                              : 'hover:bg-[#3D4133]/60 text-[#DDE2D5]/80 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Floating Quick Action */}
            <div className="p-4 border-t border-[#3D4133] space-y-3">
              <button
                onClick={() => setQuickAddOpen(true)}
                className="w-full py-3 rounded-xl bg-[#E26645] text-white text-xs font-black shadow-md hover:bg-[#C94B2A] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>ثبت سریع تراکنش یا کار</span>
              </button>

            </div>
          </aside>

          {/* Left Content Column */}
          <div className="flex-1 flex flex-col h-full bg-[#F9F6EE] dark:bg-[#121411] overflow-hidden transition-colors">
            {/* Top Bar / Header */}
            <header className="bg-[#FDFBF7] dark:bg-[#1B1D16] border-b border-[#E6DFD3] dark:border-[#3D4133]/40 py-4 px-8 flex justify-between items-center shrink-0 transition-colors">
              <div>
                <h2 className="text-base font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant flex items-center gap-2">
                  <span>{
                    activeTab === 'dashboard' || activeTab === 'home' ? 'داشبورد جامع همبافت' :
                    activeTab === 'journal' ? 'دفترچه یادداشت‌ها' :
                    activeTab === 'tasks' ? 'مدیریت تسک‌ها' :
                    activeTab === 'mood' ? 'ارزیابی احساسات و مود' :
                    activeTab === 'calendar' ? 'تقویم زندگی و زمان‌بندی توازن' :
                    activeTab === 'occasions' ? 'تقویم مناسبت‌ها و یادآورهای مهم' :
                    activeTab === 'sleep' ? 'تنظیم بیوریتم بدنی و ردیاب علمی خواب' :
                    activeTab === 'mindfulness' ? 'تمرین ذهن‌آگاهی، مدیتیشن و تنفس' :
                    activeTab === 'finance' ? 'امور مالی، اشتراک‌ها و هزینه‌ها' :
                    activeTab === 'habits' ? 'ردیاب عادت‌ها و رفتارهای روزانه' :
                    activeTab === 'goals' ? 'اهداف و میانی‌های کلیدی زندگی' :
                    activeTab === 'projects' ? 'مرکز مدیریت و پیشبرد پروژه‌ها' :
                    activeTab === 'areas' ? 'حوزه‌های زندگی و اهداف' :
                    activeTab === 'notes' ? 'دفترچه یادداشت‌های هوشمند' :
                    activeTab === 'documents' ? 'مدیریت اسناد، بیمه‌ها و مدارک' :
                    activeTab === 'nutrition' ? 'تغذیه، رژیم غذایی و ردیاب بدنی' :
                    activeTab === 'fitness' ? 'باشگاه بدنسازی، تمرینات و هوازی' :
                    activeTab === 'coach' ? 'کوچ هوشمند همبافت (Gemini AI)' :
                    activeTab === 'planner' || activeTab === 'inbox' ? 'برنامه‌ریز شخصی' :
                    activeTab === 'planner-timeline' ? 'برنامه‌ریز — تایم‌لاین' :
                    activeTab === 'planner-week' ? 'برنامه‌ریز — هفتگی' :
                    activeTab === 'planner-month' ? 'برنامه‌ریز — ماهانه' :
                    activeTab === 'planner-board' ? 'برنامه‌ریز — بورد' :
                    activeTab === 'planner-areas' ? 'برنامه‌ریز — حوزه‌ها' :
                    activeTab === 'balance_report' ? 'گزارش توازن زندگی' :
                    activeTab === 'profile' ? 'پروفایل و تنظیمات' : 'همبافت'
                  }</span>
                </h2>
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold mt-0.5 block">شنبه، ۱۴ تیر ۱۴۰۵ • زمان‌بندی هماهنگ با بیوریتم مغز شما</span>
              </div>

              {/* Mini Widget Row */}
              <div className="flex items-center gap-6">
                {/* Beautiful Animated Dark Mode Toggle */}
                <button
                  onClick={handleToggleTheme}
                  className="relative w-16 h-8 rounded-full bg-[#E6DFD3] dark:bg-[#2E3326] flex items-center p-1 cursor-pointer select-none transition-colors duration-300"
                  title={darkMode ? "حالت روز" : "حالت شب"}
                >
                  {/* Sliding Knob */}
                  <motion.div
                    layout
                    className="w-6 h-6 rounded-full bg-[#E26645] dark:bg-[#7C8363] flex items-center justify-center shadow-md"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={darkMode ? "dark" : "light"}
                        initial={{ y: -10, opacity: 0, rotate: -45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 10, opacity: 0, rotate: 45 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs select-none"
                      >
                        {darkMode ? "🌙" : "☀️"}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                  {/* Subtle Background Icons */}
                  <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none text-[10px]">
                    <span className="opacity-40">☀️</span>
                    <span className="opacity-40">🌙</span>
                  </div>
                </button>

                {/* Quick Water Widget */}
                <div className="bg-[#E8ECE0] dark:bg-[#20241A] border border-[#DDE2D5] dark:border-[#3D4133]/40 px-4 py-1.5 rounded-xl flex items-center gap-3 select-none transition-colors">
                  <span className="text-sm">💧</span>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-[#7C8363] dark:text-[#9ECE9A] block">نوشیدن آب</span>
                    <span className="text-[10px] font-mono font-extrabold text-[#2D3025] dark:text-[#E8ECE0]">{waterIntake} لیوان امروز</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={handleIncrementWater} className="w-5 h-5 rounded bg-white dark:bg-[#1C1E1A] text-[#7C8363] dark:text-[#9ECE9A] hover:bg-[#7C8363] hover:text-white dark:hover:bg-[#7C8363] flex items-center justify-center font-bold text-xs transition-colors cursor-pointer">+</button>
                    <button onClick={handleDecrementWater} className="w-5 h-5 rounded bg-white dark:bg-[#1C1E1A] text-[#7C8363] dark:text-[#9ECE9A] hover:bg-[#7C8363] hover:text-white dark:hover:bg-[#7C8363] flex items-center justify-center font-bold text-xs transition-colors cursor-pointer">-</button>
                  </div>
                </div>

                {/* AI Coach Quick Tip */}
                <div className="hidden xl:flex bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/40 px-4 py-2 rounded-xl items-center gap-2.5 max-w-sm text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold select-none transition-colors">
                  <span className="text-xs">💡</span>
                  <span>کوچ هوشمند: با افزودن زیردسته‌های جدید، مدیریت هزینه‌ها دقیق‌تر می‌شود!</span>
                </div>
              </div>
            </header>

            {/* Responsive Dashboard Content Frame */}
            <main className="flex-1 overflow-y-auto p-8 bg-[#F9F6EE] dark:bg-[#121411] transition-colors">
              <div className="max-w-7xl mx-auto w-full h-full min-h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.22 }}
                    className="min-h-full"
                  >
                    {renderActiveSection()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </div>

      {/* 2. Mobile View — shown on small screens only */}
      <div className="flex md:hidden w-full h-screen bg-[#FDFBF7] dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] overflow-hidden flex-col relative transition-colors">

        {/* Mobile Header with brand and Dark Mode toggle */}
        <header className="flex justify-between items-center px-5 py-3 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 bg-[#FDFBF7] dark:bg-[#1B1D16] transition-colors shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">هَـمـبـافـت</span>
          </div>
          {/* Beautiful Animated Dark Mode Toggle for Mobile */}
          <button
            onClick={handleToggleTheme}
            className="relative w-14 h-7 rounded-full bg-[#E6DFD3] dark:bg-[#2E3326] flex items-center p-0.5 cursor-pointer select-none transition-colors duration-300"
            title={darkMode ? "حالت روز" : "حالت شب"}
          >
            <motion.div
              layout
              className="w-5 h-5 rounded-full bg-[#E26645] dark:bg-[#7C8363] flex items-center justify-center shadow-md"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={darkMode ? "dark" : "light"}
                  initial={{ y: -8, opacity: 0, rotate: -45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 8, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.15 }}
                  className="text-[10px] select-none"
                >
                  {darkMode ? "🌙" : "☀️"}
                </motion.span>
              </AnimatePresence>
            </motion.div>
            <div className="absolute inset-0 flex justify-between items-center px-1.5 pointer-events-none text-[8px]">
              <span className="opacity-40">☀️</span>
              <span className="opacity-40">🌙</span>
            </div>
          </button>
        </header>

        {/* Floating Mobile Drawer Menu for Navigation (Opens upwards from bottom navbar) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Drawer Backdrop overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="absolute inset-0 bg-black z-30"
              />

              {/* Navigation Drawer Content */}
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute bottom-20 inset-x-4 bg-[#2D3025] text-[#D6CFC3] rounded-[28px] p-5 pb-6 shadow-2xl border border-white/10 z-40 space-y-4 max-h-[60vh] overflow-y-auto text-right"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <span className="text-xs font-black text-[#FDFBF7] font-serif-elegant">ناوبری هوشمند همبافت</span>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-6 h-6 rounded-full bg-white/5 text-[#DDE2D5] flex items-center justify-center cursor-pointer hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {NAVIGATION_GROUPS.map((group, gIdx) => (
                    <div key={group.title} className="space-y-1.5">
                      <span className="text-[9px] font-black text-white/30 block text-right pr-1">
                        {group.title}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                goToTab(item.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black transition-all text-right cursor-pointer ${
                                isActive 
                                  ? 'bg-[#E26645] text-white shadow-xs font-black' 
                                  : 'bg-white/5 hover:bg-white/10 text-[#DDE2D5]/90'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0 text-inherit" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main View Area with custom scrollbar, leaves padding for bottom nav */}
        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="min-h-full"
            >
              {renderActiveSection()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quick Add Bottom Sheet Overlay (منوی مشکی) */}
        <AnimatePresence>
          {quickAddOpen && (
            <>
              {/* Semi-transparent Backdrop overlay covering only the content area above the bottom navbar */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickAddOpen(false)}
                className="absolute top-0 inset-x-0 bottom-[88px] bg-black/10 dark:bg-black/35 backdrop-blur-[1px] z-40"
              />

              {/* Bottom Sheet Modal floating above the navbar */}
              <motion.div 
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="absolute bottom-[88px] inset-x-4 bg-[#2D3025] text-[#D6CFC3] rounded-[28px] p-5 pb-6 z-45 shadow-2xl border border-white/10 space-y-4"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                  <h3 className="text-xs font-black font-serif-elegant text-[#FDFBF7]">افزودن سریع به همبافت</h3>
                  <button 
                    onClick={() => setQuickAddOpen(false)}
                    className="w-6 h-6 rounded-full bg-white/5 text-[#DDE2D5] flex items-center justify-center cursor-pointer hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* List layout matching the mock-up */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-2.5 text-right" 
                  dir="rtl"
                >
                  
                  {/* Option 1: Add Task */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('task'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E26645] text-white flex items-center justify-center shadow-xs">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">ثبت کار روزانه (تسک)</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                  {/* Option 2: Log Habit */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('habit'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7C8363] text-white flex items-center justify-center shadow-xs">
                        <Flame className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">ارزیابی عادت روزانه</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                  {/* Option 3: Log Expense */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('expense'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">ثبت هزینه یا درآمد جدید</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                  {/* Option 4: Log Asset/Investment */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('asset'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">ثبت دارایی یا سرمایه‌گذاری جدید (طلا، بورس، رمز ارز)</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                  {/* Option 5: Write Journal */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('journal'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#8D7F72] text-white flex items-center justify-center shadow-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">نوشتن یادداشت روزانه</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                  {/* Option 6: New Goal */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('goal'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Target className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">ثبت هدف بلندمدت جدید</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                  {/* Option 7: Mood and Energy */}
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: 40, scale: 0.95 },
                      show: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 18 } }
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setQuickAddType('mood'); setQuickAddOpen(false); }}
                    className="flex items-center justify-between bg-[#FDFBF7] hover:bg-white p-3 rounded-2xl cursor-pointer transition-all shadow-xs text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black text-[#2D3025]">ثبت وضعیت روحی و انرژی ذهنی</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                  </motion.button>

                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Dynamic Modals for Quick Add Submissions */}
        <AnimatePresence>
          {quickAddType && (
            <>
              {/* Modal Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setQuickAddType(null)}
                className="absolute inset-0 bg-black/60 z-50"
              />

              {/* Unified Modal Form Container */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] bg-[#FDFBF7] p-5 rounded-3xl border border-[#EBE3C8] shadow-2xl z-50 text-right space-y-4"
              >
                <div className="flex justify-between items-center border-b border-[#E6DFD3] pb-2">
                  <span className="text-xs font-black text-[#2D3025] font-serif-elegant">
                    {quickAddType === 'task' && '📋 افزودن کار روزانه جدید'}
                    {quickAddType === 'asset' && '🪙 ثبت دارایی یا سرمایه‌گذاری جدید'}
                    {quickAddType === 'habit' && '🌿 تعریف عادت جدید'}
                    {quickAddType === 'expense' && '🪙 ثبت هزینه جدید'}
                    {quickAddType === 'journal' && '✍️ نوشتن یادداشت جدید'}
                    {quickAddType === 'goal' && '🎯 ثبت هدف کلیدی جدید'}
                    {quickAddType === 'mood' && '✨ ثبت حال و انرژی شما'}
                  </span>
                  <button 
                    onClick={() => setQuickAddType(null)}
                    className="w-6 h-6 rounded-full bg-[#F9F6EE] text-[#8D7F72] hover:text-[#2D3025] flex items-center justify-center font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* TASK FORM */}
                {quickAddType === 'task' && (
                  <form onSubmit={submitQuickTask} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72]">عنوان کار مهم امروز</label>
                      <input 
                        type="text"
                        placeholder="مثال: طراحی مجدد ساختار دیتابیس..."
                        value={quickTaskTitle}
                        onChange={(e) => setQuickTaskTitle(e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                        required
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      ثبت کار در برنامه‌ها
                    </button>
                  </form>
                )}

                {/* ASSET FORM */}
                {quickAddType === 'asset' && (
                  <form onSubmit={submitQuickAsset} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto p-1 text-right">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نام دارایی یا سرمایه‌گذاری</label>
                        <input 
                          type="text"
                          placeholder="مثال: طلای ۱۸ عیار، بیت‌کوین، سهام خودرو"
                          value={quickAssetName}
                          onChange={(e) => setQuickAssetName(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نماد دارایی (اختیاری)</label>
                        <input 
                          type="text"
                          placeholder="مثال: GOLD, BTC"
                          value={quickAssetSymbol}
                          onChange={(e) => setQuickAssetSymbol(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none font-mono text-left font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نوع دارایی</label>
                        <select 
                          value={quickAssetType} 
                          onChange={(e) => setQuickAssetType(e.target.value as any)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none cursor-pointer"
                        >
                          <option value="gold">🏆 طلا و فلزات گرانبها</option>
                          <option value="crypto">🪙 رمز ارز (Crypto)</option>
                          <option value="stock">📊 بورس و سهام</option>
                          <option value="currency">💵 ارز و اسکناس</option>
                          <option value="real_estate">🏠 ملک و مستغلات</option>
                          <option value="other">💼 سایر دارایی‌ها</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">مقدار یا تعداد موجودی</label>
                        <input 
                          type="number"
                          step="any"
                          placeholder="مثال: ۲.۵، ۱۰"
                          value={quickAssetAmount}
                          onChange={(e) => setQuickAssetAmount(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none font-mono text-left font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">قیمت خرید (تومان/واحد)</label>
                        <input 
                          type="number"
                          placeholder="مثال: ۳۵۰۰۰۰۰"
                          value={quickAssetBuyPrice}
                          onChange={(e) => setQuickAssetBuyPrice(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none font-mono text-left font-bold"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-bold text-[#8D7F72]">قیمت روز بازار (تومان/واحد)</label>
                        <input 
                          type="number"
                          placeholder="مثال: ۳۶۰۰۰۰۰"
                          value={quickAssetCurrentPrice}
                          onChange={(e) => setQuickAssetCurrentPrice(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none font-mono text-left font-bold"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      ثبت دارایی در پورتفوی همبافت
                    </button>
                  </form>
                )}

                {/* HABIT FORM */}
                {quickAddType === 'habit' && (
                  <form onSubmit={submitQuickHabit} className="space-y-4">
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">نام عادت جدید</label>
                        <input 
                          type="text"
                          placeholder="مثال: نوشیدن ۸ لیوان آب"
                          value={quickHabitName}
                          onChange={(e) => setQuickHabitName(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">توضیحات تکمیلی</label>
                        <input 
                          type="text"
                          placeholder="مثال: ترجیحاً ۲ لیوان صبح زود و قبل از ناهار"
                          value={quickHabitDesc}
                          onChange={(e) => setQuickHabitDesc(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      ایجاد عادت جدید
                    </button>
                  </form>
                )}

                {/* EXPENSE FORM */}
                {quickAddType === 'expense' && (
                  <form onSubmit={submitQuickExpense} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">مبلغ هزینه (تومان)</label>
                        <input 
                          type="number"
                          placeholder="مثال: ۱۵۰۰۰۰"
                          value={quickExpenseAmount}
                          onChange={(e) => setQuickExpenseAmount(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl text-left font-mono focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی مخارج</label>
                        <select 
                          value={quickExpenseCat} 
                          onChange={(e) => setQuickExpenseCat(e.target.value as TransactionCategory)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none cursor-pointer"
                        >
                          <option value="food">🍕 خوراک و رستوران</option>
                          <option value="rent">🏠 مسکن و اجاره</option>
                          <option value="transport">🚗 حمل و نقل</option>
                          <option value="entertainment">🎬 تفریح و سرگرمی</option>
                          <option value="health">💊 سلامت و درمان</option>
                          <option value="shopping">🛍️ خرید و پوشاک</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">بابت چه موردی؟</label>
                        <input 
                          type="text"
                          placeholder="مثال: اسنپ تا شرکت"
                          value={quickExpenseDesc}
                          onChange={(e) => setQuickExpenseDesc(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      ثبت هزینه در دفتر کل
                    </button>
                  </form>
                )}

                {/* JOURNAL FORM */}
                {quickAddType === 'journal' && (
                  <form onSubmit={submitQuickJournal} className="space-y-3.5">
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pl-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">عنوان یادداشت</label>
                        <input 
                          type="text"
                          placeholder="مثال: ثبت افکار تیر ماه"
                          value={quickJournalTitle}
                          onChange={(e) => setQuickJournalTitle(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">متن و محتوای افکار</label>
                        <textarea 
                          placeholder="چه چیزی در ذهنتان می‌گذرد؟"
                          rows={3}
                          value={quickJournalContent}
                          onChange={(e) => setQuickJournalContent(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none resize-none"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">بابت چه چیزی شکرگزارید؟</label>
                        <input 
                          type="text"
                          placeholder="مثال: داشتن سلامتی و هوای آفتابی"
                          value={quickJournalGratitude}
                          onChange={(e) => setQuickJournalGratitude(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">حال و مودی روز چطور بود؟</label>
                        <div className="grid grid-cols-6 gap-1">
                          {(['excited', 'happy', 'neutral', 'tired', 'sad', 'stressed'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setQuickJournalMood(m)}
                              className={`py-2 text-center text-sm rounded-lg border cursor-pointer flex items-center justify-center ${
                                quickJournalMood === m
                                  ? 'bg-[#E6DFD3] border-[#7C8363] text-[#2D3025]'
                                  : 'bg-[#F9F6EE] border-transparent text-[#8D7F72] hover:bg-[#E8ECE0]/50'
                              }`}
                              title={MOOD_LABELS[m]?.label}
                            >
                              {getMoodIcon(MOOD_LABELS[m]?.icon || 'Smile', "w-4 h-4")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      ثبت یادداشت روزانه
                    </button>
                  </form>
                )}

                {/* GOAL FORM */}
                {quickAddType === 'goal' && (
                  <form onSubmit={submitQuickGoal} className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">عنوان هدف بزرگ</label>
                        <input 
                          type="text"
                          placeholder="مثال: یادگیری کامل همبافت"
                          value={quickGoalTitle}
                          onChange={(e) => setQuickGoalTitle(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی اهداف</label>
                        <select 
                          value={quickGoalCat} 
                          onChange={(e) => setQuickGoalCat(e.target.value as GoalCategory)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none cursor-pointer"
                        >
                          <option value="personal">🌸 توسعه فردی</option>
                          <option value="financial">🪙 انضباط مالی</option>
                          <option value="health">🏃 سلامت و تندرستی</option>
                          <option value="learning">🎓 یادگیری و مهارت جدید</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">توضیحات کوتاه</label>
                        <input 
                          type="text"
                          placeholder="پیش‌فرض توضیحات..."
                          value={quickGoalDesc}
                          onChange={(e) => setQuickGoalDesc(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      ثبت و شروع هدف فعال
                    </button>
                  </form>
                )}

                {/* MOOD PICKER FORM */}
                {quickAddType === 'mood' && (
                  <form onSubmit={submitQuickMood} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#8D7F72] block">در این لحظه چه احساسی دارید؟</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['excited', 'happy', 'neutral', 'tired', 'sad', 'stressed'] as const).map((mood) => {
                          const mInfo = MOOD_LABELS[mood];
                          const isSelected = quickMoodSelect === mood;
                          return (
                            <button
                              key={mood}
                              type="button"
                              onClick={() => setQuickMoodSelect(mood)}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#2D3025] text-white border-[#2D3025] scale-[1.02]' 
                                  : 'bg-[#F9F6EE] text-[#3D3D3D] border-[#E6DFD3] hover:bg-[#E8ECE0]/50'
                              }`}
                            >
                              <span className="text-sm font-bold">{mInfo?.label}</span>
                              <span className="shrink-0">
                                {getMoodIcon(mInfo?.icon || 'Smile', "w-5 h-5 text-[#7C8363]")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">
                      تأیید و ثبت وضعیت روحی
                    </button>
                  </form>
                )}

              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Bottom Nav Bar (Exactly matching Hambaft mock-up specs) */}
        <nav className="absolute bottom-4 inset-x-4 bg-[#2D3025] text-[#D6CFC3] py-2 px-3 rounded-[24px] z-50 shadow-lg flex justify-between items-center border border-white/5 select-none shrink-0 font-bold text-[9px] leading-none">
          
          {/* Item 1: Menu Toggle (Hamburger instead of Profile) */}
          <button 
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
              setQuickAddOpen(false); // Close quick add if menu opens
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-colors ${
              mobileMenuOpen ? 'text-white scale-105' : 'text-[#DDE2D5]/70 hover:text-white'
            }`}
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#E26645]" /> : <Menu className="w-4 h-4" />}
            <span>منو</span>
          </button>

          {/* Item 2: Tasks */}
          <button
            onClick={() => {
              goToTab('tasks');
              setMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-colors ${
              activeTab === 'tasks' ? 'text-white scale-105' : 'text-[#DDE2D5]/70 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>کارها</span>
          </button>

          {/* Central Item 3: + BUTTON with attractive rotate animation */}
          <div className="flex-1 flex justify-center -translate-y-4">
            <button 
              onClick={() => {
                setQuickAddOpen(!quickAddOpen);
                setMobileMenuOpen(false); // Close menu if quick add opens
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md border-4 border-[#2D3025] transition-all duration-350 transform hover:scale-110 cursor-pointer ${
                quickAddOpen 
                  ? 'bg-[#7C8363] text-white shadow-[#7C8363]/30 scale-105' 
                  : 'bg-[#E26645] text-white shadow-[#E26645]/40 hover:bg-[#C94B2A]'
              }`}
            >
              {quickAddOpen ? (
                <X className="w-5 h-5 stroke-[3] rotate-90 transition-transform duration-300" />
              ) : (
                <Plus className="w-5 h-5 stroke-[3] transition-transform duration-300" />
              )}
            </button>
          </div>

          {/* Item 4: Calendar */}
          <button 
            onClick={() => {
              goToTab('calendar');
              setMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-colors ${
              activeTab === 'calendar' ? 'text-white scale-105' : 'text-[#DDE2D5]/70 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>تقویم</span>
          </button>

          {/* Item 5: Home */}
          <button 
            onClick={() => {
              goToTab('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-colors ${
              activeTab === 'dashboard' ? 'text-white scale-105' : 'text-[#DDE2D5]/70 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>خانه</span>
          </button>

        </nav>

      </div>

      {/* Global Floating Timer Widget */}
      <AnimatePresence>
        {activeTimerTaskId && (
          (() => {
            const activeTaskObj = lifeData.tasks.find(t => t.id === activeTimerTaskId);
            const activeTitle = activeTaskObj?.title || 'کار جاری';
            return (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="fixed bottom-[88px] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] md:w-[460px] bg-[#2D3025] text-[#D6CFC3] px-4 py-3.5 rounded-[24px] shadow-2xl border border-white/10 flex items-center justify-between gap-3"
              >
                {/* Left: Indicator + Title + Live Clock */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1" dir="rtl">
                  <div className="relative shrink-0 flex items-center justify-center">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping absolute" />
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full relative" />
                  </div>
                  
                  <div className="text-right min-w-0 flex-1">
                    <span className="text-[8px] text-[#DDE2D5]/50 block font-bold leading-none mb-1">تسک در حال ردیابی</span>
                    <h4 className="text-[11px] font-black text-white truncate max-w-[120px] md:max-w-[180px] leading-tight">
                      {activeTitle}
                    </h4>
                  </div>

                  <div className="h-6 w-px bg-white/10 shrink-0 mx-1" />

                  {/* Clock Display */}
                  <div className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-[#E26645] tracking-widest shrink-0">
                    {formatTimeDigital(activeTimerSeconds)}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Play / Pause Toggle */}
                  {isTimerRunning ? (
                    <button
                      onClick={handlePauseTimer}
                      className="p-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl transition-all cursor-pointer active:scale-90"
                      title="توقف موقت"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeTimer}
                      className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-all cursor-pointer active:scale-90"
                      title="ادامه ردیابی"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}

                  {/* Stop / Complete Session */}
                  <button
                    onClick={handleStopTimer}
                    className="p-2 bg-[#E26645]/20 hover:bg-[#E26645]/30 text-[#E26645] rounded-xl transition-all cursor-pointer active:scale-90"
                    title="ثبت زمان و پایان"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>

                  {/* Reset Timer */}
                  <button
                    onClick={() => {
                      if (confirm('آیا می‌خواهید زمان ردیابی شده در این جلسه را لغو کنید؟')) {
                        handleResetTimerForTask(activeTimerTaskId);
                      }
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 rounded-xl transition-all cursor-pointer active:scale-90"
                    title="لغو"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

      {/* Interactive Financial Transaction Reminder Dialog */}
      <AnimatePresence>
        {financePrompt && financePrompt.show && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setFinancePrompt(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-x-4 md:inset-x-auto top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 z-[60] w-[calc(100%-2rem)] md:w-[480px] bg-[#FDFBF7] p-6 rounded-3xl border border-[#E6DFD3] shadow-2xl space-y-4 text-right"
              dir="rtl"
            >
              <div className="flex justify-between items-center border-b border-[#E6DFD3]/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    💰
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-[#2D3025] font-serif-elegant">ثبت تراکنش مالی هوشمند</h3>
                    <p className="text-[9px] text-[#8D7F72] font-bold">پیشنهاد بر اساس تسک انجام‌شده</p>
                  </div>
                </div>
                <button 
                  onClick={() => setFinancePrompt(null)} 
                  className="p-1.5 hover:bg-[#E6DFD3]/40 rounded-xl text-[#8D7F72] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#E8ECE0]/30 p-3 rounded-2xl border border-[#DDE2D5] space-y-1">
                <span className="text-[8px] text-[#7C8363] font-bold block">کار تکمیل‌شده:</span>
                <h4 className="text-[11px] font-black text-[#2D3025]">{financePrompt.taskTitle}</h4>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                // Submit transaction
                handleAddTransaction({
                  type: financePrompt.suggestedType,
                  amount: financePrompt.suggestedAmount,
                  category: financePrompt.suggestedCategory,
                  description: `مربوط به تسک: ${financePrompt.taskTitle}`,
                  date: TODAY_DATE,
                  bankAccountId: (lifeData.bankAccounts && lifeData.bankAccounts[0]) ? lifeData.bankAccounts[0].id : undefined
                });
                setFinancePrompt(null);
                alert('تراکنش مالی شما با موفقیت ثبت و بر روی حساب بانکی اعمال شد!');
              }} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72] block">نوع تراکنش</label>
                    <select 
                      value={financePrompt.suggestedType}
                      onChange={(e) => setFinancePrompt(prev => prev ? { ...prev, suggestedType: e.target.value as any } : null)}
                      className="w-full text-xs px-3 py-2 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-bold text-[#3D3D3D]"
                    >
                      <option value="expense">هزینه (برداشت)</option>
                      <option value="income">درآمد (واریز)</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72] block">مبلغ (تومان)</label>
                    <input 
                      type="text"
                      value={financePrompt.suggestedAmount.toLocaleString('fa-IR')}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                        setFinancePrompt(prev => prev ? { ...prev, suggestedAmount: val } : null);
                      }}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72] block">حساب بانکی مقصد/مبدأ</label>
                    <select 
                      className="w-full text-xs px-3 py-2 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#3D3D3D] font-bold"
                      defaultValue={(lifeData.bankAccounts && lifeData.bankAccounts[0]) ? lifeData.bankAccounts[0].id : ''}
                    >
                      {lifeData.bankAccounts?.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.accountName}
                        </option>
                      ))}
                      {!lifeData.bankAccounts?.length && (
                        <option value="">فاقد حساب بانکی</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72] block">دسته‌بندی امور مالی</label>
                    <select 
                      value={financePrompt.suggestedCategory}
                      onChange={(e) => setFinancePrompt(prev => prev ? { ...prev, suggestedCategory: e.target.value } : null)}
                      className="w-full text-xs px-3 py-2 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#3D3D3D] font-bold"
                    >
                      <option value="food">خوراک و رستوران</option>
                      <option value="rent">مسکن و اجاره</option>
                      <option value="salary">حقوق و دستمزد</option>
                      <option value="transport">حمل و نقل</option>
                      <option value="entertainment">تفریح و سرگرمی</option>
                      <option value="health">سلامت و درمان</option>
                      <option value="shopping">خرید پوشاک/کالا</option>
                      <option value="other">سایر امور مالی</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-xs"
                  >
                    ثبت و کسر از حساب
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFinancePrompt(null)}
                    className="flex-1 py-2.5 bg-[#F9F6EE] hover:bg-[#E6DFD3] border border-[#D6CFC3] text-[#8D7F72] text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    بعداً خودم ثبت می‌کنم
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dependency Warning Dialog */}
      <AnimatePresence>
        {dependencyError && dependencyError.show && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDependencyError(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            {/* Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-x-4 md:inset-x-auto top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 z-[60] w-[calc(100%-2rem)] md:w-[460px] bg-[#FDFBF7] p-6 rounded-3xl border border-[#EDDDD7] shadow-2xl space-y-4 text-right"
              dir="rtl"
            >
              <div className="flex items-center gap-3 border-b border-[#EDDDD7] pb-3 text-red-600">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="text-xs font-black font-serif-elegant text-red-600">خطا: وابستگی پیش‌نیاز تسک</h3>
                  <p className="text-[9px] text-[#9B6B61] font-bold">برای انجام این کار ابتدا باید کار پیش‌نیاز تکمیل شود</p>
                </div>
              </div>

              <div className="space-y-3 py-2 text-xs">
                <div className="bg-[#FDFBF7] p-3 rounded-2xl border border-[#E6DFD3] space-y-1">
                  <span className="text-[9px] text-[#8D7F72] font-bold block">کاری که می‌خواهید انجام دهید:</span>
                  <h4 className="font-extrabold text-[#2D3025]">{dependencyError.taskTitle}</h4>
                </div>

                <div className="bg-[#F4E9E4]/60 p-3 rounded-2xl border border-[#EDDDD7] space-y-1">
                  <span className="text-[9px] text-[#9B6B61] font-bold block">کار پیش‌نیاز انجام‌نشده (مانع):</span>
                  <h4 className="font-extrabold text-red-700">{dependencyError.blockingTaskTitle}</h4>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setDependencyError(null)}
                  className="w-full py-2.5 bg-[#9B6B61] hover:bg-[#7C5A51] text-white text-xs font-black rounded-xl cursor-pointer transition-all shadow-xs text-center"
                >
                  فهمیدم، ابتدا پیش‌نیاز را کامل می‌کنم
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
