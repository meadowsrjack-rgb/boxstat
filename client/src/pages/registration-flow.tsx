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
import { ChevronLeft, ChevronRight, UserPlus, Users, Package, Check, Mail } from "lucide-react";

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
type AccountCreation = z.infer<typeof accountCreationSchema>;

interface Player extends PlayerInfo {
  id: string;
}

export default function RegistrationFlow() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if user is coming back from email verification
  const urlParams = new URLSearchParams(window.location.search);
  const verifiedEmail = urlParams.get('email');
  const isVerified = urlParams.get('verified') === 'true';
  
  const [currentStep, setCurrentStep] = useState(verifiedEmail && isVerified ? 2 : 1);
  const [emailSent, setEmailSent] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    email?: string;
    emailCheckData?: any;
    registrationType?: "myself" | "my_child";
    parentInfo?: ParentInfo;
    players: Player[];
    password?: string;
  }>({
    email: verifiedEmail || undefined,
    players: [],
  });

  const totalSteps = registrationData.registrationType === "my_child" ? 5 : 4;

  const registrationMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("/api/registration/complete", {
        method: "POST",
        data: payload.data,
      });
    },
    onSuccess: async (response: any, variables: any) => {
      // Auto-login the user using the password from variables
      const { password } = variables;
      const email = variables.data.email;
      
      try {
        const loginResponse = await apiRequest("/api/auth/login", {
          method: "POST",
          data: {
            email,
            password,
          },
        });
        
        if (loginResponse.success) {
          toast({
            title: "Registration Complete!",
            description: "Welcome! Redirecting to your account...",
          });
          
          // Redirect to account page with full reload to ensure session is established
          setTimeout(() => {
            window.location.href = "/account";
          }, 1000);
        }
      } catch (loginError: any) {
        toast({
          title: "Registration Successful!",
          description: "Please login to access your account.",
        });
        setLocation("/login");
      }
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
    
    // Pass password separately for auto-login to avoid state timing issues
    registrationMutation.mutate({ 
      data: submissionData, 
      password: accountData.password 
    });
  };

  return (
    <div className="min-h-screen-safe bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="absolute top-4 left-4 p-2"
            data-testid="button-back-to-home"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
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
             (currentStep === 5 && registrationData.registrationType === "my_child") && "Create Account"}
            {currentStep > totalSteps && "Email Verification"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Step 1: Email Entry */}
          {currentStep === 1 && !emailSent && (
            <EmailEntryStep
              onSubmit={(data, emailCheckData) => {
                setRegistrationData({ 
                  ...registrationData, 
                  email: data.email,
                  emailCheckData: emailCheckData 
                });
                setEmailSent(true);
              }}
            />
          )}
          
          {/* Step 1: Email Verification Pending */}
          {currentStep === 1 && emailSent && (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
              <p className="text-gray-600 mb-2">
                We sent a verification link to <strong>{registrationData.email}</strong>
              </p>
              <p className="text-gray-600 mb-6">
                Please click the link in your email to verify your account and continue with registration.
              </p>
              <p className="text-sm text-gray-500">
                Don't see it? Check your spam folder.
              </p>
            </div>
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

          {/* Account Creation */}
          {((currentStep === 4 && registrationData.registrationType === "myself") ||
            (currentStep === 5 && registrationData.registrationType === "my_child")) && (
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
          
          {/* Privacy Policy Link - Show on all steps */}
          {currentStep <= totalSteps && (
            <div className="mt-6 text-center">
              <div className="text-gray-500 text-xs">
                <button 
                  onClick={() => setLocation('/privacy-policy')}
                  className="hover:text-gray-900 underline transition-colors"
                  data-testid="link-privacy-policy"
                >
                  Privacy Policy
                </button>
              </div>
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
    
    // Send verification email immediately at step 1
    try {
      const verifyResponse = await apiRequest("/api/auth/send-verification", {
        method: "POST",
        data: {
          email: data.email,
          organizationId: "default-org",
        },
      });
      
      if (verifyResponse.success) {
        toast({
          title: "Verification Email Sent!",
          description: "Please check your inbox and verify your email before completing registration.",
        });
      }
    } catch (error: any) {
      // If email already exists and is verified, show error and don't proceed
      if (error.message?.includes("already registered")) {
        toast({
          title: "Email Already Registered",
          description: "This email is already verified. Please login instead.",
          variant: "destructive",
        });
        return;
      }
      console.error("Error sending verification:", error);
    }
    
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
                  I accept the Terms of Service and <a href="/privacy-policy" target="_blank" className="text-primary hover:underline">Privacy Policy</a> *
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
