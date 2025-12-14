import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import backgroundImage from "@assets/landing-background.png";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function setHeight() {
      if (containerRef.current) {
        containerRef.current.style.height = `${window.innerHeight}px`;
      }
    }
    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);
    return () => {
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{
        backgroundColor: '#000000',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div 
        className="w-full h-full flex flex-col items-center"
        style={{
          paddingTop: 'max(60px, env(safe-area-inset-top, 60px))',
          paddingBottom: 'max(30px, env(safe-area-inset-bottom, 30px))',
        }}
      >
        {/* Logo at top */}
        <div className="animate-in fade-in zoom-in duration-500">
          <img 
            src={logo} 
            alt="BoxStat Logo" 
            className="w-44 h-auto drop-shadow-2xl"
            data-testid="img-logo"
          />
        </div>

        {/* Flexible spacer */}
        <div className="flex-1 min-h-[50px]" />

        {/* Bottom CTA section - all together */}
        <div className="w-full px-6 flex flex-col items-center gap-4">
          {/* Sign in text - ABOVE the button */}
          <p className="text-white text-sm font-medium tracking-wide">
            <span className="opacity-80">HAVE AN ACCOUNT? </span>
            <button 
              onClick={() => setLocation('/login')}
              className="text-white font-bold hover:text-red-400 transition-colors ml-1"
              data-testid="button-sign-in"
            >
              SIGN IN
            </button>
          </p>

          {/* Main CTA button */}
          <Button 
            size="lg" 
            onClick={() => setLocation('/registration')}
            className="bg-black/20 hover:bg-red-600 text-white font-bold px-12 py-6 rounded-xl shadow-2xl backdrop-blur-sm border border-white/10 transition-all duration-300 w-[280px] text-[14px] tracking-wider"
            data-testid="button-lets-go"
          >
            LET'S GO
          </Button>
        </div>
      </div>
    </div>
  );
}
