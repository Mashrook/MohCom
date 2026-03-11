import { useState, useEffect, useCallback } from "react";
import splashLogo from "@/assets/splash-logo.jpg";
import { getSplashSoundEnabled } from "@/hooks/useUserPreferences";

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

// Create a pleasant startup chime using Web Audio API
const playStartupSound = () => {
  // Check if sound is enabled
  if (!getSplashSoundEnabled()) return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillators for a pleasant chime
    const playNote = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
      
      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // Play a pleasant three-note ascending chime (C, E, G - major chord)
    playNote(523.25, 0, 0.4, 0.15);      // C5
    playNote(659.25, 0.1, 0.4, 0.12);    // E5
    playNote(783.99, 0.2, 0.6, 0.1);     // G5
    
  } catch (error) {
    console.log('Audio not supported or blocked');
  }
};

export function SplashScreen({ onComplete, minDisplayTime = 1000 }: SplashScreenProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const initSound = useCallback(() => {
    playStartupSound();
    // Remove event listeners after first interaction
    document.removeEventListener('click', initSound);
    document.removeEventListener('touchstart', initSound);
  }, []);

  useEffect(() => {
    // Try to play sound immediately (will work if user has interacted with page before)
    playStartupSound();
    
    // Also add listeners for first interaction if autoplay is blocked
    document.addEventListener('click', initSound, { once: true });
    document.addEventListener('touchstart', initSound, { once: true });

    // Trigger logo animation after a brief delay
    const logoTimer = setTimeout(() => setLogoLoaded(true), 100);

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 18);

    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(onComplete, 500);
    }, minDisplayTime);

    return () => {
      clearTimeout(timer);
      clearTimeout(logoTimer);
      clearInterval(progressInterval);
      document.removeEventListener('click', initSound);
      document.removeEventListener('touchstart', initSound);
    };
  }, [onComplete, minDisplayTime, initSound]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Golden Glow Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-[hsl(43,66%,52%,0.15)] rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -left-1/4 w-96 h-96 bg-[hsl(48,90%,60%,0.1)] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[hsl(43,66%,52%,0.08)] to-transparent rounded-full" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-[hsl(48,90%,60%,0.12)] rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        {/* Floating golden particles */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-[hsl(48,90%,60%)] rounded-full animate-float opacity-60" />
        <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-[hsl(43,66%,52%)] rounded-full animate-float opacity-50" style={{ animationDelay: '0.3s' }} />
        <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-[hsl(48,90%,60%)] rounded-full animate-float opacity-40" style={{ animationDelay: '0.6s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-[hsl(43,66%,52%)] rounded-full animate-float opacity-50" style={{ animationDelay: '0.9s' }} />
        <div className="absolute top-1/3 left-2/3 w-1.5 h-1.5 bg-[hsl(48,90%,60%)] rounded-full animate-float opacity-60" style={{ animationDelay: '1.2s' }} />
      </div>

      {/* Logo Container */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${logoLoaded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'}`}>
        {/* Animated golden rings around logo */}
        <div className="relative">
          {/* Rotating outer ring */}
          <div 
            className="absolute -inset-10 rounded-full border border-[hsl(43,66%,52%,0.2)] animate-spin-slow"
            style={{ 
              background: 'conic-gradient(from 0deg, transparent, hsl(43,66%,52%,0.3), transparent)',
              animationDuration: '8s'
            }}
          />
          
          {/* Pulsing rings */}
          <div className="absolute -inset-4 rounded-full border-2 border-[hsl(43,66%,52%,0.4)] animate-pulse shadow-[0_0_20px_hsl(43,66%,52%,0.3)]" />
          <div className="absolute -inset-6 rounded-full border border-[hsl(48,90%,60%,0.25)] animate-pulse shadow-[0_0_30px_hsl(48,90%,60%,0.2)]" style={{ animationDelay: '0.3s' }} />
          <div className="absolute -inset-8 rounded-full border border-[hsl(43,66%,52%,0.15)] animate-pulse" style={{ animationDelay: '0.7s' }} />
          
          {/* Main Logo with luxurious dark golden filter */}
          <div className="relative w-44 h-44 rounded-full overflow-hidden shadow-2xl shadow-[hsl(35,60%,35%,0.4)] border-2 border-[hsl(35,70%,40%,0.5)] animate-float" style={{ animationDuration: '3s' }}>
            <img 
              src={splashLogo} 
              alt="شعار محامي كوم" 
              className="w-full h-full object-cover"
              style={{
                filter: 'sepia(100%) saturate(200%) brightness(75%) hue-rotate(-5deg) contrast(1.1)',
              }}
            />
            {/* Dark golden glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(35,70%,30%,0.25)] to-transparent mix-blend-overlay" />
            
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(35,60%,45%,0.25)] to-transparent animate-shimmer"
              style={{ 
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite'
              }}
            />
          </div>
        </div>

        {/* Brand name with staggered animation */}
        <h1 
          className={`mt-8 text-4xl font-bold bg-gradient-to-l from-[hsl(43,66%,52%)] via-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] bg-clip-text text-transparent transition-all duration-500 ${logoLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '200ms' }}
        >
          محامي كوم
        </h1>
        
        {/* Tagline with staggered animation */}
        <p 
          className={`mt-2 text-muted-foreground text-sm tracking-wider transition-all duration-500 ${logoLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '400ms' }}
        >
          ADVISOR AI
        </p>

        {/* Golden Progress bar with glow */}
        <div 
          className={`mt-8 w-56 h-1.5 bg-[hsl(43,66%,52%,0.2)] rounded-full overflow-hidden shadow-inner transition-all duration-500 ${logoLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '600ms' }}
        >
          <div 
            className="h-full bg-gradient-to-r from-[hsl(43,66%,52%)] via-[hsl(48,90%,60%)] to-[hsl(43,66%,52%)] rounded-full transition-all duration-100 ease-out shadow-[0_0_10px_hsl(43,66%,52%,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading text with pulse */}
        <p 
          className={`mt-4 text-xs text-muted-foreground animate-pulse transition-all duration-500 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '800ms' }}
        >
          جاري التحميل...
        </p>
      </div>

      {/* Bottom Branding with fade-in */}
      <div 
        className={`absolute bottom-8 text-center transition-all duration-700 ${logoLoaded ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ transitionDelay: '1000ms' }}
      >
        <p className="text-xs text-muted-foreground">
          مدعوم بالذكاء الاصطناعي
        </p>
      </div>

      {/* Custom keyframes style */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
