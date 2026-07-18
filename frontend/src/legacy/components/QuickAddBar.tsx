/**
 * QuickAddBar — Fast task creation with optional inline fields.
 * Supports: title + Enter, expanded state for richer properties,
 * context-aware defaults, keyboard-first flow, repeated capture.
 */
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus, ChevronDown, ChevronUp, Calendar, Flag, Target, FolderKanban,
  Zap, Layers, X, Sparkles
} from 'lucide-react'
import type { ImportanceLevel } from './TaskV2Shared'
import { ImportanceSelector, IMPORTANCE_CONFIG } from './TaskV2Shared'

// ─── Status options ──────────────────────────────────────────
const STATUS_OPTIONS = [
  { id: 'inbox', label: 'صندوق ورودی' },
  { id: 'today', label: 'امروز' },
  { id: 'next', label: 'بعدی' },
  { id: 'not_started', label: 'شروع‌نشده' },
  { id: 'in_progress', label: 'در حال انجام' },
  { id: 'someday', label: 'شاید' },
] as const

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'پایین' },
  { id: 'medium', label: 'متوسط' },
  { id: 'high', label: 'بالا' },
  { id: 'urgent', label: 'فوری' },
] as const

interface QuickAddBarProps {
  /** Placeholder text for the input */
  placeholder?: string
  /** Context the add is happening in (for smart defaults) */
  context?: 'planner_today' | 'planner_inbox' | 'planner_next' | 'planner_scheduled' | 'area_board' | 'project_detail' | 'task_manager'
  /** Default project, area, goal from context */
  defaultProject?: string
  defaultArea?: string
  defaultGoal?: string
  /** Available projects/areas/goals for dropdowns */
  projects?: Array<{ id: string; title: string }>
  areas?: Array<{ id: string; title: string }>
  goals?: Array<{ id: string; title: string }>
  /** Called when the task is submitted */
  onSubmit: (data: {
    title: string
    status?: string
    priority?: string
    importance?: ImportanceLevel
    projectId?: string
    areaId?: string
    goalId?: string
    scheduledDate?: string
    dueDate?: string
  }) => void
  /** Whether a submit is in progress */
  loading?: boolean
  /** If true, show a compact version (for inline add under groups) */
  compact?: boolean
}

export default function QuickAddBar({
  placeholder = 'تسک جدید + Enter...',
  context,
  defaultProject,
  defaultArea,
  defaultGoal,
  projects = [],
  areas = [],
  goals = [],
  onSubmit,
  loading = false,
  compact = false,
}: QuickAddBarProps) {
  const [title, setTitle] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<string>(() => {
    if (context === 'planner_today' || context === 'project_detail') return 'today'
    if (context === 'planner_next') return 'next'
    if (context === 'planner_inbox') return 'inbox'
    return 'inbox'
  })
  const [priority, setPriority] = useState<string>('medium')
  const [importance, setImportance] = useState<ImportanceLevel>('normal')
  const [projectId, setProjectId] = useState<string>(defaultProject || '')
  const [areaId, setAreaId] = useState<string>(defaultArea || '')
  const [goalId, setGoalId] = useState<string>(defaultGoal || '')
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    if (context === 'planner_today') return new Date().toISOString().slice(0, 10)
    return ''
  })
  const [dueDate, setDueDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-expand on first mount if context suggests it
  useEffect(() => {
    if (context === 'planner_today' || context === 'project_detail') {
      // Keep collapsed but pre-fill
    }
  }, [context])

  const handleSubmit = () => {
    if (!title.trim() || loading) return
    onSubmit({
      title: title.trim(),
      status,
      priority,
      importance,
      projectId: projectId || undefined,
      areaId: areaId || undefined,
      goalId: goalId || undefined,
      scheduledDate: scheduledDate || undefined,
      dueDate: dueDate || undefined,
    })
    // Reset for repeated capture — keep expanded state, only clear title
    setTitle('')
    // Keep all other fields for rapid repeated capture
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      if (expanded) {
        setExpanded(false)
      } else {
        setTitle('')
      }
    }
    // Tab to expand
    if (e.key === 'Tab' && !expanded && title.trim()) {
      e.preventDefault()
      setExpanded(true)
    }
  }

  const resetAll = () => {
    setTitle('')
    setExpanded(false)
    setStatus('inbox')
    setPriority('medium')
    setImportance('normal')
    setProjectId(defaultProject || '')
    setAreaId(defaultArea || '')
    setGoalId(defaultGoal || '')
    setScheduledDate('')
    setDueDate('')
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F9F6EE] border border-dashed border-[#D6CFC3] rounded-xl text-right" dir="rtl">
        <Plus className="w-3.5 h-3.5 text-[#9D978B]" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-xs text-[#2D3025] placeholder:text-[#9D978B] focus:outline-none font-semibold"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl overflow-hidden shadow-xs" dir="rtl">
      {/* Main capture row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="w-6 h-6 rounded-full border-2 border-[#D6CFC3] flex items-center justify-center shrink-0">
          <Plus className="w-3.5 h-3.5 text-[#9D978B]" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-sm text-[#2D3025] placeholder:text-[#9D978B] focus:outline-none font-bold"
          autoFocus
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className={`p-1.5 rounded-lg transition-all ${expanded ? 'bg-[#7C8363] text-white' : 'text-[#9D978B] hover:text-[#7C8363] hover:bg-[#E8ECE0]/50'}`}
          title="فیلدهای بیشتر (Tab)"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
          className="px-4 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[11px] font-black rounded-xl disabled:opacity-40 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          {loading ? '...' : 'افزودن'}
        </button>
      </div>

      {/* Expanded fields — progressive disclosure */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-[#E6DFD3]/40 space-y-3">
              {/* Row 1: Status + Priority + Importance */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                    <Layers className="w-3 h-3" /> وضعیت
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025]"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                    <Flag className="w-3 h-3" /> اولویت
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025]"
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Importance */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                    <Zap className="w-3 h-3" /> اهمیت
                  </label>
                  <ImportanceSelector
                    value={importance}
                    onChange={setImportance}
                    compact
                  />
                </div>
              </div>

              {/* Row 2: Project + Area + Goal */}
              <div className="flex flex-wrap items-end gap-3">
                {projects.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                      <FolderKanban className="w-3 h-3" /> پروژه
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025] max-w-[160px]"
                    >
                      <option value="">— بدون پروژه —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {areas.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                      🎯 حوزه
                    </label>
                    <select
                      value={areaId}
                      onChange={(e) => setAreaId(e.target.value)}
                      className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025] max-w-[140px]"
                    >
                      <option value="">— بدون حوزه —</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                {goals.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                      <Target className="w-3 h-3" /> هدف
                    </label>
                    <select
                      value={goalId}
                      onChange={(e) => setGoalId(e.target.value)}
                      className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025] max-w-[140px]"
                    >
                      <option value="">— بدون هدف —</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 3: Dates */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> تاریخ برنامه
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[#8D7F72] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> سررسید
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="px-2.5 py-1.5 text-[11px] border border-[#D6CFC3] rounded-lg bg-white focus:outline-none focus:border-[#7C8363] font-semibold text-[#2D3025]"
                  />
                </div>
                <button
                  onClick={resetAll}
                  className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] hover:text-[#2D3025] border border-[#E6DFD3] rounded-lg transition-all"
                  title="پاک‌سازی همه فیلدها"
                >
                  پاک‌سازی
                </button>
              </div>

              {/* Hint */}
              <div className="flex items-center gap-1.5 text-[9px] text-[#9D978B]">
                <Sparkles className="w-3 h-3" />
                <span>Enter = افزودن سریع • Tab = گسترش • Esc = بستن</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
