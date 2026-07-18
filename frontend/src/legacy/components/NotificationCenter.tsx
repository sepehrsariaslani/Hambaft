import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  getUnreadNotificationCount,
  NotificationItem as ApiNotification,
} from '../../app/hambaft-api';
import { NotificationItem } from '../types';

// ─── Time ago helper ────────────────────────────────────────
function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'همین الان';
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ساعت پیش`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} روز پیش`;
    return date.toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

// ─── Single Notification Row ────────────────────────────────

function NotificationRow({ notification, onRead, onDismiss }: {
  notification: NotificationItem;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const isUnread = !notification.read;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      className={`
        relative p-3 rounded-xl border transition-all cursor-pointer
        ${isUnread
          ? 'bg-[#E8ECE0]/60 border-[#7C8363]/30'
          : 'bg-white border-[#E6DFD3]/60'
        }
      `}
      onClick={() => {
        if (isUnread) onRead(notification.id);
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-xl flex-shrink-0 mt-0.5">{notification.icon || '🔔'}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-[11px] font-black ${isUnread ? 'text-[#2D3025]' : 'text-[#8D7F72]'}`}>
              {notification.titleFa || notification.title}
            </h4>
            {isUnread && (
              <div className="w-2 h-2 rounded-full bg-[#4A6741] flex-shrink-0" />
            )}
          </div>
          {(notification.bodyFa || notification.body) && (
            <p className="text-[10px] text-[#8D7F72] mt-0.5 leading-relaxed">
              {notification.bodyFa || notification.body}
            </p>
          )}
          <span className="text-[8px] text-[#8D7F72]/60 mt-1 block">
            {timeAgo(notification.createdAt)}
          </span>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className="text-[#8D7F72]/40 hover:text-[#8D7F72] transition-colors text-xs p-1"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}


// ─── Empty state ────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🔔</div>
      <h3 className="text-sm font-black text-[#2D3025] mb-1">اعلانی نداری!</h3>
      <p className="text-[10px] text-[#8D7F72]">وقتی اتفاق مهمی بیفته، اینجا بهت می‌گیم.</p>
    </div>
  );
}


// ─── Main Component ─────────────────────────────────────────

interface NotificationCenterProps {
  onNavigate?: (entityType: string, entity: string) => void;
}

export default function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications(50, 0, filter === 'unread');
      const d = res?.data;
      if (d) {
        setNotifications(
          (d.notifications || []).map((n: ApiNotification) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            titleFa: n.title_fa,
            body: n.body,
            bodyFa: n.body_fa,
            icon: n.icon,
            entityType: n.entity_type,
            entity: n.entity,
            read: n.read === 1,
            createdAt: n.created_at,
          }))
        );
        setUnreadCount(d.unread_count || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const handleRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('Failed to dismiss notification', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

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

  return (
    <div className="space-y-4 text-right max-w-md mx-auto" dir="rtl" id="notification-center-root">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-bl from-[#2D3025] to-[#4A5A3F] text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-white/60 font-bold">مرکز اعلان‌ها</div>
            <div className="text-lg font-black">
              {unreadCount > 0 ? `${unreadCount} اعلان جدید` : 'همه خوانده‌شده'}
            </div>
          </div>
          <div className="text-3xl">🔔</div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="mt-2 w-full py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold text-white transition-colors cursor-pointer"
          >
            خواندن همه
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex bg-[#F9F6EE] p-1 rounded-2xl border border-[#E6DFD3] gap-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#2D3025] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#2D3025]'
          }`}
        >
          همه ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer ${
            filter === 'unread'
              ? 'bg-[#4A6741] text-white shadow-sm'
              : 'text-[#8D7F72] hover:text-[#4A6741]'
          }`}
        >
          خوانده‌نشده ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            notifications.map(n => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={handleRead}
                onDismiss={handleDismiss}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
