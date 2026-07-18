/**
 * SectionShell — consistent outer wrapper for all Hambaft workspace sections.
 * Every section renders inside this shell for unified spacing and behavior.
 */
import React from 'react'

interface SectionShellProps {
  children: React.ReactNode
  /** Extra class names for the outer container */
  className?: string
  /** Whether section has internal padding */
  padded?: boolean
}

export default function SectionShell({ children, className = '', padded = true }: SectionShellProps) {
  return (
    <div className={`space-y-5 text-right pb-8 ${padded ? '' : ''} ${className}`} dir="rtl">
      {children}
    </div>
  )
}
