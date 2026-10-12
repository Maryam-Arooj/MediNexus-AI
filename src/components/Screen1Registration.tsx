import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, AlertCircle, ArrowRight, ShieldCheck, HeartPulse, Loader2, Info, RefreshCw, Siren } from 'lucide-react';
import type { CaseFormInput, EmergencyResult, Gender, SymptomAnalysis } from '../types/medical';
import { SymptomAssistant } from './ai/SymptomAssistant';
import { EmergencyAlert } from './ai/EmergencyAlert';
import { createCase, fetchCase, updateCase, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTriageOptions } from '../hooks/useTriageOptions';
import { navigate } from '../lib/router';
import { validateCase } from '../lib/validation';
import { newRequestId, roomShort } from '../lib/format';

interface Screen1Props {
  mode: 'create' | 'edit';
  caseId?: string;
}

const EMPTY: CaseFormInput = { name: '', age: '', gender: '', symptoms: [], duration: '', dangerSigns: [] };

// Example symptom sets for demos. They only FILL the form (no name, no automatic submission).
const EXAMPLES: Record<'fever' | 'skin', Pick<CaseFormInput, 'symptoms' | 'duration'>> = {
  fever: { symptoms: ['Fever', 'Cough', 'Body pain'], duration: '1 - 2 weeks' },
  skin: { symptoms: ['Skin rash', 'Itching', 'Redness'], duration: '3 - 5 days' },
};

export const Screen1Registration: React.FC<Screen1Props> = ({ mode, caseId }) => {
  const { user } = useAuth();
  const { options, error: optionsError, retry } = useTriageOptions();
  const [formData, setFormData] = useState<CaseFormInput>({ ...EMPTY, name: user?.fullName ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCase, setLoadingCase] = useState(mode === 'edit');
  const [locked, setLocked] = useState(false);
  const [alert, setAlert] = useState<EmergencyResult | null>(null);
  // One id per form session: a double click or network retry can never create a second case.
  const requestId = useRef(newRequestId());

  useEffect(() => {
    if (mode !== 'edit' || !caseId) return;
    let alive = true;
    fetchCase(caseId)
      .then((c) => {
        if (!alive) return;
        setFormData({ name: c.name, age: c.age, gender: c.gender, symptoms: c.symptoms, duration: c.duration, dangerSigns: c.dangerSigns ?? [] });
        setLocked(!c.canEdit);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoadingCase(false));
    return () => {
      alive = false;
    };
  }, [mode, caseId]);

  const clearErrors = () => {
    setError(null);
    setFieldErrors({});
  };

  const toggleSymptom = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(name) ? prev.symptoms.filter((s) => s !== name) : [...prev.symptoms, name],
    }));
    clearErrors();
  };

  const dangerOptions = options?.dangerSigns ?? [];
  const ticked = formData.dangerSigns ?? [];

  // Ticking a danger sign shows the emergency alert immediately (deterministic rule, no AI involved).
  const toggleDanger = (id: string) => {
    const adding = !ticked.includes(id);
    setFormData((prev) => {
      const cur = prev.dangerSigns ?? [];
      return { ...prev, dangerSigns: cur.includes(id) ? cur.filter((d) => d !== id) : [...cur, id] };
    });
    const sign = dangerOptions.find((d) => d.id === id);
    if (adding && sign) setAlert({ isEmergency: true, matched: [{ ...sign, source: 'checklist' }], guidance: [] });
  };

  // AI understood the free text: pre-fill the form. The patient still reviews everything before submitting.
  const applyAi = (a: SymptomAnalysis) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: a.symptoms.length ? a.symptoms : prev.symptoms,
      duration: a.duration ?? prev.duration,
      age: a.age ?? prev.age,
      gender: a.gender ?? prev.gender,
    }));
    clearErrors();
  };

  // Rules (or the AI) found possible danger signs in the text: tick the matching boxes and alert.
  const handleEmergency = (e: EmergencyResult) => {
    const ids = e.matched.map((m) => m.id).filter((id) => dangerOptions.some((d) => d.id === id));
    if (ids.length) setFormData((prev) => ({ ...prev, dangerSigns: [...new Set([...(prev.dangerSigns ?? []), ...ids])] }));
    setAlert(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || locked) return;
    const problem = validateCase(formData);
    if (problem) {
      setError(problem);
      return;
    }
    clearErrors();
    setIsSubmitting(true);
    try {
      const saved =
        mode === 'edit' && caseId
          ? await updateCase(caseId, formData)
          : await createCase(formData, requestId.current);
      navigate(`/patient/cases/${encodeURIComponent(saved.id)}`, { replace: mode === 'edit' });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
        if (err.status === 409) setLocked(true);
      } else {
        setError('Could not save. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const departments = options?.departments ?? [];
  const isEdit = mode === 'edit';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <HeartPulse className="w-3.5 h-3.5" />
            Digital OPD Pre-Check
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {isEdit ? 'Edit Your Symptoms' : 'Patient Pre-Registration & Triage'}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Describe your symptoms in your own words (AI helps fill the form) or pick them below. You get a digital token
            (parchi) and are routed to the right OPD room. Fixed safety rules check for emergencies and sort urgency; a
            doctor always makes the medical decisions.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-emerald-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Direct routing to the OPD room
            </span>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 mb-6 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? `Editing case ${caseId}` : 'Step 1 — Your Details & Symptoms'}
            </h2>
            <p className="text-xs text-slate-500">Two departments are available in this MVP: General Medicine &amp; Dermatology.</p>
          </div>
          {!isEdit && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Example symptoms:</span>
              <button
                type="button"
                onClick={() => { setFormData((p) => ({ ...p, ...EXAMPLES.fever })); clearErrors(); }}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                Fever
              </button>
              <button
                type="button"
                onClick={() => { setFormData((p) => ({ ...p, ...EXAMPLES.skin })); clearErrors(); }}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
              >
                Skin
              </button>
            </div>
          )}
        </div>

        {(loadingCase || (!options && !optionsError)) && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {optionsError && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Could not load the symptom list</div>
              <div className="text-xs mt-0.5">{optionsError}</div>
              <button onClick={retry} className="mt-2 text-xs font-semibold underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            </div>
          </div>
        )}

        {locked && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 mb-6">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              A doctor has already started reviewing this case, so it can no longer be edited.{' '}
              <button className="underline font-semibold" onClick={() => navigate('/patient/new')}>Start a new assessment</button> if your symptoms have changed.
            </div>
          </div>
        )}

        {options && !loadingCase && (
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            {error && (
              <div id="form-error" role="alert" className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <fieldset disabled={locked || isSubmitting} className="space-y-8">
              {!isEdit && (
                <SymptomAssistant aiEnabled={Boolean(options.aiEnabled)} disabled={locked || isSubmitting} onApply={applyAi} onEmergency={handleEmergency} />
              )}

              {dangerOptions.length > 0 && (
                <div id="danger-signs" className={`rounded-xl border-2 p-4 ${ticked.length ? 'border-rose-400 bg-rose-50' : 'border-rose-100 bg-rose-50/40'}`}>
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-900">
                    <Siren className="h-4 w-4" /> Emergency check — do you have any of these right now?
                  </h3>
                  <p className="mb-3 text-xs text-rose-800">
                    Tick any that apply. These are checked by fixed safety rules (not AI). If you tick one, please go to the Emergency department.
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {dangerOptions.map((d) => (
                      <label key={d.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${ticked.includes(d.id) ? 'border-rose-500 bg-white font-semibold text-rose-900' : 'border-rose-100 bg-white/70 text-slate-700 hover:border-rose-300'}`}>
                        <input type="checkbox" data-danger-sign={d.id} checked={ticked.includes(d.id)} onChange={() => toggleDanger(d.id)} className="mt-0.5 accent-rose-600" />
                        <span>
                          {d.label} <span dir="rtl" className="block text-[11px] font-normal text-slate-500">{d.labelUr}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">1. Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="patient-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Name <span className="text-slate-400 font-normal">(defaults to your account name)</span>
                    </label>
                    <input
                      id="patient-name"
                      type="text"
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="patient-age" className="block text-xs font-semibold text-slate-700 mb-1">
                      Age <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="patient-age"
                      type="number"
                      min={1}
                      max={120}
                      step={1}
                      value={formData.age}
                      onChange={(e) => {
                        setFormData({ ...formData, age: e.target.value === '' ? '' : Number(e.target.value) });
                        clearErrors();
                      }}
                      placeholder="e.g. 42"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition ${fieldErrors.age ? 'border-rose-400' : 'border-slate-300'}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="patient-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="patient-gender"
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData({ ...formData, gender: e.target.value as Gender | '' });
                        clearErrors();
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                    >
                      <option value="">Select Gender</option>
                      {options.genders.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    2. Select Your Symptoms <span className="text-rose-500">*</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    {formData.symptoms.length} symptom{formData.symptoms.length === 1 ? '' : 's'} selected
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Select one or more symptoms. The department is suggested automatically.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {departments.map((dept, i) => {
                    const isGm = dept.name === 'General Medicine';
                    return (
                      <div key={dept.name} className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-800 tracking-wide">Department {i + 1}: {dept.name}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isGm ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                            {roomShort(dept.room)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {dept.symptoms.map((item) => {
                            const sel = formData.symptoms.includes(item.name);
                            const on = isGm ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-amber-600 border-amber-600 text-white shadow-sm';
                            const off = isGm
                              ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/40';
                            return (
                              <button
                                key={item.name}
                                type="button"
                                aria-pressed={sel}
                                data-symptom={item.name}
                                onClick={() => toggleSymptom(item.name)}
                                className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all flex flex-col justify-between ${sel ? on : off}`}
                              >
                                <span className="font-semibold text-[13px]">{item.name}</span>
                                <span className={`text-[10px] mt-0.5 ${sel ? (isGm ? 'text-blue-100' : 'text-amber-100') : 'text-slate-400'}`}>
                                  {item.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  3. How Long Have You Had These Symptoms? <span className="text-rose-500">*</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {options.durations.map((option) => {
                    const sel = formData.duration === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={sel}
                        onClick={() => {
                          setFormData({ ...formData, duration: option });
                          clearErrors();
                        }}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition text-center ${
                          sel
                            ? 'bg-emerald-600 border-emerald-600 text-white font-semibold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </fieldset>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Your answers are only visible to you and the hospital's doctors.</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => navigate(`/patient/cases/${encodeURIComponent(caseId!)}`)}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  id="btn-start-ai-check"
                  disabled={isSubmitting || locked}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{isEdit ? 'Save Changes' : 'Start Triage Check'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
      {alert && <EmergencyAlert matches={alert.matched} guidance={alert.guidance} onContinue={() => setAlert(null)} onLeave={() => navigate('/patient')} />}
    </div>
  );
};
