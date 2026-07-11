import React, { useState } from 'react';
import { MoodType, MoodLog } from '../types';
import { 
  Smile, Meh, Frown, Sparkles, Moon, AlertCircle, Plus, Trash2, 
  TrendingUp, Activity, BarChart2, Calendar, Clock, CloudSun, Compass, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import SectionHeader from './SectionHeader';

interface MoodSectionProps {
  moodLogs: MoodLog[];
  onAddMoodLog: (log: Omit<MoodLog, 'id'>) => void;
  onDeleteMoodLog: (id: string) => void;
}

const MOODS_CONFIG: Record<MoodType, { label: string; emoji: string; color: string; bg: string; border: string; desc: string }> = {
  excited: { label: 'پرحرارت و عالی', emoji: '🤩', color: 'text-[#9B6B61] dark:text-[#C59B93]', bg: 'bg-[#F9F1D8] dark:bg-[#201D13]', border: 'border-[#EBE3C8] dark:border-[#3D3929]', desc: 'انرژی خالص و اشتیاق بالا' },
  happy: { label: 'خوشحال و آرام', emoji: '😊', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-900/50', desc: 'آرامش ذهنی و رضایت درونی' },
  neutral: { label: 'معمولی و یکنواخت', emoji: '😐', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/30', border: 'border-slate-200 dark:border-slate-800/50', desc: 'حالت خنثی و متمرکز' },
  tired: { label: 'بی‌رمق و خسته', emoji: '🥱', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-900/50', desc: 'نیاز به خواب و شارژ مجدد' },
  sad: { label: 'غمگین و بی‌انگیزه', emoji: '😔', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-900/50', desc: 'انرژی روانی پایین و تنهایی' },
  stressed: { label: 'مضطرب و آشفته', emoji: '😰', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-900/50', desc: 'فشار کاری یا فکری شدید' },
};

const TRIGGER_ITEMS = [
  { id: 'work', label: 'کار و وظایف', icon: '💼' },
  { id: 'exercise', label: 'ورزش و باشگاه', icon: '🏋️‍♂️' },
  { id: 'sleep', label: 'کیفیت خواب', icon: '😴' },
  { id: 'diet', label: 'تغذیه و غذا', icon: '🍔' },
  { id: 'family', label: 'خانواده و شریک', icon: '🏠' },
  { id: 'friends', label: 'دوستان و معاشرت', icon: '👥' },
  { id: 'hobby', label: 'تفریح و سرگرمی', icon: '🍿' },
  { id: 'health', label: 'سلامت جسمی', icon: '🩺' },
];

const WEATHER_ITEMS = [
  { id: 'sunny', label: 'آفتابی', icon: '☀️' },
  { id: 'cloudy', label: 'ابری', icon: '☁️' },
  { id: 'rainy', label: 'بارانی', icon: '🌧️' },
  { id: 'windy', label: 'طوفانی', icon: '💨' },
];

export default function MoodSection({ moodLogs = [], onAddMoodLog, onDeleteMoodLog }: MoodSectionProps) {
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'insights'>('log');
  
  // Logging Form State
  const [selectedMood, setSelectedMood] = useState<MoodType>('happy');
  const [energyLevel, setEnergyLevel] = useState<number>(7);
  const [mentalFocus, setMentalFocus] = useState<number>(7);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<'sunny' | 'cloudy' | 'rainy' | 'windy'>('sunny');
  const [notes, setNotes] = useState('');
  const [customTrigger, setCustomTrigger] = useState('');
  const [customTriggers, setCustomTriggers] = useState<{id: string, label: string, icon: string}[]>([]);

  const handleToggleTrigger = (id: string) => {
    setSelectedTriggers(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleAddCustomTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTrigger.trim()) return;
    const newId = `c-trg-${Date.now()}`;
    setCustomTriggers(prev => [...prev, { id: newId, label: customTrigger, icon: '🏷️' }]);
    setSelectedTriggers(prev => [...prev, newId]);
    setCustomTrigger('');
  };

  const handleSaveMood = () => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    onAddMoodLog({
      date: today,
      time,
      mood: selectedMood,
      energyLevel,
      mentalFocus,
      triggers: selectedTriggers,
      weather: selectedWeather,
      notes: notes.trim() || undefined
    });

    // Reset Form
    setNotes('');
    setSelectedTriggers([]);
    setEnergyLevel(7);
    setMentalFocus(7);
    setActiveTab('history');
  };

  // Calculations for insights
  const totalLogs = moodLogs.length;
  
  // Mood percentages
  const moodCounts = moodLogs.reduce((acc, log) => {
    acc[log.mood] = (acc[log.mood] || 0) + 1;
    return acc;
  }, {} as Record<MoodType, number>);

  const dominantMoodEntry = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantMood: MoodType | null = dominantMoodEntry ? (dominantMoodEntry[0] as MoodType) : null;

  const avgEnergy = totalLogs > 0 
    ? Math.round((moodLogs.reduce((sum, l) => sum + l.energyLevel, 0) / totalLogs) * 10) / 10 
    : 0;

  const avgFocus = totalLogs > 0 
    ? Math.round((moodLogs.reduce((sum, l) => sum + l.mentalFocus, 0) / totalLogs) * 10) / 10 
    : 0;

  // Triggers rank
  const allAvailableTriggers = [...TRIGGER_ITEMS, ...customTriggers];
  const triggerCounts = moodLogs.reduce((acc, log) => {
    log.triggers.forEach(tId => {
      acc[tId] = (acc[tId] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => {
      const config = allAvailableTriggers.find(t => t.id === id);
      return {
        id,
        count,
        label: config?.label || id,
        icon: config?.icon || '🏷️'
      };
    });

  // Recharts Line Data (Reverse chronological to chronological for chart)
  const lineChartData = [...moodLogs]
    .sort((a, b) => {
      const d1 = `${a.date}T${a.time}`;
      const d2 = `${b.date}T${b.time}`;
      return d1.localeCompare(d2);
    })
    .slice(-10) // showing last 10 entries
    .map(log => ({
      dateTime: `${log.date.slice(5)} ${log.time}`,
      'سطح انرژی بدنی': log.energyLevel,
      'تمرکز فکری': log.mentalFocus,
      mood: MOODS_CONFIG[log.mood].emoji
    }));

  // Radar Data
  const radarChartData = [
    { name: 'عالی 🤩', count: moodCounts.excited || 0 },
    { name: 'خوشحال 😊', count: moodCounts.happy || 0 },
    { name: 'خنثی 😐', count: moodCounts.neutral || 0 },
    { name: 'خسته 🥱', count: moodCounts.tired || 0 },
    { name: 'غمگین 😔', count: moodCounts.sad || 0 },
    { name: 'مضطرب 😰', count: moodCounts.stressed || 0 },
  ];

  const getPersianNumber = (num: number | string) => {
    const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/[0-9]/g, w => id[parseInt(w, 10)]);
  };

  return (
    <div className="space-y-5 text-right pb-8" dir="rtl">
      {/* Page Header */}
      <SectionHeader
        icon={Smile}
        title="ارزیابی احساسات"
        subtitle="پایش انرژی روانی و سیستم عصبی"
        badge={moodLogs.length > 0 ? moodLogs.length : undefined}
        actions={
          <div className="bg-[#E6DFD3]/40 dark:bg-[#20241A]/50 p-1 rounded-2xl border border-[#E6DFD3]/80 dark:border-[#3D4133]/40 flex gap-1">
            <button 
              onClick={() => setActiveTab('log')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'log' ? 'bg-[#E26645] text-white shadow-md' : 'text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-white'}`}
            >
              <Plus className="w-3 h-3" />
              ثبت
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-[#E26645] text-white shadow-md' : 'text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-white'}`}
            >
              <Calendar className="w-3 h-3" />
              تاریخچه
            </button>
            <button 
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'insights' ? 'bg-[#E26645] text-white shadow-md' : 'text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-white'}`}
            >
              <BarChart2 className="w-3 h-3" />
              آنالیز
            </button>
          </div>
        }
      />

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Stats Widget Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Active Summary Card */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[24px] p-5 shadow-xs transition-colors">
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 rounded bg-[#9B6B61]"></span>
              خلاصه وضعیت روانی اخیر
            </h3>

            <div className="space-y-4">
              {dominantMood ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#20241A] border border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
                  <span className="text-4xl select-none">{MOODS_CONFIG[dominantMood].emoji}</span>
                  <div>
                    <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] block font-bold">فرکانس غالب احساسی</span>
                    <span className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">{MOODS_CONFIG[dominantMood].label}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-[#8D7F72] dark:text-[#9D978B]">داده‌ای ثبت نشده است</div>
              )}

              {/* Grid indices */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-[#E8ECE0]/50 dark:bg-[#20241A]/30 text-center border border-[#DDE2D5]/50 dark:border-[#3D4133]/15">
                  <span className="text-xl font-black text-[#7C8363] dark:text-[#9ECE9A]">{getPersianNumber(avgEnergy)} <span className="text-[10px]">/۱۰</span></span>
                  <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] block mt-1">میانگین انرژی بدنی</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F4E9E4]/50 dark:bg-[#2D3025]/20 text-center border border-[#EDDDD7]/50 dark:border-[#3D4133]/15">
                  <span className="text-xl font-black text-[#9B6B61] dark:text-[#ED9C8A]">{getPersianNumber(avgFocus)} <span className="text-[10px]">/۱۰</span></span>
                  <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] block mt-1">میانگین تمرکز فکری</span>
                </div>
              </div>

              {/* Quick Wisdom Card */}
              <div className="p-3.5 rounded-2xl bg-[#9B6B61]/5 dark:bg-[#9B6B61]/10 border border-[#9B6B61]/15 text-xs text-[#8D7F72] dark:text-[#C7B59F] leading-relaxed">
                <span className="text-[#9B6B61] font-bold block mb-1">💡 توصیه خودآگاهی بیومتریک:</span>
                {dominantMood === 'stressed' && 'میزان اضطراب ثبت‌شده بالا است. توصیه می‌شود همین حالا ۵ دقیقه تمرین تنفس عمیق جعبه‌ای را در بخش ذهن‌آگاهی انجام دهید.'}
                {dominantMood === 'tired' && 'سطح خستگی بدنی بالا است. از مصرف بیش از حد قهوه خودداری کرده و امشب خواب خود را با کیفیت بالاتر و بدون صفحه نمایش تنظیم کنید.'}
                {dominantMood === 'happy' || dominantMood === 'excited' ? 'انرژی روانی شما در فرکانس فوق‌العاده‌ای قرار دارد! بهترین زمان برای پیشبرد سخت‌ترین کارهای لیست و اتخاذ تصمیمات مهم کاری است.' : ''}
                {!dominantMood && 'احوالات روزانه خود را در بازه‌های مختلف (صبح، ظهر، شب) ثبت کنید تا نمودار تغییر ریتم انرژی روانی و فکری شما شکل بگیرد.'}
                {dominantMood === 'neutral' && 'حالت خنثی و متمرکز، بهترین زمان برای یادگیری عمیق، مطالعه تکنیکال یا فعالیت‌های خلاقانه آرام است.'}
                {dominantMood === 'sad' && 'پذیرش احساسات غم و تنهایی، گام اول ریکاوری است. معاشرت صمیمی با افراد حلقه طلایی CRM شما، بهترین محرک ارگانیک برای افزایش سرتونین است.'}
              </div>
            </div>
          </div>

          {/* Core Insights: Positive and Negative Triggers */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[24px] p-5 shadow-xs transition-colors">
            <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 rounded bg-[#7C8363]"></span>
              تحلیل ریشه‌ای محرک‌های شما
            </h3>

            {sortedTriggers.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold block mb-1">پر تکرارترین فاکتورهای تاثیرگذار بر احساسات شما:</span>
                {sortedTriggers.slice(0, 4).map((trg, idx) => (
                  <div key={trg.id} className="flex justify-between items-center bg-white dark:bg-[#20241A] p-2.5 rounded-xl border border-[#E6DFD3]/40 dark:border-[#3D4133]/20">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-base select-none">{trg.icon}</span>
                      <span className="font-extrabold text-[#3D3D3D] dark:text-[#E8ECE0]">{trg.label}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono font-black">
                      {getPersianNumber(trg.count)} بار
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#8D7F72] dark:text-[#9D978B]">داده کافی وجود ندارد. با ثبت مداوم، همبستگی فاکتورهای زندگی و مود شما مشخص خواهد شد.</div>
            )}
          </div>
        </div>

        {/* Right Tab Content */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: FORM LOGGING */}
            {activeTab === 'log' && (
              <motion.div
                key="form-log"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[28px] p-6 shadow-sm space-y-6 text-right"
              >
                <div>
                  <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-2">
                    <span>✨</span>
                    <span>چطور هستید؟ وضعیت روحی خود را لمس کنید</span>
                  </h3>
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-0.5">ثبت صادقانه حال روانی، سنگ بنای ارتقای توازن زندگی است.</p>
                </div>

                {/* Mood Selection Wheel (Interactive animated list with spring physics) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.entries(MOODS_CONFIG) as [MoodType, typeof MOODS_CONFIG[MoodType]][]).map(([key, item]) => {
                    const isSelected = selectedMood === key;
                    return (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedMood(key)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer text-center relative overflow-hidden ${
                          isSelected 
                            ? `${item.bg} ${item.border} border-[#9B6B61]/80 ring-2 ring-[#9B6B61]/10` 
                            : 'bg-white dark:bg-[#20241A] border-[#E6DFD3]/50 dark:border-[#3D4133]/20 hover:border-[#8D7F72]/50'
                        }`}
                      >
                        <span className="text-4xl mb-2 select-none filter drop-shadow-sm">{item.emoji}</span>
                        <span className={`text-xs font-black ${item.color}`}>{item.label}</span>
                        <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mt-1 line-clamp-1">{item.desc}</span>
                        
                        {/* Interactive glow when selected */}
                        {isSelected && (
                          <motion.div 
                            layoutId="selected-mood-glow" 
                            className="absolute inset-0 bg-[#9B6B61]/5 dark:bg-[#9B6B61]/10 -z-10 pointer-events-none" 
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Sliders Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-dashed border-[#E6DFD3]/80 dark:border-[#3D4133]/20">
                  {/* Energy Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>انرژی بدنی و جسمانی</span>
                      </label>
                      <span className="text-xs font-mono font-black text-[#9B6B61] bg-[#9B6B61]/10 px-2 py-0.5 rounded-lg">
                        {getPersianNumber(energyLevel)} از ۱۰
                      </span>
                    </div>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mb-2">میزان رمق بدنی، خستگی عضلانی و توان انجام فعالیت‌های فیزیکی سنگین.</p>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
                      className="w-full accent-[#9B6B61] bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                      <span>بسیار ضعیف (خالی)</span>
                      <span>طبیعی و متعادل</span>
                      <span>بسیار پر انرژی (بمب)</span>
                    </div>
                  </div>

                  {/* Mental Focus Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                        <span>🧠</span>
                        <span>تمرکز فکری و آرامش ذهنی</span>
                      </label>
                      <span className="text-xs font-mono font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                        {getPersianNumber(mentalFocus)} از ۱۰
                      </span>
                    </div>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mb-2">توانایی تمرکز روی مسائل پیچیده، پراکندگی افکار، اضطراب فکری.</p>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={mentalFocus}
                      onChange={(e) => setMentalFocus(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500 bg-slate-200 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                      <span>مغشوش و پراکنده</span>
                      <span>تمرکز متناسب</span>
                      <span>شفاف و تیزبین</span>
                    </div>
                  </div>
                </div>

                {/* Triggers and Weather */}
                <div className="space-y-4 pt-2 border-t border-dashed border-[#E6DFD3]/80 dark:border-[#3D4133]/20">
                  {/* Triggers multi-selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <span>🔗</span>
                      <span>چه چیزهایی امروز روی شما اثرگذار بودند؟ (محرک‌ها)</span>
                    </label>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] mb-3">یک یا چند فاکتور زندگی که فکر می‌کنید بر حال کنونی شما موثرند را انتخاب کنید.</p>
                    <div className="flex flex-wrap gap-2">
                      {[...TRIGGER_ITEMS, ...customTriggers].map((item) => {
                        const isSelected = selectedTriggers.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleToggleTrigger(item.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected 
                                ? 'bg-[#7C8363] text-white border-[#7C8363] shadow-xs' 
                                : 'bg-white dark:bg-[#20241A] text-[#3D3D3D] dark:text-[#E8ECE0] border-[#E6DFD3]/60 dark:border-[#3D4133]/20 hover:border-[#8D7F72]'
                            }`}
                          >
                            <span className="text-xs select-none">{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom trigger form */}
                    <form onSubmit={handleAddCustomTrigger} className="flex gap-2 max-w-xs mt-2.5">
                      <input 
                        type="text"
                        value={customTrigger}
                        onChange={(e) => setCustomTrigger(e.target.value)}
                        placeholder="افزودن محرک شخصی..."
                        className="flex-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-[#9B6B61]/50"
                      />
                      <button 
                        type="submit" 
                        className="px-3 py-1.5 bg-[#2D3025] dark:bg-[#3D4133] hover:bg-black text-white text-[10px] font-black rounded-xl cursor-pointer"
                      >
                        اضافه
                      </button>
                    </form>
                  </div>

                  {/* Weather Selection */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <span>🌦️</span>
                      <span>آب و هوای بیرون</span>
                    </label>
                    <div className="flex gap-2">
                      {WEATHER_ITEMS.map((item) => {
                        const isSelected = selectedWeather === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedWeather(item.id as any)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isSelected 
                                ? 'bg-[#9B6B61]/10 text-[#9B6B61] border-[#EBE3C8] dark:border-[#3D3929]' 
                                : 'bg-white dark:bg-[#20241A] text-[#8D7F72] border-[#E6DFD3]/60 dark:border-[#3D4133]/20'
                            }`}
                          >
                            <span className="text-xs select-none">{item.icon}</span>
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Note Area */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5">
                      <span>📝</span>
                      <span>یادداشت یا دلیل خاصی وجود دارد؟ (اختیاری)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="امروز چه شد؟ بنویسید تا بعدا الگوها را ارزیابی کنیم..."
                      className="w-full text-xs font-extrabold p-3.5 rounded-2xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] focus:outline-none focus:ring-1 focus:ring-[#9B6B61]/50 resize-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSaveMood}
                  className="w-full py-3.5 bg-[#E26645] hover:bg-[#C94B2A] text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>ثبت و ذخیره در تاریخچه بیومتریک</span>
                </button>
              </motion.div>
            )}

            {/* TAB 2: HISTORY LOGS */}
            {activeTab === 'history' && (
              <motion.div
                key="history-log"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-4"
              >
                {moodLogs.length > 0 ? (
                  [...moodLogs]
                    .sort((a, b) => {
                      const d1 = `${a.date}T${a.time}`;
                      const d2 = `${b.date}T${b.time}`;
                      return d2.localeCompare(d1); // Newest first
                    })
                    .map((log) => {
                      const config = MOODS_CONFIG[log.mood] || MOODS_CONFIG.neutral;
                      return (
                        <div 
                          key={log.id}
                          className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all text-right"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl select-none">{config.emoji}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{config.label}</h4>
                                  {log.weather && (
                                    <span className="text-[10px]" title="آب و هوا">
                                      {WEATHER_ITEMS.find(w => w.id === log.weather)?.icon}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2.5 mt-1 text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-[#E26645]" />
                                    {getPersianNumber(log.date)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#E26645]" />
                                    {getPersianNumber(log.time)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => onDeleteMoodLog(log.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[#8D7F72] hover:text-rose-500 cursor-pointer transition-colors"
                              title="حذف این مورد"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Scores & Triggers Row */}
                          <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-dashed border-[#E6DFD3]/60 dark:border-[#3D4133]/20">
                            {/* Score info */}
                            <div className="flex gap-4">
                              <div className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                                ⚡ انرژی بدنی: <span className="font-extrabold text-[#3D3D3D] dark:text-[#E8ECE0]">{getPersianNumber(log.energyLevel)}/۱۰</span>
                              </div>
                              <div className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                                🧠 آرامش ذهنی: <span className="font-extrabold text-[#3D3D3D] dark:text-[#E8ECE0]">{getPersianNumber(log.mentalFocus)}/۱۰</span>
                              </div>
                            </div>

                            {/* Trigger tags */}
                            {log.triggers.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {log.triggers.map(tId => {
                                  const trg = allAvailableTriggers.find(t => t.id === tId);
                                  return (
                                    <span 
                                      key={tId} 
                                      className="text-[8px] font-black bg-[#E8ECE0] dark:bg-[#20241A] text-[#7C8363] dark:text-[#9ECE9A] px-2 py-0.5 rounded-md border border-[#DDE2D5] dark:border-[#3D4133]/20"
                                    >
                                      {trg?.icon} {trg?.label || tId}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {log.notes && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-[#E6DFD3]/20 dark:bg-[#2D3025]/20 border border-[#E6DFD3]/30 dark:border-[#3D4133]/15 text-[10px] text-[#3D3D3D] dark:text-[#C7B59F] leading-relaxed flex items-start gap-1.5">
                              <MessageSquare className="w-3 h-3 text-[#E26645] shrink-0 mt-0.5" />
                              <span>{log.notes}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                ) : (
                  <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] rounded-[24px] p-10 text-center text-xs text-[#8D7F72]">
                    <span className="text-3xl block mb-2 select-none">📭</span>
                    <span>هیچ حال‌وروزی ثبت نشده است. همین امروز اولین پایش را ثبت کنید.</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: INSIGHTS & CHARTS */}
            {activeTab === 'insights' && (
              <motion.div
                key="insights-view"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-6"
              >
                {moodLogs.length >= 2 ? (
                  <>
                    {/* Trend Line Chart */}
                    <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[24px] p-5 shadow-xs transition-colors">
                      <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-3 rounded bg-[#9B6B61]"></span>
                        نوسانات انرژی فیزیکی در مقابل تمرکز فکری (۱۰ ثبت اخیر)
                      </h3>
                      <div className="h-60 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E26645" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#E26645" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C8363" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#7C8363" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="dateTime" tick={{ fontSize: 9 }} stroke="#8D7F72" />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} stroke="#8D7F72" />
                            <Tooltip contentStyle={{ fontSize: 10, direction: 'rtl', textAlign: 'right' }} />
                            <Area type="monotone" dataKey="سطح انرژی بدنی" stroke="#E26645" strokeWidth={2} fillOpacity={1} fill="url(#colorEnergy)" />
                            <Area type="monotone" dataKey="تمرکز فکری" stroke="#7C8363" strokeWidth={2} fillOpacity={1} fill="url(#colorFocus)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Radar Distribution of Moods */}
                    <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/30 rounded-[24px] p-5 shadow-xs transition-colors">
                      <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-3 rounded bg-[#7C8363]"></span>
                        پراکندگی فراوانی فرکانس‌های احساسی
                      </h3>
                      <div className="h-60 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                            <PolarGrid stroke="#E6DFD3" />
                            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#3D3D3D' }} />
                            <Radar name="تعداد ثبت" dataKey="count" stroke="#E26645" fill="#E26645" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] rounded-[24px] p-10 text-center text-xs text-[#8D7F72]">
                    <span className="text-3xl block mb-2 select-none">📊</span>
                    <span>برای ترسیم نمودارهای تحلیلی و ریشه‌یابی فاکتورها، حداقل به ۲ ثبت حال‌وهوا نیاز است.</span>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
