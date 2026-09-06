import React, { useState } from 'react';
import { PatientRecord, Department } from '../types/medical';
import {
  Stethoscope,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit3,
  X,
  ShieldAlert,
  Search,
  Check,
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface Screen4Props {
  patients: PatientRecord[];
  isLoading?: boolean;
  loadError?: string | null;
  onUpdatePatient: (updated: PatientRecord) => void;
  onSaveReview: (
    patientId: string,
    data: { clinicalNotes?: string; recommendedActionOverride?: string; status?: string }
  ) => Promise<PatientRecord | null>;
  onApprovePatient: (
    patientId: string,
    data: { approvedBy?: string; clinicalNotes?: string }
  ) => Promise<PatientRecord | null>;
  onSelectPatientToView: (patient: PatientRecord) => void;
  onNewRegistration: () => void;
  onRefresh: () => void;
}

export const Screen4DoctorDashboard: React.FC<Screen4Props> = ({
  patients,
  isLoading = false,
  loadError = null,
  onSaveReview,
  onApprovePatient,
  onNewRegistration,
  onRefresh,
}) => {
  const [departmentFilter, setDepartmentFilter] = useState<'All' | Department>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  // Edit mode state inside the modal
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editAction, setEditAction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const filteredPatients = patients.filter((p) => {
    const matchesDept =
      departmentFilter === 'All' ? true : p.department === departmentFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.symptoms.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  const handleOpenReport = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsEditing(false);
    setEditNotes(patient.doctorNotes || '');
    setEditAction(patient.analysis.recommendedAction);
  };

  const handleCloseReport = () => {
    setSelectedPatient(null);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedPatient) return;
    setIsSaving(true);
    setModalError(null);
    try {
      const updated = await onSaveReview(selectedPatient.id, {
        clinicalNotes: editNotes,
        recommendedActionOverride: editAction,
        status: 'Under Review',
      });
      if (updated) {
        setSelectedPatient(updated);
      }
      setIsEditing(false);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save. Check backend connection.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPatient) return;
    setIsSaving(true);
    setModalError(null);
    try {
      const updated = await onApprovePatient(selectedPatient.id, {
        approvedBy: 'Dr. Resident Medical Officer',
        clinicalNotes: editNotes || selectedPatient.doctorNotes,
      });
      if (updated) {
        setSelectedPatient(updated);
      }
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to approve. Check backend connection.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics summary
  const totalCount = patients.length;
  const highRiskCount = patients.filter((p) => p.analysis.riskLevel === 'High').length;
  const pendingCount = patients.filter((p) => p.status !== 'Approved').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Physician OPD Triage Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review pre-registered patients, inspect AI-generated symptom triage, edit clinical notes, and approve consultations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            title="Reload patients from database"
            className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={onNewRegistration}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            + Register New Patient
          </button>
        </div>
      </div>

      {/* Database load error — shown when backend/PostgreSQL is unreachable */}
      {loadError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <div className="font-semibold">Cannot load patients from database</div>
            <div className="text-xs mt-0.5">{loadError}</div>
            <button
              onClick={onRefresh}
              className="mt-2 text-xs text-rose-700 underline font-semibold"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading patients from PostgreSQL...
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Queue</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount} Patients</div>
          <span className="text-[11px] text-slate-400">Digitally pre-checked</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> High Risk Priority
          </span>
          <div className="text-2xl font-extrabold text-rose-800 mt-1">{highRiskCount} Patients</div>
          <span className="text-[11px] text-rose-600">Immediate attention advised</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Awaiting Review
          </span>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">{pendingCount} Patients</div>
          <span className="text-[11px] text-amber-600">Requires doctor approval</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Department Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          <span className="text-xs font-bold text-slate-600 mr-2">Department:</span>
          {(['All', 'General Medicine', 'Dermatology'] as const).map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                departmentFilter === dept
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, ID, symptom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Token &amp; Patient ID</th>
                <th className="py-3 px-4">Patient Demographics</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Presenting Symptoms</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No patients match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                  const isHigh = p.analysis.riskLevel === 'High';
                  const isMed = p.analysis.riskLevel === 'Medium';
                  const isApproved = p.status === 'Approved';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      onClick={() => handleOpenReport(p)}
                    >
                      {/* Patient ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{p.tokenNumber}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.id}</div>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{p.name || 'Anonymous'}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.age}y • {p.gender}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          p.department === 'General Medicine'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.department}
                        </span>
                      </td>

                      {/* Symptoms */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {p.symptoms.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Risk Level */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isHigh
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isMed
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {p.analysis.riskLevel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {isApproved ? <Check className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          {p.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReport(p);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-md transition"
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

      {/* DOCTOR PATIENT REPORT MODAL (REQUIRED) */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900 text-white p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      Doctor Clinical Review &amp; Triage Report
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-teal-300 rounded border border-slate-700">
                      {selectedPatient.tokenNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Patient ID: {selectedPatient.id} • Registered: {selectedPatient.createdAt}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseReport}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Patient Demographics Bar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">Patient</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedPatient.name || 'Anonymous'}</span>
                  <span className="text-slate-500 ml-1">({selectedPatient.age}y, {selectedPatient.gender})</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">Department</span>
                  <span className="font-bold text-teal-700 text-sm">{selectedPatient.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-semibold text-[10px] block">Triage Status</span>
                  <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                    selectedPatient.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {selectedPatient.status === 'Approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {selectedPatient.status}
                  </span>
                </div>
              </div>

              {/* 1. Risk Level */}
              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Assessed Risk Level</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${
                      selectedPatient.analysis.riskLevel === 'High'
                        ? 'bg-rose-600 text-white'
                        : selectedPatient.analysis.riskLevel === 'Medium'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {selectedPatient.analysis.riskLevel} Risk
                    </span>
                    <span className="text-xs text-slate-500">
                      Triage confidence {selectedPatient.analysis.confidenceScore}%
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Reported Duration</span>
                  <span className="font-bold text-slate-700 text-xs">{selectedPatient.duration}</span>
                </div>
              </div>

              {/* 2. Red Flags */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-rose-700 mb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Identified Red Flags &amp; Triage Warnings
                </div>
                <ul className="space-y-1.5">
                  {selectedPatient.analysis.redFlags.map((flag, idx) => (
                    <li key={idx} className="text-xs text-slate-800 bg-white p-2.5 rounded-md border border-slate-200 flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. AI-Generated Summary */}
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30">
                <span className="text-xs font-bold uppercase text-teal-800 block mb-1">
                  AI Pre-Triage Handover Summary
                </span>
                <p className="text-xs font-mono text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-teal-200/60">
                  "{selectedPatient.analysis.shortDoctorSummary}"
                </p>
              </div>

              {/* 4. Recommended Action (with inline edit mode) */}
              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-600">
                    Recommended Action / Clinical Plan
                  </span>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Plan
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Edit Recommended Action:
                      </label>
                      <textarea
                        rows={2}
                        value={editAction}
                        onChange={(e) => setEditAction(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Doctor Clinical Notes / Prescription overrides:
                      </label>
                      <textarea
                        rows={3}
                        value={editNotes}
                        placeholder="Enter attending doctor notes, e.g. Auscultated lungs: clear, prescribed Paracetamol 500mg TDS x 3 days."
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded text-xs border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                      >
                        {isSaving ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                        ) : (
                          <><Save className="w-3.5 h-3.5" /> Save Edits</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-700 font-medium bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {selectedPatient.analysis.recommendedAction}
                    </p>

                    {selectedPatient.doctorNotes && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                        <div className="text-[11px] font-bold text-emerald-800 uppercase mb-1">
                          Doctor Clinical Notes:
                        </div>
                        <p className="text-xs text-emerald-900 font-medium">
                          {selectedPatient.doctorNotes}
                        </p>
                        {selectedPatient.approvedBy && (
                          <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
                            — {selectedPatient.approvedBy} ({selectedPatient.approvedAt})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Edit & Approve Buttons (REQUIRED) */}
            <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 flex flex-col gap-1">
                {modalError && (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{modalError}
                  </span>
                )}
                {selectedPatient.status === 'Approved' ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Consultation &amp; Triage Approved by Doctor
                  </span>
                ) : (
                  <span>Pending attending physician approval.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={isSaving}
                    className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Edit3 className="w-4 h-4 text-slate-500" />
                    <span>Edit</span>
                  </button>
                )}

                {selectedPatient.status !== 'Approved' ? (
                  <button
                    type="button"
                    id="btn-approve-report"
                    onClick={handleApprove}
                    disabled={isSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Approve Triage</>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseReport}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
