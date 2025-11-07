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
  Lock,
  Unlock,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Player Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function PlayerSettingsPage() {
  const [, setLocation] = useLocation();
  const [isDeviceLocked, setIsDeviceLocked] = React.useState(false);

  // Check device lock status on mount
  React.useEffect(() => {
    const checkLockStatus = () => {
      const lockedPlayerId = localStorage.getItem("deviceLockedToPlayer");
      const currentPlayerId = localStorage.getItem("selectedPlayerId");
      setIsDeviceLocked(lockedPlayerId === currentPlayerId && lockedPlayerId !== null);
    };
    
    checkLockStatus();
    
    // Listen for storage changes
    window.addEventListener('storage', checkLockStatus);
    return () => window.removeEventListener('storage', checkLockStatus);
  }, []);
  
  const handleUnlockDevice = () => {
    localStorage.removeItem("deviceLockedToPlayer");
    setIsDeviceLocked(false);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('deviceLockChanged'));
    
    setLocation("/unified-account");
  };

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

        {/* Vertical Settings List */}
        <div className="p-6 space-y-3">
          {/* Device Lock Status Card */}
          {isDeviceLocked && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                    <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-red-900 dark:text-red-100">Device Locked</h3>
                    <p className="text-sm text-red-700 dark:text-red-300">This device is locked to this player's dashboard</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlockDevice}
                    className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                    data-testid="button-unlock-device"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
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