import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Loading your payment history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid="payment-history-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment History
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Payment History
          </CardTitle>
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
  const isSubscriptionPayment = (p: EnrichedPayment): boolean => {
    if (p.paymentType?.toLowerCase() === 'subscription') return true;
    if (p.stripeData?.type === 'subscription') return true;
    return false;
  };

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
      <Badge variant={variants[status] || 'outline'} className="capitalize text-xs">
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Sort payments by date (most recent first)
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card data-testid="payment-history">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Payment History
        </CardTitle>
        <CardDescription>All your past payments and subscriptions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPayments.map((payment, index) => {
          const isSubscription = isSubscriptionPayment(payment);
          const subDetails = payment.stripeData?.subscriptionDetails;
          const periodEnd = subDetails?.currentPeriodEnd || payment.stripeData?.currentPeriodEnd;
          const isActive = subDetails?.status === 'active' || payment.stripeData?.status === 'active' || payment.status === 'completed';
          
          return (
            <div key={payment.id}>
              {index > 0 && <Separator className="my-3" />}
              <div
                className="flex items-start justify-between"
                data-testid={`payment-${payment.id}`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusIcon(subDetails?.status || payment.stripeData?.status || payment.status)}
                    <p className="font-medium" data-testid={`payment-description-${payment.id}`}>
                      {payment.description || payment.paymentType}
                    </p>
                    {getStatusBadge(subDetails?.status || payment.stripeData?.status || payment.status)}
                    {isSubscription && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Subscription
                      </Badge>
                    )}
                  </div>
                  
                  {payment.playerInfo && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span data-testid={`payment-player-${payment.id}`}>
                        {payment.playerInfo.firstName} {payment.playerInfo.lastName}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>
                      {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                    </span>
                    
                    {/* Show next payment due for active subscriptions */}
                    {isSubscription && isActive && periodEnd && (
                      <div className="flex items-center gap-1 text-blue-600 font-medium">
                        <Calendar className="h-3 w-3" />
                        <span data-testid={`payment-next-due-${payment.id}`}>
                          Next payment: {format(new Date(periodEnd * 1000), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                    
                    {/* Show billing interval for subscriptions */}
                    {isSubscription && subDetails?.interval && (
                      <span className="text-gray-500 capitalize">
                        ({subDetails.interval}ly)
                      </span>
                    )}
                    
                    {/* Show cancellation notice */}
                    {isSubscription && subDetails?.cancelAtPeriodEnd && (
                      <Badge variant="outline" className="text-orange-600 text-xs">
                        Cancels at period end
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <p className="font-bold" data-testid={`payment-amount-${payment.id}`}>
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  {isSubscription && subDetails?.interval && (
                    <p className="text-xs text-muted-foreground capitalize">
                      per {subDetails.interval}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
