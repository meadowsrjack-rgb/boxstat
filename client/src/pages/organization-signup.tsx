import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Building2, User, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { authPersistence } from "@/services/authPersistence";

const orgSignupSchema = z.object({
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  sportType: z.string().min(1, "Please select a sport type"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9!@#$%^&*]/, "Must contain at least one number or symbol"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type OrgSignupForm = z.infer<typeof orgSignupSchema>;

const sportTypes = [
  "basketball",
  "soccer",
  "baseball",
  "softball",
  "football",
  "volleyball",
  "hockey",
  "lacrosse",
  "tennis",
  "swimming",
  "track_and_field",
  "gymnastics",
  "wrestling",
  "martial_arts",
  "other",
];

function formatSportLabel(sport: string): string {
  return sport
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function OrganizationSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<OrgSignupForm>({
    resolver: zodResolver(orgSignupSchema),
    defaultValues: {
      organizationName: "",
      sportType: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const signupMutation = useMutation({
    mutationFn: async (data: OrgSignupForm) => {
      return await apiRequest("/api/signup/organization", {
        method: "POST",
        data: {
          organizationName: data.organizationName,
          sportType: data.sportType,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          password: data.password,
        },
      });
    },
    onSuccess: async (response: any) => {
      if (response.token) {
        await authPersistence.setToken(response.token);
      }
      toast({
        title: "Organization Created!",
        description: "Welcome to BoxStat. Let's set up your organization.",
      });
      setTimeout(() => {
        window.location.href = "/admin-dashboard";
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const totalSteps = 3;

  const handleNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(["organizationName", "sportType"]);
      if (valid) setStep(2);
    } else if (step === 2) {
      const valid = await form.trigger(["firstName", "lastName", "email", "phone"]);
      if (valid) setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else setLocation("/");
  };

  const onSubmit = (data: OrgSignupForm) => {
    signupMutation.mutate(data);
  };

  const getStepTitle = () => {
    if (step === 1) return "Your Organization";
    if (step === 2) return "Your Information";
    return "Create Password";
  };

  const getStepIcon = () => {
    if (step === 1) return <Building2 className="w-5 h-5" />;
    if (step === 2) return <User className="w-5 h-5" />;
    return <Lock className="w-5 h-5" />;
  };

  return (
    <>
      <div className="ios-full-bleed" />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />

      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex flex-col">
        <div
          className="fixed top-4 left-4 z-50"
          style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
        >
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        <div
          className="flex flex-col px-8"
          style={{
            paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))",
            paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="w-full max-w-lg mx-auto flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8 pt-8">
              <div className="flex gap-2 flex-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i + 1 <= step ? "bg-red-500" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-400 ml-4">
                {step}/{totalSteps}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
                {getStepIcon()}
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {getStepTitle()}
              </h1>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1">
                {step === 1 && (
                  <div className="space-y-6">
                    <p className="text-gray-400 text-lg leading-relaxed mb-6">
                      Tell us about your sports organization
                    </p>
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Organization Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Oceanside Basketball Club"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sportType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Sport Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white h-12">
                                <SelectValue placeholder="Select a sport" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sportTypes.map((sport) => (
                                <SelectItem key={sport} value={sport}>
                                  {formatSportLabel(sport)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 mt-4"
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <p className="text-gray-400 text-lg leading-relaxed mb-6">
                      Your details as the organization admin
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">First Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="First name"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12"
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
                            <FormLabel className="text-gray-300">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Last name"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12"
                              />
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
                          <FormLabel className="text-gray-300">Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="you@example.com"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="(555) 123-4567"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 mt-4"
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <p className="text-gray-400 text-lg leading-relaxed mb-6">
                      Set a secure password for your account
                    </p>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 8 characters"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12 pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Password requirements:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One number or symbol</li>
                      </ul>
                    </div>
                    <Button
                      type="submit"
                      disabled={signupMutation.isPending}
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 mt-4"
                    >
                      {signupMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating Organization...
                        </span>
                      ) : (
                        "Create Organization"
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </Form>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">
                Looking to join an existing organization?{" "}
                <button
                  onClick={() => setLocation("/registration")}
                  className="text-red-500 hover:text-red-400 underline transition-colors"
                >
                  Register here
                </button>
              </p>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setLocation("/privacy-policy")}
                className="text-gray-500 text-xs hover:text-gray-400 underline transition-colors"
              >
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
