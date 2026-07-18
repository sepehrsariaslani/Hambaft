import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useBootstrapLifeData } from '../life-data'
import { subscribeNavigation } from '../navigation-bus'
import LegacyApp from '../../legacy/App'
import type { WorkspaceTab } from './workspace-routes'

type HambaftWorkspaceProps = {
  initialTab: WorkspaceTab
}

function HambaftLoader() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] text-[#2d3025]">
      <div className="flex flex-col items-center gap-6">
        {/* Animated spinner */}
        <div className="relative w-16 h-16">
          <svg className="animate-spin w-16 h-16" viewBox="0 0 64 64" fill="none">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="rgba(45,48,37,0.08)"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#9b6b61"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="120"
              strokeDashoffset="60"
            />
          </svg>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-xl font-black tracking-tight">هم‌بافت</h1>
          <p className="text-sm font-medium text-[#5f6156]">در حال آماده‌سازی فضای کاری…</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#9b6b61] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="inline-block w-2 h-2 rounded-full bg-[#9b6b61] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="inline-block w-2 h-2 rounded-full bg-[#9b6b61] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </main>
  )
}

function HambaftError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] px-6 text-[#2d3025]">
      <div className="mx-auto max-w-md w-full rounded-[28px] border border-[rgba(45,48,37,0.08)] bg-[rgba(255,252,246,0.92)] p-8 shadow-[0_24px_64px_rgba(84,66,37,0.08)] text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-[rgba(196,107,97,0.12)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c44a3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-black">اتصال برقرار نشد</h1>
          <p className="text-sm leading-7 text-[#5f6156]">{message}</p>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-xl bg-[#2d3025] px-5 py-2.5 text-sm font-bold text-[#fdf9f2] shadow-sm hover:bg-[#1a1c15] transition-colors"
          >
            تلاش مجدد
          </button>
        )}
      </div>
    </main>
  )
}

export function HambaftWorkspace({ initialTab }: HambaftWorkspaceProps) {
  const navigate = useNavigate()
  const params = useParams()
  const { data, error, loading, scheduleItems, waterIntake, settings } = useBootstrapLifeData()

  // Global nav-bus so command palette / keyboard shortcuts can jump routes.
  useEffect(() => subscribeNavigation((path) => navigate(path)), [navigate])

  if (loading) {
    return <HambaftLoader />
  }

  if (error) {
    return <HambaftError message={error} onRetry={() => window.location.reload()} />
  }

  return (
    <LegacyApp
      initialTab={initialTab}
      initialGoalId={params.goalId ?? null}
      initialProjectId={params.projectId ?? null}
      initialTaskId={params.taskId ?? null}
      initialContactId={params.contactId ?? null}
      onNavigate={navigate}
      seedLifeData={data}
      seedScheduleItems={scheduleItems}
      seedWaterIntake={waterIntake}
      seedSettings={settings}
    />
  )
}
