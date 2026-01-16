import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, X } from 'lucide-react';

interface VersionConfig {
  latestVersion: string;
  minimumVersion: string;
  showSoftPrompt: boolean;
  appStoreUrl: string;
  updateMessage: string;
  forceUpdateMessage: string;
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export function UpdatePrompt() {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: versionConfig } = useQuery<VersionConfig>({
    queryKey: ['/api/app/version'],
    enabled: Capacitor.isNativePlatform(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    async function getAppVersion() {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        const info = await App.getInfo();
        setCurrentVersion(info.version);
      } catch (error) {
        console.error('[UpdatePrompt] Failed to get app version:', error);
      }
    }
    
    getAppVersion();
  }, []);

  useEffect(() => {
    if (!currentVersion || !versionConfig || dismissed) return;
    
    const isBelowMinimum = compareVersions(currentVersion, versionConfig.minimumVersion) < 0;
    const isBelowLatest = compareVersions(currentVersion, versionConfig.latestVersion) < 0;
    
    if (isBelowMinimum) {
      setIsForceUpdate(true);
      setShowPrompt(true);
    } else if (isBelowLatest && versionConfig.showSoftPrompt) {
      const lastDismissed = localStorage.getItem('updatePromptDismissed');
      const dismissedVersion = localStorage.getItem('updatePromptDismissedVersion');
      
      if (lastDismissed && dismissedVersion === versionConfig.latestVersion) {
        const dismissedTime = parseInt(lastDismissed, 10);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (dismissedTime > oneDayAgo) {
          return;
        }
      }
      
      setIsForceUpdate(false);
      setShowPrompt(true);
    }
  }, [currentVersion, versionConfig, dismissed]);

  const handleUpdate = async () => {
    if (versionConfig?.appStoreUrl) {
      try {
        await Browser.open({ url: versionConfig.appStoreUrl });
      } catch (error) {
        console.error('[UpdatePrompt] Failed to open App Store:', error);
        window.open(versionConfig.appStoreUrl, '_blank');
      }
    }
  };

  const handleDismiss = () => {
    if (!isForceUpdate && versionConfig) {
      localStorage.setItem('updatePromptDismissed', Date.now().toString());
      localStorage.setItem('updatePromptDismissedVersion', versionConfig.latestVersion);
      setDismissed(true);
      setShowPrompt(false);
    }
  };

  if (!showPrompt || !versionConfig) return null;

  return (
    <AlertDialog open={showPrompt} onOpenChange={isForceUpdate ? undefined : setShowPrompt}>
      <AlertDialogContent className="max-w-sm mx-4">
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
            <Download className="w-8 h-8 text-red-600" />
          </div>
          <AlertDialogTitle className="text-center">
            {isForceUpdate ? 'Update Required' : 'Update Available'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {isForceUpdate ? versionConfig.forceUpdateMessage : versionConfig.updateMessage}
            {currentVersion && (
              <span className="block mt-2 text-xs text-gray-400">
                Current: v{currentVersion} → Latest: v{versionConfig.latestVersion}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={handleUpdate}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Update Now
          </AlertDialogAction>
          {!isForceUpdate && (
            <AlertDialogCancel
              onClick={handleDismiss}
              className="w-full"
            >
              Remind Me Later
            </AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
