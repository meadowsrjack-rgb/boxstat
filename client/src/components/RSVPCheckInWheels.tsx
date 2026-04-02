import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
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
  invitedUsers?: Array<{ id: string; firstName?: string; lastName?: string; role?: string }>;
}

interface CheckInWheelProps {
  data: CheckInData;
  openTime: Date;
  closeTime: Date;
  onCheckInClick?: () => void;
  isUserCheckedIn?: boolean;
  disabled?: boolean;
  invitedUsers?: Array<{ id: string; firstName?: string; lastName?: string; role?: string }>;
  checkedInUserIds?: string[];
}

function DonutChart({ attending, notAttending, noResponse, total }: { attending: number; notAttending: number; noResponse: number; total: number }) {
  const size = 80;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const attendingPct = total > 0 ? attending / total : 0;
  const notAttendingPct = total > 0 ? notAttending / total : 0;
  const noResponsePct = total > 0 ? noResponse / total : (total === 0 ? 1 : 0);

  const attendingDash = attendingPct * circumference;
  const notAttendingDash = notAttendingPct * circumference;
  const noResponseDash = noResponsePct * circumference;

  const attendingOffset = 0;
  const notAttendingOffset = -(attendingDash);
  const noResponseOffset = -(attendingDash + notAttendingDash);

  const responded = attending + notAttending;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        {noResponse > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#6B7280"
            strokeWidth={strokeWidth}
            strokeDasharray={`${noResponseDash} ${circumference - noResponseDash}`}
            strokeDashoffset={noResponseOffset}
            strokeLinecap="butt"
          />
        )}
        {notAttending > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EF4444"
            strokeWidth={strokeWidth}
            strokeDasharray={`${notAttendingDash} ${circumference - notAttendingDash}`}
            strokeDashoffset={notAttendingOffset}
            strokeLinecap="butt"
          />
        )}
        {attending > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22C55E"
            strokeWidth={strokeWidth}
            strokeDasharray={`${attendingDash} ${circumference - attendingDash}`}
            strokeDashoffset={attendingOffset}
            strokeLinecap="butt"
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-white text-lg font-bold leading-none">{responded}</span>
        <span className="text-gray-400 text-[10px] leading-none mt-0.5">of {total}</span>
      </div>
    </div>
  );
}

function CheckInDonutChart({ checkedIn, total }: { checkedIn: number; total: number }) {
  const size = 64;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const checkedInPct = total > 0 ? checkedIn / total : 0;
  const checkedInDash = checkedInPct * circumference;
  const pendingDash = circumference - checkedInDash;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        {checkedIn > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22C55E"
            strokeWidth={strokeWidth}
            strokeDasharray={`${checkedInDash} ${pendingDash}`}
            strokeDashoffset={0}
            strokeLinecap="butt"
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-white text-base font-bold leading-none">{checkedIn}</span>
      </div>
    </div>
  );
}

function getAvatarColor(index: number): string {
  const colors = [
    'bg-purple-600',
    'bg-teal-600',
    'bg-blue-600',
    'bg-orange-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-yellow-600',
    'bg-red-600',
  ];
  return colors[index % colors.length];
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
  invitedUsers = [],
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
    const yearsDiff = (closeTime.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const neverCloses = yearsDiff > 10;
    
    if (status === 'before') {
      return timeUntil(openTime, 'Opens in');
    } else if (status === 'open') {
      return neverCloses ? 'RSVP Open' : timeUntil(closeTime, 'Closes in');
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
    <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }} data-testid="rsvp-wheel-card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">RSVP</p>
      
      <div className="flex items-start gap-4">
        <DonutChart
          attending={data.attending}
          notAttending={data.notAttending}
          noResponse={data.noResponse}
          total={data.total}
        />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-sm" data-testid="rsvp-legend-attending">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs">Attending</span>
            </div>
            <div className="flex items-center gap-2 flex-1 ml-2">
              <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentages.attending}%` }} />
              </div>
              <span className="text-gray-400 text-xs w-7 text-right" data-testid="text-attending-percent">{percentages.attending}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm" data-testid="rsvp-legend-not-attending">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs">Not attending</span>
            </div>
            <div className="flex items-center gap-2 flex-1 ml-2">
              <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${percentages.notAttending}%` }} />
              </div>
              <span className="text-gray-400 text-xs w-7 text-right" data-testid="text-not-attending-percent">{percentages.notAttending}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm" data-testid="rsvp-legend-no-response">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-500 flex-shrink-0" />
              <span className="text-gray-300 text-xs">No response</span>
            </div>
            <div className="flex items-center gap-2 flex-1 ml-2">
              <div className="flex-1 h-1 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full bg-gray-500 rounded-full" style={{ width: `${percentages.noResponse}%` }} />
              </div>
              <span className="text-gray-400 text-xs w-7 text-right" data-testid="text-no-response-percent">{percentages.noResponse}%</span>
            </div>
          </div>
        </div>
      </div>

      {(attendingNames.length > 0 || notAttendingNames.length > 0) && (
        <div className="mt-3 space-y-1.5">
          {attendingNames.length > 0 && (
            <div className="flex items-start gap-2 text-xs" data-testid="attending-names-status">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400">
                <span className="text-green-400 font-medium">Attending: </span>
                {attendingNames.join(', ')}
              </span>
            </div>
          )}
          {notAttendingNames.length > 0 && (
            <div className="flex items-start gap-2 text-xs" data-testid="not-attending-names-status">
              <div className="h-2 w-2 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400">
                <span className="text-red-400 font-medium">Not attending: </span>
                {notAttendingNames.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400" data-testid="text-rsvp-status">
          <Clock className="h-3 w-3" />
          <span>{statusMessage}</span>
        </div>
        <Button
          onClick={() => onRsvpClick?.()}
          disabled={isButtonDisabled}
          size="sm"
          className="text-xs px-3 py-1.5 h-auto bg-gray-700 hover:bg-gray-600 text-white border-0"
          data-testid="button-rsvp-action"
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

export function CheckInWheel({ 
  data, 
  openTime, 
  closeTime, 
  onCheckInClick, 
  isUserCheckedIn = false,
  disabled = false,
  invitedUsers = [],
  checkedInUserIds = [],
}: CheckInWheelProps) {
  const status = getWindowStatus(openTime, closeTime);

  const statusMessage = useMemo(() => {
    const now = new Date();
    const yearsDiff = (closeTime.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000);
    const neverCloses = yearsDiff > 10;
    
    if (isUserCheckedIn) {
      return "Checked in!";
    }
    if (status === 'before') {
      return timeUntil(openTime, 'Check-in opens in');
    } else if (status === 'open') {
      return neverCloses ? 'Check-in is open' : 'Check-in is open';
    } else {
      return 'Check-in closed';
    }
  }, [status, openTime, closeTime, isUserCheckedIn]);

  const buttonText = useMemo(() => {
    if (isUserCheckedIn) return 'Checked In';
    if (status === 'closed') return 'Check-In Closed';
    if (status === 'before') return 'Not Open Yet';
    return 'Check In Now';
  }, [status, isUserCheckedIn]);

  const isButtonDisabled = status !== 'open' || isUserCheckedIn || disabled;
  const dotColor = status === 'before' ? 'bg-yellow-500' : isUserCheckedIn ? 'bg-green-500' : status === 'open' ? 'bg-green-500' : 'bg-gray-500';

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1f2e' }} data-testid="checkin-wheel-card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">CHECK-IN</p>

      <div className="flex items-start gap-4">
        <CheckInDonutChart checkedIn={data.checkedIn} total={data.total} />

        <div className="flex-1">
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Checked in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-gray-500" />
              <span>Pending</span>
            </div>
            <span className="ml-auto text-gray-300 text-xs font-medium" data-testid="text-checkin-count">{data.checkedIn} of {data.total}</span>
          </div>

          {invitedUsers.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {invitedUsers.slice(0, 6).map((user, idx) => {
                const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';
                const isCheckedIn = checkedInUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 ${isCheckedIn ? 'ring-2 ring-green-500' : ''} ${getAvatarColor(idx)}`}
                    title={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                  >
                    {initials}
                  </div>
                );
              })}
              {invitedUsers.length > 6 && (
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                  +{invitedUsers.length - 6}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs" data-testid="checkin-status-message">
          <div className={`h-2 w-2 rounded-full ${dotColor}`} />
          <span className="text-gray-400">{statusMessage}</span>
        </div>
        <Button
          onClick={() => onCheckInClick?.()}
          disabled={isButtonDisabled}
          size="sm"
          className={`text-xs px-3 py-1.5 h-auto border-0 ${
            isUserCheckedIn 
              ? 'bg-green-700 hover:bg-green-600 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          data-testid="button-checkin-action"
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
