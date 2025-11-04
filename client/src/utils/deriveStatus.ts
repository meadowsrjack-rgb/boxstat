/**
 * Derives a player's payment/activity status from their payment records
 * 
 * Status Priority:
 * 1. active - has an active subscription or paid package
 * 2. overdue - has a past_due or expired payment
 * 3. paid_one_time - has a one-time payment that's been completed
 * 4. inactive - no active payments or packages
 */

export type PlayerStatus = "active" | "overdue" | "paid_one_time" | "inactive";

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

/**
 * Derives player status from payments and programs
 * Correctly handles per-player vs per-family billing models
 */
export function derivePlayerStatus(
  payments: Payment[] | undefined,
  programs: Program[] | undefined,
  playerId: string,
  parentId?: string,
  playerPackageSelected?: string
): StatusResult {
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
      
      // Per-family billing applies to all children
      if (billingModel === "Per Family" || billingModel === "per-family" || 
          billingModel === "family" || billingModel === "Per-Family") {
        return true;
      }
      
      // Organization-wide billing applies to all
      if (billingModel === "Organization-Wide" || billingModel === "organization-wide") {
        return true;
      }
      
      // For per-player billing WITHOUT a playerId field (legacy payments),
      // fall back to checking if player's packageSelected matches
      // Note: This is less accurate but handles older payment records
      if (playerPackageSelected && 
          (p.programId === playerPackageSelected || p.packageId === playerPackageSelected)) {
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
    case "overdue":
      return "bg-red-500";
    case "paid_one_time":
      return "bg-purple-500";
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
    case "overdue":
      return "Overdue";
    case "paid_one_time":
      return "One-Time Paid";
    case "inactive":
    default:
      return "Inactive";
  }
}
