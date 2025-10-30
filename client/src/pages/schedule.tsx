import { useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday as isDateToday } from "date-fns";
import EventDetailPanel from "@/components/EventDetailPanel";
import { useAuth } from "@/hooks/useAuth";

// Expected event shape coming from Google Calendar adapter
type UypEvent = {
  id: string;
  title: string;
  startTime: string; // ISO
  endTime?: string;
  eventType?: "Practice" | "Skills" | "Game" | "Other" | string;
  location: string;
  latitude?: number;
  longitude?: number;
  checkInOpensHoursBefore?: number;
  checkInClosesMinutesAfter?: number;
  rsvpOpensHoursBefore?: number;
  rsvpClosesHoursBefore?: number;
};

export default function SchedulePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Fetch events from API
  const { data: events = [], isLoading } = useQuery<UypEvent[]>({
    queryKey: ["/api/events"],
    enabled: true,
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'slide-in-left' | 'slide-in-right' | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UypEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  
  // Touch/swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Get events for selected date
  const eventsForSelectedDate = useMemo(() => {
    return events.filter(event => 
      isSameDay(parseISO(event.startTime), selectedDate)
    );
  }, [events, selectedDate]);

  // Get dates that have events for calendar display
  const eventDateStrings = useMemo(() => {
    const eventDates = new Set<string>();
    events.forEach(event => {
      eventDates.add(parseISO(event.startTime).toDateString());
    });
    return eventDates;
  }, [events]);

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
    const startingDayOfWeek = getDay(firstDay);
    
    const calendarDays = [];
    
    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month - 1, prevMonth.getDate() - i);
      calendarDays.push({ date: day, isCurrentMonth: false });
    }
    
    // Current month's days
    daysInMonth.forEach(day => {
      calendarDays.push({ date: day, isCurrentMonth: true });
    });
    
    // Next month's leading days (fill to complete the grid if needed)
    const totalCells = calendarDays.length;
    const remainingCells = totalCells < 35 ? 35 - totalCells : 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonthDay = new Date(year, month + 1, day);
      calendarDays.push({ date: nextMonthDay, isCurrentMonth: false });
    }
    
    return calendarDays;
  };

  const formatEventTime = (startTime: string) => {
    try {
      return format(parseISO(startTime), 'h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  const previousMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('right'); // Current month slides OUT to the right
    setTimeout(() => {
      setCurrentDate(subMonths(currentDate, 1));
      setSlideDirection('slide-in-left'); // New month slides IN from the left
      setTimeout(() => {
        setSlideDirection(null);
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const nextMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('left'); // Current month slides OUT to the left
    setTimeout(() => {
      setCurrentDate(addMonths(currentDate, 1));
      setSlideDirection('slide-in-right'); // New month slides IN from the right
      setTimeout(() => {
        setSlideDirection(null);
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 100; // Increased from 50 to 100
    const isRightSwipe = distance < -100; // Increased from -50 to -100

    if (isLeftSwipe) {
      nextMonth();
    }
    if (isRightSwipe) {
      previousMonth();
    }
    
    // Reset touch references
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const calendarDays = renderCalendar();

  return (
    <div className="min-h-screen bg-white p-5">
      <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white text-gray-900 px-5 py-4 text-center border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/player-dashboard")}
              data-testid="button-back"
              className="text-gray-700 hover:text-red-600 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <div className="w-10"></div> {/* Spacer to balance the layout */}
          </div>
        </div>

        {/* Events Section - moved above calendar */}
        <div className="px-5 pb-5 border-b border-gray-100">
          <div className="font-semibold text-gray-800 text-lg my-5">
            {isSameDay(selectedDate, new Date()) ? "Today's Events" : `Events for ${format(selectedDate, 'MMM d')}`}
          </div>
          <div>
            {isLoading ? (
              <div className="text-center text-gray-500 py-5">Loading events...</div>
            ) : eventsForSelectedDate.length > 0 ? (
              eventsForSelectedDate.map(event => (
                <div 
                  key={event.id} 
                  className="bg-red-50 border-l-4 border-red-600 px-4 py-3 mb-3 rounded-lg cursor-pointer hover:bg-red-100 transition"
                  onClick={() => {
                    setSelectedEvent(event);
                    setEventDetailOpen(true);
                  }}
                  data-testid={`event-item-${event.id}`}
                >
                  <div className="text-xs text-gray-600 font-medium">
                    {formatEventTime(event.startTime)}
                  </div>
                  <div className="text-sm text-gray-800 font-semibold mt-1">
                    {event.title}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-5">
                No events for this day
              </div>
            )}
          </div>
        </div>
        
        {/* Calendar */}
        <div 
          className="p-5"
          ref={calendarRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 text-xs py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days */}
          <div className={`grid grid-cols-7 gap-1 transition-all duration-300 ${
            slideDirection === 'left' ? 'transform -translate-x-full opacity-0' :
            slideDirection === 'right' ? 'transform translate-x-full opacity-0' :
            slideDirection === 'slide-in-left' ? 'animate-slide-in-left' :
            slideDirection === 'slide-in-right' ? 'animate-slide-in-right' :
            'opacity-100'
          }`}>
            {calendarDays.map((dayObj, index) => {
              const { date, isCurrentMonth } = dayObj;
              const isToday = isDateToday(date);
              const isSelected = isSameDay(date, selectedDate);
              const hasEvent = eventDateStrings.has(date.toDateString());
              
              return (
                <div
                  key={index}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl text-sm font-medium cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-gray-100 relative
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-800'}
                    ${isToday ? 'bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold' : ''}
                    ${isSelected && !isToday ? 'bg-red-600 text-white' : ''}
                  `}
                  onClick={() => selectDate(date)}
                >
                  {format(date, 'd')}
                  {hasEvent && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Detail Panel */}
      {user && (
        <EventDetailPanel
          event={selectedEvent}
          userId={(user as any).id}
          open={eventDetailOpen}
          onOpenChange={setEventDetailOpen}
        />
      )}
    </div>
  );
}
