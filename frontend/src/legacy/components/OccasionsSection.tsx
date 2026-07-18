import React, { useState } from 'react';
import { Occasion, OccasionType, BankAccount, Transaction } from '../types';
import LinkedContacts from './LinkedContacts';
import {
  Cake, Heart, CalendarDays, Bell, Star, Plus, Trash2, Gift, Clock, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PersianDatePicker from './PersianDatePicker';
import { toJalaliFriendly } from '../utils/jalali';

interface OccasionsSectionProps {
  occasions: Occasion[];
  onAddOccasion: (o: Omit<Occasion, 'id'>) => void;
  onDeleteOccasion: (id: string) => void;
  onUpdateOccasion?: (updated: Occasion) => void;
  onAddTransaction?: (newT: Omit<Transaction, 'id'>) => void;
  bankAccounts?: BankAccount[];
  contacts?: { id: string; name: string; photoUrl?: string; category?: string }[];
  onNavigateContact?: (contactId: string) => void;
}

const TODAY = '2026-07-04';

const OCCASION_TYPES: Record<OccasionType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  birthday:    { label: 'تولد',       icon: <Cake className="w-4 h-4" />,        color: '#E26645', bg: 'bg-orange-50 border-orange-200' },
  anniversary: { label: 'سالگرد',     icon: <Heart className="w-4 h-4" />,       color: '#9B6B61', bg: 'bg-rose-50 border-rose-200' },
  event:       { label: 'رویداد',     icon: <CalendarDays className="w-4 h-4" />, color: '#7C8363', bg: 'bg-[#E8ECE0] border-[#DDE2D5]' },
  deadline:    { label: 'ددلاین',     icon: <Clock className="w-4 h-4" />,       color: '#5A5A40', bg: 'bg-[#F9F1D8] border-[#EBE3C8]' },
  reminder:    { label: 'یادآور',     icon: <Bell className="w-4 h-4" />,        color: '#8D7F72', bg: 'bg-[#F4E9E4] border-[#EDDDD7]' },
};

function getNextOccurrenceDate(occasion: Occasion): string {
  const today = new Date(TODAY);
  if (occasion.recurrenceType === 'once') return occasion.date;

  const [y, m, d] = occasion.date.split('-').map(Number);
  if (occasion.recurrenceType === 'yearly') {
    let year = today.getFullYear();
    let candidate = new Date(year, m - 1, d);
    if (candidate < today) candidate = new Date(year + 1, m - 1, d);
    return candidate.toISOString().slice(0, 10);
  }
  if (occasion.recurrenceType === 'monthly') {
    let candidate = new Date(today.getFullYear(), today.getMonth(), d);
    if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, d);
    return candidate.toISOString().slice(0, 10);
  }
  return occasion.date;
}

function getDaysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date(TODAY).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '';
  return toJalaliFriendly(dateStr);
}

export default function OccasionsSection({ 
  occasions, 
  onAddOccasion, 
  onDeleteOccasion,
  onUpdateOccasion,
  onAddTransaction,
  bankAccounts = [],
  contacts = [],
  onNavigateContact,
}: OccasionsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<OccasionType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming');

  const [title, setTitle] = useState('');
  const [type, setType] = useState<OccasionType>('birthday');
  const [date, setDate] = useState('');
  const [person, setPerson] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<Occasion['recurrenceType']>('yearly');
  const [reminderDays, setReminderDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#E26645');
  const [estBudget, setEstBudget] = useState('');

  // States for logging an expense against an occasion
  const [loggingExpenseForOccasionId, setLoggingExpenseForOccasionId] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseBankId, setExpenseBankId] = useState('');

  const resetForm = () => {
    setTitle(''); setType('birthday'); setDate(''); setPerson('');
    setRecurrenceType('yearly'); setReminderDays(3); setNotes(''); setColor('#E26645');
    setEstBudget('');
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    onAddOccasion({ 
      title: title.trim(), 
      type, 
      date, 
      person: person.trim() || undefined, 
      recurrenceType, 
      reminderDaysBefore: reminderDays, 
      notes: notes.trim() || undefined, 
      color,
      estimatedBudget: estBudget ? Number(estBudget) : undefined,
      spentAmount: 0
    });
    resetForm();
  };

  // Compute upcoming info for each occasion
  const withDays = occasions.map(o => ({
    ...o,
    nextDate: getNextOccurrenceDate(o),
    daysUntil: getDaysUntil(getNextOccurrenceDate(o)),
  })).sort((a, b) => a.daysUntil - b.daysUntil);

  const filtered = withDays
    .filter(o => filterType === 'all' || o.type === filterType)
    .filter(o => viewMode === 'all' || o.daysUntil >= 0);

  const upcomingThisWeek = withDays.filter(o => o.daysUntil >= 0 && o.daysUntil <= 7);
  const upcomingThisMonth = withDays.filter(o => o.daysUntil >= 0 && o.daysUntil <= 30);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-[#2D3025] font-serif-elegant">تقویم مناسبت‌ها</h2>
          <p className="text-xs text-[#8D7F72] mt-0.5">تولد، سالگرد، رویدادها و یادآورهای مهم با هشدار پیشاپیش</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2D3025] text-white text-xs font-bold rounded-xl hover:bg-[#3D4133] transition-all cursor-pointer">
          <Plus className="w-3.5 h-3.5" />
          افزودن مناسبت
        </button>
      </div>

      {/* This week / this month highlights */}
      {upcomingThisWeek.length > 0 && (
        <div className="bg-[#F9F1D8] border border-[#EBE3C8] rounded-2xl p-4">
          <p className="text-xs font-black text-[#5A5A40] flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
            این هفته ({upcomingThisWeek.length} مناسبت)
          </p>
          <div className="flex flex-wrap gap-2">
            {upcomingThisWeek.map(o => {
              const info = OCCASION_TYPES[o.type];
              return (
                <div key={o.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-[#EBE3C8] text-[10px] font-bold text-[#2D3025]">
                  <span style={{ color: info.color }}>{info.icon}</span>
                  <span>{o.title}</span>
                  <span className="text-[#8D7F72] font-normal">
                    {o.daysUntil === 0 ? '— امروز! 🎉' : `— ${o.daysUntil} روز دیگر`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5">
            <h3 className="text-sm font-black text-[#2D3025] mb-4 font-serif-elegant">مناسبت جدید</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">عنوان مناسبت *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: تولد علی" required
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none focus:border-[#7C8363]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">نوع مناسبت</label>
                  <select value={type} onChange={e => setType(e.target.value as OccasionType)}
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none cursor-pointer">
                    {Object.entries(OCCASION_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ *</label>
                  <PersianDatePicker value={date} onChange={setDate} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">مرتبط با چه کسی</label>
                  <input type="text" value={person} onChange={e => setPerson(e.target.value)}
                    placeholder="نام شخص (اختیاری)"
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">تکرار</label>
                  <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as Occasion['recurrenceType'])}
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none cursor-pointer">
                    <option value="yearly">سالانه</option>
                    <option value="monthly">ماهانه</option>
                    <option value="once">یک‌بار</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">یادآوری چند روز قبل: {reminderDays} روز</label>
                  <input type="range" min={0} max={30} value={reminderDays} onChange={e => setReminderDays(+e.target.value)}
                    className="w-full accent-[#9B6B61]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">بودجه پیش‌بینی شده (تومان)</label>
                  <input type="number" value={estBudget} onChange={e => setEstBudget(e.target.value)}
                    placeholder="مثال: ۵۰۰۰۰۰"
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">یادداشت (اختیاری)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="مثال: دوست صمیمی از دوران دبیرستان"
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133] transition-all">
                  ذخیره مناسبت
                </button>
                <button type="button" onClick={resetForm}
                  className="px-4 py-2.5 text-xs font-bold text-[#8D7F72] border border-[#D6CFC3] rounded-xl cursor-pointer hover:bg-[#E6DFD3] transition-all">
                  انصراف
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-full border cursor-pointer transition-all ${filterType === 'all' ? 'bg-[#2D3025] text-white border-[#2D3025]' : 'bg-[#FDFBF7] text-[#8D7F72] border-[#E6DFD3]'}`}>
            همه
          </button>
          {Object.entries(OCCASION_TYPES).map(([k, v]) => {
            const count = occasions.filter(o => o.type === k).length;
            if (count === 0) return null;
            return (
              <button key={k} onClick={() => setFilterType(filterType === k as OccasionType ? 'all' : k as OccasionType)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-full border cursor-pointer transition-all ${filterType === k ? 'bg-[#2D3025] text-white border-[#2D3025]' : 'bg-[#FDFBF7] text-[#8D7F72] border-[#E6DFD3]'}`}>
                {v.label} ({count})
              </button>
            );
          })}
        </div>
        <button onClick={() => setViewMode(v => v === 'upcoming' ? 'all' : 'upcoming')}
          className="text-[10px] font-bold text-[#9B6B61] underline cursor-pointer">
          {viewMode === 'upcoming' ? 'نمایش همه' : 'فقط آینده'}
        </button>
      </div>

      {/* Occasions list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
            <Gift className="w-10 h-10 text-[#D6CFC3] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#8D7F72]">مناسبتی ثبت نشده</p>
            <p className="text-xs text-[#8D7F72] mt-1">تولد دوستان، سالگردها و رویدادها رو اضافه کن</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map(o => {
              const info = OCCASION_TYPES[o.type];
              const isToday = o.daysUntil === 0;
              const isSoon = o.daysUntil > 0 && o.daysUntil <= o.reminderDaysBefore;
              const isPast = o.daysUntil < 0;
              return (
                <motion.div key={o.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className={`bg-[#FDFBF7] rounded-2xl border p-4 flex items-start gap-4 transition-all hover:shadow-sm ${
                    isToday ? 'border-[#E26645] bg-orange-50/30' :
                    isSoon ? 'border-[#EBE3C8] bg-[#F9F1D8]/30' :
                    isPast ? 'border-[#E6DFD3] opacity-60' : 'border-[#E6DFD3]'
                  }`}>
                  {/* Date block */}
                  <div className="shrink-0 text-center w-14 flex flex-col items-center justify-center rounded-xl py-2 px-1"
                    style={{ background: `${info.color}15`, border: `1px solid ${info.color}30` }}>
                    <div className="text-lg font-black" style={{ color: info.color }}>
                      {parseInt(o.nextDate.split('-')[2])}
                    </div>
                    <div className="text-[8px] font-bold text-[#8D7F72]">
                      {['فرو','ارد','خرد','تیر','مرد','شهر','مهر','آبا','آذر','دی','بهم','اسف'][parseInt(o.nextDate.split('-')[1]) - 1]}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: info.color }}>{info.icon}</span>
                          <h4 className="text-sm font-black text-[#2D3025] font-serif-elegant">{o.title}</h4>
                          {isToday && <span className="text-[9px] font-black bg-[#E26645] text-white px-2 py-0.5 rounded-full">امروز 🎉</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-[#8D7F72]">{info.label}</span>
                          {o.person && <span className="text-[10px] text-[#8D7F72]">👤 {o.person}</span>}
                          <span className="text-[9px] font-bold text-[#8D7F72]">
                            {o.recurrenceType === 'yearly' ? '🔁 سالانه' : o.recurrenceType === 'monthly' ? '🔁 ماهانه' : '⭕ یک‌بار'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                          isToday ? 'bg-[#E26645] text-white' :
                          isSoon ? 'bg-[#F9F1D8] text-[#5A5A40]' :
                          isPast ? 'bg-[#E6DFD3] text-[#8D7F72]' : 'bg-[#E8ECE0] text-[#7C8363]'
                        }`}>
                          {isToday ? 'امروز' : isPast ? `${Math.abs(o.daysUntil)} روز پیش` : `${o.daysUntil} روز دیگر`}
                        </div>
                        <button onClick={() => onDeleteOccasion(o.id)}
                          className="p-1.5 text-[#8D7F72] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {o.reminderDaysBefore > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-[#8D7F72]">
                        <Bell className="w-3 h-3 shrink-0" />
                        <span>یادآوری {o.reminderDaysBefore} روز قبل</span>
                      </div>
                    )}

                    {o.notes && (
                      <p className="text-[10px] text-[#8D7F72] italic mt-1">{o.notes}</p>
                    )}

                    {/* Linked Contacts */}
                    {o.id && (
                      <div className="mt-2 pt-2 border-t border-[#E6DFD3]/40">
                        <LinkedContacts entityType="occasion" entityId={o.id} contacts={contacts} onNavigateContact={onNavigateContact} />
                      </div>
                    )}

                    {/* Budget & Spent progress indicator */}
                    {o.estimatedBudget !== undefined && (
                      <div className="mt-3 bg-white p-3 rounded-xl border border-[#E6DFD3] space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-[#3D3D3D]">
                          <span>پیشرفت بودجه مناسبت:</span>
                          <span>
                            {(o.spentAmount || 0).toLocaleString('fa-IR')} / {o.estimatedBudget.toLocaleString('fa-IR')} تومان
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-[#E8ECE0] h-2 rounded-full overflow-hidden relative">
                          <div 
                            className="bg-[#E26645] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((o.spentAmount || 0) / o.estimatedBudget) * 100)}%` }}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-1.5 border-t border-[#E6DFD3]/50">
                          <span className="text-[9px] text-[#8D7F72] font-semibold">
                            {o.spentAmount && o.spentAmount >= o.estimatedBudget ? '⚠️ از بودجه گذشت!' : '✅ تحت کنترل'}
                          </span>
                          <button 
                            type="button"
                            onClick={() => {
                              setLoggingExpenseForOccasionId(o.id);
                              setExpenseAmount('');
                              setExpenseDesc('');
                              if (bankAccounts.length > 0) {
                                setExpenseBankId(bankAccounts[0].id);
                              }
                            }}
                            className="text-[9px] font-black text-[#E26645] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>💸 ثبت هزینه جدید</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Log Expense Form */}
                    {loggingExpenseForOccasionId === o.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 p-3 bg-[#F9F6EE] border border-[#D6CFC3] rounded-xl space-y-2.5 text-right overflow-hidden"
                      >
                        <div className="flex justify-between items-center pb-1 border-b border-[#D6CFC3]/50">
                          <span className="text-[10px] font-black text-[#2D3025]">ثبت هزینه جدید برای {o.title}</span>
                          <button 
                            type="button" 
                            onClick={() => setLoggingExpenseForOccasionId(null)}
                            className="text-[9px] text-red-500 hover:underline"
                          >
                            انصراف
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[#8D7F72] block">مبلغ (تومان) *</label>
                            <input 
                              type="number" 
                              value={expenseAmount}
                              onChange={(e) => setExpenseAmount(e.target.value)}
                              placeholder="مثال: ۱۵۰۰۰۰"
                              className="w-full p-2 text-xs border border-[#D6CFC3] rounded-lg focus:outline-none bg-white font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[#8D7F72] block">بابت چه چیزی</label>
                            <input 
                              type="text" 
                              value={expenseDesc}
                              onChange={(e) => setExpenseDesc(e.target.value)}
                              placeholder="مثال: خرید کادو"
                              className="w-full p-2 text-xs border border-[#D6CFC3] rounded-lg focus:outline-none bg-white"
                            />
                          </div>
                        </div>

                        {bankAccounts.length > 0 && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-[#8D7F72] block">کسر از حساب بانکی</label>
                            <select 
                              value={expenseBankId}
                              onChange={(e) => setExpenseBankId(e.target.value)}
                              className="w-full p-2 text-xs border border-[#D6CFC3] rounded-lg focus:outline-none bg-white cursor-pointer font-bold text-[#3D3D3D]"
                            >
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={() => {
                            const amt = Number(expenseAmount);
                            if (!amt || isNaN(amt)) return;

                            // 1. Trigger financial transaction
                            if (onAddTransaction) {
                              onAddTransaction({
                                type: 'expense',
                                amount: amt,
                                category: 'shopping',
                                description: `هزینه مناسبت: ${o.title} (${expenseDesc || 'سایر مخارج'})`,
                                date: TODAY,
                                bankAccountId: expenseBankId || undefined
                              });
                            }

                            // 2. Update occasion's spentAmount
                            if (onUpdateOccasion) {
                              onUpdateOccasion({
                                ...o,
                                spentAmount: (o.spentAmount || 0) + amt
                              });
                            }

                            setLoggingExpenseForOccasionId(null);
                            alert('هزینه با موفقیت در این مناسبت ثبت و از حساب بانکی شما کسر گردید!');
                          }}
                          className="w-full py-1.5 bg-[#E26645] hover:bg-[#C94B2A] text-white text-xs font-black rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          ثبت و کسر نهایی از حساب
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
