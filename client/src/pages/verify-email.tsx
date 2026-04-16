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
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const email = params.get("email");
      const organizationId = params.get("organizationId");
      const errorParam = params.get("error");

      if (errorParam) {
        setStatus("error");
        setMessage(errorParam);
        return;
      }

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        let apiUrl = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
        if (email) {
          apiUrl += `&email=${encodeURIComponent(email)}`;
        }
        if (organizationId) {
          apiUrl += `&organizationId=${encodeURIComponent(organizationId)}`;
        }
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage(data.message);
          setStripeDataFound(data.stripeDataFound || false);

          const userEmail = data.email || params.get("email");
          const orgId = organizationId || "";
          let redirectPath = `/registration?email=${encodeURIComponent(userEmail || "")}&verified=true`;
          if (orgId) {
            redirectPath += `&organizationId=${encodeURIComponent(orgId)}`;
          }
          setTimeout(() => {
            const fallback = () => setLocation(redirectPath);

            const ua = navigator.userAgent || "";
            const isAndroid = /android/i.test(ua);
            const isIOS = /iPhone|iPad|iPod/i.test(ua);

            // Universal Links (iOS) / App Links (Android): navigating to the
            // https URL will be intercepted by the installed app. If the app
            // isn't installed, the browser simply continues to the same URL,
            // which serves the registration page as a normal web fallback.
            const absoluteUrl = window.location.origin + redirectPath;
            // Build the in-app custom scheme deep link the app's handler
            // recognizes (host=boxstat.app preserves the /registration
            // pathname inside the boxstat:// URL so deepLinkService routes
            // correctly).
            const customSchemeUrl = `boxstat://boxstat.app${redirectPath}`;

            if (isIOS) {
              // Same-domain JS navigation to an https URL does not reliably
              // trigger Universal Link handoff in Safari. Try the custom
              // `boxstat://` scheme first (opens the installed app), then
              // fall back to the absolute https URL after a short delay so
              // users without the app land on the web registration page.
              window.location.href = customSchemeUrl;
              setTimeout(() => {
                window.location.href = absoluteUrl;
              }, 1500);
            } else if (isAndroid) {
              // Use an intent URL targeting the in-app `boxstat://` deep
              // link the app actually handles. browser_fallback_url drops
              // users without the app on the web registration page.
              window.location.href = `intent://boxstat.app${redirectPath}#Intent;scheme=boxstat;package=com.boxstat.app;S.browser_fallback_url=${encodeURIComponent(absoluteUrl)};end`;
            } else {
              fallback();
            }
          }, 2000);
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
    <>
      {/* iOS FULL BLEED - extends into all safe areas to prevent white gaps */}
      <div className="ios-full-bleed" />
      
      {/* DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center p-4">
      <Card className="w-full max-w-md md:max-w-lg">
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
            {status === "success" && (
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
    </>
  );
}
