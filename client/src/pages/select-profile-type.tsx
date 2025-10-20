import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, Shield } from "lucide-react";

export default function SelectProfileType() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<"parent" | "player" | null>(null);

  const handleSelectType = (type: "parent" | "player") => {
    setSelectedType(type);
    // Redirect to profile creation form with the selected type
    setLocation(`/create-profile?type=${type}`);
  };

  const handleStaffLogin = () => {
    // Redirect to admin dashboard (or staff login page if you create one)
    setLocation('/admin');
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
          <p className="text-white/70">Are you joining as a parent or player?</p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4">
          <Card
            onClick={() => handleSelectType("parent")}
            className={`cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition
              ${selectedType === "parent" ? "ring-2 ring-white/50" : ""}`}
            data-testid="card-parent-type"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-lg grid place-items-center text-white bg-blue-600"
                >
                  <Users className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg mb-1">Parent/Guardian</h3>
                  <p className="text-sm text-white/70">
                    Manage your family's experience, payments, and schedules
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => handleSelectType("player")}
            className={`cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition
              ${selectedType === "player" ? "ring-2 ring-white/50" : ""}`}
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
                  <h3 className="font-semibold text-white text-lg mb-1">Player</h3>
                  <p className="text-sm text-white/70">
                    Access your team information, training programs, and track your progress
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-white/50">
          <p>Your profile will be automatically synced with our system if you're using a registered email.</p>
          <button
            onClick={handleStaffLogin}
            className="mt-4 text-white/60 hover:text-white/90 underline transition-colors"
            data-testid="button-staff-login"
          >
            Staff login (Admin/Coach)
          </button>
        </div>
      </div>
    </div>
  );
}
