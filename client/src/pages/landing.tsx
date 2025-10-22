import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/boxstat logo_1761172433576.png";

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
    description: "Player development and team management simplified."
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isAnimating) {
        setIsAnimating(true);
        setSwipeDirection('left');
        setTimeout(() => {
          setCurrentSlide((prev) => (prev + 1) % carouselFeatures.length);
          setIsAnimating(false);
          setSwipeDirection(null);
        }, 300);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [isAnimating]);

  // Handle touch events for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || isAnimating) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      setIsAnimating(true);
      setSwipeDirection(isLeftSwipe ? 'left' : 'right');
      
      setTimeout(() => {
        if (isLeftSwipe) {
          setCurrentSlide((prev) => (prev + 1) % carouselFeatures.length);
        }
        if (isRightSwipe) {
          setCurrentSlide((prev) => (prev - 1 + carouselFeatures.length) % carouselFeatures.length);
        }
        setIsAnimating(false);
        setSwipeDirection(null);
      }, 500);
    }
  };

  return (
    <div 
      className="relative min-h-screen overflow-hidden bg-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Logo */}
      <div className="absolute inset-x-0 top-[40%] -translate-y-1/2 flex flex-col items-center justify-center z-20 pt-[0px] pb-[0px] mt-[300px] mb-[300px]">
        <img 
          src={logoPath} 
          alt="BoxStat Logo"
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[450px] lg:h-[450px] object-contain opacity-100"
        />
        <p className="text-black text-xl sm:text-2xl text-center px-4 font-medium pl-[30px] pr-[30px] pt-[0px] pb-[0px] mt-[0px] mb-[0px]">Player development &
        team management unified.</p>
      </div>
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">


        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pt-[0px] pb-[0px] mt-[50px] mb-[50px]" style={{ paddingBottom: '24px' }}>
          {/* Call to Action Buttons */}
          <div className="space-y-4 pt-[0px] pb-[0px] mt-[0px] mb-[20px]">
            {/* Primary CTA Button - Made more red */}
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[280px]"
              data-testid="button-lets-go"
            >
              LET'S GO
            </Button>

            {/* Secondary Text/Link */}
            <div className="text-gray-700 text-sm">
              <span>HAVE AN ACCOUNT? </span>
              <button 
                onClick={() => window.location.href = '/api/login'}
                className="text-black font-semibold underline hover:text-gray-600 transition-colors"
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