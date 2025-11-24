import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundVideo from "@assets/Laanding page background_1762477206539.mp4";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative flex-1 min-h-screen overflow-hidden bg-black" style={{
      paddingTop: 'var(--safe-area-top)',
      paddingBottom: 'var(--safe-area-bottom)',
    }}>
      {/* Video Background - Extends through safe areas */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute w-full object-cover z-0"
        style={{
          top: 'calc(var(--safe-area-top) * -1)',
          bottom: 'calc(var(--safe-area-bottom) * -1)',
          left: 0,
          right: 0,
          height: 'calc(100% + var(--safe-area-top) + var(--safe-area-bottom))',
        }}
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Content Layer - Safe area aware */}
      <div className="relative z-10 min-h-full flex flex-col items-center pt-8 pb-0">
        {/* Logo at Top */}
        <div className="flex-shrink-0 pt-8">
          <img 
            src={logo} 
            alt="BoxStat Logo" 
            className="w-48 h-auto sm:w-64 md:w-80 drop-shadow-2xl"
            data-testid="img-logo"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* LET'S GO Button */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-0 mb-4">
          <Button 
            size="lg" 
            onClick={() => setLocation('/registration')}
            className="bg-[#01005252] hover:bg-red-600 text-white font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px] text-[14px]"
            data-testid="button-lets-go"
          >
            LET'S GO
          </Button>
        </div>

        {/* Sign In Text - At Bottom */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-0 mb-6">
          <div className="text-white text-sm">
            <span>HAVE AN ACCOUNT? </span>
            <button 
              onClick={() => setLocation('/login')}
              className="text-white font-semibold underline hover:text-gray-200 transition-colors"
              data-testid="button-sign-in"
            >
              SIGN IN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
