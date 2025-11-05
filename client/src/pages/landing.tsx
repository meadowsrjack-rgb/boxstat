import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import backgroundVideo from "@assets/BoxStat mobile background_1762315879856.mp4";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Video as foreground element */}
      <div className="flex-1 flex items-center justify-center px-4 pt-12 pb-6">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full max-w-lg rounded-2xl shadow-2xl"
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      </div>

      {/* Bottom Content */}
      <div className="px-4 sm:px-6 lg:px-8 text-center pb-6" style={{ paddingBottom: '24px' }}>
        {/* Call to Action Buttons */}
        <div className="space-y-4">
          {/* Primary CTA Button - Made more red */}
          <Button 
            size="lg" 
            onClick={() => setLocation('/registration')}
            className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px]"
            data-testid="button-lets-go"
          >
            LET'S GO
          </Button>

          {/* Secondary Text/Link */}
          <div className="text-gray-700 text-sm">
            <span>HAVE AN ACCOUNT? </span>
            <button 
              onClick={() => setLocation('/login')}
              className="text-gray-900 font-semibold underline hover:text-gray-600 transition-colors"
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
