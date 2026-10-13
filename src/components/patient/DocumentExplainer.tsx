import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, FileSearch, FileUp, Loader2, Pill, ShieldAlert, Sparkles } from 'lucide-react';
import { ApiError, explainDocument } from '../../api/client';
import type { DocumentExplanation } from '../../types/medical';
import { navigate } from '../../lib/router';
import { AiBadge, AiNotice } from '../ai/AiNotice';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT: Record<string, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'application/pdf': 'PDF' };

const TYPE_LABEL: Record<DocumentExplanation['documentType'], string> = {
  lab_report: 'Lab report',
  prescription: 'Prescription',
  other_medical: 'Medical document',
  not_medical: 'Not a medical document',
  unreadable: 'Could not read the document',
};

const FLAG_STYLE: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700 border-rose-200',
  low: 'bg-amber-100 text-amber-800 border-amber-200',
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unclear: 'bg-slate-100 text-slate-600 border-slate-200',
};

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^;]+;base64,/, ''));
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

/** Patient page: AI explanation of a lab report or prescription. Nothing is stored. */
export const DocumentExplainer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentExplanation | null>(null);

  const pickFile = (f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) return setFile(null);
    if (!ACCEPT[f.type]) {
      setFile(null);
      return setError('Please choose a JPG, PNG or PDF file.');
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      return setError('The file is too large. The maximum size is 4 MB — try a smaller photo.');
    }
    setFile(f);
    setText('');
  };

  const run = async () => {
    if (loading || (!file && text.trim().length < 10)) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const input = file ? { fileBase64: await readAsBase64(file), mimeType: file.type } : { text: text.trim() };
      setResult(await explainDocument(input));
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Could not explain the document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <button onClick={() => navigate('/patient')} className="mb-4 flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> My visits
      </button>

      <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-800 to-indigo-800 p-6 text-white">
        <div className="mb-2 flex items-center gap-2">
          <FileSearch className="h-5 w-5" /> <AiBadge />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Understand a report or prescription</h1>
        <p className="mt-1 text-sm text-violet-100">
          Upload a clear photo or PDF of a lab report or prescription, or paste its text. The AI explains it in simple words.
          Nothing is saved. Please hide your name and CNIC on the document if you can.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/40 p-6 text-center hover:bg-violet-50">
          <FileUp className="h-7 w-7 text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">{file ? file.name : 'Choose a JPG, PNG or PDF (max 4 MB)'}</span>
          {file && <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB · {ACCEPT[file.type]}</span>}
          <input
            id="doc-file"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="text-center text-xs font-semibold text-slate-400">— or paste the text —</div>
        <textarea
          id="doc-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) setFile(null);
          }}
          maxLength={8000}
          rows={4}
          placeholder="e.g. Haemoglobin 9.8 g/dL (12.0 - 16.0) …"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        <div className="flex justify-end">
          <button
            id="btn-explain"
            onClick={run}
            disabled={loading || (!file && text.trim().length < 10)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Reading the document…' : 'Explain'}
          </button>
        </div>
        {loading && <p className="text-right text-xs text-slate-500">This can take up to 45 seconds.</p>}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {result && (
        <div id="doc-result" className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{TYPE_LABEL[result.documentType]}</span>
            <AiBadge />
          </div>
          {result.summary && <p className="text-sm leading-relaxed text-slate-800">{result.summary}</p>}

          {result.warnings.length > 0 && (
            <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-rose-800">
                <ShieldAlert className="h-4 w-4" /> Discuss with a doctor
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-rose-900">
                {result.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          {result.tests.length > 0 && (
            <div className="overflow-x-auto">
              <table id="doc-tests" className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Test</th>
                    <th className="py-2 pr-3">Result</th>
                    <th className="py-2 pr-3">Normal range (from report)</th>
                    <th className="py-2 pr-3">Flag</th>
                    <th className="py-2">What it means</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.tests.map((t, i) => (
                    <tr key={`${t.name}-${i}`}>
                      <td className="py-2 pr-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="whitespace-nowrap py-2 pr-3 font-mono">{t.value} {t.unit}</td>
                      <td className="py-2 pr-3 text-slate-600">{t.referenceRange || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${FLAG_STYLE[t.flag]}`}>{t.flag}</span>
                      </td>
                      <td className="py-2 text-slate-700">{t.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.medicines.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-800">
                <Pill className="h-4 w-4 text-violet-600" /> Medicines (copied as written)
              </h3>
              <ul id="doc-medicines" className="space-y-1.5">
                {result.medicines.map((m, i) => (
                  <li key={`${m.name}-${i}`} className="rounded-lg border border-slate-200 p-2.5 text-xs">
                    <strong className="text-slate-900">{m.name}</strong> {m.strength && <span className="font-mono">{m.strength}</span>}
                    <div className="text-slate-700">
                      {[m.howToTakeAsWritten, m.durationAsWritten].filter(Boolean).join(' · ') || 'Instructions unclear'}
                    </div>
                    {m.generalPurpose && <div className="text-slate-500">Usually used for: {m.generalPurpose}</div>}
                  </li>
                ))}
              </ul>
              {result.medicineNotice && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900">{result.medicineNotice}</p>
              )}
            </div>
          )}

          {result.questionsForDoctor.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-800">Questions to ask your doctor</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                {result.questionsForDoctor.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}

          <AiNotice text="This explanation may contain reading mistakes. It is not a diagnosis and not medical advice. Always check with your doctor or pharmacist." />
        </div>
      )}
    </div>
  );
};
