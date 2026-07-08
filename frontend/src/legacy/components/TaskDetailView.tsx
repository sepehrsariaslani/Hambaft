import React, { useState } from 'react';
import { Task, SubTask } from '../types';
import PersianDatePicker from './PersianDatePicker';
import EntityNoteEditor from '../../notes/components/EntityNoteEditor';
import { 
  ArrowRight, 
  CheckCircle, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Tag, 
  CheckSquare, 
  Circle, 
  Sparkles,
  Pin,
  Layers,
  Edit2,
  Play,
  Pause,
  Square,
  RotateCcw,
  FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPersianDigits, formatTimeDigital, formatTimeHuman } from '../App';

interface TaskDetailViewProps {
  task: Task;
  allTasks?: Task[];
  goals?: any[];
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (id: string) => void;
  onBack: () => void;

  // Timer Props
  activeTimerTaskId: string | null;
  activeTimerSeconds: number;
  isTimerRunning: boolean;
  onStartTimer: (taskId: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  onResetTimer: (taskId: string) => void;
}

const CATEGORIES = [
  { id: 'work', label: 'کاری', color: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100' },
  { id: 'personal', label: 'شخصی', color: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  { id: 'health', label: 'سلامت', color: 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100' },
  { id: 'finance', label: 'مالی', color: 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100' },
  { id: 'learning', label: 'یادگیری', color: 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100' },
  { id: 'other', label: 'سایر', color: 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100' }
] as const;

const PRIORITIES = [
  { id: 'low', label: 'پایین', color: 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]' },
  { id: 'medium', label: 'متوسط', color: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#9B6B61]' },
  { id: 'high', label: 'فوری', color: 'bg-[#F4E9E4] border-[#EDDDD7] text-red-700 font-bold' }
] as const;

export default function TaskDetailView({
  task,
  allTasks = [],
  goals = [],
  onUpdateTask,
  onDeleteTask,
  onBack,
  activeTimerTaskId,
  activeTimerSeconds,
  isTimerRunning,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onResetTimer
}: TaskDetailViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(task.title);
  const [newSubTaskText, setNewSubTaskText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 1. Update Title
  const handleSaveTitle = () => {
    if (!tempTitle.trim()) return;
    onUpdateTask({ ...task, title: tempTitle.trim() });
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') {
      setTempTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  // 2. Update Description
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateTask({ ...task, description: e.target.value });
  };

  // 4. Update Priority
  const handlePrioritySelect = (priority: 'low' | 'medium' | 'high') => {
    onUpdateTask({ ...task, priority });
  };

  // 5. Update Category
  const handleCategorySelect = (category: typeof CATEGORIES[number]['id']) => {
    onUpdateTask({ ...task, category });
  };

  // 6. Sub-task management
  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTaskText.trim()) return;

    const newSub: SubTask = {
      id: `subtk-${Date.now()}`,
      title: newSubTaskText.trim(),
      completed: false
    };

    const updatedSubtasks = [...(task.subTasks || []), newSub];
    onUpdateTask({ ...task, subTasks: updatedSubtasks });
    setNewSubTaskText('');
  };

  const handleToggleSubTask = (subId: string) => {
    const updatedSubtasks = (task.subTasks || []).map(st =>
      st.id === subId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask({ ...task, subTasks: updatedSubtasks });
  };

  const handleDeleteSubTask = (subId: string) => {
    const updatedSubtasks = (task.subTasks || []).filter(st => st.id !== subId);
    onUpdateTask({ ...task, subTasks: updatedSubtasks });
  };

  // Stats
  const possibleDependencies = (allTasks || []).filter(t => t.id !== task.id);
  const subTasksList = task.subTasks || [];
  const completedSubCount = subTasksList.filter(st => st.completed).length;
  const totalSubCount = subTasksList.length;
  const subProgressPercentage = totalSubCount > 0
    ? Math.round((completedSubCount / totalSubCount) * 100)
    : 0;

  return (
    <div className="space-y-4 text-right pb-16" dir="rtl">

      {/* HEADER BAR */}
      <div className="flex justify-between items-center bg-[#FDFBF7] py-2 border-b border-[#E6DFD3]/40">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-2 bg-[#F9F6EE] hover:bg-[#E6DFD3]/60 border border-[#E6DFD3] rounded-xl text-[#8D7F72] transition-all cursor-pointer shrink-0 active:scale-95"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-[#8D7F72] truncate">جزئیات و برنامه‌ریزی کار</span>
        </div>

        {/* Delete with inline confirm */}
        <div className="shrink-0">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-red-600 font-bold hidden sm:block">حذف شود؟</span>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-xl cursor-pointer transition-all active:scale-95"
              >
                بله
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1.5 bg-[#F9F6EE] hover:bg-[#E6DFD3] text-[#8D7F72] text-[10px] font-bold rounded-xl border border-[#E6DFD3] cursor-pointer transition-all active:scale-95"
              >
                نه
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all cursor-pointer border border-red-100 active:scale-95"
              title="حذف کار"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* QUICK STATUS HERO */}
      <div className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E6DFD3] space-y-3 shadow-xs">
        <div className="flex items-start gap-3">

          {/* Complete Status Toggle */}
          <button
            onClick={() => onUpdateTask({ ...task, completed: !task.completed })}
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all shrink-0 cursor-pointer active:scale-90 ${
              task.completed
                ? 'bg-[#7C8363] border-[#7C8363] text-white shadow-sm'
                : 'bg-[#F9F6EE] border-[#D6CFC3] text-[#8D7F72] hover:border-[#7C8363]'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
          </button>

          {/* Title Section */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm font-bold border-2 border-[#7C8363] rounded-xl bg-white focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-3 py-1.5 text-xs font-bold bg-[#7C8363] text-white rounded-xl cursor-pointer shrink-0 active:scale-95"
                >
                  ذخیره
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-1.5">
                <h3 className={`text-sm font-extrabold leading-snug flex-1 min-w-0 break-words ${
                  task.completed ? 'line-through text-[#8D7F72] opacity-75' : 'text-[#2D3025]'
                }`}>
                  {task.title}
                </h3>
                {/* Always visible edit button (important for mobile) */}
                <button
                  onClick={() => { setTempTitle(task.title); setIsEditingTitle(true); }}
                  className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E8ECE0]/50 rounded-lg cursor-pointer shrink-0 transition-all active:scale-90"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <span className="text-[9px] text-[#8D7F72] block mt-1 font-mono">تاریخ ایجاد: {task.createdAt}</span>
          </div>
        </div>

        {/* Sub-task progress bar */}
        {totalSubCount > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[#E6DFD3]/40">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-[#8D7F72]">پیشرفت مراحل فرعی</span>
              <span className="text-[#7C8363] font-mono">{completedSubCount} از {totalSubCount} • {subProgressPercentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-[#F3EFE6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7C8363] rounded-full transition-all duration-500"
                style={{ width: `${subProgressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* TIME TRACKER DASHBOARD */}
      <div className="bg-[#2D3025] text-[#D6CFC3] p-5 rounded-3xl border border-white/5 space-y-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-base">⏱️</span>
            <span className="text-xs font-black text-white">زمان‌سنج و ردیاب توازن کار</span>
          </div>
          {task.totalTimeSpent && task.totalTimeSpent > 0 ? (
            <button
              onClick={() => {
                if (confirm('آیا می‌خواهید تمام زمان ثبت‌شده برای این تسک را صفر کنید؟')) {
                  onResetTimer(task.id);
                  onUpdateTask({ ...task, totalTimeSpent: 0 });
                }
              }}
              className="text-[10px] text-[#C6BFA3] hover:text-red-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>پاک‌سازی تاریخچه</span>
            </button>
          ) : null}
        </div>

        {/* Current Accumulated Time Box */}
        <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 flex justify-between items-center">
          <span className="text-[10px] text-[#DDE2D5]/70 font-bold">کل کارکرد ثبت‌شده:</span>
          <span className="text-xs font-black text-white">
            {task.totalTimeSpent && task.totalTimeSpent > 0 
              ? formatTimeHuman(task.totalTimeSpent) 
              : 'هنوز زمانی ثبت نشده است'}
          </span>
        </div>

        {/* Live Timer Controls if this task is being tracked */}
        {activeTimerTaskId === task.id ? (
          <div className="bg-[#E26645]/10 border border-[#E26645]/20 rounded-2xl p-4 flex flex-col items-center gap-3.5 text-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              <span className="text-[10px] text-[#E26645] font-black">جلسه ردیابی فعال</span>
            </div>

            {/* Huge Digital Timer */}
            <div className="text-3xl font-mono font-black text-white tracking-widest bg-black/20 px-6 py-2 rounded-2xl border border-white/5">
              {formatTimeDigital(activeTimerSeconds)}
            </div>

            {/* Interactive Control Buttons */}
            <div className="flex gap-2 w-full max-w-[280px]">
              {isTimerRunning ? (
                <button
                  onClick={onPauseTimer}
                  className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Pause className="w-4 h-4 fill-current animate-pulse" />
                  <span>توقف موقت</span>
                </button>
              ) : (
                <button
                  onClick={onResumeTimer}
                  className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>ادامه کار</span>
                </button>
              )}

              <button
                onClick={onStopTimer}
                className="flex-1 py-2.5 bg-[#E26645]/20 hover:bg-[#E26645]/30 border border-[#E26645]/30 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>ثبت و اتمام</span>
              </button>
            </div>
          </div>
        ) : (
          /* Start Timer option if not active */
          <div className="pt-1">
            {!task.completed ? (
              <button
                onClick={() => onStartTimer(task.id)}
                className="w-full py-3 bg-[#E26645] hover:bg-[#C94B2A] text-white font-black rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>شروع ردیاب زمان برای این کار</span>
              </button>
            ) : (
              <div className="text-center py-2 text-[10px] text-[#8D7F72] font-semibold bg-white/5 rounded-xl border border-dashed border-white/5">
                این تسک با موفقیت انجام شده است و امکان ردیابی زمان ندارد.
              </div>
            )}
          </div>
        )}
      </div>

      {/* PLANNING CARD */}
      <div className="space-y-4">

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#7C8363]" />
            <span>توضیحات و یادداشت‌های برنامه‌ریزی</span>
          </label>
          <textarea
            placeholder="یادداشت‌های خود را در مورد جزییات، نحوه انجام، منابع لازم و برنامه ریزی این کار بنویسید..."
            value={task.description || ''}
            onChange={handleDescriptionChange}
            rows={3}
            className="w-full p-3 text-xs bg-[#FDFBF7] border border-[#D6CFC3] rounded-2xl focus:outline-none focus:border-[#7C8363] text-[#3D3D3D] leading-relaxed resize-none font-semibold"
          />
        </div>

        {/* Date & Priority — stack on mobile, side-by-side on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#9B6B61]" />
              <span>مهلت انجام (دلاین)</span>
            </label>
            <PersianDatePicker
              value={task.dueDate || ''}
              onChange={(d) => onUpdateTask({ ...task, dueDate: d })}
              placeholder="انتخاب دلاین..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#E26645]" />
              <span>اولویت کار</span>
            </label>
            <select
              value={task.priority || 'medium'}
              onChange={e => handlePrioritySelect(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs bg-[#FDFBF7] border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025]"
            >
              <option value="low">پایین (غیر فوری)</option>
              <option value="medium">متوسط (عادی)</option>
              <option value="high">بالا (فوری و حیاتی)</option>
            </select>
          </div>
        </div>

        {/* Priority badge selector */}
        <div className="flex gap-2 flex-wrap">
          {PRIORITIES.map(p => (
            <button
              key={p.id}
              onClick={() => handlePrioritySelect(p.id)}
              className={`flex-1 sm:flex-none px-3 py-2 text-[11px] rounded-xl border font-bold cursor-pointer transition-all active:scale-95 ${
                task.priority === p.id
                  ? 'ring-2 ring-[#7C8363] ring-offset-1 ' + p.color
                  : 'bg-[#FDFBF7] border-[#E6DFD3] text-[#8D7F72] hover:bg-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Category tags */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[#7C8363]" />
            <span>دسته‌بندی موضوعی</span>
          </label>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer active:scale-95 ${
                  task.category === cat.id
                    ? 'ring-2 ring-[#7C8363] ring-offset-1 ' + cat.color
                    : 'bg-[#FDFBF7] border-[#E6DFD3] text-[#8D7F72] hover:bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* PROJECT SELECTOR */}
        <div className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E6DFD3] space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[#7C8363]" />
            <h4 className="text-xs font-bold text-[#2D3025]">اختصاص به پروژه</h4>
          </div>
          <select
            value={task.projectId || ''}
            onChange={(e) => onUpdateTask({ ...task, projectId: e.target.value || undefined })}
            className="w-full px-3 py-2.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025]"
          >
            <option value="">-- بدون پروژه --</option>
            {goals.flatMap((g) => (g.projects || []).map((p: any) => ({ ...p, goalTitle: g.title }))).map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.title} (هدف: {project.goalTitle})
              </option>
            ))}
          </select>
          {task.projectId && (
            <div className="text-[10px] text-[#7C8363] font-semibold bg-[#E8ECE0] px-2 py-1 rounded-lg inline-block">
              این تسک به پروژه اختصاص دارد
            </div>
          )}
        </div>

        {/* DAILY HIGHLIGHT (تسک برجسته روز) */}
        <div className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E5C158]/50 shadow-xs relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#E5C158]/5 rounded-full blur-lg pointer-events-none" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <h4 className="text-xs font-black text-[#2D3025]">تسک برجسته و حیاتی روز (Daily Highlight)</h4>
                <p className="text-[9px] text-[#8D7F72] font-semibold">این کار را به عنوان ۱ تا ۳ کار کلیدی امروز سنجاق کنید</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => onUpdateTask({ ...task, isDailyHighlight: !task.isDailyHighlight })}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 shrink-0 ${
                task.isDailyHighlight
                  ? 'bg-[#E5C158] border-[#D4AF37] text-[#2D3025] shadow-xs'
                  : 'bg-white border-[#D6CFC3] text-[#8D7F72] hover:border-[#D4AF37]'
              }`}
            >
              <Pin className={`w-3 h-3 ${task.isDailyHighlight ? 'fill-current' : ''}`} />
              <span>{task.isDailyHighlight ? 'سنجاق شده' : 'سنجاق کردن'}</span>
            </button>
          </div>
        </div>

        {/* TASK DEPENDENCIES (وابستگی کارها) */}
        <div className="bg-[#FDFBF7] p-4 rounded-3xl border border-[#E6DFD3] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔗</span>
              <div>
                <h4 className="text-xs font-black text-[#2D3025]">پیش‌نیازها و وابستگی‌ها (Dependencies)</h4>
                <p className="text-[9px] text-[#8D7F72] font-semibold">کارهایی که پیش‌نیاز آغاز یا تکمیل این تسک هستند</p>
              </div>
            </div>
            {task.dependencies && task.dependencies.length > 0 && (
              <span className="text-[9px] font-bold text-[#7C8363] bg-[#E8ECE0] px-2.5 py-1 rounded-full border border-[#DDE2D5]">
                {task.dependencies.length} پیش‌نیاز
              </span>
            )}
          </div>

          {/* Prerequisite tasks display list */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {possibleDependencies.length > 0 ? (
              possibleDependencies.map(depTask => {
                const isSelected = (task.dependencies || []).includes(depTask.id);
                return (
                  <button
                    key={depTask.id}
                    type="button"
                    onClick={() => {
                      const currentDeps = task.dependencies || [];
                      const updatedDeps = isSelected
                        ? currentDeps.filter(id => id !== depTask.id)
                        : [...currentDeps, depTask.id];
                      onUpdateTask({ ...task, dependencies: updatedDeps });
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-right transition-colors border text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8ECE0]/40 border-[#7C8363] text-[#2D3025] font-bold'
                        : 'bg-white border-[#E6DFD3] text-[#3D3D3D] hover:bg-[#F9F6EE]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#C6BFA3]'
                      }`}>
                        {isSelected && <span className="text-[8px] font-black">✓</span>}
                      </div>
                      <span className="truncate">{depTask.title}</span>
                    </div>

                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md ${
                      depTask.completed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {depTask.completed ? 'تکمیل‌شده' : 'انجام‌نشده'}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-[10px] text-[#8D7F72] text-center py-2 font-semibold">هیچ کار دیگری برای تعریف به عنوان پیش‌نیاز یافت نشد.</p>
            )}
          </div>
        </div>

        {/* SUB-TASKS */}
        <div className="space-y-3 pt-3 border-t border-[#E6DFD3]/40">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-[#2D3025] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#7C8363]" />
              <span>مراحل فرعی</span>
            </label>
            {totalSubCount > 0 && (
              <span className="text-[10px] text-[#8D7F72] font-semibold bg-[#E8ECE0] px-2 py-0.5 rounded-lg">
                {totalSubCount} مرحله
              </span>
            )}
          </div>

          {/* Add sub-task input */}
          <form onSubmit={handleAddSubTask} className="flex gap-2">
            <input
              type="text"
              placeholder="افزودن مرحله فرعی جدید..."
              value={newSubTaskText}
              onChange={e => setNewSubTaskText(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2.5 text-xs bg-[#FDFBF7] border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold"
            />
            <button
              type="submit"
              className="px-3 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white rounded-xl flex items-center justify-center cursor-pointer shrink-0 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Sub-task list — no fixed height on mobile to avoid nested scroll */}
          <AnimatePresence>
            {subTasksList.length > 0 ? (
              <div className="space-y-2">
                {subTasksList.map((st) => (
                  <motion.div
                    key={st.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 p-3 bg-[#FDFBF7] border border-[#E6DFD3] rounded-xl hover:bg-[#E8ECE0]/20 transition-all"
                  >
                    <button
                      onClick={() => handleToggleSubTask(st.id)}
                      className="shrink-0 cursor-pointer active:scale-90 transition-all"
                    >
                      {st.completed ? (
                        <CheckSquare className="w-5 h-5 text-[#7C8363]" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#C6BFA3] hover:text-[#7C8363]" />
                      )}
                    </button>
                    <span
                      onClick={() => handleToggleSubTask(st.id)}
                      className={`flex-1 min-w-0 text-xs font-semibold leading-tight cursor-pointer break-words ${
                        st.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'
                      }`}
                    >
                      {st.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSubTask(st.id)}
                      className="p-1.5 text-[#C6BFA3] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer shrink-0 active:scale-90 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72] flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9B6B61]" />
                <span>کار بزرگ را به خرده‌کارهای کوچک تبدیل کنید!</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* NOTION-LIKE NOTES EDITOR */}
        <div className="pt-4">
          <EntityNoteEditor
            entityId={task.id}
            entityType="task"
            title="یادداشت‌ها و جزئیات (Notion)"
            initialBlocks={task.noteBlocks}
            onSave={(blocks) => onUpdateTask({ ...task, noteBlocks: blocks })}
          />
        </div>

      </div>
    </div>
  );
}
