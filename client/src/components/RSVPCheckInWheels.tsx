import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, XCircle, Circle, Users } from 'lucide-react';
import { timeUntil, getWindowStatus } from '@/lib/time';

export interface RsvpData {
  attending: number;
  notAttending: number;
  noResponse: number;
  total: number;
}

export interface CheckInData {
  checkedIn: number;
  notCheckedIn: number;
  total: number;
}

interface RSVPWheelProps {
  data: RsvpData;
  openTime: Date;
  closeTime: Date;
  onRsvpClick?: () => void;
  userResponse?: 'attending' | 'not_attending' | 'no_response';
  disabled?: boolean;
  attendingNames?: string[];
  notAttendingNames?: string[];
}

interface CheckInWheelProps {
  data: CheckInData;
  openTime: Date;
  closeTime: Date;
  onCheckInClick?: () => void;
  isUserCheckedIn?: boolean;
  disabled?: boolean;
}

export function RSVPWheel({ 
  data, 
  openTime, 
  closeTime, 
  onRsvpClick, 
  userResponse = 'no_response',
  disabled = false,
  attendingNames = [],
  notAttendingNames = [],
}: RSVPWheelProps) {
  const status = getWindowStatus(openTime, closeTime);
  
  const percentages = useMemo(() => {
    if (data.total === 0) {
      return { attending: 0, notAttending: 0, noResponse: 100 };
    }
    return {
      attending: Math.round((data.attending / data.total) * 100),
      notAttending: Math.round((data.notAttending / data.total) * 100),
      noResponse: Math.round((data.noResponse / data.total) * 100),
    };
  }, [data]);

  const statusMessage = useMemo(() => {
    const now = new Date();
    // Check if close time is far in the future (>10 years) - means no close configured
    const yearsDiff = (closeTime.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const neverCloses = yearsDiff > 10;
    
    if (status === 'before') {
      return timeUntil(openTime, 'Opens in');
    } else if (status === 'open') {
      return neverCloses ? 'RSVP Open (No close time)' : timeUntil(closeTime, 'Closes in');
    } else {
      return 'RSVP Closed';
    }
  }, [status, openTime, closeTime]);

  const buttonText = useMemo(() => {
    if (status === 'closed') return 'RSVP Closed';
    if (status === 'before') return 'RSVP Opens Soon';
    if (userResponse === 'attending') return 'Change My RSVP';
    if (userResponse === 'not_attending') return 'Change My RSVP';
    return 'RSVP Now';
  }, [status, userResponse]);

  const isButtonDisabled = status !== 'open' || disabled;

  return (
    <Card className="p-6" data-testid="rsvp-wheel-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            RSVP Responses
          </h4>
          <span className="text-sm text-muted-foreground" data-testid="text-rsvp-count">
            {data.total - data.noResponse} of {data.total} responded
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Attending</span>
            </div>
            <span className="font-medium" data-testid="text-attending-percent">{percentages.attending}%</span>
          </div>
          <Progress value={percentages.attending} className="h-2 bg-gray-200" data-testid="progress-attending" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>Not Attending</span>
            </div>
            <span className="font-medium" data-testid="text-not-attending-percent">{percentages.notAttending}%</span>
          </div>
          <Progress value={percentages.notAttending} className="h-2 bg-gray-200" data-testid="progress-not-attending" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span>No Response</span>
            </div>
            <span className="font-medium" data-testid="text-no-response-percent">{percentages.noResponse}%</span>
          </div>
          <Progress value={percentages.noResponse} className="h-2 bg-gray-200" data-testid="progress-no-response" />
        </div>

        <div className="pt-2 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid="text-rsvp-status">{statusMessage}</span>
          </div>

          {/* Show attending names */}
          {attendingNames.length > 0 && (
            <div className="p-3 rounded-lg bg-green-50 text-sm" data-testid="attending-names-status">
              <div className="flex items-start gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Attending: </span>
                  <span>{attendingNames.join(', ')}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show not attending names */}
          {notAttendingNames.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 text-sm" data-testid="not-attending-names-status">
              <div className="flex items-start gap-2 text-red-700">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Not Attending: </span>
                  <span>{notAttendingNames.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => onRsvpClick?.()}
            disabled={isButtonDisabled}
            className="w-full"
            data-testid="button-rsvp-action"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function CheckInWheel({ 
  data, 
  openTime, 
  closeTime, 
  onCheckInClick, 
  isUserCheckedIn = false,
  disabled = false 
}: CheckInWheelProps) {
  const status = getWindowStatus(openTime, closeTime);

  const percentages = useMemo(() => {
    if (data.total === 0) {
      return { checkedIn: 0, notCheckedIn: 100 };
    }
    return {
      checkedIn: Math.round((data.checkedIn / data.total) * 100),
      notCheckedIn: Math.round((data.notCheckedIn / data.total) * 100),
    };
  }, [data]);

  const statusMessage = useMemo(() => {
    const now = new Date();
    // Check if close time is far in the future (>10 years) - means no close configured
    const yearsDiff = (closeTime.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const neverCloses = yearsDiff > 10;
    
    if (isUserCheckedIn) {
      return "✅ You're Checked In!";
    }
    if (status === 'before') {
      return `⏱ ${timeUntil(openTime, 'Check-In opens in')}`;
    } else if (status === 'open') {
      return neverCloses ? `✅ Check-In is open (No close time)` : `✅ Check-In is open`;
    } else {
      const closeTimeStr = closeTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `⛔ Check-In closed at ${closeTimeStr}`;
    }
  }, [status, openTime, closeTime, isUserCheckedIn]);

  const buttonText = useMemo(() => {
    if (isUserCheckedIn) return 'Checked In';
    if (status === 'closed') return 'Check-In Closed';
    if (status === 'before') return 'Check-In Not Open';
    return 'Check In Now';
  }, [status, isUserCheckedIn]);

  const isButtonDisabled = status !== 'open' || isUserCheckedIn || disabled;

  return (
    <Card className="p-6" data-testid="checkin-wheel-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Check-In Status
          </h4>
          <span className="text-sm text-muted-foreground" data-testid="text-checkin-count">
            {data.checkedIn} of {data.total} checked in
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Checked In</span>
            </div>
            <span className="font-medium" data-testid="text-checkedin-percent">{percentages.checkedIn}%</span>
          </div>
          <Progress value={percentages.checkedIn} className="h-2 bg-gray-200" data-testid="progress-checkedin" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span>Not Checked In</span>
            </div>
            <span className="font-medium" data-testid="text-not-checkedin-percent">{percentages.notCheckedIn}%</span>
          </div>
          <Progress value={percentages.notCheckedIn} className="h-2 bg-gray-200" data-testid="progress-not-checkedin" />
        </div>

        <div className="pt-2 space-y-3">
          <div className="p-3 rounded-lg bg-gray-50 text-sm" data-testid="checkin-status-message">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{statusMessage}</span>
            </div>
          </div>

          <Button
            onClick={() => onCheckInClick?.()}
            disabled={isButtonDisabled}
            className="w-full"
            variant={isUserCheckedIn ? "outline" : "default"}
            data-testid="button-checkin-action"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </Card>
  );
}
