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
  Key,
  Link as LinkIcon,
  Users,
  ChevronRight,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Coach Settings Page
──────────────────────────────────────────────────────────────────────────────── */
export default function CoachSettingsPage() {
  const [, setLocation] = useLocation();

  const settingsItems = [
    { 
      key: "profile", 
      icon: User, 
      label: "Profile", 
      description: "Personal information and contact details",
      path: "/coach-settings/profile"
    },
    { 
      key: "privacy", 
      icon: Shield, 
      label: "Privacy", 
      description: "Control your visibility and data sharing",
      path: "/coach-settings/privacy"
    },
    { 
      key: "notifications", 
      icon: Bell, 
      label: "Notifications", 
      description: "Manage alerts and communications",
      path: "/coach-settings/notifications"
    },
    { 
      key: "security", 
      icon: Key, 
      label: "Security", 
      description: "Password and account management",
      path: "/coach-settings/security"
    },
    { 
      key: "connections", 
      icon: LinkIcon, 
      label: "Connections", 
      description: "External apps and integrations",
      path: "/coach-settings/connections"
    },
    { 
      key: "legal", 
      icon: FileText, 
      label: "Legal", 
      description: "Terms, privacy policy, and agreements",
      path: "/coach-settings/legal"
    },
    { 
      key: "danger", 
      icon: AlertTriangle, 
      label: "Account Actions", 
      description: "Delete account and danger zone",
      path: "/coach-settings/danger"
    },
  ];

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900 safe-bottom">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 safe-top">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/coach-dashboard")}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coach Settings</div>
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