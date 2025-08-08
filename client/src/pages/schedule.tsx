import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { format, isToday, isTomorrow, isThisWeek, isSameDay, parseISO } from "date-fns";

// Helper function to convert Google Calendar events to our format
function formatGoogleEvent(event: any) {
  const startDate = event.startDate ? parseISO(event.startDate) : new Date();
  const endDate = event.endDate ? parseISO(event.endDate) : new Date();
  
  return {
    id: event.id,
    title: event.title || 'Untitled Event',
    date: startDate,
    startTime: format(startDate, 'h:mm a'),
    endTime: format(endDate, 'h:mm a'),
    location: event.location || 'Location TBD',
    eventType: event.eventType || 'practice',
    checkedIn: false, // This would come from check-in data
    description: event.description || '',
    googleEventId: event.googleEventId
  };
}

export default function Schedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);

  // Check for demo mode
  const isDemoMode = sessionStorage.getItem('isDemoMode') === 'true';
  const demoProfile = isDemoMode ? JSON.parse(sessionStorage.getItem('demoProfile') || '{}') : null;
  
  // Use demo profile if in demo mode, otherwise use authenticated user
  const currentUser = isDemoMode ? demoProfile : user;

  // Fetch events from Google Calendar API
  const { data: eventsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/events'],
    enabled: true, // Always fetch events, regardless of auth state
  });

  const events = eventsData && Array.isArray(eventsData) ? eventsData.map(formatGoogleEvent) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "practice":
        return "bg-blue-100 text-blue-800";
      case "game":
        return "bg-green-100 text-green-800";
      case "tournament":
        return "bg-purple-100 text-purple-800";
      case "camp":
        return "bg-orange-100 text-orange-800";
      case "skills":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    
    const dayEvents = events.filter(event => 
      isSameDay(event.date, date)
    );
    
    console.log('Day clicked:', date, 'Events found:', dayEvents.length, dayEvents);
    
    setSelectedDate(date);
    if (dayEvents.length > 0) {
      setSelectedDayEvents(dayEvents);
      setIsDialogOpen(true);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event: any) => isSameDay(event.date, date));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href={isDemoMode ? "/demo-profiles" : "/"}>
                <Button variant="ghost" size="icon" className="mr-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-primary mr-3" />
                <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Player dashboard - no admin controls */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendar Card - Centered */}
        <Card className="mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Team Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDayClick}
                className="w-full max-w-md mx-auto"
                classNames={{
                  months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
                  month: "space-y-4 w-full flex flex-col",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex justify-center",
                  head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex justify-center items-center",
                  row: "flex w-full mt-2 justify-center",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                  day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  day_range_end: "day-range-end",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  Day: ({ date, ...props }) => {
                    const events = getEventsForDate(date);
                    const hasEvents = events.length > 0;
                    const hasCompletedEvent = events.some(e => e.checkedIn);
                    const hasUpcomingEvent = events.some(e => !e.checkedIn);
                    
                    return (
                      <div className="relative">
                        <button
                          {...props as any}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDayClick(date);
                          }}
                          className={`h-8 w-8 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center justify-center ${
                            isSameDay(date, selectedDate || new Date()) 
                              ? 'bg-primary text-primary-foreground' 
                              : isToday(date) 
                                ? 'bg-accent text-accent-foreground' 
                                : ''
                          }`}
                        >
                          {date.getDate()}
                        </button>
                        {hasEvents && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                            {hasCompletedEvent && (
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            )}
                            {hasUpcomingEvent && (
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex justify-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Completed (QR Check-in)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Upcoming</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Events Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Events for {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDayEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <Badge className={`${getEventTypeColor(event.eventType)} mt-1`}>
                        {event.eventType}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      {event.checkedIn ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    {event.opponent && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>vs {event.opponent}</span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-gray-600 mt-3">{event.description}</p>
                  )}

                  <div className="mt-3 text-xs">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                      event.checkedIn 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.checkedIn ? 'Checked In' : 'Not Checked In'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
