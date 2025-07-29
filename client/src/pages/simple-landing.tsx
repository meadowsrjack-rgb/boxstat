import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

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

export default function SimpleLanding() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselFeatures.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-6">
          {/* Carousel Content */}
          <div className="mb-12 min-h-[120px] flex items-center justify-center">
            <div className="max-w-lg mx-auto w-full">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 drop-shadow-lg">
                  {carouselFeatures[currentSlide].title}
                </h1>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed drop-shadow-md font-light">
                  {carouselFeatures[currentSlide].description}
                </p>
              </div>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="flex space-x-2 mb-8 justify-center">
            {carouselFeatures.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
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
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px]"
            >
              LET'S GO
            </Button>

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