import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import Teams from "@/pages/teams";
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
import SetPassword from "@/pages/set-password";
import OrgSignup from "@/pages/org-signup";
import SubscriptionRequired from "@/pages/subscription-required";

import RosterManagement from "@/pages/roster-management";
import ScheduleRequests from "@/pages/schedule-requests";
import ScheduleRequest from "@/pages/schedule-request";
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
import ParentSettingsPage from "@/pages/parent-settings";
import TrophiesBadges from "@/pages/trophies-badges";
import Skills from "@/pages/skills";
import InviteClaim from "@/pages/invite-claim";
import ClaimVerify from "@/pages/claim-verify";
import AccountClaim from "@/pages/account-claim";
import LinkError from "@/pages/link-error";
import TestRoute from "@/pages/test-route";
import TestDatePicker from "@/pages/test-datepicker";
import NotFound from "@/pages/not-found";
import GameScoring from "@/pages/game-scoring";
import CreateProfile from "@/pages/create-profile";
import SelectProfileType from "@/pages/select-profile-type";
import PaymentsTab from "@/pages/payments";
import PaymentSuccess from "@/pages/payment-success";
import RegistrationStatus from "@/pages/RegistrationStatus";
import NoProfiles from "@/pages/NoProfiles";
import FamilyOnboarding from "@/pages/family-onboarding";
import DemoProfileSelection from "@/pages/demo-profile-selection";
import QuoteCheckout from "@/pages/QuoteCheckout";
import StoreBuy, { StoreCheckoutSuccess, StoreCheckoutCancel } from "@/pages/store-buy";
import { useQuery } from "@tanstack/react-query";
import { initPushNotifications, registerPushNotifications } from "@/services/pushNotificationService";
import { initDeepLinks, setDeepLinkCallback, markDeepLinkServiceReady, hasPendingOrUnconsumedLaunchUrl, probeColdStartPendingClaim, probeColdStartPendingInvite, probeColdStartPendingMagicLink } from "@/services/deepLinkService";
import { UpdatePrompt } from "@/components/UpdatePrompt";

type Profile = {
  id: string;
  profileType: "player" | "coach";
  firstName: string;
  lastName: string;
};
import PhotoUpload from "@/pages/photo-upload";
import SupportPage from "@/pages/support";

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
  const [location, setLocation] = useLocation();

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
    const returnTo = encodeURIComponent(location + window.location.search);
    setLocation(`/login?returnTo=${returnTo}`);
    return null;
  }

  return <Component />;
}

// Admin-only protected route that also gates on active platform subscription
function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
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
    const returnTo = encodeURIComponent(location + window.location.search);
    setLocation(`/login?returnTo=${returnTo}`);
    return null;
  }

  if ((user as any)?.role !== "admin") {
    setLocation("/home");
    return null;
  }

  return <Component />;
}

// Create protected route wrappers as proper components (not anonymous functions)
const ProtectedUnifiedAccount = () => <ProtectedRoute component={UnifiedAccount} />;
const ProtectedProfileGateway = () => <ProtectedRoute component={ProfileGateway} />;
const ProtectedDashboardDispatcher = () => <ProtectedRoute component={DashboardDispatcher} />;
const ProtectedAddPlayer = () => <ProtectedRoute component={AddPlayer} />;
const ProtectedPlayerDashboard = () => <ProtectedRoute component={PlayerDashboard} />;
const ProtectedAdminDashboard = () => <ProtectedAdminRoute component={AdminDashboard} />;
const ProtectedAdminProgramDetail = () => <ProtectedAdminRoute component={AdminProgramDetail} />;
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
const ProtectedGameScoring = () => <ProtectedRoute component={GameScoring} />;
const ProtectedTrophiesBadges = () => <ProtectedRoute component={TrophiesBadges} />;
const ProtectedSkills = () => <ProtectedRoute component={Skills} />;

// Platform-aware landing that shows marketing page for web, app landing for iOS
// Also auto-redirects logged-in users to their dashboard
function PlatformAwareLanding() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const capacitor = (window as any).Capacitor;
  const isNativePlatform = capacitor?.isNativePlatform?.() === true;
  const platform = capacitor?.getPlatform?.();
  const isNativeByPlatform = platform === 'ios' || platform === 'android';
  const isNativeApp = isNativePlatform || (isNativeByPlatform && platform !== 'web');

  // On a cold-start that originated from a deep link (Universal Link, magic
  // link, claim-verify, Stripe in-app browser return, …), the deep-link
  // service may still be probing `App.getLaunchUrl()` or holding a queued URL
  // when this component first mounts. If we let the auth-driven redirect or
  // the Landing render fire first, it can clobber the deep-link navigation
  // and the user lands on the wrong screen.
  //
  // Wait briefly while a deep link is pending, then fall through to the
  // normal logic so a cold-launch with no link still resolves quickly.
  const [deepLinkPending, setDeepLinkPending] = useState(
    () => isNativeApp && hasPendingOrUnconsumedLaunchUrl(),
  );

  useEffect(() => {
    if (!isNativeApp || !deepLinkPending) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled) return;
      if (!hasPendingOrUnconsumedLaunchUrl()) {
        setDeepLinkPending(false);
      }
    }, 50);
    // Hard cap so a stuck launch-URL probe never permanently blocks the
    // home route.
    const timeout = setTimeout(() => {
      if (!cancelled) setDeepLinkPending(false);
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isNativeApp, deepLinkPending]);

  useEffect(() => {
    if (deepLinkPending) return;
    if (!isLoading && user) {
      setLocation("/home");
    }
  }, [isLoading, user, setLocation, deepLinkPending]);

  // Hold on a loader while either auth is still resolving on native, or a
  // deep link is queued/being probed. This is the key fix for the iOS
  // cold-start race where /claim-verify (and friends) could be clobbered by
  // the home route's own redirect/render.
  if (isNativeApp && (isLoading || deepLinkPending)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BanterLoader />
      </div>
    );
  }

  if (!isLoading && user) {
    return null;
  }

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
  const [currentPath] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user needs profile setup
  const needsProfileSetup = isAuthenticated && user && !(user as any)?.profileCompleted;

  // Safety timeout: if auth check takes >5 seconds, forcibly remove the startup
  // loader and hide the native splash screen so the user never sees a white screen
  useEffect(() => {
    const dismissStartupUI = async () => {
      const loader = document.getElementById('startup-loader');
      if (loader) {
        console.log('[AppRouter] Safety timeout: removing startup-loader');
        const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();
        if (isNativeApp) {
          loader.classList.add('loader-hidden');
          setTimeout(() => loader.remove(), 500);
        } else {
          loader.remove();
        }
      }
      try {
        if ((window as any).Capacitor?.Plugins?.SplashScreen) {
          await (window as any).Capacitor.Plugins.SplashScreen.hide();
          console.log('[AppRouter] Safety timeout: SplashScreen hidden');
        }
      } catch (error) {
        console.log('[AppRouter] Safety timeout: SplashScreen not available:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('[AppRouter] Auth check timed out after 5s, forcing startup UI removal');
        dismissStartupUI();
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Once the initial auth check has completed, the app is ready to receive
  // deep-link navigations. Flush any URLs that arrived during the cold-start
  // race so they win over the default initial route.
  useEffect(() => {
    if (!isLoading) {
      markDeepLinkServiceReady();

      // Cold-start backup for the Claim Account flow: if no deep link
      // surfaced (or it was lost in transit) but the WebView still has a
      // recently-stashed handoff code from the web /claim-verify page,
      // resume the claim flow from that. The dedupe layer in the deep-link
      // service collapses this with the listener path if both fire.
      // See task #190.
      const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();
      if (isNativeApp) {
        // Wait a tick so the deep-link listener gets first crack. Only run
        // the cold-start probe if no deep link was queued/handled and the
        // user hasn't already been routed off the home/landing path —
        // otherwise we'd risk hijacking a launch where the deep link
        // already delivered the user somewhere correct.
        setTimeout(() => {
          if (hasPendingOrUnconsumedLaunchUrl()) {
            console.log('[ClaimResume] skipping cold-start probe — deep link still pending');
            return;
          }
          const path = window.location.pathname;
          const onLandingOrRoot = path === '/' || path === '/app' || path === '';
          if (!onLandingOrRoot) {
            console.log('[ClaimResume] skipping cold-start probe — already routed to', path);
            return;
          }
          // Try each cold-start recovery probe in priority order. Each
          // probe is gated by a short-TTL stash from the in-app handler
          // for that flow, with single-retry semantics, so a stash can't
          // hijack a normal launch outside the second-tap window. See
          // task #200.
          probeColdStartPendingClaim()
            .then((claimed) => {
              if (claimed) return;
              return probeColdStartPendingInvite().then((invited) => {
                if (invited) return;
                return probeColdStartPendingMagicLink();
              });
            })
            .catch((err) => {
              console.warn('[DeepLinkResume] cold-start probe error', err);
            });
        }, 800);
      }
    }
  }, [isLoading]);

  // Handle Splash Screen Handoff
  useEffect(() => {
    if (!isLoading) {
      const performHandoff = async () => {
        const loader = document.getElementById('startup-loader');
        if (loader) {
          const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();
          if (isNativeApp) {
            loader.classList.add('loader-hidden');
            setTimeout(() => loader.remove(), 500);
          } else {
            loader.remove();
          }
        }

        try {
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

  // Initialize deep links and error handlers
  useEffect(() => {
    // Wire wouter navigation into the deep link service so handlers navigate
    // through React state instead of hard window.location changes (which
    // would race the initial route render).
    setDeepLinkCallback((path: string) => {
      console.log('[AppRouter] Deep link navigating via wouter to:', path);
      setLocation(path);
    });

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
      }).catch(err => {
        console.error('[Push] Failed to initialize push notifications:', err);
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

  if (currentPath === '/signup') {
    return <OrgSignup />;
  }

  return (
    <>
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/support" component={SupportPage} />

      <Route path="/teams" component={Teams} />
      <Route path="/registration" component={RegistrationFlow} />
      <Route path="/login" component={LoginPage} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/test-datepicker" component={TestDatePicker} />
      <Route path="/register" component={RegistrationFlow} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/magic-link-login" component={MagicLinkLogin} />
      <Route path="/claim-verify" component={ClaimVerify} />
      <Route path="/account-claim" component={AccountClaim} />
      <Route path="/link-error" component={LinkError} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/set-password" component={SetPassword} />
      <Route path="/logout" component={Logout} />
      <Route path="/checkout/:checkoutId" component={QuoteCheckout} />
      <Route path="/store-buy/:productId" component={StoreBuy} />
      <Route path="/store-checkout-success" component={StoreCheckoutSuccess} />
      <Route path="/store-checkout-cancel" component={StoreCheckoutCancel} />
      
      {/* Landing page - marketing for web, app landing for iOS */}
      <Route path="/" component={PlatformAwareLanding} />
      {/* Original app landing for direct access */}
      <Route path="/app" component={Landing} />
      
      {/* Protected routes */}
      <Route path="/home" component={ProtectedDashboardDispatcher} />
      <Route path="/profile-gateway" component={ProtectedProfileGateway} />
      <Route path="/subscription-required" component={SubscriptionRequired} />
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
      <Route path="/game-scoring" component={ProtectedGameScoring} />
      
      {/* Player/Team search and detail routes */}
      <Route path="/search" component={SearchPage} />
      <Route path="/teams/:slug" component={TeamDetailPage} />
      <Route path="/players/:id" component={PlayerDetailPage} />
      
      {/* Schedule Request - book sessions after program payment */}
      <Route path="/schedule/:programId" component={ScheduleRequest} />
      
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
      <Route path="/invite/:token" component={InviteClaim} />
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
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <WouterRouter>
            <AppRouter />
            <Toaster />
            <UpdatePrompt />
          </WouterRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}