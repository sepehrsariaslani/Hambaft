import React, { useState, useEffect } from 'react';
import { Goal, Project, Task, GoalCategory, BankAccount, Transaction, Milestone } from '../types';
import EntityNoteEditor from '../../notes/components/EntityNoteEditor';
import { 
  ArrowRight, 
  FolderKanban, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Square, 
  CheckSquare, 
  Calendar as LucideCalendar, 
  Tag, 
  FileText, 
  ChevronRight, 
  Sparkles,
  AlertCircle,
  Search,
  BookOpen,
  Play,
  Pause,
  Coins,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ChevronLeft,
  X,
  Flag,
  CalendarDays,
  Activity,
  Layers,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PersianDatePicker from './PersianDatePicker';
import ProjectTaskTreeView from './ProjectTaskTreeView';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';

const TX_CATEGORIES: Record<string, { label: string; color: string }> = {
  salary: { label: 'حقوق و دستمزد', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
  gift: { label: 'هدیه', color: 'text-pink-600 bg-pink-50' },
  subsidy: { label: 'یارانه/حمایتی', color: 'text-teal-600 bg-teal-50' },
  investment: { label: 'سود سرمایه‌گذاری', color: 'text-cyan-600 bg-cyan-50' },
  food: { label: 'خوراک و رستوران', color: 'text-amber-600 bg-amber-50' },
  rent: { label: 'مسکن و اجاره', color: 'text-indigo-600 bg-indigo-50' },
  transport: { label: 'حمل و نقل', color: 'text-blue-600 bg-blue-50' },
  health: { label: 'پزشکی و سلامت', color: 'text-red-600 bg-red-50' },
  shopping: { label: 'خرید کالا/خدمات', color: 'text-purple-600 bg-purple-50' },
  education: { label: 'آموزش و تحصیل', color: 'text-orange-600 bg-orange-50' },
  other: { label: 'سایر موارد', color: 'text-gray-600 bg-gray-50' }
};

const TASK_CATEGORIES = [
  { id: 'work', label: 'کاری', color: 'text-blue-600 bg-blue-50' },
  { id: 'personal', label: 'شخصی', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'health', label: 'سلامت', color: 'text-rose-600 bg-rose-50' },
  { id: 'finance', label: 'مالی', color: 'text-amber-600 bg-amber-50' },
  { id: 'learning', label: 'یادگیری', color: 'text-indigo-600 bg-indigo-50' },
  { id: 'other', label: 'سایر', color: 'text-gray-600 bg-gray-50' }
];

const PRIORITIES = [
  { id: 'low', label: 'پایین', color: 'bg-emerald-50 text-emerald-700' },
  { id: 'medium', label: 'متوسط', color: 'bg-amber-50 text-amber-700' },
  { id: 'high', label: 'فوری', color: 'bg-red-50 text-red-700 font-bold' }
];

const MONTHS_FA = [
  'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
  'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'
];

interface ProjectDetailViewProps {
  project: Project & { goalId: string; goalTitle: string; goalCategory: GoalCategory };
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleTaskTracking: (goalId: string, projectId: string, taskId: string) => void;
  onBack: () => void;
  onAddTaskToProject: (goalId: string, projectId: string, title: string) => void;
  onToggleTaskInProject: (goalId: string, projectId: string, taskId: string) => void;
  onDeleteTaskFromProject: (goalId: string, projectId: string, taskId: string) => void;
  onToggleProjectCompletion: (goalId: string, projectId: string) => void;
  onUpdateProjectDetails?: (goalId: string, projectId: string, updates: { title?: string; description?: string; notes?: string; milestones?: Milestone[]; tasks?: Task[] }) => void;
}

export default function ProjectDetailView({
  project,
  transactions,
  bankAccounts,
  onAddTransaction,
  onDeleteTransaction,
  onToggleTaskTracking,
  onBack,
  onAddTaskToProject,
  onToggleTaskInProject,
  onDeleteTaskFromProject,
  onToggleProjectCompletion,
  onUpdateProjectDetails
}: ProjectDetailViewProps) {
  // Views/Tabs State
  const [activeTab, setActiveTab] = useState<'tasks' | 'planning' | 'milestones' | 'report' | 'notes' | 'task-tree'>('tasks');
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Input states
  const [taskTitleInput, setTaskTitleInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(project.title);
  const [editedDesc, setEditedDesc] = useState(project.description || '');
  const [projectNotes, setProjectNotes] = useState(project.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // New Milestone Form
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');

  // Financial form
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('other');
  const [txDesc, setTxDesc] = useState('');
  const [txBankAccountId, setTxBankAccountId] = useState('');
  const [txDate, setTxDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Ticker for running timer UI updates
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const hasActive = (project.tasks || []).some(t => t.isTracking);
    if (hasActive) {
      const interval = setInterval(() => setTicker(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [project.tasks]);

  const tasksList = project.tasks || [];
  const completedTasks = tasksList.filter(t => t.completed).length;
  const totalTasks = tasksList.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = tasksList.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Time utilities
  const getTaskSeconds = (task: Task) => {
    let total = task.totalTimeSpent || 0;
    if (task.isTracking && task.trackingStartTime) {
      total += Math.floor((Date.now() - task.trackingStartTime) / 1000);
    }
    return total;
  };

  const formatSeconds = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalProjectSeconds = tasksList.reduce((sum, t) => sum + getTaskSeconds(t), 0);
  const totalProjectHours = totalProjectSeconds / 3600;

  // Financials
  const projectTransactions = transactions.filter(t => t.projectId === project.id);
  const totalIncome = projectTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = projectTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const hourlyRate = totalProjectHours > 0 ? Math.round(totalIncome / totalProjectHours) : 0;

  // State update handlers
  const saveTasksList = (updated: Task[]) => {
    if (onUpdateProjectDetails) {
      onUpdateProjectDetails(project.goalId, project.id, { tasks: updated });
    }
  };

  const saveMilestonesList = (updated: Milestone[]) => {
    if (onUpdateProjectDetails) {
      onUpdateProjectDetails(project.goalId, project.id, { milestones: updated });
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitleInput.trim()) return;
    onAddTaskToProject(project.goalId, project.id, taskTitleInput.trim());
    setTaskTitleInput('');
  };

  const handleSaveChanges = () => {
    if (onUpdateProjectDetails && editedTitle.trim()) {
      onUpdateProjectDetails(project.goalId, project.id, {
        title: editedTitle.trim(),
        description: editedDesc.trim(),
        notes: projectNotes
      });
      setIsEditing(false);
    }
  };

  const handleSaveNotesOnly = () => {
    if (onUpdateProjectDetails) {
      setIsSavingNotes(true);
      onUpdateProjectDetails(project.goalId, project.id, { notes: projectNotes });
      setTimeout(() => setIsSavingNotes(false), 600);
    }
  };

  const handleAddProjectTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmount.replace(/,/g, ''));
    if (!amt || isNaN(amt)) return;
    onAddTransaction({
      type: txType,
      amount: amt,
      category: txCategory,
      description: txDesc.trim() || `تراکنش پروژه: ${project.title}`,
      date: txDate,
      bankAccountId: txBankAccountId || undefined,
      projectId: project.id
    });
    setTxAmount('');
    setTxDesc('');
  };

  // Milestone actions
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim()) return;
    const newM: Milestone = {
      id: `mstone-${Date.now()}`,
      title: milestoneTitle.trim(),
      completed: false,
      dueDate: milestoneDate || undefined
    } as any;
    const updated = [...(project.milestones || []), newM];
    saveMilestonesList(updated);
    setMilestoneTitle('');
    setMilestoneDate('');
  };

  const handleToggleMilestone = (mId: string) => {
    const updated = (project.milestones || []).map(m => 
      m.id === mId ? { ...m, completed: !m.completed } : m
    );
    saveMilestonesList(updated);
  };

  const handleDeleteMilestone = (mId: string) => {
    const updatedM = (project.milestones || []).filter(m => m.id !== mId);
    const updatedT = tasksList.map(t => t.milestoneId === mId ? { ...t, milestoneId: undefined } : t);
    if (onUpdateProjectDetails) {
      onUpdateProjectDetails(project.goalId, project.id, { milestones: updatedM, tasks: updatedT });
    }
  };

  // Calendar Day Generator
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 1) % 7; // Shift so Saturday is 0
    const cells = [];

    // Empty cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ active: false, day: 0, dateStr: '' });
    }
    // Days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ active: true, day: d, dateStr });
    }
    return cells;
  };

  const getJalaliDayLabel = (dateStr: string) => {
    try {
      const d = new DateObject({ date: dateStr, calendar: gregorian, locale: gregorian_en });
      const j = d.convert(persian, persian_fa);
      return j.day;
    } catch {
      return '';
    }
  };

  const getJalaliMonthYearLabel = () => {
    try {
      const d = new DateObject({ date: calendarDate, calendar: gregorian, locale: gregorian_en });
      const j = d.convert(persian, persian_fa);
      return `${j.month.name} ${j.year}`;
    } catch {
      return '';
    }
  };

  const handleCalendarCellClick = (dateStr: string) => {
    if (schedulingTaskId) {
      const updated = tasksList.map(t => t.id === schedulingTaskId ? { ...t, dueDate: dateStr } : t);
      saveTasksList(updated);
      setSchedulingTaskId(null);
    } else {
      // Prompt to create a new task directly on this day
      const title = prompt('عنوان کار جدید برای این روز را وارد کنید:');
      if (title && title.trim()) {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: title.trim(),
          completed: false,
          createdAt: new Date().toISOString().split('T')[0],
          dueDate: dateStr
        };
        saveTasksList([...tasksList, newTask]);
      }
    }
  };

  // Task Details update handler
  const handleUpdateSingleTask = (updatedTask: Task) => {
    const updated = tasksList.map(t => t.id === updatedTask.id ? updatedTask : t);
    saveTasksList(updated);
    if (selectedTaskForDetails?.id === updatedTask.id) {
      setSelectedTaskForDetails(updatedTask);
    }
  };

  const handleDeleteSingleTask = (taskId: string) => {
    const updated = tasksList.filter(t => t.id !== taskId);
    saveTasksList(updated);
    setSelectedTaskForDetails(null);
  };

  return (
    <div className="space-y-6 text-right pb-10 relative" dir="rtl" id="project-detail-view-root">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-black text-[#7C8363] hover:text-[#5A5A40] transition-colors cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به پروژه‌ها</span>
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold text-[#8D7F72]">
          <span>مدیریت پروژه‌ها</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#3D3D3D] dark:text-[#E8ECE0]">{project.title}</span>
        </div>
      </div>

      {/* Main Project card */}
      <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/50 overflow-hidden shadow-xs">
        <div className="h-2 bg-gradient-to-l from-[#7C8363] to-[#E26645]" />
        
        <div className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-2 flex-1 w-full">
              {isEditing ? (
                <div className="space-y-3 bg-[#FDFBF7] dark:bg-[#121411] p-4 rounded-2xl border border-[#E6DFD3] w-full">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1C1D17] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0] font-black"
                  />
                  <textarea
                    value={editedDesc}
                    onChange={(e) => setEditedDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#1C1D17] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] h-16 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs border border-[#D6CFC3] rounded-lg">انصراف</button>
                    <button onClick={handleSaveChanges} className="px-4 py-1 bg-[#7C8363] text-white text-xs rounded-lg">ذخیره</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">{project.title}</h2>
                    <span className="text-[9px] font-bold text-[#8D7F72] bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3] px-2 py-0.5 rounded-md">عملیاتی</span>
                  </div>
                  <p className="text-[11px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                    {project.description || 'توضیحی برای این پروژه ثبت نشده است.'}
                  </p>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] font-bold">
                <span className="text-[#8D7F72] flex items-center gap-1 bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/40 px-2 py-0.5 rounded-lg">
                  <LucideCalendar className="w-3 h-3" />
                  <span>ایجاد: {project.createdAt}</span>
                </span>
                <span className="text-[#7C8363] bg-[#E8ECE0] dark:bg-[#1E241A] px-2 py-0.5 rounded-lg">
                  هدف: {project.goalTitle}
                </span>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => onToggleProjectCompletion(project.goalId, project.id)}
                className={`w-full md:w-auto px-4 py-2 text-xs font-black rounded-xl transition-all ${
                  project.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-[#7C8363] text-white'
                }`}
              >
                {project.completed ? '✓ تکمیل شده (بازنشانی)' : 'تکمیل کل پروژه'}
              </button>
              <button onClick={() => setIsEditing(true)} className="px-3 py-1 bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] text-[9px] font-bold text-[#3D3D3D] dark:text-[#E8ECE0] rounded-lg">
                ویرایش مشخصات
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/60 p-3 rounded-2xl">
              <div className="text-[9px] font-bold text-[#8D7F72]">کل زمان خالص</div>
              <div className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono mt-1">{formatSeconds(totalProjectSeconds)}</div>
            </div>
            <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/60 p-3 rounded-2xl">
              <div className="text-[9px] font-bold text-[#8D7F72]">کل درآمد</div>
              <div className="text-sm font-black text-emerald-600 font-mono mt-1">{totalIncome.toLocaleString()} <span className="text-[8px]">ریال</span></div>
            </div>
            <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/60 p-3 rounded-2xl">
              <div className="text-[9px] font-bold text-[#8D7F72]">کل هزینه‌ها</div>
              <div className="text-sm font-black text-red-600 font-mono mt-1">{totalExpenses.toLocaleString()} <span className="text-[8px]">ریال</span></div>
            </div>
            <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/60 p-3 rounded-2xl">
              <div className="text-[9px] font-bold text-[#8D7F72]">درآمد ساعتی</div>
              <div className="text-sm font-black text-indigo-600 font-mono mt-1">{hourlyRate.toLocaleString()} <span className="text-[8px]">ریال</span></div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-[#FDFBF7] dark:bg-[#121411] p-3 rounded-xl border border-[#E6DFD3]/60">
            <div className="flex justify-between text-[9px] font-extrabold mb-1">
              <span>میزان پیشرفت کارهای پروژه</span>
              <span>{progressPercent}% ({completedTasks} از {totalTasks})</span>
            </div>
            <div className="w-full bg-[#E6DFD3]/40 h-2 rounded-full overflow-hidden">
              <div className="bg-[#7C8363] h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* THREE VIEW SWITCHER (TABS) */}
      <div className="flex border-b border-[#E6DFD3] dark:border-[#3D4133]/60">
        <button
          onClick={() => { setActiveTab('tasks'); setSchedulingTaskId(null); }}
          className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
            activeTab === 'tasks' ? 'border-b-2 border-[#7C8363] text-[#7C8363]' : 'text-[#8D7F72]'
          }`}
        >
          <div className="flex items-center gap-1">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>لیست کارها و مالی</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('planning'); setSchedulingTaskId(null); }}
          className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
            activeTab === 'planning' ? 'border-b-2 border-[#7C8363] text-[#7C8363]' : 'text-[#8D7F72]'
          }`}
        >
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>برنامه‌ریزی و تقویم</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('milestones'); setSchedulingTaskId(null); }}
          className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
            activeTab === 'milestones' ? 'border-b-2 border-[#7C8363] text-[#7C8363]' : 'text-[#8D7F72]'
          }`}
        >
          <div className="flex items-center gap-1">
            <Flag className="w-3.5 h-3.5" />
            <span>مایلستون‌ها (نقاط عطف)</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('report'); setSchedulingTaskId(null); }}
          className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
            activeTab === 'report' ? 'border-b-2 border-[#7C8363] text-[#7C8363]' : 'text-[#8D7F72]'
          }`}
        >
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>گزارش زمان</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('notes'); setSchedulingTaskId(null); }}
          className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
            activeTab === 'notes' ? 'border-b-2 border-[#7C8363] text-[#7C8363]' : 'text-[#8D7F72]'
          }`}
        >
          <div className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>یادداشت‌ها (Notion)</span>
          </div>
        </button>

        <button
          onClick={() => { setActiveTab('task-tree'); setSchedulingTaskId(null); }}
          className={`px-4 py-2 text-xs font-black transition-all cursor-pointer ${
            activeTab === 'task-tree' ? 'border-b-2 border-[#7C8363] text-[#7C8363]' : 'text-[#8D7F72]'
          }`}
        >
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>نمای درختی</span>
          </div>
        </button>
      </div>

      {/* VIEW CONTENTS */}
      <div className="min-h-[400px]">
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Task list (Left) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 space-y-3 shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#E6DFD3]/40">
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-[#7C8363]" />
                    <span>کارهای ثبت شده ({totalTasks})</span>
                  </h3>

                  <div className="relative w-36">
                    <Search className="w-3 h-3 text-[#8D7F72] absolute right-2 top-1.5" />
                    <input
                      type="text"
                      placeholder="جستجو..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-7 pl-2 py-0.5 text-[9px] bg-[#FDFBF7] border border-[#D6CFC3] rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {/* Add Task */}
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="عنوان کار خرد جدید..."
                    value={taskTitleInput}
                    onChange={(e) => setTaskTitleInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none"
                    required
                  />
                  <button type="submit" className="px-4 py-1.5 bg-[#7C8363] text-white text-xs font-bold rounded-xl cursor-pointer">افزودن</button>
                </form>

                {/* Tasks List */}
                <div className="space-y-2">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((t) => {
                      const sec = getTaskSeconds(t);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3] rounded-xl hover:border-[#7C8363] transition-colors"
                        >
                          <div 
                            onClick={() => setSelectedTaskForDetails(t)}
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTaskInProject(project.goalId, project.id, t.id);
                              }}
                              className="text-[#8D7F72] hover:text-[#7C8363] shrink-0"
                            >
                              {t.completed ? <CheckSquare className="w-4 h-4 text-[#7C8363]" /> : <Square className="w-4 h-4" />}
                            </button>
                            
                            <div className="flex flex-col min-w-0 text-right">
                              <span className={`text-xs font-bold truncate ${t.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D] dark:text-[#E8ECE0]'}`}>
                                {t.title}
                              </span>
                              
                              <div className="flex items-center gap-2 mt-1">
                                {sec > 0 && <span className="text-[8px] font-mono bg-[#E8ECE0] text-[#7C8363] px-1.5 rounded">{formatSeconds(sec)}</span>}
                                {t.dueDate && <span className="text-[8px] text-[#9B6B61]">مهلت: {t.dueDate}</span>}
                                {t.priority && (
                                  <span className={`text-[8px] px-1.5 rounded ${
                                    t.priority === 'high' ? 'bg-red-50 text-red-600' : t.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600'
                                  }`}>
                                    {t.priority === 'high' ? 'فوری' : t.priority === 'medium' ? 'متوسط' : 'پایین'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => onToggleTaskTracking(project.goalId, project.id, t.id)}
                              className={`p-1.5 rounded-lg border cursor-pointer ${
                                t.isTracking ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white border-[#D6CFC3]'
                              }`}
                            >
                              {t.isTracking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-[#7C8363]" />}
                            </button>
                            <button
                              onClick={() => onDeleteTaskFromProject(project.goalId, project.id, t.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-center text-[#8D7F72] py-6">هیچ وظیفه‌ای با این مشخصات یافت نشد.</p>
                  )}
                </div>
              </div>

              {/* Financial Logger */}
              <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 pb-2 border-b border-[#E6DFD3]/40">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>ثبت مخارج و درآمدهای اختصاصی پروژه</span>
                </h3>

                <form onSubmit={handleAddProjectTx} className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-[#8D7F72] font-black">نوع تراکنش</label>
                      <div className="grid grid-cols-2 gap-1 bg-[#FDFBF7] p-0.5 border border-[#D6CFC3] rounded-xl mt-1">
                        <button type="button" onClick={() => setTxType('expense')} className={`py-1 text-[9px] font-black rounded-lg ${txType === 'expense' ? 'bg-red-500 text-white' : 'text-[#8D7F72]'}`}>هزینه</button>
                        <button type="button" onClick={() => setTxType('income')} className={`py-1 text-[9px] font-black rounded-lg ${txType === 'income' ? 'bg-emerald-500 text-white' : 'text-[#8D7F72]'}`}>درآمد</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8D7F72] font-black">مبلغ (ریال)</label>
                      <input
                        type="text" required placeholder="مثلا ۵,۰۰۰,۰۰۰" value={txAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/,/g, '');
                          if (!isNaN(Number(val))) setTxAmount(val ? Number(val).toLocaleString() : '');
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121411] border border-[#D6CFC3] rounded-xl mt-1 font-mono text-left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-[#8D7F72] font-black font-sans">توضیحات</label>
                      <input type="text" placeholder="بابت..." value={txDesc} onChange={e => setTxDesc(e.target.value)} className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121411] border border-[#D6CFC3] rounded-xl mt-1" />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#8D7F72] font-black">تاریخ</label>
                      <PersianDatePicker value={txDate} onChange={setTxDate} className="mt-1" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl mt-2">ثبت تراکنش مالی</button>
                </form>

                {/* Transactions history */}
                <div className="space-y-1 max-h-40 overflow-y-auto pt-2 border-t border-[#E6DFD3]/40">
                  {projectTransactions.length > 0 ? (
                    projectTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-2 bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/40 rounded-xl text-right">
                        <div>
                          <div className="text-xs font-bold text-[#3D3D3D] dark:text-[#E8ECE0]">{tx.description}</div>
                          <div className="text-[8px] text-[#8D7F72] font-mono mt-0.5">{tx.date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black font-mono ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                          </span>
                          <button onClick={() => onDeleteTransaction(tx.id)} className="p-1 text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[8px] text-[#8D7F72] italic text-center py-2">هیچ تراکنشی ثبت نشده است.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes & Coaching (Right) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 space-y-3 shadow-xs">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 pb-2 border-b border-[#E6DFD3]/40">
                  <BookOpen className="w-3.5 h-3.5 text-[#E26645]" />
                  <span>دفترچه یادداشت و طوفان فکری پروژه</span>
                </h3>
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="ایده‌ها، منابع، آدرس‌ها و یادداشت‌های مربوط به این پروژه..."
                  className="w-full px-3 py-2 text-xs bg-[#F9F6EE] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0] h-48 resize-none focus:outline-none"
                />
                <button
                  onClick={handleSaveNotesOnly}
                  className="w-full py-1.5 bg-[#7C8363] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  {isSavingNotes ? <Clock className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  <span>ذخیره یادداشت‌ها</span>
                </button>
              </div>

              <div className="bg-[#E8ECE0]/40 dark:bg-[#1F241A]/20 p-4 rounded-3xl border border-[#DDE2D5]/60">
                <div className="flex items-center gap-1.5 text-[#7C8363] font-black text-[10px] mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>پیشنهاد کوچینگ پروژه</span>
                </div>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                  سعی کنید کارها را به بسته‌های ۲۵ دقیقه‌ای تمرکز (پومودورو) بشکنید. ارتباط تنگاتنگ بین کارایی ذهنی و توازن در بخش اهداف بلندمدت با تکمیل گام‌به‌گام زیرکارها محقق می‌شود.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* PLANNING CALENDAR VIEW */}
        {activeTab === 'planning' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Calendar (Left - 8 columns) */}
            <div className="lg:col-span-8 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 space-y-4 shadow-xs">
              <div className="flex justify-between items-center pb-3 border-b border-[#E6DFD3]/40">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#7C8363]" />
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">تقویم برنامه‌ریزی پروژه</h3>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-[11px] font-black text-[#3D3D3D] dark:text-[#E8ECE0] min-w-28 text-center bg-[#FDFBF7] dark:bg-[#121411] px-3 py-1 rounded-xl border border-[#D6CFC3]">
                    {MONTHS_FA[calendarDate.getMonth()]} {calendarDate.getFullYear()} ({getJalaliMonthYearLabel()})
                  </span>
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {schedulingTaskId && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2.5 rounded-xl flex items-center justify-between">
                  <span>حالت برنامه‌ریزی فعال است. برای ثبت تاریخ انجام، روی یکی از روزهای تقویم زیر کلیک کنید.</span>
                  <button onClick={() => setSchedulingTaskId(null)} className="text-amber-900 font-bold bg-white px-2 py-0.5 rounded border">انصراف</button>
                </div>
              )}

              {/* Day headers starting Saturday */}
              <div className="grid grid-cols-7 gap-1 text-center font-black text-[9px] text-[#8D7F72] mb-1">
                <div>شنبه</div>
                <div>یکشنبه</div>
                <div>دوشنبه</div>
                <div>سه‌شنبه</div>
                <div>چهارشنبه</div>
                <div>پنجشنبه</div>
                <div className="text-[#E26645]">جمعه</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((cell, idx) => {
                  const hasDate = cell.active && cell.dateStr;
                  const dayTasks = hasDate ? tasksList.filter(t => t.dueDate === cell.dateStr) : [];
                  const jalaliDay = hasDate ? getJalaliDayLabel(cell.dateStr) : '';

                  return (
                    <div
                      key={idx}
                      onClick={() => cell.active && handleCalendarCellClick(cell.dateStr)}
                      className={`min-h-[70px] border rounded-xl p-1 text-right flex flex-col justify-between transition-all ${
                        cell.active 
                          ? 'bg-[#FDFBF7] dark:bg-[#121411] border-[#E6DFD3] hover:border-[#7C8363] cursor-pointer' 
                          : 'bg-gray-50/40 dark:bg-zinc-900/10 border-transparent opacity-30 select-none'
                      }`}
                    >
                      {cell.active && (
                        <div className="flex justify-between items-center text-[9px] font-black text-[#8D7F72]">
                          <span>{cell.day}</span>
                          <span className="text-[8px] text-gray-400 font-mono">{jalaliDay}</span>
                        </div>
                      )}

                      {/* Tasks lists on this day */}
                      <div className="space-y-0.5 mt-1 overflow-y-auto max-h-12">
                        {dayTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskForDetails(t);
                            }}
                            className={`text-[8px] p-1 rounded truncate leading-none font-bold select-none cursor-pointer ${
                              t.completed 
                                ? 'bg-gray-200/60 text-gray-500 line-through' 
                                : 'bg-[#E8ECE0] text-[#5A5A40] dark:bg-[#1F241A] dark:text-[#9ECE9A]'
                            }`}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unscheduled Tasks (Right - 4 columns) */}
            <div className="lg:col-span-4 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-4 space-y-3 shadow-xs">
              <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 pb-2 border-b border-[#E6DFD3]/40">
                <LucideCalendar className="w-3.5 h-3.5 text-[#E26645]" />
                <span>کارهای بدون زمان‌بندی</span>
              </h3>

              <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                کارهای زیر فاقد تاریخ انجام هستند. بر روی دکمه «برنامه‌ریزی» هر کار کلیک کنید و سپس روز مد نظر در تقویم را انتخاب کنید.
              </p>

              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {tasksList.filter(t => !t.dueDate).length > 0 ? (
                  tasksList.filter(t => !t.dueDate).map(t => (
                    <div key={t.id} className="p-2.5 bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/60 rounded-xl flex items-center justify-between">
                      <div className="min-w-0 flex-1 text-right">
                        <div 
                          onClick={() => setSelectedTaskForDetails(t)}
                          className="text-[11px] font-bold text-[#3D3D3D] dark:text-[#E8ECE0] truncate cursor-pointer hover:underline"
                        >
                          {t.title}
                        </div>
                      </div>
                      <button
                        onClick={() => setSchedulingTaskId(t.id)}
                        className={`px-2 py-1 text-[9px] font-black rounded-lg border transition-colors cursor-pointer shrink-0 ${
                          schedulingTaskId === t.id 
                            ? 'bg-amber-500 text-white border-amber-600' 
                            : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'
                        }`}
                      >
                        {schedulingTaskId === t.id ? 'انتخاب روز...' : 'برنامه‌ریزی'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl text-[9px] text-gray-400">
                    🎉 تمام کارهای پروژه زمان‌بندی شده‌اند!
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MILESTONES (نقاط عطف) VIEW */}
        {activeTab === 'milestones' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Timeline & Progress (Left - 7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 space-y-4 shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#E6DFD3]/40">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-[#7C8363]" />
                  <span>برنامه نقاط عطف پروژه (مایلستون‌ها)</span>
                </h3>
              </div>

              {/* Milestones timeline list */}
              <div className="space-y-6 relative border-r-2 border-gray-200 dark:border-zinc-800 pr-5 mr-3 pt-3">
                {(project.milestones || []).length > 0 ? (
                  (project.milestones || []).map((m) => {
                    const associated = tasksList.filter(t => t.milestoneId === m.id);
                    const doneCount = associated.filter(t => t.completed).length;
                    const totalCount = associated.length;
                    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                    return (
                      <div key={m.id} className="relative space-y-2">
                        {/* Circle node on timeline */}
                        <div className={`absolute -right-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 ${
                          m.completed 
                            ? 'bg-emerald-500 border-emerald-600' 
                            : 'bg-white border-[#7C8363]'
                        }`} />

                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${m.completed ? 'text-gray-400 line-through' : 'text-[#3D3D3D] dark:text-[#E8ECE0]'}`}>
                                {m.title}
                              </span>
                              {m.dueDate && <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">تا {m.dueDate}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleToggleMilestone(m.id)}
                              className="text-[#8D7F72] hover:text-[#7C8363]"
                            >
                              {m.completed ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(m.id)}
                              className="text-red-600 hover:text-red-700 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar of Milestone */}
                        <div className="bg-[#FDFBF7] dark:bg-[#121411] p-2 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-gray-500">
                            <span>کارهای متصل: {doneCount} از {totalCount} کار</span>
                            <span>{pct}% درصد پیشرفت</span>
                          </div>
                          <div className="w-full bg-gray-200/50 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>

                          {/* Mini list of associated tasks */}
                          {associated.length > 0 ? (
                            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                              {associated.map(t => (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTaskForDetails(t)}
                                  className="flex items-center justify-between text-[9px] bg-white dark:bg-[#1C1D17] border p-1 rounded-lg cursor-pointer hover:border-[#7C8363]"
                                >
                                  <span className={`truncate ${t.completed ? 'line-through text-gray-400' : 'text-[#3D3D3D] dark:text-[#E8ECE0]'}`}>{t.title}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updated = tasksList.map(item => item.id === t.id ? { ...item, milestoneId: undefined } : item);
                                      saveTasksList(updated);
                                    }}
                                    className="text-gray-400 hover:text-red-500 p-0.5"
                                    title="قطع ارتباط از مایلستون"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[8px] text-gray-400 italic mt-1">هیچ کاری هنوز به این مایلستون متصل نشده است.</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-center text-[#8D7F72] italic py-6">مایلستونی برای این پروژه تعریف نشده است.</p>
                )}
              </div>
            </div>

            {/* Define Milestone Form (Right - 5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-4 space-y-4 shadow-xs">
              <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 pb-2 border-b border-[#E6DFD3]/40">
                <Flag className="w-3.5 h-3.5 text-[#E26645]" />
                <span>تعریف نقطه عطف (مایلستون) جدید</span>
              </h3>

              <form onSubmit={handleAddMilestone} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8D7F72] font-black">عنوان مایلستون</label>
                  <input
                    type="text" required placeholder="مثلاً: انتشار نسخه آزمایشی..." value={milestoneTitle}
                    onChange={e => setMilestoneTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#121411] border border-[#D6CFC3] rounded-xl mt-1 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#8D7F72] font-black font-sans">تاریخ هدف</label>
                  <PersianDatePicker value={milestoneDate} onChange={setMilestoneDate} placeholder="انتخاب تاریخ هدف..." className="mt-1" />
                </div>

                <button type="submit" className="w-full py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" />
                  <span>ثبت مایلستون جدید</span>
                </button>
              </form>

              {/* Task Associator */}
              {(project.milestones || []).length > 0 && (
                <div className="pt-3 border-t border-[#E6DFD3]/40 space-y-2">
                  <h4 className="text-[10px] font-black text-[#3D3D3D] dark:text-[#E8ECE0]">اتصال سریع کارها به مایلستون</h4>
                  <p className="text-[9px] text-[#8D7F72] leading-relaxed">کارهایی را که فاقد مایلستون هستند، با انتخاب از منوی زیر مستقیماً به یکی از مایلستون‌ها متصل کنید.</p>
                  
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {tasksList.filter(t => !t.milestoneId).length > 0 ? (
                      tasksList.filter(t => !t.milestoneId).map(t => (
                        <div key={t.id} className="p-2 bg-[#FDFBF7] dark:bg-[#121411] border rounded-lg flex items-center justify-between text-right gap-2">
                          <span className="text-[10px] font-bold truncate flex-1 text-[#3D3D3D] dark:text-[#E8ECE0]">{t.title}</span>
                          <select
                            onChange={(e) => {
                              const mId = e.target.value;
                              if (mId) {
                                const updated = tasksList.map(item => item.id === t.id ? { ...item, milestoneId: mId } : item);
                                saveTasksList(updated);
                              }
                            }}
                            defaultValue=""
                            className="text-[9px] border rounded bg-white dark:bg-[#1C1D17] px-1 py-0.5 cursor-pointer max-w-28 text-[#3D3D3D] dark:text-[#E8ECE0]"
                          >
                            <option value="">انتخاب مایلستون...</option>
                            {(project.milestones || []).map(m => (
                              <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                          </select>
                        </div>
                      ))
                    ) : (
                      <p className="text-[8px] text-gray-400 italic text-center py-2">هیچ کارِ بدون مایلستونی وجود ندارد.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* REPORT VIEW */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 text-center space-y-2">
                <div className="text-[9px] font-bold text-[#8D7F72]">کل زمان صرف‌شده</div>
                <div className="text-xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono">{formatSeconds(totalProjectSeconds)}</div>
              </div>
              <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 text-center space-y-2">
                <div className="text-[9px] font-bold text-[#8D7F72]">تعداد کارها</div>
                <div className="text-xl font-black text-[#2D3025] dark:text-[#E8ECE0]">{totalTasks}</div>
              </div>
              <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 text-center space-y-2">
                <div className="text-[9px] font-bold text-[#8D7F72]">میانگین زمان هر کار</div>
                <div className="text-xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono">
                  {totalTasks > 0 ? formatSeconds(Math.round(totalProjectSeconds / totalTasks)) : '0'}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] p-5 space-y-4">
              <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#7C8363]" />
                <span>جزئیات زمان هر کار</span>
              </h3>
              <div className="space-y-2">
                {tasksList.map((t) => {
                  const sec = getTaskSeconds(t)
                  const pct = totalProjectSeconds > 0 ? Math.round((sec / totalProjectSeconds) * 100) : 0
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3]/60 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${t.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>{t.title}</span>
                          <span className="text-[10px] font-mono text-[#7C8363]">{formatSeconds(sec)}</span>
                        </div>
                        <div className="w-full bg-[#E6DFD3]/40 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-[#7C8363] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
                {tasksList.length === 0 && (
                  <div className="text-center py-8 text-[10px] text-[#8D7F72]">هیچ کاری ثبت نشده است</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOTES VIEW */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <EntityNoteEditor
              entityId={project.id}
              entityType="project"
              title="یادداشت‌ها و جزئیات پروژه (Notion)"
              initialBlocks={project.noteBlocks}
              onSave={(blocks) => {
                if (onUpdateProjectDetails) {
                  onUpdateProjectDetails(project.goalId, project.id, { noteBlocks: blocks });
                }
              }}
            />
          </div>
        )}

        {/* TASK TREE VIEW */}
        {activeTab === 'task-tree' && (
          <ProjectTaskTreeView
            tasks={tasksList}
            onToggleTask={(taskId) => onToggleTaskInProject(project.goalId, project.id, taskId)}
            onDeleteTask={(taskId) => onDeleteTaskFromProject(project.goalId, project.id, taskId)}
            onUpdateTask={(task) => handleUpdateSingleTask(task)}
            onAddTask={(title) => onAddTaskToProject(project.goalId, project.id, title)}
            onViewTaskDetails={(taskId) => {
              const t = tasksList.find(x => x.id === taskId)
              if (t) setSelectedTaskForDetails(t)
            }}
          />
        )}
      </div>

      {/* TASK DETAILS SLIDE-OVER OVERLAY MODAL */}
      <AnimatePresence>
        {selectedTaskForDetails && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskForDetails(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Slide over */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="fixed top-0 bottom-0 right-0 w-full sm:w-[480px] bg-white dark:bg-[#1C1D17] border-l border-[#E6DFD3] dark:border-[#3D4133] z-50 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto text-right"
              dir="rtl"
            >
              <div className="space-y-5">
                {/* Close & Completed */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateSingleTask({ ...selectedTaskForDetails, completed: !selectedTaskForDetails.completed })}
                      className="text-[#8D7F72] hover:text-[#7C8363]"
                    >
                      {selectedTaskForDetails.completed ? <CheckSquare className="w-5 h-5 text-[#7C8363]" /> : <Square className="w-5 h-5" />}
                    </button>
                    <span className="text-[10px] font-black text-gray-400">شناسه کار: {selectedTaskForDetails.id.split('-')[1] || 'جدید'}</span>
                  </div>

                  <button
                    onClick={() => setSelectedTaskForDetails(null)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Editable Title */}
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8D7F72] font-black">عنوان کار</label>
                  <input
                    type="text"
                    value={selectedTaskForDetails.title}
                    onChange={(e) => handleUpdateSingleTask({ ...selectedTaskForDetails, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0] font-black focus:outline-none"
                  />
                </div>

                {/* Editable Description */}
                <div className="space-y-1">
                  <label className="text-[9px] text-[#8D7F72] font-black font-sans">توضیحات و یادداشت‌ها</label>
                  <textarea
                    value={selectedTaskForDetails.description || ''}
                    onChange={(e) => handleUpdateSingleTask({ ...selectedTaskForDetails, description: e.target.value })}
                    placeholder="جزئیات این کار خرد..."
                    className="w-full px-3 py-2 text-xs bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0] h-20 resize-none focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Priority, Category and Milestone */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#8D7F72] font-black">اولویت</label>
                    <select
                      value={selectedTaskForDetails.priority || ''}
                      onChange={(e) => handleUpdateSingleTask({ ...selectedTaskForDetails, priority: (e.target.value || undefined) as any })}
                      className="w-full px-2.5 py-2 text-xs bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0]"
                    >
                      <option value="">انتخاب نشده</option>
                      {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-[#8D7F72] font-black">دسته‌بندی</label>
                    <select
                      value={selectedTaskForDetails.category || ''}
                      onChange={(e) => handleUpdateSingleTask({ ...selectedTaskForDetails, category: (e.target.value || undefined) as any })}
                      className="w-full px-2.5 py-2 text-xs bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0]"
                    >
                      <option value="">انتخاب نشده</option>
                      {TASK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#8D7F72] font-black">تاریخ مهلت / انجام</label>
                    <PersianDatePicker
                      value={selectedTaskForDetails.dueDate || ''}
                      onChange={(val) => handleUpdateSingleTask({ ...selectedTaskForDetails, dueDate: val || undefined })}
                      placeholder="بدون تاریخ انجام"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-[#8D7F72] font-black">مایلستون (نقطه عطف) متصل</label>
                    <select
                      value={selectedTaskForDetails.milestoneId || ''}
                      onChange={(e) => handleUpdateSingleTask({ ...selectedTaskForDetails, milestoneId: e.target.value || undefined })}
                      className="w-full px-2.5 py-2 text-xs bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0]"
                    >
                      <option value="">فاقد نقطه عطف</option>
                      {(project.milestones || []).map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                </div>

                {/* Subtasks Section */}
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0]">زیرلیست کارها و چک‌لیست جزئی</h4>
                    <span className="text-[8px] text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                      {(selectedTaskForDetails.subTasks || []).filter(st => st.completed).length} از {(selectedTaskForDetails.subTasks || []).length} مورد
                    </span>
                  </div>

                  {/* Add Subtask */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="مورد جدید در چک‌لیست..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const title = input.value.trim();
                          if (!title) return;
                          const newSub = { id: `subtk-${Date.now()}`, title, completed: false };
                          const updated = [...(selectedTaskForDetails.subTasks || []), newSub];
                          handleUpdateSingleTask({ ...selectedTaskForDetails, subTasks: updated });
                          input.value = '';
                        }
                      }}
                      className="flex-1 px-3 py-1 text-[11px] bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(selectedTaskForDetails.subTasks || []).length > 0 ? (
                      (selectedTaskForDetails.subTasks || []).map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-1.5 bg-[#FDFBF7]/60 dark:bg-[#121411]/50 border border-gray-100 dark:border-zinc-800 rounded-lg">
                          <button
                            onClick={() => {
                              const updated = (selectedTaskForDetails.subTasks || []).map(st => st.id === sub.id ? { ...st, completed: !st.completed } : st);
                              handleUpdateSingleTask({ ...selectedTaskForDetails, subTasks: updated });
                            }}
                            className="flex items-center gap-2 text-right text-xs"
                          >
                            {sub.completed ? <CheckCircle className="w-3.5 h-3.5 text-[#7C8363]" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                            <span className={sub.completed ? 'line-through text-gray-400' : 'text-[#3D3D3D] dark:text-[#E8ECE0]'}>{sub.title}</span>
                          </button>
                          <button
                            onClick={() => {
                              const updated = (selectedTaskForDetails.subTasks || []).filter(st => st.id !== sub.id);
                              handleUpdateSingleTask({ ...selectedTaskForDetails, subTasks: updated });
                            }}
                            className="text-red-500 hover:text-red-600 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[9px] text-gray-400 italic text-center py-2">هیچ موردی در چک‌لیست این کار ثبت نشده است.</p>
                    )}
                  </div>
                </div>

                {/* Stopwatch Tracker */}
                <div className="p-3 bg-[#E8ECE0]/30 dark:bg-[#1E241A]/20 rounded-2xl border border-[#7C8363]/20 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black text-[#5A5A40]">
                    <span>زمان‌سنج اختصاصی این تسک</span>
                    <span className="font-mono">{formatSeconds(getTaskSeconds(selectedTaskForDetails))}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onToggleTaskTracking(project.goalId, project.id, selectedTaskForDetails.id)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        selectedTaskForDetails.isTracking 
                          ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                          : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'
                      }`}
                    >
                      {selectedTaskForDetails.isTracking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      <span>{selectedTaskForDetails.isTracking ? 'توقف زمان‌سنج' : 'شروع زمان‌سنج'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const updated = { ...selectedTaskForDetails, totalTimeSpent: 0, isTracking: false, trackingStartTime: undefined };
                        handleUpdateSingleTask(updated);
                      }}
                      className="px-3 py-1.5 border border-[#D6CFC3] text-xs font-bold rounded-xl text-gray-600 dark:text-gray-400"
                    >
                      بازنشانی زمان
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between gap-3">
                <button
                  onClick={() => {
                    if (confirm('آیا از حذف این کار اطمینان دارید؟')) {
                      handleDeleteSingleTask(selectedTaskForDetails.id);
                    }
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl cursor-pointer"
                >
                  حذف دائم تسک
                </button>
                <button
                  onClick={() => setSelectedTaskForDetails(null)}
                  className="px-6 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  بستن و ثبت جزئیات
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
