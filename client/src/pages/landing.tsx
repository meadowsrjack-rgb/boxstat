import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";
import videoPath from "@assets/Add a heading_1753743034117.mp4";

const carouselFeatures = [
  {
    title: "Stay informed.",
    description: "Keep up to date with your team's calendar and upcoming events."
  },
  {
    title: "Unlock your potential.",
    description: "Follow your development, track key stats, and celebrate milestones on your personal player journey."
  },
  {
    title: "Train smarter.",
    description: "Access a library of expert drills and training videos to elevate your game on and off the court."
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselFeatures.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Handle touch events for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentSlide((prev) => (prev + 1) % carouselFeatures.length);
    }
    if (isRightSwipe) {
      setCurrentSlide((prev) => (prev - 1 + carouselFeatures.length) % carouselFeatures.length);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoPath} type="video/mp4" />
        </video>
        {/* Dark overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Test Accounts Button at Top */}
        <div className="absolute top-6 right-6 z-20">
          <Button 
            variant="outline" 
            onClick={() => setLocation('/test-accounts')}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm text-sm px-6 py-2"
          >
            View Test Accounts
          </Button>
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-6" style={{ paddingBottom: '24px' }}>
          {/* Carousel Content */}
          <div 
            className="mb-6 min-h-[120px] flex items-center justify-center"
            style={{ marginTop: '48px' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="max-w-lg mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 drop-shadow-lg whitespace-nowrap">
                {carouselFeatures[currentSlide].title}
              </h1>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed drop-shadow-md font-light">
                {carouselFeatures[currentSlide].description}
              </p>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="flex space-x-2 mb-8 justify-center">
            {carouselFeatures.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-white scale-110' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Call to Action Buttons */}
          <div className="space-y-4">
            {/* Primary CTA Button - Made more red */}
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px]"
            >
              LET'S GO
            </Button>

            {/* Secondary Text/Link */}
            <div className="text-white/80 text-sm">
              <span>HAVE AN ACCOUNT? </span>
              <button 
                onClick={() => window.location.href = '/api/login'}
                className="text-white font-semibold underline hover:text-gray-200 transition-colors"
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