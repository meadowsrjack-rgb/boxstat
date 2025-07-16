import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  MessageCircle, 
  Trophy,
  CreditCard,
  Bell,
  Settings,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");

  const { data: announcements } = useQuery({
    queryKey: ["/api/announcements"],
    enabled: !!user?.id,
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: any) => {
      await apiRequest("POST", "/api/announcements", announcementData);
    },
    onSuccess: () => {
      setAnnouncementTitle("");
      setAnnouncementContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    createAnnouncementMutation.mutate({
      title: announcementTitle,
      content: announcementContent,
      priority: "medium",
    });
  };

  if (!user || user.userType !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
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
              <Settings className="h-6 w-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-1" />
                Notifications
              </Button>
              <div className="flex items-center space-x-2">
                <img 
                  src={user.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=40&h=40"} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Teams</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Events This Month</p>
                  <p className="text-2xl font-bold text-gray-900">28</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">$24,500</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Create Announcement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Announcement title"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
              <Textarea
                placeholder="Announcement content..."
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                rows={4}
              />
              <div className="flex space-x-2">
                <Button 
                  onClick={handleCreateAnnouncement}
                  disabled={createAnnouncementMutation.isPending}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Announcement
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Send Push Notification
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Event
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                View Payments
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Announcements</CardTitle>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcements?.slice(0, 5).map((announcement: any) => (
                <div key={announcement.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                    <p className="text-xs text-gray-500">
                      Created {new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {(!announcements || announcements.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No announcements yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
