import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, Check, Building2,
  CheckCircle2, XCircle, Circle, Navigation,
  MapPinOff, QrCode, Locate, Users, Loader2, Settings, RefreshCw, HelpCircle, ClipboardList, ChevronLeft, Target
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RSVPWheel, CheckInWheel, RsvpData, CheckInData } from '@/components/RSVPCheckInWheels';
import { formatDateTime, offsetFromStart } from '@/lib/time';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Event, User as UserType } from '@shared/schema';
import { MapPreview } from '@/components/MapPreview';
import { useGeo } from '@/hooks/useGeo';
import { distanceMeters } from '@/utils/geo';
import QrScannerModal from '@/components/QrScannerModal';
import QRCode from '@/components/ui/qr-code';

interface EventWindow {
  id: number;
  eventId: number;
  windowType: 'rsvp' | 'checkin';
  openRole: 'open' | 'close';
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
  direction: 'before' | 'after';
}

interface RsvpResponse {
  id: number;
  eventId: number;
  userId: string;
  response: 'attending' | 'not_attending' | 'no_response';
  respondedAt?: string;
}

interface Attendance {
  id: number;
  eventId: number;
  userId: string;
  checkedInAt: string;
}

interface EventDetailModalProps {
  event: Event | null;
  userId: string;
  userRole: 'admin' | 'coach' | 'player' | 'parent';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EventDetailModal({
  event,
  userId,
  userRole,
  open,
  onOpenChange,
}: EventDetailModalProps) {
  const { toast } = useToast();
  const { getOnce, coords, error: geoError, loading: geoLoading } = useGeo(true);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  
  // Parent player selection popup state
  const [showPlayerSelect, setShowPlayerSelect] = useState<'rsvp' | 'checkin' | null>(null);
  
  // Coach roster check-in state
  const [selectedRosterPlayers, setSelectedRosterPlayers] = useState<Set<string>>(new Set());
  
  const [, setLocation] = useLocation();
  const isAdminOrCoach = userRole === 'admin' || userRole === 'coach';
  const isParent = userRole === 'parent';
  
  // Detect device/browser type for tailored instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent);
  
  const handleRequestLocation = useCallback(async () => {
    console.log('🔍 Location request initiated');
    setLocationRequested(true);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      toast({
        title: 'Not Supported',
        description: 'Location services are not available in this browser.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      toast({
        title: 'Requesting Location...',
        description: 'Please allow location access when prompted.',
      });
      
      const result = await getOnce();
      if (result) {
        toast({ 
          title: 'Location Enabled', 
          description: 'Your location has been detected for check-in.' 
        });
      } else {
        // Show help dialog when location fails
        setShowLocationHelp(true);
      }
    } catch (e) {
      console.error('Location error:', e);
      setShowLocationHelp(true);
    }
  }, [getOnce, toast]);

  useEffect(() => {
    if (!open || !event || !coords) {
      setUserDistance(null);
      return;
    }
    
    if (event.latitude != null && event.longitude != null) {
      const distance = distanceMeters(
        coords,
        { lat: event.latitude, lng: event.longitude }
      );
      setUserDistance(distance);
    }
  }, [open, event, coords]);
  
  useEffect(() => {
    if (open && event?.latitude != null && event?.longitude != null && !coords && !locationRequested) {
      handleRequestLocation();
    }
  }, [open, event, coords, locationRequested, handleRequestLocation]);

  useEffect(() => {
    if (!open) {
      setLocationRequested(false);
      setShowQrCode(false);
    }
  }, [open]);

  // Fetch teams list to find team info for subtitle (division · season)
  const { data: allTeams = [] } = useQuery<Array<{ id: number; name: string; division?: string; season?: string }>>({
    queryKey: ['/api/teams'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/teams', { headers, credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open && !!event?.teamId,
    staleTime: 5 * 60 * 1000,
  });

  const teamInfo = useMemo(() => {
    if (!event?.teamId || !allTeams.length) return null;
    return allTeams.find(t => t.id === event.teamId) || null;
  }, [allTeams, event?.teamId]);

  const { data: windows = [] } = useQuery<EventWindow[]>({
    queryKey: ['/api/event-windows/event', event?.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/event-windows/event/${event?.id}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch event windows');
      return response.json();
    },
    enabled: open && !!event,
  });

  const { data: rsvps = [] } = useQuery<RsvpResponse[]>({
    queryKey: ['/api/rsvp/event', event?.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/rsvp/event/${event?.id}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch RSVPs');
      return response.json();
    },
    enabled: open && !!event,
  });

  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: ['/api/attendances', event?.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/attendances/${event?.id}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch attendances');
      return response.json();
    },
    enabled: open && !!event,
  });

  // For admins/coaches, response is grouped { players, parents, coaches, admins, all }
  // For players/parents, response is a flat array filtered by role (server uses authenticated role)
  const { data: participantsData } = useQuery<UserType[] | { players: UserType[]; parents: UserType[]; coaches: UserType[]; admins: UserType[]; all: UserType[] }>({
    queryKey: ['/api/events', event?.id, 'participants'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/events/${event?.id}/participants`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch participants');
      return response.json();
    },
    enabled: open && !!event,
  });

  // Extract users based on response format
  const users: UserType[] = useMemo(() => {
    if (!participantsData) return [];
    // If it's a grouped response (for admin/coach)
    if ('all' in participantsData) {
      return participantsData.all;
    }
    // Flat array for player/parent
    return participantsData as UserType[];
  }, [participantsData]);

  // Fetch current user info (for displaying name in RSVP)
  // This is a nice-to-have; if it fails, we'll fall back to "Me"
  const { data: currentUser } = useQuery<UserType | null>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch('/api/auth/user', {
          headers,
          credentials: 'include',
        });
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    enabled: open && isParent,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  
  const currentUserName = useMemo(() => {
    if (!currentUser) return 'Me';
    return `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Me';
  }, [currentUser]);

  // For parents: fetch linked players
  const { data: allLinkedPlayers = [] } = useQuery<UserType[]>({
    queryKey: ['/api/parent/linked-players'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/parent/linked-players', {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch linked players');
      return response.json();
    },
    enabled: open && isParent,
  });
  
  // Fetch all linked profiles (including coach profiles) for the account
  const { data: allLinkedProfiles = [] } = useQuery<Array<{id: string; role: string; firstName: string; lastName: string}>>({
    queryKey: ['/api/users', userId, 'linked-profiles'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/users/${userId}/linked-profiles`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open && !!userId,
  });

  // Filter linked players to only show those invited to this event
  // A player is invited if they appear in the event's participants list (users array)
  const linkedPlayers = useMemo(() => {
    if (!users.length || !allLinkedPlayers.length) return [];
    const invitedPlayerIds = new Set(users.map(u => u.id));
    return allLinkedPlayers.filter(player => invitedPlayerIds.has(player.id));
  }, [users, allLinkedPlayers]);

  // For parents: fetch event team members to determine Score Game button visibility
  type TeamMember = { id: string };
  type TeamMembersDetail = { players: TeamMember[]; coaches: TeamMember[] };
  const { data: eventTeamMembers = { players: [], coaches: [] } } = useQuery<TeamMembersDetail>({
    queryKey: ['/api/teams', event?.teamId, 'members-detail'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/teams/${event?.teamId}/members-detail`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) return { players: [], coaches: [] };
      return response.json();
    },
    enabled: open && isParent && !!event?.teamId && allLinkedPlayers.length > 0,
  });

  // Parent can score if any of their linked players is on the event's team roster
  const parentCanScore = useMemo(() => {
    if (!isParent || !event?.teamId || !allLinkedPlayers.length) return false;
    const teamPlayerIds = new Set<string>(eventTeamMembers.players.map(p => p.id));
    return allLinkedPlayers.some(p => teamPlayerIds.has(p.id));
  }, [isParent, event?.teamId, allLinkedPlayers, eventTeamMembers]);

  // Game session for this event (drives Live Scoring / Review / Final Score UI)
  type GameSessionResp = {
    session: {
      id: number;
      status: 'in_progress' | 'submitted' | 'approved' | string;
      teamScore?: number | null;
      opponentScore?: number | null;
      opponentName?: string | null;
      scoredByUserId?: string | null;
    } | null;
    playerStats?: any[];
    canReview?: boolean;
  } | null;
  const { data: gameSessionData } = useQuery<GameSessionResp>({
    queryKey: ['/api/game-sessions/event', event?.id],
    enabled: open && !!event?.id,
  });
  const gameSession = gameSessionData?.session ?? null;
  const gameStatus: string | null = gameSession?.status ?? null;

  const rsvpMutation = useMutation({
    mutationFn: (response: 'attending' | 'not_attending') => {
      return apiRequest('POST', '/api/rsvp', {
        eventId: typeof event?.id === 'number' ? event.id : parseInt(String(event?.id)),
        userId: String(userId),
        response,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp/event', event?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp'] });
      toast({ title: 'RSVP Updated', description: 'Your response has been recorded.' });
    },
    onError: (error: any) => {
      console.error('RSVP mutation error:', error);
      let errorMessage = 'Failed to update RSVP. Please try again.';
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message.replace(/^\d+:\s*/, ''));
          errorMessage = parsed.error || parsed.message || errorMessage;
        } catch {
          errorMessage = error.message.includes(':') 
            ? error.message.split(':').slice(1).join(':').trim() 
            : error.message;
        }
      }
      toast({ 
        title: 'RSVP Failed', 
        description: errorMessage,
        variant: 'destructive'
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (locationData?: { latitude: number; longitude: number }) => {
      return apiRequest('POST', '/api/attendances', {
        eventId: typeof event?.id === 'number' ? event.id : parseInt(String(event?.id)),
        userId: String(userId),
        type: 'advance',
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendances', event?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: 'Checked In', description: 'You have been checked in successfully!' });
    },
    onError: (error: any) => {
      console.error('Check-in mutation error:', error);
      toast({ 
        title: 'Check-In Failed', 
        description: error?.message || 'Failed to check in. Please try again.',
        variant: 'destructive'
      });
    },
  });

  // Proxy check-in mutation for parents checking in their players
  const proxyCheckInMutation = useMutation({
    mutationFn: (data: { playerId: string; playerName: string; latitude?: number; longitude?: number }) => {
      return apiRequest('POST', '/api/attendances/proxy', {
        eventId: event?.id,
        playerId: data.playerId,
        latitude: data.latitude,
        longitude: data.longitude,
      }).then(response => ({ ...response, playerName: data.playerName }));
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendances', event?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp'] });
      setShowPlayerSelect(null);
      const playerName = response?.playerName || 'Player';
      toast({ 
        title: 'Checked In!', 
        description: `${playerName} is checked in!`
      });
    },
    onError: (error: any) => {
      console.error('Proxy check-in error:', error);
      toast({ 
        title: 'Check-In Failed', 
        description: error?.message || 'Failed to check in player. Please try again.',
        variant: 'destructive'
      });
    },
  });

  // Proxy RSVP mutation for parents RSVPing on behalf of their players
  const proxyRsvpMutation = useMutation({
    mutationFn: (data: { playerId: string; playerName: string; response: string }) => {
      // Extract primitive eventId to avoid circular reference issues from React Query cache
      const eventId = event?.id ? String(event.id) : null;
      return apiRequest('POST', '/api/rsvp/proxy', {
        eventId,
        playerId: data.playerId,
        response: data.response,
      }).then(res => ({ ...res, playerName: data.playerName, response: data.response }));
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp/event', event?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setShowPlayerSelect(null);
      const playerName = response?.playerName || 'Player';
      const isAttending = response?.response === 'attending';
      toast({ 
        title: 'RSVP Updated', 
        description: `${playerName} ${isAttending ? 'is attending' : 'is not attending'}!`
      });
    },
    onError: (error: any) => {
      console.error('Proxy RSVP error:', error);
      toast({ 
        title: 'RSVP Failed', 
        description: error?.message || 'Failed to update RSVP. Please try again.',
        variant: 'destructive'
      });
    },
  });

  // Coach roster query - fetches players for this event
  const { data: rosterData, isLoading: rosterLoading } = useQuery<{
    eventId: number;
    roster: { id: string; firstName: string; lastName: string; profileImageUrl?: string; isCheckedIn: boolean; rsvpResponse: string }[];
    checkedInCount: number;
    totalPlayers: number;
  }>({
    queryKey: ['/api/events', event?.id, 'roster'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/events/${event?.id}/roster`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch roster');
      return response.json();
    },
    enabled: open && !!event && isAdminOrCoach,
  });

  // Coach roster check-in mutation
  const coachCheckInMutation = useMutation({
    mutationFn: (data: { playerIds: string[]; action?: 'checkin' | 'checkout' }) => {
      return apiRequest('POST', '/api/attendances/coach', {
        eventId: event?.id,
        playerIds: data.playerIds,
        action: data.action || 'checkin',
      });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendances', event?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event?.id, 'roster'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setSelectedRosterPlayers(new Set());
      toast({ 
        title: 'Attendance Updated', 
        description: response?.message || 'Attendance has been updated successfully!' 
      });
    },
    onError: (error: any) => {
      console.error('Coach check-in error:', error);
      toast({ 
        title: 'Check-In Failed', 
        description: error?.message || 'Failed to update attendance. Please try again.',
        variant: 'destructive'
      });
    },
  });

  const eventWindows = useMemo(() => {
    if (!windows.length || !event) {
      const farFuture = new Date(new Date(event?.startTime || Date.now()).getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      return {
        rsvpOpen: new Date(new Date(event?.startTime || Date.now()).getTime() - 3 * 24 * 60 * 60 * 1000),
        rsvpClose: farFuture,
        checkinOpen: new Date(new Date(event?.startTime || Date.now()).getTime() - 3 * 60 * 60 * 1000),
        checkinClose: farFuture,
      };
    }

    const eventStart = new Date(event.startTime);
    const rsvpOpenWindow = windows.find(w => w.windowType === 'rsvp' && w.openRole === 'open');
    const rsvpCloseWindow = windows.find(w => w.windowType === 'rsvp' && w.openRole === 'close');
    const checkinOpenWindow = windows.find(w => w.windowType === 'checkin' && w.openRole === 'open');
    const checkinCloseWindow = windows.find(w => w.windowType === 'checkin' && w.openRole === 'close');
    const farFuture = new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);

    return {
      rsvpOpen: rsvpOpenWindow 
        ? offsetFromStart(eventStart, rsvpOpenWindow.amount, rsvpOpenWindow.unit, rsvpOpenWindow.direction)
        : new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000),
      rsvpClose: rsvpCloseWindow
        ? offsetFromStart(eventStart, rsvpCloseWindow.amount, rsvpCloseWindow.unit, rsvpCloseWindow.direction)
        : farFuture,
      checkinOpen: checkinOpenWindow
        ? offsetFromStart(eventStart, checkinOpenWindow.amount, checkinOpenWindow.unit, checkinOpenWindow.direction)
        : new Date(eventStart.getTime() - 30 * 60 * 1000),
      checkinClose: checkinCloseWindow
        ? offsetFromStart(eventStart, checkinCloseWindow.amount, checkinCloseWindow.unit, checkinCloseWindow.direction)
        : farFuture,
    };
  }, [windows, event]);

  const userRsvp = useMemo(() => {
    return rsvps.find(r => r.userId === String(userId));
  }, [rsvps, userId]);

  // Only attendance rows with status='present' (or no status set, for legacy rows) count as a check-in.
  // Rows with status='absent' are coach-marked absences and must not be treated as checked in.
  const presentAttendances = useMemo(() => {
    return attendances.filter(a => (a.status ?? 'present') !== 'absent');
  }, [attendances]);

  const userCheckIn = useMemo(() => {
    return presentAttendances.find(a => a.userId === String(userId));
  }, [presentAttendances, userId]);

  const rsvpData: RsvpData = useMemo(() => {
    // Count over the union of invited users and anyone who has an RSVP on record.
    // This guarantees the responder is always reflected (even if they aren't in
    // the event's invited list) and keeps numerator/denominator on the same set.
    const countedIds = new Set<string>(users.map(u => String(u.id)));
    for (const r of rsvps) {
      countedIds.add(String(r.userId));
    }

    const responseByUser = new Map<string, string>();
    for (const r of rsvps) {
      const uid = String(r.userId);
      if (!countedIds.has(uid)) continue;
      // Only count the latest known response per user (last write wins)
      responseByUser.set(uid, r.response);
    }

    let attending = 0;
    let notAttending = 0;
    for (const resp of responseByUser.values()) {
      if (resp === 'attending') attending++;
      else if (resp === 'not_attending') notAttending++;
    }
    const total = countedIds.size;
    const noResponse = Math.max(0, total - attending - notAttending);

    return {
      attending,
      notAttending,
      noResponse,
      total,
    };
  }, [rsvps, users]);

  const checkInData: CheckInData = useMemo(() => {
    // Count over the union of invited users and anyone who has checked in.
    // This keeps numerator/denominator on the same population and removes the
    // misleading hardcoded fallback of 10 when the invited list is empty.
    const countedIds = new Set<string>(users.map(u => String(u.id)));
    for (const a of presentAttendances) {
      countedIds.add(String(a.userId));
    }

    const checkedInIds = new Set<string>();
    for (const a of presentAttendances) {
      const uid = String(a.userId);
      if (countedIds.has(uid)) checkedInIds.add(uid);
    }

    const total = countedIds.size;
    const checkedIn = checkedInIds.size;

    return {
      checkedIn,
      notCheckedIn: Math.max(0, total - checkedIn),
      total,
    };
  }, [presentAttendances, users]);

  // Sort users by status: checked-in > going > not going > no response
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aAttendance = presentAttendances.find(att => att.userId === a.id);
      const bAttendance = presentAttendances.find(att => att.userId === b.id);
      const aRsvp = rsvps.find(r => r.userId === a.id);
      const bRsvp = rsvps.find(r => r.userId === b.id);
      
      // Priority: 0 = checked-in, 1 = attending, 2 = not attending, 3 = no response
      const getPriority = (hasAttendance: boolean, rsvpResponse?: string) => {
        if (hasAttendance) return 0;
        if (rsvpResponse === 'attending') return 1;
        if (rsvpResponse === 'not_attending') return 2;
        return 3;
      };
      
      const aPriority = getPriority(!!aAttendance, aRsvp?.response);
      const bPriority = getPriority(!!bAttendance, bRsvp?.response);
      
      return aPriority - bPriority;
    });
  }, [users, presentAttendances, rsvps]);

  // Compute RSVP names for display (for parent: show linked players + all linked profiles)
  const rsvpNames = useMemo(() => {
    const attendingNames: string[] = [];
    const notAttendingNames: string[] = [];
    const processedIds = new Set<string>();
    
    if (isParent) {
      // Check parent's own RSVP (main account)
      if (userRsvp?.response === 'attending') {
        attendingNames.push(currentUserName || 'Me');
        processedIds.add(String(userId));
      } else if (userRsvp?.response === 'not_attending') {
        notAttendingNames.push(currentUserName || 'Me');
        processedIds.add(String(userId));
      }
      
      // Check linked profiles (coach, admin profiles, etc.)
      for (const profile of allLinkedProfiles) {
        if (processedIds.has(profile.id)) continue;
        processedIds.add(profile.id);
        
        const profileRsvp = rsvps.find(r => String(r.userId) === profile.id);
        const profileName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.role;
        if (profileRsvp?.response === 'attending') {
          attendingNames.push(profileName);
        } else if (profileRsvp?.response === 'not_attending') {
          notAttendingNames.push(profileName);
        }
      }
      
      // Check linked players
      for (const player of linkedPlayers) {
        if (processedIds.has(String(player.id))) continue;
        processedIds.add(String(player.id));
        
        const playerRsvp = rsvps.find(r => r.userId === player.id);
        const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown';
        if (playerRsvp?.response === 'attending') {
          attendingNames.push(playerName);
        } else if (playerRsvp?.response === 'not_attending') {
          notAttendingNames.push(playerName);
        }
      }
    } else {
      // For non-parent, just show their own status
      if (userRsvp?.response === 'attending') {
        attendingNames.push('Me');
      } else if (userRsvp?.response === 'not_attending') {
        notAttendingNames.push('Me');
      }
    }
    
    return { attendingNames, notAttendingNames };
  }, [isParent, userRsvp, linkedPlayers, rsvps, allLinkedProfiles, currentUserName, userId]);

  // Window status for proxy actions
  const windowStatus = useMemo(() => {
    const now = new Date();
    return {
      rsvpOpen: now >= eventWindows.rsvpOpen && now <= eventWindows.rsvpClose,
      rsvpStatus: now < eventWindows.rsvpOpen 
        ? `Opens ${eventWindows.rsvpOpen.toLocaleDateString()} at ${eventWindows.rsvpOpen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : now > eventWindows.rsvpClose
          ? 'Closed'
          : 'Open',
      checkinOpen: now >= eventWindows.checkinOpen && now <= eventWindows.checkinClose,
      checkinStatus: now < eventWindows.checkinOpen
        ? `Opens ${eventWindows.checkinOpen.toLocaleDateString()} at ${eventWindows.checkinOpen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : now > eventWindows.checkinClose
          ? 'Closed'
          : 'Open',
    };
  }, [eventWindows]);

  // Get RSVP status for each linked player
  const getPlayerRsvp = (playerId: string) => {
    return rsvps.find(r => r.userId === playerId);
  };

  // Get check-in status for each linked player
  const getPlayerCheckIn = (playerId: string) => {
    return presentAttendances.find(a => a.userId === playerId);
  };

  const handleRsvpClick = (response?: 'attending' | 'not_attending') => {
    // Players cannot RSVP if playerRsvpEnabled is false
    if (userRole === 'player' && event?.playerRsvpEnabled === false) {
      toast({
        title: "RSVP Not Available",
        description: "Your account owner, parent, or guardian must RSVP for this event on your behalf.",
        variant: "destructive"
      });
      return;
    }
    
    // For parents, show RSVP popup with inline buttons for each person
    if (isParent) {
      setShowPlayerSelect('rsvp');
      return;
    }
    
    // For other roles, do direct RSVP
    const currentResponse = userRsvp?.response;
    const newResponse = response || (currentResponse === 'attending' ? 'not_attending' : 'attending');
    rsvpMutation.mutate(newResponse);
  };
  
  // State to track individual RSVP progress (map of personId -> pending state)
  const [pendingRsvps, setPendingRsvps] = useState<Record<string, boolean>>({});
  
  // Handle individual RSVP for a specific person
  const handleIndividualRsvp = async (personId: string, response: 'attending' | 'not_attending') => {
    setPendingRsvps(prev => ({ ...prev, [personId]: true }));
    
    try {
      if (personId === userId) {
        // Use regular RSVP endpoint for self
        await apiRequest('POST', '/api/rsvp', {
          eventId: typeof event?.id === 'number' ? event.id : parseInt(String(event?.id)),
          userId: String(userId),
          response,
        });
      } else {
        // Use proxy endpoint for linked players
        await apiRequest('POST', '/api/rsvp/proxy', {
          eventId: event?.id ? String(event.id) : null,
          playerId: personId,
          response,
        });
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp/event', event?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/rsvp'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      toast({ 
        title: 'RSVP Updated', 
        description: `Marked as ${response === 'attending' ? 'attending' : 'not attending'}.`
      });
    } catch (e) {
      console.error(`Failed to RSVP for ${personId}:`, e);
      toast({ title: 'RSVP Failed', description: 'Failed to update RSVP. Please try again.', variant: 'destructive' });
    } finally {
      setPendingRsvps(prev => ({ ...prev, [personId]: false }));
    }
  };

  const handleCheckInClick = async () => {
    // For parents with linked players, show player selection popup
    if (isParent && linkedPlayers.length > 0) {
      setShowPlayerSelect('checkin');
      return;
    }
    
    if (userRole === 'admin' || userRole === 'coach') {
      checkInMutation.mutate(undefined);
      return;
    }

    if (event?.latitude == null || event?.longitude == null) {
      toast({
        title: 'Location Required',
        description: 'This event does not have GPS coordinates set. Please use QR code check-in.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingLocation(true);
    try {
      const userLocation = await getOnce();
      
      if (!userLocation) {
        toast({
          title: 'Location Access Denied',
          description: 'Please enable location permissions to check in, or use QR code check-in.',
          variant: 'destructive',
        });
        return;
      }

      const distance = distanceMeters(
        userLocation,
        { lat: event.latitude, lng: event.longitude }
      );

      const radiusMeters = event.checkInRadius ?? 200;

      if (distance > radiusMeters) {
        toast({
          title: 'Too Far Away',
          description: `You must be within ${radiusMeters}m of the event location. You are ${Math.round(distance)}m away. Try QR code check-in instead.`,
          variant: 'destructive',
        });
        return;
      }

      checkInMutation.mutate({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      });
      
    } catch (error) {
      toast({
        title: 'Location Error',
        description: 'Failed to get your location. Please try QR code check-in.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingLocation(false);
    }
  };

  // Handle proxy check-in for parents checking in their players
  const handleProxyCheckIn = async (playerId: string, playerName: string) => {
    if (!playerId) {
      toast({
        title: 'No Player Selected',
        description: 'Please select a player to check in.',
        variant: 'destructive',
      });
      return;
    }

    // Check if player is already checked in
    const playerAlreadyCheckedIn = presentAttendances.find(a => a.userId === playerId);
    if (playerAlreadyCheckedIn) {
      toast({
        title: 'Already Checked In',
        description: `${playerName} has already been checked in.`,
        variant: 'destructive',
      });
      return;
    }

    // Verify event has location coordinates
    if (event?.latitude == null || event?.longitude == null) {
      toast({
        title: 'Location Required',
        description: 'This event does not have GPS coordinates set. Please use QR code check-in.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingLocation(true);
    try {
      // Get parent's location for the proxy check-in
      const userLocation = await getOnce();
      
      if (!userLocation) {
        toast({
          title: 'Location Access Denied',
          description: 'Please enable location permissions to check in, or use QR code check-in.',
          variant: 'destructive',
        });
        return;
      }

      // Validate distance before allowing check-in
      const distance = distanceMeters(
        userLocation,
        { lat: event.latitude, lng: event.longitude }
      );

      const radiusMeters = event.checkInRadius ?? 200;

      if (distance > radiusMeters) {
        toast({
          title: 'Too Far Away',
          description: `You must be within ${radiusMeters}m of the event location to check in ${playerName}. You are ${Math.round(distance)}m away. Try QR code check-in instead.`,
          variant: 'destructive',
        });
        return;
      }
      
      proxyCheckInMutation.mutate({
        playerId,
        playerName,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      });
    } catch (error) {
      console.error('Proxy check-in location error:', error);
      toast({
        title: 'Location Error',
        description: 'Failed to get your location. Please try QR code check-in.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'game':
        return 'bg-red-900/60 text-red-300 border border-red-700/50';
      case 'practice':
        return 'bg-green-900/60 text-green-300 border border-green-700/50';
      case 'tournament':
        return 'bg-purple-900/60 text-purple-300 border border-purple-700/50';
      case 'skills':
        return 'bg-blue-900/60 text-blue-300 border border-blue-700/50';
      case 'camp':
        return 'bg-orange-900/60 text-orange-300 border border-orange-700/50';
      default:
        return 'bg-gray-800/60 text-gray-300 border border-gray-700/50';
    }
  };

  const getRelativeLabel = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
    return '';
  };

  const getDuration = (startStr: string, endStr?: string | null) => {
    if (!endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, totalMinutes };
  };

  const getAvatarColor = (role?: string | null): string => {
    switch ((role || '').toLowerCase()) {
      case 'player':
        return 'bg-blue-600';
      case 'coach':
        return 'bg-green-600';
      case 'admin':
        return 'bg-red-600';
      case 'parent':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  const qrCodeValue = useMemo(() => {
    if (!event) return '';
    const nonce = `${event.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const exp = Date.now() + 5 * 60 * 1000;
    return JSON.stringify({ event: event.id, nonce, exp });
  }, [event, showQrCode]);

  if (!event) return null;

  const relativeLabel = getRelativeLabel(event.startTime);
  const duration = getDuration(event.startTime, event.endTime);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideClose className="max-w-lg max-h-[90vh] overflow-hidden p-0 flex flex-col border-0 shadow-2xl" style={{ background: '#0f1117' }} data-testid="event-detail-modal">
          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-4" style={{ background: '#0f1117' }}>
            <div className="flex items-center gap-2 mb-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 shrink-0 -ml-1 text-gray-400 hover:text-white hover:bg-white/10"
                onClick={() => onOpenChange(false)}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Badge className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 ${getEventTypeColor(event.eventType)}`} data-testid="badge-event-type">
                {event.eventType}
              </Badge>
              {event.tags?.map((tag) => (
                <Badge key={tag} className="text-xs bg-gray-800 text-gray-300 border border-gray-700" data-testid={`badge-tag-${tag}`}>
                  {tag}
                </Badge>
              ))}
            </div>
            <DialogTitle className="text-2xl font-bold text-white leading-tight">
              {event.title}
            </DialogTitle>
            {(() => {
              const parts: string[] = [];
              if (teamInfo?.division) parts.push(teamInfo.division);
              if (teamInfo?.season) parts.push(teamInfo.season);
              const subtitle = parts.join(' · ');
              return subtitle ? (
                <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
              ) : event.description ? (
                <p className="text-sm text-gray-400 mt-1" data-testid="text-description">{event.description}</p>
              ) : null;
            })()}
          </div>

          <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-4" style={{ background: '#0f1117' }}>
            {/* Date / Time / Duration row */}
            <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden" style={{ background: '#1a1f2e' }}>
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">DATE</p>
                <p className="text-white font-bold text-sm leading-tight">
                  {new Date(event.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                {relativeLabel && <p className="text-gray-400 text-xs mt-0.5">{relativeLabel}</p>}
              </div>
              <div className="px-4 py-3 border-l border-r border-gray-700/50">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">TIME</p>
                <p className="text-white font-bold text-sm leading-tight">
                  {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
                {event.endTime && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    {new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} end
                  </p>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">DURATION</p>
                {duration ? (
                  <>
                    <p className="text-white font-bold text-sm leading-tight">
                      {duration.hours > 0 && `${duration.hours}h `}{duration.minutes > 0 && `${duration.minutes}m`}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{duration.totalMinutes} min</p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">—</p>
                )}
              </div>
            </div>

            {/* Location / Venue Card */}
            {event.location && (() => {
              // Split location into venue name (first part) + full address (rest)
              const commaParts = event.location.split(',');
              const venueName = commaParts[0]?.trim() || event.location;
              const address = commaParts.length > 1 ? commaParts.slice(1).join(',').trim() : null;
              const mapsUrl = event.latitude && event.longitude
                ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(event.location)}`;
              return (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity" style={{ background: '#1a1f2e' }}>
                    <div className="h-9 w-9 rounded-lg bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm leading-tight">{venueName}</p>
                      {event.courtName && <p className="text-blue-300 text-xs mt-0.5 leading-snug">{event.courtName}</p>}
                      {address && <p className="text-gray-400 text-xs mt-0.5 leading-snug">{address}</p>}
                    </div>
                    <Navigation className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  </div>
                </a>
              );
            })()}

            {/* RSVP Section */}
            {userRole === 'player' && event?.playerRsvpEnabled === false ? (
              <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }}>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-300 text-sm">RSVP managed by parent/guardian</h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Your account owner, parent, or guardian must RSVP for this event on your behalf.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <RSVPWheel
                data={rsvpData}
                openTime={eventWindows.rsvpOpen}
                closeTime={eventWindows.rsvpClose}
                onRsvpClick={handleRsvpClick}
                userResponse={userRsvp?.response || 'no_response'}
                disabled={rsvpMutation.isPending}
                attendingNames={rsvpNames.attendingNames}
                notAttendingNames={rsvpNames.notAttendingNames}
                invitedUsers={users}
              />
            )}

            {/* Check-In Section (GPS distance banner is rendered inside the
                card just below the "Check-in opens at..." status row) */}
            <CheckInWheel
              data={checkInData}
              openTime={eventWindows.checkinOpen}
              closeTime={eventWindows.checkinClose}
              onCheckInClick={handleCheckInClick}
              isUserCheckedIn={!!userCheckIn}
              disabled={checkInMutation.isPending || isCheckingLocation}
              invitedUsers={users}
              checkedInUserIds={presentAttendances.map(a => a.userId)}
              showQrButton={!userCheckIn && !isAdminOrCoach && userRole === 'player'}
              onQrClick={() => setShowQrScanner(true)}
              locationBanner={
                !isAdminOrCoach && event.latitude != null && event.longitude != null ? (
                  <div
                    className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(161,110,0,0.25)', borderLeft: '3px solid #ca8a04' }}
                    data-testid="card-location-status"
                  >
                    <MapPin className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {geoLoading ? (
                        <p className="text-yellow-200 text-xs">Getting your location...</p>
                      ) : geoError ? (
                        <>
                          <p className="text-yellow-200 text-xs font-medium">GPS required to check in at this location</p>
                          <p className="text-yellow-400/70 text-[11px]">Location permission needed</p>
                        </>
                      ) : userDistance !== null ? (
                        <p className="text-yellow-200 text-xs">
                          {userDistance <= (event.checkInRadius ?? 200)
                            ? `Within range — ${Math.round(userDistance)}m away`
                            : `${Math.round(userDistance)}m away — need to be within ${event.checkInRadius ?? 200}m`}
                        </p>
                      ) : (
                        <p className="text-yellow-200 text-xs font-medium">GPS required to check in at this location</p>
                      )}
                    </div>
                    {(geoError || (!coords && !geoLoading)) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-yellow-600 hover:bg-yellow-500 text-white border-0"
                          onClick={handleRequestLocation}
                          data-testid="button-enable-location"
                        >
                          Enable
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowLocationHelp(true)}
                          className="h-7 w-7 p-0 text-yellow-400 hover:text-yellow-200 hover:bg-yellow-900/30"
                          data-testid="button-location-help"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null
              }
            />

            {/* Coach Roster Check-In Section */}
            {isAdminOrCoach && rosterData && rosterData.roster.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }} data-testid="card-coach-roster">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-gray-400" />
                    Roster Check-In
                  </h4>
                  <span className="text-gray-400 text-xs">{rosterData.checkedInCount}/{rosterData.totalPlayers} present</span>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-0 text-xs"
                    disabled={coachCheckInMutation.isPending}
                    onClick={() => {
                      const uncheckedPlayers = rosterData.roster.filter(p => !p.isCheckedIn).map(p => p.id);
                      if (uncheckedPlayers.length > 0) {
                        coachCheckInMutation.mutate({ playerIds: uncheckedPlayers });
                      }
                    }}
                    data-testid="button-mark-all-present"
                  >
                    {coachCheckInMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    Mark All Present
                  </Button>
                  {selectedRosterPlayers.size > 0 && (
                    <Button
                      size="sm"
                      className="bg-green-700 hover:bg-green-600 text-white border-0 text-xs"
                      disabled={coachCheckInMutation.isPending}
                      onClick={() => {
                        coachCheckInMutation.mutate({ playerIds: Array.from(selectedRosterPlayers) });
                      }}
                      data-testid="button-checkin-selected"
                    >
                      Check In ({selectedRosterPlayers.size})
                    </Button>
                  )}
                </div>
                
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {rosterData.roster.map((player, idx) => {
                    const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown';
                    const initials = `${player.firstName?.[0] || ''}${player.lastName?.[0] || ''}`.toUpperCase();
                    return (
                      <div 
                        key={player.id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          player.isCheckedIn ? 'bg-green-900/20' : 'bg-gray-800/50'
                        }`}
                        data-testid={`roster-player-${player.id}`}
                      >
                        {!player.isCheckedIn && (
                          <Checkbox
                            checked={selectedRosterPlayers.has(player.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedRosterPlayers);
                              if (checked) {
                                newSet.add(player.id);
                              } else {
                                newSet.delete(player.id);
                              }
                              setSelectedRosterPlayers(newSet);
                            }}
                            className="border-gray-600"
                            data-testid={`checkbox-player-${player.id}`}
                          />
                        )}
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 ${getAvatarColor('player')}`}>
                          {initials || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{playerName}</p>
                          <p className="text-xs text-gray-500">
                            {player.rsvpResponse === 'attending' ? 'RSVP: Yes' : 
                             player.rsvpResponse === 'not_attending' ? 'RSVP: No' : 'No RSVP'}
                          </p>
                        </div>
                        {player.isCheckedIn ? (
                          <Badge className="bg-green-700 text-white text-xs border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Present
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-900/30"
                            disabled={coachCheckInMutation.isPending}
                            onClick={() => coachCheckInMutation.mutate({ playerIds: [player.id] })}
                            data-testid={`button-checkin-${player.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Scoring / Review / Final Score (visible to all viewers) */}
            {gameStatus === 'approved' ? (
              <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }} data-testid="card-final-score">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <span className="text-white text-sm font-semibold">Final Score</span>
                </div>
                {(() => {
                  const ts = gameSession?.teamScore ?? 0;
                  const os = gameSession?.opponentScore ?? 0;
                  const opp = gameSession?.opponentName || 'OPP';
                  const result = ts > os ? 'W' : ts < os ? 'L' : 'T';
                  const resultColor = ts > os ? 'text-green-400' : ts < os ? 'text-red-400' : 'text-gray-400';
                  return (
                    <div className="flex items-center justify-between">
                      <div className="text-white">
                        <span className="font-bold text-lg">{ts}</span>
                        <span className="text-gray-400 mx-2">–</span>
                        <span className="font-bold text-lg">{os}</span>
                        <span className="text-gray-400 ml-2 text-sm">vs {opp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-extrabold ${resultColor}`}>{result}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                          onClick={() => {
                            onOpenChange(false);
                            setLocation(`/game-scoring?eventId=${event.id}`);
                          }}
                          data-testid="button-view-final-stats"
                        >
                          View Stats
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : gameStatus === 'submitted' && isAdminOrCoach && gameSessionData?.canReview ? (
              <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#1a1f2e' }} data-testid="card-review-stats">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-yellow-400" />
                  <div>
                    <div className="text-white text-sm font-semibold">Review submitted stats</div>
                    <div className="text-gray-400 text-xs">Approve or reject the game stats.</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-500 text-white"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation(`/game-scoring?eventId=${event.id}&review=1`);
                  }}
                  data-testid="button-review-stats"
                >
                  Review
                </Button>
              </div>
            ) : (
              <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: '#1a1f2e' }} data-testid="card-live-scoring">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <span className="text-white text-sm font-semibold">Live Scoring</span>
                </div>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation(`/game-scoring?eventId=${event.id}`);
                  }}
                  data-testid="button-score-game"
                >
                  Score Game
                </Button>
              </div>
            )}

            {isAdminOrCoach && (
              <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }} data-testid="card-coach-qr">
                <div className="text-center">
                  <h4 className="font-semibold text-white mb-1 flex items-center justify-center gap-2 text-sm">
                    <QrCode className="h-4 w-4 text-gray-400" />
                    Check-In QR Code
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Show to players to scan and check in
                  </p>
                  {showQrCode ? (
                    <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                      <QRCode value={qrCodeValue} size={200} />
                      <p className="text-xs text-gray-500 mt-2">Valid for 5 minutes</p>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setShowQrCode(true)}
                      className="bg-gray-700 hover:bg-gray-600 text-white border-0 text-sm"
                      data-testid="button-show-qr"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                  )}
                </div>
              </div>
            )}

            {users.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }} data-testid="card-participant-list">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  INVITED ({users.length})
                </h4>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sortedUsers.map((user, idx) => {
                    const userRsvpResponse = rsvps.find(r => r.userId === user.id);
                    const userAttendance = attendances.find(a => a.userId === user.id);
                    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                    
                    return (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between py-2"
                        data-testid={`row-participant-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${getAvatarColor(user.role)}`}>
                            {initials || '?'}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {userAttendance && userAttendance.status !== 'absent' ? (
                            <Badge className="bg-green-800 text-green-200 text-xs border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : userAttendance && userAttendance.status === 'absent' ? (
                            <Badge className="bg-red-900/60 text-red-300 text-xs border border-red-700/50">
                              Absent
                            </Badge>
                          ) : userRsvpResponse?.response === 'attending' ? (
                            <Badge className="bg-blue-900/60 text-blue-300 text-xs border border-blue-700/50">
                              Going
                            </Badge>
                          ) : userRsvpResponse?.response === 'not_attending' ? (
                            <Badge className="bg-red-900/60 text-red-300 text-xs border border-red-700/50">
                              Not Going
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-700/60 text-gray-400 text-xs border border-gray-600/50">
                              No response
                            </Badge>
                          )}
                          {isAdminOrCoach && user.role === 'player' && (() => {
                            const attendanceState: 'none' | 'present' | 'absent' = !userAttendance
                              ? 'none'
                              : (userAttendance.status === 'absent' ? 'absent' : 'present');
                            const nextAction: 'checkin' | 'absent' = attendanceState === 'present' ? 'absent' : 'checkin';
                            const dotClass =
                              attendanceState === 'present'
                                ? 'bg-green-500 border-green-400 hover:bg-green-400'
                                : attendanceState === 'absent'
                                  ? 'bg-red-500 border-red-400 hover:bg-red-400'
                                  : 'bg-gray-600 border-gray-500 hover:bg-gray-500';
                            const title =
                              attendanceState === 'present'
                                ? 'Mark absent'
                                : attendanceState === 'absent'
                                  ? 'Mark present'
                                  : 'Mark present';
                            return (
                              <button
                                type="button"
                                aria-label={title}
                                title={title}
                                disabled={coachCheckInMutation.isPending}
                                onClick={() => coachCheckInMutation.mutate({ playerIds: [user.id], action: nextAction })}
                                className={`h-4 w-4 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${dotClass}`}
                                data-testid={`button-attendance-toggle-${user.id}`}
                                data-state={attendanceState}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <QrScannerModal
        open={showQrScanner}
        onOpenChange={setShowQrScanner}
        eventId={event?.id || ''}
        userId={userId}
        onCheckedIn={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/attendances', event?.id] });
          setShowQrScanner(false);
        }}
      />

      {/* Location Permission Help Dialog */}
      <Dialog open={showLocationHelp} onOpenChange={setShowLocationHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPinOff className="h-5 w-5 text-amber-500" />
              Enable Location Access
            </DialogTitle>
            <DialogDescription>
              Location permission is needed to check in at this event. Follow these steps to enable it:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {isIOS ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  On iPhone/iPad:
                </h4>
                <ol className="text-sm text-gray-600 space-y-2 ml-6 list-decimal">
                  <li>Open <strong>Settings</strong> on your device</li>
                  <li>Scroll down and tap <strong>Privacy & Security</strong></li>
                  <li>Tap <strong>Location Services</strong></li>
                  <li>Make sure Location Services is <strong>ON</strong></li>
                  <li>Scroll down and find your browser (Safari/Chrome)</li>
                  <li>Tap it and select <strong>"While Using the App"</strong></li>
                  <li>Return to this app and tap <strong>Try Again</strong></li>
                </ol>
              </div>
            ) : isAndroid ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  On Android:
                </h4>
                <ol className="text-sm text-gray-600 space-y-2 ml-6 list-decimal">
                  <li>Tap the <strong>lock icon</strong> in the address bar</li>
                  <li>Tap <strong>Permissions</strong> or <strong>Site settings</strong></li>
                  <li>Find <strong>Location</strong> and set to <strong>Allow</strong></li>
                  <li>Or go to <strong>Settings → Apps → Chrome → Permissions → Location</strong></li>
                  <li>Return here and tap <strong>Try Again</strong></li>
                </ol>
              </div>
            ) : isSafari ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  In Safari:
                </h4>
                <ol className="text-sm text-gray-600 space-y-2 ml-6 list-decimal">
                  <li>Click <strong>Safari</strong> in the menu bar</li>
                  <li>Select <strong>Settings for This Website</strong></li>
                  <li>Find <strong>Location</strong> and select <strong>Allow</strong></li>
                  <li>Or click the <strong>Aa</strong> icon in the address bar</li>
                  <li>Tap <strong>Website Settings</strong> → <strong>Location</strong> → <strong>Allow</strong></li>
                </ol>
              </div>
            ) : isChrome ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  In Chrome:
                </h4>
                <ol className="text-sm text-gray-600 space-y-2 ml-6 list-decimal">
                  <li>Click the <strong>lock/info icon</strong> in the address bar (left of URL)</li>
                  <li>Click <strong>Site settings</strong></li>
                  <li>Find <strong>Location</strong> and change to <strong>Allow</strong></li>
                  <li>Close settings and <strong>refresh the page</strong></li>
                  <li>Return here and tap <strong>Try Again</strong></li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  In Your Browser:
                </h4>
                <ol className="text-sm text-gray-600 space-y-2 ml-6 list-decimal">
                  <li>Click the <strong>lock or info icon</strong> in the address bar</li>
                  <li>Look for <strong>Site settings</strong> or <strong>Permissions</strong></li>
                  <li>Find <strong>Location</strong> and set to <strong>Allow</strong></li>
                  <li>Refresh the page and try again</li>
                </ol>
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Alternative:</strong> You can also check in by scanning the QR code shown by your coach!
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowLocationHelp(false)}
            >
              Use QR Instead
            </Button>
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowLocationHelp(false);
                setLocationRequested(false);
                setTimeout(() => handleRequestLocation(), 500);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Parent RSVP Popup - Inline buttons for each person */}
      <AlertDialog open={showPlayerSelect === 'rsvp'} onOpenChange={(open) => !open && setShowPlayerSelect(null)}>
        <AlertDialogContent data-testid="dialog-player-select" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>RSVP for Event</AlertDialogTitle>
            <AlertDialogDescription>
              Choose attending or not attending for each person.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Window Status Warning */}
          {!windowStatus.rsvpOpen && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800">
                RSVP window {windowStatus.rsvpStatus}
              </p>
            </div>
          )}
          
          <div className="space-y-3 py-4 max-h-80 overflow-y-auto">
            {/* Parent self-RSVP option - only show if parent is invited to the event */}
            {users.some(u => u.id === userId) && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200" data-testid="rsvp-row-self">
                <Avatar className="h-10 w-10 bg-blue-100 flex-shrink-0">
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {(currentUser?.firstName?.[0] || '') + (currentUser?.lastName?.[0] || 'M')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{currentUserName}</p>
                  <p className="text-xs text-gray-500">
                    {userRsvp?.response === 'attending' 
                      ? 'Attending' 
                      : userRsvp?.response === 'not_attending'
                        ? 'Not attending'
                        : 'No response'}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={userRsvp?.response === 'not_attending' ? 'default' : 'outline'}
                    className={`h-8 px-2 ${userRsvp?.response === 'not_attending' ? 'bg-red-600 hover:bg-red-700' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
                    disabled={pendingRsvps[userId] || !windowStatus.rsvpOpen}
                    onClick={() => handleIndividualRsvp(userId, 'not_attending')}
                    data-testid="rsvp-self-not-attending"
                  >
                    {pendingRsvps[userId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant={userRsvp?.response === 'attending' ? 'default' : 'outline'}
                    className={`h-8 px-2 ${userRsvp?.response === 'attending' ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                    disabled={pendingRsvps[userId] || !windowStatus.rsvpOpen}
                    onClick={() => handleIndividualRsvp(userId, 'attending')}
                    data-testid="rsvp-self-attending"
                  >
                    {pendingRsvps[userId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Linked players */}
            {linkedPlayers.map(player => {
              const playerRsvp = getPlayerRsvp(player.id);
              const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown';
              const isPending = pendingRsvps[player.id];
              
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200"
                  data-testid={`rsvp-row-${player.id}`}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={player.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {(player.firstName?.[0] || '') + (player.lastName?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{playerName}</p>
                    <p className="text-xs text-gray-500">
                      {playerRsvp?.response === 'attending' 
                        ? 'Attending' 
                        : playerRsvp?.response === 'not_attending'
                          ? 'Not attending'
                          : 'No response'}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={playerRsvp?.response === 'not_attending' ? 'default' : 'outline'}
                      className={`h-8 px-2 ${playerRsvp?.response === 'not_attending' ? 'bg-red-600 hover:bg-red-700' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
                      disabled={isPending || !windowStatus.rsvpOpen}
                      onClick={() => handleIndividualRsvp(player.id, 'not_attending')}
                      data-testid={`rsvp-${player.id}-not-attending`}
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant={playerRsvp?.response === 'attending' ? 'default' : 'outline'}
                      className={`h-8 px-2 ${playerRsvp?.response === 'attending' ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                      disabled={isPending || !windowStatus.rsvpOpen}
                      onClick={() => handleIndividualRsvp(player.id, 'attending')}
                      data-testid={`rsvp-${player.id}-attending`}
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowPlayerSelect(null)}
              data-testid="button-close-rsvp"
            >
              Done
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Parent Player Selection Popup - Check-in (single select) */}
      <AlertDialog open={showPlayerSelect === 'checkin'} onOpenChange={(open) => !open && setShowPlayerSelect(null)}>
        <AlertDialogContent data-testid="dialog-checkin-select">
          <AlertDialogHeader>
            <AlertDialogTitle>Check In Player</AlertDialogTitle>
            <AlertDialogDescription>
              Select which player you are checking in:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {!windowStatus.checkinOpen && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-amber-800">
                Check-in window {windowStatus.checkinStatus}
              </p>
            </div>
          )}
          
          <div className="space-y-2 py-4 max-h-64 overflow-y-auto">
            {linkedPlayers.map(player => {
              const playerCheckIn = getPlayerCheckIn(player.id);
              const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown';
              const isAlreadyCheckedIn = !!playerCheckIn;
              const isDisabled = isAlreadyCheckedIn || !windowStatus.checkinOpen;
              
              return (
                <Button
                  key={player.id}
                  variant="outline"
                  className={`w-full justify-start gap-3 h-auto py-3 ${isDisabled ? 'opacity-50' : ''}`}
                  disabled={isDisabled || proxyCheckInMutation.isPending}
                  onClick={() => handleProxyCheckIn(player.id, playerName)}
                  data-testid={`checkin-player-${player.id}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {(player.firstName?.[0] || '') + (player.lastName?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{playerName}</p>
                    <p className="text-xs text-gray-500">
                      {isAlreadyCheckedIn ? 'Already checked in' : 'Tap to check in'}
                    </p>
                  </div>
                  {proxyCheckInMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              );
            })}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-checkin-select">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
