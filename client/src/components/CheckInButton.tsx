'use client';
import { useState, useMemo, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, QrCode, Check, Clock } from 'lucide-react';
import { useGeo } from '@/hooks/useGeo';
import { distanceMeters, withinWindow } from '@/utils/geo';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

export type UypEvent = {
  id: string | number;
  title: string;
  startTime: string; // ISO
  endTime?: string;  // ISO
  location: string;
  latitude?: number;
  longitude?: number;
  checkInOpensHoursBefore?: number;
  checkInClosesMinutesAfter?: number;
};

type Props = {
  event: UypEvent;
  userId: string;
  radiusMeters?: number; // default 200
  onCheckedIn?: () => void;
  openQr?: () => void; // open QR scanner modal
};

export default function CheckInButton({ 
  event, 
  userId, 
  radiusMeters = 200, 
  onCheckedIn, 
  openQr 
}: Props) {
  const { coords, loading, error, getOnce } = useGeo(true);
  const [distance, setDistance] = useState<number | null>(null);
  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false);
  const { toast } = useToast();

  // Check if event is within time window using event-specific settings
  const checkInOpensMin = (event.checkInOpensHoursBefore ?? 3) * 60;
  const checkInClosesMin = event.checkInClosesMinutesAfter ?? 15;
  const timeOk = withinWindow(event.startTime, undefined, checkInOpensMin, checkInClosesMin);

  // Automatically get location when time window opens
  useEffect(() => {
    if (timeOk && !autoLocationAttempted && !coords && !loading) {
      setAutoLocationAttempted(true);
      getOnce().catch(() => {
        // Silent fail for auto-attempt - user can manually retry
      });
    }
  }, [timeOk, autoLocationAttempted, coords, loading, getOnce]);

  // Calculate distance between user and event location
  const calculatedDistance = useMemo(() => {
    if (!coords || !event.latitude || !event.longitude) return null;
    return distanceMeters(coords, { lat: event.latitude, lng: event.longitude });
  }, [coords, event.latitude, event.longitude]);

  // Update distance state in effect to avoid setState during render
  useEffect(() => {
    if (calculatedDistance !== null) {
      setDistance(calculatedDistance);
      
      // Debug logging
      console.log('Location Debug:', {
        userLat: coords?.lat,
        userLng: coords?.lng, 
        eventLat: event.latitude,
        eventLng: event.longitude,
        distance: calculatedDistance,
        radiusMeters,
        withinRadius: calculatedDistance <= radiusMeters,
        eventTitle: event.title,
        eventLocation: event.location
      });
    }
  }, [calculatedDistance, coords, event.latitude, event.longitude, event.title, event.location, radiusMeters]);

  // Check if user is within radius of event location
  const nearby = useMemo(() => {
    if (!coords || !event.latitude || !event.longitude || calculatedDistance === null) return false;
    return calculatedDistance <= radiusMeters;
  }, [coords, event.latitude, event.longitude, calculatedDistance, radiusMeters]);

  const { mutate: checkIn, isPending, isSuccess } = useMutation({
    mutationFn: async (payload: { 
      eventId: string | number; 
      type: 'onsite';
      lat?: number; 
      lng?: number;
    }) => {
      const res = await fetch(`/api/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...payload,
          userId,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Check-in failed');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all check-in related queries
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      
      // Invalidate attendance for this specific event
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/event', event.id] });
      
      // Invalidate all attendance queries
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      
      onCheckedIn?.();
      toast({ 
        title: 'Checked In', 
        description: 'Your check-in has been recorded successfully!' 
      });
    },
    onError: (e: any) => {
      toast({
        title: 'Check-in Failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCheckDistance = async () => {
    if (!event.latitude || !event.longitude) {
      toast({
        title: 'Location Coordinates Not Set',
        description: 'This event location doesn\'t have GPS coordinates. Please use the QR code scanner to check in.',
      });
      return;
    }
    
    const pos = await getOnce();
    if (!pos) {
      toast({
        title: 'Location Access Needed',
        description: 'Please allow location access to check your distance from the event.',
        variant: 'destructive',
      });
      return;
    }

    // Location was successfully obtained and distance calculated via useMemo
    toast({
      title: 'Location Updated',
      description: distance !== null ? `You are ${Math.round(distance)}m from the event location.` : 'Location check complete.',
    });
  };

  const handleCheckIn = async () => {
    const pos = coords ?? (await getOnce());
    if (!pos) {
      toast({
        title: 'Location Required',
        description: 'Please allow location access to check in.',
        variant: 'destructive',
      });
      return;
    }
    
    checkIn({ 
      eventId: event.id, 
      type: 'onsite',
      lat: pos.lat, 
      lng: pos.lng 
    });
  };

  // Show time window info
  const getTimeWindowInfo = () => {
    const now = new Date();
    const start = new Date(event.startTime);
    const checkInOpensHours = event.checkInOpensHoursBefore ?? 3;
    const checkInClosesMin = event.checkInClosesMinutesAfter ?? 15;
    const checkInStart = new Date(start.getTime() - checkInOpensHours * 60 * 60 * 1000);
    const checkInEnd = new Date(start.getTime() + checkInClosesMin * 60 * 1000);
    
    if (now < checkInStart) {
      const minutesUntil = Math.ceil((checkInStart.getTime() - now.getTime()) / (1000 * 60));
      return `Check-in opens in ${minutesUntil} minutes`;
    }
    if (now > checkInEnd) {
      return 'Check-in window has closed';
    }
    return 'Check-in window is open';
  };

  return (
    <div className="flex flex-col gap-3" data-testid="checkin-button-container">
      {/* Time window status */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4" />
        <span className={timeOk ? 'text-green-600' : 'text-gray-500'}>
          {getTimeWindowInfo()}
        </span>
      </div>

      {/* Location check */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          disabled={!timeOk || loading} 
          onClick={handleCheckDistance}
          data-testid="button-check-location"
        >
          <MapPin className="mr-2 h-4 w-4" /> 
          {loading ? 'Getting Location...' : 'Check Location'}
        </Button>
        
        {typeof distance === 'number' && (
          <Badge 
            variant={nearby ? 'default' : 'secondary'}
            data-testid="badge-distance"
          >
            {Math.round(distance)}m away
          </Badge>
        )}
      </div>

      {/* Check-in buttons */}
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleCheckIn} 
          disabled={!timeOk || !nearby || isPending || isSuccess}
          className={isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
          data-testid="button-checkin"
        >
          {isSuccess ? (
            <><Check className="mr-2 h-4 w-4" /> Checked In</>
          ) : (
            <><MapPin className="mr-2 h-4 w-4" /> Check In</>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={openQr}
          disabled={!timeOk}
          data-testid="button-scan-qr"
        >
          <QrCode className="mr-2 h-4 w-4" /> Scan QR
        </Button>
      </div>

      {/* Status messages */}
      {!timeOk && (
        <p className="text-sm text-muted-foreground" data-testid="text-time-window-info">
          Check-in opens {event.checkInOpensHoursBefore ?? 3} hours before event start and closes {event.checkInClosesMinutesAfter ?? 15} minutes after.
        </p>
      )}
      
      {timeOk && !coords && !loading && (
        <p className="text-sm text-orange-600" data-testid="text-location-needed">
          Location access needed - click "Check Location" to enable check-in.
        </p>
      )}
      
      {timeOk && !event.latitude && !event.longitude && (
        <p className="text-sm text-blue-600" data-testid="text-coordinates-unavailable">
          GPS coordinates not set for this event. Use the QR code scanner to check in.
        </p>
      )}
      
      {timeOk && !nearby && distance !== null && (
        <p className="text-sm text-orange-600" data-testid="text-distance-warning">
          You must be within {radiusMeters}m of the event location to check in. Currently {Math.round(distance)}m away.
        </p>
      )}
      
      {error && (
        <p className="text-sm text-destructive" data-testid="text-location-error">
          {error} - Click "Check Location" to try again.
        </p>
      )}
    </div>
  );
}
