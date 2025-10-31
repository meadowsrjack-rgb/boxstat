import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import EventDetailModal from "@/components/EventDetailModal";

export default function EventDetailDemo() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Sample events with different states
  const sampleEvents = [
    {
      id: "event-1",
      title: "Youth Basketball Practice",
      description: "Weekly practice session for U12 team. Bring water and indoor shoes.",
      startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
      location: "123 Main St, Springfield, IL 62701, USA",
      locationLat: 39.7817,
      locationLng: -89.6501,
      color: "#3b82f6",
      // RSVP: Opens 7 days before, closes 1 day before
      rsvpOpenTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      rsvpCloseTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      // Check-in: Opens 30 min before, closes 15 min after
      checkinOpenTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(),
      checkinCloseTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    },
    {
      id: "event-2",
      title: "Saturday Tournament Game",
      description: "Championship game against Riverside Eagles. Please arrive 30 minutes early for warm-up.",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // +3 hours
      location: "Lincoln Park Sports Complex, 456 Park Ave, Springfield, IL 62704, USA",
      locationLat: 39.8080,
      locationLng: -89.6440,
      color: "#ef4444",
      rsvpOpenTime: new Date(Date.now()).toISOString(),
      rsvpCloseTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      checkinOpenTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000).toISOString(),
      checkinCloseTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    },
    {
      id: "event-3",
      title: "Team Fundraiser Event",
      description: "Join us for our annual fundraiser! Food, games, and raffle prizes.",
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
      location: "Community Center, 789 Oak Street, Springfield, IL 62702, USA",
      locationLat: 39.7990,
      locationLng: -89.6548,
      color: "#10b981",
      rsvpOpenTime: new Date(Date.now()).toISOString(),
      rsvpCloseTime: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      checkinOpenTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000).toISOString(),
      checkinCloseTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    },
  ];

  // Sample user states
  const [userRSVPs, setUserRSVPs] = useState<Record<string, any>>({
    "event-1": { status: "attending", timestamp: new Date().toISOString() },
    "event-2": { status: null, timestamp: null },
    "event-3": { status: "not_attending", timestamp: new Date().toISOString() },
  });

  const [userCheckIns, setUserCheckIns] = useState<Record<string, any>>({
    "event-1": { checkedIn: false },
    "event-2": { checkedIn: false },
    "event-3": { checkedIn: false },
  });

  const openEventDetail = (event: any) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const hasGoogleMapsKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Event Detail Modal Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Click on any event to view details, RSVP, and check-in
          </p>
        </div>

        {!hasGoogleMapsKey && (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Google Maps API key not configured. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> environment variable to enable map previews.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleEvents.map((event) => {
            const rsvpStatus = userRSVPs[event.id]?.status;
            const rsvpIndicator = rsvpStatus === "attending" ? "🟢" : 
                                 rsvpStatus === "not_attending" ? "🔴" : "⚪";

            return (
              <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1" 
                      style={{ backgroundColor: event.color }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(event.startTime).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(event.startTime).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>RSVP:</span>
                    <span className="text-lg">{rsvpIndicator}</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {rsvpStatus === "attending" ? "Attending" :
                       rsvpStatus === "not_attending" ? "Not Attending" :
                       "No Response"}
                    </span>
                  </div>
                  <Button 
                    onClick={() => openEventDetail(event)} 
                    className="w-full mt-2"
                    variant="outline"
                    data-testid={`button-view-event-${event.id}`}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Event Detail Modal */}
        <EventDetailModal
          event={selectedEvent}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          userRSVP={selectedEvent ? userRSVPs[selectedEvent.id] : null}
          userCheckIn={selectedEvent ? userCheckIns[selectedEvent.id] : null}
        />

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Features Demonstrated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>✅ <strong>RSVP Status Indicators:</strong> 🟢 Attending, 🔴 Not Attending, ⚪ No Response</div>
            <div>✅ <strong>Dynamic Buttons:</strong> RSVP buttons appear based on window status</div>
            <div>✅ <strong>Change RSVP:</strong> Can change RSVP until deadline</div>
            <div>✅ <strong>Check-in Window:</strong> Check-in button appears when window is open</div>
            <div>✅ <strong>Countdown Timers:</strong> Shows time until RSVP/check-in closes</div>
            <div>✅ <strong>Location Map:</strong> Google Maps preview (requires API key)</div>
            <div>✅ <strong>Role-based Views:</strong> Admin/coach see override information</div>
            <div>✅ <strong>Real-time Updates:</strong> Countdown updates every second</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
