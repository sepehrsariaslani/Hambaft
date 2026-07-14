import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import type { Task, Goal } from '../types'
import ViewSwitcher, { type ViewMode } from './ViewSwitcher'
import { ImportanceBadge, ImportanceSelector, BlockedTaskIndicator, TaskImpactBanner, ImpactScoreBadge, sortTasksByImpact } from './TaskV2Shared'
import type { ImportanceLevel } from './TaskV2Shared'
import { updateTaskImportance, quickAddTask, bulkUpdateTasks, deleteTaskRecord, mapBackendTaskRecord } from '../../app/hambaft-api'
import { ColumnConfigurator } from './ColumnConfigurator'
import { DensityToggle } from './DensityToggle'
import { type ViewConfig, type DensityMode, type ColumnId, DENSITY_CONFIG, isColumnVisible, getOrInitViewConfig, setViewConfig } from './ViewConfigStore'
import QuickAddBar from './QuickAddBar'
import TaskRowV2 from './TaskRowV2'
import TaskDetailDrawer from './TaskDetailDrawer'

const TaskTableView = lazy(() => import('./TaskTableView'))
const TaskKanbanView = lazy(() => import('./TaskKanbanView'))
const TaskTreeView = lazy(() => import('./TaskTreeView'))

interface TaskManagerSectionProps {
  tasks: Task[]
  goals: Goal[]
  areas?: any[]
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onUpdateTask: (task: Task) => void
  onAddTask: (titleOrTask: string | Task) => void
  onViewTaskDetails?: (id: string) => void
  todayDate: string
  /** Open the detail drawer for this task on mount (e.g. deep-link) */
  initialDrawerTaskId?: string | null
  /** Navigate to a related entity (goals, projects, etc.) */
  onNavigate?: (tab: string, id?: string) => void
}

type GroupBy = 'none' | 'project' | 'priority' | 'status' | 'category' | 'dueDate' | 'importance'
type SortBy = 'dueDate' | 'priority' | 'createdAt' | 'title' | 'impact'
type FilterStatus = 'all' | 'open' | 'completed'
type KanbanGroup = 'status' | 'priority' | 'project' | 'importance'

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
  finance: 'bg-[#F9F1D8] text-[#5A5A40] border-[#EBE3C8]',
  learning: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  other: 'bg-[#F9F6EE] text-[#8D7F72] border-[#D6CFC3]',
}

function collectAllTasks(tasks: Task[], goals: Goal[]): Array<Task & { sourceGoal?: string; sourceProject?: string }> {
  // Tasks are now unified — project tasks ARE real Task records with projectId set.
  // The global tasks list already includes them, so we just need to annotate
  // which project/goal they belong to. We NO longer merge project.tasks separately
  // because that would duplicate tasks that already exist in the global list.
  const projectMap = new Map<string, { goalTitle: string; projectTitle: string }>()
  for (const goal of goals) {
    for (const project of (goal.projects || [])) {
      projectMap.set(project.id, { goalTitle: goal.title, projectTitle: project.title })
    }
  }

  const seen = new Set<string>()
  const all: Array<Task & { sourceGoal?: string; sourceProject?: string }> = []
  for (const t of tasks) {
    const key = t.id
    if (seen.has(key)) continue
    seen.add(key)
    const meta = t.projectId ? projectMap.get(t.projectId) : undefined
    all.push({
      ...t,
      sourceGoal: meta?.goalTitle || undefined,
      sourceProject: meta?.projectTitle || undefined,
    })
  }
  return all
}

export default function TaskManagerSection({
  tasks,
  goals,
  areas = [],
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onAddTask,
  onViewTaskDetails,
  todayDate,
  initialDrawerTaskId = null,
  onNavigate,
}: TaskManagerSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterImportance, setFilterImportance] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [sortBy, setSortBy] = useState<SortBy>('dueDate')
  const [kanbanGroup, setKanbanGroup] = useState<KanbanGroup>('status')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  // Task detail drawer
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(() => {
    // Temp/local IDs (tk-*) are never valid for deep-links — they are client-side
    // placeholders that get replaced by real backend IDs after persistence.
    if (initialDrawerTaskId && initialDrawerTaskId.startsWith('tk-')) return null
    return initialDrawerTaskId
  })

  // Sync deep-link changes (ignore temp IDs)
  useEffect(() => {
    if (initialDrawerTaskId && !initialDrawerTaskId.startsWith('tk-')) {
      setDrawerTaskId(initialDrawerTaskId)
    }
  }, [initialDrawerTaskId])

  // Notion-like view config (columns, density, saved views)
  const [viewConfig, setViewConfig] = useState<ViewConfig>(() =>
    getOrInitViewConfig('task-manager', 'مدیریت تسک')
  )
  const density = viewConfig.density
  const dCfg = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable
  const handleViewConfigChange = (cfg: ViewConfig) => {
    setViewConfig(cfg)
    setViewConfig('task-manager', cfg)
  }

  const allTasks = useMemo(() => collectAllTasks(tasks, goals), [tasks, goals])
  const drawerTask = drawerTaskId ? allTasks.find(t => t.id === drawerTaskId) || null : null

  const filteredTasks = useMemo(() => {
    let result = allTasks.filter((t) => {
      // Hide subtasks from top-level list — they appear under their parent's accordion
      if (t.parentTaskId) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false
      }
      if (filterStatus === 'open' && t.completed) return false
      if (filterStatus === 'completed' && !t.completed) return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (filterImportance !== 'all' && t.importance !== filterImportance) return false
      return true
    })

    result.sort((a, b) => {
      if (sortBy === 'impact') {
        return sortTasksByImpact(a, b)
      }
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

  const statusLabelsMap: Record<string, string> = {
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
        key = statusLabelsMap[t.status || 'inbox'] || 'صندوق ورودی'
      } else if (groupBy === 'category') {
        key = categoryLabels[t.category || 'other'] || 'سایر'
      } else if (groupBy === 'importance') {
        const impLabels: Record<string, string> = { milestone: 'نقطه‌عطف', key: 'کلیدی', normal: 'عادی' }
        key = impLabels[t.importance || 'normal'] || 'عادی'
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

  const handleAdd = useCallback(async (data: {
    title: string; status?: string; priority?: string; importance?: ImportanceLevel;
    projectId?: string; areaId?: string; goalId?: string;
    scheduledDate?: string; dueDate?: string
  }) => {
    try {
      const response: any = await quickAddTask(data.title, {
        project: data.projectId,
        area: data.areaId,
        goal: data.goalId,
        importance: data.importance,
        status: data.status,
        priority: data.priority,
        scheduledDate: data.scheduledDate,
        dueDate: data.dueDate,
        context: 'task_manager',
      })
      const saved = response?.data?.task
      if (saved?.name) {
        onAddTask(mapBackendTaskRecord(saved))
        return
      }
      onAddTask(data.title)
    } catch (e) {
      // Fallback to legacy add
      onAddTask(data.title)
    }
  }, [onAddTask])

  const toggleSelect = (id: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Quick action handler for TaskRowV2
  const handleQuickAction = useCallback((taskId: string, field: string, value: any) => {
    const task = allTasks.find(t => t.id === taskId)
    if (!task) return
    onUpdateTask({ ...task, [field]: value })
  }, [allTasks, onUpdateTask])

  const stats = useMemo(() => {
    const total = allTasks.length
    const completed = allTasks.filter(t => t.completed).length
    const overdue = allTasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayDate).length
    const highPriority = allTasks.filter(t => !t.completed && t.priority === 'high').length
    const milestones = allTasks.filter(t => !t.completed && t.importance === 'milestone').length
    const keyTasks = allTasks.filter(t => !t.completed && t.importance === 'key').length
    const blocked = allTasks.filter(t => !t.completed && (t.blockedBy || []).length > 0).length
    return { total, completed, overdue, highPriority, milestones, keyTasks, blocked }
  }, [allTasks, todayDate])

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="کل تسک‌ها" value={stats.total} color="bg-[#2d3025] dark:bg-[#E8ECE0] text-white dark:text-[#121411]" />
        <StatCard label="انجام‌شده" value={stats.completed} color="bg-[#7C8363] text-white" />
        <StatCard label="تاریخ گذشته" value={stats.overdue} color="bg-[#c44a3d] text-white" />
        <StatCard label="اولویت بالا" value={stats.highPriority} color="bg-[#d4a017] text-white" />
        <StatCard label="نقطه‌عطف" value={stats.milestones} color="bg-[#9B6B61] text-white" />
        <StatCard label="کلیدی" value={stats.keyTasks} color="bg-blue-700 text-white" />
        <StatCard label="مسدود" value={stats.blocked} color="bg-red-600 text-white" />
      </div>

      {/* Bulk Actions Bar — shown when tasks are selected */}
      {selectedTaskIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[#7C8363]/10 border border-[#7C8363]/30 rounded-2xl px-4 py-3">
          <span className="text-xs font-black text-[#7C8363]">
            {selectedTaskIds.size} تسک انتخاب‌شده
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <select
              className="text-[10px] px-2 py-1.5 rounded-lg border border-[#D6CFC3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] dark:text-[#E8ECE0] font-bold"
              defaultValue=""
              onChange={async (e) => {
                if (!e.target.value) return
                await bulkUpdateTasks(Array.from(selectedTaskIds), { status: e.target.value })
                setSelectedTaskIds(new Set())
                onAddTask('') // trigger parent refresh
                e.target.value = ''
              }}
            >
              <option value="">تغییر وضعیت</option>
              <option value="inbox">صندوق ورودی</option>
              <option value="today">امروز</option>
              <option value="next">بعدی</option>
              <option value="in_progress">در حال انجام</option>
              <option value="done">انجام‌شده</option>
              <option value="on_hold">متوقف</option>
              <option value="someday">شاید</option>
            </select>
            <select
              className="text-[10px] px-2 py-1.5 rounded-lg border border-[#D6CFC3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] dark:text-[#E8ECE0] font-bold"
              defaultValue=""
              onChange={async (e) => {
                if (!e.target.value) return
                await bulkUpdateTasks(Array.from(selectedTaskIds), { priority: e.target.value })
                setSelectedTaskIds(new Set())
                onAddTask('') // trigger parent refresh
                e.target.value = ''
              }}
            >
              <option value="">تغییر اولویت</option>
              <option value="urgent">فوری</option>
              <option value="high">بالا</option>
              <option value="medium">متوسط</option>
              <option value="low">پایین</option>
            </select>
            <select
              className="text-[10px] px-2 py-1.5 rounded-lg border border-[#D6CFC3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] dark:text-[#E8ECE0] font-bold"
              defaultValue=""
              onChange={async (e) => {
                if (!e.target.value) return
                await bulkUpdateTasks(Array.from(selectedTaskIds), { importance: e.target.value })
                setSelectedTaskIds(new Set())
                onAddTask('') // trigger parent refresh
                e.target.value = ''
              }}
            >
              <option value="">تغییر اهمیت</option>
              <option value="milestone">نقطه‌عطف</option>
              <option value="key">کلیدی</option>
              <option value="normal">عادی</option>
            </select>
            <button
              onClick={async () => {
                if (!confirm(`${selectedTaskIds.size} تسک حذف شود؟`)) return
                for (const id of selectedTaskIds) {
                  await deleteTaskRecord(id)
                }
                setSelectedTaskIds(new Set())
                onAddTask('') // trigger parent refresh
              }}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold hover:bg-red-100 transition-colors"
            >
              حذف
            </button>
            <button
              onClick={() => setSelectedTaskIds(new Set())}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#1B1D16] text-[#8D7F72] dark:text-[#9D978B] border border-[#D6CFC3] dark:border-[#3D4133] font-bold hover:bg-[#F9F6EE] transition-colors"
            >
              لغو انتخاب
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Bar */}
      <QuickAddBar
        placeholder="تسک جدید بنویس و Enter بزن..."
        context="task_manager"
        projects={goals.flatMap(g => (g.projects || []).map(p => ({ id: p.id, title: p.title })))}
        areas={areas}
        goals={goals.map(g => ({ id: g.id, title: g.title }))}
        onSubmit={handleAdd}
      />

      {/* View Controls */}
      <div className="flex gap-2 items-center justify-end">
        <DensityToggle density={density} onChange={(d) => handleViewConfigChange({ ...viewConfig, density: d })} />
        <ColumnConfigurator config={viewConfig} onConfigChange={handleViewConfigChange} />
      </div>

      {/* Filters & Controls */}
      <div className="rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133] bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9D978B]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در تسک‌ها..."
              className="w-full rounded-lg border border-[#E6DFD3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] pr-9 pl-3 py-2 text-sm text-[#2d3025] dark:text-[#E8ECE0] placeholder:text-[#9D978B] focus:border-[#7C8363] focus:outline-none focus:ring-1 focus:ring-[#7C8363]/20"
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

          <Select value={filterImportance} onChange={(v) => setFilterImportance(v)} options={[
            { value: 'all', label: 'همه اهمیت‌ها' },
            { value: 'milestone', label: '◆ نقطه‌عطف' },
            { value: 'key', label: '★ کلیدی' },
            { value: 'normal', label: '○ عادی' },
          ]} />
        </div>

        <div className="flex flex-wrap gap-3 items-center border-t border-[#E6DFD3] dark:border-[#3D4133] pt-3">
          {/* View Switcher — reusable component */}
          <ViewSwitcher
            views={[
              { id: 'list', label: 'لیست', emoji: '🗂️' },
              { id: 'table', label: 'جدول', emoji: '⊞' },
              { id: 'kanban', label: 'کانبان', emoji: '📋' },
              { id: 'tree', label: 'درخت', emoji: '🌲' },
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
                { value: 'importance', label: 'اهمیت' },
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
                { value: 'importance', label: 'اهمیت' },
                { value: 'category', label: 'دسته' },
                { value: 'dueDate', label: 'تاریخ' },
              ]} />
            </>
          )}

          <span className="text-xs font-bold text-[#8D7F72] mr-2">مرتب‌سازی:</span>
          <Segmented value={sortBy} onChange={(v) => setSortBy(v as SortBy)} options={[
            { value: 'impact', label: 'تأثیر' },
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
                  <h3 className="text-sm font-black text-[#2d3025] dark:text-[#E8ECE0]">{groupName}</h3>
                  <span className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] bg-[#E6DFD3] dark:bg-[#3D4133] px-2 py-0.5 rounded-full">{groupTasks.length}</span>
                </div>
              )}
              <div className="space-y-2">
                {groupTasks.map((task) => (
                  <TaskRowV2
                    key={task.id}
                    task={task}
                    selected={selectedTaskIds.has(task.id)}
                    onToggleSelect={() => toggleSelect(task.id)}
                    onToggle={() => onToggleTask(task.id)}
                    onDelete={() => onDeleteTask(task.id)}
                    onView={() => onViewTaskDetails ? onViewTaskDetails(task.id) : setDrawerTaskId(task.id)}
                    onOpenDrawer={() => setDrawerTaskId(task.id)}
                    onQuickAction={handleQuickAction}
                    onToggleSubtask={(subtaskId) => onToggleTask(subtaskId)}
                    onDeleteSubtask={(id) => onDeleteTask(id)}
                    onViewSubtask={(id) => onViewTaskDetails ? onViewTaskDetails(id) : setDrawerTaskId(id)}
                    onAddTask={onAddTask}
                    allTasks={allTasks}
                    todayDate={todayDate}
                    viewConfig={viewConfig}
                    dCfg={dCfg}
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
            onOpenTaskDrawer={(id) => setDrawerTaskId(id)}
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
            onOpenTaskDrawer={(id) => setDrawerTaskId(id)}
            groupBy={kanbanGroup}
          />
        </Suspense>
      )}

      {viewMode === 'tree' && (
        <Suspense fallback={<div className="text-center py-10 text-sm text-[#9D978B]">در حال بارگذاری درخت...</div>}>
          <TaskTreeView
            tasks={filteredTasks}
            goals={goals}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onUpdateTask={onUpdateTask}
            onAddTask={onAddTask}
            onViewTaskDetails={onViewTaskDetails}
            onOpenTaskDrawer={(id) => setDrawerTaskId(id)}
            todayDate={todayDate}
          />
        </Suspense>
      )}

      {/* Task Detail Drawer */}
      {drawerTask && (
        <TaskDetailDrawer
          task={drawerTask}
          allTasks={allTasks}
          goals={goals}
          projects={goals.flatMap(g => (g.projects || []).map(p => ({ id: p.id, title: p.title, linkedGoalId: p.linkedGoalId, areaId: p.areaId })))}
          areas={areas}
          onUpdateTask={onUpdateTask}
          onAddTask={onAddTask}
          onDeleteTask={(id) => { onDeleteTask(id); setDrawerTaskId(null) }}
          onClose={() => setDrawerTaskId(null)}
          onNavigate={onNavigate}
          onOpenFullPage={(taskId) => { setDrawerTaskId(null); onViewTaskDetails?.(taskId); }}
        />
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
      className="rounded-lg border border-[#E6DFD3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] px-3 py-2 text-sm text-[#2d3025] dark:text-[#E8ECE0] focus:border-[#7C8363] focus:outline-none focus:ring-1 focus:ring-[#7C8363]/20 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-[#E6DFD3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-bold transition-colors ${
            value === o.value
              ? 'bg-[#2d3025] dark:bg-[#E8ECE0] text-white dark:text-[#121411]'
              : 'text-[#5f6156] dark:text-[#9D978B] hover:bg-[#f3ebdf] dark:hover:bg-[#3D4133]'
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
  viewConfig,
  dCfg,
}: {
  task: Task & { sourceGoal?: string; sourceProject?: string }
  selected: boolean
  onToggleSelect: () => void
  onToggle: () => void
  onDelete: () => void
  onView?: () => void
  todayDate: string
  viewConfig: ViewConfig
  dCfg: typeof DENSITY_CONFIG.comfortable
}) {
  const isOverdue = !task.completed && task.dueDate && task.dueDate < todayDate
  const hasBlockers = (task.blockedBy || []).length > 0

  return (
    <div
      className={`group flex items-start ${dCfg.gap} rounded-xl border ${dCfg.rowPadding} transition-all hover:shadow-sm ${
        task.completed
          ? 'border-[#E6DFD3] dark:border-[#3D4133] bg-[#f9f7f2] dark:bg-[#1B1D16] opacity-60'
          : isOverdue
            ? 'border-[#c44a3d]/30 bg-[#c44a3d]/5'
            : hasBlockers
              ? 'border-orange-200 bg-orange-50/30 hover:border-orange-300'
              : 'border-[#E6DFD3] dark:border-[#3D4133] bg-white dark:bg-[#1B1D16] hover:border-[#7C8363]/40'
      }`}
    >
      <div className={`flex items-center ${dCfg.gap} pt-0.5`}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-[#E6DFD3] dark:border-[#3D4133] text-[#7C8363] dark:text-[#9ECE9A] focus:ring-[#7C8363]/20 cursor-pointer"
        />
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-[#7C8363] border-[#7C8363] text-white'
              : 'border-[#E6DFD3] dark:border-[#3D4133] hover:border-[#7C8363]'
          }`}
        >
          {task.completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </button>
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className={`flex items-center ${dCfg.gap} flex-wrap`}>
          <span
            onClick={onView}
            className={`${dCfg.textSize} font-bold cursor-pointer ${task.completed ? 'line-through text-[#9D978B]' : 'text-[#2d3025] hover:text-[#7C8363]'}`}
          >
            {task.title}
          </span>
          {isColumnVisible(viewConfig, 'importance') && task.importance && task.importance !== 'normal' && (
            <ImportanceBadge importance={task.importance} size="xs" />
          )}
          {isColumnVisible(viewConfig, 'impactScore') && task.impactScore != null && task.impactScore >= 30 && !task.completed && (
            <ImpactScoreBadge score={task.impactScore} />
          )}
          {isColumnVisible(viewConfig, 'isDailyHighlight') && task.isDailyHighlight && (
            <span className={`${dCfg.badgeSize} font-bold bg-[#d4a017]/15 text-[#b8860b] rounded`}>⭐ برجسته</span>
          )}
          {isColumnVisible(viewConfig, 'dueDate') && isOverdue && (
            <span className={`${dCfg.badgeSize} font-bold bg-[#c44a3d]/15 text-[#c44a3d] rounded`}>تاریخ گذشته</span>
          )}
        </div>
        <div className={`flex items-center ${dCfg.gap} flex-wrap`}>
          {isColumnVisible(viewConfig, 'status') && task.status && (
            <span className={`${dCfg.badgeSize} font-bold rounded bg-[#f3ebdf] dark:bg-[#3D4133]/50 text-[#8D7F72] dark:text-[#9D978B]`}>
              {statusLabelsMap[task.status] || task.status}
            </span>
          )}
          {isColumnVisible(viewConfig, 'priority') && task.priority && (
            <span className={`${dCfg.badgeSize} font-bold rounded border ${priorityColors[task.priority] || priorityColors.low}`}>
              {priorityLabels[task.priority] || 'متوسط'}
            </span>
          )}
          {isColumnVisible(viewConfig, 'category') && task.category && (
            <span className={`${dCfg.badgeSize} font-bold rounded border ${categoryColors[task.category] || categoryColors.other}`}>
              {categoryLabels[task.category] || 'سایر'}
            </span>
          )}
          {isColumnVisible(viewConfig, 'dueDate') && task.dueDate && (
            <span className={`${dCfg.badgeSize} font-bold text-[#8D7F72]`}>📅 {task.dueDate}</span>
          )}
          {isColumnVisible(viewConfig, 'project') && task.sourceProject && (
            <span className={`${dCfg.badgeSize} font-bold text-[#5a6b8a]`}>📁 {task.sourceProject}</span>
          )}
          {isColumnVisible(viewConfig, 'goal') && task.sourceGoal && !task.sourceProject && (
            <span className={`${dCfg.badgeSize} font-bold text-[#6b5a8a]`}>🎯 {task.sourceGoal}</span>
          )}
          {isColumnVisible(viewConfig, 'estimatedMinutes') && task.estimatedMinutes && (
            <span className={`${dCfg.badgeSize} font-bold text-indigo-600`}>⏱ {task.estimatedMinutes} دقیقه</span>
          )}
          {isColumnVisible(viewConfig, 'effortType') && task.effortType && (
            <span className={`${dCfg.badgeSize} font-bold text-[#8D7F72]`}>{task.effortType === 'fixed' ? 'ثابت' : 'متغیر'}</span>
          )}
        </div>
        {/* Blocked indicator */}
        {hasBlockers && !task.completed && (
          <BlockedTaskIndicator task={task} />
        )}
        {/* Impact context */}
        {(task.impactGoalTitle || task.impactProjectTitle) && !task.completed && (
          <TaskImpactBanner task={task} />
        )}
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
