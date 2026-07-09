import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, ChevronLeft, Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react'
import type { Task, Goal } from '../types'

interface TaskTreeViewProps {
  tasks: Task[]
  goals: Goal[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => void
  onAddTask: (titleOrTask: string | Task) => void
  onViewTaskDetails?: (id: string) => void
  todayDate: string
}

interface TreeNode {
  id: string
  title: string
  type: 'goal' | 'project' | 'task'
  completed?: boolean
  children: TreeNode[]
  meta?: Record<string, any>
}

function buildTree(goals: Goal[], standaloneTasks: Task[]): TreeNode[] {
  const tree: TreeNode[] = []

  for (const goal of goals) {
    const goalNode: TreeNode = {
      id: `goal-${goal.id}`,
      title: goal.title,
      type: 'goal',
      children: [],
      meta: { goalId: goal.id },
    }
    for (const project of goal.projects || []) {
      const projectNode: TreeNode = {
        id: `project-${project.id}`,
        title: project.title,
        type: 'project',
        children: [],
        meta: { goalId: goal.id, projectId: project.id },
      }
      for (const task of project.tasks || []) {
        projectNode.children.push({
          id: task.id,
          title: task.title,
          type: 'task',
          completed: task.completed,
          children: [],
          meta: { goalId: goal.id, projectId: project.id, task },
        })
      }
      goalNode.children.push(projectNode)
    }
    tree.push(goalNode)
  }

  // Standalone tasks (not in any project)
  const assignedTaskIds = new Set(
    goals.flatMap(g => (g.projects || []).flatMap(p => (p.tasks || []).map(t => t.id)))
  )
  const standalone = standaloneTasks.filter(t => !assignedTaskIds.has(t.id))
  if (standalone.length > 0) {
    tree.push({
      id: 'standalone-root',
      title: 'تسک‌های مستقل',
      type: 'goal',
      children: standalone.map(t => ({
        id: t.id,
        title: t.title,
        type: 'task',
        completed: t.completed,
        children: [],
        meta: { task: t },
      })),
      meta: {},
    })
  }

  return tree
}

export default function TaskTreeView({ tasks, goals, onToggleTask, onDeleteTask, onUpdateTask, onAddTask, onViewTaskDetails, todayDate }: TaskTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [addingToProject, setAddingToProject] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const tree = buildTree(goals, tasks)

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleEditSave = (node: TreeNode) => {
    if (!editTitle.trim()) return
    if (node.type === 'task' && node.meta?.task) {
      onUpdateTask({ ...node.meta.task, title: editTitle.trim() })
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleAddTaskToProject = (goalId: string, projectId: string) => {
    if (!newTaskTitle.trim()) return
    // We need to add through the parent goal/project handlers
    // But those are in App.tsx. We'll use a synthetic approach:
    // Create a task and assign projectId
    const newTask: Task = {
      id: `tk-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: todayDate,
      projectId,
    }
    onAddTask(newTask)
    setNewTaskTitle('')
    setAddingToProject(null)
  }

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const isEditing = editingId === node.id
    const isAdding = addingToProject === node.id && node.type === 'project'

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 pr-${depth * 4} hover:bg-[#F9F6EE]/50 rounded-xl transition-colors group`}
          style={{ paddingRight: `${depth * 16 + 12}px` }}
        >
          {hasChildren && (
            <button onClick={() => toggleExpand(node.id)} className="text-[#8D7F72] hover:text-[#2D3025] p-0.5">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}

          {node.type === 'task' && (
            <button
              onClick={() => onToggleTask(node.id)}
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                node.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#E6DFD3]'
              }`}
            >
              {node.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          )}
          {node.type === 'goal' && <span className="text-sm">🎯</span>}
          {node.type === 'project' && <span className="text-sm">📁</span>}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(node) }}
                className="flex-1 px-2 py-1 text-xs border border-[#7C8363] rounded-lg bg-white"
                autoFocus
              />
              <button onClick={() => handleEditSave(node)} className="p-1 bg-[#7C8363] text-white rounded"><Check className="w-3 h-3" /></button>
              <button onClick={() => { setEditingId(null); setEditTitle('') }} className="p-1 bg-[#E6DFD3] text-[#2D3025] rounded"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <span
              onClick={() => node.type === 'task' ? onViewTaskDetails?.(node.id) : toggleExpand(node.id)}
              className={`text-xs font-bold flex-1 cursor-pointer ${
                node.type === 'task' && node.completed ? 'line-through text-[#9D978B]' :
                node.type === 'task' ? 'text-[#2D3025]' :
                node.type === 'project' ? 'text-[#7C8363]' :
                'text-[#2D3025]'
              }`}
            >
              {node.title}
            </span>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {node.type === 'project' && (
                <button
                  onClick={() => { setAddingToProject(node.id); setNewTaskTitle('') }}
                  className="p-1 text-[#7C8363] hover:bg-[#E8ECE0] rounded"
                  title="افزودن تسک"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
              {node.type === 'task' && (
                <button
                  onClick={() => { setEditingId(node.id); setEditTitle(node.title) }}
                  className="p-1 text-[#8D7F72] hover:bg-[#E6DFD3] rounded"
                  title="ویرایش"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              {node.type === 'task' && (
                <button
                  onClick={() => onDeleteTask(node.id)}
                  className="p-1 text-[#c44a3d] hover:bg-red-50 rounded"
                  title="حذف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add task input under project */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              style={{ paddingRight: `${(depth + 1) * 16 + 12}px` }}
            >
              <div className="flex items-center gap-2 py-1">
                <input
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTaskToProject(node.meta?.goalId, node.meta?.projectId)
                  }}
                  placeholder="عنوان تسک جدید..."
                  className="flex-1 px-3 py-1.5 text-xs border border-[#7C8363] rounded-xl bg-white"
                  autoFocus
                />
                <button
                  onClick={() => handleAddTaskToProject(node.meta?.goalId, node.meta?.projectId)}
                  className="px-3 py-1.5 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl"
                >
                  ثبت
                </button>
                <button
                  onClick={() => { setAddingToProject(null); setNewTaskTitle('') }}
                  className="px-3 py-1.5 bg-[#E6DFD3] text-[#2D3025] text-[10px] font-bold rounded-xl"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-5 space-y-1">
      <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/50">
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
            <span>🌲</span>
            <span>نقشه درختی تسک‌ها</span>
          </h4>
          <p className="text-[9px] text-[#8D7F72] font-semibold">ساختار سلسله مراتبی اهداف، پروژه‌ها و تسک‌ها</p>
        </div>
      </div>
      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {tree.length > 0 ? tree.map(node => renderNode(node)) : (
          <p className="text-center py-6 text-xs text-[#8D7F72]">تسکی برای نمایش درخت وجود ندارد.</p>
        )}
      </div>
    </div>
  )
}
