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
  Smartphone,
  FileText,
  AlertTriangle,
  LogOut,
  Mail,
  Key,
  Fingerprint,
  Globe,
  Users,
  Lock,
  MapPin,
  Trophy,
  Copy,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Constants / Options
──────────────────────────────────────────────────────────────────────────────── */
const BRAND = "#d82428";

const TEAM_OPTIONS = ["High School Elite", "High School Red", "High School Black", "Youth Girls", "14U Black", "14U Red", "14U White", "12U Black", "12U Red", "12U White", "10U Black", "10U Red"];
const AGE_OPTIONS = ["9", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
const HEIGHT_OPTIONS = [
  "4'4\"", "4'5\"", "4'6\"", "4'7\"", "4'8\"", "4'9\"", "4'10\"", "4'11\"",
  "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
  "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"", "6'7\"", "6'8\"", "6'9\"", "6'10\"",
];
const POSITION_OPTIONS = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
const JERSEY_OPTIONS = Array.from({ length: 99 }, (_, i) => (i + 1).toString());

type TabKey =
  | "profile"
  | "privacy"
  | "notifications"
  | "security"
  | "devices"
  | "legal";

/* ──────────────────────────────────────────────────────────────────────────────
   Utilities
──────────────────────────────────────────────────────────────────────────────── */
function useTab(): [TabKey, (t: TabKey) => void] {
  const [loc, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState<TabKey>("profile");
  
  // Get the current tab from URL parameters and sync with state
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get("tab");
      const validTabs: TabKey[] = ["profile", "privacy", "notifications", "security", "devices", "legal"];
      
      if (tabParam && validTabs.includes(tabParam as TabKey)) {
        setCurrentTab(tabParam as TabKey);
      } else {
        setCurrentTab("profile");
      }
    } catch {
      setCurrentTab("profile");
    }
  }, [loc]);

  const go = (t: TabKey) => {
    setCurrentTab(t);
    setLocation(`/player-settings?tab=${t}`);
  };
  
  return [currentTab, go];
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "#fee2e2" }}>
        <Icon className="h-5 w-5" style={{ color: BRAND }} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Player Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function PlayerSettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useTab();
  const [location, setLocation] = useLocation();

  const sections = [
    { key: "profile", icon: User, label: "Player Profile", description: "Basketball info and personal details" },

    { key: "privacy", icon: Globe, label: "Privacy", description: "Control your visibility and data sharing" },
    { key: "notifications", icon: Bell, label: "Notifications", description: "Manage alerts and communications" },
    { key: "security", icon: Shield, label: "Account & Security", description: "Password and device management" },
    { key: "devices", icon: Smartphone, label: "Devices", description: "Trusted devices and app permissions" },
    { key: "legal", icon: FileText, label: "Legal", description: "Terms, privacy policy, and agreements" },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Player Settings</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Manage your profile and preferences</div>
            </div>
          </div>
        </div>

        {/* Horizontal Tabs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {sections.map((section) => (
                <button
                  key={section.key}
                  onClick={() => setTab(section.key as TabKey)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-lg whitespace-nowrap transition-all border-b-2 ${
                    tab === section.key
                      ? "bg-red-50 text-red-700 border-red-500 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent"
                  }`}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-4xl mx-auto">
          {tab === "profile" && <ProfileSection />}
          {tab === "privacy" && <PrivacySection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "security" && <SecuritySection />}
          {tab === "devices" && <DevicesSection />}
          {tab === "legal" && <LegalSection />}
        </div>
      </div>
    </div>
  );
}

// Player Profile Section
function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current team data to display (read-only)
  const { data: teamData } = useQuery({
    queryKey: [`/api/users/${(user as any)?.id}/team`],
    enabled: !!(user as any)?.id
  });

  const [profile, setProfile] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    position: (user as any)?.position || "",
    jerseyNumber: (user as any)?.jerseyNumber || "",
    city: (user as any)?.city || (user as any)?.address || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      // Send both city and address fields to ensure compatibility
      const updateData = {
        ...data,
        address: data.city, // Also update address field for dashboard compatibility
      };
      
      const response = await fetch(`/api/users/${(user as any)?.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update local profile state with server response
      setProfile({
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        position: updatedUser.position || "",
        jerseyNumber: updatedUser.jerseyNumber || "",
        city: updatedUser.city || updatedUser.address || "",
      });
      
      // Invalidate queries to refresh all user data across the app
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${(user as any)?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${(user as any)?.id}/team`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${(user as any)?.id}/awards`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${(user as any)?.id}/events`] });
      
      toast({ 
        title: "Profile Updated", 
        description: "Your player profile has been successfully updated."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Profile", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={User} title="Player Profile" subtitle="Update your basketball information and personal details" />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <Input
                    value={profile.firstName}
                    onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <Input
                    value={profile.lastName}
                    onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">City (From)</label>
                <Input
                  value={profile.city}
                  onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                  placeholder="Enter your city"
                  className="max-w-md"
                  data-testid="input-city"
                />
              </div>
            </div>

            {/* Basketball Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basketball Information</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Team</label>
                <Input
                  value={(teamData as any)?.name || "No team assigned"}
                  disabled
                  className="bg-gray-100 text-gray-500 cursor-not-allowed max-w-md"
                  placeholder="Team will be assigned when you join"
                  data-testid="input-team"
                />
                <p className="text-xs text-gray-500">Team is set when you request to join a team</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <Select value={profile.position} onValueChange={(value) => setProfile(p => ({ ...p, position: value }))}>
                    <SelectTrigger data-testid="select-position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((position) => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Jersey Number</label>
                  <Select value={profile.jerseyNumber} onValueChange={(value) => setProfile(p => ({ ...p, jerseyNumber: value }))}>
                    <SelectTrigger data-testid="select-jersey">
                      <SelectValue placeholder="Select number" />
                    </SelectTrigger>
                    <SelectContent>
                      {JERSEY_OPTIONS.map((number) => (
                        <SelectItem key={number} value={number}>#{number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t">
              <Button 
                onClick={() => mutation.mutate(profile)} 
                disabled={mutation.isPending}
                className="px-8"
                data-testid="button-save-profile"
              >
                {mutation.isPending ? "Saving Changes..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



// Privacy section for players
function PrivacySection() {
  const { toast } = useToast();
  const [searchable, setSearchable] = useState(true);

  const mutation = useMutation({
    mutationFn: async (settings: { searchable: boolean }) => {
      const response = await fetch("/api/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings }),
      });
      if (!response.ok) throw new Error("Failed to update privacy settings");
      return response.json();
    },
    onSuccess: () => toast({ title: "Privacy settings updated" }),
    onError: () => toast({ title: "Failed to update privacy settings", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={Globe} title="Privacy Settings" subtitle="Control your visibility and data sharing" />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Player Profile Visibility</h3>
              <p className="text-sm text-gray-500">Allow other players and coaches to find your profile</p>
            </div>
            <Switch
              checked={searchable}
              onCheckedChange={(checked) => {
                setSearchable(checked);
                mutation.mutate({ searchable: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified notification section for players
function NotificationsSection() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    pushTeamMessages: true,
    pushEventReminders: true,
    pushCheckinWindows: true,
    pushTrainingReminders: true,

    quietHours: true,
  });

  const mutate = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(prefs),
      });
      if (!response.ok) throw new Error("Failed to save preferences");
      return response.json();
    },
    onSuccess: () => toast({ title: "Notification settings saved" }),
    onError: () => toast({ title: "Failed to save notification settings", variant: "destructive" }),
  });

  const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader icon={Bell} title="Notifications" subtitle="Choose how you want to be notified." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-md font-medium mb-3">Push Notifications</h3>
            <ToggleRow label="Team messages" checked={prefs.pushTeamMessages} onChange={(v) => setPrefs((p) => ({ ...p, pushTeamMessages: v }))} />
            <ToggleRow label="Event reminders" checked={prefs.pushEventReminders} onChange={(v) => setPrefs((p) => ({ ...p, pushEventReminders: v }))} />
            <ToggleRow label="Check-in windows" checked={prefs.pushCheckinWindows} onChange={(v) => setPrefs((p) => ({ ...p, pushCheckinWindows: v }))} />
            <ToggleRow label="Training reminders" checked={prefs.pushTrainingReminders} onChange={(v) => setPrefs((p) => ({ ...p, pushTrainingReminders: v }))} />

          </div>

          <Separator />

          <div>
            <h3 className="text-md font-medium mb-3">Preferences</h3>
            <ToggleRow label="Quiet hours (10pm–7am)" checked={prefs.quietHours} onChange={(v) => setPrefs((p) => ({ ...p, quietHours: v }))} />
          </div>

          <div className="pt-2">
            <Button onClick={() => mutate.mutate()} disabled={mutate.isPending}>
              {mutate.isPending ? "Saving..." : "Save Notification Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Security section for players
function SecuritySection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailOpen, setEmailOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleSwitchProfile = () => {
    setLocation('/profile-selection');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'GET', 
        credentials: 'include' 
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const ActionRow = ({ icon: Icon, title, action }: { icon: any; title: string; action: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-500" />
        <span className="text-sm text-gray-700">{title}</span>
      </div>
      {action}
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader icon={Shield} title="Account & Security" subtitle="Manage login and security." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <ActionRow icon={Users} title="Switch Profile" action={<Button variant="outline" onClick={handleSwitchProfile}>Switch</Button>} />
          <ActionRow icon={Mail} title="Change email" action={<Button variant="outline" onClick={() => setEmailOpen(true)}>Update</Button>} />
          <ActionRow icon={Key} title="Change password" action={<Button variant="outline" onClick={() => setPwOpen(true)}>Update</Button>} />
          <ActionRow icon={LogOut} title="Log Out" action={<Button variant="destructive" onClick={handleLogout}>Log Out</Button>} />
        </CardContent>
      </Card>

    </div>
  );
}

// Devices section
function DevicesSection() {
  const { toast } = useToast();
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied' | 'testing'>('unknown');
  const [isTestingLocation, setIsTestingLocation] = useState(false);

  // Check location permission status on component mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'granted' | 'denied');
      }).catch(() => {
        setLocationPermission('unknown');
      });
    }
  }, []);

  const testLocation = async () => {
    setIsTestingLocation(true);
    setLocationPermission('testing');
    
    try {
      const timeoutId = setTimeout(() => {
        setIsTestingLocation(false);
        setLocationPermission('denied');
        toast({
          title: 'Location Test Failed',
          description: 'Location request timed out. Please enable location access in your browser.',
          variant: 'destructive',
        });
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          setIsTestingLocation(false);
          setLocationPermission('granted');
          toast({
            title: 'Location Access Working!',
            description: `Your location was detected successfully. Check-in will work properly.`,
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          setIsTestingLocation(false);
          setLocationPermission('denied');
          let errorMessage = 'Location access was denied or failed.';
          
          if (error.code === 1) {
            errorMessage = 'Location access denied. Please enable location permissions for this website.';
          } else if (error.code === 2) {
            errorMessage = 'Location unavailable. Please ensure GPS is enabled on your device.';
          } else if (error.code === 3) {
            errorMessage = 'Location request timed out. Please try again.';
          }
          
          toast({
            title: 'Location Test Failed',
            description: errorMessage,
            variant: 'destructive',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 9000,
          maximumAge: 30000
        }
      );
    } catch (error) {
      setIsTestingLocation(false);
      setLocationPermission('denied');
      toast({
        title: 'Location Not Supported',
        description: 'Your browser does not support location services.',
        variant: 'destructive',
      });
    }
  };

  const getLocationStatusColor = () => {
    switch (locationPermission) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      case 'testing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getLocationStatusText = () => {
    switch (locationPermission) {
      case 'granted': return 'Enabled ✓';
      case 'denied': return 'Denied ✗';
      case 'testing': return 'Testing...';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={Smartphone} title="Devices & Permissions" subtitle="Manage device access and app permissions for check-ins." />

      {/* Location Permissions Section */}
      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-md font-medium mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Location Access for Check-ins
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">Location Permission Status</h4>
                  <p className="text-sm text-gray-500">Required for gym check-ins and attendance tracking</p>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${getLocationStatusColor()}`}>
                    {getLocationStatusText()}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testLocation}
                    disabled={isTestingLocation}
                    className="mt-2"
                  >
                    {isTestingLocation ? 'Testing...' : 'Test Location'}
                  </Button>
                </div>
              </div>

              {locationPermission === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Location Access Required</h4>
                  <p className="text-sm text-red-700 mb-3">
                    To use the check-in feature at events, you need to enable location access. Here's how:
                  </p>
                  <div className="text-sm text-red-700 space-y-1">
                    <p><strong>Chrome/Edge:</strong> Click the location icon in the address bar → Allow</p>
                    <p><strong>Firefox:</strong> Click the shield icon → Enable Location</p>
                    <p><strong>Safari:</strong> Safari → Settings → Websites → Location → Allow</p>
                    <p><strong>Mobile:</strong> Go to browser settings → Site permissions → Location → Allow</p>
                  </div>
                </div>
              )}

              {locationPermission === 'granted' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Location Access Enabled ✓</h4>
                  <p className="text-sm text-green-700">
                    Perfect! You can now use the check-in feature at events. The system will automatically detect when you're within 200 meters of the gym and enable check-in 30 minutes before events start.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Current Device */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Current Device</h3>
              <p className="text-sm text-gray-500">This browser session - Last active now</p>
            </div>
            <Badge variant="outline">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Legal section
function LegalSection() {
  return (
    <div className="space-y-6">
      <SectionHeader icon={FileText} title="Legal" subtitle="Terms, privacy policy, and agreements." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Youth Sports Guidelines
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}