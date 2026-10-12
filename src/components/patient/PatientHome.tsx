import React, { useEffect, useState } from 'react';
import { AlertCircle, ClipboardList, FileText, Loader2, Pencil, Plus, RefreshCw } from 'lucide-react';
import { fetchMyCases } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { PatientRecord } from '../../types/medical';
import { navigate } from '../../lib/router';
import { formatDateTime, roomShort } from '../../lib/format';
import { riskTheme, StatusBadge } from '../caseUi';

/** Patient dashboard — only the logged-in patient's own cases (enforced by the server). */
export const PatientHome: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<PatientRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchMyCases()
      .then(setCases)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome, {user?.fullName}</h1>
          <p className="text-xs text-slate-500 mt-1">Your OPD pre-registrations and their doctor-review status.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            id="btn-new-assessment"
            onClick={() => navigate('/patient/new')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Assessment
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your visits…
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && cases && cases.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No visits yet</p>
          <p className="text-xs text-slate-500 mt-1">Start a new assessment to get your digital token.</p>
        </div>
      )}

      {!loading && cases && cases.length > 0 && (
        <div id="my-cases" className="space-y-3">
          {cases.map((c) => {
            const theme = riskTheme(c.analysis?.riskLevel);
            const base = `/patient/cases/${encodeURIComponent(c.id)}`;
            return (
              <div key={c.id} data-case-id={c.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[84px]">
                    <div className="font-mono text-lg font-black text-emerald-700">{c.tokenNumber}</div>
                    <div className="font-mono text-[10px] text-slate-400">{c.id}</div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{c.department}</span>
                      <span className="text-[11px] text-slate-500">{roomShort(c.opdRoom)}</span>
                      {c.analysis && <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${theme.badgeBg}`}>{c.analysis.riskLevel}</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{c.symptoms.join(', ')} • {c.duration}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(c.createdAt)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} />
                  <button onClick={() => navigate(base)} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700">
                    Open
                  </button>
                  <button onClick={() => navigate(`${base}/parchi`)} className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Parchi
                  </button>
                  {c.canEdit && (
                    <button onClick={() => navigate(`${base}/edit`)} className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
