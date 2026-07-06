import { useEffect, useState } from 'react'

function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function msUntilNextMidnight(): number {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0)
  return next.getTime() - now.getTime()
}

/**
 * Returns the current day as an ISO date string (YYYY-MM-DD) and
 * automatically re-renders subscribers at local midnight so any streak,
 * agenda or monthly aggregation that depends on "today" stays fresh
 * without a page reload.
 */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => todayISO())

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      timer = setTimeout(() => {
        if (cancelled) return
        setToday(todayISO())
        scheduleNext()
      }, msUntilNextMidnight())
    }

    // Also re-check when tab regains focus (handles machines that were
    // suspended for longer than the scheduled timeout).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const iso = todayISO()
        setToday((prev) => (prev !== iso ? iso : prev))
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    scheduleNext()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return today
}

export function todayISOString(): string {
  return todayISO()
}
