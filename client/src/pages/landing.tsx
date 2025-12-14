import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundImage from "@assets/landing-background.png";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div 
      className="min-h-[100svh] w-full flex flex-col items-center justify-between bg-black"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))', 
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* TOP: Logo Section */}
      <div className="flex-shrink-0 animate-in fade-in zoom-in duration-500">
        <img 
          src={logo} 
          alt="BoxStat Logo" 
          className="w-48 h-auto sm:w-64 md:w-80 drop-shadow-2xl"
          data-testid="img-logo"
        />
      </div>

      {/* BOTTOM: Action Section */}
      <div className="px-4 sm:px-6 lg:px-8 text-center space-y-5 w-full flex-shrink-0">
        
        {/* Main Button */}
        <Button 
          size="lg" 
          onClick={() => setLocation('/registration')}
          className="bg-black/20 hover:bg-red-600 text-white font-bold px-12 py-6 rounded-xl shadow-2xl backdrop-blur-sm border border-white/10 transition-all duration-300 transform hover:scale-105 active:scale-95 min-w-[280px] text-[14px] tracking-wider"
          data-testid="button-lets-go"
        >
          LET'S GO
        </Button>

        {/* Sign In Link */}
        <div className="text-white text-sm font-medium tracking-wide">
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
  );
}
