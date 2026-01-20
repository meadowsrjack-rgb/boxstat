import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  Trophy, 
  Shield, 
  Smartphone, 
  BarChart3,
  ChevronRight,
  Star,
  Zap,
  MessageSquare,
  Bell,
  CreditCard,
  ArrowRight,
  Play,
  Check
} from "lucide-react";
import { SiApple } from "react-icons/si";
import logo from "@assets/dark_1768878462814.png";
import logoIcon from "@assets/lighttheme_1768878672908.png";
import screenshot1 from "@assets/1_1768860806315.png";
import screenshot2 from "@assets/2_1768860806316.png";
import screenshot3 from "@assets/3_1768860806317.png";
import screenshot4 from "@assets/4_1768860806317.png";
import screenshot5 from "@assets/5_1768860806318.png";
import screenshot6 from "@assets/6_1768860806318.png";

export default function MarketingLanding() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Users,
      title: "Team Management",
      description: "Organize rosters, track attendance, and manage player development all in one place."
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "GPS-enabled check-ins, automated reminders, and seamless RSVP management."
    },
    {
      icon: Trophy,
      title: "Player Development",
      description: "Track skills, award badges, and celebrate achievements with 100+ trophies."
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Real-time chat, parent messaging, and multi-channel notifications."
    },
    {
      icon: CreditCard,
      title: "Payments & Billing",
      description: "Secure Stripe integration with subscriptions, installments, and family plans."
    },
    {
      icon: Shield,
      title: "Waivers & Compliance",
      description: "Digital signatures, parental consent, and complete audit trails."
    }
  ];

  const testimonials = [
    {
      quote: "BoxStat transformed how we run our youth basketball program. Registration that used to take weeks now takes minutes.",
      author: "Coach Michael Thompson",
      role: "Youth Academy Director",
      avatar: "MT"
    },
    {
      quote: "Finally, an app that lets me track all three of my kids' schedules and payments in one place. The notifications are a lifesaver.",
      author: "Sarah Johnson",
      role: "Basketball Parent",
      avatar: "SJ"
    },
    {
      quote: "I love seeing my stats and trophies. The check-in feature makes me feel like a pro when I arrive at practice!",
      author: "Marcus Williams",
      role: "U14 Player",
      avatar: "MW"
    }
  ];

  const stats = [
    { value: "10,000+", label: "Active Players" },
    { value: "500+", label: "Teams" },
    { value: "98%", label: "Satisfaction Rate" },
    { value: "50K+", label: "Events Managed" }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/15 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] animate-pulse delay-500" />
      </div>
      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10 backdrop-blur-xl bg-black/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="BoxStat" className="h-24 w-auto" />
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Testimonials</a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="text-sm text-gray-400 hover:text-white transition-colors">For Clubs</a>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 shadow-lg shadow-red-500/25"
                onClick={() => setLocation('/registration')}
              >
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-300"
                onClick={() => setLocation('/login')}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">Compete.</span>
              <br />
              <span className="bg-gradient-to-r from-red-500 via-red-400 to-white bg-clip-text text-transparent">Repeat.</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">Welcome to the world’s first unified ecosystem where elite athletic growth meets professional business scale. We’ve reimagined sports management by building a single, intuitive home for everyone involved.</p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-lg px-8 py-6 rounded-xl shadow-2xl shadow-red-500/30 border-0"
                onClick={() => setLocation('/registration')}
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl"
                onClick={() => setLocation('/login')}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* App Download */}
            <div className="flex flex-col items-center gap-2">
              <a 
                href="https://apps.apple.com/us/app/boxstat/id6754899159"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300"
              >
                <SiApple className="w-4 h-4" />
                <span className="text-sm font-medium">Download for iOS</span>
                <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <span className="text-xs text-gray-500">Android coming soon</span>
            </div>

          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="relative z-10 py-16 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-500 text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features designed for modern sports organizations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group p-8 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-red-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* App Screenshots Section */}
      <section className="relative z-10 py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                See It In Action
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Beautiful, intuitive interfaces designed for players, parents, and coaches
            </p>
          </div>

          {/* App Screenshots Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {[screenshot1, screenshot2, screenshot3, screenshot4, screenshot5, screenshot6].map((img, i) => (
              <div key={i} className="group">
                <div className="relative overflow-hidden rounded-2xl">
                  <img 
                    src={img} 
                    alt={`App screenshot ${i + 1}`}
                    className="w-full h-auto rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Download CTA */}
          <div className="flex flex-col items-center gap-4 mt-16">
            <a 
              href="https://apps.apple.com/us/app/boxstat/id6754899159"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-gray-900 to-black border border-white/20 hover:border-white/40 transition-all duration-300"
            >
              <SiApple className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Download for iOS</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
            </a>
            <span className="text-xs text-gray-500">Android coming soon</span>
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-24 px-6 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Loved by Teams Everywhere
              </span>
            </h2>
            <p className="text-gray-400 text-lg">
              See what coaches, parents, and players are saying
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div 
                key={i}
                className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 relative"
              >
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-sm font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Simple, Transparent Pricing
              </span>
            </h2>
            <p className="text-gray-400 text-lg">
              Choose the plan that fits your organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <p className="text-gray-500 text-sm mb-6">For small programs</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Free</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Up to 25 players", "Basic scheduling", "Team messaging", "Email support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                onClick={() => setLocation('/registration')}
              >
                Get Started
              </Button>
            </div>

            {/* Pro - Featured */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-b from-red-500/20 to-red-500/5 border border-red-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-xs font-bold">
                MOST POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <p className="text-gray-500 text-sm mb-6">For growing clubs</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited players", "Advanced scheduling", "Payment processing", "GPS check-ins", "Custom branding", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0"
                onClick={() => setLocation('/registration')}
              >
                Start Free Trial
              </Button>
            </div>

            {/* Enterprise */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-gray-500 text-sm mb-6">For large organizations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Everything in Pro", "Multiple locations", "API access", "Dedicated success manager", "Custom integrations", "SLA guarantee"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  const el = document.getElementById('contact');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Contact Section for Club Owners */}
      <section id="contact" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 text-center">
            <img src={logoIcon} alt="BoxStat" className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Club?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join hundreds of basketball organizations already using BoxStat. 
              Our team will help you get set up and running in no time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-lg px-8 py-6 rounded-xl shadow-2xl shadow-red-500/30 border-0"
                onClick={() => window.location.href = 'mailto:sales@boxstat.app?subject=BoxStat%20Inquiry'}
              >
                Contact Sales
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl"
                onClick={() => setLocation('/registration')}
              >
                Start Free Trial
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              No credit card required. 14-day free trial.
            </p>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <img src={logo} alt="BoxStat" className="h-32 w-auto mb-4" />
              <p className="text-sm text-gray-500">The all-in-one platform for sports league management.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => setLocation('/support')} className="hover:text-white transition-colors">Help Center</button></li>
                <li><a href="mailto:support@boxstat.app" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => setLocation('/privacy-policy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setLocation('/privacy-policy')} className="hover:text-white transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} BoxStat. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Made by athletes, for athletes</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
