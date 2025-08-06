import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, User, Briefcase, ArrowRight, ArrowLeft, Check } from "lucide-react";

export default function DemoAccountSetup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState("");
  const [accountData, setAccountData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: ""
  });

  const handleAccountTypeSelect = (type: string) => {
    setAccountType(type);
    setStep(2);
  };

  const handleAccountDataSubmit = () => {
    // Simulate account creation and redirect to profile selection
    setLocation("/demo-profiles");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="p-2 hover:bg-gray-100 rounded-md"
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">Account Setup</h1>
              <p className="text-sm text-gray-600">Step {step} of 2</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto p-6">
        {step === 1 ? (
          /* Account Type Selection */
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                What best describes you?
              </h2>
              <p className="text-sm text-gray-600">
                This helps us customize your initial interface. You can add more profiles later.
              </p>
            </div>

            <div className="space-y-4">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAccountTypeSelect("parent")}
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
                        I have children playing basketball and want to manage family activities
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAccountTypeSelect("player")}
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
                        I play basketball and want to track my progress and communicate with my team
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAccountTypeSelect("coach")}
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
                        I coach teams and need tools to manage players and communication
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Account Information Form */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Create Your Account
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Initial setup as a {accountType}. You can add family members and additional profiles after setup.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sarah.johnson@email.com"
                    value={accountData.email}
                    onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                    data-testid="input-email"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Sarah"
                      value={accountData.firstName}
                      onChange={(e) => setAccountData({...accountData, firstName: e.target.value})}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Johnson"
                      value={accountData.lastName}
                      onChange={(e) => setAccountData({...accountData, lastName: e.target.value})}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={accountData.phoneNumber}
                    onChange={(e) => setAccountData({...accountData, phoneNumber: e.target.value})}
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="123 Main St, Costa Mesa, CA 92626"
                    value={accountData.address}
                    onChange={(e) => setAccountData({...accountData, address: e.target.value})}
                    data-testid="input-address"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Your account will be created</li>
                  <li>✓ You'll be taken to the profile selection page</li>
                  <li>✓ You can add children's profiles and manage the family</li>
                  <li>✓ Switch between profiles seamlessly</li>
                </ul>
              </CardContent>
            </Card>

            <Button
              onClick={handleAccountDataSubmit}
              className="w-full"
              disabled={!accountData.email || !accountData.firstName || !accountData.lastName}
              data-testid="button-create-account"
            >
              <Check className="h-4 w-4 mr-2" />
              Create Account & Continue
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}