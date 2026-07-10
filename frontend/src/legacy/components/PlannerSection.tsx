import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Inbox,
  CalendarDays,
  ArrowRight,
  CircleDot,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  Layers,
  Archive,
  Zap,
  Sunrise,
  Timer,
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
  getTaskSessions,
} from '../../app/hambaft-api'

type PlannerBucket = 'inbox' | 'today' | 'next' | 'scheduled' | 'someday'

const BUCKETS: { id: PlannerBucket; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'inbox', label: 'صندوق ورودی', icon: <Inbox className="w-4 h-4" />, color: 'text-amber-600' },
  { id: 'today', label: 'امروز', icon: <Sunrise className="w-4 h-4" />, color: 'text-emerald-600' },
  { id: 'next', label: 'بعدی', icon: <ArrowRight className="w-4 h-4" />, color: 'text-blue-600' },
  { id: 'scheduled', label: 'زمان‌بندی‌شده', icon: <CalendarDays className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'someday', label: 'شاید someday', icon: <Archive className="w-4 h-4" />, color: 'text-gray-500' },
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

export default function PlannerSection() {
  const [activeBucket, setActiveBucket] = useState<PlannerBucket>('today')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<TaskSession | null>(null)
  const [sessionTaskTitle, setSessionTaskTitle] = useState('')
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const fetchBucket = useCallback(async (bucket: PlannerBucket) => {
    setLoading(true)
    try {
      let resp
      switch (bucket) {
        case 'inbox':
          resp = await getPlannerInbox()
          break
        case 'today':
          resp = await getPlannerToday()
          break
        case 'next':
          resp = await getPlannerNext()
          break
        case 'scheduled':
          resp = await getPlannerScheduled()
          break
        case 'someday':
          resp = await getPlannerSomeday()
          break
      }
      const rows = (resp as any)?.data?.tasks || []
      setTasks(rows.map(mapBackendTask))
    } catch (e) {
      console.error('fetchBucket error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

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
        // Find task title
        const t = tasks.find(x => x.id === sess.task)
        if (t) setSessionTaskTitle(t.title)
      } else {
        setActiveSession(null)
      }
    } catch (e) {
      // ignore
    }
  }, [tasks])

  useEffect(() => {
    fetchBucket(activeBucket)
  }, [activeBucket, fetchBucket])

  useEffect(() => {
    fetchActiveSession()
    const interval = setInterval(fetchActiveSession, 30000)
    return () => clearInterval(interval)
  }, [fetchActiveSession])

  const handleMove = async (taskId: string, bucket: Task['status']) => {
    try {
      await moveTaskToBucket(taskId, bucket)
      fetchBucket(activeBucket)
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartSession = async (taskId: string) => {
    try {
      await startTaskSession(taskId)
      fetchActiveSession()
      fetchBucket(activeBucket)
    } catch (e) {
      console.error(e)
    }
  }

  const handleStopSession = async () => {
    if (!activeSession) return
    try {
      await stopTaskSession(activeSession.id)
      fetchActiveSession()
      fetchBucket(activeBucket)
    } catch (e) {
      console.error(e)
    }
  }

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId)
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#7C8363]" />
          <span>برنامه‌ریز شخصی</span>
        </h2>
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
            {bucket.id === activeBucket && tasks.length > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-[10px] text-[#8D7F72]">در حال بارگذاری...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/50">
            <Inbox className="w-8 h-8 text-[#D6CFC3] mx-auto mb-2" />
            <p className="text-[10px] text-[#8D7F72]">هیچ تسکی در این بخش نیست</p>
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="bg-white dark:bg-[#1C1D17] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/50 overflow-hidden"
              >
                <div className="p-3 flex items-center gap-3">
                  {/* Status indicator */}
                  <button
                    onClick={() => handleMove(task.id, task.status === 'done' ? 'inbox' : 'done')}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      task.status === 'done'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-[#D6CFC3] hover:border-[#7C8363]'
                    }`}
                  >
                    {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Title & meta */}
                  <div className="flex-1 min-w-0" onClick={() => toggleExpand(task.id)}>
                    <div className={`text-xs font-bold truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-[#2D3025] dark:text-[#E8ECE0]'}`}>
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-md border font-bold ${STATUS_COLORS[task.status || 'inbox']}`}>
                        {STATUS_LABELS[task.status || 'inbox']}
                      </span>
                      {task.priority && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                          task.priority === 'high' ? 'bg-red-50 text-red-600' : task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {task.priority === 'high' ? 'فوری' : task.priority === 'medium' ? 'متوسط' : 'پایین'}
                        </span>
                      )}
                      {task.scheduledDate && (
                        <span className="text-[8px] text-[#8D7F72] flex items-center gap-0.5">
                          <CalendarDays className="w-2.5 h-2.5" />
                          {task.scheduledDate}
                        </span>
                      )}
                      {task.actualMinutes ? (
                        <span className="text-[8px] text-indigo-600 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {task.actualMinutes} دقیقه
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {activeSession?.taskId === task.id ? (
                      <button
                        onClick={handleStopSession}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-200"
                        title="توقف"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartSession(task.id)}
                        className="p-1.5 bg-[#E8ECE0] text-[#7C8363] rounded-lg hover:bg-[#7C8363] hover:text-white transition-colors"
                        title="شروع زمان‌سنج"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => toggleExpand(task.id)}>
                      {expandedTaskId === task.id ? (
                        <ChevronDown className="w-4 h-4 text-[#8D7F72]" />
                      ) : (
                        <ChevronLeft className="w-4 h-4 text-[#8D7F72]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedTaskId === task.id && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-[#E6DFD3]/40 space-y-2">
                        {task.description && (
                          <p className="text-[10px] text-[#8D7F72]">{task.description}</p>
                        )}
                        {/* Quick bucket moves */}
                        <div className="flex flex-wrap gap-1">
                          {(['inbox', 'today', 'next', 'in_progress', 'on_hold', 'someday', 'done'] as const).map(b => (
                            <button
                              key={b}
                              onClick={() => handleMove(task.id, b)}
                              className={`px-2 py-1 text-[8px] font-bold rounded-lg border transition-colors ${
                                task.status === b
                                  ? 'bg-[#7C8363] text-white border-[#7C8363]'
                                  : 'bg-white dark:bg-[#121411] text-[#8D7F72] border-[#D6CFC3] hover:border-[#7C8363]'
                              }`}
                            >
                              {STATUS_LABELS[b]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function mapBackendTask(row: any): Task {
  return {
    id: row.name,
    title: row.title,
    completed: row.status === 'done',
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
    blockedBy: row.blocked_by_json ? JSON.parse(row.blocked_by_json) : [],
    actualMinutes: row.actual_minutes,
    noteBlocks: row.note_blocks_json ? JSON.parse(row.note_blocks_json) : [],
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
