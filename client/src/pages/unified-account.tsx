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
  ShoppingBag,
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

// Interactive Family Calendar Component
function FamilyCalendar({ 
  events, 
  players,
  selectedChildPerEvent,
  setSelectedChildPerEvent,
  onEventClick 
}: { 
  events: any[];
  players: any[];
  selectedChildPerEvent: Record<string, string>;
  setSelectedChildPerEvent: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onEventClick: (event: any, playerId: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };
  
  const getEventsForDate = (date: Date) => {
    return events.filter((event: any) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };
  
  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };
  
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Calendar</h2>
      <Card>
        <CardContent className="p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-lg font-semibold" data-testid="text-calendar-month">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          </div>
          
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-10" />;
              }
              
              const dateEvents = getEventsForDate(date);
              const hasEvents = dateEvents.length > 0;
              const isToday = date.getTime() === today.getTime();
              const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
              const isPast = date < today;
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    h-10 rounded-lg flex flex-col items-center justify-center relative
                    transition-colors
                    ${isSelected ? 'bg-red-600 text-white' : ''}
                    ${isToday && !isSelected ? 'bg-red-100 text-red-700 font-bold' : ''}
                    ${!isSelected && !isToday ? 'hover:bg-gray-100' : ''}
                    ${isPast && !isToday && !isSelected ? 'text-gray-400' : ''}
                  `}
                  data-testid={`calendar-day-${date.getDate()}`}
                >
                  <span className="text-sm">{date.getDate()}</span>
                  {hasEvents && (
                    <div className={`absolute bottom-1 flex gap-0.5`}>
                      {dateEvents.slice(0, 3).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} 
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-semibold mb-3" data-testid="text-selected-date">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No events on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event: any) => {
                    const eventId = String(event.id);
                    const selectedChildId = selectedChildPerEvent[eventId] || players[0]?.id;
                    const selectedChild = players.find((p: any) => p.id === selectedChildId);
                    
                    return (
                      <div
                        key={event.id}
                        className="p-3 bg-gray-50 rounded-lg"
                        data-testid={`calendar-event-${event.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(event.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {event.eventType || 'Event'}
                          </Badge>
                        </div>
                        
                        {/* Player Selection for multi-child families */}
                        {players.length > 1 && (
                          <div className="mt-2 pt-2 border-t">
                            <Select
                              value={selectedChildId}
                              onValueChange={(value) => 
                                setSelectedChildPerEvent(prev => ({ ...prev, [eventId]: value }))
                              }
                            >
                              <SelectTrigger className="h-7 text-xs" data-testid={`calendar-select-child-${event.id}`}>
                                <User className="w-3 h-3 mr-1" />
                                <SelectValue placeholder="Select player" />
                              </SelectTrigger>
                              <SelectContent>
                                {players.map((player: any) => (
                                  <SelectItem key={player.id} value={player.id}>
                                    {player.firstName} {player.lastName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {/* Single player display */}
                        {players.length === 1 && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-1 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>{selectedChild?.firstName} {selectedChild?.lastName}</span>
                          </div>
                        )}
                        
                        {/* View Details Button - explicit action to open modal */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onEventClick(event, selectedChildId)}
                          data-testid={`calendar-view-event-${event.id}`}
                        >
                          View Details & RSVP
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
  
  const { data: teamsData = [] } = useQuery<Array<{id: number; name: string; ageGroup: string; program: string}>>({
    queryKey: [`/api/users/${player.id}/teams`],
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
  
  // Active subscriptions from player data (added by backend)
  const activeSubscriptions = player.activeSubscriptions || [];

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
            <div className="flex items-center gap-2 flex-wrap">
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
              {teamsData.length > 0 && (
                <span className="text-xs text-gray-500 truncate">
                  {teamsData.map(t => t.name).join(', ')}
                </span>
              )}
              {teamsData.length > 0 && <span className="text-gray-300">•</span>}
              <div className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${statusColor}`} data-testid={`status-indicator-${player.id}`}></span>
                <span className="text-xs text-gray-500" data-testid={`status-label-${player.id}`}>{statusLabel}</span>
              </div>
            </div>
            
            {activeSubscriptions.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {activeSubscriptions.map((sub: any) => (
                  <Badge 
                    key={sub.id} 
                    variant="outline" 
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
                    data-testid={`subscription-badge-${sub.id}`}
                  >
                    {sub.productName}
                  </Badge>
                ))}
              </div>
            )}
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
  const [isStoreItemPurchase, setIsStoreItemPurchase] = useState(false);
  
  // Check if device is locked - redirect to player dashboard if so
  useEffect(() => {
    const lockedPlayerId = localStorage.getItem("deviceLockedToPlayer");
    if (lockedPlayerId) {
      localStorage.setItem("selectedPlayerId", lockedPlayerId);
      setLocation("/player-dashboard");
    }
  }, [setLocation]);

  // Check for payment success in URL (including iOS auth token restoration)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const authToken = urlParams.get('auth_token');
    
    // If auth_token is present (iOS Stripe redirect), restore session first
    const isIOSRedirect = !!authToken;
    if (authToken) {
      console.log('[iOS Payment] Auth token detected, restoring session...');
      localStorage.setItem('authToken', authToken);
      // Clean the auth token from URL immediately for security
      urlParams.delete('auth_token');
      const newUrl = urlParams.toString() 
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
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
              description: "Your new player has been added. Welcome to the team!",
            });
            
            // Refetch payment data
            queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
            queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
            queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
            
            // For iOS, redirect to profile gateway to show the new player
            if (isIOSRedirect) {
              console.log('[iOS Payment] Redirecting to profile gateway...');
              setTimeout(() => {
                setLocation('/profile-selection');
              }, 1500);
            }
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
          // Clean up the URL (only if not iOS redirect, which navigates away)
          if (!isIOSRedirect) {
            window.history.replaceState({}, '', '/unified-account');
          }
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
      <>
        <div className="ios-full-bleed" />
        <div className="fixed inset-0 w-full h-full bg-gray-50 z-0 pointer-events-none" />
        <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ios-full-bleed" />
      <div className="fixed inset-0 w-full h-full bg-gray-50 z-0 pointer-events-none" />
      <div className="scrollable-page relative z-10 bg-transparent">
      {/* Header */}
      <div className="bg-white border-b safe-top sticky top-0 z-50">
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
            </TabsList>
          </div>

          {/* Home Tab */}
          <TabsContent value="home" className="space-y-6">
            {/* Upcoming Events Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
              {eventsLoading ? (
                <div className="flex justify-center py-8" data-testid="loading-events">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : allUpcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                    <p className="text-gray-600">There are no upcoming events scheduled at this time</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {allUpcomingEvents.slice(0, 5).map((event: any) => {
                    const eventId = String(event.id);
                    const selectedChildId = selectedChildPerEvent[eventId] || players[0]?.id;
                    const selectedChild = players.find((p: any) => p.id === selectedChildId);

                    return (
                      <Card 
                        key={event.id} 
                        className="cursor-pointer hover:border-red-500 transition-colors" 
                        data-testid={`event-card-${event.id}`}
                        onClick={() => {
                          // Create a clean copy to avoid cyclic structure issues from React Query cache
                          const cleanEvent = JSON.parse(JSON.stringify(event)) as Event;
                          setSelectedEvent(cleanEvent);
                          setSelectedChildForModal(selectedChildId);
                          setEventDetailOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold" data-testid={`event-title-${event.id}`}>
                                  {event.title}
                                </h3>
                                <Badge variant="outline" className="text-xs" data-testid={`event-type-${event.id}`}>
                                  {event.eventType || "Event"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span data-testid={`event-time-${event.id}`}>
                                    {new Date(event.startTime).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[150px]" data-testid={`event-location-${event.id}`}>
                                    {event.location}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Player Selection for multi-child families */}
                              {players.length > 1 && (
                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                  <Select
                                    value={selectedChildId}
                                    onValueChange={(value) => 
                                      setSelectedChildPerEvent(prev => ({ ...prev, [eventId]: value }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs w-auto" data-testid={`select-child-${event.id}`}>
                                      <User className="w-3 h-3 mr-1" />
                                      <SelectValue placeholder="Select player" />
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
                              
                              {/* Single player display */}
                              {players.length === 1 && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                  <User className="w-3 h-3" />
                                  <span>{selectedChild?.firstName} {selectedChild?.lastName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Interactive Calendar Section */}
            <FamilyCalendar 
              events={events} 
              players={players}
              selectedChildPerEvent={selectedChildPerEvent}
              setSelectedChildPerEvent={setSelectedChildPerEvent}
              onEventClick={(event, playerId) => {
                // Create a clean copy to avoid cyclic structure issues from React Query cache
                const cleanEvent = JSON.parse(JSON.stringify(event)) as Event;
                setSelectedEvent(cleanEvent);
                setSelectedChildForModal(playerId);
                setEventDetailOpen(true);
              }}
            />
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
                  <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
                    setPaymentDialogOpen(open);
                    if (!open) {
                      setIsStoreItemPurchase(false);
                      setSelectedPackage("");
                      setSelectedPlayer("");
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-make-payment" onClick={() => setIsStoreItemPurchase(false)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Make Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md" data-testid="dialog-make-payment">
                      <DialogHeader>
                        <DialogTitle>{isStoreItemPurchase ? "Purchase Item" : "Make a Payment"}</DialogTitle>
                        <DialogDescription>
                          {isStoreItemPurchase ? "Complete your store purchase" : "Select a package and player to purchase"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Package Selection - only show for program purchases */}
                        {!isStoreItemPurchase && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Package</label>
                            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                              <SelectTrigger data-testid="select-package">
                                <SelectValue placeholder="Select a package" />
                              </SelectTrigger>
                              <SelectContent>
                                {programs?.filter((p: any) => p.price && p.price > 0 && p.productCategory === 'service').map((program: any) => (
                                  <SelectItem key={program.id} value={program.id} data-testid={`package-option-${program.id}`}>
                                    {program.name}
                                  </SelectItem>
                                ))}
                                {(!programs || programs.filter((p: any) => p.price && p.price > 0 && p.productCategory === 'service').length === 0) && (
                                  <SelectItem value="none" disabled>No programs available</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Player Selection (conditionally shown based on billing model - not for store items) */}
                        {selectedPackage && !isStoreItemPurchase && (() => {
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
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

                        {/* Package/Item Details */}
                        {selectedPackage && (() => {
                          // Look up in the full programs array (contains both service and goods)
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                          if (!pkg) return null;
                          
                          const isStoreProduct = pkg.productCategory === 'goods';
                          
                          return (
                            <div className={`p-4 rounded-lg space-y-3 ${isStoreProduct ? 'bg-purple-50' : 'bg-gray-50'}`}>
                              <div className="flex items-start justify-between">
                                <h4 className="font-semibold">{pkg.name}</h4>
                                {isStoreProduct && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Store Item</span>
                                )}
                              </div>
                              {pkg.description && (
                                <p className="text-sm text-gray-600">{pkg.description}</p>
                              )}
                              
                              {!isStoreProduct && (
                                <div className="flex gap-2 flex-wrap">
                                  {pkg.type && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {pkg.type}
                                    </span>
                                  )}
                                  {pkg.billingModel && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {pkg.billingModel}
                                    </span>
                                  )}
                                  {pkg.type === "Subscription" && pkg.billingCycle && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      {pkg.billingCycle}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="font-medium">Total:</span>
                                <div className="text-right">
                                  <span className="text-lg font-bold">${((pkg.price || 0) / 100).toFixed(2)}</span>
                                  {!isStoreProduct && pkg.type === "Subscription" && pkg.billingCycle && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      per {pkg.billingCycle.toLowerCase()}
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
                                  description: "Please select a package or item",
                                  variant: "destructive",
                                });
                                return;
                              }

                              // Look up in full programs array (includes both services and goods)
                              const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                              if (!pkg) {
                                toast({
                                  title: "Error",
                                  description: "Selected item not found. Please try again.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              const isStoreProduct = pkg.productCategory === 'goods';
                              
                              // Store items don't require player selection
                              if (!isStoreProduct) {
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
                              }

                              setIsProcessingPayment(true);
                              try {
                                // Create checkout session - backend handles both program and store purchases
                                const response = await apiRequest("/api/payments/create-checkout", {
                                  method: "POST",
                                  data: {
                                    packageId: selectedPackage,
                                    playerId: isStoreProduct ? null : (selectedPlayer || null),
                                    isStoreItem: isStoreProduct,
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

            {/* Suggested Add-ons - Store Items */}
            {(() => {
              const storeItems = programs?.filter((p: any) => p.productCategory === 'goods' && p.isActive !== false && p.price && p.price > 0) || [];
              if (storeItems.length === 0) return null;
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Merchandise & Add-ons
                    </CardTitle>
                    <CardDescription>Physical products and gear</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {storeItems.slice(0, 6).map((item: any) => (
                        <div 
                          key={item.id} 
                          className="border rounded-lg p-4 hover:border-red-300 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedPackage(item.id);
                            setIsStoreItemPurchase(true);
                            setPaymentDialogOpen(true);
                          }}
                          data-testid={`store-item-${item.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm">{item.name}</h4>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Store</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">${(item.price / 100).toFixed(2)}</span>
                            <Button size="sm" variant="outline" className="text-xs">
                              Buy
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
            
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
    </>
  );
}
