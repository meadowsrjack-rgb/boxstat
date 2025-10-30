import React, { useMemo, useState } from "react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday as isDateToday } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CheckIn = {
  id: string | number;
  eventId: string | number;
  userId: string;
  type: "advance" | "onsite";
  createdAt: string;
};

type UypEvent = {
  id: string;
  title: string;
  startTime: string; // ISO
  endTime?: string;
  eventType?: "Practice" | "Skills" | "Game" | "Other" | string;
  checkInOpensHoursBefore?: number;
  checkInClosesMinutesAfter?: number;
  rsvpOpensHoursBefore?: number;
  rsvpClosesHoursBefore?: number;
};

interface PlayerCalendarProps {
  events: UypEvent[];
  className?: string;
  currentUser: { id: string; email: string; firstName?: string; lastName?: string };
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export default function PlayerCalendar({ 
  events, 
  className = "", 
  currentUser, 
  selectedDate: externalSelectedDate,
  onDateSelect 
}: PlayerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  
  // Use external selectedDate if provided, otherwise use internal state
  const selectedDate = externalSelectedDate || internalSelectedDate;
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'slide-in-left' | 'slide-in-right' | null>(null);
  const [limit, setLimit] = useState<{ open: boolean; title: string; body: string }>({ open: false, title: "", body: "" });
  
  const { toast } = useToast();

  // Constants for time windows
  const MS = { HOUR: 60 * 60 * 1000, MIN: 60 * 1000 };

  // Helper functions for time windows - using event-specific timing settings
  const isRsvpWindow = (event: UypEvent, now = new Date()) => {
    const t = new Date(event.startTime).getTime(), n = now.getTime();
    const rsvpOpensHours = event.rsvpOpensHoursBefore ?? 72;
    const rsvpClosesHours = event.rsvpClosesHoursBefore ?? 24;
    return n >= t - rsvpOpensHours * MS.HOUR && n <= t - rsvpClosesHours * MS.HOUR;
  };
  
  const isOnsiteWindow = (event: UypEvent, now = new Date()) => {
    const t = new Date(event.startTime).getTime(), n = now.getTime();
    const checkInOpensMin = (event.checkInOpensHoursBefore ?? 3) * 60;
    const checkInClosesMin = event.checkInClosesMinutesAfter ?? 15;
    return n >= t - checkInOpensMin * MS.MIN && n <= t + checkInClosesMin * MS.MIN;
  };

  // Checkins query
  const { data: checkins = [] as CheckIn[] } = useQuery<CheckIn[]>({
    queryKey: ["/api/checkins", currentUser.id],
    queryFn: async () => {
      const res = await fetch(`/api/checkins?userId=${currentUser.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentUser.id,
    staleTime: 30_000,
  });

  // Checkin mutation
  const createCheckInMutation = useMutation({
    mutationFn: async (payload: { eventId: string | number; type: "advance" | "onsite"; lat?: number; lng?: number }) => {
      const res = await apiRequest("POST", `/api/checkins`, { ...payload, userId: currentUser.id });
      return res;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins", currentUser.id] });
      if (variables.type === "advance") {
        toast({ title: "RSVP Confirmed", description: "Thank you for your RSVP. Be sure to Check-in on arrival." });
      } else {
        toast({ title: "Checked in", description: "We recorded your check-in." });
      }
    },
    onError: (e: any) =>
      toast({
        title: "Check-in failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  // Remove RSVP mutation
  const removeRsvpMutation = useMutation({
    mutationFn: async (payload: { eventId: string | number; type: "advance" }) => {
      const res = await apiRequest("DELETE", `/api/checkins/${payload.eventId}/${payload.type}?userId=${currentUser.id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins", currentUser.id] });
      toast({ title: "RSVP Removed", description: "Your RSVP has been cancelled." });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to remove RSVP",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  // Organize checkins by event
  const checkinByEvent = useMemo(() => {
    const map = new Map<string | number, { advance?: CheckIn; onsite?: CheckIn }>();
    for (const c of checkins) {
      const entry = map.get(c.eventId) || {};
      if (c.type === "advance") entry.advance = c;
      if (c.type === "onsite") entry.onsite = c;
      map.set(c.eventId, entry);
    }
    return map;
  }, [checkins]);

  // Icon components from the attached file
  const IconMailX = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m17 17 4 4" />
      <path d="m21 17-4 4" />
    </svg>
  );
  
  const IconMailCheck = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="m16 19 2 2 4-4" />
    </svg>
  );
  
  const IconCircleX = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
  
  const IconCircleCheck = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );

  // Helper components
  const IconChip = ({
    colorClass,
    disabled,
    onClick,
    title,
    children,
  }: {
    colorClass: string;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      className={[
        "relative grid place-items-center h-11 w-11 rounded-xl",
        "bg-white ring-1 ring-black/5 shadow-sm transition-all",
        "hover:shadow-md hover:-translate-y-0.5 active:scale-95",
        disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
        "after:absolute after:inset-0 after:rounded-xl after:opacity-0 after:transition-opacity",
        "after:bg-[radial-gradient(ellipse_at_center,rgba(216,36,40,0.08),transparent_60%)]",
        "hover:after:opacity-100",
      ].join(" ")}
      aria-disabled={disabled}
      data-testid={`icon-chip-${title?.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className={["pointer-events-none", colorClass].join(" ")}>{children}</span>
    </button>
  );

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-semibold">
      {children}
    </span>
  );

  const Modal = ({ open, title, body, onClose }: { open: boolean; title: string; body: string; onClose: () => void }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-50 grid place-items-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5">
          <div className="text-base font-bold">{title}</div>
          <div className="text-sm text-gray-600 mt-1">{body}</div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
              data-testid="modal-close-button"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const formatEventHeader = (d: Date) => {
    try {
      const date = d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const time = d.toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${date} • ${time}`;
    } catch {
      return d.toISOString();
    }
  };

  // Get events for selected date
  const eventsForSelectedDate = useMemo(() => {
    return events.filter(event => 
      isSameDay(new Date(event.startTime), selectedDate)
    );
  }, [events, selectedDate]);

  // Get dates that have events for calendar display
  const eventDateStrings = useMemo(() => {
    const eventDates = new Set<string>();
    events.forEach(event => {
      eventDates.add(new Date(event.startTime).toDateString());
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
      return format(new Date(startTime), 'h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  const previousMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentDate(subMonths(currentDate, 1));
      setSlideDirection('slide-in-left');
      setTimeout(() => {
        setSlideDirection(null);
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const nextMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentDate(addMonths(currentDate, 1));
      setSlideDirection('slide-in-right');
      setTimeout(() => {
        setSlideDirection(null);
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const selectDate = (date: Date) => {
    if (onDateSelect) {
      onDateSelect(date);
    } else {
      setInternalSelectedDate(date);
    }
  };

  const calendarDays = renderCalendar();

  return (
    <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden ${className}`}>

      {/* Month/Year Navigation Header */}
      <div className="bg-white text-gray-900 px-5 py-4 text-center border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={previousMonth}
            className="text-gray-700 hover:text-red-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <div className="text-lg font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button
            onClick={nextMonth}
            className="text-gray-700 hover:text-red-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            →
          </button>
        </div>
      </div>
      
      {/* Calendar */}
      <div className="p-5">
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
                  ${isSelected && !isToday ? 'bg-gray-500 text-white' : ''}
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

      {/* Overlay Modal */}
      <Modal 
        open={limit.open} 
        title={limit.title} 
        body={limit.body} 
        onClose={() => setLimit({ open: false, title: "", body: "" })} 
      />
    </div>
  );
}