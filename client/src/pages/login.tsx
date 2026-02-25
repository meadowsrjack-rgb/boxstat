import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, ChevronLeft, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { authPersistence } from "@/services/authPersistence";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("🔐 Attempting login with email:", email);
      console.log("🌐 Current window location:", window.location.href);
      console.log("📡 Sending POST to /api/auth/login");

      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });

      if (response.success) {
        console.log("🎯 Login success branch - token present?", !!response.token);

        if (response.token) {
          console.log("💾 Storing JWT token, length:", response.token.length);
          
          const isNative = (window as any).Capacitor?.isNativePlatform?.() === true;
          if (isNative) {
            try {
              const { Preferences } = await import('@capacitor/preferences');
              await Preferences.set({ key: 'authToken', value: response.token });
              console.log("✅ Token saved to native Preferences");
            } catch (e) {
              console.error("❌ Native Preferences error:", e);
            }
          }
          
          await authPersistence.setToken(response.token);
          console.log("✅ Token saved to localStorage");
        } else {
          console.warn("⚠️ No token in response!");
        }

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });

        let redirectPath = "/account";
        if (response.user?.defaultDashboardView) {
          if (response.user.defaultDashboardView === "parent") {
            redirectPath = "/unified-account";
          } else {
            localStorage.setItem("selectedPlayerId", response.user.defaultDashboardView);
            redirectPath = "/player-dashboard";
          }
        }

        console.log("🚀 Redirecting to:", redirectPath);

        await new Promise(resolve => setTimeout(resolve, 100));

        window.location.href = redirectPath;
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);

      if (error.message && error.message.includes("verify your email")) {
        toast({
          title: "Email Verification Required",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingMagicLink(true);

    try {
      const response = await apiRequest("POST", "/api/auth/request-magic-link", {
        email: magicLinkEmail,
      });

      if (response.success) {
        toast({
          title: "Magic Link Sent!",
          description: "Check your email for the login link.",
        });
        setMagicLinkEmail("");
      } else {
        throw new Error(response.message || "Failed to send magic link");
      }
    } catch (error: any) {
      const errorMsg = error.message || "";
      // Check if the error indicates no account exists
      if (errorMsg.includes("noAccount") || errorMsg.includes("No account found")) {
        toast({
          title: "No Account Found",
          description: "No account exists with that email. Redirecting to registration...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/register");
        }, 2000);
      } else {
        // Try to parse the error message from the JSON response
        let displayMessage = "Please try again later.";
        try {
          const jsonStart = errorMsg.indexOf('{');
          if (jsonStart >= 0) {
            const parsed = JSON.parse(errorMsg.substring(jsonStart));
            displayMessage = parsed.message || displayMessage;
          } else {
            displayMessage = errorMsg;
          }
        } catch { displayMessage = errorMsg; }
        
        toast({
          title: "Failed to Send Magic Link",
          description: displayMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  return (
    <>
      <div className="ios-full-bleed" />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex flex-col">
      <div 
        className="fixed top-4 left-4 z-50"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          onClick={() => setLocation("/")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="button-back-to-home"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      <div 
        className="flex flex-col justify-center min-h-full px-8"
        style={{ 
          paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-lg">
              Login to access your account
            </p>
          </div>

          {!showMagicLink ? (
            <>
              <form onSubmit={handleLogin} className="space-y-6">
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
                    data-testid="input-email"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="relative">
                <Separator className="bg-white/10" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 text-sm text-gray-500 bg-[#11182700] mt-[15px] mb-[15px]">
                  or
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full h-12 bg-transparent border-white/20 text-white hover:bg-white/10"
                onClick={() => setShowMagicLink(true)}
                data-testid="button-show-magic-link"
              >
                <Mail className="w-4 h-4 mr-2" />
                Login with Magic Link
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={handleMagicLinkRequest} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="magic-link-email" className="text-gray-300 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="magic-link-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    required
                    data-testid="input-magic-link-email"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                  />
                  <p className="text-sm text-gray-500">
                    We'll send you a secure login link to your email
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
                  disabled={isSendingMagicLink}
                  data-testid="button-send-magic-link"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSendingMagicLink ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>

              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowMagicLink(false)}
                data-testid="button-back-to-password"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </>
          )}

          <div className="space-y-4 pt-4">
            <div className="text-center">
              <Button
                variant="link"
                className="p-0 h-auto text-gray-400 hover:text-white"
                onClick={() => setLocation("/forgot-password")}
                data-testid="link-forgot-password"
              >
                Forgot your password?
              </Button>
            </div>

            <p className="text-center text-gray-400">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto text-red-500 hover:text-red-400"
                onClick={() => setLocation("/register")}
                data-testid="link-register"
              >
                Register here
              </Button>
            </p>

            <div className="text-center">
              <button 
                onClick={() => setLocation('/privacy-policy')}
                className="text-gray-500 text-xs hover:text-gray-400 underline transition-colors"
                data-testid="link-privacy-policy"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}