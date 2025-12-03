import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Gift, CreditCard, User, CheckCircle } from "lucide-react";
import { useState } from "react";

interface Subscription {
  id: number;
  ownerUserId: string;
  assignedPlayerId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string;
  productName: string;
  status: string;
  isMigrated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface SubscriptionAlertProps {
  players?: Player[];
}

export default function SubscriptionAlert({ players = [] }: SubscriptionAlertProps) {
  const { toast } = useToast();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const { data: unassignedData, isLoading } = useQuery<{ subscriptions: Subscription[]; count: number }>({
    queryKey: ["/api/subscriptions/unassigned"],
  });

  const assignMutation = useMutation({
    mutationFn: async ({ subscriptionId, playerId }: { subscriptionId: number; playerId: string }) => {
      return apiRequest("/api/subscriptions/assign", {
        method: "POST",
        data: { subscriptionId, playerId },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Subscription Assigned!",
        description: data.message || "Successfully assigned subscription to player.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/unassigned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/announcements"] });
      setAssignDialogOpen(false);
      setSelectedSubscription(null);
      setSelectedPlayerId("");
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Could not assign subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAssignClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = () => {
    if (!selectedSubscription || !selectedPlayerId) return;
    assignMutation.mutate({
      subscriptionId: selectedSubscription.id,
      playerId: selectedPlayerId,
    });
  };

  const unassignedSubs = unassignedData?.subscriptions || [];

  if (isLoading) return null;

  if (unassignedSubs.length === 0) return null;

  return (
    <>
      <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50" data-testid="subscription-alert">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg text-amber-800">Action Required</CardTitle>
            <Badge variant="secondary" className="bg-amber-200 text-amber-800">
              {unassignedSubs.length} subscription{unassignedSubs.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <CardDescription className="text-amber-700">
            We found existing subscriptions linked to your account. Assign them to your players to activate their membership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {players.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-100 rounded-lg text-amber-800 text-sm mb-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>You need to add a player to your account before you can assign subscriptions. Use the "Add Player" button below.</span>
            </div>
          )}
          {unassignedSubs.map((subscription) => (
            <div
              key={subscription.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200"
              data-testid={`subscription-card-${subscription.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{subscription.productName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {subscription.isMigrated && (
                      <Badge variant="outline" className="text-xs">
                        Legacy UYP
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                      {subscription.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleAssignClick(subscription)}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={players.length === 0}
                data-testid={`assign-button-${subscription.id}`}
              >
                <User className="h-4 w-4 mr-2" />
                Assign to Player
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent data-testid="assign-subscription-dialog">
          <DialogHeader>
            <DialogTitle>Assign Subscription to Player</DialogTitle>
            <DialogDescription>
              Choose which player should receive the "{selectedSubscription?.productName}" subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">{selectedSubscription?.productName}</p>
                  {selectedSubscription?.isMigrated && (
                    <p className="text-sm text-gray-500">Migrated from legacy UYP system</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Player</label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger data-testid="select-player-for-subscription">
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent>
                  {players.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No players available
                    </SelectItem>
                  ) : (
                    players.map((player) => (
                      <SelectItem key={player.id} value={player.id} data-testid={`player-option-${player.id}`}>
                        {player.firstName} {player.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {players.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Add a player to your account first to assign subscriptions.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={!selectedPlayerId || assignMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="confirm-assign-button"
            >
              {assignMutation.isPending ? (
                "Assigning..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Assign Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
