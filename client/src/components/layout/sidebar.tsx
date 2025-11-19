import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/utils/logout";
import { 
  Home,
  Calendar,
  Users,
  MessageCircle,
  Trophy,
  CreditCard,
  Settings,
  HelpCircle,
  Volleyball,
  QrCode,
  Dumbbell,
  Bell,
  User
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) {
    return null;
  }

  const isPlayer = user.userType === "player";
  const isParent = user.userType === "parent";
  const isAdmin = user.userType === "admin";

  const parentNavItems = [
    { href: "/", icon: Home, label: "Dashboard", badge: null },
    { href: "/schedule", icon: Calendar, label: "Schedule", badge: null },
    { href: "/team", icon: Users, label: "Team", badge: null },
    { href: "/chat", icon: MessageCircle, label: "Messages", badge: "2" },
    { href: "/settings", icon: Settings, label: "Settings", badge: null },
  ];

  const playerNavItems = [
    { href: "/", icon: Home, label: "Home", badge: null },
    { href: "/checkin", icon: QrCode, label: "Check-In", badge: null },
    { href: "/team", icon: Users, label: "My Team", badge: null },
    { href: "/drills", icon: Dumbbell, label: "Drills", badge: null },
    { href: "/chat", icon: MessageCircle, label: "Team Chat", badge: "2" },
    { href: "/badges", icon: Trophy, label: "My Badges", badge: null },
  ];

  const adminNavItems = [
    { href: "/admin", icon: Settings, label: "Dashboard", badge: null },
    { href: "/admin/users", icon: Users, label: "Users", badge: null },
    { href: "/admin/teams", icon: Volleyball, label: "Teams", badge: null },
    { href: "/admin/events", icon: Calendar, label: "Events", badge: null },
    { href: "/admin/payments", icon: CreditCard, label: "Payments", badge: null },
    { href: "/admin/announcements", icon: Bell, label: "Announcements", badge: null },
  ];

  const getNavItems = () => {
    if (isAdmin) return adminNavItems;
    if (isPlayer) return playerNavItems;
    return parentNavItems;
  };

  const navItems = getNavItems();

  return (
    <div className={`w-64 h-screen ${isPlayer ? 'bg-gradient-to-b from-green-500 to-blue-600' : 'bg-white'} shadow-lg flex flex-col`}>
      {/* Header */}
      <div className={`p-6 border-b ${isPlayer ? 'border-white/20' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 ${isPlayer ? 'bg-white/20' : 'bg-primary'} rounded-full flex items-center justify-center`}>
            <Volleyball className={`h-6 w-6 ${isPlayer ? 'text-white' : 'text-white'}`} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isPlayer ? 'text-white' : 'text-gray-900'}`}>
              BoxStat
            </h1>
            <p className={`text-sm ${isPlayer ? 'text-white/80' : 'text-gray-500'}`}>
              {isAdmin ? 'Admin Panel' : isPlayer ? 'Player Dashboard' : 'Parent Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className={`p-4 border-b ${isPlayer ? 'border-white/20' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <img 
            src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40"} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${isPlayer ? 'text-white' : 'text-gray-900'}`} data-testid="text-sidebar-greeting">
              Hey, {user.firstName}
            </p>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isPlayer ? "secondary" : "outline"} 
                className={`text-xs ${isPlayer ? 'bg-white/20 text-white border-white/30' : ''}`}
              >
                {user.userType}
              </Badge>
              {isPlayer && (
                <div className="flex items-center space-x-1">
                  <Trophy className="h-3 w-3 text-yellow-300" />
                  <span className="text-xs text-yellow-300">5</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start space-x-3 ${
                  isPlayer 
                    ? isActive 
                      ? 'bg-white/20 text-white hover:bg-white/30' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      isPlayer 
                        ? 'bg-red-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t ${isPlayer ? 'border-white/20' : 'border-gray-200'}`}>
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            className={`w-full justify-start space-x-3 ${
              isPlayer 
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className={`w-full justify-start space-x-3 ${
              isPlayer 
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
            onClick={logout}
          >
            <User className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
