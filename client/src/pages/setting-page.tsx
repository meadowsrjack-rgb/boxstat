'use client';

import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface SettingPageProps {
  title: string;
  description: string;
  backPath: string;
  userType: 'player' | 'coach' | 'parent';
  category: string;
}

export default function SettingPage({ 
  title, 
  description, 
  backPath, 
  userType, 
  category 
}: SettingPageProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 safe-bottom">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(backPath)}
              className="text-gray-600 hover:text-gray-900"
              data-testid="button-back-to-settings"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
            <div className="flex-1">
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                {title}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400" data-testid="page-description">
                {description}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    This {category} settings page is currently under development.
                  </div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">
                    Settings for {userType} users will be available here soon.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}