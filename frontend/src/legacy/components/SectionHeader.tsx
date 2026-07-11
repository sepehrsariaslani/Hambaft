/**
 * SectionHeader — unified section header for all Hambaft workspace sections.
 * Provides consistent layout, spacing, visual density, and dark-mode support.
 */
import React from 'react'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  /** Section icon */
  icon?: LucideIcon
  /** Section title (Persian) */
  title: string
  /** Optional subtitle / context line */
  subtitle?: string
  /** Optional badge (e.g. count, status) */
  badge?: string | number
  /** Badge color variant */
  badgeVariant?: 'default' | 'accent' | 'success' | 'warning'
  /** Right-side action buttons / controls */
  actions?: React.ReactNode
  /** Whether to show a bottom border divider */
  divider?: boolean
}

const BADGE_STYLES: Record<string, string> = {
  default: 'bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] dark:text-[#9ECE9A] border-[#DDE2D5] dark:border-[#3D4133]',
  accent: 'bg-[#E26645]/10 text-[#E26645] border-[#E26645]/20',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  warning: 'bg-[#F9F1D8] dark:bg-[#201D13] text-[#5A5A40] dark:text-[#C59B93] border-[#EBE3C8] dark:border-[#3D3929]',
}

export default function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  actions,
  divider = true,
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${divider ? 'pb-4 border-b border-[#E6DFD3]/60 dark:border-[#3D4133]/40' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="p-2.5 bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] dark:text-[#9ECE9A] rounded-2xl shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant truncate">
              {title}
            </h2>
            {badge !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${BADGE_STYLES[badgeVariant]}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#8D7F72] dark:text-[#9D978B] font-medium mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
