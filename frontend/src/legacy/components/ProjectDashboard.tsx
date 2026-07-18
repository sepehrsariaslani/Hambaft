import React, { useState } from 'react';
import { Goal, Project, Task, GoalCategory } from '../types';
import ProjectTableView from './ProjectTableView';
import ProjectKanbanView from './ProjectKanbanView';
import ViewSwitcher, { type ViewMode } from './ViewSwitcher';
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
  GitFork
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
  financial: 'bg-[#F9F1D8] text-[#5A5A40] border-[#EBE3C8]',
  health: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  career: 'bg-rose-100 text-rose-800 border-rose-200',
  learning: 'bg-stone-100 text-stone-800 border-stone-200',
  personal: 'bg-[#F9F1D8] text-[#5A5A40] border-[#EBE3C8]',
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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
            <div className="flex-1 bg-[#E6DFD3]/40 h-2 rounded-full overflow-hidden">
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

      {/* SUB-VIEW SELECTOR — reusable ViewSwitcher */}
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
                            <span className="px-3 py-1 rounded-xl bg-[#F9F1D8] border border-[#EBE3C8] text-[10px] font-black text-[#9B6B61] flex items-center gap-1">
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

        {/* ==================== VIEW 2: TABLE VIEW ==================== */}
        {viewMode === 'table' && (
          <ProjectTableView
            projects={filteredProjects}
            goals={goals}
            onUpdateProject={onUpdateProjectDetails || (() => {})}
            onDeleteProject={onDeleteProjectFromGoal}
            onViewProjectDetails={onSelectProject}
          />
        )}

        {/* ==================== VIEW 3: KANBAN BOARD WITH DRAG-AND-DROP ==================== */}
        {viewMode === 'kanban' && (
          <ProjectKanbanView
            projects={filteredProjects}
            onUpdateProject={onUpdateProjectDetails || (() => {})}
            onDeleteProject={onDeleteProjectFromGoal}
            onViewProjectDetails={onSelectProject}
          />
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
