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
  CreditCard,
  Smartphone,
  FileText,
  AlertTriangle,
  Link as LinkIcon,
  Globe,
  ChevronRight,
  Users,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Parent Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function ParentSettingsPage() {
  const [, setLocation] = useLocation();

  const settingsItems = [
    { 
      key: "profile", 
      icon: User, 
      label: "Profile", 
      description: "Personal information and preferences",
      path: "/parent-settings/profile"
    },
    { 
      key: "privacy", 
      icon: Globe, 
      label: "Privacy", 
      description: "Control your visibility and data sharing",
      path: "/parent-settings/privacy"
    },
    { 
      key: "notifications", 
      icon: Bell, 
      label: "Notifications", 
      description: "Manage alerts and communications",
      path: "/parent-settings/notifications"
    },
    { 
      key: "security", 
      icon: Shield, 
      label: "Account & Security", 
      description: "Password, 2FA, and device management",
      path: "/parent-settings/security"
    },
    { 
      key: "connections", 
      icon: LinkIcon, 
      label: "Connections", 
      description: "Connected apps and services",
      path: "/parent-settings/connections"
    },
    { 
      key: "legal", 
      icon: FileText, 
      label: "Legal", 
      description: "Terms, privacy policy, and agreements",
      path: "/parent-settings/legal"
    },
    { 
      key: "danger", 
      icon: AlertTriangle, 
      label: "Danger Zone", 
      description: "Account deletion and irreversible actions",
      path: "/parent-settings/danger"
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
              onClick={() => setLocation("/parent-dashboard")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Parent Settings</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Manage your profile and preferences</div>
            </div>
          </div>
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