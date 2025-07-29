import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// Pages
import Landing from "@/pages/landing";
import SimpleLanding from "@/pages/simple-landing";

import AccountSetup from "@/pages/account-setup";
import ParentDashboard from "@/pages/parent-dashboard";
import PlayerDashboard from "@/pages/player-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import TeamDetails from "@/pages/team-details";
import Schedule from "@/pages/schedule";
import Chat from "@/pages/chat";
import SportsEnginePayment from "@/pages/sportsengine-payment";
import RosterManagement from "@/pages/roster-management";
import ScheduleRequests from "@/pages/schedule-requests";
import Training from "@/pages/training";
import TrainingLibrary from "@/pages/training-library";
import Profile from "@/pages/profile";
import FamilyManagement from "@/pages/family-management";
import TestAccounts from "@/pages/test-accounts";
import CoachTeamMessages from "@/pages/coach-team-messages";
import CoachParentMessages from "@/pages/coach-parent-messages";
import PlayerTeamChat from "@/pages/player-team-chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  // Show account setup if user is authenticated but profile not completed
  const needsSetup = isAuthenticated && user && !user?.profileCompleted;

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

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={SimpleLanding} />
        <Route path="/test-accounts" component={TestAccounts} />
        <Route component={SimpleLanding} />
      </Switch>
    );
  }

  // Show account setup if profile not completed
  if (needsSetup) {
    return <AccountSetup />;
  }

  // Route based on user type
  const getDashboardComponent = () => {
    switch (user?.userType) {
      case "admin":
        return AdminDashboard;
      case "player":
        return PlayerDashboard;
      case "parent":
      default:
        return ParentDashboard;
    }
  };

  return (
    <Switch>
      <Route path="/" component={getDashboardComponent()} />
      <Route path="/player-dashboard">
        {() => <PlayerDashboard />}
      </Route>
      <Route path="/parent-dashboard">
        {() => <ParentDashboard />}
      </Route>
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Routes available to all authenticated users */}
      <Route path="/profile" component={Profile} />
      <Route path="/team" component={TeamDetails} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/chat" component={Chat} />
      <Route path="/training" component={Training} />
      <Route path="/training-library" component={TrainingLibrary} />
      
      {/* Parent-specific routes */}
      {user?.userType === 'parent' && (
        <>
          <Route path="/payment/:type?" component={SportsEnginePayment} />
          <Route path="/roster" component={RosterManagement} />
          <Route path="/schedule-requests" component={ScheduleRequests} />
          <Route path="/family" component={FamilyManagement} />
        </>
      )}
      
      {/* Player-specific routes with payment access */}
      {user?.userType === 'player' && (
        <>
          <Route path="/player/team-chat" component={PlayerTeamChat} />
          <Route path="/payment/:type?" component={SportsEnginePayment} />
        </>
      )}
      
      {/* Admin routes */}
      {user?.userType === 'admin' && (
        <>
          <Route path="/coach/team-messages/:teamId" component={CoachTeamMessages} />
          <Route path="/coach/parent-messages/:teamId" component={CoachParentMessages} />
          <Route path="/payment/:type?" component={SportsEnginePayment} />
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
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </TooltipProvider>
  );
}