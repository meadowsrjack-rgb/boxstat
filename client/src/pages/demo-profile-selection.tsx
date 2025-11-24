import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, UserPlus, Settings, Plus, Trophy, Users, Briefcase } from "lucide-react";

// Demo data for unified account with multiple profiles
const DEMO_PROFILES = [
  {
    id: "parent-profile-001",
    accountId: "demo-account-001",
    profileType: "parent",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    description: "Manage family profiles, payments, and communication"
  },
  {
    id: "player-profile-001",
    accountId: "demo-account-001", 
    profileType: "player",
    firstName: "Emma",
    lastName: "Johnson",
    teamName: "U12 Thunder",
    jerseyNumber: 15,
    position: "Point Guard",
    grade: "6th Grade",
    description: "Track progress and team communication"
  },
  {
    id: "player-profile-002",
    accountId: "demo-account-001",
    profileType: "player", 
    firstName: "Jake",
    lastName: "Johnson",
    teamName: "U10 Lightning",
    jerseyNumber: 8,
    position: "Forward",
    grade: "4th Grade", 
    description: "Skills development and team activities"
  }
];

export default function DemoProfileSelection() {
  const [, setLocation] = useLocation();
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check if we're in demo mode
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const demoActive = urlParams.get('demo') === 'active' || window.location.pathname.includes('demo');
    setIsDemoMode(demoActive);
    
    // Check demo session status
    fetch('/api/auth/demo-status')
      .then(res => res.json())
      .then(data => {
        if (data.isDemoMode) {
          console.log("Demo mode confirmed:", data);
          setIsDemoMode(true);
        }
      })
      .catch(err => {
        console.log("Not in demo mode:", err);
        setIsDemoMode(false);
      });
  }, []);

  const handleProfileSelect = (profile: any) => {
    console.log("Profile selected:", profile);
    setSelectedProfile(profile);
    
    // Store demo profile selection in session storage
    sessionStorage.setItem('demoProfile', JSON.stringify(profile));
    sessionStorage.setItem('currentProfile', JSON.stringify(profile));
    sessionStorage.setItem('isDemoMode', 'true');
    console.log("Session storage set, navigating to:", profile.profileType);
    
    // Navigate based on profile type with demo indicator
    switch (profile.profileType) {
      case "player":
        console.log("Navigating to player dashboard");
        setLocation("/player-dashboard?demo=true");
        break;
      case "parent":
        console.log("Navigating to parent dashboard");
        setLocation("/parent-dashboard?demo=true");
        break;
      case "coach":
        console.log("Navigating to admin dashboard");
        setLocation("/admin-dashboard?demo=true");
        break;
      default:
        console.log("Navigating to home");
        setLocation("/?demo=true");
    }
  };

  const getProfileIcon = (type: string) => {
    switch (type) {
      case "parent":
        return <Users className="h-6 w-6 text-blue-600" />;
      case "player":
        return <User className="h-6 w-6 text-green-600" />;
      case "coach":
        return <Briefcase className="h-6 w-6 text-purple-600" />;
      default:
        return <User className="h-6 w-6" />;
    }
  };

  const getProfileColor = (type: string) => {
    switch (type) {
      case "parent":
        return "bg-blue-100 border-blue-500";
      case "player":
        return "bg-green-100 border-green-500";
      case "coach":
        return "bg-purple-100 border-purple-500";
      default:
        return "bg-gray-100 border-gray-500";
    }
  };

  return (
    <div className="min-h-full bg-gray-50 safe-bottom">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Select Profile</h1>
              <p className="text-sm text-gray-600">Choose which profile to use</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/settings")}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Demo Mode Notice */}
        {isDemoMode && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="text-orange-600 text-lg">🎭</div>
                <div>
                  <h4 className="font-medium text-orange-900 mb-2">Demo Mode Active</h4>
                  <p className="text-sm text-orange-800">
                    You're experiencing the unified account system demo. This shows how Sarah Johnson's account 
                    contains multiple family member profiles with profile switching capabilities.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = '/'}
                      className="text-orange-800 border-orange-300 hover:bg-orange-100"
                    >
                      Exit Demo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation('/test-accounts')}
                      className="text-orange-800 border-orange-300 hover:bg-orange-100"
                    >
                      Back to Test Accounts
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Current Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Account: sarah.johnson@email.com
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You have {DEMO_PROFILES.length} profiles in this account
            </p>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Demo: Unified Account System</h4>
            <p className="text-sm text-blue-800">
              This demonstrates the new unified profile system where one account can contain multiple profiles. 
              Sarah's account includes herself as a parent and her two children on different teams.
            </p>
          </CardContent>
        </Card>

        {/* Profiles Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Profiles</h2>
            <Button
              onClick={() => alert("Create Profile functionality would open here")}
              size="sm"
              data-testid="button-create-profile"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {DEMO_PROFILES.map((profile) => (
              <Card 
                key={profile.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getProfileColor(profile.profileType)}`}
                onClick={() => handleProfileSelect(profile)}
                data-testid={`profile-card-${profile.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getProfileColor(profile.profileType)} border`}>
                        {getProfileIcon(profile.profileType)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {profile.firstName} {profile.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {profile.profileType}
                        </p>
                      </div>
                    </div>
                    
                    <Badge 
                      variant={profile.profileType === 'player' ? 'default' : 
                              profile.profileType === 'parent' ? 'secondary' : 'outline'}
                      className="capitalize"
                    >
                      {profile.profileType}
                    </Badge>
                  </div>

                  {/* Profile-specific info */}
                  {profile.profileType === 'player' && (
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Team:</span> {profile.teamName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Jersey:</span> #{profile.jerseyNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Position:</span> {profile.position}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Grade:</span> {profile.grade}
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-4">
                    {profile.description}
                  </p>

                  <Button 
                    className="w-full" 
                    data-testid={`button-select-${profile.id}`}
                    onClick={() => handleProfileSelect(profile)}
                  >
                    Select Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Family Relationship Info */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-green-900 mb-2">Family Account Benefits</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Single login for entire family</li>
              <li>• Unified payment management</li>
              <li>• Cross-team communication and scheduling</li>
              <li>• Centralized progress tracking</li>
              <li>• Seamless profile switching</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}