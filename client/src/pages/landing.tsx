import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Users, Trophy, Calendar, Star, ChevronRight, Play } from "lucide-react";

const carouselFeatures = [
  {
    title: "Unlock Your Basketball Potential",
    description: "Track your development, celebrate milestones, and follow your personal journey to greatness.",
    icon: Target,
    color: "from-red-500 to-red-600"
  },
  {
    title: "Stay Connected with Your Team",
    description: "Keep up to date with practices, games, and team announcements in real-time.",
    icon: Users,
    color: "from-blue-500 to-blue-600"
  },
  {
    title: "Train Like a Champion",
    description: "Access expert drills, training videos, and personalized development plans.",
    icon: Trophy,
    color: "from-green-500 to-green-600"
  },
  {
    title: "Never Miss a Game",
    description: "Sync your schedule, get reminders, and stay organized with our smart calendar.",
    icon: Calendar,
    color: "from-purple-500 to-purple-600"
  }
];

const features = [
  {
    title: "Player Development",
    description: "Track your skills, set goals, and see your progress over time with detailed analytics.",
    icon: Star,
    color: "text-yellow-500"
  },
  {
    title: "Team Communication",
    description: "Stay connected with coaches, teammates, and parents through our integrated messaging system.",
    icon: Users,
    color: "text-blue-500"
  },
  {
    title: "Achievement System",
    description: "Earn badges and trophies for your hard work, dedication, and outstanding performance.",
    icon: Trophy,
    color: "text-green-500"
  },
  {
    title: "Smart Scheduling",
    description: "Automatically sync with your calendar and never miss an important practice or game.",
    icon: Calendar,
    color: "text-purple-500"
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Auto-advance carousel every 5 seconds
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
    }, 5000);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Header */}
      <header className="relative z-20 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <Target className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">UYP Basketball</h1>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-white/80 hover:text-white transition-colors">Features</a>
            <a href="#about" className="text-white/80 hover:text-white transition-colors">About</a>
            <Button 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => window.location.href = '/api/login'}
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto text-center">
          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Welcome to the
              <span className="block bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                Future of Basketball
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Join the UYP Basketball community and take your game to the next level with our comprehensive platform.
            </p>
          </motion.div>

          {/* Carousel Section */}
          <div 
            className="mb-16 min-h-[200px] flex items-center justify-center relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="max-w-4xl mx-auto w-full">
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
                  <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${carouselFeatures[currentSlide].color} rounded-full mb-6`}>
                    {(() => {
                      const IconComponent = carouselFeatures[currentSlide].icon;
                      return <IconComponent className="h-10 w-10 text-white" />;
                    })()}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {carouselFeatures[currentSlide].title}
                  </h2>
                  <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
                    {carouselFeatures[currentSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="flex space-x-3 mb-12 justify-center">
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
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-white scale-125' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Call to Action Buttons */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xl font-bold px-16 py-6 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 min-w-[320px] group"
            >
              <Play className="h-6 w-6 mr-3 group-hover:translate-x-1 transition-transform" />
              GET STARTED
            </Button>

            <div className="text-white/80 text-lg">
              <span>Already have an account? </span>
              <button 
                onClick={() => window.location.href = '/api/login'}
                className="text-white font-semibold underline hover:text-gray-200 transition-colors"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-20 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools and resources you need to excel in basketball.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              About UYP Basketball
            </h2>
            <p className="text-xl text-white/80 max-w-4xl mx-auto leading-relaxed mb-8">
              UYP Basketball is more than just a sports organization. We're a community dedicated to developing 
              young athletes both on and off the court. Our platform brings together players, coaches, and parents 
              to create an environment where everyone can thrive and grow.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-400 mb-2">500+</div>
                <div className="text-white/80">Active Players</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">25+</div>
                <div className="text-white/80">Expert Coaches</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">50+</div>
                <div className="text-white/80">Teams</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">UYP Basketball</h3>
          </div>
          <p className="text-white/60 mb-6">
            Empowering young athletes to reach their full potential through basketball.
          </p>
          <div className="flex justify-center space-x-6">
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => window.location.href = '/api/login'}
            >
              Sign In
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}