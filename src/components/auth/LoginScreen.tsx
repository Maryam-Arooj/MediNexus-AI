import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, HeartPulse, ArrowRight, Loader2 } from 'lucide-react';
import { authLogin } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your CNIC/Email and password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { token, user } = await authLogin({ identifier: identifier.trim(), password });
      login(token, user);
      // AuthContext update triggers App.tsx routing to role-select
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf9' }}>
      {/* Top teal header */}
      <div
        className="flex flex-col items-center justify-center pt-12 pb-10 px-6"
        style={{ background: 'linear-gradient(160deg, #0d9488 0%, #0f766e 100%)' }}
      >
        {/* Logo mark */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9">
            <path d="M24 4 L42 16 L42 38 Q42 44 36 44 L12 44 Q6 44 6 38 L6 16 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5" />
            <path d="M24 33 C24 33 14 26 14 20 C14 16.5 17 14 20 14 C22 14 23.5 15.5 24 17 C24.5 15.5 26 14 28 14 C31 14 34 16.5 34 20 C34 26 24 33 24 33Z" fill="white" />
            <rect x="22.5" y="17.5" width="3" height="10" rx="1.5" fill="#0d9488" />
            <rect x="18.5" y="21.5" width="11" height="3" rx="1.5" fill="#0d9488" />
          </svg>
        </div>
        <div className="text-center">
          <span className="text-3xl font-black text-white">Medi</span>
          <span className="text-3xl font-black" style={{ color: '#a7f3d0' }}>Nexus AI</span>
          <p className="text-teal-200 text-xs font-medium tracking-widest uppercase mt-0.5">AI Medical Assistant</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 -mt-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 pt-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome Back</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to access your healthcare dashboard</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span className="text-red-500">⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* CNIC / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                CNIC / National ID or Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
                  placeholder="CNIC / National ID"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-2"
              style={{ background: 'linear-gradient(90deg, #0d9488, #0f766e)' }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                <><HeartPulse className="w-4 h-4" /> Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <button
              id="go-to-register"
              onClick={onNavigateToRegister}
              className="font-bold text-teal-600 hover:text-teal-700 transition"
            >
              Register
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 py-6">
        🔒 Your data is safe and secure — MediNexus AI uses bank-level encryption
      </p>
    </div>
  );
};
