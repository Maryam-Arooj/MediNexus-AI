import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400); // allow fade-out to complete
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, #0d9488 0%, #0f766e 40%, #134e4a 100%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      {/* Decorative background waves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ opacity: 0.15 }}
        >
          <path
            fill="white"
            d="M0,192L60,202.7C120,213,240,235,360,224C480,213,600,171,720,165.3C840,160,960,192,1080,197.3C1200,203,1320,181,1380,170.7L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ opacity: 0.08 }}
        >
          <path
            fill="white"
            d="M0,256L48,240C96,224,192,192,288,197.3C384,203,480,245,576,261.3C672,277,768,267,864,245.3C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-6 px-8 text-center">
        {/* Logo */}
        <div
          className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
        >
          <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16">
            {/* House/shield outline */}
            <path
              d="M40 8 L70 28 L70 62 Q70 72 60 72 L20 72 Q10 72 10 62 L10 28 Z"
              fill="rgba(255,255,255,0.2)"
              stroke="white"
              strokeWidth="2.5"
            />
            {/* Heart */}
            <path
              d="M40 55 C40 55 24 44 24 34 C24 28 29 24 34 24 C37 24 39 26 40 28 C41 26 43 24 46 24 C51 24 56 28 56 34 C56 44 40 55 40 55Z"
              fill="white"
            />
            {/* Cross / plus inside heart area */}
            <rect x="37" y="30" width="6" height="16" rx="2" fill="#0d9488" />
            <rect x="31" y="36" width="18" height="6" rx="2" fill="#0d9488" />
          </svg>
        </div>

        {/* Brand name */}
        <div>
          <h1 className="text-5xl font-black text-white tracking-tight leading-none">
            Medi<span style={{ color: '#a7f3d0' }}>Nexus AI</span>
          </h1>
          <p className="mt-2 text-lg font-medium text-teal-100 tracking-widest uppercase">
            AI Medical Assistant
          </p>
        </div>

        {/* Tagline */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <p className="text-teal-200 text-sm font-medium">Smarter Diagnosis • Faster Care</p>
          <p className="text-teal-200 text-sm font-medium">Healthier Tomorrow</p>
        </div>

        {/* Heartbeat line */}
        <div className="w-48 mt-4" style={{ opacity: 0.6 }}>
          <svg viewBox="0 0 192 40" fill="none" className="w-full">
            <polyline
              points="0,20 30,20 38,8 46,32 54,4 62,36 70,20 192,20"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white"
              style={{
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
