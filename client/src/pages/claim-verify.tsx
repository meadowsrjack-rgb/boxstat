import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BoxStatLogo from "@/components/boxstat-logo";
import { redirectToRegistrationStep3, buildRegistrationStep3Path } from "@/lib/registrationHandoff";
interface VerifyResponse {
  success: boolean;
  autoLogin?: boolean;
  redirectUrl?: string;
  account: {
    id: string;
    email: string;
    primaryAccountType: string;
    registrationStatus: string;
    organizationId?: string;
  };
  profiles: Array<{
    id: string;
    profileType: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  }>;
}

export default function ClaimVerify() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [accountData, setAccountData] = useState<VerifyResponse | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const buildLinkErrorPath = (
      reason: "expired" | "used" | "invalid" | "network" | "unknown",
      detail?: string,
      email?: string,
    ) => {
      const qp = new URLSearchParams({ type: "claim-verify", reason });
      if (detail) qp.set("message", detail);
      if (email) qp.set("email", email);
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

    const verifyClaimToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (!token) {
        setLocation(buildLinkErrorPath("invalid", "No claim token in link."));
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-claim/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setLocation(buildLinkErrorPath(classify(response.status, data?.message), data?.message));
          return;
        }

        setAccountData(data);
        setStatus("success");

        toast({
          title: "Account claimed successfully!",
          description: `Welcome to BoxStat, ${data.account.email}!`,
        });

        // In development mode with autoLogin, the server returns a
        // redirectUrl (e.g. /profile-selection) and we honor it.
        // In production, hand the user off to registration step 3 the same
        // way the verify-email flow does — preferring the native app via
        // Universal Link / App Link / boxstat:// when installed.
        setTimeout(() => {
          if (data.autoLogin && data.redirectUrl) {
            window.location.href = data.redirectUrl;
            return;
          }
          const email = data.account?.email || "";
          const orgId = data.account?.organizationId || null;
          redirectToRegistrationStep3(email, orgId, () => {
            setLocation(buildRegistrationStep3Path(email, orgId));
          });
        }, 2000);

      } catch (error: any) {
        console.error("Claim verification failed:", error);
        setLocation(buildLinkErrorPath("network", error?.message));
      }
    };

    verifyClaimToken();
  }, [toast, setLocation]);

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-red-50 to-gray-100 safe-bottom flex items-center justify-center p-4">
      <Card className="w-full max-w-md md:max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <BoxStatLogo variant="auto" className="h-16 w-auto" />
          </div>
          
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-16 w-16 text-red-500 animate-spin" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Verifying Your Claim
              </CardTitle>
              <CardDescription className="text-gray-600">
                Please wait while we set up your account...
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Account Claimed Successfully!
              </CardTitle>
              <CardDescription className="text-gray-600">
                Welcome to BoxStat Academy
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Verification Failed
              </CardTitle>
              <CardDescription className="text-gray-600">
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {status === "success" && accountData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Account Details</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Email:</strong> {accountData.account.email}</p>
                  <p><strong>Account Type:</strong> {accountData.account.primaryAccountType}</p>
                  <p><strong>Status:</strong> {accountData.account.registrationStatus}</p>
                </div>
              </div>

              {accountData.profiles.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Your Profiles</h3>
                  <div className="space-y-2">
                    {accountData.profiles.map((profile) => (
                      <div key={profile.id} className="text-sm text-blue-700">
                        <strong>{profile.firstName} {profile.lastName}</strong> ({profile.profileType})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-gray-600">
                <p>Redirecting you in 2 seconds...</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-800 mb-2">What went wrong?</h3>
                <div className="text-sm text-red-700 space-y-1">
                  <p>• The claim link may have expired (links are valid for 30 minutes)</p>
                  <p>• The claim link may have already been used</p>
                  <p>• There may be a technical issue</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => setLocation("/claim")}
                  className="w-full bg-red-500 hover:bg-red-600"
                  data-testid="button-request-new-link"
                >
                  Request New Claim Link
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="w-full"
                  data-testid="button-back-home"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="text-center text-sm text-gray-500">
              <p>This may take a few moments...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}