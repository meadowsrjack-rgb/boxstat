import { Switch, Route, useLocation } from "wouter";
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
import PlayerDashboard from "@/pages/player-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import CoachDashboard from "@/pages/coach-dashboard";
import SearchPage from "@/pages/search";
import TeamDetailPage from "@/pages/team-detail";
import PlayerDetailPage from "@/pages/player-detail";
import TeamDetails from "@/pages/team-details";
import Schedule from "@/pages/schedule";
import Chat from "@/pages/chat";
import RegistrationFlow from "@/pages/registration-flow";
import UnifiedAccount from "@/pages/unified-account";
import LoginPage from "@/pages/login";
import AddPlayer from "@/pages/add-player";

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
import PlayerSettingsPage from "@/pages/player-settings";
import CoachSettingsPage from "@/pages/coach-settings";
import TrophiesBadges from "@/pages/trophies-badges";
import Skills from "@/pages/skills";
import TestRoute from "@/pages/test-route";
import NotFound from "@/pages/not-found";
import CreateProfile from "@/pages/create-profile";
import SelectProfileType from "@/pages/select-profile-type";
import PaymentsTab from "@/pages/payments";
import RegistrationStatus from "@/pages/RegistrationStatus";
import NoProfiles from "@/pages/NoProfiles";
import FamilyOnboarding from "@/pages/family-onboarding";
import { useQuery } from "@tanstack/react-query";

type Profile = {
  id: string;
  profileType: "player" | "coach";
  firstName: string;
  lastName: string;
};
import CalendarSync from "@/pages/calendar-sync";
import PhotoUpload from "@/pages/photo-upload";

// Individual Setting Pages
import { 
  PlayerProfilePage, 
  PlayerPrivacyPage, 
  PlayerNotificationsPage, 
  PlayerSecurityPage, 
  PlayerDevicesPage, 
  PlayerLegalPage,
  PlayerDangerPage 
} from "@/pages/player-setting-pages";

import { 
  CoachProfilePage, 
  CoachCoachingPage, 
  CoachPrivacyPage, 
  CoachNotificationsPage, 
  CoachSecurityPage, 
  CoachConnectionsPage, 
  CoachBillingPage, 
  CoachDevicesPage, 
  CoachLegalPage, 
  CoachDangerPage 
} from "@/pages/coach-setting-pages";


function ProfileCheckWrapper({ children }: { children: React.ReactNode }) {
  // Temporarily disable profile check to isolate error
  return <>{children}</>;
  
  // const { data: profiles, isLoading } = useQuery<any[]>({
  //   queryKey: ['/api/profiles/me'],
  //   staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  // });

  // if (isLoading) {
  //   return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  // }

  // // If no profiles exist, show the NoProfiles fallback page
  // if (!profiles || profiles.length === 0) {
  //   return <NoProfiles />;
  // }

  // // Profiles exist, render the wrapped component
  // return <>{children}</>;
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user needs profile setup
  const needsProfileSetup = isAuthenticated && user && !(user as any)?.profileCompleted;

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
      event.preventDefault(); // Prevent the default behavior
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/privacy" component={PrivacySettingsPage} />
      <Route path="/teams" component={Teams} />
      <Route path="/registration" component={RegistrationFlow} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegistrationFlow} />
      <Route path="/logout" component={() => {
        // Handle logout
        useEffect(() => {
          fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
              queryClient.clear();
              window.location.href = '/';
            })
            .catch(() => {
              window.location.href = '/';
            });
        }, []);
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p>Logging out...</p>
            </div>
          </div>
        );
      }} />
      
      {/* Landing page - always accessible at root */}
      <Route path="/" component={Landing} />
      
      {/* Protected routes */}
      <Route path="/account" component={() => {
        if (!user) {
          setLocation("/login");
          return null;
        }
        // Redirect to appropriate dashboard based on user role
        if ((user as any)?.role === "admin") {
          setLocation("/admin-dashboard");
          return null;
        }
        return <UnifiedAccount />;
      }} />
      <Route path="/unified-account" component={UnifiedAccount} />
      <Route path="/add-player" component={AddPlayer} />
      <Route path="/dashboard" component={() => {
        switch ((user as any)?.userType) {
          case "admin":
            return <AdminDashboard />;
          case "player":
            return <PlayerDashboard />;
          case "coach":
            return <CoachDashboard />;
          default:
            return <PlayerDashboard />;
        }
      }} />
      <Route path="/player-dashboard" component={() => <PlayerDashboard />} />
      <Route path="/admin-dashboard" component={() => <AdminDashboard />} />
      <Route path="/coach-dashboard" component={() => <CoachDashboard />} />
      <Route path="/admin" component={() => <AdminDashboard />} />
      
      {/* Player/Team search and detail routes */}
      <Route path="/search" component={SearchPage} />
      <Route path="/teams/:slug" component={TeamDetailPage} />
      <Route path="/players/:id" component={PlayerDetailPage} />
      
      {/* Routes available to all authenticated users */}
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/player-settings" component={PlayerSettingsPage} />
      <Route path="/coach-settings" component={CoachSettingsPage} />
      
      {/* Individual Player Setting Pages */}
      <Route path="/player-settings/profile" component={PlayerProfilePage} />
      <Route path="/player-settings/privacy" component={PlayerPrivacyPage} />
      <Route path="/player-settings/notifications" component={PlayerNotificationsPage} />
      <Route path="/player-settings/security" component={PlayerSecurityPage} />
      <Route path="/player-settings/devices" component={PlayerDevicesPage} />
      <Route path="/player-settings/legal" component={PlayerLegalPage} />
      <Route path="/player-settings/danger" component={PlayerDangerPage} />
      
      {/* Individual Coach Setting Pages */}
      <Route path="/coach-settings/profile" component={CoachProfilePage} />
      <Route path="/coach-settings/coaching" component={CoachCoachingPage} />
      <Route path="/coach-settings/privacy" component={CoachPrivacyPage} />
      <Route path="/coach-settings/notifications" component={CoachNotificationsPage} />
      <Route path="/coach-settings/security" component={CoachSecurityPage} />
      <Route path="/coach-settings/connections" component={CoachConnectionsPage} />
      <Route path="/coach-settings/billing" component={CoachBillingPage} />
      <Route path="/coach-settings/devices" component={CoachDevicesPage} />
      <Route path="/coach-settings/legal" component={CoachLegalPage} />
      <Route path="/coach-settings/danger" component={CoachDangerPage} />
      
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
      <Route path="/payments" component={RegistrationStatus} />
      <Route path="/no-profiles" component={NoProfiles} />
      {/* New profile selection flow */}
      <Route path="/select-profile-type" component={SelectProfileType} />
      {/* Legacy routes for compatibility during transition */}
      <Route path="/create-profile" component={CreateProfile} />
      <Route path="/family-onboarding" component={FamilyOnboarding} />
      
      {/* Parent-specific routes */}
      {(user as any)?.userType === 'parent' && (
        <>
          <Route path="/roster" component={RosterManagement} />
          <Route path="/schedule-requests" component={ScheduleRequests} />
          <Route path="/family" component={FamilyManagement} />
          <Route path="/family-management" component={FamilyManagement} />
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
          <Route path="/family-management" component={FamilyManagement} />
        </>
      )}
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <>
        <Router />
        <Toaster />
      </>
    </QueryClientProvider>
  );
}