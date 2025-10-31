import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Circle,
  QrCode,
  Users,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow, differenceInMilliseconds, isPast, isFuture } from "date-fns";

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  color?: string;
  rsvpOpenTime?: string;
  rsvpCloseTime?: string;
  checkinOpenTime?: string;
  checkinCloseTime?: string;
}

interface RSVPStatus {
  userId: string;
  eventId: string;
  status: "attending" | "not_attending" | null;
  timestamp: string;
}

interface CheckInStatus {
  userId: string;
  eventId: string;
  checkedIn: boolean;
  timestamp?: string;
}

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onClose: () => void;
  userRSVP?: RSVPStatus | null;
  userCheckIn?: CheckInStatus | null;
}

export default function EventDetailModal({ 
  event, 
  open, 
  onClose,
  userRSVP: initialRSVP,
  userCheckIn: initialCheckIn
}: EventDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userRSVP, setUserRSVP] = useState<RSVPStatus | null>(initialRSVP || null);
  const [userCheckIn, setUserCheckIn] = useState<CheckInStatus | null>(initialCheckIn || null);
  const [countdown, setCountdown] = useState<string>("");

  const userRole = (user as any)?.role || (user as any)?.userType || "parent";
  const isAdminOrCoach = userRole === "admin" || userRole === "coach";

  useEffect(() => {
    setUserRSVP(initialRSVP || null);
  }, [initialRSVP]);

  useEffect(() => {
    setUserCheckIn(initialCheckIn || null);
  }, [initialCheckIn]);

  // Update countdown every second
  useEffect(() => {
    if (!event || !open) return;

    const updateCountdown = () => {
      const now = new Date();
      
      // Check RSVP countdown
      if (event.rsvpCloseTime) {
        const closeTime = new Date(event.rsvpCloseTime);
        if (isFuture(closeTime)) {
          const distance = formatDistanceToNow(closeTime, { addSuffix: false });
          setCountdown(`RSVP closes in ${distance}`);
          return;
        }
      }

      // Check check-in countdown
      if (event.checkinOpenTime) {
        const openTime = new Date(event.checkinOpenTime);
        if (isFuture(openTime)) {
          const distance = formatDistanceToNow(openTime, { addSuffix: false });
          setCountdown(`Check-in opens in ${distance}`);
          return;
        }
      }

      if (event.checkinCloseTime) {
        const closeTime = new Date(event.checkinCloseTime);
        if (isFuture(closeTime)) {
          const distance = formatDistanceToNow(closeTime, { addSuffix: false });
          setCountdown(`Check-in closes in ${distance}`);
          return;
        }
      }

      setCountdown("");
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [event, open]);

  const rsvpMutation = useMutation({
    mutationFn: async (status: "attending" | "not_attending") => {
      return apiRequest(`/api/events/${event?.id}/rsvp`, {
        method: 'POST',
        data: { status },
      });
    },
    onSuccess: (data, status) => {
      setUserRSVP({
        userId: (user as any)?.id,
        eventId: event?.id || "",
        status,
        timestamp: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/events/${event?.id}/checkin`, {
        method: 'POST',
        data: { 
          lat: event?.locationLat,
          lng: event?.locationLng,
        },
      });
    },
    onSuccess: () => {
      setUserCheckIn({
        userId: (user as any)?.id,
        eventId: event?.id || "",
        checkedIn: true,
        timestamp: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  if (!event) return null;

  const now = new Date();
  const eventStart = new Date(event.startTime);
  const eventEnd = event.endTime ? new Date(event.endTime) : null;

  // RSVP window status
  const rsvpOpen = event.rsvpOpenTime ? new Date(event.rsvpOpenTime) : null;
  const rsvpClose = event.rsvpCloseTime ? new Date(event.rsvpCloseTime) : null;
  const isRSVPOpen = rsvpOpen && rsvpClose ? 
    now >= rsvpOpen && now <= rsvpClose : true;
  const rsvpClosed = rsvpClose ? isPast(rsvpClose) : false;

  // Check-in window status
  const checkinOpen = event.checkinOpenTime ? new Date(event.checkinOpenTime) : null;
  const checkinClose = event.checkinCloseTime ? new Date(event.checkinCloseTime) : null;
  const isCheckinOpen = checkinOpen && checkinClose ?
    now >= checkinOpen && now <= checkinClose : false;
  const checkinClosed = checkinClose ? isPast(checkinClose) : false;

  // Google Maps Static API
  const getMapUrl = () => {
    if (!event.locationLat || !event.locationLng) return null;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    return `https://maps.googleapis.com/maps/api/staticmap?center=${event.locationLat},${event.locationLng}&zoom=15&size=600x300&markers=color:red%7C${event.locationLat},${event.locationLng}&key=${apiKey}`;
  };

  const mapUrl = getMapUrl();

  // RSVP Status Indicator
  const getRSVPIndicator = () => {
    if (!userRSVP?.status) {
      return (
        <div className="flex items-center gap-2 text-gray-500" data-testid="rsvp-no-response">
          <Circle className="h-5 w-5 fill-gray-300 text-gray-300" />
          <span>No Response Yet</span>
        </div>
      );
    }
    
    if (userRSVP.status === "attending") {
      return (
        <div className="flex items-center gap-2 text-green-600" data-testid="rsvp-attending">
          <CheckCircle2 className="h-5 w-5 fill-green-100" />
          <span className="font-medium">Attending</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-red-600" data-testid="rsvp-not-attending">
        <XCircle className="h-5 w-5 fill-red-100" />
        <span className="font-medium">Not Attending</span>
      </div>
    );
  };

  // Check-in Status Indicator
  const getCheckinIndicator = () => {
    if (userCheckIn?.checkedIn) {
      return (
        <div className="flex items-center gap-2 text-green-600" data-testid="checkin-checked-in">
          <CheckCircle2 className="h-5 w-5 fill-green-100" />
          <span className="font-medium">You're Checked In!</span>
        </div>
      );
    }

    if (checkinClosed) {
      return (
        <div className="flex items-center gap-2 text-gray-500" data-testid="checkin-closed">
          <XCircle className="h-5 w-5" />
          <span>Check-in closed at {format(checkinClose!, 'p')}</span>
        </div>
      );
    }

    if (!isCheckinOpen && checkinOpen && isFuture(checkinOpen)) {
      const distance = formatDistanceToNow(checkinOpen, { addSuffix: true });
      return (
        <div className="flex items-center gap-2 text-gray-500" data-testid="checkin-opens-soon">
          <Clock className="h-5 w-5" />
          <span>Check-in opens {distance}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-500" data-testid="checkin-not-checked-in">
        <Circle className="h-5 w-5" />
        <span>Not Checked In</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="event-detail-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl" data-testid="event-title">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300" data-testid="event-start-time">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">{format(eventStart, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300" data-testid="event-time">
              <Clock className="h-5 w-5" />
              <span>
                {format(eventStart, 'p')}
                {eventEnd && ` - ${format(eventEnd, 'p')}`}
              </span>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="text-gray-600 dark:text-gray-400" data-testid="event-description">
              {event.description}
            </div>
          )}

          {/* Location with Map */}
          {event.location && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300" data-testid="event-location">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>{event.location}</span>
              </div>
              {mapUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" data-testid="map-preview">
                  <img 
                    src={mapUrl} 
                    alt="Event location map" 
                    className="w-full h-[200px] object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Countdown Timer */}
          {countdown && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950" data-testid="countdown-alert">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                {countdown}
              </AlertDescription>
            </Alert>
          )}

          {/* RSVP Section */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">RSVP Status</h3>
                  {getRSVPIndicator()}
                </div>
              </div>

              {!rsvpClosed && isRSVPOpen && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => rsvpMutation.mutate("attending")}
                    disabled={rsvpMutation.isPending}
                    variant={userRSVP?.status === "attending" ? "default" : "outline"}
                    className="flex-1"
                    data-testid="button-rsvp-attending"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {userRSVP?.status === "attending" ? "Change to" : ""} Attending
                  </Button>
                  <Button
                    onClick={() => rsvpMutation.mutate("not_attending")}
                    disabled={rsvpMutation.isPending}
                    variant={userRSVP?.status === "not_attending" ? "destructive" : "outline"}
                    className="flex-1"
                    data-testid="button-rsvp-not-attending"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {userRSVP?.status === "not_attending" ? "Change to" : ""} Not Attending
                  </Button>
                </div>
              )}

              {rsvpClosed && (
                <Alert variant="destructive" data-testid="rsvp-closed-alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    RSVP is now closed for this event.
                  </AlertDescription>
                </Alert>
              )}

              {!isRSVPOpen && !rsvpClosed && rsvpOpen && isFuture(rsvpOpen) && (
                <Alert data-testid="rsvp-not-open-alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    RSVP opens {formatDistanceToNow(rsvpOpen, { addSuffix: true })}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Check-in Section */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">Check-In Status</h3>
                  {getCheckinIndicator()}
                </div>
              </div>

              {isCheckinOpen && !userCheckIn?.checkedIn && (
                <Button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                  data-testid="button-check-in"
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  Check-In Now
                </Button>
              )}

              {userCheckIn?.checkedIn && userCheckIn.timestamp && (
                <div className="text-sm text-green-600 dark:text-green-400" data-testid="checkin-timestamp">
                  Checked in at {format(new Date(userCheckIn.timestamp), 'p')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin/Coach Override Info */}
          {isAdminOrCoach && (
            <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950" data-testid="admin-info">
              <Users className="h-4 w-4" />
              <AlertDescription className="text-purple-800 dark:text-purple-200">
                As {userRole}, you can view attendance details and manually override check-ins from the admin dashboard.
              </AlertDescription>
            </Alert>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose} data-testid="button-close">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
