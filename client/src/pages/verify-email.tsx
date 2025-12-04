import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, CreditCard, Smartphone, Monitor } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [stripeDataFound, setStripeDataFound] = useState(false);
  const [hasOriginalSession, setHasOriginalSession] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState<string>("web");

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token and email from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const email = params.get("email");

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        // Include both token and email in the API call
        let apiUrl = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
        if (email) {
          apiUrl += `&email=${encodeURIComponent(email)}`;
        }
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message);
          setStripeDataFound(data.stripeDataFound || false);
          setHasOriginalSession(data.hasOriginalSession || false);
          setSourcePlatform(data.sourcePlatform || "web");
          
          // Only auto-redirect if there's NO original session waiting
          // Otherwise, tell user to go back to their original session
          if (data.shouldRedirect) {
            const userEmail = data.email || params.get("email");
            setTimeout(() => {
              setLocation(`/registration?verified=${encodeURIComponent(userEmail || "")}&continue=true`);
            }, 2000);
          }
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed. Please try again.");
        }
      } catch (error) {
        setStatus("error");
        setMessage("An error occurred during verification. Please try again.");
      }
    };

    verifyEmail();
  }, [setLocation]);

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-blue-50 to-indigo-100 safe-bottom flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && <Loader2 className="h-16 w-16 text-blue-600 animate-spin" data-testid="icon-loading" />}
            {status === "success" && <CheckCircle className="h-16 w-16 text-green-600" data-testid="icon-success" />}
            {status === "error" && <XCircle className="h-16 w-16 text-red-600" data-testid="icon-error" />}
          </div>
          <CardTitle>
            {status === "loading" && "Verifying Your Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        {status !== "loading" && (
          <CardContent className="flex flex-col gap-3">
            {status === "success" && stripeDataFound && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-3" data-testid="stripe-data-found">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 text-sm">Payment History Found</h4>
                    <p className="text-xs text-green-700 mt-1">
                      We found your information from previous payments and have prefilled your profile.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {status === "success" && hasOriginalSession && (
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  {sourcePlatform === 'ios' ? (
                    <Smartphone className="h-12 w-12 text-blue-600" />
                  ) : (
                    <Monitor className="h-12 w-12 text-blue-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">You can close this tab</h3>
                <p className="text-sm text-gray-600">
                  {sourcePlatform === 'ios' 
                    ? "Return to the BoxStat app to continue registration."
                    : "Return to your original browser tab to continue registration."}
                </p>
              </div>
            )}
            {status === "success" && !hasOriginalSession && (
              <div className="text-center py-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600">Redirecting you to continue registration...</p>
              </div>
            )}
            {status === "error" && (
              <>
                <Button 
                  onClick={() => setLocation("/register")}
                  className="w-full"
                  data-testid="button-back-to-register"
                >
                  Back to Registration
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/login")}
                  className="w-full"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
