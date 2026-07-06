import { useMemo, useState } from 'react'
import { CheckSquare, Square, Inbox, ArrowRight, Trash2, Flag } from 'lucide-react'
import type { Task } from '../types'

type InboxSectionProps = {
  tasks: Task[]
  todayDate: string
  onToggleTask: (id: string) => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onViewTaskDetails: (id: string) => void
}

function isTriageTask(task: Task): boolean {
  if (task.completed) return false
  if (!task.dueDate && !task.category && !task.projectId) return true
  if (!task.dueDate && !task.priority) return true
  return false
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export default function InboxSection({
  tasks,
  todayDate,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onViewTaskDetails,
}: InboxSectionProps) {
  const inboxTasks = useMemo(() => tasks.filter(isTriageTask), [tasks])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const bulkSetDue = (targetIso: string) => {
    for (const id of selected) {
      const task = tasks.find((t) => t.id === id)
      if (task) onUpdateTask({ ...task, dueDate: targetIso })
    }
    clearSelection()
  }

  const bulkSetPriority = (priority: Task['priority']) => {
    for (const id of selected) {
      const task = tasks.find((t) => t.id === id)
      if (task) onUpdateTask({ ...task, priority })
    }
    clearSelection()
  }

  const bulkComplete = () => {
    for (const id of selected) {
      onToggleTask(id)
    }
    clearSelection()
  }

  const bulkDelete = () => {
    if (!confirm(`حذف ${selected.size} کار از جعبه ورودی؟`)) return
    for (const id of selected) {
      onDeleteTask(id)
    }
    clearSelection()
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-[#E8ECE0] text-[#7C8363] flex items-center justify-center">
            <Inbox className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-[#2D3025]">جعبه ورودی (Inbox)</h2>
            <p className="text-[10px] text-[#8D7F72]">کارهایی که هنوز تاریخ، دسته یا پروژه‌ای ندارند. فیلتر و triage کنید.</p>
          </div>
        </div>
        <span className="text-[10px] text-[#8D7F72] font-mono">
          {inboxTasks.length} کار در انتظار triage
        </span>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E6DFD3] bg-[#FDFBF7] p-2 shadow-sm">
          <span className="text-[11px] font-bold text-[#2D3025] px-2">
            {selected.size} کار انتخاب شده
          </span>
          <button
            onClick={bulkComplete}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-[#7C8363] text-white hover:bg-[#5A5A40]"
          >
            تیک کردن همه
          </button>
          <button
            onClick={() => bulkSetDue(todayDate)}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-[#E8ECE0] text-[#2D3025] hover:bg-[#DDE2D5]"
          >
            <ArrowRight className="w-3 h-3 inline ml-1" /> موکول به امروز
          </button>
          <button
            onClick={() => bulkSetDue(addDaysISO(todayDate, 1))}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-[#E8ECE0] text-[#2D3025] hover:bg-[#DDE2D5]"
          >
            <ArrowRight className="w-3 h-3 inline ml-1" /> موکول به فردا
          </button>
          <button
            onClick={() => bulkSetPriority('high')}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200"
          >
            <Flag className="w-3 h-3 inline ml-1" /> اولویت بالا
          </button>
          <button
            onClick={bulkDelete}
            className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200"
          >
            <Trash2 className="w-3 h-3 inline ml-1" /> حذف همه
          </button>
          <button
            onClick={clearSelection}
            className="ms-auto text-[10px] text-[#8D7F72] hover:text-[#2D3025] px-2"
          >
            لغو انتخاب
          </button>
        </div>
      )}

      {inboxTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6DFD3] bg-[#FDFBF7] p-8 text-center">
          <Inbox className="w-8 h-8 mx-auto text-[#8D7F72] mb-2" />
          <p className="text-xs text-[#8D7F72]">جعبه ورودی خالی است. درود! یک GTD کامل.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {inboxTasks.map((task) => {
            const isSelected = selected.has(task.id)
            const missingHints: string[] = []
            if (!task.dueDate) missingHints.push('بدون تاریخ')
            if (!task.category) missingHints.push('بدون دسته')
            if (!task.projectId) missingHints.push('بدون پروژه')
            return (
              <li
                key={task.id}
                data-hambaft-task-id={task.id}
                tabIndex={0}
                className={`group rounded-2xl border p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-[#7C8363] bg-[#E8ECE0]/50'
                    : 'border-[#E6DFD3] bg-[#FDFBF7] hover:border-[#DDE2D5]'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelected(task.id)
                  }}
                  className="mt-0.5 shrink-0"
                  aria-label="انتخاب"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#7C8363]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#8D7F72]" />
                  )}
                </button>
                <div
                  className="flex-1 min-w-0"
                  onClick={() => onViewTaskDetails(task.id)}
                >
                  <div className="text-xs font-bold text-[#2D3025] truncate">{task.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {missingHints.map((hint) => (
                      <span
                        key={hint}
                        className="text-[9px] font-mono text-[#9B6B61] bg-[#F4E9E4]/60 border border-[#EDDDD7] rounded-md px-1.5 py-0.5"
                      >
                        {hint}
                      </span>
                    ))}
                    {task.priority && (
                      <span className="text-[9px] font-mono text-[#8D7F72] bg-[#F9F6EE] border border-[#E6DFD3] rounded-md px-1.5 py-0.5">
                        {task.priority === 'high' ? 'بالا' : task.priority === 'low' ? 'پایین' : 'متوسط'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onToggleTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-[#7C8363] hover:text-[#5A5A40] transition"
                >
                  تیک و خروج از Inbox
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
