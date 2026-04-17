import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, CreditCard } from "lucide-react";
import { redirectToRegistrationStep3 } from "@/lib/registrationHandoff";
export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [stripeDataFound, setStripeDataFound] = useState(false);

  useEffect(() => {
    const buildLinkErrorPath = (
      reason: "expired" | "used" | "invalid" | "network" | "unknown",
      email: string | null,
      organizationId: string | null,
      detail?: string,
    ) => {
      const qp = new URLSearchParams({ type: "verify-email", reason });
      if (email) qp.set("email", email);
      if (organizationId) qp.set("organizationId", organizationId);
      if (detail) qp.set("message", detail);
      return `/link-error?${qp.toString()}`;
    };

    const classify = (status: number, msg?: string) => {
      const t = (msg || "").toLowerCase();
      if (/expired/.test(t)) return "expired" as const;
      if (/already.*used|already used/.test(t)) return "used" as const;
      if (/invalid|not found/.test(t)) return "invalid" as const;
      if (status === 404) return "invalid" as const;
      if (status === 410 || status === 401) return "expired" as const;
      if (status >= 500) return "network" as const;
      return "unknown" as const;
    };

    const verifyEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const email = params.get("email");
      const organizationId = params.get("organizationId");
      const errorParam = params.get("error");

      if (errorParam) {
        setLocation(buildLinkErrorPath("unknown", email, organizationId, errorParam));
        return;
      }

      if (!token) {
        setLocation(buildLinkErrorPath("invalid", email, organizationId, "No verification token in link."));
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

          const userEmail = data.email || params.get("email") || "";
          const orgId = organizationId || "";
          setTimeout(() => {
            redirectToRegistrationStep3(userEmail, orgId, () =>
              setLocation(
                `/registration?email=${encodeURIComponent(userEmail)}&verified=true${orgId ? `&organizationId=${encodeURIComponent(orgId)}` : ""}`,
              ),
            );
          }, 2000);
        } else {
          setLocation(
            buildLinkErrorPath(classify(response.status, data?.message), email, organizationId, data?.message),
          );
        }
      } catch (error: any) {
        setLocation(
          buildLinkErrorPath("network", email, organizationId, error?.message),
        );
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
