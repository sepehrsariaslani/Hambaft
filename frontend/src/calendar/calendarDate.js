import { toGregorian, toJalaali } from 'jalaali-js'

import { getPersianMonthName, getPersianWeekday, toPersianDigits } from '../utils/jalali.js'

const WEEKDAY_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

function pad2(value) {
  return String(value).padStart(2, '0')
}

export function parseDateKey(dateKey) {
  if (dateKey instanceof Date) {
    return new Date(dateKey.getFullYear(), dateKey.getMonth(), dateKey.getDate())
  }
  const [year, month, day] = String(dateKey || '').slice(0, 10).split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function formatDateKey(value) {
  const date = parseDateKey(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function getTodayKey() {
  return formatDateKey(new Date())
}

export function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + amount)
  return formatDateKey(date)
}

export function addMonths(dateKey, amount) {
  const date = parseDateKey(dateKey)
  date.setMonth(date.getMonth() + amount)
  return formatDateKey(date)
}

function getDaysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  const current = toGregorian(jy, 12, 1)
  const next = toGregorian(jy + 1, 1, 1)
  const currentDate = new Date(current.gy, current.gm - 1, current.gd)
  const nextDate = new Date(next.gy, next.gm - 1, next.gd)
  return Math.round((nextDate - currentDate) / 86400000)
}

export function getJalaliDateMeta(dateKey) {
  const date = parseDateKey(dateKey)
  const jalali = toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const weekdayIndex = (date.getDay() + 1) % 7
  return {
    date,
    key: formatDateKey(date),
    jy: jalali.jy,
    jm: jalali.jm,
    jd: jalali.jd,
    monthLabel: getPersianMonthName(date),
    weekdayLabel: getPersianWeekday(date),
    weekdayShort: WEEKDAY_SHORT[weekdayIndex],
    weekdayIndex,
  }
}

export function getMonthTitle(dateKey) {
  const meta = getJalaliDateMeta(dateKey)
  return `${meta.monthLabel} ${toPersianDigits(meta.jy)}`
}

export function getWeekRange(dateKey) {
  const start = addDays(dateKey, -getJalaliDateMeta(dateKey).weekdayIndex)
  return { fromDate: start, toDate: addDays(start, 6) }
}

export function getJalaliMonthRange(dateKey) {
  const meta = getJalaliDateMeta(dateKey)
  const firstGregorian = toGregorian(meta.jy, meta.jm, 1)
  const start = formatDateKey(new Date(firstGregorian.gy, firstGregorian.gm - 1, firstGregorian.gd))
  const end = addDays(start, getDaysInJalaliMonth(meta.jy, meta.jm) - 1)
  return { fromDate: start, toDate: end, jalali: meta }
}

export function shiftJalaliMonth(dateKey, amount) {
  const meta = getJalaliDateMeta(dateKey)
  let month = meta.jm + amount
  let year = meta.jy
  while (month < 1) {
    month += 12
    year -= 1
  }
  while (month > 12) {
    month -= 12
    year += 1
  }
  const day = Math.min(meta.jd, getDaysInJalaliMonth(year, month))
  const gregorian = toGregorian(year, month, day)
  return formatDateKey(new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd))
}

export function getMonthGridRange(dateKey) {
  const monthRange = getJalaliMonthRange(dateKey)
  const monthStartMeta = getJalaliDateMeta(monthRange.fromDate)
  const gridStart = addDays(monthRange.fromDate, -monthStartMeta.weekdayIndex)
  return {
    fromDate: gridStart,
    toDate: addDays(gridStart, 41),
    monthStart: monthRange.fromDate,
    monthEnd: monthRange.toDate,
  }
}

export function buildDateList(fromDate, toDate) {
  const days = []
  let cursor = fromDate
  while (cursor <= toDate) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

export function formatTimeLabel(dateTime) {
  if (!dateTime) return 'بدون زمان'
  const date = new Date(String(dateTime).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return 'بدون زمان'
  return toPersianDigits(
    date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace('٫', ':')
  )
}

export function formatShortJalaliLabel(dateKey) {
  const meta = getJalaliDateMeta(dateKey)
  return `${toPersianDigits(meta.jd)} ${meta.monthLabel}`
}

export function isSameDay(a, b) {
  return formatDateKey(a) === formatDateKey(b)
}

export function isSameJalaliMonth(a, b) {
  const metaA = getJalaliDateMeta(a)
  const metaB = getJalaliDateMeta(b)
  return metaA.jy === metaB.jy && metaA.jm === metaB.jm
}
