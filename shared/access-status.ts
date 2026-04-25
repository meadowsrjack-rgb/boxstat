export type AccessReason = 'paid' | 'admin_grant' | 'grace' | 'expired' | 'none';

export interface AccessStatusInput {
  status: string;
  endDate: string | null;
  gracePeriodEndDate?: string | null;
  source?: string | null;
  paymentId?: string | null;
  stripeSubscriptionId?: string | null;
}

export interface AccessStatus {
  accessUntil: string | null;
  reason: AccessReason;
  sourceLabel: string;
}

export const SOURCE_LABELS: Record<AccessReason, string> = {
  paid: 'Source: paid Stripe subscription or one-time payment.',
  admin_grant: 'Source: admin-granted trial — pay by this date to keep access.',
  grace: 'Source: grace period after a missed payment.',
  expired: 'Source: enrollment ended without renewal.',
  none: 'No active enrollment on file.',
};

const PRIORITY: Record<AccessReason, number> = {
  paid: 4,
  admin_grant: 3,
  grace: 2,
  expired: 1,
  none: 0,
};

function isPaid(e: AccessStatusInput): boolean {
  return Boolean(e.paymentId || e.stripeSubscriptionId);
}

function classify(e: AccessStatusInput): { reason: AccessReason; date: string | null } {
  if (e.status === 'grace_period') {
    return { reason: 'grace', date: e.gracePeriodEndDate || e.endDate || null };
  }
  if (e.status === 'active') {
    if (isPaid(e)) return { reason: 'paid', date: e.endDate || null };
    return { reason: 'admin_grant', date: e.endDate || null };
  }
  if (e.status === 'expired' || e.status === 'cancelled') {
    return { reason: 'expired', date: e.gracePeriodEndDate || e.endDate || null };
  }
  return { reason: 'none', date: null };
}

/**
 * Given a player's enrollments, compute the single effective "access until"
 * line shown across the app: parent profile gateway, admin user list, expiry
 * banner, etc. Always returns the same shape so every surface renders the
 * same wording.
 */
export function computeAccessStatus(enrollments: AccessStatusInput[] | null | undefined): AccessStatus {
  if (!enrollments || enrollments.length === 0) {
    return { accessUntil: null, reason: 'none', sourceLabel: SOURCE_LABELS.none };
  }

  let best: { reason: AccessReason; date: string | null } | null = null;
  for (const e of enrollments) {
    const c = classify(e);
    if (c.reason === 'none') continue;
    if (!best) {
      best = c;
      continue;
    }
    const cActive = c.reason !== 'expired';
    const bestActive = best.reason !== 'expired';
    // Active enrollments always win over expired ones.
    if (cActive && !bestActive) {
      best = c;
      continue;
    }
    if (!cActive && bestActive) continue;
    // Task #326: A paid enrollment always beats a stale unpaid admin_grant
    // for the same player, regardless of end date. This is the only
    // pairing where date-based comparison was masking effective paid
    // access (e.g. an admin_assignment with no end date trumping a paid
    // row that has one). Other reason pairings keep the original
    // "latest end date wins" semantics.
    if (cActive && bestActive) {
      if (c.reason === 'paid' && best.reason === 'admin_grant') {
        best = c;
        continue;
      }
      if (c.reason === 'admin_grant' && best.reason === 'paid') {
        continue;
      }
    }
    // Both active (non-paid-vs-admin) or both expired: pick the latest end date.
    const cTime = c.date ? new Date(c.date).getTime() : -Infinity;
    const bTime = best.date ? new Date(best.date).getTime() : -Infinity;
    if (cTime > bTime) {
      best = c;
    } else if (cTime === bTime && PRIORITY[c.reason] > PRIORITY[best.reason]) {
      best = c;
    }
  }

  if (!best || best.reason === 'none') {
    return { accessUntil: null, reason: 'none', sourceLabel: SOURCE_LABELS.none };
  }

  return {
    accessUntil: best.date,
    reason: best.reason,
    sourceLabel: SOURCE_LABELS[best.reason],
  };
}
