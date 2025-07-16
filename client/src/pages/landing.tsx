import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volleyball, Users, Calendar, Trophy, Shield, MessageCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Volleyball className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">UYP Volleyball</h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary/90"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Welcome to UYP Volleyball League
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your all-in-one app for managing youth basketball teams, tracking progress, 
            and staying connected with the league community in Costa Mesa, CA.
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
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything You Need in One App
          </h3>
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
                  access to practice drills that kids can do at home.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>Team Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Connect with teammates, coaches, and parents. Share photos, 
                  coordinate carpools, and stay informed with team updates.
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
                  Kid-safe chat with emoji support and positive communication.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Volleyball className="h-6 w-6 text-red-500" />
                </div>
                <CardTitle>Dual Interface</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Tailored experiences for both parents and players. 
                  Professional tools for parents, fun and engaging interface for kids.
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
            Ready to Join the UYP Volleyball Community?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Sign in to access your team dashboard, track your child's progress, 
            and stay connected with the league.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => window.location.href = '/api/login'}
            className="text-lg px-8 py-3"
          >
            Sign In Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Volleyball className="h-6 w-6 text-primary mr-2" />
                <span className="text-lg font-semibold">UYP Volleyball</span>
              </div>
              <p className="text-gray-400">
                Building character through basketball in Costa Mesa, CA.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Location</h4>
              <p className="text-gray-400">
                Momentous Sports Center<br />
                Costa Mesa, CA
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Email: info@uypbasketball.com<br />
                Phone: (714) 555-0123
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 UYP Volleyball League. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
