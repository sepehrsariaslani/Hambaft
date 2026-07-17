import React, { useState, useEffect, useCallback } from 'react';
import {
  invitePartner, acceptPartnerInvite, rejectPartnerInvite,
  cancelPartnerInvite, getPartnerInvites, getPartners,
  removePartner, shareGoalWithPartner, type PartnerInfo, type PartnerConnection, type PartnerInviteItem
} from '../../app/hambaft-api';
import { UserPlus, Users, X, Check, Trash2, Link2, Mail, User, Copy, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PartnerManager({ goalId, onPartnerAdded }: { goalId?: string; onPartnerAdded?: () => void }) {
  const [partners, setPartners] = useState<PartnerConnection[]>([]);
  const [sentInvites, setSentInvites] = useState<PartnerInviteItem[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<PartnerInviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'partners' | 'sent' | 'received' | null>('partners');
  const [selectedPartnerForShare, setSelectedPartnerForShare] = useState<PartnerConnection | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [partnersRes, invitesRes] = await Promise.all([getPartners(), getPartnerInvites()]);
      setPartners(partnersRes?.data?.partners || []);
      setSentInvites(invitesRes?.data?.sent || []);
      setReceivedInvites(invitesRes?.data?.received || []);
    } catch (err) {
      console.error('[hambaft] fetch partners failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async () => {
    if (!inviteIdentifier.trim() && !goalId) return;
    setSaving(true);
    try {
      const res = await invitePartner({
        username: inviteIdentifier.trim(),
        email: inviteIdentifier.includes('@') ? inviteIdentifier.trim() : undefined,
        goal_id: goalId || undefined,
        message: inviteMessage || undefined,
        generate_code: !inviteIdentifier.trim() ? true : undefined,
      });
      const code = res?.data?.invite_code;
      if (code) setGeneratedCode(code);
      setInviteIdentifier('');
      setInviteMessage('');
      await fetchData();
      onPartnerAdded?.();
    } catch (err) {
      console.error('[hambaft] invite failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    setSaving(true);
    try {
      await acceptPartnerInvite({ invite_id: inviteId });
      await fetchData();
      onPartnerAdded?.();
    } catch (err) {
      console.error('[hambaft] accept failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (inviteId: string) => {
    try {
      await rejectPartnerInvite({ invite_id: inviteId });
      await fetchData();
    } catch (err) {
      console.error('[hambaft] reject failed', err);
    }
  };

  const handleCancel = async (inviteId: string) => {
    try {
      await cancelPartnerInvite(inviteId);
      await fetchData();
    } catch (err) {
      console.error('[hambaft] cancel failed', err);
    }
  };

  const handleRemovePartner = async (connectionId: string) => {
    if (!confirm('آیا مطمئنید؟ ارتباط با این پارتنر حذف می‌شود.')) return;
    try {
      await removePartner(connectionId);
      await fetchData();
    } catch (err) {
      console.error('[hambaft] remove partner failed', err);
    }
  };

  const handleShareGoal = async (partnerEmail: string) => {
    if (!goalId) return;
    setSaving(true);
    try {
      await shareGoalWithPartner({ goal_id: goalId, partner_email: partnerEmail });
      setShareModalOpen(false);
      setSelectedPartnerForShare(null);
      onPartnerAdded?.();
    } catch (err) {
      console.error('[hambaft] share goal failed', err);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
  };

  if (loading && partners.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="text-[10px] font-black text-[#7C8363] dark:text-[#9ECE9A] flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>پارتنرهای پاسخگویی</span>
          {partners.length > 0 && (
            <span className="text-[8px] bg-[#7C8363]/10 px-1.5 py-0.5 rounded-full">{partners.length}</span>
          )}
        </h5>
        <div className="flex items-center gap-1">
          {goalId && partners.length > 0 && (
            <button onClick={() => setShareModalOpen(true)} className="text-[8px] font-black text-[#9B6B61] cursor-pointer hover:opacity-80 flex items-center gap-1">
              <Link2 className="w-3 h-3" />اشتراک هدف
            </button>
          )}
          <button onClick={() => setInviteModalOpen(true)} className="text-[8px] font-black text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer hover:opacity-80 flex items-center gap-1">
            <UserPlus className="w-3 h-3" />دعوت
          </button>
        </div>
      </div>

      {/* Partners List */}
      {partners.length > 0 && (
        <div className="space-y-1.5">
          <button onClick={() => setExpandedSection(expandedSection === 'partners' ? null : 'partners')}
            className="w-full flex items-center justify-between text-[9px] font-black text-[#3D3D3D] dark:text-[#E8ECE0]">
            <span>پارتنرهای فعال ({partners.length})</span>
            {expandedSection === 'partners' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expandedSection === 'partners' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                {partners.map(p => (
                  <div key={p.id} className="group flex items-center gap-2 p-2 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/30 dark:border-[#3D4133]/15 rounded-lg text-right">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/30 shrink-0 flex items-center justify-center text-xs">
                      {p.partner.avatarUrl ? <img src={p.partner.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#2D3025] dark:text-[#E8ECE0] truncate">{p.partner.fullName}</p>
                      <p className="text-[7px] text-[#8D7F72]">{p.sharedGoalsCount > 0 ? `${p.sharedGoalsCount} هدف مشترک` : 'بدون هدف مشترک'}</p>
                    </div>
                    <button onClick={() => handleRemovePartner(p.id)} className="p-1 rounded text-[#8D7F72] hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Received Invites */}
      {receivedInvites.length > 0 && (
        <div className="space-y-1.5">
          <button onClick={() => setExpandedSection(expandedSection === 'received' ? null : 'received')}
            className="w-full flex items-center justify-between text-[9px] font-black text-[#9B6B61]">
            <span>دعوت‌های دریافتی ({receivedInvites.length})</span>
            {expandedSection === 'received' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expandedSection === 'received' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                {receivedInvites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 p-2 bg-[#F9F1D8] dark:bg-[#3D3D25] border border-[#EBE3C8]/50 rounded-lg text-right">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#5A5A40]">{inv.inviterInfo?.fullName || 'کاربر'}</p>
                      {inv.message && <p className="text-[7px] text-[#8D7F72]">{inv.message}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleAccept(inv.id)} className="p-1.5 bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-700"><Check className="w-3 h-3" /></button>
                      <button onClick={() => handleReject(inv.id)} className="p-1.5 bg-red-400 text-white rounded-lg cursor-pointer hover:bg-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sent Invites */}
      {sentInvites.filter(i => i.status === 'در_انتظار').length > 0 && (
        <div className="space-y-1.5">
          <button onClick={() => setExpandedSection(expandedSection === 'sent' ? null : 'sent')}
            className="w-full flex items-center justify-between text-[9px] font-black text-[#8D7F72]">
            <span>دعوت‌های ارسالی ({sentInvites.filter(i => i.status === 'در_انتظار').length} در انتظار)</span>
            {expandedSection === 'sent' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expandedSection === 'sent' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1">
                {sentInvites.filter(i => i.status === 'در_انتظار').map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 p-2 bg-[#E8ECE0] dark:bg-[#252A1F] border border-[#DDE2D5]/50 rounded-lg text-right">
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#7C8363]">{inv.inviteeInfo?.fullName || inv.invitee_username || 'کد دعوت'}</p>
                      <p className="text-[7px] text-[#8D7F72]">کد: {inv.inviteCode}</p>
                    </div>
                    <button onClick={() => { copyCode(inv.inviteCode); }} className="p-1 text-[#7C8363] cursor-pointer hover:text-[#5A5A40]"><Copy className="w-3 h-3" /></button>
                    <button onClick={() => handleCancel(inv.id)} className="p-1 text-[#8D7F72] hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {partners.length === 0 && receivedInvites.length === 0 && sentInvites.filter(i => i.status === 'در_انتظار').length === 0 && (
        <p className="text-[8px] text-[#8D7F72]">هنوز پارتنری ندارید. <button onClick={() => setInviteModalOpen(true)} className="text-[#7C8363] font-black cursor-pointer hover:underline">دعوت کنید</button></p>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl p-5 max-w-sm w-full text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-[#7C8363]" />دعوت پارتنر پاسخگویی</h4>
                <button onClick={() => { setInviteModalOpen(false); setGeneratedCode(null); }} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5 text-[#8D7F72]" /></button>
              </div>

              {generatedCode ? (
                <div className="space-y-3 text-center">
                  <p className="text-[10px] text-[#8D7F72]">کد دعوت شما:</p>
                  <div className="bg-[#E8ECE0] dark:bg-[#252A1F] p-4 rounded-xl">
                    <p className="text-2xl font-black text-[#7C8363] dark:text-[#9ECE9A] tracking-widest font-mono">{generatedCode}</p>
                  </div>
                  <p className="text-[8px] text-[#8D7F72]">این کد را برای پارتنر خود بفرستید تا وارد اپ شود و کد را وارد کند.</p>
                  <button onClick={() => copyCode(generatedCode)} className="px-4 py-2 bg-[#7C8363] text-white text-[10px] font-black rounded-xl cursor-pointer hover:opacity-90 flex items-center gap-1.5 mx-auto">
                    <Copy className="w-3.5 h-3.5" />کپی کد
                  </button>
                  <button onClick={() => { setInviteModalOpen(false); setGeneratedCode(null); }} className="text-[9px] text-[#8D7F72] cursor-pointer hover:underline block mx-auto mt-2">بستن</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نام کاربری یا ایمیل پارتنر</label>
                    <div className="flex items-center gap-1">
                      <input type="text" value={inviteIdentifier} onChange={e => setInviteIdentifier(e.target.value)} placeholder="نام کاربری یا ایمیل..."
                        className="flex-1 text-[10px] font-bold p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
                    </div>
                    <p className="text-[7px] text-[#8D7F72] mt-1">اگر نام کاربری را نمی‌دانید، خالی بگذارید تا کد دعوت تولید شود.</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">پیام (اختیاری)</label>
                    <input type="text" value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} placeholder="بیا با هم هدف بذاریم! 💪"
                      className="w-full text-[10px] font-bold p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
                  </div>
                  <button onClick={handleInvite} disabled={saving}
                    className="w-full py-2.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] text-[10px] font-black rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <Send className="w-3.5 h-3.5" />{saving ? 'در حال ارسال...' : inviteIdentifier.trim() ? 'ارسال دعوت' : 'تولید کد دعوت'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Goal Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl p-5 max-w-sm w-full text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-[#7C8363]" />اشتراک هدف با پارتنر</h4>
                <button onClick={() => setShareModalOpen(false)} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5 text-[#8D7F72]" /></button>
              </div>
              <p className="text-[9px] text-[#8D7F72]">پارتنری که می‌خواهید این هدف را با او به اشتراک بگذارید انتخاب کنید:</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {partners.map(p => (
                  <button key={p.id} onClick={() => handleShareGoal(p.partner.email)}
                    className="w-full flex items-center gap-2 p-2.5 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/30 rounded-xl text-right cursor-pointer hover:border-[#7C8363]/50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-xs">
                      {p.partner.avatarUrl ? <img src={p.partner.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#2D3025] dark:text-[#E8ECE0] truncate">{p.partner.fullName}</p>
                    </div>
                    <Link2 className="w-3 h-3 text-[#7C8363]" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
