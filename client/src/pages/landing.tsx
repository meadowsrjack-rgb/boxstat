import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Trophy, Shield, MessageCircle, Bell, CheckCircle, CreditCard, Megaphone } from "lucide-react";
import { FaBasketballBall } from "react-icons/fa";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-40">
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="UYP Basketball" 
                className="h-36 w-36 object-contain"
              />
            </div>
            <div className="flex items-center gap-4 relative">
              <div className="relative" ref={notificationsRef}>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-md shadow-lg border z-50">
                    <div className="p-3 border-b">
                      <h4 className="font-semibold text-sm">Recent Notifications</h4>
                    </div>
                    <div className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Megaphone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">New Announcement</p>
                          <p className="text-xs text-gray-600">Practice schedule updated for next week</p>
                          <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Player Check-in</p>
                          <p className="text-xs text-gray-600">Alex checked in for practice</p>
                          <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Payment Processed</p>
                          <p className="text-xs text-gray-600">Monthly fee payment confirmed</p>
                          <p className="text-xs text-gray-400 mt-1">3 days ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        View All Notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-primary hover:bg-primary/90"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center py-6">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            <div className="text-2xl sm:text-3xl font-normal mb-2 italic">Welcome to</div>
            <div>UYP Basketball</div>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your player's basketball season—organized, safe, and all in your pocket.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-3"
              onClick={() => window.open('https://www.upyourperformance.org', '_blank')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Keep track of practices, games, and tournaments with our interactive calendar. 
                  Get push notifications for schedule changes.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle>QR Code Check-In</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Secure and easy check-in system for Momentous Sports Center. 
                  Parents can track attendance in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <CardTitle>Player Development</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Track progress with digital badges, skill assessments, and 
                  access to practice drills that players can do at home.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageCircle className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle>Safe Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Secure, moderated messaging system designed for families. 
                  Player-safe chat with emoji support and positive communication.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <FaBasketballBall className="h-6 w-6 text-red-500" />
                </div>
                <CardTitle>Dual Interface</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Tailored experiences for both parents and players. 
                  Professional tools for parents, fun and engaging interface for players.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-6">
            Ready to Join the UYP Basketball Community?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Sign in to access your team dashboard, track your player's progress, 
            and stay connected with the league.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => window.location.href = '/api/login'}
              className="text-lg px-8 py-3"
            >
              Sign In Now
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setLocation('/test-accounts')}
              className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-primary"
            >
              View Test Accounts
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div></div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Location</h4>
              <p className="text-gray-400">
                Momentous Sports Center<br />
                14522 Myford Rd, Irvine, CA 92606
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Phone: (714) 389-7900<br />
                Email: info@upyourperformance.org
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
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