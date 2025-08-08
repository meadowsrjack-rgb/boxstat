import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, 
  Calendar as CalendarIcon, 
  CreditCard, 
  Users, 
  CheckCircle, 
  BookOpen,
  UserCheck,
  Megaphone
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";

import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function ParentDashboard({ demoProfile }: { demoProfile?: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Check if we're in demo mode
  const isDemoMode = sessionStorage.getItem('isDemoMode') === 'true' || !!demoProfile;
  const profileData = demoProfile || (isDemoMode ? JSON.parse(sessionStorage.getItem('demoProfile') || '{}') : null);
  
  // Use demo user data if in demo mode - create a user-like object for parent
  const currentUser = isDemoMode ? {
    id: profileData?.id || 'demo-parent-001',
    firstName: profileData?.firstName || 'Sarah',
    lastName: profileData?.lastName || 'Johnson',
    email: profileData?.email || 'sarah.johnson@email.com',
    userType: 'parent',
    profileImageUrl: null
  } : user;

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

  // Demo data for child profiles
  const demoChildProfiles = [
    {
      id: 1,
      firstName: "Emma",
      lastName: "Johnson",
      teamName: "U12 Thunder",
      jerseyNumber: 15,
      position: "Point Guard",
      grade: "6th Grade"
    },
    {
      id: 2,
      firstName: "Jake", 
      lastName: "Johnson",
      teamName: "U10 Lightning",
      jerseyNumber: 8,
      position: "Forward",
      grade: "4th Grade"
    }
  ];

  // Get child profiles (use demo data if in demo mode)
  const { data: childProfiles } = useQuery({
    queryKey: ["/api/child-profiles", user?.id],
    enabled: !!user?.id && !isDemoMode,
  });
  
  const displayChildProfiles = isDemoMode ? demoChildProfiles : childProfiles;

  const { data: userEvents = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id && !isDemoMode,
  });

  const { data: userPayments = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "payments"],
    enabled: !!user?.id && !isDemoMode,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["/api/announcements"],
    enabled: !!user?.id && !isDemoMode,
  });

  if (!currentUser) {
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
              {/* Demo Mode Indicator */}
            {isDemoMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                <span>🎭</span>
                <span>Demo: {currentUser?.firstName || 'Parent'}</span>
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
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        
        {/* Main Action Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Calendar */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100"
            onClick={() => setLocation('/schedule')}
          >
            <CardContent className="p-4 text-center">
              <CalendarIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Calendar</h3>
              <p className="text-xs text-gray-600">Schedule & events</p>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100"
            onClick={() => setLocation('/sportsengine-payment')}
          >
            <CardContent className="p-4 text-center">
              <CreditCard className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Payments</h3>
              <p className="text-xs text-gray-600">Fees & billing</p>
            </CardContent>
          </Card>

          {/* Children */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100"
            onClick={() => setLocation('/manage-children')}
          >
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Children</h3>
              <p className="text-xs text-gray-600">Manage players</p>
            </CardContent>
          </Card>

          {/* Online Programs */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all bg-white border border-gray-100"
            onClick={() => setLocation('/training')}
          >
            <CardContent className="p-4 text-center">
              <BookOpen className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">Online Programs</h3>
              <p className="text-xs text-gray-600">Training content</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Status */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 text-sm">Registration</h4>
                <p className="text-xs text-green-600">Active & Current</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 text-sm">Payments</h4>
                <p className="text-xs text-blue-600">Up to Date</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 text-sm">Players</h4>
                <p className="text-xs text-purple-600">{displayChildProfiles?.length || 0} Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-500" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {Array.isArray(userEvents) && userEvents.length > 0 ? (
              <div className="space-y-3">
                {userEvents.slice(0, 3).map((event: any, index: number) => (
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
                ))}
                <Button 
                  variant="ghost" 
                  className="w-full text-blue-600 hover:text-blue-700 mt-3"
                  onClick={() => setLocation('/schedule')}
                >
                  View Full Calendar →
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Announcements */}
        <Card className="bg-white border border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-500" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {announcements && announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{announcement.title}</h4>
                      <span className="text-xs text-gray-500">
                        {format(new Date(announcement.createdAt), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{announcement.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No announcements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}