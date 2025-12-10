import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Smartphone } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function MagicLinkLogin() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "browser_ios">("loading");
  const [message, setMessage] = useState("");
  const [appRedirectToken, setAppRedirectToken] = useState<string | null>(null);

  const isNativeApp = Capacitor.isNativePlatform();
  const isIOSBrowser = !isNativeApp && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const openInApp = () => {
    if (appRedirectToken) {
      window.location.href = `boxstat://auth?token=${appRedirectToken}`;
    }
  };

  useEffect(() => {
    const loginWithMagicLink = async () => {
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
          // Check if the magic link was originally requested from iOS app
          // OR if user is currently on iOS browser
          const shouldShowAppRedirect = data.shouldRedirectToApp || (isIOSBrowser && data.appRedirectToken);
          
          if (shouldShowAppRedirect && data.appRedirectToken) {
            setAppRedirectToken(data.appRedirectToken);
            setStatus("browser_ios");
            setMessage("Login approved! Open BoxStat to continue.");
            
            // Try to automatically open the app
            setTimeout(() => {
              window.location.href = `boxstat://auth?token=${data.appRedirectToken}`;
            }, 500);
          } else {
            setStatus("success");
            setMessage(data.message);
            
            let redirectPath = "/account";
            if (data.user?.defaultDashboardView) {
              if (data.user.defaultDashboardView === "parent") {
                redirectPath = "/unified-account";
              } else {
                localStorage.setItem("selectedPlayerId", data.user.defaultDashboardView);
                redirectPath = "/player-dashboard";
              }
            }
            
            setTimeout(() => {
              window.location.href = redirectPath;
            }, 1000);
          }
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
  }, [isIOSBrowser]);

  return (
    <div className="ios-fixed-page bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />}
            {status === "success" && <CheckCircle className="h-16 w-16 text-green-600" />}
            {status === "browser_ios" && <Smartphone className="h-16 w-16 text-blue-600" />}
            {status === "error" && <XCircle className="h-16 w-16 text-red-600" />}
          </div>
          <CardTitle>
            {status === "loading" && "Logging You In..."}
            {status === "success" && "Login Successful!"}
            {status === "browser_ios" && "Login Approved!"}
            {status === "error" && "Login Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your magic link..."}
            {status === "success" && "Redirecting to your account..."}
            {status === "browser_ios" && "Tap below to open BoxStat and continue."}
            {status === "error" && message}
          </CardDescription>
        </CardHeader>
        
        {status === "browser_ios" && appRedirectToken && (
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={openInApp}
              className="w-full bg-red-600 hover:bg-red-700"
              data-testid="button-open-in-app"
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Open BoxStat App
            </Button>
            <p className="text-xs text-center text-gray-500">
              If the app doesn't open automatically, tap the button above.
            </p>
          </CardContent>
        )}
        
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
