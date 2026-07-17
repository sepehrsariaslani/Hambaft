import React, { useState, useEffect, useCallback } from 'react';
import { ContactLink, ContactLinkRole } from '../types';
import { getContactLinks, deleteContactLink } from '../../app/hambaft-api';
import { Users, Plus, Trash2, X } from 'lucide-react';
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

interface LinkedContactsProps {
  entityType: 'goal' | 'project' | 'task' | 'occasion' | 'document' | 'finance';
  entityId: string;
  onAddLink?: () => void;
  onNavigateContact?: (contactId: string) => void;
}

export default function LinkedContacts({ entityType, entityId, onAddLink, onNavigateContact }: LinkedContactsProps) {
  const [links, setLinks] = useState<ContactLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = async (linkName: string) => {
    try {
      await deleteContactLink(linkName);
      await fetchLinks();
    } catch (err) {
      console.error('[hambaft] delete contact link failed', err);
    }
    setDeleteConfirm(null);
  };

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
        {onAddLink && (
          <button onClick={onAddLink} className="text-[8px] font-black text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer hover:opacity-80 flex items-center gap-1">
            <Plus className="w-3 h-3" />
            افزودن
          </button>
        )}
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
                <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-md bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">
                  {LINK_ROLE_LABELS[link.role] || link.role}
                </span>
              </div>
              <button onClick={() => setDeleteConfirm(link.name)} className="p-1 rounded text-[#8D7F72] hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[8px] text-[#8D7F72]">فرد مرتبطی ثبت نشده.</p>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-4 max-w-xs w-full shadow-2xl border border-[#E6DFD3]/60">
              <p className="text-[10px] text-[#8D7F72] mb-3">حذف پیوند این شخص؟</p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 text-[9px] font-bold text-[#8D7F72] cursor-pointer">انصراف</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-[9px] font-bold cursor-pointer">حذف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
