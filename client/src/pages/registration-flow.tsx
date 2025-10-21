import { useState } from "react";
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
import { ChevronLeft, ChevronRight, UserPlus, Users, Package, Check } from "lucide-react";

// Form schemas for each step
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
    registrationType?: "myself" | "my_child";
    parentInfo?: ParentInfo;
    players: Player[];
    packageId?: string;
    password?: string;
  }>({
    players: [],
  });

  // Fetch available programs/packages
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const totalSteps = registrationData.registrationType === "myself" ? 4 : 5;

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
        description: "A verification link has been sent to your email. Please verify to continue.",
      });
      setCurrentStep(totalSteps + 1); // Move to verification step
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
            {currentStep === 1 && "Who are you registering for?"}
            {currentStep === 2 && registrationData.registrationType === "myself" && "Your Information"}
            {currentStep === 2 && registrationData.registrationType === "my_child" && "Parent/Guardian Information"}
            {currentStep === 3 && registrationData.registrationType === "my_child" && "Player Information"}
            {(currentStep === 3 && registrationData.registrationType === "myself") ||
             (currentStep === 4 && registrationData.registrationType === "my_child") && "Select Program/Package"}
            {(currentStep === 4 && registrationData.registrationType === "myself") ||
             (currentStep === 5 && registrationData.registrationType === "my_child") && "Create Account"}
            {currentStep > totalSteps && "Email Verification"}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Step 1: Registration Intent */}
          {currentStep === 1 && (
            <RegistrationIntentStep
              onSubmit={(data) => {
                setRegistrationData({ ...registrationData, registrationType: data.registrationType });
                handleNext();
              }}
            />
          )}

          {/* Step 2: User Information */}
          {currentStep === 2 && registrationData.registrationType === "myself" && (
            <PlayerInfoStep
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

          {currentStep === 2 && registrationData.registrationType === "my_child" && (
            <ParentInfoStep
              onSubmit={(data) => {
                setRegistrationData({ ...registrationData, parentInfo: data });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {/* Step 3: Player Information (for "my_child" flow) */}
          {currentStep === 3 && registrationData.registrationType === "my_child" && (
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
          {((currentStep === 3 && registrationData.registrationType === "myself") ||
            (currentStep === 4 && registrationData.registrationType === "my_child")) && (
            <PackageSelectionStep
              programs={programs}
              onSubmit={(data) => {
                setRegistrationData({ ...registrationData, packageId: data.packageId });
                handleNext();
              }}
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
        </CardContent>
      </Card>
    </div>
  );
}

// Step Components

function RegistrationIntentStep({ onSubmit }: { onSubmit: (data: RegistrationIntent) => void }) {
  const form = useForm<RegistrationIntent>({
    resolver: zodResolver(registrationIntentSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
      </form>
    </Form>
  );
}

function ParentInfoStep({
  onSubmit,
  onBack,
}: {
  onSubmit: (data: ParentInfo) => void;
  onBack: () => void;
}) {
  const form = useForm<ParentInfo>({
    resolver: zodResolver(parentInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
                <Input {...field} type="email" data-testid="input-parent-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input {...field} type="tel" data-testid="input-parent-phone" />
              </FormControl>
              <FormMessage />
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

function PlayerInfoStep({
  onSubmit,
  onBack,
  isSelf = false,
}: {
  onSubmit: (data: PlayerInfo) => void;
  onBack: () => void;
  isSelf?: boolean;
}) {
  const form = useForm<PlayerInfo>({
    resolver: zodResolver(playerInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-gender">
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
  const [isAddingPlayer, setIsAddingPlayer] = useState(players.length === 0);
  const form = useForm<PlayerInfo>({
    resolver: zodResolver(playerInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
    },
  });

  const handleAddPlayer = (data: PlayerInfo) => {
    const newPlayer: Player = {
      ...data,
      id: `player-${Date.now()}`,
    };
    onUpdate([...players, newPlayer]);
    setIsAddingPlayer(false);
    form.reset();
  };

  const handleRemovePlayer = (id: string) => {
    onUpdate(players.filter((p) => p.id !== id));
  };

  if (isAddingPlayer) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAddPlayer)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="select-gender">
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
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              onClick={() => {
                if (players.length > 0) {
                  setIsAddingPlayer(false);
                } else {
                  onBack();
                }
              }}
              variant="outline"
              data-testid="button-cancel-add-player"
            >
              {players.length > 0 ? "Cancel" : "Back"}
            </Button>
            <Button type="submit" data-testid="button-save-player">
              Add Player
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {players.map((player) => (
          <Card key={player.id} data-testid={`player-card-${player.id}`}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{player.firstName} {player.lastName}</h4>
                <p className="text-sm text-gray-600">
                  {player.dateOfBirth && `DOB: ${player.dateOfBirth}`}
                  {player.gender && ` | ${player.gender}`}
                </p>
              </div>
              <Button
                onClick={() => handleRemovePlayer(player.id)}
                variant="ghost"
                size="sm"
                data-testid={`button-remove-player-${player.id}`}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={() => setIsAddingPlayer(true)}
        variant="outline"
        className="w-full"
        data-testid="button-add-another-player"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Add Another Player
      </Button>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" data-testid="button-back">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
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
  onSubmit,
  onBack,
}: {
  programs: any[];
  onSubmit: (data: PackageSelection) => void;
  onBack: () => void;
}) {
  const form = useForm<PackageSelection>({
    resolver: zodResolver(packageSelectionSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="packageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select a Program/Package *</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {programs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No programs available at this time.</p>
                  ) : (
                    programs.map((program) => (
                      <button
                        key={program.id}
                        type="button"
                        onClick={() => field.onChange(program.id)}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                          field.value === program.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                        data-testid={`package-option-${program.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{program.name}</h3>
                            {program.description && (
                              <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                            )}
                          </div>
                          {program.price && (
                            <div className="text-right">
                              <p className="font-bold text-lg">${(program.price / 100).toFixed(2)}</p>
                              {program.pricingModel && (
                                <p className="text-xs text-gray-500">/{program.pricingModel}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
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
