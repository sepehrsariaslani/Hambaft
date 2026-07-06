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
