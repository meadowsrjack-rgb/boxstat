import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AbandonedCartBanner from "@/components/AbandonedCartBanner";
import { ApprovedSeasonStats } from "@/components/ApprovedSeasonStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BanterLoader } from "@/components/BanterLoader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
  ChevronRight,
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
  CircleDot,
  Star,
  Medal,
  CalendarCheck,
  Camera,
  X,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PINDialog } from "@/components/PINDialog";
import CoachProfileDialog from "@/components/CoachProfileDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { EnrollmentExpiryBanner } from "@/components/EnrollmentExpiryBanner";
import { PaymentHistory } from "@/components/PaymentHistory";
import UypTrophyRings from "@/components/UypTrophyRings";
import { authPersistence } from "@/services/authPersistence";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import OpenBoxStatPrompt from "@/components/OpenBoxStatPrompt";

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

  // Fetch enrollments for grace period status
  const { data: allEnrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments"],
    enabled: !!player.id,
  });

  // Derive payment status for this player (with enrollment grace period awareness)
  const { status, plan } = derivePlayerStatus(
    payments, 
    programs, 
    player.id, 
    parentId,
    player.packageSelected,
    allEnrollments
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
function TeamDropdown({ team, onCoachClick }: { team: { id: number; name: string }; onCoachClick?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: teamMembersDetail } = useQuery<{ players: any[]; coaches: any[]; teamName: string }>({
    queryKey: [`/api/teams/${team.id}/members-detail`],
    enabled: expanded,
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-sm font-medium text-gray-800">{team.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t bg-white">
          {!teamMembersDetail ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembersDetail.coaches.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Coaches</p>
                  <div className="space-y-1.5">
                    {teamMembersDetail.coaches.map((coach) => (
                      <button
                        key={coach.id}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-red-50 transition-colors text-left"
                        onClick={() => onCoachClick?.(coach.id)}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={coach.profileImageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white text-xs font-bold">
                            {coach.firstName?.[0]}{coach.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{coach.firstName} {coach.lastName}</p>
                          <p className="text-xs text-gray-500 capitalize">{coach.role?.replace('_', ' ') || 'Coach'}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {teamMembersDetail.players.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Roster ({teamMembersDetail.players.length})</p>
                  <div className="space-y-1">
                    {teamMembersDetail.players.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 p-1.5 rounded-lg">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={p.profileImageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-red-400 to-red-500 text-white text-[10px] font-bold">
                            {p.firstName?.[0]}{p.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-700">{p.firstName} {p.lastName}</span>
                        {p.jerseyNumber && <span className="text-xs text-gray-400">#{p.jerseyNumber}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teamMembersDetail.coaches.length === 0 && teamMembersDetail.players.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No members found</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerProfileCard({ player, onCoachClick, onNavigateToPayments }: { player: any; onCoachClick?: (coachId: string) => void; onNavigateToPayments?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: teamsData = [] } = useQuery<Array<{id: number; name: string; ageGroup: string; program: string}>>({
    queryKey: [`/api/users/${player.id}/teams`],
    enabled: !!player.id,
  });

  const { data: playerEnrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments"],
  });

  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const hasActiveProgram = playerEnrollments.some((e: any) => {
    if (e.status !== 'active' || e.profileId !== player.id) return false;
    const prog = programs.find((p: any) => p.id === e.programId);
    if (prog?.productCategory === 'goods') return false;
    return true;
  });

  const { data: latestEvaluation } = useQuery<any>({
    queryKey: [`/api/players/${player.id}/latest-evaluation`],
    enabled: isOpen && !!player.id,
  });

  const calculateOverallScore = (skillsData: any): number => {
    if (!skillsData || typeof skillsData !== 'object') return 0;
    const allScores: number[] = [];
    Object.values(skillsData).forEach((value: any) => {
      if (typeof value === 'number') {
        allScores.push(value);
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach((subValue: any) => {
          if (typeof subValue === 'number') allScores.push(subValue);
        });
      }
    });
    if (allScores.length === 0) return 0;
    const average = allScores.reduce((sum, val) => sum + val, 0) / allScores.length;
    return Math.round(average * 20);
  };

  const overallSkillScore = calculateOverallScore(latestEvaluation?.scores || latestEvaluation?.skillsData);
  
  const previousOverallScore = (() => {
    const prev = latestEvaluation?.previousScores;
    if (!prev || !Array.isArray(prev) || prev.length === 0) return null;
    const lastSnapshot = prev[prev.length - 1];
    return calculateOverallScore(lastSnapshot?.scores);
  })();
  const scoreDiff = previousOverallScore !== null && overallSkillScore > 0 ? overallSkillScore - previousOverallScore : null;

  const { data: awardsData } = useQuery<any>({
    queryKey: [`/api/users/${player.id}/awards`],
    enabled: !!player.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 30000,
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
            
            {!hasActiveProgram && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0">No Active Program</Badge>
                {onNavigateToPayments && (
                  <Button size="sm" variant="outline" className="h-5 text-[10px] px-2 border-red-300 text-red-600 hover:bg-red-50" onClick={onNavigateToPayments}>
                    Enrol Now
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Team / Level / Group Dropdowns */}
        {teamsData.length > 0 && (
          <div className="mt-3 space-y-2">
            {teamsData.map((team) => (
              <TeamDropdown key={team.id} team={team} onCoachClick={onCoachClick} />
            ))}
          </div>
        )}
        
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
              {/* Approved Season Stats */}
              <ApprovedSeasonStats playerId={player.id} compact />

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
              
              {/* Skill Rating Bar */}
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-red-500" />
                  Overall Skill Rating
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-600">OVR</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-red-600 font-semibold">{overallSkillScore}</span>
                      {scoreDiff !== null && scoreDiff !== 0 && (
                        <span className={`text-[10px] font-medium ${scoreDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-red-600 h-2.5 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${overallSkillScore}%` }}
                    />
                  </div>
                  {overallSkillScore === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No evaluation yet</p>
                  )}
                  {previousOverallScore !== null && overallSkillScore > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Previous: {previousOverallScore}</p>
                  )}
                </div>
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
  const storageKey = `crm_seen_reply_count_${userId || 'unknown'}`;
  const [managementChatViewed, setManagementChatViewed] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved !== null;
  });
  const [lastSeenReplyCount, setLastSeenReplyCount] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team chatrooms from backend (based on children's team memberships with chat enabled)
  const { data: teamChatrooms = [] } = useQuery<any[]>({
    queryKey: ["/api/account/team-chatrooms"],
  });

  // Map to format expected by UI
  const playerTeams = teamChatrooms.map((chatroom: any) => ({
    id: chatroom.teamId,
    name: chatroom.teamName,
    coachId: chatroom.coachId,
    coachName: chatroom.coachName || 'Coach',
    playerName: chatroom.playerNames?.join(', ') || '',
    chatMode: chatroom.chatMode,
  }));

  // Fetch team messages (parent channel)
  const { data: teamMessages = [] } = useQuery<any[]>({
    queryKey: [`/api/teams/${activeChat?.teamId}/messages?channel=parents`],
    enabled: activeChat?.type === 'team' && !!activeChat?.teamId,
  });

  // Fetch direct messages with coach
  const { data: coachMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/direct-messages', userId, activeChat?.coachId],
    enabled: activeChat?.type === 'coach' && !!activeChat?.coachId && !!userId,
  });

  const { data: myContactMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/contact-management/my-messages'],
  });

  const adminReplyCount = myContactMessages.reduce((count: number, msg: any) => count + (msg.replies || []).filter((r: any) => r.isAdmin).length, 0);

  useEffect(() => {
    if (activeChat?.type === 'management') {
      setLastSeenReplyCount(adminReplyCount);
      localStorage.setItem(storageKey, String(adminReplyCount));
    } else if (adminReplyCount > lastSeenReplyCount) {
      setManagementChatViewed(false);
    }
  }, [adminReplyCount, lastSeenReplyCount, activeChat, storageKey]);

  // Send team message mutation (parent channel)
  const sendTeamMessageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/teams/${activeChat?.teamId}/messages`, {
        method: 'POST',
        data: { message: newMessage, channel: 'parents' },
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${activeChat?.teamId}/messages?channel=parents`] });
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

  const managementMessages = activeChat?.type === 'management'
    ? myContactMessages.flatMap((msg: any) => {
        const threadMessages = [msg, ...(msg.replies || [])];
        return threadMessages.filter((m: any) => !m.message?.startsWith('Conversation with ') || m.isAdmin);
      })
    : [];

  const currentMessages = activeChat?.type === 'team' ? teamMessages :
    activeChat?.type === 'coach' ? coachMessages : managementMessages;

  const sortedMessages = [...currentMessages].sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [sortedMessages.length, activeChat]);

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
            {sortedMessages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</p>
            ) : (
              sortedMessages.map((msg: any) => {
                const isAdminReply = activeChat?.type === 'management' && msg.isAdmin;
                const isOwn = isAdminReply ? false : (msg.senderId === userId);
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 ${isOwn ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {isAdminReply && (
                        <div className="text-xs font-medium mb-1 text-red-600">
                          {msg.senderName || 'Admin'}
                        </div>
                      )}
                      {!isOwn && !isAdminReply && msg.sender && (
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
            <div ref={messagesEndRef} />
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
            className="w-full justify-between"
            onClick={() => { setActiveChat({ type: 'management' }); setManagementChatViewed(true); setLastSeenReplyCount(adminReplyCount); localStorage.setItem(storageKey, String(adminReplyCount)); }}
            data-testid="button-contact-management"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-red-600" />
              {myContactMessages.length > 0 ? 'View messages' : 'Send a message to management'}
            </span>
            {!managementChatViewed && adminReplyCount > 0 && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {adminReplyCount}
              </span>
            )}
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={() => setActiveChat({ type: 'team', teamId: team.id, teamName: team.name })}
                  data-testid={`button-team-chat-${team.id}`}
                >
                  <Users className="w-3 h-3" />
                  Open Team Chat
                </Button>
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

function InlineSchedulePanel({
  programId,
  programName,
  sessionLength,
  playerId,
  enrollmentId,
  remainingCredits,
  totalCredits,
  isEditMode,
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  booked,
  onBooked,
  onBookAnother,
  onClose,
}: {
  programId: number | string;
  programName: string;
  sessionLength?: number;
  playerId?: string;
  enrollmentId?: number;
  remainingCredits?: number;
  totalCredits?: number;
  isEditMode?: boolean;
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  selectedSlot: any;
  onSlotSelect: (slot: any) => void;
  booked: boolean;
  onBooked: () => void;
  onBookAnother: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const dateStr = selectedDate.toISOString().split("T")[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: availability, isLoading } = useQuery<any>({
    queryKey: ["/api/programs", programId, "schedule-availability", dateStr, playerId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: dateStr });
      if (playerId) params.set("playerId", playerId);
      const res = await fetch(`/api/programs/${programId}/schedule-availability?${params.toString()}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (!res.ok) throw new Error("Failed to load availability");
      return res.json();
    },
  });

  const [bookRecurring, setBookRecurring] = useState(true);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const bookMutation = useMutation({
    mutationFn: async (slot: any) => {
      const res = await apiRequest("POST", `/api/programs/${programId}/schedule-request`, {
        startTime: slot.startTime,
        playerId: playerId || undefined,
        recurring: bookRecurring,
      });
      return res;
    },
    onSuccess: (data: any) => {
      setBookingResult(data);
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === "/api/programs" && key[1] === programId && key[2] === "schedule-availability";
      }});
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/enrollments"] });
      toast({ 
        title: isEditMode ? "Request updated" : "Session request sent", 
        description: "An admin will confirm time and location." 
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error?.message || "This time slot may no longer be available.",
        variant: "destructive",
      });
    },
  });

  const availableSlots = availability?.slots?.filter((s: any) => s.available) || [];
  const formatTime = (isoStr: string) => new Date(isoStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  if (booked) {
    const sessionsCreated = bookingResult?.sessionsCreated || 1;
    return (
      <div className="border-t bg-amber-50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-amber-800">
              {sessionsCreated} Session{sessionsCreated > 1 ? 's' : ''} Requested!
            </p>
            {selectedSlot && (
              <p className="text-sm text-amber-600">
                {sessionsCreated > 1
                  ? `Every ${new Date(selectedSlot.startTime).toLocaleDateString("en-US", { weekday: "long" })} at ${formatTime(selectedSlot.startTime)} — Pending approval`
                  : `${new Date(selectedSlot.startTime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${formatTime(selectedSlot.startTime)} — Pending approval`
                }
              </p>
            )}
            {bookingResult?.skippedWeeks?.length > 0 && (
              <p className="text-xs text-amber-500 mt-1">
                Skipped {bookingResult.skippedWeeks.length} week(s) due to conflicts
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">
          {isEditMode ? "Change your requested time" : `Pick a time slot (${sessionLength || 60} min)`}
        </p>
        {totalCredits != null && totalCredits > 0 && (
          <span className="text-xs text-gray-500">
            {remainingCredits}/{totalCredits} credits remaining
          </span>
        )}
      </div>
      
      <div className="flex justify-center mb-4">
        <ShadcnCalendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => { if (date) onDateChange(date); }}
          disabled={(date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d < today; }}
          className="rounded-md border bg-white"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">
          {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : availableSlots.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No available times for this date. Try another day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {availableSlots.map((slot: any, idx: number) => {
              const isSelected = selectedSlot?.startTime === slot.startTime;
              return (
                <Button
                  key={idx}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`text-xs ${isSelected ? "bg-red-600 hover:bg-red-700" : ""}`}
                  onClick={() => onSlotSelect(slot)}
                >
                  {formatTime(slot.startTime)}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="mt-3 bg-white border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">{formatTime(selectedSlot.startTime)}</span>
              <span className="text-gray-500"> - {formatTime(selectedSlot.endTime)}</span>
            </div>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => bookMutation.mutate(selectedSlot)}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Calendar className="w-3.5 h-3.5 mr-1" />}
              {isEditMode ? "Update Request" : "Request Time"}
            </Button>
          </div>
          {totalCredits != null && totalCredits > 0 && (
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bookRecurring}
                onChange={(e) => setBookRecurring(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs text-gray-600">
                Book recurring weekly{remainingCredits != null && remainingCredits > 1 ? ` (${remainingCredits} sessions)` : ''}
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default function UnifiedAccount() {
  const [location, setLocation] = useLocation();
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
  const [selectedPricingOptionId, setSelectedPricingOptionId] = useState<string>("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingCheckoutSessionId, setPendingCheckoutSessionId] = useState<string | null>(null);
  const [isStoreItemPurchase, setIsStoreItemPurchase] = useState(false);
  const [isTryoutPurchase, setIsTryoutPurchase] = useState(false);
  const [tryoutSelectedTeamId, setTryoutSelectedTeamId] = useState<string>("");
  const [tryoutRecommendedTeam, setTryoutRecommendedTeam] = useState<any | null>(null);
  const [tryoutMatchingTeams, setTryoutMatchingTeams] = useState<any[]>([]);
  const [tryoutIsFallback, setTryoutIsFallback] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [signedWaivers, setSignedWaivers] = useState<Record<string, boolean>>({});
  const [waiverScrollStatus, setWaiverScrollStatus] = useState<Record<string, boolean>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: number; code: string; discountType: string; discountValue: number; programId?: string | null } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");
  
  // Store tab state
  const [selectedStorePlayer, setSelectedStorePlayer] = useState<string>("");
  const [selectedStoreCategory, setSelectedStoreCategory] = useState<string>("");
  const [storeViewTab, setStoreViewTab] = useState<"programs" | "store">("programs");
  
  // Settings drawer state
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const parentPhotoInputRef = useRef<HTMLInputElement>(null);
  const [parentPhotoUploading, setParentPhotoUploading] = useState(false);
  const paymentSuccessHandledRef = useRef(false);
  
  const [coachProfileId, setCoachProfileId] = useState<string | null>(null);
  const [coachProfileOpen, setCoachProfileOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "home";
  const shouldOpenPayment = urlParams.get("openPayment") === "true";
  const [parentDashTab, setParentDashTab] = useState(initialTab);

  // React to in-app navigation that changes ?tab= while we're already mounted
  // (e.g. clicking a "Payments" button on a banner from the Home tab).
  useEffect(() => {
    const search = window.location.search;
    const tabFromUrl = new URLSearchParams(search).get("tab");
    if (tabFromUrl && tabFromUrl !== parentDashTab) {
      setParentDashTab(tabFromUrl);
    }
  }, [location]);

  useEffect(() => {
    if (shouldOpenPayment) {
      try {
        const pending = localStorage.getItem("pendingPayment");
        if (pending) {
          const { packageId, pricingOptionId, addOns, isTryout, isStoreItem } = JSON.parse(pending);
          if (packageId) setSelectedPackage(packageId);
          if (pricingOptionId) setSelectedPricingOptionId(pricingOptionId);
          if (addOns) setSelectedAddOns(addOns);
          if (isTryout) setIsTryoutPurchase(true);
          if (isStoreItem) setIsStoreItemPurchase(true);
          localStorage.removeItem("pendingPayment");
        }
      } catch {}
      setPaymentDialogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [shouldOpenPayment]);

  // Handle eventId deep link from push notifications
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventIdParam = params.get('eventId');
    if (!eventIdParam) return;

    const fetchAndOpenEvent = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/events/${eventIdParam}`, { credentials: 'include', headers });
        if (res.ok) {
          const event = await res.json();
          setSelectedEvent(event);
          setEventDetailOpen(true);
        }
      } catch (err) {
        console.error('[Unified Account] Failed to fetch event for deep link', err);
      } finally {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('eventId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };

    fetchAndOpenEvent();
  }, []);

  // Schedule request state - inline booking within active programs
  const [schedulingEnrollment, setSchedulingEnrollment] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [scheduleSelectedSlot, setScheduleSelectedSlot] = useState<any>(null);
  const [scheduleBooked, setScheduleBooked] = useState(false);
  
  // Check if device is locked - redirect to player dashboard if so
  useEffect(() => {
    const lockedPlayerId = localStorage.getItem("deviceLockedToPlayer");
    if (lockedPlayerId) {
      localStorage.setItem("selectedPlayerId", lockedPlayerId);
      setLocation("/player-dashboard");
    }
  }, [setLocation]);

  // Listen for in-app browser close to verify payment and refresh data (iOS Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const handleBrowserClosed = async () => {
      const sessionId = pendingCheckoutSessionId;
      if (sessionId) {
        console.log('[iOS Payment] Browser closed, verifying session:', sessionId);
        setPendingCheckoutSessionId(null);
        try {
          const response = await fetch('/api/payments/verify-session', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            },
            body: JSON.stringify({ sessionId }),
          });
          const data = await response.json();
          if (data.success) {
            console.log('[iOS Payment] Payment verified successfully');
            setParentDashTab("payments");
            toast({
              title: "Payment Successful!",
              description: "Thank you! A receipt has been sent to your email.",
            });
          } else {
            console.log('[iOS Payment] Payment not completed:', data.message);
          }
        } catch (err) {
          console.error('[iOS Payment] Verify session error:', err);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/abandoned-carts'] });
    };
    
    Browser.addListener('browserFinished', handleBrowserClosed);
    
    return () => {
      Browser.removeAllListeners();
    };
  }, [pendingCheckoutSessionId]);

  // Check for payment success in URL (including iOS auth token restoration)
  useEffect(() => {
    // Guard against running multiple times (strict mode double-invoke, re-renders)
    if (paymentSuccessHandledRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    const authToken = urlParams.get('auth_token');

    console.log('[Payment] useEffect running, payment param:', paymentParam, 'sessionId:', sessionId ? 'present' : 'absent');

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
    
    if (paymentParam === 'success') {
      // Mark as handled immediately to prevent duplicate toasts
      paymentSuccessHandledRef.current = true;

      // Show confirmation toast immediately — do not wait for verify-session
      // The payment was already processed by the webhook; this is just confirmation UX
      console.log('[Payment] Payment success detected, showing toast immediately');
      toast({
        title: "Payment Successful!",
        description: "Thank you, your payment was successful!",
      });

      // Invalidate caches so UI reflects the new purchase
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/account/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      // Clean up the URL right away (only if not iOS redirect, which navigates away)
      if (!isIOSRedirect) {
        window.history.replaceState({}, '', '/unified-account');
      }

      // Run verify-session in the background for backend processing only
      if (sessionId) {
        console.log('[Payment] Running verify-session in background for session:', sessionId);
        try {
          apiRequest('/api/payments/verify-session', {
            method: 'POST',
            data: { sessionId },
          })
            .then(data => {
              console.log('[Payment] verify-session result:', data);
              if (data?.success && isIOSRedirect) {
                console.log('[iOS Payment] Redirecting to profile gateway...');
                setTimeout(() => {
                  setLocation('/profile-selection');
                }, 1500);
              }
            })
            .catch(error => {
              console.error('[Payment] verify-session error (non-fatal, toast already shown):', error);
            });
        } catch (syncError) {
          console.error('[Payment] verify-session sync error (non-fatal, toast already shown):', syncError);
        }
      }
    } else if (paymentParam === 'canceled') {
      // Payment was canceled - show friendly message
      paymentSuccessHandledRef.current = true;
      console.log('[Payment] Payment canceled detected');
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. You can try again when you're ready.",
        variant: "default",
      });
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

  // Fetch upcoming events - use context=parent to get parent-scoped events for admin accounts
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events", { context: "parent" }],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/events?context=parent', {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
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
  const { data: playerEnrollments = [], isLoading: enrollmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/enrollments"],
  });

  const { data: parentTeamChatrooms = [] } = useQuery<any[]>({
    queryKey: ["/api/account/team-chatrooms"],
  });

  const { data: tryoutProgramTeams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams', { programId: selectedPackage }],
    queryFn: async () => {
      if (!selectedPackage) return [];
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/teams?programId=${selectedPackage}`, { headers, credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isTryoutPurchase && !!selectedPackage,
  });

  useEffect(() => {
    if (!isTryoutPurchase || !selectedPlayer || !selectedPackage) {
      setTryoutRecommendedTeam(null);
      setTryoutMatchingTeams([]);
      setTryoutSelectedTeamId("");
      setTryoutIsFallback(false);
      return;
    }
    const player = players?.find((p: any) => p.id === selectedPlayer);
    if (!player || tryoutProgramTeams.length === 0) {
      setTryoutRecommendedTeam(null);
      setTryoutMatchingTeams(tryoutProgramTeams.length > 0 ? tryoutProgramTeams : []);
      setTryoutSelectedTeamId("");
      setTryoutIsFallback(tryoutProgramTeams.length > 0);
      return;
    }

    let playerAge: number | null = null;
    if (player.dateOfBirth) {
      const dob = new Date(player.dateOfBirth);
      const today = new Date();
      playerAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) playerAge--;
    }
    const skillLevel = player.skillLevel;
    const currentYear = new Date().getFullYear();

    const gradeToAgeRange: Record<string, [number, number]> = {
      'rookie': [4, 7], '1st': [6, 7], '2nd': [7, 8], '3rd': [8, 9],
      '4th': [9, 10], '5th': [10, 11], '6th': [11, 12], '7th': [12, 13], '8th': [13, 14],
      '9th': [14, 15], '10th': [15, 16], '11th': [16, 17], '12th': [17, 18],
    };

    const getAgeMatch = (team: any): 'explicit' | 'none' | 'no_data' => {
      if (team.minAge != null || team.maxAge != null) {
        if (playerAge === null) return 'no_data';
        const inRange = (team.minAge == null || playerAge >= team.minAge) &&
               (team.maxAge == null || playerAge <= team.maxAge);
        return inRange ? 'explicit' : 'none';
      }
      if (playerAge === null) return 'no_data';
      const divisionStr = (team.division || team.name || '');
      const uMatch = divisionStr.match(/U(\d+)/i);
      if (uMatch) return playerAge <= parseInt(uMatch[1]) ? 'explicit' : 'none';
      const birthYearMatch = divisionStr.match(/(\d{4})[^\d]+(\d{4})/);
      if (birthYearMatch) {
        const playerBirthYear = currentYear - playerAge;
        const minYear = Math.min(parseInt(birthYearMatch[1]), parseInt(birthYearMatch[2]));
        const maxYear = Math.max(parseInt(birthYearMatch[1]), parseInt(birthYearMatch[2]));
        return (playerBirthYear >= minYear && playerBirthYear <= maxYear) ? 'explicit' : 'none';
      }
      const gradeRangeMatch = divisionStr.match(/(\d+)(?:st|nd|rd|th)\s*[-–]\s*(\d+)(?:st|nd|rd|th)/i);
      if (gradeRangeMatch) {
        const minGrade = parseInt(gradeRangeMatch[1]);
        const maxGrade = parseInt(gradeRangeMatch[2]);
        const minAge2 = minGrade + 5;
        const maxAge2 = maxGrade + 6;
        return (playerAge >= minAge2 && playerAge <= maxAge2) ? 'explicit' : 'none';
      }
      const singleGradeMatch = divisionStr.match(/(\d+)(?:st|nd|rd|th)/i);
      if (singleGradeMatch) {
        const grade = parseInt(singleGradeMatch[1]);
        return (playerAge >= grade + 5 && playerAge <= grade + 6) ? 'explicit' : 'none';
      }
      for (const [keyword, [minA, maxA]] of Object.entries(gradeToAgeRange)) {
        if (divisionStr.toLowerCase().includes(keyword)) {
          return (playerAge >= minA && playerAge <= maxA) ? 'explicit' : 'none';
        }
      }
      return 'no_data';
    };

    const getLevelMatch = (team: any): 'explicit' | 'none' | 'no_data' => {
      if (!skillLevel) return 'no_data';
      const sl = skillLevel.toLowerCase();
      const teamLevel = team.level?.toLowerCase();
      if (teamLevel) return teamLevel === sl ? 'explicit' : 'none';
      const nameStr = (team.name || '').toLowerCase();
      const levelKeywords = ['beginner', 'intermediate', 'advanced', 'elite', 'rookie', 'varsity', 'jv'];
      const nameHasLevel = levelKeywords.some(kw => nameStr.includes(kw));
      if (nameHasLevel) return nameStr.includes(sl) ? 'explicit' : 'none';
      return 'no_data';
    };

    const scored: { team: any; score: number }[] = [];
    tryoutProgramTeams.forEach((team: any) => {
      const ageResult = getAgeMatch(team);
      const levelResult = getLevelMatch(team);
      if (ageResult === 'none' || levelResult === 'none') return;
      let score = 0;
      if (ageResult === 'explicit') score += 2;
      if (levelResult === 'explicit') score += 2;
      scored.push({ team, score });
    });

    const maxScore = scored.length > 0 ? Math.max(...scored.map(s => s.score)) : 0;
    let finalMatches = maxScore > 0
      ? scored.filter(s => s.score === maxScore).map(s => s.team)
      : scored.map(s => s.team);
    const usedFallback = finalMatches.length === 0;
    if (usedFallback) finalMatches = tryoutProgramTeams;

    setTryoutMatchingTeams(finalMatches);
    setTryoutIsFallback(usedFallback);
    if (finalMatches.length === 1) {
      setTryoutRecommendedTeam(finalMatches[0]);
      setTryoutSelectedTeamId(String(finalMatches[0].id));
    } else {
      setTryoutRecommendedTeam(null);
      setTryoutSelectedTeamId("");
    }
  }, [isTryoutPurchase, selectedPlayer, players, tryoutProgramTeams, selectedPackage]);

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

  // Show events that haven't ended yet (time-based)
  const now = new Date();

  // Filter events by selected player (using team memberships)
  const filterEventsByPlayer = (eventList: any[]) => {
    if (!selectedStorePlayer) return eventList;
    const player = players?.find((p: any) => p.id === selectedStorePlayer);
    if (!player) return eventList;
    const playerTeamIds = (player.allTeamIds || (player.teamId ? [player.teamId] : [])).map(String);
    return eventList.filter((e: any) => {
      if (e.playerId && String(e.playerId) === String(selectedStorePlayer)) return true;
      if (e.teamId && playerTeamIds.includes(String(e.teamId))) return true;
      const assignTo = e.assignTo;
      if (assignTo?.teams?.length) {
        if (assignTo.teams.some((t: any) => playerTeamIds.includes(String(t)))) return true;
      }
      if (assignTo?.users?.length) {
        if (assignTo.users.includes(selectedStorePlayer)) return true;
      }
      if (!e.teamId && !e.playerId && (!assignTo || (!assignTo.teams?.length && !assignTo.users?.length))) return true;
      return false;
    });
  };
  
  const isConfirmedEvent = (e: any) => !(e.scheduleRequestSource && e.status === 'pending');

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(0, 0, 0, 0);

  const upcomingEvents = filterEventsByPlayer(events)
    .filter((e: any) => {
      const startTime = new Date(e.startTime);
      const endTime = new Date(e.endTime || e.startTime);
      return endTime > now && startTime < tomorrow && isConfirmedEvent(e);
    })
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 4);

  const allUpcomingEvents = upcomingEvents;

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
    } catch (error) {
      // Continue with logout even if API fails
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('selectedPlayerId');
    localStorage.removeItem('viewingAsParent');
    localStorage.removeItem('lastViewedProfileType');
    queryClient.clear();
    window.location.href = "/";
  };

  if (playersLoading) {
    return (
      <>
        <div className="ios-full-bleed" style={{ backgroundColor: '#ffffff' }} />
        <div className="ios-fixed-page relative z-10 w-full flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
          <BanterLoader />
        </div>
      </>
    );
  }

  return (
    <>
      <OpenBoxStatPrompt />
      <div className="ios-full-bleed" style={{ backgroundColor: '#f9fafb' }} />
      <div className="scrollable-page relative z-10" style={{ backgroundColor: '#f9fafb' }}>
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
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsDrawerOpen(true)}
                data-testid="button-settings-cog"
                className="relative"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>

        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Announcement Banner */}
        <AnnouncementBanner />
        <EnrollmentExpiryBanner />

        {!enrollmentsLoading && !playerEnrollments.some((e: any) => e.status === 'active' || e.status === 'grace_period') && parentDashTab !== "payments" && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3" data-testid="payments-guide-banner">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-sm text-gray-700 flex-1">Tap <button onClick={() => setParentDashTab("payments")} className="font-semibold text-red-600 underline underline-offset-2">Payments</button> to select a program and enroll your player.</p>
          </div>
        )}

        <Tabs value={parentDashTab} onValueChange={setParentDashTab}>
          <div ref={tabsRef} className="overflow-x-auto hide-scrollbar drag-scroll mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto bg-transparent border-b border-gray-200 rounded-none p-0 h-auto gap-0">
              <TabsTrigger value="home" data-testid="tab-home" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <User className="w-4 h-4 mr-2" />
                Home
              </TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <DollarSign className="w-4 h-4 mr-2" />
                <span className={!enrollmentsLoading && !playerEnrollments.some((e: any) => e.status === 'active' || e.status === 'grace_period') ? 'shimmer-text' : ''}>Payments</span>
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="players" data-testid="tab-players" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Trophy className="w-4 h-4 mr-2" />
                Players
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Home Tab */}
          <TabsContent value="home" className="space-y-6">
            {/* Abandoned Cart Banner */}
            <AbandonedCartBanner onNavigateToPayments={() => setParentDashTab("payments")} onCheckoutSessionCreated={(id) => setPendingCheckoutSessionId(id)} />
            {/* Player Switcher Carousel */}
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

            {/* Schedule Request Buttons (from active enrollments with scheduling enabled) */}
            {(() => {
              const schedulableEnrollments = playerEnrollments?.filter((e: any) => {
                if (e.status !== 'active') return false;
                if (selectedStorePlayer && e.profileId !== selectedStorePlayer && e.accountHolderId !== user?.id) return false;
                const prog = programs?.find((p: any) => p.id === e.programId);
                if (prog?.productCategory === 'goods') return false;
                const endDate = e.endDate ? new Date(e.endDate) : null;
                const isExpired = endDate && endDate < new Date();
                return (prog as any)?.scheduleRequestEnabled && !isExpired;
              }) || [];

              if (schedulableEnrollments.length === 0) return null;

              return (
                <div className="space-y-2">
                  {schedulableEnrollments.map((enrollment: any) => {
                    const program = programs?.find((p: any) => p.id === enrollment.programId);
                    const isPack = program?.type === "Pack";
                    const remainingCredits = enrollment.remainingCredits || 0;
                    const totalCredits = enrollment.totalCredits || program?.sessionCount || 0;
                    const player = players?.find((p: any) => p.id === enrollment.profileId);
                    const enrolleeName = player 
                      ? `${player.firstName} ${player.lastName}` 
                      : user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'You' : 'You';
                    const isSchedulingOpen = schedulingEnrollment === enrollment.id;
                    const hasPendingRequest = events.some((e: any) => 
                      e.enrollmentId === enrollment.id && e.scheduleRequestSource && e.status === 'pending'
                    );

                    return (
                      <div key={enrollment.id} className="border rounded-lg overflow-hidden">
                        <div className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {program?.imageUrl ? (
                              <img src={program.imageUrl} alt={program.name || "Program"} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-4 h-4 text-red-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{program?.name || "Program"} <span className="text-xs text-gray-500">• {enrolleeName}</span></p>
                              {isPack && totalCredits > 0 && (
                                <span className="text-xs text-gray-500">{remainingCredits}/{totalCredits} sessions left</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isSchedulingOpen ? "default" : "outline"}
                              className={`flex-shrink-0 ${isSchedulingOpen ? "bg-red-600 hover:bg-red-700" : "border-red-300 text-red-600 hover:bg-red-50"}`}
                              onClick={() => {
                                if (isSchedulingOpen) {
                                  setSchedulingEnrollment(null);
                                  setScheduleSelectedSlot(null);
                                  setScheduleBooked(false);
                                } else {
                                  setSchedulingEnrollment(enrollment.id);
                                  setScheduleDate(new Date());
                                  setScheduleSelectedSlot(null);
                                  setScheduleBooked(false);
                                }
                              }}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {isSchedulingOpen ? "Close" : hasPendingRequest ? "Edit Request" : "Request Time"}
                            </Button>
                          </div>
                        </div>
                        {isSchedulingOpen && program && (
                          <InlineSchedulePanel
                            programId={program.id}
                            programName={program.name}
                            sessionLength={(program as any).sessionLengthMinutes}
                            playerId={enrollment.profileId}
                            enrollmentId={enrollment.id}
                            remainingCredits={remainingCredits}
                            totalCredits={totalCredits}
                            isEditMode={hasPendingRequest}
                            selectedDate={scheduleDate}
                            onDateChange={(d) => { setScheduleDate(d); setScheduleSelectedSlot(null); }}
                            selectedSlot={scheduleSelectedSlot}
                            onSlotSelect={setScheduleSelectedSlot}
                            booked={scheduleBooked}
                            onBooked={() => setScheduleBooked(true)}
                            onBookAnother={() => { setScheduleBooked(false); setScheduleSelectedSlot(null); }}
                            onClose={() => { setSchedulingEnrollment(null); setScheduleSelectedSlot(null); setScheduleBooked(false); }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Upcoming Events Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Today & Tomorrow</h2>
              {eventsLoading ? (
                <div className="flex justify-center py-8" data-testid="loading-events">
                  <BanterLoader />
                </div>
              ) : allUpcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">No Events</h3>
                    <p className="text-gray-600">No events scheduled for today or tomorrow</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {allUpcomingEvents.map((event: any) => (
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
                              {(event.location || event.courtName || event.facilityName) && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[250px]" data-testid={`event-location-${event.id}`}>
                                  {[
                                    event.facilityName,
                                    event.courtName,
                                    event.location && event.location !== event.facilityName ? event.location : null
                                  ].filter(Boolean).join(' · ') || event.location}
                                </span>
                              </div>
                              )}
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
              events={filterEventsByPlayer(events).filter(isConfirmedEvent)} 
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
            {/* Abandoned Cart Banner */}
            <AbandonedCartBanner onCheckoutSessionCreated={(id) => setPendingCheckoutSessionId(id)} />
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" data-testid="heading-payments-store">Programs & Gear</h2>
                <p className="text-gray-500 text-sm">Browse programs and invest in your player's development</p>
              </div>
            </div>

            {/* Programs / Store Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => { setStoreViewTab("programs"); setSelectedStoreCategory(""); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${storeViewTab === "programs" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Programs
              </button>
              <button
                onClick={() => { setStoreViewTab("store"); setSelectedStoreCategory(""); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${storeViewTab === "store" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                Store
              </button>
            </div>

            {/* Category Filter Buttons - Dynamic from programs */}
            {(() => {
              const categoryIconMap: Record<string, any> = {
                basketball: <CircleDot className="w-4 h-4" />,
                target: <Target className="w-4 h-4" />,
                tent: <Calendar className="w-4 h-4" />,
                users: <Users className="w-4 h-4" />,
                trophy: <Trophy className="w-4 h-4" />,
                calendar: <Calendar className="w-4 h-4" />,
                star: <Star className="w-4 h-4" />,
                medal: <Medal className="w-4 h-4" />,
                crown: <Crown className="w-4 h-4" />,
                gear: <ShoppingBag className="w-4 h-4" />,
                digital: <Star className="w-4 h-4" />,
              };
              
              const categoryLabelMap: Record<string, string> = {
                general: "All Programs",
                basketball: "Basketball",
                training: "Training",
                camps: "Camps",
                clinics: "Clinics",
                league: "League",
                tournament: "Tournament",
                membership: "Membership",
                gear: "Gear & Apparel",
                digital: "Digital Academy",
              };
              
              const tabCategory = storeViewTab === "programs" ? "service" : "goods";
              const activePrograms = programs?.filter((p: any) => 
                p.isActive !== false && p.price && p.price > 0 && p.productCategory === tabCategory
              ) || [];
              
              // Store products use tags[0] for category, programs use displayCategory
              const getCategory = (p: any) => {
                if (p.productCategory === 'goods' && p.tags?.[0]) return p.tags[0];
                return p.displayCategory || 'general';
              };
              
              const uniqueCategories = [...new Set(activePrograms.map(getCategory))] as string[];
              
              return (
                <div className="flex overflow-x-auto flex-nowrap gap-2 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" data-testid="category-filter-buttons">
                  <Button
                    variant={!selectedStoreCategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStoreCategory("")}
                    className="rounded-full"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    All
                  </Button>
                  {uniqueCategories.filter(c => c !== 'general').map((category) => {
                    const count = activePrograms.filter((p: any) => getCategory(p) === category).length;
                    const firstProgramIcon = activePrograms.find((p: any) => getCategory(p) === category)?.iconName;
                    const icon = categoryIconMap[firstProgramIcon] || categoryIconMap[category] || <Crown className="w-4 h-4" />;
                    
                    return (
                      <Button
                        key={category}
                        variant={selectedStoreCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedStoreCategory(selectedStoreCategory === category ? "" : category)}
                        className="rounded-full"
                        data-testid={`category-filter-${category}`}
                      >
                        {icon}
                        <span className="ml-1">{categoryLabelMap[category] || category}</span>
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">{count}</Badge>
                      </Button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Products Grid - Filtered by Category */}
            {(() => {
              const categoryLabelMap: Record<string, string> = {
                general: "All Programs",
                basketball: "Basketball",
                training: "Training",
                camps: "Camps",
                clinics: "Clinics",
                league: "League",
                tournament: "Tournament",
                membership: "Membership",
                gear: "Gear & Apparel",
                digital: "Digital Academy",
              };
              
              // Helper to get category from program or store product
              const getCategoryForItem = (p: any) => {
                if (p.productCategory === 'goods' && p.tags?.[0]) return p.tags[0];
                return p.displayCategory || 'general';
              };
              
              const gridTabCategory = storeViewTab === "programs" ? "service" : "goods";
              const filteredProducts = programs?.filter((p: any) => {
                const isActive = p.isActive !== false;
                const hasPrice = p.price && p.price > 0;
                const hasTryout = p.tryoutEnabled && p.tryoutPrice != null;
                if (!isActive || (!hasPrice && !hasTryout) || p.productCategory !== gridTabCategory) return false;
                
                if (!selectedStoreCategory) return true; // Show all when no filter
                
                // Match by displayCategory or tags for store products
                return getCategoryForItem(p) === selectedStoreCategory;
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
                        (categoryLabelMap[selectedStoreCategory] || selectedStoreCategory)
                        : "All Programs"}
                    </h3>
                    {selectedStoreCategory && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedStoreCategory("")}>
                        Clear Filter
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((item: any) => {
                      const isSubscription = item.type === "Subscription";
                      const isPack = item.type === "Pack";
                      const isStore = item.productCategory === "goods";
                      const itemHasTryout = item.priceHidden && item.tryoutEnabled && item.tryoutPrice != null;
                      
                      return (
                        <Card 
                          key={item.id} 
                          className="hover:border-red-300 transition-colors cursor-pointer overflow-hidden flex flex-col"
                          onClick={() => {
                            setSelectedPackage(item.id);
                            setIsStoreItemPurchase(isStore);
                            setIsTryoutPurchase(itemHasTryout);
                            setPaymentDialogOpen(true);
                          }}
                          data-testid={`product-card-${item.id}`}
                        >
                          <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                            {item.coverImageUrl ? (
                              <img src={item.coverImageUrl} alt={item.name} className="w-full h-full object-contain bg-gray-50" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Crown className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4 flex flex-col flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{item.name}</h4>
                              {isStore && <Badge className="bg-purple-100 text-purple-700 border-0">Store</Badge>}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                            )}
                            {itemHasTryout ? (
                              <div className="mt-auto">
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 w-full">
                                  Try Out
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" className="bg-red-600 hover:bg-red-700 w-full mt-auto">
                                {isStore ? "Buy" : "Enroll"}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Payment Drawer - slides up from bottom for better mobile UX */}
            <Drawer open={paymentDialogOpen} onOpenChange={(open) => {
              setPaymentDialogOpen(open);
              if (!open) {
                setIsStoreItemPurchase(false);
                setIsTryoutPurchase(false);
                setTryoutSelectedTeamId("");
                setTryoutRecommendedTeam(null);
                setTryoutMatchingTeams([]);
                setTryoutIsFallback(false);
                setSelectedPackage("");
                setSelectedPlayer("");
                setSelectedPricingOptionId("");
                setSelectedQuoteId("");
                setSelectedAddOns([]);
                setSignedWaivers({});
                setWaiverScrollStatus({});
                setCouponCode("");
                setAppliedCoupon(null);
                setCouponError("");
              }
            }}>
              <DrawerContent className="max-h-[85vh] overflow-hidden" data-testid="dialog-make-payment">
                      <DrawerHeader>
                        <DrawerTitle>{isStoreItemPurchase ? "Purchase Item" : isTryoutPurchase ? "Try Out" : "Make a Payment"}</DrawerTitle>
                        <DrawerDescription>
                          {isStoreItemPurchase ? "Complete your store purchase" : isTryoutPurchase ? "Pay the tryout fee to try this program" : "Select a program and player to enroll"}
                        </DrawerDescription>
                      </DrawerHeader>
                      <div className="space-y-4 px-4 pb-8 overflow-y-auto flex-1 min-h-0">
                        {/* Program Selection - only show for regular program purchases */}
                        {!isStoreItemPurchase && !isTryoutPurchase && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Program</label>
                            <Select value={selectedPackage} onValueChange={(val) => {
                              setSelectedPackage(val);
                              setSelectedPricingOptionId(""); // Reset pricing option when program changes
                              setSelectedQuoteId(""); // Reset quote selection when program changes
                            }}>
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
                        
                        {/* Payment Options - show subscription, bundle, and installment options */}
                        {selectedPackage && !isStoreItemPurchase && !isTryoutPurchase && (() => {
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                          if (!pkg) return null;
                          
                          const pricingOptions = pkg.pricingOptions || [];
                          const installmentPlans = pkg.installmentPlans || [];
                          const isSubscriptionProgram = pkg.type === "Subscription" && pkg.billingCycle && pkg.billingCycle !== "One-Time" && pkg.billingCycle !== "One-time";
                          const hasMultipleOptions = isSubscriptionProgram || pricingOptions.length > 0 || installmentPlans.length > 0;
                          
                          if (!hasMultipleOptions) return null;
                          
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Payment Option</label>
                              <div className="space-y-2">
                                {/* Monthly Subscription Option */}
                                {isSubscriptionProgram && (
                                  <div
                                    onClick={() => setSelectedPricingOptionId("")}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                      selectedPricingOptionId === ""
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    data-testid="pricing-option-monthly"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-sm">Subscription</p>
                                        <p className="text-xs text-gray-500">Billed {pkg.billingCycle?.toLowerCase() || 'monthly'} · Renews automatically · Cancel anytime</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-red-600">${((pkg.price || 0) / 100).toFixed(2)}</p>
                                        <p className="text-xs text-gray-500">per {pkg.billingCycle?.toLowerCase() || 'month'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Pricing Options (One-Time Bundles & Credit Packs) */}
                                {pricingOptions.map((option: any) => (
                                  <div key={option.id}>
                                    <div
                                      onClick={() => setSelectedPricingOptionId(option.id)}
                                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedPricingOptionId === option.id
                                          ? 'border-red-500 bg-red-50'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                      data-testid={`pricing-option-${option.id}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium text-sm">{option.name}{option.allowInstallments ? (option.payInFullDiscount ? ` (Pay in Full - ${option.payInFullDiscount}% off)` : ' (Pay in Full)') : ''}</p>
                                          {option.optionType === "credit_pack" && option.creditCount ? (
                                            <p className="text-xs text-blue-600">{option.creditCount} session{option.creditCount > 1 ? 's' : ''} included</p>
                                          ) : option.optionType === "subscription" || (option.billingCycle && option.billingCycle !== "One-Time" && option.billingCycle !== "One-time") ? (
                                            <p className="text-xs text-purple-600">
                                              Subscription · Billed {option.billingInterval || option.billingCycle?.toLowerCase() || "monthly"}
                                              {option.trialDays ? ` · ${option.trialDays}-day free trial` : ''}
                                              {' · Cancel anytime'}
                                            </p>
                                          ) : option.durationDays ? (
                                            <p className="text-xs text-gray-500">Prepaid · {option.durationDays}-day access</p>
                                          ) : (
                                            <p className="text-xs text-gray-500">One-time purchase</p>
                                          )}
                                          {option.convertsToMonthly && (
                                            <p className="text-xs text-green-600">Then ${(option.monthlyPrice / 100).toFixed(2)}/month after</p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          {option.allowInstallments && option.payInFullDiscount && option.payInFullDiscount > 0 ? (
                                            <>
                                              <p className="font-semibold text-red-600">
                                                ${(Math.round(option.price * (1 - option.payInFullDiscount / 100)) / 100).toFixed(2)}
                                              </p>
                                              <p className="text-xs text-gray-400 line-through">${(option.price / 100).toFixed(2)}</p>
                                            </>
                                          ) : (
                                            <p className="font-semibold text-red-600">
                                              ${(option.price / 100).toFixed(2)}
                                              {(option.optionType === "subscription" || (option.billingCycle && option.billingCycle !== "One-Time" && option.billingCycle !== "One-time")) && (
                                                <span className="text-xs font-normal text-gray-500">/{option.billingInterval === "yearly" ? "yr" : option.billingInterval === "quarterly" ? "qtr" : option.billingInterval === "weekly" ? "wk" : "mo"}</span>
                                              )}
                                            </p>
                                          )}
                                          {option.optionType === "credit_pack" && option.creditCount ? (
                                            <p className="text-xs text-gray-500">${((option.price / 100) / option.creditCount).toFixed(2)}/session</p>
                                          ) : null}
                                          {option.savingsNote && (
                                            <p className="text-xs text-green-600">{option.savingsNote}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {option.allowInstallments && option.installmentCount && option.installmentPrice && (() => {
                                      const interval = option.installmentIntervalDays || 30;
                                      const freqLabel = interval === 7 ? "weekly"
                                        : interval === 14 ? "bi-weekly"
                                        : interval === 30 ? "monthly"
                                        : interval === 90 ? "quarterly"
                                        : interval === 180 ? "every 6 months"
                                        : `every ${interval} days`;
                                      return (
                                      <div
                                        onClick={() => setSelectedPricingOptionId(`${option.id}_installments`)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors mt-1 ${
                                          selectedPricingOptionId === `${option.id}_installments`
                                            ? 'border-amber-500 bg-amber-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        data-testid={`pricing-option-installments-${option.id}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="font-medium text-sm">{option.name} (Installment Plan)</p>
                                            <p className="text-xs text-amber-700">
                                              {option.installmentCount} {freqLabel} payments
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-amber-600">
                                              ${(option.installmentPrice / 100).toFixed(2)}<span className="text-xs font-normal text-gray-500">/payment</span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              ${((option.installmentCount * option.installmentPrice) / 100).toFixed(2)} total
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                                
                                {/* Installment Plan Options */}
                                {installmentPlans.map((plan: any) => (
                                  <div
                                    key={plan.id}
                                    onClick={() => setSelectedPricingOptionId(`installment_${plan.id}`)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                      selectedPricingOptionId === `installment_${plan.id}`
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    data-testid={`pricing-option-installment-${plan.id}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-sm">{plan.name || `${plan.numberOfPayments} Payment Plan`}</p>
                                        <p className="text-xs text-gray-500">
                                          {plan.numberOfPayments} payments of ${((plan.paymentAmount || 0) / 100).toFixed(2)}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-red-600">
                                          ${(((plan.paymentAmount || 0) * plan.numberOfPayments) / 100).toFixed(2)} total
                                        </p>
                                        <p className="text-xs text-gray-500">split into {plan.numberOfPayments} payments</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Personalized Quote Options - show quotes for this program */}
                                {pendingQuotes
                                  .filter((quote: any) => quote.items?.some((item: any) => item.productId === selectedPackage))
                                  .map((quote: any) => {
                                    const quoteItem = quote.items?.find((item: any) => item.productId === selectedPackage);
                                    const quotePrice = quoteItem?.quotedPrice || quoteItem?.price || 0;
                                    return (
                                      <div
                                        key={quote.id}
                                        onClick={() => {
                                          setSelectedQuoteId(quote.id);
                                          setSelectedPricingOptionId(`quote_${quote.id}`);
                                        }}
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                          selectedQuoteId === quote.id
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-amber-200 bg-amber-50 hover:border-amber-300'
                                        }`}
                                        data-testid={`pricing-option-quote-${quote.id}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="font-medium text-sm flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              Personalized Quote
                                            </p>
                                            <p className="text-xs text-amber-700">
                                              Special pricing for you
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-red-600">${(quotePrice / 100).toFixed(2)}</p>
                                            <p className="text-xs text-green-600">Custom offer</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Schedule Request Notice - shown prominently after pricing options */}
                        {selectedPackage && !isStoreItemPurchase && !isTryoutPurchase && (() => {
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                          if (!pkg?.scheduleRequestEnabled) return null;
                          return (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200" data-testid="schedule-request-notice">
                              <CalendarCheck className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-amber-900">Session Scheduling Included</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                  After purchase, you can book{pkg.sessionLengthMinutes ? ` ${pkg.sessionLengthMinutes}-minute` : ''} sessions directly from your active programs.
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Player Selection (conditionally shown based on billing model - not for store items) */}
                        {selectedPackage && !isStoreItemPurchase && (() => {
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                          const billingModel = (pkg?.billingModel || 'Per Player').toLowerCase().replace(/[^a-z]/g, '');
                          const requiresPlayerSelection = isTryoutPurchase || (billingModel.includes('player') && !billingModel.includes('family') && !billingModel.includes('organization'));
                          
                          if (!requiresPlayerSelection) {
                            return null;
                          }
                          
                          return (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Player *</label>
                              <Select value={selectedPlayer} onValueChange={(val) => {
                                if (val === "__add_new__") {
                                  try {
                                    localStorage.setItem("pendingPayment", JSON.stringify({
                                      packageId: selectedPackage,
                                      pricingOptionId: selectedPricingOptionId,
                                      addOns: selectedAddOns,
                                      isTryout: isTryoutPurchase,
                                      isStoreItem: isStoreItemPurchase,
                                    }));
                                  } catch {}
                                  setPaymentDialogOpen(false);
                                  setLocation("/add-player?returnTo=payments");
                                } else {
                                  setSelectedPlayer(val);
                                }
                              }}>
                                <SelectTrigger data-testid="select-player">
                                  <SelectValue placeholder="Select a player" />
                                </SelectTrigger>
                                <SelectContent>
                                  {players?.map((player: any) => (
                                    <SelectItem key={player.id} value={player.id} data-testid={`player-option-${player.id}`}>
                                      {player.firstName} {player.lastName}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__add_new__" data-testid="player-option-add-new">
                                    <span className="flex items-center gap-2 text-red-600 font-medium">
                                      <UserPlus className="w-4 h-4" />
                                      Add New Player
                                    </span>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-600">
                                This is a per-player program. Select which player this payment is for.
                              </p>
                            </div>
                          );
                        })()}

                        {/* Tryout Team Recommendation */}
                        {isTryoutPurchase && selectedPlayer && tryoutMatchingTeams.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {tryoutMatchingTeams.length > 1 ? 'Select Team' : 'Recommended Team'}
                            </label>
                            {tryoutMatchingTeams.length > 1 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-500">
                                  {tryoutIsFallback
                                    ? 'No exact match found — please select a team:'
                                    : 'Multiple teams match your player. Please select one:'}
                                </p>
                                <Select value={tryoutSelectedTeamId} onValueChange={(val) => {
                                  setTryoutSelectedTeamId(val);
                                  setTryoutRecommendedTeam(tryoutMatchingTeams.find((t: any) => String(t.id) === val) || null);
                                }}>
                                  <SelectTrigger data-testid="select-tryout-team">
                                    <SelectValue placeholder="Choose a team" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tryoutMatchingTeams.map((team: any) => (
                                      <SelectItem key={team.id} value={String(team.id)}>
                                        {team.name}{team.division ? ` (${team.division})` : ''}{team.level ? ` · ${team.level.charAt(0).toUpperCase() + team.level.slice(1)}` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : tryoutRecommendedTeam ? (
                              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                                <p className="font-medium text-sm">{tryoutRecommendedTeam.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {tryoutRecommendedTeam.division && `${tryoutRecommendedTeam.division} · `}
                                  {tryoutRecommendedTeam.level && `${tryoutRecommendedTeam.level.charAt(0).toUpperCase() + tryoutRecommendedTeam.level.slice(1)} · `}
                                  Best match for your player
                                </p>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {isTryoutPurchase && selectedPlayer && tryoutProgramTeams.length === 0 && (
                          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-sm text-amber-800">No teams are set up for this program yet. You can still purchase the tryout.</p>
                          </div>
                        )}

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
                              
                              {!isStoreProduct && !isTryoutPurchase && (
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
                                  {pkg.scheduleRequestEnabled && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                      <CalendarCheck className="w-3 h-3 mr-1" />
                                      Book Sessions After Purchase
                                    </span>
                                  )}
                                </div>
                              )}
                              {isTryoutPurchase && (
                                <div className="flex gap-2 flex-wrap">
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    One-Time Payment
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    1 Session Credit
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Required Waivers Section */}
                        {selectedPackage && !isStoreItemPurchase && !isTryoutPurchase && requiredWaivers.length > 0 && (
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
                        {selectedPackage && !isStoreItemPurchase && !isTryoutPurchase && hasSuggestedAddOns && (
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
                          const pricingOptions = pkg.pricingOptions || [];
                          const installmentPlans = pkg.installmentPlans || [];
                          const selectedOption = pricingOptions.find((opt: any) => opt.id === selectedPricingOptionId);
                          
                          // Check if a bundle installment option is selected (e.g., "{optionId}_installments")
                          const isBundleInstallmentSelected = selectedPricingOptionId.endsWith('_installments');
                          const bundleInstallmentBaseId = isBundleInstallmentSelected ? selectedPricingOptionId.replace('_installments', '') : null;
                          const bundleInstallmentOption = bundleInstallmentBaseId ? pricingOptions.find((opt: any) => opt.id === bundleInstallmentBaseId) : null;
                          
                          // Check if an old-style installment plan is selected
                          const isInstallmentSelected = selectedPricingOptionId.startsWith('installment_');
                          const selectedInstallmentId = isInstallmentSelected ? selectedPricingOptionId.replace('installment_', '') : null;
                          const selectedInstallment = installmentPlans.find((p: any) => p.id === selectedInstallmentId);
                          
                          // Use selected pricing option price if available, otherwise use base price
                          // For tryout purchases, use the tryout price
                          let basePrice = isTryoutPurchase ? (pkg.tryoutPrice || 0) : (pkg.price || 0);
                          let displayName = isTryoutPurchase ? `${pkg.name} (Try Out)` : pkg.name;
                          
                          if (bundleInstallmentOption) {
                            basePrice = bundleInstallmentOption.installmentPrice || 0;
                            displayName = `${pkg.name} - ${bundleInstallmentOption.name} (Installment Plan)`;
                          } else if (selectedOption) {
                            basePrice = selectedOption.price;
                            displayName = `${pkg.name} - ${selectedOption.name}`;
                          } else if (selectedInstallment) {
                            basePrice = (selectedInstallment.paymentAmount || 0) * selectedInstallment.numberOfPayments;
                            displayName = `${pkg.name} - ${selectedInstallment.name || `${selectedInstallment.numberOfPayments} Payment Plan`}`;
                          }
                          
                          const addOnsTotal = selectedAddOns.reduce((sum, id) => {
                            const item = suggestedAddOnProducts.find((s: any) => s.id === id);
                            return sum + (item?.price || 0);
                          }, 0);
                          let discountAmount = 0;
                          if (appliedCoupon) {
                            if (appliedCoupon.discountType === 'percentage') {
                              discountAmount = Math.round(basePrice * appliedCoupon.discountValue / 100);
                            } else {
                              discountAmount = appliedCoupon.discountValue;
                            }
                          }
                          const totalPrice = Math.max(0, basePrice - discountAmount) + addOnsTotal;
                          
                          // Determine billing type display
                          const isBundle = !!selectedOption;
                          const isSubscription = !isTryoutPurchase && !isBundle && !isInstallmentSelected && !isBundleInstallmentSelected && pkg.type === "Subscription" && pkg.billingCycle && pkg.billingCycle !== "One-Time" && pkg.billingCycle !== "One-time";
                          
                          return (
                            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{displayName}</span>
                                <span>${(basePrice / 100).toFixed(2)}{isBundleInstallmentSelected ? '/payment' : ''}</span>
                              </div>
                              {bundleInstallmentOption && (() => {
                                const intv = bundleInstallmentOption.installmentIntervalDays || 30;
                                const fLabel = intv === 7 ? "weekly" : intv === 14 ? "bi-weekly" : intv === 30 ? "monthly" : intv === 90 ? "quarterly" : intv === 180 ? "every 6 months" : `every ${intv} days`;
                                return (
                                <p className="text-xs text-amber-700">
                                  {bundleInstallmentOption.installmentCount} {fLabel} payments of ${((bundleInstallmentOption.installmentPrice || 0) / 100).toFixed(2)} · ${((bundleInstallmentOption.installmentCount * (bundleInstallmentOption.installmentPrice || 0)) / 100).toFixed(2)} total
                                </p>
                                );
                              })()}
                              {selectedOption?.optionType === "subscription" || (selectedOption?.billingCycle && selectedOption.billingCycle !== "One-Time" && selectedOption.billingCycle !== "One-time") ? (
                                <p className="text-xs text-gray-500">
                                  Subscription · Billed {selectedOption.billingInterval || selectedOption.billingCycle?.toLowerCase() || "monthly"} · Cancel anytime
                                </p>
                              ) : selectedOption?.durationDays ? (
                                <p className="text-xs text-gray-500">
                                  Prepaid · {selectedOption.durationDays}-day access
                                  {selectedOption.convertsToMonthly && ` · Then $${(selectedOption.monthlyPrice / 100).toFixed(2)}/month`}
                                </p>
                              ) : selectedOption ? (
                                <p className="text-xs text-gray-500">One-time purchase</p>
                              ) : null}
                              {selectedInstallment && (
                                <p className="text-xs text-gray-500">
                                  First payment: ${((selectedInstallment.paymentAmount || 0) / 100).toFixed(2)} today
                                </p>
                              )}
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
                              {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                  <span>Discount ({appliedCoupon?.discountType === 'percentage' ? `${appliedCoupon?.discountValue}%` : `$${((appliedCoupon?.discountValue || 0) / 100).toFixed(2)}`})</span>
                                  <span>-${(discountAmount / 100).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                <span className="font-semibold">Total:</span>
                                <div className="text-right">
                                  <span className="text-xl font-bold">${(totalPrice / 100).toFixed(2)}</span>
                                  {isSubscription && (
                                    <p className="text-xs text-gray-500">
                                      per {pkg.billingCycle.toLowerCase()} · Renews automatically
                                    </p>
                                  )}
                                  {isBundle && (selectedOption?.optionType === "subscription" || (selectedOption?.billingCycle && selectedOption.billingCycle !== "One-Time" && selectedOption.billingCycle !== "One-time")) ? (
                                    <p className="text-xs text-gray-500">per {selectedOption.billingInterval || selectedOption.billingCycle?.toLowerCase() || "month"} · Cancel anytime</p>
                                  ) : isBundle && !selectedOption?.convertsToMonthly ? (
                                    <p className="text-xs text-gray-500">prepaid</p>
                                  ) : null}
                                  {selectedInstallment && (
                                    <p className="text-xs text-gray-500">
                                      {selectedInstallment.numberOfPayments} payments
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Subscription Disclosure */}
                        {(() => {
                          const pkg = (programs as any[])?.find((p: any) => p.id === selectedPackage);
                          const isSubscription = pkg?.type === "Subscription";
                          const disclosure = pkg?.subscriptionDisclosure;
                          
                          if (isSubscription && disclosure) {
                            return (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800" data-testid="subscription-disclosure">
                                <p className="font-medium mb-1">Subscription Terms</p>
                                <p className="whitespace-pre-wrap">{disclosure}</p>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Coupon Code Input */}
                        {selectedPackage && !isStoreItemPurchase && !isTryoutPurchase && (
                          <div className="border-t pt-3">
                            <label className="text-xs text-muted-foreground">Have a coupon code?</label>
                            <div className="flex gap-2 mt-1">
                              <input
                                type="text"
                                placeholder="Enter code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                className="flex-1 bg-muted border border-border rounded px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring"
                                disabled={!!appliedCoupon}
                              />
                              {appliedCoupon ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setAppliedCoupon(null);
                                    setCouponCode("");
                                    setCouponError("");
                                  }}
                                >
                                  Remove
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    if (!couponCode.trim()) return;
                                    setValidatingCoupon(true);
                                    setCouponError("");
                                    try {
                                      const res = await fetch('/api/coupons/validate', {
                                        method: 'POST',
                                        credentials: 'include',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ code: couponCode.trim(), programId: selectedPackage }),
                                      });
                                      const data = await res.json();
                                      if (!res.ok) {
                                        setCouponError(data.error || 'Invalid coupon');
                                        setAppliedCoupon(null);
                                      } else {
                                        setAppliedCoupon(data.coupon);
                                        setCouponError("");
                                      }
                                    } catch {
                                      setCouponError("Failed to validate coupon");
                                      setAppliedCoupon(null);
                                    } finally {
                                      setValidatingCoupon(false);
                                    }
                                  }}
                                  disabled={!couponCode.trim() || validatingCoupon}
                                  variant="secondary"
                                >
                                  {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
                                </Button>
                              )}
                            </div>
                            {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
                            {appliedCoupon && (
                              <div className="flex items-center gap-1 mt-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="text-xs text-green-500">
                                  {appliedCoupon.discountType === 'percentage'
                                    ? `${appliedCoupon.discountValue}% discount applied`
                                    : `$${(appliedCoupon.discountValue / 100).toFixed(2)} discount applied`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

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
                              // Task #323: bail if a checkout request is already
                              // in flight. The button is also disabled via
                              // `isProcessingPayment`, but a fast double-tap can
                              // fire two clicks before React re-renders.
                              if (isProcessingPayment) return;
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
                                const requiresPlayerSelection = isTryoutPurchase || (billingModel.includes('player') && !billingModel.includes('family') && !billingModel.includes('organization'));

                                if (requiresPlayerSelection && !selectedPlayer) {
                                  toast({
                                    title: "Error",
                                    description: isTryoutPurchase ? "Please select a player for the tryout" : "Please select a player for this per-player program",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                              }
                              
                              // Validate waivers are signed (skip for tryout)
                              if (!isStoreProduct && !isTryoutPurchase && requiredWaivers.length > 0) {
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
                                console.log('[Payment] Starting checkout for package:', selectedPackage);
                                
                                let checkoutUrl: string;
                                let checkoutSessionId: string | undefined;

                                if (isTryoutPurchase) {
                                  const tryoutData = await apiRequest("/api/payments/create-tryout-checkout", {
                                    method: "POST",
                                    data: {
                                      programId: selectedPackage,
                                      playerId: selectedPlayer || null,
                                      recommendedTeamId: tryoutSelectedTeamId ? parseInt(tryoutSelectedTeamId) : undefined,
                                      platform: Capacitor.getPlatform() === 'ios' ? 'ios' : (Capacitor.getPlatform() === 'android' ? 'android' : 'web'),
                                      successUrl: `${window.location.origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                                      cancelUrl: `${window.location.origin}/unified-account?payment=canceled`,
                                    },
                                  }) as { sessionUrl?: string; url?: string; sessionId?: string };
                                  checkoutUrl = tryoutData.sessionUrl || tryoutData.url || '';
                                  checkoutSessionId = tryoutData.sessionId;
                                } else {
                                  // Regular checkout session - backend handles both program and store purchases
                                  // Pass platform so server can use deep links for iOS
                                  const response = await apiRequest("/api/payments/create-checkout", {
                                    method: "POST",
                                    data: {
                                      packageId: selectedPackage,
                                      playerId: isStoreProduct ? null : (selectedPlayer || null),
                                      isStoreItem: isStoreProduct,
                                      selectedPricingOptionId: selectedPricingOptionId || undefined,
                                      addOnIds: selectedAddOns.length > 0 ? selectedAddOns : undefined,
                                      signedWaiverIds: Object.keys(signedWaivers).filter(id => signedWaivers[id]),
                                      platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'web',
                                      couponCode: appliedCoupon?.code || undefined,
                                    },
                                  }) as { url: string; sessionId?: string };
                                  checkoutUrl = response.url;
                                  checkoutSessionId = response.sessionId;
                                }
                                
                                const response = { url: checkoutUrl, sessionId: checkoutSessionId };

                                console.log('[Payment] Got checkout URL:', response.url);

                                // Redirect to Stripe checkout
                                if (Capacitor.isNativePlatform()) {
                                  // Store session ID so we can verify payment when browser closes
                                  if (response.sessionId) {
                                    setPendingCheckoutSessionId(response.sessionId);
                                  }
                                  
                                  // Close drawer first to ensure clean state
                                  setPaymentDialogOpen(false);
                                  setIsProcessingPayment(false);
                                  
                                  // Small delay to let drawer close, then open in-app browser
                                  setTimeout(async () => {
                                    try {
                                      console.log('[Payment] Opening Stripe checkout in-app browser');
                                      await Browser.open({ 
                                        url: response.url,
                                        toolbarColor: '#dc2626',
                                        presentationStyle: 'popover',
                                      });
                                    } catch (browserError: any) {
                                      console.error('[Payment] Browser.open failed:', browserError);
                                      // Fallback - redirect in main webview
                                      window.location.href = response.url;
                                    }
                                  }, 200);
                                } else {
                                  window.location.href = response.url;
                                }
                              } catch (error: any) {
                                console.error('[Payment] Checkout error:', error);
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
                    </DrawerContent>
                  </Drawer>
            
            {/* Payment History Component */}
            <PaymentHistory selectedPlayer={selectedStorePlayer} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <ParentMessagesSection players={players} userId={user?.id} />
          </TabsContent>

          <TabsContent value="players" className="space-y-6" data-testid="tab-content-players">
            {playersLoading ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-3">
                      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
                      <div className="h-32 bg-gray-100 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : players.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="text-base font-semibold mb-1">No players linked yet</h3>
                  <p className="text-sm text-gray-500">Link a player to your account to see their progress here.</p>
                </CardContent>
              </Card>
            ) : players.length === 1 ? (
              <div className="space-y-6">
                <PlayerProgressCard player={players[0]} />
              </div>
            ) : (
              <Tabs defaultValue={String(players[0].id)} className="space-y-4">
                <div className="overflow-x-auto -mx-1 px-1">
                  <TabsList className="inline-flex w-auto bg-transparent border-b border-gray-200 rounded-none p-0 h-auto gap-0">
                    {players.map((p: any) => {
                      const initials = `${p?.firstName?.[0] || ''}${p?.lastName?.[0] || ''}`.toUpperCase() || '?';
                      return (
                        <TabsTrigger
                          key={p.id}
                          value={String(p.id)}
                          data-testid={`tab-player-${p.id}`}
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-4 py-2 flex items-center gap-2 whitespace-nowrap"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={p?.profileImageUrl} alt={`${p?.firstName} ${p?.lastName}`} />
                            <AvatarFallback className="bg-red-600 text-white text-[10px] font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{p?.firstName} {p?.lastName}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
                {players.map((p: any) => (
                  <TabsContent key={p.id} value={String(p.id)} className="space-y-6" data-testid={`tab-content-player-${p.id}`}>
                    <PlayerProgressCard player={p} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

        </Tabs>

      {/* Hidden file input for parent photo upload */}
      <input
        ref={parentPhotoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
            return;
          }
          setParentPhotoUploading(true);
          try {
            const formData = new FormData();
            formData.append('photo', file);
            const token = localStorage.getItem('authToken');
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;
            const res = await fetch('/api/upload-profile-photo', { method: 'POST', headers, body: formData, credentials: 'include' });
            if (!res.ok) throw new Error('Upload failed');
            const result = await res.json();
            if (result?.imageUrl) {
              queryClient.setQueryData(["/api/auth/user"], (old: any) => old ? { ...old, profileImageUrl: result.imageUrl } : old);
            }
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/account/profiles"] });
            queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
            toast({ title: "Success", description: "Profile photo updated!" });
          } catch {
            toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
          } finally {
            setParentPhotoUploading(false);
            e.target.value = '';
          }
        }}
      />

      {/* Settings & Profile Drawer */}
      <Drawer open={settingsDrawerOpen} onOpenChange={setSettingsDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Profile & Settings
            </DrawerTitle>
            <DrawerDescription>Manage your account and preferences</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8 space-y-6">
            {/* Profile Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer" onClick={() => parentPhotoInputRef.current?.click()}>
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-xl font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {parentPhotoUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                    </div>
                  )}
                </div>
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
            </div>

            {/* Linked Players Section */}
            <div>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Linked Players ({players.length})
              </h3>
              {players.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No players linked to your account yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {players.map((player: any) => (
                    <PlayerProfileCard 
                      key={player.id} 
                      player={player} 
                      onCoachClick={(id: string) => { setCoachProfileId(id); setCoachProfileOpen(true); }}
                      onNavigateToPayments={() => { setSettingsDrawerOpen(false); setParentDashTab("payments"); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Account Settings Section */}
            <div className="pt-4 border-t space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Account Settings
              </h3>
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

            {/* Danger Zone */}
            <SettingsDangerZone user={user} />
          </div>
        </DrawerContent>
      </Drawer>
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
                  setSettingsDrawerOpen(true);
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

      <CoachProfileDialog
        coachId={coachProfileId}
        open={coachProfileOpen}
        onOpenChange={(open) => { setCoachProfileOpen(open); if (!open) setCoachProfileId(null); }}
      />

      </div>
    </>
  );
}

function ParentTeamCard({ chatroom, onCoachSelect }: { chatroom: any; onCoachSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rosterData } = useQuery<any>({
    queryKey: ["/api/teams", chatroom.teamId, "roster-with-notion"],
    enabled: expanded,
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/teams/${chatroom.teamId}/roster-with-notion`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: coachInfo } = useQuery<any>({
    queryKey: ["/api/users", chatroom.coachId],
    enabled: expanded && !!chatroom.coachId,
  });

  const roster = rosterData || [];
  const players = roster.filter((m: any) => m.role !== 'coach' && m.role !== 'head_coach' && m.role !== 'assistant_coach');

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shirt className="h-4 w-4 text-red-600" />
            <span className="font-medium text-sm text-gray-900">{chatroom.teamName}</span>
          </div>
          {chatroom.playerNames?.length > 0 && (
            <div className="text-xs text-gray-500 mt-0.5 ml-6">
              {chatroom.playerNames.join(', ')}
            </div>
          )}
          {chatroom.coachName && (
            <div className="text-xs text-gray-400 mt-0.5 ml-6">
              Coach: {chatroom.coachName}
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {coachInfo && (
            <div
              className="flex items-center gap-2 p-2 bg-red-50 rounded hover:bg-red-100 cursor-pointer transition-colors"
              onClick={() => onCoachSelect(coachInfo.id)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={coachInfo.profileImageUrl} />
                <AvatarFallback className="text-xs bg-red-600 text-white">
                  {coachInfo.firstName?.[0]}{coachInfo.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {coachInfo.firstName} {coachInfo.lastName}
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-600 text-white rounded">COACH</span>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
            </div>
          )}

          {chatroom.assistantCoachIds?.map((acId: string, i: number) => (
            <ParentAssistantCoachEntry key={acId} coachId={acId} onCoachSelect={onCoachSelect} />
          ))}

          {players.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-gray-500 mb-1">Roster ({players.length})</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {players.map((p: any, i: number) => (
                  <div key={p.id || i} className="flex items-center gap-2 p-1.5 rounded text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
                        {(p.firstName || p.name || '?')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-gray-700">
                      {p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.name || 'Player'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!coachInfo && players.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">Loading team info...</div>
          )}
        </div>
      )}
    </div>
  );
}

function calculateOverallSkillAverage(evaluation: any): number {
  const skillsData = evaluation?.skillsData || evaluation?.scores;
  if (!skillsData || typeof skillsData !== 'object') return 0;
  const allScores: number[] = [];
  Object.values(skillsData).forEach((value: any) => {
    if (typeof value === 'number') {
      allScores.push(value);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach((subValue: any) => {
        if (typeof subValue === 'number') allScores.push(subValue);
      });
    }
  });
  if (allScores.length === 0) return 0;
  const average = allScores.reduce((sum, val) => sum + val, 0) / allScores.length;
  return Math.round((average / 5) * 100);
}

function PlayerProgressCard({ player }: { player: any }) {
  const playerId = player?.id;

  const { data: awardsSummary, isLoading: awardsLoading } = useQuery<any>({
    queryKey: ["/api/users", playerId, "awards"],
    enabled: !!playerId,
  });

  const { data: latestEvaluation, isLoading: evalLoading } = useQuery<any>({
    queryKey: ["/api/players/" + playerId + "/latest-evaluation"],
    enabled: !!playerId,
  });

  const ringsData = (() => {
    if (awardsSummary?.tierSummary) {
      return {
        legacy: awardsSummary.tierSummary.legacy,
        hof: awardsSummary.tierSummary.hof,
        superstar: awardsSummary.tierSummary.superstar,
        allStar: awardsSummary.tierSummary.allStar,
        starter: awardsSummary.tierSummary.starter,
        prospect: awardsSummary.tierSummary.prospect,
      };
    }
    if (awardsSummary) {
      return {
        legacy: { earned: awardsSummary.trophiesCount || 0, total: 1 },
        hof: { earned: awardsSummary.hallOfFameBadgesCount || 0, total: 1 },
        superstar: { earned: awardsSummary.superstarBadgesCount || 0, total: 1 },
        allStar: { earned: awardsSummary.allStarBadgesCount || 0, total: 1 },
        starter: { earned: awardsSummary.starterBadgesCount || 0, total: 1 },
        prospect: { earned: awardsSummary.prospectBadgesCount || 0, total: 1 },
      };
    }
    return null;
  })();

  const totalAwards = (() => {
    if (!awardsSummary) return 0;
    if (Array.isArray(awardsSummary.allAwards)) return awardsSummary.allAwards.length;
    if (awardsSummary.tierSummary) {
      return Object.values(awardsSummary.tierSummary).reduce(
        (sum: number, tier: any) => sum + (tier?.earned || 0),
        0
      );
    }
    return 0;
  })();

  const overallSkillScore = calculateOverallSkillAverage(latestEvaluation);
  const skillsData = latestEvaluation?.skillsData || latestEvaluation?.scores;

  const skillCategories: { label: string; pct: number }[] = (() => {
    if (!skillsData || typeof skillsData !== 'object') return [];
    return Object.entries(skillsData)
      .map(([label, value]: [string, any]) => {
        let avg = 0;
        if (typeof value === 'number') {
          avg = value;
        } else if (typeof value === 'object' && value !== null) {
          const nums = Object.values(value).filter((v: any) => typeof v === 'number') as number[];
          if (nums.length > 0) avg = nums.reduce((s, n) => s + n, 0) / nums.length;
        }
        return { label, pct: Math.round((avg / 5) * 100) };
      })
      .filter((c) => c.pct > 0);
  })();

  const initials = `${player?.firstName?.[0] || ''}${player?.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <Card data-testid={`card-player-progress-${playerId}`}>
      <CardContent className="p-4 md:p-6 space-y-5">
        {/* Player Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Avatar className="h-12 w-12">
            <AvatarImage src={player?.profileImageUrl} alt={`${player?.firstName} ${player?.lastName}`} />
            <AvatarFallback className="bg-red-600 text-white font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate" data-testid={`text-player-name-${playerId}`}>
              {player?.firstName} {player?.lastName}
            </div>
            {player?.teamName && (
              <div className="text-xs text-gray-500 truncate">{player.teamName}</div>
            )}
          </div>
        </div>

        {/* Player Progress (Trophy Rings) */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Trophy className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-gray-700">Player Progress</span>
            {totalAwards > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                {totalAwards} {totalAwards === 1 ? 'award' : 'awards'}
              </span>
            )}
          </div>
          {awardsLoading ? (
            <div className="h-32 bg-gray-100 rounded animate-pulse" />
          ) : ringsData && totalAwards > 0 ? (
            <div data-testid={`section-rings-${playerId}`}>
              <UypTrophyRings data={ringsData} size={96} stroke={8} />
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-500" data-testid={`empty-awards-${playerId}`}>
              No awards earned yet — keep showing up to start filling these rings.
            </div>
          )}
        </div>

        {/* Skills Evaluation Summary */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-gray-700">Skills Evaluation</span>
          </div>
          {evalLoading ? (
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          ) : overallSkillScore > 0 ? (
            <div className="space-y-3" data-testid={`section-evaluation-${playerId}`}>
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</span>
                <span className="text-2xl font-bold text-red-600" data-testid={`text-ovr-${playerId}`}>
                  {overallSkillScore}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all"
                  style={{ width: `${overallSkillScore}%` }}
                />
              </div>
              {skillCategories.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                  {skillCategories.map((cat) => (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 capitalize truncate">{cat.label.toLowerCase()}</span>
                        <span className="text-gray-900 font-medium">{cat.pct}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-red-400 h-1.5 rounded-full"
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500" data-testid={`empty-evaluation-${playerId}`}>
              No skills evaluation yet. A coach will share one after the next assessment.
            </div>
          )}
        </div>

        {/* Approved Season Stats */}
        <div className="border-t pt-2">
          <ApprovedSeasonStats playerId={playerId} compact />
        </div>

        {/* AI Insights — Coming Soon placeholder */}
        {/* TODO: Wire AI Insights backend when available. */}
        <div className="border-t pt-4">
          <div className="rounded-lg border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4" data-testid={`section-ai-insights-${playerId}`}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">AI Insights</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Personalized recommendations and trend analysis for {player?.firstName || 'your player'} will appear here.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ParentAssistantCoachEntry({ coachId, onCoachSelect }: { coachId: string; onCoachSelect: (id: string) => void }) {
  const { data: coach } = useQuery<any>({
    queryKey: ["/api/users", coachId],
  });

  if (!coach) return null;

  return (
    <div
      className="flex items-center gap-2 p-2 bg-red-50 rounded hover:bg-red-100 cursor-pointer transition-colors"
      onClick={() => onCoachSelect(coachId)}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={coach.profileImageUrl} />
        <AvatarFallback className="text-xs bg-red-600 text-white">
          {coach.firstName?.[0]}{coach.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">
          {coach.firstName} {coach.lastName}
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded">ASST</span>
        </div>
      </div>
      <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
    </div>
  );
}
