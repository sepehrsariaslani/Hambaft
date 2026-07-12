import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import type { Task, Goal } from '../types'

interface TaskTreeViewProps {
  tasks: Task[]
  goals: Goal[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => void
  onAddTask: (titleOrTask: string | Task) => void
  onViewTaskDetails?: (id: string) => void
  onOpenTaskDrawer?: (id: string) => void
  todayDate: string
}

const STATUS_LABELS: Record<string, string> = {
  inbox: 'صندوق ورودی',
  not_started: 'شروع نشده',
  next: 'بعدی',
  today: 'امروز',
  in_progress: 'در حال انجام',
  done: 'انجام شده',
  on_hold: 'متوقف',
  someday: 'روزی',
  dropped: 'کنار گذاشته',
}

const STATUS_DOT: Record<string, string> = {
  inbox: 'bg-[#8D7F72]',
  not_started: 'bg-slate-400',
  next: 'bg-blue-400',
  today: 'bg-[#9B6B61]',
  in_progress: 'bg-orange-400',
  done: 'bg-emerald-400',
  on_hold: 'bg-purple-400',
  someday: 'bg-teal-400',
  dropped: 'bg-red-400',
}

function buildTaskHierarchy(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task & { _depth?: number; _children?: Task[] }>()
  for (const t of tasks) {
    taskMap.set(t.id, { ...t, _depth: 0, _children: [] })
  }

  const roots: Task[] = []

  for (const t of taskMap.values()) {
    if (t.parentTaskId && taskMap.has(t.parentTaskId)) {
      const parent = taskMap.get(t.parentTaskId)!
      parent._children = parent._children || []
      parent._children.push(t)
    } else {
      roots.push(t)
    }
  }

  // Sort roots by priority then due date
  roots.sort((a, b) => {
    const pa = a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2
    const pb = b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2
    if (pa !== pb) return pa - pb
    return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
  })

  return roots
}

function flattenHierarchy(roots: Task[], taskMap: Map<string, Task & { _depth?: number; _children?: Task[] }>, depth = 0): Array<Task & { _depth: number }> {
  const result: Array<Task & { _depth: number }> = []
  for (const root of roots) {
    const node = taskMap.get(root.id)!
    result.push({ ...node, _depth: depth })
    if (node._children && node._children.length > 0) {
      result.push(...flattenHierarchy(node._children, taskMap, depth + 1))
    }
  }
  return result
}

export default function TaskTreeView({ tasks, goals, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, onViewTaskDetails, onOpenTaskDrawer, todayDate }: TaskTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [addingChildTo, setAddingChildTo] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const taskMap = useMemo(() => {
    const map = new Map<string, Task & { _depth?: number; _children?: Task[] }>()
    for (const t of tasks) {
      map.set(t.id, { ...t, _depth: 0, _children: [] })
    }
    for (const t of map.values()) {
      if (t.parentTaskId && map.has(t.parentTaskId)) {
        const parent = map.get(t.parentTaskId)!
        parent._children = parent._children || []
        parent._children.push(t)
      }
    }
    return map
  }, [tasks])

  const roots = useMemo(() => buildTaskHierarchy(tasks), [tasks])
  const flatTasks = useMemo(() => flattenHierarchy(roots, taskMap), [roots, taskMap])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleEditSave = (task: Task) => {
    if (!editTitle.trim()) return
    onUpdateTask({ ...task, title: editTitle.trim() })
    setEditingId(null)
    setEditTitle('')
  }

  const handleAddChild = (parentTask: Task) => {
    if (!newTaskTitle.trim()) return
    const newTask: Task = {
      id: `tk-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: todayDate,
      parentTaskId: parentTask.id,
      status: 'inbox',
    }
    onAddTask(newTask)
    // Update parent to include child
    const updatedChildren = [...(parentTask.childTaskIds || []), newTask.id]
    onUpdateTask({ ...parentTask, childTaskIds: updatedChildren })
    setNewTaskTitle('')
    setAddingChildTo(null)
    setExpanded(prev => new Set(prev).add(parentTask.id))
  }

  const hasChildren = (taskId: string) => {
    const t = taskMap.get(taskId)
    return (t?._children?.length || 0) > 0
  }

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-5 space-y-1">
      <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/50">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
            <span>🌲</span>
            <span>نقشه درختی تسک‌ها (سلسله مراتبی)</span>
          </h4>
          <p className="text-[9px] text-[#8D7F72] font-semibold">
            {tasks.length} تسک • {tasks.filter(t => t.completed).length} تکمیل • {roots.length} شاخه اصلی
          </p>
        </div>
      </div>

      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {flatTasks.length > 0 ? flatTasks.map(task => {
          const isExpanded = expanded.has(task.id)
          const hasChilds = hasChildren(task.id)
          const isEditing = editingId === task.id
          const isAdding = addingChildTo === task.id
          const depth = (task as any)._depth || 0
          const isOverdue = !task.completed && task.dueDate && task.dueDate < todayDate

          return (
            <div key={task.id} className="select-none">
              <div
                className={`flex items-center gap-2 py-2 hover:bg-[#F9F6EE]/50 rounded-xl transition-colors group ${isOverdue ? 'bg-[#c44a3d]/5' : ''}`}
                style={{ paddingRight: `${depth * 20 + 12}px` }}
              >
                {hasChilds ? (
                  <button onClick={() => toggleExpand(task.id)} className="text-[#8D7F72] hover:text-[#2D3025] p-0.5 shrink-0">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}

                <button
                  onClick={() => onToggleTask(task.id)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'
                  }`}
                >
                  {task.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>

                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[task.status || 'inbox'] || 'bg-[#8D7F72]'}`} />

                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSave(task) }}
                      className="flex-1 px-2 py-1 text-xs border border-[#7C8363] rounded-lg bg-white dark:bg-[#121411]"
                      autoFocus
                    />
                    <button onClick={() => handleEditSave(task)} className="p-1 bg-[#7C8363] text-white rounded"><Check className="w-3 h-3" /></button>
                    <button onClick={() => { setEditingId(null); setEditTitle('') }} className="p-1 bg-[#E6DFD3] text-[#2D3025] rounded"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <span
                    onClick={() => onViewTaskDetails?.(task.id)}
                    className={`text-xs font-bold flex-1 cursor-pointer ${task.completed ? 'line-through text-[#9D978B]' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}
                  >
                    {task.title}
                  </span>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {task.status && (
                    <span className="text-[9px] text-[#8D7F72] bg-[#f3ebdf] px-1.5 py-0.5 rounded hidden md:inline">
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  )}
                  {task.priority === 'high' && (
                    <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded hidden md:inline">فوری</span>
                  )}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setAddingChildTo(task.id); setNewTaskTitle('') }}
                        className="p-1 text-[#7C8363] hover:bg-[#E8ECE0] rounded"
                        title="افزودن زیرتسک"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      {onOpenTaskDrawer && (
                        <button
                          onClick={() => onOpenTaskDrawer(task.id)}
                          className="p-1 text-[#5a6b8a] hover:bg-blue-50 rounded"
                          title="باز کردن در پنل"
                        >
                          <span className="text-[10px] font-black">پنل</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingId(task.id); setEditTitle(task.title) }}
                        className="p-1 text-[#8D7F72] hover:bg-[#E6DFD3] rounded"
                        title="ویرایش"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 text-[#c44a3d] hover:bg-red-50 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add child input */}
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                    style={{ paddingRight: `${(depth + 1) * 20 + 12}px` }}
                  >
                    <div className="flex items-center gap-2 py-1">
                      <input
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddChild(task) }}
                        placeholder="عنوان زیرتسک جدید..."
                        className="flex-1 px-3 py-1.5 text-xs border border-[#7C8363] rounded-xl bg-white dark:bg-[#121411]"
                        autoFocus
                      />
                      <button onClick={() => handleAddChild(task)} className="px-3 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl">ثبت</button>
                      <button onClick={() => { setAddingChildTo(null); setNewTaskTitle('') }} className="px-3 py-1.5 bg-[#E6DFD3] text-[#2D3025] text-[10px] font-bold rounded-xl">انصراف</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }) : (
          <p className="text-center py-6 text-xs text-[#8D7F72]">تسکی برای نمایش درخت وجود ندارد.</p>
        )}
      </div>
    </div>
  )
}
