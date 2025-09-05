
import React from 'react';

type User = { id: number; email: string; role: 'parent'|'player'|'coach'|'admin' } | null;

function api(path: string, init?: RequestInit) {
  const url = (import.meta.env.VITE_API_URL || 'http://localhost:8787') + path;
  return fetch(url, { credentials: 'include', headers: { 'Content-Type':'application/json' }, ...(init||{}) });
}

export function useAuthProvider() {
  const [user, setUser] = React.useState<User>(null);
  React.useEffect(() => {
    api('/api/me').then(r => r.json()).then(j => setUser(j.user));
  }, []);
  return {
    Context: React.createContext({ user, setUser } as any),
    user, setUser, api
  };
}

export function useAuth() {
  return React.useContext((useAuthProvider() as any).Context);
}
