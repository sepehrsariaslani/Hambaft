import { useState, useCallback, useRef, useEffect } from 'react'
import type { Task, Goal } from '../types'

interface TaskTableViewProps {
  tasks: Task[]
  goals: Goal[]
  onUpdateTask: (task: Task) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onViewTaskDetails?: (id: string) => void
  onOpenTaskDrawer?: (id: string) => void
  todayDate: string
}

const STATUS_OPTIONS: { value: Task['status']; label: string; color: string }[] = [
  { value: 'inbox', label: 'صندوق ورودی', color: 'bg-[#E6DFD3]/40 text-[#2D3025]' },
  { value: 'not_started', label: 'شروع نشده', color: 'bg-slate-100 text-slate-700' },
  { value: 'next', label: 'بعدی', color: 'bg-blue-50 text-blue-700' },
  { value: 'today', label: 'امروز', color: 'bg-[#F9F1D8] text-[#5A5A40]' },
  { value: 'in_progress', label: 'در حال انجام', color: 'bg-orange-50 text-orange-700' },
  { value: 'done', label: 'انجام شده', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'on_hold', label: 'متوقف', color: 'bg-purple-50 text-purple-700' },
  { value: 'someday', label: 'روزی', color: 'bg-teal-50 text-teal-700' },
  { value: 'dropped', label: 'کنار گذاشته', color: 'bg-red-50 text-red-700' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'بالا', color: 'bg-red-50 text-red-700' },
  { value: 'medium', label: 'متوسط', color: 'bg-[#F9F1D8] text-[#5A5A40]' },
  { value: 'low', label: 'پایین', color: 'bg-emerald-50 text-emerald-700' },
]

const CATEGORY_OPTIONS = [
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
  onOpenTaskDrawer,
  todayDate,
}: TaskTableViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Task>>({})
  const [activeCell, setActiveCell] = useState<{ id: string; field: string } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const allProjects = goals.flatMap(g => (g.projects || []).map(p => ({ id: p.id, title: p.title, goalId: g.id })))

  const startEdit = (task: Task, field?: string) => {
    setEditingId(task.id)
    setEditDraft({ ...task })
    if (field) setActiveCell({ id: task.id, field })
  }

  const saveEdit = useCallback(() => {
    if (!editingId) return
    const task = tasks.find(t => t.id === editingId)
    if (!task) return
    onUpdateTask({ ...task, ...editDraft } as Task)
    setEditingId(null)
    setEditDraft({})
    setActiveCell(null)
  }, [editingId, editDraft, tasks, onUpdateTask])

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft({})
    setActiveCell(null)
  }

  const isOverdue = (task: Task) => !task.completed && task.dueDate && task.dueDate < todayDate

  const handleKeyDown = (e: React.KeyboardEvent, task: Task, currentField: string, nextField?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextField) {
        setActiveCell({ id: task.id, field: nextField })
      } else {
        saveEdit()
      }
    } else if (e.key === 'Escape') {
      cancelEdit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const fields = ['title', 'status', 'priority', 'category', 'projectId', 'dueDate', 'scheduledDate']
      const idx = fields.indexOf(currentField)
      const nextIdx = e.shiftKey ? idx - 1 : idx + 1
      if (nextIdx >= 0 && nextIdx < fields.length) {
        setActiveCell({ id: task.id, field: fields[nextIdx] })
      }
    }
  }

  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeCell])

  const renderCell = (task: Task, field: string) => {
    const editing = editingId === task.id
    const draft = editing ? editDraft : task
    const isActive = activeCell?.id === task.id && activeCell?.field === field

    if (!editing) {
      // Display mode
      const displayValue = (() => {
        switch (field) {
          case 'title': return task.title
          case 'status': {
            const opt = STATUS_OPTIONS.find(s => s.value === task.status)
            return opt ? { label: opt.label, color: opt.color } : { label: task.status || 'صندوق ورودی', color: 'bg-[#E6DFD3]/40 text-[#2D3025]' }
          }
          case 'priority': {
            const opt = PRIORITY_OPTIONS.find(p => p.value === task.priority)
            return opt ? { label: opt.label, color: opt.color } : { label: 'متوسط', color: 'bg-[#F9F1D8] text-[#5A5A40]' }
          }
          case 'category': {
            const opt = CATEGORY_OPTIONS.find(c => c.value === task.category)
            return opt?.label || 'سایر'
          }
          case 'projectId': {
            const proj = allProjects.find(p => p.id === task.projectId)
            return proj?.title || '-'
          }
          case 'dueDate': return task.dueDate || '-'
          case 'scheduledDate': return task.scheduledDate || '-'
          case 'time': return task.totalTimeSpent ? `${Math.floor(task.totalTimeSpent / 60)}د` : '-'
          default: return ''
        }
      })()

      if (field === 'status' || field === 'priority') {
        const val = displayValue as { label: string; color: string }
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${val.color}`}>
            {val.label}
          </span>
        )
      }

      return (
        <span
          onDoubleClick={() => startEdit(task, field)}
          className={`text-xs ${field === 'title' ? 'font-bold cursor-pointer hover:text-[#7C8363]' : 'text-[#8D7F72]'} ${task.completed && field === 'title' ? 'line-through text-[#9D978B]' : 'text-[#2d3025]'}`}
        >
          {typeof displayValue === 'string' ? displayValue : (displayValue as any)?.label}
        </span>
      )
    }

    // Edit mode
    switch (field) {
      case 'title':
        return (
          <input
            ref={isActive ? inputRef : null}
            value={draft.title || ''}
            onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
            onKeyDown={e => handleKeyDown(e, task, field, 'status')}
            onBlur={() => { if (!activeCell) saveEdit() }}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
            autoFocus={isActive}
          />
        )
      case 'status':
        return (
          <select
            ref={isActive ? inputRef as any : null}
            value={draft.status || 'inbox'}
            onChange={e => {
              const newStatus = e.target.value as Task['status']
              setEditDraft(d => ({ ...d, status: newStatus, completed: newStatus === 'done' }))
            }}
            onKeyDown={e => handleKeyDown(e, task, field, 'priority')}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'priority':
        return (
          <select
            value={draft.priority || 'medium'}
            onChange={e => setEditDraft(d => ({ ...d, priority: e.target.value as Task['priority'] }))}
            onKeyDown={e => handleKeyDown(e, task, field, 'category')}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
          >
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'category':
        return (
          <select
            value={draft.category || 'other'}
            onChange={e => setEditDraft(d => ({ ...d, category: e.target.value as Task['category'] }))}
            onKeyDown={e => handleKeyDown(e, task, field, 'projectId')}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
          >
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      case 'projectId':
        return (
          <select
            value={draft.projectId || ''}
            onChange={e => setEditDraft(d => ({ ...d, projectId: e.target.value || undefined }))}
            onKeyDown={e => handleKeyDown(e, task, field, 'dueDate')}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
          >
            <option value="">بدون پروژه</option>
            {allProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )
      case 'dueDate':
        return (
          <input
            type="date"
            value={draft.dueDate || ''}
            onChange={e => setEditDraft(d => ({ ...d, dueDate: e.target.value || undefined }))}
            onKeyDown={e => handleKeyDown(e, task, field, 'scheduledDate')}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
          />
        )
      case 'scheduledDate':
        return (
          <input
            type="date"
            value={draft.scheduledDate || ''}
            onChange={e => setEditDraft(d => ({ ...d, scheduledDate: e.target.value || undefined }))}
            onKeyDown={e => handleKeyDown(e, task, field)}
            className="w-full rounded border border-[#7C8363] px-2 py-1 text-xs focus:outline-none"
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#f9f7f2] border-b border-[#E6DFD3]">
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">✓</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72] min-w-[180px]">عنوان</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">وضعیت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">اولویت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">دسته</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">پروژه</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">مهلت</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">زمان‌بندی</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]">زمان</th>
            <th className="px-4 py-3 text-right text-xs font-black text-[#8D7F72]"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6DFD3]">
          {tasks.map(task => {
            const editing = editingId === task.id
            return (
              <tr
                key={task.id}
                className={`hover:bg-[#f9f7f2]/50 transition-colors ${isOverdue(task) ? 'bg-[#c44a3d]/5' : ''} ${editing ? 'bg-[#7C8363]/5' : ''}`}
                onDoubleClick={() => startEdit(task, 'title')}
              >
                <td className="px-4 py-2">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'}`}
                  >
                    {task.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                </td>

                <td className="px-4 py-2" onClick={() => !editing && onViewTaskDetails?.(task.id)}>
                  {renderCell(task, 'title')}
                </td>
                <td className="px-4 py-2">{renderCell(task, 'status')}</td>
                <td className="px-4 py-2">{renderCell(task, 'priority')}</td>
                <td className="px-4 py-2">{renderCell(task, 'category')}</td>
                <td className="px-4 py-2">{renderCell(task, 'projectId')}</td>
                <td className="px-4 py-2">
                  {editing && activeCell?.field === 'dueDate' ? renderCell(task, 'dueDate') : (
                    <span className={`text-[10px] ${isOverdue(task) ? 'text-[#c44a3d] font-bold' : 'text-[#8D7F72]'}`}>
                      {task.dueDate || '-'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {editing && activeCell?.field === 'scheduledDate' ? renderCell(task, 'scheduledDate') : (
                    <span className="text-[10px] text-[#8D7F72]">{task.scheduledDate || '-'}</span>
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
                      {onOpenTaskDrawer && (
                        <button onClick={() => onOpenTaskDrawer(task.id)} className="text-[10px] text-[#5a6b8a] hover:bg-blue-50 px-2 py-1 rounded">پنل</button>
                      )}
                      <button onClick={() => startEdit(task, 'title')} className="text-[10px] text-[#7C8363] hover:bg-[#7C8363]/10 px-2 py-1 rounded">ویرایش</button>
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
