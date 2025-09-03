'use client';
import { useState, useMemo } from 'react';
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
  const { toast } = useToast();

  // Check if event is within time window (15 min before to 30 min after start)
  const timeOk = withinWindow(event.startTime, event.endTime);

  // Check if user is within radius of event location
  const nearby = useMemo(() => {
    if (!coords || !event.latitude || !event.longitude) return false;
    const d = distanceMeters(coords, { lat: event.latitude, lng: event.longitude });
    setDistance(d);
    return d <= radiusMeters;
  }, [coords, event.latitude, event.longitude, radiusMeters]);

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
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
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
    const pos = await getOnce();
    if (!pos) return;
    
    if (!event.latitude || !event.longitude) {
      toast({
        title: 'Location Not Available',
        description: 'This event does not have location coordinates set.',
        variant: 'destructive',
      });
      return;
    }
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
    const checkInStart = new Date(start.getTime() - 15 * 60 * 1000); // 15 min before
    const checkInEnd = new Date(start.getTime() + 30 * 60 * 1000); // 30 min after
    
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
          Check-in opens 15 minutes before event start and closes 30 minutes after.
        </p>
      )}
      
      {timeOk && !nearby && distance !== null && (
        <p className="text-sm text-orange-600" data-testid="text-distance-warning">
          You must be within {radiusMeters}m of the event location to check in.
        </p>
      )}
      
      {error && (
        <p className="text-sm text-destructive" data-testid="text-location-error">
          {error}
        </p>
      )}
    </div>
  );
}
