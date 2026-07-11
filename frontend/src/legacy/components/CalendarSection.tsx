import React, { useState, useEffect, useRef } from 'react';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  Flame,
  PlusCircle,
  Eye,
  DollarSign,
  Tag,
  FolderOpen,
  CalendarDays,
  ListTodo,
  Check,
  Move,
  ArrowLeft,
  ArrowRight,
  User as UserIcon,
  RefreshCw,
  Bell,
  BellOff,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Task, Habit, TransactionCategory, MealLog, WorkoutLog, SleepLog, Occasion, OccasionType } from '../types';
import { initAuth, googleSignIn, getCachedAccessToken, logout } from '../utils/firebaseAuth';
import { User } from 'firebase/auth';

const toPersianDigits = (num: string | number | undefined | null): string => {
  if (num === undefined || num === null) return '';
  const pAr = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().replace(/[0-9]/g, (w) => pAr[parseInt(w, 10)]);
};

// Google-Calendar-style non-overlapping layout solver for calendar cards
const computeTimelineLayout = (items: { id: string; topPx: number; heightPx: number; type: string; data: any }[]) => {
  if (items.length === 0) return [];
  
  // Sort items primarily by topPx, then by heightPx descending
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.topPx - b.topPx) < 1) {
      return b.heightPx - a.heightPx;
    }
    return a.topPx - b.topPx;
  });

  // Group into clusters of overlapping items
  const clusters: typeof sorted[] = [];
  let currentCluster: typeof sorted = [];
  let clusterMaxEnd = 0;

  for (const item of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterMaxEnd = item.topPx + item.heightPx;
    } else if (item.topPx < clusterMaxEnd - 1) { // small overlap tolerance (1px)
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.topPx + item.heightPx);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = item.topPx + item.heightPx;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const laidOutItems: (typeof sorted[0] & { leftPercent: number; widthPercent: number })[] = [];

  for (const cluster of clusters) {
    // Pack items in this cluster into separate vertical column tracks (lanes)
    const columns: typeof sorted[] = [];
    for (const item of cluster) {
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const colItems = columns[colIdx];
        const lastItemInCol = colItems[colItems.length - 1];
        // If the item starts after the last item in this track ends, place it here
        if (item.topPx >= lastItemInCol.topPx + lastItemInCol.heightPx - 1) {
          colItems.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
      }
    }

    // Assign left positions and width percentages based on total columns in cluster
    const numCols = columns.length;
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      for (const item of columns[colIdx]) {
        laidOutItems.push({
          ...item,
          leftPercent: colIdx * (100 / numCols),
          widthPercent: 95 / numCols, // Leave 5% gap for beauty and resize grip
        });
      }
    }
  }

  return laidOutItems;
};

export interface ScheduleItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  completed: boolean;
  category: 'purple' | 'green' | 'blue' | 'orange' | 'pink';
  date?: string; // YYYY-MM-DD (Start Date)
  endDate?: string; // YYYY-MM-DD (End Date)
  durationHours?: number;
  reminderType?: 'none' | '1day' | '2day' | '3day' | 'custom';
  customReminderActive?: boolean;
  
  // Google Calendar Integration
  googleEventId?: string;
  calendarId?: string; // Links to custom calendars
  
  // Recurring Events
  recurrenceType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: string; // YYYY-MM-DD
  recurrenceDays?: number[]; // Array of Jalali weekday indexes (0-6)
}

interface CalendarSectionProps {
  scheduleItems: ScheduleItem[];
  onAddScheduleItem: (item: Omit<ScheduleItem, 'id' | 'completed'>) => void;
  onToggleScheduleItem: (id: string) => void;
  onDeleteScheduleItem: (id: string) => void;
  onUpdateScheduleItem?: (id: string, updated: Partial<ScheduleItem>) => void;
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction?: (id: string, updated: Omit<Transaction, 'id'>) => void;
  tasks: Task[];
  onAddTask?: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  habits: Habit[];
  onToggleHabitLog: (habitId: string, date: string) => void;
  todayDate: string;
  mealLogs?: MealLog[];
  workoutLogs?: WorkoutLog[];
  sleepLogs?: SleepLog[];
  occasions?: Occasion[];
  onAddOccasion?: (occ: Omit<Occasion, 'id'>) => void;
  onDeleteOccasion?: (id: string) => void;
  initialPreferences?: {
    weeklyDaysCount: number;
    timelineFullDay: boolean;
    showEvents: boolean;
    showTasks: boolean;
    showFinance: boolean;
    showHabits: boolean;
    showNutrition: boolean;
    showSleep: boolean;
    showWorkouts: boolean;
  };
  initialCalendars?: CustomCalendar[];
  onPreferencesChange?: (preferences: {
    weeklyDaysCount: number;
    timelineFullDay: boolean;
    showEvents: boolean;
    showTasks: boolean;
    showFinance: boolean;
    showHabits: boolean;
    showNutrition: boolean;
    showSleep: boolean;
    showWorkouts: boolean;
  }) => void;
  onCalendarsChange?: (calendars: CustomCalendar[]) => void;
}

const CATEGORY_STYLES = {
  purple: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  green: 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]',
  blue: 'bg-[#E6DFD3] border-[#D6CFC3] text-[#3D3D3D]',
  orange: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#9B6B61]',
  pink: 'bg-[#FDFBF7] border-[#EDDDD7] text-[#9B6B61]'
};

const WEEKDAY_NAMES = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const TRANSACTION_CATEGORIES: { id: TransactionCategory; label: string }[] = [
  { id: 'salary', label: 'حقوق و دستمزد' },
  { id: 'business', label: 'کسب و کار' },
  { id: 'investment', label: 'سرمایه‌گذاری' },
  { id: 'food', label: 'خوراک و رستوران' },
  { id: 'rent', label: 'مسکن و اجاره' },
  { id: 'transport', label: 'حمل و نقل' },
  { id: 'entertainment', label: 'تفریح و سرگرمی' },
  { id: 'health', label: 'سلامت و درمان' },
  { id: 'education', label: 'آموزش و یادگیری' },
  { id: 'shopping', label: 'خرید کالا' },
  { id: 'other', label: 'سایر موارد' }
];

export interface CustomCalendar {
  id: string;
  name: string;
  color: 'purple' | 'green' | 'blue' | 'orange' | 'pink';
  active: boolean;
}

export default function CalendarSection({
  scheduleItems,
  onAddScheduleItem,
  onToggleScheduleItem,
  onDeleteScheduleItem,
  onUpdateScheduleItem,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  tasks,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  habits,
  onToggleHabitLog,
  todayDate,
  mealLogs = [],
  workoutLogs = [],
  sleepLogs = [],
  occasions = [],
  onAddOccasion,
  onDeleteOccasion,
  initialPreferences,
  initialCalendars,
  onPreferencesChange,
  onCalendarsChange
}: CalendarSectionProps) {
  
  // Tab/View Mode: 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Custom Weekly Days Display Limit State
  const [weeklyDaysCount, setWeeklyDaysCount] = useState<number>(initialPreferences?.weeklyDaysCount || 7);

  // Custom Full 24-Hour Timeline Mode State
  const [timelineFullDay, setTimelineFullDay] = useState<boolean>(initialPreferences?.timelineFullDay || false);

  // Individual Category Layer Toggles State
  const [showEvents, setShowEvents] = useState<boolean>(initialPreferences?.showEvents ?? true);
  const [showTasks, setShowTasks] = useState<boolean>(initialPreferences?.showTasks ?? true);
  const [showFinance, setShowFinance] = useState<boolean>(initialPreferences?.showFinance ?? true);
  const [showHabits, setShowHabits] = useState<boolean>(initialPreferences?.showHabits ?? true);
  const [showNutrition, setShowNutrition] = useState<boolean>(initialPreferences?.showNutrition ?? true);
  const [showSleep, setShowSleep] = useState<boolean>(initialPreferences?.showSleep ?? true);
  const [showWorkouts, setShowWorkouts] = useState<boolean>(initialPreferences?.showWorkouts ?? true);

  // Google Calendar Connection States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [googleError, setGoogleError] = useState('');
  
  // Custom Multiple Calendars State
  const [calendars, setCalendars] = useState<CustomCalendar[]>(() => initialCalendars || [
    { id: 'work', name: 'کاری 💼', color: 'purple', active: true },
    { id: 'personal', name: 'شخصی 🏠', color: 'green', active: true },
    { id: 'family', name: 'خانواده 👨‍👩‍👧', color: 'orange', active: true },
    { id: 'general', name: 'عمومی 🌐', color: 'blue', active: true }
  ]);
  const prefsHydratedRef = useRef(false);
  const calendarsHydratedRef = useRef(false);

  useEffect(() => {
    if (!initialPreferences) return;
    setWeeklyDaysCount(initialPreferences.weeklyDaysCount ?? 7);
    setTimelineFullDay(initialPreferences.timelineFullDay ?? false);
    setShowEvents(initialPreferences.showEvents ?? true);
    setShowTasks(initialPreferences.showTasks ?? true);
    setShowFinance(initialPreferences.showFinance ?? true);
    setShowHabits(initialPreferences.showHabits ?? true);
    setShowNutrition(initialPreferences.showNutrition ?? true);
    setShowSleep(initialPreferences.showSleep ?? true);
    setShowWorkouts(initialPreferences.showWorkouts ?? true);
  }, [initialPreferences]);

  useEffect(() => {
    if (initialCalendars) {
      setCalendars(initialCalendars);
    }
  }, [initialCalendars]);

  useEffect(() => {
    if (!prefsHydratedRef.current) {
      prefsHydratedRef.current = true;
      return;
    }
    onPreferencesChange?.({
      weeklyDaysCount,
      timelineFullDay,
      showEvents,
      showTasks,
      showFinance,
      showHabits,
      showNutrition,
      showSleep,
      showWorkouts,
    });
  }, [weeklyDaysCount, timelineFullDay, showEvents, showTasks, showFinance, showHabits, showNutrition, showSleep, showWorkouts, onPreferencesChange]);

  useEffect(() => {
    if (!calendarsHydratedRef.current) {
      calendarsHydratedRef.current = true;
      return;
    }
    onCalendarsChange?.(calendars);
  }, [calendars, onCalendarsChange]);

  const handleAddCalendarSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCalendarName.trim()) return;
    const newCal: CustomCalendar = {
      id: `custom-${Date.now()}`,
      name: newCalendarName,
      color: newCalendarColor,
      active: true
    };
    setCalendars(prev => [...prev, newCal]);
    setNewCalendarName('');
    setShowAddCalendarModal(false);
    addToast('تقویم جدید ایجاد شد', `تقویم "${newCalendarName}" به لیست شما اضافه شد.`);
  };

  // Recurrence States for Form
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]); // 0-6 corresponding to Saturday-Friday
  const [selectedCalendarId, setSelectedCalendarId] = useState('general');

  // Calendar Adding Modal
  const [showAddCalendarModal, setShowAddCalendarModal] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState<'purple' | 'green' | 'blue' | 'orange' | 'pink'>('purple');

  // Calendar Settings Modal and Weekly Quick Add states
  const [showCalendarSettingsModal, setShowCalendarSettingsModal] = useState(false);
  const [quickAddModal, setQuickAddModal] = useState<{ day: number; monthIndex: number; hourStr: string } | null>(null);
  const [quickAddType, setQuickAddType] = useState<'event' | 'task' | 'finance' | 'habit' | 'other' | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDesc, setQuickTaskDesc] = useState('');

  // Notification / Sound Alert States
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [appToasts, setAppToasts] = useState<{ id: string; title: string; desc: string; time: string }[]>([]);
  const alertedEventIdsRef = useRef<Set<string>>(new Set());

  // Track the active calendar item clicked to display in the overlay details modal
  const [selectedItemDetail, setSelectedItemDetail] = useState<{
    type: 'event' | 'task' | 'finance' | 'habit' | 'meal' | 'workout' | 'sleep';
    data: any;
  } | null>(null);
  
  // Selected Year and Month ( Tir 1405 )
  const [currentJalaliYear, setCurrentJalaliYear] = useState<number>(1405);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(3); // Tir is index 3 (0-based)
  
  // Selected Day in month (1 to 31)
  const [selectedDay, setSelectedDay] = useState<number>(15); // Default 15 Tir
  
  // Active filter pill: 'all' | 'tasks' | 'events' | 'finance' | 'habits' | 'nutrition' | 'sleep' | 'workouts'
  const [activeFilter, setActiveFilter] = useState<'all' | 'tasks' | 'events' | 'finance' | 'habits' | 'nutrition' | 'sleep' | 'workouts'>('all');

  // Interactive form states for Adding Events
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventCategory, setEventCategory] = useState<'purple' | 'green' | 'blue' | 'orange' | 'pink'>('purple');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [eventEndDay, setEventEndDay] = useState<number>(15);
  const [isOccasionType, setIsOccasionType] = useState(false); // Whether creating an Occasion instead of Event
  const [occasionType, setOccasionType] = useState<OccasionType>('event');
  const [occasionPerson, setOccasionPerson] = useState('');
  const [occasionRecurrence, setOccasionRecurrence] = useState<'once' | 'monthly' | 'yearly'>('once');
  const [reminderType, setReminderType] = useState<'none' | '1day' | '2day' | '3day' | 'custom'>('none');
  const [customReminderNote, setCustomReminderNote] = useState('');

  // Interactive form states for Adding Financial Transactions directly
  const [showAddFinanceForm, setShowAddFinanceForm] = useState(false);
  const [financeType, setFinanceType] = useState<'income' | 'expense'>('expense');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeCategory, setFinanceCategory] = useState<TransactionCategory>('food');
  const [financeDesc, setFinanceDesc] = useState('');

  // Drag and Drop State Feedback
  const [isDraggingOverDay, setIsDraggingOverDay] = useState<string | null>(null);

  // Resize State for calendar weekly view
  const [resizingState, setResizingState] = useState<{
    id: string;
    type: 'event' | 'task';
    edge: 'top' | 'bottom';
    tempTime?: string;
    tempDuration?: number;
  } | null>(null);

  // ---------------- GOOGLE CALENDAR & REAL-TIME ALERTS LOGIC ----------------

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Soft synth chime using Web Audio API
  const playSoftChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error('Audio chime error:', e);
    }
  };

  // Toast notifier helper
  const addToast = (title: string, desc: string, time: string = 'هم‌اکنون') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setAppToasts(prev => [...prev, { id, title, desc, time }]);
    setTimeout(() => {
      setAppToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Standard request notification permission
  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('نوتیفیکیشن فعال شد', {
          body: 'یادآورهای تقویم به صورت دسکتاپ نمایش داده خواهند شد.',
          dir: 'rtl'
        });
      }
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setGoogleError('');
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        addToast('اتصال به حساب گوگل', `با موفقیت به حساب ${res.user.email} متصل شدید.`, 'هم‌اکنون');
      }
    } catch (err: any) {
      setGoogleError(err.message || 'خطا در ورود به گوگل');
    }
  };

  // Google Logout
  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setAccessToken(null);
      addToast('قطع اتصال گوگل', 'اتصال حساب گوگل با موفقیت قطع گردید.', 'هم‌اکنون');
    } catch (err: any) {
      setGoogleError(err.message || 'خطا در خروج از گوگل');
    }
  };

  // Google Calendar REST API Calls
  const fetchGoogleEvents = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات از گوگل');
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const createGoogleEvent = async (token: string, title: string, desc: string, dateStr: string, timeStr: string, recurrenceRule?: string) => {
    try {
      const startIso = `${dateStr}T${timeStr || '12:00'}:00`;
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour duration default
      const endIso = endDate.toISOString().replace(/\.\d+Z$/, '');

      const body: any = {
        summary: title,
        description: desc,
        start: { dateTime: startIso, timeZone: 'Asia/Tehran' },
        end: { dateTime: endIso, timeZone: 'Asia/Tehran' }
      };

      if (recurrenceRule) {
        body.recurrence = [`RRULE:${recurrenceRule}`];
      }

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (e) {
      console.error('Error creating Google event:', e);
    }
    return null;
  };

  const deleteGoogleEvent = async (token: string, gEventId: string) => {
    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Error deleting Google event:', e);
    }
  };

  const updateGoogleEvent = async (token: string, gEventId: string, updates: Partial<ScheduleItem>) => {
    try {
      const body: any = {};
      if (updates.title) body.summary = updates.title;
      if (updates.desc !== undefined) body.description = updates.desc;
      if (updates.date || updates.time) {
        const d = updates.date || '2026-07-06';
        const t = updates.time || '12:00';
        const startIso = `${d}T${t}:00`;
        const startDate = new Date(startIso);
        const dur = updates.durationHours || 1;
        const endDate = new Date(startDate.getTime() + dur * 60 * 60 * 1000);

        body.start = { dateTime: startIso, timeZone: 'Asia/Tehran' };
        body.end = { dateTime: endDate.toISOString().replace(/\.\d+Z$/, ''), timeZone: 'Asia/Tehran' };
      }

      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gEventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error('Error updating Google event:', e);
    }
  };

  // Google Tasks REST API Calls
  const fetchGoogleTasks = async (token: string) => {
    try {
      const res = await fetch('https://tasks.googleapis.com/v1/lists/@default/tasks?maxResults=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('خطا در دریافت کارهای گوگل');
      const data = await res.json();
      return data.items || [];
    } catch (err) {
      console.error('Error fetching Google tasks:', err);
      return [];
    }
  };

  const createGoogleTask = async (token: string, title: string, notes?: string, dueDate?: string, completed?: boolean) => {
    try {
      const body: any = {
        title,
        notes: notes || '',
        status: completed ? 'completed' : 'needsAction'
      };
      if (dueDate) {
        body.due = `${dueDate}T00:00:00.000Z`;
      }
      const res = await fetch('https://tasks.googleapis.com/v1/lists/@default/tasks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (e) {
      console.error('Error creating Google task:', e);
    }
    return null;
  };

  const updateGoogleTask = async (token: string, gTaskId: string, updates: Partial<Task>) => {
    try {
      const body: any = {};
      if (updates.title !== undefined) body.title = updates.title;
      if (updates.description !== undefined) body.notes = updates.description;
      if (updates.completed !== undefined) {
        body.status = updates.completed ? 'completed' : 'needsAction';
      }
      if (updates.dueDate !== undefined) {
        body.due = updates.dueDate ? `${updates.dueDate}T00:00:00.000Z` : null;
      }

      await fetch(`https://tasks.googleapis.com/v1/lists/@default/tasks/${gTaskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error('Error updating Google task:', e);
    }
  };

  const deleteGoogleTask = async (token: string, gTaskId: string) => {
    try {
      await fetch(`https://tasks.googleapis.com/v1/lists/@default/tasks/${gTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Error deleting Google task:', e);
    }
  };

  // Perform full two-way sync
  const syncGoogleCalendar = async () => {
    if (!accessToken) return;
    setSyncing(true);
    setGoogleError('');
    try {
      // ==== 1. SYNC GOOGLE CALENDAR ====
      const gEvents = await fetchGoogleEvents(accessToken);
      
      // 1a. Sync from Google to Local
      for (const gEv of gEvents) {
        const matches = scheduleItems.find(item => item.googleEventId === gEv.id);
        if (!matches) {
          const startDT = gEv.start?.dateTime || gEv.start?.date || '';
          if (!startDT) continue;
          
          const dStr = startDT.split('T')[0];
          const tStr = startDT.includes('T') ? startDT.split('T')[1].substring(0, 5) : '12:00';
          
          // Add locally
          onAddScheduleItem({
            title: gEv.summary || 'رویداد گوگل',
            desc: gEv.description || '',
            time: tStr,
            category: 'purple',
            date: dStr,
            googleEventId: gEv.id,
            calendarId: 'general'
          } as any);
        }
      }

      // 1b. Sync from Local to Google (for events without GoogleEventId)
      for (const local of scheduleItems) {
        if (!local.googleEventId && local.date) {
          // Construct recurrence string if exists
          let rrule = '';
          if (local.recurrenceType && local.recurrenceType !== 'none') {
            rrule = `FREQ=${local.recurrenceType.toUpperCase()}`;
            if (local.recurrenceEndDate) {
              rrule += `;UNTIL=${local.recurrenceEndDate.replace(/-/g, '')}T235959Z`;
            }
          }
          const gId = await createGoogleEvent(accessToken, local.title, local.desc, local.date, local.time, rrule || undefined);
          if (gId && onUpdateScheduleItem) {
            onUpdateScheduleItem(local.id, { googleEventId: gId });
          }
        }
      }

      // ==== 2. SYNC GOOGLE TASKS ====
      const gTasks = await fetchGoogleTasks(accessToken);

      // 2a. Sync from Google to Local Tasks
      for (const gT of gTasks) {
        const matches = tasks.find(t => t.googleTaskId === gT.id);
        if (!matches) {
          // Construct local Task
          const localDueDate = gT.due ? gT.due.split('T')[0] : undefined;
          const newTask: Task = {
            id: `tk-g-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: gT.title || 'کار گوگل',
            completed: gT.status === 'completed',
            createdAt: todayDate,
            description: gT.notes || '',
            dueDate: localDueDate,
            googleTaskId: gT.id
          };
          if (onAddTask) {
            onAddTask(newTask);
          }
        } else {
          // check if status changed on Google side
          const isGoogleCompleted = gT.status === 'completed';
          if (isGoogleCompleted !== matches.completed && onUpdateTask) {
            onUpdateTask({
              ...matches,
              completed: isGoogleCompleted
            });
          }
        }
      }

      // 2b. Sync from Local Tasks to Google (for tasks without googleTaskId)
      for (const localTask of tasks) {
        if (!localTask.googleTaskId) {
          const gId = await createGoogleTask(
            accessToken,
            localTask.title,
            localTask.description,
            localTask.dueDate,
            localTask.completed
          );
          if (gId && onUpdateTask) {
            onUpdateTask({
              ...localTask,
              googleTaskId: gId
            });
          }
        }
      }

      addToast('همگام‌سازی زنده', 'تقویم و کارهای شما با موفقیت با حساب گوگل هماهنگ شد.', 'هم‌اکنون');
    } catch (err: any) {
      setGoogleError(err.message || 'خطا در عملیات همگام‌سازی');
    } finally {
      setSyncing(false);
    }
  };

  // Quick auto-trigger sync when connected
  useEffect(() => {
    if (accessToken) {
      syncGoogleCalendar();
    }
  }, [accessToken]);

  // Real-time Reminder Loop (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // Filter active events for today
      const activeEventsToday = scheduleItems.filter(item => {
        if (!item.date) return false;
        
        // Calendar check
        if (item.calendarId) {
          const cal = calendars.find(c => c.id === item.calendarId);
          if (cal && !cal.active) return false;
        }

        // Direct day check
        const isToday = item.endDate
          ? (todayDate >= item.date && todayDate <= item.endDate)
          : (item.date === todayDate);

        if (isToday) return true;

        // Recurrence check
        if (item.recurrenceType && item.recurrenceType !== 'none') {
          if (todayDate < item.date) return false;
          if (item.recurrenceEndDate && todayDate > item.recurrenceEndDate) return false;

          if (item.recurrenceType === 'daily') return true;
          if (item.recurrenceType === 'weekly') {
            const jsDate = new Date(todayDate);
            const dayOfWeek = (jsDate.getDay() + 1) % 7;
            if (item.recurrenceDays && item.recurrenceDays.length > 0) {
              return item.recurrenceDays.includes(dayOfWeek);
            }
            const sDate = new Date(item.date);
            const sDayOfWeek = (sDate.getDay() + 1) % 7;
            return dayOfWeek === sDayOfWeek;
          }
          if (item.recurrenceType === 'monthly') {
            return todayDate.split('-')[2] === item.date.split('-')[2];
          }
          if (item.recurrenceType === 'yearly') {
            return todayDate.split('-')[1] === item.date.split('-')[1] && todayDate.split('-')[2] === item.date.split('-')[2];
          }
        }
        return false;
      });

      for (const ev of activeEventsToday) {
        if (!ev.time) continue;
        const [evH, evM] = ev.time.split(':').map(Number);
        const evMinutes = evH * 60 + evM;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        
        const diff = evMinutes - nowMinutes;
        const uniqueKey = `${ev.id}-${ev.time}-${todayDate}`;

        if (diff >= 0 && diff <= 5 && !alertedEventIdsRef.current.has(uniqueKey)) {
          alertedEventIdsRef.current.add(uniqueKey);
          
          // Sound chime
          playSoftChime();
          
          // Visual alert toast
          addToast('یادآوری رویداد مهم ⏰', `رویداد "${ev.title}" تا ${diff === 0 ? 'چند لحظه' : toPersianDigits(diff) + ' دقیقه'} دیگر شروع می‌شود.`, ev.time);

          // Standard Browser notification
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`یادآوری: ${ev.title}`, {
              body: `رویداد شما رأس ساعت ${ev.time} شروع می‌شود.\n${ev.desc || ''}`,
              dir: 'rtl'
            });
          }
        }
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [scheduleItems, calendars, todayDate]);

  const handleDeleteScheduleItemWrap = (id: string) => {
    const item = scheduleItems.find(it => it.id === id);
    if (item && item.googleEventId && accessToken) {
      deleteGoogleEvent(accessToken, item.googleEventId);
    }
    onDeleteScheduleItem(id);
  };

  const handleUpdateScheduleItemWrap = (id: string, updates: Partial<ScheduleItem>) => {
    if (onUpdateScheduleItem) {
      onUpdateScheduleItem(id, updates);
    }
    const item = scheduleItems.find(it => it.id === id);
    if (item && item.googleEventId && accessToken) {
      updateGoogleEvent(accessToken, item.googleEventId, updates);
    }
  };

  const handleToggleTaskWrap = (id: string) => {
    onToggleTask(id);
    const tk = tasks.find(t => t.id === id);
    if (tk && tk.googleTaskId && accessToken) {
      updateGoogleTask(accessToken, tk.googleTaskId, {
        ...tk,
        completed: !tk.completed
      });
    }
  };

  const handleDeleteTaskWrap = (id: string) => {
    const tk = tasks.find(t => t.id === id);
    if (tk && tk.googleTaskId && accessToken) {
      deleteGoogleTask(accessToken, tk.googleTaskId);
    }
    if (onDeleteTask) {
      onDeleteTask(id);
    }
  };

  const handleUpdateTaskWrap = (task: Task) => {
    if (onUpdateTask) {
      onUpdateTask(task);
    }
    if (task.googleTaskId && accessToken) {
      updateGoogleTask(accessToken, task.googleTaskId, task);
    }
  };

  // ---------------- JALALI MONTH DEFINITIONS ----------------

  interface JalaliMonthInfo {
    name: string;
    year: number;
    daysCount: number;
    startGregorian: string;
    startWeekdayIndex: number; // 0 for شنبه, 1 for یکشنبه, etc.
    getGregorianDate: (day: number) => string;
  }

  const isLeapJalali = (jy: number): boolean => {
    const r = jy % 33;
    return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
  };

  const getJalaliMonths = (jy: number): JalaliMonthInfo[] => {
    const monthNames = [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    return monthNames.map((name, index) => {
      const jm = index + 1;
      const daysCount = jm <= 6 ? 31 : jm <= 11 ? 30 : (isLeapJalali(jy) ? 30 : 29);
      
      const firstDayObj = new DateObject({
        calendar: persian,
        locale: persian_fa,
        year: jy,
        month: jm,
        day: 1
      });
      const gregFirst = firstDayObj.convert(gregorian, gregorian_en);
      const startGregorian = `${gregFirst.year}-${String(gregFirst.month.number).padStart(2, '0')}-${String(gregFirst.day).padStart(2, '0')}`;
      
      const jsDay = new Date(startGregorian).getDay();
      const startWeekdayIndex = (jsDay + 1) % 7;
      
      return {
        name,
        year: jy,
        daysCount,
        startGregorian,
        startWeekdayIndex,
        getGregorianDate: (day: number) => {
          const dayObj = new DateObject({
            calendar: persian,
            locale: persian_fa,
            year: jy,
            month: jm,
            day: day
          });
          const gregDay = dayObj.convert(gregorian, gregorian_en);
          return `${gregDay.year}-${String(gregDay.month.number).padStart(2, '0')}-${String(gregDay.day).padStart(2, '0')}`;
        }
      };
    });
  };

  const JALALI_MONTHS = getJalaliMonths(currentJalaliYear);
  const prevYearMonths = getJalaliMonths(currentJalaliYear - 1);
  const nextYearMonths = getJalaliMonths(currentJalaliYear + 1);

  const currentMonth = JALALI_MONTHS[currentMonthIndex];

  // ---------------- HELPER FUNCTIONS ----------------

  const getDateString = (day: number, mIndex: number, yearOffset: number = 0): string => {
    if (yearOffset === -1) {
      return prevYearMonths[mIndex].getGregorianDate(day);
    }
    if (yearOffset === 1) {
      return nextYearMonths[mIndex].getGregorianDate(day);
    }
    return JALALI_MONTHS[mIndex].getGregorianDate(day);
  };

  const getWeekdayIndex = (day: number, mIndex: number, yearOffset: number = 0): number => {
    const refMonth = yearOffset === -1 ? prevYearMonths[mIndex] : yearOffset === 1 ? nextYearMonths[mIndex] : JALALI_MONTHS[mIndex];
    return (refMonth.startWeekdayIndex + day - 1) % 7;
  };

  const getWeekdayName = (day: number, mIndex: number, yearOffset: number = 0): string => {
    return WEEKDAY_NAMES[getWeekdayIndex(day, mIndex, yearOffset)];
  };

  // ---------------- DATE-SPECIFIC FILTERS (Supports Multi-day ranges) ----------------

  const getDayEvents = (day: number, mIndex: number = currentMonthIndex, yearOffset: number = 0) => {
    const dateStr = getDateString(day, mIndex, yearOffset);
    const weekdayIdx = getWeekdayIndex(day, mIndex, yearOffset);
    
    const standardEvents = scheduleItems.filter(item => {
      // Check multi-calendar active status
      if (item.calendarId) {
        const cal = calendars.find(c => c.id === item.calendarId);
        if (cal && !cal.active) return false;
      }

      if (item.date) {
        // Direct match (including range)
        if (item.endDate) {
          if (dateStr >= item.date && dateStr <= item.endDate) return true;
        } else if (item.date === dateStr) {
          return true;
        }

        // Recurrence rules
        if (item.recurrenceType && item.recurrenceType !== 'none') {
          if (dateStr < item.date) return false;
          if (item.recurrenceEndDate && dateStr > item.recurrenceEndDate) return false;

          if (item.recurrenceType === 'daily') return true;
          if (item.recurrenceType === 'weekly') {
            if (item.recurrenceDays && item.recurrenceDays.length > 0) {
              return item.recurrenceDays.includes(weekdayIdx);
            }
            const sJS = new Date(item.date);
            const tJS = new Date(dateStr);
            return sJS.getDay() === tJS.getDay();
          }
          if (item.recurrenceType === 'monthly') {
            return dateStr.split('-')[2] === item.date.split('-')[2];
          }
          if (item.recurrenceType === 'yearly') {
            return dateStr.split('-')[1] === item.date.split('-')[1] && dateStr.split('-')[2] === item.date.split('-')[2];
          }
        }
      }
      return false;
    });

    // Match occasions
    const matchedOccasions = (occasions || []).filter(o => {
      if (!o.date) return false;
      if (o.recurrenceType === 'once') {
        return o.date === dateStr;
      } else if (o.recurrenceType === 'yearly') {
        const oParts = o.date.split('-');
        const dParts = dateStr.split('-');
        if (oParts.length >= 2 && dParts.length >= 3) {
          const oMMDD = `${oParts[oParts.length - 2]}-${oParts[oParts.length - 1]}`;
          const dMMDD = `${dParts[1]}-${dParts[2]}`;
          return oMMDD === dMMDD;
        }
      } else if (o.recurrenceType === 'monthly') {
        const oParts = o.date.split('-');
        const dParts = dateStr.split('-');
        if (oParts.length >= 1 && dParts.length >= 3) {
          const oDD = oParts[oParts.length - 1];
          const dDD = dParts[2];
          return parseInt(oDD) === parseInt(dDD);
        }
      }
      return false;
    });

    const mappedOccasions = matchedOccasions.map(o => ({
      id: o.id,
      title: `🎈 مناسبت: ${o.title}${o.person ? ` (${o.person})` : ''}`,
      desc: o.notes || '',
      time: '09:00',
      completed: false,
      category: 'pink' as const,
      date: dateStr,
      isOccasion: true,
      originalOccasion: o
    } as any as ScheduleItem & { isOccasion: boolean; originalOccasion: Occasion }));

    return [...standardEvents, ...mappedOccasions];
  };

  const getDayTransactions = (day: number, mIndex: number = currentMonthIndex, yearOffset: number = 0) => {
    const dateStr = getDateString(day, mIndex, yearOffset);
    return transactions.filter(t => t.date === dateStr);
  };

  const getDayTasks = (day: number, mIndex: number = currentMonthIndex, yearOffset: number = 0) => {
    const dateStr = getDateString(day, mIndex, yearOffset);
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fa-IR') + ' تومان';
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    const startDateStr = getDateString(selectedDay, currentMonthIndex);
    const endDateStr = isMultiDay ? getDateString(eventEndDay, currentMonthIndex) : undefined;

    if (isOccasionType) {
      if (onAddOccasion) {
        onAddOccasion({
          title: eventTitle.trim(),
          type: occasionType,
          person: occasionPerson.trim() || undefined,
          date: startDateStr,
          recurrenceType: occasionRecurrence,
          reminderDaysBefore: 0,
          notes: eventDesc.trim() || undefined
        });
      }
    } else {
      const newItemId = `s-${Date.now()}`;
      const newItem = {
        id: newItemId,
        title: eventTitle.trim(),
        desc: eventDesc.trim(),
        time: eventTime.trim() || '12:00',
        category: eventCategory,
        date: startDateStr,
        endDate: endDateStr,
        reminderType,
        customReminderActive: reminderType === 'custom' ? true : undefined,
        calendarId: selectedCalendarId,
        recurrenceType,
        recurrenceEndDate: recurrenceEndDate || undefined,
        recurrenceDays: recurrenceType === 'weekly' ? recurrenceDays : undefined
      };

      onAddScheduleItem(newItem as any);

      // Async Google Calendar integration
      if (accessToken) {
        let rrule = '';
        if (recurrenceType && recurrenceType !== 'none') {
          rrule = `FREQ=${recurrenceType.toUpperCase()}`;
          if (recurrenceEndDate) {
            rrule += `;UNTIL=${recurrenceEndDate.replace(/-/g, '')}T235959Z`;
          }
        }
        createGoogleEvent(accessToken, newItem.title, newItem.desc, startDateStr, newItem.time, rrule || undefined)
          .then(gId => {
            if (gId && onUpdateScheduleItem) {
              onUpdateScheduleItem(newItemId, { googleEventId: gId });
            }
          });
      }
    }

    setEventTitle('');
    setEventDesc('');
    setEventTime('');
    setIsMultiDay(false);
    setIsOccasionType(false);
    setOccasionPerson('');
    setReminderType('none');
    setCustomReminderNote('');
    setRecurrenceType('none');
    setRecurrenceEndDate('');
    setRecurrenceDays([]);
    setShowAddEventForm(false);
  };

  const handleAddFinanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(financeAmount.replace(/,/g, '').trim(), 10);
    if (isNaN(cleanAmount) || cleanAmount <= 0) return;

    onAddTransaction({
      type: financeType,
      amount: cleanAmount,
      category: financeCategory,
      description: financeDesc.trim() || TRANSACTION_CATEGORIES.find(c => c.id === financeCategory)?.label || 'تراکنش بدون توضیح',
      date: getDateString(selectedDay, currentMonthIndex)
    });

    setFinanceAmount('');
    setFinanceDesc('');
    setShowAddFinanceForm(false);
  };

  // ---------------- HTML5 DRAG & DROP HANDLERS ----------------

  const handleDragStart = (e: React.DragEvent, id: string, type: 'event' | 'task' | 'finance') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault();
    setIsDraggingOverDay(cellKey);
  };

  const handleDragLeave = () => {
    setIsDraggingOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, targetDay: number, targetMonthIndex: number, targetHour?: string) => {
    e.preventDefault();
    setIsDraggingOverDay(null);
    try {
      const dragDataStr = e.dataTransfer.getData('text/plain');
      if (!dragDataStr) return;
      const { id, type } = JSON.parse(dragDataStr);
      const targetDateStr = getDateString(targetDay, targetMonthIndex);

      if (type === 'event' && onUpdateScheduleItem) {
        const ev = scheduleItems.find(item => item.id === id);
        if (ev) {
          const updates: Partial<ScheduleItem> = { date: targetDateStr };
          if (targetHour) {
            updates.time = targetHour;
          }
          if (ev.endDate && ev.date) {
            // Keep the multi-day offset if there is an endDate
            const startMs = new Date(ev.date).getTime();
            const endMs = new Date(ev.endDate).getTime();
            const diffMs = endMs - startMs;
            const newStartMs = new Date(targetDateStr).getTime();
            const newEndStr = new Date(newStartMs + diffMs).toISOString().split('T')[0];
            updates.endDate = newEndStr;
          }
          handleUpdateScheduleItemWrap(id, updates);
        }
      } else if (type === 'task' && onUpdateTask) {
        const tk = tasks.find(t => t.id === id);
        if (tk) {
          handleUpdateTaskWrap({ ...tk, dueDate: targetDateStr });
        }
      } else if (type === 'finance' && onUpdateTransaction) {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
          const { id: _, ...cleanTx } = tx;
          onUpdateTransaction(id, { ...cleanTx, date: targetDateStr });
        }
      }
    } catch (err) {
      console.error('Error in Drag and Drop drop execution', err);
    }
  };

  const parseTimeToHours = (timeStr: string | undefined): number => {
    if (!timeStr) return timelineFullDay ? 0 : 8;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    return isNaN(h) ? (timelineFullDay ? 0 : 8) : h + m / 60;
  };

  const handleDayColumnDrop = (e: React.DragEvent, targetDay: number, targetMonthIndex: number) => {
    e.preventDefault();
    setIsDraggingOverDay(null);
    try {
      const dragDataStr = e.dataTransfer.getData('text/plain');
      if (!dragDataStr) return;
      const { id, type } = JSON.parse(dragDataStr);
      const targetDateStr = getDateString(targetDay, targetMonthIndex);

      const timelineStartHour = timelineFullDay ? 0 : 8;
      const rect = e.currentTarget.getBoundingClientRect();
      const dropY = e.clientY - rect.top;
      const dropHours = (dropY / 52) + timelineStartHour;
      const snappedHours = Math.max(timelineStartHour, Math.min(23.5, Math.round(dropHours * 4) / 4));
      const finalH = Math.floor(snappedHours);
      const finalM = Math.round((snappedHours % 1) * 60);
      const newTimeStr = `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;

      if (type === 'event' && onUpdateScheduleItem) {
        handleUpdateScheduleItemWrap(id, { date: targetDateStr, time: newTimeStr });
      } else if (type === 'task' && onUpdateTask) {
        const tk = tasks.find(t => t.id === id);
        if (tk) {
          handleUpdateTaskWrap({ ...tk, dueDate: targetDateStr, time: newTimeStr } as any);
        }
      } else if (type === 'finance' && onUpdateTransaction) {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
          const { id: _, ...cleanTx } = tx;
          onUpdateTransaction(id, { ...cleanTx, date: targetDateStr, time: newTimeStr } as any);
        }
      }
    } catch (err) {
      console.error('Error dropping on Day Column:', err);
    }
  };

  const startResize = (e: React.MouseEvent, item: any, type: 'event' | 'task', edge: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    
    const timelineStartHour = timelineFullDay ? 0 : 8;
    const initialY = e.clientY;
    const initialTime = item.time || (type === 'event' ? '09:30' : '10:00');
    const initialDuration = item.durationHours !== undefined ? item.durationHours : 1.5;

    const parts = initialTime.split(':');
    const initialH = parseInt(parts[0], 10);
    const initialM = parseInt(parts[1], 10) || 0;
    const initialStartHour = isNaN(initialH) ? timelineStartHour : initialH + initialM / 60;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - initialY;
      const deltaHours = deltaY / 52;
      
      if (edge === 'bottom') {
        const newDuration = Math.max(0.5, Math.min(24, Math.round((initialDuration + deltaHours) * 4) / 4));
        setResizingState({
          id: item.id,
          type,
          edge,
          tempTime: initialTime,
          tempDuration: newDuration
        });
      } else {
        const newStartHour = Math.max(timelineStartHour, Math.min(23.75, Math.round((initialStartHour + deltaHours) * 4) / 4));
        const actualDelta = newStartHour - initialStartHour;
        const newDuration = Math.max(0.25, Math.round((initialDuration - actualDelta) * 4) / 4);
        
        const finalH = Math.floor(newStartHour);
        const finalM = Math.round((newStartHour % 1) * 60);
        const newTimeStr = `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
        
        setResizingState({
          id: item.id,
          type,
          edge,
          tempTime: newTimeStr,
          tempDuration: newDuration
        });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      setResizingState(prev => {
        if (prev && prev.id === item.id) {
          const finalTime = prev.tempTime || initialTime;
          const finalDuration = prev.tempDuration !== undefined ? prev.tempDuration : initialDuration;
          
          if (type === 'event' && onUpdateScheduleItem) {
            handleUpdateScheduleItemWrap(item.id, { time: finalTime, durationHours: finalDuration });
          } else if (type === 'task' && onUpdateTask) {
            handleUpdateTaskWrap({ ...item, time: finalTime, durationHours: finalDuration });
          }
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Generate days of active week for weekly grid view
  const getActiveWeekDays = () => {
    const days: { day: number; monthIndex: number; yearOffset?: number }[] = [];
    const currentWeekdayIdx = getWeekdayIndex(selectedDay, currentMonthIndex);
    
    // Find Saturday (شنبه) of the active week
    let saturdayDay = selectedDay - currentWeekdayIdx;
    let saturdayMonthIdx = currentMonthIndex;
    let saturdayYearOffset = 0;

    if (saturdayDay < 1) {
      // Goes back to previous month
      if (currentMonthIndex > 0) {
        saturdayMonthIdx = currentMonthIndex - 1;
        saturdayDay = JALALI_MONTHS[saturdayMonthIdx].daysCount + saturdayDay;
      } else {
        saturdayMonthIdx = 11; // Esfand of previous year
        saturdayYearOffset = -1;
        saturdayDay = prevYearMonths[11].daysCount + saturdayDay;
      }
    }

    for (let i = 0; i < 7; i++) {
      let d = saturdayDay + i;
      let mIdx = saturdayMonthIdx;
      let yOff = saturdayYearOffset;

      const refMonth = yOff === -1 ? prevYearMonths[mIdx] : JALALI_MONTHS[mIdx];
      const mDays = refMonth.daysCount;
      
      if (d > mDays) {
        d = d - mDays;
        if (mIdx < 11) {
          mIdx = mIdx + 1;
        } else {
          mIdx = 0;
          yOff = yOff + 1;
        }
      }
      days.push({ day: d, monthIndex: mIdx, yearOffset: yOff });
    }
    return days;
  };

  const activeWeekDays = getActiveWeekDays();
  const visibleWeekDays = activeWeekDays.slice(0, weeklyDaysCount);
  const timelineHeight = (timelineFullDay ? 24 : 16) * 52;

  // Selected Day Variables
  const selectedDateStr = getDateString(selectedDay, currentMonthIndex);
  const selectedDayEvents = getDayEvents(selectedDay, currentMonthIndex);
  const selectedDayTransactions = getDayTransactions(selectedDay, currentMonthIndex);
  const selectedDayTasks = getDayTasks(selectedDay, currentMonthIndex);

  const dayIncomeTotal = selectedDayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const dayExpenseTotal = selectedDayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const dayBalance = dayIncomeTotal - dayExpenseTotal;

  // Pre-compute liveItem for details modal
  let detailLiveItem: any = null;
  let detailType: 'event' | 'task' | 'finance' | 'habit' | 'meal' | 'workout' | 'sleep' | null = null;
  if (selectedItemDetail) {
    const { type, data } = selectedItemDetail;
    detailType = type;
    if (type === 'event') {
      detailLiveItem = scheduleItems.find(item => item.id === data.id) || data;
    } else if (type === 'task') {
      detailLiveItem = tasks.find(item => item.id === data.id) || data;
    } else if (type === 'finance') {
      detailLiveItem = transactions.find(item => item.id === data.id) || data;
    } else if (type === 'habit') {
      const currentHabit = habits.find(item => item.id === data.habit.id);
      detailLiveItem = currentHabit ? { habit: currentHabit, date: data.date } : data;
    } else if (type === 'meal') {
      detailLiveItem = (mealLogs || []).find(m => m.id === data.id) || data;
    } else if (type === 'workout') {
      detailLiveItem = (workoutLogs || []).find(w => w.id === data.id) || data;
    } else if (type === 'sleep') {
      detailLiveItem = (sleepLogs || []).find(s => s.id === data.id) || data;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right pb-12" dir="rtl" id="interactive-calendar-system">
      
      {/* 1. VIEW CONTROL SYSTEM PANEL (Left 2 Columns) */}
      <div className="lg:col-span-2 bg-[#FDFBF7] p-4 md:p-6 rounded-3xl border border-[#E6DFD3] shadow-xs space-y-6">
        
        {/* Navigation & Header strip */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E6DFD3]/50 pb-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="w-5 h-5 text-[#7C8363]" />
              <div>
                <h3 className="text-sm font-black text-[#2D3025]">تقویم و زمان‌بندی همبافت</h3>
                <span className="text-[10px] text-[#8D7F72] font-semibold">براق با قابلیت کشیدن و رها کردن (Drag and Drop)</span>
              </div>
            </div>

            {/* Calendar Settings Button */}
            <button
              onClick={() => setShowCalendarSettingsModal(true)}
              className="px-2.5 py-1.5 md:px-3 md:py-1.5 bg-white hover:bg-[#E8ECE0] text-[#7C8363] border border-[#E6DFD3] rounded-xl flex items-center gap-1.5 transition-all text-[10px] md:text-xs font-black cursor-pointer shadow-3xs hover:shadow-2xs"
              title="تنظیمات تقویم"
            >
              <Settings className="w-4 h-4 shrink-0 text-[#7C8363]" />
              <span>تنظیمات تقویم</span>
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center bg-[#E8ECE0]/50 border border-[#DDE2D5] p-1 rounded-xl">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  viewMode === mode 
                    ? 'bg-[#7C8363] text-white shadow-xs' 
                    : 'text-[#8D7F72] hover:text-[#2D3025]'
                }`}
              >
                {mode === 'month' ? 'نمای ماهانه' : mode === 'week' ? 'هفتگی (Google Calendar)' : 'نمای روزانه'}
              </button>
            ))}
          </div>
        </div>

        {/* Month Navigation & Biorhythm Switcher */}
        <div className="flex justify-between items-center bg-[#F9F6EE] p-3 rounded-2xl border border-[#E6DFD3]/60">
          <button
            onClick={() => {
              if (currentMonthIndex > 0) {
                setCurrentMonthIndex(currentMonthIndex - 1);
              } else {
                setCurrentJalaliYear(prev => prev - 1);
                setCurrentMonthIndex(11); // Esfand
              }
              setSelectedDay(1);
            }}
            className="p-1.5 rounded-lg bg-white border border-[#D6CFC3] text-[#8D7F72] hover:text-[#2D3025] cursor-pointer transition-all shrink-0 flex items-center gap-1 font-bold text-xs"
          >
            <ChevronRight className="w-4 h-4" />
            <span>ماه قبل</span>
          </button>

          <span className="text-xs md:text-sm font-black text-[#2D3025] font-serif-elegant">
            {currentMonth.name} {toPersianDigits(currentJalaliYear)}
          </span>

          <button
            onClick={() => {
              if (currentMonthIndex < 11) {
                setCurrentMonthIndex(currentMonthIndex + 1);
              } else {
                setCurrentJalaliYear(prev => prev + 1);
                setCurrentMonthIndex(0); // Farvardin
              }
              setSelectedDay(1);
            }}
            className="p-1.5 rounded-lg bg-white border border-[#D6CFC3] text-[#8D7F72] hover:text-[#2D3025] cursor-pointer transition-all shrink-0 flex items-center gap-1 font-bold text-xs"
          >
            <span>ماه بعد</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'همه دسته‌ها' },
            { id: 'events', label: '📅 رویدادها و جلسات' },
            { id: 'tasks', label: '📋 کارها و دلاین‌ها' },
            { id: 'finance', label: '💰 تراکنش‌های مالی' },
            { id: 'habits', label: '🌱 عادت‌ها' },
            { id: 'nutrition', label: '🍽️ تغذیه و رژیم' },
            { id: 'sleep', label: '🛏️ خواب و بیداری' },
            { id: 'workouts', label: '💪 ورزش و تمرین' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-bold border transition-all cursor-pointer ${
                activeFilter === pill.id 
                  ? 'bg-[#2D3025] text-white border-[#2D3025]' 
                  : 'bg-white text-[#8D7F72] border-[#D6CFC3] hover:border-[#7C8363]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Layer Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#E6DFD3]/60 text-[10px] md:text-xs text-[#2D3025] font-semibold">
          <div className="flex items-center gap-1 text-[#8D7F72]">
            <Eye className="w-3.5 h-3.5 text-[#7C8363]" />
            <span className="font-bold">نمایش لایه‌ها:</span>
          </div>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
            {[
              { id: 'events', label: '📅 رویدادها', value: showEvents, setter: setShowEvents },
              { id: 'tasks', label: '📋 کارها', value: showTasks, setter: setShowTasks },
              { id: 'finance', label: '💰 تراکنش‌ها', value: showFinance, setter: setShowFinance },
              { id: 'habits', label: '🌱 عادت‌ها', value: showHabits, setter: setShowHabits },
              { id: 'nutrition', label: '🍽️ تغذیه', value: showNutrition, setter: setShowNutrition },
              { id: 'workouts', label: '💪 تمرین‌ها', value: showWorkouts, setter: setShowWorkouts },
              { id: 'sleep', label: '🛏️ خواب', value: showSleep, setter: setShowSleep }
            ].map(layer => (
              <label key={layer.id} className="flex items-center gap-1.5 cursor-pointer select-none font-bold hover:text-[#7C8363] transition-colors">
                <input
                  type="checkbox"
                  checked={layer.value}
                  onChange={(e) => layer.setter(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#D6CFC3] text-[#7C8363] focus:ring-[#7C8363] accent-[#7C8363]"
                />
                <span>{layer.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. DYNAMIC WORKSPACE PREVIEW ACCORDING TO TOGGLE */}
        <div className="mt-4">

          {/* A. MONTHLY GRID VIEW (With HTML5 Drag and Drop Target cells) */}
          {viewMode === 'month' && (
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 text-center border-b border-[#E6DFD3]/40 pb-2">
                {WEEKDAY_NAMES.map((w) => (
                  <span key={w} className="text-[9px] md:text-xs font-extrabold text-[#8D7F72]">
                    {w}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1.5">
                {Array.from({ length: currentMonth.startWeekdayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-transparent border border-transparent rounded-2xl min-h-[58px]" />
                ))}
                
                {Array.from({ length: currentMonth.daysCount }, (_, i) => i + 1).map((day) => {
                  const isSelected = selectedDay === day;
                  const isToday = getDateString(day, currentMonthIndex) === todayDate;
                  const dateStr = getDateString(day, currentMonthIndex);

                  const dayEvts = getDayEvents(day, currentMonthIndex);
                  const dayTx = getDayTransactions(day, currentMonthIndex);
                  const dayTk = getDayTasks(day, currentMonthIndex);
                  const dayHabitsLogged = habits.filter(h => h.logs.includes(dateStr));

                  const dayItems: { id: string; type: 'event' | 'task' | 'finance' | 'habit' | 'meal' | 'workout' | 'sleep'; label: string; details: any; styleClass: string }[] = [];

                  if ((activeFilter === 'all' || activeFilter === 'events') && showEvents) {
                    dayEvts.forEach(ev => {
                      dayItems.push({
                        id: ev.id,
                        type: 'event',
                        label: `📅 ${ev.title}`,
                        details: ev,
                        styleClass: isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363] hover:border-[#7C8363]'
                      });
                    });
                  }
                  if ((activeFilter === 'all' || activeFilter === 'tasks') && showTasks) {
                    dayTk.forEach(tk => {
                      dayItems.push({
                        id: tk.id,
                        type: 'task',
                        label: `📋 ${tk.title}`,
                        details: tk,
                        styleClass: (isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40] hover:border-[#9B6B61]') + (tk.completed ? ' line-through opacity-60' : '')
                      });
                    });
                  }
                  if ((activeFilter === 'all' || activeFilter === 'finance') && showFinance) {
                    dayTx.forEach(tx => {
                      dayItems.push({
                        id: tx.id,
                        type: 'finance',
                        label: `💰 ${tx.type === 'income' ? '+' : '-'}${Math.round(tx.amount/1000).toLocaleString('fa-IR')}ک`,
                        details: tx,
                        styleClass: isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : tx.type === 'income'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:border-emerald-500'
                          : 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61] hover:border-[#9B6B61]'
                      });
                    });
                  }
                  if ((activeFilter === 'all' || activeFilter === 'habits') && showHabits) {
                    dayHabitsLogged.forEach(h => {
                      dayItems.push({
                        id: h.id,
                        type: 'habit',
                        label: `🌱 ${h.name}`,
                        details: { habit: h, date: dateStr },
                        styleClass: isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:border-emerald-500'
                      });
                    });
                  }

                  // Meal logs
                  if ((activeFilter === 'all' || activeFilter === 'nutrition') && showNutrition) {
                    const dayMeals = mealLogs.filter(m => m.date === dateStr);
                    dayMeals.forEach(m => {
                      dayItems.push({
                        id: m.id,
                        type: 'meal' as any,
                        label: `🍽️ ${m.type === 'breakfast' ? 'صبحانه' : m.type === 'lunch' ? 'ناهار' : m.type === 'dinner' ? 'شام' : 'میان‌وعده'}: ${m.foods}`,
                        details: m,
                        styleClass: isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : 'bg-emerald-50 border-emerald-100 text-emerald-800 hover:border-emerald-500'
                      });
                    });
                  }

                  // Workout logs
                  if ((activeFilter === 'all' || activeFilter === 'workouts' || activeFilter === 'tasks') && showWorkouts) {
                    const dayWorkouts = workoutLogs.filter(w => w.date === dateStr);
                    dayWorkouts.forEach(w => {
                      const typeLabel = w.type === 'cardio' 
                        ? (w.cardioType === 'running' ? 'دویدن 🏃' : w.cardioType === 'cycling' ? 'دوچرخه 🚴' : w.cardioType === 'swimming' ? 'شنا 🏊' : 'پیاده‌روی 🚶')
                        : 'بدنسازی 🏋️';
                      const detailsLabel = w.type === 'cardio'
                        ? `${w.distanceKm ? toPersianDigits(w.distanceKm) + 'km' : toPersianDigits(w.durationMinutes) + 'دقیقه'}`
                        : `${w.gymSets?.[0]?.exerciseName || 'قدرتی'}`;
                      
                      dayItems.push({
                        id: w.id,
                        type: 'workout' as any,
                        label: `💪 ${typeLabel}: ${detailsLabel}`,
                        details: w,
                        styleClass: isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : 'bg-sky-50 border-sky-150 text-sky-800 hover:border-sky-500'
                      });
                    });
                  }

                  // Sleep logs
                  if ((activeFilter === 'all' || activeFilter === 'sleep') && showSleep) {
                    const daySleep = sleepLogs.filter(s => s.date === dateStr);
                    daySleep.forEach(s => {
                      dayItems.push({
                        id: s.id,
                        type: 'sleep' as any,
                        label: `🛏️ خواب: ${toPersianDigits(s.duration)}ساعت (کیفیت ${toPersianDigits(s.quality)})`,
                        details: s,
                        styleClass: isSelected 
                          ? 'bg-white/20 border-white/30 text-white hover:bg-white/30 font-bold' 
                          : 'bg-indigo-50 border-indigo-150 text-indigo-800 hover:border-indigo-500'
                      });
                    });
                  }

                  const cellKey = `month-day-${currentMonthIndex}-${day}`;
                  const isOver = isDraggingOverDay === cellKey;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      onDragOver={(e) => handleDragOver(e, cellKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, currentMonthIndex)}
                      className={`min-h-[70px] md:min-h-[115px] p-2 rounded-2xl border flex flex-col justify-between items-start transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#2D3025] text-white border-[#2D3025] scale-102 shadow-xs'
                          : isToday
                          ? 'bg-[#E8ECE0] border-[#7C8363] text-[#2D3025]'
                          : 'bg-[#FDFBF7] border-[#E6DFD3] hover:bg-[#F9F6EE] text-[#3D3D3D]'
                      } ${isOver ? 'ring-4 ring-[#7C8363] ring-offset-2' : ''}`}
                    >
                      {/* Top strip with day number */}
                      <div className="w-full flex justify-between items-center">
                        <span className="text-xs font-black font-mono">{toPersianDigits(day)}</span>
                        {isToday && (
                          <span className={`text-[7px] font-black px-1.5 py-0.2 rounded-sm ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#7C8363] text-white'
                          }`}>امروز</span>
                        )}
                      </div>

                      {/* Desktop View: Draggable Badges */}
                      <div className="hidden md:flex flex-col gap-1 w-full mt-1.5 overflow-hidden">
                        {dayItems.slice(0, 3).map((item, index) => (
                          <div
                            key={`${item.type}-${item.id}-${index}`}
                            draggable={item.type !== 'habit' && item.type !== 'meal' && item.type !== 'workout' && item.type !== 'sleep'}
                            onDragStart={(e) => handleDragStart(e, item.id, item.type as any)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemDetail({ type: item.type, data: item.details });
                            }}
                            className={`w-full text-[9px] p-1 rounded-md border truncate text-right cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-between gap-1 ${item.styleClass}`}
                            title={item.label}
                          >
                            <span className="truncate">{item.label}</span>
                            {item.type !== 'habit' && item.type !== 'meal' && item.type !== 'workout' && item.type !== 'sleep' && <Move className="w-2.5 h-2.5 opacity-45 shrink-0" />}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className={`text-[8px] font-extrabold text-center mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#8D7F72]'}`}>
                            + {toPersianDigits(dayItems.length - 3)} مورد دیگر
                          </div>
                        )}
                      </div>

                      {/* Mobile View: Dots */}
                      <div className="flex md:hidden flex-col items-center justify-center w-full min-h-[20px] mt-1 text-[8px] font-bold">
                        {dayItems.length > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-sm font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#E26645]/10 text-[#E26645]'
                          }`}>
                            {toPersianDigits(dayItems.length)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. WEEKLY GOOGLE-CALENDAR GRID (Hour Blocks & Drag & Drop) */}
          {viewMode === 'week' && (
            <div className="border border-[#E6DFD3] dark:border-[#3D4133] rounded-2xl overflow-hidden bg-[#FDFBF7] dark:bg-[#1C1E1A] transition-all">
              
              {/* Custom Weekly View Settings Toolbar */}
              <div className="bg-[#FAF8F5] dark:bg-[#20241A] border-b border-[#E6DFD3] dark:border-[#3D4133]/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-right">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">تنظیمات نمای زمانی:</span>
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9E988D]">شخصی‌سازی روزها و ساعات تقویم</p>
                </div>
                
                <div className="flex items-center flex-wrap gap-4">
                  {/* Selector for Days Count */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-black text-[#8D7F72] dark:text-[#9E988D]">تعداد روزها:</label>
                    <div className="flex bg-white dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-xl p-0.5 shadow-2xs">
                      {([1, 2, 3, 5, 7] as const).map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setWeeklyDaysCount(count)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            weeklyDaysCount === count
                              ? 'bg-[#7C8363] text-white shadow-2xs'
                              : 'text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
                          }`}
                        >
                          {count === 7 ? '۷ روز (کامل)' : count === 1 ? '۱ روز' : `${toPersianDigits(count)} روز`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle for Full 24 Hours / Working Hours */}
                  <div className="flex items-center gap-2 border-r border-[#E6DFD3]/40 dark:border-[#3D4133]/20 pr-4">
                    <button
                      type="button"
                      onClick={() => setTimelineFullDay(prev => !prev)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 cursor-pointer ${
                        timelineFullDay
                          ? 'bg-[#9B6B61]/10 hover:bg-[#9B6B61]/20 text-[#9B6B61] border-[#9B6B61]/30'
                          : 'bg-white dark:bg-[#1B1D16] border-[#E6DFD3] dark:border-[#3D4133]/50 text-[#8D7F72] hover:border-[#7C8363]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timelineFullDay ? 'نمایش ۲۴ ساعت کامل 🌙' : 'نمایش ساعات کاری (۸ تا ۲۴) ☀️'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Header Row (Day names) */}
              <div 
                className="grid bg-[#F9F6EE] dark:bg-[#242721] border-b border-[#E6DFD3] dark:border-[#3D4133] text-center py-2.5"
                style={{ gridTemplateColumns: `60px repeat(${weeklyDaysCount}, 1fr)` }}
              >
                <div className="text-[10px] text-[#8D7F72] dark:text-[#9E988D] font-black flex items-center justify-center border-l border-[#E6DFD3] dark:border-[#3D4133]">
                  ساعت
                </div>
                {visibleWeekDays.map(({ day, monthIndex, yearOffset }) => {
                  const isToday = getDateString(day, monthIndex, yearOffset) === todayDate;
                  const isSel = selectedDay === day && currentMonthIndex === monthIndex;

                  return (
                    <div
                      key={`h-${monthIndex}-${day}`}
                      onClick={() => {
                        setSelectedDay(day);
                        setCurrentMonthIndex(monthIndex);
                      }}
                      className={`py-0.5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isSel ? 'bg-[#7C8363]/10 dark:bg-[#7C8363]/20 rounded-lg mx-1' : ''
                      }`}
                    >
                      <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9E988D]">{getWeekdayName(day, monthIndex, yearOffset)}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`text-xs font-black font-mono px-1 rounded ${
                          isToday ? 'bg-[#E26645] text-white' : 'text-[#2D3025] dark:text-[#E8ECE0]'
                        }`}>
                          {toPersianDigits(day)}
                        </span>
                      </div>
                      {isToday && (
                        <div className="text-[7px] font-black text-[#7C8363] dark:text-[#9ECE9A] mt-0.5">امروز</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. Scrollable continuous timeline grid */}
              <div className="relative h-[550px] overflow-y-auto custom-scrollbar" style={{ direction: 'ltr' }}>
                <div className="relative w-full flex" style={{ direction: 'rtl', height: `${timelineHeight}px` }}>
                  
                  {/* Grid background horizontal hour lines */}
                  {Array.from({ length: timelineFullDay ? 25 : 17 }).map((_, i) => (
                    <div 
                      key={`grid-line-${i}`} 
                      className="absolute left-0 right-0 border-b border-[#E6DFD3]/30 dark:border-[#3D4133]/30 pointer-events-none" 
                      style={{ top: `${i * 52}px`, height: '0px' }} 
                    />
                  ))}

                  {/* Left Column: Hours Labels */}
                  <div 
                    className="relative w-[60px] border-l border-[#E6DFD3]/40 dark:border-[#3D4133]/40 bg-[#F9F6EE]/20 dark:bg-[#242721]/20 shrink-0 select-none"
                    style={{ height: `${timelineHeight}px` }}
                  >
                    {Array.from({ length: timelineFullDay ? 25 : 17 }).map((_, i) => {
                      const hourVal = (timelineFullDay ? 0 : 8) + i;
                      const hourStr = `${hourVal.toString().padStart(2, '0')}:00`;
                      return (
                        <span 
                          key={`hour-label-${i}`} 
                          className="absolute right-2 text-[9px] text-[#8D7F72] dark:text-[#9E988D] font-mono font-bold -translate-y-1/2" 
                          style={{ top: `${i * 52}px` }}
                        >
                          {toPersianDigits(hourStr)}
                        </span>
                      );
                    })}
                  </div>

                  {/* Right Columns: One for each visible day of the week */}
                  <div 
                    className="grid flex-1 relative divide-x divide-x-reverse divide-[#E6DFD3]/30 dark:divide-[#3D4133]/30"
                    style={{ height: `${timelineHeight}px`, gridTemplateColumns: `repeat(${weeklyDaysCount}, 1fr)` }}
                  >
                    {visibleWeekDays.map(({ day, monthIndex, yearOffset }) => {
                      const dayEvts = getDayEvents(day, monthIndex, yearOffset);
                      const dayTk = getDayTasks(day, monthIndex, yearOffset);
                      const dayTx = getDayTransactions(day, monthIndex, yearOffset);

                      const isSelected = selectedDay === day && currentMonthIndex === monthIndex;
                      const colKey = `col-${monthIndex}-${day}`;
                      const isOver = isDraggingOverDay === colKey;

                      return (
                        <div
                          key={`day-col-${monthIndex}-${day}`}
                          onDragOver={(e) => handleDragOver(e, colKey)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDayColumnDrop(e, day, monthIndex)}
                          onClick={() => {
                            setSelectedDay(day);
                            setCurrentMonthIndex(monthIndex);
                          }}
                          className={`relative transition-all cursor-pointer`}
                          style={{ height: `${timelineHeight}px`, backgroundColor: isSelected ? 'rgba(124, 131, 99, 0.05)' : '' }}
                        >
                          {/* Inner Hour Markers for quick add */}
                          {Array.from({ length: timelineFullDay ? 24 : 16 }).map((_, i) => {
                            const hr = (timelineFullDay ? 0 : 8) + i;
                            const hrStr = `${hr.toString().padStart(2, '0')}:00`;
                            return (
                              <div
                                key={`cell-click-${i}`}
                                className="absolute left-0 right-0 h-[52px] border-b border-[#E6DFD3]/10 dark:border-[#3D4133]/10 hover:bg-[#7C8363]/5 transition-colors"
                                style={{ top: `${i * 52}px` }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDay(day);
                                  setCurrentMonthIndex(monthIndex);
                                  setQuickAddModal({ day, monthIndex, hourStr: hrStr });
                                  setQuickAddType(null); // Reset quick add type to options list
                                }}
                                title="کلیک برای ثبت برنامه در این ساعت"
                              />
                            );
                          })}

                          {/* UNIFIED NON-OVERLAPPING CHRONOLOGICAL LAYOUT */}
                          {(() => {
                            const rawItems: { id: string; topPx: number; heightPx: number; type: string; data: any }[] = [];

                            // 1. Events
                            if ((activeFilter === 'all' || activeFilter === 'events') && showEvents) {
                              dayEvts.forEach(ev => {
                                const isResizingThis = resizingState && resizingState.id === ev.id && resizingState.type === 'event';
                                const activeTime = isResizingThis && resizingState.tempTime ? resizingState.tempTime : (ev.time || '09:00');
                                const activeDuration = isResizingThis && resizingState.tempDuration !== undefined ? resizingState.tempDuration : (ev.durationHours !== undefined ? ev.durationHours : 1.5);
                                const startHours = parseTimeToHours(activeTime);
                                const startHourOffset = timelineFullDay ? 0 : 8;
                                const topPx = Math.max(0, Math.min(timelineHeight - 32, (startHours - startHourOffset) * 52));
                                const heightPx = Math.max(24, Math.min(timelineHeight - topPx, activeDuration * 52));
                                rawItems.push({ id: `ev-${ev.id}`, topPx, heightPx, type: 'event', data: ev });
                              });
                            }

                            // 2. Tasks
                            if ((activeFilter === 'all' || activeFilter === 'tasks') && showTasks) {
                              dayTk.forEach(tk => {
                                const isResizingThis = resizingState && resizingState.id === tk.id && resizingState.type === 'task';
                                const activeTime = isResizingThis && resizingState.tempTime ? resizingState.tempTime : ((tk as any).time || '10:00');
                                const activeDuration = isResizingThis && resizingState.tempDuration !== undefined ? resizingState.tempDuration : ((tk as any).durationHours !== undefined ? (tk as any).durationHours : 1.0);
                                const startHours = parseTimeToHours(activeTime);
                                const startHourOffset = timelineFullDay ? 0 : 8;
                                const topPx = Math.max(0, Math.min(timelineHeight - 32, (startHours - startHourOffset) * 52));
                                const heightPx = Math.max(24, Math.min(timelineHeight - topPx, activeDuration * 52));
                                rawItems.push({ id: `tk-${tk.id}`, topPx, heightPx, type: 'task', data: tk });
                              });
                            }

                            // 3. Transactions
                            if ((activeFilter === 'all' || activeFilter === 'finance') && showFinance) {
                              dayTx.forEach(tx => {
                                const activeTime = (tx as any).time || '12:00';
                                const startHours = parseTimeToHours(activeTime);
                                const startHourOffset = timelineFullDay ? 0 : 8;
                                const topPx = Math.max(0, Math.min(timelineHeight - 32, (startHours - startHourOffset) * 52));
                                const heightPx = 36;
                                rawItems.push({ id: `tx-${tx.id}`, topPx, heightPx, type: 'finance', data: tx });
                              });
                            }

                            // 4. Meal logs
                            if ((activeFilter === 'all' || activeFilter === 'nutrition') && showNutrition) {
                              const dayMeals = mealLogs.filter(m => m.date === getDateString(day, monthIndex, yearOffset));
                              dayMeals.forEach(m => {
                                const activeTime = m.time || '13:00';
                                const startHours = parseTimeToHours(activeTime);
                                const startHourOffset = timelineFullDay ? 0 : 8;
                                const topPx = Math.max(0, Math.min(timelineHeight - 32, (startHours - startHourOffset) * 52));
                                const heightPx = 36;
                                rawItems.push({ id: `meal-${m.id}`, topPx, heightPx, type: 'meal', data: m });
                              });
                            }

                            // 5. Workout logs
                            if ((activeFilter === 'all' || activeFilter === 'workouts') && showWorkouts) {
                              const dayWorkouts = workoutLogs.filter(w => w.date === getDateString(day, monthIndex, yearOffset));
                              dayWorkouts.forEach(w => {
                                const activeTime = w.type === 'cardio' ? '07:30' : '18:30';
                                const startHours = parseTimeToHours(activeTime);
                                const startHourOffset = timelineFullDay ? 0 : 8;
                                const topPx = Math.max(0, Math.min(timelineHeight - 32, (startHours - startHourOffset) * 52));
                                const heightPx = 40;
                                rawItems.push({ id: `workout-${w.id}`, topPx, heightPx, type: 'workout', data: w });
                              });
                            }

                            // 6. Sleep logs
                            if ((activeFilter === 'all' || activeFilter === 'sleep') && showSleep) {
                              const daySleep = sleepLogs.filter(s => s.date === getDateString(day, monthIndex, yearOffset));
                              daySleep.forEach(s => {
                                const sleepH = parseTimeToHours(s.sleepTime || '23:00');
                                const wakeH = parseTimeToHours(s.wakeTime || '07:00');
                                const startHourOffset = timelineFullDay ? 0 : 8;

                                if (sleepH > wakeH) {
                                  const morningTop = 0;
                                  const morningHeight = wakeH > startHourOffset ? (wakeH - startHourOffset) * 52 : 40;
                                  rawItems.push({ id: `sleep-morning-${s.id}`, topPx: morningTop, heightPx: morningHeight, type: 'sleep-morning', data: s });

                                  const eveningTop = Math.max(0, (sleepH - startHourOffset) * 52);
                                  const eveningHeight = (24 - sleepH) * 52;
                                  rawItems.push({ id: `sleep-evening-${s.id}`, topPx: eveningTop, heightPx: eveningHeight, type: 'sleep-evening', data: s });
                                } else {
                                  const topPx = Math.max(0, Math.min(timelineHeight - 32, (sleepH - startHourOffset) * 52));
                                  const heightPx = Math.max(36, (wakeH - sleepH) * 52);
                                  rawItems.push({ id: `sleep-standard-${s.id}`, topPx, heightPx, type: 'sleep-standard', data: s });
                                }
                              });
                            }

                            // Run the collision resolver
                            const laidOutItems = computeTimelineLayout(rawItems);

                            return laidOutItems.map(item => {
                              if (item.type === 'event') {
                                const ev = item.data;
                                const isResizingThis = resizingState && resizingState.id === ev.id && resizingState.type === 'event';
                                const activeTime = isResizingThis && resizingState.tempTime ? resizingState.tempTime : (ev.time || '09:00');
                                const activeDuration = isResizingThis && resizingState.tempDuration !== undefined ? resizingState.tempDuration : (ev.durationHours !== undefined ? ev.durationHours : 1.5);
                                const styleClass = CATEGORY_STYLES[ev.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.purple;
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, ev.id, 'event')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'event', data: ev });
                                    }}
                                    className={`absolute rounded-xl border shadow-2xs flex flex-col justify-between overflow-hidden cursor-move select-none group transition-all hover:shadow-sm hover:z-20 ${styleClass} ${
                                      heightPx < 32 ? 'py-0.5 px-1.5' : heightPx < 50 ? 'p-1' : 'p-2'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div 
                                      onMouseDown={(e) => startResize(e, ev, 'event', 'top')} 
                                      className="absolute top-0 inset-x-0 h-1 cursor-ns-resize bg-[#9B6B61]/20 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                                    />

                                    {heightPx < 32 ? (
                                      <div className="flex items-center justify-between text-[8px] font-black w-full truncate leading-none">
                                        <span className="truncate">📅 {ev.title}</span>
                                        <span className="font-mono shrink-0 font-bold opacity-80">{toPersianDigits(activeTime)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-right leading-tight overflow-hidden flex-1 flex flex-col justify-between h-full">
                                        <div className="min-w-0">
                                          <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                            <span className="font-bold">{toPersianDigits(activeTime)}</span>
                                            <span>({toPersianDigits(activeDuration)}ساعت)</span>
                                          </div>
                                          <h4 className="text-[9px] md:text-[10px] font-black truncate leading-tight mb-1">{ev.title}</h4>
                                          {heightPx >= 75 && ev.desc && (
                                            <p className="text-[7.5px] md:text-[8px] opacity-75 truncate max-w-full leading-normal">{ev.desc}</p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {heightPx >= 45 && (
                                      <div className="absolute bottom-1 left-1.5 opacity-30 group-hover:opacity-100 transition-opacity z-10">
                                        <Move className="w-2 h-2" />
                                      </div>
                                    )}

                                    <div 
                                      onMouseDown={(e) => startResize(e, ev, 'event', 'bottom')} 
                                      className="absolute bottom-0 inset-x-0 h-1 cursor-ns-resize bg-[#9B6B61]/20 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                                    />
                                  </div>
                                );
                              }

                              if (item.type === 'task') {
                                const tk = item.data;
                                const isResizingThis = resizingState && resizingState.id === tk.id && resizingState.type === 'task';
                                const activeTime = isResizingThis && resizingState.tempTime ? resizingState.tempTime : ((tk as any).time || '10:00');
                                const activeDuration = isResizingThis && resizingState.tempDuration !== undefined ? resizingState.tempDuration : ((tk as any).durationHours !== undefined ? (tk as any).durationHours : 1.0);
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, tk.id, 'task')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'task', data: tk });
                                    }}
                                    className={`absolute rounded-xl border shadow-2xs flex flex-col justify-between overflow-hidden cursor-move select-none group transition-all hover:shadow-sm hover:z-20 ${
                                      tk.completed
                                        ? 'bg-[#E6DFD3]/40 dark:bg-[#2D3025] border-[#D6CFC3] dark:border-[#3D4133] text-[#8D7F72] dark:text-[#9D978B] line-through opacity-70'
                                        : 'bg-[#F9F1D8] dark:bg-[#201D13] border-[#EBE3C8] dark:border-[#3D3929] text-[#5A5A40] dark:text-[#C59B93]'
                                    } ${
                                      heightPx < 32 ? 'py-0.5 px-1.5' : heightPx < 50 ? 'p-1' : 'p-2'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div 
                                      onMouseDown={(e) => startResize(e, tk, 'task', 'top')} 
                                      className="absolute top-0 inset-x-0 h-1 cursor-ns-resize bg-[#9B6B61]/20 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                                    />

                                    {heightPx < 32 ? (
                                      <div className="flex items-center justify-between text-[8px] font-black w-full truncate leading-none">
                                        <span className="truncate flex items-center gap-1">
                                          <span className={`w-1 h-1 rounded-full ${tk.completed ? 'bg-[#8D7F72]' : 'bg-[#9B6B61] animate-pulse'}`} />
                                          {tk.title}
                                        </span>
                                        <span className="font-mono shrink-0 font-bold opacity-80">{toPersianDigits(activeTime)}</span>
                                      </div>
                                    ) : (
                                      <div className="text-right leading-tight overflow-hidden flex-1 flex flex-col justify-between">
                                        <div>
                                          <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                            <span className="font-bold">{toPersianDigits(activeTime)}</span>
                                            <span>({toPersianDigits(activeDuration)}ساعت)</span>
                                          </div>
                                          <h4 className="text-[9px] font-black truncate leading-tight flex items-center gap-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${tk.completed ? 'bg-[#8D7F72]' : 'bg-[#9B6B61] animate-pulse'}`} />
                                            {tk.title}
                                          </h4>
                                        </div>
                                      </div>
                                    )}

                                    {heightPx >= 45 && (
                                      <div className="flex justify-between items-center mt-1">
                                        <span className="text-[7px] font-black bg-[#F9F1D8] dark:bg-[#201D13] px-1 py-0.5 rounded text-[#5A5A40] dark:text-[#C59B93] shrink-0">تسک</span>
                                        <Move className="w-2 h-2 opacity-30 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    )}

                                    <div 
                                      onMouseDown={(e) => startResize(e, tk, 'task', 'bottom')} 
                                      className="absolute bottom-0 inset-x-0 h-1 cursor-ns-resize bg-[#9B6B61]/20 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                                    />
                                  </div>
                                );
                              }

                              if (item.type === 'finance') {
                                const tx = item.data;
                                const activeTime = (tx as any).time || '12:00';
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, tx.id, 'finance')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'finance', data: tx });
                                    }}
                                    className={`absolute rounded-lg border shadow-3xs flex flex-col justify-center overflow-hidden cursor-move select-none group transition-all hover:shadow-xs hover:z-20 ${
                                      tx.type === 'income'
                                        ? 'bg-emerald-50 dark:bg-[#1A2E20] border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                                        : 'bg-rose-50 dark:bg-[#2E1D1F] border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                                    } ${
                                      heightPx < 32 ? 'py-0.5 px-1' : 'p-1'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div className="text-right leading-none w-full">
                                      <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                        <span>{toPersianDigits(activeTime)}</span>
                                        <span className="font-bold">{tx.type === 'income' ? 'درآمد' : 'هزینه'}</span>
                                      </div>
                                      <h4 className="text-[9px] font-black truncate">{tx.description || 'تراکنش مالی'}</h4>
                                    </div>
                                  </div>
                                );
                              }

                              if (item.type === 'meal') {
                                const m = item.data;
                                const activeTime = m.time || '13:00';
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'meal' as any, data: m });
                                    }}
                                    className={`absolute rounded-lg border shadow-3xs flex flex-col justify-center overflow-hidden cursor-pointer select-none group transition-all hover:shadow-xs hover:z-20 bg-emerald-50 dark:bg-[#1A2E20] border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 ${
                                      heightPx < 32 ? 'py-0.5 px-1' : 'p-1'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div className="text-right leading-none w-full">
                                      <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                        <span>{toPersianDigits(activeTime)}</span>
                                        <span className="font-bold">تغذیه</span>
                                      </div>
                                      <h4 className="text-[9px] font-black truncate">🍽️ {m.foods}</h4>
                                    </div>
                                  </div>
                                );
                              }

                              if (item.type === 'workout') {
                                const w = item.data;
                                const activeTime = w.type === 'cardio' ? '07:30' : '18:30';
                                const heightPx = item.heightPx;
                                const typeLabel = w.type === 'cardio' 
                                  ? (w.cardioType === 'running' ? 'دویدن 🏃' : w.cardioType === 'cycling' ? 'دوچرخه 🚴' : 'ورزش 🏃')
                                  : 'بدنسازی 🏋️';

                                return (
                                  <div
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'workout' as any, data: w });
                                    }}
                                    className={`absolute rounded-lg border shadow-3xs flex flex-col justify-center overflow-hidden cursor-pointer select-none group transition-all hover:shadow-xs hover:z-20 bg-sky-50 dark:bg-[#1E2E3E] border-sky-200 dark:border-sky-900 text-sky-800 dark:text-sky-200 ${
                                      heightPx < 32 ? 'py-0.5 px-1' : 'p-1'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div className="text-right leading-none w-full">
                                      <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                        <span>{toPersianDigits(activeTime)}</span>
                                        <span className="font-bold">تمرین</span>
                                      </div>
                                      <h4 className="text-[9px] font-black truncate">💪 {typeLabel}</h4>
                                    </div>
                                  </div>
                                );
                              }

                              if (item.type === 'sleep-morning') {
                                const s = item.data;
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'sleep' as any, data: s });
                                    }}
                                    className={`absolute rounded-lg border shadow-3xs flex flex-col justify-center overflow-hidden cursor-pointer select-none group transition-all hover:shadow-xs hover:z-20 bg-indigo-50 dark:bg-[#1E1F3E] border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 ${
                                      heightPx < 32 ? 'py-0.5 px-1' : 'p-1'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div className="text-right leading-none w-full">
                                      <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                        <span>تا {toPersianDigits(s.wakeTime)}</span>
                                        <span className="font-bold">خواب (بیدارباش)</span>
                                      </div>
                                      <h4 className="text-[9px] font-black truncate">🛏️ {toPersianDigits(s.duration)}ساعت</h4>
                                    </div>
                                  </div>
                                );
                              }

                              if (item.type === 'sleep-evening') {
                                const s = item.data;
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'sleep' as any, data: s });
                                    }}
                                    className={`absolute rounded-lg border shadow-3xs flex flex-col justify-center overflow-hidden cursor-pointer select-none group transition-all hover:shadow-xs hover:z-20 bg-indigo-50 dark:bg-[#1E1F3E] border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 ${
                                      heightPx < 32 ? 'py-0.5 px-1' : 'p-1'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div className="text-right leading-none w-full">
                                      <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                        <span>از {toPersianDigits(s.sleepTime)}</span>
                                        <span className="font-bold">خواب (شروع)</span>
                                      </div>
                                      <h4 className="text-[9px] font-black truncate">🛏️ رختخواب</h4>
                                    </div>
                                  </div>
                                );
                              }

                              if (item.type === 'sleep-standard') {
                                const s = item.data;
                                const heightPx = item.heightPx;

                                return (
                                  <div
                                    key={item.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItemDetail({ type: 'sleep' as any, data: s });
                                    }}
                                    className={`absolute rounded-lg border shadow-3xs flex flex-col justify-center overflow-hidden cursor-pointer select-none group transition-all hover:shadow-xs hover:z-20 bg-indigo-50 dark:bg-[#1E1F3E] border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 ${
                                      heightPx < 32 ? 'py-0.5 px-1' : 'p-1'
                                    }`}
                                    style={{
                                      top: `${item.topPx}px`,
                                      height: `${heightPx}px`,
                                      left: `${item.leftPercent}%`,
                                      width: `${item.widthPercent}%`
                                    }}
                                  >
                                    <div className="text-right leading-none w-full">
                                      <div className="flex justify-between items-center text-[7px] font-mono opacity-80 mb-0.5">
                                        <span>{toPersianDigits(s.sleepTime)} تا {toPersianDigits(s.wakeTime)}</span>
                                        <span className="font-bold">خواب</span>
                                      </div>
                                      <h4 className="text-[9px] font-black truncate">🛏️ {toPersianDigits(s.duration)}ساعت</h4>
                                    </div>
                                  </div>
                                );
                              }

                              return null;
                            });
                          })()}

                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* C. CHRONOLOGICAL LIST ONLY */}
          {viewMode === 'day' && (
            <div className="bg-[#F9F6EE] p-5 rounded-2xl border border-[#E6DFD3] space-y-4">
              <h4 className="text-xs font-black text-[#2D3025]">جدول زمانی روز {toPersianDigits(selectedDay)} {currentMonth.name}</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 && selectedDayTransactions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#8D7F72] font-semibold">هیچ رویداد یا کاری برای این روز ثبت نشده است.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map(ev => (
                      <div key={ev.id} className="p-3 bg-white border border-[#E6DFD3] rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-teal-800">📅 {ev.title}</span>
                        <span className="font-mono text-[10px] text-[#8D7F72] bg-[#F9F6EE] px-2 py-0.5 rounded-lg">{toPersianDigits(ev.time)}</span>
                      </div>
                    ))}
                    {selectedDayTasks.map(tk => (
                      <div key={tk.id} className="p-3 bg-white border border-[#E6DFD3] rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-[#5A5A40]">📋 {tk.title}</span>
                        <span className="text-[10px] text-[#8D7F72] font-bold">مهلت کار</span>
                      </div>
                    ))}
                    {selectedDayTransactions.map(tx => (
                      <div key={tx.id} className="p-3 bg-white border border-[#E6DFD3] rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-[#9B6B61]">💰 {tx.description}</span>
                        <span className={`font-bold ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('fa-IR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. CHRONOLOGICAL DAY DETAIL PANEL (Right 1 Column) */}
      <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-6 shadow-xs h-full" id="calendar-day-detail-panel">
        
        <div className="flex flex-col border-b border-[#E6DFD3]/40 pb-4 gap-2">
          <div>
            <span className="text-[10px] text-[#8D7F72] font-black">جزئیات روز منتخب</span>
            <h3 className="text-xs md:text-sm font-extrabold text-[#2D3025] flex items-center gap-1.5 font-serif-elegant mt-0.5">
              <span>{getWeekdayName(selectedDay, currentMonthIndex)} {toPersianDigits(selectedDay)} {currentMonth.name} {toPersianDigits(currentMonth.year)}</span>
            </h3>
          </div>

          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => {
                setShowAddEventForm(!showAddEventForm);
                setShowAddFinanceForm(false);
              }}
              className="text-[9px] md:text-xs bg-[#7C8363] hover:bg-[#5A5A40] text-white px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت رویداد</span>
            </button>
            <button
              onClick={() => {
                setShowAddFinanceForm(!showAddFinanceForm);
                setShowAddEventForm(false);
              }}
              className="text-[9px] md:text-xs bg-[#9B6B61] hover:bg-[#805047] text-white px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ثبت مالی</span>
            </button>
          </div>
        </div>

        {/* --- ADD EVENT FORM (With Start and End Date Support!) --- */}
        <AnimatePresence>
          {showAddEventForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#7C8363]/40 space-y-3 overflow-hidden"
            >
              <h4 className="text-xs font-bold text-[#2D3025] flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#7C8363]" />
                <span>برنامه‌ریزی جلسه یا رویداد</span>
              </h4>
              <form onSubmit={handleAddEventSubmit} className="space-y-3 text-right">
                {/* Segment: Choose Event or Occasion */}
                <div className="flex bg-[#E6DFD3]/40 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setIsOccasionType(false)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      !isOccasionType ? 'bg-[#7C8363] text-white shadow-xs' : 'text-[#8D7F72] hover:text-[#5A5A40]'
                    }`}
                  >
                    جلسه یا رویداد عمومی
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOccasionType(true)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      isOccasionType ? 'bg-[#9B6B61] text-white shadow-xs' : 'text-[#8D7F72] hover:text-[#5A5A40]'
                    }`}
                  >
                    مناسبت خاص یا ضرب‌الاجل
                  </button>
                </div>

                {isOccasionType ? (
                  /* OCCASION SPECIFIC FIELDS */
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#8D7F72]">عنوان مناسبت (مثال: تولد، انقضای بیمه، ...)</label>
                      <input
                        type="text"
                        placeholder="بیمه شخص ثالث خودرو..."
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">نوع مناسبت</label>
                        <select
                          value={occasionType}
                          onChange={(e) => setOccasionType(e.target.value as OccasionType)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="birthday">تولد 🎂</option>
                          <option value="anniversary">سالگرد 💖</option>
                          <option value="deadline">ضرب‌الاجل ⏰</option>
                          <option value="reminder">یادآوری 🔔</option>
                          <option value="event">بیمه / رویداد خاص 🛡️</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">تکرار دوره‌ای</label>
                        <select
                          value={occasionRecurrence}
                          onChange={(e) => setOccasionRecurrence(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none cursor-pointer"
                        >
                          <option value="once">بدون تکرار (فقط امسال)</option>
                          <option value="monthly">ماهانه</option>
                          <option value="yearly">سالانه (هر سال در این تاریخ)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#8D7F72]">شخص مرتبط (اختیاری)</label>
                      <input
                        type="text"
                        placeholder="نام شخص یا سازمان..."
                        value={occasionPerson}
                        onChange={(e) => setOccasionPerson(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#8D7F72]">یادداشت / توضیحات مناسبت</label>
                      <input
                        type="text"
                        placeholder="شماره قرارداد، جزئیات و ..."
                        value={eventDesc}
                        onChange={(e) => setEventDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* STANDARD EVENT FIELDS */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] font-bold text-[#8D7F72]">عنوان رویداد</label>
                        <input
                          type="text"
                          placeholder="قرار شام کاری..."
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">ساعت انجام</label>
                        <input
                          type="text"
                          placeholder="۲۱:۰۰"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white text-left font-mono focus:outline-none"
                          required
                        />
                      </div>

                      {/* Multi-day date selector (از تاریخ و تا تاریخ) */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#8D7F72]">رویداد چند روزه</label>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <input
                            type="checkbox"
                            checked={isMultiDay}
                            onChange={(e) => setIsMultiDay(e.target.checked)}
                            className="w-4 h-4 accent-[#7C8363]"
                          />
                          <span className="text-[9px] font-bold text-[#8D7F72]">بله (تعیین پایان)</span>
                        </div>
                      </div>
                    </div>

                    {isMultiDay && (
                      <div className="bg-[#F9F6EE] p-2.5 rounded-xl border border-[#E6DFD3] space-y-1">
                        <span className="text-[9px] font-black text-[#7C8363] block">تعیین روز پایان رویداد:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#8D7F72] font-semibold">از روز {toPersianDigits(selectedDay)} تا روز:</span>
                          <select
                            value={eventEndDay}
                            onChange={(e) => setEventEndDay(parseInt(e.target.value))}
                            className="text-xs border border-[#D6CFC3] bg-white rounded-lg px-2 py-1 font-mono"
                          >
                            {Array.from({ length: currentMonth.daysCount }, (_, i) => i + 1)
                              .filter(d => d >= selectedDay)
                              .map(d => (
                                <option key={d} value={d}>روز {toPersianDigits(d)} {currentMonth.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#8D7F72]">توضیحات کوتاه</label>
                      <input
                        type="text"
                        placeholder="محل برگزاری، نکات لازم و غیره..."
                        value={eventDesc}
                        onChange={(e) => setEventDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                      />
                    </div>

                    {/* EVENT REMINDERS CONFIG */}
                    <div className="bg-[#F9F6EE] p-3 rounded-xl border border-[#E6DFD3] space-y-2">
                      <label className="text-[10px] font-bold text-[#7C8363] block">یادآور هوشمند رویداد:</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: 'none', label: 'بدون یادآور' },
                          { id: '1day', label: '۱ روز قبل' },
                          { id: '2day', label: '۲ روز قبل' },
                          { id: '3day', label: '۳ روز قبل' },
                          { id: 'custom', label: 'یادآور مستمر سفارشی' }
                        ].map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setReminderType(r.id as any)}
                            className={`py-1 px-2 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              reminderType === r.id 
                                ? 'bg-[#7C8363] text-white border-[#7C8363]' 
                                : 'bg-white text-[#8D7F72] border-[#D6CFC3] hover:border-[#7C8363]'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      {reminderType === 'custom' && (
                        <div className="pt-1.5">
                          <input
                            type="text"
                            placeholder="یادداشت یادآور (تا زمان غیرفعال‌سازی دستی فعال می‌ماند)..."
                            value={customReminderNote}
                            onChange={(e) => setCustomReminderNote(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-white focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* MULTI-CALENDAR SELECTOR */}
                    <div className="bg-[#F9F6EE] p-3 rounded-xl border border-[#E6DFD3] space-y-1.5 text-right">
                      <label className="text-[10px] font-bold text-[#7C8363] block">انتخاب تقویم / دسته‌بندی:</label>
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => {
                          setSelectedCalendarId(e.target.value);
                          const cal = calendars.find(c => c.id === e.target.value);
                          if (cal) setEventCategory(cal.color);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none cursor-pointer"
                      >
                        {calendars.map(cal => (
                          <option key={cal.id} value={cal.id}>{cal.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* RECURRING EVENTS CONFIG */}
                    <div className="bg-[#F9F6EE] p-3 rounded-xl border border-[#E6DFD3] space-y-2 text-right">
                      <label className="text-[10px] font-bold text-[#7C8363] block">تکرار رویداد (Recurring):</label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                        {[
                          { id: 'none', label: 'بدون تکرار' },
                          { id: 'daily', label: 'روزانه' },
                          { id: 'weekly', label: 'هفتگی' },
                          { id: 'monthly', label: 'ماهانه' },
                          { id: 'yearly', label: 'سالانه' }
                        ].map(rec => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => setRecurrenceType(rec.id as any)}
                            className={`py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                              recurrenceType === rec.id
                                ? 'bg-[#7C8363] text-white border-[#7C8363]'
                                : 'bg-white text-[#8D7F72] border-[#D6CFC3] hover:border-[#7C8363]'
                            }`}
                          >
                            {rec.label}
                          </button>
                        ))}
                      </div>

                      {recurrenceType === 'weekly' && (
                        <div className="space-y-1.5 pt-1 border-t border-[#E6DFD3]/40">
                          <span className="text-[9px] font-bold text-[#8D7F72]">انتخاب روزهای هفته (جلالی):</span>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                            {WEEKDAY_NAMES.map((name, idx) => {
                              const active = recurrenceDays.includes(idx);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setRecurrenceDays(prev =>
                                      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                                    );
                                  }}
                                  className={`py-1 text-[8px] font-bold rounded-md border transition-all cursor-pointer text-center ${
                                    active
                                      ? 'bg-[#7C8363] text-white border-[#7C8363]'
                                      : 'bg-white text-[#8D7F72] border-[#D6CFC3]'
                                  }`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {recurrenceType !== 'none' && (
                        <div className="space-y-1 pt-1.5 border-t border-[#E6DFD3]/40">
                          <label className="text-[9px] font-bold text-[#8D7F72] block">تاریخ پایان تکرار (اختیاری):</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={recurrenceEndDate}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-white text-left font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] font-black text-[#8D7F72]">رنگ کارت:</span>
                      <div className="flex gap-1.5">
                        {(['purple', 'green', 'blue', 'orange', 'pink'] as const).map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEventCategory(color)}
                            className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                              eventCategory === color ? 'ring-2 ring-black' : ''
                            } ${
                              color === 'purple' ? 'bg-[#F4E9E4]' :
                              color === 'green' ? 'bg-[#E8ECE0]' :
                              color === 'blue' ? 'bg-[#E6DFD3]' :
                              color === 'orange' ? 'bg-[#F9F1D8]' : 'bg-[#FDFBF7]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {isOccasionType ? 'ثبت مناسبت در تقویم اصلی' : 'ثبت رویداد در تقویم'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- ADD TRANSACTION (FINANCE) FORM --- */}
        <AnimatePresence>
          {showAddFinanceForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#9B6B61]/40 space-y-3 overflow-hidden"
            >
              <h4 className="text-xs font-bold text-[#2D3025] flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-[#9B6B61]" />
                <span>ثبت درآمد یا هزینه در تاریخ {toPersianDigits(selectedDay)} {currentMonth.name}</span>
              </h4>
              <form onSubmit={handleAddFinanceSubmit} className="space-y-3 text-right">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-bold text-[#8D7F72]">نوع تراکنش</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-[#F9F6EE] border border-[#E6DFD3] p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFinanceType('expense')}
                        className={`py-1 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                          financeType === 'expense' ? 'bg-[#9B6B61] text-white' : 'text-[#8D7F72]'
                        }`}
                      >
                        هزینه / خرج
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinanceType('income')}
                        className={`py-1 text-[9px] font-bold rounded-lg cursor-pointer transition-all ${
                          financeType === 'income' ? 'bg-emerald-600 text-white' : 'text-[#8D7F72]'
                        }`}
                      >
                        درآمد
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-bold text-[#8D7F72]">مبلغ تراکنش (تومان)</label>
                    <input
                      type="text"
                      placeholder="۴۵۰,۰۰۰"
                      value={financeAmount}
                      onChange={(e) => setFinanceAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white text-left font-mono focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-[#8D7F72]">دسته‌بندی موضوعی</label>
                    <select
                      value={financeCategory}
                      onChange={(e) => setFinanceCategory(e.target.value as any)}
                      className="w-full px-2 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white text-[#2D3025]"
                    >
                      {TRANSACTION_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-[#8D7F72]">توضیح کوتاه</label>
                    <input
                      type="text"
                      placeholder="خرید مواد اولیه..."
                      value={financeDesc}
                      onChange={(e) => setFinanceDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#9B6B61] hover:bg-[#805047] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  ثبت تراکنش مالی
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- SELECTED DAY FINANCIAL SUMMARY PANEL --- */}
        {selectedDayTransactions.length > 0 && (
          <div className="bg-[#F9F6EE] p-3 rounded-2xl border border-[#E6DFD3] space-y-1.5 text-xs">
            <span className="font-extrabold text-[#2D3025] block">تراز کل امروز:</span>
            <div className="flex flex-col gap-1 text-[10px] font-mono">
              <span className="text-emerald-700 font-bold">درآمد: {formatCurrency(dayIncomeTotal)}</span>
              <span className="text-rose-700 font-bold">هزینه: {formatCurrency(dayExpenseTotal)}</span>
              <span className={`font-black ${dayBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                تراز: {dayBalance >= 0 ? '+' : ''}{formatCurrency(dayBalance)}
              </span>
            </div>
          </div>
        )}

        {/* --- TIMELINE LIST OF SELECTED DAY --- */}
        <div className="space-y-4">
          
          {/* A. Events */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#7C8363] font-black block border-b border-[#E6DFD3]/40 pb-1">📅 رویدادهای روز منتخب:</span>
            {selectedDayEvents.length === 0 ? (
              <span className="text-[10px] text-[#8D7F72] block">رویدادی ثبت نشده است.</span>
            ) : (
              <div className="space-y-1.5">
                {selectedDayEvents.map(ev => {
                  const hasEnd = ev.endDate && ev.endDate !== ev.date;
                  return (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ev.id, 'event')}
                      className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${
                        ev.completed ? 'opacity-40 bg-[#E6DFD3]/40' : CATEGORY_STYLES[ev.category] || CATEGORY_STYLES.purple
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Move className="w-3.5 h-3.5 opacity-40 shrink-0 cursor-grab" />
                        <button
                          onClick={() => onToggleScheduleItem(ev.id)}
                          className={`w-4 h-4 rounded-full border flex items-center justify-center bg-white shrink-0 ${
                            ev.completed ? 'bg-teal-700 border-teal-700 text-white' : 'border-[#D6CFC3]'
                          }`}
                        >
                          {ev.completed && <Check className="w-2.5 h-2.5" />}
                        </button>
                        <div className="truncate">
                          <span className={`font-extrabold truncate block ${ev.completed ? 'line-through text-[#8D7F72]' : ''}`}>{ev.title}</span>
                          {hasEnd && <span className="text-[7px] text-[#8D7F72] font-bold">مدت: چند روزه</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9px] font-mono bg-white/50 px-1.5 py-0.5 rounded border border-[#E6DFD3]/40">{toPersianDigits(ev.time)}</span>
                        <button onClick={() => handleDeleteScheduleItemWrap(ev.id)} className="text-red-700 opacity-60 hover:opacity-100 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B. Financial Transactions */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#9B6B61] font-black block border-b border-[#E6DFD3]/40 pb-1">💰 تراکنش‌های مالی روز منتخب:</span>
            {selectedDayTransactions.length === 0 ? (
              <span className="text-[10px] text-[#8D7F72] block">تراکنشی ثبت نشده است.</span>
            ) : (
              <div className="space-y-1.5">
                {selectedDayTransactions.map(tx => (
                  <div
                    key={tx.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tx.id, 'finance')}
                    className="p-2.5 bg-white border border-[#E6DFD3] rounded-xl text-xs flex justify-between items-center transition-all"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Move className="w-3.5 h-3.5 opacity-40 shrink-0 cursor-grab" />
                      <span className="font-extrabold text-[#2D3025] truncate">{tx.description}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`font-mono font-black ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('fa-IR')}
                      </span>
                      <button onClick={() => onDeleteTransaction(tx.id)} className="text-red-700 opacity-60 hover:opacity-100 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* C. Tasks */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#5A5A40] font-black block border-b border-[#E6DFD3]/40 pb-1">📋 مهلت کارهای روز منتخب:</span>
            {selectedDayTasks.length === 0 ? (
              <span className="text-[10px] text-[#8D7F72] block">کاری برای امروز تعریف نشده است.</span>
            ) : (
              <div className="space-y-1.5">
                {selectedDayTasks.map(tk => (
                  <div
                    key={tk.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tk.id, 'task')}
                    className="p-2.5 bg-white border border-[#EBE3C8] rounded-xl text-xs flex justify-between items-center transition-all"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Move className="w-3.5 h-3.5 opacity-40 shrink-0 cursor-grab" />
                      <button
                        onClick={() => handleToggleTaskWrap(tk.id)}
                        className={`w-4 h-4 rounded border-2 shrink-0 ${
                          tk.completed ? 'bg-[#7C8363] border-[#7C8363]' : 'border-[#9B6B61]'
                        }`}
                      >
                        {tk.completed && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <span className={`font-extrabold truncate ${tk.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>{tk.title}</span>
                    </div>
                    {onDeleteTask && (
                      <button onClick={() => handleDeleteTaskWrap(tk.id)} className="text-red-700 opacity-60 hover:opacity-100 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 3. DETAIL MODAL */}
      <AnimatePresence>
        {selectedItemDetail && detailLiveItem && detailType && (() => {
          const type = detailType;
          const liveItem = detailLiveItem;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedItemDetail(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-3xl max-w-md w-full p-6 shadow-xl text-right relative space-y-5"
              >
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="absolute top-4 left-4 p-2 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#F9F6EE] rounded-xl cursor-pointer transition-all"
                  title="بستن"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>

                <div className="flex items-center gap-3 border-b border-[#E6DFD3]/40 pb-3">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${
                    type === 'event' ? 'bg-[#E8ECE0] text-[#7C8363]' :
                    type === 'task' ? 'bg-[#F9F1D8] text-[#9B6B61]' :
                    type === 'finance' ? 'bg-rose-50 text-[#9B6B61]' :
                    type === 'habit' ? 'bg-emerald-50 text-emerald-600' :
                    type === 'meal' ? 'bg-emerald-50 text-emerald-600' :
                    type === 'workout' ? 'bg-sky-50 text-sky-600' :
                    'bg-indigo-50 text-indigo-600'
                  }`}>
                    {type === 'event' && <CalendarIcon className="w-5 h-5" />}
                    {type === 'task' && <CheckSquare className="w-5 h-5" />}
                    {type === 'finance' && <DollarSign className="w-5 h-5" />}
                    {type === 'habit' && <Flame className="w-5 h-5" />}
                    {type === 'meal' && <Clock className="w-5 h-5" />}
                    {type === 'workout' && <Flame className="w-5 h-5" />}
                    {type === 'sleep' && <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8D7F72] font-black block">جزییات کارت تقویم</span>
                    <h4 className="text-xs font-black text-[#2D3025]">
                      {type === 'event' ? liveItem.title :
                       type === 'task' ? liveItem.title :
                       type === 'finance' ? liveItem.description :
                       type === 'habit' ? liveItem.habit.name :
                       type === 'meal' ? `ثبت تغذیه: ${liveItem.foods ? liveItem.foods.slice(0, 20) : ''}...` :
                       type === 'workout' ? (liveItem.type === 'cardio' ? 'تمرین هوازی' : 'تمرین بدنسازی') :
                       'ثبت خواب روزانه'}
                    </h4>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  {type === 'event' && (
                    <>
                      {liveItem.isOccasion ? (
                        <>
                          <div className="p-3 bg-[#FDFBF7] rounded-xl text-[#2D3025] space-y-1 border border-[#E6DFD3]">
                            <div className="font-bold text-[#2D3025] flex items-center gap-1">
                              <span>🎈</span>
                              <span>مناسبت خاص</span>
                            </div>
                            <p className="text-xs text-[#8D7F72]">نوع مناسبت: {
                              liveItem.originalOccasion?.type === 'birthday' ? 'تولد 🎂' :
                              liveItem.originalOccasion?.type === 'anniversary' ? 'سالگرد 💖' :
                              liveItem.originalOccasion?.type === 'deadline' ? 'ضرب‌الاجل ⏰' :
                              liveItem.originalOccasion?.type === 'reminder' ? 'یادآوری 🔔' : 'بیمه / رویداد خاص 🛡️'
                            }</p>
                            {liveItem.originalOccasion?.person && <p className="text-xs text-[#8D7F72]">شخص مرتبط: {liveItem.originalOccasion.person}</p>}
                            <p className="text-xs text-[#8D7F72]">تکرار: {
                              liveItem.originalOccasion?.recurrenceType === 'yearly' ? 'سالانه (هر سال)' :
                              liveItem.originalOccasion?.recurrenceType === 'monthly' ? 'ماهانه' : 'یک‌باره'
                            }</p>
                          </div>
                          {liveItem.desc && <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025]">{liveItem.desc}</div>}
                        </>
                      ) : (
                        <>
                          {liveItem.desc && <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025]">{liveItem.desc}</div>}
                          <div className="flex justify-between text-[#8D7F72]">
                            <span>ساعت شروع:</span>
                            <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.time)}</span>
                          </div>
                          {liveItem.reminderType && liveItem.reminderType !== 'none' && (
                            <div className="flex justify-between text-[#8D7F72]">
                              <span>یادآور فعال:</span>
                              <span className="font-bold text-[#9B6B61]">
                                {liveItem.reminderType === '1day' ? '۱ روز قبل' :
                                 liveItem.reminderType === '2day' ? '۲ روز قبل' :
                                 liveItem.reminderType === '3day' ? '۳ روز قبل' : 'یادآور مستمر سفارشی'}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>تاریخ:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.date)}</span>
                      </div>
                      {liveItem.endDate && (
                        <div className="flex justify-between text-[#8D7F72]">
                          <span>تاریخ پایان:</span>
                          <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.endDate)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {type === 'task' && (
                    <>
                      {liveItem.description && <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025]">{liveItem.description}</div>}
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>وضعیت:</span>
                        <span className={`font-bold ${liveItem.completed ? 'text-emerald-700' : 'text-[#5A5A40]'}`}>
                          {liveItem.completed ? 'کامل شده' : 'در انتظار انجام'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>سررسید (دلاین):</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.dueDate)}</span>
                      </div>
                    </>
                  )}

                  {type === 'finance' && (
                    <>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>نوع تراکنش:</span>
                        <span className={`font-bold ${liveItem.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {liveItem.type === 'income' ? 'درآمد / واریزی' : 'هزینه / برداشت'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>مبلغ:</span>
                        <span className="font-mono font-black text-[#2D3025]">{formatCurrency(liveItem.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>دسته‌بندی:</span>
                        <span className="font-bold text-[#2D3025]">
                          {TRANSACTION_CATEGORIES.find(c => c.id === liveItem.category)?.label || liveItem.category}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>تاریخ تراکنش:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.date)}</span>
                      </div>
                    </>
                  )}

                  {type === 'habit' && (
                    <>
                      <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025]">{liveItem.habit.description}</div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>روز پیگیری:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.date)}</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>تعداد روز زنجیره پیاپی:</span>
                        <span className="font-bold text-emerald-700">{toPersianDigits(liveItem.habit.streak)} روز پیوسته</span>
                      </div>
                    </>
                  )}

                  {type === 'meal' && (
                    <>
                      <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025] font-bold">🍽️ {liveItem.foods}</div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>وعده غذایی:</span>
                        <span className="font-bold text-[#2D3025]">
                          {liveItem.type === 'breakfast' ? 'صبحانه' : liveItem.type === 'lunch' ? 'ناهار' : liveItem.type === 'dinner' ? 'شام' : 'میان‌وعده'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>کالری:</span>
                        <span className="font-mono font-bold text-emerald-700">{toPersianDigits(liveItem.calories)} kcal</span>
                      </div>
                      {(liveItem.protein || liveItem.carbs || liveItem.fat) && (
                        <div className="p-3 bg-emerald-50/50 rounded-xl grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div>
                            <span className="block text-[#8D7F72]">پروتئین</span>
                            <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.protein || 0)}g</span>
                          </div>
                          <div>
                            <span className="block text-[#8D7F72]">کربوهیدرات</span>
                            <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.carbs || 0)}g</span>
                          </div>
                          <div>
                            <span className="block text-[#8D7F72]">چربی</span>
                            <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.fat || 0)}g</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>ساعت مصرف:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.time)}</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>تاریخ:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.date)}</span>
                      </div>
                    </>
                  )}

                  {type === 'workout' && (
                    <>
                      <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025] space-y-2">
                        {liveItem.type === 'cardio' ? (
                          <div>
                            <div className="font-bold text-[#2D3025] mb-1">🏃 تمرین هوازی: {liveItem.cardioType === 'running' ? 'دویدن' : liveItem.cardioType === 'cycling' ? 'دوچرخه‌سواری' : liveItem.cardioType === 'swimming' ? 'شنا' : 'پیاده‌روی'}</div>
                            {liveItem.distanceKm && <div className="text-xs">مسافت: <span className="font-mono font-bold">{toPersianDigits(liveItem.distanceKm)}</span> کیلومتر</div>}
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-[#2D3025] mb-2">🏋️ تمرین قدرتی بدنسازی</div>
                            <div className="space-y-1">
                              {liveItem.gymSets?.map((set: any, idx: number) => (
                                <div key={idx} className="text-[10px] flex justify-between items-center bg-white p-1 rounded-lg border border-[#E6DFD3]">
                                  <span className="font-bold text-[#2D3025]">{set.exerciseName}</span>
                                  <span className="font-mono text-[#8D7F72]">
                                    {toPersianDigits(set.weight)}kg × {toPersianDigits(set.reps)} ({toPersianDigits(set.sets)} ست)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {liveItem.notes && <p className="text-[10px] text-[#8D7F72] italic pt-1 border-t border-[#D6CFC3] mt-1">یادداشت: {liveItem.notes}</p>}
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>مدت زمان تمرین:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.durationMinutes)} دقیقه</span>
                      </div>
                      {liveItem.caloriesBurned && (
                        <div className="flex justify-between text-[#8D7F72]">
                          <span>کالری تخمینی سوخته‌شده:</span>
                          <span className="font-mono font-bold text-orange-600">{toPersianDigits(liveItem.caloriesBurned)} kcal</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>تاریخ انجام:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.date)}</span>
                      </div>
                    </>
                  )}

                  {type === 'sleep' && (
                    <>
                      <div className="p-3 bg-[#F9F6EE] rounded-xl text-[#2D3025]">
                        <div className="font-bold text-[#2D3025] mb-1">💤 خواب ثبت‌شده روزانه</div>
                        {liveItem.notes && <p className="text-[10px] text-[#8D7F72] italic">یادداشت: {liveItem.notes}</p>}
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>مدت زمان کل خواب:</span>
                        <span className="font-mono font-black text-indigo-700">{toPersianDigits(liveItem.duration)} ساعت</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>ساعت خوابیدن:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.sleepTime)}</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>ساعت بیداری:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.wakeTime)}</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>کیفیت خواب:</span>
                        <span className="font-bold text-indigo-600">{toPersianDigits(liveItem.quality)} از ۱۰</span>
                      </div>
                      <div className="flex justify-between text-[#8D7F72]">
                        <span>تاریخ:</span>
                        <span className="font-mono font-bold text-[#2D3025]">{toPersianDigits(liveItem.date)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E6DFD3]/40 flex justify-between items-center">
                  {/* Delete button based on type */}
                  {(() => {
                    if (liveItem && liveItem.isOccasion) {
                      return onDeleteOccasion ? (
                        <button
                          onClick={() => {
                            onDeleteOccasion(liveItem.id);
                            setSelectedItemDetail(null);
                          }}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف مناسبت</span>
                        </button>
                      ) : null;
                    }
                    if (type === 'event') {
                      return (
                        <button
                          onClick={() => {
                            handleDeleteScheduleItemWrap(liveItem.id);
                            setSelectedItemDetail(null);
                          }}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف رویداد</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                  <button
                    onClick={() => setSelectedItemDetail(null)}
                    className="px-4 py-2 bg-[#2D3025] hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    بستن جزییات
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* === ADD NEW CUSTOM CALENDAR MODAL === */}
      <AnimatePresence>
        {showAddCalendarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#FDFBF7] p-6 rounded-3xl border border-[#E6DFD3] shadow-xl w-full max-w-sm text-right space-y-4"
            >
              <h3 className="text-xs md:text-sm font-black text-[#2D3025]">ساخت تقویم اختصاصی جدید</h3>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#8D7F72]">نام تقویم جدید (مثال: کاری، شخصی، خانواده)</label>
                <input
                  type="text"
                  placeholder="ورزش و سلامتی..."
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#8D7F72] block">رنگ اختصاصی تقویم:</span>
                <div className="flex gap-2.5">
                  {[
                    { id: 'purple', bg: 'bg-[#9B6B61]' },
                    { id: 'green', bg: 'bg-[#7C8363]' },
                    { id: 'blue', bg: 'bg-[#3D3D3D]' },
                    { id: 'orange', bg: 'bg-[#9B6B61]' },
                    { id: 'pink', bg: 'bg-[#D6CFC3]' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNewCalendarColor(item.id as any)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        newCalendarColor === item.id ? 'ring-2 ring-black scale-110' : ''
                      } ${item.bg}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAddCalendarSubmit}
                  className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  ایجاد تقویم
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCalendarModal(false)}
                  className="px-4 py-2.5 bg-[#E6DFD3]/40 hover:bg-[#E6DFD3]/60 text-[#8D7F72] text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CALENDAR SETTINGS MODAL */}
      <AnimatePresence>
        {showCalendarSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
            onClick={() => setShowCalendarSettingsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-3xl max-w-lg w-full p-6 shadow-xl text-right relative space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => setShowCalendarSettingsModal(false)}
                className="absolute top-4 left-4 p-2 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#F9F6EE] rounded-xl cursor-pointer transition-all"
                title="بستن"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>

              <div className="flex items-center gap-3 border-b border-[#E6DFD3]/40 pb-4">
                <div className="p-3 bg-[#E8ECE0] text-[#7C8363] rounded-2xl">
                  <Settings className="w-6 h-6 text-[#7C8363]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2D3025]">تنظیمات پیشرفته تقویم</h3>
                  <p className="text-[10px] text-[#8D7F72] font-semibold mt-0.5">مدیریت همگام‌سازی گوگل، تقویم‌ها و یادآورهای دسکتاپ</p>
                </div>
              </div>

              {/* 1. Google Sync block */}
              <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E6DFD3]">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5 pb-2 border-b border-[#E6DFD3]/50">
                  <CalendarDays className="w-4 h-4 text-[#7C8363]" />
                  <span>همگام‌سازی تقویم و کارهای گوگل</span>
                </h4>

                {!googleUser ? (
                  <div className="space-y-3">
                    <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                      برای فعال‌سازی همگام‌سازی زنده دوطرفه رویدادها و کارها با حساب گوگل خود، بر روی ورود به حساب گوگل کلیک کنید.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="w-full py-2.5 bg-white hover:bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl text-xs font-bold text-[#2D3025] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.48-1.11 2.74-2.36 3.59v2.98h3.8c2.22-2.05 3.5-5.07 3.5-8.62z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.8-2.98c-1.06.7-2.42 1.12-4.13 1.12-3.18 0-5.87-2.15-6.83-5.04H1.21v3.08C3.18 21.88 7.31 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.17 14.19c-.24-.7-.38-1.46-.38-2.24s.14-1.54.38-2.24V6.63H1.21C.4 8.24 0 10.06 0 12s.4 3.76 1.21 5.37l3.96-3.18z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.93 1.19 15.22 0 12 0 7.31 0 3.18 2.12 1.21 5.37l3.96 3.18c.96-2.89 3.65-5.04 6.83-5.04z"/>
                      </svg>
                      <span>ورود با حساب گوگل</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#E6DFD3] text-xs">
                      <div className="text-right">
                        <span className="block text-[10px] text-[#8D7F72]">حساب فعال متصل شده:</span>
                        <span className="font-bold text-[#2D3025]">{googleUser.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleSignOut}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline font-bold transition-colors cursor-pointer"
                      >
                        خروج از حساب
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={syncGoogleCalendar}
                        disabled={syncing}
                        className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{syncing ? 'در حال همگام‌سازی زنده...' : 'همگام‌سازی زنده همین حالا'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {googleError && (
                  <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-xl border border-red-200 mt-2">{googleError}</p>
                )}
              </div>

              {/* 2. Desktop alerts and chime settings */}
              <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E6DFD3]">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5 pb-2 border-b border-[#E6DFD3]/50">
                  <Bell className="w-4 h-4 text-[#7C8363]" />
                  <span>یادآورهای دسکتاپ و صوتی</span>
                </h4>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8D7F72] font-semibold">نوتیفیکیشن‌های سیستم جهت یادآوری رویدادهای امروز:</span>
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                      notificationPermission === 'granted'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'
                    }`}
                  >
                    {notificationPermission === 'granted' ? 'فعال شده است 🟢' : 'فعال‌سازی یادآور دسکتاپ'}
                  </button>
                </div>
              </div>

              {/* 3. Multi-calendar management */}
              <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E6DFD3]">
                <div className="flex justify-between items-center pb-2 border-b border-[#E6DFD3]/50">
                  <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-[#7C8363]" />
                    <span>تقویم‌های من (تغییر نمایش)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCalendarModal(true);
                    }}
                    className="text-[10px] bg-[#E8ECE0] text-[#7C8363] hover:bg-[#7C8363] hover:text-white px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer"
                  >
                    + تقویم جدید
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {calendars.map(cal => (
                    <label
                      key={cal.id}
                      className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-white border border-[#E6DFD3]/60 hover:bg-[#EBE3C8]/10 transition-all select-none"
                    >
                      <input
                        type="checkbox"
                        checked={cal.active}
                        onChange={() => {
                          setCalendars(prev =>
                            prev.map(c => c.id === cal.id ? { ...c, active: !c.active } : c)
                          );
                        }}
                        className="w-4 h-4 rounded-sm border-[#D6CFC3] accent-[#7C8363]"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          cal.color === 'purple' ? 'bg-[#9B6B61]' :
                          cal.color === 'green' ? 'bg-[#7C8363]' :
                          cal.color === 'blue' ? 'bg-[#3D3D3D]' :
                          cal.color === 'orange' ? 'bg-[#9B6B61]' : 'bg-[#E6DFD3]'
                        }`} />
                        <span className="font-bold text-[#3D3D3D]">{cal.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E6DFD3]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCalendarSettingsModal(false)}
                  className="px-6 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  تایید و بازگشت
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. WEEKLY QUICK ADD HUB MODAL */}
      <AnimatePresence>
        {quickAddModal && (() => {
          const mInfo = JALALI_MONTHS[quickAddModal.monthIndex];
          const dateStr = getDateString(quickAddModal.day, quickAddModal.monthIndex);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
              onClick={() => {
                setQuickAddModal(null);
                setQuickAddType(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-3xl max-w-md w-full p-6 shadow-xl text-right relative space-y-5"
              >
                <button
                  onClick={() => {
                    setQuickAddModal(null);
                    setQuickAddType(null);
                  }}
                  className="absolute top-4 left-4 p-2 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#F9F6EE] rounded-xl cursor-pointer transition-all"
                  title="بستن"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>

                <div className="flex items-center gap-3 border-b border-[#E6DFD3]/40 pb-3">
                  <div className="p-2.5 bg-[#F9F1D8] text-[#9B6B61] rounded-2xl">
                    <PlusCircle className="w-6 h-6 text-[#7C8363]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#2D3025]">ثبت آیتم جدید تقویم</h3>
                    <p className="text-[10px] text-[#8D7F72] font-semibold mt-0.5">
                      تاریخ: {toPersianDigits(quickAddModal.day)} {mInfo.name} در ساعت {toPersianDigits(quickAddModal.hourStr)}
                    </p>
                  </div>
                </div>

                {!quickAddType ? (
                  <div className="space-y-3">
                    <span className="text-[10px] text-[#8D7F72] font-bold block mb-1">چه نوع آیتمی می‌خواهید ثبت کنید؟</span>
                    
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => {
                          setEventTime(quickAddModal.hourStr);
                          setIsOccasionType(false);
                          setShowAddEventForm(true);
                          setQuickAddModal(null);
                        }}
                        className="w-full p-3 bg-white hover:bg-[#E8ECE0] text-[#2D3025] border border-[#E6DFD3] rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                      >
                        <span className="text-[#8D7F72] text-[10px]">برنامه‌ها، تسک‌های زمان‌دار و جلسات</span>
                        <span className="flex items-center gap-2 font-black text-[#2D3025]">
                          <span>📅 رویداد یا جلسه جدید</span>
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setEventTime(quickAddModal.hourStr);
                          setIsOccasionType(true);
                          setShowAddEventForm(true);
                          setQuickAddModal(null);
                        }}
                        className="w-full p-3 bg-white hover:bg-[#FAF1D8] text-[#2D3025] border border-[#E6DFD3] rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                      >
                        <span className="text-[#8D7F72] text-[10px]">تولد، سالگرد، ددلاین یا رویداد خاص</span>
                        <span className="flex items-center gap-2 font-black text-[#2D3025]">
                          <span>🎈 مناسبت خاص یا ضرب‌الاجل</span>
                        </span>
                      </button>

                      <button
                        onClick={() => setQuickAddType('task')}
                        className="w-full p-3 bg-white hover:bg-[#FAF8F5] text-[#2D3025] border border-[#E6DFD3] rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                      >
                        <span className="text-[#8D7F72] text-[10px]">چک‌لیست کارهایی که باید انجام شوند</span>
                        <span className="flex items-center gap-2 font-black text-[#2D3025]">
                          <span>📋 کار جدید (Task)</span>
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddFinanceForm(true);
                          setQuickAddModal(null);
                        }}
                        className="w-full p-3 bg-white hover:bg-rose-50/50 text-[#2D3025] border border-[#E6DFD3] rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                      >
                        <span className="text-[#8D7F72] text-[10px]">ثبت هزینه‌ها یا درآمدهای امروز</span>
                        <span className="flex items-center gap-2 font-black text-[#2D3025]">
                          <span>💰 تراکنش مالی جدید</span>
                        </span>
                      </button>

                      <button
                        onClick={() => setQuickAddType('habit')}
                        className="w-full p-3 bg-white hover:bg-emerald-50/50 text-[#2D3025] border border-[#E6DFD3] rounded-2xl flex items-center justify-between text-xs font-black transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                      >
                        <span className="text-[#8D7F72] text-[10px]">تیک زدن و پیگیری عادت‌های امروز</span>
                        <span className="flex items-center gap-2 font-black text-[#2D3025]">
                          <span>🌱 تحقق عادت روزانه</span>
                        </span>
                      </button>
                    </div>
                  </div>
                ) : quickAddType === 'task' ? (
                  <div className="space-y-4 text-right">
                    <span className="text-[10px] font-black text-[#5A5A40] block">ثبت کار جدید (Task) برای تاریخ {toPersianDigits(dateStr)}</span>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#8D7F72] block mb-1">عنوان کار</label>
                        <input
                          type="text"
                          placeholder="مثلا: ارسال گزارش ماهانه یا خرید دارو..."
                          value={quickTaskTitle}
                          onChange={(e) => setQuickTaskTitle(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#E6DFD3] rounded-xl text-right font-semibold focus:ring-1 focus:ring-[#9B6B61]"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#8D7F72] block mb-1">توضیحات (اختیاری)</label>
                        <textarea
                          placeholder="یادداشت کوتاهی درباره این کار..."
                          value={quickTaskDesc}
                          onChange={(e) => setQuickTaskDesc(e.target.value)}
                          className="w-full p-2.5 text-xs bg-white border border-[#E6DFD3] rounded-xl text-right h-20 resize-none focus:ring-1 focus:ring-[#9B6B61]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (!quickTaskTitle.trim()) return;
                          if (onAddTask) {
                            onAddTask({
                              id: `tk-quick-${Date.now()}`,
                              title: quickTaskTitle.trim(),
                              completed: false,
                              createdAt: todayDate,
                              description: quickTaskDesc.trim() || undefined,
                              dueDate: dateStr
                            });
                            addToast('کار جدید ثبت شد 📋', `کار "${quickTaskTitle}" برای تاریخ ${toPersianDigits(dateStr)} ایجاد شد.`);
                          }
                          setQuickTaskTitle('');
                          setQuickTaskDesc('');
                          setQuickAddModal(null);
                          setQuickAddType(null);
                        }}
                        disabled={!quickTaskTitle.trim()}
                        className="flex-1 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] disabled:bg-[#D6CFC3] disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                      >
                        ایجاد و ثبت کار
                      </button>
                      <button
                        onClick={() => {
                          setQuickAddType(null);
                          setQuickTaskTitle('');
                          setQuickTaskDesc('');
                        }}
                        className="px-4 py-2.5 bg-[#E6DFD3]/40 hover:bg-[#E6DFD3]/60 text-[#2D3025] rounded-xl text-xs font-black transition-all cursor-pointer"
                      >
                        بازگشت
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-right">
                    <span className="text-[10px] font-black text-emerald-700 block">تیک زدن تحقق عادت برای تاریخ {toPersianDigits(dateStr)}</span>
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {habits.length === 0 ? (
                        <p className="text-xs text-[#8D7F72] text-center py-4">هیچ عادتی تعریف نشده است. ابتدا یک عادت در پنل مربوطه ایجاد نمایید.</p>
                      ) : (
                        habits.map(habit => {
                          const isLogged = habit.logs?.includes(dateStr);
                          return (
                            <button
                              key={habit.id}
                              onClick={() => {
                                onToggleHabitLog(habit.id, dateStr);
                                addToast(
                                  isLogged ? 'لغو ثبت عادت 🌱' : 'عادت با موفقیت ثبت شد 🎉',
                                  `وضعیت عادت "${habit.name}" تغییر یافت.`
                                );
                                setQuickAddModal(null);
                                setQuickAddType(null);
                              }}
                              className={`w-full p-3 rounded-2xl border text-xs font-black flex justify-between items-center transition-all cursor-pointer ${
                                isLogged
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs'
                                  : 'bg-white border-[#E6DFD3]/80 text-[#2D3025] hover:bg-emerald-50/20'
                              }`}
                            >
                              <span className="font-mono text-[10px]">
                                {isLogged ? '✅ ثبت موفق' : '⚪ بدون ثبت'}
                              </span>
                              <span className="font-bold">{habit.name}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setQuickAddType(null)}
                        className="w-full py-2.5 bg-[#E6DFD3]/40 hover:bg-[#E6DFD3]/60 text-[#2D3025] rounded-xl text-xs font-black transition-all cursor-pointer"
                      >
                        بازگشت
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* === APP TOAST NOTIFICATIONS HUD === */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {appToasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.9 }}
              className="bg-[#2D3025] text-[#FDFBF7] p-3.5 rounded-2xl shadow-lg border border-white/10 flex items-center gap-3 pointer-events-auto cursor-pointer"
              onClick={() => {
                setAppToasts(prev => prev.filter(item => item.id !== t.id));
              }}
            >
              <Bell className="w-4 h-4 text-[#C1B299] shrink-0" />
              <div className="text-right">
                <p className="text-[10px] font-black leading-tight text-white">{t.title}</p>
                <p className="text-[9px] text-[#C1B299] leading-tight mt-0.5">{t.desc}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
