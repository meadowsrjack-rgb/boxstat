import { useState, useEffect, useCallback } from 'react';
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
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();



  // Initialize device ID only once
  useEffect(() => {
    if (!isInitialized) {
      let storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!storedDeviceId) {
        storedDeviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
      }
      setDeviceId(storedDeviceId);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Check for temporary mode override only once
  useEffect(() => {
    if (isInitialized) {
      const tempModeData = localStorage.getItem(TEMP_MODE_KEY);
      if (tempModeData) {
        try {
          const parsed = JSON.parse(tempModeData);
          setTempMode(parsed.mode);
        } catch (error) {
          localStorage.removeItem(TEMP_MODE_KEY);
        }
      }
    }
  }, [isInitialized]);

  // Query device mode configuration with proper caching
  const { data: deviceConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/device-mode-config', deviceId],
    enabled: !!deviceId && !!user && isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour  
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: 1,
  });

  // Query child profiles with proper caching
  const { data: childProfiles } = useQuery({
    queryKey: ['/api/child-profiles', user?.id],
    enabled: !!user && isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  // Sync current mode with device config only when data changes
  useEffect(() => {
    if (deviceConfig && deviceConfig.mode !== currentMode) {
      setCurrentMode(deviceConfig.mode);
    }
  }, [deviceConfig?.mode]);

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
  const setPlayerMode = useCallback(async (childProfileId: number, pin: string) => {
    await updateDeviceMode.mutateAsync({
      mode: 'player',
      childProfileId,
      pin,
    });
  }, [updateDeviceMode]);

  // Set device to Parent Mode
  const setParentMode = useCallback(async () => {
    await updateDeviceMode.mutateAsync({
      mode: 'parent',
    });
  }, [updateDeviceMode]);

  // Temporarily view as child (Parent preview mode)
  const viewAsChild = useCallback((childProfileId: number) => {
    const tempData = {
      mode: 'player' as AppMode,
      childProfileId,
      timestamp: Date.now(),
    };
    localStorage.setItem(TEMP_MODE_KEY, JSON.stringify(tempData));
    setTempMode('player');
  }, []);

  // Exit temporary mode
  const exitTempMode = useCallback(() => {
    localStorage.removeItem(TEMP_MODE_KEY);
    setTempMode(null);
  }, []);

  // Get current active mode (temp mode takes precedence)
  const activeMode = tempMode || currentMode;

  // Check if device is locked in player mode
  const isLocked = deviceConfig?.isLocked || false;

  // Get current child profile
  const currentChildProfile = deviceConfig?.childProfile || null;

  return {
    currentMode: activeMode,
    deviceConfig,
    childProfiles,
    isLoadingConfig,
    isLocked,
    currentChildProfile,
    setPlayerMode,
    setParentMode,
    viewAsChild,
    exitTempMode,
    verifyPin,
    isInitialized,
  };
}