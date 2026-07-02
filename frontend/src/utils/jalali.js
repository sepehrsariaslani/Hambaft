/**
 * Jalali (Persian/Solar Hijri) date utilities for hambaft.
 *
 * Uses jalaali-js for all calendar conversion math — no hand-rolled conversion.
 *
 * Exports:
 *   - formatJalaliDate(date)        → "۱۴۰۳/۰۱/۱۵"
 *   - formatJalaliDateTime(date)    → "۱۴۰۳/۰۱/۱۵ ساعت ۱۴:۳۰"
 *   - parseJalaliDate(jalaliStr)    → JS Date (Gregorian)
 *   - toPersianDigits(str)         → replaces 0-9 with ۰-۹
 */

import { toJalaali, toGregorian, isValidJalaaliDate } from 'jalaali-js'

// ── Persian digit map ────────────────────────────────────────────────
const LATIN_TO_PERSIAN = {
  '0': '\u06F0', '1': '\u06F1', '2': '\u06F2', '3': '\u06F3', '4': '\u06F4',
  '5': '\u06F5', '6': '\u06F6', '7': '\u06F7', '8': '\u06F8', '9': '\u06F9',
}

/**
 * Replace every Latin digit (0-9) in a string with its Persian equivalent.
 * Non-digit characters pass through unchanged.
 */
export function toPersianDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => LATIN_TO_PERSIAN[d])
}

// ── Persian month names ──────────────────────────────────────────────
const MONTH_NAMES = [
  '\u0641\u0631\u0648\u0631\u062F\u06CC\u0646', // فروردین
  '\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A', // اردیبهشت
  '\u062E\u0631\u062F\u0627\u062F',             // خرداد
  '\u062A\u06CC\u0631',                         // تیر
  '\u0645\u0631\u062F\u0627\u062F',             // مرداد
  '\u0634\u0647\u0631\u06CC\u0648\u0631',       // شهریور
  '\u0645\u0647\u0631',                         // مهر
  '\u0622\u0628\u0627\u0646',                   // آبان
  '\u0622\u0630\u0631',                         // آذر
  '\u062F\u06CC',                               // دی
  '\u0628\u0647\u0645\u0646',                   // بهمن
  '\u0627\u0633\u0641\u0646\u062F',             // اسفند
]

// ── Persian weekday names ───────────────────────────────────────────
const WEEKDAY_NAMES = [
  '\u0634\u0646\u0628\u0647',                   // شنبه
  '\u06CC\u06A9\u0634\u0646\u0628\u0647',       // یکشنبه
  '\u062F\u0648\u0634\u0646\u0628\u0647',       // دوشنبه
  '\u0633\u0647\u200C\u0634\u0646\u0628\u0647', // سه‌شنبه
  '\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647', // چهارشنبه
  '\u067E\u0646\u062C\u0634\u0646\u0628\u0647', // پنجشنبه
  '\u062C\u0645\u0639\u0647',                   // جمعه
]

// ── Helpers ─────────────────────────────────────────────────────────

/** Coerce a Date | string to a JS Date object. */
function toDate(input) {
  if (input instanceof Date) return input
  return new Date(input)
}

/** Zero-pad a number to at least 2 digits, then Persian-ify. */
function pad2(n) {
  return toPersianDigits(String(n).padStart(2, '0'))
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Convert a JS Date (or ISO string) to a Jalali date string.
 * Output: "۱۴۰۳/۰۱/۱۵"  (YYYY/MM/DD, Persian digits)
 */
export function formatJalaliDate(date) {
  const d = toDate(date)
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return `${toPersianDigits(j.jy)}/${pad2(j.jm)}/${pad2(j.jd)}`
}

/**
 * Convert a JS Date (or ISO string) to a Jalali date+time string.
 * Output: "۱۴۰۳/۰۱/۱۵ ساعت ۱۴:۳۰"
 */
export function formatJalaliDateTime(date) {
  const d = toDate(date)
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${toPersianDigits(j.jy)}/${pad2(j.jm)}/${pad2(j.jd)} \u0633\u0627\u0639\u062A ${toPersianDigits(hours)}:${toPersianDigits(minutes)}`
}

/**
 * Parse a Jalali date string (e.g. "۱۴۰۳/۰۱/۰۱" or "1403/01/01")
 * back to a JS Date (Gregorian).
 *
 * Accepts both Persian and Latin digits in the input.
 */
export function parseJalaliDate(jalaliStr) {
  // Normalise Persian digits to Latin for parsing
  const PERSIAN_TO_LATIN = {
    '\u06F0': '0', '\u06F1': '1', '\u06F2': '2', '\u06F3': '3', '\u06F4': '4',
    '\u06F5': '5', '\u06F6': '6', '\u06F7': '7', '\u06F8': '8', '\u06F9': '9',
  }
  const normalised = String(jalaliStr).replace(/[\u06F0-\u06F9]/g, (d) => PERSIAN_TO_LATIN[d])
  const parts = normalised.split('/')
  if (parts.length !== 3) {
    throw new Error(`Invalid Jalali date format: "${jalaliStr}". Expected YYYY/MM/DD.`)
  }
  const [jy, jm, jd] = parts.map(Number)
  if (!isValidJalaaliDate(jy, jm, jd)) {
    throw new Error(`Invalid Jalali date: ${jy}/${jm}/${jd}`)
  }
  const g = toGregorian(jy, jm, jd)
  return new Date(g.gy, g.gm - 1, g.gd)
}

/**
 * Get the Persian weekday name for a JS Date.
 * e.g. new Date('2024-03-20') → "چهارشنبه"
 */
export function getPersianWeekday(date) {
  const d = toDate(date)
  // JS getDay(): 0=Sun … 6=Sat
  // Persian weekdays: 0=شنبه(Sat) … 6=جمعه(Fri)  — but jalaali-js uses 0=Sat
  const dayIndex = d.getDay()
  // Map: Sat(6)→0, Sun(0)→1, Mon(1)→2, Tue(2)→3, Wed(3)→4, Thu(4)→5, Fri(5)→6
  const persianIndex = (dayIndex + 1) % 7
  return WEEKDAY_NAMES[persianIndex]
}

/**
 * Get the Persian month name for a JS Date.
 * e.g. new Date('2024-03-20') → "فروردین"
 */
export function getPersianMonthName(date) {
  const d = toDate(date)
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate())
  return MONTH_NAMES[j.jm - 1]
}

/**
 * PersianNumberFormatter — wraps Intl.NumberFormat with Persian digits.
 * Converts Latin digits in the formatted output to Persian equivalents.
 *
 * Usage:
 *   const fmt = new PersianNumberFormatter('fa-IR')
 *   fmt.format(1250000)  → "۱٬۲۵۰٬۰۰۰"
 *   fmt.formatDecimal(3.14) → "۳٫۱۴"
 */
export class PersianNumberFormatter {
  constructor(locale = 'fa-IR', options = {}) {
    this.formatter = new Intl.NumberFormat(locale, options)
  }

  format(value) {
    return toPersianDigits(this.formatter.format(value))
  }

  formatDecimal(value, decimals = 2) {
    return toPersianDigits(this.formatter.format(value.toFixed(decimals)))
  }
}
