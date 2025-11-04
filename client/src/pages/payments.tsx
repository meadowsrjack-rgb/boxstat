import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Package, DollarSign, AlertCircle, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import MyPurchasesCard from "@/components/payments/MyPurchasesCard";
import type { Payment, Program as ProgramType } from "@/utils/deriveStatus";

type PackageSelection = {
  id: string;
  childUserId: string;
  programId: string;
  isPaid: boolean;
};

type Program = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  pricingModel?: string;
  billingModel?: string;
  type?: string;
  billingCycle?: string;
  category?: string;
};

type User = {
  id: string;
  firstName: string;
  lastName: string;
};

// Detailed Billing History Component
function BillingHistoryTable() {
  const { user } = useAuth();

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  // Fetch programs/packages
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  const isLoading = paymentsLoading || programsLoading;

  // Map payments to include package details
  const tableData = useMemo(() => {
    return payments.map((payment) => {
      const pkg = programs.find((p) => p.id === payment.programId || p.id === payment.packageId);
      return {
        id: payment.id,
        name: pkg?.name || payment.description || "Payment",
        type: pkg?.type || "One-Time",
        billingCycle: pkg?.billingCycle || "-",
        status: payment.status || "pending",
        paymentDate: payment.paidAt || payment.createdAt,
        coverage: pkg?.billingModel || "-",
        amount: pkg?.price || payment.amount * 100, // Convert to cents if needed
      };
    });
  }, [payments, programs]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "active":
      case "paid":
        return "bg-green-600/20 text-green-400 border-green-500/30";
      case "past_due":
      case "failed":
        return "bg-red-600/20 text-red-400 border-red-500/30";
      case "pending":
      case "processing":
        return "bg-purple-600/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-500/30";
    }
  };

  // Format status label
  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" data-testid="loader-billing-history" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tableData.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-white/50 py-8" data-testid="text-no-billing-history">
            No payment records found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing History
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="button-refresh-billing"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("https://billing.stripe.com", "_blank")}
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="button-stripe-portal"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Portal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full" data-testid="table-billing-history">
            <thead>
              <tr className="text-left text-white/60 border-b border-white/10">
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider">Package</th>
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider">Type</th>
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider">Billing</th>
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider">Payment Date</th>
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider">Coverage</th>
                <th className="py-3 px-4 text-xs font-medium uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  data-testid={`billing-row-${idx}`}
                >
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-white" data-testid={`billing-name-${idx}`}>
                      {row.name}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-white/70" data-testid={`billing-type-${idx}`}>
                      {row.type}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-white/70" data-testid={`billing-cycle-${idx}`}>
                      {row.billingCycle}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant="outline"
                      className={getStatusColor(row.status)}
                      data-testid={`billing-status-${idx}`}
                    >
                      {formatStatus(row.status)}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-white/70" data-testid={`billing-date-${idx}`}>
                      {row.paymentDate
                        ? new Date(row.paymentDate).toLocaleDateString()
                        : "-"}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-white/70" data-testid={`billing-coverage-${idx}`}>
                      {row.coverage}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm font-semibold text-white" data-testid={`billing-amount-${idx}`}>
                      ${(row.amount / 100).toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PackageSelectionsSummary() {
  const { user } = useAuth();
  
  // Fetch package selections
  const { data: selections = [], isLoading: selectionsLoading } = useQuery<PackageSelection[]>({
    queryKey: ["/api/family/package-selections"],
    enabled: !!user,
  });

  // Fetch all programs
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: !!user,
  });

  // Fetch all users to get child names
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user && selections.length > 0,
  });

  const isLoading = selectionsLoading || programsLoading || usersLoading;

  // Calculate total
  const total = useMemo(() => {
    return selections.reduce((sum, selection) => {
      const program = programs.find(p => p.id === selection.programId);
      return sum + (program?.price || 0);
    }, 0);
  }, [selections, programs]);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Selections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/60" data-testid="loader-package-selections" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selections.length === 0) {
    return (
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 flex gap-3" data-testid="alert-no-selections">
        <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-white/80">
          No package selections found. Complete the{" "}
          <a href="/family-onboarding" className="underline font-medium">
            family onboarding
          </a>
          {" "}to select packages for your players.
        </p>
      </div>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="h-5 w-5" />
          Your Package Selections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3" data-testid="package-selections-list">
          {selections.map((selection, idx) => {
            const program = programs.find(p => p.id === selection.programId);
            const child = users.find(u => u.id === selection.childUserId);
            
            return (
              <div 
                key={selection.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                data-testid={`package-selection-${idx}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-white" data-testid={`text-child-name-${idx}`}>
                    {child ? `${child.firstName} ${child.lastName}` : "Loading..."}
                  </p>
                  <p className="text-sm text-white/60" data-testid={`text-program-name-${idx}`}>
                    {program?.name || "Loading..."}
                  </p>
                  {program?.pricingModel && (
                    <p className="text-xs text-white/40 mt-1">
                      {program.pricingModel}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white" data-testid={`text-program-price-${idx}`}>
                    {program?.price ? `$${(program.price / 100).toFixed(2)}` : "—"}
                  </p>
                  {selection.isPaid ? (
                    <Badge variant="default" className="bg-green-600 text-white mt-1">
                      Paid
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 mt-1">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-white/60" />
              <span className="text-lg font-semibold text-white">Total Due</span>
            </div>
            <span className="text-2xl font-bold text-white" data-testid="text-total-amount">
              ${(total / 100).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-2">
            Complete payment below to activate your selected packages.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check URL params for success/cancel
  const urlParams = new URLSearchParams(window.location.search);
  const paymentSuccess = urlParams.get('success') === 'true';
  const paymentCanceled = urlParams.get('canceled') === 'true';

  // Fetch package selections to determine if there are unpaid items
  const { data: selections = [] } = useQuery<PackageSelection[]>({
    queryKey: ["/api/family/package-selections"],
    enabled: !!user,
  });

  const hasUnpaidPackages = useMemo(() => {
    return selections.some(selection => !selection.isPaid);
  }, [selections]);

  const handleProceedToPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payments/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No session URL returned');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`
      }}
    >
      <div className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Payment Center</h1>
            <p className="text-white/70">Manage your package selections and payments.</p>
          </div>
        </div>

        {/* Success Alert */}
        {paymentSuccess && (
          <Alert className="bg-green-500/10 border-green-500/20" data-testid="alert-payment-success">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <AlertDescription className="text-white/90">
              Payment successful! Your packages have been activated. Thank you for your purchase.
            </AlertDescription>
          </Alert>
        )}

        {/* Canceled Alert */}
        {paymentCanceled && (
          <Alert className="bg-yellow-500/10 border-yellow-500/20" data-testid="alert-payment-canceled">
            <XCircle className="h-5 w-5 text-yellow-400" />
            <AlertDescription className="text-white/90">
              Payment was canceled. You can try again when you're ready.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-500/10 border-red-500/20" data-testid="alert-payment-error">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <AlertDescription className="text-white/90">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Billing History Table */}
        <BillingHistoryTable />

        {/* Package Selections Summary */}
        <PackageSelectionsSummary />

        {/* Payment Action */}
        <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
          <CardContent className="pt-6">
            {!hasUnpaidPackages ? (
              <div className="text-center py-8" data-testid="message-no-unpaid-packages">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">All packages are paid!</p>
                <p className="text-white/60">
                  You don't have any pending payments at this time.
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-white/60 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-2">Ready to complete your payment?</p>
                <p className="text-white/60 mb-6">
                  Click below to proceed to secure checkout with Stripe.
                </p>
                <Button 
                  onClick={handleProceedToPayment}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
                  data-testid="button-proceed-to-payment"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Purchases */}
        <MyPurchasesCard />
      </div>
    </div>
  );
}
