import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, User, Settings, TestTube, ArrowRight, UserPlus, Briefcase } from "lucide-react";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

const unifiedAccount = {
  type: "unified",
  name: "Unified Family Account",
  email: "sarah.johnson@email.com",
  accountHolder: "Sarah Johnson",
  description: "Complete family account with multiple profiles demonstrating the unified system",
  profiles: [
    {
      name: "Sarah Johnson",
      type: "parent",
      description: "Family manager with full access to payments and children's activities"
    },
    {
      name: "Emma Johnson",
      type: "player",
      team: "U12 Thunder",
      jersey: "#15",
      position: "Point Guard",
      description: "6th grade player with team access and progress tracking"
    },
    {
      name: "Jake Johnson", 
      type: "player",
      team: "U10 Lightning",
      jersey: "#8",
      position: "Forward",
      description: "4th grade player with age-appropriate features"
    }
  ],
  features: [
    "Single login for entire family",
    "Profile switching between family members",
    "Parent dashboard with payment management",
    "Multiple children on different teams",
    "Cross-team communication and scheduling",
    "Unified progress tracking",
    "Role-based access control",
    "Seamless profile management"
  ],
  icon: Users,
  color: "blue"
};

export default function TestAccounts() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const useUnifiedTestAccount = async () => {
    try {
      setLoading(true);
      
      // Create the unified demo account
      const response = await fetch('/api/test-accounts/create-unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'unified',
          name: 'Unified Family Account'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Demo Account Ready",
          description: "Redirecting to unified account demo...",
        });
        
        // Redirect to the demo login URL
        setTimeout(() => {
          window.location.href = data.loginUrl;
        }, 500);
      } else {
        throw new Error(data.message || 'Failed to create demo account');
      }
      
    } catch (error) {
      console.error('Error creating demo account:', error);
      toast({
        title: "Error", 
        description: "Failed to create demo account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-blue-50 to-green-50 safe-bottom">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="BoxStat Academy" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test Unified Account</h1>
                <p className="text-sm text-gray-600">Experience the new unified family account system</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <TestTube className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Testing Environment</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Test the new unified account system where one account contains multiple profiles for different family members.
            This demo shows how parents can manage children on different teams within a single account.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Test Options:</strong> Try the demo account to see unified profiles in action, or test the complete signup flow with emergency contact requirements for parents.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{unifiedAccount.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{unifiedAccount.email}</p>
                  </div>
                </div>
                <Badge variant="default" className="capitalize">
                  Family Account
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-600">{unifiedAccount.description}</p>
              
              {/* Profile showcase */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-900">Included Profiles:</h4>
                <div className="space-y-2">
                  {unifiedAccount.profiles.map((profile, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {profile.type === 'parent' ? (
                          <Users className="h-5 w-5 text-blue-600" />
                        ) : profile.type === 'player' ? (
                          <User className="h-5 w-5 text-green-600" />
                        ) : (
                          <Briefcase className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{profile.name}</span>
                          <Badge 
                            variant={profile.type === 'parent' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {profile.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{profile.description}</p>
                        {profile.team && (
                          <p className="text-xs text-gray-500 mt-1">
                            {profile.team} • {profile.jersey} • {profile.position}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-900">System Features:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {unifiedAccount.features.map((feature, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                      <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <Button 
                  className="w-full" 
                  onClick={useUnifiedTestAccount}
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    "Loading Demo..."
                  ) : (
                    <>
                      Try Demo Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => {
                    console.log('Test signup button clicked, navigating to /account-setup?test=true');
                    setLocation('/account-setup?test=true');
                  }}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Test New Account Signup
                </Button>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Test the complete registration flow with emergency contact requirements for parents
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info box about the change */}
          <Card className="mt-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <UserPlus className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 mb-2">What's New: Unified Account System</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• One account now contains multiple family member profiles</li>
                    <li>• Parents can switch between managing family and accessing player views</li>
                    <li>• Children can have accounts on different teams within the same family</li>
                    <li>• Simplified login with profile selection after authentication</li>
                    <li>• All payment and communication flows unified under one account</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/api/login'}
            className="mr-4"
          >
            Regular Sign In
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setLocation("/")}
          >
            Back to Landing Page
          </Button>
        </div>
      </main>
    </div>
  );
}