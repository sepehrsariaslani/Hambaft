import { useState, useCallback } from 'react'
import type { Task, Goal } from '../types'

interface TaskTableViewProps {
  tasks: Task[]
  goals: Goal[]
  onUpdateTask: (task: Task) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onViewTaskDetails?: (id: string) => void
  todayDate: string
}

const priorityOptions = [
  { value: 'high', label: 'بالا' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'پایین' },
]

const statusOptions = [
  { value: 'انجام‌نشده', label: 'انجام‌نشده' },
  { value: 'در حال انجام', label: 'در حال انجام' },
  { value: 'انجام‌شده', label: 'انجام‌شده' },
  { value: 'لغو‌شده', label: 'لغو‌شده' },
]

const categoryOptions = [
  { value: 'work', label: 'شغلی' },
  { value: 'personal', label: 'شخصی' },
  { value: 'health', label: 'سلامت' },
  { value: 'finance', label: 'مالی' },
  { value: 'learning', label: 'آموزشی' },
  { value: 'other', label: 'سایر' },
]

export default function TaskTableView({
  tasks,
  goals,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
  onViewTaskDetails,
  todayDate,
}: TaskTableViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Task>>({})

  const allProjects = goals.flatMap(g => (g.projects || []).map(p => ({ id: p.id, title: p.title, goalId: g.id })))

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditDraft({ ...task })
  }

  const saveEdit = useCallback(() => {
    if (!editingId) return
    const task = tasks.find(t => t.id === editingId)
    if (!task) return
    onUpdateTask({ ...task, ...editDraft } as Task)
    setEditingId(null)
    setEditDraft({})
  }, [editingId, editDraft, tasks, onUpdateTask])

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({})
  }

  const isOverdue = (task: Task) => !task.completed && task.dueDate && task.dueDate < todayDate

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f9f7f2] border-b border-[#E6DFD3]">
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">✓</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">عنوان</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">وضعیت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">اولویت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">دسته</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">پروژه</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">مهلت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">زمان</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6DFD3]">
          {tasks.map(task => {
            const editing = editingId === task.id
            const draft = editing ? editDraft : task

            return (
              <tr
                key={task.id}
                className={`hover:bg-[#f9f7f2]/50 transition-colors ${isOverdue(task) ? 'bg-[#c44a3d]/5' : ''}`}
                onDoubleClick={() => !editing && startEdit(task)}
              >
                <td className="px-4 py-2">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'}`}
                  >
                    {task.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                </td>

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
                      onClick={() => onViewTaskDetails?.(task.id)}
                      className={`font-bold cursor-pointer ${task.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025]'}`}
                    >
                      {task.title}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <select
                      value={draft.status || 'انجام‌نشده'}
                      onChange={e => setEditDraft(d => ({ ...d, status: e.target.value as Task['status'] }))}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    >
                      {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.status === 'انجام‌شده' ? 'bg-[#7C8363]/10 text-[#5a6b4a]' :
                      task.status === 'در حال انجام' ? 'bg-[#d4a017]/10 text-[#b8860b]' :
                      task.status === 'لغو‌شده' ? 'bg-[#9D978B]/10 text-[#666]' :
                      'bg-[#f3ebdf] text-[#8D7F72]'
                    }`}>
                      {task.status || 'انجام‌نشده'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <select
                      value={draft.priority || 'medium'}
                      onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value as Task['priority'] }))}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    >
                      {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      task.priority === 'high' ? 'bg-[#c44a3d]/10 text-[#c44a3d]' :
                      task.priority === 'medium' ? 'bg-[#d4a017]/10 text-[#b8860b]' :
                      'bg-[#7C8363]/10 text-[#5a6b4a]'
                    }`}>
                      {task.priority === 'high' ? 'بالا' : task.priority === 'medium' ? 'متوسط' : 'پایین'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <select
                      value={draft.category || 'other'}
                      onChange={e => setEditDraft(d => ({ ...d, category: e.target.value as Task['category'] }))}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    >
                      {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <span className="text-[10px] text-[#8D7F72]">
                      {task.category === 'work' ? 'شغلی' : task.category === 'personal' ? 'شخصی' : task.category === 'health' ? 'سلامت' : task.category === 'finance' ? 'مالی' : task.category === 'learning' ? 'آموزشی' : 'سایر'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <select
                      value={draft.projectId || ''}
                      onChange={e => setEditDraft(d => ({ ...d, projectId: e.target.value || undefined }))}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    >
                      <option value="">بدون پروژه</option>
                      {allProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  ) : (
                    <span className="text-[10px] text-[#5a6b8a]">
                      {allProjects.find(p => p.id === task.projectId)?.title || '-'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <input
                      type="date"
                      value={draft.dueDate || ''}
                      onChange={e => setEditDraft(d => ({ ...d, dueDate: e.target.value || undefined }))}
                      className="rounded border border-[#E6DFD3] px-2 py-1 text-xs"
                    />
                  ) : (
                    <span className={`text-[10px] ${isOverdue(task) ? 'text-[#c44a3d] font-bold' : 'text-[#8D7F72]'}`}>
                      {task.dueDate || '-'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-2">
                  <span className="text-[10px] text-[#8D7F72]">
                    {task.totalTimeSpent ? `${Math.floor(task.totalTimeSpent / 60)}د` : '-'}
                  </span>
                </td>

                <td className="px-4 py-2">
                  {editing ? (
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="text-[10px] bg-[#7C8363] text-white px-2 py-1 rounded">ذخیره</button>
                      <button onClick={cancelEdit} className="text-[10px] bg-[#E6DFD3] text-[#2d3025] px-2 py-1 rounded">لغو</button>
                    </div>
                  ) : (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => startEdit(task)} className="text-[10px] text-[#7C8363] hover:bg-[#7C8363]/10 px-2 py-1 rounded">ویرایش</button>
                      <button onClick={() => onDeleteTask(task.id)} className="text-[10px] text-[#c44a3d] hover:bg-[#c44a3d]/10 px-2 py-1 rounded">حذف</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div className="text-center py-8 text-sm text-[#9D978B]">تسکی یافت نشد</div>
      )}
    </div>
  )
}
