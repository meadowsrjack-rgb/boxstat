import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { useEffect, useState } from "react";
import ModeSelection from "@/components/ui/mode-selection";
import PinEntry from "@/components/ui/pin-entry";

// Pages
import Landing from "@/pages/landing";
import ParentDashboard from "@/pages/parent-dashboard";
import PlayerDashboard from "@/pages/player-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import TeamDetails from "@/pages/team-details";
import Schedule from "@/pages/schedule";
import Chat from "@/pages/chat";
import SportsEnginePayment from "@/pages/sportsengine-payment";
import Training from "@/pages/training";
import TrainingLibrary from "@/pages/training-library";
import Profile from "@/pages/profile";
import ManageChildren from "@/pages/manage-children";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  // Temporarily disable useAppMode to fix performance issues
  // const { currentMode, deviceConfig, isLoadingConfig, isLocked, isInitialized } = useAppMode();
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  
  // Temporary values to make app work - check URL for mode override
  const urlParams = new URLSearchParams(window.location.search);
  const modeOverride = urlParams.get('mode');
  const childIdOverride = urlParams.get('childId');
  const currentMode = modeOverride === 'player' ? 'player' : 'parent';
  const selectedChildId = childIdOverride ? parseInt(childIdOverride) : null;
  const deviceConfig = selectedChildId ? { childProfileId: selectedChildId } : null;
  const isLoadingConfig = false;
  const isLocked = false;
  const isInitialized = true;

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }
  }, []);

  // Show mode selection for first-time setup - temporarily disabled
  // Since we disabled useAppMode, we won't show mode selection
  // useEffect(() => {
  //   if (isAuthenticated && !isLoadingConfig && !deviceConfig && isInitialized) {
  //     setShowModeSelection(true);
  //   }
  // }, [isAuthenticated, isLoadingConfig, deviceConfig, isInitialized]);

  if (isLoading || isLoadingConfig || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Route based on user type and app mode
  const getDashboardComponent = () => {
    if (currentMode === 'player') {
      return PlayerDashboard;
    }
    
    switch (user?.role) {
      case "admin":
        return AdminDashboard;
      case "parent":
      default:
        return ParentDashboard;
    }
  };

  return (
    <>
      <Switch>
        <Route path="/" component={getDashboardComponent()} />
        {currentMode === 'parent' && (
          <>
            <Route path="/team" component={TeamDetails} />
            <Route path="/schedule" component={Schedule} />
            <Route path="/chat" component={Chat} />
            <Route path="/payment/:type?" component={SportsEnginePayment} />
            <Route path="/training" component={Training} />
            <Route path="/training-library" component={TrainingLibrary} />
            <Route path="/profile" component={Profile} />
            <Route path="/manage-children" component={ManageChildren} />
            <Route path="/admin" component={AdminDashboard} />
          </>
        )}
        {currentMode === 'player' && (
          <>
            <Route path="/schedule" component={Schedule} />
            <Route path="/chat" component={Chat} />
            <Route path="/training" component={Training} />
            <Route path="/training-library" component={TrainingLibrary} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>

      {/* Temporarily disable mode selection 
      <ModeSelection
        isOpen={showModeSelection}
        onClose={() => setShowModeSelection(false)}
      />
      */}

      <PinEntry
        isOpen={showPinEntry}
        onClose={() => setShowPinEntry(false)}
        onSuccess={() => {
          // Device unlocked, user can now access parent features
        }}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
