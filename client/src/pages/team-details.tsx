import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  MapPin,
  Mail,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function TeamDetails() {
  const { user } = useAuth();

  const { data: userTeam } = useQuery({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: teamPlayers } = useQuery({
    queryKey: ["/api/teams", userTeam?.id, "players"],
    enabled: !!userTeam?.id,
  });

  const { data: teamEvents } = useQuery({
    queryKey: ["/api/teams", userTeam?.id, "events"],
    enabled: !!userTeam?.id,
  });

  if (!user || !userTeam) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen-safe bg-gray-50">
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
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: userTeam.color }}
                >
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{userTeam.name}</h1>
              </div>
            </div>
            <Badge variant="outline">{userTeam.ageGroup}</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Team Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Team Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team Name:</span>
                    <span className="font-medium">{userTeam.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age Group:</span>
                    <span className="font-medium">{userTeam.ageGroup}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Players:</span>
                    <span className="font-medium">{teamPlayers?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Team Chat
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Schedule
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Coach
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Roster */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Team Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamPlayers?.map((player: any) => (
                <div key={player.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar>
                    <AvatarImage src={player.profileImageUrl} />
                    <AvatarFallback>
                      {player.firstName?.[0]}{player.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Player</p>
                  </div>
                  {player.id === user.id && (
                    <Badge variant="secondary">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamEvents?.slice(0, 5).map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: userTeam.color }}
                    >
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.startTime), "EEEE, MMMM d 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {event.eventType}
                    </Badge>
                    <p className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </p>
                  </div>
                </div>
              ))}
              
              {(!teamEvents || teamEvents.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events scheduled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
