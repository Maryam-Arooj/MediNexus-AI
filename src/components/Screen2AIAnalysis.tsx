import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Building2, ArrowRight, User, ArrowLeft, Stethoscope, Info } from 'lucide-react';
import { useCase } from '../hooks/useCase';
import { navigate } from '../lib/router';
import { formatDateTime, roomShort } from '../lib/format';
import { CaseLoadState } from './CaseLoadState';
import { riskTheme, StatusBadge } from './caseUi';
import { EmergencyBanner } from './EmergencyBanner';

/** Screen 2 — rule-based triage result for the patient's own case. */
export const Screen2AIAnalysis: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { record: patient, error, loading } = useCase(caseId);
  if (!patient) return <CaseLoadState loading={loading} error={error} />;

  const analysis = patient.analysis;
  const theme = riskTheme(analysis?.riskLevel);
  const base = `/patient/cases/${encodeURIComponent(patient.id)}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <EmergencyBanner record={patient} />
      <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold tracking-tight text-amber-900 uppercase">Rule-based triage — not a diagnosis</div>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            This priority comes from fixed, published rules applied to the symptoms you selected (not AI, no
            examination). Any AI suggestions you saw while describing your symptoms were only to help fill the form. It only helps sort urgency and route you to the right OPD. A licensed doctor makes every diagnosis
            and treatment decision.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{patient.name}</span>
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
          <span id="token-number" className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            {patient.tokenNumber}
          </span>
        </div>
      </div>

      {!analysis ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          The triage result for this older case is missing. Please show your token at the OPD counter.
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`rounded-xl border-2 p-6 ${theme.bg} ${theme.border}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Triage Priority</span>
                <span id="risk-label" className={`px-3 py-1 rounded-md text-sm font-extrabold uppercase tracking-wide shadow-sm ${theme.badgeBg}`}>
                  {theme.label}
                </span>
                <p className={`text-xs mt-2 font-medium ${theme.text}`}>{theme.subtext}</p>
                <p className="text-xs mt-2 text-slate-600">
                  <strong>Why:</strong> {analysis.riskReason ?? '—'}{' '}
                  <span className="text-slate-400">(rule set {analysis.engineVersion})</span>
                </p>
              </div>
              <div className="bg-white/80 p-3 rounded-lg border border-slate-200/80 min-w-[210px]">
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex justify-between">
                  <span>Priority Scale</span>
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

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className={`w-5 h-5 ${analysis.riskLevel === 'High' ? 'text-rose-600' : 'text-amber-500'}`} />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Warnings From the Triage Rules</h3>
            </div>
            {analysis.redFlags.length === 0 ? (
              <p className="text-xs text-slate-600 p-3 rounded-lg bg-slate-50 border border-slate-200">
                No warning rule matched the symptoms you selected. This does not rule out a serious illness.
              </p>
            ) : (
              <div className="space-y-2">
                {analysis.redFlags.map((flag, idx) => (
                  <div key={idx} className={`p-3 rounded-lg text-xs leading-relaxed border ${theme.bg} ${theme.border} ${theme.text}`}>
                    {flag}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Suggested Department</h3>
              </div>
              <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-extrabold text-teal-900">{patient.department}</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-teal-600 text-white">{roomShort(patient.opdRoom)}</span>
                </div>
                <p className="text-xs text-teal-700 mt-2">
                  Chosen from the symptom group with the most selections. Go directly to this department's counter with your token.
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Doctor Review</h3>
              </div>
              <StatusBadge status={patient.status} />
              <div className="text-xs text-slate-600 mt-3 space-y-1">
                {patient.review.approvedBy && (
                  <div>Approved by <strong>{patient.review.approvedBy}</strong> on {formatDateTime(patient.review.approvedAt)}</div>
                )}
                {!patient.review.approvedBy && patient.review.reviewedBy && (
                  <div>Being reviewed by <strong>{patient.review.reviewedBy}</strong></div>
                )}
                <div className="text-slate-400">Submitted {formatDateTime(patient.createdAt)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">What To Do Next</h3>
              {analysis.actionOverriddenByDoctor && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Updated by your doctor</span>
              )}
            </div>
            <p id="recommended-action" className="text-xs sm:text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200 leading-relaxed">
              {analysis.recommendedAction}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            {patient.canEdit ? (
              <button
                type="button"
                id="btn-edit-symptoms"
                onClick={() => navigate(`${base}/edit`)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Symptoms</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> A doctor is reviewing this case, so it can't be edited.
              </span>
            )}
            <button
              type="button"
              id="btn-proceed-parchi"
              onClick={() => navigate(`${base}/parchi`)}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              <span>View Digital Parchi (Slip)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
