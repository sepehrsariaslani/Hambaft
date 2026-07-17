import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getNudgeTemplates, sendNudge, NudgeTemplate as ApiNudgeTemplate } from '../../app/hambaft-api';

interface NudgeSenderProps {
  partnerEmail: string;
  partnerName: string;
}

export default function NudgeSender({ partnerEmail, partnerName }: NudgeSenderProps) {
  const [templates, setTemplates] = useState<ApiNudgeTemplate[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    getNudgeTemplates()
      .then(res => setTemplates(res?.data?.templates || []))
      .catch(() => {});
  }, []);

  const handleSend = async (templateIndex?: number) => {
    if (sending) return;
    setSending(true);
    try {
      await sendNudge({
        partner_email: partnerEmail,
        message: customMessage || undefined,
        template_index: templateIndex,
      });
      setCustomMessage('');
      setShowPanel(false);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 3000);
    } catch (e) {
      console.error('Nudge failed', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative">
      {/* Nudge button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all
          ${justSent
            ? 'bg-[#4A6741] text-white'
            : 'bg-gradient-to-l from-[#E26645] to-[#C94B2A] text-white hover:scale-105'
          }
        `}
      >
        {justSent ? '✓ ارسال شد!' : '💪 ناج بفرست'}
      </button>

      {/* Nudge panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-2xl border border-[#E6DFD3] shadow-lg p-3 space-y-2 z-50"
          >
            <div className="text-[10px] font-black text-[#2D3025]">
              ناج تشویقی به {partnerName}
            </div>

            {/* Quick nudges */}
            <div className="grid grid-cols-3 gap-1">
              {templates.slice(0, 6).map(t => (
                <button
                  key={t.index}
                  onClick={() => handleSend(t.index)}
                  disabled={sending}
                  className="p-2 rounded-xl bg-[#F9F6EE] hover:bg-[#E8ECE0] border border-[#E6DFD3]/50 text-center cursor-pointer transition-colors disabled:opacity-50"
                >
                  <div className="text-lg">{t.icon}</div>
                  <div className="text-[7px] font-bold text-[#8D7F72] truncate">{t.message_fa}</div>
                </button>
              ))}
            </div>

            {/* More nudges */}
            {templates.length > 6 && (
              <div className="grid grid-cols-3 gap-1">
                {templates.slice(6).map(t => (
                  <button
                    key={t.index}
                    onClick={() => handleSend(t.index)}
                    disabled={sending}
                    className="p-2 rounded-xl bg-[#F9F6EE] hover:bg-[#E8ECE0] border border-[#E6DFD3]/50 text-center cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <div className="text-lg">{t.icon}</div>
                    <div className="text-[7px] font-bold text-[#8D7F72] truncate">{t.message_fa}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom message */}
            <div className="flex gap-1">
              <input
                type="text"
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="پیام دلخواه..."
                className="flex-1 px-2 py-1.5 text-[10px] bg-[#F9F6EE] border border-[#D6CFC3] rounded-lg focus:outline-none focus:border-[#7C8363]"
                onKeyDown={e => { if (e.key === 'Enter' && customMessage.trim()) handleSend(); }}
              />
              <button
                onClick={() => handleSend()}
                disabled={sending || !customMessage.trim()}
                className="px-2 py-1.5 bg-[#4A6741] text-white text-[10px] font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >ارسال</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
