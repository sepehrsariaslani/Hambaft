import React, { useEffect, useRef } from 'react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';
import { Calendar } from 'lucide-react';

interface PersianDatePickerProps {
  value: string; // Gregorian YYYY-MM-DD
  onChange: (gregorianDate: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  /** If true, the calendar popup opens automatically on mount */
  autoOpen?: boolean;
}

export default function PersianDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ...',
  className = '',
  minDate,
  autoOpen = false,
}: PersianDatePickerProps) {

  const pickerRef = useRef<any>(null);

  // Auto-open the calendar when mounted (for MetaDateRow inline usage)
  useEffect(() => {
    if (autoOpen && pickerRef.current) {
      // Small delay to ensure the picker is mounted
      const timer = setTimeout(() => {
        try { pickerRef.current?.openCalendar?.(); } catch {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  // Convert Gregorian string to DateObject for the picker
  const dateValue = value
    ? new DateObject({ date: value, calendar: gregorian, locale: gregorian_en })
    : null;

  const handleChange = (date: DateObject | null) => {
    if (!date) {
      onChange('');
      return;
    }
    // Convert from Persian calendar selection back to Gregorian string
    const gregorianDate = date.convert(gregorian, gregorian_en);
    const y = gregorianDate.year;
    const m = String(gregorianDate.month.number).padStart(2, '0');
    const d = String(gregorianDate.day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
  };

  // Format the display value as Jalali for the input
  const displayValue = value
    ? (() => {
        try {
          const d = new DateObject({ date: value, calendar: gregorian, locale: gregorian_en });
          const jalali = d.convert(persian, persian_fa);
          return `${jalali.year}/${String(jalali.month.number).padStart(2, '0')}/${String(jalali.day).padStart(2, '0')}`;
        } catch {
          return value;
        }
      })()
    : '';

  return (
    <DatePicker
      ref={pickerRef}
      value={dateValue}
      onChange={handleChange}
      calendar={persian}
      locale={persian_fa}
      minDate={
        minDate
          ? new DateObject({ date: minDate, calendar: gregorian, locale: gregorian_en })
          : undefined
      }
      calendarPosition="bottom-right"
      render={(value: string, openCalendar: () => void) => (
        <button
          type="button"
          onClick={openCalendar}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs bg-[#FDFBF7] dark:bg-[#121411] border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl focus:outline-none focus:border-[#7C8363] font-semibold text-right transition-colors hover:border-[#7C8363] cursor-pointer ${className}`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#9B6B61] shrink-0" />
          <span className={displayValue ? 'text-[#2D3025] dark:text-[#E8ECE0]' : 'text-[#B0A899] dark:text-[#8D7F72]'}>
            {displayValue || placeholder}
          </span>
        </button>
      )}
    />
  );
}
