import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Mail, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/request-password-reset", {
        email,
      });

      if (response.success) {
        setEmailSent(true);
        toast({
          title: "Email Sent",
          description: "Check your inbox for the password reset link.",
        });
      } else {
        throw new Error(response.message || "Failed to send reset email");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* FIX: DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="ios-fixed-page relative z-10 w-full h-full bg-transparent overscroll-none">
        <div className="fixed top-6 left-6 z-50" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
          <button
            onClick={() => setLocation("/login")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            data-testid="button-back-to-login"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex flex-col justify-center min-h-full px-8 py-16 safe-top">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {!emailSent ? (
            <>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Forgot Password
                </h1>
                <p className="text-gray-400 text-lg">
                  Enter your email and we'll send you a link to reset your password
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-forgot-email"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  disabled={isLoading}
                  data-testid="button-send-reset-link"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Check Your Email
                </h1>
                <p className="text-gray-400 text-lg">
                  We've sent a password reset link to <span className="text-white">{email}</span>
                </p>
                <p className="text-gray-500 text-sm">
                  The link will expire in 1 hour
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 bg-transparent border-white/20 text-white hover:bg-white/10"
                onClick={() => setLocation("/login")}
                data-testid="button-back-to-login-success"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          )}

          <div className="text-center pt-4">
            <p className="text-gray-400">
              Remember your password?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-red-500 hover:text-red-400"
                onClick={() => setLocation("/login")}
                data-testid="link-login"
              >
                Login here
              </Button>
            </p>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
