import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, UserPlus, Users, Package, Check, CreditCard } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Form schemas for each step
const emailEntrySchema = z.object({
  email: z.string().email("Valid email is required"),
});

const registrationIntentSchema = z.object({
  registrationType: z.enum(["myself", "my_child"]),
});

const parentInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const playerInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
});

const packageSelectionSchema = z.object({
  packageId: z.string().min(1, "Please select a program/package"),
});

const accountCreationSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9!@#$%^&*]/, "Password must contain at least one number or symbol"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
  marketingOptIn: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationIntent = z.infer<typeof registrationIntentSchema>;
type ParentInfo = z.infer<typeof parentInfoSchema>;
type PlayerInfo = z.infer<typeof playerInfoSchema>;
type PackageSelection = z.infer<typeof packageSelectionSchema>;
type AccountCreation = z.infer<typeof accountCreationSchema>;

interface Player extends PlayerInfo {
  id: string;
}

export default function RegistrationFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<{
    email?: string;
    emailCheckData?: any;
    registrationType?: "myself" | "my_child";
    parentInfo?: ParentInfo;
    players: Player[];
    packageId?: string;
    password?: string;
    paymentCompleted?: boolean;
  }>({
    players: [],
    paymentCompleted: false,
  });

  // Fetch available programs/packages
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const totalSteps = registrationData.registrationType === "myself" ? 6 : 7;

  const registrationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/registration/complete", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Registration Successful!",
        description: "Welcome! Redirecting to your account...",
      });
      // Redirect to account page after short delay
      setTimeout(() => {
        setLocation("/unified-account");
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitRegistration = (accountData: AccountCreation) => {
    const submissionData = {
      ...registrationData,
      password: accountData.password,
      acceptTerms: accountData.acceptTerms,
      marketingOptIn: accountData.marketingOptIn,
    };
    registrationMutation.mutate(submissionData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-12 rounded-full ${
                    i + 1 <= currentStep ? "bg-blue-600" : "bg-gray-200"
                  }`}
                  data-testid={`progress-step-${i + 1}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500" data-testid="step-counter">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <CardTitle>
            {currentStep === 1 && "Enter Your Email"}
            {currentStep === 2 && "Who are you registering for?"}
            {currentStep === 3 && registrationData.registrationType === "myself" && "Your Information"}
            {currentStep === 3 && registrationData.registrationType === "my_child" && "Parent/Guardian Information"}
            {currentStep === 4 && registrationData.registrationType === "my_child" && "Player Information"}
            {(currentStep === 4 && registrationData.registrationType === "myself") ||
             (currentStep === 5 && registrationData.registrationType === "my_child") && "Select Program/Package"}
            {(currentStep === 5 && registrationData.registrationType === "myself") ||
             (currentStep === 6 && registrationData.registrationType === "my_child") && "Payment"}
            {(currentStep === 6 && registrationData.registrationType === "myself") ||
             (currentStep === 7 && registrationData.registrationType === "my_child") && "Create Account"}
            {currentStep > totalSteps && "Email Verification"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Step 1: Email Entry */}
          {currentStep === 1 && (
            <EmailEntryStep
              onSubmit={(data, emailCheckData) => {
                setRegistrationData({ 
                  ...registrationData, 
                  email: data.email,
                  emailCheckData: emailCheckData 
                });
                handleNext();
              }}
            />
          )}

          {/* Step 2: Registration Intent */}
          {currentStep === 2 && (
            <RegistrationIntentStep
              email={registrationData.email}
              emailCheckData={registrationData.emailCheckData}
              onSubmit={(data) => {
                setRegistrationData({ ...registrationData, registrationType: data.registrationType });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 3: User Information */}
          {currentStep === 3 && registrationData.registrationType === "myself" && (
            <PlayerInfoStep
              email={registrationData.email}
              emailCheckData={registrationData.emailCheckData}
              onSubmit={(data) => {
                setRegistrationData({
                  ...registrationData,
                  players: [{ ...data, id: "player-1" }],
                });
                handleNext();
              }}
              onBack={handleBack}
              isSelf={true}
            />
          )}

          {currentStep === 3 && registrationData.registrationType === "my_child" && (
            <ParentInfoStep
              email={registrationData.email}
              emailCheckData={registrationData.emailCheckData}
              onSubmit={(data) => {
                setRegistrationData({ ...registrationData, parentInfo: data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 4: Player Information (for "my_child" flow) */}
          {currentStep === 4 && registrationData.registrationType === "my_child" && (
            <PlayerListStep
              players={registrationData.players}
              onUpdate={(players) => {
                setRegistrationData({ ...registrationData, players });
              }}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {/* Package Selection */}
          {((currentStep === 4 && registrationData.registrationType === "myself") ||
            (currentStep === 5 && registrationData.registrationType === "my_child")) && (
            <PackageSelectionStep
              programs={programs}
              emailCheckData={registrationData.emailCheckData}
              onSubmit={(data) => {
                setRegistrationData({ ...registrationData, packageId: data.packageId });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Payment Step */}
          {((currentStep === 5 && registrationData.registrationType === "myself") ||
            (currentStep === 6 && registrationData.registrationType === "my_child")) && (
            <PaymentStep
              packageId={registrationData.packageId || ""}
              programs={programs}
              emailCheckData={registrationData.emailCheckData}
              onPaymentComplete={() => {
                setRegistrationData({ ...registrationData, paymentCompleted: true });
                handleNext();
              }}
              onSkip={() => {
                setRegistrationData({ ...registrationData, paymentCompleted: true });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Account Creation */}
          {((currentStep === 6 && registrationData.registrationType === "myself") ||
            (currentStep === 7 && registrationData.registrationType === "my_child")) && (
            <AccountCreationStep
              onSubmit={handleSubmitRegistration}
              onBack={handleBack}
              isLoading={registrationMutation.isPending}
            />
          )}

          {/* Email Verification Message */}
          {currentStep > totalSteps && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
              <p className="text-gray-600 mb-6">
                A verification link has been sent to your email address. Please click the link to verify your account and complete registration.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Step Components

function EmailEntryStep({ 
  onSubmit 
}: { 
  onSubmit: (data: { email: string }, emailCheckData: any) => void 
}) {
  const { toast } = useToast();
  const [emailCheckData, setEmailCheckData] = useState<any>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  const form = useForm<{ email: string }>({
    resolver: zodResolver(emailEntrySchema),
    defaultValues: {
      email: "",
    },
  });

  const checkEmail = async (email: string) => {
    if (!email || !email.includes('@')) return null;
    
    setIsCheckingEmail(true);
    try {
      const response = await apiRequest("/api/registration/check-email", {
        method: "POST",
        data: {
          email,
          organizationId: "default-org",
        },
      });
      
      if (response.exists && response.stripeCustomer) {
        setEmailCheckData(response);
        toast({
          title: "Welcome Back!",
          description: "We found your account and payment history.",
        });
      } else if (response.exists) {
        setEmailCheckData({ exists: true, hasRegistered: response.hasRegistered });
        toast({
          title: "Account Found",
          description: response.hasRegistered ? "We found your account." : "Email exists in our system.",
        });
      } else {
        setEmailCheckData(null);
      }
      return response;
    } catch (error) {
      console.error("Error checking email:", error);
      return null;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (data: { email: string }) => {
    const checkData = await checkEmail(data.email);
    onSubmit(data, checkData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <CardDescription>
          Please enter your email address to get started. We'll check if you have an existing account with us.
        </CardDescription>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email"
                  placeholder="your@email.com"
                  data-testid="input-email"
                  disabled={isCheckingEmail}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Show existing user info if found */}
        {emailCheckData?.exists && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Account Found</h4>
            {emailCheckData.hasRegistered && (
              <p className="text-sm text-blue-700">
                This email is already registered in our system.
              </p>
            )}
            
            {emailCheckData.stripeCustomer && (
              <div className="mt-3 space-y-2">
                <h5 className="font-medium text-blue-900">Payment History:</h5>
                {emailCheckData.activeSubscriptions?.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-green-700">Active Subscriptions:</p>
                    <ul className="list-disc list-inside ml-2">
                      {emailCheckData.activeSubscriptions.map((sub: any, idx: number) => (
                        <li key={idx} className="text-blue-700">
                          {sub.product} - ${(sub.amount / 100).toFixed(2)}/
                          {sub.interval}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {emailCheckData.recentPayments?.length > 0 && (
                  <div className="text-sm mt-2">
                    <p className="font-medium text-blue-900">Recent Payments:</p>
                    <ul className="list-disc list-inside ml-2">
                      {emailCheckData.recentPayments.slice(0, 3).map((payment: any, idx: number) => (
                        <li key={idx} className="text-blue-700">
                          ${(payment.amount / 100).toFixed(2)} on{" "}
                          {new Date(payment.created * 1000).toLocaleDateString()} - {payment.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isCheckingEmail}
            data-testid="button-continue-email"
          >
            {isCheckingEmail ? "Checking..." : "Continue"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function RegistrationIntentStep({ 
  email,
  emailCheckData,
  onSubmit,
  onBack,
}: { 
  email?: string;
  emailCheckData?: any;
  onSubmit: (data: RegistrationIntent) => void;
  onBack: () => void;
}) {
  const form = useForm<RegistrationIntent>({
    resolver: zodResolver(registrationIntentSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {email && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {email}
            </p>
          </div>
        )}

        {emailCheckData?.exists && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              {emailCheckData.hasRegistered 
                ? "We found your existing account. Continue to add a new registration."
                : "Email found in our system. Continue to complete your registration."}
            </p>
          </div>
        )}
        
        <FormField
          control={form.control}
          name="registrationType"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange("myself");
                      form.handleSubmit(onSubmit)();
                    }}
                    className={`p-6 border-2 rounded-lg transition-all ${
                      field.value === "myself"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    data-testid="option-myself"
                  >
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h3 className="font-semibold text-lg mb-1">Myself</h3>
                    <p className="text-sm text-gray-600">I am registering for myself</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      field.onChange("my_child");
                      form.handleSubmit(onSubmit)();
                    }}
                    className={`p-6 border-2 rounded-lg transition-all ${
                      field.value === "my_child"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                    data-testid="option-my-child"
                  >
                    <Users className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h3 className="font-semibold text-lg mb-1">My Child</h3>
                    <p className="text-sm text-gray-600">I am registering my child or another player</p>
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            data-testid="button-back"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ParentInfoStep({
  email,
  emailCheckData,
  onSubmit,
  onBack,
}: {
  email?: string;
  emailCheckData?: any;
  onSubmit: (data: ParentInfo) => void;
  onBack: () => void;
}) {
  // Prefill data from Stripe if available
  const prefillData = emailCheckData?.stripeCustomer?.prefillData || {};
  
  const form = useForm<ParentInfo>({
    resolver: zodResolver(parentInfoSchema),
    defaultValues: {
      firstName: prefillData.firstName || "",
      lastName: prefillData.lastName || "",
      email: email || prefillData.email || "",
      phoneNumber: prefillData.phone || "",
      dateOfBirth: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-parent-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-parent-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email" 
                  data-testid="input-parent-email"
                  readOnly
                  className="bg-gray-50"
                />
              </FormControl>
              <FormDescription className="text-xs text-gray-500">
                Email verified in previous step
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Display Stripe customer information if found */}
        {emailCheckData?.stripeCustomer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3" data-testid="stripe-customer-info">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900">Welcome Back!</h4>
                <p className="text-sm text-green-800">We found your payment history.</p>
              </div>
            </div>
            
            {emailCheckData.stripeCustomer.subscriptions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Active Subscriptions:</p>
                {emailCheckData.stripeCustomer.subscriptions.map((sub: any) => (
                  <div key={sub.id} className="bg-white rounded p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">${(sub.amount / 100).toFixed(2)}/{sub.interval}</p>
                        <p className="text-gray-600">Status: {sub.status}</p>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        Next payment: {new Date(sub.currentPeriodEnd * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {emailCheckData.stripeCustomer.payments?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">Recent Payments:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {emailCheckData.stripeCustomer.payments.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="bg-white rounded p-2 text-xs flex justify-between">
                      <span>{payment.packageName || 'Payment'}</span>
                      <div className="text-right">
                        <span className="font-medium">${(payment.amount / 100).toFixed(2)}</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(payment.created * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {emailCheckData?.exists && !emailCheckData?.stripeCustomer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              {emailCheckData.hasRegistered 
                ? "This email has an existing account. You can proceed with registration or login instead."
                : "This email is in our system but hasn't completed registration yet."}
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input {...field} type="tel" data-testid="input-parent-phone" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input {...field} type="date" data-testid="input-parent-dob" />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-4">
          <Button type="button" onClick={onBack} variant="outline" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PlayerInfoStep({
  email,
  emailCheckData,
  onSubmit,
  onBack,
  isSelf,
}: {
  email?: string;
  emailCheckData?: any;
  onSubmit: (data: PlayerInfo) => void;
  onBack: () => void;
  isSelf?: boolean;
}) {
  // Prefill data from Stripe if available
  const prefillData = emailCheckData?.stripeCustomer?.prefillData || {};
  const [isUnderAge, setIsUnderAge] = useState(false);
  
  const form = useForm<PlayerInfo>({
    resolver: zodResolver(playerInfoSchema),
    defaultValues: {
      firstName: prefillData.firstName || "",
      lastName: prefillData.lastName || "",
      dateOfBirth: "",
      gender: "",
    },
  });

  // Calculate age when DOB changes (only for "myself" registration)
  const dateOfBirth = form.watch("dateOfBirth");
  
  useEffect(() => {
    if (isSelf && dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      setIsUnderAge(age < 18);
    } else {
      setIsUnderAge(false);
    }
  }, [dateOfBirth, isSelf]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-player-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-player-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input {...field} type="date" data-testid="input-player-dob" />
              </FormControl>
              {isUnderAge && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md" data-testid="age-warning">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Players under 18 years old must have a parent or guardian register on their behalf.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please go back and select "I'm registering my child" to continue.
                  </p>
                </div>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-player-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-4">
          <Button type="button" onClick={onBack} variant="outline" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" disabled={isUnderAge} data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PlayerListStep({
  players,
  onUpdate,
  onNext,
  onBack,
}: {
  players: Player[];
  onUpdate: (players: Player[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const addPlayer = () => {
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
    };
    setEditingPlayer(newPlayer);
  };

  const savePlayer = (playerData: PlayerInfo) => {
    if (editingPlayer) {
      const updatedPlayer = { ...editingPlayer, ...playerData };
      const existingIndex = players.findIndex(p => p.id === editingPlayer.id);
      
      if (existingIndex >= 0) {
        const updatedPlayers = [...players];
        updatedPlayers[existingIndex] = updatedPlayer;
        onUpdate(updatedPlayers);
      } else {
        onUpdate([...players, updatedPlayer]);
      }
      
      setEditingPlayer(null);
    }
  };

  const removePlayer = (id: string) => {
    onUpdate(players.filter(p => p.id !== id));
  };

  if (editingPlayer) {
    return (
      <PlayerInfoStep
        onSubmit={savePlayer}
        onBack={() => setEditingPlayer(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-4 border rounded-lg"
            data-testid={`player-card-${player.id}`}
          >
            <div>
              <p className="font-medium">{player.firstName} {player.lastName}</p>
              <p className="text-sm text-gray-600">
                {player.dateOfBirth && new Date(player.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditingPlayer(player)}
                data-testid={`button-edit-player-${player.id}`}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => removePlayer(player.id)}
                data-testid={`button-remove-player-${player.id}`}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addPlayer}
        className="w-full"
        data-testid="button-add-player"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Add Player
      </Button>

      <div className="flex justify-between pt-4">
        <Button type="button" onClick={onBack} variant="outline" data-testid="button-back">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={players.length === 0}
          data-testid="button-next"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function PackageSelectionStep({
  programs,
  emailCheckData,
  onSubmit,
  onBack,
}: {
  programs: any[];
  emailCheckData?: any;
  onSubmit: (data: PackageSelection) => void;
  onBack: () => void;
}) {
  // Get active subscriptions from Stripe
  const activeSubscriptions = emailCheckData?.stripeCustomer?.subscriptions || [];
  const lastPayment = emailCheckData?.stripeCustomer?.payments?.[0];
  
  // Function to check if a program is recommended (matches Stripe subscription)
  const isRecommended = (program: any) => {
    // Check if any active subscription matches this program
    return activeSubscriptions.some((sub: any) => {
      // Match by product ID or price ID
      return sub.productId === program.stripeProductId || 
             sub.priceId === program.stripePriceId ||
             // Match by package ID in payment metadata
             (lastPayment?.packageId === program.id);
    });
  };
  
  const form = useForm<PackageSelection>({
    resolver: zodResolver(packageSelectionSchema),
    defaultValues: {
      packageId: "",
    },
  });

  // Group programs by category
  const groupedPrograms = programs.reduce((acc: any, program: any) => {
    const category = program.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(program);
    return acc;
  }, {});

  // Sort programs to show recommended ones first
  Object.keys(groupedPrograms).forEach(category => {
    groupedPrograms[category].sort((a: any, b: any) => {
      const aRecommended = isRecommended(a);
      const bRecommended = isRecommended(b);
      if (aRecommended && !bRecommended) return -1;
      if (!aRecommended && bRecommended) return 1;
      return 0;
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Program/Package *</FormLabel>
              <FormControl>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPrograms).map(([category, categoryPrograms]: [string, any]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-sm text-gray-700 mb-2">{category}</h3>
                      {categoryPrograms.map((program: any) => {
                        const recommended = isRecommended(program);
                        return (
                        <button
                          key={program.id}
                          type="button"
                          onClick={() => field.onChange(program.id)}
                          className={`w-full text-left p-4 border-2 rounded-lg mb-2 transition-all ${
                            field.value === program.id
                              ? "border-blue-600 bg-blue-50"
                              : recommended 
                              ? "border-green-500 bg-green-50 hover:border-green-600"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                          data-testid={`option-package-${program.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Package className={`w-5 h-5 ${recommended ? 'text-green-600' : 'text-blue-600'}`} />
                                <h4 className="font-semibold">{program.name}</h4>
                                {recommended && (
                                  <span className="ml-2 text-xs font-medium px-2 py-1 bg-green-600 text-white rounded-full">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              {program.description && (
                                <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm">
                                <span className="font-medium text-blue-600">
                                  ${(program.price / 100).toFixed(2)}
                                </span>
                                {program.pricingModel && (
                                  <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {program.pricingModel}
                                  </span>
                                )}
                                {program.duration && (
                                  <span className="text-gray-600">{program.duration}</span>
                                )}
                              </div>
                              {program.pricingModel === "installments" && program.installmentPrice && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {program.installments} payments of ${(program.installmentPrice / 100).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                Payment processing will be completed once packages are finalized.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-4">
          <Button type="button" onClick={onBack} variant="outline" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" data-testid="button-next">
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Payment Step Component
function PaymentStep({
  packageId,
  programs,
  emailCheckData,
  onPaymentComplete,
  onSkip,
  onBack,
}: {
  packageId: string;
  programs: any[];
  emailCheckData?: any;
  onPaymentComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const selectedPackage = programs.find(p => p.id === packageId);
  const needsPayment = emailCheckData?.stripeCustomer?.needsPayment !== false;

  // Auto-skip payment if not needed
  useEffect(() => {
    if (!needsPayment) {
      toast({
        title: "Payment Up to Date",
        description: "Your payment is current. Proceeding to account setup.",
      });
      // Small delay to show the message
      setTimeout(() => {
        onSkip();
      }, 1500);
    }
  }, [needsPayment, onSkip]);

  useEffect(() => {
    if (!selectedPackage || !needsPayment) return;

    // Create payment intent
    apiRequest("POST", "/api/create-payment-intent", {
      amount: selectedPackage.price,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
    })
      .then((data: any) => {
        setClientSecret(data.clientSecret);
        setIsLoading(false);
      })
      .catch((error: any) => {
        toast({
          title: "Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
  }, [selectedPackage, needsPayment]);

  // If payment not needed, show status message
  if (!needsPayment) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Payment Current</h3>
        <p className="text-gray-600 mb-4">
          Your payment is up to date. No payment is needed at this time.
        </p>
        {emailCheckData?.stripeCustomer?.nextPaymentDate && (
          <p className="text-sm text-gray-500">
            Next payment due: {new Date(emailCheckData.stripeCustomer.nextPaymentDate).toLocaleDateString()}
          </p>
        )}
        <p className="text-sm text-gray-400 mt-4">Proceeding to account setup...</p>
      </div>
    );
  }

  if (isLoading || !clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Preparing payment...</p>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Stripe is not configured. Please contact support.</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedPackage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-1">{selectedPackage.name}</h3>
          <p className="text-2xl font-bold text-blue-600">
            ${(selectedPackage.price / 100).toFixed(2)}
          </p>
          {selectedPackage.pricingModel === "installments" && (
            <p className="text-sm text-gray-600 mt-1">
              {selectedPackage.installments} payments of ${(selectedPackage.installmentPrice / 100).toFixed(2)}
            </p>
          )}
        </div>
      )}

      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm onPaymentComplete={onPaymentComplete} onBack={onBack} />
      </Elements>
    </div>
  );
}

// Checkout Form Component (uses Stripe hooks)
function CheckoutForm({
  onPaymentComplete,
  onBack,
}: {
  onPaymentComplete: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/registration",
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully!",
      });
      onPaymentComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          disabled={isProcessing}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          data-testid="button-pay"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {isProcessing ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </form>
  );
}

function AccountCreationStep({
  onSubmit,
  onBack,
  isLoading,
}: {
  onSubmit: (data: AccountCreation) => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const form = useForm<AccountCreation>({
    resolver: zodResolver(accountCreationSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      marketingOptIn: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password *</FormLabel>
              <FormControl>
                <Input {...field} type="password" data-testid="input-password" />
              </FormControl>
              <FormDescription>
                Must be at least 8 characters with 1 uppercase letter and 1 number/symbol
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password *</FormLabel>
              <FormControl>
                <Input {...field} type="password" data-testid="input-confirm-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-accept-terms"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I accept the Terms of Service and Privacy Policy *
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marketingOptIn"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-marketing-opt-in"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  I would like to receive news and updates (optional)
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-4">
          <Button type="button" onClick={onBack} variant="outline" data-testid="button-back" disabled={isLoading}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="button-create-account">
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
