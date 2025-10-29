import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Users, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Attendance {
  id: number;
  userId: string;
  eventId: number;
  checkedInAt: string;
  type: string;
  latitude?: number;
  longitude?: number;
  qrCodeData: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role?: string;
}

interface AttendanceListProps {
  eventId: string | number;
}

export default function AttendanceList({ eventId }: AttendanceListProps) {
  // Fetch attendance records for the event
  const { data: attendances, isLoading: attendancesLoading } = useQuery<Attendance[]>({
    queryKey: ['/api/attendance/event', eventId],
  });

  // Fetch user details for all attendees
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!attendances && attendances.length > 0,
  });

  const isLoading = attendancesLoading || usersLoading;

  // Get user details for a specific userId
  const getUserDetails = (userId: string): User | undefined => {
    return users?.find(user => user.id === userId);
  };

  // Get initials from user name
  const getInitials = (firstName?: string, lastName?: string): string => {
    if (!firstName && !lastName) return '?';
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  // Calculate distance from coordinates (simple distance display)
  const formatDistance = (latitude?: number, longitude?: number): string | null => {
    if (!latitude || !longitude) return null;
    // For now, just indicate that location was recorded
    // In a real app, you might calculate distance from event location
    return 'Location recorded';
  };

  // Sort attendances by check-in time (most recent first)
  const sortedAttendances = attendances
    ? [...attendances].sort((a, b) => 
        new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
      )
    : [];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="attendance-list-loading">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (!attendances || attendances.length === 0) {
    return (
      <Card data-testid="attendance-list-empty">
        <CardContent className="pt-6">
          <div className="text-center space-y-2 py-8">
            <Users className="h-16 w-16 text-gray-400 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">
              No one has checked in yet
            </h3>
            <p className="text-gray-600 text-sm">
              Attendees will appear here once they check in to this event.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display attendees list
  return (
    <div className="space-y-3" data-testid="attendance-list">
      {sortedAttendances.map((attendance) => {
        const user = getUserDetails(attendance.userId);
        const fullName = user 
          ? `${user.firstName} ${user.lastName}`
          : 'Unknown User';
        const initials = getInitials(user?.firstName, user?.lastName);
        const distanceInfo = formatDistance(attendance.latitude, attendance.longitude);

        return (
          <Card 
            key={attendance.id} 
            className="hover:shadow-md transition-shadow"
            data-testid={`attendance-item-${attendance.id}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <Avatar className="h-12 w-12" data-testid={`avatar-${attendance.id}`}>
                  <AvatarImage 
                    src={user?.profileImageUrl} 
                    alt={fullName}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* User info and details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 
                        className="font-semibold text-gray-900 truncate"
                        data-testid={`name-${attendance.id}`}
                      >
                        {fullName}
                      </h4>
                      
                      {/* Check-in timestamp */}
                      <div 
                        className="flex items-center gap-1 text-sm text-gray-600 mt-1"
                        data-testid={`timestamp-${attendance.id}`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(attendance.checkedInAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>

                      {/* Distance info if available */}
                      {distanceInfo && (
                        <div 
                          className="flex items-center gap-1 text-sm text-gray-500 mt-1"
                          data-testid={`distance-${attendance.id}`}
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{distanceInfo}</span>
                        </div>
                      )}
                    </div>

                    {/* Check-in type badge */}
                    <Badge
                      variant={attendance.type === 'onsite' ? 'default' : 'secondary'}
                      className="shrink-0"
                      data-testid={`type-badge-${attendance.id}`}
                    >
                      {attendance.type === 'onsite' ? 'On-site' : 'Advance'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
