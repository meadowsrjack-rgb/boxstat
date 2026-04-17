import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, UserPlus, Users, Check, Mail, Loader2, Calendar } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { DateScrollPicker } from "react-date-wheel-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authPersistence } from "@/services/authPersistence";

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
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

const playerInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select a skill level",
  }),
});

const addressInfoSchema = z.object({
  address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(3, "Postal/ZIP code is required"),
});

type AddressInfo = z.infer<typeof addressInfoSchema>;

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
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const { data: organizations = [] } = useQuery<Array<{ id: string; name: string; logoUrl?: string; sportType: string; primaryColor: string; secondaryColor: string }>>({
    queryKey: ['/api/organizations/public'],
  });
  
  const urlParams = new URLSearchParams(window.location.search);
  const verifiedEmail = urlParams.get('email');
  const isVerified = urlParams.get('verified') === 'true';
  const urlOrganizationId = urlParams.get('organizationId');
  
  const [currentStep, setCurrentStep] = useState(verifiedEmail && isVerified ? 3 : 1);
  const [emailSent, setEmailSent] = useState(false);
  const [isPollingVerification, setIsPollingVerification] = useState(false);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  // Verification token returned by /api/auth/send-verification. Cached
  // here so the step-2 polling can pass it back to
  // /api/auth/check-verification-status as a self-heal fallback — even
  // if both the iOS Universal Link deep-link handoff AND the server
  // bounce page fail, the next poll will idempotently mark verified.
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<{
    organizationId?: string;
    email?: string;
    emailCheckData?: any;
    registrationType?: "myself" | "my_child";
    parentInfo?: ParentInfo;
    addressInfo?: AddressInfo;
    players: Player[];
    password?: string;
  }>({
    email: verifiedEmail || undefined,
    organizationId: (verifiedEmail && isVerified && urlOrganizationId) ? urlOrganizationId : undefined,
    players: [],
  });
  
  // Watch URL for verified=true (e.g., from deep-link verification while
  // sitting on step 2 "Waiting for verification..."). When the deep link
  // handler navigates the in-app router to /registration?email=...&verified=true,
  // the component is already mounted, so the useState initializer above does
  // not re-run. This effect picks up the new URL and advances to step 3.
  useEffect(() => {
    const params = new URLSearchParams(search || window.location.search);
    const emailFromUrl = params.get('email');
    const verifiedFromUrl = params.get('verified') === 'true';
    const orgFromUrl = params.get('organizationId');

    if (verifiedFromUrl && emailFromUrl) {
      setCurrentStep((prev) => (prev < 3 ? 3 : prev));
      setRegistrationData((prev) => ({
        ...prev,
        email: prev.email || emailFromUrl,
        organizationId: prev.organizationId || orgFromUrl || undefined,
      }));
      setIsPollingVerification(false);
    }
  }, [location, search]);

  // Poll for email verification status when waiting for user to verify
  useEffect(() => {
    if (!emailSent || !registrationData.email || currentStep !== 2) return;
    
    setIsPollingVerification(true);
    
    const checkVerification = async () => {
      try {
        const params = new URLSearchParams({
          email: registrationData.email!,
        });
        if (registrationData.organizationId) {
          params.append('organizationId', registrationData.organizationId);
        }
        if (verificationSessionId) {
          params.append('sessionId', verificationSessionId);
        }
        if (verificationToken) {
          params.append('token', verificationToken);
        }
        
        const response = await fetch(`/api/auth/check-verification-status?${params.toString()}`);
        const data = await response.json();
        
        if (data.success && data.verified) {
          clearInterval(pollInterval);
          setIsPollingVerification(false);
          toast({
            title: "Email Verified!",
            description: "Continuing with registration...",
          });
          // Move to next step
          setCurrentStep(3);
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
      }
    };

    const pollInterval = setInterval(checkVerification, 3000);

    // Immediately re-check when tab/app regains visibility (handles Android resume)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVerification();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Capacitor appStateChange for Android/iOS native resume
    let removeAppStateListener: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            checkVerification();
          }
        });
        if (cancelled) {
          listener.remove();
        } else {
          removeAppStateListener = () => listener.remove();
        }
      } catch {
        // Capacitor App plugin not available in web context — ignore
      }
    })();
    
    // Cleanup interval on unmount or when conditions change
    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      setIsPollingVerification(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      removeAppStateListener?.();
    };
  }, [emailSent, registrationData.email, currentStep, verificationSessionId, toast]);

  const totalSteps = registrationData.registrationType === "my_child" ? 7 : 6;

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
      const registrationType = variables.data.registrationType;
      
      try {
        const loginResponse = await apiRequest("/api/auth/login", {
          method: "POST",
          data: {
            email,
            password,
          },
        });
        
        if (loginResponse.success) {
          // Store JWT token for mobile authentication (using persistent native storage)
          if (loginResponse.token) {
            await authPersistence.setToken(loginResponse.token);
          }
          
          // Different message based on registration type
          const description = registrationType === "my_child"
            ? "Your player profiles have been created. Next, complete their registration."
            : "Welcome! Add yourself as a player to get started.";
          
          toast({
            title: "Registration Complete!",
            description,
          });
          
          // Force page reload to ensure fresh auth state (like login page does)
          // This prevents cached user data from previous sessions
          // Route through /dashboard so DashboardDispatcher can check for legacy claims
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 500);
        }
      } catch (loginError: any) {
        toast({
          title: "Registration Successful!",
          description: "Please login to access your account.",
        });
        window.location.href = "/login";
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

  const getStepTitle = () => {
    if (currentStep === 1) return "Select Your Organization";
    if (currentStep === 2) return "Enter Your Email";
    if (currentStep === 3) return "Who are you registering for?";
    if (currentStep === 4 && registrationData.registrationType === "myself") return "Your Information";
    if (currentStep === 4 && registrationData.registrationType === "my_child") return "Parent/Guardian Information";
    if (currentStep === 5) return "Your Address";
    if (currentStep === 6 && registrationData.registrationType === "my_child") return "Player Information";
    if ((currentStep === 6 && registrationData.registrationType === "myself") ||
        (currentStep === 7 && registrationData.registrationType === "my_child")) return "Create Account";
    return "Email Verification";
  };

  return (
    <>
      {/* iOS FULL BLEED - extends into all safe areas to prevent white gaps */}
      <div className="ios-full-bleed" style={{ background: 'linear-gradient(to bottom right, #111827, #1f2937, #000000)' }} />
      
      {/* DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="ios-fixed-page relative z-10 w-full flex flex-col" style={{ backgroundColor: 'transparent' }}>
        {/* Back Button */}
        <div 
          className="fixed top-4 left-4 z-50"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <button
            onClick={() => currentStep === 1 ? setLocation("/") : handleBack()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div 
          className="flex flex-col px-8"
          style={{ 
            paddingTop: 'calc(4rem + env(safe-area-inset-top, 0px))',
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
        <div className="w-full max-w-lg md:max-w-xl mx-auto flex flex-col">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-8 pt-8">
            <div className="flex gap-2 flex-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i + 1 <= currentStep ? "bg-red-500" : "bg-white/20"
                  }`}
                  data-testid={`progress-step-${i + 1}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400 ml-4" data-testid="step-counter">
              {currentStep}/{totalSteps}
            </span>
          </div>

          {/* Step Title */}
          <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">
            {getStepTitle()}
          </h1>

          {/* Step Content */}
          <div>
            {currentStep === 1 && (
              <OrganizationSelectionStep
                organizations={organizations}
                onSelect={(orgId) => {
                  setRegistrationData({ ...registrationData, organizationId: orgId });
                  handleNext();
                }}
              />
            )}

            {currentStep === 2 && !emailSent && (
              <EmailEntryStep
                organizationId={registrationData.organizationId || "default-org"}
                onVerificationToken={(t) => setVerificationToken(t)}
                onSubmit={(data, emailCheckData, sessionId) => {
                  setRegistrationData({ 
                    ...registrationData, 
                    email: data.email,
                    emailCheckData: emailCheckData 
                  });
                  if (sessionId) {
                    setVerificationSessionId(sessionId);
                  }
                  setEmailSent(true);
                }}
              />
            )}
            
            {currentStep === 2 && emailSent && (
              <div className="text-center py-8">
                <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Check Your Email</h3>
                <p className="text-gray-400 mb-2">
                  We sent a verification link to
                </p>
                <p className="text-white font-medium mb-6">{registrationData.email}</p>
                <p className="text-gray-500 text-sm">
                  Please click the link in your email to verify your account.
                </p>
                {isPollingVerification && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Waiting for verification...</span>
                  </div>
                )}
                <p className="text-gray-600 text-xs mt-4">
                  Don't see it? Check your spam folder.
                </p>
                <button
                  type="button"
                  className="text-red-400 hover:text-red-300 text-sm mt-3 underline underline-offset-2"
                  onClick={() => {
                    setEmailSent(false);
                    setIsPollingVerification(false);
                    setVerificationSessionId(null);
                  }}
                >
                  Didn't work? Try again
                </button>
              </div>
            )}

            {currentStep === 3 && (
              <RegistrationIntentStep
                email={registrationData.email}
                emailCheckData={registrationData.emailCheckData}
                onSubmit={(data) => {
                  setRegistrationData({ ...registrationData, registrationType: data.registrationType });
                  handleNext();
                }}
              />
            )}

            {currentStep === 4 && registrationData.registrationType === "myself" && (
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
                isSelf={true}
              />
            )}

            {currentStep === 4 && registrationData.registrationType === "my_child" && (
              <ParentInfoStep
                email={registrationData.email}
                emailCheckData={registrationData.emailCheckData}
                onSubmit={(data) => {
                  setRegistrationData({ ...registrationData, parentInfo: data });
                  handleNext();
                }}
              />
            )}

            {currentStep === 5 && (
              <AddressInfoStep
                onSubmit={(data) => {
                  setRegistrationData({ ...registrationData, addressInfo: data });
                  handleNext();
                }}
                defaultValues={registrationData.addressInfo}
              />
            )}

            {currentStep === 6 && registrationData.registrationType === "my_child" && (
              <PlayerListStep
                players={registrationData.players}
                onUpdate={(players) => {
                  setRegistrationData({ ...registrationData, players });
                }}
                onNext={handleNext}
              />
            )}

            {((currentStep === 6 && registrationData.registrationType === "myself") ||
              (currentStep === 7 && registrationData.registrationType === "my_child")) && (
              <AccountCreationStep
                onSubmit={handleSubmitRegistration}
                isLoading={registrationMutation.isPending}
              />
            )}

            {/* Email Verification Message */}
            {currentStep > totalSteps && (
              <div className="text-center py-8">
                <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                  <Check className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Check Your Email</h3>
                <p className="text-gray-400 mb-6">
                  A verification link has been sent to your email address. Please click the link to verify your account and complete registration.
                </p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
              </div>
            )}
          </div>
          
          {/* Privacy Policy Link */}
          {currentStep <= totalSteps && (
            <div className="mt-8 text-center">
              <button 
                onClick={() => setLocation('/privacy-policy')}
                className="text-gray-500 text-xs hover:text-gray-400 underline transition-colors"
                data-testid="link-privacy-policy"
              >
                Privacy Policy
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

// Step Components

function OrganizationSelectionStep({
  organizations,
  onSelect,
}: {
  organizations: Array<{ id: string; name: string; logoUrl?: string; sportType: string }>;
  onSelect: (orgId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-lg leading-relaxed">
        Which organization are you joining?
      </p>
      <div className="space-y-3">
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => onSelect(org.id)}
            className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-red-500/50 transition-all text-left flex items-center gap-4"
            data-testid={`org-select-${org.id}`}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-red-500 font-bold text-lg">{org.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{org.name}</h3>
              <p className="text-gray-400 text-sm capitalize">{org.sportType}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}

function EmailEntryStep({ 
  onSubmit,
  onVerificationToken,
  organizationId,
}: { 
  onSubmit: (data: { email: string }, emailCheckData: any, sessionId?: string) => void;
  onVerificationToken?: (token: string) => void;
  organizationId: string;
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
          organizationId,
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
    
    // Detect the native platform (ios/android) or web
    const sourcePlatform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
    
    // Store sessionId for polling correlation
    let sessionId: string | undefined;
    
    // Send verification email immediately at step 1
    try {
      const verifyResponse = await apiRequest("/api/auth/send-verification", {
        method: "POST",
        data: {
          email: data.email,
          organizationId,
          sourcePlatform,
        },
      });
      
      if (verifyResponse.success) {
        sessionId = verifyResponse.sessionId;
        if (verifyResponse.verificationToken) {
          onVerificationToken(verifyResponse.verificationToken);
        }
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
    
    onSubmit(data, checkData, sessionId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <p className="text-gray-400 text-lg leading-relaxed">
          Please enter your email address to get started. We'll check if you have an existing account with us.
        </p>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Email Address</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email"
                  placeholder="your@email.com"
                  data-testid="input-email"
                  disabled={isCheckingEmail}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500 focus:ring-red-500/20"
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Show existing user info if found */}
        {emailCheckData?.exists && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h4 className="font-semibold text-blue-400 mb-2">Account Found</h4>
            {emailCheckData.hasRegistered && (
              <p className="text-sm text-blue-300">
                This email is already registered in our system.
              </p>
            )}
            
            {emailCheckData.stripeCustomer && (
              <div className="mt-3 space-y-2">
                <h5 className="font-medium text-blue-300 text-sm">Payment History:</h5>
                {emailCheckData.activeSubscriptions?.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-green-400">Active Subscriptions:</p>
                    <ul className="list-disc list-inside ml-2 text-gray-300">
                      {emailCheckData.activeSubscriptions.map((sub: any, idx: number) => (
                        <li key={idx}>
                          {sub.product} - ${(sub.amount / 100).toFixed(2)}/{sub.interval}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isCheckingEmail}
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold"
          data-testid="button-continue-email"
        >
          {isCheckingEmail ? "Checking..." : "Continue"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </Form>
  );
}

function RegistrationIntentStep({ 
  email,
  emailCheckData,
  onSubmit,
}: { 
  email?: string;
  emailCheckData?: any;
  onSubmit: (data: RegistrationIntent) => void;
}) {
  const form = useForm<RegistrationIntent>({
    resolver: zodResolver(registrationIntentSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {email && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-sm text-gray-400">
              <span className="text-gray-500">Email:</span>{" "}
              <span className="text-white">{email}</span>
            </p>
          </div>
        )}

        {emailCheckData?.exists && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
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
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange("myself");
                      form.handleSubmit(onSubmit)();
                    }}
                    className={`p-6 border-2 rounded-2xl transition-all text-left ${
                      field.value === "myself"
                        ? "border-red-500 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                    data-testid="option-myself"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        field.value === "myself" ? "bg-red-500/20" : "bg-white/10"
                      }`}>
                        <UserPlus className={`w-7 h-7 ${field.value === "myself" ? "text-red-500" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white mb-1">Myself</h3>
                        <p className="text-sm text-gray-400">I am registering for myself</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      field.onChange("my_child");
                      form.handleSubmit(onSubmit)();
                    }}
                    className={`p-6 border-2 rounded-2xl transition-all text-left ${
                      field.value === "my_child"
                        ? "border-red-500 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    }`}
                    data-testid="option-my-child"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        field.value === "my_child" ? "bg-red-500/20" : "bg-white/10"
                      }`}>
                        <Users className={`w-7 h-7 ${field.value === "my_child" ? "text-red-500" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white mb-1">My Child</h3>
                        <p className="text-sm text-gray-400">I am registering my child or another player</p>
                      </div>
                    </div>
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function ParentInfoStep({
  email,
  emailCheckData,
  onSubmit,
}: {
  email?: string;
  emailCheckData?: any;
  onSubmit: (data: ParentInfo) => void;
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">First Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    data-testid="input-parent-first-name"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">Last Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    data-testid="input-parent-last-name"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Email</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="email" 
                  data-testid="input-parent-email"
                  readOnly
                  className="h-12 bg-white/10 border-white/10 text-gray-400 cursor-not-allowed"
                />
              </FormControl>
              <FormDescription className="text-xs text-gray-500">
                Email verified in previous step
              </FormDescription>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        {/* Display Stripe customer information if found */}
        {emailCheckData?.stripeCustomer && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3" data-testid="stripe-customer-info">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-400">Welcome Back!</h4>
                <p className="text-sm text-green-300/80">We found your payment history.</p>
              </div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Phone Number</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="tel" 
                  data-testid="input-parent-phone"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => {
            const [showPicker, setShowPicker] = useState(false);
            const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
            
            const existingDate = field.value ? new Date(field.value) : null;
            const defaultYear = existingDate?.getFullYear() ?? 2000;
            const defaultMonth = existingDate?.getMonth() ?? 0;
            const defaultDay = existingDate?.getDate() ?? 1;
            
            const handleOpenPicker = () => {
              setTempDate(existingDate ?? new Date(2000, 0, 1));
              setShowPicker(true);
            };
            
            return (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">Date of Birth *</FormLabel>
                <FormControl>
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    data-testid="input-parent-dob"
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 text-white rounded-md flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <span className={field.value ? "text-white" : "text-gray-500"}>
                      {field.value ? new Date(field.value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date of birth"}
                    </span>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </button>
                </FormControl>
                <FormMessage className="text-red-400" />
                <Dialog open={showPicker} onOpenChange={setShowPicker}>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 flex justify-center date-wheel-picker-dark text-[#d9d9d9]">
                      <DateScrollPicker
                        key={showPicker ? 'open' : 'closed'}
                        defaultYear={defaultYear}
                        defaultMonth={defaultMonth}
                        defaultDay={defaultDay}
                        startYear={1920}
                        endYear={new Date().getFullYear()}
                        dateTimeFormatOptions={{ month: 'short' }}
                        highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                        onDateChange={(date) => setTempDate(date)}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-500 hover:bg-gray-800"
                        onClick={() => setShowPicker(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          if (tempDate) {
                            field.onChange(tempDate.toISOString().split('T')[0]);
                          }
                          setShowPicker(false);
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </FormItem>
            );
          }}
        />

        <Button 
          type="submit" 
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold mt-6"
          data-testid="button-next"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </Form>
  );
}

function PlayerInfoStep({
  email,
  emailCheckData,
  onSubmit,
  isSelf,
  defaultValues,
}: {
  email?: string;
  emailCheckData?: any;
  onSubmit: (data: PlayerInfo) => void;
  isSelf?: boolean;
  defaultValues?: PlayerInfo;
}) {
  // Prefill data from Stripe if available, then override with defaultValues
  const prefillData = emailCheckData?.stripeCustomer?.prefillData || {};
  const [isUnderAge, setIsUnderAge] = useState(false);
  
  const form = useForm<PlayerInfo>({
    resolver: zodResolver(playerInfoSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || prefillData.firstName || "",
      lastName: defaultValues?.lastName || prefillData.lastName || "",
      dateOfBirth: defaultValues?.dateOfBirth || "",
      gender: defaultValues?.gender || "",
      skillLevel: defaultValues?.skillLevel,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">First Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    data-testid="input-player-first-name"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">Last Name</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    data-testid="input-player-last-name"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => {
            const [showPicker, setShowPicker] = useState(false);
            const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
            
            const existingDate = field.value ? new Date(field.value) : null;
            const defaultYear = existingDate?.getFullYear() ?? 2010;
            const defaultMonth = existingDate?.getMonth() ?? 0;
            const defaultDay = existingDate?.getDate() ?? 1;
            
            const handleOpenPicker = () => {
              setTempDate(existingDate ?? new Date(2010, 0, 1));
              setShowPicker(true);
            };
            
            return (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">Date of Birth</FormLabel>
                <FormControl>
                  <button
                    type="button"
                    onClick={handleOpenPicker}
                    data-testid="input-player-dob"
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 text-white rounded-md flex items-center justify-between hover:bg-white/10 transition-colors"
                  >
                    <span className={field.value ? "text-white" : "text-gray-500"}>
                      {field.value ? new Date(field.value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date of birth"}
                    </span>
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </button>
                </FormControl>
                {isUnderAge && (
                  <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg" data-testid="age-warning">
                    <p className="text-sm text-yellow-400 font-medium">
                      Players under 18 years old must have a parent or guardian register on their behalf.
                    </p>
                    <p className="text-xs text-yellow-500/80 mt-1">
                      Please go back and select "I'm registering my child" to continue.
                    </p>
                  </div>
                )}
                
                <Dialog open={showPicker} onOpenChange={setShowPicker}>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 flex justify-center date-wheel-picker-dark">
                      <DateScrollPicker
                        key={showPicker ? 'open' : 'closed'}
                        defaultYear={defaultYear}
                        defaultMonth={defaultMonth}
                        defaultDay={defaultDay}
                        startYear={1950}
                        endYear={new Date().getFullYear()}
                        dateTimeFormatOptions={{ month: 'short' }}
                        highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                        onDateChange={(date) => setTempDate(date)}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-500 hover:bg-gray-800"
                        onClick={() => setShowPicker(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          if (tempDate) {
                            field.onChange(tempDate.toISOString().split('T')[0]);
                          }
                          setShowPicker(false);
                        }}
                      >
                        Confirm
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger 
                    data-testid="select-player-gender"
                    className="h-12 bg-white/5 border-white/10 text-white focus:border-red-500"
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skillLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Skill Level *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white focus:border-red-500">
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="beginner">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-semibold">Beginner</span>
                      <span className="text-xs text-muted-foreground">0–2 years experience. Learning fundamentals, developing coordination and basic skills.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="intermediate">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-semibold">Intermediate</span>
                      <span className="text-xs text-muted-foreground">3–5 years experience. Solid fundamentals, good court awareness and consistent play.</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="advanced">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-semibold">Advanced</span>
                      <span className="text-xs text-muted-foreground">5+ years experience. Strong skills, competitive game sense and athletic ability.</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-red-400 text-xs" />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isUnderAge}
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold mt-6 disabled:opacity-50"
          data-testid="button-next"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </Form>
  );
}

function AddressInfoStep({
  onSubmit,
  defaultValues,
}: {
  onSubmit: (data: AddressInfo) => void;
  defaultValues?: AddressInfo;
}) {
  const form = useForm<AddressInfo>({
    resolver: zodResolver(addressInfoSchema),
    defaultValues: {
      address: defaultValues?.address || "",
      city: defaultValues?.city || "",
      state: defaultValues?.state || "",
      postalCode: defaultValues?.postalCode || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <p className="text-gray-400 text-sm">
          Please provide your home address.
        </p>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Street Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="123 Main Street"
                  data-testid="input-address"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">City</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="City"
                    data-testid="input-city"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-300 text-sm font-medium">State</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="State"
                    data-testid="input-state"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">ZIP / Postal Code</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="12345"
                  data-testid="input-postal-code"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-14 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-2xl"
          data-testid="button-address-continue"
        >
          Continue
        </Button>
      </form>
    </Form>
  );
}

function PlayerListStep({
  players,
  onUpdate,
  onNext,
}: {
  players: Player[];
  onUpdate: (players: Player[]) => void;
  onNext: () => void;
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
      <div>
        <button 
          onClick={() => setEditingPlayer(null)}
          className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white mb-6 transition-colors rounded-md hover:bg-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <PlayerInfoStep
          onSubmit={savePlayer}
          defaultValues={{
            firstName: editingPlayer.firstName,
            lastName: editingPlayer.lastName,
            dateOfBirth: editingPlayer.dateOfBirth,
            gender: editingPlayer.gender,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
            data-testid={`player-card-${player.id}`}
          >
            <div>
              <p className="font-medium text-white">{player.firstName} {player.lastName}</p>
              <p className="text-sm text-gray-400">
                {player.dateOfBirth && new Date(player.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingPlayer(player)}
                className="text-gray-400 hover:text-white hover:bg-white/10"
                data-testid={`button-edit-player-${player.id}`}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removePlayer(player.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
        className="w-full h-12 bg-transparent border-white/20 text-white hover:bg-white/10"
        data-testid="button-add-player"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Add Player
      </Button>

      <Button
        type="button"
        onClick={onNext}
        disabled={players.length === 0}
        className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
        data-testid="button-next"
      >
        Continue
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function AccountCreationStep({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: AccountCreation) => void;
  isLoading: boolean;
}) {
  const [, setLocation] = useLocation();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Password</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  data-testid="input-password"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </FormControl>
              <FormDescription className="text-xs text-gray-500">
                Must be at least 8 characters with 1 uppercase letter and 1 number/symbol
              </FormDescription>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300 text-sm font-medium">Confirm Password</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="password" 
                  data-testid="input-confirm-password"
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-red-500"
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-accept-terms"
                  className="border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-gray-300 text-sm font-normal">
                  I accept the{" "}
                  <button
                    type="button"
                    onClick={() => setLocation('/privacy-policy')}
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Terms and Conditions
                  </button>
                </FormLabel>
                <FormMessage className="text-red-400" />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marketingOptIn"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-marketing"
                  className="border-white/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-gray-300 text-sm font-normal">
                  I'd like to receive updates and promotional emails
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold mt-6"
          data-testid="button-complete-registration"
        >
          {isLoading ? "Creating Account..." : "Complete Registration"}
        </Button>
      </form>
    </Form>
  );
}
