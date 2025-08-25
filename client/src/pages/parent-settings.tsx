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
  | "family"
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
  
  // Get the current tab from URL parameters and sync with state
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get("tab");
      const validTabs: TabKey[] = ["profile", "family", "privacy", "notifications", "security", "connections", "billing", "devices", "legal", "danger"];
      
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
    setLocation(`/parent-settings?tab=${t}`);
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
   Parent Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function ParentSettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useTab();
  const [location, setLocation] = useLocation();

  const sections = [
    { key: "profile", icon: User, label: "Profile", description: "Personal information and preferences" },
    { key: "family", icon: Users, label: "Family Management", description: "Manage children and family members" },
    { key: "privacy", icon: Globe, label: "Privacy", description: "Control your visibility and data sharing" },
    { key: "notifications", icon: Bell, label: "Notifications", description: "Manage alerts and communications" },
    { key: "security", icon: Shield, label: "Account & Security", description: "Password, 2FA, and device management" },
    { key: "connections", icon: LinkIcon, label: "Connections", description: "Connected apps and services" },
    { key: "billing", icon: CreditCard, label: "Billing & Payments", description: "Manage subscriptions and payment methods" },
    { key: "devices", icon: Smartphone, label: "Devices", description: "Trusted devices and app permissions" },
    { key: "legal", icon: FileText, label: "Legal", description: "Terms, privacy policy, and agreements" },
    { key: "danger", icon: AlertTriangle, label: "Danger Zone", description: "Account deletion and irreversible actions" },
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
              onClick={() => setLocation("/parent-dashboard")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Parent Settings</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Manage your account and family preferences</div>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
            <div className="p-6">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => setTab(section.key as TabKey)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                      tab === section.key
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <section.icon className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium">{section.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{section.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {tab === "profile" && <ProfileSection />}
            {tab === "family" && <FamilySection />}
            {tab === "privacy" && <PrivacySection />}
            {tab === "notifications" && <NotificationsSection />}
            {tab === "security" && <SecuritySection />}
            {tab === "connections" && <ConnectionsSection />}
            {tab === "billing" && <BillingSection />}
            {tab === "devices" && <DevicesSection />}
            {tab === "legal" && <LegalSection />}
            {tab === "danger" && <DangerSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Section for Parents
function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: "",
    location: "",
    emergencyContact: "",
    emergencyPhone: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      const response = await fetch(`/api/users/${user?.id}`, {
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
      <SectionHeader icon={User} title="Profile Information" subtitle="Update your personal information and contact details" />

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <Input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <Input
              value={profile.location}
              onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
              placeholder="City, State"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
              <Input
                value={profile.emergencyContact}
                onChange={(e) => setProfile(p => ({ ...p, emergencyContact: e.target.value }))}
                placeholder="Emergency contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
              <Input
                type="tel"
                value={profile.emergencyPhone}
                onChange={(e) => setProfile(p => ({ ...p, emergencyPhone: e.target.value }))}
                placeholder="Emergency contact phone"
              />
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={() => mutation.mutate(profile)} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Family Management Section
function FamilySection() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <SectionHeader icon={Users} title="Family Management" subtitle="Manage your children and family members" />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Child Profiles</h3>
              <p className="text-sm text-gray-500">Manage your children's profiles and permissions</p>
            </div>
            <Button onClick={() => setLocation('/family-management')}>
              Manage Family
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Profile Switching</h3>
              <p className="text-sm text-gray-500">Switch between parent and child profiles</p>
            </div>
            <Button variant="outline" onClick={() => setLocation('/profile-selection')}>
              Switch Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reuse sections from original settings.tsx with appropriate modifications
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
              <h3 className="text-md font-medium">Profile Visibility</h3>
              <p className="text-sm text-gray-500">Allow other parents to find and connect with you</p>
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

// Simplified notification section for parents
function NotificationsSection() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    pushTeamMessages: true,
    pushEventReminders: true,
    pushCheckinWindows: true,
    pushProgramUpdates: true,
    pushPaymentReminders: true,
    pushScheduleChanges: true,
    emailDigest: true,
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
            <ToggleRow label="Check-in/RSVP windows" checked={prefs.pushCheckinWindows} onChange={(v) => setPrefs((p) => ({ ...p, pushCheckinWindows: v }))} />
            <ToggleRow label="Program updates" checked={prefs.pushProgramUpdates} onChange={(v) => setPrefs((p) => ({ ...p, pushProgramUpdates: v }))} />
            <ToggleRow label="Payment reminders" checked={prefs.pushPaymentReminders} onChange={(v) => setPrefs((p) => ({ ...p, pushPaymentReminders: v }))} />
            <ToggleRow label="Schedule changes" checked={prefs.pushScheduleChanges} onChange={(v) => setPrefs((p) => ({ ...p, pushScheduleChanges: v }))} />
          </div>

          <Separator />

          <div>
            <h3 className="text-md font-medium mb-3">Email Preferences</h3>
            <ToggleRow label="Weekly digest email" checked={prefs.emailDigest} onChange={(v) => setPrefs((p) => ({ ...p, emailDigest: v }))} />
          </div>

          <Separator />

          <div>
            <h3 className="text-md font-medium mb-3">General</h3>
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

// Security section for parents
function SecuritySection() {
  const [emailOpen, setEmailOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [twofaOpen, setTwofaOpen] = useState(false);
  const [passcodeOpen, setPasscodeOpen] = useState(false);
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
          <ActionRow icon={Lock} title="Profile Passcode" action={<Button variant="outline" onClick={() => setPasscodeOpen(true)}>Set</Button>} />
          <ActionRow icon={Mail} title="Change email" action={<Button variant="outline" onClick={() => setEmailOpen(true)}>Update</Button>} />
          <ActionRow icon={Key} title="Change password" action={<Button variant="outline" onClick={() => setPwOpen(true)}>Update</Button>} />
          <ActionRow icon={Fingerprint} title="Two-factor authentication (2FA)" action={<Button variant="outline" onClick={() => setTwofaOpen(true)}>Manage</Button>} />
          <ActionRow icon={LogOut} title="Log Out" action={<Button variant="destructive" onClick={handleLogout}>Log Out</Button>} />
          <ActionRow icon={LogOut} title="Sign out of all devices" action={<Button variant="destructive">Sign out all</Button>} />
        </CardContent>
      </Card>
    </div>
  );
}

// Connections section
function ConnectionsSection() {
  const { toast } = useToast();
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(true);

  const connect = async () => {
    try {
      window.location.href = "/api/connections/google/start";
    } catch (e) {
      toast({ title: "Connection failed", description: String(e), variant: "destructive" });
    }
  };

  const disconnect = async () => {
    try {
      const res = await fetch("/api/connections/google/disconnect", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Disconnect failed");
      setGoogleCalendarConnected(false);
      toast({ title: "Disconnected Google Calendar" });
    } catch (e) {
      toast({ title: "Could not disconnect", description: String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={LinkIcon} title="Connections" subtitle="Connect calendars and other services." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Calendar className="h-5 w-5" style={{ color: BRAND }} />
              </div>
              <div>
                <div className="font-medium">Google Calendar</div>
                <div className="text-sm text-gray-500">Sync team schedules and events</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleCalendarConnected && <Badge variant="secondary" className="text-green-700 bg-green-50">Connected</Badge>}
              <Button
                variant={googleCalendarConnected ? "outline" : "default"}
                size="sm"
                onClick={googleCalendarConnected ? disconnect : connect}
              >
                {googleCalendarConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Billing section for parents
function BillingSection() {
  return (
    <div className="space-y-6">
      <SectionHeader icon={CreditCard} title="Billing & Payments" subtitle="Manage subscriptions and payment methods." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Current Plan</h3>
              <p className="text-sm text-gray-500">Parent Premium - $29.99/month</p>
            </div>
            <Button variant="outline">Manage Plan</Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Payment Methods</h3>
              <p className="text-sm text-gray-500">Manage your payment methods and billing</p>
            </div>
            <Button variant="outline">Manage</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Devices section
function DevicesSection() {
  return (
    <div className="space-y-6">
      <SectionHeader icon={Smartphone} title="Devices" subtitle="Trusted devices and app permissions." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium">Current Device</h3>
              <p className="text-sm text-gray-500">Chrome on macOS - Last active now</p>
            </div>
            <Button variant="outline" size="sm">Revoke</Button>
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
              <ExternalLink className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <ExternalLink className="h-4 w-4 mr-2" />
              Data Processing Agreement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Danger zone
function DangerSection() {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <SectionHeader icon={AlertTriangle} title="Danger Zone" subtitle="Account deletion and irreversible actions." />

      <Card className="bg-transparent border-0 shadow-none border-red-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md font-medium text-red-700">Delete Account</h3>
              <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p>This action cannot be undone. All your data will be permanently deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive">Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}