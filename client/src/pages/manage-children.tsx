import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Users, 
  Calendar, 
  Trophy,
  QrCode,
  Smartphone,
  Lock,
  Eye
} from "lucide-react";
import QRCode from "qrcode";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

const childSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  jerseyNumber: z.string().optional(),
  teamId: z.number().optional(),
});

type ChildFormData = z.infer<typeof childSchema>;

interface ChildProfile {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  jerseyNumber?: string;
  teamId?: number;
  profileImageUrl?: string;
  qrCodeData: string;
  createdAt: string;
  team?: {
    id: number;
    name: string;
    ageGroup: string;
  };
}

interface Team {
  id: number;
  name: string;
  ageGroup: string;
  description?: string;
}

export default function ManageChildren() {
  const { user } = useAuth();
  const { setPlayerMode, viewAsChild, childProfiles } = useAppMode();
  const [, setLocation] = useLocation();
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const { toast } = useToast();

  const form = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      jerseyNumber: "",
      teamId: undefined,
    },
  });

  // Get all teams for selection
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Get child profiles directly from API
  const { data: profiles = [] } = useQuery({
    queryKey: ["/api/child-profiles", user?.id],
    enabled: !!user?.id,
  });

  // Add child mutation
  const addChildMutation = useMutation({
    mutationFn: async (data: ChildFormData) => {
      return await apiRequest("POST", "/api/child-profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/child-profiles"] });
      setIsAddingChild(false);
      form.reset();
      toast({
        title: "Child Added",
        description: "Child profile has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit child mutation
  const editChildMutation = useMutation({
    mutationFn: async (data: { id: number } & ChildFormData) => {
      return await apiRequest("PUT", `/api/child-profiles/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/child-profiles"] });
      setEditingChild(null);
      form.reset();
      toast({
        title: "Child Updated",
        description: "Child profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete child mutation
  const deleteChildMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/child-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/child-profiles"] });
      toast({
        title: "Child Removed",
        description: "Child profile has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddChild = (data: ChildFormData) => {
    addChildMutation.mutate(data);
  };

  const handleEditChild = (data: ChildFormData) => {
    if (editingChild) {
      editChildMutation.mutate({ id: editingChild.id, ...data });
    }
  };

  const handleDeleteChild = (id: number) => {
    if (confirm("Are you sure you want to remove this child profile?")) {
      deleteChildMutation.mutate(id);
    }
  };

  const handleSwitchToPlayerMode = async () => {
    if (selectedChild && pinInput.length === 4) {
      try {
        await setPlayerMode(selectedChild.id, pinInput);
        toast({
          title: "Player Mode Activated",
          description: `Switched to ${selectedChild.firstName}'s player mode.`,
        });
        setShowPinDialog(false);
        setPinInput("");
        setLocation("/");
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to switch to player mode.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePreviewAsChild = (child: ChildProfile) => {
    viewAsChild(child.id);
    toast({
      title: "Preview Mode",
      description: `Previewing as ${child.firstName}. Click 'Exit Preview' to return.`,
    });
    setLocation("/");
  };

  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");

  const generateQRCode = async (qrData: string) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
      });
      setQrCodeDataURL(qrCodeDataURL);
    } catch (error) {
      console.error("Error generating QR code:", error);
      setQrCodeDataURL("");
    }
  };

  const openEditDialog = (child: ChildProfile) => {
    setEditingChild(child);
    form.reset({
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth,
      jerseyNumber: child.jerseyNumber || "",
      teamId: child.teamId || undefined,
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <img src={logoPath} alt="UYP Basketball" className="h-8 w-8" />
                <h1 className="text-xl font-bold text-gray-900">Manage Children</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Child Button */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Child Profiles</h2>
            <p className="text-gray-600">
              Manage your children's profiles and switch between parent and player modes.
            </p>
          </div>
          <Dialog open={isAddingChild} onOpenChange={setIsAddingChild}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Child</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddChild)} className="space-y-4">
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
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jerseyNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jersey Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter jersey number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team (Optional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                          <FormControl>
                            <SelectTrigger>
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
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddingChild(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addChildMutation.isPending}>
                      {addChildMutation.isPending ? "Adding..." : "Add Child"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Children Grid */}
        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Added</h3>
            <p className="text-gray-500 mb-4">
              Add your first child profile to get started with player mode and individual tracking.
            </p>
            <Button onClick={() => setIsAddingChild(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Child
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((child) => (
              <Card key={child.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={child.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {child.firstName[0]}{child.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {child.firstName} {child.lastName}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Age {calculateAge(child.dateOfBirth)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(child)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChild(child.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {child.jerseyNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Jersey:</span>
                        <Badge variant="outline">#{child.jerseyNumber}</Badge>
                      </div>
                    )}
                    {child.team && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Team:</span>
                        <Badge>{child.team.name}</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Check-in:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedChild(child);
                          setShowQRCode(true);
                        }}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handlePreviewAsChild(child)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview as {child.firstName}
                    </Button>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedChild(child);
                        setShowPinDialog(true);
                      }}
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Switch to Player Mode
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Child Dialog */}
      <Dialog open={!!editingChild} onOpenChange={() => setEditingChild(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Child Profile</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditChild)} className="space-y-4">
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
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jerseyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jersey Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter jersey number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                      <FormControl>
                        <SelectTrigger>
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
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingChild(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editChildMutation.isPending}>
                  {editChildMutation.isPending ? "Updating..." : "Update Child"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter 4-Digit PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set a 4-digit PIN to lock this device in Player Mode for {selectedChild?.firstName}.
            </p>
            <div className="flex justify-center">
              <Input
                type="password"
                placeholder="Enter PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.slice(0, 4))}
                className="w-32 text-center text-lg"
                maxLength={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPinDialog(false);
                  setPinInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSwitchToPlayerMode}
                disabled={pinInput.length !== 4}
              >
                <Lock className="h-4 w-4 mr-2" />
                Lock Device
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={(open) => {
        setShowQRCode(open);
        if (open && selectedChild) {
          generateQRCode(selectedChild.qrCodeData);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Check-in QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600">
              {selectedChild?.firstName}'s check-in code for gym entrance
            </p>
            <div className="flex justify-center p-4">
              <div className="bg-white p-4 rounded-lg border">
                {qrCodeDataURL ? (
                  <img src={qrCodeDataURL} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">Generating QR Code...</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Show this code to staff at the gym entrance
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}