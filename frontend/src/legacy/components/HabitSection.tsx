import React, { useState } from 'react';
import { Habit } from '../types';
import { 
  Flame, 
  CheckCircle, 
  PlusCircle, 
  Calendar, 
  Trophy, 
  Trash2, 
  Info,
  Award,
  Sparkles,
  Plus,
  Activity,
  ArrowRight,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap,
  UserPlus,
  Smile,
  Check,
  AlertCircle,
  TrendingDown,
  ChevronLeft,
  Sliders,
  Sparkle
} from 'lucide-react';
import SectionHeader from './SectionHeader';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Cell
} from 'recharts';

interface HabitSectionProps {
  habits: Habit[];
  onToggleHabitLog: (habitId: string, date: string) => void;
  onAddHabit: (name: string, description: string, extras?: Partial<Habit>) => void;
  onDeleteHabit: (id: string) => void;
  onUpdateHabit: (id: string, updates: Partial<Habit>) => void;
  todayDate: string;
}

export default function HabitSection({ 
  habits, 
  onToggleHabitLog, 
  onAddHabit, 
  onDeleteHabit, 
  onUpdateHabit, 
  todayDate 
}: HabitSectionProps) {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  
  // Advanced Habit creation states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cue, setCue] = useState('');
  const [craving, setCraving] = useState('');
  const [response, setResponse] = useState('');
  const [reward, setReward] = useState('');
  const [stackAfter, setStackAfter] = useState('');
  const [stackAction, setStackAction] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [identityGoal, setIdentityGoal] = useState('');
  const [targetQty, setTargetQty] = useState<string>('');
  const [unit, setUnit] = useState('');
  const [autoTrackType, setAutoTrackType] = useState<'mindfulness' | 'workout' | 'meal' | 'sleep' | 'none'>('none');

  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stackSourceType, setStackSourceType] = useState<'custom' | 'habit'>('custom');
  const [stackSourceHabitId, setStackSourceHabitId] = useState('');

  // State to track if we are logging custom quantity for a habit day
  const [activeQtyLogger, setActiveQtyLogger] = useState<{
    habitId: string;
    date: string;
    targetQty: number;
    unit: string;
    currentVal: number;
  } | null>(null);

  // Generate the last 7 days for the weekly mini-tracker
  const getLast7Days = (): string[] => {
    const days: string[] = [];
    const baseDate = new Date(todayDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Day of week labels in Persian
  const getPersianDayName = (dateStr: string): string => {
    const dateObj = new Date(dateStr);
    const day = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
    const persianDays = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];
    return persianDays[day];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    // Package the extras if advanced is open or if values are provided
    const extras: Partial<Habit> = {
      difficulty,
      autoTrackType: autoTrackType !== 'none' ? autoTrackType : undefined,
    };

    if (cue.trim()) extras.cue = cue.trim();
    if (craving.trim()) extras.craving = craving.trim();
    if (response.trim()) extras.response = response.trim();
    if (reward.trim()) extras.reward = reward.trim();
    
    if (stackAfter.trim() && stackAction.trim()) {
      extras.stackAfter = stackAfter.trim();
      extras.stackAction = stackAction.trim();
    }

    if (identityGoal.trim()) extras.identityGoal = identityGoal.trim();
    
    const qty = parseInt(targetQty);
    if (!isNaN(qty) && qty > 0) {
      extras.targetQty = qty;
      extras.unit = unit.trim() || 'مرتبه';
      extras.qtyLogs = {};
    }

    onAddHabit(newHabitName.trim(), newHabitDesc.trim(), extras);

    // Reset Form
    setNewHabitName('');
    setNewHabitDesc('');
    setCue('');
    setCraving('');
    setResponse('');
    setReward('');
    setStackAfter('');
    setStackAction('');
    setStackSourceType('custom');
    setStackSourceHabitId('');
    setDifficulty('medium');
    setIdentityGoal('');
    setTargetQty('');
    setUnit('');
    setAutoTrackType('none');
    setShowAdvanced(false);
    setIsModalOpen(false);
  };

  // Stride Score - Weighted consistency over last 14 days (non-toxic streak replacement)
  const calculateStrideScore = (habit: Habit): { score: number; level: string; color: string; bgClass: string } => {
    const last14 = [];
    const baseDate = new Date(todayDate);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      last14.push(`${year}-${month}-${day}`);
    }
    
    let completionsWeightSum = 0;
    let totalWeightSum = 0;
    
    last14.forEach((day, index) => {
      const weight = index + 1; // More recent dates have higher weight
      totalWeightSum += weight;
      
      if (habit.logs.includes(day)) {
        // If quantitative, weight it by the proportion of completed quantity (optional)
        if (habit.targetQty && habit.qtyLogs && habit.qtyLogs[day] !== undefined) {
          const ratio = Math.min(1, habit.qtyLogs[day] / habit.targetQty);
          completionsWeightSum += weight * ratio;
        } else {
          completionsWeightSum += weight;
        }
      }
    });
    
    const ratio = totalWeightSum > 0 ? completionsWeightSum / totalWeightSum : 0;
    const score = Math.round(ratio * 100);
    
    let level = 'سرد و بی‌تحرک';
    let color = 'text-[#8D7F72] border-[#E6DFD3] bg-[#FDFBF7]';
    let bgClass = 'bg-[#8D7F72]';

    if (score >= 90) {
      level = 'ثبات فولادی و افسانه‌ای';
      color = 'text-[#7C8363] border-[#7C8363] bg-[#E8ECE0]';
      bgClass = 'bg-[#7C8363]';
    } else if (score >= 70) {
      level = 'پایداری عالی';
      color = 'text-[#536551] border-[#B9C6B7] bg-[#F1F6F0]';
      bgClass = 'bg-[#536551]';
    } else if (score >= 40) {
      level = 'رشد مطلوب';
      color = 'text-[#9B6B61] border-[#EBE3C8] bg-[#FDF5EB]';
      bgClass = 'bg-[#9B6B61]';
    } else if (score > 0) {
      level = 'در حال شکل‌گیری';
      color = 'text-[#B08968] border-[#EDDDD7] bg-[#FAF3F0]';
      bgClass = 'bg-[#B08968]';
    }
    
    return { score, level, color, bgClass };
  };

  // Gamified Identity Points System (Based on completions & difficulty)
  const getIdentityAlignmentPoints = () => {
    const pointsMap: Record<string, { points: number; count: number; habits: string[] }> = {};
    
    habits.forEach(habit => {
      const identity = habit.identityGoal?.trim() || 'رشد فردی';
      const completionsCount = habit.logs.length;
      
      // Calculate weight based on difficulty
      let diffMultiplier = 10; // Medium default
      if (habit.difficulty === 'easy') diffMultiplier = 5;
      if (habit.difficulty === 'hard') diffMultiplier = 15;
      
      let basePoints = completionsCount * diffMultiplier;
      
      // Add custom quantities as extra micro-points
      if (habit.qtyLogs) {
        Object.values(habit.qtyLogs).forEach(qty => {
          if (habit.targetQty) {
            basePoints += Math.round((qty / habit.targetQty) * 3);
          }
        });
      }

      if (!pointsMap[identity]) {
        pointsMap[identity] = { points: 0, count: 0, habits: [] };
      }
      pointsMap[identity].points += basePoints;
      pointsMap[identity].count += completionsCount;
      if (!pointsMap[identity].habits.includes(habit.name)) {
        pointsMap[identity].habits.push(habit.name);
      }
    });
    
    return Object.entries(pointsMap).map(([name, data]) => ({
      identity: name,
      ...data
    })).sort((a, b) => b.points - a.points);
  };

  // Dynamic Target Adjustment Analysis: checks if user is falling behind and recommends lightening
  const checkDynamicAdjustment = (habit: Habit) => {
    if (!habit.targetQty || habit.targetQty <= 0 || !habit.qtyLogs) return null;
    
    const loggedDates = Object.keys(habit.qtyLogs);
    if (loggedDates.length < 3) return null; // We need at least 3 quantitative logs
    
    // Sort dates to look at the latest completions
    const sortedDates = [...loggedDates].sort((a, b) => b.localeCompare(a));
    const recentDates = sortedDates.slice(0, 5);
    
    let sum = 0;
    recentDates.forEach(d => {
      sum += habit.qtyLogs?.[d] || 0;
    });
    
    const avg = sum / recentDates.length;
    
    // If the average of the last entries is below 70% of target
    if (avg < habit.targetQty * 0.7) {
      // Suggest a lower, safer target (e.g. rounded to nearest 5 or 2)
      let suggested = Math.round(avg * 1.1);
      if (suggested > 5) {
        suggested = Math.round(suggested / 5) * 5;
      }
      
      if (suggested < habit.targetQty && suggested > 0) {
        return {
          avg: Math.round(avg),
          suggested: Math.max(1, suggested),
          reason: 'سبک‌سازی خودکار و موقتی برای غلبه بر مقاومت ذهنی و بازیابی انگیزه'
        };
      }
    }
    return null;
  };

  const handleDayClick = (habit: Habit, date: string) => {
    const isDone = habit.logs.includes(date);
    if (isDone) {
      // Untoggle
      onToggleHabitLog(habit.id, date);
      if (habit.qtyLogs && habit.qtyLogs[date] !== undefined) {
        const updatedQtyLogs = { ...habit.qtyLogs };
        delete updatedQtyLogs[date];
        onUpdateHabit(habit.id, { qtyLogs: updatedQtyLogs });
      }
    } else {
      // If it is a quantitative habit, prompt for quantity
      if (habit.targetQty && habit.targetQty > 0) {
        setActiveQtyLogger({
          habitId: habit.id,
          date,
          targetQty: habit.targetQty,
          unit: habit.unit || 'واحد',
          currentVal: habit.targetQty // Default to full target
        });
      } else {
        onToggleHabitLog(habit.id, date);
      }
    }
  };

  const handleSaveQtyLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQtyLogger) return;
    const { habitId, date, currentVal } = activeQtyLogger;
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Add log date if not present
    if (!habit.logs.includes(date)) {
      onToggleHabitLog(habitId, date);
    }

    // Save actual logged value
    const updatedQtyLogs = { ...(habit.qtyLogs || {}), [date]: currentVal };
    onUpdateHabit(habitId, { qtyLogs: updatedQtyLogs });
    setActiveQtyLogger(null);
  };

  // Helper function for longest streak calculation
  const getLongestStreak = (logs: string[]): number => {
    if (!logs || logs.length === 0) return 0;
    const sortedDates = [...logs].sort().map(d => new Date(d));
    let maxStreak = 1;
    let currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diffTime = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    return Math.max(maxStreak, currentStreak);
  };

  // Generate the last 30 days for detail view
  const getLast30Days = (baseDateStr: string): string[] => {
    const days: string[] = [];
    const baseDate = new Date(baseDateStr);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
    }
    return days;
  };

  // Weekly bar analysis calculation
  const getDayOfWeekStats = (logs: string[]) => {
    const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    logs.forEach(logStr => {
      const d = new Date(logStr);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      const irIndex = (day + 1) % 7; // Sunday maps to 1, Saturday maps to 0
      counts[irIndex]++;
    });

    return weekdays.map((name, idx) => ({
      name,
      تعداد: counts[idx]
    }));
  };

  // Cumulative line calculation
  const getCumulativeChartData = (logs: string[]) => {
    const last15Days = [];
    const baseDate = new Date(todayDate);
    for (let i = 14; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      last15Days.push(`${year}-${month}-${day}`);
    }

    let runningTotal = 0;
    const firstDayStr = last15Days[0];
    const firstDayDate = new Date(firstDayStr);
    
    logs.forEach(logStr => {
      const logDate = new Date(logStr);
      if (logDate < firstDayDate) {
        runningTotal++;
      }
    });

    return last15Days.map(day => {
      if (logs.includes(day)) {
        runningTotal++;
      }
      const jsDate = new Date(day);
      const dayNum = jsDate.getDate();
      return {
        date: day.substring(5), // MM-DD
        روز: `${dayNum}`,
        تعداد: runningTotal
      };
    });
  };

  // Personalized advice helper
  const getHabitAiInsight = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('آب') || lowercaseName.includes('نوشیدن')) {
      return {
        category: 'هیدراتاسیون و سلامت عمومی',
        tip: 'کاهش خستگی ذهنی با مصرف آب',
        advice: 'نوشیدن آب بلافاصله پس از بیداری، متابولیسم را تا ۲۴٪ افزایش می‌دهد. سعی کنید یک بطری آب همیشه روی میز کار خود قرار دهید تا نشانه بصری مداومی برای شما باشد.'
      };
    }
    if (lowercaseName.includes('ورزش') || lowercaseName.includes('پیاده') || lowercaseName.includes('باشگاه') || lowercaseName.includes('دویدن') || lowercaseName.includes('شنا') || lowercaseName.includes('نرمش') || lowercaseName.includes('یوگا')) {
      return {
        category: 'تمدد اعصاب و تندرستی فیزیکی',
        tip: 'قانون ۵ دقیقه برای شروع تنبلی فیزیکی',
        advice: 'هرگاه انرژی رفتن به ورزش را ندارید، به خود بگویید فقط ۵ دقیقه تمرین خواهم کرد. ۹۰٪ اوقات پس از شروع، بدن ترشح دوپامین را شروع کرده و مایل به ادامه تمرین خواهید بود.'
      };
    }
    if (lowercaseName.includes('مطالعه') || lowercaseName.includes('کتاب') || lowercaseName.includes('بخوان') || lowercaseName.includes('خواندن') || lowercaseName.includes('درس')) {
      return {
        category: 'توسعه فردی و ارتقای دانش',
        tip: 'قانون ۲ صفحه در روز',
        advice: 'به جای هدف‌گذاری بزرگ مانند نیم ساعت مطالعه، آن را به "خواندن ۲ صفحه کتاب در روز" خرد کنید. ساخت زنجیره تیک مهم‌تر از حجم مطالعه سنگین یک‌باره است.'
      };
    }
    if (lowercaseName.includes('خواب') || lowercaseName.includes('زود بیدار') || lowercaseName.includes('سحرخیز')) {
      return {
        category: 'بهداشت خواب و انرژی زیستی',
        tip: 'کاهش نور آبی قبل از خواب',
        advice: 'حداقل ۳۰ دقیقه قبل از زمان خواب، از گوشی همراه استفاده نکنید. نور آبی صفحه گوشی تولید ملاتونین را سرکوب کرده و کیفیت خواب عمیق شما را تخریب می‌کند.'
      };
    }
    if (lowercaseName.includes('مدیتیشن') || lowercaseName.includes('مراقبه') || lowercaseName.includes('آرامش') || lowercaseName.includes('تنفس')) {
      return {
        category: 'ذن و سلامت روان',
        tip: 'تنفس مربعی ۴-۴-۴-۴',
        advice: 'در فواصل کاری شلوغ، ۴ ثانیه دم، ۴ ثانیه حبس نفس، ۴ ثانیه بازدم و ۴ ثانیه حبس مجدد انجام دهید. این تکنیک سیستم عصبی پاراسمپاتیک را بلافاصله فعال می‌کند.'
      };
    }
    return {
      category: 'قوانین ساخت عادات پایدار',
      tip: 'ثبات، پادشاه تغییرات بزرگ است',
      advice: 'تحقیقات نشان می‌دهد ساخت یک عادت جدید به طور متوسط ۶۶ روز زمان می‌برد. مهم نیست گاهی یک روز را از دست بدهید، قانون طلایی این است: هرگز دو روز متوالی زنجیره را قطع نکنید!'
    };
  };

  // General statistics for top panel
  const totalHabitsCount = habits.length;
  const completedTodayCount = habits.filter(h => h.logs.includes(todayDate)).length;
  const totalLogsCount = habits.reduce((sum, h) => sum + h.logs.length, 0);
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  // If detailed habit is selected, show details page
  const selectedHabit = habits.find(h => h.id === selectedHabitId);
  
  if (selectedHabit) {
    const maxStreak = getLongestStreak(selectedHabit.logs);
    const last30DaysList = getLast30Days(todayDate);
    const completedLast30DaysCount = last30DaysList.filter(day => selectedHabit.logs.includes(day)).length;
    const completionRate30 = Math.round((completedLast30DaysCount / 30) * 100);
    const aiInsight = getHabitAiInsight(selectedHabit.name);
    const cumulativeData = getCumulativeChartData(selectedHabit.logs);
    const weekdayData = getDayOfWeekStats(selectedHabit.logs);
    
    // Dynamic adjustment suggestion
    const adjustmentSuggestion = checkDynamicAdjustment(selectedHabit);
    const strideInfo = calculateStrideScore(selectedHabit);

    return (
      <div className="space-y-6 text-right pb-12" dir="rtl">
        {/* Back navigation header */}
        <div className="flex justify-between items-center bg-[#FDFBF7] py-3.5 px-5 rounded-2xl border border-[#E6DFD3] shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedHabitId(null)}
              className="p-2 bg-[#F9F6EE] hover:bg-[#E6DFD3]/60 border border-[#E6DFD3] rounded-xl text-[#8D7F72] transition-all cursor-pointer flex items-center justify-center"
              title="بازگشت به لیست"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-[#8D7F72] block">جزئیات، پایداری استراید و تعدیل عادت</span>
              <h2 className="text-sm font-black text-[#2D3025] font-serif-elegant">{selectedHabit.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#7C8363] bg-[#E8ECE0] border border-[#DDE2D5] px-2.5 py-1 rounded-lg">
              تاریخ ایجاد: {selectedHabit.createdAt}
            </span>
            <button
              onClick={() => {
                if (confirm(`آیا مایل به حذف کامل عادت "${selectedHabit.name}" هستید؟`)) {
                  onDeleteHabit(selectedHabit.id);
                  setSelectedHabitId(null);
                }
              }}
              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="حذف کامل عادت"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic target adjustment notification */}
        {adjustmentSuggestion && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-[#F4E9E4] border border-[#EDDDD7] rounded-2xl flex items-start gap-4 shadow-sm"
          >
            <div className="p-2.5 bg-white border border-[#EDDDD7] rounded-xl shrink-0 text-xl text-[#9B6B61] flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold text-[#9B6B61] flex items-center gap-1.5 font-serif-elegant">
                <span>🤖 دستیار تعدیل پویای بار (کاهش هوشمند بار)</span>
              </h4>
              <p className="text-xs text-[#2D3025] leading-relaxed">
                بر اساس آنالیز ۵ بازه ثبت‌شده اخیر، میانگین عملکرد شما <strong>{adjustmentSuggestion.avg} {selectedHabit.unit || 'واحد'}</strong> بوده درحالی‌که هدف شما بر روی <strong>{selectedHabit.targetQty}</strong> تنظیم شده است. برای حفظ انگیزه ذهنی و پیوستگی عادت بدون ایجاد سرخوردگی، مایلید هدف را سبک‌تر کنیم؟
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    onUpdateHabit(selectedHabit.id, { targetQty: adjustmentSuggestion.suggested });
                    alert(`با موفقیت تعدیل شد! هدف جدید شما: ${adjustmentSuggestion.suggested} ${selectedHabit.unit || 'واحد'}`);
                  }}
                  className="px-3 py-1.5 bg-[#9B6B61] hover:bg-[#855B52] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  تعدیل موقت هدف به {adjustmentSuggestion.suggested} {selectedHabit.unit}
                </button>
                <span className="text-[9px] text-[#8D7F72]">همیشه پایداری زنجیره مهم‌تر از سنگینی حجم کار است.</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Habit main Info description card */}
        <div className="bg-[#FDFBF7] p-6 rounded-3xl border border-[#EBE3C8] shadow-xs relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="absolute top-0 left-0 p-3 opacity-10 pointer-events-none">
            <Sparkles className="w-16 h-16 text-[#7C8363]" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F9F1D8] border border-[#EBE3C8] text-[#9B6B61]">
                سختی: {{ easy: 'آسان', medium: 'متوسط', hard: 'سخت' }[selectedHabit.difficulty || 'medium']}
              </span>
              {selectedHabit.identityGoal && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E8ECE0] border border-[#DDE2D5] text-[#7C8363] flex items-center gap-1">
                  <UserPlus className="w-2.5 h-2.5" />
                  <span>هویت: {selectedHabit.identityGoal}</span>
                </span>
              )}
              {selectedHabit.autoTrackType && selectedHabit.autoTrackType !== 'none' && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#F4E9E4] border border-[#EDDDD7] text-[#9B6B61] flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-[#9B6B61]" />
                  <span>ردیابی خودکار از {selectedHabit.autoTrackType === 'mindfulness' ? 'ذهن‌آگاهی' : selectedHabit.autoTrackType === 'workout' ? 'ورزش فیزیکی' : selectedHabit.autoTrackType === 'meal' ? 'وعده‌های غذایی' : 'خواب شبانه'}</span>
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-[#2D3025]">{selectedHabit.name}</h3>
            <p className="text-xs text-[#8D7F72] leading-relaxed pr-1">{selectedHabit.description || 'بدون توضیحات اضافی'}</p>
          </div>

          {/* Mini Stride progress circle/display */}
          <div className="flex items-center gap-4 bg-[#F9F6EE] p-4.5 rounded-2xl border border-[#EBE3C8] min-w-[220px] shrink-0">
            <div className="relative w-14 h-14 flex items-center justify-center bg-white rounded-full border border-[#EBE3C8] shadow-xs shrink-0">
              <span className="text-sm font-black text-[#7C8363] font-serif-elegant">{strideInfo.score}%</span>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[10px] font-bold text-[#8D7F72] block">امتیاز استراید (پایداری غیرسمی)</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border inline-block ${strideInfo.color}`}>
                {strideInfo.level}
              </span>
              <p className="text-[8px] text-[#8D7F72] max-w-[140px] leading-tight">امتیاز پایداری بر اساس عملکرد ۱۴ روز اخیر محاسبه شده و با یک غیبت به صفر نمی‌رسد.</p>
            </div>
          </div>
        </div>

        {/* James Clear Atomic Habit Loop visual representation */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl border border-[#E6DFD3] shadow-xs">
          <h4 className="text-xs font-black text-[#2D3025] mb-5 flex items-center gap-1.5 font-serif-elegant">
            <Brain className="w-4 h-4 text-[#7C8363]" />
            <span>طرح حلقه عادت اتمیک (James Clear Habit Loop)</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            {/* Cue */}
            <div className="bg-[#F9F6EE] p-4 rounded-xl border border-[#EBE3C8] flex flex-col justify-between items-center space-y-2 relative">
              <div className="absolute top-2 right-2 text-[10px] font-black text-[#E6DFD3]">۱</div>
              <span className="text-[10px] font-bold text-[#8D7F72] bg-white border border-[#EBE3C8] px-2 py-0.5 rounded-md">محرک (Cue)</span>
              <p className="text-xs font-semibold text-[#2D3025] leading-relaxed pt-1">
                {selectedHabit.cue || 'ثبت نشده؛ مثلاً صدای زنگ ساعت یا بعد از بیدار شدن'}
              </p>
              <span className="text-[8px] text-[#8D7F72] pt-2">واضحش کن!</span>
            </div>

            {/* Craving */}
            <div className="bg-[#FAF3F0] p-4 rounded-xl border border-[#EDDDD7] flex flex-col justify-between items-center space-y-2 relative">
              <div className="absolute top-2 right-2 text-[10px] font-black text-[#EDDDD7]">۲</div>
              <span className="text-[10px] font-bold text-[#9B6B61] bg-white border border-[#EDDDD7] px-2 py-0.5 rounded-md">تمایل (Craving)</span>
              <p className="text-xs font-semibold text-[#2D3025] leading-relaxed pt-1">
                {selectedHabit.craving || 'ثبت نشده؛ اشتیاق به تغییر حس یا فایده عادت'}
              </p>
              <span className="text-[8px] text-[#9B6B61] pt-2">جذابش کن!</span>
            </div>

            {/* Response */}
            <div className="bg-[#F1F6F0] p-4 rounded-xl border border-[#B9C6B7] flex flex-col justify-between items-center space-y-2 relative">
              <div className="absolute top-2 right-2 text-[10px] font-black text-[#B9C6B7]">۳</div>
              <span className="text-[10px] font-bold text-[#536551] bg-white border border-[#B9C6B7] px-2 py-0.5 rounded-md">پاسخ (Response)</span>
              <p className="text-xs font-semibold text-[#2D3025] leading-relaxed pt-1">
                {selectedHabit.response || selectedHabit.name}
              </p>
              <span className="text-[8px] text-[#536551] pt-2">آسانش کن!</span>
            </div>

            {/* Reward */}
            <div className="bg-[#FDF9ED] p-4 rounded-xl border border-[#EBE3C8] flex flex-col justify-between items-center space-y-2 relative">
              <div className="absolute top-2 right-2 text-[10px] font-black text-[#EBE3C8]">۴</div>
              <span className="text-[10px] font-bold text-[#9B7C36] bg-white border border-[#EBE3C8] px-2 py-0.5 rounded-md">پاداش (Reward)</span>
              <p className="text-xs font-semibold text-[#2D3025] leading-relaxed pt-1">
                {selectedHabit.reward || 'ثبت نشده؛ پاداشی کوچک یا ثبت بلافاصله تیک'}
              </p>
              <span className="text-[8px] text-[#9B7C36] pt-2">رضایت‌بخش کن!</span>
            </div>
          </div>

          {/* Habit Stacking Display */}
          {selectedHabit.stackAfter && selectedHabit.stackAction && (
            <div className="mt-5 p-4.5 bg-[#F9F1D8] border border-[#EBE3C8] rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔗</span>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#9B6B61] block">فرمول عادت‌سازی زنجیره‌ای (Habit Stack)</span>
                  <p className="text-xs font-semibold text-[#2D3025] mt-0.5">
                    من بلافاصله بعد از <strong className="text-[#9B6B61]">«{selectedHabit.stackAfter}»</strong>، کار <strong className="text-[#7C8363]">«{selectedHabit.stackAction}»</strong> را انجام خواهم داد.
                  </p>
                </div>
              </div>
              <span className="text-[8px] text-[#8D7F72] border border-[#E6DFD3] px-2 py-1 rounded bg-white">پیوند عصب‌شناختی</span>
            </div>
          )}
        </div>

        {/* Bento stats card grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Stat 1: Stride Score */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#EBE3C8] flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#8D7F72] font-semibold block">امتیاز پایداری استراید</span>
              <h4 className="text-xl font-bold text-[#7C8363] font-serif-elegant">
                {strideInfo.score} <span className="text-xs font-normal text-[#8D7F72]">/ ۱۰۰</span>
              </h4>
            </div>
            <div className="p-3 rounded-xl bg-[#E8ECE0] text-[#7C8363] border border-[#DDE2D5]">
              <Target className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 2: Current Streak */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#EBE3C8] flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#8D7F72] font-semibold block">زنجیره فعلی</span>
              <h4 className="text-xl font-bold text-[#9B6B61] font-serif-elegant">
                {selectedHabit.streak} <span className="text-xs font-normal text-[#8D7F72]">روز</span>
              </h4>
            </div>
            <div className="p-3 rounded-xl bg-[#F4E9E4] text-[#9B6B61] border border-[#EDDDD7]">
              <Flame className="w-5 h-5 fill-[#9B6B61]" />
            </div>
          </div>

          {/* Stat 3: Best Streak */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#EBE3C8] flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#8D7F72] font-semibold block">بهترین زنجیره شما</span>
              <h4 className="text-xl font-bold text-[#2D3025] font-serif-elegant">
                {maxStreak} <span className="text-xs font-normal text-[#8D7F72]">روز</span>
              </h4>
            </div>
            <div className="p-3 rounded-xl bg-[#F9F1D8] text-[#9B6B61] border border-[#EBE3C8]">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 4: Total completions */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#DDE2D5] flex items-center justify-between shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[#8D7F72] font-semibold block">کل تیک‌ها تاکنون</span>
              <h4 className="text-xl font-bold text-[#7C8363] font-serif-elegant">
                {selectedHabit.logs.length} <span className="text-xs font-normal text-[#8D7F72]">مرتبه</span>
              </h4>
            </div>
            <div className="p-3 rounded-xl bg-[#E8ECE0] text-[#7C8363] border border-[#DDE2D5]">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 30-Day Check-in interactive grid calendar */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl border border-[#E6DFD3] shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#7C8363]" />
              <span>تقویم تیک‌های ۳۰ روز گذشته</span>
            </h4>
            <span className="text-[10px] text-[#8D7F72] font-semibold">تیک گذشته یا مقدار انجام شده را ثبت یا ویرایش کنید</span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {last30DaysList.map((day, index) => {
              const isDone = selectedHabit.logs.includes(day);
              const isToday = day === todayDate;
              const dateObj = new Date(day);
              const dayNum = dateObj.getDate();
              const monthName = dateObj.toLocaleDateString('fa-IR', { month: 'short' });
              
              // Find if there is custom quantity logged
              const customQty = selectedHabit.qtyLogs?.[day];

              return (
                <div 
                  key={day} 
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center relative ${
                    isDone 
                      ? 'bg-[#E8ECE0]/40 border-[#DDE2D5]' 
                      : isToday 
                        ? 'bg-[#F9F1D8]/30 border-[#9B6B61]'
                        : 'bg-white border-[#E6DFD3]/60'
                  }`}
                >
                  <span className="text-[8px] font-bold text-[#8D7F72]">
                    {getPersianDayName(day)}
                  </span>
                  
                  <button
                    onClick={() => handleDayClick(selectedHabit, day)}
                    className={`w-8 h-8 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isDone 
                        ? 'bg-[#7C8363] border-[#7C8363] text-white' 
                        : isToday 
                          ? 'bg-transparent border-[#9B6B61] text-[#9B6B61]' 
                          : 'bg-transparent border-[#D6CFC3] hover:border-[#8D7F72] text-[#8D7F72]'
                    }`}
                    title={day}
                  >
                    {isDone ? (
                      customQty !== undefined && selectedHabit.targetQty ? (
                        <div className="flex flex-col items-center justify-center -space-y-0.5">
                          <span className="text-[9px] font-black font-mono leading-none">{customQty}</span>
                          <span className="text-[6px] opacity-85 leading-none">{selectedHabit.unit}</span>
                        </div>
                      ) : (
                        <CheckCircle className="w-5 h-5 fill-white text-[#7C8363]" />
                      )
                    ) : (
                      <span className="text-[10px] font-black font-mono">{dayNum}</span>
                    )}
                  </button>

                  <span className="text-[7px] font-bold text-[#8D7F72] truncate w-full">
                    {dayNum} {monthName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom quantity logger inline modal/popup overlay */}
        {activeQtyLogger && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in" dir="rtl">
            <div className="bg-[#FDFBF7] border border-[#E6DFD3] p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
              <div className="text-right">
                <span className="text-[9px] font-bold text-[#9B6B61] bg-[#F4E9E4] px-2 py-0.5 rounded-md">ثبت مقدار عددی عادت</span>
                <h4 className="text-xs font-black text-[#2D3025] mt-1">امروز چقدر انجام دادید؟</h4>
                <p className="text-[10px] text-[#8D7F72]">برای تاریخ {activeQtyLogger.date} (هدف: {activeQtyLogger.targetQty} {activeQtyLogger.unit})</p>
              </div>

              <form onSubmit={handleSaveQtyLogSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#2D3025]">
                    <span>۰</span>
                    <span className="text-sm text-[#7C8363] font-black">{activeQtyLogger.currentVal} {activeQtyLogger.unit}</span>
                    <span>{activeQtyLogger.targetQty * 2} (حداکثر)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={activeQtyLogger.targetQty * 2}
                    value={activeQtyLogger.currentVal}
                    onChange={(e) => setActiveQtyLogger({ ...activeQtyLogger, currentVal: parseInt(e.target.value) })}
                    className="w-full accent-[#7C8363]"
                  />

                  {/* Precise number input field */}
                  <div className="flex justify-center items-center gap-2 pt-1 pb-1">
                    <span className="text-[10px] font-bold text-[#8D7F72]">ثبت مقدار دقیق:</span>
                    <input
                      type="number"
                      min="0"
                      value={activeQtyLogger.currentVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setActiveQtyLogger({ ...activeQtyLogger, currentVal: isNaN(val) ? 0 : val });
                      }}
                      className="w-20 px-2 py-1 text-center font-black text-xs border border-[#D6CFC3] rounded-lg bg-white text-[#2D3025] focus:outline-none focus:border-[#7C8363] font-mono"
                    />
                    <span className="text-[10px] font-bold text-[#2D3025]">{activeQtyLogger.unit}</span>
                  </div>
                  
                  {/* Quick shortcuts */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveQtyLogger({ ...activeQtyLogger, currentVal: Math.round(activeQtyLogger.targetQty * 0.5) })}
                      className="py-1 text-[9px] font-bold bg-[#F9F6EE] hover:bg-[#EBE3C8] border border-[#EBE3C8] rounded-md transition-colors"
                    >
                      ۵۰٪ هدف
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQtyLogger({ ...activeQtyLogger, currentVal: activeQtyLogger.targetQty })}
                      className="py-1 text-[9px] font-bold bg-[#E8ECE0] hover:bg-[#DDE2D5] border border-[#DDE2D5] text-[#7C8363] rounded-md transition-colors"
                    >
                      ۱۰۰٪ هدف
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQtyLogger({ ...activeQtyLogger, currentVal: Math.round(activeQtyLogger.targetQty * 1.5) })}
                      className="py-1 text-[9px] font-bold bg-[#F9F1D8] hover:bg-[#EBE3C8] border border-[#EBE3C8] text-[#5A5A40] rounded-md transition-colors"
                    >
                      ۱۵۰٪ هدف
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl transition-all cursor-pointer"
                  >
                    ثبت نهایی و ذخیره
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveQtyLogger(null)}
                    className="px-4 py-2 text-xs font-bold text-[#8D7F72] bg-[#F9F6EE] hover:bg-[#E6DFD3] border border-[#E6DFD3] rounded-xl transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Ascending Progress Chart */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] shadow-xs">
            <h4 className="text-xs font-black text-[#2D3025] mb-4 flex items-center gap-1.5 font-serif-elegant">
              <TrendingUp className="w-4 h-4 text-[#7C8363]" />
              <span>نمودار رشد و تجمعی تیک‌ها (۱۵ روز اخیر)</span>
            </h4>
            <div className="h-48 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C8363" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7C8363" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD3" vertical={false} />
                  <XAxis dataKey="روز" stroke="#8D7F72" tickLine={false} />
                  <YAxis stroke="#8D7F72" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FDFBF7', borderColor: '#E6DFD3', borderRadius: '12px', textAlign: 'right' }} 
                    labelFormatter={(label) => `روز ${label}`}
                  />
                  <Area type="monotone" dataKey="تعداد" name="کل تیک‌ها" stroke="#7C8363" strokeWidth={2} fillOpacity={1} fill="url(#colorCompletions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Weekday breakdown */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#E6DFD3] shadow-xs">
            <h4 className="text-xs font-black text-[#2D3025] mb-4 flex items-center gap-1.5 font-serif-elegant">
              <Target className="w-4 h-4 text-[#9B6B61]" />
              <span>آنالیز فعالیت بر اساس روزهای هفته</span>
            </h4>
            <div className="h-48 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD3" vertical={false} />
                  <XAxis dataKey="name" stroke="#8D7F72" tickLine={false} />
                  <YAxis stroke="#8D7F72" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FDFBF7', borderColor: '#E6DFD3', borderRadius: '12px', textAlign: 'right' }} 
                  />
                  <Bar dataKey="تعداد" name="تعداد تیک‌ها" fill="#9B6B61" radius={[4, 4, 0, 0]}>
                    {weekdayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.تعداد > 0 ? '#7C8363' : '#E6DFD3'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI wisdom/insights card */}
        <div className="p-5 bg-[#F9F1D8] border border-[#EBE3C8] rounded-2xl flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-white border border-[#EBE3C8] shrink-0 text-lg">
            🌱
          </div>
          <div className="text-right space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#9B6B61] bg-white border border-[#EBE3C8] px-2 py-0.5 rounded-md">
                کوچ هوشمند همبافت: {aiInsight.category}
              </span>
            </div>
            <h4 className="text-xs font-black text-[#2D3025]">{aiInsight.tip}</h4>
            <p className="text-xs text-[#3D3D3D] leading-relaxed font-semibold">
              {aiInsight.advice}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const identitiesList = getIdentityAlignmentPoints();

  return (
    <div className="space-y-5 text-right pb-8" dir="rtl">
      <SectionHeader
        icon={Flame}
        title="عادت‌ها"
        subtitle="ساخت، ردیابی و تقویت عادت‌های روزانه"
        badge={totalHabitsCount > 0 ? `${completedTodayCount}/${totalHabitsCount}` : undefined}
        badgeVariant={completedTodayCount === totalHabitsCount && totalHabitsCount > 0 ? 'success' : 'default'}
        actions={
          <button
            onClick={() => { setNewHabitName(''); setIsModalOpen(true); }}
            className="px-3 py-1.5 bg-[#7C8363] dark:bg-[#5A5A40] text-white text-[10px] font-bold rounded-xl hover:bg-[#5A5A40] dark:hover:bg-[#7C8363] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            عادت جدید
          </button>
        }
      />
      
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Habit Status Card */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#EBE3C8] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#8D7F72] font-semibold">عادت‌های کامل‌شده امروز</span>
            <h3 className="text-2xl font-bold text-[#2D3025] font-serif-elegant">
              {completedTodayCount} <span className="text-xs font-normal text-[#8D7F72]">از {totalHabitsCount} عادت</span>
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[#F9F1D8] text-[#9B6B61] border border-[#EBE3C8]">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Best Streak Card */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#E6DFD3] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#8D7F72] font-semibold">بهترین زنجیره فعال شما</span>
            <h3 className="text-2xl font-bold text-[#9B6B61] font-serif-elegant">
              {bestStreak} <span className="text-xs font-normal text-[#8D7F72]">روز متوالی</span>
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[#F4E9E4] text-[#9B6B61] border border-[#EDDDD7]">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Total Checkins Card */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#DDE2D5] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#8D7F72] font-semibold">کل تیک‌های ثبت‌شده تاکنون</span>
            <h3 className="text-2xl font-bold text-[#7C8363] font-serif-elegant">
              {totalLogsCount} <span className="text-xs font-normal text-[#8D7F72]">انجام موفق</span>
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[#E8ECE0] text-[#7C8363] border border-[#DDE2D5]">
            <Award className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Identity Alignment Gamification Board */}
      {identitiesList.length > 0 && (
        <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#DDE2D5] shadow-xs">
          <h3 className="text-xs font-black text-[#2D3025] mb-3 flex items-center gap-1.5 font-serif-elegant">
            <Award className="w-4 h-4 text-[#7C8363]" />
            <span>ترازوی همسویی با هویت هدف (امتیازهای کسب‌شده عادات)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {identitiesList.map(item => (
              <div key={item.identity} className="p-3 bg-white border border-[#EBE3C8] rounded-xl flex items-center justify-between gap-2 shadow-xs">
                <div className="space-y-0.5 max-w-[120px]">
                  <span className="text-[10px] font-black text-[#2D3025] block truncate" title={item.identity}>
                    {item.identity}
                  </span>
                  <span className="text-[7px] text-[#8D7F72] block truncate">
                    عادات مرتبط: {item.habits.join('، ')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-[#7C8363] font-serif-elegant block">{item.points} <span className="text-[7px] font-normal text-[#8D7F72]">امتیاز</span></span>
                  <span className="text-[7px] text-[#8D7F72] block">{item.count} تیک موفق</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add New Habit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" dir="rtl">
          <div className="bg-[#FDFBF7] p-6 md:p-8 rounded-3xl shadow-2xl border border-[#E6DFD3] w-full max-w-4xl space-y-6 my-8 max-h-[90vh] overflow-y-auto relative text-right">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 left-4 text-[#8D7F72] hover:text-[#2D3025] transition-colors font-bold text-lg p-2 rounded-full hover:bg-[#E8ECE0] z-10"
              type="button"
            >
              ✕
            </button>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black text-[#7C8363] uppercase tracking-wider block">رهگیری هوشمند عادات پایدار (اتمیک)</span>
              <h3 className="text-lg md:text-xl font-black text-[#2D3025] flex items-center gap-2 font-serif-elegant">
                <PlusCircle className="w-5 h-5 text-[#7C8363]" />
                <span>طراحی و ثبت عادت جدید در بستر زندگی زنجیره‌ای</span>
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* COLUMN 1: BASIC METRICS & DETAILS */}
                <div className="space-y-4">
                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E6DFD3] space-y-4">
                    <span className="text-[10px] font-black text-[#7C8363] block border-b border-[#EBE3C8] pb-1.5">📝 شناسنامه و نام‌گذاری عادت</span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#8D7F72]">نام عادت چیست؟ <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: نوشیدن ۸ لیوان آب، ۲۰ دقیقه مطالعه کتاب"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-[#8D7F72]">توضیح یا تمایل قلبی برای عادت</label>
                      <textarea
                        placeholder="مثال: رشد فردی مستمر یا پاکسازی سموم بدن و شادابی پوست در طول روز"
                        value={newHabitDesc}
                        onChange={(e) => setNewHabitDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] h-20 resize-none bg-[#FDFBF7]"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E6DFD3] space-y-4">
                    <span className="text-[10px] font-black text-[#7C8363] block border-b border-[#EBE3C8] pb-1.5">📊 اهداف مقداری و سختی</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">مقدار هدف روزانه</label>
                        <input
                          type="number"
                          placeholder="مثال: ۸، ۳۰"
                          value={targetQty}
                          onChange={(e) => setTargetQty(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none focus:border-[#7C8363]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">واحد اندازه‌گیری</label>
                        <input
                          type="text"
                          placeholder="مثال: لیوان، دقیقه"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none focus:border-[#7C8363]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">درجه سختی</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as any)}
                          className="w-full px-2 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] bg-[#FDFBF7]"
                        >
                          <option value="easy">آسان (۵ امتیاز)</option>
                          <option value="medium">متوسط (۱۰ امتیاز)</option>
                          <option value="hard">سخت (۱۵ امتیاز)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72]">هویت هدف (Identity)</label>
                        <input
                          type="text"
                          placeholder="مثال: یک دونده، نویسنده"
                          value={identityGoal}
                          onChange={(e) => setIdentityGoal(e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] bg-[#FDFBF7]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Smart Auto-tracking Option */}
                  <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E6DFD3] space-y-2">
                    <label className="text-[10px] font-black text-[#9B6B61] flex items-center gap-1 border-b border-[#EBE3C8] pb-1.5">
                      <Zap className="w-3.5 h-3.5 fill-[#9B6B61] text-[#9B6B61]" />
                      <span>🤖 ردیابی خودکار هوشمند (شبیه‌ساز سنسور)</span>
                    </label>
                    <select
                      value={autoTrackType}
                      onChange={(e) => setAutoTrackType(e.target.value as any)}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] bg-[#FDFBF7]"
                    >
                      <option value="none">بدون ردیابی خودکار (ثبت دستی تیک)</option>
                      <option value="mindfulness">اتصال خودکار به تمرینات ذهن‌آگاهی و مدیتیشن</option>
                      <option value="workout">اتصال خودکار به ثبت ورزش‌های روزانه</option>
                      <option value="meal">اتصال خودکار به ثبت وعده‌های غذایی</option>
                      <option value="sleep">اتصال خودکار به ثبت خواب شبانه</option>
                    </select>
                    <span className="text-[9px] text-[#8D7F72] block leading-relaxed pr-0.5 pt-1">
                      سیستم هوشمند هماهنگی رفتاری به محض ثبت لاگ مربوطه، عادت شما را خودکار تیک می‌زند.
                    </span>
                  </div>
                </div>

                {/* COLUMN 2: HABIT STACKING & ATOMIC BEHAVIOR PLAN */}
                <div className="space-y-4">
                  
                  {/* Habit Stacking Formula */}
                  <div className="p-4 bg-[#F9F6EE] rounded-2xl border border-[#EBE3C8] space-y-3">
                    <div className="flex justify-between items-center border-b border-[#EBE3C8] pb-1.5">
                      <span className="text-[10px] font-black text-[#9B6B61] block font-serif-elegant">🔗 فرمول عادت‌سازی زنجیره‌ای (Stacking)</span>
                      
                      {/* Source selector */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStackSourceType('custom');
                            setStackAfter('');
                          }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-extrabold border transition-all cursor-pointer ${
                            stackSourceType === 'custom' 
                              ? 'bg-[#7C8363] text-white border-[#7C8363]' 
                              : 'bg-white text-[#8D7F72] border-[#D6CFC3]'
                          }`}
                        >
                          فعالیت دلخواه
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStackSourceType('habit');
                            if (habits.length > 0) {
                              setStackSourceHabitId(habits[0].id);
                              setStackAfter(habits[0].name);
                            }
                          }}
                          disabled={habits.length === 0}
                          className={`px-2 py-1 rounded-lg text-[9px] font-extrabold border transition-all cursor-pointer ${
                            habits.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                          } ${
                            stackSourceType === 'habit' 
                              ? 'bg-[#7C8363] text-white border-[#7C8363]' 
                              : 'bg-white text-[#8D7F72] border-[#D6CFC3]'
                          }`}
                        >
                          عادت‌های من
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-[10px] font-bold text-[#8D7F72] shrink-0">بلافاصله بعد از انجام رفتار زیر:</span>
                        {stackSourceType === 'habit' && habits.length > 0 ? (
                          <select
                            value={stackSourceHabitId}
                            onChange={(e) => {
                              setStackSourceHabitId(e.target.value);
                              const h = habits.find(hab => hab.id === e.target.value);
                              if (h) setStackAfter(h.name);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] bg-[#FDFBF7] cursor-pointer focus:outline-none"
                          >
                            {habits.map(h => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="مثال: دم‌کردن قهوه صبح، مسواک زدن"
                            value={stackAfter}
                            onChange={(e) => setStackAfter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-[10px] font-bold text-[#8D7F72] shrink-0">این کارِ جدید را انجام می‌دهم:</span>
                        <input
                          type="text"
                          placeholder="مثال: ۵ نفس عمیق، ۱۰ دقیقه یادداشت روزانه"
                          value={stackAction}
                          onChange={(e) => setStackAction(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Atomic Habit 4-part Loop Plan */}
                  <div className="p-4 bg-[#FAF3F0] rounded-2xl border border-[#EDDDD7] space-y-3">
                    <span className="text-[10px] font-black text-[#9B6B61] block border-b border-[#EDDDD7] pb-1.5">🔄 مهندسی ۴ مرحله‌ای لوپ عادت (جیمز کلیر)</span>
                    <div className="space-y-1.5">
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-[#9B6B61] block">۱. محرک محیطی (Cue)</span>
                        <input
                          type="text"
                          placeholder="مثال: بیدار شدن از خواب و دیدن عینک روی میز"
                          value={cue}
                          onChange={(e) => setCue(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-[#9B6B61] block">۲. ایجاد اشتیاق (Craving)</span>
                        <input
                          type="text"
                          placeholder="مثال: احساس میل به تمرکز و شروع پرانرژی صبحگاهی"
                          value={craving}
                          onChange={(e) => setCraving(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-[#9B6B61] block">۳. پاسخ و اقدام عملی آسان (Response)</span>
                        <input
                          type="text"
                          placeholder="مثال: نشستن روی صندلی و شروع به نوشتن ۲ خط"
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-extrabold text-[#9B6B61] block">۴. پاداش و ثبت حس رضایت (Reward)</span>
                        <input
                          type="text"
                          placeholder="مثال: چشیدن طعم چای لذیذ پس از اتمام یادداشت"
                          value={reward}
                          onChange={(e) => setReward(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CFC3] text-[10px] font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2.5 pt-4 border-t border-[#E6DFD3] border-dashed justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 text-xs font-bold text-[#8D7F72] bg-[#FAF8F5] hover:bg-[#E6DFD3] border border-[#E6DFD3] rounded-xl transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>طراحی و ثبت این عادت</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Grid: Habit List & Add New Form */}
      <div className="space-y-6">
        
        {/* Habits Tracker Grid */}
        <div className="space-y-4">
          
          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#7C8363]" />
              <h3 className="text-base font-bold text-[#2D3025] font-serif-elegant">
                <span>رهگیری هفتگی عادت‌ها</span>
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8D7F72] hidden sm:inline">کلیک روی دایره‌ها برای ثبت انجام کار</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>تعریف عادت جدید</span>
              </button>
            </div>
          </div>

          {habits.length > 0 ? (
            habits.map((habit) => {
              const strideInfo = calculateStrideScore(habit);
              
              return (
                <motion.div 
                  key={habit.id}
                  layout
                  className="bg-[#FDFBF7] p-5 rounded-2xl shadow-sm border border-[#E6DFD3] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                >
                  {/* Habit Info */}
                  <div className="space-y-1.5 max-w-sm flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-bold text-[#2D3025] text-sm md:text-base font-serif-elegant">{habit.name}</h4>
                      
                      {habit.streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#9B6B61] bg-[#F4E9E4] px-1.5 py-0.5 rounded-md border border-[#EDDDD7]">
                          <Flame className="w-3 h-3 fill-[#9B6B61] text-[#9B6B61]" />
                          <span>{habit.streak} روز</span>
                        </span>
                      )}

                      <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${strideInfo.color}`}>
                        <span>پایداری: {strideInfo.score}%</span>
                      </span>

                      {habit.identityGoal && (
                        <span className="text-[8px] font-bold text-[#8D7F72] bg-[#F9F6EE] px-1.5 py-0.5 rounded border border-[#E6DFD3]">
                          👤 {habit.identityGoal}
                        </span>
                      )}

                      {habit.autoTrackType && habit.autoTrackType !== 'none' && (
                        <span className="text-[8px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200" title="ردیابی خودکار هوشمند فعال">
                          🤖 خودکار
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#8D7F72] leading-relaxed">{habit.description || 'بدون توضیح اضافی'}</p>

                    {habit.stackAfter && habit.stackAction && (
                      <p className="text-[10px] text-[#9B6B61] bg-[#FDF5EB] py-1 px-2.5 rounded-lg border border-[#F4E9E4] font-semibold w-fit leading-normal">
                        🔗 بعد از «{habit.stackAfter}» ➔ «{habit.stackAction}»
                      </p>
                    )}

                    <div className="pt-1.5 flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedHabitId(habit.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7C8363] hover:text-[#5A5A40] transition-colors cursor-pointer bg-[#E8ECE0]/50 hover:bg-[#E8ECE0] px-2.5 py-1 rounded-lg border border-[#DDE2D5]/70"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>مشاهده آمار، طرح عادت و تعدیل</span>
                      </button>

                      {habit.targetQty && habit.targetQty > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#8D7F72] bg-white border border-[#E6DFD3] px-2 py-0.5 rounded-lg">
                          هدف روزانه: {habit.targetQty} {habit.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 7 Days Grid */}
                  <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#E6DFD3]/40">
                    <div className="flex items-center gap-2">
                      {last7Days.map((day) => {
                        const isDone = habit.logs.includes(day);
                        const isToday = day === todayDate;
                        const qtyLogged = habit.qtyLogs?.[day];

                        return (
                          <div key={day} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-semibold text-[#8D7F72]">
                              {getPersianDayName(day)}
                            </span>
                            <button
                              onClick={() => handleDayClick(habit, day)}
                              className={`w-8 h-8 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-[#7C8363] border-[#7C8363] text-white shadow-xs' 
                                  : isToday
                                    ? 'bg-[#FDFBF7] border-[#9B6B61] text-[#9B6B61]'
                                    : 'bg-[#FDFBF7] border-[#D6CFC3] hover:border-[#8D7F72] text-[#8D7F72]'
                              }`}
                            >
                              {isDone ? (
                                qtyLogged !== undefined && habit.targetQty ? (
                                  <span className="text-[8px] font-black font-mono">{qtyLogged}</span>
                                ) : (
                                  <Check className="w-4 h-4 text-white stroke-[3px]" />
                                )
                              ) : null}
                            </button>
                            <span className="text-[8px] font-bold text-[#8D7F72] font-mono">
                              {day.split('-')[2]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={() => onDeleteHabit(habit.id)}
                      className="text-[#8D7F72] hover:text-[#9B6B61] p-1.5 rounded-lg hover:bg-[#F4E9E4] transition-colors inline-flex cursor-pointer"
                      title="حذف عادت"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-[#FDFBF7] p-12 text-center text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-2xl font-semibold">
              هنوز هیچ عادتی تعریف نکرده‌اید. برای شروع دکمه‌ی «تعریف عادت جدید» را در بالای صفحه کلیک کنید!
            </div>
          )}

          {/* Quick AI Tip Widget */}
          <div className="mt-6 p-4 bg-[#F9F1D8] border border-[#EBE3C8] rounded-2xl flex items-start gap-3">
            <Info className="w-4.5 h-4.5 text-[#9B6B61] shrink-0 mt-0.5" />
            <div className="text-right text-[11px] text-[#3D3D3D] leading-relaxed">
              <span className="font-bold text-[#9B6B61] font-serif-elegant">🌱 فرمول طلایی ساخت هویت پایدار: </span>
              تمرکز خود را به جای «برنده شدن در اهداف»، بر «کسب امتیاز تایید هویت جدید» بگذارید. تیک زدن روزانه عادت، رای موافقی است که به شخصیت ایده‌آل خود می‌دهید. امتیازهای استراید بالا پایداری شما را نمایش می‌دهد.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
