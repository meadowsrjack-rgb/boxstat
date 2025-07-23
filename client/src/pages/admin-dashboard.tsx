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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [showQRReader, setShowQRReader] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [messageType, setMessageType] = useState<"message" | "task" | "announcement">("message");
  const [messageTarget, setMessageTarget] = useState<"team" | "parents">("team");
  const [showTeamSelector, setShowTeamSelector] = useState(false);

  // Get teams coached by this admin/coach
  const { data: coachTeams = [] } = useQuery({
    queryKey: ["/api/teams/coach", user?.id],
    enabled: !!user?.id,
  });

  // Get team events/schedule
  const { data: teamEvents = [] } = useQuery({
    queryKey: ["/api/team-events", selectedTeam || coachTeams?.[0]?.id],
    enabled: !!(selectedTeam || coachTeams?.[0]?.id),
  });

  // Get team players
  const { data: teamPlayers = [] } = useQuery({
    queryKey: ["/api/team-players", selectedTeam || coachTeams?.[0]?.id],
    enabled: !!(selectedTeam || coachTeams?.[0]?.id),
  });

  const currentTeam = selectedTeam 
    ? coachTeams?.find(team => team.id === selectedTeam) 
    : coachTeams?.[0];

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
      priority: messageType === "task" ? "high" : "medium",
      messageType: messageType,
      targetAudience: messageTarget,
      teamId: currentTeam.id,
    });
  };

  const handleQRScan = (qrData: string) => {
    // Parse QR code data to get player info
    console.log("Scanned QR Code:", qrData);
    
    toast({
      title: "Player Scanned",
      description: `Successfully scanned: ${qrData}`,
    });
    
    setShowQRReader(false);
    
    // Here you could check in the player or perform other actions
    // For now, just show success message
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user?.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
              <p className="text-sm text-gray-500 mt-2">Current user type: {user?.userType}</p>
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
                  Welcome back, Coach {user?.firstName}!
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
            onClick={() => currentTeam && (setMessageTarget("team"), setShowTeamSelector(false))}
          >
            <CardContent className="p-4 text-center">
              <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Team Messages</h3>
              <p className="text-xs text-gray-600">Message players</p>
            </CardContent>
          </Card>

          {/* Parent Messages */}
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100 ${!currentTeam ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => currentTeam && (setMessageTarget("parents"), setShowTeamSelector(false))}
          >
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Parent Messages</h3>
              <p className="text-xs text-gray-600">Message parents</p>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100 ${!currentTeam ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => currentTeam && setLocation('/schedule')}
          >
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Schedule</h3>
              <p className="text-xs text-gray-600">View team events</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Schedule */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Team Schedule
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
                  View Full Schedule →
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

        {/* Team Members */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {teamPlayers && teamPlayers.length > 0 ? (
              <div className="space-y-3">
                {teamPlayers.slice(0, 4).map((player: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <img 
                      src={player.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=32&h=32"} 
                      alt={player.firstName} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {player.firstName} {player.lastName}
                      </h4>
                      <p className="text-xs text-gray-600">
                        #{player.jerseyNumber} • {player.position}
                      </p>
                    </div>
                    <QrCode className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full text-blue-600 hover:text-blue-700 mt-3"
                  onClick={() => setLocation('/roster')}
                >
                  View Full Team →
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No team members</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Communication */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Team Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {currentTeam ? (
              <div className="space-y-4">
                {/* Message Type & Target Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Send To:</label>
                    <div className="flex gap-2">
                      <Button
                        variant={messageTarget === "team" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setMessageTarget("team")}
                      >
                        Team
                      </Button>
                      <Button
                        variant={messageTarget === "parents" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setMessageTarget("parents")}
                      >
                        Parents
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Message Type:</label>
                    <div className="flex gap-1">
                      <Button
                        variant={messageType === "message" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs px-2"
                        onClick={() => setMessageType("message")}
                      >
                        Message
                      </Button>
                      <Button
                        variant={messageType === "task" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs px-2"
                        onClick={() => setMessageType("task")}
                      >
                        Task
                      </Button>
                      <Button
                        variant={messageType === "announcement" ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs px-2"
                        onClick={() => setMessageType("announcement")}
                      >
                        News
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Message Composer */}
                <div className="space-y-3">
                  <Input
                    placeholder={`${messageType} title`}
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder={`What would you like to tell the ${messageTarget}?`}
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <Button 
                    onClick={handleCreateAnnouncement}
                    disabled={createAnnouncementMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Send {messageType === "task" ? "Task" : messageType === "announcement" ? "Announcement" : "Message"} to {messageTarget === "team" ? "Team" : "Parents"}
                  </Button>
                </div>
                
                {/* Recent Messages */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Messages</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-semibold text-gray-900 text-sm">Practice Update</h5>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">Team</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Tomorrow's practice starts at 4:30 PM sharp. Please arrive 15 minutes early.</p>
                      <span className="text-xs text-gray-500">2 hours ago</span>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-semibold text-gray-900 text-sm">Parent Meeting</h5>
                        <Badge className="bg-green-100 text-green-800 text-xs">Parents</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Monthly parent meeting scheduled for next Friday at 7 PM.</p>
                      <span className="text-xs text-gray-500">1 day ago</span>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-semibold text-gray-900 text-sm">Training Homework</h5>
                        <Badge className="bg-orange-100 text-orange-800 text-xs">Task</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Complete 50 free throws before next practice. Log your results.</p>
                      <span className="text-xs text-gray-500">3 days ago</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a team to send messages</p>
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
