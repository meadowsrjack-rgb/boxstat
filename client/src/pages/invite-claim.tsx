import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { authPersistence } from "@/services/authPersistence";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ChevronLeft, Users, MapPin, User } from "lucide-react";
import BoxStatLogo from "@/components/boxstat-logo";

interface InviteInfo {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  organizationName: string | null;
  players: Array<{
    id: string;
    firstName: string;
    lastName: string;
    teamId?: number;
    packageSelected?: string;
    subscriptionEndDate?: string;
  }>;
}

export default function InviteClaim() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [autoLoggedIn, setAutoLoggedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: inviteInfo, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ["/api/migration/claim", token],
    queryFn: async () => {
      const res = await fetch(`/api/migration/claim/${token}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Invalid invite link" }));
        throw new Error(body.error || "Invalid invite link");
      }
      return res.json();
    },
    enabled: !authLoading,
    retry: false,
  });

  useEffect(() => {
    if (inviteInfo) {
      setFirstName(inviteInfo.firstName || "");
      setLastName(inviteInfo.lastName || "");
    }
  }, [inviteInfo]);

  useEffect(() => {
    if (authLoading || !inviteInfo || loggingOut) return;
    if (user && user.email && inviteInfo.email && user.email.toLowerCase() !== inviteInfo.email.toLowerCase()) {
      setLoggingOut(true);
      (async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (_) {}
        await authPersistence.clearAll();
        queryClient.clear();
        window.location.reload();
      })();
    }
  }, [user, authLoading, inviteInfo, loggingOut]);

  const isStaff = inviteInfo?.role === 'coach' || inviteInfo?.role === 'admin';
  const totalSteps = 3;

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/migration/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          firstName,
          lastName,
          phoneNumber: phoneNumber || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to activate account" }));
        throw new Error(body.error || "Failed to activate account");
      }

      let autoLoginSuccess = false;
      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: inviteInfo!.email, password }),
        });
        const loginData = await loginRes.json();
        if (loginData.success && loginData.token) {
          await authPersistence.setToken(loginData.token);
          autoLoginSuccess = true;
        }
      } catch (_) {}

      setClaimed(true);
      setAutoLoggedIn(autoLoginSuccess);
      toast({ title: "Account activated!", description: "Welcome to BoxStat." });
      if (autoLoginSuccess) {
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || authLoading || loggingOut) {
    return (
      <>
        <div className="ios-full-bleed" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)' }} />
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
        <div className="ios-fixed-page relative z-10 w-full flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {loggingOut ? "Signing you out..." : "Verifying invite link..."}
          </div>
        </div>
      </>
    );
  }

  if (error || !inviteInfo) {
    return (
      <>
        <div className="ios-full-bleed" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)' }} />
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
        <div className="ios-fixed-page relative z-10 w-full flex items-center justify-center px-8" style={{ backgroundColor: 'transparent' }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Invalid or expired link</h2>
            <p className="text-gray-400 text-sm mb-6">
              {(error as Error)?.message || "This invite link is no longer valid. Please contact your organization admin for a new invite."}
            </p>
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setLocation("/login")}>
              Go to login
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (claimed) {
    return (
      <>
        <div className="ios-full-bleed" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)' }} />
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
        <div className="ios-fixed-page relative z-10 w-full flex items-center justify-center px-8" style={{ backgroundColor: 'transparent' }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Welcome to BoxStat!</h2>
            <p className="text-gray-400 text-sm mb-2">Your account is ready, {firstName}.</p>
            {autoLoggedIn ? (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Redirecting to dashboard...</span>
              </div>
            ) : (
              <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white" onClick={() => setLocation("/login")}>
                Go to login
              </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  const getStepTitle = () => {
    if (step === 1) return "Welcome";
    if (step === 2) return "Your Address";
    return "Create Password";
  };

  const getStepIcon = () => {
    if (step === 1) return <User className="w-5 h-5 text-white" />;
    if (step === 2) return <MapPin className="w-5 h-5 text-white" />;
    return <Lock className="w-5 h-5 text-white" />;
  };

  return (
    <>
      <div className="ios-full-bleed" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)' }} />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
      <div className="ios-fixed-page relative z-10 w-full flex flex-col" style={{ backgroundColor: 'transparent' }}>
        {step > 1 && (
          <div className="fixed top-4 left-4 z-50" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
            <button
              onClick={() => setStep(step - 1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <div
          className="flex flex-col px-8"
          style={{
            paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="w-full max-w-lg mx-auto flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8 pt-8">
              <div className="flex gap-2 flex-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i + 1 <= step ? "bg-red-500" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-4">{step}/{totalSteps}</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                {getStepIcon()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{getStepTitle()}</h2>
                {step === 1 && inviteInfo.organizationName && (
                  <p className="text-sm text-gray-400">{inviteInfo.organizationName}</p>
                )}
              </div>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Email verified
                  </div>
                  <p className="text-white text-sm">{inviteInfo.email}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-300 text-sm">First Name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Last Name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">Phone Number</Label>
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      placeholder="(555) 555-5555"
                      type="tel"
                    />
                  </div>
                </div>

                {isStaff && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-sm text-blue-300">
                      You've been added as {inviteInfo.role === 'coach' ? 'a coach' : 'an admin'} for {inviteInfo.organizationName || 'this organization'}.
                    </p>
                  </div>
                )}

                {inviteInfo.players.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300 font-medium">Your Players</span>
                    </div>
                    <div className="space-y-2">
                      {inviteInfo.players.map((p) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400">
                            {(p.firstName?.[0] || '').toUpperCase()}{(p.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm text-white">{p.firstName} {p.lastName}</span>
                            {p.subscriptionEndDate && (
                              <p className="text-xs text-gray-500">Access until {new Date(p.subscriptionEndDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base"
                  onClick={() => {
                    if (!firstName.trim() || !lastName.trim()) {
                      toast({ title: "Name required", description: "Please enter your first and last name.", variant: "destructive" });
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Street Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-1"
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-300 text-sm">City</Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 text-sm">State</Label>
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="bg-white/5 border-white/10 text-white mt-1"
                      placeholder="State"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">ZIP / Postal Code</Label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-1"
                    placeholder="12345"
                  />
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base mt-4"
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-gray-500 text-sm hover:text-gray-400"
                  onClick={() => setStep(3)}
                >
                  Skip for now
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm">Create Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="bg-white/5 border-white/10 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Confirm Password</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-sm">Passwords don't match</p>
                )}

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base mt-4"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !password || !confirmPassword || password !== confirmPassword}
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" /> Activate my account</>
                  )}
                </Button>
              </div>
            )}

            <p className="text-center text-gray-600 text-xs mt-8">
              <a href="/privacy-policy" className="underline hover:text-gray-400">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
