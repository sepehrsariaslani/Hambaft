import { useState, useCallback } from 'react'
import type { Project, Goal } from '../types'

interface ProjectTableViewProps {
  projects: (Project & { goalId: string; goalTitle: string; goalCategory?: string })[]
  goals: Goal[]
  onUpdateProject: (goalId: string, projectId: string, updates: Partial<Project>) => void
  onDeleteProject: (goalId: string, projectId: string) => void
  onViewProjectDetails?: (projectId: string) => void
}

const statusOptions = [
  { value: 'waiting', label: 'در انتظار' },
  { value: 'in_progress', label: 'در حال اقدام' },
  { value: 'paused', label: 'متوقف' },
  { value: 'completed', label: 'تکمیل شده' },
]

export default function ProjectTableView({
  projects,
  goals,
  onUpdateProject,
  onDeleteProject,
  onViewProjectDetails,
}: ProjectTableViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Project & { goalId?: string }>>({})

  const startEdit = (project: Project & { goalId: string }) => {
    setEditingId(project.id)
    setEditDraft({ ...project })
  }

  const saveEdit = useCallback(() => {
    if (!editingId) return
    const project = projects.find(p => p.id === editingId)
    if (!project) return
    const { goalId, ...updates } = editDraft
    // If goal changed, we need to move project - but for simplicity just update fields
    onUpdateProject(project.goalId, project.id, updates)
    setEditingId(null)
    setEditDraft({})
  }, [editingId, editDraft, projects, onUpdateProject])

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({})
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f9f7f2] border-b border-[#E6DFD3]">
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">عنوان پروژه</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">هدف مرتبط</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">وضعیت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">تسک‌ها</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">پیشرفت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6DFD3]">
          {projects.map(project => {
            const editing = editingId === project.id
            const draft = editing ? editDraft : project
            const tasks = project.tasks || []
            const doneCount = tasks.filter(t => t.completed).length
            const totalCount = tasks.length
            const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

            return (
              <tr
                key={project.id}
                className="hover:bg-[#f9f7f2]/50 transition-colors"
                onDoubleClick={() => !editing && startEdit(project)}
              >
                <td className="px-4 py-2">
                  {editing ? (
                    <input
                      value={draft.title || ''}
                      onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                      className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => onViewProjectDetails?.(project.id)}
                      className={`font-bold cursor-pointer ${project.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025]'}`}
                    >
                      {project.title}
                    </span>
                  )}
                  {project.description && !editing && (
                    <p className="text-[9px] text-[#8D7F72] truncate max-w-[200px]">{project.description}</p>
                  )}
                  {editing && (
                    <input
                      value={draft.description || ''}
                      onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                      placeholder="توضیحات..."
                      className="w-full rounded border border-[#E6DFD3] px-2 py-1 text-[10px] focus:outline-none mt-1"
                    />
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <select
                      value={draft.goalId || project.goalId}
                      onChange={e => setEditDraft(d => ({ ...d, goalId: e.target.value }))}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    >
                      {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  ) : (
                    <span className="text-[10px] text-[#5a6b8a] font-semibold">{project.goalTitle}</span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <select
                      value={draft.status || (project.completed ? 'completed' : 'in_progress')}
                      onChange={e => {
                        const val = e.target.value as Project['status']
                        setEditDraft(d => ({ ...d, status: val, completed: val === 'completed' }))
                      }}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    >
                      {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      project.status === 'completed' || project.completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      project.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      project.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}>
                      {project.status === 'waiting' ? 'در انتظار' :
                       project.status === 'in_progress' ? 'در حال اقدام' :
                       project.status === 'paused' ? 'متوقف' :
                       project.status === 'completed' || project.completed ? 'تکمیل شده' : 'در حال اقدام'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  <span className="text-[10px] text-[#8D7F72] font-mono">
                    {doneCount}/{totalCount}
                  </span>
                </td>

                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#E6DFD3]/40 h-1.5 rounded-full overflow-hidden w-16">
                      <div className="bg-[#7C8363] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-[#7C8363]">{pct}%</span>
                  </div>
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="text-[10px] bg-[#7C8363] text-white px-2 py-1 rounded">ذخیره</button>
                      <button onClick={cancelEdit} className="text-[10px] bg-[#E6DFD3] text-[#2d3025] px-2 py-1 rounded">لغو</button>
                    </div>
                  ) : (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => startEdit(project)} className="text-[10px] text-[#7C8363] hover:bg-[#7C8363]/10 px-2 py-1 rounded">ویرایش</button>
                      <button onClick={() => {
                        if (window.confirm('آیا مطمئن هستید که می‌خواهید این پروژه را حذف کنید؟')) {
                          onDeleteProject(project.goalId, project.id)
                        }
                      }} className="text-[10px] text-[#c44a3d] hover:bg-[#c44a3d]/10 px-2 py-1 rounded">حذف</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {projects.length === 0 && (
        <div className="text-center py-8 text-sm text-[#9D978B]">پروژه‌ای یافت نشد</div>
      )}
    </div>
  )
}
