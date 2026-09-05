import React from 'react';
import { PatientRecord } from '../types/medical';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Building2,
  Stethoscope,
  ArrowRight,
  User,
  Clock,
  Sparkles,
  ArrowLeft,
  Info
} from 'lucide-react';

interface Screen2Props {
  patient: PatientRecord;
  onProceedToParchi: () => void;
  onBackToEdit: () => void;
}

export const Screen2AIAnalysis: React.FC<Screen2Props> = ({
  patient,
  onProceedToParchi,
  onBackToEdit,
}) => {
  const { analysis } = patient;
  const isHigh = analysis.riskLevel === 'High';
  const isMed = analysis.riskLevel === 'Medium';

  // Risk styling hierarchy
  const riskTheme = isHigh
    ? {
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        text: 'text-rose-800',
        badgeBg: 'bg-rose-600 text-white',
        ring: 'ring-rose-200',
        dot: 'bg-rose-500',
        label: 'HIGH RISK / PRIORITY TRIAGE',
        subtext: 'Potential red flags detected. Immediate clinical assessment recommended.',
      }
    : isMed
    ? {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-800',
        badgeBg: 'bg-amber-500 text-white',
        ring: 'ring-amber-200',
        dot: 'bg-amber-500',
        label: 'MEDIUM RISK / SAME-DAY REVIEW',
        subtext: 'Significant symptoms requiring timely clinical evaluation within OPD hours.',
      }
    : {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        badgeBg: 'bg-emerald-600 text-white',
        ring: 'ring-emerald-200',
        dot: 'bg-emerald-500',
        label: 'LOW RISK / STANDARD OPD',
        subtext: 'Stable symptom presentation suitable for routine outpatient consultation.',
      };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* MANDATORY DISCLAIMER BANNER */}
      <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold tracking-tight text-amber-900 uppercase">
            AI-generated assessment — requires doctor review
          </div>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            SmartCare assists initial medical triage and queue routing. It does NOT replace a licensed physician. The final medical diagnosis, prescription, and clinical decisions remain strictly with the attending doctor.
          </p>
        </div>
      </div>

      {/* Patient Summary Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{patient.name || 'Anonymous Patient'}</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                {patient.age} yrs • {patient.gender}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Symptoms: <strong className="text-slate-700">{patient.symptoms.join(', ')}</strong> ({patient.duration})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-400">Token Assigned:</span>
          <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            {patient.tokenNumber}
          </span>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="space-y-6">
        {/* 1. Risk Level Visual Hierarchy */}
        <div className={`rounded-xl border-2 p-6 ${riskTheme.bg} ${riskTheme.border} transition-all`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Triage Risk Level
              </span>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-md text-sm font-extrabold uppercase tracking-wide shadow-sm ${riskTheme.badgeBg}`}>
                  {riskTheme.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  AI Triage Confidence: {analysis.confidenceScore}%
                </span>
              </div>
              <p className={`text-xs mt-2 font-medium ${riskTheme.text}`}>
                {riskTheme.subtext}
              </p>
            </div>

            {/* Risk Spectrum Indicator */}
            <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200/80 min-w-[210px]">
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex justify-between">
                <span>Risk Scale</span>
                <span className="font-bold text-slate-700">{analysis.riskLevel}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 h-2.5 rounded-full overflow-hidden bg-slate-100 p-0.5">
                <div className={`rounded-full ${analysis.riskLevel === 'Low' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                <div className={`rounded-full ${analysis.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-slate-200'}`} />
                <div className={`rounded-full ${analysis.riskLevel === 'High' ? 'bg-rose-600' : 'bg-slate-200'}`} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1 uppercase font-semibold">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Red Flags Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className={`w-5 h-5 ${isHigh ? 'text-rose-600' : isMed ? 'text-amber-500' : 'text-emerald-600'}`} />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Red Flags &amp; Clinical Warnings
            </h3>
          </div>
          <div className="space-y-2">
            {analysis.redFlags.map((flag, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 border ${
                  isHigh
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900 font-medium'
                    : isMed
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-medium'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" />
                <span>{flag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Suggested Department & Possible Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Department */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Suggested Department
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-teal-50/80 border border-teal-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold text-teal-900">
                  {analysis.suggestedDepartment}
                </span>
                <span className="text-xs px-2.5 py-1 rounded bg-teal-600 text-white font-semibold shadow-xs">
                  {patient.opdRoom.split('—')[0].trim()}
                </span>
              </div>
              <p className="text-xs text-teal-700 mt-2">
                Assigned based on primary presenting symptoms ({patient.symptoms.join(', ')}). Patient can skip the central registration counter and proceed directly to this department counter.
              </p>
            </div>
          </div>

          {/* Possible Conditions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Possible Conditions (Pre-Triage)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Differential considerations for the examining physician:
            </p>
            <ul className="space-y-1.5">
              {analysis.possibleConditions.map((condition, idx) => (
                <li
                  key={idx}
                  className="text-xs font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80 flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 4. Recommended Action */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Recommended Action
            </h3>
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed">
            {analysis.recommendedAction}
          </p>
        </div>

        {/* 5. Short Doctor Summary */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Doctor Handover Summary (Pre-Generated)
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Ready for Doctor Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            "{analysis.shortDoctorSummary}"
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Reduces physician manual documentation time by ~70%</span>
            <span>Generated in 0.4s</span>
          </div>
        </div>

        {/* CTA Navigation Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onBackToEdit}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Symptoms</span>
          </button>

          <button
            type="button"
            id="btn-proceed-parchi"
            onClick={onProceedToParchi}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <span>Generate Digital Parchi (Slip)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
