import { useState, useMemo, useCallback, lazy, Suspense } from 'react'
import type { Task, Goal } from '../types'
import ViewSwitcher, { type ViewMode } from './ViewSwitcher'

const TaskTableView = lazy(() => import('./TaskTableView'))
const TaskKanbanView = lazy(() => import('./TaskKanbanView'))

interface TaskManagerSectionProps {
  tasks: Task[]
  goals: Goal[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => void
  onAddTask: (titleOrTask: string | Task) => void
  onViewTaskDetails?: (id: string) => void
  todayDate: string
}

type GroupBy = 'none' | 'project' | 'priority' | 'status' | 'category' | 'dueDate'
type SortBy = 'dueDate' | 'priority' | 'createdAt' | 'title'
type FilterStatus = 'all' | 'open' | 'completed'
type KanbanGroup = 'status' | 'priority' | 'project'

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
const priorityLabels: Record<string, string> = { high: 'بالا', medium: 'متوسط', low: 'پایین' }
const priorityColors: Record<string, string> = {
  high: 'bg-[#c44a3d]/10 text-[#c44a3d] border-[#c44a3d]/20',
  medium: 'bg-[#d4a017]/10 text-[#b8860b] border-[#d4a017]/20',
  low: 'bg-[#7C8363]/10 text-[#5a6b4a] border-[#7C8363]/20',
}
const categoryLabels: Record<string, string> = {
  work: 'شغلی', personal: 'شخصی', health: 'سلامت', finance: 'مالی', learning: 'آموزشی', other: 'سایر',
}
const categoryColors: Record<string, string> = {
  work: 'bg-blue-50 text-blue-700 border-blue-200',
  personal: 'bg-purple-50 text-purple-700 border-purple-200',
  health: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  finance: 'bg-amber-50 text-amber-700 border-amber-200',
  learning: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
}

function collectAllTasks(tasks: Task[], goals: Goal[]): Array<Task & { sourceGoal?: string; sourceProject?: string }> {
  const all: Array<Task & { sourceGoal?: string; sourceProject?: string }> = [...tasks.map(t => ({ ...t }))]
  for (const goal of goals) {
    for (const project of (goal.projects || [])) {
      for (const task of (project.tasks || [])) {
        all.push({ ...task, sourceGoal: goal.title, sourceProject: project.title })
      }
    }
  }
  return all
}

export default function TaskManagerSection({
  tasks,
  goals,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onAddTask,
  onViewTaskDetails,
  todayDate,
}: TaskManagerSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [sortBy, setSortBy] = useState<SortBy>('dueDate')
  const [kanbanGroup, setKanbanGroup] = useState<KanbanGroup>('status')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  const allTasks = useMemo(() => collectAllTasks(tasks, goals), [tasks, goals])

  const filteredTasks = useMemo(() => {
    let result = allTasks.filter((t) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false
      }
      if (filterStatus === 'open' && t.completed) return false
      if (filterStatus === 'completed' && !t.completed) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      return true
    })

    result.sort((a, b) => {
      if (sortBy === 'priority') {
        const pa = priorityOrder[a.priority || 'low'] ?? 2
        const pb = priorityOrder[b.priority || 'low'] ?? 2
        if (pa !== pb) return pa - pb
      }
      if (sortBy === 'dueDate') {
        const da = a.dueDate || '9999-12-31'
        const db = b.dueDate || '9999-12-31'
        if (da !== db) return da.localeCompare(db)
      }
      if (sortBy === 'createdAt') {
        return (b.createdAt || '').localeCompare(a.createdAt || '')
      }
      return a.title.localeCompare(b.title)
    })

    return result
  }, [allTasks, search, filterStatus, filterPriority, filterCategory, sortBy])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { 'همه تسک‌ها': filteredTasks }
    const groups: Record<string, typeof filteredTasks> = {}
    for (const t of filteredTasks) {
      let key = 'سایر'
      if (groupBy === 'project') {
        key = t.sourceProject || t.sourceGoal || 'بدون پروژه'
      } else if (groupBy === 'priority') {
        key = priorityLabels[t.priority || 'low'] || 'متوسط'
      } else if (groupBy === 'status') {
        key = t.completed ? 'انجام‌شده' : 'در حال انجام'
      } else if (groupBy === 'category') {
        key = categoryLabels[t.category || 'other'] || 'سایر'
      } else if (groupBy === 'dueDate') {
        if (!t.dueDate) key = 'بدون تاریخ'
        else if (t.dueDate < todayDate) key = 'تاریخ گذشته'
        else if (t.dueDate === todayDate) key = 'امروز'
        else key = 'آینده'
      }
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    return groups
  }, [filteredTasks, groupBy, todayDate])

  const handleAdd = useCallback(() => {
    if (!newTaskTitle.trim()) return
    onAddTask(newTaskTitle.trim())
    setNewTaskTitle('')
  }, [newTaskTitle, onAddTask])

  const toggleSelect = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stats = useMemo(() => {
    const total = allTasks.length
    const completed = allTasks.filter(t => t.completed).length
    const overdue = allTasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayDate).length
    const highPriority = allTasks.filter(t => !t.completed && t.priority === 'high').length
    return { total, completed, overdue, highPriority }
  }, [allTasks, todayDate])

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="کل تسک‌ها" value={stats.total} color="bg-[#2d3025] text-white" />
        <StatCard label="انجام‌شده" value={stats.completed} color="bg-[#7C8363] text-white" />
        <StatCard label="تاریخ گذشته" value={stats.overdue} color="bg-[#c44a3d] text-white" />
        <StatCard label="اولویت بالا" value={stats.highPriority} color="bg-[#d4a017] text-white" />
      </div>

      {/* Add Task */}
      <div className="flex gap-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="تسک جدید بنویس و Enter بزن..."
          className="flex-1 rounded-xl border border-[#E6DFD3] bg-white px-4 py-3 text-sm text-[#2d3025] placeholder:text-[#9D978B] focus:border-[#7C8363] focus:outline-none focus:ring-2 focus:ring-[#7C8363]/20 transition-all"
        />
        <button
          onClick={handleAdd}
          className="rounded-xl bg-[#2d3025] px-5 py-3 text-sm font-bold text-white hover:bg-[#1a1c15] transition-colors"
        >
          + افزودن
        </button>
      </div>

      {/* Filters & Controls */}
      <div className="rounded-2xl border border-[#E6DFD3] bg-[#FDFBF7] p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9D978B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در تسک‌ها..."
              className="w-full rounded-lg border border-[#E6DFD3] bg-white pr-9 pl-3 py-2 text-sm text-[#2d3025] placeholder:text-[#9D978B] focus:border-[#7C8363] focus:outline-none focus:ring-1 focus:ring-[#7C8363]/20"
            />
          </div>

          <Select value={filterStatus} onChange={(v) => setFilterStatus(v as FilterStatus)} options={[
            { value: 'all', label: 'همه وضعیت‌ها' },
            { value: 'open', label: 'در حال انجام' },
            { value: 'completed', label: 'انجام‌شده' },
          ]} />

          <Select value={filterPriority} onChange={(v) => setFilterPriority(v)} options={[
            { value: 'all', label: 'همه اولویت‌ها' },
            { value: 'high', label: 'بالا' },
            { value: 'medium', label: 'متوسط' },
            { value: 'low', label: 'پایین' },
          ]} />

          <Select value={filterCategory} onChange={(v) => setFilterCategory(v)} options={[
            { value: 'all', label: 'همه دسته‌ها' },
            { value: 'work', label: 'شغلی' },
            { value: 'personal', label: 'شخصی' },
            { value: 'health', label: 'سلامت' },
            { value: 'finance', label: 'مالی' },
            { value: 'learning', label: 'آموزشی' },
          ]} />
        </div>

        <div className="flex flex-wrap gap-3 items-center border-t border-[#E6DFD3] pt-3">
          {/* View Switcher — reusable component */}
          <ViewSwitcher
            views={[
              { id: 'list', label: 'لیست', emoji: '🗂️' },
              { id: 'table', label: 'جدول', emoji: '⊞' },
              { id: 'kanban', label: 'کانبان', emoji: '📋' },
            ]}
            activeView={viewMode}
            onChange={setViewMode}
          />

          {viewMode === 'kanban' && (
            <>
              <span className="text-xs font-bold text-[#8D7F72] mr-2">ستون‌ها:</span>
              <Segmented value={kanbanGroup} onChange={(v) => setKanbanGroup(v as KanbanGroup)} options={[
                { value: 'status', label: 'وضعیت' },
                { value: 'priority', label: 'اولویت' },
                { value: 'project', label: 'پروژه' },
              ]} />
            </>
          )}

          {viewMode !== 'kanban' && (
            <>
              <span className="text-xs font-bold text-[#8D7F72] mr-2">گروه‌بندی:</span>
              <Segmented value={groupBy} onChange={(v) => setGroupBy(v as GroupBy)} options={[
                { value: 'none', label: 'بدون' },
                { value: 'project', label: 'پروژه' },
                { value: 'priority', label: 'اولویت' },
                { value: 'status', label: 'وضعیت' },
                { value: 'category', label: 'دسته' },
                { value: 'dueDate', label: 'تاریخ' },
              ]} />
            </>
          )}

          <span className="text-xs font-bold text-[#8D7F72] mr-2">مرتب‌سازی:</span>
          <Segmented value={sortBy} onChange={(v) => setSortBy(v as SortBy)} options={[
            { value: 'dueDate', label: 'تاریخ' },
            { value: 'priority', label: 'اولویت' },
            { value: 'createdAt', label: 'جدیدترین' },
            { value: 'title', label: 'عنوان' },
          ]} />
        </div>
      </div>

      {/* Views */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupName, groupTasks]) => (
            <div key={groupName} className="space-y-3">
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#2d3025]">{groupName}</h3>
                  <span className="text-[10px] font-bold text-[#8D7F72] bg-[#E6DFD3] px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                </div>
              )}
              <div className="space-y-2">
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={selectedTaskIds.has(task.id)}
                    onToggleSelect={() => toggleSelect(task.id)}
                    onToggle={() => onToggleTask(task.id)}
                    onDelete={() => onDeleteTask(task.id)}
                    onView={() => onViewTaskDetails?.(task.id)}
                    todayDate={todayDate}
                  />
                ))}
                {groupTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-[#9D978B]">تسکی یافت نشد</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'table' && (
        <Suspense fallback={<div className="text-center py-10 text-sm text-[#9D978B]">در حال بارگذاری جدول...</div>}>
          <TaskTableView
            tasks={filteredTasks}
            goals={goals}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onUpdateTask={onUpdateTask}
            onViewTaskDetails={onViewTaskDetails}
            todayDate={todayDate}
          />
        </Suspense>
      )}

      {viewMode === 'kanban' && (
        <Suspense fallback={<div className="text-center py-10 text-sm text-[#9D978B]">در حال بارگذاری کانبان...</div>}>
          <TaskKanbanView
            tasks={filteredTasks}
            goals={goals}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onUpdateTask={onUpdateTask}
            onViewTaskDetails={onViewTaskDetails}
            groupBy={kanbanGroup}
          />
        </Suspense>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color} shadow-sm`}>
      <div className="text-2xl font-black">{value.toLocaleString('fa-IR')}</div>
      <div className="text-xs font-bold opacity-80 mt-1">{label}</div>
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[#E6DFD3] bg-white px-3 py-2 text-sm text-[#2d3025] focus:border-[#7C8363] focus:outline-none focus:ring-1 focus:ring-[#7C8363]/20 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-[#E6DFD3] bg-white overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-bold transition-colors ${
            value === o.value
              ? 'bg-[#2d3025] text-white'
              : 'text-[#5f6156] hover:bg-[#f3ebdf]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TaskRow({
  task,
  selected,
  onToggleSelect,
  onToggle,
  onDelete,
  onView,
  todayDate,
}: {
  task: Task & { sourceGoal?: string; sourceProject?: string }
  selected: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onDelete: () => void
  onView?: () => void
  todayDate: string
}) {
  const isOverdue = !task.completed && task.dueDate && task.dueDate < todayDate

  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all hover:shadow-sm ${
        task.completed
          ? 'border-[#E6DFD3] bg-[#f9f7f2] opacity-60'
          : isOverdue
            ? 'border-[#c44a3d]/30 bg-[#c44a3d]/5'
            : 'border-[#E6DFD3] bg-white hover:border-[#7C8363]/40'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        className="w-4 h-4 rounded border-[#E6DFD3] text-[#7C8363] focus:ring-[#7C8363]/20 cursor-pointer"
      />
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          task.completed
            ? 'bg-[#7C8363] border-[#7C8363] text-white'
            : 'border-[#E6DFD3] hover:border-[#7C8363]'
        }`}
      >
        {task.completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            onClick={onView}
            className={`text-sm font-bold cursor-pointer ${task.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025] hover:text-[#7C8363]'}`}
          >
            {task.title}
          </span>
          {task.isDailyHighlight && (
            <span className="text-[10px] font-bold bg-[#d4a017]/15 text-[#b8860b] px-1.5 py-0.5 rounded">⭐ برجسته</span>
          )}
          {isOverdue && (
            <span className="text-[10px] font-bold bg-[#c44a3d]/15 text-[#c44a3d] px-1.5 py-0.5 rounded">تاریخ گذشته</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priority && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${priorityColors[task.priority] || priorityColors.low}`}>
              {priorityLabels[task.priority] || 'متوسط'}
            </span>
          )}
          {task.category && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${categoryColors[task.category] || categoryColors.other}`}>
              {categoryLabels[task.category] || 'سایر'}
            </span>
          )}
          {task.dueDate && (
            <span className="text-[10px] font-bold text-[#8D7F72]">📅 {task.dueDate}</span>
          )}
          {task.sourceProject && (
            <span className="text-[10px] font-bold text-[#5a6b8a]">📁 {task.sourceProject}</span>
          )}
          {task.sourceGoal && !task.sourceProject && (
            <span className="text-[10px] font-bold text-[#6b5a8a]">🎯 {task.sourceGoal}</span>
          )}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-[#c44a3d] hover:bg-[#c44a3d]/10 rounded-lg p-1.5 transition-all"
        title="حذف"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  )
}
