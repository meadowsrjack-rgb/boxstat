import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { PlayerAccess } from "@shared/access-gate";

interface AuthUser {
  id?: string;
  role?: string;
}

const BYPASS_RESULT: PlayerAccess = {
  canAccess: true,
  reason: "paid",
  accessUntil: null,
  sourceLabel: "",
  message: "",
};

interface UsePlayerAccessOptions {
  /**
   * When true, the parent role is NOT auto-bypassed and the hook actually
   * evaluates the resolved player's access. Use this for action surfaces
   * where a parent acts on behalf of a specific child (e.g. check-in) so
   * the UI mirrors the backend guard which enforces the child's access.
   */
  evaluateForParent?: boolean;
}

/**
 * Returns the unified enrollment-access decision for a given player. When no
 * playerId is provided, falls back to the authenticated user's own ID. The
 * hook stays disabled until both the user and the resolved playerId are
 * available so we never flash a paywall during the auth bootstrap.
 *
 * The same shape — { canAccess, reason, accessUntil, sourceLabel, message } —
 * powers the page-level paywall and the matching backend guard so the wording
 * and rules stay in sync.
 */
export function usePlayerAccess(
  playerId?: string | null,
  options: UsePlayerAccessOptions = {},
) {
  const { user } = useAuth() as { user: AuthUser | null | undefined };
  const resolvedPlayerId = playerId || user?.id || null;
  const role = user?.role;
  // Coaches/admins always pass through. Parents pass through for view
  // surfaces by default but are evaluated for action surfaces (check-in)
  // so the UI matches the backend guard which enforces the child's access.
  const bypass =
    role === "admin" ||
    role === "coach" ||
    (role === "parent" && !options.evaluateForParent);

  const query = useQuery<PlayerAccess>({
    queryKey: ["/api/access/player", resolvedPlayerId],
    enabled: !!resolvedPlayerId && !bypass,
  });

  if (bypass) {
    return { access: BYPASS_RESULT, isLoading: false, bypass: true };
  }

  return {
    access: query.data,
    isLoading: query.isLoading,
    bypass: false,
  };
}
