import React, { useState } from 'react';
import { PatientRegistrationInput } from '../types/medical';
import { SYMPTOMS_BY_DEPARTMENT, DURATION_OPTIONS } from '../data/mockData';
import { Sparkles, AlertCircle, ArrowRight, ShieldCheck, Clock, HeartPulse, Loader2 } from 'lucide-react';

interface Screen1Props {
  initialData: PatientRegistrationInput;
  onSubmit: (data: PatientRegistrationInput) => void;
  onLoadPreset: (preset: 'fever' | 'dermatology') => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

export const Screen1Registration: React.FC<Screen1Props> = ({
  initialData,
  onSubmit,
  onLoadPreset,
  isSubmitting = false,
  submitError = null,
}) => {
  const [formData, setFormData] = useState<PatientRegistrationInput>(initialData);
  const [error, setError] = useState<string | null>(null);

  const toggleSymptom = (symptomName: string) => {
    setFormData((prev) => {
      const exists = prev.symptoms.includes(symptomName);
      const newSymptoms = exists
        ? prev.symptoms.filter((s) => s !== symptomName)
        : [...prev.symptoms, symptomName];
      return { ...prev, symptoms: newSymptoms };
    });
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.age || Number(formData.age) <= 0 || Number(formData.age) > 120) {
      setError('Please provide a valid age between 1 and 120.');
      return;
    }

    if (!formData.gender) {
      setError('Please select a gender.');
      return;
    }

    if (formData.symptoms.length === 0) {
      setError('Please select at least one primary symptom from either department.');
      return;
    }

    if (!formData.duration) {
      setError('Please select the duration of your symptoms.');
      return;
    }

    setError(null);
    onSubmit(formData);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Queue Reduction Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <HeartPulse className="w-3.5 h-3.5" />
            Digital OPD Pre-Check
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Patient Pre-Registration &amp; AI Triage
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Eliminate long waiting lines at physical hospital counters. Enter your symptoms beforehand to generate an instant digital registration token and doctor-ready summary.
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-emerald-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-300" />
              Saves 45–60 mins queue time
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              Direct routing to OPD Room
            </span>
          </div>
        </div>

        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 mb-6 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Step 1 — Patient Demographics &amp; Symptoms</h2>
            <p className="text-xs text-slate-500">
              Only 2 specialized departments currently active in this MVP: General Medicine &amp; Dermatology.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Fill test case:</span>
            <button
              type="button"
              onClick={() => onLoadPreset('fever')}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Fever Case
            </button>
            <button
              type="button"
              onClick={() => onLoadPreset('dermatology')}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Skin Case
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Backend submission error (e.g. server not running) */}
          {submitError && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Backend Error</div>
                <div className="text-xs mt-0.5">{submitError}</div>
              </div>
            </div>
          )}
          {/* Local form validation error */}
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Demographics */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 mb-3">
              1. Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Name */}
              <div className="sm:col-span-1">
                <label htmlFor="patient-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="patient-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Can remain anonymous if preferred.
                </span>
              </div>

              {/* Age */}
              <div>
                <label htmlFor="patient-age" className="block text-xs font-semibold text-slate-700 mb-1">
                  Age <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-age"
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      age: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  placeholder="e.g. 42"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="patient-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  id="patient-gender"
                  required
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gender: e.target.value as 'Male' | 'Female' | 'Other',
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Symptoms Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                2. Select Presenting Symptoms <span className="text-rose-500">*</span>
              </h3>
              <span className="text-xs text-slate-500">
                {formData.symptoms.length} symptom{formData.symptoms.length === 1 ? '' : 's'} selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select one or more symptoms below. The system automatically categorizes your condition to suggest the appropriate hospital department.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* General Medicine Department */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 tracking-wide">
                    Department 1: General Medicine
                  </span>
                  <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-200">
                    Room 104
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SYMPTOMS_BY_DEPARTMENT['General Medicine'].map((item) => {
                    const isSelected = formData.symptoms.includes(item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleSymptom(item.name)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40'
                        }`}
                      >
                        <span className="font-semibold text-[13px]">{item.name}</span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dermatology Department */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 tracking-wide">
                    Department 2: Dermatology
                  </span>
                  <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium border border-amber-200">
                    Room 208
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SYMPTOMS_BY_DEPARTMENT['Dermatology'].map((item) => {
                    const isSelected = formData.symptoms.includes(item.name);
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleSymptom(item.name)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50/40'
                        }`}
                      >
                        <span className="font-semibold text-[13px]">{item.name}</span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          {item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Duration */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 mb-3">
              3. Duration of Symptoms <span className="text-rose-500">*</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {DURATION_OPTIONS.map((option) => {
                const isSelected = formData.duration === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, duration: option });
                      if (error) setError(null);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition text-center ${
                      isSelected
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

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Data is securely analyzed for hospital triage assistance only.</span>
            </div>

            <button
              type="submit"
              id="btn-start-ai-check"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>Start AI Check</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
