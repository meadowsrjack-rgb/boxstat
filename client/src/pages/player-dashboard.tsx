import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCode from "@/components/ui/qr-code";
import BadgeDisplay from "@/components/ui/badge-display";
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  Trophy, 
  Star,
  Dumbbell,
  ChevronRight,
  Volleyball,
  Play,
  BookOpen,
  Clock
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function PlayerDashboard({ childId }: { childId?: number | null }) {
  const { user } = useAuth();
  // Temporarily disable useAppMode
  // const { deviceConfig } = useAppMode();
  const [showQR, setShowQR] = useState(false);
  const [, setLocation] = useLocation();
  
  // Get child profiles to find the current child's QR code
  const { data: childProfiles } = useQuery({
    queryKey: ["/api/child-profiles", user?.id],
    enabled: !!user?.id,
  });

  // Get the selected child ID from URL parameter or prop
  const urlParams = new URLSearchParams(window.location.search);
  const selectedChildId = childId?.toString() || urlParams.get('childId');
  const currentChild = Array.isArray(childProfiles) ? 
    childProfiles.find((child: any) => child.id.toString() === selectedChildId) || childProfiles[0] : 
    null;

  const { data: userTeam } = useQuery({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: userEvents = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
  });

  const { data: childEvents = [] } = useQuery({
    queryKey: ["/api/child-profiles", selectedChildId, "events"],
    enabled: !!selectedChildId,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["/api/users", user?.id, "badges"],
    enabled: !!user?.id,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Use child-specific events if available, otherwise fall back to user events
  const displayEvents = childEvents || userEvents;
  const nextEvent = displayEvents?.[0];
  // Use the selected child's QR code data if available
  const qrData = currentChild?.qrCodeData || `UYP-PLAYER-${user.id}-${userTeam?.id}-${Date.now()}`;

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
      case "skills":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="page-container bg-gradient-to-br from-green-500 to-blue-600">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="UYP Basketball Academy" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Hey {currentChild?.firstName || user.firstName}! 🏀
                </h1>
                <p className="text-sm text-gray-600">
                  {currentChild?.teamName ? `${currentChild.teamAgeGroup} ${currentChild.teamName}` : userTeam?.name || 'No Team'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {userBadges?.length || 0}
                </span>
              </div>
              <img 
                src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=32&h=32"} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setLocation('/profile')}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-6 main-content">
        {/* Prominent Check-In Section */}
        <Card className="mb-6 shadow-lg bg-gradient-to-r from-primary to-red-600 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-3">🏀 Check-In</h2>
            <p className="text-sm opacity-90 mb-6">
              Tap below to show your QR code for gym entry at Momentous Sports Center
            </p>
            <Button 
              onClick={() => setShowQR(!showQR)}
              className="bg-white text-primary hover:bg-gray-100 text-lg py-3 px-8 font-semibold"
              size="lg"
            >
              {showQR ? 'Hide QR Code' : 'Show Check-In QR Code'}
            </Button>
            {showQR && (
              <div className="mt-6 bg-white p-6 rounded-lg">
                <QRCode value={qrData} size={240} />
                <p className="text-gray-600 text-sm mt-3 font-medium">
                  {currentChild?.firstName || user.firstName} {currentChild?.lastName || user.lastName}
                </p>
                <p className="text-gray-500 text-xs">
                  {currentChild?.teamName ? `${currentChild.teamAgeGroup} ${currentChild.teamName}` : userTeam?.name || 'Team Member'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-500 mb-1">12</div>
              <div className="text-sm text-gray-600">Practices</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-1">8</div>
              <div className="text-sm text-gray-600">Games</div>
            </CardContent>
          </Card>
        </div>

        {/* Next Event */}
        {nextEvent && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Next Up! 🗓️</h3>
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-4 text-white">
                <h4 className="font-bold text-lg mb-2">{nextEvent.title}</h4>
                <p className="text-sm opacity-90 mb-1">
                  {format(new Date(nextEvent.startTime), "EEEE 'at' h:mm a")}
                </p>
                <p className="text-sm opacity-90">{nextEvent.location}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Widget - This Week */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              This Week's Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {displayEvents && displayEvents.length > 0 ? (
              <div className="space-y-3">
                {displayEvents.slice(0, 3).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${getEventTypeColor(event.eventType)} text-xs px-2 py-1`}>
                          {event.eventType}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm">{event.title}</h4>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(event.startTime), 'MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.startTime), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
                {displayEvents.length > 3 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-green-600 hover:text-green-700 mt-3"
                    onClick={() => setLocation('/schedule')}
                  >
                    View All Events ({displayEvents.length}) →
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming events</p>
                <Button 
                  variant="ghost" 
                  className="text-green-600 hover:text-green-700 mt-2"
                  onClick={() => setLocation('/schedule')}
                >
                  View Full Schedule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges & Achievements */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">My Badges 🏆</h3>
            <div className="grid grid-cols-3 gap-4">
              <BadgeDisplay 
                icon={<Star className="h-5 w-5 text-white" />}
                title="Perfect Attendance"
                earned={true}
                color="from-yellow-500 to-orange-400"
              />
              <BadgeDisplay 
                icon={<Users className="h-5 w-5 text-white" />}
                title="Team Player"
                earned={true}
                color="from-green-500 to-blue-400"
              />
              <BadgeDisplay 
                icon={<Trophy className="h-5 w-5 text-gray-400" />}
                title="MVP"
                earned={false}
                color="from-gray-200 to-gray-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4 mb-6">
          <Card className="shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">My Team</h4>
                  <p className="text-sm text-gray-600">See teammates & coach</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">Practice Drills</h4>
                  <p className="text-sm text-gray-600">Fun exercises to try</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            onClick={() => setLocation("/training")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">Training Videos</h4>
                  <p className="text-sm text-gray-600">Your assigned training videos</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            onClick={() => setLocation("/training-library")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">My Training</h4>
                  <p className="text-sm text-gray-600">View your progress</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            onClick={() => setLocation("/player/team-chat")}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">Team Chat</h4>
                  <p className="text-sm text-gray-600">Talk with teammates</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">2</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">My Check-In Pass</h3>
            <p className="text-gray-600 mb-6">Show this to staff at the gym entrance</p>
            <div className="flex justify-center mb-6">
              <QRCode value={qrData} size={200} />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {user.firstName} {user.lastName} - {userTeam?.name}
            </p>
            <Button
              onClick={() => setShowQR(false)}
              className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-semibold w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}


    </div>
  );
}
