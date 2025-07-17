import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
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
  RotateCcw,
  Settings,
  UserPlus
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { useAppMode } from "@/hooks/useAppMode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoPath from "@assets/UYP Logo nback_1752703900579.png";

export default function ParentDashboard() {
  const { user } = useAuth();
  const { childProfiles, setPlayerMode } = useAppMode();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [, setLocation] = useLocation();
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const { data: userTeam } = useQuery({
    queryKey: ["/api/users", user?.id, "team"],
    enabled: !!user?.id,
  });

  const { data: userEvents } = useQuery({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
  });

  const { data: userPayments } = useQuery({
    queryKey: ["/api/users", user?.id, "payments"],
    enabled: !!user?.id,
  });

  const { data: announcements } = useQuery({
    queryKey: ["/api/announcements"],
    enabled: !!user?.id,
  });

  const handleSwitchToPlayerMode = async () => {
    if (!selectedChild) {
      setError('Please select a child profile');
      return;
    }
    
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    
    try {
      await setPlayerMode(parseInt(selectedChild), pin);
      setShowModeSelector(false);
      setSelectedChild('');
      setPin('');
      setConfirmPin('');
      setError('');
      // Force a page refresh to switch to player mode
      window.location.reload();
    } catch (error) {
      setError('Failed to switch to player mode');
    }
  };

  if (!user) {
    return <div>Loading...</div>;
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
                className="h-10 w-10 mr-3 object-contain"
              />
              <h1 className="text-xl font-bold text-gray-900">UYP Basketball</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowModeSelector(true)}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Switch Mode</span>
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Button>
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
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/team')}>
                <Users className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Team Roster</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/training')}>
                <Trophy className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Training Programs</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation('/manage-children')}>
                <UserPlus className="h-4 w-4 mr-3 text-primary" />
                <span className="text-sm font-medium">Manage Children</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">My Children</CardTitle>
              <Baby className="h-6 w-6 text-green-500" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  A
                </div>
                <div>
                  <p className="font-medium text-gray-900">Alex Johnson</p>
                  <p className="text-sm text-gray-500">Lightning Bolts • Age 10</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  M
                </div>
                <div>
                  <p className="font-medium text-gray-900">Maya Johnson</p>
                  <p className="text-sm text-gray-500">Thunder Stars • Age 8</p>
                </div>
              </div>
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

        {/* Schedule Calendar */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Family Schedule</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-3">
                  {selectedDate ? format(selectedDate, "MMMM yyyy") : "December 2024"}
                </span>
                <Button variant="ghost" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="w-full"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Alex's Events</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Maya's Events</span>
                </div>
                <div className="space-y-2">
                  {userEvents?.slice(0, 3).map((event: any) => (
                    <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.startTime), "MMM d, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
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

      {/* Mode Selector Modal */}
      <Dialog open={showModeSelector} onOpenChange={setShowModeSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Switch to Player Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-select">Select Child Profile</Label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger id="child-select">
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent>
                  {childProfiles?.map((child: any) => (
                    <SelectItem key={child.id} value={child.id.toString()}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="pin">Set 4-digit PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            <div>
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowModeSelector(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSwitchToPlayerMode}
                className="flex-1"
                disabled={!selectedChild || !pin || !confirmPin}
              >
                Switch Mode
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
