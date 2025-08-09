import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  MapPin,
  Edit3,
  Save,
  Trophy,
  Star,
  Instagram,
  Twitter
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TodaySection } from "@/components/TodaySection";


export default function PlayerDashboard({ childId, demoProfile }: { childId?: number | null, demoProfile?: any }) {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  
  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editableProfile, setEditableProfile] = useState({
    bio: '',
    teamName: '',
    age: '',
    height: '',
    weight: '',
    location: '',
    position: '',
    jerseyNumber: '',
    instagram: '',
    twitter: '',
    tiktok: ''
  });
  const queryClient = useQueryClient();

  const [location, setLocation] = useLocation();

  // Check if we're in demo mode
  const isDemoMode = sessionStorage.getItem('isDemoMode') === 'true' || !!demoProfile;
  const profileData = demoProfile || (isDemoMode ? JSON.parse(sessionStorage.getItem('demoProfile') || '{}') : null);
  
  // Use demo user data if in demo mode
  const currentUser = isDemoMode ? {
    id: profileData?.id || user?.id,
    firstName: profileData?.firstName || user?.firstName,
    lastName: profileData?.lastName || user?.lastName,
    userType: 'player',
    teamName: profileData?.teamName,
    jerseyNumber: profileData?.jerseyNumber,
    position: profileData?.position,
    grade: profileData?.grade,
    profileImageUrl: null
  } : user;
  
  // Get child profiles to find the current child's QR code (use demo data if in demo mode)
  const { data: childProfiles } = useQuery({
    queryKey: ["/api/child-profiles", currentUser?.id],
    enabled: !!currentUser?.id && !isDemoMode,
  });

  // Get the selected child ID from URL parameter or prop
  const urlParams = new URLSearchParams(window.location.search);
  const selectedChildId = childId?.toString() || urlParams.get('childId');
  const currentChild = Array.isArray(childProfiles) ? 
    childProfiles.find((child: any) => child.id.toString() === selectedChildId) || childProfiles[0] : 
    null;

  const { data: userTeam } = useQuery<any>({
    queryKey: ["/api/users", currentUser?.id, "team"],
    enabled: !!currentUser?.id && !isDemoMode,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: userEvents = [] } = useQuery({
    queryKey: ["/api/users", currentUser?.id, "events"],
    enabled: !!currentUser?.id && !isDemoMode,
  });

  const { data: childEvents = [] } = useQuery({
    queryKey: ["/api/child-profiles", selectedChildId, "events"],
    enabled: !!selectedChildId,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["/api/users", currentUser?.id, "badges"],
    enabled: !!currentUser?.id && !isDemoMode,
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Use child-specific events if available, otherwise fall back to user events
  const displayEvents = childEvents || userEvents;
  // Use the selected child's QR code data if available
  const qrData = currentChild?.qrCodeData || `UYP-PLAYER-${currentUser.id}-${userTeam?.id}-${Date.now()}`;
  
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
    if (userTeam?.id && currentUser?.id && !isDemoMode) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        websocket.send(JSON.stringify({
          type: 'join',
          userId: currentUser.id,
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
  }, [userTeam?.id, currentUser?.id, queryClient, isDemoMode]);

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
          {/* Demo Mode Indicator */}
          {isDemoMode && (
            <div className="flex items-center justify-center gap-2 mb-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
              <span>🎭</span>
              <span>Demo: {currentUser?.firstName || 'Player'}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation('/demo-profiles')}
                className="ml-2 h-6 text-xs border-orange-300 hover:bg-orange-200"
              >
                Switch Profile
              </Button>
            </div>
          )}
          
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
                {currentChild?.firstName || currentUser.firstName} {currentChild?.lastName || currentUser.lastName}
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
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage 
                src={currentUser.profileImageUrl || currentChild?.profileImageUrl} 
                alt="Player Avatar" 
              />
              <AvatarFallback className="text-lg font-bold bg-gray-200">
                {getInitials(
                  currentChild?.firstName || currentUser.firstName || '', 
                  currentChild?.lastName || currentUser.lastName || ''
                )}
              </AvatarFallback>
            </Avatar>
            
            {/* Badge/Trophy Icons */}
            <div className="flex flex-col space-y-2">
              {/* Trophies */}
              <div className="flex items-center space-x-1">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v4a7 7 0 0 1-7 7v1h2a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2h2v-1a7 7 0 0 1-7-7V5a1 1 0 0 1 1-1h4zM9 3v1h6V3H9zm-6 6V7h4v2H3zm14 0V7h4v2h-4z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">4</span>
              </div>

              {/* Badges */}
              <div className="flex items-center space-x-1">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">18</span>
              </div>
            </div>
          </div>
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

              {/* Schedule Section */}
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setLocation('/schedule')}
                >
                  <h3 className="text-lg font-bold text-gray-900">
                    Schedule
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Full calendar</span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Array.isArray(userEvents) && userEvents.length > 0 ? (
                    userEvents.slice(0, 3).map((event: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                              {event.eventType || 'Event'}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">{event.title}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(event.startTime || event.start_time), 'MMM d')}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 flex items-center justify-center">🕐</span>
                              {format(new Date(event.startTime || event.start_time), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Example upcoming events when no real events are available
                    <>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                              Practice
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">Thunder Wolves Practice</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              Aug 3
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 flex items-center justify-center">🕐</span>
                              6:00 PM
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">
                              Game
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">vs Lightning Eagles</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              Aug 5
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 flex items-center justify-center">🕐</span>
                              2:00 PM
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-100 text-purple-800 text-xs px-2 py-1">
                              Skills
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">Individual Skills Session</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              Aug 7
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 flex items-center justify-center">🕐</span>
                              4:30 PM
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

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

              {/* Trophies & Badges Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Trophies & Badges</h3>
                  <button
                    onClick={() => {
                      console.log('Navigating to simple-trophies, current location:', location);
                      setLocation('/trophies-badges');
                      console.log('setLocation called');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  {/* Trophies */}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v4a7 7 0 0 1-7 7v1h2a1 1 0 0 1 0 2H7a1 1 0 0 1 0-2h2v-1a7 7 0 0 1-7-7V5a1 1 0 0 1 1-1h4zM9 3v1h6V3H9zm-6 6V7h4v2H3zm14 0V7h4v2h-4z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">1</p>
                      <p className="text-sm text-gray-500">Trophies earned</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">18</p>
                      <p className="text-sm text-gray-500">Badges earned</p>
                    </div>
                  </div>
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
              {/* Header Section with Badges */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={currentUser.profileImageUrl || currentChild?.profileImageUrl} 
                        alt="Player Avatar" 
                      />
                      <AvatarFallback className="text-lg font-bold bg-gray-200">
                        {getInitials(
                          currentChild?.firstName || currentUser.firstName || '', 
                          currentChild?.lastName || currentUser.lastName || ''
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {currentChild?.firstName || currentUser.firstName} {currentChild?.lastName || currentUser.lastName}
                      </h2>
                      <div className="flex items-center space-x-3 mt-1">
                        <div className="flex items-center space-x-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-gray-700">4</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Award className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">18</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    {isEditingProfile ? <X className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {/* Bio Section */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Bio</h3>
                  </div>
                  {isEditingProfile ? (
                    <Textarea
                      placeholder="Write something about yourself..."
                      value={editableProfile.bio}
                      onChange={(e) => setEditableProfile({ ...editableProfile, bio: e.target.value })}
                      maxLength={300}
                      className="resize-none"
                      rows={3}
                    />
                  ) : (
                    <p className="text-gray-600">
                      {editableProfile.bio || "Write something about yourself..."}
                    </p>
                  )}
                  {isEditingProfile && (
                    <p className="text-xs text-gray-400 mt-1">
                      {editableProfile.bio.length}/300 characters
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Basic Personal Information */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { label: 'Team Name', key: 'teamName', value: currentChild?.teamName || editableProfile.teamName, placeholder: 'Your team name' },
                      { label: 'Age', key: 'age', value: editableProfile.age, placeholder: 'Your age' },
                      { label: 'Height', key: 'height', value: editableProfile.height, placeholder: 'e.g., 5\'8"' },
                      { label: 'Weight', key: 'weight', value: editableProfile.weight, placeholder: 'e.g., 140 lbs (optional)' },
                      { label: 'Location', key: 'location', value: editableProfile.location, placeholder: 'Where are you from?' },
                      { label: 'Position', key: 'position', value: currentChild?.position || editableProfile.position, placeholder: 'e.g., Point Guard' },
                      { label: 'Jersey Number', key: 'jerseyNumber', value: currentChild?.jerseyNumber || editableProfile.jerseyNumber, placeholder: 'Your number' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-gray-900 font-medium">{item.label}</span>
                        {isEditingProfile ? (
                          <Input
                            value={item.value || ''}
                            onChange={(e) => setEditableProfile({ ...editableProfile, [item.key]: e.target.value })}
                            placeholder={item.placeholder}
                            className="w-48 text-right"
                          />
                        ) : (
                          <span className="text-gray-600">{item.value || '—'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skills & Ratings */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Skills & Ratings</h3>
                    <Button variant="ghost" size="sm" className="text-sm text-gray-500">
                      View all <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { name: 'Shooting', rating: 85, color: 'bg-green-500' },
                      { name: 'Passing', rating: 78, color: 'bg-blue-500' },
                      { name: 'Defense', rating: 72, color: 'bg-red-500' }
                    ].map((skill, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{skill.name}</span>
                          <span className="text-sm text-gray-500">{skill.rating}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${skill.color}`}
                            style={{ width: `${skill.rating}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Game Stats */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Game Stats</h3>
                  </div>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Target className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Feature Coming Soon</p>
                    <p className="text-sm text-gray-400 mt-1">Game statistics and performance tracking will be available soon</p>
                  </div>
                </CardContent>
              </Card>

              {/* Social Media */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { 
                        label: 'Instagram', 
                        key: 'instagram', 
                        icon: Instagram, 
                        placeholder: '@username',
                        color: 'text-pink-600'
                      },
                      { 
                        label: 'Twitter', 
                        key: 'twitter', 
                        icon: Twitter, 
                        placeholder: '@username',
                        color: 'text-blue-500'
                      },
                      { 
                        label: 'TikTok', 
                        key: 'tiktok', 
                        icon: Play, 
                        placeholder: '@username',
                        color: 'text-black'
                      }
                    ].map((social, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <social.icon className={`h-5 w-5 ${social.color}`} />
                        <span className="text-gray-900 font-medium w-20">{social.label}</span>
                        {isEditingProfile ? (
                          <Input
                            value={editableProfile[social.key as keyof typeof editableProfile] || ''}
                            onChange={(e) => setEditableProfile({ ...editableProfile, [social.key]: e.target.value })}
                            placeholder={social.placeholder}
                            className="flex-1"
                          />
                        ) : (
                          <span className="text-gray-600 flex-1">
                            {editableProfile[social.key as keyof typeof editableProfile] || '—'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              {isEditingProfile && (
                <div className="flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditingProfile(false);
                      toast({
                        title: "Profile updated",
                        description: "Your profile has been saved successfully.",
                      });
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>


      </main>
    </div>
  );
}
