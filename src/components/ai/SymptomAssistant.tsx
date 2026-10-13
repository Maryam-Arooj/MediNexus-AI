import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareText, Sparkles, Wand2 } from 'lucide-react';
import { analyzeSymptoms, ApiError } from '../../api/client';
import type { EmergencyResult, SymptomAnalysis, SymptomAssistResponse } from '../../types/medical';
import { AiBadge, AiNotice } from './AiNotice';

interface Props {
  aiEnabled: boolean;
  disabled?: boolean;
  /** Pre-fill the existing form with what the AI understood (the patient still checks and submits). */
  onApply: (a: SymptomAnalysis) => void;
  /** Called when the rules (or the AI) see a possible emergency. */
  onEmergency: (e: EmergencyResult) => void;
}

const LIKELIHOOD_STYLE: Record<string, string> = {
  'more likely': 'bg-violet-600 text-white',
  possible: 'bg-violet-100 text-violet-800',
  'less likely': 'bg-slate-100 text-slate-600',
};

/**
 * "Describe how you feel" card — free text in English, Urdu or Roman Urdu.
 * The server runs the emergency RULES first (always), then the AI (if configured).
 */
export const SymptomAssistant: React.FC<Props> = ({ aiEnabled, disabled, onApply, onEmergency }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomAssistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (loading || text.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const r = await analyzeSymptoms(text.trim());
      setResult(r);
      if (r.ai && !r.ai.unclear) onApply(r.ai);
      const emergency: EmergencyResult = r.emergency.isEmergency
        ? r.emergency
        : r.ai?.emergencyConcern
          ? {
              isEmergency: true,
              matched: [{ id: 'ai_concern', label: 'The AI noticed a possible emergency in your description', labelUr: '', source: 'ai' }],
              guidance: [],
            }
          : r.emergency;
      if (emergency.isEmergency) onEmergency(emergency);
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : 'Could not analyse the description. Please choose your symptoms below.');
    } finally {
      setLoading(false);
    }
  };

  const ai = result?.ai;

  return (
    <div id="symptom-assistant" className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-800">
          <MessageSquareText className="h-4 w-4 text-violet-600" /> Describe how you feel <AiBadge />
        </h3>
        {!aiEnabled && (
          <span className="text-[11px] font-medium text-amber-700">AI is off on this server — the emergency check still works.</span>
        )}
      </div>
      <p className="mb-3 text-xs text-slate-600">
        Write in English, اردو or Roman Urdu, e.g. <em>“mujhe 3 din se bukhar, khansi aur gala kharab hai, umar 34”</em>. Don’t
        include your name, CNIC or phone number.
      </p>
      <textarea
        id="symptom-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={800}
        rows={3}
        disabled={disabled || loading}
        placeholder="Describe how you feel (English / اردو / Roman Urdu)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{text.length}/800</span>
        <button
          type="button"
          id="btn-analyze-symptoms"
          onClick={analyze}
          disabled={disabled || loading || text.trim().length < 3}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {loading ? 'Analysing…' : 'Analyse & fill the form'}
        </button>
      </div>
      {loading && <p className="mt-1 text-right text-[11px] text-slate-500">This can take up to 45 seconds.</p>}

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> <span>{error}</span>
        </div>
      )}

      {result && result.aiStatus !== 'ok' && (
        <div id="ai-unavailable" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {result.aiMessage ?? 'The AI assistant is unavailable.'} Please select your symptoms manually below.
            {result.emergency.isEmergency ? '' : ' (The emergency safety check ran and found no danger signs in your text.)'}
          </span>
        </div>
      )}

      {ai && (
        <div id="ai-result" className="mt-4 space-y-4">
          {ai.unclear ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              We couldn’t find symptoms in that text. Please pick them below.
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <strong>Form filled from your description.</strong> Please check and correct it before submitting.
                {ai.summary && <div className="mt-1 text-emerald-800">“{ai.summary}”</div>}
                {ai.otherSymptoms.length > 0 && (
                  <div className="mt-1 text-emerald-800">Also mentioned (not in the form list): {ai.otherSymptoms.join(', ')}</div>
                )}
              </div>
            </div>
          )}

          {ai.possibleConditions.length > 0 && (
            <div>
              <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-800">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" /> Possible conditions — AI suggestion, not a diagnosis
              </h4>
              <p className="mb-2 text-[11px] text-slate-500">
                Possibilities for the doctor to check. Likelihood is the AI’s rough judgement from your words only — no examination or tests.
              </p>
              <ul id="ai-conditions" className="space-y-1.5">
                {ai.possibleConditions.map((c) => (
                  <li key={c.name} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-slate-900">{c.name}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${LIKELIHOOD_STYLE[c.likelihood] ?? ''}`}>{c.likelihood}</span>
                    </div>
                    {c.reason && <div className="mt-0.5 text-slate-600">{c.reason}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(ai.guidance.selfCare.length > 0 || ai.guidance.seeDoctorIf.length > 0 || ai.guidance.avoid.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Until you see the doctor', ai.guidance.selfCare, 'border-emerald-200 bg-emerald-50/50'],
                ['Get urgent care if', ai.guidance.seeDoctorIf, 'border-rose-200 bg-rose-50/50'],
                ['Avoid', ai.guidance.avoid, 'border-amber-200 bg-amber-50/50'],
              ].map(([title, items, cls]) =>
                (items as string[]).length ? (
                  <div key={title as string} className={`rounded-lg border p-3 ${cls}`}>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">{title as string}</div>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-700">
                      {(items as string[]).map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}
          <AiNotice text="Preliminary guidance only — not a diagnosis and no medicine advice. It can be wrong. Your priority and token are set by the hospital's fixed rules, and a doctor reviews every case." />
        </div>
      )}
    </div>
  );
};
