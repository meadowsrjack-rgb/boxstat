import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { authPersistence } from "@/services/authPersistence";
import CrmMessageBanner from "@/components/CrmMessageBanner";
import StorePurchaseBanner from "@/components/StorePurchaseBanner";
import EnrollmentAssignmentBanner from "@/components/EnrollmentAssignmentBanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BanterLoader } from "@/components/BanterLoader";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Users,
  Calendar,
  Trophy,
  DollarSign,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Award,
  Upload,
  Download,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Target,
  Eye,
  ArrowLeft,
  Star,
  Bell,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Circle,
  Shield,
  AlertCircle,
  AlertTriangle,
  LogOut,
  FileText,
  UserPlus,
  UserCircle,
  ShoppingBag,
  Package,
  Gift,
  Image as ImageIcon,
  X,
  Headphones,
  MessageSquare,
  ExternalLink,
  Link as LinkIcon,
  Send,
  StickyNote,
  Phone,
  Mail,
  User,
  Search,
  Flag,
  Check,
  CreditCard,
  EyeOff,
  Clock,
  UsersRound,
  Ticket,
  Copy,
  SlidersHorizontal,
  Pin,
  PinOff,
  VolumeX,
  Volume2,
  Eraser,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useLocation } from "wouter";
import PlayerDashboard from "./player-dashboard";
import { insertDivisionSchema, insertNotificationSchema, insertTeamSchema } from "@shared/schema";
import { LocationSearch } from "@/components/LocationSearch";
import AttendanceList from "@/components/AttendanceList";
import { format } from "date-fns";
import RevenueTrendChart from "@/components/RevenueTrendChart";
import { TIMEZONE_OPTIONS, getBrowserTimezone, localDatetimeToUTC, utcToLocalDatetime, getTimezoneAbbreviation } from "@/lib/time";
import EventWindowsConfigurator from "@/components/EventWindowsConfigurator";
import type { EventWindow } from "@shared/schema";
import EventDetailModal from "@/components/EventDetailModal";
import { SKILL_CATEGORIES } from "@/components/CoachAwardDialogs";
import LeadEvaluationForm from "@/components/LeadEvaluationForm";
import type { SkillCategoryName, EvalScores, Quarter } from "@/components/CoachAwardDialogs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { DateScrollPicker } from "react-date-wheel-picker";

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

function useTabCycleScroll(tabValues: string[], activeTab: string, setActiveTab: (tab: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const hasCycled = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let dragging = false;

    const handleMouseDown = (e: MouseEvent) => {
      dragging = true;
      dragStartX.current = e.clientX;
      hasCycled.current = false;
      element.style.cursor = 'grabbing';
    };

    const handleMouseUp = () => {
      dragging = false;
      element.style.cursor = '';
    };

    const handleMouseLeave = () => {
      dragging = false;
      element.style.cursor = '';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || hasCycled.current) return;
      const diff = e.clientX - dragStartX.current;
      const threshold = 60;
      if (Math.abs(diff) < threshold) return;
      hasCycled.current = true;
      const idx = tabValues.indexOf(activeTab);
      if (diff < 0 && idx < tabValues.length - 1) {
        setActiveTab(tabValues[idx + 1]);
      } else if (diff > 0 && idx > 0) {
        setActiveTab(tabValues[idx - 1]);
      }
      dragStartX.current = e.clientX;
      hasCycled.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const idx = tabValues.indexOf(activeTab);
      if (e.deltaY > 0 && idx < tabValues.length - 1) {
        setActiveTab(tabValues[idx + 1]);
      } else if (e.deltaY < 0 && idx > 0) {
        setActiveTab(tabValues[idx - 1]);
      }
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [tabValues, activeTab, setActiveTab]);

  return ref;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const adminTabValues = ['overview','users','programs','teams','events','awards','store','waivers','communications','migrations'];

  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'overview';
    }
    return 'overview';
  };
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const getInitialCrmSubTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('subtab') || null;
    }
    return null;
  };
  const [crmSubTab, setCrmSubTab] = useState<string | null>(getInitialCrmSubTab);
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const tabsRef = useTabCycleScroll(adminTabValues, activeTab, setActiveTab);

  // Fetch current user for role-based access control
  const { data: currentUser, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch all account profiles to check for admin access
  const { data: accountProfiles = [], isLoading: profilesLoading } = useQuery<any[]>({
    queryKey: ["/api/account/profiles"],
    enabled: !!currentUser,
  });

  // Check if user has any admin profile in their account
  const hasAdminProfile = accountProfiles.some((p: any) => p.role === "admin");

  // Redirect non-admin users (only if they don't have any admin profile in their account)
  useEffect(() => {
    if (!userLoading && !profilesLoading && currentUser && currentUser.role !== "admin" && !hasAdminProfile) {
      setLocation("/unified-account");
    }
  }, [currentUser, userLoading, profilesLoading, hasAdminProfile, setLocation]);

  // Fetch organization data
  const { data: organization, isLoading: orgLoading } = useQuery<any>({
    queryKey: ["/api/organization"],
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Fetch programs
  const { data: programs = [], isLoading: programsLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch enrollments (admin endpoint to get all enrollments)
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/enrollments"],
  });

  const { data: adminAlerts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/alerts"],
    refetchInterval: 60000,
  });

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('dismissedAdminAlerts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [completingAlerts, setCompletingAlerts] = useState<Set<string>>(new Set());
  const visibleAlerts = adminAlerts.filter((a: any) => !dismissedAlerts.has(a.type) && a.type !== 'unassigned_players');

  const handleDismissAlert = (alertType: string) => {
    setCompletingAlerts(prev => new Set([...prev, alertType]));
    setTimeout(() => {
      setDismissedAlerts(prev => {
        const next = new Set([...prev, alertType]);
        try { localStorage.setItem('dismissedAdminAlerts', JSON.stringify([...next])); } catch {}
        return next;
      });
      setCompletingAlerts(prev => {
        const next = new Set(prev);
        next.delete(alertType);
        return next;
      });
    }, 800);
  };

  // Fetch award definitions
  const { data: awardDefinitions = [], isLoading: awardDefinitionsLoading } = useQuery<any[]>({
    queryKey: ["/api/award-definitions"],
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading} = useQuery<any[]>({
    queryKey: ["/api/payments"],
    staleTime: 0, // Always refetch to ensure latest payment data
  });

  // Fetch divisions
  const { data: divisions = [], isLoading: divisionsLoading } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
  });


  // Fetch evaluations
  const { data: evaluations = [], isLoading: evaluationsLoading } = useQuery<any[]>({
    queryKey: ["/api/evaluations"],
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/notifications"],
  });

  // Fetch overview stats
  const { data: overviewStats } = useQuery<any>({
    queryKey: ["/api/admin/overview-stats"],
  });

  const isLoading = orgLoading || usersLoading || teamsLoading || eventsLoading || programsLoading || enrollmentsLoading || awardDefinitionsLoading || paymentsLoading || divisionsLoading || evaluationsLoading || notificationsLoading;

  // Calculate stats
  // Accounts = unique emails (distinct registered people), Users = all profiles including linked ones
  const uniqueEmails = new Set(users.map((u: any) => u.email?.toLowerCase()).filter(Boolean));
  const stats = {
    totalAccounts: uniqueEmails.size,
    totalUsers: users.length,
    totalCoaches: users.filter((u: any) => u.role === "coach").length,
    totalPlayers: users.filter((u: any) => u.role === "player").length,
    totalParents: users.filter((u: any) => u.role === "parent").length,
    totalTeams: teams.length,
    totalEvents: events.length,
    upcomingEvents: events.filter((e: any) => new Date(e.startTime) > new Date()).length,
    totalPayments: payments.length,
    pendingPayments: payments.filter((p: any) => p.status === "pending").length,
    totalRevenue: payments.filter((p: any) => p.status === "completed").reduce((sum: number, p: any) => sum + p.amount, 0),
  };

  if (isLoading) {
    return (
      <>
        <div className="ios-full-bleed" style={{ backgroundColor: '#ffffff' }} />
        <div className="ios-fixed-page relative z-10 w-full flex items-center justify-center" style={{ backgroundColor: '#ffffff' }} data-testid="loading-admin-dashboard">
          <BanterLoader />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ios-full-bleed" style={{ backgroundColor: '#f9fafb' }} />
      <div className="scrollable-page relative z-10" style={{ backgroundColor: '#f9fafb' }} data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-white border-b safe-top sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
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
                <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1" data-testid="text-org-name">{organization?.name || "My Sports Organization"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <NotificationBell />
              <Button 
                onClick={() => setActiveTab("settings")} 
                variant="ghost"
                size="icon"
                data-testid="button-settings"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8">
        {/* Announcement Banner */}
        <AnnouncementBanner />
        
        {visibleAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {visibleAlerts.map((alert: any, index: number) => {
              const alertConfig: Record<string, { icon: any; bg: string; border: string; text: string; tab: string }> = {
                low_credits: { icon: CreditCard, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', tab: 'programs' },
                payment_overdue: { icon: DollarSign, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', tab: 'users' },
                pending_requests: { icon: Clock, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', tab: 'events' },
              };
              const config = alertConfig[alert.type] || { icon: AlertCircle, bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', tab: 'overview' };
              const Icon = config.icon;
              const isCompleting = completingAlerts.has(alert.type);
              return (
                <div
                  key={alert.type}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left overflow-hidden transition-all duration-500 ${
                    isCompleting
                      ? 'bg-green-50 border-green-300 max-h-16 opacity-100 scale-100'
                      : `${config.bg} ${config.border} max-h-24 opacity-100 scale-100`
                  }`}
                  style={isCompleting ? { animation: 'alertSlideOut 0.8s ease-in-out forwards' } : undefined}
                >
                  {isCompleting ? (
                    <div className="flex items-center gap-3 w-full justify-center py-1">
                      <div className="p-1 rounded-full bg-green-100">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-sm font-semibold text-green-700">Completed</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.type);
                        }}
                        className={`p-1.5 rounded-full border-2 border-current ${config.text} hover:bg-green-100 hover:border-green-600 hover:text-green-600 transition-colors shrink-0`}
                        title="Mark as reviewed"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setActiveTab(config.tab)}
                        className="flex-1 flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${config.text}`}>{alert.message}</span>
                          {alert.type === 'low_credits' && alert.details?.length > 0 && (
                            <p className="text-xs text-orange-600 mt-0.5 truncate">
                              {alert.details.slice(0, 3).map((d: any) => `${d.profileName} (${d.remainingCredits} left)`).join(', ')}
                              {alert.details.length > 3 && ` +${alert.details.length - 3} more`}
                            </p>
                          )}
                          {alert.type === 'pending_requests' && alert.details?.length > 0 && (
                            <p className="text-xs text-blue-600 mt-0.5 truncate">
                              {alert.details.slice(0, 3).map((d: any) => d.requestedFor).join(', ')}
                              {alert.details.length > 3 && ` +${alert.details.length - 3} more`}
                            </p>
                          )}
                          {alert.type === 'payment_overdue' && alert.details?.length > 0 && (
                            <p className="text-xs text-red-600 mt-0.5 truncate">
                              {alert.details.slice(0, 3).map((d: any) => d.name).join(', ')}
                              {alert.details.length > 3 && ` +${alert.details.length - 3} more`}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={`${config.text} border-current shrink-0`}>
                          {alert.count}
                        </Badge>
                        <ChevronRight className={`w-4 h-4 ${config.text} shrink-0`} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div ref={tabsRef} className="overflow-x-auto hide-scrollbar mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 cursor-grab">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto bg-transparent border-b border-gray-200 rounded-none p-0 h-auto gap-0">
              <TabsTrigger value="overview" data-testid="tab-overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="programs" data-testid="tab-programs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Layers className="w-4 h-4 mr-2" />
                Programs
              </TabsTrigger>
              <TabsTrigger value="teams" data-testid="tab-teams" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Users className="w-4 h-4 mr-2" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="awards" data-testid="tab-awards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Trophy className="w-4 h-4 mr-2" />
                Awards
              </TabsTrigger>
              <TabsTrigger value="store" data-testid="tab-store" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Store
              </TabsTrigger>
              <TabsTrigger value="waivers" data-testid="tab-waivers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <FileText className="w-4 h-4 mr-2" />
                Waivers
              </TabsTrigger>
              <TabsTrigger value="communications" data-testid="tab-communications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Bell className="w-4 h-4 mr-2" />
                Communications
              </TabsTrigger>
              <TabsTrigger value="migrations" data-testid="tab-migrations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Migrations
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <CrmMessageBanner onNavigateToCrm={() => { setCrmSubTab("messages"); setActiveTab("communications"); }} />
            <StorePurchaseBanner onNavigateToStore={() => setActiveTab("store")} />
            <EnrollmentAssignmentBanner onNavigateToUsers={() => setActiveTab("users")} />

            {/* Hero KPI Bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <Card data-testid="stat-revenue-year" className="border-l-4 border-l-red-500">
                <CardContent className="py-4 px-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue (YTD)</p>
                  <p className="text-xl font-bold text-gray-900 mt-1" data-testid="stat-revenue-year-value">
                    ${((overviewStats?.revenueThisYear ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="stat-active-players" className="border-l-4 border-l-blue-500">
                <CardContent className="py-4 px-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Players</p>
                  <p className="text-xl font-bold text-gray-900 mt-1" data-testid="stat-active-players-value">
                    {overviewStats?.enrolledPlayers ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="stat-upcoming-events" className="border-l-4 border-l-green-500">
                <CardContent className="py-4 px-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upcoming Events</p>
                  <p className="text-xl font-bold text-gray-900 mt-1" data-testid="stat-upcoming-events-value">
                    {stats.upcomingEvents}
                  </p>
                </CardContent>
              </Card>
              <Card data-testid="stat-total-accounts" className="border-l-4 border-l-purple-500">
                <CardContent className="py-4 px-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Accounts</p>
                  <p className="text-xl font-bold text-gray-900 mt-1" data-testid="stat-total-accounts-value">
                    {stats.totalAccounts}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend Chart — Focal Point */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900">Revenue Trend</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>This Month: <span className="font-semibold text-gray-900">${((overviewStats?.revenueThisMonth ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></span>
                    <span>All-Time: <span className="font-semibold text-gray-900">${((overviewStats?.revenueTotal ?? stats.totalRevenue) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></span>
                  </div>
                </div>
                <RevenueTrendChart data={overviewStats?.revenueByMonth || []} />
              </CardContent>
            </Card>

            {/* User Breakdown Donut + Events/Awards Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">User Breakdown</p>
                  <UserBreakdownDonut
                    players={overviewStats?.totalPlayers ?? 0}
                    coaches={overviewStats?.totalCoaches ?? stats.totalCoaches}
                    admins={overviewStats?.totalAdmins ?? users.filter((u: any) => u.role === "admin").length}
                    parents={overviewStats?.totalParents ?? users.filter((u: any) => u.role === "parent").length}
                  />
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card>
                  <CardContent className="py-4 px-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Events</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Total Events</p>
                        <p className="text-lg font-bold text-gray-900">{stats.totalEvents}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Attendance Rate</p>
                        <p className="text-lg font-bold text-gray-900">
                          {overviewStats && overviewStats.attendanceInvited > 0
                            ? `${Math.round((overviewStats.attendanceActual / overviewStats.attendanceInvited) * 100)}%`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">RSVPs</p>
                        <p className="text-lg font-bold text-gray-900">{overviewStats?.totalRsvps ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Check-Ins</p>
                        <p className="text-lg font-bold text-gray-900">{overviewStats?.totalCheckins ?? '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 px-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">Awards</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">This Month</p>
                        <p className="text-lg font-bold text-gray-900">{overviewStats?.awardsThisMonth ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">All-Time</p>
                        <p className="text-lg font-bold text-gray-900">{overviewStats?.awardsAllTime ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <RecentTransactionsCard payments={payments} users={users} programs={programs} />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab users={users} teams={teams} programs={programs} divisions={divisions} organization={organization} enrollments={enrollments} />
          </TabsContent>

          <TabsContent value="programs">
            <ProgramsTab programs={programs} teams={teams} organization={organization} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsByProgramTab programs={programs} teams={teams} organization={organization} users={users} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab events={events} teams={teams} programs={programs} organization={organization} currentUser={currentUser} users={users} />
          </TabsContent>

          <TabsContent value="awards">
            <AwardsTab awardDefinitions={awardDefinitions} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="store">
            <StoreTab organization={organization} />
          </TabsContent>

          <TabsContent value="waivers">
            <WaiversTab organization={organization} />
          </TabsContent>

          <TabsContent value="communications">
            <CommunicationsTab notifications={notifications} users={users} teams={teams} divisions={divisions} organization={organization} initialCrmSubTab={crmSubTab} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab organization={organization} />
          </TabsContent>

          <TabsContent value="migrations">
            <MigrationsTab organization={organization} users={users} />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
  );
}

// Stat Card Component
function RingChart({ value, total, size = 80, strokeWidth = 8, color = '#dc2626' }: { value: number; total: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? value / total : 0;
  const strokeDashoffset = circumference * (1 - percentage);
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
        className="transition-all duration-1000 ease-out" />
    </svg>
  );
}

function RingStatCard({ title, value, total, subtitle, testId, color = '#dc2626' }: any) {
  return (
    <Card data-testid={testId} className="overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <p className="text-sm font-medium text-gray-500 mb-3">{title}</p>
        <div className="flex items-center gap-4">
          <div className="relative">
            <RingChart value={value} total={total} size={72} strokeWidth={7} color={color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900">{value}</span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900" data-testid={`${testId}-value`}>
              {typeof total === 'number' && total !== value ? `${value} / ${total}` : value}
            </p>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserBreakdownDonut({ players, coaches, admins, parents }: { players: number; coaches: number; admins: number; parents: number }) {
  const segments = [
    { label: 'Players', value: players, color: '#3b82f6' },
    { label: 'Parents', value: parents, color: '#10b981' },
    { label: 'Coaches', value: coaches, color: '#f97316' },
    { label: 'Admins', value: admins, color: '#8b5cf6' },
  ].filter(s => s.value > 0);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No users yet</p>;
  }

  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const arcs = segments.map(s => {
    const pct = s.value / total;
    const offset = circumference * (1 - pct);
    const rotation = (accumulated / total) * 360 - 90;
    accumulated += s.value;
    return { ...s, pct, offset, rotation };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={size/2} cy={size/2} r={radius}
              fill="none" stroke={arc.color} strokeWidth={strokeWidth}
              strokeDasharray={circumference} strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              style={{ transform: `rotate(${arc.rotation}deg)`, transformOrigin: '50% 50%' }}
              className="transition-all duration-700 ease-out"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Users</span>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: arc.color }} />
            <span className="text-xs text-gray-600">{arc.label} <span className="font-semibold text-gray-900">{arc.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, testId }: any) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2" data-testid={`${testId}-value`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentTransactionsCard({ payments, users, programs }: any) {
  const [showAll, setShowAll] = useState(false);
  
  const sortedPayments = [...payments]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const recentPayments = sortedPayments.slice(0, 5);
  const olderPayments = sortedPayments.slice(5);
  
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant as any} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };
  
  const getUserName = (payment: any) => {
    if (payment.userName) return payment.userName;
    const user = users.find((u: any) => String(u.id) === String(payment.userId));
    if (user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User';
    }
    const byAccount = users.find((u: any) => u.accountHolderId === payment.userId);
    if (byAccount) {
      return `${byAccount.firstName || ''} ${byAccount.lastName || ''}`.trim() || byAccount.email || 'User';
    }
    return "Unknown User";
  };
  
  const getProgramName = (payment: any) => {
    // Try programId first
    if (payment.programId) {
      const program = programs.find((p: any) => String(p.id) === String(payment.programId));
      if (program) return program.name;
    }
    // Try packageId (some payments use this instead)
    if (payment.packageId) {
      const program = programs.find((p: any) => String(p.id) === String(payment.packageId));
      if (program) return program.name;
    }
    // Fall back to description if available
    if (payment.description) {
      return payment.description;
    }
    // Check payment type as last resort
    if (payment.paymentType) {
      return payment.paymentType;
    }
    return "Payment";
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };
  
  const getPaymentTypeBadge = (payment: any) => {
    // Check payment type (case-insensitive) and also check the associated program's type
    const paymentTypeLC = (payment.paymentType || '').toLowerCase();
    const isSubscription = paymentTypeLC === "subscription" || 
      payment.paymentType === "Subscription" ||
      (payment.billingModel && payment.billingModel === "Subscription");
    
    // Also check if the linked program is a subscription
    const program = payment.programId ? programs.find((p: any) => String(p.id) === String(payment.programId)) : null;
    const programIsSubscription = program?.type === "Subscription";
    
    const showAsSubscription = isSubscription || programIsSubscription;
    
    return (
      <Badge 
        variant="outline" 
        className={showAsSubscription ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}
        data-testid={`badge-type-${payment.id}`}
      >
        {showAsSubscription ? "Subscription" : "One-Time"}
      </Badge>
    );
  };
  
  const TransactionRow = ({ payment }: { payment: any }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0" data-testid={`transaction-${payment.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate" data-testid={`transaction-user-${payment.id}`}>
            {getUserName(payment)}
          </p>
          {getStatusBadge(payment.status)}
          {getPaymentTypeBadge(payment)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500" data-testid={`transaction-program-${payment.id}`}>
            {getProgramName(payment)}
          </p>
          <span className="text-xs text-gray-400">•</span>
          <p className="text-xs text-gray-500" data-testid={`transaction-date-${payment.id}`}>
            {formatDate(payment.createdAt)}
          </p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">
        <p className="text-sm font-semibold" data-testid={`transaction-amount-${payment.id}`}>
          ${(payment.amount / 100).toFixed(2)}
        </p>
      </div>
    </div>
  );
  
  if (payments.length === 0) {
    return (
      <Card data-testid="card-recent-transactions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>View all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-testid="card-recent-transactions">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" />
          Recent Transactions
        </CardTitle>
        <CardDescription>
          {sortedPayments.length} total transaction{sortedPayments.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {recentPayments.map((payment: any) => (
            <TransactionRow key={payment.id} payment={payment} />
          ))}
          
          {olderPayments.length > 0 && (
            <Collapsible open={showAll} onOpenChange={setShowAll}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full mt-2 flex items-center justify-center gap-2"
                  data-testid="button-show-all-transactions"
                >
                  <span className="text-sm">
                    {showAll ? 'Show Less' : `Show ${olderPayments.length} More`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0 mt-2">
                  {olderPayments.map((payment: any) => (
                    <TransactionRow key={payment.id} payment={payment} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Users Tab Component  
function UsersTab({ users, teams, programs, divisions, organization, enrollments }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUserExtras, setNewUserExtras] = useState<any>({ programId: '', teamId: '', startDate: '', endDate: '', enrollments: [] });
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchOpen, setParentSearchOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [detailTab, setDetailTab] = useState("team");
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [filterRoles, setFilterRoles] = useState<Set<string>>(new Set());
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const tableRef = useDragScroll();

  // Fetch user evaluations - only when viewing user in performance tab
  const { data: userEvaluations = [], isLoading: evaluationsLoading, error: evaluationsError } = useQuery<any[]>({
    queryKey: ['/api/evaluations', viewingUser?.id],
    queryFn: () => apiRequest(`/api/evaluations?playerId=${viewingUser!.id}`),
    enabled: !!viewingUser && detailTab === 'performance',
  });

  // Fetch user awards - only when viewing user in performance tab
  const { data: userAwards, isLoading: awardsLoading, error: awardsError } = useQuery<any>({
    queryKey: ['/api/users', viewingUser?.id, 'awards'],
    queryFn: () => apiRequest(`/api/users/${viewingUser!.id}/awards`),
    enabled: !!viewingUser && detailTab === 'performance',
  });

  // Fetch detailed billing info - only when viewing user in billing tab
  const { data: userBillingDetails, isLoading: billingLoading } = useQuery<any>({
    queryKey: ['/api/admin/users', viewingUser?.id, 'billing'],
    queryFn: () => apiRequest(`/api/admin/users/${viewingUser!.id}/billing`),
    enabled: !!viewingUser && detailTab === 'billing',
  });

  // Fetch program memberships for the user being edited
  const { data: editingUserProgramMemberships = [] } = useQuery<any[]>({
    queryKey: ["/api/users", editingUser?.id, "program-memberships"],
    enabled: !!editingUser?.id,
  });

  const createUserSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "coach", "player", "parent"]),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phoneNumber: z.string().optional(),
    accountHolderId: z.string().optional(),
    dateOfBirth: z.string().optional(),
    position: z.string().optional(),
    heightIn: z.number().optional().nullable(),
    division: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      role: "player" as const,
      firstName: "",
      lastName: "",
      phoneNumber: "",
      isActive: true,
      dateOfBirth: "",
      position: "",
      heightIn: null as number | null,
      division: "",
      notes: "",
    },
  });

  const [showCreateDobPicker, setShowCreateDobPicker] = useState(false);

  const filteredParentAccounts = useMemo(() => {
    return (users || [])
      .filter((u: any) => u.role === 'parent' && !u.accountHolderId)
      .filter((u: any) => {
        if (!parentSearchQuery) return true;
        const q = parentSearchQuery.toLowerCase();
        return (
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        );
      });
  }, [users, parentSearchQuery]);

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      const payload: any = { 
        ...data, 
        organizationId: organization.id,
        isActive: data.isActive ?? true
      };
      if (!payload.accountHolderId) delete payload.accountHolderId;
      const res = await apiRequest("POST", "/api/users", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setSelectedParentId('');
      setParentSearchQuery('');
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async ({ id, profileOnly }: { id: string; profileOnly?: boolean }) => {
      const url = profileOnly ? `/api/users/${id}?profileOnly=true` : `/api/users/${id}`;
      return await apiRequest("DELETE", url, {});
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: variables.profileOnly ? "Profile deleted successfully" : "Account and all profiles deleted successfully" });
      setViewingUser(null);
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const bulkDeleteUsers = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/users/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedUserIds(new Set());
      toast({ title: `${selectedUserIds.size} user(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some users", variant: "destructive" });
    },
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleAllUsers = (userIds: string[]) => {
    if (selectedUserIds.size === userIds.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(userIds));
    }
  };

  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      setUpdatingUserId(id);
      return await apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // Invalidate user-specific queries for real-time updates in player dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.id, "team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.id, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.id, "program-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", variables.id] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${variables.id}`] });
      // Invalidate coach teams if teamIds were updated (for coach dashboard)
      if (variables.teamIds) {
        queryClient.invalidateQueries({ queryKey: [`/api/coaches/${variables.id}/teams`] });
        queryClient.invalidateQueries({ queryKey: [`/api/coaches/${variables.id}/players`] });
      }
      // Invalidate events queries if team/division changed
      if (variables.teamId || variables.divisionId || variables.teamIds) {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      }
      setUpdatingUserId(null);
      // Only show toast and close dialog if updating from edit dialog (more than just isActive)
      if (Object.keys(variables).length > 2 || !('isActive' in variables)) {
        toast({ title: "User updated successfully" });
        setEditingUser(null);
      }
    },
    onError: (_error, _variables) => {
      setUpdatingUserId(null);
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role, firstName, lastName }: { userId: string; role: string; firstName?: string; lastName?: string }) => {
      return await apiRequest("POST", `/api/users/${userId}/add-role`, { role, firstName, lastName });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: data.message || "Role added successfully" });
      setShowAddRoleDialog(false);
      setSelectedRoleToAdd("");
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to add role", variant: "destructive" });
    },
  });

  const [removeRoleConfirm, setRemoveRoleConfirm] = useState<{ userId: string; role: string } | null>(null);

  const removeRole = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return await apiRequest("DELETE", `/api/users/${userId}/remove-role`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: data.message || "Role removed successfully" });
      setRemoveRoleConfirm(null);
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to remove role", variant: "destructive" });
    },
  });

  const downloadUserTemplate = () => {
    const csvContent = "First name,Last name,Email,Phone,Role,Status,Team,Program,Start Date,End Date\nJohn,Doe,player@example.com,555-0100,player,active,Thunder U12,Skills Academy,2025-01-15,2025-06-30\nJane,Smith,coach@example.com,555-0101,coach,active,,,,\nBob,Johnson,parent@example.com,555-0102,parent,active,,Youth Club,2025-03-01,2025-12-31";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} users from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const userData: any = {};
        
        headers.forEach((header, index) => {
          userData[header] = values[index] || '';
        });
        
        const firstName = userData['first name'] || userData['firstname'] || '';
        const lastName = userData['last name'] || userData['lastname'] || '';
        const email = userData['email'] || '';
        const phone = userData['phone'] || userData['phonenumber'] || '';
        const role = userData['role'] || 'player';
        const status = userData['status'] || 'active';
        const teamName = userData['team'] || '';
        const programName = userData['program'] || '';
        const startDate = userData['start date'] || userData['startdate'] || userData['enrolled'] || '';
        const endDate = userData['end date'] || userData['enddate'] || '';
        
        let teamId = undefined;
        if (teamName) {
          const team = teams.find((t: any) => t.name.toLowerCase() === teamName.toLowerCase());
          if (team) teamId = team.id;
        }
        
        let programId = undefined;
        if (programName) {
          const program = programs?.find((p: any) => p.name.toLowerCase() === programName.toLowerCase() && p.productCategory === 'service');
          if (program) programId = program.id;
        }
        
        try {
          const res = await apiRequest("POST", "/api/users", {
            organizationId: organization.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: role,
            phoneNumber: phone || undefined,
            teamId: teamId,
            isActive: status.toLowerCase() === 'active',
            verified: false,
          });
          
          if (programId) {
            const newUser = await res.json();
            if (newUser?.id) {
              await apiRequest('PATCH', `/api/users/${newUser.id}`, {
                enrollmentsToAdd: [programId],
                ...(teamId ? { teamIds: [teamId] } : {}),
                ...(startDate || endDate ? {
                  newEnrollmentDates: {
                    [programId]: {
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                    }
                  }
                } : {}),
              });
            }
          }
          
          successCount++;
        } catch (error) {
          console.error(`Failed to create user ${email}:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} users. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getDisplayEmail = (user: any) => {
    if (user.email) return user.email;
    if (user.role === 'player') {
      const holderId = user.accountHolderId || user.parentId;
      if (holderId) {
        const holder = users.find((u: any) => u.id === holderId);
        if (holder?.email) return holder.email;
      }
    }
    return '';
  };

  const getDisplayPhone = (user: any) => {
    if (user.role === 'player') {
      const holderId = user.accountHolderId || user.parentId;
      if (holderId) {
        const holder = users.find((u: any) => u.id === holderId);
        if (holder?.phoneNumber || holder?.phone) return holder.phoneNumber || holder.phone;
      }
    }
    return user.phoneNumber || user.phone || '';
  };

  const sortedUsers = sortField ? [...users].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'email') {
      aValue = getDisplayEmail(a);
      bValue = getDisplayEmail(b);
    }

    if (sortField === 'phoneNumber') {
      aValue = getDisplayPhone(a);
      bValue = getDisplayPhone(b);
    }

    if (sortField === 'team') {
      const aTeam = teams.find((t: any) => t.id === a.teamId);
      const bTeam = teams.find((t: any) => t.id === b.teamId);
      aValue = aTeam?.name || '';
      bValue = bTeam?.name || '';
    }

    if (sortField === 'division') {
      const aDivision = divisions.find((d: any) => d.id === a.divisionId);
      const bDivision = divisions.find((d: any) => d.id === b.divisionId);
      aValue = aDivision?.name || '';
      bValue = bDivision?.name || '';
    }

    if (sortField === 'dob' || sortField === 'dateOfBirth') {
      aValue = a.dob || a.dateOfBirth;
      bValue = b.dob || b.dateOfBirth;
    }

    if (sortField === 'awards') {
      aValue = a.awards?.length || 0;
      bValue = b.awards?.length || 0;
    }

    if (sortField === 'isActive') {
      aValue = a.isActive !== false ? 1 : 0;
      bValue = b.isActive !== false ? 1 : 0;
    }

    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';

    const aStr = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
    const bStr = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : users;

  // Helper: derive enrollment status label for a user
  const deriveUserStatus = (user: any): string => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const linkedPlayersForUser = users.filter((u: any) =>
      u.accountHolderId === user.id || u.parentId === user.id
    );
    const allRelevantEnrollments: any[] = [];
    const userEnrollments = enrollments.filter((e: any) =>
      e.accountHolderId === user.id || e.profileId === user.id
    );
    allRelevantEnrollments.push(...userEnrollments);
    linkedPlayersForUser.forEach((player: any) => {
      const playerEnrollments = enrollments.filter((e: any) => e.profileId === player.id);
      allRelevantEnrollments.push(...playerEnrollments);
    });
    const uniqueEnrollments = allRelevantEnrollments.filter((e, i, arr) =>
      arr.findIndex(x => x.id === e.id) === i
    );
    const isOnTeam = (u: any) =>
      u.teamId || (Array.isArray(u.teamIds) && u.teamIds.length > 0) || (Array.isArray(u.activeTeams) && u.activeTeams.length > 0);
    const hasActiveEnrollmentWithoutTeam = teams.length > 0 ? (() => {
      if (user.role === "player") {
        const hasActiveEnrollment = uniqueEnrollments.some((e: any) =>
          e.profileId === user.id && e.status === 'active'
        );
        if (hasActiveEnrollment && !isOnTeam(user)) return true;
      }
      return linkedPlayersForUser.some((player: any) => {
        const playerHasActive = uniqueEnrollments.some((e: any) =>
          e.profileId === player.id && e.status === 'active'
        );
        return playerHasActive && !isOnTeam(player);
      });
    })() : false;
    const hasPaymentFailed = uniqueEnrollments.some((e: any) =>
      e.status === 'payment_failed' || e.paymentStatus === 'failed'
    );
    const hasLowBalance = uniqueEnrollments.some((e: any) => {
      if (e.status !== 'active' || !e.endDate) return false;
      const endDate = new Date(e.endDate);
      return endDate <= threeDaysFromNow && endDate > now;
    });
    const hasActiveSubscriber = uniqueEnrollments.some((e: any) =>
      e.status === 'active' && e.stripeSubscriptionId
    );
    const hasActiveOneTime = uniqueEnrollments.some((e: any) =>
      e.status === 'active' && !e.stripeSubscriptionId
    );
    const hasExpired = uniqueEnrollments.some((e: any) =>
      e.status === 'expired' || e.status === 'cancelled'
    );
    if (hasActiveEnrollmentWithoutTeam) return "Pending Assignment";
    if (hasPaymentFailed) return "Payment Failed";
    if (hasLowBalance) return "Low Balance";
    const hasActiveEnrollmentOnTeam = (() => {
      if (user.role === "player") {
        const hasActive = uniqueEnrollments.some((e: any) => e.profileId === user.id && e.status === 'active');
        if (hasActive && isOnTeam(user)) return true;
      }
      return linkedPlayersForUser.some((player: any) => {
        const playerHasActive = uniqueEnrollments.some((e: any) => e.profileId === player.id && e.status === 'active');
        return playerHasActive && isOnTeam(player);
      });
    })();
    if (hasActiveEnrollmentOnTeam) return "Active Program";
    if (hasActiveSubscriber) return "Active Subscriber";
    if (hasActiveOneTime) return "Active Program";
    if (hasExpired) return "Expired";
    return "No Enrollment";
  };

  // Filter users based on search term, role, and status filters
  const filteredUsers = sortedUsers.filter((user: any) => {
    if (userSearchTerm.trim()) {
      const searchLower = userSearchTerm.toLowerCase();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchLower) ||
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.role && user.role.toLowerCase().includes(searchLower)) ||
        (user.phoneNumber && user.phoneNumber.includes(searchLower));
      if (!matchesSearch) return false;
    }
    if (filterRoles.size > 0 && !filterRoles.has(user.role)) return false;
    if (filterStatuses.size > 0) {
      const status = deriveUserStatus(user);
      if (!filterStatuses.has(status)) return false;
    }
    return true;
  });


  const downloadUsersData = () => {
    const csvHeaders = "First name,Last name,Email,Phone,Role,Status,Team";
    const csvRows = users.map((user: any) => {
      const team = teams.find((t: any) => t.id === user.teamId);
      return [
        user.firstName || "",
        user.lastName || "",
        user.email || "",
        user.phoneNumber || "",
        user.role || "",
        user.isActive !== false ? "active" : "inactive",
        team?.name || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between mb-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage players, coaches, parents, and admins</CardDescription>
          </div>
          <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-users">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Users</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: First name, Last name, Email, Phone, Role, Status, Team</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadUserTemplate} data-testid="button-download-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadUsersData} data-testid="button-download-users">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setNewUserExtras({ programId: '', teamId: '', startDate: '', endDate: '', enrollments: [] });
              setSelectedParentId('');
              setParentSearchQuery('');
              setParentSearchOpen(false);
              setShowCreateDobPicker(false);
              form.setValue('accountHolderId', undefined);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="icon" title="Add User" data-testid="button-add-new-user">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  const enrollments = newUserExtras.enrollments || [];
                  createUser.mutate(data, {
                    onSuccess: async (newUser: any) => {
                      if (enrollments.length > 0 && newUser?.id) {
                        try {
                          const enrollmentsToAdd = enrollments.map((e: any) => e.programId);
                          const teamIds = enrollments.filter((e: any) => e.teamIds?.length).flatMap((e: any) => e.teamIds);
                          const newEnrollmentDates: any = {};
                          enrollments.forEach((e: any) => {
                            if (e.startDate || e.endDate) {
                              newEnrollmentDates[e.programId] = {
                                startDate: e.startDate || undefined,
                                endDate: e.endDate || undefined,
                              };
                            }
                          });
                          await apiRequest('PATCH', `/api/users/${newUser.id}`, {
                            enrollmentsToAdd,
                            ...(teamIds.length > 0 ? { teamIds } : {}),
                            ...(Object.keys(newEnrollmentDates).length > 0 ? { newEnrollmentDates } : {}),
                          });
                          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                        } catch (e) {
                          console.error('Failed to set enrollment details:', e);
                          toast({ title: "User created but enrollment setup failed", variant: "destructive" });
                        }
                      }
                      setNewUserExtras({ programId: '', teamId: '', startDate: '', endDate: '', enrollments: [] });
                    }
                  });
                })} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-user-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-user-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-user-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-user-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="player">Player</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>Link to Parent Account <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Popover open={parentSearchOpen} onOpenChange={setParentSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          {selectedParentId
                            ? (() => {
                                const p = users?.find((u: any) => u.id === selectedParentId);
                                return p ? `${p.firstName} ${p.lastName} (${p.email})` : 'Select a parent...';
                              })()
                            : 'Search for a parent account...'}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-2" align="start">
                        <div className="mb-2">
                          <Input
                            placeholder="Search by name or email..."
                            value={parentSearchQuery}
                            onChange={(e) => setParentSearchQuery(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {selectedParentId && (
                            <button
                              type="button"
                              className="w-full text-left px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-100"
                              onClick={() => {
                                setSelectedParentId('');
                                form.setValue('accountHolderId', undefined);
                                setParentSearchOpen(false);
                              }}
                            >
                              Clear selection
                            </button>
                          )}
                          {filteredParentAccounts.slice(0, 20).map((u: any) => (
                              <button
                                key={u.id}
                                type="button"
                                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 flex items-center justify-between ${selectedParentId === u.id ? 'bg-blue-50 text-blue-700' : ''}`}
                                onClick={() => {
                                  setSelectedParentId(u.id);
                                  form.setValue('accountHolderId', u.id);
                                  setParentSearchOpen(false);
                                  setParentSearchQuery('');
                                }}
                              >
                                <span>{u.firstName} {u.lastName} <span className="text-gray-400">{u.email}</span></span>
                                {selectedParentId === u.id && <Check className="h-4 w-4 text-blue-600" />}
                              </button>
                            ))}
                          {filteredParentAccounts.length === 0 && (
                            <p className="text-xs text-gray-400 px-2 py-2">No parent accounts found</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Club</Label>
                    <Input value={organization?.name || ""} disabled />
                  </div>

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => setShowCreateDobPicker(true)}
                            className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                          >
                            <span className={field.value ? "text-gray-900" : "text-gray-400"}>
                              {field.value ? new Date(field.value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date"}
                            </span>
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </button>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Dialog open={showCreateDobPicker} onOpenChange={setShowCreateDobPicker}>
                    <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                      <DialogHeader>
                        <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
                      </DialogHeader>
                      <div className="py-4 flex justify-center date-wheel-picker-dark">
                        <DateScrollPicker
                          defaultYear={form.getValues('dateOfBirth') ? new Date(form.getValues('dateOfBirth')).getFullYear() : 2010}
                          defaultMonth={(form.getValues('dateOfBirth') ? new Date(form.getValues('dateOfBirth')).getMonth() : 0) + 1}
                          defaultDay={form.getValues('dateOfBirth') ? new Date(form.getValues('dateOfBirth')).getDate() : 1}
                          startYear={1950}
                          endYear={new Date().getFullYear()}
                          dateTimeFormatOptions={{ month: 'short' }}
                          highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                          onDateChange={(date: Date) => {
                            form.setValue('dateOfBirth', date.toISOString().split('T')[0]);
                          }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
                          onClick={() => setShowCreateDobPicker(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => setShowCreateDobPicker(false)}
                        >
                          Confirm
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {form.watch('role') !== 'coach' && (
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <Select
                            value={field.value || "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="PG">PG - Point Guard</SelectItem>
                              <SelectItem value="SG">SG - Shooting Guard</SelectItem>
                              <SelectItem value="SF">SF - Small Forward</SelectItem>
                              <SelectItem value="PF">PF - Power Forward</SelectItem>
                              <SelectItem value="C">C - Center</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch('role') !== 'coach' && (
                    <FormField
                      control={form.control}
                      name="heightIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (inches)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="e.g., 72 for 6'0&quot;"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch('role') !== 'coach' && (
                    <FormField
                      control={form.control}
                      name="division"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., U10, U12, Varsity"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Internal notes (not visible to user)..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="create-active"
                      checked={form.watch('isActive') !== false}
                      onCheckedChange={(checked) => form.setValue('isActive', checked)}
                    />
                    <Label htmlFor="create-active">Active</Label>
                  </div>

                  <div className="space-y-4">
                    <Label>Program & Team Assignments</Label>
                    
                    {(newUserExtras.enrollments || []).length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-xs font-semibold text-blue-700 mb-2">Program Enrollments ({(newUserExtras.enrollments || []).length}):</p>
                        <div className="space-y-1">
                          {(newUserExtras.enrollments || []).map((enrollment: any) => {
                            const program = programs?.find((p: any) => p.id === enrollment.programId);
                            const programTeams = teams?.filter((t: any) => t.programId === enrollment.programId) || [];
                            return (
                              <div key={enrollment.programId} className="bg-white border border-blue-100 rounded px-3 py-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">{program?.name || enrollment.programId}</span>
                                  <button
                                    type="button"
                                    className="text-red-500 hover:text-red-700 text-sm font-medium px-1"
                                    onClick={() => {
                                      setNewUserExtras({
                                        ...newUserExtras,
                                        enrollments: (newUserExtras.enrollments || []).filter((e: any) => e.programId !== enrollment.programId)
                                      });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-blue-50">
                                  <div>
                                    <label className="text-[10px] text-gray-500 uppercase">Start Date</label>
                                    <input
                                      type="date"
                                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-full"
                                      value={enrollment.startDate || ''}
                                      onChange={(e) => {
                                        const updated = (newUserExtras.enrollments || []).map((en: any) =>
                                          en.programId === enrollment.programId ? { ...en, startDate: e.target.value } : en
                                        );
                                        setNewUserExtras({ ...newUserExtras, enrollments: updated });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 uppercase">End Date</label>
                                    <input
                                      type="date"
                                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-full"
                                      value={enrollment.endDate || ''}
                                      onChange={(e) => {
                                        const updated = (newUserExtras.enrollments || []).map((en: any) =>
                                          en.programId === enrollment.programId ? { ...en, endDate: e.target.value } : en
                                        );
                                        setNewUserExtras({ ...newUserExtras, enrollments: updated });
                                      }}
                                    />
                                  </div>
                                </div>
                                {programTeams.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-blue-50">
                                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">Team Assignment</label>
                                    <div className="space-y-1">
                                      {programTeams.map((team: any) => {
                                        const isChecked = (enrollment.teamIds || []).includes(team.id);
                                        return (
                                          <div key={team.id} className="flex items-center space-x-2 pl-1">
                                            <Checkbox
                                              id={`new-team-${enrollment.programId}-${team.id}`}
                                              checked={isChecked}
                                              onCheckedChange={(checked) => {
                                                const newTeamIds = checked
                                                  ? [...(enrollment.teamIds || []), team.id]
                                                  : (enrollment.teamIds || []).filter((id: number) => id !== team.id);
                                                const updated = (newUserExtras.enrollments || []).map((en: any) =>
                                                  en.programId === enrollment.programId ? { ...en, teamIds: newTeamIds } : en
                                                );
                                                setNewUserExtras({ ...newUserExtras, enrollments: updated });
                                              }}
                                            />
                                            <label htmlFor={`new-team-${enrollment.programId}-${team.id}`} className="text-sm leading-none cursor-pointer">
                                              {team.name}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Enroll in Program:</p>
                      <div className="border rounded-md max-h-32 overflow-y-auto">
                        {programs?.filter((p: any) =>
                          p.productCategory === 'service' &&
                          !(newUserExtras.enrollments || []).some((e: any) => e.programId === p.id)
                        ).map((program: any) => (
                          <div key={program.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                            <span className="text-sm">{program.name}</span>
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              onClick={() => {
                                setNewUserExtras({
                                  ...newUserExtras,
                                  enrollments: [...(newUserExtras.enrollments || []), {
                                    programId: program.id,
                                    teamIds: [],
                                    startDate: new Date().toISOString().split('T')[0],
                                    endDate: '',
                                  }]
                                });
                              }}
                            >
                              + Enroll
                            </button>
                          </div>
                        ))}
                        {programs?.filter((p: any) =>
                          p.productCategory === 'service' &&
                          !(newUserExtras.enrollments || []).some((e: any) => e.programId === p.id)
                        ).length === 0 && (
                          <p className="text-xs text-gray-500 px-3 py-2">
                            {(newUserExtras.enrollments || []).length > 0 ? 'Already enrolled in all available programs' : 'No programs available'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={createUser.isPending} data-testid="button-submit-user">
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingUser} onOpenChange={(open) => {
            if (!open) {
              setEditingUser(null);
              setSelectedDivision("");
            }
          }}>
            <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-firstname" data-testid="label-edit-firstname">First Name</Label>
                      <Input 
                        id="edit-firstname"
                        value={editingUser.firstName || ""}
                        onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                        data-testid="input-edit-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lastname" data-testid="label-edit-lastname">Last Name</Label>
                      <Input 
                        id="edit-lastname"
                        value={editingUser.lastName || ""}
                        onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                        data-testid="input-edit-lastname"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" data-testid="label-edit-email">Email</Label>
                    <Input 
                      id="edit-email"
                      type="email"
                      value={editingUser.email || ""}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      data-testid="input-edit-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" data-testid="label-edit-phone">Phone</Label>
                    <Input 
                      id="edit-phone"
                      value={editingUser.phoneNumber || editingUser.phone || ""}
                      onChange={(e) => setEditingUser({...editingUser, phoneNumber: e.target.value})}
                      data-testid="input-edit-phone"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label data-testid="label-edit-role">Role</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={editingUser.role || "player"}
                        onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                      >
                        <SelectTrigger data-testid="select-edit-role" className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="coach">Coach</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="player">Player</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-500">Changing the role updates this profile's current role.</p>

                    {(() => {
                      const accountHolderId = editingUser.accountHolderId || editingUser.id;
                      const otherProfiles = (users || []).filter((u: any) =>
                        (u.id === accountHolderId || u.accountHolderId === accountHolderId) && u.id !== editingUser.id
                      );
                      const allProfileRoles = [editingUser, ...otherProfiles].map((u: any) => u.role);
                      const availableRoles = ['player', 'parent', 'coach', 'admin'].filter(r => !allProfileRoles.includes(r));

                      return (
                        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                          <p className="text-xs font-semibold text-gray-600">Account Profiles</p>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 bg-white border rounded px-2 py-1.5">
                              <Badge className={`text-[10px] px-1.5 ${
                                editingUser.role === 'admin' ? 'bg-red-100 text-red-700 border-red-200' :
                                editingUser.role === 'coach' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                editingUser.role === 'parent' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                'bg-green-100 text-green-700 border-green-200'
                              }`}>
                                {editingUser.role}
                              </Badge>
                              <span className="text-sm">{editingUser.firstName} {editingUser.lastName}</span>
                              <span className="text-[10px] text-gray-400 ml-auto">current</span>
                            </div>
                            {otherProfiles.map((profile: any) => (
                              <div key={profile.id} className="flex items-center gap-2 bg-white border rounded px-2 py-1.5">
                                <Badge variant="outline" className={`text-[10px] px-1.5 ${
                                  profile.role === 'admin' ? 'bg-red-50 text-red-600 border-red-200' :
                                  profile.role === 'coach' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  profile.role === 'parent' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                  'bg-green-50 text-green-600 border-green-200'
                                }`}>
                                  {profile.role}
                                </Badge>
                                <span className="text-sm text-gray-600">{profile.firstName} {profile.lastName}</span>
                                <span className={`text-[10px] ml-auto ${profile.isActive !== false ? 'text-green-500' : 'text-gray-400'}`}>
                                  {profile.isActive !== false ? 'active' : 'inactive'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {availableRoles.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-[10px] text-gray-500 mb-1.5">Add a new role profile (creates a separate user record with same email):</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {availableRoles.map(role => (
                                  <Button
                                    key={role}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7 capitalize"
                                    disabled={addRole.isPending}
                                    onClick={() => {
                                      if (confirm(`Create a new ${role} profile for ${editingUser.firstName} ${editingUser.lastName}?`)) {
                                        addRole.mutate({
                                          userId: accountHolderId,
                                          role,
                                          firstName: editingUser.firstName,
                                          lastName: editingUser.lastName,
                                        });
                                      }
                                    }}
                                    data-testid={`button-add-role-${role}`}
                                  >
                                    <UserPlus className="w-3 h-3 mr-1" />
                                    + {role}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-club" data-testid="label-edit-club">Club</Label>
                    <Input 
                      id="edit-club"
                      value={organization?.name || ""}
                      disabled
                      data-testid="input-edit-club"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label data-testid="label-edit-assignments">Program & Team Assignments</Label>
                    {(() => {
                      // Use teamIds from the user data (now populated from active team memberships)
                      const teamIds = Array.isArray(editingUser.teamIds) ? editingUser.teamIds : 
                                     editingUser.teamId ? [editingUser.teamId] : [];
                      
                      // Use activeTeams from API for display (includes team/program names)
                      const activeTeams = editingUser.activeTeams || [];
                      
                      // Group teams by program
                      const teamsByProgram = programs?.reduce((acc: any, program: any) => {
                        acc[program.id] = {
                          program,
                          teams: teams?.filter((t: any) => t.programId === program.id) || []
                        };
                        return acc;
                      }, {}) || {};
                      
                      // Teams without a program
                      const teamsWithoutProgram = teams?.filter((t: any) => !t.programId) || [];
                      
                      // Program enrollments (from productEnrollments table)
                      const originalEnrollments = editingUserProgramMemberships || [];
                      // Use pendingEnrollments for display if there are local changes
                      const programEnrollments = editingUser.pendingEnrollments || originalEnrollments;
                      
                      return (
                        <div className="space-y-3">
                          {/* Program Enrollments - show what programs the user is enrolled in */}
                          {programEnrollments.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3" data-testid="program-enrollments">
                              <p className="text-xs font-semibold text-blue-700 mb-2">Program Enrollments ({programEnrollments.length}):</p>
                              <div className="space-y-1">
                                {programEnrollments.map((enrollment: any) => (
                                  <div key={enrollment.enrollmentId} className="bg-white border border-blue-100 rounded px-3 py-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{enrollment.programName}</span>
                                        {enrollment.teams?.length > 0 && (
                                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                            {enrollment.teams.length} team{enrollment.teams.length > 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-blue-600 capitalize">{enrollment.status}</span>
                                        <button
                                          type="button"
                                          className="text-red-500 hover:text-red-700 text-sm font-medium px-1"
                                          onClick={() => {
                                            setEditingUser({
                                              ...editingUser,
                                              enrollmentsToRemove: [...(editingUser.enrollmentsToRemove || []), enrollment.enrollmentId],
                                              pendingEnrollments: (editingUser.pendingEnrollments || programEnrollments).filter((e: any) => e.enrollmentId !== enrollment.enrollmentId)
                                            });
                                          }}
                                          data-testid={`button-remove-enrollment-${enrollment.enrollmentId}`}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                    {!enrollment.isNew && (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-blue-50">
                                        <div>
                                          <label className="text-[10px] text-gray-500 uppercase">Enrolled</label>
                                          <p className="text-xs text-gray-700">
                                            {enrollment.startDate ? new Date(enrollment.startDate).toLocaleDateString() : '—'}
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-gray-500 uppercase">End Date</label>
                                          <input
                                            type="date"
                                            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-full"
                                            value={enrollment.endDate ? new Date(enrollment.endDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => {
                                              const updated = (editingUser.pendingEnrollments || programEnrollments).map((en: any) =>
                                                en.enrollmentId === enrollment.enrollmentId
                                                  ? { ...en, endDate: e.target.value ? new Date(e.target.value).toISOString() : null }
                                                  : en
                                              );
                                              setEditingUser({
                                                ...editingUser,
                                                pendingEnrollments: updated,
                                                enrollmentUpdates: {
                                                  ...(editingUser.enrollmentUpdates || {}),
                                                  [enrollment.enrollmentId]: {
                                                    ...(editingUser.enrollmentUpdates?.[enrollment.enrollmentId] || {}),
                                                    endDate: e.target.value ? new Date(e.target.value).toISOString() : null
                                                  }
                                                }
                                              });
                                            }}
                                          />
                                        </div>
                                        {enrollment.pricingAmount && (
                                          <div>
                                            <label className="text-[10px] text-gray-500 uppercase">Amount</label>
                                            <p className="text-xs text-gray-700">
                                              ${(enrollment.pricingAmount / 100).toFixed(2)}
                                              {enrollment.pricingOptionName && <span className="text-gray-400 ml-1">({enrollment.pricingOptionName})</span>}
                                            </p>
                                          </div>
                                        )}
                                        {enrollment.stripeSubscriptionId && (
                                          <div>
                                            <label className="text-[10px] text-gray-500 uppercase">Billing</label>
                                            <p className="text-xs text-gray-700">
                                              Recurring {enrollment.autoRenew ? '(auto-renew)' : ''}
                                            </p>
                                          </div>
                                        )}
                                        {enrollment.remainingCredits != null && (
                                          <div>
                                            <label className="text-[10px] text-gray-500 uppercase">Credits</label>
                                            <p className="text-xs text-gray-700">
                                              {enrollment.remainingCredits}{enrollment.totalCredits ? ` / ${enrollment.totalCredits}` : ''}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {enrollment.isNew && (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-blue-50">
                                        <div>
                                          <label className="text-[10px] text-gray-500 uppercase">Start Date</label>
                                          <input
                                            type="date"
                                            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-full"
                                            value={enrollment.startDate || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => {
                                              const updated = (editingUser.pendingEnrollments || programEnrollments).map((en: any) =>
                                                en.enrollmentId === enrollment.enrollmentId ? { ...en, startDate: e.target.value } : en
                                              );
                                              setEditingUser({ ...editingUser, pendingEnrollments: updated });
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-gray-500 uppercase">End Date</label>
                                          <input
                                            type="date"
                                            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-full"
                                            value={enrollment.endDate || ''}
                                            onChange={(e) => {
                                              const updated = (editingUser.pendingEnrollments || programEnrollments).map((en: any) =>
                                                en.enrollmentId === enrollment.enrollmentId ? { ...en, endDate: e.target.value } : en
                                              );
                                              setEditingUser({ ...editingUser, pendingEnrollments: updated });
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Enroll in Program Section */}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Enroll in Program:</p>
                            <div className="border rounded-md max-h-32 overflow-y-auto">
                              {programs?.filter((p: any) => 
                                p.productCategory === 'service' && 
                                !(editingUser.pendingEnrollments || programEnrollments).some((e: any) => e.programId === p.id)
                              ).map((program: any) => (
                                <div key={program.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                                  <span className="text-sm">{program.name}</span>
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    onClick={() => {
                                      // Add enrollment to pending
                                      const newEnrollment = {
                                        enrollmentId: `new-${program.id}`,
                                        programId: program.id,
                                        programName: program.name,
                                        status: 'active',
                                        teams: [],
                                        isNew: true
                                      };
                                      setEditingUser({
                                        ...editingUser,
                                        pendingEnrollments: [...(editingUser.pendingEnrollments || programEnrollments), newEnrollment],
                                        enrollmentsToAdd: [...(editingUser.enrollmentsToAdd || []), program.id]
                                      });
                                    }}
                                    data-testid={`button-enroll-${program.id}`}
                                  >
                                    + Enroll
                                  </button>
                                </div>
                              ))}
                              {programs?.filter((p: any) => 
                                p.productCategory === 'service' && 
                                !(editingUser.pendingEnrollments || programEnrollments).some((e: any) => e.programId === p.id)
                              ).length === 0 && (
                                <p className="text-xs text-gray-500 px-3 py-2">Already enrolled in all available programs</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Current Team Assignments - Clear display of what teams user is on */}
                          {activeTeams.length > 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-md p-3" data-testid="current-assignments">
                              <p className="text-xs font-semibold text-green-700 mb-2">Team Assignments ({activeTeams.length}):</p>
                              <div className="space-y-1">
                                {activeTeams.map((assignment: any) => (
                                  <div key={assignment.teamId} className="flex items-center justify-between bg-white border border-green-100 rounded px-2 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{assignment.teamName}</span>
                                      {assignment.programName && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{assignment.programName}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                                      onClick={() => {
                                        const newTeamIds = teamIds.filter((id: number) => id !== assignment.teamId);
                                        setEditingUser({
                                          ...editingUser,
                                          teamIds: newTeamIds,
                                          teamId: newTeamIds[0] || null,
                                          activeTeams: activeTeams.filter((a: any) => a.teamId !== assignment.teamId)
                                        });
                                      }}
                                      data-testid={`button-remove-team-${assignment.teamId}`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : programEnrollments.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3" data-testid="no-assignments">
                              <p className="text-sm text-yellow-700">Not enrolled in any programs or assigned to any teams</p>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3" data-testid="no-team-assignments">
                              <p className="text-sm text-yellow-700">Enrolled in programs but not assigned to any teams yet</p>
                            </div>
                          )}
                          
                          {/* Add to Teams Section */}
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Add to Team:</p>
                            <div className="border rounded-md max-h-48 overflow-y-auto" data-testid="program-team-assignments">
                              {programs?.map((program: any) => {
                                const programTeams = teamsByProgram[program.id]?.teams || [];
                                if (programTeams.length === 0) return null;
                                
                                const hasAssignedTeam = programTeams.some((t: any) => teamIds.includes(t.id));
                                
                                return (
                                  <div key={program.id} className="border-b last:border-b-0">
                                    <div className={`px-3 py-2 font-semibold text-sm ${hasAssignedTeam ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
                                      {program.name}
                                    </div>
                                    <div className="p-2 space-y-1">
                                      {programTeams.map((team: any) => {
                                        const isChecked = teamIds.includes(team.id);
                                        return (
                                          <div key={team.id} className="flex items-center space-x-2 pl-2">
                                            <Checkbox
                                              id={`team-${team.id}`}
                                              checked={isChecked}
                                              onCheckedChange={(checked) => {
                                                let newTeamIds;
                                                let newActiveTeams = [...activeTeams];
                                                if (checked) {
                                                  newTeamIds = [...teamIds, team.id];
                                                  // Add to activeTeams display
                                                  newActiveTeams.push({
                                                    teamId: team.id,
                                                    teamName: team.name,
                                                    programId: program.id,
                                                    programName: program.name
                                                  });
                                                } else {
                                                  newTeamIds = teamIds.filter((id: number) => id !== team.id);
                                                  newActiveTeams = newActiveTeams.filter((a: any) => a.teamId !== team.id);
                                                }
                                                setEditingUser({
                                                  ...editingUser,
                                                  teamIds: newTeamIds,
                                                  teamId: newTeamIds[0] || null,
                                                  activeTeams: newActiveTeams
                                                });
                                              }}
                                              data-testid={`checkbox-team-${team.id}`}
                                            />
                                            <label
                                              htmlFor={`team-${team.id}`}
                                              className={`text-sm leading-none cursor-pointer ${isChecked ? 'text-blue-700 font-medium' : ''}`}
                                            >
                                              {team.name}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Teams without program */}
                              {teamsWithoutProgram.length > 0 && (
                                <div className="border-b last:border-b-0">
                                  <div className="px-3 py-2 font-semibold text-sm bg-gray-50 text-gray-700">
                                    Other Teams
                                  </div>
                                  <div className="p-2 space-y-1">
                                    {teamsWithoutProgram.map((team: any) => {
                                      const isChecked = teamIds.includes(team.id);
                                      return (
                                        <div key={team.id} className="flex items-center space-x-2 pl-2">
                                          <Checkbox
                                            id={`team-${team.id}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              let newTeamIds;
                                              let newActiveTeams = [...activeTeams];
                                              if (checked) {
                                                newTeamIds = [...teamIds, team.id];
                                                newActiveTeams.push({
                                                  teamId: team.id,
                                                  teamName: team.name,
                                                  programId: null,
                                                  programName: null
                                                });
                                              } else {
                                                newTeamIds = teamIds.filter((id: number) => id !== team.id);
                                                newActiveTeams = newActiveTeams.filter((a: any) => a.teamId !== team.id);
                                              }
                                              setEditingUser({
                                                ...editingUser,
                                                teamIds: newTeamIds,
                                                teamId: newTeamIds[0] || null,
                                                activeTeams: newActiveTeams
                                              });
                                            }}
                                            data-testid={`checkbox-team-${team.id}`}
                                          />
                                          <label
                                            htmlFor={`team-${team.id}`}
                                            className={`text-sm leading-none cursor-pointer ${isChecked ? 'text-blue-700 font-medium' : ''}`}
                                          >
                                            {team.name}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {(!programs || programs.length === 0) && (!teams || teams.length === 0) && (
                                <p className="p-3 text-sm text-gray-500">No programs or teams available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {editingUser.role !== 'coach' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-division" data-testid="label-edit-division">Division</Label>
                      <Input
                        id="edit-division"
                        value={editingUser.division || ""}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          division: e.target.value
                        })}
                        placeholder="e.g., U10, U12, Varsity"
                        data-testid="input-edit-division"
                      />
                    </div>
                  )}
                  
                  {editingUser.role === 'coach' && (
                    <div className="space-y-2">
                      <Label data-testid="label-coached-teams">Teams Coached</Label>
                      <div className="border rounded-md p-3 bg-gray-50">
                        {(() => {
                          const headCoachTeams = teams.filter((t: any) => t.coachId === editingUser.id);
                          const assistantCoachTeams = teams.filter((t: any) => 
                            Array.isArray(t.assistantCoachIds) && t.assistantCoachIds.includes(editingUser.id)
                          );
                          
                          if (headCoachTeams.length === 0 && assistantCoachTeams.length === 0) {
                            return <p className="text-sm text-gray-500">Not assigned to any teams</p>;
                          }
                          
                          return (
                            <div className="space-y-2">
                              {headCoachTeams.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Head Coach:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {headCoachTeams.map((team: any) => (
                                      <Badge key={team.id} variant="default" className="text-xs">
                                        {team.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {assistantCoachTeams.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Assistant Coach:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {assistantCoachTeams.map((team: any) => (
                                      <Badge key={team.id} variant="secondary" className="text-xs">
                                        {team.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-500">
                        To modify team coaching assignments, use the Teams tab
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-dob" data-testid="label-edit-dob">Date of Birth</Label>
                    <button
                      type="button"
                      onClick={() => setShowDobPicker(true)}
                      data-testid="input-edit-dob"
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className={editingUser.dateOfBirth ? "text-gray-900" : "text-gray-400"}>
                        {editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date"}
                      </span>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    <Dialog open={showDobPicker} onOpenChange={setShowDobPicker}>
                      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 flex justify-center date-wheel-picker-dark">
                          <DateScrollPicker
                            defaultYear={editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).getFullYear() : 2000}
                            defaultMonth={(editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).getMonth() : 0) + 1}
                            defaultDay={editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).getDate() : 1}
                            startYear={1950}
                            endYear={new Date().getFullYear()}
                            dateTimeFormatOptions={{ month: 'short' }}
                            highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                            onDateChange={(date: Date) => {
                              setEditingUser({...editingUser, dateOfBirth: date.toISOString().split('T')[0]});
                            }}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
                            onClick={() => setShowDobPicker(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setShowDobPicker(false)}
                          >
                            Confirm
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {editingUser.role !== 'coach' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-position" data-testid="label-edit-position">Position</Label>
                      <Select 
                        value={editingUser.position || "none"}
                        onValueChange={(value) => setEditingUser({...editingUser, position: value === "none" ? "" : value})}
                      >
                        <SelectTrigger id="edit-position" data-testid="select-edit-position">
                          <SelectValue placeholder="Select position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="PG">PG - Point Guard</SelectItem>
                          <SelectItem value="SG">SG - Shooting Guard</SelectItem>
                          <SelectItem value="SF">SF - Small Forward</SelectItem>
                          <SelectItem value="PF">PF - Power Forward</SelectItem>
                          <SelectItem value="C">C - Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {editingUser.role !== 'coach' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-height-in" data-testid="label-edit-height-in">Height (inches)</Label>
                      <Input 
                        id="edit-height-in"
                        type="number"
                        value={editingUser.heightIn || ""}
                        onChange={(e) => setEditingUser({...editingUser, heightIn: parseInt(e.target.value) || null})}
                        data-testid="input-edit-height-in"
                        placeholder="e.g., 72 for 6'0&quot;"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes" data-testid="label-edit-notes">Admin Notes</Label>
                    <Textarea 
                      id="edit-notes"
                      value={editingUser.notes || ""}
                      onChange={(e) => setEditingUser({...editingUser, notes: e.target.value})}
                      data-testid="input-edit-notes"
                      placeholder="Internal notes (not visible to user)..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="edit-active"
                      checked={editingUser.isActive !== false}
                      onCheckedChange={(checked) => setEditingUser({...editingUser, isActive: checked})}
                      data-testid="switch-edit-active"
                    />
                    <Label htmlFor="edit-active" data-testid="label-edit-active">Active</Label>
                  </div>
                  
                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={() => {
                      const { id, firstName, lastName, email, phoneNumber, role, teamId, teamIds, division, dateOfBirth, position, heightIn, notes, isActive, pendingEnrollments, enrollmentsToAdd, enrollmentsToRemove, enrollmentUpdates, newEnrollmentDates } = editingUser;
                      updateUser.mutate({ id, firstName, lastName, email, phoneNumber, role, teamId, teamIds, division, dateOfBirth, position, heightIn, notes, isActive, pendingEnrollments, enrollmentsToAdd, enrollmentsToRemove, enrollmentUpdates, newEnrollmentDates });
                    }}
                    disabled={updateUser.isPending}
                    data-testid="button-submit-edit-user"
                  >
                    {updateUser.isPending ? "Updating..." : "Update User"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          </div>
        </div>
        
      </CardHeader>
      <CardContent>
        {/* Bulk Action Bar */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedUserIds.size} user(s)?`)) {
                  bulkDeleteUsers.mutate(Array.from(selectedUserIds));
                }
              }}
              disabled={bulkDeleteUsers.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteUsers.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUserIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        {/* Search bar */}
        <div className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, role, or phone..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-1.5 shrink-0 ${(filterRoles.size > 0 || filterStatuses.size > 0) ? 'border-blue-500 text-blue-600 bg-blue-50' : ''}`}
                  data-testid="button-filter-users"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                  {(filterRoles.size + filterStatuses.size) > 0 && (
                    <span className="ml-1 bg-blue-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center font-medium">
                      {filterRoles.size + filterStatuses.size}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Filters</h4>
                    {(filterRoles.size > 0 || filterStatuses.size > 0) && (
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => { setFilterRoles(new Set()); setFilterStatuses(new Set()); }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Role</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["player", "parent", "coach", "admin"].map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setFilterRoles(prev => {
                              const next = new Set(prev);
                              if (next.has(role)) next.delete(role); else next.add(role);
                              return next;
                            });
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                            filterRoles.has(role)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Active Program",
                        "Pending Assignment",
                        "Payment Failed",
                        "Low Balance",
                        "Active Subscriber",
                        "Expired",
                        "No Enrollment",
                      ].map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setFilterStatuses(prev => {
                              const next = new Set(prev);
                              if (next.has(status)) next.delete(status); else next.add(status);
                              return next;
                            });
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                            filterStatuses.has(status)
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {/* Active filter chips */}
          {(filterRoles.size > 0 || filterStatuses.size > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Array.from(filterRoles).map((role) => (
                <span key={role} className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium capitalize">
                  {role}
                  <button
                    onClick={() => setFilterRoles(prev => { const next = new Set(prev); next.delete(role); return next; })}
                    className="ml-0.5 hover:text-blue-900"
                    aria-label={`Remove ${role} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {Array.from(filterStatuses).map((status) => (
                <span key={status} className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium">
                  {status}
                  <button
                    onClick={() => setFilterStatuses(prev => { const next = new Set(prev); next.delete(status); return next; })}
                    className="ml-0.5 hover:text-blue-900"
                    aria-label={`Remove ${status} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => { setFilterRoles(new Set()); setFilterStatuses(new Set()); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
              >
                Clear all
              </button>
            </div>
          )}
          {(userSearchTerm || filterRoles.size > 0 || filterStatuses.size > 0) && (
            <p className="text-xs text-gray-500 mt-1">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </div>
        
        {/* Top scrollbar for horizontal navigation */}
        <div 
          className="overflow-x-auto mb-2"
          onScroll={(e) => {
            if (tableRef.current) {
              tableRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <div style={{ width: tableRef.current?.scrollWidth || '100%', height: '1px' }}></div>
        </div>
        
        {/* Table with bottom scrollbar and mobile swipe support */}
        <div 
          ref={tableRef} 
          className="overflow-x-scroll drag-scroll touch-pan-x"
          onScroll={(e) => {
            const topScrollbar = e.currentTarget.previousElementSibling as HTMLElement;
            if (topScrollbar) {
              topScrollbar.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                    onCheckedChange={() => toggleAllUsers(filteredUsers.map((u: any) => u.id))}
                    aria-label="Select all users"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('firstName')}
                  data-testid="sort-name"
                >Name {sortField === 'firstName' && (sortDirection === 'asc' ? '↑' : '↓')}</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                  data-testid="sort-email"
                >
                  Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('phoneNumber')}
                  data-testid="sort-phoneNumber"
                >
                  Phone {sortField === 'phoneNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('role')}
                  data-testid="sort-role"
                >
                  Role {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  data-testid="sort-players"
                >
                  Players
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  data-testid="sort-programs"
                >
                  Programs
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('team')}
                  data-testid="sort-team"
                >
                  Teams
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  data-testid="sort-status"
                >
                  Status
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: any) => {
                const userTeam = teams.find((t: any) => String(t.id) === String(user.teamId));
                const userProgram = userTeam ? programs.find((p: any) => String(p.id) === String(userTeam.programId)) : null;
                const linkedPlayers = users.filter((u: any) => (u.accountHolderId === user.id || u.parentId === user.id) && u.role === "player");
                return (
                  <TableRow key={user.id} className="cursor-default" data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                        aria-label={`Select ${user.firstName} ${user.lastName}`}
                      />
                    </TableCell>
                    <TableCell data-testid={`text-name-${user.id}`}>
                      <div className="font-medium flex items-center gap-2">
                        {user.firstName || ""} {user.lastName || ""}
                        {user.flaggedForRosterChange && (
                          <span 
                            className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded cursor-help" 
                            title={user.flagReason ? `Reason: ${user.flagReason}` : "Flagged for roster review by coach"}
                            data-testid={`flag-indicator-${user.id}`}
                          >
                            <Flag className="w-3 h-3" /> Flagged
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-email-${user.id}`}>
                      {(() => {
                        if (user.email) {
                          return <span className="text-gray-600 text-sm">{user.email}</span>;
                        }
                        if (user.role === "player") {
                          const holderId = user.accountHolderId || user.parentId;
                          if (holderId) {
                            const accountHolder = users.find((u: any) => u.id === holderId);
                            if (accountHolder?.email) {
                              return <span className="text-gray-400 text-sm italic">{accountHolder.email}</span>;
                            }
                          }
                        }
                        return <span className="text-gray-400 text-sm">-</span>;
                      })()}
                    </TableCell>
                    <TableCell data-testid={`text-phone-${user.id}`}>
                      {(() => {
                        if (user.role === "player") {
                          const holderId = user.accountHolderId || user.parentId;
                          if (holderId) {
                            const accountHolder = users.find((u: any) => u.id === holderId);
                            if (accountHolder?.phoneNumber || accountHolder?.phone) {
                              return <span className="text-gray-600 text-sm">{accountHolder.phoneNumber || accountHolder.phone}</span>;
                            }
                          }
                        }
                        return <span className="text-gray-600 text-sm">{user.phoneNumber || user.phone || "-"}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`capitalize ${
                          user.role === "admin" 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : user.role === "coach" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : user.role === "parent" 
                            ? "bg-purple-600 text-white hover:bg-purple-700" 
                            : user.role === "player" 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-500 text-white"
                        }`}
                        data-testid={`badge-role-${user.id}`}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-players-${user.id}`}>
                      {linkedPlayers.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {linkedPlayers.slice(0, 3).map((p: any) => {
                            const playerEnrollments = enrollments.filter((e: any) => e.profileId === p.id);
                            const isOnTeam = p.teamId || (Array.isArray(p.teamIds) && p.teamIds.length > 0) || (Array.isArray(p.activeTeams) && p.activeTeams.length > 0);
                            const now = new Date();
                            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                            const hasPaymentFailed = playerEnrollments.some((e: any) => e.status === 'payment_failed' || e.paymentStatus === 'failed');
                            const hasActiveWithoutTeam = playerEnrollments.some((e: any) => e.status === 'active') && !isOnTeam && teams.length > 0;
                            const hasLowBalance = playerEnrollments.some((e: any) => {
                              if (e.status !== 'active' || !e.endDate) return false;
                              const endDate = new Date(e.endDate);
                              return endDate <= threeDaysFromNow && endDate > now;
                            });
                            const hasActiveOnTeam = playerEnrollments.some((e: any) => e.status === 'active') && !!isOnTeam;
                            const hasActiveSubscriber = playerEnrollments.some((e: any) => e.status === 'active' && e.stripeSubscriptionId);
                            const hasActiveOneTime = playerEnrollments.some((e: any) => e.status === 'active' && !e.stripeSubscriptionId);
                            const hasExpired = playerEnrollments.some((e: any) => e.status === 'expired' || e.status === 'cancelled');
                            let playerStatus = "No Enrollment";
                            if (hasActiveWithoutTeam) playerStatus = "Pending Assignment";
                            else if (hasPaymentFailed) playerStatus = "Payment Failed";
                            else if (hasLowBalance) playerStatus = "Low Balance";
                            else if (hasActiveOnTeam) playerStatus = "Active Program";
                            else if (hasActiveSubscriber) playerStatus = "Active Subscriber";
                            else if (hasActiveOneTime) playerStatus = "Active Program";
                            else if (hasExpired) playerStatus = "Expired";
                            const playerNameColor =
                              playerStatus === "Active Program" || playerStatus === "Active Subscriber" ? "text-green-600" :
                              playerStatus === "Pending Assignment" ? "text-amber-500" :
                              playerStatus === "Payment Failed" ? "text-red-600" :
                              playerStatus === "Low Balance" ? "text-yellow-600" :
                              playerStatus === "Expired" ? "text-gray-500" :
                              "text-gray-600";
                            return (
                              <span key={p.id} className={`text-xs ${playerNameColor}`}>{p.firstName} {p.lastName}</span>
                            );
                          })}
                          {linkedPlayers.length > 3 && (
                            <span className="text-xs text-gray-400">+{linkedPlayers.length - 3} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`text-programs-${user.id}`}>
                      {(() => {
                        const userProgramNames: string[] = [];
                        const userEnrollments = enrollments.filter((e: any) => 
                          e.accountHolderId === user.id || e.profileId === user.id
                        );
                        userEnrollments.forEach((enrollment: any) => {
                          const prog = programs.find((p: any) => String(p.id) === String(enrollment.programId));
                          if (prog && !userProgramNames.includes(prog.name)) {
                            userProgramNames.push(prog.name);
                          }
                        });
                        linkedPlayers.forEach((player: any) => {
                          const playerEnrollments = enrollments.filter((e: any) => e.profileId === player.id);
                          playerEnrollments.forEach((enrollment: any) => {
                            const prog = programs.find((p: any) => String(p.id) === String(enrollment.programId));
                            if (prog && !userProgramNames.includes(prog.name)) {
                              userProgramNames.push(prog.name);
                            }
                          });
                        });
                        if (userProgramNames.length === 0) {
                          return <span className="text-gray-400 text-sm">-</span>;
                        }
                        return (
                          <div className="flex flex-col gap-0.5">
                            {userProgramNames.slice(0, 3).map((name, idx) => (
                              <span key={idx} className="text-xs text-gray-600">{name}</span>
                            ))}
                            {userProgramNames.length > 3 && (
                              <span className="text-xs text-gray-400">+{userProgramNames.length - 3} more</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell data-testid={`text-teams-${user.id}`}>
                      {(() => {
                        const allTeamNames: string[] = [];
                        // User's own team (as player)
                        if (userTeam && !allTeamNames.includes(userTeam.name)) {
                          allTeamNames.push(userTeam.name);
                        }
                        // Teams where user is the coach
                        const coachedTeams = teams.filter((t: any) => t.coachId === user.id);
                        coachedTeams.forEach((team: any) => {
                          if (!allTeamNames.includes(team.name)) {
                            allTeamNames.push(team.name);
                          }
                        });
                        linkedPlayers.forEach((player: any) => {
                          if (Array.isArray(player.activeTeams) && player.activeTeams.length > 0) {
                            player.activeTeams.forEach((at: any) => {
                              if (at.teamName && !allTeamNames.includes(at.teamName)) {
                                allTeamNames.push(at.teamName);
                              }
                            });
                          }
                          const playerTeam = teams.find((t: any) => String(t.id) === String(player.teamId));
                          if (playerTeam && !allTeamNames.includes(playerTeam.name)) {
                            allTeamNames.push(playerTeam.name);
                          }
                        });
                        if (allTeamNames.length === 0) {
                          return <span className="text-gray-400 text-sm">-</span>;
                        }
                        return (
                          <div className="flex flex-col gap-0.5">
                            {allTeamNames.slice(0, 3).map((name, idx) => (
                              <span key={idx} className="text-xs text-gray-600">{name}</span>
                            ))}
                            {allTeamNames.length > 3 && (
                              <span className="text-xs text-gray-400">+{allTeamNames.length - 3} more</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell data-testid={`text-status-${user.id}`}>
                      {(() => {
                        const status = deriveUserStatus(user);
                        if (status === "Pending Assignment") {
                          return <Badge className="bg-amber-500 text-white hover:bg-amber-600 whitespace-nowrap">Pending Assignment</Badge>;
                        }
                        if (status === "Active Program") {
                          return <Badge className="bg-green-600 text-white hover:bg-green-700 whitespace-nowrap">Active Program</Badge>;
                        }
                        if (status === "Payment Failed") {
                          return <Badge className="bg-red-600 text-white hover:bg-red-700 whitespace-nowrap">Payment Failed</Badge>;
                        }
                        if (status === "Low Balance") {
                          return <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500 whitespace-nowrap">Low Balance</Badge>;
                        }
                        if (status === "Active Subscriber") {
                          return <Badge className="bg-green-600 text-white hover:bg-green-700 whitespace-nowrap">Active Subscriber</Badge>;
                        }
                        if (status === "Expired") {
                          return <Badge className="bg-gray-500 text-white hover:bg-gray-600 whitespace-nowrap">Expired</Badge>;
                        }
                        return <Badge className="bg-gray-200 text-gray-600 hover:bg-gray-300 whitespace-nowrap">No Enrollment</Badge>;
                      })()}
                    </TableCell>
                    <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingUser(user);
                          }}
                          data-testid={`button-edit-user-${user.id}`}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      {/* User Detail View Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[85vh] overflow-hidden p-0 flex flex-col">
          {viewingUser && (
            <>
              {/* Header with user info */}
              <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl font-semibold">
                    {viewingUser.firstName?.charAt(0)}{viewingUser.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {viewingUser.firstName} {viewingUser.lastName}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">{viewingUser.email || "—"}</span>
                      {(viewingUser.phoneNumber || viewingUser.phone) && (
                        <span className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{viewingUser.phoneNumber || viewingUser.phone}</span>
                      )}
                      <Badge 
                        className={`capitalize ${
                          viewingUser.role === "admin" 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : viewingUser.role === "coach" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : viewingUser.role === "parent" 
                            ? "bg-purple-600 text-white hover:bg-purple-700" 
                            : viewingUser.role === "player" 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {viewingUser.role}
                      </Badge>
                      {viewingUser.isActive !== false ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddRoleDialog(true)}
                      className="flex items-center gap-2"
                      data-testid="button-add-role"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmUser(viewingUser)}
                      className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      data-testid="button-delete-user"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b px-6 flex-shrink-0">
                <nav className="flex gap-1" role="tablist">
                  {[
                    { id: "team", label: "Profile" },
                    { id: "billing", label: "Billing" },
                    { id: "performance", label: "Performance" },
                    { id: "notes", label: "Notes" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={detailTab === tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                        detailTab === tab.id
                          ? "text-red-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      data-testid={`tab-${tab.id}`}
                    >
                      {tab.label}
                      {detailTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">

              {/* Profile Tab */}
              {detailTab === "team" && (
                <div role="tabpanel" id="team-panel" className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Team</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-team">
                        {teams.find((t: any) => t.id === Number(viewingUser.teamId))?.name || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Division</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-division">
                        {divisions.find((d: any) => d.id === Number(viewingUser.divisionId))?.name || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Program</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-program">{viewingUser.program || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-phone">{viewingUser.phoneNumber || viewingUser.phone || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Position</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-position">{viewingUser.position || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Height</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-height">
                        {viewingUser.heightIn ? `${Math.floor(viewingUser.heightIn / 12)}'${viewingUser.heightIn % 12}"` : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Guardian</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-guardian">
                        {viewingUser.guardianId ? users.find((u: any) => u.id === viewingUser.guardianId)?.firstName + " " + users.find((u: any) => u.id === viewingUser.guardianId)?.lastName : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  {(viewingUser.address || viewingUser.city || viewingUser.state || viewingUser.postalCode) && (
                    <div className="pt-4 border-t">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Address</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Street</p>
                          <p className="text-sm text-gray-900" data-testid="text-user-address">{viewingUser.address || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">City</p>
                          <p className="text-sm text-gray-900" data-testid="text-user-city">{viewingUser.city || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">State</p>
                          <p className="text-sm text-gray-900" data-testid="text-user-state">{viewingUser.state || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">ZIP / Postal Code</p>
                          <p className="text-sm text-gray-900" data-testid="text-user-postal-code">{viewingUser.postalCode || "—"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {viewingUser.bio && (
                    <div className="pt-4 border-t">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Bio</p>
                      <p className="text-sm text-gray-700 leading-relaxed" data-testid="text-user-bio">{viewingUser.bio}</p>
                    </div>
                  )}

                  {/* System Info */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Account Details</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">User ID</p>
                        <p className="font-mono text-xs text-gray-600" data-testid="text-user-id">{viewingUser.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Last Login</p>
                        <p className="text-gray-600" data-testid="text-last-login">
                          {viewingUser.lastLogin ? new Date(viewingUser.lastLogin).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Created</p>
                        <p className="text-gray-600" data-testid="text-created-at">
                          {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Verified</p>
                        <p className="text-gray-600">{viewingUser.verified ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Role Profiles */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Role Profiles</p>
                    <div className="space-y-2">
                      {(() => {
                        const accountHolderId = viewingUser.accountHolderId || viewingUser.id;
                        const accountProfiles = users.filter((u: any) => 
                          u.id === accountHolderId || u.accountHolderId === accountHolderId
                        );
                        return accountProfiles.map((profile: any) => (
                          <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                            <div className="flex items-center gap-3">
                              <Badge variant={profile.id === viewingUser.id ? "default" : "secondary"} className="capitalize">
                                {profile.role}
                              </Badge>
                              <span className="text-sm text-gray-600">{profile.firstName} {profile.lastName}</span>
                              {!profile.accountHolderId && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Primary</span>
                              )}
                              {profile.id === viewingUser.id && (
                                <span className="text-xs text-blue-500">Currently viewing</span>
                              )}
                            </div>
                            {profile.accountHolderId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRemoveRoleConfirm({ userId: profile.id, role: profile.role })}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                data-testid={`button-remove-role-${profile.role}`}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {detailTab === "billing" && (
                <div role="tabpanel" id="billing-panel" className="space-y-6">
                  {billingLoading ? (
                    <div className="space-y-4">
                      <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                      <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  ) : (
                    <>
                      {/* Stripe Info & Next Payment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stripe Customer ID</p>
                          <p className="text-sm font-mono text-gray-900" data-testid="text-user-stripe-id">
                            {userBillingDetails?.stripeCustomerId || viewingUser.stripeCustomerId || "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stripe Subscription IDs</p>
                          {userBillingDetails?.stripeSubscriptionIds?.length > 0 ? (
                            <div className="space-y-1" data-testid="text-stripe-sub-ids">
                              {userBillingDetails.stripeSubscriptionIds.map((subId: string, idx: number) => (
                                <p key={idx} className="text-sm font-mono text-gray-900">{subId}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">—</p>
                          )}
                        </div>
                      </div>

                      {/* Next Payment Date */}
                      {userBillingDetails?.nextPaymentDate && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Next Payment Due</p>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-blue-700" data-testid="text-next-payment-date">
                              {new Date(userBillingDetails.nextPaymentDate).toLocaleDateString('en-US', { 
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                              })}
                            </p>
                            {userBillingDetails.nextPaymentAmount > 0 && (
                              <p className="text-lg font-bold text-blue-700" data-testid="text-next-payment-amount">
                                ${(userBillingDetails.nextPaymentAmount / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Players with Programs and Subscriptions */}
                      {userBillingDetails?.players?.length > 0 && (
                        <div className="pt-4 border-t">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                            Player Assignments ({userBillingDetails.players.length})
                          </p>
                          <div className="space-y-4">
                            {userBillingDetails.players.map((player: any) => (
                              <div key={player.id} className="bg-gray-50 rounded-lg p-4" data-testid={`player-billing-${player.id}`}>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xs font-semibold">
                                    {player.firstName?.charAt(0)}{player.lastName?.charAt(0)}
                                  </div>
                                  <p className="font-medium text-gray-900">{player.firstName} {player.lastName}</p>
                                </div>
                                
                                {/* Programs for this player */}
                                {player.programs?.length > 0 ? (
                                  <div className="mb-3">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Programs:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {player.programs.map((prog: any, idx: number) => (
                                        <Badge 
                                          key={idx} 
                                          variant="outline" 
                                          className={`text-xs ${prog.source === 'migrated' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}
                                          data-testid={`program-badge-${player.id}-${idx}`}
                                        >
                                          {prog.programName}
                                          {prog.source === 'migrated' && <span className="ml-1 text-xs">(migrated)</span>}
                                          {prog.remainingCredits !== null && (
                                            <span className="ml-1 text-xs">({prog.remainingCredits} credits)</span>
                                          )}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 mb-3">No programs assigned</p>
                                )}
                                
                                {/* Subscriptions for this player */}
                                {player.subscriptions?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">Subscriptions:</p>
                                    <div className="space-y-2">
                                      {player.subscriptions.map((sub: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border" data-testid={`subscription-${player.id}-${idx}`}>
                                          <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${sub.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="font-medium">{sub.productName}</span>
                                            {sub.isMigrated && (
                                              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">Legacy</Badge>
                                            )}
                                          </div>
                                          {sub.nextPaymentDate && (
                                            <span className="text-xs text-gray-500">
                                              Next: {new Date(sub.nextPaymentDate).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Legacy Products Section */}
                      <div className="pt-4 border-t">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Active Products</p>
                        {viewingUser.products && Array.isArray(viewingUser.products) && viewingUser.products.length > 0 ? (
                          <div className="space-y-2">
                            {viewingUser.products.map((product: any, index: number) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid={`product-${index}`}>
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <p className="text-sm font-medium text-gray-900">{typeof product === 'string' ? product : product.name || 'Unknown Product'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">No active products</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Performance Tab */}
              {detailTab === "performance" && (
                <div role="tabpanel" id="performance-panel" className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {[
                      { label: "Practices", value: viewingUser.totalPractices || 0, testId: "stat-total-practices" },
                      { label: "Games", value: viewingUser.totalGames || 0, testId: "stat-total-games" },
                      { label: "Check-ins", value: viewingUser.consecutiveCheckins || 0, testId: "stat-consecutive-checkins" },
                      { label: "Videos", value: viewingUser.videosCompleted || 0, testId: "stat-videos-completed" },
                      { label: "Years", value: viewingUser.yearsActive || 0, testId: "stat-years-active" },
                      { label: "Skill", value: viewingUser.skill || "—", testId: "stat-skill-level" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900" data-testid={stat.testId}>{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Skills Assessment */}
                  <div className="pt-4 border-t" data-testid="section-skills-assessment">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Skill Assessments</p>
                    {evaluationsLoading ? (
                      <div className="space-y-3">
                        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                      </div>
                    ) : evaluationsError ? (
                      <p className="text-sm text-red-500">Failed to load assessments</p>
                    ) : userEvaluations.length === 0 ? (
                      <p className="text-sm text-gray-400">No skill assessments recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {userEvaluations.map((evaluation: any, index: number) => {
                          const coach = users.find((u: any) => u.id === evaluation.coachId);
                          const evaluationDate = evaluation.createdAt ? new Date(evaluation.createdAt) : null;
                          return (
                            <Accordion key={evaluation.id || index} type="single" collapsible>
                              <AccordionItem value={`eval-${index}`} className="border rounded-lg px-4" data-testid={`evaluation-${index}`}>
                                <AccordionTrigger className="hover:no-underline py-3">
                                  <div className="flex items-center gap-3 text-left">
                                    <Badge variant="outline" className="text-xs">{evaluation.quarter || 'Q1'}</Badge>
                                    <div>
                                      <p className="font-medium text-sm">{coach ? `${coach.firstName} ${coach.lastName}` : 'Coach'}</p>
                                      <p className="text-xs text-gray-400">{evaluationDate ? format(evaluationDate, 'MMM d, yyyy') : ''}</p>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {evaluation.scores && Object.keys(evaluation.scores).length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 py-3">
                                      {Object.entries(evaluation.scores).map(([category, score]: [string, any]) => {
                                        let prevScore: number | null = null;
                                        if (evaluation.previousScores && Array.isArray(evaluation.previousScores) && evaluation.previousScores.length > 0) {
                                          const lastSnapshot = evaluation.previousScores[evaluation.previousScores.length - 1];
                                          if (lastSnapshot?.scores?.[category] !== undefined) {
                                            prevScore = lastSnapshot.scores[category];
                                          }
                                        }
                                        const diff = prevScore !== null ? (score as number) - prevScore : null;
                                        return (
                                          <div key={category} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600 capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <div className="flex items-center gap-1.5">
                                              <Badge variant={score >= 4 ? "default" : "secondary"} className="text-xs">{score}/5</Badge>
                                              {diff !== null && diff !== 0 && (
                                                <span className={`text-[10px] font-medium ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                  {diff > 0 ? `+${diff}` : diff}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {evaluation.notes && (
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 mt-2">{evaluation.notes}</p>
                                  )}
                                  {evaluation.previousScores && Array.isArray(evaluation.previousScores) && evaluation.previousScores.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Previous Evaluations</p>
                                      <div className="space-y-2">
                                        {[...evaluation.previousScores].reverse().map((snapshot: any, snapIdx: number) => {
                                          const snapCoach = users.find((u: any) => u.id === snapshot.coachId);
                                          const snapDate = snapshot.updatedAt ? new Date(snapshot.updatedAt) : null;
                                          return (
                                            <div key={snapIdx} className="bg-gray-50 rounded-lg p-3">
                                              <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-medium text-gray-500">
                                                  {snapCoach ? `${snapCoach.firstName} ${snapCoach.lastName}` : 'Coach'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                  {snapDate ? format(snapDate, 'MMM d, yyyy') : ''}
                                                </span>
                                              </div>
                                              {snapshot.scores && (
                                                <div className="grid grid-cols-2 gap-1">
                                                  {Object.entries(snapshot.scores).map(([cat, sc]: [string, any]) => (
                                                    <div key={cat} className="flex justify-between items-center text-xs">
                                                      <span className="text-gray-500 capitalize">{cat.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                      <span className="text-gray-600">{sc}/5</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                              {snapshot.notes && (
                                                <p className="text-xs text-gray-500 mt-1">{snapshot.notes}</p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Awards */}
                  <div className="pt-4 border-t" data-testid="section-user-awards">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Awards & Achievements</p>
                    {awardsLoading ? (
                      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                    ) : awardsError ? (
                      <p className="text-sm text-red-500">Failed to load awards</p>
                    ) : !userAwards || ((!userAwards.badges || userAwards.badges.length === 0) && (!userAwards.trophies || userAwards.trophies.length === 0)) ? (
                      <p className="text-sm text-gray-400">No awards earned yet</p>
                    ) : (
                      <div className="space-y-4">
                        {userAwards.badges && userAwards.badges.length > 0 && (
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {userAwards.badges.map((badge: any) => (
                              <div key={badge.id} className="text-center p-3 bg-gray-50 rounded-lg" data-testid={`award-${badge.id}`}>
                                {badge.imageUrl && <img src={badge.imageUrl} alt={badge.name} className="w-10 h-10 mx-auto object-contain" />}
                                <p className="text-xs font-medium mt-2 truncate">{badge.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {userAwards.trophies && userAwards.trophies.length > 0 && (
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {userAwards.trophies.map((trophy: any) => (
                              <div key={trophy.id} className="text-center p-3 bg-amber-50 rounded-lg" data-testid={`award-${trophy.id}`}>
                                {trophy.imageUrl && <img src={trophy.imageUrl} alt={trophy.name} className="w-10 h-10 mx-auto object-contain" />}
                                <p className="text-xs font-medium mt-2 truncate">{trophy.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {detailTab === "notes" && (
                <div role="tabpanel" id="notes-panel" className="space-y-6">
                  {/* Emergency Contact */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Emergency Contact</p>
                    {viewingUser.emergencyContactJson ? (
                      <div className="bg-gray-50 rounded-lg p-4" data-testid="emergency-contact-info">
                        {typeof viewingUser.emergencyContactJson === 'object' ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {Object.entries(viewingUser.emergencyContactJson).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <p className="text-gray-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                <p className="text-gray-900">{value || "—"}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">{String(viewingUser.emergencyContactJson)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No emergency contact on file</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Internal Notes</p>
                    {viewingUser.notes ? (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4" data-testid="admin-notes">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingUser.notes}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No admin notes</p>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Add Role Dialog */}
              <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Role Profile</DialogTitle>
                    <DialogDescription>
                      Create a new role profile for {viewingUser.firstName} {viewingUser.lastName}. 
                      This will create a separate user record with the same email but a different role.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Role</Label>
                      <Select value={selectedRoleToAdd} onValueChange={setSelectedRoleToAdd}>
                        <SelectTrigger data-testid="select-role-to-add">
                          <SelectValue placeholder="Choose a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {['player', 'parent', 'coach', 'admin']
                            .filter(role => {
                              const accountHolderId = viewingUser.accountHolderId || viewingUser.id;
                              const existingRoles = users
                                .filter((u: any) => u.id === accountHolderId || u.accountHolderId === accountHolderId)
                                .map((u: any) => u.role);
                              return !existingRoles.includes(role);
                            })
                            .map(role => (
                              <SelectItem key={role} value={role} className="capitalize">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                      <p className="font-medium mb-1">What this does:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Creates a new user record with a unique ID</li>
                        <li>Uses the same email: {viewingUser.email}</li>
                        <li>Links to the same account holder</li>
                        <li>User can switch between roles in Profile Gateway</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (selectedRoleToAdd) {
                          const accountHolderId = viewingUser.accountHolderId || viewingUser.id;
                          addRole.mutate({ 
                            userId: accountHolderId, 
                            role: selectedRoleToAdd,
                            firstName: viewingUser.firstName,
                            lastName: viewingUser.lastName
                          });
                        }
                      }}
                      disabled={!selectedRoleToAdd || addRole.isPending}
                      data-testid="button-confirm-add-role"
                    >
                      {addRole.isPending ? "Adding..." : "Add Role"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Remove Role Confirmation Dialog */}
              <AlertDialog open={!!removeRoleConfirm} onOpenChange={(open) => !open && setRemoveRoleConfirm(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Remove Role Profile
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove the <strong className="capitalize">{removeRoleConfirm?.role}</strong> profile? 
                      This will revoke their {removeRoleConfirm?.role} access and delete any team memberships associated with that profile.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (removeRoleConfirm) {
                          removeRole.mutate({ userId: removeRoleConfirm.userId });
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="button-confirm-remove-role"
                    >
                      {removeRole.isPending ? "Removing..." : "Remove Role"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {deleteConfirmUser?.role === 'parent' ? 'Delete Parent Account' : 'Delete Profile'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {deleteConfirmUser?.role === 'parent' ? (
                  <>
                    <p className="text-sm text-gray-700 font-medium">
                      Deleting this parent account will permanently remove the account and ALL associated profiles:
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                      <p className="text-sm font-medium text-red-800">
                        {deleteConfirmUser?.firstName} {deleteConfirmUser?.lastName} (Parent)
                      </p>
                      {users
                        .filter((u: any) => u.accountHolderId === deleteConfirmUser?.id || 
                          (u.email?.toLowerCase() === deleteConfirmUser?.email?.toLowerCase() && u.id !== deleteConfirmUser?.id))
                        .map((child: any) => (
                          <p key={child.id} className="text-sm text-red-700 pl-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            {child.firstName} {child.lastName} ({child.role})
                          </p>
                        ))
                      }
                    </div>
                    <p className="text-sm text-red-600 font-medium">
                      This will delete all enrollments, payments, waivers, team memberships, and awards for these profiles. This action cannot be undone.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete the profile for <strong>{deleteConfirmUser?.firstName} {deleteConfirmUser?.lastName}</strong> ({deleteConfirmUser?.role})? 
                    This will remove their enrollments, team memberships, and awards. This action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                const isParent = deleteConfirmUser?.role === 'parent';
                deleteUser.mutate({ id: deleteConfirmUser.id, profileOnly: !isParent });
                setDeleteConfirmUser(null);
              }}
            >
              {deleteConfirmUser?.role === 'parent' ? 'Delete Account & All Profiles' : 'Delete Profile'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Teams Tab - Full Implementation
function TeamsTab({ teams, users, divisions, programs, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<any>(null);
  const [teamRoster, setTeamRoster] = useState<string[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const tableRef = useDragScroll();

  const coaches = users.filter((u: any) => u.role === "coach");
  const players = users.filter((u: any) => u.role === "player");
  
  // Fetch team roster when editing begins
  useEffect(() => {
    if (editingTeam?.id) {
      setRosterLoading(true);
      // Get players assigned to this team from users data
      const assignedPlayers = users.filter((u: any) => {
        if (u.role !== 'player') return false;
        const userTeamIds = Array.isArray(u.teamIds) ? u.teamIds : u.teamId ? [u.teamId] : [];
        return userTeamIds.includes(editingTeam.id);
      }).map((u: any) => u.id);
      setTeamRoster(assignedPlayers);
      setRosterLoading(false);
    } else {
      setTeamRoster([]);
    }
  }, [editingTeam?.id, users]);

  const form = useForm<any>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      programId: "",
      programType: "",
      divisionId: undefined as number | undefined,
      coachId: "",
      headCoachIds: [] as string[],
      assistantCoachIds: [] as string[],
      season: "",
      organization: "",
      location: "",
      scheduleLink: "",
      rosterSize: 0,
      active: true,
      notes: "",
    },
  });

  const createTeam = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/teams", { 
        ...data, 
        organizationId: organization.id,
        coachId: data.headCoachIds?.[0] || data.coachId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create team", variant: "destructive" });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/teams/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const payload = { ...data };
      if (payload.headCoachIds?.length) {
        payload.coachId = payload.headCoachIds[0];
      }
      return await apiRequest("PATCH", `/api/teams/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team updated successfully" });
      setEditingTeam(null);
    },
    onError: () => {
      toast({ title: "Failed to update team", variant: "destructive" });
    },
  });
  
  // Update roster assignments mutation
  const updateRoster = useMutation({
    mutationFn: async ({ teamId, playerIds }: { teamId: number; playerIds: string[] }) => {
      // Get current roster
      const currentRoster = users.filter((u: any) => {
        if (u.role !== 'player') return false;
        const userTeamIds = Array.isArray(u.teamIds) ? u.teamIds : u.teamId ? [u.teamId] : [];
        return userTeamIds.includes(teamId);
      }).map((u: any) => u.id);
      
      // Find players to add and remove
      const toAdd = playerIds.filter(id => !currentRoster.includes(id));
      const toRemove = currentRoster.filter((id: string) => !playerIds.includes(id));
      
      // Add new players
      for (const playerId of toAdd) {
        const player = users.find((u: any) => u.id === playerId);
        if (player) {
          const currentTeamIds = Array.isArray(player.teamIds) ? player.teamIds : player.teamId ? [player.teamId] : [];
          await apiRequest("PATCH", `/api/users/${playerId}`, {
            teamIds: [...currentTeamIds, teamId],
            teamId: currentTeamIds[0] || teamId
          });
        }
      }
      
      // Remove players
      for (const playerId of toRemove) {
        const player = users.find((u: any) => u.id === playerId);
        if (player) {
          const currentTeamIds = Array.isArray(player.teamIds) ? player.teamIds : player.teamId ? [player.teamId] : [];
          const newTeamIds = currentTeamIds.filter((id: number) => id !== teamId);
          await apiRequest("PATCH", `/api/users/${playerId}`, {
            teamIds: newTeamIds,
            teamId: newTeamIds[0] || null
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Roster updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update roster", variant: "destructive" });
    },
  });

  const downloadTeamTemplate = () => {
    const csvContent = "Team Name,Division,Age Group,Coach Email\nThunder U12,Recreational,U12,coach@example.com\nLightning U14,Competitive,U14,coach2@example.com\nStorm U16,Competitive,U16,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} teams from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const teamData: any = {};
        
        headers.forEach((header, index) => {
          teamData[header] = values[index] || '';
        });
        
        // Map CSV column names to our data model
        const teamName = teamData['team name'] || teamData['name'] || '';
        const division = teamData['division'] || '';
        const ageGroup = teamData['age group'] || teamData['agegroup'] || '';
        const coachEmail = teamData['coach email'] || teamData['coachemail'] || '';
        
        // Find coach by email if provided
        let coachId = undefined;
        if (coachEmail) {
          const coach = coaches.find((c: any) => c.email === coachEmail);
          if (coach) {
            coachId = coach.id;
          }
        }
        
        try {
          await apiRequest("POST", "/api/teams", {
            organizationId: organization.id,
            name: teamName,
            division: division || undefined,
            ageGroup: ageGroup || undefined,
            coachIds: coachId ? [coachId] : [],
            color: "#1E40AF",
            roster: []
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create team ${teamName}:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} teams. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Create teams, manage rosters, and assign coaches</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-upload-teams" className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Teams</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Upload a CSV file with columns: Team Name, Division, Age Group, Coach Email</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUpload}
                    data-testid="input-team-csv-upload"
                  />
                  <Button variant="outline" className="w-full" onClick={downloadTeamTemplate} data-testid="button-download-team-template">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-team" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createTeam.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="High School Black" data-testid="input-team-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="programId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-team-program">
                                <SelectValue placeholder="Select a program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(programs || []).map((program: any) => (
                                <SelectItem key={program.id} value={program.id}>
                                  {program.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Teams belong to a program</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="division"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., U10, U12, Varsity"
                              data-testid="input-team-division"
                            />
                          </FormControl>
                          <FormDescription>Optional age division</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="headCoachIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Head Coach(es)</FormLabel>
                          <FormDescription>Select one or more head coaches</FormDescription>
                          <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" data-testid="checkbox-group-head-coaches">
                            {coaches.length === 0 ? (
                              <p className="text-sm text-gray-500">No coaches available</p>
                            ) : (
                              coaches.map((coach: any) => {
                                const currentValue = field.value || [];
                                const isChecked = Array.isArray(currentValue) && currentValue.includes(coach.id);
                                return (
                                  <div key={coach.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...currentValue, coach.id]);
                                        } else {
                                          field.onChange(currentValue.filter((id: string) => id !== coach.id));
                                        }
                                      }}
                                      data-testid={`checkbox-head-coach-${coach.id}`}
                                    />
                                    <Label className="text-sm font-normal cursor-pointer">
                                      {coach.firstName} {coach.lastName}
                                    </Label>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assistantCoachIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assistant Coaches</FormLabel>
                          <FormDescription>Select assistant coaches for this team</FormDescription>
                          <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" data-testid="checkbox-group-assistant-coaches">
                            {coaches.length === 0 ? (
                              <p className="text-sm text-gray-500">No coaches available</p>
                            ) : (
                              coaches.map((coach: any) => {
                                const currentValue = field.value || [];
                                const isChecked = Array.isArray(currentValue) && currentValue.includes(coach.id);
                                return (
                                  <div key={coach.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...currentValue, coach.id]);
                                        } else {
                                          field.onChange(currentValue.filter((id: string) => id !== coach.id));
                                        }
                                      }}
                                      data-testid={`checkbox-assistant-coach-${coach.id}`}
                                    />
                                    <Label className="text-sm font-normal cursor-pointer">
                                      {coach.firstName} {coach.lastName}
                                    </Label>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="season"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Season</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Winter 2025" data-testid="input-team-season" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Club/Brand</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Basketball Academy" data-testid="input-team-organization" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Main Gym" data-testid="input-team-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduleLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule Link</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://..." data-testid="input-team-schedule-link" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rosterSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roster Size</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="0" 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-team-roster-size" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Is this team currently active?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-team-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Internal team notes..." rows={3} data-testid="input-team-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={createTeam.isPending} data-testid="button-submit-team">
                      {createTeam.isPending ? "Creating..." : "Create Team"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Edit Team Dialog */}
            <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
              <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                </DialogHeader>
                {editingTeam && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-name">Team Name *</Label>
                      <Input
                        id="edit-team-name"
                        value={editingTeam.name || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})}
                        data-testid="input-edit-team-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-program-type">Program Type</Label>
                      <Select
                        value={editingTeam.programType || "none"}
                        onValueChange={(value) => setEditingTeam({...editingTeam, programType: value === "none" ? null : value})}
                      >
                        <SelectTrigger id="edit-team-program-type" data-testid="select-edit-team-program-type">
                          <SelectValue placeholder="Select program type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Team">Team</SelectItem>
                          <SelectItem value="Skills">Skills</SelectItem>
                          <SelectItem value="FNH">FNH</SelectItem>
                          <SelectItem value="Camp">Camp</SelectItem>
                          <SelectItem value="Training">Training</SelectItem>
                          <SelectItem value="Special">Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-division">Division</Label>
                      <Input
                        id="edit-team-division"
                        value={editingTeam.division || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, division: e.target.value})}
                        placeholder="e.g., U10, U12, Varsity"
                        data-testid="input-edit-team-division"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Head Coach(es)</Label>
                      <p className="text-xs text-gray-500">Select one or more head coaches</p>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" data-testid="checkbox-group-edit-head-coaches">
                        {coaches.length === 0 ? (
                          <p className="text-sm text-gray-500">No coaches available</p>
                        ) : (
                          coaches.map((coach: any) => {
                            const headIds = editingTeam.headCoachIds || (editingTeam.coachId ? [editingTeam.coachId] : []);
                            return (
                              <div key={coach.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={headIds.includes(coach.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setEditingTeam({...editingTeam, headCoachIds: [...headIds, coach.id], coachId: headIds[0] || coach.id});
                                    } else {
                                      const newIds = headIds.filter((id: string) => id !== coach.id);
                                      setEditingTeam({...editingTeam, headCoachIds: newIds, coachId: newIds[0] || null});
                                    }
                                  }}
                                  data-testid={`checkbox-edit-head-coach-${coach.id}`}
                                />
                                <Label className="text-sm font-normal cursor-pointer">
                                  {coach.firstName} {coach.lastName}
                                </Label>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Assistant Coaches</Label>
                      <p className="text-xs text-gray-500">Select assistant coaches for this team</p>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" data-testid="checkbox-group-edit-assistant-coaches">
                        {coaches.length === 0 ? (
                          <p className="text-sm text-gray-500">No coaches available</p>
                        ) : (
                          coaches.map((coach: any) => (
                            <div key={coach.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={(editingTeam.assistantCoachIds || []).includes(coach.id)}
                                onCheckedChange={(checked) => {
                                  const currentValue = editingTeam.assistantCoachIds || [];
                                  if (checked) {
                                    setEditingTeam({...editingTeam, assistantCoachIds: [...currentValue, coach.id]});
                                  } else {
                                    setEditingTeam({...editingTeam, assistantCoachIds: currentValue.filter((id: string) => id !== coach.id)});
                                  }
                                }}
                                data-testid={`checkbox-edit-assistant-coach-${coach.id}`}
                              />
                              <Label className="text-sm font-normal cursor-pointer">
                                {coach.firstName} {coach.lastName}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-team-season">Season</Label>
                        <Input
                          id="edit-team-season"
                          value={editingTeam.season || ""}
                          onChange={(e) => setEditingTeam({...editingTeam, season: e.target.value})}
                          placeholder="Winter 2025"
                          data-testid="input-edit-team-season"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-team-organization">Club/Brand</Label>
                        <Input
                          id="edit-team-organization"
                          value={editingTeam.organization || ""}
                          onChange={(e) => setEditingTeam({...editingTeam, organization: e.target.value})}
                          placeholder="Basketball Academy"
                          data-testid="input-edit-team-organization"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-location">Facility Location</Label>
                      <Input
                        id="edit-team-location"
                        value={editingTeam.location || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, location: e.target.value})}
                        placeholder="Main Gym"
                        data-testid="input-edit-team-location"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-schedule-link">Schedule Link</Label>
                      <Input
                        id="edit-team-schedule-link"
                        value={editingTeam.scheduleLink || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, scheduleLink: e.target.value})}
                        type="url"
                        placeholder="https://..."
                        data-testid="input-edit-team-schedule-link"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-roster-size">Roster Size</Label>
                      <Input
                        id="edit-team-roster-size"
                        value={editingTeam.rosterSize || 0}
                        onChange={(e) => setEditingTeam({...editingTeam, rosterSize: parseInt(e.target.value) || 0})}
                        type="number"
                        placeholder="0"
                        data-testid="input-edit-team-roster-size"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Active</Label>
                        <p className="text-sm text-gray-500">Is this team currently active?</p>
                      </div>
                      <Switch
                        checked={editingTeam.active !== false}
                        onCheckedChange={(checked) => setEditingTeam({...editingTeam, active: checked})}
                        data-testid="switch-edit-team-active"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-notes">Notes</Label>
                      <Textarea
                        id="edit-team-notes"
                        value={editingTeam.notes || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, notes: e.target.value})}
                        placeholder="Internal team notes..."
                        rows={3}
                        data-testid="input-edit-team-notes"
                      />
                    </div>

                    {/* Roster Management Section */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label>Team Roster ({teamRoster.length} players)</Label>
                        {updateRoster.isPending && (
                          <span className="text-xs text-blue-600">Saving roster...</span>
                        )}
                      </div>
                      {rosterLoading ? (
                        <div className="border rounded-md p-4 text-center text-gray-500">
                          Loading roster...
                        </div>
                      ) : (
                        <div className="border rounded-md max-h-64 overflow-y-auto" data-testid="edit-team-roster">
                          {/* Current Roster */}
                          {teamRoster.length > 0 && (
                            <div className="p-2 border-b bg-blue-50">
                              <p className="text-xs font-semibold text-blue-700 mb-2">Currently Assigned:</p>
                              <div className="flex flex-wrap gap-1">
                                {teamRoster.map(playerId => {
                                  const player = players.find((p: any) => p.id === playerId);
                                  return player ? (
                                    <div key={playerId} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                      <span>{player.firstName} {player.lastName}</span>
                                      <button
                                        type="button"
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                        onClick={() => setTeamRoster(teamRoster.filter(id => id !== playerId))}
                                        data-testid={`button-remove-roster-${playerId}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Available Players */}
                          <div className="p-2 space-y-1">
                            <p className="text-xs font-semibold text-gray-500 mb-2">Add Players:</p>
                            {players.length === 0 ? (
                              <p className="text-sm text-gray-500">No players available</p>
                            ) : (
                              players.map((player: any) => {
                                const isOnRoster = teamRoster.includes(player.id);
                                return (
                                  <div key={player.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isOnRoster}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setTeamRoster([...teamRoster, player.id]);
                                        } else {
                                          setTeamRoster(teamRoster.filter(id => id !== player.id));
                                        }
                                      }}
                                      data-testid={`checkbox-roster-${player.id}`}
                                    />
                                    <label className={`text-sm cursor-pointer ${isOnRoster ? 'text-blue-700 font-medium' : ''}`}>
                                      {player.firstName} {player.lastName}
                                      {player.division && <span className="text-gray-400 ml-1">({player.division})</span>}
                                    </label>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={async () => {
                          await updateTeam.mutateAsync(editingTeam);
                          await updateRoster.mutateAsync({ teamId: editingTeam.id, playerIds: teamRoster });
                        }}
                        disabled={updateTeam.isPending || updateRoster.isPending}
                        data-testid="button-submit-edit-team"
                      >
                        {updateTeam.isPending || updateRoster.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={tableRef} className="overflow-x-auto hide-scrollbar drag-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Coaches</TableHead>
                  <TableHead>Roster</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team: any) => {
                  const coach = users.find((u: any) => u.id === team.coachId);
                  const division = (divisions || []).find((d: any) => d.id === team.divisionId);
                  const program = (programs || []).find((p: any) => p.id === team.programId);
                  return (
                    <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                      <TableCell className="font-medium" data-testid={`text-team-name-${team.id}`}>
                        {team.name}
                      </TableCell>
                      <TableCell data-testid={`text-program-${team.id}`}>
                        {program ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {program.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">No program</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-division-${team.id}`}>
                        {division?.name || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-coach-${team.id}`}>
                        {(() => {
                          const headIds = team.headCoachIds?.length ? team.headCoachIds : (team.coachId ? [team.coachId] : []);
                          const assistantIds = team.assistantCoachIds || [];
                          const allCoachIds = [...new Set([...headIds, ...assistantIds])];
                          if (allCoachIds.length === 0) return <span className="text-gray-400">Unassigned</span>;
                          return (
                            <div className="space-y-1">
                              {headIds.map((id: string) => {
                                const c = users.find((u: any) => u.id === id);
                                return c ? (
                                  <div key={id} className="flex items-center gap-1">
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1">HC</Badge>
                                    <span className="text-xs">{c.firstName} {c.lastName}</span>
                                  </div>
                                ) : null;
                              })}
                              {assistantIds.filter((id: string) => !headIds.includes(id)).map((id: string) => {
                                const c = users.find((u: any) => u.id === id);
                                return c ? (
                                  <div key={id} className="flex items-center gap-1">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1">AC</Badge>
                                    <span className="text-xs">{c.firstName} {c.lastName}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell data-testid={`text-roster-${team.id}`}>
                        {team.rosterCount || 0}
                      </TableCell>
                      <TableCell data-testid={`status-active-${team.id}`}>
                        <Badge 
                          variant={team.active ? "default" : "secondary"}
                          className={team.active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}
                        >
                          {team.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedTeam(team)}
                            data-testid={`button-view-roster-${team.id}`}
                            title="View/Manage Roster"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingTeam(team)}
                            data-testid={`button-edit-team-${team.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDeleteConfirmTeam(team)}
                            data-testid={`button-delete-team-${team.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Roster Management Dialog */}
      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => { setSelectedTeam(null); setRosterSearch(''); }}>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Roster - {selectedTeam.name}</DialogTitle>
              <CardDescription>
                Select or deselect players to add or remove them from this team
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Coaching Staff Summary */}
              <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                <p className="text-sm font-medium text-gray-700">Coaching Staff</p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const headIds = selectedTeam.headCoachIds?.length ? selectedTeam.headCoachIds : (selectedTeam.coachId ? [selectedTeam.coachId] : []);
                    const assistantIds = selectedTeam.assistantCoachIds || [];
                    if (headIds.length === 0 && assistantIds.length === 0) {
                      return <span className="text-xs text-gray-400">No coaches assigned</span>;
                    }
                    return (
                      <>
                        {headIds.map((id: string) => {
                          const c = users.find((u: any) => u.id === id);
                          return c ? (
                            <Badge key={id} className="bg-red-100 text-red-700 border-red-200">
                              HC: {c.firstName} {c.lastName}
                            </Badge>
                          ) : null;
                        })}
                        {assistantIds.filter((id: string) => !headIds.includes(id)).map((id: string) => {
                          const c = users.find((u: any) => u.id === id);
                          return c ? (
                            <Badge key={id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              AC: {c.firstName} {c.lastName}
                            </Badge>
                          ) : null;
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Search */}
              <Input
                placeholder="Search players by name..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                data-testid="input-roster-search"
              />

              {/* Current Roster */}
              {(() => {
                const rosterPlayers = players.filter((p: any) => {
                  const userTeamIds = Array.isArray(p.teamIds) ? p.teamIds : p.teamId ? [p.teamId] : [];
                  return userTeamIds.includes(selectedTeam.id) || p.teamId === selectedTeam.id;
                });
                return rosterPlayers.length > 0 ? (
                  <div className="border rounded-lg p-3 bg-green-50">
                    <p className="text-xs font-semibold text-green-700 mb-2">Current Roster ({rosterPlayers.length} players)</p>
                    <div className="flex flex-wrap gap-1">
                      {rosterPlayers.map((player: any) => (
                        <div key={player.id} className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          <span>{player.firstName} {player.lastName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="max-h-72 overflow-y-auto border rounded-lg">
                {players.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No players available</p>
                ) : (
                  (() => {
                    const filteredPlayers = rosterSearch.trim()
                      ? players.filter((p: any) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(rosterSearch.toLowerCase()))
                      : players;
                    return filteredPlayers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No players match your search</p>
                    ) : (
                      filteredPlayers.map((player: any) => {
                        const userTeamIds = Array.isArray(player.teamIds) ? player.teamIds : player.teamId ? [player.teamId] : [];
                        const isOnTeam = userTeamIds.includes(selectedTeam.id) || player.teamId === selectedTeam.id;
                        return (
                          <div 
                            key={player.id} 
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0 ${isOnTeam ? 'bg-green-50' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={isOnTeam}
                                onCheckedChange={async (checked) => {
                                  try {
                                    if (checked) {
                                      await apiRequest("POST", `/api/teams/${selectedTeam.id}/assign-player`, {
                                        playerId: player.id
                                      });
                                    } else {
                                      await apiRequest("POST", `/api/teams/${selectedTeam.id}/remove-player`, {
                                        playerId: player.id
                                      });
                                    }
                                    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/users", player.id, "team"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/users", player.id, "teams"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/users", player.id, "program-memberships"] });
                                    queryClient.invalidateQueries({ queryKey: [`/api/profile/${player.id}`] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/profile", player.id] });
                                    toast({ 
                                      title: checked 
                                        ? `Added ${player.firstName} ${player.lastName} to ${selectedTeam.name}`
                                        : `Removed ${player.firstName} ${player.lastName} from ${selectedTeam.name}`
                                    });
                                  } catch (error) {
                                    toast({ 
                                      title: "Failed to update player assignment",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                data-testid={`checkbox-player-${player.id}`}
                              />
                              <div>
                                <p className={`text-sm ${isOnTeam ? 'font-medium text-green-700' : ''}`}>{player.firstName} {player.lastName}</p>
                                {player.email && <p className="text-xs text-gray-400">{player.email}</p>}
                                {player.teamId && player.teamId !== selectedTeam.id && (
                                  <p className="text-xs text-gray-500">
                                    Also on: {teams.find((t: any) => t.id === player.teamId)?.name || "Unknown Team"}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isOnTeam && (
                              <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                                On Team
                              </Badge>
                            )}
                          </div>
                        );
                      })
                    );
                  })()
                )}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Roster Count:</strong> {players.filter((p: any) => {
                  const userTeamIds = Array.isArray(p.teamIds) ? p.teamIds : p.teamId ? [p.teamId] : [];
                  return userTeamIds.includes(selectedTeam.id) || p.teamId === selectedTeam.id;
                }).length} players
                {selectedTeam.rosterSize > 0 && <span className="text-gray-400"> / {selectedTeam.rosterSize} max</span>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmTeam} onOpenChange={(open) => !open && setDeleteConfirmTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTeam?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteTeam.mutate(deleteConfirmTeam.id);
                setDeleteConfirmTeam(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Events Tab - Full Implementation with Calendar and List View
function EventsTab({ events, teams, programs, organization, currentUser, users }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [eventsPage, setEventsPage] = useState(1);
  const EVENTS_PAGE_SIZE = 50;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<any>(null);
  const [eventWindows, setEventWindows] = useState<Partial<EventWindow>[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]); // 0=Sun, 1=Mon, ..., 6=Sat
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date'>('count');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [playerRsvpEnabled, setPlayerRsvpEnabled] = useState(true);
  const [eventTimezone, setEventTimezone] = useState(() => {
    const browserTz = getBrowserTimezone();
    const match = TIMEZONE_OPTIONS.find(tz => tz.value === browserTz);
    return match ? browserTz : 'America/Los_Angeles';
  });
  const [locationType, setLocationType] = useState<'physical' | 'online'>('physical');
  const [editLocationType, setEditLocationType] = useState<'physical' | 'online'>('physical');
  const [editEventWindows, setEditEventWindows] = useState<Partial<EventWindow>[]>([]);
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurrenceFrequency, setEditRecurrenceFrequency] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [editRecurrenceCount, setEditRecurrenceCount] = useState(4);
  const [editRecurrenceDays, setEditRecurrenceDays] = useState<number[]>([]);
  const [editRecurrenceEndType, setEditRecurrenceEndType] = useState<'count' | 'date'>('count');
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState<string>('');
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  
  // Multi-select state for event targeting
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<any>(null);
  const [eventSortField, setEventSortField] = useState<string | null>(null);
  const [eventSortDirection, setEventSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleEventSort = (field: string) => {
    if (eventSortField === field) {
      setEventSortDirection(eventSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setEventSortField(field);
      setEventSortDirection('asc');
    }
  };

  const bulkDeleteEvents = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/events/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      const count = selectedEventIds.size;
      setSelectedEventIds(new Set());
      toast({ title: `${count} event(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some events", variant: "destructive" });
    },
  });

  const toggleEventSelection = (eventId: number) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleAllEvents = (eventIds: number[]) => {
    if (selectedEventIds.size === eventIds.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(eventIds));
    }
  };

  // Fetch users and divisions for the multi-select
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: divisions = [] } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
  });

  // Fetch participants for the selected event
  const { data: eventParticipants = [] } = useQuery<any[]>({
    queryKey: ['/api/events', selectedEventForDetails?.id, 'participants'],
    enabled: !!selectedEventForDetails,
  });


  const createEventSchema = z.object({
    title: z.string().min(1, "Event title is required"),
    type: z.enum(["game", "tournament", "camp", "exhibition", "practice", "skills", "workshop", "talk", "combine", "training", "meeting", "course", "tryout", "skills-assessment", "team-building", "parent-meeting", "equipment-pickup", "photo-day", "award-ceremony", "fnh"]),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().min(1, "Location is required"),
    meetingLink: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    description: z.string().optional(),
    targetType: z.enum(["all", "user", "team", "division", "program", "role"]),
  });

  const form = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      type: "practice" as const,
      startTime: "",
      endTime: "",
      location: "",
      meetingLink: "",
      latitude: undefined,
      longitude: undefined,
      description: "",
      targetType: "all" as const,
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      // Rename 'type' to 'eventType' for backend compatibility
      const { type, targetType, ...rest } = data;
      
      // Build assignTo object based on targetType and selections
      let assignTo: any = {};
      let visibility: any = {};
      
      if (targetType === 'all') {
        assignTo = { roles: ['player', 'coach', 'parent', 'admin'] };
        visibility = { roles: ['player', 'coach', 'parent', 'admin'] };
      } else if (targetType === 'user') {
        if (selectedUsers.length === 0) {
          toast({ title: "Select Users", description: "Please select at least one user.", variant: "destructive" });
          return;
        }
        assignTo = { users: selectedUsers };
        visibility = { users: selectedUsers };
      } else if (targetType === 'team') {
        if (selectedTeams.length === 0) {
          toast({ title: "Select Teams", description: "Please select at least one team.", variant: "destructive" });
          return;
        }
        assignTo = { teams: selectedTeams.map(String) };
        visibility = { teams: selectedTeams.map(String) };
      } else if (targetType === 'division') {
        if (selectedDivisions.length === 0) {
          toast({ title: "Select Divisions", description: "Please select at least one division.", variant: "destructive" });
          return;
        }
        assignTo = { divisions: selectedDivisions.map(String) };
        visibility = { divisions: selectedDivisions.map(String) };
      } else if (targetType === 'program') {
        if (selectedPrograms.length === 0) {
          toast({ title: "Select Programs", description: "Please select at least one program.", variant: "destructive" });
          return;
        }
        assignTo = { programs: selectedPrograms.map(String) };
        visibility = { programs: selectedPrograms.map(String) };
      } else if (targetType === 'role') {
        if (selectedRoles.length === 0) {
          toast({ title: "Select Roles", description: "Please select at least one role.", variant: "destructive" });
          return;
        }
        assignTo = { roles: selectedRoles };
        visibility = { roles: selectedRoles };
      }
      
      console.log('Event form data before submission:', { type, targetType, assignTo, ...rest });
      const utcStartTime = localDatetimeToUTC(rest.startTime, eventTimezone);
      const utcEndTime = localDatetimeToUTC(rest.endTime, eventTimezone);
      const basePayload = {
        ...rest,
        startTime: utcStartTime,
        endTime: utcEndTime,
        eventType: type,
        organizationId: organization.id,
        assignTo,
        visibility,
        playerRsvpEnabled,
        timezone: eventTimezone,
      };
      console.log('Event API payload:', basePayload);
      
      const eventsToCreate: any[] = [];

      const naiveStart = rest.startTime || '';
      const naiveEnd = rest.endTime || '';
      
      if (!naiveStart.includes('T') || !naiveEnd.includes('T')) {
        toast({ title: "Please set both start and end times", variant: "destructive" });
        return;
      }
      
      const [startDatePart, startTimePart] = naiveStart.split('T');
      const [, endTimePart] = naiveEnd.split('T');
      const [startHour, startMinute] = startTimePart.split(':').map(Number);
      const [endHour, endMinute] = endTimePart.split(':').map(Number);
      const [sYear, sMonth, sDay] = startDatePart.split('-').map(Number);

      let durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      if (durationMinutes <= 0) durationMinutes += 24 * 60;
      
      if (isRecurring) {
        if ((recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && recurrenceDays.length === 0) {
          toast({
            title: "Select Days",
            description: "Please select at least one day of the week for recurring events.",
            variant: "destructive",
          });
          return;
        }
        
        if (recurrenceEndType === 'date' && !recurrenceEndDate) {
          toast({
            title: "Select End Date",
            description: "Please select an end date for the recurring events.",
            variant: "destructive",
          });
          return;
        }
        
        let maxEndDate: Date | null = null;
        if (recurrenceEndType === 'date' && recurrenceEndDate) {
          const [year, month, day] = recurrenceEndDate.split('-').map(Number);
          maxEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }
        const maxCount = recurrenceEndType === 'count' ? recurrenceCount : 1000;

        const makeOccurrence = (y: number, m: number, d: number) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          const naiveS = `${y}-${pad(m)}-${pad(d)}T${pad(startHour)}:${pad(startMinute)}`;
          const endDateObj = new Date(y, m - 1, d, startHour, startMinute);
          endDateObj.setMinutes(endDateObj.getMinutes() + durationMinutes);
          const naiveE = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}T${pad(endDateObj.getHours())}:${pad(endDateObj.getMinutes())}`;
          return {
            ...basePayload,
            startTime: localDatetimeToUTC(naiveS, eventTimezone),
            endTime: localDatetimeToUTC(naiveE, eventTimezone),
          };
        };
        
        if ((recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && recurrenceDays.length > 0) {
          const weekInterval = recurrenceFrequency === 'biweekly' ? 2 : 1;
          let curWeekStart = new Date(sYear, sMonth - 1, sDay);
          curWeekStart.setDate(curWeekStart.getDate() - curWeekStart.getDay());
          
          let eventCount = 0;
          const maxIterations = 520;
          let iterations = 0;
          let shouldStop = false;
          
          while (eventCount < maxCount && iterations < maxIterations && !shouldStop) {
            for (const dayOfWeek of recurrenceDays.sort((a, b) => a - b)) {
              if (eventCount >= maxCount) { shouldStop = true; break; }
              
              const eventDate = new Date(curWeekStart);
              eventDate.setDate(curWeekStart.getDate() + dayOfWeek);
              
              const startDateRef = new Date(sYear, sMonth - 1, sDay);
              if (eventDate < startDateRef) continue;
              
              if (maxEndDate && eventDate > maxEndDate) { shouldStop = true; break; }
              
              eventsToCreate.push(makeOccurrence(eventDate.getFullYear(), eventDate.getMonth() + 1, eventDate.getDate()));
              eventCount++;
            }
            
            curWeekStart.setDate(curWeekStart.getDate() + (7 * weekInterval));
            iterations++;
          }
        } else {
          for (let i = 0; i < maxCount; i++) {
            const d = new Date(sYear, sMonth - 1, sDay);
            
            if (recurrenceFrequency === 'daily') {
              d.setDate(d.getDate() + i);
            } else if (recurrenceFrequency === 'weekly') {
              d.setDate(d.getDate() + (i * 7));
            } else if (recurrenceFrequency === 'biweekly') {
              d.setDate(d.getDate() + (i * 14));
            } else if (recurrenceFrequency === 'monthly') {
              d.setMonth(d.getMonth() + i);
            }
            
            if (maxEndDate && d > maxEndDate) break;
            
            eventsToCreate.push(makeOccurrence(d.getFullYear(), d.getMonth() + 1, d.getDate()));
          }
        }
      } else {
        eventsToCreate.push(basePayload);
      }
      
      // Check if events were truncated by the safety cap (only relevant for date-based end)
      // For count-based: creating exactly the requested count is expected, not a limit issue
      const wasTruncated = isRecurring && recurrenceEndType === 'date' && eventsToCreate.length >= 1000;
      
      // Create all events with error tracking
      const createdEvents: any[] = [];
      const errors: string[] = [];
      for (const eventPayload of eventsToCreate) {
        try {
          const newEvent = await apiRequest("POST", "/api/events", eventPayload);
          createdEvents.push(newEvent);
          
          // Create event windows if configured (for each event)
          if (eventWindows.length > 0) {
            for (const window of eventWindows) {
              try {
                await apiRequest("POST", "/api/event-windows", {
                  ...window,
                  eventId: parseInt(newEvent.id),
                });
              } catch (windowErr: any) {
                console.error('Failed to create event window:', windowErr);
              }
            }
          }
        } catch (err: any) {
          console.error('Failed to create event:', err);
          errors.push(err.message || 'Unknown error');
        }
      }
      
      if (createdEvents.length === 0 && errors.length > 0) {
        throw new Error(`Failed to create events: ${errors[0]}`);
      }
      
      return { events: createdEvents, wasTruncated, count: createdEvents.length, totalAttempted: eventsToCreate.length, errors };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      const count = data?.count || 1;
      const totalAttempted = data?.totalAttempted || count;
      const wasTruncated = data?.wasTruncated;
      const errors = data?.errors || [];
      
      if (wasTruncated) {
        toast({ 
          title: `${count} events created (date range limit reached)`, 
          description: "The maximum of 1000 events was reached. Consider using a shorter date range.",
          variant: "destructive" 
        });
      } else if (errors.length > 0 && count > 0) {
        toast({ 
          title: `${count} of ${totalAttempted} events created`, 
          description: `Some events failed to create: ${errors[0]}`,
          variant: "destructive" 
        });
      } else {
        toast({ title: count > 1 ? `${count} events created successfully` : "Event created successfully" });
      }
      
      setIsDialogOpen(false);
      form.reset();
      setEventWindows([]);
      setSelectedUsers([]);
      setSelectedTeams([]);
      setSelectedDivisions([]);
      setSelectedPrograms([]);
      setSelectedRoles([]);
      setLocationType('physical');
      setIsRecurring(false);
      setRecurrenceFrequency('weekly');
      setRecurrenceCount(4);
      setRecurrenceDays([]);
      setRecurrenceEndType('count');
      setRecurrenceEndDate('');
      setPlayerRsvpEnabled(true);
      const browserTz = getBrowserTimezone();
      setEventTimezone(TIMEZONE_OPTIONS.find(tz => tz.value === browserTz) ? browserTz : 'America/Los_Angeles');
    },
    onError: (error: any) => {
      console.error('Event creation error:', error);
      toast({ 
        title: "Failed to create event", 
        description: error?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/events/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, targetType, targetId, targetIds, ...data }: any) => {
      const payload: any = { ...data };
      const tz = data.timezone || 'America/Los_Angeles';
      if (payload.startTime && !payload.startTime.includes('Z') && !payload.startTime.match(/[+-]\d{2}:/)) {
        payload.startTime = localDatetimeToUTC(payload.startTime, tz);
      }
      if (payload.endTime && !payload.endTime.includes('Z') && !payload.endTime.match(/[+-]\d{2}:/)) {
        payload.endTime = localDatetimeToUTC(payload.endTime, tz);
      }
      
      // Support both single targetId and array targetIds
      const ids = targetIds?.length > 0 ? targetIds : (targetId ? [String(targetId)] : []);
      
      if (targetType === 'team' && ids.length > 0) {
        payload.assignTo = { teams: ids };
        payload.visibility = { teams: ids };
      } else if (targetType === 'program' && ids.length > 0) {
        payload.assignTo = { programs: ids };
        payload.visibility = { programs: ids };
      } else if (targetType === 'division' && ids.length > 0) {
        payload.assignTo = { divisions: ids };
        payload.visibility = { divisions: ids };
      } else if (targetType === 'user' && ids.length > 0) {
        payload.assignTo = { users: ids };
        payload.visibility = { users: ids };
      } else if (targetType === 'role' && ids.length > 0) {
        payload.assignTo = { roles: ids };
        payload.visibility = { roles: ids };
      } else if (targetType === 'all') {
        payload.assignTo = { roles: ['player', 'coach', 'parent', 'admin'] };
        payload.visibility = { roles: ['player', 'coach', 'parent', 'admin'] };
      }
      
      const updatedEvent = await apiRequest("PATCH", `/api/events/${id}`, payload);
      
      // Update event windows - delete existing and create new ones
      await apiRequest("DELETE", `/api/event-windows/event/${id}`);
      
      if (editEventWindows.length > 0) {
        for (const window of editEventWindows) {
          await apiRequest("POST", "/api/event-windows", {
            ...window,
            eventId: parseInt(id),
          });
        }
      }
      
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event updated successfully" });
      setEditingEvent(null);
      setEditEventWindows([]);
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });
  
  // Load event windows when editing an event
  useEffect(() => {
    if (editingEvent) {
      (async () => {
        try {
          const windows = await apiRequest("GET", `/api/event-windows/event/${editingEvent.id}`);
          setEditEventWindows(windows);
        } catch (error) {
          console.error('Failed to load event windows:', error);
          setEditEventWindows([]);
        }
      })();
    }
  }, [editingEvent]);

  const downloadEventTemplate = () => {
    const csvContent = "Title,Type,Start Time,End Time,Location,Team\nTeam Practice,practice,2025-01-15T10:00,2025-01-15T12:00,Main Gym,Thunder U12\nChampionship Game,game,2025-01-20T18:00,2025-01-20T20:00,Arena Stadium,Varsity";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadEventsData = () => {
    const csvHeaders = "Title,Type,Start Time,End Time,Location,Team";
    const csvRows = events.map((event: any) => {
      const assignedTeams = event.assignTo?.teams || [];
      const teamNames = assignedTeams.map((tid: string) => {
        const team = teams.find((t: any) => String(t.id) === tid);
        return team?.name || "";
      }).join(";");
      return [
        event.title || "",
        event.eventType || event.type || "",
        event.startTime || "",
        event.endTime || "",
        event.location || "",
        teamNames
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} events from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const eventData: any = {};
        
        headers.forEach((header, index) => {
          eventData[header] = values[index] || '';
        });
        
        try {
          await apiRequest("POST", "/api/events", {
            organizationId: organization.id,
            title: eventData['title'] || '',
            type: eventData['type'] || 'practice',
            startTime: eventData['start time'] || eventData['starttime'],
            endTime: eventData['end time'] || eventData['endtime'],
            location: eventData['location'] || '',
            description: eventData['description'] || '',
            targetType: 'all',
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create event:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} events. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between w-full">
          <div>
            <CardTitle>Event Management</CardTitle>
            <CardDescription>Schedule practices, games, and other events</CardDescription>
          </div>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              data-testid="button-view-calendar"
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 justify-end w-full">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-events">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Events</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Type, Start Time, End Time, Location, Team</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-event-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadEventTemplate} data-testid="button-download-event-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadEventsData} data-testid="button-download-events">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Event" data-testid="button-create-event">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  console.log('📍 Creating event with data:', data);
                  // Convert datetime-local strings to ISO strings with timezone
                  const eventData = {
                    ...data,
                    startTime: data.startTime && !data.startTime.endsWith('Z') ? new Date(data.startTime).toISOString() : data.startTime,
                    endTime: data.endTime && !data.endTime.endsWith('Z') ? new Date(data.endTime).toISOString() : data.endTime,
                  };
                  createEvent.mutate(eventData);
                })} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Team Practice" data-testid="input-event-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="game">Game</SelectItem>
                            <SelectItem value="tournament">Tournament</SelectItem>
                            <SelectItem value="camp">Camp</SelectItem>
                            <SelectItem value="exhibition">Exhibition</SelectItem>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="skills">Skills</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="talk">Talk</SelectItem>
                            <SelectItem value="combine">Combine</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="course">Course</SelectItem>
                            <SelectItem value="tryout">Tryout</SelectItem>
                            <SelectItem value="skills-assessment">Skills Assessment</SelectItem>
                            <SelectItem value="team-building">Team Building</SelectItem>
                            <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                            <SelectItem value="equipment-pickup">Equipment Pickup</SelectItem>
                            <SelectItem value="photo-day">Photo Day</SelectItem>
                            <SelectItem value="award-ceremony">Award Ceremony</SelectItem>
                            <SelectItem value="fnh">FNH</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="datetime-local" data-testid="input-event-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="datetime-local" data-testid="input-event-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={eventTimezone} onValueChange={setEventTimezone}>
                      <SelectTrigger data-testid="select-event-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Times will automatically adjust for daylight saving changes
                    </p>
                  </div>
                  
                  {/* Recurring Event Options */}
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="recurring-toggle"
                        checked={isRecurring}
                        onCheckedChange={setIsRecurring}
                        data-testid="switch-recurring"
                      />
                      <Label htmlFor="recurring-toggle" className="font-medium cursor-pointer">
                        Make this a recurring event
                      </Label>
                    </div>
                    
                    {isRecurring && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select
                              value={recurrenceFrequency}
                              onValueChange={(value: 'daily' | 'weekly' | 'biweekly' | 'monthly') => {
                                setRecurrenceFrequency(value);
                                // Clear day selection when switching to non-weekly
                                if (value !== 'weekly' && value !== 'biweekly') {
                                  setRecurrenceDays([]);
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-recurrence-frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Ends</Label>
                            <Select
                              value={recurrenceEndType}
                              onValueChange={(value: 'count' | 'date') => setRecurrenceEndType(value)}
                            >
                              <SelectTrigger data-testid="select-recurrence-end-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="count">After # of events</SelectItem>
                                <SelectItem value="date">On specific date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Day of Week Selection - Only for weekly/biweekly */}
                        {(recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly') && (
                          <div className="space-y-2">
                            <Label>Repeat On</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { day: 0, label: 'Sun' },
                                { day: 1, label: 'Mon' },
                                { day: 2, label: 'Tue' },
                                { day: 3, label: 'Wed' },
                                { day: 4, label: 'Thu' },
                                { day: 5, label: 'Fri' },
                                { day: 6, label: 'Sat' },
                              ].map(({ day, label }) => (
                                <Button
                                  key={day}
                                  type="button"
                                  variant={recurrenceDays.includes(day) ? "default" : "outline"}
                                  size="sm"
                                  className={`w-12 ${recurrenceDays.includes(day) ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                  onClick={() => {
                                    if (recurrenceDays.includes(day)) {
                                      setRecurrenceDays(recurrenceDays.filter(d => d !== day));
                                    } else {
                                      setRecurrenceDays([...recurrenceDays, day]);
                                    }
                                  }}
                                  data-testid={`btn-day-${label.toLowerCase()}`}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">Select which days of the week this event repeats</p>
                          </div>
                        )}
                        
                        {/* End Condition */}
                        {recurrenceEndType === 'count' ? (
                          <div className="space-y-2">
                            <Label>Number of Occurrences</Label>
                            <Select
                              value={String(recurrenceCount)}
                              onValueChange={(value) => setRecurrenceCount(parseInt(value))}
                            >
                              <SelectTrigger data-testid="select-recurrence-count">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 30, 40, 52].map((count) => (
                                  <SelectItem key={count} value={String(count)}>
                                    {count} events
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={recurrenceEndDate}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                              data-testid="input-recurrence-end-date"
                            />
                            <p className="text-xs text-gray-500">Events will be created until this date</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 border-t pt-2">
                          {recurrenceDays.length > 0 ? (
                            <>This will create events every {recurrenceDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} {recurrenceFrequency === 'biweekly' ? 'every 2 weeks' : 'weekly'}{recurrenceEndType === 'count' ? ` (${recurrenceCount} total)` : recurrenceEndDate ? ` until ${new Date(recurrenceEndDate).toLocaleDateString()}` : ''}.</>
                          ) : (
                            <>This will create events {recurrenceFrequency === 'daily' ? 'every day' : recurrenceFrequency === 'weekly' ? 'every week' : recurrenceFrequency === 'biweekly' ? 'every 2 weeks' : 'every month'}{recurrenceEndType === 'count' ? ` (${recurrenceCount} total)` : recurrenceEndDate ? ` until ${new Date(recurrenceEndDate).toLocaleDateString()}` : ''}.</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Player RSVP Toggle */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="player-rsvp-toggle" className="font-medium cursor-pointer">
                          Allow Player Self-RSVP
                        </Label>
                        <p className="text-xs text-gray-500">
                          {playerRsvpEnabled 
                            ? "Players can RSVP to this event themselves" 
                            : "Only parent/guardian can RSVP for players"}
                        </p>
                      </div>
                      <Switch
                        id="player-rsvp-toggle"
                        checked={playerRsvpEnabled}
                        onCheckedChange={setPlayerRsvpEnabled}
                        data-testid="switch-player-rsvp"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <FormLabel>Location <span className="text-red-500">*</span></FormLabel>
                    <div className="flex border rounded-lg overflow-hidden w-fit">
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium transition-colors ${locationType === 'physical' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => {
                          setLocationType('physical');
                          form.setValue("location", "");
                          form.setValue("meetingLink", "");
                          form.setValue("latitude", undefined as any);
                          form.setValue("longitude", undefined as any);
                        }}
                      >
                        Physical
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium transition-colors ${locationType === 'online' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => {
                          setLocationType('online');
                          form.setValue("location", "Online");
                          form.setValue("latitude", undefined as any);
                          form.setValue("longitude", undefined as any);
                        }}
                      >
                        Online
                      </button>
                    </div>

                    {locationType === 'physical' ? (
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <LocationSearch
                                value={field.value || ""}
                                onLocationSelect={(location) => {
                                  field.onChange(location.name);
                                  form.setValue("latitude", location.lat ?? undefined as any);
                                  form.setValue("longitude", location.lng ?? undefined as any);
                                }}
                                placeholder="Search for a location..."
                                className="w-full"
                              />
                            </FormControl>
                            <FormDescription>
                              Search and select a location for accurate check-in geo-fencing
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="meetingLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="https://zoom.us/j/..." data-testid="input-event-meeting-link" />
                            </FormControl>
                            <FormDescription>
                              Paste a Zoom, Google Meet, or other meeting link
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event For</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedUsers([]);
                          setSelectedTeams([]);
                          setSelectedDivisions([]);
                          setSelectedPrograms([]);
                          setSelectedRoles([]);
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-target">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Everyone</SelectItem>
                            <SelectItem value="program">Program(s)</SelectItem>
                            <SelectItem value="team">Team(s)</SelectItem>
                            <SelectItem value="user">Specific User(s)</SelectItem>
                            <SelectItem value="role">Role(s)</SelectItem>
                            <SelectItem value="division">Division(s)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Who should see this event?</FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  {String(form.watch("targetType")) === "user" && (
                    <div className="space-y-2">
                      <Label>Select Users</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {allUsers.filter((u: any) => u.isActive).map((user: any) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {user.firstName} {user.lastName} - {user.role} ({user.email})
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedUsers.length} user(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "team" && (
                    <div className="space-y-2">
                      <Label>Select Teams</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {teams.map((team: any) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedTeams.includes(String(team.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTeams([...selectedTeams, String(team.id)]);
                                } else {
                                  setSelectedTeams(selectedTeams.filter(id => id !== String(team.id)));
                                }
                              }}
                              data-testid={`checkbox-team-${team.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {team.name}{team.programType ? ` (${team.programType})` : ''}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedTeams.length} team(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "division" && (
                    <div className="space-y-2">
                      <Label>Select Divisions</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {divisions.filter((d: any) => d.isActive).map((division: any) => (
                          <div key={division.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedDivisions.includes(String(division.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDivisions([...selectedDivisions, String(division.id)]);
                                } else {
                                  setSelectedDivisions(selectedDivisions.filter(id => id !== String(division.id)));
                                }
                              }}
                              data-testid={`checkbox-division-${division.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {division.name} {division.ageRange ? `(${division.ageRange})` : ''}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedDivisions.length} division(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "program" && (
                    <div className="space-y-2">
                      <Label>Select Programs</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {programs.filter((p: any) => p.isActive && p.productCategory === 'service').map((program: any) => (
                          <div key={program.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedPrograms.includes(String(program.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPrograms([...selectedPrograms, String(program.id)]);
                                } else {
                                  setSelectedPrograms(selectedPrograms.filter(id => id !== String(program.id)));
                                }
                              }}
                              data-testid={`checkbox-program-${program.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {program.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedPrograms.length} program(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "role" && (
                    <div className="space-y-2">
                      <Label>Select Roles</Label>
                      <div className="border rounded-md p-3 space-y-2">
                        {["player", "parent", "coach", "admin"].map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedRoles.includes(role)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoles([...selectedRoles, role]);
                                } else {
                                  setSelectedRoles(selectedRoles.filter(r => r !== role));
                                }
                              }}
                              data-testid={`checkbox-role-${role}`}
                            />
                            <label className="text-sm cursor-pointer capitalize">
                              {role}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedRoles.length} role(s) selected</p>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-event-description" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="border-t pt-4">
                    <EventWindowsConfigurator
                      eventStartTime={form.watch("startTime") ? new Date(form.watch("startTime")) : undefined}
                      windows={eventWindows}
                      onChange={setEventWindows}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={createEvent.isPending || !form.watch("title") || !form.watch("startTime") || !form.watch("endTime") || !form.watch("location")} data-testid="button-submit-event">
                    {createEvent.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Event Dialog */}
          {editingEvent && (
            <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) { setEditingEvent(null); setEditIsRecurring(false); setEditRecurrenceFrequency('weekly'); setEditRecurrenceCount(4); setEditRecurrenceDays([]); setEditRecurrenceEndType('count'); setEditRecurrenceEndDate(''); }}}>
              <DialogContent className="max-w-[95vw] w-full">
                <DialogHeader>
                  <DialogTitle>Edit Event</DialogTitle>
                </DialogHeader>
                {editingEvent && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-title">Event Title</Label>
                    <Input
                      id="edit-event-title"
                      defaultValue={editingEvent.title || ""}
                      onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                      data-testid="input-edit-event-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-type">Event Type</Label>
                    <Select
                      value={editingEvent.type || "practice"}
                      onValueChange={(value) => setEditingEvent({...editingEvent, type: value})}
                    >
                      <SelectTrigger id="edit-event-type" data-testid="select-edit-event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="tournament">Tournament</SelectItem>
                        <SelectItem value="camp">Camp</SelectItem>
                        <SelectItem value="exhibition">Exhibition</SelectItem>
                        <SelectItem value="practice">Practice</SelectItem>
                        <SelectItem value="skills">Skills</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="talk">Talk</SelectItem>
                        <SelectItem value="combine">Combine</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="tryout">Tryout</SelectItem>
                        <SelectItem value="skills-assessment">Skills Assessment</SelectItem>
                        <SelectItem value="team-building">Team Building</SelectItem>
                        <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                        <SelectItem value="equipment-pickup">Equipment Pickup</SelectItem>
                        <SelectItem value="photo-day">Photo Day</SelectItem>
                        <SelectItem value="award-ceremony">Award Ceremony</SelectItem>
                        <SelectItem value="fnh">FNH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-startTime">Start Time</Label>
                      <Input
                        id="edit-event-startTime"
                        type="datetime-local"
                        defaultValue={editingEvent.startTime ? utcToLocalDatetime(
                          typeof editingEvent.startTime === 'string' && editingEvent.startTime.includes('T') ? editingEvent.startTime : new Date(editingEvent.startTime).toISOString(),
                          editingEvent.timezone || 'America/Los_Angeles'
                        ) : ""}
                        onChange={(e) => setEditingEvent({...editingEvent, startTime: e.target.value})}
                        data-testid="input-edit-event-startTime"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-endTime">End Time</Label>
                      <Input
                        id="edit-event-endTime"
                        type="datetime-local"
                        defaultValue={editingEvent.endTime ? utcToLocalDatetime(
                          typeof editingEvent.endTime === 'string' && editingEvent.endTime.includes('T') ? editingEvent.endTime : new Date(editingEvent.endTime).toISOString(),
                          editingEvent.timezone || 'America/Los_Angeles'
                        ) : ""}
                        onChange={(e) => setEditingEvent({...editingEvent, endTime: e.target.value})}
                        data-testid="input-edit-event-endTime"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={editingEvent.timezone || 'America/Los_Angeles'}
                      onValueChange={(value) => setEditingEvent({...editingEvent, timezone: value})}
                    >
                      <SelectTrigger data-testid="select-edit-event-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Times will automatically adjust for daylight saving changes
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label>Location <span className="text-red-500">*</span></Label>
                    <div className="flex border rounded-lg overflow-hidden w-fit">
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium transition-colors ${editLocationType === 'physical' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => {
                          setEditLocationType('physical');
                          setEditingEvent({...editingEvent, location: '', meetingLink: '', latitude: undefined, longitude: undefined});
                        }}
                      >
                        Physical
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 text-sm font-medium transition-colors ${editLocationType === 'online' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        onClick={() => {
                          setEditLocationType('online');
                          setEditingEvent({...editingEvent, location: 'Online', latitude: undefined, longitude: undefined});
                        }}
                      >
                        Online
                      </button>
                    </div>
                    {editLocationType === 'physical' ? (
                      <>
                        <LocationSearch
                          value={editingEvent.location === 'Online' ? '' : (editingEvent.location || "")}
                          onLocationSelect={(location) => {
                            setEditingEvent({
                              ...editingEvent,
                              location: location.name,
                              latitude: location.lat ?? undefined,
                              longitude: location.lng ?? undefined
                            });
                          }}
                          placeholder="Search for a location..."
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500">Search and select a location for accurate check-in geo-fencing</p>
                      </>
                    ) : (
                      <>
                        <Input
                          value={editingEvent.meetingLink || ""}
                          onChange={(e) => setEditingEvent({...editingEvent, meetingLink: e.target.value})}
                          placeholder="https://zoom.us/j/..."
                          data-testid="input-edit-event-meeting-link"
                        />
                        <p className="text-xs text-gray-500">Paste a Zoom, Google Meet, or other meeting link</p>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-targetType">Event For</Label>
                    <Select
                      value={editingEvent.targetType || "all"}
                      onValueChange={(value) => setEditingEvent({...editingEvent, targetType: value})}
                    >
                      <SelectTrigger id="edit-event-targetType" data-testid="select-edit-event-targetType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="program">Specific Program</SelectItem>
                        <SelectItem value="team">Specific Team</SelectItem>
                        <SelectItem value="user">Specific User</SelectItem>
                        <SelectItem value="role">Specific Role</SelectItem>
                        <SelectItem value="division">Specific Division</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingEvent.targetType === "team" && (
                    <div className="space-y-2">
                      <Label>Select Teams</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {teams.map((team: any) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(String(team.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                if (checked) {
                                  setEditingEvent({...editingEvent, targetIds: [...currentIds, String(team.id)]});
                                } else {
                                  setEditingEvent({...editingEvent, targetIds: currentIds.filter((id: string) => id !== String(team.id))});
                                }
                              }}
                              data-testid={`checkbox-edit-team-${team.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {team.name}{team.programType ? ` (${team.programType})` : ''}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{(editingEvent.targetIds || []).length} team(s) selected</p>
                    </div>
                  )}
                  {editingEvent.targetType === "program" && (
                    <div className="space-y-2">
                      <Label>Select Programs</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {programs.filter((p: any) => p.isActive && p.productCategory === 'service').map((program: any) => (
                          <div key={program.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(String(program.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                if (checked) {
                                  setEditingEvent({...editingEvent, targetIds: [...currentIds, String(program.id)]});
                                } else {
                                  setEditingEvent({...editingEvent, targetIds: currentIds.filter((id: string) => id !== String(program.id))});
                                }
                              }}
                              data-testid={`checkbox-edit-program-${program.id}`}
                            />
                            <label className="text-sm cursor-pointer">{program.name}</label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{(editingEvent.targetIds || []).length} program(s) selected</p>
                    </div>
                  )}
                  {editingEvent.targetType === "role" && (
                    <div className="space-y-2">
                      <Label>Select Roles</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {[{id: 'player', name: 'Player'}, {id: 'parent', name: 'Parent'}, {id: 'coach', name: 'Coach'}, {id: 'admin', name: 'Admin'}].map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(role.id)}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                if (checked) {
                                  setEditingEvent({...editingEvent, targetIds: [...currentIds, role.id]});
                                } else {
                                  setEditingEvent({...editingEvent, targetIds: currentIds.filter((id: string) => id !== role.id)});
                                }
                              }}
                              data-testid={`checkbox-edit-role-${role.id}`}
                            />
                            <label className="text-sm cursor-pointer">{role.name}</label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{(editingEvent.targetIds || []).length} role(s) selected</p>
                    </div>
                  )}
                  {editingEvent.targetType === "user" && (
                    <div className="space-y-2">
                      <Label>Select Users</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {allUsers.filter((u: any) => u.isActive).map((user: any) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(String(user.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                if (checked) {
                                  setEditingEvent({...editingEvent, targetIds: [...currentIds, String(user.id)]});
                                } else {
                                  setEditingEvent({...editingEvent, targetIds: currentIds.filter((id: string) => id !== String(user.id))});
                                }
                              }}
                              data-testid={`checkbox-edit-user-${user.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {user.firstName} {user.lastName} ({user.email})
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{(editingEvent.targetIds || []).length} user(s) selected</p>
                    </div>
                  )}
                  {editingEvent.targetType === "division" && (
                    <div className="space-y-2">
                      <Label>Select Divisions</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {divisions.filter((d: any) => d.isActive).map((division: any) => (
                          <div key={division.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(String(division.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                if (checked) {
                                  setEditingEvent({...editingEvent, targetIds: [...currentIds, String(division.id)]});
                                } else {
                                  setEditingEvent({...editingEvent, targetIds: currentIds.filter((id: string) => id !== String(division.id))});
                                }
                              }}
                              data-testid={`checkbox-edit-division-${division.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {division.name} {division.ageRange ? `(${division.ageRange})` : ''}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{(editingEvent.targetIds || []).length} division(s) selected</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-description">Description</Label>
                    <Textarea
                      id="edit-event-description"
                      defaultValue={editingEvent.description || ""}
                      onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                      data-testid="input-edit-event-description"
                    />
                  </div>
                  
                  {/* Player RSVP Toggle */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="edit-player-rsvp-toggle" className="font-medium cursor-pointer">
                          Allow Player Self-RSVP
                        </Label>
                        <p className="text-xs text-gray-500">
                          {editingEvent.playerRsvpEnabled !== false
                            ? "Players can RSVP to this event themselves" 
                            : "Only parent/guardian can RSVP for players"}
                        </p>
                      </div>
                      <Switch
                        id="edit-player-rsvp-toggle"
                        checked={editingEvent.playerRsvpEnabled !== false}
                        onCheckedChange={(checked) => setEditingEvent({...editingEvent, playerRsvpEnabled: checked})}
                        data-testid="switch-edit-player-rsvp"
                      />
                    </div>
                  </div>
                  
                  {/* Recurring Event Options */}
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="edit-recurring-toggle"
                        checked={editIsRecurring}
                        onCheckedChange={setEditIsRecurring}
                        data-testid="switch-edit-recurring"
                      />
                      <Label htmlFor="edit-recurring-toggle" className="font-medium cursor-pointer">
                        Create additional recurring events
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500">
                      {editIsRecurring 
                        ? "This will update the current event AND create additional recurring copies" 
                        : "Enable to generate recurring copies of this event"}
                    </p>
                    
                    {editIsRecurring && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select
                              value={editRecurrenceFrequency}
                              onValueChange={(value: 'daily' | 'weekly' | 'biweekly' | 'monthly') => {
                                setEditRecurrenceFrequency(value);
                                if (value !== 'weekly' && value !== 'biweekly') {
                                  setEditRecurrenceDays([]);
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-edit-recurrence-frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Ends</Label>
                            <Select
                              value={editRecurrenceEndType}
                              onValueChange={(value: 'count' | 'date') => setEditRecurrenceEndType(value)}
                            >
                              <SelectTrigger data-testid="select-edit-recurrence-end-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="count">After # of events</SelectItem>
                                <SelectItem value="date">On specific date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {(editRecurrenceFrequency === 'weekly' || editRecurrenceFrequency === 'biweekly') && (
                          <div className="space-y-2">
                            <Label>Repeat On</Label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { day: 0, label: 'Sun' },
                                { day: 1, label: 'Mon' },
                                { day: 2, label: 'Tue' },
                                { day: 3, label: 'Wed' },
                                { day: 4, label: 'Thu' },
                                { day: 5, label: 'Fri' },
                                { day: 6, label: 'Sat' },
                              ].map(({ day, label }) => (
                                <Button
                                  key={day}
                                  type="button"
                                  variant={editRecurrenceDays.includes(day) ? "default" : "outline"}
                                  size="sm"
                                  className={`w-12 ${editRecurrenceDays.includes(day) ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                  onClick={() => {
                                    if (editRecurrenceDays.includes(day)) {
                                      setEditRecurrenceDays(editRecurrenceDays.filter(d => d !== day));
                                    } else {
                                      setEditRecurrenceDays([...editRecurrenceDays, day]);
                                    }
                                  }}
                                  data-testid={`btn-edit-day-${label.toLowerCase()}`}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">Select which days of the week this event repeats</p>
                          </div>
                        )}
                        
                        {editRecurrenceEndType === 'count' ? (
                          <div className="space-y-2">
                            <Label>Number of Additional Events</Label>
                            <Select
                              value={String(editRecurrenceCount)}
                              onValueChange={(value) => setEditRecurrenceCount(parseInt(value))}
                            >
                              <SelectTrigger data-testid="select-edit-recurrence-count">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 30, 40, 52].map((count) => (
                                  <SelectItem key={count} value={String(count)}>
                                    {count} events
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                              type="date"
                              value={editRecurrenceEndDate}
                              onChange={(e) => setEditRecurrenceEndDate(e.target.value)}
                              data-testid="input-edit-recurrence-end-date"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <EventWindowsConfigurator
                      eventStartTime={editingEvent.startTime ? new Date(editingEvent.startTime) : undefined}
                      windows={editEventWindows}
                      onChange={setEditEventWindows}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    className="w-full"
                    onClick={async () => {
                      if (editIsRecurring) {
                        if ((editRecurrenceFrequency === 'weekly' || editRecurrenceFrequency === 'biweekly') && editRecurrenceDays.length === 0) {
                          toast({ title: "Please select at least one day of the week", variant: "destructive" });
                          return;
                        }
                        if (editRecurrenceEndType === 'date' && !editRecurrenceEndDate) {
                          toast({ title: "Please select an end date for recurring events", variant: "destructive" });
                          return;
                        }
                      }

                      const updatedData = {
                        ...editingEvent,
                        startTime: editingEvent.startTime && !editingEvent.startTime.endsWith('Z') ? new Date(editingEvent.startTime).toISOString() : editingEvent.startTime,
                        endTime: editingEvent.endTime && !editingEvent.endTime.endsWith('Z') ? new Date(editingEvent.endTime).toISOString() : editingEvent.endTime,
                      };
                      
                      try {
                        await updateEvent.mutateAsync(updatedData);
                      } catch (e) {
                        return;
                      }

                      if (editIsRecurring) {
                        const startDate = new Date(updatedData.startTime);
                        const endDate = new Date(updatedData.endTime);
                        const durationMs = endDate.getTime() - startDate.getTime();
                        
                        let endLimit: Date | null = null;
                        if (editRecurrenceEndType === 'date' && editRecurrenceEndDate) {
                          const [year, month, day] = editRecurrenceEndDate.split('-').map(Number);
                          endLimit = new Date(year, month - 1, day, 23, 59, 59);
                        }
                        const maxCount = editRecurrenceEndType === 'count' ? editRecurrenceCount : 1000;
                        
                        const eventsToCreate: any[] = [];
                        let currentStart = new Date(startDate);
                        let count = 0;

                        if ((editRecurrenceFrequency === 'weekly' || editRecurrenceFrequency === 'biweekly') && editRecurrenceDays.length > 0) {
                          const weekInterval = editRecurrenceFrequency === 'biweekly' ? 2 : 1;
                          let weekStart = new Date(currentStart);
                          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                          
                          while (count < maxCount) {
                            if (endLimit && weekStart > endLimit) break;
                            for (const dayOfWeek of editRecurrenceDays.sort((a: number, b: number) => a - b)) {
                              if (count >= maxCount) break;
                              const eventDate = new Date(weekStart);
                              eventDate.setDate(eventDate.getDate() + dayOfWeek);
                              eventDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
                              if (endLimit && eventDate > endLimit) continue;
                              if (eventDate > startDate) {
                                const newEnd = new Date(eventDate.getTime() + durationMs);
                                eventsToCreate.push({ ...updatedData, id: undefined, startTime: eventDate.toISOString(), endTime: newEnd.toISOString() });
                                count++;
                              }
                            }
                            weekStart.setDate(weekStart.getDate() + (7 * weekInterval));
                          }
                        } else {
                          while (count < maxCount) {
                            if (editRecurrenceFrequency === 'daily') {
                              currentStart.setDate(currentStart.getDate() + 1);
                            } else if (editRecurrenceFrequency === 'weekly') {
                              currentStart.setDate(currentStart.getDate() + 7);
                            } else if (editRecurrenceFrequency === 'biweekly') {
                              currentStart.setDate(currentStart.getDate() + 14);
                            } else if (editRecurrenceFrequency === 'monthly') {
                              currentStart.setMonth(currentStart.getMonth() + 1);
                            }
                            if (endLimit && currentStart > endLimit) break;
                            const newEnd = new Date(currentStart.getTime() + durationMs);
                            eventsToCreate.push({ ...updatedData, id: undefined, startTime: new Date(currentStart).toISOString(), endTime: newEnd.toISOString() });
                            count++;
                          }
                        }

                        for (const evt of eventsToCreate) {
                          try {
                            await apiRequest("POST", "/api/events", evt);
                          } catch (e) {
                            console.error('Failed to create recurring event:', e);
                          }
                        }
                        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
                        toast({ title: `Created ${eventsToCreate.length} additional recurring event(s)` });
                        setEditIsRecurring(false);
                        setEditRecurrenceFrequency('weekly');
                        setEditRecurrenceCount(4);
                        setEditRecurrenceDays([]);
                        setEditRecurrenceEndType('count');
                        setEditRecurrenceEndDate('');
                      }
                    }}
                    disabled={updateEvent.isPending || !editingEvent.title?.trim() || !editingEvent.startTime || !editingEvent.endTime || !editingEvent.location?.trim()}
                    data-testid="button-submit-edit-event"
                  >
                    {updateEvent.isPending ? "Updating..." : editIsRecurring ? "Update & Create Recurring" : "Update Event"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          )}

          {/* Event Details Modal */}
          <EventDetailModal
            event={selectedEventForDetails}
            userId={currentUser?.id || ''}
            userRole={currentUser?.role as 'admin' | 'coach' | 'player' | 'parent'}
            open={!!selectedEventForDetails}
            onOpenChange={(open) => !open && setSelectedEventForDetails(null)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {selectedEventIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedEventIds.size} event{selectedEventIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedEventIds.size} event(s)?`)) {
                  bulkDeleteEvents.mutate(Array.from(selectedEventIds));
                }
              }}
              disabled={bulkDeleteEvents.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteEvents.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEventIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        {viewMode === "list" ? (
          <>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-2">
                  <Checkbox 
                    checked={events.length > 0 && selectedEventIds.size === events.length}
                    onCheckedChange={() => toggleAllEvents(events.map((e: any) => e.id))}
                    aria-label="Select all events"
                  />
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap px-2" onClick={() => handleEventSort('title')}>
                  Event {eventSortField === 'title' && (eventSortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap px-2" onClick={() => handleEventSort('type')}>
                  Type {eventSortField === 'type' && (eventSortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap px-2" onClick={() => handleEventSort('startTime')}>
                  Date & Time {eventSortField === 'startTime' && (eventSortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap px-2" onClick={() => handleEventSort('location')}>
                  Location {eventSortField === 'location' && (eventSortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="whitespace-nowrap px-2">For</TableHead>
                <TableHead className="whitespace-nowrap px-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const sortedEvents = [...events].sort((a: any, b: any) => {
                  const field = eventSortField;
                  if (!field) {
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                  }
                  let aVal = a[field];
                  let bVal = b[field];
                  if (field === 'startTime') {
                    const aTime = new Date(aVal || 0).getTime();
                    const bTime = new Date(bVal || 0).getTime();
                    return eventSortDirection === 'asc' ? aTime - bTime : bTime - aTime;
                  }
                  if (aVal == null) aVal = '';
                  if (bVal == null) bVal = '';
                  const aStr = typeof aVal === 'string' ? aVal.toLowerCase() : aVal;
                  const bStr = typeof bVal === 'string' ? bVal.toLowerCase() : bVal;
                  if (aStr < bStr) return eventSortDirection === 'asc' ? -1 : 1;
                  if (aStr > bStr) return eventSortDirection === 'asc' ? 1 : -1;
                  return 0;
                });
                const totalEventsPages = Math.max(1, Math.ceil(sortedEvents.length / EVENTS_PAGE_SIZE));
                const safeEventsPage = Math.min(eventsPage, totalEventsPages);
                const startIdx = (safeEventsPage - 1) * EVENTS_PAGE_SIZE;
                const paginatedEvents = sortedEvents.slice(startIdx, startIdx + EVENTS_PAGE_SIZE);
                
                return paginatedEvents.map((event: any) => {
                  // Build 'For' display from assignTo
                  let forDisplay = "Everyone";
                  if (event.scheduleRequestSource && event.assignTo?.users?.length > 0) {
                    const userNames = event.assignTo.users.map((id: string) => {
                      const user = (users || []).find((u: any) => String(u.id) === String(id));
                      return user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null;
                    }).filter(Boolean);
                    forDisplay = userNames.length > 0 ? userNames.join(", ") : "Assigned User";
                  } else if (event.assignTo) {
                    const parts: string[] = [];
                    if (event.assignTo.teams?.length > 0) {
                      const teamNames = event.assignTo.teams.map((id: string) => {
                        const team = (teams || []).find((t: any) => String(t.id) === String(id));
                        return team?.name || `Team ${id}`;
                      });
                      parts.push(teamNames.join(", "));
                    }
                    if (event.assignTo.programs?.length > 0) {
                      const programNames = event.assignTo.programs.map((id: string) => {
                        const prog = (programs || []).find((p: any) => String(p.id) === String(id));
                        return prog?.name || `Program ${id}`;
                      });
                      parts.push(programNames.join(", "));
                    }
                    if (event.assignTo.divisions?.length > 0) {
                      parts.push(`Divisions: ${event.assignTo.divisions.join(", ")}`);
                    }
                    if (event.assignTo.users?.length > 0) {
                      const userNames = event.assignTo.users.map((id: string) => {
                        const user = (users || []).find((u: any) => String(u.id) === String(id));
                        return user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : `User ${id}`;
                      });
                      parts.push(userNames.join(", "));
                    }
                    if (event.assignTo.roles?.length > 0) {
                      parts.push(`Roles: ${event.assignTo.roles.map((r: string) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ")}`);
                    }
                    if (parts.length > 0) {
                      forDisplay = parts.join("; ");
                    }
                  } else if (event.targetType && event.targetType !== "all") {
                    const eventTeam = event.teamId ? (teams || []).find((t: any) => t.id === parseInt(event.teamId)) : null;
                    if (eventTeam) {
                      forDisplay = eventTeam.name;
                    } else {
                      forDisplay = event.targetType.charAt(0).toUpperCase() + event.targetType.slice(1);
                    }
                  }
                  
                  // Build date/time display
                  const dateTimeDisplay = new Date(event.startTime).toLocaleString();
                  
                  return (
                  <TableRow key={event.id} data-testid={`row-event-${event.id}`} className="whitespace-nowrap">
                    <TableCell className="px-2 py-1.5">
                      <Checkbox 
                        checked={selectedEventIds.has(event.id)}
                        onCheckedChange={() => toggleEventSelection(event.id)}
                        aria-label={`Select ${event.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium px-2 py-1.5 max-w-[180px] truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{event.title}</span>
                        {event.isRecurring && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px] px-1 py-0 shrink-0">
                            Recurring
                          </Badge>
                        )}
                        {event.scheduleRequestSource && event.status === 'pending' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1 py-0 shrink-0">
                            Requested
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge className={`text-[10px] px-1.5 py-0 ${
                        (event.eventType || event.type) === 'practice' ? 'bg-blue-100 text-blue-700' :
                        (event.eventType || event.type) === 'game' ? 'bg-red-100 text-red-700' :
                        (event.eventType || event.type) === 'training' ? 'bg-green-100 text-green-700' :
                        (event.eventType || event.type) === 'meeting' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(event.eventType || event.type || 'unknown').charAt(0).toUpperCase() + (event.eventType || event.type || 'unknown').slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs">{dateTimeDisplay}</TableCell>
                    <TableCell className="px-2 py-1.5 text-xs max-w-[140px] truncate">
                      {event.location === 'Online' && event.meetingLink ? (
                        <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          Online
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : event.location || "-"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs max-w-[150px] truncate" title={forDisplay}>
                      {forDisplay}
                    </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => setSelectedEventForDetails(event)}
                        data-testid={`button-view-details-${event.id}`}
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          // Convert assignTo/visibility to legacy format for edit form
                          const eventToEdit = { ...event };
                          
                          // Determine targetType from assignTo/visibility
                          // Check for "Everyone" first - all 4 roles present
                          const allRoles = ['player', 'coach', 'parent', 'admin'];
                          const hasAllRoles = event.assignTo?.roles && 
                            allRoles.every(r => event.assignTo.roles.includes(r));
                          
                          if (hasAllRoles) {
                            eventToEdit.targetType = 'all';
                            eventToEdit.targetId = '';
                          } else if (event.scheduleRequestSource && event.assignTo?.users && event.assignTo.users.length > 0) {
                            eventToEdit.targetType = 'user';
                            eventToEdit.targetIds = event.assignTo.users.map(String);
                          } else if (event.assignTo?.teams && event.assignTo.teams.length > 0) {
                            eventToEdit.targetType = 'team';
                            eventToEdit.targetIds = event.assignTo.teams.map(String);
                          } else if (event.assignTo?.programs && event.assignTo.programs.length > 0) {
                            eventToEdit.targetType = 'program';
                            eventToEdit.targetIds = event.assignTo.programs.map(String);
                          } else if (event.assignTo?.divisions && event.assignTo.divisions.length > 0) {
                            eventToEdit.targetType = 'division';
                            eventToEdit.targetIds = event.assignTo.divisions.map(String);
                          } else if (event.assignTo?.users && event.assignTo.users.length > 0) {
                            eventToEdit.targetType = 'user';
                            eventToEdit.targetIds = event.assignTo.users.map(String);
                          } else if (event.assignTo?.roles && event.assignTo.roles.length > 0) {
                            eventToEdit.targetType = 'role';
                            eventToEdit.targetIds = event.assignTo.roles.map(String);
                          } else if (event.targetType) {
                            // Already has targetType, keep it
                            if (event.targetId) eventToEdit.targetId = String(event.targetId);
                          } else {
                            eventToEdit.targetType = 'all';
                          }
                          
                          setEditLocationType(eventToEdit.location === 'Online' ? 'online' : 'physical');
                          setEditingEvent(eventToEdit);
                        }}
                        data-testid={`button-edit-event-${event.id}`}
                        title="Edit Event"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
          </div>
          {events.length > EVENTS_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 px-2">
              <span className="text-sm text-gray-500">
                Showing {((eventsPage - 1) * EVENTS_PAGE_SIZE) + 1}–{Math.min(eventsPage * EVENTS_PAGE_SIZE, events.length)} of {events.length} events
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventsPage <= 1}
                  onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {eventsPage} of {Math.ceil(events.length / EVENTS_PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventsPage >= Math.ceil(events.length / EVENTS_PAGE_SIZE)}
                  onClick={() => setEventsPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Calendar Navigation and Legend */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="font-semibold text-lg min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  data-testid="button-today"
                >
                  Today
                </Button>
              </div>
              
              {/* Event Type Legend */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                  <span className="text-gray-600">Practice</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                  <span className="text-gray-600">Game</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
                  <span className="text-gray-600">Tournament</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                  <span className="text-gray-600">Meeting</span>
                </div>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              {/* Calendar Header - Days of Week */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="font-semibold text-sm p-3 text-center border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid - Days */}
              <div className="grid grid-cols-7">
                {(() => {
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();
                  const isToday = (day: number) => 
                    today.getDate() === day && 
                    today.getMonth() === month && 
                    today.getFullYear() === year;
                  
                  const cells = [];
                  
                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(
                      <div key={`empty-${i}`} className="min-h-32 p-2 bg-gray-50 border-r border-b" />
                    );
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                    const dayEvents = events.filter((event: any) => {
                      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
                      return eventDate === dateStr;
                    });
                    
                    const eventTypeColors: Record<string, string> = {
                      practice: 'bg-blue-100 text-blue-700 border-blue-300',
                      game: 'bg-red-100 text-red-700 border-red-300',
                      tournament: 'bg-purple-100 text-purple-700 border-purple-300',
                      meeting: 'bg-green-100 text-green-700 border-green-300',
                    };
                    
                    cells.push(
                      <div 
                        key={day} 
                        className={`min-h-32 p-2 border-r border-b hover:bg-gray-50 transition-colors ${
                          isToday(day) ? 'bg-red-50' : ''
                        }`}
                        data-testid={`calendar-day-${dateStr}`}
                      >
                        <div className={`text-sm font-semibold mb-1 ${
                          isToday(day) ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event: any) => (
                            <DropdownMenu key={event.id}>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={`w-full text-left text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${
                                    eventTypeColors[event.type] || 'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}
                                  data-testid={`calendar-event-${event.id}`}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  <div className="text-xs opacity-75">
                                    {new Date(event.startTime).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-36">
                                <DropdownMenuItem onClick={() => setSelectedEventForDetails(event)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const eventToEdit = { ...event };
                                  const allRoles = ['player', 'coach', 'parent', 'admin'];
                                  const hasAllRoles = event.assignTo?.roles && allRoles.every((r: string) => event.assignTo.roles.includes(r));
                                  if (hasAllRoles) {
                                    eventToEdit.targetType = 'all';
                                    eventToEdit.targetId = '';
                                  } else if (event.scheduleRequestSource && event.assignTo?.users?.length > 0) {
                                    eventToEdit.targetType = 'user';
                                    eventToEdit.targetIds = event.assignTo.users.map(String);
                                  } else if (event.assignTo?.teams?.length > 0) {
                                    eventToEdit.targetType = 'team';
                                    eventToEdit.targetIds = event.assignTo.teams.map(String);
                                  } else if (event.assignTo?.programs?.length > 0) {
                                    eventToEdit.targetType = 'program';
                                    eventToEdit.targetIds = event.assignTo.programs.map(String);
                                  } else if (event.assignTo?.divisions?.length > 0) {
                                    eventToEdit.targetType = 'division';
                                    eventToEdit.targetIds = event.assignTo.divisions.map(String);
                                  } else if (event.assignTo?.users?.length > 0) {
                                    eventToEdit.targetType = 'user';
                                    eventToEdit.targetIds = event.assignTo.users.map(String);
                                  } else if (event.assignTo?.roles?.length > 0) {
                                    eventToEdit.targetType = 'role';
                                    eventToEdit.targetIds = event.assignTo.roles.map(String);
                                  } else if (event.targetType) {
                                    if (event.targetId) eventToEdit.targetId = String(event.targetId);
                                  } else {
                                    eventToEdit.targetType = 'all';
                                  }
                                  setEditLocationType(eventToEdit.location === 'Online' ? 'online' : 'physical');
                                  setEditingEvent(eventToEdit);
                                }}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setDeleteConfirmEvent(event)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return cells;
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmEvent} onOpenChange={(open) => !open && setDeleteConfirmEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteEvent.mutate(deleteConfirmEvent.id);
                setDeleteConfirmEvent(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    </div>
  );
}

// Awards Tab - Full Implementation with all requested features
function AwardsTab({ awardDefinitions, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<any>(null);
  const [recipientsAward, setRecipientsAward] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all"); // Now used for trigger category
  const [filterActive, setFilterActive] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedAwardIds, setSelectedAwardIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useDragScroll();

  const bulkDeleteAwards = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/award-definitions/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      const count = selectedAwardIds.size;
      setSelectedAwardIds(new Set());
      toast({ title: `${count} award(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some awards", variant: "destructive" });
    },
  });

  const toggleAwardSelection = (awardId: string) => {
    setSelectedAwardIds(prev => {
      const next = new Set(prev);
      if (next.has(awardId)) {
        next.delete(awardId);
      } else {
        next.add(awardId);
      }
      return next;
    });
  };

  const toggleAllAwards = (awardIds: string[]) => {
    if (selectedAwardIds.size === awardIds.length) {
      setSelectedAwardIds(new Set());
    } else {
      setSelectedAwardIds(new Set(awardIds));
    }
  };

  // Fetch all user awards for the organization (for recipient counts)
  const { data: allOrgAwards = [] } = useQuery<any[]>({
    queryKey: ["/api/user-awards/organization"],
  });

  // Fetch user awards for recipients dialog view
  const { data: userAwards = [], refetch: refetchUserAwards } = useQuery<any[]>({
    queryKey: ["/api/user-awards", recipientsAward?.id],
    enabled: !!recipientsAward,
  });

  const awardFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    tier: z.enum(["Prospect", "Starter", "All-Star", "Superstar", "HOF", "Legacy"]),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    active: z.boolean().default(true),
    allowMultiple: z.boolean().default(false), // Can this award be earned multiple times?
    // New simplified trigger system
    triggerCategory: z.enum(["checkin", "rsvp", "system", "time", "store", "manual"]).default("manual"),
    eventFilter: z.enum(["game", "practice", "skills", "fnh", "any"]).optional(),
    countMode: z.enum(["total", "streak"]).optional(),
    threshold: z.number().optional(),
    referenceId: z.string().nullable().optional(), // Accept null for clearing
    targetTier: z.string().nullable().optional(), // For tier-based collection meta badges, accept null for clearing
    timeUnit: z.enum(["years", "months", "days"]).optional(),
    // Program/Team scope
    programIds: z.array(z.string()).optional(),
    teamIds: z.array(z.number()).optional(),
  }).refine((data) => {
    // For system trigger category, require exactly one of targetTier or referenceId (not both, not neither)
    if (data.triggerCategory === "system") {
      const hasTier = !!data.targetTier;
      const hasRef = !!data.referenceId;
      return (hasTier || hasRef) && !(hasTier && hasRef);
    }
    return true;
  }, {
    message: "Collection awards require exactly one target: either a tier OR a specific award (not both)",
    path: ["referenceId"]
  });

  // Fetch programs and teams for check-in award scope
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });
  
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });
  
  // Fetch store products for store trigger awards
  const { data: allStoreProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });
  const storeGoodsProducts = allStoreProducts.filter((p: any) => p.productCategory === 'goods' && p.isActive !== false);

  const form = useForm({
    resolver: zodResolver(awardFormSchema),
    defaultValues: {
      name: "",
      tier: "Grey" as const,
      description: "",
      imageUrl: "",
      active: true,
      allowMultiple: false,
      triggerCategory: "manual" as const,
      eventFilter: undefined,
      countMode: undefined,
      threshold: undefined,
      referenceId: undefined,
      targetTier: undefined,
      timeUnit: undefined,
      programIds: [] as string[],
      teamIds: [] as number[],
    },
  });

  // Watch selected programs to filter available teams
  const watchedProgramIds = form.watch("programIds") || [];

  // Watch trigger category to show/hide fields dynamically
  const watchedTriggerCategory = form.watch("triggerCategory");

  const createAward = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/award-definitions", {
        ...data,
        organizationId: organization?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      toast({ title: "Award created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create award", variant: "destructive" });
    },
  });

  const updateAward = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PUT", `/api/award-definitions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      toast({ title: "Award updated successfully" });
      setEditingAward(null);
    },
    onError: () => {
      toast({ title: "Failed to update award", variant: "destructive" });
    },
  });

  const deleteAward = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/award-definitions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      toast({ title: "Award deleted successfully" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete award", variant: "destructive" });
    },
  });

  const deleteUserAward = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/user-awards/${id}`, {});
    },
    onSuccess: () => {
      refetchUserAwards();
      toast({ title: "User award removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove user award", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return await apiRequest("PUT", `/api/award-definitions/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
    },
    onError: () => {
      toast({ title: "Failed to update award status", variant: "destructive" });
    },
  });

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get tier badge color
  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      "Prospect": "bg-gray-100 text-gray-700 border-gray-300",
      "Starter": "bg-green-100 text-green-700 border-green-300",
      "All-Star": "bg-blue-100 text-blue-700 border-blue-300",
      "Superstar": "bg-purple-100 text-purple-700 border-purple-300",
      "HOF": "bg-yellow-100 text-yellow-700 border-yellow-300",
      "Legacy": "bg-gradient-to-r from-red-100 via-yellow-100 via-green-100 via-blue-100 to-purple-100 text-purple-700 border-purple-300",
    };
    return colors[tier] || colors["Prospect"];
  };

  // Get trigger category label
  const getTriggerCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "checkin": "Check-in",
      "rsvp": "RSVP",
      "system": "Collection",
      "time": "Time",
      "store": "Store",
      "manual": "Manual",
    };
    return labels[category] || "Manual";
  };

  // Tier hierarchy for sorting
  const tierOrder: Record<string, number> = {
    "Legacy": 6,
    "HOF": 5,
    "Superstar": 4,
    "All-Star": 3,
    "Starter": 2,
    "Prospect": 1,
  };

  // Filter and sort awards
  const filteredAwards = awardDefinitions
    .filter((award: any) => {
      const matchesSearch = award.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === "all" || award.tier === filterTier;
      const matchesActive = filterActive === "all" || 
        (filterActive === "active" && award.active) || 
        (filterActive === "inactive" && !award.active);
      const matchesTrigger = filterClass === "all" || award.triggerCategory === filterClass;
      
      return matchesSearch && matchesTier && matchesActive && matchesTrigger;
    })
    .sort((a: any, b: any) => {
      if (!sortField) return 0;
      
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Special handling for tier sorting
      if (sortField === 'tier') {
        const aRank = tierOrder[aValue] || 0;
        const bRank = tierOrder[bValue] || 0;
        return sortDirection === 'asc' ? aRank - bRank : bRank - aRank;
      }
      
      // Convert to strings for comparison if not numbers
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Get recipient count for an award
  const getRecipientCount = (awardId: number) => {
    return allOrgAwards.filter((ua: any) => ua.awardId === awardId).length;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    
    try {
      // Validate image dimensions (500x500px)
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(imageUrl);
          if (img.width !== 500 || img.height !== 500) {
            reject(new Error(`Image must be exactly 500x500 pixels. Your image is ${img.width}x${img.height}px.`));
          } else {
            resolve();
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        img.src = imageUrl;
      });

      const formData = new FormData();
      formData.append('image', file);

      // Get auth token from localStorage for file upload
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/upload/award-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      // Update the imageUrl field with the uploaded path
      form.setValue('imageUrl', data.imageUrl);
      setImagePreview(data.imageUrl);
      
      toast({
        title: "Image uploaded successfully",
        description: "The award image has been uploaded and will be saved when you submit the form.",
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: "Failed to upload image",
        description: error.message || "An error occurred while uploading the image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const openEditDialog = (award: any) => {
    setEditingAward(award);
    setImagePreview(award.imageUrl || "");
    
    form.reset({
      name: award.name || "",
      tier: award.tier || "Grey",
      description: award.description || "",
      imageUrl: award.imageUrl || "",
      active: award.active ?? true,
      allowMultiple: award.allowMultiple ?? false,
      triggerCategory: award.triggerCategory || "manual",
      eventFilter: award.eventFilter || undefined,
      countMode: award.countMode || undefined,
      threshold: award.threshold != null ? Number(award.threshold) : undefined,
      referenceId: award.referenceId || undefined,
      targetTier: award.targetTier || undefined,
      timeUnit: award.timeUnit || undefined,
      programIds: award.programIds || [],
      teamIds: award.teamIds || [],
    } as any);
    setIsDialogOpen(true);
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadAwardTemplate = () => {
    const csvContent = "Name,Category,Points,Description,Image URL\nHeart & Hustle Award,Gold,100,For players who show exceptional effort,\nMVP Badge,Purple,250,Most Valuable Player award,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'awards-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAwardsData = () => {
    const csvHeaders = "Name,Category,Points,Description,Image URL";
    const csvRows = filteredAwards.map((award: any) => {
      return [
        award.name || "",
        award.tier || "",
        award.threshold || 0,
        award.description || "",
        award.imageUrl || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'awards-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/awards", {
            organizationId: organization?.id,
            name: values[0],
            tier: values[1] || "Grey",
            threshold: parseInt(values[2]) || 0,
            description: values[3] || "",
            imageUrl: values[4] || "",
            active: true,
            triggerCategory: "manual",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create award:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} awards` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Award Definitions</CardTitle>
          <CardDescription>Manage awards for your organization</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-awards">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Awards</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Category, Points, Description, Image URL</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-award-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadAwardTemplate} data-testid="button-download-award-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadAwardsData} data-testid="button-download-awards">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAward(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Award" data-testid="button-create-award">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAward ? "Edit Award" : "Create Award"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => {
                    // For system trigger category, explicitly send null for cleared fields
                    const payload = { ...data } as any;
                    if (data.triggerCategory === 'system') {
                      // Send null instead of undefined to signal "clear this field"
                      if (!data.targetTier) payload.targetTier = null;
                      if (!data.referenceId) payload.referenceId = null;
                    }
                    if (editingAward) {
                      updateAward.mutate({ id: editingAward.id, ...payload });
                    } else {
                      createAward.mutate(payload);
                    }
                  })}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Heart & Hustle Award" data-testid="input-award-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-award-tier">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Legacy">Legacy</SelectItem>
                            <SelectItem value="HOF">HOF</SelectItem>
                            <SelectItem value="Superstar">Superstar</SelectItem>
                            <SelectItem value="All-Star">All-Star</SelectItem>
                            <SelectItem value="Starter">Starter</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="allowMultiple"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Can be earned multiple times</FormLabel>
                          <FormDescription className="text-xs">
                            Enable if players can earn this award more than once
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-allow-multiple"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Award Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Award Image (500x500px)</label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Award preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          data-testid="input-award-image"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          data-testid="button-upload-image"
                        >
                          {uploadingImage ? "Uploading..." : "Upload Image"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Must be exactly 500x500 pixels. PNG, JPG, or WebP.
                        </p>
                        {imagePreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setImagePreview("");
                              form.setValue("imageUrl", "");
                            }}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Trigger Category - The Master Switch */}
                  <FormField
                    control={form.control}
                    name="triggerCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How is this earned? *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-trigger-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="checkin">Check-in / Attendance</SelectItem>
                            <SelectItem value="rsvp">RSVP Attendance</SelectItem>
                            <SelectItem value="system">Collection (Meta-Badge)</SelectItem>
                            <SelectItem value="time">Time Active</SelectItem>
                            <SelectItem value="store">Store Purchase</SelectItem>
                            <SelectItem value="manual">Manual Assignment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {watchedTriggerCategory === "checkin" && "Award based on event attendance"}
                          {watchedTriggerCategory === "rsvp" && "Award based on RSVP 'attending' responses"}
                          {watchedTriggerCategory === "system" && "Award when user collects enough of another badge"}
                          {watchedTriggerCategory === "time" && "Award based on membership duration"}
                          {watchedTriggerCategory === "store" && "Award when user purchases a specific product"}
                          {watchedTriggerCategory === "manual" && "Coach or admin assigns this award manually"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dynamic fields based on trigger category */}
                  {watchedTriggerCategory === "checkin" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      {/* Program Selection */}
                      <FormField
                        control={form.control}
                        name="programIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Programs (Optional)</FormLabel>
                            <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                              {programs.map((program: any) => {
                                const isSelected = (field.value || []).includes(program.id);
                                return (
                                  <Badge
                                    key={program.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`cursor-pointer ${isSelected ? "bg-primary" : "hover:bg-muted"}`}
                                    onClick={() => {
                                      const current = field.value || [];
                                      if (isSelected) {
                                        field.onChange(current.filter((id: string) => id !== program.id));
                                        // Also clear teams from this program
                                        const programTeamIds = teams
                                          .filter((t: any) => t.programId === program.id)
                                          .map((t: any) => t.id);
                                        const currentTeams = form.getValues("teamIds") || [];
                                        form.setValue("teamIds", currentTeams.filter((id: number) => !programTeamIds.includes(id)));
                                      } else {
                                        field.onChange([...current, program.id]);
                                      }
                                    }}
                                    data-testid={`badge-program-${program.id}`}
                                  >
                                    {program.name}
                                  </Badge>
                                );
                              })}
                              {programs.length === 0 && (
                                <span className="text-muted-foreground text-sm">No programs available</span>
                              )}
                            </div>
                            <FormDescription>
                              Select programs to limit this award. Leave empty for all programs.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Team Selection - only show if programs are selected */}
                      {watchedProgramIds.length > 0 && (
                        <FormField
                          control={form.control}
                          name="teamIds"
                          render={({ field }) => {
                            const filteredTeams = teams.filter((team: any) => 
                              watchedProgramIds.includes(team.programId)
                            );
                            return (
                              <FormItem>
                                <FormLabel>Teams (Optional)</FormLabel>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                                  {filteredTeams.map((team: any) => {
                                    const isSelected = (field.value || []).includes(team.id);
                                    return (
                                      <Badge
                                        key={team.id}
                                        variant={isSelected ? "default" : "outline"}
                                        className={`cursor-pointer ${isSelected ? "bg-primary" : "hover:bg-muted"}`}
                                        onClick={() => {
                                          const current = field.value || [];
                                          if (isSelected) {
                                            field.onChange(current.filter((id: number) => id !== team.id));
                                          } else {
                                            field.onChange([...current, team.id]);
                                          }
                                        }}
                                        data-testid={`badge-team-${team.id}`}
                                      >
                                        {team.name}
                                      </Badge>
                                    );
                                  })}
                                  {filteredTeams.length === 0 && (
                                    <span className="text-muted-foreground text-sm">No teams in selected programs</span>
                                  )}
                                </div>
                                <FormDescription>
                                  Select specific teams or leave empty for all teams in selected programs.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="eventFilter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-event-filter">
                                    <SelectValue placeholder="Select event type..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="any">Any Event</SelectItem>
                                  <SelectItem value="game">Games Only</SelectItem>
                                  <SelectItem value="practice">Practices Only</SelectItem>
                                  <SelectItem value="skills">Skills Sessions</SelectItem>
                                  <SelectItem value="fnh">Friday Night Hoops</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="countMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Count Mode</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-count-mode">
                                    <SelectValue placeholder="Select mode..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="total">Total (Cumulative)</SelectItem>
                                  <SelectItem value="streak">Streak (Consecutive)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number Required</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="e.g., 50"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                value={field.value || ""}
                                data-testid="input-threshold"
                              />
                            </FormControl>
                            <FormDescription>How many check-ins are needed to earn this award?</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "rsvp" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      {/* Program Selection for RSVP */}
                      <FormField
                        control={form.control}
                        name="programIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Programs (Optional)</FormLabel>
                            <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                              {programs.map((program: any) => {
                                const isSelected = (field.value || []).includes(program.id);
                                return (
                                  <Badge
                                    key={program.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`cursor-pointer ${isSelected ? "bg-primary" : "hover:bg-muted"}`}
                                    onClick={() => {
                                      const current = field.value || [];
                                      if (isSelected) {
                                        field.onChange(current.filter((id: string) => id !== program.id));
                                      } else {
                                        field.onChange([...current, program.id]);
                                      }
                                    }}
                                    data-testid={`badge-rsvp-program-${program.id}`}
                                  >
                                    {program.name}
                                  </Badge>
                                );
                              })}
                              {programs.length === 0 && (
                                <span className="text-muted-foreground text-sm">No programs available</span>
                              )}
                            </div>
                            <FormDescription>
                              Select programs to limit this award. Leave empty for all programs.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="countMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Counting Mode</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-rsvp-count-mode">
                                    <SelectValue placeholder="Select mode..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="total">Total (Cumulative)</SelectItem>
                                  <SelectItem value="streak">Streak (Consecutive within 14 days)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of RSVPs Required</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="e.g., 10"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                value={field.value || ""}
                                data-testid="input-rsvp-threshold"
                              />
                            </FormControl>
                            <FormDescription>How many 'attending' RSVPs are needed to earn this award?</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "system" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <FormField
                        control={form.control}
                        name="targetTier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Tier (Optional)</FormLabel>
                            <Select onValueChange={(value) => {
                              const newValue = value === "none" ? undefined : value;
                              field.onChange(newValue);
                              if (newValue) {
                                form.setValue("referenceId", undefined);
                              }
                            }} value={field.value || "none"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-target-tier">
                                  <SelectValue placeholder="Select tier to count..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">-- Select a specific award instead --</SelectItem>
                                <SelectItem value="Legacy">Legacy</SelectItem>
                                <SelectItem value="HOF">HOF</SelectItem>
                                <SelectItem value="Superstar">Superstar</SelectItem>
                                <SelectItem value="All-Star">All-Star</SelectItem>
                                <SelectItem value="Starter">Starter</SelectItem>
                                <SelectItem value="Prospect">Prospect</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Award this when user collects X distinct awards of this tier</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!form.watch("targetTier") && (
                        <FormField
                          control={form.control}
                          name="referenceId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Award</FormLabel>
                              <Select onValueChange={(value) => {
                                field.onChange(value === "none" ? undefined : value);
                              }} value={field.value || "none"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-reference-award">
                                    <SelectValue placeholder="Select award to count..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">-- Select an award --</SelectItem>
                                  {awardDefinitions
                                    .filter((a: any) => a.active && a.triggerCategory !== 'system')
                                    .map((a: any) => (
                                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>Which specific award needs to be collected multiple times?</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number Required</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="e.g., 5"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                value={field.value || ""}
                                data-testid="input-system-threshold"
                              />
                            </FormControl>
                            <FormDescription>How many {form.watch("targetTier") ? `${form.watch("targetTier")} tier awards` : "of that award"} are needed?</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "time" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="threshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="e.g., 5"
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  value={field.value || ""}
                                  data-testid="input-time-threshold"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timeUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-time-unit">
                                    <SelectValue placeholder="Select unit..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="years">Years</SelectItem>
                                  <SelectItem value="months">Months</SelectItem>
                                  <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormDescription>Award after the user has been a member for this duration</FormDescription>
                    </div>
                  )}

                  {watchedTriggerCategory === "store" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <FormField
                        control={form.control}
                        name="referenceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Product</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-store-product">
                                  <SelectValue placeholder="Select a store product..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {storeGoodsProducts.length === 0 ? (
                                  <SelectItem value="_none" disabled>No store products available</SelectItem>
                                ) : (
                                  storeGoodsProducts.map((product: any) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} {product.price ? `($${(product.price / 100).toFixed(2)})` : ''}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormDescription>Award is granted when a player's parent purchases this product</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "manual" && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        This award has no automatic triggers. Coaches or admins will assign it manually to players.
                      </p>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Description of the award..." data-testid="input-award-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Award is active and can be earned by users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-award-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createAward.isPending || updateAward.isPending}
                    data-testid="button-submit-award"
                  >
                    {createAward.isPending || updateAward.isPending
                      ? "Saving..."
                      : editingAward
                      ? "Update Award"
                      : "Create Award"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-awards"
          />
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-40" data-testid="filter-tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="All-Star">All-Star</SelectItem>
              <SelectItem value="Superstar">Superstar</SelectItem>
              <SelectItem value="HOF">HOF</SelectItem>
              <SelectItem value="Legacy">Legacy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40" data-testid="filter-trigger">
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="checkin">Check-in</SelectItem>
              <SelectItem value="system">Collection</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="store">Store</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-40" data-testid="filter-active">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Action Bar */}
        {selectedAwardIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedAwardIds.size} award{selectedAwardIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedAwardIds.size} award(s)?`)) {
                  bulkDeleteAwards.mutate(Array.from(selectedAwardIds));
                }
              }}
              disabled={bulkDeleteAwards.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteAwards.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAwardIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Awards Table */}
        <div ref={tableRef} className="overflow-x-auto hide-scrollbar drag-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={filteredAwards.length > 0 && selectedAwardIds.size === filteredAwards.length}
                    onCheckedChange={() => toggleAllAwards(filteredAwards.map((a: any) => a.id))}
                    aria-label="Select all awards"
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('name')}
                  data-testid="header-name"
                >
                  Name
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('tier')}
                  data-testid="header-tier"
                >
                  Tier
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('triggerCategory')}
                  data-testid="header-trigger"
                >
                  Trigger
                </TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('active')}
                  data-testid="header-active"
                >
                  Active
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAwards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No awards found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAwards.map((award: any) => (
                  <TableRow
                    key={award.id}
                    className="cursor-pointer hover:bg-gray-50"
                    data-testid={`row-award-${award.id}`}
                  >
                    <TableCell>
                      <Checkbox 
                        checked={selectedAwardIds.has(award.id)}
                        onCheckedChange={() => toggleAwardSelection(award.id)}
                        aria-label={`Select ${award.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{award.name}</TableCell>
                    <TableCell>
                      {award.imageUrl ? (
                        <img 
                          src={award.imageUrl} 
                          alt={award.name} 
                          className="w-12 h-12 object-contain"
                          data-testid={`img-award-${award.id}`}
                        />
                      ) : (
                        <Award className="w-12 h-12 text-gray-300" data-testid={`icon-badge-${award.id}`} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTierBadgeColor(award.tier)}>
                        {award.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getTriggerCategoryLabel(award.triggerCategory || 'manual')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {award.triggerCategory === 'checkin' && (
                        <span>{award.countMode === 'streak' ? 'Streak' : 'Total'}: {award.threshold || 0} {award.eventFilter || 'any'}</span>
                      )}
                      {award.triggerCategory === 'rsvp' && (
                        <span>{award.countMode === 'streak' ? 'Streak' : 'Total'}: {award.threshold || 0} RSVPs</span>
                      )}
                      {award.triggerCategory === 'time' && (
                        <span>{award.threshold || 0} {award.timeUnit || 'years'}</span>
                      )}
                      {award.triggerCategory === 'store' && (
                        <span>SKU: {award.referenceId || '-'}</span>
                      )}
                      {award.triggerCategory === 'system' && (
                        <span>Collect {award.threshold || 0} of #{award.referenceId || '-'}</span>
                      )}
                      {(award.triggerCategory === 'manual' || !award.triggerCategory) && (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRecipientsAward(award)}
                        data-testid={`button-view-recipients-${award.id}`}
                      >
                        <Badge variant="secondary">
                          {getRecipientCount(award.id)} <Eye className="w-3 h-3 ml-1" />
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={award.active ?? true}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: award.id, active: checked })}
                        data-testid={`switch-active-${award.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(award)}
                          data-testid={`button-edit-award-${award.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Recipients Dialog */}
      <Dialog open={!!recipientsAward} onOpenChange={(open) => !open && setRecipientsAward(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Recipients: {recipientsAward?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player Name</TableHead>
                  <TableHead>Awarded At</TableHead>
                  <TableHead>Awarded By</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAwards
                  .filter((ua: any) => ua.awardId === recipientsAward?.id)
                  .map((ua: any) => {
                    const user = users.find((u: any) => u.id === ua.userId);
                    const awardedByUser = ua.awardedBy ? users.find((u: any) => u.id === ua.awardedBy) : null;
                    return (
                      <TableRow key={ua.id} data-testid={`recipient-row-${ua.id}`}>
                        <TableCell>{user ? `${user.firstName} ${user.lastName}` : "Unknown"}</TableCell>
                        <TableCell>{ua.awardedAt ? format(new Date(ua.awardedAt), "MMM d, yyyy") : "-"}</TableCell>
                        <TableCell>
                          {awardedByUser ? `${awardedByUser.firstName} ${awardedByUser.lastName}` : "Auto"}
                        </TableCell>
                        <TableCell>{ua.year || "-"}</TableCell>
                        <TableCell>{ua.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUserAward.mutate(ua.id)}
                            data-testid={`button-remove-recipient-${ua.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {userAwards.filter((ua: any) => ua.awardId === recipientsAward?.id).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No recipients yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete the award "{deleteConfirm?.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAward.mutate(deleteConfirm.id)}
              disabled={deleteAward.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAward.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function InlineCouponSection({ programId }: { programId: string }) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('1');

  interface CouponData {
    id: number;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxUses: number | null;
    currentUses: number | null;
    expiresAt: string;
    isActive: boolean;
  }

  const { data: coupons = [], isLoading } = useQuery<CouponData[]>({
    queryKey: ['/api/coupons/program', programId],
    queryFn: async () => {
      const res = await fetch(`/api/coupons/program/${programId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch coupons');
      return res.json();
    },
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId,
          discountType,
          discountValue,
          maxUses: parseInt(maxUses) || 1,
        }),
      });
      if (!res.ok) throw new Error('Failed to create coupon');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons/program', programId] });
      setDiscountValue('');
      setMaxUses('1');
      toast({ title: "Coupon created" });
    },
    onError: () => {
      toast({ title: "Failed to create coupon", variant: "destructive" });
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete coupon');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons/program', programId] });
      toast({ title: "Coupon deactivated" });
    },
  });

  const copyCode = (coupon: { id: number; code: string }) => {
    navigator.clipboard.writeText(coupon.code);
    setCopiedId(coupon.id);
    toast({ title: "Coupon code copied" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
  const isMaxed = (coupon: CouponData) => coupon.maxUses && (coupon.currentUses ?? 0) >= coupon.maxUses;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={discountType} onValueChange={(v: 'percentage' | 'fixed') => setDiscountType(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Value</Label>
          <Input
            type="number"
            placeholder={discountType === 'percentage' ? "e.g. 10" : "e.g. 500 (cents)"}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-[130px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max Uses</Label>
          <Input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="w-[80px]"
            min="1"
          />
        </div>
        <Button
          type="button"
          onClick={() => createCoupon.mutate()}
          disabled={!discountValue || createCoupon.isPending}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          {createCoupon.isPending ? "Creating..." : "Generate Coupon"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading coupons...</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">No coupons yet.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {coupons.map((coupon: CouponData) => {
            const expired = isExpired(coupon.expiresAt);
            const maxedOut = isMaxed(coupon);
            const inactive = !coupon.isActive;
            const status = inactive ? 'Deactivated' : expired ? 'Expired' : maxedOut ? 'Used Up' : 'Active';
            const statusVariant: 'default' | 'secondary' = status === 'Active' ? 'default' : 'secondary';

            const isInvalid = inactive || expired || maxedOut;
            return (
              <div key={coupon.id} className={`flex items-center justify-between rounded border px-2 py-1.5 text-sm ${isInvalid ? 'bg-gray-100 opacity-50' : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                  <code className={`px-2 py-0.5 rounded text-xs font-mono ${isInvalid ? 'bg-gray-200 line-through' : 'bg-gray-100'}`}>{coupon.code}</code>
                  <span className="text-xs text-gray-600">
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : `$${(coupon.discountValue / 100).toFixed(2)}`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {coupon.currentUses || 0}/{coupon.maxUses || '∞'}
                  </span>
                  <Badge variant={statusVariant} className="text-xs">{status}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => copyCode(coupon)} title="Copy code" className="h-7 w-7 p-0">
                    {copiedId === coupon.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  {status === 'Active' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCoupon.mutate(coupon.id)}
                      title="Deactivate"
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Store Tab - Physical Goods/Inventory Management (Simplified)
function StoreTab({ organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [selectedSuggestedPrograms, setSelectedSuggestedPrograms] = useState<string[]>([]);
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const bulkDeleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/programs/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      const count = selectedProductIds.size;
      setSelectedProductIds(new Set());
      toast({ title: `${count} product(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some products", variant: "destructive" });
    },
  });

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleAllProducts = (productIds: string[]) => {
    if (selectedProductIds.size === productIds.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(productIds));
    }
  };

  const { data: allProducts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  // Filter to only show physical goods (productCategory = 'goods')
  const storeProducts = allProducts?.filter((p: any) => p.productCategory === 'goods') || [];
  
  // Filter to only show programs (services) for the suggested add-ons selector
  const programOptions = allProducts?.filter((p: any) => p.productCategory === 'service' && p.isActive !== false) || [];

  // Fetch waivers for waiver attachment option
  const { data: storeWaivers = [] } = useQuery<any[]>({
    queryKey: ["/api/waivers"],
  });

  const STORE_CATEGORIES = [
    { value: "gear", label: "Gear & Apparel" },
    { value: "training", label: "Training & Camps" },
    { value: "digital", label: "Digital Academy" },
  ];

  const form = useForm({
    resolver: zodResolver(z.object({
      organizationId: z.string(),
      name: z.string().min(1, "Product name is required"),
      description: z.string().optional().nullable(),
      price: z.number().min(0, "Price must be positive"),
      inventorySizes: z.array(z.string()).default([]),
      inventoryCount: z.number().optional().nullable(),
      sizeStock: z.record(z.string(), z.number()).optional().nullable(),
      shippingRequired: z.boolean().default(false),
      isActive: z.boolean().default(true),
      storeCategory: z.string().optional().nullable(),
      sessionCount: z.number().optional().nullable(),
      isRecurring: z.boolean().default(false),
      billingCycle: z.string().optional().nullable(),
      billingIntervalDays: z.number().optional().nullable(),
      subscriptionDisclosure: z.string().optional().nullable(),
      requiredWaivers: z.array(z.string()).default([]),
    })),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      description: "",
      price: 0,
      inventorySizes: [] as string[],
      inventoryCount: 0,
      sizeStock: {} as Record<string, number>,
      shippingRequired: false,
      isActive: true,
      storeCategory: "gear",
      sessionCount: undefined as number | undefined,
      isRecurring: false,
      billingCycle: "Monthly",
      billingIntervalDays: 30,
      subscriptionDisclosure: "",
      requiredWaivers: [] as string[],
    },
  });

  const selectedStoreCategory = form.watch("storeCategory");
  const isRecurring = form.watch("isRecurring");
  const watchedProductPrice = form.watch("price");
  const watchedProductBillingIntervalDays = form.watch("billingIntervalDays");
  const watchedProductSubscriptionDisclosure = form.watch("subscriptionDisclosure");
  
  // Auto-generate subscription disclosure for store products when price or billing interval changes
  useEffect(() => {
    if (isRecurring && watchedProductPrice !== undefined && watchedProductBillingIntervalDays) {
      const priceInDollars = (watchedProductPrice / 100).toFixed(2);
      const days = watchedProductBillingIntervalDays;
      const cycleText = days === 7 ? "week" : days === 14 ? "2 weeks" : days === 30 ? "month" : days === 90 ? "3 months" : days === 180 ? "6 months" : days === 365 ? "year" : `${days} days`;
      const generatedDisclosure = `You will be charged $${priceInDollars} every ${cycleText}. Your subscription renews automatically until canceled. Cancel anytime from your account.`;
      
      // Only auto-fill if the field is empty or matches a previously generated pattern
      if (!watchedProductSubscriptionDisclosure || 
          watchedProductSubscriptionDisclosure.startsWith("You will be charged $")) {
        form.setValue("subscriptionDisclosure", generatedDisclosure);
      }
    }
  }, [isRecurring, watchedProductPrice, watchedProductBillingIntervalDays, form]);

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      if (!organization?.id) {
        throw new Error("Organization not loaded. Please try again.");
      }
      const isTraining = data.storeCategory === "training";
      const isGear = data.storeCategory === "gear";
      const payload = {
        ...data,
        organizationId: organization.id,
        productCategory: "goods",
        type: data.isRecurring ? "Subscription" : (isTraining ? "Pack" : "One-Time"),
        billingCycle: data.isRecurring ? "Subscription" : null,
        billingIntervalDays: data.isRecurring ? (data.billingIntervalDays || 30) : null,
        coverImageUrl: productImageUrl || null,
        tags: data.storeCategory ? [data.storeCategory] : [],
        sessionCount: isTraining ? (data.sessionCount || 0) : null,
        inventorySizes: isGear ? (data.inventorySizes || []) : [],
        inventoryCount: isGear && (!data.inventorySizes || data.inventorySizes.length === 0) ? (data.inventoryCount || 0) : null,
        sizeStock: isGear && data.inventorySizes && data.inventorySizes.length > 0 ? (data.sizeStock || {}) : null,
        shippingRequired: isGear ? (data.shippingRequired || false) : false,
        requiredWaivers: data.requiredWaivers || [],
      };
      let productId = editingProduct?.id;
      
      if (editingProduct) {
        await apiRequest("PATCH", `/api/programs/${editingProduct.id}`, payload);
      } else {
        const result = await apiRequest("POST", "/api/programs", payload) as any;
        productId = result.id;
      }
      
      // Save suggested programs for this product
      if (productId) {
        await apiRequest("PUT", `/api/products/${productId}/suggested-for-programs`, {
          programIds: selectedSuggestedPrograms
        });
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: editingProduct ? "Product updated" : "Product created" });
      setIsDialogOpen(false);
      setEditingProduct(null);
      setSelectedSuggestedPrograms([]);
      setProductImageUrl("");
      form.reset();
    },
    onError: (error: any) => {
      console.error("Failed to save product:", error);
      toast({ 
        title: "Failed to save product", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/programs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Product deleted" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleEdit = async (product: any) => {
    setEditingProduct(product);
    setProductImageUrl(product.coverImageUrl || "");
    form.reset({
      organizationId: product.organizationId,
      name: product.name,
      description: product.description || "",
      price: product.price || 0,
      inventorySizes: product.inventorySizes || [],
      inventoryCount: product.inventoryCount || 0,
      sizeStock: product.sizeStock || {},
      shippingRequired: product.shippingRequired || false,
      isActive: product.isActive ?? true,
      storeCategory: product.tags?.[0] || "gear",
      sessionCount: product.sessionCount,
      isRecurring: product.type === "Subscription",
      billingCycle: product.billingCycle || "Monthly",
      billingIntervalDays: product.billingIntervalDays || (product.billingCycle === "Weekly" ? 7 : product.billingCycle === "28-Day" ? 28 : product.billingCycle === "Quarterly" ? 90 : product.billingCycle === "6-Month" ? 180 : product.billingCycle === "Yearly" ? 365 : 30),
      subscriptionDisclosure: product.subscriptionDisclosure || "",
      requiredWaivers: product.requiredWaivers || [],
    });
    
    // Fetch current suggested programs for this product
    try {
      const response = await fetch(`/api/products/${product.id}/suggested-for-programs`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSuggestedPrograms(data.programIds || []);
      } else {
        setSelectedSuggestedPrograms([]);
      }
    } catch {
      setSelectedSuggestedPrograms([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setSelectedSuggestedPrograms([]);
    setProductImageUrl("");
    form.reset({
      organizationId: organization?.id || "",
      name: "",
      description: "",
      price: 0,
      inventorySizes: [],
      inventoryCount: 0,
      sizeStock: {},
      shippingRequired: false,
      isActive: true,
      storeCategory: "gear",
      isRecurring: false,
      billingCycle: "Monthly",
      billingIntervalDays: 30,
      subscriptionDisclosure: "",
      requiredWaivers: [],
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      // Get auth token from localStorage for file upload
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      setProductImageUrl(data.imageUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Failed to upload image", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadStoreTemplate = () => {
    const csvContent = "Name,Type,Description,Price,Credits,Access Tag,Is Active\nTeam Jersey,goods,Official team jersey,4999,0,none,true\nWater Bottle,goods,Team branded bottle,1499,0,none,true";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadStoreData = () => {
    const csvHeaders = "Name,Type,Description,Price,Credits,Access Tag,Is Active";
    const csvRows = storeProducts.map((product: any) => {
      return [
        product.name || "",
        product.productCategory || "goods",
        product.description || "",
        product.price || 0,
        product.sessionCount || 0,
        product.accessTag || "none",
        product.isActive !== false ? "true" : "false"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadStore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/programs", {
            organizationId: organization?.id,
            name: values[0],
            productCategory: "goods",
            type: "One-Time",
            description: values[2] || "",
            price: parseInt(values[3]) || 0,
            sessionCount: parseInt(values[4]) || 0,
            accessTag: values[5] || "none",
            isActive: values[6]?.toLowerCase() !== "false",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create product:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} products` });
    setIsBulkUploadOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store - Merchandise & Gear</CardTitle>
          <CardDescription>Manage physical products and inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12" data-testid="loading-store">
            <BanterLoader />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Store - Merchandise & Gear</CardTitle>
            <CardDescription>Physical products like jerseys, equipment, and merchandise</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-store">
                  <Upload className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Products</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Type, Description, Price, Credits, Access Tag, Is Active</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUploadStore}
                    data-testid="input-store-csv-upload"
                  />
                  <Button variant="outline" className="w-full" onClick={downloadStoreTemplate} data-testid="button-download-store-template">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="icon" title="Download Data" onClick={downloadStoreData} data-testid="button-download-store">
              <Download className="w-4 h-4" />
            </Button>
            
            <Button size="icon" title="Add Product" onClick={handleCreate} data-testid="button-create-store-product">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedProductIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedProductIds.size} product{selectedProductIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedProductIds.size} product(s)?`)) {
                  bulkDeleteProducts.mutate(Array.from(selectedProductIds));
                }
              }}
              disabled={bulkDeleteProducts.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteProducts.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProductIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        {storeProducts.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-store">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-medium">No merchandise yet</p>
            <p className="text-gray-500 text-sm mt-2">Add jerseys, equipment, or other physical products</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={storeProducts.length > 0 && selectedProductIds.size === storeProducts.length}
                    onCheckedChange={() => toggleAllProducts(storeProducts.map((p: any) => p.id))}
                    aria-label="Select all products"
                  />
                </TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeProducts.map((product: any) => (
                <TableRow key={product.id} data-testid={`row-store-${product.id}`}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedProductIds.has(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {product.coverImageUrl ? (
                      <img 
                        src={product.coverImageUrl} 
                        alt={product.name} 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-store-name-${product.id}`}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.tags?.[0] ? (
                      <Badge variant="outline" className="capitalize">
                        {STORE_CATEGORIES.find(c => c.value === product.tags[0])?.label || product.tags[0]}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(product.price)}
                    {product.type === "Subscription" && product.billingCycle && (
                      <span className="text-xs text-gray-500 block">/{product.billingCycle.toLowerCase()}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.type === "Subscription" ? (
                      <Badge className="bg-amber-100 text-amber-700 border-0">Subscription</Badge>
                    ) : product.type === "Pack" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-0">Pack</Badge>
                    ) : (
                      <Badge variant="outline">One-Time</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.inventorySizes?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.inventorySizes.slice(0, 4).map((size: string) => (
                          <Badge key={size} variant="outline" className="text-xs">{size}</Badge>
                        ))}
                        {product.inventorySizes.length > 4 && (
                          <Badge variant="outline" className="text-xs">+{product.inventorySizes.length - 4}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.sizeStock && Object.keys(product.sizeStock).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(product.sizeStock as Record<string, number>).slice(0, 3).map(([size, count]) => {
                          const stockCount = count as number;
                          return (
                            <Badge 
                              key={size} 
                              variant={stockCount > 10 ? "outline" : stockCount > 0 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {size}: {stockCount}
                            </Badge>
                          );
                        })}
                        {Object.keys(product.sizeStock).length > 3 && (
                          <Badge variant="outline" className="text-xs">+{Object.keys(product.sizeStock).length - 3}</Badge>
                        )}
                      </div>
                    ) : product.inventoryCount !== undefined && product.inventoryCount !== null ? (
                      <Badge variant={product.inventoryCount > 10 ? "outline" : product.inventoryCount > 0 ? "secondary" : "destructive"}>
                        {product.inventoryCount}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        data-testid={`button-edit-store-${product.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Simple Store Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-store">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createProduct.mutate(data), (errors) => {
                console.error("Form validation errors:", errors);
                const firstError = Object.values(errors)[0] as { message?: string };
                toast({ 
                  title: "Please fix form errors", 
                  description: firstError?.message || "Check required fields",
                  variant: "destructive" 
                });
              })} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Team Jersey" {...field} data-testid="input-store-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Official team jersey with custom name and number" {...field} data-testid="input-store-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "gear"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-store-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-4">
                  {productImageUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={productImageUrl} alt="Product" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductImageUrl("")}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      data-testid="input-product-image"
                    />
                    {uploadingImage && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => {
                  const [displayPrice, setDisplayPrice] = useState(field.value ? (field.value / 100).toString() : "");
                  
                  useEffect(() => {
                    if (field.value !== undefined) {
                      setDisplayPrice(field.value > 0 ? (field.value / 100).toString() : "");
                    }
                  }, [editingProduct]);
                  
                  return (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="49.99"
                          data-testid="input-store-price"
                          value={displayPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDisplayPrice(val);
                            if (val === "" || val === ".") {
                              field.onChange(0);
                            } else {
                              const parsed = parseFloat(val);
                              field.onChange(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Payment Options - Recurring Toggle and Billing Cycle */}
              <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-medium">Payment Options</Label>
                
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-is-recurring"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Recurring Payment (Subscription)</FormLabel>
                    </FormItem>
                  )}
                />

                {isRecurring && (
                  <>
                    <FormField
                      control={form.control}
                      name="billingIntervalDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Interval (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-billing-interval-days"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {(() => {
                              const d = field.value;
                              if (!d || d <= 0) return "e.g. 30 = monthly, 90 = quarterly, 180 = 6 months, 365 = yearly";
                              if (d === 7) return "Charges every week";
                              if (d === 14) return "Charges every 2 weeks";
                              if (d === 28) return "Charges every 28 days";
                              if (d === 30) return "Charges monthly";
                              if (d === 60) return "Charges every 2 months";
                              if (d === 90) return "Charges every 3 months (quarterly)";
                              if (d === 180) return "Charges every 6 months";
                              if (d === 365) return "Charges yearly";
                              return `Charges every ${d} days`;
                            })()}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subscriptionDisclosure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Disclosure</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="You will be charged $X every [cycle]. Your subscription renews automatically until canceled. Cancel anytime from your account."
                              rows={3}
                              data-testid="input-subscription-disclosure"
                            />
                          </FormControl>
                          <FormDescription>
                            Displayed to customers before checkout. Explain billing terms, auto-renewal, and cancellation policy.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              {/* Apparel-specific fields: sizes, stock, shipping */}
              {selectedStoreCategory === "gear" && (
                <>
                  <FormField
                    control={form.control}
                    name="inventorySizes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Sizes</FormLabel>
                        <FormDescription>Select which sizes are available</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["XS", "S", "M", "L", "XL", "2XL", "3XL", "YS", "YM", "YL"].map((size) => (
                            <div key={size} className="flex items-center space-x-1">
                              <Checkbox
                                checked={(field.value || []).includes(size)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, size]);
                                  } else {
                                    field.onChange(current.filter((s: string) => s !== size));
                                    // Clean up sizeStock when size is deselected
                                    const currentStock = form.getValues("sizeStock") || {};
                                    const { [size]: _, ...rest } = currentStock as Record<string, number>;
                                    form.setValue("sizeStock", rest);
                                  }
                                }}
                                data-testid={`checkbox-size-${size.toLowerCase()}`}
                              />
                              <Label className="text-sm font-normal">{size}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Size-specific stock inputs - shown when sizes are selected */}
                  {(form.watch("inventorySizes") || []).length > 0 ? (
                    <FormField
                      control={form.control}
                      name="sizeStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock per Size</FormLabel>
                          <FormDescription>Enter quantity available for each size</FormDescription>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {(form.watch("inventorySizes") || []).map((size: string) => (
                              <div key={size} className="flex items-center gap-2">
                                <Label className="w-12 text-sm font-medium">{size}</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  className="w-20"
                                  value={(field.value as Record<string, number>)?.[size] ?? ""}
                                  onChange={(e) => {
                                    const rawVal = e.target.value;
                                    const val = rawVal === "" ? 0 : parseInt(rawVal, 10);
                                    const safeVal = isNaN(val) ? 0 : val;
                                    const current = (field.value as Record<string, number>) || {};
                                    field.onChange({ ...current, [size]: safeVal });
                                  }}
                                  data-testid={`input-stock-${size.toLowerCase()}`}
                                />
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="inventoryCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Stock Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="50"
                              min="0"
                              {...field}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || "0", 10);
                                field.onChange(isNaN(val) ? 0 : val);
                              }}
                              value={field.value ?? ""}
                              data-testid="input-stock-count"
                            />
                          </FormControl>
                          <FormDescription>Leave empty for unlimited (select sizes above for size-specific stock)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="shippingRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-shipping-required"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Shipping Required</FormLabel>
                        <FormDescription className="!mt-0 ml-2 text-xs">(vs. pickup only)</FormDescription>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Training-specific fields: session count */}
              {selectedStoreCategory === "training" && (
                <FormField
                  control={form.control}
                  name="sessionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sessions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value || "0"))}
                          value={field.value || ""}
                          data-testid="input-store-session-count"
                        />
                      </FormControl>
                      <FormDescription>Sessions remaining decreases with each check-in</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-product-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active (available for purchase)</FormLabel>
                  </FormItem>
                )}
              />

              {/* Required Waivers */}
              {storeWaivers.length > 0 && (
                <FormField
                  control={form.control}
                  name="requiredWaivers"
                  render={({ field }) => (
                    <FormItem className="pt-4 border-t">
                      <FormLabel>Required Waivers</FormLabel>
                      <div className="space-y-2 border rounded-md p-3">
                        {storeWaivers.map((waiver: any) => (
                          <div key={waiver.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value?.includes(waiver.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, waiver.id]);
                                } else {
                                  field.onChange(current.filter((id: string) => id !== waiver.id));
                                }
                              }}
                              data-testid={`checkbox-waiver-${waiver.id}`}
                            />
                            <span className="text-sm">{waiver.name}</span>
                          </div>
                        ))}
                      </div>
                      <FormDescription>Customers must sign these waivers before purchasing</FormDescription>
                    </FormItem>
                  )}
                />
              )}

              {/* Suggested Add-on for Programs */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Suggest as Add-on for Programs
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  When selected, this product will appear as a suggested add-on during registration for these programs
                </p>
                {programOptions.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No programs available</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                    {programOptions.map((program: any) => (
                      <div key={program.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedSuggestedPrograms.includes(program.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSuggestedPrograms([...selectedSuggestedPrograms, program.id]);
                            } else {
                              setSelectedSuggestedPrograms(selectedSuggestedPrograms.filter(id => id !== program.id));
                            }
                          }}
                          data-testid={`checkbox-suggest-for-${program.id}`}
                        />
                        <Label className="text-sm font-normal cursor-pointer">{program.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedSuggestedPrograms.length > 0 && (
                  <p className="text-xs text-green-600">
                    This product will be suggested for {selectedSuggestedPrograms.length} program(s)
                  </p>
                )}
              </div>

              {/* Coupons Section */}
              <div className="border rounded-lg p-3 mt-3 bg-purple-50">
                <div className="flex items-center gap-2 mb-2">
                  <Ticket className="h-4 w-4 text-purple-600" />
                  <h4 className="font-medium text-sm">Coupons</h4>
                </div>
                <p className="text-xs text-gray-500 mb-3">Generate discount coupons for this product. Coupons expire 24 hours after creation.</p>
                {editingProduct?.id ? (
                  <InlineCouponSection programId={editingProduct.id} />
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                    <p className="text-sm text-gray-400">Save the product first to create coupons.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProduct.isPending} data-testid="button-save-store-product">
                  {createProduct.isPending ? "Saving..." : (editingProduct ? "Update" : "Add Product")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProduct.mutate(deleteConfirm.id)}
              disabled={deleteProduct.isPending}
              data-testid="button-confirm-delete-store"
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Programs Tab Component - Manages programs with social settings AND pricing
function ProgramsTab({ programs: allPrograms, teams, organization }: any) {
  const programs = allPrograms.filter((p: any) => p.productCategory === 'service' || !p.productCategory);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [deleteConfirmProgram, setDeleteConfirmProgram] = useState<any>(null);
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set());
  const [availabilitySlots, setAvailabilitySlots] = useState<{dayOfWeek: number, startTime: string, endTime: string}[]>([]);
  const [expandedPricingOptions, setExpandedPricingOptions] = useState<Set<string>>(new Set());
  const tableRef = useDragScroll();

  const toggleProgramActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/programs/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
    onError: () => {
      toast({ title: "Failed to update program status", variant: "destructive" });
    },
  });

  const bulkDeletePrograms = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/programs/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      const count = selectedProgramIds.size;
      setSelectedProgramIds(new Set());
      toast({ title: `${count} program(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some programs", variant: "destructive" });
    },
  });

  const toggleProgramSelection = (programId: string) => {
    setSelectedProgramIds(prev => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
      } else {
        next.add(programId);
      }
      return next;
    });
  };

  const toggleAllPrograms = (programIds: string[]) => {
    if (selectedProgramIds.size === programIds.length) {
      setSelectedProgramIds(new Set());
    } else {
      setSelectedProgramIds(new Set(programIds));
    }
  };

  const { data: waivers = [] } = useQuery<any[]>({
    queryKey: ["/api/waivers"],
  });

  // Fetch store products (goods) for add-on selection
  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });
  const storeProducts = allProducts.filter((p: any) => p.productCategory === 'goods' && p.isActive !== false);
  
  // State for selected add-ons
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // Fetch existing add-ons when editing
  const { data: existingAddOns = [] } = useQuery<any[]>({
    queryKey: ["/api/programs", editingProgram?.id, "suggested-add-ons"],
    queryFn: async () => {
      if (!editingProgram?.id) return [];
      const response = await fetch(`/api/programs/${editingProgram.id}/suggested-add-ons`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!editingProgram?.id,
  });

  // Update selected add-ons when editing an existing program
  useEffect(() => {
    if (existingAddOns.length > 0) {
      setSelectedAddOns(existingAddOns.map((a: any) => a.productId || a.product?.id));
    } else if (!editingProgram) {
      setSelectedAddOns([]);
    }
  }, [existingAddOns, editingProgram]);

  useEffect(() => {
    if (editingProgram?.id) {
      fetch(`/api/programs/${editingProgram.id}/availability`)
        .then(res => res.ok ? res.json() : [])
        .then((slots: any[]) => {
          setAvailabilitySlots(slots.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })));
        })
        .catch(() => setAvailabilitySlots([]));
    } else {
      setAvailabilitySlots([]);
    }
  }, [editingProgram]);

  const handleViewProgram = (programId: string) => {
    navigate(`/admin/programs/${programId}`);
  };

  const form = useForm({
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      description: "",
      type: "Subscription",
      price: 0,
      billingCycle: "Monthly",
      billingIntervalDays: 30,
      billingModel: "Per Player",
      durationDays: 90,
      durationValue: 90,
      durationUnit: "days",
      allowInstallments: false,
      installments: 3,
      installmentPrice: 0,
      payInFullDiscount: 0,
      accessTag: "club_member",
      sessionCount: undefined as number | undefined,
      subscriptionDisclosure: "",
      requiredWaivers: [] as string[],
      hasSubgroups: true,
      subgroupLabel: "Team",
      rosterVisibility: "members",
      chatMode: "two_way",
      isActive: true,
      productCategory: "service",
      displayCategory: "general",
      iconName: "",
      comparePrice: undefined as number | undefined,
      savingsNote: "",
      coverImageUrl: "",
      pricingOptions: [] as Array<{
        id: string;
        name: string;
        price: number;
        billingCycle?: string;
        billingIntervalDays?: number;
        durationDays?: number;
        comparePrice?: number;
        savingsNote?: string;
        isDefault?: boolean;
      }>,
      scheduleRequestEnabled: false,
      sessionLengthMinutes: undefined as number | undefined,
    },
  });

  const selectedType = form.watch("type");
  const selectedAccessTag = form.watch("accessTag");
  const allowInstallments = form.watch("allowInstallments");
  const watchedPrice = form.watch("price");
  const watchedBillingIntervalDays = form.watch("billingIntervalDays");
  const watchedSubscriptionDisclosure = form.watch("subscriptionDisclosure");
  
  // Auto-generate subscription disclosure when price or billing interval changes
  useEffect(() => {
    if (selectedType === "Subscription" && watchedPrice !== undefined && watchedBillingIntervalDays) {
      const priceInDollars = (watchedPrice / 100).toFixed(2);
      const days = watchedBillingIntervalDays;
      const cycleText = days === 7 ? "week" : days === 14 ? "2 weeks" : days === 30 ? "month" : days === 90 ? "3 months" : days === 180 ? "6 months" : days === 365 ? "year" : `${days} days`;
      const generatedDisclosure = `You will be charged $${priceInDollars} every ${cycleText}. Your subscription renews automatically until canceled. Cancel anytime from your account.`;
      
      // Only auto-fill if the field is empty or matches a previously generated pattern
      if (!watchedSubscriptionDisclosure || 
          watchedSubscriptionDisclosure.startsWith("You will be charged $")) {
        form.setValue("subscriptionDisclosure", generatedDisclosure);
      }
    }
  }, [selectedType, watchedPrice, watchedBillingIntervalDays, form]);

  const createProgram = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        organizationId: organization?.id,
        productCategory: "service",
      };
      if (editingProgram) {
        const result = await apiRequest("PATCH", `/api/programs/${editingProgram.id}`, payload);
        // Save suggested add-ons
        if (selectedAddOns.length > 0 || existingAddOns.length > 0) {
          await apiRequest("PUT", `/api/programs/${editingProgram.id}/suggested-add-ons`, { productIds: selectedAddOns });
        }
        const progId = editingProgram.id;
        if (progId && data.scheduleRequestEnabled) {
          await apiRequest("PUT", `/api/programs/${progId}/availability`, { slots: availabilitySlots.map(s => ({ ...s, isRecurring: true })) });
        }
        return result;
      }
      const result = await apiRequest("POST", "/api/programs", payload);
      // Save suggested add-ons for new program
      if (selectedAddOns.length > 0 && result?.id) {
        await apiRequest("PUT", `/api/programs/${result.id}/suggested-add-ons`, { productIds: selectedAddOns });
      }
      const progId = editingProgram ? (editingProgram as any).id : result?.id;
      if (progId && data.scheduleRequestEnabled) {
        await apiRequest("PUT", `/api/programs/${progId}/availability`, { slots: availabilitySlots.map(s => ({ ...s, isRecurring: true })) });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey.includes("program-memberships")
      });
      toast({ title: editingProgram ? "Program updated successfully" : "Program created successfully" });
      setIsDialogOpen(false);
      setEditingProgram(null);
      setSelectedAddOns([]);
      setAvailabilitySlots([]);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Program save error:', error);
      toast({ title: "Failed to save program", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/programs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete program", variant: "destructive" });
    },
  });

  const handleEdit = (program: any) => {
    setEditingProgram(program);
    const durationDays = program.durationDays || 90;
    let durationValue = durationDays;
    let durationUnit = "days";
    if (durationDays % 365 === 0 && durationDays >= 365) {
      durationValue = durationDays / 365;
      durationUnit = "years";
    } else if (durationDays % 30 === 0 && durationDays >= 30) {
      durationValue = durationDays / 30;
      durationUnit = "months";
    } else if (durationDays % 7 === 0 && durationDays >= 7) {
      durationValue = durationDays / 7;
      durationUnit = "weeks";
    }
    form.reset({
      organizationId: program.organizationId,
      name: program.name,
      description: program.description || "",
      type: program.type || "Subscription",
      price: program.price || 0,
      billingCycle: program.billingCycle || "Monthly",
      billingIntervalDays: program.billingIntervalDays || (program.billingCycle === "Weekly" ? 7 : program.billingCycle === "28-Day" ? 28 : program.billingCycle === "Quarterly" ? 90 : program.billingCycle === "6-Month" ? 180 : program.billingCycle === "Yearly" ? 365 : program.billingCycle?.endsWith("-Day") ? parseInt(program.billingCycle) || 30 : 30),
      billingModel: program.billingModel || "Per Player",
      durationDays: durationDays,
      durationValue: durationValue,
      durationUnit: durationUnit,
      allowInstallments: program.allowInstallments || false,
      installments: program.installments || 3,
      installmentPrice: program.installmentPrice || 0,
      payInFullDiscount: program.payInFullDiscount || 0,
      accessTag: program.accessTag || "club_member",
      sessionCount: program.sessionCount,
      subscriptionDisclosure: program.subscriptionDisclosure || "",
      requiredWaivers: program.requiredWaivers || [],
      hasSubgroups: program.hasSubgroups ?? true,
      subgroupLabel: program.subgroupLabel || "Team",
      rosterVisibility: program.rosterVisibility || "members",
      chatMode: program.chatMode || "two_way",
      isActive: program.isActive ?? true,
      productCategory: "service",
      // Multi-tier pricing fields
      comparePrice: program.comparePrice,
      savingsNote: program.savingsNote || "",
      displayCategory: program.displayCategory || "general",
      iconName: program.iconName || "",
      coverImageUrl: program.coverImageUrl || "",
      pricingOptions: (program.pricingOptions || []).map((opt: any) =>
        opt.id ? opt : { ...opt, id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` }
      ),
      scheduleRequestEnabled: program.scheduleRequestEnabled || false,
      sessionLengthMinutes: program.sessionLengthMinutes,
    });
    setExpandedPricingOptions(new Set());
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProgram(null);
      setSelectedAddOns([]);
      setExpandedPricingOptions(new Set());
      form.reset({
        organizationId: organization?.id || "",
        name: "",
        description: "",
        type: "Subscription",
        price: 0,
        billingCycle: "Monthly",
        billingIntervalDays: 30,
        billingModel: "Per Player",
        durationDays: 90,
        durationValue: 90,
        durationUnit: "days",
        allowInstallments: false,
        installments: 3,
        installmentPrice: 0,
        payInFullDiscount: 0,
        accessTag: "club_member",
        sessionCount: undefined,
        subscriptionDisclosure: "",
        requiredWaivers: [],
        hasSubgroups: true,
        subgroupLabel: "Team",
        rosterVisibility: "members",
        chatMode: "two_way",
        isActive: true,
        productCategory: "service",
        displayCategory: "general",
        iconName: "",
        comparePrice: undefined,
        savingsNote: "",
        coverImageUrl: "",
        pricingOptions: [],
        scheduleRequestEnabled: false,
        sessionLengthMinutes: undefined,
      });
    } else if (!editingProgram) {
      // Opening dialog for NEW program - reset to clean defaults
      setSelectedAddOns([]);
      form.reset({
        organizationId: organization?.id || "",
        name: "",
        description: "",
        type: "Subscription",
        price: 0,
        billingCycle: "Monthly",
        billingIntervalDays: 30,
        billingModel: "Per Player",
        durationDays: 90,
        durationValue: 90,
        durationUnit: "days",
        allowInstallments: false,
        installments: 3,
        installmentPrice: 0,
        payInFullDiscount: 0,
        accessTag: "club_member",
        sessionCount: undefined,
        subscriptionDisclosure: "",
        requiredWaivers: [],
        hasSubgroups: true,
        subgroupLabel: "Team",
        rosterVisibility: "members",
        chatMode: "two_way",
        isActive: true,
        productCategory: "service",
        displayCategory: "general",
        iconName: "",
        comparePrice: undefined,
        savingsNote: "",
        coverImageUrl: "",
        pricingOptions: [],
        scheduleRequestEnabled: false,
        sessionLengthMinutes: undefined,
      });
    }
  };

  const getTeamsForProgram = (programId: string) => {
    return teams.filter((t: any) => t.programId === programId);
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isUploadingPrograms, setIsUploadingPrograms] = useState(false);

  const downloadProgramTemplate = () => {
    const csvContent = "Name,Description,Type,Price,Billing Cycle,Access Tag,Duration Days,Session Count,Compare Price,Savings Note,Is Active\nYouth Club Monthly,Monthly basketball membership,Subscription,7500,Monthly,club_member,30,,,,true\n10-Session Pack,Credit-based training,Pack,5000,,pack_holder,,10,,,true";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadProgramsData = () => {
    const csvHeaders = "Name,Description,Type,Price,Billing Cycle,Access Tag,Duration Days,Session Count,Compare Price,Savings Note,Is Active";
    const servicePrograms = programs.filter((p: any) => p.productCategory === 'service' || !p.productCategory);
    const csvRows = servicePrograms.map((program: any) => {
      return [
        program.name || "",
        program.description || "",
        program.type || "Subscription",
        program.price || 0,
        program.billingCycle || "",
        program.accessTag || "club_member",
        program.durationDays || "",
        program.sessionCount || "",
        program.comparePrice || "",
        program.savingsNote || "",
        program.isActive !== false ? "true" : "false"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleBulkUploadPrograms = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploadingPrograms) return;
    setIsUploadingPrograms(true);
    
    try {
      const text = await file.text();
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
        return;
      }

      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim().replace(/\r/g, ''));
      
      const isStripeFormat = headers.includes('price id') && headers.includes('product id');
      
      if (isStripeFormat) {
        const priceIdIdx = headers.indexOf('price id');
        const productIdIdx = headers.indexOf('product id');
        const productNameIdx = headers.indexOf('product name');
        const descriptionIdx = headers.indexOf('description');
        const amountIdx = headers.indexOf('amount');
        const intervalIdx = headers.indexOf('interval');
        const intervalCountIdx = headers.indexOf('interval count');
        
        if (productNameIdx === -1 || amountIdx === -1) {
          toast({ title: "Invalid Stripe CSV", description: "Missing required columns: Product Name and Amount", variant: "destructive" });
          return;
        }
        
        const productGroups: Record<string, {
          productId: string;
          productName: string;
          prices: Array<{
            priceId: string;
            description: string;
            amount: number;
            interval: string;
            intervalCount: number;
          }>;
        }> = {};
        
        const dataLines = lines.slice(1);
        for (const line of dataLines) {
          const values = parseCSVLine(line).map(v => v.replace(/\r/g, ''));
          const productId = values[productIdIdx] || '';
          const productName = values[productNameIdx] || '';
          const priceId = values[priceIdIdx] || '';
          const description = (descriptionIdx >= 0 ? values[descriptionIdx] : '') || productName;
          const amount = parseFloat(values[amountIdx]) || 0;
          const interval = (intervalIdx >= 0 ? values[intervalIdx] : '') || '';
          const intervalCount = (intervalCountIdx >= 0 ? parseInt(values[intervalCountIdx]) : 0) || 1;
          
          if (!productId || !productName) continue;
          
          if (!productGroups[productId]) {
            productGroups[productId] = {
              productId,
              productName,
              prices: []
            };
          }
          
          productGroups[productId].prices.push({
            priceId,
            description,
            amount,
            interval,
            intervalCount
          });
        }
        
        const productGroupsList = Object.values(productGroups);
        if (productGroupsList.length === 0) {
          toast({ title: "No products found", description: "The CSV file did not contain any valid product data", variant: "destructive" });
          return;
        }
        
        let successCount = 0;
        let skippedCount = 0;
        
        for (const group of productGroupsList) {
          const existingProgram = programs.find((p: any) => 
            p.name === group.productName || (p.stripeProductId && p.stripeProductId === group.productId)
          );
          
          if (existingProgram) {
            skippedCount++;
            continue;
          }
          
          const monthlyPrice = group.prices.find(p => 
            (p.interval === 'month' && p.intervalCount === 1) ||
            (p.interval === 'day' && p.intervalCount === 28) ||
            (p.interval === 'week' && p.intervalCount === 4)
          );
          const monthlyAmount = monthlyPrice?.amount || 0;
          
          const pricingOptions = group.prices.map((price, idx) => {
            let billingCycle = 'One-time';
            let durationDays: number | undefined;
            let months: number | null = null;
            
            if (!price.interval || price.interval === '') {
              billingCycle = 'One-time';
              durationDays = undefined;
            } else if (price.interval === 'month') {
              if (price.intervalCount === 1) {
                billingCycle = 'Monthly';
                durationDays = 28;
                months = 1;
              } else {
                billingCycle = 'One-time';
                durationDays = price.intervalCount * 28;
                months = price.intervalCount;
              }
            } else if (price.interval === 'day') {
              billingCycle = 'One-time';
              durationDays = price.intervalCount;
              months = price.intervalCount % 28 === 0 ? price.intervalCount / 28 : null;
            } else if (price.interval === 'week') {
              billingCycle = 'One-time';
              durationDays = price.intervalCount * 7;
              months = (price.intervalCount * 7) % 28 === 0 ? (price.intervalCount * 7) / 28 : null;
            } else if (price.interval === 'year') {
              billingCycle = 'Yearly';
              durationDays = 365 * price.intervalCount;
              months = null;
            }
            
            let savingsNote: string | undefined;
            let comparePrice: number | undefined;
            
            if (monthlyAmount > 0 && months !== null && months > 1) {
              const equivalentTotal = monthlyAmount * months;
              const savingsAmount = equivalentTotal - price.amount;
              if (savingsAmount > 0) {
                savingsNote = `Save $${Math.round(savingsAmount)}!`;
                comparePrice = Math.round(equivalentTotal * 100);
              }
            }
            
            return {
              id: `opt_${Date.now()}_${idx}`,
              name: price.description || `Option ${idx + 1}`,
              price: Math.round(price.amount * 100),
              billingCycle,
              durationDays,
              stripePriceId: price.priceId,
              isDefault: idx === 0,
              savingsNote,
              comparePrice
            };
          });
          
          const firstPrice = pricingOptions[0];
          
          try {
            await apiRequest("POST", "/api/programs", {
              organizationId: organization?.id,
              name: group.productName,
              description: "",
              type: "Subscription",
              price: firstPrice?.price || 0,
              billingCycle: firstPrice?.billingCycle || "Monthly",
              durationDays: firstPrice?.durationDays,
              accessTag: "club_member",
              stripeProductId: group.productId,
              stripePriceId: firstPrice?.stripePriceId,
              pricingOptions,
              isActive: true,
              productCategory: "service",
            });
            successCount++;
          } catch (error) {
            console.error("Failed to create program:", group.productName, error);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
        const message = skippedCount > 0 
          ? `Created ${successCount} programs (${skippedCount} skipped - already exist)`
          : `Created ${successCount} programs with pricing options`;
        toast({ title: `Stripe import complete`, description: message });
        setIsBulkUploadOpen(false);
        return;
      }
      
      const dataLines = lines.slice(1);
      let successCount = 0;
      for (const line of dataLines) {
        const values = parseCSVLine(line);
        if (values.length >= 1 && values[0]) {
          try {
            await apiRequest("POST", "/api/programs", {
              organizationId: organization?.id,
              name: values[0],
              description: values[1] || "",
              type: values[2] || "Subscription",
              price: parseInt(values[3]) || 0,
              billingCycle: values[4] || "Monthly",
              accessTag: values[5] || "club_member",
              durationDays: values[6] ? parseInt(values[6]) : undefined,
              sessionCount: values[7] ? parseInt(values[7]) : undefined,
              comparePrice: values[8] ? parseInt(values[8]) : undefined,
              savingsNote: values[9] || undefined,
              isActive: values[10]?.toLowerCase() !== "false",
              productCategory: "service",
            });
            successCount++;
          } catch (error) {
            console.error("Failed to create program:", error);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: `Bulk upload complete`, description: `Created ${successCount} programs` });
      setIsBulkUploadOpen(false);
    } catch (error) {
      console.error("CSV upload error:", error);
      toast({ title: "Upload failed", description: "An error occurred while processing the CSV file", variant: "destructive" });
    } finally {
      setIsUploadingPrograms(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Programs</CardTitle>
          <CardDescription>Create and manage programs with teams/groups and social settings</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-programs">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Programs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Stripe Import (Recommended)</p>
                  <p className="text-sm text-gray-600">Download your prices.csv directly from Stripe and upload it here. Prices will be grouped by product automatically.</p>
                  <p className="text-sm font-medium mt-3">Manual Format</p>
                  <p className="text-sm text-gray-600">Or use columns: Name, Description, Type, Price (in cents), Billing Cycle, Access Tag, Duration Days, Session Count, Compare Price, Savings Note, Is Active</p>
                </div>
                {isUploadingPrograms ? (
                  <div className="flex items-center justify-center py-4 gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    <span className="text-sm text-gray-600">Importing programs...</span>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUploadPrograms}
                    data-testid="input-program-csv-upload"
                  />
                )}
                <Button variant="outline" className="w-full" onClick={downloadProgramTemplate} disabled={isUploadingPrograms} data-testid="button-download-program-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadProgramsData} data-testid="button-download-programs">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Program" data-testid="button-create-program">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProgram ? "Edit Program" : "Create New Program"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createProgram.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="High School Club" data-testid="input-program-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Competitive basketball program for high school players" data-testid="input-program-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="displayCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-program-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="basketball">Basketball</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="camps">Camps</SelectItem>
                            <SelectItem value="clinics">Clinics</SelectItem>
                            <SelectItem value="league">League</SelectItem>
                            <SelectItem value="tournament">Tournament</SelectItem>
                            <SelectItem value="membership">Membership</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iconName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-program-icon">
                              <SelectValue placeholder="Select icon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="basketball">Basketball</SelectItem>
                            <SelectItem value="target">Target</SelectItem>
                            <SelectItem value="tent">Tent (Camps)</SelectItem>
                            <SelectItem value="users">Users (Team)</SelectItem>
                            <SelectItem value="trophy">Trophy</SelectItem>
                            <SelectItem value="calendar">Calendar</SelectItem>
                            <SelectItem value="star">Star</SelectItem>
                            <SelectItem value="medal">Medal</SelectItem>
                            <SelectItem value="crown">Crown</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="coverImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover Image</FormLabel>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="aspect-[16/9] w-full max-w-xs bg-gray-100 rounded-lg overflow-hidden relative">
                            <img src={field.value} alt="Cover" className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => field.onChange("")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {!field.value && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              className="flex-1"
                              data-testid="input-program-cover-image"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const formData = new FormData();
                                  formData.append('image', file);
                                  try {
                                    const headers: Record<string, string> = {};
                                    const token = localStorage.getItem('authToken');
                                    if (token) headers['Authorization'] = `Bearer ${token}`;
                                    const res = await fetch('/api/upload/product-image', { method: 'POST', body: formData, credentials: 'include', headers });
                                    const data = await res.json();
                                    if (data.imageUrl) {
                                      field.onChange(data.imageUrl);
                                    } else if (data.error) {
                                      console.error('Upload error:', data.error);
                                    }
                                  } catch (err) {
                                    console.error('Upload failed:', err);
                                  }
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <FormDescription>Recommended: 16:9 aspect ratio (1280x720 or similar)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Pricing & Billing</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-program-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Subscription">Subscription (Recurring)</SelectItem>
                              <SelectItem value="One-Time">One-Time Payment</SelectItem>
                              <SelectItem value="Pack">Credit Pack</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => {
                        const [displayPrice, setDisplayPrice] = useState(field.value ? (field.value / 100).toString() : "");
                        
                        useEffect(() => {
                          if (field.value !== undefined) {
                            setDisplayPrice(field.value > 0 ? (field.value / 100).toString() : "");
                          }
                        }, [editingProgram]);
                        
                        return (
                          <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0.00" 
                                data-testid="input-program-price"
                                value={displayPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDisplayPrice(val);
                                  if (val === "" || val === ".") {
                                    field.onChange(0);
                                  } else {
                                    const parsed = parseFloat(val);
                                    field.onChange(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  {selectedType === "Subscription" && (
                    <>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <FormField
                          control={form.control}
                          name="billingIntervalDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Billing Interval (days)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="30"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-billing-interval-days"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                {(() => {
                                  const d = field.value;
                                  if (!d || d <= 0) return "e.g. 30 = monthly, 90 = quarterly, 180 = 6 months";
                                  if (d === 7) return "Charges every week";
                                  if (d === 14) return "Charges every 2 weeks";
                                  if (d === 28) return "Charges every 28 days";
                                  if (d === 30) return "Charges monthly";
                                  if (d === 60) return "Charges every 2 months";
                                  if (d === 90) return "Charges every 3 months (quarterly)";
                                  if (d === 180) return "Charges every 6 months";
                                  if (d === 365) return "Charges yearly";
                                  return `Charges every ${d} days`;
                                })()}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billingModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Billing Model</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-billing-model">
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Per Player">Per Player</SelectItem>
                                  <SelectItem value="Per Family">Per Family</SelectItem>
                                  <SelectItem value="Organization-Wide">Organization-Wide</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="subscriptionDisclosure"
                        render={({ field }) => (
                          <FormItem className="mt-3">
                            <FormLabel>Subscription Disclosure</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="You will be charged $X every [cycle]. Your subscription renews automatically until canceled. Cancel anytime from your account."
                                rows={3}
                                data-testid="input-program-subscription-disclosure"
                              />
                            </FormControl>
                            <FormDescription>
                              Displayed to customers before checkout. Explain billing terms, auto-renewal, and cancellation policy.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {selectedType === "One-Time" && (
                    <div className="mt-3">
                      <FormLabel>Duration</FormLabel>
                      <div className="flex gap-2 mt-1">
                        <FormField
                          control={form.control}
                          name="durationValue"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    field.onChange(value);
                                    const unit = form.getValues("durationUnit") || "days";
                                    const multipliers: Record<string, number> = { days: 1, weeks: 7, months: 30, years: 365 };
                                    form.setValue("durationDays", value * (multipliers[unit] || 1));
                                  }}
                                  placeholder="28" 
                                  data-testid="input-duration-value" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="durationUnit"
                          render={({ field }) => (
                            <FormItem className="w-32">
                              <Select 
                                value={field.value || "days"} 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const numValue = form.getValues("durationValue") || 0;
                                  const multipliers: Record<string, number> = { days: 1, weeks: 7, months: 30, years: 365 };
                                  form.setValue("durationDays", numValue * (multipliers[value] || 1));
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-duration-unit">
                                    <SelectValue placeholder="Unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="days">Days</SelectItem>
                                  <SelectItem value="weeks">Weeks</SelectItem>
                                  <SelectItem value="months">Months</SelectItem>
                                  <SelectItem value="years">Years</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">How long access lasts after purchase</p>
                    </div>
                  )}

                  {selectedType === "Pack" && (
                    <FormField
                      control={form.control}
                      name="sessionCount"
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormLabel>Number of Sessions/Credits</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              placeholder="10" 
                              data-testid="input-session-count" 
                            />
                          </FormControl>
                          <FormDescription>Credits that get used per check-in</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="allowInstallments"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 mt-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-allow-installments"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Allow Installment Payments</FormLabel>
                      </FormItem>
                    )}
                  />

                  {allowInstallments && (() => {
                    const duration = form.watch("durationDays") || 90;
                    const count = form.watch("installments") || 3;
                    const totalPrice = form.watch("price") || 0;
                    const perPayment = totalPrice > 0 && count > 0 ? Math.ceil(totalPrice / count) : 0;
                    const rawInterval = count > 0 ? Math.floor((duration * 0.75) / count) : 30;
                    const standards = [7, 14, 30, 90, 180];
                    const smartInterval = standards.reduce((p, c) => Math.abs(c - rawInterval) < Math.abs(p - rawInterval) ? c : p);
                    const intervalLabel = smartInterval === 7 ? "Weekly"
                      : smartInterval === 14 ? "Bi-Weekly"
                      : smartInterval === 30 ? "Monthly"
                      : smartInterval === 90 ? "Quarterly"
                      : smartInterval === 180 ? "Every 6 months"
                      : `Every ${smartInterval} days`;
                    const totalInstallmentCost = perPayment * count;
                    const totalDays = smartInterval * count;
                    const discount = form.watch("payInFullDiscount") || 0;
                    const discountedFullPrice = discount > 0 ? Math.round(totalPrice * (1 - discount / 100)) : totalPrice;
                    return (
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="installments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Installments</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  placeholder="3" 
                                  data-testid="input-installments" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="payInFullDiscount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pay-in-Full Discount (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  placeholder="0" 
                                  data-testid="input-pay-in-full-discount" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="bg-white/60 rounded p-2 space-y-1">
                        <p className="text-xs text-amber-800 font-medium">
                          {perPayment > 0
                            ? `${count} payments of $${(perPayment / 100).toFixed(2)} · ${intervalLabel} · $${(totalInstallmentCost / 100).toFixed(2)} total`
                            : "Set the option price above to see installment breakdown"}
                        </p>
                        {totalDays > duration && perPayment > 0 && (
                          <p className="text-xs text-amber-600">
                            Payments span {totalDays} days ({duration}-day program)
                          </p>
                        )}
                        {discount > 0 && totalPrice > 0 && (
                          <p className="text-xs text-green-700">
                            Pay-in-full price: ${(discountedFullPrice / 100).toFixed(2)} ({discount}% off)
                          </p>
                        )}
                      </div>
                    </div>
                    );
                  })()}

                  <FormField
                    control={form.control}
                    name="accessTag"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Access Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-access-tag">
                              <SelectValue placeholder="Select access type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="club_member">Club Member (Full Access)</SelectItem>
                            <SelectItem value="pack_holder">Pack Holder (Credit-Based)</SelectItem>
                            <SelectItem value="none">No Special Access</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Determines user's status after purchase</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bundle Pricing Options */}
                  <div className="border rounded-lg p-3 mt-3 bg-blue-50">
                    {/* Pricing Options Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-sm">Pricing Options</h4>
                          <p className="text-xs text-gray-500">Add pricing tiers: one-time bundles, credit packs, or subscriptions</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = form.getValues("pricingOptions") || [];
                            const newId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            form.setValue("pricingOptions", [
                              ...current,
                              {
                                id: newId,
                                name: "",
                                price: 0,
                                optionType: "one_time",
                                billingCycle: "One-Time",
                                durationDays: 90,
                                isDefault: current.length === 0,
                              }
                            ]);
                            setExpandedPricingOptions(prev => new Set([...prev, newId]));
                          }}
                          data-testid="button-add-pricing-option"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                      </div>
                      
                      {(form.watch("pricingOptions") || []).length > 0 && (
                        <div className="space-y-3">
                          {(form.watch("pricingOptions") || []).map((option: any, index: number) => {
                            const isExpanded = expandedPricingOptions.has(option.id);
                            const toggleExpanded = () => {
                              setExpandedPricingOptions(prev => {
                                const next = new Set(prev);
                                if (next.has(option.id)) {
                                  next.delete(option.id);
                                } else {
                                  next.add(option.id);
                                }
                                return next;
                              });
                            };
                            const typeLabel = option.optionType === "credit_pack" ? "Credit Pack"
                              : option.optionType === "subscription" ? "Subscription"
                              : "One-Time";
                            const displayName = option.name || `Option ${index + 1}`;
                            const displayPrice = option.price > 0 ? `$${(option.price / 100).toFixed(2)}` : "No price set";
                            return (
                            <div key={option.id} className="border rounded-md bg-gray-50 overflow-hidden">
                              <div
                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={toggleExpanded}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <ChevronDown className={`h-4 w-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                                  <span className="text-sm font-medium text-gray-800 truncate">{displayName}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0">{typeLabel}</span>
                                  <span className="text-xs text-gray-500 flex-shrink-0">{displayPrice}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = form.getValues("pricingOptions") || [];
                                    const removedId = current[index]?.id;
                                    form.setValue("pricingOptions", current.filter((_: any, i: number) => i !== index));
                                    if (removedId) {
                                      setExpandedPricingOptions(prev => {
                                        const next = new Set(prev);
                                        next.delete(removedId);
                                        return next;
                                      });
                                    }
                                  }}
                                  data-testid={`button-remove-option-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              {isExpanded && (
                              <div className="border-t px-3 pb-3 pt-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <label className="text-xs font-medium">Type</label>
                                  <Select
                                    value={option.optionType || "one_time"}
                                    onValueChange={(value) => {
                                      const current = form.getValues("pricingOptions") || [];
                                      current[index] = { 
                                        ...current[index], 
                                        optionType: value,
                                        billingCycle: value === "credit_pack" ? "One-Time" : value === "subscription" ? (current[index].billingInterval || "monthly") : current[index].billingCycle,
                                      };
                                      form.setValue("pricingOptions", [...current]);
                                    }}
                                  >
                                    <SelectTrigger data-testid={`select-option-type-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="one_time">One-Time Payment</SelectItem>
                                      <SelectItem value="credit_pack">Credit Pack</SelectItem>
                                      <SelectItem value="subscription">Subscription</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Name</label>
                                  <Input
                                    placeholder={option.optionType === "credit_pack" ? "10 Session Pack" : option.optionType === "subscription" ? "Monthly Membership" : "3 Months"}
                                    value={option.name}
                                    onChange={(e) => {
                                      const current = form.getValues("pricingOptions") || [];
                                      current[index] = { ...current[index], name: e.target.value };
                                      form.setValue("pricingOptions", [...current]);
                                    }}
                                    data-testid={`input-option-name-${index}`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Price ($)</label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="195.00"
                                    defaultValue={option.price ? (option.price / 100).toFixed(2) : ""}
                                    onBlur={(e) => {
                                      const current = form.getValues("pricingOptions") || [];
                                      const val = parseFloat(e.target.value);
                                      const newPrice = isNaN(val) ? 0 : Math.round(val * 100);
                                      current[index] = { ...current[index], price: newPrice };
                                      if (current[index].allowInstallments && current[index].installmentCount) {
                                        current[index].installmentPrice = newPrice > 0 ? Math.ceil(newPrice / current[index].installmentCount) : 0;
                                      }
                                      form.setValue("pricingOptions", [...current]);
                                    }}
                                    data-testid={`input-option-price-${index}`}
                                  />
                                </div>
                                {(option.optionType || "one_time") === "credit_pack" ? (
                                  <div>
                                    <label className="text-xs font-medium">Credits / Sessions</label>
                                    <Input
                                      type="number"
                                      placeholder="10"
                                      value={option.creditCount || ""}
                                      onChange={(e) => {
                                        const current = form.getValues("pricingOptions") || [];
                                        current[index] = { ...current[index], creditCount: parseInt(e.target.value) || undefined };
                                        form.setValue("pricingOptions", [...current]);
                                      }}
                                      data-testid={`input-option-credits-${index}`}
                                    />
                                  </div>
                                ) : option.optionType === "subscription" ? (
                                  <>
                                    <div>
                                      <label className="text-xs font-medium">Billing Interval (days)</label>
                                      <Input
                                        type="number"
                                        placeholder="30"
                                        value={option.billingIntervalDays || ""}
                                        onChange={(e) => {
                                          const current = form.getValues("pricingOptions") || [];
                                          const days = parseInt(e.target.value) || 0;
                                          current[index] = { ...current[index], billingIntervalDays: days };
                                          form.setValue("pricingOptions", [...current]);
                                        }}
                                        data-testid={`input-billing-interval-days-${index}`}
                                      />
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {(() => {
                                          const d = option.billingIntervalDays;
                                          if (!d || d <= 0) return "e.g. 30 = monthly, 90 = quarterly, 180 = 6 months, 365 = yearly";
                                          if (d === 7) return "Charges every week";
                                          if (d === 14) return "Charges every 2 weeks";
                                          if (d === 28) return "Charges every 28 days";
                                          if (d === 30) return "Charges monthly";
                                          if (d === 60) return "Charges every 2 months";
                                          if (d === 90) return "Charges every 3 months (quarterly)";
                                          if (d === 180) return "Charges every 6 months";
                                          if (d === 365) return "Charges yearly";
                                          return `Charges every ${d} days`;
                                        })()}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium">Ends After (days)</label>
                                      <Input
                                        type="number"
                                        placeholder="e.g. 120"
                                        value={option.durationDays || ""}
                                        onChange={(e) => {
                                          const current = form.getValues("pricingOptions") || [];
                                          current[index] = { ...current[index], durationDays: parseInt(e.target.value) || undefined };
                                          form.setValue("pricingOptions", [...current]);
                                        }}
                                        data-testid={`input-option-sub-duration-${index}`}
                                      />
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {(() => {
                                          const d = option.durationDays;
                                          const interval = option.billingIntervalDays || 30;
                                          if (!d || d <= 0) return "Leave empty for ongoing (no end date)";
                                          const payments = Math.ceil(d / interval);
                                          return `~${payments} payment${payments !== 1 ? 's' : ''} over ${d} days`;
                                        })()}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium">Trial Period (days)</label>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        value={option.trialDays || ""}
                                        onChange={(e) => {
                                          const current = form.getValues("pricingOptions") || [];
                                          current[index] = { ...current[index], trialDays: parseInt(e.target.value) || undefined };
                                          form.setValue("pricingOptions", [...current]);
                                        }}
                                        data-testid={`input-option-trial-${index}`}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <label className="text-xs font-medium">Duration (days)</label>
                                      <Input
                                        type="number"
                                        placeholder="90"
                                        value={option.durationDays || ""}
                                        onChange={(e) => {
                                          const current = form.getValues("pricingOptions") || [];
                                          const newDur = parseInt(e.target.value) || undefined;
                                          current[index] = { ...current[index], durationDays: newDur };
                                          if (current[index].allowInstallments && current[index].installmentCount && newDur) {
                                            const cnt = current[index].installmentCount;
                                            const raw = Math.floor((newDur * 0.75) / cnt);
                                            const stds = [7, 14, 30, 90, 180];
                                            current[index].installmentIntervalDays = stds.reduce((p, c) =>
                                              Math.abs(c - raw) < Math.abs(p - raw) ? c : p
                                            );
                                          }
                                          form.setValue("pricingOptions", [...current]);
                                        }}
                                        data-testid={`input-option-duration-${index}`}
                                      />
                                    </div>
                                    <div className="col-span-2 border-t pt-2 mt-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Checkbox
                                          checked={option.allowInstallments || false}
                                          onCheckedChange={(checked) => {
                                            const current = form.getValues("pricingOptions") || [];
                                            const opt = current[index];
                                            const duration = opt.durationDays || 90;
                                            const totalPrice = opt.price || 0;
                                            let defaultCount = 3;
                                            let defaultInterval = 30;
                                            if (duration < 30) {
                                              defaultCount = 2;
                                              defaultInterval = 7;
                                            } else if (duration <= 90) {
                                              defaultCount = Math.min(3, Math.floor(duration / 14));
                                              defaultInterval = duration <= 60 ? 14 : 30;
                                              if (defaultCount < 2) defaultCount = 2;
                                            } else if (duration <= 180) {
                                              defaultCount = Math.min(4, Math.floor(duration / 30));
                                              defaultInterval = 30;
                                              if (defaultCount < 2) defaultCount = 2;
                                            } else if (duration <= 365) {
                                              defaultCount = Math.min(6, Math.floor(duration / 30));
                                              defaultInterval = 30;
                                            } else {
                                              defaultCount = Math.min(8, Math.floor(duration / 90));
                                              defaultInterval = 90;
                                              if (defaultCount < 2) defaultCount = 2;
                                            }
                                            const perPayment = totalPrice > 0 ? Math.ceil(totalPrice / defaultCount) : 0;
                                            current[index] = {
                                              ...opt,
                                              allowInstallments: !!checked,
                                              installmentCount: checked ? defaultCount : undefined,
                                              installmentPrice: checked ? perPayment : undefined,
                                              installmentIntervalDays: checked ? defaultInterval : undefined,
                                              payInFullDiscount: checked ? (opt.payInFullDiscount || 0) : undefined,
                                            };
                                            form.setValue("pricingOptions", [...current]);
                                          }}
                                          data-testid={`checkbox-allow-installments-${index}`}
                                        />
                                        <label className="text-xs font-medium">Allow Installment Payments</label>
                                      </div>
                                      {option.allowInstallments && (() => {
                                        const duration = option.durationDays || 90;
                                        const count = option.installmentCount || 3;
                                        const totalPrice = option.price || 0;
                                        const perPayment = totalPrice > 0 && count > 0 ? Math.ceil(totalPrice / count) : 0;
                                        const smartInterval = option.installmentIntervalDays || 30;
                                        const intervalLabel = smartInterval === 7 ? "Weekly"
                                          : smartInterval === 14 ? "Bi-Weekly"
                                          : smartInterval === 30 ? "Monthly"
                                          : smartInterval === 90 ? "Quarterly"
                                          : smartInterval === 180 ? "Every 6 months"
                                          : `Every ${smartInterval} days`;
                                        const totalInstallmentCost = perPayment * count;
                                        const totalDays = smartInterval * count;
                                        const discount = option.payInFullDiscount || 0;
                                        const discountedFullPrice = discount > 0 ? Math.round(totalPrice * (1 - discount / 100)) : totalPrice;
                                        const maxCount = duration < 30 ? 2
                                          : duration <= 90 ? Math.min(6, Math.floor(duration / 14))
                                          : duration <= 365 ? Math.min(12, Math.floor(duration / 14))
                                          : 24;
                                        return (
                                        <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-3">
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="text-xs font-medium">Number of Installments</label>
                                              <Input
                                                type="number"
                                                min="2"
                                                max={maxCount}
                                                value={option.installmentCount || ""}
                                                onChange={(e) => {
                                                  const current = form.getValues("pricingOptions") || [];
                                                  const newCount = Math.max(2, Math.min(maxCount, parseInt(e.target.value) || 2));
                                                  const dur = current[index].durationDays || 90;
                                                  const rawInterval = Math.floor((dur * 0.75) / newCount);
                                                  const standards = [7, 14, 30, 90, 180];
                                                  const newInterval = standards.reduce((prev, curr) =>
                                                    Math.abs(curr - rawInterval) < Math.abs(prev - rawInterval) ? curr : prev
                                                  );
                                                  const price = current[index].price || 0;
                                                  current[index] = {
                                                    ...current[index],
                                                    installmentCount: newCount,
                                                    installmentPrice: price > 0 ? Math.ceil(price / newCount) : 0,
                                                    installmentIntervalDays: newInterval,
                                                  };
                                                  form.setValue("pricingOptions", [...current]);
                                                }}
                                                data-testid={`input-installment-count-${index}`}
                                              />
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium">Pay-in-Full Discount (%)</label>
                                              <Input
                                                type="number"
                                                min="0"
                                                max="50"
                                                placeholder="0"
                                                value={option.payInFullDiscount || ""}
                                                onChange={(e) => {
                                                  const current = form.getValues("pricingOptions") || [];
                                                  current[index] = { ...current[index], payInFullDiscount: parseInt(e.target.value) || 0 };
                                                  form.setValue("pricingOptions", [...current]);
                                                }}
                                                data-testid={`input-pay-in-full-discount-${index}`}
                                              />
                                            </div>
                                          </div>
                                          <div className="bg-white/60 rounded p-2 space-y-1">
                                            <p className="text-xs text-amber-800 font-medium">
                                              {perPayment > 0
                                                ? `${count} payments of $${(perPayment / 100).toFixed(2)} · ${intervalLabel} · $${(totalInstallmentCost / 100).toFixed(2)} total`
                                                : "Set the option price above to see installment breakdown"}
                                            </p>
                                            {totalDays > duration && perPayment > 0 && (
                                              <p className="text-xs text-amber-600">
                                                Payments span {totalDays} days ({duration}-day program)
                                              </p>
                                            )}
                                            {discount > 0 && totalPrice > 0 && (
                                              <p className="text-xs text-green-700">
                                                Pay-in-full price: ${(discountedFullPrice / 100).toFixed(2)} ({discount}% off)
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        );
                                      })()}
                                    </div>
                                  </>
                                )}
                                <div>
                                  <label className="text-xs font-medium">Savings Note</label>
                                  <Input
                                    placeholder="Save $30!"
                                    value={option.savingsNote || ""}
                                    onChange={(e) => {
                                      const current = form.getValues("pricingOptions") || [];
                                      current[index] = { ...current[index], savingsNote: e.target.value };
                                      form.setValue("pricingOptions", [...current]);
                                    }}
                                    data-testid={`input-option-savings-${index}`}
                                  />
                                </div>
                                {/* Bundle Renewal Options - only for subscriptions, not one-time or credit packs */}
                                {(option.optionType) === "subscription" && (
                                <div className="col-span-2 border-t pt-2 mt-2">
                                  <label className="text-xs font-medium mb-2 block">After Bundle Period</label>
                                  <Select
                                    value={option.renewalType || "none"}
                                    onValueChange={(value) => {
                                      const current = form.getValues("pricingOptions") || [];
                                      current[index] = { 
                                        ...current[index], 
                                        renewalType: value,
                                        convertsToMonthly: value === "monthly"
                                      };
                                      form.setValue("pricingOptions", [...current]);
                                    }}
                                  >
                                    <SelectTrigger className="w-full" data-testid={`select-renewal-type-${index}`}>
                                      <SelectValue placeholder="Select renewal option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No auto-renewal (ends after period)</SelectItem>
                                      <SelectItem value="same">Auto-renew at same bundle price</SelectItem>
                                      <SelectItem value="monthly">Convert to Monthly after period</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  {(option.renewalType === "monthly" || option.convertsToMonthly) && option.renewalType !== "same" && option.renewalType !== "none" && (
                                    <div className="mt-3 space-y-2">
                                      <div>
                                        <label className="text-xs font-medium">Monthly Price ($)</label>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="75.00"
                                          defaultValue={option.monthlyPrice ? (option.monthlyPrice / 100).toFixed(2) : ""}
                                          onBlur={(e) => {
                                            const current = form.getValues("pricingOptions") || [];
                                            const val = parseFloat(e.target.value);
                                            current[index] = { ...current[index], monthlyPrice: isNaN(val) ? 0 : Math.round(val * 100) };
                                            form.setValue("pricingOptions", [...current]);
                                          }}
                                          data-testid={`input-monthly-price-${index}`}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Price charged monthly after bundle ends</p>
                                      </div>
                                      {option.monthlyStripePriceId && (
                                        <div className="text-xs bg-green-50 border border-green-200 rounded px-2 py-1">
                                          <span className="text-green-700">Monthly Stripe ID: </span>
                                          <code className="text-green-600">{option.monthlyStripePriceId}</code>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {option.renewalType === "same" && (
                                    <p className="text-xs text-green-600 mt-2">Bundle will automatically renew at ${option.price ? (option.price / 100).toFixed(2) : "0.00"} every {option.durationDays || 0} days</p>
                                  )}
                                </div>
                                )}
                                
                                {/* Stripe Price ID - Link Existing or Auto-sync */}
                                <div className="col-span-2 space-y-2">
                                  <label className="text-xs font-medium flex items-center gap-2">
                                    Stripe Price ID
                                    <span className="text-gray-400 font-normal">(paste existing ID or leave blank to auto-create)</span>
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="text"
                                      placeholder="price_xxx..."
                                      value={option.stripePriceId || ""}
                                      onChange={(e) => {
                                        const current = form.getValues("pricingOptions") || [];
                                        current[index] = { ...current[index], stripePriceId: e.target.value };
                                        form.setValue("pricingOptions", [...current]);
                                      }}
                                      className="flex-1 font-mono text-sm"
                                      data-testid={`input-stripe-price-id-${index}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={!option.stripePriceId || !option.stripePriceId.startsWith('price_')}
                                      onClick={async () => {
                                        if (!option.stripePriceId) return;
                                        try {
                                          const response = await fetch(`/api/stripe/prices/${option.stripePriceId}`, {
                                            credentials: 'include'
                                          });
                                          if (!response.ok) {
                                            const err = await response.json();
                                            toast({ title: "Error", description: err.error || "Failed to fetch price", variant: "destructive" });
                                            return;
                                          }
                                          const priceData = await response.json();
                                          const current = form.getValues("pricingOptions") || [];
                                          current[index] = {
                                            ...current[index],
                                            stripePriceId: priceData.priceId,
                                            name: current[index].name || priceData.productName || "Imported Price",
                                            price: priceData.unitAmount,
                                            billingCycle: priceData.billingCycle,
                                            durationDays: priceData.durationDays || current[index].durationDays,
                                            linkedFromStripe: true,
                                          };
                                          form.setValue("pricingOptions", [...current]);
                                          toast({ title: "Price Linked", description: `Imported: ${priceData.productName || 'price'} - $${(priceData.unitAmount / 100).toFixed(2)}` });
                                        } catch (err: any) {
                                          toast({ title: "Error", description: err.message || "Failed to fetch price from Stripe", variant: "destructive" });
                                        }
                                      }}
                                      data-testid={`button-fetch-stripe-price-${index}`}
                                    >
                                      Fetch Details
                                    </Button>
                                  </div>
                                  {option.linkedFromStripe && (
                                    <div className="text-xs text-green-600 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Linked from Stripe - will not create new price
                                    </div>
                                  )}
                                  {option.stripePriceId && !option.linkedFromStripe && (
                                    <div className="text-xs text-blue-600">(auto-synced)</div>
                                  )}
                                </div>
                              </div>
                              </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Coupons Section */}
                  <div className="border rounded-lg p-3 mt-3 bg-purple-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="h-4 w-4 text-purple-600" />
                      <h4 className="font-medium text-sm">Coupons</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Generate discount coupons for this program. Coupons expire 24 hours after creation.</p>
                    {editingProgram?.id ? (
                      <InlineCouponSection programId={editingProgram.id} />
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
                        <p className="text-sm text-gray-400">Save the program first to create coupons.</p>
                      </div>
                    )}
                  </div>

                  {waivers.length > 0 && (
                    <FormField
                      control={form.control}
                      name="requiredWaivers"
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormLabel>Required Waivers</FormLabel>
                          <div className="space-y-2 border rounded-md p-3 max-h-32 overflow-y-auto">
                            {waivers.map((waiver: any) => (
                              <div key={waiver.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={field.value?.includes(waiver.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, waiver.id]);
                                    } else {
                                      field.onChange(current.filter((id: string) => id !== waiver.id));
                                    }
                                  }}
                                  data-testid={`checkbox-waiver-${waiver.id}`}
                                />
                                <span className="text-sm">{waiver.name}</span>
                              </div>
                            ))}
                          </div>
                          <FormDescription>Users must sign these waivers before enrolling</FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Suggested Add-ons Section */}
                  {storeProducts.length > 0 && (
                    <div className="mt-3">
                      <label className="text-sm font-medium">Suggested Add-ons</label>
                      <div className="space-y-2 border rounded-md p-3 mt-1 max-h-32 overflow-y-auto">
                        {storeProducts.map((product: any) => (
                          <div key={product.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedAddOns.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAddOns([...selectedAddOns, product.id]);
                                } else {
                                  setSelectedAddOns(selectedAddOns.filter(id => id !== product.id));
                                }
                              }}
                              data-testid={`checkbox-addon-${product.id}`}
                            />
                            <span className="text-sm">{product.name}</span>
                            {product.price > 0 && (
                              <span className="text-xs text-gray-500">${(product.price / 100).toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">These products will be suggested as add-ons during checkout</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Schedule Request</h4>
                  
                  <FormField
                    control={form.control}
                    name="scheduleRequestEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 mb-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-schedule-request"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Enable Schedule Request</FormLabel>
                        <FormDescription className="!mt-0 ml-2 text-xs">
                          Allow parents to book sessions after payment
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {form.watch("scheduleRequestEnabled") && (
                    <>
                    <FormField
                      control={form.control}
                      name="sessionLengthMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Length (minutes)</FormLabel>
                          <Select 
                            value={field.value?.toString() || ""} 
                            onValueChange={(val) => field.onChange(parseInt(val))}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-session-length">
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="90">1.5 hours</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>How long each booked session will last</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="mt-4">
                      <h5 className="text-sm font-medium mb-2">Available Time Windows</h5>
                      <p className="text-xs text-gray-500 mb-3">Define recurring weekly time slots when sessions can be booked</p>
                      {availabilitySlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <Select
                            value={slot.dayOfWeek.toString()}
                            onValueChange={(val) => {
                              const updated = [...availabilitySlots];
                              updated[index] = { ...updated[index], dayOfWeek: parseInt(val) };
                              setAvailabilitySlots(updated);
                            }}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => {
                              const updated = [...availabilitySlots];
                              updated[index] = { ...updated[index], startTime: e.target.value };
                              setAvailabilitySlots(updated);
                            }}
                            className="w-[120px]"
                          />
                          <span className="text-xs text-gray-400">to</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => {
                              const updated = [...availabilitySlots];
                              updated[index] = { ...updated[index], endTime: e.target.value };
                              setAvailabilitySlots(updated);
                            }}
                            className="w-[120px]"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAvailabilitySlots([...availabilitySlots, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
                        }}
                        className="mt-1"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Time Slot
                      </Button>
                    </div>
                    </>
                  )}
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Social Settings</h4>
                  
                  <FormField
                    control={form.control}
                    name="hasSubgroups"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 mb-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-has-subgroups"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Has Teams/Groups</FormLabel>
                        <FormDescription className="!mt-0 ml-2 text-xs">
                          Enable if this program has subgroups like teams or levels
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {form.watch("hasSubgroups") && (
                    <FormField
                      control={form.control}
                      name="subgroupLabel"
                      render={({ field }) => (
                        <FormItem className="mb-3">
                          <FormLabel>Subgroup Label</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subgroup-label">
                                <SelectValue placeholder="Select label" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Team">Team (e.g., Youth Club)</SelectItem>
                              <SelectItem value="Level">Level (e.g., Skills Academy)</SelectItem>
                              <SelectItem value="Group">Group (e.g., Private Training)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="rosterVisibility"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Roster Visibility</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-roster-visibility">
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can see roster</SelectItem>
                            <SelectItem value="members">Members Only - Only program members</SelectItem>
                            <SelectItem value="hidden">Hidden - No roster visible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chatMode"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Chat Mode</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-chat-mode">
                              <SelectValue placeholder="Select chat mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="two_way">Two-Way Chat - Everyone can send messages</SelectItem>
                            <SelectItem value="announcements">Announcements Only - Coaches only</SelectItem>
                            <SelectItem value="disabled">Disabled - No chat</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-program-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active Program</FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createProgram.isPending} data-testid="button-submit-program">
                  {createProgram.isPending ? "Saving..." : editingProgram ? "Update Program" : "Create Program"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {selectedProgramIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedProgramIds.size} program{selectedProgramIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedProgramIds.size} program(s)?`)) {
                  bulkDeletePrograms.mutate(Array.from(selectedProgramIds));
                }
              }}
              disabled={bulkDeletePrograms.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeletePrograms.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProgramIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        <div ref={tableRef} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={programs.length > 0 && selectedProgramIds.size === programs.length}
                    onCheckedChange={() => toggleAllPrograms(programs.map((p: any) => p.id))}
                    aria-label="Select all programs"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program: any) => {
                const programTeams = getTeamsForProgram(program.id);
                const formatPrice = (cents: number) => {
                  if (!cents) return "Free";
                  return `$${(cents / 100).toFixed(2)}`;
                };
                return (
                  <TableRow key={program.id} data-testid={`row-program-${program.id}`}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedProgramIds.has(program.id)}
                        onCheckedChange={() => toggleProgramSelection(program.id)}
                        aria-label={`Select ${program.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-program-name-${program.id}`}>
                      <div>
                        <div className="text-gray-900">{program.name}</div>
                        {program.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{program.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(program.price)}</div>
                      {program.billingModel && program.billingModel !== "Per Player" && (
                        <div className="text-xs text-gray-500">{program.billingModel}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {programTeams.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {programTeams.slice(0, 2).map((t: any) => (
                            <Badge key={t.id} variant="secondary" className="text-xs">
                              {t.name}
                            </Badge>
                          ))}
                          {programTeams.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{programTeams.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={program.isActive !== false}
                          onCheckedChange={(checked) => {
                            toggleProgramActive.mutate({ id: program.id, isActive: checked });
                          }}
                          data-testid={`switch-program-active-${program.id}`}
                        />
                        <span className={`text-xs ${program.isActive !== false ? 'text-green-600' : 'text-gray-400'}`}>
                          {program.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(program)}
                          data-testid={`button-edit-program-${program.id}`}
                          title="Edit Program"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {programs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No programs yet. Create your first program to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Delete Program Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmProgram} onOpenChange={(open) => !open && setDeleteConfirmProgram(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmProgram?.name}"? This action cannot be undone. Programs with active enrollments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteProgram.mutate(deleteConfirmProgram.id);
                setDeleteConfirmProgram(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Divisions Tab Component (kept for reference, no longer shown in tabs)
function DivisionsTab({ divisions, teams, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [deleteConfirmDivision, setDeleteConfirmDivision] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(insertDivisionSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      description: "",
      ageRange: "",
      teamIds: [],
      isActive: true,
    },
  });

  const createDivision = useMutation({
    mutationFn: async (data: any) => {
      if (editingDivision) {
        return await apiRequest("PATCH", `/api/divisions/${editingDivision.id}`, data);
      }
      return await apiRequest("POST", "/api/divisions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({ title: editingDivision ? "Division updated successfully" : "Division created successfully" });
      setIsDialogOpen(false);
      setEditingDivision(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save division", variant: "destructive" });
    },
  });

  const deleteDivision = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/divisions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({ title: "Division deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete division", variant: "destructive" });
    },
  });

  const handleEdit = (division: any) => {
    setEditingDivision(division);
    form.reset({
      organizationId: division.organizationId,
      name: division.name,
      description: division.description || "",
      ageRange: division.ageRange || "",
      teamIds: division.teamIds || [],
      isActive: division.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingDivision(null);
      form.reset();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Divisions</CardTitle>
          <CardDescription>Create and manage age divisions for your organization</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-division">
              <Plus className="w-4 h-4 mr-2" />
              Create Division
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDivision ? "Edit Division" : "Create New Division"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createDivision.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Division Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="U12 Division" data-testid="input-division-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Division for players under 12" data-testid="input-division-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Range</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-division-agerange">
                            <SelectValue placeholder="Select age range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="4-5 years">4-5 years</SelectItem>
                          <SelectItem value="5-6 years">5-6 years</SelectItem>
                          <SelectItem value="6-7 years">6-7 years</SelectItem>
                          <SelectItem value="7-8 years">7-8 years</SelectItem>
                          <SelectItem value="8-9 years">8-9 years</SelectItem>
                          <SelectItem value="9-10 years">9-10 years</SelectItem>
                          <SelectItem value="10-11 years">10-11 years</SelectItem>
                          <SelectItem value="11-12 years">11-12 years</SelectItem>
                          <SelectItem value="12-13 years">12-13 years</SelectItem>
                          <SelectItem value="13-14 years">13-14 years</SelectItem>
                          <SelectItem value="14-15 years">14-15 years</SelectItem>
                          <SelectItem value="15-16 years">15-16 years</SelectItem>
                          <SelectItem value="16-17 years">16-17 years</SelectItem>
                          <SelectItem value="17-18 years">17-18 years</SelectItem>
                          <SelectItem value="18+ years">18+ years</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Teams</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.[0] || ""}
                          onValueChange={(value) => {
                            const currentIds: string[] = field.value || [];
                            if (!currentIds.includes(value)) {
                              field.onChange([...currentIds, value]);
                            }
                          }}
                        >
                          <SelectTrigger data-testid="select-division-teams">
                            <SelectValue placeholder="Select teams..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team: any) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Selected: {field.value?.length || 0} team(s)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-division-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active Division</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createDivision.isPending} data-testid="button-submit-division">
                  {createDivision.isPending ? "Saving..." : editingDivision ? "Update Division" : "Create Division"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Age Range</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((division: any) => (
              <TableRow key={division.id} data-testid={`row-division-${division.id}`}>
                <TableCell className="font-medium" data-testid={`text-division-name-${division.id}`}>
                  {division.name}
                </TableCell>
                <TableCell>{division.description || "-"}</TableCell>
                <TableCell>{division.ageRange || "-"}</TableCell>
                <TableCell>{division.teamIds?.length || 0}</TableCell>
                <TableCell>
                  <Badge variant={division.isActive ? "default" : "secondary"} data-testid={`badge-division-status-${division.id}`}>
                    {division.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(division)}
                      data-testid={`button-edit-division-${division.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmDivision(division)}
                      data-testid={`button-delete-division-${division.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Delete Division Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmDivision} onOpenChange={(open) => !open && setDeleteConfirmDivision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Division</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmDivision?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteDivision.mutate(deleteConfirmDivision.id);
                setDeleteConfirmDivision(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Messages Tab Component (formerly Notifications)
function NotificationsTab({ notifications: allNotifications, users, teams, divisions, organization }: any) {
  const notifications = (allNotifications || []).filter((n: any) => !n.types?.includes('message'));
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'recurring'>('immediate');
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<any>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('daily');
  const [recurrenceTime, setRecurrenceTime] = useState('09:00');
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<number>>(new Set());

  const bulkDeleteNotifications = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/admin/notifications/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      const count = selectedNotificationIds.size;
      setSelectedNotificationIds(new Set());
      toast({ title: `${count} message(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some messages", variant: "destructive" });
    },
  });

  const toggleNotificationSelection = (notificationId: number) => {
    setSelectedNotificationIds(prev => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const toggleAllNotifications = (notificationIds: number[]) => {
    if (selectedNotificationIds.size === notificationIds.length) {
      setSelectedNotificationIds(new Set());
    } else {
      setSelectedNotificationIds(new Set(notificationIds));
    }
  };

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      types: ["message"],
      title: "",
      message: "",
      recipientTarget: "everyone",
      recipientUserIds: [],
      recipientRoles: [],
      recipientTeamIds: [],
      recipientDivisionIds: [],
      deliveryChannels: ["in_app"],
      sentBy: currentUser?.id || "",
      status: "pending",
    },
  });

  const recipientTarget = form.watch("recipientTarget");
  const deliveryChannels = form.watch("deliveryChannels") || [];
  const isPushSelected = deliveryChannels.includes("push");
  
  // Filter users to only show accounts with emails when push is selected
  const filteredUsersForNotification = isPushSelected 
    ? users.filter((u: any) => u.email && u.email.trim() !== '')
    : users;

  const createMessage = useMutation({
    mutationFn: async (data: any) => {
      // For scheduled or recurring messages, use the campaign API
      if (scheduleType !== 'immediate') {
        // Validate scheduled campaigns require a date/time
        if (scheduleType === 'scheduled' && !scheduledAt) {
          throw new Error('Please select a date and time for the scheduled message');
        }
        if (scheduleType === 'recurring' && !recurrenceTime) {
          throw new Error('Please select a time for the recurring message');
        }
        
        // Convert datetime-local value to ISO string
        const scheduledAtISO = scheduleType === 'scheduled' && scheduledAt 
          ? new Date(scheduledAt).toISOString() 
          : undefined;
        
        const campaignData = {
          title: data.title,
          message: data.message,
          types: data.types || ['message'],
          recipientTarget: data.recipientTarget,
          recipientUserIds: data.recipientUserIds,
          recipientRoles: data.recipientRoles,
          recipientTeamIds: data.recipientTeamIds,
          recipientDivisionIds: data.recipientDivisionIds,
          deliveryChannels: data.deliveryChannels,
          scheduleType,
          scheduledAt: scheduledAtISO,
          recurrenceFrequency: scheduleType === 'recurring' ? recurrenceFrequency : undefined,
          recurrenceTime: scheduleType === 'recurring' ? recurrenceTime : undefined,
          timezone: 'America/Los_Angeles',
        };
        console.log('[Notification Form] Creating campaign:', campaignData);
        return await apiRequest("POST", "/api/notification-campaigns", campaignData);
      }
      
      // For immediate messages, use the regular notification API
      const notificationData = {
        ...data,
        sentBy: currentUser?.id || data.sentBy,
        organizationId: organization?.id || data.organizationId,
      };
      console.log('[Notification Form] Submitting notification:', notificationData);
      return await apiRequest("POST", "/api/admin/notifications", notificationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-campaigns"] });
      const successMessage = scheduleType === 'immediate' ? "Message sent successfully" : "Message scheduled successfully";
      // Reset state before closing dialog to avoid stale values
      setScheduleType('immediate');
      setScheduledAt('');
      setRecurrenceFrequency('daily');
      setRecurrenceTime('09:00');
      form.reset();
      setIsDialogOpen(false);
      toast({ title: successMessage });
    },
    onError: (error: any) => {
      console.error('[Notification Form] Failed to send notification:', error);
      toast({ title: "Failed to send message", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/notifications/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Message deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setScheduleType('immediate');
      setScheduledAt('');
      setRecurrenceFrequency('daily');
      setRecurrenceTime('09:00');
    }
  };

  const getRecipientDisplay = (notification: any) => {
    if (notification.recipientTarget === "everyone") {
      return "Everyone";
    }
    if (notification.recipientTarget === "users" && notification.recipientUserIds) {
      const count = notification.recipientUserIds.length;
      return `${count} user${count !== 1 ? 's' : ''}`;
    }
    if (notification.recipientTarget === "roles" && notification.recipientRoles) {
      const count = notification.recipientRoles.length;
      return `${count} role${count !== 1 ? 's' : ''}`;
    }
    if (notification.recipientTarget === "teams" && notification.recipientTeamIds) {
      const count = notification.recipientTeamIds.length;
      return `${count} team${count !== 1 ? 's' : ''}`;
    }
    if (notification.recipientTarget === "divisions" && notification.recipientDivisionIds) {
      const count = notification.recipientDivisionIds.length;
      return `${count} division${count !== 1 ? 's' : ''}`;
    }
    return "-";
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadNotificationTemplate = () => {
    const csvContent = "Title,Message,Delivery,Target Type,Scheduled Time\nWelcome Message,Welcome to our program!,in_app,everyone,\nPractice Reminder,Don't forget practice tomorrow,push,teams,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notifications-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadNotificationsData = () => {
    const csvHeaders = "Title,Message,Delivery,Target Type,Scheduled Time";
    const csvRows = notifications.map((notification: any) => {
      return [
        notification.title || "",
        notification.message || "",
        notification.deliveryChannels?.join(";") || "in_app",
        notification.recipientTarget || "everyone",
        notification.scheduledAt || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notifications-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadNotifications = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 2 && values[0]) {
        try {
          await apiRequest("POST", "/api/admin/notifications", {
            organizationId: organization?.id,
            title: values[0],
            message: values[1] || "",
            deliveryChannels: values[2]?.split(";") || ["in_app"],
            recipientTarget: values[3] || "everyone",
            types: ["message"],
            sentBy: currentUser?.id,
            status: "pending",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create notification:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} messages` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Announcements</CardTitle>
          <CardDescription>Send and manage announcements</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-notifications">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Messages</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Message, Delivery, Target Type, Scheduled Time</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUploadNotifications}
                  data-testid="input-notification-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadNotificationTemplate} data-testid="button-download-notification-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadNotificationsData} data-testid="button-download-notifications">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Message" data-testid="button-create-notification">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Announcement</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMessage.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Message title" data-testid="input-notification-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Message content..." rows={4} data-testid="input-notification-message" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="types"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormDescription>
                        Select one or more types for this notification
                      </FormDescription>
                      <div className="border rounded-md p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="type-announcement"
                            checked={field.value?.includes("announcement")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "announcement"]);
                              } else {
                                field.onChange(current.filter((t: string) => t !== "announcement"));
                              }
                            }}
                            data-testid="checkbox-type-announcement"
                          />
                          <label
                            htmlFor="type-announcement"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Announcement
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="type-notification"
                            checked={field.value?.includes("notification")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "notification"]);
                              } else {
                                field.onChange(current.filter((t: string) => t !== "notification"));
                              }
                            }}
                            data-testid="checkbox-type-notification"
                          />
                          <label
                            htmlFor="type-notification"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Notification
                          </label>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} type(s)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipientTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recipient-target">
                            <SelectValue placeholder="Select recipients" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="everyone">Everyone</SelectItem>
                          <SelectItem value="users">{isPushSelected ? "Specific Accounts (with email)" : "Specific Users"}</SelectItem>
                          <SelectItem value="roles">Roles</SelectItem>
                          <SelectItem value="teams">Teams</SelectItem>
                          <SelectItem value="divisions">Divisions</SelectItem>
                        </SelectContent>
                      </Select>
                      {isPushSelected && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded-md mt-2">
                          Push notifications are email-based. Only accounts with email addresses are shown. Notifications will be sent to all devices registered under the recipient's email.
                        </p>
                      )}
                      {!isPushSelected && recipientTarget === "users" && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md mt-2">
                          In-app notifications will appear in the selected user's dashboard notification center.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recipientTarget === "users" && (
                  <FormField
                    control={form.control}
                    name="recipientUserIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isPushSelected ? "Select Accounts" : "Select Users"}</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {filteredUsersForNotification.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                              {isPushSelected 
                                ? "No accounts with email addresses found. Push notifications require accounts with email."
                                : "No users found."}
                            </p>
                          ) : (
                            filteredUsersForNotification.map((user: any) => (
                              <div key={user.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={(field.value as string[] | undefined)?.includes(user.id) ?? false}
                                  onCheckedChange={(checked) => {
                                    const current = (field.value as string[]) || [];
                                    if (checked) {
                                      field.onChange([...current, user.id]);
                                    } else {
                                      field.onChange(current.filter((id: string) => id !== user.id));
                                    }
                                  }}
                                  data-testid={`checkbox-recipient-${user.id}`}
                                />
                                <span className="text-sm">
                                  {user.firstName} {user.lastName} {user.email ? `- ${user.email}` : ''} ({user.role})
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Selected: {field.value?.length || 0} {isPushSelected ? "account(s)" : "user(s)"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientTarget === "roles" && (
                  <FormField
                    control={form.control}
                    name="recipientRoles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Roles</FormLabel>
                        <div className="border rounded-md p-4 space-y-2">
                          {["admin", "coach", "player", "parent"].map((role) => (
                            <div key={role} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(role) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, role]);
                                  } else {
                                    field.onChange(current.filter((r: string) => r !== role));
                                  }
                                }}
                                data-testid={`checkbox-role-${role}`}
                              />
                              <span className="text-sm capitalize">{role}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} role(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientTarget === "teams" && (
                  <FormField
                    control={form.control}
                    name="recipientTeamIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Teams</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {teams.map((team: any) => (
                            <div key={team.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(String(team.id)) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, String(team.id)]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== String(team.id)));
                                  }
                                }}
                                data-testid={`checkbox-team-${team.id}`}
                              />
                              <span className="text-sm">{team.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} team(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientTarget === "divisions" && (
                  <FormField
                    control={form.control}
                    name="recipientDivisionIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Divisions</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {divisions.map((division: any) => (
                            <div key={division.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(String(division.id)) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, String(division.id)]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== String(division.id)));
                                  }
                                }}
                                data-testid={`checkbox-division-${division.id}`}
                              />
                              <span className="text-sm">{division.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} division(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="deliveryChannels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Channels</FormLabel>
                      <div className="border rounded-md p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes("in_app")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "in_app"]);
                              } else {
                                field.onChange(current.filter((ch: string) => ch !== "in_app"));
                              }
                            }}
                            data-testid="checkbox-channel-in-app"
                          />
                          <span className="text-sm">In-App</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes("email")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "email"]);
                              } else {
                                field.onChange(current.filter((ch: string) => ch !== "email"));
                              }
                            }}
                            data-testid="checkbox-channel-email"
                          />
                          <span className="text-sm">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes("push")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "push"]);
                              } else {
                                field.onChange(current.filter((ch: string) => ch !== "push"));
                              }
                            }}
                            data-testid="checkbox-channel-push"
                          />
                          <span className="text-sm">Push</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {field.value?.length || 0} channel(s)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4">
                  <FormLabel className="text-base font-semibold">Scheduling</FormLabel>
                  <div className="mt-3 space-y-3">
                    <Select 
                      value={scheduleType} 
                      onValueChange={(val) => setScheduleType(val as 'immediate' | 'scheduled' | 'recurring')}
                    >
                      <SelectTrigger data-testid="select-schedule-type">
                        <SelectValue placeholder="When to send" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Send Immediately</SelectItem>
                        <SelectItem value="scheduled">Schedule for Later</SelectItem>
                        <SelectItem value="recurring">Recurring (Daily/Weekly)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {scheduleType === 'scheduled' && (
                      <div className="space-y-2">
                        <Label>Send Date & Time</Label>
                        <Input 
                          type="datetime-local" 
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          data-testid="input-scheduled-at"
                        />
                      </div>
                    )}
                    
                    {scheduleType === 'recurring' && (
                      <div className="space-y-3 bg-gray-50 p-3 rounded-md">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                            <SelectTrigger data-testid="select-recurrence-frequency">
                              <SelectValue placeholder="How often" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Time of Day</Label>
                          <Input 
                            type="time" 
                            value={recurrenceTime}
                            onChange={(e) => setRecurrenceTime(e.target.value)}
                            data-testid="input-recurrence-time"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Messages will be sent at the specified time based on Pacific Time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createMessage.isPending} data-testid="button-submit-notification">
                  {createMessage.isPending ? (scheduleType === 'immediate' ? "Sending..." : "Scheduling...") : (scheduleType === 'immediate' ? "Send Message" : "Schedule Message")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {selectedNotificationIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedNotificationIds.size} message{selectedNotificationIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedNotificationIds.size} message(s)?`)) {
                  bulkDeleteNotifications.mutate(Array.from(selectedNotificationIds));
                }
              }}
              disabled={bulkDeleteNotifications.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteNotifications.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNotificationIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox 
                  checked={notifications.length > 0 && selectedNotificationIds.size === notifications.length}
                  onCheckedChange={() => toggleAllNotifications(notifications.map((n: any) => n.id))}
                  aria-label="Select all messages"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Delivery Channels</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification: any) => (
              <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                <TableCell>
                  <Checkbox 
                    checked={selectedNotificationIds.has(notification.id)}
                    onCheckedChange={() => toggleNotificationSelection(notification.id)}
                    aria-label={`Select ${notification.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium" data-testid={`text-notification-title-${notification.id}`}>
                  {notification.title}
                </TableCell>
                <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                <TableCell data-testid={`text-notification-recipients-${notification.id}`}>
                  {getRecipientDisplay(notification)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {notification.deliveryChannels?.map((channel: string) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel.replace('_', '-')}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {notification.sentAt ? new Date(notification.sentAt).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={notification.status === "sent" ? "default" : notification.status === "failed" ? "destructive" : "secondary"}>
                    {notification.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Delete Message Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmMessage} onOpenChange={(open) => !open && setDeleteConfirmMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmMessage?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteMessage.mutate(deleteConfirmMessage.id);
                setDeleteConfirmMessage(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function StripeSettingsSection() {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/organization/stripe-settings"],
  });

  const { data: connectStatus, isLoading: connectLoading, refetch: refetchConnect } = useQuery<any>({
    queryKey: ["/api/stripe-connect/status"],
  });

  useEffect(() => {
    if (settings && !loaded) {
      setStripePublishableKey(settings.stripePublishableKey || "");
      setLoaded(true);
    }
  }, [settings, loaded]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "connected") {
      toast({ title: "Stripe Connect setup updated" });
      refetchConnect();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe-connect/onboard");
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: () => {
      toast({ title: "Failed to start Stripe Connect setup", variant: "destructive" });
    },
  });

  const dashboardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/stripe-connect/login-link");
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: () => {
      toast({ title: "Failed to open Stripe dashboard", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", "/api/organization/stripe-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/stripe-settings"] });
      toast({ title: "Stripe settings saved" });
      setStripeSecretKey("");
      setStripeWebhookSecret("");
    },
    onError: () => {
      toast({ title: "Failed to save Stripe settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const data: any = {};
    if (stripePublishableKey) data.stripePublishableKey = stripePublishableKey;
    if (stripeSecretKey) data.stripeSecretKey = stripeSecretKey;
    if (stripeWebhookSecret) data.stripeWebhookSecret = stripeWebhookSecret;
    saveMutation.mutate(data);
  };

  const status = connectStatus?.status || "not_started";
  const connectedId = connectStatus?.connectedAccountId || "";
  const maskedId = connectedId ? `acct_...${connectedId.slice(-6)}` : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Stripe Integration
        </CardTitle>
        <CardDescription>Connect your Stripe account to receive payments from your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Stripe Connect</h4>

          {connectLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-lg">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Checking connection status...
            </div>
          ) : status === "active" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400 p-3 rounded-lg">
                <Check className="w-4 h-4" />
                <span className="font-medium">Connected</span>
                <span className="text-green-600 dark:text-green-500 font-mono text-xs ml-auto">{maskedId}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dashboardMutation.mutate()}
                disabled={dashboardMutation.isPending}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {dashboardMutation.isPending ? "Opening..." : "View Stripe Dashboard"}
              </Button>
            </div>
          ) : status === "pending" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Setup in progress</span>
              </div>
              <p className="text-xs text-muted-foreground">Your Stripe account setup is not yet complete. Click below to continue where you left off.</p>
              <Button
                size="sm"
                onClick={() => onboardMutation.mutate()}
                disabled={onboardMutation.isPending}
              >
                {onboardMutation.isPending ? "Loading..." : "Continue Setup"}
              </Button>
            </div>
          ) : status === "restricted" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Account needs attention</span>
              </div>
              <p className="text-xs text-muted-foreground">Stripe requires additional information before you can accept payments. Click below to resolve.</p>
              <Button
                size="sm"
                onClick={() => onboardMutation.mutate()}
                disabled={onboardMutation.isPending}
              >
                {onboardMutation.isPending ? "Loading..." : "Complete Setup"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to start accepting payments. BoxStat handles the payment processing — you just need to link your account.
              </p>
              <Button
                onClick={() => onboardMutation.mutate()}
                disabled={onboardMutation.isPending}
              >
                {onboardMutation.isPending ? "Setting up..." : "Connect with Stripe"}
              </Button>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowLegacy(!showLegacy)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showLegacy ? "rotate-180" : ""}`} />
            Legacy API Key Settings
          </button>

          {showLegacy && (
            <div className="mt-3 space-y-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">These fields will be removed in a future update. Use Stripe Connect above instead.</p>

              {settings?.hasStripeKeys && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  <Check className="w-4 h-4" />
                  Legacy keys configured
                </div>
              )}

              <div>
                <Label htmlFor="stripe-pk">Publishable Key</Label>
                <Input
                  id="stripe-pk"
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  placeholder="pk_live_..."
                  className="font-mono text-sm"
                />
                {settings?.stripePublishableKey && !stripePublishableKey && (
                  <p className="text-xs text-gray-500 mt-1">Current: {settings.stripePublishableKey}</p>
                )}
              </div>

              <div>
                <Label htmlFor="stripe-sk">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="stripe-sk"
                    type={showSecret ? "text" : "password"}
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {settings?.stripeSecretKey && (
                  <p className="text-xs text-gray-500 mt-1">Current: {settings.stripeSecretKey}</p>
                )}
              </div>

              <div>
                <Label htmlFor="stripe-wh">Webhook Secret (optional)</Label>
                <div className="relative">
                  <Input
                    id="stripe-wh"
                    type={showWebhook ? "text" : "password"}
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                    placeholder="whsec_..."
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhook(!showWebhook)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {settings?.stripeWebhookSecret && (
                  <p className="text-xs text-gray-500 mt-1">Current: {settings.stripeWebhookSecret}</p>
                )}
              </div>

              <Button onClick={handleSave} disabled={saveMutation.isPending} variant="outline" size="sm">
                {saveMutation.isPending ? "Saving..." : "Save Legacy Settings"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BoxStatPlatformStripeSection() {
  const { toast } = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [technologyFeePercent, setTechnologyFeePercent] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/platform-settings/stripe"],
  });

  useEffect(() => {
    if (settings && !loaded) {
      setStripePublishableKey(settings.stripePublishableKey || "");
      if (settings.technologyFeePercent !== null && settings.technologyFeePercent !== undefined) {
        setTechnologyFeePercent(settings.technologyFeePercent.toString());
      }
      setLoaded(true);
    }
  }, [settings, loaded]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", "/api/platform-settings/stripe", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings/stripe"] });
      toast({ title: "BoxStat platform Stripe settings saved" });
      setStripeSecretKey("");
      setStripeWebhookSecret("");
    },
    onError: () => {
      toast({ title: "Failed to save platform settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const data: any = {};
    if (stripePublishableKey) data.stripePublishableKey = stripePublishableKey;
    if (stripeSecretKey) data.stripeSecretKey = stripeSecretKey;
    if (stripeWebhookSecret) data.stripeWebhookSecret = stripeWebhookSecret;
    if (technologyFeePercent !== "") data.technologyFeePercent = parseFloat(technologyFeePercent);
    saveMutation.mutate(data);
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <CreditCard className="w-5 h-5" />
          BoxStat Technology Fee
        </CardTitle>
        <CardDescription>Configure the BoxStat technology fee charged across all organizations and purchases</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.hasStripeKeys && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <Check className="w-4 h-4" />
            Platform Stripe is connected
          </div>
        )}

        <div>
          <Label htmlFor="platform-pk">Publishable Key</Label>
          <Input
            id="platform-pk"
            value={stripePublishableKey}
            onChange={(e) => setStripePublishableKey(e.target.value)}
            placeholder="pk_live_..."
            className="font-mono text-sm"
          />
          {settings?.stripePublishableKey && !stripePublishableKey && (
            <p className="text-xs text-gray-500 mt-1">Current: {settings.stripePublishableKey}</p>
          )}
        </div>

        <div>
          <Label htmlFor="platform-sk">Secret Key</Label>
          <div className="relative">
            <Input
              id="platform-sk"
              type={showSecret ? "text" : "password"}
              value={stripeSecretKey}
              onChange={(e) => setStripeSecretKey(e.target.value)}
              placeholder="sk_live_..."
              className="font-mono text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {settings?.stripeSecretKey && (
            <p className="text-xs text-gray-500 mt-1">Current: {settings.stripeSecretKey}</p>
          )}
        </div>

        <div>
          <Label htmlFor="platform-wh">Webhook Secret (optional)</Label>
          <div className="relative">
            <Input
              id="platform-wh"
              type={showWebhook ? "text" : "password"}
              value={stripeWebhookSecret}
              onChange={(e) => setStripeWebhookSecret(e.target.value)}
              placeholder="whsec_..."
              className="font-mono text-sm pr-10"
            />
            <button
              type="button"
              onClick={() => setShowWebhook(!showWebhook)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {settings?.stripeWebhookSecret && (
            <p className="text-xs text-gray-500 mt-1">Current: {settings.stripeWebhookSecret}</p>
          )}
        </div>

        <div>
          <Label htmlFor="tech-fee">Technology Fee (%)</Label>
          <Input
            id="tech-fee"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={technologyFeePercent}
            onChange={(e) => setTechnologyFeePercent(e.target.value)}
            placeholder="e.g. 2.5"
            className="w-32"
          />
          <p className="text-xs text-gray-500 mt-1">Percentage applied to all purchases across all organizations</p>
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
          {saveMutation.isPending ? "Saving..." : "Save Platform Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Settings Tab Component
function SettingsTab({ organization }: any) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });
  
  const userEmail = currentUser?.email || "";
  const userRole = currentUser?.role || "";

  const updateOrganization = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", "/api/organization", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/public"] });
      toast({ title: "Organization settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const [formData, setFormData] = useState(organization || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { primaryColor, secondaryColor, terminology, ...cleanData } = formData;
    updateOrganization.mutate({ name: cleanData.name, sportType: cleanData.sportType });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload/org-logo', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormData({ ...formData, logoUrl: data.imageUrl });
        queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
        queryClient.invalidateQueries({ queryKey: ["/api/organizations/public"] });
        toast({ title: "Logo uploaded successfully" });
      } else {
        toast({ title: "Failed to upload logo", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to upload logo", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };
  
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
  
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
    }
    await authPersistence.clearAll();
    localStorage.removeItem('selectedPlayerId');
    localStorage.removeItem('viewingAsParent');
    localStorage.removeItem('lastViewedProfileType');
    queryClient.clear();
    window.location.href = "/";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Customize your organization's branding and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt={formData.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 font-bold text-xl">{(formData.name || "O").charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="org-logo-upload" className="cursor-pointer">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4" />
                        {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                      </div>
                    </label>
                    <input
                      id="org-logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG or JPG, square recommended</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-org-name"
                />
              </div>

              <div>
                <Label htmlFor="sportType">Sport Type</Label>
                <Input
                  id="sportType"
                  value={formData.sportType || ""}
                  onChange={(e) => setFormData({ ...formData, sportType: e.target.value })}
                  placeholder="basketball, soccer, baseball, etc."
                  data-testid="input-sport-type"
                />
              </div>
            </div>

            <Button type="submit" disabled={updateOrganization.isPending} data-testid="button-save-settings">
              {updateOrganization.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <StripeSettingsSection />

      {userEmail === "jack@upyourperformance.org" && (
        <BoxStatPlatformStripeSection />
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign out or manage your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignOut}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
      
      {userEmail === "jack@upyourpeformance.org" && (
      <Card>
        <CardHeader>
          <CardTitle>Bug Reports</CardTitle>
          <CardDescription>Download all submitted bug reports</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => {
              window.location.href = "/api/bug-reports/download";
            }}
            data-testid="button-download-bug-reports"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Bug Reports (JSON)
          </Button>
        </CardContent>
      </Card>
      )}
      
      {/* Danger Zone */}
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
              data-testid="button-admin-delete-account"
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete Account Dialog */}
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
                data-testid="input-admin-confirm-email"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setConfirmEmail("");
              }}
              disabled={isDeleting}
              data-testid="button-admin-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmEmail !== userEmail}
              data-testid="button-admin-confirm-delete"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WaiversTab({ organization }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWaiver, setEditingWaiver] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [selectedWaiverIds, setSelectedWaiverIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: waivers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/waivers'],
  });

  const bulkDeleteWaivers = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/waivers/${id}`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waivers"] });
      const count = selectedWaiverIds.size;
      setSelectedWaiverIds(new Set());
      toast({ title: `${count} waiver(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete some waivers", variant: "destructive" });
    },
  });

  const toggleWaiverSelection = (waiverId: string) => {
    setSelectedWaiverIds(prev => {
      const next = new Set(prev);
      if (next.has(waiverId)) {
        next.delete(waiverId);
      } else {
        next.add(waiverId);
      }
      return next;
    });
  };

  const toggleAllWaivers = (waiverIds: string[]) => {
    if (selectedWaiverIds.size === waiverIds.length) {
      setSelectedWaiverIds(new Set());
    } else {
      setSelectedWaiverIds(new Set(waiverIds));
    }
  };

  const form = useForm({
    defaultValues: {
      name: "",
      title: "",
      content: "",
      requiresScroll: true,
      requiresCheckbox: true,
      checkboxLabel: "I have read and agree to the terms above",
      isActive: true,
    },
  });

  const createWaiver = useMutation({
    mutationFn: async (data: any) => {
      if (editingWaiver) {
        return apiRequest('PATCH', `/api/waivers/${editingWaiver.id}`, data);
      } else {
        return apiRequest('POST', '/api/waivers', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waivers'] });
      setIsDialogOpen(false);
      setEditingWaiver(null);
      form.reset();
      toast({
        title: editingWaiver ? "Waiver updated" : "Waiver created",
        description: editingWaiver ? "The waiver has been updated successfully." : "The new waiver has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save waiver",
        variant: "destructive",
      });
    },
  });

  const deleteWaiver = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/waivers/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waivers'] });
      setDeleteConfirm(null);
      toast({
        title: "Waiver deleted",
        description: "The waiver has been deleted successfully.",
      });
    },
  });

  const handleEdit = (waiver: any) => {
    setEditingWaiver(waiver);
    form.reset({
      name: waiver.name || "",
      title: waiver.title || "",
      content: waiver.content || "",
      requiresScroll: waiver.requiresScroll ?? true,
      requiresCheckbox: waiver.requiresCheckbox ?? true,
      checkboxLabel: waiver.checkboxLabel || "I have read and agree to the terms above",
      isActive: waiver.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingWaiver(null);
    form.reset({
      name: "",
      title: "",
      content: "",
      requiresScroll: true,
      requiresCheckbox: true,
      checkboxLabel: "I have read and agree to the terms above",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadWaiverTemplate = () => {
    const csvContent = "Title,Content,Required,Is Active\nLiability Waiver,By signing this waiver you agree to...,true,true\nMedia Release,I consent to the use of my photo...,false,true";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waivers-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadWaiversData = () => {
    const csvHeaders = "Title,Content,Required,Is Active";
    const csvRows = waivers.map((waiver: any) => {
      return [
        waiver.title || waiver.name || "",
        waiver.content || "",
        waiver.requiresCheckbox ? "true" : "false",
        waiver.isActive !== false ? "true" : "false"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waivers-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadWaivers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/waivers", {
            name: values[0],
            title: values[0],
            content: values[1] || "",
            requiresCheckbox: values[2]?.toLowerCase() !== "false",
            isActive: values[3]?.toLowerCase() !== "false",
            requiresScroll: true,
            checkboxLabel: "I have read and agree to the terms above",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create waiver:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/waivers"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} waivers` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle data-testid="title-waivers">Waivers & Agreements</CardTitle>
          <CardDescription>Create and manage waivers that can be required for products</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-waivers">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Waivers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Content, Required, Is Active</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUploadWaivers}
                  data-testid="input-waiver-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadWaiverTemplate} data-testid="button-download-waiver-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadWaiversData} data-testid="button-download-waivers">
            <Download className="w-4 h-4" />
          </Button>
          
          <Button size="icon" title="Create Waiver" onClick={handleCreate} data-testid="button-create-waiver">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedWaiverIds.size > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-800">
              {selectedWaiverIds.size} waiver{selectedWaiverIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedWaiverIds.size} waiver(s)?`)) {
                  bulkDeleteWaivers.mutate(Array.from(selectedWaiverIds));
                }
              }}
              disabled={bulkDeleteWaivers.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {bulkDeleteWaivers.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedWaiverIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading waivers...</div>
        ) : waivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No waivers created yet. Click "Create Waiver" to add your first waiver.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={waivers.length > 0 && selectedWaiverIds.size === waivers.length}
                    onCheckedChange={() => toggleAllWaivers(waivers.map((w: any) => w.id))}
                    aria-label="Select all waivers"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waivers.map((waiver: any) => (
                <TableRow key={waiver.id} data-testid={`row-waiver-${waiver.id}`}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedWaiverIds.has(waiver.id)}
                      onCheckedChange={() => toggleWaiverSelection(waiver.id)}
                      aria-label={`Select ${waiver.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-waiver-name-${waiver.id}`}>
                      {waiver.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600" data-testid={`text-waiver-title-${waiver.id}`}>
                      {waiver.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {waiver.requiresScroll && (
                        <Badge variant="secondary" className="text-xs">Must Scroll</Badge>
                      )}
                      {waiver.requiresCheckbox && (
                        <Badge variant="secondary" className="text-xs">Checkbox</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={waiver.isActive ? "default" : "secondary"}
                      data-testid={`badge-waiver-status-${waiver.id}`}
                    >
                      {waiver.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(waiver)}
                        data-testid={`button-edit-waiver-${waiver.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-waiver">
              {editingWaiver ? "Edit Waiver" : "Create New Waiver"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createWaiver.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Name *</FormLabel>
                    <FormDescription>A short name for internal reference (e.g., "AAU Membership")</FormDescription>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Concussion Waiver"
                        data-testid="input-waiver-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Title *</FormLabel>
                    <FormDescription>The title shown to users during registration</FormDescription>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., CDC HEADSUP Concussion Information"
                        data-testid="input-waiver-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waiver Content *</FormLabel>
                    <FormDescription>The full text of the waiver or agreement</FormDescription>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={12}
                        placeholder="Enter the full waiver text here..."
                        data-testid="input-waiver-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresScroll"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Require Scrolling</FormLabel>
                      <FormDescription>
                        User must scroll to the bottom before they can acknowledge
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-waiver-scroll"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresCheckbox"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Require Checkbox</FormLabel>
                      <FormDescription>
                        User must check a box to acknowledge
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-waiver-checkbox"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkboxLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checkbox Label</FormLabel>
                    <FormDescription>The text shown next to the acknowledgment checkbox</FormDescription>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="I have read and agree to the terms above"
                        data-testid="input-waiver-checkbox-label"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Only active waivers can be assigned to products
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-waiver-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-waiver"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createWaiver.isPending}
                  data-testid="button-save-waiver"
                >
                  {createWaiver.isPending ? "Saving..." : (editingWaiver ? "Update Waiver" : "Create Waiver")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Waiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              Products using this waiver will no longer require it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-waiver">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWaiver.mutate(deleteConfirm?.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-waiver"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Migrations Tab - Legacy Parent Stripe Data Management
const MIGRATIONS_PAGE_SIZE = 50;

function MigrationsTab({ organization, users }: any) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMigration, setEditingMigration] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'subscriptions' | 'payments'>('subscriptions');
  const [selectedMigrationIds, setSelectedMigrationIds] = useState<Set<number>>(new Set());

  const { data: migrations = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/migrations'],
  });

  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ['/api/programs'],
  });

  const storeProducts = programs.filter((p: any) => p.type === 'One-Time' || p.type === 'Store');
  const programProducts = programs.filter((p: any) => p.type !== 'One-Time' && p.type !== 'Store');

  const createMigration = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/migrations', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      setIsAddDialogOpen(false);
      setEditingMigration(null);
      toast({ title: "Migration record saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMigration = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/admin/migrations/${id}`, { method: 'PATCH', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      setEditingMigration(null);
      toast({ title: "Migration record updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMigration = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/migrations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      setDeleteConfirm(null);
      toast({ title: "Migration record deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMigrations = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => apiRequest(`/api/admin/migrations/${id}`, { method: 'DELETE' })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      toast({ title: `${selectedMigrationIds.size} migration record(s) deleted` });
      setSelectedMigrationIds(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMigrationSelection = (id: number) => {
    setSelectedMigrationIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllMigrations = (migrations: any[]) => {
    const ids = migrations.map((m: any) => m.id);
    if (selectedMigrationIds.size === ids.length) {
      setSelectedMigrationIds(new Set());
    } else {
      setSelectedMigrationIds(new Set(ids));
    }
  };

  // Migration entry mode: 'stripe' for clubs with Stripe history, 'manual' for clubs without
  const [migrationMode, setMigrationMode] = useState<'stripe' | 'manual'>('manual');
  
  // Items for this migration (itemId, itemType) - each item is added individually
  const [migrationItems, setMigrationItems] = useState<Array<{
    itemId: string; 
    itemType: 'program' | 'store'; 
    itemName: string;
    paymentType?: 'subscription' | 'payment';
    paymentDate?: string;
    expiryDate?: string;
    amountPaid?: number;
    stripePriceId?: string;
    nextDueDate?: string;
  }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedItemType, setSelectedItemType] = useState<'program' | 'store'>('program');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'subscription' | 'payment'>('subscription');
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<string>("");
  
  // Manual entry additional fields
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [sourceSystem, setSourceSystem] = useState<string>("");
  const [migrationNotes, setMigrationNotes] = useState<string>("");

  // Dynamic schema based on migration mode
  const stripeSchema = z.object({
    email: z.string().email("Valid email required"),
    stripeCustomerId: z.string().min(1, "Stripe Customer ID required"),
    stripeSubscriptionIds: z.string().min(1, "At least one Stripe Subscription ID required"),
  });
  
  const manualSchema = z.object({
    email: z.string().email("Valid email required"),
    stripeCustomerId: z.string().optional(),
    stripeSubscriptionIds: z.string().optional(),
  });
  
  const form = useForm({
    resolver: zodResolver(migrationMode === 'stripe' ? stripeSchema : manualSchema),
    defaultValues: {
      email: "",
      stripeCustomerId: "",
      stripeSubscriptionIds: "",
    },
  });

  const filteredMigrations = migrations.filter((m: any) => {
    const itemNames = (m.items || []).map((item: any) => item.itemName || '').join(' ');
    return m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.stripeCustomerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemNames?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredMigrations.length / MIGRATIONS_PAGE_SIZE));
  // Guard against currentPage exceeding totalPages (e.g., after deletion or data refresh)
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * MIGRATIONS_PAGE_SIZE;
  const endIndex = startIndex + MIGRATIONS_PAGE_SIZE;
  const paginatedMigrations = filteredMigrations.slice(startIndex, endIndex);
  
  // Auto-correct currentPage if it exceeds totalPages (using useEffect to avoid render loop)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const getItemsSummary = (items: any[] | null) => {
    if (!items || items.length === 0) return 'No items';
    return items.map(item => item.itemName || 'Unknown').join(', ');
  };

  // Calculate payment status for display
  // Shows the most critical status (expired > due soon > active)
  const getPaymentStatus = (items: any[] | null) => {
    if (!items || items.length === 0) return { status: 'none', label: 'No items', color: 'gray' };
    
    const now = new Date();
    const warningDays = 14; // Show warning 14 days before expiry
    
    let hasSubscription = false;
    let hasActivePayment = false;
    let nearestActiveExpiry: Date | null = null;
    let hasExpiredPayment = false;
    let expiredCount = 0;
    let dueSoonCount = 0;
    let nearestDueSoon: Date | null = null;
    
    for (const item of items) {
      if (item.paymentType === 'subscription' || !item.paymentType) {
        hasSubscription = true;
      } else if (item.paymentType === 'payment') {
        if (item.expiryDate) {
          const expiry = new Date(item.expiryDate);
          if (expiry < now) {
            hasExpiredPayment = true;
            expiredCount++;
          } else if (expiry.getTime() - now.getTime() < warningDays * 24 * 60 * 60 * 1000) {
            dueSoonCount++;
            if (!nearestDueSoon || expiry < nearestDueSoon) {
              nearestDueSoon = expiry;
            }
          } else {
            hasActivePayment = true;
            if (!nearestActiveExpiry || expiry < nearestActiveExpiry) {
              nearestActiveExpiry = expiry;
            }
          }
        } else {
          hasActivePayment = true; // Payment without expiry treated as active
        }
      }
    }
    
    // Priority: expired > due soon > active
    if (hasExpiredPayment) {
      return { 
        status: 'expired', 
        label: `${expiredCount} expired`, 
        color: 'red' 
      };
    }
    if (dueSoonCount > 0 && nearestDueSoon) {
      const daysLeft = Math.ceil((nearestDueSoon.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return { 
        status: 'due_soon', 
        label: `Due in ${daysLeft}d`, 
        color: 'amber' 
      };
    }
    if (hasActivePayment && nearestActiveExpiry) {
      return { 
        status: 'active', 
        label: `Until ${nearestActiveExpiry.toLocaleDateString()}`, 
        color: 'green' 
      };
    }
    if (hasSubscription) {
      return { status: 'subscription', label: 'Recurring', color: 'blue' };
    }
    if (hasActivePayment) {
      return { status: 'payment', label: 'Paid', color: 'green' };
    }
    return { status: 'unknown', label: '-', color: 'gray' };
  };

  const addItem = () => {
    if (!selectedProductId) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return;
    }
    const product = programs.find((p: any) => p.id === selectedProductId);
    if (!product) return;
    
    // Validate one-time payment fields
    if (selectedPaymentType === 'payment') {
      if (!paymentDate) {
        toast({ title: "Error", description: "Payment date is required for one-time payments", variant: "destructive" });
        return;
      }
      if (!expiryDate) {
        toast({ title: "Error", description: "Expiry date is required for one-time payments", variant: "destructive" });
        return;
      }
    }
    
    const newItem: any = {
      itemId: selectedProductId,
      itemType: selectedItemType,
      itemName: product.name,
      paymentType: selectedPaymentType,
    };
    
    if (selectedPaymentType === 'payment') {
      newItem.paymentDate = paymentDate;
      newItem.expiryDate = expiryDate;
      if (amountPaid) {
        newItem.amountPaid = Math.round(parseFloat(amountPaid) * 100); // Convert to cents
      }
    }
    
    setMigrationItems(prev => [...prev, newItem]);
    // Reset form fields
    setSelectedProductId("");
    setPaymentDate("");
    setExpiryDate("");
    setAmountPaid("");
  };

  const removeItem = (index: number) => {
    setMigrationItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (migration: any) => {
    setEditingMigration(migration);
    setMigrationItems(migration.items || []);
    // Load subscription IDs from array or legacy field
    const subscriptionIds = migration.stripeSubscriptionIds?.length > 0 
      ? migration.stripeSubscriptionIds.join(', ')
      : migration.stripeSubscriptionId || '';
    // Set migration mode from existing record (default to 'stripe' for legacy records)
    const mode = migration.migrationMode || 'stripe';
    setMigrationMode(mode);
    // Set manual entry fields from existing record
    setPaymentMethod(migration.paymentMethod || '');
    setReferenceNumber(migration.referenceNumber || '');
    setSourceSystem(migration.sourceSystem || '');
    setMigrationNotes(migration.notes || '');
    form.reset({
      email: migration.email,
      stripeCustomerId: migration.stripeCustomerId,
      stripeSubscriptionIds: subscriptionIds,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (data: any) => {
    if (migrationItems.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one item", 
        variant: "destructive" 
      });
      return;
    }
    
    let submitData: any = { 
      email: data.email,
      items: migrationItems,
      migrationMode: migrationMode,
    };
    
    if (migrationMode === 'stripe') {
      // Parse subscription IDs from comma/newline separated string into array
      const subscriptionIdsArray = (data.stripeSubscriptionIds || '')
        .split(/[,\n]/)
        .map((id: string) => id.trim())
        .filter((id: string) => id.length > 0);
      
      submitData = {
        ...submitData,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionIds: subscriptionIdsArray,
        // Keep legacy field for backward compatibility (first ID)
        stripeSubscriptionId: subscriptionIdsArray[0] || '',
      };
    } else {
      // Manual entry mode - include additional fields
      submitData = {
        ...submitData,
        stripeCustomerId: `manual_${Date.now()}`, // Generate placeholder ID
        stripeSubscriptionIds: [],
        stripeSubscriptionId: '',
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber,
        sourceSystem: sourceSystem,
        notes: migrationNotes,
      };
    }
    
    if (editingMigration) {
      updateMigration.mutate({ id: editingMigration.id, data: submitData });
    } else {
      createMigration.mutate(submitData);
    }
  };

  const openAddDialog = () => {
    setEditingMigration(null);
    setMigrationItems([]);
    setSelectedProductId("");
    setSelectedItemType('program');
    setSelectedPaymentType('subscription');
    setPaymentDate("");
    setExpiryDate("");
    setAmountPaid("");
    // Reset manual entry fields
    setPaymentMethod("");
    setReferenceNumber("");
    setSourceSystem("");
    setMigrationNotes("");
    setMigrationMode('manual'); // Default to manual mode for new entries
    form.reset({
      email: "",
      stripeCustomerId: "",
      stripeSubscriptionIds: "",
    });
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Loading migration data...
        </CardContent>
      </Card>
    );
  }

  // Download migrations as CSV (Stripe format)
  const downloadMigrationsData = () => {
    const csvHeaders = "Email,Customer Name,Stripe Customer ID,Subscription IDs,Subscriptions Count,Items,Status";
    const csvRows = migrations.map((migration: any) => {
      const itemsList = migration.items?.map((item: any) => 
        item.itemName || 'Unknown'
      ).join('; ') || '';
      const subscriptionIds = migration.stripeSubscriptionIds?.join('; ') || migration.stripeSubscriptionId || '';
      const subscriptionsCount = migration.subscriptions?.length || (migration.stripeSubscriptionId ? 1 : 0);
      return [
        migration.email || "",
        migration.customerName || "",
        migration.stripeCustomerId || "",
        subscriptionIds,
        subscriptionsCount.toString(),
        itemsList,
        migration.isClaimed ? "Claimed" : "Pending"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'migrations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async () => {
    if (!csvFile || isUploading) return;
    setIsUploading(true);
    setIsUploadDialogOpen(false);
    
    const text = await csvFile.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Map Stripe export column names to our field names
    const headerMap: Record<string, string> = {
      'id': 'subscriptionId',
      'customer id': 'customerId', 
      'customer email': 'email',
      'customer name': 'customerName',
      'customer description': 'customerDescription',
      'plan': 'plan',
      'quantity': 'quantity',
      'currency': 'currency',
      'interval': 'interval',
      'amount': 'amount',
      'status': 'status',
      'created (utc)': 'createdUtc',
      'start date (utc)': 'startDateUtc',
      'current period start (utc)': 'currentPeriodStartUtc',
      'current period end (utc)': 'currentPeriodEndUtc',
    };
    
    // Parse rows and group by email
    const groupedByEmail: Record<string, {
      email: string;
      customerId: string;
      customerName: string;
      customerDescription: string;
      subscriptions: any[];
    }> = {};
    
    for (let i = 1; i < lines.length; i++) {
      // More robust CSV parsing that correctly handles quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++; // Skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Push last value
      
      const row: Record<string, string> = {};
      
      headers.forEach((h, idx) => {
        const fieldName = headerMap[h] || h.replace(/[^a-z0-9]/gi, '');
        row[fieldName] = values[idx] || '';
      });
      
      // Debug first row parsing
      if (i === 1) {
        console.log('First row values count:', values.length);
        console.log('First row mapped:', row);
        console.log('Email field value:', row.email);
      }
      
      const email = row.email?.toLowerCase();
      if (!email) continue;
      
      if (!groupedByEmail[email]) {
        groupedByEmail[email] = {
          email,
          customerId: row.customerId || '',
          customerName: row.customerName || '',
          customerDescription: row.customerDescription || '',
          subscriptions: []
        };
      }
      
      // Add subscription data
      if (row.subscriptionId) {
        groupedByEmail[email].subscriptions.push({
          subscriptionId: row.subscriptionId,
          plan: row.plan || '',
          quantity: parseInt(row.quantity) || 1,
          currency: row.currency || 'usd',
          interval: row.interval || '',
          amount: row.amount || '',
          status: row.status || 'active',
          createdUtc: row.createdUtc || '',
          startDateUtc: row.startDateUtc || '',
          currentPeriodStartUtc: row.currentPeriodStartUtc || '',
          currentPeriodEndUtc: row.currentPeriodEndUtc || '',
        });
      }
    }
    
    // Create migration entries with program matching
    let successCount = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    const emailGroups = Object.values(groupedByEmail);
    console.log('CSV headers parsed:', headers);
    console.log('Grouped by email count:', emailGroups.length);
    if (emailGroups.length > 0) {
      console.log('First group sample:', emailGroups[0]);
    }
    
    for (const emailData of emailGroups) {
      try {
        // Match subscriptions to programs by price ID or product ID
        const items: any[] = [];
        
        for (const sub of emailData.subscriptions) {
          const priceId = sub.plan; // This is the Stripe price ID
          
          // Find program that has this price ID in stripePriceIds or matches stripeProductId
          const matchedProgram = programs.find((p: any) => {
            // Check if price ID is in the program's price list
            if (p.stripePriceIds && Array.isArray(p.stripePriceIds)) {
              if (p.stripePriceIds.includes(priceId)) return true;
            }
            // Also check stripeProductId (in case price ID was stored there)
            if (p.stripeProductId === priceId) return true;
            // Check if pricing options contain this price ID
            if (p.pricingOptions && Array.isArray(p.pricingOptions)) {
              if (p.pricingOptions.some((opt: any) => opt.stripePriceId === priceId)) return true;
            }
            return false;
          });
          
          if (matchedProgram) {
            matchedCount++;
            // Add as an item if not already present
            const existingItem = items.find((item: any) => item.itemId === String(matchedProgram.id));
            if (!existingItem) {
              items.push({
                itemId: String(matchedProgram.id),
                itemType: 'program',
                itemName: matchedProgram.name,
                quantity: sub.quantity || 1,
                paymentType: 'subscription',
                stripePriceId: priceId,
                nextDueDate: sub.currentPeriodEndUtc || '',
              });
            }
          } else {
            unmatchedCount++;
            console.log(`No program match for price ID: ${priceId}`);
          }
        }
        
        await apiRequest('/api/admin/migrations', { 
          method: 'POST', 
          data: { 
            email: emailData.email, 
            stripeCustomerId: emailData.customerId,
            customerName: emailData.customerName,
            customerDescription: emailData.customerDescription,
            stripeSubscriptionIds: emailData.subscriptions.map(s => s.subscriptionId),
            subscriptions: emailData.subscriptions,
            items
          } 
        });
        successCount++;
      } catch (e: any) {
        console.error('Failed to import migration:', emailData.email, e?.message || e);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
    setCsvFile(null);
    setIsUploading(false);
    
    let description = `Created ${successCount} migration entries. Matched ${matchedCount} subscriptions to programs.`;
    if (unmatchedCount > 0) {
      description += ` ${unmatchedCount} subscriptions could not be matched (check browser console for price IDs).`;
    }
    
    toast({ title: "Subscriptions import complete", description });
  };

  const handlePaymentsCsvUpload = async () => {
    if (!csvFile || isUploading) return;
    setIsUploading(true);
    setIsUploadDialogOpen(false);
    
    const text = await csvFile.text();
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Support both Stripe's native export format AND our template format
    const headerMap: Record<string, string> = {
      // Stripe's native Payments export format
      'customer email': 'email',
      'customer id': 'customerId',
      'created date (utc)': 'date',
      'amount': 'amount',
      'status': 'status',
      'description': 'description',
      'id': 'paymentId',
      // Our template format (fallback)
      'customer': 'email',
      'date': 'date',
      'payment method': 'paymentMethod',
    };
    
    const groupedByEmail: Record<string, {
      email: string;
      customerId: string;
      payments: Array<{
        amount: number;
        description: string;
        date: string;
        paymentId: string;
      }>;
    }> = {};
    
    let skippedDateCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      const line = lines[i];
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const fieldName = headerMap[h] || h.replace(/[^a-z0-9]/gi, '');
        row[fieldName] = values[idx] || '';
      });
      
      // Skip failed payments (only import 'Paid' status)
      const status = row.status?.trim().toLowerCase();
      if (status && status !== 'paid') {
        continue;
      }
      
      // Get email from 'email' field (mapped from 'Customer Email' or 'customer')
      const email = row.email?.toLowerCase();
      if (!email || !email.includes('@')) continue;
      
      const amountStr = row.amount?.replace(/[^0-9.-]/g, '') || '0';
      const amount = parseFloat(amountStr);
      
      if (!groupedByEmail[email]) {
        groupedByEmail[email] = { 
          email, 
          customerId: row.customerId || `legacy_${Date.now()}`,
          payments: [] 
        };
      }
      
      // Parse date - require year in the data for historical accuracy
      let parsedDate = '';
      const rawDate = row.date?.trim() || '';
      if (rawDate) {
        // Check if date contains a year (2020-2030 range)
        const hasYear = /\b20[2-3]\d\b/.test(rawDate);
        if (!hasYear) {
          console.warn(`Date "${rawDate}" for ${email} is missing year, skipping row`);
          skippedDateCount++;
          continue;
        }
        
        // Try direct parsing (handles ISO, "Jan 14, 2025, 2:45 PM", etc.)
        const testDate = new Date(rawDate);
        
        if (!isNaN(testDate.getTime())) {
          // Verify the parsed date has a reasonable year (2020-2030 range)
          const year = testDate.getFullYear();
          if (year >= 2020 && year <= 2030) {
            parsedDate = testDate.toISOString();
          } else {
            console.warn(`Date "${rawDate}" for ${email} has unexpected year ${year}, skipping row`);
            skippedDateCount++;
            continue;
          }
        } else {
          console.warn(`Could not parse date "${rawDate}" for ${email}, skipping row`);
          skippedDateCount++;
          continue;
        }
      } else {
        console.warn(`Missing date for payment from ${email}, skipping row`);
        skippedDateCount++;
        continue;
      }
      
      groupedByEmail[email].payments.push({
        amount,
        description: row.description || '',
        date: parsedDate,
        paymentId: row.paymentId || `pay_${Date.now()}_${i}`,
      });
    }
    
    let successCount = 0;
    let matchedCount = 0;
    let unmatchedCount = 0;
    const emailGroups = Object.values(groupedByEmail);
    
    for (const emailData of emailGroups) {
      try {
        const subscriptions: any[] = [];
        const items: any[] = [];
        
        for (const payment of emailData.payments) {
          const matchedProgram = programs.find((p: any) => {
            const programName = p.name?.toLowerCase() || '';
            const paymentDesc = payment.description?.toLowerCase() || '';
            return programName && paymentDesc && (
              paymentDesc.includes(programName) || 
              programName.includes(paymentDesc) ||
              paymentDesc.split(' ').some((word: string) => word.length > 3 && programName.includes(word))
            );
          });
          
          let periodEndUtc = '';
          if (payment.date && matchedProgram) {
            const paymentDate = new Date(payment.date);
            if (!isNaN(paymentDate.getTime())) {
              const defaultOption = matchedProgram.pricingOptions?.find((o: any) => o.isDefault) || matchedProgram.pricingOptions?.[0];
              const durationDays = defaultOption?.durationDays || matchedProgram.durationDays || 28;
              const endDate = new Date(paymentDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
              periodEndUtc = endDate.toISOString();
            }
          }
          
          subscriptions.push({
            subscriptionId: payment.paymentId,
            plan: matchedProgram?.stripeProductId || '',
            quantity: 1,
            currency: 'usd',
            interval: '',
            amount: String(Math.round(payment.amount * 100)),
            status: 'active',
            createdUtc: payment.date || '',
            startDateUtc: payment.date || '',
            currentPeriodStartUtc: payment.date || '',
            currentPeriodEndUtc: periodEndUtc,
            metadata: { description: payment.description, programId: matchedProgram?.id?.toString() || '' },
          });
          
          if (matchedProgram) {
            matchedCount++;
            const existingItem = items.find((item: any) => item.itemId === String(matchedProgram.id));
            if (!existingItem) {
              items.push({
                itemId: String(matchedProgram.id),
                itemType: 'program',
                itemName: matchedProgram.name,
                quantity: 1,
                paymentType: 'payment', // One-time payment from CSV
                paymentDate: payment.date || '',
                expiryDate: periodEndUtc || '',
                amountPaid: Math.round(payment.amount * 100),
              });
            }
          } else {
            unmatchedCount++;
          }
        }
        
        await apiRequest('/api/admin/migrations', { 
          method: 'POST', 
          data: { 
            email: emailData.email, 
            stripeCustomerId: emailData.customerId,
            customerName: '',
            customerDescription: 'Imported from Stripe payments',
            stripeSubscriptionIds: subscriptions.map(s => s.subscriptionId),
            subscriptions,
            items,
          } 
        });
        successCount++;
      } catch (e: any) {
        console.error('Failed to import payment migration:', emailData.email, e?.message || e);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
    setCsvFile(null);
    setIsUploading(false);
    
    let description = `Created ${successCount} migration entries. Matched ${matchedCount} payments to programs.`;
    if (skippedDateCount > 0) {
      description += ` Skipped ${skippedDateCount} rows with invalid dates.`;
    }
    if (unmatchedCount > 0) {
      description += ` ${unmatchedCount} payments could not be matched to programs.`;
    }
    
    toast({ 
      title: "Payments import complete", 
      description,
      variant: skippedDateCount > 0 || unmatchedCount > 0 ? "default" : "default"
    });
  };

  const handleUpload = () => {
    if (uploadType === 'payments') {
      handlePaymentsCsvUpload();
    } else {
      handleCsvUpload();
    }
  };

  return (
    <Card data-testid="migrations-tab">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Legacy Migrations
            </CardTitle>
            <CardDescription>
              Manage legacy parent subscriptions from the club payment system. Link Stripe data to player profiles.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-migrations">
                  <Upload className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] w-full">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Migrations</DialogTitle>
                  <DialogDescription>
                    Upload a Stripe export CSV to import legacy customer data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={uploadType === 'subscriptions' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUploadType('subscriptions')}
                      className="flex-1"
                    >
                      Subscriptions CSV
                    </Button>
                    <Button
                      variant={uploadType === 'payments' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUploadType('payments')}
                      className="flex-1"
                    >
                      Payments CSV
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    {uploadType === 'subscriptions' ? (
                      <p>Upload a Stripe <strong>Subscriptions</strong> export. Rows with the same email will be grouped with multiple subscription IDs and period dates.</p>
                    ) : (
                      <div className="space-y-2">
                        <p>Upload a Stripe <strong>Payments</strong> export. Payments will be matched to programs by description and end dates calculated from program duration.</p>
                        <p className="text-amber-600 font-medium">Note: Dates must include the year (e.g., "Jan 14, 2025"). Rows without valid dates will be skipped.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground flex-1">Need the template?</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const template = uploadType === 'subscriptions'
                          ? "id,Customer ID,Customer Description,Customer Email,Plan,Quantity,Currency,Interval,Amount,Status,Created (UTC),Start Date (UTC),Current Period Start (UTC),Current Period End (UTC),Customer Name\nsub_xxx,cus_xxx,,example@email.com,price_xxx,1,usd,month,2500,active,2025-01-01 00:00,2025-01-01 00:00,2025-01-01 00:00,2025-02-01 00:00,John Doe"
                          : "Amount,Status,Payment method,Description,Customer,Date\n$350.00,Succeeded,**** 1234,Youth Club,customer@email.com,Jan 14 2025 2:45 PM";
                        const blob = new Blob([template], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = uploadType === 'subscriptions' ? 'stripe_subscriptions_template.csv' : 'stripe_payments_template.csv';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="button-download-template"
                    >
                      Download Template
                    </Button>
                  </div>
                  <Input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    data-testid="input-upload-migrations-csv"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>Cancel</Button>
                  <Button onClick={handleUpload} disabled={!csvFile || isUploading}>
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="icon" title="Download Data" onClick={downloadMigrationsData} data-testid="button-download-migrations">
              <Download className="w-4 h-4" />
            </Button>
            
            <Button size="icon" title="Add Migration" onClick={openAddDialog} data-testid="button-add-migration">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by email, Stripe ID, or product..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
            data-testid="input-search-migrations"
          />
        </div>

        {selectedMigrationIds.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedMigrationIds.size} record{selectedMigrationIds.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedMigrationIds.size} migration record(s)?`)) {
                  bulkDeleteMigrations.mutate(Array.from(selectedMigrationIds));
                }
              }}
              disabled={bulkDeleteMigrations.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {bulkDeleteMigrations.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMigrationIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {filteredMigrations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? "No matching migration records found" : "No migration records yet. Add legacy parent data to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paginatedMigrations.length > 0 && selectedMigrationIds.size === paginatedMigrations.length}
                      onCheckedChange={() => toggleAllMigrations(paginatedMigrations)}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMigrations.map((migration: any) => {
                  const subscriptionCount = migration.subscriptions?.length || (migration.stripeSubscriptionId ? 1 : 0);
                  const paymentCount = (migration.items || []).filter((i: any) => i.paymentType === 'payment').length;
                  const paymentStatus = getPaymentStatus(migration.items);
                  // Count unmatched subscriptions (subs that don't have matching items)
                  const unmatchedCount = (migration.subscriptions || []).filter((sub: any) => 
                    !(migration.items || []).some((item: any) => item.stripePriceId === sub.plan)
                  ).length;
                  return (
                  <TableRow key={migration.id} data-testid={`row-migration-${migration.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMigrationIds.has(migration.id)}
                        onCheckedChange={() => toggleMigrationSelection(migration.id)}
                        aria-label={`Select ${migration.email}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{migration.email}</div>
                      {migration.customerName && (
                        <div className="text-xs text-gray-500">{migration.customerName}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[100px] truncate" title={migration.stripeCustomerId}>
                      {migration.stripeCustomerId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {subscriptionCount > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                            {subscriptionCount} sub{subscriptionCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {paymentCount > 0 && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                            {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {unmatchedCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {unmatchedCount} unmatched
                          </Badge>
                        )}
                        {subscriptionCount === 0 && paymentCount === 0 && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={getItemsSummary(migration.items)}>
                      {getItemsSummary(migration.items)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          paymentStatus.color === 'red' ? 'bg-red-100 text-red-800 border-red-300' :
                          paymentStatus.color === 'amber' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          paymentStatus.color === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
                          paymentStatus.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          paymentStatus.color === 'purple' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {paymentStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {migration.isClaimed ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Circle className="w-3 h-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(migration)}
                          data-testid={`button-edit-migration-${migration.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteConfirm(migration)}
                          data-testid={`button-delete-migration-${migration.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMigrations.length)} of {filteredMigrations.length} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          Total: {filteredMigrations.length} records • 
          Claimed: {filteredMigrations.filter((m: any) => m.isClaimed).length} • 
          Pending: {filteredMigrations.filter((m: any) => !m.isClaimed).length}
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMigration ? "Edit Migration Record" : "Add Migration Record"}</DialogTitle>
            <DialogDescription>
              {migrationMode === 'stripe' 
                ? "Enter the legacy parent Stripe data from the club payment system. When the parent signs up with this email, they will be prompted to claim their subscription."
                : "Add legacy enrollment records for members from your previous system. This works for clubs that weren't using Stripe before."
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <Label className="text-sm font-medium">Entry Mode:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={migrationMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMigrationMode('manual')}
                data-testid="btn-mode-manual"
              >
                Manual Entry
              </Button>
              <Button
                type="button"
                variant={migrationMode === 'stripe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMigrationMode('stripe')}
                data-testid="btn-mode-stripe"
              >
                Stripe Import
              </Button>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="parent@example.com" {...field} data-testid="input-migration-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Stripe Mode Fields */}
              {migrationMode === 'stripe' && (
                <>
                  <FormField
                    control={form.control}
                    name="stripeCustomerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Customer ID</FormLabel>
                        <FormControl>
                          <Input placeholder="cus_xxxxxxxxxxxxx" {...field} data-testid="input-migration-stripe-customer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stripeSubscriptionIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Subscription IDs</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="sub_xxxxxxxxxxxxx&#10;sub_yyyyyyyyyyyyy&#10;(one per line or comma-separated)" 
                            {...field} 
                            data-testid="input-migration-stripe-subs"
                            rows={3}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">Enter multiple subscription IDs separated by commas or new lines</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              
              {/* Manual Entry Mode Fields */}
              {migrationMode === 'manual' && (
                <div className="space-y-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Payment Details</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue placeholder="Select method..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="venmo">Venmo</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Reference # (optional)</Label>
                      <Input 
                        placeholder="Check #, receipt ID, etc." 
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        data-testid="input-reference-number"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Source System (optional)</Label>
                    <Select value={sourceSystem} onValueChange={setSourceSystem}>
                      <SelectTrigger data-testid="select-source-system">
                        <SelectValue placeholder="Where did this data come from?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paper_records">Paper Records</SelectItem>
                        <SelectItem value="spreadsheet">Spreadsheet / Excel</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                        <SelectItem value="other_software">Other Software</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Notes (optional)</Label>
                    <Textarea 
                      placeholder="Any additional notes about this enrollment..." 
                      value={migrationNotes}
                      onChange={(e) => setMigrationNotes(e.target.value)}
                      rows={2}
                      data-testid="input-migration-notes"
                    />
                  </div>
                </div>
              )}
              {/* Items List */}
              <div className="space-y-3">
                <FormLabel>Subscription Items</FormLabel>
                
                {/* Current Items */}
                {migrationItems.length > 0 && (
                  <div className="border rounded-md p-3 space-y-2 bg-gray-50">
                    {migrationItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.itemType === 'program' ? 'default' : 'secondary'} className="text-xs">
                              {item.itemType}
                            </Badge>
                            <Badge variant={item.paymentType === 'payment' ? 'outline' : 'default'} className="text-xs">
                              {item.paymentType === 'payment' ? 'One-Time' : 'Subscription'}
                            </Badge>
                            <span className="text-sm">{item.itemName}</span>
                          </div>
                          {item.paymentType === 'payment' && item.expiryDate && (
                            <div className="text-xs text-gray-500 mt-1">
                              Expires: {new Date(item.expiryDate).toLocaleDateString()}
                              {item.amountPaid && ` • $${(item.amountPaid / 100).toFixed(2)}`}
                            </div>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add New Item */}
                <div className="border rounded-md p-3 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Add Item (add each item individually)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Item Type</Label>
                      <Select value={selectedItemType} onValueChange={(v: 'program' | 'store') => setSelectedItemType(v)}>
                        <SelectTrigger data-testid="select-item-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="program">Program</SelectItem>
                          <SelectItem value="store">Store Product</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Payment Type</Label>
                      <Select value={selectedPaymentType} onValueChange={(v: 'subscription' | 'payment') => setSelectedPaymentType(v)}>
                        <SelectTrigger data-testid="select-payment-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription">Subscription (Recurring)</SelectItem>
                          <SelectItem value="payment">One-Time Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{selectedItemType === 'program' ? 'Program' : 'Store Product'}</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger data-testid="select-product">
                        <SelectValue placeholder="Select a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedItemType === 'store' ? storeProducts : programProducts).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* One-time payment fields */}
                  {selectedPaymentType === 'payment' && (
                    <div className="space-y-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium">One-Time Payment Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Payment Date</Label>
                          <Input 
                            type="date" 
                            value={paymentDate} 
                            onChange={(e) => setPaymentDate(e.target.value)}
                            data-testid="input-payment-date"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Expiry Date</Label>
                          <Input 
                            type="date" 
                            value={expiryDate} 
                            onChange={(e) => setExpiryDate(e.target.value)}
                            data-testid="input-expiry-date"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Amount Paid ($)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          value={amountPaid} 
                          onChange={(e) => setAmountPaid(e.target.value)}
                          data-testid="input-amount-paid"
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full" data-testid="button-add-item">
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
                
                {migrationItems.length === 0 && (
                  <p className="text-xs text-red-500">At least one item is required</p>
                )}
              </div>
              
              {/* Unmatched Subscriptions Section - Only show when editing */}
              {editingMigration?.subscriptions && editingMigration.subscriptions.length > 0 && (() => {
                // Find subscriptions that aren't matched to items yet
                const unmatchedSubs = (editingMigration.subscriptions || []).filter((sub: any) => {
                  // Check if this subscription's price ID is already in migrationItems
                  return !migrationItems.some((item: any) => item.stripePriceId === sub.plan);
                });
                
                if (unmatchedSubs.length === 0) return null;
                
                return (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2">
                      <FormLabel>Unmatched Subscriptions</FormLabel>
                      <Badge variant="destructive" className="text-xs">{unmatchedSubs.length}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">These subscriptions were imported but couldn't be auto-matched to programs. Select a program to link them.</p>
                    <div className="border rounded-md p-3 space-y-3 bg-amber-50">
                      {unmatchedSubs.map((sub: any, index: number) => (
                        <div key={sub.subscriptionId || index} className="bg-white p-3 rounded border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm">
                              <span className="font-mono text-xs text-gray-500">{sub.plan}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">${parseFloat(sub.amount || 0).toFixed(2)}</Badge>
                                <Badge variant="outline" className="text-xs">{sub.interval || 'one-time'}</Badge>
                                <span className="text-xs text-gray-500">
                                  Due: {sub.currentPeriodEndUtc ? new Date(sub.currentPeriodEndUtc).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(programId: string) => {
                                const program = programs.find((p: any) => String(p.id) === programId);
                                if (program) {
                                  setMigrationItems(prev => [...prev, {
                                    itemId: programId,
                                    itemType: 'program',
                                    itemName: program.name,
                                    paymentType: 'subscription',
                                    stripePriceId: sub.plan,
                                    nextDueDate: sub.currentPeriodEndUtc || '',
                                  }]);
                                }
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select program to match..." />
                              </SelectTrigger>
                              <SelectContent>
                                {programProducts.map((p: any) => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMigration.isPending || updateMigration.isPending} data-testid="button-save-migration">
                  {createMigration.isPending || updateMigration.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Migration Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the migration record for "{deleteConfirm?.email}"? 
              This will not affect any linked player subscriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMigration.mutate(deleteConfirm?.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-migration"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Communications Tab - combines Notifications and CRM
function CommunicationsTab({ notifications, users, teams, divisions, organization, initialCrmSubTab }: any) {
  const [activeSection, setActiveSection] = useState<'notifications' | 'messages'>(initialCrmSubTab === 'notifications' ? 'notifications' : 'messages');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeSection === 'messages' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('messages')}
          data-testid="button-comms-messages"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages
        </Button>
        <Button
          variant={activeSection === 'notifications' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSection('notifications')}
          data-testid="button-comms-notifications"
        >
          <Bell className="w-4 h-4 mr-2" />
          Announcements
        </Button>
      </div>

      {activeSection === 'notifications' && (
        <NotificationsTab notifications={notifications} users={users} teams={teams} divisions={divisions} organization={organization} />
      )}
      {activeSection === 'messages' && (
        <CRMTab organization={organization} users={users} teams={teams} initialSubTab="messages" />
      )}
    </div>
  );
}

// Teams By Program Tab - shows teams grouped by program
function TeamsByProgramTab({ programs: allPrograms, teams, organization, users }: any) {
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [manageTab, setManageTab] = useState<'roster' | 'coaches'>('roster');
  const programs = allPrograms.filter((p: any) => p.productCategory === 'service' || !p.productCategory);
  const players = (users || []).filter((u: any) => u.role === 'player');
  const coaches = (users || []).filter((u: any) => u.role === 'coach');
  
  const getTeamsForProgram = (programId: string) => {
    return teams.filter((t: any) => String(t.programId) === String(programId));
  };

  const unassignedTeams = teams.filter((t: any) => !t.programId || !programs.some((p: any) => String(p.id) === String(t.programId)));

  const renderTeamRow = (team: any) => {
    const rosterCount = players.filter((p: any) => {
      const ids = Array.isArray(p.teamIds) ? p.teamIds : p.teamId ? [p.teamId] : [];
      return ids.includes(team.id) || p.teamId === team.id;
    }).length;
    const headIds = team.headCoachIds?.length ? team.headCoachIds : (team.coachId ? [team.coachId] : []);
    const assistantIds = (team.assistantCoachIds || []).filter((id: string) => !headIds.includes(id));
    const allCoachIds = [...headIds, ...assistantIds];
    const coachNames = allCoachIds.map((id: string) => {
      const c = (users || []).find((u: any) => u.id === id);
      return c ? `${c.firstName} ${c.lastName}` : null;
    }).filter(Boolean);

    return (
      <div 
        key={team.id} 
        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => { setSelectedTeam(team); setRosterSearch(''); }}
      >
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-500" />
          <div>
            <div className="font-medium text-gray-900">{team.name}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <span className="text-xs text-gray-500">{rosterCount} player{rosterCount !== 1 ? 's' : ''}</span>
              {coachNames.length > 0 && (
                <span className="text-xs text-gray-500">{coachNames.join(', ')}</span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Teams by Program</h2>
        <Badge variant="outline">{teams.length} total teams</Badge>
      </div>

      {programs.map((program: any) => {
        const programTeams = getTeamsForProgram(program.id);
        if (programTeams.length === 0) return null;
        return (
          <Card key={program.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-red-600" />
                <h3 className="font-semibold text-gray-900">{program.name}</h3>
                <Badge variant="secondary" className="text-xs">{programTeams.length} team{programTeams.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="space-y-2">
                {programTeams.map(renderTeamRow)}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {unassignedTeams.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-500">Unassigned Teams</h3>
              <Badge variant="secondary" className="text-xs">{unassignedTeams.length}</Badge>
            </div>
            <div className="space-y-2">
              {unassignedTeams.map(renderTeamRow)}
            </div>
          </CardContent>
        </Card>
      )}

      {teams.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
            <p className="text-gray-600">Teams will appear here once created and assigned to programs.</p>
          </CardContent>
        </Card>
      )}

      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => { setSelectedTeam(null); setRosterSearch(''); setManageTab('roster'); }}>
          <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Team - {selectedTeam.name}</DialogTitle>
              <CardDescription>
                Manage players and coaching staff for this team
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 border-b">
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${manageTab === 'roster' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setManageTab('roster')}
                >
                  Players
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${manageTab === 'coaches' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setManageTab('coaches')}
                >
                  Coaches
                </button>
              </div>

              {manageTab === 'coaches' && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Current Coaching Staff</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const headIds = selectedTeam.headCoachIds?.length ? selectedTeam.headCoachIds : (selectedTeam.coachId ? [selectedTeam.coachId] : []);
                        const assistantIds = selectedTeam.assistantCoachIds || [];
                        if (headIds.length === 0 && assistantIds.length === 0) {
                          return <span className="text-xs text-gray-400">No coaches assigned</span>;
                        }
                        return (
                          <>
                            {headIds.map((id: string) => {
                              const c = (users || []).find((u: any) => u.id === id);
                              return c ? (
                                <Badge key={id} className="bg-red-100 text-red-700 border-red-200">
                                  HC: {c.firstName} {c.lastName}
                                </Badge>
                              ) : null;
                            })}
                            {assistantIds.filter((id: string) => !headIds.includes(id)).map((id: string) => {
                              const c = (users || []).find((u: any) => u.id === id);
                              return c ? (
                                <Badge key={id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  AC: {c.firstName} {c.lastName}
                                </Badge>
                              ) : null;
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <Input
                    placeholder="Search coaches by name..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />

                  <div className="max-h-72 overflow-y-auto border rounded-lg">
                    {coaches.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No coaches available</p>
                    ) : (
                      (() => {
                        const filteredCoaches = rosterSearch.trim()
                          ? coaches.filter((c: any) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(rosterSearch.toLowerCase()))
                          : coaches;
                        return filteredCoaches.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No coaches match your search</p>
                        ) : (
                          filteredCoaches.map((coach: any) => {
                            const headIds = selectedTeam.headCoachIds?.length ? selectedTeam.headCoachIds : (selectedTeam.coachId ? [selectedTeam.coachId] : []);
                            const assistantIds = selectedTeam.assistantCoachIds || [];
                            const isHead = headIds.includes(coach.id);
                            const isAssistant = assistantIds.includes(coach.id);
                            const isAssigned = isHead || isAssistant;
                            return (
                              <div 
                                key={coach.id} 
                                className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0 ${isAssigned ? 'bg-blue-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={isAssigned}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        const currentHeadIds = selectedTeam.headCoachIds?.length ? [...selectedTeam.headCoachIds] : (selectedTeam.coachId ? [selectedTeam.coachId] : []);
                                        const currentAssistantIds = [...(selectedTeam.assistantCoachIds || [])];
                                        
                                        if (checked) {
                                          if (!currentAssistantIds.includes(coach.id) && !currentHeadIds.includes(coach.id)) {
                                            currentAssistantIds.push(coach.id);
                                          }
                                        } else {
                                          const headIdx = currentHeadIds.indexOf(coach.id);
                                          if (headIdx !== -1) currentHeadIds.splice(headIdx, 1);
                                          const asstIdx = currentAssistantIds.indexOf(coach.id);
                                          if (asstIdx !== -1) currentAssistantIds.splice(asstIdx, 1);
                                        }
                                        
                                        await apiRequest("PATCH", `/api/teams/${selectedTeam.id}`, {
                                          headCoachIds: currentHeadIds,
                                          assistantCoachIds: currentAssistantIds,
                                          coachId: currentHeadIds[0] || null,
                                        });
                                        
                                        setSelectedTeam((prev: any) => ({
                                          ...prev,
                                          headCoachIds: currentHeadIds,
                                          assistantCoachIds: currentAssistantIds,
                                          coachId: currentHeadIds[0] || null,
                                        }));
                                        
                                        queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                                        toast({ 
                                          title: checked 
                                            ? `Added ${coach.firstName} ${coach.lastName} as coach`
                                            : `Removed ${coach.firstName} ${coach.lastName} from coaching staff`
                                        });
                                      } catch (error) {
                                        toast({ title: "Failed to update coaching staff", variant: "destructive" });
                                      }
                                    }}
                                  />
                                  <div>
                                    <p className={`text-sm ${isAssigned ? 'font-medium text-blue-700' : ''}`}>{coach.firstName} {coach.lastName}</p>
                                    {coach.email && <p className="text-xs text-gray-400">{coach.email}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isAssigned && (
                                    <Select
                                      value={isHead ? 'head' : 'assistant'}
                                      onValueChange={async (val) => {
                                        try {
                                          const currentHeadIds = selectedTeam.headCoachIds?.length ? [...selectedTeam.headCoachIds] : (selectedTeam.coachId ? [selectedTeam.coachId] : []);
                                          const currentAssistantIds = [...(selectedTeam.assistantCoachIds || [])];
                                          
                                          const hIdx = currentHeadIds.indexOf(coach.id);
                                          if (hIdx !== -1) currentHeadIds.splice(hIdx, 1);
                                          const aIdx = currentAssistantIds.indexOf(coach.id);
                                          if (aIdx !== -1) currentAssistantIds.splice(aIdx, 1);
                                          
                                          if (val === 'head') {
                                            currentHeadIds.push(coach.id);
                                          } else {
                                            currentAssistantIds.push(coach.id);
                                          }
                                          
                                          await apiRequest("PATCH", `/api/teams/${selectedTeam.id}`, {
                                            headCoachIds: currentHeadIds,
                                            assistantCoachIds: currentAssistantIds,
                                            coachId: currentHeadIds[0] || null,
                                          });
                                          
                                          setSelectedTeam((prev: any) => ({
                                            ...prev,
                                            headCoachIds: currentHeadIds,
                                            assistantCoachIds: currentAssistantIds,
                                            coachId: currentHeadIds[0] || null,
                                          }));
                                          
                                          queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                                          toast({ title: `Updated ${coach.firstName} ${coach.lastName} to ${val === 'head' ? 'Head Coach' : 'Assistant Coach'}` });
                                        } catch (error) {
                                          toast({ title: "Failed to update coach role", variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="head">Head Coach</SelectItem>
                                        <SelectItem value="assistant">Assistant</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {manageTab === 'roster' && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Coaching Staff</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const headIds = selectedTeam.headCoachIds?.length ? selectedTeam.headCoachIds : (selectedTeam.coachId ? [selectedTeam.coachId] : []);
                        const assistantIds = selectedTeam.assistantCoachIds || [];
                        if (headIds.length === 0 && assistantIds.length === 0) {
                          return <span className="text-xs text-gray-400">No coaches assigned</span>;
                        }
                        return (
                          <>
                            {headIds.map((id: string) => {
                              const c = (users || []).find((u: any) => u.id === id);
                              return c ? (
                                <Badge key={id} className="bg-red-100 text-red-700 border-red-200">
                                  HC: {c.firstName} {c.lastName}
                                </Badge>
                              ) : null;
                            })}
                            {assistantIds.filter((id: string) => !headIds.includes(id)).map((id: string) => {
                              const c = (users || []).find((u: any) => u.id === id);
                              return c ? (
                                <Badge key={id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  AC: {c.firstName} {c.lastName}
                                </Badge>
                              ) : null;
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <Input
                    placeholder="Search players by name..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />

                  {(() => {
                    const rosterPlayers = players.filter((p: any) => {
                      const userTeamIds = Array.isArray(p.teamIds) ? p.teamIds : p.teamId ? [p.teamId] : [];
                      return userTeamIds.includes(selectedTeam.id) || p.teamId === selectedTeam.id;
                    });
                    return rosterPlayers.length > 0 ? (
                      <div className="border rounded-lg p-3 bg-green-50">
                        <p className="text-xs font-semibold text-green-700 mb-2">Current Roster ({rosterPlayers.length} players)</p>
                        <div className="flex flex-wrap gap-1">
                          {rosterPlayers.map((player: any) => (
                            <div key={player.id} className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              <span>{player.firstName} {player.lastName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="max-h-72 overflow-y-auto border rounded-lg">
                    {players.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No players available</p>
                    ) : (
                      (() => {
                        const filteredPlayers = rosterSearch.trim()
                          ? players.filter((p: any) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(rosterSearch.toLowerCase()))
                          : players;
                        return filteredPlayers.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No players match your search</p>
                        ) : (
                          filteredPlayers.map((player: any) => {
                            const userTeamIds = Array.isArray(player.teamIds) ? player.teamIds : player.teamId ? [player.teamId] : [];
                            const isOnTeam = userTeamIds.includes(selectedTeam.id) || player.teamId === selectedTeam.id;
                            return (
                              <div 
                                key={player.id} 
                                className={`flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0 ${isOnTeam ? 'bg-green-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={isOnTeam}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        if (checked) {
                                          await apiRequest("POST", `/api/teams/${selectedTeam.id}/assign-player`, { playerId: player.id });
                                        } else {
                                          await apiRequest("POST", `/api/teams/${selectedTeam.id}/remove-player`, { playerId: player.id });
                                        }
                                        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                        queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                                        toast({ 
                                          title: checked 
                                            ? `Added ${player.firstName} ${player.lastName} to ${selectedTeam.name}`
                                            : `Removed ${player.firstName} ${player.lastName} from ${selectedTeam.name}`
                                        });
                                      } catch (error) {
                                        toast({ title: "Failed to update player assignment", variant: "destructive" });
                                      }
                                    }}
                                  />
                                  <div>
                                    <p className={`text-sm ${isOnTeam ? 'font-medium text-green-700' : ''}`}>{player.firstName} {player.lastName}</p>
                                    {player.email && <p className="text-xs text-gray-400">{player.email}</p>}
                                  </div>
                                </div>
                                {isOnTeam && (
                                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">On Team</Badge>
                                )}
                              </div>
                            );
                          })
                        );
                      })()
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Roster Count:</strong> {players.filter((p: any) => {
                      const userTeamIds = Array.isArray(p.teamIds) ? p.teamIds : p.teamId ? [p.teamId] : [];
                      return userTeamIds.includes(selectedTeam.id) || p.teamId === selectedTeam.id;
                    }).length} players
                    {selectedTeam.rosterSize > 0 && <span className="text-gray-400"> / {selectedTeam.rosterSize} max</span>}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// CRM Tab Component
function CRMTab({ organization, users, teams, initialSubTab }: any) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'leads' | 'messages'>(initialSubTab || 'leads');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [viewingEvaluation, setViewingEvaluation] = useState<any>(null);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messagesFilter, setMessagesFilter] = useState<'users' | 'teams'>('users');
  const [selectedTeamChat, setSelectedTeamChat] = useState<{ teamId: number; channel: 'players' | 'parents'; teamName: string } | null>(null);
  const [teamChatMessage, setTeamChatMessage] = useState("");
  const [clearChannelConfirm, setClearChannelConfirm] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState<string>('');
  const [newMessageText, setNewMessageText] = useState('');
  const [newMessageSearch, setNewMessageSearch] = useState('');

  // Fetch CRM leads
  const { data: leads = [], refetch: refetchLeads } = useQuery<any[]>({
    queryKey: ['/api/crm/leads'],
  });

  // Fetch contact management messages
  const { data: contactMessages = [], refetch: refetchMessages } = useQuery<any[]>({
    queryKey: ['/api/contact-management'],
  });

  // Fetch team chat messages for selected team/channel
  const { data: teamChatMessages = [], refetch: refetchTeamChatMessages } = useQuery<any[]>({
    queryKey: [`/api/messages/team/${selectedTeamChat?.teamId}?channel=${selectedTeamChat?.channel}`],
    enabled: !!selectedTeamChat,
  });

  // Delete message mutation (for admin)
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/messages/${messageId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      refetchTeamChatMessages();
      toast({ title: "Message deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  // Send team chat message mutation (for admin)
  const sendTeamChatMutation = useMutation({
    mutationFn: async (data: { teamId: number; channel: 'players' | 'parents'; message: string }) => {
      return apiRequest('/api/messages/team', { method: 'POST', data: { teamId: data.teamId, content: data.message, chatChannel: data.channel } });
    },
    onSuccess: () => {
      refetchTeamChatMessages();
      setTeamChatMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  // Fetch muted users for selected team channel
  const { data: mutedUsers = [], refetch: refetchMutedUsers } = useQuery<any[]>({
    queryKey: ['/api/teams', selectedTeamChat?.teamId, 'mutes', selectedTeamChat?.channel],
    queryFn: async () => {
      if (!selectedTeamChat) return [];
      const res = await fetch(`/api/teams/${selectedTeamChat.teamId}/mutes?channel=${selectedTeamChat.channel}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
      });
      if (!res.ok) throw new Error('Failed to fetch muted users');
      return res.json();
    },
    enabled: !!selectedTeamChat,
  });

  // Pin/unpin message mutation
  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: number; isPinned: boolean }) => {
      return apiRequest(`/api/messages/${messageId}/pin`, { method: 'PATCH', data: { isPinned } });
    },
    onSuccess: () => {
      refetchTeamChatMessages();
      toast({ title: "Message updated" });
    },
    onError: () => {
      toast({ title: "Failed to update message", variant: "destructive" });
    },
  });

  // Clear channel mutation
  const clearChannelMutation = useMutation({
    mutationFn: async ({ teamId, channel }: { teamId: number; channel: string }) => {
      return apiRequest(`/api/messages/team/${teamId}/channel/${channel}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      refetchTeamChatMessages();
      setClearChannelConfirm(false);
      toast({ title: "Channel cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear channel", variant: "destructive" });
    },
  });

  // Mute user mutation
  const muteUserMutation = useMutation({
    mutationFn: async ({ userId, teamId, channel }: { userId: string; teamId: number; channel: string }) => {
      return apiRequest(`/api/teams/${teamId}/mute`, { method: 'POST', data: { userId, channel } });
    },
    onSuccess: () => {
      refetchMutedUsers();
      toast({ title: "User muted" });
    },
    onError: () => {
      toast({ title: "Failed to mute user", variant: "destructive" });
    },
  });

  // Unmute user mutation
  const unmuteUserMutation = useMutation({
    mutationFn: async ({ userId, teamId, channel }: { userId: string; teamId: number; channel: string }) => {
      return apiRequest(`/api/teams/${teamId}/mute`, { method: 'DELETE', data: { userId, channel } });
    },
    onSuccess: () => {
      refetchMutedUsers();
      toast({ title: "User unmuted" });
    },
    onError: () => {
      toast({ title: "Failed to unmute user", variant: "destructive" });
    },
  });

  // Mark contact message as read mutation
  const markMessageAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/contact-management/${id}`, { method: 'PATCH', data: { status: 'read' } });
    },
    onSuccess: () => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/crm-unread'] });
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/crm/leads', { method: 'POST', data });
    },
    onSuccess: () => {
      refetchLeads();
      setIsAddLeadOpen(false);
      toast({ title: "Lead created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create lead", variant: "destructive" });
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest(`/api/crm/leads/${id}`, { method: 'PATCH', data });
    },
    onSuccess: () => {
      refetchLeads();
      toast({ title: "Lead updated" });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      return apiRequest('/api/crm/notes', { method: 'POST', data: { leadId, content } });
    },
    onSuccess: () => {
      refetchLeads();
      setNewNote("");
      toast({ title: "Note added" });
    },
  });

  // Reply to contact message mutation
  const replyMessageMutation = useMutation({
    mutationFn: async ({ parentId, message }: { parentId: number; message: string }) => {
      return apiRequest(`/api/contact-management/${parentId}/reply`, { method: 'POST', data: { message } });
    },
    onSuccess: () => {
      refetchMessages();
      setReplyMessage("");
      toast({ title: "Reply sent" });
    },
  });

  const sendNewMessageMutation = useMutation({
    mutationFn: async ({ recipientUserId, message }: { recipientUserId: string; message: string }) => {
      return apiRequest('/api/contact-management/admin-initiate', { method: 'POST', data: { recipientUserId, message } });
    },
    onSuccess: () => {
      refetchMessages();
      setNewMessageText('');
      setNewMessageRecipient('');
      setNewMessageSearch('');
      setIsNewMessageOpen(false);
      toast({ title: "Message sent successfully" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  // Lead form
  const leadForm = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      source: 'manual',
      status: 'new',
    },
  });

  const handleCreateLead = (data: any) => {
    createLeadMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          Communications
        </CardTitle>
        <CardDescription>Manage leads and customer communications</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Sub-tabs */}
        <div className="flex gap-2 mb-6 border-b pb-2">
          <Button
            variant={activeTab === 'leads' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('leads')}
            data-testid="button-crm-leads"
          >
            <Users className="w-4 h-4 mr-2" />
            Leads
          </Button>
          <Button
            variant={activeTab === 'messages' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('messages')}
            data-testid="button-crm-messages"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </Button>
        </div>

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Lead Management</h3>
              <Button onClick={() => setIsAddLeadOpen(true)} data-testid="button-add-lead">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No leads yet. Add your first lead to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead: any) => (
                    <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                      <TableCell>
                        <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</div>}
                          {lead.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(status) => updateLeadMutation.mutate({ id: lead.id, status })}
                        >
                          <SelectTrigger className="w-32" data-testid={`select-lead-status-${lead.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLead(lead)}
                            data-testid={`button-view-lead-${lead.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500">Filter:</span>
              <Button
                variant={messagesFilter === 'users' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMessagesFilter('users'); setSelectedTeamChat(null); }}
                data-testid="button-filter-users"
              >
                <User className="w-4 h-4 mr-1" />
                Single Users
              </Button>
              <Button
                variant={messagesFilter === 'teams' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMessagesFilter('teams'); setSelectedConversation(null); }}
                data-testid="button-filter-teams"
              >
                <Users className="w-4 h-4 mr-1" />
                Team Chats
              </Button>
            </div>
            
            {/* Single Users Messages */}
            {messagesFilter === 'users' && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Contact Management Messages</h3>
                  <Dialog open={isNewMessageOpen} onOpenChange={(open) => { setIsNewMessageOpen(open); if (!open) { setNewMessageRecipient(''); setNewMessageText(''); setNewMessageSearch(''); } }}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-new-message">
                        <Plus className="w-4 h-4 mr-2" />
                        New Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Send Message to User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Select User</Label>
                          <Input
                            placeholder="Search by name or email..."
                            value={newMessageSearch}
                            onChange={(e) => setNewMessageSearch(e.target.value)}
                            data-testid="input-new-message-search"
                          />
                          {newMessageSearch.trim() && (
                            <div className="border rounded-md max-h-40 overflow-y-auto">
                              {users
                                .filter((u: any) => {
                                  const search = newMessageSearch.toLowerCase();
                                  return (
                                    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) ||
                                    (u.email && u.email.toLowerCase().includes(search))
                                  );
                                })
                                .slice(0, 10)
                                .map((u: any) => (
                                  <div
                                    key={u.id}
                                    className={`p-2 text-sm cursor-pointer hover:bg-gray-100 ${newMessageRecipient === u.id ? 'bg-blue-50 font-medium' : ''}`}
                                    onClick={() => {
                                      setNewMessageRecipient(u.id);
                                      setNewMessageSearch(`${u.firstName} ${u.lastName}`);
                                    }}
                                    data-testid={`new-msg-user-${u.id}`}
                                  >
                                    <div>{u.firstName} {u.lastName}</div>
                                    <div className="text-xs text-gray-500">{u.email} ({u.role})</div>
                                  </div>
                                ))
                              }
                              {users.filter((u: any) => {
                                const search = newMessageSearch.toLowerCase();
                                return `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) || (u.email && u.email.toLowerCase().includes(search));
                              }).length === 0 && (
                                <div className="p-2 text-sm text-gray-500">No users found</div>
                              )}
                            </div>
                          )}
                          {newMessageRecipient && !newMessageSearch.trim() && (
                            <p className="text-xs text-green-600">User selected</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            placeholder="Type your message..."
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            rows={4}
                            data-testid="input-new-message-text"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => sendNewMessageMutation.mutate({ recipientUserId: newMessageRecipient, message: newMessageText })}
                          disabled={!newMessageRecipient || !newMessageText.trim() || sendNewMessageMutation.isPending}
                          data-testid="button-send-new-message"
                        >
                          {sendNewMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {contactMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No messages yet. Messages from parents will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conversation list */}
                    <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                      {contactMessages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${selectedConversation?.id === msg.id ? 'bg-gray-100 border-l-4 border-red-600' : ''}`}
                          onClick={() => {
                            setSelectedConversation(msg);
                            if (msg.status === 'unread') {
                              markMessageAsReadMutation.mutate(msg.id);
                            }
                          }}
                          data-testid={`conversation-${msg.id}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-sm">
                              {msg.sender?.firstName} {msg.sender?.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(msg.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{msg.message}</p>
                          {msg.status === 'unread' && <Badge variant="default" className="mt-1">New</Badge>}
                        </div>
                      ))}
                    </div>

                    {/* Conversation detail */}
                    <div className="border rounded-lg p-4">
                      {selectedConversation ? (
                        <div className="space-y-4">
                          <div className="border-b pb-2">
                            <h4 className="font-medium">
                              {selectedConversation.sender?.firstName} {selectedConversation.sender?.lastName}
                            </h4>
                            <p className="text-xs text-gray-500">{selectedConversation.sender?.email}</p>
                          </div>
                          
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            <div className="bg-gray-100 rounded-lg p-3">
                              <p className="text-sm">{selectedConversation.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(selectedConversation.createdAt).toLocaleString()}
                              </p>
                            </div>
                            
                            {selectedConversation.replies?.map((reply: any) => (
                              <div key={reply.id} className={`rounded-lg p-3 ${reply.isAdmin ? 'bg-red-50 ml-4' : 'bg-gray-100'}`}>
                                <p className="text-sm">{reply.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {reply.isAdmin ? 'Admin' : 'User'} - {new Date(reply.createdAt).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2 border-t">
                            <Input
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Type a reply..."
                              data-testid="input-reply-message"
                            />
                            <Button
                              onClick={() => replyMessageMutation.mutate({ parentId: selectedConversation.id, message: replyMessage })}
                              disabled={!replyMessage.trim() || replyMessageMutation.isPending}
                              data-testid="button-send-reply"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Select a conversation to view</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Team Chats */}
            {messagesFilter === 'teams' && (
              <>
                <h3 className="font-medium">Team Chat Rooms</h3>
                
                {teams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>No teams created yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Team/Channel list */}
                    <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                      {teams.map((team: any) => (
                        <div key={team.id} className="space-y-1">
                          <div className="font-medium text-sm px-2 pt-2">{team.name}</div>
                          <div
                            className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${selectedTeamChat?.teamId === team.id && selectedTeamChat?.channel === 'players' ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                            onClick={() => setSelectedTeamChat({ teamId: team.id, channel: 'players', teamName: team.name })}
                            data-testid={`team-chat-players-${team.id}`}
                          >
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">Players</Badge>
                            <span className="text-sm text-gray-600">Player Channel</span>
                          </div>
                          <div
                            className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${selectedTeamChat?.teamId === team.id && selectedTeamChat?.channel === 'parents' ? 'bg-green-50 border-l-4 border-green-600' : ''}`}
                            onClick={() => setSelectedTeamChat({ teamId: team.id, channel: 'parents', teamName: team.name })}
                            data-testid={`team-chat-parents-${team.id}`}
                          >
                            <Badge variant="outline" className="bg-green-50 text-green-700">Parents</Badge>
                            <span className="text-sm text-gray-600">Parent Channel</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Team Chat Messages */}
                    <div className="border rounded-lg p-4">
                      {selectedTeamChat ? (
                        <div className="space-y-4">
                          {/* Channel header with Clear All button */}
                          <div className="border-b pb-2 flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{selectedTeamChat.teamName}</h4>
                              <Badge variant="outline" className={selectedTeamChat.channel === 'players' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
                                {selectedTeamChat.channel === 'players' ? 'Player Channel' : 'Parent Channel'}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => setClearChannelConfirm(true)}
                              data-testid="button-clear-channel"
                            >
                              <Eraser className="w-3 h-3 mr-1" />
                              Clear All
                            </Button>
                          </div>

                          {/* Pinned messages */}
                          {teamChatMessages.some((m: any) => m.isPinned) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="flex items-center gap-1 text-xs font-semibold text-yellow-700 mb-2">
                                <Pin className="w-3 h-3" />
                                Pinned Messages
                              </div>
                              {teamChatMessages.filter((m: any) => m.isPinned).map((msg: any) => (
                                <div key={msg.id} className="text-sm text-yellow-800 py-1 border-b border-yellow-200 last:border-0">
                                  <span className="font-medium">{msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Unknown'}:</span> {msg.content}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Muted users */}
                          {mutedUsers.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <div className="flex items-center gap-1 text-xs font-semibold text-orange-700 mb-2">
                                <VolumeX className="w-3 h-3" />
                                Muted Users
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {mutedUsers.map((mute: any) => {
                                  const user = (users || []).find((u: any) => u.id === mute.userId)
                                    || teams.flatMap((t: any) => t.players || []).find((p: any) => p.id === mute.userId);
                                  const label = user ? `${user.firstName} ${user.lastName}` : mute.userId;
                                  return (
                                    <div key={mute.id} className="flex items-center gap-1 bg-orange-100 rounded px-2 py-1 text-xs">
                                      <span>{label}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-orange-200"
                                        onClick={() => unmuteUserMutation.mutate({ userId: mute.userId, teamId: selectedTeamChat.teamId, channel: selectedTeamChat.channel })}
                                        data-testid={`button-unmute-${mute.userId}`}
                                      >
                                        <Volume2 className="w-3 h-3 text-orange-700" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {teamChatMessages.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No messages in this channel yet.
                              </div>
                            ) : (
                              teamChatMessages.map((msg: any) => {
                                const isMuted = mutedUsers.some((m: any) => m.userId === msg.senderId);
                                return (
                                  <div key={msg.id} className={`rounded-lg p-3 group relative ${msg.isPinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-100'}`}>
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                          {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Unknown'}
                                        </span>
                                        {isMuted && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200">
                                            <VolumeX className="w-2 h-2 mr-0.5" /> Muted
                                          </Badge>
                                        )}
                                        {msg.isPinned && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
                                            <Pin className="w-2 h-2 mr-0.5" /> Pinned
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">
                                          {new Date(msg.createdAt).toLocaleString()}
                                        </span>
                                        {/* Pin/unpin button */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800"
                                          onClick={() => pinMessageMutation.mutate({ messageId: parseInt(msg.id), isPinned: !msg.isPinned })}
                                          disabled={pinMessageMutation.isPending}
                                          title={msg.isPinned ? "Unpin message" : "Pin message"}
                                          data-testid={`button-pin-message-${msg.id}`}
                                        >
                                          {msg.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                        </Button>
                                        {/* Mute/unmute sender button - always available when senderId exists */}
                                        {msg.senderId && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-orange-500 hover:text-orange-700"
                                            onClick={() => isMuted
                                              ? unmuteUserMutation.mutate({ userId: msg.senderId, teamId: selectedTeamChat.teamId, channel: selectedTeamChat.channel })
                                              : muteUserMutation.mutate({ userId: msg.senderId, teamId: selectedTeamChat.teamId, channel: selectedTeamChat.channel })
                                            }
                                            title={isMuted ? "Unmute user" : "Mute user"}
                                            data-testid={`button-mute-${msg.senderId}`}
                                          >
                                            {isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                          </Button>
                                        )}
                                        {/* Delete button */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                                          disabled={deleteMessageMutation.isPending}
                                          data-testid={`button-delete-message-${msg.id}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-sm mt-1">{msg.content}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="flex gap-2 pt-2 border-t">
                            <Input
                              value={teamChatMessage}
                              onChange={(e) => setTeamChatMessage(e.target.value)}
                              placeholder="Send a message as admin..."
                              data-testid="input-team-chat-message"
                            />
                            <Button
                              onClick={() => sendTeamChatMutation.mutate({ teamId: selectedTeamChat.teamId, channel: selectedTeamChat.channel, message: teamChatMessage })}
                              disabled={!teamChatMessage.trim() || sendTeamChatMutation.isPending}
                              data-testid="button-send-team-message"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Select a team channel to view messages</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </CardContent>

      {/* Clear Channel Confirmation Dialog */}
      <AlertDialog open={clearChannelConfirm} onOpenChange={setClearChannelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Messages</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all messages in the {selectedTeamChat?.teamName} {selectedTeamChat?.channel === 'players' ? 'Player' : 'Parent'} channel? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedTeamChat && clearChannelMutation.mutate({ teamId: selectedTeamChat.teamId, channel: selectedTeamChat.channel })}
              data-testid="button-confirm-clear-channel"
            >
              Clear All Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Lead Dialog */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Create a new lead for tracking potential customers</DialogDescription>
          </DialogHeader>
          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(handleCreateLead)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={leadForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lead-first-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={leadForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lead-last-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={leadForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-lead-email" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-lead-phone" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-source">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddLeadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending} data-testid="button-save-lead">
                  {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog with Notes */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-[95vw] w-full">
          <DialogHeader>
            <DialogTitle>{selectedLead?.firstName} {selectedLead?.lastName}</DialogTitle>
            <DialogDescription>Lead details and notes</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Email:</span>
                <p className="font-medium">{selectedLead?.email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <p className="font-medium">{selectedLead?.phone || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Source:</span>
                <p className="font-medium">{selectedLead?.source}</p>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <Badge variant="outline">{selectedLead?.status}</Badge>
              </div>
            </div>

            {/* Evaluation Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" />
                Lead Evaluation
              </h4>
              
              {selectedLead?.evaluation ? (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-green-800">Evaluation Saved</p>
                        <p className="text-green-600 text-xs">
                          {selectedLead.evaluation.programAttended && `Program: ${selectedLead.evaluation.programAttended}`}
                          {selectedLead.evaluation.programRecommended && ` → ${selectedLead.evaluation.programRecommended}`}
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                          By {selectedLead.evaluation.evaluator || 'Coach'} 
                          {selectedLead.evaluation.savedAt && ` on ${new Date(selectedLead.evaluation.savedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingEvaluation(selectedLead)}
                        data-testid="button-view-evaluation"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No evaluation recorded yet</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <StickyNote className="w-4 h-4" />
                Notes
              </h4>
              
              {selectedLead?.notes?.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                  {selectedLead.notes.map((note: any) => (
                    <div key={note.id} className="bg-gray-50 rounded p-2 text-sm">
                      <p>{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">No notes yet</p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  data-testid="input-lead-note"
                />
                <Button
                  onClick={() => addNoteMutation.mutate({ leadId: selectedLead.id, content: newNote })}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                  data-testid="button-add-note"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* View Evaluation Dialog */}
      <Dialog open={!!viewingEvaluation} onOpenChange={() => setViewingEvaluation(null)}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Evaluation - {viewingEvaluation?.firstName} {viewingEvaluation?.lastName}</DialogTitle>
            <DialogDescription>View saved evaluation details</DialogDescription>
          </DialogHeader>
          {viewingEvaluation?.evaluation && (
            <LeadEvaluationForm
              readOnly={true}
              preselectedLeadId={viewingEvaluation.id}
              existingEvaluation={{
                ...viewingEvaluation.evaluation,
                leadId: viewingEvaluation.id
              }}
              onClose={() => setViewingEvaluation(null)}
            />
          )}
        </DialogContent>
      </Dialog>

    </Card>
  );
}
