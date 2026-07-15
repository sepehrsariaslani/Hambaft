import type { ReactNode } from 'react'
import { CalendarRange, Clock3, FolderKanban, Gauge, Layers3, Target } from 'lucide-react'

import type { Goal, GoalCategory, Project } from '../types'

interface ProjectMetaPanelProps {
  project: Project & { goalId: string; goalTitle: string; goalCategory: GoalCategory }
  goals: Goal[]
  onMoveProjectToGoal: (fromGoalId: string, projectId: string, toGoalId: string) => void
  onOpenGoal: (goalId: string) => void
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  waiting: 'در انتظار',
  in_progress: 'درحال انجام',
  paused: 'متوقف',
  completed: 'تکمیل‌شده',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
  urgent: 'فوری',
}

function formatSpentTime(project: Project) {
  const minutes = typeof project.actualMinutes === 'number'
    ? project.actualMinutes
    : typeof project.trackedMinutes === 'number'
      ? project.trackedMinutes
      : 0

  if (minutes <= 0) {
    return '—'
  }

  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours > 0) {
    return `${hours}س ${restMinutes}د`
  }
  return `${restMinutes} دقیقه`
}

function importanceLabel(project: Project) {
  if (project.contributionType === 'mandatory' || project.contributionType === 'اجباری') {
    return 'کلیدی'
  }
  if (project.contributionType === 'recommended' || project.contributionType === 'پیشنهادی') {
    return 'مهم'
  }
  return 'عادی'
}

interface MetaItemProps {
  label: string
  value: string
  icon: ReactNode
}

function MetaItem({ label, value, icon }: MetaItemProps) {
  return (
    <div className="rounded-2xl bg-[#F9F6EE] border border-[#E6DFD3] p-3 space-y-2">
      <div className="flex items-center gap-2 text-[11px] font-bold text-[#6F665A]">
        <span className="text-[#7C8363]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-sm font-black text-[#2D3025] leading-6">{value || '—'}</div>
    </div>
  )
}

export default function ProjectMetaPanel({
  project,
  goals,
  onMoveProjectToGoal,
  onOpenGoal,
}: ProjectMetaPanelProps) {
  return (
    <section className="bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/50 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">متادیتای پروژه</h3>
          <p className="text-[11px] text-[#8D7F72] dark:text-[#9D978B] mt-1">
            همان ساختار سریع و خوانا که در جزئیات تسک دوست داشتی، اینجا برای خود پروژه آمده است.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenGoal(project.goalId)}
          className="h-10 px-3 rounded-2xl bg-[#171717] text-white text-[11px] font-bold hover:bg-[#2A2A2A] transition-colors cursor-pointer"
        >
          رفتن به هدف
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <MetaItem label="وضعیت" value={PROJECT_STATUS_LABELS[project.status || 'waiting'] || 'در انتظار'} icon={<Gauge className="w-4 h-4" />} />
        <MetaItem label="اولویت" value={PRIORITY_LABELS[project.priority || 'medium'] || 'متوسط'} icon={<Layers3 className="w-4 h-4" />} />
        <MetaItem label="اهمیت" value={importanceLabel(project)} icon={<Target className="w-4 h-4" />} />
        <MetaItem label="برنامه" value={project.startDate || project.createdAt || '—'} icon={<CalendarRange className="w-4 h-4" />} />
        <MetaItem label="سررسید" value={project.targetDate || '—'} icon={<CalendarRange className="w-4 h-4" />} />
        <MetaItem label="تخمین" value={project.estimatedHours ? `${project.estimatedHours} ساعت` : '—'} icon={<Clock3 className="w-4 h-4" />} />
        <MetaItem label="زمان صرف‌شده" value={formatSpentTime(project)} icon={<Clock3 className="w-4 h-4" />} />
        <MetaItem label="حوزه" value={project.areaId || '—'} icon={<Layers3 className="w-4 h-4" />} />
        <MetaItem label="پروژه" value={project.title} icon={<FolderKanban className="w-4 h-4" />} />
        <MetaItem label="هدف" value={project.goalTitle} icon={<Target className="w-4 h-4" />} />
      </div>

      <label className="block space-y-2">
        <span className="text-[11px] font-bold text-[#6F665A]">تغییر هدف پروژه</span>
        <select
          aria-label="تغییر هدف پروژه"
          value={project.goalId}
          onChange={(event) => onMoveProjectToGoal(project.goalId, project.id, event.target.value)}
          className="w-full md:max-w-sm h-11 rounded-2xl border border-[#D9D0C3] bg-[#FDFBF7] dark:bg-[#121411] px-3 text-sm text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]"
        >
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
