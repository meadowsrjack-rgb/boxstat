import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { authPersistence } from "@/services/authPersistence";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function InviteClaim() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: inviteInfo, isLoading, error } = useQuery<{ firstName: string; lastName: string; email: string }>({
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

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/migration/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to activate account" }));
        throw new Error(body.error || "Failed to activate account");
      }
      return res.json();
    },
    onSuccess: () => {
      setClaimed(true);
      toast({ title: "Account activated!", description: "You can now log in with your email and password." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    claimMutation.mutate();
  };

  if (isLoading || authLoading || loggingOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex items-center justify-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            {loggingOut ? "Signing you out..." : "Verifying invite link..."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invalid or expired link</CardTitle>
            <CardDescription>
              {(error as Error)?.message || "This invite link is no longer valid. Please contact your organization admin for a new invite."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Account activated!</CardTitle>
            <CardDescription>
              Welcome, {inviteInfo.firstName}! Your account is ready. Log in with your email and the password you just created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => setLocation("/login")}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <CardTitle>Claim your account</CardTitle>
          <CardDescription>
            Welcome, {inviteInfo.firstName}! Set a password to activate your Boxstat account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={`${inviteInfo.firstName || ""} ${inviteInfo.lastName || ""}`.trim()} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={inviteInfo.email} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Passwords don't match</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={claimMutation.isPending}
            >
              {claimMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
              ) : (
                <><Lock className="mr-2 h-4 w-4" /> Activate my account</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
