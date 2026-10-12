import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Stethoscope, Filter, CheckCircle2, AlertTriangle, Clock, Edit3, X, ShieldAlert, Search, Check, Save, Loader2,
  RefreshCw, AlertCircle, RotateCcw, Info, Siren, Sparkles,
} from 'lucide-react';
import type { CaseSummary, Department, PatientRecord, PatientStatus } from '../types/medical';
import { approveCase, fetchAiCaseSummary, fetchDoctorQueue, reopenCase, saveReview } from '../api/client';
import { AiBadge, AiNotice } from './ai/AiNotice';
import { formatDateTime } from '../lib/format';
import { StatusBadge } from './caseUi';

type StatusFilter = 'All' | PatientStatus;

/** Screen 4 — Physician OPD dashboard (doctor-only; every call is re-authorised by the server). */
export const Screen4DoctorDashboard: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<'All' | Department>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<PatientRecord | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editAction, setEditAction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalInfo, setModalInfo] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<CaseSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const openCaseId = useRef<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setPatients(await fetchDoctorQueue());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load patients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    // Open emergency cases always appear first; otherwise keep the server order (newest first).
    const urgent = (p: PatientRecord) => (p.emergency && p.status !== 'Approved' ? 0 : 1);
    return [...patients].sort((x, y) => urgent(x) - urgent(y)).filter((p) => {
      if (departmentFilter !== 'All' && p.department !== departmentFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.tokenNumber.toLowerCase().includes(q) ||
        p.symptoms.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [patients, departmentFilter, statusFilter, searchQuery]);

  const replace = (updated: PatientRecord) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelected(updated);
  };

  const openReport = (p: PatientRecord) => {
    setSelected(p);
    setIsEditing(false);
    setEditNotes(p.review.clinicalNotes ?? '');
    setEditAction(p.analysis?.recommendedAction ?? '');
    setModalError(null);
    setModalInfo(null);
    setAiSummary(null);
    setAiError(null);
    openCaseId.current = p.id;
  };

  // AI draft summary (Gemini). De-identified input on the server; nothing is stored.
  const generateAiSummary = async () => {
    if (!selected || aiLoading) return;
    const id = selected.id;
    setAiLoading(true);
    setAiError(null);
    try {
      const s = await fetchAiCaseSummary(id);
      if (openCaseId.current === id) setAiSummary(s); // ignore a late reply for a case that was closed
    } catch (err) {
      if (openCaseId.current === id) setAiError(err instanceof Error ? err.message : 'The AI summary is unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  const closeReport = () => {
    if (isSaving) return;
    setSelected(null);
    openCaseId.current = null;
    setIsEditing(false);
  };

  const run = async (fn: () => Promise<void>) => {
    setIsSaving(true);
    setModalError(null);
    setModalInfo(null);
    try {
      await fn();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () =>
    run(async () => {
      if (!selected) return;
      const { record, changed } = await saveReview(selected.id, { clinicalNotes: editNotes, recommendedAction: editAction });
      replace(record);
      setIsEditing(false);
      if (!changed) setModalInfo('No changes to save.');
    });

  const handleApprove = () =>
    run(async () => {
      if (!selected) return;
      // If the doctor is mid-edit, save those edits first so nothing typed is lost.
      if (isEditing) await saveReview(selected.id, { clinicalNotes: editNotes, recommendedAction: editAction });
      const record = await approveCase(selected.id, {});
      replace(record);
      setIsEditing(false);
    });

  const handleReopen = () =>
    run(async () => {
      if (!selected) return;
      replace(await reopenCase(selected.id));
    });

  const highRiskCount = patients.filter((p) => p.analysis?.riskLevel === 'High' && p.status !== 'Approved').length;
  const pendingCount = patients.filter((p) => p.status !== 'Approved').length;
  const a = selected?.analysis;
  const approved = selected?.status === 'Approved';

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Physician OPD Triage Dashboard</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review pre-registered patients, check the rule-based triage, add clinical notes and approve consultations.
          </p>
        </div>
        <button
          id="btn-refresh-queue"
          onClick={load}
          className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loadError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <div className="font-semibold">Cannot load patients</div>
            <div className="text-xs mt-0.5">{loadError}</div>
            <button onClick={load} className="mt-2 text-xs text-rose-700 underline font-semibold">Try again</button>
          </div>
        </div>
      )}
      {isLoading && (
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading patients…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Cases</span>
          <div id="metric-total" className="text-2xl font-extrabold text-slate-900 mt-1">{patients.length}</div>
          <span className="text-[11px] text-slate-400">All digitally registered cases</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30">
          <span className="text-xs font-semibold text-rose-700 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> High Priority (open)
          </span>
          <div className="text-2xl font-extrabold text-rose-800 mt-1">{highRiskCount}</div>
          <span className="text-[11px] text-rose-600">Priority rule matched, not yet approved</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30">
          <span className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Awaiting Approval
          </span>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">{pendingCount}</div>
          <span className="text-[11px] text-amber-600">Pending or under review</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          <span className="text-xs font-bold text-slate-600 mr-1">Department:</span>
          {(['All', 'General Medicine', 'Dermatology'] as const).map((d) => (
            <button
              key={d}
              data-filter-dept={d}
              onClick={() => setDepartmentFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${departmentFilter === d ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {d}
            </button>
          ))}
          <span className="text-xs font-bold text-slate-600 ml-3 mr-1">Status:</span>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-2 py-1.5 rounded-lg text-xs border border-slate-200 bg-white"
          >
            {(['All', 'Pending Review', 'Under Review', 'Approved'] as const).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="queue-search"
            type="text"
            placeholder="Search name, ID, token, symptom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table id="queue-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Token &amp; Patient ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Symptoms</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {patients.length === 0 && !isLoading ? 'No cases registered yet.' : 'No cases match the selected filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const level = p.analysis?.riskLevel;
                  return (
                    <tr key={p.id} data-case-id={p.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => openReport(p)}>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{p.tokenNumber}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-slate-500 text-[11px]">{p.age}y • {p.gender} • {formatDateTime(p.createdAt)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${p.department === 'General Medicine' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {p.department}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {p.symptoms.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.emergency && (
                          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white" data-emergency="true">
                            <Siren className="h-3 w-3" /> Emergency
                          </span>
                        )}
                        <br className={p.emergency ? '' : 'hidden'} />
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${level === 'High' ? 'bg-rose-100 text-rose-700 border border-rose-200' : level === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          {level ?? 'n/a'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4"><StatusBadge status={p.status} /></td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); openReport(p); }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-lg transition"
                        >
                          Open Report
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" onClick={closeReport}>
          <div id="review-modal" className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900 text-white p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Clinical Review</h2>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-teal-300 rounded border border-slate-700">{selected.tokenNumber}</span>
                  </div>
                  <p className="text-xs text-slate-400">Patient ID: {selected.id} • Registered {formatDateTime(selected.createdAt)}</p>
                </div>
              </div>
              <button onClick={closeReport} aria-label="Close" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient</span>
                  <span className="font-bold text-slate-900 text-sm">{selected.name}</span>
                  <span className="text-slate-500 ml-1">({selected.age}y, {selected.gender})</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">Department</span>
                  <span className="font-bold text-teal-700 text-sm">{selected.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">Status</span>
                  <span id="modal-status"><StatusBadge status={selected.status} /></span>
                </div>
              </div>
              {selected.isLegacyUnlinked && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Older record created before patient accounts were linked.
                </div>
              )}

              {!a ? (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">Triage data is missing for this older record.</div>
              ) : (
                <>
                  <div className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Rule-based priority ({a.engineVersion})</span>
                      <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${a.riskLevel === 'High' ? 'bg-rose-600 text-white' : a.riskLevel === 'Medium' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
                        {a.riskLevel}
                      </span>
                      <span className="text-xs text-slate-600 ml-2">{a.riskReason}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block">Reported</span>
                      <span className="font-bold text-slate-700 text-xs">{selected.symptoms.join(', ')} • {selected.duration}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" /> Triage Rule Warnings
                    </h3>
                    {a.redFlags.length === 0 ? (
                      <p className="text-xs text-slate-500">No warning rule matched.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {a.redFlags.map((f, i) => (
                          <li key={i} className="text-xs text-slate-800 bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg flex items-start gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {a.possibleConditions && a.possibleConditions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">Conditions to consider</h3>
                      <p className="text-[11px] text-slate-500 mb-2">Fixed list chosen by the rules from the reported symptoms — for your consideration, not a diagnosis.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {a.possibleConditions.map((c) => (
                          <span key={c} className="px-2 py-1 rounded bg-blue-50 border border-blue-100 text-blue-800 text-xs">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.emergency && (
                    <div className="flex items-start gap-2 rounded-xl border-2 border-rose-500 bg-rose-50 p-3 text-xs text-rose-900">
                      <Siren className="h-5 w-5 flex-shrink-0 text-rose-600" />
                      <div>
                        <strong>Emergency danger sign reported by the patient</strong> (fixed safety rule). The patient was advised to go to the
                        Emergency department / call 1122. Please assess immediately.
                      </div>
                    </div>
                  )}

                  {a.handoverSummary && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">Handover Summary (auto-generated from patient input)</h3>
                      <p className="text-xs text-slate-700 font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{a.handoverSummary}</p>
                    </div>
                  )}

                  <div id="ai-summary-panel" className="rounded-xl border-2 border-violet-200 bg-violet-50/40 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-900">
                        AI case summary (SBAR draft) <AiBadge />
                      </h3>
                      <button
                        type="button"
                        id="btn-ai-summary"
                        onClick={generateAiSummary}
                        disabled={aiLoading}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {aiSummary ? 'Regenerate' : 'Generate AI summary'}
                      </button>
                    </div>
                    {!aiSummary && !aiError && !aiLoading && (
                      <p className="text-[11px] text-slate-500">Sends only age, gender, symptoms, duration and the rule result to the AI — no name, CNIC or contact details.</p>
                    )}
                    {aiError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{aiError}</p>}
                    {aiSummary && (
                      <div id="ai-summary" className="space-y-2 text-xs text-slate-800">
                        {([['S — Situation', aiSummary.situation], ['B — Background', aiSummary.background], ['A — Assessment', aiSummary.assessment], ['R — Recommendation (verify)', aiSummary.recommendation]] as const).map(([k, v]) =>
                          v ? (
                            <div key={k}>
                              <span className="block text-[10px] font-bold uppercase text-violet-700">{k}</span>
                              <span>{v}</span>
                            </div>
                          ) : null
                        )}
                        {aiSummary.questionsToAsk.length > 0 && (
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-violet-700">Questions to ask</span>
                            <ul className="list-disc pl-4">
                              {aiSummary.questionsToAsk.map((q) => <li key={q}>{q}</li>)}
                            </ul>
                          </div>
                        )}
                        <AiNotice text="Draft for the doctor — verify before use. Based only on patient-reported data and the rule result; no examination or vitals." />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Recommended Action / Plan</h3>
                      {!isEditing && !approved && (
                        <button
                          id="btn-edit-plan"
                          onClick={() => setIsEditing(true)}
                          className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="edit-action" className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Recommended action shown to the patient
                          </label>
                          <textarea
                            id="edit-action"
                            rows={3}
                            maxLength={2000}
                            value={editAction}
                            onChange={(e) => setEditAction(e.target.value)}
                            className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          {a.defaultRecommendedAction && editAction.trim() !== a.defaultRecommendedAction && (
                            <button type="button" onClick={() => setEditAction(a.defaultRecommendedAction!)} className="text-[11px] text-slate-500 underline mt-1">
                              Reset to the rule engine's default
                            </button>
                          )}
                        </div>
                        <div>
                          <label htmlFor="edit-notes" className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Clinical notes (doctors only — not shown to the patient)
                          </label>
                          <textarea
                            id="edit-notes"
                            rows={4}
                            maxLength={5000}
                            value={editNotes}
                            placeholder="Examination findings, prescription, follow-up…"
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setIsEditing(false); setEditNotes(selected.review.clinicalNotes ?? ''); setEditAction(a.recommendedAction); }}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            id="btn-save-review"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
                          >
                            {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> Save</>}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p id="modal-action" className="text-xs text-slate-800 font-medium leading-relaxed">
                          {a.recommendedAction}
                          {a.actionOverriddenByDoctor && <span className="ml-2 text-[10px] font-bold text-blue-700">(edited by doctor)</span>}
                        </p>
                        {selected.review.clinicalNotes && (
                          <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-0.5">Clinical notes</span>
                            <p id="modal-notes" className="text-xs text-emerald-900 font-medium whitespace-pre-wrap">{selected.review.clinicalNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-500 space-y-0.5">
                {selected.review.reviewedBy && <div>Last reviewed by {selected.review.reviewedBy} • {formatDateTime(selected.review.reviewedAt)}</div>}
                {selected.review.approvedBy && <div id="modal-approved-by">Approved by {selected.review.approvedBy} • {formatDateTime(selected.review.approvedAt)}</div>}
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex flex-col gap-1">
                {modalError && (
                  <span role="alert" className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {modalError}
                  </span>
                )}
                {modalInfo && <span className="text-slate-600">{modalInfo}</span>}
                {approved ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved — reopen to make changes.
                  </span>
                ) : (
                  <span>Pending your approval.</span>
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {approved ? (
                  <button
                    id="btn-reopen"
                    onClick={handleReopen}
                    disabled={isSaving}
                    className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" /> Reopen
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-approve-report"
                    onClick={handleApprove}
                    disabled={isSaving || !a}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Working…</> : <><Check className="w-4 h-4" /> Approve</>}
                  </button>
                )}
                <button type="button" onClick={closeReport} disabled={isSaving} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
