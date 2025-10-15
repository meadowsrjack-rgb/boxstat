import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Mail, ArrowLeft } from "lucide-react";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email") || "";

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

        {/* Success Message */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <Mail className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-gray-300 mb-4">
              We've sent a magic link to
            </p>
            <p className="text-white font-semibold text-lg mb-6" data-testid="text-email">
              {email}
            </p>
            <p className="text-gray-400 text-sm">
              Click the link in the email to sign in instantly. The link will expire in 15 minutes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="pt-6 border-t border-white/10">
              <p className="text-sm text-gray-400 mb-3">Didn't receive the email?</p>
              <Button
                onClick={() => setLocation("/login")}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                data-testid="button-try-again"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setLocation("/")}
            className="text-white/80 hover:text-white underline text-sm inline-flex items-center"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
