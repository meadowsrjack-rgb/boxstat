'use client';

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Award, Phone, Mail, MapPin, Calendar, Shield, Bell, Link2, CreditCard, FileText, AlertTriangle, Trash2, Camera, Users, MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import SettingPage from "./setting-page";
import TeamRoster from "@/components/TeamRoster";
import PlayerCard from "@/components/PlayerCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const EXPERIENCE_LEVELS = ["0-1 years", "2-3 years", "4-5 years", "6-10 years", "10+ years"];

export function CoachProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch the active profile data
  const { data: activeProfile } = useQuery({
    queryKey: [`/api/profile/${(user as any)?.activeProfileId}`],
    enabled: !!(user as any)?.activeProfileId,
  });

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    city: "",
    coachingExperience: "",
    yearsExperience: "",
    bio: "",
    previousTeams: "",
    playingExperience: "",
    philosophy: "",
  });

  // Update profile state when active profile loads
  React.useEffect(() => {
    if (activeProfile) {
      setProfile({
        firstName: activeProfile.firstName || "",
        lastName: activeProfile.lastName || "",
        phoneNumber: activeProfile.phoneNumber || "",
        email: (user as any)?.email || "",
        city: activeProfile.city || activeProfile.address || "",
        coachingExperience: (activeProfile as any)?.coachingExperience || "",
        yearsExperience: (activeProfile as any)?.yearsExperience || "",
        bio: (activeProfile as any)?.bio || "",
        previousTeams: (activeProfile as any)?.previousTeams || "",
        playingExperience: (activeProfile as any)?.playingExperience || "",
        philosophy: (activeProfile as any)?.philosophy || "",
      });
    }
  }, [activeProfile, user]);

  // Profile picture upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Capture IDs before async operations
      const activeProfileId = (user as any)?.activeProfileId;
      const accountId = (user as any)?.id;
      const targetProfileId = activeProfileId || accountId;
      
      const formData = new FormData();
      formData.append('photo', file);
      // Pass profileId so backend updates the correct user
      const url = `/api/upload-profile-photo?profileId=${targetProfileId}`;
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return { result: await response.json(), activeProfileId, accountId };
    },
    onSuccess: async ({ activeProfileId, accountId }) => {
      toast({ title: "Success", description: "Profile photo updated successfully!" });
      
      try {
        // Refetch and update profile data immediately
        const response = await fetch(`/api/profile/${activeProfileId}`, { credentials: 'include' });
        if (response.ok) {
          const updatedProfile = await response.json();
          // Directly update the cache with fresh data
          queryClient.setQueryData([`/api/profile/${activeProfileId}`], updatedProfile);
        } else {
          // Fallback to invalidation with refetch if fetch fails
          await queryClient.invalidateQueries({ 
            queryKey: [`/api/profile/${activeProfileId}`],
            refetchType: 'active'
          });
        }
      } catch {
        // Fallback to invalidation with refetch on error
        await queryClient.invalidateQueries({ 
          queryKey: [`/api/profile/${activeProfileId}`],
          refetchType: 'active'
        });
      }
      
      // Invalidate PlayerCard and other caches with forced refetch
      await queryClient.invalidateQueries({ queryKey: [`/api/players/${activeProfileId}/profile`], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['/api/profiles/me'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: [`/api/profiles/${accountId}`], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ["/api/account/players"], refetchType: 'active' });
      
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
      const updateData = {
        ...data,
        address: data.city,
      };
      
      const response = await fetch(`/api/profile/${(user as any)?.activeProfileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update coach profile");
      return response.json();
    },
    onSuccess: (updatedProfile) => {
      setProfile({
        firstName: updatedProfile.firstName || "",
        lastName: updatedProfile.lastName || "",
        phoneNumber: updatedProfile.phoneNumber || "",
        email: (user as any)?.email || "",
        city: updatedProfile.city || updatedProfile.address || "",
        coachingExperience: updatedProfile.coachingExperience || "",
        yearsExperience: updatedProfile.yearsExperience || "",
        bio: updatedProfile.bio || "",
        previousTeams: updatedProfile.previousTeams || "",
        playingExperience: updatedProfile.playingExperience || "",
        philosophy: updatedProfile.philosophy || "",
      });
      
      // Update caches with new data for immediate UI sync
      const activeProfileId = (user as any)?.activeProfileId;
      const accountId = (user as any)?.id;
      
      // Directly set the updated profile data in all relevant caches
      queryClient.setQueryData([`/api/profile/${activeProfileId}`], updatedProfile);
      
      // Force refetch for PlayerCard and other views
      queryClient.invalidateQueries({ queryKey: [`/api/players/${activeProfileId}/profile`] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/me'] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${accountId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({ 
        title: "Saved", 
        description: "Your profile changes have been saved."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Save", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    },
  });

  const handleSaveChanges = () => {
    mutation.mutate(profile);
  };

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/unified-account")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-account"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Account
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Coach Profile
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Personal information and coaching credentials
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
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarImage 
                    src={previewUrl || (user as any)?.profileImageUrl} 
                    alt="Profile"
                    className="object-cover w-full h-full"
                  />
                  <AvatarFallback className="text-sm font-bold bg-gray-300 dark:bg-gray-600">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                  City
                </label>
                <Input
                  value={profile.city}
                  onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                  placeholder="Enter your city"
                  data-testid="input-city"
                />
              </div>
            </CardContent>
          </Card>

          {/* Coaching Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Coaching Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Years of Experience</label>
                <Select value={profile.yearsExperience} onValueChange={(value) => setProfile(p => ({ ...p, yearsExperience: value }))}>
                  <SelectTrigger data-testid="select-years-experience">
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Coaching Bio</label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell players and parents about your coaching background and approach"
                  rows={4}
                  data-testid="textarea-bio"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">This will be visible to players and parents</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Previous Teams/Organizations</label>
                <Textarea
                  value={profile.previousTeams}
                  onChange={(e) => setProfile(p => ({ ...p, previousTeams: e.target.value }))}
                  placeholder="List previous teams or organizations you've coached"
                  rows={3}
                  data-testid="textarea-previous-teams"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Playing Experience</label>
                <Textarea
                  value={profile.playingExperience}
                  onChange={(e) => setProfile(p => ({ ...p, playingExperience: e.target.value }))}
                  placeholder="Describe your playing background"
                  rows={3}
                  data-testid="textarea-playing-experience"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Coaching Philosophy</label>
                <Textarea
                  value={profile.philosophy}
                  onChange={(e) => setProfile(p => ({ ...p, philosophy: e.target.value }))}
                  placeholder="Share your coaching philosophy and what's important to you"
                  rows={4}
                  data-testid="textarea-philosophy"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pb-6">
            <Button
              onClick={handleSaveChanges}
              disabled={mutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white px-8"
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

export function CoachCoachingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [coaching, setCoaching] = useState({
    specialties: (user as any)?.specialties?.join(", ") || "",
    coachingLicense: (user as any)?.coachingLicense || "",
    availability: (user as any)?.availability || "",
    ageGroups: (user as any)?.ageGroups?.join(", ") || "",
    coachingStyle: (user as any)?.coachingStyle || "",
    emergencyContact: (user as any)?.emergencyContact || "",
    emergencyPhone: (user as any)?.emergencyPhone || "",
    medicalCertifications: (user as any)?.medicalCertifications?.join(", ") || "",
    languages: (user as any)?.languages?.join(", ") || "",
  });

  const SPECIALTIES = ["Offense", "Defense", "Ball Handling", "Shooting", "Conditioning", "Mental Training", "Game Strategy", "Player Development"];
  const AGE_GROUPS = ["U8", "U10", "U12", "U14", "U16", "U18", "Adult", "All Ages"];
  const COACHING_STYLES = ["Instructional", "Motivational", "Disciplinary", "Supportive", "Competitive", "Developmental"];

  const mutation = useMutation({
    mutationFn: async (data: typeof coaching) => {
      const updateData = {
        ...data,
        specialties: data.specialties.split(",").map((s: string) => s.trim()).filter(Boolean),
        ageGroups: data.ageGroups.split(",").map((a: string) => a.trim()).filter(Boolean),
        medicalCertifications: data.medicalCertifications.split(",").map((c: string) => c.trim()).filter(Boolean),
        languages: data.languages.split(",").map((l: string) => l.trim()).filter(Boolean),
      };
      
      const response = await fetch(`/api/profile/${(user as any)?.activeProfileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      if (!response.ok) throw new Error("Failed to update coaching info");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      setCoaching({
        specialties: updatedUser.specialties?.join(", ") || "",
        coachingLicense: updatedUser.coachingLicense || "",
        availability: updatedUser.availability || "",
        ageGroups: updatedUser.ageGroups?.join(", ") || "",
        coachingStyle: updatedUser.coachingStyle || "",
        emergencyContact: updatedUser.emergencyContact || "",
        emergencyPhone: updatedUser.emergencyPhone || "",
        medicalCertifications: updatedUser.medicalCertifications?.join(", ") || "",
        languages: updatedUser.languages?.join(", ") || "",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${(user as any)?.id}`] });
      
      toast({ 
        title: "Saved", 
        description: "Your changes have been saved."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Save", 
        description: error?.message || "Please try again.",
        variant: "destructive" 
      });
    },
  });

  // Auto-save on field blur
  const handleFieldBlur = () => {
    mutation.mutate(coaching);
  };

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Coaching Information
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Coaching experience and qualifications
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Availability & Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Availability & Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Availability</label>
                <Textarea
                  value={coaching.availability}
                  onChange={(e) => setCoaching(p => ({ ...p, availability: e.target.value }))}
                  onBlur={handleFieldBlur}
                  placeholder="Describe your general availability (days, times, etc.)"
                  rows={3}
                  data-testid="textarea-availability"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Name</label>
                  <Input
                    value={coaching.emergencyContact}
                    onChange={(e) => setCoaching(p => ({ ...p, emergencyContact: e.target.value }))}
                    onBlur={handleFieldBlur}
                    placeholder="Emergency contact person"
                    data-testid="input-emergency-contact"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Emergency Contact Phone</label>
                  <Input
                    value={coaching.emergencyPhone}
                    onChange={(e) => setCoaching(p => ({ ...p, emergencyPhone: e.target.value }))}
                    onBlur={handleFieldBlur}
                    placeholder="Emergency contact phone"
                    data-testid="input-emergency-phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Medical/Safety Certifications</label>
                <Input
                  value={coaching.medicalCertifications}
                  onChange={(e) => setCoaching(p => ({ ...p, medicalCertifications: e.target.value }))}
                  onBlur={handleFieldBlur}
                  placeholder="First Aid, CPR, etc. (comma separated)"
                  data-testid="input-medical-certs"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Languages Spoken</label>
                <Input
                  value={coaching.languages}
                  onChange={(e) => setCoaching(p => ({ ...p, languages: e.target.value }))}
                  onBlur={handleFieldBlur}
                  placeholder="Languages (comma separated)"
                  data-testid="input-languages"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CoachPrivacyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    contactVisible: true,
    scheduleVisible: true,
    allowMessages: true,
    allowPhoneCalls: false,
    shareWithParents: true,
    shareWithOtherCoaches: true,
    dataSharing: true,
  });

  // Fetch current privacy settings
  const { data: privacySettings } = useQuery({
    queryKey: ['/api/privacy'],
    select: (data: any) => data || {},
  });

  React.useEffect(() => {
    if (privacySettings) {
      setPrivacy({
        profileVisible: privacySettings.profileVisible ?? true,
        contactVisible: privacySettings.contactVisible ?? true,
        scheduleVisible: privacySettings.scheduleVisible ?? true,
        allowMessages: privacySettings.allowMessages ?? true,
        allowPhoneCalls: privacySettings.allowPhoneCalls ?? false,
        shareWithParents: privacySettings.shareWithParents ?? true,
        shareWithOtherCoaches: privacySettings.shareWithOtherCoaches ?? true,
        dataSharing: privacySettings.dataSharing ?? true,
      });
    }
  }, [privacySettings]);

  const mutation = useMutation({
    mutationFn: async (settings: typeof privacy) => {
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

  const ToggleRow = ({ label, description, checked, onChange, testId }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) => (
    <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} className="ml-4" />
    </div>
  );

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
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
                Control your visibility and data sharing
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <ToggleRow 
                label="Coach Profile Visible" 
                description="Allow players, parents, and other coaches to view your profile"
                checked={privacy.profileVisible} 
                onChange={(v) => { setPrivacy(p => ({ ...p, profileVisible: v })); mutation.mutate({ ...privacy, profileVisible: v }); }}
                testId="switch-profile-visible"
              />
              <ToggleRow 
                label="Contact Information Visible" 
                description="Show your contact details to team members"
                checked={privacy.contactVisible} 
                onChange={(v) => { setPrivacy(p => ({ ...p, contactVisible: v })); mutation.mutate({ ...privacy, contactVisible: v }); }}
                testId="switch-contact-visible"
              />
              <ToggleRow 
                label="Schedule Information Visible" 
                description="Allow others to see your coaching schedule and availability"
                checked={privacy.scheduleVisible} 
                onChange={(v) => { setPrivacy(p => ({ ...p, scheduleVisible: v })); mutation.mutate({ ...privacy, scheduleVisible: v }); }}
                testId="switch-schedule-visible"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <ToggleRow 
                label="Allow Messages" 
                description="Receive messages from players and parents through the app"
                checked={privacy.allowMessages} 
                onChange={(v) => { setPrivacy(p => ({ ...p, allowMessages: v })); mutation.mutate({ ...privacy, allowMessages: v }); }}
                testId="switch-allow-messages"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface CoachNotificationPrefs {
  teamUpdates: boolean;
  eventChanges: boolean;
  playerCheckIn: boolean;
  playerRsvp: boolean;
  teamMessages: boolean;
  playerAwards: boolean;
  playerProgress: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export function CoachNotificationsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<CoachNotificationPrefs>({
    teamUpdates: true,
    eventChanges: true,
    playerCheckIn: true,
    playerRsvp: true,
    teamMessages: true,
    playerAwards: true,
    playerProgress: true,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  // Fetch notification preferences
  const { data: notificationPrefs } = useQuery<Partial<CoachNotificationPrefs>>({
    queryKey: ['/api/notifications/preferences'],
  });

  React.useEffect(() => {
    if (notificationPrefs) {
      setPrefs({
        teamUpdates: notificationPrefs.teamUpdates ?? true,
        eventChanges: notificationPrefs.eventChanges ?? true,
        playerCheckIn: notificationPrefs.playerCheckIn ?? true,
        playerRsvp: notificationPrefs.playerRsvp ?? true,
        teamMessages: notificationPrefs.teamMessages ?? true,
        playerAwards: notificationPrefs.playerAwards ?? true,
        playerProgress: notificationPrefs.playerProgress ?? true,
        pushNotifications: notificationPrefs.pushNotifications ?? true,
        emailNotifications: notificationPrefs.emailNotifications ?? true,
        smsNotifications: notificationPrefs.smsNotifications ?? false,
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

  const ToggleRow = ({ label, description, checked, onChange, testId }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) => (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} className="ml-4" />
    </div>
  );

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
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
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Team Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Team Updates" 
                description="When a player sets one of your teams as their team"
                checked={prefs.teamUpdates} 
                onChange={(v) => setPrefs((p) => ({ ...p, teamUpdates: v }))}
                testId="switch-team-updates"
              />
              <ToggleRow 
                label="Event Changes" 
                description="Any changes to events in the calendar that you can see"
                checked={prefs.eventChanges} 
                onChange={(v) => setPrefs((p) => ({ ...p, eventChanges: v }))}
                testId="switch-event-changes"
              />
              <ToggleRow 
                label="Player Check-In Alerts" 
                description="When players in your roster check in to events"
                checked={prefs.playerCheckIn} 
                onChange={(v) => setPrefs((p) => ({ ...p, playerCheckIn: v }))}
                testId="switch-player-checkin"
              />
              <ToggleRow 
                label="Player RSVP Alerts" 
                description="When players in your roster RSVP to events"
                checked={prefs.playerRsvp} 
                onChange={(v) => setPrefs((p) => ({ ...p, playerRsvp: v }))}
                testId="switch-player-rsvp"
              />
              <ToggleRow 
                label="Team Messages" 
                description="Notifications for messages in teams you're a part of"
                checked={prefs.teamMessages} 
                onChange={(v) => setPrefs((p) => ({ ...p, teamMessages: v }))}
                testId="switch-team-messages"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Player Development</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Player Awards" 
                description="When players earn badges or trophies"
                checked={prefs.playerAwards} 
                onChange={(v) => setPrefs((p) => ({ ...p, playerAwards: v }))}
                testId="switch-player-awards"
              />
              <ToggleRow 
                label="Player Progress" 
                description="When players make progress toward achievements"
                checked={prefs.playerProgress} 
                onChange={(v) => setPrefs((p) => ({ ...p, playerProgress: v }))}
                testId="switch-player-progress"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow 
                label="Push Notifications" 
                description="Receive push notifications on your mobile device"
                checked={prefs.pushNotifications} 
                onChange={(v) => setPrefs((p) => ({ ...p, pushNotifications: v }))}
                testId="switch-push-notifications"
              />
              <ToggleRow 
                label="Email Notifications" 
                description="Receive notifications via email"
                checked={prefs.emailNotifications} 
                onChange={(v) => setPrefs((p) => ({ ...p, emailNotifications: v }))}
                testId="switch-email-notifications"
              />
              <ToggleRow 
                label="SMS Notifications" 
                description="Receive critical notifications via text message"
                checked={prefs.smsNotifications} 
                onChange={(v) => setPrefs((p) => ({ ...p, smsNotifications: v }))}
                testId="switch-sms-notifications"
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              onClick={() => mutation.mutate()} 
              disabled={mutation.isPending}
              className="px-8"
              data-testid="button-save-notifications"
            >
              {mutation.isPending ? "Saving Settings..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoachSecurityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState([
    { id: 1, name: "iPhone 14", lastActive: "2025-09-15", current: true },
    { id: 2, name: "MacBook Pro", lastActive: "2025-09-14", current: false },
  ]);

  const passwordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update password");
      return response.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to update 2FA settings");
      return response.json();
    },
    onSuccess: (data) => {
      setTwoFactorEnabled(data.enabled);
      toast({ title: data.enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled" });
    },
    onError: () => {
      toast({ title: "Failed to update 2FA settings", variant: "destructive" });
    },
  });

  const removeTrustedDevice = async (deviceId: number) => {
    setTrustedDevices(devices => devices.filter(d => d.id !== deviceId));
    toast({ title: "Device removed from trusted devices" });
  };

  const isPasswordFormValid = passwordForm.currentPassword && passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 8;

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Security Settings
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Password and account security management
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
                <Shield className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  data-testid="input-new-password"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Password must be at least 8 characters long</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  data-testid="input-confirm-password"
                />
              </div>
              
              <Button 
                onClick={() => passwordMutation.mutate(passwordForm)}
                disabled={!isPasswordFormValid || passwordMutation.isPending}
                data-testid="button-change-password"
              >
                {passwordMutation.isPending ? "Updating Password..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Two-Factor Authentication (2FA)</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={(checked) => {
                    setTwoFactorEnabled(checked);
                    twoFactorMutation.mutate(checked);
                  }}
                  data-testid="switch-2fa"
                />
              </div>
              
              {twoFactorEnabled && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Two-factor authentication is enabled. You'll need to use an authenticator app to sign in.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" data-testid="button-2fa-setup">
                    View Recovery Codes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trusted Devices */}
          <Card>
            <CardHeader>
              <CardTitle>Trusted Devices</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Devices that you've used to sign in to your account</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {device.name}
                        {device.current && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>}
                      </div>
                      <div className="text-xs text-gray-500">Last active: {device.lastActive}</div>
                    </div>
                  </div>
                  {!device.current && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeTrustedDevice(device.id)}
                      data-testid={`button-remove-device-${device.id}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm">Last login</span>
                  <span className="text-sm text-gray-500">September 15, 2025 - 11:43 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm">Password changed</span>
                  <span className="text-sm text-gray-500">September 10, 2025</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm">Account created</span>
                  <span className="text-sm text-gray-500">August 1, 2025</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Management */}
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Log Out</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sign out of your account on this device</p>
                </div>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-800 border-red-300 hover:bg-red-50"
                  onClick={() => window.location.href = "/api/logout"}
                  data-testid="button-logout"
                >
                  Log Out
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Sign Out All Devices</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This will sign you out of all devices except this one</p>
                </div>
                <Button
                  variant="outline"
                  className="text-orange-600 hover:text-orange-800 border-orange-300 hover:bg-orange-50"
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

export function CoachConnectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [connections, setConnections] = useState({
    googleCalendar: false,
    slack: false,
    zoom: false,
    stripeConnect: false,
    syncEnabled: true,
  });

  // Fetch current connection settings
  const { data: connectionSettings } = useQuery({
    queryKey: ['/api/connections'],
    select: (data: any) => data || {},
  });

  React.useEffect(() => {
    if (connectionSettings) {
      setConnections({
        googleCalendar: connectionSettings.googleCalendar ?? false,
        slack: connectionSettings.slack ?? false,
        zoom: connectionSettings.zoom ?? false,
        stripeConnect: connectionSettings.stripeConnect ?? false,
        syncEnabled: connectionSettings.syncEnabled ?? true,
      });
    }
  }, [connectionSettings]);

  const toggleConnection = async (service: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/connections/${service}`, {
        method: enabled ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) throw new Error(`Failed to ${enabled ? 'connect' : 'disconnect'} ${service}`);
      
      setConnections(prev => ({ ...prev, [service]: enabled }));
      toast({ 
        title: `${service} ${enabled ? 'Connected' : 'Disconnected'}`, 
        description: `Successfully ${enabled ? 'connected to' : 'disconnected from'} ${service}` 
      });
    } catch (error: any) {
      toast({ 
        title: `Connection Error`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const ConnectionCard = ({ title, description, icon, service, connected, testId }: { 
    title: string; description: string; icon: React.ReactNode; service: string; connected: boolean; testId: string 
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
              {connected && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
                </div>
              )}
            </div>
          </div>
          <Button 
            variant={connected ? "outline" : "default"}
            onClick={() => toggleConnection(service, !connected)}
            data-testid={testId}
          >
            {connected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Connections & Integrations
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
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Calendar Integrations</h2>
            <div className="space-y-4">
              <ConnectionCard
                title="Google Calendar"
                description="Export your visible BoxStat events to your personal Google Calendar"
                icon={<Calendar className="h-5 w-5" />}
                service="googleCalendar"
                connected={connections.googleCalendar}
                testId="button-google-calendar"
              />
            </div>
          </div>

          {/* Communication Tools */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Communication Tools</h2>
            <div className="space-y-4">
              <ConnectionCard
                title="Slack"
                description="Receive team notifications and updates in your Slack workspace"
                icon={<Link2 className="h-5 w-5" />}
                service="slack"
                connected={connections.slack}
                testId="button-slack"
              />
              <ConnectionCard
                title="Zoom"
                description="Schedule and manage team meetings with Zoom integration"
                icon={<Link2 className="h-5 w-5" />}
                service="zoom"
                connected={connections.zoom}
                testId="button-zoom"
              />
            </div>
          </div>

          {/* Payment Processing */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Payment Processing</h2>
            <div className="space-y-4">
              <ConnectionCard
                title="Stripe Connect"
                description="Receive direct payments for private coaching and camps"
                icon={<CreditCard className="h-5 w-5" />}
                service="stripeConnect"
                connected={connections.stripeConnect}
                testId="button-stripe"
              />
            </div>
          </div>

          {/* Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Auto-sync Data</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically sync schedule and attendance data with connected services</p>
                </div>
                <Switch
                  checked={connections.syncEnabled}
                  onCheckedChange={(checked) => setConnections(prev => ({ ...prev, syncEnabled: checked }))}
                  data-testid="switch-auto-sync"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CoachBillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [billing, setBilling] = useState({
    paypalEmail: (user as any)?.paypalEmail || "",
    venmoUsername: (user as any)?.venmoUsername || "",
    bankAccount: (user as any)?.bankAccount || "",
    routingNumber: (user as any)?.routingNumber || "",
    taxId: (user as any)?.taxId || "",
    hourlyRate: (user as any)?.hourlyRate || "",
    invoicePrefix: (user as any)?.invoicePrefix || "COACH",
    autoInvoicing: true,
  });

  const [paymentMethods] = useState([
    { id: 1, type: "PayPal", email: "coach@example.com", isDefault: true },
    { id: 2, type: "Bank Account", last4: "1234", isDefault: false },
  ]);

  const [recentTransactions] = useState([
    { id: 1, date: "2025-09-10", description: "Private lesson - John Smith", amount: 75, status: "paid" },
    { id: 2, date: "2025-09-08", description: "Team camp - Eagles", amount: 200, status: "pending" },
    { id: 3, date: "2025-09-05", description: "Skills training - Sarah Johnson", amount: 50, status: "paid" },
  ]);

  const mutation = useMutation({
    mutationFn: async (data: typeof billing) => {
      const response = await fetch(`/api/users/${(user as any)?.id}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update billing information");
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Billing Information Updated", 
        description: "Your payment and billing settings have been saved."
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Billing", 
        description: error?.message || "Please try again later.",
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
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
                Manage payment methods and billing settings
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">PayPal Email</label>
                  <Input
                    type="email"
                    value={billing.paypalEmail}
                    onChange={(e) => setBilling(p => ({ ...p, paypalEmail: e.target.value }))}
                    placeholder="your@paypal.com"
                    data-testid="input-paypal-email"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Venmo Username</label>
                  <Input
                    value={billing.venmoUsername}
                    onChange={(e) => setBilling(p => ({ ...p, venmoUsername: e.target.value }))}
                    placeholder="@your-venmo"
                    data-testid="input-venmo"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Account Number</label>
                  <Input
                    value={billing.bankAccount}
                    onChange={(e) => setBilling(p => ({ ...p, bankAccount: e.target.value }))}
                    placeholder="Account number"
                    data-testid="input-bank-account"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Routing Number</label>
                  <Input
                    value={billing.routingNumber}
                    onChange={(e) => setBilling(p => ({ ...p, routingNumber: e.target.value }))}
                    placeholder="Routing number"
                    data-testid="input-routing-number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax ID / SSN</label>
                <Input
                  value={billing.taxId}
                  onChange={(e) => setBilling(p => ({ ...p, taxId: e.target.value }))}
                  placeholder="Tax ID or Social Security Number"
                  data-testid="input-tax-id"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Required for tax reporting purposes</p>
              </div>
            </CardContent>
          </Card>

          {/* Coaching Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Coaching Rates & Invoicing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hourly Rate ($)</label>
                  <Input
                    type="number"
                    value={billing.hourlyRate}
                    onChange={(e) => setBilling(p => ({ ...p, hourlyRate: e.target.value }))}
                    placeholder="75"
                    data-testid="input-hourly-rate"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Prefix</label>
                  <Input
                    value={billing.invoicePrefix}
                    onChange={(e) => setBilling(p => ({ ...p, invoicePrefix: e.target.value }))}
                    placeholder="COACH"
                    data-testid="input-invoice-prefix"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">e.g., COACH-001, COACH-002</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="text-md font-medium">Auto-generate Invoices</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically create invoices after coaching sessions</p>
                </div>
                <Switch
                  checked={billing.autoInvoicing}
                  onCheckedChange={(checked) => setBilling(p => ({ ...p, autoInvoicing: checked }))}
                  data-testid="switch-auto-invoicing"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{transaction.description}</div>
                      <div className="text-xs text-gray-500">{transaction.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${transaction.amount}</div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        transaction.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" data-testid="button-view-all-transactions">
                  View All Transactions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              onClick={() => mutation.mutate(billing)} 
              disabled={mutation.isPending}
              className="px-8"
              data-testid="button-save-billing"
            >
              {mutation.isPending ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoachDevicesPage() {
  return (
    <SettingPage 
      title="Devices"
      description="Trusted devices and app permissions"
      backPath="/coach-settings"
      userType="coach"
      category="devices"
    />
  );
}

export function CoachLegalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [agreements, setAgreements] = useState({
    coachingAgreement: false,
    liabilityWaiver: false,
    backgroundCheck: false,
    safeSportTrained: false,
    privacyPolicy: false,
    codeOfConduct: false,
  });

  const [documents] = useState([
    { 
      id: 'coaching-agreement', 
      title: 'Coaching Service Agreement', 
      description: 'Terms and conditions for coaching services',
      required: true,
      signed: true,
      signedDate: '2025-08-01'
    },
    { 
      id: 'liability-waiver', 
      title: 'Liability Waiver', 
      description: 'Release of liability for coaching activities',
      required: true,
      signed: true,
      signedDate: '2025-08-01'
    },
    { 
      id: 'background-check', 
      title: 'Background Check Authorization', 
      description: 'Consent for background check verification',
      required: true,
      signed: false,
      signedDate: null
    },
    { 
      id: 'safe-sport', 
      title: 'SafeSport Training Certificate', 
      description: 'Completion of mandatory SafeSport education',
      required: true,
      signed: false,
      signedDate: null
    },
    { 
      id: 'code-of-conduct', 
      title: 'Coach Code of Conduct', 
      description: 'Ethical guidelines and professional behavior standards',
      required: true,
      signed: true,
      signedDate: '2025-08-01'
    }
  ]);

  // Fetch current legal agreements
  const { data: legalStatus } = useQuery({
    queryKey: ['/api/legal/status'],
    select: (data: any) => data || {},
  });

  React.useEffect(() => {
    if (legalStatus) {
      setAgreements({
        coachingAgreement: legalStatus.coachingAgreement ?? false,
        liabilityWaiver: legalStatus.liabilityWaiver ?? false,
        backgroundCheck: legalStatus.backgroundCheck ?? false,
        safeSportTrained: legalStatus.safeSportTrained ?? false,
        privacyPolicy: legalStatus.privacyPolicy ?? false,
        codeOfConduct: legalStatus.codeOfConduct ?? false,
      });
    }
  }, [legalStatus]);

  const signDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/legal/sign/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to sign document");
      
      toast({ 
        title: "Document Signed", 
        description: "Your signature has been recorded." 
      });
    } catch (error: any) {
      toast({ 
        title: "Signing Error", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const downloadDocument = (documentId: string, title: string) => {
    // Simulate document download
    toast({ 
      title: "Download Started", 
      description: `Downloading ${title}...` 
    });
  };

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Legal Documents & Agreements
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                Manage coaching agreements and legal compliance
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">Agreements</span>
                  </div>
                  <div className="text-2xl font-bold">3/3</div>
                  <div className="text-xs text-gray-500">Required agreements signed</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span className="text-sm font-medium">Certifications</span>
                  </div>
                  <div className="text-2xl font-bold">1/2</div>
                  <div className="text-xs text-gray-500">Required certifications</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm font-medium">Background Check</span>
                  </div>
                  <div className="text-2xl font-bold">0/1</div>
                  <div className="text-xs text-gray-500">Verification pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Legal Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full ${
                        doc.signed ? 'bg-green-100 text-green-600' : doc.required ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{doc.description}</p>
                        {doc.signed && doc.signedDate && (
                          <p className="text-xs text-green-600 mt-1">Signed on {doc.signedDate}</p>
                        )}
                        {!doc.signed && doc.required && (
                          <p className="text-xs text-red-600 mt-1">Signature required</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc.id, doc.title)}
                        data-testid={`button-download-${doc.id}`}
                      >
                        View
                      </Button>
                      {!doc.signed && (
                        <Button
                          size="sm"
                          onClick={() => signDocument(doc.id)}
                          data-testid={`button-sign-${doc.id}`}
                        >
                          Sign
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Important Notices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Important Notices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Background Check Required</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    You must complete a background check authorization to continue coaching. This is required for all youth sports coaches.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">SafeSport Training</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Complete your SafeSport training to stay compliant with league requirements. Training must be renewed annually.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" data-testid="button-safesport-training">
                    Start Training
                  </Button>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Document Retention</h4>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                    All signed documents are stored securely and maintained for legal compliance. You can request copies at any time.
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

export function CoachDangerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get current coach profile
  const { data: profiles = [] } = useQuery({
    queryKey: ['/api/profiles/me'],
    enabled: !!(user as any)?.id
  });
  
  const currentProfile = (profiles as any[]).find((p: any) => p.profileType === 'coach');

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
        description: "Your coach profile has been deleted successfully."
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

  return (
    <div className="min-h-screen-safe bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-settings")}
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
                Irreversible profile actions
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
              <CardTitle className="text-red-700 dark:text-red-300">Delete Coach Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Delete only your coach profile while keeping your account and other profiles:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>This coach profile will be permanently removed</li>
                  <li>Your team rosters and player evaluations will be reassigned</li>
                  <li>Your coaching history and statistics will be archived</li>
                  <li>Your account and other profiles will remain active</li>
                  <li>You can create a new coach profile anytime</li>
                </ul>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  This will delete only this coach profile, not your entire account.
                </p>
              </div>

              <Button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this coach profile? This action cannot be undone.")) {
                    deleteProfileMutation.mutate();
                  }
                }}
                variant="destructive"
                disabled={deleteProfileMutation.isPending || !currentProfile}
                data-testid="button-delete-coach-profile"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteProfileMutation.isPending ? "Deleting..." : "Delete Coach Profile"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}