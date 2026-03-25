import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingCart, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AbandonedCart {
  id: number;
  productName: string;
  playerName: string | null;
  amount: number | null;
  createdAt: string;
}

export default function AbandonedCartBanner({ onNavigateToPayments }: { onNavigateToPayments?: () => void }) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: carts = [] } = useQuery<AbandonedCart[]>({
    queryKey: ['/api/abandoned-carts'],
    refetchInterval: 5 * 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (cartId: number) => {
      await apiRequest("POST", `/api/abandoned-carts/${cartId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/abandoned-carts'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (cartId: number) => {
      return await apiRequest("POST", `/api/abandoned-carts/${cartId}/resume`);
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({
        title: "Checkout failed",
        description: "We couldn't resume your checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const visibleCarts = carts.filter(c => !dismissedIds.has(c.id));
  if (visibleCarts.length === 0) return null;

  const cart = visibleCarts[0];
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleDismiss = (id: number) => {
    setDismissedIds(prev => new Set([...prev, id]));
    dismissMutation.mutate(id);
  };

  const handleCompleteCheckout = () => {
    resumeMutation.mutate(cart.id);
  };

  return (
    <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4 shadow-sm">
      <button
        onClick={() => handleDismiss(cart.id)}
        className="absolute top-2 right-2 p-1 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold text-amber-900">
            You have an unfinished checkout!
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            {cart.playerName
              ? `${cart.playerName}'s enrollment in ${cart.productName}`
              : cart.productName}
            {cart.amount ? ` — ${formatPrice(cart.amount)}` : ''}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 px-3 text-amber-700 hover:text-amber-900 hover:bg-amber-100 font-medium"
            onClick={handleCompleteCheckout}
            disabled={resumeMutation.isPending}
          >
            {resumeMutation.isPending ? "Loading..." : "Complete Checkout"}
            {!resumeMutation.isPending && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
          </Button>
        </div>
      </div>
      {visibleCarts.length > 1 && (
        <p className="text-xs text-amber-500 mt-2 ml-13">
          +{visibleCarts.length - 1} more item{visibleCarts.length > 2 ? 's' : ''} waiting
        </p>
      )}
    </div>
  );
}
