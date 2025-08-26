import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Smartphone,
  FileText,
  Palette,
  Moon,
  Sun,
} from "lucide-react";

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center mt-1">
        <Icon className="w-4 h-4 text-red-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

// Coach Profile Section
function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    phoneNumber: (user as any)?.phoneNumber || "",
    bio: (user as any)?.bio || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      const response = await fetch(`/api/users/${(user as any)?.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={User} title="Coach Profile" subtitle="Update your coaching information and contact details" />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <Input
                value={profile.firstName}
                onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <Input
                value={profile.lastName}
                onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              value={profile.phoneNumber}
              onChange={(e) => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <Input
              value={profile.bio}
              onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
              placeholder="Tell players and parents about your coaching experience"
            />
          </div>

          <Button 
            onClick={() => mutation.mutate(profile)}
            disabled={mutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Notifications Section
function NotificationsSection() {
  const [notifications, setNotifications] = useState({
    practiceReminders: true,
    gameReminders: true,
    playerUpdates: true,
    parentMessages: true,
    adminAnnouncements: true,
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={Bell} title="Notifications" subtitle="Manage your coaching notification preferences" />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Practice Reminders</span>
              <p className="text-xs text-gray-500">Get notified before practices</p>
            </div>
            <Switch 
              checked={notifications.practiceReminders}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, practiceReminders: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Game Reminders</span>
              <p className="text-xs text-gray-500">Get notified before games</p>
            </div>
            <Switch 
              checked={notifications.gameReminders}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, gameReminders: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Player Updates</span>
              <p className="text-xs text-gray-500">Notifications about player progress</p>
            </div>
            <Switch 
              checked={notifications.playerUpdates}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, playerUpdates: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Parent Messages</span>
              <p className="text-xs text-gray-500">New messages from parents</p>
            </div>
            <Switch 
              checked={notifications.parentMessages}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, parentMessages: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Admin Announcements</span>
              <p className="text-xs text-gray-500">Important league announcements</p>
            </div>
            <Switch 
              checked={notifications.adminAnnouncements}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, adminAnnouncements: checked }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Privacy Section
function PrivacySection() {
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    contactInfoVisible: false,
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={Shield} title="Privacy" subtitle="Control your privacy and visibility settings" />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Profile Visible</span>
              <p className="text-xs text-gray-500">Allow parents to view your coaching profile</p>
            </div>
            <Switch 
              checked={privacy.profileVisible}
              onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, profileVisible: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Contact Info Visible</span>
              <p className="text-xs text-gray-500">Show phone number to team parents</p>
            </div>
            <Switch 
              checked={privacy.contactInfoVisible}
              onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, contactInfoVisible: checked }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CoachSettings() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "privacy">("profile");

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/coach-dashboard")}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Coach Settings</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="space-y-6">
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "notifications" && <NotificationsSection />}
          {activeTab === "privacy" && <PrivacySection />}
        </div>
      </div>
    </div>
  );
}