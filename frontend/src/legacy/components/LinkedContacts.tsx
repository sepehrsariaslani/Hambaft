import React, { useState, useEffect, useCallback } from 'react';
import { ContactLink, ContactLinkEntityType, ContactLinkRole } from '../types';
import { getContactLinks, createContactLink, updateContactLink, deleteContactLink } from '../../app/hambaft-api';
import { Users, Plus, Trash2, X, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LINK_ROLE_LABELS: Record<string, string> = {
  owner: 'مالک',
  collaborator: 'همکار',
  mentor: 'منتور',
  accountability: 'پاسخگو',
  stakeholder: 'ذی‌نفع',
  family: 'خانواده',
  vendor: 'تأمین‌کننده',
  client: 'مشتری',
  introduced_by: 'معرفی‌شده توسط',
  related_person: 'شخص مرتبط',
};

// Default roles per entity type for context-aware suggestions
const DEFAULT_ROLES: Partial<Record<ContactLinkEntityType, ContactLinkRole>> = {
  goal: 'collaborator',
  project: 'collaborator',
  task: 'owner',
  occasion: 'family',
  document: 'related_person',
  finance: 'client',
};

interface ContactOption {
  id: string;
  name: string;
  photoUrl?: string;
  category?: string;
}

interface LinkedContactsProps {
  entityType: ContactLinkEntityType;
  entityId: string;
  contacts?: ContactOption[];
  onNavigateContact?: (contactId: string) => void;
}

export default function LinkedContacts({ entityType, entityId, contacts = [], onNavigateContact }: LinkedContactsProps) {
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ContactLink | null>(null);
  const [selContact, setSelContact] = useState('');
  const [selRole, setSelRole] = useState<ContactLinkRole>(DEFAULT_ROLES[entityType] || 'related_person');
  const [contextNote, setContextNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLinks = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const resp = await getContactLinks({ entityType, entityId });
      const raw = resp?.data?.links || [];
      setLinks(raw.map((l: any) => ({
        name: l.name,
        contact: l.contact,
        contactName: l.contact_name || l.contact,
        contactPhoto: l.contact_photo,
        entityType: l.entity_type,
        entity: l.entity,
        entityTitle: l.entity_title,
        role: l.role,
        contextNote: l.context_note || '',
        status: l.status,
        sortOrder: l.sort_order || 0,
      })));
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleOpenAdd = () => {
    setSelContact('');
    setSelRole(DEFAULT_ROLES[entityType] || 'related_person');
    setContextNote('');
    setAddModalOpen(true);
  };

  const handleOpenEdit = (link: ContactLink) => {
    setEditingLink(link);
    setSelRole(link.role);
    setContextNote(link.contextNote);
    setEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    if (!selContact || !entityId) return;
    setSaving(true);
    try {
      await createContactLink({
        contact: selContact,
        entity_type: entityType,
        entity: entityId,
        role: selRole,
        context_note: contextNote,
      });
      await fetchLinks();
      setAddModalOpen(false);
    } catch (err) {
      console.error('[hambaft] create link failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLink) return;
    setSaving(true);
    try {
      await updateContactLink(editingLink.name, {
        role: selRole,
        context_note: contextNote,
      });
      await fetchLinks();
      setEditModalOpen(false);
      setEditingLink(null);
    } catch (err) {
      console.error('[hambaft] update link failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (linkName: string) => {
    try {
      await deleteContactLink(linkName);
      await fetchLinks();
    } catch (err) {
      console.error('[hambaft] delete contact link failed', err);
    }
    setDeleteConfirm(null);
  };

  // Filter out contacts already linked
  const linkedContactIds = new Set(links.map(l => l.contact));
  const availableContacts = contacts.filter(c => !linkedContactIds.has(c.id));

  if (loading && links.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="text-[10px] font-black text-[#7C8363] dark:text-[#9ECE9A] flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>افراد مرتبط</span>
          {links.length > 0 && (
            <span className="text-[8px] bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 px-1.5 py-0.5 rounded-full">{links.length}</span>
          )}
        </h5>
        <button onClick={handleOpenAdd} className="text-[8px] font-black text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer hover:opacity-80 flex items-center gap-1">
          <Plus className="w-3 h-3" />
          افزودن
        </button>
      </div>

      {links.length > 0 ? (
        <div className="space-y-1.5">
          {links.map(link => (
            <div key={link.name} className="group flex items-center gap-2 p-2 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/30 dark:border-[#3D4133]/15 rounded-lg text-right">
              <button
                onClick={() => { if (onNavigateContact) onNavigateContact(link.contact); }}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-[#E6DFD3]/30 shrink-0 flex items-center justify-center cursor-pointer hover:opacity-80 text-xs"
              >
                {link.contactPhoto ? <img src={link.contactPhoto} alt="" className="w-full h-full object-cover rounded-lg" /> : '👤'}
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => { if (onNavigateContact) onNavigateContact(link.contact); }}
                  className="text-[9px] font-black text-[#2D3025] dark:text-[#E8ECE0] block truncate text-right hover:text-[#7C8363] cursor-pointer"
                >
                  {link.contactName}
                </button>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-md bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">
                    {LINK_ROLE_LABELS[link.role] || link.role}
                  </span>
                  {link.contextNote && (
                    <span className="text-[7px] text-[#8D7F72] dark:text-[#9D978B] truncate max-w-[100px]">{link.contextNote}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => handleOpenEdit(link)} className="p-1 rounded text-[#8D7F72] hover:text-[#7C8363] cursor-pointer"><Edit2 className="w-2.5 h-2.5" /></button>
                <button onClick={() => setDeleteConfirm(link.name)} className="p-1 rounded text-[#8D7F72] hover:text-red-400 cursor-pointer"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[8px] text-[#8D7F72]">فرد مرتبطی ثبت نشده. <button onClick={handleOpenAdd} className="text-[#7C8363] font-black cursor-pointer hover:underline">افزودن</button></p>
      )}

      {/* Add Link Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl p-5 max-w-sm w-full text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#7C8363]" />افزودن شخص مرتبط</h4>
                <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5 text-[#8D7F72]" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">انتخاب مخاطب</label>
                  <select value={selContact} onChange={e => setSelContact(e.target.value)} className="w-full text-[10px] font-black p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]">
                    <option value="">انتخاب کنید...</option>
                    {availableContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {availableContacts.length === 0 && contacts.length > 0 && <p className="text-[8px] text-amber-600 mt-1">همه مخاطبین قبلاً پیوند شده‌اند.</p>}
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نقش</label>
                  <select value={selRole} onChange={e => setSelRole(e.target.value as ContactLinkRole)} className="w-full text-[10px] font-black p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]">
                    {Object.entries(LINK_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">توضیح (اختیاری)</label>
                  <input type="text" value={contextNote} onChange={e => setContextNote(e.target.value)} placeholder="مثلاً: منتور در مسیر یادگیری..." className="w-full text-[10px] font-bold p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
                </div>
                <button onClick={handleSaveAdd} disabled={!selContact || saving}
                  className="w-full py-2.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] text-[10px] font-black rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />{saving ? 'در حال ثبت...' : 'ثبت پیوند'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Link Modal */}
      <AnimatePresence>
        {editModalOpen && editingLink && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl p-5 max-w-sm w-full text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5"><Edit2 className="w-3.5 h-3.5 text-[#7C8363]" />ویرایش پیوند</h4>
                <button onClick={() => { setEditModalOpen(false); setEditingLink(null); }} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5 text-[#8D7F72]" /></button>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-[#2D3025] dark:text-[#E8ECE0]">👤 {editingLink.contactName}</p>
                <div>
                  <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">نقش</label>
                  <select value={selRole} onChange={e => setSelRole(e.target.value as ContactLinkRole)} className="w-full text-[10px] font-black p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]">
                    {Object.entries(LINK_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">توضیح</label>
                  <input type="text" value={contextNote} onChange={e => setContextNote(e.target.value)} className="w-full text-[10px] font-bold p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
                </div>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="w-full py-2.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] text-[10px] font-black rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />{saving ? 'در حال ذخیره...' : 'ذخیره'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-4 max-w-xs w-full shadow-2xl border border-[#E6DFD3]/60">
              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mb-3">حذف پیوند این شخص؟</p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">انصراف</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-[9px] font-bold cursor-pointer">حذف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
