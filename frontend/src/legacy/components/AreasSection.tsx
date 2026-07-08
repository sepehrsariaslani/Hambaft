import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Target, FolderKanban, FileText, TrendingUp, ChevronLeft, Layers, Grid3X3, List, TreePine } from 'lucide-react'
import type { Area, Goal, Project, Task } from '../types'

type ViewMode = 'list' | 'table' | 'kanban' | 'tree'

interface AreasSectionProps {
  areas: Area[]
  goals: Goal[]
  tasks: Task[]
  onSelectGoal?: (goalId: string) => void
  onSelectProject?: (projectId: string) => void
  onSelectTask?: (taskId: string) => void
}

export default function AreasSection({ areas, goals, tasks, onSelectGoal, onSelectProject, onSelectTask }: AreasSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [expandedArea, setExpandedArea] = useState<string | null>(null)

  const areaStats = useMemo(() => {
    return areas.map((area) => {
      const areaGoals = goals.filter((g) => g.areaId === area.id)
      const areaProjects = areaGoals.flatMap((g) => g.projects || [])
      const areaTasks = tasks.filter((t) => areaGoals.some((g) => (g.projects || []).some((p) => (p.tasks || []).some((pt) => pt.id === t.id))))
      const totalTime = areaProjects.reduce((sum, p) => {
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
      }
    }).filter((s) => s.area.title.toLowerCase().includes(search.toLowerCase()))
  }, [areas, goals, tasks, search])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}س ${m}د`
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
          <div className="inline-flex rounded-lg border border-[#E6DFD3] bg-white overflow-hidden">
            {([
              { value: 'list', label: 'لیست', icon: List },
              { value: 'table', label: 'جدول', icon: Grid3X3 },
              { value: 'kanban', label: 'کانبان', icon: Layers },
              { value: 'tree', label: 'درخت', icon: TreePine },
            ] as { value: ViewMode; label: string; icon: any }[]).map((o) => (
              <button
                key={o.value}
                onClick={() => setViewMode(o.value)}
                className={`px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1 ${
                  viewMode === o.value ? 'bg-[#2d3025] text-white' : 'text-[#5f6156] hover:bg-[#f3ebdf]'
                }`}
              >
                <o.icon className="w-3 h-3" />
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {areaStats.map(({ area, goals: ag, projects: ap, tasks: at, totalTime, completedGoals, totalGoals }) => (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{area.icon || '🎯'}</span>
                  <div>
                    <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">{area.title}</h3>
                    <p className="text-[10px] text-[#8D7F72]">{area.description || 'بدون توضیحات'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] px-2 py-1 rounded-lg">{formatTime(totalTime)}</span>
                  <span className="text-[10px] font-bold bg-[#F9F1D8] dark:bg-[#2B201D] text-[#5A5A40] px-2 py-1 rounded-lg">{completedGoals}/{totalGoals} هدف</span>
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
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${goal.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {goal.completed ? 'تکمیل' : 'در حال پیشرفت'}
                      </span>
                    </div>
                    {/* Projects under goal */}
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
                  <div className="text-center py-4 text-[10px] text-[#8D7F72] bg-white/50 rounded-xl border border-dashed border-[#D6CFC3]">
                    هدفی در این حوزه ثبت نشده
                  </div>
                )}
              </div>
            </motion.div>
          ))}
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
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">زمان صرف‌شده</th>
                  <th className="px-4 py-3 font-black text-[#2D3025] dark:text-[#E8ECE0]">پیشرفت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]/50 dark:divide-[#2D3025]/50">
                {areaStats.map(({ area, goals: ag, projects: ap, tasks: at, totalTime, completedGoals, totalGoals }) => (
                  <tr key={area.id} className="hover:bg-[#F9F6EE]/50 dark:hover:bg-[#1B1D16]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{area.icon || '🎯'}</span>
                        <span className="font-bold text-[#2D3025] dark:text-[#E8ECE0]">{area.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#7C8363]">{ag.length}</td>
                    <td className="px-4 py-3 font-mono text-[#9B6B61]">{ap.length}</td>
                    <td className="px-4 py-3 font-mono text-[#5A5A40]">{at.length}</td>
                    <td className="px-4 py-3 font-mono text-[#2D3025] dark:text-[#E8ECE0]">{formatTime(totalTime)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden">
                          <div className="h-full bg-[#7C8363] rounded-full" style={{ width: `${totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-[#8D7F72]">{totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
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
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${goal.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
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
