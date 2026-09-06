import React from 'react';
import { PatientRecord } from '../types/medical';
import {
  CheckCircle2,
  AlertTriangle,
  Printer,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Building2,
  Stethoscope,
  Calendar,
  Clock,
} from 'lucide-react';

interface Screen3Props {
  patient: PatientRecord;
  onProceedToDoctorDashboard: () => void;
  onBackToAnalysis: () => void;
}

export const Screen3DigitalParchi: React.FC<Screen3Props> = ({
  patient,
  onProceedToDoctorDashboard,
  onBackToAnalysis,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isHigh = patient.analysis.riskLevel === 'High';
  const isMed = patient.analysis.riskLevel === 'Medium';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner explaining queue elimination */}
      <div className="no-print bg-emerald-900 text-white rounded-xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white">
              Digital Parchi Generated Successfully
            </h1>
          </div>
          <p className="text-xs text-emerald-200">
            No physical registration queue required. Present this token number directly at <strong>{patient.opdRoom}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg border border-emerald-600 transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save Slip</span>
          </button>
          <button
            id="btn-goto-doctor-dashboard"
            onClick={onProceedToDoctorDashboard}
            className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>Doctor Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DIGITAL PARCHI SLIP (PRINTABLE CARD) */}
      <div className="print-parchi-card bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden relative">
        {/* Decorative Top Hospital Header */}
        <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  MEDINEXUS AI DIGITAL OPD SYSTEM
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                Outpatient Digital Registration Slip (Parchi)
              </h2>
              <p className="text-xs text-slate-400">
                Government Hospital &amp; Medical College • Smart OPD Pre-Triage
              </p>
            </div>

            {/* Token Highlight Box */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-5 py-3 text-center sm:text-right min-w-[160px]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Token / OPD Serial No.
              </div>
              <div className="font-mono text-2xl font-black text-emerald-400 tracking-tight">
                {patient.tokenNumber}
              </div>
              <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                {patient.department}
              </div>
            </div>
          </div>
        </div>

        {/* Status Badges Section (REQUIRED: Digital Registration Completed & Doctor Review Required) */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Required Badge 1: Digital Registration Completed */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Digital Registration Completed
            </span>

            {/* Required Badge 2: Doctor Review Required */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Doctor Review Required
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Date: Today
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {patient.createdAt}
            </span>
          </div>
        </div>

        {/* Parchi Core Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient ID</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{patient.id}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient Name</span>
              <span className="font-bold text-slate-800 text-sm">{patient.name || 'Anonymous'}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Age / Gender</span>
              <span className="font-bold text-slate-800 text-sm">{patient.age} yrs • {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Assigned OPD Room</span>
              <span className="font-bold text-emerald-700 text-sm">{patient.opdRoom.split('—')[0].trim()}</span>
            </div>
          </div>

          {/* Department & Triage Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                Department
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {patient.department}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Routing: {patient.opdRoom}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              isHigh
                ? 'bg-rose-50/60 border-rose-200'
                : isMed
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                Triage Risk Level
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase ${
                  isHigh
                    ? 'bg-rose-600 text-white'
                    : isMed
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {patient.analysis.riskLevel} Risk
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {isHigh ? 'High Priority Queue' : isMed ? 'Standard Priority' : 'Routine Consultation'}
                </span>
              </div>
            </div>
          </div>

          {/* Symptoms Reported */}
          <div className="p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Reported Symptoms &amp; Duration
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {patient.symptoms.map((symptom, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-md border border-slate-200"
                >
                  {symptom}
                </span>
              ))}
              <span className="text-xs text-slate-500 ml-1">
                • Duration: <strong>{patient.duration}</strong>
              </span>
            </div>
          </div>

          {/* Red Flags Status */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Red Flags Assessment
            </div>
            <ul className="space-y-1">
              {patient.analysis.redFlags.map((flag, idx) => (
                <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Clinical Summary */}
          <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50/30">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
              AI Pre-Triage Handover Summary
            </div>
            <p className="text-xs font-mono text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
              "{patient.analysis.shortDoctorSummary}"
            </p>
          </div>

          {/* Recommended Action */}
          <div className="p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Patient Instructions &amp; Recommended Action
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {patient.analysis.recommendedAction}
            </p>
          </div>

          {/* Slip Footer with Verification QR Mock */}
          <div className="pt-4 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-center text-slate-700 p-1 flex-shrink-0">
                <QrCode className="w-12 h-12 text-slate-800" />
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                <div className="font-semibold text-slate-700">Digital Token Verification QR</div>
                <div>Scan at OPD Door / Doctor Desk Scanner</div>
                <div className="font-mono text-[10px] text-slate-400 mt-0.5">AUTH: {patient.id}#OK</div>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              <div>MediNexus AI v1.0 MVP • Paperless OPD</div>
              <div>Final medical validation by registered medical officer.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Navigation Bottom Bar */}
      <div className="no-print mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToAnalysis}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
        >
          ← Back to AI Medical Analysis
        </button>

        <button
          type="button"
          onClick={onProceedToDoctorDashboard}
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <span>Open Doctor Dashboard (Screen 4)</span>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
};
