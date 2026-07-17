import React, { useState } from 'react';
import { Document, DocumentType, BankAccount, AssetInvestment } from '../types';
import LinkedContacts from './LinkedContacts';
import {
  FileText, Shield, Award, Heart, DollarSign, Scale, FolderOpen,
  Plus, Trash2, AlertTriangle, CheckCircle, Clock, Tag, Building2, Calendar,
  CreditCard, Coins, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PersianDatePicker from './PersianDatePicker';
import { toJalaliFriendly } from '../utils/jalali';

interface DocumentsSectionProps {
  documents: Document[];
  onAddDocument: (doc: Omit<Document, 'id' | 'createdAt'>) => void;
  onDeleteDocument: (id: string) => void;
  bankAccounts: BankAccount[];
  assets: AssetInvestment[];
  contacts?: { id: string; name: string; photoUrl?: string; category?: string }[];
}

const DOC_TYPES: Record<DocumentType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  insurance: { label: 'بیمه‌نامه', icon: <Shield className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  contract:  { label: 'قرارداد',   icon: <FileText className="w-4 h-4" />, color: 'text-[#9B6B61]', bg: 'bg-[#F4E9E4] border-[#EDDDD7]' },
  certificate:{ label: 'گواهینامه', icon: <Award className="w-4 h-4" />, color: 'text-[#9B6B61]', bg: 'bg-[#F9F1D8] border-[#EBE3C8]' },
  medical:   { label: 'پرونده پزشکی', icon: <Heart className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  financial: { label: 'مالی',      icon: <DollarSign className="w-4 h-4" />, color: 'text-[#7C8363]', bg: 'bg-[#E8ECE0] border-[#DDE2D5]' },
  legal:     { label: 'حقوقی',     icon: <Scale className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  other:     { label: 'سایر',      icon: <FolderOpen className="w-4 h-4" />, color: 'text-[#8D7F72]', bg: 'bg-[#E6DFD3] border-[#D6CFC3]' },
};

const TODAY = '2026-07-04';

function getDaysUntilExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const diff = (new Date(expiryDate).getTime() - new Date(TODAY).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

export default function DocumentsSection({ documents, onAddDocument, onDeleteDocument, bankAccounts = [], assets = [], contacts = [] }: DocumentsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('insurance');
  const [description, setDescription] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedBankAccountId, setLinkedBankAccountId] = useState('');
  const [linkedAssetId, setLinkedAssetId] = useState('');
  
  // NEW: Image attachment, calendar reminder, and selected document states
  const [image, setImage] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const resetForm = () => {
    setTitle(''); setType('insurance'); setDescription(''); setIssuedBy('');
    setIssuedDate(''); setExpiryDate(''); setTags(''); setNotes('');
    setLinkedBankAccountId(''); setLinkedAssetId('');
    setImage(''); setReminderDate(''); setDragActive(false);
    setShowForm(false);
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddDocument({
      title: title.trim(),
      type,
      description: description.trim(),
      issuedBy: issuedBy.trim() || undefined,
      issuedDate: issuedDate || undefined,
      expiryDate: expiryDate || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
      linkedBankAccountId: linkedBankAccountId || undefined,
      linkedAssetId: linkedAssetId || undefined,
      image: image || undefined,
      reminderDate: reminderDate || undefined,
    });
    resetForm();
  };

  const filtered = filterType === 'all' ? documents : documents.filter(d => d.type === filterType);

  const expiringSoon = documents.filter(d => {
    const days = getDaysUntilExpiry(d.expiryDate);
    return days !== null && days >= 0 && days <= 30;
  });
  const expired = documents.filter(d => {
    const days = getDaysUntilExpiry(d.expiryDate);
    return days !== null && days < 0;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">

      {/* Header + Alerts */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-[#2D3025] font-serif-elegant">مدیریت اسناد مهم</h2>
          <p className="text-xs text-[#8D7F72] mt-0.5">بیمه‌نامه‌ها، قراردادها، گواهینامه‌ها و سایر مدارک</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2D3025] text-white text-xs font-bold rounded-xl hover:bg-[#3D4133] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          افزودن سند جدید
        </button>
      </div>

      {/* Alert banners */}
      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black text-red-700">⚠️ {expired.length} سند منقضی شده</p>
            <p className="text-[10px] text-red-600 mt-0.5">{expired.map(d => d.title).join('، ')}</p>
          </div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-[#F9F1D8] border border-[#EBE3C8] rounded-2xl p-4 flex items-start gap-3">
          <Clock className="w-4 h-4 text-[#9B6B61] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black text-[#5A5A40]">🕐 {expiringSoon.length} سند در ۳۰ روز آینده منقضی می‌شود</p>
            <p className="text-[10px] text-[#9B6B61] mt-0.5">{expiringSoon.map(d => `${d.title} (${getDaysUntilExpiry(d.expiryDate)} روز)`).join('، ')}</p>
          </div>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#FDFBF7] dark:bg-[#1C1D17] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl p-5"
          >
            <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] mb-4 font-serif-elegant">افزودن سند جدید</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">عنوان سند *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: بیمه عمر البرز" required
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">نوع سند</label>
                  <select value={type} onChange={e => setType(e.target.value as DocumentType)}
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none cursor-pointer">
                    {Object.entries(DOC_TYPES).map(([k, v]) => (
                      <option key={k} value={k} className="bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0]">{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">توضیحات کوتاه</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="مثال: بیمه عمر و تشکیل سرمایه ۲۰ ساله"
                  className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">صادرکننده</label>
                  <input type="text" value={issuedBy} onChange={e => setIssuedBy(e.target.value)}
                    placeholder="مثال: شرکت بیمه البرز"
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ صدور</label>
                  <PersianDatePicker value={issuedDate} onChange={setIssuedDate} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ انقضا</label>
                  <PersianDatePicker value={expiryDate} onChange={setExpiryDate} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">برچسب‌ها (با کاما جدا کنید)</label>
                  <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                    placeholder="مثال: مهم، خودرو، سالانه"
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">یادداشت</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="توضیح اضافه..."
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">تاریخ یادآوری در تقویم (اختیاری)</label>
                  <PersianDatePicker value={reminderDate} onChange={setReminderDate} />
                  <p className="text-[8px] text-[#8D7F72] dark:text-[#9D978B]">یک یادآوری هوشمند در تاریخ انتخاب‌شده در تقویم شما فعال می‌شود.</p>
                </div>

                {/* Image Drag & Drop Uploader */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">پیوست تصویر مدرک (اختیاری)</label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`border border-dashed rounded-xl p-3.5 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      dragActive ? 'border-[#7C8363] bg-[#E8ECE0]/30 dark:bg-[#20241A]/30' : 'border-[#D6CFC3] dark:border-[#3D4133] hover:border-[#7C8363] bg-white dark:bg-[#121411]'
                    }`}
                    onClick={() => document.getElementById('doc-image-upload')?.click()}
                  >
                    <input
                      id="doc-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChange(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    {image ? (
                      <div className="space-y-1.5 w-full">
                        <img src={image} alt="پیش‌نمایش سند" className="max-h-24 object-contain rounded-lg shadow-2xs mx-auto" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImage('');
                          }}
                          className="text-[9px] font-bold text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md"
                        >
                          حذف تصویر
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">رها کردن تصویر یا کلیک جهت بارگذاری</div>
                        <p className="text-[8px] text-[#8D7F72] dark:text-[#8D7F72]">فایل‌های مجاز: JPG, PNG, WEBP</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">اتصال به حساب بانکی (اختیاری)</label>
                  <select value={linkedBankAccountId} onChange={e => setLinkedBankAccountId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none cursor-pointer">
                    <option value="" className="bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0]">عدم اتصال به حساب</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id} className="bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0]">{b.bankName} — {b.accountName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">اتصال به دارایی / سرمایه‌گذاری (اختیاری)</label>
                  <select value={linkedAssetId} onChange={e => setLinkedAssetId(e.target.value)}
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0] focus:outline-none cursor-pointer">
                    <option value="" className="bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0]">عدم اتصال به دارایی</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id} className="bg-white dark:bg-[#121411] text-[#3D3D3D] dark:text-[#E8ECE0]">{a.name} ({a.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#2D3025] dark:bg-[#7C8363] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133] dark:hover:bg-[#5A5A40] transition-all">
                  ذخیره سند
                </button>
                <button type="button" onClick={resetForm}
                  className="px-4 py-2.5 text-xs font-bold text-[#8D7F72] dark:text-[#9D978B] border border-[#D6CFC3] dark:border-[#3D4133] rounded-xl cursor-pointer hover:bg-[#E6DFD3] dark:hover:bg-[#2E3326] transition-all">
                  انصراف
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(DOC_TYPES).slice(0, 4).map(([k, v]) => {
          const count = documents.filter(d => d.type === k).length;
          return (
            <button key={k} onClick={() => setFilterType(filterType === k as DocumentType ? 'all' : k as DocumentType)}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${filterType === k ? v.bg + ' scale-[1.02]' : 'bg-[#FDFBF7] border-[#E6DFD3] hover:border-[#D6CFC3]'}`}>
              <div className={`${v.color} mb-1`}>{v.icon}</div>
              <div className="text-lg font-black text-[#2D3025]">{count}</div>
              <div className="text-[9px] font-bold text-[#8D7F72]">{v.label}</div>
            </button>
          );
        })}
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all cursor-pointer ${filterType === 'all' ? 'bg-[#2D3025] text-white border-[#2D3025]' : 'bg-[#FDFBF7] text-[#8D7F72] border-[#E6DFD3] hover:border-[#D6CFC3]'}`}>
          همه ({documents.length})
        </button>
        {Object.entries(DOC_TYPES).map(([k, v]) => {
          const count = documents.filter(d => d.type === k).length;
          if (count === 0) return null;
          return (
            <button key={k} onClick={() => setFilterType(filterType === k as DocumentType ? 'all' : k as DocumentType)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all cursor-pointer ${filterType === k ? 'bg-[#2D3025] text-white border-[#2D3025]' : 'bg-[#FDFBF7] text-[#8D7F72] border-[#E6DFD3] hover:border-[#D6CFC3]'}`}>
              {v.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="col-span-2 py-16 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
              <FolderOpen className="w-10 h-10 text-[#D6CFC3] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#8D7F72]">هیچ سندی ثبت نشده</p>
              <p className="text-xs text-[#8D7F72] mt-1">با کلیک روی «افزودن سند جدید» شروع کنید</p>
            </div>
          ) : filtered.map(doc => {
            const info = DOC_TYPES[doc.type];
            const daysLeft = getDaysUntilExpiry(doc.expiryDate);
            const isExpired = daysLeft !== null && daysLeft < 0;
            const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedDoc(doc)}
                className={`bg-[#FDFBF7] dark:bg-[#1C1D17] border rounded-2xl p-4 space-y-3 transition-all hover:shadow-md hover:border-[#7C8363] dark:hover:border-[#7C8363] cursor-pointer group ${
                  isExpired ? 'border-red-200 dark:border-red-900/40' : isExpiringSoon ? 'border-[#EBE3C8] dark:border-[#3D3929]' : 'border-[#E6DFD3] dark:border-[#3D4133]/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-xl border ${info.bg} ${info.color} shrink-0 dark:bg-[#1E201B]`}>
                      {info.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant leading-tight group-hover:text-[#7C8363] transition-colors">{doc.title}</h4>
                      <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold mt-0.5">{info.label}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                    className="p-1.5 text-[#8D7F72] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {doc.description && (
                  <p className="text-[11px] text-[#5A5A40] dark:text-[#A4A485] leading-relaxed line-clamp-2">{doc.description}</p>
                )}

                <div className="space-y-1.5">
                  {doc.issuedBy && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
                      <Building2 className="w-3 h-3 shrink-0 text-[#7C8363]" />
                      <span>{doc.issuedBy}</span>
                    </div>
                  )}
                  {doc.issuedDate && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="font-mono">تاریخ صدور: {toJalaliFriendly(doc.issuedDate)}</span>
                    </div>
                  )}
                  {doc.expiryDate && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold ${
                      isExpired ? 'text-red-600' : isExpiringSoon ? 'text-[#9B6B61]' : 'text-[#7C8363] dark:text-[#9ECE9A]'
                    }`}>
                      {isExpired ? <AlertTriangle className="w-3 h-3 shrink-0" /> : isExpiringSoon ? <Clock className="w-3 h-3 shrink-0" /> : <CheckCircle className="w-3 h-3 shrink-0" />}
                      <span className="font-mono">
                        {isExpired ? `منقضی شده (${Math.abs(daysLeft!)} روز پیش)` :
                         isExpiringSoon ? `${daysLeft} روز تا انقضا` :
                         `اعتبار تا: ${toJalaliFriendly(doc.expiryDate)}`}
                      </span>
                    </div>
                  )}
                  {doc.reminderDate && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#5A5A40] dark:text-[#9B6B61] font-bold">
                      <Clock className="w-3 h-3 shrink-0 text-[#9B6B61] dark:text-[#C59B93] animate-pulse" />
                      <span className="font-mono">یادآور تقویم: {toJalaliFriendly(doc.reminderDate)}</span>
                    </div>
                  )}
                </div>

                {doc.image && (
                  <div className="border-t border-[#E6DFD3]/60 dark:border-[#3D4133]/40 pt-2 shrink-0">
                    <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B] block mb-1">تصویر مدرک پیوست‌شده:</span>
                    <div
                      onClick={(e) => { e.stopPropagation(); setSelectedLightboxImage(doc.image!); }}
                      className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#D6CFC3] dark:border-[#3D4133] cursor-pointer group/img hover:opacity-90 transition-all"
                    >
                      <img src={doc.image} alt={doc.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">بزرگنمایی</span>
                      </div>
                    </div>
                  </div>
                )}

                {(doc.linkedBankAccountId || doc.linkedAssetId) && (
                  <div className="flex flex-col gap-1.5 border-t border-[#E6DFD3]/60 dark:border-[#3D4133]/40 pt-2 pb-0.5">
                    {doc.linkedBankAccountId && (
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#7C8363] dark:text-[#9ECE9A]">
                        <CreditCard className="w-3 h-3 shrink-0 text-[#7C8363] dark:text-[#9ECE9A]" />
                        <span>حساب متصل: {bankAccounts.find(b => b.id === doc.linkedBankAccountId)?.bankName || 'حساب بانکی'}</span>
                      </div>
                    )}
                    {doc.linkedAssetId && (
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#9B6B61] dark:text-[#DE8C7B]">
                        <Coins className="w-3 h-3 shrink-0 text-[#9B6B61] dark:text-[#DE8C7B]" />
                        <span>دارایی متصل: {assets.find(a => a.id === doc.linkedAssetId)?.name || 'دارایی/سرمایه'}</span>
                      </div>
                    )}
                  </div>
                )}

                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-[#E6DFD3]/30 dark:border-[#3D4133]/30 pt-2">
                    {doc.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-bold px-2 py-0.5 bg-[#E6DFD3] dark:bg-[#2E3326] text-[#5A5A40] dark:text-[#E8ECE0] rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detailed Document View Overlay */}
      <AnimatePresence>
        {selectedDoc && (() => {
          const info = DOC_TYPES[selectedDoc.type];
          const daysLeft = getDaysUntilExpiry(selectedDoc.expiryDate);
          const isExpired = daysLeft !== null && daysLeft < 0;
          const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
          const linkedAccount = bankAccounts.find(b => b.id === selectedDoc.linkedBankAccountId);
          const linkedAsset = assets.find(a => a.id === selectedDoc.linkedAssetId);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/60 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-right flex flex-col my-8"
                dir="rtl"
              >
                {/* Top Theme Band */}
                <div className="h-3 bg-gradient-to-l from-[#7C8363] to-[#E26645]" />

                <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto max-h-[80vh]">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`p-3 rounded-2xl border ${info.bg} ${info.color} dark:bg-[#20241A] shrink-0`}>
                        {info.icon}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3] dark:border-[#3D4133]/40 px-2.5 py-0.5 rounded-full inline-block mb-1">
                          {info.label}
                        </span>
                        <h3 className="text-base md:text-lg font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">
                          {selectedDoc.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-1.5 bg-[#FDFBF7] dark:bg-[#20241A] border border-[#E6DFD3] dark:border-[#3D4133]/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-[#8D7F72] hover:text-red-500 cursor-pointer transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Banner */}
                  {selectedDoc.expiryDate && (
                    <div className={`rounded-2xl p-3 border ${
                      isExpired
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400'
                        : isExpiringSoon
                        ? 'bg-[#F9F1D8] dark:bg-[#201D13] border-[#EBE3C8] dark:border-[#3D3929] text-[#5A5A40] dark:text-[#C59B93]'
                        : 'bg-[#E8ECE0] dark:bg-[#20241A] border-[#DDE2D5] dark:border-[#3D4133]/40 text-[#7C8363] dark:text-[#9ECE9A]'
                    } flex items-center gap-2 text-xs font-bold`}>
                      {isExpired ? <AlertTriangle className="w-4 h-4 animate-bounce" /> : <Clock className="w-4 h-4" />}
                      <span>
                        {isExpired
                          ? `منقضی شده: این سند حدود ${Math.abs(daysLeft!)} روز پیش منقضی گردیده است و نیاز به تمدید دارد.`
                          : isExpiringSoon
                          ? `سند رو به انقضا: فقط ${daysLeft} روز از اعتبار این مدرک باقی مانده است.`
                          : `سند معتبر: این مدرک معتبر بوده و تا تاریخ ${toJalaliFriendly(selectedDoc.expiryDate)} دارای اعتبار قانونی است.`}
                      </span>
                    </div>
                  )}

                  {/* Detailed Description */}
                  {selectedDoc.description && (
                    <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3] dark:border-[#3D4133]/40 p-4 rounded-2xl">
                      <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] mb-1.5">توضیحات و خلاصه سند</h4>
                      <p className="text-xs text-[#5A5A40] dark:text-[#A4A485] leading-relaxed">{selectedDoc.description}</p>
                    </div>
                  )}

                  {/* Grid Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Issuer & Dates */}
                    <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3] dark:border-[#3D4133]/40 p-4 rounded-2xl space-y-3">
                      <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-1.5">
                        مشخصات ثبت سند
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#8D7F72] dark:text-[#9D978B]">صادرکننده:</span>
                          <span className="font-extrabold text-[#3D3D3D] dark:text-[#E8ECE0]">{selectedDoc.issuedBy || 'ثبت نشده'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D7F72] dark:text-[#9D978B]">تاریخ صدور:</span>
                          <span className="font-mono text-[#3D3D3D] dark:text-[#E8ECE0]">
                            {selectedDoc.issuedDate ? toJalaliFriendly(selectedDoc.issuedDate) : 'ثبت نشده'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8D7F72] dark:text-[#9D978B]">تاریخ انقضاء:</span>
                          <span className="font-mono text-[#3D3D3D] dark:text-[#E8ECE0]">
                            {selectedDoc.expiryDate ? toJalaliFriendly(selectedDoc.expiryDate) : 'نامحدود'}
                          </span>
                        </div>
                        {selectedDoc.reminderDate && (
                          <div className="flex justify-between items-center text-[#5A5A40] dark:text-[#9B6B61] font-bold bg-[#F9F1D8] dark:bg-[#201D13] px-2 py-1 rounded-lg">
                            <span>یادآور هوشمند تقویم:</span>
                            <span className="font-mono">{toJalaliFriendly(selectedDoc.reminderDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connected entities */}
                    <div className="bg-[#FDFBF7] dark:bg-[#121411] border border-[#E6DFD3] dark:border-[#3D4133]/40 p-4 rounded-2xl space-y-3">
                      <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] border-b border-[#E6DFD3] dark:border-[#3D4133]/40 pb-1.5">
                        روابط و اتصالات مالی
                      </h4>
                      <div className="space-y-3 text-xs">
                        {linkedAccount ? (
                          <div className="p-2.5 bg-[#E8ECE0] dark:bg-[#20241A] rounded-xl border border-[#DDE2D5] dark:border-[#3D4133]/40 flex items-center gap-2.5">
                            <CreditCard className="w-5 h-5 text-[#7C8363] dark:text-[#9ECE9A]" />
                            <div>
                              <span className="text-[9px] font-black text-[#7C8363] dark:text-[#9ECE9A] block">حساب بانکی متصل</span>
                              <span className="font-extrabold text-[#3D3D3D] dark:text-[#E8ECE0]">{linkedAccount.bankName}</span>
                              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] block mt-0.5">مانده فعلی: {linkedAccount.balance.toLocaleString()} ریال</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#8D7F72]/80 italic">هیچ حساب بانکی به این سند متصل نیست.</p>
                        )}

                        {linkedAsset ? (
                          <div className="p-2.5 bg-[#F4E9E4] dark:bg-[#2A201C] rounded-xl border border-[#EDDDD7] dark:border-[#3D4133]/40 flex items-center gap-2.5">
                            <Coins className="w-5 h-5 text-[#9B6B61] dark:text-[#DE8C7B]" />
                            <div>
                              <span className="text-[9px] font-black text-[#9B6B61] dark:text-[#DE8C7B] block">دارایی یا سرمایه متصل</span>
                              <span className="font-extrabold text-[#3D3D3D] dark:text-[#E8ECE0]">{linkedAsset.name} ({linkedAsset.symbol})</span>
                              <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] block mt-0.5">ارزش تخمینی: {(linkedAsset.currentPrice * linkedAsset.amount).toLocaleString()} ریال</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#8D7F72]/80 italic border-t border-[#E6DFD3]/30 dark:border-[#3D4133]/30 pt-2">هیچ دارایی به این سند متصل نیست.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedDoc.notes && (
                    <div className="bg-[#F9F1D8]/50 dark:bg-[#20201A] border border-[#EBE3C8]/50 dark:border-[#3D3929] p-4 rounded-2xl">
                      <h4 className="text-[11px] font-black text-[#5A5A40] dark:text-[#C59B93] mb-1">یادداشت‌های اختصاصی</h4>
                      <p className="text-xs text-[#5A5A40] dark:text-[#C59B93]/80 leading-relaxed italic">« {selectedDoc.notes} »</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedDoc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-bold">برچسب‌ها:</span>
                      {selectedDoc.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-bold px-2.5 py-1 bg-[#E6DFD3] dark:bg-[#2E3326] text-[#5A5A40] dark:text-[#E8ECE0] rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Linked Contacts */}
                  {selectedDoc.id && (
                    <div className="border-t border-[#E6DFD3]/60 dark:border-[#3D4133]/40 pt-3">
                      <LinkedContacts entityType="document" entityId={selectedDoc.id} contacts={contacts} />
                    </div>
                  )}

                  {/* Attached Image Document */}
                  {selectedDoc.image && (
                    <div className="border-t border-[#E6DFD3]/60 dark:border-[#3D4133]/40 pt-4 space-y-2">
                      <h4 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">تصویر پیوست مدرک</h4>
                      <div className="border border-[#D6CFC3] dark:border-[#3D4133] rounded-2xl overflow-hidden bg-[#F9F6EE] dark:bg-black/20 p-2 flex justify-center">
                        <img
                          src={selectedDoc.image}
                          alt={selectedDoc.title}
                          className="max-h-72 object-contain rounded-xl shadow-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="bg-[#FDFBF7] dark:bg-[#121411] px-6 py-4 border-t border-[#E6DFD3] dark:border-[#3D4133]/40 flex justify-between gap-3 shrink-0">
                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow && selectedDoc) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>${selectedDoc.title}</title>
                              <style>
                                body { font-family: system-ui, -apple-system, sans-serif; direction: rtl; text-align: right; padding: 40px; }
                                .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                                .meta { margin-bottom: 20px; font-size: 14px; line-height: 1.8; }
                                img { max-width: 100%; max-height: 500px; margin-top: 20px; border: 1px solid #ddd; padding: 10px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <h1>${selectedDoc.title}</h1>
                                <p>نوع سند: ${info.label}</p>
                              </div>
                              <div class="meta">
                                <p><strong>صادرکننده:</strong> ${selectedDoc.issuedBy || 'ثبت نشده'}</p>
                                <p><strong>تاریخ صدور:</strong> ${selectedDoc.issuedDate || 'ثبت نشده'}</p>
                                <p><strong>تاریخ انقضاء:</strong> ${selectedDoc.expiryDate || 'نامحدود'}</p>
                                <p><strong>توضیحات:</strong> ${selectedDoc.description || '-'}</p>
                                <p><strong>یادداشت:</strong> ${selectedDoc.notes || '-'}</p>
                              </div>
                              ${selectedDoc.image ? `<img src="${selectedDoc.image}" />` : ''}
                              <script>window.print();</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="px-4 py-2 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>چاپ این سند</span>
                  </button>

                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="px-5 py-2 border border-[#D6CFC3] dark:border-[#3D4133] text-[#8D7F72] dark:text-[#9D978B] hover:bg-[#E6DFD3]/40 text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    بستن پنجره
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedLightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLightboxImage(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center"
            >
              <button
                onClick={() => setSelectedLightboxImage(null)}
                className="absolute -top-10 left-0 text-white font-black text-xs hover:underline cursor-pointer bg-black/40 px-3 py-1.5 rounded-xl animate-bounce"
              >
                بستن (×)
              </button>
              <img
                src={selectedLightboxImage}
                alt="بزرگنمایی سند"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
