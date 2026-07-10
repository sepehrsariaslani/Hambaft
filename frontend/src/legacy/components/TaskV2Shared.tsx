/**
 * Task Management V2 — Shared UI components for importance, impact, and blocked UX.
 * These are used across TaskManagerSection, PlannerSection, and task views.
 */
import type { Task } from '../types'

// ─── Importance Badge ──────────────────────────────────────────

export type ImportanceLevel = 'normal' | 'key' | 'milestone'

export const IMPORTANCE_CONFIG: Record<ImportanceLevel, { label: string; shortLabel: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  milestone: {
    label: 'نقطه‌عطف',
    shortLabel: 'نقطه‌عطف',
    color: 'text-amber-900',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    icon: '◆',
  },
  key: {
    label: 'کلیدی',
    shortLabel: 'کلیدی',
    color: 'text-blue-900',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: '★',
  },
  normal: {
    label: 'عادی',
    shortLabel: 'عادی',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: '○',
  },
}

export function ImportanceBadge({ importance, size = 'sm' }: { importance?: ImportanceLevel; size?: 'xs' | 'sm' | 'md' }) {
  const imp = importance || 'normal'
  const cfg = IMPORTANCE_CONFIG[imp]
  const sizeClass = size === 'xs' ? 'text-[10px] px-1 py-0.5' : size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-1.5 py-0.5'
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border font-medium ${cfg.bgColor} ${cfg.color} ${cfg.borderColor} ${sizeClass}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.shortLabel}</span>
    </span>
  )
}

// ─── Importance Selector (inline toggle) ───────────────────────

export function ImportanceSelector({
  value,
  onChange,
  compact = false,
}: {
  value?: ImportanceLevel
  onChange: (imp: ImportanceLevel) => void
  compact?: boolean
}) {
  const current = value || 'normal'
  const levels: ImportanceLevel[] = ['normal', 'key', 'milestone']
  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'rounded-lg border border-[#E6DFD3] p-1'}`}>
      {levels.map((lvl) => {
        const cfg = IMPORTANCE_CONFIG[lvl]
        const active = current === lvl
        return (
          <button
            key={lvl}
            onClick={() => onChange(lvl)}
            className={`inline-flex items-center gap-0.5 rounded-md transition-all ${
              active
                ? `${cfg.bgColor} ${cfg.color} border ${cfg.borderColor} font-semibold shadow-sm`
                : 'text-[#9D978B] hover:text-[#2d3025] border border-transparent hover:border-[#E6DFD3]'
            } ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'}`}
            title={cfg.label}
          >
            <span>{cfg.icon}</span>
            {!compact && <span>{cfg.shortLabel}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Impact Banner ─────────────────────────────────────────────

const healthStateLabels: Record<string, string> = {
  در_مسیر: 'در مسیر',
  در_خطر: 'در خطر',
  خارج_از_مسیر: 'خارج از مسیر',
  نیاز_به_بررسی: 'نیاز به بررسی',
}

const healthStateColors: Record<string, { bg: string; text: string; border: string }> = {
  در_مسیر: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  در_خطر: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  خارج_از_مسیر: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  نیاز_به_بررسی: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
}

const contributionTypeLabels: Record<string, string> = {
  اجباری: 'اجباری',
  پیشنهادی: 'پیشنهادی',
  پشتیبان: 'پشتیبان',
}

const contributionTypeColors: Record<string, string> = {
  اجباری: 'bg-red-100 text-red-800 border-red-200',
  پیشنهادی: 'bg-blue-100 text-blue-800 border-blue-200',
  پشتیبان: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function TaskImpactBanner({ task }: { task: Task }) {
  const hasGoal = task.impactGoalTitle
  const hasProject = task.impactProjectTitle
  if (!hasGoal && !hasProject) return null

  const goalHealth = task.impactGoalHealth
  const healthCfg = goalHealth ? healthStateColors[goalHealth] : null
  const contribType = task.impactProjectContributionType

  return (
    <div className="rounded-lg border border-[#E6DFD3] bg-[#FAFAF5] p-2.5 space-y-1.5 text-[11px]">
      {/* Project line */}
      {hasProject && (
        <div className="flex items-center gap-2">
          <span className="text-[#9D978B]">پروژه:</span>
          <span className="font-medium text-[#2d3025]">{task.impactProjectTitle}</span>
          {task.impactProjectProgress != null && (
            <span className="text-[#7C8363]">({Math.round(task.impactProjectProgress)}%)</span>
          )}
          {contribType && contributionTypeLabels[contribType] && (
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${contributionTypeColors[contribType] || ''}`}>
              {contributionTypeLabels[contribType]}
            </span>
          )}
        </div>
      )}
      {/* Goal line */}
      {hasGoal && (
        <div className="flex items-center gap-2">
          <span className="text-[#9D978B]">هدف:</span>
          <span className="font-medium text-[#2d3025]">{task.impactGoalTitle}</span>
          {task.impactGoalProgress != null && (
            <span className="text-[#7C8363]">({Math.round(task.impactGoalProgress)}%)</span>
          )}
          {goalHealth && healthCfg && (
            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${healthCfg.bg} ${healthCfg.text} ${healthCfg.border}`}>
              {healthStateLabels[goalHealth] || goalHealth}
            </span>
          )}
        </div>
      )}
      {/* Importance context */}
      {task.importance && task.importance !== 'normal' && (
        <div className="flex items-center gap-2">
          <span className="text-[#9D978B]">نقش در هدف:</span>
          <ImportanceBadge importance={task.importance} size="xs" />
          {task.importance === 'milestone' && (
            <span className="text-amber-700">— تکمیل این نقطه‌عطف تأثیر مستقیم روی پیشرفت هدف دارد</span>
          )}
          {task.importance === 'key' && (
            <span className="text-blue-700">— این تسک کلیدی است و در سیگنال کلیدی هدف حساب می‌شود</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Blocked Task Indicator ────────────────────────────────────

export function BlockedTaskIndicator({ task }: { task: Task }) {
  const blockedBy = task.blockedBy || []
  if (!blockedBy.length) return null

  const titles = task.blockedByTitles || blockedBy
  const statuses = task.blockedByStatuses || {}
  const allDone = blockedBy.every((id) => {
    const s = statuses[id]
    return s === 'done' || s === 'completed' || s === 'انجام‌شده' || s === 'انجام شده'
  })

  if (allDone) {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] text-emerald-800">
        <span>✓</span>
        <span>پیش‌نیازها تکمیل شده — آماده انجام</span>
      </div>
    )
  }

  const incompleteBlockers = blockedBy.filter((id) => {
    const s = statuses[id]
    return s !== 'done' && s !== 'completed' && s !== 'انجام‌شده' && s !== 'انجام شده'
  })

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-[11px] text-red-800">
      <span>⊘</span>
      <span>مسدود توسط {incompleteBlockers.length} تسک:</span>
      {titles.length > 0 && (
        <span className="font-medium truncate max-w-[150px]" title={titles.join('، ')}>
          {titles.slice(0, 2).join('، ')}{titles.length > 2 ? '...' : ''}
        </span>
      )}
    </div>
  )
}

// ─── Impact-Priority Sort Info ─────────────────────────────────

export function getImportanceSortValue(importance?: ImportanceLevel): number {
  if (importance === 'milestone') return 0
  if (importance === 'key') return 1
  return 2
}

export function sortTasksByImpact(a: Task, b: Task): number {
  // importance desc
  const ia = getImportanceSortValue(a.importance)
  const ib = getImportanceSortValue(b.importance)
  if (ia !== ib) return ia - ib
  // priority desc
  const pa = a.priority === 'urgent' ? 0 : a.priority === 'high' ? 1 : a.priority === 'medium' ? 2 : 3
  const pb = b.priority === 'urgent' ? 0 : b.priority === 'high' ? 1 : b.priority === 'medium' ? 2 : 3
  if (pa !== pb) return pa - pb
  // due date asc
  const da = a.dueDate || '9999-12-31'
  const db = b.dueDate || '9999-12-31'
  return da.localeCompare(db)
}
