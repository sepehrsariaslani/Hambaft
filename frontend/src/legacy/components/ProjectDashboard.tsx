import React, { useState } from 'react';
import { Goal, Project, Task, GoalCategory } from '../types';
import { 
  FolderKanban, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  FolderPlus, 
  Search, 
  Filter, 
  CheckCircle, 
  Circle,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Clock,
  ListTodo,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  GitFork,
  ArrowLeftRight,
  Calendar,
  AlertTriangle,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectDashboardProps {
  goals: Goal[];
  onAddProjectToGoal: (goalId: string, title: string, description: string) => void;
  onDeleteProjectFromGoal: (goalId: string, projectId: string) => void;
  onAddTaskToProject: (goalId: string, projectId: string, title: string) => void;
  onToggleTaskInProject: (goalId: string, projectId: string, taskId: string) => void;
  onDeleteTaskFromProject: (goalId: string, projectId: string, taskId: string) => void;
  setActiveTab: (tab: string) => void;
  onSelectGoal?: (goalId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onUpdateProjectDetails?: (goalId: string, projectId: string, updates: Partial<Project>) => void;
}

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  financial: 'مالی',
  health: 'سلامتی و ورزش',
  career: 'کار و کسب‌وکار',
  learning: 'یادگیری و مهارت',
  personal: 'شخصی و رشد',
  other: 'سایر اهداف'
};

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  financial: 'bg-amber-100 text-amber-800 border-amber-200',
  health: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  career: 'bg-rose-100 text-rose-800 border-rose-200',
  learning: 'bg-stone-100 text-stone-800 border-stone-200',
  personal: 'bg-amber-100 text-amber-800 border-amber-200',
  other: 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function ProjectDashboard({
  goals,
  onAddProjectToGoal,
  onDeleteProjectFromGoal,
  onAddTaskToProject,
  onToggleTaskInProject,
  onDeleteTaskFromProject,
  setActiveTab,
  onSelectGoal,
  onSelectProject,
  onUpdateProjectDetails
}: ProjectDashboardProps) {
  // Sub-view Tab state
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'gantt' | 'tree'>('list');

  // Navigation & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('all');
  
  // New Project Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Expandable projects tasks tracker
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Flatten projects with goal relationship
  const allProjects = goals.flatMap(g => {
    const projects = g.projects || [];
    return projects.map(p => ({
      ...p,
      goalId: g.id,
      goalTitle: g.title,
      goalCategory: g.category
    }));
  });

  // Calculate high-level stats
  const totalProjectsCount = allProjects.length;
  const completedProjectsCount = allProjects.filter(p => p.completed).length;
  const activeProjectsCount = totalProjectsCount - completedProjectsCount;
  
  const totalTasks = allProjects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const completedTasks = allProjects.reduce((sum, p) => sum + (p.tasks?.filter(t => t.completed).length || 0), 0);
  const taskProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtered projects list
  const filteredProjects = allProjects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'completed' && p.completed) || 
                          (statusFilter === 'active' && !p.completed);
    const matchesGoal = selectedGoalFilter === 'all' || p.goalId === selectedGoalFilter;

    return matchesSearch && matchesStatus && matchesGoal;
  });

  // Handle submit new project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !newProjTitle.trim()) return;

    onAddProjectToGoal(selectedGoalId, newProjTitle.trim(), newProjDesc.trim());
    
    // Reset Form
    setNewProjTitle('');
    setNewProjDesc('');
    setSelectedGoalId('');
    setShowAddForm(false);
  };

  // Handle submit task within expanded project
  const handleCreateTask = (goalId: string, projectId: string) => {
    if (!newTaskTitle.trim()) return;
    onAddTaskToProject(goalId, projectId, newTaskTitle.trim());
    setNewTaskTitle('');
  };

  const handleMoveStatus = (project: any, direction: 'prev' | 'next') => {
    const statuses: ('waiting' | 'in_progress' | 'paused' | 'completed')[] = ['waiting', 'in_progress', 'paused', 'completed'];
    const currentStatus = project.status || (project.completed ? 'completed' : 'in_progress');
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < statuses.length) {
      const nextStatus = statuses[nextIndex];
      if (onUpdateProjectDetails) {
        onUpdateProjectDetails(project.goalId, project.id, { status: nextStatus, completed: nextStatus === 'completed' });
      }
    }
  };

  const handleSetStatus = (project: any, nextStatus: 'waiting' | 'in_progress' | 'paused' | 'completed') => {
    if (onUpdateProjectDetails) {
      onUpdateProjectDetails(project.goalId, project.id, { status: nextStatus, completed: nextStatus === 'completed' });
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl" id="project-dashboard-root">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FDFBF7] p-6 rounded-3xl border border-[#E6DFD3]">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-[#2D3025] flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#E26645]" />
            <span>مرکز مدیریت و پیشبرد پروژه‌ها</span>
          </h3>
          <p className="text-[10px] text-[#8D7F72] leading-relaxed">
            پروژه‌ها و تسک‌های عملیاتی خود را که برای تحقق اهداف بلندمدت طراحی کرده‌اید، به صورت متمرکز در این پنل کنترل و پیگیری کنید.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (goals.length > 0 && !selectedGoalId) {
              setSelectedGoalId(goals[0].id);
            }
          }}
          className="px-4 py-2.5 bg-[#E26645] hover:bg-[#C94B2A] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start md:self-center"
        >
          <FolderPlus className="w-4 h-4" />
          <span>تعریف پروژه جدید</span>
        </button>
      </div>

      {/* 2. Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E6DFD3] space-y-1">
          <span className="text-[9px] font-bold text-[#8D7F72] block">کل پروژه‌های تعریف شده</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-[#2D3025] font-mono">{totalProjectsCount}</span>
            <span className="text-[10px] text-[#8D7F72]">پروژه</span>
          </div>
        </div>

        <div className="bg-[#E8ECE0]/40 p-4 rounded-3xl border border-[#DDE2D5] space-y-1">
          <span className="text-[9px] font-bold text-[#7C8363] block">پروژه‌های تکمیل‌شده</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-[#7C8363] font-mono">{completedProjectsCount}</span>
            <span className="text-[10px] text-[#7C8363]">پروژه</span>
          </div>
        </div>

        <div className="bg-[#F9F1D8]/40 p-4 rounded-3xl border border-[#EBE3C8] space-y-1">
          <span className="text-[9px] font-bold text-[#5A5A40] block">پروژه‌های در حال اجرا</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-[#5A5A40] font-mono">{activeProjectsCount}</span>
            <span className="text-[10px] text-[#5A5A40]">فعال</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E6DFD3] space-y-1">
          <span className="text-[9px] font-bold text-[#8D7F72] block">نرخ تکمیل تسک‌های پروژه</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#E26645] font-mono">{taskProgressPct}%</span>
            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#E26645] h-full" style={{ width: `${taskProgressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Add Project Collapsible Panel */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateProject} className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#E6DFD3]/50">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-[#7C8363]" />
                  <span>تعریف و پیوند پروژه به هدف جدید</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-[#8D7F72] hover:bg-[#E6DFD3]/40 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">انتخاب هدف پیوندیافته</label>
                  <select
                    value={selectedGoalId}
                    onChange={e => setSelectedGoalId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    required
                  >
                    <option value="" disabled>-- انتخاب هدف مرتبط --</option>
                    {goals.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-right md:col-span-2">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">عنوان پروژه</label>
                  <input
                    type="text"
                    placeholder="مثلاً: برنامه تمرینات هوازی ۲ ماهه"
                    value={newProjTitle}
                    onChange={e => setNewProjTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    required
                  />
                </div>

                <div className="space-y-1 text-right md:col-span-3">
                  <label className="text-[10px] font-bold text-[#8D7F72] block">توضیحات و فرآیند پروژه (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثلاً: ۳ جلسه دویدن طولانی در هفته، هدف بهبود ضربان قلب و کاهش چربی بدنی..."
                    value={newProjDesc}
                    onChange={e => setNewProjDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  ثبت پروژه
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Filters Panel */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6DFD3] flex flex-col md:flex-row gap-3 items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8D7F72] absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجوی پروژه‌ها..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'همه وضعیت‌ها' },
            { id: 'active', label: 'جاری / فعال' },
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

        {/* Goal Filter */}
        <div className="w-full md:w-auto md:mr-auto flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#8D7F72] whitespace-nowrap">فیلتر هدف:</span>
          <select
            value={selectedGoalFilter}
            onChange={e => setSelectedGoalFilter(e.target.value)}
            className="px-2 py-1.5 text-[10px] bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl focus:outline-none font-bold text-[#3D3D3D] cursor-pointer"
          >
            <option value="all">همه اهداف</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUB-VIEW SELECTOR BUTTONS */}
      <div className="flex bg-[#F9F6EE] p-1 rounded-2xl border border-[#E6DFD3] max-w-2xl overflow-x-auto scrollbar-none">
        {[
          { id: 'list', label: '🗂️ نمای لیست پروژه‌ها' },
          { id: 'kanban', label: '📋 بورد کانبان پیشرفته' },
          { id: 'gantt', label: '📊 نمودار گانت زمان‌بندی' },
          { id: 'tree', label: '🌲 نمودار درختی ساختار' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewMode(tab.id as any)}
            className={`flex-1 py-2 px-4 text-[10px] font-black rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
              viewMode === tab.id
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:text-[#2D3025]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Render Selected View */}
      <div className="space-y-4">
        
        {/* ==================== VIEW 1: LIST VIEW ==================== */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const isExpanded = expandedProjectId === project.id;
                const tasksList = project.tasks || [];
                const doneTasksCount = tasksList.filter(t => t.completed).length;
                const totalTasksCount = tasksList.length;
                const pct = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

                return (
                  <div 
                    key={project.id}
                    className={`bg-[#FDFBF7] rounded-3xl border transition-all ${
                      project.completed 
                        ? 'border-[#DDE2D5]/70 bg-[#E8ECE0]/5' 
                        : 'border-[#E6DFD3] hover:border-[#7C8363]/40'
                    }`}
                  >
                    {/* Project Card Header Area */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 text-right">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-xs font-black ${project.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                              {project.title}
                            </h4>

                            {/* Goal Badge */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectGoal) {
                                  onSelectGoal(project.goalId);
                                  setActiveTab('goals');
                                }
                              }}
                              className="px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer bg-white text-[#8D7F72]"
                            >
                              <Tag className="w-3 h-3" />
                              <span>هدف: {project.goalTitle}</span>
                            </button>
                          </div>

                          {project.description && (
                            <p className="text-[10px] text-[#8D7F72] leading-relaxed max-w-2xl">{project.description}</p>
                          )}
                        </div>

                        {/* Delete Project */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('آیا مطمئن هستید که می‌خواهید این پروژه و کلیه تسک‌های درون آن را حذف کنید؟')) {
                              onDeleteProjectFromGoal(project.goalId, project.id);
                            }
                          }}
                          className="p-2 text-[#E26645]/70 hover:text-[#E26645] hover:bg-[#E26645]/10 rounded-xl transition-all cursor-pointer"
                          title="حذف پروژه"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Progress & Quick Stats bar */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-[#E6DFD3]/30">
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-[10px] font-bold text-[#8D7F72] whitespace-nowrap min-w-[70px]">
                            پیشرفت تسک‌ها: {doneTasksCount} از {totalTasksCount} ({pct}%)
                          </span>
                          <div className="flex-1 h-2 bg-[#E6DFD3]/40 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                project.completed ? 'bg-[#7C8363]' : 'bg-[#E26645]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end">
                          {onSelectProject && (
                            <button
                              type="button"
                              onClick={() => onSelectProject(project.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#7C8363] hover:bg-[#5A5A40] text-[10px] font-black text-white hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>صفحه جزییات و یادداشت‌ها</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                            className="px-3.5 py-1.5 rounded-xl border border-[#D6CFC3] hover:border-[#7C8363] text-[10px] font-extrabold text-[#3D3D3D] hover:text-[#7C8363] transition-all flex items-center gap-1 cursor-pointer bg-white"
                          >
                            <ListTodo className="w-3.5 h-3.5" />
                            <span>مدیریت کارهای درون پروژه ({totalTasksCount})</span>
                          </button>

                          {project.completed ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[10px] font-black text-[#7C8363] flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-[#7C8363]" />
                              <span>تکمیل‌شده</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-[10px] font-black text-[#9B6B61] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#9B6B61]" />
                              <span>در حال اجرا</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Tasks Management Area */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden bg-[#F9F6EE]/40 border-t border-[#E6DFD3]/50 rounded-b-3xl"
                        >
                          <div className="p-5 space-y-4">
                            <h5 className="text-[10px] font-black text-[#2D3025]">لیست کارها و زیرمجموعه‌ها:</h5>
                            
                            {/* Tasks list */}
                            <div className="space-y-2">
                              {tasksList.length > 0 ? (
                                tasksList.map((task) => (
                                  <div 
                                    key={task.id}
                                    className="flex items-center justify-between p-3 bg-white border border-[#E6DFD3] rounded-2xl hover:bg-[#E8ECE0]/10 transition-colors"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => onToggleTaskInProject(project.goalId, project.id, task.id)}
                                      className="flex items-center gap-3 cursor-pointer text-right flex-1"
                                    >
                                      {task.completed ? (
                                        <CheckSquare className="w-4.5 h-4.5 text-[#7C8363] shrink-0" />
                                      ) : (
                                        <Square className="w-4.5 h-4.5 text-[#8D7F72] shrink-0" />
                                      )}
                                      <span className={`text-xs font-bold ${task.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'}`}>
                                        {task.title}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => onDeleteTaskFromProject(project.goalId, project.id, task.id)}
                                      className="p-1.5 text-rose-600/70 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="حذف تسک"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-5 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72]">
                                  هنوز تسکی در این پروژه ثبت نشده است. کارهای خرد پروژه را از کادر زیر بیفزایید.
                                </div>
                              )}
                            </div>

                            {/* Add Task Box */}
                            <div className="flex gap-2 pt-2 border-t border-[#E6DFD3]/30">
                              <input 
                                type="text"
                                placeholder="کار خرد جدید در این پروژه..."
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleCreateTask(project.goalId, project.id);
                                }}
                                className="flex-1 px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs bg-white text-[#3D3D3D] focus:outline-none focus:border-[#7C8363]"
                              />
                              <button 
                                type="button"
                                onClick={() => handleCreateTask(project.goalId, project.id)}
                                className="px-4 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center shrink-0"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#E6DFD3] text-xs text-[#8D7F72] space-y-2">
                <p>پروژه‌ای مطابق فیلترهای بالا یافت نشد.</p>
                <p className="text-[10px]">می‌توانید با دکمه بالا یک پروژه برای اهداف خود بسازید یا فیلترها را تغییر دهید.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW 2: ADVANCED KANBAN BOARD ==================== */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start pt-2">
            {[
              { id: 'waiting', label: '⏳ در انتظار شروع', color: 'border-slate-200 bg-slate-50/50 text-slate-800' },
              { id: 'in_progress', label: '🚀 در حال اقدام', color: 'border-blue-200 bg-blue-50/50 text-blue-800' },
              { id: 'paused', label: '⏸️ متوقف شده', color: 'border-amber-200 bg-amber-50/50 text-amber-800' },
              { id: 'completed', label: '✅ تکمیل شده', color: 'border-emerald-200 bg-emerald-50/50 text-emerald-800' }
            ].map(col => {
              const columnProjects = filteredProjects.filter(p => {
                const currentStatus = p.status || (p.completed ? 'completed' : 'in_progress');
                return currentStatus === col.id;
              });

              return (
                <div key={col.id} className="bg-[#FDFBF7] rounded-3xl border border-[#E6DFD3] p-4 flex flex-col space-y-3.5 min-h-[400px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3]/60">
                    <span className="text-[11px] font-black text-[#2D3025]">{col.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E6DFD3]/40 text-[#8D7F72] rounded-md font-mono">
                      {columnProjects.length}
                    </span>
                  </div>

                  {/* Card List */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-0.5">
                    {columnProjects.length > 0 ? (
                      columnProjects.map(proj => {
                        const tasks = proj.tasks || [];
                        const completedCount = tasks.filter(t => t.completed).length;
                        const totalCount = tasks.length;
                        const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                          <div 
                            key={proj.id} 
                            className="bg-white p-3.5 rounded-2xl border border-[#E6DFD3]/80 hover:border-[#7C8363] transition-all shadow-xs flex flex-col space-y-3 text-right relative group"
                          >
                            <div className="space-y-1">
                              <span className="text-[8px] font-extrabold text-[#7C8363] bg-[#E8ECE0] px-2 py-0.5 rounded-md">
                                {proj.goalTitle}
                              </span>
                              <h5 className="text-[11px] font-black text-[#2D3025] leading-tight pt-1 group-hover:text-[#7C8363] transition-colors">
                                {proj.title}
                              </h5>
                              {proj.description && (
                                <p className="text-[9px] text-[#8D7F72] truncate max-w-full">{proj.description}</p>
                              )}
                            </div>

                            {/* Task progress inline */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[8px] font-black text-[#8D7F72]">
                                <span>پیشرفت کارها:</span>
                                <span>{completedCount} از {totalCount} ({progressPct}%)</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#E26645]" style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>

                            {/* Responsive Status Changers (Move back & forth) */}
                            <div className="flex items-center justify-between pt-2 border-t border-[#E6DFD3]/40 gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoveStatus(proj, 'prev')}
                                className="p-1 bg-[#F9F6EE] hover:bg-[#E6DFD3] text-[#8D7F72] border border-[#E6DFD3] rounded-lg cursor-pointer transition-all active:scale-90 flex items-center justify-center"
                                title="انتقال به ستون قبلی"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              <select
                                value={col.id}
                                onChange={(e) => handleSetStatus(proj, e.target.value as any)}
                                className="text-[8px] font-bold py-1 px-1 bg-[#F9F6EE] border border-[#D6CFC3] rounded-lg text-[#2D3025] focus:outline-none flex-1 max-w-[90px] text-center cursor-pointer"
                              >
                                <option value="waiting">در انتظار</option>
                                <option value="in_progress">جاری</option>
                                <option value="paused">متوقف</option>
                                <option value="completed">تکمیل</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleMoveStatus(proj, 'next')}
                                className="p-1 bg-[#F9F6EE] hover:bg-[#E6DFD3] text-[#8D7F72] border border-[#E6DFD3] rounded-lg cursor-pointer transition-all active:scale-90 flex items-center justify-center"
                                title="انتقال به ستون بعدی"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-[9px] text-[#8D7F72] font-semibold border border-dashed border-[#D6CFC3] rounded-2xl bg-white/40">
                        پروژه‌ای در این ستون نیست
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ==================== VIEW 3: GANTT CHART ==================== */}
        {viewMode === 'gantt' && (
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#E6DFD3] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/60">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#7C8363]" />
                  <span>زمان‌بندی خطی و بررسی وابستگی‌ها (Gantt Chart)</span>
                </h4>
                <p className="text-[9px] text-[#8D7F72] font-semibold">توالی، تداخل، وضعیت دلاین‌ها و قفل‌های پیش‌نیاز را به صورت یکپارچه ببینید</p>
              </div>
            </div>

            {/* Visual Timeline Table */}
            <div className="space-y-4 overflow-x-auto">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(proj => {
                  const tasks = proj.tasks || [];
                  return (
                    <div key={proj.id} className="border-b border-[#E6DFD3]/40 pb-4 last:border-0 last:pb-0">
                      {/* Project Row */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div className="md:col-span-1 text-right space-y-1">
                          <span className="text-[8px] font-black text-[#8D7F72] bg-[#E8ECE0] px-1.5 py-0.5 rounded-md">
                            {proj.goalTitle}
                          </span>
                          <h5 className="text-xs font-black text-[#2D3025]">{proj.title}</h5>
                        </div>

                        {/* Visual representation / progress block */}
                        <div className="md:col-span-3 flex items-center gap-4">
                          <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative border border-slate-200">
                            {/* Inner progress bar */}
                            <div 
                              className="h-full bg-gradient-to-l from-[#7C8363] to-[#E26645] rounded-full transition-all duration-500" 
                              style={{ width: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%` }}
                            />
                            {/* Visual Timeline Grid Guides */}
                            <div className="absolute inset-0 flex justify-between pointer-events-none text-[8px] px-3 items-center text-white font-mono font-bold drop-shadow-xs">
                              <span>شروع</span>
                              <span>برنامه</span>
                              <span>دلاین نهایی</span>
                            </div>
                          </div>

                          <span className="text-[9px] font-black text-[#7C8363] font-mono">
                            {tasks.filter(t => t.completed).length}/{tasks.length} تسک
                          </span>
                        </div>
                      </div>

                      {/* Tasks timeline nested cards */}
                      {tasks.length > 0 && (
                        <div className="mt-2.5 mr-6 space-y-1.5 border-r-2 border-[#E6DFD3] pr-3 text-right">
                          {tasks.map(task => {
                            // Find any unresolved dependencies
                            const dependencies = task.dependencies || [];
                            const allProjectTasks = filteredProjects.flatMap(p => p.tasks || []);
                            
                            const dependencyObjects = dependencies.map(depId => 
                              allProjectTasks.find(t => t.id === depId)
                            ).filter(Boolean);

                            const missingDeps = dependencyObjects.filter(d => !d?.completed);
                            const isBlocked = missingDeps.length > 0;

                            return (
                              <div 
                                key={task.id} 
                                className={`flex flex-col md:flex-row md:items-center justify-between p-2.5 rounded-xl border text-xs gap-3 ${
                                  task.completed 
                                    ? 'bg-[#E8ECE0]/20 border-[#DDE2D5] text-[#8D7F72]' 
                                    : isBlocked 
                                      ? 'bg-rose-50/40 border-rose-100 text-[#2D3025]' 
                                      : 'bg-white border-[#E6DFD3] text-[#3D3D3D]'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    task.completed 
                                      ? 'bg-[#7C8363] border-[#7C8363] text-white' 
                                      : 'border-[#C6BFA3]'
                                  }`}>
                                    {task.completed && <span className="text-[8px] font-black">✓</span>}
                                  </div>
                                  <span className={`font-semibold truncate ${task.completed ? 'line-through opacity-70' : ''}`}>
                                    {task.title}
                                  </span>
                                </div>

                                {/* Dependency Flow Visualizer */}
                                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                                  {dependencies.length > 0 ? (
                                    isBlocked ? (
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-[8px] text-rose-700 font-black rounded-md flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                          <span>مسدود شده توسط:</span>
                                        </span>
                                        {missingDeps.map(d => (
                                          <span key={d?.id} className="px-1.5 py-0.5 bg-slate-100 text-[7px] font-bold rounded-sm border border-slate-200">
                                            {d?.title}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-[8px] text-emerald-700 font-bold rounded-md flex items-center gap-1">
                                        <span>✓ پیش‌نیازها آزاد شد</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[8px] text-[#8D7F72] font-semibold">بدون قفل پیش‌نیاز</span>
                                  )}

                                  {task.dueDate && (
                                    <span className="text-[8px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-100 shrink-0">
                                      ⏱️ {task.dueDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-6 text-xs text-[#8D7F72]">پروژه‌ای برای نمایش یافت نشد.</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== VIEW 4: TREE DIAGRAM ==================== */}
        {viewMode === 'tree' && (
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#E6DFD3] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/60">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-[#E26645]" />
                  <span>نقشه درختی ساختار زندگی (Life Structure Tree)</span>
                </h4>
                <p className="text-[9px] text-[#8D7F72] font-semibold">اتصال ریشه‌ای اهداف کلان به پروژه‌های عملیاتی و کارهای خرد روزانه را بررسی کنید</p>
              </div>
            </div>

            {/* Tree Nodes Container */}
            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
              {goals.length > 0 ? (
                goals.map(g => {
                  const goalProjects = filteredProjects.filter(p => p.goalId === g.id);
                  return (
                    <div key={g.id} className="space-y-4 bg-white p-4 rounded-2xl border border-[#E6DFD3]/60">
                      {/* Root Goal Node */}
                      <div className="flex items-center gap-2 bg-[#E26645]/5 p-2.5 rounded-xl border border-[#E26645]/20">
                        <span className="text-base">🎯</span>
                        <div className="text-right">
                          <span className="text-[7px] font-bold text-[#E26645] uppercase tracking-wider block">هدف کلان</span>
                          <h4 className="text-xs font-black text-[#2D3025]">{g.title}</h4>
                        </div>
                      </div>

                      {/* Project Branch Nodes */}
                      {goalProjects.length > 0 ? (
                        <div className="mr-6 border-r-2 border-dashed border-[#C6BFA3] pr-4 space-y-4 text-right">
                          {goalProjects.map(proj => {
                            const tasks = proj.tasks || [];
                            return (
                              <div key={proj.id} className="space-y-2 relative">
                                {/* Connector Dot */}
                                <div className="absolute top-4 -right-[21px] w-2 h-2 bg-[#7C8363] rounded-full border border-white" />
                                
                                <div className="flex items-center gap-2 bg-[#7C8363]/5 p-2 rounded-xl border border-[#7C8363]/20">
                                  <span className="text-xs">📂</span>
                                  <div className="text-right">
                                    <span className="text-[7px] font-bold text-[#7C8363] block">پروژه میانی</span>
                                    <h5 className="text-[11px] font-black text-[#2D3025]">{proj.title}</h5>
                                  </div>
                                </div>

                                {/* Task Nodes */}
                                {tasks.length > 0 ? (
                                  <div className="mr-5 border-r border-[#E6DFD3] pr-3 space-y-1 pt-1 text-right">
                                    {tasks.map(task => (
                                      <div key={task.id} className="flex items-center gap-1.5 py-1 text-xs text-[#3D3D3D] relative">
                                        {/* Connector branch line */}
                                        <div className="absolute top-3 -right-[16px] w-3 h-[1px] bg-[#E6DFD3]" />
                                        <span className="text-[9px] text-[#8D7F72]">├─</span>
                                        <span className="text-[9px]">◽</span>
                                        <span className={`font-semibold ${task.completed ? 'line-through text-[#8D7F72]' : ''}`}>
                                          {task.title}
                                        </span>
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
                })
              ) : (
                <p className="text-center py-6 text-xs text-[#8D7F72]">هدفی برای ساخت درخت اهداف یافت نشد.</p>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
