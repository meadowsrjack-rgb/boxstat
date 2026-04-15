import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function PaymentSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const isCanceled = urlParams.get('canceled') === 'true';
  const sessionId = urlParams.get('session_id');
  const isNative = urlParams.get('native') === 'true';
  const [countdown, setCountdown] = useState(3);
  const [verified, setVerified] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isCanceled) return;

    const verifySession = async () => {
      if (sessionId) {
        try {
          await fetch('/api/payments/verify-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
            },
            body: JSON.stringify({ sessionId }),
          });
        } catch (e) {
        }
      }
      setVerified(true);
    };

    verifySession();

    if (!isNative) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setLocation("/unified-account");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isCanceled, sessionId, isNative]);

  if (isCanceled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6 safe-top">
        <div className="text-center max-w-md md:max-w-lg">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Payment Canceled
          </h1>
          <p className="text-gray-600 mb-6">
            No worries — your payment was not processed. You can try again anytime from the app.
          </p>
          <p className="text-sm text-gray-400">
            Tap the <strong>✕</strong> button above to return to the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-6 safe-top">
      <div className="text-center max-w-md md:max-w-lg">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. A receipt has been sent to your email.
        </p>
        {isNative ? (
          <p className="text-sm text-gray-400">
            Tap the <strong>✕</strong> button above to return to the app.
          </p>
        ) : (
          <p className="text-sm text-gray-400">
            Redirecting you back to the app{countdown > 0 ? ` in ${countdown}...` : "..."}
          </p>
        )}
      </div>
    </div>
  );
}
