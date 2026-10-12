import React from 'react';
import { Phone, Siren, X } from 'lucide-react';
import type { EmergencyMatch } from '../../types/medical';

export const EMERGENCY_GUIDANCE = [
  'Go to the nearest hospital Emergency department now, or call Rescue 1122.',
  'Do not wait in the OPD queue and do not drive yourself if you feel faint or unwell.',
  'Show this screen or your parchi to the hospital staff.',
];

interface Props {
  matches: EmergencyMatch[];
  guidance?: string[];
  onContinue: () => void;
  onLeave: () => void;
}

/**
 * Full-screen emergency alert. Triggered by deterministic danger-sign rules (checklist or text);
 * an AI concern can also trigger it, but never suppress it.
 */
export const EmergencyAlert: React.FC<Props> = ({ matches, guidance, onContinue, onLeave }) => {
  const steps = guidance && guidance.length ? guidance : EMERGENCY_GUIDANCE;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-rose-950/80 p-4" role="alertdialog" aria-modal="true" aria-labelledby="emergency-title">
      <div id="emergency-alert" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 bg-rose-600 p-5 text-white">
          <Siren className="h-8 w-8 flex-shrink-0" />
          <div className="flex-1">
            <h2 id="emergency-title" className="text-xl font-black tracking-tight">Possible emergency</h2>
            <p className="mt-0.5 text-sm text-rose-100">ممکنہ ایمرجنسی — فوری طبی مدد حاصل کریں</p>
          </div>
          <button onClick={onContinue} aria-label="Close" className="rounded-lg p-1 hover:bg-rose-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">What we noticed</div>
            <ul className="space-y-1">
              {matches.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-x-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  <strong>{m.label}</strong>
                  {m.labelUr && <span dir="rtl" className="text-xs">{m.labelUr}</span>}
                  <span className="ml-auto text-[10px] uppercase text-rose-500">
                    {m.source === 'checklist' ? 'you ticked this' : m.source === 'text' ? 'found in your description' : 'AI concern'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-800">
            {steps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
          <a href="tel:1122" className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-base font-extrabold text-white hover:bg-rose-700">
            <Phone className="h-5 w-5" /> Call Rescue 1122
          </a>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={onLeave} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              I will go to Emergency now
            </button>
            <button id="btn-emergency-continue" onClick={onContinue} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
              Continue registration (High priority)
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            This alert comes from fixed safety rules, not AI, and errs on the side of caution. If you continue, your case is
            marked High priority with an emergency flag for the doctor.
          </p>
        </div>
      </div>
    </div>
  );
};
