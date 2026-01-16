import CheckInButton, { UypEvent } from '@/components/CheckInButton';
import QrScannerModal from '@/components/QrScannerModal';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, Users, X, Check, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

type EventDetailPanelProps = {
  event: UypEvent | null;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MS = {
  HOUR: 1000 * 60 * 60,
  MINUTE: 1000 * 60,
};

export default function EventDetailPanel({ 
  event, 
  userId, 
  open, 
  onOpenChange 
}: EventDetailPanelProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const { toast } = useToast();

  // Fetch RSVP status
  const { data: rsvps = [] } = useQuery<any[]>({
    queryKey: ['/api/rsvps', userId],
    enabled: open && !!event,
  });

  // Fetch event windows for RSVP and check-in timing
  const { data: eventWindows = [] } = useQuery<any[]>({
    queryKey: ['/api/event-windows/event', event?.id],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/event-windows/event/${event?.id}`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open && !!event?.id,
  });

  // Helper function to calculate offset from event start
  const offsetFromStart = (base: Date, amount: number, unit: string, direction: string) => {
    const multiplier = direction === 'before' ? -1 : 1;
    let ms = amount;
    if (unit === 'minutes') ms *= 60 * 1000;
    else if (unit === 'hours') ms *= 60 * 60 * 1000;
    else if (unit === 'days') ms *= 24 * 60 * 60 * 1000;
    return new Date(base.getTime() + multiplier * ms);
  };

  // Calculate RSVP window times from event-specific settings
  const rsvpTimes = useMemo(() => {
    if (!event) return { open: undefined, close: undefined };
    
    const eventStart = new Date(event.startTime);
    const farFuture = new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
    
    const rsvpOpenWindow = eventWindows.find((w: any) => w.windowType === 'rsvp' && w.openRole === 'open');
    const rsvpCloseWindow = eventWindows.find((w: any) => w.windowType === 'rsvp' && w.openRole === 'close');
    
    return {
      open: rsvpOpenWindow
        ? offsetFromStart(eventStart, rsvpOpenWindow.amount, rsvpOpenWindow.unit, rsvpOpenWindow.direction)
        : new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000), // Default 3 days before
      close: rsvpCloseWindow
        ? offsetFromStart(eventStart, rsvpCloseWindow.amount, rsvpCloseWindow.unit, rsvpCloseWindow.direction)
        : farFuture, // Default: never closes
    };
  }, [event, eventWindows]);

  // Check if we're in RSVP window using event-specific times
  const isRsvpWindow = useMemo(() => {
    if (!rsvpTimes.open || !rsvpTimes.close) return false;
    const now = Date.now();
    return now >= rsvpTimes.open.getTime() && now <= rsvpTimes.close.getTime();
  }, [rsvpTimes]);

  // Calculate check-in window times
  const checkinTimes = useMemo(() => {
    if (!event) return { open: undefined, close: undefined };
    
    const eventStart = new Date(event.startTime);
    const farFuture = new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
    
    const checkinOpenWindow = eventWindows.find((w: any) => w.windowType === 'checkin' && w.openRole === 'open');
    const checkinCloseWindow = eventWindows.find((w: any) => w.windowType === 'checkin' && w.openRole === 'close');
    
    return {
      open: checkinOpenWindow
        ? offsetFromStart(eventStart, checkinOpenWindow.amount, checkinOpenWindow.unit, checkinOpenWindow.direction)
        : new Date(eventStart.getTime() - 3 * 60 * 60 * 1000), // Default 3 hours before
      close: checkinCloseWindow
        ? offsetFromStart(eventStart, checkinCloseWindow.amount, checkinCloseWindow.unit, checkinCloseWindow.direction)
        : farFuture,
    };
  }, [event, eventWindows]);

  const hasRsvp = useMemo(() => {
    if (!event) return false;
    return rsvps.some(r => r.eventId?.toString() === event.id?.toString() && r.userId === userId);
  }, [rsvps, event?.id, userId]);

  // RSVP mutation
  const { mutate: confirmRsvp, isPending: isRsvpPending } = useMutation({
    mutationFn: () => {
      if (!event) throw new Error('No event');
      return apiRequest('/api/rsvps', 'POST', {
        eventId: event.id,
        userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rsvps'] });
      toast({ title: "RSVP Confirmed", description: "Thank you for your RSVP. Be sure to check in on arrival." });
    },
    onError: () => {
      toast({ title: "RSVP Failed", description: "Please try again.", variant: "destructive" });
    },
  });

  // Remove RSVP mutation
  const { mutate: removeRsvp, isPending: isRemovePending } = useMutation({
    mutationFn: () => {
      if (!event) throw new Error('No event');
      const rsvp = rsvps.find(r => r.eventId?.toString() === event.id?.toString() && r.userId === userId);
      if (!rsvp) throw new Error('No RSVP found');
      return apiRequest(`/api/rsvps/${rsvp.id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rsvps'] });
      toast({ title: "RSVP Removed", description: "Your RSVP has been cancelled." });
    },
    onError: () => {
      toast({ title: "Failed to remove RSVP", description: "Please try again.", variant: "destructive" });
    },
  });

  if (!event) return null;

  const handleCheckedIn = () => {
    // Refresh or update UI as needed
    console.log('User checked in successfully');
  };

  const formatEventDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return 'Date TBD';
    }
  };

  const formatEventTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'h:mm a');
    } catch {
      return 'Time TBD';
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" data-testid="event-detail-modal">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <div className="flex items-start">
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold">
                  {event.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    className={getEventTypeColor((event as any).eventType || 'other')}
                    data-testid="badge-event-type"
                  >
                    {(event as any).eventType || 'Event'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Event Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{formatEventDate(event.startTime)}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>
                  {formatEventTime(event.startTime)}
                  {event.endTime && ` - ${formatEventTime(event.endTime)}`}
                </span>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <span>{event.location}</span>
              </div>
              
              {(event as any).description && (
                <div className="text-sm text-gray-600">
                  <p>{(event as any).description}</p>
                </div>
              )}
            </div>
            
            {/* RSVP Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">RSVP</h4>
              {hasRsvp ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg" data-testid="rsvp-confirmed">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">You've RSVP'd for this event</span>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => removeRsvp()}
                    disabled={isRemovePending}
                    data-testid="button-remove-rsvp"
                    className="w-full"
                  >
                    {isRemovePending ? 'Removing...' : 'Cancel RSVP'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isRsvpWindow ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Let us know if you're planning to attend this event.
                      </p>
                      <Button 
                        onClick={() => confirmRsvp()}
                        disabled={isRsvpPending}
                        data-testid="button-confirm-rsvp"
                        className="w-full"
                      >
                        {isRsvpPending ? 'Confirming...' : 'RSVP - I\'m Going'}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500" data-testid="rsvp-window-closed">
                      RSVP is available 3 days to 1 day before the event.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Check-in Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Event Check-in</h4>
              <CheckInButton 
                event={event} 
                userId={userId} 
                onCheckedIn={handleCheckedIn}
                openQr={() => setQrOpen(true)}
                checkinOpenTime={checkinTimes.open}
                checkinCloseTime={checkinTimes.close}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      <QrScannerModal 
        open={qrOpen} 
        onOpenChange={setQrOpen} 
        eventId={event.id} 
        userId={userId} 
        onCheckedIn={handleCheckedIn}
      />
    </>
  );
}
