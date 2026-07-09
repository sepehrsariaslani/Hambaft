import React from 'react'
import type { LucideIcon } from 'lucide-react'

export type ViewMode = 'list' | 'table' | 'kanban' | 'tree' | 'gantt' | 'calendar'

export interface ViewOption {
  id: ViewMode
  label: string
  icon?: LucideIcon
  emoji?: string
}

interface ViewSwitcherProps {
  views: ViewOption[]
  activeView: ViewMode
  onChange: (view: ViewMode) => void
  className?: string
  size?: 'sm' | 'md'
}

export const DEFAULT_VIEWS: ViewOption[] = [
  { id: 'list', label: 'لیست', emoji: '🗂️' },
  { id: 'table', label: 'جدول', emoji: '⊞' },
  { id: 'kanban', label: 'کانبان', emoji: '📋' },
  { id: 'tree', label: 'درخت', emoji: '🌲' },
]

export default function ViewSwitcher({
  views,
  activeView,
  onChange,
  className = '',
  size = 'md',
}: ViewSwitcherProps) {
  const sizeClasses = size === 'sm'
    ? 'py-1.5 px-3 text-[10px]'
    : 'py-2 px-4 text-[10px] md:text-xs'

  return (
    <div className={`inline-flex rounded-2xl border border-[#E6DFD3] bg-[#F9F6EE] p-1 overflow-x-auto scrollbar-none ${className}`}>
      {views.map((view) => {
        const Icon = view.icon
        const isActive = activeView === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl font-black text-center transition-all cursor-pointer whitespace-nowrap ${sizeClasses} ${
              isActive
                ? 'bg-[#7C8363] text-white shadow-xs'
                : 'text-[#8D7F72] hover:text-[#2D3025] hover:bg-[#E6DFD3]/30'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {view.emoji && <span className="text-xs">{view.emoji}</span>}
            <span>{view.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── ViewContainer: wrapper with state management ─────────────────────── */

interface ViewContainerProps {
  views: ViewOption[]
  defaultView?: ViewMode
  children: (props: { activeView: ViewMode; setActiveView: (v: ViewMode) => void }) => React.ReactNode
  header?: React.ReactNode
  className?: string
}

export function ViewContainer({
  views,
  defaultView = 'list',
  children,
  header,
  className = '',
}: ViewContainerProps) {
  const [activeView, setActiveView] = React.useState<ViewMode>(defaultView)

  return (
    <div className={`space-y-4 ${className}`}>
      {header && <div>{header}</div>}
      <ViewSwitcher views={views} activeView={activeView} onChange={setActiveView} />
      <div className="min-h-[200px]">
        {children({ activeView, setActiveView })}
      </div>
    </div>
  )
}
