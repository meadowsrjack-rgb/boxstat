import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Trophy, Shield, MessageCircle } from "lucide-react";
import { FaBasketballBall } from "react-icons/fa";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/10 border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-36">
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="UYP Basketball" 
                className="h-32 w-32 object-contain"
              />
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 transition-all duration-300"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center py-6">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Welcome to UYP's Basketball App
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Your child's basketball season—organized, safe, and all in your pocket.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-gradient-to-r from-blue-500/80 to-purple-600/80 backdrop-blur-md border-white/20 text-white hover:from-blue-500 hover:to-purple-600 text-lg px-8 py-3 shadow-2xl transition-all duration-300"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              onClick={() => window.open('https://www.upyourperformance.org', '_blank')}
              className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-lg px-8 py-3 transition-all duration-300"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-black/20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-white mb-12 drop-shadow-lg">
            Everything You Need in One App
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-blue-300" />
                </div>
                <CardTitle className="text-white">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  Keep track of practices, games, and tournaments with our interactive calendar. 
                  Get push notifications for schedule changes.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-300" />
                </div>
                <CardTitle className="text-white">QR Code Check-In</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  Secure and easy check-in system for Momentous Sports Center. 
                  Parents can track attendance in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-yellow-300" />
                </div>
                <CardTitle className="text-white">Player Development</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  Track progress with digital badges, skill assessments, and 
                  access to practice drills that kids can do at home.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-300" />
                </div>
                <CardTitle className="text-white">Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  Connect with teammates, coaches, and parents. Share photos, 
                  coordinate carpools, and stay informed with team updates.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                  <MessageCircle className="h-6 w-6 text-blue-300" />
                </div>
                <CardTitle className="text-white">Safe Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  Secure, moderated messaging system designed for families. 
                  Kid-safe chat with emoji support and positive communication.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 shadow-2xl">
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                  <FaBasketballBall className="h-6 w-6 text-red-300" />
                </div>
                <CardTitle className="text-white">Dual Interface</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80">
                  Tailored experiences for both parents and players. 
                  Professional tools for parents, fun and engaging interface for kids.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6 text-white drop-shadow-lg">
            Ready to Join the UYP Basketball Community?
          </h3>
          <p className="text-xl mb-8 text-white/90 drop-shadow-md">
            Sign in to access your team dashboard, track your child's progress, 
            and stay connected with the league.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 text-lg px-8 py-3 transition-all duration-300 shadow-2xl"
          >
            Sign In Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-xl text-white py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div></div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Location</h4>
              <p className="text-white/70">
                Momentous Sports Center<br />
                14522 Myford Rd, Irvine, CA 92606
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Contact</h4>
              <p className="text-white/70">
                Phone: (714) 389-7900<br />
                Email: info@upyourperformance.org
              </p>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
            <div className="flex justify-center mb-4">
              <img 
                src={logoPath} 
                alt="UYP Basketball" 
                className="h-20 w-20 object-contain"
              />
            </div>
            <p>&copy; 2024 UYP Basketball. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
