/**
 * TaskDetailPage — Full-page task detail view.
 * Replaces the old side-drawer approach. When a user clicks on a task
 * from anywhere in the app, they land on this page.
 *
 * Tabs: Overview | Plan | Relations & Impact | Time & Sessions | Notes
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, CheckCircle, Circle, Edit2, Trash2, Calendar, Clock, Flag, Zap,
  FolderKanban, Target, Layers, AlertCircle, Play, Pause,
  Square, RotateCcw, Sparkles, Pin, Link2, ArrowUpRight,
  BookOpen, Timer, History, Plus, ChevronDown, Check, GripVertical,
  ChevronLeft,
} from 'lucide-react'
import type { Task, SubTask } from '../types'
import {
  ImportanceBadge, ImportanceSelector, ImpactScoreBadge,
  TaskImpactBanner, TaskImpactExplanation, BlockedTaskIndicator,
} from './TaskV2Shared'
import type { ImportanceLevel } from './TaskV2Shared'
import { getTaskSessions } from '../../app/hambaft-api'
import EntityNoteEditor from '../../notes/components/EntityNoteEditor'

// ─── Tab definitions ─────────────────────────────────────────
type DetailTab = 'overview' | 'plan' | 'relations' | 'time' | 'notes'

const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'نمای کلی', icon: <Layers className="w-4 h-4" /> },
  { id: 'plan', label: 'برنامه', icon: <Calendar className="w-4 h-4" /> },
  { id: 'relations', label: 'تأثیر', icon: <Zap className="w-4 h-4" /> },
  { id: 'time', label: 'زمان', icon: <Timer className="w-4 h-4" /> },
  { id: 'notes', label: 'یادداشت', icon: <BookOpen className="w-4 h-4" /> },
]

const STATUS_OPTIONS = [
  { id: 'inbox', label: 'ورودی', color: 'bg-[#F9F1D8] text-[#5A5A40] border-[#EBE3C8]' },
  { id: 'today', label: 'امروز', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'next', label: 'بعدی', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'in_progress', label: 'درحال انجام', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'on_hold', label: 'متوقف', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'someday', label: 'شاید', color: 'bg-[#F9F6EE] text-[#8D7F72] border-[#D6CFC3]' },
  { id: 'done', label: 'انجام‌شده', color: 'bg-green-50 text-green-700 border-green-200' },
] as const

const PRIORITY_MAP: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'پایین', color: 'bg-emerald-100 text-emerald-700', icon: '🟢' },
  medium: { label: 'متوسط', color: 'bg-[#F9F1D8] text-[#5A5A40]', icon: '🟡' },
  high: { label: 'فوری', color: 'bg-red-100 text-red-700', icon: '🔴' },
  urgent: { label: 'بحرانی', color: 'bg-red-200 text-red-800', icon: '🚨' },
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
  // Session / Timer
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

  // Keep tempTitle in sync when task changes
  useEffect(() => { setTempTitle(task.title) }, [task.title])

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

  const updateSubtaskTitle = (id: string, title: string) => {
    const updated = (task.subTasks || []).map(st => st.id === id ? { ...st, title } : st)
    onUpdateTask({ ...task, subTasks: updated })
  }

  // Stats
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

  // Resolve linked entity names for quick context
  const linkedGoal = useMemo(() => goals.find(g => g.id === task.goalId), [goals, task.goalId])
  const linkedProject = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId])
  const linkedArea = useMemo(() => areas.find(a => a.id === task.areaId), [areas, task.areaId])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)]" dir="rtl">
      {/* ── Top Navigation Bar ── */}
      <div className="sticky top-0 z-30 bg-[#F9F6EE]/90 backdrop-blur-lg border-b border-[#E6DFD3]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6DFD3] text-[#2D3025] hover:bg-[#F9F6EE] hover:border-[#7C8363]/30 transition-all text-sm font-bold shadow-sm cursor-pointer active:scale-95"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت</span>
          </button>

          {/* Task completed toggle */}
          <button
            onClick={() => onUpdateTask({ ...task, completed: !task.completed })}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
              task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'bg-white border-[#D6CFC3] hover:border-[#7C8363]'
            }`}
          >
            {task.completed && <CheckCircle className="w-4 h-4" />}
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex gap-2">
                <input
                  value={tempTitle}
                  onChange={e => setTempTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTempTitle(task.title); setIsEditingTitle(false) } }}
                  className="flex-1 min-w-0 px-3 py-1.5 text-base font-extrabold border-2 border-[#7C8363] rounded-xl bg-white focus:outline-none"
                  autoFocus
                />
                <button onClick={saveTitle} className="px-3 py-1.5 text-xs font-bold bg-[#7C8363] text-white rounded-xl shrink-0 cursor-pointer">ذخیره</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-extrabold truncate ${task.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                  {task.title}
                </h1>
                <button onClick={() => { setTempTitle(task.title); setIsEditingTitle(true) }} className="p-1.5 text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E8ECE0]/50 rounded-lg shrink-0 cursor-pointer">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="shrink-0">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => onDeleteTask(task.id)} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer">بله، حذف</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 bg-[#E6DFD3] text-[#2D3025] text-xs font-bold rounded-xl cursor-pointer">انصراف</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-[#8D7F72] hover:text-red-500 rounded-xl cursor-pointer hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        </div>

        {/* Quick context row */}
        <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          {(() => {
            const s = STATUS_OPTIONS.find(o => o.id === task.status || (o.id === 'done' && task.completed))
            return s ? <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${s.color}`}>{s.label}</span> : null
          })()}
          {/* Priority */}
          {task.priority && PRIORITY_MAP[task.priority] && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${PRIORITY_MAP[task.priority].color}`}>{PRIORITY_MAP[task.priority].icon} {PRIORITY_MAP[task.priority].label}</span>
          )}
          {/* Importance */}
          {task.importance && task.importance !== 'normal' && <ImportanceBadge importance={task.importance} size="sm" />}
          {/* Blocked */}
          {(task.blockedBy || []).length > 0 && !task.completed && (
            <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-1 rounded-lg border border-orange-200">⊘ مسدود</span>
          )}
          {/* Impact score */}
          {task.impactScore != null && task.impactScore > 0 && <ImpactScoreBadge score={task.impactScore} />}
          {/* Daily highlight */}
          {task.isDailyHighlight && <span className="text-[10px] font-bold bg-[#d4a017]/15 text-[#b8860b] px-2 py-1 rounded-lg">⭐ برجسته</span>}
          {/* Linked context pills */}
          {linkedProject && <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">📁 {linkedProject.title}</span>}
          {linkedGoal && <span className="text-[10px] font-semibold bg-purple-50 text-purple-600 px-2 py-1 rounded-lg">🎯 {linkedGoal.title}</span>}
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-0.5 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black whitespace-nowrap transition-all border-b-2 cursor-pointer ${
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
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                task={task}
                goals={goals}
                projects={projects}
                areas={areas}
                linkedGoal={linkedGoal}
                linkedProject={linkedProject}
                linkedArea={linkedArea}
                onUpdateTask={onUpdateTask}
                onNavigate={onNavigate}
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
                updateSubtaskTitle={updateSubtaskTitle}
                onUpdateTask={onUpdateTask}
              />
            )}
            {activeTab === 'relations' && (
              <RelationsTab task={task} linkedGoal={linkedGoal} linkedProject={linkedProject} onNavigate={onNavigate} />
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Tab Components — Full-page versions with more spacious layout
// ══════════════════════════════════════════════════════════════

// ─── Overview — only high-frequency fields ────────────────────
function OverviewTab({ task, goals, projects, areas, linkedGoal, linkedProject, linkedArea, onUpdateTask, onNavigate }: {
  task: Task; goals: any[]; projects: Array<{ id: string; title: string }>; areas: Array<{ id: string; title: string }>;
  linkedGoal: any; linkedProject: { id: string; title: string } | undefined; linkedArea: { id: string; title: string } | undefined;
  onUpdateTask: (t: Task) => void; onNavigate?: (tab: string, id?: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Status — pill row */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
        <label className="text-[10px] font-black text-[#8D7F72] uppercase tracking-wider">وضعیت</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdateTask({ ...task, status: s.id as any, completed: s.id === 'done' })}
              className={`text-[11px] font-bold px-3.5 py-2 rounded-xl border cursor-pointer transition-all ${
                task.status === s.id || (s.id === 'done' && task.completed)
                  ? `${s.color} ring-2 ring-[#7C8363]/20 shadow-sm`
                  : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority + Importance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
          <label className="text-[10px] font-black text-[#8D7F72] uppercase tracking-wider">اولویت</label>
          <div className="flex gap-2">
            {Object.entries(PRIORITY_MAP).map(([id, p]) => (
              <button
                key={id}
                onClick={() => onUpdateTask({ ...task, priority: id as any })}
                className={`text-[11px] font-bold px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                  task.priority === id ? `${p.color} border-current shadow-sm` : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]/50'
                }`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
          <label className="text-[10px] font-black text-[#8D7F72] uppercase tracking-wider">اهمیت</label>
          <ImportanceSelector value={task.importance || 'normal'} onChange={imp => onUpdateTask({ ...task, importance: imp })} />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-2">
          <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1.5"><Calendar className="w-4 h-4" /> تاریخ برنامه</label>
          <input type="date" value={task.scheduledDate || ''} onChange={e => onUpdateTask({ ...task, scheduledDate: e.target.value || undefined })}
            className="w-full px-3 py-2.5 text-sm border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-2">
          <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1.5"><Calendar className="w-4 h-4" /> سررسید</label>
          <input type="date" value={task.dueDate || ''} onChange={e => onUpdateTask({ ...task, dueDate: e.target.value || undefined })}
            className="w-full px-3 py-2.5 text-sm border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold" />
        </div>
      </div>

      {/* Estimated + Actual time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-2">
          <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1.5"><Clock className="w-4 h-4" /> زمان تخمینی (دقیقه)</label>
          <input type="number" min={0} value={task.estimatedMinutes || ''} onChange={e => onUpdateTask({ ...task, estimatedMinutes: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2.5 text-sm border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold" placeholder="مثلاً ۶۰" />
        </div>
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-2">
          <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1.5"><Clock className="w-4 h-4" /> زمان صرف‌شده (دقیقه)</label>
          <input type="number" min={0} value={task.actualMinutes || ''} onChange={e => onUpdateTask({ ...task, actualMinutes: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2.5 text-sm border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold" placeholder="خودکار پر می‌شود" />
        </div>
      </div>

      {/* Context: Project / Area / Goal */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
        <label className="text-[10px] font-black text-[#8D7F72] uppercase tracking-wider">زمینه</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#8D7F72] font-bold">پروژه</span>
            {linkedProject ? (
              <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-2 rounded-xl border border-blue-100">
                <FolderKanban className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-xs font-bold text-blue-700 truncate">{linkedProject.title}</span>
                {onNavigate && (
                  <button onClick={() => onNavigate('projects', linkedProject.id)} className="text-blue-400 hover:text-blue-600 shrink-0 cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
                )}
              </div>
            ) : (
              <select value={task.projectId || ''} onChange={e => onUpdateTask({ ...task, projectId: e.target.value || undefined })}
                className="w-full px-2.5 py-2 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold">
                <option value="">— بدون پروژه</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#8D7F72] font-bold">حوزه</span>
            <select value={task.areaId || ''} onChange={e => onUpdateTask({ ...task, areaId: e.target.value || undefined })}
              className="w-full px-2.5 py-2 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold">
              <option value="">— بدون حوزه</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#8D7F72] font-bold">هدف</span>
            {linkedGoal ? (
              <div className="flex items-center gap-2 bg-purple-50/50 px-3 py-2 rounded-xl border border-purple-100">
                <Target className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-xs font-bold text-purple-700 truncate">{linkedGoal.title}</span>
                {onNavigate && (
                  <button onClick={() => onNavigate('goals', linkedGoal.id)} className="text-purple-400 hover:text-purple-600 shrink-0 cursor-pointer"><ArrowUpRight className="w-4 h-4" /></button>
                )}
              </div>
            ) : (
              <select value={task.goalId || ''} onChange={e => onUpdateTask({ ...task, goalId: e.target.value || undefined })}
                className="w-full px-2.5 py-2 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-semibold">
                <option value="">— بدون هدف</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-2">
        <label className="text-[10px] font-black text-[#8D7F72] uppercase tracking-wider">توضیحات</label>
        <textarea
          value={task.description || ''}
          onChange={e => onUpdateTask({ ...task, description: e.target.value })}
          className="w-full px-3 py-3 text-sm border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363] min-h-[100px] resize-y font-semibold leading-7"
          placeholder="توضیح مختصر درباره این تسک..."
          rows={4}
        />
      </div>
    </div>
  )
}

// ─── Plan — subtasks are primary surface ─────────────────────
function PlanTab({ task, allTasks, subtasks, subDone, subTotal, subPct, newSubtaskText, setNewSubtaskText, addSubtask, toggleSubtask, deleteSubtask, updateSubtaskTitle, onUpdateTask }: {
  task: Task; allTasks: Task[]; subtasks: SubTask[]; subDone: number; subTotal: number; subPct: number;
  newSubtaskText: string; setNewSubtaskText: (v: string) => void; addSubtask: () => void;
  toggleSubtask: (id: string) => void; deleteSubtask: (id: string) => void; updateSubtaskTitle: (id: string, title: string) => void;
  onUpdateTask: (t: Task) => void
}) {
  const [depSearch, setDepSearch] = useState('')
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubText, setEditingSubText] = useState('')
  const subInputRef = useRef<HTMLInputElement>(null)

  const possibleDeps = useMemo(() => {
    const filtered = allTasks.filter(t => t.id !== task.id)
    if (!depSearch.trim()) return filtered.slice(0, 15)
    const q = depSearch.toLowerCase()
    return filtered.filter(t => t.title.toLowerCase().includes(q)).slice(0, 15)
  }, [allTasks, task.id, depSearch])

  // Next-step hint
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
    <div className="space-y-6">
      {/* Progress header */}
      {subTotal > 0 && (
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-[#8D7F72]">پیشرفت مراحل</span>
            <span className={`font-mono ${subPct === 100 ? 'text-emerald-600' : 'text-[#7C8363]'}`}>{subDone}/{subTotal} • {subPct}%</span>
          </div>
          <div className="w-full h-3 bg-[#F3EFE6] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${subPct === 100 ? 'bg-emerald-500' : 'bg-[#7C8363]'}`} style={{ width: `${subPct}%` }} />
          </div>
        </div>
      )}

      {/* Next-step hint */}
      {nextStep && !task.completed && (
        <div className="flex items-center gap-2.5 bg-[#E8ECE0]/30 px-4 py-3 rounded-2xl border border-[#7C8363]/15">
          <ArrowUpRight className="w-4 h-4 text-[#7C8363] shrink-0" />
          <span className="text-xs font-bold text-[#5A5A40]">{nextStep}</span>
        </div>
      )}

      {/* Subtask list */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-4">
        <label className="text-sm font-black text-[#2D3025] flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#7C8363]" /> مراحل فرعی
        </label>
        <div className="flex gap-2">
          <input
            ref={subInputRef}
            type="text"
            placeholder="مرحله جدید + Enter..."
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
            className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold"
          />
          <button onClick={addSubtask} className="px-3.5 py-2.5 bg-[#7C8363] text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-[#5A5A40] transition-colors"><Plus className="w-5 h-5" /></button>
        </div>
        {subtasks.length > 0 ? (
          <div className="space-y-2">
            {subtasks.map(st => (
              <div key={st.id} className={`flex items-center gap-3 px-3.5 py-3 border rounded-xl transition-all ${st.completed ? 'bg-emerald-50/30 border-emerald-200/50' : 'bg-white border-[#E6DFD3] hover:bg-[#F9F6EE]/50'}`}>
                <button onClick={() => toggleSubtask(st.id)} className="shrink-0 cursor-pointer active:scale-90">
                  {st.completed ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-[#D6CFC3] hover:text-[#7C8363]" />}
                </button>
                {editingSubId === st.id ? (
                  <input
                    value={editingSubText}
                    onChange={e => setEditingSubText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }; if (e.key === 'Escape') setEditingSubId(null) }}
                    onBlur={() => { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-[#7C8363] rounded-lg bg-white focus:outline-none font-semibold"
                    autoFocus
                  />
                ) : (
                  <span
                    className={`flex-1 min-w-0 text-sm font-semibold cursor-text ${st.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'}`}
                    onDoubleClick={() => { setEditingSubId(st.id); setEditingSubText(st.title) }}
                  >
                    {st.title}
                  </span>
                )}
                <button onClick={() => deleteSubtask(st.id)} className="p-1.5 text-[#D6CFC3] hover:text-red-500 rounded-lg shrink-0 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-white/40 border border-dashed border-[#D6CFC3] rounded-2xl text-sm text-[#8D7F72] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#9B6B61]" /> کار بزرگ را به خرده‌کار تبدیل کنید
          </div>
        )}
      </div>

      {/* Dependencies */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-4">
        <label className="text-sm font-black text-[#2D3025] flex items-center gap-2">
          <Link2 className="w-5 h-5 text-[#7C8363]" /> پیش‌نیازها
          {(task.blockedBy || []).length > 0 && <span className="text-xs font-bold text-orange-600 mr-1">{task.blockedBy!.length} مسدودکننده</span>}
        </label>

        {/* Blocked state */}
        {(task.blockedBy || []).length > 0 && !task.completed && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 space-y-2">
            <BlockedTaskIndicator task={task} />
            {blockedByTasks.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {blockedByTasks.map(bt => (
                  <div key={bt.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${bt.completed ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                    <span className={`font-semibold truncate ${bt.completed ? 'text-emerald-600 line-through' : 'text-orange-700'}`}>{bt.title}</span>
                    {bt.completed && <span className="text-emerald-500 font-bold">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add dependency */}
        <input
          type="text"
          placeholder="جستجوی تسک برای افزودن پیش‌نیاز..."
          value={depSearch}
          onChange={e => setDepSearch(e.target.value)}
          className="w-full px-3 py-2.5 text-sm bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold"
        />
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {possibleDeps.map(dep => {
            const isSelected = (task.blockedBy || []).includes(dep.id)
            return (
              <button
                key={dep.id}
                onClick={() => {
                  const deps = isSelected ? (task.blockedBy || []).filter(id => id !== dep.id) : [...(task.blockedBy || []), dep.id]
                  onUpdateTask({ ...task, blockedBy: deps })
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected ? 'bg-[#E8ECE0]/40 border-[#7C8363] font-bold' : 'bg-white border-[#E6DFD3] hover:bg-[#F9F6EE]/50'
                }`}
              >
                <span className="truncate">{dep.title}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${dep.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
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
function RelationsTab({ task, linkedGoal, linkedProject, onNavigate }: {
  task: Task; linkedGoal: any; linkedProject: { id: string; title: string } | undefined;
  onNavigate?: (tab: string, id?: string) => void
}) {
  const healthLabels: Record<string, string> = {
    off_track: 'خارج از مسیر', خارج_از_مسیر: 'خارج از مسیر',
    at_risk: 'در خطر', در_خطر: 'در خطر',
    needs_review: 'نیاز به بررسی', نیاز_به_بررسی: 'نیاز به بررسی',
    on_track: 'در مسیر', در_مسیر: 'در مسیر',
  }
  const healthColors: Record<string, string> = {
    'خارج از مسیر': 'bg-red-100 text-red-700',
    'در خطر': 'bg-[#F9F1D8] text-[#5A5A40]',
    'نیاز به بررسی': 'bg-yellow-100 text-yellow-700',
    'در مسیر': 'bg-emerald-100 text-emerald-700',
  }
  const contribLabels: Record<string, { label: string; color: string }> = {
    mandatory: { label: 'اجباری', color: 'bg-red-100 text-red-700' },
    اجباری: { label: 'اجباری', color: 'bg-red-100 text-red-700' },
    recommended: { label: 'پیشنهادی', color: 'bg-blue-100 text-blue-700' },
    پیشنهادی: { label: 'پیشنهادی', color: 'bg-blue-100 text-blue-700' },
    supporting: { label: 'پشتیبان', color: 'bg-[#E6DFD3]/40 text-[#8D7F72]' },
    پشتیبان: { label: 'پشتیبان', color: 'bg-[#E6DFD3]/40 text-[#8D7F72]' },
  }

  const goalHealth = task.impactGoalHealth ? (healthLabels[task.impactGoalHealth] || task.impactGoalHealth) : null
  const contrib = task.impactProjectContributionType ? contribLabels[task.impactProjectContributionType] : null

  return (
    <div className="space-y-5">
      {/* Impact Score */}
      {task.impactScore != null && task.impactScore > 0 && (
        <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-[#E6DFD3]">
          <span className="text-sm font-black text-[#8D7F72]">امتیاز تأثیر</span>
          <ImpactScoreBadge score={task.impactScore} />
        </div>
      )}

      {/* Goal relation */}
      {(task.impactGoalTitle || linkedGoal) && (
        <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-600">هدف</span>
            {goalHealth && <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${healthColors[goalHealth] || 'bg-[#E6DFD3]/40 text-[#8D7F72]'}`}>{goalHealth}</span>}
          </div>
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-purple-600 shrink-0" />
            <span className="text-sm font-bold text-purple-800 truncate">{task.impactGoalTitle || linkedGoal?.title}</span>
            {task.impactGoalProgress != null && <span className="text-xs text-purple-500 shrink-0">({Math.round(task.impactGoalProgress)}%)</span>}
            {onNavigate && linkedGoal && (
              <button onClick={() => onNavigate('goals', linkedGoal.id)} className="text-purple-400 hover:text-purple-600 shrink-0 mr-auto cursor-pointer" title="رفتن به هدف">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Project relation */}
      {(task.impactProjectTitle || linkedProject) && (
        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-600">پروژه</span>
            {contrib && <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${contrib.color}`}>{contrib.label}</span>}
          </div>
          <div className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="text-sm font-bold text-blue-800 truncate">{task.impactProjectTitle || linkedProject?.title}</span>
            {task.impactProjectProgress != null && <span className="text-xs text-blue-500 shrink-0">({Math.round(task.impactProjectProgress)}%)</span>}
            {onNavigate && linkedProject && (
              <button onClick={() => onNavigate('projects', linkedProject.id)} className="text-blue-400 hover:text-blue-600 shrink-0 mr-auto cursor-pointer" title="رفتن به پروژه">
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Impact explanation */}
      {(task.impactGoalTitle || task.impactProjectTitle) && !task.completed && (
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5">
          <TaskImpactExplanation task={task} />
        </div>
      )}

      {/* Blocked indicator */}
      {(task.blockedBy || []).length > 0 && !task.completed && (
        <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5">
          <BlockedTaskIndicator task={task} />
        </div>
      )}

      {/* Empty state */}
      {!task.impactGoalTitle && !task.impactProjectTitle && !linkedGoal && !linkedProject && (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#D6CFC3] space-y-3">
          <Zap className="w-10 h-10 text-[#D6CFC3] mx-auto" />
          <p className="text-sm text-[#8D7F72] font-semibold">این تسک هنوز به پروژه یا هدفی پیوند نشده</p>
          <p className="text-xs text-[#9D978B]">با پیوند دادن، امتیاز تأثیر و زمینه کاری مشخص می‌شود</p>
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

  const actual = task.actualMinutes || 0
  const estimated = task.estimatedMinutes || 0
  const timePct = estimated > 0 ? Math.min(100, Math.round((actual / estimated) * 100)) : 0
  const isOverBudget = estimated > 0 && actual > estimated

  const formatDuration = (minutes: number) => {
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
    <div className="space-y-6">
      {/* Timer */}
      <div className="p-6 bg-white rounded-2xl border border-[#7C8363]/20 space-y-4 text-center">
        <span className="text-[10px] font-black text-[#5A5A40] uppercase tracking-wider">
          {isActiveSession ? '⏱ جلسه فعال' : 'زمان‌سنج'}
        </span>
        <div className={`text-4xl font-black font-mono ${isActiveSession ? 'text-[#2D3025]' : 'text-[#8D7F72]'}`}>
          {isActiveSession ? formatSeconds(activeTimerSeconds) : '00:00:00'}
        </div>
        <div className="flex gap-3 justify-center">
          {isActiveSession ? (
            <>
              <button onClick={isTimerRunning ? onPauseTimer : () => onStartTimer?.(task.id)}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                  isTimerRunning
                    ? 'bg-[#9B6B61] text-white hover:bg-[#7C5047]'
                    : 'bg-[#7C8363] text-white hover:bg-[#5A5A40]'
                }`}>
                {isTimerRunning ? <><Pause className="w-4 h-4" /> توقف</> : <><Play className="w-4 h-4" /> ادامه</>}
              </button>
              <button onClick={onStopTimer}
                className="px-5 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer hover:bg-red-600">
                <Square className="w-4 h-4" /> پایان
              </button>
            </>
          ) : (
            <button onClick={() => onStartTimer?.(task.id)}
              className="px-7 py-3 bg-[#7C8363] text-white text-sm font-bold rounded-xl flex items-center gap-2 cursor-pointer hover:bg-[#5A5A40] shadow-sm">
              <Play className="w-5 h-5 fill-white" /> شروع زمان‌سنج
            </button>
          )}
        </div>
      </div>

      {/* Tracked vs Estimated */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-black text-[#8D7F72]">
          <span>صرف‌شده / تخمینی</span>
          <span className={isOverBudget ? 'text-red-600' : 'text-[#7C8363]'}>{formatDuration(actual)} / {formatDuration(estimated)}</span>
        </div>
        {estimated > 0 ? (
          <div className="w-full h-4 bg-[#E6DFD3] rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : timePct >= 80 ? 'bg-[#9B6B61]' : 'bg-[#7C8363]'}`}
              style={{ width: `${Math.min(timePct, 100)}%` }}
            />
            {isOverBudget && (
              <span className="absolute left-2 top-0 h-full text-[9px] font-black text-red-700 leading-4">!</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#9D978B] text-center py-2">تخمین زمان تعیین نشده — از تب نمای کلی تنظیم کنید</div>
        )}
        <div className="flex justify-between text-[10px] text-[#9D978B]">
          <span>{timePct}% استفاده</span>
          {estimated > 0 && <span>{formatDuration(estimated - actual)} باقی‌مانده</span>}
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#7C8363]" />
            <span className="text-xs font-black text-[#8D7F72]">جلسات اخیر</span>
          </div>
          {sessions.length > 0 && <span className="text-[10px] text-[#9D978B]">{sessions.length} جلسه • {formatDuration(totalSessionMinutes)}</span>}
        </div>
        {loading ? (
          <div className="text-xs text-[#8D7F72] text-center py-4">در حال بارگذاری...</div>
        ) : sessions.length === 0 ? (
          <div className="text-xs text-[#9D978B] text-center py-5 bg-[#F9F6EE] rounded-xl">هنوز جلسه‌ای ثبت نشده</div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {sessions.map((s, idx) => (
              <div key={s.name || idx} className="flex items-center justify-between bg-[#F9F6EE] px-3.5 py-2.5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'completed' ? 'bg-emerald-500' : s.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-[#9B6B61]'}`} />
                  <span className="text-xs font-bold text-[#2D3025]">{formatDuration(s.duration_minutes)}</span>
                </div>
                <span className="text-[10px] text-[#8D7F72]">{formatTime(s.started_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Notes — combined edit + activity trail ──────────────────
function NotesTab({ task, onUpdateTask }: { task: Task; onUpdateTask: (t: Task) => void }) {
  const [showTrail, setShowTrail] = useState(true)

  const activityTrail = useMemo(() => {
    const entries: Array<{ label: string; value: string; icon: string }> = []
    const statusLabels: Record<string, string> = {
      inbox: 'صندوق ورودی', today: 'امروز', next: 'بعدی',
      in_progress: 'در حال انجام', done: 'انجام‌شده', on_hold: 'متوقف',
      someday: 'شاید', not_started: 'شروع‌نشده',
    }
    const pLabels: Record<string, string> = { low: 'پایین', medium: 'متوسط', high: 'فوری', urgent: 'بحرانی' }
    const iLabels: Record<string, string> = { normal: 'عادی', key: 'کلیدی', milestone: 'نقطه‌عطف' }

    if (task.status) entries.push({ label: 'وضعیت', value: statusLabels[task.status] || task.status, icon: '📋' })
    if (task.priority) entries.push({ label: 'اولویت', value: pLabels[task.priority] || task.priority, icon: '🚩' })
    if (task.importance && task.importance !== 'normal') entries.push({ label: 'اهمیت', value: iLabels[task.importance] || task.importance, icon: '⭐' })
    if (task.dueDate) entries.push({ label: 'سررسید', value: task.dueDate, icon: '⏰' })
    if (task.estimatedMinutes) entries.push({ label: 'تخمین', value: `${task.estimatedMinutes} دقیقه`, icon: '⏱' })
    if (task.actualMinutes) entries.push({ label: 'صرف‌شده', value: `${task.actualMinutes} دقیقه`, icon: '⏳' })
    if ((task.blockedBy || []).length > 0) entries.push({ label: 'پیش‌نیاز', value: `${task.blockedBy!.length} تسک`, icon: '🔗' })
    if (task.isDailyHighlight) entries.push({ label: 'برجسته', value: 'بله', icon: '📌' })
    if (task.createdAt) entries.push({ label: 'ایجاد', value: task.createdAt, icon: '🆕' })
    return entries
  }, [task])

  return (
    <div className="space-y-5">
      {/* Note editor */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5">
        <EntityNoteEditor
          entityId={task.id}
          entityType="task"
          title="یادداشت‌ها"
          initialBlocks={task.noteBlocks}
          onSave={(blocks) => onUpdateTask({ ...task, noteBlocks: blocks })}
        />
      </div>

      {/* Activity Trail */}
      <div className="bg-white rounded-2xl border border-[#E6DFD3] p-5 space-y-3">
        <button
          onClick={() => setShowTrail(!showTrail)}
          className="flex items-center gap-2 text-xs font-black text-[#8D7F72] hover:text-[#2D3025] cursor-pointer w-full"
        >
          <History className="w-4 h-4 text-[#7C8363]" />
          <span>ردپای فعالیت</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTrail ? 'rotate-180' : ''}`} />
          <span className="text-[10px] text-[#9D978B] mr-auto">{activityTrail.length} مورد</span>
        </button>
        <AnimatePresence>
          {showTrail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#F9F6EE] rounded-xl border border-[#E6DFD3]/60 divide-y divide-[#E6DFD3]/40">
                {activityTrail.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 px-3.5 py-2.5">
                    <span className="text-xs">{entry.icon}</span>
                    <span className="text-xs font-bold text-[#8D7F72]">{entry.label}:</span>
                    <span className="text-xs font-semibold text-[#2D3025] truncate">{entry.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
