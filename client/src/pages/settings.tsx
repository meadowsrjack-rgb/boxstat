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
import { BrowserPushNotificationButton } from "@/components/BrowserPushNotificationButton";

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
      const validTabs: TabKey[] = ["profile", "privacy", "notifications", "security", "connections", "billing", "devices", "legal", "danger"];
      
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
    setLocation(`/settings?tab=${t}`);
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
   City Typeahead (lightweight)
──────────────────────────────────────────────────────────────────────────────── */
function CityTypeahead({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value || "");
  return (
    <div className="relative">
      <Input
        placeholder="City"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Dialogs
──────────────────────────────────────────────────────────────────────────────── */
function ChangeEmailDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState((user as UserType)?.email || "");

  const mutate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/account/change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to change email");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email updated", description: "Please verify your new email." });
      queryClient.invalidateQueries({ queryKey: ["/api/users", (user as UserType)?.id] });
      onOpenChange(false);
    },
    onError: (e) => toast({ title: "Could not update email", description: String(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <p className="text-xs text-gray-500">We’ll send a verification link to your new address.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutate.mutate()} disabled={mutate.isPending}>
            {mutate.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutate = useMutation({
    mutationFn: async () => {
      if (next !== confirm) throw new Error("Passwords do not match");
      const res = await fetch(`/api/account/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ current, next }),
      });
      if (!res.ok) throw new Error("Failed to change password");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed." });
      onOpenChange(false);
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (e) => toast({ title: "Could not change password", description: String(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} />
          <Input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutate.mutate()} disabled={mutate.isPending}>
            {mutate.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TwoFADialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const mutate = useMutation({
    mutationFn: async (enable: boolean) => {
      const res = await fetch(`/api/account/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enable }),
      });
      if (!res.ok) throw new Error("Failed to update 2FA");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Two-factor updated" });
      onOpenChange(false);
    },
    onError: (e) => toast({ title: "Could not update 2FA", description: String(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add an extra layer of security to your account. Use an authenticator app to generate one-time codes.
          </p>
          <div className="flex items-center justify-between rounded-lg p-3">
            <div>
              <div className="text-sm font-medium">Enable 2FA</div>
              <div className="text-xs text-gray-500">Use an authenticator app (TOTP)</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => mutate.mutate(enabled)}>{enabled ? "Enable" : "Disable"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasscodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [hasPasscode, setHasPasscode] = useState(false);

  // Check if user already has a passcode
  useEffect(() => {
    if (user && (user as UserType)?.passcode) {
      setHasPasscode(true);
    }
  }, [user]);

  const handleInputChange = (value: string, setter: (val: string) => void) => {
    // Only allow digits and limit to 4 characters
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setter(digits);
  };

  const mutate = useMutation({
    mutationFn: async () => {
      if (passcode.length !== 4) {
        throw new Error("Passcode must be 4 digits");
      }
      if (passcode !== confirmPasscode) {
        throw new Error("Passcodes do not match");
      }
      
      const res = await fetch(`/api/users/${(user as UserType)?.id}/passcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) throw new Error("Failed to set passcode");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Passcode set", description: "Your 4-digit passcode has been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setPasscode("");
      setConfirmPasscode("");
      setHasPasscode(true);
      onOpenChange(false);
    },
    onError: (e) => toast({ title: "Could not set passcode", description: String(e), variant: "destructive" }),
  });

  const removePasscode = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${(user as UserType)?.id}/passcode`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove passcode");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Passcode removed", description: "Your passcode has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setHasPasscode(false);
      onOpenChange(false);
    },
    onError: (e) => toast({ title: "Could not remove passcode", description: String(e), variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile Passcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {hasPasscode 
              ? "You have a passcode set for profile switching. You can update it or remove it."
              : "Set a 4-digit passcode to secure profile switching. You'll need to enter this code when switching between profiles."
            }
          </p>
          
          {!hasPasscode && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Passcode</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 4 digits"
                  value={passcode}
                  onChange={(e) => handleInputChange(e.target.value, setPasscode)}
                  maxLength={4}
                  data-testid="input-passcode"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Passcode</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter 4 digits again"
                  value={confirmPasscode}
                  onChange={(e) => handleInputChange(e.target.value, setConfirmPasscode)}
                  maxLength={4}
                  data-testid="input-confirm-passcode"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {hasPasscode ? (
            <Button 
              variant="destructive" 
              onClick={() => removePasscode.mutate()}
              disabled={removePasscode.isPending}
              data-testid="button-remove-passcode"
            >
              {removePasscode.isPending ? "Removing..." : "Remove Passcode"}
            </Button>
          ) : (
            <Button 
              onClick={() => mutate.mutate()} 
              disabled={mutate.isPending || passcode.length !== 4 || confirmPasscode.length !== 4}
              data-testid="button-set-passcode"
            >
              {mutate.isPending ? "Setting..." : "Set Passcode"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Sections
──────────────────────────────────────────────────────────────────────────────── */
function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch the active profile data
  const { data: activeProfile } = useQuery({
    queryKey: [`/api/profile/${(user as UserType)?.activeProfileId}`],
    enabled: !!(user as UserType)?.activeProfileId,
  });

  const [editableProfile, setEditableProfile] = useState({
    firstName: "",
    lastName: "",
    teamName: "",
    age: "",
    height: "",
    location: "",
    position: "",
    jerseyNumber: "",
  });

  // Update editable profile when active profile data changes
  useEffect(() => {
    if (activeProfile) {
      setEditableProfile({
        firstName: activeProfile.firstName || "",
        lastName: activeProfile.lastName || "",
        teamName: activeProfile.teamId || "",
        age: (user as UserType)?.age || "",
        height: (user as UserType)?.height || "",
        location: activeProfile.address || "",
        position: activeProfile.position || "",
        jerseyNumber: activeProfile.jerseyNumber?.toString() || "",
      });
    }
  }, [activeProfile, user]);

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      // Map frontend fields to database column names
      const dbPayload: any = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        address: payload.location, // location -> address
        teamName: payload.teamName,
        age: payload.age,
        height: payload.height,
        position: payload.position,
        jerseyNumber: payload.jerseyNumber ? parseInt(payload.jerseyNumber) : null, // Convert to integer
      };
      
      const res = await fetch(`/api/profile/${(user as UserType)?.activeProfileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dbPayload),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: (updatedProfile) => {
      toast({ title: "Profile updated", description: "Changes saved successfully." });
      // Update the form state with the returned profile data
      if (updatedProfile) {
        setEditableProfile({
          firstName: updatedProfile.firstName || "",
          lastName: updatedProfile.lastName || "",
          teamName: updatedProfile.teamId || "",
          age: (user as UserType)?.age || "",
          height: (user as UserType)?.height || "",
          location: updatedProfile.address || "",
          position: updatedProfile.position || "",
          jerseyNumber: updatedProfile.jerseyNumber?.toString() || "",
        });
      }
      // Invalidate profile query to refetch the updated data
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${(user as UserType)?.activeProfileId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e) => toast({ title: "Save failed", description: String(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={User} title="Profile Information" subtitle="Update your basic details and team info." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="space-y-5 p-6">
          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">First Name</label>
              <Input value={editableProfile.firstName} onChange={(e) => setEditableProfile((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Name</label>
              <Input value={editableProfile.lastName} onChange={(e) => setEditableProfile((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
          </div>

          {/* Team */}
          <div>
            <label className="text-sm font-medium text-gray-700">Team</label>
            <Select value={editableProfile.teamName} onValueChange={(v) => setEditableProfile((p) => ({ ...p, teamName: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Age / Height / Position / Jersey */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Age</label>
              <Select value={editableProfile.age} onValueChange={(v) => setEditableProfile((p) => ({ ...p, age: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select age" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Height</label>
              <Select value={editableProfile.height} onValueChange={(v) => setEditableProfile((p) => ({ ...p, height: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select height" />
                </SelectTrigger>
                <SelectContent>
                  {HEIGHT_OPTIONS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Position</label>
              <Select value={editableProfile.position} onValueChange={(v) => setEditableProfile((p) => ({ ...p, position: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Jersey Number</label>
              <Select value={editableProfile.jerseyNumber} onValueChange={(v) => setEditableProfile((p) => ({ ...p, jerseyNumber: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                  {JERSEY_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      #{n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-medium text-gray-700">Location</label>
            <CityTypeahead value={editableProfile.location} onChange={(city) => setEditableProfile((p) => ({ ...p, location: city }))} />
          </div>

          <div className="pt-2">
            <Button className="w-full sm:w-auto" onClick={() => updateProfile.mutate(editableProfile)} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrivacySection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState({
    makeProfilePublic: true,
    showProfileToTeamOnly: false,
    allowGpsCheckin: true,
    allowCameraMic: true,
    shareAnalytics: true,
  });

  const mutate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/privacy/${(user as UserType)?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error("Failed to update privacy");
      return res.json();
    },
    onSuccess: () => toast({ title: "Privacy updated" }),
    onError: (e) => toast({ title: "Could not update", description: String(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={Shield} title="Privacy & Permissions" subtitle="Control visibility and device permissions." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          {[
            { k: "makeProfilePublic", label: "Make profile public", icon: Globe },
            { k: "showProfileToTeamOnly", label: "Show profile to team only", icon: ShieldCheck },
            { k: "allowGpsCheckin", label: "Allow GPS-based on-site check-in", icon: MapPin },
            { k: "allowCameraMic", label: "Allow camera & microphone for uploads", icon: ShieldCheck },
            { k: "shareAnalytics", label: "Share anonymized usage analytics", icon: ShieldCheck },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <row.icon className="h-5 w-5 text-gray-600" />
                <div className="text-sm">{row.label}</div>
              </div>
              <Switch checked={(state as any)[row.k]} onCheckedChange={(v) => setState((s) => ({ ...s, [row.k]: v }))} />
            </div>
          ))}

          <div className="pt-2">
            <Button onClick={() => mutate.mutate()} disabled={mutate.isPending}>
              {mutate.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-transparent border-0 shadow-none">
        <CardHeader className="px-6">
          <CardTitle className="text-base">Blocked Users</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-sm text-gray-500">No blocked users.</div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    pushTeamMessages: true,
    pushEventReminders: true,
    pushCheckinWindows: true,
    pushProgramUpdates: false,
    quietHours: false,
  });

  const mutate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notifications/prefs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to update notifications");
      return res.json();
    },
    onSuccess: () => toast({ title: "Notification settings saved" }),
    onError: (e) => toast({ title: "Could not save", description: String(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={Bell} title="Notifications" subtitle="Choose how you want to be notified." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <Group title="Browser Push Notifications">
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-muted-foreground">Enable push notifications in your browser to receive real-time updates</p>
              <BrowserPushNotificationButton />
            </div>
          </Group>

          <Separator />

          <Group title="Push Notifications">
            <ToggleRow label="Team messages" checked={prefs.pushTeamMessages} onChange={(v) => setPrefs((p) => ({ ...p, pushTeamMessages: v }))} />
            <ToggleRow label="Event reminders" checked={prefs.pushEventReminders} onChange={(v) => setPrefs((p) => ({ ...p, pushEventReminders: v }))} />
            <ToggleRow label="Check-in/RSVP windows" checked={prefs.pushCheckinWindows} onChange={(v) => setPrefs((p) => ({ ...p, pushCheckinWindows: v }))} />
            <ToggleRow label="Program updates" checked={prefs.pushProgramUpdates} onChange={(v) => setPrefs((p) => ({ ...p, pushProgramUpdates: v }))} />
          </Group>

          <Separator />

          <Group title="Preferences">
            <ToggleRow label="Quiet hours (10pm–7am)" checked={prefs.quietHours} onChange={(v) => setPrefs((p) => ({ ...p, quietHours: v }))} />
          </Group>

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

function SecuritySection() {
  const [emailOpen, setEmailOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [twofaOpen, setTwofaOpen] = useState(false);
  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'GET', 
        credentials: 'include' 
      });
      // Redirect to sign in page after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if there's an error
      window.location.href = '/';
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={Shield} title="Account & Security" subtitle="Manage login and security." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <ActionRow icon={Lock} title="Profile Passcode" action={<Button variant="outline" onClick={() => setPasscodeOpen(true)}>Set</Button>} />
          <ActionRow icon={Mail} title="Change email" action={<Button variant="outline" onClick={() => setEmailOpen(true)}>Update</Button>} />
          <ActionRow icon={Key} title="Change password" action={<Button variant="outline" onClick={() => setPwOpen(true)}>Update</Button>} />
          <ActionRow icon={Fingerprint} title="Two-factor authentication (2FA)" action={<Button variant="outline" onClick={() => setTwofaOpen(true)}>Manage</Button>} />
          <ActionRow icon={LogOut} title="Log Out" action={<Button variant="destructive" onClick={handleLogout}>Log Out</Button>} />
          <ActionRow icon={LogOut} title="Sign out of all devices" action={<Button variant="destructive">Sign out all</Button>} />
        </CardContent>
      </Card>

      <ChangeEmailDialog open={emailOpen} onOpenChange={setEmailOpen} />
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <TwoFADialog open={twofaOpen} onOpenChange={setTwofaOpen} />
      <PasscodeDialog open={passcodeOpen} onOpenChange={setPasscodeOpen} />
    </div>
  );
}

function ConnectionsSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean>(true);
  const [linkEmail, setLinkEmail] = useState(user?.email || "");
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // Check if user has linked account
  const { data: linkedAccountStatus } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json() as Promise<UserType>;
    }
  });

  const isLinked = !!linkedAccountStatus?.linkedAccountId;

  // Link account mutation
  const linkAccountMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/settings/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to link account");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Linked!",
        description: `Successfully linked to ${data.account.email}. ${data.profiles.length} profile(s) loaded.`
      });
      setShowLinkDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Link Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Unlink account mutation
  const unlinkAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/unlink-account", {
        method: "POST",
        credentials: "include"
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to unlink account");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Unlinked",
        description: "Your account has been unlinked successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Unlink Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleLinkAccount = () => {
    if (!linkEmail || !linkEmail.trim()) {
      toast({ title: "Email Required", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    linkAccountMutation.mutate(linkEmail);
  };

  const connect = async () => {
    try {
      window.location.href = "/api/connections/google/start"; // OAuth start
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
      <SectionHeader icon={LinkIcon} title="Connections" subtitle="Link your program account and connect calendars." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          {/* Program Account Linking */}
          <div className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Users className="h-5 w-5" style={{ color: BRAND }} />
              </div>
              <div>
                <div className="text-sm font-medium">BoxStat Account</div>
                <div className="text-xs text-gray-500">
                  {isLinked ? "Linked - Profile data synced" : "Not linked - Link to access your program data"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLinked ? (
                <Button 
                  variant="ghost" 
                  onClick={() => unlinkAccountMutation.mutate()}
                  disabled={unlinkAccountMutation.isPending}
                  data-testid="button-unlink-account"
                >
                  {unlinkAccountMutation.isPending ? "Unlinking..." : "Unlink"}
                </Button>
              ) : (
                <Button 
                  onClick={() => setShowLinkDialog(true)}
                  data-testid="button-link-account"
                >
                  Link Account
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Google Calendar Connection */}
          <div className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Calendar className="h-5 w-5" style={{ color: BRAND }} />
              </div>
              <div>
                <div className="text-sm font-medium">Google Calendar</div>
                <div className="text-xs text-gray-500">{googleCalendarConnected ? "Connected" : "Not connected"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleCalendarConnected ? (
                <>
                  <Button variant="outline" onClick={() => (window.location.href = "/api/connections/google/manage")}>
                    Manage <ExternalLink className="h-4 w-4 ml-1" />
                  </Button>
                  <Button variant="ghost" onClick={disconnect}>Disconnect</Button>
                </>
              ) : (
                <Button onClick={connect}>Connect</Button>
              )}
            </div>
          </div>

          <div className="rounded-lg p-3 hover:bg-gray-50">
            <div className="text-sm font-medium mb-1">Sync options</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ToggleRow label="Team events" defaultChecked />
              <ToggleRow label="Games" defaultChecked />
              <ToggleRow label="Practices" defaultChecked />
            </div>
            <p className="text-xs text-gray-500 mt-2">Your team tags determine which events appear in your in-app calendar.</p>
          </div>
        </CardContent>
      </Card>

      {/* Link Account Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Your Program Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your email to link your account and automatically load your profile information from the program database.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                disabled={linkAccountMutation.isPending}
                data-testid="input-link-email"
              />
              <p className="text-xs text-gray-500">
                This must be the email you used when registering for the program.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLinkDialog(false)}
              disabled={linkAccountMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkAccount}
              disabled={linkAccountMutation.isPending}
              data-testid="button-confirm-link"
            >
              {linkAccountMutation.isPending ? "Linking..." : "Link Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillingSection() {
  return (
    <div className="space-y-6">
      <SectionHeader icon={CreditCard} title="Subscription & Billing" subtitle="Manage your plan and payment methods." />
      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Current plan</div>
              <div className="text-base font-semibold">Foundation Program — Monthly</div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Next charge: <span className="font-medium">$29 on the 15th</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => (window.location.href = "/billing")}>Manage</Button>
              <Button className="bg-gray-900 text-white hover:bg-black">Update card</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DevicesSection() {
  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <SectionHeader icon={Smartphone} title="Devices & Sessions" subtitle="Manage where you're signed in." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-3">
          {sessions.length === 0 && <div className="text-sm text-gray-500">No active sessions.</div>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
              <div className="text-sm">
                <div className="font-medium">{s.device || "Unknown device"}</div>
                <div className="text-xs text-gray-500">
                  {s.location || "—"} • {s.lastActive ? new Date(s.lastActive).toLocaleString() : "Now"}
                </div>
              </div>
              <Button variant="outline" size="sm">
                Sign out
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function LegalSection() {
  return (
    <div className="space-y-6">
      <SectionHeader icon={FileText} title="Legal & Data" subtitle="Export your data or review policies." />

      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6 space-y-4">
          <ActionRow icon={FileText} title="Export my data" action={<Button variant="outline">Export</Button>} />
          <ActionRow icon={ExternalLink} title="Privacy Policy" action={<Button variant="ghost">Open</Button>} />
          <ActionRow icon={ExternalLink} title="Terms of Service" action={<Button variant="ghost">Open</Button>} />
        </CardContent>
      </Card>
    </div>
  );
}

function DangerSection() {
  const { toast } = useToast();
  const onDelete = async () => {
    const ok = confirm("Delete your account? This cannot be undone.");
    if (!ok) return;
    const res = await fetch("/api/account/delete", { method: "POST", credentials: "include" });
    if (res.ok) {
      toast({ title: "Account deleted" });
      window.location.href = "/";
    } else {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };
  return (
    <div className="space-y-6">
      <SectionHeader icon={AlertTriangle} title="Danger Zone" subtitle="Irreversible actions." />
      <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-red-700">Delete account</div>
              <div className="text-xs text-red-600">All data will be permanently removed.</div>
            </div>
            <Button variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Shared small UI bits
──────────────────────────────────────────────────────────────────────────────── */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-gray-800">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function ToggleRow({ label, checked, onChange, defaultChecked }: { label: string; checked?: boolean; onChange?: (v: boolean) => void; defaultChecked?: boolean }) {
  const [local, setLocal] = useState<boolean>(checked ?? !!defaultChecked);
  useEffect(() => {
    if (checked !== undefined) setLocal(checked);
  }, [checked]);
  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
      <div className="text-sm">{label}</div>
      <Switch
        checked={local}
        onCheckedChange={(v) => {
          setLocal(v);
          onChange?.(v);
        }}
      />
    </div>
  );
}
function ActionRow({ icon: Icon, title, action }: { icon: any; title: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-600" />
        <div className="text-sm">{title}</div>
      </div>
      {action}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Tab Renderer
──────────────────────────────────────────────────────────────────────────────── */
function renderTab(tab: TabKey) {
  switch (tab) {
    case "profile":
      return <ProfileSection />;
    case "privacy":
      return <PrivacySection />;
    case "notifications":
      return <NotificationsSection />;
    case "security":
      return <SecuritySection />;
    case "connections":
      return <ConnectionsSection />;
    case "billing":
      return <BillingSection />;
    case "devices":
      return <DevicesSection />;
    case "legal":
      return <LegalSection />;
    case "danger":
      return <DangerSection />;
    default:
      return <ProfileSection />;
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, go] = useTab();

  const NAV: Array<{ key: TabKey; label: string; icon: any }> = [
    { key: "profile", label: "Profile", icon: User },
    { key: "privacy", label: "Privacy & Permissions", icon: Shield },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Account & Security", icon: ShieldCheck },
    { key: "connections", label: "Connections", icon: LinkIcon },
    { key: "billing", label: "Billing", icon: CreditCard },
    { key: "devices", label: "Devices", icon: Smartphone },
    { key: "legal", label: "Legal & Data", icon: FileText },
    { key: "danger", label: "Danger Zone", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/player-dashboard")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="text-lg font-semibold text-gray-900">Settings</div>
              <div className="text-xs text-gray-500">
                Signed in as {(user as UserType)?.firstName} {(user as UserType)?.lastName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 p-4">
        {/* Sidebar */}
        <aside className="md:col-span-1">
          <nav className="rounded-xl p-2">
            {NAV.map((n) => {
              const active = tab === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => go(n.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <n.icon className="h-4 w-4" />
                  <span className="text-sm">{n.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="md:col-span-3">
          <div className="rounded-xl">
            {renderTab(tab)}
          </div>
        </main>
      </div>
    </div>
  );
}
