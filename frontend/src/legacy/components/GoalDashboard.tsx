import React, { useState } from 'react';
import { Goal, GoalCategory, Milestone, Habit } from '../types';
import { GOAL_CATEGORY_LABELS } from '../initialData';
import PersianDatePicker from './PersianDatePicker';
import ViewSwitcher, { type ViewMode } from './ViewSwitcher';
import GoalKanbanView from './GoalKanbanView';
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
  Award,
  DollarSign,
  Heart,
  Briefcase,
  BookOpen,
  Compass,
  Sparkles,
  ArrowRight,
  PlusCircle,
  FolderKanban,
  Flame,
  ListTodo,
  FolderPlus,
  Image,
  Upload,
  X,
  Edit2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Table as TableIcon,
  LayoutList,
  Columns,
  TreePine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalDashboardProps {
  goals: Goal[];
  onAddGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestone: (goalId: string, title: string) => void;
  onDeleteGoal: (id: string) => void;
  onToggleGoalCompletion: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onSelectGoal: (id: string) => void;
  
  // Relationship Actions
  onAddProjectToGoal: (goalId: string, title: string, description: string) => void;
  onDeleteProjectFromGoal: (goalId: string, projectId: string) => void;
  onAddTaskToProject: (goalId: string, projectId: string, title: string) => void;
  onToggleTaskInProject: (goalId: string, projectId: string, taskId: string) => void;
  onDeleteTaskFromProject: (goalId: string, projectId: string, taskId: string) => void;
  onAddHabitToGoal: (goalId: string, name: string, description: string) => void;
  onToggleHabitLogInGoal: (goalId: string, habitId: string, date: string) => void;
  onDeleteHabitFromGoal: (goalId: string, habitId: string) => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
}

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  financial: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  health: 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]',
  career: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  learning: 'bg-[#E6DFD3] border-[#D6CFC3] text-[#8D7F72]',
  personal: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  other: 'bg-[#FDFBF7] border-[#D6CFC3] text-[#3D3D3D]'
};

function getCategoryIcon(category: GoalCategory, className = "w-3.5 h-3.5") {
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
    default:
      return <Target className={className} />;
  }
}

export default function GoalDashboard({
  goals,
  onAddGoal,
  onToggleMilestone,
  onAddMilestone,
  onDeleteGoal,
  onToggleGoalCompletion,
  setActiveTab,
  onSelectGoal,
  onAddProjectToGoal,
  onDeleteProjectFromGoal,
  onAddTaskToProject,
  onToggleTaskInProject,
  onDeleteTaskFromProject,
  onAddHabitToGoal,
  onToggleHabitLogInGoal,
  onDeleteHabitFromGoal,
  onUpdateGoal
}: GoalDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [newMilestoneTexts, setNewMilestoneTexts] = useState<Record<string, string>>({});
  const [showAddInline, setShowAddInline] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form State for Inline Add Goal
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('personal');
  const [newTargetDate, setNewTargetDate] = useState('2026-12-31');

  // Fast edit goal modal states
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<GoalCategory>('personal');
  const [editTargetDate, setEditTargetDate] = useState('2026-12-31');

  // Interactive Goal Relationships States
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, 'milestones' | 'projects' | 'habits' | 'vision'>>({});
  
  // Local form inputs for projects/habits/tasks
  const [newProjectTitle, setNewProjectTitle] = useState<Record<string, string>>({});
  const [newProjectDesc, setNewProjectDesc] = useState<Record<string, string>>({});
  
  const [newHabitName, setNewHabitName] = useState<Record<string, string>>({});
  const [newHabitDesc, setNewHabitDesc] = useState<Record<string, string>>({});
  
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({}); // key is projectId

  // Quick image states
  const [isDownloadingGoalImage, setIsDownloadingGoalImage] = useState<Record<string, boolean>>({});
  const [downloadGoalError, setDownloadGoalError] = useState<Record<string, string | null>>({});

  const filteredGoals = goals.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (g.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'completed' && g.completed) ||
                          (statusFilter === 'active' && !g.completed);
    const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleLocalImageUploadDashboard = (goal: Goal, e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleDownloadAndAddImageDashboard = async (goal: Goal, url: string, inputElement: HTMLInputElement) => {
    if (!url.trim()) return;
    setIsDownloadingGoalImage(prev => ({ ...prev, [goal.id]: true }));
    setDownloadGoalError(prev => ({ ...prev, [goal.id]: null }));
    try {
      const res = await fetch(`/api/download-image?url=${encodeURIComponent(url.trim())}`);
      if (!res.ok) {
        throw new Error('خطا در دانلود عکس از آدرس وارد شده. ممکن است آدرس نامعتبر باشد.');
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
        if (inputElement) inputElement.value = '';
      } else {
        throw new Error('فرمت تصویر برگشت داده شده نامعتبر است.');
      }
    } catch (err: any) {
      console.error(err);
      setDownloadGoalError(prev => ({ ...prev, [goal.id]: err.message || 'خطایی در دانلود تصویر رخ داد.' }));
    } finally {
      setIsDownloadingGoalImage(prev => ({ ...prev, [goal.id]: false }));
    }
  };

  const handleInlineAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddGoal({
      title: newTitle.trim(),
      description: newDesc.trim() || 'هدف هوشمند جدید',
      category: newCategory,
      targetDate: newTargetDate,
      milestones: []
    });

    setNewTitle('');
    setNewDesc('');
    setNewCategory('personal');
    setNewTargetDate('2026-12-31');
    setShowAddInline(false);
  };

  const handleSaveEditedGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !editTitle.trim()) return;

    onUpdateGoal({
      ...editingGoal,
      title: editTitle.trim(),
      description: editDesc.trim(),
      category: editCategory,
      targetDate: editTargetDate,
    });

    setEditingGoal(null);
  };

  const handleAddMilestoneInline = (goalId: string) => {
    const text = newMilestoneTexts[goalId]?.trim();
    if (!text) return;
    onAddMilestone(goalId, text);
    setNewMilestoneTexts(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleCreateProject = (goalId: string) => {
    const title = newProjectTitle[goalId]?.trim();
    const desc = newProjectDesc[goalId]?.trim() || '';
    if (!title) return;
    onAddProjectToGoal(goalId, title, desc);
    setNewProjectTitle(prev => ({ ...prev, [goalId]: '' }));
    setNewProjectDesc(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleCreateHabit = (goalId: string) => {
    const name = newHabitName[goalId]?.trim();
    const desc = newHabitDesc[goalId]?.trim() || '';
    if (!name) return;
    onAddHabitToGoal(goalId, name, desc);
    setNewHabitName(prev => ({ ...prev, [goalId]: '' }));
    setNewHabitDesc(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleCreateTask = (goalId: string, projectId: string) => {
    const title = newTaskTitle[projectId]?.trim();
    if (!title) return;
    onAddTaskToProject(goalId, projectId, title);
    setNewTaskTitle(prev => ({ ...prev, [projectId]: '' }));
  };

  // Calculations for Stats Header
  const activeGoalsCount = goals.filter(g => !g.completed).length;
  const completedGoalsCount = goals.filter(g => g.completed).length;
  const totalMilestones = goals.reduce((sum, g) => sum + g.milestones.length, 0);
  const completedMilestones = goals.reduce((sum, g) => sum + g.milestones.filter(m => m.completed).length, 0);
  const totalCompletionRatio = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-5 text-right pb-10" dir="rtl" id="goal-dashboard-container">
      
      {/* 1. Header with Back Button */}
      <div className="flex justify-between items-center bg-[#FDFBF7] py-2 border-b border-[#E6DFD3]/40" id="goal-header">
        <div className="flex items-center gap-1.5">
          <button 
            id="back-to-home-btn"
            onClick={() => setActiveTab('dashboard')}
            className="p-1.5 bg-[#F9F6EE] hover:bg-[#E6DFD3]/60 border border-[#E6DFD3] rounded-xl text-[#8D7F72] transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-extrabold text-[#2D3025] font-serif-elegant">داشبورد اهداف</h2>
        </div>

        <button 
          id="toggle-inline-goal-form-btn"
          onClick={() => setShowAddInline(!showAddInline)}
          className="bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>هدف جدید</span>
        </button>
      </div>

      {/* Inline Goal Form */}
      <AnimatePresence>
        {showAddInline && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            id="inline-goal-form-container"
          >
            <form onSubmit={handleInlineAddGoal} className="bg-[#FDFBF7] p-4 rounded-2xl border border-[#DDE2D5] space-y-3.5 shadow-xs">
              <h3 className="text-xs font-black text-[#2D3025]">🎯 تعریف هدف هوشمند جدید</h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8D7F72]">عنوان هدف</label>
                <input 
                  id="inline-goal-title-input"
                  type="text"
                  required
                  placeholder="مثال: یادگیری مکالمه انگلیسی"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">دسته‌بندی</label>
                  <select 
                    id="inline-goal-cat-select"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as GoalCategory)}
                    className="w-full px-2 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none"
                  >
                    <option value="financial">مالی و پس‌انداز</option>
                    <option value="health">سلامتی و ورزش</option>
                    <option value="career">شغلی و درآمد</option>
                    <option value="learning">یادگیری مهارت</option>
                    <option value="personal">توسعه فردی</option>
                    <option value="other">سایر اهداف</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ سررسید</label>
                  <PersianDatePicker
                    value={newTargetDate}
                    onChange={setNewTargetDate}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8D7F72]">توضیحات</label>
                <input 
                  id="inline-goal-desc-input"
                  type="text"
                  placeholder="انگیزه اصلی و نتایج کلیدی این هدف..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
              </div>

              <button 
                id="submit-inline-goal-btn"
                type="submit" 
                className="w-full py-2 bg-[#7C8363] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#5A5A40] transition-all cursor-pointer"
              >
                ثبت هدف در برنامه هفتگی
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Compact Statistics Cards */}
      <div className="grid grid-cols-3 gap-2" id="goal-stats-grid">
        <div className="bg-[#FDFBF7] p-3 rounded-2xl border border-[#E6DFD3] text-center" id="active-goals-stat">
          <span className="text-[8px] font-bold text-[#8D7F72] block">اهداف جاری</span>
          <span className="text-base font-black text-[#2D3025] font-serif-elegant">{activeGoalsCount}</span>
        </div>
        <div className="bg-[#E8ECE0] p-3 rounded-2xl border border-[#DDE2D5] text-center" id="completed-goals-stat">
          <span className="text-[8px] font-bold text-[#7C8363] block">تحقق یافته</span>
          <span className="text-base font-black text-[#7C8363] font-serif-elegant">{completedGoalsCount}</span>
        </div>
        <div className="bg-[#F4E9E4] p-3 rounded-2xl border border-[#EDDDD7] text-center" id="milestones-ratio-stat">
          <span className="text-[8px] font-bold text-[#9B6B61] block">میزان کل پیشرفت</span>
          <span className="text-base font-black text-[#9B6B61] font-serif-elegant">{totalCompletionRatio}%</span>
        </div>
      </div>

      {/* Filters & View Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3] flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8D7F72] absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی اهداف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
          />
        </div>
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'همه' },
            { id: 'active', label: 'جاری' },
            { id: 'completed', label: 'تکمیل‌شده' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === opt.id
                  ? 'bg-[#7C8363] text-white'
                  : 'bg-[#F9F6EE] hover:bg-[#E6DFD3]/40 text-[#8D7F72]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="w-full md:w-auto md:mr-auto flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#8D7F72] whitespace-nowrap">دسته:</span>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2 py-1.5 text-[10px] bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl focus:outline-none font-bold text-[#3D3D3D] cursor-pointer"
          >
            <option value="all">همه</option>
            <option value="financial">مالی</option>
            <option value="health">سلامت</option>
            <option value="career">شغلی</option>
            <option value="learning">یادگیری</option>
            <option value="personal">شخصی</option>
            <option value="other">سایر</option>
          </select>
        </div>
      </div>

      {/* View Switcher — reusable component */}
      <ViewSwitcher
        views={[
          { id: 'list', label: 'لیست', emoji: '🗂️' },
          { id: 'table', label: 'جدول', emoji: '⊞' },
          { id: 'kanban', label: 'کانبان', emoji: '📋' },
          { id: 'tree', label: 'درخت', emoji: '🌲' },
        ]}
        activeView={viewMode}
        onChange={setViewMode}
      />

      {/* 3. Goals Views */}
      <div className="space-y-4" id="goals-list-section">
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredGoals.length > 0 ? (
              filteredGoals.map((goal) => {
            const categoryDetails = GOAL_CATEGORY_LABELS[goal.category] || GOAL_CATEGORY_LABELS.other;
            const colStyle = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.other;
            
            const total = goal.milestones.length;
            const done = goal.milestones.filter(m => m.completed).length;
            const percentage = total > 0 
              ? Math.round((done / total) * 100) 
              : (goal.completed ? 100 : 0);

            // Progress Ring calculations
            const r = 24;
            const stroke = 5;
            const circumference = 2 * Math.PI * r;
            const strokeDashoffset = circumference - (percentage / 100) * circumference;

            const isExpanded = activeGoalId === goal.id;
            const subTab = activeSubTabs[goal.id] || 'projects';

            return (
              <div 
                key={goal.id} 
                id={`goal-card-${goal.id}`}
                className={`bg-[#FDFBF7] rounded-3xl border transition-all relative overflow-hidden ${
                  goal.completed 
                    ? 'border-[#DDE2D5] bg-[#E8ECE0]/10' 
                    : 'border-[#E6DFD3] hover:border-[#D6CFC3]'
                }`}
              >
                {/* Visual Accent Corner Ribbon */}
                <div className={`absolute top-0 right-0 w-2 h-2 rounded-bl-lg ${
                  goal.completed ? 'bg-[#7C8363]' : 'bg-[#9B6B61]'
                }`} />

                <div className="p-4 flex items-center justify-between gap-3">
                  
                  {/* Left Side: SVG Progress Ring */}
                  <div className="relative flex items-center justify-center shrink-0" id={`goal-ring-container-${goal.id}`}>
                    <svg className="w-14 h-14 transform -rotate-90 select-none">
                      {/* Background circle */}
                      <circle
                        cx="28"
                        cy="28"
                        r={r}
                        className="text-[#F3EFE6]"
                        strokeWidth={stroke}
                        stroke="currentColor"
                        fill="transparent"
                      />
                      {/* Animated foreground progress circle */}
                      <circle
                        cx="28"
                        cy="28"
                        r={r}
                        className={`transition-all duration-700 ease-out ${
                          goal.completed ? 'text-[#7C8363]' : 'text-[#9B6B61]'
                        }`}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>
                    {/* Centered Percentage Number */}
                    <span className="absolute text-[10px] font-black text-[#2D3025] font-mono">
                      {percentage}%
                    </span>
                  </div>

                  {/* Middle Content: Info & Texts */}
                  <div className="flex-1 space-y-1 min-w-0" id={`goal-info-${goal.id}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border flex items-center gap-1 ${colStyle}`}>
                        {getCategoryIcon(goal.category, "w-2.5 h-2.5")}
                        <span>{categoryDetails.label}</span>
                      </span>

                      <span className="text-[9px] text-[#8D7F72] font-semibold flex items-center gap-0.5 font-mono">
                        <Calendar className="w-2.5 h-2.5 text-[#8D7F72]" />
                        <span>سررسید: {goal.targetDate}</span>
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold leading-tight truncate ${
                      goal.completed ? 'line-through text-[#8D7F72] opacity-75' : 'text-[#2D3025]'
                    }`}>
                      {goal.title}
                    </h4>
                    
                    <p className="text-[10px] text-[#8D7F72] leading-snug line-clamp-2">
                      {goal.description || 'بدون توضیحات اضافی'}
                    </p>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex flex-col items-center gap-2 shrink-0" id={`goal-actions-${goal.id}`}>
                    {/* Completion Toggle Quick Button */}
                    <button 
                      id={`toggle-goal-completion-btn-${goal.id}`}
                      onClick={() => onToggleGoalCompletion(goal.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                        goal.completed
                          ? 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]'
                          : 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72] hover:bg-[#E8ECE0] hover:text-[#7C8363]'
                      }`}
                      title={goal.completed ? "فعال‌سازی مجدد هدف" : "علامت‌گذاری به عنوان پایان یافته"}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>

                    {/* View Full Details Button */}
                    <button 
                      onClick={() => onSelectGoal(goal.id)}
                      className="text-[9px] px-2 py-0.5 rounded-lg border font-bold cursor-pointer transition-all bg-[#7C8363] text-white border-transparent hover:bg-[#5A5A40] flex items-center gap-0.5"
                    >
                      <span>جزئیات کامل</span>
                    </button>

                    {/* Edit Goal Button */}
                    <button 
                      onClick={() => {
                        setEditingGoal(goal);
                        setEditTitle(goal.title);
                        setEditDesc(goal.description);
                        setEditCategory(goal.category);
                        setEditTargetDate(goal.targetDate);
                      }}
                      className="text-[9px] px-2 py-0.5 rounded-lg border border-[#D6CFC3] text-[#8D7F72] bg-[#F9F6EE] hover:bg-[#E6DFD3]/40 font-bold cursor-pointer transition-all flex items-center gap-0.5"
                      title="ویرایش مشخصات هدف"
                    >
                      <Edit2 className="w-3 h-3 text-[#7C8363]" />
                      <span>ویرایش</span>
                    </button>

                    {/* Milestones Toggle / Dropdown Indicator */}
                    <button 
                      id={`toggle-milestone-drawer-${goal.id}`}
                      onClick={() => setActiveGoalId(isExpanded ? null : goal.id)}
                      className={`text-[9px] px-2 py-0.5 rounded-lg border font-bold cursor-pointer transition-all ${
                        isExpanded
                          ? 'bg-[#E26645] text-white border-transparent'
                          : 'bg-[#F9F6EE] border-[#D6CFC3] text-[#3D3D3D] hover:bg-[#E6DFD3]'
                      }`}
                    >
                      {isExpanded ? 'بستن' : 'مدیریت'}
                    </button>
                  </div>

                </div>

                {/* Collapsible Sub-Workspaces (Milestones, Projects, Habits) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden bg-[#E6DFD3]/15 border-t border-[#E6DFD3]/30"
                      id={`milestone-drawer-${goal.id}`}
                    >
                      <div className="p-3.5 space-y-3.5">
                        
                        {/* Sub-Tabs Control Navigation */}
                        <div className="flex border-b border-[#E6DFD3] mb-3 overflow-x-auto gap-1.5 p-1 bg-[#F9F6EE] rounded-xl">
                          <button
                            type="button"
                            onClick={() => setActiveSubTabs(prev => ({ ...prev, [goal.id]: 'projects' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              subTab === 'projects'
                                ? 'bg-[#7C8363] text-white shadow-xs'
                                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
                            }`}
                          >
                            <FolderKanban className="w-3.5 h-3.5" />
                            <span>پروژه‌ها ({goal.projects?.length || 0})</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setActiveSubTabs(prev => ({ ...prev, [goal.id]: 'habits' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              subTab === 'habits'
                                ? 'bg-[#7C8363] text-white shadow-xs'
                                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>عادت‌ها ({goal.habits?.length || 0})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveSubTabs(prev => ({ ...prev, [goal.id]: 'milestones' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              subTab === 'milestones'
                                ? 'bg-[#7C8363] text-white shadow-xs'
                                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>خرده‌گام‌ها ({done} از {total})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveSubTabs(prev => ({ ...prev, [goal.id]: 'vision' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              subTab === 'vision'
                                ? 'bg-[#7C8363] text-white shadow-xs'
                                : 'text-[#8D7F72] hover:bg-[#E6DFD3]/40'
                            }`}
                          >
                            <Image className="w-3.5 h-3.5" />
                            <span>تصویرسازی ({goal.visionImages?.length || 0})</span>
                          </button>
                        </div>

                        {/* WORKSPACE 1: MILESTONES (STANDARD CHRONO STEPPERS) */}
                        {subTab === 'milestones' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold text-[#8D7F72]">
                              <span>خرده‌گام‌های فرعی پیشرفت ({done} از {total})</span>
                              <button 
                                id={`delete-goal-btn-${goal.id}`}
                                onClick={() => {
                                  if (confirm('آیا مایل به حذف کل این هدف هستید؟')) {
                                    onDeleteGoal(goal.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 flex items-center gap-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>حذف هدف</span>
                              </button>
                            </div>

                            {/* List of Milestones */}
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                              {goal.milestones.length > 0 ? (
                                goal.milestones.map((milestone) => (
                                  <div 
                                    key={milestone.id}
                                    id={`milestone-${goal.id}-${milestone.id}`}
                                    onClick={() => onToggleMilestone(goal.id, milestone.id)}
                                    className="flex items-center gap-2 p-2 bg-white/80 hover:bg-[#E8ECE0]/30 border border-[#E6DFD3] rounded-xl cursor-pointer transition-all"
                                  >
                                    {milestone.completed ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-[#7C8363] fill-[#E8ECE0] shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-[#8D7F72] shrink-0" />
                                    )}
                                    <span className={`text-[11px] font-semibold ${
                                      milestone.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'
                                    }`}>
                                      {milestone.title}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-3 bg-white/40 border border-dashed border-[#D6CFC3] rounded-xl text-[10px] text-[#8D7F72] flex items-center justify-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>هنوز هیچ گام فرعی برای این هدف ایجاد نشده است.</span>
                                </div>
                              )}
                            </div>

                            {/* Direct Add Milestone Box */}
                            <div className="flex gap-1.5 pt-1.5 border-t border-[#E6DFD3]/30">
                              <input 
                                id={`add-milestone-input-${goal.id}`}
                                type="text"
                                placeholder="افزودن گام فرعی جدید..."
                                value={newMilestoneTexts[goal.id] || ''}
                                onChange={e => setNewMilestoneTexts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddMilestoneInline(goal.id);
                                }}
                                className="flex-1 px-3 py-1.5 rounded-xl border border-[#D6CFC3] text-xs bg-white text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                              />
                              <button 
                                id={`add-milestone-btn-${goal.id}`}
                                onClick={() => handleAddMilestoneInline(goal.id)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* WORKSPACE 2: PROJECTS & TASKS */}
                        {subTab === 'projects' && (
                          <div className="space-y-4">
                            {/* List of projects */}
                            {goal.projects && goal.projects.length > 0 ? (
                              <div className="space-y-3.5">
                                {goal.projects.map((project) => {
                                  const projectTasks = project.tasks || [];
                                  const projectDone = projectTasks.filter(t => t.completed).length;
                                  const projectTotal = projectTasks.length;
                                  const projectPct = projectTotal > 0 ? Math.round((projectDone / projectTotal) * 100) : 0;

                                  return (
                                    <div key={project.id} className="bg-white p-3.5 rounded-2xl border border-[#E6DFD3] space-y-3 text-right">
                                      {/* Project Header */}
                                      <div className="flex justify-between items-start">
                                        <div className="min-w-0 flex-1">
                                          <h5 className="text-xs font-extrabold text-[#2D3025] flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-[#9B6B61] shrink-0"></span>
                                            <span className="truncate">{project.title}</span>
                                          </h5>
                                          {project.description && (
                                            <p className="text-[10px] text-[#8D7F72] mt-0.5 pr-3">{project.description}</p>
                                          )}
                                        </div>
                                        
                                        <button
                                          type="button"
                                          onClick={() => onDeleteProjectFromGoal(goal.id, project.id)}
                                          className="text-[#8D7F72] hover:text-[#9B6B61] p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                          title="حذف پروژه"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Progress Bar */}
                                      <div className="space-y-1 bg-[#FDFBF7] p-2 rounded-xl border border-[#E6DFD3]/40">
                                        <div className="flex justify-between items-center text-[9px] text-[#8D7F72] font-semibold pr-1">
                                          <span>میزان پیشرفت پروژه: {projectPct}%</span>
                                          <span>{projectDone} از {projectTotal} کار</span>
                                        </div>
                                        <div className="w-full h-1 bg-[#F9F6EE] rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-[#9B6B61] transition-all duration-300 rounded-full"
                                            style={{ width: `${projectPct}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Tasks Checklist */}
                                      <div className="space-y-2 pr-2 border-r-2 border-[#E6DFD3]/40 mr-1 max-h-40 overflow-y-auto">
                                        {projectTasks.length > 0 ? (
                                          projectTasks.map((task) => (
                                            <div
                                              key={task.id}
                                              className="flex items-center justify-between gap-2 p-1.5 bg-[#FDFBF7] hover:bg-[#F9F6EE] rounded-lg border border-[#E6DFD3]/40 transition-all cursor-pointer"
                                              onClick={() => onToggleTaskInProject(goal.id, project.id, task.id)}
                                            >
                                              <div className="flex items-center gap-2 text-right">
                                                {task.completed ? (
                                                  <CheckCircle className="w-3.5 h-3.5 text-[#7C8363] shrink-0" />
                                                ) : (
                                                  <Circle className="w-3.5 h-3.5 text-[#8D7F72] shrink-0" />
                                                )}
                                                <span className={`text-[10px] font-medium ${task.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                                                  {task.title}
                                                </span>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onDeleteTaskFromProject(goal.id, project.id, task.id);
                                                }}
                                                className="text-[#8D7F72] hover:text-[#9B6B61] p-0.5 rounded-md cursor-pointer hover:bg-red-50"
                                                title="حذف کار"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-[10px] text-[#8D7F72] py-2 text-center bg-[#FDFBF7] border border-dashed border-[#D6CFC3] rounded-lg">
                                            هنوز تسکی تعریف نشده است.
                                          </div>
                                        )}
                                      </div>

                                      {/* Add Task Box */}
                                      <div className="flex gap-1.5 mt-2 pr-1">
                                        <input
                                          type="text"
                                          placeholder="افزودن تسک جدید به پروژه..."
                                          value={newTaskTitle[project.id] || ''}
                                          onChange={(e) => setNewTaskTitle(prev => ({ ...prev, [project.id]: e.target.value }))}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleCreateTask(goal.id, project.id);
                                            }
                                          }}
                                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-[#FDFBF7] text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleCreateTask(goal.id, project.id)}
                                          className="px-2.5 py-1.5 text-[10px] font-bold text-white bg-[#9B6B61] hover:bg-[#7C5A51] rounded-lg shrink-0 cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72] flex flex-col items-center justify-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-[#8D7F72]" />
                                <span>هنوز پروژه‌ای برای این هدف تعریف نکرده‌اید. با فرم زیر اولین پروژه را اضافه کنید!</span>
                              </div>
                            )}

                            {/* Form to add project */}
                            <div className="bg-white/85 p-3.5 rounded-2xl border border-[#E6DFD3] space-y-2.5">
                              <h6 className="text-[11px] font-black text-[#2D3025] flex items-center gap-1">
                                <FolderPlus className="w-3.5 h-3.5 text-[#9B6B61]" />
                                <span>ایجاد پروژه جدید برای این هدف</span>
                              </h6>
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="عنوان پروژه (مثلاً: ثبت نام و تست بدنی)"
                                  value={newProjectTitle[goal.id] || ''}
                                  onChange={(e) => setNewProjectTitle(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-[#FDFBF7] text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                                />
                                <input
                                  type="text"
                                  placeholder="توضیح کوتاه پروژه"
                                  value={newProjectDesc[goal.id] || ''}
                                  onChange={(e) => setNewProjectDesc(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-[#FDFBF7] text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCreateProject(goal.id)}
                                  className="w-full py-1.5 text-[10px] font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-lg cursor-pointer transition-all"
                                >
                                  ثبت پروژه جدید
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* WORKSPACE 3: HABITS */}
                        {subTab === 'habits' && (
                          <div className="space-y-4">
                            {/* List of habits */}
                            {goal.habits && goal.habits.length > 0 ? (
                              <div className="space-y-2">
                                {goal.habits.map((habit) => {
                                  const TODAY_DATE = '2026-07-04'; // System simulated date
                                  const isDoneToday = habit.logs.includes(TODAY_DATE);

                                  return (
                                    <div key={habit.id} className="bg-white p-3 py-2.5 rounded-2xl border border-[#E6DFD3] flex items-center justify-between gap-3 text-right">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h5 className={`text-xs font-extrabold ${isDoneToday ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                                            {habit.name}
                                          </h5>
                                          <span className="bg-[#FDFBF7] border border-[#E6DFD3] text-[#8D7F72] text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0 font-mono">
                                            <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-100" />
                                            <span>{habit.streak} روز</span>
                                          </span>
                                        </div>
                                        {habit.description && (
                                          <p className="text-[10px] text-[#8D7F72] mt-0.5 leading-snug line-clamp-2">{habit.description}</p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Complete today toggle */}
                                        <button
                                          type="button"
                                          onClick={() => onToggleHabitLogInGoal(goal.id, habit.id, TODAY_DATE)}
                                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${
                                            isDoneToday
                                              ? 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]'
                                              : 'bg-[#F9F6EE] border-[#D6CFC3] text-[#3D3D3D] hover:bg-[#E8ECE0]'
                                          }`}
                                        >
                                          {isDoneToday ? 'انجام شد ✓' : 'انجام امروز'}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => onDeleteHabitFromGoal(goal.id, habit.id)}
                                          className="text-[#8D7F72] hover:text-[#9B6B61] p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                          title="حذف عادت"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72] flex flex-col items-center justify-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-[#8D7F72]" />
                                <span>هنوز عادتی به این هدف متصل نکرده‌اید. با فرم زیر اولین عادت را متصل کنید!</span>
                              </div>
                            )}

                            {/* Form to add habit */}
                            <div className="bg-white/85 p-3.5 rounded-2xl border border-[#E6DFD3] space-y-2.5">
                              <h6 className="text-[11px] font-black text-[#2D3025] flex items-center gap-1">
                                <PlusCircle className="w-3.5 h-3.5 text-[#7C8363]" />
                                <span>ایجاد عادت جدید برای این هدف</span>
                              </h6>
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="عنوان عادت (مثلاً: نخ دندان زدن شبانه)"
                                  value={newHabitName[goal.id] || ''}
                                  onChange={(e) => setNewHabitName(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-[#FDFBF7] text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                                />
                                <input
                                  type="text"
                                  placeholder="توضیح کوتاه عادت"
                                  value={newHabitDesc[goal.id] || ''}
                                  onChange={(e) => setNewHabitDesc(prev => ({ ...prev, [goal.id]: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] bg-[#FDFBF7] text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCreateHabit(goal.id)}
                                  className="w-full py-1.5 text-[10px] font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-lg cursor-pointer transition-all"
                                >
                                  ثبت عادت جدید
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* WORKSPACE 4: VISION BOARD */}
                        {subTab === 'vision' && (
                          <div className="space-y-4 animate-fade-in" id={`vision-sub-drawer-${goal.id}`}>
                            
                            {/* Affirmation indicator if exists */}
                            {goal.visionAffirmation && (
                              <div className="bg-gradient-to-l from-[#7C8363]/90 to-[#5A5A40]/90 p-3.5 rounded-2xl text-white text-[10px] font-bold text-center italic leading-relaxed">
                                " {goal.visionAffirmation} "
                              </div>
                            )}

                            {/* Horizontal grid or Carousel of images */}
                            {goal.visionImages && goal.visionImages.length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {goal.visionImages.map((imgUrl, index) => (
                                  <div 
                                    key={`${imgUrl}-${index}`}
                                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E6DFD3] group bg-white shadow-2xs"
                                  >
                                    <img 
                                      src={imgUrl} 
                                      alt={`Vision preview ${index + 1}`}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Small delete button overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedImages = (goal.visionImages || []).filter(img => img !== imgUrl);
                                          onUpdateGoal({
                                            ...goal,
                                            visionImages: updatedImages
                                          });
                                        }}
                                        className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center"
                                        title="حذف"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-white/40 p-4 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72] text-center space-y-1">
                                <div>✨ برد تصویرسازی این هدف هنوز تصویری ندارد.</div>
                                <div className="text-[9px]">برای مدیریت کامل تصاویر و مشاهده پیشنهادات هوشمند، جزئیات هدف را باز کنید یا از کادر زیر آدرس تصویر اضافه کنید.</div>
                              </div>
                            )}

                            {/* Inline Form to add a quick image url */}
                            <div className="bg-white/85 p-4 rounded-2xl border border-[#E6DFD3] space-y-3">
                              <div className="flex justify-between items-center">
                                <h6 className="text-[10px] font-extrabold text-[#2D3025] flex items-center gap-1">
                                  <PlusCircle className="w-3.5 h-3.5 text-[#7C8363]" />
                                  <span>افزودن سریع تصویر دلخواه</span>
                                </h6>
                              </div>

                              {/* Simple file input button */}
                              <div className="border border-dashed border-[#D6CFC3] rounded-xl p-2.5 text-center bg-[#FDFBF7] hover:bg-[#F9F6EE] transition-all cursor-pointer relative group">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleLocalImageUploadDashboard(goal, e)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex items-center justify-center gap-1.5">
                                  <Upload className="w-3.5 h-3.5 text-[#7C8363] group-hover:scale-110 transition-transform" />
                                  <span className="text-[9px] font-bold text-[#2D3025]">آپلود تصویر از کامپیوتر یا گوشی</span>
                                </div>
                              </div>

                              <div className="relative flex items-center py-0.5">
                                <div className="flex-grow border-t border-[#E6DFD3]/60"></div>
                                <span className="flex-shrink mx-2 text-[8px] text-[#8D7F72] font-bold">یا دانلود از لینک عکس</span>
                                <div className="flex-grow border-t border-[#E6DFD3]/60"></div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex gap-1.5">
                                  <input
                                    type="url"
                                    placeholder="https://example.com/image.jpg"
                                    id={`quick-vision-url-${goal.id}`}
                                    disabled={isDownloadingGoalImage[goal.id]}
                                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[9px] bg-[#FDFBF7] text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] text-left font-mono"
                                  />
                                  <button
                                    type="button"
                                    disabled={isDownloadingGoalImage[goal.id]}
                                    onClick={() => {
                                      const input = document.getElementById(`quick-vision-url-${goal.id}`) as HTMLInputElement;
                                      if (input) {
                                        handleDownloadAndAddImageDashboard(goal, input.value, input);
                                      }
                                    }}
                                    className="px-3 py-1 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 disabled:opacity-50"
                                  >
                                    {isDownloadingGoalImage[goal.id] ? 'دانلود...' : 'دانلود و ثبت'}
                                  </button>
                                </div>
                                {downloadGoalError[goal.id] && (
                                  <div className="p-1.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[8px] leading-relaxed">
                                    {downloadGoalError[goal.id]}
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        )}

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })
            ) : (
              <div className="bg-[#FDFBF7] p-8 text-center text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-2xl font-bold text-xs" id="no-goals-placeholder">
                هیچ هدفی مطابق فیلترها یافت نشد.
              </div>
            )}
          </div>
        )}

        {viewMode === 'table' && (
          <div className="bg-white rounded-3xl border border-[#E6DFD3] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-[#F9F6EE] border-b border-[#E6DFD3]">
                  <tr className="text-[10px] font-black text-[#8D7F72]">
                    <th className="px-4 py-3">هدف</th>
                    <th className="px-4 py-3">دسته‌بندی</th>
                    <th className="px-4 py-3">سررسید</th>
                    <th className="px-4 py-3">پیشرفت</th>
                    <th className="px-4 py-3">وضعیت</th>
                    <th className="px-4 py-3">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD3]/40">
                  {filteredGoals.length > 0 ? filteredGoals.map(goal => {
                    const total = goal.milestones.length;
                    const done = goal.milestones.filter(m => m.completed).length;
                    const percentage = total > 0 ? Math.round((done / total) * 100) : (goal.completed ? 100 : 0);
                    const categoryDetails = GOAL_CATEGORY_LABELS[goal.category] || GOAL_CATEGORY_LABELS.other;
                    return (
                      <tr key={goal.id} className="hover:bg-[#F9F6EE]/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-[#2D3025]">{goal.title}</div>
                          <div className="text-[9px] text-[#8D7F72] truncate max-w-[200px]">{goal.description}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-[#FDFBF7] border-[#E6DFD3] text-[#8D7F72]">
                            {categoryDetails.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-mono text-[#8D7F72]">{goal.targetDate}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#E6DFD3]/40 h-1.5 rounded-full overflow-hidden w-16">
                              <div className="bg-[#7C8363] h-full rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-[#7C8363]">{percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onToggleGoalCompletion(goal.id)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer ${
                              goal.completed
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                          >
                            {goal.completed ? 'تکمیل' : 'جاری'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onSelectGoal(goal.id)}
                              className="px-2 py-1 text-[9px] font-bold bg-[#7C8363] text-white rounded-lg hover:bg-[#5A5A40] transition-colors"
                            >
                              جزئیات
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('آیا مایل به حذف این هدف هستید؟')) onDeleteGoal(goal.id);
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[10px] text-[#8D7F72]">
                        هیچ هدفی مطابق فیلترها یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'kanban' && (
          <GoalKanbanView
            goals={filteredGoals}
            onUpdateGoal={onUpdateGoal}
            onToggleGoalCompletion={onToggleGoalCompletion}
            onDeleteGoal={onDeleteGoal}
            onSelectGoal={onSelectGoal}
          />
        )}

        {viewMode === 'tree' && (
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#E6DFD3] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/60">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-[#E26645]" />
                  <span>نقشه درختی اهداف و پروژه‌ها</span>
                </h4>
                <p className="text-[9px] text-[#8D7F72] font-semibold">ساختار سلسله مراتبی اهداف، پروژه‌ها و کارهای خرد</p>
              </div>
            </div>
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
              {filteredGoals.length > 0 ? filteredGoals.map(g => {
                const total = g.milestones.length;
                const done = g.milestones.filter(m => m.completed).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={g.id} className="space-y-4 bg-white p-4 rounded-2xl border border-[#E6DFD3]/60">
                    <div className="flex items-center gap-2 bg-[#E26645]/5 p-2.5 rounded-xl border border-[#E26645]/20">
                      <span className="text-base">🎯</span>
                      <div className="text-right flex-1">
                        <span className="text-[7px] font-bold text-[#E26645] uppercase tracking-wider block">هدف کلان</span>
                        <h4 className="text-xs font-black text-[#2D3025]">{g.title}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-[#E6DFD3]/40 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#7C8363] h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[8px] font-bold text-[#7C8363]">{pct}%</span>
                      </div>
                    </div>
                    {(g.projects || []).length > 0 ? (
                      <div className="mr-6 border-r-2 border-dashed border-[#C6BFA3] pr-4 space-y-4 text-right">
                        {g.projects.map(proj => {
                          const pTasks = proj.tasks || [];
                          const pDone = pTasks.filter(t => t.completed).length;
                          const pPct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
                          return (
                            <div key={proj.id} className="space-y-2 relative">
                              <div className="absolute top-4 -right-[21px] w-2 h-2 bg-[#7C8363] rounded-full border border-white" />
                              <div className="flex items-center gap-2 bg-[#7C8363]/5 p-2 rounded-xl border border-[#7C8363]/20">
                                <span className="text-xs">📂</span>
                                <div className="text-right flex-1">
                                  <span className="text-[7px] font-bold text-[#7C8363] block">پروژه</span>
                                  <h5 className="text-[11px] font-black text-[#2D3025]">{proj.title}</h5>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-12 bg-[#E6DFD3]/40 h-1 rounded-full overflow-hidden">
                                    <div className="bg-[#9B6B61] h-full rounded-full" style={{ width: `${pPct}%` }} />
                                  </div>
                                  <span className="text-[8px] font-bold text-[#9B6B61]">{pPct}%</span>
                                </div>
                              </div>
                              {pTasks.length > 0 ? (
                                <div className="mr-5 border-r border-[#E6DFD3] pr-3 space-y-1 pt-1 text-right">
                                  {pTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-1.5 py-1 text-xs text-[#3D3D3D] relative">
                                      <div className="absolute top-3 -right-[16px] w-3 h-[1px] bg-[#E6DFD3]" />
                                      <span className="text-[9px] text-[#8D7F72]">├─</span>
                                      <span className="text-[9px]">◽</span>
                                      <span className={`font-semibold ${task.completed ? 'line-through text-[#8D7F72]' : ''}`}>{task.title}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mr-5 text-[8px] text-[#8D7F72] italic font-semibold">هنوز تسکی به این پروژه پیوند نخورده است.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mr-6 text-[8px] text-[#8D7F72] italic font-semibold text-right">پروژه‌ای به این هدف تخصیص نیافته است.</p>
                    )}
                  </div>
                );
              }) : (
                <p className="text-center py-6 text-xs text-[#8D7F72]">هدفی برای ساخت درخت یافت نشد.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDIT GOAL MODAL OVERLAY */}
      <AnimatePresence>
        {editingGoal && (
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
                  <span>ویرایش سریع مشخصات هدف</span>
                </h4>
                <button 
                  type="button"
                  onClick={() => setEditingGoal(null)}
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
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] resize-none"
                  />
                </div>

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
                    onClick={() => setEditingGoal(null)}
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
