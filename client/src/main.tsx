import { createRoot } from "react-dom/client";
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Wait for Capacitor to be ready (important for plugins loaded from remote server)
async function waitForCapacitor(): Promise<boolean> {
  return new Promise((resolve) => {
    // Check if Capacitor is already available
    if (typeof (window as any).Capacitor !== 'undefined') {
      console.log('✅ Capacitor already available');
      resolve(true);
      return;
    }
    
    // Wait a short time for Capacitor to initialize
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof (window as any).Capacitor !== 'undefined') {
        clearInterval(checkInterval);
        console.log(`✅ Capacitor available after ${attempts * 100}ms`);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.log('⚠️ Capacitor not available after timeout - likely not a native app');
        resolve(false);
      }
    }, 100);
  });
}

// Restore auth session from native storage before app renders (iOS persistence)
async function restoreNativeSession() {
  try {
    await waitForCapacitor();
    
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    console.log(`🔄 Session restore check - Native: ${isNative}, Platform: ${platform}`);
    
    // Also check if Capacitor object exists on window (for remote-loaded apps)
    const capacitorOnWindow = typeof (window as any).Capacitor !== 'undefined';
    console.log(`🔍 Capacitor on window: ${capacitorOnWindow}`);
    
    if (isNative) {
      console.log('🔄 Attempting to restore session from native Preferences...');
      
      // Check if Preferences plugin is available
      if (typeof Preferences === 'undefined' || !Preferences.get) {
        console.error('❌ Preferences plugin not available');
        return;
      }
      
      const tokenResult = await Preferences.get({ key: 'authToken' });
      console.log('🔍 Token result from Preferences:', tokenResult.value ? 'TOKEN_EXISTS' : 'NULL');
      
      if (tokenResult.value) {
        localStorage.setItem('authToken', tokenResult.value);
        console.log('✅ Auth token restored to localStorage, length:', tokenResult.value.length);
      } else {
        console.log('⚠️ No auth token found in native Preferences');
        
        // Try alternative storage key names (in case of migration issues)
        const altResult = await Preferences.get({ key: 'auth_token' });
        if (altResult.value) {
          localStorage.setItem('authToken', altResult.value);
          console.log('✅ Found token in alt key, migrated');
        }
      }
      
      const userResult = await Preferences.get({ key: 'userData' });
      if (userResult.value) {
        localStorage.setItem('userData', userResult.value);
        console.log('✅ User data restored to localStorage');
      }
    } else {
      console.log('ℹ️ Not native platform, skipping Preferences restore');
    }
  } catch (error) {
    console.error('❌ Error restoring native session:', error);
  }
}

// Initialize app
async function initApp() {
  // Restore session first (critical for iOS app restarts)
  await restoreNativeSession();
  
  // Register service worker for PWA functionality
  registerServiceWorker();
  
  // Render the app
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container not found");
  }
  const root = createRoot(container);
  root.render(<App />);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('SW registered: ', registration);

          registration.update();
          setInterval(() => registration.update(), 5 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available, activating...');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });

          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            console.log('New service worker activated, reloading page...');
            window.location.reload();
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });

    fetch('/api/health', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Health check failed');
      })
      .catch(() => {
        console.log('Server unreachable, clearing stale SW caches...');
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.filter((n) => n.startsWith('boxstat-')).forEach((n) => caches.delete(n));
          });
        }
      });
  }
}

// Start the app
initApp();
