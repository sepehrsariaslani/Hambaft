import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Target, FolderKanban, FileText, Layers, Grid3X3, Plus, Trash2, Edit2, X, Check, Clock } from 'lucide-react'
import ViewSwitcher, { type ViewMode } from './ViewSwitcher'
import { createAreaRecord, updateAreaRecord, deleteAreaRecord, getAreasWithSummaries } from '../../app/hambaft-api'
import type { Area, Goal, Task } from '../types'

interface AreasSectionProps {
  areas: Area[]
  goals: Goal[]
  tasks: Task[]
  onSelectGoal?: (goalId: string) => void
  onSelectProject?: (projectId: string) => void
  onSelectTask?: (taskId: string) => void
  onUpdateAreas?: (areas: Area[]) => void
}

const ICON_OPTIONS = ['🎯', '🏃', '💰', '📚', '❤️', '🧠', '✈️', '🏠', '🎨', '💼', '🌱', '🔬']

export default function AreasSection({ areas, goals, tasks, onSelectGoal, onSelectProject, onSelectTask, onUpdateAreas }: AreasSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [expandedArea, setExpandedArea] = useState<string | null>(null)

  // CRUD states
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIcon, setNewIcon] = useState('🎯')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Area>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const areaStats = useMemo(() => {
    return areas.map((area) => {
      const areaGoals = goals.filter((g) => g.areaId === area.id)
      const areaProjects = areaGoals.flatMap((g) => g.projects || [])
      const areaTasks = tasks.filter((t) => areaGoals.some((g) => (g.projects || []).some((p) => (p.tasks || []).some((pt) => pt.id === t.id))))
      // Use backend trackedMinutes if available, otherwise compute from frontend data
      const totalTime = area.trackedMinutes
        ? area.trackedMinutes * 60  // Convert minutes to seconds for display compatibility
        : areaProjects.reduce((sum, p) => {
            const projectTasks = p.tasks || []
            return sum + projectTasks.reduce((tsum, t) => tsum + (t.totalTimeSpent || 0), 0)
          }, 0)
      const completedGoals = areaGoals.filter((g) => g.completed).length
      return {
        area,
        goals: areaGoals,
        projects: areaProjects,
        tasks: areaTasks,
        totalTime,
        completedGoals,
        totalGoals: areaGoals.length,
        projectCount: area.projectCount ?? areaProjects.length,
        activeProjectCount: area.activeProjectCount,
        taskCount: area.taskCount ?? areaTasks.length,
        completedTasks: area.completedTasks,
        completedProjects: area.completedProjects,
        milestoneTotal: area.milestoneTotal,
        milestoneDone: area.milestoneDone,
        keyTotal: area.keyTotal,
        keyDone: area.keyDone,
        goalCount: area.goalCount,
      }
    }).filter((s) => s.area.title.toLowerCase().includes(search.toLowerCase()))
  }, [areas, goals, tasks, search])

  const formatTime = (seconds: number) => {
    if (!seconds) return '۰د'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}س ${m}د`
  }

  const formatMinutes = (mins: number) => {
    if (!mins) return '۰د'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}س ${m}د` : `${h} ساعت`
  }

  const handleAddArea = useCallback(async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const result: any = await createAreaRecord({
        title: newTitle.trim(),
        description: newDesc.trim(),
        icon: newIcon,
      })
      const savedId = result?.data?.area?.name || result?.name
      if (savedId) {
        const newArea: Area = {
          id: savedId,
          title: newTitle.trim(),
          description: newDesc.trim(),
          icon: newIcon,
        }
        onUpdateAreas?.([...areas, newArea])
      }
      setNewTitle('')
      setNewDesc('')
      setNewIcon('🎯')
      setShowAddForm(false)
    } catch (e: any) {
      alert('خطا در ثبت حوزه: ' + (e?.message || 'نامشخص'))
    } finally {
      setAdding(false)
    }
  }, [newTitle, newDesc, newIcon, areas, onUpdateAreas])

  const handleSaveEdit = useCallback(async (areaId: string) => {
    setSavingId(areaId)
    try {
      await updateAreaRecord(areaId, {
        title: editDraft.title,
        description: editDraft.description,
        icon: editDraft.icon,
      })
      onUpdateAreas?.(areas.map(a => a.id === areaId ? { ...a, ...editDraft } as Area : a))
      setEditingId(null)
      setEditDraft({})
    } catch (e: any) {
      alert('خطا در ویرایش: ' + (e?.message || 'نامشخص'))
    } finally {
      setSavingId(null)
    }
  }, [editDraft, areas, onUpdateAreas])

  const handleDeleteArea = useCallback(async (areaId: string) => {
    if (!confirm('آیا از حذف این حوزه اطمینان دارید؟ اهداف مرتبط حذف نمی‌شوند.')) return
    try {
      await deleteAreaRecord(areaId)
      onUpdateAreas?.(areas.filter(a => a.id !== areaId))
    } catch (e: any) {
      alert('خطا در حذف: ' + (e?.message || 'نامشخص'))
    }
  }, [areas, onUpdateAreas])

  const startEdit = (area: Area) => {
    setEditingId(area.id)
    setEditDraft({ title: area.title, description: area.description, icon: area.icon })
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025]">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] dark:text-[#9ECE9A] rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-[#2D3025] dark:text-[#E8ECE0]">حوزه‌های زندگی</h1>
            <p className="text-[10px] text-[#8D7F72] font-semibold mt-0.5">{areas.length} حوزه • {goals.length} هدف • {goals.reduce((s, g) => s + (g.projects?.length || 0), 0)} پروژه</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو در حوزه‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-3 py-2 pr-8 border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl bg-white dark:bg-[#121411] text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363] w-48"
            />
            <Grid3X3 className="w-3.5 h-3.5 text-[#8D7F72] absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>حوزه جدید</span>
          </button>
          <ViewSwitcher
            views={[
              { id: 'list', label: 'لیست', emoji: '🗂️' },
              { id: 'table', label: 'جدول', emoji: '⊞' },
              { id: 'kanban', label: 'کانبان', emoji: '📋' },
              { id: 'tree', label: 'درخت', emoji: '🌲' },
            ]}
            activeView={viewMode}
            onChange={setViewMode}
            size="sm"
          />
        </div>
      </div>

      {/* Add Area Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] space-y-3">
              <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">تعریف حوزه جدید</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="عنوان حوزه (مثلاً: سلامت و ورزش)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-3 py-2 text-xs border border-[#D6CFC3] dark:border-[#2D3025] rounded-xl bg-white dark:bg-[#121411] text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]"
                />
                <input
                  type="text"
                  placeholder="توضیحات کوتاه"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="px-3 py-2 text-xs border border-[#D6CFC3] dark:border-[#2D3025] rounded-xl bg-white dark:bg-[#121411] text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-[#8D7F72]">آیکون:</span>
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewIcon(icon)}
                    className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all cursor-pointer ${newIcon === icon ? 'bg-[#7C8363] text-white ring-2 ring-[#7C8363]/30' : 'bg-[#F9F6EE] dark:bg-[#121411] hover:bg-[#E6DFD3]'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddArea}
                  disabled={adding || !newTitle.trim()}
                  className="px-4 py-2 bg-[#7C8363] text-white text-[10px] font-bold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {adding ? 'در حال ثبت...' : 'ثبت حوزه'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-[#F9F6EE] dark:bg-[#121411] border border-[#D6CFC3] text-[#8D7F72] text-[10px] font-bold rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {areaStats.map(({ area, goals: ag, projects: ap, tasks: at, totalTime, completedGoals, totalGoals }) => {
            const isEditing = editingId === area.id
            return (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  {isEditing ? (
                    <div className="flex items-center gap-3 flex-1">
                      <select
                        value={editDraft.icon || '🎯'}
                        onChange={(e) => setEditDraft(d => ({ ...d, icon: e.target.value }))}
                        className="text-lg bg-white dark:bg-[#121411] border border-[#D6CFC3] rounded-xl px-2 py-1"
                      >
                        {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <div className="flex-1 space-y-2">
                        <input
                          value={editDraft.title || ''}
                          onChange={(e) => setEditDraft(d => ({ ...d, title: e.target.value }))}
                          className="w-full px-3 py-1.5 text-xs border border-[#7C8363] rounded-xl bg-white dark:bg-[#121411]"
                          autoFocus
                        />
                        <input
                          value={editDraft.description || ''}
                          onChange={(e) => setEditDraft(d => ({ ...d, description: e.target.value }))}
                          placeholder="توضیحات..."
                          className="w-full px-3 py-1.5 text-xs border border-[#D6CFC3] rounded-xl bg-white dark:bg-[#121411]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{area.icon || '🎯'}</span>
                      <div>
                        <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">{area.title}</h3>
                        <p className="text-[10px] text-[#8D7F72]">{area.description || 'بدون توضیحات'}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <span className="text-[10px] font-bold bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] px-2 py-1 rounded-lg">{formatTime(totalTime)}</span>
                        <span className="text-[10px] font-bold bg-[#F9F1D8] dark:bg-[#2B201D] text-[#5A5A40] px-2 py-1 rounded-lg">{completedGoals}/{totalGoals} هدف</span>
                        {(s.activeProjectCount ?? s.projectCount) != null && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{s.activeProjectCount ?? s.projectCount} پروژه</span>
                        )}
                        {(s.milestoneTotal ?? 0) > 0 && (
                          <span className="text-[10px] font-bold bg-[#F9F1D8] text-[#5A5A40] px-2 py-1 rounded-lg">◆ {s.milestoneDone ?? 0}/{s.milestoneTotal}</span>
                        )}
                        {(s.keyTotal ?? 0) > 0 && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">★ {s.keyDone ?? 0}/{s.keyTotal}</span>
                        )}
                        <button onClick={() => startEdit(area)} className="p-1.5 text-[#8D7F72] hover:text-[#7C8363] hover:bg-[#E8ECE0] rounded-lg cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteArea(area.id)} className="p-1.5 text-[#8D7F72] hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSaveEdit(area.id)}
                          disabled={savingId === area.id}
                          className="p-1.5 bg-[#7C8363] text-white rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditDraft({}) }}
                          className="p-1.5 bg-[#E6DFD3] text-[#2D3025] rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  {ag.map((goal) => (
                    <div key={goal.id} className="bg-white dark:bg-[#121411] border border-[#E6DFD3]/60 dark:border-[#2D3025]/60 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <button onClick={() => onSelectGoal?.(goal.id)} className="flex items-center gap-2 text-right">
                          <Target className="w-4 h-4 text-[#E26645]" />
                          <span className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] hover:text-[#7C8363] transition-colors">{goal.title}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          {goal.progressPercent != null && (
                            <span className="text-[9px] font-bold font-mono text-[#7C8363] bg-[#E8ECE0] px-1.5 py-0.5 rounded">{Math.round(goal.progressPercent)}%</span>
                          )}
                          {(goal.linkedHabits?.length || 0) > 0 && (
                            <span className="text-[8px]" title={`${goal.linkedHabits!.length} عادت پیوندی`}>🔥</span>
                          )}
                          {(goal.linkedFinanceAccounts?.length || 0) > 0 && (
                            <span className="text-[8px]" title={`${goal.linkedFinanceAccounts!.length} حساب مالی`}>💳</span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${goal.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F9F1D8] text-[#5A5A40]'}`}>
                            {goal.completed ? 'تکمیل' : 'در حال پیشرفت'}
                          </span>
                        </div>
                      </div>
                      <div className="pr-6 space-y-1.5">
                        {(goal.projects || []).map((project) => (
                          <div key={project.id} className="flex items-center justify-between p-2 bg-[#F9F6EE] dark:bg-[#1B1D16] rounded-xl">
                            <button onClick={() => onSelectProject?.(project.id)} className="flex items-center gap-2 text-right">
                              <FolderKanban className="w-3.5 h-3.5 text-[#7C8363]" />
                              <span className="text-[11px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:text-[#7C8363]">{project.title}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-[#8D7F72]">{(project.tasks || []).length} کار</span>
                              <span className="text-[9px] font-mono text-[#7C8363]">
                                {formatTime((project.tasks || []).reduce((s, t) => s + (t.totalTimeSpent || 0), 0))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {ag.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-[#8D7F72] bg-white/50 dark:bg-[#121411]/50 rounded-xl border border-dashed border-[#D6CFC3]">
                      هدفی در این حوزه ثبت نشده
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead className="bg-[#F9F6EE] dark:bg-[#121411] border-b border-[#E6DFD3] dark:border-[#2D3025]">
                <tr>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">حوزه</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">اهداف</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">پروژه‌ها</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">کارها</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">نقطه‌عطف</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">کلیدی</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">زمان صرف‌شده</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">پیشرفت</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]/50 dark:divide-[#2D3025]/50">
                {areaStats.map(({ area, goals: ag, projects: ap, tasks: at, totalTime, completedGoals, totalGoals, milestoneTotal, milestoneDone, keyTotal, keyDone }) => {
                  const isEditing = editingId === area.id
                  return (
                    <tr key={area.id} className="hover:bg-[#F9F6EE]/50 dark:hover:bg-[#1B1D16]/50 transition-colors">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editDraft.icon || '🎯'}
                              onChange={(e) => setEditDraft(d => ({ ...d, icon: e.target.value }))}
                              className="text-base bg-white dark:bg-[#121411] border border-[#D6CFC3] rounded-lg px-1 py-0.5"
                            >
                              {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                            <input
                              value={editDraft.title || ''}
                              onChange={(e) => setEditDraft(d => ({ ...d, title: e.target.value }))}
                              className="flex-1 min-w-[100px] px-2 py-1 text-xs border border-[#7C8363] rounded-lg bg-white dark:bg-[#121411]"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-base">{area.icon || '🎯'}</span>
                            <div>
                              <span className="font-bold text-[#2D3025] dark:text-[#E8ECE0] block">{area.title}</span>
                              {area.description && <span className="text-[9px] text-[#8D7F72]">{area.description}</span>}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#7C8363]">{ag.length}</td>
                      <td className="px-4 py-3 font-mono text-[#9B6B61]">{ap.length}</td>
                      <td className="px-4 py-3 font-mono text-[#5A5A40]">{at.length}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold bg-[#F9F1D8] text-[#5A5A40] px-1.5 py-0.5 rounded">
                          {(milestoneDone ?? 0)}/{milestoneTotal ?? 0} ◆
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {(keyDone ?? 0)}/{keyTotal ?? 0} ★
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#2D3025] dark:text-[#E8ECE0]">{formatTime(totalTime)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden">
                            <div className="h-full bg-[#7C8363] rounded-full" style={{ width: `${totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0}%` }} />
                          </div>
                          <span className="text-[9px] font-bold text-[#8D7F72]">{totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveEdit(area.id)} disabled={savingId === area.id} className="p-1 bg-[#7C8363] text-white rounded cursor-pointer disabled:opacity-50">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setEditingId(null); setEditDraft({}) }} className="p-1 bg-[#E6DFD3] text-[#2D3025] rounded cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(area)} className="p-1 text-[#8D7F72] hover:text-[#7C8363] hover:bg-[#E8ECE0] rounded cursor-pointer">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteArea(area.id)} className="p-1 text-[#8D7F72] hover:text-red-600 hover:bg-red-50 rounded cursor-pointer">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {areaStats.map(({ area, goals: ag }) => (
            <div key={area.id} className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6DFD3]/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{area.icon || '🎯'}</span>
                  <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{area.title}</span>
                </div>
                <span className="text-[10px] font-bold bg-[#E8ECE0] px-2 py-0.5 rounded text-[#7C8363]">{ag.length}</span>
              </div>
              <div className="space-y-2">
                {ag.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => onSelectGoal?.(goal.id)}
                    className="w-full text-right p-3 bg-white dark:bg-[#121411] border border-[#E6DFD3]/60 rounded-xl hover:border-[#7C8363] transition-colors space-y-1"
                  >
                    <span className="text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0] block">{goal.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[#8D7F72]">{(goal.projects || []).length} پروژه</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${goal.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F9F1D8] text-[#5A5A40]'}`}>
                        {goal.completed ? 'تکمیل' : 'فعال'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'tree' && (
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-6 space-y-4">
          {areaStats.map(({ area, goals: ag }) => (
            <div key={area.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">
                <span>{area.icon || '🎯'}</span>
                <span>{area.title}</span>
              </div>
              <div className="pr-6 border-r-2 border-[#E6DFD3] dark:border-[#2D3025] space-y-2">
                {ag.map((goal) => (
                  <div key={goal.id}>
                    <button onClick={() => onSelectGoal?.(goal.id)} className="flex items-center gap-2 text-xs font-bold text-[#7C8363] hover:text-[#5A5A40] transition-colors">
                      <Target className="w-3.5 h-3.5" />
                      {goal.title}
                    </button>
                    <div className="pr-5 mt-1 space-y-1">
                      {(goal.projects || []).map((project) => (
                        <div key={project.id}>
                          <button onClick={() => onSelectProject?.(project.id)} className="flex items-center gap-2 text-[11px] font-semibold text-[#3D3D3D] dark:text-[#D6CFC3] hover:text-[#7C8363]">
                            <FolderKanban className="w-3 h-3" />
                            {project.title}
                          </button>
                          <div className="pr-4 mt-0.5 space-y-0.5">
                            {(project.tasks || []).map((task) => (
                              <button key={task.id} onClick={() => onSelectTask?.(task.id)} className="flex items-center gap-1.5 text-[10px] text-[#8D7F72] hover:text-[#2D3025]">
                                <FileText className="w-2.5 h-2.5" />
                                {task.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
