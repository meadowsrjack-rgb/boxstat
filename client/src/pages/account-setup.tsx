import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { User, Baby, Users, Calendar, Phone, MapPin, AlertTriangle, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

// Account setup schema for new users with conditional validation
const accountSetupSchema = z.object({
  userType: z.enum(["parent", "player"]),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(1, "Address is required"),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  medicalInfo: z.string().optional(),
  allergies: z.string().optional(),
  schoolGrade: z.string().optional(),
  parentalConsent: z.boolean().refine(val => val === true, "Parental consent is required"),
}).superRefine((data, ctx) => {
  // For parents, emergency contact information is required
  if (data.userType === "parent") {
    if (!data.emergencyContact || data.emergencyContact.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact name is required for parent accounts",
        path: ["emergencyContact"],
      });
    }
    if (!data.emergencyPhone || data.emergencyPhone.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact phone is required for parent accounts",
        path: ["emergencyPhone"],
      });
    }
  }
});

type AccountSetupData = z.infer<typeof accountSetupSchema>;

export default function AccountSetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const form = useForm<AccountSetupData>({
    resolver: zodResolver(accountSetupSchema),
    defaultValues: {
      userType: "parent",
      parentalConsent: false,
    },
  });

  const setupAccountMutation = useMutation({
    mutationFn: async (data: AccountSetupData) => {
      return apiRequest("POST", "/api/setup-account", data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Account Setup Complete",
        description: "Your account has been set up successfully!",
      });
      // Redirect based on user type
      setLocation(response.redirectUrl || "/");
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: "Failed to complete account setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountSetupData) => {
    setupAccountMutation.mutate(data);
  };

  const userType = form.watch("userType");
  const isPlayer = userType === "player";
  const isParent = userType === "parent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoPath} alt="UYP Basketball" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to UYP Basketball</h1>
          <p className="text-gray-600">Let's set up your account to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              <span className="text-sm font-medium">1</span>
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              <span className="text-sm font-medium">2</span>
            </div>
            <div className={`w-12 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              <span className="text-sm font-medium">3</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><User className="w-5 h-5" />Account Type</>}
              {step === 2 && <><Users className="w-5 h-5" />Personal Information</>}
              {step === 3 && <><AlertTriangle className="w-5 h-5" />Emergency & Medical Information</>}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Choose your account type"}
              {step === 2 && "Provide your personal information"}
              {step === 3 && (isParent ? "Emergency contact required for parents" : "Emergency contact and medical information")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Account Type */}
                {step === 1 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="userType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Are you a parent or player?</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-4">
                              <div
                                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                                  field.value === "parent" 
                                    ? "border-blue-600 bg-blue-50" 
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => field.onChange("parent")}
                              >
                                <div className="text-center">
                                  <Users className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                                  <h3 className="font-semibold mb-2">Parent/Guardian</h3>
                                  <p className="text-sm text-gray-600">
                                    Manage your children's basketball experience, payments, and schedules
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                                  field.value === "player" 
                                    ? "border-orange-600 bg-orange-50" 
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => field.onChange("player")}
                              >
                                <div className="text-center">
                                  <Baby className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                                  <h3 className="font-semibold mb-2">Player</h3>
                                  <p className="text-sm text-gray-600">
                                    Access your team information, training programs, and stats
                                  </p>
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {isPlayer && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-800">Player Account Notice</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Players under 18 will need parental consent to complete registration. 
                              Your parent/guardian can add you to their family account for payments and permissions.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button 
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!form.watch("userType")}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Personal Information */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter first name" {...field} />
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
                              <Input placeholder="Enter last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date of Birth
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Phone Number
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Address
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Street address, city, state, zip code"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isPlayer && (
                      <FormField
                        control={form.control}
                        name="schoolGrade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4" />
                              School Grade
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="K">Kindergarten</SelectItem>
                                <SelectItem value="1">1st Grade</SelectItem>
                                <SelectItem value="2">2nd Grade</SelectItem>
                                <SelectItem value="3">3rd Grade</SelectItem>
                                <SelectItem value="4">4th Grade</SelectItem>
                                <SelectItem value="5">5th Grade</SelectItem>
                                <SelectItem value="6">6th Grade</SelectItem>
                                <SelectItem value="7">7th Grade</SelectItem>
                                <SelectItem value="8">8th Grade</SelectItem>
                                <SelectItem value="9">9th Grade</SelectItem>
                                <SelectItem value="10">10th Grade</SelectItem>
                                <SelectItem value="11">11th Grade</SelectItem>
                                <SelectItem value="12">12th Grade</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex justify-between">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </Button>
                      <Button 
                        type="button"
                        onClick={() => setStep(3)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Emergency & Medical */}
                {step === 3 && (
                  <div className="space-y-4">
                    {/* Emergency Contact Section - Required for Parents */}
                    {isParent && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          <h4 className="font-semibold text-orange-900">Emergency Contact Information</h4>
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        </div>
                        <p className="text-sm text-orange-800 mb-4">
                          As a parent, you must provide emergency contact information for family safety and league requirements.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="emergencyContact"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  Emergency Contact Name
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="emergencyPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1">
                                  Emergency Contact Phone
                                  <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Regular Emergency Contact for Players */}
                    {!isParent && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="emergencyContact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Contact Name (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="emergencyPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Emergency Contact Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="medicalInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any medical conditions, medications, or health concerns..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allergies (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Food allergies, medication allergies, environmental allergies..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parentalConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              {isPlayer ? "Parental Consent" : "Terms and Conditions"}
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              {isPlayer 
                                ? "I have parental permission to create this account and participate in UYP Basketball activities."
                                : "I agree to the terms and conditions, privacy policy, and understand the requirements for youth basketball participation."
                              }
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setStep(2)}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit"
                        disabled={setupAccountMutation.isPending}
                        className="min-w-32"
                      >
                        {setupAccountMutation.isPending ? "Setting up..." : "Complete Setup"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Need help? Contact us at (714) 389-7900 or info@upyourperformance.org</p>
          <p className="mt-1">Momentous Sports Center • 14522 Myford Rd, Irvine, CA 92606</p>
        </div>
      </div>
    </div>
  );
}