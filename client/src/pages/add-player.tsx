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
import { ChevronLeft, ChevronRight, UserPlus, CreditCard, DollarSign, Loader2, Calendar, FileText, ExternalLink, AlertTriangle, Package, Check } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

const aauMembershipSchema = z.object({
  aauMembershipId: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
});

const concussionWaiverSchema = z.object({
  concussionWaiverAcknowledged: z.boolean().refine(val => val === true, {
    message: "You must acknowledge the concussion waiver to continue",
  }),
});

const clubAgreementSchema = z.object({
  clubAgreementAcknowledged: z.boolean().refine(val => val === true, {
    message: "You must review and accept the club agreement to continue",
  }),
});

const packageSchema = z.object({
  packageId: z.string().min(1, "Please select a package"),
});

type PlayerName = z.infer<typeof playerNameSchema>;
type DOB = z.infer<typeof dobSchema>;
type Gender = z.infer<typeof genderSchema>;
type AAUMembership = z.infer<typeof aauMembershipSchema>;
type ConcussionWaiver = z.infer<typeof concussionWaiverSchema>;
type ClubAgreement = z.infer<typeof clubAgreementSchema>;
type Package = z.infer<typeof packageSchema>;

type Program = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  pricingModel?: string;
  requireAAUMembership?: boolean;
  requireConcussionWaiver?: boolean;
  requireClubAgreement?: boolean;
  requiredWaivers?: string[];
};

type Waiver = {
  id: string;
  name: string;
  title: string;
  content: string;
  requiresScroll?: boolean;
  requiresCheckbox?: boolean;
  isActive?: boolean;
};

export default function AddPlayer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [playerData, setPlayerData] = useState<{
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    aauMembershipId?: string;
    postalCode?: string;
    concussionWaiverAcknowledged?: boolean;
    clubAgreementAcknowledged?: boolean;
    packageId?: string;
    customWaiverAcknowledgments?: Record<string, boolean>;
  }>({});

  // Fetch programs for step 4 (Package Selection)
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: currentStep >= 4,
  });

  // Fetch custom waivers - always enabled so data is ready for step flow
  const { data: waivers = [], isLoading: waiversLoading } = useQuery<Waiver[]>({
    queryKey: ["/api/waivers"],
  });

  // Fetch all store items (goods products) for add-ons
  const { data: storeItems = [] } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    select: (data) => data.filter((p: any) => p.productCategory === 'goods'),
  });

  // Get selected program for add-ons lookup
  const selectedProgram = programs.find(p => p.id === playerData.packageId);

  // Fetch suggested add-ons for the selected program
  const { data: suggestedAddOns = [] } = useQuery<{ productId: string; displayOrder: number }[]>({
    queryKey: ['/api/programs', playerData.packageId, 'suggested-add-ons'],
    enabled: !!playerData.packageId,
  });

  // Determine if we have suggested add-ons
  const suggestedAddOnIds = suggestedAddOns.map(a => a.productId);
  const hasSuggestedAddOns = suggestedAddOnIds.length > 0 && storeItems.length > 0;

  // Sort store items: suggested first (by displayOrder), then others
  const sortedStoreItems = [...storeItems].sort((a, b) => {
    const aIsSuggested = suggestedAddOnIds.includes(a.id);
    const bIsSuggested = suggestedAddOnIds.includes(b.id);
    
    if (aIsSuggested && !bIsSuggested) return -1;
    if (!aIsSuggested && bIsSuggested) return 1;
    
    if (aIsSuggested && bIsSuggested) {
      const aOrder = suggestedAddOns.find(s => s.productId === a.id)?.displayOrder ?? 999;
      const bOrder = suggestedAddOns.find(s => s.productId === b.id)?.displayOrder ?? 999;
      return aOrder - bOrder;
    }
    
    return 0;
  });

  // Filter programs to exclude goods (store items) - only show enrollable programs
  const enrollablePrograms = programs.filter((p: any) => p.productCategory !== 'goods');

  // Group programs by category (excluding goods/store items)
  const programsByCategory = enrollablePrograms.reduce((acc, program) => {
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

  // Calculate dynamic step flow based on selected program's requirements
  // Steps 1-4 are always fixed: Name, DOB, Gender, Package Selection
  // Steps 5+ are dynamic based on package requirements
  const getStepFlow = () => {
    const baseSteps = ["name", "dob", "gender", "package"];
    const dynamicSteps: string[] = [];

    if (selectedProgram) {
      // Add add-ons step if there are suggested add-ons
      if (hasSuggestedAddOns) {
        dynamicSteps.push("addons");
      }
      
      if (selectedProgram.requireAAUMembership) {
        dynamicSteps.push("aau");
      }
      if (selectedProgram.requireConcussionWaiver) {
        dynamicSteps.push("concussion");
      }
      if (selectedProgram.requireClubAgreement) {
        dynamicSteps.push("club");
      }
      // Add custom waivers
      const customWaiverIds = selectedProgram.requiredWaivers || [];
      customWaiverIds.forEach(waiverId => {
        dynamicSteps.push(`custom_${waiverId}`);
      });
    }

    return [...baseSteps, ...dynamicSteps, "payment"];
  };

  const stepFlow = getStepFlow();
  const totalSteps = stepFlow.length;
  const currentStepName = stepFlow[currentStep - 1] || "name";

  // Get the custom waivers that are required for the selected program
  const requiredCustomWaivers = selectedProgram?.requiredWaivers
    ? waivers.filter(w => selectedProgram.requiredWaivers?.includes(w.id) && w.isActive)
    : [];

  // Get current custom waiver if on a custom waiver step
  const currentCustomWaiver = currentStepName.startsWith("custom_")
    ? waivers.find(w => w.id === currentStepName.replace("custom_", ""))
    : null;

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="scrollable-page bg-gradient-to-b from-gray-900 to-black safe-bottom py-8 px-4 min-h-screen-safe">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <UserPlus className="w-8 h-8" />
              Add Player
            </h1>
            <span className="text-gray-400 text-sm">Step {currentStep} of {totalSteps}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-8 mb-8 border border-gray-700">
          {/* Player Name */}
          {currentStepName === "name" && (
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

          {/* Date of Birth */}
          {currentStepName === "dob" && (
            <DOBStep
              defaultValues={{ dateOfBirth: playerData.dateOfBirth || "" }}
              onSubmit={(data) => {
                setPlayerData({ ...playerData, ...data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Gender */}
          {currentStepName === "gender" && (
            <GenderStep
              defaultValues={{ gender: playerData.gender || "" }}
              onSubmit={(data) => {
                setPlayerData({ ...playerData, ...data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Package Selection */}
          {currentStepName === "package" && (
            <PackageSelectionStep
              defaultValues={{ packageId: playerData.packageId || "" }}
              programs={enrollablePrograms}
              programsByCategory={programsByCategory}
              isLoading={programsLoading}
              onSubmit={(data) => {
                setPlayerData({ ...playerData, ...data });
                // Clear any previously selected add-ons when changing program
                setSelectedAddOns([]);
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Add-ons Selection (conditional - only when program has suggested add-ons) */}
          {currentStepName === "addons" && (
            <AddOnsStep
              storeItems={sortedStoreItems}
              suggestedAddOnIds={suggestedAddOnIds}
              selectedAddOns={selectedAddOns}
              onToggleAddOn={(productId: string) => {
                setSelectedAddOns(prev =>
                  prev.includes(productId)
                    ? prev.filter(id => id !== productId)
                    : [...prev, productId]
                );
              }}
              onSubmit={handleNext}
              onBack={handleBack}
            />
          )}

          {/* AAU Membership (conditional) */}
          {currentStepName === "aau" && (
            <AAUMembershipStep
              defaultValues={{
                aauMembershipId: playerData.aauMembershipId || "",
                postalCode: playerData.postalCode || "",
              }}
              onSubmit={(data) => {
                setPlayerData({ ...playerData, ...data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* HEADSUP Concussion Waiver (conditional) */}
          {currentStepName === "concussion" && (
            <ConcussionWaiverStep
              defaultValues={{
                concussionWaiverAcknowledged: playerData.concussionWaiverAcknowledged || false,
              }}
              onSubmit={(data) => {
                setPlayerData({ ...playerData, ...data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Club Agreement (conditional) */}
          {currentStepName === "club" && (
            <ClubAgreementStep
              defaultValues={{
                clubAgreementAcknowledged: playerData.clubAgreementAcknowledged || false,
              }}
              onSubmit={(data) => {
                setPlayerData({ ...playerData, ...data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Custom Waivers (conditional) */}
          {currentStepName.startsWith("custom_") && (
            waiversLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="ml-3 text-gray-400">Loading waiver...</span>
              </div>
            ) : currentCustomWaiver ? (
              <CustomWaiverStep
                waiver={currentCustomWaiver}
                defaultValue={playerData.customWaiverAcknowledgments?.[currentCustomWaiver.id] || false}
                onSubmit={(acknowledged) => {
                  setPlayerData({
                    ...playerData,
                    customWaiverAcknowledgments: {
                      ...playerData.customWaiverAcknowledgments,
                      [currentCustomWaiver.id]: acknowledged,
                    },
                  });
                  handleNext();
                }}
                onBack={handleBack}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Waiver not found. Please go back and try again.</p>
                <button onClick={handleBack} className="mt-4 text-gray-400 hover:text-white" data-testid="button-back">
                  <ChevronLeft className="w-6 h-6 inline mr-2" />
                  Back
                </button>
              </div>
            )
          )}

          {/* Payment Summary */}
          {currentStepName === "payment" && (
            <PaymentSummaryStep
              playerData={playerData}
              selectedProgram={selectedProgram}
              selectedAddOns={selectedAddOns}
              storeItems={sortedStoreItems}
              onSubmit={() => {
                const finalData = { 
                  ...playerData,
                  addOnIds: selectedAddOns.length > 0 ? selectedAddOns : undefined,
                };
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
                      startYear={1950}
                      endYear={new Date().getFullYear()}
                      dateTimeFormatOptions={{ month: 'short' }}
                      highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
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
                      className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
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

function AAUMembershipStep({
  defaultValues,
  onSubmit,
  onBack,
}: {
  defaultValues: AAUMembership;
  onSubmit: (data: AAUMembership) => void;
  onBack: () => void;
}) {
  const form = useForm<AAUMembership>({
    resolver: zodResolver(aauMembershipSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="text-blue-400 font-semibold mb-2">AAU Membership ID Information (Optional)</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            If you have an AAU membership, you can add it here. AAU memberships must be renewed annually. 
            If you are uncertain of the current expiration date of your membership,{" "}
            <a 
              href="https://aausports.org/membership-lookup/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              click here to look it up
            </a>. 
            To obtain a number for new players or renew a membership,{" "}
            <a 
              href="https://aausports.org/join-aau-2025/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              click here
            </a>.
          </p>
        </div>

        <FormField
          control={form.control}
          name="aauMembershipId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-400">AAU Membership ID</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  data-testid="input-aauMembershipId" 
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  placeholder="(Optional) Enter AAU Membership ID"
                />
              </FormControl>
              <FormMessage className="text-red-400" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-400">Postal Code</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  data-testid="input-postalCode" 
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  placeholder="(Optional) Enter postal code"
                />
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

function ConcussionWaiverStep({
  defaultValues,
  onSubmit,
  onBack,
}: {
  defaultValues: { concussionWaiverAcknowledged: boolean };
  onSubmit: (data: ConcussionWaiver) => void;
  onBack: () => void;
}) {
  const form = useForm<ConcussionWaiver>({
    resolver: zodResolver(concussionWaiverSchema),
    defaultValues: { concussionWaiverAcknowledged: defaultValues.concussionWaiverAcknowledged },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
          <h2 className="text-2xl font-bold text-white">HEADSUP Concussion Waiver</h2>
        </div>
        
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
          <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Required Reading
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            Before registering your athlete, you must review the CDC's HEADSUP Concussion information. 
            Please read the following documents carefully:
          </p>
          
          <div className="space-y-3">
            <a 
              href="https://cdn2.sportngin.com/attachments/document/2d0e-2478722/Parent_Athlete_Info_Sheet_2.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors group"
              data-testid="link-parent-info-sheet"
            >
              <FileText className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <span className="text-white font-medium group-hover:text-red-400 transition-colors">Parent/Athlete Information Sheet</span>
                <p className="text-gray-400 text-xs">Learn about concussion signs, symptoms, and what to do if one occurs</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
            
            <a 
              href="https://cdn3.sportngin.com/attachments/document/3830-2478723/Fact_Sheet_For_Athletes_2.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-lg p-3 transition-colors group"
              data-testid="link-athlete-fact-sheet"
            >
              <FileText className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <span className="text-white font-medium group-hover:text-red-400 transition-colors">Fact Sheet For Athletes</span>
                <p className="text-gray-400 text-xs">Information specifically for athletes about recognizing concussions</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Key Points to Remember:</h4>
          <ul className="text-gray-300 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              A concussion is a brain injury that affects how the brain works
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              All concussions are serious and can occur in any sport
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Athletes should report concussion symptoms immediately
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 mt-1">•</span>
              Athletes must be cleared by a healthcare provider before returning to play
            </li>
          </ul>
        </div>

        <FormField
          control={form.control}
          name="concussionWaiverAcknowledged"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-700 p-4 bg-gray-800/30">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-concussion-waiver"
                  className="mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-white font-medium">
                  I acknowledge that I have read and understand the HEADSUP Concussion information
                </FormLabel>
                <p className="text-gray-400 text-sm">
                  By checking this box, I confirm that I have reviewed the concussion awareness materials 
                  and understand the risks associated with sports-related head injuries.
                </p>
                <FormMessage className="text-red-400" />
              </div>
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

function ClubAgreementStep({
  defaultValues,
  onSubmit,
  onBack,
}: {
  defaultValues: { clubAgreementAcknowledged: boolean };
  onSubmit: (data: ClubAgreement) => void;
  onBack: () => void;
}) {
  const form = useForm<ClubAgreement>({
    resolver: zodResolver(clubAgreementSchema),
    defaultValues: { clubAgreementAcknowledged: defaultValues.clubAgreementAcknowledged },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-red-500" />
          <h2 className="text-2xl font-bold text-white">Club Team Agreement</h2>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
          <p className="text-gray-300 text-sm">
            Please review the UYP Club Team Experience agreement carefully before proceeding. 
            This agreement outlines the expectations and commitments for parents, players, and coaches.
          </p>
        </div>
        
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto text-sm text-gray-300 space-y-4">
          <div className="text-center border-b border-gray-700 pb-4 mb-4">
            <h3 className="text-white font-bold text-lg">Welcome to Up Your Performance Basketball Academy</h3>
            <p className="text-gray-400 mt-2">UYP Youth Club Team Experience</p>
          </div>
          
          <div>
            <h4 className="text-red-400 font-semibold mb-2">ABOUT US</h4>
            <p className="leading-relaxed">
              UYP Basketball is dedicated to provide each individual in our program the highest quality 
              basketball training and club team experience, through professional coaches and an organized 
              infrastructure. We hope to inspire and empower our student athletes to excel and be leaders.
            </p>
            <p className="mt-2 leading-relaxed">
              UYP Youth is the year-round club experience empowered by Up Your Performance Basketball Academy. 
              Our overall mission is to provide a platform for student athletes to showcase their talents in 
              a competitive environment that will prepare each athlete for High School.
            </p>
          </div>

          <div>
            <h4 className="text-red-400 font-semibold mb-2">CLUB TEAM MISSION</h4>
            <ul className="space-y-1 pl-4">
              <li>1. Cultivate individual skills for readiness at the next playing level</li>
              <li>2. Impart team and individual concepts to deepen comprehension of the game</li>
              <li>3. Foster team chemistry to enable cohesive unit play</li>
              <li>4. Emphasize playing hard, smart, and together</li>
              <li>5. Elevate each player's confidence to the utmost level achievable</li>
            </ul>
          </div>

          <div>
            <h4 className="text-red-400 font-semibold mb-2">COACHING STAFF</h4>
            <p className="leading-relaxed">
              We've been integral in securing college scholarships for countless student-athletes, 
              and our team comprises former collegiate and professional players boasting a collective 
              coaching experience exceeding 30 years.
            </p>
          </div>

          <div>
            <h4 className="text-red-400 font-semibold mb-2">PRACTICE / TRAINING SCHEDULE</h4>
            <ul className="space-y-1 pl-4">
              <li>• All teams practice weekly for 90 minutes each session</li>
              <li>• Players are encouraged to participate in the weekly Skills Clinic</li>
              <li>• Small group, semi-private, and private training classes are offered</li>
            </ul>
          </div>

          <div>
            <h4 className="text-red-400 font-semibold mb-2">TOURNAMENT SCHEDULE</h4>
            <ul className="space-y-1 pl-4">
              <li>• Tournaments take place in the Orange County area</li>
              <li>• Teams engage in approximately two tournaments per month</li>
              <li>• Exact game times come out the Thursday prior to the weekend we play</li>
            </ul>
          </div>

          <div>
            <h4 className="text-red-400 font-semibold mb-2">UNIFORMS / GEAR</h4>
            <ul className="space-y-1 pl-4">
              <li>• Players must wear the practice jersey to all practices and full uniform to all games</li>
              <li>• Returning players after one season won't need to purchase additional gear</li>
            </ul>
          </div>

          <div>
            <h4 className="text-red-400 font-semibold mb-2">FEES</h4>
            <ul className="space-y-1 pl-4">
              <li>• Joining the club program requires a three-month commitment</li>
              <li>• Payment must be made before the first practice to secure a spot</li>
              <li>• Birth certificates and report cards must be submitted at the first practice</li>
            </ul>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-bold mb-2">I. MISSION</h4>
            <p className="leading-relaxed">
              The club team experience aims to develop student-athletes for high school-level play. 
              The coaching staff focuses on building confidence, work ethic, and character, emphasizing 
              experiences and development over wins and losses.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-2">II. PARENT EXPECTATIONS AND COMMITMENT</h4>
            <p className="leading-relaxed mb-2">
              <span className="text-yellow-400 font-medium">Support:</span> Parental support and involvement is essential 
              to team success. Parents must do their best to make sure the player attends all club and team functions.
            </p>
            <p className="leading-relaxed mb-2">
              <span className="text-yellow-400 font-medium">Sideline Coaching:</span> We will not allow any coaching by 
              parents on the sideline. Parents are asked to NOT engage in negative conversations with referees or 
              parents of the opposing team.
            </p>
            <p className="leading-relaxed">
              <span className="text-yellow-400 font-medium">Instruction:</span> Players will only receive one set of 
              instructions before, during, and after practices or games. The team's head and/or assistant coach will 
              be the only voice at all games and practices.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-2">III. COACH EXPECTATIONS AND COMMITMENT</h4>
            <p className="leading-relaxed">
              Coaches commit to professionalism, timely preparedness, positive feedback, transparent communication, 
              and fostering player development.
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-2">IV. PLAYER EXPECTATIONS AND COMMITMENT</h4>
            <ul className="space-y-1 pl-4">
              <li>• Accepting a roster spot is a three-month commitment</li>
              <li>• Attend all team practices, tournaments and special events</li>
              <li>• Wear full uniform to all games</li>
              <li>• Players are encouraged to attend our weekly skills clinic</li>
              <li>• Notify your coach if you are going to be absent or late to any practice or game</li>
              <li>• Playing time will be based upon the player's performance, subject to the coach's discretion</li>
              <li>• Sportsmanship and a positive attitude are expected at all times</li>
              <li>• No offensive language. No fighting. No exceptions!</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-2">V. PAYMENT POLICIES</h4>
            <p className="leading-relaxed">
              We have a monthly fee or a pay-in-full option (three months), and parents are expected to make 
              payments on time. If you opt for the three-month option, you are expected to commit to the three months. 
              If the 3-month or 6-month upfront payment has been cancelled or withdrawn from the team, you will be 
              charged the full regular monthly rate. In case of an injury or any other medical condition, you will 
              have a credit applied to use at your return.
            </p>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-bold mb-2">ACKNOWLEDGMENT</h4>
            <p className="leading-relaxed">
              All parties agree to uphold the outlined standards and expectations of the UYP Club Program. 
              Players retain the right to exit after the three-month season, with automatic renewal upon team placement. 
              Signatures below indicate acknowledgment and agreement.
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="clubAgreementAcknowledged"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-700 p-4 bg-gray-800/30">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-club-agreement"
                  className="mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-white font-medium">
                  I have reviewed and agree to abide by the rules, terms, and policies
                </FormLabel>
                <p className="text-gray-400 text-sm">
                  As the parent or legal guardian of the participant, I confirm that I have reviewed and agree 
                  to abide by the rules, terms, cancellation and refund policies set forth in this registration contract.
                </p>
                <FormMessage className="text-red-400" />
              </div>
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

// Custom Waiver Step - dynamically renders custom waivers from admin
function CustomWaiverStep({
  waiver,
  defaultValue,
  onSubmit,
  onBack,
}: {
  waiver: Waiver;
  defaultValue: boolean;
  onSubmit: (acknowledged: boolean) => void;
  onBack: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(defaultValue);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(!waiver.requiresScroll);

  const handleScroll = (e: any) => {
    const target = e.target;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (waiver.requiresCheckbox && !acknowledged) {
      return;
    }
    if (waiver.requiresScroll && !hasScrolledToBottom) {
      return;
    }
    onSubmit(acknowledged);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-8 h-8 text-red-500" />
        <h2 className="text-2xl font-bold text-white">{waiver.title}</h2>
      </div>
      
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
        <p className="text-gray-300 text-sm">
          Please review the following {waiver.name.toLowerCase()} carefully before proceeding.
        </p>
      </div>
      
      <div 
        className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-80 overflow-y-auto text-sm text-gray-300 space-y-4"
        onScroll={handleScroll}
        data-testid="custom-waiver-content"
      >
        <div className="whitespace-pre-wrap leading-relaxed">
          {waiver.content}
        </div>
      </div>

      {waiver.requiresScroll && !hasScrolledToBottom && (
        <p className="text-yellow-400 text-sm text-center">
          Please scroll to the bottom to continue
        </p>
      )}

      {waiver.requiresCheckbox && (
        <div className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-700 p-4 bg-gray-800/30">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(checked) => setAcknowledged(checked === true)}
            disabled={waiver.requiresScroll && !hasScrolledToBottom}
            data-testid="checkbox-custom-waiver"
            className="mt-1"
          />
          <div className="space-y-1 leading-none">
            <label className="text-white font-medium">
              I have reviewed and acknowledge this {waiver.name.toLowerCase()}
            </label>
            <p className="text-gray-400 text-sm">
              By checking this box, I confirm that I have read and understood the above.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <button type="button" onClick={onBack} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          type="submit" 
          data-testid="button-next" 
          className={`transition-colors ${
            (waiver.requiresCheckbox && !acknowledged) || (waiver.requiresScroll && !hasScrolledToBottom)
              ? "text-gray-600 cursor-not-allowed"
              : "text-gray-400 hover:text-white"
          }`}
          disabled={(waiver.requiresCheckbox && !acknowledged) || (waiver.requiresScroll && !hasScrolledToBottom)}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </form>
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

function AddOnsStep({
  storeItems,
  suggestedAddOnIds,
  selectedAddOns,
  onToggleAddOn,
  onSubmit,
  onBack,
}: {
  storeItems: Program[];
  suggestedAddOnIds: string[];
  selectedAddOns: string[];
  onToggleAddOn: (productId: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Recommended Add-ons
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Enhance your registration with these recommended items
        </p>

        <div className="space-y-2">
          {storeItems.map((item) => {
            const isSuggested = suggestedAddOnIds.includes(item.id);
            const isSelected = selectedAddOns.includes(item.id);
            
            return (
              <div
                key={item.id}
                onClick={() => onToggleAddOn(item.id)}
                className={`
                  relative cursor-pointer rounded-lg border p-4 transition-all
                  ${isSelected 
                    ? 'border-red-600 bg-red-950/30' 
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }
                `}
                data-testid={`addon-item-${item.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded border flex items-center justify-center
                      ${isSelected 
                        ? 'bg-red-600 border-red-600' 
                        : 'border-gray-500'
                      }
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{item.name}</span>
                        {isSuggested && (
                          <span className="px-2 py-0.5 text-xs rounded bg-purple-600/30 text-purple-300 font-medium">
                            Suggested
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-400">
                      ${item.price ? (item.price / 100).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button type="button" onClick={onBack} data-testid="button-back" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          type="button" 
          onClick={onSubmit} 
          data-testid="button-next" 
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {selectedAddOns.length > 0 ? 'Continue' : 'Skip Add-ons'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PaymentSummaryStep({
  playerData,
  selectedProgram,
  selectedAddOns,
  storeItems,
  onSubmit,
  onBack,
  isSubmitting,
}: {
  playerData: any;
  selectedProgram?: Program;
  selectedAddOns: string[];
  storeItems: Program[];
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}) {
  // Calculate total including add-ons
  const programPrice = selectedProgram?.price || 0;
  const addOnsTotal = selectedAddOns.reduce((sum, id) => {
    const item = storeItems.find(s => s.id === id);
    return sum + (item?.price || 0);
  }, 0);
  const totalPrice = programPrice + addOnsTotal;
  const selectedAddOnItems = storeItems.filter(s => selectedAddOns.includes(s.id));
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
              <div className="flex justify-between items-center">
                <p className="font-semibold text-white" data-testid="text-selected-program-name">
                  {selectedProgram.name}
                </p>
                <span className="text-red-400 font-medium">
                  ${(programPrice / 100).toFixed(2)}
                </span>
              </div>
              {selectedProgram.description && (
                <p className="text-sm text-gray-400">{selectedProgram.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Selected Add-ons */}
        {selectedAddOnItems.length > 0 && (
          <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 mt-4">
            <h4 className="font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Add-ons
            </h4>
            <div className="space-y-2">
              {selectedAddOnItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-white">{item.name}</span>
                  <span className="text-gray-400">${(item.price ? item.price / 100 : 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        {selectedProgram && (
          <div className="border border-red-900 rounded-lg p-4 bg-red-950/50 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Total Amount:</span>
              <span className="text-2xl font-bold text-red-400" data-testid="text-total-amount">
                ${(totalPrice / 100).toFixed(2)}
              </span>
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
