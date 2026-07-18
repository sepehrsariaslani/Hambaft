import React, { useState } from 'react';
import { SleepLog, LifeData } from '../types';
import { 
  Moon, 
  Sun, 
  Zap, 
  Brain, 
  Clock, 
  Activity, 
  Sparkles, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Smile, 
  Check,
  Info,
  Edit2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, ReferenceLine, Legend } from 'recharts';
import PersianDatePicker from './PersianDatePicker';
import BiorhythmCalculator from './BiorhythmCalculator';
import { toJalali } from '../utils/jalali';

interface SleepSectionProps {
  sleepLogs: SleepLog[];
  sleepGoalHours?: number;
  onAddSleepLog: (log: Omit<SleepLog, 'id'>) => void;
  onDeleteSleepLog: (id: string) => void;
  onUpdateSleepLog: (id: string, log: Partial<SleepLog>) => void;
  todayDate: string;
  initialPreferences?: {
    targetWakeTime: string;
    targetSleepDuration: number;
    birthdate: string;
  };
  onPreferencesChange?: (preferences: {
    targetWakeTime: string;
    targetSleepDuration: number;
    birthdate: string;
  }) => void;
}

export default function SleepSection({
  sleepLogs = [],
  sleepGoalHours = 8.0,
  onAddSleepLog,
  onDeleteSleepLog,
  onUpdateSleepLog,
  todayDate,
  initialPreferences,
  onPreferencesChange
}: SleepSectionProps) {
  // Form State
  const [selectedLogDate, setSelectedLogDate] = useState(todayDate);
  const [sleepTime, setSleepTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(8);
  const [energyLevel, setEnergyLevel] = useState(8);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // Target Settings State (persisted locally)
  const [targetWakeTime, setTargetWakeTime] = useState(initialPreferences?.targetWakeTime || '06:30');
  const [targetSleepDuration, setTargetSleepDuration] = useState(initialPreferences?.targetSleepDuration || 8.0);

  const handleTargetWakeTimeChange = (val: string) => {
    setTargetWakeTime(val);
    onPreferencesChange?.({
      targetWakeTime: val,
      targetSleepDuration,
      birthdate,
    });
  };

  const handleTargetSleepDurationChange = (val: number) => {
    setTargetSleepDuration(val);
    onPreferencesChange?.({
      targetWakeTime,
      targetSleepDuration: val,
      birthdate,
    });
  };

  // Selected biological phase for detail view
  const [selectedPhase, setSelectedPhase] = useState<string>('deep-work');

  // Sub-tabs for rhythm exploration
  const [activeSubTab, setActiveSubTab] = useState<'circadian' | 'correction' | 'biorhythm' | 'cycles'>('circadian');
  
  // Birthdate state for Biorhythms (saved in localStorage)
  const [birthdate, setBirthdate] = useState(initialPreferences?.birthdate || '2000-01-01');

  // State for Target Wake-up time planner
  const [targetWakePlanner, setTargetWakePlanner] = useState('07:00');

  const handleBirthdateChange = (val: string) => {
    setBirthdate(val);
    onPreferencesChange?.({
      targetWakeTime,
      targetSleepDuration,
      birthdate: val,
    });
  };

  React.useEffect(() => {
    if (!initialPreferences) return;
    setTargetWakeTime(initialPreferences.targetWakeTime || '06:30');
    setTargetSleepDuration(initialPreferences.targetSleepDuration || 8.0);
    setBirthdate(initialPreferences.birthdate || '2000-01-01');
  }, [initialPreferences]);

  // ─── Biorhythm calculations ──────────────────────────────────────────────
  const daysLived = Math.max(1, Math.floor((new Date('2026-07-05').getTime() - new Date(birthdate).getTime()) / (1000 * 60 * 60 * 24)));
  
  const todayPhysical = Math.sin((2 * Math.PI * daysLived) / 23) * 100;
  const todayEmotional = Math.sin((2 * Math.PI * daysLived) / 28) * 100;
  const todayIntellectual = Math.sin((2 * Math.PI * daysLived) / 33) * 100;
  
  const todayAvgBiorhythm = Math.round((todayPhysical + todayEmotional + todayIntellectual) / 3);

  const getBiorhythmStatus = (val: number, type: 'p' | 'e' | 'i') => {
    if (Math.abs(val) < 15) return { text: 'روز بحرانی (نوسان شدید انرژی)', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' };
    if (val >= 50) return { 
      text: type === 'p' ? 'توان فیزیکی و استقامت بسیار بالا' : type === 'e' ? 'خلاقیت سرشار و ثبات عاطفی' : 'تمرکز ذهن عالی و قدرت پردازش بالا', 
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' 
    };
    if (val > 15 && val < 50) return { text: 'مثبت و متعادل', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30' };
    if (val <= -50) return { 
      text: type === 'p' ? 'خستگی عضلانی (نیاز به استراحت)' : type === 'e' ? 'حساسیت عاطفی بالا (خودمراقبتی)' : 'دوره تجدید قوای ذهنی (کارهای روتین)', 
      color: 'text-[#9B6B61] bg-[#F9F1D8] dark:bg-[#201D13]' 
    };
    return { text: 'رو به کاهش/تخلیه انرژی', color: 'text-[#8D7F72] bg-[#F9F6EE] dark:bg-[#3D4133]/30' };
  };

  const generateBiorhythmData = () => {
    const data = [];
    for (let i = -2; i <= 12; i++) {
      const targetDays = daysLived + i;
      const p = Math.sin((2 * Math.PI * targetDays) / 23) * 100;
      const e = Math.sin((2 * Math.PI * targetDays) / 28) * 100;
      const intel = Math.sin((2 * Math.PI * targetDays) / 33) * 100;
      
      const dateObj = new Date('2026-07-05');
      dateObj.setDate(dateObj.getDate() + i);
      const dayLabel = i === 0 ? 'امروز' : `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
      
      data.push({
        name: dayLabel,
        'فیزیکی': Math.round(p),
        'احساسی': Math.round(e),
        'ذهنی': Math.round(intel),
      });
    }
    return data;
  };

  // ─── Sleep Cycles calculation ─────────────────────────────────────────────
  const calculateSleepTimes = (targetWake: string) => {
    const [h, m] = targetWake.split(':').map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(h, m, 0, 0);
    
    const options = [];
    const cycles = [6, 5, 4, 3];
    for (const c of cycles) {
      const sleepDate = new Date(wakeDate.getTime());
      sleepDate.setMinutes(sleepDate.getMinutes() - (c * 90 + 15));
      const hStr = String(sleepDate.getHours()).padStart(2, '0');
      const mStr = String(sleepDate.getMinutes()).padStart(2, '0');
      options.push({
        cycles: c,
        hours: c * 1.5,
        time: `${hStr}:${mStr}`,
        rating: c >= 5 ? 'خواب کامل و ایده‌آل' : 'خواب ناکافی/ سبک',
        color: c >= 5 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-[#9B6B61] dark:text-[#C59B93] bg-[#F9F1D8] dark:bg-[#201D13]'
      });
    }
    return options;
  };

  const calculateWakeTimes = () => {
    const now = new Date();
    const options = [];
    const cycles = [3, 4, 5, 6];
    for (const c of cycles) {
      const wakeDate = new Date(now.getTime());
      wakeDate.setMinutes(wakeDate.getMinutes() + 15 + c * 90);
      const hStr = String(wakeDate.getHours()).padStart(2, '0');
      const mStr = String(wakeDate.getMinutes()).padStart(2, '0');
      options.push({
        cycles: c,
        hours: c * 1.5,
        time: `${hStr}:${mStr}`,
        rating: c >= 5 ? 'سرحال و پرانرژی (پیشنهادی)' : 'خواب کوتاه/چرخه موقت',
        color: c >= 5 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'text-[#9B6B61] dark:text-[#C59B93] bg-[#F9F1D8] dark:bg-[#201D13]'
      });
    }
    return options;
  };

  // Convert time "HH:MM" to decimal hours
  const timeToDecimal = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  // Calculate duration from sleep to wake time
  const calculateDuration = (sleep: string, wake: string) => {
    const sleepDec = timeToDecimal(sleep);
    const wakeDec = timeToDecimal(wake);
    if (wakeDec >= sleepDec) {
      return wakeDec - sleepDec;
    } else {
      // Slept before midnight, woke up after
      return (24 - sleepDec) + wakeDec;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseFloat(calculateDuration(sleepTime, wakeTime).toFixed(2));
    const logData = {
      date: selectedLogDate,
      sleepTime,
      wakeTime,
      duration,
      quality,
      energyLevel,
      notes: notes.trim() || undefined
    };

    if (editingLogId) {
      onUpdateSleepLog(editingLogId, logData);
      setEditingLogId(null);
    } else {
      onAddSleepLog(logData);
    }

    setNotes('');
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  // Stats
  const totalLogs = sleepLogs.length;
  const avgDuration = totalLogs > 0 
    ? parseFloat((sleepLogs.reduce((sum, log) => sum + log.duration, 0) / totalLogs).toFixed(1))
    : 0;
  const avgQuality = totalLogs > 0 
    ? parseFloat((sleepLogs.reduce((sum, log) => sum + log.quality, 0) / totalLogs).toFixed(1))
    : 0;
  const avgEnergy = totalLogs > 0 
    ? parseFloat((sleepLogs.reduce((sum, log) => sum + log.energyLevel, 0) / totalLogs).toFixed(1))
    : 0;

  // Let's get the latest wake time to calculate dynamic schedule recommendation
  const latestLog = sleepLogs[sleepLogs.length - 1];
  const referenceWakeTimeStr = latestLog ? latestLog.wakeTime : '07:00';
  const wakeDecimal = timeToDecimal(referenceWakeTimeStr);

  // Dynamic recommendations based on wake-up time
  const getRecTimeStr = (decimalOffset: number) => {
    let totalHours = (wakeDecimal + decimalOffset) % 24;
    if (totalHours < 0) totalHours += 24;
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getMealTimeStr = (baseDecimal: number, decimalOffset: number) => {
    let totalHours = (baseDecimal + decimalOffset) % 24;
    if (totalHours < 0) totalHours += 24;
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Calculate average wake time
  const getAverageWakeTimeDecimal = () => {
    if (sleepLogs.length === 0) return 7.0; // fallback to 07:00
    const totalDecimal = sleepLogs.reduce((sum, log) => {
      const [h, m] = log.wakeTime.split(':').map(Number);
      return sum + (h + m / 60);
    }, 0);
    return totalDecimal / sleepLogs.length;
  };
  const avgWakeDecimal = getAverageWakeTimeDecimal();
  const avgWakeTimeStr = `${String(Math.floor(avgWakeDecimal)).padStart(2, '0')}:${String(Math.floor((avgWakeDecimal % 1) * 60)).padStart(2, '0')}`;

  // Windows
  const deepWorkStart = getRecTimeStr(2.5); // 2.5 hours after waking
  const deepWorkEnd = getRecTimeStr(5.5); // 5.5 hours after waking
  
  const restStart = getRecTimeStr(7.0); // 7 hours after waking (afternoon dip)
  const restEnd = getRecTimeStr(8.5);

  const sportStart = getRecTimeStr(9.5); // 9.5 hours after waking (late afternoon peak)
  const sportEnd = getRecTimeStr(11.5);

  const sleepPrepStart = getRecTimeStr(14.5); // 14.5 hours after waking (melatonin start)
  const sleepPrepEnd = getRecTimeStr(15.5);

  // Generate energy levels hourly data for Recharts based on circadian model
  const generateEnergyData = () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      const hour = (i + Math.floor(wakeDecimal)) % 24;
      // Calculate hours elapsed since waking up
      const elapsed = i;
      
      let level = 50; // base energy %
      if (elapsed >= 0 && elapsed < 1) {
        // Waking up inertia
        level = 45 + elapsed * 20;
      } else if (elapsed >= 1 && elapsed < 5) {
        // Morning Peak focus window
        level = 80 + Math.sin((elapsed - 1) * (Math.PI / 8)) * 15;
      } else if (elapsed >= 5 && elapsed < 8) {
        // Afternoon dip
        level = 60 - Math.sin((elapsed - 5) * (Math.PI / 6)) * 20;
      } else if (elapsed >= 8 && elapsed < 12) {
        // Late afternoon physical/mental rebound
        level = 75 + Math.sin((elapsed - 8) * (Math.PI / 8)) * 10;
      } else if (elapsed >= 12 && elapsed < 16) {
        // Wind down
        level = 65 - (elapsed - 12) * 12;
      } else {
        // Sleep state
        level = 15 + Math.sin((elapsed - 16) * (Math.PI / 16)) * 10;
      }

      data.push({
        time: `${String(hour).padStart(2, '0')}:۰۰`,
        'سطح انرژی (%)': Math.max(10, Math.min(100, Math.round(level))),
      });
    }
    return data;
  };

  const energyChartData = generateEnergyData();

  // Circadian biological phases dictionary
  const biologicalPhases: Record<string, { title: string; time: string; description: string; advice: string; color: string; icon: string }> = {
    'melatonin-stop': {
      title: 'توقف ترشح ملاتونین',
      time: `${getRecTimeStr(0.5)}`,
      description: 'با تابش نور خورشید به چشم‌ها، مغز فرمان توقف هورمون خواب ملاتونین را صادر می‌کند تا دمای بدن افزایش یابد.',
      advice: 'قرارگیری در معرض نور خورشید بلافاصله پس از بیداری و نوشیدن یک لیوان آب خنک.',
      color: 'from-[#9B6B61] to-[#9B6B61] text-white',
      icon: '☀️'
    },
    'deep-work': {
      title: 'بالاترین تمرکز ذهنی (Deep Work)',
      time: `${deepWorkStart} الی ${deepWorkEnd}`,
      description: 'میزان کورتیزول و هورمون‌های هوشیاری به اوج خود می‌رسند. سرعت پردازش اطلاعات مغز و دقت شناختی در بالاترین حد روزانه است.',
      advice: 'سخت‌ترین و مهم‌ترین پروژه‌های تحلیلی یا خلاقانه خود را در این بازه طلایی قرار دهید و گوشی را کاملاً بی‌صدا کنید.',
      color: 'from-blue-500 to-indigo-600 text-white',
      icon: '🧠'
    },
    'afternoon-dip': {
      title: 'کاهش انرژی عصرگاهی (Afternoon Dip)',
      time: `${restStart} الی ${restEnd}`,
      description: 'یک افت طبیعی در ساعت بیولوژیک که به هضم غذا مربوط است. دمای مرکزی بدن کمی افت می‌کند و خواب‌آلودگی طبیعی رخ می‌دهد.',
      advice: 'از کارهای عمیق خودداری کنید. زمان ایده‌آل برای چرت زدن کوتاه (حداکثر ۲۰ دقیقه) یا کارهای اداری و پاسخ به ایمیل‌ها.',
      color: 'from-emerald-400 to-teal-500 text-emerald-950',
      icon: '☕'
    },
    'workout': {
      title: 'بیشترین کارایی فیزیکی و قلبی',
      time: `${sportStart} الی ${sportEnd}`,
      description: 'دمای بدن، قدرت عضلانی، انعطاف مفاصل و کارایی ریه به اوج روزانه می‌رسند. زمان واکنش بدن در سریع‌ترین حالت ممکن است.',
      advice: 'بهترین زمان برای ورزش فیزیکی، دویدن سریع، تمرینات قدرتی یا یوگای فعال با ریسک آسیب‌دیدگی بسیار کم.',
      color: 'from-rose-500 to-orange-500 text-white',
      icon: '🏃'
    },
    'melatonin-start': {
      title: 'شروع ترشح ملاتونین',
      time: `${sleepPrepStart}`,
      description: 'با غروب آفتاب و کاهش نور محیط، غده پینه‌آل مغز شروع به تولید ملاتونین می‌کند تا بدن را برای استراحت آماده سازد.',
      advice: 'نورهای مستقیم سفید و آبی را خاموش کنید، از تلویزیون یا گوشی دوری کرده و نور محیط خانه را گرم و کم‌رنگ کنید.',
      color: 'from-purple-600 to-indigo-900 text-purple-100',
      icon: '🌙'
    }
  };

  return (
    <div className="space-y-6 text-right max-w-7xl mx-auto" dir="rtl" id="sleep-biorhythm-section">
      
      {/* Header Banner */}
      <div className="bg-[#2D3025] text-white p-6 rounded-3xl border border-white/5 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-6 -translate-y-6"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-black/5 rounded-full translate-x-6 translate-y-6"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-[#E26645] font-bold uppercase tracking-wider block">ریتم شبانه‌روزی و توازن بیولوژیک</span>
            <h1 className="text-xl md:text-2xl font-black font-serif-elegant leading-snug">
              ردیاب علمی بیوریتم، خواب و سطح انرژی بدن
            </h1>
            <p className="text-xs text-[#DDE2D5]/80 max-w-2xl leading-relaxed">
              با هماهنگ کردن برنامه کاری و تمرینی خود با بیوریتم درونی بدن‌تان، بدون خستگی کارایی و آرامش ذهنی فوق‌العاده‌ای را تجربه کنید.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 shrink-0 select-none">
            <div className="text-right">
              <span className="text-[9px] text-[#DDE2D5]/70 font-semibold block">ساعت بیداری مرجع</span>
              <span className="text-xs font-bold font-mono">{referenceWakeTimeStr}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#E26645] flex items-center justify-center text-lg">
              ⏰
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Card 1: Sleep Duration */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#E8ECE0] dark:bg-[#2E3326] text-[#7C8363] dark:text-[#E8ECE0] flex items-center justify-center text-xl shrink-0">
            🌙
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold block">میانگین مدت خواب</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono">{avgDuration || '۰'}</span>
              <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-medium">ساعت</span>
            </div>
          </div>
        </div>

        {/* Card 2: Sleep Quality */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#F9F1D8] dark:bg-[#2C271E] text-[#D4AF37] flex items-center justify-center text-xl shrink-0">
            ⭐️
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold block">میانگین کیفیت خواب</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono">{avgQuality || '۰'}</span>
              <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-medium">از ۱۰</span>
            </div>
          </div>
        </div>

        {/* Card 3: Morning Energy */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#F4E9E4] dark:bg-[#2D211F] text-[#9B6B61] dark:text-[#EDDDD7] flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold block">میانگین سطح انرژی</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono">{avgEnergy || '۰'}</span>
              <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-medium">از ۱۰</span>
            </div>
          </div>
        </div>

        {/* Card 4: Sleep Goal */}
        <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#E6DFD3] dark:bg-[#2D3025] text-[#8D7F72] dark:text-[#E8ECE0] flex items-center justify-center text-xl shrink-0">
            🎯
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold block">هدف خواب شبانه</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono">{sleepGoalHours}</span>
              <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-medium">ساعت</span>
            </div>
          </div>
        </div>

      </div>

      {/* Dynamic Sub-tab Switcher for Circadian Rhythm, Personal Biorhythm, and Sleep Cycles */}
      <div className="flex border-b border-[#EBE3C8] dark:border-[#3D4133]/40 pb-px gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('circadian')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'circadian'
              ? 'border-[#7C8363] text-[#7C8363]'
              : 'border-transparent text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
          }`}
        >
          <span>⏰</span>
          <span>چرخه شبانه‌روزی و سطح انرژی (Circadian Rhythm)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('correction')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'correction'
              ? 'border-[#E26645] text-[#E26645]'
              : 'border-transparent text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
          }`}
        >
          <span>🎯</span>
          <span>اهداف خواب، برنامه اصلاح ریتم و تغذیه</span>
        </button>

        <button
          onClick={() => setActiveSubTab('biorhythm')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'biorhythm'
              ? 'border-[#7C8363] text-[#7C8363]'
              : 'border-transparent text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
          }`}
        >
          <span>📈</span>
          <span>بیوریتم شخصی سه گانه (Personal Biorhythm)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cycles')}
          className={`pb-3 px-4 text-xs font-black transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'cycles'
              ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0]'
          }`}
        >
          <span>💤</span>
          <span>محاسبه‌گر چرخه‌های علمی خواب (Sleep Cycles)</span>
        </button>
      </div>

      {activeSubTab === 'circadian' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Grid: Clock & Dynamic Schedule Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Side (Lg: 8 cols): Clock & Phase Selection */}
            <div className="lg:col-span-8 bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-6 transition-colors">
              <div className="flex justify-between items-center border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3">
                <h2 className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2 font-serif-elegant">
                  <Clock className="w-4 h-4 text-[#7C8363]" />
                  <span>چرخه بیولوژیک و ساعت زیستی بدن (Circadian Wheel)</span>
                </h2>
                <span className="text-[10px] text-[#7C8363] dark:text-[#E8ECE0] font-bold bg-[#E8ECE0] dark:bg-[#2E3326] px-2.5 py-1 rounded-full border border-[#DDE2D5] dark:border-[#3D4133]/60">طبیعی و شبانه‌روزی</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                
                {/* Visual SVG Circadian Ring */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-64 h-64">
                    {/* SVG Dial representing 24 hours */}
                    <svg viewBox="0 0 200 200" className="w-full h-full select-none transform rotate-180">
                      {/* Background Track Circle */}
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#F9F6EE" className="stroke-[#F9F6EE] dark:stroke-[#242721]" strokeWidth="12" />
                      
                      {/* Sky Color gradients represented in sectors */}
                      {/* Night sector (top/bottom) */}
                      <path d="M 100 20 A 80 80 0 0 1 180 100 L 100 100 Z" fill="#2D3025" opacity="0.05" />
                      {/* Day sector */}
                      <path d="M 180 100 A 80 80 0 0 1 100 180 L 100 100 Z" fill="#E26645" opacity="0.03" />

                      {/* Day scale markings */}
                      {[...Array(12)].map((_, idx) => {
                        const angle = idx * 30;
                        const r1 = 74;
                        const r2 = 80;
                        const x1 = 100 + r1 * Math.sin((angle * Math.PI) / 180);
                        const y1 = 100 + r1 * Math.cos((angle * Math.PI) / 180);
                        const x2 = 100 + r2 * Math.sin((angle * Math.PI) / 180);
                        const y2 = 100 + r2 * Math.cos((angle * Math.PI) / 180);
                        return (
                          <line 
                            key={idx} 
                            x1={x1} y1={y1} x2={x2} y2={y2} 
                            stroke="#8D7F72" strokeWidth="1.5" opacity="0.4" 
                          />
                        );
                      })}

                      {/* Highlighting phase points on the 24h dial */}
                      {/* melatonin stop (0.5 hour after wake) */}
                      <circle cx={100 + 80 * Math.sin((((wakeDecimal + 0.5) * 15) * Math.PI) / 180)} cy={100 + 80 * Math.cos((((wakeDecimal + 0.5) * 15) * Math.PI) / 180)} r="7" fill="#D4AF37" className="cursor-pointer hover:r-9 transition-all" onClick={() => setSelectedPhase('melatonin-stop')} />
                      
                      {/* deep work (4 hours after wake) */}
                      <circle cx={100 + 80 * Math.sin((((wakeDecimal + 4) * 15) * Math.PI) / 180)} cy={100 + 80 * Math.cos((((wakeDecimal + 4) * 15) * Math.PI) / 180)} r="7" fill="#4F46E5" className="cursor-pointer hover:r-9 transition-all" onClick={() => setSelectedPhase('deep-work')} />
                      
                      {/* afternoon dip (7.5 hours after wake) */}
                      <circle cx={100 + 80 * Math.sin((((wakeDecimal + 7.5) * 15) * Math.PI) / 180)} cy={100 + 80 * Math.cos((((wakeDecimal + 7.5) * 15) * Math.PI) / 180)} r="7" fill="#10B981" className="cursor-pointer hover:r-9 transition-all" onClick={() => setSelectedPhase('afternoon-dip')} />

                      {/* workout (10.5 hours after wake) */}
                      <circle cx={100 + 80 * Math.sin((((wakeDecimal + 10.5) * 15) * Math.PI) / 180)} cy={100 + 80 * Math.cos((((wakeDecimal + 10.5) * 15) * Math.PI) / 180)} r="7" fill="#EF4444" className="cursor-pointer hover:r-9 transition-all" onClick={() => setSelectedPhase('workout')} />

                      {/* melatonin start (15 hours after wake) */}
                      <circle cx={100 + 80 * Math.sin((((wakeDecimal + 15) * 15) * Math.PI) / 180)} cy={100 + 80 * Math.cos((((wakeDecimal + 15) * 15) * Math.PI) / 180)} r="7" fill="#6B21A8" className="cursor-pointer hover:r-9 transition-all" onClick={() => setSelectedPhase('melatonin-start')} />

                      {/* Outer circle frame */}
                      <circle cx="100" cy="100" r="86" fill="none" stroke="#E6DFD3" className="stroke-[#E6DFD3] dark:stroke-[#3D4133]/60" strokeWidth="1" strokeDasharray="3,3" />

                      {/* Center Hub */}
                      <circle cx="100" cy="100" r="14" fill="#2D3025" className="fill-[#2D3025] dark:fill-[#E8ECE0]" />
                      <circle cx="100" cy="100" r="4" fill="#FDFBF7" className="fill-[#FDFBF7] dark:fill-[#121411]" />
                    </svg>

                    {/* Text overlays inside center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                      <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-black uppercase tracking-wider block mt-10">ساعت داخلی بدن</span>
                      <span className="text-lg font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono leading-none">{referenceWakeTimeStr}</span>
                      <span className="text-[8px] text-[#7C8363] dark:text-[#DDE2D5] font-bold">مبنای بیداری</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] text-center mt-3 font-semibold">
                    👈 روی نقاط دایره بالا بزنید تا توضیحات هر بازه را مشاهده کنید.
                  </span>
                </div>

                {/* Info and action panel for the selected phase */}
                <div className="space-y-4">
                  <div className={`p-5 rounded-3xl bg-gradient-to-br ${biologicalPhases[selectedPhase]?.color} shadow-xs border border-black/5 space-y-3`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{biologicalPhases[selectedPhase]?.icon}</span>
                      <div>
                        <h4 className="font-extrabold text-xs md:text-sm leading-tight">{biologicalPhases[selectedPhase]?.title}</h4>
                        <span className="text-[10px] font-black opacity-85 font-mono block mt-0.5">بازه زمانی: {biologicalPhases[selectedPhase]?.time}</span>
                      </div>
                    </div>

                    <p className="text-xs opacity-90 leading-relaxed font-medium">
                      {biologicalPhases[selectedPhase]?.description}
                    </p>

                    <div className="pt-2.5 border-t border-current/15 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider block">💡 پیشنهاد همبافت برای شما:</span>
                      <p className="text-xs leading-relaxed font-semibold">
                        {biologicalPhases[selectedPhase]?.advice}
                      </p>
                    </div>
                  </div>

                  {/* Grid of phase toggles to quickly select details */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.keys(biologicalPhases).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedPhase(key)}
                        className={`p-2 rounded-xl text-center text-[10px] font-black border transition-all cursor-pointer ${
                          selectedPhase === key
                            ? 'bg-[#2D3025] dark:bg-[#E8ECE0] text-white dark:text-[#121411] border-[#2D3025] dark:border-[#E8ECE0]'
                            : 'bg-[#F9F6EE] dark:bg-[#242721] hover:bg-[#E8ECE0]/50 dark:hover:bg-[#3D4133]/40 text-[#8D7F72] dark:text-[#9D978B] border-[#E6DFD3] dark:border-[#3D4133]/60'
                        }`}
                      >
                        {biologicalPhases[key].title}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Right Side (Lg: 4 cols): Daily Recommendations Schedule & Wake up config */}
            <div className="lg:col-span-4 bg-[#F9F6EE] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/40 space-y-5 transition-colors">
              <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-2">
                <Activity className="w-4 h-4 text-[#7C8363]" />
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">برنامه بهینه روزانه امروز شما</h3>
              </div>

              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
                بر اساس بیداری شما در ساعت <span className="font-mono font-bold text-[#2D3025] dark:text-[#E8ECE0] bg-[#EBE3C8] dark:bg-[#2E3326] px-1.5 py-0.5 rounded">{referenceWakeTimeStr}</span>، چرخه هورمونی مغز شما به صورت زیر تنظیم شده است:
              </p>

              <div className="space-y-3.5">
                
                {/* Box 1: Focus */}
                <div className="bg-[#FDFBF7] dark:bg-[#242721] p-3 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center text-sm shrink-0">
                      🧠
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">تمرکز عمیق (Deep Work)</h4>
                      <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">حل مسائل سخت و نوشتن</p>
                    </div>
                  </div>
                  <div className="text-left font-black font-mono text-xs bg-[#4F46E5]/10 text-[#4F46E5] px-2 py-1 rounded-lg">
                    {deepWorkStart} - {deepWorkEnd}
                  </div>
                </div>

                {/* Box 2: Workout */}
                <div className="bg-[#FDFBF7] dark:bg-[#242721] p-3 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center text-sm shrink-0">
                      🏃
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">تمرین بدنی و ورزش</h4>
                      <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">قدرت عضلانی بالا، مفاصل نرم</p>
                    </div>
                  </div>
                  <div className="text-left font-black font-mono text-xs bg-[#EF4444]/10 text-[#EF4444] px-2 py-1 rounded-lg">
                    {sportStart} - {sportEnd}
                  </div>
                </div>

                {/* Box 3: Rest */}
                <div className="bg-[#FDFBF7] dark:bg-[#242721] p-3 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center text-sm shrink-0">
                      ☕
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">استراحت و شارژ مجدد</h4>
                      <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">کارهای تکراری یا خواب نیمروزی</p>
                    </div>
                  </div>
                  <div className="text-left font-black font-mono text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-lg">
                    {restStart} - {restEnd}
                  </div>
                </div>

                {/* Box 4: Wind-down */}
                <div className="bg-[#FDFBF7] dark:bg-[#242721] p-3 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#6B21A8]/10 text-[#6B21A8] flex items-center justify-center text-sm shrink-0">
                      🕯️
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">آماده‌سازی برای خواب</h4>
                      <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">خاموش کردن نورهای آبی</p>
                    </div>
                  </div>
                  <div className="text-left font-black font-mono text-xs bg-[#6B21A8]/10 text-[#6B21A8] px-2 py-1 rounded-lg">
                    {sleepPrepStart} - {sleepPrepEnd}
                  </div>
                </div>

              </div>

              <div className="p-3.5 bg-[#FDFBF7] dark:bg-[#242721] rounded-2xl border border-[#D6CFC3] dark:border-[#3D4133]/60 border-dashed text-right flex items-start gap-2">
                <Info className="w-4 h-4 text-[#8D7F72] dark:text-[#9D978B] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed font-semibold">
                  توجه علمی: اگر ساعت بیداری متفاوتی دارید، می‌توانید در فرم زیر خواب دیشب خود را ثبت کنید تا ساعت بیولوژیک و جدول پیشنهادی بالا بلافاصله متناسب با شما همگام‌سازی شود.
                </p>
              </div>

            </div>

          </div>

          {/* Daily Expected Energy Level Chart */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4 transition-colors">
            <div className="flex justify-between items-center border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2 font-serif-elegant">
                  <Activity className="w-4 h-4 text-[#9B6B61]" />
                  <span>پیش‌بینی نوسان و منحنی سطح انرژی روزانه</span>
                </h3>
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold mt-0.5 block">راندمان شناختی و توان فیزیکی مغز شما در طول ۲۴ ساعت شبانه‌روز</span>
              </div>
              <span className="text-[10px] text-[#9B6B61] font-bold bg-[#F4E9E4] dark:bg-[#2D211F] px-2.5 py-1 rounded-full">نمودار داینامیک</span>
            </div>

            <div className="h-60 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={energyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9B6B61" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9B6B61" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#8D7F72" fontSize={9} tickLine={false} />
                  <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '12px', fontSize: '11px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                  />
                  <Area type="monotone" dataKey="سطح انرژی (%)" stroke="#9B6B61" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEnergy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'correction' && (
        <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
          
          {/* Target Settings Card */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-3">
              <span className="text-xl">🎯</span>
              <div>
                <h3 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">تنظیم اهداف خواب شخصی شما</h3>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">ساعت بیداری و میزان خواب مدنظر خود را برای تنظیم ساعت بیولوژیک مشخص کنید.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Sleep Duration */}
              <div className="space-y-2 bg-[#F9F6EE] dark:bg-[#242721] p-4 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#8D7F72] dark:text-[#9D978B]">میزان خواب هدف (ساعت):</span>
                  <span className="text-xs font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono bg-white dark:bg-[#1B1D16] px-2 py-0.5 rounded border border-[#EBE3C8] dark:border-[#3D4133]/40">
                    {targetSleepDuration} ساعت
                  </span>
                </div>
                <input 
                  type="range"
                  min="5"
                  max="10"
                  step="0.5"
                  value={targetSleepDuration}
                  onChange={(e) => handleTargetSleepDurationChange(Number(e.target.value))}
                  className="w-full accent-[#E26645]"
                />
                <div className="flex justify-between text-[8px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                  <span>۵ ساعت</span>
                  <span>۷.۵ ساعت</span>
                  <span>۱۰ ساعت</span>
                </div>
              </div>

              {/* Target Wake-up Time */}
              <div className="space-y-2 bg-[#F9F6EE] dark:bg-[#242721] p-4 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 transition-colors flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#8D7F72] dark:text-[#9D978B]">ساعت بیداری هدف:</span>
                  <span className="text-xs font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono bg-white dark:bg-[#1B1D16] px-2 py-0.5 rounded border border-[#EBE3C8] dark:border-[#3D4133]/40">
                    {targetWakeTime} صبح
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="time"
                    value={targetWakeTime}
                    onChange={(e) => handleTargetWakeTimeChange(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-[#1B1D16] border border-[#D6CFC3] dark:border-[#3D4133]/60 rounded-xl text-center font-mono focus:outline-none focus:border-[#E26645] text-[#2D3025] dark:text-[#E8ECE0]"
                  />
                  <Sun className="w-4 h-4 text-[#E26645] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Sleep Correction Program */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-3">
              <span className="text-xl">📋</span>
              <div>
                <h3 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">برنامه گام‌به‌گام اصلاح و توازن ریتم خواب</h3>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">این برنامه به صورت خودکار بر اساس سوابق اخیر و اهداف شما طراحی شده است.</p>
              </div>
            </div>

            {/* Gap Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F9F6EE] dark:bg-[#242721] p-4 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 transition-colors space-y-1.5 text-right">
                <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">مقایسه وضعیت فعلی و هدف</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8D7F72] dark:text-[#9D978B]">ساعت بیداری واقعی اخیر (میانگین):</span>
                    <span className="font-bold font-mono text-[#2D3025] dark:text-[#E8ECE0]">{avgWakeTimeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8D7F72] dark:text-[#9D978B]">ساعت بیداری هدف:</span>
                    <span className="font-bold font-mono text-[#7C8363] dark:text-emerald-400">{targetWakeTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8D7F72] dark:text-[#9D978B]">میزان خواب واقعی اخیر (میانگین):</span>
                    <span className="font-bold font-mono text-[#2D3025] dark:text-[#E8ECE0]">{avgDuration} ساعت</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8D7F72] dark:text-[#9D978B]">میزان خواب هدف:</span>
                    <span className="font-bold font-mono text-[#7C8363] dark:text-emerald-400">{targetSleepDuration} ساعت</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F9F6EE] dark:bg-[#242721] p-4 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 transition-colors flex flex-col justify-center space-y-1.5 text-right">
                <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">تحلیل انحراف ریتم بیولوژیک</h4>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                  {Math.abs(avgWakeDecimal - timeToDecimal(targetWakeTime)) <= 0.3
                    ? "✨ تبریک! الگوی بیداری شما با ساعت هدف هماهنگی بسیار بالایی دارد. برای حفظ این پایداری، روتین‌های روزانه خود را بر اساس ریتم طبیعی حفظ کنید."
                    : `⚠️ ساعت بیداری شما حدود ${Math.abs(avgWakeDecimal - timeToDecimal(targetWakeTime)).toFixed(1)} ساعت با هدف شما فاصله دارد. تغییر ناگهانی آمار بیداری باعث بروز حالت "پرواززدگی اجتماعی" (Social Jetlag) می‌شود. توصیه می‌شود اصلاح را طبق فازبندی گام‌به‌گام زیر به پیش ببرید:`}
                </p>
              </div>
            </div>

            {/* Gradual Shift Program Steps */}
            {Math.abs(avgWakeDecimal - timeToDecimal(targetWakeTime)) > 0.3 ? (
              <div className="space-y-3 pt-2 text-right">
                <span className="text-[10px] font-bold text-[#2D3025] dark:text-[#E8ECE0] block">برنامه درمان شناختی-بیولوژیکی اصلاح تدریجی بیداری:</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Step 1 */}
                  <div className="p-3 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 text-right">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#F9F1D8] dark:bg-[#201D13] text-[#5A5A40] dark:text-[#C59B93]">گام اول: روز ۱ الی ۳</span>
                    <h5 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">تعدیل مقدماتی ریتم</h5>
                    <div className="text-[10px] space-y-1 text-[#8D7F72] dark:text-[#9D978B]">
                      <div>⏰ آمار بیداری: <span className="font-bold font-mono text-[#2D3025] dark:text-[#E8ECE0]">{getMealTimeStr(avgWakeDecimal, -(avgWakeDecimal - timeToDecimal(targetWakeTime)) * 0.33)}</span></div>
                      <div>🌙 خواب پیشنهادی: <span className="font-bold font-mono text-[#2D3025] dark:text-[#E8ECE0]">{getMealTimeStr(avgWakeDecimal, -(avgWakeDecimal - timeToDecimal(targetWakeTime)) * 0.33 - targetSleepDuration - 0.25)}</span></div>
                    </div>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">گام اول به ریتم فعلی شما نزدیک‌تر است تا بدن دچار بیخوابی شدید و شوک هورمونی کورتیزول نشود.</p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 text-right">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300">گام دوم: روز ۴ الی ۶</span>
                    <h5 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">تثبیت و جابجایی میانی</h5>
                    <div className="text-[10px] space-y-1 text-[#8D7F72] dark:text-[#9D978B]">
                      <div>⏰ آمار بیداری: <span className="font-bold font-mono text-[#2D3025] dark:text-[#E8ECE0]">{getMealTimeStr(avgWakeDecimal, -(avgWakeDecimal - timeToDecimal(targetWakeTime)) * 0.66)}</span></div>
                      <div>🌙 خواب پیشنهادی: <span className="font-bold font-mono text-[#2D3025] dark:text-[#E8ECE0]">{getMealTimeStr(avgWakeDecimal, -(avgWakeDecimal - timeToDecimal(targetWakeTime)) * 0.66 - targetSleepDuration - 0.25)}</span></div>
                    </div>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">با گذشت ۳ روز، ساعت زیستی شما به بیداری زودهنگام عادت کرده و آماده فاز نهایی تثبیت ساعت هدف می‌شود.</p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 text-right">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">گام سوم: تثبیت نهایی</span>
                    <h5 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">انطباق کامل با هدف</h5>
                    <div className="text-[10px] space-y-1 text-[#8D7F72] dark:text-[#9D978B]">
                      <div>⏰ آمار بیداری: <span className="font-bold font-mono text-[#7C8363] dark:text-emerald-400">{targetWakeTime}</span></div>
                      <div>🌙 خواب پیشنهادی: <span className="font-bold font-mono text-[#7C8363] dark:text-emerald-400">{getMealTimeStr(timeToDecimal(targetWakeTime), -targetSleepDuration - 0.25)}</span></div>
                    </div>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">رسیدن به همگام‌سازی کامل. برای حفظ این ریتم، حتماً ساعت بیداری خود را حتی در روزهای تعطیل ثابت نگه‌دارید.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-[#2E3326] text-[#7C8363] dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs font-bold flex items-start gap-3">
                <span>✨</span>
                <div className="space-y-1 text-right">
                  <h5 className="font-bold">ریتم بیولوژیک شما هماهنگ است!</h5>
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed font-normal">
                    الگوی بیداری فعلی شما با اهداف مدنظرتان همراستاست. نیازی به برنامه جابجایی تدریجی ندارید. کافیست با قرار گرفتن در معرض آفتاب صبحگاهی و تاریک کردن مطلق اتاق خواب، کیفیت عمق خواب خود را ارتقا دهید.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Chrononutrition - Optimal Meal Timing */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-3">
              <span className="text-xl">🍳</span>
              <div>
                <h3 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">زمان‌بندی تغذیه و بهترین زمان صرف غذا (Chrononutrition)</h3>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">تایم‌های طلایی تغذیه شما کاملاً منطبق بر بیداری بیولوژیک فعلی شما ({referenceWakeTimeStr}) هماهنگ شده است.</p>
              </div>
            </div>

            <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
              ریتم شبانه‌روزی ترشح انسولین و متابولیسم کبد به شدت تحت تأثیر ساعت بیداری شماست. صرف غذا در ساعات بیراه، باعث ذخیره‌سازی چربی، افت انرژی ناگهانی و آسیب به کیفیت خواب شبانه می‌گردد.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 text-right">
              {/* Breakfast */}
              <div className="p-4 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 hover:scale-[1.01] transition-transform text-right">
                <div className="flex justify-between items-center">
                  <span className="text-lg">🍳</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-[#F9F1D8] dark:bg-[#201D13] text-[#5A5A40] dark:text-[#C59B93]">صبحانه طلایی</span>
                </div>
                <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">صبحانه بیولوژیک</h4>
                <div className="text-xs font-black text-[#9B6B61] dark:text-[#C59B93] font-mono">
                  {getMealTimeStr(wakeDecimal, 1.0)} الی {getMealTimeStr(wakeDecimal, 2.0)}
                </div>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                  ۱ الی ۲ ساعت پس از بیداری. حساسیت به انسولین بالاست. مصرف کربوهیدرات‌های پیچیده و پروتئین در این بازه، کورتیزول بیداری را متعادل می‌کند.
                </p>
              </div>

              {/* Lunch */}
              <div className="p-4 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 hover:scale-[1.01] transition-transform text-right">
                <div className="flex justify-between items-center">
                  <span className="text-lg">🍲</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400">وعده اصلی</span>
                </div>
                <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">ناهار مقوی و متمرکز</h4>
                <div className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                  {getMealTimeStr(wakeDecimal, 5.0)} الی {getMealTimeStr(wakeDecimal, 6.0)}
                </div>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                  ۵ الی ۶ ساعت بعد از بیداری. دمای مرکزی بدن بالاست و آنزیم‌های کبد در حداکثر توان تجزیه قرار دارند. زمان ایده‌آل برای وعده اصلی روز.
                </p>
              </div>

              {/* Afternoon Snack */}
              <div className="p-4 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 hover:scale-[1.01] transition-transform text-right">
                <div className="flex justify-between items-center">
                  <span className="text-lg">🍎</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400">میان‌وعده</span>
                </div>
                <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">میان‌وعده انرژی‌زا</h4>
                <div className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">
                  {getMealTimeStr(wakeDecimal, 9.0)} الی {getMealTimeStr(wakeDecimal, 10.0)}
                </div>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                  ۹ الی ۱۰ ساعت پس از بیداری. زمان افت خفیف کارایی مغز. استفاده از مغزها (بادام/گردو) یا میوه‌های کم‌شیرین برای حفظ راندمان.
                </p>
              </div>

              {/* Dinner */}
              <div className="p-4 bg-white dark:bg-[#242721] rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-2 hover:scale-[1.01] transition-transform text-right">
                <div className="flex justify-between items-center">
                  <span className="text-lg">🥗</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">شام سبک</span>
                </div>
                <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">شام زودهنگام و ترمیمی</h4>
                <div className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono">
                  {getMealTimeStr(wakeDecimal, 12.0)} الی {getMealTimeStr(wakeDecimal, 13.0)}
                </div>
                <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                  حداقل ۳ الی ۴ ساعت قبل از خواب. انسولین پس از غروب آفتاب افت چشمگیری پیدا می‌کند؛ دیر غذا خوردن قند خون را بالا برده و ترشح هورمون رشد شبانه را متوقف می‌کند.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'biorhythm' && (
        <BiorhythmCalculator
          birthdate={birthdate}
          onBirthdateChange={handleBirthdateChange}
          todayDate={todayDate}
        />
      )}

      {activeSubTab === 'cycles' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main layout: Wake time and sleep now planners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Wake up Planner */}
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4 transition-colors">
              <div className="flex items-center gap-2 border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3">
                <span className="text-xl">⏰</span>
                <div>
                  <h3 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0]">می‌خواهم در این ساعت بیدار شوم:</h3>
                  <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">محاسبه زمان ایده‌آل خوابیدن بر اساس تعداد چرخه‌های ۹۰ دقیقه‌ای</p>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 bg-[#F9F6EE] dark:bg-[#242721] p-3 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 transition-colors">
                <span className="text-xs font-bold text-[#8D7F72] dark:text-[#9D978B]">ساعت بیداری فرضی:</span>
                <input 
                  type="time"
                  value={targetWakePlanner}
                  onChange={(e) => setTargetWakePlanner(e.target.value)}
                  className="p-2 text-xs bg-white dark:bg-[#1B1D16] border border-[#D6CFC3] dark:border-[#3D4133]/60 rounded-xl font-mono text-center focus:outline-none focus:border-[#7C8363] text-[#3D3D3D] dark:text-[#E8ECE0]"
                />
              </div>

              <div className="space-y-3">
                <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] block text-right">ساعات پیشنهادی برای رفتن به رختخواب (شامل ۱۵ دقیقه زمان متوسط خواب رفتن):</span>
                
                {calculateSleepTimes(targetWakePlanner).map((opt) => (
                  <div key={opt.cycles} className="flex justify-between items-center p-3 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 bg-white dark:bg-[#242721] hover:scale-[1.01] transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold font-mono text-[#2D3025] dark:text-[#E8ECE0] bg-[#EBE3C8] dark:bg-[#2E3326] px-2.5 py-1 rounded-xl">{opt.time}</span>
                      <div className="text-right">
                        <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">خوابیدن در ساعت {opt.time}</h4>
                        <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">{opt.cycles} چرخه کامل ({opt.hours} ساعت خواب مفید)</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${opt.color}`}>{opt.rating}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Sleep Now Planner */}
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4 transition-colors">
              <div className="flex items-center gap-2 border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3">
                <span className="text-xl">💤</span>
                <div>
                  <h3 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0]">می‌خواهم همین الان بخوابم:</h3>
                  <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">اگر همین لحظه بخوابید، چرخه‌های خواب شما چطور تنظیم می‌شوند؟</p>
                </div>
              </div>

              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed text-right">
                مغز برای بازیابی قوای سلولی به چرخه‌های ۹۰ دقیقه‌ای نیاز دارد. بیدار شدن وسط یک چرخه باعث احساس کسلی و کوفتگی خواهد شد.
              </p>

              <div className="space-y-3 pt-1">
                <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] block text-right">ساعات بیداری بهینه بر اساس زمان حال (شامل ۱۵ دقیقه زمان متوسط خواب رفتن):</span>
                
                {calculateWakeTimes().map((opt) => (
                  <div key={opt.cycles} className="flex justify-between items-center p-3 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/40 bg-white dark:bg-[#242721] hover:scale-[1.01] transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-xl">{opt.time}</span>
                      <div className="text-right">
                        <h4 className="font-bold text-xs text-[#2D3025] dark:text-[#E8ECE0]">تنظیم آلارم روی ساعت {opt.time}</h4>
                        <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">{opt.cycles} چرخه کامل ({opt.hours} ساعت خواب مفید)</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${opt.color}`}>{opt.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Educational info card about 90 minute sleep cycles */}
          <div className="bg-[#F9F6EE] dark:bg-[#242721] p-5 rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/60 flex items-start gap-4 transition-colors">
            <span className="text-3xl shrink-0">🌿</span>
            <div className="space-y-1 text-right">
              <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">چرا قانون ۹۰ دقیقه خواب تا این حد حیاتی است؟</h4>
              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed font-semibold">
                هر خواب عمیق شبانه از ۵ الی ۶ چرخه پیوسته تشکیل شده است. در هر چرخه ابتدا وارد مراحل خواب سبک، خواب عمیق شده و در انتها به خواب با حرکات سریع چشم (REM) می‌رسیم. اگر آلارم شما درست سر ۹۰ دقیقه یا مضرب‌های آن زنگ بزند، بدن در سبک‌ترین فاز خواب بیدار شده و به سرعت پرانرژی می‌شوید. در عوض بیداری بعد از ۷ ساعت خواب متوسط، بدتر از ۶ ساعت خواب دقیقاً برنامه‌ریزی شده است، چون سر ۷ ساعت شما را در عمیق‌ترین فاز خواب غافلگیر می‌کند!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Log Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sleep Logger Form (Lg: 5 cols) */}
        <div className="lg:col-span-5 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 h-fit transition-colors">
          <div className="flex items-center gap-2 border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-3 mb-4">
            <Sun className="w-4 h-4 text-[#7C8363] dark:text-[#E8ECE0]" />
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">ثبت خواب دیشب و سطح بیداری</h3>
          </div>

          {successMsg && (
            <div className="p-3 mb-4 bg-[#E8ECE0] dark:bg-[#2E3326] border border-[#DDE2D5] dark:border-[#3D4133]/60 text-[#7C8363] dark:text-[#E8ECE0] rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-[#7C8363] dark:text-[#E8ECE0]" />
              <span>خواب دیشب با موفقیت ثبت و ساعت بیولوژیک همگام‌سازی شد!</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            {/* Date Picker for past logs */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ ثبت خواب (شمسی)</label>
              <PersianDatePicker
                value={selectedLogDate}
                onChange={setSelectedLogDate}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">ساعت شروع خواب</label>
                <div className="relative">
                  <input 
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-[#242721] border border-[#D6CFC3] dark:border-[#3D4133]/60 rounded-xl text-left font-mono focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0]"
                    required
                  />
                  <Moon className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">ساعت بیداری</label>
                <div className="relative">
                  <input 
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white dark:bg-[#242721] border border-[#D6CFC3] dark:border-[#3D4133]/60 rounded-xl text-left font-mono focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0]"
                    required
                  />
                  <Sun className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Calculated duration label */}
            <div className="bg-[#F9F6EE] dark:bg-[#242721] p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/60 flex justify-between items-center text-xs transition-colors">
              <span className="font-semibold text-[#8D7F72] dark:text-[#9D978B]">مدت خواب محاسبه شده:</span>
              <span className="font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono bg-white dark:bg-[#1B1D16] px-2 py-0.5 rounded border border-[#E6DFD3] dark:border-[#3D4133]/60 transition-colors">
                {calculateDuration(sleepTime, wakeTime).toFixed(1)} ساعت
              </span>
            </div>

            {/* Quality Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                <span>کیفیت خواب:</span>
                <span className="text-[#2D3025] dark:text-[#E8ECE0] font-mono">{quality} از ۱۰</span>
              </div>
              <input 
                type="range"
                min="1"
                max="10"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-[#7C8363]"
              />
              <div className="flex justify-between text-[8px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                <span>بی‌خوابی/آشفته</span>
                <span>متوسط</span>
                <span>خواب بسیار عمیق و شیرین</span>
              </div>
            </div>

            {/* Energy Level Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                <span>سطح انرژی صبحگاهی بیداری:</span>
                <span className="text-[#2D3025] dark:text-[#E8ECE0] font-mono">{energyLevel} از ۱۰</span>
              </div>
              <input 
                type="range"
                min="1"
                max="10"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full accent-[#7C8363]"
              />
              <div className="flex justify-between text-[8px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                <span>بسیار خسته/کسل</span>
                <span>معمولی</span>
                <span>بسیار سرحال و پرشور</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">یادداشت یا علت خواب ناآرام (اختیاری)</label>
              <textarea 
                placeholder="مثال: نوشیدن قهوه در اواخر شب، کابوس..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-white dark:bg-[#242721] border border-[#D6CFC3] dark:border-[#3D4133]/60 rounded-xl focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0] resize-none"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                editingLogId ? 'bg-[#9B6B61] hover:bg-[#7C4B3D]' : 'bg-[#E26645] hover:bg-[#C94B2A]'
              }`}
            >
              {editingLogId ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
              <span>{editingLogId ? 'ثبت تغییرات خواب روز قبل' : 'ثبت و بروزرسانی ریتم بدنی'}</span>
            </button>

            {editingLogId && (
              <button
                type="button"
                onClick={() => {
                  setEditingLogId(null);
                  setSelectedLogDate(todayDate);
                  setSleepTime('23:00');
                  setWakeTime('07:00');
                  setQuality(8);
                  setEnergyLevel(8);
                  setNotes('');
                }}
                className="w-full py-2.5 rounded-xl border border-[#D6CFC3] text-[#8D7F72] text-xs font-bold hover:bg-[#E6DFD3]/40 dark:hover:bg-[#3D4133] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>انصراف از ویرایش</span>
              </button>
            )}

          </form>
        </div>

        {/* History Table (Lg: 7 cols) */}
        <div className="lg:col-span-7 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 flex flex-col justify-between transition-colors">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3">
              <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#7C8363] dark:text-[#E8ECE0]" />
                <span>سوابق و تاریخچه خواب اخیر شما</span>
              </h3>
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">آخرین ثبت‌ها</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-[#E6DFD3]/60 dark:border-[#3D4133]/40 text-[#8D7F72] dark:text-[#9D978B] font-bold">
                    <th className="py-2.5">تاریخ</th>
                    <th className="py-2.5 text-center">زمان خواب</th>
                    <th className="py-2.5 text-center">بیداری</th>
                    <th className="py-2.5 text-center">مدت</th>
                    <th className="py-2.5 text-center">کیفیت</th>
                    <th className="py-2.5 text-center">انرژی</th>
                    <th className="py-2.5 text-left pl-2">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD3]/40 dark:divide-[#3D4133]/40">
                  {sleepLogs.length > 0 ? (
                    [...sleepLogs].reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-[#F9F6EE]/40 dark:hover:bg-[#242721]/40 transition-colors">
                        <td className="py-3 font-semibold text-[#2D3025] dark:text-[#E8ECE0] font-mono">{toJalali(log.date)}</td>
                        <td className="py-3 text-center font-mono text-[#8D7F72] dark:text-[#9D978B]">{log.sleepTime}</td>
                        <td className="py-3 text-center font-mono text-[#8D7F72] dark:text-[#9D978B]">{log.wakeTime}</td>
                        <td className="py-3 text-center">
                          <span className="font-mono font-black text-[#2D3025] dark:text-[#E8ECE0]">{log.duration}</span>
                          <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mr-0.5">ساعت</span>
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-[#9B6B61] dark:text-[#C59B93]">{log.quality}/۱۰</td>
                        <td className="py-3 text-center font-mono font-bold text-teal-600 dark:text-teal-400">{log.energyLevel}/۱۰</td>
                        <td className="py-3 text-left pl-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLogId(log.id);
                                setSelectedLogDate(log.date);
                                setSleepTime(log.sleepTime);
                                setWakeTime(log.wakeTime);
                                setQuality(log.quality);
                                setEnergyLevel(log.energyLevel);
                                setNotes(log.notes || '');
                              }}
                              className="p-1 text-[#7C8363] dark:text-[#E8ECE0] hover:bg-[#E8ECE0] dark:hover:bg-[#2E3326] rounded-lg transition-colors cursor-pointer"
                              title="ویرایش این رکورد"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSleepLog(log.id)}
                              className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                              title="حذف این رکورد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                        تاکنون رکوردی ثبت نشده است. از فرم بغل اولین خواب خود را اضافه کنید!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6DFD3]/40 dark:border-[#3D4133]/40 mt-4 text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
            🌿 ریتم شبانه‌روزی (Biorhythm) بر پایه پایداری ساعت بیداری عمل می‌کند. برای بازدهی ذهنی عالی، سعی کنید تفاوت ساعت بیداری شما در طول هفته بیش از ۳۰ دقیقه تغییر نکند.
          </div>
        </div>

      </div>

    </div>
  );
}
