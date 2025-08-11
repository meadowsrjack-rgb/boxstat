import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DayDrawer } from "@/components/DayDrawer";
import { format, isSameDay, parseISO } from "date-fns";

// Expected event shape coming from your Google Calendar adapter
type UypEvent = {
  id: string;
  title: string;
  startTime: string; // ISO
  endTime?: string;
  eventType?: "Practice" | "Skills" | "Game" | "Other" | string;
};

const FILTERS = ["All", "Practice", "Skills", "Games", "Other"] as const;
type Filter = typeof FILTERS[number];

export default function SchedulePage() {
  const { user } = useAuth();

  // Fetch events from API
  const { data: events = [], isLoading } = useQuery<UypEvent[]>({
    queryKey: ["/api/events"],
    enabled: true,
  });

  const [filter, setFilter] = useState<Filter>("All");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "All") return events;
    if (filter === "Games") return events.filter(e => (e.eventType || "Other").toLowerCase() === "game");
    return events.filter(e => (e.eventType || "Other").toLowerCase() === filter.toLowerCase());
  }, [events, filter]);

  // Get events for selected date
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return filtered.filter(event => 
      isSameDay(parseISO(event.startTime), selectedDate)
    );
  }, [filtered, selectedDate]);

  // Get dates that have events for calendar display
  const eventDates = useMemo(() => {
    return filtered.map(event => parseISO(event.startTime));
  }, [filtered]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setIsDrawerOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-md mx-auto px-4 py-4">
        {/* Top row: filter + count */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-44">
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Count (replaces 'Team Schedule' text) */}
          <div className="text-sm font-semibold text-gray-700">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
          </div>
        </div>

        {/* Calendar Display */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading calendar...</div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="w-full"
                modifiers={{
                  eventDate: eventDates,
                }}
                modifiersStyles={{
                  eventDate: {
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    fontWeight: 'bold'
                  }
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Day Drawer for event details */}
        <DayDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          date={selectedDate}
          events={eventsForSelectedDate.map(event => ({
            id: parseInt(event.id.toString()),
            title: event.title,
            description: "",
            start: event.startTime,
            end: event.endTime || event.startTime,
            location: "Momentous Sports Center",
            type: (event.eventType?.toLowerCase() as any) || "other",
            ageTags: [],
            teamTags: [],
            coaches: [],
            originalEventType: event.eventType || "other"
          }))}
        />
      </main>
    </div>
  );
}
