
import { useState } from "react";
import { X, Calendar, Clock, MapPin, User, Tag, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ParsedEvent, getEventTypeColor } from "@/lib/parseEventMeta";
import { UserPreferences } from "@/lib/userPrefs";
import { format } from "date-fns";

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: ParsedEvent[];
  filters: UserPreferences;
}

export function DayDrawer({ isOpen, onClose, date, events, filters }: DayDrawerProps) {
  const [showOnlyFiltered, setShowOnlyFiltered] = useState(false);

  if (!isOpen) return null;

  const matchesFilters = (event: ParsedEvent): boolean => {
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.type)) return false;
    if (filters.ageTags.length > 0 && !event.ageTags.some(tag => filters.ageTags.includes(tag))) return false;
    if (filters.teamTags.length > 0 && !event.teamTags.some(tag => filters.teamTags.includes(tag))) return false;
    if (filters.coaches.length > 0 && !event.coaches.some(coach => filters.coaches.includes(coach))) return false;
    return true;
  };

  const relevantEvents = events.filter(event => matchesFilters(event));
  const otherEvents = events.filter(event => !matchesFilters(event));
  
  const displayEvents = showOnlyFiltered ? relevantEvents : events;
  const sortedEvents = displayEvents.sort((a, b) => {
    // Relevant events first, then by start time
    const aRelevant = matchesFilters(a);
    const bRelevant = matchesFilters(b);
    if (aRelevant && !bRelevant) return -1;
    if (!aRelevant && bRelevant) return 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Focus trap and escape handling
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex justify-end"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-md h-full shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-4 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <h2 className="text-lg font-semibold">
                  {format(date, "EEEE, MMMM d")}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Filter toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm">Only my filters</span>
                <Switch
                  checked={showOnlyFiltered}
                  onCheckedChange={setShowOnlyFiltered}
                />
              </div>
              <Badge variant="secondary">
                {displayEvents.length} events
              </Badge>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {sortedEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-500 mb-4">
                  {showOnlyFiltered 
                    ? "No events match your current filters for this day."
                    : "No events scheduled for this day."
                  }
                </p>
                {showOnlyFiltered && (
                  <Button
                    variant="outline"
                    onClick={() => setShowOnlyFiltered(false)}
                  >
                    Show all events
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Relevant events */}
                {!showOnlyFiltered && relevantEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      Relevant for you ({relevantEvents.length})
                    </h3>
                    <div className="space-y-3">
                      {relevantEvents.map(event => (
                        <EventCard key={event.id} event={event} isRelevant={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other events */}
                {!showOnlyFiltered && otherEvents.length > 0 && (
                  <div>
                    {relevantEvents.length > 0 && (
                      <h3 className="text-sm font-medium text-gray-500 mb-2 mt-6">
                        Other events ({otherEvents.length})
                      </h3>
                    )}
                    <div className="space-y-3">
                      {otherEvents.map(event => (
                        <EventCard key={event.id} event={event} isRelevant={false} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtered events */}
                {showOnlyFiltered && (
                  <div className="space-y-3">
                    {sortedEvents.map(event => (
                      <EventCard key={event.id} event={event} isRelevant={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

interface EventCardProps {
  event: ParsedEvent;
  isRelevant: boolean;
}

function EventCard({ event, isRelevant }: EventCardProps) {
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  return (
    <Card className={`${isRelevant ? 'ring-2 ring-blue-200' : 'opacity-75'} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Title and type */}
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-gray-900 flex-1">{event.title}</h4>
            <Badge className={getEventTypeColor(event.type)}>
              {event.type}
            </Badge>
          </div>

          {/* Time */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Coaches */}
          {event.coaches.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{event.coaches.join(", ")}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {event.ageTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {event.teamTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
