import React, { useState } from 'react';
import { PatientRecord, PatientRegistrationInput } from './types/medical';
import { INITIAL_PATIENTS, evaluateMedicalTriage } from './data/mockData';
import { Navbar } from './components/Navbar';
import { Screen1Registration } from './components/Screen1Registration';
import { Screen2AIAnalysis } from './components/Screen2AIAnalysis';
import { Screen3DigitalParchi } from './components/Screen3DigitalParchi';
import { Screen4DoctorDashboard } from './components/Screen4DoctorDashboard';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [patients, setPatients] = useState<PatientRecord[]>(INITIAL_PATIENTS);

  // Active registration form input
  const defaultFormInput: PatientRegistrationInput = {
    name: '',
    age: '',
    gender: '',
    symptoms: [],
    duration: '',
  };

  const [formInput, setFormInput] = useState<PatientRegistrationInput>(defaultFormInput);
  const [activePatient, setActivePatient] = useState<PatientRecord | null>(null);

  // Handle Form Submission from Screen 1
  const handleRegistrationSubmit = (data: PatientRegistrationInput) => {
    const analysis = evaluateMedicalTriage(data);
    const isGenMed = analysis.suggestedDepartment === 'General Medicine';
    const deptPrefix = isGenMed ? 'GM' : 'DERM';
    const deptCount = patients.filter((p) => p.department === analysis.suggestedDepartment).length + 1;
    const tokenNumber = `${deptPrefix}-${deptCount < 10 ? '0' : ''}${deptCount}`;
    const patientId = `SC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const opdRoom = isGenMed
      ? 'Room 104 — General Medicine OPD'
      : 'Room 208 — Dermatology Clinic';

    const newPatient: PatientRecord = {
      id: patientId,
      tokenNumber,
      createdAt: 'Just now',
      name: data.name.trim() || 'Anonymous Patient',
      age: Number(data.age) || 30,
      gender: data.gender as 'Male' | 'Female' | 'Other',
      symptoms: data.symptoms,
      duration: data.duration,
      department: analysis.suggestedDepartment,
      opdRoom,
      analysis,
      status: 'Pending Review',
    };

    setActivePatient(newPatient);
    // Add to doctor queue table at the top
    setPatients((prev) => [newPatient, ...prev]);
    // Advance to Screen 2
    setCurrentScreen(2);
  };

  // Quick preset loader for hackathon judges & testers
  const handleLoadPreset = (preset: 'fever' | 'dermatology') => {
    if (preset === 'fever') {
      const feverData: PatientRegistrationInput = {
        name: 'Ramesh Verma',
        age: 54,
        gender: 'Male',
        symptoms: ['Fever', 'Cough', 'Body pain'],
        duration: '1 - 2 weeks',
      };
      setFormInput(feverData);
      handleRegistrationSubmit(feverData);
    } else {
      const skinData: PatientRegistrationInput = {
        name: 'Priya Sharma',
        age: 27,
        gender: 'Female',
        symptoms: ['Skin rash', 'Itching', 'Redness'],
        duration: '3 - 5 days',
      };
      setFormInput(skinData);
      handleRegistrationSubmit(skinData);
    }
  };

  const handleReset = () => {
    setFormInput(defaultFormInput);
    setActivePatient(null);
    setCurrentScreen(1);
  };

  // Update patient in state (e.g. from Doctor Dashboard)
  const handleUpdatePatient = (updated: PatientRecord) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    if (activePatient && activePatient.id === updated.id) {
      setActivePatient(updated);
    }
  };

  // Switch active patient to inspect in Parchi/Analysis from Doctor Dashboard
  const handleSelectPatientToView = (patient: PatientRecord) => {
    setActivePatient(patient);
    setCurrentScreen(3);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        currentScreen={currentScreen}
        onSelectScreen={(screenId) => setCurrentScreen(screenId)}
        onLoadPreset={handleLoadPreset}
        onReset={handleReset}
        hasActivePatient={activePatient !== null}
      />

      {/* Screen Body */}
      <main className="flex-1 pb-16">
        {currentScreen === 1 && (
          <Screen1Registration
            key={JSON.stringify(formInput)}
            initialData={formInput}
            onSubmit={handleRegistrationSubmit}
            onLoadPreset={handleLoadPreset}
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
            onUpdatePatient={handleUpdatePatient}
            onSelectPatientToView={handleSelectPatientToView}
            onNewRegistration={() => {
              handleReset();
              setCurrentScreen(1);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">SmartCare</span>
            <span>— AI Medical Assistant MVP</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Not an AI Doctor. Medical Pre-Check &amp; Digital Registration Only.</span>
          </div>
          <div className="text-slate-400">
            Hackathon MVP • General Medicine &amp; Dermatology OPD
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
