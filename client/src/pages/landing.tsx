import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import logoPath from "@assets/BoxStats_1761255444178.png";
import backgroundVideo from "@assets/BoxStat mobile background_1762315879856.mp4";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectFit: 'cover' }}
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 z-0"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Logo at top */}
        <div className="flex justify-center pt-12 pb-6">
          <img 
            src={logoPath} 
            alt="BoxStat Logo" 
            className="h-72 w-72 object-contain mt-[100px] mb-[100px]"
          />
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

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
            <div className="text-gray-100 text-sm">
              <span>HAVE AN ACCOUNT? </span>
              <button 
                onClick={() => setLocation('/login')}
                className="text-white font-semibold underline hover:text-gray-300 transition-colors"
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
