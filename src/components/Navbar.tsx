import React from 'react';
import { Activity, ClipboardList, Stethoscope, FileText, CheckCircle, Sparkles, RefreshCw, LogOut } from 'lucide-react';

interface NavbarProps {
  currentScreen: number;
  onSelectScreen: (screen: number) => void;
  onLoadPreset: (preset: 'fever' | 'dermatology') => void;
  onReset: () => void;
  hasActivePatient: boolean;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onSelectScreen,
  onLoadPreset,
  onReset,
  hasActivePatient,
  onLogout,
}) => {
  const screens = [
    { id: 1, label: '1. Patient Registration', shortLabel: 'Registration', icon: ClipboardList },
    { id: 2, label: '2. AI Medical Analysis', shortLabel: 'AI Triage', icon: Sparkles, disabled: !hasActivePatient },
    { id: 3, label: '3. Digital Parchi', shortLabel: 'Digital Parchi', icon: FileText, disabled: !hasActivePatient },
    { id: 4, label: '4. Doctor Dashboard', shortLabel: 'Doctor OPD', icon: Stethoscope },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm no-print">
      {/* Top hospital announcement bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            HACKATHON MVP
          </span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            SmartCare OPD Queue-Buster & Triage Pre-Check System
          </span>
          <span className="text-slate-400 text-[11px]">
            • Supported: General Medicine & Dermatology
          </span>
        </div>

        {/* Quick Demo Pre-loaders for Hackathon Judges */}
        <div className="flex items-center space-x-2 ml-auto">
          <span className="text-slate-400 text-[11px] hidden md:inline">Quick Test:</span>
          <button
            onClick={() => onLoadPreset('fever')}
            title="Load a high-risk General Medicine patient"
            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Load Fever/Cough Demo
          </button>
          <button
            onClick={() => onLoadPreset('dermatology')}
            title="Load an acute Dermatology rash patient"
            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Load Skin Rash Demo
          </button>
          <button
            onClick={onReset}
            title="Clear current patient form"
            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 transition flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
          {onLogout && (
            <button
              id="navbar-logout"
              onClick={onLogout}
              title="Logout"
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-200 border border-slate-700 transition flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main navigation & brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectScreen(1)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">SmartCare</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                  AI Medical Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                "From Digital Registration to Smarter Medical Care."
              </p>
            </div>
          </div>

          {/* Stepper Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {screens.map((screen) => {
              const Icon = screen.icon;
              const isActive = currentScreen === screen.id;
              const isDisabled = screen.disabled;

              return (
                <button
                  key={screen.id}
                  disabled={isDisabled}
                  onClick={() => onSelectScreen(screen.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : isDisabled
                      ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={isDisabled ? 'Complete Patient Registration first' : screen.label}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isDisabled ? 'text-slate-300' : 'text-slate-500'}`} />
                  <span className="hidden lg:inline">{screen.label}</span>
                  <span className="lg:hidden">{screen.shortLabel}</span>
                  {isActive && <CheckCircle className="w-3.5 h-3.5 ml-1 text-emerald-200" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
