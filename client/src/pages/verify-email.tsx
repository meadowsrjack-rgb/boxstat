import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, CreditCard } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [stripeDataFound, setStripeDataFound] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message);
          setStripeDataFound(data.stripeDataFound || false);
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
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
                      We found your information from previous payments and have prefilled your profile. You can now log in and complete your registration.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {status === "success" && (
              <>
                <Button 
                  onClick={() => setLocation("/login")}
                  className="w-full"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation("/register")}
                  className="w-full"
                  data-testid="button-continue-registration"
                >
                  Continue Registration
                </Button>
              </>
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
