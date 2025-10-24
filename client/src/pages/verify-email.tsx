import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

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
            {status === "loading" && <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />}
            {status === "success" && <CheckCircle className="h-16 w-16 text-green-600" />}
            {status === "error" && <XCircle className="h-16 w-16 text-red-600" />}
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
            {status === "success" && (
              <Button 
                onClick={() => setLocation("/login")}
                className="w-full"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
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
