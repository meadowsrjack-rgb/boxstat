import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, MapPin, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ParsedEvent, getEventTypeHexColor } from "@/lib/parseEventMeta";

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: ParsedEvent[];
  eventTypeColors?: Record<string, string>;
}

export function DayDrawer({ isOpen, onClose, date, events, eventTypeColors = {} }: DayDrawerProps) {
  if (!date) return null;

  const getEventBadgeStyle = (type: string) => {
    const hex = getEventTypeHexColor(type, eventTypeColors);
    return {
      backgroundColor: hex + '22',
      color: hex,
      border: `1px solid ${hex}44`,
    };
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(date, "EEEE, MMMM d, yyyy")}
          </SheetTitle>
          <SheetDescription>
            {events.length === 0 ? 'No events scheduled' : `${events.length} event${events.length === 1 ? '' : 's'} scheduled`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-500 mb-2">No events today</p>
              <p className="text-sm text-gray-400">This day is free of scheduled activities</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {events.map((event) => {
                  const hexColor = getEventTypeHexColor(event.type, eventTypeColors);
                  return (
                    <Card key={event.id} className="relative">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                        style={{ backgroundColor: hexColor }}
                      />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg leading-tight pr-2">
                            {event.title}
                          </CardTitle>
                          <Badge
                            className="capitalize text-xs border"
                            style={getEventBadgeStyle(event.type)}
                          >
                            {event.type.replace(/-/g, ' ')}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>
                            {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                          </span>
                        </div>

                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{event.location}</span>
                        </div>

                        {event.ageTags.length > 0 && (
                          <div className="flex items-start text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {event.ageTags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag.toUpperCase()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {event.teamTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.teamTags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs capitalize">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {event.coaches.length > 0 && (
                          <div className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Coaches: </span>
                            {event.coaches.join(', ')}
                          </div>
                        )}

                        {event.description && (
                          <div className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded-md">
                            {event.description}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
