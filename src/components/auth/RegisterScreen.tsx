import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Phone, Mail, CreditCard, ArrowRight, Loader2, Stethoscope } from 'lucide-react';
import { authRegister } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<UserRole>('patient');
  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !cnic || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms & Conditions.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { token, user } = await authRegister({
        fullName, cnic, phone, email, password, confirmPassword, role,
      });
      login(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f0fdf9' }}>
      {/* Top header */}
      <div
        className="flex items-center justify-between px-6 pt-8 pb-6"
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
      </div>

      {/* Card */}
      <div className="flex-1 px-4 -mt-2">
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl p-7 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Create Your Account</h2>
          <p className="text-slate-500 text-sm mb-5">Join MediNexus AI for a better healthcare experience</p>

          {/* Role tabs */}
          <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
            <button
              id="role-patient"
              type="button"
              onClick={() => setRole('patient')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                role === 'patient'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4" /> Patient
            </button>
            <button
              id="role-doctor"
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                role === 'doctor'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Stethoscope className="w-4 h-4" /> Doctor
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reg-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name *"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            {/* CNIC */}
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reg-cnic"
                type="text"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="CNIC / National ID *"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address (optional)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password *"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600" tabIndex={-1}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="reg-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password *"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600" tabIndex={-1}>
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Terms */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id="reg-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded"
              />
              <span className="text-sm text-slate-600">
                I agree to the{' '}
                <span className="text-teal-600 font-semibold">Terms &amp; Conditions</span>
              </span>
            </label>

            {/* Register button */}
            <button
              id="register-submit"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 mt-1"
              style={{ background: 'linear-gradient(90deg, #0d9488, #0f766e)' }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
              ) : (
                <>Register <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <button id="go-to-login" onClick={onNavigateToLogin} className="font-bold text-teal-600 hover:text-teal-700 transition">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
