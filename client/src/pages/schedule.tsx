
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
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
    const byDate: Record<string, ParsedEvent[]> = {};
    filteredEvents.forEach(event => {
      const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(event);
    });
    return byDate;
  }, [filteredEvents]);

  // Custom day content for calendar
  const dayContent = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate[dateKey] || [];
    
    if (dayEvents.length === 0) return null;

    // Group events by type and show dots
    const eventTypes = Array.from(new Set(dayEvents.map(e => e.type)));
    
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span className="text-sm">{format(date, 'd')}</span>
        <div className="flex space-x-1 mt-1">
          {eventTypes.slice(0, 3).map(type => (
            <div
              key={type}
              className={`w-1.5 h-1.5 rounded-full ${getEventTypeDotColor(type)}`}
            />
          ))}
          {eventTypes.length > 3 && (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          )}
        </div>
      </div>
    );
  };

  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate[dateKey] || [];
    
    if (dayEvents.length > 0) {
      setDrawerDate(date);
    }
    setSelectedDate(date);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const isPlayerInterface = user.userType === "player";

  return (
    <div className={`min-h-screen ${isPlayerInterface ? 'bg-gradient-to-br from-green-500 to-blue-600' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="icon" className="mr-2">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 mr-3 text-primary" />
                <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
              </div>
            </div>
            <Badge variant="outline">
              {filteredEvents.length} events
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <FiltersBar events={parsedEvents} onFiltersChange={setFilters} />

          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentMonth(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p>Loading schedule...</p>
                </div>
              ) : (
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && handleDateClick(date)}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="w-full"
                    components={{
                      Day: ({ date, ...props }) => {
                        const content = dayContent(date);
                        const hasEvents = content !== null;
                        
                        return (
                          <button
                            {...props}
                            className={`
                              relative h-12 w-full p-0 font-normal rounded-md
                              hover:bg-accent hover:text-accent-foreground
                              focus:bg-accent focus:text-accent-foreground
                              ${hasEvents ? 'cursor-pointer' : ''}
                              ${isSameDay(date, selectedDate || new Date()) ? 'bg-primary text-primary-foreground' : ''}
                            `}
                            onClick={() => handleDateClick(date)}
                          >
                            {content || <span className="text-sm">{format(date, 'd')}</span>}
                          </button>
                        );
                      }
                    }}
                  />
                </div>
              )}
              
              {/* Event Summary */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Showing {filteredEvents.length} events from UYP's Google Calendar
                </p>
              </div>
              
              {/* Legend */}
              <div className="mt-2 flex justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Practice</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Game</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">Skills</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Camp</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Day Drawer */}
      <DayDrawer
        isOpen={drawerDate !== null}
        onClose={() => setDrawerDate(null)}
        date={drawerDate || new Date()}
        events={drawerEvents}
        filters={filters}
      />
    </div>
  );
}
