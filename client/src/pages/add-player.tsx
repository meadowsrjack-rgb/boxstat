import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, UserPlus } from "lucide-react";

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

type PlayerName = z.infer<typeof playerNameSchema>;
type DOB = z.infer<typeof dobSchema>;
type Gender = z.infer<typeof genderSchema>;

export default function AddPlayer() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [playerData, setPlayerData] = useState<{
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  }>({});

  const addPlayerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/account/players", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      
      toast({
        title: "Player Added!",
        description: "Player has been successfully added to your account.",
      });
      setTimeout(() => {
        window.location.href = "/unified-account";
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

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const progress = (currentStep / 3) * 100;

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
              Step {currentStep} of 3
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

            {/* Step 3: Gender & Submit */}
            {currentStep === 3 && (
              <GenderStep
                defaultValues={{ gender: playerData.gender || "" }}
                onSubmit={(data) => {
                  const finalData = { ...playerData, ...data };
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
  isSubmitting,
}: {
  defaultValues: { gender?: string };
  onSubmit: (data: Gender) => void;
  onBack: () => void;
  isSubmitting?: boolean;
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
          <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting} data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button type="submit" disabled={isSubmitting} data-testid="button-add-player">
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Player
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
