import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// Pages
import Teams from "@/pages/teams";
import PrivacySettingsPage from "@/pages/privacy";
import PrivacyPolicy from "@/pages/privacy-policy";
import Landing from "@/pages/landing";
import MarketingLanding from "@/pages/marketing-landing";
import AccountSetup from "@/pages/account-setup";
import PlayerDashboard from "@/pages/player-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminProgramDetail from "@/pages/admin-program-detail";
import CoachDashboard from "@/pages/coach-dashboard";
import SearchPage from "@/pages/search";
import TeamDetailPage from "@/pages/team-detail";
import PlayerDetailPage from "@/pages/player-detail";
import TeamDetails from "@/pages/team-details";
import Schedule from "@/pages/schedule";
import Chat from "@/pages/chat";
import RegistrationFlow from "@/pages/registration-flow";
import UnifiedAccount from "@/pages/unified-account";
import ProfileGateway from "@/pages/profile-gateway";
import DashboardDispatcher from "@/components/DashboardDispatcher";
import LoginPage from "@/pages/login";
import AddPlayer from "@/pages/add-player";
import VerifyEmail from "@/pages/verify-email";
import MagicLinkLogin from "@/pages/magic-link-login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";

import RosterManagement from "@/pages/roster-management";
import ScheduleRequests from "@/pages/schedule-requests";
import Training from "@/pages/training";
import TrainingLibrary from "@/pages/training-library";
import Profile from "@/pages/profile";
import FamilyManagement from "@/pages/family-management";
import ClaimSubscription from "@/pages/claim-subscription";
import CoachTeamMessages from "@/pages/coach-team-messages";
import CoachParentMessages from "@/pages/coach-parent-messages";
import PlayerTeamChat from "@/pages/player-team-chat";
import SettingsPage from "@/pages/settings";
import PlayerSettingsPage from "@/pages/player-settings";
import CoachSettingsPage from "@/pages/coach-settings";
import ParentSettingsPage from "@/pages/parent-settings";
import TrophiesBadges from "@/pages/trophies-badges";
import Skills from "@/pages/skills";
import TestRoute from "@/pages/test-route";
import TestDatePicker from "@/pages/test-datepicker";
import NotFound from "@/pages/not-found";
import CreateProfile from "@/pages/create-profile";
import SelectProfileType from "@/pages/select-profile-type";
import PaymentsTab from "@/pages/payments";
import RegistrationStatus from "@/pages/RegistrationStatus";
import NoProfiles from "@/pages/NoProfiles";
import FamilyOnboarding from "@/pages/family-onboarding";
import DemoProfileSelection from "@/pages/demo-profile-selection";
import QuoteCheckout from "@/pages/QuoteCheckout";
import { useQuery } from "@tanstack/react-query";
import { initPushNotifications, registerPushNotifications } from "@/services/pushNotificationService";
import { initDeepLinks } from "@/services/deepLinkService";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { TutorialOverlay } from "@/components/TutorialOverlay";

type Profile = {
  id: string;
  profileType: "player" | "coach";
  firstName: string;
  lastName: string;
};
import PhotoUpload from "@/pages/photo-upload";
import SupportPage from "@/pages/support";
import NotificationsPage from "@/pages/notifications-page";
import Logout from "@/pages/logout";
import { BanterLoader } from "@/components/BanterLoader";

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
  ParentProfilePage,
  ParentPrivacyPage,
  ParentNotificationsPage,
  ParentSecurityPage,
  ParentConnectionsPage,
  ParentLegalPage,
  ParentDevicesPage,
  ParentDangerPage
} from "@/pages/parent-setting-pages";

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


// Protected Route wrapper - redirects to landing if not authenticated
function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    // Don't show React loader if HTML startup-loader is still visible
    const htmlLoader = document.getElementById('startup-loader');
    if (htmlLoader) {
      return null;
    }
    return (
      <div className="min-h-screen-safe bg-white flex items-center justify-center">
        <BanterLoader />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return <Component />;
}

// Create protected route wrappers as proper components (not anonymous functions)
const ProtectedNotificationsPage = () => <ProtectedRoute component={NotificationsPage} />;
const ProtectedUnifiedAccount = () => <ProtectedRoute component={UnifiedAccount} />;
const ProtectedProfileGateway = () => <ProtectedRoute component={ProfileGateway} />;
const ProtectedClaimSubscription = () => <ProtectedRoute component={ClaimSubscription} />;
const ProtectedDashboardDispatcher = () => <ProtectedRoute component={DashboardDispatcher} />;
const ProtectedAddPlayer = () => <ProtectedRoute component={AddPlayer} />;
const ProtectedPlayerDashboard = () => <ProtectedRoute component={PlayerDashboard} />;
const ProtectedAdminDashboard = () => <ProtectedRoute component={AdminDashboard} />;
const ProtectedAdminProgramDetail = () => <ProtectedRoute component={AdminProgramDetail} />;
const ProtectedCoachDashboard = () => <ProtectedRoute component={CoachDashboard} />;
const ProtectedProfile = () => <ProtectedRoute component={Profile} />;
const ProtectedSettingsPage = () => <ProtectedRoute component={SettingsPage} />;
const ProtectedPlayerSettingsPage = () => <ProtectedRoute component={PlayerSettingsPage} />;
const ProtectedCoachSettingsPage = () => <ProtectedRoute component={CoachSettingsPage} />;
const ProtectedParentSettingsPage = () => <ProtectedRoute component={ParentSettingsPage} />;

// Player settings
const ProtectedPlayerProfilePage = () => <ProtectedRoute component={PlayerProfilePage} />;
const ProtectedPlayerPrivacyPage = () => <ProtectedRoute component={PlayerPrivacyPage} />;
const ProtectedPlayerNotificationsPage = () => <ProtectedRoute component={PlayerNotificationsPage} />;
const ProtectedPlayerSecurityPage = () => <ProtectedRoute component={PlayerSecurityPage} />;
const ProtectedPlayerDevicesPage = () => <ProtectedRoute component={PlayerDevicesPage} />;
const ProtectedPlayerLegalPage = () => <ProtectedRoute component={PlayerLegalPage} />;
const ProtectedPlayerDangerPage = () => <ProtectedRoute component={PlayerDangerPage} />;

// Parent settings
const ProtectedParentProfilePage = () => <ProtectedRoute component={ParentProfilePage} />;
const ProtectedParentPrivacyPage = () => <ProtectedRoute component={ParentPrivacyPage} />;
const ProtectedParentNotificationsPage = () => <ProtectedRoute component={ParentNotificationsPage} />;
const ProtectedParentSecurityPage = () => <ProtectedRoute component={ParentSecurityPage} />;
const ProtectedParentConnectionsPage = () => <ProtectedRoute component={ParentConnectionsPage} />;
const ProtectedParentLegalPage = () => <ProtectedRoute component={ParentLegalPage} />;
const ProtectedParentDevicesPage = () => <ProtectedRoute component={ParentDevicesPage} />;
const ProtectedParentDangerPage = () => <ProtectedRoute component={ParentDangerPage} />;

// Coach settings
const ProtectedCoachProfilePage = () => <ProtectedRoute component={CoachProfilePage} />;
const ProtectedCoachCoachingPage = () => <ProtectedRoute component={CoachCoachingPage} />;
const ProtectedCoachPrivacyPage = () => <ProtectedRoute component={CoachPrivacyPage} />;
const ProtectedCoachNotificationsPage = () => <ProtectedRoute component={CoachNotificationsPage} />;
const ProtectedCoachSecurityPage = () => <ProtectedRoute component={CoachSecurityPage} />;
const ProtectedCoachConnectionsPage = () => <ProtectedRoute component={CoachConnectionsPage} />;
const ProtectedCoachBillingPage = () => <ProtectedRoute component={CoachBillingPage} />;
const ProtectedCoachDevicesPage = () => <ProtectedRoute component={CoachDevicesPage} />;
const ProtectedCoachLegalPage = () => <ProtectedRoute component={CoachLegalPage} />;
const ProtectedCoachDangerPage = () => <ProtectedRoute component={CoachDangerPage} />;

// Other protected pages
const ProtectedTeamDetails = () => <ProtectedRoute component={TeamDetails} />;
const ProtectedSchedule = () => <ProtectedRoute component={Schedule} />;
const ProtectedChat = () => <ProtectedRoute component={Chat} />;
const ProtectedTraining = () => <ProtectedRoute component={Training} />;
const ProtectedTrainingLibrary = () => <ProtectedRoute component={TrainingLibrary} />;
const ProtectedTestRoute = () => <ProtectedRoute component={TestRoute} />;
const ProtectedTrophiesBadges = () => <ProtectedRoute component={TrophiesBadges} />;
const ProtectedSkills = () => <ProtectedRoute component={Skills} />;

// Platform-aware landing that shows marketing page for web, app landing for iOS
function PlatformAwareLanding() {
  // Check if running in Capacitor native app (iOS/Android)
  // Only consider it native if isNativePlatform() explicitly returns true
  // This prevents false positives when Capacitor is bundled in web builds
  const capacitor = (window as any).Capacitor;
  
  // isNativePlatform() is the definitive check - it returns true ONLY on actual native apps
  // getPlatform() returns 'web' for browsers, 'ios' or 'android' for native
  const isNativePlatform = capacitor?.isNativePlatform?.() === true;
  const platform = capacitor?.getPlatform?.();
  const isNativeByPlatform = platform === 'ios' || platform === 'android';
  
  // Both checks must agree, OR we trust isNativePlatform alone
  // Default to marketing page for web (platform === 'web' or undefined)
  const isNativeApp = isNativePlatform || (isNativeByPlatform && platform !== 'web');
  
  // For iOS/Android app users, show the original app landing page
  if (isNativeApp) {
    return <Landing />;
  }
  
  // For web browser users, show the marketing landing page
  return <MarketingLanding />;
}

// Special route components with custom logic
function AccountRoute() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    // Don't show React loader if HTML startup-loader is still visible
    const htmlLoader = document.getElementById('startup-loader');
    if (htmlLoader) {
      return null;
    }
    return (
      <div className="min-h-screen-safe bg-white flex items-center justify-center">
        <BanterLoader />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  setLocation("/home");
  return null;
}

function DashboardRoute() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation("/home");
  }, [setLocation]);

  // Don't show React loader if HTML startup-loader is still visible
  const htmlLoader = document.getElementById('startup-loader');
  if (htmlLoader) {
    return null;
  }

  return (
    <div className="min-h-screen-safe bg-white flex items-center justify-center">
      <BanterLoader />
    </div>
  );
}

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

function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user needs profile setup
  const needsProfileSetup = isAuthenticated && user && !(user as any)?.profileCompleted;

  // Handle Splash Screen Handoff
  useEffect(() => {
    if (!isLoading) {
      const performHandoff = async () => {
        // Hide the HTML Bridge (Fade it out using CSS class)
        const loader = document.getElementById('startup-loader');
        if (loader) {
          loader.classList.add('loader-hidden');
          // Remove it from DOM after transition for better performance
          setTimeout(() => {
            loader.remove();
          }, 500);
        }

        // Hide the Native Splash Screen (The OS layer)
        try {
          // Use window.Capacitor if available (global API)
          if ((window as any).Capacitor?.Plugins?.SplashScreen) {
            await (window as any).Capacitor.Plugins.SplashScreen.hide();
          }
        } catch (error) {
          console.log('SplashScreen not available (likely web):', error);
        }
      };

      performHandoff();
    }
  }, [isLoading]);

  // Register service worker for PWA and initialize deep links
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

    // Initialize deep links for Universal Links (magic link handling)
    initDeepLinks().then(() => {
      console.log('Deep link listeners initialized');
    });

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

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User authenticated, initializing push notifications...');
      initPushNotifications().then(() => {
        console.log('Push notification listeners set up');
        registerPushNotifications();
      });
    }
  }, [isAuthenticated, user]);

  // Don't show React loader if HTML startup-loader is still visible
  // This prevents double loading screens
  if (isLoading) {
    const htmlLoader = document.getElementById('startup-loader');
    if (htmlLoader) {
      // HTML loader is still showing, don't render React loader
      return null;
    }
    return (
      <div className="min-h-screen-safe bg-white flex items-center justify-center">
        <BanterLoader />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/privacy" component={PrivacySettingsPage} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/support" component={SupportPage} />
      <Route path="/notifications" component={ProtectedNotificationsPage} />
      <Route path="/teams" component={Teams} />
      <Route path="/registration" component={RegistrationFlow} />
      <Route path="/login" component={LoginPage} />
      <Route path="/test-datepicker" component={TestDatePicker} />
      <Route path="/register" component={RegistrationFlow} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/magic-link-login" component={MagicLinkLogin} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/logout" component={Logout} />
      <Route path="/checkout/:checkoutId" component={QuoteCheckout} />
      
      {/* Landing page - marketing for web, app landing for iOS */}
      <Route path="/" component={PlatformAwareLanding} />
      {/* Original app landing for direct access */}
      <Route path="/app" component={Landing} />
      
      {/* Protected routes */}
      <Route path="/home" component={ProtectedDashboardDispatcher} />
      <Route path="/profile-gateway" component={ProtectedProfileGateway} />
      <Route path="/claim-subscription" component={ProtectedClaimSubscription} />
      <Route path="/parent-dashboard" component={ProtectedUnifiedAccount} />
      <Route path="/account" component={AccountRoute} />
      <Route path="/unified-account" component={ProtectedUnifiedAccount} />
      <Route path="/add-player" component={ProtectedAddPlayer} />
      <Route path="/dashboard" component={DashboardRoute} />
      <Route path="/player-dashboard" component={ProtectedPlayerDashboard} />
      <Route path="/admin-dashboard" component={ProtectedAdminDashboard} />
      <Route path="/admin/programs/:programId" component={ProtectedAdminProgramDetail} />
      <Route path="/coach-dashboard" component={ProtectedCoachDashboard} />
      <Route path="/admin" component={ProtectedAdminDashboard} />
      
      {/* Player/Team search and detail routes */}
      <Route path="/search" component={SearchPage} />
      <Route path="/teams/:slug" component={TeamDetailPage} />
      <Route path="/players/:id" component={PlayerDetailPage} />
      
      {/* Routes available to all authenticated users */}
      <Route path="/profile" component={ProtectedProfile} />
      <Route path="/settings" component={ProtectedSettingsPage} />
      <Route path="/player-settings" component={ProtectedPlayerSettingsPage} />
      <Route path="/coach-settings" component={ProtectedCoachSettingsPage} />
      <Route path="/parent-settings" component={ProtectedParentSettingsPage} />
      
      {/* Individual Player Setting Pages */}
      <Route path="/player-settings/profile" component={ProtectedPlayerProfilePage} />
      <Route path="/player-settings/privacy" component={ProtectedPlayerPrivacyPage} />
      <Route path="/player-settings/notifications" component={ProtectedPlayerNotificationsPage} />
      <Route path="/player-settings/security" component={ProtectedPlayerSecurityPage} />
      <Route path="/player-settings/devices" component={ProtectedPlayerDevicesPage} />
      <Route path="/player-settings/legal" component={ProtectedPlayerLegalPage} />
      <Route path="/player-settings/danger" component={ProtectedPlayerDangerPage} />
      
      {/* Individual Parent Setting Pages */}
      <Route path="/parent-settings/profile" component={ProtectedParentProfilePage} />
      <Route path="/parent-settings/privacy" component={ProtectedParentPrivacyPage} />
      <Route path="/parent-settings/notifications" component={ProtectedParentNotificationsPage} />
      <Route path="/parent-settings/security" component={ProtectedParentSecurityPage} />
      <Route path="/parent-settings/connections" component={ProtectedParentConnectionsPage} />
      <Route path="/parent-settings/legal" component={ProtectedParentLegalPage} />
      <Route path="/parent-settings/devices" component={ProtectedParentDevicesPage} />
      <Route path="/parent-settings/danger" component={ProtectedParentDangerPage} />
      
      {/* Individual Coach Setting Pages */}
      <Route path="/coach-settings/profile" component={ProtectedCoachProfilePage} />
      <Route path="/coach-settings/coaching" component={ProtectedCoachCoachingPage} />
      <Route path="/coach-settings/privacy" component={ProtectedCoachPrivacyPage} />
      <Route path="/coach-settings/notifications" component={ProtectedCoachNotificationsPage} />
      <Route path="/coach-settings/security" component={ProtectedCoachSecurityPage} />
      <Route path="/coach-settings/connections" component={ProtectedCoachConnectionsPage} />
      <Route path="/coach-settings/billing" component={ProtectedCoachBillingPage} />
      <Route path="/coach-settings/devices" component={ProtectedCoachDevicesPage} />
      <Route path="/coach-settings/legal" component={ProtectedCoachLegalPage} />
      <Route path="/coach-settings/danger" component={ProtectedCoachDangerPage} />
      
      <Route path="/team" component={ProtectedTeamDetails} />
      <Route path="/schedule" component={ProtectedSchedule} />
      <Route path="/chat" component={ProtectedChat} />
      <Route path="/training" component={ProtectedTraining} />
      <Route path="/training-library" component={ProtectedTrainingLibrary} />
      <Route path="/test-route" component={ProtectedTestRoute} />
      <Route path="/trophies-badges" component={ProtectedTrophiesBadges} />
      <Route path="/skills" component={ProtectedSkills} />
      <Route path="/photo-upload" component={PhotoUpload} />
      <Route path="/payments" component={PaymentsTab} />
      <Route path="/no-profiles" component={NoProfiles} />
      {/* New profile selection flow */}
      <Route path="/select-profile-type" component={SelectProfileType} />
      <Route path="/profile-selection" component={DemoProfileSelection} />
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
      <TutorialProvider>
        <WouterRouter>
          <AppRouter />
          <Toaster />
          <UpdatePrompt />
          <TutorialOverlay />
        </WouterRouter>
      </TutorialProvider>
    </QueryClientProvider>
  );
}