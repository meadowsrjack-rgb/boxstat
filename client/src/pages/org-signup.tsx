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
import { ChevronLeft, ChevronRight, Building2, User, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import BoxStatLogo from "@/components/boxstat-logo";
import { authPersistence } from "@/services/authPersistence";

const orgInfoSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  sportType: z.string().min(1, "Sport type is required"),
});

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9!@#$%^&*]/, "Must contain at least one number or symbol"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type OrgInfo = z.infer<typeof orgInfoSchema>;
type PersonalInfo = z.infer<typeof personalInfoSchema>;
type PasswordInfo = z.infer<typeof passwordSchema>;

export default function OrgSignup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<{
    organizationName?: string;
    sportType?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }>({});

  const totalSteps = 3;

  const orgForm = useForm<OrgInfo>({
    resolver: zodResolver(orgInfoSchema),
    defaultValues: { organizationName: formData.organizationName || "", sportType: formData.sportType || "basketball" },
  });

  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: { firstName: formData.firstName || "", lastName: formData.lastName || "", email: formData.email || "", phoneNumber: formData.phoneNumber || "" },
  });

  const passwordForm = useForm<PasswordInfo>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const signupMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("/api/signup/organization", {
        method: "POST",
        data: payload,
      });
    },
    onSuccess: async (response: any) => {
      if (response.token) {
        await authPersistence.setToken(response.token);
      }
      toast({ title: "Welcome to BoxStat!", description: `${response.organization?.name} has been created. Let's set up your organization.` });
      setTimeout(() => { window.location.href = "/dashboard"; }, 500);
    },
    onError: (error: any) => {
      toast({ title: "Sign Up Failed", description: error.message || "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const handleOrgNext = (data: OrgInfo) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handlePersonalNext = (data: PersonalInfo) => {
    setFormData(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleSubmit = (data: PasswordInfo) => {
    signupMutation.mutate({
      ...formData,
      password: data.password,
    });
  };

  const stepTitles = ["Your Organization", "Your Information", "Create Password"];
  const stepIcons = [Building2, User, Lock];

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: '#000000' }}>
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
      <div className="absolute bottom-0 left-0 right-0 h-64 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center bottom, rgba(220, 38, 38, 0.15) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center justify-start min-h-full overflow-y-auto"
        style={{ paddingTop: 'max(40px, env(safe-area-inset-top))', paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}>

        <BoxStatLogo variant="dark" className="w-[140px] h-auto mb-6" />

        <div className="w-full max-w-md px-6">
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === currentStep ? 'bg-red-600 text-white' :
                  step < currentStep ? 'bg-green-600 text-white' : 'bg-white/10 text-gray-500'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 3 && <div className={`w-8 h-0.5 ${step < currentStep ? 'bg-green-600' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-1">{stepTitles[currentStep - 1]}</h2>
          <p className="text-gray-400 text-sm text-center mb-6">Step {currentStep} of {totalSteps}</p>

          <div className="p-6 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-sm">
            {currentStep === 1 && (
              <Form {...orgForm}>
                <form onSubmit={orgForm.handleSubmit(handleOrgNext)} className="space-y-4">
                  <FormField control={orgForm.control} name="organizationName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Organization Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Eastside Basketball Academy" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={orgForm.control} name="sportType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Sport</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="soccer">Soccer</SelectItem>
                          <SelectItem value="baseball">Baseball</SelectItem>
                          <SelectItem value="football">Football</SelectItem>
                          <SelectItem value="volleyball">Volleyball</SelectItem>
                          <SelectItem value="hockey">Hockey</SelectItem>
                          <SelectItem value="lacrosse">Lacrosse</SelectItem>
                          <SelectItem value="swimming">Swimming</SelectItem>
                          <SelectItem value="track">Track & Field</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0 mt-2">
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </form>
              </Form>
            )}

            {currentStep === 2 && (
              <Form {...personalForm}>
                <form onSubmit={personalForm.handleSubmit(handlePersonalNext)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={personalForm.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={personalForm.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={personalForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={personalForm.control} name="phoneNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Phone <span className="text-gray-500">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" placeholder="(555) 123-4567" className="bg-white/10 border-white/20 text-white placeholder:text-gray-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-3 mt-2">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0">
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            {currentStep === 3 && (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField control={passwordForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showPassword ? "text" : "password"} placeholder="Create a password"
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showConfirm ? "text" : "password"} placeholder="Confirm your password"
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 pr-10" />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <p className="text-xs text-gray-500">Min 8 characters, one uppercase letter, one number or symbol.</p>
                  <div className="flex gap-3 mt-2">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button type="submit" disabled={signupMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border-0">
                      {signupMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Organization"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <button onClick={() => setLocation('/login')} className="text-white font-semibold hover:text-red-400 transition-colors">
              Sign In
            </button>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Looking to join an existing organization?{" "}
            <button onClick={() => setLocation('/registration')} className="text-white font-semibold hover:text-red-400 transition-colors">
              Register as a Player
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
