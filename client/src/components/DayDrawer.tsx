import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, MapPin, Users, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ParsedEvent, getEventTypeDotColor } from "@/lib/parseEventMeta";

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: ParsedEvent[];
}

export function DayDrawer({ isOpen, onClose, date, events }: DayDrawerProps) {
  if (!date) return null;

  const getEventTypeColor = (type: string) => {
    switch (type) {
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
                {events.map((event) => (
                  <Card key={event.id} className="relative">
                    <div 
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getEventTypeDotColor(event.type)}`}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight pr-2">
                          {event.title}
                        </CardTitle>
                        <Badge className={getEventTypeColor(event.type)}>
                          {event.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Time */}
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{event.location}</span>
                      </div>

                      {/* Age Tags */}
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

                      {/* Team Tags */}
                      {event.teamTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.teamTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs capitalize">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Coaches */}
                      {event.coaches.length > 0 && (
                        <div className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Coaches: </span>
                          {event.coaches.join(', ')}
                        </div>
                      )}

                      {/* Description */}
                      {event.description && (
                        <div className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded-md">
                          {event.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}