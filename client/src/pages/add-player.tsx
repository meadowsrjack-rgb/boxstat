import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, UserPlus, Package, Check } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

// Step schemas
const playerNameSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const dobSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

const genderSchema = z.object({
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
});

const packageSchema = z.object({
  packageId: z.string().min(1, "Please select a package"),
});

type PlayerName = z.infer<typeof playerNameSchema>;
type DOB = z.infer<typeof dobSchema>;
type Gender = z.infer<typeof genderSchema>;
type Package = z.infer<typeof packageSchema>;

export default function AddPlayer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [playerData, setPlayerData] = useState<{
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    packageId?: string;
  }>({});

  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const addPlayerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/account/players", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Player Added!",
        description: "Player has been successfully added to your account.",
      });
      setTimeout(() => {
        setLocation("/unified-account");
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Player",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const progress = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-6 h-6" />
              Add Player
            </CardTitle>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Step {currentStep} of 5
            </p>
          </CardHeader>
          <CardContent>
            {/* Step 1: Player Name */}
            {currentStep === 1 && (
              <PlayerNameStep
                defaultValues={{
                  firstName: playerData.firstName || "",
                  lastName: playerData.lastName || "",
                }}
                onSubmit={(data) => {
                  setPlayerData({ ...playerData, ...data });
                  handleNext();
                }}
                onBack={() => setLocation("/unified-account")}
              />
            )}

            {/* Step 2: Date of Birth */}
            {currentStep === 2 && (
              <DOBStep
                defaultValues={{ dateOfBirth: playerData.dateOfBirth || "" }}
                onSubmit={(data) => {
                  setPlayerData({ ...playerData, ...data });
                  handleNext();
                }}
                onBack={handleBack}
              />
            )}

            {/* Step 3: Gender */}
            {currentStep === 3 && (
              <GenderStep
                defaultValues={{ gender: playerData.gender || "" }}
                onSubmit={(data) => {
                  setPlayerData({ ...playerData, ...data });
                  handleNext();
                }}
                onBack={handleBack}
              />
            )}

            {/* Step 4: Package Selection */}
            {currentStep === 4 && (
              <PackageStep
                programs={programs}
                defaultValues={{ packageId: playerData.packageId || "" }}
                onSubmit={(data) => {
                  setPlayerData({ ...playerData, ...data });
                  handleNext();
                }}
                onBack={handleBack}
              />
            )}

            {/* Step 5: Payment */}
            {currentStep === 5 && (
              <PaymentStep
                packageId={playerData.packageId!}
                programs={programs}
                onPaymentComplete={() => {
                  addPlayerMutation.mutate(playerData);
                }}
                onBack={handleBack}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Step Components
function PlayerNameStep({
  defaultValues,
  onSubmit,
  onBack,
}: {
  defaultValues: PlayerName;
  onSubmit: (data: PlayerName) => void;
  onBack: () => void;
}) {
  const form = useForm<PlayerName>({
    resolver: zodResolver(playerNameSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-firstName" />
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
                <Input {...field} data-testid="input-lastName" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack} data-testid="button-back">
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

function DOBStep({
  defaultValues,
  onSubmit,
  onBack,
}: {
  defaultValues: DOB;
  onSubmit: (data: DOB) => void;
  onBack: () => void;
}) {
  const form = useForm<DOB>({
    resolver: zodResolver(dobSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth *</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-dateOfBirth" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack} data-testid="button-back">
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

function GenderStep({
  defaultValues,
  onSubmit,
  onBack,
}: {
  defaultValues: { gender?: string };
  onSubmit: (data: Gender) => void;
  onBack: () => void;
}) {
  const form = useForm<Gender>({
    resolver: zodResolver(genderSchema),
    defaultValues: { gender: defaultValues.gender as any },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male" data-testid="option-male">Male</SelectItem>
                  <SelectItem value="female" data-testid="option-female">Female</SelectItem>
                  <SelectItem value="other" data-testid="option-other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack} data-testid="button-back">
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

function PackageStep({
  programs,
  defaultValues,
  onSubmit,
  onBack,
}: {
  programs: any[];
  defaultValues: Package;
  onSubmit: (data: Package) => void;
  onBack: () => void;
}) {
  const form = useForm<Package>({
    resolver: zodResolver(packageSchema),
    defaultValues,
  });

  const groupedPrograms = programs.reduce((acc: any, program: any) => {
    const category = program.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(program);
    return acc;
  }, {});

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Package *</FormLabel>
              <FormControl>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(groupedPrograms).map(([category, categoryPrograms]: [string, any]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-sm text-gray-700 mb-2">{category}</h3>
                      {categoryPrograms.map((program: any) => (
                        <button
                          key={program.id}
                          type="button"
                          onClick={() => field.onChange(program.id)}
                          className={`w-full text-left p-4 border-2 rounded-lg mb-2 transition-all ${
                            field.value === program.id
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                          data-testid={`option-package-${program.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-600" />
                                <h4 className="font-semibold">{program.name}</h4>
                              </div>
                              {program.description && (
                                <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm">
                                <span className="font-medium text-blue-600">
                                  ${(program.price / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onBack} data-testid="button-back">
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

function PaymentStep({
  packageId,
  programs,
  onPaymentComplete,
  onBack,
}: {
  packageId: string;
  programs: any[];
  onPaymentComplete: () => void;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const selectedPackage = programs.find(p => p.id === packageId);

  useEffect(() => {
    if (!selectedPackage) return;

    apiRequest("/api/create-payment-intent", {
      method: "POST",
      data: {
        amount: selectedPackage.price,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
      },
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
  }, [selectedPackage, toast]);

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Stripe is not configured. Please contact support.</p>
        <Button variant="outline" onClick={onBack} className="mt-4" data-testid="button-back">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  if (isLoading || !clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Setting up payment...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Payment Summary</h3>
        <div className="flex justify-between text-sm">
          <span>{selectedPackage.name}</span>
          <span className="font-medium">${(selectedPackage.price / 100).toFixed(2)}</span>
        </div>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm onSuccess={onPaymentComplete} onBack={onBack} />
      </Elements>
    </div>
  );
}

function CheckoutForm({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/unified-account`,
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
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing} data-testid="button-back">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} data-testid="button-submit-payment">
          {isProcessing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Complete Payment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
