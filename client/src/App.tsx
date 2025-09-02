import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// Pages
import Teams from "@/pages/teams";
import PrivacySettingsPage from "@/pages/privacy";
import Landing from "@/pages/landing";
import AccountSetup from "@/pages/account-setup";
import ParentDashboard from "@/pages/parent-dashboard";
import PlayerDashboard from "@/pages/player-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import CoachDashboard from "@/pages/coach-dashboard";
import SearchPage from "@/pages/search";
import TeamDetailPage from "@/pages/team-detail";
import PlayerDetailPage from "@/pages/player-detail";
import TeamDetails from "@/pages/team-details";
import Schedule from "@/pages/schedule";
import Chat from "@/pages/chat";

import RosterManagement from "@/pages/roster-management";
import ScheduleRequests from "@/pages/schedule-requests";
import Training from "@/pages/training";
import TrainingLibrary from "@/pages/training-library";
import Profile from "@/pages/profile";
import FamilyManagement from "@/pages/family-management";
import CoachTeamMessages from "@/pages/coach-team-messages";
import CoachParentMessages from "@/pages/coach-parent-messages";
import PlayerTeamChat from "@/pages/player-team-chat";
import SettingsPage from "@/pages/settings";
import ParentSettingsPage from "@/pages/parent-settings";
import PlayerSettingsPage from "@/pages/player-settings";
import CoachSettingsPage from "@/pages/coach-settings";
import TrophiesBadges from "@/pages/trophies-badges";
import Skills from "@/pages/skills";
import TestRoute from "@/pages/test-route";
import NotFound from "@/pages/not-found";
import ProfileSelection from "@/pages/profile-selection";
import CreateProfile from "@/pages/create-profile";
import CalendarSync from "@/pages/calendar-sync";
import PhotoUpload from "@/pages/photo-upload";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

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

    // Add global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading UYP Basketball...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show landing page
  if (!isAuthenticated || !user) {
    return (
      <Switch>
        <Route path="/privacy" component={PrivacySettingsPage} />
        <Route path="/teams" component={Teams} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Check if user needs profile setup
  const needsProfileSetup = !(user as any)?.profileCompleted;

  if (needsProfileSetup) {
    return (
      <Switch>
        <Route path="/privacy" component={PrivacySettingsPage} />
        <Route path="/teams" component={Teams} />
        <Route path="/profile-selection" component={ProfileSelection} />
        <Route path="/create-profile" component={CreateProfile} />
        <Route component={ProfileSelection} />
      </Switch>
    );
  }

  // User is authenticated and has completed profile setup
  return (
    <Switch>
      <Route path="/privacy" component={PrivacySettingsPage} />
      <Route path="/teams" component={Teams} />

      {/* Main dashboard route - redirects based on user type */}
      <Route path="/" component={() => {
        switch ((user as any)?.userType) {
          case "admin":
            return <AdminDashboard />;
          case "player":
            return <PlayerDashboard />;
          case "coach":
            return <CoachDashboard />;
          case "parent":
          default:
            return <ParentDashboard />;
        }
      }} />

      {/* Direct dashboard routes */}
      <Route path="/player-dashboard" component={PlayerDashboard} />
      <Route path="/parent-dashboard" component={ParentDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/coach-dashboard" component={CoachDashboard} />

      {/* Player/Team search and detail routes */}
      <Route path="/search" component={SearchPage} />
      <Route path="/teams/:slug" component={TeamDetailPage} />
      <Route path="/players/:id" component={PlayerDetailPage} />

      {/* Routes available to all authenticated users */}
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/parent-settings" component={ParentSettingsPage} />
      <Route path="/player-settings" component={PlayerSettingsPage} />
      <Route path="/coach-settings" component={CoachSettingsPage} />
      <Route path="/team" component={TeamDetails} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/calendar-sync" component={CalendarSync} />
      <Route path="/chat" component={Chat} />
      <Route path="/training" component={Training} />
      <Route path="/training-library" component={TrainingLibrary} />
      <Route path="/test-route" component={TestRoute} />
      <Route path="/trophies-badges" component={TrophiesBadges} />
      <Route path="/skills" component={Skills} />
      <Route path="/photo-upload" component={PhotoUpload} />
      <Route path="/profile-selection" component={ProfileSelection} />
      <Route path="/create-profile" component={CreateProfile} />

      {/* Parent-specific routes */}
      {(user as any)?.userType === 'parent' && (
        <>
          <Route path="/roster" component={RosterManagement} />
          <Route path="/schedule-requests" component={ScheduleRequests} />
          <Route path="/family" component={FamilyManagement} />
        </>
      )}

      {/* Player-specific routes */}
      {(user as any)?.userType === 'player' && (
        <>
          <Route path="/player/team-chat" component={PlayerTeamChat} />
        </>
      )}

      {/* Admin routes */}
      {(user as any)?.userType === 'admin' && (
        <>
          <Route path="/coach/team-messages/:teamId" component={CoachTeamMessages} />
          <Route path="/coach/parent-messages/:teamId" component={CoachParentMessages} />
          <Route path="/roster" component={RosterManagement} />
          <Route path="/schedule-requests" component={ScheduleRequests} />
          <Route path="/family" component={FamilyManagement} />
        </>
      )}

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}