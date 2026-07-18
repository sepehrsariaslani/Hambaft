import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronLeft, Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react'
import type { Task } from '../types'

interface ProjectTaskTreeViewProps {
  tasks: Task[]
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onUpdateTask: (task: Task) => void
  onAddTask: (title: string) => void
  onViewTaskDetails?: (taskId: string) => void
  onOpenTaskDrawer?: (taskId: string) => void
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

function buildHierarchy(tasks: Task[]): Task[] {
  const map = new Map<string, Task & { _children?: Task[] }>()
  for (const t of tasks) map.set(t.id, { ...t, _children: [] })
  const roots: Task[] = []
  for (const t of map.values()) {
    if (t.parentTaskId && map.has(t.parentTaskId)) {
      map.get(t.parentTaskId)!._children!.push(t)
    } else {
      roots.push(t)
    }
  }
  // Sort: incomplete first, then by priority
  const sortFn = (a: Task, b: Task) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const pa = a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2
    const pb = b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2
    return pa - pb
  }
  roots.sort(sortFn)
  for (const t of map.values()) t._children!.sort(sortFn)
  return roots
}

function flatten(roots: Task[], map: Map<string, Task & { _children?: Task[] }>, depth = 0): Array<Task & { _depth: number; _hasChildren: boolean }> {
  const res: Array<Task & { _depth: number; _hasChildren: boolean }> = []
  for (const r of roots) {
    const node = map.get(r.id)!
    res.push({ ...node, _depth: depth, _hasChildren: (node._children?.length || 0) > 0 })
    if (node._children?.length) {
      res.push(...flatten(node._children, map, depth + 1))
    }
  }
  return res
}

export default function ProjectTaskTreeView({ tasks, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, onViewTaskDetails, onOpenTaskDrawer }: ProjectTaskTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [addingToParent, setAddingToParent] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  const taskMap = useMemo(() => {
    const map = new Map<string, Task & { _children?: Task[] }>()
    for (const t of tasks) map.set(t.id, { ...t, _children: [] })
    for (const t of map.values()) {
      if (t.parentTaskId && map.has(t.parentTaskId)) {
        map.get(t.parentTaskId)!._children!.push(t)
      }
    }
    return map
  }, [tasks])

  const roots = useMemo(() => buildHierarchy(tasks), [tasks])
  const flat = useMemo(() => flatten(roots, taskMap), [roots, taskMap])

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

  const handleAddChild = (parentId: string) => {
    if (!newTitle.trim()) return
    const parent = tasks.find(t => t.id === parentId)
    const newTask: Task = {
      id: `tk-${Date.now()}`,
      title: newTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString().slice(0, 10),
      parentTaskId: parentId,
      status: 'inbox',
    }
    onAddTask(newTask)
    if (parent) {
      onUpdateTask({ ...parent, childTaskIds: [...(parent.childTaskIds || []), newTask.id] })
    }
    setNewTitle('')
    setAddingToParent(null)
    setExpanded(prev => new Set(prev).add(parentId))
  }

  const handleAddRoot = () => {
    if (!newTitle.trim()) return
    onAddTask(newTitle.trim())
    setNewTitle('')
    setAddingToParent(null)
  }

  const completedCount = tasks.filter(t => t.completed).length

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-5 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/50">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
            <span>🌲</span>
            <span>نقشه درختی کارهای پروژه</span>
          </h4>
          <p className="text-[9px] text-[#8D7F72] font-semibold">
            {tasks.length} کار • {completedCount} تکمیل • {roots.length} شاخه اصلی
          </p>
        </div>
        <button
          onClick={() => { setAddingToParent('root'); setNewTitle('') }}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl hover:bg-[#5A5A40] transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>کار جدید</span>
        </button>
      </div>

      {/* Add root task */}
      <AnimatePresence>
        {addingToParent === 'root' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 py-1">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddRoot() }}
                placeholder="عنوان کار جدید..."
                className="flex-1 px-3 py-1.5 text-xs border border-[#7C8363] rounded-xl bg-white dark:bg-[#121411]"
                autoFocus
              />
              <button onClick={handleAddRoot} className="px-3 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl">ثبت</button>
              <button onClick={() => { setAddingToParent(null); setNewTitle('') }} className="px-3 py-1.5 bg-[#E6DFD3] text-[#2D3025] text-[10px] font-bold rounded-xl">انصراف</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
        {flat.length > 0 ? flat.map(task => {
          const isExpanded = expanded.has(task.id)
          const hasChildren = (task as any)._hasChildren
          const isEditing = editingId === task.id
          const isAdding = addingToParent === task.id
          const depth = (task as any)._depth || 0

          // If parent is collapsed, don't render (but flat includes all, so we need to filter)
          // Actually flat is pre-ordered, so we can just hide children of collapsed parents
          // But simpler: just render all and use CSS/conditional. Since flat is linear, we check if any ancestor is collapsed
          let parentId = task.parentTaskId
          let hidden = false
          while (parentId) {
            if (!expanded.has(parentId)) {
              hidden = true
              break
            }
            const p = tasks.find(t => t.id === parentId)
            parentId = p?.parentTaskId
          }
          if (hidden) return null

          return (
            <div key={task.id} className="select-none">
              <div
                className={`flex items-center gap-2 py-2 hover:bg-[#F9F6EE]/50 rounded-xl transition-colors group ${task.completed ? 'opacity-60' : ''}`}
                style={{ paddingRight: `${depth * 20 + 12}px` }}
              >
                {hasChildren ? (
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
                    <span className="text-[9px] text-[#8D7F72] bg-[#f3ebdf] px-1.5 py-0.5 rounded hidden sm:inline">
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  )}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setAddingToParent(task.id); setNewTitle('') }}
                        className="p-1 text-[#7C8363] hover:bg-[#E8ECE0] rounded"
                        title="افزودن زیرکار"
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
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddChild(task.id) }}
                        placeholder="عنوان زیرکار جدید..."
                        className="flex-1 px-3 py-1.5 text-xs border border-[#7C8363] rounded-xl bg-white dark:bg-[#121411]"
                        autoFocus
                      />
                      <button onClick={() => handleAddChild(task.id)} className="px-3 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl">ثبت</button>
                      <button onClick={() => { setAddingToParent(null); setNewTitle('') }} className="px-3 py-1.5 bg-[#E6DFD3] text-[#2D3025] text-[10px] font-bold rounded-xl">انصراف</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }) : (
          <div className="text-center py-8">
            <p className="text-xs text-[#8D7F72]">هیچ کاری ثبت نشده است.</p>
            <button
              onClick={() => { setAddingToParent('root'); setNewTitle('') }}
              className="mt-2 px-4 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl"
            >
              + اولین کار را اضافه کنید
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
