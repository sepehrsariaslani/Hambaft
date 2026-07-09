import { useState, useCallback } from 'react'
import type { Goal } from '../types'
import { CheckCircle, Circle, Calendar, FolderKanban, Trash2 } from 'lucide-react'

interface GoalKanbanViewProps {
  goals: Goal[]
  onUpdateGoal: (goal: Goal) => void
  onToggleGoalCompletion: (id: string) => void
  onDeleteGoal: (id: string) => void
  onSelectGoal: (id: string) => void
}

const TODAY = '2026-07-09'

const columns = [
  { id: 'active', label: '🚀 در حال پیگیری', color: 'bg-blue-50/60 border-blue-200', headerText: 'text-blue-800' },
  { id: 'completed', label: '✅ تکمیل شده', color: 'bg-emerald-50/60 border-emerald-200', headerText: 'text-emerald-800' },
  { id: 'overdue', label: '⏰ سررسید گذشته', color: 'bg-rose-50/60 border-rose-200', headerText: 'text-rose-800' },
]

function getGoalColumn(goal: Goal): string {
  if (goal.completed) return 'completed'
  if (goal.targetDate < TODAY) return 'overdue'
  return 'active'
}

export default function GoalKanbanView({
  goals,
  onUpdateGoal,
  onToggleGoalCompletion,
  onDeleteGoal,
  onSelectGoal,
}: GoalKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, goalId: string) => {
    setDraggingId(goalId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', goalId)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    const goalId = e.dataTransfer.getData('text/plain') || draggingId
    const goal = goals.find(g => g.id === goalId)
    if (!goal) {
      setDraggingId(null)
      setDragOverColumn(null)
      return
    }

    const currentCol = getGoalColumn(goal)
    if (currentCol === columnId) {
      setDraggingId(null)
      setDragOverColumn(null)
      return
    }

    if (columnId === 'completed') {
      if (!goal.completed) {
        onToggleGoalCompletion(goal.id)
      }
    } else if (columnId === 'active') {
      if (goal.completed) {
        onToggleGoalCompletion(goal.id)
      }
      // If goal was overdue (targetDate in past), push targetDate to today so it stays in active
      if (goal.targetDate < TODAY) {
        onUpdateGoal({ ...goal, targetDate: TODAY })
      }
    } else if (columnId === 'overdue') {
      // Move to overdue: uncomplete and keep past date (or set to yesterday if it was future)
      const updated = { ...goal, completed: false }
      if (goal.targetDate >= TODAY) {
        updated.targetDate = '2026-07-08' // yesterday
      }
      onUpdateGoal(updated)
    }

    setDraggingId(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverColumn(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]" dir="rtl">
      {columns.map(col => {
        const colGoals = goals.filter(g => getGoalColumn(g) === col.id)
        const isOver = dragOverColumn === col.id

        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-80 rounded-3xl border-2 p-3 transition-all ${col.color} ${isOver ? 'ring-2 ring-[#7C8363] ring-offset-2' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5">
              <h3 className={`text-sm font-black ${col.headerText}`}>{col.label}</h3>
              <span className="text-[10px] font-bold bg-white/70 px-2 py-0.5 rounded-full">{colGoals.length}</span>
            </div>

            <div className="space-y-3">
              {colGoals.map(goal => {
                const total = goal.milestones.length
                const done = goal.milestones.filter(m => m.completed).length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const projectCount = (goal.projects || []).length

                return (
                  <div
                    key={goal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, goal.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-2xl border border-[#E6DFD3]/80 p-3.5 cursor-move hover:shadow-md transition-all text-right ${draggingId === goal.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5
                        onClick={() => onSelectGoal(goal.id)}
                        className={`text-[11px] font-black leading-tight flex-1 cursor-pointer ${goal.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}
                      >
                        {goal.title}
                      </h5>
                      <button
                        onClick={() => {
                          if (confirm('آیا مایل به حذف این هدف هستید؟')) onDeleteGoal(goal.id)
                        }}
                        className="text-[#c44a3d] hover:bg-[#c44a3d]/10 rounded p-1 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {goal.description && (
                      <p className="text-[9px] text-[#8D7F72] mt-1 line-clamp-2">{goal.description}</p>
                    )}

                    <div className="mt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-[8px] font-bold text-[#8D7F72]">
                        <span>پیشرفت: {pct}%</span>
                        <span>{done}/{total} گام</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${goal.completed ? 'bg-emerald-500' : 'bg-[#E26645]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E6DFD3]/30">
                      <span className="text-[8px] text-[#8D7F72] bg-[#F9F6EE] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {goal.targetDate}
                      </span>
                      {projectCount > 0 && (
                        <span className="text-[8px] text-[#8D7F72] bg-[#F9F6EE] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <FolderKanban className="w-2.5 h-2.5" />
                          {projectCount} پروژه
                        </span>
                      )}
                      <button
                        onClick={() => onToggleGoalCompletion(goal.id)}
                        className="mr-auto"
                        title={goal.completed ? 'فعال‌سازی مجدد' : 'علامت‌گذاری تکمیل'}
                      >
                        {goal.completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#8D7F72]" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
              {colGoals.length === 0 && (
                <div className="text-center py-8 text-[9px] text-[#9D978B] font-semibold border border-dashed border-black/10 rounded-2xl bg-white/40">
                  هدفی در این ستون نیست
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
