import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';

/**
 * Converts a Gregorian YYYY-MM-DD date string into Jalali formatted YYYY/MM/DD.
 */
export function toJalali(gregorianDateStr: string): string {
  if (!gregorianDateStr) return '';
  try {
    const d = new DateObject({ date: gregorianDateStr, calendar: gregorian, locale: gregorian_en });
    const jalali = d.convert(persian, persian_fa);
    return `${jalali.year}/${String(jalali.month.number).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error converting date to Jalali:', error);
    return gregorianDateStr;
  }
}

/**
 * Formats a Gregorian date with Month Names in Persian (e.g. 14 اردیبهشت 1405)
 */
export function toJalaliFriendly(gregorianDateStr: string): string {
  if (!gregorianDateStr) return '';
  try {
    const d = new DateObject({ date: gregorianDateStr, calendar: gregorian, locale: gregorian_en });
    const jalali = d.convert(persian, persian_fa);
    return `${jalali.day} ${jalali.month.name} ${jalali.year}`;
  } catch (error) {
    return gregorianDateStr;
  }
}

/**
 * Converts standard Jalali digits to Persian digits
 */
export function toPersianDigits(num: number | string): string {
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, function (w) {
    return id[+w];
  });
}

const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

/** Persian weekday names starting from Saturday (Persian week start). */
const JALALI_WEEKDAYS_SAT = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export function getJalaliMonthName(month: number): string {
  if (!Number.isFinite(month) || month < 1 || month > 12) return '';
  return JALALI_MONTH_NAMES[month - 1];
}

/**
 * @param jsWeekday result of Date.getDay() (0=Sun..6=Sat)
 */
export function getJalaliWeekdayName(jsWeekday: number): string {
  // Convert JS weekday to Persian week index (Saturday=0..Friday=6)
  const idx = (jsWeekday + 1) % 7;
  return JALALI_WEEKDAYS_SAT[idx];
}

export function jalaliParts(gregorianDateStr: string): { year: number; month: number; day: number } | null {
  if (!gregorianDateStr) return null;
  try {
    const d = new DateObject({ date: gregorianDateStr, calendar: gregorian, locale: gregorian_en });
    const j = d.convert(persian, persian_fa);
    return { year: Number(j.year), month: Number(j.month.number), day: Number(j.day) };
  } catch {
    return null;
  }
}

export function jalaliYearMonthLabel(gregorianDateStr: string): string {
  const parts = jalaliParts(gregorianDateStr);
  if (!parts) return '';
  return `${getJalaliMonthName(parts.month)} ${toPersianDigits(parts.year)}`;
}

/**
 * Convert Jalali year/month/day (1-based) into a Gregorian YYYY-MM-DD.
 * Returns null on invalid input.
 */
export function gregorianDateForJalali(year: number, month: number, day: number): string | null {
  try {
    const d = new DateObject({ calendar: persian, locale: persian_fa, year, month, day });
    const g = d.convert(gregorian, gregorian_en);
    return `${g.year}-${String(g.month.number).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

export const JALALI_MONTHS = JALALI_MONTH_NAMES;
export const JALALI_WEEKDAYS = JALALI_WEEKDAYS_SAT;
