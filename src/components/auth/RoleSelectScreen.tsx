import React from 'react';
import { User, Stethoscope, ChevronRight, LogOut, HeartPulse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RoleSelectScreenProps {
  onSelectPatient: () => void;
  onSelectDoctor: () => void;
}

export const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({
  onSelectPatient,
  onSelectDoctor,
}) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf9' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pt-8 pb-8"
        style={{ background: 'linear-gradient(160deg, #0d9488 0%, #0f766e 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <svg viewBox="0 0 48 48" fill="none" className="w-6 h-6">
              <path d="M24 4 L42 16 L42 38 Q42 44 36 44 L12 44 Q6 44 6 38 L6 16 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
              <path d="M24 33 C24 33 14 26 14 20 C14 16.5 17 14 20 14 C22 14 23.5 15.5 24 17 C24.5 15.5 26 14 28 14 C31 14 34 16.5 34 20 C34 26 24 33 24 33Z" fill="white" />
              <rect x="22.5" y="17.5" width="3" height="10" rx="1.5" fill="#0d9488" />
              <rect x="18.5" y="21.5" width="11" height="3" rx="1.5" fill="#0d9488" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black text-white">Medi</span>
            <span className="text-xl font-black" style={{ color: '#a7f3d0' }}>Nexus AI</span>
            <p className="text-teal-200 text-xs font-medium">AI Medical Assistant</p>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-teal-100 hover:text-white text-sm font-medium transition"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-4 py-8 max-w-md mx-auto w-full">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Select Your Identity</h2>
          <p className="text-slate-500 text-sm mt-1">Choose your role to continue</p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200">
              <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-semibold text-teal-700">
                Welcome, {user.fullName}
              </span>
            </div>
          )}
        </div>

        {/* Role cards */}
        <div className="space-y-4">
          {/* Patient card */}
          <button
            id="select-patient"
            onClick={onSelectPatient}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-md border border-slate-100 hover:border-teal-300 hover:shadow-lg transition-all group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #ccfbf1, #99f6e4)' }}>
              <User className="w-7 h-7 text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800 mb-0.5">Patient</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Book appointments, view reports and manage your health
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-teal-500 flex-shrink-0 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Doctor card */}
          <button
            id="select-doctor"
            onClick={onSelectDoctor}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-md border border-slate-100 hover:border-teal-300 hover:shadow-lg transition-all group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)' }}>
              <Stethoscope className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-800 mb-0.5">Doctor</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Access patient records, manage appointments and provide care
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-teal-500 flex-shrink-0 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Decorative doctor illustration placeholder */}
        <div className="flex-1 flex items-end justify-center mt-8 pb-4 pointer-events-none select-none">
          <div className="flex flex-col items-center gap-2 opacity-30">
            <HeartPulse className="w-12 h-12 text-teal-500" />
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-1.5 rounded-full bg-teal-400"
                  style={{ height: `${[12,20,16,24,10][i-1]}px`, marginTop: `${[6,0,4,0,8][i-1]}px` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
