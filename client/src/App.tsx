import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// Pages
import Landing from "@/pages/landing";
import ParentDashboard from "@/pages/parent-dashboard";
import PlayerDashboard from "@/pages/player-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import TeamDetails from "@/pages/team-details";
import Schedule from "@/pages/schedule";
import Chat from "@/pages/chat";
import SportsEnginePayment from "@/pages/sportsengine-payment";
import NotFound from "@/pages/not-found";

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
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
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
      <Route path="/team" component={TeamDetails} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/chat" component={Chat} />
      <Route path="/payment/:type?" component={SportsEnginePayment} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
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
