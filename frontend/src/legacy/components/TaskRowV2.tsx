/**
 * TaskRowV2 — Task row with accordion subtasks, + button, and quick actions.
 * Nested subtasks render recursively inside the accordion.
 * Hover actions use absolute positioning so row height doesn't change.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CheckCircle2, Circle, Flag, Calendar, Clock, AlertCircle,
  FolderKanban, Target, Plus, ChevronDown, ChevronRight, Trash2, PanelRightOpen,
  Sparkles,
} from 'lucide-react'
import type { Task } from '../types'
import type { ImportanceLevel } from './TaskV2Shared'
import { ImportanceBadge, ImpactScoreBadge, BlockedTaskIndicator } from './TaskV2Shared'
import type { ViewConfig } from './ViewConfigStore'
import { DENSITY_CONFIG, isColumnVisible } from './ViewConfigStore'
import { getTaskChildren, quickAddTask, mapBackendTaskRecord } from '../../app/hambaft-api'

// ─── Status quick-switch ─────────────────────────────────────
const STATUS_OPTIONS = [
  { id: 'inbox', label: 'ورودی', color: 'bg-[#F9F1D8] text-[#5A5A40] border-[#EBE3C8]', darkColor: 'dark:bg-[#2B201D]/80 dark:text-[#F9F1D8] dark:border-[#5A4A30]' },
  { id: 'today', label: 'امروز', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', darkColor: 'dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' },
  { id: 'next', label: 'بعدی', color: 'bg-blue-50 text-blue-700 border-blue-200', darkColor: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
  { id: 'in_progress', label: 'درحال', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', darkColor: 'dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700' },
  { id: 'done', label: 'انجام‌شده', color: 'bg-green-50 text-green-700 border-green-200', darkColor: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
  { id: 'on_hold', label: 'متوقف', color: 'bg-orange-50 text-orange-700 border-orange-200', darkColor: 'dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700' },
  { id: 'someday', label: 'شاید', color: 'bg-[#F9F6EE] text-[#8D7F72] border-[#D6CFC3]', darkColor: 'dark:bg-[#3D4133]/50 dark:text-[#9D978B] dark:border-[#3D4133]' },
] as const

const PRIORITY_QUICK = [
  { id: 'low', label: 'پایین', color: 'bg-[#7C8363]/10 text-[#5a6b4a]', darkColor: 'dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]' },
  { id: 'medium', label: 'متوسط', color: 'bg-[#d4a017]/10 text-[#b8860b]', darkColor: 'dark:bg-[#d4a017]/15 dark:text-[#d4a017]' },
  { id: 'high', label: 'بالا', color: 'bg-[#c44a3d]/10 text-[#c44a3d]', darkColor: 'dark:bg-[#c44a3d]/15 dark:text-[#E26645]' },
  { id: 'urgent', label: 'فوری', color: 'bg-red-100 text-red-800 font-black', darkColor: 'dark:bg-red-900/30 dark:text-red-300' },
] as const

interface TaskRowV2Props {
  task: Task & { sourceGoal?: string; sourceProject?: string }
  selected: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onDelete: () => void
  onView?: () => void
  onOpenDrawer?: () => void
  onQuickAction: (taskId: string, field: string, value: any) => void
  onAddSubtask?: (parentId: string, title: string) => void
  onToggleSubtask?: (subtask: Task) => void
  onDeleteSubtask?: (id: string) => void
  onViewSubtask?: (id: string) => void
  todayDate: string
  viewConfig: ViewConfig
  dCfg: typeof DENSITY_CONFIG.comfortable
  /** Nesting depth — 0 = top level, 1 = subtask, 2 = sub-subtask... */
  depth?: number
}

export default function TaskRowV2({
  task,
  selected,
  onToggleSelect,
  onToggle,
  onDelete,
  onView,
  onOpenDrawer,
  onQuickAction,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onViewSubtask,
  todayDate,
  viewConfig,
  dCfg,
  depth = 0,
}: TaskRowV2Props) {
  const [showActions, setShowActions] = useState(false)
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskText, setSubtaskText] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [actionMode, setActionMode] = useState<'status' | 'priority' | 'importance' | null>(null)

  // ─── Accordion: child tasks (real subtasks) ───
  const [expanded, setExpanded] = useState(false)
  const [childTasks, setChildTasks] = useState<Task[]>([])
  const [loadingChildren, setLoadingChildren] = useState(false)

  const fetchChildren = useCallback(async () => {
    if (!task.id) return
    setLoadingChildren(true)
    try {
      const resp = await getTaskChildren(task.id)
      const raw = resp?.data?.tasks || []
      setChildTasks(raw.map((item: any) => mapBackendTaskRecord(item)))
    } catch {
      setChildTasks([])
    } finally {
      setLoadingChildren(false)
    }
  }, [task.id])

  useEffect(() => {
    if (expanded && task.id) fetchChildren()
  }, [expanded, task.id, fetchChildren])

  const isOverdue = !task.completed && task.dueDate && task.dueDate < todayDate
  const hasBlockers = (task.blockedBy || []).length > 0
  const isBlocked = hasBlockers && !task.completed
  const isMilestone = task.importance === 'milestone'
  const isKey = task.importance === 'key'
  const isHighImpact = (task.impactScore || 0) >= 60
  const childDone = childTasks.filter(c => c.completed).length
  const childTotal = childTasks.length

  // Nesting indent — small per level
  const indentPx = depth * 12

  // Fallback for dCfg in case density is invalid
  const safeDCfg = dCfg || DENSITY_CONFIG.comfortable

  // Row background — proper dark mode
  const rowBg = task.completed
    ? 'bg-[#f9f7f2] dark:bg-[#1B1D16] border-[#E6DFD3] dark:border-[#3D4133] opacity-60'
    : isOverdue
      ? 'bg-[#c44a3d]/5 dark:bg-[#c44a3d]/10 border-[#c44a3d]/30 dark:border-[#c44a3d]/40'
      : isBlocked
        ? 'bg-orange-50/30 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/40'
        : isMilestone
          ? 'bg-[#F9F1D8]/20 dark:bg-[#2B201D]/30 border-[#EBE3C8]/50 dark:border-[#5A4A30]/40'
          : depth > 0
            ? 'bg-transparent border-transparent hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5'
            : 'bg-white dark:bg-[#1B1D16] border-[#E6DFD3] dark:border-[#3D4133] hover:border-[#7C8363]/40 dark:hover:border-[#9ECE9A]/30'

  const handleAddSubtask = async () => {
    if (!subtaskText.trim()) return
    setAddingSubtask(true)
    try {
      if (onAddSubtask) {
        onAddSubtask(task.id, subtaskText.trim())
      } else {
        const resp = await quickAddTask(subtaskText.trim(), {
          project: task.projectId,
          area: task.areaId,
          goal: task.goalId,
          context: 'task_manager',
        })
        const saved = resp?.data?.task
        if (saved?.name) {
          const { updateDoc } = await import('../../app/frappe')
          await updateDoc('Task', saved.name, { parent_task: task.id })
          if (expanded) await fetchChildren()
        }
      }
      setSubtaskText('')
      setShowSubtaskInput(false)
    } catch (e) {
      console.error('[hambaft] failed to add subtask in row', e)
    } finally {
      setAddingSubtask(false)
    }
  }

  // Get current status/priority display colors
  const statusOpt = STATUS_OPTIONS.find(s => s.id === task.status)
  const priorityOpt = PRIORITY_QUICK.find(p => p.id === task.priority)

  return (
    <div
      className={`rounded-xl border transition-colors ${safeDCfg.rowPadding} ${rowBg}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setActionMode(null) }}
      dir="rtl"
      style={{ marginRight: indentPx }}
    >
      <div className="flex items-center gap-2">
        {/* Selection checkbox — only at top level */}
        {depth === 0 && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="w-3.5 h-3.5 rounded border-[#E6DFD3] dark:border-[#3D4133] text-[#7C8363] dark:text-[#9ECE9A] focus:ring-[#7C8363]/20 cursor-pointer shrink-0"
          />
        )}

        {/* Done toggle */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            task.completed
              ? 'bg-[#7C8363] dark:bg-[#9ECE9A] border-[#7C8363] dark:border-[#9ECE9A] text-[#121411]'
              : 'border-[#D6CFC3] dark:border-[#3D4133] hover:border-[#7C8363] dark:hover:border-[#9ECE9A]'
          }`}
        >
          {task.completed && <CheckCircle2 className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            {/* Accordion toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 cursor-pointer p-0.5 rounded hover:bg-[#7C8363]/10 dark:hover:bg-[#9ECE9A]/10 transition-all"
              title={expanded ? 'بستن ساب‌تسک‌ها' : 'باز کردن ساب‌تسک‌ها'}
            >
              {expanded
                ? <ChevronDown className="w-3 h-3 text-[#8D7F72] dark:text-[#9D978B]" />
                : <ChevronRight className="w-3 h-3 text-[#D6CFC3] dark:text-[#3D4133] hover:text-[#7C8363] dark:hover:text-[#9ECE9A]" />
              }
            </button>

            <span
              onClick={onView}
              className={`${depth === 0 ? safeDCfg.textSize : 'text-xs'} font-bold cursor-pointer ${
                task.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025] dark:text-[#E8ECE0] hover:text-[#7C8363] dark:hover:text-[#9ECE9A]'
              }`}
            >
              {task.title}
            </span>

            {/* Subtask count badge */}
            {childTotal > 0 && (
              <span className="text-[8px] font-bold bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] px-1.5 py-0.5 rounded-full">
                {childDone}/{childTotal}
              </span>
            )}

            {/* Visual indicators */}
            {isMilestone && !task.completed && (
              <span className="text-[8px] font-bold bg-[#F9F1D8] dark:bg-[#2B201D] text-[#5A5A40] dark:text-[#F9F1D8] px-1.5 py-0.5 rounded-full border border-[#EBE3C8] dark:border-[#5A4A30]">◆ نقطه‌عطف</span>
            )}
            {isKey && !task.completed && (
              <span className="text-[8px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-700">★ کلیدی</span>
            )}
            {isHighImpact && !task.completed && (
              <ImpactScoreBadge score={task.impactScore} />
            )}
            {isOverdue && !task.completed && (
              <span className="text-[8px] font-bold bg-[#c44a3d]/15 dark:bg-[#c44a3d]/20 text-[#c44a3d] dark:text-[#E26645] px-1.5 py-0.5 rounded">تاریخ گذشته</span>
            )}
            {task.isDailyHighlight && (
              <span className="text-[8px] font-bold bg-[#d4a017]/15 dark:bg-[#d4a017]/20 text-[#b8860b] dark:text-[#d4a017] px-1.5 py-0.5 rounded">⭐</span>
            )}
          </div>
        </div>

        {/* Right-side actions — absolute, no height change */}
        <div className="relative shrink-0">
          <AnimatePresence>
            {showActions && !task.completed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-center gap-0.5"
              >
                {onOpenDrawer && (
                  <button
                    onClick={onOpenDrawer}
                    className="p-1 text-[#9D978B] hover:text-[#5a6b8a] dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all cursor-pointer"
                    title="باز کردن در پنل"
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setShowSubtaskInput(!showSubtaskInput); if (!expanded) setExpanded(true) }}
                  className="p-1 text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] hover:bg-[#E8ECE0]/50 dark:hover:bg-[#9ECE9A]/10 rounded-lg transition-all cursor-pointer"
                  title="افزودن ساب‌تسک"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1 text-[#D6CFC3] dark:text-[#3D4133] hover:text-[#c44a3d] dark:hover:text-[#E26645] hover:bg-[#c44a3d]/10 dark:hover:bg-[#c44a3d]/15 rounded-lg transition-all cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Blocked indicator */}
      {isBlocked && (
        <div className="mt-1 mr-7">
          <BlockedTaskIndicator task={task} />
        </div>
      )}

      {/* ── Accordion: Subtask list (recursive) ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-1 mr-5 space-y-0.5 border-r-2 border-[#E6DFD3] dark:border-[#3D4133] pr-2">
              {loadingChildren && (
                <div className="flex items-center gap-2 py-2 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
                  <div className="w-3 h-3 border-2 border-[#7C8363]/30 dark:border-[#9ECE9A]/30 border-t-[#7C8363] dark:border-t-[#9ECE9A] rounded-full animate-spin" />
                  <span>بارگذاری...</span>
                </div>
              )}
              {!loadingChildren && childTasks.map(child => (
                <TaskRowV2
                  key={child.id}
                  task={child}
                  selected={false}
                  onToggleSelect={() => {}}
                  onToggle={() => onToggleSubtask?.(child)}
                  onDelete={() => onDeleteSubtask?.(child.id)}
                  onView={() => onViewSubtask?.(child.id)}
                  onOpenDrawer={() => onViewSubtask?.(child.id)}
                  onQuickAction={onQuickAction}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  onViewSubtask={onViewSubtask}
                  todayDate={todayDate}
                  viewConfig={viewConfig}
                  dCfg={safeDCfg}
                  depth={depth + 1}
                />
              ))}

              {/* Inline subtask add */}
              {showSubtaskInput && (
                <div className="flex items-center gap-2 py-1.5">
                  <Circle className="w-3.5 h-3.5 text-[#E6DFD3] dark:text-[#3D4133] shrink-0" />
                  <input
                    type="text"
                    value={subtaskText}
                    onChange={(e) => setSubtaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="ساب‌تسک جدید + Enter..."
                    className="flex-1 min-w-0 text-[11px] bg-transparent text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none font-semibold placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133]"
                    autoFocus
                  />
                  {addingSubtask && (
                    <div className="w-3 h-3 border-2 border-[#7C8363]/30 dark:border-[#9ECE9A]/30 border-t-[#7C8363] dark:border-t-[#9ECE9A] rounded-full animate-spin" />
                  )}
                  {!addingSubtask && subtaskText.trim() && (
                    <button onClick={handleAddSubtask} className="text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {!loadingChildren && childTasks.length === 0 && !showSubtaskInput && (
                <div className="flex items-center gap-2 py-1.5 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
                  <Sparkles className="w-3 h-3 text-[#9B6B61]" />
                  <span>ساب‌تسکی ندارد</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
