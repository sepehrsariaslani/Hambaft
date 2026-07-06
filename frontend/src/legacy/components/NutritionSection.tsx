import React, { useState, useEffect } from 'react';
import { MealLog, DietSetting, Goal, WeightLog } from '../types';
import { 
  Apple, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  Award, 
  Info, 
  Compass, 
  Droplets, 
  Flame, 
  Target,
  Sparkles,
  Zap,
  Activity,
  Edit2,
  CheckCircle,
  TrendingDown,
  ChevronRight,
  ShieldAlert,
  Scale,
  TrendingUp,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, ReferenceLine, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import PersianDatePicker from './PersianDatePicker';
import { toJalali, toJalaliFriendly, toPersianDigits } from '../utils/jalali';

interface NutritionSectionProps {
  mealLogs: MealLog[];
  dietSetting: DietSetting;
  goals: Goal[];
  weightLogs: WeightLog[];
  todayDate: string;
  onAddMealLog: (log: Omit<MealLog, 'id'>) => void;
  onDeleteMealLog: (id: string) => void;
  onUpdateDietSetting: (setting: DietSetting) => void;
  onAddWeightLog: (log: Omit<WeightLog, 'id'>) => void;
  onUpdateGoalMetric: (goalId: string, newValue: number) => void;
}

type SubTab = 'meals' | 'diet' | 'goal' | 'charts';

export default function NutritionSection({
  mealLogs = [],
  dietSetting,
  goals = [],
  weightLogs = [],
  todayDate,
  onAddMealLog,
  onDeleteMealLog,
  onUpdateDietSetting,
  onAddWeightLog,
  onUpdateGoalMetric
}: NutritionSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('meals');
  
  // Date selection for meal diary
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);

  // Form State for Meal
  const [mealTime, setMealTime] = useState<string>('13:30');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [foodText, setFoodText] = useState<string>('');
  const [calories, setCalories] = useState<string>('500');
  const [protein, setProtein] = useState<string>('30');
  const [carbs, setCarbs] = useState<string>('55');
  const [fat, setFat] = useState<string>('12');
  const [waterCount, setWaterCount] = useState<number>(0);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  // Form State for Weight
  const [newWeight, setNewWeight] = useState<string>('');
  const [weightNote, setWeightNote] = useState<string>('');
  const [weightSuccess, setWeightSuccess] = useState<boolean>(false);

  // Diet setting editing state
  const [isEditingDiet, setIsEditingDiet] = useState<boolean>(false);
  const [editDietType, setEditDietType] = useState<DietSetting['type']>(dietSetting?.type || 'none');
  const [editCalorieGoal, setEditCalorieGoal] = useState<string>(String(dietSetting?.dailyCaloriesGoal || 2000));
  const [editFastingWindow, setEditFastingWindow] = useState<string>(dietSetting?.fastingWindow || '16:8');
  const [editFastingStart, setEditFastingStart] = useState<string>(dietSetting?.fastingStartTime || '20:00');
  const [editFastingEnd, setEditFastingEnd] = useState<string>(dietSetting?.fastingEndTime || '12:00');
  const [editDietNotes, setEditDietNotes] = useState<string>(dietSetting?.dietNotes || '');

  // Live fasting timer simulation state
  const [isFastingActive, setIsFastingActive] = useState<boolean>(false);
  const [fastingElapsedSeconds, setFastingElapsedSeconds] = useState<number>(0);

  // Load selected diet settings initially
  useEffect(() => {
    if (dietSetting) {
      setEditDietType(dietSetting.type);
      setEditCalorieGoal(String(dietSetting.dailyCaloriesGoal || 2000));
      setEditFastingWindow(dietSetting.fastingWindow || '16:8');
      setEditFastingStart(dietSetting.fastingStartTime || '20:00');
      setEditFastingEnd(dietSetting.fastingEndTime || '12:00');
      setEditDietNotes(dietSetting.dietNotes || '');
    }
  }, [dietSetting]);

  // Form state for BMI and target calculation
  const [userHeight, setUserHeight] = useState<string>(String(dietSetting?.height || '175'));
  const [userAge, setUserAge] = useState<string>(String(dietSetting?.age || '28'));
  const [userGender, setUserGender] = useState<'male' | 'female'>(dietSetting?.gender || 'male');
  const [userActivity, setUserActivity] = useState<NonNullable<DietSetting['activityLevel']>>(dietSetting?.activityLevel || 'moderate');
  const [weightGoalType, setWeightGoalType] = useState<NonNullable<DietSetting['weightGoalType']>>(dietSetting?.weightGoalType || 'lose');
  const [bmiUpdateSuccess, setBmiUpdateSuccess] = useState<boolean>(false);

  // Sync state with dietSetting when it is loaded
  useEffect(() => {
    if (dietSetting) {
      setUserHeight(String(dietSetting.height || '175'));
      setUserAge(String(dietSetting.age || '28'));
      setUserGender(dietSetting.gender || 'male');
      setUserActivity(dietSetting.activityLevel || 'moderate');
      setWeightGoalType(dietSetting.weightGoalType || 'lose');
    }
  }, [dietSetting]);

  // Find linked weight goal
  const weightGoal = goals.find(g => 
    g.category === 'health' && 
    g.metric && 
    (g.metric.name.includes('وزن') || g.metric.unit.includes('کیلو'))
  );

  // Fasting simulation effects
  useEffect(() => {
    let interval: any = null;
    if (isFastingActive) {
      interval = setInterval(() => {
        setFastingElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setFastingElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isFastingActive]);

  // Helper values for selected day
  const filteredMeals = mealLogs.filter(log => log.date === selectedDate);
  const totalDayCalories = filteredMeals.reduce((acc, log) => acc + log.calories, 0);
  const totalDayProtein = filteredMeals.reduce((acc, log) => acc + (log.protein || 0), 0);
  const totalDayCarbs = filteredMeals.reduce((acc, log) => acc + (log.carbs || 0), 0);
  const totalDayFat = filteredMeals.reduce((acc, log) => acc + (log.fat || 0), 0);
  
  // Track daily water from meal log sums plus quick increments
  const loggedWaterGlasses = filteredMeals.reduce((acc, log) => acc + (log.waterGlasses || 0), 0);
  const totalWaterGlasses = loggedWaterGlasses + waterCount;

  // BMI & BMR / TDEE Calculations
  const latestWeightLogObj = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const weightForBmi = latestWeightLogObj ? latestWeightLogObj.weight : (weightGoal?.metric?.currentValue || 75);

  const parsedHeight = parseFloat(userHeight) || 175;
  const parsedAge = parseInt(userAge) || 28;
  const bmiVal = weightForBmi / ((parsedHeight / 100) * (parsedHeight / 100));
  const bmiFormatted = isNaN(bmiVal) ? '0.0' : bmiVal.toFixed(1);

  let bmiCategoryName = '';
  let bmiColor = '';
  let bmiDesc = '';
  if (bmiVal < 18.5) {
    bmiCategoryName = 'کمبود وزن (Underweight)';
    bmiColor = 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/30';
    bmiDesc = 'وزن شما کمتر از حد نرمال است. افزایش تدریجی کالری‌های مفید توصیه می‌شود.';
  } else if (bmiVal < 25) {
    bmiCategoryName = 'وزن نرمال و سلامت (Normal)';
    bmiColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30';
    bmiDesc = 'وزن شما در محدوده بسیار ایده‌آل و سالم قرار دارد. همین توازن را حفظ کنید!';
  } else if (bmiVal < 30) {
    bmiCategoryName = 'اضافه وزن (Overweight)';
    bmiColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30';
    bmiDesc = 'کمی اضافه وزن دارید. کاهش ملایم کالری دریافتی و افزایش فعالیت ورزشی پیشنهاد می‌شود.';
  } else {
    bmiCategoryName = 'چاقی مفرط (Obese)';
    bmiColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/30';
    bmiDesc = 'شاخص توده بدنی شما بالا است. لطفاً کالری‌ها را محدود کرده و با پزشک یا مربی مشورت نمایید.';
  }

  // Mifflin-St Jeor formula
  let calculatedBmr = 10 * weightForBmi + 6.25 * parsedHeight - 5 * parsedAge;
  if (userGender === 'male') {
    calculatedBmr += 5;
  } else {
    calculatedBmr -= 161;
  }

  const activityFactorMultiplier = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  }[userActivity] || 1.2;

  const calculatedTdee = calculatedBmr * activityFactorMultiplier;

  let suggestedCalValue = Math.round(calculatedTdee);
  if (weightGoalType === 'lose') {
    suggestedCalValue = Math.round(calculatedTdee - 500);
  } else if (weightGoalType === 'gain') {
    suggestedCalValue = Math.round(calculatedTdee + 400);
  }
  suggestedCalValue = Math.max(1200, suggestedCalValue);

  const handleApplyCalorieSuggestion = () => {
    onUpdateDietSetting({
      ...dietSetting,
      dailyCaloriesGoal: suggestedCalValue,
      height: parsedHeight,
      age: parsedAge,
      gender: userGender,
      activityLevel: userActivity,
      weightGoalType: weightGoalType
    });
    setBmiUpdateSuccess(true);
    setTimeout(() => setBmiUpdateSuccess(false), 3000);
  };

  // Diet target values
  const targetCalories = dietSetting?.dailyCaloriesGoal || 2000;
  // Standard macro ratios based on diet type
  let macroTargets = { protein: 120, carbs: 220, fat: 65 }; // General
  if (dietSetting?.type === 'keto') {
    macroTargets = { protein: 110, carbs: 30, fat: 140 };
  } else if (dietSetting?.type === 'low-carb') {
    macroTargets = { protein: 130, carbs: 100, fat: 85 };
  } else if (dietSetting?.type === 'vegetarian') {
    macroTargets = { protein: 90, carbs: 260, fat: 60 };
  } else if (dietSetting?.type === 'fasting') {
    macroTargets = { protein: 120, carbs: 180, fat: 65 };
  }

  // Handle adding meal
  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodText.trim()) return;

    onAddMealLog({
      date: selectedDate,
      time: mealTime,
      type: mealType,
      foods: foodText.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || undefined,
      carbs: parseInt(carbs) || undefined,
      fat: parseInt(fat) || undefined,
      waterGlasses: totalWaterGlasses > loggedWaterGlasses ? (totalWaterGlasses - loggedWaterGlasses) : undefined
    });

    setFoodText('');
    setWaterCount(0);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  // Quick water addition
  const handleQuickWaterAdd = () => {
    setWaterCount(prev => prev + 1);
  };

  // Handle Diet Setting Update
  const handleSaveDiet = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDietSetting({
      ...dietSetting,
      type: editDietType,
      startDate: todayDate,
      dailyCaloriesGoal: parseInt(editCalorieGoal) || 2000,
      fastingWindow: editFastingWindow,
      fastingStartTime: editFastingStart,
      fastingEndTime: editFastingEnd,
      dietNotes: editDietNotes
    });
    setIsEditingDiet(false);
  };

  // Handle Weight Check-in
  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal)) return;

    onAddWeightLog({
      date: todayDate,
      weight: weightVal,
      note: weightNote.trim() || undefined
    });

    // Update weight goal metric if one exists
    if (weightGoal) {
      onUpdateGoalMetric(weightGoal.id, weightVal);
    }

    setNewWeight('');
    setWeightNote('');
    setWeightSuccess(true);
    setTimeout(() => setWeightSuccess(false), 3000);
  };

  // Calculate Fasting simulation string
  const formatFastingTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Convert weight logs to recharts friendly data
  const chartData = [...weightLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(log => ({
      date: toJalali(log.date).slice(5), 
      وزن: log.weight
    }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-l from-[#7C8363] to-[#5A5A40] text-white p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-white/10 rounded-xl">
              <Apple className="w-6 h-6 stroke-[2]" />
            </span>
            <h1 className="text-xl md:text-2xl font-black font-serif-elegant">مدیریت تغذیه، کالری‌شماری و رژیم</h1>
          </div>
          <p className="text-xs md:text-sm text-white/80 font-medium">
            توازن انرژی بدنی، پایش رژیم‌های اختصاصی و روزه‌داری متناوب همگام با وزن هدف شما.
          </p>
        </div>
        
        {/* Quick Macro Overview Banner widget */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl flex gap-6 text-center text-xs">
          <div>
            <div className="text-white/60 font-semibold mb-1">کالری امروز</div>
            <div className="font-mono font-black text-lg text-amber-200">
              {toPersianDigits(totalDayCalories)} <span className="text-[10px] font-normal text-white">kcal</span>
            </div>
          </div>
          <div className="w-px bg-white/20"></div>
          <div>
            <div className="text-white/60 font-semibold mb-1">نوع رژیم</div>
            <div className="font-black text-emerald-200">
              {dietSetting?.type === 'fasting' ? 'روزه‌داری متناوب' :
               dietSetting?.type === 'keto' ? 'کتوژنیک 🥑' :
               dietSetting?.type === 'low-carb' ? 'کربوهیدرات کم 🥩' :
               dietSetting?.type === 'vegetarian' ? 'گیاه‌خواری 🥦' : 'عمومی / متعادل ⚖️'}
            </div>
          </div>
          {weightGoal && (
            <>
              <div className="w-px bg-white/20"></div>
              <div>
                <div className="text-white/60 font-semibold mb-1">هدف وزنی</div>
                <div className="font-mono font-black text-lg text-[#F9F6EE]">
                  {toPersianDigits(weightGoal.metric?.targetValue || 0)} <span className="text-[10px] font-normal text-white">kg</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-[#F3EFE0]/50 dark:bg-[#20231C]/60 p-1.5 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40">
        <button
          onClick={() => setActiveSubTab('meals')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'meals' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <Apple className="w-4 h-4" />
          <span>یادداشت‌های غذایی روزانه</span>
        </button>
        <button
          onClick={() => setActiveSubTab('diet')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'diet' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>رژیم‌های غذایی و فستینگ</span>
        </button>
        <button
          onClick={() => setActiveSubTab('goal')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'goal' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>هدف وزنی و BMI</span>
        </button>
        <button
          onClick={() => setActiveSubTab('charts')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'charts' 
              ? 'bg-white dark:bg-[#2E3326] text-[#2D3025] dark:text-[#E8ECE0] shadow-sm' 
              : 'text-[#8D7F72] dark:text-[#9D978B] hover:text-[#5A5A40]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>نمودارها و روندهای تغذیه</span>
        </button>
      </div>

      {/* ─── TAB 1: MEALS & FOOD DIARY ─── */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'meals' && (
          <motion.div
            key="meals-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Top Row: Date Selector & Macro Circle Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Date & Water quick logger */}
              <div className="lg:col-span-4 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-5 transition-colors flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#8D7F72] dark:text-[#9D978B] mb-2.5">انتخاب تاریخ یادداشت</h3>
                  <PersianDatePicker value={selectedDate} onChange={setSelectedDate} />
                  
                  <div className="mt-4 p-3 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/50 text-center">
                    <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mb-1">تاریخ فعال در سیستم</span>
                    <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{toJalaliFriendly(selectedDate)}</span>
                  </div>
                </div>

                {/* Quick Water Logger Widget */}
                <div className="pt-4 border-t border-[#E6DFD3]/40 dark:border-[#3D4133]/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1">
                      <Droplets className="w-4 h-4 text-sky-500 fill-sky-200" />
                      ردیاب آب مصرفی روزانه
                    </span>
                    <span className="text-xs font-mono font-black text-sky-600 dark:text-sky-400">
                      {toPersianDigits(totalWaterGlasses)} / {toPersianDigits(8)} لیوان
                    </span>
                  </div>

                  {/* Water visual indicators */}
                  <div className="flex justify-between gap-1">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 h-7 rounded-lg transition-all duration-300 flex items-center justify-center ${
                          i < totalWaterGlasses 
                            ? 'bg-sky-500 text-white shadow-sm scale-105' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        <span className="text-[9px]">💧</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickWaterAdd}
                    className="w-full py-2 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-950/40 text-[11px] font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن یک لیوان آب (+۲۵۰ میلی‌لیتر)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Calories progress circular/bento block */}
              <div className="lg:col-span-8 bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Calories Progress Ring Mocked with SVG */}
                <div className="md:col-span-5 flex flex-col items-center justify-center space-y-2">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* Circle Background */}
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-[#E6DFD3] dark:stroke-gray-800 fill-transparent"
                        strokeWidth="10"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-[#7C8363] fill-transparent transition-all duration-500"
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={2 * Math.PI * 60 * (1 - Math.min(1, totalDayCalories / targetCalories))}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Inner content */}
                    <div className="text-center space-y-1 z-10">
                      <Flame className="w-5 h-5 text-amber-600 mx-auto animate-pulse" />
                      <div className="text-2xl font-black font-mono text-[#2D3025] dark:text-[#E8ECE0]">
                        {toPersianDigits(totalDayCalories)}
                      </div>
                      <div className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold">خورده شده (کالری)</div>
                    </div>
                  </div>

                  <div className="text-[10px] text-center font-bold text-[#8D7F72] dark:text-[#9D978B]">
                    سقف هدف رژیم شما: <span className="font-mono text-[#2D3025] dark:text-[#E8ECE0]">{toPersianDigits(targetCalories)} kcal</span>
                  </div>
                </div>

                {/* Macro summary sliders */}
                <div className="md:col-span-7 space-y-4 flex flex-col justify-center">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-2">برآیند ماکرونوترینت‌ها (درشت‌مغذی‌ها)</h4>
                  
                  {/* Protein */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#8D7F72] dark:text-[#9D978B]">🥩 پروتئین (سازنده عضلات)</span>
                      <span className="font-mono text-[#7C8363] dark:text-emerald-400">
                        {toPersianDigits(totalDayProtein)} / {toPersianDigits(macroTargets.protein)} گرم
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (totalDayProtein / macroTargets.protein) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#8D7F72] dark:text-[#9D978B]">🌾 کربوهیدرات (منبع انرژی اصلی)</span>
                      <span className="font-mono text-[#7C8363] dark:text-amber-500">
                        {toPersianDigits(totalDayCarbs)} / {toPersianDigits(macroTargets.carbs)} گرم
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (totalDayCarbs / macroTargets.carbs) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#8D7F72] dark:text-[#9D978B]">🥑 چربی‌های مفید (تنظیم هورمونی)</span>
                      <span className="font-mono text-[#7C8363] dark:text-rose-400">
                        {toPersianDigits(totalDayFat)} / {toPersianDigits(macroTargets.fat)} گرم
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (totalDayFat / macroTargets.fat) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Middle Row: Form to Log Meal & List of meals logged */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form Box (5 cols) */}
              <div className="lg:col-span-5 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors">
                <div className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3 mb-4">
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#7C8363] stroke-[3]" />
                    ثبت وعده یا میان‌وعده جدید
                  </h3>
                </div>

                <form onSubmit={handleAddMeal} className="space-y-4">
                  
                  {/* Meal Type Selection Grid */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">نوع وعده</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'breakfast', label: 'صبحانه' },
                        { id: 'lunch', label: 'ناهار' },
                        { id: 'dinner', label: 'شام' },
                        { id: 'snack', label: 'میان‌وعده' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setMealType(item.id as any)}
                          className={`py-2 text-[10px] font-black rounded-xl border transition-all ${
                            mealType === item.id 
                              ? 'bg-[#7C8363] text-white border-[#7C8363] shadow-sm' 
                              : 'bg-[#F9F6EE] dark:bg-[#242721] text-[#8D7F72] dark:text-[#9D978B] border-[#E6DFD3]/60 dark:border-[#3D4133]/60 hover:bg-[#F3EFE0]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meal Time & Calorie fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#7C8363]" />
                        ساعت مصرف
                      </label>
                      <input 
                        type="time" 
                        value={mealTime} 
                        onChange={e => setMealTime(e.target.value)}
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0] font-mono text-center" 
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">کالری تقریبی (kcal)</label>
                      <input 
                        type="number" 
                        value={calories} 
                        onChange={e => setCalories(e.target.value)}
                        placeholder="مثلا ۴۵۰"
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0] font-mono text-center" 
                        required
                      />
                    </div>
                  </div>

                  {/* Food details description text */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">جزئیات غذاهای خورده شده *</label>
                    <textarea 
                      value={foodText} 
                      onChange={e => setFoodText(e.target.value)}
                      placeholder="مثلا: ۱۰۰ گرم سینه مرغ گریل، ۵ قاشق برنج، نصف فنجان ماست کم‌چرب..."
                      rows={3}
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0] leading-relaxed resize-none"
                      required
                    ></textarea>
                  </div>

                  {/* Micro macronutrient optional fields */}
                  <div className="bg-[#F9F6EE] dark:bg-[#242721] p-3.5 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60 space-y-3">
                    <div className="text-[10px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">تفکیک درشت مغذی‌ها (اختیاری):</div>
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block text-center">پروتئین (گرم)</span>
                        <input 
                          type="number" 
                          value={protein} 
                          onChange={e => setProtein(e.target.value)}
                          placeholder="g"
                          className="w-full p-1.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/40 bg-white dark:bg-black/20 rounded-lg focus:outline-none text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block text-center">کربوهیدرات (گرم)</span>
                        <input 
                          type="number" 
                          value={carbs} 
                          onChange={e => setCarbs(e.target.value)}
                          placeholder="g"
                          className="w-full p-1.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/40 bg-white dark:bg-black/20 rounded-lg focus:outline-none text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block text-center">چربی (گرم)</span>
                        <input 
                          type="number" 
                          value={fat} 
                          onChange={e => setFat(e.target.value)}
                          placeholder="g"
                          className="w-full p-1.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/40 bg-white dark:bg-black/20 rounded-lg focus:outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Water quick logger on meal form */}
                  <div className="flex items-center justify-between p-2.5 bg-sky-50/40 dark:bg-sky-950/10 rounded-2xl border border-sky-100 dark:border-sky-900/30">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-sky-700 dark:text-sky-300">
                      <Droplets className="w-4 h-4 fill-sky-200" />
                      آب مصرفی این وعده:
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setWaterCount(prev => Math.max(0, prev - 1))}
                        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-[#1B1D16] border border-[#D6CFC3] dark:border-[#3D4133] rounded-lg text-xs cursor-pointer text-[#8D7F72]"
                      >-</button>
                      <span className="text-xs font-mono font-black text-sky-800 dark:text-sky-200">{toPersianDigits(waterCount)}</span>
                      <button 
                        type="button" 
                        onClick={() => setWaterCount(prev => prev + 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white dark:bg-[#1B1D16] border border-[#D6CFC3] dark:border-[#3D4133] rounded-lg text-xs cursor-pointer text-[#8D7F72]"
                      >+</button>
                    </div>
                  </div>

                  {/* Form Submit & Feedback */}
                  <div className="space-y-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3.5]" />
                      <span>ثبت در دفترچه غذایی روز</span>
                    </button>
                    {successMsg && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-center text-[10px] font-black rounded-lg border border-emerald-200/50">
                        وعده غذایی با موفقیت در این تاریخ ثبت شد.
                      </div>
                    )}
                  </div>

                </form>
              </div>

              {/* Timeline list of logged meals (7 cols) */}
              <div className="lg:col-span-7 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3 mb-4 flex justify-between items-center">
                    <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <Apple className="w-4 h-4 text-[#7C8363]" />
                      برنامه مصرفی امروز ({toPersianDigits(filteredMeals.length)} وعده)
                    </h3>
                    <span className="text-[10px] font-bold text-[#8D7F72]">تاریخ فعال: {toJalali(selectedDate)}</span>
                  </div>

                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {filteredMeals.length > 0 ? (
                      filteredMeals.sort((a,b) => a.time.localeCompare(b.time)).map((log) => {
                        // Badge Styles depending on meal type
                        const getMealBadge = (type: string) => {
                          switch (type) {
                            case 'breakfast': return { label: 'صبحانه 🍳', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' };
                            case 'lunch': return { label: 'ناهار 🍛', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' };
                            case 'dinner': return { label: 'شام 🍲', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' };
                            default: return { label: 'میان‌وعده 🍎', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' };
                          }
                        };
                        const badge = getMealBadge(log.type);

                        return (
                          <div 
                            key={log.id} 
                            className="p-4 bg-white dark:bg-[#242721] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 hover:shadow-sm transition-all relative flex flex-col md:flex-row justify-between items-start md:items-center gap-3 group"
                          >
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${badge.color}`}>
                                  {badge.label}
                                </span>
                                <span className="text-[10px] text-[#8D7F72] font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {toPersianDigits(log.time)}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#2D3025] dark:text-[#E8ECE0] leading-relaxed">
                                {log.foods}
                              </p>
                              {/* Macro breakdown */}
                              {(log.protein || log.carbs || log.fat) && (
                                <div className="flex gap-4 text-[9px] font-mono text-[#8D7F72]">
                                  {log.protein && <span>پروتئین: {toPersianDigits(log.protein)}g</span>}
                                  {log.carbs && <span>کربوهیدرات: {toPersianDigits(log.carbs)}g</span>}
                                  {log.fat && <span>چربی: {toPersianDigits(log.fat)}g</span>}
                                </div>
                              )}
                            </div>

                            <div className="flex md:flex-col items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-2.5 md:pt-0 border-[#E6DFD3]/40 gap-2">
                              <div className="text-left font-mono">
                                <span className="text-sm font-black text-amber-600 dark:text-amber-400">{toPersianDigits(log.calories)}</span>
                                <span className="text-[9px] text-[#8D7F72] mr-0.5">kcal</span>
                              </div>
                              <button
                                onClick={() => onDeleteMealLog(log.id)}
                                className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer opacity-80 md:opacity-0 group-hover:opacity-100"
                                title="حذف وعده"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-gray-400 space-y-2">
                        <span className="text-4xl block">🥗</span>
                        <p className="text-xs font-semibold">هیچ وعده یا میان‌وعده‌ای برای امروز ثبت نشده است.</p>
                        <p className="text-[10px]">برای پایش کالری و اهداف خود اولین وعده را اضافه کنید.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Tip Widget */}
                <div className="mt-6 bg-amber-50/60 dark:bg-amber-950/10 p-3.5 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex gap-2 text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="text-[10px] leading-relaxed">
                    <span className="font-black block text-xs mb-0.5">نکته تغذیه طلایی:</span>
                    پروتئین بالا به شما کمک می‌کند در طی رژیم کاهش وزن توده عضلانی خود را حفظ کنید و سوخت‌وساز بالاتری داشته باشید. نوشیدن آب کافی نیز سرعت هضم مواد مغذی را بهبود می‌بخشد.
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ─── TAB 2: DIETS & FASTING TRACKER ─── */}
        {activeSubTab === 'diet' && (
          <motion.div
            key="diet-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Diet type configuration card */}
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors">
              <div className="flex justify-between items-center border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-4 mb-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-[#2D3025] dark:text-[#E8ECE0]">تنظیم رژیم غذایی فعال</h3>
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">
                    انتخاب نوع رژیم، اهداف روزانه دریافت انرژی و بازه فستینگ اختصاصی شما.
                  </p>
                </div>
                {!isEditingDiet && (
                  <button
                    onClick={() => setIsEditingDiet(true)}
                    className="px-3.5 py-1.5 bg-[#7C8363] text-white text-[11px] font-black rounded-xl hover:bg-[#5A5A40] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    ویرایش تنظیمات
                  </button>
                )}
              </div>

              {isEditingDiet ? (
                <form onSubmit={handleSaveDiet} className="space-y-5 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Diet Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">نوع رژیم غذایی</label>
                      <select 
                        value={editDietType} 
                        onChange={e => setEditDietType(e.target.value as any)}
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0] font-semibold"
                      >
                        <option value="none">بدون رژیم خاص (متعادل عمومی)</option>
                        <option value="fasting">روزه‌داری متناوب (Intermittent Fasting)</option>
                        <option value="keto">کتوژنیک (پرچربی و کربوهیدرات بسیار کم)</option>
                        <option value="low-carb">کربوهیدرات کم (Low-carb)</option>
                        <option value="vegetarian">گیاه‌خواری (Vegetarian)</option>
                      </select>
                    </div>

                    {/* Daily calorie goal */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">هدف دریافت کالری روزانه (kcal)</label>
                      <input 
                        type="number" 
                        value={editCalorieGoal} 
                        onChange={e => setEditCalorieGoal(e.target.value)}
                        className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none text-center font-mono text-[#2D3025] dark:text-[#E8ECE0]"
                      />
                    </div>

                    {/* Fasting Window */}
                    {editDietType === 'fasting' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">الگوی روزه‌داری</label>
                        <select 
                          value={editFastingWindow} 
                          onChange={e => setEditFastingWindow(e.target.value)}
                          className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none"
                        >
                          <option value="16:8">۱۶ ساعت روزه، ۸ ساعت پنجره غذا (۱۶:۸)</option>
                          <option value="18:6">۱۸ ساعت روزه، ۶ ساعت پنجره غذا (۱۸:۶)</option>
                          <option value="20:4">۲۰ ساعت روزه، ۴ ساعت پنجره غذا (۲۰:۴)</option>
                          <option value="12:12">۱۲ ساعت روزه، ۱۲ ساعت پنجره غذا (۱۲:۱۲)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Fasting Timing fields */}
                  {editDietType === 'fasting' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/60">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          شروع دوره روزه (ساعت قطع غذا)
                        </label>
                        <input 
                          type="time" 
                          value={editFastingStart} 
                          onChange={e => setEditFastingStart(e.target.value)}
                          className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/40 bg-white dark:bg-[#1B1D16] rounded-xl focus:outline-none font-mono text-center text-[#2D3025] dark:text-[#E8ECE0]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          پایان دوره روزه (ساعت شروع مجدد غذا)
                        </label>
                        <input 
                          type="time" 
                          value={editFastingEnd} 
                          onChange={e => setEditFastingEnd(e.target.value)}
                          className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/40 bg-white dark:bg-[#1B1D16] rounded-xl focus:outline-none font-mono text-center text-[#2D3025] dark:text-[#E8ECE0]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Diet Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">توضیحات و اهداف رژیم شخصی</label>
                    <input 
                      type="text" 
                      value={editDietNotes} 
                      onChange={e => setEditDietNotes(e.target.value)}
                      placeholder="مثلا: کاهش غلظت چربی کبد، بالا بردن هورمون رشد طبیعی با فستینگ..."
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none text-[#2D3025] dark:text-[#E8ECE0]"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsEditingDiet(false)}
                      className="px-4 py-2 border border-[#D6CFC3] text-[#8D7F72] text-[11px] font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2 bg-[#7C8363] text-white text-[11px] font-black rounded-xl hover:bg-[#5A5A40] cursor-pointer"
                    >
                      ذخیره رژیم
                    </button>
                  </div>
                </form>
              ) : (
                // Display Current Active Diet State
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 text-center space-y-1.5 transition-colors">
                    <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">رژیم انتخابی</span>
                    <span className="text-sm font-black text-[#7C8363] dark:text-[#E8ECE0]">
                      {dietSetting?.type === 'fasting' ? 'روزه‌داری متناوب ⏳' :
                       dietSetting?.type === 'keto' ? 'کتوژنیک 🥑' :
                       dietSetting?.type === 'low-carb' ? 'کربوهیدرات کم 🥩' :
                       dietSetting?.type === 'vegetarian' ? 'گیاه‌خواری 🥦' : 'متعادل عمومی ⚖️'}
                    </span>
                  </div>
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 text-center space-y-1.5 transition-colors">
                    <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">هدف کالری روزانه</span>
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      {toPersianDigits(targetCalories)} <span className="text-[10px] font-normal text-[#8D7F72]">kcal</span>
                    </span>
                  </div>
                  {dietSetting?.type === 'fasting' ? (
                    <>
                      <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 text-center space-y-1.5 transition-colors">
                        <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">الگوی پنجره روزه</span>
                        <span className="text-sm font-black font-mono text-[#2D3025] dark:text-[#E8ECE0]">{toPersianDigits(dietSetting.fastingWindow || '16:8')}</span>
                      </div>
                      <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 text-center space-y-1.5 transition-colors">
                        <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">بازه ساعتی فست</span>
                        <span className="text-xs font-black font-mono text-rose-500">
                          {toPersianDigits(dietSetting.fastingStartTime || '20:00')} الی {toPersianDigits(dietSetting.fastingEndTime || '12:00')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 md:col-span-2 space-y-1 transition-colors">
                      <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">توضیحات و اهداف رژیم:</span>
                      <p className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0]">{dietSetting?.dietNotes || 'بدون توضیحات یادداشت شده.'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Intermittent Fasting Live Interactive Clock (Renders ONLY if fasting is selected) */}
            {dietSetting?.type === 'fasting' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Fasting Live Timer Clock */}
                <div className="md:col-span-5 bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 text-center space-y-5 transition-colors flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-rose-500 animate-spin" />
                      روزه‌شمار تعاملی و هوشمند
                    </h4>
                    <p className="text-[9px] text-[#8D7F72]">با فشردن دکمه زیر، شمارشگر زمان فستینگ شما شروع به کار می‌کند.</p>
                  </div>

                  <div className="my-6">
                    {/* Visual glowing time clock */}
                    <div className="w-44 h-44 rounded-full border-4 border-rose-500/20 dark:border-rose-500/10 flex flex-col items-center justify-center mx-auto bg-rose-500/5 shadow-inner p-4">
                      <span className="text-[10px] text-[#8D7F72] font-extrabold mb-1">{isFastingActive ? 'در حال روزه‌داری' : 'شمارش متوقف شده'}</span>
                      <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                        {toPersianDigits(formatFastingTime(fastingElapsedSeconds))}
                      </span>
                      <span className="text-[8px] text-[#8D7F72] font-semibold mt-1">ساعت : دقیقه : ثانیه</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFastingActive(!isFastingActive)}
                    className={`w-full py-3 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                      isFastingActive 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isFastingActive ? 'پایان و توقف دوره فستینگ' : 'شروع و فعال‌سازی فستینگ'}</span>
                  </button>
                </div>

                {/* Fasting educational benefits info panel */}
                <div className="md:col-span-7 bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors space-y-4">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] border-b border-[#E6DFD3]/40 pb-2">ساعات بحرانی و بیولوژی فستینگ شما</h4>
                  
                  <div className="space-y-3.5">
                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-bold">۱</span>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-extrabold text-[#2D3025] dark:text-[#E8ECE0] block">مرحله اول (ساعات ۲ الی ۸): افت قند و ترشح انسولین</span>
                        <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">انسولین به پایین‌ترین حد رسیده و روند گوارشی وعده آخر تمام می‌شود. بدن شروع به مصرف گلوکزهای باقیمانده می‌کند.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">۲</span>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-extrabold text-[#2D3025] dark:text-[#E8ECE0] block">مرحله دوم (ساعات ۸ الی ۱۲): شروع چربی‌سوزی خفیف</span>
                        <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">گلوکزهای کبد تخلیه شده و کتون‌ها به آرامی آزاد می‌شوند. بدن شروع به سوزاندن بافت‌های انباشته چربی به عنوان سوخت اول می‌کند.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">۳</span>
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-extrabold text-[#2D3025] dark:text-[#E8ECE0] block">مرحله طلایی (ساعات ۱۲ الی ۱۶): اوج اتوفاژی و بازسازی سلولی</span>
                        <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold leading-relaxed">فرآیند فوق‌العاده پاکسازی سلول‌های فرسوده (اتوفاژی) کلید می‌خورد. ترشح هورمون رشد طبیعی بدن تا چند برابر افزایش یافته و چربی‌سوزی به بیشترین سرعت خود می‌رسد.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-start gap-2 text-[10px] text-rose-700 dark:text-rose-300">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-xs mb-0.5">نکات سلامتی مهم:</span>
                      در طول دوره فستینگ نوشیدن آب، چای تلخ و قهوه سیاه بدون قند بلامانع است و به هیدراته نگه داشتن بدن کمک شایانی می‌کند. در صورت سرگیجه شدید سریعاً رژیم را قطع کنید.
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Other diet educational sheets if fasting is not active */}
            {dietSetting?.type !== 'fasting' && (
              <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1">
                  <Info className="w-4 h-4 text-[#7C8363]" />
                  مزایا و الگوی رژیم انتخابی شما
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 space-y-1 leading-relaxed">
                    <span className="font-extrabold text-[#7C8363] block">توصیه‌های بیوشیمی رژیم</span>
                    <p className="text-[#8D7F72] dark:text-[#9D978B] font-semibold text-[11px]">
                      {dietSetting?.type === 'keto' ? 'در رژیم کتوژنیک ۷۵٪ کالری از چربی‌ها، ۲۰٪ از پروتئین و تنها ۵٪ از کربوهیدرات‌ها بدست می‌آید. باید از غلات و نشاسته کاملاً پرهیز کنید.' :
                       dietSetting?.type === 'low-carb' ? 'کاهش کربوهیدرات‌های تصفیه شده (نان لواش، برنج سفید و شیرینیجات) و جایگزینی آن با فیبر، سبزیجات و پروتئین خالص برای ثبات ترشح انسولین.' :
                       dietSetting?.type === 'vegetarian' ? 'تامین آمینواسیدهای ضروری از طریق حبوبات، سویا، کینوا، تخم‌مرغ و غلات برای جلوگیری از تحلیل رفتن بافت‌های پروتئینی عضلات.' :
                       'استفاده از تمام گروه‌های غذایی شامل سبزیجات تازه، غلات کامل، چربی‌های تک‌غیراشباع و پروتئین‌های زودهضم برای تعادل تغذیه‌ای کامل.'}
                    </p>
                  </div>
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 space-y-1 leading-relaxed">
                    <span className="font-extrabold text-[#7C8363] block">تاثیر بر شاخص‌های سلامتی</span>
                    <p className="text-[#8D7F72] dark:text-[#9D978B] font-semibold text-[11px]">
                      {dietSetting?.type === 'keto' ? 'کاهش سریع وزن آب بدن در روزهای اول، افزایش سطح تمرکز فکری پس از فاز کتوزیس سلولی و بهبود پروفایل گلیسیرید کبد.' :
                       dietSetting?.type === 'low-carb' ? 'کاهش نوسانات خلقی ناشی از افت قند خون، چربی‌سوزی عالی در پهلو و شکم و ثبات فشار عروقی.' :
                       dietSetting?.type === 'vegetarian' ? 'پاکسازی موثر گوارش، دفع سموم باکتریایی، بهبود سلامت قلبی و طراوت شادابی پوست.' :
                       'حفظ پایداری درازمدت انرژی بدنی، تنظیم متابولیسم پایه بدون تنش به ارگان‌های حیاتی بدن.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── TAB 3: WEIGHT GOAL INTEGRATION ─── */}
        {activeSubTab === 'goal' && (
          <motion.div
            key="goal-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Weight Goal synchronization status card */}
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors">
              <div className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3 mb-4">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-rose-500" />
                  وضعیت اهداف وزنی و کاهش چربی
                </h3>
              </div>

              {weightGoal ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Start Value */}
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 flex justify-between items-center transition-colors">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">وزن شروع هدف</span>
                      <span className="text-lg font-black font-mono text-[#2D3025] dark:text-[#E8ECE0]">
                        {toPersianDigits(weightGoal.metric?.startValue || 0)} <span className="text-xs font-normal">kg</span>
                      </span>
                    </div>
                    <span className="text-2xl">⚖️</span>
                  </div>

                  {/* Current Value */}
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 flex justify-between items-center transition-colors">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">وزن فعلی کنونی</span>
                      <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {toPersianDigits(weightGoal.metric?.currentValue || 0)} <span className="text-xs font-normal text-[#8D7F72]">kg</span>
                      </span>
                    </div>
                    <span className="text-2xl">🏃</span>
                  </div>

                  {/* Target Value */}
                  <div className="p-4 bg-[#F9F6EE] dark:bg-[#242721] rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/40 flex justify-between items-center transition-colors">
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">وزن هدف نهایی</span>
                      <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                        {toPersianDigits(weightGoal.metric?.targetValue || 0)} <span className="text-xs font-normal text-[#8D7F72]">kg</span>
                      </span>
                    </div>
                    <span className="text-2xl animate-bounce">🎯</span>
                  </div>

                  {/* Weight progress explanation line */}
                  <div className="md:col-span-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/40 text-center text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>
                      شما از شروع مسیر کاهش وزن تا کنون موفق شده‌اید{' '}
                      <span className="font-mono text-sm font-black underline">
                        {toPersianDigits(((weightGoal.metric?.startValue || 0) - (weightGoal.metric?.currentValue || 0)).toFixed(1))}
                      </span>{' '}
                      کیلوگرم کاهش وزن خالص داشته باشید! تنها{' '}
                      <span className="font-mono text-sm font-black underline">
                        {toPersianDigits(((weightGoal.metric?.currentValue || 0) - (weightGoal.metric?.targetValue || 0)).toFixed(1))}
                      </span>{' '}
                      کیلوگرم دیگر تا رسیدن به هدف نهایی خود فاصله دارید.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-[#F9F6EE] dark:bg-[#242721] border border-dashed border-[#E6DFD3] rounded-2xl text-center space-y-2">
                  <span className="text-3xl block">📋</span>
                  <p className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">هدف وزنی فعال در بخش اهداف یافت نشد.</p>
                  <p className="text-[10px] text-[#8D7F72] leading-relaxed">
                    یک هدف با دسته‌بندی «سلامت و ورزش» که دارای معیار وزن (کیلوگرم) باشد بسازید تا داده‌های تغذیه و روند کاهش چربی به صورت کاملاً اتوماتیک با آن همگام شود.
                  </p>
                </div>
              )}
            </div>

            {/* BMI Calculator Card */}
            <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors">
              <div className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3 mb-4 flex justify-between items-center">
                <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  محاسبه‌گر شاخص توده بدنی (BMI) و کالری پیشنهادی هدف
                </h3>
                <span className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] bg-[#F3EFE0]/50 dark:bg-[#20231C]/60 px-2 py-1 rounded-lg">
                  امکان همگام‌سازی مستقیم با اهداف روزانه
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Inputs - 7 cols on desktop */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Height input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">قد (سانتی‌متر)</label>
                      <input 
                        type="number"
                        value={userHeight}
                        onChange={e => setUserHeight(e.target.value)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono text-[#2D3025] dark:text-[#E8ECE0]"
                        placeholder="مثلا ۱۷۸"
                      />
                    </div>

                    {/* Age input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">سن (سال)</label>
                      <input 
                        type="number"
                        value={userAge}
                        onChange={e => setUserAge(e.target.value)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center font-mono text-[#2D3025] dark:text-[#E8ECE0]"
                        placeholder="مثلا ۲۸"
                      />
                    </div>

                    {/* Gender select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">جنسیت زیستی</label>
                      <select
                        value={userGender}
                        onChange={e => setUserGender(e.target.value as 'male' | 'female')}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-center text-[#2D3025] dark:text-[#E8ECE0] font-black"
                      >
                        <option value="male">مرد ♂</option>
                        <option value="female">زن ♀</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Activity Level select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">میزان فعالیت روزانه و هفتگی</label>
                      <select
                        value={userActivity}
                        onChange={e => setUserActivity(e.target.value as any)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-black"
                      >
                        <option value="sedentary">بدون فعالیت / پشت‌میزنشین (ضریب ۱.۲)</option>
                        <option value="light">فعالیت سبک (۱ تا ۳ روز در هفته - ضریب ۱.۳۷۵)</option>
                        <option value="moderate">فعالیت متوسط (۳ تا ۵ روز در هفته - ضریب ۱.۵۵)</option>
                        <option value="active">فعالیت سنگین (۶ تا ۷ روز در هفته - ضریب ۱.۷۲۵)</option>
                      </select>
                    </div>

                    {/* Goal Type select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">نوع هدف‌گذاری وزنی شما</label>
                      <select
                        value={weightGoalType}
                        onChange={e => setWeightGoalType(e.target.value as any)}
                        className="w-full p-2 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl text-[#2D3025] dark:text-[#E8ECE0] font-black"
                      >
                        <option value="lose">کاهش وزن ملایم و ایمن (-۵۰۰ کالری)</option>
                        <option value="maintain">تثبیت و حفظ وزن فعلی بدنی (TDEE)</option>
                        <option value="gain">افزایش حجم عضلانی مفید (+۴۰۰ کالری)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F9F6EE] dark:bg-[#242721] border border-[#E6DFD3] dark:border-[#3D4133]/40 text-xs text-[#8D7F72] dark:text-[#9D978B] leading-relaxed">
                    <span className="font-extrabold text-[#7C8363] block mb-1">💡 سیستم راهنمای بیولوژیکی</span>
                    برای محاسبات دقیق‌تر، سیستم آخرین وزن ثبت‌شده شما در جدول فوق را که معادل{' '}
                    <span className="font-mono font-black text-[#2D3025] dark:text-[#E8ECE0] text-sm bg-white dark:bg-[#2E3326] px-1.5 py-0.5 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/60">{toPersianDigits(weightForBmi)} kg</span>{' '}
                    می‌باشد مبنای فرمول سوخت‌وساز خود قرار داده است.
                  </div>
                </div>

                {/* Results Card - 5 cols on desktop */}
                <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-[#FDFBF7] to-[#F3EFE0]/40 dark:from-[#20231C]/60 dark:to-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/60">
                  <div className="space-y-4">
                    {/* BMI Result line */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#8D7F72] dark:text-[#9D978B]">شاخص توده بدنی شما (BMI):</span>
                      <span className="text-xl font-mono font-black text-[#2D3025] dark:text-[#E8ECE0] bg-white dark:bg-[#242721] px-2.5 py-1 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/60">
                        {toPersianDigits(bmiFormatted)}
                      </span>
                    </div>

                    {/* BMI status category bar */}
                    <div className={`p-3 rounded-xl border text-xs font-bold ${bmiColor} leading-relaxed`}>
                      <div className="font-black mb-1">دسته‌بندی بدنی: {bmiCategoryName}</div>
                      <p className="text-[10px] opacity-90">{bmiDesc}</p>
                    </div>

                    {/* Stats TDEE */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <div className="p-2 bg-white dark:bg-[#242721] rounded-xl border border-[#EBE3C8] dark:border-[#3D4133]/30 text-center">
                        <span className="text-[#8D7F72] block">متابولیسم پایه (BMR)</span>
                        <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono">{toPersianDigits(Math.round(calculatedBmr))} kcal</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-[#242721] rounded-xl border border-[#EBE3C8] dark:border-[#3D4133]/30 text-center">
                        <span className="text-[#8D7F72] block">کل سوخت مصرفی (TDEE)</span>
                        <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-mono">{toPersianDigits(Math.round(calculatedTdee))} kcal</span>
                      </div>
                    </div>

                    {/* Daily Calorie Goal Suggestion */}
                    <div className="p-4 bg-emerald-500 text-white rounded-2xl text-center space-y-1 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/10 rounded-full blur-xl"></div>
                      <span className="text-[10px] font-bold opacity-90 uppercase tracking-wider block">کالری پیشنهادی برای هدف شما</span>
                      <div className="text-2xl font-black font-mono">
                        {toPersianDigits(suggestedCalValue)} <span className="text-xs font-normal">کالری در روز</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
                    <button
                      type="button"
                      onClick={handleApplyCalorieSuggestion}
                      className="w-full py-3 bg-[#7C8363] hover:bg-[#686D51] active:scale-[0.98] transition-all text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      اعمال به عنوان هدف کالری روزانه رژیم
                    </button>
                    {bmiUpdateSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2"
                      >
                        ✓ هدف کالری شما با موفقیت بروزرسانی و اعمال شد!
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Weight check-in & Recharts weight trend line chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Check-in box (5 cols) */}
              <div className="lg:col-span-5 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 transition-colors">
                <div className="border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40 pb-3 mb-4">
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#7C8363]" />
                    ثبت وزن جدید و بروزرسانی هدف
                  </h3>
                </div>

                <form onSubmit={handleAddWeight} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">وزن صبحگاهی ناشتا (کیلوگرم) *</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={newWeight}
                      onChange={e => setNewWeight(e.target.value)}
                      placeholder="مثلا ۸۷.۳"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none focus:border-[#7C8363] text-[#2D3025] dark:text-[#E8ECE0] font-mono text-center"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">یادداشت یا حس بدنی (اختیاری)</label>
                    <input 
                      type="text" 
                      value={weightNote}
                      onChange={e => setWeightNote(e.target.value)}
                      placeholder="مثلا: احساس خفتگی کمتر حین بیدار شدن..."
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133]/60 bg-white dark:bg-[#242721] rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3.5]" />
                      <span>ثبت تغییر وزن جدید</span>
                    </button>
                    {weightSuccess && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-center text-[10px] font-black rounded-lg border border-emerald-200/50">
                        وزن جدید شما ثبت گردید و معیار هدف با موفقیت بروزرسانی شد.
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Weight trend chart box (7 cols) */}
              <div className="lg:col-span-7 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4 transition-colors">
                <div className="border-b border-[#E6DFD3]/40 pb-3">
                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                    نمودار روند نوسان وزن (روزهای اخیر)
                  </h4>
                </div>

                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                      <XAxis dataKey="date" stroke="#8D7F72" fontSize={9} tickLine={false} />
                      <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '12px', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                      />
                      {weightGoal && (
                        <ReferenceLine 
                          y={weightGoal.metric?.targetValue || 0} 
                          stroke="#D97706" 
                          strokeDasharray="3 3" 
                          label={{ value: 'هدف نهایی', position: 'insideRight', fill: '#D97706', fontSize: 9, fontWeight: 'bold' }} 
                        />
                      )}
                      <Line 
                        type="monotone" 
                        dataKey="وزن" 
                        stroke="#10B981" 
                        strokeWidth={3} 
                        dot={{ r: 4, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ─── TAB 4: NUTRITION CHARTS & TRENDS ─── */}
        {activeSubTab === 'charts' && (() => {
          // Compute the last 7 days metrics
          const last7DaysList = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const dayMeals = mealLogs.filter(log => log.date === dateStr);
            
            const dayCalories = dayMeals.reduce((acc, log) => acc + log.calories, 0);
            const dayProtein = dayMeals.reduce((acc, log) => acc + (log.protein || 0), 0);
            const dayCarbs = dayMeals.reduce((acc, log) => acc + (log.carbs || 0), 0);
            const dayFat = dayMeals.reduce((acc, log) => acc + (log.fat || 0), 0);
            const dayWater = dayMeals.reduce((acc, log) => acc + (log.waterGlasses || 0), 0);
            
            return {
              date: toJalali(dateStr).slice(5), // e.g. "04/15"
              dateFull: toJalaliFriendly(dateStr),
              'کالری دریافتی': dayCalories,
              'پروتئین (گرم)': dayProtein,
              'کربوهیدرات (گرم)': dayCarbs,
              'چربی (گرم)': dayFat,
              'آب (لیوان)': dayWater,
              'هدف کالری': targetCalories
            };
          });

          const totalCalories = last7DaysList.reduce((acc, d) => acc + d['کالری دریافتی'], 0);
          const totalProtein = last7DaysList.reduce((acc, d) => acc + d['پروتئین (گرم)'], 0);
          const totalCarbs = last7DaysList.reduce((acc, d) => acc + d['کربوهیدرات (گرم)'], 0);
          const totalFat = last7DaysList.reduce((acc, d) => acc + d['چربی (گرم)'], 0);
          const totalWater = last7DaysList.reduce((acc, d) => acc + d['آب (لیوان)'], 0);

          const avgCals = Math.round(totalCalories / 7);
          const avgProt = Math.round(totalProtein / 7);
          const avgCarb = Math.round(totalCarbs / 7);
          const avgFt = Math.round(totalFat / 7);
          const avgWtr = Math.round(totalWater / 7);

          return (
            <motion.div
              key="charts-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center space-y-1">
                  <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">میانگین کالری روزانه</span>
                  <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                    {toPersianDigits(avgCals)} <span className="text-xs font-normal">kcal</span>
                  </span>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-center space-y-1">
                  <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">میانگین پروتئین روزانه</span>
                  <span className="text-lg font-black font-mono text-orange-700 dark:text-orange-400">
                    {toPersianDigits(avgProt)} <span className="text-xs font-normal">گرم</span>
                  </span>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-center space-y-1">
                  <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">میانگین کربوهیدرات روزانه</span>
                  <span className="text-lg font-black font-mono text-amber-700 dark:text-amber-400">
                    {toPersianDigits(avgCarb)} <span className="text-xs font-normal">گرم</span>
                  </span>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-center space-y-1">
                  <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">میانگین چربی روزانه</span>
                  <span className="text-lg font-black font-mono text-rose-700 dark:text-rose-400">
                    {toPersianDigits(avgFt)} <span className="text-xs font-normal">گرم</span>
                  </span>
                </div>
                <div className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-2xl border border-sky-100 dark:border-sky-900/30 text-center space-y-1 col-span-2 md:col-span-1">
                  <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold block">میانگین مصرف آب</span>
                  <span className="text-lg font-black font-mono text-sky-700 dark:text-sky-400">
                    {toPersianDigits(avgWtr)} <span className="text-xs font-normal">لیوان</span>
                  </span>
                </div>
              </div>

              {/* Charts Display */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calories Area Chart */}
                <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                  <div className="border-b border-[#E6DFD3]/40 pb-3">
                    <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" />
                      نمودار مقایسه‌ای کالری دریافتی (۷ روز اخیر)
                    </h4>
                  </div>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={last7DaysList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCals" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D97706" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#D97706" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                        <XAxis dataKey="date" stroke="#8D7F72" fontSize={9} tickLine={false} />
                        <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} />
                        <Tooltip
                          contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '12px', fontSize: '11px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                        />
                        <ReferenceLine
                          y={targetCalories}
                          stroke="#E11D48"
                          strokeDasharray="4 4"
                          label={{ value: `حد مجاز روزانه (${targetCalories})`, position: 'insideTopRight', fill: '#E11D48', fontSize: 9, fontWeight: 'bold' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="کالری دریافتی"
                          stroke="#D97706"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#colorCals)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Macros Stacked Bar Chart */}
                <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#3D4133]/40 space-y-4">
                  <div className="border-b border-[#E6DFD3]/40 pb-3">
                    <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <Apple className="w-4 h-4 text-emerald-600" />
                      توزیع درشت‌مغذی‌ها (گرم - ۷ روز اخیر)
                    </h4>
                  </div>
                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={last7DaysList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                        <XAxis dataKey="date" stroke="#8D7F72" fontSize={9} tickLine={false} />
                        <YAxis stroke="#8D7F72" fontSize={9} tickLine={false} />
                        <Tooltip
                          contentStyle={{ direction: 'rtl', textAlign: 'right', backgroundColor: '#FDFBF7', border: '1px solid #EBE3C8', borderRadius: '12px', fontSize: '11px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#2D3025' }}
                        />
                        <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px', direction: 'rtl', textAlign: 'center' }} />
                        <Bar dataKey="پروتئین (گرم)" stackId="a" fill="#F97316" />
                        <Bar dataKey="کربوهیدرات (گرم)" stackId="a" fill="#EAB308" />
                        <Bar dataKey="چربی (گرم)" stackId="a" fill="#F43F5E" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Health Guidance Card */}
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/10 rounded-3xl border border-emerald-200/50 text-xs text-emerald-800 dark:text-emerald-400 space-y-2 leading-relaxed">
                <span className="font-extrabold text-[#7C8363] text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  تفسیر بیولوژیکی روندهای تغذیه‌ای شما
                </span>
                <p className="font-semibold">
                  تحلیل آماری هفته جاری نشان می‌دهد که مصرف کل مواد مغذی شما بر اساس اهداف متابولیکی رژیم فعلی در حال همگرایی است. 
                  حفظ نسبت مناسب کربوهیدرات‌های پیچیده به پروتئین‌های زودهضم، ترشح مداوم انسولین را تضمین کرده و مانع از ورود بدن به فاز فلات وزنی می‌شود. 
                  توصیه می‌شود مقدار پروتئین‌های با ارزش زیستی بالا (نظیر آلبومین تخم‌مرغ و مرغ) را در روزهای تمرین افزایش دهید تا بازسازی تارهای عضلانی به بهترین نحو صورت پذیرد.
                </p>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
