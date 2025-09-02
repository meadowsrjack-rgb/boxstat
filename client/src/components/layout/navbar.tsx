import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Basketball, 
  Bell, 
  Settings, 
  LogOut,
  User,
  ChevronDown,
  Shield
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Basketball className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">UYP Basketball</h1>
            </div>
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const getNotificationCount = () => {
    if (!user) return 0;

    // Mock notification counts based on user type
    switch (user.userType) {
      case 'player':
        return 2; // New drills, team updates
      case 'parent':
        return 3; // Schedule changes, payments due
      case 'coach':
        return 1; // Player requests
      case 'admin':
        return 5; // System alerts, user requests
      default:
        return 0;
    }
  };

  const notificationCount = getNotificationCount();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Basketball className="h-8 w-8 text-primary mr-3" />
                <h1 className="text-xl font-bold text-gray-900">UYP Basketball</h1>
              </div>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>

              {/* Admin Settings */}
              {user.userType === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="icon">
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
              )}

              {/* User Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2">
                    <img 
                      src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40"} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-gray-700">
                        {user.firstName} {user.lastName}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {user.userType}
                      </Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute top-16 right-4 w-80 bg-white shadow-lg border rounded-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Notifications</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
              ×
            </Button>
          </div>
          <div className="space-y-2">
            {notificationCount === 0 ? (
              <p className="text-gray-500 text-sm">No new notifications</p>
            ) : (
              <>
                {user?.userType === 'player' && (
                  <>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-sm">New drill available: Advanced Dribbling</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-sm">Team practice moved to 6:00 PM</p>
                    </div>
                  </>
                )}
                {user?.userType === 'parent' && (
                  <>
                    <div className="p-2 bg-yellow-50 rounded">
                      <p className="text-sm">Payment due: Tournament registration</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-sm">New team announcement posted</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <p className="text-sm">Schedule updated for next week</p>
                    </div>
                  </>
                )}
                {user?.userType === 'admin' && (
                  <>
                    <div className="p-2 bg-red-50 rounded">
                      <p className="text-sm">New user registration request</p>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                      <p className="text-sm">Payment system maintenance scheduled</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-sm">Coach evaluation due for Team A</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
