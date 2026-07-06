import React, { useState, useEffect, useRef } from 'react';
import { MindfulnessSession } from '../types';
import {
  Wind, Brain, Heart, Smile, Play, Pause, RotateCcw, Plus, Trash2,
  TrendingDown, Activity, CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface MindfulnessSectionProps {
  sessions: MindfulnessSession[];
  onAddSession: (s: Omit<MindfulnessSession, 'id'>) => void;
  onDeleteSession: (id: string) => void;
}

type SessionType = MindfulnessSession['type'];

const SESSION_TYPES: Record<SessionType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  meditation:  { label: 'مدیتیشن',        icon: <Brain className="w-5 h-5" />,   color: '#7C8363', desc: 'تمرکز و آرامش ذهنی' },
  breathing:   { label: 'تنفس عمیق',      icon: <Wind className="w-5 h-5" />,    color: '#9B6B61', desc: 'کنترل استرس با تنفس' },
  'body-scan': { label: 'اسکن بدن',       icon: <Activity className="w-5 h-5" />, color: '#5A5A40', desc: 'آگاهی از احساسات بدنی' },
  gratitude:   { label: 'شکرگزاری',       icon: <Smile className="w-5 h-5" />,   color: '#D4AF37', desc: 'تمرین قدردانی روزانه' },
};

const BREATHING_PATTERNS = [
  { label: '۴-۷-۸', inhale: 4, hold: 7, exhale: 8, desc: 'برای کاهش اضطراب' },
  { label: 'جعبه‌ای', inhale: 4, hold: 4, exhale: 4, desc: 'برای تمرکز بهتر' },
  { label: 'آرامش ۴-۴', inhale: 4, hold: 0, exhale: 4, desc: 'ساده و سریع' },
];

export default function MindfulnessSection({ sessions, onAddSession, onDeleteSession }: MindfulnessSectionProps) {
  const [activeTab, setActiveTab] = useState<'timer' | 'breathing' | 'log'>('timer');

  // ── MEDITATION TIMER ──────────────────────────────────────────────
  const [timerType, setTimerType] = useState<SessionType>('meditation');
  const [timerDuration, setTimerDuration] = useState(10);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const [stressBefore, setStressBefore] = useState(5);
  const [stressAfter, setStressAfter] = useState(3);
  const [sessionNote, setSessionNote] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = timerDuration * 60;
  const elapsed = timerSeconds;
  const remaining = totalSeconds - elapsed;
  const progress = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;
  const remMin = Math.floor(remaining / 60);
  const remSec = remaining % 60;

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev >= totalSeconds - 1) {
            setTimerRunning(false);
            setTimerDone(true);
            return totalSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning, totalSeconds]);

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerDone(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const saveSession = () => {
    onAddSession({
      date: new Date().toISOString().slice(0, 10),
      type: timerType,
      durationMinutes: timerDuration,
      stressLevelBefore: stressBefore,
      stressLevelAfter: stressAfter,
      notes: sessionNote.trim() || undefined,
    });
    resetTimer();
    setStressBefore(5);
    setStressAfter(3);
    setSessionNote('');
    setTimerDone(false);
  };

  // ── BREATHING EXERCISE ────────────────────────────────────────────
  const [breathPattern, setBreathPattern] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'idle'>('idle');
  const [breathCount, setBreathPhaseCount] = useState(0);
  const [breathCycles, setBreathCycles] = useState(0);
  const [breathRunning, setBreathRunning] = useState(false);
  const breathRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pattern = BREATHING_PATTERNS[breathPattern];

  const runBreathCycle = (p: typeof BREATHING_PATTERNS[0]) => {
    setBreathPhase('inhale');
    setBreathPhaseCount(p.inhale);
    let t = 0;
    const tick = (phase: 'inhale' | 'hold' | 'exhale', dur: number, next: () => void) => {
      setBreathPhase(phase);
      let cnt = dur;
      setBreathPhaseCount(cnt);
      const iv = setInterval(() => {
        cnt--;
        setBreathPhaseCount(cnt);
        if (cnt <= 0) { clearInterval(iv); next(); }
      }, 1000);
    };
    tick('inhale', p.inhale, () => {
      if (p.hold > 0) {
        tick('hold', p.hold, () => {
          tick('exhale', p.exhale, () => {
            setBreathCycles(c => c + 1);
            if (breathRunning) runBreathCycle(p);
          });
        });
      } else {
        tick('exhale', p.exhale, () => {
          setBreathCycles(c => c + 1);
          if (breathRunning) runBreathCycle(p);
        });
      }
    });
  };

  const startBreathing = () => {
    setBreathRunning(true);
    setBreathCycles(0);
    runBreathCycle(pattern);
  };

  const stopBreathing = () => {
    setBreathRunning(false);
    setBreathPhase('idle');
    if (breathRef.current) clearTimeout(breathRef.current);
  };

  const breathPhaseLabel: Record<string, string> = {
    inhale: 'نفس بکش', hold: 'نگه دار', exhale: 'بازدم', idle: 'آماده'
  };
  const breathBgColor = breathPhase === 'inhale' ? '#7C8363' : breathPhase === 'hold' ? '#5A5A40' : breathPhase === 'exhale' ? '#9B6B61' : '#8D7F72';

  // ── LOG / STATS ───────────────────────────────────────────────────
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const totalMinutes = sessions.reduce((s, x) => s + x.durationMinutes, 0);
  const avgReduction = sessions.length > 0
    ? Math.round(sessions.reduce((s, x) => s + (x.stressLevelBefore - x.stressLevelAfter), 0) / sessions.length * 10) / 10
    : 0;

  const chartData = [...sessions].sort((a, b) => a.date.localeCompare(b.date)).slice(-14).map(s => ({
    date: s.date.slice(5),
    before: s.stressLevelBefore,
    after: s.stressLevelAfter,
  }));

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-[#2D3025] font-serif-elegant">تمرین ذهن‌آگاهی</h2>
        <p className="text-xs text-[#8D7F72] mt-0.5">مدیتیشن، تنفس عمیق و ردیابی استرس روزانه</p>
      </div>

      {/* Stats top row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#FDFBF7] border border-[#E8ECE0] rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-[#7C8363]">{sessions.length}</div>
          <div className="text-[9px] font-bold text-[#8D7F72] mt-0.5">جلسه ثبت‌شده</div>
        </div>
        <div className="bg-[#FDFBF7] border border-[#E8ECE0] rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-[#2D3025]">{totalMinutes}</div>
          <div className="text-[9px] font-bold text-[#8D7F72] mt-0.5">دقیقه تمرین</div>
        </div>
        <div className="bg-[#FDFBF7] border border-[#EDDDD7] rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-[#9B6B61]">↓{avgReduction}</div>
          <div className="text-[9px] font-bold text-[#8D7F72] mt-0.5">کاهش میانگین استرس</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#E6DFD3]/40 p-1 rounded-xl border border-[#E6DFD3] flex gap-1">
        {([['timer','تایمر مدیتیشن'],['breathing','تنفس هدایت‌شده'],['log','تاریخچه جلسات']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeTab === id ? 'bg-[#2D3025] text-white shadow-xs' : 'text-[#8D7F72] hover:text-[#2D3025]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TIMER TAB ── */}
      {activeTab === 'timer' && (
        <div className="space-y-5">
          {/* Session type selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(SESSION_TYPES) as [SessionType, typeof SESSION_TYPES[SessionType]][]).map(([k, v]) => (
              <button key={k} onClick={() => { setTimerType(k); resetTimer(); }}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${timerType === k ? 'border-2 shadow-sm' : 'border-[#E6DFD3] bg-[#FDFBF7] hover:border-[#D6CFC3]'}`}
                style={timerType === k ? { borderColor: v.color, background: `${v.color}15` } : {}}>
                <div style={{ color: v.color }} className="mb-1">{v.icon}</div>
                <div className="text-xs font-black text-[#2D3025]">{v.label}</div>
                <div className="text-[9px] text-[#8D7F72]">{v.desc}</div>
              </button>
            ))}
          </div>

          {/* Duration selector */}
          <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-4">
            <p className="text-[10px] font-bold text-[#8D7F72] mb-3">مدت زمان جلسه</p>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 15, 20, 30, 45].map(d => (
                <button key={d} onClick={() => { setTimerDuration(d); resetTimer(); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${timerDuration === d ? 'bg-[#2D3025] text-white border-[#2D3025]' : 'bg-white border-[#D6CFC3] text-[#8D7F72] hover:border-[#9B6B61]'}`}>
                  {d} دقیقه
                </button>
              ))}
            </div>
          </div>

          {/* Circular timer */}
          <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-3xl p-8 flex flex-col items-center gap-6">
            <div className="relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
                <circle cx="72" cy="72" r="62" fill="none" stroke="#E6DFD3" strokeWidth="8" />
                <circle cx="72" cy="72" r="62" fill="none"
                  stroke={SESSION_TYPES[timerType].color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 62}`}
                  strokeDashoffset={`${2 * Math.PI * 62 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#2D3025]">
                  {String(remMin).padStart(2, '0')}:{String(remSec).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-[#8D7F72] mt-1">
                  {timerDone ? '✅ تمام شد' : timerRunning ? 'در حال تمرین' : 'آماده شروع'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {!timerDone ? (
                <>
                  <button onClick={() => setTimerRunning(v => !v)}
                    className="flex items-center gap-2 px-6 py-2.5 text-white text-xs font-black rounded-xl cursor-pointer transition-all hover:opacity-90"
                    style={{ background: SESSION_TYPES[timerType].color }}>
                    {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {timerRunning ? 'توقف' : 'شروع'}
                  </button>
                  {elapsed > 0 && (
                    <button onClick={resetTimer}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#8D7F72] border border-[#D6CFC3] rounded-xl cursor-pointer hover:bg-[#E6DFD3]">
                      <RotateCcw className="w-3.5 h-3.5" />
                      ریست
                    </button>
                  )}
                </>
              ) : (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-4 border-t border-[#E6DFD3] pt-4">
                    <p className="text-sm font-black text-[#2D3025] text-center">🎉 جلسه تموم شد! سطح استرس رو ثبت کن</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#8D7F72]">استرس قبل از جلسه: {stressBefore}/۱۰</label>
                        <input type="range" min={1} max={10} value={stressBefore} onChange={e => setStressBefore(+e.target.value)}
                          className="w-full accent-[#9B6B61]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#8D7F72]">استرس بعد از جلسه: {stressAfter}/۱۰</label>
                        <input type="range" min={1} max={10} value={stressAfter} onChange={e => setStressAfter(+e.target.value)}
                          className="w-full accent-[#7C8363]" />
                      </div>
                    </div>
                    <input type="text" value={sessionNote} onChange={e => setSessionNote(e.target.value)}
                      placeholder="یادداشت اختیاری (چه احساسی داری؟)"
                      className="w-full p-2.5 text-xs border border-[#D6CFC3] rounded-xl bg-white focus:outline-none" />
                    <div className="flex gap-2">
                      <button onClick={saveSession}
                        className="flex-1 py-2.5 bg-[#7C8363] text-white text-xs font-black rounded-xl cursor-pointer hover:bg-[#5A6347]">
                        <CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />
                        ذخیره جلسه
                      </button>
                      <button onClick={resetTimer}
                        className="px-4 text-xs font-bold text-[#8D7F72] border border-[#D6CFC3] rounded-xl cursor-pointer hover:bg-[#E6DFD3]">
                        رد کردن
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BREATHING TAB ── */}
      {activeTab === 'breathing' && (
        <div className="space-y-5">
          {/* Pattern selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {BREATHING_PATTERNS.map((p, i) => (
              <button key={i} onClick={() => { setBreathPattern(i); stopBreathing(); }}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${breathPattern === i ? 'bg-[#2D3025] text-white border-[#2D3025]' : 'bg-[#FDFBF7] border-[#E6DFD3] text-[#2D3025] hover:border-[#9B6B61]'}`}>
                <div className={`text-lg font-black font-serif-elegant ${breathPattern === i ? 'text-white' : 'text-[#9B6B61]'}`}>{p.label}</div>
                <div className={`text-[10px] mt-1 font-semibold ${breathPattern === i ? 'text-[#DDE2D5]' : 'text-[#8D7F72]'}`}>{p.desc}</div>
                <div className={`text-[9px] mt-1 ${breathPattern === i ? 'text-[#DDE2D5]/70' : 'text-[#8D7F72]/70'}`}>
                  دم {p.inhale}s {p.hold > 0 ? `• نگه {p.hold}s ` : ''}• بازدم {p.exhale}s
                </div>
              </button>
            ))}
          </div>

          {/* Breathing visualizer */}
          <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-3xl p-10 flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{
                  scale: breathPhase === 'inhale' ? 1.6 : breathPhase === 'hold' ? 1.6 : 1.0,
                  opacity: breathPhase === 'idle' ? 0.5 : 1,
                }}
                transition={{ duration: breathPhase === 'inhale' ? pattern.inhale : breathPhase === 'exhale' ? pattern.exhale : 0.3, ease: 'easeInOut' }}
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ background: `${breathBgColor}25`, border: `3px solid ${breathBgColor}50` }}>
                <motion.div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: breathBgColor }}
                  animate={{ scale: breathPhase === 'idle' ? 1 : 1 }}>
                  <Wind className="w-8 h-8 text-white" />
                </motion.div>
              </motion.div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-black text-[#2D3025]">{breathPhaseLabel[breathPhase]}</div>
              {breathPhase !== 'idle' && (
                <div className="text-4xl font-black mt-1" style={{ color: breathBgColor }}>{breathCount}</div>
              )}
              {breathCycles > 0 && (
                <div className="text-xs text-[#8D7F72] mt-2">{breathCycles} چرخه تکمیل شد</div>
              )}
            </div>

            <button onClick={breathRunning ? stopBreathing : startBreathing}
              className="flex items-center gap-2 px-8 py-3 text-white text-sm font-black rounded-2xl cursor-pointer transition-all hover:opacity-90"
              style={{ background: breathRunning ? '#9B6B61' : '#7C8363' }}>
              {breathRunning ? <><Pause className="w-4 h-4" /> توقف</> : <><Play className="w-4 h-4" /> شروع تنفس</>}
            </button>
          </div>
        </div>
      )}

      {/* ── LOG TAB ── */}
      {activeTab === 'log' && (
        <div className="space-y-5">
          {chartData.length > 1 && (
            <div className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#2D3025] font-serif-elegant">روند استرس — قبل و بعد از جلسه</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8D7F72' }} stroke="#E6DFD3" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#8D7F72' }} stroke="#E6DFD3" width={20} />
                    <Tooltip formatter={(v: number, name: string) => [v, name === 'before' ? 'قبل' : 'بعد']} />
                    <Area type="monotone" dataKey="before" stroke="#9B6B61" fill="#9B6B61" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="after"  stroke="#7C8363" fill="#7C8363"  fillOpacity={0.2}  strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sorted.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-[#D6CFC3] rounded-2xl">
                <Brain className="w-10 h-10 text-[#D6CFC3] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#8D7F72]">هنوز جلسه‌ای ثبت نشده</p>
                <p className="text-xs text-[#8D7F72] mt-1">با تایمر مدیتیشن اولین جلسه‌ات رو شروع کن</p>
              </div>
            ) : sorted.map(s => {
              const info = SESSION_TYPES[s.type];
              const reduction = s.stressLevelBefore - s.stressLevelAfter;
              return (
                <div key={s.id} className="bg-[#FDFBF7] border border-[#E6DFD3] rounded-2xl p-4 flex items-start gap-4">
                  <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${info.color}20`, color: info.color }}>
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-[#2D3025]">{info.label} — {s.durationMinutes} دقیقه</p>
                        <p className="text-[10px] text-[#8D7F72]">{s.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${reduction > 0 ? 'bg-[#E8ECE0] text-[#7C8363]' : 'bg-[#F4E9E4] text-[#9B6B61]'}`}>
                          {reduction > 0 ? `↓${reduction}` : `↑${Math.abs(reduction)}`} استرس
                        </span>
                        <button onClick={() => onDeleteSession(s.id)}
                          className="p-1 text-[#8D7F72] hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-[#8D7F72]">
                      <span>قبل: <b className="text-[#9B6B61]">{s.stressLevelBefore}/۱۰</b></span>
                      <span>بعد: <b className="text-[#7C8363]">{s.stressLevelAfter}/۱۰</b></span>
                    </div>
                    {s.notes && <p className="text-[10px] text-[#8D7F72] mt-1 italic">{s.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
