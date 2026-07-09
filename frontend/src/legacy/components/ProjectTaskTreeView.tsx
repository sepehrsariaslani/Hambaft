import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronLeft, Plus, Trash2, Edit2, Check, X, CheckCircle, Circle } from 'lucide-react'
import type { Task } from '../types'

interface ProjectTaskTreeViewProps {
  tasks: Task[]
  onToggleTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onUpdateTask: (task: Task) => void
  onAddTask: (title: string) => void
  onViewTaskDetails?: (taskId: string) => void
}

export default function ProjectTaskTreeView({ tasks, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, onViewTaskDetails }: ProjectTaskTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['active', 'completed', 'overdue']))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const activeTasks = tasks.filter(t => !t.completed && (!t.dueDate || t.dueDate >= today))
  const completedTasks = tasks.filter(t => t.completed)
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today)

  const groups = [
    { id: 'active', label: 'در حال انجام', icon: '▶️', tasks: activeTasks, color: 'text-[#2D3025]' },
    { id: 'overdue', label: 'تاریخ گذشته', icon: '⏰', tasks: overdueTasks, color: 'text-[#c44a3d]' },
    { id: 'completed', label: 'تکمیل شده', icon: '✅', tasks: completedTasks, color: 'text-[#7C8363]' },
  ]

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

  const handleAdd = (groupId: string) => {
    if (!newTitle.trim()) return
    onAddTask(newTitle.trim())
    setNewTitle('')
    setAddingToGroup(null)
  }

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-5 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/50">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
            <span>🌲</span>
            <span>نقشه درختی کارهای پروژه</span>
          </h4>
          <p className="text-[9px] text-[#8D7F72] font-semibold">{tasks.length} کار • {completedTasks.length} تکمیل • {overdueTasks.length} تاریخ گذشته</p>
        </div>
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const isExpanded = expanded.has(group.id)
          const isAdding = addingToGroup === group.id

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              <button
                onClick={() => toggleExpand(group.id)}
                className="w-full flex items-center gap-2 p-2.5 bg-white dark:bg-[#121411] border border-[#E6DFD3]/60 rounded-xl hover:border-[#7C8363] transition-colors text-right"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#8D7F72]" /> : <ChevronLeft className="w-3.5 h-3.5 text-[#8D7F72]" />}
                <span className="text-sm">{group.icon}</span>
                <span className={`text-xs font-black flex-1 ${group.color}`}>{group.label}</span>
                <span className="text-[10px] font-bold bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] px-2 py-0.5 rounded-lg">{group.tasks.length}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingToGroup(group.id); setNewTitle('') }}
                  className="p-1 text-[#7C8363] hover:bg-[#E8ECE0] rounded"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </button>

              {/* Add Task Input */}
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pr-8"
                  >
                    <div className="flex items-center gap-2 py-1">
                      <input
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(group.id) }}
                        placeholder="عنوان کار جدید..."
                        className="flex-1 px-3 py-1.5 text-xs border border-[#7C8363] rounded-xl bg-white dark:bg-[#121411]"
                        autoFocus
                      />
                      <button onClick={() => handleAdd(group.id)} className="px-3 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl">ثبت</button>
                      <button onClick={() => { setAddingToGroup(null); setNewTitle('') }} className="px-3 py-1.5 bg-[#E6DFD3] text-[#2D3025] text-[10px] font-bold rounded-xl">انصراف</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-1 pr-8"
                  >
                    {group.tasks.length > 0 ? group.tasks.map(task => {
                      const isEditing = editingId === task.id
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 p-2.5 bg-white dark:bg-[#121411] border border-[#E6DFD3]/40 rounded-xl hover:border-[#7C8363]/50 transition-colors group"
                        >
                          <button
                            onClick={() => onToggleTask(task.id)}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'
                            }`}
                          >
                            {task.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>

                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(task) }}
                                className="flex-1 px-2 py-1 text-xs border border-[#7C8363] rounded-lg bg-white"
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

                          {!isEditing && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingId(task.id); setEditTitle(task.title) }} className="p-1 text-[#8D7F72] hover:bg-[#E6DFD3] rounded" title="ویرایش">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => onDeleteTask(task.id)} className="p-1 text-[#c44a3d] hover:bg-red-50 rounded" title="حذف">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    }) : (
                      <p className="text-center py-3 text-[10px] text-[#8D7F72]">کاری در این بخش نیست</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
