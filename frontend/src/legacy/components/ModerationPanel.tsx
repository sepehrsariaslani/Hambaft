import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getBlockedUsers,
  getMyReports,
  reportContent,
  blockUser,
  unblockUser,
  adminGetReports,
  adminReviewReport,
  adminGetStats,
} from '../../app/hambaft-api';

// ─── Report Modal ───────────────────────────────────────────

function ReportModal({ reportedUser, onClose, onSubmitted }: {
  reportedUser: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('other');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    { value: 'spam', label: 'هرزنامه' },
    { value: 'harassment', label: 'آزار و اذیت' },
    { value: 'inappropriate_content', label: 'محتوای نامناسب' },
    { value: 'misinformation', label: 'اطلاعات نادرست' },
    { value: 'other', label: 'سایر' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await reportContent({
        reported_user: reportedUser,
        reason,
        description,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      console.error('Report failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl p-5 mx-6 max-w-sm w-full space-y-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h3 className="text-sm font-black text-[#2D3025] text-right">گزارش تخلف</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8D7F72] block">دلیل گزارش</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363]"
            >
              {REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#8D7F72] block">توضیحات (اختیاری)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC3] rounded-xl focus:outline-none focus:border-[#7C8363] h-20 resize-none"
              placeholder="توضیحات بیشتر..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[#D6CFC3] text-xs font-bold text-[#8D7F72] rounded-xl cursor-pointer"
            >انصراف</button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
            >{submitting ? 'در حال ارسال...' : 'ارسال گزارش'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Blocked Users List ─────────────────────────────────────

function BlockedList() {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    try {
      const res = await getBlockedUsers();
      setBlockedUsers(res?.data?.blocked_users || []);
    } catch (e) {
      console.error('Failed to fetch blocked users', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  const handleUnblock = async (email: string) => {
    try {
      await unblockUser(email);
      setBlockedUsers(prev => prev.filter(u => u.user_info?.email !== email));
    } catch (e) {
      console.error('Unblock failed', e);
    }
  };

  if (loading) return <div className="text-center py-6 text-xs text-[#8D7F72]">در حال بارگذاری...</div>;

  if (blockedUsers.length === 0) {
    return <div className="text-center py-8 text-[#8D7F72] text-xs">کاربر مسدودی نداری</div>;
  }

  return (
    <div className="space-y-2">
      {blockedUsers.map(b => (
        <div key={b.block_id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E6DFD3]">
          <div className="w-8 h-8 rounded-full bg-[#E8ECE0] flex items-center justify-center text-sm">
            {b.user_info?.avatarUrl ? '👤' : '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#2D3025] truncate">{b.user_info?.fullName || b.user_info?.email}</div>
            <div className="text-[9px] text-[#8D7F72]">{b.reason}</div>
          </div>
          <button
            onClick={() => handleUnblock(b.user_info?.email)}
            className="px-3 py-1 text-[9px] font-bold text-[#4A6741] bg-[#E8ECE0] rounded-lg cursor-pointer hover:bg-[#DDE2D5]"
          >رفع مسدودیت</button>
        </div>
      ))}
    </div>
  );
}

// ─── My Reports List ────────────────────────────────────────

function MyReportsList() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyReports()
      .then(res => setReports(res?.data?.reports || []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-6 text-xs text-[#8D7F72]">در حال بارگذاری...</div>;

  if (reports.length === 0) {
    return <div className="text-center py-8 text-[#8D7F72] text-xs">گزارشی نداری</div>;
  }

  const STATUS_LABELS: Record<string, string> = {
    'در_انتظار': 'در انتظار بررسی',
    'در_حال_بررسی': 'در حال بررسی',
    'تأییدشده': 'تأیید شده',
    'ردشده': 'رد شده',
    'بسته‌شده': 'بسته شده',
  };

  return (
    <div className="space-y-2">
      {reports.map(r => (
        <div key={r.id} className="p-3 rounded-xl bg-white border border-[#E6DFD3]">
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
              r.status === 'تأییدشده' ? 'bg-green-100 text-green-700' :
              r.status === 'ردشده' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>{STATUS_LABELS[r.status] || r.status}</span>
            <span className="text-[10px] font-bold text-[#2D3025]">{r.reason_label}</span>
          </div>
          <div className="text-[9px] text-[#8D7F72] mt-1">
            {r.reported_user_info?.fullName || r.reported_user_info?.email} • {new Date(r.created_at).toLocaleDateString('fa-IR')}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Admin Panel (System Manager) ───────────────────────────

function AdminPanel() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [reports, setReports] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminGetStats();
      if (res?.data) setStats(res.data as Record<string, number>);
    } catch (e) { console.error(e); }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await adminGetReports(filterStatus || undefined);
      setReports(res?.data?.reports || []);
    } catch (e) { console.error(e); }
  }, [filterStatus]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchReports()]).finally(() => setLoading(false));
  }, [fetchStats, fetchReports]);

  const handleReview = async (reportId: string, action: string, actionTaken: string) => {
    try {
      await adminReviewReport({ report_id: reportId, action, action_taken: actionTaken });
      fetchReports();
      fetchStats();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="text-center py-10"><div className="w-6 h-6 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const statCards = [
    { label: 'کاربران', value: stats.users || 0, icon: '👥' },
    { label: 'گزارش‌های در انتظار', value: stats.reports_pending || 0, icon: '⚠️' },
    { label: 'کل گزارش‌ها', value: stats.reports_total || 0, icon: '📋' },
    { label: 'مسدودیت‌ها', value: stats.blocks_total || 0, icon: '🚫' },
    { label: 'نشان‌های فعال', value: stats.badges_active || 0, icon: '🏆' },
    { label: 'چالش امروز', value: stats.challenges_completed_today || 0, icon: '🎯' },
  ];

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {statCards.map(s => (
          <div key={s.label} className="p-2.5 rounded-xl bg-white border border-[#E6DFD3] text-center">
            <div className="text-lg">{s.icon}</div>
            <div className="text-sm font-black text-[#2D3025]">{s.value}</div>
            <div className="text-[8px] text-[#8D7F72] font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reports filter */}
      <div className="flex gap-1 flex-wrap">
        {['', 'در_انتظار', 'تأییدشده', 'ردشده', 'بسته‌شده'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1 text-[9px] font-bold rounded-lg cursor-pointer transition-colors ${
              filterStatus === s ? 'bg-[#2D3025] text-white' : 'bg-[#F9F6EE] text-[#8D7F72]'
            }`}
          >{s || 'همه'}</button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-2">
        {reports.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#8D7F72]">گزارشی یافت نشد</div>
        ) : reports.map(r => (
          <div key={r.id} className="p-3 rounded-xl bg-white border border-[#E6DFD3] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {r.status === 'در_انتظار' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                {r.status === 'تأییدشده' && <span className="w-2 h-2 rounded-full bg-green-500" />}
                {r.status === 'ردشده' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                <span className="text-[10px] font-bold text-[#2D3025]">{r.reason}</span>
              </div>
              <span className="text-[8px] text-[#8D7F72]">{new Date(r.created_at).toLocaleDateString('fa-IR')}</span>
            </div>
            <div className="text-[9px] text-[#8D7F72]">
              گزارش‌دهنده: {r.reporter_info?.fullName} → گزارش‌شده: {r.reported_user_info?.fullName}
            </div>
            {r.description && <div className="text-[9px] text-[#5A5A40] bg-[#F9F6EE] p-1.5 rounded-lg">{r.description}</div>}
            {r.status === 'در_انتظار' && (
              <div className="flex gap-1.5">
                <button onClick={() => handleReview(r.id, 'تأییدشده', 'هشدار')} className="px-2 py-1 text-[8px] font-bold bg-amber-100 text-amber-700 rounded-lg cursor-pointer">هشدار</button>
                <button onClick={() => handleReview(r.id, 'تأییدشده', 'حذف_محتوا')} className="px-2 py-1 text-[8px] font-bold bg-orange-100 text-orange-700 rounded-lg cursor-pointer">حذف محتوا</button>
                <button onClick={() => handleReview(r.id, 'تأییدشده', 'مسدود_کاربر')} className="px-2 py-1 text-[8px] font-bold bg-red-100 text-red-700 rounded-lg cursor-pointer">مسدود</button>
                <button onClick={() => handleReview(r.id, 'ردشده', 'هیچ')} className="px-2 py-1 text-[8px] font-bold bg-gray-100 text-gray-700 rounded-lg cursor-pointer">رد</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Main Component ─────────────────────────────────────────

export default function ModerationPanel() {
  const [activeTab, setActiveTab] = useState<'blocked' | 'reports' | 'admin'>('blocked');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState('');

  const isAdmin = false; // This would be determined by user role in real app

  const handleBlockUser = async (email: string) => {
    try {
      await blockUser({ blocked_user: email });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4 text-right max-w-md mx-auto" dir="rtl" id="moderation-root">
      {/* Report modal */}
      <AnimatePresence>
        {showReportModal && (
          <ReportModal
            reportedUser={reportTarget}
            onClose={() => setShowReportModal(false)}
            onSubmitted={() => setShowReportModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-bl from-[#2D3025] to-[#4A5A3F] text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-white/60 font-bold">مدیریت و نظارت</div>
            <div className="text-lg font-black">ایمنی جامعه</div>
          </div>
          <div className="text-3xl">🛡️</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-[#F9F6EE] p-1 rounded-2xl border border-[#E6DFD3] gap-1">
        <button
          onClick={() => setActiveTab('blocked')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'blocked' ? 'bg-[#2D3025] text-white shadow-sm' : 'text-[#8D7F72]'
          }`}
        >🚫 مسدودشده‌ها</button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'reports' ? 'bg-[#2D3025] text-white shadow-sm' : 'text-[#8D7F72]'
          }`}
        >📋 گزارش‌ها</button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'admin' ? 'bg-[#2D3025] text-white shadow-sm' : 'text-[#8D7F72]'
          }`}
        >⚙️ مدیر</button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'blocked' && (
          <motion.div key="blocked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <BlockedList />
          </motion.div>
        )}
        {activeTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <MyReportsList />
          </motion.div>
        )}
        {activeTab === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <AdminPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
