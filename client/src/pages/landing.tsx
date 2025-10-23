import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoPath from "@assets/2_1761253787293.png";

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
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Logo at top */}
        <div className="flex justify-center pt-12 pb-6">
          <img 
            src={logoPath} 
            alt="BoxStat Logo" 
            className="h-32 w-32 object-contain"
          />
        </div>

        {/* Spacer to push content to bottom */}
        <div className="flex-1"></div>

        {/* Bottom Content */}
        <div className="px-4 sm:px-6 lg:px-8 text-center pb-6" style={{ paddingBottom: '24px' }}>
          {/* Carousel Content */}
          <div 
            className="mb-12 min-h-[120px] flex items-center justify-center relative overflow-hidden"
            style={{ marginTop: '24px' }}
          >
            <div className="max-w-lg mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{
                    x: swipeDirection === 'left' ? 400 : swipeDirection === 'right' ? -400 : 0,
                    opacity: 0
                  }}
                  animate={{
                    x: 0,
                    opacity: 1
                  }}
                  exit={{
                    x: swipeDirection === 'left' ? -400 : swipeDirection === 'right' ? 400 : 0,
                    opacity: 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.5
                  }}
                  className="text-center"
                >
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                    {carouselFeatures[currentSlide].title}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-light">
                    {carouselFeatures[currentSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="flex space-x-2 mb-8 justify-center">
            {carouselFeatures.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  if (!isAnimating && index !== currentSlide) {
                    setIsAnimating(true);
                    setSwipeDirection(index > currentSlide ? 'left' : 'right');
                    setTimeout(() => {
                      setCurrentSlide(index);
                      setIsAnimating(false);
                      setSwipeDirection(null);
                    }, 300);
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-gray-900 scale-110' 
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

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
    </div>
  );
}