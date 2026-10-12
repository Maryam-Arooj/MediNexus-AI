import React from 'react';
import { Sparkles } from 'lucide-react';

/** Shared label for every AI output, so AI suggestions are never confused with rules or a diagnosis. */
export const AiNotice: React.FC<{ text?: string; className?: string }> = ({ text, className = '' }) => (
  <div className={`flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] leading-relaxed text-violet-900 ${className}`}>
    <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-600" />
    <span>
      <strong className="font-bold">AI-generated (Google Gemini).</strong>{' '}
      {text ?? 'Not a medical diagnosis. It can be wrong. A qualified doctor makes all medical decisions.'}
    </span>
  </div>
);

export const AiBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
    <Sparkles className="h-3 w-3" /> AI
  </span>
);

export const RulesBadge: React.FC = () => (
  <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
    Rules
  </span>
);
