import React from 'react';
import { CheckCircle2, AlertTriangle, Printer, ArrowLeft, ShieldCheck, Building2, Stethoscope, Calendar, Clock, RefreshCw, IdCard } from 'lucide-react';
import { useCase } from '../hooks/useCase';
import { navigate } from '../lib/router';
import { formatDate, formatDateTime, roomShort } from '../lib/format';
import { CaseLoadState } from './CaseLoadState';
import { riskTheme, StatusBadge } from './caseUi';

/**
 * Screen 3 — Digital Parchi. Always loaded fresh from the server, so the printed slip shows the
 * current doctor-review status, reviewer and any updated instructions.
 */
export const Screen3DigitalParchi: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { record: patient, error, loading, reload } = useCase(caseId);
  if (!patient) return <CaseLoadState loading={loading} error={error} />;

  const analysis = patient.analysis;
  const level = analysis?.riskLevel;
  const theme = riskTheme(level);
  const isHigh = level === 'High';
  const isMed = level === 'Medium';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="no-print bg-emerald-900 text-white rounded-xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white">Digital Parchi Ready</h1>
          </div>
          <p className="text-xs text-emerald-200">
            Show this token at <strong>{patient.opdRoom}</strong>. Print it or save it as PDF from the print dialog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reload()}
            title="Refresh status"
            className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg border border-emerald-600 transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            id="btn-print-parchi"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save Slip</span>
          </button>
        </div>
      </div>

      <div id="parchi-card" className="print-parchi-card bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden relative">
        <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">MediNexus AI Digital OPD</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">Outpatient Registration Slip (Parchi)</h2>
              <p className="text-xs text-slate-400">General Medicine &amp; Dermatology OPD • Pre-registration</p>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-5 py-3 text-center sm:text-right min-w-[160px]">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Token / OPD Serial No.</div>
              <div id="parchi-token" className="font-mono text-2xl font-black text-emerald-400 tracking-tight">{patient.tokenNumber}</div>
              <div className="text-[10px] text-slate-300 font-medium mt-0.5">{patient.department}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Digital Registration Completed
            </span>
            <span id="parchi-status">
              <StatusBadge status={patient.status} />
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(patient.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(patient.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient ID</span>
              <span id="parchi-patient-id" className="font-mono font-bold text-slate-800 text-sm">{patient.id}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient Name</span>
              <span className="font-bold text-slate-800 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Age / Gender</span>
              <span className="font-bold text-slate-800 text-sm">{patient.age} yrs • {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px] block">Assigned OPD Room</span>
              <span className="font-bold text-emerald-700 text-sm">{roomShort(patient.opdRoom)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" /> Department
              </div>
              <div className="text-base font-extrabold text-slate-900">{patient.department}</div>
              <div className="text-xs text-slate-500 mt-1">Routing: {patient.opdRoom}</div>
            </div>
            <div className={`p-4 rounded-xl border ${isHigh ? 'bg-rose-50/60 border-rose-200' : isMed ? 'bg-amber-50/60 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> Triage Priority (rule-based)
              </div>
              {analysis ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase ${theme.badgeBg}`}>{analysis.riskLevel}</span>
                    <span className="text-xs text-slate-600 font-medium">{theme.queue}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{analysis.riskReason}</div>
                </>
              ) : (
                <div className="text-xs text-slate-500">Not available</div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Reported Symptoms &amp; Duration</div>
            <div className="flex flex-wrap items-center gap-2">
              {patient.symptoms.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">{s}</span>
              ))}
              <span className="text-xs text-slate-500 ml-1">• Duration: <strong>{patient.duration}</strong></span>
            </div>
          </div>

          {analysis && analysis.redFlags.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Triage Rule Warnings
              </div>
              <ul className="space-y-1">
                {analysis.redFlags.map((f, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-700" /> Patient Instructions
              {analysis?.actionOverriddenByDoctor && <span className="ml-1 text-blue-700 normal-case">(updated by doctor)</span>}
            </div>
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">{analysis?.recommendedAction ?? 'Please see the OPD counter.'}</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 text-xs text-slate-700">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Doctor Review</div>
            {patient.status === 'Approved' ? (
              <span>Approved by <strong>{patient.review.approvedBy}</strong> on {formatDateTime(patient.review.approvedAt)}</span>
            ) : patient.status === 'Under Review' ? (
              <span>Under review{patient.review.reviewedBy ? <> by <strong>{patient.review.reviewedBy}</strong></> : null}.</span>
            ) : (
              <span>Awaiting doctor review.</span>
            )}
          </div>

          <div className="pt-4 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
                <IdCard className="w-8 h-8 text-slate-700" />
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                <div className="font-semibold text-slate-700">Verification</div>
                <div>Staff can verify this slip by searching the Patient ID</div>
                <div className="font-mono text-slate-700 mt-0.5">{patient.id} • {patient.tokenNumber}</div>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div>MediNexus AI • Paperless OPD (MVP)</div>
              <div>Rule-based triage only. Final medical decisions are made by a doctor.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(`/patient/cases/${encodeURIComponent(patient.id)}`)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Triage Result
        </button>
        <button
          type="button"
          onClick={() => navigate('/patient')}
          className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
        >
          My Visits
        </button>
      </div>
    </div>
  );
};
