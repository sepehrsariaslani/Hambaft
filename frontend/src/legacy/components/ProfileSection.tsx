import React, { useState, lazy, Suspense } from 'react';
import { LifeData, UserProfile } from '../types';
import { 
  User, 
  Sparkles, 
  Edit3, 
  Flame, 
  Target, 
  CheckCircle2, 
  Wallet, 
  Droplet, 
  Moon, 
  Compass, 
  Upload, 
  Download,
  Check,
  MessageSquareCode,
  Trophy,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AiCoachSection from './AiCoachSection';

const GamificationDisplay = lazy(() => import('./GamificationDisplay'));
const NotificationSettingsDisplay = lazy(() => import('./NotificationSettingsDisplay'));

interface ProfileSectionProps {
  lifeData: LifeData;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onImportData: (data: LifeData) => void;
}

export default function ProfileSection({ lifeData, onUpdateProfile, onImportData }: ProfileSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'gamification' | 'notif' | 'coach'>('info');
  const [isEditing, setIsEditing] = useState(false);

  // Default fallback profile values
  const defaultProfile: UserProfile = {
    name: 'پارس سلیمانی',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
    motto: 'زندگی همبافته‌ای از توازن، آرامش و تلاش هوشمندانه است.',
    workField: 'طراح ارشد محصول',
    dailyWaterGoal: 8,
    sleepGoalHours: 7.5
  };

  const profile = lifeData.profile || defaultProfile;

  // Local form states
  const [editedName, setEditedName] = useState(profile.name);
  const [editedMotto, setEditedMotto] = useState(profile.motto);
  const [editedWork, setEditedWork] = useState(profile.workField || '');
  const [editedAvatar, setEditedAvatar] = useState(profile.avatarUrl);
  const [editedWater, setEditedWater] = useState(profile.dailyWaterGoal || 8);
  const [editedSleep, setEditedSleep] = useState(profile.sleepGoalHours || 7.5);

  const [isSaveSuccess, setIsSaveSuccess] = useState(false);

  // Pre-calculated dynamic statistics
  const completedTasksCount = lifeData.tasks.filter(t => t.completed).length;
  const totalTasksCount = lifeData.tasks.length;
  const activeGoalsCount = lifeData.goals.filter(g => !g.completed).length;
  const habitsCount = lifeData.habits.length;
  
  // Total money across all bank accounts
  const totalBalance = lifeData.bankAccounts?.reduce((sum, b) => sum + b.balance, 0) || 0;
  const formattedBalance = new Intl.NumberFormat('fa-IR').format(totalBalance);

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: editedName.trim() || defaultProfile.name,
      avatarUrl: editedAvatar.trim() || defaultProfile.avatarUrl,
      motto: editedMotto.trim() || defaultProfile.motto,
      workField: editedWork.trim() || defaultProfile.workField,
      dailyWaterGoal: Number(editedWater) || 8,
      sleepGoalHours: Number(editedSleep) || 7.5
    });
    setIsEditing(false);
    setIsSaveSuccess(true);
    setTimeout(() => setIsSaveSuccess(false), 2000);
  };

  // Avatar presets for quick styling
  const AVATAR_PRESETS = [
    { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop', label: 'بانو (طراحی)' },
    { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop', label: 'آقا (کلاسیک)' },
    { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250&auto=format&fit=crop', label: 'بانو (مدرن)' },
    { url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop', label: 'آقا (رسمی)' }
  ];

  return (
    <div className="space-y-6 text-right max-w-md mx-auto" dir="rtl" id="dynamic-profile-section-root">
      
      {/* Tab Switcher: Info vs Gamification vs AI Coach */}
      <div className="flex bg-[#F9F6EE] p-1 rounded-2xl border border-[#E6DFD3] gap-1">
        <button
          onClick={() => setActiveSubTab('info')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeSubTab === 'info'
              ? 'bg-[#2D3025] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#2D3025]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>پروفایل</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gamification')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeSubTab === 'gamification'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#4A6741]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>امتیاز و نشان</span>
        </button>

        <button
          onClick={() => setActiveSubTab('coach')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeSubTab === 'coach'
              ? 'bg-[#E26645] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#E26645]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>مربی توازن</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notif')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeSubTab === 'notif'
              ? 'bg-[#7C8363] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#7C8363]'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>نوتیف</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'info' ? (
          <motion.div
            key="profile-info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Save Success Alert */}
            <AnimatePresence>
              {isSaveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-black text-center flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تغییرات پروفایل با موفقیت ذخیره شد!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Profile main card */}
            <div className="bg-white rounded-3xl border border-[#EBE3C8] shadow-xs p-6 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-l from-[#7C8363] via-[#E26645] to-[#8D7F72]" />

              {!isEditing ? (
                // View Mode
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-4">
                    <img 
                      src={profile.avatarUrl} 
                      alt={profile.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#E6DFD3] shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-[#2D3025]">{profile.name}</h2>
                        <span className="text-[9px] font-black bg-[#E8ECE0] text-[#7C8363] px-1.5 py-0.5 rounded-md">
                          فعال
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8D7F72] font-extrabold">{profile.workField || 'کاربر همبافت'}</p>
                    </div>
                  </div>

                  <blockquote className="bg-[#F9F6EE] border-r-4 border-[#7C8363] p-3 rounded-l-2xl text-xs text-[#5A5A40] italic leading-relaxed">
                    « {profile.motto} »
                  </blockquote>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-[#F9F6EE] hover:bg-[#E6DFD3]/40 border border-[#D6CFC3] text-[10px] font-extrabold text-[#3D3D3D] rounded-xl transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ویرایش شناسنامه کاربری</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Edit Form Mode
                <form onSubmit={handleSaveChanges} className="space-y-4 pt-2">
                  <h3 className="text-xs font-black text-[#2D3025] border-b border-[#E6DFD3] pb-2">ویرایش اطلاعات شناسنامه</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8D7F72]">نام و نام خانوادگی</label>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] font-black"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8D7F72]">تخصص یا زمینه فعالیت</label>
                    <input
                      type="text"
                      value={editedWork}
                      onChange={(e) => setEditedWork(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-[#8D7F72]">شعار زندگی یا متن دلخواه</label>
                    <textarea
                      value={editedMotto}
                      onChange={(e) => setEditedMotto(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] h-16 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Avatar selector preset */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#8D7F72] block">انتخاب آواتار تصویر کاربری سریع</label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_PRESETS.map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setEditedAvatar(preset.url)}
                          className={`p-1 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                            editedAvatar === preset.url ? 'border-[#E26645] bg-[#E26645]/5 scale-105' : 'border-[#E6DFD3] bg-[#F9F6EE]'
                          }`}
                        >
                          <img src={preset.url} alt={preset.label} className="w-8 h-8 rounded-full mx-auto object-cover" />
                          <span className="text-[8px] font-bold block mt-1 text-center truncate">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Target Goals fields */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5 text-blue-500" />
                        <span>هدف آب روزانه (لیوان)</span>
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="20"
                        value={editedWater}
                        onChange={(e) => setEditedWater(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-[#8D7F72] flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>هدف خواب (ساعت)</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="4"
                        max="14"
                        value={editedSleep}
                        onChange={(e) => setEditedSleep(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 border border-[#D6CFC3] text-xs font-bold text-[#8D7F72] rounded-xl hover:bg-[#E6DFD3]/20 cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-1.5 bg-[#7C8363] text-white text-xs font-bold rounded-xl hover:bg-[#5A5A40] cursor-pointer"
                    >
                      ذخیره اطلاعات
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Daily balance & Life balance details */}
            <div className="bg-[#FDFBF7] p-5 rounded-3xl border border-[#E6DFD3] space-y-4">
              <h3 className="text-xs font-black text-[#2D3025] flex items-center gap-1.5 border-b border-[#E6DFD3] pb-2">
                <Compass className="w-4 h-4 text-[#7C8363]" />
                <span>متریک‌ها و وضعیت کلی توازن زندگی</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                
                {/* Stats 1 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#EBE3C8] text-right space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#8D7F72]">انضباط و کارها</span>
                    <CheckCircle2 className="w-4 h-4 text-[#7C8363]" />
                  </div>
                  <h4 className="text-sm font-black text-[#2D3025]">{completedTasksCount} کار انجام شده</h4>
                  <p className="text-[8px] text-[#8D7F72] font-semibold">از مجموع {totalTasksCount} کار تعریف شده</p>
                </div>

                {/* Stats 2 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#EBE3C8] text-right space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#8D7F72]">عادت‌های فعال</span>
                    <Flame className="w-4 h-4 text-[#9B6B61]" />
                  </div>
                  <h4 className="text-sm font-black text-[#2D3025]">{habitsCount} عادت منظم</h4>
                  <p className="text-[8px] text-[#8D7F72] font-semibold">برای ایجاد استمرار روزانه</p>
                </div>

                {/* Stats 3 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#EBE3C8] text-right space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#8D7F72]">اهداف کلان زندگی</span>
                    <Target className="w-4 h-4 text-[#E26645]" />
                  </div>
                  <h4 className="text-sm font-black text-[#2D3025]">{activeGoalsCount} هدف بلندمدت</h4>
                  <p className="text-[8px] text-[#8D7F72] font-semibold">توسعه، سرمایه و سلامت</p>
                </div>

                {/* Stats 4 */}
                <div className="bg-white p-3.5 rounded-2xl border border-[#EBE3C8] text-right space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-[#8D7F72]">سرمایه و امور مالی</span>
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="text-xs font-black text-[#2D3025] truncate">{formattedBalance} ریال</h4>
                  <p className="text-[8px] text-[#8D7F72] font-semibold">کل سپرده حساب‌های بانکی</p>
                </div>

              </div>

              {/* Dynamic Health target card */}
              <div className="bg-[#E8ECE0]/50 p-4 rounded-2xl border border-[#DDE2D5] space-y-2">
                <h4 className="text-[10px] font-black text-[#7C8363]">آستانه‌های سلامتی و زیستی شخصی شما</h4>
                <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-[#5A5A40]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#7C8363]" />
                    <span>آب روزانه: {profile.dailyWaterGoal || 8} لیوان</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#E26645]" />
                    <span>خواب بهینه: {profile.sleepGoalHours || 7.5} ساعت</span>
                  </div>
                </div>
              </div>

              {/* Consultation trigger inside profile */}
              <button
                onClick={() => setActiveSubTab('coach')}
                className="w-full py-2.5 bg-gradient-to-l from-[#E26645] to-[#C94B2A] text-white text-[11px] font-black rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>شروع گفتگوی مربیگری با هوش مصنوعی</span>
              </button>
            </div>
          </motion.div>
        ) : activeSubTab === 'gamification' ? (
          <motion.div
            key="gamification"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <GamificationDisplay />
            </Suspense>
          </motion.div>
        ) : activeSubTab === 'notif' ? (
          <motion.div
            key="notif-settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-[#7C8363] border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <NotificationSettingsDisplay />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="profile-coach"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Embed the beautiful AI Coach directly inside */}
            <AiCoachSection 
              lifeData={lifeData}
              onImportData={onImportData}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
