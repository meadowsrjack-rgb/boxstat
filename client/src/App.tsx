import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import AuthWrapper from "@/components/AuthWrapper";
import Landing from "@/pages/landing";
import PlayerDashboard from "@/pages/player-dashboard";
import ParentDashboard from "@/pages/parent-dashboard";
import Schedule from "@/pages/schedule";
import Teams from "@/pages/teams";
import TrophiesBadges from "@/pages/trophies-badges";
import Skills from "@/pages/skills";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>
        <Router>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/player-dashboard" component={PlayerDashboard} />
            <Route path="/parent-dashboard" component={ParentDashboard} />
            <Route path="/schedule" component={Schedule} />
            <Route path="/teams" component={Teams} />
            <Route path="/trophies-badges" component={TrophiesBadges} />
            <Route path="/skills" component={Skills} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </AuthWrapper>
    </QueryClientProvider>
  );
}