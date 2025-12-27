import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BanterLoader } from "@/components/BanterLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, MapPin, CheckCircle, XCircle, AlertCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SportsEngineEvent {
  id: string;
  title: string;
  type: 'game' | 'practice' | 'tournament' | 'team_event';
  startTime: string;
  endTime: string;
  location: string;
  teamId: string;
  opponent?: string;
  isHome: boolean;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  description?: string;
  attendanceRequired: boolean;
  rosterDeadline?: string;
  roster: RosterSpot[];
  rosterStats: {
    total: number;
    confirmed: number;
    pending: number;
    declined: number;
  };
}

interface RosterSpot {
  id: string;
  teamId: string;
  eventId: string;
  playerId: string;
  playerName: string;
  status: 'confirmed' | 'pending' | 'declined' | 'unavailable';
  position?: string;
  responseDate?: string;
  notes?: string;
}

interface ScheduleRequest {
  id: string;
  teamId: string;
  requestType: 'game' | 'practice' | 'tournament';
  requestedDate: string;
  requestedTime: string;
  duration: number;
  location?: string;
  opponent?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'denied';
  requestedBy: string;
  requestDate: string;
  approvalDate?: string;
  notes?: string;
}

export default function RosterManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<SportsEngineEvent | null>(null);
  const [rosterNotes, setRosterNotes] = useState("");

  // Fetch events with roster information
  const { data: events = [], isLoading: eventsLoading } = useQuery<SportsEngineEvent[]>({
    queryKey: ['/api/sportsengine/events-with-roster'],
  });

  // Fetch schedule requests
  const { data: scheduleRequests = [], isLoading: requestsLoading } = useQuery<ScheduleRequest[]>({
    queryKey: ['/api/sportsengine/schedule-requests'],
  });

  // Update roster status mutation
  const updateRosterMutation = useMutation({
    mutationFn: async ({ rosterId, status, notes }: { rosterId: string; status: string; notes?: string }) => {
      return apiRequest("PUT", `/api/sportsengine/roster/${rosterId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sportsengine/events-with-roster'] });
      toast({
        title: "Roster Updated",
        description: "Player status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update roster status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRosterResponse = async (rosterId: string, status: string) => {
    updateRosterMutation.mutate({ rosterId, status, notes: rosterNotes });
    setRosterNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      case 'unavailable':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unavailable</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (eventsLoading || requestsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center justify-center py-12">
          <BanterLoader />
          <p className="mt-6 text-gray-600">Loading roster management data...</p>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter(event => new Date(event.startTime) > new Date());
  const pendingRequests = scheduleRequests.filter(req => req.status === 'pending');

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Roster & Schedule Management</h1>
        <p className="text-muted-foreground">Manage team rosters and schedule requests through SportsEngine</p>
      </div>

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Event Rosters</TabsTrigger>
          <TabsTrigger value="requests">Schedule Requests</TabsTrigger>
          <TabsTrigger value="analytics">Team Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="grid gap-4">
            {upcomingEvents.map(event => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {event.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge variant={event.type === 'game' ? 'default' : 'secondary'}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    
                    {/* Roster Stats */}
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Total: {event.rosterStats.total}
                      </span>
                      <span className="text-green-600">Confirmed: {event.rosterStats.confirmed}</span>
                      <span className="text-yellow-600">Pending: {event.rosterStats.pending}</span>
                      <span className="text-red-600">Declined: {event.rosterStats.declined}</span>
                    </div>

                    {/* Roster Deadline */}
                    {event.rosterDeadline && (
                      <div className="text-sm text-orange-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Roster deadline: {new Date(event.rosterDeadline).toLocaleDateString()} at {new Date(event.rosterDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Player Roster */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Team Roster:</h4>
                      <div className="grid gap-2">
                        {event.roster.map(spot => (
                          <div key={spot.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4" />
                              <div>
                                <p className="font-medium">{spot.playerName}</p>
                                {spot.position && <p className="text-sm text-muted-foreground">{spot.position}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(spot.status)}
                              {spot.status === 'pending' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        // Create a clean copy to avoid cyclic structure issues from React Query cache
                                        const cleanEvent = JSON.parse(JSON.stringify(event));
                                        setSelectedEvent(cleanEvent);
                                      }}
                                    >
                                      Respond
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Roster Response - {spot.playerName}</DialogTitle>
                                      <DialogDescription>
                                        Confirm availability for {event.title}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="notes">Notes (optional)</Label>
                                        <Textarea
                                          id="notes"
                                          placeholder="Any additional notes..."
                                          value={rosterNotes}
                                          onChange={(e) => setRosterNotes(e.target.value)}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          onClick={() => handleRosterResponse(spot.id, 'confirmed')}
                                          disabled={updateRosterMutation.isPending}
                                          className="flex-1"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Confirm
                                        </Button>
                                        <Button 
                                          variant="destructive"
                                          onClick={() => handleRosterResponse(spot.id, 'declined')}
                                          disabled={updateRosterMutation.isPending}
                                          className="flex-1"
                                        >
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Decline
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4">
            {pendingRequests.map(request => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {request.requestType.charAt(0).toUpperCase() + request.requestType.slice(1)} Request
                      </CardTitle>
                      <CardDescription>
                        Requested on {new Date(request.requestDate).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(request.priority)}
                      {getRequestStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Date:</strong> {new Date(request.requestedDate).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Time:</strong> {request.requestedTime}
                      </div>
                      <div>
                        <strong>Duration:</strong> {request.duration} minutes
                      </div>
                      {request.location && (
                        <div>
                          <strong>Location:</strong> {request.location}
                        </div>
                      )}
                      {request.opponent && (
                        <div>
                          <strong>Opponent:</strong> {request.opponent}
                        </div>
                      )}
                    </div>
                    {request.notes && (
                      <div>
                        <strong>Notes:</strong> {request.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {pendingRequests.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No pending schedule requests</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Events:</span>
                    <span className="font-medium">{events.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Upcoming:</span>
                    <span className="font-medium">{upcomingEvents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Games:</span>
                    <span className="font-medium">{events.filter(e => e.type === 'game').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Practices:</span>
                    <span className="font-medium">{events.filter(e => e.type === 'practice').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roster Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingEvents.length > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Avg Confirmed:</span>
                        <span className="font-medium">
                          {Math.round(upcomingEvents.reduce((sum, e) => sum + e.rosterStats.confirmed, 0) / upcomingEvents.length)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Pending:</span>
                        <span className="font-medium">
                          {Math.round(upcomingEvents.reduce((sum, e) => sum + e.rosterStats.pending, 0) / upcomingEvents.length)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Response Rate:</span>
                        <span className="font-medium">
                          {Math.round(
                            (upcomingEvents.reduce((sum, e) => sum + e.rosterStats.confirmed + e.rosterStats.declined, 0) /
                            upcomingEvents.reduce((sum, e) => sum + e.rosterStats.total, 0)) * 100
                          )}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <span className="font-medium">{scheduleRequests.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-medium">{scheduleRequests.filter(r => r.status === 'pending').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approved:</span>
                    <span className="font-medium">{scheduleRequests.filter(r => r.status === 'approved').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval Rate:</span>
                    <span className="font-medium">
                      {scheduleRequests.length > 0 
                        ? Math.round((scheduleRequests.filter(r => r.status === 'approved').length / scheduleRequests.length) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}