import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Calendar, DollarSign, User, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface StripeData {
  type: 'subscription' | 'one_time';
  status: string;
  currentPeriodEnd?: number;
  currentPeriodStart?: number;
  cancelAtPeriodEnd?: boolean;
  interval?: string;
  subscriptionDetails?: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    currentPeriodStart: number;
    cancelAtPeriodEnd: boolean;
    interval: string;
  };
}

interface EnrichedPayment {
  id: string;
  organizationId: string;
  userId: string;
  playerId?: string;
  amount: number;
  currency: string;
  paymentType: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentId?: string;
  packageId?: string;
  programId?: string;
  description?: string;
  dueDate?: string;
  paidAt?: Date;
  createdAt: Date;
  stripeData: StripeData | null;
  playerInfo: PlayerInfo | null;
}

export function PaymentHistory() {
  const { data: payments, isLoading, isError, error } = useQuery<EnrichedPayment[]>({
    queryKey: ['/api/payments/history'],
  });

  if (isLoading) {
    return (
      <Card data-testid="payment-history-loading">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Loading your payment history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid="payment-history-error">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Unable to load payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            {error instanceof Error ? error.message : 'An error occurred while loading your payment history. Please try again later.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card data-testid="payment-history-empty">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>No payments found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your payment history will appear here after making your first payment.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Helper to determine if payment is a subscription
  // Uses paymentType field as canonical source, with stripeData as fallback
  const isSubscriptionPayment = (p: EnrichedPayment): boolean => {
    // Check paymentType field first (canonical source) - case insensitive
    if (p.paymentType?.toLowerCase() === 'subscription') return true;
    // Fallback to stripeData for older records
    if (p.stripeData?.type === 'subscription') return true;
    return false;
  };

  // Separate active subscriptions from other payments
  const activeSubscriptions = payments.filter(
    p => isSubscriptionPayment(p) && 
         (p.stripeData?.status === 'active' || p.stripeData?.subscriptionDetails?.status === 'active' || p.status === 'completed')
  );

  const oneTimePayments = payments.filter(
    p => !isSubscriptionPayment(p)
  );

  const inactiveSubscriptions = payments.filter(
    p => isSubscriptionPayment(p) && 
         p.stripeData?.status !== 'active' &&
         p.stripeData?.subscriptionDetails?.status !== 'active' &&
         p.status !== 'completed'
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
      case 'canceled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      paid: 'default',
      active: 'default',
      pending: 'secondary',
      failed: 'destructive',
      canceled: 'destructive',
      refunded: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Amount is stored in cents, convert to dollars
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6" data-testid="payment-history">
      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <Card data-testid="active-subscriptions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Active Subscriptions
            </CardTitle>
            <CardDescription>
              Your ongoing subscription payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSubscriptions.map((payment) => {
              const subDetails = payment.stripeData?.subscriptionDetails;
              const periodEnd = subDetails?.currentPeriodEnd || payment.stripeData?.currentPeriodEnd;
              
              return (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border bg-card"
                  data-testid={`subscription-${payment.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold" data-testid={`subscription-description-${payment.id}`}>
                        {payment.description || 'Subscription'}
                      </p>
                      {payment.playerInfo && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span data-testid={`subscription-player-${payment.id}`}>
                            {payment.playerInfo.firstName} {payment.playerInfo.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" data-testid={`subscription-amount-${payment.id}`}>
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      {subDetails?.interval && (
                        <p className="text-xs text-muted-foreground capitalize">
                          per {subDetails.interval}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(subDetails?.status || payment.stripeData?.status || 'active')}
                        {getStatusBadge(subDetails?.status || payment.stripeData?.status || 'active')}
                      </div>
                      {subDetails?.cancelAtPeriodEnd && (
                        <Badge variant="outline" className="text-orange-600">
                          Cancels at period end
                        </Badge>
                      )}
                    </div>
                    {periodEnd && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Renews {format(new Date(periodEnd * 1000), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* One-Time Payments */}
      {oneTimePayments.length > 0 && (
        <Card data-testid="one-time-payments">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              One-Time Payments
            </CardTitle>
            <CardDescription>
              Your completed and pending payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {oneTimePayments.map((payment, index) => (
              <div key={payment.id}>
                {index > 0 && <Separator className="my-3" />}
                <div
                  className="flex items-start justify-between"
                  data-testid={`payment-${payment.id}`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium" data-testid={`payment-description-${payment.id}`}>
                        {payment.description || payment.paymentType}
                      </p>
                      {getStatusBadge(payment.stripeData?.status || payment.status)}
                    </div>
                    {payment.playerInfo && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span data-testid={`payment-player-${payment.id}`}>
                          {payment.playerInfo.firstName} {payment.playerInfo.lastName}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy · h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid={`payment-amount-${payment.id}`}>
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Inactive Subscriptions */}
      {inactiveSubscriptions.length > 0 && (
        <Card data-testid="inactive-subscriptions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Past Subscriptions
            </CardTitle>
            <CardDescription>
              Cancelled or expired subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {inactiveSubscriptions.map((payment, index) => (
              <div key={payment.id}>
                {index > 0 && <Separator className="my-3" />}
                <div
                  className="flex items-start justify-between opacity-60"
                  data-testid={`inactive-subscription-${payment.id}`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {payment.description || 'Subscription'}
                      </p>
                      {getStatusBadge(payment.stripeData?.subscriptionDetails?.status || payment.stripeData?.status || 'canceled')}
                    </div>
                    {payment.playerInfo && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {payment.playerInfo.firstName} {payment.playerInfo.lastName}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
