import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, UserPlus, Mail, Phone, User, Shield, Eye, CreditCard, Trash2, 
  ArrowLeft, Search, UserCheck, Shirt, Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
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

const claimPlayerSchema = z.object({
  playerId: z.string().min(1, "Player selection is required"),
  contact: z.string().min(1, "Contact information is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

type AddFamilyMemberData = z.infer<typeof addFamilyMemberSchema>;
type ClaimPlayerData = z.infer<typeof claimPlayerSchema>;

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
    profileImageUrl?: string;
    phoneNumber?: string;
  };
}

interface NotionPlayer {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  teamName?: string;
  jerseyNumber?: number;
  position?: string;
  photoUrl?: string;
  age?: number;
  grade?: string;
}

export default function FamilyManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<NotionPlayer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimStep, setClaimStep] = useState<'search' | 'request' | 'verify'>('search');
  const [claimContact, setClaimContact] = useState("");

  const form = useForm<AddFamilyMemberData>({
    resolver: zodResolver(addFamilyMemberSchema),
    defaultValues: {
      relationship: "parent",
      canMakePayments: true,
      canViewReports: true,
      emergencyContact: false,
    },
  });

  const claimForm = useForm<ClaimPlayerData>({
    resolver: zodResolver(claimPlayerSchema),
    defaultValues: {
      playerId: "",
      contact: "",
      code: "",
    },
  });

  // Fetch family members (linked players)
  const { data: familyMembers = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['/api/parent/players'],
  });

  // Search Notion players
  const { data: searchResults = [], isLoading: isSearching } = useQuery<NotionPlayer[]>({
    queryKey: ['/api/search/notion-players', searchQuery],
    enabled: searchQuery.length >= 2,
  });

  // Add family member mutation
  const addFamilyMemberMutation = useMutation({
    mutationFn: async (data: AddFamilyMemberData) => {
      return apiRequest("POST", "/api/family-members", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parent/players'] });
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

  // Claim player mutations
  const requestClaimMutation = useMutation({
    mutationFn: async ({ playerId, contact }: { playerId: string; contact: string }) => {
      return apiRequest("POST", "/api/players/claim/request", { playerId, contact });
    },
    onSuccess: () => {
      setClaimStep('verify');
      toast({
        title: "Verification Code Sent",
        description: `A verification code has been sent to ${claimContact}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Code",
        description: "Could not send verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifyClaimMutation = useMutation({
    mutationFn: async (data: ClaimPlayerData) => {
      return apiRequest("POST", "/api/players/claim/verify", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/parent/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      setIsClaimDialogOpen(false);
      setClaimStep('search');
      setSelectedPlayer(null);
      claimForm.reset();
      toast({
        title: "Player Claimed Successfully",
        description: `${data.player?.fullName} has been added to your family.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: "Invalid verification code. Please check and try again.",
        variant: "destructive",
      });
    },
  });

  // Remove family member mutation
  const removeFamilyMemberMutation = useMutation({
    mutationFn: async (playerId: string) => {
      return apiRequest("DELETE", `/api/parent/players/${playerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parent/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      toast({
        title: "Player Removed",
        description: "The player has been removed from your family successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Removal Failed",
        description: "Failed to remove player from family. Please try again.",
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
      queryClient.invalidateQueries({ queryKey: ['/api/parent/players'] });
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

  const handleRemovePlayer = (playerId: string, playerName: string) => {
    if (confirm(`Are you sure you want to remove ${playerName} from your family? This action cannot be undone.`)) {
      removeFamilyMemberMutation.mutate(playerId);
    }
  };

  const handleSelectPlayer = (player: NotionPlayer) => {
    setSelectedPlayer(player);
    claimForm.setValue('playerId', player.id);
    setClaimStep('request');
  };

  const handleRequestClaim = () => {
    if (selectedPlayer && claimContact) {
      requestClaimMutation.mutate({ playerId: selectedPlayer.id, contact: claimContact });
      claimForm.setValue('contact', claimContact);
    }
  };

  const onClaimSubmit = (data: ClaimPlayerData) => {
    verifyClaimMutation.mutate(data);
  };

  const resetClaimDialog = () => {
    setIsClaimDialogOpen(false);
    setClaimStep('search');
    setSelectedPlayer(null);
    setClaimContact("");
    claimForm.reset();
    setSearchQuery("");
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
      <div className="flex-1 overflow-y-auto bg-gray-50 safe-bottom flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading family members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 safe-bottom">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/parent-settings")}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Family Management</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Manage linked player profiles and permissions</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Dialog open={isClaimDialogOpen} onOpenChange={(open) => open ? setIsClaimDialogOpen(true) : resetClaimDialog()}>
            <DialogTrigger asChild>
              <Button data-testid="button-claim-player">
                <Search className="w-4 h-4 mr-2" />
                Find & Claim Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Claim Player Profile</DialogTitle>
                <DialogDescription>
                  {claimStep === 'search' && "Search for your child's player profile in our system"}
                  {claimStep === 'request' && "Request verification to claim this player"}
                  {claimStep === 'verify' && "Enter the verification code sent to you"}
                </DialogDescription>
              </DialogHeader>

              {claimStep === 'search' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      data-testid="input-search-player"
                      placeholder="Search by player name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" disabled={isSearching}>
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {isSearching ? (
                      <div className="text-center py-8 text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium" data-testid={`text-player-name-${player.id}`}>{player.fullName}</div>
                              <div className="text-sm text-gray-500">
                                {player.teamName && <span className="inline-flex items-center gap-1 mr-3"><Shirt className="w-3 h-3" />{player.teamName}</span>}
                                {player.jerseyNumber && <span className="inline-flex items-center gap-1 mr-3"><Hash className="w-3 h-3" />#{player.jerseyNumber}</span>}
                                {player.position && <span>{player.position}</span>}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleSelectPlayer(player)} data-testid={`button-select-player-${player.id}`}>
                            Select
                          </Button>
                        </div>
                      ))
                    ) : searchQuery.length >= 2 ? (
                      <div className="text-center py-8 text-gray-500">No players found</div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">Type to search for players</div>
                    )}
                  </div>
                </div>
              )}

              {claimStep === 'request' && selectedPlayer && (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{selectedPlayer.fullName}</div>
                        <div className="text-sm text-gray-600">
                          {selectedPlayer.teamName} • #{selectedPlayer.jerseyNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Information</label>
                    <Input
                      data-testid="input-claim-contact"
                      placeholder="Email or phone number for verification"
                      value={claimContact}
                      onChange={(e) => setClaimContact(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send a verification code to confirm you're authorized to claim this player
                    </p>
                  </div>
                </div>
              )}

              {claimStep === 'verify' && selectedPlayer && (
                <Form {...claimForm}>
                  <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="space-y-4">
                    <div className="p-4 border rounded-lg bg-green-50">
                      <div className="flex items-center gap-2 text-green-800">
                        <UserCheck className="w-5 h-5" />
                        <span className="font-medium">Verification code sent to {claimContact}</span>
                      </div>
                    </div>
                    <FormField
                      control={claimForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input 
                              data-testid="input-verification-code"
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}

              <DialogFooter>
                {claimStep === 'search' && (
                  <Button variant="outline" onClick={resetClaimDialog}>Cancel</Button>
                )}
                {claimStep === 'request' && (
                  <>
                    <Button variant="outline" onClick={() => setClaimStep('search')}>Back</Button>
                    <Button 
                      onClick={handleRequestClaim}
                      disabled={!claimContact || requestClaimMutation.isPending}
                      data-testid="button-send-verification"
                    >
                      {requestClaimMutation.isPending ? "Sending..." : "Send Verification Code"}
                    </Button>
                  </>
                )}
                {claimStep === 'verify' && (
                  <>
                    <Button variant="outline" onClick={() => setClaimStep('request')}>Back</Button>
                    <Button 
                      onClick={claimForm.handleSubmit(onClaimSubmit)}
                      disabled={!claimForm.watch('code') || verifyClaimMutation.isPending}
                      data-testid="button-claim-player-verify"
                    >
                      {verifyClaimMutation.isPending ? "Verifying..." : "Claim Player"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-member-email">
                <UserPlus className="w-4 h-4 mr-2" />
                Add by Email
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
                            data-testid="input-player-email"
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
                            <SelectTrigger data-testid="select-relationship">
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
                              data-testid="checkbox-can-make-payments"
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
                              data-testid="checkbox-can-view-reports"
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
                              data-testid="checkbox-emergency-contact"
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
                      data-testid="button-add-member-submit"
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
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Family Members</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Add players to your family account to manage their basketball experience.
                </p>
                <Button onClick={() => setIsClaimDialogOpen(true)} data-testid="button-add-first-member">
                  <Search className="h-4 w-4 mr-2" />
                  Find Your First Player
                </Button>
              </CardContent>
            </Card>
          ) : (
            familyMembers.map(member => (
              <Card key={member.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        {member.player.profileImageUrl ? (
                          <img 
                            src={member.player.profileImageUrl} 
                            alt={`${member.player.firstName} ${member.player.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                          <span data-testid={`text-member-name-${member.id}`}>
                            {member.player.firstName} {member.player.lastName}
                          </span>
                          {getRelationshipBadge(member.relationship)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {member.player.email}
                          </span>
                          {member.player.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {member.player.phoneNumber}
                            </span>
                          )}
                          {member.player.teamId && (
                            <span className="flex items-center gap-1">
                              <Shirt className="w-4 h-4" />
                              Team Member
                            </span>
                          )}
                          {member.player.jerseyNumber && (
                            <span className="flex items-center gap-1">
                              <Hash className="w-4 h-4" />
                              #{member.player.jerseyNumber}
                            </span>
                          )}
                          {member.player.position && (
                            <span>{member.player.position}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePlayer(member.player.id, `${member.player.firstName} ${member.player.lastName}`)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      data-testid={`button-remove-member-${member.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Permissions</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Payments</span>
                          </div>
                          <Checkbox
                            checked={member.canMakePayments}
                            onCheckedChange={() => togglePermission(member.id, 'canMakePayments', member.canMakePayments)}
                            disabled={updatePermissionsMutation.isPending}
                            data-testid={`checkbox-payments-${member.id}`}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Reports</span>
                          </div>
                          <Checkbox
                            checked={member.canViewReports}
                            onCheckedChange={() => togglePermission(member.id, 'canViewReports', member.canViewReports)}
                            disabled={updatePermissionsMutation.isPending}
                            data-testid={`checkbox-reports-${member.id}`}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Emergency</span>
                          </div>
                          <Checkbox
                            checked={member.emergencyContact}
                            onCheckedChange={() => togglePermission(member.id, 'emergencyContact', member.emergencyContact)}
                            disabled={updatePermissionsMutation.isPending}
                            data-testid={`checkbox-emergency-${member.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Help & Instructions */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">How Family Management Works</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Claiming Players</h5>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• Search our player database for your child</li>
                  <li>• Request verification via email or phone</li>
                  <li>• Enter the code to claim the profile</li>
                  <li>• All past achievements and data transfer over</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Family Permissions</h5>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                  <li>• Payment permissions for fees and uniforms</li>
                  <li>• Report access for performance tracking</li>
                  <li>• Emergency contact notifications</li>
                  <li>• Multiple families supported (divorced parents)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}