
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation } from 'wouter';
import Start from './pages/Start';
import AuthStart from './pages/AuthStart';
import AuthVerify from './pages/AuthVerify';
import Onboarding from './pages/Onboarding';
import { useAuthProvider } from './hooks/useAuth';

const qc = new QueryClient();

export function App() {
  const auth = useAuthProvider();
  const [loc, setLoc] = useLocation();

  return (
    <QueryClientProvider client={qc}>
      <auth.Context.Provider value={auth}>
        <Switch>
          <Route path="/" component={Start} />
          <Route path="/auth/start" component={AuthStart} />
          <Route path="/auth/verify" component={AuthVerify} />
          <Route path="/onboarding" component={Onboarding} />
          <Route>404 – <Link href="/">Home</Link></Route>
        </Switch>
      </auth.Context.Provider>
    </QueryClientProvider>
  );
}
