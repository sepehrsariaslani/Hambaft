import React, { useState } from 'react';
import { WeightLog, VitalLog, Medication, DoctorVisit } from '../types';
import {
  Scale, Heart, Pill, Stethoscope, Plus, Trash2, Activity,
  Droplets, Thermometer, Wind, TrendingDown, TrendingUp,
  CheckCircle2, Circle, AlertTriangle, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import PersianDatePicker from './PersianDatePicker';
import { toJalali, toJalaliFriendly } from '../utils/jalali';

interface HealthSectionProps {
  weightLogs: WeightLog[];
  vitalLogs: VitalLog[];
  medications: Medication[];
  doctorVisits: DoctorVisit[];
  onAddWeightLog: (log: Omit<WeightLog, 'id'>) => void;
  onDeleteWeightLog: (id: string) => void;
  onAddVitalLog: (log: Omit<VitalLog, 'id'>) => void;
  onDeleteVitalLog: (id: string) => void;
  onAddMedication: (med: Omit<Medication, 'id' | 'logs'>) => void;
  onDeleteMedication: (id: string) => void;
  onToggleMedicationLog: (medId: string, date: string) => void;
  onToggleMedicationActive: (id: string) => void;
  onAddDoctorVisit: (visit: Omit<DoctorVisit, 'id'>) => void;
  onDeleteDoctorVisit: (id: string) => void;
}

const TODAY = '2026-07-04';

type TabId = 'weight' | 'vitals' | 'medications' | 'visits';

export default function HealthSection({
  weightLogs, vitalLogs, medications, doctorVisits,
  onAddWeightLog, onDeleteWeightLog,
  onAddVitalLog, onDeleteVitalLog,
  onAddMedication, onDeleteMedication, onToggleMedicationLog, onToggleMedicationActive,
  onAddDoctorVisit, onDeleteDoctorVisit,
}: HealthSectionProps) {
  const [activeTab, setActiveTab] = useState<TabId>('weight');

  // ─── WEIGHT STATE ──────────────────────────────────────────────────────────
  const [wDate, setWDate] = useState(TODAY);
  const [wWeight, setWWeight] = useState('');
  const [wNote, setWNote] = useState('');
  const [showWForm, setShowWForm] = useState(false);

  // ─── VITALS STATE ──────────────────────────────────────────────────────────
  const [vDate, setVDate] = useState(TODAY);
  const [vSys, setVSys] = useState('');
  const [vDia, setVDia] = useState('');
  const [vHR, setVHR] = useState('');
  const [vBS, setVBS] = useState('');
  const [vTemp, setVTemp] = useState('');
  const [vO2, setVO2] = useState('');
  const [vNote, setVNote] = useState('');
  const [showVForm, setShowVForm] = useState(false);

  // ─── MEDICATION STATE ──────────────────────────────────────────────────────
  const [mName, setMName] = useState('');
  const [mDosage, setMDosage] = useState('');
  const [mFreq, setMFreq] = useState('');
  const [mStart, setMStart] = useState(TODAY);
  const [mEnd, setMEnd] = useState('');
  const [mDoctor, setMDoctor] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [showMForm, setShowMForm] = useState(false);

  // ─── VISIT STATE ───────────────────────────────────────────────────────────
  const [dDate, setDDate] = useState(TODAY);
  const [dDoctor, setDDoctor] = useState('');
  const [dSpec, setDSpec] = useState('');
  const [dClinic, setDClinic] = useState('');
  const [dReason, setDReason] = useState('');
  const [dDiag, setDDiag] = useState('');
  const [dNext, setDNext] = useState('');
  const [dNotes, setDNotes] = useState('');
  const [showDForm, setShowDForm] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  // ─── WEIGHT CHART DATA ─────────────────────────────────────────────────────
  const weightChartData = [...weightLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-20)
    .map(l => ({ date: toJalali(l.date).slice(5) || l.date.slice(5), weight: l.weight }));

  const latestWeight = weightLogs.length > 0
    ? [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const prevWeight = weightLogs.length > 1
    ? [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[1]
    : null;
  const weightDiff = latestWeight && prevWeight ? latestWeight.weight - prevWeight.weight : null;

  // ─── VITAL CHART DATA ──────────────────────────────────────────────────────
  const vitalChartData = [...vitalLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(l => ({
      date: toJalali(l.date).slice(5) || l.date.slice(5),
      sys: l.systolic, dia: l.diastolic,
      hr: l.heartRate, bs: l.bloodSugar
    }));

  const latestVital = vitalLogs.length > 0
    ? [...vitalLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  // ─── MEDICATION ADHERENCE ──────────────────────────────────────────────────
  const activeMeds = medications.filter(m => m.active);
  const todayMeds = activeMeds.map(m => ({ ...m, takenToday: m.logs.includes(TODAY) }));

  // ─── UPCOMING DOCTOR VISITS ────────────────────────────────────────────────
  const upcomingVisits = [...doctorVisits]
    .filter(v => v.nextVisitDate && v.nextVisitDate >= TODAY)
    .sort((a, b) => (a.nextVisitDate || '').localeCompare(b.nextVisitDate || ''));

  // ─── SUBMIT HANDLERS ───────────────────────────────────────────────────────
  const submitWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wWeight) return;
    onAddWeightLog({ date: wDate, weight: parseFloat(wWeight), note: wNote || undefined });
    setWWeight(''); setWNote(''); setShowWForm(false);
  };

  const submitVital = (e: React.FormEvent) => {
    e.preventDefault();
    const log: Omit<VitalLog, 'id'> = {
      date: vDate,
      systolic: vSys ? parseInt(vSys) : undefined,
      diastolic: vDia ? parseInt(vDia) : undefined,
      heartRate: vHR ? parseInt(vHR) : undefined,
      bloodSugar: vBS ? parseInt(vBS) : undefined,
      temperature: vTemp ? parseFloat(vTemp) : undefined,
      oxygenSaturation: vO2 ? parseInt(vO2) : undefined,
      note: vNote || undefined,
    };
    onAddVitalLog(log);
    setVSys(''); setVDia(''); setVHR(''); setVBS(''); setVTemp(''); setVO2(''); setVNote('');
    setShowVForm(false);
  };

  const submitMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName || !mDosage || !mFreq) return;
    onAddMedication({
      name: mName, dosage: mDosage, frequency: mFreq,
      startDate: mStart, endDate: mEnd || undefined,
      prescribedBy: mDoctor || undefined, notes: mNotes || undefined, active: true
    });
    setMName(''); setMDosage(''); setMFreq(''); setMEnd(''); setMDoctor(''); setMNotes('');
    setShowMForm(false);
  };

  const submitVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dDoctor || !dSpec || !dReason) return;
    onAddDoctorVisit({
      date: dDate, doctorName: dDoctor, specialty: dSpec,
      clinic: dClinic || undefined, reason: dReason,
      diagnosis: dDiag || undefined, nextVisitDate: dNext || undefined,
      notes: dNotes || undefined
    });
    setDDoctor(''); setDSpec(''); setDClinic(''); setDReason(''); setDDiag(''); setDNext(''); setDNotes('');
    setShowDForm(false);
  };

  // ─── BP STATUS ─────────────────────────────────────────────────────────────
  const bpStatus = (sys?: number, dia?: number) => {
    if (!sys || !dia) return null;
    if (sys < 120 && dia < 80) return { label: 'طبیعی', color: 'text-[#7C8363]', bg: 'bg-[#E8ECE0]' };
    if (sys < 130 && dia < 80) return { label: 'بالا-مرزی', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (sys < 140 || dia < 90) return { label: 'فشار بالا ۱', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'فشار بالا ۲', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'weight',      label: 'وزن',          icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'vitals',      label: 'علائم حیاتی',  icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'medications', label: 'داروها',        icon: <Pill className="w-3.5 h-3.5" /> },
    { id: 'visits',      label: 'ویزیت پزشک',   icon: <Stethoscope className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-[#2D3025] font-serif-elegant">ردیابی سلامت جسمی</h2>
        <p className="text-xs text-[#8D7F72] mt-0.5">وزن، علائم حیاتی، داروها و ویزیت‌های پزشکی</p>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#FDFBF7] border border-[#DDE2D5] rounded-2xl p-4">
          <div className="flex justify-between items-start mb-2">
            <Scale className="w-4 h-4 text-[#7C8363]" />
            {weightDiff !== null && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${weightDiff < 0 ? 'bg-[#E8ECE0] text-[#7C8363]' : 'bg-[#F4E9E4] text-[#9B6B61]'}`}>
                {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-[#2D3025]">{latestWeight ? latestWeight.weight : '—'}</div>
          <div className="text-[9px] text-[#8D7F72] font-bold">کیلوگرم — آخرین وزن</div>
        </div>

        <div className="bg-[#FDFBF7] border border-[#EDDDD7] rounded-2xl p-4">
          <Heart className="w-4 h-4 text-[#9B6B61] mb-2" />
          <div className="text-2xl font-black text-[#2D3025]">
            {latestVital?.systolic && latestVital?.diastolic
              ? `${latestVital.systolic}/${latestVital.diastolic}`
              : '—'}
          </div>
          <div className="text-[9px] text-[#8D7F72] font-bold">فشار خون (mmHg)</div>
          {latestVital?.systolic && latestVital?.diastolic && (() => {
            const s = bpStatus(latestVital.systolic, latestVital.diastolic);
            return s ? <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full mt-1 inline-block ${s.bg} ${s.color}`}>{s.label}</span> : null;
          })()}
        </div>

        <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-4">
          <Pill className="w-4 h-4 text-[#5A5A40] mb-2" />
          <div className="text-2xl font-black text-[#2D3025]">{activeMeds.length}</div>
          <div className="text-[9px] text-[#8D7F72] font-bold">داروی فعال</div>
          {activeMeds.length > 0 && (
            <div className="text-[8px] text-[#8D7F72] mt-1">
              {todayMeds.filter(m => m.takenToday).length}/{activeMeds.length} امروز مصرف
            </div>
          )}
        </div>

        <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-4">
          <Stethoscope className="w-4 h-4 text-[#8D7F72] mb-2" />
          <div className="text-2xl font-black text-[#2D3025]">{doctorVisits.length}</div>
          <div className="text-[9px] text-[#8D7F72] font-bold">ویزیت ثبت‌شده</div>
          {upcomingVisits.length > 0 && (
            <div className="text-[8px] text-amber-600 font-bold mt-1">{upcomingVisits.length} ویزیت پیش رو</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#E6DFD3]/40 p-1 rounded-xl border border-[#E6DFD3] flex gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${activeTab === t.id ? 'bg-[#2D3025] text-white shadow-xs' : 'text-[#8D7F72] hover:text-[#2D3025]'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── WEIGHT TAB ── */}
      {activeTab === 'weight' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#2D3025] font-serif-elegant">نمودار وزن</h3>
            <button onClick={() => setShowWForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133] transition-all">
              <Plus className="w-3.5 h-3.5" />ثبت وزن
            </button>
          </div>

          <AnimatePresence>
            {showWForm && (
              <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={submitWeight}
                className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ</label>
                  <PersianDatePicker value={wDate} onChange={setWDate} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">وزن (کیلوگرم) *</label>
                  <input type="number" step="0.1" value={wWeight} onChange={e => setWWeight(e.target.value)} required
                    placeholder="مثال: ۸۷.۵"
                    className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#8D7F72]">یادداشت</label>
                  <div className="flex gap-2">
                    <input type="text" value={wNote} onChange={e => setWNote(e.target.value)}
                      placeholder="اختیاری"
                      className="flex-1 p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                    <button type="submit" className="px-4 py-2.5 bg-[#7C8363] text-white text-xs font-bold rounded-xl cursor-pointer">ثبت</button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {weightChartData.length > 1 ? (
            <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8D7F72' }} stroke="#E6DFD3" />
                    <YAxis tick={{ fontSize: 9, fill: '#8D7F72' }} width={40} stroke="#E6DFD3"
                      domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip formatter={(v: number) => [`${v} kg`, 'وزن']} labelFormatter={l => `تاریخ: ${l}`} />
                    <Area type="monotone" dataKey="weight" stroke="#7C8363" fill="#7C8363" fillOpacity={0.15} strokeWidth={2.5} dot={{ fill: '#7C8363', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
              <Scale className="w-10 h-10 text-[#D6CFC3] mx-auto mb-2" />
              <p className="text-xs text-[#8D7F72] font-bold">حداقل ۲ رکورد برای نمایش نمودار نیاز است</p>
            </div>
          )}

          {/* Weight log list */}
          <div className="space-y-2">
            {[...weightLogs].sort((a, b) => b.date.localeCompare(a.date)).map((log, idx) => {
              const prev = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[idx + 1];
              const diff = prev ? log.weight - prev.weight : null;
              return (
                <div key={log.id} className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-black text-[#2D3025]">{log.weight} <span className="font-normal text-[#8D7F72] text-[10px]">kg</span></div>
                    {diff !== null && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${diff < 0 ? 'bg-[#E8ECE0] text-[#7C8363]' : diff > 0 ? 'bg-[#F4E9E4] text-[#9B6B61]' : 'bg-[#E6DFD3] text-[#8D7F72]'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                    {log.note && <span className="text-[10px] text-[#8D7F72] italic">{log.note}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#8D7F72] font-mono">{toJalaliFriendly(log.date)}</span>
                    <button onClick={() => onDeleteWeightLog(log.id)}
                      className="p-1 text-[#8D7F72] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VITALS TAB ── */}
      {activeTab === 'vitals' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#2D3025] font-serif-elegant">علائم حیاتی</h3>
            <button onClick={() => setShowVForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133] transition-all">
              <Plus className="w-3.5 h-3.5" />ثبت علائم
            </button>
          </div>

          <AnimatePresence>
            {showVForm && (
              <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={submitVital}
                className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ</label>
                    <PersianDatePicker value={vDate} onChange={setVDate} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] flex items-center gap-1"><Heart className="w-3 h-3 text-[#9B6B61]" />فشار خون بالا (sys)</label>
                    <input type="number" value={vSys} onChange={e => setVSys(e.target.value)} placeholder="مثال: ۱۲۰"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">فشار خون پایین (dia)</label>
                    <input type="number" value={vDia} onChange={e => setVDia(e.target.value)} placeholder="مثال: ۸۰"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] flex items-center gap-1"><Activity className="w-3 h-3 text-[#9B6B61]" />ضربان قلب (bpm)</label>
                    <input type="number" value={vHR} onChange={e => setVHR(e.target.value)} placeholder="مثال: ۷۲"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-500" />قند خون (mg/dL)</label>
                    <input type="number" value={vBS} onChange={e => setVBS(e.target.value)} placeholder="مثال: ۹۵"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] flex items-center gap-1"><Thermometer className="w-3 h-3 text-orange-500" />دمای بدن (°C)</label>
                    <input type="number" step="0.1" value={vTemp} onChange={e => setVTemp(e.target.value)} placeholder="مثال: ۳۶.۸"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72] flex items-center gap-1"><Wind className="w-3 h-3 text-sky-500" />اشباع اکسیژن (%)</label>
                    <input type="number" value={vO2} onChange={e => setVO2(e.target.value)} placeholder="مثال: ۹۸"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#8D7F72]">یادداشت</label>
                    <input type="text" value={vNote} onChange={e => setVNote(e.target.value)} placeholder="اختیاری"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2.5 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133]">ذخیره علائم</button>
                  <button type="button" onClick={() => setShowVForm(false)} className="px-4 text-xs font-bold text-[#8D7F72] border border-[#D6CFC3] rounded-xl cursor-pointer hover:bg-[#E6DFD3]">انصراف</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* BP/HR chart */}
          {vitalChartData.length > 1 && (
            <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5 space-y-2">
              <p className="text-xs font-bold text-[#2D3025] font-serif-elegant">نمودار فشار خون و ضربان قلب</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6DFD3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8D7F72' }} stroke="#E6DFD3" />
                    <YAxis tick={{ fontSize: 9, fill: '#8D7F72' }} stroke="#E6DFD3" width={30} />
                    <Tooltip formatter={(v: number, n: string) => [v, n === 'sys' ? 'سیستولیک' : n === 'dia' ? 'دیاستولیک' : 'ضربان قلب']} />
                    <Line type="monotone" dataKey="sys" stroke="#9B6B61" strokeWidth={2} dot={{ r: 3, fill: '#9B6B61' }} connectNulls />
                    <Line type="monotone" dataKey="dia" stroke="#E26645" strokeWidth={2} dot={{ r: 3, fill: '#E26645' }} connectNulls />
                    <Line type="monotone" dataKey="hr"  stroke="#7C8363" strokeWidth={2} dot={{ r: 3, fill: '#7C8363' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-[9px] font-bold">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#9B6B61] inline-block" />سیستولیک</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#E26645] inline-block" />دیاستولیک</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#7C8363] inline-block" />ضربان قلب</span>
              </div>
            </div>
          )}

          {/* Vitals list */}
          <div className="space-y-2">
            {[...vitalLogs].sort((a, b) => b.date.localeCompare(a.date)).map(log => {
              const bp = bpStatus(log.systolic, log.diastolic);
              return (
                <div key={log.id} className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-[#8D7F72] font-mono">{toJalaliFriendly(log.date)}</span>
                    <div className="flex items-center gap-2">
                      {bp && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${bp.bg} ${bp.color}`}>{bp.label}</span>}
                      <button onClick={() => onDeleteVitalLog(log.id)} className="p-1 text-[#8D7F72] hover:text-red-500 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {log.systolic && log.diastolic && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Heart className="w-3 h-3 text-[#9B6B61]" />
                        <span className="font-black text-[#2D3025]">{log.systolic}/{log.diastolic}</span>
                        <span className="text-[9px] text-[#8D7F72]">mmHg</span>
                      </div>
                    )}
                    {log.heartRate && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Activity className="w-3 h-3 text-[#7C8363]" />
                        <span className="font-black text-[#2D3025]">{log.heartRate}</span>
                        <span className="text-[9px] text-[#8D7F72]">bpm</span>
                      </div>
                    )}
                    {log.bloodSugar && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span className="font-black text-[#2D3025]">{log.bloodSugar}</span>
                        <span className="text-[9px] text-[#8D7F72]">mg/dL</span>
                      </div>
                    )}
                    {log.temperature && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Thermometer className="w-3 h-3 text-orange-500" />
                        <span className="font-black text-[#2D3025]">{log.temperature}</span>
                        <span className="text-[9px] text-[#8D7F72]">°C</span>
                      </div>
                    )}
                    {log.oxygenSaturation && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Wind className="w-3 h-3 text-sky-500" />
                        <span className="font-black text-[#2D3025]">{log.oxygenSaturation}</span>
                        <span className="text-[9px] text-[#8D7F72]">%O₂</span>
                      </div>
                    )}
                  </div>
                  {log.note && <p className="text-[10px] text-[#8D7F72] mt-1.5 italic">{log.note}</p>}
                </div>
              );
            })}
            {vitalLogs.length === 0 && (
              <div className="py-10 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
                <Activity className="w-10 h-10 text-[#D6CFC3] mx-auto mb-2" />
                <p className="text-xs text-[#8D7F72] font-bold">هنوز علائم حیاتی ثبت نشده</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MEDICATIONS TAB ── */}
      {activeTab === 'medications' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#2D3025] font-serif-elegant">داروهای من</h3>
            <button onClick={() => setShowMForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133] transition-all">
              <Plus className="w-3.5 h-3.5" />افزودن دارو
            </button>
          </div>

          {/* Today's medication checklist */}
          {todayMeds.length > 0 && (
            <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-[#2D3025]">✅ چک‌لیست داروی امروز</p>
              {todayMeds.map(m => (
                <button key={m.id} onClick={() => onToggleMedicationLog(m.id, TODAY)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right cursor-pointer transition-all ${m.takenToday ? 'bg-[#E8ECE0] border-[#DDE2D5]' : 'bg-white border-[#E6DFD3] hover:border-[#9B6B61]'}`}>
                  {m.takenToday
                    ? <CheckCircle2 className="w-4 h-4 text-[#7C8363] shrink-0" />
                    : <Circle className="w-4 h-4 text-[#D6CFC3] shrink-0" />}
                  <div className="flex-1">
                    <span className={`text-xs font-bold ${m.takenToday ? 'text-[#7C8363] line-through' : 'text-[#2D3025]'}`}>{m.name}</span>
                    <span className="text-[10px] text-[#8D7F72] mr-2">{m.dosage} — {m.frequency}</span>
                  </div>
                  {m.takenToday && <span className="text-[9px] font-black text-[#7C8363] bg-[#DDE2D5] px-2 py-0.5 rounded-full">مصرف شد</span>}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {showMForm && (
              <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={submitMedication}
                className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">نام دارو *</label>
                    <input type="text" value={mName} onChange={e => setMName(e.target.value)} required
                      placeholder="مثال: قرص آموکسی‌سیلین"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">دوز مصرفی *</label>
                    <input type="text" value={mDosage} onChange={e => setMDosage(e.target.value)} required
                      placeholder="مثال: ۵۰۰ میلی‌گرم"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">دفعات مصرف *</label>
                    <input type="text" value={mFreq} onChange={e => setMFreq(e.target.value)} required
                      placeholder="مثال: روزی ۳ بار"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تجویزکننده</label>
                    <input type="text" value={mDoctor} onChange={e => setMDoctor(e.target.value)}
                      placeholder="نام پزشک (اختیاری)"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ شروع</label>
                    <PersianDatePicker value={mStart} onChange={setMStart} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ پایان (اختیاری)</label>
                    <PersianDatePicker value={mEnd} onChange={setMEnd} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2.5 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer">ذخیره دارو</button>
                  <button type="button" onClick={() => setShowMForm(false)} className="px-4 text-xs font-bold text-[#8D7F72] border border-[#D6CFC3] rounded-xl cursor-pointer hover:bg-[#E6DFD3]">انصراف</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Medication cards */}
          <div className="space-y-3">
            {medications.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
                <Pill className="w-10 h-10 text-[#D6CFC3] mx-auto mb-2" />
                <p className="text-xs text-[#8D7F72] font-bold">داروی ثبت‌شده‌ای وجود ندارد</p>
              </div>
            ) : medications.map(med => {
              const streak = (() => {
                let s = 0;
                let d = new Date(TODAY);
                while (true) {
                  const ds = d.toISOString().slice(0, 10);
                  if (!med.logs.includes(ds)) break;
                  s++; d.setDate(d.getDate() - 1);
                }
                return s;
              })();
              return (
                <div key={med.id} className={`bg-[#FDFBF7] border rounded-2xl p-4 space-y-3 ${med.active ? 'border-[#E6DFD3]' : 'border-[#E6DFD3] opacity-60'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl ${med.active ? 'bg-[#E8ECE0]' : 'bg-[#E6DFD3]'}`}>
                        <Pill className={`w-4 h-4 ${med.active ? 'text-[#7C8363]' : 'text-[#8D7F72]'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#2D3025]">{med.name}</p>
                        <p className="text-[10px] text-[#8D7F72]">{med.dosage} — {med.frequency}</p>
                        {med.prescribedBy && <p className="text-[10px] text-[#8D7F72]">👨‍⚕️ {med.prescribedBy}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {med.active && streak > 0 && (
                        <span className="text-[9px] font-black bg-[#F9F1D8] text-[#5A5A40] px-2 py-0.5 rounded-full border border-[#EBE3C8]">🔥 {streak} روز</span>
                      )}
                      <button onClick={() => onToggleMedicationActive(med.id)}
                        className={`text-[9px] font-black px-2 py-1 rounded-lg border cursor-pointer ${med.active ? 'bg-[#E8ECE0] text-[#7C8363] border-[#DDE2D5]' : 'bg-[#F4E9E4] text-[#9B6B61] border-[#EDDDD7]'}`}>
                        {med.active ? 'فعال' : 'غیرفعال'}
                      </button>
                      <button onClick={() => onDeleteMedication(med.id)}
                        className="p-1.5 text-[#8D7F72] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-[#8D7F72]">
                    <span>شروع: {med.startDate}</span>
                    {med.endDate && <span>پایان: {med.endDate}</span>}
                    <span>{med.logs.length} بار مصرف ثبت‌شده</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DOCTOR VISITS TAB ── */}
      {activeTab === 'visits' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-[#2D3025] font-serif-elegant">ویزیت‌های پزشکی</h3>
            <button onClick={() => setShowDForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#3D4133] transition-all">
              <Plus className="w-3.5 h-3.5" />ثبت ویزیت
            </button>
          </div>

          {upcomingVisits.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />ویزیت‌های پیش رو
              </p>
              {upcomingVisits.map(v => (
                <div key={v.id} className="flex items-center gap-2 text-[10px] font-semibold text-amber-800">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>دکتر {v.doctorName} ({v.specialty})</span>
                  <span className="text-amber-600">— {v.nextVisitDate}</span>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {showDForm && (
              <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={submitVisit}
                className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ ویزیت</label>
                    <PersianDatePicker value={dDate} onChange={setDDate} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">نام پزشک *</label>
                    <input type="text" value={dDoctor} onChange={e => setDDoctor(e.target.value)} required
                      placeholder="مثال: دکتر احمدی"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تخصص *</label>
                    <input type="text" value={dSpec} onChange={e => setDSpec(e.target.value)} required
                      placeholder="مثال: قلب و عروق"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">نام مطب / بیمارستان</label>
                    <input type="text" value={dClinic} onChange={e => setDClinic(e.target.value)}
                      placeholder="مثال: بیمارستان شریعتی"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#8D7F72]">دلیل مراجعه *</label>
                    <input type="text" value={dReason} onChange={e => setDReason(e.target.value)} required
                      placeholder="مثال: بررسی فشار خون بالا"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تشخیص پزشک</label>
                    <input type="text" value={dDiag} onChange={e => setDDiag(e.target.value)}
                      placeholder="مثال: فشار خون مرحله ۱"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#8D7F72]">تاریخ ویزیت بعدی</label>
                    <PersianDatePicker value={dNext} onChange={setDNext} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#8D7F72]">یادداشت‌های اضافه</label>
                    <input type="text" value={dNotes} onChange={e => setDNotes(e.target.value)}
                      placeholder="نسخه، آزمایشات، توصیه‌های پزشک..."
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2.5 bg-[#2D3025] text-white text-xs font-bold rounded-xl cursor-pointer">ذخیره ویزیت</button>
                  <button type="button" onClick={() => setShowDForm(false)} className="px-4 text-xs font-bold text-[#8D7F72] border border-[#D6CFC3] rounded-xl cursor-pointer hover:bg-[#E6DFD3]">انصراف</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Visit cards */}
          <div className="space-y-3">
            {doctorVisits.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
                <Stethoscope className="w-10 h-10 text-[#D6CFC3] mx-auto mb-2" />
                <p className="text-xs text-[#8D7F72] font-bold">هنوز ویزیت پزشکی ثبت نشده</p>
              </div>
            ) : [...doctorVisits].sort((a, b) => b.date.localeCompare(a.date)).map(visit => {
              const expanded = expandedVisit === visit.id;
              return (
                <div key={visit.id} className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandedVisit(expanded ? null : visit.id)}
                    className="w-full flex items-center gap-4 p-4 text-right cursor-pointer hover:bg-[#F4F0E8] transition-colors">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-[#F4E9E4] border border-[#EDDDD7] flex flex-col items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-[#9B6B61]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-[#2D3025]">دکتر {visit.doctorName}</p>
                      <p className="text-[10px] text-[#8D7F72]">{visit.specialty}{visit.clinic ? ` — ${visit.clinic}` : ''}</p>
                      <p className="text-[10px] text-[#8D7F72] font-mono">{toJalaliFriendly(visit.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {visit.nextVisitDate && visit.nextVisitDate >= TODAY && (
                        <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">ویزیت بعدی</span>
                      )}
                      {expanded ? <ChevronUp className="w-4 h-4 text-[#8D7F72]" /> : <ChevronDown className="w-4 h-4 text-[#8D7F72]" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[#E6DFD3] px-4 pb-4 pt-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div><span className="text-[#8D7F72] font-semibold">دلیل مراجعه: </span><span className="text-[#2D3025]">{visit.reason}</span></div>
                          {visit.diagnosis && <div><span className="text-[#8D7F72] font-semibold">تشخیص: </span><span className="text-[#2D3025] font-bold">{visit.diagnosis}</span></div>}
                          {visit.nextVisitDate && <div><span className="text-[#8D7F72] font-semibold">ویزیت بعدی: </span><span className="text-[#2D3025] font-mono">{toJalaliFriendly(visit.nextVisitDate)}</span></div>}
                          {visit.notes && <div className="md:col-span-2"><span className="text-[#8D7F72] font-semibold">یادداشت: </span><span className="text-[#2D3025] italic">{visit.notes}</span></div>}
                        </div>
                        <button onClick={() => onDeleteDoctorVisit(visit.id)}
                          className="flex items-center gap-1.5 text-[10px] text-red-500 hover:text-red-600 font-bold cursor-pointer mt-2">
                          <Trash2 className="w-3 h-3" />حذف این ویزیت
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
