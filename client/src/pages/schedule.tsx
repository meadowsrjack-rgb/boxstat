import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";

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

  // Fetch events the same way you already do (kept as-is)
  const { data: events = [], isLoading } = useQuery<UypEvent[]>({
    queryKey: ["/api/users", user?.id, "events"], // if your key differs, keep your original one
    enabled: !!user?.id,
  });

  const [filter, setFilter] = useState<Filter>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return events;
    if (filter === "Games") return events.filter(e => (e.eventType || "Other").toLowerCase() === "game");
    return events.filter(e => (e.eventType || "Other").toLowerCase() === filter.toLowerCase());
  }, [events, filter]);

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

        {/* Calendar wrapper — keep your existing calendar component here */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {/* If you render a calendar component, keep it exactly as before.
                Only spacing has been tightened: remove extra titles/margins above it. */}

            {/* Example list fallback (keep your real calendar instead) */}
            <div className="divide-y">
              {isLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No events for this filter.</div>
              ) : (
                filtered.map((e) => (
                  <div key={e.id} className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-gray-100 grid place-items-center">
                      <CalendarIcon className="w-4 h-4 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">{e.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(e.startTime).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {e.eventType ? ` • ${e.eventType}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
