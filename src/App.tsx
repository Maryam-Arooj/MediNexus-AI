import React, { useState, useEffect, useCallback } from 'react';
import { PatientRecord, PatientRegistrationInput } from './types/medical';
import { Navbar } from './components/Navbar';
import { Screen1Registration } from './components/Screen1Registration';
import { Screen2AIAnalysis } from './components/Screen2AIAnalysis';
import { Screen3DigitalParchi } from './components/Screen3DigitalParchi';
import { Screen4DoctorDashboard } from './components/Screen4DoctorDashboard';
import { SplashScreen } from './components/auth/SplashScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { RoleSelectScreen } from './components/auth/RoleSelectScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import * as api from './api/client';

// ─── App shell — uses AuthContext ─────────────────────────────────────────────

type AuthScreen = 'splash' | 'login' | 'register' | 'roleSelect' | 'app';
type AppScreen = 1 | 2 | 3 | 4;

const AppInner: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  // Auth flow state
  const [authScreen, setAuthScreen] = useState<AuthScreen>('splash');
  // Main app screen (only shown after auth)
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(1);

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const defaultFormInput: PatientRegistrationInput = {
    name: '', age: '', gender: '', symptoms: [], duration: '',
  };
  const [formInput, setFormInput] = useState<PatientRegistrationInput>(defaultFormInput);
  const [activePatient, setActivePatient] = useState<PatientRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Once auth check resolves: if already authenticated → skip to roleSelect
  useEffect(() => {
    if (!isLoading && isAuthenticated && authScreen === 'splash') {
      // Already have a valid session — skip splash, go to roleSelect
      setAuthScreen('roleSelect');
    }
  }, [isLoading, isAuthenticated, authScreen]);

  // After login/register succeeds (isAuthenticated flips to true): go to roleSelect
  useEffect(() => {
    if (isAuthenticated && (authScreen === 'login' || authScreen === 'register')) {
      setAuthScreen('roleSelect');
    }
  }, [isAuthenticated, authScreen]);

  // ─── Patient data helpers ────────────────────────────────────────────────────

  const loadPatients = useCallback(async () => {
    setIsDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await api.fetchAllPatients();
      setPatients(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load patients from database.';
      setDashboardError(msg);
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentScreen === 4) loadPatients();
  }, [currentScreen, loadPatients]);

  const handleRegistrationSubmit = async (data: PatientRegistrationInput) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const patient = await api.registerPatient(data);
      setActivePatient(patient);
      setCurrentScreen(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check the backend is running.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadPreset = (preset: 'fever' | 'dermatology') => {
    if (preset === 'fever') {
      const d: PatientRegistrationInput = { name: 'Ramesh Verma', age: 54, gender: 'Male', symptoms: ['Fever', 'Cough', 'Body pain'], duration: '1 - 2 weeks' };
      setFormInput(d); handleRegistrationSubmit(d);
    } else {
      const d: PatientRegistrationInput = { name: 'Priya Sharma', age: 27, gender: 'Female', symptoms: ['Skin rash', 'Itching', 'Redness'], duration: '3 - 5 days' };
      setFormInput(d); handleRegistrationSubmit(d);
    }
  };

  const handleReset = () => {
    setFormInput(defaultFormInput);
    setActivePatient(null);
    setSubmitError(null);
    setCurrentScreen(1);
  };

  const handleUpdatePatient = async (updated: PatientRecord) => {
    setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (activePatient && activePatient.id === updated.id) setActivePatient(updated);
  };

  const handleSaveReview = async (
    patientId: string,
    data: { clinicalNotes?: string; recommendedActionOverride?: string; status?: string }
  ): Promise<PatientRecord | null> => {
    try {
      const updated = await api.savePatientReview(patientId, data);
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (activePatient && activePatient.id === updated.id) setActivePatient(updated);
      return updated;
    } catch (err) {
      console.error('Failed to save review:', err);
      throw err;
    }
  };

  const handleApprovePatient = async (
    patientId: string,
    data: { approvedBy?: string; clinicalNotes?: string }
  ): Promise<PatientRecord | null> => {
    try {
      const updated = await api.approvePatient(patientId, data);
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (activePatient && activePatient.id === updated.id) setActivePatient(updated);
      return updated;
    } catch (err) {
      console.error('Failed to approve patient:', err);
      throw err;
    }
  };

  const handleSelectPatientToView = (patient: PatientRecord) => {
    setActivePatient(patient);
    setCurrentScreen(3);
  };

  // ─── Logout handler ──────────────────────────────────────────────────────────

  const handleLogout = () => {
    logout();
    handleReset();
    setAuthScreen('login');
  };

  // ─── Auth flow rendering ─────────────────────────────────────────────────────

  // Show spinner while validating stored token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0d9488, #134e4a)' }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-teal-100">Loading MediNexus AI…</p>
        </div>
      </div>
    );
  }

  if (authScreen === 'splash') {
    return <SplashScreen onDone={() => setAuthScreen(isAuthenticated ? 'roleSelect' : 'login')} />;
  }

  if (authScreen === 'login' || (!isAuthenticated && authScreen !== 'register')) {
    return <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />;
  }

  if (authScreen === 'register') {
    return <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />;
  }

  if (authScreen === 'roleSelect') {
    return (
      <RoleSelectScreen
        onSelectPatient={() => { setCurrentScreen(1); setAuthScreen('app' as AuthScreen); }}
        onSelectDoctor={() => { setCurrentScreen(4); setAuthScreen('app' as AuthScreen); }}
      />
    );
  }

  // ─── Main app (existing screens — completely unchanged) ──────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentScreen={currentScreen}
        onSelectScreen={(screenId) => setCurrentScreen(screenId as AppScreen)}
        onLoadPreset={handleLoadPreset}
        onReset={handleReset}
        hasActivePatient={activePatient !== null}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {currentScreen === 1 && (
          <Screen1Registration
            key={JSON.stringify(formInput)}
            initialData={formInput}
            onSubmit={handleRegistrationSubmit}
            onLoadPreset={handleLoadPreset}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
        {currentScreen === 2 && activePatient && (
          <Screen2AIAnalysis
            patient={activePatient}
            onProceedToParchi={() => setCurrentScreen(3)}
            onBackToEdit={() => setCurrentScreen(1)}
          />
        )}
        {currentScreen === 3 && activePatient && (
          <Screen3DigitalParchi
            patient={activePatient}
            onProceedToDoctorDashboard={() => setCurrentScreen(4)}
            onBackToAnalysis={() => setCurrentScreen(2)}
          />
        )}
        {currentScreen === 4 && (
          <Screen4DoctorDashboard
            patients={patients}
            isLoading={isDashboardLoading}
            loadError={dashboardError}
            onUpdatePatient={handleUpdatePatient}
            onSaveReview={handleSaveReview}
            onApprovePatient={handleApprovePatient}
            onSelectPatientToView={handleSelectPatientToView}
            onNewRegistration={() => { handleReset(); setCurrentScreen(1); }}
            onRefresh={loadPatients}
          />
        )}
      </main>

      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">MediNexus AI</span>
            <span>— AI Medical Assistant MVP</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Not an AI Doctor. Medical Pre-Check &amp; Digital Registration Only.</span>
          </div>
          <div className="text-slate-400">Hackathon MVP • General Medicine &amp; Dermatology OPD</div>
        </div>
      </footer>
    </div>
  );
};

// ─── Root App — wraps everything in AuthProvider ──────────────────────────────

export const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
