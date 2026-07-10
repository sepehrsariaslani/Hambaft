/**
 * TaskDetailDrawer — Tabbed task detail panel (side drawer).
 * Tabs: Overview | Plan | Relations & Impact | Time & Sessions | Notes
 * Progressive disclosure: most-used controls in Overview,
 * deeper context in other tabs.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X, CheckCircle, Edit2, Trash2, Calendar, Clock, Flag, Zap,
  FolderKanban, Target, Layers, AlertCircle, Play, Pause,
  Square, RotateCcw, Sparkles, Pin, Link2, ArrowUpRight,
  BookOpen, Timer,
} from 'lucide-react'
import type { Task, SubTask } from '../types'
import PersianDatePicker from './PersianDatePicker'
import EntityNoteEditor from '../../notes/components/EntityNoteEditor'
import {
  ImportanceBadge, ImportanceSelector, ImpactScoreBadge,
  TaskImpactBanner, TaskImpactExplanation, BlockedTaskIndicator,
} from './TaskV2Shared'
import type { ImportanceLevel } from './TaskV2Shared'

// ─── Tab definitions ─────────────────────────────────────────
type DetailTab = 'overview' | 'plan' | 'relations' | 'time' | 'notes'

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'نمای کلی', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'plan', label: 'برنامه', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'relations', label: 'تأثیر و پیوند', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'time', label: 'زمان', icon: <Timer className="w-3.5 h-3.5" /> },
  { id: 'notes', label: 'یادداشت', icon: <BookOpen className="w-3.5 h-3.5" /> },
]

const STATUS_OPTIONS = [
  { id: 'inbox', label: 'صندوق ورودی', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'today', label: 'امروز', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'next', label: 'بعدی', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'not_started', label: 'شروع‌نشده', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  { id: 'in_progress', label: 'در حال انجام', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'on_hold', label: 'متوقف', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'someday', label: 'شاید', color: 'bg-gray-50 text-gray-500 border-gray-200' },
  { id: 'done', label: 'انجام‌شده', color: 'bg-green-50 text-green-700 border-green-200' },
] as const

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'پایین', color: 'bg-emerald-50 text-emerald-700' },
  { id: 'medium', label: 'متوسط', color: 'bg-amber-50 text-amber-700' },
  { id: 'high', label: 'فوری', color: 'bg-red-50 text-red-700' },
  { id: 'urgent', label: 'بحرانی', color: 'bg-red-100 text-red-800 font-black' },
] as const

const CATEGORIES = [
  { id: 'work', label: 'کاری' },
  { id: 'personal', label: 'شخصی' },
  { id: 'health', label: 'سلامت' },
  { id: 'finance', label: 'مالی' },
  { id: 'learning', label: 'یادگیری' },
  { id: 'other', label: 'سایر' },
] as const

interface TaskDetailDrawerProps {
  task: Task
  allTasks?: Task[]
  goals?: any[]
  projects?: Array<{ id: string; title: string }>
  areas?: Array<{ id: string; title: string }>
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onClose: () => void
  // Session
  activeTimerTaskId?: string | null
  activeTimerSeconds?: number
  isTimerRunning?: boolean
  onStartTimer?: (taskId: string) => void
  onPauseTimer?: () => void
  onStopTimer?: () => void
  onResetTimer?: (taskId: string) => void
}

export default function TaskDetailDrawer({
  task,
  allTasks = [],
  goals = [],
  projects = [],
  areas = [],
  onUpdateTask,
  onDeleteTask,
  onClose,
  activeTimerTaskId,
  activeTimerSeconds = 0,
  isTimerRunning = false,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onResetTimer,
}: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(task.title)
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ─── Handlers ───────────────────────────────────────────────
  const saveTitle = () => {
    if (!tempTitle.trim()) return
    onUpdateTask({ ...task, title: tempTitle.trim() })
    setIsEditingTitle(false)
  }

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return
    const newSub: SubTask = { id: `subtk-${Date.now()}`, title: newSubtaskText.trim(), completed: false }
    onUpdateTask({ ...task, subTasks: [...(task.subTasks || []), newSub] })
    setNewSubtaskText('')
  }

  const toggleSubtask = (id: string) => {
    const updated = (task.subTasks || []).map(st => st.id === id ? { ...st, completed: !st.completed } : st)
    onUpdateTask({ ...task, subTasks: updated })
  }

  const deleteSubtask = (id: string) => {
    onUpdateTask({ ...task, subTasks: (task.subTasks || []).filter(st => st.id !== id) })
  }

  // Stats
  const subtasks = task.subTasks || []
  const subDone = subtasks.filter(st => st.completed).length
  const subTotal = subtasks.length
  const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0
  const possibleDeps = allTasks.filter(t => t.id !== task.id)

  const isActiveSession = activeTimerTaskId === task.id
  const formatSeconds = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#FDFBF7] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E6DFD3] bg-[#F9F6EE] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateTask({ ...task, completed: !task.completed })}
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'bg-white border-[#D6CFC3] hover:border-[#7C8363]'
              }`}
            >
              {task.completed && <CheckCircle className="w-4 h-4" />}
            </button>
            {isEditingTitle ? (
              <div className="flex gap-1.5 flex-1 min-w-0">
                <input
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTempTitle(task.title); setIsEditingTitle(false) } }}
                  className="flex-1 min-w-0 px-2 py-1 text-sm font-bold border-2 border-[#7C8363] rounded-lg bg-white focus:outline-none"
                  autoFocus
                />
                <button onClick={saveTitle} className="px-2 py-1 text-[10px] font-bold bg-[#7C8363] text-white rounded-lg">ذخیره</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <h3 className={`text-sm font-extrabold truncate ${task.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                  {task.title}
                </h3>
                <button onClick={() => { setTempTitle(task.title); setIsEditingTitle(true) }} className="p-1 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E8ECE0]/50 rounded-lg shrink-0">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <button onClick={() => onDeleteTask(task.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg">بله</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 bg-[#E6DFD3] text-[#2D3025] text-[10px] font-bold rounded-lg">نه</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-[#8D7F72] hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
            <button onClick={onClose} className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Quick badges row ── */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-[#E6DFD3]/40 bg-white flex-wrap">
          {task.importance && task.importance !== 'normal' && <ImportanceBadge importance={task.importance} size="sm" />}
          {task.impactScore != null && <ImpactScoreBadge score={task.impactScore} />}
          {(task.blockedBy || []).length > 0 && !task.completed && (
            <span className="text-[9px] font-bold bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">⊘ مسدود</span>
          )}
          {task.isDailyHighlight && <span className="text-[9px] font-bold bg-[#d4a017]/15 text-[#b8860b] px-1.5 py-0.5 rounded">⭐ برجسته</span>}
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-[#E6DFD3] px-5 overflow-x-auto shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2.5 text-[10px] font-black whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#7C8363] text-[#7C8363]'
                  : 'border-transparent text-[#8D7F72] hover:text-[#2D3025]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'overview' && (
            <OverviewTab
              task={task}
              goals={goals}
              projects={projects}
              areas={areas}
              onUpdateTask={onUpdateTask}
            />
          )}
          {activeTab === 'plan' && (
            <PlanTab
              task={task}
              allTasks={allTasks}
              subtasks={subtasks}
              subDone={subDone}
              subTotal={subTotal}
              subPct={subPct}
              newSubtaskText={newSubtaskText}
              setNewSubtaskText={setNewSubtaskText}
              addSubtask={addSubtask}
              toggleSubtask={toggleSubtask}
              deleteSubtask={deleteSubtask}
              onUpdateTask={onUpdateTask}
            />
          )}
          {activeTab === 'relations' && (
            <RelationsTab task={task} />
          )}
          {activeTab === 'time' && (
            <TimeTab
              task={task}
              isActiveSession={isActiveSession}
              activeTimerSeconds={activeTimerSeconds}
              isTimerRunning={isTimerRunning}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onStopTimer={onStopTimer}
              onResetTimer={onResetTimer}
              formatSeconds={formatSeconds}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab task={task} onUpdateTask={onUpdateTask} />
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Tab Components
// ══════════════════════════════════════════════════════════════

// ─── Overview ────────────────────────────────────────────────
function OverviewTab({ task, goals, projects, areas, onUpdateTask }: {
  task: Task; goals: any[]; projects: Array<{ id: string; title: string }>; areas: Array<{ id: string; title: string }>; onUpdateTask: (t: Task) => void
}) {
  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#8D7F72]">وضعیت</label>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdateTask({ ...task, status: s.id as any, completed: s.id === 'done' })}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
                task.status === s.id || (s.id === 'done' && task.completed)
                  ? `${s.color} ring-1 ring-[#7C8363]/30 shadow-sm`
                  : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#8D7F72]">اولویت</label>
        <div className="flex flex-wrap gap-1.5">
          {PRIORITY_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => onUpdateTask({ ...task, priority: p.id as any })}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
                task.priority === p.id
                  ? `${p.color} border-current shadow-sm`
                  : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Importance */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#8D7F72]">اهمیت</label>
        <ImportanceSelector value={task.importance || 'normal'} onChange={imp => onUpdateTask({ ...task, importance: imp })} />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#8D7F72]">دسته‌بندی</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => onUpdateTask({ ...task, category: c.id as any })}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
                task.category === c.id
                  ? 'bg-[#7C8363] text-white border-[#7C8363] shadow-sm'
                  : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1"><Calendar className="w-3 h-3" /> تاریخ برنامه</label>
          <input
            type="date"
            value={task.scheduledDate || ''}
            onChange={(e) => onUpdateTask({ ...task, scheduledDate: e.target.value || undefined })}
            className="w-full px-2.5 py-2 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1"><Calendar className="w-3 h-3" /> سررسید</label>
          <input
            type="date"
            value={task.dueDate || ''}
            onChange={(e) => onUpdateTask({ ...task, dueDate: e.target.value || undefined })}
            className="w-full px-2.5 py-2 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold"
          />
        </div>
      </div>

      {/* Project / Area / Goal */}
      <div className="grid grid-cols-3 gap-3">
        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#8D7F72]">پروژه</label>
            <select
              value={task.projectId || ''}
              onChange={(e) => onUpdateTask({ ...task, projectId: e.target.value || undefined })}
              className="w-full px-2 py-1.5 text-[10px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold"
            >
              <option value="">—</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}
        {areas.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#8D7F72]">حوزه</label>
            <select
              value={task.areaId || ''}
              onChange={(e) => onUpdateTask({ ...task, areaId: e.target.value || undefined })}
              className="w-full px-2 py-1.5 text-[10px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold"
            >
              <option value="">—</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
        )}
        {goals.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-[#8D7F72]">هدف</label>
            <select
              value={task.goalId || ''}
              onChange={(e) => onUpdateTask({ ...task, goalId: e.target.value || undefined })}
              className="w-full px-2 py-1.5 text-[10px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold"
            >
              <option value="">—</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Effort */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-[#8D7F72]">زمان تخمینی (دقیقه)</label>
          <input
            type="number"
            value={task.estimatedMinutes || ''}
            onChange={(e) => onUpdateTask({ ...task, estimatedMinutes: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full px-2.5 py-2 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold"
            placeholder="مثلاً ۳۰"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-[#8D7F72]">نوع تلاش</label>
          <div className="flex gap-1.5">
            {(['fixed', 'variable'] as const).map(et => (
              <button
                key={et}
                onClick={() => onUpdateTask({ ...task, effortType: et })}
                className={`flex-1 py-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                  task.effortType === et ? 'bg-[#7C8363] text-white border-[#7C8363]' : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
                }`}
              >
                {et === 'fixed' ? 'ثابت' : 'متغیر'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Highlight */}
      <div className="flex items-center justify-between p-3 bg-[#FDFBF7] rounded-xl border border-[#E5C158]/40">
        <div className="flex items-center gap-2">
          <Pin className="w-3.5 h-3.5 text-[#b8860b]" />
          <span className="text-[10px] font-bold text-[#2D3025]">تسک برجسته روز</span>
        </div>
        <button
          onClick={() => onUpdateTask({ ...task, isDailyHighlight: !task.isDailyHighlight })}
          className={`px-2.5 py-1 text-[9px] font-black rounded-lg border cursor-pointer transition-all ${
            task.isDailyHighlight ? 'bg-[#E5C158] border-[#D4AF37] text-[#2D3025]' : 'bg-white border-[#D6CFC3] text-[#8D7F72] hover:border-[#D4AF37]'
          }`}
        >
          {task.isDailyHighlight ? 'سنجاق شده' : 'سنجاق'}
        </button>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#8D7F72]">توضیحات</label>
        <textarea
          value={task.description || ''}
          onChange={(e) => onUpdateTask({ ...task, description: e.target.value })}
          className="w-full px-3 py-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold min-h-[60px] resize-y"
          placeholder="توضیحات مختصر..."
        />
      </div>
    </div>
  )
}

// ─── Plan ────────────────────────────────────────────────────
function PlanTab({ task, allTasks, subtasks, subDone, subTotal, subPct, newSubtaskText, setNewSubtaskText, addSubtask, toggleSubtask, deleteSubtask, onUpdateTask }: {
  task: Task; allTasks: Task[]; subtasks: SubTask[]; subDone: number; subTotal: number; subPct: number;
  newSubtaskText: string; setNewSubtaskText: (v: string) => void; addSubtask: () => void;
  toggleSubtask: (id: string) => void; deleteSubtask: (id: string) => void; onUpdateTask: (t: Task) => void
}) {
  const possibleDeps = allTasks.filter(t => t.id !== task.id)
  return (
    <div className="space-y-5">
      {/* Subtask progress */}
      {subTotal > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-[#8D7F72]">پیشرفت مراحل فرعی</span>
            <span className="text-[#7C8363] font-mono">{subDone} از {subTotal} • {subPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#F3EFE6] rounded-full overflow-hidden">
            <div className="h-full bg-[#7C8363] rounded-full transition-all" style={{ width: `${subPct}%` }} />
          </div>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#2D3025] flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#7C8363]" /> مراحل فرعی
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="مرحله فرعی جدید + Enter..."
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
            className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold"
          />
          <button onClick={addSubtask} className="px-3 py-2 bg-[#7C8363] text-white rounded-xl"><Plus className="w-4 h-4" /></button>
        </div>
        {subtasks.length > 0 ? (
          <div className="space-y-1.5">
            {subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-2 p-2.5 bg-white border border-[#E6DFD3] rounded-xl hover:bg-[#F9F6EE]/50">
                <button onClick={() => toggleSubtask(st.id)} className="shrink-0 cursor-pointer">
                  {st.completed ? <CheckCircle className="w-4 h-4 text-[#7C8363]" /> : <Circle className="w-4 h-4 text-[#D6CFC3] hover:text-[#7C8363]" />}
                </button>
                <span className={`flex-1 min-w-0 text-xs font-semibold ${st.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'}`}>{st.title}</span>
                <button onClick={() => deleteSubtask(st.id)} className="p-1 text-[#D6CFC3] hover:text-red-500 rounded-lg shrink-0"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#9B6B61]" /> کار بزرگ را به خرده‌کار تبدیل کنید
          </div>
        )}
      </div>

      {/* Dependencies */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-[#2D3025] flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-[#7C8363]" /> پیش‌نیازها
        </label>
        {(task.blockedBy || []).length > 0 && !task.completed && <BlockedTaskIndicator task={task} />}
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {possibleDeps.slice(0, 20).map(dep => {
            const isSelected = (task.blockedBy || []).includes(dep.id)
            return (
              <button
                key={dep.id}
                onClick={() => {
                  const deps = isSelected ? (task.blockedBy || []).filter(id => id !== dep.id) : [...(task.blockedBy || []), dep.id]
                  onUpdateTask({ ...task, blockedBy: deps })
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected ? 'bg-[#E8ECE0]/40 border-[#7C8363] font-bold' : 'bg-white border-[#E6DFD3] hover:bg-[#F9F6EE]/50'
                }`}
              >
                <span className="truncate">{dep.title}</span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${dep.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {dep.completed ? '✓' : '⊘'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Relations & Impact ──────────────────────────────────────
function RelationsTab({ task }: { task: Task }) {
  return (
    <div className="space-y-4">
      {/* Impact Score */}
      {task.impactScore != null && (
        <div className="p-3 bg-[#F9F6EE] rounded-xl border border-[#E6DFD3] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#8D7F72]">امتیاز تأثیر</span>
            <ImpactScoreBadge score={task.impactScore} />
          </div>
          <TaskImpactExplanation task={task} />
        </div>
      )}

      {/* Goal relation */}
      {task.impactGoalTitle && (
        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-1.5">
          <span className="text-[9px] font-black text-purple-600">هدف مرتبط</span>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-purple-800">{task.impactGoalTitle}</span>
            {task.impactGoalProgress != null && <span className="text-[10px] text-purple-500">({Math.round(task.impactGoalProgress)}%)</span>}
          </div>
          {task.impactGoalHealth && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              task.impactGoalHealth === 'off_track' || task.impactGoalHealth === 'خارج_از_مسیر' ? 'bg-red-100 text-red-700' :
              task.impactGoalHealth === 'at_risk' || task.impactGoalHealth === 'در_خطر' ? 'bg-amber-100 text-amber-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {task.impactGoalHealth === 'off_track' || task.impactGoalHealth === 'خارج_از_مسیر' ? 'خارج از مسیر' :
               task.impactGoalHealth === 'at_risk' || task.impactGoalHealth === 'در_خطر' ? 'در خطر' :
               task.impactGoalHealth === 'needs_review' || task.impactGoalHealth === 'نیاز_به_بررسی' ? 'نیاز به بررسی' : 'در مسیر'}
            </span>
          )}
        </div>
      )}

      {/* Project relation */}
      {task.impactProjectTitle && (
        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-1.5">
          <span className="text-[9px] font-black text-blue-600">پروژه مرتبط</span>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-800">{task.impactProjectTitle}</span>
            {task.impactProjectProgress != null && <span className="text-[10px] text-blue-500">({Math.round(task.impactProjectProgress)}%)</span>}
          </div>
          {task.impactProjectContributionType && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              task.impactProjectContributionType === 'اجباری' || task.impactProjectContributionType === 'mandatory' ? 'bg-red-100 text-red-700' :
              task.impactProjectContributionType === 'پیشنهادی' || task.impactProjectContributionType === 'recommended' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {task.impactProjectContributionType === 'mandatory' ? 'اجباری' :
               task.impactProjectContributionType === 'recommended' ? 'پیشنهادی' :
               task.impactProjectContributionType === 'supporting' ? 'پشتیبان' : task.impactProjectContributionType}
            </span>
          )}
        </div>
      )}

      {/* Full impact banner */}
      {(task.impactGoalTitle || task.impactProjectTitle) && !task.completed && (
        <TaskImpactBanner task={task} />
      )}

      {/* Blocked */}
      {(task.blockedBy || []).length > 0 && !task.completed && (
        <BlockedTaskIndicator task={task} />
      )}

      {/* Why this task matters */}
      {!task.impactGoalTitle && !task.impactProjectTitle && task.importance === 'normal' && (
        <div className="text-center py-6 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-[10px] text-[#8D7F72]">
          این تسک هنوز به پروژه یا هدفی پیوند نشده. با پیوند دادن، امتیاز تأثیر و زمینه کاری مشخص می‌شود.
        </div>
      )}
    </div>
  )
}

// ─── Time & Sessions ─────────────────────────────────────────
function TimeTab({ task, isActiveSession, activeTimerSeconds, isTimerRunning, onStartTimer, onPauseTimer, onStopTimer, onResetTimer, formatSeconds }: {
  task: Task; isActiveSession: boolean; activeTimerSeconds: number; isTimerRunning: boolean;
  onStartTimer?: (id: string) => void; onPauseTimer?: () => void; onStopTimer?: () => void;
  onResetTimer?: (id: string) => void; formatSeconds: (s: number) => string
}) {
  return (
    <div className="space-y-4">
      {/* Timer display */}
      <div className="p-4 bg-[#E8ECE0]/20 rounded-2xl border border-[#7C8363]/20 space-y-3">
        <div className="text-center">
          <span className="text-[9px] font-black text-[#5A5A40] block mb-1">
            {isActiveSession ? 'جلسه فعال' : 'زمان‌سنج'}
          </span>
          <span className="text-2xl font-black text-[#2D3025] font-mono">
            {isActiveSession ? formatSeconds(activeTimerSeconds) : '00:00:00'}
          </span>
        </div>
        <div className="flex gap-2 justify-center">
          {isActiveSession ? (
            <>
              <button
                onClick={isTimerRunning ? onPauseTimer : () => onStartTimer?.(task.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all ${
                  isTimerRunning ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'
                }`}
              >
                {isTimerRunning ? <><Pause className="w-3.5 h-3.5" /> توقف</> : <><Play className="w-3.5 h-3.5" /> ادامه</>}
              </button>
              <button
                onClick={onStopTimer}
                className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-red-600"
              >
                <Square className="w-3.5 h-3.5" /> پایان
              </button>
            </>
          ) : (
            <button
              onClick={() => onStartTimer?.(task.id)}
              className="px-6 py-2.5 bg-[#7C8363] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-[#5A5A40] shadow-sm"
            >
              <Play className="w-4 h-4 fill-white" /> شروع زمان‌سنج
            </button>
          )}
        </div>
      </div>

      {/* Time summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F9F6EE] p-3 rounded-xl text-center">
          <span className="text-lg font-black text-[#7C8363]">{task.actualMinutes || 0}</span>
          <span className="text-[9px] text-[#8D7F72] block">دقیقه صرف‌شده</span>
        </div>
        <div className="bg-[#F9F6EE] p-3 rounded-xl text-center">
          <span className="text-lg font-black text-indigo-600">{task.estimatedMinutes || '—'}</span>
          <span className="text-[9px] text-[#8D7F72] block">دقیقه تخمینی</span>
        </div>
      </div>

      {/* Effort type */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#8D7F72]">نوع تلاش</label>
        <div className="flex items-center gap-2 bg-[#F9F6EE] p-2.5 rounded-xl">
          <Clock className="w-4 h-4 text-[#7C8363]" />
          <span className="text-xs font-bold text-[#2D3025]">{task.effortType === 'fixed' ? 'ثابت' : task.effortType === 'variable' ? 'متغیر' : 'مشخص نشده'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Notes ───────────────────────────────────────────────────
function NotesTab({ task, onUpdateTask }: { task: Task; onUpdateTask: (t: Task) => void }) {
  return (
    <div className="space-y-3">
      <EntityNoteEditor
        entityId={task.id}
        entityType="task"
        title="یادداشت‌ها و جزئیات"
        initialBlocks={task.noteBlocks}
        onSave={(blocks) => onUpdateTask({ ...task, noteBlocks: blocks })}
      />
    </div>
  )
}
