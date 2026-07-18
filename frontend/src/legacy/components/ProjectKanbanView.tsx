import { useState, useCallback } from 'react'
import type { Project } from '../types'

interface ProjectKanbanViewProps {
  projects: (Project & { goalId: string; goalTitle: string })[]
  onUpdateProject: (goalId: string, projectId: string, updates: Partial<Project>) => void
  onDeleteProject: (goalId: string, projectId: string) => void
  onViewProjectDetails?: (projectId: string) => void
}

const columns: Record<string, { label: string; color: string; border: string }> = {
  waiting: { label: '⏳ در انتظار شروع', color: 'bg-slate-50/50', border: 'border-slate-200' },
  in_progress: { label: '🚀 در حال اقدام', color: 'bg-blue-50/50', border: 'border-blue-200' },
  paused: { label: '⏸️ متوقف شده', color: 'bg-[#F9F1D8]/50', border: 'border-[#EBE3C8]' },
  completed: { label: '✅ تکمیل شده', color: 'bg-emerald-50/50', border: 'border-emerald-200' },
}

export default function ProjectKanbanView({
  projects,
  onUpdateProject,
  onDeleteProject,
  onViewProjectDetails,
}: ProjectKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const getColumnKey = (project: Project) => {
    return project.status || (project.completed ? 'completed' : 'in_progress')
  }

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggingId(projectId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', projectId)
  }

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    setDragOverColumn(columnKey)
  }

  const handleDrop = useCallback((e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    const projectId = e.dataTransfer.getData('text/plain')
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const currentKey = getColumnKey(project)
    if (currentKey === columnKey) {
      setDraggingId(null)
      setDragOverColumn(null)
      return
    }

    onUpdateProject(project.goalId, project.id, {
      status: columnKey as Project['status'],
      completed: columnKey === 'completed'
    })

    setDraggingId(null)
    setDragOverColumn(null)
  }, [projects, onUpdateProject])

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]" dir="rtl">
      {Object.entries(columns).map(([key, col]) => {
        const colProjects = projects.filter(p => getColumnKey(p) === key)
        const isOver = dragOverColumn === key

        return (
          <div
            key={key}
            className={`flex-shrink-0 w-80 rounded-2xl border-2 p-3 transition-colors ${col.color} ${col.border} ${isOver ? 'ring-2 ring-[#7C8363] ring-offset-2' : ''}`}
            onDragOver={(e) => handleDragOver(e, key)}
            onDrop={(e) => handleDrop(e, key)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#2d3025]">{col.label}</h3>
              <span className="text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full">{colProjects.length}</span>
            </div>

            <div className="space-y-2">
              {colProjects.map(project => {
                const tasks = project.tasks || []
                const doneCount = tasks.filter(t => t.completed).length
                const totalCount = tasks.length
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    className={`bg-white rounded-xl border border-[#E6DFD3] p-3 cursor-move hover:shadow-md transition-shadow ${draggingId === project.id ? 'opacity-50' : ''}`}
                  >
                    <div className="space-y-2 text-right">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          onClick={() => onViewProjectDetails?.(project.id)}
                          className={`text-sm font-bold cursor-pointer flex-1 ${project.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025]'}`}
                        >
                          {project.title}
                        </p>
                        <button
                          onClick={() => {
                            if (window.confirm('آیا مطمئن هستید؟')) {
                              onDeleteProject(project.goalId, project.id)
                            }
                          }}
                          className="text-[#c44a3d] hover:bg-[#c44a3d]/10 rounded p-1 shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>

                      <span className="text-[9px] font-bold text-[#7C8363] bg-[#E8ECE0] px-2 py-0.5 rounded-md inline-block">
                        {project.goalTitle}
                      </span>

                      {project.description && (
                        <p className="text-[10px] text-[#8D7F72] truncate">{project.description}</p>
                      )}

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-[8px] font-black text-[#8D7F72]">
                          <span>پیشرفت تسک‌ها:</span>
                          <span>{doneCount} از {totalCount} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#E26645]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {colProjects.length === 0 && (
                <div className="text-center py-6 text-xs text-[#9D978B]">پروژه‌ای نیست</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
