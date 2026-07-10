/**
 * TaskRowV2 — Improved task row with inline quick actions.
 * Supports: checkbox, quick priority, quick importance, quick status,
 * quick schedule, add subtask, view detail.
 * Uses progressive disclosure: hover/click reveals action chips.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CheckCircle2, Circle, Flag, Zap, Calendar, Clock, AlertCircle,
  FolderKanban, Target, Plus, ChevronDown, ChevronRight, Trash2,
  Sparkles, Pin, MoreHorizontal,
} from 'lucide-react'
import type { Task } from '../types'
import type { ImportanceLevel } from './TaskV2Shared'
import { ImportanceBadge, ImpactScoreBadge, BlockedTaskIndicator, TaskImpactBanner } from './TaskV2Shared'
import type { ViewConfig } from './ViewConfigStore'
import { DENSITY_CONFIG, isColumnVisible } from './ViewConfigStore'

// ─── Status quick-switch ─────────────────────────────────────
const STATUS_OPTIONS = [
  { id: 'inbox', label: 'ورودی', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'today', label: 'امروز', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'next', label: 'بعدی', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'in_progress', label: 'درحال', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'done', label: 'انجام‌شده', color: 'bg-green-50 text-green-700 border-green-200' },
  { id: 'on_hold', label: 'متوقف', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'someday', label: 'شاید', color: 'bg-gray-50 text-gray-500 border-gray-200' },
] as const

const PRIORITY_QUICK = [
  { id: 'low', label: 'پایین', color: 'bg-[#7C8363]/10 text-[#5a6b4a]' },
  { id: 'medium', label: 'متوسط', color: 'bg-[#d4a017]/10 text-[#b8860b]' },
  { id: 'high', label: 'بالا', color: 'bg-[#c44a3d]/10 text-[#c44a3d]' },
  { id: 'urgent', label: 'فوری', color: 'bg-red-100 text-red-800 font-black' },
] as const

const IMPORTANCE_QUICK: { id: ImportanceLevel; label: string; color: string }[] = [
  { id: 'normal', label: 'عادی', color: 'bg-gray-100 text-gray-600' },
  { id: 'key', label: 'کلیدی', color: 'bg-blue-100 text-blue-800' },
  { id: 'milestone', label: 'نقطه‌عطف', color: 'bg-amber-100 text-amber-800' },
]

interface TaskRowV2Props {
  task: Task & { sourceGoal?: string; sourceProject?: string }
  selected: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onDelete: () => void
  onView?: () => void
  onQuickAction: (taskId: string, field: string, value: any) => void
  onAddSubtask?: (parentId: string, title: string) => void
  todayDate: string
  viewConfig: ViewConfig
  dCfg: typeof DENSITY_CONFIG.comfortable
}

export default function TaskRowV2({
  task,
  selected,
  onToggleSelect,
  onToggle,
  onDelete,
  onView,
  onQuickAction,
  onAddSubtask,
  todayDate,
  viewConfig,
  dCfg,
}: TaskRowV2Props) {
  const [showActions, setShowActions] = useState(false)
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskText, setSubtaskText] = useState('')
  const [actionMode, setActionMode] = useState<'status' | 'priority' | 'importance' | null>(null)

  const isOverdue = !task.completed && task.dueDate && task.dueDate < todayDate
  const hasBlockers = (task.blockedBy || []).length > 0
  const isBlocked = hasBlockers && !task.completed
  const isMilestone = task.importance === 'milestone'
  const isKey = task.importance === 'key'
  const isHighImpact = (task.impactScore || 0) >= 60

  // Visual border accent based on task state
  const borderAccent = task.completed
    ? 'border-[#E6DFD3] bg-[#f9f7f2] opacity-60'
    : isOverdue
      ? 'border-[#c44a3d]/30 bg-[#c44a3d]/5'
      : isBlocked
        ? 'border-orange-200 bg-orange-50/30'
        : isMilestone
          ? 'border-amber-300/50 bg-amber-50/20'
          : isHighImpact
            ? 'border-[#7C8363]/30 bg-[#7C8363]/5'
            : 'border-[#E6DFD3] bg-white hover:border-[#7C8363]/40'

  const handleAddSubtask = () => {
    if (!subtaskText.trim() || !onAddSubtask) return
    onAddSubtask(task.id, subtaskText.trim())
    setSubtaskText('')
    setShowSubtaskInput(false)
  }

  return (
    <div
      className={`group rounded-xl border ${dCfg.rowPadding} transition-all ${borderAccent}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setActionMode(null) }}
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 rounded border-[#E6DFD3] text-[#7C8363] focus:ring-[#7C8363]/20 cursor-pointer mt-1 shrink-0"
        />

        {/* Done toggle */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 shrink-0 ${
            task.completed
              ? 'bg-[#7C8363] border-[#7C8363] text-white'
              : 'border-[#D6CFC3] hover:border-[#7C8363]'
          }`}
        >
          {task.completed && (
            <CheckCircle2 className="w-3 h-3" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              onClick={onView}
              className={`${dCfg.textSize} font-bold cursor-pointer ${
                task.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025] hover:text-[#7C8363]'
              }`}
            >
              {task.title}
            </span>

            {/* Visual indicators — always visible (no column toggle needed) */}
            {isMilestone && !task.completed && (
              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full border border-amber-200">◆ نقطه‌عطف</span>
            )}
            {isKey && !task.completed && (
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full border border-blue-200">★ کلیدی</span>
            )}
            {isHighImpact && !task.completed && (
              <ImpactScoreBadge score={task.impactScore} />
            )}
            {isOverdue && !task.completed && (
              <span className="text-[9px] font-bold bg-[#c44a3d]/15 text-[#c44a3d] px-1.5 py-0.5 rounded">تاریخ گذشته</span>
            )}
            {task.isDailyHighlight && (
              <span className="text-[9px] font-bold bg-[#d4a017]/15 text-[#b8860b] px-1.5 py-0.5 rounded">⭐ برجسته</span>
            )}
          </div>

          {/* Metadata badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isColumnVisible(viewConfig, 'status') && task.status && !task.completed && (
              <button
                onClick={() => setActionMode(actionMode === 'status' ? null : 'status')}
                className={`${dCfg.badgeSize} font-bold rounded border cursor-pointer transition-all hover:shadow-sm ${
                  STATUS_OPTIONS.find(s => s.id === task.status)?.color || 'bg-gray-50 text-gray-600 border-gray-200'
                }`}
              >
                {STATUS_OPTIONS.find(s => s.id === task.status)?.label || task.status}
              </button>
            )}
            {isColumnVisible(viewConfig, 'priority') && !task.completed && (
              <button
                onClick={() => setActionMode(actionMode === 'priority' ? null : 'priority')}
                className={`${dCfg.badgeSize} font-bold rounded border cursor-pointer transition-all hover:shadow-sm ${
                  PRIORITY_QUICK.find(p => p.id === task.priority)?.color || PRIORITY_QUICK[1].color
                }`}
              >
                {PRIORITY_QUICK.find(p => p.id === task.priority)?.label || 'متوسط'}
              </button>
            )}
            {isColumnVisible(viewConfig, 'importance') && !task.completed && task.importance && task.importance !== 'normal' && (
              <ImportanceBadge importance={task.importance} size="xs" />
            )}
            {isColumnVisible(viewConfig, 'dueDate') && task.dueDate && (
              <span className={`${dCfg.badgeSize} font-bold text-[#8D7F72] flex items-center gap-0.5`}>
                <Calendar className="w-2.5 h-2.5" /> {task.dueDate}
              </span>
            )}
            {isColumnVisible(viewConfig, 'project') && task.sourceProject && (
              <span className={`${dCfg.badgeSize} font-bold text-[#5a6b8a] flex items-center gap-0.5`}>
                <FolderKanban className="w-2.5 h-2.5" /> {task.sourceProject}
              </span>
            )}
            {isColumnVisible(viewConfig, 'goal') && task.sourceGoal && !task.sourceProject && (
              <span className={`${dCfg.badgeSize} font-bold text-[#6b5a8a] flex items-center gap-0.5`}>
                <Target className="w-2.5 h-2.5" /> {task.sourceGoal}
              </span>
            )}
            {isColumnVisible(viewConfig, 'estimatedMinutes') && task.estimatedMinutes && (
              <span className={`${dCfg.badgeSize} font-bold text-indigo-600 flex items-center gap-0.5`}>
                <Clock className="w-2.5 h-2.5" /> {task.estimatedMinutes} دقیقه
              </span>
            )}
          </div>

          {/* Quick action panel — shown on hover or click */}
          <AnimatePresence>
            {(showActions || actionMode) && !task.completed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.12 }}
                className="overflow-hidden"
              >
                {/* Status quick switch */}
                {actionMode === 'status' && (
                  <div className="flex flex-wrap gap-1 py-1.5">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { onQuickAction(task.id, 'status', s.id); setActionMode(null) }}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          task.status === s.id
                            ? `${s.color} ring-1 ring-[#7C8363]/30 shadow-sm`
                            : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Priority quick switch */}
                {actionMode === 'priority' && (
                  <div className="flex flex-wrap gap-1 py-1.5">
                    {PRIORITY_QUICK.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { onQuickAction(task.id, 'priority', p.id); setActionMode(null) }}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          task.priority === p.id
                            ? `${p.color} border-current ring-1 ring-[#7C8363]/30 shadow-sm`
                            : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Blocked indicator — always visible */}
          {isBlocked && (
            <BlockedTaskIndicator task={task} />
          )}
        </div>

        {/* Right-side actions — visible on hover */}
        <div className="flex flex-col gap-1 shrink-0">
          {showActions && !task.completed && (
            <>
              <button
                onClick={() => setShowSubtaskInput(!showSubtaskInput)}
                className="p-1 text-[#9D978B] hover:text-[#7C8363] hover:bg-[#E8ECE0]/50 rounded-lg transition-all"
                title="افزودن زیرتسک"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-[#D6CFC3] hover:text-[#c44a3d] hover:bg-[#c44a3d]/10 rounded-lg transition-all"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline subtask add */}
      <AnimatePresence>
        {showSubtaskInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mr-10 mt-2">
              <input
                type="text"
                value={subtaskText}
                onChange={(e) => setSubtaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                placeholder="زیرتسک جدید + Enter..."
                className="flex-1 min-w-0 px-3 py-1.5 text-[11px] bg-white border border-[#D6CFC3] rounded-lg focus:outline-none focus:border-[#7C8363] font-semibold"
                autoFocus
              />
              <button
                onClick={handleAddSubtask}
                disabled={!subtaskText.trim()}
                className="px-2 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-lg disabled:opacity-40"
              >
                افزودن
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
