import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Users, Briefcase } from "lucide-react";
import { insertProfileSchema } from "@shared/schema";

const createProfileSchema = insertProfileSchema.extend({
  profileType: z.enum(["parent", "player", "coach"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type CreateProfileForm = z.infer<typeof createProfileSchema>;

export default function CreateProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<"parent" | "player" | "coach" | null>(null);

  // Get available teams for player profiles
  const { data: teams = [] } = useQuery<Array<{id: number, name: string, ageGroup: string}>>({
    queryKey: ["/api/teams"],
    enabled: selectedType === "player",
  });

  const form = useForm<CreateProfileForm>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: {
      profileType: selectedType || "parent",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      address: "",
      teamId: undefined,
      jerseyNumber: "",
      position: "",
      schoolGrade: "",
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: CreateProfileForm) => {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          ...data,
          accountId: user.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create profile");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Profile created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", user.id] });
      setLocation("/profile-selection");
    },
    onError: (error: Error) => {
      console.error("Profile creation failed:", error);
      console.error("Error details:", error.message);
    },
  });

  const onSubmit = (data: CreateProfileForm) => {
    console.log("Form submitted with data:", data);
    console.log("Current user:", user);
    console.log("Submitting profile creation...");
    createProfileMutation.mutate(data);
  };

  const handleTypeSelect = (type: "parent" | "player" | "coach") => {
    setSelectedType(type);
    form.setValue("profileType", type);
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      setLocation("/profile-selection");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-md"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Create Profile</h1>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto p-6">
        {!selectedType ? (
          /* Profile Type Selection */
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                What type of profile would you like to create?
              </h2>
              <p className="text-sm text-gray-600">
                Choose the type that best describes your role
              </p>
            </div>

            <div className="space-y-4">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTypeSelect("parent")}
                data-testid="card-parent-type"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Parent/Guardian</h3>
                      <p className="text-sm text-gray-600">
                        Manage family profiles, payments, and stay connected with teams
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTypeSelect("player")}
                data-testid="card-player-type"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Player</h3>
                      <p className="text-sm text-gray-600">
                        Track progress, communicate with team, and access training
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTypeSelect("coach")}
                data-testid="card-coach-type"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Coach</h3>
                      <p className="text-sm text-gray-600">
                        Manage teams, create schedules, and communicate with families
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Profile Creation Form */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Create {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" />
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
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-last-name" />
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
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(555) 123-4567" 
                            {...field}
                            value={field.value || ""}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Player-specific fields */}
                  {selectedType === "player" && (
                    <>
                      <FormField
                        control={form.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-team">
                                  <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id.toString()}>
                                    {team.name} - {team.ageGroup}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                              <FormLabel>Jersey Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  placeholder="23"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || "")}
                                  data-testid="input-jersey"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Position</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-position">
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Point Guard">Point Guard</SelectItem>
                                  <SelectItem value="Shooting Guard">Shooting Guard</SelectItem>
                                  <SelectItem value="Small Forward">Small Forward</SelectItem>
                                  <SelectItem value="Power Forward">Power Forward</SelectItem>
                                  <SelectItem value="Center">Center</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="schoolGrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>School Grade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-grade">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                                  <SelectItem key={grade} value={grade.toString()}>
                                    {grade}th Grade
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

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="123 Main St, City, State 12345"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedType(null)}
                  data-testid="button-back-to-type"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createProfileMutation.isPending}
                  data-testid="button-create-profile"
                >
                  {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </main>
    </div>
  );
}