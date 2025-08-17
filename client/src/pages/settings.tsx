import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const TEAM_OPTIONS = ["High School Elite", "JV", "Varsity", "AAU", "Travel"];
const AGE_OPTIONS = ["14", "15", "16", "17", "18"];
const HEIGHT_OPTIONS = ["5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"", "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"", "6'0\"", "6'1\"", "6'2\"", "6'3\"", "6'4\"", "6'5\"", "6'6\"", "6'7\"", "6'8\""];
const POSITION_OPTIONS = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
const JERSEY_OPTIONS = Array.from({ length: 99 }, (_, i) => (i + 1).toString());

interface EditableProfile {
  firstName?: string;
  lastName?: string;
  teamName?: string;
  age?: string;
  height?: string;
  location?: string;
  position?: string;
  jerseyNumber?: string;
}

interface PrivacySettings {
  height: boolean;
  location: boolean;
}

function CityTypeahead({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value || "");
  
  return (
    <div className="w-48 relative">
      <input
        className="w-full text-right border rounded-md px-2 py-1 text-sm"
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [editableProfile, setEditableProfile] = useState<EditableProfile>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    teamName: "",
    age: "",
    height: "",
    location: "",
    position: "",
    jerseyNumber: "",
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    height: true,
    location: true,
  });

  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/users/${user?.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Changes saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
    },
    onError: (e) =>
      toast({
        title: "Save failed",
        description: String(e),
        variant: "destructive",
      }),
  });

  const handleSave = () => {
    updateProfile.mutate({
      ...editableProfile,
      privacySettings,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/player-dashboard")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">First Name</label>
                <Input
                  value={editableProfile.firstName || ""}
                  onChange={(e) => setEditableProfile((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Last Name</label>
                <Input
                  value={editableProfile.lastName || ""}
                  onChange={(e) => setEditableProfile((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Last Name"
                />
              </div>
            </div>

            {/* Team */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Team</label>
              <Select
                value={editableProfile.teamName || ""}
                onValueChange={(v) => setEditableProfile((p) => ({ ...p, teamName: v }))}
              >
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

            {/* Age */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Age</label>
              <Select value={editableProfile.age || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, age: v }))}>
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

            {/* Height with Privacy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Height</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrivacySettings((prev) => ({ ...prev, height: !prev.height }))}
                  className="h-8 px-2"
                >
                  {privacySettings.height ? (
                    <>
                      <Globe className="h-4 w-4 mr-1 text-green-600" />
                      <span className="text-xs text-green-600">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-xs text-gray-500">Private</span>
                    </>
                  )}
                </Button>
              </div>
              <Select value={editableProfile.height || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, height: v }))}>
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

            {/* Location with Privacy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrivacySettings((prev) => ({ ...prev, location: !prev.location }))}
                  className="h-8 px-2"
                >
                  {privacySettings.location ? (
                    <>
                      <Globe className="h-4 w-4 mr-1 text-green-600" />
                      <span className="text-xs text-green-600">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-xs text-gray-500">Private</span>
                    </>
                  )}
                </Button>
              </div>
              <CityTypeahead
                value={editableProfile.location || ""}
                onChange={(city) => setEditableProfile((p) => ({ ...p, location: city }))}
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Position</label>
              <Select value={editableProfile.position || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, position: v }))}>
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

            {/* Jersey Number */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Jersey Number</label>
              <Select value={editableProfile.jerseyNumber || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, jerseyNumber: v }))}>
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

            {/* Save Button */}
            <div className="pt-4">
              <Button 
                onClick={handleSave} 
                disabled={updateProfile.isPending}
                className="w-full"
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}