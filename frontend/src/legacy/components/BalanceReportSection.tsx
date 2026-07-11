import React, { useState, useMemo } from 'react';
import { ScheduleItem } from './CalendarSection';
import { Task, SleepLog, WorkoutLog, MindfulnessSession, Contact } from '../types';
import { 
  TrendingUp, Activity, ShieldAlert, CheckCircle2, Battery, BatteryCharging, 
  Clock, Coffee, Heart, Briefcase, Calendar, Info, Smile, Sparkles, Brain
} from 'lucide-react';
import { motion } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadialBarChart, RadialBar } from 'recharts';

interface BalanceReportSectionProps {
  scheduleItems: ScheduleItem[];
  tasks: Task[];
  sleepLogs: SleepLog[];
  workoutLogs: WorkoutLog[];
  sessions: MindfulnessSession[];
  contacts?: Contact[];
  todayDate: string;
  /** Navigate to a section for drill-down detail */
  onNavigate?: (section: string) => void;
}

export default function BalanceReportSection({
  scheduleItems = [],
  tasks = [],
  sleepLogs = [],
  workoutLogs = [],
  sessions = [],
  contacts = [],
  todayDate,
  onNavigate,
}: BalanceReportSectionProps) {
  const [reportRange, setReportRange] = useState<'day' | 'week'>('week');

  // Convert hours helper
  const getPersianNumber = (num: number | string) => {
    const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/[0-9]/g, w => id[parseInt(w, 10)]);
  };

  // Helper to parse HH:MM times into decimal hours
  const parseTimeToDecimal = (timeStr: string): number => {
    if (!timeStr) return 0;
    // support Persian or English digits
    const cleanStr = timeStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    const parts = cleanStr.split(':');
    if (parts.length < 2) return 0;
    const hrs = parseFloat(parts[0]);
    const mins = parseFloat(parts[1]);
    return hrs + (mins / 60);
  };

  // Analyze Calendar Activities & Tasks
  // We classify into Work, Life (Social & Family), Health (Gym & Meditation), and Buffer (Sleep/Free)
  const calculateMetrics = () => {
    let workHrs = 0;
    let lifeSocialHrs = 0;
    let healthHrs = 0;
    let sleepHrs = 8; // Default sleep if no logs

    // 1. Analyze Schedule Items from Calendar
    // Category check based on title or description
    scheduleItems.forEach(item => {
      // Parse duration
      const duration = item.durationHours || 1.5; // default duration of event is 1.5 hours
      const titleLower = item.title.toLowerCase();
      const descLower = item.desc.toLowerCase();
      
      const isWork = titleLower.includes('work') || titleLower.includes('کار') || titleLower.includes('جلسه') || titleLower.includes('پروژه') || titleLower.includes('کسب') || descLower.includes('کار') || item.category === 'purple';
      const isLife = titleLower.includes('تفریح') || titleLower.includes('خانواده') || titleLower.includes('شام') || titleLower.includes('دوست') || titleLower.includes('کافه') || titleLower.includes('بیرون') || item.category === 'orange' || item.category === 'pink';
      const isHealth = titleLower.includes('ورزش') || titleLower.includes('gym') || titleLower.includes('مدیتیشن') || titleLower.includes('تنفس') || titleLower.includes('ذهن‌آگاهی') || item.category === 'green';

      if (isWork) {
        workHrs += duration;
      } else if (isLife) {
        lifeSocialHrs += duration;
      } else if (isHealth) {
        healthHrs += duration;
      } else {
        // general goes to life/social
        lifeSocialHrs += duration;
      }
    });

    // 2. Add tracked task times
    tasks.forEach(t => {
      if (t.totalTimeSpent) {
        const hrs = t.totalTimeSpent / 3600;
        if (t.category === 'work' || t.category === 'finance') {
          workHrs += hrs;
        } else if (t.category === 'personal' || t.category === 'other') {
          lifeSocialHrs += hrs;
        } else if (t.category === 'health' || t.category === 'learning') {
          healthHrs += hrs;
        }
      }
    });

    // 3. Add Sleep Logs
    const latestSleep = sleepLogs[sleepLogs.length - 1];
    if (latestSleep) {
      sleepHrs = latestSleep.duration;
    }

    // 4. Add Gym & Mindfulness
    const latestWorkout = workoutLogs[workoutLogs.length - 1];
    if (latestWorkout) {
      healthHrs += latestWorkout.durationMinutes / 60;
    }
    const latestSession = sessions[sessions.length - 1];
    if (latestSession) {
      healthHrs += latestSession.durationMinutes / 60;
    }

    // Adjust parameters for weekly view (average)
    if (reportRange === 'week') {
      // Scale down to average daily hours — only if we have real data
      workHrs = workHrs > 0 ? Math.min(10, workHrs / 7) : 0;
      lifeSocialHrs = lifeSocialHrs > 0 ? Math.min(6, lifeSocialHrs / 7) : 0;
      healthHrs = healthHrs > 0 ? Math.min(4, healthHrs / 7) : 0;
      sleepHrs = sleepLogs.length > 0 
        ? sleepLogs.reduce((sum, s) => sum + s.duration, 0) / sleepLogs.length 
        : 0;
    }
    // No fake defaults — if no data, show zeros

    // Normalize values
    workHrs = Math.round(workHrs * 10) / 10;
    lifeSocialHrs = Math.round(lifeSocialHrs * 10) / 10;
    healthHrs = Math.round(healthHrs * 10) / 10;
    sleepHrs = Math.round(sleepHrs * 10) / 10;

    const freeHrs = Math.max(0, Math.round((24 - (workHrs + lifeSocialHrs + healthHrs + sleepHrs)) * 10) / 10);

    // Calculate Work-Life Balance Score
    // Target healthy ratios: Work (6-8 hrs), Sleep (7-9 hrs), Life/Social (2-4 hrs), Health (1-3 hrs)
    let score = 100;
    
    // Penalize overworking
    if (workHrs > 9) {
      score -= (workHrs - 9) * 15;
    } else if (workHrs < 4) {
      score -= (4 - workHrs) * 5; // not enough productivity
    }

    // Penalize lack of sleep
    if (sleepHrs < 6.5) {
      score -= (6.5 - sleepHrs) * 20;
    } else if (sleepHrs > 9.5) {
      score -= (sleepHrs - 9.5) * 5;
    }

    // Penalize low personal/social life
    if (lifeSocialHrs < 2) {
      score -= (2 - lifeSocialHrs) * 15;
    }

    // Penalize low health/fitness time
    if (healthHrs < 1) {
      score -= (1 - healthHrs) * 10;
    }

    score = Math.max(20, Math.min(100, Math.round(score)));

    // Nervous System Strain Score (Stress Index)
    // Sympathetic (fight/flight) vs Parasympathetic (rest/recovery)
    // Elevating factors: High work hours, late sleeping, bad sleep quality
    // Restoring factors: Mindfulness minutes, sleep quality, workout, social contact with core inner circle
    let sympatheticLoad = (workHrs * 8); // work stress
    if (sleepHrs < 6.5) sympatheticLoad += 25; // low sleep toll
    
    let parasympatheticCalm = (sleepHrs * 5); // sleep recovery
    parasympatheticCalm += (healthHrs * 15); // fitness & breath recovery
    
    // check inner contacts met recently
    const innerCircle = contacts.filter(c => c.closenessTier === 'inner');
    parasympatheticCalm += (innerCircle.length * 6); // social oxytocin booster

    const totalEnergyLoad = sympatheticLoad + parasympatheticCalm;
    const balanceRatio = totalEnergyLoad > 0 
      ? Math.round((parasympatheticCalm / totalEnergyLoad) * 100) 
      : 50;

    return {
      workHrs,
      lifeSocialHrs,
      healthHrs,
      sleepHrs,
      freeHrs,
      score,
      balanceRatio // % of parasympathetic recovery
    };
  };

  const metrics = calculateMetrics();

  // Create radial bar data
  const radialData = [
    { name: 'خواب و استراحت', value: metrics.sleepHrs, fill: '#8D7F72' },
    { name: 'امور کاری و شغلی', value: metrics.workHrs, fill: '#E26645' },
    { name: 'زندگی شخصی و کافه', value: metrics.lifeSocialHrs, fill: '#D4AF37' },
    { name: 'سلامت، ورزش و ذهن', value: metrics.healthHrs, fill: '#7C8363' },
  ];

  // Stacked Bar Data over past week
  // Build weekly trend from real sleep logs data
  const weeklyTrendData = useMemo(() => {
    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']
    
    // If we have sleep logs for the past week, use them
    if (sleepLogs.length >= 3) {
      const result = []
      const now = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000)
        const dateStr = d.toISOString().slice(0, 10)
        const dayIdx = d.getDay()
        // Saturday = 6 in JS but 0 in our array
        const persianIdx = (dayIdx + 1) % 7
        
        const daySleep = sleepLogs.find(l => l.date === dateStr)
        const dayWorkout = workoutLogs.filter(l => l.date === dateStr)
        const daySessions = sessions.filter(l => l.date === dateStr)
        
        const sleepVal = daySleep ? daySleep.duration : 0
        const healthVal = dayWorkout.reduce((s, w) => s + (w.durationMinutes || 0), 0) / 60 
          + daySessions.reduce((s, m) => s + (m.durationMinutes || 0), 0) / 60
        
        result.push({
          day: dayNames[persianIdx],
          'کار و تسک': 0,
          'معاشرت و زندگی': 0,
          'ورزش و تندرستی': Math.round(healthVal * 10) / 10,
          'خواب و استراحت': Math.round(sleepVal * 10) / 10,
        })
      }
      return result
    }
    
    // No real data — return empty structure (not fake data)
    return dayNames.map(day => ({
      day,
      'کار و تسک': 0,
      'معاشرت و زندگی': 0,
      'ورزش و تندرستی': 0,
      'خواب و استراحت': 0,
    }))
  }, [sleepLogs, workoutLogs, sessions])

  // Determine nervous system status label and style
  let nervousStatusLabel = 'متعادل و پایدار ⚖️';
  let nervousStatusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200';
  let nervousStatusDesc = 'سیستم پاراسمپاتیک (ریکاوری) و سمپاتیک (تنش کاری) شما در یک همبستگی عالی قرار دارند. آمادگی روانی و بدنی شما بالا است.';

  if (metrics.balanceRatio < 40) {
    nervousStatusLabel = 'تنش سمپاتیک بالا (در معرض خستگی) ⚠️';
    nervousStatusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200';
    nervousStatusDesc = 'سیستم عصبی شما در فاز گریز و جنگ طولانی‌مدت قرار گرفته است. ساعات کار طولانی، خواب ناکافی یا استرس انباشته زنگ خطری برای خستگی مفرط هستند.';
  } else if (metrics.balanceRatio > 65) {
    nervousStatusLabel = 'ریکاوری فوق‌العاده قوی 🔋';
    nervousStatusColor = 'text-[#9B6B61] dark:text-[#C59B93] bg-[#F9F1D8] dark:bg-[#201D13] border-[#EBE3C8]';
    nervousStatusDesc = 'سطح ریکاوری بدنی و ذهنی بسیار عالی است. انرژی انباشته خوبی برای شروع چالش‌های سنگین کاری و خلاقانه دارید.';
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">📊</span>
            <span>گزارش توازن زندگی و سیستم عصبی</span>
          </h2>
          <p className="text-xs text-[#8D7F72] dark:text-[#9D978B] mt-1">بررسی توزیع ساعات کار، آرامش روانی، تندرستی و ریکاوری غدد فوق‌کلیوی</p>
        </div>

        {/* Toggle Range */}
        <div className="bg-[#E6DFD3]/40 dark:bg-[#20241A]/50 p-1 rounded-2xl border border-[#E6DFD3]/80 dark:border-[#3D4133]/40 flex gap-1 w-full md:w-auto">
          <button 
            onClick={() => setReportRange('day')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${reportRange === 'day' ? 'bg-[#E26645] text-white shadow-md' : 'text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-white'}`}
          >
            امروز ({getPersianNumber('۱۴')} تیر)
          </button>
          <button 
            onClick={() => setReportRange('week')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${reportRange === 'week' ? 'bg-[#E26645] text-white shadow-md' : 'text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-white'}`}
          >
            میانگین ۷ روز گذشته
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Radial balance score card */}
        <div className="lg:col-span-4 bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm flex flex-col justify-between text-center items-center">
          <div className="w-full text-right mb-4">
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
              <span className="w-1.5 h-3 rounded bg-[#F9F1D8]0"></span>
              نمره کلی توازن زندگی (Work-Life)
            </h3>
          </div>

          {/* Dynamic Score Ring */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Visual background circle in SVG */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="80" stroke="#E6DFD3" strokeWidth="12" fill="transparent" className="opacity-30 dark:opacity-10" />
              <motion.circle 
                cx="96" 
                cy="96" 
                r="80" 
                stroke={metrics.score > 75 ? '#7C8363' : metrics.score > 50 ? '#D4AF37' : '#E26645'} 
                strokeWidth="12" 
                fill="transparent" 
                strokeDasharray="502"
                initial={{ strokeDashoffset: 502 }}
                animate={{ strokeDashoffset: 502 - (502 * metrics.score) / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div>
              <span className="text-5xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono tracking-tighter">
                {getPersianNumber(metrics.score)}
              </span>
              <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mt-1">از ۱۰۰ امتیاز بیومتریک</span>
            </div>
          </div>

          <div className="mt-4">
            <span className={`text-xs font-black px-3.5 py-1.5 rounded-full border ${
              metrics.score > 75 ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' : 
              metrics.score > 50 ? 'bg-[#F9F1D8] text-[#9B6B61] border-[#EBE3C8] dark:bg-[#201D13] dark:text-[#C59B93] dark:border-[#3D3929]' : 
              'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
            }`}>
              {metrics.score > 80 ? 'توازن فوق‌العاده طلایی 🌟' : metrics.score > 60 ? 'توازن قابل قبول و پایدار 👍' : 'هشدار خستگی کاری و عدم توازن 🚨'}
            </span>
            <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-3 max-w-xs leading-relaxed mx-auto">
              این نمره حاصل پایش روزانه کارآمدی شغلی، خواب شبانه، آرامش عصب واگ، معاشرت‌های باکیفیت و تنفس عمیق است.
            </p>
          </div>
        </div>

        {/* Breakdown of hours list */}
        <div className="lg:col-span-8 bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
              <span className="w-1.5 h-3 rounded bg-[#7C8363]"></span>
              سهم‌بندی ۲۴ ساعت زندگی شما
            </h3>
            <span className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">مبنا: ثبت زمان‌های واقعی تقویم و ردیاب‌ها</span>
          </div>

          {/* Slices of life cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Work */}
            <div className="p-4 rounded-2xl bg-[#F4E9E4]/40 dark:bg-[#2D3025]/10 border border-[#EDDDD7] dark:border-[#3D4133]/20 text-right">
              <div className="flex justify-between items-center text-rose-600">
                <Briefcase className="w-4 h-4 text-[#E26645]" />
                <span className="text-[10px] font-black text-[#E26645] bg-[#E26645]/10 px-2 py-0.5 rounded-md">کار و کسب</span>
              </div>
              <span className="text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono mt-3 block">{getPersianNumber(metrics.workHrs)} <span className="text-xs font-sans">ساعت</span></span>
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 block">هدف ایده‌آل: ۶ تا ۸ ساعت</span>
              {onNavigate && (
                <button onClick={() => onNavigate('tasks')} className="mt-2 text-[9px] font-bold text-[#E26645] hover:underline cursor-pointer">مشاهده تسک‌ها ←</button>
              )}
            </div>

            {/* Sleep */}
            <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-right">
              <div className="flex justify-between items-center text-slate-600">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] font-black text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">خواب و ریکاوری</span>
              </div>
              <span className="text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono mt-3 block">{getPersianNumber(metrics.sleepHrs)} <span className="text-xs font-sans">ساعت</span></span>
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 block">هدف ایده‌آل: ۷ تا ۹ ساعت</span>
              {onNavigate && (
                <button onClick={() => onNavigate('sleep')} className="mt-2 text-[9px] font-bold text-slate-500 hover:underline cursor-pointer">مشاهده خواب ←</button>
              )}
            </div>

            {/* Social / Family */}
            <div className="p-4 rounded-2xl bg-[#F9F1D8]/40 dark:bg-[#201D13]/10 border border-[#EBE3C8] dark:border-[#3D3929] text-right">
              <div className="flex justify-between items-center text-[#9B6B61]">
                <Smile className="w-4 h-4 text-[#9B6B61]" />
                <span className="text-[10px] font-black text-[#9B6B61] bg-[#F9F1D8]0/10 px-2 py-0.5 rounded-md">شخصی و تفریح</span>
              </div>
              <span className="text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono mt-3 block">{getPersianNumber(metrics.lifeSocialHrs)} <span className="text-xs font-sans">ساعت</span></span>
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 block">هدف ایده‌آل: ۲ تا ۴ ساعت</span>
              {onNavigate && (
                <button onClick={() => onNavigate('occasions')} className="mt-2 text-[9px] font-bold text-[#9B6B61] hover:underline cursor-pointer">مشاهده مناسبت‌ها ←</button>
              )}
            </div>

            {/* Health */}
            <div className="p-4 rounded-2xl bg-[#E8ECE0]/40 dark:bg-[#20241A]/10 border border-[#DDE2D5] dark:border-[#3D4133]/20 text-right">
              <div className="flex justify-between items-center text-emerald-600">
                <Activity className="w-4 h-4 text-[#7C8363]" />
                <span className="text-[10px] font-black text-[#7C8363] bg-[#7C8363]/10 px-2 py-0.5 rounded-md">ورزش و ذهن‌آگاهی</span>
              </div>
              <span className="text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono mt-3 block">{getPersianNumber(metrics.healthHrs)} <span className="text-xs font-sans">ساعت</span></span>
              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 block">هدف ایده‌آل: ۱ تا ۳ ساعت</span>
              {onNavigate && (
                <button onClick={() => onNavigate('fitness')} className="mt-2 text-[9px] font-bold text-[#7C8363] hover:underline cursor-pointer">مشاهده ورزش ←</button>
              )}
            </div>

          </div>

          {/* Slices representation using Recharts Stacked bar or standard list */}
          <div className="h-2 py-1.5 rounded-full flex overflow-hidden">
            <div style={{ width: `${(metrics.workHrs/24)*100}%` }} className="bg-[#E26645] h-full" title="کار" />
            <div style={{ width: `${(metrics.sleepHrs/24)*100}%` }} className="bg-slate-400 dark:bg-slate-700 h-full" title="خواب" />
            <div style={{ width: `${(metrics.lifeSocialHrs/24)*100}%` }} className="bg-[#9B6B61] h-full" title="زندگی شخصی" />
            <div style={{ width: `${(metrics.healthHrs/24)*100}%` }} className="bg-[#7C8363] h-full" title="ورزش و ذهن" />
            <div style={{ width: `${(metrics.freeHrs/24)*100}%` }} className="bg-slate-200 dark:bg-slate-800 h-full" title="آزاد و شناور" />
          </div>
          <div className="flex justify-center gap-4 text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#E26645] rounded-full"></span> کار ({getPersianNumber(Math.round((metrics.workHrs/24)*100))}٪)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-700 rounded-full"></span> خواب ({getPersianNumber(Math.round((metrics.sleepHrs/24)*100))}٪)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#9B6B61] rounded-full"></span> تفریح ({getPersianNumber(Math.round((metrics.lifeSocialHrs/24)*100))}٪)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#7C8363] rounded-full"></span> ورزش ({getPersianNumber(Math.round((metrics.healthHrs/24)*100))}٪)</span>
          </div>
        </div>

      </div>

      {/* Nervous system, Weekly Trend and Recommendations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Nervous System Strain & Tips */}
        <div className="lg:col-span-6 space-y-6">
          {/* Nervous system state */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
              <span className="p-1 rounded bg-[#F9F1D8]0/10 text-[#9B6B61]">🧠</span>
              وضعیت تنش غدد فوق‌کلیوی و سیستم عصبی
            </h3>

            <div className={`p-4 rounded-2xl border-2 leading-relaxed ${nervousStatusColor}`}>
              <span className="text-xs font-black block mb-1">{nervousStatusLabel}</span>
              <p className="text-[10px] font-semibold">{nervousStatusDesc}</p>
            </div>

            {/* Sympathetic vs Parasympathetic balance gauge */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                <span>تنش سمپاتیک ⚡ (شغل / اضطراب)</span>
                <span>ریکاوری پاراسمپاتیک 🔋 (خواب / ذهن)</span>
              </div>
              <div className="w-full bg-rose-500 h-3 rounded-full overflow-hidden flex">
                <div style={{ width: `${100 - metrics.balanceRatio}%` }} className="bg-[#E26645] h-full" />
                <div style={{ width: `${metrics.balanceRatio}%` }} className="bg-[#7C8363] h-full" />
              </div>
              <div className="flex justify-between text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                <span>فشار غدد فوق کلیوی ({getPersianNumber(100 - metrics.balanceRatio)}٪)</span>
                <span>پایداری اعصاب واگ ({getPersianNumber(metrics.balanceRatio)}٪)</span>
              </div>
            </div>
          </div>

          {/* Action plan */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
              <span className="p-1 rounded bg-rose-500/10 text-rose-500">📋</span>
              پروتکل اقدام فوری برای تعادل بهینه سبک زندگی
            </h3>

            <div className="space-y-3 text-xs leading-relaxed">
              {metrics.workHrs > 8.5 && (
                <div className="flex gap-2 text-[#8D7F72] dark:text-[#9D978B]">
                  <span className="text-rose-500 font-bold shrink-0">⚠️ کار مازاد:</span>
                  <span>امروز کار و جلسات شما از مرز ۸.۵ ساعت گذشت. همین حالا لپ‌تاپ را ببندید و در ۲ ساعت آینده هیچ ایمیل یا پیامی را باز نکنید.</span>
                </div>
              )}

              {metrics.sleepHrs < 7 && (
                <div className="flex gap-2 text-[#8D7F72] dark:text-[#9D978B]">
                  <span className="text-rose-500 font-bold shrink-0">😴 کسر خواب:</span>
                  <span>میانگین خواب شما پایین‌تر از محدوده بقای سلولی مغز است. امشب نور خانه را از ساعت ۹ شب کم کنید و از دمنوش بابونه استفاده کنید.</span>
                </div>
              )}

              <div className="flex gap-2 text-[#8D7F72] dark:text-[#9D978B]">
                <span className="text-[#7C8363] font-bold shrink-0">👥 تقویت هورمون عشق (اکسی‌توسین):</span>
                <span>برای آرامش عمیق عصبی، یک فنجان چای یا پیاده‌روی مشترک را با افراد کلیدی خانواده یا دوستان صمیمی خود ترتیب دهید.</span>
              </div>

              <div className="flex gap-2 text-[#8D7F72] dark:text-[#9D978B]">
                <span className="text-[#E26645] font-bold shrink-0">🧘 ذهن‌آگاهی مغز:</span>
                <span>برای فرود آوردن سیستم عصبی از تنش آلفا به بتای آرامش‌بخش، ۱۰ دقیقه تکنیک تنفس عمیق ۴-۷-۸ را قبل از خواب انجام دهید.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Weekly Breakdown chart */}
        <div className="lg:col-span-6 bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 rounded bg-[#F9F1D8]0"></span>
              روند توازن زمانی هفتگی
            </h3>
            <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mb-5">تغییرات ساعات اختصاص‌یافته به چهار ستون اصلی توازن در روزهای گذشته</p>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#8D7F72" />
                <YAxis tick={{ fontSize: 9 }} stroke="#8D7F72" />
                <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', textAlign: 'right' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="کار و تسک" stackId="a" fill="#E26645" />
                <Bar dataKey="خواب و استراحت" stackId="a" fill="#8D7F72" />
                <Bar dataKey="معاشرت و زندگی" stackId="a" fill="#D4AF37" />
                <Bar dataKey="ورزش و تندرستی" stackId="a" fill="#7C8363" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-3 bg-white dark:bg-[#20241A] rounded-2xl border border-[#E6DFD3]/40 dark:border-[#3D4133]/20 text-xs text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
            <span className="font-black text-[#2D3025] dark:text-[#E8ECE0] block mb-1">🔍 تحلیل همبستگی روندها:</span>
            {metrics.score > 0 ? (
              <>نمره توازن شما {getPersianNumber(metrics.score)} از ۱۰۰ است. {metrics.score >= 75 ? 'وضعیت شما در محدوده مطلوب قرار دارد. تداوم عادات فعلی کلید حفظ این تعادل است.' : metrics.score >= 50 ? 'توازن شما قابل قبول است اما جای بهبود دارد. روی افزایش ساعات ورزش و خواب تمرکز کنید.' : 'توازن شما نیازمند توجه جدی است. ساعات کار را کاهش و خواب و ورزش را افزایش دهید.'}</>
            ) : (
              <>هنوز داده کافی برای تحلیل روند هفتگی ثبت نشده. با ثبت منظم خواب، ورزش و فعالیت‌ها، نمودار روند تکمیل خواهد شد.</>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
