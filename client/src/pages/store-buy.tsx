import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, CheckCircle, XCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StoreBuy() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!productId) {
      setStatus("error");
      setErrorMsg("No product specified");
      return;
    }

    async function startCheckout() {
      try {
        setStatus("loading");
        const res = await fetch(`/api/store-checkout/${productId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMsg(data.error || "Failed to create checkout");
          return;
        }
        if (data.sessionUrl) {
          setStatus("redirecting");
          window.location.href = data.sessionUrl;
        } else {
          setStatus("error");
          setErrorMsg("No checkout URL received");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Something went wrong");
      }
    }

    startCheckout();
  }, [productId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-red-600" />
        {status === "loading" && (
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
