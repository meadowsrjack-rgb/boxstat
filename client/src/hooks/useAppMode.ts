import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type AppMode = 'parent' | 'player';

export interface DeviceModeConfig {
  id: number;
  deviceId: string;
  parentId: string;
  childProfileId: number | null;
  mode: AppMode;
  isLocked: boolean;
  childProfile?: {
    id: number;
    firstName: string;
    lastName: string;
    teamId: number | null;
    profileImageUrl: string | null;
  };
}

// Generate a simple device fingerprint for browser identification
const generateDeviceId = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  const fingerprint = canvas.toDataURL();
  
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasFingerprint: fingerprint,
  };
  
  return btoa(JSON.stringify(deviceInfo)).substring(0, 32);
};

const DEVICE_ID_KEY = 'uyp_device_id';
const TEMP_MODE_KEY = 'uyp_temp_mode';

export function useAppMode() {
  const { user, isAuthenticated } = useAuth();
  const [currentMode, setCurrentMode] = useState<AppMode>('parent');
  const [deviceId, setDeviceId] = useState<string>('');
  const [tempMode, setTempMode] = useState<AppMode | null>(null);
  const queryClient = useQueryClient();

  // Initialize device ID
  useEffect(() => {
    let storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!storedDeviceId) {
      storedDeviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
    }
    setDeviceId(storedDeviceId);
  }, []);

  // Check for temporary mode override
  useEffect(() => {
    const tempModeData = localStorage.getItem(TEMP_MODE_KEY);
    if (tempModeData) {
      try {
        const parsed = JSON.parse(tempModeData);
        setTempMode(parsed.mode);
      } catch (error) {
        localStorage.removeItem(TEMP_MODE_KEY);
      }
    }
  }, []);

  // Query device mode configuration
  const { data: deviceConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/device-mode-config', deviceId],
    enabled: !!deviceId && !!user,
    onSuccess: (config: DeviceModeConfig) => {
      if (config) {
        setCurrentMode(config.mode);
      }
    },
  });

  // Query child profiles for the current user
  const { data: childProfiles } = useQuery({
    queryKey: ['/api/child-profiles', user?.id],
    enabled: !!user && user.role === 'parent',
  });

  // Mutation to update device mode configuration
  const updateDeviceMode = useMutation({
    mutationFn: async (config: {
      mode: AppMode;
      childProfileId?: number;
      pin?: string;
    }) => {
      return apiRequest('POST', '/api/device-mode-config', {
        deviceId,
        ...config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/device-mode-config', deviceId] });
    },
  });

  // Mutation to verify PIN and unlock device
  const verifyPin = useMutation({
    mutationFn: async (pin: string) => {
      return apiRequest('POST', '/api/device-mode-config/verify-pin', {
        deviceId,
        pin,
      });
    },
    onSuccess: () => {
      setCurrentMode('parent');
      queryClient.invalidateQueries({ queryKey: ['/api/device-mode-config', deviceId] });
    },
  });

  // Set device to Player Mode
  const setPlayerMode = async (childProfileId: number, pin: string) => {
    await updateDeviceMode.mutateAsync({
      mode: 'player',
      childProfileId,
      pin,
    });
  };

  // Set device to Parent Mode
  const setParentMode = async () => {
    await updateDeviceMode.mutateAsync({
      mode: 'parent',
    });
  };

  // Temporarily view as child (Parent preview mode)
  const viewAsChild = (childProfileId: number) => {
    const childProfile = childProfiles?.find((child: any) => child.id === childProfileId);
    if (childProfile) {
      setTempMode('player');
      localStorage.setItem(TEMP_MODE_KEY, JSON.stringify({
        mode: 'player',
        childProfileId,
        isPreview: true,
      }));
    }
  };

  // Exit temporary view mode
  const exitTempMode = () => {
    setTempMode(null);
    localStorage.removeItem(TEMP_MODE_KEY);
  };

  // Unlock device with PIN
  const unlockDevice = async (pin: string) => {
    await verifyPin.mutateAsync(pin);
  };

  // Get current child profile for Player Mode
  const getCurrentChildProfile = () => {
    if (tempMode === 'player') {
      const tempModeData = localStorage.getItem(TEMP_MODE_KEY);
      if (tempModeData) {
        try {
          const parsed = JSON.parse(tempModeData);
          return childProfiles?.find((child: any) => child.id === parsed.childProfileId);
        } catch (error) {
          return null;
        }
      }
    }
    return deviceConfig?.childProfile;
  };

  // Determine effective mode (considering temporary overrides)
  const effectiveMode = tempMode || currentMode;

  return {
    currentMode: effectiveMode,
    deviceConfig,
    childProfiles,
    currentChildProfile: getCurrentChildProfile(),
    isLocked: deviceConfig?.isLocked || false,
    isLoadingConfig,
    isTempMode: !!tempMode,
    // Actions
    setPlayerMode,
    setParentMode,
    viewAsChild,
    exitTempMode,
    unlockDevice,
    // Status
    isUpdating: updateDeviceMode.isPending,
    isVerifying: verifyPin.isPending,
  };
}