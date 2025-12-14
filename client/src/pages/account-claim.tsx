import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

interface ClaimResponse {
  success: boolean;
  message: string;
  devClaimLink?: string;
  devNote?: string;
  autoRedirect?: boolean;
  redirectUrl?: string;
  profiles?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
}

export default function AccountClaim() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check if user landed here with a token (redirect to claim-verify)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      setLocation(`/claim-verify?token=${token}`);
    }
  }, [setLocation]);

  const claimMutation = useMutation({
    mutationFn: async (email: string): Promise<ClaimResponse> => {
      return apiRequest("/api/auth/request-claim", {
        method: "POST",
        data: { email }
      });
    },
    onSuccess: (data) => {
      // Handle automatic redirect in development mode
      if (data.autoRedirect && data.redirectUrl) {
        toast({
          title: "Development Mode",
          description: data.message,
        });

        console.log("🎯 Development mode: Redirecting to claim verification");

        // Redirect to the claim verification page
        setTimeout(() => {
          setLocation(data.redirectUrl!);
        }, 1000); // Small delay to show the success message

        return;
      }

      // Standard flow: show submitted state
      setIsSubmitted(true);
      toast({
        title: "Email sent!",
        description: data.message,
      });

      // In development, show the claim link
      if (data.devClaimLink) {
        console.log("🎯 Development claim link:", data.devClaimLink);
        toast({
          title: "Development Mode",
          description: "Check the console for your claim link",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to send claim email. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    claimMutation.mutate(email.trim());
  };

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-gray-100 safe-bottom flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoPath} alt="BoxStat" className="h-16 w-auto" />
          </div>
          
          {!isSubmitted ? (
            <>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Claim Your Account
              </CardTitle>
              <CardDescription className="text-gray-600">
                Enter the email address you provided to BoxStat Academy to access your account
              </CardDescription>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-gray-600">
                We've sent account access instructions to <strong>{email}</strong>
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {!isSubmitted ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      data-testid="input-email"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-500 hover:bg-red-600"
                  disabled={claimMutation.isPending}
                  data-testid="button-claim-account"
                >
                  {claimMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Sending Email...
                    </>
                  ) : (
                    "Claim My Account"
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-gray-500">
                <p>Don't have an account yet?</p>
                <p className="mt-1">Contact BoxStat Academy to register for programs.</p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Next steps:</p>
                    <ol className="mt-2 space-y-1 list-decimal list-inside">
                      <li>Check your email inbox (and spam folder)</li>
                      <li>Click the "Access My Account" link in the email</li>
                      <li>Complete your account setup</li>
                    </ol>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setIsSubmitted(false)}
                className="w-full"
                data-testid="button-try-again"
              >
                Try Different Email
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="text-gray-500 hover:text-gray-700"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}