'use client';

import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Users, Shield, Bell, Link2, CreditCard, FileText, AlertTriangle, Smartphone, Phone, Mail, MapPin, Plus, Trash2, Calendar, Clock, Globe, Eye, EyeOff, Lock, Settings, Camera } from "lucide-react";

const RELATIONSHIP_OPTIONS = ["parent", "guardian", "grandparent", "sibling"];

export function ParentProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
    phoneNumber: (user as any)?.phoneNumber || "",
    address: (user as any)?.address || "",
    emergencyContact: (user as any)?.emergencyContact || "",
    emergencyPhone: (user as any)?.emergencyPhone || "",
    occupation: (user as any)?.occupation || "",
    workPhone: (user as any)?.workPhone || "",
    relationship: (user as any)?.relationship || "parent",
  });

  // Profile picture upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch('/api/upload-profile-photo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile photo updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${(user as any)?.id}`] });
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload photo. Please try again.", variant: "destructive" });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      uploadMutation.mutate(file);
    }
  };

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
    onSuccess: (updatedUser) => {
      setProfile({
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        email: updatedUser.email || "",
        phoneNumber: updatedUser.phoneNumber || "",
        address: updatedUser.address || "",
        emergencyContact: updatedUser.emergencyContact || "",
        emergencyPhone: updatedUser.emergencyPhone || "",
        occupation: updatedUser.occupation || "",
        workPhone: updatedUser.workPhone || "",
        relationship: updatedUser.relationship || "parent",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${(user as any)?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${(user as any)?.id}`] });
      
      toast({ 
        title: "Profile Updated", 
        description: "Your parent profile has been successfully updated."
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Parent Profile
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Personal information and contact details
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
              {/* Profile Picture */}
              <div className="flex flex-col items-center py-4 border-b border-gray-200 dark:border-gray-700 mb-4">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage 
                    src={previewUrl || (user as any)?.profileImageUrl} 
                    alt="Profile"
                    className="object-cover w-full h-full"
                  />
                  <AvatarFallback className="text-2xl font-bold bg-gray-300 dark:bg-gray-600">
                    {`${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload-profile-photo"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? "Uploading..." : "Change Photo"}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-profile-photo"
                />
              </div>
              
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
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <Input
                  value={profile.email}
                  onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                  placeholder="Enter email address"
                  type="email"
                  data-testid="input-email"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </label>
                  <Input
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile(p => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="Enter phone number"
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Work Phone</label>
                  <Input
                    value={profile.workPhone}
                    onChange={(e) => setProfile(p => ({ ...p, workPhone: e.target.value }))}
                    placeholder="Enter work phone number"
                    data-testid="input-work-phone"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                  Address
                </label>
                <Textarea
                  value={profile.address}
                  onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                  placeholder="Enter home address"
                  rows={2}
                  data-testid="textarea-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Occupation</label>
                  <Input
                    value={profile.occupation}
                    onChange={(e) => setProfile(p => ({ ...p, occupation: e.target.value }))}
                    placeholder="Enter your occupation"
                    data-testid="input-occupation"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Relationship to Child</label>
                  <Select value={profile.relationship} onValueChange={(value) => setProfile(p => ({ ...p, relationship: value }))}>
                    <SelectTrigger data-testid="select-relationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((relationship) => (
                        <SelectItem key={relationship} value={relationship}>
                          {relationship.charAt(0).toUpperCase() + relationship.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
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

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => mutation.mutate(profile)}
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-profile"
            >
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ParentFamilyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Query for linked player profiles with comprehensive data
  const { data: linkedPlayers = [], isLoading } = useQuery({
    queryKey: [`/api/parent/players/comprehensive`],
    enabled: !!(user as any)?.id
  });

  const typedLinkedPlayers = (linkedPlayers as any[]) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Family Management
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage your children and family members
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Player Snapshots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Linked Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <div className="text-gray-500">Loading player information...</div>
                </div>
              ) : typedLinkedPlayers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500 mb-2">No players linked yet</div>
                  <div className="text-sm text-gray-400">Players will automatically appear here when linked to your account</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {typedLinkedPlayers.map((player: any) => (
                    <Card 
                      key={player.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
                      onClick={() => setLocation(`/player-profile/${player.id}`)}
                      data-testid={`player-snapshot-${player.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Player Avatar */}
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                            {player.firstName?.[0]?.toUpperCase() || 'P'}{player.lastName?.[0]?.toUpperCase() || ''}
                          </div>
                          
                          {/* Player Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                                  {player.firstName} {player.lastName}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {player.team?.name || 'No team assigned'}
                                  </span>
                                  {player.age && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Age {player.age}
                                    </span>
                                  )}
                                  {player.jerseyNumber && (
                                    <span className="text-blue-600 font-medium">#{player.jerseyNumber}</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Registration Status */}
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                player.registrationStatus === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : player.registrationStatus === 'payment_required'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {player.registrationStatus === 'active' ? 'Up to Date' : 
                                 player.registrationStatus === 'payment_required' ? 'Payment Required' : 'Pending'}
                              </div>
                            </div>
                            
                            {/* Stats Row */}
                            <div className="grid grid-cols-4 gap-4 mb-3">
                              {/* Skill Rating */}
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">{player.skillRating || '--'}</div>
                                <div className="text-xs text-gray-500">Skill Rating</div>
                              </div>
                              
                              {/* Trophies */}
                              <div className="text-center">
                                <div className="text-lg font-bold text-yellow-600">{player.trophyCount || 0}</div>
                                <div className="text-xs text-gray-500">Trophies</div>
                              </div>
                              
                              {/* Badges */}
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">{player.badgeCount || 0}</div>
                                <div className="text-xs text-gray-500">Badges</div>
                              </div>
                              
                              {/* Achievement Total */}
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-600">{(player.trophyCount || 0) + (player.badgeCount || 0)}</div>
                                <div className="text-xs text-gray-500">Total Awards</div>
                              </div>
                            </div>
                            
                            {/* Last Check-in */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="h-4 w-4" />
                              <span>Last check-in:</span>
                              {player.lastCheckin ? (
                                <span>
                                  {new Date(player.lastCheckin.checkedInAt).toLocaleDateString()} at {player.lastCheckin.location || 'Unknown location'}
                                </span>
                              ) : (
                                <span className="text-gray-400">No recent check-ins</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ParentPrivacyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: privacySettings, isLoading } = useQuery({
    queryKey: [`/api/privacy`],
    enabled: !!(user as any)?.id,
    initialData: {} as { profileVisible?: boolean; contactInfoVisible?: boolean; allowCoachMessages?: boolean; shareProgressReports?: boolean; shareAttendanceData?: boolean; allowPhotoSharing?: boolean; showOnTeamDirectory?: boolean }
  });

  const [settings, setSettings] = useState({
    profileVisible: true,
    contactInfoVisible: false,
    allowCoachMessages: true,
    shareProgressReports: true,
    shareAttendanceData: true,
    allowPhotoSharing: false,
    showOnTeamDirectory: true,
  });

  // Update settings when data is loaded
  React.useEffect(() => {
    if (privacySettings) {
      setSettings({
        profileVisible: privacySettings.profileVisible ?? true,
        contactInfoVisible: privacySettings.contactInfoVisible ?? false,
        allowCoachMessages: privacySettings.allowCoachMessages ?? true,
        shareProgressReports: privacySettings.shareProgressReports ?? true,
        shareAttendanceData: privacySettings.shareAttendanceData ?? true,
        allowPhotoSharing: privacySettings.allowPhotoSharing ?? false,
        showOnTeamDirectory: privacySettings.showOnTeamDirectory ?? true,
      });
    }
  }, [privacySettings]);

  const mutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      const response = await fetch(`/api/privacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: data }),
      });
      if (!response.ok) throw new Error("Failed to update privacy settings");
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Privacy Settings Updated", 
        description: "Your privacy preferences have been saved."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Settings", 
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Privacy Settings
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Control your visibility and data sharing preferences
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Profile Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Make profile visible to other parents</div>
                  <div className="text-sm text-gray-500">Allow other parents in your children's teams to see your profile</div>
                </div>
                <Switch
                  checked={settings.profileVisible}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, profileVisible: checked }))}
                  data-testid="switch-profile-visible"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Show contact information</div>
                  <div className="text-sm text-gray-500">Allow coaches and other parents to see your contact details</div>
                </div>
                <Switch
                  checked={settings.contactInfoVisible}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, contactInfoVisible: checked }))}
                  data-testid="switch-contact-visible"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Show on team directory</div>
                  <div className="text-sm text-gray-500">Appear in the team parent directory for communication</div>
                </div>
                <Switch
                  checked={settings.showOnTeamDirectory}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, showOnTeamDirectory: checked }))}
                  data-testid="switch-team-directory"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Allow coach messages</div>
                  <div className="text-sm text-gray-500">Receive direct messages from your children's coaches</div>
                </div>
                <Switch
                  checked={settings.allowCoachMessages}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, allowCoachMessages: checked }))}
                  data-testid="switch-coach-messages"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Share progress reports</div>
                  <div className="text-sm text-gray-500">Allow sharing of children's progress reports with other family members</div>
                </div>
                <Switch
                  checked={settings.shareProgressReports}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, shareProgressReports: checked }))}
                  data-testid="switch-share-progress"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Share attendance data</div>
                  <div className="text-sm text-gray-500">Allow coaches to share attendance information with other family members</div>
                </div>
                <Switch
                  checked={settings.shareAttendanceData}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, shareAttendanceData: checked }))}
                  data-testid="switch-share-attendance"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Allow photo sharing</div>
                  <div className="text-sm text-gray-500">Permission for coaches to share photos/videos of your children</div>
                </div>
                <Switch
                  checked={settings.allowPhotoSharing}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, allowPhotoSharing: checked }))}
                  data-testid="switch-photo-sharing"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => mutation.mutate(settings)}
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-privacy"
            >
              {mutation.isPending ? "Saving..." : "Save Privacy Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ParentNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: notificationPrefs, isLoading } = useQuery({
    queryKey: [`/api/notifications/preferences`],
    enabled: !!(user as any)?.id,
    initialData: {} as { childScheduleChanges?: boolean; practiceReminders?: boolean; gameReminders?: boolean; childAttendance?: boolean; childProgress?: boolean; badgeEarned?: boolean; trophyEarned?: boolean; paymentReminders?: boolean; paymentConfirmation?: boolean; coachMessages?: boolean; teamAnnouncements?: boolean; emergencyAlerts?: boolean; emailNotifications?: boolean; pushNotifications?: boolean; smsNotifications?: boolean; quietHoursStart?: string; quietHoursEnd?: string }
  });

  const [settings, setSettings] = useState({
    childScheduleChanges: true,
    practiceReminders: true,
    gameReminders: true,
    childAttendance: true,
    childProgress: true,
    badgeEarned: true,
    trophyEarned: true,
    paymentReminders: true,
    paymentConfirmation: true,
    coachMessages: true,
    teamAnnouncements: true,
    emergencyAlerts: true,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  });

  // Update settings when data is loaded
  React.useEffect(() => {
    if (notificationPrefs) {
      setSettings({
        childScheduleChanges: notificationPrefs.childScheduleChanges ?? true,
        practiceReminders: notificationPrefs.practiceReminders ?? true,
        gameReminders: notificationPrefs.gameReminders ?? true,
        childAttendance: notificationPrefs.childAttendance ?? true,
        childProgress: notificationPrefs.childProgress ?? true,
        badgeEarned: notificationPrefs.badgeEarned ?? true,
        trophyEarned: notificationPrefs.trophyEarned ?? true,
        paymentReminders: notificationPrefs.paymentReminders ?? true,
        paymentConfirmation: notificationPrefs.paymentConfirmation ?? true,
        coachMessages: notificationPrefs.coachMessages ?? true,
        teamAnnouncements: notificationPrefs.teamAnnouncements ?? true,
        emergencyAlerts: notificationPrefs.emergencyAlerts ?? true,
        emailNotifications: notificationPrefs.emailNotifications ?? true,
        pushNotifications: notificationPrefs.pushNotifications ?? true,
        smsNotifications: notificationPrefs.smsNotifications ?? false,
        quietHoursStart: notificationPrefs.quietHoursStart ?? "22:00",
        quietHoursEnd: notificationPrefs.quietHoursEnd ?? "07:00",
      });
    }
  }, [notificationPrefs]);

  const mutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      const response = await fetch(`/api/notifications/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update notification preferences");
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Notification Preferences Updated", 
        description: "Your notification settings have been saved."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Settings", 
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Notification Preferences
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage alerts and communications about your children
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Schedule & Activity Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule & Activity Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Schedule changes</div>
                  <div className="text-sm text-gray-500">Get notified when practice or game times change</div>
                </div>
                <Switch
                  checked={settings.childScheduleChanges}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, childScheduleChanges: checked }))}
                  data-testid="switch-schedule-changes"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Practice reminders</div>
                  <div className="text-sm text-gray-500">Reminders 2 hours before practices</div>
                </div>
                <Switch
                  checked={settings.practiceReminders}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, practiceReminders: checked }))}
                  data-testid="switch-practice-reminders"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Game reminders</div>
                  <div className="text-sm text-gray-500">Reminders 4 hours before games</div>
                </div>
                <Switch
                  checked={settings.gameReminders}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, gameReminders: checked }))}
                  data-testid="switch-game-reminders"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Attendance notifications</div>
                  <div className="text-sm text-gray-500">When your child checks in or misses practice/games</div>
                </div>
                <Switch
                  checked={settings.childAttendance}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, childAttendance: checked }))}
                  data-testid="switch-attendance"
                />
              </div>
            </CardContent>
          </Card>

          {/* Progress & Achievement Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Progress & Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Progress updates</div>
                  <div className="text-sm text-gray-500">Weekly and monthly progress reports</div>
                </div>
                <Switch
                  checked={settings.childProgress}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, childProgress: checked }))}
                  data-testid="switch-progress"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Badge earned</div>
                  <div className="text-sm text-gray-500">When your child earns new badges</div>
                </div>
                <Switch
                  checked={settings.badgeEarned}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, badgeEarned: checked }))}
                  data-testid="switch-badges"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Trophy earned</div>
                  <div className="text-sm text-gray-500">When your child earns trophies</div>
                </div>
                <Switch
                  checked={settings.trophyEarned}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, trophyEarned: checked }))}
                  data-testid="switch-trophies"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment & Billing Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Payment reminders</div>
                  <div className="text-sm text-gray-500">Reminders for upcoming payments</div>
                </div>
                <Switch
                  checked={settings.paymentReminders}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, paymentReminders: checked }))}
                  data-testid="switch-payment-reminders"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Payment confirmations</div>
                  <div className="text-sm text-gray-500">Confirmation when payments are processed</div>
                </div>
                <Switch
                  checked={settings.paymentConfirmation}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, paymentConfirmation: checked }))}
                  data-testid="switch-payment-confirmation"
                />
              </div>
            </CardContent>
          </Card>

          {/* Communication Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Coach messages</div>
                  <div className="text-sm text-gray-500">Direct messages from coaches</div>
                </div>
                <Switch
                  checked={settings.coachMessages}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, coachMessages: checked }))}
                  data-testid="switch-coach-messages"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Team announcements</div>
                  <div className="text-sm text-gray-500">Important team announcements and updates</div>
                </div>
                <Switch
                  checked={settings.teamAnnouncements}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, teamAnnouncements: checked }))}
                  data-testid="switch-announcements"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Emergency alerts</div>
                  <div className="text-sm text-gray-500">Urgent safety or emergency notifications (always enabled)</div>
                </div>
                <Switch
                  checked={true}
                  disabled={true}
                  data-testid="switch-emergency"
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Email notifications</div>
                  <div className="text-sm text-gray-500">Receive notifications via email</div>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, emailNotifications: checked }))}
                  data-testid="switch-email"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Push notifications</div>
                  <div className="text-sm text-gray-500">Receive notifications on your device</div>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, pushNotifications: checked }))}
                  data-testid="switch-push"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">SMS notifications</div>
                  <div className="text-sm text-gray-500">Receive notifications via text message</div>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, smsNotifications: checked }))}
                  data-testid="switch-sms"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quiet Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">Set hours when you don't want to receive non-emergency notifications</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                  <Input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => setSettings(s => ({ ...s, quietHoursStart: e.target.value }))}
                    data-testid="input-quiet-start"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                  <Input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => setSettings(s => ({ ...s, quietHoursEnd: e.target.value }))}
                    data-testid="input-quiet-end"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => mutation.mutate(settings)}
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

export function ParentSecurityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState([
    { id: "1", name: "iPhone 12", location: "New York, NY", lastActive: "Today" },
    { id: "2", name: "MacBook Pro", location: "New York, NY", lastActive: "2 hours ago" },
  ]);

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const response = await fetch(`/api/users/${(user as any)?.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ 
        title: "Password Changed", 
        description: "Your password has been successfully updated."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Change Password", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  const toggleTwoFactorMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const response = await fetch(`/api/users/${(user as any)?.id}/2fa`, {
        method: enable ? "POST" : "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to ${enable ? 'enable' : 'disable'} 2FA`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setTwoFactorEnabled(variables);
      toast({ 
        title: variables ? "2FA Enabled" : "2FA Disabled", 
        description: variables ? "Two-factor authentication has been enabled." : "Two-factor authentication has been disabled."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update 2FA", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await fetch(`/api/users/${(user as any)?.id}/devices/${deviceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove device");
      return response.json();
    },
    onSuccess: (data, deviceId) => {
      setTrustedDevices(devices => devices.filter(d => d.id !== deviceId));
      toast({ 
        title: "Device Removed", 
        description: "Device has been removed from your trusted devices."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Remove Device", 
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
              onClick={() => setLocation("/parent-settings")}
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
                Manage your account security and access
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(d => ({ ...d, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(d => ({ ...d, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  data-testid="input-new-password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(d => ({ ...d, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  data-testid="input-confirm-password"
                />
              </div>

              <Button
                onClick={() => changePasswordMutation.mutate(passwordData)}
                disabled={changePasswordMutation.isPending || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Enable Two-Factor Authentication</div>
                  <div className="text-sm text-gray-500">Add an extra layer of security to your account</div>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={(checked) => toggleTwoFactorMutation.mutate(checked)}
                  data-testid="switch-2fa"
                />
              </div>

              {twoFactorEnabled && (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <div className="text-green-800 dark:text-green-200 text-sm">
                    Two-factor authentication is enabled for your account. You'll need both your password and authentication code to sign in.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trusted Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Trusted Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trustedDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{device.name}</div>
                      <div className="text-sm text-gray-500">{device.location} • Last active {device.lastActive}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeviceMutation.mutate(device.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      data-testid={`button-remove-device-${device.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Profile Switching */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Switch Profile</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Access your other profiles or switch to a different account</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/profile-selection")}
                  data-testid="button-switch-profile"
                >
                  Switch Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Management */}
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Sign out of all devices</div>
                  <div className="text-sm text-gray-500">This will sign you out of all devices except this one</div>
                </div>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-800 border-red-300 hover:bg-red-50"
                  data-testid="button-signout-all"
                >
                  Sign Out All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ParentConnectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [connections, setConnections] = useState({
    googleCalendar: false,
    outlookCalendar: false,
    appleCalendar: false,
    stripePayments: false,
    venmoPayments: false,
  });

  const toggleConnectionMutation = useMutation({
    mutationFn: async ({ service, connect }: { service: string; connect: boolean }) => {
      const response = await fetch(`/api/integrations/${service}`, {
        method: connect ? "POST" : "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Failed to ${connect ? 'connect' : 'disconnect'} ${service}`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setConnections(c => ({ ...c, [variables.service]: variables.connect }));
      toast({ 
        title: variables.connect ? "Connected" : "Disconnected", 
        description: `${variables.service} has been ${variables.connect ? 'connected' : 'disconnected'}.`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Connection Failed", 
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Connections
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Connect external apps and services
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Calendar Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Google Calendar</div>
                    <div className="text-sm text-gray-500">Sync team schedules and events</div>
                  </div>
                </div>
                <Switch
                  checked={connections.googleCalendar}
                  onCheckedChange={(checked) => toggleConnectionMutation.mutate({ service: "googleCalendar", connect: checked })}
                  data-testid="switch-google-calendar"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Outlook Calendar</div>
                    <div className="text-sm text-gray-500">Sync with Microsoft Outlook</div>
                  </div>
                </div>
                <Switch
                  checked={connections.outlookCalendar}
                  onCheckedChange={(checked) => toggleConnectionMutation.mutate({ service: "outlookCalendar", connect: checked })}
                  data-testid="switch-outlook-calendar"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Apple Calendar</div>
                    <div className="text-sm text-gray-500">Sync with iPhone and Mac calendars</div>
                  </div>
                </div>
                <Switch
                  checked={connections.appleCalendar}
                  onCheckedChange={(checked) => toggleConnectionMutation.mutate({ service: "appleCalendar", connect: checked })}
                  data-testid="switch-apple-calendar"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Stripe Payments</div>
                    <div className="text-sm text-gray-500">Credit cards and bank transfers</div>
                  </div>
                </div>
                <Switch
                  checked={connections.stripePayments}
                  onCheckedChange={(checked) => toggleConnectionMutation.mutate({ service: "stripePayments", connect: checked })}
                  data-testid="switch-stripe"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Venmo</div>
                    <div className="text-sm text-gray-500">Quick mobile payments</div>
                  </div>
                </div>
                <Switch
                  checked={connections.venmoPayments}
                  onCheckedChange={(checked) => toggleConnectionMutation.mutate({ service: "venmoPayments", connect: checked })}
                  data-testid="switch-venmo"
                />
              </div>
            </CardContent>
          </Card>

          {/* Connected Services Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500 mb-4">
                You have {Object.values(connections).filter(Boolean).length} services connected
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(connections).map(([service, connected]) => (
                  connected && (
                    <div key={service} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700 dark:text-green-300 capitalize">
                        {service.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  )
                ))}
              </div>

              {Object.values(connections).every(c => !c) && (
                <div className="text-center py-8">
                  <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500 mb-2">No services connected</div>
                  <div className="text-sm text-gray-400">Connect services to sync data and automate tasks</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ParentBillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: paymentMethods = [] } = useQuery({
    queryKey: [`/api/payments/methods`],
    enabled: !!(user as any)?.id
  });

  const { data: billingHistory = [] } = useQuery({
    queryKey: [`/api/users/${(user as any)?.id}/payments`],
    enabled: !!(user as any)?.id
  });

  const [autoPayEnabled, setAutoPayEnabled] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);

  const toggleAutoPayMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch(`/api/payments/autopay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to update auto-pay setting");
      return response.json();
    },
    onSuccess: (data, enabled) => {
      setAutoPayEnabled(enabled);
      toast({ 
        title: enabled ? "Auto-Pay Enabled" : "Auto-Pay Disabled", 
        description: enabled ? "Payments will be automatically processed" : "You'll need to manually process payments"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Auto-Pay", 
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Billing & Payments
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage payment methods and billing history
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Balance & Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">$0.00</div>
                  <div className="text-sm text-gray-500">Current Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">$85.00</div>
                  <div className="text-sm text-gray-500">Next Payment Due</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dec 15</div>
                  <div className="text-sm text-gray-500">Due Date</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <Button
                  onClick={() => setShowAddPayment(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-add-payment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-700 text-white rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        •••• •••• •••• 4242
                      </div>
                      <div className="text-sm text-gray-500">Visa • Expires 12/26</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Primary</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      data-testid="button-remove-payment-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        PayPal Account
                      </div>
                      <div className="text-sm text-gray-500">parent@email.com</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    data-testid="button-remove-payment-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Pay Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Pay Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Enable Auto-Pay</div>
                  <div className="text-sm text-gray-500">Automatically pay invoices using your primary payment method</div>
                </div>
                <Switch
                  checked={autoPayEnabled}
                  onCheckedChange={(checked) => toggleAutoPayMutation.mutate(checked)}
                  data-testid="switch-autopay"
                />
              </div>

              {autoPayEnabled && (
                <div className="mt-4 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <div className="text-green-800 dark:text-green-200 text-sm">
                    Auto-pay is enabled. Payments will be automatically processed 2 days before the due date using your primary payment method.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Monthly Team Fee - November</div>
                    <div className="text-sm text-gray-500">Nov 15, 2025 • Visa ending in 4242</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">$85.00</div>
                    <div className="text-sm text-green-600">Paid</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Tournament Entry Fee</div>
                    <div className="text-sm text-gray-500">Oct 28, 2025 • PayPal</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">$45.00</div>
                    <div className="text-sm text-green-600">Paid</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Team Uniform</div>
                    <div className="text-sm text-gray-500">Oct 15, 2025 • Visa ending in 4242</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">$65.00</div>
                    <div className="text-sm text-green-600">Paid</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-dashed border-2 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Monthly Team Fee - December</div>
                    <div className="text-sm text-gray-500">Due Dec 15, 2025</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-gray-100">$85.00</div>
                    <div className="text-sm text-orange-600">Pending</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices & Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Download tax documents</div>
                  <div className="text-sm text-gray-500">Get yearly summary for tax purposes</div>
                </div>
                <Button
                  variant="outline"
                  data-testid="button-download-tax-docs"
                >
                  Download 2025 Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ParentLegalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [agreements, setAgreements] = useState([
    {
      id: "liability-waiver",
      title: "Liability Waiver",
      description: "Release of liability for sports activities",
      signed: true,
      signedDate: "2025-01-15",
      required: true,
    },
    {
      id: "photo-consent",
      title: "Photo & Video Consent",
      description: "Permission to use child's image in promotional materials",
      signed: false,
      signedDate: null,
      required: false,
    },
    {
      id: "medical-emergency",
      title: "Medical Emergency Authorization",
      description: "Authorization for emergency medical treatment",
      signed: true,
      signedDate: "2025-01-15",
      required: true,
    },
    {
      id: "code-of-conduct",
      title: "Parent Code of Conduct",
      description: "Agreement to follow team and league conduct standards",
      signed: true,
      signedDate: "2025-01-15",
      required: true,
    },
  ]);

  const signAgreementMutation = useMutation({
    mutationFn: async (agreementId: string) => {
      const response = await fetch(`/api/legal/agreements/${agreementId}/sign`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to sign agreement");
      return response.json();
    },
    onSuccess: (data, agreementId) => {
      setAgreements(agreements => 
        agreements.map(agreement => 
          agreement.id === agreementId 
            ? { ...agreement, signed: true, signedDate: new Date().toISOString().split('T')[0] }
            : agreement
        )
      );
      toast({ 
        title: "Agreement Signed", 
        description: "The legal agreement has been digitally signed."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Sign Agreement", 
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Legal Agreements
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage consent forms and legal agreements
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Agreement Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agreement Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {agreements.filter(a => a.signed).length}
                  </div>
                  <div className="text-sm text-gray-500">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {agreements.filter(a => !a.signed && a.required).length}
                  </div>
                  <div className="text-sm text-gray-500">Required</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {agreements.filter(a => !a.signed && !a.required).length}
                  </div>
                  <div className="text-sm text-gray-500">Optional</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agreements List */}
          <Card>
            <CardHeader>
              <CardTitle>Legal Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agreements.map((agreement) => (
                  <div key={agreement.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${agreement.signed ? 'bg-green-500' : (agreement.required ? 'bg-orange-500' : 'bg-gray-400')}`}></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {agreement.title}
                          {agreement.required && (
                            <span className="ml-2 text-red-500 text-sm">*Required</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {agreement.description}
                          {agreement.signed && agreement.signedDate && (
                            <span className="ml-2 text-green-600">
                              • Signed {new Date(agreement.signedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-${agreement.id}`}
                      >
                        View
                      </Button>
                      
                      {!agreement.signed && (
                        <Button
                          onClick={() => signAgreementMutation.mutate(agreement.id)}
                          disabled={signAgreementMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          data-testid={`button-sign-${agreement.id}`}
                        >
                          {signAgreementMutation.isPending ? "Signing..." : "Sign"}
                        </Button>
                      )}
                      
                      {agreement.signed && (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <FileText className="h-4 w-4" />
                          Signed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Information */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-amber-800 dark:text-amber-200 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>All required agreements must be signed before your child can participate in team activities.</div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>Digital signatures are legally binding and equivalent to handwritten signatures.</div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>You can download copies of all signed agreements at any time.</div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>Contact the team administrator if you have questions about any legal documents.</div>
              </div>
            </CardContent>
          </Card>

          {/* Download Options */}
          <Card>
            <CardHeader>
              <CardTitle>Document Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Download all signed agreements</div>
                  <div className="text-sm text-gray-500">Get a PDF copy of all your signed legal documents</div>
                </div>
                <Button
                  variant="outline"
                  disabled={agreements.filter(a => a.signed).length === 0}
                  data-testid="button-download-agreements"
                >
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ParentDevicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['/api/devices'],
    enabled: !!(user as any)?.id
  });

  const [settings, setSettings] = useState({
    locationPermissions: true,
    notificationPermissions: true,
    cameraPermissions: false,
    microphonePermissions: false,
    autoLogin: true,
    biometricLogin: false,
    twoFactorEnabled: false,
    trustedDevicesOnly: false,
  });

  // Update settings when data is loaded
  React.useEffect(() => {
    if (devices?.settings) {
      setSettings(prev => ({ ...prev, ...devices.settings }));
    }
  }, [devices]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      return apiRequest('/api/devices/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Device Settings Updated", 
        description: "Your device preferences have been saved."
      });
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Settings", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return apiRequest(`/api/devices/${deviceId}/revoke`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Device Access Revoked", 
        description: "The device has been removed from your trusted devices."
      });
      // Invalidate cache to refresh device list
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Revoke Access", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  const currentDevices = devices?.devices || [
    {
      id: "current",
      name: "Current Device",
      type: "mobile",
      lastUsed: new Date().toISOString(),
      location: "Current Location",
      isCurrent: true,
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Device Management
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage trusted devices and app permissions
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* App Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                App Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Location Access</div>
                  <div className="text-sm text-gray-500">Allow app to access your location for check-ins and event notifications</div>
                </div>
                <Switch
                  checked={settings.locationPermissions}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, locationPermissions: checked }))}
                  data-testid="switch-location-permissions"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</div>
                  <div className="text-sm text-gray-500">Receive notifications about your children's activities</div>
                </div>
                <Switch
                  checked={settings.notificationPermissions}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, notificationPermissions: checked }))}
                  data-testid="switch-notification-permissions"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Camera Access</div>
                  <div className="text-sm text-gray-500">Allow taking photos for profile pictures and event sharing</div>
                </div>
                <Switch
                  checked={settings.cameraPermissions}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, cameraPermissions: checked }))}
                  data-testid="switch-camera-permissions"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Microphone Access</div>
                  <div className="text-sm text-gray-500">Allow recording audio for voice messages (future feature)</div>
                </div>
                <Switch
                  checked={settings.microphonePermissions}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, microphonePermissions: checked }))}
                  data-testid="switch-microphone-permissions"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Auto-login on trusted devices</div>
                  <div className="text-sm text-gray-500">Stay logged in on devices you use regularly</div>
                </div>
                <Switch
                  checked={settings.autoLogin}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, autoLogin: checked }))}
                  data-testid="switch-auto-login"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Biometric authentication</div>
                  <div className="text-sm text-gray-500">Use fingerprint or face recognition for quick access</div>
                </div>
                <Switch
                  checked={settings.biometricLogin}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, biometricLogin: checked }))}
                  data-testid="switch-biometric-login"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Two-factor authentication</div>
                  <div className="text-sm text-gray-500">Require additional verification for sensitive actions</div>
                </div>
                <Switch
                  checked={settings.twoFactorEnabled}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, twoFactorEnabled: checked }))}
                  data-testid="switch-two-factor"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Trusted devices only</div>
                  <div className="text-sm text-gray-500">Restrict access to explicitly trusted devices</div>
                </div>
                <Switch
                  checked={settings.trustedDevicesOnly}
                  onCheckedChange={(checked) => setSettings(s => ({ ...s, trustedDevicesOnly: checked }))}
                  data-testid="switch-trusted-devices-only"
                />
              </div>
            </CardContent>
          </Card>

          {/* Trusted Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Trusted Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        {device.type === 'mobile' ? (
                          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Monitor className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {device.name}
                          {device.isCurrent && (
                            <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Last used: {new Date(device.lastUsed).toLocaleDateString()}
                          {device.location && ` • ${device.location}`}
                        </div>
                      </div>
                    </div>
                    {!device.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeDeviceMutation.mutate(device.id)}
                        disabled={revokeDeviceMutation.isPending}
                        data-testid={`button-revoke-${device.id}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => updateSettingsMutation.mutate(settings)}
              disabled={updateSettingsMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-save-device-settings"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Device Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ParentDangerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Get current parent profile
  const { data: profiles = [] } = useQuery({
    queryKey: ['/api/profiles/me'],
    enabled: !!(user as any)?.id
  });
  
  const currentProfile = (profiles as any[]).find((p: any) => p.profileType === 'parent');

  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      if (!currentProfile?.id) throw new Error("No profile found");
      const response = await apiRequest(`/api/profiles/${currentProfile.id}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({ 
        title: "Profile Deleted", 
        description: "Your parent profile has been deleted successfully."
      });
      // Invalidate both query keys to ensure profile selection page updates
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/me'] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${(user as any)?.id}`] });
      setLocation("/profile-selection");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Delete Profile", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${(user as any)?.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete account");
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Account Deleted", 
        description: "Your account has been permanently deleted."
      });
      // Redirect to logout or home page
      window.location.href = "/api/logout";
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Delete Account", 
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
              onClick={() => setLocation("/parent-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Danger Zone
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Irreversible account actions
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="text-red-800 dark:text-red-200 text-sm">
              The actions in this section are permanent and cannot be undone. Please proceed with extreme caution.
            </CardContent>
          </Card>

          {/* Profile Deletion */}
          <Card className="border-red-300">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-300">Delete Parent Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Delete only your parent profile while keeping your account and other profiles (like player profiles):</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>This parent profile will be permanently removed</li>
                  <li>Your account and other profiles will remain active</li>
                  <li>You can create a new parent profile anytime</li>
                  <li>Your children's player profiles are not affected</li>
                </ul>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  This will delete only this parent profile, not your entire account.
                </p>
              </div>

              <Button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this parent profile? This action cannot be undone.")) {
                    deleteProfileMutation.mutate();
                  }
                }}
                variant="destructive"
                disabled={deleteProfileMutation.isPending || !currentProfile}
                data-testid="button-delete-parent-profile"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteProfileMutation.isPending ? "Deleting..." : "Delete Parent Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Account Deletion */}
          <Card className="border-red-300">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-300">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Permanently delete your account and all associated data, including:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>All child profiles and their progress data</li>
                  <li>Payment history and billing information</li>
                  <li>Messages and communication history</li>
                  <li>Trophies, badges, and achievements</li>
                  <li>Photos and videos shared within the app</li>
                </ul>
                <p className="font-medium text-red-600 dark:text-red-400">
                  This action cannot be reversed. Your children will lose access to their accounts.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  data-testid="button-delete-account-initial"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              ) : (
                <div className="space-y-4 p-4 bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-lg">
                  <div className="text-sm font-medium text-red-800 dark:text-red-200">
                    Type "DELETE MY ACCOUNT" to confirm account deletion:
                  </div>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE MY ACCOUNT"
                    className="border-red-300 focus:border-red-500"
                    data-testid="input-delete-confirm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => deleteAccountMutation.mutate()}
                      disabled={deleteConfirmText !== "DELETE MY ACCOUNT" || deleteAccountMutation.isPending}
                      variant="destructive"
                      data-testid="button-delete-account-confirm"
                    >
                      {deleteAccountMutation.isPending ? "Deleting..." : "Permanently Delete Account"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      data-testid="button-cancel-delete"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Data */}
          <Card>
            <CardHeader>
              <CardTitle>Export Your Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Download your data</div>
                  <div className="text-sm text-gray-500">Get a copy of all your account data before deletion</div>
                </div>
                <Button
                  variant="outline"
                  data-testid="button-export-data"
                >
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}