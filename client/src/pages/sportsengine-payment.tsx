import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.number().min(1, "Amount must be at least $1"),
  paymentType: z.enum(["registration", "uniform", "tournament", "other"]),
  description: z.string().min(1, "Description is required"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function SportsEnginePayment() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/payment/:type?');
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<'form' | 'processing' | 'completed' | 'failed'>('form');

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentType: params?.type as any || 'registration',
      description: '',
    },
  });

  // Get user's existing payments
  const { data: payments = [] } = useQuery({
    queryKey: ['/api/users', user?.id, 'payments'],
    enabled: !!user?.id,
  });

  // Create SportsEngine payment
  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest('POST', '/api/payments/sportsengine/create', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Created",
        description: "Redirecting to SportsEngine payment...",
      });
      setPaymentStatus('processing');
      
      // In a real implementation, you would redirect to SportsEngine
      // For demo purposes, we'll simulate a successful payment after 3 seconds
      setTimeout(() => {
        simulatePaymentCompletion(data.paymentId);
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setPaymentStatus('failed');
    },
  });

  const simulatePaymentCompletion = async (paymentId: string) => {
    try {
      await apiRequest('POST', '/api/payments/sportsengine/complete', {
        paymentId,
        sportsEnginePaymentId: `se_${Date.now()}`,
        sportsEngineTransactionId: `txn_${Date.now()}`,
        status: 'completed'
      });
      
      setPaymentStatus('completed');
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'payments'] });
      
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully!",
      });
    } catch (error) {
      setPaymentStatus('failed');
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: PaymentFormData) => {
    setPaymentStatus('processing');
    createPaymentMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Please Log In</CardTitle>
            <CardDescription>You need to be logged in to make payments.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">SportsEngine Payment</h1>
        <p className="text-muted-foreground">Secure payment processing for UYP Basketball League</p>
      </div>

      {paymentStatus === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Enter your payment information below. You'll be redirected to SportsEngine to complete the payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="registration">Registration Fee</SelectItem>
                          <SelectItem value="uniform">Uniform Purchase</SelectItem>
                          <SelectItem value="tournament">Tournament Entry</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="1"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the payment amount in USD
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter payment description..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide details about this payment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={createPaymentMutation.isPending}>
                    {createPaymentMutation.isPending ? 'Creating Payment...' : 'Continue to SportsEngine'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation('/')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Processing Payment
            </CardTitle>
            <CardDescription>
              Processing your payment through SportsEngine...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-pulse">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Please wait while we process your payment</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Do not close this window or navigate away
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Payment Successful
            </CardTitle>
            <CardDescription>
              Your payment has been processed successfully!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium mb-2">Payment Completed</p>
              <p className="text-sm text-muted-foreground mb-4">
                You will receive a confirmation email shortly
              </p>
              <Button onClick={() => setLocation('/')}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'failed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Payment Failed
            </CardTitle>
            <CardDescription>
              There was an error processing your payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <XCircle className="h-16 w-16 mx-auto mb-4 text-red-600" />
              <p className="text-lg font-medium mb-2">Payment Failed</p>
              <p className="text-sm text-muted-foreground mb-4">
                Please try again or contact support if the issue persists
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setPaymentStatus('form')}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => setLocation('/')}>
                  Go Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {payments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.slice(0, 5).map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{payment.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.paymentType} • {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${payment.amount}</p>
                    <p className={`text-sm ${
                      payment.status === 'completed' ? 'text-green-600' : 
                      payment.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}