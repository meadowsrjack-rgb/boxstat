import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BanterLoader } from "@/components/BanterLoader";
import { ShoppingCart, User, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

export default function QuoteCheckout() {
  const params = useParams<{ checkoutId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'account' | 'payment' | 'success'>('details');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    playerFirstName: '',
    playerLastName: '',
    playerBirthDate: '',
  });

  const { data: quote, isLoading, error } = useQuery<any>({
    queryKey: ['/api/quote-checkouts', params.checkoutId],
    enabled: !!params.checkoutId,
  });

  useEffect(() => {
    if (quote?.lead) {
      setFormData(prev => ({
        ...prev,
        firstName: quote.lead.firstName || '',
        lastName: quote.lead.lastName || '',
        email: quote.lead.email || '',
        phone: quote.lead.phone || '',
      }));
    }
  }, [quote]);

  const completeCheckoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/quote-checkouts/${params.checkoutId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to complete checkout');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setStep('success');
      }
    },
    onError: (error: any) => {
      toast({ title: error.message || "Checkout failed", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <BanterLoader />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Quote Not Found</h2>
            <p className="text-gray-600 mb-4">This checkout link may have expired or is invalid.</p>
            <Button onClick={() => setLocation('/')} data-testid="button-go-home">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quote.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-bold mb-2">Already Completed</h2>
            <p className="text-gray-600 mb-4">This quote has already been completed.</p>
            <Button onClick={() => setLocation('/login')} data-testid="button-login">
              Login to Your Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quote.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-bold mb-2">Quote Expired</h2>
            <p className="text-gray-600 mb-4">This quote has expired. Please contact us for a new quote.</p>
            <Button onClick={() => setLocation('/')} data-testid="button-contact-us">
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleNext = () => {
    if (step === 'details') {
      setStep('account');
    } else if (step === 'account') {
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "Passwords do not match", variant: "destructive" });
        return;
      }
      setStep('payment');
    } else if (step === 'payment') {
      completeCheckoutMutation.mutate(formData);
    }
  };

  const totalAmount = quote.items?.reduce((sum: number, item: any) => {
    return sum + (item.price || 0) * (item.quantity || 1);
  }, 0) || quote.totalAmount || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="text-gray-600 mt-1">Personalized quote from UYP Basketball</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {['details', 'account', 'payment'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-red-600 text-white' : 
                  ['details', 'account', 'payment'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {i + 1}
                </div>
                {i < 2 && <div className="w-12 h-0.5 bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {step === 'success' ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
              <p className="text-gray-600 mb-6">Your account has been created and your payment has been processed.</p>
              <Button onClick={() => setLocation('/login')} className="bg-red-600 hover:bg-red-700" data-testid="button-go-to-login">
                Login to Your Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {step === 'details' && <><ShoppingCart className="w-5 h-5" /> Review Your Quote</>}
                    {step === 'account' && <><User className="w-5 h-5" /> Create Your Account</>}
                    {step === 'payment' && <><CreditCard className="w-5 h-5" /> Complete Payment</>}
                  </CardTitle>
                  <CardDescription>
                    {step === 'details' && 'Review the items in your personalized quote'}
                    {step === 'account' && 'Set up your parent account and add player information'}
                    {step === 'payment' && 'Securely complete your payment'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {step === 'details' && (
                    <>
                      <div className="space-y-3">
                        {quote.items?.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{item.productName || item.name}</p>
                              <p className="text-sm text-gray-500">{item.type === 'program' ? 'Program' : 'Product'}</p>
                            </div>
                            <p className="font-semibold">${((item.price || 0) / 100).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total</span>
                          <span>${(totalAmount / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {step === 'account' && (
                    <div className="space-y-4">
                      <div className="border-b pb-4">
                        <h3 className="font-medium mb-3">Parent/Guardian Information</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>First Name</Label>
                            <Input
                              value={formData.firstName}
                              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                              data-testid="input-parent-first-name"
                            />
                          </div>
                          <div>
                            <Label>Last Name</Label>
                            <Input
                              value={formData.lastName}
                              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                              data-testid="input-parent-last-name"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            data-testid="input-email"
                          />
                        </div>
                        <div className="mt-3">
                          <Label>Phone</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            data-testid="input-phone"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label>Password</Label>
                            <Input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({...formData, password: e.target.value})}
                              data-testid="input-password"
                            />
                          </div>
                          <div>
                            <Label>Confirm Password</Label>
                            <Input
                              type="password"
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                              data-testid="input-confirm-password"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">Player Information</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Player First Name</Label>
                            <Input
                              value={formData.playerFirstName}
                              onChange={(e) => setFormData({...formData, playerFirstName: e.target.value})}
                              data-testid="input-player-first-name"
                            />
                          </div>
                          <div>
                            <Label>Player Last Name</Label>
                            <Input
                              value={formData.playerLastName}
                              onChange={(e) => setFormData({...formData, playerLastName: e.target.value})}
                              data-testid="input-player-last-name"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <Label>Date of Birth</Label>
                          <Input
                            type="date"
                            value={formData.playerBirthDate}
                            onChange={(e) => setFormData({...formData, playerBirthDate: e.target.value})}
                            data-testid="input-player-birthdate"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 'payment' && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">Payment Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Account:</span>
                            <span>{formData.firstName} {formData.lastName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Player:</span>
                            <span>{formData.playerFirstName} {formData.playerLastName}</span>
                          </div>
                          <div className="flex justify-between font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>${(totalAmount / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Clicking "Complete Payment" will create your account and redirect you to our secure payment processor.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    {step !== 'details' && (
                      <Button
                        variant="outline"
                        onClick={() => setStep(step === 'payment' ? 'account' : 'details')}
                        data-testid="button-back"
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      className="ml-auto bg-red-600 hover:bg-red-700"
                      onClick={handleNext}
                      disabled={completeCheckoutMutation.isPending}
                      data-testid="button-continue"
                    >
                      {step === 'payment' ? (completeCheckoutMutation.isPending ? 'Processing...' : 'Complete Payment') : 'Continue'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {quote.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">{item.productName || item.name}</span>
                        <span>${((item.price || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>${(totalAmount / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
