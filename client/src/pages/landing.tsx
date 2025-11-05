import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundVideo from "@assets/BoxStat mobile background_1762315879856.mp4";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background - Behind everything */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Content Layer - On top of video */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-6" style={{ paddingBottom: '24px' }}>
          {/* Call to Action Buttons */}
          <div className="space-y-4">
            {/* Primary CTA Button */}
            <Button 
              size="lg" 
              onClick={() => setLocation('/registration')}
              className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px]"
              data-testid="button-lets-go"
            >
              LET'S GO
            </Button>

            {/* Secondary Text/Link */}
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
    </div>
  );
}
