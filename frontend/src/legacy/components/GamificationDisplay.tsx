import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getGamificationProfile,
  getAllBadges,
  getPointHistory,
  GamificationProfileResponse,
  AllBadgesResponse,
} from '../../app/hambaft-api';
import {
  GamificationProfile,
  UserBadge,
  BadgeDefinition,
  PointTransaction,
  BadgeRarity,
} from '../types';

// ─── Rarity colors & labels ─────────────────────────────────
const RARITY_CONFIG: Record<BadgeRarity, { bg: string; border: string; text: string; label: string; glow: string }> = {
  Common:    { bg: 'bg-gray-100',    border: 'border-gray-300',    text: 'text-gray-700',    label: 'معمولی',    glow: '' },
  Rare:      { bg: 'bg-blue-50',     border: 'border-blue-300',    text: 'text-blue-700',    label: 'کمیاب',     glow: 'shadow-blue-200/50' },
  Epic:      { bg: 'bg-purple-50',   border: 'border-purple-300',  text: 'text-purple-700',  label: 'حماسی',    glow: 'shadow-purple-300/40' },
  Legendary: { bg: 'bg-amber-50',    border: 'border-amber-300',   text: 'text-amber-700',   label: 'افسانه‌ای', glow: 'shadow-amber-300/50 shadow-lg' },
};

const REASON_LABELS: Record<string, string> = {
  task_completed: 'تسک تکمیل شد',
  proof_uploaded: 'اثبات آپلود شد',
  daily_challenge: 'چالش روزانه',
  partner_verification: 'تأیید پارتنر',
  streak_7: 'استریک ۷ روزه',
  streak_30: 'استریک ۳۰ روزه',
  badge_awarded: 'کسب نشان',
  manual_adjustment: 'تنظیم دستی',
};

// ─── Sub-components ─────────────────────────────────────────

function LevelProgressBar({ level, totalPoints, pointsToNext }: { level: number; totalPoints: number; pointsToNext: number }) {
  const prevThreshold = level <= 1 ? 0 : _getThresholdForLevel(level);
  const range = pointsToNext - prevThreshold;
  const progress = range > 0 ? ((totalPoints - prevThreshold) / range) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-black text-[#2D3025]">سطح {level}</span>
        <span className="text-[#8D7F72] font-semibold">{totalPoints} / {pointsToNext} امتیاز</span>
      </div>
      <div className="h-2.5 bg-[#E6DFD3] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-l from-[#4A6741] to-[#7A9E6F] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function _getThresholdForLevel(level: number): number {
  const thresholds = [0, 100, 250, 500, 1000];
  if (level <= thresholds.length) return thresholds[level - 1] || 0;
  let t = thresholds[thresholds.length - 1];
  for (let i = thresholds.length; i < level; i++) t = Math.round(t * 1.5);
  return t;
}

function StreakDisplay({ current, best }: { current: number; best: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-l from-orange-50 to-amber-50 border border-orange-200/60">
      <div className="text-2xl">🔥</div>
      <div className="flex-1 text-right">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-orange-600/70 font-bold">بهترین: {best} روز</span>
          <span className="text-sm font-black text-orange-700">{current} روز استریک</span>
        </div>
        <div className="mt-1 h-1.5 bg-orange-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-orange-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((current / 30) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ stats }: { stats: { tasksCompleted: number; proofsUploaded: number; commentsPosted: number } }) {
  const items = [
    { label: 'تسک‌ها', value: stats.tasksCompleted, icon: '✅' },
    { label: 'اثبات‌ها', value: stats.proofsUploaded, icon: '📸' },
    { label: 'نظرات', value: stats.commentsPosted, icon: '💬' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(s => (
        <div key={s.label} className="p-2.5 rounded-xl bg-white border border-[#E6DFD3] text-center">
          <div className="text-lg">{s.icon}</div>
          <div className="text-sm font-black text-[#2D3025]">{s.value}</div>
          <div className="text-[9px] text-[#8D7F72] font-semibold">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function BadgeCard({ badge, earned }: { badge: BadgeDefinition; earned: boolean }) {
  const rarity = RARITY_CONFIG[badge.rarity as BadgeRarity] || RARITY_CONFIG.Common;

  return (
    <motion.div
      className={`
        relative p-3 rounded-xl border text-center transition-all
        ${earned
          ? `${rarity.bg} ${rarity.border} ${rarity.glow ? 'shadow-md ' + rarity.glow : ''}`
          : 'bg-gray-50 border-gray-200 opacity-50 grayscale'
        }
      `}
      whileHover={earned ? { scale: 1.05 } : {}}
      whileTap={earned ? { scale: 0.95 } : {}}
    >
      <div className="text-3xl mb-1">{badge.icon}</div>
      <div className={`text-[10px] font-black leading-tight ${earned ? rarity.text : 'text-gray-400'}`}>
        {badge.badgeNameFa || badge.badgeName}
      </div>
      {earned && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px]">✓</span>
        </div>
      )}
      {!earned && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 text-[8px]">🔒</span>
        </div>
      )}
      <div className={`text-[8px] mt-0.5 font-semibold ${earned ? 'text-[#8D7F72]' : 'text-gray-400'}`}>
        {rarity.label}
      </div>
    </motion.div>
  );
}

function BadgeGrid({ badges }: { badges: BadgeDefinition[] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {badges.map(b => (
        <BadgeCard key={b.badgeId} badge={b} earned={b.earned} />
      ))}
    </div>
  );
}

function PointsHistory({ transactions }: { transactions: PointTransaction[] }) {
  if (!transactions.length) {
    return (
      <div className="text-center py-6 text-[#8D7F72] text-xs">
        هنوز امتیازی کسب نکرده‌اید
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {transactions.map(t => (
        <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#E6DFD3]/60">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
            t.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {t.points > 0 ? `+${t.points}` : t.points}
          </div>
          <div className="flex-1 text-right">
            <div className="text-[10px] font-bold text-[#2D3025]">
              {t.description || REASON_LABELS[t.reason] || t.reason}
            </div>
            <div className="text-[8px] text-[#8D7F72]">
              {new Date(t.createdAt).toLocaleDateString('fa-IR')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Level-up celebration overlay ────────────────────────────

function LevelUpCelebration({ level, onClose }: { level: number; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-3xl p-8 text-center mx-6 max-w-sm shadow-2xl"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.6, repeat: 2 }}
        >
          🎉
        </motion.div>
        <h2 className="text-xl font-black text-[#2D3025] mb-2">سطح جدید!</h2>
        <p className="text-3xl font-black text-[#4A6741] mb-2">سطح {level}</p>
        <p className="text-xs text-[#8D7F72] mb-4">آفرین! به سطح جدیدی رسیدی!</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-[#2D3025] text-white rounded-xl text-xs font-bold"
        >
          ادامه
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Badge earned celebration ────────────────────────────────

function BadgeEarnedCelebration({ badge, onClose }: { badge: { icon: string; badge_name_fa: string; rarity: string }; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const rarityConf = RARITY_CONFIG[(badge.rarity || 'Common') as BadgeRarity] || RARITY_CONFIG.Common;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`bg-white rounded-3xl p-6 text-center mx-6 max-w-xs shadow-2xl ${rarityConf.glow}`}
        initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <motion.div
          className="text-5xl mb-3"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 0.5, repeat: 3 }}
        >
          {badge.icon || '🏆'}
        </motion.div>
        <h2 className="text-base font-black text-[#2D3025] mb-1">نشان جدید!</h2>
        <p className="text-sm font-bold text-[#4A6741]">{badge.badge_name_fa || badge.badge_name_fa}</p>
        <p className={`text-[10px] font-semibold mt-1 ${rarityConf.text}`}>
          {rarityConf.label}
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────

interface GamificationDisplayProps {
  onClose?: () => void;
  onLevelUp?: (level: number) => void;
  onBadgeEarned?: (badge: any) => void;
}

export default function GamificationDisplay({ onClose, onLevelUp, onBadgeEarned }: GamificationDisplayProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'badges' | 'history'>('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);
  const [celebrationLevel, setCelebrationLevel] = useState<number | null>(null);
  const [celebrationBadge, setCelebrationBadge] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getGamificationProfile();
      const d = res?.data;
      if (d) {
        const mapped: GamificationProfile = {
          totalPoints: d.total_points || 0,
          level: d.level || 1,
          pointsToNextLevel: d.points_to_next_level || 100,
          currentStreakDays: d.current_streak_days || 0,
          bestStreakDays: d.best_streak_days || 0,
          badges: (d.badges || []).map((b: any) => ({
            id: b.id,
            badgeId: b.badge_id,
            badgeName: b.badge_name,
            badgeNameFa: b.badge_name_fa,
            icon: b.icon,
            description: b.description,
            descriptionFa: b.description_fa,
            rarity: b.rarity as BadgeRarity,
            pointsAwarded: b.points_awarded || 0,
            earnedAt: b.earned_at,
          })),
          recentPoints: (d.recent_points || []).map((p: any) => ({
            id: p.id,
            points: p.points,
            reason: p.reason,
            entityType: '',
            entity: '',
            description: p.description,
            createdAt: p.created_at,
          })),
          stats: {
            tasksCompleted: d.stats?.tasks_completed || 0,
            proofsUploaded: d.stats?.proofs_uploaded || 0,
            commentsPosted: d.stats?.comments_posted || 0,
          },
        };
        setProfile(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch gamification profile', e);
    }
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const res = await getAllBadges();
      const d = res?.data;
      if (d) {
        setAllBadges(
          (d.badges || []).map((b: any) => ({
            badgeId: b.badge_id,
            badgeName: b.badge_name,
            badgeNameFa: b.badge_name_fa,
            icon: b.icon,
            description: b.description,
            descriptionFa: b.description_fa,
            criteriaType: b.criteria_type,
            criteriaValue: b.criteria_value,
            pointsAwarded: b.points_awarded || 0,
            rarity: b.rarity as BadgeRarity,
            earned: b.earned,
          }))
        );
        setEarnedCount(d.earned_count || 0);
      }
    } catch (e) {
      console.error('Failed to fetch badges', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchBadges()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchBadges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          className="w-8 h-8 border-3 border-[#4A6741] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-10 text-[#8D7F72] text-xs">
        خطا در بارگذاری پروفایل گیمیفیکیشن
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right max-w-md mx-auto" dir="rtl" id="gamification-root">
      {/* Celebration overlays */}
      <AnimatePresence>
        {celebrationLevel && (
          <LevelUpCelebration level={celebrationLevel} onClose={() => setCelebrationLevel(null)} />
        )}
        {celebrationBadge && (
          <BadgeEarnedCelebration badge={celebrationBadge} onClose={() => setCelebrationBadge(null)} />
        )}
      </AnimatePresence>

      {/* Header: Points & Level */}
      <div className="p-4 rounded-2xl bg-gradient-to-bl from-[#2D3025] to-[#4A5A3F] text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="text-left">
            <div className="text-[10px] text-white/60 font-bold">امتیاز کل</div>
            <motion.div
              className="text-2xl font-black"
              key={profile.totalPoints}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {profile.totalPoints.toLocaleString('fa-IR')}
            </motion.div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <span className="text-2xl font-black">{profile.level}</span>
          </div>
        </div>
        <LevelProgressBar
          level={profile.level}
          totalPoints={profile.totalPoints}
          pointsToNext={profile.pointsToNextLevel}
        />
      </div>

      {/* Streak */}
      <StreakDisplay current={profile.currentStreakDays} best={profile.bestStreakDays} />

      {/* Stats */}
      <StatsGrid stats={profile.stats} />

      {/* Tab Switcher */}
      <div className="flex bg-[#F9F6EE] p-1 rounded-2xl border border-[#E6DFD3] gap-1">
        {[
          { id: 'overview' as const, label: 'خلاصه', icon: '⭐' },
          { id: 'badges' as const, label: 'نشان‌ها', icon: '🏆' },
          { id: 'history' as const, label: 'تاریخچه', icon: '📋' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === tab.id
                ? 'bg-[#2D3025] text-white shadow-sm'
                : 'text-[#8D7F72] hover:text-[#2D3025]'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Recent Badges */}
            {profile.badges.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-[#2D3025] mb-2">آخرین نشان‌ها</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {profile.badges.slice(0, 6).map(b => (
                    <div key={b.id} className="flex-shrink-0 w-16 p-2 rounded-xl bg-white border border-[#E6DFD3] text-center">
                      <div className="text-xl">{b.icon}</div>
                      <div className="text-[8px] font-bold text-[#2D3025] truncate">{b.badgeNameFa || b.badgeName}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Points */}
            {profile.recentPoints.length > 0 && (
              <div>
                <h3 className="text-xs font-black text-[#2D3025] mb-2">آخرین امتیازها</h3>
                <PointsHistory transactions={profile.recentPoints.slice(0, 5)} />
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'badges' && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#8D7F72] font-semibold">{earnedCount} از {allBadges.length} نشان</span>
              <h3 className="text-xs font-black text-[#2D3025]">نشان‌ها</h3>
            </div>
            <BadgeGrid badges={allBadges} />
          </motion.div>
        )}

        {activeSubTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h3 className="text-xs font-black text-[#2D3025] mb-2">تاریخچه امتیازها</h3>
            <PointsHistory transactions={profile.recentPoints} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
