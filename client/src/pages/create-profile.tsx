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

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  jerseyNumber: z.string().min(1, "Jersey number is required"),
  teamId: z.string().min(1, "Team is required"),
  height: z.string().min(1, "Height is required"),
  city: z.string().min(1, "City is required"),
  position: z.string().min(1, "Position is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function CreateProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(searchParams);
  const profileType = (urlParams.get('type') as "parent" | "player") || "parent";
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimEmail, setClaimEmail] = useState((user as any)?.email || "");
  const [claimData, setClaimData] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false); // Track if profile was verified via Notion

  // Fetch teams for selector
  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; ageGroup: string }>>({
    queryKey: ["/api/teams"],
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: (user as any)?.firstName || "",
      lastName: (user as any)?.lastName || "",
      phoneNumber: "",
      dateOfBirth: "",
      jerseyNumber: "",
      teamId: "",
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
        // Find matching record for the profile type
        const matchingRecord = data.records.find((r: any) => 
          r.personType === profileType
        ) || data.records[0];
        
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
        
        // Set teamId if available
        if (matchingRecord.teamId) {
          form.setValue("teamId", matchingRecord.teamId);
        }
        
        toast({
          title: "Account Found!",
          description: `We found your ${profileType} account and pre-filled your information.`,
        });
      } else {
        toast({
          title: "No Account Found",
          description: `We couldn't find a ${profileType} account with email ${claimEmail}. Please fill in your details manually.`,
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

      // Create profile without team assignment
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileType,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          dateOfBirth: data.dateOfBirth,
          jerseyNumber: jerseyNum,
          // teamId removed - will be set via join request
          age: calculatedAge,
          height: data.height,
          city: data.city,
          position: data.position,
          profileImageUrl: claimData?.photoUrl || (user as any)?.profileImageUrl,
          verified: isVerified, // Pass verification status from Notion claim
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create profile");
      }

      const profileData = await response.json();

      // If player selected a team, create join request
      if (profileType === "player" && data.teamId) {
        // Find team by name to get team ID
        const teamsResponse = await fetch("/api/teams", { credentials: "include" });
        if (teamsResponse.ok) {
          const teams = await teamsResponse.json();
          const selectedTeam = teams.find((t: any) => t.name === data.teamId);
          
          if (selectedTeam) {
            const joinResponse = await fetch(`/api/teams/${selectedTeam.id}/join-requests`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ profileId: profileData.id })
            });
            
            if (!joinResponse.ok) {
              console.error("Failed to create join request");
            } else {
              profileData.joinRequestPending = true;
              profileData.requestedTeamName = data.teamId;
            }
          }
        }
      }

      return profileData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", (user as any)?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      const description = data.joinRequestPending 
        ? `Your profile has been created! Your request to join ${data.requestedTeamName} is pending coach approval.`
        : "Your profile has been successfully created.";
      
      toast({
        title: "Profile Created!",
        description,
      });

      // Redirect based on profile type
      if (data.profileType === "player") {
        setLocation("/player-dashboard");
      } else {
        setLocation("/parent-dashboard");
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
      className="min-h-screen text-white p-4"
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
            <h1 className="text-2xl font-bold">Create {profileType === "parent" ? "Parent" : "Player"} Profile</h1>
            <p className="text-sm text-white/70">Complete your profile information</p>
          </div>
        </div>

        {/* Claim Account Section */}
        <Card className="mb-6 bg-white/5 border-white/10">
          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-3">Have an existing UYP account?</h3>
            <p className="text-sm text-white/70 mb-3">
              Enter your registered email to link your account and auto-fill your information
            </p>
            <div className="flex gap-2">
              <Input
                value={claimEmail}
                onChange={(e) => setClaimEmail(e.target.value)}
                placeholder="Enter your email"
                type="email"
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                data-testid="input-claim-email"
              />
              <Button
                onClick={handleClaimAccount}
                disabled={isClaiming}
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border-white/20"
                data-testid="button-claim-account"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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

                {profileType === "player" && (
                  <>
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

                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Team</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-team">
                                <SelectValue placeholder="Select your team" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">FNHTL</div>
                              {['Dragons', 'Titans', 'Eagles', 'Trojans', 'Bruins', 'Silverswords', 'Vikings', 'Storm', 'Dolphins', 'Anteaters', 'Wildcats', 'Wolverines', 'Wizards'].map((team, idx) => (
                                <SelectItem key={`fnhtl-${idx}`} value={team}>
                                  {team}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 mt-2">Youth Club</div>
                              {['10u Black', '11u Black', '12u Red', 'Youth Girls Black', 'Youth Girls Red', '13u White', '13u Black', '14u Black', '14u Gray', '14u Red', 'Black Elite'].map((team, idx) => (
                                <SelectItem key={`youth-${idx}`} value={team}>
                                  {team}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1.5 text-sm font-semibold text-gray-500 mt-2">High School</div>
                              {['HS Elite', 'HS Red', 'HS Black', 'HS White'].map((team, idx) => (
                                <SelectItem key={`hs-${idx}`} value={team}>
                                  {team}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

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
