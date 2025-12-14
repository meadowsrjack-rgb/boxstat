import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundImage from "@assets/landing-background.png";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <>
      {/* FULL BLEED BACKGROUND - Covers entire screen including safe areas */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-black"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Extended curtain for iOS overscroll */}
      <div 
        className="fixed bg-black pointer-events-none"
        style={{
          top: '-200px',
          left: '-50px',
          right: '-50px',
          bottom: '-200px',
          zIndex: -1,
        }}
      />

      {/* CONTENT - Absolute positioning from bottom to ensure visibility */}
      <div className="fixed inset-0 flex flex-col items-center z-10">
        {/* Logo - positioned from top with safe area */}
        <div 
          className="animate-in fade-in zoom-in duration-500 mt-20"
          style={{ marginTop: 'calc(80px + env(safe-area-inset-top, 0px))' }}
        >
          <img 
            src={logo} 
            alt="BoxStat Logo" 
            className="w-48 h-auto sm:w-64 md:w-80 drop-shadow-2xl"
            data-testid="img-logo"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Actions - positioned from bottom with generous margin */}
        <div 
          className="px-4 text-center space-y-4 w-full pb-8"
          style={{ marginBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Main Button */}
          <Button 
            size="lg" 
            onClick={() => setLocation('/registration')}
            className="bg-black/20 hover:bg-red-600 text-white font-bold px-12 py-6 rounded-xl shadow-2xl backdrop-blur-sm border border-white/10 transition-all duration-300 transform hover:scale-105 active:scale-95 min-w-[280px] text-[14px] tracking-wider"
            data-testid="button-lets-go"
          >
            LET'S GO
          </Button>

          {/* Sign In Link - MUST be visible */}
          <div className="text-white text-sm font-medium tracking-wide py-2">
            <span className="opacity-80">HAVE AN ACCOUNT? </span>
            <button 
              onClick={() => setLocation('/login')}
              className="text-white ml-2 font-bold hover:text-red-400 transition-colors"
              data-testid="button-sign-in"
            >
              SIGN IN
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
