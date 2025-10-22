
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import logoPath from "@assets/boxstat logo_1761172433576.png";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div 
      className="relative min-h-screen overflow-hidden bg-white"
    >
      {/* Background Logo */}
      <div className="absolute inset-x-0 top-[25%] -translate-y-1/2 flex justify-center z-0">
        <img 
          src={logoPath} 
          alt="BoxStat Logo"
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[450px] lg:h-[450px] object-contain opacity-100"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">


        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-6" style={{ paddingBottom: '24px' }}>
          {/* Call to Action Button */}
          <div>
            {/* Primary CTA Button - Made more red */}
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px]"
              data-testid="button-lets-go"
            >
              LET'S GO
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
