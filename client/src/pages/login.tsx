import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, ArrowLeft, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

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
      const response = await apiRequest("POST", "/api/auth/login", {
        email,
        password,
      });

      if (response.success) {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        // Force a page reload to ensure auth state is updated
        window.location.href = "/account";
      } else {
        throw new Error(response.message || "Login failed");
      }
    } catch (error: any) {
      // Check if it's a verification error
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
      toast({
        title: "Failed to Send Magic Link",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-back-to-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Login to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {!showMagicLink ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
              
              <div className="mt-4">
                <Separator className="my-4" />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMagicLink(true)}
                  data-testid="button-show-magic-link"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Login with Magic Link
                </Button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleMagicLinkRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-link-email">Email</Label>
                  <Input
                    id="magic-link-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    required
                    data-testid="input-magic-link-email"
                  />
                  <p className="text-xs text-gray-500">
                    We'll send you a secure login link to your email
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSendingMagicLink}
                  data-testid="button-send-magic-link"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSendingMagicLink ? "Sending..." : "Send Magic Link"}
                </Button>
              </form>
              
              <div className="mt-4">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowMagicLink(false)}
                  data-testid="button-back-to-password"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Password Login
                </Button>
              </div>
            </>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setLocation("/register")}
                data-testid="link-register"
              >
                Register here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
