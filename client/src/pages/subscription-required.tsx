import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, LogOut } from "lucide-react";
import darkThemeLogo from "@assets/darktheme_1768878672908.png";

const PLANS: Record<string, { name: string; price: string; families: string }> = {
  starter: { name: 'Starter', price: '$99', families: 'Up to 100 families' },
  growth: { name: 'Growth', price: '$249', families: 'Up to 500 families' },
  pro: { name: 'Pro', price: '$499', families: 'Unlimited families' },
};

export default function SubscriptionRequired() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const planKey = (user as any)?.organizationPlatformPlan || 'growth';
  const selectedPlan = PLANS[planKey] || PLANS.growth;

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      return await apiRequest("/api/platform/create-subscription-checkout", {
        method: "POST",
        data: { plan },
      });
    },
    onSuccess: (response: any) => {
      if (response.url) {
        window.location.href = response.url;
      } else {
        toast({ title: "Billing Setup Issue", description: "Could not redirect to payment. Please try again.", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Payment Setup Failed", description: error.message || "Could not set up billing. Please try again.", variant: "destructive" });
    },
  });

  const handleSubscribe = () => {
    checkoutMutation.mutate(planKey);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: '#000000' }}>
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
      <div
        className="absolute bottom-0 left-0 right-0 h-64 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center bottom, rgba(220, 38, 38, 0.15) 0%, transparent 70%)' }}
      />

      <div
        className="relative z-10 flex flex-col items-center justify-center min-h-full px-6"
        style={{ paddingTop: 'max(40px, env(safe-area-inset-top))', paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
      >
        <button onClick={() => window.location.href = '/'} className="cursor-pointer hover:opacity-80 transition-opacity mb-8">
          <img src={darkThemeLogo} alt="BoxStat" className="w-[140px] h-auto" />
        </button>

        <div className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-7 h-7 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Subscription Required</h1>
          <p className="text-gray-400 text-sm mb-6">
            An active subscription is required to access the admin dashboard. Complete your payment to get started.
          </p>

          <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Selected Plan</p>
            <p className="text-white font-semibold text-lg">{selectedPlan.name}</p>
            <p className="text-gray-400 text-sm">{selectedPlan.price}/month &mdash; {selectedPlan.families}</p>
          </div>

          <Button
            onClick={handleSubscribe}
            disabled={checkoutMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl mb-4"
          >
            {checkoutMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up billing...</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" /> Subscribe — {selectedPlan.price}/month</>
            )}
          </Button>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
