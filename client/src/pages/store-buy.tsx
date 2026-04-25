import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Loader2, CheckCircle, XCircle, ShoppingBag, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  inventoryCount: number | null;
  inStock: boolean;
}

// Task #325: per-page-load client id for server-side Stripe idempotency.
function generateClientCheckoutId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function StoreBuy() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [status, setStatus] = useState<"loading" | "checking" | "out-of-stock" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [clientCheckoutId] = useState<string>(() => generateClientCheckoutId());
  // Task #325: ref-based in-flight guard (state would be stale in the
  // initial useEffect closure). Reset on error so retry works.
  const checkoutInFlightRef = useRef(false);

  useEffect(() => {
    if (!productId) {
      setStatus("error");
      setErrorMsg("No product specified");
      return;
    }

    async function checkProduct() {
      try {
        setStatus("checking");
        const res = await fetch(`/api/store-product/${productId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Product not found" }));
          setStatus("error");
          setErrorMsg(data.error || "Product not found");
          return;
        }
        const data: ProductInfo = await res.json();
        setProduct(data);

        if (!data.inStock) {
          setStatus("out-of-stock");
        } else {
          startCheckout();
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Something went wrong");
      }
    }

    checkProduct();
  }, [productId]);

  async function startCheckout() {
    // Task #325: in-flight guard (see ref comment above).
    if (checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    try {
      setStatus("loading");
      const res = await fetch(`/api/store-checkout/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientCheckoutId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Failed to create checkout");
        checkoutInFlightRef.current = false;
        return;
      }
      if (data.sessionUrl) {
        setStatus("redirecting");
        window.location.href = data.sessionUrl;
      } else {
        setStatus("error");
        setErrorMsg("No checkout URL received");
        checkoutInFlightRef.current = false;
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong");
      checkoutInFlightRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-red-600" />
        {(status === "loading" || status === "checking") && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Preparing checkout...</p>
            <p className="text-gray-400 text-sm mt-1">You'll be redirected to Stripe shortly</p>
          </>
        )}
        {status === "redirecting" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Redirecting to payment...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Unable to start checkout</p>
            <p className="text-gray-400 text-sm mt-1">{errorMsg}</p>
            <Button
              className="mt-4 bg-red-600 hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </>
        )}
      </div>

      <Dialog open={status === "out-of-stock"} onOpenChange={(open) => { if (!open) window.history.back(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Currently Out of Stock</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <span className="font-semibold text-gray-900">{product?.name}</span> is currently out of stock.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 my-2">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Please allow <span className="font-semibold">2–4 weeks</span> for delivery if you choose to continue.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => startCheckout()}
            >
              Continue to Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StoreCheckoutSuccess() {
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const productName = searchParams.get('product') || 'your item';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500">Thank you for purchasing {productName}.</p>
      </div>
    </div>
  );
}

export function StoreCheckoutCancel() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-500">Your purchase was not completed. You can try again anytime.</p>
      </div>
    </div>
  );
}
