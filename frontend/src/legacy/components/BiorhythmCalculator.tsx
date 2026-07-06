import React, { useState } from 'react';
import { 
  Heart, 
  Activity, 
  Brain, 
  Calendar, 
  Sparkles, 
  Info, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  Legend 
} from 'recharts';
import PersianDatePicker from './PersianDatePicker';
import { toJalali, toJalaliFriendly } from '../utils/jalali';

interface BiorhythmCalculatorProps {
  birthdate: string;
  onBirthdateChange: (val: string) => void;
  todayDate: string;
}

export default function BiorhythmCalculator({
  birthdate,
  onBirthdateChange,
  todayDate
}: BiorhythmCalculatorProps) {
  const [targetDate, setTargetDate] = useState(todayDate);

  // Parse birthdate and target date to calculate days lived
  const getDaysLived = (bDate: string, tDate: string) => {
    if (!bDate || !tDate) return 1;
    const start = new Date(bDate);
    const end = new Date(tDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  const daysLived = getDaysLived(birthdate, targetDate);

  // Sine formulas for 3 primary biorhythms (results in range -100 to +100)
  const calcPhysical = (days: number) => Math.sin((2 * Math.PI * days) / 23) * 100;
  const calcEmotional = (days: number) => Math.sin((2 * Math.PI * days) / 28) * 100;
  const calcIntellectual = (days: number) => Math.sin((2 * Math.PI * days) / 33) * 100;

  const physical = calcPhysical(daysLived);
  const emotional = calcEmotional(daysLived);
  const intellectual = calcIntellectual(daysLived);

  // Harmony score (average of three)
  const harmonyScore = Math.round((physical + emotional + intellectual) / 3);

  // Generate 15-day range around target date for chart
  const generateChartData = () => {
    const data = [];
    const baseDays = getDaysLived(birthdate, targetDate);
    const baseDate = new Date(targetDate);

    for (let i = -4; i <= 10; i++) {
      const currentDays = baseDays + i;
      const p = calcPhysical(currentDays);
      const e = calcEmotional(currentDays);
      const intel = calcIntellectual(currentDays);

      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const jalaliLabel = toJalali(dateStr).substring(5); // Show MM/DD in Jalali

      data.push({
        name: jalaliLabel,
        'جسمی': Math.round(p),
        'احساسی': Math.round(e),
        'ذهنی': Math.round(intel),
        isTarget: i === 0
      });
    }
    return data;
  };

  // Determine biological status interpretations
  const getPhaseStatus = (val: number, type: 'p' | 'e' | 'i') => {
    const absVal = Math.abs(val);
    
    // Critical state is when it crosses 0 (usually defined as +/- 12%)
    if (absVal < 12) {
      return {
        label: 'بحرانی (دوران گذار و نوسان شدید)',
        color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40',
        badgeColor: 'bg-amber-500 text-white',
        desc: type === 'p' 
          ? 'بدن در فاز تغییر قطب انرژی فیزیکی است. احتمال آسیب فیزیکی، کوفتگی یا کاهش مقاومت بدنی بالاتر است. از انجام تمرینات سنگین خودداری کنید.'
          : type === 'e' 
          ? 'نوسانات خلقی ناگهانی و حساسیت بالای عاطفی محتمل است. روزی مناسب برای تصمیم‌گیری‌های بزرگ احساسی نیست.'
          : 'قدرت تمرکز موقتاً دچار آشفتگی می‌شود. کارهای با دقت بالا را با بازبینی چندباره انجام دهید یا به تعویق بیندازید.'
      };
    }
    
    if (val >= 12) {
      return {
        label: 'مثبت (فاز فعال و پرانرژی)',
        color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40',
        badgeColor: 'bg-emerald-500 text-white',
        desc: type === 'p' 
          ? 'استقامت، توان بدنی و ایمنی سیستم دفاعی شما بالا است. زمان طلایی برای ورزش‌های سنگین، کارهای فیزیکی دشوار و جراحی‌های سرپایی.'
          : type === 'e' 
          ? 'شما در وضعیت عاطفی پایدار، شاداب و خلاق هستید. روابط اجتماعی موفق، کار تیمی سازنده و پذیرش ایده‌های نو بهترین بازدهی را دارند.'
          : 'یادگیری مفاهیم نو، تحلیل ریاضی، منطق عالی و قدرت تمرکز عالی هستند. ایده‌آل برای امتحانات، ارائه یا تصمیم‌گیری‌های استراتژیک.'
      };
    }

    return {
      label: 'منفی (فاز تخلیه و تجدید قوا)',
      color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40',
      badgeColor: 'bg-indigo-500 text-white',
      desc: type === 'p' 
          ? 'نیاز به خواب بیشتر، استراحت عضلانی و ذخیره انرژی بدنی دارید. کارهای تکراری فیزیکی انجام دهید و خود را بیش از حد خسته نکنید.'
          : type === 'e' 
          ? 'انرژی روانی در حال بازسازی است. تمایل به انزوا، بی‌حوصلگی یا حساسیت روانی بالا طبیعی است. روتین‌های آرامش‌بخش فردی را ارجح بدانید.'
          : 'مغز در فاز استراحت فکری و تثبیت دانسته‌های قبلی است. از تحلیل مسائل بسیار سنگین دوری کرده و به مرور روتین امور بپردازید.'
    };
  };

  const pStatus = getPhaseStatus(physical, 'p');
  const eStatus = getPhaseStatus(emotional, 'e');
  const iStatus = getPhaseStatus(intellectual, 'i');

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Target & Birthdate Selector */}
      <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-3">
          <Sparkles className="w-5 h-5 text-[#E26645]" />
          <div>
            <h3 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">محاسبه بیوریتم علمی سه گانه شخصی</h3>
            <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">پایش سه ریتم فیزیکی (۲۳ روزه)، احساسی (۲۸ روزه) و فکری (۳۳ روزه) بر اساس ریاضیات سینوسی</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ تولد شما (شمسی):</label>
            <PersianDatePicker 
              value={birthdate} 
              onChange={onBirthdateChange} 
              placeholder="انتخاب تاریخ تولد..."
            />
            <p className="text-[9px] text-[#8D7F72] font-semibold">تاریخ انتخابی: <span className="font-mono font-bold">{toJalaliFriendly(birthdate)}</span> ({birthdate})</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ تحلیل ریتم‌ها:</label>
            <PersianDatePicker 
              value={targetDate} 
              onChange={setTargetDate} 
              placeholder="انتخاب تاریخ تحلیل..."
            />
            <p className="text-[9px] text-[#8D7F72] font-semibold">تاریخ انتخابی: <span className="font-mono font-bold">{toJalaliFriendly(targetDate)}</span> ({targetDate})</p>
          </div>
        </div>

        <div className="p-3 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 text-xs font-semibold flex items-center justify-between">
          <span className="text-[#8D7F72] dark:text-[#9D978B]">تعداد روزهای سپری شده از تولد تا تاریخ تحلیل:</span>
          <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-[#1B1D16] px-3 py-1 rounded-xl border border-[#EBE3C8] dark:border-[#3D4133]/40">
            {daysLived.toLocaleString('fa-IR')} روز
          </span>
        </div>
      </div>

      {/* Primary 3 Cycles Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* 1. Physical */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4.5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-3.5 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
              <span className="text-lg">🏃</span> چرخه جسمی
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${physical >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20'}`}>
              {physical >= 0 ? '+' : ''}{Math.round(physical)}%
            </span>
          </div>
          
          <div className="relative pt-1">
            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100 dark:bg-gray-800">
              <div 
                style={{ width: `${(physical + 100) / 2}%` }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#E26645] rounded-full transition-all duration-500"
              />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 h-3 w-0.5 bg-gray-300 dark:bg-gray-600" />
          </div>

          <div className={`p-2.5 rounded-xl text-[10px] font-black text-center border ${pStatus.color}`}>
            {pStatus.label}
          </div>
          
          <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
            {pStatus.desc}
          </p>
        </div>

        {/* 2. Emotional */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4.5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-3.5 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
              <span className="text-lg">🎭</span> چرخه احساسی
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${emotional >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20'}`}>
              {emotional >= 0 ? '+' : ''}{Math.round(emotional)}%
            </span>
          </div>

          <div className="relative pt-1">
            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100 dark:bg-gray-800">
              <div 
                style={{ width: `${(emotional + 100) / 2}%` }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#7C8363] rounded-full transition-all duration-500"
              />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 h-3 w-0.5 bg-gray-300 dark:bg-gray-600" />
          </div>

          <div className={`p-2.5 rounded-xl text-[10px] font-black text-center border ${eStatus.color}`}>
            {eStatus.label}
          </div>

          <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
            {eStatus.desc}
          </p>
        </div>

        {/* 3. Intellectual */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4.5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-3.5 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
              <span className="text-lg">🧠</span> چرخه ذهنی
            </span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${intellectual >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20'}`}>
              {intellectual >= 0 ? '+' : ''}{Math.round(intellectual)}%
            </span>
          </div>

          <div className="relative pt-1">
            <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100 dark:bg-gray-800">
              <div 
                style={{ width: `${(intellectual + 100) / 2}%` }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-[#4F46E5] rounded-full transition-all duration-500"
              />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 h-3 w-0.5 bg-gray-300 dark:bg-gray-600" />
          </div>

          <div className={`p-2.5 rounded-xl text-[10px] font-black text-center border ${iStatus.color}`}>
            {iStatus.label}
          </div>

          <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
            {iStatus.desc}
          </p>
        </div>

        {/* 4. Biological Harmony Score */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4.5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 flex flex-col justify-between space-y-3 transition-colors">
          <div className="space-y-2 text-center">
            <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">همبستگی و هارمونی بیولوژیک در تاریخ هدف</span>
            <div className="text-4xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono leading-none">{harmonyScore}%</div>
            <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
              برآیند میانگین توان حیاتی و شارژ کلی بدن.
            </p>
          </div>
          
          <div className="bg-[#F9F6EE] dark:bg-[#242721] p-3 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 text-[10px] text-center font-black text-[#7C8363] dark:text-[#E8ECE0] transition-colors leading-relaxed">
            {harmonyScore > 25 
              ? '🌿 شارژ فوق‌العاده؛ آمادگی حداکثری برای چالش‌ها' 
              : harmonyScore < -25 
              ? '💤 فاز تخلیه همزمان ریتم‌ها؛ حتماً خواب و استراحت را اولویت دهید' 
              : '⚖️ تعادل نسبی بیولوژیک؛ ریتم‌های مثبت و منفی همدیگر را توازن می‌کنند'}
          </div>
        </div>
      </div>

      {/* Sinusoidal Wave Recharts Graphic */}
      <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4 transition-colors">
        <div className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3 flex justify-between items-center">
          <div>
            <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">منحنی نوسانی ریتم‌های بیوریتم شخصی شما (بازه ۱۵ روزه)</h4>
            <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold mt-0.5">
              تلاقی هر موج با خط وسط (مبنای صفر) نشانگر "روز بحرانی" گذار در آن ریتم است.
            </p>
          </div>
          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-[#7C8363]/10 text-[#7C8363]">برنمودار شبیه‌ساز</span>
        </div>

        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={generateChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#8D7F72" fontSize={10} tickLine={false} />
              <YAxis stroke="#8D7F72" fontSize={10} tickLine={false} domain={[-100, 100]} ticks={[-100, -50, 0, 50, 100]} />
              <Tooltip 
                contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '16px', fontSize: '11px' }}
                labelStyle={{ fontWeight: 'black', color: '#2D3025' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <ReferenceLine y={0} stroke="#8D7F72" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine x={toJalali(targetDate).substring(5)} stroke="#E26645" strokeDasharray="4 4" label={{ value: 'تاریخ تحلیل', fill: '#E26645', fontSize: 9, position: 'insideTopLeft' }} />
              <Line type="monotone" dataKey="جسمی" stroke="#E26645" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="احساسی" stroke="#7C8363" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ذهنی" stroke="#4F46E5" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
