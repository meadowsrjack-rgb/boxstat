import type Stripe from "stripe";
import type { IStorage } from "../storage-impl";

export interface SubscriptionInvoiceContext {
  storage: IStorage;
  // Optional Stripe instance used to look up subscription metadata if the
  // invoice doesn't carry it directly. Tests can pass a mock or omit when not
  // needed.
  stripe?: Pick<Stripe, "subscriptions">;
  // Optional Stripe Connect account id for retrieving the subscription on a
  // connected account (matches how the platform Stripe instance is used).
  stripeAccount?: string;
  // Hooks for side-effects we don't want to bake into the helper. Tests skip
  // these to keep the unit isolated.
  notifyAdmins?: (title: string, body: string, organizationId?: string) => Promise<void> | void;
  notifyParentPaymentSuccessful?: (
    accountHolderId: string,
    playerName: string,
    amountCents: number,
  ) => Promise<void> | void;
  evaluateAwards?: (playerId: string) => Promise<void> | void;
  sendReceiptEmail?: (args: {
    accountHolderId: string;
    invoice: Stripe.Invoice;
    program: any | undefined;
  }) => Promise<void> | void;
  log?: (msg: string) => void;
}

export interface SubscriptionInvoiceResult {
  status: "skipped" | "duplicate" | "recorded";
  reason?: string;
  paymentId?: string;
  enrollmentId?: number;
}

/**
 * Handle a paid Stripe subscription invoice (fired as
 * `invoice.payment_succeeded` / `invoice.paid`). Mirrors the
 * `checkout.session.completed` post-payment work so recurring renewals and
 * subscription invoices that miss the checkout webhook still get a real
 * payment row, an active enrollment, and admin notifications.
 *
 * The helper is intentionally pure-ish: it takes injected storage + stripe
 * + notify hooks so it can be unit-tested without spinning up Express.
 */
export async function handleSubscriptionInvoice(
  invoice: Stripe.Invoice,
  ctx: SubscriptionInvoiceContext,
): Promise<SubscriptionInvoiceResult> {
  const log = ctx.log ?? (() => {});

  if (!invoice.paid && invoice.status !== "paid") {
    return { status: "skipped", reason: "invoice not paid" };
  }
  if (!invoice.amount_paid || invoice.amount_paid <= 0) {
    return { status: "skipped", reason: "no amount paid" };
  }
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId) {
    return { status: "skipped", reason: "no subscription on invoice" };
  }

  // Pull metadata: prefer subscription metadata, fall back to invoice metadata
  // (some flows stash it on the invoice instead).
  let metadata: Record<string, string> = { ...(invoice.metadata || {}) } as any;
  let subscription: Stripe.Subscription | undefined;
  if (ctx.stripe) {
    try {
      const opts = ctx.stripeAccount ? { stripeAccount: ctx.stripeAccount } : undefined;
      subscription = await ctx.stripe.subscriptions.retrieve(subscriptionId, undefined, opts as any);
      metadata = { ...(subscription.metadata || {}), ...metadata } as any;
    } catch (err: any) {
      log(`subscription retrieve failed for ${subscriptionId}: ${err.message}`);
    }
  }

  let userId: string | undefined =
    metadata.userId || metadata.accountHolderId || metadata.account_holder_id;
  let packageId: string | undefined = metadata.packageId || metadata.programId;
  let playerId: string | null =
    metadata.playerId || metadata.profileId || null;

  // Metadata fallback: legacy subscriptions created before we propagated
  // metadata to `subscription_data` won't have any of the fields above. Look
  // up the existing enrollment by stripe_subscription_id and reuse its
  // accountHolderId / profileId / programId so we still record the renewal.
  let existingEnrollmentByStripe: any = undefined;
  if (!userId || !packageId) {
    try {
      existingEnrollmentByStripe =
        await ctx.storage.getEnrollmentByStripeSubscriptionId(subscriptionId);
    } catch (err: any) {
      log(`enrollment lookup by stripe sub ${subscriptionId} failed: ${err.message}`);
    }
    if (existingEnrollmentByStripe) {
      userId = userId || existingEnrollmentByStripe.accountHolderId;
      packageId = packageId || existingEnrollmentByStripe.programId;
      playerId = playerId || existingEnrollmentByStripe.profileId || null;
      log(`resolved missing metadata via enrollment ${existingEnrollmentByStripe.id}`);
    }
  }

  if (!userId || !packageId) {
    return {
      status: "skipped",
      reason: `missing metadata (userId=${userId ?? ""}, packageId=${packageId ?? ""})`,
    };
  }

  const paymentIntentId =
    typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent?.id;
  const stripePaymentRef = paymentIntentId || invoice.id;

  // Dedupe: walk the user's payments looking for a row that already records
  // this invoice (or its payment intent). Avoids double-charging when the
  // checkout.session.completed webhook already wrote the row for the first
  // invoice in a brand-new subscription.
  const existing = await ctx.storage.getPaymentsByUser(userId);
  const dupe = existing.find(
    (p: any) =>
      (p.stripePaymentId === stripePaymentRef ||
        p.stripePaymentId === invoice.id ||
        (paymentIntentId && p.stripePaymentId === paymentIntentId)) &&
      p.status === "completed",
  );
  if (dupe) {
    return { status: "duplicate", reason: `payment ${dupe.id} already linked`, paymentId: String(dupe.id) };
  }

  // Resolve org id.
  let organizationId: string | undefined;
  const player = playerId ? await ctx.storage.getUser(playerId) : null;
  organizationId = player?.organizationId;
  if (!organizationId) {
    const buyer = await ctx.storage.getUser(userId);
    organizationId = buyer?.organizationId;
  }
  if (!organizationId) {
    const program = await ctx.storage.getProgram(packageId);
    organizationId = program?.organizationId;
  }
  if (!organizationId) organizationId = "default-org";

  const program = await ctx.storage.getProgram(packageId);

  const payment = await ctx.storage.createPayment({
    organizationId,
    userId,
    playerId: playerId || undefined,
    amount: invoice.amount_paid,
    currency: (invoice.currency || "usd").toLowerCase(),
    paymentType: program?.type || "subscription",
    status: "completed",
    description: program?.name || "Subscription payment",
    packageId,
    programId: packageId,
    stripePaymentId: stripePaymentRef,
  } as any);

  log(`recorded subscription payment ${payment?.id} for user ${userId} (invoice ${invoice.id})`);

  // Compute end date from current_period_end if available.
  let enrollmentEndDate: string | undefined;
  if (subscription?.current_period_end) {
    enrollmentEndDate = new Date(subscription.current_period_end * 1000).toISOString();
  }

  // Find existing enrollment for this subscription so we can extend instead of
  // duplicating. We also accept a same-program active enrollment for the same
  // player (renewal where the original was created from a different stripe id).
  let enrollmentId: number | undefined;
  let createdNewEnrollment = false;
  if (playerId) {
    const active = await ctx.storage.getActiveEnrollmentsWithCredits(playerId);
    const matching =
      active.find(
        (e: any) =>
          e.stripeSubscriptionId && e.stripeSubscriptionId === subscriptionId,
      ) ||
      active.find((e: any) => e.programId === packageId) ||
      existingEnrollmentByStripe;
    if (matching) {
      const updated = await ctx.storage.updateEnrollment(matching.id, {
        status: "active",
        paymentId: payment ? String(payment.id) : matching.paymentId,
        stripeSubscriptionId: subscriptionId,
        endDate: enrollmentEndDate ?? matching.endDate,
      } as any);
      enrollmentId = updated?.id;
      log(`extended enrollment ${matching.id} for sub ${subscriptionId}`);
    } else {
      createdNewEnrollment = true;
      const created = await ctx.storage.createEnrollment({
        organizationId,
        accountHolderId: userId,
        profileId: playerId,
        programId: packageId,
        status: "active",
        source: "payment",
        paymentId: payment ? String(payment.id) : undefined,
        stripeSubscriptionId: subscriptionId,
        endDate: enrollmentEndDate,
        remainingCredits: program?.sessionCount ?? undefined,
        totalCredits: program?.sessionCount ?? undefined,
      } as any);
      enrollmentId = created?.id;
      log(`created enrollment ${created?.id} for sub ${subscriptionId}`);
    }

    if (ctx.evaluateAwards) {
      try { await ctx.evaluateAwards(playerId); } catch {}
    }
  }

  // Admin/parent notifications mirror the one-time payment branches.
  const playerName = player
    ? `${player.firstName || ""} ${player.lastName || ""}`.trim() || "A player"
    : "A player";
  const buyer = await ctx.storage.getUser(userId).catch(() => null as any);
  const buyerName = buyer
    ? `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || "A customer"
    : "A customer";
  const dollars = (invoice.amount_paid / 100).toFixed(2);
  if (ctx.notifyParentPaymentSuccessful) {
    try { await ctx.notifyParentPaymentSuccessful(userId, playerName, invoice.amount_paid); } catch {}
  }
  if (ctx.notifyAdmins) {
    try {
      await ctx.notifyAdmins(
        "💰 Payment Received",
        `${buyerName} paid $${dollars} for ${playerName}'s ${program?.name || "subscription"}`,
        organizationId,
      );
    } catch {}
    // Mirror the one-time checkout path: when a brand-new enrollment is
    // created (i.e. first invoice on a new subscription), tell admins it
    // needs a team / skill assignment, OR a goods dispatch.
    if (createdNewEnrollment && program) {
      try {
        if (program.productCategory === "goods") {
          await ctx.notifyAdmins(
            "📦 New Store Order",
            `${playerName} purchased ${program.name} — dispatch required`,
            organizationId,
          );
        } else {
          await ctx.notifyAdmins(
            "🏀 New Enrollment",
            `${playerName} enrolled in ${program.name} — needs team/skill level assignment`,
            organizationId,
          );
        }
      } catch {}
    }
  }

  if (ctx.sendReceiptEmail) {
    try {
      await ctx.sendReceiptEmail({ accountHolderId: userId, invoice, program });
    } catch {}
  }

  return { status: "recorded", paymentId: payment ? String(payment.id) : undefined, enrollmentId };
}
