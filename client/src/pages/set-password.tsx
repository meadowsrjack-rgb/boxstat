import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function SetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/set-password", { newPassword });
      
      if (response.success) {
        toast({ title: "Password Created!", description: "Your password has been set successfully." });
        
        let redirectPath = "/account";
        if (user?.defaultDashboardView) {
          if (user.defaultDashboardView === "parent") {
            redirectPath = "/unified-account";
          } else {
            localStorage.setItem("selectedPlayerId", user.defaultDashboardView);
            redirectPath = "/player-dashboard";
          }
        }
        
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 1000);
      }
    } catch (error: any) {
      let msg = "Please try again.";
      try {
        const jsonStart = (error.message || "").indexOf('{');
        if (jsonStart >= 0) {
          const parsed = JSON.parse(error.message.substring(jsonStart));
          msg = parsed.message || msg;
        }
      } catch {}
      toast({ title: "Failed to set password", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="ios-full-bleed" />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
      
      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center p-4">
        <Card className="w-full max-w-md md:max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Set Your Password</CardTitle>
            <CardDescription>
              Your account was created by an admin. Please set a password so you can log in directly next time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  data-testid="input-confirm-password"
                />
              </div>
              
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords don't match</p>
              )}
              
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isSubmitting || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                data-testid="button-set-password"
              >
                {isSubmitting ? "Setting Password..." : "Set Password"}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => {
                  let redirectPath = "/account";
                  if (user?.defaultDashboardView) {
                    if (user.defaultDashboardView === "parent") {
                      redirectPath = "/unified-account";
                    } else {
                      redirectPath = "/player-dashboard";
                    }
                  }
                  window.location.href = redirectPath;
                }}
                data-testid="button-skip-password"
              >
                Skip for now
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
