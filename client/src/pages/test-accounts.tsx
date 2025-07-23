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

const testAccounts = [
  {
    id: "test-parent-001",
    type: "parent",
    name: "Sarah Johnson",
    email: "sarah.test@uyp.com",
    description: "Parent with 2 children (8-year-old and 12-year-old players)",
    features: [
      "Full parent dashboard access",
      "Payment management",
      "Child profile management", 
      "Team communication",
      "Schedule management"
    ]
  },
  {
    id: "test-player-001", 
    type: "player",
    name: "Alex Johnson",
    email: "alex.test@uyp.com",
    description: "12-year-old player on the Thunder team",
    features: [
      "Player dashboard view",
      "QR code check-in",
      "Training programs access",
      "Team chat",
      "Game schedule view"
    ]
  },
  {
    id: "test-coach-001",
    type: "admin", 
    name: "Coach Mike Davis",
    email: "coach.mike@uyp.com",
    description: "Head coach managing multiple teams",
    features: [
      "Team roster management",
      "Schedule creation",
      "Player statistics",
      "Parent communication",
      "Admin controls"
    ]
  }
];

export default function TestAccounts() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const createTestAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      return apiRequest("POST", "/api/test-accounts/create", accountData);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Test Account Created",
        description: `${response.name} account is ready to use!`,
      });
      // Redirect to login to use the test account
      window.location.href = "/api/login";
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Test Account",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAccount = (account: any) => {
    setSelectedAccount(account.id);
    createTestAccountMutation.mutate(account);
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
                <h1 className="text-2xl font-bold text-gray-900">Test Accounts</h1>
                <p className="text-sm text-gray-600">Choose an account type to test the application</p>
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
          <p className="text-gray-600">
            Select a test account type below to explore different features of the UYP Basketball app.
            Each account type provides access to different dashboards and functionality.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {testAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {account.type === "parent" && <User className="h-6 w-6 text-blue-600" />}
                    {account.type === "player" && <Baby className="h-6 w-6 text-green-600" />}
                    {account.type === "admin" && <Settings className="h-6 w-6 text-purple-600" />}
                    <div>
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <p className="text-sm text-gray-500">{account.email}</p>
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
                <p className="text-sm text-gray-600 leading-relaxed">
                  {account.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Available Features:</h4>
                  <ul className="space-y-1">
                    {account.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  onClick={() => handleCreateAccount(account)}
                  disabled={createTestAccountMutation.isPending && selectedAccount === account.id}
                  className="w-full mt-4"
                  size="sm"
                >
                  {createTestAccountMutation.isPending && selectedAccount === account.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Use This Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Testing Instructions:</h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Click "Use This Account" to create and activate a test account</li>
            <li>You'll be redirected to sign in with the test account credentials</li>
            <li>Explore the features available for that account type</li>
            <li>Return here to try a different account type</li>
          </ol>
        </div>
      </main>
    </div>
  );
}