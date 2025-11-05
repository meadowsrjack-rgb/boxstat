import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CheckInButton from "@/components/CheckInButton";
import EventDetailModal from "@/components/EventDetailModal";
import type { Event } from "@shared/schema";
import { derivePlayerStatus, getStatusColor, getStatusLabel } from "@/utils/deriveStatus";
import type { Payment, Program } from "@/utils/deriveStatus";
import {
  UserPlus,
  DollarSign,
  MessageSquare,
  Settings,
  Calendar,
  Trophy,
  ArrowLeft,
  User,
  MapPin,
  Clock,
  Target,
  Plus,
  CreditCard,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

// Hook for drag-to-scroll functionality
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setStartX(e.pageX - element.offsetLeft);
      setScrollLeft(element.scrollLeft);
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      const walk = (x - startX) * 2;
      element.scrollLeft = scrollLeft - walk;
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mousemove', handleMouseMove);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, startX, scrollLeft]);

  return ref;
}

// Compact Circular Progress component for awards
function CompactAwardsIndicator({ playerId }: { playerId: string }) {
  const { data: awardsData } = useQuery<any>({
    queryKey: [`/api/users/${playerId}/awards`],
    enabled: !!playerId,
  });

  // Calculate total awards earned
  const totalEarned = awardsData?.length || 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#e5e7eb"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="url(#awardsGradient)"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(totalEarned / 20, 1))}`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="awardsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-600" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Awards</span>
        <span className="text-sm font-semibold text-gray-900">{totalEarned}</span>
      </div>
    </div>
  );
}

// Skills Assessment Indicator
function SkillsIndicator({ playerId }: { playerId: string }) {
  const { data: evaluation } = useQuery<any>({
    queryKey: [`/api/players/${playerId}/latest-evaluation`],
    enabled: !!playerId,
  });

  // Calculate overall skill average from evaluation scores
  const calculateOverallSkillAverage = (evalData: any): number => {
    if (!evalData?.scores) return 0;
    
    const scores = evalData.scores;
    let totalScore = 0;
    let totalSkills = 0;
    
    Object.values(scores).forEach((category: any) => {
      if (category && typeof category === 'object') {
        Object.values(category).forEach((skillValue: any) => {
          if (typeof skillValue === 'number') {
            totalScore += skillValue;
            totalSkills++;
          }
        });
      }
    });
    
    if (totalSkills === 0) return 0;
    
    // Average is out of 5, convert to percentage
    const average = totalScore / totalSkills;
    return Math.round((average / 5) * 100);
  };

  const skillScore = calculateOverallSkillAverage(evaluation);

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#e5e7eb"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="url(#skillsGradient)"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - skillScore / 100)}`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="skillsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Target className="w-5 h-5 text-blue-600" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Skills</span>
        <span className="text-sm font-semibold text-gray-900">{skillScore}%</span>
      </div>
    </div>
  );
}

// Enhanced Player Card Component with Payment Status
function EnhancedPlayerCard({ 
  player, 
  payments,
  programs,
  parentId
}: { 
  player: any; 
  payments?: Payment[];
  programs?: Program[];
  parentId?: string;
}) {
  const { data: teamData } = useQuery<any>({
    queryKey: [`/api/users/${player.id}/team`],
    enabled: !!player.id,
  });

  // Derive payment status for this player
  const { status, plan } = derivePlayerStatus(
    payments, 
    programs, 
    player.id, 
    parentId,
    player.packageSelected
  );
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);

  return (
    <Card
      className="transition-shadow"
      data-testid={`player-card-${player.id}`}
    >
      <CardContent className="p-6">
        {/* Header with Avatar and Status */}
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

        {/* Player Name */}
        <h3 className="text-lg font-semibold mb-1" data-testid={`player-name-${player.id}`}>
          {player.firstName} {player.lastName}
        </h3>

        {/* Team Name */}
        {teamData?.name && (
          <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
            <User className="w-3 h-3" />
            {teamData.name}
          </p>
        )}

        {/* Payment Status Indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColor}`} data-testid={`status-indicator-${player.id}`}></span>
            <span className="text-sm font-medium" data-testid={`status-label-${player.id}`}>{statusLabel}</span>
          </div>
          {plan && (
            <span className="text-xs text-gray-400" data-testid={`plan-name-${player.id}`}>{plan}</span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4"></div>

        {/* Awards and Skills Indicators */}
        <div className="space-y-3">
          <CompactAwardsIndicator playerId={player.id} />
          <SkillsIndicator playerId={player.id} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function UnifiedAccount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedChildPerEvent, setSelectedChildPerEvent] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [selectedChildForModal, setSelectedChildForModal] = useState<string>("");
  const tabsRef = useDragScroll();
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // View selector state (parent or player dashboard)
  const [selectedView, setSelectedView] = useState<string>("parent");

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
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Fetch payments
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Fetch programs (packages)
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
  });

  const upcomingEvents = events
    .filter((e: any) => new Date(e.startTime) > new Date())
    .slice(0, 3);

  // All upcoming events for Events tab
  const allUpcomingEvents = events
    .filter((e: any) => new Date(e.startTime) > new Date())
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pendingPayments = payments.filter((p: any) => p.status === "pending");
  const nextPaymentDue = pendingPayments.length > 0 ? pendingPayments[0] : null;

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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {user?.role === "admin" && (
                <Button
                  onClick={() => setLocation("/admin-dashboard")}
                  variant="outline"
                  data-testid="button-admin"
                  className="w-full sm:w-auto"
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
                  className="w-full sm:w-auto"
                >
                  <User className="w-4 h-4 mr-2" />
                  Coach
                </Button>
              )}
            </div>
          </div>

          {/* View Selector Dropdown */}
          {players.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Switch View
              </label>
              <Select 
                value={selectedView} 
                onValueChange={(value) => {
                  if (value === "parent") {
                    setSelectedView("parent");
                  } else {
                    // Navigate to player dashboard
                    localStorage.setItem("selectedPlayerId", value);
                    setLocation("/player-dashboard");
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-64" data-testid="select-view-switcher">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent" data-testid="view-option-parent">
                    Parent Dashboard
                  </SelectItem>
                  {players.map((player: any) => (
                    <SelectItem 
                      key={player.id} 
                      value={player.id}
                      data-testid={`view-option-player-${player.id}`}
                    >
                      {player.firstName} {player.lastName} - Player Dashboard
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="home">
          <div ref={tabsRef} className="overflow-x-auto hide-scrollbar drag-scroll mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto bg-transparent border-b border-gray-200 rounded-none p-0 h-auto gap-0">
              <TabsTrigger value="home" data-testid="tab-home" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <User className="w-4 h-4 mr-2" />
                Home
              </TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <DollarSign className="w-4 h-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
            </TabsList>
          </div>

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
                    <EnhancedPlayerCard
                      key={player.id}
                      player={player}
                      payments={payments}
                      programs={programs}
                      parentId={user?.id}
                    />
                  ))}
                </div>
              )}
            </div>

          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>View and manage your payments</CardDescription>
                  </div>
                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-make-payment">
                        <Plus className="w-4 h-4 mr-2" />
                        Make Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md" data-testid="dialog-make-payment">
                      <DialogHeader>
                        <DialogTitle>Make a Payment</DialogTitle>
                        <DialogDescription>
                          Select a package and player to purchase
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Package Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Package</label>
                          <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                            <SelectTrigger data-testid="select-package">
                              <SelectValue placeholder="Select a package" />
                            </SelectTrigger>
                            <SelectContent>
                              {programs?.filter(p => p.price && p.price > 0).map((program: any) => (
                                <SelectItem key={program.id} value={program.id} data-testid={`package-option-${program.id}`}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{program.name}</span>
                                    <span className="ml-4 text-sm text-gray-600">
                                      ${(program.price / 100).toFixed(2)}
                                      {program.billingCycle && ` / ${program.billingCycle}`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                              {(!programs || programs.filter((p: any) => p.price && p.price > 0).length === 0) && (
                                <SelectItem value="none" disabled>No packages available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Player Selection (for per-player billing) */}
                        {selectedPackage && (() => {
                          const pkg = programs?.find((p: any) => p.id === selectedPackage);
                          const billingModel = pkg?.billingModel?.toLowerCase().replace(/[-\s]/g, '_') || '';
                          const isPerPlayer = billingModel.includes('player') && !billingModel.includes('family');
                          
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {isPerPlayer ? "Player (required)" : "Player (optional)"}
                              </label>
                              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                                <SelectTrigger data-testid="select-player">
                                  <SelectValue placeholder={isPerPlayer ? "Select a player" : "All players"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {!isPerPlayer && (
                                    <SelectItem value="" data-testid="player-option-all">
                                      All Players (Family Plan)
                                    </SelectItem>
                                  )}
                                  {players?.map((player: any) => (
                                    <SelectItem key={player.id} value={player.id} data-testid={`player-option-${player.id}`}>
                                      {player.firstName} {player.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isPerPlayer && (
                                <p className="text-xs text-gray-600">
                                  This is a per-player package. Select which player this payment is for.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Package Details */}
                        {selectedPackage && (() => {
                          const pkg = programs?.find((p: any) => p.id === selectedPackage);
                          return pkg && (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                              <h4 className="font-semibold">{pkg.name}</h4>
                              {(pkg as any).description && (
                                <p className="text-sm text-gray-600">{(pkg as any).description}</p>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="font-medium">Total:</span>
                                <span className="text-lg font-bold">${((pkg.price || 0) / 100).toFixed(2)}</span>
                              </div>
                              {pkg.billingModel && (
                                <p className="text-xs text-gray-600">
                                  Billing: {pkg.billingModel}
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setPaymentDialogOpen(false)}
                            className="flex-1"
                            data-testid="button-cancel-payment"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={async () => {
                              if (!selectedPackage) {
                                toast({
                                  title: "Error",
                                  description: "Please select a package",
                                  variant: "destructive",
                                });
                                return;
                              }

                              const pkg = programs?.find((p: any) => p.id === selectedPackage);
                              const billingModel = pkg?.billingModel?.toLowerCase().replace(/[-\s]/g, '_') || '';
                              const isPerPlayer = billingModel.includes('player') && !billingModel.includes('family');

                              if (isPerPlayer && !selectedPlayer) {
                                toast({
                                  title: "Error",
                                  description: "Please select a player for this per-player package",
                                  variant: "destructive",
                                });
                                return;
                              }

                              setIsProcessingPayment(true);
                              try {
                                // Create checkout session
                                const response = await apiRequest("/api/payments/create-checkout", {
                                  method: "POST",
                                  data: {
                                    packageId: selectedPackage,
                                    playerId: selectedPlayer || null,
                                  },
                                }) as { url: string };

                                // Redirect to Stripe checkout
                                window.location.href = response.url;
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to create checkout session",
                                  variant: "destructive",
                                });
                                setIsProcessingPayment(false);
                              }
                            }}
                            className="flex-1"
                            disabled={!selectedPackage || isProcessingPayment}
                            data-testid="button-proceed-payment"
                          >
                            {isProcessingPayment ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Proceed to Checkout
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Check in your children to upcoming events</CardDescription>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex justify-center py-8" data-testid="loading-events">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : players.length === 0 ? (
                  <div className="text-center py-8" data-testid="no-children-message">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Children Added</h3>
                    <p className="text-gray-600 mb-4">
                      Add a child to your account to check them in to events
                    </p>
                    <Button
                      onClick={() => setLocation("/add-player")}
                      data-testid="button-add-child-from-events"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Child
                    </Button>
                  </div>
                ) : allUpcomingEvents.length === 0 ? (
                  <div className="text-center py-8" data-testid="no-events-message">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                    <p className="text-gray-600">
                      There are no upcoming events scheduled at this time
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {allUpcomingEvents.map((event: any) => {
                      const eventId = String(event.id);
                      const selectedChildId = selectedChildPerEvent[eventId] || players[0]?.id;
                      const selectedChild = players.find((p: any) => p.id === selectedChildId);

                      return (
                        <Card 
                          key={event.id} 
                          className="border-2 cursor-pointer hover:border-red-500 transition-colors" 
                          data-testid={`event-card-${event.id}`}
                          onClick={() => {
                            setSelectedEvent(event as Event);
                            setSelectedChildForModal(selectedChildId);
                            setEventDetailOpen(true);
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Event Details */}
                              <div>
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="text-xl font-semibold" data-testid={`event-title-${event.id}`}>
                                    {event.title}
                                  </h3>
                                  <Badge variant="outline" data-testid={`event-type-${event.id}`}>
                                    {event.eventType || "Event"}
                                  </Badge>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span data-testid={`event-time-${event.id}`}>
                                      {new Date(event.startTime).toLocaleDateString('en-US', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span data-testid={`event-location-${event.id}`}>{event.location}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Child Selection Dropdown */}
                              {players.length > 1 && (
                                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                  <label 
                                    className="text-sm font-medium" 
                                    data-testid={`label-select-child-${event.id}`}
                                  >
                                    Select Child for RSVP/Check-In
                                  </label>
                                  <Select
                                    value={selectedChildId}
                                    onValueChange={(value) => 
                                      setSelectedChildPerEvent(prev => ({ ...prev, [eventId]: value }))
                                    }
                                  >
                                    <SelectTrigger 
                                      className="w-full" 
                                      data-testid={`select-child-${event.id}`}
                                    >
                                      <SelectValue placeholder="Select a child" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {players.map((player: any) => (
                                        <SelectItem 
                                          key={player.id} 
                                          value={player.id}
                                          data-testid={`select-child-option-${event.id}-${player.id}`}
                                        >
                                          {player.firstName} {player.lastName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Single Child Display */}
                              {players.length === 1 && (
                                <div className="flex items-center gap-2 text-sm" data-testid={`single-child-${event.id}`}>
                                  <User className="w-4 h-4 text-gray-600" />
                                  <span className="font-medium">
                                    For: {selectedChild?.firstName} {selectedChild?.lastName}
                                  </span>
                                </div>
                              )}

                              {/* Click to view details */}
                              <div className="pt-2 border-t text-sm text-gray-500 text-center">
                                Click to view details and RSVP/Check-In
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Detail Modal */}
      {selectedChildForModal && (
        <>
          <EventDetailModal
            event={selectedEvent}
            userId={selectedChildForModal}
            userRole="parent"
            open={eventDetailOpen}
            onOpenChange={setEventDetailOpen}
          />
          {eventDetailOpen && selectedEvent && (
            <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-blue-500 z-50">
              <p className="text-sm font-medium text-gray-700">
                RSVP/Check-In for: <span className="text-blue-600 font-semibold">
                  {players.find((p: any) => p.id === selectedChildForModal)?.firstName}{' '}
                  {players.find((p: any) => p.id === selectedChildForModal)?.lastName}
                </span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
