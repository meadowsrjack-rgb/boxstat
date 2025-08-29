'use client';

import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User as UserType } from "@/../../shared/schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Link as LinkIcon,
  CreditCard,
  Smartphone,
  FileText,
  AlertTriangle,
  LogOut,
  Mail,
  Key,
  Fingerprint,
  Globe,
  Calendar,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Users,
  Lock,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Constants / Options
──────────────────────────────────────────────────────────────────────────────── */
const BRAND = "#d82428";

type TabKey =
  | "profile"
  | "coaching"
  | "privacy"
  | "notifications"
  | "security"
  | "connections"
  | "billing"
  | "devices"
  | "legal"
  | "danger";

/* ──────────────────────────────────────────────────────────────────────────────
   Utilities
──────────────────────────────────────────────────────────────────────────────── */
function useTab(): [TabKey, (t: TabKey) => void] {
  const [loc, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState<TabKey>("profile");
  
  useEffect(() => {
    const hash = loc.split('#')[1];
    if (hash && ['profile', 'coaching', 'privacy', 'notifications', 'security', 'connections', 'billing', 'devices', 'legal', 'danger'].includes(hash)) {
      setCurrentTab(hash as TabKey);
    }
  }, [loc]);

  const changeTab = (newTab: TabKey) => {
    setCurrentTab(newTab);
    setLocation(`/coach-settings#${newTab}`);
  };

  return [currentTab, changeTab];
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────────────────────────── */
export default function CoachSettingsPage() {
  const { user, logout } = useAuth();
  const currentUser = user as UserType | null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentTab, setCurrentTab] = useTab();

  // Switch Profile Dialog
  const [switchProfileOpen, setSwitchProfileOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");

  const { data: childProfiles = [] } = useQuery({
    queryKey: [`/api/child-profiles/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const switchProfileMutation = useMutation({
    mutationFn: async ({ targetUserId, passcode }: { targetUserId: string; passcode?: string }) => {
      const response = await fetch(`/api/auth/switch-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId, passcode }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to switch profile');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile switched successfully",
        description: "Redirecting to new dashboard...",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to switch profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSwitchProfile = async (targetUserId: string) => {
    try {
      const targetProfile = childProfiles.find(p => p.id === targetUserId);
      
      if (targetProfile?.passcode) {
        setSwitchProfileOpen(true);
        setPasscodeInput("");
        return;
      }
      
      await switchProfileMutation.mutateAsync({ targetUserId });
    } catch (error) {
      console.error("Switch profile error:", error);
    }
  };

  const confirmSwitchProfile = async () => {
    const targetProfile = childProfiles.find(p => p.passcode);
    if (!targetProfile) return;
    
    try {
      await switchProfileMutation.mutateAsync({ 
        targetUserId: targetProfile.id, 
        passcode: passcodeInput 
      });
      setSwitchProfileOpen(false);
    } catch (error) {
      console.error("Passcode verification failed:", error);
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => setLocation('/coach-dashboard')}
                className="mr-4"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Coach Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {currentUser.firstName} {currentUser.lastName}
              </div>
              <Badge variant="secondary" style={{ backgroundColor: BRAND, color: "white" }}>
                Coach
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <nav className="space-y-1">
                {[
                  { key: "profile", label: "Profile", icon: User },
                  { key: "coaching", label: "Coaching Info", icon: Users },
                  { key: "privacy", label: "Privacy", icon: Shield },
                  { key: "notifications", label: "Notifications", icon: Bell },
                  { key: "security", label: "Security", icon: Key },
                  { key: "connections", label: "Connections", icon: LinkIcon },
                  { key: "billing", label: "Billing", icon: CreditCard },
                  { key: "devices", label: "Devices", icon: Smartphone },
                  { key: "legal", label: "Legal", icon: FileText },
                  { key: "danger", label: "Account Actions", icon: AlertTriangle },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setCurrentTab(key as TabKey)}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentTab === key
                        ? "bg-red-100 text-red-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid={`tab-${key}`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 md:col-span-9">
            <div className="space-y-6">
              {currentTab === "profile" && <ProfileTab user={currentUser} />}
              {currentTab === "coaching" && <CoachingTab user={currentUser} />}
              {currentTab === "privacy" && <PrivacyTab user={currentUser} />}
              {currentTab === "notifications" && <NotificationsTab user={currentUser} />}
              {currentTab === "security" && <SecurityTab user={currentUser} />}
              {currentTab === "connections" && <ConnectionsTab user={currentUser} />}
              {currentTab === "billing" && <BillingTab user={currentUser} />}
              {currentTab === "devices" && <DevicesTab user={currentUser} />}
              {currentTab === "legal" && <LegalTab user={currentUser} />}
              {currentTab === "danger" && (
                <DangerTab 
                  user={currentUser} 
                  childProfiles={childProfiles}
                  onSwitchProfile={handleSwitchProfile}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Switch Profile Dialog */}
      <Dialog open={switchProfileOpen} onOpenChange={setSwitchProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Passcode</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Please enter the 4-digit passcode to switch to this profile.
            </p>
            <Input
              type="password"
              placeholder="Enter 4-digit passcode"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              maxLength={4}
              className="text-center text-xl tracking-widest"
              data-testid="input-passcode"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwitchProfileOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSwitchProfile}
              disabled={passcodeInput.length !== 4 || switchProfileMutation.isPending}
              data-testid="button-confirm-switch"
            >
              {switchProfileMutation.isPending ? "Switching..." : "Switch Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Tab Components
──────────────────────────────────────────────────────────────────────────────── */

function ProfileTab({ user }: { user: UserType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phoneNumber: (user as any)?.phoneNumber || "",
    bio: (user as any)?.bio || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      const response = await fetch(`/api/users/${user?.id}/profile`, {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5" />
          Coach Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            <Input
              value={profile.firstName}
              onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Last Name</label>
            <Input
              value={profile.lastName}
              onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))}
              placeholder="Enter last name"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input value={user.email} readOnly />
        </div>
        <div>
          <label className="text-sm font-medium">Phone Number</label>
          <Input
            value={profile.phoneNumber}
            onChange={(e) => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
            placeholder="Enter phone number"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Bio</label>
          <Input
            value={profile.bio}
            onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
            placeholder="Tell players and parents about your coaching experience"
          />
        </div>
        <Button 
          onClick={() => mutation.mutate(profile)}
          disabled={mutation.isPending}
          className="bg-red-600 hover:bg-red-700"
        >
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CoachingTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Coaching Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Experience Level</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner (0-2 years)</SelectItem>
              <SelectItem value="intermediate">Intermediate (3-5 years)</SelectItem>
              <SelectItem value="advanced">Advanced (6+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Preferred Age Groups</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select age groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="9u">9U</SelectItem>
              <SelectItem value="10u">10U</SelectItem>
              <SelectItem value="12u">12U</SelectItem>
              <SelectItem value="14u">14U</SelectItem>
              <SelectItem value="high-school">High School</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Certifications</label>
          <Input placeholder="e.g., USA Basketball Youth License" />
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacyTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="mr-2 h-5 w-5" />
          Privacy Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Profile Visibility</label>
            <p className="text-xs text-gray-600">Allow other coaches to find you</p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Team Directory</label>
            <p className="text-xs text-gray-600">Show in team directory</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsTab({ user }: { user: UserType }) {
  const [notifications, setNotifications] = useState({
    practiceReminders: true,
    gameReminders: true,
    playerUpdates: true,
    parentMessages: true,
    adminAnnouncements: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Practice Reminders</label>
            <p className="text-xs text-gray-600">Get notified before practices</p>
          </div>
          <Switch 
            checked={notifications.practiceReminders}
            onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, practiceReminders: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Game Reminders</label>
            <p className="text-xs text-gray-600">Get notified before games</p>
          </div>
          <Switch 
            checked={notifications.gameReminders}
            onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, gameReminders: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Player Updates</label>
            <p className="text-xs text-gray-600">Notifications about player progress</p>
          </div>
          <Switch 
            checked={notifications.playerUpdates}
            onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, playerUpdates: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Parent Messages</label>
            <p className="text-xs text-gray-600">New messages from parents</p>
          </div>
          <Switch 
            checked={notifications.parentMessages}
            onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, parentMessages: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Admin Announcements</label>
            <p className="text-xs text-gray-600">Important league announcements</p>
          </div>
          <Switch 
            checked={notifications.adminAnnouncements}
            onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, adminAnnouncements: checked }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="mr-2 h-5 w-5" />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Two-Factor Authentication</label>
            <p className="text-xs text-gray-600">Add extra security to your account</p>
          </div>
          <Button variant="outline" size="sm">
            Enable 2FA
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Password</label>
            <p className="text-xs text-gray-600">Change your password</p>
          </div>
          <Button variant="outline" size="sm">
            Update
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectionsTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <LinkIcon className="mr-2 h-5 w-5" />
          Connected Apps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          No connected applications yet.
        </div>
      </CardContent>
    </Card>
  );
}

function BillingTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Billing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Billing is managed by UYP Basketball administration.
        </div>
      </CardContent>
    </Card>
  );
}

function DevicesTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="mr-2 h-5 w-5" />
          Devices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Manage your logged-in devices.
        </div>
      </CardContent>
    </Card>
  );
}

function LegalTab({ user }: { user: UserType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Legal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button variant="link" className="p-0 h-auto">
            Terms of Service
          </Button>
          <br />
          <Button variant="link" className="p-0 h-auto">
            Privacy Policy
          </Button>
          <br />
          <Button variant="link" className="p-0 h-auto">
            Cookie Policy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DangerTab({ 
  user, 
  childProfiles, 
  onSwitchProfile 
}: { 
  user: UserType; 
  childProfiles: any[];
  onSwitchProfile: (userId: string) => void;
}) {
  const { logout } = useAuth();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-red-600">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Account Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Switch Profile Section */}
        {childProfiles.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Switch Profile</h3>
            <div className="space-y-2">
              {childProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">{profile.firstName} {profile.lastName}</div>
                    <div className="text-sm text-gray-500">{profile.userType}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSwitchProfile(profile.id)}
                    data-testid={`button-switch-${profile.id}`}
                  >
                    Switch
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Logout Section */}
        <div>
          <h3 className="text-lg font-medium mb-2">Sign Out</h3>
          <p className="text-sm text-gray-600 mb-4">
            Sign out of your account on this device.
          </p>
          <Button
            variant="outline"
            onClick={() => logout()}
            className="text-red-600 border-red-600 hover:bg-red-50"
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}