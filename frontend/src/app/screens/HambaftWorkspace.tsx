import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useBootstrapLifeData } from '../life-data'
import { subscribeNavigation } from '../navigation-bus'
import LegacyApp from '../../legacy/App'
import type { WorkspaceTab } from './workspace-routes'

type HambaftWorkspaceProps = {
  initialTab: WorkspaceTab
}

export function HambaftWorkspace({ initialTab }: HambaftWorkspaceProps) {
  const navigate = useNavigate()
  const params = useParams()
  const { data, error, loading, scheduleItems, waterIntake, settings } = useBootstrapLifeData()

  // Global nav-bus so command palette / keyboard shortcuts can jump routes.
  useEffect(() => subscribeNavigation((path) => navigate(path)), [navigate])

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] px-6 py-10 text-[#2d3025]">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-[rgba(45,48,37,0.08)] bg-[rgba(255,252,246,0.92)] p-8 shadow-[0_24px_64px_rgba(84,66,37,0.08)]">
          <p className="text-xs font-bold text-[#9b6b61]">Loading</p>
          <h1 className="mt-3 text-2xl font-black">در حال دریافت داده‌های هم‌بافت</h1>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] px-6 py-10 text-[#2d3025]">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-[rgba(45,48,37,0.08)] bg-[rgba(255,252,246,0.92)] p-8 shadow-[0_24px_64px_rgba(84,66,37,0.08)]">
          <p className="text-xs font-bold text-[#9b6b61]">Data error</p>
          <h1 className="mt-3 text-2xl font-black">اتصال به داده‌های فراپه کامل نشد</h1>
          <p className="mt-4 text-sm leading-7 text-[#5f6156]">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <LegacyApp
      initialTab={initialTab}
      initialGoalId={params.goalId ?? null}
      initialProjectId={params.projectId ?? null}
      initialTaskId={params.taskId ?? null}
      onNavigate={navigate}
      seedLifeData={data}
      seedScheduleItems={scheduleItems}
      seedWaterIntake={waterIntake}
      seedSettings={settings}
    />
  )
}
