import { createRoot } from "react-dom/client";
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Restore auth session from native storage before app renders (iOS persistence)
async function restoreNativeSession() {
  if (Capacitor.isNativePlatform()) {
    console.log('🔄 Restoring session from native storage...');
    const { value: token } = await Preferences.get({ key: 'authToken' });
    if (token) {
      localStorage.setItem('authToken', token);
      console.log('✅ Auth token restored to localStorage');
    }
    const { value: userData } = await Preferences.get({ key: 'userData' });
    if (userData) {
      localStorage.setItem('userData', userData);
      console.log('✅ User data restored to localStorage');
    }
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
  // Register service worker for PWA functionality with auto-update
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates immediately and every 5 minutes
          registration.update();
          setInterval(() => registration.update(), 5 * 60 * 1000);
          
          // Handle new service worker installation
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available, reloading...');
                  // Force the new service worker to activate
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
          
          // Reload when new service worker takes control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('New service worker activated, reloading page...');
            window.location.reload();
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

// Start the app
initApp();
