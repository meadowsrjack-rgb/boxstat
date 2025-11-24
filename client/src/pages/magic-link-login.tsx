import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function MagicLinkLogin() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loginWithMagicLink = async () => {
      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid magic link. No token provided.");
        return;
      }

      try {
        const response = await fetch(`/api/auth/magic-link-login?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message);
          
          // Check for user's default dashboard preference
          let redirectPath = "/account";
          if (data.user?.defaultDashboardView) {
            if (data.user.defaultDashboardView === "parent") {
              redirectPath = "/unified-account";
            } else {
              // It's a player ID - set it and go to player dashboard
              localStorage.setItem("selectedPlayerId", data.user.defaultDashboardView);
              redirectPath = "/player-dashboard";
            }
          }
          
          // Redirect to appropriate page after 1 second
          setTimeout(() => {
            window.location.href = redirectPath;
          }, 1000);
        } else {
          setStatus("error");
          setMessage(data.message || "Magic link login failed. Please try again.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred during login. Please try again.");
      }
    };

    loginWithMagicLink();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-100 safe-bottom flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />}
            {status === "success" && <CheckCircle className="h-16 w-16 text-green-600" />}
            {status === "error" && <XCircle className="h-16 w-16 text-red-600" />}
          </div>
          <CardTitle>
            {status === "loading" && "Logging You In..."}
            {status === "success" && "Login Successful!"}
            {status === "error" && "Login Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your magic link..."}
            {status === "success" && "Redirecting to your account..."}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => setLocation("/login")}
              className="w-full"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
