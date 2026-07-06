import React from 'react';
import { LifeData, MoodType } from '../types';
import { CATEGORY_LABELS, MOOD_LABELS } from '../initialData';
import { 
  Flame, 
  CheckCircle2, 
  Target, 
  Sparkles, 
  Calendar, 
  CheckSquare, 
  Bell,
  Heart,
  Scale,
  DollarSign,
  Droplet,
  Coffee,
  Plus,
  Minus,
  TrendingUp,
  Award,
  ChevronLeft,
  Music,
  Film,
  Zap,
  Pin
} from 'lucide-react';
import { motion } from 'motion/react';
import { ScheduleItem } from './CalendarSection';
import { Task } from '../types';

interface DashboardOverviewProps {
  data: LifeData;
  setActiveTab: (tab: string) => void;
  todayDate: string;
  waterIntake: number;
  onIncrementWater: () => void;
  onDecrementWater: () => void;
  primaryPriority: { title: string; time: string; status: string };
  scheduleItems: ScheduleItem[];
  onToggleScheduleItem: (id: string) => void;
  onToggleTask?: (id: string) => void;
  onToggleTaskInProject?: (goalId: string, projectId: string, taskId: string) => void;
  onToggleDailyHighlight?: (id: string) => void;
}

export default function DashboardOverview({ 
  data, 
  setActiveTab, 
  todayDate,
  waterIntake,
  onIncrementWater,
  onDecrementWater,
  primaryPriority,
  scheduleItems,
  onToggleScheduleItem,
  onToggleTask,
  onToggleTaskInProject,
  onToggleDailyHighlight
}: DashboardOverviewProps) {
  const { transactions, habits, goals, tasks, journalEntries } = data;

  // Gather Daily Highlights (standalone and project-nested tasks)
  const dailyHighlights: Array<{ task: Task; goalId?: string; projectId?: string }> = [];
  (tasks || []).forEach(t => {
    if (t.isDailyHighlight) {
      dailyHighlights.push({ task: t });
    }
  });
  (goals || []).forEach(g => {
    (g.projects || []).forEach(p => {
      (p.tasks || []).forEach(t => {
        if (t.isDailyHighlight) {
          dailyHighlights.push({ task: t, goalId: g.id, projectId: p.id });
        }
      });
    });
  });

  // Real statistics derived from live state
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalHabits = habits.length;
  const completedHabitsCount = habits.filter(h => h.logs.includes(todayDate)).length;

  // Finance status
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyBudget = data.budgetSettings?.monthlyTotal || 15800000;
  const budgetPct = monthlyBudget > 0 ? Math.min(100, Math.round((totalExpense / monthlyBudget) * 100)) : 0;
  const financeSuccessPct = Math.max(0, 100 - budgetPct);

  // Active goal progress
  const mainActiveGoal = goals[0]; // "پس‌انداز هوشمند" or default "ساخت همبافت"
  const mainGoalTitle = mainActiveGoal ? mainActiveGoal.title : "ساخت همبافت";
  const mainActiveGoalMilestonesCount = mainActiveGoal ? mainActiveGoal.milestones.length : 0;
  const mainActiveGoalCompletedCount = mainActiveGoal ? mainActiveGoal.milestones.filter(m => m.completed).length : 0;
  const mainGoalProgress = mainActiveGoalMilestonesCount > 0
    ? Math.round((mainActiveGoalCompletedCount / mainActiveGoalMilestonesCount) * 100)
    : (mainActiveGoal?.completed ? 100 : 0);

  // Welcome date in Farsi
  const farsiDate = "شنبه ۱۴ تیر ۱۴۰۵";

  return (
    <div className="space-y-6 text-right w-full max-w-7xl mx-auto" dir="rtl">
      
      {/* 1. Header بالا (Only on Mobile) */}
      <div className="relative flex justify-between items-center bg-[#FDFBF7] dark:bg-[#1B1D16] py-2 border-b border-[#E6DFD3]/40 dark:border-[#2D3025]/40 md:hidden transition-colors">
        <div className="flex items-center">
          <span className="text-[10px] font-black text-[#8D7F72] dark:text-[#9D978B] bg-[#F9F6EE] dark:bg-[#151713] px-2.5 py-1 rounded-xl border border-[#E6DFD3]/50 dark:border-[#2D3025]/50 transition-colors">
            {farsiDate}
          </span>
        </div>

        {/* Logo / App Name centered perfectly using absolute positioning */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <h1 className="text-lg font-black tracking-tight text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">
            همبافت
          </h1>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button className="p-2 bg-[#F9F6EE] dark:bg-[#151713] hover:bg-[#E6DFD3]/60 dark:hover:bg-[#2D3025]/60 border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl text-[#3D3D3D] dark:text-[#E8ECE0] transition-all relative cursor-pointer">
            <Bell className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
          </button>
        </div>
      </div>

      {/* Today / Calendar Tabs Pills (Only on Mobile) */}
      <div className="flex justify-center md:hidden">
        <div className="bg-[#F9F6EE] dark:bg-[#151713] p-1 rounded-xl border border-[#E6DFD3] dark:border-[#2D3025] flex gap-1 w-full max-w-[200px] transition-colors">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-[#2D3025] dark:bg-[#E8ECE0] text-white dark:text-[#2D3025] text-center shadow-xs transition-all cursor-pointer"
          >
            امروز
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className="flex-1 py-1.5 text-[11px] font-semibold text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] text-center rounded-lg transition-all cursor-pointer"
          >
            تقویم
          </button>
        </div>
      </div>

      {/* Grid Container for Desktop responsiveness */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Column 1: Scores, summary indicator, and quote */}
        <div className="space-y-6">
          {/* 2. کارت امتیاز امروز */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#2D3025] shadow-xs relative overflow-hidden h-fit transition-colors">
            <div className="flex justify-between items-center">
              {/* Left Block: Score */}
              <div className="space-y-2">
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold">امتیاز امروز شما</span>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-4xl font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant tracking-tight">۸.۶</h2>
                  <span className="text-xs text-[#8D7F72] dark:text-[#9D978B] font-medium">از ۱۰</span>
                </div>
                
                {/* Short motivational pill */}
                <div className="bg-[#F9F1D8] dark:bg-[#201D13] border border-[#EBE3C8] dark:border-[#3D3929] px-3 py-1 rounded-full text-[9px] text-[#9B6B61] dark:text-[#C59B93] font-bold flex items-center gap-1 w-fit transition-colors">
                  <Sparkles className="w-3 h-3 text-[#9B6B61] dark:text-[#C59B93]" />
                  <span>عالیه! به راهت ادامه بده</span>
                </div>
              </div>

              {/* Right Block: Segmentation circular index (Segmented ring) */}
              <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-36 h-36 relative select-none">
                  {/* Back concentric rings */}
                  <circle cx="100" cy="100" r="64" fill="none" stroke="#F9F6EE" className="stroke-[#F9F6EE] dark:stroke-[#151713]" strokeWidth="12" />

                  {/* Arc Segment 1: Productivity (Top-Right, 91%) - Rose / Coral */}
                  <path 
                    d="M 100 36 A 64 64 0 0 1 164 100" 
                    fill="none" 
                    stroke="#EDDDD7" 
                    className="stroke-[#EDDDD7] dark:stroke-[#2B201B]"
                    strokeWidth="12" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 100 36 A 64 64 0 0 1 160 85" 
                    fill="none" 
                    stroke="#9B6B61" 
                    className="stroke-[#9B6B61] dark:stroke-[#C59B93]"
                    strokeWidth="8" 
                    strokeLinecap="round" 
                  />

                  {/* Arc Segment 2: Health (Bottom-Right, 85%) - Green */}
                  <path 
                    d="M 164 100 A 64 64 0 0 1 100 164" 
                    fill="none" 
                    stroke="#DDE2D5" 
                    className="stroke-[#DDE2D5] dark:stroke-[#1D2218]"
                    strokeWidth="12" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 164 100 A 64 64 0 0 1 110 162" 
                    fill="none" 
                    stroke="#7C8363" 
                    className="stroke-[#7C8363] dark:stroke-[#9ECE9A]"
                    strokeWidth="8" 
                    strokeLinecap="round" 
                  />

                  {/* Arc Segment 3: Finance (Bottom-Left, 78%) - Yellow */}
                  <path 
                    d="M 100 164 A 64 64 0 0 1 36 100" 
                    fill="none" 
                    stroke="#EBE3C8" 
                    className="stroke-[#EBE3C8] dark:stroke-[#23211A]"
                    strokeWidth="12" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 100 164 A 64 64 0 0 1 36 100" 
                    fill="none" 
                    stroke="#D4AF37" 
                    className="stroke-[#D4AF37] dark:stroke-[#E5C158]"
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    strokeDasharray="100.53"
                    strokeDashoffset={100.53 - (100.53 * financeSuccessPct / 100)}
                  />

                  {/* Arc Segment 4: Balance (Top-Left, 82%) - Blue */}
                  <path 
                    d="M 36 100 A 64 64 0 0 1 100 36" 
                    fill="none" 
                    stroke="#E6DFD3" 
                    className="stroke-[#E6DFD3] dark:stroke-[#1E201B]"
                    strokeWidth="12" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M 36 100 A 64 64 0 0 1 85 40" 
                    fill="none" 
                    stroke="#8D7F72" 
                    className="stroke-[#8D7F72] dark:stroke-[#9D978B]"
                    strokeWidth="8" 
                    strokeLinecap="round" 
                  />

                  {/* Center Circle */}
                  <circle cx="100" cy="100" r="28" fill="#FDFBF7" className="fill-[#FDFBF7] dark:fill-[#1B1D16] stroke-[#E6DFD3] dark:stroke-[#2D3025] shadow-xs" strokeWidth="1" />
                  
                  {/* Symmetric 5-Petal Flower Emblem */}
                  <g transform="translate(100, 100)">
                    <circle cx="0" cy="-6" r="5" fill="#9B6B61" className="fill-[#9B6B61] dark:fill-[#C59B93]" opacity="0.85" />
                    <circle cx="6" cy="-2" r="5" fill="#9B6B61" className="fill-[#9B6B61] dark:fill-[#C59B93]" opacity="0.85" />
                    <circle cx="4" cy="5" r="5" fill="#9B6B61" className="fill-[#9B6B61] dark:fill-[#C59B93]" opacity="0.85" />
                    <circle cx="-4" cy="5" r="5" fill="#9B6B61" className="fill-[#9B6B61] dark:fill-[#C59B93]" opacity="0.85" />
                    <circle cx="-6" cy="-2" r="5" fill="#9B6B61" className="fill-[#9B6B61] dark:fill-[#C59B93]" opacity="0.85" />
                    <circle cx="0" cy="0" r="2.5" fill="#FDFBF7" className="fill-[#FDFBF7] dark:fill-[#1B1D16]" />
                  </g>

                  {/* Floating icon badges */}
                  <g transform="translate(145, 55)">
                    <circle r="12" fill="#F4E9E4" stroke="#EDDDD7" className="fill-[#F4E9E4] dark:fill-[#2B201B] stroke-[#EDDDD7] dark:stroke-[#3D2C26]" strokeWidth="1.5" />
                    <foreignObject x="-8" y="-8" width="16" height="16">
                      <div className="w-full h-full flex items-center justify-center">
                        <Heart className="w-3.5 h-3.5 text-[#9B6B61] dark:text-[#C59B93] fill-[#9B6B61] dark:fill-[#C59B93]" />
                      </div>
                    </foreignObject>
                  </g>

                  <g transform="translate(145, 145)">
                    <circle r="12" fill="#E8ECE0" stroke="#DDE2D5" className="fill-[#E8ECE0] dark:fill-[#1D2218] stroke-[#DDE2D5] dark:stroke-[#2E3526]" strokeWidth="1.5" />
                    <foreignObject x="-8" y="-8" width="16" height="16">
                      <div className="w-full h-full flex items-center justify-center">
                        <Flame className="w-3.5 h-3.5 text-[#7C8363] dark:text-[#9ECE9A] fill-[#7C8363] dark:fill-[#9ECE9A]" />
                      </div>
                    </foreignObject>
                  </g>

                  <g transform="translate(55, 145)">
                    <circle r="12" fill="#F9F1D8" stroke="#EBE3C8" className="fill-[#F9F1D8] dark:fill-[#252219] stroke-[#EBE3C8] dark:stroke-[#3D3728]" strokeWidth="1.5" />
                    <foreignObject x="-8" y="-8" width="16" height="16">
                      <div className="w-full h-full flex items-center justify-center">
                        <DollarSign className="w-3.5 h-3.5 text-[#5A5A40] dark:text-[#B6B690]" />
                      </div>
                    </foreignObject>
                  </g>

                  <g transform="translate(55, 55)">
                    <circle r="12" fill="#E6DFD3" stroke="#D6CFC3" className="fill-[#E6DFD3] dark:fill-[#1E201B] stroke-[#D6CFC3] dark:stroke-[#2D3025]" strokeWidth="1.5" />
                    <foreignObject x="-8" y="-8" width="16" height="16">
                      <div className="w-full h-full flex items-center justify-center">
                        <Scale className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B]" />
                      </div>
                    </foreignObject>
                  </g>
                </svg>
              </div>
            </div>

            {/* Row of 4 Sub-Index Mini-Cards */}
            <div className="grid grid-cols-4 gap-1.5 mt-5 border-t border-[#E6DFD3]/40 dark:border-[#2D3025]/40 pt-4">
              <div className="text-center bg-[#FDFBF7] dark:bg-[#1B1D16] p-2 rounded-xl border border-[#EDDDD7] dark:border-[#3D2C26] relative transition-colors">
                <span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B] block">بهره‌وری</span>
                <div className="text-[11px] font-black text-[#9B6B61] dark:text-[#C59B93] font-serif-elegant">۹۱٪</div>
                <div className="w-full h-1 bg-[#9B6B61] dark:bg-[#C59B93] rounded-full mt-1.5"></div>
              </div>

              <div className="text-center bg-[#FDFBF7] dark:bg-[#1B1D16] p-2 rounded-xl border border-[#DDE2D5] dark:border-[#2E3526] relative transition-colors">
                <span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B] block">سلامت</span>
                <div className="text-[11px] font-black text-[#7C8363] dark:text-[#9ECE9A] font-serif-elegant">۸۵٪</div>
                <div className="w-full h-1 bg-[#7C8363] dark:bg-[#9ECE9A] rounded-full mt-1.5"></div>
              </div>

              <div className="text-center bg-[#FDFBF7] dark:bg-[#1B1D16] p-2 rounded-xl border border-[#EBE3C8] dark:border-[#3D3728] relative transition-colors">
                <span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B] block">مالی</span>
                <div className="text-[11px] font-black text-[#D4AF37] dark:text-[#E5C158] font-serif-elegant">{financeSuccessPct.toLocaleString('fa-IR')}٪</div>
                <div className="w-full h-1 bg-[#EBE3C8] dark:bg-[#3D3728] rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-[#D4AF37] dark:bg-[#E5C158] rounded-full" style={{ width: `${financeSuccessPct}%` }}></div>
                </div>
              </div>

              <div className="text-center bg-[#FDFBF7] dark:bg-[#1B1D16] p-2 rounded-xl border border-[#D6CFC3] dark:border-[#2D3025] relative transition-colors">
                <span className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B] block">تعادل</span>
                <div className="text-[11px] font-black text-[#8D7F72] dark:text-[#9D978B] font-serif-elegant">۸۲٪</div>
                <div className="w-full h-1 bg-[#8D7F72] dark:bg-[#9D978B] rounded-full mt-1.5"></div>
              </div>
            </div>
          </div>

          {/* 3. نمای کلی امروز */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 font-serif-elegant">
                <Coffee className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                <span>نمای کلی امروز</span>
              </h3>
            </div>

            {/* 4 Pastel Pill-Cards Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div 
                onClick={() => setActiveTab('journal')}
                className="bg-[#F9F6EE] dark:bg-[#151713] hover:bg-[#E8ECE0] dark:hover:bg-[#1E2218] p-3 rounded-2xl border border-[#E6DFD3] dark:border-[#2D3025] text-center transition-all cursor-pointer flex flex-col justify-between h-20"
              >
                <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">کارها</div>
                <div className="text-sm font-extrabold text-[#2D3025] dark:text-[#E8ECE0] font-mono leading-none my-1">
                  {completedTasksCount}/{totalTasks}
                </div>
                <span className="text-[7px] text-[#8D7F72] dark:text-[#9D978B] font-semibold bg-[#E8ECE0] dark:bg-[#20241A] py-0.5 rounded-full">امروز</span>
              </div>

              <div 
                onClick={() => setActiveTab('habits')}
                className="bg-[#FDFBF7] dark:bg-[#1B1D16] hover:bg-[#F4E9E4] dark:hover:bg-[#28201E] p-3 rounded-2xl border border-[#EDDDD7] dark:border-[#3D2C26] text-center transition-all cursor-pointer flex flex-col justify-between h-20"
              >
                <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">عادت‌ها</div>
                <div className="text-sm font-extrabold text-[#9B6B61] dark:text-[#C59B93] font-mono leading-none my-1">
                  {completedHabitsCount}/{totalHabits}
                </div>
                <span className="text-[7px] text-[#9B6B61] dark:text-[#C59B93] font-semibold bg-[#F4E9E4] dark:bg-[#2C211F] py-0.5 rounded-full">امروز</span>
              </div>

              <div className="bg-[#F9F1D8] dark:bg-[#201D13] p-3 rounded-2xl border border-[#EBE3C8] dark:border-[#3D3728] text-center flex flex-col justify-between h-20 relative select-none">
                <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold flex justify-center items-center gap-0.5">
                  <span>آب</span>
                  <Droplet className="w-2.5 h-2.5 text-[#7C8363] dark:text-[#9ECE9A]" />
                </div>
                
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDecrementWater(); }}
                    className="w-4 h-4 rounded-full bg-[#EBE3C8] dark:bg-[#3D3728] text-[#5A5A40] dark:text-[#B6B690] font-bold flex items-center justify-center text-[10px] hover:bg-[#D6CFC3] dark:hover:bg-[#4E4736] cursor-pointer"
                  >
                    -
                  </button>
                  <div className="text-sm font-extrabold text-[#5A5A40] dark:text-[#B6B690] font-mono leading-none">
                    {waterIntake}/۸
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onIncrementWater(); }}
                    className="w-4 h-4 rounded-full bg-[#EBE3C8] dark:bg-[#3D3728] text-[#5A5A40] dark:text-[#B6B690] font-bold flex items-center justify-center text-[10px] hover:bg-[#D6CFC3] dark:hover:bg-[#4E4736] cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <span className="text-[7px] text-[#5A5A40] dark:text-[#B6B690] font-semibold bg-[#EBE3C8] dark:bg-[#3D3728] py-0.5 rounded-full">لیوان</span>
              </div>

              <div 
                onClick={() => setActiveTab('finance')}
                className="bg-[#E8ECE0] dark:bg-[#1D2218] hover:bg-[#DDE2D5] dark:hover:bg-[#252A1F] p-3 rounded-2xl border border-[#DDE2D5] dark:border-[#2E3526] text-center transition-all cursor-pointer flex flex-col justify-between h-20"
              >
                <div className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">بودجه</div>
                <div className="text-sm font-extrabold text-[#7C8363] dark:text-[#9ECE9A] font-mono leading-none my-1">
                  {budgetPct}٪
                </div>
                <span className="text-[7px] text-[#7C8363] dark:text-[#9ECE9A] font-semibold bg-[#DDE2D5] dark:bg-[#24291F] py-0.5 rounded-full">مصرف ماه</span>
              </div>
            </div>
          </div>

          {/* 9. کارت انگیزشی */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#D6CFC3] dark:border-[#2D3025] border-dashed text-center h-fit transition-colors">
            <p className="text-xs text-[#3D3D3D] dark:text-[#D6CFC3] leading-relaxed italic font-serif-elegant font-semibold">
              « قدم‌های کوچک و پیوسته در طول زمان، نتایج شگفت‌انگیز و آینده‌ای بزرگ می‌سازند. کنترل روزت رو قبل از اینکه روزت تو رو کنترل کنه به دست بگیر. »
            </p>
          </div>
        </div>

        {/* Column 2: Priorities and Task Checklists */}
        <div className="space-y-6">

          {/* تسک‌های برجسته روز (Daily Highlights) */}
          <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#E5C158]/50 dark:border-[#2D3025] shadow-xs relative overflow-hidden transition-colors">
            {/* Ambient glowing gold gradient for premium styling */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#E5C158]/10 to-transparent rounded-full blur-xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#F9F1D8] dark:bg-[#252219] rounded-xl text-[#D4AF37] border border-[#E5C158]/30">
                  ✨
                </span>
                <div>
                  <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">تسک‌های برجسته امروز</h3>
                  <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">۱ الی ۳ کار حیاتی روز برای تمرکز حداکثری</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-[#D4AF37] bg-[#F9F1D8] dark:bg-[#252219] px-2.5 py-1 rounded-full border border-[#E5C158]/20">
                {dailyHighlights.length} کار طلایی
              </span>
            </div>

            <div className="space-y-2.5">
              {dailyHighlights.length > 0 ? (
                dailyHighlights.map(({ task, goalId, projectId }, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs ${
                      task.completed 
                        ? 'bg-[#E8ECE0]/30 dark:bg-[#1D2218]/30 border-[#DDE2D5] dark:border-[#2E3526]' 
                        : 'bg-white dark:bg-[#1E201B] border-[#E6DFD3] dark:border-[#2D3025] hover:border-[#E5C158] dark:hover:border-[#E5C158]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => {
                          if (projectId && goalId) {
                            onToggleTaskInProject?.(goalId, projectId, task.id);
                          } else {
                            onToggleTask?.(task.id);
                          }
                        }}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          task.completed 
                            ? 'bg-[#7C8363] border-[#7C8363] text-white' 
                            : 'border-[#7C8363] hover:bg-[#E8ECE0]/50 dark:hover:bg-[#20241C]'
                        }`}
                      >
                        {task.completed && <span className="text-[10px] font-black">✓</span>}
                      </button>
                      
                      <span className={`font-bold text-[#2D3025] dark:text-[#E8ECE0] truncate ${task.completed ? 'line-through text-[#8D7F72]/60 dark:text-[#9D978B]/40' : ''}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {projectId && (
                        <span className="text-[8px] text-[#7C8363] dark:text-[#9ECE9A] bg-[#E8ECE0] dark:bg-[#20241A] px-2 py-0.5 rounded-md font-bold">
                          پروژه
                        </span>
                      )}
                      
                      {/* Unpin button */}
                      <button
                        type="button"
                        onClick={() => onToggleDailyHighlight?.(task.id)}
                        className="p-1.5 hover:bg-[#F4E9E4] dark:hover:bg-[#2B201B] text-[#9B6B61] hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="برداشتن از کارهای برجسته"
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-5 px-4 bg-[#F9F6EE]/50 dark:bg-[#151713]/50 rounded-2xl border border-dashed border-[#E6DFD3] dark:border-[#2D3025] space-y-3">
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold leading-relaxed">
                    هنوز تسک برجسته‌ای برای امروز سنجاق نکرده‌اید. انتخاب ۱ الی ۳ کار حیاتی تمرکز شما را چند برابر می‌کند.
                  </p>
                  <button
                    onClick={() => setActiveTab('journal')}
                    className="inline-flex items-center gap-1 text-[9px] font-black text-white bg-[#7C8363] hover:bg-[#5A5A40] px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <span>سنجاق کار حیاتی</span>
                    <span>✨</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. اولویت اصلی امروز - Coral Card */}
          <div className="bg-[#E26645] text-white p-5 rounded-3xl border border-[#C94B2A] shadow-md relative overflow-hidden h-fit">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-6 -translate-y-6"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-black/5 rounded-full translate-x-6 translate-y-6"></div>

            <div className="relative z-10 flex flex-col justify-between h-full gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] text-white/80 font-bold uppercase tracking-wider block">اولویت اصلی امروز</span>
                  <h3 className="text-base font-extrabold font-serif-elegant leading-snug">
                    {primaryPriority.title}
                  </h3>
                </div>
                <span className="text-xl opacity-60 leading-none select-none">•••</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/20">
                <div className="flex items-center gap-1.5 text-xs text-white/90 font-semibold font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{primaryPriority.time}</span>
                </div>

                <span className="bg-white/20 text-white font-bold text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span>{primaryPriority.status}</span>
                </span>

                <div className="flex -space-x-1.5 space-x-reverse items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100&auto=format&fit=crop" 
                    alt="user1" 
                    className="w-5 h-5 rounded-full object-cover border border-white"
                    referrerPolicy="no-referrer"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop" 
                    alt="user2" 
                    className="w-5 h-5 rounded-full object-cover border border-white"
                    referrerPolicy="no-referrer"
                  />
                  <div className="w-5 h-5 rounded-full bg-white/30 text-[8px] text-white font-black flex items-center justify-center border border-white">
                    +۲
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. کارهای مهم امروز */}
          <div className="space-y-2 bg-[#F9F6EE] dark:bg-[#151713] p-4 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] h-fit transition-colors">
            <h3 className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 mb-2 font-serif-elegant">
              <CheckSquare className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
              <span>کارهای مهم امروز</span>
            </h3>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {tasks.length > 0 ? (
                tasks.slice(0, 3).map((task) => (
                  <div 
                    key={task.id}
                    onClick={() => setActiveTab('journal')}
                    className="flex items-center justify-between p-2 bg-[#FDFBF7] dark:bg-[#1B1D16] hover:bg-[#E8ECE0]/20 dark:hover:bg-[#2D3025]/20 rounded-xl border border-[#E6DFD3] dark:border-[#2D3025] transition-all text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        task.completed ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'border-[#7C8363]/50 dark:border-[#7C8363]'
                      }`}>
                        {task.completed && <span className="text-[9px] font-bold">✓</span>}
                      </div>
                      <span className={`font-semibold text-[#3D3D3D] dark:text-[#DDE2D5] leading-tight ${task.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]/50' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[8px] text-[#8D7F72] dark:text-[#9D978B] bg-[#E6DFD3]/40 dark:bg-[#2D3025]/40 px-2 py-0.5 rounded-md font-bold transition-colors">توسعه</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-[#8D7F72] dark:text-[#9D978B]">لیست کارهای امروز خالی است.</div>
              )}
            </div>
          </div>

          {/* 8. هدف فعال */}
          {mainActiveGoal && (
            <div className="space-y-2 h-fit">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 font-serif-elegant">
                  <Target className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                  <span>اهداف کلیدی شما</span>
                </h3>
                <button 
                  onClick={() => setActiveTab('goals')}
                  className="text-[10px] text-[#7C8363] dark:text-[#9ECE9A] hover:text-[#5A5A40] dark:hover:text-[#E8ECE0] font-bold flex items-center cursor-pointer transition-colors"
                >
                  <span>مشاهده همه</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div 
                onClick={() => setActiveTab('goals')}
                className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-4 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] flex items-center justify-between gap-4 cursor-pointer hover:border-[#7C8363] dark:hover:border-[#9ECE9A] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#E8ECE0] dark:bg-[#20241C] text-[#7C8363] dark:text-[#9ECE9A] border border-[#DDE2D5] dark:border-[#2D3025] rounded-2xl transition-colors">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">هدف فعال اصلی</span>
                    <h4 className="font-extrabold text-xs md:text-sm text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">
                      {mainActiveGoal.title}
                    </h4>
                    <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] truncate max-w-[150px] md:max-w-[200px]">{mainActiveGoal.description}</p>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <div className="text-xs font-extrabold text-[#7C8363] dark:text-[#9ECE9A] font-mono">{mainGoalProgress}٪</div>
                  <div className="text-[8px] text-[#8D7F72] dark:text-[#9D978B] font-bold">میزان پیشرفت</div>
                  <div className="w-16 h-1 bg-[#E6DFD3] dark:bg-[#2D3025] rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-[#7C8363] dark:bg-[#9ECE9A] rounded-full" style={{ width: `${mainGoalProgress}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Agenda and Finances */}
        <div className="space-y-6">
          {/* 5. برنامه امروز (Mini-Calendar List) */}
          <div className="space-y-2 h-fit">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 font-serif-elegant">
                <Calendar className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                <span>برنامه امروز شما</span>
              </h3>
              <button 
                onClick={() => setActiveTab('calendar')}
                className="text-[10px] text-[#7C8363] dark:text-[#9ECE9A] hover:text-[#5A5A40] dark:hover:text-[#E8ECE0] font-bold flex items-center transition-colors"
              >
                <span>مشاهده تقویم</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {scheduleItems.slice(0, 3).map((item) => {
                let colorClasses = 'bg-[#F4E9E4] dark:bg-[#2B201D] text-[#9B6B61] dark:text-[#C59B93] border-[#EDDDD7] dark:border-[#3D2F2B]';
                if (item.category === 'green') colorClasses = 'bg-[#E8ECE0] dark:bg-[#1D2218] text-[#7C8363] dark:text-[#9ECE9A] border-[#DDE2D5] dark:border-[#2D3325]';
                if (item.category === 'blue') colorClasses = 'bg-[#E6DFD3] dark:bg-[#1E201B] text-[#3D3D3D] dark:text-[#D6CFC3] border-[#D6CFC3] dark:border-[#2D3025]';
                if (item.category === 'orange') colorClasses = 'bg-[#F9F1D8] dark:bg-[#252219] text-[#9B6B61] dark:text-[#C59B93] border-[#EBE3C8] dark:border-[#3D3728]';

                return (
                  <div 
                    key={item.id}
                    onClick={() => onToggleScheduleItem(item.id)}
                    className={`p-3.5 rounded-2xl border flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01] ${colorClasses} ${
                      item.completed ? 'opacity-40 line-through' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs md:text-sm font-serif-elegant">{item.title}</h4>
                      <p className="text-[10px] opacity-75">{item.desc}</p>
                    </div>
                    <div className="text-left font-black font-mono text-xs">
                      {item.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. وضعیت مالی */}
          <div 
            onClick={() => setActiveTab('finance')} 
            className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] hover:border-[#7C8363] dark:hover:border-[#9ECE9A] transition-colors cursor-pointer space-y-4 h-fit"
            title="ورود به ماژول مالی"
          >
            <div className="flex justify-between items-center border-b border-[#E6DFD3]/40 dark:border-[#2D3025]/40 pb-2">
              <h3 className="text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5 font-serif-elegant">
                <TrendingUp className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                <span>وضعیت مالی ماه</span>
              </h3>
              <span className="text-[9px] text-[#7C8363] dark:text-[#9ECE9A] font-bold">انضباط بودجه</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold">بودجه مصرف‌شدنی:</span>
                <div className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0] font-mono">
                  {monthlyBudget.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-[#8D7F72] dark:text-[#9D978B]">تومان</span>
                </div>
              </div>

              <div className="w-full h-1.5 bg-[#E6DFD3] dark:bg-[#2D3025] rounded-full overflow-hidden mt-1 relative">
                <div 
                  className="h-full bg-black dark:bg-[#9ECE9A] rounded-full transition-all duration-500"
                  style={{ width: `${budgetPct}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] mt-1">
                <span>مصرف شده: {budgetPct}٪</span>
                <span>مانده: {(monthlyBudget - totalExpense).toLocaleString('fa-IR')} تومان</span>
              </div>
            </div>

            {/* Subscriptions info */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E6DFD3]/40 dark:border-[#2D3025]/40">
              <div className="p-3 bg-[#F9F6EE] dark:bg-[#151713] rounded-2xl border border-[#E6DFD3] dark:border-[#2D3025] flex flex-col justify-between transition-colors">
                <span className="text-[8px] text-[#8D7F72] dark:text-[#9D978B] font-bold">اشتراک‌های فعال</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">۴ مورد</span>
                  <div className="flex -space-x-1 space-x-reverse items-center">
                    <div className="w-5 h-5 rounded-full bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] dark:text-[#9ECE9A] border border-[#DDE2D5] dark:border-[#2D3325] flex items-center justify-center shrink-0">
                      <Music className="w-3 h-3" />
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#F4E9E4] dark:bg-[#2B201D] text-[#9B6B61] dark:text-[#C59B93] border border-[#EDDDD7] dark:border-[#3D2F2B] flex items-center justify-center shrink-0">
                      <Film className="w-3 h-3" />
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#F9F1D8] dark:bg-[#252219] text-[#5A5A40] dark:text-[#B6B690] border border-[#EBE3C8] dark:border-[#3D3728] flex items-center justify-center shrink-0">
                      <Zap className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-2xl border border-[#EDDDD7] dark:border-[#3D2F2B] flex flex-col justify-between transition-colors">
                <span className="text-[8px] text-[#8D7F72] dark:text-[#9D978B] font-bold">پرداخت نزدیک</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] font-black text-[#9B6B61] dark:text-[#C59B93] leading-none truncate max-w-[50px] md:max-w-none">اینستاگرام</span>
                  <span className="text-[8px] font-bold bg-[#F4E9E4] dark:bg-[#2B201D] text-[#9B6B61] dark:text-[#C59B93] px-1.5 py-0.5 rounded-md">۲ روز</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
