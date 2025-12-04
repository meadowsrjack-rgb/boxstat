import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, UserPlus, CreditCard, DollarSign, Loader2, Calendar } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DateScrollPicker } from "react-date-wheel-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    <div className="scrollable-page bg-gradient-to-b from-gray-900 to-black safe-bottom py-8 px-4 min-h-screen-safe">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <UserPlus className="w-8 h-8" />
              Add Player
            </h1>
            <span className="text-gray-400 text-sm">Step {currentStep} of 5</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-8 mb-8 border border-gray-700">
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
              onBack={() => setLocation("/profile-gateway")}
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
        </div>
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
              <FormLabel className="text-gray-400">First Name *</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-firstName" className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" />
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
              <FormLabel className="text-gray-400">Last Name *</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-lastName" className="bg-gray-800 border-gray-700 text-white placeholder-gray-500" />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-6">
          <button type="button" onClick={onBack} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="submit" data-testid="button-next" className="text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
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
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);
  const [userHasSelected, setUserHasSelected] = useState(false);
  
  const existingDate = defaultValues.dateOfBirth ? new Date(defaultValues.dateOfBirth) : null;
  const defaultYear = existingDate?.getFullYear() ?? 2010;
  const defaultMonth = existingDate?.getMonth() ?? 0;
  const defaultDay = existingDate?.getDate() ?? 1;
  
  const handleOpenPicker = () => {
    if (existingDate) {
      setTempDate(existingDate);
      setUserHasSelected(true);
    } else {
      setTempDate(undefined);
      setUserHasSelected(false);
    }
    setShowPicker(true);
  };
  
  const handleDateChange = (date: Date) => {
    setTempDate(date);
    setUserHasSelected(true);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-400">Date of Birth *</FormLabel>
              <FormControl>
                <button
                  type="button"
                  onClick={handleOpenPicker}
                  data-testid="input-dateOfBirth"
                  className="w-full h-12 px-4 bg-gray-800 border border-gray-700 text-white rounded-md flex items-center justify-between hover:bg-gray-700 transition-colors"
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
                  <div className="py-4 flex justify-center date-wheel-picker-dark">
                    <DateScrollPicker
                      key={showPicker ? 'open' : 'closed'}
                      defaultYear={defaultYear}
                      defaultMonth={defaultMonth}
                      defaultDay={defaultDay}
                      startYear={2000}
                      endYear={new Date().getFullYear()}
                      highlightOverlayStyle={{ backgroundColor: 'rgba(220, 38, 38, 0.3)', color: '#dc2626' }}
                      onDateChange={handleDateChange}
                    />
                  </div>
                  {!userHasSelected && (
                    <p className="text-center text-sm text-gray-400 -mt-2">
                      Scroll to select a date
                    </p>
                  )}
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
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      disabled={!userHasSelected}
                      onClick={() => {
                        if (tempDate && userHasSelected) {
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
          )}
        />
        <div className="flex justify-between pt-6">
          <button type="button" onClick={onBack} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="submit" data-testid="button-next" className="text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
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
              <FormLabel className="text-gray-400">Gender *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-gender" className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male" data-testid="option-male">Male</SelectItem>
                  <SelectItem value="female" data-testid="option-female">Female</SelectItem>
                  <SelectItem value="other" data-testid="option-other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-6">
          <button type="button" onClick={onBack} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="submit" data-testid="button-next" className="text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
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
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-3 text-gray-400">Loading programs...</span>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No programs available at this time.</p>
        <button onClick={onBack} className="mt-4 text-gray-400 hover:text-white" data-testid="button-back">
          <ChevronLeft className="w-6 h-6 inline mr-2" />
          Back
        </button>
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
              <FormLabel className="text-gray-400">Select a Program *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-3"
                  data-testid="radiogroup-packages"
                >
                  {Object.entries(programsByCategory).map(([category, categoryPrograms]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-gray-400 text-sm mt-4">
                        {category}
                      </h3>
                      {categoryPrograms.map((program) => (
                        <div
                          key={program.id}
                          className="flex items-center space-x-3 border border-gray-700 rounded-lg p-4 bg-gray-800/50 hover:bg-gray-700/50 transition"
                          data-testid={`package-option-${program.id}`}
                        >
                          <RadioGroupItem value={program.id} id={program.id} data-testid={`radio-${program.id}`} />
                          <Label
                            htmlFor={program.id}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-white" data-testid={`text-program-name-${program.id}`}>
                                  {program.name}
                                </p>
                                {program.description && (
                                  <p className="text-sm text-gray-400 mt-1">
                                    {program.description}
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {(program as any).type && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900 text-blue-300">
                                      {(program as any).type}
                                    </span>
                                  )}
                                  {(program as any).billingModel && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                                      {(program as any).billingModel}
                                    </span>
                                  )}
                                  {(program as any).type === "Subscription" && (program as any).billingCycle && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-900 text-green-300">
                                      {(program as any).billingCycle}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {program.price && (
                                <div className="text-right ml-4">
                                  <p className="font-bold text-red-400" data-testid={`text-program-price-${program.id}`}>
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
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-6">
          <button type="button" onClick={onBack} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button type="submit" data-testid="button-next" className="text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
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
        <h3 className="text-lg font-semibold mb-4 text-white">Payment Summary</h3>
        
        {/* Player Information */}
        <div className="border border-gray-700 rounded-lg p-4 mb-4 bg-gray-800/50">
          <h4 className="font-medium text-gray-300 mb-2">Player Information</h4>
          <div className="space-y-1 text-sm">
            <p data-testid="text-player-name">
              <span className="text-gray-400">Name:</span>{" "}
              <span className="font-medium text-white">{playerData.firstName} {playerData.lastName}</span>
            </p>
            <p data-testid="text-player-dob">
              <span className="text-gray-400">Date of Birth:</span>{" "}
              <span className="font-medium text-white">{playerData.dateOfBirth}</span>
            </p>
            <p data-testid="text-player-gender">
              <span className="text-gray-400">Gender:</span>{" "}
              <span className="font-medium text-white capitalize">{playerData.gender}</span>
            </p>
          </div>
        </div>

        {/* Package Information */}
        {selectedProgram && (
          <div className="border border-red-900 rounded-lg p-4 bg-red-950/30">
            <h4 className="font-medium text-gray-300 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Selected Package
            </h4>
            <div className="space-y-1">
              <p className="font-semibold text-white" data-testid="text-selected-program-name">
                {selectedProgram.name}
              </p>
              {selectedProgram.description && (
                <p className="text-sm text-gray-400">{selectedProgram.description}</p>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-red-900">
                <span className="text-gray-300 font-medium">Total Amount:</span>
                <span className="text-2xl font-bold text-red-400" data-testid="text-total-amount">
                  ${selectedProgram.price ? (selectedProgram.price / 100).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Notice */}
        <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>Note:</strong> You will be redirected to a secure payment page to complete your transaction.
            The player will be added to your account after successful payment.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button type="button" onClick={onBack} disabled={isSubmitting} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors disabled:opacity-50">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={onSubmit} disabled={isSubmitting} data-testid="button-proceed-payment" className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Proceed to Payment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
