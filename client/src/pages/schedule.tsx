import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { format, isSameDay } from "date-fns";
import { parseEventMeta, ParsedEvent, getEventTypeDotColor } from "@/lib/parseEventMeta";
import { UserPreferences, getUserPreferences } from "@/lib/userPrefs";
import { FiltersBar } from "@/components/FiltersBar";
import { DayDrawer } from "@/components/DayDrawer";



export default function Schedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [drawerDate, setDrawerDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<UserPreferences>(getUserPreferences());

  // Check for demo mode
  const isDemoMode = sessionStorage.getItem('isDemoMode') === 'true';
  const demoProfile = isDemoMode ? JSON.parse(sessionStorage.getItem('demoProfile') || '{}') : null;
  
  // Use demo profile if in demo mode, otherwise use authenticated user
  const currentUser = isDemoMode ? demoProfile : user;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["/api/events"],
  });

  // Parse events with metadata
  const parsedEvents: ParsedEvent[] = useMemo(() => {
    return events.map(parseEventMeta);
  }, [events]);

  // Filter events based on user preferences
  const filteredEvents = useMemo(() => {
    return parsedEvents.filter(event => {
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) return false;
      if (filters.ageTags.length > 0 && !event.ageTags.some(tag => filters.ageTags.includes(tag))) return false;
      if (filters.teamTags.length > 0 && !event.teamTags.some(tag => filters.teamTags.includes(tag))) return false;
      if (filters.coaches.length > 0 && !event.coaches.some(coach => filters.coaches.includes(coach))) return false;
      return true;
    });
  }, [parsedEvents, filters]);

  // Get events for drawer
  const drawerEvents = drawerDate 
    ? parsedEvents.filter(event => isSameDay(new Date(event.start), drawerDate))
    : [];

  // Get events by date for calendar display
  const eventsByDate = useMemo(() => {
    const result: Record<string, ParsedEvent[]> = {};
    filteredEvents.forEach(event => {
      const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
      if (!result[dateKey]) result[dateKey] = [];
      result[dateKey].push(event);
    });
    return result;
  }, [filteredEvents]);

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setDrawerDate(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <FiltersBar 
          events={parsedEvents}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Calendar Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Team Schedule
            </CardTitle>
            <div className="text-center text-sm text-gray-600">
              Showing {filteredEvents.length} of {parsedEvents.length} events from UYP's Google Calendar
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                onSelect={handleDayClick}
                className="w-full max-w-md mx-auto"
                components={{
                  Day: ({ date, ...props }) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate[dateKey] || [];
                    const hasEvents = dayEvents.length > 0;
                    
                    // Group events by type to show different colored dots
                    const eventTypeGroups = dayEvents.reduce((acc: Record<string, number>, event) => {
                      acc[event.type] = (acc[event.type] || 0) + 1;
                      return acc;
                    }, {});
                    
                    return (
                      <div className="relative">
                        <button
                          {...props as any}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDayClick(date);
                          }}
                          className={`h-8 w-8 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center justify-center transition-colors ${
                            isSameDay(date, selectedDate || new Date()) 
                              ? 'bg-primary text-primary-foreground' 
                              : hasEvents
                                ? 'bg-blue-50 text-blue-900 font-medium'
                                : ''
                          }`}
                        >
                          {date.getDate()}
                        </button>
                        {hasEvents && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                            {Object.keys(eventTypeGroups).slice(0, 3).map(type => (
                              <div
                                key={type}
                                className={`w-1.5 h-1.5 rounded-full ${getEventTypeDotColor(type as any)}`}
                              />
                            ))}
                            {Object.keys(eventTypeGroups).length > 3 && (
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Day Events Drawer */}
        <DayDrawer
          isOpen={!!drawerDate}
          onClose={() => setDrawerDate(null)}
          date={drawerDate}
          events={drawerEvents}
        />
      </main>
    </div>
  );
}