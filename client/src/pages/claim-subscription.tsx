import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Gift, Users, Plus, ArrowRight, CheckCircle2, User, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MigrationItem {
  itemId: string;
  itemType: 'program' | 'store';
  itemName?: string;
  quantity: number;
}

interface Migration {
  id: number;
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSubscriptionIds?: string[];
  items: MigrationItem[];
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

interface FlattenedItem {
  migrationId: number;
  subscriptionId: string;
  itemId: string;
  itemType: 'program' | 'store';
  itemName: string;
  instanceIndex: number;
  uniqueKey: string;
}

export default function ClaimSubscriptionPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [newPlayerFirstName, setNewPlayerFirstName] = useState("");
  const [newPlayerLastName, setNewPlayerLastName] = useState("");
  const [selectedItem, setSelectedItem] = useState<FlattenedItem | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [assignedItems, setAssignedItems] = useState<Record<string, string>>({});

  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/me'],
  });

  const { data: migrations = [], isLoading: loadingMigrations } = useQuery<Migration[]>({
    queryKey: ['/api/legacy/my-migrations'],
  });

  const { data: childPlayers = [] } = useQuery<Player[]>({
    queryKey: ['/api/account/players'],
    enabled: !!user?.id,
  });

  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    migrations.forEach((migration) => {
      const subscriptionIds = migration.stripeSubscriptionIds || [migration.stripeSubscriptionId];
      
      migration.items?.forEach((item, itemIndex) => {
        for (let i = 0; i < item.quantity; i++) {
          const subscriptionId = subscriptionIds[items.length % subscriptionIds.length] || subscriptionIds[0];
          items.push({
            migrationId: migration.id,
            subscriptionId,
            itemId: item.itemId,
            itemType: item.itemType,
            itemName: item.itemName || 'Unknown Program',
            instanceIndex: i + 1,
            uniqueKey: `${migration.id}-${item.itemId}-${i}`,
          });
        }
      });
    });
    return items;
  }, [migrations]);

  const unassignedItems = flattenedItems.filter(item => !assignedItems[item.uniqueKey]);
  const assignedItemsList = flattenedItems.filter(item => assignedItems[item.uniqueKey]);

  const assignMigration = useMutation({
    mutationFn: (data: { migrationId: number; playerId: string; itemId?: string }) =>
      apiRequest('/api/legacy/assign', { method: 'POST', data }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/legacy/my-migrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
      
      if (selectedItem) {
        setAssignedItems(prev => ({
          ...prev,
          [selectedItem.uniqueKey]: selectedPlayerId
        }));
      }
      
      setSelectedItem(null);
      setSelectedPlayerId("");
      toast({ 
        title: "Subscription Assigned!", 
        description: response.message || "Your next billing cycle will be updated to the new BoxStat rate.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const skipClaim = useMutation({
    mutationFn: () => apiRequest('/api/legacy/skip', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: "You can assign subscriptions later from your dashboard" });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createPlayer = useMutation({
    mutationFn: (data: { firstName: string; lastName: string }) =>
      apiRequest('/api/users/create-child', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
      setIsAddPlayerOpen(false);
      setNewPlayerFirstName("");
      setNewPlayerLastName("");
      toast({ title: "Player created successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAssign = () => {
    if (!selectedItem || !selectedPlayerId) return;
    assignMigration.mutate({
      migrationId: selectedItem.migrationId,
      playerId: selectedPlayerId,
      itemId: selectedItem.itemId,
    });
  };

  const getPlayerName = (playerId: string) => {
    const player = childPlayers.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
  };

  if (loadingMigrations) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your subscriptions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (migrations.length === 0 && Object.keys(assignedItems).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <CardTitle className="text-2xl">All Set!</CardTitle>
            <CardDescription>
              All your subscriptions have been assigned. Continue to your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation('/dashboard')} size="lg" data-testid="button-go-dashboard">
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Welcome Back!</CardTitle>
            <CardDescription className="text-lg">
              We found {flattenedItems.length} subscription(s) linked to your email. 
              Assign each one to a player to continue.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 mb-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Subscriptions to Assign ({unassignedItems.length})
          </h3>
          
          {unassignedItems.length === 0 ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-medium">All subscriptions assigned!</p>
                <Button 
                  onClick={() => setLocation('/dashboard')} 
                  className="mt-4"
                  data-testid="button-continue-dashboard"
                >
                  Continue to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {unassignedItems.map((item) => (
                <Card key={item.uniqueKey} className="border-2 border-dashed border-gray-200" data-testid={`card-item-${item.uniqueKey}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              {item.itemType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => setSelectedItem(item)}
                        size="sm"
                        data-testid={`button-assign-${item.uniqueKey}`}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Assign to Player
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {assignedItemsList.length > 0 && (
          <div className="grid gap-4 mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Assigned ({assignedItemsList.length})
            </h3>
            <div className="grid gap-2">
              {assignedItemsList.map((item) => (
                <Card key={item.uniqueKey} className="border-green-200 bg-green-50">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium">{item.itemName}</span>
                    </div>
                    <Badge variant="secondary">
                      {getPlayerName(assignedItems[item.uniqueKey])}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Players ({childPlayers.length})
            </h3>
            <Button variant="outline" onClick={() => setIsAddPlayerOpen(true)} data-testid="button-add-player">
              <Plus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
          
          {childPlayers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-gray-500">
                No players yet. Add a player to assign your subscriptions.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {childPlayers.map((player) => (
                <Card key={player.id} data-testid={`card-player-${player.id}`}>
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="font-medium">{player.firstName} {player.lastName}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => skipClaim.mutate()}
            disabled={skipClaim.isPending}
            data-testid="button-skip-claim"
          >
            {skipClaim.isPending ? "Skipping..." : "Skip for Now"}
          </Button>
        </div>

        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Subscription</DialogTitle>
              <DialogDescription>
                Choose which player should receive this subscription.
              </DialogDescription>
            </DialogHeader>
            
            {selectedItem && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">{selectedItem.itemName}</div>
                    <div className="text-sm text-blue-700">No immediate charge - billing updates on next cycle</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Player</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger data-testid="select-player">
                    <SelectValue placeholder="Choose a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {childPlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.firstName} {player.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {childPlayers.length === 0 && (
                <p className="text-sm text-gray-500">
                  No players available. Please add a player first.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedPlayerId || assignMigration.isPending}
                data-testid="button-confirm-assign"
              >
                {assignMigration.isPending ? "Assigning..." : "Assign Subscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Player</DialogTitle>
              <DialogDescription>
                Create a new player profile to assign your subscription to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={newPlayerFirstName}
                  onChange={(e) => setNewPlayerFirstName(e.target.value)}
                  placeholder="Enter first name"
                  data-testid="input-player-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={newPlayerLastName}
                  onChange={(e) => setNewPlayerLastName(e.target.value)}
                  placeholder="Enter last name"
                  data-testid="input-player-last-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPlayerOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createPlayer.mutate({ 
                  firstName: newPlayerFirstName, 
                  lastName: newPlayerLastName 
                })}
                disabled={!newPlayerFirstName || !newPlayerLastName || createPlayer.isPending}
                data-testid="button-create-player"
              >
                {createPlayer.isPending ? "Creating..." : "Create Player"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
