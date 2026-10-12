import React from 'react';
import { Phone, Siren } from 'lucide-react';
import type { PatientRecord } from '../types/medical';

/** Red banner for cases where the patient reported an emergency danger sign (deterministic rule). */
export const EmergencyBanner: React.FC<{ record: PatientRecord; compact?: boolean }> = ({ record, compact }) => {
  if (!record.emergency) return null;
  const signs = (record.analysis?.redFlags ?? []).filter((f) => f.startsWith('EMERGENCY SIGN: ')).map((f) => f.slice(16).split(' — ')[0]);
  return (
    <div id="emergency-banner" className={`rounded-xl border-2 border-rose-500 bg-rose-50 text-rose-900 ${compact ? 'p-3 mb-4' : 'p-4 mb-6'}`}>
      <div className="flex items-start gap-3">
        <Siren className="h-6 w-6 flex-shrink-0 text-rose-600" />
        <div className="flex-1">
          <div className="text-sm font-black uppercase tracking-tight">Emergency danger sign reported — go to the Emergency department now</div>
          <div className="mt-0.5 text-xs" dir="rtl">ایمرجنسی علامت — فوراً ایمرجنسی وارڈ جائیں یا 1122 پر کال کریں</div>
          {signs.length > 0 && <div className="mt-1 text-xs">Reported: <strong>{signs.join(', ')}</strong></div>}
          <div className="mt-1 text-[11px] text-rose-700">Detected by fixed safety rules (not AI). Your case is marked High priority for the doctor.</div>
        </div>
        <a href="tel:1122" className="no-print flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700">
          <Phone className="h-4 w-4" /> 1122
        </a>
      </div>
    </div>
  );
};
