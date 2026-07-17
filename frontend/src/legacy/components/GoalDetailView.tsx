import React, { useState, useEffect } from 'react';
import { Goal, GoalCategory, GoalType, ProgressMode, ContributionType, ContributionPeriod, GoalHabitLink, GoalFinanceLink, GoalLinkedProject, GoalHealthState, CompletionPolicy, GoalSignalWeights, ProjectContributionType, Milestone, Habit, BankAccount, Project, Task, MetricLog, GoalMetric, WorkoutLog, SleepLog, MindfulnessSession, JournalEntry } from '../types';
import LinkedContacts from './LinkedContacts';
import PartnerManager from './PartnerManager';
import { GOAL_CATEGORY_LABELS } from '../initialData';
import { 
  getGoalDetail, 
  computeGoalProgress, 
  linkGoalHabit, 
  unlinkGoalHabit, 
  linkGoalFinance, 
  unlinkGoalFinance, 
  linkGoalProject, 
  unlinkGoalProject,
  updateGoalSignalWeights,
  updateGoalCompletionPolicy,
  getGoalSnapshots,
  getGoalTrend,
  updateGoalProjectWeights
} from '../../app/hambaft-api';
import PersianDatePicker from './PersianDatePicker';
import EntityNoteEditor from '../../notes/components/EntityNoteEditor';
import GoalProjectSummaryCard from './GoalProjectSummaryCard';
import { 
  Target, 
  Calendar, 
  CheckSquare, 
  Trash2, 
  AlertCircle,
  Circle,
  CheckCircle,
  Plus,
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  Heart,
  Briefcase,
  BookOpen,
  Compass,
  ArrowRight,
  PlusCircle,
  FolderKanban,
  Flame,
  ListTodo,
  FolderPlus,
  X,
  CreditCard,
  Link,
  ChevronDown,
  Info,
  Layers,
  Sparkles,
  Activity,
  Image,
  Edit2,
  Upload,
  Dumbbell,
  Moon,
  Brain,
  PenTool,
  HelpCircle,
  Check,
  LineChart as LucideLineChart,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Eye,
  BarChart3,
  Scale,
  Flag,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend,
  ReferenceLine
} from 'recharts';

interface GoalDetailViewProps {
  goal: Goal;
  goals: Goal[];
  globalHabits: Habit[];
  bankAccounts: BankAccount[];
  workoutLogs?: WorkoutLog[];
  sleepLogs?: SleepLog[];
  mindfulnessSessions?: MindfulnessSession[];
  journalEntries?: JournalEntry[];
  contacts?: { id: string; name: string; photoUrl?: string; category?: string }[];
  onBack: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onAddProjectToGoal: (goalId: string, title: string, description: string) => void;
  onDeleteProjectFromGoal: (goalId: string, projectId: string) => void;
  onAddTaskToProject: (goalId: string, projectId: string, title: string) => void;
  onToggleTaskInProject: (goalId: string, projectId: string, taskId: string) => void;
  onDeleteTaskFromProject: (goalId: string, projectId: string, taskId: string) => void;
  onAddHabitToGoal: (goalId: string, name: string, description: string) => void;
  onToggleHabitLogInGoal: (goalId: string, habitId: string, date: string) => void;
  onDeleteHabitFromGoal: (goalId: string, habitId: string) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestone: (goalId: string, title: string) => void;
  onDeleteGoal: (id: string) => void;
  onToggleGoalCompletion: (id: string) => void;
  
  // New actions for linking accounts and predefined habits
  onLinkBankAccountToGoal: (goalId: string, bankAccountId: string | undefined) => void;
  onLinkHabitToGoal: (goalId: string, habitId: string) => void;
  onAddBankAccount: (bankAccount: Omit<BankAccount, 'id'>) => void;
  onSelectProject: (projectId: string) => void;
  onMoveProjectToGoal: (fromGoalId: string, projectId: string, toGoalId: string) => void;
  onNavigateEntity?: (tab: string, id?: string) => void;
}

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  financial: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  health: 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]',
  career: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  learning: 'bg-[#E6DFD3] border-[#D6CFC3] text-[#8D7F72]',
  personal: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  relationship: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  other: 'bg-[#FDFBF7] border-[#D6CFC3] text-[#3D3D3D]'
};

function getCategoryIcon(category: GoalCategory, className = "w-4 h-4") {
  switch (category) {
    case 'financial':
      return <DollarSign className={className} />;
    case 'health':
      return <Heart className={className} />;
    case 'career':
      return <Briefcase className={className} />;
    case 'learning':
      return <BookOpen className={className} />;
    case 'personal':
      return <Compass className={className} />;
    case 'relationship':
      return <Heart className={className} />;
    default:
      return <Target className={className} />;
  }
}

// ─── Inline editor for a linked project's contribution settings ───
function LinkedProjectEditor({ goalId, lp, onUpdate }: {
  goalId: string
  lp: GoalLinkedProject
  onUpdate: (updated: GoalLinkedProject) => void
}) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(String(lp.weight ?? 100))
  const [contributionType, setContributionType] = useState<ProjectContributionType>(lp.contributionType || 'mandatory')
  const [isMandatory, setIsMandatory] = useState(!!lp.isMandatory)
  const [sortOrder, setSortOrder] = useState(String(lp.sortOrder ?? 0))
  const [notes, setNotes] = useState(lp.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (goalId.startsWith('synthetic-') || goalId.startsWith('goal-')) { setEditing(false); return }
    setSaving(true)
    try {
      const contribTypeBackend: Record<string, string> = { mandatory: 'اجباری', recommended: 'پیشنهادی', supporting: 'پشتیبان' }
      await updateGoalProjectWeights(goalId, [{
        project: lp.project,
        weight: Number(weight) || 100,
        is_mandatory: isMandatory ? 1 : 0,
        contribution_type: contribTypeBackend[contributionType] || 'اجباری',
        sort_order: Number(sortOrder) || 0,
        notes: notes,
      }])
      onUpdate({
        ...lp,
        weight: Number(weight) || 100,
        contributionType,
        isMandatory,
        sortOrder: Number(sortOrder) || 0,
        notes,
      })
      setEditing(false)
    } catch (err) {
      console.error('Failed to update project weights:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetAndCancel = () => {
    setEditing(false)
    setWeight(String(lp.weight ?? 100))
    setContributionType(lp.contributionType || 'mandatory')
    setIsMandatory(!!lp.isMandatory)
    setSortOrder(String(lp.sortOrder ?? 0))
    setNotes(lp.notes || '')
  }

  const contribBadge = (() => {
    switch (contributionType) {
      case 'mandatory': return 'bg-red-50 border-red-200 text-red-700'
      case 'recommended': return 'bg-blue-50 border-blue-200 text-blue-700'
      case 'supporting': return 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72]'
      default: return 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72]'
    }
  })()

  return (
    <div className="bg-white p-3 rounded-2xl border border-[#E6DFD3] space-y-2 text-right">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[#2D3025]">{lp.title}</span>
          {editing ? (
            <select value={contributionType} onChange={e => setContributionType(e.target.value as any)}
              className="text-[9px] px-1.5 py-0.5 border border-[#D6CFC3] rounded-lg bg-white">
              <option value="mandatory">اجباری</option>
              <option value="recommended">پیشنهادی</option>
              <option value="supporting">پشتیبان</option>
            </select>
          ) : (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${contribBadge}`}>
              {contributionType === 'mandatory' ? 'اجباری' : contributionType === 'recommended' ? 'پیشنهادی' : 'پشتیبان'}
            </span>
          )}
          {editing ? (
            <label className="flex items-center gap-1 text-[9px] text-[#8D7F72]">
              <input type="checkbox" checked={isMandatory} onChange={e => setIsMandatory(e.target.checked)} className="w-3 h-3" />
              اجباری
            </label>
          ) : isMandatory && (
            <span className="text-[7px] font-bold bg-red-50 border border-red-100 text-red-600 px-1 py-0.5 rounded">اجباری</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={100} value={weight} onChange={e => setWeight(e.target.value)}
                className="w-12 px-1 py-0.5 text-[9px] border border-[#D6CFC3] rounded text-center font-mono" />
              <span className="text-[8px] text-[#8D7F72]">%</span>
            </div>
          ) : lp.weight != null && (
            <span className="text-[8px] font-bold bg-[#F9F1D8] text-[#5A5A40] px-1.5 py-0.5 rounded-md">وزن: {lp.weight}%</span>
          )}
          <button onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            className={`text-[9px] px-2 py-0.5 rounded-lg font-bold border cursor-pointer transition-all ${
              editing ? 'bg-[#7C8363] text-white border-transparent' : 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}>
            {saving ? '...' : editing ? 'ذخیره' : 'ویرایش'}
          </button>
          {editing && (
            <button onClick={resetAndCancel}
              className="text-[9px] px-2 py-0.5 rounded-lg border border-[#D6CFC3] text-[#8D7F72] cursor-pointer">لغو</button>
          )}
        </div>
      </div>
      {/* Stats */}
      <div className="flex flex-wrap gap-2 text-[9px] text-[#8D7F72] font-semibold">
        {lp.progress != null && <span>پیشرفت: {lp.progress}%</span>}
        {lp.totalTasks != null && <span>تسک: {lp.doneTasks ?? 0}/{lp.totalTasks}</span>}
        {lp.milestoneTotal != null && <span>نقطه‌عطف: {lp.milestoneDone ?? 0}/{lp.milestoneTotal}</span>}
        {lp.keyTotal != null && <span>کلیدی: {lp.keyDone ?? 0}/{lp.keyTotal}</span>}
        {lp.actualMinutes != null && <span>زمان: {lp.actualMinutes}د</span>}
        {lp.estimatedHours != null && <span>برآورد: {lp.estimatedHours}س</span>}
        {lp.sortOrder != null && lp.sortOrder > 0 && !editing && <span>ترتیب: {lp.sortOrder}</span>}
      </div>
      {/* Editable sort order and notes */}
      {editing && (
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1 text-[9px] text-[#8D7F72]">
            <span>ترتیب:</span>
            <input type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)}
              className="w-10 px-1 py-0.5 text-[9px] border border-[#D6CFC3] rounded text-center font-mono" />
          </label>
          <label className="flex items-center gap-1 text-[9px] text-[#8D7F72] flex-1 min-w-[120px]">
            <span>یادداشت:</span>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="توضیحات..."
              className="flex-1 px-1.5 py-0.5 text-[9px] border border-[#D6CFC3] rounded" />
          </label>
        </div>
      )}
      {!editing && lp.notes && (
        <div className="text-[8px] text-[#9D978B] italic">📝 {lp.notes}</div>
      )}
      {lp.progress != null && (
        <div className="w-full bg-[#E6DFD3]/40 h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#9B6B61] h-full rounded-full transition-all" style={{ width: `${Math.min(100, lp.progress)}%` }} />
        </div>
      )}
    </div>
  )
}

export default function GoalDetailView({
  goal,
  goals,
  globalHabits,
  bankAccounts,
  workoutLogs = [],
  sleepLogs = [],
  mindfulnessSessions = [],
  journalEntries = [],
  onBack,
  onUpdateGoal,
  onAddProjectToGoal,
  onDeleteProjectFromGoal,
  onAddTaskToProject,
  onToggleTaskInProject,
  onDeleteTaskFromProject,
  onAddHabitToGoal,
  onToggleHabitLogInGoal,
  onDeleteHabitFromGoal,
  onToggleMilestone,
  onAddMilestone,
  onDeleteGoal,
  onToggleGoalCompletion,
  onLinkBankAccountToGoal,
  onLinkHabitToGoal,
  onAddBankAccount,
  onSelectProject,
  onMoveProjectToGoal,
  contacts = [],
  onNavigateEntity,
}: GoalDetailViewProps) {
  
  const [activeTab, setActiveTab] = useState<'projects' | 'habits' | 'milestones' | 'metrics' | 'vision' | 'notes' | 'config' | 'finance_links'>('projects');
  
  // Vision Board State
  const [visionInputUrl, setVisionInputUrl] = useState('');
  const [visionAffirmationInput, setVisionAffirmationInput] = useState(goal.visionAffirmation || '');
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Edit Goal Modal State
  const [showEditGoalModal, setShowEditGoalModal] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description);
  const [editCategory, setEditCategory] = useState<GoalCategory>(goal.category);
  const [editTargetDate, setEditTargetDate] = useState(goal.targetDate);
  const [editGoalLevel, setEditGoalLevel] = useState<string>(goal.goalLevel || 'none');
  
  // Advanced config states
  const [editGoalType, setEditGoalType] = useState<GoalType>(goal.goalType || 'outcome');
  const [editProgressMode, setEditProgressMode] = useState<ProgressMode>(goal.progressMode || 'manual');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(goal.priority || 'medium');
  const [editTargetValue, setEditTargetValue] = useState(String(goal.targetValue || ''));
  const [editCurrentValue, setEditCurrentValue] = useState(String(goal.currentValue || ''));
  const [editUnit, setEditUnit] = useState(goal.unit || '');
  
  // Signal weight states
  const [editProjectProgressWeight, setEditProjectProgressWeight] = useState(String(goal.projectProgressWeight ?? 40));
  const [editMilestoneWeight, setEditMilestoneWeight] = useState(String(goal.milestoneWeight ?? 25));
  const [editKeyTaskWeight, setEditKeyTaskWeight] = useState(String(goal.keyTaskWeight ?? 20));
  const [editTrackedTimeWeight, setEditTrackedTimeWeight] = useState(String(goal.trackedTimeWeight ?? 10));
  const [editMetricWeight, setEditMetricWeight] = useState(String(goal.metricWeight ?? 5));
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  
  // Completion policy states
  const [editCompletionPolicy, setEditCompletionPolicy] = useState<CompletionPolicy>(goal.completionPolicy || 'threshold');
  const [editCompletionThreshold, setEditCompletionThreshold] = useState(String(goal.completionThreshold ?? 80));
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  
  // Snapshot/trend states
  const [goalSnapshots, setGoalSnapshots] = useState<any[]>([]);
  const [goalTrend, setGoalTrend] = useState<any[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  
  // Goal habit link states
  const [linkHabitId, setLinkHabitId] = useState('');
  const [linkContributionType, setLinkContributionType] = useState<ContributionType>('completion_count');
  const [linkContributionPeriod, setLinkContributionPeriod] = useState<ContributionPeriod>('monthly');
  const [linkTargetValue, setLinkTargetValue] = useState('');
  const [linkWeight, setLinkWeight] = useState('100');
  const [isLinkingHabit, setIsLinkingHabit] = useState(false);
  const [isUnlinkingHabit, setIsUnlinkingHabit] = useState<string | null>(null);
  
  // Finance link states
  const [linkFinanceAccountId, setLinkFinanceAccountId] = useState('');
  const [linkFinanceType, setLinkFinanceType] = useState<GoalFinanceLink['financeType']>('balance');
  const [linkFinanceInitialAmount, setLinkFinanceInitialAmount] = useState('');
  const [linkFinanceTargetAmount, setLinkFinanceTargetAmount] = useState('');
  const [isLinkingFinance, setIsLinkingFinance] = useState(false);
  const [isUnlinkingFinance, setIsUnlinkingFinance] = useState<string | null>(null);
  
  // Computed progress state
  const [computedProgress, setComputedProgress] = useState<{percent: number; detail: any} | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  
  // Local states for inputs
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({});
  
  // Global Habit linking dropdown selector
  const [selectedGlobalHabitId, setSelectedGlobalHabitId] = useState('');
  const [showHabitLinkSuccess, setShowHabitLinkSuccess] = useState(false);

  // New Bank Account Form Inside Modal
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardColor, setNewCardColor] = useState('#1E3A8A');

  // Local states for Goal Metrics
  const isHealthWeight = goal.title.includes('وزن') || goal.description?.includes('وزن') || goal.category === 'health';
  const [metricNameInput, setMetricNameInput] = useState(isHealthWeight ? 'وزن بدنی' : 'پیشرفت کمی');
  const [metricUnitInput, setMetricUnitInput] = useState(isHealthWeight ? 'کیلوگرم' : 'درصد');
  const [metricStartInput, setMetricStartInput] = useState(isHealthWeight ? '95' : '0');
  const [metricTargetInput, setMetricTargetInput] = useState(isHealthWeight ? '84' : '100');
  
  // States for adding a new metric log entry
  const [newLogDate, setNewLogDate] = useState('2026-07-04');
  const [newLogValue, setNewLogValue] = useState('');
  const [newLogNote, setNewLogNote] = useState('');

  // Custom simulation date
  const TODAY_DATE = '2026-07-04';

  // Math conversions
  const milestonesTotal = goal.milestones.length;
  const milestonesDone = goal.milestones.filter(m => m.completed).length;
  
  const projectsTotal = goal.projects?.length || 0;
  const projectsDone = goal.projects?.filter(p => p.completed).length || 0;

  const habitsTotal = goal.habits?.length || 0;

  // Calculation for progress percentage — use backend progress_percent if available
  const percentage = goal.progressPercent != null 
    ? Math.round(goal.progressPercent) 
    : (milestonesTotal > 0 
        ? Math.round((milestonesDone / milestonesTotal) * 100) 
        : (goal.completed ? 100 : 0));

  // Handle compute progress
  const handleComputeProgress = async () => {
    if (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-')) return;
    setIsComputing(true);
    try {
      const result = await computeGoalProgress(goal.id);
      const data = result?.data ?? result as any;
      if (data?.progress_percent != null) {
        setComputedProgress({ percent: data.progress_percent, detail: data.detail });
        // Update the goal with new progress
        const updatedGoal: Goal = {
          ...goal,
          progressPercent: data.progress_percent,
          derivedProgressDetail: JSON.stringify(data.detail),
        };
        if (data.goal) {
          if (data.goal.linked_habits) {
            updatedGoal.linkedHabits = data.goal.linked_habits.map((h: any) => ({
              habit: h.habit,
              habitTitle: h.habit_title,
              contributionType: h.contribution_type,
              weight: h.weight,
              period: h.period,
              targetValue: h.target_value,
              capValue: h.cap_value,
              isNegative: !!h.is_negative,
              notes: h.notes,
            }));
          }
          if (data.goal.linked_projects) {
            const contribTypeMap: Record<string, 'mandatory' | 'recommended' | 'supporting'> = {
              'اجباری': 'mandatory', 'پیشنهادی': 'recommended', 'پشتیبان': 'supporting',
            }
            updatedGoal.linkedProjects = data.goal.linked_projects.map((p: any) => ({
              project: p.project || p.name,
              title: p.title,
              status: p.status,
              progress: p.progress,
              effortType: p.effort_type,
              estimatedHours: p.estimated_hours,
              actualMinutes: p.actual_minutes,
              totalTasks: p.total_tasks,
              doneTasks: p.done_tasks,
              milestoneTotal: p.milestone_total,
              milestoneDone: p.milestone_done,
              keyTotal: p.key_total,
              keyDone: p.key_done,
              weight: p.weight,
              contributionType: contribTypeMap[p.contribution_type] || undefined,
              isMandatory: !!p.is_mandatory,
              sortOrder: p.sort_order,
              notes: p.notes,
            }));
          }
          // Preserve health/completion from compute result
          if (data.goal.health_state != null) {
            const healthStateMap: Record<string, 'on_track' | 'at_risk' | 'off_track' | 'needs_review'> = {
              'در_مسیر': 'on_track', 'در_خطر': 'at_risk', 'خارج_از_مسیر': 'off_track', 'نیاز_به_بررسی': 'needs_review',
            }
            updatedGoal.healthState = healthStateMap[data.goal.health_state] || undefined;
            updatedGoal.healthDetail = data.goal.health_detail;
          }
        }
        onUpdateGoal(updatedGoal);
      }
    } catch (err) {
      console.error('Failed to compute goal progress:', err);
    } finally {
      setIsComputing(false);
    }
  };

  // Handle link habit
  const handleLinkHabit = async () => {
    if (!linkHabitId || (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-'))) return;
    setIsLinkingHabit(true);
    try {
      const contribTypeMap: Record<string, string> = {
        completion_count: 'تعداد_انجام', completion_rate: 'نرخ_انجام', streak: 'رکورد',
        quantity_sum: 'مجموع_مقدار', average_value: 'میانگین_مقدار', boolean_success: 'بله_خیر',
      };
      const periodMap: Record<string, string> = {
        daily: 'روزانه', weekly: 'هفتگی', monthly: 'ماهانه', all: 'کل',
      };
      await linkGoalHabit(
        goal.id,
        linkHabitId,
        contribTypeMap[linkContributionType] || 'تعداد_انجام',
        Number(linkWeight) || 100,
        periodMap[linkContributionPeriod] || 'ماهانه',
        linkTargetValue ? Number(linkTargetValue) : undefined,
      );
      // Refresh goal detail
      const detail = await getGoalDetail(goal.id);
      const g = detail?.data?.goal ?? (detail as any)?.goal;
      if (g) {
        onUpdateGoal({
          ...goal,
          linkedHabits: (g.linked_habits || []).map((h: any) => ({
            habit: h.habit,
            habitTitle: h.habit_title,
            contributionType: h.contribution_type,
            weight: h.weight,
            period: h.period,
            targetValue: h.target_value,
            capValue: h.cap_value,
            isNegative: !!h.is_negative,
            notes: h.notes,
          })),
        });
      }
      setLinkHabitId('');
      setLinkTargetValue('');
      setLinkWeight('100');
    } catch (err) {
      console.error('Failed to link habit:', err);
    } finally {
      setIsLinkingHabit(false);
    }
  };

  // Handle unlink habit
  const handleUnlinkHabit = async (habitId: string) => {
    if (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-')) return;
    setIsUnlinkingHabit(habitId);
    try {
      await unlinkGoalHabit(goal.id, habitId);
      onUpdateGoal({
        ...goal,
        linkedHabits: (goal.linkedHabits || []).filter(h => h.habit !== habitId),
      });
    } catch (err) {
      console.error('Failed to unlink habit:', err);
    } finally {
      setIsUnlinkingHabit(null);
    }
  };

  // Handle link finance
  const handleLinkFinance = async () => {
    if (!linkFinanceAccountId || (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-'))) return;
    setIsLinkingFinance(true);
    try {
      const finTypeMap: Record<string, string> = {
        balance: 'موجودی_حساب', savings: 'پس‌انداز', debt: 'بدهی', investment: 'سرمایه‌گذاری', income_accumulated: 'درآمد_انباشته',
      };
      await linkGoalFinance(
        goal.id,
        linkFinanceAccountId,
        finTypeMap[linkFinanceType] || 'موجودی_حساب',
        linkFinanceInitialAmount ? Number(linkFinanceInitialAmount) : undefined,
        linkFinanceTargetAmount ? Number(linkFinanceTargetAmount) : undefined,
      );
      const detail = await getGoalDetail(goal.id);
      const g = detail?.data?.goal ?? (detail as any)?.goal;
      if (g) {
        onUpdateGoal({
          ...goal,
          linkedFinanceAccounts: (g.linked_finance_accounts || []).map((f: any) => ({
            financeAccount: f.finance_account,
            accountName: f.account_name,
            currentBalance: f.current_balance,
            financeType: f.finance_type,
            initialAmount: f.initial_amount,
            targetAmount: f.target_amount,
            weight: f.weight,
            notes: f.notes,
          })),
        });
      }
      setLinkFinanceAccountId('');
      setLinkFinanceInitialAmount('');
      setLinkFinanceTargetAmount('');
    } catch (err) {
      console.error('Failed to link finance:', err);
    } finally {
      setIsLinkingFinance(false);
    }
  };

  // Handle unlink finance
  const handleUnlinkFinance = async (accountId: string) => {
    if (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-')) return;
    setIsUnlinkingFinance(accountId);
    try {
      await unlinkGoalFinance(goal.id, accountId);
      onUpdateGoal({
        ...goal,
        linkedFinanceAccounts: (goal.linkedFinanceAccounts || []).filter(f => f.financeAccount !== accountId),
      });
    } catch (err) {
      console.error('Failed to unlink finance:', err);
    } finally {
      setIsUnlinkingFinance(null);
    }
  };

  // Linked bank account if any
  const linkedAccount = bankAccounts.find(acc => acc.id === goal.linkedBankAccountId);

  // Dynamic composite health metrics calculation
  const getCompositeHealthDetails = () => {
    const totalWorkouts = workoutLogs.length;
    const workoutScore = Math.min(100, (totalWorkouts / 10) * 100);

    const avgSleep = sleepLogs.length > 0 
      ? sleepLogs.reduce((acc, log) => acc + log.duration, 0) / sleepLogs.length
      : 0;
    const sleepScore = avgSleep > 0 
      ? Math.max(0, Math.min(100, 100 - Math.abs(avgSleep - 8) * 20))
      : 0;

    const totalMeditation = mindfulnessSessions
      .filter(s => s.type === 'meditation' || s.type === 'breathing')
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    const meditationScore = Math.min(100, (totalMeditation / 120) * 100);

    const totalJournal = journalEntries.length;
    const journalScore = Math.min(100, (totalJournal / 5) * 100);

    const compositeScore = Math.round((workoutScore + sleepScore + meditationScore + journalScore) / 4);

    return {
      totalWorkouts,
      workoutScore: Math.round(workoutScore),
      avgSleep: Math.round(avgSleep * 10) / 10,
      sleepScore: Math.round(sleepScore),
      totalMeditation,
      meditationScore: Math.round(meditationScore),
      totalJournal,
      journalScore: Math.round(journalScore),
      compositeScore
    };
  };

  const getCompositeTrendData = () => {
    if (!goal.metric || goal.metric.autoTrackSource !== 'composite_health') return null;

    // Collect all dates
    const datesSet = new Set<string>();
    workoutLogs.forEach(w => datesSet.add(w.date));
    sleepLogs.forEach(s => datesSet.add(s.date));
    mindfulnessSessions.forEach(m => datesSet.add(m.date));
    journalEntries.forEach(j => datesSet.add(j.date));

    const sortedDates = Array.from(datesSet).sort();
    
    return sortedDates.map(date => {
      const workoutsUpTo = workoutLogs.filter(w => w.date <= date);
      const sleepUpTo = sleepLogs.filter(s => s.date <= date);
      const meditationUpTo = mindfulnessSessions
        .filter(s => s.date <= date && (s.type === 'meditation' || s.type === 'breathing'));
      const journalUpTo = journalEntries.filter(j => j.date <= date);

      const workoutCount = workoutsUpTo.length;
      const wScore = Math.min(100, (workoutCount / 10) * 100);

      const avgS = sleepUpTo.length > 0
        ? sleepUpTo.reduce((acc, s) => acc + s.duration, 0) / sleepUpTo.length
        : 0;
      const sScore = avgS > 0 ? Math.max(0, Math.min(100, 100 - Math.abs(avgS - 8) * 20)) : 0;

      const medMins = meditationUpTo.reduce((acc, s) => acc + s.durationMinutes, 0);
      const mScore = Math.min(100, (medMins / 120) * 100);

      const journalCount = journalUpTo.length;
      const jScore = Math.min(100, (journalCount / 5) * 100);

      const compositeVal = Math.round((wScore + sScore + mScore + jScore) / 4);

      return {
        date,
        'شاخص کل سلامت': compositeVal,
        'امتیاز ورزش': Math.round(wScore),
        'امتیاز خواب': Math.round(sScore),
        'امتیاز ذهن‌آگاهی': Math.round(mScore),
        'امتیاز ژورنال': Math.round(jScore)
      };
    });
  };

  // Dynamic metric current value calculation based on connected source
  const getAutoTrackedCurrentValue = (): number => {
    if (!goal.metric) return 0;
    if (!goal.metric.autoTrackSource || goal.metric.autoTrackSource === 'none') {
      return goal.metric.currentValue;
    }

    switch (goal.metric.autoTrackSource) {
      case 'composite_health':
        return getCompositeHealthDetails().compositeScore;

      case 'bank_balance':
        return linkedAccount ? linkedAccount.balance : goal.metric.currentValue;
      
      case 'workout_count':
        return workoutLogs.length;
      
      case 'workout_calories':
        return workoutLogs.reduce((acc, log) => acc + (log.caloriesBurned || 0), 0);
      
      case 'workout_distance':
        return workoutLogs.reduce((acc, log) => acc + (log.distanceKm || 0), 0);
      
      case 'strength_max_weight': {
        if (!goal.metric.autoTrackExerciseName) return goal.metric.currentValue;
        let maxWeight = 0;
        workoutLogs.forEach(log => {
          if (log.gymSets) {
            log.gymSets.forEach(set => {
              if (set.exerciseName.toLowerCase().includes(goal.metric!.autoTrackExerciseName!.toLowerCase())) {
                if (set.weight > maxWeight) {
                  maxWeight = set.weight;
                }
              }
            });
          }
        });
        return maxWeight > 0 ? maxWeight : goal.metric.currentValue;
      }
      
      case 'sleep_hours': {
        if (sleepLogs.length === 0) return goal.metric.currentValue;
        const total = sleepLogs.reduce((acc, log) => acc + log.duration, 0);
        return Math.round((total / sleepLogs.length) * 10) / 10; // average
      }
      
      case 'sleep_quality': {
        if (sleepLogs.length === 0) return goal.metric.currentValue;
        const total = sleepLogs.reduce((acc, log) => acc + log.quality, 0);
        return Math.round((total / sleepLogs.length) * 10) / 10; // average
      }
      
      case 'meditation_minutes': {
        return mindfulnessSessions
          .filter(s => s.type === 'meditation' || s.type === 'breathing')
          .reduce((acc, s) => acc + s.durationMinutes, 0);
      }
      
      case 'journal_mood': {
        return journalEntries.length;
      }
      
      default:
        return goal.metric.currentValue;
    }
  };

  const getDynamicMetricLogs = (): MetricLog[] => {
    if (!goal.metric) return [];
    if (!goal.metric.autoTrackSource || goal.metric.autoTrackSource === 'none') {
      return goal.metric.logs || [];
    }

    const logsMap: Record<string, number> = {};

    switch (goal.metric.autoTrackSource) {
      case 'composite_health': {
        // Collect all dates
        const datesSet = new Set<string>();
        workoutLogs.forEach(w => datesSet.add(w.date));
        sleepLogs.forEach(s => datesSet.add(s.date));
        mindfulnessSessions.forEach(m => datesSet.add(m.date));
        journalEntries.forEach(j => datesSet.add(j.date));

        const sortedDates = Array.from(datesSet).sort();
        if (sortedDates.length === 0) return [];

        const trendLogs: MetricLog[] = [];
        sortedDates.forEach((date, idx) => {
          const workoutsUpTo = workoutLogs.filter(w => w.date <= date);
          const sleepUpTo = sleepLogs.filter(s => s.date <= date);
          const meditationUpTo = mindfulnessSessions
            .filter(s => s.date <= date && (s.type === 'meditation' || s.type === 'breathing'));
          const journalUpTo = journalEntries.filter(j => j.date <= date);

          const workoutCount = workoutsUpTo.length;
          const wScore = Math.min(100, (workoutCount / 10) * 100);

          const avgS = sleepUpTo.length > 0
            ? sleepUpTo.reduce((acc, s) => acc + s.duration, 0) / sleepUpTo.length
            : 0;
          const sScore = avgS > 0 ? Math.max(0, Math.min(100, 100 - Math.abs(avgS - 8) * 20)) : 0;

          const medMins = meditationUpTo.reduce((acc, s) => acc + s.durationMinutes, 0);
          const mScore = Math.min(100, (medMins / 120) * 100);

          const journalCount = journalUpTo.length;
          const jScore = Math.min(100, (journalCount / 5) * 100);

          const compositeVal = Math.round((wScore + sScore + mScore + jScore) / 4);

          trendLogs.push({
            id: `composite-trend-${idx}`,
            date,
            value: compositeVal,
            note: `تندرستی: ${compositeVal}٪ (ورزش: ${workoutCount}، خواب: ${Math.round(avgS * 10) / 10}س، مراقبه: ${medMins}د، یادداشت: ${journalCount})`
          });
        });

        return trendLogs;
      }

      case 'workout_count': {
        const sorted = [...workoutLogs].sort((a, b) => a.date.localeCompare(b.date));
        let count = 0;
        return sorted.map((w, idx) => {
          count++;
          return {
            id: `auto-wl-${idx}`,
            date: w.date,
            value: count,
            note: `ثبت تمرین ${w.type === 'strength' ? 'قدرتی' : 'هوازی'}`
          };
        });
      }
      
      case 'workout_calories': {
        workoutLogs.forEach(w => {
          if (w.caloriesBurned) {
            logsMap[w.date] = (logsMap[w.date] || 0) + w.caloriesBurned;
          }
        });
        break;
      }
      
      case 'workout_distance': {
        workoutLogs.forEach(w => {
          if (w.distanceKm) {
            logsMap[w.date] = (logsMap[w.date] || 0) + w.distanceKm;
          }
        });
        break;
      }

      case 'strength_max_weight': {
        if (!goal.metric.autoTrackExerciseName) return goal.metric.logs || [];
        const sorted = [...workoutLogs].sort((a, b) => a.date.localeCompare(b.date));
        const res: MetricLog[] = [];
        let runningMax = 0;
        sorted.forEach((w, idx) => {
          let dayMax = 0;
          if (w.gymSets) {
            w.gymSets.forEach(set => {
              if (set.exerciseName.toLowerCase().includes(goal.metric!.autoTrackExerciseName!.toLowerCase())) {
                if (set.weight > dayMax) dayMax = set.weight;
              }
            });
          }
          if (dayMax > 0) {
            if (dayMax > runningMax) runningMax = dayMax;
            res.push({
              id: `auto-sm-${idx}`,
              date: w.date,
              value: runningMax,
              note: `رکورد جدید: ${dayMax} کیلوگرم`
            });
          }
        });
        return res;
      }

      case 'sleep_hours': {
        return sleepLogs.map((s, idx) => ({
          id: `auto-sl-${idx}`,
          date: s.date,
          value: s.duration,
          note: `خواب شبانه`
        })).sort((a, b) => a.date.localeCompare(b.date));
      }

      case 'sleep_quality': {
        return sleepLogs.map((s, idx) => ({
          id: `auto-sq-${idx}`,
          date: s.date,
          value: s.quality,
          note: `امتیاز کیفیت خواب`
        })).sort((a, b) => a.date.localeCompare(b.date));
      }

      case 'meditation_minutes': {
        mindfulnessSessions.forEach(s => {
          logsMap[s.date] = (logsMap[s.date] || 0) + s.durationMinutes;
        });
        break;
      }

      case 'journal_mood': {
        const sorted = [...journalEntries].sort((a, b) => a.date.localeCompare(b.date));
        return sorted.map((j, idx) => ({
          id: `auto-je-${idx}`,
          date: j.date,
          value: idx + 1,
          note: `نوشتن یادداشت روزانه: ${j.title}`
        }));
      }

      default:
        return goal.metric.logs || [];
    }

    return Object.entries(logsMap).map(([date, val], idx) => ({
      id: `auto-gen-${idx}`,
      date,
      value: val,
      note: 'بروزرسانی خودکار هوشمند'
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const currentMetricValue = goal.metric ? getAutoTrackedCurrentValue() : 0;
  const currentMetricLogs = goal.metric ? getDynamicMetricLogs() : [];

  // Target amount for financial goals (extracted from description or hardcoded default)
  // Let's assume a default target of 100M if category is financial
  const targetFinancialAmount = goal.metric?.targetValue || 100000000; // 100 million Tomans
  const financialProgressPct = linkedAccount 
    ? Math.min(100, Math.round((linkedAccount.balance / targetFinancialAmount) * 100)) 
    : 0;

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const current = goal.visionImages || [];
      if (current.includes(base64String)) return;
      onUpdateGoal({
        ...goal,
        visionImages: [...current, base64String]
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadAndAddImage = async () => {
    if (!visionInputUrl.trim()) return;
    setIsDownloadingImage(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/download-image?url=${encodeURIComponent(visionInputUrl.trim())}`);
      if (!res.ok) {
        throw new Error('خطا در دانلود عکس از آدرس وارد شده. ممکن است آدرس نامعتبر باشد یا دسترسی به آن محدود شده باشد.');
      }
      const data = await res.json();
      if (data.dataUrl) {
        const current = goal.visionImages || [];
        if (!current.includes(data.dataUrl)) {
          onUpdateGoal({
            ...goal,
            visionImages: [...current, data.dataUrl]
          });
        }
        setVisionInputUrl('');
      } else {
        throw new Error('فرمت تصویر برگشت داده شده نامعتبر است.');
      }
    } catch (err: any) {
      console.error(err);
      setDownloadError(err.message || 'خطایی در دانلود تصویر رخ داد.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleSaveEditedGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    onUpdateGoal({
      ...goal,
      title: editTitle.trim(),
      description: editDescription.trim(),
      category: editCategory,
      targetDate: editTargetDate,
      goalLevel: editGoalLevel !== 'none' ? (editGoalLevel as 'annual' | 'quarterly' | 'monthly' | 'custom') : undefined
    });

    setShowEditGoalModal(false);
  };

  // Habits that are in global list but NOT in the goal list
  const linkableHabits = globalHabits.filter(gh => {
    return !(goal.habits || []).some(h => h.name.trim().toLowerCase() === gh.name.trim().toLowerCase());
  });

  const handleLinkPredefinedHabit = () => {
    if (!selectedGlobalHabitId) return;
    onLinkHabitToGoal(goal.id, selectedGlobalHabitId);
    setSelectedGlobalHabitId('');
    setShowHabitLinkSuccess(true);
    setTimeout(() => setShowHabitLinkSuccess(false), 3000);
  };

  const handleCreateNewBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = Number(newBalance.replace(/[^0-9]/g, ''));
    if (!newBankName || !newAccountName || isNaN(balanceNum)) return;

    onAddBankAccount({
      bankName: newBankName,
      accountName: newAccountName,
      balance: balanceNum,
      cardNumber: newCardNumber || undefined,
      color: newCardColor
    });

    // Reset Form
    setNewBankName('');
    setNewAccountName('');
    setNewBalance('');
    setNewCardNumber('');
    setShowAddAccountModal(false);
  };

  const handleAddMilestone = () => {
    if (!newMilestoneText.trim()) return;
    onAddMilestone(goal.id, newMilestoneText.trim());
    setNewMilestoneText('');
  };

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    onAddProjectToGoal(goal.id, newProjectTitle.trim(), newProjectDesc.trim());
    setNewProjectTitle('');
    setNewProjectDesc('');
  };

  const handleCreateHabit = () => {
    if (!newHabitName.trim()) return;
    onAddHabitToGoal(goal.id, newHabitName.trim(), newHabitDesc.trim());
    setNewHabitName('');
    setNewHabitDesc('');
  };

  const handleCreateTask = (projectId: string) => {
    const title = newTaskTitles[projectId]?.trim();
    if (!title) return;
    onAddTaskToProject(goal.id, projectId, title);
    setNewTaskTitles(prev => ({ ...prev, [projectId]: '' }));
  };

  // Save signal weights
  const handleSaveSignalWeights = async () => {
    if (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-')) return;
    setIsSavingWeights(true);
    try {
      await updateGoalSignalWeights(goal.id, {
        projectProgressWeight: Number(editProjectProgressWeight) || 40,
        milestoneWeight: Number(editMilestoneWeight) || 25,
        keyTaskWeight: Number(editKeyTaskWeight) || 20,
        trackedTimeWeight: Number(editTrackedTimeWeight) || 10,
        metricWeight: Number(editMetricWeight) || 5,
      });
      onUpdateGoal({
        ...goal,
        projectProgressWeight: Number(editProjectProgressWeight) || 40,
        milestoneWeight: Number(editMilestoneWeight) || 25,
        keyTaskWeight: Number(editKeyTaskWeight) || 20,
        trackedTimeWeight: Number(editTrackedTimeWeight) || 10,
        metricWeight: Number(editMetricWeight) || 5,
      });
    } catch (err) {
      console.error('Failed to save signal weights:', err);
    } finally {
      setIsSavingWeights(false);
    }
  };

  // Save completion policy
  const handleSaveCompletionPolicy = async () => {
    if (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-')) return;
    setIsSavingPolicy(true);
    try {
      const policyMap: Record<string, string> = {
        threshold: 'آستانه_پیشرفت', threshold_plus_mandatory: 'آستانه_به_علاوه_پروژه‌های_اجباری',
        metric_plus_mandatory: 'سنجه_به_علاوه_پروژه‌های_اجباری', all_projects: 'همه_پروژه‌ها_تکمیل',
        threshold_plus_milestones: 'آستانه_به_علاوه_نقاط_عطف',
      };
      await updateGoalCompletionPolicy(
        goal.id,
        policyMap[editCompletionPolicy] || 'آستانه_پیشرفت',
        Number(editCompletionThreshold) || 80
      );
      onUpdateGoal({
        ...goal,
        completionPolicy: editCompletionPolicy,
        completionThreshold: Number(editCompletionThreshold) || 80,
      });
    } catch (err) {
      console.error('Failed to save completion policy:', err);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Load snapshots
  const handleLoadSnapshots = async () => {
    if (goal.id.startsWith('synthetic-') || goal.id.startsWith('goal-')) return;
    setIsLoadingSnapshots(true);
    try {
      const [snapRes, trendRes] = await Promise.all([
        getGoalSnapshots(goal.id, 30),
        getGoalTrend(goal.id, 30),
      ]);
      setGoalSnapshots(snapRes?.data?.snapshots || []);
      setGoalTrend(trendRes?.data?.trend || []);
    } catch (err) {
      console.error('Failed to load snapshots:', err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  // Health state helpers
  const getHealthStateLabel = (state?: GoalHealthState) => {
    switch (state) {
      case 'on_track': return 'در مسیر ✓';
      case 'at_risk': return 'در خطر ⚠';
      case 'off_track': return 'خارج از مسیر ✗';
      case 'needs_review': return 'نیاز به بررسی 🔍';
      default: return 'نامشخص';
    }
  };

  const getHealthStateColor = (state?: GoalHealthState) => {
    switch (state) {
      case 'on_track': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'at_risk': return 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]';
      case 'off_track': return 'bg-red-50 border-red-200 text-red-700';
      case 'needs_review': return 'bg-slate-50 border-slate-200 text-slate-700';
      default: return 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72]';
    }
  };

  const getCompletionPolicyLabel = (policy?: CompletionPolicy) => {
    switch (policy) {
      case 'threshold': return 'آستانه پیشرفت';
      case 'threshold_plus_mandatory': return 'آستانه + پروژه‌های اجباری';
      case 'metric_plus_mandatory': return 'سنجه + پروژه‌های اجباری';
      case 'all_projects': return 'همه پروژه‌ها تکمیل';
      case 'threshold_plus_milestones': return 'آستانه + نقاط عطف';
      default: return 'آستانه پیشرفت';
    }
  };

  const getContributionTypeLabel = (type?: string) => {
    switch (type) {
      case 'mandatory': return 'اجباری';
      case 'recommended': return 'پیشنهادی';
      case 'supporting': return 'پشتیبان';
      default: return 'نامشخص';
    }
  };

  const getContributionTypeBadge = (type?: string) => {
    switch (type) {
      case 'mandatory': return 'bg-red-50 border-red-200 text-red-700';
      case 'recommended': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'supporting': return 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72]';
      default: return 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72]';
    }
  };

  const categoryDetails = GOAL_CATEGORY_LABELS[goal.category] || GOAL_CATEGORY_LABELS.other;
  const badgeStyle = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.other;

  return (
    <div className="space-y-6 text-right pb-16" dir="rtl" id={`goal-detail-${goal.id}`}>
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-[#FDFBF7] py-3 border-b border-[#E6DFD3]/40" id="detail-header-nav">
        <div className="flex items-center gap-2">
          <button 
            id="back-to-goals-btn"
            onClick={onBack}
            className="p-2 bg-[#F9F6EE] hover:bg-[#E6DFD3]/60 border border-[#E6DFD3] rounded-xl text-[#8D7F72] transition-all cursor-pointer flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold text-[#8D7F72] block">جزئیات کامل هدف</span>
            <h2 className="text-xs font-black text-[#2D3025] truncate max-w-[200px]">{goal.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onToggleGoalCompletion(goal.id)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1 cursor-pointer transition-all ${
              goal.completed 
                ? 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]' 
                : 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72] hover:bg-[#E8ECE0]'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{goal.completed ? 'تحقق یافته' : 'علامت تحقق'}</span>
          </button>

          <button 
            onClick={() => {
              setEditTitle(goal.title);
              setEditDescription(goal.description);
              setEditCategory(goal.category);
              setEditTargetDate(goal.targetDate);
              setEditGoalLevel(goal.goalLevel || 'none');
              setShowEditGoalModal(true);
            }}
            className="px-3 py-1.5 text-[#7C8363] bg-[#E8ECE0] hover:bg-[#DDE2D5] border border-[#7C8363]/20 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
            title="ویرایش مشخصات هدف"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>ویرایش هدف</span>
          </button>

          <button 
            onClick={() => {
              if (confirm('آیا مایل به حذف کامل این هدف هستید؟')) {
                onDeleteGoal(goal.id);
                onBack();
              }
            }}
            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer"
            title="حذف هدف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DYNAMIC PROGRESS ACCENT CARD */}
      <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#EBE3C8] shadow-xs relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-5">
        
        {/* Background Subtle Sparkle Accent */}
        <div className="absolute top-0 left-0 p-3 opacity-15 pointer-events-none">
          <Sparkles className="w-20 h-20 text-[#7C8363]" />
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${badgeStyle}`}>
              {getCategoryIcon(goal.category, "w-3 h-3")}
              <span>{categoryDetails.label}</span>
            </span>

            <span className="text-[10px] text-[#8D7F72] font-semibold flex items-center gap-1 font-mono bg-[#F9F6EE] border border-[#E6DFD3] px-2 py-0.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-[#8D7F72]" />
              <span>سررسید: {goal.targetDate}</span>
            </span>
          </div>

          <h3 className="text-sm font-black text-[#2D3025]">{goal.title}</h3>
          <p className="text-xs text-[#8D7F72] leading-relaxed pr-1">{goal.description || 'بدون توضیحات اضافی'}</p>
        </div>

        {/* Progress Display Gauge */}
        <div className="flex flex-col items-center justify-center bg-[#F9F6EE] p-4 rounded-2xl border border-[#EBE3C8] min-w-[120px] shrink-0 text-center">
          <span className="text-[9px] font-bold text-[#8D7F72] block mb-1">میزان تکمیل گام‌ها</span>
          <div className="relative flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" className="text-[#E6DFD3]" strokeWidth="4 animate-pulse" fill="transparent" />
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                className="text-[#7C8363] transition-all duration-700 ease-out" 
                strokeWidth="4" 
                strokeDasharray={2 * Math.PI * 28} 
                strokeDashoffset={2 * Math.PI * 28 - (percentage / 100) * 2 * Math.PI * 28}
                strokeLinecap="round" 
                fill="transparent" 
              />
            </svg>
            <span className="absolute text-xs font-black text-[#2D3025] font-mono">{percentage}%</span>
          </div>
          <span className="text-[8px] font-bold text-[#7C8363] mt-2 block bg-white border border-[#DDE2D5] px-1.5 py-0.5 rounded-md">
            {milestonesDone} از {milestonesTotal} گام فرعی
          </span>
        </div>
      </div>

      {/* FINANCIAL INTEGRATION BLOCK (Conditional on financial goals) */}
      {goal.category === 'financial' && (
        <div className="bg-[#E8ECE0]/30 p-5 rounded-3xl border border-[#DDE2D5] space-y-4" id="financial-integration-section">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#7C8363]" />
              <span>اتصال به موجودی حساب‌های بانکی</span>
            </h4>
            
            <button 
              onClick={() => setShowAddAccountModal(true)}
              className="text-[10px] text-[#7C8363] hover:text-[#5A5A40] font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>حساب بانکی جدید</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Selector Card */}
            <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#8D7F72] block mb-1">حساب متصل فعلی</span>
                {linkedAccount ? (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#DDE2D5]">
                    <div className="p-2.5 rounded-lg text-white" style={{ backgroundColor: linkedAccount.color || '#1E3A8A' }}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <h5 className="text-xs font-extrabold text-[#2D3025] truncate">{linkedAccount.bankName}</h5>
                      <p className="text-[9px] text-[#8D7F72]">{linkedAccount.accountName}</p>
                      <p className="text-[9px] font-mono text-slate-500">{linkedAccount.cardNumber || '••••'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-[#F9F1D8]/20 border border-dashed border-[#EBE3C8] rounded-xl text-[10px] text-[#8D7F72] flex items-center justify-center gap-1">
                    <Info className="w-4 h-4 text-[#8D7F72]" />
                    <span>هیچ حسابی به این هدف متصل نیست.</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#8D7F72] block">اتصال/تغییر حساب بانکی:</label>
                <select 
                  value={goal.linkedBankAccountId || ''}
                  onChange={(e) => onLinkBankAccountToGoal(goal.id, e.target.value || undefined)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                >
                  <option value="">-- عدم اتصال حساب --</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountName} ({acc.balance.toLocaleString('fa-IR')} تومان)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Account Progress Dashboard */}
            <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#8D7F72] block mb-1">بررسی تحقق مالی</span>
                {linkedAccount ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="text-right">
                        <span className="text-[9px] text-[#8D7F72] block">موجودی واقعی حساب</span>
                        <span className="text-xs font-black text-[#7C8363] font-serif-elegant">
                          {linkedAccount.balance.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] text-[#8D7F72] block">مبلغ هدف نهایی</span>
                        <span className="text-xs font-black text-[#9B6B61] font-serif-elegant">
                          {targetFinancialAmount.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72]">تومان</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-[#8D7F72]">
                        <span>پیشرفت بر اساس موجودی:</span>
                        <span>{financialProgressPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#F9F6EE] rounded-full overflow-hidden border border-[#E6DFD3]/40">
                        <div 
                          className="h-full bg-gradient-to-l from-[#7C8363] to-[#5A5A40] transition-all duration-500 rounded-full"
                          style={{ width: `${financialProgressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                    با اتصال یکی از حساب‌های بانکی خود، این سیستم به صورت هوشمند پیشرفت هدف مالی شما را بر اساس موجودی حساب بانکی سنجیده و درصد پس‌انداز واقعی شما را ترسیم می‌کند.
                  </p>
                )}
              </div>

              <div className="text-[10px] bg-[#F9F6EE] p-2 rounded-xl text-[#7C8363] font-medium border border-[#DDE2D5] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>بر اساس واریزی‌های ماه گذشته، این حساب روند رو به رشد خوبی دارد.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEALTH STATE + SNAPSHOT BANNER */}
      {(goal.healthState || goal.completionPolicy) && (
        <div className="bg-white p-4 rounded-3xl border border-[#E6DFD3] shadow-xs flex flex-wrap items-center gap-3 text-right">
          {goal.healthState && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold ${getHealthStateColor(goal.healthState)}`}>
              {goal.healthState === 'on_track' && <ShieldCheck className="w-4 h-4" />}
              {goal.healthState === 'at_risk' && <ShieldAlert className="w-4 h-4" />}
              {goal.healthState === 'off_track' && <ShieldX className="w-4 h-4" />}
              {goal.healthState === 'needs_review' && <Eye className="w-4 h-4" />}
              <span>وضعیت سلامت هدف: {getHealthStateLabel(goal.healthState)}</span>
            </div>
          )}
          {goal.completionPolicy && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-[#F9F6EE] border-[#D6CFC3] text-[10px] font-bold text-[#5A5A40]">
              <Scale className="w-4 h-4" />
              <span>سیاست تکمیل: {getCompletionPolicyLabel(goal.completionPolicy)}</span>
              {goal.completionThreshold && <span className="text-[8px] text-[#8D7F72] mr-1">({goal.completionThreshold}%)</span>}
            </div>
          )}
          {goal.lastSnapshot && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-[#E8ECE0]/40 border-[#DDE2D5] text-[9px] font-bold text-[#7C8363]">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>آخرین اسنپ‌شات: {goal.lastSnapshot.progressPct?.toFixed(0)}% در {goal.lastSnapshotAt?.slice(0, 10) || '—'}</span>
            </div>
          )}
        </div>
      )}

      {/* CORE WORKSPACE TABS */}
      <div className="space-y-4" id="detail-workspace-tabs">
        
        {/* Tab Buttons bar */}
        <div className="flex border-b border-[#E6DFD3]/60 pb-1.5 overflow-x-auto gap-2 p-1 bg-[#F9F6EE] rounded-2xl">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>پروژه‌ها ({projectsTotal})</span>
          </button>

          <button
            onClick={() => setActiveTab('habits')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'habits'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>عادت‌های مرتبط ({habitsTotal})</span>
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'milestones'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>خرده‌گام‌ها ({milestonesTotal})</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>روند پیشرفت کمی</span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vision'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>برد تصویرسازی ({(goal.visionImages || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>یادداشت‌ها (Notion)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>پیکربندی هدف</span>
          </button>

          <button
            onClick={() => setActiveTab('finance_links')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'finance_links'
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>پیوند مالی ({(goal.linkedFinanceAccounts || []).length})</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT: PROJECTS & TASKS */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Rich linked projects from backend (if available) */}
            {(goal.linkedProjects || []).length > 0 && (
              <div className="bg-[#E8ECE0]/20 p-4 rounded-3xl border border-[#DDE2D5] space-y-3">
                <h5 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-[#7C8363]" />
                  <span>پروژه‌های پیوندی با تجزیه مشارکت ({goal.linkedProjects!.length})</span>
                </h5>
                <div className="space-y-2">
                  {goal.linkedProjects!.map((lp, idx) => (
                    <LinkedProjectEditor
                      key={lp.project || idx}
                      goalId={goal.id}
                      lp={lp}
                      onUpdate={(updatedLp) => {
                        const newLinked = [...(goal.linkedProjects || [])];
                        newLinked[idx] = updatedLp;
                        onUpdateGoal({ ...goal, linkedProjects: newLinked });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {goal.projects && goal.projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goal.projects.map((project) => {
                  const linkedMatch = (goal.linkedProjects || []).find(lp => lp.project === project.id || lp.title === project.title);
                  const mergedProject = {
                    ...project,
                    contributionType: project.contributionType || linkedMatch?.contributionType,
                    actualMinutes: project.actualMinutes ?? linkedMatch?.actualMinutes,
                    estimatedHours: project.estimatedHours ?? linkedMatch?.estimatedHours,
                  };
                  return (
                    <GoalProjectSummaryCard
                      key={project.id}
                      goalId={goal.id}
                      project={mergedProject}
                      goals={goals}
                      onSelectProject={onSelectProject}
                      onMoveProjectToGoal={onMoveProjectToGoal}
                      onDeleteProject={onDeleteProjectFromGoal}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#FDFBF7] p-8 text-center text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-3xl font-bold text-xs">
                هنوز هیچ پروژه‌ای برای این هدف ثبت نشده است. با استفاده از فرم زیر اولین پروژه خود را تعریف کنید.
              </div>
            )}

            {/* Form to Add Project */}
            <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-3 max-w-md mx-auto">
              <h5 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-[#9B6B61]" />
                <span>ایجاد پروژه جدید برای تحقق این هدف</span>
              </h5>
              
              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="عنوان پروژه (مثلاً: آماده‌سازی مدارک مورد نیاز)"
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
                <input 
                  type="text"
                  placeholder="توضیح کوتاه یا اهداف پروژه"
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
                <button 
                  onClick={handleCreateProject}
                  className="w-full py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  ثبت پروژه در اهداف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT: GOLDEN HABITS */}
        {activeTab === 'habits' && (
          <div className="space-y-5">
            
            {/* 1. Linking Predefined Habits Box (USER REQUEST 2) */}
            <div className="bg-[#E8ECE0]/30 p-4.5 rounded-3xl border border-[#DDE2D5] space-y-3">
              <h5 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <Link className="w-4 h-4 text-[#7C8363]" />
                <span>اتصال عادت‌های از قبل تعریف‌شده به این هدف</span>
              </h5>
              
              <p className="text-[11px] text-[#8D7F72] leading-relaxed">
                می‌توانید هرکدام از عادت‌های طلایی که قبلاً در بخش ردیاب ساخته‌اید را در اینجا انتخاب کرده و مستقیماً به این هدف متصل کنید تا فرآیند تحقق آن ساده‌تر شود.
              </p>

              <div className="flex gap-2">
                <select
                  value={selectedGlobalHabitId}
                  onChange={e => setSelectedGlobalHabitId(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                >
                  <option value="">-- انتخاب عادت از ردیاب کلی --</option>
                  {linkableHabits.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.streak} روز زنجیره)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedGlobalHabitId}
                  onClick={handleLinkPredefinedHabit}
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    selectedGlobalHabitId 
                      ? 'bg-[#7C8363] hover:bg-[#5A5A40]' 
                      : 'bg-[#D6CFC3] cursor-not-allowed text-[#8D7F72]'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>پیوند به هدف</span>
                </button>
              </div>

              {showHabitLinkSuccess && (
                <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg block text-center font-bold">
                  عادت طلایی با موفقیت به این هدف پیوند خورد!
                </span>
              )}
            </div>

            {/* 2. Habit Lists */}
            {goal.habits && goal.habits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goal.habits.map((habit) => {
                  const isDoneToday = habit.logs.includes(TODAY_DATE);
                  return (
                    <div key={habit.id} className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E6DFD3] flex items-center justify-between gap-3 text-right">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h5 className={`text-xs font-bold leading-tight ${isDoneToday ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                            {habit.name}
                          </h5>
                          <span className="bg-[#FDFBF7] border border-[#E6DFD3] text-[#8D7F72] text-[8px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0 font-mono">
                            <Flame className="w-2.5 h-2.5 text-[#9B6B61] fill-[#F4E9E4]" />
                            <span>{habit.streak} روز زنجیره</span>
                          </span>
                        </div>
                        {habit.description && (
                          <p className="text-[10px] text-[#8D7F72] mt-1 pr-1 leading-snug line-clamp-2">{habit.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleHabitLogInGoal(goal.id, habit.id, TODAY_DATE)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            isDoneToday
                              ? 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]'
                              : 'bg-white border-[#D6CFC3] text-[#3D3D3D] hover:bg-[#E8ECE0]'
                          }`}
                        >
                          {isDoneToday ? 'انجام شد ✓' : 'انجام امروز'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteHabitFromGoal(goal.id, habit.id)}
                          className="text-[#8D7F72] hover:text-[#9B6B61] p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-[#FDFBF7] border border-dashed border-[#D6CFC3] rounded-3xl text-[11px] text-[#8D7F72]">
                هنوز عادتی به این هدف پیوند نخورده است. می‌توانید از فرم بالا یا فرم ساخت عادت زیر استفاده کنید.
              </div>
            )}

            {/* 3. Form to Create and Link Habit */}
            <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-3 max-w-md mx-auto">
              <h5 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                <span>تعریف و پیوند عادت اختصاصی جدید</span>
              </h5>
              
              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="عنوان عادت (مثلاً: ۲۰ دقیقه مطالعه کتاب مالی)"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
                <input 
                  type="text"
                  placeholder="توضیحات و فرآیند پاداش عادت"
                  value={newHabitDesc}
                  onChange={e => setNewHabitDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
                <button 
                  onClick={handleCreateHabit}
                  className="w-full py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  ثبت و پیوند عادت جدید
                </button>
              </div>
            </div>

          </div>
        )}

        {/* WORKSPACE CONTENT: MILESTONES (CHRONO STEPPERS) */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <div className="bg-[#FDFBF7] p-4.5 rounded-3xl border border-[#E6DFD3] space-y-3">
              <div className="flex justify-between items-center text-xs font-extrabold text-[#2D3025]">
                <span>لیست خرده‌گام‌ها ({milestonesDone} از {milestonesTotal})</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {goal.milestones.length > 0 ? (
                  goal.milestones.map((milestone) => (
                    <div 
                      key={milestone.id}
                      onClick={() => onToggleMilestone(goal.id, milestone.id)}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-[#E8ECE0]/20 border border-[#E6DFD3] rounded-2xl cursor-pointer transition-all"
                    >
                      {milestone.completed ? (
                        <CheckSquare className="w-4 h-4 text-[#7C8363] fill-[#E8ECE0] shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#8D7F72] shrink-0" />
                      )}
                      <span className={`text-xs font-bold ${milestone.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'}`}>
                        {milestone.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 bg-white/40 border border-dashed border-[#D6CFC3] rounded-xl text-[10px] text-[#8D7F72]">
                    هنوز خرده‌گامی ایجاد نشده است.
                  </div>
                )}
              </div>

              {/* Add Milestone box */}
              <div className="flex gap-2 pt-2 border-t border-[#E6DFD3]/30">
                <input 
                  type="text"
                  placeholder="عنوان گام فرعی جدید..."
                  value={newMilestoneText}
                  onChange={e => setNewMilestoneText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddMilestone();
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                />
                <button 
                  onClick={handleAddMilestone}
                  className="px-4 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT: QUANTITATIVE METRICS & LINE CHART LOGBOOK */}
        {activeTab === 'metrics' && (
          <div className="space-y-6 animate-fade-in" id="quantitative-metrics-panel">
            {!goal.metric ? (
              /* Setup Metric Onboarding */
              <div className="bg-[#FDFBF7] p-6 rounded-3xl border border-[#E6DFD3] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E8ECE0] text-[#7C8363] flex items-center justify-center text-lg shrink-0">
                    📈
                  </div>
                  <div className="text-right space-y-1">
                    <h4 className="text-xs font-black text-[#2D3025]">شروع ردیابی عددی و لاگ‌پک پیشرفت هدف</h4>
                    <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                      برای اهدافی مانند وزن بدنی، حجم پس‌انداز مالی، ساعات هفتگی ورزش یا تعداد صفحات مطالعه کتاب، می‌توانید یک سنجه با مقادیر شروع و هدف تعریف کرده و با ثبت لاگ‌های پیشرفت روزانه یا اتصال خودکار به بخش‌های دیگر اپلیکیشن، نمودار روند رسیدن به هدف را به شکل بصری ردیابی کنید.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E6DFD3]/30 pt-4 space-y-3">
                  <h5 className="text-[10px] font-black text-[#2D3025] text-right">تنظیمات سنجه کمی پیشرفت</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1 text-right">
                      <label className="text-[9px] font-bold text-[#8D7F72] block">نام سنجه (مثلاً: وزن بدنی، ساعت مطالعه)</label>
                      <input 
                        type="text"
                        placeholder="وزن بدنی"
                        value={metricNameInput}
                        onChange={e => setMetricNameInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[9px] font-bold text-[#8D7F72] block">واحد اندازه‌گیری (مثلاً: کیلوگرم، ساعت، صفحه)</label>
                      <input 
                        type="text"
                        placeholder="کیلوگرم"
                        value={metricUnitInput}
                        onChange={e => setMetricUnitInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[9px] font-bold text-[#8D7F72] block">مقدار اولیه (شروع)</label>
                      <input 
                        type="number"
                        step="any"
                        placeholder="95"
                        value={metricStartInput}
                        onChange={e => setMetricStartInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="text-[9px] font-bold text-[#8D7F72] block">مقدار هدف (مقصد)</label>
                      <input 
                        type="number"
                        step="any"
                        placeholder="84"
                        value={metricTargetInput}
                        onChange={e => setMetricTargetInput(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const start = parseFloat(metricStartInput) || 0;
                      const target = parseFloat(metricTargetInput) || 0;
                      if (!metricNameInput || !metricUnitInput) return;

                      const initialMetric: GoalMetric = {
                        name: metricNameInput,
                        unit: metricUnitInput,
                        startValue: start,
                        targetValue: target,
                        currentValue: start,
                        logs: [
                          {
                            id: `ml-${Date.now()}`,
                            date: TODAY_DATE,
                            value: start,
                            note: 'نقطه شروع مسیر هدف'
                          }
                        ],
                        autoTrackSource: 'none'
                      };

                      onUpdateGoal({
                        ...goal,
                        metric: initialMetric
                      });
                    }}
                    className="w-full mt-2 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>ایجاد و فعال‌سازی سنجه پیشرفت هدف</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Metric Log & Chart Dashboard */
              <div className="space-y-6">
                
                {/* 1. Automated Integration Settings Widget */}
                <div className="bg-[#E8ECE0]/30 p-5 rounded-3xl border border-[#DDE2D5] space-y-4 text-right">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#7C8363] animate-pulse" />
                      <span>یکپارچه‌سازی و همگام‌سازی خودکار داده‌های زندگی</span>
                    </h4>
                    
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      فعال‌سازی هوشمند جریان داده
                    </span>
                  </div>

                  <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                    با اتصال این هدف به بخش‌های مربوطه، مقدار پیشرفت سنجه شما به صورت خودکار و زنده بر اساس لاگ‌های آن بخش محاسبه خواهد شد و نیازی به ثبت دستی تغییرات نخواهید داشت.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-[#E6DFD3]/60">
                    <div className="space-y-1 text-right">
                      <label className="text-[10px] font-bold text-[#8D7F72] block">منبع ورود زنده داده‌ها (اتصال به):</label>
                      <select 
                        value={goal.metric.autoTrackSource || 'none'}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          let unit = goal.metric!.unit;
                          if (val === 'bank_balance') unit = 'تومان';
                          if (val === 'workout_count') unit = 'جلسه';
                          if (val === 'workout_calories') unit = 'کیلوکالری';
                          if (val === 'workout_distance') unit = 'کیلومتر';
                          if (val === 'strength_max_weight') unit = 'کیلوگرم';
                          if (val === 'sleep_hours') unit = 'ساعت';
                          if (val === 'sleep_quality') unit = 'امتیاز';
                          if (val === 'meditation_minutes') unit = 'دقیقه';
                          if (val === 'journal_mood') unit = 'عدد یادداشت';

                          onUpdateGoal({
                            ...goal,
                            metric: {
                              ...goal.metric!,
                              autoTrackSource: val,
                              unit
                            }
                          });
                        }}
                        className="w-full text-xs px-3 py-2 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-bold text-[#3D3D3D]"
                      >
                        <option value="none">✍️ ثبت دستی و لاگ شخصی شما</option>
                        <option value="composite_health">🌀 هدف چندبعدی: ترکیب هوشمند خواب + باشگاه + عاطفه و ذهن‌آگاهی</option>
                        <option value="workout_count">🏋️ باشگاه: تعداد جلسات تمرین در باشگاه</option>
                        <option value="workout_calories">🔥 باشگاه: کل کالری سوزانده شده در تمرینات</option>
                        <option value="workout_distance">🏃 باشگاه: کل مسافت دویدن و پیاده‌روی (کیلومتر)</option>
                        <option value="strength_max_weight">💪 باشگاه: رکورد بیشترین وزنه برداشته شده در یک تمرین</option>
                        <option value="sleep_hours">💤 خواب: میانگین ساعات خواب شبانه</option>
                        <option value="sleep_quality">⭐ خواب: میانگین امتیاز کیفیت خواب</option>
                        <option value="meditation_minutes">🧘 ذهن‌آگاهی: کل دقایق مراقبه و مدیتیشن</option>
                        <option value="journal_mood">📝 ژورنال روزانه: تعداد کل یادداشت‌های ثبت شده</option>
                        <option value="bank_balance">💳 امور مالی: موجودی زنده حساب بانکی متصل</option>
                      </select>
                    </div>

                    {goal.metric.autoTrackSource === 'strength_max_weight' && (
                      <div className="space-y-1 text-right animate-fade-in">
                        <label className="text-[10px] font-bold text-[#8D7F72] block">نام تمرین هدف در باشگاه:</label>
                        <input 
                          type="text"
                          placeholder="مثلاً: پرس سینه، اسکوات، ددلیفت"
                          value={goal.metric.autoTrackExerciseName || ''}
                          onChange={(e) => {
                            onUpdateGoal({
                              ...goal,
                              metric: {
                                ...goal.metric!,
                                autoTrackExerciseName: e.target.value
                              }
                            });
                          }}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                        />
                        <span className="text-[8px] text-[#8D7F72] block">سیستم بیشترین وزنه ثبت شده برای این تمرین را به عنوان معیار پیشرفت هدف قرار می‌دهد.</span>
                      </div>
                    )}

                    {goal.metric.autoTrackSource === 'bank_balance' && (
                      <div className="space-y-1 text-right animate-fade-in flex flex-col justify-end">
                        <span className="text-[9px] text-[#7C8363] bg-[#E8ECE0]/50 p-2 rounded-lg border border-[#DDE2D5] font-semibold block">
                          {goal.linkedBankAccountId ? (
                            `حساب متصل فعلی: ${linkedAccount?.bankName || 'نامشخص'} (با موجودی ${linkedAccount?.balance.toLocaleString('fa-IR')} تومان)`
                          ) : (
                            '⚠️ ابتدا باید از بالای همین صفحه یک حساب بانکی به این هدف متصل کنید تا همگام‌سازی زنده موجودی کار کند.'
                          )}
                        </span>
                      </div>
                    )}

                    {goal.metric.autoTrackSource === 'composite_health' && (() => {
                      const details = getCompositeHealthDetails();
                      return (
                        <div className="col-span-1 md:col-span-2 space-y-3 bg-gradient-to-r from-[#7C8363]/5 to-transparent p-4 rounded-2xl border border-[#7C8363]/20 text-right animate-fade-in">
                          <h5 className="text-[11px] font-black text-[#2D3025] flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-[#7C8363] animate-pulse" />
                            <span>آنالیز زنده شاخص ترکیبی سلامت و سبک زندگی چندبعدی</span>
                          </h5>
                          <p className="text-[9px] text-[#8D7F72] leading-relaxed">
                            این هدف همزمان به ۴ بخش حیاتی متصل است. سیستم بر اساس کارهای روزانه شما، امتیاز پویایی بین ۰ تا ۱۰۰ محاسبه می‌کند:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Workout Card */}
                            <div className="bg-white/80 p-2.5 rounded-xl border border-[#E6DFD3]/60 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[#8D7F72] flex items-center gap-1">
                                  <Dumbbell className="w-3.5 h-3.5 text-orange-600" />
                                  ورزش و باشگاه
                                </span>
                                <span className="text-[9px] font-black text-orange-600 font-mono">{details.workoutScore}٪</span>
                              </div>
                              <p className="text-[8px] text-[#8D7F72] leading-tight">
                                {details.totalWorkouts} جلسه ثبت شده (هدف: ۱۰)
                              </p>
                              <div className="w-full bg-[#E6DFD3]/40 h-1 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${details.workoutScore}%` }} />
                              </div>
                            </div>

                            {/* Sleep Card */}
                            <div className="bg-white/80 p-2.5 rounded-xl border border-[#E6DFD3]/60 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[#8D7F72] flex items-center gap-1">
                                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                                  خواب و ریکاوری
                                </span>
                                <span className="text-[9px] font-black text-indigo-600 font-mono">{details.sleepScore}٪</span>
                              </div>
                              <p className="text-[8px] text-[#8D7F72] leading-tight">
                                میانگین {details.avgSleep} ساعت (هدف: ۸ ساعت)
                              </p>
                              <div className="w-full bg-[#E6DFD3]/40 h-1 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${details.sleepScore}%` }} />
                              </div>
                            </div>

                            {/* Meditation Card */}
                            <div className="bg-white/80 p-2.5 rounded-xl border border-[#E6DFD3]/60 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[#8D7F72] flex items-center gap-1">
                                  <Brain className="w-3.5 h-3.5 text-teal-600" />
                                  مراقبه و ذهن‌آگاهی
                                </span>
                                <span className="text-[9px] font-black text-teal-600 font-mono">{details.meditationScore}٪</span>
                              </div>
                              <p className="text-[8px] text-[#8D7F72] leading-tight">
                                {details.totalMeditation} دقیقه مراقبه (هدف: ۱۲۰ د)
                              </p>
                              <div className="w-full bg-[#E6DFD3]/40 h-1 rounded-full overflow-hidden">
                                <div className="bg-[#7C8363] h-full rounded-full" style={{ width: `${details.meditationScore}%` }} />
                              </div>
                            </div>

                            {/* Journaling Card */}
                            <div className="bg-white/80 p-2.5 rounded-xl border border-[#E6DFD3]/60 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-[#8D7F72] flex items-center gap-1">
                                  <PenTool className="w-3.5 h-3.5 text-[#9B6B61]" />
                                  عاطفه و ژورنال روزانه
                                </span>
                                <span className="text-[9px] font-black text-[#9B6B61] font-mono">{details.journalScore}٪</span>
                              </div>
                              <p className="text-[8px] text-[#8D7F72] leading-tight">
                                {details.totalJournal} یادداشت ثبت شده (هدف: ۵)
                              </p>
                              <div className="w-full bg-[#E6DFD3]/40 h-1 rounded-full overflow-hidden">
                                <div className="bg-[#F9F1D8]0 h-full rounded-full" style={{ width: `${details.journalScore}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {goal.metric.autoTrackSource && goal.metric.autoTrackSource !== 'none' && goal.metric.autoTrackSource !== 'strength_max_weight' && goal.metric.autoTrackSource !== 'bank_balance' && goal.metric.autoTrackSource !== 'composite_health' && (
                      <div className="flex items-center text-[#7C8363] bg-[#E8ECE0]/40 p-2 rounded-xl border border-[#DDE2D5] text-[9px] font-bold text-right col-span-1 md:col-span-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 ml-1 shrink-0" />
                        <span>سیستم هم‌اکنون در حال خواندن خودکار داده‌ها و ترسیم نمودار زمانی بر اساس کل لاگ‌های بخش مربوطه است.</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* SMART STATUS CARDS HEADER */}
                <div className="pt-2">
                  <div className="flex items-center justify-between border-r-4 border-[#7C8363] pr-2.5 mb-2">
                    <div className="text-right">
                      <h4 className="text-xs font-black text-[#2D3025]">کارت‌های وضعیت هوشمند سنجه (Smart Status)</h4>
                      <p className="text-[9px] text-[#8D7F72]">تحلیل پویا و خودکار پیشرفت بر اساس وضعیت فعلی و نقطه شروع</p>
                    </div>
                    {/* Dynamic Smart Status Indicator Pill */}
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                      goal.completed || (goal.metric.targetValue - currentMetricValue <= 0)
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse'
                        : 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]'
                    }`}>
                      {goal.completed || (goal.metric.targetValue - currentMetricValue <= 0) ? '🎯 هدف محقق شده' : '⚡ در حال پیشرفت'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3] text-right space-y-1 shadow-xs hover:border-[#7C8363]/40 transition-all">
                    <span className="text-[10px] font-bold text-[#8D7F72] block">نقطه شروع سنجه</span>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-black text-[#3D3D3D] font-mono">{goal.metric.startValue}</span>
                      <span className="text-[9px] font-bold text-[#8D7F72]">{goal.metric.unit}</span>
                    </div>
                  </div>

                  <div className="bg-[#E8ECE0]/40 p-4 rounded-2xl border border-[#DDE2D5] text-right space-y-1 shadow-xs hover:border-[#7C8363]/60 transition-all">
                    <span className="text-[10px] font-bold text-[#7C8363] block">مقدار کنونی (زنده و لحظه‌ای)</span>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-black text-[#7C8363] font-mono">
                        {currentMetricValue.toLocaleString('fa-IR')}
                      </span>
                      <span className="text-[9px] font-bold text-[#7C8363]">{goal.metric.unit}</span>
                    </div>
                  </div>

                  <div className="bg-[#F9F1D8]/40 p-4 rounded-2xl border border-[#EBE3C8] text-right space-y-1 shadow-xs hover:border-[#5A5A40]/60 transition-all">
                    <span className="text-[10px] font-bold text-[#5A5A40] block">مقدار مقصد (آرزو و هدف)</span>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-black text-[#5A5A40] font-mono">{goal.metric.targetValue.toLocaleString('fa-IR')}</span>
                      <span className="text-[9px] font-bold text-[#5A5A40]">{goal.metric.unit}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3] text-right space-y-1 shadow-xs hover:border-red-200 transition-all">
                    <span className="text-[10px] font-bold text-[#8D7F72] block">میزان باقیمانده تا هدف</span>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-lg font-black text-[#E26645] font-mono">
                        {Math.max(0, goal.metric.targetValue - currentMetricValue).toLocaleString('fa-IR')}
                      </span>
                      <span className="text-[9px] font-bold text-[#E26645]">{goal.metric.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar calculated intelligently with beautiful styling & success message */}
                {(() => {
                  const startVal = goal.metric.startValue;
                  const targetVal = goal.metric.targetValue;
                  const currentVal = currentMetricValue;
                  const diffTotal = targetVal - startVal;
                  const diffCurrent = currentVal - startVal;
                  let pct = 0;
                  if (diffTotal !== 0) {
                    pct = Math.round((diffCurrent / diffTotal) * 100);
                  }
                  pct = Math.min(100, Math.max(0, pct));

                  return (
                    <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-4 shadow-xs relative overflow-hidden">
                      {pct >= 100 && (
                        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-yellow-400 via-emerald-500 to-yellow-400 animate-pulse" />
                      )}
                      
                      <div className="flex justify-between items-center text-right">
                        <span className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                          {pct >= 100 ? (
                            <Award className="w-4 h-4 text-emerald-600 animate-bounce" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-[#7C8363]" />
                          )}
                          <span>میزان تکمیل و پیشرفت فیزیکی سنجه هدف</span>
                        </span>
                        
                        <span className="text-xs font-black text-[#7C8363] font-mono bg-[#E8ECE0] px-2.5 py-1 rounded-lg">
                          {pct}٪ طی شده
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="w-full bg-[#E6DFD3]/40 h-3 rounded-full overflow-hidden p-0.5 border border-[#E6DFD3]/60">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                              pct >= 100 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse' 
                                : 'bg-[#7C8363]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px] font-bold text-[#8D7F72] px-1 font-mono">
                          <span>شروع مسیر: {startVal.toLocaleString('fa-IR')} {goal.metric.unit}</span>
                          <span>مقصد نهایی: {targetVal.toLocaleString('fa-IR')} {goal.metric.unit}</span>
                        </div>
                      </div>

                      {pct >= 100 ? (
                        <div className="bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 flex gap-3 items-start animate-fade-in text-right">
                          <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0">
                            <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
                          </div>
                          <div className="space-y-1">
                            <h6 className="text-[11px] font-black text-emerald-900">🎉 تبریک بی‌کران! شما پیروز شدید!</h6>
                            <p className="text-[10px] text-emerald-800 leading-relaxed font-medium">
                              شما با تعهد، پشتکار و پیگیری مستمر توانستید به هدف نهایی خود یعنی ثبت مقدار {currentVal.toLocaleString('fa-IR')} {goal.metric.unit} (در برابر مقصد {targetVal.toLocaleString('fa-IR')}) برسید. این یک دستاورد طلایی در مسیر توسعه فردی شماست!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-[#E6DFD3]/60 rounded-2xl p-3 text-right flex items-center justify-between">
                          <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                            شما هم‌اکنون به مقدار زنده <span className="font-extrabold text-[#2D3025] font-mono">{currentVal.toLocaleString('fa-IR')}</span> رسیده‌اید. برای رسیدن کامل به مقصد نهایی، باید <span className="font-extrabold text-[#E26645] font-mono">{Math.max(0, targetVal - currentVal).toLocaleString('fa-IR')} {goal.metric.unit}</span> دیگر بر اساس جریان داده‌های زندگی ثبت نمایید.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* VISUAL CHART AREA - Dynamic Live Chart */}
                <div className="bg-white p-4 rounded-3xl border border-[#E6DFD3] space-y-3">
                  <div className="flex justify-between items-center text-right flex-wrap gap-2">
                    <span className="text-xs font-extrabold text-[#2D3025] flex items-center gap-1.5">
                      <LucideLineChart className="w-4 h-4 text-[#7C8363]" />
                      <span>{goal.metric.autoTrackSource === 'composite_health' ? 'نمودار همگام‌سازی چندبعدی (باشگاه + خواب + عاطفه + ذهن‌آگاهی)' : `نمودار تغییرات و روند زمانی ${goal.metric.name}`}</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#8D7F72] font-mono bg-[#F9F6EE] px-2 py-1 rounded-lg">
                      واحد سنجه: {goal.metric.unit}
                    </span>
                  </div>

                  <div className="h-64 w-full" dir="ltr">
                    {(() => {
                      const isComposite = goal.metric.autoTrackSource === 'composite_health';
                      const compositeTrend = isComposite ? getCompositeTrendData() : null;
                      const chartData = isComposite && compositeTrend
                        ? compositeTrend
                        : [...currentMetricLogs].sort((a, b) => a.date.localeCompare(b.date));

                      if (!chartData || chartData.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-[10px] text-[#8D7F72] text-center">
                            داده‌ای برای نمایش نمودار وجود ندارد. در صورت استفاده از همگام‌سازی، ابتدا چند لاگ در بخش مربوطه ثبت کنید.
                          </div>
                        );
                      }

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart
                            data={chartData as any}
                            margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#8D7F72" 
                              tick={{ fontSize: 9, fontWeight: 'bold' }} 
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="#8D7F72" 
                              tick={{ fontSize: 9, fontWeight: 'bold' }} 
                              tickLine={false} 
                              domain={['auto', 'auto']}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: '#FDFBF7', 
                                border: '1px solid #D6CFC3', 
                                borderRadius: '16px',
                                fontSize: '10px',
                                textAlign: 'right',
                                direction: 'rtl',
                                fontFamily: 'Inter, sans-serif'
                              }}
                              labelFormatter={(label) => `تاریخ: ${label}`}
                            />
                            
                            {isComposite ? (
                              <>
                                <RechartsLegend 
                                  verticalAlign="top"
                                  height={36}
                                  wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', direction: 'rtl', fontFamily: 'Inter, sans-serif' }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="شاخص کل سلامت"
                                  stroke="#7C8363"
                                  strokeWidth={3}
                                  activeDot={{ r: 6 }}
                                  dot={{ stroke: '#7C8363', strokeWidth: 2, r: 4, fill: '#fff' }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="امتیاز ورزش"
                                  stroke="#EA580C"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 4"
                                  dot={{ stroke: '#EA580C', strokeWidth: 1, r: 2, fill: '#fff' }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="امتیاز خواب"
                                  stroke="#4F46E5"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 4"
                                  dot={{ stroke: '#4F46E5', strokeWidth: 1, r: 2, fill: '#fff' }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="امتیاز ذهن‌آگاهی"
                                  stroke="#0D9488"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 4"
                                  dot={{ stroke: '#0D9488', strokeWidth: 1, r: 2, fill: '#fff' }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="امتیاز ژورنال"
                                  stroke="#D97706"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 4"
                                  dot={{ stroke: '#D97706', strokeWidth: 1, r: 2, fill: '#fff' }}
                                />
                              </>
                            ) : (
                              <>
                                <ReferenceLine 
                                  y={goal.metric.targetValue} 
                                  stroke="#E26645" 
                                  strokeDasharray="4 4" 
                                  label={{ 
                                    value: 'خط هدف', 
                                    fill: '#E26645', 
                                    fontSize: 9, 
                                    position: 'top',
                                    fontWeight: 'bold'
                                  }} 
                                />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  name={goal.metric.name}
                                  stroke="#7C8363"
                                  strokeWidth={3}
                                  activeDot={{ r: 6 }}
                                  dot={{ stroke: '#7C8363', strokeWidth: 2, r: 4, fill: '#fff' }}
                                />
                              </>
                            )}
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>

                {/* Form to log a new measurement (Only visible if tracking source is manual) */}
                {(!goal.metric.autoTrackSource || goal.metric.autoTrackSource === 'none') ? (
                  <div className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E6DFD3] space-y-3">
                    <h5 className="text-[10px] font-black text-[#2D3025] text-right flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                      <span>ثبت لاگ و اندازه‌گیری جدید سنجه</span>
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 text-right">
                        <label className="text-[9px] font-bold text-[#8D7F72] block">تاریخ اندازه‌گیری</label>
                        <PersianDatePicker
                          value={newLogDate}
                          onChange={setNewLogDate}
                        />
                      </div>

                      <div className="space-y-1 text-right">
                        <label className="text-[9px] font-bold text-[#8D7F72] block">مقدار عددی جدید ({goal.metric.unit})</label>
                        <input 
                          type="number"
                          step="any"
                          placeholder={`مثلاً: ${goal.metric.currentValue}`}
                          value={newLogValue}
                          onChange={e => setNewLogValue(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                        />
                      </div>

                      <div className="space-y-1 text-right col-span-1 md:col-span-1">
                        <label className="text-[9px] font-bold text-[#8D7F72] block">یادداشت کوتاه (کاهش وزن، تمرین عالی و...)</label>
                        <input 
                          type="text"
                          placeholder="ثبت حس و دلیل تغییر این لاگ..."
                          value={newLogNote}
                          onChange={e => setNewLogNote(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1.5 justify-end">
                      <button 
                        onClick={() => {
                          if (!goal.metric) return;
                          if (window.confirm('آیا مطمئن هستید که می‌خواهید کل ردیاب پیشرفت این هدف را بازنشانی و حذف کنید؟')) {
                            onUpdateGoal({
                              ...goal,
                              metric: undefined
                            });
                          }
                        }}
                        className="px-4 py-2 border border-[#E26645]/20 hover:bg-[#E26645]/10 text-[#E26645] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف سنجه</span>
                      </button>

                      <button 
                        onClick={() => {
                          const valNum = parseFloat(newLogValue);
                          if (isNaN(valNum) || !goal.metric) return;

                          const newLog: MetricLog = {
                            id: `ml-${Date.now()}`,
                            date: newLogDate,
                            value: valNum,
                            note: newLogNote.trim() || undefined
                          };

                          const updatedLogs = [...goal.metric.logs, newLog].sort((a, b) => a.date.localeCompare(b.date));

                          onUpdateGoal({
                            ...goal,
                            metric: {
                              ...goal.metric,
                              currentValue: valNum,
                              logs: updatedLogs
                            }
                          });

                          setNewLogValue('');
                          setNewLogNote('');
                        }}
                        className="flex-1 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>ثبت و ذخیره لاگ تغییر</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E6DFD3] flex items-center justify-between text-right gap-4 flex-wrap">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <h5 className="text-[10px] font-black text-[#2D3025] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#7C8363]" />
                        <span>در حال همگام‌سازی خودکار هوشمند</span>
                      </h5>
                      <p className="text-[9px] text-[#8D7F72]">همگام‌سازی زنده به شما کمک می‌کند بدون ثبت دستی داده‌ها، به تمرینات ورزشی، ساعات خواب، ذهن‌آگاهی و ... متصل بمانید.</p>
                    </div>

                    <button 
                      onClick={() => {
                        if (!goal.metric) return;
                        if (window.confirm('آیا مطمئن هستید که می‌خواهید کل ردیاب پیشرفت این هدف را بازنشانی و حذف کنید؟')) {
                          onUpdateGoal({
                            ...goal,
                            metric: undefined
                          });
                        }
                      }}
                      className="px-3 py-1.5 border border-[#E26645]/20 hover:bg-[#E26645]/10 text-[#E26645] text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف سنجه</span>
                    </button>
                  </div>
                )}

                {/* Log History Logbook Table */}
                {currentMetricLogs && currentMetricLogs.length > 0 && (
                  <div className="bg-white rounded-3xl border border-[#E6DFD3] overflow-hidden">
                    <div className="bg-[#F9F6EE] px-4 py-3 border-b border-[#E6DFD3] flex justify-between items-center text-right">
                      <span className="text-[10px] font-black text-[#2D3025]">لاگ‌بوک و تاریخچه کامل مقادیر سنجه</span>
                      <span className="text-[9px] font-bold text-[#8D7F72]">{currentMetricLogs.length} ثبت ثبت‌شده</span>
                    </div>
                    <div className="divide-y divide-[#E6DFD3]/40 max-h-56 overflow-y-auto">
                      {[...currentMetricLogs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => (
                        <div key={log.id} className="p-3 flex items-center justify-between hover:bg-[#F9F6EE]/30 transition-colors text-right">
                          <div className="text-right space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-[#2D3025] font-mono">{log.value.toLocaleString('fa-IR')}</span>
                              <span className="text-[10px] text-[#8D7F72]">{goal.metric?.unit}</span>
                            </div>
                            {log.note && (
                              <p className="text-[9px] text-[#8D7F72] leading-tight">{log.note}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-bold text-[#8D7F72] font-mono bg-[#E8ECE0] text-[#7C8363] px-2 py-0.5 rounded-md">
                              {log.date}
                            </span>
                            {(!goal.metric.autoTrackSource || goal.metric.autoTrackSource === 'none') && (
                              <button 
                                onClick={() => {
                                  if (!goal.metric) return;
                                  const updatedLogs = goal.metric.logs.filter(l => l.id !== log.id);
                                  let nextCurrentVal = goal.metric.currentValue;
                                  if (updatedLogs.length > 0) {
                                    const sorted = [...updatedLogs].sort((a, b) => a.date.localeCompare(b.date));
                                    nextCurrentVal = sorted[sorted.length - 1].value;
                                  } else {
                                    nextCurrentVal = goal.metric.startValue;
                                  }

                                  onUpdateGoal({
                                    ...goal,
                                    metric: {
                                      ...goal.metric,
                                      currentValue: nextCurrentVal,
                                      logs: updatedLogs
                                    }
                                  });
                                }}
                                className="p-1.5 hover:bg-[#E26645]/10 text-[#E26645]/70 hover:text-[#E26645] rounded-lg transition-colors cursor-pointer"
                                title="حذف این لاگ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Advanced Explanatory Grid: What else should goals connect to? */}
                <div className="bg-white p-5 rounded-3xl border border-[#E6DFD3] space-y-4 text-right">
                  <div className="space-y-1 text-right">
                    <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-[#9B6B61]" />
                      <span>یک هدف بزرگ، به چه چیزهای دیگری در زندگی باید وصل شود؟</span>
                    </h4>
                    <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                      اهداف انتزاعی معمولاً شکست می‌خورند، مگر اینکه به رفتارهای ملموس روزمره و سیستم‌های اندازه‌گیری وصل شوند. در زیر مهم‌ترین بخش‌هایی که باید اهداف زندگی را به آن‌ها پیوند دهید آمده است. شما می‌توانید با زدن دکمه «فعال‌سازی سریع سنجه» همین حالا یک ساختار ردیاب آماده برای این هدف بسازید:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item 1: Sleep */}
                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3]/80 space-y-3 flex flex-col justify-between text-right">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                            <Moon className="w-4 h-4" />
                          </div>
                          <h5 className="text-[11px] font-black text-[#2D3025]">خواب و ریکاوری (بهینه‌سازی انرژی روزانه)</h5>
                        </div>
                        <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                          رابطه مستقیم بین راندمان کار و خواب را بسنجید. برای اهداف تحصیلی یا شغلی، حداقل ۷ ساعت خواب باکیفیت پیش‌شرط تمرکز عمیق است.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const initialMetric: GoalMetric = {
                            name: 'کیفیت خواب شبانه',
                            unit: 'امتیاز',
                            startValue: 5,
                            targetValue: 9,
                            currentValue: 5,
                            logs: [],
                            autoTrackSource: 'sleep_quality'
                          };
                          onUpdateGoal({
                            ...goal,
                            metric: initialMetric
                          });
                        }}
                        className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                      >
                        ⚡ فعال‌سازی سریع ردیاب خواب برای این هدف
                      </button>
                    </div>

                    {/* Item 2: Mindfulness */}
                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3]/80 space-y-3 flex flex-col justify-between text-right">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                            <Brain className="w-4 h-4" />
                          </div>
                          <h5 className="text-[11px] font-black text-[#2D3025]">کاهش استرس و تقویت تمرکز (مراقبه)</h5>
                        </div>
                        <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                          رسیدن به اهداف دشوار، نیاز به تاب‌آوری ذهنی دارد. ذهن‌آگاهی روزانه استرس شما را مدیریت می‌کند تا در شرایط چالش‌برانگیز جا نزنید.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const initialMetric: GoalMetric = {
                            name: 'زمان مراقبه ذهنی',
                            unit: 'دقیقه',
                            startValue: 0,
                            targetValue: 300,
                            currentValue: 0,
                            logs: [],
                            autoTrackSource: 'meditation_minutes'
                          };
                          onUpdateGoal({
                            ...goal,
                            metric: initialMetric
                          });
                        }}
                        className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                      >
                        ⚡ فعال‌سازی سریع سنجه مدیتیشن برای این هدف
                      </button>
                    </div>

                    {/* Item 3: Journaling */}
                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3]/80 space-y-3 flex flex-col justify-between text-right">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-[#F9F1D8] text-[#5A5A40] rounded-lg">
                            <PenTool className="w-4 h-4" />
                          </div>
                          <h5 className="text-[11px] font-black text-[#2D3025]">خودآگاهی عاطفی و احساسات (ژورنال)</h5>
                        </div>
                        <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                          نوشتن احساسات و دلایل شکرگزاری روزانه، به شما کمک می‌کند که فرآیند توسعه فردی و تغییرات شخصیتی خود را به طور کیفی مستند کنید.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const initialMetric: GoalMetric = {
                            name: 'یادداشت‌های نوشته‌شده',
                            unit: 'عدد یادداشت',
                            startValue: 0,
                            targetValue: 30,
                            currentValue: 0,
                            logs: [],
                            autoTrackSource: 'journal_mood'
                          };
                          onUpdateGoal({
                            ...goal,
                            metric: initialMetric
                          });
                        }}
                        className="w-full py-1.5 bg-[#F9F1D8] hover:bg-[#F9F1D8] text-[#5A5A40] text-[10px] font-black rounded-xl transition-all cursor-pointer"
                      >
                        ⚡ فعال‌سازی سریع شمارنده ژورنال برای این هدف
                      </button>
                    </div>

                    {/* Item 4: Budget & Money */}
                    <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3]/80 space-y-3 flex flex-col justify-between text-right">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <h5 className="text-[11px] font-black text-[#2D3025]">مخارج و بودجه‌بندی (انضباط مالی زنده)</h5>
                        </div>
                        <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                          هر هدفی (حتی ورزشی یا تحصیلی) هزینه‌هایی دارد (مثل شهریه باشگاه، هزینه دوره‌ها). نظارت بر پس‌انداز و هزینه‌ها به صورت زنده، مانع غافلگیری شما می‌شود.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const initialMetric: GoalMetric = {
                            name: 'موجودی کل اهداف مالی',
                            unit: 'تومان',
                            startValue: 0,
                            targetValue: 50000000,
                            currentValue: 0,
                            logs: [],
                            autoTrackSource: 'bank_balance'
                          };
                          onUpdateGoal({
                            ...goal,
                            metric: initialMetric
                          });
                        }}
                        className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-xl transition-all cursor-pointer"
                      >
                        ⚡ فعال‌سازی سریع ردیاب حساب بانکی برای این هدف
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* WORKSPACE CONTENT: VISION BOARD */}
        {activeTab === 'vision' && (
          <div className="space-y-6 animate-fade-in" id="vision-board-panel">
            
            {/* AFFIRMATION BANNER */}
            <div className="bg-gradient-to-l from-[#7C8363] to-[#5A5A40] p-6 rounded-3xl text-white shadow-md relative overflow-hidden text-center space-y-3">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="w-16 h-16" />
              </div>
              
              <span className="text-[9px] font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full inline-block">
                جمله تاکیدی و باور انگیزشی
              </span>
              
              {goal.visionAffirmation ? (
                <p className="text-sm font-black font-serif-elegant leading-relaxed max-w-2xl mx-auto italic">
                  " {goal.visionAffirmation} "
                </p>
              ) : (
                <p className="text-xs text-white/80 leading-relaxed max-w-2xl mx-auto">
                  جملات تاکیدی به ضمیر ناخودآگاه شما کمک می‌کنند تا بر روی اهداف متمرکز بماند. یک عبارت انگیزشی کوتاه برای خود بنویسید.
                </p>
              )}

              {/* Edit Affirmation Inline */}
              <div className="pt-2 max-w-md mx-auto flex gap-2">
                <input 
                  type="text"
                  placeholder="مثال: من هر روز یک گام به استقلال مالی نزدیک‌تر می‌شوم..."
                  value={visionAffirmationInput}
                  onChange={e => setVisionAffirmationInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 focus:bg-white border border-white/20 focus:border-white text-white focus:text-[#2D3025] rounded-xl focus:outline-none transition-all placeholder-white/50 text-right"
                />
                <button 
                  onClick={() => {
                    onUpdateGoal({
                      ...goal,
                      visionAffirmation: visionAffirmationInput.trim() || undefined
                    });
                  }}
                  className="px-3.5 py-1.5 bg-white text-[#7C8363] hover:bg-[#F9F6EE] text-[10px] font-black rounded-xl cursor-pointer transition-all shrink-0"
                >
                  ذخیره باور
                </button>
              </div>
            </div>

            {/* MAIN VISION GRID */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-[#7C8363]" />
                  <span>تصاویر الهام‌بخش هدف ({(goal.visionImages || []).length})</span>
                </h4>
                <p className="text-[10px] text-[#8D7F72]">تصاویری که نمایانگر موفقیت این هدف هستند</p>
              </div>

              {goal.visionImages && goal.visionImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4" id="vision-images-grid">
                  <AnimatePresence>
                    {goal.visionImages.map((imgUrl, idx) => (
                      <motion.div 
                        key={imgUrl}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ scale: 1.02 }}
                        className="relative group aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden border border-[#E6DFD3] shadow-xs bg-slate-50"
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Vision inspiration ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        {/* Overlay and Delete Button on Hover */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 z-10">
                          <button 
                            onClick={() => {
                              onUpdateGoal({
                                ...goal,
                                visionImages: (goal.visionImages || []).filter(img => img !== imgUrl)
                              });
                            }}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-transform transform scale-95 group-hover:scale-100 shadow-lg cursor-pointer flex items-center justify-center"
                            title="حذف تصویر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-[#FDFBF7] py-12 px-6 text-center border border-dashed border-[#D6CFC3] rounded-3xl space-y-3">
                  <div className="w-12 h-12 bg-[#F9F6EE] rounded-full flex items-center justify-center mx-auto text-lg">
                    ✨
                  </div>
                  <h5 className="text-xs font-black text-[#2D3025]">برد آرزوهای خالی است!</h5>
                  <p className="text-[10px] text-[#8D7F72] max-w-sm mx-auto leading-relaxed">
                    تصویرسازی، اولین قدم به سوی واقعیت است. با استفاده از فرم زیر یا تصاویر پیشنهادی آماده، تصاویری که به شما انگیزه و الهام روزانه می‌دهند را اضافه کنید.
                  </p>
                </div>
              )}
            </div>

            {/* ADD IMAGE FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Custom Image URL Form */}
              <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-4">
                <h5 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                  <span>افزودن تصویر دلخواه جدید</span>
                </h5>

                {/* File Upload Zone */}
                <div className="border border-dashed border-[#D6CFC3] rounded-2xl p-4 text-center bg-white hover:bg-[#F9F6EE] transition-all cursor-pointer relative group">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLocalImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-1.5">
                    <Upload className="w-5 h-5 mx-auto text-[#7C8363] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-[#2D3025] block">انتخاب و آپلود عکس دلخواه</span>
                    <span className="text-[8px] text-[#8D7F72] block">روی این کادر کلیک کنید تا عکسی را از دستگاه خود بارگذاری کنید</span>
                  </div>
                </div>

                <div className="relative flex items-center my-2">
                  <div className="flex-grow border-t border-[#E6DFD3]"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-[#8D7F72] font-extrabold">یا افزودن و دانلود از لینک</span>
                  <div className="flex-grow border-t border-[#E6DFD3]"></div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                    با وارد کردن لینک عکس، همبافت آن را مستقیماً دانلود کرده و در برد ذخیره می‌کند (پیشگیری از خرابی لینک در آینده):
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={visionInputUrl}
                      disabled={isDownloadingImage}
                      onChange={e => setVisionInputUrl(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] text-left font-mono"
                    />
                    <button 
                      onClick={handleDownloadAndAddImage}
                      disabled={isDownloadingImage || !visionInputUrl.trim()}
                      className="px-4 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                    >
                      {isDownloadingImage ? 'در حال دانلود...' : 'دانلود و ثبت'}
                    </button>
                  </div>
                  {downloadError && (
                    <div className="p-2 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[9px] leading-relaxed">
                      {downloadError}
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Visual Recommendations based on Goal Category */}
              <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#EBE3C8] space-y-3">
                <h5 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#9B6B61]" />
                  <span>الهام‌بخش‌های پیشنهادی همبافت</span>
                </h5>
                <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                  تصاویر پیشنهادی مناسب با دسته‌بندی هدف شما. با کلیک بر روی هرکدام، فوراً آن را به برد خود اضافه کنید:
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const presets: Record<string, { url: string; label: string }[]> = {
                      financial: [
                        { label: 'طلا و پس‌انداز', url: 'https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=350&q=80' },
                        { label: 'رشد مالی', url: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&w=350&q=80' },
                        { label: 'خانه رویایی', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=350&q=80' }
                      ],
                      health: [
                        { label: 'دویدن و انگیزه', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=350&q=80' },
                        { label: 'غذای سالم', url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=350&q=80' },
                        { label: 'ورزش و تندرستی', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=350&q=80' }
                      ],
                      career: [
                        { label: 'دفتر کار مدرن', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=350&q=80' },
                        { label: 'برج موفقیت', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=350&q=80' },
                        { label: 'مدیریت و تلاش', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=350&q=80' }
                      ],
                      learning: [
                        { label: 'کتاب و دانایی', url: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=350&q=80' },
                        { label: 'موفقیت تحصیلی', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=350&q=80' },
                        { label: 'تمرکز و ذهن', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=350&q=80' }
                      ],
                      personal: [
                        { label: 'سفر و ماجراجویی', url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=350&q=80' },
                        { label: 'مدیتیشن و آرامش', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=350&q=80' },
                        { label: 'گرمی روابط', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=350&q=80' }
                      ],
                      other: [
                        { label: 'مسیر طبیعت', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=350&q=80' },
                        { label: 'طلوع آفتاب', url: 'https://images.unsplash.com/photo-1472214222541-d510753a8707?auto=format&fit=crop&w=350&q=80' },
                        { label: 'آرامش کوهستان', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=350&q=80' }
                      ]
                    };

                    const list = presets[goal.category] || presets.other;
                    return list.map(item => {
                      const isAdded = (goal.visionImages || []).includes(item.url);
                      return (
                        <button
                          key={item.url}
                          disabled={isAdded}
                          type="button"
                          onClick={() => {
                            const current = goal.visionImages || [];
                            onUpdateGoal({
                              ...goal,
                              visionImages: [...current, item.url]
                            });
                          }}
                          className={`group/preset relative aspect-square rounded-xl overflow-hidden border transition-all text-right flex flex-col justify-end p-1.5 cursor-pointer ${
                            isAdded ? 'opacity-40 border-green-500 scale-95' : 'border-[#E6DFD3] hover:border-[#7C8363] hover:scale-[1.02]'
                          }`}
                        >
                          <img 
                            src={item.url} 
                            alt={item.label}
                            className="absolute inset-0 w-full h-full object-cover z-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/30 z-1 group-hover/preset:bg-black/10 transition-colors" />
                          <span className="relative z-2 text-[8px] font-bold text-white leading-tight bg-black/40 px-1 py-0.5 rounded-md truncate max-w-full">
                            {isAdded ? '✓ افزوده شد' : item.label}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* WORKSPACE CONTENT: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4 animate-fade-in">
            <EntityNoteEditor
              entityId={goal.id}
              entityType="goal"
              title="یادداشت‌ها و جزئیات هدف (Notion)"
              initialBlocks={goal.noteBlocks}
              onSave={(blocks) => onUpdateGoal({ ...goal, noteBlocks: blocks })}
            />
          </div>
        )}

        {/* WORKSPACE CONTENT: GOAL CONFIGURATION */}

        {/* Linked Contacts - shown across all tabs */}
        {goal.id && (
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/30">
            <LinkedContacts entityType="goal" entityId={goal.id} contacts={contacts} onNavigateContact={(contactId) => onNavigateEntity?.('contacts', contactId)} />
            <div className="mt-3 pt-3 border-t border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
              <PartnerManager goalId={goal.id} />
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-5 animate-fade-in" id="goal-config-panel">
            {/* Goal Type & Progress Mode */}
            <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-4">
              <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#7C8363]" />
                <span>نوع هدف و حالت محاسبه پیشرفت</span>
              </h4>
              <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                نوع هدف نحوه دسته‌بندی و رهگیری آن را مشخص می‌کند. حالت پیشرفت تعیین می‌کند پیشرفت هدف چگونه محاسبه شود: دستی، بر اساس سنجه عددی، تجمیع از عادت‌ها، پروژه‌ها، حساب‌های مالی یا ترکیب وزنی.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">نوع هدف</label>
                  <select
                    value={editGoalType}
                    onChange={e => setEditGoalType(e.target.value as GoalType)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  >
                    <option value="outcome">نتیجه‌ای (خروجی محور)</option>
                    <option value="metric">سنجه‌ای (عددی کمی)</option>
                    <option value="habit_driven">مبتنی بر عادت</option>
                    <option value="project_delivery">تحویل پروژه</option>
                    <option value="savings">پس‌انداز مالی</option>
                    <option value="investment">سرمایه‌گذاری</option>
                    <option value="debt_payoff">پرداخت بدهی</option>
                    <option value="health">سلامت</option>
                    <option value="learning">یادگیری</option>
                    <option value="consistency">ثبات و استمرار</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">حالت محاسبه پیشرفت</label>
                  <select
                    value={editProgressMode}
                    onChange={e => setEditProgressMode(e.target.value as ProgressMode)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  >
                    <option value="manual">دستی</option>
                    <option value="metric_value">مقدار سنجه (عددی)</option>
                    <option value="habit_rollup">تجمیع از عادت‌ها</option>
                    <option value="project_rollup">تجمیع از پروژه‌ها</option>
                    <option value="finance_balance">موجودی مالی</option>
                    <option value="finance_savings">پس‌انداز مالی</option>
                    <option value="debt_paydown">پرداخت بدهی</option>
                    <option value="weighted_composite">ترکیب وزنی (مرکب)</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">اولویت</label>
                  <select
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  >
                    <option value="low">پایین</option>
                    <option value="medium">متوسط</option>
                    <option value="high">بالا</option>
                    <option value="urgent">فوری</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">سطح هدف</label>
                  <select
                    value={editGoalLevel}
                    onChange={e => setEditGoalLevel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  >
                    <option value="none">بدون سطح‌بندی</option>
                    <option value="annual">سالانه</option>
                    <option value="quarterly">فصلی</option>
                    <option value="monthly">ماهانه</option>
                    <option value="custom">سفارشی</option>
                  </select>
                </div>
              </div>

              {/* Target / Current Values for metric goals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#E6DFD3]/40 pt-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">مقدار هدف (تارگت)</label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="مثلاً: 84"
                    value={editTargetValue}
                    onChange={e => setEditTargetValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">مقدار فعلی</label>
                  <input 
                    type="number"
                    step="any"
                    placeholder="مثلاً: 90"
                    value={editCurrentValue}
                    onChange={e => setEditCurrentValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">واحد اندازه‌گیری</label>
                  <input 
                    type="text"
                    placeholder="مثلاً: کیلوگرم، ساعت، تومان"
                    value={editUnit}
                    onChange={e => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  onUpdateGoal({
                    ...goal,
                    goalType: editGoalType,
                    progressMode: editProgressMode,
                    priority: editPriority,
                    goalLevel: editGoalLevel !== 'none' ? (editGoalLevel as any) : undefined,
                    targetValue: editTargetValue ? Number(editTargetValue) : undefined,
                    currentValue: editCurrentValue ? Number(editCurrentValue) : undefined,
                    unit: editUnit || undefined,
                  });
                }}
                className="w-full py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer"
              >
                ذخیره تنظیمات پیکربندی
              </button>
            </div>

            {/* SIGNAL WEIGHTS CONFIG */}
            <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-4">
              <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#7C8363]" />
                <span>وزن‌دهی سیگنال‌های پیشرفت (مرکب وزنی)</span>
              </h4>
              <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                وقتی حالت پیشرفت «ترکیب وزنی» باشد، این وزن‌ها تعیین می‌کنند هر سیگنال چقدر در درصد پیشرفت نهایی تأثیر داشته باشد. مجموع وزن‌ها ترجیحاً ۱۰۰ باشد.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'پیشرفت پروژه‌ها', icon: FolderKanban, value: editProjectProgressWeight, setter: setEditProjectProgressWeight, color: 'text-[#7C8363]', default: 40 },
                  { label: 'نقاط عطف (مایلستون)', icon: Flag, value: editMilestoneWeight, setter: setEditMilestoneWeight, color: 'text-emerald-600', default: 25 },
                  { label: 'تسک‌های کلیدی', icon: CheckSquare, value: editKeyTaskWeight, setter: setEditKeyTaskWeight, color: 'text-[#9B6B61]', default: 20 },
                  { label: 'زمان ردیابی‌شده', icon: Clock, value: editTrackedTimeWeight, setter: setEditTrackedTimeWeight, color: 'text-blue-600', default: 10 },
                  { label: 'سنجه عددی', icon: Activity, value: editMetricWeight, setter: setEditMetricWeight, color: 'text-purple-600', default: 5 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                    <span className="text-[10px] font-bold text-[#2D3025] w-32 shrink-0">{item.label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Number(item.value) || item.default}
                      onChange={e => item.setter(e.target.value)}
                      className="flex-1 h-1.5 accent-[#7C8363]"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.value}
                      onChange={e => item.setter(e.target.value)}
                      className="w-14 px-2 py-1 text-xs bg-white border border-[#D6CFC3] rounded-lg text-center font-mono"
                    />
                    <span className="text-[9px] text-[#8D7F72] font-bold w-4">%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD3]/40">
                <span className="text-[10px] font-bold text-[#8D7F72]">
                  مجموع: {(Number(editProjectProgressWeight) || 0) + (Number(editMilestoneWeight) || 0) + (Number(editKeyTaskWeight) || 0) + (Number(editTrackedTimeWeight) || 0) + (Number(editMetricWeight) || 0)}%
                </span>
                <button
                  onClick={handleSaveSignalWeights}
                  disabled={isSavingWeights}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl cursor-pointer transition-all ${isSavingWeights ? 'bg-[#D6CFC3]' : 'bg-[#7C8363] hover:bg-[#5A5A40]'}`}
                >
                  {isSavingWeights ? 'در حال ذخیره...' : 'ذخیره وزن‌ها'}
                </button>
              </div>
            </div>

            {/* COMPLETION POLICY CONFIG */}
            <div className="bg-[#F9F1D8]/20 p-5 rounded-3xl border border-[#EBE3C8] space-y-4">
              <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#5A5A40]" />
                <span>سیاست تکمیل هدف</span>
              </h4>
              <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                تعیین کنید در چه شرایطی این هدف «تکمیل‌شده» محسوب می‌شود. هر سیاست معیار متفاوتی دارد.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">سیاست تکمیل</label>
                  <select
                    value={editCompletionPolicy}
                    onChange={e => setEditCompletionPolicy(e.target.value as CompletionPolicy)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  >
                    <option value="threshold">آستانه پیشرفت (فقط درصد)</option>
                    <option value="threshold_plus_mandatory">آستانه + پروژه‌های اجباری</option>
                    <option value="metric_plus_mandatory">سنجه عددی + پروژه‌های اجباری</option>
                    <option value="all_projects">همه پروژه‌ها تکمیل شوند</option>
                    <option value="threshold_plus_milestones">آستانه + نقاط عطف پروژه</option>
                  </select>
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">آستانه پیشرفت (درصد)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editCompletionThreshold}
                    onChange={e => setEditCompletionThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveCompletionPolicy}
                disabled={isSavingPolicy}
                className={`w-full py-2 text-xs font-bold text-white rounded-xl cursor-pointer transition-all ${isSavingPolicy ? 'bg-[#D6CFC3]' : 'bg-[#5A5A40] hover:bg-[#3D3D28]'}`}
              >
                {isSavingPolicy ? 'در حال ذخیره...' : 'ذخیره سیاست تکمیل'}
              </button>
            </div>

            {/* GOAL TREND & SNAPSHOTS */}
            <div className="bg-[#E8ECE0]/30 p-5 rounded-3xl border border-[#DDE2D5] space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#7C8363]" />
                  <span>تاریخچه و روند پیشرفت هدف</span>
                </h4>
                <button
                  onClick={handleLoadSnapshots}
                  disabled={isLoadingSnapshots}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${isLoadingSnapshots ? 'bg-[#D6CFC3] text-[#8D7F72]' : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'}`}
                >
                  {isLoadingSnapshots ? 'در حال بارگذاری...' : 'بارگذاری اسنپ‌شات‌ها'}
                </button>
              </div>

              {goalTrend.length > 0 && (
                <div className="bg-white p-3 rounded-2xl border border-[#E6DFD3]">
                  <div className="flex items-center gap-1 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#7C8363]" />
                    <span className="text-[10px] font-bold text-[#2D3025]">روند ۳۰ روز اخیر</span>
                  </div>
                  <div className="h-24 flex items-end gap-1" dir="ltr">
                    {goalTrend.slice(-30).map((t, i) => {
                      const pct = t.progress_percent ?? t.progressPct ?? 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-[#7C8363]/60 hover:bg-[#7C8363] rounded-t transition-all min-w-[3px]"
                          style={{ height: `${Math.max(2, pct)}%` }}
                          title={`${t.snapshot_date || t.date}: ${pct}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {goalSnapshots.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E6DFD3] overflow-hidden">
                  <div className="bg-[#F9F6EE] px-3 py-2 border-b border-[#E6DFD3] flex justify-between items-center">
                    <span className="text-[10px] font-black text-[#2D3025]">اسنپ‌شات‌های اخیر</span>
                    <span className="text-[8px] text-[#8D7F72] font-bold">{goalSnapshots.length} ثبت</span>
                  </div>
                  <div className="divide-y divide-[#E6DFD3]/40 max-h-40 overflow-y-auto">
                    {goalSnapshots.map((s, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#7C8363] font-mono">{(s.progress_percent ?? s.progressPct ?? 0).toFixed(0)}%</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${getHealthStateColor(s.health_state ? ({'در_مسیر':'on_track','در_خطر':'at_risk','خارج_از_مسیر':'off_track','نیاز_به_بررسی':'needs_review'}[s.health_state] as GoalHealthState) : undefined)}`}>
                            {s.health_state || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-[#8D7F72]">{s.trigger_type || ''}</span>
                          <span className="text-[9px] text-[#8D7F72] font-mono">{(s.snapshot_date || '').slice(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Computed Progress Section */}
            <div className="bg-[#E8ECE0]/30 p-5 rounded-3xl border border-[#DDE2D5] space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#7C8363]" />
                  <span>پیشرفت محاسبه‌شده (از بک‌اند)</span>
                </h4>
                <button
                  onClick={handleComputeProgress}
                  disabled={isComputing}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
                    isComputing ? 'bg-[#D6CFC3] cursor-not-allowed' : 'bg-[#7C8363] hover:bg-[#5A5A40]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{isComputing ? 'در حال محاسبه...' : 'محاسبه مجدد پیشرفت'}</span>
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#8D7F72]">درصد پیشرفت فعلی:</span>
                  <span className="text-sm font-black text-[#7C8363] font-mono">{goal.progressPercent?.toFixed(1) ?? percentage}%</span>
                </div>
                <div className="w-full h-3 bg-[#F9F6EE] rounded-full overflow-hidden border border-[#E6DFD3]/60">
                  <div 
                    className="h-full bg-gradient-to-l from-[#7C8363] to-[#5A5A40] transition-all duration-700 rounded-full"
                    style={{ width: `${Math.min(100, goal.progressPercent ?? percentage)}%` }}
                  />
                </div>

                {computedProgress && (
                  <div className="bg-[#F9F6EE] p-3 rounded-xl border border-[#DDE2D5] text-[9px] font-mono text-[#8D7F72] max-h-40 overflow-y-auto" dir="ltr">
                    {JSON.stringify(computedProgress.detail, null, 2)}
                  </div>
                )}

                {goal.derivedProgressDetail && !computedProgress && (
                  <details className="text-[9px]">
                    <summary className="text-[10px] font-bold text-[#8D7F72] cursor-pointer hover:text-[#5A5A40]">جزئیات محاسبه ذخیره‌شده</summary>
                    <div className="mt-2 bg-[#F9F6EE] p-3 rounded-xl border border-[#DDE2D5] font-mono text-[#8D7F72] max-h-40 overflow-y-auto" dir="ltr">
                      {(() => { try { return JSON.stringify(JSON.parse(goal.derivedProgressDetail), null, 2); } catch { return goal.derivedProgressDetail; } })()}
                    </div>
                  </details>
                )}
              </div>

              {/* Linked Habits from backend */}
              {(goal.linkedHabits || []).length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black text-[#2D3025] flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#9B6B61]" />
                    <span>عادت‌های پیوندی ({goal.linkedHabits!.length})</span>
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {goal.linkedHabits!.map((lh, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-[#E6DFD3] flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#2D3025]">{lh.habitTitle || lh.habit}</span>
                            <span className="text-[8px] font-bold bg-[#E8ECE0] text-[#7C8363] px-1.5 py-0.5 rounded-md">{lh.contributionType}</span>
                            <span className="text-[8px] font-bold bg-[#F9F1D8] text-[#5A5A40] px-1.5 py-0.5 rounded-md">{lh.period} · وزن: {lh.weight}%</span>
                          </div>
                          {lh.targetValue && (
                            <span className="text-[9px] text-[#8D7F72] block mt-0.5">هدف: {lh.targetValue} {lh.isNegative ? '(معکوس)' : ''}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnlinkHabit(lh.habit)}
                          disabled={!!isUnlinkingHabit}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          title="قطع پیوند عادت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Projects from backend — Rich with weights & contribution data */}
              {(goal.linkedProjects || []).length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-black text-[#2D3025] flex items-center gap-1">
                    <FolderKanban className="w-3.5 h-3.5 text-[#9B6B61]" />
                    <span>پروژه‌های پیوندی ({goal.linkedProjects!.length}) — تجزیه مشارکت</span>
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {goal.linkedProjects!.map((lp, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-[#E6DFD3] space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#2D3025]">{lp.title}</span>
                            {lp.contributionType && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md border ${getContributionTypeBadge(lp.contributionType)}`}>
                                {getContributionTypeLabel(lp.contributionType)}
                              </span>
                            )}
                            {lp.isMandatory && (
                              <span className="text-[8px] font-bold bg-red-50 border border-red-100 text-red-600 px-1.5 py-0.5 rounded-md">اجباری</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {lp.progress != null && (
                              <span className="text-[9px] text-[#8D7F72]">پیشرفت: {lp.progress}%</span>
                            )}
                            {lp.weight != null && (
                              <span className="text-[8px] font-bold bg-[#F9F1D8] text-[#5A5A40] px-1.5 py-0.5 rounded-md">وزن: {lp.weight}%</span>
                            )}
                          </div>
                        </div>
                        {/* Project stats row */}
                        <div className="flex flex-wrap gap-3 text-[9px] text-[#8D7F72] font-semibold">
                          {lp.totalTasks != null && <span>تسک: {lp.doneTasks ?? 0}/{lp.totalTasks}</span>}
                          {lp.milestoneTotal != null && <span>نقطه‌عطف: {lp.milestoneDone ?? 0}/{lp.milestoneTotal}</span>}
                          {lp.keyTotal != null && <span>کلیدی: {lp.keyDone ?? 0}/{lp.keyTotal}</span>}
                          {lp.actualMinutes != null && <span>زمان واقعی: {lp.actualMinutes} دقیقه</span>}
                          {lp.estimatedHours != null && <span>برآورد: {lp.estimatedHours} ساعت</span>}
                          {lp.effortType && <span>نوع: {lp.effortType === 'fixed' ? 'ثابت' : 'متغیر'}</span>}
                        </div>
                        {/* Progress bar */}
                        {lp.progress != null && (
                          <div className="w-full bg-[#E6DFD3]/40 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#9B6B61] h-full rounded-full transition-all" style={{ width: `${Math.min(100, lp.progress)}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Habit Link Form */}
              <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
                <h5 className="text-[10px] font-black text-[#2D3025] flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5 text-[#7C8363]" />
                  <span>پیوند عادت جدید (با تنظیمات مشارکت)</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">انتخاب عادت</label>
                    <select
                      value={linkHabitId}
                      onChange={e => setLinkHabitId(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="">-- انتخاب عادت --</option>
                      {globalHabits.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">نوع مشارکت</label>
                    <select
                      value={linkContributionType}
                      onChange={e => setLinkContributionType(e.target.value as ContributionType)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="completion_count">تعداد انجام</option>
                      <option value="completion_rate">نرخ انجام</option>
                      <option value="streak">رکورد (زنجیره)</option>
                      <option value="quantity_sum">مجموع مقدار</option>
                      <option value="average_value">میانگین مقدار</option>
                      <option value="boolean_success">بله/خیر</option>
                    </select>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">دوره سنجش</label>
                    <select
                      value={linkContributionPeriod}
                      onChange={e => setLinkContributionPeriod(e.target.value as ContributionPeriod)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="daily">روزانه</option>
                      <option value="weekly">هفتگی</option>
                      <option value="monthly">ماهانه</option>
                      <option value="all">کل دوره</option>
                    </select>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">مقدار هدف (اختیاری)</label>
                    <input 
                      type="number" step="any" placeholder="مثلاً: 30"
                      value={linkTargetValue}
                      onChange={e => setLinkTargetValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLinkHabit}
                  disabled={!linkHabitId || isLinkingHabit}
                  className={`w-full py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    linkHabitId && !isLinkingHabit ? 'bg-[#7C8363] hover:bg-[#5A5A40]' : 'bg-[#D6CFC3] cursor-not-allowed'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{isLinkingHabit ? 'در حال پیوند...' : 'پیوند عادت به هدف'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE CONTENT: FINANCE LINKS */}
        {activeTab === 'finance_links' && (
          <div className="space-y-5 animate-fade-in" id="goal-finance-links-panel">
            <div className="bg-[#F9F1D8]/30 p-5 rounded-3xl border border-[#EBE3C8] space-y-4">
              <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#5A5A40]" />
                <span>حساب‌های مالی پیوندی به هدف</span>
              </h4>
              <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                با پیوند حساب‌های مالی به این هدف، پیشرفت به صورت خودکار از روی موجودی، پس‌انداز یا پرداخت بدهی محاسبه می‌شود.
              </p>

              {/* Existing Finance Links */}
              {(goal.linkedFinanceAccounts || []).length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {goal.linkedFinanceAccounts!.map((fl, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-[#E6DFD3] flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#2D3025]">{fl.accountName || fl.financeAccount}</span>
                          <span className="text-[8px] font-bold bg-[#E8ECE0] text-[#7C8363] px-1.5 py-0.5 rounded-md">{fl.financeType}</span>
                          <span className="text-[8px] font-bold bg-[#F9F1D8] text-[#5A5A40] px-1.5 py-0.5 rounded-md">وزن: {fl.weight}%</span>
                        </div>
                        <div className="flex gap-4 mt-1 text-[9px] text-[#8D7F72]">
                          {fl.initialAmount != null && <span>ابتدایی: {fl.initialAmount.toLocaleString('fa-IR')}</span>}
                          {fl.targetAmount != null && <span>هدف: {fl.targetAmount.toLocaleString('fa-IR')}</span>}
                          {fl.currentBalance != null && <span>موجودی فعلی: {fl.currentBalance.toLocaleString('fa-IR')}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlinkFinance(fl.financeAccount)}
                        disabled={!!isUnlinkingFinance}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                        title="قطع پیوند حساب مالی"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white/40 border border-dashed border-[#D6CFC3] rounded-3xl text-[10px] text-[#8D7F72]">
                  هنوز حساب مالی به این هدف پیوند نخورده است.
                </div>
              )}

              {/* Add Finance Link Form */}
              <div className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
                <h5 className="text-[10px] font-black text-[#2D3025] flex items-center gap-1">
                  <PlusCircle className="w-3.5 h-3.5 text-[#7C8363]" />
                  <span>پیوند حساب مالی جدید</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">انتخاب حساب</label>
                    <select
                      value={linkFinanceAccountId}
                      onChange={e => setLinkFinanceAccountId(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="">-- انتخاب حساب مالی --</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">نوع ارتباط مالی</label>
                    <select
                      value={linkFinanceType}
                      onChange={e => setLinkFinanceType(e.target.value as GoalFinanceLink['financeType'])}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    >
                      <option value="balance">موجودی حساب</option>
                      <option value="savings">پس‌انداز</option>
                      <option value="debt">بدهی</option>
                      <option value="investment">سرمایه‌گذاری</option>
                      <option value="income_accumulated">درآمد انباشته</option>
                    </select>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">مبلغ اولیه (اختیاری)</label>
                    <input 
                      type="number" step="any" placeholder="مثلاً: 50000000"
                      value={linkFinanceInitialAmount}
                      onChange={e => setLinkFinanceInitialAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[9px] font-bold text-[#8D7F72]">مبلغ هدف (اختیاری)</label>
                    <input 
                      type="number" step="any" placeholder="مثلاً: 100000000"
                      value={linkFinanceTargetAmount}
                      onChange={e => setLinkFinanceTargetAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-mono text-left"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLinkFinance}
                  disabled={!linkFinanceAccountId || isLinkingFinance}
                  className={`w-full py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    linkFinanceAccountId && !isLinkingFinance ? 'bg-[#7C8363] hover:bg-[#5A5A40]' : 'bg-[#D6CFC3] cursor-not-allowed'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isLinkingFinance ? 'در حال پیوند...' : 'پیوند حساب مالی'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CREATE BANK ACCOUNT DIALOG MODAL */}
      <AnimatePresence>
        {showAddAccountModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] w-full max-w-sm space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#E6DFD3]/60">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#7C8363]" />
                  <span>ثبت و معرفی حساب بانکی جدید</span>
                </h4>
                <button 
                  onClick={() => setShowAddAccountModal(false)}
                  className="p-1 hover:bg-[#E6DFD3]/40 text-[#8D7F72] rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewBankAccount} className="space-y-3">
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">نام بانک</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: بانک سامان، بانک تجارت..."
                    value={newBankName}
                    onChange={e => setNewBankName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">عنوان سپرده / حساب</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: حساب بلندمدت سرمایه‌گذاری..."
                    value={newAccountName}
                    onChange={e => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">موجودی اولیه (تومان)</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: ۴۵,۰۰۰,۰۰۰"
                    value={newBalance}
                    onChange={e => setNewBalance(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">شماره کارت بانکی (اختیاری)</label>
                  <input 
                    type="text"
                    placeholder="۶۲۱۹-****-****-۱۲۳۴"
                    value={newCardNumber}
                    onChange={e => setNewCardNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] text-left font-mono"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">رنگ کارت</label>
                  <div className="flex gap-2 p-1">
                    {['#1E3A8A', '#065F46', '#9D174D', '#B45309', '#374151'].map(color => (
                      <button 
                        key={color}
                        type="button"
                        onClick={() => setNewCardColor(color)}
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                          newCardColor === color ? 'scale-125 border-slate-900 ring-2 ring-slate-200' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#5A5A40] transition-all cursor-pointer"
                >
                  ثبت و افزون کارت بانکی
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT GOAL DIALOG MODAL */}
      <AnimatePresence>
        {showEditGoalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FDFBF7] p-6 rounded-3xl border border-[#E6DFD3] w-full max-w-md space-y-4 shadow-xl text-right"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#E6DFD3]/60">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-[#7C8363]" />
                  <span>ویرایش و به‌روزرسانی مشخصات هدف</span>
                </h4>
                <button 
                  onClick={() => setShowEditGoalModal(false)}
                  className="p-1 hover:bg-[#E6DFD3]/40 text-[#8D7F72] rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedGoal} className="space-y-3.5">
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">عنوان هدف</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: خرید لپ‌تاپ جدید، یادگیری گیتار..."
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  />
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">توضیحات و جزئیات</label>
                  <textarea 
                    rows={3}
                    placeholder="جزئیات، دلایل انتخاب یا گام‌های اولیه این هدف را بنویسید..."
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی</label>
                    <select 
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value as GoalCategory)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] cursor-pointer"
                    >
                      <option value="financial">مالی و سرمایه‌گذاری</option>
                      <option value="health">سلامتی و تندرستی</option>
                      <option value="career">شغلی و کارآفرینی</option>
                      <option value="learning">یادگیری و مهارت</option>
                      <option value="personal">رشد شخصی و معنوی</option>
                      <option value="other">سایر ابعاد زندگی</option>
                    </select>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-bold text-[#8D7F72]">سطح هدف</label>
                    <select 
                      value={editGoalLevel}
                      onChange={e => setEditGoalLevel(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] cursor-pointer"
                    >
                      <option value="none">بدون سطح‌بندی</option>
                      <option value="annual">سالانه</option>
                      <option value="quarterly">فصلی</option>
                      <option value="monthly">ماهانه</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ سررسید هدف</label>
                  <PersianDatePicker value={editTargetDate} onChange={setEditTargetDate} />
                </div>

                <div className="pt-2 flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-[#7C8363] text-white text-xs font-black rounded-xl shadow-xs hover:bg-[#5A5A40] transition-all cursor-pointer text-center"
                  >
                    ذخیره تغییرات
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowEditGoalModal(false)}
                    className="px-4 py-2 bg-[#F9F6EE] border border-[#D6CFC3] text-[#8D7F72] text-xs font-bold rounded-xl hover:bg-[#E6DFD3]/40 transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
