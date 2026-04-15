/**
 * Derives a player's payment/activity status from their payment records
 * 
 * Status Priority:
 * 1. active - has an active subscription or paid package
 * 2. overdue - has a past_due or expired payment
 * 3. paid_one_time - has a one-time payment that's been completed
 * 4. inactive - no active payments or packages
 */

export type PlayerStatus = "active" | "grace_period" | "overdue" | "paid_one_time" | "unpaid" | "inactive";

export interface Payment {
  id: number;
  userId: string;
  playerId?: string; // For per-player billing: which specific player this payment covers
  amount: number;
  status: string;
  paymentType: string;
  description?: string;
  packageId?: string;
  programId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Program {
  id: string;
  name: string;
  type?: string;
  billingCycle?: string;
  billingModel?: string;
  pricingModel?: string; // Backwards compatibility
  price?: number;
}

export interface StatusResult {
  status: PlayerStatus;
  plan: string | null;
}

export interface EnrollmentStatus {
  status: string;
  profileId?: string | null;
  paymentId?: string | null;
  stripeSubscriptionId?: string | null;
  source?: string | null;
  isTryout?: boolean | null;
  remainingCredits?: number | null;
  programId?: string | null;
}

/**
 * Derives player status from payments, programs, and (optionally) enrollments.
 * Enrollments take priority: grace_period enrollment surfaces as grace_period status.
 * Correctly handles per-player vs per-family billing models.
 */
export function derivePlayerStatus(
  payments: Payment[] | undefined,
  programs: Program[] | undefined,
  playerId: string,
  parentId?: string,
  playerPackageSelected?: string,
  enrollments?: EnrollmentStatus[]
): StatusResult {
  // Check enrollment status first — enrollment lifecycle takes precedence
  if (enrollments && enrollments.length > 0) {
    const playerEnrollments = enrollments.filter(
      (e) => !e.profileId || e.profileId === playerId
    );
    if (playerEnrollments.some((e) => e.status === 'active')) {
      const activeEnrollments = playerEnrollments.filter((e) => e.status === 'active');
      const hasUnpaidEnrollment = activeEnrollments.some((e) => {
        if (e.isTryout) {
          if (e.remainingCredits !== null && e.remainingCredits !== undefined && e.remainingCredits <= 0) {
            const hasPaidEnrollmentForProgram = playerEnrollments.some(
              (other) => other !== e && other.status === 'active' && String(other.programId) === String(e.programId) && !other.isTryout && (other.paymentId || other.stripeSubscriptionId)
            );
            if (!hasPaidEnrollmentForProgram) return true;
          }
          return false;
        }
        const noPayment = !e.paymentId && !e.stripeSubscriptionId;
        if (noPayment) return true;
        return false;
      });
      const hasAnyPaidEnrollment = activeEnrollments.some(
        (e) => (e.paymentId || e.stripeSubscriptionId) && !e.isTryout
      );
      if (hasUnpaidEnrollment && !hasAnyPaidEnrollment) {
        return { status: "unpaid", plan: null };
      }
      // Fall through to payment-based logic which will derive the plan name
    } else if (playerEnrollments.some((e) => e.status === 'grace_period')) {
      return { status: "grace_period", plan: null };
    }
  }

  if (!payments || payments.length === 0) {
    return { status: "inactive", plan: null };
  }

  // Filter payments relevant to this player
  // Different logic for per-player vs per-family billing
  const relevantPayments = payments.filter(p => {
    const program = programs?.find(prog => 
      prog.id === p.programId || prog.id === p.packageId
    );
    
    // Direct player payment always counts
    if (p.userId === playerId) {
      return true;
    }
    
    // Check if payment has a specific playerId (new field for per-player billing)
    if (p.playerId) {
      return p.playerId === playerId;
    }
    
    // Parent payment only counts if:
    // 1. It's a per-family billing model, OR
    // 2. It's organization-wide billing
    if (parentId && p.userId === parentId) {
      const billingModel = program?.billingModel || program?.pricingModel;
      
      // Normalize billing model for comparison (handle all variations)
      const normalized = billingModel?.toLowerCase().replace(/[-\s]/g, '_') || '';
      
      // Per-family billing applies to all children
      // Matches: per-family, Per Family, per_family, family, Per-Family, etc.
      if (normalized.includes('family') || normalized === 'per_family' || normalized === 'perfamily') {
        return true;
      }
      
      // Organization-wide billing applies to all
      // Matches: organization-wide, Organization-Wide, organization_wide, etc.
      if (normalized.includes('organization') || normalized === 'organization_wide') {
        return true;
      }
      
      // For per-player billing WITHOUT a playerId field (legacy payments),
      // fall back to checking if player's packageSelected matches
      // Note: This is less accurate but handles older payment records
      if (playerPackageSelected && 
          (p.programId === playerPackageSelected || p.packageId === playerPackageSelected)) {
        return true;
      }
      
      // If no billing model is specified, treat as family-wide (legacy support)
      if (!billingModel) {
        return true;
      }
      
      return false;
    }
    
    return false;
  });

  if (relevantPayments.length === 0) {
    return { status: "inactive", plan: null };
  }

  // Check for active payments (subscription or completed)
  const activePayment = relevantPayments.find(p => 
    p.status === "completed" || p.status === "active" || p.status === "paid"
  );
  
  if (activePayment) {
    const program = programs?.find(p => 
      p.id === activePayment.programId || p.id === activePayment.packageId
    );
    
    // Determine if it's a subscription or one-time
    const isSubscription = program?.type === "Subscription" || 
                          program?.billingCycle || 
                          activePayment.paymentType?.includes("subscription");
    
    if (isSubscription) {
      return { 
        status: "active", 
        plan: program?.name || activePayment.description || "Active Subscription"
      };
    } else {
      return { 
        status: "paid_one_time", 
        plan: program?.name || activePayment.description || "One-Time Purchase"
      };
    }
  }

  // Check for overdue payments
  const overduePayment = relevantPayments.find(p => 
    p.status === "past_due" || p.status === "expired" || p.status === "failed"
  );
  
  if (overduePayment) {
    const program = programs?.find(p => 
      p.id === overduePayment.programId || p.id === overduePayment.packageId
    );
    return { 
      status: "overdue", 
      plan: program?.name || overduePayment.description || "Overdue Payment"
    };
  }

  // Check for pending payments (waiting for payment)
  const pendingPayment = relevantPayments.find(p => 
    p.status === "pending" || p.status === "processing"
  );
  
  if (pendingPayment) {
    const program = programs?.find(p => 
      p.id === pendingPayment.programId || p.id === pendingPayment.packageId
    );
    return { 
      status: "inactive", 
      plan: program?.name || "Pending Payment"
    };
  }

  return { status: "inactive", plan: null };
}

/**
 * Gets the status color for UI display
 */
export function getStatusColor(status: PlayerStatus): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "grace_period":
      return "bg-yellow-400";
    case "overdue":
      return "bg-red-500";
    case "paid_one_time":
      return "bg-purple-500";
    case "unpaid":
      return "bg-orange-500";
    case "inactive":
    default:
      return "bg-gray-300";
  }
}

/**
 * Gets the status label for UI display
 */
export function getStatusLabel(status: PlayerStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "grace_period":
      return "Grace Period";
    case "overdue":
      return "Overdue";
    case "paid_one_time":
      return "One-Time Paid";
    case "unpaid":
      return "Unpaid";
    case "inactive":
    default:
      return "Inactive";
  }
}

/**
 * Derives player status from enrollments, prioritizing enrollment status over payment status.
 * Returns grace_period if the player has an active grace period enrollment.
 */
export function derivePlayerStatusFromEnrollments(
  enrollments: Array<{ status: string; profileId?: string | null; paymentId?: string | null; stripeSubscriptionId?: string | null; isTryout?: boolean | null; remainingCredits?: number | null; programId?: string | null }> | undefined,
  playerId: string,
  paymentsStatus: PlayerStatus,
): PlayerStatus {
  if (!enrollments) return paymentsStatus;

  const playerEnrollments = enrollments.filter(e => !e.profileId || e.profileId === playerId);

  if (playerEnrollments.some(e => e.status === 'active')) {
    const activeEnrollments = playerEnrollments.filter(e => e.status === 'active');
    const hasUnpaid = activeEnrollments.some((e) => {
      if (e.isTryout) {
        if (e.remainingCredits !== null && e.remainingCredits !== undefined && e.remainingCredits <= 0) {
          const hasPaidForProgram = playerEnrollments.some(
            (other) => other !== e && other.status === 'active' && String(other.programId) === String(e.programId) && !other.isTryout && (other.paymentId || other.stripeSubscriptionId)
          );
          if (!hasPaidForProgram) return true;
        }
        return false;
      }
      if (!e.paymentId && !e.stripeSubscriptionId) return true;
      return false;
    });
    const hasAnyPaid = activeEnrollments.some(e => (e.paymentId || e.stripeSubscriptionId) && !e.isTryout);
    if (hasUnpaid && !hasAnyPaid) return 'unpaid';
    return 'active';
  }
  if (playerEnrollments.some(e => e.status === 'grace_period')) return 'grace_period';

  return paymentsStatus;
}
