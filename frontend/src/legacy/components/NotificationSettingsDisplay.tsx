import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { getNotificationSettings, updateNotificationSettings } from '../../app/hambaft-api';
import { NotificationSettings } from '../types';

const TOGGLE_ITEMS: { key: keyof NotificationSettings; label: string; icon: string }[] = [
  { key: 'pushEnabled', label: 'پوش نوتیفیکیشن', icon: '🔔' },
  { key: 'levelUp', label: 'ارتقای سطح', icon: '🎉' },
  { key: 'badgeEarned', label: 'کسب نشان', icon: '🏆' },
  { key: 'challengeCompleted', label: 'تکمیل چالش', icon: '🎯' },
  { key: 'partnerInvite', label: 'دعوت پارتنر', icon: '🤝' },
  { key: 'partnerAccepted', label: 'پذیرش پارتنر', icon: '✅' },
  { key: 'reactionReceived', label: 'واکنش جدید', icon: '❤️' },
  { key: 'nudgeReceived', label: 'ناج تشویقی', icon: '💪' },
  { key: 'dailyReminder', label: 'یادآوری روزانه', icon: '📋' },
  { key: 'streakMilestone', label: 'استریک ویژه', icon: '🔥' },
  { key: 'goalDeadline', label: 'مهلت هدف', icon: '⏳' },
  { key: 'system', label: 'اعلان سیستمی', icon: '⚙️' },
];

export default function NotificationSettingsDisplay() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await getNotificationSettings();
      const d = res?.data;
      if (d) {
        setSettings({
          pushEnabled: !!d.push_enabled,
          levelUp: !!d.level_up,
          badgeEarned: !!d.badge_earned,
          challengeCompleted: !!d.challenge_completed,
          partnerInvite: !!d.partner_invite,
          partnerAccepted: !!d.partner_accepted,
          reactionReceived: !!d.reaction_received,
          nudgeReceived: !!d.nudge_received,
          dailyReminder: !!d.daily_reminder,
          streakMilestone: !!d.streak_milestone,
          goalDeadline: !!d.goal_deadline,
          system: !!d.system,
        });
      }
    } catch (e) {
      console.error('Failed to fetch notification settings', e);
    }
  }, []);

  useEffect(() => { fetchSettings().finally(() => setLoading(false)); }, [fetchSettings]);

  const handleToggle = async (key: keyof NotificationSettings) => {
    if (!settings || saving) return;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setSaving(true);
    try {
      await updateNotificationSettings({
        push_enabled: newSettings.pushEnabled ? 1 : 0,
        level_up: newSettings.levelUp ? 1 : 0,
        badge_earned: newSettings.badgeEarned ? 1 : 0,
        challenge_completed: newSettings.challengeCompleted ? 1 : 0,
        partner_invite: newSettings.partnerInvite ? 1 : 0,
        partner_accepted: newSettings.partnerAccepted ? 1 : 0,
        reaction_received: newSettings.reactionReceived ? 1 : 0,
        nudge_received: newSettings.nudgeReceived ? 1 : 0,
        daily_reminder: newSettings.dailyReminder ? 1 : 0,
        streak_milestone: newSettings.streakMilestone ? 1 : 0,
        goal_deadline: newSettings.goalDeadline ? 1 : 0,
        system: newSettings.system ? 1 : 0,
      });
    } catch (e) {
      console.error('Failed to update settings', e);
      setSettings(settings); // revert
    } finally {
      setSaving(false);
    }
  };

  // Push subscription handling
  const handlePushToggle = async () => {
    if (!settings) return;
    if (!settings.pushEnabled) {
      // Request push permission
      try {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        }
        const reg = await navigator.serviceWorker?.ready;
        if (reg?.pushManager) {
          // In production, use VAPID key from server
          // For now, toggle the setting
          await handleToggle('pushEnabled');
        }
      } catch (e) {
        console.error('Push subscription failed', e);
      }
    } else {
      await handleToggle('pushEnabled');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-xs text-[#8D7F72]">در حال بارگذاری...</div>;
  }

  if (!settings) {
    return <div className="text-center py-10 text-xs text-[#8D7F72]">خطا در بارگذاری</div>;
  }

  return (
    <div className="space-y-2" dir="rtl">
      {TOGGLE_ITEMS.map(item => {
        const isOn = settings[item.key];
        const isPush = item.key === 'pushEnabled';
        return (
          <motion.div
            key={item.key}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E6DFD3]"
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="flex-1 text-[11px] font-bold text-[#2D3025]">{item.label}</span>
            <button
              onClick={() => isPush ? handlePushToggle() : handleToggle(item.key)}
              className={`
                relative w-10 h-5.5 rounded-full transition-colors cursor-pointer
                ${isOn ? 'bg-[#4A6741]' : 'bg-[#D6CFC3]'}
              `}
              style={{ minWidth: '2.5rem', height: '1.375rem' }}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                animate={{ left: isOn ? '1.25rem' : '0.125rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
