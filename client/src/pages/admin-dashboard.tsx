import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import QRReader from "@/components/ui/qr-reader";
import { useLocation } from "wouter";
import { 
  Users, 
  Calendar, 
  MessageCircle, 
  Trophy,
  Camera,
  BookOpen,
  Bell,
  Plus,
  QrCode,
  Clock,
  CheckCircle
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function AdminDashboard({ demoProfile }: { demoProfile?: any }) {
  const { user } = useAuth();
  
  // Check if we're in demo mode
  const isDemoMode = sessionStorage.getItem('isDemoMode') === 'true' || !!demoProfile;
  const profileData = demoProfile || (isDemoMode ? JSON.parse(sessionStorage.getItem('demoProfile') || '{}') : null);
  
  // Use demo user data if in demo mode
  const currentUser = isDemoMode ? {
    id: profileData?.id || 'demo-coach-001',
    firstName: profileData?.firstName || 'Coach',
    lastName: profileData?.lastName || 'Smith',
    email: profileData?.email || 'coach.smith@email.com',
    userType: 'admin',
    profileImageUrl: null
  } : user;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [showQRReader, setShowQRReader] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);

  // Get teams coached by this admin/coach
  const { data: coachTeams = [] } = useQuery({
    queryKey: ["/api/teams/coach", user?.id],
    enabled: !!user?.id,
  });

  // Get team events/schedule
  const { data: teamEvents = [] } = useQuery({
    queryKey: ["/api/team-events", selectedTeam || (coachTeams as any[])?.[0]?.id],
    enabled: !!(selectedTeam || (coachTeams as any[])?.[0]?.id),
  });

  // Get team players
  const { data: teamPlayers = [] } = useQuery({
    queryKey: ["/api/team-players", selectedTeam || (coachTeams as any[])?.[0]?.id],
    enabled: !!(selectedTeam || (coachTeams as any[])?.[0]?.id),
  });

  const currentTeam = selectedTeam 
    ? (coachTeams as any[])?.find((team: any) => team.id === selectedTeam) 
    : (coachTeams as any[])?.[0];

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: any) => {
      await apiRequest("POST", "/api/announcements", announcementData);
    },
    onSuccess: () => {
      setAnnouncementTitle("");
      setAnnouncementContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementContent.trim() || !currentTeam) return;

    createAnnouncementMutation.mutate({
      title: announcementTitle,
      content: announcementContent,
      priority: "medium",
      teamId: currentTeam.id,
    });
  };

  const handleQRScan = async (qrData: string) => {
    try {
      // Parse QR code data to get player info
      console.log("Scanned QR Code:", qrData);
      
      // Extract player ID from QR code (format: UYP-{playerId}-{timestamp})
      const playerIdMatch = qrData.match(/UYP-(.+?)-\d+/);
      const playerId = playerIdMatch ? playerIdMatch[1] : qrData;
      
      // Find the player in the team roster
      const player = (teamPlayers as any[])?.find((p: any) => p.id === playerId);
      
      if (!player) {
        toast({
          title: "Player Not Found",
          description: "This player is not on your team roster",
          variant: "destructive",
        });
        setShowQRReader(false);
        return;
      }

      // Simulate SportsEngine registration check (random status for demo)
      const isRegistered = Math.random() > 0.2;
      const paymentUpToDate = Math.random() > 0.3;
      const currentAttendance = Math.floor(Math.random() * 12) + 1;

      // Show registration status and attendance update
      const statusColor = isRegistered && paymentUpToDate ? "default" : "destructive";
      const statusText = isRegistered && paymentUpToDate 
        ? "✓ Registration & payments current" 
        : "⚠ Registration or payment issues";

      toast({
        title: `${player?.firstName || 'Player'} ${player?.lastName || ''} Checked In`,
        description: `${statusText}\nAttendance: ${currentAttendance + 1} practices`,
        variant: statusColor as any,
      });

      // TODO: Update SportsEngine attendance via API
      // await apiRequest("POST", "/api/sportsengine/attendance", {
      //   playerId,
      //   teamId: currentTeam.id,
      //   eventDate: new Date().toISOString(),
      // });

      setShowQRReader(false);
      
      // Refresh team data to show updated attendance
      queryClient.invalidateQueries({ queryKey: ["/api/team-players", currentTeam?.id] });
      
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to process player check-in",
        variant: "destructive",
      });
      setShowQRReader(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if ((user as any)?.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
              <p className="text-sm text-gray-500 mt-2">Current user type: {(user as any)?.userType}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoPath} 
                alt="UYP Basketball Academy" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Coach Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, Coach {(user as any)?.firstName}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="outline" 
                className="bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setShowTeamSelector(!showTeamSelector)}
              >
                {currentTeam?.name || 'Select Team'} {coachTeams && coachTeams.length > 1 && '▼'}
              </Badge>
              {showTeamSelector && coachTeams && coachTeams.length > 1 && (
                <div className="absolute top-16 right-20 bg-white border rounded-lg shadow-lg z-50 min-w-40">
                  {coachTeams.map((team) => (
                    <div
                      key={team.id}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedTeam(team.id);
                        setShowTeamSelector(false);
                      }}
                    >
                      {team.name}
                    </div>
                  ))}
                </div>
              )}
              <img 
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=32&h=32"} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setLocation('/profile')}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        
        {/* Team Selection Alert */}
        {!currentTeam && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <h3 className="font-semibold text-yellow-800 mb-2">No Team Selected</h3>
              <p className="text-sm text-yellow-700">Please select a team from the header to access team features.</p>
            </CardContent>
          </Card>
        )}

        {/* Coach Action Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* QR Scanner */}
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100 ${!currentTeam ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => currentTeam && setShowQRReader(true)}
          >
            <CardContent className="p-4 text-center">
              <Camera className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Scan Player</h3>
              <p className="text-xs text-gray-600">Check in players</p>
            </CardContent>
          </Card>

          {/* Team Messages */}
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100 ${!currentTeam ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => currentTeam && setLocation(`/coach/team-messages/${currentTeam.id}`)}
          >
            <CardContent className="p-4 text-center">
              <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Team Messages</h3>
              <p className="text-xs text-gray-600">Message players</p>
            </CardContent>
          </Card>

          {/* Curriculum */}
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100 ${!currentTeam ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => currentTeam && setLocation('/training')}
          >
            <CardContent className="p-4 text-center">
              <BookOpen className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Curriculum</h3>
              <p className="text-xs text-gray-600">Training resources</p>
            </CardContent>
          </Card>

        </div>

        {/* Team Roster */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Team Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {teamPlayers && teamPlayers.length > 0 ? (
              <div className="space-y-3">
                {teamPlayers.map((player: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600">
                            {player.jerseyNumber || (index + 1)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {player.firstName} {player.lastName}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {Math.floor(Math.random() * 12) + 1} practices
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-xs px-2 py-1 ${
                        Math.random() > 0.3 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {Math.random() > 0.3 ? 'Registered' : 'Pending'}
                      </Badge>
                      <Badge className={`text-xs px-2 py-1 ${
                        Math.random() > 0.2 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {Math.random() > 0.2 ? 'Paid' : 'Due'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No players assigned</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach Curriculum */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Coach Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Basic Coach Curriculum</h4>
                    <p className="text-xs text-gray-600">Fundamental coaching materials</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Coming Soon</div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">SOPs</h4>
                    <p className="text-xs text-gray-600">Standard Operating Procedures</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Coming Soon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {teamEvents && teamEvents.length > 0 ? (
              <div className="space-y-3">
                {teamEvents.slice(0, 3).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
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
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full text-green-600 hover:text-green-700 mt-3"
                  onClick={() => setLocation('/schedule')}
                >
                  View Full Calendar →
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>




        
        {/* QR Reader Modal */}
        <QRReader
          isOpen={showQRReader}
          onScan={handleQRScan}
          onClose={() => setShowQRReader(false)}
        />
      </main>
    </div>
  );
}
