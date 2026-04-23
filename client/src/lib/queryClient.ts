import { createElement, type ReactElement } from "react";
import { QueryClient, QueryFunction, MutationCache } from "@tanstack/react-query";
import { Capacitor } from '@capacitor/core';
import { navigate } from "wouter/use-browser-location";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ACCESS_DENIED_ERROR_CODE } from "@shared/access-gate";

// API base URL - use production backend when running in Capacitor native app
const API_BASE_URL = Capacitor.isNativePlatform() 
  ? 'https://boxstat.app' 
  : '';

function getFullUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

/**
 * Error thrown by apiRequest / getQueryFn when the shared backend access
 * guard rejects a request with a structured ENROLLMENT_ACCESS_DENIED 403.
 * Carries the plain-English message and accessUntil from the server so the
 * global handler can surface the unified paywall toast without the call site
 * having to parse the response itself.
 */
export class AccessDeniedError extends Error {
  code = ACCESS_DENIED_ERROR_CODE;
  reason: string | null;
  accessUntil: string | null;
  constructor(message: string, reason: string | null, accessUntil: string | null) {
    super(message || "This feature is locked.");
    this.name = "AccessDeniedError";
    this.reason = reason;
    this.accessUntil = accessUntil;
  }
}

export function isAccessDeniedError(err: unknown): err is AccessDeniedError {
  if (err instanceof AccessDeniedError) return true;
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === ACCESS_DENIED_ERROR_CODE;
}

async function throwIfResNotOk(res: Response) {
  if (res.ok) return;
  const text = (await res.text()) || res.statusText;
  if (res.status === 403) {
    try {
      const body = JSON.parse(text);
      if (body && body.error === ACCESS_DENIED_ERROR_CODE) {
        throw new AccessDeniedError(
          body.message,
          body.reason ?? null,
          body.accessUntil ?? null,
        );
      }
    } catch (e) {
      if (e instanceof AccessDeniedError) throw e;
      // Not JSON or not our structured 403 — fall through to generic error.
    }
  }
  throw new Error(`${res.status}: ${text}`);
}

export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | { method?: string; data?: unknown },
  data?: unknown,
): Promise<any> {
  let url: string;
  let method: string;
  let requestData: unknown;

  // Handle both calling patterns:
  // apiRequest(method, url, data) - old pattern
  // apiRequest(url, { method, data }) - new pattern
  if (typeof urlOrOptions === 'string') {
    // Old pattern: apiRequest(method, url, data)
    method = urlOrMethod;
    url = urlOrOptions;
    requestData = data;
  } else {
    // New pattern: apiRequest(url, { method, data })
    url = urlOrMethod;
    const options = urlOrOptions || {};
    method = options.method || 'GET';
    requestData = options.data;
  }

  // Get JWT token from localStorage (for mobile/JWT auth)
  const token = localStorage.getItem('authToken');
  
  // Build headers
  const headers: Record<string, string> = {};
  if (requestData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Add platform header for iOS-specific handling (e.g., Stripe redirects)
  if (Capacitor.isNativePlatform()) {
    headers["X-Client-Platform"] = Capacitor.getPlatform(); // 'ios' or 'android'
  }

  const res = await fetch(getFullUrl(url), {
    method,
    headers,
    body: requestData ? JSON.stringify(requestData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return JSON if response has content, otherwise return the response
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get JWT token from localStorage (for mobile/JWT auth)
    const token = localStorage.getItem('authToken');
    
    // Build headers
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(getFullUrl(queryKey.join("/") as string), {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Throttle the global access-denied toast so a burst of failing mutations or
// query refetches only surfaces a single paywall notice.
let lastAccessDeniedToastAt = 0;
function showAccessDeniedToast(err: AccessDeniedError) {
  const now = Date.now();
  if (now - lastAccessDeniedToastAt < 1500) return;
  lastAccessDeniedToastAt = now;
  // Defer one tick so this toast wins over any generic per-call onError toast
  // (the toaster only renders the most recently added entry).
  setTimeout(() => {
    toast({
      title: "This feature is locked",
      description: err.message,
      variant: "destructive",
      action: createElement(
        ToastAction,
        {
          altText: "Go to Payments",
          onClick: () => navigate("/unified-account?tab=payments"),
          "data-testid": "toast-access-denied-pay",
        },
        "Go to Payments",
      ) as ReactElement<typeof ToastAction>,
    });
  }, 0);
}

function handleMutationError(err: unknown) {
  if (isAccessDeniedError(err)) {
    showAccessDeniedToast(err);
  }
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({ onError: handleMutationError }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 60000,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
  },
});
