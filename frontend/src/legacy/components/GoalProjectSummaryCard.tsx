import { ArrowUpLeft, Clock3, FolderKanban, Target, Trash2 } from 'lucide-react'

import type { Goal, Project } from '../types'

interface GoalProjectSummaryCardProps {
  goalId: string
  project: Project
  goals: Goal[]
  onSelectProject: (projectId: string) => void
  onMoveProjectToGoal: (fromGoalId: string, projectId: string, toGoalId: string) => void
  onDeleteProject: (goalId: string, projectId: string) => void
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
  if (typeof project.actualMinutes === 'number' && project.actualMinutes > 0) {
    const hours = Math.floor(project.actualMinutes / 60)
    const minutes = project.actualMinutes % 60
    if (hours > 0) {
      return `${hours}س ${minutes}د`
    }
    return `${minutes} دقیقه`
  }

  if (typeof project.trackedMinutes === 'number' && project.trackedMinutes > 0) {
    const hours = Math.floor(project.trackedMinutes / 60)
    const minutes = project.trackedMinutes % 60
    if (hours > 0) {
      return `${hours}س ${minutes}د`
    }
    return `${minutes} دقیقه`
  }

  return '—'
}

export default function GoalProjectSummaryCard({
  goalId,
  project,
  goals,
  onSelectProject,
  onMoveProjectToGoal,
  onDeleteProject,
}: GoalProjectSummaryCardProps) {
  const tasks = project.tasks || []
  const completedTasks = tasks.filter((task) => task.completed).length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const milestoneTotal = project.milestones?.length || 0
  const milestoneDone = (project.milestones || []).filter((milestone) => milestone.completed).length
  const currentGoalId = project.linkedGoalId || goalId
  const statusLabel = PROJECT_STATUS_LABELS[project.status || 'waiting'] || 'در انتظار'
  const priorityLabel = PRIORITY_LABELS[project.priority || 'medium'] || 'متوسط'

  return (
    <article className="bg-[#FDFBF7] p-4 rounded-[28px] border border-[#E6DFD3] shadow-xs space-y-4 text-right">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E26645]" />
            <h5 className="text-sm font-black text-[#2D3025] truncate">{project.title}</h5>
            <span className="px-2 py-1 rounded-full bg-[#F9F1D8] text-[#5A5A40] text-[10px] font-bold">
              {statusLabel}
            </span>
            <span className="px-2 py-1 rounded-full bg-[#E8ECE0] text-[#5A5A40] text-[10px] font-bold">
              اولویت {priorityLabel}
            </span>
          </div>

          <p className="text-[11px] leading-6 text-[#8D7F72]">
            {project.description || 'این پروژه هنوز توضیحی ندارد، اما ساختار و KPIهای آن آماده‌ی رشد هستند.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onDeleteProject(goalId, project.id)}
          className="w-10 h-10 rounded-2xl border border-[#F1D6D0] bg-white text-[#C46D5B] hover:bg-[#FFF3EF] transition-colors cursor-pointer"
          aria-label="حذف پروژه"
        >
          <Trash2 className="w-4 h-4 mx-auto" />
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#F9F6EE] border border-[#E6DFD3] p-3">
          <div className="text-[10px] text-[#8D7F72] font-bold">کارهای پروژه</div>
          <div className="mt-1 text-sm font-black text-[#2D3025]">{completedTasks}/{totalTasks}</div>
        </div>
        <div className="rounded-2xl bg-[#EFF4FB] border border-[#DCE7F6] p-3">
          <div className="text-[10px] text-[#6E7F99] font-bold">پیشرفت</div>
          <div className="mt-1 text-sm font-black text-[#2D3025]">{progress}%</div>
        </div>
        <div className="rounded-2xl bg-[#F7EDFB] border border-[#E7D7F2] p-3">
          <div className="text-[10px] text-[#8A7199] font-bold">نقطه‌عطف‌ها</div>
          <div className="mt-1 text-sm font-black text-[#2D3025]">{milestoneDone}/{milestoneTotal}</div>
        </div>
        <div className="rounded-2xl bg-[#FFF0E8] border border-[#F6D7C8] p-3">
          <div className="text-[10px] text-[#A76B4B] font-bold">زمان صرف‌شده</div>
          <div className="mt-1 text-sm font-black text-[#2D3025]">{formatSpentTime(project)}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#E6DFD3] p-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-[#6F665A] font-bold">
          <FolderKanban className="w-4 h-4 text-[#7C8363]" />
          <span>خلاصه‌ی پروژه داخل هدف</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-[#8D7F72]">
          <span className="px-2 py-1 rounded-full bg-[#F9F6EE] border border-[#E6DFD3]">تخمین {project.estimatedHours ? `${project.estimatedHours} ساعت` : '—'}</span>
          <span className="px-2 py-1 rounded-full bg-[#F9F6EE] border border-[#E6DFD3]">شروع {project.startDate || project.createdAt || '—'}</span>
          <span className="px-2 py-1 rounded-full bg-[#F9F6EE] border border-[#E6DFD3]">سررسید {project.targetDate || '—'}</span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3 xl:items-end xl:justify-between">
        <label className="flex-1 space-y-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#6F665A]">
            <Target className="w-4 h-4 text-[#7C8363]" />
            <span>انتقال پروژه به هدف</span>
          </span>
          <select
            aria-label="انتقال پروژه به هدف"
            value={currentGoalId}
            onChange={(event) => onMoveProjectToGoal(goalId, project.id, event.target.value)}
            className="w-full h-11 rounded-2xl border border-[#D9D0C3] bg-white px-3 text-sm text-[#2D3025] focus:outline-none focus:border-[#7C8363]"
          >
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 rounded-2xl bg-[#F9F6EE] border border-[#E6DFD3] text-[11px] font-bold text-[#6F665A]">
            <Clock3 className="w-4 h-4 text-[#7C8363]" />
            <span>جزئیات کامل داخل صفحه پروژه</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectProject(project.id)}
            className="h-11 px-4 rounded-2xl bg-[#171717] text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-[#2A2A2A] transition-colors cursor-pointer"
          >
            <ArrowUpLeft className="w-4 h-4" />
            <span>ورود به پروژه</span>
          </button>
        </div>
      </div>
    </article>
  )
}
