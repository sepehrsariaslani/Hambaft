import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { getPartnerComparison, PartnerComparison as ApiComparison } from '../../app/hambaft-api';
import { ComparisonRow } from '../types';

interface PartnerComparisonProps {
  partnerEmail: string;
  partnerName: string;
}

export default function PartnerComparisonDisplay({ partnerEmail, partnerName }: PartnerComparisonProps) {
  const [data, setData] = useState<ApiComparison | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchComparison = useCallback(async () => {
    try {
      const res = await getPartnerComparison(partnerEmail);
      if (res?.data) setData(res.data);
    } catch (e) {
      console.error('Failed to fetch comparison', e);
    }
  }, [partnerEmail]);

  useEffect(() => { fetchComparison().finally(() => setLoading(false)); }, [fetchComparison]);

  if (loading) {
    return <div className="text-center py-6 text-xs text-[#8D7F72]">در حال بارگذاری مقایسه...</div>;
  }

  if (!data) {
    return <div className="text-center py-6 text-xs text-[#8D7F72]">خطا در بارگذاری</div>;
  }

  const me = data.me;
  const partner = data.partner;
  const meAhead = data.comparison.filter(c => c.ahead === 'me').length;
  const partnerAhead = data.comparison.filter(c => c.ahead === 'partner').length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Score cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Me */}
        <div className="p-3 rounded-2xl bg-gradient-to-bl from-[#4A6741] to-[#2D4025] text-white text-center">
          <div className="text-[9px] text-white/60 font-bold">من</div>
          <div className="text-xl font-black">{me.total_points}</div>
          <div className="text-[9px] text-white/70">سطح {me.level} • {me.current_streak}🔥</div>
        </div>
        {/* Partner */}
        <div className="p-3 rounded-2xl bg-gradient-to-bl from-[#E26645] to-[#C94B2A] text-white text-center">
          <div className="text-[9px] text-white/60 font-bold">{partnerName}</div>
          <div className="text-xl font-black">{partner.total_points}</div>
          <div className="text-[9px] text-white/70">سطح {partner.level} • {partner.current_streak}🔥</div>
        </div>
      </div>

      {/* Win/Loss summary */}
      <div className="flex items-center justify-center gap-4 p-2 bg-[#F9F6EE] rounded-xl">
        <span className="text-[10px] font-bold text-[#4A6741]">{meAhead} بردهای من</span>
        <span className="text-[9px] text-[#8D7F72]">vs</span>
        <span className="text-[10px] font-bold text-[#E26645]">{partnerAhead} بردهای {partnerName}</span>
      </div>

      {/* Comparison rows */}
      <div className="space-y-1.5">
        {data.comparison.map((row: ComparisonRow) => {
          const maxVal = Math.max(row.me, row.partner, 1);
          return (
            <div key={row.field} className="p-2.5 rounded-xl bg-white border border-[#E6DFD3]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold text-[#8D7F72]">{row.icon} {row.label}</span>
                {row.ahead === 'me' && <span className="text-[8px] font-black text-[#4A6741] bg-[#E8ECE0] px-1.5 py-0.5 rounded-md">تو جلو!</span>}
                {row.ahead === 'partner' && <span className="text-[8px] font-black text-[#E26645] bg-[#FDE8E3] px-1.5 py-0.5 rounded-md">پارتنر!</span>}
                {row.ahead === 'tie' && <span className="text-[8px] font-black text-[#8D7F72] bg-[#F9F6EE] px-1.5 py-0.5 rounded-md">مساوی</span>}
              </div>
              {/* Dual bar */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-[#4A6741] w-8 text-left">{row.me}</span>
                  <div className="flex-1 h-1.5 bg-[#E8ECE0] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#4A6741] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.me / maxVal) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-[#E26645] w-8 text-left">{row.partner}</span>
                  <div className="flex-1 h-1.5 bg-[#FDE8E3] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#E26645] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.partner / maxVal) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
