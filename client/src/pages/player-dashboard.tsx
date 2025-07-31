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
  Target,
  Zap,
  Activity,
  Shirt,
  ChevronLeft
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function PlayerDashboard({ childId }: { childId?: number | null }) {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [timePeriod, setTimePeriod] = useState('This month');
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 5)); // June 2025
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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

  // Sample calendar events with completion status
  const calendarEvents = {
    3: [{ type: 'Team Practice', time: '5:00 PM', location: 'Main Gym', completed: true }],
    7: [{ type: 'Skills Training', time: '10:00 AM', location: 'Court 2', completed: false }],
    10: [{ type: 'Team Practice', time: '5:00 PM', location: 'Main Gym', completed: true }],
    14: [{ type: 'Game', time: '2:00 PM', location: 'Away - Lincoln High', completed: true }],
    17: [{ type: 'Team Practice', time: '5:00 PM', location: 'Main Gym', completed: false }],
    21: [{ type: 'Skills Training', time: '10:00 AM', location: 'Court 2', completed: true }],
    24: [{ type: 'Team Practice', time: '5:00 PM', location: 'Main Gym', completed: false }],
    28: [{ type: 'Game', time: '6:00 PM', location: 'Home vs Eagles', completed: false }]
  };

  // Calendar navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
    setSelectedDay(null);
  };

  // Get days in current month
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get month name
  const getMonthName = () => {
    return currentMonth.toLocaleString('default', { month: 'long' }).toUpperCase();
  };

  // Calendar Day Component
  const CalendarDay = ({ day }: { day: number }) => {
    const hasEvent = calendarEvents[day];
    const isCompleted = hasEvent && hasEvent.some(event => event.completed);
    const isSelected = selectedDay === day;
    
    return (
      <button
        onClick={() => setSelectedDay(selectedDay === day ? null : day)}
        className={`w-8 h-8 flex items-center justify-center text-sm rounded transition-colors relative ${
          isSelected 
            ? 'bg-orange-500 text-white' 
            : hasEvent
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'text-gray-900 hover:bg-gray-100'
        }`}
      >
        {day}
        {hasEvent && (
          <div className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full ${
            isCompleted ? 'bg-green-500' : 'bg-orange-400'
          }`} />
        )}
      </button>
    );
  };

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
          <div className="flex justify-center space-x-8">
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex flex-col items-center space-y-2 p-2 ${
                activeTab === 'activity' ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <TrendingUp className="h-6 w-6" />
              {activeTab === 'activity' && <div className="h-0.5 w-8 bg-orange-500 rounded" />}
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex flex-col items-center space-y-2 p-2 ${
                activeTab === 'video' ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <Play className="h-6 w-6" />
              {activeTab === 'video' && <div className="h-0.5 w-8 bg-orange-500 rounded" />}
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex flex-col items-center space-y-2 p-2 ${
                activeTab === 'team' ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <Shirt className="h-6 w-6" />
              {activeTab === 'team' && <div className="h-0.5 w-8 bg-orange-500 rounded" />}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center space-y-2 p-2 ${
                activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <User className="h-6 w-6" />
              {activeTab === 'profile' && <div className="h-0.5 w-8 bg-orange-500 rounded" />}
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
                  <span className="text-orange-500 text-sm">Recent activity</span>
                  <ChevronRight className="h-4 w-4 text-orange-500" />
                </div>
              </div>

              {/* Activity Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Practices</h3>
                      <div className="text-2xl font-bold text-gray-900">12</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Games</h3>
                      <div className="text-2xl font-bold text-gray-900">8</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Calendar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Activity</h3>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-400 text-sm">View all</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Calendar */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    {/* Month Header */}
                    <div className="flex items-center justify-between mb-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => navigateMonth('prev')}
                      >
                        <ChevronLeft className="h-4 w-4 text-gray-600" />
                      </Button>
                      <h4 className="text-base font-semibold text-gray-900 tracking-wider">{getMonthName()}</h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => navigateMonth('next')}
                      >
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* Week 1 */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(1)}>1</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(2)}>2</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(3)}>
                        3
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(4)}>4</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(5)}>5</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(6)}>6</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(7)}>
                        7
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-400" />
                      </div>
                      
                      {/* Week 2 */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(8)}>8</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(9)}>9</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(10)}>
                        10
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(11)}>11</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(12)}>12</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(13)}>13</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(14)}>
                        14
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                      </div>
                      
                      {/* Week 3 */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(15)}>15</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(16)}>16</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(17)}>
                        17
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-400" />
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(18)}>18</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(19)}>19</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(20)}>20</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(21)}>
                        21
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-green-500" />
                      </div>
                      
                      {/* Week 4 */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(22)}>22</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(23)}>23</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(24)}>
                        24
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-400" />
                      </div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(25)}>25</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(26)}>26</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(27)}>27</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer relative" onClick={() => setSelectedDay(28)}>
                        28
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-400" />
                      </div>
                      
                      {/* Week 5 */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(29)}>29</div>
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-900 hover:bg-gray-100 rounded cursor-pointer" onClick={() => setSelectedDay(30)}>30</div>
                      <div className="w-8 h-8"></div>
                      <div className="w-8 h-8"></div>
                      <div className="w-8 h-8"></div>
                      <div className="w-8 h-8"></div>
                      <div className="w-8 h-8"></div>
                    </div>

                    {/* Selected Day Event Details */}
                    {selectedDay && calendarEvents[selectedDay] && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          {getMonthName().charAt(0) + getMonthName().slice(1).toLowerCase()} {selectedDay}
                        </h5>
                        {calendarEvents[selectedDay].map((event, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h6 className="font-medium text-gray-900">{event.type}</h6>
                                {event.completed && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{event.time} • {event.location}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${skill.rating}%` }}
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

        {/* Bottom Navigation (Mobile App Style) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="flex justify-around py-2">
              <button 
                onClick={() => setActiveTab('activity')}
                className={`flex flex-col items-center p-3 ${activeTab === 'activity' ? 'text-orange-500' : 'text-gray-400'}`}
              >
                <TrendingUp className="h-6 w-6" />
                {activeTab === 'activity' && <div className="h-1 w-8 bg-orange-500 rounded-full mt-1" />}
              </button>
              <button 
                onClick={() => setActiveTab('video')}
                className={`flex flex-col items-center p-3 ${activeTab === 'video' ? 'text-orange-500' : 'text-gray-400'}`}
              >
                <Play className="h-6 w-6" />
                {activeTab === 'video' && <div className="h-1 w-8 bg-orange-500 rounded-full mt-1" />}
              </button>
              <button 
                onClick={() => setActiveTab('team')}
                className={`flex flex-col items-center p-3 ${activeTab === 'team' ? 'text-orange-500' : 'text-gray-400'}`}
              >
                <Users className="h-6 w-6" />
                {activeTab === 'team' && <div className="h-1 w-8 bg-orange-500 rounded-full mt-1" />}
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center p-3 ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'}`}
              >
                <User className="h-6 w-6" />
                {activeTab === 'profile' && <div className="h-1 w-8 bg-orange-500 rounded-full mt-1" />}
              </button>
            </div>
          </div>
        </div>

        {/* Add padding at bottom to account for fixed bottom nav */}
        <div className="h-20"></div>
      </main>
    </div>
  );
}
