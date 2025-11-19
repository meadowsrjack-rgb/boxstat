import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Volleyball, 
  Bell, 
  Settings, 
  LogOut,
  User
} from "lucide-react";
import { Link } from "wouter";

export default function Navbar() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Volleyball className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">BoxStat</h1>
            </div>
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Volleyball className="h-8 w-8 text-primary mr-3" />
                <h1 className="text-xl font-bold text-gray-900">BoxStat</h1>
              </div>
            </Link>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  3
                </span>
              </Button>
              
              {user.userType === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              
              <div className="flex items-center space-x-2">
                <img 
                  src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40"} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">
                    {user.firstName} {user.lastName}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {user.userType}
                  </Badge>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.location.href = '/api/logout'}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
