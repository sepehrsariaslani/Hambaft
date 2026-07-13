/**
 * TaskDetailPage — Redesigned full-page task detail view.
 *
 * Design philosophy:
 * - Title is the hero — large, prominent, inline-editable
 * - Breadcrumb shows context (حوزه > پروژه > هدف)
 * - Properties as inline pills, not grid cards
 * - Notes ARE the page content (Notion-style)
 * - Tabs only for secondary: مراحل | زمان‌سنج
 * - No padding, no borders — clean, breathable
 * - Status dot before title for at-a-glance visibility
 * - Better dark mode with warm palette
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, CheckCircle, Circle, Edit2, Trash2, Calendar, Clock, Flag, Zap,
  FolderKanban, Target, Layers, AlertCircle, Play, Pause,
  Square, RotateCcw, Sparkles, Pin, Link2, ArrowUpRight,
  BookOpen, Timer, History, Plus, ChevronDown, Check, GripVertical,
  ChevronLeft, X, AlarmClock, Flame, Diamond, Milestone, Home,
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

// ─── Status config with dot colors ───────────────────────────
const STATUS_CONFIG = [
  { id: 'inbox', label: 'ورودی', dot: '#D4A017', bg: 'bg-[#F9F1D8]/60 dark:bg-[#2B201D]/60', text: 'text-[#5A5A40] dark:text-[#F9F1D8]' },
  { id: 'today', label: 'امروز', dot: '#10B981', bg: 'bg-emerald-50/60 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
  { id: 'next', label: 'بعدی', dot: '#3B82F6', bg: 'bg-blue-50/60 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
  { id: 'in_progress', label: 'درحال انجام', dot: '#6366F1', bg: 'bg-indigo-50/60 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300' },
  { id: 'on_hold', label: 'متوقف', dot: '#F97316', bg: 'bg-orange-50/60 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300' },
  { id: 'someday', label: 'شاید', dot: '#9D978B', bg: 'bg-[#F9F6EE]/60 dark:bg-[#3D4133]/40', text: 'text-[#8D7F72] dark:text-[#9D978B]' },
  { id: 'done', label: 'انجام‌شده', dot: '#22C55E', bg: 'bg-green-50/60 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
] as const

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; color: string }> = {
  low: { label: 'پایین', dot: '#10B981', color: 'bg-emerald-100/60 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  medium: { label: 'متوسط', dot: '#D4A017', color: 'bg-[#F9F1D8]/60 dark:bg-[#2B201D]/60 text-[#5A5A40] dark:text-[#F9F1D8]' },
  high: { label: 'فوری', dot: '#EF4444', color: 'bg-red-100/60 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  urgent: { label: 'بحرانی', dot: '#DC2626', color: 'bg-red-200/60 dark:bg-red-900/40 text-red-800 dark:text-red-200' },
}

const IMPORTANCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  normal: { label: 'عادی', icon: <Circle className="w-3 h-3" />, color: 'text-[#8D7F72] dark:text-[#9D978B]' },
  key: { label: 'کلیدی', icon: <Flame className="w-3 h-3" />, color: 'text-amber-600 dark:text-amber-400' },
  milestone: { label: 'نقطه‌عطف', icon: <Diamond className="w-3 h-3" />, color: 'text-violet-600 dark:text-violet-400' },
}

// ══════════════════════════════════════════════════════════════
// Metadata Panel Components — Linear/Notion style
// ══════════════════════════════════════════════════════════════

// Colored badge/chip for values
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold"
      style={{
        backgroundColor: color + '18',
        color: color,
        border: `1px solid ${color}25`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {children}
    </span>
  )
}

// Divider line between groups
function MetaDivider() {
  return <div className="mx-4 border-t border-[#E6DFD3]/50 dark:border-[#3D4133]/50" />
}

// Metadata row: icon + label (left) — value (right)
function MetaRow({ icon, label, children, onClick, active }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
  onClick?: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer ${
        active
          ? 'bg-[#7C8363]/5 dark:bg-[#9ECE9A]/5'
          : 'hover:bg-[#F9F6EE]/60 dark:hover:bg-[#3D4133]/30'
      }`}
    >
      <span className="flex items-center gap-2 text-[11px] text-[#8D7F72] dark:text-[#9D978B]">
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </span>
      <span className="shrink-0">{children}</span>
    </button>
  )
}

// Inline select for metadata values
function MetaSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }>
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-[11px] font-bold bg-transparent text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none cursor-pointer text-left appearance-none pr-1">
      <option value="">—</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  )
}

// Date row with inline Jalali picker — opens directly on click
function MetaDateRow({ icon, label, value, onChange }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayValue = useMemo(() => {
    if (!value) return null
    try { const d = new Date(value); return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' }) } catch { return value }
  }, [value])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer hover:bg-[#F9F6EE]/60 dark:hover:bg-[#3D4133]/30">
        <span className="flex items-center gap-2 text-[11px] text-[#8D7F72] dark:text-[#9D978B]">
          <span className="shrink-0">{icon}</span>
          <span>{label}</span>
        </span>
        <span className={`text-[11px] font-bold ${value ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#D6CFC3] dark:text-[#3D4133]'}`}>
          {displayValue || '—'}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 right-2 left-2 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] p-3">
            <PersianDatePicker value={value} onChange={v => { onChange(v); if (!v) setOpen(false) }} placeholder={`${label}...`} autoOpen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// InlinePropertyPill — (kept for Drawer)
// ══════════════════════════════════════════════════════════════
function InlinePropertyPill({ label, children, dotColor, onClick, active }: {
  label: string; children: React.ReactNode; dotColor?: string; onClick?: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
        active ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10' : 'hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5'
      }`}
    >
      {dotColor && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
      <span className="text-[#8D7F72] dark:text-[#9D978B]">{label}:</span>
      <span className="text-[#2D3025] dark:text-[#E8ECE0]">{children}</span>
      <ChevronDown className="w-2.5 h-2.5 text-[#8D7F72] dark:text-[#9D978B]" />
    </button>
  )
}

// ══════════════════════════════════════════════════════════════
// StatusPicker — Floating status selector
// ══════════════════════════════════════════════════════════════
function StatusPicker({ value, completed, onChange, anchorRef }: {
  value: string; completed: boolean; onChange: (id: string) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] overflow-hidden min-w-[160px]"
    >
      <div className="px-2.5 pt-2.5 pb-1.5">
        <span className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">وضعیت</span>
      </div>
      {STATUS_CONFIG.map(s => {
        const isActive = s.id === value || (s.id === 'done' && completed)
        return (
          <button
            key={s.id}
            onClick={() => { onChange(s.id) }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold cursor-pointer transition-all ${
              isActive ? s.bg + ' ' + s.text : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
            <span>{s.label}</span>
            {isActive && <Check className="w-3.5 h-3.5 mr-auto" />}
          </button>
        )
      })}
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════
// PriorityPicker — Floating priority selector
// ══════════════════════════════════════════════════════════════
function PriorityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] overflow-hidden min-w-[140px]"
    >
      <div className="px-2.5 pt-2.5 pb-1.5">
        <span className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">اولویت</span>
      </div>
      {Object.entries(PRIORITY_CONFIG).map(([id, p]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold cursor-pointer transition-all ${
            value === id ? `${p.color}` : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
          <span>{p.label}</span>
          {value === id && <Check className="w-3.5 h-3.5 mr-auto" />}
        </button>
      ))}
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════
// ImportancePicker — Floating importance selector
// ══════════════════════════════════════════════════════════════
function ImportancePicker({ value, onChange }: { value: string; onChange: (imp: ImportanceLevel) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] overflow-hidden min-w-[150px]"
    >
      <div className="px-2.5 pt-2.5 pb-1.5">
        <span className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">اهمیت</span>
      </div>
      {Object.entries(IMPORTANCE_CONFIG).map(([id, cfg]) => (
        <button
          key={id}
          onClick={() => onChange(id as ImportanceLevel)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold cursor-pointer transition-all ${
            value === id ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 ' + cfg.color : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'
          }`}
        >
          {cfg.icon}
          <span>{cfg.label}</span>
          {value === id && <Check className="w-3.5 h-3.5 mr-auto" />}
        </button>
      ))}
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════
// InlineDatePill — Compact date picker pill for properties strip
// ══════════════════════════════════════════════════════════════
function InlineDatePill({ label, icon, value, onChange }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void
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

  // Format as Jalali display
  const displayValue = useMemo(() => {
    if (!value) return ''
    try {
      const d = new Date(value)
      return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })
    } catch { return value }
  }, [value])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5"
      >
        {icon}
        <span className="text-[#8D7F72] dark:text-[#9D978B]">{label}:</span>
        <span className={value ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#D6CFC3] dark:text-[#3D4133]'}>
          {displayValue || '—'}
        </span>
        <ChevronDown className="w-2.5 h-2.5 text-[#8D7F72] dark:text-[#9D978B]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] p-3"
          >
            <PersianDatePicker
              value={value}
              onChange={v => { onChange(v); if (!v) setOpen(false) }}
              placeholder={`${label}...`}
              className="!w-44"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
interface TaskDetailPageProps {
  task: Task
  allTasks?: Task[]
  goals?: any[]
  projects?: Array<{ id: string; title: string; linkedGoalId?: string; areaId?: string }>
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

type SubTab = 'steps' | 'time'

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
  const [subTab, setSubTab] = useState<SubTab>('steps')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(task.title)
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Floating pickers
  const [openPicker, setOpenPicker] = useState<'status' | 'priority' | 'importance' | null>(null)
  const statusRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const importanceRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTempTitle(task.title) }, [task.title])

  // Close pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (statusRef.current && !statusRef.current.contains(target) &&
          priorityRef.current && !priorityRef.current.contains(target) &&
          importanceRef.current && !importanceRef.current.contains(target)) {
        setOpenPicker(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const currentStatus = STATUS_CONFIG.find(o => o.id === task.status || (o.id === 'done' && task.completed))
  const currentPriority = task.priority ? PRIORITY_CONFIG[task.priority] : null
  const currentImportance = task.importance ? IMPORTANCE_CONFIG[task.importance] : null

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; onClick?: () => void; icon: React.ReactNode }> = []
    if (linkedArea) items.push({ label: linkedArea.title, onClick: onNavigate ? () => onNavigate('areas', linkedArea.id) : undefined, icon: <Home className="w-3 h-3" /> })
    if (linkedProject) items.push({ label: linkedProject.title, onClick: onNavigate ? () => onNavigate('projects', linkedProject.id) : undefined, icon: <FolderKanban className="w-3 h-3" /> })
    if (linkedGoal) items.push({ label: linkedGoal.title, onClick: onNavigate ? () => onNavigate('goals', linkedGoal.id) : undefined, icon: <Target className="w-3 h-3" /> })
    return items
  }, [linkedArea, linkedProject, linkedGoal, onNavigate])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] dark:bg-[linear-gradient(180deg,#121411_0%,#1B1D16_100%)]" dir="rtl">
      {/* ═══ Top Bar — Minimal ═══ */}
      <div className="sticky top-0 z-30 bg-[#F9F6EE]/80 dark:bg-[#1B1D16]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center gap-3 px-4 py-2">
          <button onClick={onBack}
            className="p-1.5 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5 cursor-pointer transition-all active:scale-90">
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Quick timer indicator */}
          {isActiveSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C8363] dark:bg-[#9ECE9A] animate-pulse" />
              <span className="text-[10px] font-black font-mono text-[#7C8363] dark:text-[#9ECE9A]">
                {formatSeconds(activeTimerSeconds)}
              </span>
            </motion.div>
          )}

          {/* Complete toggle */}
          <button
            onClick={() => onUpdateTask({ ...task, completed: !task.completed })}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
              task.completed
                ? 'bg-[#7C8363] border-[#7C8363] dark:bg-[#9ECE9A] dark:border-[#9ECE9A] text-white'
                : 'border-[#D6CFC3] dark:border-[#3D4133] hover:border-[#7C8363] dark:hover:border-[#9ECE9A]'
            }`}
          >
            {task.completed && <Check className="w-3 h-3" />}
          </button>

          {/* Delete */}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDeleteTask(task.id)} className="px-2 py-1 bg-red-500 text-white text-[9px] font-bold rounded-lg cursor-pointer">حذف</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">نه</button>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1 text-[#D6CFC3] dark:text-[#3D4133] hover:text-red-400 rounded cursor-pointer transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ Hero: Title + Breadcrumb ═══ */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
        {/* Status dot + Title */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={() => setOpenPicker(openPicker === 'status' ? null : 'status')}
            className="mt-1.5 shrink-0 cursor-pointer active:scale-90 transition-transform"
            title="تغییر وضعیت"
          >
            <span className="w-3.5 h-3.5 rounded-full block transition-colors" style={{ backgroundColor: currentStatus?.dot || '#9D978B' }} />
          </button>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTempTitle(task.title); setIsEditingTitle(false) } }}
                onBlur={saveTitle}
                className="w-full text-lg font-black bg-transparent text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133]"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => { setTempTitle(task.title); setIsEditingTitle(true) }}
                className={`text-lg font-black cursor-text leading-8 ${
                  task.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]' : 'text-[#2D3025] dark:text-[#E8ECE0]'
                }`}
              >
                {task.title}
              </h1>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        {breadcrumbItems.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 mr-[22px]">
            {breadcrumbItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronLeft className="w-2.5 h-2.5 text-[#D6CFC3] dark:text-[#3D4133]" />}
                <button
                  onClick={item.onClick}
                  className={`flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
                    item.onClick ? 'text-[#7C8363] dark:text-[#9ECE9A] hover:text-[#5A5A40] dark:hover:text-[#E8ECE0]' : 'text-[#8D7F72] dark:text-[#9D978B]'
                  }`}
                >
                  {item.icon}
                  <span className="truncate max-w-[120px]">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Two-column: Metadata (right/راست) + Content (left/چپ) ═══ */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── ستون راست: پنل متادیتا (در RTL اول می‌آید) ── */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white dark:bg-[#1B1D16] rounded-xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden">

              {/* ── Status ── */}
              <div ref={statusRef} className="relative">
                <MetaRow icon={<Circle className="w-3.5 h-3.5" />} label="وضعیت"
                  onClick={() => setOpenPicker(openPicker === 'status' ? null : 'status')}
                  active={openPicker === 'status'}>
                  <Badge color={currentStatus?.dot || '#9D978B'}>{currentStatus?.label || '—'}</Badge>
                </MetaRow>
                <AnimatePresence>
                  {openPicker === 'status' && (
                    <StatusPicker value={task.status || 'inbox'} completed={task.completed}
                      onChange={id => { onUpdateTask({ ...task, status: id as any, completed: id === 'done' }); setOpenPicker(null) }}
                      anchorRef={statusRef} />
                  )}
                </AnimatePresence>
              </div>

              {/* ── Priority ── */}
              <div ref={priorityRef} className="relative">
                <MetaRow icon={<Flag className="w-3.5 h-3.5" />} label="اولویت"
                  onClick={() => setOpenPicker(openPicker === 'priority' ? null : 'priority')}
                  active={openPicker === 'priority'}>
                  <Badge color={currentPriority?.dot || '#9D978B'}>{currentPriority?.label || '—'}</Badge>
                </MetaRow>
                <AnimatePresence>
                  {openPicker === 'priority' && (
                    <PriorityPicker value={task.priority || 'medium'}
                      onChange={id => { onUpdateTask({ ...task, priority: id as any }); setOpenPicker(null) }} />
                  )}
                </AnimatePresence>
              </div>

              {/* ── Importance ── */}
              <div ref={importanceRef} className="relative">
                <MetaRow icon={<Zap className="w-3.5 h-3.5" />} label="اهمیت"
                  onClick={() => setOpenPicker(openPicker === 'importance' ? null : 'importance')}
                  active={openPicker === 'importance'}>
                  <Badge color={task.importance === 'key' ? '#D4A017' : task.importance === 'milestone' ? '#8B5CF6' : '#9D978B'}>
                    {currentImportance?.label || 'عادی'}
                  </Badge>
                </MetaRow>
                <AnimatePresence>
                  {openPicker === 'importance' && (
                    <ImportancePicker value={task.importance || 'normal'}
                      onChange={imp => { onUpdateTask({ ...task, importance: imp }); setOpenPicker(null) }} />
                  )}
                </AnimatePresence>
              </div>

              <MetaDivider />

              {/* ── Scheduled Date ── */}
              <MetaDateRow icon={<Calendar className="w-3.5 h-3.5" />} label="برنامه"
                value={task.scheduledDate || ''} onChange={v => onUpdateTask({ ...task, scheduledDate: v || undefined })} />

              {/* ── Due Date ── */}
              <MetaDateRow icon={<AlarmClock className="w-3.5 h-3.5" />} label="سررسید"
                value={task.dueDate || ''} onChange={v => onUpdateTask({ ...task, dueDate: v || undefined })} />

              {/* ── Estimate ── */}
              <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="تخمین">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">
                  <input type="number" min={0}
                    value={task.estimatedMinutes || ''}
                    onChange={e => onUpdateTask({ ...task, estimatedMinutes: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-8 px-0.5 py-0 text-[11px] bg-transparent text-center font-bold focus:outline-none border-b border-transparent focus:border-[#7C8363] dark:focus:border-[#9ECE9A]"
                    placeholder="—" />
                  <span className="text-[#8D7F72] dark:text-[#9D978B] text-[9px]">دقیقه</span>
                </span>
              </MetaRow>

              <MetaDivider />

              {/* ── Area ── */}
              <MetaRow icon={<Home className="w-3.5 h-3.5" />} label="حوزه">
                {linkedArea ? (
                  <span className="text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">{linkedArea.title}</span>
                ) : (
                  <MetaSelect value={task.areaId || ''} onChange={v => onUpdateTask({ ...task, areaId: v || undefined })}
                    options={areas.map(a => ({ id: a.id, label: a.title }))} />
                )}
              </MetaRow>

              {/* ── Project ── */}
              <MetaRow icon={<FolderKanban className="w-3.5 h-3.5" />} label="پروژه">
                {linkedProject ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">{linkedProject.title}</span>
                    {onNavigate && <button onClick={() => onNavigate('projects', linkedProject.id)} className="text-[#7C8363] dark:text-[#9ECE9A] hover:text-[#5A5A40] dark:hover:text-[#E8ECE0] cursor-pointer"><ArrowUpRight className="w-3 h-3" /></button>}
                  </span>
                ) : (
                  <MetaSelect value={task.projectId || ''} onChange={v => {
                    const proj = v ? projects.find(p => p.id === v) : null
                    onUpdateTask({ ...task, projectId: v || undefined, goalId: proj?.linkedGoalId || task.goalId })
                  }} options={projects.map(p => ({ id: p.id, label: p.title }))} />
                )}
              </MetaRow>

              {/* ── Goal ── */}
              <MetaRow icon={<Target className="w-3.5 h-3.5" />} label="هدف">
                {linkedGoal ? (
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">{linkedGoal.title}</span>
                    {onNavigate && <button onClick={() => onNavigate('goals', linkedGoal.id)} className="text-[#7C8363] dark:text-[#9ECE9A] hover:text-[#5A5A40] dark:hover:text-[#E8ECE0] cursor-pointer"><ArrowUpRight className="w-3 h-3" /></button>}
                  </span>
                ) : (
                  <MetaSelect value={task.goalId || ''} onChange={v => onUpdateTask({ ...task, goalId: v || undefined })}
                    options={goals.map(g => ({ id: g.id, label: g.title }))} />
                )}
              </MetaRow>

              {/* ── Blocked ── */}
              {(task.blockedBy || []).length > 0 && !task.completed && (
                <>
                  <MetaDivider />
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[11px] text-[#8D7F72] dark:text-[#9D978B]">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-400" /> مسدود
                    </span>
                    <Badge color="#F97316">{(task.blockedBy || []).length} مسدودکننده</Badge>
                  </div>
                </>
              )}

              {/* ── Highlight ── */}
              {task.isDailyHighlight && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[11px] text-[#8D7F72] dark:text-[#9D978B]">
                    <Pin className="w-3.5 h-3.5 text-[#D4A017]" /> برجسته
                  </span>
                  <Badge color="#D4A017">بله</Badge>
                </div>
              )}
            </div>
          </div>

          {/* ── ستون چپ: یادداشت + تب‌ها (در RTL دوم می‌آید) ── */}
          <div className="flex-1 min-w-0">
            {/* Notes — minimal, borderless */}
            <EntityNoteEditor
              entityId={task.id} entityType="task" title=""
              initialBlocks={task.noteBlocks}
              onSave={(blocks) => onUpdateTask({ ...task, noteBlocks: blocks })}
              minimal
            />

            {/* Sub-tab bar */}
            <div className="flex items-center gap-1 border-b border-[#E6DFD3]/60 dark:border-[#3D4133]/60 mt-4">
              {[
                { id: 'steps' as SubTab, label: 'مراحل', icon: <Layers className="w-3 h-3" />, count: subTotal },
                { id: 'time' as SubTab, label: 'زمان‌سنج', icon: <Timer className="w-3 h-3" />, count: null },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-black whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                    subTab === tab.id
                      ? 'border-[#7C8363] dark:border-[#9ECE9A] text-[#7C8363] dark:text-[#9ECE9A]'
                      : 'border-transparent text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count != null && tab.count > 0 && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                      subTab === tab.id ? 'bg-[#7C8363]/15 dark:bg-[#9ECE9A]/15' : 'bg-[#E6DFD3]/40 dark:bg-[#3D4133]/40'
                    }`}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Sub-tab content */}
            <div className="py-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={subTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }}
                >
                  {subTab === 'steps' && (
                    <StepsSection
                      task={task} allTasks={allTasks}
                      subtasks={subtasks} subDone={subDone} subTotal={subTotal} subPct={subPct}
                      newSubtaskText={newSubtaskText} setNewSubtaskText={setNewSubtaskText}
                      addSubtask={addSubtask} toggleSubtask={toggleSubtask}
                      deleteSubtask={deleteSubtask} updateSubtaskTitle={updateSubtaskTitle}
                      onUpdateTask={onUpdateTask}
                    />
                  )}
                  {subTab === 'time' && (
                    <TimeSection
                      task={task} isActiveSession={isActiveSession}
                      activeTimerSeconds={activeTimerSeconds} isTimerRunning={isTimerRunning}
                      onStartTimer={onStartTimer} onPauseTimer={onPauseTimer}
                      onStopTimer={onStopTimer} onResetTimer={onResetTimer}
                      formatSeconds={formatSeconds}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Steps Section — Subtasks + Dependencies
// ══════════════════════════════════════════════════════════════
function StepsSection({ task, allTasks, subtasks, subDone, subTotal, subPct, newSubtaskText, setNewSubtaskText, addSubtask, toggleSubtask, deleteSubtask, updateSubtaskTitle, onUpdateTask }: {
  task: Task; allTasks: Task[]; subtasks: SubTask[]; subDone: number; subTotal: number; subPct: number;
  newSubtaskText: string; setNewSubtaskText: (v: string) => void; addSubtask: () => void;
  toggleSubtask: (id: string) => void; deleteSubtask: (id: string) => void; updateSubtaskTitle: (id: string, title: string) => void;
  onUpdateTask: (t: Task) => void
}) {
  const [depSearch, setDepSearch] = useState('')
  const [showDeps, setShowDeps] = useState(false)
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubText, setEditingSubText] = useState('')

  const possibleDeps = useMemo(() => {
    const filtered = allTasks.filter(t => t.id !== task.id)
    if (!depSearch.trim()) return filtered.slice(0, 10)
    const q = depSearch.toLowerCase()
    return filtered.filter(t => t.title.toLowerCase().includes(q)).slice(0, 10)
  }, [allTasks, task.id, depSearch])

  const blockedByTasks = useMemo(() => {
    return (task.blockedBy || []).map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[]
  }, [task.blockedBy, allTasks])

  const nextStep = useMemo(() => {
    const incomplete = subtasks.find(st => !st.completed)
    if (incomplete) return incomplete.title
    return null
  }, [subtasks])

  return (
    <div className="space-y-4">
      {/* Progress ring + next step */}
      {subTotal > 0 && (
        <div className="flex items-center gap-3">
          {/* Mini progress ring */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="text-[#E6DFD3] dark:text-[#3D4133]" />
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${subPct * 0.9738} 97.38`}
                className={subPct === 100 ? 'text-emerald-500' : 'text-[#7C8363] dark:text-[#9ECE9A]'}
                stroke="currentColor" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-[#2D3025] dark:text-[#E8ECE0]">
              {subPct}%
            </span>
          </div>
          <div className="min-w-0">
            {nextStep && !task.completed ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">بعدی:</span>
                <span className="text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0] truncate">{nextStep}</span>
              </div>
            ) : subPct === 100 ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓ همه مراحل انجام شد</span>
            ) : (
              <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B]">{subDone} از {subTotal} مرحله</span>
            )}
          </div>
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-0.5">
        {subtasks.map(st => (
          <div key={st.id} className={`group flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg transition-all hover:bg-[#7C8363]/3 dark:hover:bg-[#9ECE9A]/3 ${
            st.completed ? 'opacity-60' : ''
          }`}>
            <button onClick={() => toggleSubtask(st.id)} className="shrink-0 cursor-pointer active:scale-90 transition-transform">
              {st.completed
                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                : <Circle className="w-4 h-4 text-[#D6CFC3] dark:text-[#3D4133] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] transition-colors" />
              }
            </button>
            {editingSubId === st.id ? (
              <input value={editingSubText} onChange={e => setEditingSubText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }; if (e.key === 'Escape') setEditingSubId(null) }}
                onBlur={() => { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }}
                className="flex-1 min-w-0 px-1 py-0.5 text-xs bg-transparent dark:text-[#E8ECE0] focus:outline-none font-semibold" autoFocus />
            ) : (
              <span
                onClick={() => { setEditingSubId(st.id); setEditingSubText(st.title) }}
                className={`flex-1 min-w-0 text-xs font-semibold cursor-text ${st.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}
              >{st.title}</span>
            )}
            <button onClick={() => deleteSubtask(st.id)}
              className="p-0.5 text-transparent group-hover:text-[#D6CFC3] dark:group-hover:text-[#3D4133] hover:!text-red-400 rounded shrink-0 cursor-pointer transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add subtask — inline */}
        <div className="flex items-center gap-2 px-1.5 py-1">
          <Circle className="w-4 h-4 text-[#E6DFD3] dark:text-[#3D4133]" />
          <input type="text" placeholder="مرحله جدید..." value={newSubtaskText}
            onChange={e => setNewSubtaskText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubtask()}
            className="flex-1 min-w-0 text-xs bg-transparent dark:text-[#E8ECE0] focus:outline-none font-semibold placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133]"
          />
          {newSubtaskText.trim() && (
            <button onClick={addSubtask} className="p-0.5 text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer hover:text-[#5A5A40] dark:hover:text-[#E8ECE0] transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {subtasks.length === 0 && !newSubtaskText && (
          <div className="flex items-center gap-2 px-1.5 py-3 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
            <Sparkles className="w-3 h-3 text-[#9B6B61]" />
            <span>کار بزرگ را به خرده‌کار تبدیل کنید</span>
          </div>
        )}
      </div>

      {/* Dependencies — collapsible */}
      <div>
        <button
          onClick={() => setShowDeps(!showDeps)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] cursor-pointer transition-colors py-1"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>پیش‌نیازها</span>
          {(task.blockedBy || []).length > 0 && (
            <span className="text-[8px] font-bold text-orange-500 dark:text-orange-400 bg-orange-50/60 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-full">{(task.blockedBy || []).length}</span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showDeps ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDeps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-2">
                {/* Blocked warning */}
                {blockedByTasks.length > 0 && !task.completed && (
                  <div className="bg-orange-50/40 dark:bg-orange-900/10 rounded-lg p-2.5 space-y-1.5">
                    {blockedByTasks.map(bt => (
                      <div key={bt.id} className="flex items-center gap-1.5 text-[9px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${bt.completed ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                        <span className={`font-semibold truncate ${bt.completed ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-orange-700 dark:text-orange-300'}`}>{bt.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search + toggle deps */}
                <input type="text" placeholder="جستجوی تسک..." value={depSearch}
                  onChange={e => setDepSearch(e.target.value)}
                  className="w-full px-2 py-1.5 text-[10px] bg-transparent dark:text-[#E8ECE0] focus:outline-none font-semibold placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133] border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40"
                />
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
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
                        className={`w-full flex items-center justify-between p-1.5 rounded-md text-[10px] cursor-pointer transition-all ${
                          isSelected ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 font-bold' : 'hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5'
                        }`}>
                        <span className="truncate">{dep.title}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${
                          isSelected ? 'bg-[#7C8363] dark:bg-[#9ECE9A] text-white' : dep.completed ? 'text-emerald-500' : 'text-rose-400'
                        }`}>
                          {isSelected ? '✓ حذف' : dep.completed ? '✓' : '⊘'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Time Section — Timer + Sessions
// ══════════════════════════════════════════════════════════════
function TimeSection({ task, isActiveSession, activeTimerSeconds, isTimerRunning, onStartTimer, onPauseTimer, onStopTimer, onResetTimer, formatSeconds }: {
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

  // Timer arc percentage
  const timerProgress = isActiveSession ? Math.min((activeTimerSeconds % 3600) / 3600, 1) : 0
  const timerArcDash = timerProgress * 226.2 // 2π * 36

  return (
    <div className="space-y-5">
      {/* Timer — Circular */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative w-28 h-28">
          {/* Background ring */}
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" strokeWidth="3"
              className="stroke-[#E6DFD3] dark:stroke-[#3D4133]" />
            {isActiveSession && (
              <circle cx="40" cy="40" r="36" fill="none" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${timerArcDash} 226.2`}
                className="stroke-[#7C8363] dark:stroke-[#9ECE9A]"
                style={{ transition: 'stroke-dasharray 1s linear' }} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black font-mono tracking-tight ${
              isActiveSession ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#8D7F72] dark:text-[#9D978B]'
            }`}>
              {isActiveSession ? formatSeconds(activeTimerSeconds) : '۰۰:۰۰'}
            </span>
            {isActiveSession && (
              <span className="text-[8px] font-black uppercase tracking-wider text-[#7C8363] dark:text-[#9ECE9A]">
                {isTimerRunning ? 'در حال اجرا' : 'متوقف'}
              </span>
            )}
          </div>
        </div>

        {/* Timer controls */}
        <div className="flex items-center gap-2">
          {isActiveSession ? (
            <>
              <button onClick={isTimerRunning ? onPauseTimer : () => onStartTimer?.(task.id)}
                className={`p-2.5 rounded-full cursor-pointer transition-all active:scale-90 ${
                  isTimerRunning ? 'bg-[#9B6B61]/15 text-[#9B6B61] dark:text-[#E26645] hover:bg-[#9B6B61]/25' : 'bg-[#7C8363]/15 dark:bg-[#9ECE9A]/15 text-[#7C8363] dark:text-[#9ECE9A] hover:bg-[#7C8363]/25'
                }`}>
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={onStopTimer}
                className="p-2.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer transition-all active:scale-90">
                <Square className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => onStartTimer?.(task.id)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[11px] font-bold cursor-pointer hover:opacity-90 transition-all active:scale-95 shadow-sm">
              <Play className="w-3.5 h-3.5 fill-current" />
              شروع زمان‌سنج
            </button>
          )}
        </div>
      </div>

      {/* Time stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center gap-0.5 py-3">
          <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">صرف‌شده</span>
          <span className={`text-sm font-black ${isOverBudget ? 'text-red-500' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>
            {formatDuration(actualSeconds)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-3">
          <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تخمینی</span>
          <span className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">
            {formatDuration(estimatedSeconds)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {estimatedSeconds > 0 && (
        <div>
          <div className="w-full h-1.5 bg-[#E6DFD3] dark:bg-[#3D4133] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(timePct, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : timePct >= 80 ? 'bg-[#9B6B61]' : 'bg-[#7C8363] dark:bg-[#9ECE9A]'}`}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-[9px] font-bold ${isOverBudget ? 'text-red-500' : 'text-[#7C8363] dark:text-[#9ECE9A]'}`}>{timePct}% استفاده</span>
            {!isOverBudget && (
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">{formatDuration(estimatedSeconds - actualSeconds)} باقی‌مانده</span>
            )}
          </div>
        </div>
      )}

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B]">جلسات</span>
          {sessions.length > 0 && (
            <span className="text-[9px] text-[#9D978B]">{sessions.length} جلسه • {formatDurationMinutes(totalSessionMinutes)}</span>
          )}
        </div>
        {loading ? (
          <div className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] text-center py-3">در حال بارگذاری...</div>
        ) : sessions.length === 0 ? (
          <div className="text-[10px] text-[#9D978B] text-center py-4">هنوز جلسه‌ای ثبت نشده</div>
        ) : (
          <div className="space-y-1">
            {sessions.map((s, idx) => (
              <div key={s.name || idx} className="flex items-center justify-between py-1.5 group">
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
