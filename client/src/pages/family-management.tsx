import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, UserPlus, Mail, Phone, User, Shield, Eye, CreditCard, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const addFamilyMemberSchema = z.object({
  playerEmail: z.string().email("Valid email is required"),
  relationship: z.enum(["parent", "guardian", "sibling", "grandparent"]),
  canMakePayments: z.boolean(),
  canViewReports: z.boolean(),
  emergencyContact: z.boolean(),
});

type AddFamilyMemberData = z.infer<typeof addFamilyMemberSchema>;

interface FamilyMember {
  id: string;
  parentId: string;
  playerId: string;
  relationship: string;
  canMakePayments: boolean;
  canViewReports: boolean;
  emergencyContact: boolean;
  createdAt: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    teamId?: number;
    jerseyNumber?: number;
    position?: string;
  };
}

export default function FamilyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<AddFamilyMemberData>({
    resolver: zodResolver(addFamilyMemberSchema),
    defaultValues: {
      relationship: "parent",
      canMakePayments: true,
      canViewReports: true,
      emergencyContact: false,
    },
  });

  // Fetch family members
  const { data: familyMembers = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  // Add family member mutation
  const addFamilyMemberMutation = useMutation({
    mutationFn: async (data: AddFamilyMemberData) => {
      return apiRequest("POST", "/api/family-members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Family Member Added",
        description: "The player has been successfully added to your family.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Member",
        description: "Could not add family member. Please check the email and try again.",
        variant: "destructive",
      });
    },
  });

  // Remove family member mutation
  const removeFamilyMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("DELETE", `/api/family-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Member Removed",
        description: "The family member has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Removal Failed",
        description: "Failed to remove family member. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ memberId, permissions }: { memberId: string; permissions: Partial<FamilyMember> }) => {
      return apiRequest("PUT", `/api/family-members/${memberId}`, permissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Permissions Updated",
        description: "Family member permissions have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update permissions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddFamilyMemberData) => {
    addFamilyMemberMutation.mutate(data);
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm("Are you sure you want to remove this family member? This action cannot be undone.")) {
      removeFamilyMemberMutation.mutate(memberId);
    }
  };

  const togglePermission = (memberId: string, permission: keyof FamilyMember, currentValue: boolean) => {
    updatePermissionsMutation.mutate({
      memberId,
      permissions: { [permission]: !currentValue }
    });
  };

  const getRelationshipBadge = (relationship: string) => {
    switch (relationship) {
      case 'parent':
        return <Badge variant="default">Parent</Badge>;
      case 'guardian':
        return <Badge variant="secondary">Guardian</Badge>;
      case 'sibling':
        return <Badge variant="outline">Sibling</Badge>;
      case 'grandparent':
        return <Badge variant="outline">Grandparent</Badge>;
      default:
        return <Badge variant="outline">{relationship}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading family members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Family Management</h1>
          <p className="text-muted-foreground">Manage family members and their permissions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Family Member</DialogTitle>
              <DialogDescription>
                Add a player to your family account to manage their payments and information.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="playerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="player@example.com"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="grandparent">Grandparent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="canMakePayments"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Can Make Payments</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Allow this family member to make payments for the player
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="canViewReports"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Can View Reports</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Allow viewing of performance reports and statistics
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Emergency Contact</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Mark as an emergency contact for the player
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    type="submit" 
                    disabled={addFamilyMemberMutation.isPending}
                    className="flex-1"
                  >
                    {addFamilyMemberMutation.isPending ? "Adding..." : "Add Member"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Family Members List */}
      <div className="grid gap-4">
        {familyMembers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Family Members</h3>
              <p className="text-gray-500 mb-6">
                Add players to your family account to manage their basketball experience.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Family Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          familyMembers.map(member => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {member.player.firstName} {member.player.lastName}
                        {getRelationshipBadge(member.relationship)}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {member.player.email}
                        </span>
                        {member.player.teamId && (
                          <span>Team Member</span>
                        )}
                        {member.player.jerseyNumber && (
                          <span>#{member.player.jerseyNumber}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Permissions</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">Payments</span>
                        </div>
                        <Checkbox
                          checked={member.canMakePayments}
                          onCheckedChange={() => togglePermission(member.id, 'canMakePayments', member.canMakePayments)}
                          disabled={updatePermissionsMutation.isPending}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium">Reports</span>
                        </div>
                        <Checkbox
                          checked={member.canViewReports}
                          onCheckedChange={() => togglePermission(member.id, 'canViewReports', member.canViewReports)}
                          disabled={updatePermissionsMutation.isPending}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium">Emergency</span>
                        </div>
                        <Checkbox
                          checked={member.emergencyContact}
                          onCheckedChange={() => togglePermission(member.id, 'emergencyContact', member.emergencyContact)}
                          disabled={updatePermissionsMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {member.player.position && (
                    <div className="text-sm text-gray-600">
                      <strong>Position:</strong> {member.player.position}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-medium text-blue-800 mb-2">How Family Accounts Work</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Players must have their own account first before being added to a family</li>
            <li>• Family members can have different permission levels for payments and reports</li>
            <li>• Emergency contacts will be notified during incidents or medical emergencies</li>
            <li>• Players can be part of multiple families (divorced parents, extended family)</li>
            <li>• Payment permissions allow family members to pay for registration, uniforms, and training</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}