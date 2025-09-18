'use client';

import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Upload, Camera, LogOut, Users, Mail, Key, Smartphone, MapPin, Globe, Shield, FileText, Clock, Eye } from "lucide-react";

const POSITION_OPTIONS = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
const HEIGHT_OPTIONS = [
  "4'4\"", "4'5\"", "4'6\"", "4'7\"", "4'8\"", "4'9\"", "4'10\"", "4'11\"",
  "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
  "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"", "6'7\"", "6'8\"", "6'9\"", "6'10\"",
];
const AGE_OPTIONS = ["9", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
const JERSEY_OPTIONS = Array.from({ length: 99 }, (_, i) => (i + 1).toString());
const GRADE_OPTIONS = ["3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade"];

export function PlayerProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch current team data to display (read-only)
  const { data: teamData } = useQuery({
    queryKey: [`/api/users/${(user as any)?.id}/team`],
    enabled: !!(user as any)?.id
  });

  const [profile, setProfile] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    position: (user as any)?.position || "",
    jerseyNumber: (user as any)?.jerseyNumber?.toString() || "",
    city: (user as any)?.city || (user as any)?.address || "",
    age: (user as any)?.age || "",
    height: (user as any)?.height || "",
    schoolGrade: (user as any)?.schoolGrade || "",
    phoneNumber: (user as any)?.phoneNumber || "",
    emergencyContact: (user as any)?.emergencyContact || "",
    emergencyPhone: (user as any)?.emergencyPhone || "",
    medicalInfo: (user as any)?.medicalInfo || "",
    allergies: (user as any)?.allergies || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      // Send both city and address fields to ensure compatibility
      const updateData = {
        ...data,
        address: data.city,
        jerseyNumber: data.jerseyNumber ? parseInt(data.jerseyNumber) : null,
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
        jerseyNumber: updatedUser.jerseyNumber?.toString() || "",
        city: updatedUser.city || updatedUser.address || "",
        age: updatedUser.age || "",
        height: updatedUser.height || "",
        schoolGrade: updatedUser.schoolGrade || "",
        phoneNumber: updatedUser.phoneNumber || "",
        emergencyContact: updatedUser.emergencyContact || "",
        emergencyPhone: updatedUser.emergencyPhone || "",
        medicalInfo: updatedUser.medicalInfo || "",
        allergies: updatedUser.allergies || "",
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Player Profile
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Basketball info and personal details
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <Input
                    value={profile.firstName}
                    onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <Input
                    value={profile.lastName}
                    onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
                  <Select value={profile.age} onValueChange={(value) => setProfile(p => ({ ...p, age: value }))}>
                    <SelectTrigger data-testid="select-age">
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGE_OPTIONS.map((age) => (
                        <SelectItem key={age} value={age}>{age}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Height</label>
                  <Select value={profile.height} onValueChange={(value) => setProfile(p => ({ ...p, height: value }))}>
                    <SelectTrigger data-testid="select-height">
                      <SelectValue placeholder="Select height" />
                    </SelectTrigger>
                    <SelectContent>
                      {HEIGHT_OPTIONS.map((height) => (
                        <SelectItem key={height} value={height}>{height}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">School Grade</label>
                  <Select value={profile.schoolGrade} onValueChange={(value) => setProfile(p => ({ ...p, schoolGrade: value }))}>
                    <SelectTrigger data-testid="select-grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map((grade) => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City (From)</label>
                <Input
                  value={profile.city}
                  onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                  placeholder="Enter your city"
                  data-testid="input-city"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <Input
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="Enter phone number"
                  data-testid="input-phone"
                />
              </div>
            </CardContent>
          </Card>

          {/* Basketball Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basketball Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Team</label>
                <Input
                  value={(teamData as any)?.name || "No team assigned"}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="Team will be assigned when you join"
                  data-testid="input-team"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Team is set when you request to join a team</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jersey Number</label>
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
            </CardContent>
          </Card>

          {/* Emergency Information */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Name</label>
                  <Input
                    value={profile.emergencyContact}
                    onChange={(e) => setProfile(p => ({ ...p, emergencyContact: e.target.value }))}
                    placeholder="Enter emergency contact name"
                    data-testid="input-emergency-contact"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Phone</label>
                  <Input
                    value={profile.emergencyPhone}
                    onChange={(e) => setProfile(p => ({ ...p, emergencyPhone: e.target.value }))}
                    placeholder="Enter emergency phone number"
                    data-testid="input-emergency-phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Medical Information</label>
                <Textarea
                  value={profile.medicalInfo}
                  onChange={(e) => setProfile(p => ({ ...p, medicalInfo: e.target.value }))}
                  placeholder="Enter any medical information coaches should know about"
                  rows={3}
                  data-testid="textarea-medical-info"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Include any conditions, medications, or medical notes</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Allergies</label>
                <Textarea
                  value={profile.allergies}
                  onChange={(e) => setProfile(p => ({ ...p, allergies: e.target.value }))}
                  placeholder="Enter any allergies"
                  rows={2}
                  data-testid="textarea-allergies"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">List any known allergies or dietary restrictions</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
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
      </div>
    </div>
  );
}

export function PlayerPrivacyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchable, setSearchable] = useState(true);

  // Fetch current privacy settings
  const { data: privacySettings } = useQuery({
    queryKey: ['/api/privacy'],
    select: (data: any) => data?.searchable ?? true,
  });

  React.useEffect(() => {
    if (privacySettings !== undefined) {
      setSearchable(privacySettings);
    }
  }, [privacySettings]);

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
    onSuccess: () => {
      toast({ title: "Privacy settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update privacy settings", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Privacy
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Control your visibility and data sharing
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Player Profile Visibility</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allow other players and coaches to find your profile</p>
                </div>
                <Switch
                  checked={searchable}
                  onCheckedChange={(checked) => {
                    setSearchable(checked);
                    mutation.mutate({ searchable: checked });
                  }}
                  data-testid="switch-profile-visibility"
                />
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>When enabled, your profile can be discovered by other players and coaches in the system. When disabled, your profile will only be visible to your team members and coaches.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface NotificationPrefs {
  eventRsvp: boolean;
  eventReminders: boolean;
  eventCheckin: boolean;
  trophyProgress: boolean;
  badgeEarned: boolean;
  trainingReminders: boolean;
  teamMessages: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export function PlayerNotificationsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    eventRsvp: true,
    eventReminders: true,
    eventCheckin: true,
    trophyProgress: true,
    badgeEarned: true,
    trainingReminders: true,
    teamMessages: true,
    pushNotifications: true,
    emailNotifications: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00"
  });

  // Fetch notification preferences
  const { data: notificationPrefs } = useQuery<Partial<NotificationPrefs>>({
    queryKey: ['/api/notifications/preferences'],
  });

  React.useEffect(() => {
    if (notificationPrefs) {
      setPrefs({
        eventRsvp: notificationPrefs.eventRsvp ?? true,
        eventReminders: notificationPrefs.eventReminders ?? true,
        eventCheckin: notificationPrefs.eventCheckin ?? true,
        trophyProgress: notificationPrefs.trophyProgress ?? true,
        badgeEarned: notificationPrefs.badgeEarned ?? true,
        trainingReminders: notificationPrefs.trainingReminders ?? true,
        teamMessages: notificationPrefs.teamMessages ?? true,
        pushNotifications: notificationPrefs.pushNotifications ?? true,
        emailNotifications: notificationPrefs.emailNotifications ?? true,
        quietHoursStart: notificationPrefs.quietHoursStart ?? "22:00",
        quietHoursEnd: notificationPrefs.quietHoursEnd ?? "07:00"
      });
    }
  }, [notificationPrefs]);

  const mutation = useMutation({
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
    onSuccess: () => {
      toast({ title: "Notification settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save notification settings", variant: "destructive" });
    },
  });

  const ToggleRow = ({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Notifications
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage alerts and communications
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Event RSVP reminders" 
                checked={prefs.eventRsvp} 
                onChange={(v) => setPrefs((p) => ({ ...p, eventRsvp: v }))}
                testId="switch-event-rsvp"
              />
              <ToggleRow 
                label="Event reminders" 
                checked={prefs.eventReminders} 
                onChange={(v) => setPrefs((p) => ({ ...p, eventReminders: v }))}
                testId="switch-event-reminders"
              />
              <ToggleRow 
                label="Check-in availability" 
                checked={prefs.eventCheckin} 
                onChange={(v) => setPrefs((p) => ({ ...p, eventCheckin: v }))}
                testId="switch-event-checkin"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Achievement Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Trophy progress updates" 
                checked={prefs.trophyProgress} 
                onChange={(v) => setPrefs((p) => ({ ...p, trophyProgress: v }))}
                testId="switch-trophy-progress"
              />
              <ToggleRow 
                label="Badge earned notifications" 
                checked={prefs.badgeEarned} 
                onChange={(v) => setPrefs((p) => ({ ...p, badgeEarned: v }))}
                testId="switch-badge-earned"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Training & Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Training reminders" 
                checked={prefs.trainingReminders} 
                onChange={(v) => setPrefs((p) => ({ ...p, trainingReminders: v }))}
                testId="switch-training-reminders"
              />
              <ToggleRow 
                label="Team messages" 
                checked={prefs.teamMessages} 
                onChange={(v) => setPrefs((p) => ({ ...p, teamMessages: v }))}
                testId="switch-team-messages"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Push notifications" 
                checked={prefs.pushNotifications} 
                onChange={(v) => setPrefs((p) => ({ ...p, pushNotifications: v }))}
                testId="switch-push-notifications"
              />
              <ToggleRow 
                label="Email notifications" 
                checked={prefs.emailNotifications} 
                onChange={(v) => setPrefs((p) => ({ ...p, emailNotifications: v }))}
                testId="switch-email-notifications"
              />
              
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Quiet Hours</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">No notifications will be sent during these hours</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Start time</label>
                    <Input
                      type="time"
                      value={prefs.quietHoursStart}
                      onChange={(e) => setPrefs(p => ({ ...p, quietHoursStart: e.target.value }))}
                      data-testid="input-quiet-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">End time</label>
                    <Input
                      type="time"
                      value={prefs.quietHoursEnd}
                      onChange={(e) => setPrefs(p => ({ ...p, quietHoursEnd: e.target.value }))}
                      data-testid="input-quiet-end"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              onClick={() => mutation.mutate()} 
              disabled={mutation.isPending}
              data-testid="button-save-notifications"
            >
              {mutation.isPending ? "Saving..." : "Save Notification Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerSecurityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const ActionRow = ({ icon: Icon, title, action, description }: { icon: any; title: string; action: React.ReactNode; description?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{title}</span>
          {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Account & Security
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Password and device management
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActionRow 
                icon={Users} 
                title="Switch Profile" 
                description="Switch between different user profiles"
                action={<Button variant="outline" onClick={handleSwitchProfile} data-testid="button-switch-profile">Switch</Button>} 
              />
              <ActionRow 
                icon={Mail} 
                title="Change email" 
                description="Update your email address"
                action={<Button variant="outline" disabled data-testid="button-change-email">Coming Soon</Button>} 
              />
              <ActionRow 
                icon={Key} 
                title="Change password" 
                description="Update your password"
                action={<Button variant="outline" disabled data-testid="button-change-password">Coming Soon</Button>} 
              />
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionRow 
                icon={LogOut} 
                title="Log Out" 
                description="Sign out of your account"
                action={<Button variant="destructive" onClick={handleLogout} data-testid="button-logout">Log Out</Button>} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PlayerDevicesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [locationTesting, setLocationTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Get device information
  React.useEffect(() => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenSize = `${screen.width}x${screen.height}`;
    
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');

    setDeviceInfo({
      platform,
      userAgent,
      language,
      screenSize,
      isPWA: isStandalone,
      cookiesEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    // Check initial location permission
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationStatus(result.state);
      });
    }
  }, []);

  const testLocationPermission = async () => {
    setLocationTesting(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      });
      setLocationTesting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStatus('granted');
        toast({
          title: "Location Permission Granted",
          description: `Location found: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        });
        setLocationTesting(false);
      },
      (error) => {
        setLocationStatus('denied');
        let message = "Unable to get location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access was denied. Enable location in your browser settings and try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }
        
        toast({
          title: "Location Permission Denied",
          description: message,
          variant: "destructive"
        });
        setLocationTesting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'granted': return 'text-green-600 dark:text-green-400';
      case 'denied': return 'text-red-600 dark:text-red-400';
      case 'prompt': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case 'granted': return 'Granted';
      case 'denied': return 'Denied';
      case 'prompt': return 'Not Set';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Devices & Permissions
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage location access and device information
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Location Permission */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Permission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Location Access for Check-ins</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Status: <span className={`font-medium ${getLocationStatusColor()}`}>{getLocationStatusText()}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Location is required to check into events and verify attendance
                  </p>
                </div>
                <Button
                  onClick={testLocationPermission}
                  disabled={locationTesting}
                  variant={locationStatus === 'granted' ? 'outline' : 'default'}
                  data-testid="button-test-location"
                >
                  {locationTesting ? (
                    "Testing..."
                  ) : locationStatus === 'granted' ? (
                    "Retest"
                  ) : (
                    "Enable Location"
                  )}
                </Button>
              </div>

              {locationStatus === 'denied' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 dark:text-red-200">Location Permission Required</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    To check into events, you need to enable location access:
                  </p>
                  <ul className="text-xs text-red-600 dark:text-red-300 mt-2 ml-4 list-disc space-y-1">
                    <li>Click the location icon in your browser's address bar</li>
                    <li>Select "Allow" for location access</li>
                    <li>Refresh the page and test again</li>
                  </ul>
                </div>
              )}

              {locationStatus === 'granted' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 dark:text-green-200">Location Permission Granted</h4>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    You can now check into events using your location.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Current Device
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deviceInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Platform</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-platform">{deviceInfo.platform}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-language">{deviceInfo.language}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Screen Size</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-screen">{deviceInfo.screenSize}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-timezone">{deviceInfo.timezone}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">App Mode</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-app-mode">
                        {deviceInfo.isPWA ? 'Installed App' : 'Browser'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cookies Enabled</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-cookies">
                        {deviceInfo.cookiesEnabled ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Online Status</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="device-online">
                        {deviceInfo.onlineStatus ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help & Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Location Issues</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-4 list-disc space-y-1">
                    <li>Make sure location services are enabled on your device</li>
                    <li>Check your browser's location settings</li>
                    <li>Try refreshing the page and testing again</li>
                    <li>For mobile: ensure the UYP app has location permission</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">App Installation</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Install the UYP app for the best experience: look for the "Install" or "Add to Home Screen" option in your browser.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PlayerLegalPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [agreementStatus, setAgreementStatus] = useState({
    termsAccepted: true,
    privacyAccepted: true,
    dataProcessingAccepted: true,
    lastAccepted: new Date().toLocaleDateString()
  });

  // Fetch agreement status
  const { data: legalStatus } = useQuery({
    queryKey: ['/api/legal/status'],
    initialData: {} as { termsAccepted?: boolean; privacyAccepted?: boolean; dataProcessingAccepted?: boolean; lastAccepted?: string },
  });

  React.useEffect(() => {
    if (legalStatus) {
      setAgreementStatus({
        termsAccepted: legalStatus.termsAccepted ?? true,
        privacyAccepted: legalStatus.privacyAccepted ?? true,
        dataProcessingAccepted: legalStatus.dataProcessingAccepted ?? true,
        lastAccepted: legalStatus.lastAccepted ? new Date(legalStatus.lastAccepted).toLocaleDateString() : new Date().toLocaleDateString()
      });
    }
  }, [legalStatus]);

  const openDocument = (type: 'terms' | 'privacy' | 'data') => {
    const urls = {
      terms: '/terms-of-service',
      privacy: '/privacy-policy', 
      data: '/data-processing-agreement'
    };
    window.open(urls[type], '_blank');
  };

  const DocumentRow = ({ 
    title, 
    description, 
    accepted, 
    onView, 
    testId 
  }: { 
    title: string; 
    description: string; 
    accepted: boolean; 
    onView: () => void; 
    testId: string;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-md font-medium text-gray-800 dark:text-gray-200">{title}</h3>
          {accepted ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Eye className="h-4 w-4" />
              <span className="text-xs">Accepted</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <Shield className="h-4 w-4" />
              <span className="text-xs">Required</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onView}
        data-testid={testId}
      >
        <FileText className="h-4 w-4 mr-2" />
        View
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Legal & Privacy
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Terms, privacy policy, and data agreements
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Agreement Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Agreement Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div>
                  <h3 className="text-md font-medium text-green-800 dark:text-green-200">All Agreements Accepted</h3>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Last updated: {agreementStatus.lastAccepted}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Legal Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <DocumentRow
                  title="Terms of Service"
                  description="Rules and conditions for using the UYP Basketball app"
                  accepted={agreementStatus.termsAccepted}
                  onView={() => openDocument('terms')}
                  testId="button-view-terms"
                />
                <DocumentRow
                  title="Privacy Policy" 
                  description="How we collect, use, and protect your personal information"
                  accepted={agreementStatus.privacyAccepted}
                  onView={() => openDocument('privacy')}
                  testId="button-view-privacy"
                />
                <DocumentRow
                  title="Data Processing Agreement"
                  description="Details about how your data is processed and stored"
                  accepted={agreementStatus.dataProcessingAccepted}
                  onView={() => openDocument('data')}
                  testId="button-view-data-processing"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Your Data & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Data We Collect</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• Profile information (name, age, position)</li>
                      <li>• Basketball statistics and achievements</li>
                      <li>• Event attendance and check-ins</li>
                      <li>• Location data (only during check-ins)</li>
                      <li>• App usage and preferences</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">How We Use Your Data</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• Track your basketball progress</li>
                      <li>• Verify event attendance</li>
                      <li>• Send relevant notifications</li>
                      <li>• Improve the app experience</li>
                      <li>• Team and coach communications</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Your Rights</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• View all your personal data</li>
                      <li>• Correct inaccurate information</li>
                      <li>• Delete your account and data</li>
                      <li>• Control notification preferences</li>
                      <li>• Opt out of data processing</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Data Retention</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• Profile data: Until account deletion</li>
                      <li>• Basketball stats: 7 years</li>
                      <li>• Location data: 30 days</li>
                      <li>• Messages: 1 year</li>
                      <li>• Backup data: 90 days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Questions or Concerns?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  If you have questions about our legal policies or your data privacy, please contact us:
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> <a href="mailto:legal@uyp.basketball" className="text-blue-600 dark:text-blue-400 hover:underline">legal@uyp.basketball</a></p>
                    <p><strong>Subject Line:</strong> Legal/Privacy Question - Player Account</p>
                    <p><strong>Response Time:</strong> Within 5 business days</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  For immediate concerns about data privacy or account security, please contact us as soon as possible.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}