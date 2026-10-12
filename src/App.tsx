import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { matchPath, navigate, usePath } from './lib/router';
import { homeFor, resolveAccess } from './lib/routeAccess';
import { Navbar } from './components/Navbar';
import { SplashScreen } from './components/auth/SplashScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { PatientHome } from './components/patient/PatientHome';
import { Screen1Registration } from './components/Screen1Registration';
import { Screen2AIAnalysis } from './components/Screen2AIAnalysis';
import { Screen3DigitalParchi } from './components/Screen3DigitalParchi';
import { Screen4DoctorDashboard } from './components/Screen4DoctorDashboard';

const FullScreenLoader: React.FC<{ text: string }> = ({ text }) => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0d9488, #134e4a)' }}>
    <div className="flex flex-col items-center gap-4 text-white">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-teal-100">{text}</p>
    </div>
  </div>
);

const AppInner: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const path = usePath();
  const [splashDone, setSplashDone] = useState(false);
  const role = user?.role ?? null;

  // Route guard: runs on every navigation, login, logout and refresh.
  const redirect = isLoading ? null : resolveAccess(path, role);
  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect]);

  if (isLoading) return <FullScreenLoader text="Loading MediNexus AI…" />;
  if (redirect) return <FullScreenLoader text="Redirecting…" />;

  // ─── Public screens ─────────────────────────────────────────────────────────
  if (path === '/' || path === '') {
    if (!splashDone) return <SplashScreen onDone={() => { setSplashDone(true); navigate('/login', { replace: true }); }} />;
    return <FullScreenLoader text="Loading…" />;
  }
  if (path === '/login') return <LoginScreen onNavigateToRegister={() => navigate('/register')} />;
  if (path === '/register') return <RegisterScreen onNavigateToLogin={() => navigate('/login')} />;
  if (!user) return <FullScreenLoader text="Redirecting…" />;

  // ─── Authenticated screens (role already verified by resolveAccess above) ──
  let content: React.ReactNode = null;
  let activeCaseId: string | null = null;
  let m: Record<string, string> | null;

  if (path === '/patient') {
    content = <PatientHome />;
  } else if (path === '/patient/new') {
    content = <Screen1Registration mode="create" />;
  } else if ((m = matchPath('/patient/cases/:id/edit', path))) {
    activeCaseId = m.id;
    content = <Screen1Registration mode="edit" caseId={m.id} key={`edit-${m.id}`} />;
  } else if ((m = matchPath('/patient/cases/:id/parchi', path))) {
    activeCaseId = m.id;
    content = <Screen3DigitalParchi caseId={m.id} key={`parchi-${m.id}`} />;
  } else if ((m = matchPath('/patient/cases/:id', path))) {
    activeCaseId = m.id;
    content = <Screen2AIAnalysis caseId={m.id} key={`case-${m.id}`} />;
  } else if (path === '/doctor') {
    content = <Screen4DoctorDashboard />;
  } else {
    content = (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Page not found</h1>
        <button onClick={() => navigate(homeFor(user.role))} className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
          Go to my dashboard
        </button>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar user={user} path={path} activeCaseId={activeCaseId} onLogout={handleLogout} />
      <main className="flex-1 pb-16">{content}</main>
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="font-bold text-slate-800">MediNexus AI</span>
            <span>— OPD digital registration &amp; rule-based triage (MVP)</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Not a diagnosis. All cases are reviewed by a licensed doctor.</span>
          </div>
          <div className="text-slate-400">General Medicine &amp; Dermatology OPD</div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
