import { useState, useCallback } from 'react'
import type { Task, Goal } from '../types'

interface TaskKanbanViewProps {
  tasks: Task[]
  goals: Goal[]
  onUpdateTask: (task: Task) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onViewTaskDetails?: (id: string) => void
  groupBy: 'status' | 'priority' | 'project'
}

const statusColumns: Record<string, { label: string; color: string }> = {
  'انجام‌نشده': { label: 'انجام‌نشده', color: 'bg-[#f3ebdf] border-[#d4c4a8]' },
  'در حال انجام': { label: 'در حال انجام', color: 'bg-[#e8ece0] border-[#a8b898]' },
  'انجام‌شده': { label: 'انجام‌شده', color: 'bg-[#dde2d5] border-[#7C8363]' },
  'لغو‌شده': { label: 'لغو‌شده', color: 'bg-[#e6dfdf] border-[#c4a0a0]' },
}

const priorityColumns: Record<string, { label: string; color: string }> = {
  'فوری': { label: 'فوری', color: 'bg-[#c44a3d]/10 border-[#c44a3d]/30' },
  'بالا': { label: 'بالا', color: 'bg-[#d4a017]/10 border-[#d4a017]/30' },
  'متوسط': { label: 'متوسط', color: 'bg-[#7C8363]/10 border-[#7C8363]/30' },
  'پایین': { label: 'پایین', color: 'bg-[#9D978B]/10 border-[#9D978B]/30' },
}

export default function TaskKanbanView({
  tasks,
  goals,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onViewTaskDetails,
  groupBy,
}: TaskKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const getColumns = useCallback(() => {
    if (groupBy === 'status') return statusColumns
    if (groupBy === 'priority') return priorityColumns
    // project
    const cols: Record<string, { label: string; color: string }> = {
      'none': { label: 'بدون پروژه', color: 'bg-[#f3ebdf] border-[#d4c4a8]' },
    }
    for (const goal of goals) {
      for (const project of (goal.projects || [])) {
        cols[project.id] = { label: project.title, color: 'bg-[#e8ece0] border-[#a8b898]' }
      }
    }
    return cols
  }, [goals, groupBy])

  const getTaskColumn = (task: Task) => {
    if (groupBy === 'status') return task.status || 'انجام‌نشده'
    if (groupBy === 'priority') return task.priority === 'high' ? 'بالا' : task.priority === 'medium' ? 'متوسط' : task.priority === 'low' ? 'پایین' : 'متوسط'
    return task.projectId || 'none'
  }

  const columns = getColumns()

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
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
        onUpdateTask({ ...task, status: newStatus, completed: newStatus === 'انجام‌شده' })
      }
    } else if (groupBy === 'priority') {
      const map: Record<string, Task['priority']> = { 'فوری': 'high', 'بالا': 'high', 'متوسط': 'medium', 'پایین': 'low' }
      const newPriority = map[columnKey]
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
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {Object.entries(columns).map(([key, col]) => {
        const colTasks = tasks.filter(t => getTaskColumn(t) === key)
        const isOver = dragOverColumn === key

        return (
          <div
            key={key}
            className={`flex-shrink-0 w-72 rounded-2xl border-2 p-3 transition-colors ${col.color} ${isOver ? 'ring-2 ring-[#7C8363] ring-offset-2' : ''}`}
            onDragOver={(e) => handleDragOver(e, key)}
            onDrop={(e) => handleDrop(e, key)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#2d3025]">{col.label}</h3>
              <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full">{colTasks.length}</span>
            </div>

            <div className="space-y-2">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={`bg-white rounded-xl border border-[#E6DFD3] p-3 cursor-move hover:shadow-md transition-shadow ${draggingId === task.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'}`}
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
                      {task.dueDate && (
                        <p className="text-[10px] text-[#8D7F72] mt-1">📅 {task.dueDate}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-[#c44a3d] hover:bg-[#c44a3d]/10 rounded p-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              {colTasks.length === 0 && (
                <div className="text-center py-6 text-xs text-[#9D978B]">تسکی نیست</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
