'use client';

import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  Smartphone,
  FileText,
  Globe,
  ChevronRight,
  Users,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Player Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function PlayerSettingsPage() {
  const [, setLocation] = useLocation();

  const settingsItems = [
    { 
      key: "profile", 
      icon: User, 
      label: "Player Profile", 
      description: "Basketball info and personal details",
      path: "/player-settings/profile"
    },
    { 
      key: "privacy", 
      icon: Globe, 
      label: "Privacy", 
      description: "Control your visibility and data sharing",
      path: "/player-settings/privacy"
    },
    { 
      key: "notifications", 
      icon: Bell, 
      label: "Notifications", 
      description: "Manage alerts and communications",
      path: "/player-settings/notifications"
    },
    { 
      key: "security", 
      icon: Shield, 
      label: "Account & Security", 
      description: "Password and device management",
      path: "/player-settings/security"
    },
    { 
      key: "legal", 
      icon: FileText, 
      label: "Legal", 
      description: "Terms, privacy policy, and agreements",
      path: "/player-settings/legal"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/player-dashboard")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-dashboard"
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

        {/* Switch Profile Button */}
        <div className="p-6 pb-0">
          <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm">
                    <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Switch Profile</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Access your other profiles or switch accounts</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setLocation("/profile-selection")}
                  className="bg-white dark:bg-gray-800"
                  data-testid="button-switch-profile"
                >
                  Switch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vertical Settings List */}
        <div className="p-6 space-y-3">
          {settingsItems.map((item) => (
            <Card 
              key={item.key}
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/10"
              onClick={() => setLocation(item.path)}
              data-testid={`settings-item-${item.key}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                    <item.icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}