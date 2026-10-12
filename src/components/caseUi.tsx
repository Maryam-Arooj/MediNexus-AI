import React from 'react';
import { CheckCircle2, Clock, Eye } from 'lucide-react';
import type { PatientStatus, RiskLevel } from '../types/medical';

export function riskTheme(level: RiskLevel | undefined) {
  if (level === 'High')
    return {
      bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-800', badgeBg: 'bg-rose-600 text-white',
      label: 'HIGH PRIORITY', subtext: 'A priority rule matched. Please go to the OPD for prompt doctor review.',
      queue: 'High Priority Queue',
    };
  if (level === 'Medium')
    return {
      bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', badgeBg: 'bg-amber-500 text-white',
      label: 'MEDIUM PRIORITY / SAME-DAY', subtext: 'A same-day review rule matched.',
      queue: 'Same-day Review',
    };
  return {
    bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', badgeBg: 'bg-emerald-600 text-white',
    label: 'ROUTINE', subtext: 'No priority rule matched. This does not rule out illness — a doctor will still see you.',
    queue: 'Routine Consultation',
  };
}

export const StatusBadge: React.FC<{ status: PatientStatus; className?: string }> = ({ status, className = '' }) => {
  const map = {
    Approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2, label: 'Approved by doctor' },
    'Under Review': { cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Eye, label: 'Under doctor review' },
    'Pending Review': { cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: Clock, label: 'Awaiting doctor review' },
  } as const;
  const { cls, Icon, label } = map[status] ?? map['Pending Review'];
  return (
    <span data-status={status} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cls} ${className}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
};
