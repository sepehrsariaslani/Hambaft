import React, { useState } from 'react';
import { Goal, GoalCategory, Milestone } from '../types';
import { GOAL_CATEGORY_LABELS } from '../initialData';
import PersianDatePicker from './PersianDatePicker';
import { 
  Target, 
  PlusCircle, 
  Calendar, 
  CheckSquare, 
  Trash2, 
  AlertCircle,
  Flag,
  Circle,
  CheckCircle,
  Plus,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalSectionProps {
  goals: Goal[];
  onAddGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'completed'>) => void;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestone: (goalId: string, title: string) => void;
  onDeleteGoal: (id: string) => void;
  onToggleGoalCompletion: (id: string) => void;
}

// Map custom warm colors for categories
const CATEGORY_COLORS: Record<GoalCategory, string> = {
  financial: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  health: 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363]',
  career: 'bg-[#F4E9E4] border-[#EDDDD7] text-[#9B6B61]',
  learning: 'bg-[#E6DFD3] border-[#D6CFC3] text-[#8D7F72]',
  personal: 'bg-[#F9F1D8] border-[#EBE3C8] text-[#5A5A40]',
  other: 'bg-[#FDFBF7] border-[#D6CFC3] text-[#3D3D3D]'
};

export default function GoalSection({ 
  goals, 
  onAddGoal, 
  onToggleMilestone, 
  onAddMilestone,
  onDeleteGoal,
  onToggleGoalCompletion
}: GoalSectionProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('personal');
  const [targetDate, setTargetDate] = useState('2026-12-31');
  
  // Dynamic milestones input during creation
  const [milestonesInput, setMilestonesInput] = useState<string[]>(['']);
  
  // Selected goal to show details/add milestones dynamically
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  const handleAddMilestoneField = () => {
    setMilestonesInput([...milestonesInput, '']);
  };

  const handleRemoveMilestoneField = (index: number) => {
    if (milestonesInput.length === 1) return;
    setMilestonesInput(milestonesInput.filter((_, i) => i !== index));
  };

  const handleMilestoneValueChange = (index: number, val: string) => {
    const updated = [...milestonesInput];
    updated[index] = val;
    setMilestonesInput(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Filter out empty milestones
    const validMilestones = milestonesInput
      .filter(m => m.trim() !== '')
      .map((m, idx) => ({
        id: `m-temp-${Date.now()}-${idx}`,
        title: m.trim(),
        completed: false
      }));

    onAddGoal({
      title: title.trim(),
      description: description.trim(),
      category,
      targetDate,
      milestones: validMilestones
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setCategory('personal');
    setTargetDate('2026-12-31');
    setMilestonesInput(['']);
  };

  const handleAddNewMilestoneDirect = (goalId: string) => {
    if (!newMilestoneText.trim()) return;
    onAddMilestone(goalId, newMilestoneText.trim());
    setNewMilestoneText('');
  };

  // Calculations for overall stats
  const activeGoalsCount = goals.filter(g => !g.completed).length;
  const completedGoalsCount = goals.filter(g => g.completed).length;
  const totalMilestones = goals.reduce((sum, g) => sum + g.milestones.length, 0);
  const completedMilestones = goals.reduce((sum, g) => sum + g.milestones.filter(m => m.completed).length, 0);
  const completionRatio = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Goal Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active Goals Card */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#E6DFD3] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#8D7F72] font-semibold">اهداف فعال و جاری</span>
            <h3 className="text-2xl font-bold text-[#2D3025] font-serif-elegant">
              {activeGoalsCount} <span className="text-xs font-normal text-[#8D7F72]">هدف معلق</span>
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[#E8ECE0] text-[#7C8363] border border-[#DDE2D5]">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* Completed Goals Card */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#DDE2D5] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#8D7F72] font-semibold">اهداف کاملاً محقق شده</span>
            <h3 className="text-2xl font-bold text-[#7C8363] font-serif-elegant">
              {completedGoalsCount} <span className="text-xs font-normal text-[#8D7F72]">هدف موفق</span>
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[#E8ECE0] text-[#7C8363] border border-[#DDE2D5]">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Milestones Ratio Card */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#EDDDD7] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-[#8D7F72] font-semibold">میزان تحقق خرده‌گام‌ها</span>
            <h3 className="text-2xl font-bold text-[#9B6B61] font-serif-elegant">
              {completionRatio}% <span className="text-xs font-normal text-[#8D7F72]">({completedMilestones} از {totalMilestones})</span>
            </h3>
          </div>
          <div className="p-4 rounded-xl bg-[#F4E9E4] text-[#9B6B61] border border-[#EDDDD7]">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Grid: Goals & Add Goal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Left: Add New Goal */}
        <div className="bg-[#FDFBF7] p-6 rounded-2xl shadow-sm border border-[#E6DFD3] h-fit">
          <h3 className="text-sm font-bold text-[#2D3025] mb-4 flex items-center gap-2 font-serif-elegant">
            <PlusCircle className="w-5 h-5 text-[#7C8363]" />
            <span>تعریف هدف جدید</span>
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8D7F72]">عنوان هدف چيست؟</label>
              <input
                type="text"
                placeholder="مثال: خرید لپ‌تاپ مدل جدید"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-bold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8D7F72]">دسته‌بندی هدف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] bg-[#FDFBF7] focus:outline-none focus:border-[#7C8363]"
              >
                <option value="financial">مالی و پس‌انداز</option>
                <option value="health">سلامت، تغذیه و ورزش</option>
                <option value="career">شغل، کار و درآمد</option>
                <option value="learning">یادگیری مهارت و علم</option>
                <option value="personal">توسعه فردی و خودآگاهی</option>
                <option value="other">سایر اهداف</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8D7F72]">تاریخ سررسید (هدف‌گذاری)</label>
              <PersianDatePicker
                value={targetDate}
                onChange={setTargetDate}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#8D7F72]">توضیحات کلی هدف</label>
              <textarea
                placeholder="توضیح دهید چرا این هدف برایتان مهم است و چگونه به آن می‌رسید..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#D6CFC3] text-xs font-semibold text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] h-20 resize-none bg-[#FDFBF7]"
              />
            </div>

            {/* Milestones dynamic creation list */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-[#8D7F72]">خرده‌گام‌های فرعی (Milestones)</label>
                <button
                  type="button"
                  onClick={handleAddMilestoneField}
                  className="text-[10px] text-[#7C8363] hover:text-[#5A5A40] font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>افزودن گام فرعی</span>
                </button>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {milestonesInput.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={`گام فرعی ${idx + 1}`}
                      value={val}
                      onChange={(e) => handleMilestoneValueChange(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#D6CFC3] text-xs text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
                    />
                    {milestonesInput.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestoneField(idx)}
                        className="text-[#8D7F72] hover:text-[#9B6B61] p-1 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ایجاد و ثبت هدف</span>
            </button>

          </form>
        </div>

        {/* Goals List Display */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-[#2D3025] flex items-center gap-2 mb-1 font-serif-elegant">
            <Target className="w-5 h-5 text-[#7C8363]" />
            <span>اهداف تعریف‌شده شما</span>
          </h3>

          {goals.length > 0 ? (
            goals.map((goal) => {
              const categoryDetails = GOAL_CATEGORY_LABELS[goal.category] || GOAL_CATEGORY_LABELS.other;
              const colStyle = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.other;
              const totalMilestonesCount = goal.milestones.length;
              const completedMilestonesCount = goal.milestones.filter(m => m.completed).length;
              const pct = totalMilestonesCount > 0 
                ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) 
                : (goal.completed ? 100 : 0);
              const isActive = activeGoalId === goal.id;

              return (
                <div 
                  key={goal.id} 
                  className={`bg-[#FDFBF7] rounded-2xl shadow-sm border transition-all ${
                    goal.completed 
                      ? 'border-[#DDE2D5] bg-[#E8ECE0]/20' 
                      : 'border-[#E6DFD3] hover:border-[#D6CFC3]'
                  }`}
                >
                  {/* Goal Header */}
                  <div className="p-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colStyle}`}>
                          {categoryDetails.label}
                        </span>
                        {goal.completed && (
                          <span className="bg-[#E8ECE0] text-[#7C8363] px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#DDE2D5]">
                            کامل شد 🎉
                          </span>
                        )}
                        <span className="text-[10px] text-[#8D7F72] font-semibold flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-[#7C8363]" />
                          <span>سررسید: {goal.targetDate}</span>
                        </span>
                      </div>
                      
                      <h4 className={`text-base font-bold font-serif-elegant ${goal.completed ? 'line-through text-[#8D7F72]' : 'text-[#2D3025]'}`}>
                        {goal.title}
                      </h4>
                      <p className="text-xs text-[#8D7F72] leading-relaxed max-w-xl">{goal.description}</p>
                    </div>

                    {/* Goal Actions & Percentage */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E6DFD3]/40">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold text-[#7C8363] font-mono">{pct}%</div>
                        <div className="text-[10px] text-[#8D7F72] font-semibold">{completedMilestonesCount} از {totalMilestonesCount} گام</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleGoalCompletion(goal.id)}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                            goal.completed
                              ? 'bg-[#FDFBF7] border-[#D6CFC3] text-[#3D3D3D] hover:bg-[#E6DFD3]'
                              : 'bg-[#E8ECE0] border-[#DDE2D5] text-[#7C8363] hover:bg-[#7C8363] hover:text-white'
                          }`}
                        >
                          {goal.completed ? 'فعال‌سازی مجدد' : 'اتمام موفقیت‌آمیز'}
                        </button>
                        
                        <button
                          onClick={() => onDeleteGoal(goal.id)}
                          className="text-[#8D7F72] hover:text-[#9B6B61] p-2 rounded-xl hover:bg-[#F4E9E4] transition-colors inline-flex cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Goal Progress Bar */}
                  <div className="w-full h-1 bg-[#E6DFD3] overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${goal.completed ? 'bg-[#7C8363]' : 'bg-[#9B6B61]'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  {/* Milestones Details Drawer (Interactive toggle) */}
                  <div className="bg-[#E6DFD3]/20 border-t border-[#E6DFD3]/40 rounded-b-2xl">
                    <div className="p-4 flex justify-between items-center">
                      <button
                        onClick={() => setActiveGoalId(isActive ? null : goal.id)}
                        className="text-xs font-bold text-[#3D3D3D] hover:text-[#7C8363] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{isActive ? 'پنهان کردن گام‌ها' : 'مشاهده و علامت‌گذاری گام‌های پیشرفت'}</span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-1 space-y-3.5">
                            {/* Milestone checklist */}
                            <div className="space-y-2 border-b border-[#E6DFD3]/40 pb-4">
                              {goal.milestones.length > 0 ? (
                                goal.milestones.map((milestone) => (
                                  <div 
                                    key={milestone.id}
                                    onClick={() => onToggleMilestone(goal.id, milestone.id)}
                                    className="flex items-center gap-2.5 p-2 bg-[#FDFBF7] hover:bg-[#E8ECE0]/30 border border-[#E6DFD3] rounded-xl cursor-pointer transition-all"
                                  >
                                    {milestone.completed ? (
                                      <CheckSquare className="w-4 h-4 text-[#7C8363] fill-[#E8ECE0]" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-[#8D7F72]" />
                                    )}
                                    <span className={`text-xs font-medium ${milestone.completed ? 'line-through text-[#8D7F72]' : 'text-[#3D3D3D]'}`}>
                                      {milestone.title}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-2 text-xs text-[#8D7F72] flex items-center justify-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>هیچ گام فرعی هنوز ثبت نشده است.</span>
                                </div>
                              )}
                            </div>

                            {/* Add milestone to existing goal */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="افزودن گام جدید به این هدف..."
                                value={newMilestoneText}
                                onChange={(e) => setNewMilestoneText(e.target.value)}
                                className="flex-1 px-4 py-2 rounded-xl border border-[#D6CFC3] text-xs text-[#3D3D3D] focus:outline-none focus:border-[#7C8363] bg-[#FDFBF7]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddNewMilestoneDirect(goal.id);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddNewMilestoneDirect(goal.id)}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#7C8363] hover:bg-[#5A5A40] rounded-xl shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>افزودن</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="bg-[#FDFBF7] p-12 text-center text-[#8D7F72] border border-dashed border-[#D6CFC3] rounded-2xl font-semibold">
              هیچ هدفی تعریف نکرده‌اید. با استفاده از پنل سمت راست، اهداف بزرگ خود را مکتوب کنید!
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
