import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Calendar as CalendarIcon, 
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Plus,
  Filter
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";

export default function Schedule() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filter, setFilter] = useState<string>("all");

  const { data: userEvents } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
  });

  const { data: userTeam } = useQuery({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
  });

  if (!user) {
    return <div>Loading...</div>;
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date)) return format(date, "EEEE");
    return format(date, "MMM d");
  };

  const filteredEvents = userEvents?.filter((event: any) => {
    if (filter === "all") return true;
    return event.eventType === filter;
  });

  const upcomingEvents = filteredEvents?.filter((event: any) => 
    new Date(event.startTime) >= new Date()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
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
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              {user?.role === "admin" && (
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full"
              />
              
              {/* Filter Buttons */}
              <div className="mt-6 space-y-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter("all")}
                >
                  All Events
                </Button>
                <Button
                  variant={filter === "practice" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter("practice")}
                >
                  Practices
                </Button>
                <Button
                  variant={filter === "game" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter("game")}
                >
                  Games
                </Button>
                <Button
                  variant={filter === "tournament" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter("tournament")}
                >
                  Tournaments
                </Button>
                <Button
                  variant={filter === "camp" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter("camp")}
                >
                  Camps
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {upcomingEvents?.map((event: any) => (
                  <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: userTeam?.color || "#1E40AF" }}
                        >
                          <CalendarIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-500">
                            {getDateLabel(new Date(event.startTime))}
                          </p>
                        </div>
                      </div>
                      <Badge className={getEventTypeColor(event.eventType)}>
                        {event.eventType}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    {event.opponentTeam && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                        <Users className="h-4 w-4" />
                        <span>vs {event.opponentTeam}</span>
                      </div>
                    )}

                    {event.description && (
                      <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                    )}

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button variant="outline" size="sm">
                        Add to Calendar
                      </Button>
                      {event.location && (
                        <Button variant="outline" size="sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          Directions
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {(!upcomingEvents || upcomingEvents.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No upcoming events</h3>
                    <p>Check back later for new practices and games</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
