import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, User, Shield, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SelectProfileType() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showStaffDialog, setShowStaffDialog] = useState(false);

  const handleSelectPlayer = () => {
    // Redirect to profile creation form with player type
    setLocation(`/create-profile?type=player`);
  };

  const handleStaffSelection = (role: "admin" | "coach") => {
    setShowStaffDialog(false);
    // Redirect to appropriate dashboard
    if (role === "admin") {
      setLocation('/admin');
    } else {
      setLocation('/coach-dashboard');
    }
  };

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center p-4"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.15), transparent 60%), #000`,
      }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Welcome</h1>
          <p className="text-white/70">Create your player profile to get started</p>
        </div>

        {/* Player Card */}
        <Card
          onClick={handleSelectPlayer}
          className="cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition"
          data-testid="card-player-type"
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-lg bg-white/10 grid place-items-center text-white"
              >
                <User className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg mb-1">Player Profile</h3>
                <p className="text-sm text-white/70">
                  Access your team information, training programs, and track your progress
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-white/50">
          <p>Your profile will be automatically synced with our system if you're using a registered email.</p>
          <button
            onClick={() => setShowStaffDialog(true)}
            className="mt-4 text-white/60 hover:text-white/90 underline transition-colors"
            data-testid="button-staff-login"
          >
            Staff login (Admin/Coach)
          </button>
        </div>
      </div>

      {/* Staff Login Dialog */}
      <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select Your Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Card
              onClick={() => handleStaffSelection("admin")}
              className="cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition"
              data-testid="card-admin-role"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600 grid place-items-center text-white">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">Administrator</h3>
                    <p className="text-sm text-white/60">Full access to all features and settings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => handleStaffSelection("coach")}
              className="cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition"
              data-testid="card-coach-role"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-600 grid place-items-center text-white">
                    <UserCog className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg">Coach</h3>
                    <p className="text-sm text-white/60">Manage teams, events, and player progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
