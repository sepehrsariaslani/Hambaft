/**
 * TaskDetailDrawer — Redesigned Notion-style side drawer.
 *
 * Design: Same philosophy as TaskDetailPage:
 * - Hero title with status dot
 * - Breadcrumb context
 * - Property pills (inline, floating pickers)
 * - Notes as primary content
 * - Sub-tabs: مراحل | زمان‌سنج
 * - Dark mode support
 * - No card borders — clean, breathable
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X, CheckCircle, Circle, Edit2, Trash2, Calendar, Clock, Flag, Zap,
  FolderKanban, Target, Layers, AlertCircle, Play, Pause,
  Square, RotateCcw, Sparkles, Pin, Link2, ArrowUpRight,
  BookOpen, Timer, History, Plus, ChevronDown, Check, GripVertical,
  Maximize2, AlarmClock, Flame, Diamond, Home,
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

// ─── Shared config (same as TaskDetailPage) ──────────────────
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
// Reusable Floating Pickers
// ══════════════════════════════════════════════════════════════
function InlinePropertyPill({ label, children, dotColor, onClick, active }: {
  label: string; children: React.ReactNode; dotColor?: string; onClick?: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
        active ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10' : 'hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5'
      }`}
    >
      {dotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
      <span className="text-[#8D7F72] dark:text-[#9D978B]">{label}:</span>
      <span className="text-[#2D3025] dark:text-[#E8ECE0]">{children}</span>
      <ChevronDown className="w-2 h-2 text-[#8D7F72] dark:text-[#9D978B]" />
    </button>
  )
}

function FloatingStatusPicker({ value, completed, onChange }: { value: string; completed: boolean; onChange: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] overflow-hidden min-w-[150px]"
    >
      <div className="px-2.5 pt-2.5 pb-1.5"><span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">وضعیت</span></div>
      {STATUS_CONFIG.map(s => {
        const isActive = s.id === value || (s.id === 'done' && completed)
        return (
          <button key={s.id} onClick={() => onChange(s.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-all ${isActive ? s.bg + ' ' + s.text : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
            <span>{s.label}</span>
            {isActive && <Check className="w-3 h-3 mr-auto" />}
          </button>
        )
      })}
    </motion.div>
  )
}

function FloatingPriorityPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] overflow-hidden min-w-[130px]"
    >
      <div className="px-2.5 pt-2.5 pb-1.5"><span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">اولویت</span></div>
      {Object.entries(PRIORITY_CONFIG).map(([id, p]) => (
        <button key={id} onClick={() => onChange(id)}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-all ${value === id ? p.color : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'}`}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.dot }} />
          <span>{p.label}</span>
          {value === id && <Check className="w-3 h-3 mr-auto" />}
        </button>
      ))}
    </motion.div>
  )
}

function FloatingImportancePicker({ value, onChange }: { value: string; onChange: (imp: ImportanceLevel) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] overflow-hidden min-w-[140px]"
    >
      <div className="px-2.5 pt-2.5 pb-1.5"><span className="text-[8px] font-black text-[#8D7F72] dark:text-[#9D978B] uppercase tracking-wider">اهمیت</span></div>
      {Object.entries(IMPORTANCE_CONFIG).map(([id, cfg]) => (
        <button key={id} onClick={() => onChange(id as ImportanceLevel)}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-bold cursor-pointer transition-all ${value === id ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 ' + cfg.color : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133] text-[#2D3025] dark:text-[#E8ECE0]'}`}>
          {cfg.icon}<span>{cfg.label}</span>
          {value === id && <Check className="w-3 h-3 mr-auto" />}
        </button>
      ))}
    </motion.div>
  )
}

function InlineDatePill({ label, icon, value, onChange }: {
  label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayValue = useMemo(() => {
    if (!value) return ''
    try { const d = new Date(value); return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' }) } catch { return value }
  }, [value])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5">
        {icon}
        <span className="text-[#8D7F72] dark:text-[#9D978B]">{label}:</span>
        <span className={value ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#D6CFC3] dark:text-[#3D4133]'}>{displayValue || '—'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }} className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-[#1B1D16] rounded-xl shadow-xl border border-[#E6DFD3]/80 dark:border-[#3D4133] p-3">
            <PersianDatePicker value={value} onChange={v => { onChange(v); if (!v) setOpen(false) }} placeholder={`${label}...`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Main Drawer
// ══════════════════════════════════════════════════════════════
type SubTab = 'steps' | 'time'

interface TaskDetailDrawerProps {
  task: Task
  allTasks?: Task[]
  goals?: any[]
  projects?: Array<{ id: string; title: string }>
  areas?: Array<{ id: string; title: string }>
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onClose: () => void
  onNavigate?: (tab: string, id?: string) => void
  onOpenFullPage?: (taskId: string) => void
  activeTimerTaskId?: string | null
  activeTimerSeconds?: number
  isTimerRunning?: boolean
  onStartTimer?: (taskId: string) => void
  onPauseTimer?: () => void
  onStopTimer?: () => void
  onResetTimer?: (taskId: string) => void
}

export default function TaskDetailDrawer({
  task, allTasks = [], goals = [], projects = [], areas = [],
  onUpdateTask, onDeleteTask, onClose, onNavigate, onOpenFullPage,
  activeTimerTaskId, activeTimerSeconds = 0, isTimerRunning = false,
  onStartTimer, onPauseTimer, onStopTimer, onResetTimer,
}: TaskDetailDrawerProps) {
  const [subTab, setSubTab] = useState<SubTab>('steps')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(task.title)
  const [newSubtaskText, setNewSubtaskText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [openPicker, setOpenPicker] = useState<'status' | 'priority' | 'importance' | null>(null)

  const statusRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const importanceRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTempTitle(task.title) }, [task.title])

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
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const linkedGoal = useMemo(() => goals.find(g => g.id === task.goalId), [goals, task.goalId])
  const linkedProject = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId])
  const linkedArea = useMemo(() => areas.find(a => a.id === task.areaId), [areas, task.areaId])

  const currentStatus = STATUS_CONFIG.find(o => o.id === task.status || (o.id === 'done' && task.completed))
  const currentPriority = task.priority ? PRIORITY_CONFIG[task.priority] : null
  const currentImportance = task.importance ? IMPORTANCE_CONFIG[task.importance] : null

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ label: string; onClick?: () => void; icon: React.ReactNode }> = []
    if (linkedArea) items.push({ label: linkedArea.title, onClick: onNavigate ? () => onNavigate('areas', linkedArea.id) : undefined, icon: <Home className="w-3 h-3" /> })
    if (linkedProject) items.push({ label: linkedProject.title, onClick: onNavigate ? () => onNavigate('projects', linkedProject.id) : undefined, icon: <FolderKanban className="w-3 h-3" /> })
    if (linkedGoal) items.push({ label: linkedGoal.title, onClick: onNavigate ? () => onNavigate('goals', linkedGoal.id) : undefined, icon: <Target className="w-3 h-3" /> })
    return items
  }, [linkedArea, linkedProject, linkedGoal, onNavigate])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#FDFBF7] dark:bg-[#121411] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* ── Top Bar ── */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0">
          <button onClick={onClose} className="p-1 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          {isActiveSession && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C8363] dark:bg-[#9ECE9A] animate-pulse" />
              <span className="text-[9px] font-black font-mono text-[#7C8363] dark:text-[#9ECE9A]">{formatSeconds(activeTimerSeconds)}</span>
            </div>
          )}
          <button onClick={() => onUpdateTask({ ...task, completed: !task.completed })}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer active:scale-90 transition-all shrink-0 ${
              task.completed ? 'bg-[#7C8363] dark:bg-[#9ECE9A] border-[#7C8363] dark:border-[#9ECE9A] text-white' : 'border-[#D6CFC3] dark:border-[#3D4133] hover:border-[#7C8363] dark:hover:border-[#9ECE9A]'
            }`}>
            {task.completed && <Check className="w-3 h-3" />}
          </button>
          {onOpenFullPage && (
            <button onClick={() => onOpenFullPage(task.id)} className="p-1 text-[#8D7F72] dark:text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer transition-colors" title="مشاهده کامل">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDeleteTask(task.id)} className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-lg cursor-pointer">حذف</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-0.5 text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">نه</button>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1 text-[#D6CFC3] dark:text-[#3D4133] hover:text-red-400 cursor-pointer transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>

        {/* ── Hero Title ── */}
        <div className="px-4 pb-2">
          <div className="flex items-start gap-2">
            <button onClick={() => setOpenPicker(openPicker === 'status' ? null : 'status')}
              className="mt-1.5 shrink-0 cursor-pointer active:scale-90 transition-transform" title="تغییر وضعیت">
              <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: currentStatus?.dot || '#9D978B' }} />
            </button>
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <input value={tempTitle} onChange={e => setTempTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTempTitle(task.title); setIsEditingTitle(false) } }}
                  onBlur={saveTitle}
                  className="w-full text-base font-black bg-transparent text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none" autoFocus />
              ) : (
                <h2 onClick={() => { setTempTitle(task.title); setIsEditingTitle(true) }}
                  className={`text-base font-black cursor-text leading-7 ${task.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>
                  {task.title}
                </h2>
              )}
            </div>
          </div>
          {breadcrumbItems.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 mr-[20px]">
              {breadcrumbItems.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronDown className="w-2 h-2 text-[#D6CFC3] dark:text-[#3D4133] -rotate-90" />}
                  <button onClick={item.onClick}
                    className={`flex items-center gap-1 text-[9px] font-bold cursor-pointer transition-colors ${item.onClick ? 'text-[#7C8363] dark:text-[#9ECE9A]' : 'text-[#8D7F72] dark:text-[#9D978B]'}`}>
                    {item.icon}<span className="truncate max-w-[100px]">{item.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* ── Properties — Vertical rows ── */}
        <div className="px-3 py-1 space-y-0 border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40">
          <div ref={statusRef} className="relative flex items-center">
            <InlinePropertyPill label="وضعیت" dotColor={currentStatus?.dot}
              onClick={() => setOpenPicker(openPicker === 'status' ? null : 'status')} active={openPicker === 'status'}>
              {currentStatus?.label || '—'}
            </InlinePropertyPill>
            <AnimatePresence>
              {openPicker === 'status' && <FloatingStatusPicker value={task.status || 'inbox'} completed={task.completed} onChange={id => { onUpdateTask({ ...task, status: id as any, completed: id === 'done' }); setOpenPicker(null) }} />}
            </AnimatePresence>
          </div>
          <div ref={priorityRef} className="relative flex items-center">
            <InlinePropertyPill label="اولویت" dotColor={currentPriority?.dot}
              onClick={() => setOpenPicker(openPicker === 'priority' ? null : 'priority')} active={openPicker === 'priority'}>
              {currentPriority?.label || '—'}
            </InlinePropertyPill>
            <AnimatePresence>
              {openPicker === 'priority' && <FloatingPriorityPicker value={task.priority || 'medium'} onChange={id => { onUpdateTask({ ...task, priority: id as any }); setOpenPicker(null) }} />}
            </AnimatePresence>
          </div>
          <div ref={importanceRef} className="relative flex items-center">
            <InlinePropertyPill label="اهمیت"
              onClick={() => setOpenPicker(openPicker === 'importance' ? null : 'importance')} active={openPicker === 'importance'}>
              {currentImportance?.label || 'عادی'}
            </InlinePropertyPill>
            <AnimatePresence>
              {openPicker === 'importance' && <FloatingImportancePicker value={task.importance || 'normal'} onChange={imp => { onUpdateTask({ ...task, importance: imp }); setOpenPicker(null) }} />}
            </AnimatePresence>
          </div>
          <div className="flex items-center">
            <InlineDatePill label="برنامه" icon={<Calendar className="w-2.5 h-2.5" />} value={task.scheduledDate || ''} onChange={v => onUpdateTask({ ...task, scheduledDate: v || undefined })} />
          </div>
          <div className="flex items-center">
            <InlineDatePill label="سررسید" icon={<AlarmClock className="w-2.5 h-2.5" />} value={task.dueDate || ''} onChange={v => onUpdateTask({ ...task, dueDate: v || undefined })} />
          </div>
          {(task.blockedBy || []).length > 0 && !task.completed && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold text-orange-600 dark:text-orange-400 rounded-lg bg-orange-50/60 dark:bg-orange-900/20">
              ⊘ {(task.blockedBy || []).length} مسدودکننده
            </div>
          )}
        </div>

        {/* ── Context Selectors (if not linked) ── */}
        {(!linkedArea || !linkedProject || !linkedGoal) && (
          <div className="px-3 py-1.5 flex items-center gap-2 flex-wrap">
            {!linkedArea && (
              <div className="flex items-center gap-1">
                <Home className="w-2.5 h-2.5 text-[#8D7F72] dark:text-[#9D978B]" />
                <select value={task.areaId || ''} onChange={e => onUpdateTask({ ...task, areaId: e.target.value || undefined })}
                  className="text-[9px] font-bold bg-transparent text-[#8D7F72] dark:text-[#9D978B] focus:outline-none cursor-pointer">
                  <option value="">حوزه —</option>{areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
            )}
            {!linkedProject && (
              <div className="flex items-center gap-1">
                <FolderKanban className="w-2.5 h-2.5 text-[#8D7F72] dark:text-[#9D978B]" />
                <select value={task.projectId || ''} onChange={e => onUpdateTask({ ...task, projectId: e.target.value || undefined })}
                  className="text-[9px] font-bold bg-transparent text-[#8D7F72] dark:text-[#9D978B] focus:outline-none cursor-pointer">
                  <option value="">پروژه —</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}
            {!linkedGoal && (
              <div className="flex items-center gap-1">
                <Target className="w-2.5 h-2.5 text-[#8D7F72] dark:text-[#9D978B]" />
                <select value={task.goalId || ''} onChange={e => onUpdateTask({ ...task, goalId: e.target.value || undefined })}
                  className="text-[9px] font-bold bg-transparent text-[#8D7F72] dark:text-[#9D978B] focus:outline-none cursor-pointer">
                  <option value="">هدف —</option>{goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ── Sub-tab bar ── */}
        <div className="px-3 flex items-center gap-0.5 border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 shrink-0">
          {[
            { id: 'steps' as SubTab, label: 'مراحل', icon: <Layers className="w-3 h-3" />, count: subTotal },
            { id: 'time' as SubTab, label: 'زمان‌سنج', icon: <Timer className="w-3 h-3" />, count: null },
          ].map(tab => (
            <button key={tab.id} onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2 text-[10px] font-black whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                subTab === tab.id ? 'border-[#7C8363] dark:border-[#9ECE9A] text-[#7C8363] dark:text-[#9ECE9A]' : 'border-transparent text-[#8D7F72] dark:text-[#9D978B]'
              }`}>
              {tab.icon}<span>{tab.label}</span>
              {tab.count != null && tab.count > 0 && (
                <span className={`text-[7px] font-bold px-1 py-0.5 rounded-full ${subTab === tab.id ? 'bg-[#7C8363]/15 dark:bg-[#9ECE9A]/15' : 'bg-[#E6DFD3]/40 dark:bg-[#3D4133]/40'}`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Notes — always visible (outside tab switching) ── */}
        <div className="px-4 pt-3">
          <EntityNoteEditor entityId={task.id} entityType="task" title="" initialBlocks={task.noteBlocks} onSave={(blocks) => onUpdateTask({ ...task, noteBlocks: blocks })} />
        </div>

        {/* ── Content (without notes) ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <AnimatePresence mode="wait">
            <motion.div key={subTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}>
              {subTab === 'steps' && (
                <StepsSection task={task} allTasks={allTasks} subtasks={subtasks} subDone={subDone} subTotal={subTotal} subPct={subPct}
                  newSubtaskText={newSubtaskText} setNewSubtaskText={setNewSubtaskText} addSubtask={addSubtask} toggleSubtask={toggleSubtask}
                  deleteSubtask={deleteSubtask} updateSubtaskTitle={updateSubtaskTitle} onUpdateTask={onUpdateTask} />
              )}
              {subTab === 'time' && (
                <TimeSection task={task} isActiveSession={isActiveSession} activeTimerSeconds={activeTimerSeconds} isTimerRunning={isTimerRunning}
                  onStartTimer={onStartTimer} onPauseTimer={onPauseTimer} onStopTimer={onStopTimer} onResetTimer={onResetTimer} formatSeconds={formatSeconds} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Steps Section (shared with Page)
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
    return incomplete ? incomplete.title : null
  }, [subtasks])

  return (
    <div className="space-y-3">
      {subTotal > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 shrink-0">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#E6DFD3] dark:text-[#3D4133]" />
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${subPct * 0.9738} 97.38`}
                className={subPct === 100 ? 'text-emerald-500' : 'text-[#7C8363] dark:text-[#9ECE9A]'} stroke="currentColor" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{subPct}%</span>
          </div>
          <div className="min-w-0">
            {nextStep && !task.completed ? (
              <div className="flex items-center gap-1"><span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">بعدی:</span><span className="text-[10px] font-bold text-[#2D3025] dark:text-[#E8ECE0] truncate">{nextStep}</span></div>
            ) : subPct === 100 ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓ انجام شد</span>
            ) : (
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">{subDone}/{subTotal}</span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {subtasks.map(st => (
          <div key={st.id} className={`group flex items-center gap-2 px-1.5 py-1.5 rounded-lg transition-all hover:bg-[#7C8363]/3 dark:hover:bg-[#9ECE9A]/3 ${st.completed ? 'opacity-60' : ''}`}>
            <button onClick={() => toggleSubtask(st.id)} className="shrink-0 cursor-pointer active:scale-90 transition-transform">
              {st.completed ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-[#D6CFC3] dark:text-[#3D4133] hover:text-[#7C8363] dark:hover:text-[#9ECE9A]" />}
            </button>
            {editingSubId === st.id ? (
              <input value={editingSubText} onChange={e => setEditingSubText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }; if (e.key === 'Escape') setEditingSubId(null) }}
                onBlur={() => { updateSubtaskTitle(st.id, editingSubText); setEditingSubId(null) }}
                className="flex-1 min-w-0 px-1 py-0.5 text-[11px] bg-transparent dark:text-[#E8ECE0] focus:outline-none font-semibold" autoFocus />
            ) : (
              <span onClick={() => { setEditingSubId(st.id); setEditingSubText(st.title) }}
                className={`flex-1 min-w-0 text-[11px] font-semibold cursor-text ${st.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>{st.title}</span>
            )}
            <button onClick={() => deleteSubtask(st.id)} className="p-0.5 text-transparent group-hover:text-[#D6CFC3] dark:group-hover:text-[#3D4133] hover:!text-red-400 rounded shrink-0 cursor-pointer transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
          </div>
        ))}
        <div className="flex items-center gap-2 px-1.5 py-1">
          <Circle className="w-3.5 h-3.5 text-[#E6DFD3] dark:text-[#3D4133]" />
          <input type="text" placeholder="مرحله جدید..." value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubtask()}
            className="flex-1 min-w-0 text-[11px] bg-transparent dark:text-[#E8ECE0] focus:outline-none font-semibold placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133]" />
          {newSubtaskText.trim() && (
            <button onClick={addSubtask} className="p-0.5 text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
          )}
        </div>
        {subtasks.length === 0 && !newSubtaskText && (
          <div className="flex items-center gap-2 px-1.5 py-2 text-[9px] text-[#8D7F72] dark:text-[#9D978B]">
            <Sparkles className="w-3 h-3 text-[#9B6B61]" /><span>کار بزرگ را به خرده‌کار تبدیل کنید</span>
          </div>
        )}
      </div>

      <div>
        <button onClick={() => setShowDeps(!showDeps)}
          className="flex items-center gap-1.5 text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] cursor-pointer transition-colors py-1">
          <Link2 className="w-3 h-3" /><span>پیش‌نیازها</span>
          {(task.blockedBy || []).length > 0 && <span className="text-[7px] font-bold text-orange-500 dark:text-orange-400 bg-orange-50/60 dark:bg-orange-900/20 px-1 py-0.5 rounded-full">{(task.blockedBy || []).length}</span>}
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showDeps ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showDeps && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <div className="pt-2 space-y-2">
                {blockedByTasks.length > 0 && !task.completed && (
                  <div className="bg-orange-50/40 dark:bg-orange-900/10 rounded-lg p-2 space-y-1">
                    {blockedByTasks.map(bt => (
                      <div key={bt.id} className="flex items-center gap-1.5 text-[9px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${bt.completed ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                        <span className={`font-semibold truncate ${bt.completed ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-orange-700 dark:text-orange-300'}`}>{bt.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                <input type="text" placeholder="جستجوی تسک..." value={depSearch} onChange={e => setDepSearch(e.target.value)}
                  className="w-full px-2 py-1 text-[9px] bg-transparent dark:text-[#E8ECE0] focus:outline-none font-semibold placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133] border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40" />
                <div className="space-y-0.5 max-h-24 overflow-y-auto">
                  {possibleDeps.map(dep => {
                    const isSelected = (task.blockedBy || []).includes(dep.id)
                    return (
                      <button key={dep.id} onClick={() => {
                        const deps = isSelected ? (task.blockedBy || []).filter(id => id !== dep.id) : [...(task.blockedBy || []), dep.id]
                        onUpdateTask({ ...task, blockedBy: deps })
                      }}
                        className={`w-full flex items-center justify-between p-1.5 rounded-md text-[9px] cursor-pointer transition-all ${isSelected ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 font-bold' : 'hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5'}`}>
                        <span className="truncate">{dep.title}</span>
                        <span className={`text-[7px] font-bold px-1 py-0.5 rounded shrink-0 ${isSelected ? 'bg-[#7C8363] dark:bg-[#9ECE9A] text-white' : dep.completed ? 'text-emerald-500' : 'text-rose-400'}`}>
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
// Time Section
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
    getTaskSessions(task.id, 10)
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
    const h = Math.floor(mins / 60); const m = mins % 60
    return m ? `${h}س ${m}د` : `${h} ساعت`
  }

  const formatDurationMinutes = (minutes: number) => {
    if (!minutes) return '—'
    if (minutes < 60) return `${minutes} دقیقه`
    const h = Math.floor(minutes / 60); const m = minutes % 60
    return m ? `${h}س ${m}د` : `${h} ساعت`
  }

  const formatTime = (iso: string) => {
    if (!iso) return '—'
    try { const d = new Date(iso); return d.toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
  }

  const totalSessionMinutes = sessions.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0)
  const timerProgress = isActiveSession ? Math.min((activeTimerSeconds % 3600) / 3600, 1) : 0
  const timerArcDash = timerProgress * 226.2

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-3">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" strokeWidth="3" className="stroke-[#E6DFD3] dark:stroke-[#3D4133]" />
            {isActiveSession && (
              <circle cx="40" cy="40" r="36" fill="none" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${timerArcDash} 226.2`} className="stroke-[#7C8363] dark:stroke-[#9ECE9A]"
                style={{ transition: 'stroke-dasharray 1s linear' }} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-black font-mono tracking-tight ${isActiveSession ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#8D7F72] dark:text-[#9D978B]'}`}>
              {isActiveSession ? formatSeconds(activeTimerSeconds) : '۰۰:۰۰'}
            </span>
            {isActiveSession && <span className="text-[7px] font-black uppercase tracking-wider text-[#7C8363] dark:text-[#9ECE9A]">{isTimerRunning ? 'در حال اجرا' : 'متوقف'}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActiveSession ? (
            <>
              <button onClick={isTimerRunning ? onPauseTimer : () => onStartTimer?.(task.id)}
                className={`p-2 rounded-full cursor-pointer transition-all active:scale-90 ${isTimerRunning ? 'bg-[#9B6B61]/15 text-[#9B6B61] dark:text-[#E26645]' : 'bg-[#7C8363]/15 dark:bg-[#9ECE9A]/15 text-[#7C8363] dark:text-[#9ECE9A]'}`}>
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button onClick={onStopTimer} className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer transition-all active:scale-90">
                <Square className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button onClick={() => onStartTimer?.(task.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[10px] font-bold cursor-pointer hover:opacity-90 active:scale-95 shadow-sm">
              <Play className="w-3 h-3 fill-current" /> شروع
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-0.5 py-2">
          <span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">صرف‌شده</span>
          <span className={`text-xs font-black ${isOverBudget ? 'text-red-500' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>{formatDuration(actualSeconds)}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2">
          <span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تخمینی</span>
          <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{formatDuration(estimatedSeconds)}</span>
        </div>
      </div>

      {estimatedSeconds > 0 && (
        <div>
          <div className="w-full h-1.5 bg-[#E6DFD3] dark:bg-[#3D4133] rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(timePct, 100)}%` }} transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : timePct >= 80 ? 'bg-[#9B6B61]' : 'bg-[#7C8363] dark:bg-[#9ECE9A]'}`} />
          </div>
          <div className="flex justify-between mt-1">
            <span className={`text-[8px] font-bold ${isOverBudget ? 'text-red-500' : 'text-[#7C8363] dark:text-[#9ECE9A]'}`}>{timePct}%</span>
            {!isOverBudget && <span className="text-[8px] text-[#9D978B]">{formatDuration(estimatedSeconds - actualSeconds)} باقی‌مانده</span>}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B]">جلسات</span>
          {sessions.length > 0 && <span className="text-[8px] text-[#9D978B]">{sessions.length} • {formatDurationMinutes(totalSessionMinutes)}</span>}
        </div>
        {loading ? (
          <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] text-center py-2">در حال بارگذاری...</div>
        ) : sessions.length === 0 ? (
          <div className="text-[9px] text-[#9D978B] text-center py-3">هنوز جلسه‌ای ثبت نشده</div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((s, idx) => (
              <div key={s.name || idx} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.status === 'completed' ? 'bg-emerald-500' : s.status === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-[#9B6B61]'}`} />
                  <span className="text-[9px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">{formatDurationMinutes(s.duration_minutes)}</span>
                </div>
                <span className="text-[8px] text-[#8D7F72] dark:text-[#9D978B]">{formatTime(s.started_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
