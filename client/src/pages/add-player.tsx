import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, UserPlus, CreditCard, DollarSign, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

type Program = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  pricingModel?: string;
};

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

  // Fetch programs for step 4
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: currentStep >= 4,
  });

  // Group programs by category
  const programsByCategory = programs.reduce((acc, program) => {
    const category = program.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(program);
    return acc;
  }, {} as Record<string, Program[]>);

  const addPlayerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/account/players", {
        method: "POST",
        data,
      });
    },
    onSuccess: (response: any) => {
      if (response.checkoutUrl) {
        // Redirect to Stripe Checkout
        toast({
          title: "Redirecting to Payment",
          description: "Please complete payment to finalize player registration.",
        });
        
        setTimeout(() => {
          window.location.href = response.checkoutUrl;
        }, 1000);
      } else {
        // Fallback: player added without payment (shouldn't happen)
        queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        
        toast({
          title: "Player Added!",
          description: "Player has been successfully added to your account.",
        });
        setTimeout(() => {
          setLocation("/unified-account");
        }, 1000);
      }
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

  // Get selected program for step 5
  const selectedProgram = programs.find(p => p.id === playerData.packageId);

  return (
    <div className="min-h-full bg-gray-50 safe-bottom py-8 px-4">
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
              <PackageSelectionStep
                defaultValues={{ packageId: playerData.packageId || "" }}
                programs={programs}
                programsByCategory={programsByCategory}
                isLoading={programsLoading}
                onSubmit={(data) => {
                  setPlayerData({ ...playerData, ...data });
                  handleNext();
                }}
                onBack={handleBack}
              />
            )}

            {/* Step 5: Payment Summary */}
            {currentStep === 5 && (
              <PaymentSummaryStep
                playerData={playerData}
                selectedProgram={selectedProgram}
                onSubmit={() => {
                  const finalData = { ...playerData };
                  addPlayerMutation.mutate(finalData);
                }}
                onBack={handleBack}
                isSubmitting={addPlayerMutation.isPending}
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

function PackageSelectionStep({
  defaultValues,
  programs,
  programsByCategory,
  isLoading,
  onSubmit,
  onBack,
}: {
  defaultValues: { packageId?: string };
  programs: Program[];
  programsByCategory: Record<string, Program[]>;
  isLoading: boolean;
  onSubmit: (data: Package) => void;
  onBack: () => void;
}) {
  const form = useForm<Package>({
    resolver: zodResolver(packageSchema),
    defaultValues: { packageId: defaultValues.packageId || "" },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading programs...</span>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No programs available at this time.</p>
        <Button onClick={onBack} variant="outline" className="mt-4" data-testid="button-back">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select a Program *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-3"
                  data-testid="radiogroup-packages"
                >
                  {Object.entries(programsByCategory).map(([category, categoryPrograms]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-gray-700 text-sm mt-4">
                        {category}
                      </h3>
                      {categoryPrograms.map((program) => (
                        <div
                          key={program.id}
                          className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-gray-50 transition"
                          data-testid={`package-option-${program.id}`}
                        >
                          <RadioGroupItem value={program.id} id={program.id} data-testid={`radio-${program.id}`} />
                          <Label
                            htmlFor={program.id}
                            className="min-h-full cursor-pointer"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900" data-testid={`text-program-name-${program.id}`}>
                                  {program.name}
                                </p>
                                {program.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {program.description}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {(program as any).type && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {(program as any).type}
                                    </span>
                                  )}
                                  {(program as any).billingModel && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {(program as any).billingModel}
                                    </span>
                                  )}
                                  {(program as any).type === "Subscription" && (program as any).billingCycle && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      {(program as any).billingCycle}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {program.price && (
                                <div className="text-right ml-4">
                                  <p className="font-bold text-blue-600" data-testid={`text-program-price-${program.id}`}>
                                    ${(program.price / 100).toFixed(2)}
                                  </p>
                                  {(program as any).type === "Subscription" && (program as any).billingCycle && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      per {(program as any).billingCycle.toLowerCase()}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  ))}
                </RadioGroup>
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

function PaymentSummaryStep({
  playerData,
  selectedProgram,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  playerData: any;
  selectedProgram?: Program;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
        
        {/* Player Information */}
        <div className="border rounded-lg p-4 mb-4 bg-gray-50">
          <h4 className="font-medium text-gray-700 mb-2">Player Information</h4>
          <div className="space-y-1 text-sm">
            <p data-testid="text-player-name">
              <span className="text-gray-600">Name:</span>{" "}
              <span className="font-medium">{playerData.firstName} {playerData.lastName}</span>
            </p>
            <p data-testid="text-player-dob">
              <span className="text-gray-600">Date of Birth:</span>{" "}
              <span className="font-medium">{playerData.dateOfBirth}</span>
            </p>
            <p data-testid="text-player-gender">
              <span className="text-gray-600">Gender:</span>{" "}
              <span className="font-medium capitalize">{playerData.gender}</span>
            </p>
          </div>
        </div>

        {/* Package Information */}
        {selectedProgram && (
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Selected Package
            </h4>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900" data-testid="text-selected-program-name">
                {selectedProgram.name}
              </p>
              {selectedProgram.description && (
                <p className="text-sm text-gray-600">{selectedProgram.description}</p>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-200">
                <span className="text-gray-700 font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600" data-testid="text-total-amount">
                  ${selectedProgram.price ? (selectedProgram.price / 100).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Notice */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> You will be redirected to a secure payment page to complete your transaction.
            The player will be added to your account after successful payment.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} data-testid="button-back">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} data-testid="button-proceed-payment">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
