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
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Users, Briefcase } from "lucide-react";
import { insertProfileSchema } from "@shared/schema";

const UYP_RED = "#d82428";

const createProfileSchema = z.object({
    profileType: z.enum(["parent", "player", "coach"]),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    medicalInfo: z.string().optional(),
    allergies: z.string().optional(),
    // player-only (optional otherwise)
    teamId: z.number().optional(),
    jerseyNumber: z.number().optional(),
    position: z.string().optional(),
    schoolGrade: z.string().optional()
  });

type CreateProfileForm = z.infer<typeof createProfileSchema>;

export default function CreateProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] =
    useState<"parent" | "player" | "coach" | null>(null);

  // Teams (only when player selected)
  const { data: teams = [] } = useQuery<
    Array<{ id: number; name: string; ageGroup: string }>
  >({
    queryKey: ["/api/teams"],
    enabled: selectedType === "player"
  });

  const form = useForm<CreateProfileForm>({
    resolver: zodResolver(createProfileSchema),
    mode: "onChange",
    defaultValues: {
      profileType: selectedType || "parent",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      address: "",
      teamId: undefined,
      jerseyNumber: undefined,
      position: "",
      schoolGrade: ""
    }
  });

  // debug (kept)
  const watchedValues = form.watch();
  console.log("Current form values:", watchedValues);
  console.log("Selected type:", selectedType);

  const createProfileMutation = useMutation({
    mutationFn: async (data: CreateProfileForm) => {
      console.log("Starting profile creation mutation with data:", data);
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data })
      });

      console.log("Profile creation response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Profile creation failed with error:", errorData);
        throw new Error(errorData.message || "Failed to create profile");
      }

      const result = await response.json();
      console.log("Profile creation successful:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Profile created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", (user as any)?.id] });
      setLocation("/profile-selection");
    },
    onError: (error: Error) => {
      console.error("Profile creation failed:", error);
      console.error("Error details:", error.message);
    }
  });

  const onSubmit = (data: CreateProfileForm) => {
    console.log("Form submitted with data:", data);
    console.log("Current user:", user);
    console.log("Submitting profile creation...");
    createProfileMutation.mutate(data);
  };

  const handleTypeSelect = (type: "parent" | "player" | "coach") => {
    console.log("Type selected:", type);
    setSelectedType(type);
    form.setValue("profileType", type);
    form.trigger();
  };

  const handleBack = () => {
    if (selectedType) setSelectedType(null);
    else setLocation("/profile-selection");
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-md border border-white/15 hover:bg-white/5 transition"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Create Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pb-16">
        {!selectedType ? (
          // ---------------- TYPE PICKER ----------------
          <div className="space-y-8 pt-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">
                What type of profile would you like to create?
              </h2>
              <p className="text-sm text-white/70">
                Choose the type that best describes your role
              </p>
            </div>

            <div className="space-y-4">
              <TypeCard
                icon={<Users className="h-6 w-6" />}
                title="Parent / Guardian"
                subtitle="Manage family profiles, payments, and stay connected"
                onClick={() => handleTypeSelect("parent")}
                testId="card-parent-type"
              />
              <TypeCard
                icon={<User className="h-6 w-6" />}
                title="Player"
                subtitle="Track progress, communicate with team, and access training"
                onClick={() => handleTypeSelect("player")}
                testId="card-player-type"
                accent="green"
              />
              <TypeCard
                icon={<Briefcase className="h-6 w-6" />}
                title="Coach"
                subtitle="Manage teams, create schedules, communicate with families"
                onClick={() => handleTypeSelect("coach")}
                testId="card-coach-type"
                accent="purple"
              />
            </div>
          </div>
        ) : (
          // ---------------- FORM ----------------
          <Form {...form}>
            <form
              onSubmit={(e) => {
                console.log("Form onSubmit triggered!");
                console.log("Form data:", form.getValues());
                console.log("Form valid:", form.formState.isValid);
                console.log("Form errors:", form.formState.errors);
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-6 pt-2"
            >
              <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
                <CardHeader>
                  <CardTitle className="text-lg text-white">
                    Create{" "}
                    {selectedType.charAt(0).toUpperCase() +
                      selectedType.slice(1)}{" "}
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">
                            First Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John"
                              {...field}
                              data-testid="input-first-name"
                              className="bg-white/5 border-white/20 text-white placeholder-white/40"
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
                          <FormLabel className="text-white/80">
                            Last Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              {...field}
                              data-testid="input-last-name"
                              className="bg-white/5 border-white/20 text-white placeholder-white/40"
                            />
                          </FormControl>
                          <FormMessage className="text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(555) 123-4567"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-phone"
                            className="bg-white/5 border-white/20 text-white placeholder-white/40"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  {/* Player fields */}
                  {selectedType === "player" && (
                    <>
                      <FormField
                        control={form.control}
                        name="teamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">
                              Team
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(parseInt(value))
                              }
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger
                                  data-testid="select-team"
                                  className="bg-white/5 border-white/20 text-white"
                                >
                                  <SelectValue placeholder="Select a team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#111] text-white border-white/10">
                                {teams.map((team) => (
                                  <SelectItem
                                    key={team.id}
                                    value={team.id.toString()}
                                  >
                                    {team.name} — {team.ageGroup}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="jerseyNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80">
                                Jersey #
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="23"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || ""
                                    )
                                  }
                                  data-testid="input-jersey"
                                  className="bg-white/5 border-white/20 text-white placeholder-white/40"
                                />
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/80">
                                Position
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    data-testid="select-position"
                                    className="bg-white/5 border-white/20 text-white"
                                  >
                                    <SelectValue placeholder="Select position" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#111] text-white border-white/10">
                                  <SelectItem value="Point Guard">
                                    Point Guard
                                  </SelectItem>
                                  <SelectItem value="Shooting Guard">
                                    Shooting Guard
                                  </SelectItem>
                                  <SelectItem value="Small Forward">
                                    Small Forward
                                  </SelectItem>
                                  <SelectItem value="Power Forward">
                                    Power Forward
                                  </SelectItem>
                                  <SelectItem value="Center">Center</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="schoolGrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white/80">
                              School Grade
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger
                                  data-testid="select-grade"
                                  className="bg-white/5 border-white/20 text-white"
                                >
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#111] text-white border-white/10">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                  (grade) => (
                                    <SelectItem
                                      key={grade}
                                      value={grade.toString()}
                                    >
                                      {grade}th Grade
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {(selectedType === "parent" || selectedType === "coach") && (
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-white/80">
                      {selectedType === "parent"
                        ? "As a parent, you can manage your children's profiles and access team information."
                        : "As a coach, you can manage team rosters and communicate with families."}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="123 Main St, City, State 12345"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-address"
                            className="bg-white/5 border-white/20 text-white placeholder-white/40"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-white/30 text-white hover:bg-white/10"
                  onClick={() => setSelectedType(null)}
                  data-testid="button-back-to-type"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 text-white"
                  style={{ backgroundColor: UYP_RED }}
                  disabled={createProfileMutation.isPending}
                  data-testid="button-create-profile"
                  onClick={() => {
                    console.log("Create Profile button clicked!");
                    console.log("Form valid:", form.formState.isValid);
                    console.log("Form errors:", form.formState.errors);
                  }}
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

/* ---------------- components ---------------- */

function TypeCard({
  icon,
  title,
  subtitle,
  onClick,
  testId,
  accent
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  testId: string;
  accent?: "green" | "purple";
}) {
  const ring =
    accent === "green"
      ? "ring-1 ring-emerald-400/20"
      : accent === "purple"
      ? "ring-1 ring-purple-400/20"
      : "ring-1 ring-white/10";

  return (
    <Card
      onClick={onClick}
      data-testid={testId}
      className={`cursor-pointer bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)] hover:bg-white/[0.07] transition ${ring}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/10 grid place-items-center text-white">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-sm text-white/70">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
