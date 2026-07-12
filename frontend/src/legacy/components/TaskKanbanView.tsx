import { useState, useCallback } from 'react'
import type { Task, Goal } from '../types'

interface TaskKanbanViewProps {
  tasks: Task[]
  goals: Goal[]
  onUpdateTask: (task: Task) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onViewTaskDetails?: (id: string) => void
  onOpenTaskDrawer?: (id: string) => void
  groupBy: 'status' | 'priority' | 'project'
}

const STATUS_COLUMNS: { value: Task['status']; label: string; color: string; border: string }[] = [
  { value: 'inbox', label: 'صندوق ورودی', color: 'bg-[#F9F6EE]', border: 'border-[#D6CFC3]' },
  { value: 'not_started', label: 'شروع نشده', color: 'bg-slate-50', border: 'border-slate-200' },
  { value: 'next', label: 'بعدی', color: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'today', label: 'امروز', color: 'bg-[#F9F1D8]', border: 'border-[#EBE3C8]' },
  { value: 'in_progress', label: 'در حال انجام', color: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'done', label: 'انجام شده', color: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'on_hold', label: 'متوقف', color: 'bg-purple-50', border: 'border-purple-200' },
  { value: 'someday', label: 'روزی', color: 'bg-teal-50', border: 'border-teal-200' },
  { value: 'dropped', label: 'کنار گذاشته', color: 'bg-red-50', border: 'border-red-200' },
]

const PRIORITY_COLUMNS: Record<string, { label: string; color: string; border: string }> = {
  high: { label: 'بالا', color: 'bg-red-50', border: 'border-red-200' },
  medium: { label: 'متوسط', color: 'bg-[#F9F1D8]', border: 'border-[#EBE3C8]' },
  low: { label: 'پایین', color: 'bg-emerald-50', border: 'border-emerald-200' },
}

const STATUS_BADGE: Record<string, string> = {
  inbox: 'bg-[#E6DFD3]/40 text-[#8D7F72]',
  not_started: 'bg-slate-100 text-slate-600',
  next: 'bg-blue-100 text-blue-600',
  today: 'bg-[#F9F1D8] text-[#9B6B61]',
  in_progress: 'bg-orange-100 text-orange-600',
  done: 'bg-emerald-100 text-emerald-600',
  on_hold: 'bg-purple-100 text-purple-600',
  someday: 'bg-teal-100 text-teal-600',
  dropped: 'bg-red-100 text-red-600',
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-[#F9F1D8] text-[#9B6B61]',
  low: 'bg-emerald-100 text-emerald-600',
}

export default function TaskKanbanView({
  tasks,
  goals,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onViewTaskDetails,
  onOpenTaskDrawer,
  groupBy,
}: TaskKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const getColumns = useCallback(() => {
    if (groupBy === 'status') {
      return STATUS_COLUMNS.map(c => ({ key: c.value, label: c.label, color: c.color, border: c.border }))
    }
    if (groupBy === 'priority') {
      return Object.entries(PRIORITY_COLUMNS).map(([key, col]) => ({ key, label: col.label, color: col.color, border: col.border }))
    }
    // project
    const cols = [{ key: 'none', label: 'بدون پروژه', color: 'bg-[#F9F6EE]', border: 'border-[#D6CFC3]' }]
    for (const goal of goals) {
      for (const project of (goal.projects || [])) {
        cols.push({ key: project.id, label: project.title, color: 'bg-[#e8ece0]', border: 'border-[#a8b898]' })
      }
    }
    return cols
  }, [goals, groupBy])

  const getTaskColumn = (task: Task) => {
    if (groupBy === 'status') return task.status || 'inbox'
    if (groupBy === 'priority') return task.priority || 'medium'
    return task.projectId || 'none'
  }

  const columns = getColumns()

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
    // Add a ghost image or styling
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    if (el) {
      el.style.opacity = '1'
    }
    setDraggingId(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    setDragOverColumn(columnKey)
  }

  const handleDrop = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (groupBy === 'status') {
      const newStatus = columnKey as Task['status']
      if (newStatus && newStatus !== task.status) {
        onUpdateTask({ ...task, status: newStatus, completed: newStatus === 'done' })
      }
    } else if (groupBy === 'priority') {
      const newPriority = columnKey as Task['priority']
      if (newPriority && newPriority !== task.priority) {
        onUpdateTask({ ...task, priority: newPriority })
      }
    } else if (groupBy === 'project') {
      const newProjectId = columnKey === 'none' ? undefined : columnKey
      if (newProjectId !== task.projectId) {
        onUpdateTask({ ...task, projectId: newProjectId })
      }
    }

    setDraggingId(null)
    setDragOverColumn(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]" dir="rtl">
      {columns.map(col => {
        const colTasks = tasks.filter(t => getTaskColumn(t) === col.key)
        const isOver = dragOverColumn === col.key

        return (
          <div
            key={col.key}
            className={`flex-shrink-0 w-72 rounded-2xl border-2 p-3 transition-all ${col.color} ${col.border} ${isOver ? 'ring-2 ring-[#7C8363] ring-offset-2 scale-[1.01]' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#2d3025]">{col.label}</h3>
              <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full">{colTasks.length}</span>
            </div>

            <div className="space-y-2 min-h-[100px]">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-xl border border-[#E6DFD3] p-3 cursor-move hover:shadow-md transition-all ${draggingId === task.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'}`}
                    >
                      {task.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        onClick={() => onViewTaskDetails?.(task.id)}
                        className={`text-sm font-bold cursor-pointer ${task.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025]'}`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {task.status && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUS_BADGE[task.status] || 'bg-[#E6DFD3]/40 text-[#8D7F72]'}`}>
                            {STATUS_COLUMNS.find(s => s.value === task.status)?.label || task.status}
                          </span>
                        )}
                        {task.priority && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PRIORITY_BADGE[task.priority] || 'bg-[#E6DFD3]/40 text-[#8D7F72]'}`}>
                            {task.priority === 'high' ? 'بالا' : task.priority === 'medium' ? 'متوسط' : 'پایین'}
                          </span>
                        )}
                      </div>
                      {task.dueDate && (
                        <p className="text-[10px] text-[#8D7F72] mt-1">📅 {task.dueDate}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {onOpenTaskDrawer && (
                        <button
                          onClick={() => onOpenTaskDrawer(task.id)}
                          className="text-[#5a6b8a] hover:bg-blue-50 rounded p-1"
                          title="باز کردن در پنل"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18"/><path d="M15 4v16"/><path d="M3 20h18"/><path d="M3 4v16"/></svg>
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-[#c44a3d] hover:bg-[#c44a3d]/10 rounded p-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="text-center py-6 text-xs text-[#9D978B] border-2 border-dashed border-[#E6DFD3]/60 rounded-xl">
                  تسکی نیست
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
