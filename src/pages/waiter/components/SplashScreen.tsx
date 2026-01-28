import { useEffect, useState } from 'react';
import logoAppGarcom from '@/assets/logo-app-garcom.png';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, minDuration - 500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, minDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, minDuration]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(180deg, hsl(200 75% 12%) 0%, hsl(195 100% 35%) 50%, hsl(187 80% 50%) 100%)'
      }}
    >
      {/* Animated ocean wave circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-400/10 rounded-full animate-pulse" />
        <div className="absolute top-1/4 -right-16 w-48 h-48 bg-cyan-300/10 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute -bottom-20 left-1/4 w-56 h-56 bg-teal-400/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Logo container with animations */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo with scale and fade animation */}
        <div 
          className="w-32 h-32 rounded-3xl bg-white shadow-2xl flex items-center justify-center overflow-hidden animate-scale-in"
          style={{ animationDuration: '0.6s' }}
        >
          <img 
            src={logoAppGarcom} 
            alt="App do Garçom" 
            className="w-28 h-28 object-contain"
          />
        </div>

        {/* App name with fade animation */}
        <div 
          className="text-center animate-fade-in"
          style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}
        >
          <h1 className="text-2xl font-bold text-white tracking-wide">
            App do Garçom
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Gestão de Pedidos
          </p>
        </div>

        {/* Loading indicator */}
        <div 
          className="flex gap-1.5 mt-4 animate-fade-in"
          style={{ animationDelay: '0.6s', animationFillMode: 'backwards' }}
        >
          <div 
            className="w-2 h-2 rounded-full bg-white/80 animate-bounce"
            style={{ animationDuration: '0.6s' }}
          />
          <div 
            className="w-2 h-2 rounded-full bg-white/80 animate-bounce"
            style={{ animationDuration: '0.6s', animationDelay: '0.1s' }}
          />
          <div 
            className="w-2 h-2 rounded-full bg-white/80 animate-bounce"
            style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}
          />
        </div>
      </div>

      {/* Bottom branding */}
      <div 
        className="absolute bottom-8 text-center animate-fade-in"
        style={{ animationDelay: '0.8s', animationFillMode: 'backwards' }}
      >
        <p className="text-white/50 text-xs">
          Powered by Gamako
        </p>
      </div>
    </div>
  );
}
