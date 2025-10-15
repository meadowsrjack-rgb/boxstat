import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function AuthMagicLink() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid or missing verification link");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify-magic-link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Verification failed");
        }

        setStatus("success");
        
        // Redirect to home page after 1.5 seconds
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(error.message || "Verification failed");
      }
    };

    verifyToken();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logoPath} 
            alt="UYP Basketball" 
            className="h-20 mx-auto mb-4"
          />
        </div>

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-red-400 animate-spin" />
              <h1 className="text-2xl font-bold text-white mb-2">Verifying your link...</h1>
              <p className="text-gray-300">Please wait while we sign you in</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
              <p className="text-gray-300">You've been signed in successfully. Redirecting...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-gray-300 mb-6" data-testid="text-error">
                {errorMessage}
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="bg-red-500 hover:bg-red-600 text-white"
                data-testid="button-try-again"
              >
                Try Again
              </Button>
            </>
          )}
        </div>

        {/* Back to Home */}
        {status === "error" && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/")}
              className="text-white/80 hover:text-white underline text-sm"
              data-testid="button-back-home"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
