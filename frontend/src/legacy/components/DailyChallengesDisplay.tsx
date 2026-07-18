import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getDailyChallenges, getChallengeHistory, DailyChallenge as ApiChallenge } from '../../app/hambaft-api';
import { DailyChallenge } from '../types';

// ─── Difficulty config ──────────────────────────────────────
const DIFFICULTY_CONFIG = {
  easy:   { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700',  bar: 'from-emerald-400 to-emerald-500', label: 'آسان',   points: 20 },
  medium: { bg: 'bg-amber-50',    border: 'border-amber-200',    text: 'text-amber-700',    bar: 'from-amber-400 to-amber-500',    label: 'متوسط', points: 35 },
  hard:   { bg: 'bg-red-50',      border: 'border-red-200',      text: 'text-red-700',      bar: 'from-red-400 to-red-500',        label: 'سخت',   points: 50 },
};

const CATEGORY_ICONS: Record<string, string> = {
  productivity: '⚡',
  health: '💚',
  mindfulness: '🧘',
  social: '🤝',
  creativity: '🎨',
  finance: '💰',
};

// ─── Challenge Card ─────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: DailyChallenge }) {
  const diff = DIFFICULTY_CONFIG[challenge.difficulty] || DIFFICULTY_CONFIG.easy;
  const isCompleted = challenge.status === 'completed';
  const isActive = challenge.status === 'active';
  const progressPct = challenge.targetCount > 0
    ? Math.min((challenge.progress / challenge.targetCount) * 100, 100)
    : 0;

  return (
    <motion.div
      className={`
        relative p-3.5 rounded-2xl border transition-all
        ${isCompleted
          ? 'bg-[#E8ECE0] border-[#7C8363]/30'
          : `${diff.bg} ${diff.border}`
        }
      `}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Completed overlay checkmark */}
      {isCompleted && (
        <motion.div
          className="absolute top-2 left-2 w-6 h-6 bg-[#4A6741] rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <span className="text-white text-xs font-black">✓</span>
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`text-2xl ${isCompleted ? 'opacity-40' : ''}`}>
          {challenge.icon || CATEGORY_ICONS[challenge.category] || '🎯'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-xs font-black ${isCompleted ? 'text-[#8D7F72] line-through' : 'text-[#2D3025]'}`}>
              {challenge.titleFa || challenge.title}
            </h4>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${diff.bg} ${diff.text}`}>
              {diff.label}
            </span>
          </div>

          <p className={`text-[10px] mb-2 ${isCompleted ? 'text-[#8D7F72]/60' : 'text-[#8D7F72]'}`}>
            {challenge.descriptionFa || challenge.description}
          </p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className={`font-bold ${isCompleted ? 'text-[#4A6741]' : diff.text}`}>
                {isCompleted ? 'تکمیل شد! 🎉' : `${challenge.progress} از ${challenge.targetCount}`}
              </span>
              <span className="text-[#8D7F72] font-semibold">+{challenge.pointsReward} ⭐</span>
            </div>
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-l ${isCompleted ? 'from-[#4A6741] to-[#7A9E6F]' : diff.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


// ─── History Item ───────────────────────────────────────────

function HistoryItem({ item }: { item: any }) {
  const diff = DIFFICULTY_CONFIG[item.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.easy;
  const isCompleted = item.status === 'تکمیل‌شده';

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${isCompleted ? 'bg-[#E8ECE0]/40 border-[#7C8363]/20' : 'bg-white border-[#E6DFD3]/60'}`}>
      <div className="text-lg">{item.icon || '🎯'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-[#2D3025] truncate">{item.title_fa || item.title}</div>
        <div className="flex items-center gap-2 text-[8px] text-[#8D7F72]">
          <span>{item.challenge_date}</span>
          <span className={`${diff.text} font-bold`}>{diff.label}</span>
          {isCompleted && <span className="text-[#4A6741] font-bold">+{item.points_reward} ⭐</span>}
        </div>
      </div>
      <div className={`text-xs font-black ${isCompleted ? 'text-[#4A6741]' : 'text-[#8D7F72]'}`}>
        {isCompleted ? '✓' : '✗'}
      </div>
    </div>
  );
}


// ─── Main Component ─────────────────────────────────────────

export default function DailyChallengesDisplay() {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [challengeDate, setChallengeDate] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await getDailyChallenges();
      const d = res?.data;
      if (d) {
        setChallengeDate(d.date || '');
        setChallenges(
          (d.challenges || []).map((c: ApiChallenge) => ({
            id: c.id,
            templateId: c.template_id,
            title: c.title,
            titleFa: c.title_fa,
            description: c.description,
            descriptionFa: c.description_fa,
            icon: c.icon,
            challengeType: c.challenge_type,
            difficulty: c.difficulty,
            category: c.category,
            status: c.status === 'تکمیل‌شده' ? 'completed' : c.status === 'منقضی‌شده' ? 'expired' : 'active',
            progress: c.progress,
            targetCount: c.target_count,
            pointsReward: c.points_reward,
            completedAt: c.completed_at,
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch daily challenges', e);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await getChallengeHistory(30, 0);
      const d = res?.data;
      if (d) setHistory(d.challenges || []);
    } catch (e) {
      console.error('Failed to fetch challenge history', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchChallenges(), fetchHistory()]).finally(() => setLoading(false));
  }, [fetchChallenges, fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div
          className="w-6 h-6 border-2 border-[#4A6741] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  const completedCount = challenges.filter(c => c.status === 'completed').length;
  const totalPoints = challenges.reduce((sum, c) => sum + c.pointsReward, 0);
  const earnedPoints = challenges.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.pointsReward, 0);

  return (
    <div className="space-y-4 text-right max-w-md mx-auto" dir="rtl" id="daily-challenges-root">
      {/* Header card */}
      <div className="p-4 rounded-2xl bg-gradient-to-bl from-[#4A6741] to-[#2D4025] text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="text-left">
            <div className="text-[10px] text-white/60 font-bold">چالش‌های امروز</div>
            <div className="text-lg font-black">
              {completedCount}/{challenges.length} تکمیل
            </div>
          </div>
          <div className="text-3xl">🎯</div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/70">{earnedPoints} از {totalPoints} امتیاز کسب‌شده</span>
          <span className="text-white/50">{challengeDate}</span>
        </div>
        {/* Overall progress */}
        <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${challenges.length > 0 ? (completedCount / challenges.length) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-[#F9F6EE] p-1 rounded-2xl border border-[#E6DFD3] gap-1">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'today'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#4A6741]'
          }`}
        >
          🎯 چالش‌های امروز
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'history'
              ? 'bg-[#2D3025] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#2D3025]'
          }`}
        >
          📋 تاریخچه
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'today' ? (
          <motion.div
            key="today"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2.5"
          >
            {challenges.length === 0 ? (
              <div className="text-center py-10 text-[#8D7F72] text-xs">
                چالشی برای امروز یافت نشد. لطفاً الگوهای چالش را مقداردهی کنید.
              </div>
            ) : (
              challenges.map(ch => (
                <ChallengeCard key={ch.id} challenge={ch} />
              ))
            )}

            {/* All completed celebration */}
            {challenges.length > 0 && completedCount === challenges.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-gradient-to-l from-[#4A6741] to-[#7A9E6F] text-white text-center"
              >
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm font-black">آفرین! همه چالش‌ها تکمیل شد!</div>
                <div className="text-[10px] text-white/70 mt-1">+{totalPoints} امتیاز کسب کردی</div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-1.5"
          >
            {history.length === 0 ? (
              <div className="text-center py-10 text-[#8D7F72] text-xs">
                هنوز تاریخچه‌ای وجود ندارد
              </div>
            ) : (
              history.map((item: any) => (
                <HistoryItem key={item.id} item={item} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
