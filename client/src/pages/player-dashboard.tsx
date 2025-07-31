import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  X
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function PlayerDashboard({ childId }: { childId?: number | null }) {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [timePeriod, setTimePeriod] = useState('This month');
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
              className="h-10 w-10"
            >
              <QrCode className="h-6 w-6" />
            </Button>
            
            {/* Notifications and More Options */}
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Bell className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <MoreHorizontal className="h-6 w-6" />
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
          <div className="flex justify-center items-center space-x-32">
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
              {/* Activity Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Activity</h2>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-gray-600">{timePeriod}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm" style={{ color: '#d82428' }}>Recent activity</span>
                  <ChevronRight className="h-4 w-4" style={{ color: '#d82428' }} />
                </div>
              </div>

              {/* Interactive Monthly Calendar */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Activity History</h3>
                      <p className="text-sm text-gray-500">Track your participation and progress</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm" style={{ color: '#d82428' }}>View all</span>
                      <ChevronRight className="h-4 w-4" style={{ color: '#d82428' }} />
                    </div>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h4 className="text-base font-bold text-gray-900">JUNE</h4>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="space-y-4">
                    {/* Simple Calendar Grid - No Day Headers */}
                    <div className="grid grid-cols-7 gap-4">
                      {/* Previous month days (empty spaces for June example) */}
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                      
                      {/* June days 1-30 */}
                      {Array.from({ length: 30 }, (_, i) => {
                        const day = i + 1;
                        const hasEvent = [5, 12, 18, 25].includes(day);
                        
                        return (
                          <button
                            key={day}
                            className={`h-10 flex items-center justify-center text-sm font-medium transition-colors ${
                              hasEvent 
                                ? 'text-white rounded-full' 
                                : 'text-gray-900 hover:bg-gray-100 rounded-full'
                            }`}
                            style={{
                              backgroundColor: hasEvent ? '#d82428' : undefined
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>


                </CardContent>
              </Card>

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
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Teams</h2>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">+</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Create a new team</h3>
                        <p className="text-sm text-gray-500">
                          Train alongside others with team leaderboards, highlights, and more.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Connections</h3>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Target className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Find user</h4>
                      </div>
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
