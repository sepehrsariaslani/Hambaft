import React, { useState } from 'react';
import { Task, JournalEntry, MoodType } from '../types';
import { MOOD_LABELS } from '../initialData';
import { 
  CheckSquare, 
  Trash2, 
  PlusCircle, 
  BookOpen, 
  Smile, 
  Heart, 
  Calendar, 
  Plus,
  Compass,
  FileText,
  Sparkles,
  Meh,
  Moon,
  Frown,
  AlertCircle,
  Info,
  Play,
  Pause,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPersianDigits, formatTimeDigital, formatTimeHuman } from '../App';

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

interface JournalSectionProps {
  tasks: Task[];
  journalEntries: JournalEntry[];
  onAddTask: (title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  onDeleteJournalEntry: (id: string) => void;
  todayDate: string;
  onViewTaskDetails?: (id: string) => void;
  
  // Time Tracker Props
  activeTimerTaskId: string | null;
  activeTimerSeconds: number;
  isTimerRunning: boolean;
  onStartTimer: (taskId: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  onResetTimer: (taskId: string) => void;
}

// Map custom warm colors for moods
const MOOD_THEME_COLORS: Record<MoodType, string> = {
  happy: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  excited: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  neutral: 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]',
  tired: 'bg-[#E6DFD3] border-[#D6CFC3] text-[#8D7F72]',
  stressed: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  sad: 'bg-[#E6DFD3] border-[#D6CFC3] text-[#8D7F72]'
};

export default function JournalSection({
  tasks,
  journalEntries,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddJournalEntry,
  onDeleteJournalEntry,
  todayDate,
  onViewTaskDetails,
  
  activeTimerTaskId,
  activeTimerSeconds,
  isTimerRunning,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onResetTimer
}: JournalSectionProps) {
  // Tasks state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTimeFilter, setTaskTimeFilter] = useState<'all' | 'tracked'>('all');

  // Journal states
  const [jTitle, setJTitle] = useState('');
  const [jContent, setJContent] = useState('');
  const [jMood, setJMood] = useState<MoodType>('happy');
  const [jGratitude, setJGratitude] = useState('');

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onAddTask(taskTitle.trim());
    setTaskTitle('');
  };

  const handleAddJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jTitle.trim() || !jContent.trim()) return;

    onAddJournalEntry({
      date: todayDate,
      title: jTitle.trim(),
      content: jContent.trim(),
      mood: jMood,
      gratitude: jGratitude.trim()
    });

    // Reset Form
    setJTitle('');
    setJContent('');
    setJMood('happy');
    setJGratitude('');
  };

  const pendingTasks = tasks.filter(t => {
    if (t.completed) return false;
    if (taskTimeFilter === 'tracked') {
      return (t.totalTimeSpent && t.totalTimeSpent > 0) || activeTimerTaskId === t.id;
    }
    return true;
  });

  const completedTasks = tasks.filter(t => {
    if (!t.completed) return false;
    if (taskTimeFilter === 'tracked') {
      return t.totalTimeSpent && t.totalTimeSpent > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Grid: ToDo List (Left) & Journal Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 1 Column: Daily Task Manager */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#E6DFD3] flex flex-col justify-between h-fit">
          <div>
            <h3 className="text-sm font-bold text-[#2D3025] mb-3 flex items-center gap-2 font-serif-elegant">
              <CheckSquare className="w-5 h-5 text-[#7C8363]" />
              <span>کارهای امروز شما</span>
            </h3>

            {/* Time Tracking Filter Tab bar */}
            <div className="flex bg-[#E8ECE0]/50 border border-[#DDE2D5]/70 p-1 rounded-xl mb-4 gap-1">
              <button
                type="button"
                onClick={() => setTaskTimeFilter('all')}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  taskTimeFilter === 'all' 
                    ? 'bg-[#7C8363] text-white shadow-2xs' 
                    : 'text-[#8D7F72] hover:text-[#2D3025]'
                }`}
              >
                همه کارها ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskTimeFilter('tracked')}
                className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  taskTimeFilter === 'tracked' 
                    ? 'bg-[#7C8363] text-white shadow-2xs' 
                    : 'text-[#8D7F72] hover:text-[#2D3025]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>دارای ثبت زمان ({tasks.filter(t => (t.totalTimeSpent && t.totalTimeSpent > 0) || activeTimerTaskId === t.id).length})</span>
              </button>
            </div>

            {/* Form Add Task */}
            <form onSubmit={handleAddTaskSubmit} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="افزودن کار جدید..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white rounded-xl shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Task list — no fixed max-height to avoid nested scroll on mobile */}
            <div className="space-y-2">
              {/* Pending tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#8D7F72] px-1">
                    در انتظار انجام ({pendingTasks.length})
                  </div>
                  {pendingTasks.map((task) => {
                    const subTasksList = task.subTasks || [];
                    const doneCount = subTasksList.filter(st => st.completed).length;
                    const totalCount = subTasksList.length;
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        className="flex items-center gap-2 p-3 bg-white hover:bg-[#E8ECE0]/20 rounded-xl border border-[#E6DFD3] transition-all text-xs"
                      >
                        {/* Checkbox — bigger tap target */}
                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          className="w-6 h-6 rounded-md border-2 border-[#7C8363] hover:bg-[#E8ECE0] flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-90"
                        />

                        {/* Title & meta */}
                        <div
                          onClick={() => onViewTaskDetails?.(task.id)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[#3D3D3D] leading-snug break-words">{task.title}</span>
                            {task.priority === 'high' && (
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                            )}
                            {totalCount > 0 && (
                              <span className="text-[9px] bg-[#E8ECE0] text-[#7C8363] px-1.5 py-0.5 rounded-md font-bold font-mono shrink-0">
                                {doneCount}/{totalCount}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-[#8D7F72] mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                          
                          {/* Time Tracking Tags */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {task.totalTimeSpent && task.totalTimeSpent > 0 ? (
                              <div className="flex items-center gap-1 text-[9px] bg-[#7C8363]/10 text-[#7C8363] px-1.5 py-0.5 rounded-md font-bold">
                                <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                                <span>زمان ثبت‌شده: {formatTimeHuman(task.totalTimeSpent)}</span>
                              </div>
                            ) : null}
                            {activeTimerTaskId === task.id && (
                              <div className="flex items-center gap-1 text-[9px] bg-[#E26645]/10 text-[#E26645] px-1.5 py-0.5 rounded-md font-black animate-pulse">
                                <span className="w-1.5 h-1.5 bg-[#E26645] rounded-full" />
                                <span>در حال ردیابی: {formatTimeDigital(activeTimerSeconds)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions — bigger tap targets */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* Timer Button */}
                          {activeTimerTaskId === task.id ? (
                            isTimerRunning ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPauseTimer();
                                }}
                                className="p-2 text-amber-500 hover:bg-amber-100/50 rounded-lg cursor-pointer active:scale-90 transition-all shrink-0"
                                title="توقف موقت زمان"
                              >
                                <Pause className="w-4 h-4 fill-current animate-pulse" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResumeTimer();
                                }}
                                className="p-2 text-emerald-500 hover:bg-emerald-100/50 rounded-lg cursor-pointer active:scale-90 transition-all shrink-0"
                                title="ادامه ردیابی زمان"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartTimer(task.id);
                              }}
                              className="p-2 text-[#8D7F72] hover:text-[#7C8363] hover:bg-[#E8ECE0]/40 rounded-lg cursor-pointer active:scale-90 transition-all shrink-0"
                              title="شروع ردیابی زمان"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onViewTaskDetails?.(task.id)}
                            className="p-2 text-[#8D7F72] hover:text-[#7C8363] hover:bg-[#E8ECE0]/40 rounded-lg cursor-pointer active:scale-90 transition-all"
                            title="جزئیات"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-2 text-[#C6BFA3] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer active:scale-90 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#E6DFD3]/40">
                  <div className="text-[10px] font-bold text-[#8D7F72] px-1">
                    انجام شده ({completedTasks.length})
                  </div>
                  {completedTasks.map((task) => {
                    const subTasksList = task.subTasks || [];
                    const doneCount = subTasksList.filter(st => st.completed).length;
                    const totalCount = subTasksList.length;
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        className="flex items-center gap-2 p-3 bg-[#E8ECE0]/10 rounded-xl border border-[#DDE2D5] transition-all text-xs"
                      >
                        {/* Filled checkbox */}
                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          className="w-6 h-6 rounded-md border-2 border-[#7C8363] bg-[#7C8363] text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-all"
                        >
                          <span className="text-[10px] font-black leading-none">✓</span>
                        </button>

                        <div
                          onClick={() => onViewTaskDetails?.(task.id)}
                          className="flex-1 min-w-0 cursor-pointer opacity-65"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-[#8D7F72] line-through leading-snug break-words">{task.title}</span>
                            {totalCount > 0 && (
                              <span className="text-[9px] bg-white text-[#8D7F72] px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                {doneCount}/{totalCount}
                              </span>
                            )}
                          </div>
                          {task.totalTimeSpent && task.totalTimeSpent > 0 ? (
                            <div className="flex items-center gap-1 text-[9px] text-[#8D7F72] mt-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>زمان صرف‌شده: {formatTimeHuman(task.totalTimeSpent)}</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onViewTaskDetails?.(task.id)}
                            className="p-2 text-[#C6BFA3] hover:text-[#7C8363] hover:bg-[#E8ECE0]/40 rounded-lg cursor-pointer active:scale-90 transition-all"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-2 text-[#C6BFA3] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer active:scale-90 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {tasks.length === 0 && (
                <div className="text-center py-10 text-xs text-[#8D7F72] font-semibold border border-dashed border-[#D6CFC3] rounded-xl">
                  لیست کارهای امروز خالی است.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Add Journal Entry */}
        <div className="lg:col-span-2 bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#E6DFD3] flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#2D3025] mb-4 flex items-center gap-2 font-serif-elegant">
              <BookOpen className="w-5 h-5 text-[#7C8363]" />
              <span>ثبت یادداشت و شکرگزاری روزانه</span>
            </h3>

            <form onSubmit={handleAddJournalSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8D7F72]">عنوان یادداشت</label>
                  <input
                    type="text"
                    placeholder="مثال: یک روز پرکار ولی موفق"
                    value={jTitle}
                    onChange={(e) => setJTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
                    required
                  />
                </div>

                {/* Mood Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8D7F72]">امروز چه حس و حالی دارید؟</label>
                  <div className="grid grid-cols-6 gap-1 bg-[#F9F6EE] p-1.5 rounded-xl border border-[#E6DFD3]">
                    {(Object.keys(MOOD_LABELS) as MoodType[]).map((key) => {
                      const m = MOOD_LABELS[key];
                      const isSelected = jMood === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setJMood(key)}
                          className={`py-1.5 rounded-lg text-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#E6DFD3] shadow-xs border border-[#C6BFA3] scale-105 text-[#2D3025]' 
                              : 'opacity-60 hover:opacity-100 hover:bg-white/40 text-[#8D7F72]'
                          }`}
                          title={m.label}
                        >
                          {getMoodIcon(m.icon, "w-5 h-5")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Gratitude text */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8D7F72] flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-[#9B6B61] fill-[#9B6B61]" />
                  <span>امروز بابت چه مواردی شکرگزار هستید؟ (اختیاری)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: فنجان قهوه صبحگاهی، شنیدن آهنگ مورد علاقه‌ام، داشتن شغل امن"
                  value={jGratitude}
                  onChange={(e) => setJGratitude(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
                />
              </div>

              {/* Diary Content */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8D7F72]">متن اصلی یادداشت / وقایع روز</label>
                <textarea
                  placeholder="هر چه در ذهن دارید بنویسید؛ رویدادها، دغدغه‌ها، دستاوردها یا حتی ایده‌های جدید..."
                  value={jContent}
                  onChange={(e) => setJContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] h-32 resize-none bg-[#FDFBF7]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>ثبت یادداشت روزانه</span>
              </button>

            </form>
          </div>
        </div>

      </div>

      {/* Diary Timeline History */}
      <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#E6DFD3]">
        <h3 className="text-base font-bold text-[#2D3025] flex items-center gap-2 mb-6 font-serif-elegant">
          <Compass className="w-5 h-5 text-[#7C8363]" />
          <span>آرشیو خاطرات و یادداشت‌ها</span>
        </h3>

        {journalEntries.length > 0 ? (
          <div className="space-y-6 relative before:absolute before:top-0 before:bottom-0 before:right-6 before:w-0.5 before:bg-[#E6DFD3]">
            {journalEntries.slice().reverse().map((entry) => {
              const moodInfo = MOOD_LABELS[entry.mood];
              const moodColors = MOOD_THEME_COLORS[entry.mood] || MOOD_THEME_COLORS.happy;
              return (
                <div key={entry.id} className="relative pr-12">
                  {/* Timeline Dot (Icon) */}
                  <div className="absolute top-0 right-3.5 w-7 h-7 bg-[#FDFBF7] border border-[#E6DFD3] rounded-full flex items-center justify-center text-xs z-10 shadow-xs translate-x-1/2">
                    {moodInfo ? getMoodIcon(moodInfo.icon, "w-4 h-4 text-[#7C8363]") : null}
                  </div>

                  {/* Journal Card */}
                  <div className="bg-[#FDFBF7] hover:bg-[#F9F6EE] p-5 rounded-2xl border border-[#E6DFD3] transition-all flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-[#8D7F72] font-bold flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-[#7C8363]" />
                          <span>{entry.date}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${moodColors}`}>
                          حس و حال: {moodInfo?.label}
                        </span>
                      </div>

                      <h4 className="font-bold text-[#2D3025] text-sm md:text-base font-serif-elegant">{entry.title}</h4>
                      <p className="text-xs text-[#3D3D3D] leading-relaxed whitespace-pre-wrap">{entry.content}</p>

                      {/* Gratitude Section */}
                      {entry.gratitude && (
                        <div className="bg-[#F4E9E4] border border-[#EDDDD7] p-3 rounded-xl flex items-start gap-2 text-[11px] text-[#3D3D3D] leading-relaxed">
                          <Heart className="w-4 h-4 text-[#9B6B61] fill-[#9B6B61] shrink-0 mt-0.5" />
                          <div className="text-right">
                            <span className="font-bold text-[#9B6B61]">امروز شکرگزار بودم بابت:</span>{' '}
                            {entry.gratitude}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete entry */}
                    <div className="self-end md:self-start">
                      <button
                        onClick={() => onDeleteJournalEntry(entry.id)}
                        className="text-[#8D7F72] hover:text-[#9B6B61] p-2 rounded-xl hover:bg-[#F4E9E4] transition-colors inline-flex cursor-pointer"
                        title="حذف یادداشت"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-2xl font-semibold">
            هنوز هیچ یادداشتی ثبت نکرده‌اید. اولین یادداشت خود را در فرم بالا ثبت کنید.
          </div>
        )}
      </div>

    </div>
  );
}
