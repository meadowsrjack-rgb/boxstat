import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import QRCode from "@/components/ui/qr-code";
import { 
  QrCode, 
  Bell, 
  MoreHorizontal,
  TrendingUp,
  Play,
  Users,
  User,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Target,
  Zap,
  Activity,
  Shirt,
  BookOpen,
  Tent,
  UserCheck,
  Award,
  Check,
  X,
  Calendar as CalendarIcon,
  MessageCircle,
  Send,
  MapPin
} from "lucide-react";
import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TodaySection } from "@/components/TodaySection";


export default function PlayerDashboard({ childId }: { childId?: number | null }) {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [, setLocation] = useLocation();
  
  // Sample events for calendar
  const sampleEvents = [
    {
      id: 1,
      title: "Thunder Wolves Practice",
      date: new Date(2025, 7, 1), // August 1, 2025
      eventType: "practice",
      startTime: "4:00 PM",
      location: "Momentous Sports Center"
    },
    {
      id: 2,
      title: "vs Lightning Bolts",
      date: new Date(2025, 7, 3), // August 3, 2025
      eventType: "game",
      startTime: "6:00 PM",
      location: "Court A"
    },
    {
      id: 3,
      title: "Skills Training",
      date: new Date(2025, 7, 5), // August 5, 2025
      eventType: "skills",
      startTime: "3:30 PM",
      location: "Training Gym"
    }
  ];
  
  // Helper functions for calendar
  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "practice":
        return "bg-blue-100 text-blue-800";
      case "game":
        return "bg-green-100 text-green-800";
      case "skills":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEventsForDate = (date: Date) => {
    return sampleEvents.filter(event => isSameDay(event.date, date));
  };

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

  const { data: userTeam } = useQuery<any>({
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
  // Use the selected child's QR code data if available
  const qrData = currentChild?.qrCodeData || `UYP-PLAYER-${user.id}-${userTeam?.id}-${Date.now()}`;
  
  // Get user initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // Sample skill ratings data - in real app this would come from API
  const skillRatings = [
    { name: 'Ball Handling', rating: 75, icon: Activity },
    { name: 'Agility', rating: 82, icon: Zap },
    { name: 'Finishing', rating: 68, icon: Target },
    { name: 'Free Throw', rating: 90, icon: Target },
    { name: 'Mid-Range', rating: 77, icon: Target },
    { name: 'Three Point', rating: 65, icon: Target },
  ];

  // Example team data
  const exampleTeam = {
    id: 1,
    name: "Thunder Wolves U12",
    division: "Recreational",
    coach: "Coach Martinez",
    location: "Momentous Sports Center",
    schedule: "Tuesdays & Thursdays 6:30 PM",
    record: "8-2",
    nextGame: "vs Lightning Hawks - Aug 2nd, 10:00 AM"
  };

  // Team messages API
  const { data: teamMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", userTeam?.id, "messages"],
    enabled: !!userTeam?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Send team message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/teams/${userTeam?.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          message, 
          messageType: "text" 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam?.id, "messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been sent to the team.",
      });
    },
    onError: (error) => {
      console.error("Message send error:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (userTeam?.id && user?.id) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        websocket.send(JSON.stringify({
          type: 'join',
          userId: user.id,
          teamId: userTeam.id
        }));
        setWs(websocket);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_team_message' && data.teamId === userTeam.id) {
            // Refresh messages when new message received
            queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam.id, "messages"] });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setWs(null);
      };
      
      return () => {
        websocket.close();
      };
    }
  }, [userTeam?.id, user?.id, queryClient]);

  // Example team roster
  const teamRoster = [
    { id: 1, name: "Alex K.", position: "Point Guard", number: 12, status: "Active" },
    { id: 2, name: "Jordan M.", position: "Shooting Guard", number: 8, status: "Active" },
    { id: 3, name: "Taylor S.", position: "Small Forward", number: 23, status: "Active" },
    { id: 4, name: "Riley P.", position: "Power Forward", number: 15, status: "Active" },
    { id: 5, name: "Casey D.", position: "Center", number: 32, status: "Active" },
    { id: 6, name: "Morgan L.", position: "Guard", number: 7, status: "Active" },
    { id: 7, name: "Drew H.", position: "Forward", number: 21, status: "Injured" },
    { id: 8, name: "Avery C.", position: "Guard", number: 11, status: "Active" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* QR Code Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowQR(!showQR)}
              className="h-12 w-12"
            >
              <QrCode className="h-12 w-12" />
            </Button>
            
            {/* Notifications and More Options */}
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="h-12 w-12">
                <Bell className="h-12 w-12" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12"
                onClick={() => setLocation("/settings")}
              >
                <MoreHorizontal className="h-12 w-12" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Check-In QR Code</h3>
              <QRCode value={qrData} size={200} className="mx-auto mb-4" />
              <p className="text-gray-600 text-sm mb-2 font-medium">
                {currentChild?.firstName || user.firstName} {currentChild?.lastName || user.lastName}
              </p>
              <p className="text-gray-500 text-xs mb-4">
                {currentChild?.teamName ? `${currentChild.teamAgeGroup} ${currentChild.teamName}` : userTeam?.name || 'Team Member'}
              </p>
              <Button onClick={() => setShowQR(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-md mx-auto">
        {/* Player Profile Header */}
        <div className="px-6 py-6 text-center">
          <Avatar className="h-20 w-20 mx-auto mb-4">
            <AvatarImage 
              src={user.profileImageUrl || currentChild?.profileImageUrl} 
              alt="Player Avatar" 
            />
            <AvatarFallback className="text-lg font-bold bg-gray-200">
              {getInitials(
                currentChild?.firstName || user.firstName || '', 
                currentChild?.lastName || user.lastName || ''
              )}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-gray-900">
            {currentChild?.firstName || user.firstName} {currentChild?.lastName || user.lastName}
          </h1>
        </div>

        {/* Main Navigation Tabs */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex flex-col items-center space-y-3 py-4 px-3 ${
                activeTab === 'activity' ? 'text-red-600' : 'text-gray-400'
              }`}
              style={{ color: activeTab === 'activity' ? '#d82428' : undefined }}
            >
              <TrendingUp className="h-6 w-6" />
              <div className={`h-1 w-12 rounded-full transition-all duration-200 ${
                activeTab === 'activity' ? 'opacity-100' : 'opacity-0'
              }`} style={{ backgroundColor: '#d82428' }} />
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex flex-col items-center space-y-3 py-4 px-3 ${
                activeTab === 'video' ? 'text-red-600' : 'text-gray-400'
              }`}
              style={{ color: activeTab === 'video' ? '#d82428' : undefined }}
            >
              <Play className="h-6 w-6" />
              <div className={`h-1 w-12 rounded-full transition-all duration-200 ${
                activeTab === 'video' ? 'opacity-100' : 'opacity-0'
              }`} style={{ backgroundColor: '#d82428' }} />
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex flex-col items-center space-y-3 py-4 px-3 ${
                activeTab === 'team' ? 'text-red-600' : 'text-gray-400'
              }`}
              style={{ color: activeTab === 'team' ? '#d82428' : undefined }}
            >
              <Shirt className="h-6 w-6" />
              <div className={`h-1 w-12 rounded-full transition-all duration-200 ${
                activeTab === 'team' ? 'opacity-100' : 'opacity-0'
              }`} style={{ backgroundColor: '#d82428' }} />
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-3 py-4 px-3 ${
                activeTab === 'profile' ? 'text-red-600' : 'text-gray-400'
              }`}
              style={{ color: activeTab === 'profile' ? '#d82428' : undefined }}
            >
              <User className="h-6 w-6" />
              <div className={`h-1 w-12 rounded-full transition-all duration-200 ${
                activeTab === 'profile' ? 'opacity-100' : 'opacity-0'
              }`} style={{ backgroundColor: '#d82428' }} />
            </button>
          </div>
        </div>
        {/* Tab Content */}
        <div className="px-6">
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">




              {/* Today Section */}
              <TodaySection playerId={user?.id || ''} />

              {/* Skill Ratings Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Skill Ratings</h3>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="space-y-3">
                  {skillRatings.map((skill, index) => {
                    const IconComponent = skill.icon;
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <IconComponent className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{skill.name}</span>
                            <span className="text-sm text-gray-500">{skill.rating}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${skill.rating}%`,
                                backgroundColor: '#d82428'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Section with Integrated Calendar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Schedule</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Calendar */}
                  <Card className="p-4">
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="w-full max-w-sm"
                        classNames={{
                          months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 justify-center",
                          month: "space-y-4 w-full flex flex-col",
                          caption: "flex justify-center pt-1 relative items-center",
                          caption_label: "text-sm font-medium",
                          nav: "space-x-1 flex items-center",
                          nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                          nav_button_previous: "absolute left-1",
                          nav_button_next: "absolute right-1",
                          table: "w-full border-collapse space-y-1",
                          head_row: "flex justify-center",
                          head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex justify-center items-center",
                          row: "flex w-full mt-2 justify-center",
                          cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                          day: "h-8 w-8 p-0 font-normal flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
                          day_selected: "bg-[#d82428] text-white hover:bg-[#d82428] hover:text-white",
                          day_today: "bg-accent text-accent-foreground",
                          day_outside: "text-muted-foreground opacity-50",
                          day_disabled: "text-muted-foreground opacity-50",
                        }}
                        components={{
                          Day: ({ date, ...props }) => {
                            const events = getEventsForDate(date);
                            const hasEvents = events.length > 0;
                            
                            return (
                              <div className="relative">
                                <button 
                                  {...props}
                                  className={`${props.className} ${hasEvents ? 'font-bold' : ''}`}
                                >
                                  {date.getDate()}
                                  {hasEvents && (
                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#d82428] rounded-full"></div>
                                  )}
                                </button>
                              </div>
                            );
                          }
                        }}
                      />
                    </div>
                  </Card>
                  
                  {/* Events for selected date */}
                  {selectedDate && getEventsForDate(selectedDate).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {format(selectedDate, 'MMMM d, yyyy')}
                      </h4>
                      {getEventsForDate(selectedDate).map((event) => (
                        <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs px-2 py-1 ${getEventTypeColor(event.eventType)}`}>
                              {event.eventType}
                            </Badge>
                          </div>
                          <h5 className="font-semibold text-gray-900 text-sm">{event.title}</h5>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>{event.startTime}</span>
                            <span>{event.location}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No videos yet</h3>
              <p className="text-gray-500 text-center">
                Your completed activities will appear here.
              </p>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Team Info */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">My Team</h2>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                        <Shirt className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{exampleTeam.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{exampleTeam.division} Division</p>
                        <div className="space-y-1 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="h-4 w-4" />
                            <span>{exampleTeam.coach}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{exampleTeam.location}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{exampleTeam.schedule}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center space-x-4">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Record: {exampleTeam.record}
                          </Badge>
                        </div>
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">Next Game:</p>
                          <p className="text-sm text-blue-600">{exampleTeam.nextGame}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Messages */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Team Messages</h3>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {teamMessages.length > 0 ? teamMessages.map((message: any) => (
                        <div key={message.id} className="flex space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.profileImageUrl || '/placeholder-player.jpg'} />
                            <AvatarFallback className={message.sender?.userType === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}>
                              {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {message.sender?.firstName} {message.sender?.lastName}
                              </p>
                              {message.sender?.userType === 'admin' && (
                                <Badge variant="secondary" className="text-xs bg-red-100 text-red-600">Coach</Badge>
                              )}
                              <p className="text-xs text-gray-500">
                                {message.createdAt ? format(new Date(message.createdAt), 'MMM d, h:mm a') : 'Now'}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Message Input */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          size="icon"
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
                          onClick={() => {
                            if (newMessage.trim()) {
                              sendMessageMutation.mutate(newMessage.trim());
                            }
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Roster */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Team Roster</h3>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {teamRoster.map((player) => (
                        <div key={player.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-600">#{player.number}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{player.name}</p>
                              <p className="text-sm text-gray-500">{player.position}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={player.status === 'Active' ? 'default' : 'destructive'}
                            className={`text-xs ${
                              player.status === 'Active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {player.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                      <p className="text-sm text-gray-500">
                        {teamRoster.filter(p => p.status === 'Active').length} active players • {teamRoster.length} total
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Bio</h2>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-gray-500">You haven't written anything yet...</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Personal details</h3>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">BASIC INFO</span>
                    <span className="text-xs text-gray-400">Visible to: only you</span>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Gender', value: '—' },
                      { label: 'Flag', value: '—' },
                      { label: 'Height', value: '—' },
                      { label: 'Weight', value: '—' },
                      { label: 'Position', value: user.position || '—' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-900">{item.label}</span>
                        <span className="text-gray-500">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


      </main>
    </div>
  );
}
