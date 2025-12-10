import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const token = new URLSearchParams(search).get("token");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setTokenError("No reset token provided");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-reset-token?token=${token}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (data.success && data.valid) {
          setIsValidToken(true);
        } else {
          setTokenError(data.message || "Invalid or expired reset link");
        }
      } catch (error) {
        setTokenError("Failed to verify reset link");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: password,
      });

      if (response.success) {
        setResetSuccess(true);
        toast({
          title: "Password Reset",
          description: "Your password has been reset successfully.",
        });
      } else {
        throw new Error(response.message || "Failed to reset password");
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

  if (isVerifying) {
    return (
      <div className="ios-fixed-page bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="ios-fixed-page bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="absolute top-6 left-6" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <button
          onClick={() => setLocation("/login")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="button-back-to-login"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex flex-col justify-center min-h-screen-safe px-8 py-16 safe-top">
        <div className="w-full max-w-sm mx-auto space-y-8">
          {!isValidToken && !resetSuccess ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Invalid Link
                </h1>
                <p className="text-gray-400 text-lg">
                  {tokenError}
                </p>
              </div>
              <Button
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={() => setLocation("/forgot-password")}
                data-testid="button-request-new-link"
              >
                Request New Reset Link
              </Button>
            </div>
          ) : resetSuccess ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Password Reset!
                </h1>
                <p className="text-gray-400 text-lg">
                  Your password has been reset successfully. You can now log in with your new password.
                </p>
              </div>
              <Button
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Reset Password
                </h1>
                <p className="text-gray-400 text-lg">
                  Create a new password for your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                    New Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    data-testid="input-new-password"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                  />
                  <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-300 text-sm font-medium">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
