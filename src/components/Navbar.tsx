import React from 'react';
import { Activity, ClipboardList, Stethoscope, FileText, CheckCircle, Sparkles, LogOut, History, UserCircle2 } from 'lucide-react';
import type { AuthUser } from '../types/auth';
import { navigate } from '../lib/router';
import { homeFor } from '../lib/routeAccess';

interface NavbarProps {
  user: AuthUser;
  path: string;
  activeCaseId: string | null;
  onLogout: () => void;
}

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string | null; // null = disabled
}

/** Navigation is built from the server-verified role: patients never see doctor links and vice versa. */
export const Navbar: React.FC<NavbarProps> = ({ user, path, activeCaseId, onLogout }) => {
  const isDoctor = user.role === 'DOCTOR';
  const caseBase = activeCaseId ? `/patient/cases/${encodeURIComponent(activeCaseId)}` : null;

  const tabs: Tab[] = isDoctor
    ? [{ id: 'doctor', label: 'Doctor Dashboard', shortLabel: 'Doctor OPD', icon: Stethoscope, to: '/doctor' }]
    : [
        { id: 'home', label: 'My Visits', shortLabel: 'My Visits', icon: History, to: '/patient' },
        { id: 'new', label: '1. New Assessment', shortLabel: 'New', icon: ClipboardList, to: '/patient/new' },
        { id: 'case', label: '2. Triage Result', shortLabel: 'Result', icon: Sparkles, to: caseBase },
        { id: 'parchi', label: '3. Digital Parchi', shortLabel: 'Parchi', icon: FileText, to: caseBase ? `${caseBase}/parchi` : null },
      ];

  const isActive = (t: Tab) => {
    if (!t.to) return false;
    if (t.id === 'case') return path === t.to || path === `${t.to}/edit`;
    return path === t.to;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm no-print">
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            MVP
          </span>
          <span className="text-slate-300 font-medium hidden sm:inline">AI-Assisted OPD Registration &amp; Decision Support</span>
          <span className="text-slate-400 text-[11px]">• General Medicine &amp; Dermatology</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1.5 text-slate-300" id="navbar-user">
            <UserCircle2 className="w-3.5 h-3.5" />
            <span className="font-medium">{user.fullName}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                isDoctor ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30' : 'bg-teal-500/20 text-teal-200 border border-teal-500/30'
              }`}
            >
              {isDoctor ? 'Doctor' : 'Patient'}
            </span>
          </span>
          <button
            id="navbar-logout"
            onClick={onLogout}
            title="Logout"
            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 transition flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(homeFor(user.role))}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">MediNexus AI</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                  {isDoctor ? 'Physician Portal' : 'Patient Portal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">"From Digital Registration to Smarter Medical Care."</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 md:pb-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = isActive(t);
              const disabled = !t.to;
              return (
                <button
                  key={t.id}
                  id={`nav-${t.id}`}
                  disabled={disabled}
                  onClick={() => t.to && navigate(t.to)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : disabled
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={disabled ? 'Open or create an assessment first' : t.label}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : disabled ? 'text-slate-300' : 'text-slate-500'}`} />
                  <span className="hidden lg:inline">{t.label}</span>
                  <span className="lg:hidden">{t.shortLabel}</span>
                  {active && <CheckCircle className="w-3.5 h-3.5 ml-1 text-emerald-200" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
