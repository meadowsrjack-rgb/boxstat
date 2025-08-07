import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location: string;
  teamId: number | null;
  opponentTeam: string | null;
  googleEventId: string | null;
  lastSyncedAt: string | null;
}

export default function CalendarSync() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const queryClient = useQueryClient();

  // Fetch calendar events
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['/api/calendar/events'],
    queryFn: () => apiRequest('/api/calendar/events')
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiRequest('/api/calendar/sync', { method: 'POST' }),
    onMutate: () => {
      setSyncStatus('syncing');
    },
    onSuccess: () => {
      setSyncStatus('success');
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setTimeout(() => setSyncStatus('idle'), 3000);
    },
    onError: () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  });

  const handleManualSync = () => {
    syncMutation.mutate();
  };

  const events: CalendarEvent[] = eventsData?.events || [];
  const syncedEvents = events.filter(event => event.googleEventId);
  const localEvents = events.filter(event => !event.googleEventId);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'practice': return 'bg-blue-100 text-blue-800';
      case 'game': return 'bg-green-100 text-green-800';
      case 'tournament': return 'bg-purple-100 text-purple-800';
      case 'camp': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <RefreshCw className="w-4 h-4" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': return 'Sync Complete';
      case 'error': return 'Sync Failed';
      default: return 'Sync Calendar';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar Sync</h1>
          <p className="text-gray-600 mt-2">
            Sync with UYP's Google Calendar to show the latest practices, games, and events
          </p>
        </div>
        
        <Button
          onClick={handleManualSync}
          disabled={syncStatus === 'syncing'}
          className="flex items-center gap-2"
        >
          {getSyncStatusIcon()}
          {getSyncStatusText()}
        </Button>
      </div>

      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Synced from Google</p>
                <p className="text-2xl font-bold text-green-600">{syncedEvents.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Local Events</p>
                <p className="text-2xl font-bold text-blue-600">{localEvents.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              All Calendar Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No events found. Click "Sync Calendar" to fetch events from Google Calendar.
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {event.eventType}
                          </Badge>
                          {event.googleEventId && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Google Synced
                            </Badge>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(event.startTime), 'MMM d, yyyy')}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    {event.opponentTeam && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>vs {event.opponentTeam}</strong>
                      </div>
                    )}

                    {event.lastSyncedAt && (
                      <div className="mt-2 text-xs text-gray-500">
                        Last synced: {format(new Date(event.lastSyncedAt), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}