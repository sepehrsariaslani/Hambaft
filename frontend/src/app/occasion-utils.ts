import type { Occasion } from '../legacy/types'

/**
 * Expands recurring occasions into virtual instances for the requested year
 * window. `yearly` occasions get one virtual instance per year in the range;
 * `monthly` occasions get one per month.
 *
 * Virtual instance IDs use the pattern `${original.id}::${YYYY-MM-DD}` so the
 * UI can render them without colliding with the persisted parent while still
 * linking edits back through the base id (strip anything after `::`).
 */
export function expandRecurringOccasions(
  occasions: Occasion[],
  fromYear: number,
  toYear: number,
): Occasion[] {
  const out: Occasion[] = []
  for (const occ of occasions) {
    if (!occ.date) continue

    if (occ.recurrenceType === 'yearly') {
      out.push(occ)
      const [, mm, dd] = occ.date.split('-')
      if (!mm || !dd) continue
      const startYear = Number(occ.date.slice(0, 4)) || fromYear
      for (let y = fromYear; y <= toYear; y++) {
        if (y === startYear) continue // original already pushed
        out.push({
          ...occ,
          id: `${occ.id}::${y}-${mm}-${dd}`,
          date: `${y}-${mm}-${dd}`,
        })
      }
      continue
    }

    if (occ.recurrenceType === 'monthly') {
      out.push(occ)
      const [origY, , dd] = occ.date.split('-')
      const startYear = Number(origY) || fromYear
      const startMonth = Number(occ.date.slice(5, 7)) || 1
      for (let y = fromYear; y <= toYear; y++) {
        for (let m = 1; m <= 12; m++) {
          if (y === startYear && m === startMonth) continue
          const mm = String(m).padStart(2, '0')
          out.push({
            ...occ,
            id: `${occ.id}::${y}-${mm}-${dd}`,
            date: `${y}-${mm}-${dd}`,
          })
        }
      }
      continue
    }

    out.push(occ)
  }
  return out
}

/**
 * Strips the virtual instance suffix from an occasion id so mutations always
 * target the persisted parent.
 */
export function baseOccasionId(id: string): string {
  const idx = id.indexOf('::')
  return idx === -1 ? id : id.slice(0, idx)
}
