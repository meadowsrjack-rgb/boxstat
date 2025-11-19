import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ArrowLeft, Link as LinkIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UYP_RED = "#d82428";

const playerProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  jerseyNumber: z.string().min(1, "Jersey number is required"),
  height: z.string().min(1, "Height is required"),
  city: z.string().min(1, "City is required"),
  position: z.string().min(1, "Position is required"),
});

type ProfileForm = z.infer<typeof playerProfileSchema>;

export default function CreateProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimEmail, setClaimEmail] = useState((user as any)?.email || "");
  const [claimData, setClaimData] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false); // Track if profile was verified via Notion

  const form = useForm<ProfileForm>({
    resolver: zodResolver(playerProfileSchema),
    defaultValues: {
      firstName: (user as any)?.firstName || "",
      lastName: (user as any)?.lastName || "",
      phoneNumber: "",
      dateOfBirth: "",
      jerseyNumber: "",
      height: "",
      city: "",
      position: "",
    }
  });

  // Claim account from Notion
  const handleClaimAccount = async () => {
    if (!claimEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email to look up your account.",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);
    try {
      const response = await fetch(`/api/notion/claim-data?email=${encodeURIComponent(claimEmail)}`, {
        credentials: "include"
      });
      const data = await response.json();
      
      if (data.found && data.records && data.records.length > 0) {
        // Get first matching record
        const matchingRecord = data.records[0];
        
        setClaimData(matchingRecord);
        setIsVerified(true); // Mark as verified since email was found in Notion database
        
        // Parse first and last name from fullName
        const nameParts = matchingRecord.fullName.split(' ');
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(' ') || "";
        
        // Prefill form with Notion data
        form.setValue("firstName", firstName);
        form.setValue("lastName", lastName);
        form.setValue("phoneNumber", matchingRecord.phoneNumber || "");
        form.setValue("dateOfBirth", matchingRecord.dob || "");
        form.setValue("jerseyNumber", matchingRecord.jerseyNumber || "");
        
        toast({
          title: "Account Found!",
          description: "We found your player account and pre-filled your information.",
        });
      } else {
        toast({
          title: "No Account Found",
          description: `We couldn't find a player account with email ${claimEmail}. Please fill in your details manually.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error claiming account:", error);
      toast({
        title: "Error",
        description: "Failed to look up your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      // Convert jerseyNumber to number if it exists and is not empty
      const jerseyNum = data.jerseyNumber && data.jerseyNumber.trim() !== "" 
        ? parseInt(data.jerseyNumber, 10) 
        : undefined;

      // Calculate age from date of birth
      let calculatedAge: string | undefined = undefined;
      if (data.dateOfBirth) {
        const birthDate = new Date(data.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        calculatedAge = age.toString();
      }

      // Create user profile using the users endpoint
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: (user as any)?.organizationId || "default-org",
          email: (user as any)?.email || "",
          role: "player",
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth,
          jerseyNumber: jerseyNum,
          position: data.position,
          program: undefined,
          isActive: true,
          verified: isVerified,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create profile");
      }

      const profileData = await response.json();

      return profileData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Profile Created!",
        description: "Your profile has been successfully created.",
      });

      // Redirect based on role
      if (data.role === "player") {
        setLocation("/player-dashboard");
      } else if (data.role === "coach") {
        setLocation("/coach-dashboard");
      } else if (data.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/player-dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    createProfileMutation.mutate(data);
  };

  return (
    <div
      className="min-h-screen-safe text-white safe-bottom p-4"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`,
      }}
    >
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setLocation("/select-profile-type")}
            className="p-2 rounded-md border border-white/15 hover:bg-white/5 transition"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Create Player Profile</h1>
            <p className="text-sm text-white/70">Complete your profile information</p>
          </div>
        </div>

        {/* Profile Form */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">First Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter first name"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            data-testid="input-first-name"
                          />
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
                        <FormLabel className="text-white">Last Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter last name"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter phone number"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          data-testid="input-phone"
                        />
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
                      <FormLabel className="text-white">Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          data-testid="input-dob"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jerseyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Jersey Number</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-jersey">
                              <SelectValue placeholder="Select number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Position</FormLabel>
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-position">
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PG">PG - Point Guard</SelectItem>
                                <SelectItem value="SG">SG - Shooting Guard</SelectItem>
                                <SelectItem value="SF">SF - Small Forward</SelectItem>
                                <SelectItem value="PF">PF - Power Forward</SelectItem>
                                <SelectItem value="C">C - Center</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Height</FormLabel>
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-height">
                                  <SelectValue placeholder="Select height" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {(() => {
                                  const heights = [];
                                  for (let feet = 3; feet <= 7; feet++) {
                                    for (let inches = 0; inches < 12; inches++) {
                                      heights.push(`${feet}'${inches}"`);
                                    }
                                  }
                                  return heights.map((height) => (
                                    <SelectItem key={height} value={height}>
                                      {height}
                                    </SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">City</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="City"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                data-testid="input-city"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                <Button
                  type="submit"
                  disabled={createProfileMutation.isPending}
                  className="w-full"
                  style={{ backgroundColor: UYP_RED }}
                  data-testid="button-create-profile"
                >
                  {createProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    "Create Profile"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
