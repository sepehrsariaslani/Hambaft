import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Inbox,
  CalendarDays,
  ArrowRight,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronLeft,
  Layers,
  Archive,
  Sunrise,
  Timer,
  LayoutGrid,
  Calendar,
  BarChart3,
  FolderKanban,
  Grid3X3,
  AlertCircle,
  SkipForward,
} from 'lucide-react'
import type { Task, TaskSession } from '../types'
import {
  getPlannerInbox,
  getPlannerToday,
  getPlannerNext,
  getPlannerScheduled,
  getPlannerSomeday,
  moveTaskToBucket,
  startTaskSession,
  stopTaskSession,
  getActiveTaskSession,
  getPlannerDailyTimeline,
  getPlannerWeek,
  getPlannerMonth,
  getTasksGroupedByStatus,
  getAreasWithSummaries,
  updateTaskImportance,
  resolveBlockedTasks,
  getOverdueTasks,
  getKeyTasks,
  getMilestoneTasks,
  getUnscheduledTasks,
  getBlockedTasksView,
  getHighImpactTasks,
  quickAddTask,
} from '../../app/hambaft-api'
import { ImportanceBadge, ImportanceSelector, BlockedTaskIndicator, TaskImpactBanner, ImpactScoreBadge, TaskImpactExplanation } from './TaskV2Shared'
import type { ImportanceLevel } from './TaskV2Shared'
import { ColumnConfigurator } from './ColumnConfigurator'
import { DensityToggle } from './DensityToggle'
import { type ViewConfig, type DensityMode, type ColumnId, DENSITY_CONFIG, isColumnVisible, getOrInitViewConfig, setViewConfig } from './ViewConfigStore'
import QuickAddBar from './QuickAddBar'
import TaskRowV2 from './TaskRowV2'
import TaskDetailDrawer from './TaskDetailDrawer'
import { deleteTaskRecord } from '../../app/hambaft-api'

type PlannerBucket = 'inbox' | 'today' | 'next' | 'scheduled' | 'someday' | 'overdue' | 'key' | 'milestone' | 'blocked' | 'unscheduled' | 'high_impact'
type PlannerView = 'buckets' | 'timeline' | 'week' | 'month' | 'board' | 'areas'

const BUCKETS: { id: PlannerBucket; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'inbox', label: 'صندوق ورودی', icon: <Inbox className="w-4 h-4" />, color: 'text-amber-600' },
  { id: 'today', label: 'امروز', icon: <Sunrise className="w-4 h-4" />, color: 'text-emerald-600' },
  { id: 'next', label: 'بعدی', icon: <ArrowRight className="w-4 h-4" />, color: 'text-blue-600' },
  { id: 'scheduled', label: 'زمان‌بندی‌شده', icon: <CalendarDays className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'someday', label: 'شاید', icon: <Archive className="w-4 h-4" />, color: 'text-gray-500' },
  // Saved filter views
  { id: 'overdue', label: 'تاریخ‌گذشته', icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-600' },
  { id: 'high_impact', label: 'تأثیر بالا', icon: <BarChart3 className="w-4 h-4" />, color: 'text-amber-700' },
  { id: 'milestone', label: 'نقاط عطف', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-amber-600' },
  { id: 'key', label: 'کلیدی', icon: <SkipForward className="w-4 h-4" />, color: 'text-blue-700' },
  { id: 'blocked', label: 'مسدود', icon: <AlertCircle className="w-4 h-4" />, color: 'text-orange-600' },
  { id: 'unscheduled', label: 'بدون برنامه', icon: <Layers className="w-4 h-4" />, color: 'text-gray-400' },
]

const VIEW_TABS: { id: PlannerView; label: string; icon: React.ReactNode }[] = [
  { id: 'buckets', label: 'بخش‌ها', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'timeline', label: 'تایم‌لاین', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'week', label: 'هفتگی', icon: <Calendar className="w-3.5 h-3.5" /> },
  { id: 'month', label: 'ماهانه', icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { id: 'board', label: 'بورد', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { id: 'areas', label: 'حوزه‌ها', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
]

const STATUS_LABELS: Record<string, string> = {
  inbox: 'صندوق ورودی',
  not_started: 'شروع‌نشده',
  next: 'بعدی',
  today: 'امروز',
  in_progress: 'در حال انجام',
  done: 'انجام‌شده',
  on_hold: 'متوقف',
  someday: 'شاید',
  dropped: 'حذف‌شده',
}

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-amber-50 text-amber-700 border-amber-200',
  not_started: 'bg-gray-50 text-gray-600 border-gray-200',
  next: 'bg-blue-50 text-blue-700 border-blue-200',
  today: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  done: 'bg-green-50 text-green-700 border-green-200 line-through',
  on_hold: 'bg-orange-50 text-orange-700 border-orange-200',
  someday: 'bg-gray-50 text-gray-500 border-gray-200',
  dropped: 'bg-red-50 text-red-700 border-red-200 line-through',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
  urgent: 'فوری',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-50 text-gray-500',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-red-50 text-red-600',
  urgent: 'bg-red-100 text-red-700 font-black',
}

export default function PlannerSection() {
  const [activeView, setActiveView] = useState<PlannerView>('buckets')
  const [activeBucket, setActiveBucket] = useState<PlannerBucket>('today')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<TaskSession | null>(null)
  const [sessionTaskTitle, setSessionTaskTitle] = useState('')
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null)
  // Notion-like view config (columns, density, saved views)
  const [viewConfig, setViewConfig] = useState<ViewConfig>(() =>
    getOrInitViewConfig('planner-buckets', 'برنامه‌ریز')
  )
  const density = viewConfig.density
  const dCfg = DENSITY_CONFIG[density]
  const drawerTask = drawerTaskId ? tasks.find(t => t.id === drawerTaskId) || null : null
  const handleViewConfigChange = (cfg: ViewConfig) => {
    setViewConfig(cfg)
    setViewConfig('planner-buckets', cfg)
  }

  // Timeline view state
  const [timelineDate, setTimelineDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [timelineData, setTimelineData] = useState<any>(null)

  // Week view state
  const [weekStartDate, setWeekStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [weekData, setWeekData] = useState<Record<string, any[]>>({})

  // Month view state
  const [monthYear, setMonthYear] = useState(new Date().getFullYear())
  const [monthMonth, setMonthMonth] = useState(new Date().getMonth() + 1)
  const [monthData, setMonthData] = useState<Record<string, any[]>>({})

  // Board view state
  const [boardData, setBoardData] = useState<Record<string, any[]>>({})

  // Areas view state
  const [areasData, setAreasData] = useState<any[]>([])

  // ─── Bucket data fetching ──────────────────────────────────
  const fetchBucket = useCallback(async (bucket: PlannerBucket) => {
    setLoading(true)
    try {
      let resp
      switch (bucket) {
        case 'inbox': resp = await getPlannerInbox(); break
        case 'today': resp = await getPlannerToday(); break
        case 'next': resp = await getPlannerNext(); break
        case 'scheduled': resp = await getPlannerScheduled(); break
        case 'someday': resp = await getPlannerSomeday(); break
        case 'overdue': resp = await getOverdueTasks(); break
        case 'key': resp = await getKeyTasks(); break
        case 'milestone': resp = await getMilestoneTasks(); break
        case 'blocked': resp = await getBlockedTasksView(); break
        case 'unscheduled': resp = await getUnscheduledTasks(); break
        case 'high_impact': resp = await getHighImpactTasks(); break
      }
      const rows = (resp as any)?.data?.tasks || []
      setTasks(rows.map(mapBackendTask))
    } catch (e) {
      console.error('fetchBucket error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Active session ────────────────────────────────────────
  const fetchActiveSession = useCallback(async () => {
    try {
      const resp = await getActiveTaskSession()
      const sess = (resp as any)?.data?.session
      if (sess) {
        setActiveSession({
          id: sess.name,
          taskId: sess.task,
          startedAt: sess.started_at,
          stoppedAt: sess.stopped_at,
          durationMinutes: sess.duration_minutes,
          status: sess.status,
          notes: sess.notes,
        })
        const t = tasks.find(x => x.id === sess.task)
        if (t) setSessionTaskTitle(t.title)
        else {
          // Try to find from title in active session data
          setSessionTaskTitle(sess.task_title || 'جلسه فعال')
        }
      } else {
        setActiveSession(null)
      }
    } catch (e) {
      // ignore
    }
  }, [tasks])

  // ─── Timeline fetching ─────────────────────────────────────
  const fetchTimeline = useCallback(async (date?: string) => {
    setLoading(true)
    try {
      const resp = await getPlannerDailyTimeline(date)
      const data = (resp as any)?.data
      if (data) {
        setTimelineData(data)
        const mapped = (data.tasks || []).map(mapBackendTask)
        setTasks(mapped)
      }
    } catch (e) {
      console.error('fetchTimeline error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Week fetching ─────────────────────────────────────────
  const fetchWeek = useCallback(async (startDate?: string) => {
    setLoading(true)
    try {
      const resp = await getPlannerWeek(startDate)
      const data = (resp as any)?.data
      if (data?.days) {
        setWeekData(data.days)
      }
    } catch (e) {
      console.error('fetchWeek error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Month fetching ────────────────────────────────────────
  const fetchMonth = useCallback(async (year?: number, month?: number) => {
    setLoading(true)
    try {
      const resp = await getPlannerMonth(year, month)
      const data = (resp as any)?.data
      if (data?.days) {
        setMonthData(data.days)
      }
    } catch (e) {
      console.error('fetchMonth error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Board fetching ────────────────────────────────────────
  const fetchBoard = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await getTasksGroupedByStatus()
      const data = (resp as any)?.data
      if (data?.status_groups) {
        setBoardData(data.status_groups)
      }
    } catch (e) {
      console.error('fetchBoard error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Areas fetching ────────────────────────────────────────
  const fetchAreas = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await getAreasWithSummaries()
      const data = (resp as any)?.data
      if (data?.areas) {
        setAreasData(data.areas)
      }
    } catch (e) {
      console.error('fetchAreas error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Effects ───────────────────────────────────────────────
  useEffect(() => {
    if (activeView === 'buckets') fetchBucket(activeBucket)
    else if (activeView === 'timeline') fetchTimeline(timelineDate)
    else if (activeView === 'week') fetchWeek(weekStartDate)
    else if (activeView === 'month') fetchMonth(monthYear, monthMonth)
    else if (activeView === 'board') fetchBoard()
    else if (activeView === 'areas') fetchAreas()
  }, [activeView, activeBucket, timelineDate, weekStartDate, monthYear, monthMonth, fetchBucket, fetchTimeline, fetchWeek, fetchMonth, fetchBoard, fetchAreas])

  useEffect(() => {
    fetchActiveSession()
    const interval = setInterval(fetchActiveSession, 30000)
    return () => clearInterval(interval)
  }, [fetchActiveSession])

  // ─── Handlers ──────────────────────────────────────────────
  const handleMove = async (taskId: string, bucket: Task['status']) => {
    try {
      await moveTaskToBucket(taskId, bucket)
      if (activeView === 'buckets') fetchBucket(activeBucket)
      else if (activeView === 'timeline') fetchTimeline(timelineDate)
      else if (activeView === 'board') fetchBoard()
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartSession = async (taskId: string) => {
    try {
      await startTaskSession(taskId)
      fetchActiveSession()
      if (activeView === 'buckets') fetchBucket(activeBucket)
      else if (activeView === 'timeline') fetchTimeline(timelineDate)
    } catch (e) {
      console.error(e)
    }
  }

  const handleStopSession = async () => {
    if (!activeSession) return
    try {
      await stopTaskSession(activeSession.id)
      fetchActiveSession()
      if (activeView === 'buckets') fetchBucket(activeBucket)
      else if (activeView === 'timeline') fetchTimeline(timelineDate)
    } catch (e) {
      console.error(e)
    }
  }

  // ─── Helpers ───────────────────────────────────────────────
  const getPersianDayName = (dateStr: string) => {
    const dayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
    const d = new Date(dateStr + 'T12:00:00')
    return dayNames[d.getDay()]
  }

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins} دقیقه`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}س ${m}د` : `${h} ساعت`
  }

  // ─── Render Task Card ──────────────────────────────────────
  const renderTaskCard = (task: Task, compact = false) => (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
    >
      <TaskRowV2
        task={task}
        selected={false}
        onToggleSelect={() => {}}
        onToggle={() => handleMove(task.id, task.status === 'done' ? 'inbox' : 'done')}
        onDelete={() => { deleteTaskRecord(task.id); loadBucket() }}
        onView={() => setDrawerTaskId(task.id)}
        onQuickAction={(taskId, field, value) => {
          if (field === 'status') handleMove(taskId, value)
          else if (field === 'importance') {
            updateTaskImportance(taskId, value).then(() => loadBucket()).catch(() => {})
          }
        }}
        onAddSubtask={() => setDrawerTaskId(task.id)}
        todayDate={new Date().toISOString().slice(0, 10)}
        viewConfig={viewConfig}
        dCfg={compact ? DENSITY_CONFIG.compact : dCfg}
      />
    </motion.div>
  )

  // ─── Render: Buckets View ──────────────────────────────────
  const renderBuckets = () => (
    <div className="space-y-3">
      {/* Bucket Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {BUCKETS.map(bucket => (
          <button
            key={bucket.id}
            onClick={() => setActiveBucket(bucket.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${
              activeBucket === bucket.id
                ? 'bg-[#7C8363] text-white shadow-sm'
                : 'bg-white dark:bg-[#1C1D17] text-[#8D7F72] border border-[#E6DFD3] dark:border-[#3D4133]/50'
            }`}
          >
            {bucket.icon}
            <span>{bucket.label}</span>
            {activeBucket === bucket.id && tasks.length > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Quick Add Task */}
      <QuickAddBar
        placeholder={
          activeBucket === 'today' ? 'تسک جدید برای امروز + Enter...' :
          activeBucket === 'inbox' ? 'تسک جدید به صندوق ورودی + Enter...' :
          activeBucket === 'next' ? 'تسک جدید بخش بعدی + Enter...' :
          'تسک جدید + Enter...'
        }
        context={
          activeBucket === 'today' ? 'planner_today' :
          activeBucket === 'inbox' ? 'planner_inbox' :
          activeBucket === 'next' ? 'planner_next' :
          activeBucket === 'scheduled' ? 'planner_scheduled' : 'planner_inbox'
        }
        onSubmit={async (data) => {
          try {
            await quickAddTask(data.title, {
              project: data.projectId,
              area: data.areaId,
              goal: data.goalId,
              importance: data.importance,
              context: data.status === 'today' ? 'planner_today' : data.status === 'next' ? 'planner_next' : 'planner_inbox',
            })
            fetchBucket(activeBucket)
          } catch (e) {
            console.error('quickAdd error:', e)
          }
        }}
        loading={false}
      />

      {/* Task List */}
      {loading ? (
        <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/50">
          <Inbox className="w-8 h-8 text-[#D6CFC3] mx-auto mb-2" />
          <p className="text-[10px] text-[#8D7F72]">هیچ تسکی در این بخش نیست</p>
        </div>
      ) : (
        <AnimatePresence>
          {tasks.map(task => renderTaskCard(task))}
        </AnimatePresence>
      )}
    </div>
  )

  // ─── Render: Timeline View ─────────────────────────────────
  const renderTimeline = () => (
    <div className="space-y-3">
      {/* Date Picker */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={timelineDate}
          onChange={e => setTimelineDate(e.target.value)}
          className="text-xs px-3 py-2 border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#1C1D17] text-[#2D3025] dark:text-[#E8ECE0]"
        />
        <button
          onClick={() => setTimelineDate(new Date().toISOString().slice(0, 10))}
          className="px-3 py-2 text-[10px] font-bold bg-[#7C8363] text-white rounded-xl"
        >
          امروز
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
      ) : (
        <>
          {/* Active Session Banner */}
          {timelineData?.active_session && (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 flex items-center gap-3">
              <Timer className="w-5 h-5 text-indigo-600 animate-pulse" />
              <div className="flex-1">
                <span className="text-[10px] font-black text-indigo-700">جلسه فعال</span>
                <p className="text-[8px] text-indigo-500">از {String(timelineData.active_session.started_at || '').slice(11, 16)}</p>
              </div>
            </div>
          )}

          {/* Time Blocks */}
          {timelineData?.time_blocks?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1">
                <Clock className="w-3 h-3" /> بلوک‌های زمانی
              </h4>
              {timelineData.time_blocks.map((block: any) => (
                <div key={block.name} className="bg-[#F9F6EE] dark:bg-[#1B1D16] rounded-xl p-2 flex items-center gap-2 border border-[#E6DFD3]/50">
                  <span className="text-[10px] font-mono font-bold text-[#7C8363]">{block.start_time?.slice(0, 5)}</span>
                  <span className="text-[10px] text-[#2D3025] dark:text-[#E8ECE0] truncate">{block.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1">
              <Layers className="w-3 h-3" /> تسک‌های امروز
            </h4>
            {tasks.length === 0 ? (
              <p className="text-[10px] text-[#8D7F72] text-center py-6">تسکی برای این روز نیست</p>
            ) : (
              <AnimatePresence>
                {tasks.map(task => renderTaskCard(task))}
              </AnimatePresence>
            )}
          </div>

          {/* Calendar Events */}
          {timelineData?.events?.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> رویدادها
              </h4>
              {timelineData.events.map((ev: any) => (
                <div key={ev.name} className="bg-purple-50 dark:bg-purple-950/10 rounded-xl p-2 flex items-center gap-2 border border-purple-200/50">
                  <span className="text-[10px] font-mono font-bold text-purple-600">
                    {String(ev.starts_at || '').slice(11, 16)}
                  </span>
                  <span className="text-[10px] text-purple-800 dark:text-purple-300 truncate">{ev.title}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )

  // ─── Render: Week View ─────────────────────────────────────
  const renderWeek = () => {
    const dates = []
    const base = new Date(weekStartDate + 'T12:00:00')
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 86400000)
      dates.push(d.toISOString().slice(0, 10))
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const prev = new Date(base.getTime() - 7 * 86400000)
              setWeekStartDate(prev.toISOString().slice(0, 10))
            }}
            className="p-2 bg-white dark:bg-[#1C1D17] border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl"
          >
            <SkipForward className="w-3.5 h-3.5 rotate-180" />
          </button>
          <span className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0]">
            از {dates[0]} تا {dates[6]}
          </span>
          <button
            onClick={() => {
              const next = new Date(base.getTime() + 7 * 86400000)
              setWeekStartDate(next.toISOString().slice(0, 10))
            }}
            className="p-2 bg-white dark:bg-[#1C1D17] border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWeekStartDate(new Date().toISOString().slice(0, 10))}
            className="px-3 py-2 text-[10px] font-bold bg-[#7C8363] text-white rounded-xl"
          >
            این هفته
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
        ) : (
          <div className="space-y-4">
            {dates.map(date => {
              const dayTasks = (weekData[date] || []).map(mapBackendTask)
              const isToday = date === new Date().toISOString().slice(0, 10)
              return (
                <div key={date} className={`rounded-2xl border p-3 space-y-2 ${
                  isToday
                    ? 'bg-[#E8ECE0]/40 dark:bg-[#1E2218]/40 border-[#7C8363]/50'
                    : 'bg-white dark:bg-[#1C1D17] border-[#E6DFD3] dark:border-[#3D4133]/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black ${isToday ? 'text-[#7C8363]' : 'text-[#8D7F72]'}`}>
                      {getPersianDayName(date)} — {date}
                    </span>
                    <span className="text-[8px] font-bold bg-[#F9F6EE] dark:bg-[#121411] px-2 py-0.5 rounded text-[#8D7F72]">
                      {dayTasks.length} تسک
                    </span>
                  </div>
                  {dayTasks.length === 0 ? (
                    <p className="text-[9px] text-[#D6CFC3]">بدون تسک</p>
                  ) : (
                    <div className="space-y-1">
                      {dayTasks.map(task => renderTaskCard(task, true))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Month View ────────────────────────────────────
  const renderMonth = () => {
    const days = Object.keys(monthData).sort()
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              let m = monthMonth - 1, y = monthYear
              if (m < 1) { m = 12; y-- }
              setMonthMonth(m); setMonthYear(y)
            }}
            className="p-2 bg-white dark:bg-[#1C1D17] border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl"
          >
            <SkipForward className="w-3.5 h-3.5 rotate-180" />
          </button>
          <span className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0]">
            {monthYear} / {monthMonth}
          </span>
          <button
            onClick={() => {
              let m = monthMonth + 1, y = monthYear
              if (m > 12) { m = 1; y++ }
              setMonthMonth(m); setMonthYear(y)
            }}
            className="p-2 bg-white dark:bg-[#1C1D17] border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const now = new Date()
              setMonthYear(now.getFullYear())
              setMonthMonth(now.getMonth() + 1)
            }}
            className="px-3 py-2 text-[10px] font-bold bg-[#7C8363] text-white rounded-xl"
          >
            این ماه
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
        ) : days.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3]">
            <CalendarDays className="w-8 h-8 text-[#D6CFC3] mx-auto mb-2" />
            <p className="text-[10px] text-[#8D7F72]">تسکی در این ماه نیست</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => (
              <div key={d} className="text-center text-[8px] font-black text-[#8D7F72] py-1">{d}</div>
            ))}
            {/* Fill empty cells before first day */}
            {(() => {
              const firstDay = new Date(days[0] + 'T12:00:00').getDay()
              // Saturday=6, Sunday=0... convert to Sat-first
              const offset = (firstDay + 1) % 7
              return Array.from({ length: offset }, (_, i) => (
                <div key={`empty-${i}`} className="min-h-[48px]" />
              ))
            })()}
            {/* Day cells */}
            {days.map(date => {
              const dayTasks = (monthData[date] || []).map(mapBackendTask)
              const isToday = date === new Date().toISOString().slice(0, 10)
              const dayNum = date.slice(8, 10)
              return (
                <div
                  key={date}
                  className={`min-h-[48px] rounded-xl p-1 text-center ${
                    isToday
                      ? 'bg-[#7C8363]/10 border border-[#7C8363]/40'
                      : 'bg-white/50 dark:bg-[#1C1D17]/50 border border-transparent'
                  }`}
                >
                  <span className={`text-[9px] font-bold ${isToday ? 'text-[#7C8363]' : 'text-[#8D7F72]'}`}>
                    {dayNum}
                  </span>
                  {dayTasks.length > 0 && (
                    <div className="mt-0.5 flex justify-center gap-0.5 flex-wrap">
                      {dayTasks.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'done' ? 'bg-emerald-400' :
                            t.status === 'today' ? 'bg-[#7C8363]' :
                            t.status === 'in_progress' ? 'bg-indigo-400' :
                            'bg-amber-400'
                          }`}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[7px] text-[#8D7F72]">+{dayTasks.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Board View ────────────────────────────────────
  const renderBoard = () => {
    const statusOrder = ['inbox', 'today', 'next', 'in_progress', 'on_hold', 'someday', 'done']

    return (
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {statusOrder.map(status => {
              const group = (boardData[status] || []).map(mapBackendTask)
              const milestoneCount = group.filter(t => t.importance === 'milestone').length
              const keyCount = group.filter(t => t.importance === 'key').length
              return (
                <div
                  key={status}
                  className="min-w-[220px] max-w-[280px] flex-1 bg-[#F9F6EE] dark:bg-[#1B1D16] rounded-2xl p-3 space-y-2 border border-[#E6DFD3]/50 dark:border-[#3D4133]/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      {milestoneCount > 0 && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">◆ {milestoneCount}</span>
                      )}
                      {keyCount > 0 && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">★ {keyCount}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-[#8D7F72]">{group.length}</span>
                  </div>
                  <div className="space-y-2">
                    {group.map(task => renderTaskCard(task, true))}
                  </div>
                  {group.length === 0 && (
                    <p className="text-[9px] text-[#D6CFC3] text-center py-4">خالی</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Areas Gallery ─────────────────────────────────
  const renderAreas = () => (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
      ) : areasData.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3]">
          <Grid3X3 className="w-8 h-8 text-[#D6CFC3] mx-auto mb-2" />
          <p className="text-[10px] text-[#8D7F72]">هیچ حوزه‌ای ثبت نشده</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {areasData.map((area: any) => (
            <div
              key={area.name || area.id}
              className="bg-white dark:bg-[#1C1D17] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/50 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{area.icon || '🎯'}</span>
                <div>
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{area.title}</h4>
                  {area.description && <p className="text-[8px] text-[#8D7F72] truncate max-w-[120px]">{area.description}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F9F6EE] dark:bg-[#121411] rounded-xl p-2 text-center">
                  <span className="text-[14px] font-black text-[#7C8363]">{area.project_count ?? 0}</span>
                  <span className="text-[8px] text-[#8D7F72] block">پروژه</span>
                </div>
                <div className="bg-[#F9F6EE] dark:bg-[#121411] rounded-xl p-2 text-center">
                  <span className="text-[14px] font-black text-[#E26645]">{area.task_count ?? 0}</span>
                  <span className="text-[8px] text-[#8D7F72] block">تسک</span>
                </div>
                <div className="bg-[#F9F6EE] dark:bg-[#121411] rounded-xl p-2 text-center">
                  <span className="text-[12px] font-black text-indigo-600">
                    {area.tracked_minutes ? formatMinutes(area.tracked_minutes) : '۰ دقیقه'}
                  </span>
                  <span className="text-[8px] text-[#8D7F72] block">زمان صرف‌شده</span>
                </div>
                {/* Goal health summary */}
                {area.goal_health_counts && (
                  <div className="bg-[#F9F6EE] dark:bg-[#121411] rounded-xl p-2 text-center">
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {area.goal_health_counts.on_track ? (
                        <span className="text-[8px] font-bold text-emerald-600">✓{area.goal_health_counts.on_track}</span>
                      ) : null}
                      {area.goal_health_counts.at_risk ? (
                        <span className="text-[8px] font-bold text-amber-600">⚠{area.goal_health_counts.at_risk}</span>
                      ) : null}
                      {area.goal_health_counts.off_track ? (
                        <span className="text-[8px] font-bold text-red-600">⊘{area.goal_health_counts.off_track}</span>
                      ) : null}
                      {area.goal_health_counts.needs_review ? (
                        <span className="text-[8px] font-bold text-yellow-600">?{area.goal_health_counts.needs_review}</span>
                      ) : null}
                    </div>
                    <span className="text-[8px] text-[#8D7F72] block">سلامت اهداف</span>
                  </div>
                )}
                {/* Milestone / Key counts */}
                {(area.milestone_total > 0 || area.key_total > 0) && (
                  <div className="bg-[#F9F6EE] dark:bg-[#121411] rounded-xl p-2 text-center col-span-2">
                    <div className="flex justify-center gap-3">
                      {area.milestone_total > 0 && (
                        <span className="text-[10px] font-bold text-amber-700">◆ {area.milestone_done ?? 0}/{area.milestone_total}</span>
                      )}
                      {area.key_total > 0 && (
                        <span className="text-[10px] font-bold text-blue-700">★ {area.key_done ?? 0}/{area.key_total}</span>
                      )}
                    </div>
                    <span className="text-[8px] text-[#8D7F72] block">نقاط عطف و کلیدی</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── Main Render ───────────────────────────────────────────
  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#7C8363]" />
          <span>برنامه‌ریز شخصی</span>
        </h2>
        <div className="flex items-center gap-2">
          <DensityToggle density={density} onChange={(d) => handleViewConfigChange({ ...viewConfig, density: d })} />
          <ColumnConfigurator config={viewConfig} onConfigChange={handleViewConfigChange} />
          {activeSession && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl">
              <Timer className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-700">{sessionTaskTitle || 'جلسه فعال'}</span>
              <button onClick={handleStopSession} className="p-1 bg-indigo-600 text-white rounded">
                <Pause className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {VIEW_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${
              activeView === tab.id
                ? 'bg-[#7C8363] text-white shadow-sm'
                : 'bg-white dark:bg-[#1C1D17] text-[#8D7F72] border border-[#E6DFD3] dark:border-[#3D4133]/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active View Content */}
      {activeView === 'buckets' && renderBuckets()}
      {activeView === 'timeline' && renderTimeline()}
      {activeView === 'week' && renderWeek()}
      {activeView === 'month' && renderMonth()}
      {activeView === 'board' && renderBoard()}
      {activeView === 'areas' && renderAreas()}

      {/* Task Detail Drawer — same drawer used in TaskManagerSection */}
      {drawerTask && (
        <TaskDetailDrawer
          task={drawerTask}
          onUpdateTask={() => {
            // Refresh the current bucket after any update
            fetchBucket(activeBucket)
          }}
          onDeleteTask={(id) => {
            deleteTaskRecord(id)
            setDrawerTaskId(null)
            fetchBucket(activeBucket)
          }}
          onClose={() => setDrawerTaskId(null)}
        />
      )}
    </div>
  )
}

function mapBackendTask(row: any): Task {
  return {
    id: row.name,
    title: row.title,
    completed: ['done', 'completed', 'انجام‌شده', 'انجام شده'].includes(String(row.status || '')),
    status: row.status || 'inbox',
    createdAt: row.creation ? String(row.creation).slice(0, 10) : today(),
    description: row.description,
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : undefined,
    scheduledDate: row.scheduled_date ? String(row.scheduled_date) : undefined,
    scheduledTime: row.scheduled_time ? String(row.scheduled_time) : undefined,
    priority: mapBackendTaskPriority(row.priority),
    category: mapBackendTaskCategory(row.category),
    projectId: row.project,
    parentTaskId: row.parent_task,
    blockedBy: row.blocked_by_json ? (typeof row.blocked_by_json === 'string' ? JSON.parse(row.blocked_by_json) : row.blocked_by_json) : [],
    blocking: row.blocking_json ? (typeof row.blocking_json === 'string' ? JSON.parse(row.blocking_json) : row.blocking_json) : [],
    isDailyHighlight: !!row.is_daily_highlight,
    importance: row.importance === 'کلیدی' ? 'key' : row.importance === 'نقطه‌عطف' ? 'milestone' : row.importance === 'عادی' ? 'normal' : undefined,
    actualMinutes: row.actual_minutes || undefined,
    estimatedMinutes: row.estimated_minutes || undefined,
    areaId: row.area || undefined,
    goalId: row.goal || undefined,
    effortType: row.effort_type === 'fixed' || row.effort_type === 'ثابت' ? 'fixed' : row.effort_type === 'variable' || row.effort_type === 'متغیر' ? 'variable' : undefined,
    noteBlocks: row.note_blocks_json ? (typeof row.note_blocks_json === 'string' ? JSON.parse(row.note_blocks_json) : row.note_blocks_json) : [],
    // Impact fields (enriched by backend)
    impactGoalTitle: row.impact_goal_title || undefined,
    impactGoalHealth: row.impact_goal_health || undefined,
    impactGoalProgress: row.impact_goal_progress || undefined,
    impactProjectTitle: row.impact_project_title || undefined,
    impactProjectContributionType: row.impact_project_contribution_type || undefined,
    impactProjectProgress: row.impact_project_progress || undefined,
    impactScore: row.impact_score || undefined,
    blockedByTitles: row.blocked_by_titles || undefined,
    blockedByStatuses: row.blocked_by_statuses || undefined,
  }
}

function mapBackendTaskPriority(value?: string | null): Task['priority'] {
  const map: Record<string, Task['priority']> = {
    'پایین': 'low',
    'متوسط': 'medium',
    'بالا': 'high',
    'فوری': 'urgent',
  }
  return map[String(value || '')] || 'medium'
}

function mapBackendTaskCategory(value?: string | null): Task['category'] {
  const map: Record<string, Task['category']> = {
    'شغلی': 'work',
    'شخصی': 'personal',
    'سلامت': 'health',
    'مالی': 'finance',
    'آموزشی': 'learning',
  }
  return map[String(value || '')] || 'other'
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
