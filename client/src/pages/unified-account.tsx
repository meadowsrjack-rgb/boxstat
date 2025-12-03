import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  User,
  MapPin,
  Clock,
  Target,
  Plus,
  CreditCard,
  Check,
  Eye,
  Lock,
  Unlock,
  AlertTriangle,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { PINDialog } from "@/components/PINDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PaymentHistory } from "@/components/PaymentHistory";

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

  // Calculate total awards earned (totalBadges + totalTrophies from API response)
  const totalEarned = (awardsData?.totalBadges || 0) + (awardsData?.totalTrophies || 0);

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

// Settings Danger Zone Component for Account Deletion
function SettingsDangerZone({ user }: { user: any }) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const userEmail = user?.email || "";
  const userRole = user?.role || "";
  
  const handleDeleteAccount = async () => {
    if (confirmEmail !== userEmail) {
      toast({ title: "Email doesn't match", description: "Please enter your email exactly as shown.", variant: "destructive" });
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { 
        method: "POST", 
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail })
      });
      
      if (res.ok) {
        toast({ title: "Account deleted", description: "Your account has been deactivated successfully." });
        queryClient.clear();
        window.location.href = "/";
      } else {
        const data = await res.json();
        toast({ title: "Delete failed", description: data.message || "Could not delete account.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Delete failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-red-700">Delete account</div>
              <div className="text-xs text-red-600">
                Your account will be deactivated and data removed.
                {(userRole === "parent" || userRole === "admin") && " This includes all linked player profiles."}
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-unified-delete-account"
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">This action cannot be undone!</p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                <li>Your account will be deactivated</li>
                <li>Your login credentials will be removed</li>
                {(userRole === "parent" || userRole === "admin") && (
                  <li>All linked player profiles will also be deactivated</li>
                )}
                <li>Any active subscriptions will be cancelled</li>
                <li>You will lose access to all features and history</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                To confirm, please type your email address:
              </p>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded">{userEmail}</p>
              <Input
                type="email"
                placeholder="Enter your email to confirm"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="border-red-200 focus:border-red-500"
                data-testid="input-unified-confirm-email"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setConfirmEmail("");
              }}
              disabled={isDeleting}
              data-testid="button-unified-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmEmail !== userEmail}
              data-testid="button-unified-confirm-delete"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Enhanced Player Card Component with Payment Status
function EnhancedPlayerCard({ 
  player, 
  payments,
  programs,
  parentId,
  onViewDashboard,
  onToggleLock
}: { 
  player: any; 
  payments?: Payment[];
  programs?: Program[];
  parentId?: string;
  onViewDashboard: (playerId: string) => void;
  onToggleLock: (playerId: string) => void;
}) {
  const [isDeviceLocked, setIsDeviceLocked] = useState(
    localStorage.getItem("deviceLockedToPlayer") === player.id
  );
  
  const { data: teamData } = useQuery<any>({
    queryKey: [`/api/users/${player.id}/team`],
    enabled: !!player.id,
  });

  // Listen for lock changes
  useEffect(() => {
    const checkLockStatus = () => {
      setIsDeviceLocked(localStorage.getItem("deviceLockedToPlayer") === player.id);
    };
    
    window.addEventListener('deviceLockChanged', checkLockStatus);
    window.addEventListener('storage', checkLockStatus);
    
    return () => {
      window.removeEventListener('deviceLockChanged', checkLockStatus);
      window.removeEventListener('storage', checkLockStatus);
    };
  }, [player.id]);

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
      className="transition-all hover:shadow-md border-0 shadow-sm bg-white"
      data-testid={`player-card-${player.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={player.profileImageUrl} alt={`${player.firstName} ${player.lastName}`} />
            <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-lg font-bold">
              {player.firstName?.[0]}{player.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate" data-testid={`player-name-${player.id}`}>
                {player.firstName} {player.lastName}
              </h3>
              {player.teamAssignmentStatus === "pending" && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-[10px] px-1.5 py-0">
                  Pending
                </Badge>
              )}
              {isDeviceLocked && (
                <Lock className="h-3 w-3 text-red-500 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-0.5">
              {teamData?.name && (
                <span className="text-xs text-gray-500 truncate">
                  {teamData.name}
                </span>
              )}
              {teamData?.name && <span className="text-gray-300">•</span>}
              <div className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} data-testid={`status-indicator-${player.id}`}></span>
                <span className="text-xs text-gray-500" data-testid={`status-label-${player.id}`}>{statusLabel}</span>
              </div>
            </div>
          </div>
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
  
  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [playerToLock, setPlayerToLock] = useState<string | null>(null);
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Check if device is locked - redirect to player dashboard if so
  useEffect(() => {
    const lockedPlayerId = localStorage.getItem("deviceLockedToPlayer");
    if (lockedPlayerId) {
      localStorage.setItem("selectedPlayerId", lockedPlayerId);
      setLocation("/player-dashboard");
    }
  }, [setLocation]);

  // Check for payment success in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (urlParams.get('payment') === 'success' && sessionId) {
      // Verify the session and create payment record
      apiRequest('/api/payments/verify-session', {
        method: 'POST',
        data: { sessionId },
      })
        .then(data => {
          if (data.success) {
            toast({
              title: "Payment Successful!",
              description: "Your payment has been processed successfully.",
            });
            
            // Refetch payment data
            queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
            queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
          } else {
            toast({
              title: "Payment Verification",
              description: data.message || "Payment is being processed.",
              variant: "default",
            });
          }
        })
        .catch(error => {
          console.error('Error verifying payment:', error);
          toast({
            title: "Payment Status",
            description: "Payment completed. Refresh the page to see updates.",
            variant: "default",
          });
        })
        .finally(() => {
          // Clean up the URL
          window.history.replaceState({}, '', '/unified-account');
        });
    } else if (urlParams.get('payment') === 'success') {
      // Fallback for old URLs without session_id
      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
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

  const handleViewDashboard = (playerId: string) => {
    localStorage.setItem("selectedPlayerId", playerId);
    setLocation("/player-dashboard");
  };

  const handleToggleLock = (playerId: string) => {
    const currentLock = localStorage.getItem("deviceLockedToPlayer");
    
    if (currentLock === playerId) {
      // Unlock the device (no PIN needed from unified account)
      localStorage.removeItem("deviceLockedToPlayer");
      localStorage.removeItem("deviceLockPIN");
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('deviceLockChanged'));
      
      toast({
        title: "Device Unlocked",
        description: "You can now access all player dashboards and the account page.",
      });
    } else {
      // Show PIN dialog to lock the device
      setPlayerToLock(playerId);
      setPinDialogOpen(true);
    }
  };
  
  const handlePinSuccess = (pin: string) => {
    if (!playerToLock) return;
    
    // Save PIN and lock device
    localStorage.setItem("deviceLockPIN", pin);
    localStorage.setItem("deviceLockedToPlayer", playerToLock);
    localStorage.setItem("selectedPlayerId", playerToLock);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('deviceLockChanged'));
    
    toast({
      title: "Device Locked",
      description: `This device is now locked to ${players.find((p: any) => p.id === playerToLock)?.firstName}'s dashboard.`,
    });
    
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
      <div className="flex-1 bg-gray-50 safe-bottom flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 safe-bottom overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/profile-gateway")}
                data-testid="button-switch-profile"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900" data-testid="text-welcome">
                  Welcome, {user?.firstName || "User"}!
                </h1>
                <p className="text-gray-600 mt-1">Manage your account and players</p>
              </div>
            </div>
            <NotificationBell />
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Announcement Banner */}
        <AnnouncementBanner />
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
                      onViewDashboard={handleViewDashboard}
                      onToggleLock={handleToggleLock}
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
                    <CardTitle>Make a Payment</CardTitle>
                    <CardDescription>Purchase packages and memberships</CardDescription>
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
                                  {program.name}
                                </SelectItem>
                              ))}
                              {(!programs || programs.filter((p: any) => p.price && p.price > 0).length === 0) && (
                                <SelectItem value="none" disabled>No packages available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Player Selection (conditionally shown based on billing model) */}
                        {selectedPackage && (() => {
                          const pkg = programs?.find((p: any) => p.id === selectedPackage);
                          const billingModel = (pkg?.billingModel || 'Per Player').toLowerCase().replace(/[^a-z]/g, '');
                          const requiresPlayerSelection = billingModel.includes('player') && !billingModel.includes('family') && !billingModel.includes('organization');
                          
                          if (!requiresPlayerSelection) {
                            return null;
                          }
                          
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Player *</label>
                              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                                <SelectTrigger data-testid="select-player">
                                  <SelectValue placeholder="Select a player" />
                                </SelectTrigger>
                                <SelectContent>
                                  {players?.map((player: any) => (
                                    <SelectItem key={player.id} value={player.id} data-testid={`player-option-${player.id}`}>
                                      {player.firstName} {player.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-600">
                                This is a per-player package. Select which player this payment is for.
                              </p>
                            </div>
                          );
                        })()}

                        {/* Package Details */}
                        {selectedPackage && (() => {
                          const pkg = programs?.find((p: any) => p.id === selectedPackage);
                          return pkg && (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                              <h4 className="font-semibold">{pkg.name}</h4>
                              {(pkg as any).description && (
                                <p className="text-sm text-gray-600">{(pkg as any).description}</p>
                              )}
                              
                              <div className="flex gap-2 flex-wrap">
                                {(pkg as any).type && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {(pkg as any).type}
                                  </span>
                                )}
                                {pkg.billingModel && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {pkg.billingModel}
                                  </span>
                                )}
                                {(pkg as any).type === "Subscription" && (pkg as any).billingCycle && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                    {(pkg as any).billingCycle}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="font-medium">Total:</span>
                                <div className="text-right">
                                  <span className="text-lg font-bold">${((pkg.price || 0) / 100).toFixed(2)}</span>
                                  {(pkg as any).type === "Subscription" && (pkg as any).billingCycle && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      per {(pkg as any).billingCycle.toLowerCase()}
                                    </p>
                                  )}
                                </div>
                              </div>
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
                              const billingModel = (pkg?.billingModel || 'Per Player').toLowerCase().replace(/[^a-z]/g, '');
                              const requiresPlayerSelection = billingModel.includes('player') && !billingModel.includes('family') && !billingModel.includes('organization');

                              if (requiresPlayerSelection && !selectedPlayer) {
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
            </Card>
            
            {/* Payment History Component */}
            <PaymentHistory />
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
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Danger Zone */}
            <SettingsDangerZone user={user} />
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

      {/* PIN Dialog */}
      <PINDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        mode="set"
        onSuccess={handlePinSuccess}
        title="Set Lock PIN"
        description={`Create a 4-digit PIN to lock this device to ${players.find((p: any) => p.id === playerToLock)?.firstName}'s dashboard`}
      />

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
