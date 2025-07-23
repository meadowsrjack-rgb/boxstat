import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Baby, Settings, TestTube, ArrowRight } from "lucide-react";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

const accountTypes = [
  {
    type: "parent",
    name: "Parent Account",
    description: "Full parent dashboard with payment management and child profiles",
    features: [
      "Full parent dashboard access",
      "Payment management",
      "Child profile management", 
      "Team communication",
      "Schedule management"
    ],
    icon: User,
    color: "blue"
  },
  {
    type: "player",
    name: "Player Account",
    description: "Kid-friendly dashboard with QR check-in and training access",
    features: [
      "Player dashboard view",
      "QR code check-in",
      "Training programs access",
      "Team chat",
      "Game schedule view"
    ],
    icon: Baby,
    color: "green"
  },
  {
    type: "admin",
    name: "Admin/Coach Account",
    description: "Administrative controls for team and league management",
    features: [
      "Team roster management",
      "Schedule creation",
      "Player statistics",
      "Parent communication",
      "Admin controls"
    ],
    icon: Settings,
    color: "purple"
  }
];

export default function TestAccounts() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const createAndUseTestAccount = async (accountType: any) => {
    try {
      setLoading(true);
      
      const testAccount = {
        id: accountType.type === 'parent' ? 'test-parent-001' : 
            accountType.type === 'player' ? 'test-player-001' : 'test-admin-001',
        type: accountType.type,
        name: accountType.name,
        email: accountType.type === 'parent' ? 'parent.test@uyp.com' :
               accountType.type === 'player' ? 'player.test@uyp.com' : 'admin.test@uyp.com'
      };
      
      const response = await apiRequest('/api/test-accounts/create', {
        method: 'POST',
        body: JSON.stringify(testAccount),
      });

      if (response.success) {
        toast({
          title: "Test Account Created",
          description: `Created ${accountType.type} account. Signing you in...`,
        });
        
        // Redirect to the test login URL
        setTimeout(() => {
          window.location.href = response.loginUrl;
        }, 1000);
      }
    } catch (error) {
      console.error('Error creating test account:', error);
      toast({
        title: "Error",
        description: "Failed to create test account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="UYP Basketball Academy" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Test Account Types</h1>
                <p className="text-sm text-gray-600">Switch your account type to test different features</p>
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
            Click on any account type below to create and sign in with that specific test account. 
            Each account type provides access to different dashboards and features.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>How it works:</strong> Click "Use This Account" to create and automatically sign in with that account type.
                  You'll be redirected to the appropriate dashboard for testing.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {accountTypes.map((account) => {
            const IconComponent = account.icon;
            return (
              <Card key={account.type} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <IconComponent className={`h-6 w-6 text-${account.color}-600`} />
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                      </div>
                    </div>
                    <Badge 
                      variant={account.type === "parent" ? "default" : account.type === "player" ? "secondary" : "outline"}
                      className="capitalize"
                    >
                      {account.type}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">{account.description}</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-900">Features:</h4>
                    <ul className="space-y-1">
                      {account.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => createAndUseTestAccount(account)}
                    disabled={loading}
                  >
                    {loading ? (
                      "Creating Account..."
                    ) : (
                      <>
                        Use This Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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