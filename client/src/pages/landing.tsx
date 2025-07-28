import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function Landing() {
  const [, setLocation] = useLocation();
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
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-white hover:bg-gray-50 text-black border border-gray-300"
            >
              Sign In
            </Button>
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
            Own the court with Southern California's premier basketball league.
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
              onClick={() => setLocation('/test-accounts')}
            >
              View Test Accounts
            </Button>
          </div>
        </div>
      </section>


    </div>
  );
}