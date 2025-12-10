import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundImage from "@assets/landing-background.png";
import logo from "@assets/logo2_1762477206651.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div 
      className="scrollable-page flex flex-col"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1a1a2e',
        backgroundAttachment: 'fixed',
      }}
    >

      {/* Content Layer - Flex to fill space with safe area padding */}
      <div 
        className="relative z-10 flex-1 flex flex-col items-center justify-start min-h-screen"
        style={{
          minHeight: '100dvh',
          paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Logo at Top */}
        <div className="flex-shrink-0 pt-4">
          <img 
            src={logo} 
            alt="BoxStat Logo" 
            className="w-48 h-auto sm:w-64 md:w-80 drop-shadow-2xl"
            data-testid="img-logo"
          />
        </div>

        {/* Spacer - pushes buttons to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content - Both button and sign in text */}
        <div className="px-4 sm:px-6 lg:px-8 text-center space-y-4 w-full flex-shrink-0">
          {/* Primary CTA Button */}
          <Button 
            size="lg" 
            onClick={() => setLocation('/registration')}
            className="bg-[#01005252] hover:bg-red-600 text-white font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px] text-[14px]"
            data-testid="button-lets-go"
          >
            LET'S GO
          </Button>

          {/* Sign In Text */}
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
