import React, { useState } from 'react';
import { WorkoutLog, Goal, WeightLog, GymExerciseSet, BodyMeasurementLog } from '../types';
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Award, 
  Info, 
  Compass, 
  Sparkles, 
  Activity, 
  Scale, 
  Zap, 
  ChevronRight, 
  TrendingUp, 
  Flame, 
  Heart,
  Target,
  CheckCircle,
  TrendingDown,
  ChevronDown,
  Search,
  PlusCircle,
  BookOpen,
  Ruler
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import PersianDatePicker from './PersianDatePicker';
import { toJalali, toJalaliFriendly, toPersianDigits } from '../utils/jalali';

interface FitnessSectionProps {
  workoutLogs: WorkoutLog[];
  goals: Goal[];
  weightLogs: WeightLog[];
  bodyMeasurementLogs: BodyMeasurementLog[];
  todayDate: string;
  onAddWorkoutLog: (log: Omit<WorkoutLog, 'id'>) => void;
  onDeleteWorkoutLog: (id: string) => void;
  onUpdateGoalMetric: (goalId: string, newValue: number) => void;
  onAddWeightLog: (log: Omit<WeightLog, 'id'>) => void;
  onAddBodyMeasurementLog: (log: Omit<BodyMeasurementLog, 'id'>) => void;
  onDeleteBodyMeasurementLog: (id: string) => void;
  initialCustomExercises?: string[];
  onCustomExercisesChange?: (exercises: string[]) => void;
}

type FitnessSubTab = 'cardio' | 'strength' | 'progress';

export default function FitnessSection({
  workoutLogs = [],
  goals = [],
  weightLogs = [],
  bodyMeasurementLogs = [],
  todayDate,
  onAddWorkoutLog,
  onDeleteWorkoutLog,
  onUpdateGoalMetric,
  onAddWeightLog,
  onAddBodyMeasurementLog,
  onDeleteBodyMeasurementLog,
  initialCustomExercises,
  onCustomExercisesChange
}: FitnessSectionProps) {
  const [activeTab, setActiveTab] = useState<FitnessSubTab>('cardio');

  // Form State for Cardio Log
  const [cardioDate, setCardioDate] = useState<string>(todayDate);
  const [sportType, setSportType] = useState<'running' | 'cycling' | 'swimming' | 'walking'>('running');
  const [cardioDuration, setCardioDuration] = useState<string>('30');
  const [cardioDistance, setCardioDistance] = useState<string>('5');
  const [cardioCalories, setCardioCalories] = useState<string>('250');
  const [cardioNotes, setCardioNotes] = useState<string>('');
  const [cardioSuccess, setCardioSuccess] = useState<boolean>(false);

  // Form State for Gym Strength Workout Log
  const [strengthDate, setStrengthDate] = useState<string>(todayDate);
  const [exName, setExName] = useState<string>('پرس سینه');
  const [exWeight, setExWeight] = useState<string>('60');
  const [exReps, setExReps] = useState<string>('10');
  const [exSets, setExSets] = useState<string>('3');
  const [strengthDuration, setStrengthDuration] = useState<string>('45');
  const [strengthCalories, setStrengthCalories] = useState<string>('200');
  const [strengthNotes, setStrengthNotes] = useState<string>('');
  const [strengthSuccess, setStrengthSuccess] = useState<boolean>(false);

  // Suggested pre-defined gym exercises
  const PRESET_EXERCISES = [
    'پرس سینه (Bench Press)',
    'اسکوات پا (Squat)',
    'ددلیفت (Deadlift)',
    'پرس سرشانه هالتر (Military Press)',
    'جلو بازو دمبل (Bicep Curl)',
    'پشت بازو سیم‌کش (Tricep Pushdown)',
    'زیربغل سیم‌کش (Lat Pulldown)',
    'پرس پا ماشین (Leg Press)'
  ];

  const [customExercises, setCustomExercises] = useState<string[]>(initialCustomExercises?.length ? initialCustomExercises : PRESET_EXERCISES);

  const [strengthViewMode, setStrengthViewMode] = useState<'log' | 'directory'>('log');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [exSearchQuery, setExSearchQuery] = useState<string>('');
  const [movementSearchQuery, setMovementSearchQuery] = useState<string>('');
  const [newExInput, setNewExInput] = useState<string>('');

  React.useEffect(() => {
    if (initialCustomExercises?.length) {
      setCustomExercises(initialCustomExercises);
    }
  }, [initialCustomExercises]);

  React.useEffect(() => {
    onCustomExercisesChange?.(customExercises);
  }, [customExercises, onCustomExercisesChange]);

  // Form State for Body Measurement Log
  const [measureDate, setMeasureDate] = useState<string>(todayDate);
  const [waistVal, setWaistVal] = useState<string>('90');
  const [armVal, setArmVal] = useState<string>('35');
  const [chestVal, setChestVal] = useState<string>('105');
  const [measureNote, setMeasureNote] = useState<string>('');
  const [measureSuccess, setMeasureSuccess] = useState<boolean>(false);

  // Helper calculation for Weight & BMI synchronization
  const latestWeightLogObj = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const currentWeight = latestWeightLogObj ? latestWeightLogObj.weight : 75;

  // Retrieve any active fitness goals in Goals Dashboard
  const fitnessGoals = goals.filter(g => 
    g.category === 'health' && 
    g.metric && 
    (g.title.includes('ورزش') || g.title.includes('تمرین') || g.title.includes('باشگاه') || g.title.includes('دویدن') || g.metric.name.includes('جلسه') || g.metric.name.includes('کیلومتر'))
  );

  // Handle Cardio form submission
  const handleAddCardio = (e: React.FormEvent) => {
    e.preventDefault();
    onAddWorkoutLog({
      date: cardioDate,
      type: 'cardio',
      cardioType: sportType,
      distanceKm: parseFloat(cardioDistance) || undefined,
      durationMinutes: parseFloat(cardioDuration) || 30,
      caloriesBurned: parseFloat(cardioCalories) || undefined,
      notes: cardioNotes || undefined
    });

    // If there is an active running/cardio goal, let's offer to sync values!
    const distanceVal = parseFloat(cardioDistance) || 0;
    const distanceGoal = fitnessGoals.find(g => g.metric?.name.includes('کیلومتر') || g.metric?.name.includes('مسافت'));
    if (distanceGoal && distanceVal > 0) {
      const currentVal = distanceGoal.metric?.currentValue || 0;
      onUpdateGoalMetric(distanceGoal.id, Number((currentVal + distanceVal).toFixed(1)));
    }

    const sessionGoal = fitnessGoals.find(g => g.metric?.name.includes('جلسه') || g.metric?.name.includes('تمرین') || g.metric?.name.includes('تعداد'));
    if (sessionGoal) {
      const currentVal = sessionGoal.metric?.currentValue || 0;
      onUpdateGoalMetric(sessionGoal.id, currentVal + 1);
    }

    setCardioDistance('5');
    setCardioNotes('');
    setCardioSuccess(true);
    setTimeout(() => setCardioSuccess(false), 3000);
  };

  // Handle Gym Strength form submission
  const handleAddStrength = (e: React.FormEvent) => {
    e.preventDefault();
    const mockSet: GymExerciseSet = {
      id: `set-${Date.now()}`,
      exerciseName: exName,
      weight: parseFloat(exWeight) || 0,
      reps: parseInt(exReps) || 0,
      sets: parseInt(exSets) || 1
    };

    onAddWorkoutLog({
      date: strengthDate,
      type: 'strength',
      durationMinutes: parseFloat(strengthDuration) || 45,
      caloriesBurned: parseFloat(strengthCalories) || undefined,
      gymSets: [mockSet],
      notes: strengthNotes || undefined
    });

    // Sync with active workout sessions goals
    const sessionGoal = fitnessGoals.find(g => g.metric?.name.includes('جلسه') || g.metric?.name.includes('تمرین') || g.metric?.name.includes('باشگاه'));
    if (sessionGoal) {
      const currentVal = sessionGoal.metric?.currentValue || 0;
      onUpdateGoalMetric(sessionGoal.id, currentVal + 1);
    }

    setStrengthNotes('');
    setStrengthSuccess(true);
    setTimeout(() => setStrengthSuccess(false), 3000);
  };

  // Handle Body Measurement form submission
  const handleAddBodyMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const waist = parseFloat(waistVal);
    const arm = parseFloat(armVal);
    const chest = parseFloat(chestVal);

    if (isNaN(waist) || isNaN(arm) || isNaN(chest)) return;

    onAddBodyMeasurementLog({
      date: measureDate,
      waist,
      arm,
      chest,
      note: measureNote.trim() || undefined
    });

    setMeasureNote('');
    setMeasureSuccess(true);
    setTimeout(() => setMeasureSuccess(false), 3000);
  };

  // Calculate Personal Records (PR) - Max weight lifted per exercise
  const personalRecords = workoutLogs
    .filter(log => log.type === 'strength' && log.gymSets)
    .reduce((acc: { [key: string]: { maxWeight: number; reps: number; date: string } }, log) => {
      log.gymSets?.forEach(set => {
        const name = set.exerciseName.trim();
        if (!acc[name] || set.weight > acc[name].maxWeight) {
          acc[name] = {
            maxWeight: set.weight,
            reps: set.reps,
            date: log.date
          };
        }
      });
      return acc;
    }, {});

  // Calculate Last Performed Stats for each exercise
  const lastPerformedMap = workoutLogs
    .filter(log => log.type === 'strength' && log.gymSets)
    .reduce((acc: { [key: string]: { date: string; weight: number; reps: number; sets: number; notes?: string } }, log) => {
      log.gymSets?.forEach(set => {
        const name = set.exerciseName.trim();
        const existing = acc[name];
        if (!existing || log.date.localeCompare(existing.date) >= 0) {
          acc[name] = {
            date: log.date,
            weight: set.weight,
            reps: set.reps,
            sets: set.sets,
            notes: log.notes
          };
        }
      });
      return acc;
    }, {});

  // Last 7 Days Burned Calories and Workouts calculations
  const last7DaysFitnessData = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayWorkouts = workoutLogs.filter(log => log.date === dateStr);
    
    const minutes = dayWorkouts.reduce((acc, log) => acc + log.durationMinutes, 0);
    const calories = dayWorkouts.reduce((acc, log) => acc + (log.caloriesBurned || 0), 0);
    
    return {
      date: toJalali(dateStr).slice(5),
      dateFull: toJalaliFriendly(dateStr),
      'مدت تمرین (دقیقه)': minutes,
      'کالری سوخته شده': calories
    };
  });

  const totalCaloriesWeek = last7DaysFitnessData.reduce((acc, d) => acc + d['کالری سوخته شده'], 0);
  const totalMinutesWeek = last7DaysFitnessData.reduce((acc, d) => acc + d['مدت تمرین (دقیقه)'], 0);

  const filteredExercises = customExercises.filter(ex => 
    ex.toLowerCase().includes(exSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="fitness-hub-container">
      {/* Premium Top Hero Summary Widget */}
      <div className="bg-gradient-to-br from-[#7C8363] to-[#5F654B] dark:from-[#2E3326] dark:to-[#1C1F17] p-6 rounded-3xl text-white shadow-lg relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-[#969D7F]/10 rounded-full -ml-16 -mb-16 blur-xl"></div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-emerald-300 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-xl">کلوپ تندرستی همبافت</span>
            </div>
            <h1 className="text-2xl font-black font-serif-elegant">برنامه‌ریزی، ثبت تمرینات عضلانی و هوازی</h1>
            <p className="text-xs text-white/80 max-w-xl font-semibold leading-relaxed">
              تمرینات بدنسازی باشگاه، رکوردهای سنگین‌ترین وزنه‌ها (PR)، مسافت دویدن‌های هوازی و کالری‌سوزی‌های روزانه خود را در این بخش کاملاً هماهنگ ثبت و تحلیل کنید.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="flex-1 min-w-[100px] p-3 bg-white/10 dark:bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm text-center">
              <span className="text-[10px] text-white/60 font-bold block mb-1">جلسات ثبت‌شده هفته</span>
              <span className="text-xl font-mono font-black">{toPersianDigits(workoutLogs.length)}</span>
            </div>
            <div className="flex-1 min-w-[100px] p-3 bg-white/10 dark:bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm text-center">
              <span className="text-[10px] text-white/60 font-bold block mb-1">کالری‌سوزی هفته جاری</span>
              <span className="text-xl font-mono font-black text-emerald-300">{toPersianDigits(totalCaloriesWeek)} <span className="text-[10px] font-normal">kcal</span></span>
            </div>
            <div className="flex-1 min-w-[100px] p-3 bg-white/10 dark:bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm text-center">
              <span className="text-[10px] text-white/60 font-bold block mb-1">وزن فعلی کنونی</span>
              <span className="text-xl font-mono font-black text-[#C59B93]">{toPersianDigits(currentWeight)} <span className="text-[10px] font-normal text-white">kg</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Fitness Dashboard Goals sync notification banner */}
      {fitnessGoals.length > 0 ? (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/40 text-xs font-bold text-emerald-800 dark:text-emerald-400 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 animate-bounce" />
            <span>
              اهداف ورزشی فعال شما همگام‌سازی شد: <span className="underline">{fitnessGoals.length} هدف</span> از بخش اهداف به این کلوپ متصل است و تغییرات تمرین شما مستقیماً اهداف را به جلو می‌راند.
            </span>
          </div>
          <div className="flex gap-2">
            {fitnessGoals.map(g => (
              <span key={g.id} className="bg-white dark:bg-[#20231C] px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 text-[10px] font-black">
                {g.title}: {toPersianDigits(g.metric?.currentValue || 0)} / {toPersianDigits(g.metric?.targetValue || 0)} {g.metric?.unit}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#F3EFE0]/50 dark:bg-[#20231C]/60 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 text-xs text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#7C8363]" />
          <span>
            جهت اتصال خودکار لاگ‌های تمرینی، اهدافی با موضوع «ورزش»، «مسافت دویدن» یا «تعداد تمرین» در دسته‌بندی سلامت ایجاد نمایید.
          </span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-[#F3EFE0]/50 dark:bg-[#20231C]/60 p-1.5 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40">
        <button
          onClick={() => setActiveTab('cardio')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'cardio' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>تمرینات هوازی و عمومی</span>
        </button>
        <button
          onClick={() => setActiveTab('strength')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'strength' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>ثبت رکوردهای بدنسازی (PR)</span>
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'progress' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>گزارشات و تحلیل تندرستی</span>
        </button>
      </div>

      {/* Main Switch Area */}
      <AnimatePresence mode="wait">
        {/* ─── SUB-TAB 1: CARDIO ─── */}
        {activeTab === 'cardio' && (
          <motion.div
            key="cardio-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form logger (5 cols) */}
            <div className="lg:col-span-5 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
              <div className="border-b border-[#E6DFD3]/40 pb-3">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  ثبت لاگ ورزشی هوازی و عمومی جدید
                </h3>
              </div>

              <form onSubmit={handleAddCardio} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ تمرین</label>
                    <PersianDatePicker
                      value={cardioDate}
                      onChange={setCardioDate}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">نوع فعالیت</label>
                    <select
                      value={sportType}
                      onChange={e => setSportType(e.target.value as any)}
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-black"
                    >
                      <option value="running">دویدن 🏃</option>
                      <option value="cycling">دوچرخه‌سواری 🚴</option>
                      <option value="swimming">شنا کردن 🏊</option>
                      <option value="walking">پیاده‌روی روزانه 🚶</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">مدت زمان (دقیقه)</label>
                    <input 
                      type="number"
                      value={cardioDuration}
                      onChange={e => setCardioDuration(e.target.value)}
                      className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono text-[#2D3025] dark:text-[#E8ECE0]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">مسافت (کیلومتر)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={cardioDistance}
                      onChange={e => setCardioDistance(e.target.value)}
                      className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono text-[#2D3025] dark:text-[#E8ECE0]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تخمین کالری‌سوزی</label>
                    <input 
                      type="number"
                      value={cardioCalories}
                      onChange={e => setCardioCalories(e.target.value)}
                      className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono text-[#2D3025] dark:text-[#E8ECE0]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">یادداشت یا لوکیشن مسیر تمرین</label>
                  <input 
                    type="text"
                    value={cardioNotes}
                    onChange={e => setCardioNotes(e.target.value)}
                    placeholder="مثلا: مسیر پارک ملت تهران، سرعت ملایم..."
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#7C8363] hover:bg-[#686D51] active:scale-[0.98] transition-all text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  ثبت لاگ تمرینی هوازی جدید
                </button>

                {cardioSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2"
                  >
                    ✓ فعالیت هوازی شما با موفقیت ثبت و همگام شد!
                  </motion.div>
                )}
              </form>
            </div>

            {/* History Table (7 cols) */}
            <div className="lg:col-span-7 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="border-b border-[#E6DFD3]/40 pb-3">
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#9B6B61]" />
                    تاریخچه تمرینات و هوازی‌های ثبت‌شده
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#E6DFD3] dark:border-[#3D4133]/60 text-[#8D7F72] dark:text-[#9D978B] font-black pb-2">
                        <th className="py-2.5">تاریخ</th>
                        <th>فعالیت</th>
                        <th className="text-center">مدت (دقیقه)</th>
                        <th className="text-center">مسافت (km)</th>
                        <th className="text-center">کالری سوخته</th>
                        <th className="text-left py-2.5">عملیات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workoutLogs.filter(log => log.type === 'cardio').length > 0 ? (
                        workoutLogs
                          .filter(log => log.type === 'cardio')
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 5)
                          .map(log => (
                            <tr key={log.id} className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/30 text-[#2D3025] dark:text-[#E8ECE0] font-semibold hover:bg-[#F9F6EE]/40 dark:hover:bg-[#20231C]/30 transition-colors">
                              <td className="py-3 font-mono">{toPersianDigits(toJalali(log.date))}</td>
                              <td>
                                {log.cardioType === 'running' ? 'دویدن 🏃' :
                                 log.cardioType === 'cycling' ? 'دوچرخه‌سواری 🚴' :
                                 log.cardioType === 'swimming' ? 'شنا کردن 🏊' : 'پیاده‌روی 🚶'}
                              </td>
                              <td className="text-center font-mono">{toPersianDigits(log.durationMinutes)}</td>
                              <td className="text-center font-mono text-emerald-600 dark:text-emerald-400">
                                {log.distanceKm ? toPersianDigits(log.distanceKm) : '—'}
                              </td>
                              <td className="text-center font-mono text-orange-600 dark:text-orange-400">
                                {log.caloriesBurned ? toPersianDigits(log.caloriesBurned) : '—'}
                              </td>
                              <td className="text-left py-3">
                                <button
                                  onClick={() => onDeleteWorkoutLog(log.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                            هیچ لاگ هوازی اخیراً ثبت نشده است. از منوی بغل اولین فعالیت را ثبت نمایید.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/20 rounded-2xl border border-sky-100 dark:border-sky-900/30 text-[11px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                <span className="font-extrabold text-sky-800 dark:text-sky-400 block mb-0.5">🧠 توصیه‌های بازسازی تارهای عضلانی بعد از هوازی</span>
                انجام تمرینات هوازی طولانی‌مدت (بیش از ۴۰ دقیقه) ذخایر گلیکوژن کبد را خالی می‌کند. برای پیشگیری از تخریب بافت‌های عضلانی، مصرف بلافاصله ۲۵ گرم کربوهیدرات ساده همراه با ۳۰ گرم پروتئین خالص (مانند سیب‌زمینی پخته و فیله مرغ) قویاً توصیه می‌گردد.
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── SUB-TAB 2: STRENGTH / BODYBUILDING ─── */}
        {activeTab === 'strength' && (
          <motion.div
            key="strength-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* View Mode Toggle: Log vs Directory */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Dumbbell className="w-4.5 h-4.5 text-[#7C8363]" />
                  مدیریت حرکت‌ها و رکوردهای قدرتی باشگاه
                </h3>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                  برنامه‌ریزی، سازمان‌دهی دایرکتوری عضلات، ثبت ست‌های تمرینی و ردیابی بیشینه رکورد شخصی شما (PR)
                </p>
              </div>

              <div className="flex gap-1.5 bg-[#F3EFE0]/50 dark:bg-[#20231C]/60 p-1 rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/40 w-full sm:w-fit self-stretch sm:self-center">
                <button
                  type="button"
                  onClick={() => setStrengthViewMode('log')}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    strengthViewMode === 'log'
                      ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm'
                      : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
                  }`}
                >
                  ثبت تمرین و تاریخچه
                </button>
                <button
                  type="button"
                  onClick={() => setStrengthViewMode('directory')}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    strengthViewMode === 'directory'
                      ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm'
                      : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  جدول و دایرکتوری حرکت‌ها
                </button>
              </div>
            </div>

            {strengthViewMode === 'log' ? (
              <>
                {/* PR Maximum Weight Lifted Display */}
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors">
              <div className="border-b border-[#E6DFD3]/40 pb-3 mb-4">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-rose-500 animate-pulse" />
                  رکوردهای شخصی شما در باشگاه بدنسازی (Personal Records - PR)
                </h3>
              </div>

              {Object.keys(personalRecords).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(personalRecords).map(([name, data]) => (
                    <div key={name} className="p-4 bg-[#F9F6EE] dark:bg-[#242721] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl flex flex-col justify-between transition-all hover:shadow-sm">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block truncate">{name}</span>
                        <div className="text-xl font-mono font-black text-rose-600 dark:text-rose-400">
                          {toPersianDigits(data.maxWeight)} <span className="text-xs font-normal">kg</span>
                        </div>
                      </div>
                      <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-semibold mt-2 pt-2 border-t border-[#E6DFD3]/40 flex justify-between">
                        <span>تکرار: {toPersianDigits(data.reps)} مرتبه</span>
                        <span>تاریخ: {toPersianDigits(toJalali(data.date).slice(5))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#F9F6EE]/50 dark:bg-[#242721]/50 border border-dashed border-[#E6DFD3] rounded-2xl text-center space-y-1 text-xs text-[#8D7F72] dark:text-[#9D978B]">
                  <span className="text-2xl block">🏅</span>
                  <span className="font-bold">رکوردی از حرکت‌های ورزشی ثبت نشده است.</span>
                  <p className="text-[10px]">اولین ست تمرینی خود را از فرم زیر ثبت کنید تا بیشینه وزنه‌های سنگین شما به صورت پویا محاسبه گردد.</p>
                </div>
              )}
            </div>

            {/* Logging and sets history */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form (5 cols) */}
              <div className="lg:col-span-5 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                <div className="border-b border-[#E6DFD3]/40 pb-3">
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Dumbbell className="w-4 h-4 text-[#7C8363]" />
                    ثبت ست تمرینی بدنسازی جدید
                  </h3>
                </div>

                <form onSubmit={handleAddStrength} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ تمرین</label>
                      <PersianDatePicker
                        value={strengthDate}
                        onChange={setStrengthDate}
                      />
                    </div>

                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">نام حرکت ورزشی</label>
                      <div 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl cursor-pointer flex justify-between items-center text-[#2D3025] dark:text-[#E8ECE0] font-black"
                      >
                        <span>{exName || 'یک حرکت انتخاب کنید...'}</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                      </div>

                      {isDropdownOpen && (
                        <div className="absolute right-0 left-0 mt-1 bg-white dark:bg-[#1E211B] border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto p-2 space-y-1.5">
                          <div className="flex items-center gap-1 bg-[#FDFBF7] dark:bg-[#242721] px-2 py-1 rounded-lg border border-[#D6CFC3]/60 dark:border-[#3D4133]/60">
                            <Search className="w-3.5 h-3.5 text-[#8D7F72] shrink-0" />
                            <input 
                              type="text"
                              value={exSearchQuery}
                              onChange={e => setExSearchQuery(e.target.value)}
                              placeholder="جستجوی حرکت ورزشی..."
                              className="w-full p-1 text-xs bg-transparent border-none outline-none focus:ring-0 text-[#2D3025] dark:text-[#E8ECE0]"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {filteredExercises.length > 0 ? (
                              filteredExercises.map(p => (
                                <div 
                                  key={p}
                                  onClick={() => {
                                    setExName(p);
                                    setIsDropdownOpen(false);
                                    setExSearchQuery('');
                                  }}
                                  className={`p-2 text-xs rounded-lg cursor-pointer text-right transition-colors font-semibold ${
                                    exName === p 
                                      ? 'bg-[#7C8363] text-white' 
                                      : 'hover:bg-[#F9F6EE] dark:hover:bg-[#2A2E25] text-[#2D3025] dark:text-[#E8ECE0]'
                                  }`}
                                >
                                  {p}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-2 text-[10px] text-[#8D7F72] space-y-2">
                                <span>حرکتی یافت نشد.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (exSearchQuery.trim()) {
                                      const newEx = exSearchQuery.trim();
                                      if (!customExercises.includes(newEx)) {
                                        const updated = [...customExercises, newEx];
                                        setCustomExercises(updated);
                                      }
                                      setExName(newEx);
                                      setIsDropdownOpen(false);
                                      setExSearchQuery('');
                                    }
                                  }}
                                  className="block mx-auto px-2.5 py-1 bg-[#7C8363] hover:bg-[#686D51] text-white text-[9px] font-bold rounded-md"
                                >
                                  افزودن حرکت «{exSearchQuery}»
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">وزن هالتر/دمبل (kg)</label>
                      <input 
                        type="number"
                        step="0.5"
                        value={exWeight}
                        onChange={e => setExWeight(e.target.value)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تعداد تکرار (Reps)</label>
                      <input 
                        type="number"
                        value={exReps}
                        onChange={e => setExReps(e.target.value)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تعداد ست (Sets)</label>
                      <input 
                        type="number"
                        value={exSets}
                        onChange={e => setExSets(e.target.value)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">مدت کل تمرین (دقیقه)</label>
                      <input 
                        type="number"
                        value={strengthDuration}
                        onChange={e => setStrengthDuration(e.target.value)}
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">کالری تقریبی (kcal)</label>
                      <input 
                        type="number"
                        value={strengthCalories}
                        onChange={e => setStrengthCalories(e.target.value)}
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl font-mono text-center"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">توضیحات تمرین بدنسازی (اختیاری)</label>
                    <input 
                      type="text"
                      value={strengthNotes}
                      onChange={e => setStrengthNotes(e.target.value)}
                      placeholder="مثلا: تمرین عضلات سینه و پشت بازو عالی..."
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#7C8363] hover:bg-[#686D51] active:scale-[0.98] transition-all text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    ثبت ست تمرینی عضلانی بدنسازی
                  </button>

                  {strengthSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2"
                    >
                      ✓ ست تمرینی شما با موفقیت ثبت شد و رکوردهای شما بروز گردید!
                    </motion.div>
                  )}
                </form>
              </div>

              {/* History list - Strength (7 cols) */}
              <div className="lg:col-span-7 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                <div className="border-b border-[#E6DFD3]/40 pb-3">
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#7C8363]" />
                    دفترچه وقایع روزانه تمرینات بدنسازی (Strength Diary)
                  </h3>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {workoutLogs.filter(log => log.type === 'strength').length > 0 ? (
                    workoutLogs
                      .filter(log => log.type === 'strength')
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map(log => (
                        <div key={log.id} className="p-3 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 flex justify-between items-center transition-colors">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                {toPersianDigits(toJalaliFriendly(log.date))}
                              </span>
                              {log.durationMinutes && (
                                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                                  ⏳ {toPersianDigits(log.durationMinutes)} دقیقه تمرین
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              {log.gymSets?.map(set => (
                                <div key={set.id} className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#7C8363]"></span>
                                  <span>{set.exerciseName}</span>
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#2E3326] border border-[#E6DFD3] px-1.5 py-0.5 rounded-md">
                                    {toPersianDigits(set.weight)} kg × {toPersianDigits(set.reps)} تکرار ({toPersianDigits(set.sets)} ست)
                                  </span>
                                </div>
                              ))}
                            </div>
                            {log.notes && (
                              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">
                                {log.notes}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => onDeleteWorkoutLog(log.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-12 text-[#8D7F72] dark:text-[#9D978B] font-semibold text-xs">
                      هیچ لاگ تمرینات بدنسازی روزانه‌ای اخیراً ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
            ) : (
              <div className="space-y-6">
                {/* Search & Add New Movement bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">جستجوی حرکت ورزشی در جدول</label>
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#242721] px-3 py-2.5 rounded-xl border border-[#D6CFC3] dark:border-[#3D4133]/60">
                      <Search className="w-4 h-4 text-[#8D7F72] shrink-0" />
                      <input 
                        type="text"
                        value={movementSearchQuery}
                        onChange={e => setMovementSearchQuery(e.target.value)}
                        placeholder="جستجوی نام حرکت..."
                        className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 text-[#2D3025] dark:text-[#E8ECE0] font-semibold"
                      />
                    </div>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newExInput.trim()) {
                        const trimmed = newExInput.trim();
                        if (!customExercises.includes(trimmed)) {
                          const updated = [...customExercises, trimmed];
                          setCustomExercises(updated);
                        }
                        setNewExInput('');
                      }
                    }}
                    className="md:col-span-7 flex flex-col sm:flex-row items-end gap-3"
                  >
                    <div className="space-y-1 w-full">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">افزودن و تعریف حرکت عضلانی جدید</label>
                      <input 
                        type="text"
                        value={newExInput}
                        onChange={e => setNewExInput(e.target.value)}
                        placeholder="مثلا: جلو بازو هالتر لاری"
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none text-[#2D3025] dark:text-[#E8ECE0] font-semibold"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-3 bg-[#7C8363] hover:bg-[#686D51] active:scale-[0.98] transition-all text-white text-xs font-black rounded-xl shadow-md cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      تعریف حرکت عضلانی
                    </button>
                  </form>
                </div>

                {/* Directory Table */}
                <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40">
                  <div className="border-b border-[#E6DFD3]/40 pb-3 mb-4 flex justify-between items-center">
                    <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#7C8363]" />
                      جدول حرکت‌های تعریف‌شده باشگاه و تاریخچه عملکرد
                    </h3>
                    <span className="text-[9px] font-mono bg-[#7C8363]/10 text-[#7C8363] dark:text-emerald-400 px-2 py-0.5 rounded-lg font-bold">
                      {toPersianDigits(customExercises.length)} حرکت تعریف‌شده
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-[#E6DFD3] dark:border-[#3D4133]/60 text-[#8D7F72] dark:text-[#9D978B] font-black pb-2 text-[11px]">
                          <th className="py-2.5">نام حرکت</th>
                          <th>آخرین اجرا</th>
                          <th>آخرین مشخصات ست</th>
                          <th className="text-center">رکورد شخصی (PR)</th>
                          <th className="text-left py-2.5">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customExercises
                          .filter(ex => ex.toLowerCase().includes(movementSearchQuery.toLowerCase()))
                          .map(ex => {
                            const lastPerformed = lastPerformedMap[ex];
                            const pr = personalRecords[ex];
                            const isPreset = PRESET_EXERCISES.includes(ex);

                            return (
                              <tr key={ex} className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/30 text-[#2D3025] dark:text-[#E8ECE0] font-semibold hover:bg-[#F9F6EE]/40 dark:hover:bg-[#20231C]/30 transition-colors">
                                <td className="py-3.5 flex items-center gap-2">
                                  <div className="p-1.5 bg-[#7C8363]/10 text-[#7C8363] rounded-lg">
                                    <Dumbbell className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-extrabold">{ex}</span>
                                </td>
                                <td>
                                  {lastPerformed ? (
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                      {toPersianDigits(toJalali(lastPerformed.date))}
                                    </span>
                                  ) : (
                                    <span className="text-[#8D7F72] text-[10px] font-bold">هنوز ثبت نشده</span>
                                  )}
                                </td>
                                <td>
                                  {lastPerformed ? (
                                    <div className="space-x-2 space-x-reverse font-mono text-[11px] text-[#8D7F72] dark:text-[#8D7F72] font-bold">
                                      <span>وزن: {toPersianDigits(lastPerformed.weight)}kg</span>
                                      <span className="text-[#D6CFC3] dark:text-[#3D4133]">|</span>
                                      <span>تکرار: {toPersianDigits(lastPerformed.reps)}</span>
                                      <span className="text-[#D6CFC3] dark:text-[#3D4133]">|</span>
                                      <span>ست: {toPersianDigits(lastPerformed.sets)}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[#8D7F72]">—</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  {pr ? (
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F9F1D8] dark:bg-[#201D13] border border-[#EBE3C8]/50 rounded-xl text-[#5A5A40] dark:text-[#C59B93] font-black font-mono">
                                      <Award className="w-3.5 h-3.5 text-[#9B6B61] animate-pulse" />
                                      <span>{toPersianDigits(pr.maxWeight)} kg</span>
                                      <span className="text-[10px] font-normal">({toPersianDigits(pr.reps)}R)</span>
                                    </div>
                                  ) : (
                                    <span className="text-[#8D7F72]">—</span>
                                  )}
                                </td>
                                <td className="text-left py-3.5">
                                  <div className="inline-flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExName(ex);
                                        setStrengthViewMode('log');
                                      }}
                                      className="px-2.5 py-1.5 bg-[#7C8363] hover:bg-[#686D51] text-white rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      ثبت لاگ با این حرکت
                                    </button>
                                    {!isPreset && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = customExercises.filter(item => item !== ex);
                                          setCustomExercises(updated);
                                        }}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 rounded-lg transition-all cursor-pointer"
                                        title="حذف این حرکت سفارشی"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── SUB-TAB 3: CHARTS & PROGRESS ─── */}
        {activeTab === 'progress' && (
          <motion.div
            key="progress-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Weekly Averages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center space-y-1">
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">مجموع دقایق ورزش هفتگی</span>
                <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {toPersianDigits(totalMinutesWeek)} <span className="text-xs font-normal">دقیقه</span>
                </span>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-center space-y-1">
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">میانگین کالری‌سوزی روزانه</span>
                <span className="text-lg font-black font-mono text-orange-700 dark:text-orange-400">
                  {toPersianDigits(Math.round(totalCaloriesWeek / 7))} <span className="text-xs font-normal">kcal</span>
                </span>
              </div>
              <div className="p-4 bg-[#F9F1D8] dark:bg-[#201D13] rounded-2xl border border-[#EBE3C8] dark:border-[#3D3929] text-center space-y-1">
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">جلسات عضلانی بدنسازی</span>
                <span className="text-lg font-black font-mono text-[#5A5A40] dark:text-[#C59B93]">
                  {toPersianDigits(workoutLogs.filter(l => l.type === 'strength').length)} <span className="text-xs font-normal">جلسه</span>
                </span>
              </div>
              <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-2xl border border-sky-100 dark:border-sky-900/30 text-center space-y-1">
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">جلسات هوازی ثبت‌شده</span>
                <span className="text-lg font-black font-mono text-sky-700 dark:text-sky-400">
                  {toPersianDigits(workoutLogs.filter(l => l.type === 'cardio').length)} <span className="text-xs font-normal">جلسه</span>
                </span>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Calories Burned */}
              <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                <div className="border-b border-[#E6DFD3]/40 pb-3">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500" />
                    نمودار روند روزانه کالری‌سوزی ناشی از تمرین (۷ روز اخیر)
                  </h4>
                </div>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={last7DaysFitnessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCalBurn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                      <XAxis dataKey="date" stroke="#8D7F72" fontSize={9} tickLine={false} />
                      <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '12px', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="کالری سوخته شده"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorCalBurn)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Workout Duration minutes */}
              <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                <div className="border-b border-[#E6DFD3]/40 pb-3">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#7C8363]" />
                    نمودار مجموع دقایق تمرین روزانه (۷ روز اخیر)
                  </h4>
                </div>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last7DaysFitnessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                      <XAxis dataKey="date" stroke="#8D7F72" fontSize={9} tickLine={false} />
                      <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} />
                      <Tooltip
                        contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '12px', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                      />
                      <Bar dataKey="مدت تمرین (دقیقه)" fill="#7C8363" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ─── BODY MEASUREMENTS TRACKER ─── */}
            <div className="bg-white dark:bg-[#1E211A] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-6">
              <div className="border-b border-[#E6DFD3]/40 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Ruler className="w-5 h-5 text-[#7C8363]" />
                    ردیاب ابعاد فیزیکی بدن (دور کمر، بازو و سینه)
                  </h3>
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                    ثبت سایز پهلو و کمر، دور بازوها و دور سینه برای ارزیابی دقیق روند چربی‌سوزی و عضله‌سازی
                  </p>
                </div>
                
                {bodyMeasurementLogs.length > 0 && (
                  <span className="text-[10px] font-mono bg-[#7C8363]/10 text-[#7C8363] dark:text-emerald-400 px-2.5 py-1 rounded-xl font-bold">
                    {toPersianDigits(bodyMeasurementLogs.length)} اندازه‌گیری ثبت شده
                  </span>
                )}
              </div>

              {/* Form & Chart Layout Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Log Form Column */}
                <div className="lg:col-span-4 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/30 h-fit space-y-4">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 border-b border-[#E6DFD3]/30 pb-3">
                    <PlusCircle className="w-4 h-4 text-[#7C8363]" />
                    ثبت رکورد سایز جدید
                  </h4>

                  <form onSubmit={handleAddBodyMeasurement} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ ثبت سایز</label>
                      <PersianDatePicker
                        value={measureDate}
                        onChange={setMeasureDate}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-0.5 justify-center">
                          دور کمر <span className="text-[9px] font-normal text-[#8D7F72]">(cm)</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={waistVal}
                          onChange={e => setWaistVal(e.target.value)}
                          placeholder="مثلا ۹۰"
                          className="w-full p-2 text-center text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-black"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-0.5 justify-center">
                          دور بازو <span className="text-[9px] font-normal text-[#8D7F72]">(cm)</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={armVal}
                          onChange={e => setArmVal(e.target.value)}
                          placeholder="مثلا ۳۵"
                          className="w-full p-2 text-center text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-black"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-0.5 justify-center">
                          دور سینه <span className="text-[9px] font-normal text-[#8D7F72]">(cm)</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={chestVal}
                          onChange={e => setChestVal(e.target.value)}
                          placeholder="مثلا ۱۰۵"
                          className="w-full p-2 text-center text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-black"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">توضیحات یا یادداشت سایزگیری</label>
                      <input
                        type="text"
                        value={measureNote}
                        onChange={e => setMeasureNote(e.target.value)}
                        placeholder="مثلا: شرایط شکم کاملا خالی ناشتا..."
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#7C8363] hover:bg-[#686D51] active:scale-[0.98] text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      ثبت ابعاد فیزیکی
                    </button>

                    {measureSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200/50 text-[10px] font-bold text-center"
                      >
                        ابعاد فیزیکی بدن با موفقیت ثبت شد!
                      </motion.div>
                    )}
                  </form>
                </div>

                {/* Progress Chart Column */}
                <div className="lg:col-span-8 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/30 space-y-4">
                  <div className="border-b border-[#E6DFD3]/20 pb-3 flex justify-between items-center">
                    <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#7C8363]" />
                      نمودار روند تغییرات سایز بدنی شما (بر حسب سانتی‌متر)
                    </h4>
                  </div>

                  {bodyMeasurementLogs.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-[#8D7F72] dark:text-[#9D978B]">
                      <Ruler className="w-10 h-10 text-[#D6CFC3] dark:text-[#3D4133] animate-bounce" />
                      <p className="text-xs font-bold">هنوز هیچ اندازه‌گیری بدنی ثبت نشده است</p>
                      <p className="text-[10px]">برای مشاهده نمودار پیشرفت سایز کمر، بازو و سینه، اولین سایزگیری خود را ثبت کنید.</p>
                    </div>
                  ) : (
                    <div className="h-64 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={bodyMeasurementLogs
                            .slice()
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map(item => ({
                              ...item,
                              dateStr: toJalaliFriendly(item.date),
                              'کمر': item.waist,
                              'بازو': item.arm,
                              'سینه': item.chest
                            }))}
                          margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD3" strokeOpacity={0.3} />
                          <XAxis dataKey="dateStr" stroke="#8D7F72" fontSize={9} tickLine={false} />
                          <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{
                              direction: 'rtl',
                              textAlign: 'right',
                              backgroundColor: '#FDFBF7',
                              border: '1px solid #EBE3C8',
                              borderRadius: '16px',
                              fontSize: '11px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                            labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Line
                            type="monotone"
                            dataKey="کمر"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="بازو"
                            stroke="#10B981"
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="سینه"
                            stroke="#F59E0B"
                            strokeWidth={3}
                            activeDot={{ r: 6 }}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* History list section */}
              {bodyMeasurementLogs.length > 0 && (
                <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-2xl border border-[#EBE3C8] dark:border-[#3D4133]/30 space-y-3">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] border-b border-[#E6DFD3]/20 pb-3">
                    تاریخچه سایزگیری و ابعاد عضلانی
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-[#E6DFD3] dark:border-[#3D4133]/60 text-[#8D7F72] dark:text-[#9D978B] font-black pb-2 text-[10px]">
                          <th className="py-2">تاریخ</th>
                          <th className="text-center">دور کمر</th>
                          <th className="text-center">دور بازو</th>
                          <th className="text-center">دور سینه</th>
                          <th>یادداشت سایزگیری</th>
                          <th className="text-left py-2">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bodyMeasurementLogs
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map(log => (
                            <tr key={log.id} className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/20 text-[#2D3025] dark:text-[#E8ECE0] font-semibold hover:bg-[#F9F6EE]/40 dark:hover:bg-[#20231C]/30 transition-colors">
                              <td className="py-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {toPersianDigits(toJalali(log.date))}
                              </td>
                              <td className="text-center py-2.5 font-mono font-black text-[#2D3025] dark:text-[#E8ECE0]">
                                {toPersianDigits(log.waist)} <span className="text-[10px] font-normal text-[#8D7F72]">cm</span>
                              </td>
                              <td className="text-center py-2.5 font-mono font-black text-[#2D3025] dark:text-[#E8ECE0]">
                                {toPersianDigits(log.arm)} <span className="text-[10px] font-normal text-[#8D7F72]">cm</span>
                              </td>
                              <td className="text-center py-2.5 font-mono font-black text-[#2D3025] dark:text-[#E8ECE0]">
                                {toPersianDigits(log.chest)} <span className="text-[10px] font-normal text-[#8D7F72]">cm</span>
                              </td>
                              <td className="py-2.5 text-[#8D7F72] dark:text-[#9D978B] text-[11px] max-w-xs truncate" title={log.note}>
                                {log.note || '—'}
                              </td>
                              <td className="text-left py-2.5">
                                <button
                                  type="button"
                                  onClick={() => onDeleteBodyMeasurementLog(log.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 rounded-lg transition-all cursor-pointer"
                                  title="حذف این رکورد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Scientific Advice Card */}
            <div className="p-5 bg-orange-50 dark:bg-orange-950/10 rounded-3xl border border-orange-200/50 text-xs text-orange-800 dark:text-orange-400 space-y-2 leading-relaxed">
              <span className="font-extrabold text-orange-700 dark:text-orange-300 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse" />
                تحلیل علمی پیشرفت بدنی و چربی‌سوزی شما
              </span>
              <p className="font-semibold">
                افزایش متناوب شدت تمرینات (Overload) در بدنسازی شرط لازم برای رشد تارهای عضلانی و تحریک بافت‌های چربی مقاوم در پهلو است.
                نمودارهای سوخت‌و‌ساز نشان می‌دهند که تمرینات هوازی ترکیبی شما در محدوده ضربان قلب چربی‌سوز (Fat-Burn Zone) قرار گرفته‌اند. 
                با حفظ ثبات جلسات بدنسازی به میزان حداقل ۳ جلسه در هفته و انجام حداکثر ۱۵۰ دقیقه هوازی ملایم، می‌توانید همزمان با عضله‌سازی، درصد چربی توده بدنی را به سرعت کاهش داده و به فرم بدنی ایده‌آل برسید.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
