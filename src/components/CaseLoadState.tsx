import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { navigate } from '../lib/router';

export const CaseLoadState: React.FC<{ loading: boolean; error: string | null }> = ({ loading, error }) => (
  <div className="max-w-4xl mx-auto py-16 px-4">
    {loading ? (
      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading case…
      </div>
    ) : (
      <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Could not open this case</div>
          <div className="text-xs mt-0.5">{error}</div>
          <button onClick={() => navigate('/patient')} className="mt-2 text-xs font-semibold underline">
            Back to My Visits
          </button>
        </div>
      </div>
    )}
  </div>
);
