import React from 'react';

interface MoneyInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}

export const toPersianDigits = (num: string | number): string => {
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, function (w) {
    return id[+w];
  });
};

export const getPersianShortScale = (numStr: string | number): string => {
  const clean = String(numStr).replace(/\D/g, '');
  const val = Number(clean);
  if (!clean || isNaN(val) || val === 0) return '';
  if (val < 1000) return `${toPersianDigits(val)} تومان`;
  if (val < 1000000) {
    const thousands = val / 1000;
    return `${toPersianDigits(Number(thousands.toFixed(1)))} هزار تومان`;
  }
  if (val < 1000000000) {
    const millions = val / 1000000;
    return `${toPersianDigits(Number(millions.toFixed(2)))} میلیون تومان`;
  }
  const billions = val / 1000000000;
  return `${toPersianDigits(Number(billions.toFixed(2)))} میلیارد تومان`;
};

export default function MoneyInput({
  value,
  onChange,
  placeholder = 'مبلغ (تومان)',
  className = '',
  required = false,
  id
}: MoneyInputProps) {
  const persianToEnglishDigits = (str: string): string => {
    const p = {'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
    const a = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
    return str.replace(/[۰-۹]/g, c => p[c as keyof typeof p]).replace(/[٠-٩]/g, c => a[c as keyof typeof a]);
  };

  const cleanDigits = (str: string): string => {
    const eng = persianToEnglishDigits(str);
    return eng.replace(/\D/g, '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const clean = cleanDigits(rawVal);
    onChange(clean);
  };

  const formattedVal = value ? toPersianDigits(Number(value).toLocaleString('en-US')) : '';
  const words = getPersianShortScale(value);

  return (
    <div className="w-full text-right relative">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          dir="ltr"
          placeholder={placeholder}
          value={formattedVal}
          onChange={handleChange}
          required={required}
          className={`w-full text-left font-mono font-black pl-3 ${words ? 'pr-28' : 'pr-3'} ${className}`}
        />
        {words && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] sm:text-[10px] font-bold text-[#7C8363] bg-[#E8ECE0] px-2 py-0.5 rounded-lg border border-[#DDE2D5] whitespace-nowrap">
            {words}
          </span>
        )}
      </div>
    </div>
  );
}
