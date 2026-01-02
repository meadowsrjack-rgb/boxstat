import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BanterLoader } from "@/components/BanterLoader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
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
  ChevronDown,
  ShoppingBag,
  Phone,
  Mail,
  Award,
  Shirt,
  Heart,
  AlertCircle,
  Ruler,
  Crown,
  Package,
  FileText,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useState, useRef } from "react";
import { PINDialog } from "@/components/PINDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PaymentHistory } from "@/components/PaymentHistory";
import UypTrophyRings from "@/components/UypTrophyRings";
import { authPersistence } from "@/services/authPersistence";

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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 30000, // Poll every 30 seconds for cross-session updates
  });

  // Calculate total awards earned from tierSummary or legacy count fields
  const calculateTotalEarned = () => {
    if (!awardsData) return 0;
    // Use tierSummary if available (new format with earned/total per tier)
    if (awardsData.tierSummary) {
      return Object.values(awardsData.tierSummary).reduce((sum: number, tier: any) => {
        return sum + (tier?.earned || 0);
      }, 0);
    }
    // Fallback to legacy count fields
    return (awardsData.trophiesCount || 0) + 
           (awardsData.hallOfFameBadgesCount || 0) + 
           (awardsData.superstarBadgesCount || 0) + 
           (awardsData.allStarBadgesCount || 0) + 
           (awardsData.starterBadgesCount || 0) + 
           (awardsData.prospectBadgesCount || 0);
  };
  const totalEarned = calculateTotalEarned();

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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 30000, // Poll every 30 seconds for cross-session updates
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
  onEventClick 
}: { 
  events: any[];
  onEventClick: (event: any) => void;
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
                  {selectedDateEvents.map((event: any) => (
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
                      
                      {/* View Details Button - player selection happens inside modal */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onEventClick(event)}
                        data-testid={`calendar-view-event-${event.id}`}
                      >
                        View Details & RSVP
                      </Button>
                    </div>
                  ))}
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

// Player Profile Card with comprehensive details for Profile tab
function PlayerProfileCard({ player }: { player: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: teamsData = [] } = useQuery<Array<{id: number; name: string; ageGroup: string; program: string}>>({
    queryKey: [`/api/users/${player.id}/teams`],
    enabled: !!player.id,
  });

  const { data: awardsData } = useQuery<any>({
    queryKey: [`/api/users/${player.id}/awards`],
    enabled: !!player.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 30000, // Poll every 30 seconds for cross-session updates
  });

  // Prepare rings data for trophy display (same format as coach dashboard)
  const ringsData = awardsData?.tierSummary ? {
    legacy: awardsData.tierSummary.legacy,
    hof: awardsData.tierSummary.hof,
    superstar: awardsData.tierSummary.superstar,
    allStar: awardsData.tierSummary.allStar,
    starter: awardsData.tierSummary.starter,
    prospect: awardsData.tierSummary.prospect,
  } : awardsData ? {
    legacy: { earned: awardsData.trophiesCount || 0, total: 1 },
    hof: { earned: awardsData.hallOfFameBadgesCount || 0, total: 1 },
    superstar: { earned: awardsData.superstarBadgesCount || 0, total: 1 },
    allStar: { earned: awardsData.allStarBadgesCount || 0, total: 1 },
    starter: { earned: awardsData.starterBadgesCount || 0, total: 1 },
    prospect: { earned: awardsData.prospectBadgesCount || 0, total: 1 },
  } : {
    legacy: { earned: 0, total: 1 },
    hof: { earned: 0, total: 1 },
    superstar: { earned: 0, total: 1 },
    allStar: { earned: 0, total: 1 },
    starter: { earned: 0, total: 1 },
    prospect: { earned: 0, total: 1 },
  };

  return (
    <Card className="border-0 shadow-sm" data-testid={`player-profile-card-${player.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14 flex-shrink-0">
            <AvatarImage src={player.profileImageUrl} alt={`${player.firstName} ${player.lastName}`} />
            <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-lg font-bold">
              {player.firstName?.[0]}{player.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-lg text-gray-900" data-testid={`player-profile-name-${player.id}`}>
                {player.firstName} {player.lastName}
              </h3>
              <Badge variant="outline" className="capitalize text-xs">
                {player.role || 'Player'}
              </Badge>
            </div>
            
            {teamsData.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                <Users className="w-3.5 h-3.5" />
                <span>{teamsData.map(t => t.name).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Collapsible Details Dropdown */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg"
              data-testid={`toggle-player-details-${player.id}`}
            >
              <span className="text-sm font-medium text-gray-700">View Details</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3">
            <div className="space-y-4 pt-2 border-t">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                {player.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Date of Birth</span>
                      <span className="text-sm font-medium">
                        {new Date(player.dateOfBirth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}
                
                {player.jerseyNumber && (
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Jersey</span>
                      <span className="text-sm font-medium">#{player.jerseyNumber}</span>
                    </div>
                  </div>
                )}
                
                {player.position && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Position</span>
                      <span className="text-sm font-medium">{player.position}</span>
                    </div>
                  </div>
                )}
                
                {player.height && (
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Height</span>
                      <span className="text-sm font-medium">{player.height}</span>
                    </div>
                  </div>
                )}
                
                {(player.city || player.address) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">From</span>
                      <span className="text-sm font-medium">{player.city || player.address}</span>
                    </div>
                  </div>
                )}
                
              </div>
              
              {/* Trophy Rings - same as coach dashboard */}
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Awards & Achievements
                </h4>
                <div className="flex justify-center">
                  <UypTrophyRings data={ringsData} size={109} stroke={8} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                
                {player.schoolGrade && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500 block">Grade</span>
                      <span className="text-sm font-medium">{player.schoolGrade}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Emergency & Medical Section */}
              <div className="pt-3 border-t space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Emergency & Medical Info
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500 block mb-1">Emergency Contact</span>
                    <span className="font-medium">{player.emergencyContact || "Not set"}</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500 block mb-1">Emergency Phone</span>
                    <span className="font-medium">{player.emergencyPhone || "Not set"}</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500 block mb-1">Allergies</span>
                    <span className="font-medium">{player.allergies || "None listed"}</span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-500 block mb-1">Medical Info</span>
                    <span className="font-medium">{player.medicalInfo || "None listed"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Parent Messages Section Component
function ParentMessagesSection({ players, userId }: { players: any[]; userId?: string }) {
  const [activeChat, setActiveChat] = useState<{ type: 'team' | 'coach' | 'management'; teamId?: number; coachId?: string; teamName?: string } | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get unique teams from all players
  const playerTeams = players?.reduce((teams: any[], player: any) => {
    if (player.teamId && player.teamName) {
      const existing = teams.find(t => t.id === player.teamId);
      if (!existing) {
        teams.push({
          id: player.teamId,
          name: player.teamName,
          coachId: player.coachId,
          coachName: player.coachName || 'Coach',
          playerName: `${player.firstName} ${player.lastName}`,
        });
      }
    }
    return teams;
  }, []) || [];

  // Fetch team messages
  const { data: teamMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/teams', activeChat?.teamId, 'messages'],
    enabled: activeChat?.type === 'team' && !!activeChat?.teamId,
  });

  // Fetch direct messages with coach
  const { data: coachMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/direct-messages', userId, activeChat?.coachId],
    enabled: activeChat?.type === 'coach' && !!activeChat?.coachId && !!userId,
  });

  // Fetch contact management messages
  const { data: myContactMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/contact-management/my-messages'],
    enabled: activeChat?.type === 'management',
  });

  // Send team message mutation
  const sendTeamMessageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/teams/${activeChat?.teamId}/messages`, {
        method: 'POST',
        data: { message: newMessage },
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/teams', activeChat?.teamId, 'messages'] });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  // Send direct message to coach mutation
  const sendCoachMessageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/direct-messages', {
        method: 'POST',
        data: { 
          receiverId: activeChat?.coachId, 
          message: newMessage,
          teamId: activeChat?.teamId,
        },
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages', userId, activeChat?.coachId] });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  // Send contact management message mutation
  const sendManagementMessageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/contact-management', {
        method: 'POST',
        data: { message: newMessage },
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/contact-management/my-messages'] });
      toast({ title: "Message sent", description: "Management will respond soon." });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    if (activeChat?.type === 'team') {
      sendTeamMessageMutation.mutate();
    } else if (activeChat?.type === 'coach') {
      sendCoachMessageMutation.mutate();
    } else if (activeChat?.type === 'management') {
      sendManagementMessageMutation.mutate();
    }
  };

  const currentMessages = activeChat?.type === 'team' ? teamMessages :
    activeChat?.type === 'coach' ? coachMessages : myContactMessages;

  if (activeChat) {
    // Chat view
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveChat(null)} data-testid="button-back-to-chats">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-base">
                  {activeChat.type === 'team' && `${activeChat.teamName} - Team Chat`}
                  {activeChat.type === 'coach' && `Message Coach`}
                  {activeChat.type === 'management' && 'Contact Management'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeChat.type === 'team' && 'Parents & Coaches'}
                  {activeChat.type === 'coach' && activeChat.teamName}
                  {activeChat.type === 'management' && 'Get help from UYP staff'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {currentMessages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</p>
            ) : (
              currentMessages.map((msg: any) => {
                const isOwn = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isOwn ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {!isOwn && msg.sender && (
                        <div className="text-xs font-medium mb-1 opacity-70">
                          {msg.sender?.firstName} {msg.sender?.lastName}
                        </div>
                      )}
                      <p className="text-sm">{msg.message || msg.content}</p>
                      <div className={`text-xs mt-1 ${isOwn ? 'text-red-100' : 'text-gray-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              data-testid="input-chat-message"
            />
            <Button 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sendTeamMessageMutation.isPending || sendCoachMessageMutation.isPending || sendManagementMessageMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-send-message"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Chat list view
  return (
    <div className="space-y-4">
      {/* Contact Management - always show */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-red-600" />
            Contact Management
          </CardTitle>
          <CardDescription>Get help from UYP staff</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setActiveChat({ type: 'management' })}
            data-testid="button-contact-management"
          >
            <MessageSquare className="w-4 h-4 text-red-600" />
            Send a message to management
          </Button>
        </CardContent>
      </Card>

      {/* Team Chats */}
      {playerTeams.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Team Chats
            </CardTitle>
            <CardDescription>Chat with other parents and coaches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {playerTeams.map((team: any) => (
              <div key={team.id} className="border rounded-lg p-3 space-y-2">
                <div className="font-medium text-sm">{team.name}</div>
                <div className="text-xs text-gray-500 mb-2">Player: {team.playerName}</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setActiveChat({ type: 'team', teamId: team.id, teamName: team.name })}
                    data-testid={`button-team-chat-${team.id}`}
                  >
                    <Users className="w-3 h-3" />
                    Team Chat
                  </Button>
                  {team.coachId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => setActiveChat({ type: 'coach', teamId: team.id, coachId: team.coachId, teamName: team.name })}
                      data-testid={`button-message-coach-${team.id}`}
                    >
                      <Mail className="w-3 h-3" />
                      Message Coach
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No team chats available yet.</p>
              <p className="text-sm">Your players need to be assigned to teams first.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function UnifiedAccount() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
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
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [signedWaivers, setSignedWaivers] = useState<Record<string, boolean>>({});
  const [waiverScrollStatus, setWaiverScrollStatus] = useState<Record<string, boolean>>({});
  
  // Store tab state
  const [selectedStorePlayer, setSelectedStorePlayer] = useState<string>("");
  const [selectedStoreCategory, setSelectedStoreCategory] = useState<string>("");
  
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
      authPersistence.setToken(authToken);
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 30000, // Poll every 30 seconds for cross-session updates
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

  // Fetch player enrollments
  const { data: playerEnrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments"],
  });

  // Fetch pending quotes for current user
  const { data: pendingQuotes = [] } = useQuery<any[]>({
    queryKey: ["/api/account/quotes"],
  });

  // Fetch waivers for payment dialog
  const { data: waivers = [] } = useQuery<any[]>({
    queryKey: ["/api/waivers"],
  });

  // Fetch store items (goods) for add-ons
  const storeItems = (programs as any[])?.filter((p: any) => p.productCategory === 'goods' && p.isActive !== false) || [];

  // Get selected program for add-ons lookup
  const selectedProgram = (programs as any[])?.find((p: any) => p.id === selectedPackage);

  // Fetch suggested add-ons for the selected program
  const { data: suggestedAddOnsData = [] } = useQuery<{ addOn: { productId: string; displayOrder: number }; product: any }[]>({
    queryKey: ['/api/programs', selectedPackage, 'suggested-add-ons'],
    enabled: !!selectedPackage && !isStoreItemPurchase,
  });

  // Extract product IDs from the add-ons response
  const suggestedAddOnProducts = suggestedAddOnsData.map(a => a.product).filter(Boolean);
  const suggestedAddOnIds = suggestedAddOnProducts.map(p => p.id);
  const hasSuggestedAddOns = suggestedAddOnIds.length > 0;

  // Get required waivers for selected program
  const requiredWaiverIds = selectedProgram?.requiredWaivers || [];
  const requiredWaivers = waivers.filter((w: any) => requiredWaiverIds.includes(w.id) && w.isActive);

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
        <div className="fixed inset-0 w-full h-full bg-white z-0 pointer-events-none" />
        <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center">
          <BanterLoader />
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
              <TabsTrigger value="profile" data-testid="tab-profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <User className="w-4 h-4 mr-2" />
                Profile
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
                  <BanterLoader />
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
                  {allUpcomingEvents.slice(0, 5).map((event: any) => (
                    <Card 
                      key={event.id} 
                      className="cursor-pointer hover:border-red-500 transition-colors" 
                      data-testid={`event-card-${event.id}`}
                      onClick={() => {
                        // Create a clean copy to avoid cyclic structure issues from React Query cache
                        const cleanEvent = JSON.parse(JSON.stringify(event)) as Event;
                        setSelectedEvent(cleanEvent);
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Calendar Section */}
            <FamilyCalendar 
              events={events} 
              onEventClick={(event) => {
                // Create a clean copy to avoid cyclic structure issues from React Query cache
                const cleanEvent = JSON.parse(JSON.stringify(event)) as Event;
                setSelectedEvent(cleanEvent);
                setEventDetailOpen(true);
              }}
            />
          </TabsContent>

          {/* Payments Tab - Redesigned with Category-Based Storefront */}
          <TabsContent value="payments" className="space-y-6">
            {/* Pending Quotes Section */}
            {pendingQuotes.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <FileText className="w-5 h-5" />
                    Personalized Offers for You
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingQuotes.map((quote: any) => (
                      <div 
                        key={quote.id} 
                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100"
                        data-testid={`quote-${quote.id}`}
                      >
                        <div>
                          <p className="font-medium">
                            {quote.items?.map((i: any) => i.productName).join(', ') || 'Custom Package'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Created {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg text-red-600">
                            ${((quote.totalAmount || 0) / 100).toFixed(2)}
                          </span>
                          <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => window.location.href = `/checkout/${quote.id}`}
                            data-testid={`button-checkout-quote-${quote.id}`}
                          >
                            Complete Checkout
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" data-testid="heading-payments-store">Programs & Gear</h2>
                <p className="text-gray-500 text-sm">Browse programs and invest in your player's development</p>
              </div>
            </div>

            {/* Category-Based Store Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" data-testid="store-categories">
              {[
                { id: "programs", label: "Programs", icon: <Crown className="w-8 h-8" />, color: "from-red-500 to-red-600", desc: "Memberships & subscriptions", typeMatch: ["Subscription", "Program"] },
                { id: "training", label: "Training & Camps", icon: <Target className="w-8 h-8" />, color: "from-blue-500 to-blue-600", desc: "Private sessions, camps", typeMatch: ["Pack", "One-Time"] },
                { id: "gear", label: "Gear & Apparel", icon: <Shirt className="w-8 h-8" />, color: "from-purple-500 to-purple-600", desc: "Jerseys, equipment", productCategory: "goods" },
                { id: "digital", label: "Digital Academy", icon: <Trophy className="w-8 h-8" />, color: "from-green-500 to-green-600", desc: "Online training programs", typeMatch: ["Program"] },
              ].map((category) => {
                const categoryItems = programs?.filter((p: any) => {
                  const tags = p.tags || [];
                  const isActive = p.isActive !== false;
                  const hasPrice = p.price && p.price > 0;
                  if (!isActive || !hasPrice) return false;
                  
                  // First check tags if available
                  if (tags.length > 0 && tags.includes(category.id)) return true;
                  
                  // Fallback: match by type or productCategory
                  if ((category as any).productCategory && p.productCategory === (category as any).productCategory) return true;
                  if ((category as any).typeMatch && (category as any).typeMatch.includes(p.type)) return true;
                  
                  return false;
                }) || [];
                
                return (
                  <div
                    key={category.id}
                    className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${category.color} p-4 cursor-pointer hover:scale-105 transition-transform shadow-lg`}
                    onClick={() => setSelectedStoreCategory(selectedStoreCategory === category.id ? "" : category.id)}
                    data-testid={`category-tile-${category.id}`}
                  >
                    <div className="text-white/90 mb-2">{category.icon}</div>
                    <h3 className="text-white font-bold text-sm">{category.label}</h3>
                    <p className="text-white/70 text-xs">{category.desc}</p>
                    {categoryItems.length > 0 && (
                      <Badge className="absolute top-2 right-2 bg-white/20 text-white border-0">
                        {categoryItems.length}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Products Grid - Filtered by Category */}
            {(() => {
              const categoryConfig: Record<string, { typeMatch?: string[], productCategory?: string }> = {
                programs: { typeMatch: ["Subscription", "Program"] },
                training: { typeMatch: ["Pack", "One-Time"] },
                gear: { productCategory: "goods" },
                digital: { typeMatch: ["Program"] },
              };
              
              const filteredProducts = programs?.filter((p: any) => {
                const tags = p.tags || [];
                const isActive = p.isActive !== false;
                const hasPrice = p.price && p.price > 0;
                if (!isActive || !hasPrice) return false;
                
                if (!selectedStoreCategory) return true; // Show all when no filter
                
                // Check tags first - explicit tag match takes priority
                if (tags.length > 0 && tags.includes(selectedStoreCategory)) return true;
                
                // For gear (apparel) - only match products with 'gear' tag OR goods without other category tags
                if (selectedStoreCategory === 'gear') {
                  const otherCategoryTags = ['training', 'membership', 'digital'];
                  const hasOtherCategoryTag = tags.some((t: string) => otherCategoryTags.includes(t));
                  // Only include if it's a goods product WITHOUT training/membership/digital tags
                  if (p.productCategory === 'goods' && !hasOtherCategoryTag) return true;
                  return false;
                }
                
                // Fallback to type/productCategory matching for other categories
                const config = categoryConfig[selectedStoreCategory];
                if (config?.typeMatch && config.typeMatch.includes(p.type)) return true;
                
                return false;
              }) || [];
              
              if (filteredProducts.length === 0 && selectedStoreCategory) {
                return (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No items in this category yet</p>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedStoreCategory("")} className="mt-2">
                        View All Items
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              
              if (filteredProducts.length === 0) return null;
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      {selectedStoreCategory ? 
                        {programs: "Programs", training: "Training & Camps", gear: "Gear & Apparel", digital: "Digital Academy"}[selectedStoreCategory] || "All Products" 
                        : "All Products"}
                    </h3>
                    {selectedStoreCategory && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedStoreCategory("")}>
                        Clear Filter
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((item: any) => {
                      const isSubscription = item.type === "Subscription";
                      const isPack = item.type === "Pack";
                      const isStore = item.productCategory === "goods";
                      
                      return (
                        <Card 
                          key={item.id} 
                          className="hover:border-red-300 transition-colors cursor-pointer overflow-hidden"
                          onClick={() => {
                            setSelectedPackage(item.id);
                            setIsStoreItemPurchase(isStore);
                            setPaymentDialogOpen(true);
                          }}
                          data-testid={`product-card-${item.id}`}
                        >
                          {item.coverImageUrl && (
                            <div className="h-32 overflow-hidden">
                              <img src={item.coverImageUrl} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <CardContent className={item.coverImageUrl ? "p-4" : "p-4"}>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{item.name}</h4>
                              {isSubscription && <Badge className="bg-amber-100 text-amber-700 border-0">Subscription</Badge>}
                              {isPack && <Badge className="bg-blue-100 text-blue-700 border-0">{item.sessionCount || ""} Pack</Badge>}
                              {isStore && <Badge className="bg-purple-100 text-purple-700 border-0">Store</Badge>}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xl font-bold">${(item.price / 100).toFixed(2)}</span>
                                {isSubscription && item.billingCycle && (
                                  <span className="text-gray-400 text-sm">/{item.billingCycle.toLowerCase()}</span>
                                )}
                              </div>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                                {isStore ? "Buy" : "Enroll"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Player Switcher Carousel - filters Active Programs and Payment History */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide" data-testid="player-switcher">
              <Button
                variant={!selectedStorePlayer ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStorePlayer("")}
                className="flex-shrink-0 rounded-full"
                data-testid="player-filter-all"
              >
                All Players
              </Button>
              {players?.map((player: any) => (
                <Button
                  key={player.id}
                  variant={selectedStorePlayer === player.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStorePlayer(player.id)}
                  className="flex-shrink-0 rounded-full gap-2"
                  data-testid={`player-filter-${player.id}`}
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={player.profileImageUrl} />
                    <AvatarFallback className="text-xs bg-red-100 text-red-700">
                      {(player.firstName?.[0] || "")}{(player.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  {player.firstName}
                </Button>
              ))}
            </div>

            {/* My Active Programs - Collapsible Section */}
            <Collapsible defaultOpen={true}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <CardTitle className="text-lg">Your Active Programs</CardTitle>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {(() => {
                      // Get enrollments for selected player or all players
                      // Enrollments use profileId for the player
                      const relevantEnrollments = playerEnrollments?.filter((e: any) => 
                        e.status === 'active' && 
                        (!selectedStorePlayer || e.profileId === selectedStorePlayer || e.accountHolderId === user?.id)
                      ) || [];
                      
                      if (relevantEnrollments.length === 0) {
                        return (
                          <div className="text-center py-6 text-gray-500">
                            <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p>No active programs yet</p>
                            <p className="text-sm">Browse the store above to get started!</p>
                          </div>
                        );
                      }
                      
                      // Flat list of enrollments with user/player name next to each
                      return (
                        <div className="space-y-2">
                          {relevantEnrollments.map((enrollment: any) => {
                            const program = programs?.find((p: any) => p.id === enrollment.programId);
                            const isPack = program?.type === "Pack";
                            const remainingCredits = enrollment.remainingCredits || 0;
                            const totalCredits = enrollment.totalCredits || program?.sessionCount || 0;
                            
                            // Get player or user name - enrollments use profileId for the player
                            const player = players?.find((p: any) => p.id === enrollment.profileId);
                            const enrolleeName = player 
                              ? `${player.firstName} ${player.lastName}` 
                              : user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'You' : 'You';
                            
                            return (
                              <div key={enrollment.id} className="flex items-center justify-between py-3 px-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  {isPack ? (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Target className="w-5 h-5 text-blue-600" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                      <Crown className="w-5 h-5 text-amber-600" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{program?.name || "Unknown Program"}</p>
                                      <span className="text-xs text-gray-500">• {enrolleeName}</span>
                                    </div>
                                    {isPack && totalCredits > 0 && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Progress value={(remainingCredits / totalCredits) * 100} className="w-24 h-2" />
                                        <span className="text-xs text-gray-500">{remainingCredits}/{totalCredits} sessions</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Active
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
              setPaymentDialogOpen(open);
              if (!open) {
                setIsStoreItemPurchase(false);
                setSelectedPackage("");
                setSelectedPlayer("");
                setSelectedAddOns([]);
                setSignedWaivers({});
                setWaiverScrollStatus({});
              }
            }}>
              <DialogContent className="max-w-md" data-testid="dialog-make-payment">
                      <DialogHeader>
                        <DialogTitle>{isStoreItemPurchase ? "Purchase Item" : "Make a Payment"}</DialogTitle>
                        <DialogDescription>
                          {isStoreItemPurchase ? "Complete your store purchase" : "Select a program and player to enroll"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {/* Program Selection - only show for program purchases */}
                        {!isStoreItemPurchase && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Program</label>
                            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                              <SelectTrigger data-testid="select-package">
                                <SelectValue placeholder="Select a program" />
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
                                This is a per-player program. Select which player this payment is for.
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
                            </div>
                          );
                        })()}

                        {/* Required Waivers Section */}
                        {selectedPackage && !isStoreItemPurchase && requiredWaivers.length > 0 && (
                          <div className="space-y-3">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Required Waivers ({Object.values(signedWaivers).filter(Boolean).length}/{requiredWaivers.length} signed)
                            </label>
                            <div className="space-y-4">
                              {requiredWaivers.map((waiver: any) => {
                                const hasScrolled = waiverScrollStatus[waiver.id];
                                const isSigned = signedWaivers[waiver.id];
                                const needsScrollCheck = waiverScrollStatus[`needs-scroll-${waiver.id}`];
                                const canAgree = hasScrolled || needsScrollCheck === false;
                                
                                return (
                                  <div
                                    key={waiver.id}
                                    className={`rounded-lg border overflow-hidden ${
                                      isSigned 
                                        ? 'border-green-500 bg-green-50' 
                                        : 'border-gray-200'
                                    }`}
                                    data-testid={`waiver-${waiver.id}`}
                                  >
                                    <div className="p-3 bg-gray-50 border-b">
                                      <h4 className="font-semibold text-sm">{waiver.title}</h4>
                                    </div>
                                    <div 
                                      className="p-3 max-h-32 overflow-y-auto text-xs text-gray-600 bg-white whitespace-pre-wrap"
                                      ref={(el) => {
                                        if (el && waiverScrollStatus[`needs-scroll-${waiver.id}`] === undefined) {
                                          const needsScroll = el.scrollHeight > el.clientHeight;
                                          setWaiverScrollStatus(prev => ({ 
                                            ...prev, 
                                            [`needs-scroll-${waiver.id}`]: needsScroll,
                                            [waiver.id]: !needsScroll
                                          }));
                                        }
                                      }}
                                      onScroll={(e) => {
                                        const el = e.currentTarget;
                                        const scrolledToBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
                                        if (scrolledToBottom && !waiverScrollStatus[waiver.id]) {
                                          setWaiverScrollStatus(prev => ({ ...prev, [waiver.id]: true }));
                                        }
                                      }}
                                    >
                                      {waiver.content || "Please read and agree to this waiver to continue."}
                                    </div>
                                    <div className="p-3 border-t bg-gray-50">
                                      {!canAgree && needsScrollCheck === true ? (
                                        <p className="text-xs text-amber-600 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" />
                                          Please scroll to read the full waiver before agreeing
                                        </p>
                                      ) : (
                                        <label 
                                          className="flex items-center gap-3 cursor-pointer"
                                          onClick={() => setSignedWaivers(prev => ({ ...prev, [waiver.id]: !prev[waiver.id] }))}
                                        >
                                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            isSigned 
                                              ? 'bg-green-500 border-green-500' 
                                              : 'border-gray-300 hover:border-gray-400'
                                          }`}>
                                            {isSigned && <Check className="w-3 h-3 text-white" />}
                                          </div>
                                          <span className="text-sm">
                                            I have read and agree to this waiver
                                          </span>
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add-ons Section */}
                        {selectedPackage && !isStoreItemPurchase && hasSuggestedAddOns && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Recommended Add-ons
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {suggestedAddOnProducts.map((item: any) => {
                                  const isSelected = selectedAddOns.includes(item.id);
                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => setSelectedAddOns(prev => 
                                        isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                      )}
                                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                        isSelected 
                                          ? 'border-red-500 bg-red-50' 
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                      data-testid={`addon-${item.id}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                          isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300'
                                        }`}>
                                          {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">{item.name}</p>
                                          {item.description && (
                                            <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-semibold text-red-600">
                                        ${((item.price || 0) / 100).toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Total Summary */}
                        {selectedPackage && (() => {
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                          if (!pkg) return null;
                          
                          const isStoreProduct = pkg.productCategory === 'goods';
                          const basePrice = pkg.price || 0;
                          const addOnsTotal = selectedAddOns.reduce((sum, id) => {
                            const item = suggestedAddOnProducts.find((s: any) => s.id === id);
                            return sum + (item?.price || 0);
                          }, 0);
                          const totalPrice = basePrice + addOnsTotal;
                          
                          return (
                            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{pkg.name}</span>
                                <span>${(basePrice / 100).toFixed(2)}</span>
                              </div>
                              {selectedAddOns.length > 0 && selectedAddOns.map(addonId => {
                                const addon = suggestedAddOnProducts.find((s: any) => s.id === addonId);
                                if (!addon) return null;
                                return (
                                  <div key={addonId} className="flex justify-between text-sm text-gray-600">
                                    <span>+ {addon.name}</span>
                                    <span>${((addon.price || 0) / 100).toFixed(2)}</span>
                                  </div>
                                );
                              })}
                              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                <span className="font-semibold">Total:</span>
                                <div className="text-right">
                                  <span className="text-xl font-bold">${(totalPrice / 100).toFixed(2)}</span>
                                  {!isStoreProduct && pkg.type === "Subscription" && pkg.billingCycle && (
                                    <p className="text-xs text-gray-500">
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
                                  description: "Please select a program or item",
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
                                    description: "Please select a player for this per-player program",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                              }
                              
                              // Validate waivers are signed
                              if (!isStoreProduct && requiredWaivers.length > 0) {
                                const unsignedWaivers = requiredWaivers.filter((w: any) => !signedWaivers[w.id]);
                                if (unsignedWaivers.length > 0) {
                                  toast({
                                    title: "Waivers Required",
                                    description: "Please agree to all required waivers before proceeding",
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
                                    addOnIds: selectedAddOns.length > 0 ? selectedAddOns : undefined,
                                    signedWaiverIds: Object.keys(signedWaivers).filter(id => signedWaivers[id]),
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
            
            {/* Payment History Component */}
            <PaymentHistory selectedPlayer={selectedStorePlayer} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <ParentMessagesSection players={players} userId={user?.id} />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Parent Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  My Profile
                </CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-xl font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="profile-parent-name">
                      {user?.firstName} {user?.lastName}
                    </h3>
                    <Badge variant="outline" className="text-xs capitalize">
                      {user?.role || 'Parent'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-500 block">Email</span>
                      <span className="text-sm font-medium" data-testid="profile-parent-email">{user?.email || '-'}</span>
                    </div>
                    {user?.phoneNumber && (
                      <div>
                        <span className="text-xs text-gray-500 block">Phone</span>
                        <span className="text-sm font-medium" data-testid="profile-parent-phone">{user?.phoneNumber}</span>
                      </div>
                    )}
                    {user?.address && (
                      <div>
                        <span className="text-xs text-gray-500 block">Address</span>
                        <span className="text-sm font-medium">{user?.address}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {user?.city && (
                      <div>
                        <span className="text-xs text-gray-500 block">City</span>
                        <span className="text-sm font-medium">{user?.city}</span>
                      </div>
                    )}
                    {user?.emergencyContact && (
                      <div>
                        <span className="text-xs text-gray-500 block">Emergency Contact</span>
                        <span className="text-sm font-medium">{user?.emergencyContact}</span>
                      </div>
                    )}
                    {user?.emergencyPhone && (
                      <div>
                        <span className="text-xs text-gray-500 block">Emergency Phone</span>
                        <span className="text-sm font-medium">{user?.emergencyPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Linked Players Section */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Linked Players ({players.length})
              </h2>
              {players.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Players Linked</h3>
                    <p className="text-gray-600">You don't have any players linked to your account yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {players.map((player: any) => (
                    <PlayerProfileCard key={player.id} player={player} />
                  ))}
                </div>
              )}
            </div>
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
      {/* Event Detail Modal - pass parent user ID, player selection happens inside modal */}
      {players.length > 0 ? (
        <EventDetailModal
          event={selectedEvent}
          userId={user?.id || ''}
          userRole="parent"
          open={eventDetailOpen}
          onOpenChange={setEventDetailOpen}
        />
      ) : (
        <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title || 'Event Details'}</DialogTitle>
              <DialogDescription>
                {selectedEvent?.startTime && (
                  <>
                    {new Date(selectedEvent.startTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Players Linked</h3>
              <p className="text-gray-600 text-sm mb-4">
                You need to link players to your account before you can RSVP or check in to events.
              </p>
              <Button 
                onClick={() => {
                  setEventDetailOpen(false);
                  setLocation('/unified-account?tab=profile');
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Link a Player
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </>
  );
}
