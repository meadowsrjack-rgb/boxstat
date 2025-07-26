import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Bell, 
  Calendar as CalendarIcon, 
  CreditCard, 
  Users, 
  CheckCircle, 
  Baby,
  Trophy,
  Mail,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Play,
  BookOpen,
  User,
  Settings,
  UserPlus,
  UserCheck,
  FileText,
  Megaphone
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";


import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function ParentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Get child profiles
  const { data: childProfiles } = useQuery({
    queryKey: ["/api/child-profiles", user?.id],
    enabled: !!user?.id,
  });

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

  const { data: userPayments = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "payments"],
    enabled: !!user?.id,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["/api/announcements"],
    enabled: !!user?.id,
  });



  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src={logoPath} 
                alt="UYP Basketball Academy" 
                className="h-12 w-12 mr-3 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">UYP Basketball</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative" ref={notificationsRef}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </Button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-md shadow-lg border z-50">
                    <div className="p-3 border-b">
                      <h4 className="font-semibold text-sm">Recent Notifications</h4>
                    </div>
                    <div className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Megaphone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">New Announcement</p>
                          <p className="text-xs text-gray-600">Practice schedule updated for next week</p>
                          <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Player Check-in</p>
                          <p className="text-xs text-gray-600">Alex checked in for practice</p>
                          <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Payment Processed</p>
                          <p className="text-xs text-gray-600">Monthly fee payment confirmed</p>
                          <p className="text-xs text-gray-400 mt-1">3 days ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full text-xs">
                        View All Notifications
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <img 
                  src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40"} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setLocation('/profile')}
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⚡</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/schedule')}>
                <CalendarIcon className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">View Schedule</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/payment')}>
                <CreditCard className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Make Payment</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/training')}>
                <Trophy className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Training Programs</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/schedule-requests')}>
                <FileText className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Schedule Requests</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/manage-children')}>
                <UserPlus className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Manage Players</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">My Players</CardTitle>
              <Baby className="h-6 w-6 text-green-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              {childProfiles && Array.isArray(childProfiles) && childProfiles.length > 0 ? (
                childProfiles.map((child: any) => {
                  const childTeam = child.teamName ? `${child.teamAgeGroup} ${child.teamName}` : 'No Team';
                  const childAge = child.dateOfBirth ? 
                    new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear() : 
                    'Unknown';
                  const initials = `${child.firstName?.[0] || ''}${child.lastName?.[0] || ''}`;
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500'];
                  const colorIndex = child.id % colors.length;
                  
                  return (
                    <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 ${colors[colorIndex]} text-white rounded-full flex items-center justify-center text-sm font-bold mr-3`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{child.firstName} {child.lastName}</p>
                          <p className="text-sm text-gray-500">
                            {childTeam} • Age {childAge}
                            {child.jerseyNumber && ` • #${child.jerseyNumber}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            window.location.href = `/?mode=player&childId=${child.id}`;
                          }}
                          className="text-xs"
                        >
                          Switch to {child.firstName}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Baby className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Players Added</h3>
                  <p className="text-gray-500 mb-4">
                    Add your first player profile to get started.
                  </p>
                  <Button onClick={() => setLocation('/manage-children')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Player Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Account Status</CardTitle>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Status</span>
                <Badge className="bg-green-500">Paid</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Forms Completed</span>
                <Badge className="bg-green-500">2/2</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Next Payment</span>
                <span className="text-sm font-medium text-gray-900">Dec 15</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training Programs */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Training Programs</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocation("/training")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Elite Skills Training</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Professional video courses to improve your child's basketball skills
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => setLocation("/training")}
                  >
                    Browse Programs
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-6 w-6 text-green-500" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Training Library</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Access subscribed training content and track progress
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setLocation("/training-library")}
                  >
                    My Library
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Upcoming Events</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setLocation('/schedule')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                View Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(userEvents) && userEvents.length > 0 ? (
                userEvents.slice(0, 5).map((event: any) => {
                  const eventDate = new Date(event.start_time);
                  const isToday = eventDate.toDateString() === new Date().toDateString();
                  const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
                  
                  let dateLabel = format(eventDate, "MMM d");
                  if (isToday) dateLabel = "Today";
                  else if (isTomorrow) dateLabel = "Tomorrow";
                  
                  const eventTypeColors = {
                    practice: "bg-blue-50 border-blue-200",
                    game: "bg-green-50 border-green-200",
                    tournament: "bg-purple-50 border-purple-200",
                    camp: "bg-orange-50 border-orange-200",
                    skills: "bg-yellow-50 border-yellow-200"
                  };
                  
                  const dotColors = {
                    practice: "bg-blue-500",
                    game: "bg-green-500",
                    tournament: "bg-purple-500",
                    camp: "bg-orange-500",
                    skills: "bg-yellow-500"
                  };
                  
                  return (
                    <div key={event.id} className={`flex items-center p-3 rounded-lg border ${eventTypeColors[event.event_type] || 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-2 h-2 rounded-full mr-3 ${dotColors[event.event_type] || 'bg-gray-500'}`}></div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {dateLabel} • {format(eventDate, "h:mm a")} • {event.location}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Alex checked in at practice</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Maya earned "Perfect Attendance" badge</p>
                  <p className="text-xs text-gray-500">Yesterday</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New message from Coach Martinez</p>
                  <p className="text-xs text-gray-500">2 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                SportsEngine Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Total Paid</div>
                  <div className="text-lg font-bold text-green-900">
                    ${userPayments?.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + p.amount, 0) || 0}
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800">Outstanding</div>
                  <div className="text-lg font-bold text-yellow-900">
                    ${userPayments?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + p.amount, 0) || 0}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Quick Pay Options</span>
                  <Button variant="outline" size="sm" onClick={() => setLocation('/payment')}>
                    View All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLocation('/payment/registration')}>
                    Registration
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation('/payment/uniform')}>
                    Uniform
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation('/payment/tournament')}>
                    Tournament
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation('/payment/other')}>
                    Other
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">League Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {announcements?.slice(0, 2).map((announcement: any) => (
                <div key={announcement.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(announcement.createdAt), "MMM d")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{announcement.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>


    </div>
  );
}
