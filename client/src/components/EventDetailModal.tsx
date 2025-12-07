import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, Calendar, Clock, 
  CheckCircle2, XCircle, Circle, Navigation,
  MapPinOff, QrCode, Locate, Users, Loader2, Settings, RefreshCw, HelpCircle
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
  
  const isAdminOrCoach = userRole === 'admin' || userRole === 'coach';
  
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
    enabled: open && !!event,
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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'game':
        return 'bg-red-100 text-red-800';
      case 'practice':
        return 'bg-blue-100 text-blue-800';
      case 'tournament':
        return 'bg-purple-100 text-purple-800';
      case 'skills':
        return 'bg-green-100 text-green-800';
      case 'camp':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const qrCodeValue = useMemo(() => {
    if (!event) return '';
    const nonce = `${event.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const exp = Date.now() + 5 * 60 * 1000;
    return JSON.stringify({ event: event.id, nonce, exp });
  }, [event, showQrCode]);

  if (!event) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" data-testid="event-detail-modal">
          <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {event.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getEventTypeColor(event.eventType)} data-testid="badge-event-type">
                    {event.eventType}
                  </Badge>
                  {event.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-tag-${tag}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{formatDateTime(new Date(event.startTime))}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                </span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{event.location}</span>
                </div>
              )}

              {event.description && (
                <p className="text-sm text-gray-600 pt-2 border-t" data-testid="text-description">
                  {event.description}
                </p>
              )}
            </div>

            {event.latitude && event.longitude && (
              <MapPreview
                lat={event.latitude}
                lng={event.longitude}
                locationName={event.location}
                height="h-36"
              />
            )}

            {!isAdminOrCoach && event.latitude != null && event.longitude != null && (
              <Card className={`p-4 ${
                geoError || (!coords && locationRequested && !geoLoading)
                  ? 'bg-amber-50 border-amber-200' 
                  : userDistance === null 
                    ? 'bg-gray-50' 
                    : userDistance <= (event.checkInRadius ?? 200)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
              }`} data-testid="card-location-status">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      geoError || (!coords && locationRequested && !geoLoading)
                        ? 'bg-amber-200' 
                        : userDistance === null 
                          ? 'bg-gray-200' 
                          : userDistance <= (event.checkInRadius ?? 200)
                            ? 'bg-green-200'
                            : 'bg-red-200'
                    }`}>
                      {geoLoading ? (
                        <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
                      ) : geoError || (!coords && locationRequested) ? (
                        <MapPinOff className="h-5 w-5 text-amber-700" />
                      ) : (
                        <Navigation className={`h-5 w-5 ${
                          userDistance === null 
                            ? 'text-gray-600' 
                            : userDistance <= (event.checkInRadius ?? 200)
                              ? 'text-green-700'
                              : 'text-red-700'
                        }`} />
                      )}
                    </div>
                    <div>
                      {geoLoading ? (
                        <div className="text-sm font-medium text-gray-700">Getting your location...</div>
                      ) : geoError ? (
                        <>
                          <div className="text-sm font-medium text-amber-800">Location Permission Required</div>
                          <div className="text-xs text-amber-700">Enable location to check in by GPS</div>
                        </>
                      ) : !coords && locationRequested ? (
                        <>
                          <div className="text-sm font-medium text-amber-800">Location Not Available</div>
                          <div className="text-xs text-amber-700">Use QR code to check in instead</div>
                        </>
                      ) : userDistance !== null ? (
                        <>
                          <div className="text-sm font-medium">{Math.round(userDistance)}m away</div>
                          <div className={`text-xs ${
                            userDistance <= (event.checkInRadius ?? 200) 
                              ? 'text-green-700' 
                              : 'text-red-700'
                          }`}>
                            {userDistance <= (event.checkInRadius ?? 200) 
                              ? 'Within check-in range!' 
                              : `Need to be within ${event.checkInRadius ?? 200}m`}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-600">Tap to enable location</div>
                      )}
                    </div>
                  </div>
                  {(geoError || (!coords && !geoLoading)) && (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRequestLocation}
                        className="text-xs"
                        data-testid="button-enable-location"
                      >
                        <Locate className="h-3 w-3 mr-1" />
                        Enable
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowLocationHelp(true)}
                        className="text-xs px-2"
                        data-testid="button-location-help"
                      >
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4">
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

            {!userCheckIn && !isAdminOrCoach && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowQrScanner(true)}
                data-testid="button-scan-qr"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR Code to Check In
              </Button>
            )}

            {isAdminOrCoach && (
              <Card className="p-4 bg-blue-50 border-blue-200" data-testid="card-coach-qr">
                <div className="text-center">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center justify-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Check-In QR Code
                  </h4>
                  <p className="text-sm text-blue-700 mb-4">
                    Show this QR code to players for them to scan and check in
                  </p>
                  {showQrCode ? (
                    <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
                      <QRCode value={qrCodeValue} size={200} />
                      <p className="text-xs text-gray-500 mt-2">Valid for 5 minutes</p>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setShowQrCode(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-show-qr"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {users.length > 0 && (
              <Card className="p-4" data-testid="card-participant-list">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <Users className="h-4 w-4 text-gray-500" />
                  Invited Players ({users.length})
                </h4>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {users.map((user) => {
                    const userRsvpResponse = rsvps.find(r => r.userId === user.id);
                    const userAttendance = attendances.find(a => a.userId === user.id);
                    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                    
                    return (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                        data-testid={`row-participant-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs bg-gray-200">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {userAttendance ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : userRsvpResponse?.response === 'attending' ? (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Going
                            </Badge>
                          ) : userRsvpResponse?.response === 'not_attending' ? (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Going
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                              <Circle className="h-3 w-3 mr-1" />
                              No Response
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
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
    </>
  );
}
