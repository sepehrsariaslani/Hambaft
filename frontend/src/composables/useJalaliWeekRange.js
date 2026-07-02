import { computed } from 'vue'
import { toJalaali } from 'jalaali-js'
import { toPersianDigits, getPersianWeekday } from '@/utils/jalali'

/**
 * Composable: Jalali Week Range (Saturday → Friday)
 *
 * Given a JS Date, returns the Jalali week range as formatted Persian strings.
 * Persian weeks start on Saturday (شنبه) and end on Friday (جمعه).
 *
 * @param {Date | Ref<Date>} dateRef - reactive or static date input
 * @returns {{ start: Ref<string>, end: Ref<string>, weekday: Ref<string> }}
 *
 * Usage:
 *   import { useJalaliWeekRange } from '@/composables/useJalaliWeekRange'
 *   const { start, end, weekday } = useJalaliWeekRange(someDate)
 *   // start → "۱۴۰۳/۰۱/۰۱"
 *   // end   → "۱۴۰۳/۰۱/۰۷"
 *   // weekday → "شنبه"
 */
export function useJalaliWeekRange(dateRef) {
  /**
   * Get the Saturday (start of Persian week) for a given date.
   * JS getDay(): 0=Sun, 1=Mon, … 6=Sat
   * If today is Saturday (6), offset = 0.
   * If today is Sunday (0), offset = 1 (go back 1 day to Saturday).
   * If today is Friday (5), offset = 6 (go back 6 days to Saturday).
   */
  function getSaturday(date) {
    const d = date instanceof Date ? date : new Date(date)
    const day = d.getDay()
    // Saturday is 6 in JS. Days since Saturday:
    // Sat(6)→0, Sun(0)→1, Mon(1)→2, Tue(2)→3, Wed(3)→4, Thu(4)→5, Fri(5)→6
    const offset = day === 6 ? 0 : (day + 1) % 7
    const saturday = new Date(d)
    saturday.setDate(d.getDate() - offset)
    saturday.setHours(0, 0, 0, 0)
    return saturday
  }

  /**
   * Get the Friday (end of Persian week) for a given Saturday.
   * Friday = Saturday + 6 days.
   */
  function getFriday(saturday) {
    const friday = new Date(saturday)
    friday.setDate(saturday.getDate() + 6)
    friday.setHours(23, 59, 59, 999)
    return friday
  }

  /**
   * Format a date as Jalali YYYY/MM/DD with Persian digits.
   */
  function formatJalali(date) {
    const j = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate())
    return `${toPersianDigits(j.jy)}/${toPersianDigits(String(j.jm).padStart(2, '0'))}/${toPersianDigits(String(j.jd).padStart(2, '0'))}`
  }

  const start = computed(() => {
    const date = dateRef.value || dateRef
    const sat = getSaturday(date)
    return formatJalali(sat)
  })

  const end = computed(() => {
    const date = dateRef.value || dateRef
    const sat = getSaturday(date)
    const fri = getFriday(sat)
    return formatJalali(fri)
  })

  const weekday = computed(() => {
    const date = dateRef.value || dateRef
    return getPersianWeekday(date instanceof Date ? date : new Date(date))
  })

  return { start, end, weekday }
}
