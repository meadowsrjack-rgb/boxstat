import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  UserPlus,
  DollarSign,
  MessageSquare,
  Settings,
  Calendar,
  Trophy,
  ArrowLeft,
  User,
} from "lucide-react";
import { useEffect } from "react";

export default function UnifiedAccount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for payment success in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Player has been successfully added to your account.",
      });
      
      // Clean up the URL
      window.history.replaceState({}, '', '/unified-account');
    }
  }, [toast]);

  // Fetch current user
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch linked players
  const { data: players = [], isLoading: playersLoading } = useQuery<any[]>({
    queryKey: ["/api/account/players"],
  });

  // Fetch upcoming events
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Fetch payments
  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  const upcomingEvents = events
    .filter((e: any) => new Date(e.startTime) > new Date())
    .slice(0, 3);

  const pendingPayments = payments.filter((p: any) => p.status === "pending");
  const nextPaymentDue = pendingPayments.length > 0 ? pendingPayments[0] : null;

  const openPlayerDashboard = (playerId: string) => {
    // Store the player ID and navigate to player dashboard
    localStorage.setItem("selectedPlayerId", playerId);
    setLocation("/player-dashboard");
  };

  const handleSignOut = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      toast({ title: "Signed out successfully" });
      setLocation("/");
    } catch (error) {
      toast({ 
        title: "Sign out failed", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
  };

  if (playersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="text-welcome">
                Welcome, {user?.firstName || "User"}!
              </h1>
              <p className="text-gray-600 mt-1">Manage your account and players</p>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "admin" && (
                <Button
                  onClick={() => setLocation("/admin-dashboard")}
                  variant="outline"
                  data-testid="button-admin"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              {(user?.role === "admin" || user?.role === "coach") && (
                <Button
                  onClick={() => setLocation("/coach-dashboard")}
                  variant="outline"
                  data-testid="button-coach"
                >
                  <User className="w-4 h-4 mr-2" />
                  Coach
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming Events</p>
                  <p className="text-2xl font-bold" data-testid="stat-upcoming-events">
                    {upcomingEvents.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Payment</p>
                  <p className="text-2xl font-bold" data-testid="stat-next-payment">
                    {nextPaymentDue ? `$${(nextPaymentDue.amount / 100).toFixed(2)}` : "None"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Players</p>
                  <p className="text-2xl font-bold" data-testid="stat-active-players">
                    {players.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="home">
          <TabsList className="mb-6">
            <TabsTrigger value="home" data-testid="tab-home">
              <User className="w-4 h-4 mr-2" />
              Home
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Home Tab */}
          <TabsContent value="home" className="space-y-6">
            {/* Player Cards Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">My Players</h2>
                <Button
                  onClick={() => setLocation("/add-player")}
                  variant="outline"
                  data-testid="button-add-player"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>
              </div>

              {players.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Players Yet</h3>
                    <p className="text-gray-600 mb-4">Add your first player to get started</p>
                    <Button
                      onClick={() => setLocation("/add-player")}
                      data-testid="button-add-first-player"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Player
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player: any) => (
                    <Card
                      key={player.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openPlayerDashboard(player.id)}
                      data-testid={`player-card-${player.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={player.profileImageUrl} alt={`${player.firstName} ${player.lastName}`} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                              {player.firstName?.[0]}{player.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {player.teamAssignmentStatus === "pending" && (
                            <Badge variant="outline" className="bg-yellow-50">
                              Pending
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold mb-1" data-testid={`player-name-${player.id}`}>
                          {player.firstName} {player.lastName}
                        </h3>

                        {player.teamId && (
                          <p className="text-sm text-gray-600 mb-2">
                            Team: {player.teamId}
                          </p>
                        )}

                        {player.packageSelected && (
                          <p className="text-sm text-gray-600 mb-2">
                            Program: {player.packageSelected}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                          <Trophy className="w-4 h-4" />
                          <span>{player.awardsCount || 0} Awards</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
                <div className="space-y-3">
                  {upcomingEvents.map((event: any) => (
                    <Card key={event.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(event.startTime).toLocaleDateString()} at {event.location}
                          </p>
                        </div>
                        <Badge>{event.eventType || "Event"}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View and manage your payments</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No payments yet</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment: any) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`payment-${payment.id}`}
                      >
                        <div>
                          <p className="font-semibold">{payment.description || "Payment"}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${(payment.amount / 100).toFixed(2)}</p>
                          <Badge
                            variant={payment.status === "completed" ? "default" : "outline"}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Communication and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">No messages yet</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{user?.firstName} {user?.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{user?.email}</span>
                    </div>
                    {user?.phoneNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span>{user.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleSignOut}
                    data-testid="button-logout"
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
