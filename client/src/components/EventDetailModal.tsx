import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X, MapPin, Calendar, Clock, ExternalLink, 
  CheckCircle2, XCircle, Circle, Shield, Navigation 
} from 'lucide-react';
import { RSVPWheel, CheckInWheel, RsvpData, CheckInData } from '@/components/RSVPCheckInWheels';
import { formatDateTime, offsetFromStart } from '@/lib/time';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Event, User as UserType } from '@shared/schema';
import { MapPreview } from '@/components/MapPreview';
import { useGeo } from '@/hooks/useGeo';
import { distanceMeters } from '@/utils/geo';

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
  const [selectedTab, setSelectedTab] = useState('overview');
  const { getOnce, coords } = useGeo(true);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [userDistance, setUserDistance] = useState<number | null>(null);
  
  // Calculate distance when modal opens or user location changes
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
  
  // Get location when modal opens
  useEffect(() => {
    if (open && event?.latitude != null && event?.longitude != null) {
      getOnce().catch(() => {
        // Silent fail - user can manually trigger location check
      });
    }
  }, [open, event, getOnce]);

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

  const { data: users = [] } = useQuery<UserType[]>({
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
    enabled: open && !!event && (userRole === 'admin' || userRole === 'coach'),
  });

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
      toast({ 
        title: 'RSVP Failed', 
        description: error?.message || 'Failed to update RSVP. Please try again.',
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

  const eventWindows = useMemo(() => {
    if (!windows.length || !event) {
      // No windows configured - use sensible defaults
      // RSVP: Opens 3 days before, never closes (far future date)
      // Check-in: Opens 30 min before, never closes (far future date)
      const farFuture = new Date(new Date(event?.startTime || Date.now()).getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years from event
      return {
        rsvpOpen: new Date(new Date(event?.startTime || Date.now()).getTime() - 3 * 24 * 60 * 60 * 1000),
        rsvpClose: farFuture,
        checkinOpen: new Date(new Date(event?.startTime || Date.now()).getTime() - 30 * 60 * 1000),
        checkinClose: farFuture,
      };
    }

    const eventStart = new Date(event.startTime);
    const rsvpOpenWindow = windows.find(w => w.windowType === 'rsvp' && w.openRole === 'open');
    const rsvpCloseWindow = windows.find(w => w.windowType === 'rsvp' && w.openRole === 'close');
    const checkinOpenWindow = windows.find(w => w.windowType === 'checkin' && w.openRole === 'open');
    const checkinCloseWindow = windows.find(w => w.windowType === 'checkin' && w.openRole === 'close');

    // If close window is not configured, window never closes (far future date)
    const farFuture = new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years from event

    return {
      rsvpOpen: rsvpOpenWindow 
        ? offsetFromStart(eventStart, rsvpOpenWindow.amount, rsvpOpenWindow.unit, rsvpOpenWindow.direction)
        : new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000),
      rsvpClose: rsvpCloseWindow
        ? offsetFromStart(eventStart, rsvpCloseWindow.amount, rsvpCloseWindow.unit, rsvpCloseWindow.direction)
        : farFuture, // Never closes if not configured
      checkinOpen: checkinOpenWindow
        ? offsetFromStart(eventStart, checkinOpenWindow.amount, checkinOpenWindow.unit, checkinOpenWindow.direction)
        : new Date(eventStart.getTime() - 30 * 60 * 1000),
      checkinClose: checkinCloseWindow
        ? offsetFromStart(eventStart, checkinCloseWindow.amount, checkinCloseWindow.unit, checkinCloseWindow.direction)
        : farFuture, // Never closes if not configured
    };
  }, [windows, event]);

  const userRsvp = useMemo(() => {
    return rsvps.find(r => r.userId === String(userId));
  }, [rsvps, userId]);

  const userCheckIn = useMemo(() => {
    return attendances.find(a => a.userId === String(userId));
  }, [attendances, userId]);

  const rsvpData: RsvpData = useMemo(() => {
    const attending = rsvps.filter(r => r.response === 'attending').length;
    const notAttending = rsvps.filter(r => r.response === 'not_attending').length;
    const totalInvited = users.length || 10;
    const noResponse = Math.max(0, totalInvited - attending - notAttending);

    return {
      attending,
      notAttending,
      noResponse,
      total: totalInvited,
    };
  }, [rsvps, users]);

  const checkInData: CheckInData = useMemo(() => {
    const checkedIn = attendances.length;
    const totalInvited = users.length || 10;

    return {
      checkedIn,
      notCheckedIn: Math.max(0, totalInvited - checkedIn),
      total: totalInvited,
    };
  }, [attendances, users]);

  const handleRsvpClick = () => {
    const currentResponse = userRsvp?.response;
    const newResponse = currentResponse === 'attending' ? 'not_attending' : 'attending';
    rsvpMutation.mutate(newResponse);
  };

  const handleCheckInClick = async () => {
    // Admin and coach can bypass location check
    if (userRole === 'admin' || userRole === 'coach') {
      checkInMutation.mutate();
      return;
    }

    // Check if event has GPS coordinates (check for null/undefined, not falsy)
    if (event?.latitude == null || event?.longitude == null) {
      toast({
        title: 'Location Required',
        description: 'This event does not have GPS coordinates set. Please contact an admin or use QR code check-in.',
        variant: 'destructive',
      });
      return;
    }

    // Get user's current location
    setIsCheckingLocation(true);
    try {
      const userLocation = await getOnce();
      
      if (!userLocation) {
        toast({
          title: 'Location Access Denied',
          description: 'Please enable location permissions to check in.',
          variant: 'destructive',
        });
        return;
      }

      // Calculate distance
      const distance = distanceMeters(
        userLocation,
        { lat: event.latitude, lng: event.longitude }
      );

      // Use event's configured radius or default to 200m (use ?? to allow 0)
      const radiusMeters = event.checkInRadius ?? 200;

      // Check if within range
      if (distance > radiusMeters) {
        toast({
          title: 'Too Far Away',
          description: `You must be within ${radiusMeters}m of the event location to check in. You are currently ${Math.round(distance)}m away.`,
          variant: 'destructive',
        });
        return;
      }

      // Location verified, proceed with check-in including location data
      checkInMutation.mutate({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      });
      
    } catch (error) {
      toast({
        title: 'Location Error',
        description: 'Failed to get your location. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const getMapUrl = (location: string, lat?: number, lng?: number) => {
    if (lat && lng) {
      return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
    }
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`;
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'game':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'practice':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'tournament':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'skills':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'camp':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (!event) return null;

  const isAdminOrCoach = userRole === 'admin' || userRole === 'coach';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="event-detail-modal">
        <div className="flex items-start justify-between sticky top-0 bg-white dark:bg-gray-800 pb-4 border-b">
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold">
              {event.title}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getEventTypeColor(event.eventType)} data-testid="badge-event-type">
                {event.eventType}
              </Badge>
              {event.tags?.map((tag) => (
                <Badge key={tag} variant="outline" data-testid={`badge-tag-${tag}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-4" data-testid="card-event-info">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="font-medium">{formatDateTime(new Date(event.startTime))}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-5 w-5 text-gray-500" />
                <span>
                  {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                </span>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  {event.location ? (
                    <div>
                      <span className="block mb-2">{event.location}</span>
                      <a
                        href={getMapUrl(event.location, event.latitude, event.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                        data-testid="link-open-maps"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on OpenStreetMap
                      </a>
                    </div>
                  ) : (
                    <span className="text-gray-400">Location not specified</span>
                  )}
                </div>
              </div>

              {event.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="text-description">
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {event.latitude && event.longitude && (
            <MapPreview
              lat={event.latitude}
              lng={event.longitude}
              locationName={event.location}
              height="h-48"
            />
          )}

          {/* Distance Indicator */}
          {event.latitude != null && event.longitude != null && userRole !== 'admin' && userRole !== 'coach' && (
            <Card 
              className={`p-4 ${
                userDistance === null 
                  ? 'bg-gray-50 dark:bg-gray-900' 
                  : userDistance <= (event.checkInRadius ?? 200)
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              }`}
              data-testid="card-distance-indicator"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    userDistance === null 
                      ? 'bg-gray-200 dark:bg-gray-700' 
                      : userDistance <= (event.checkInRadius ?? 200)
                        ? 'bg-green-200 dark:bg-green-800'
                        : 'bg-red-200 dark:bg-red-800'
                  }`}>
                    <Navigation className={`h-5 w-5 ${
                      userDistance === null 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : userDistance <= (event.checkInRadius ?? 200)
                          ? 'text-green-700 dark:text-green-200'
                          : 'text-red-700 dark:text-red-200'
                    }`} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      {userDistance === null ? 'Getting your location...' : 'Distance from Event'}
                    </div>
                    {userDistance !== null && (
                      <div className={`text-2xl font-bold ${
                        userDistance <= (event.checkInRadius ?? 200)
                          ? 'text-green-700 dark:text-green-200'
                          : 'text-red-700 dark:text-red-200'
                      }`}>
                        {Math.round(userDistance)}m away
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Check-in radius
                  </div>
                  <div className="text-sm font-medium">
                    {event.checkInRadius ?? 200}m
                  </div>
                </div>
              </div>
              {userDistance !== null && userDistance > (event.checkInRadius ?? 200) && (
                <div className="mt-3 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                  <strong>Too far:</strong> You must be within {event.checkInRadius ?? 200}m to check in. 
                  You are currently {Math.round(userDistance - (event.checkInRadius ?? 200))}m outside the check-in radius.
                </div>
              )}
              {userDistance !== null && userDistance <= (event.checkInRadius ?? 200) && (
                <div className="mt-3 text-sm text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                  <strong>In range:</strong> You are within the check-in radius. You can now check in to this event!
                </div>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RSVPWheel
              data={rsvpData}
              openTime={eventWindows.rsvpOpen}
              closeTime={eventWindows.rsvpClose}
              onRsvpClick={handleRsvpClick}
              userResponse={userRsvp?.response || 'no_response'}
              disabled={rsvpMutation.isPending}
            />

            <CheckInWheel
              data={checkInData}
              openTime={eventWindows.checkinOpen}
              closeTime={eventWindows.checkinClose}
              onCheckInClick={handleCheckInClick}
              isUserCheckedIn={!!userCheckIn}
              disabled={checkInMutation.isPending || isCheckingLocation}
            />
          </div>

          {isAdminOrCoach && users.length > 0 && (
            <Card className="p-4" data-testid="card-participant-list">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Participant List (Admin View)
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-center py-2 px-2">RSVP Status</th>
                      <th className="text-center py-2 px-2">Check-In Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 20).map((user) => {
                      const userRsvpResponse = rsvps.find(r => r.userId === user.id);
                      const userAttendance = attendances.find(a => a.userId === user.id);
                      
                      return (
                        <tr key={user.id} className="border-b" data-testid={`row-participant-${user.id}`}>
                          <td className="py-2 px-2">
                            {user.firstName} {user.lastName}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {userRsvpResponse?.response === 'attending' && (
                              <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                            )}
                            {userRsvpResponse?.response === 'not_attending' && (
                              <XCircle className="h-5 w-5 text-red-500 inline" />
                            )}
                            {!userRsvpResponse || userRsvpResponse.response === 'no_response' && (
                              <Circle className="h-5 w-5 text-gray-400 inline" />
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {userAttendance ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 inline" />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
