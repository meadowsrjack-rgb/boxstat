import CheckInButton, { UypEvent } from '@/components/CheckInButton';
import QrScannerModal from '@/components/QrScannerModal';
import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, Users, X } from 'lucide-react';

type EventDetailPanelProps = {
  event: UypEvent | null;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EventDetailPanel({ 
  event, 
  userId, 
  open, 
  onOpenChange 
}: EventDetailPanelProps) {
  const [qrOpen, setQrOpen] = useState(false);

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
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold pr-8">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-event-detail"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
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
            
            {/* Check-in Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Event Check-in</h4>
              <CheckInButton 
                event={event} 
                userId={userId} 
                onCheckedIn={handleCheckedIn}
                openQr={() => setQrOpen(true)}
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
