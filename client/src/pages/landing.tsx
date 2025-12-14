import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useWindowHeight } from "@/hooks/useWindowHeight";
import backgroundImage from "@assets/landing-background.png";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const windowHeight = useWindowHeight();

  return (
    <div 
      className="w-full bg-black flex flex-col"
      style={{
        minHeight: windowHeight > 0 ? `${windowHeight}px` : '100vh',
        height: windowHeight > 0 ? `${windowHeight}px` : '100vh',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* TOP SECTION - Logo */}
      <div className="flex-none pt-16 pb-8 flex justify-center">
        <div className="animate-in fade-in zoom-in duration-500">
          <img 
            src={logo} 
            alt="BoxStat Logo" 
            className="w-48 h-auto sm:w-64 md:w-80 drop-shadow-2xl"
            data-testid="img-logo"
          />
        </div>
      </div>

      {/* MIDDLE - Spacer that pushes content apart */}
      <div className="flex-1" />

      {/* BOTTOM SECTION - Actions (Sign in ABOVE button) */}
      <div className="flex-none pb-12 px-4 text-center">
        {/* Sign In Link - NOW ABOVE THE BUTTON */}
        <div className="text-white text-sm font-medium tracking-wide mb-6">
          <span className="opacity-80">HAVE AN ACCOUNT? </span>
          <button 
            onClick={() => setLocation('/login')}
            className="text-white ml-2 font-bold hover:text-red-400 transition-colors"
            data-testid="button-sign-in"
          >
            SIGN IN
          </button>
        </div>

        {/* Main Button */}
        <Button 
          size="lg" 
          onClick={() => setLocation('/registration')}
          className="bg-black/20 hover:bg-red-600 text-white font-bold px-12 py-6 rounded-xl shadow-2xl backdrop-blur-sm border border-white/10 transition-all duration-300 transform hover:scale-105 active:scale-95 min-w-[280px] text-[14px] tracking-wider"
          data-testid="button-lets-go"
        >
          LET'S GO
        </Button>
      </div>
    </div>
  );
}
