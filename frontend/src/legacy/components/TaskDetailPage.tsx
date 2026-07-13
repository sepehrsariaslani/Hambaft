/**
 * TaskDetailPage — Full-page task detail view.
 * Tabs: Overview | Plan | Time
 *
 * Changes:
 * - No padding, no border on cards (clean/minimal)
 * - Status uses custom dropdown component
 * - Description removed; Notes (EntityNoteEditor) inlined in Overview
 * - Removed "تأثیر" and "یادداشت" tabs
 * - Fields: زمینه, پروژه, حوزه, هدف
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, CheckCircle, Circle, Edit2, Trash2, Calendar, Clock, Flag, Zap,
  FolderKanban, Target, Layers, AlertCircle, Play, Pause,
  Square, RotateCcw, Sparkles, Pin, Link2, ArrowUpRight,
  BookOpen, Timer, History, Plus, ChevronDown, Check, GripVertical,
  ChevronLeft, X,
} from 'lucide-react'
import type { Task, SubTask } from '../types'
import {
  ImportanceBadge, ImportanceSelector, ImpactScoreBadge,
  TaskImpactBanner, TaskImpactExplanation, BlockedTaskIndicator,
} from './TaskV2Shared'
import type { ImportanceLevel } from './TaskV2Shared'
import { getTaskSessions } from '../../app/hambaft-api'
import EntityNoteEditor from '../../notes/components/EntityNoteEditor'
import PersianDatePicker from './PersianDatePicker'

// ─── Tab definitions ─────────────────────────────────────────
type DetailTab = 'overview' | 'plan' | 'time'

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'نمای کلی', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'plan', label: 'برنامه', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'time', label: 'زمان', icon: <Timer className="w-3.5 h-3.5" /> },
]

const STATUS_OPTIONS = [
  { id: 'inbox', label: 'ورودی', color: 'bg-[#F9F1D8] text-[#5A5A40] border-[#EBE3C8] dark:bg-[#2B201D] dark:text-[#F9F1D8] dark:border-[#5A5A40]' },
  { id: 'today', label: 'امروز', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' },
  { id: 'next', label: 'بعدی', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
  { id: 'in_progress', label: 'درحال انجام', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700' },
  { id: 'on_hold', label: 'متوقف', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' },
  { id: 'someday', label: 'شاید', color: 'bg-[#F9F6EE] text-[#8D7F72] border-[#D6CFC3] dark:bg-[#3D4133] dark:text-[#9D978B] dark:border-[#3D4133]' },
  { id: 'done', label: 'انجام‌شده', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
] as const

const PRIORITY_MAP: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'پایین', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: '🟢' },
  medium: { label: 'متوسط', color: 'bg-[#F9F1D8] text-[#5A5A40] dark:bg-[#2B201D] dark:text-[#F9F1D8]', icon: '🟡' },
  high: { label: 'فوری', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: '🔴' },
  urgent: { label: 'بحرانی', color: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200', icon: '🚨' },
}

// ══════════════════════════════════════════════════════════════
// StatusDropdown — Custom dropdown for task status
// ══════════════════════════════════════════════════════════════
function StatusDropdown({ value, completed, onChange }: {
  value: string; completed: boolean; onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = STATUS_OPTIONS.find(o => o.id === value || (o.id === 'done' && completed))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-all w-full justify-between ${
          current ? current.color : 'bg-white dark:bg-[#121411] text-[#8D7F72] dark:text-[#9D978B] border-[#D6CFC3] dark:border-[#3D4133]'
        }`}
      >
        <span>{current?.label || 'انتخاب وضعیت'}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1 right-0 left-0 z-50 bg-white dark:bg-[#1B1D16] rounded-lg shadow-lg border border-[#E6DFD3] dark:border-[#3D4133] overflow-hidden"
          >
            {STATUS_OPTIONS.map(s => {
              const isActive = s.id === value || (s.id === 'done' && completed)
              return (
                <button
                  key={s.id}
                  onClick={() => { onChange(s.id); setOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold cursor-pointer transition-all ${
                    isActive
                      ? `${s.color}`
                      : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'
                  }`}
                >
                  <span>{s.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface TaskDetailPageProps {
  task: Task
  allTasks?: Task[]
  goals?: any[]
  projects?: Array<{ id: string; title: string }>
  areas?: Array<{ id: string; title: string }>
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onBack: () => void
  onNavigate?: (tab: string, id?: string) => void
  activeTimerTaskId?: string | null
  activeTimerSeconds?: number
  isTimerRunning?: boolean
  onStartTimer?: (taskId: string) => void
  onPauseTimer?: () => void
  onStopTimer?: () => void
  onResetTimer?: (taskId: string) => void
}

export default function TaskDetailPage({
  task,
  allTasks = [],
  goals = [],
  projects = [],
  areas = [],
  onUpdateTask,
  onDeleteTask,
  onBack,
  onNavigate,
  activeTimerTaskId,
  activeTimerSeconds = 0,
  isTimerRunning = false,
  onStartTimer,
  onPauseTimer,
  onStopTimer,
  onResetTimer,
}: TaskDetailPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(task.title)
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => { setTempTitle(task.title) }, [task.title])

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

  const updateSubtaskTitle = (id: string, title: string) => {
    const updated = (task.subTasks || []).map(st => st.id === id ? { ...st, title } : st)
    onUpdateTask({ ...task, subTasks: updated })
  }

  const subtasks = task.subTasks || []
  const subDone = subtasks.filter(st => st.completed).length
  const subTotal = subtasks.length
  const subPct = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0

  const isActiveSession = activeTimerTaskId === task.id
  const formatSeconds = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const linkedGoal = useMemo(() => goals.find(g => g.id === task.goalId), [goals, task.goalId])
  const linkedProject = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId])
  const linkedArea = useMemo(() => areas.find(a => a.id === task.areaId), [areas, task.areaId])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] dark:bg-[linear-gradient(180deg,#121411_0%,#1B1D16_100%)]" dir="rtl">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-[#F9F6EE]/90 dark:bg-[#1B1D16]/90 backdrop-blur-lg border-b border-[#E6DFD3] dark:border-[#3D4133]">
        <div className="max-w-4xl mx-auto px-3 py-2.5 flex items-center gap-2.5">
          <button onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#121411] border border-[#E6DFD3] dark:border-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0] hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-xs font-bold shadow-sm cursor-pointer active:scale-95">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>بازگشت</span>
          </button>

          <button
            onClick={() => onUpdateTask({ ...task, completed: !task.completed })}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
              task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'bg-white dark:bg-[#121411] border-[#D6CFC3] dark:border-[#3D4133] hover:border-[#7C8363]'
            }`}
          >
            {task.completed && <CheckCircle className="w-3.5 h-3.5" />}
          </button>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex gap-1.5">
                <input
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTempTitle(task.title); setIsEditingTitle(false) } }}
                  className="flex-1 min-w-0 px-2 py-1 text-sm font-extrabold border-2 border-[#7C8363] rounded-lg bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none"
                  autoFocus
                />
                <button onClick={saveTitle} className="px-2.5 py-1 text-[10px] font-bold bg-[#7C8363] text-white rounded-lg shrink-0 cursor-pointer">ذخیره</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h1 className={`text-sm font-extrabold truncate ${task.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>
                  {task.title}
                </h1>
                <button onClick={() => { setTempTitle(task.title); setIsEditingTitle(true) }} className="p-1 text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] rounded shrink-0 cursor-pointer">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="shrink-0">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1">
                <button onClick={() => onDeleteTask(task.id)} className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg cursor-pointer">حذف</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 bg-[#E6DFD3] dark:bg-[#3D4133] dark:text-[#E8ECE0] text-[10px] font-bold rounded-lg cursor-pointer">نه</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 text-[#8D7F72] hover:text-red-500 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>

        {/* Quick context row */}
        <div className="max-w-4xl mx-auto px-3 pb-1.5 flex items-center gap-1.5 flex-wrap">
          {(() => {
            const s = STATUS_OPTIONS.find(o => o.id === task.status || (o.id === 'done' && task.completed))
            return s ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${s.color}`}>{s.label}</span> : null
          })()}
          {task.priority && PRIORITY_MAP[task.priority] && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_MAP[task.priority].color}`}>{PRIORITY_MAP[task.priority].icon} {PRIORITY_MAP[task.priority].label}</span>
          )}
          {task.importance && task.importance !== 'normal' && <ImportanceBadge importance={task.importance} size="xs" />}
          {(task.blockedBy || []).length > 0 && !task.completed && (
            <span className="text-[9px] font-bold bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-700">⊘ مسدود</span>
          )}
          {task.isDailyHighlight && <span className="text-[9px] font-bold bg-[#d4a017]/15 text-[#b8860b] dark:text-[#d4a017] px-1.5 py-0.5 rounded">⭐ برجسته</span>}
          {linkedProject && <span className="text-[9px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">📁 {linkedProject.title}</span>}
          {linkedGoal && <span className="text-[9px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded">🎯 {linkedGoal.title}</span>}
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-3 flex gap-0.5 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#7C8363] text-[#7C8363] dark:text-[#9ECE9A]'
                  : 'border-transparent text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content — no padding ── */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {activeTab === 'overview' && <OverviewTab task={task} goals={goals} projects={projects} areas={areas} linkedGoal={linkedGoal} linkedProject={linkedProject} linkedArea={linkedArea} onUpdateTask={onUpdateTask} onNavigate={onNavigate} />}
            {activeTab === 'plan' && <PlanTab task={task} allTasks={allTasks} subtasks={subtasks} subDone={subDone} subTotal={subTotal} subPct={subPct} newSubtaskText={newSubtaskText} setNewSubtaskText={setNewSubtaskText} addSubtask={addSubtask} toggleSubtask={toggleSubtask} deleteSubtask={deleteSubtask} updateSubtaskTitle={updateSubtaskTitle} onUpdateTask={onUpdateTask} />}
            {activeTab === 'time' && <TimeTab task={task} isActiveSession={isActiveSession} activeTimerSeconds={activeTimerSeconds} isTimerRunning={isTimerRunning} onStartTimer={onStartTimer} onPauseTimer={onPauseTimer} onStopTimer={onStopTimer} onResetTimer={onResetTimer} formatSeconds={formatSeconds} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Overview — with dropdown status, no description, inline notes
// ══════════════════════════════════════════════════════════════
function OverviewTab({ task, goals, projects, areas, linkedGoal, linkedProject, linkedArea, onUpdateTask, onNavigate }: {
  task: Task; goals: any[]; projects: Array<{ id: string; title: string }>; areas: Array<{ id: string; title: string }>;
  linkedGoal: any; linkedProject: { id: string; title: string } | undefined; linkedArea: { id: string; title: string } | undefined;
  onUpdateTask: (t: Task) => void; onNavigate?: (tab: string, id?: string) => void
}) {
  return (
    <div className="space-y-1">
      {/* Row 1: Status + Priority + Importance */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white dark:bg-[#1B1D16] space-y-1.5">
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">وضعیت</label>
          <StatusDropdown
            value={task.status || 'inbox'}
            completed={task.completed}
            onChange={id => onUpdateTask({ ...task, status: id as any, completed: id === 'done' })}
          />
        </div>
        <div className="bg-white dark:bg-[#1B1D16] space-y-1.5">
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">اولویت</label>
          <div className="flex gap-1">
            {Object.entries(PRIORITY_MAP).map(([id, p]) => (
              <button key={id}
                onClick={() => onUpdateTask({ ...task, priority: id as any })}
                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                  task.priority === id ? `${p.color}` : 'bg-white dark:bg-[#121411] text-[#8D7F72] dark:text-[#9D978B]'
                }`}
              >{p.icon}</button>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1B1D16] space-y-1.5">
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">اهمیت</label>
          <ImportanceSelector value={task.importance || 'normal'} onChange={imp => onUpdateTask({ ...task, importance: imp })} />
        </div>
      </div>

      {/* Row 2: Dates — Jalali pickers */}
      <div className="grid grid-cols-2 gap-2 bg-white dark:bg-[#1B1D16] space-y-1.5">
        <div>
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1"><Calendar className="w-3 h-3" /> تاریخ برنامه</label>
          <PersianDatePicker value={task.scheduledDate || ''} onChange={v => onUpdateTask({ ...task, scheduledDate: v || undefined })} placeholder="انتخاب تاریخ..." />
        </div>
        <div>
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1"><Calendar className="w-3 h-3" /> سررسید</label>
          <PersianDatePicker value={task.dueDate || ''} onChange={v => onUpdateTask({ ...task, dueDate: v || undefined })} placeholder="انتخاب تاریخ..." />
        </div>
      </div>

      {/* Row 3: Estimated + Actual time */}
      <div className="grid grid-cols-2 gap-2 bg-white dark:bg-[#1B1D16] space-y-1.5">
        <div>
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1"><Clock className="w-3 h-3" /> تخمینی (دقیقه)</label>
          <input type="number" min={0} value={task.estimatedMinutes || ''} onChange={e => onUpdateTask({ ...task, estimatedMinutes: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363] font-semibold" placeholder="مثلاً ۶۰" />
        </div>
        <div>
          <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1"><Clock className="w-3 h-3" /> صرف‌شده (دقیقه)</label>
          <input type="number" min={0} value={task.actualMinutes || ''} onChange={e => onUpdateTask({ ...task, actualMinutes: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363] font-semibold" placeholder="خودکار" />
        </div>
      </div>

      {/* Row 4: Context — زمینه, پروژه, حوزه, هدف */}
      <div className="bg-white dark:bg-[#1B1D16] space-y-2">
        <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">زمینه</label>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mb-0.5">حوزه</span>
            {linkedArea ? (
              <div className="flex items-center gap-1 bg-amber-50/50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                <Layers className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 truncate">{linkedArea.title}</span>
              </div>
            ) : (
              <select value={task.areaId || ''} onChange={e => onUpdateTask({ ...task, areaId: e.target.value || undefined })}
                className="w-full px-1.5 py-1 text-[10px] bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]">
                <option value="">—</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            )}
          </div>
          <div>
            <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mb-0.5">پروژه</span>
            {linkedProject ? (
              <div className="flex items-center gap-1 bg-blue-50/50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                <FolderKanban className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 truncate">{linkedProject.title}</span>
                {onNavigate && <button onClick={() => onNavigate('projects', linkedProject.id)} className="text-blue-400 hover:text-blue-600 shrink-0 cursor-pointer"><ArrowUpRight className="w-3 h-3" /></button>}
              </div>
            ) : (
              <select value={task.projectId || ''} onChange={e => onUpdateTask({ ...task, projectId: e.target.value || undefined })}
                className="w-full px-1.5 py-1 text-[10px] bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]">
                <option value="">—</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
          </div>
          <div>
            <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mb-0.5">هدف</span>
            {linkedGoal ? (
              <div className="flex items-center gap-1 bg-purple-50/50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">
                <Target className="w-3 h-3 text-purple-500 shrink-0" />
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 truncate">{linkedGoal.title}</span>
                {onNavigate && <button onClick={() => onNavigate('goals', linkedGoal.id)} className="text-purple-400 hover:text-purple-600 shrink-0 cursor-pointer"><ArrowUpRight className="w-3 h-3" /></button>}
              </div>
            ) : (
              <select value={task.goalId || ''} onChange={e => onUpdateTask({ ...task, goalId: e.target.value || undefined })}
                className="w-full px-1.5 py-1 text-[10px] bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]">
                <option value="">—</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            )}
          </div>
          <div>
            <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mb-0.5">برنامه</span>
            <div className="flex items-center gap-1 bg-[#F9F6EE] dark:bg-[#3D4133]/50 px-2 py-1 rounded-lg">
              <Zap className="w-3 h-3 text-[#7C8363] shrink-0" />
              <span className="text-[10px] font-bold text-[#7C8363] dark:text-[#9ECE9A] truncate">Hambaft</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Notes (inline — replaces description) */}
      <div className="bg-white dark:bg-[#1B1D16] space-y-1.5">
        <EntityNoteEditor
          entityId={task.id} entityType="task" title=""
          initialBlocks={task.noteBlocks}
          onSave={(blocks) => onUpdateTask({ ...task, noteBlocks: blocks })}
        />
      </div>
    </div>
  )
}

// ─── Plan ────────────────────────────────────────────────────
function PlanTab({ task, allTasks, subtasks, subDone, subTotal, subPct, newSubtaskText, setNewSubtaskText, addSubtask, toggleSubtask, deleteSubtask, updateSubtaskTitle, onUpdateTask }: {
  task: Task; allTasks: Task[]; subtasks: SubTask[]; subDone: number; subTotal: number; subPct: number;
  newSubtaskText: string; setNewSubtaskText: (v: string) => void; addSubtask: () => void;
  toggleSubtask: (id: string) => void; deleteSubtask: (id: string) => void; updateSubtaskTitle: (id: string, title: string) => void;
  onUpdateTask: (t: Task) => void
}) {
  const [depSearch, setDepSearch] = useState('')
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubText, setEditingSubText] = useState('')

  const possibleDeps = useMemo(() => {
    const filtered = allTasks.filter(t => t.id !== task.id)
    if (!depSearch.trim()) return filtered.slice(0, 12)
    const q = depSearch.toLowerCase()
    return filtered.filter(t => t.title.toLowerCase().includes(q)).slice(0, 12)
  }, [allTasks, task.id, depSearch])

  const nextStep = useMemo(() => {
    const incomplete = subtasks.find(st => !st.completed)
    if (incomplete) return `بعدی: ${incomplete.title}`
    if (subTotal > 0 && subDone === subTotal) return 'همه مراحل انجام شد ✓'
    return null
  }, [subtasks, subDone, subTotal])

  const blockedByTasks = useMemo(() => {
    return (task.blockedBy || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[]
  }, [task.blockedBy, allTasks])

  return (
    <div className="space-y-1">
      {/* Progress */}
      {subTotal > 0 && (
        <div className="bg-white dark:bg-[#1B1D16] space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-[#8D7F72] dark:text-[#9D978B]">پیشرفت</span>
            <span className={`font-mono ${subPct === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#7C8363] dark:text-[#9ECE9A]'}`}>{subDone}/{subTotal} • {subPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#F3EFE6] dark:bg-[#3D4133] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${subPct === 100 ? 'bg-emerald-500' : 'bg-[#7C8363]'}`} style={{ width: `${subPct}%` }} />
          </div>
        </div>
      )}

      {nextStep && !task.completed && (
        <div className="flex items-center gap-2 bg-[#E8ECE0]/30 dark:bg-[#7C8363]/10 px-3 py-2 rounded-lg">
          <ArrowUpRight className="w-3.5 h-3.5 text-[#7C8363] shrink-0" />
          <span className="text-[10px] font-bold text-[#5A5A40] dark:text-[#9ECE9A]">{nextStep}</span>
        </div>
      )}

      {/* Subtasks */}
      <div className="bg-white dark:bg-[#1B1D16] space-y-2">
        <label className="text-[10px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#7C8363]" /> مراحل فرعی
        </label>
        <div className="flex gap-1.5">
          <input type="text" placeholder="مرحله جدید + Enter..." value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363] font-semibold" />
          <button onClick={addSubtask} className="px-2.5 py-1.5 bg-[#7C8363] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#5A5A40]"><Plus className="w-3.5 h-3.5" /></button>
        </div>
        {subtasks.length > 0 ? (
          <div className="space-y-1">
            {subtasks.map(st => (
              <div key={st.id} className={`flex items-center gap-2 px-2 py-1.5 transition-all ${st.completed ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-white dark:bg-[#121411]'}`}>
                <button onClick={() => toggleSubtask(st.id)} className="shrink-0 cursor-pointer active:scale-90">
                  {st.completed ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Circle className="w-4 h-4 text-[#D6CFC3] dark:text-[#3D4133] hover:text-[#7C8363]" />}
                </button>
                {editingSubId === st.id ? (
                  <input value={editingSubText} onChange={e => setEditingSubText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }; if (e.key === 'Escape') setEditingSubId(null) }}
                    onBlur={() => { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }}
                    className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none font-semibold" autoFocus />
                ) : (
                  <span className={`flex-1 min-w-0 text-xs font-semibold cursor-text ${st.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]' : 'text-[#3D3D3D] dark:text-[#E8ECE0]'}`}
                    onDoubleClick={() => { setEditingSubId(st.id); setEditingSubText(st.title) }}>{st.title}</span>
                )}
                <button onClick={() => deleteSubtask(st.id)} className="p-0.5 text-[#D6CFC3] dark:text-[#3D4133] hover:text-red-500 rounded shrink-0 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3 bg-white/40 dark:bg-[#121411]/40 text-[10px] text-[#8D7F72] dark:text-[#9D978B] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#9B6B61]" /> کار بزرگ را به خرده‌کار تبدیل کنید
          </div>
        )}
      </div>

      {/* Dependencies — toggleable */}
      <div className="bg-white dark:bg-[#1B1D16] space-y-2">
        <label className="text-[10px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-[#7C8363]" /> پیش‌نیازها
          {(task.blockedBy || []).length > 0 && <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 mr-1">{task.blockedBy!.length} مسدودکننده</span>}
        </label>

        {(task.blockedBy || []).length > 0 && !task.completed && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2.5 space-y-1.5">
            <BlockedTaskIndicator task={task} />
            {blockedByTasks.length > 0 && (
              <div className="space-y-1 mt-1">
                {blockedByTasks.map(bt => (
                  <div key={bt.id} className="flex items-center gap-1.5 text-[9px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${bt.completed ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                    <span className={`font-semibold truncate ${bt.completed ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-orange-700 dark:text-orange-300'}`}>{bt.title}</span>
                    {bt.completed && <span className="text-emerald-500 font-bold">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <input type="text" placeholder="جستجوی تسک برای افزودن/حذف پیش‌نیاز..." value={depSearch}
          onChange={e => setDepSearch(e.target.value)}
          className="w-full px-2.5 py-1.5 text-[10px] bg-white dark:bg-[#121411] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363] font-semibold" />
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {possibleDeps.map(dep => {
            const isSelected = (task.blockedBy || []).includes(dep.id)
            return (
              <button key={dep.id}
                onClick={() => {
                  const deps = isSelected
                    ? (task.blockedBy || []).filter(id => id !== dep.id)
                    : [...(task.blockedBy || []), dep.id]
                  onUpdateTask({ ...task, blockedBy: deps })
                }}
                className={`w-full flex items-center justify-between p-1.5 rounded-lg text-[10px] cursor-pointer transition-all ${
                  isSelected ? 'bg-[#E8ECE0]/40 dark:bg-[#7C8363]/20 font-bold' : 'bg-white dark:bg-[#121411] hover:bg-[#F9F6EE]/50 dark:hover:bg-[#3D4133]/50'
                }`}>
                <span className="truncate">{dep.title}</span>
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${isSelected ? 'bg-[#7C8363] text-white' : dep.completed ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
                  {isSelected ? '✓ حذف' : dep.completed ? '✓' : '⊘'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Time ────────────────────────────────────────────────────
function TimeTab({ task, isActiveSession, activeTimerSeconds, isTimerRunning, onStartTimer, onPauseTimer, onStopTimer, onResetTimer, formatSeconds }: {
  task: Task; isActiveSession: boolean; activeTimerSeconds: number; isTimerRunning: boolean;
  onStartTimer?: (id: string) => void; onPauseTimer?: () => void; onStopTimer?: () => void;
  onResetTimer?: (id: string) => void; formatSeconds: (s: number) => string
}) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!task.id) return
    setLoading(true)
    getTaskSessions(task.id, 20)
      .then(resp => setSessions(resp?.data?.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [task.id])

  const actualSeconds = task.totalTimeSpent || (task.actualMinutes ? task.actualMinutes * 60 : 0)
  const estimatedSeconds = task.estimatedMinutes ? task.estimatedMinutes * 60 : 0
  const timePct = estimatedSeconds > 0 ? Math.min(100, Math.round((actualSeconds / estimatedSeconds) * 100)) : 0
  const isOverBudget = estimatedSeconds > 0 && actualSeconds > estimatedSeconds

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—'
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `${mins} دقیقه`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}س ${m}د` : `${h} ساعت`
  }

  const formatDurationMinutes = (minutes: number) => {
    if (!minutes) return '—'
    if (minutes < 60) return `${minutes} دقیقه`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m ? `${h}س ${m}د` : `${h} ساعت`
  }

  const formatTime = (iso: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return d.toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  const totalSessionMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0)

  return (
    <div className="space-y-1">
      {/* Timer */}
      <div className="bg-white dark:bg-[#1B1D16] text-center space-y-2">
        <span className="text-[9px] font-black text-[#5A5A40] dark:text-[#9ECE9A] uppercase tracking-wider">
          {isActiveSession ? '⏱ جلسه فعال' : 'زمان‌سنج'}
        </span>
        <div className={`text-3xl font-black font-mono ${isActiveSession ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#8D7F72] dark:text-[#9D978B]'}`}>
          {isActiveSession ? formatSeconds(activeTimerSeconds) : '00:00:00'}
        </div>
        <div className="flex gap-2 justify-center">
          {isActiveSession ? (
            <>
              <button onClick={isTimerRunning ? onPauseTimer : () => onStartTimer?.(task.id)}
                className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  isTimerRunning ? 'bg-[#9B6B61] text-white hover:bg-[#7C5047]' : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'
                }`}>
                {isTimerRunning ? <><Pause className="w-3.5 h-3.5" /> توقف</> : <><Play className="w-3.5 h-3.5" /> ادامه</>}
              </button>
              <button onClick={onStopTimer}
                className="px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-red-600">
                <Square className="w-3.5 h-3.5" /> پایان
              </button>
            </>
          ) : (
            <button onClick={() => onStartTimer?.(task.id)}
              className="px-5 py-2 bg-[#7C8363] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-[#5A5A40] shadow-sm">
              <Play className="w-4 h-4 fill-white" /> شروع زمان‌سنج
            </button>
          )}
        </div>
      </div>

      {/* Tracked vs Estimated */}
      <div className="bg-white dark:bg-[#1B1D16] space-y-2">
        <div className="flex items-center justify-between text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B]">
          <span>صرف‌شده / تخمینی</span>
          <span className={isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-[#7C8363] dark:text-[#9ECE9A]'}>{formatDuration(actualSeconds)} / {formatDuration(estimatedSeconds)}</span>
        </div>
        {estimatedSeconds > 0 ? (
          <div className="w-full h-3 bg-[#E6DFD3] dark:bg-[#3D4133] rounded-full overflow-hidden relative">
            <div className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : timePct >= 80 ? 'bg-[#9B6B61]' : 'bg-[#7C8363]'}`} style={{ width: `${Math.min(timePct, 100)}%` }} />
          </div>
        ) : (
          <div className="text-[10px] text-[#9D978B] dark:text-[#8D7F72] text-center py-1.5">تخمین زمان تعیین نشده — از تب نمای کلی تنظیم کنید</div>
        )}
        <div className="flex justify-between text-[9px] text-[#9D978B] dark:text-[#8D7F72]">
          <span>{timePct}% استفاده</span>
          {estimatedSeconds > 0 && <span>{formatDuration(estimatedSeconds - actualSeconds)} باقی‌مانده</span>}
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-white dark:bg-[#1B1D16] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#7C8363]" />
            <span className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B]">جلسات اخیر</span>
          </div>
          {sessions.length > 0 && <span className="text-[9px] text-[#9D978B]">{sessions.length} جلسه • {formatDurationMinutes(totalSessionMinutes)}</span>}
        </div>
        {loading ? (
          <div className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] text-center py-3">در حال بارگذاری...</div>
        ) : sessions.length === 0 ? (
          <div className="text-[10px] text-[#9D978B] text-center py-3 bg-[#F9F6EE] dark:bg-[#121411] rounded-lg">هنوز جلسه‌ای ثبت نشده</div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {sessions.map((s, idx) => (
              <div key={s.name || idx} className="flex items-center justify-between bg-[#F9F6EE] dark:bg-[#121411] px-2.5 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'completed' ? 'bg-emerald-500' : s.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-[#9B6B61]'}`} />
                  <span className="text-[10px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">{formatDurationMinutes(s.duration_minutes)}</span>
                </div>
                <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">{formatTime(s.started_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
