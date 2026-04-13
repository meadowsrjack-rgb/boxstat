import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { notionService } from "./notion";
import Stripe from "stripe";
import * as emailService from "./email";
import crypto from "crypto";
import cron from "node-cron";
import searchRoutes from "./routes/search";
import privacyRoutes from "./routes/privacy";
import { setupNotificationRoutes } from "./routes/notifications";
import { setupAdminNotificationRoutes } from "./routes/adminNotifications";
import { adminNotificationService } from "./services/adminNotificationService";
import { requireAuth, optionalAuth, isAdmin, isCoachOrAdmin, setAuthStorage } from "./auth";
import multer from "multer";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertTeamSchema,
  insertEventSchema,
  insertAttendanceSchema,
  insertAwardSchema,
  insertUserAwardSchema,
  insertAnnouncementSchema,
  insertMessageSchema,
  insertPaymentSchema,
  insertProgramSchema,
  insertPackageSelectionSchema,
  insertDivisionSchema,
  insertSkillSchema,
  insertNotificationSchema,
  insertEventWindowSchema,
  insertRsvpResponseSchema,
  insertFacilitySchema,
  insertAwardDefinitionSchema,
  insertUserAwardRecordSchema,
  insertRefundSchema,
} from "@shared/schema";
import { evaluateAwardsForUser } from "./utils/awardEngine";
import { populateAwards } from "./utils/populateAwards";
import { pushNotifications, resolveEventParticipants } from "./services/pushNotificationHelper";
import { notificationScheduler } from "./services/notificationScheduler";
import { notificationService } from "./services/notificationService";
import { analyzePlayerAttendance, getTeamCoachIds, getOrgAdminIds, triggerRealTimeAttendanceNotifications } from "./services/attendanceTracker";
import { db } from "./db";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { notifications, notificationRecipients, users, teamMemberships, teams, waivers, waiverVersions, waiverSignatures, productEnrollments, products, userAwards, platformSettings, organizations, attendances, rsvpResponses, contactManagementMessages, payments, messages as messagesTable } from "@shared/schema";
import { eq, and, or, sql, desc, inArray, gte, count } from "drizzle-orm";

let wss: WebSocketServer | null = null;

// Helper function to check if user has any admin profile with the same email
// This handles multi-profile accounts where a user might have both parent and admin profiles
async function hasAdminProfile(userId: string, organizationId: string): Promise<boolean> {
  try {
    const currentUser = await storage.getUser(userId);
    if (!currentUser?.email) return false;
    
    // Check if any profile with the same email has admin role
    const allUsers = await storage.getUsersByOrganization(organizationId);
    return allUsers.some((u: any) => 
      u.email === currentUser.email && u.role === 'admin'
    );
  } catch (error) {
    console.error('Error checking admin profile:', error);
    return false;
  }
}

// Helper function to check if user has any coach or admin profile with the same email
async function hasCoachOrAdminProfile(userId: string, organizationId: string): Promise<boolean> {
  try {
    const currentUser = await storage.getUser(userId);
    if (!currentUser?.email) return false;
    
    const allUsers = await storage.getUsersByOrganization(organizationId);
    return allUsers.some((u: any) => 
      u.email === currentUser.email && (u.role === 'admin' || u.role === 'coach')
    );
  } catch (error) {
    console.error('Error checking coach/admin profile:', error);
    return false;
  }
}

// Helper function to create a legacy subscription notification for a user
async function createLegacySubscriptionNotification(userId: string, subscriptionCount: number, organizationId: string = "default-org"): Promise<void> {
  try {
    // Check if a legacy_subscription notification already exists and is unread for this user
    const existingNotification = await db.select({
      id: notifications.id,
      recipientId: notificationRecipients.id,
    })
      .from(notificationRecipients)
      .innerJoin(notifications, eq(notificationRecipients.notificationId, notifications.id))
      .where(and(
        eq(notificationRecipients.userId, userId),
        sql`'legacy_subscription' = ANY(${notifications.types})`,
        eq(notificationRecipients.isRead, false)
      ))
      .limit(1);
    
    if (existingNotification.length > 0) {
      console.log(`📋 Legacy subscription notification already exists for user ${userId}`);
      return;
    }
    
    // Create a new notification
    const [createdNotification] = await db.insert(notifications).values({
      organizationId,
      types: ['announcement', 'legacy_subscription'],
      title: '🎁 You Have Subscriptions to Assign!',
      message: `You have ${subscriptionCount} subscription${subscriptionCount > 1 ? 's' : ''} from your previous account that need${subscriptionCount === 1 ? 's' : ''} to be assigned to your players.`,
      recipientTarget: 'users',
      recipientUserIds: [userId],
      deliveryChannels: ['in_app'],
      sentBy: 'system',
      status: 'sent',
    }).returning();
    
    // Create the recipient record
    await db.insert(notificationRecipients).values({
      notificationId: createdNotification.id,
      userId,
      isRead: false,
      deliveryStatus: { in_app: 'sent' },
    });
    
    console.log(`✅ Created legacy subscription notification for user ${userId}`);
  } catch (error) {
    console.error('Error creating legacy subscription notification:', error);
  }
}

// Helper function to clear legacy subscription notification when all subscriptions are assigned
async function clearLegacySubscriptionNotification(userId: string): Promise<void> {
  try {
    // Find and mark as read all legacy_subscription notifications for this user
    const legacyNotifications = await db.select({
      recipientId: notificationRecipients.id,
    })
      .from(notificationRecipients)
      .innerJoin(notifications, eq(notificationRecipients.notificationId, notifications.id))
      .where(and(
        eq(notificationRecipients.userId, userId),
        sql`'legacy_subscription' = ANY(${notifications.types})`,
        eq(notificationRecipients.isRead, false)
      ));
    
    if (legacyNotifications.length > 0) {
      for (const notification of legacyNotifications) {
        await db.update(notificationRecipients)
          .set({ 
            isRead: true,
            readAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(notificationRecipients.id, notification.recipientId));
      }
      console.log(`✅ Cleared ${legacyNotifications.length} legacy subscription notification(s) for user ${userId}`);
    }
  } catch (error) {
    console.error('Error clearing legacy subscription notification:', error);
  }
}

// Initialize Stripe (global fallback) — use test keys in dev mode if available
const stripeSecretKey = (process.env.NODE_ENV === 'development' && process.env.TESTING_STRIPE_SECRET_KEY)
  ? process.env.TESTING_STRIPE_SECRET_KEY
  : process.env.STRIPE_SECRET_KEY;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-06-30.basil" })
  : null;

const stripeOrgCache = new Map<string, { instance: Stripe; key: string; createdAt: number }>();
const STRIPE_CACHE_TTL = 5 * 60 * 1000;

async function getOrgConnectInfo(organizationId: string): Promise<{ connectedAccountId: string | null; isConnected: boolean; stripeConnectStatus: string | null; stripeConnectType: string | null }> {
  let org: Awaited<ReturnType<typeof storage.getOrganization>>;
  try {
    org = await storage.getOrganization(organizationId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[Connect] Database error looking up org ${organizationId} for Connect info:`, msg);
    throw new Error(`Failed to retrieve Connect status for org ${organizationId}: ${msg}`);
  }
  if (!org) {
    console.error(`[Connect] Org ${organizationId} not found — cannot determine Connect status. Blocking checkout to prevent misrouting.`);
    throw new Error(`Org ${organizationId} not found — cannot verify Connect routing. Checkout blocked.`);
  }
  if (!org.stripeConnectedId || org.stripeConnectStatus !== 'active') {
    console.log(`[Connect] Org ${organizationId} is not Connect-enabled (status: ${org.stripeConnectStatus ?? 'none'})`);
    return { connectedAccountId: null, isConnected: false, stripeConnectStatus: org.stripeConnectStatus ?? null, stripeConnectType: org.stripeConnectType ?? null };
  }
  return { connectedAccountId: org.stripeConnectedId, isConnected: true, stripeConnectStatus: org.stripeConnectStatus, stripeConnectType: org.stripeConnectType ?? 'express' };
}

async function getStripeForOrg(organizationId: string): Promise<Stripe | null> {
  try {
    const connectInfo = await getOrgConnectInfo(organizationId);
    if (connectInfo.isConnected) {
      return stripe;
    }
    const cached = stripeOrgCache.get(organizationId);
    if (cached && Date.now() - cached.createdAt < STRIPE_CACHE_TTL) {
      return cached.instance;
    }
    const org = await storage.getOrganization(organizationId);
    if (org?.stripeSecretKey) {
      const instance = new Stripe(org.stripeSecretKey, { apiVersion: "2025-06-30.basil" });
      stripeOrgCache.set(organizationId, { instance, key: org.stripeSecretKey, createdAt: Date.now() });
      return instance;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[Connect] getStripeForOrg: failed to resolve Stripe instance for org ${organizationId}, falling back to platform Stripe:`, msg);
  }
  return stripe;
}

async function getOrCreateStripeCustomer(stripeInstance: Stripe, user: any): Promise<string> {
  const fullName = [user.firstName, user.lastName].filter((v) => typeof v === 'string' && v.trim()).join(' ').trim();
  let stripeCustomerId = user.stripeCustomerId;
  if (stripeCustomerId) {
    try {
      const existingCustomer = await stripeInstance.customers.retrieve(stripeCustomerId) as Stripe.Customer;
      if (!existingCustomer.name && fullName) {
        await stripeInstance.customers.update(stripeCustomerId, { name: fullName });
      }
      return stripeCustomerId;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.code === 'resource_missing') {
        console.log(`Stripe customer ${stripeCustomerId} not found (likely test-mode ID). Creating new customer for ${user.email}`);
        stripeCustomerId = null;
      } else {
        throw err;
      }
    }
  }
  if (!stripeCustomerId) {
    const customer = await stripeInstance.customers.create({
      email: user.email,
      name: fullName || undefined,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
    await storage.updateUser(user.id, { stripeCustomerId });
  }
  return stripeCustomerId;
}

async function calculateServiceFeeCents(subtotalCents: number): Promise<number> {
  let technologyFeePercent = 2;
  try {
    const rows = await db.select().from(platformSettings).where(eq(platformSettings.key, 'boxstat_technology_fee_percent'));
    if (rows.length > 0 && rows[0].value) {
      const parsed = parseFloat(rows[0].value);
      if (!isNaN(parsed)) technologyFeePercent = parsed;
    }
  } catch {
    // default to 2%
  }
  const feeCents = subtotalCents * (technologyFeePercent / 100) + subtotalCents * 0.029 + 30;
  return Math.round(feeCents);
}

function buildServiceFeeLineItem(feeCents: number, recurring?: { interval: string; interval_count: number }): any {
  const item: any = {
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Service Fee',
        description: 'Secure payment processing and platform maintenance.',
      },
      unit_amount: feeCents,
    },
    quantity: 1,
  };
  if (recurring) {
    item.price_data.recurring = recurring;
  }
  return item;
}

async function getServiceFeeLineItem(subtotalCents: number, recurring?: { interval: string; interval_count: number }): Promise<{ lineItem: any; feeCents: number }> {
  const feeCents = await calculateServiceFeeCents(subtotalCents);
  return { lineItem: buildServiceFeeLineItem(feeCents, recurring), feeCents };
}

async function getOrgDisplayName(organizationId: string): Promise<string> {
  try {
    const org = await storage.getOrganization(organizationId);
    if (org?.name) {
      return org.name.replace(/[^a-zA-Z0-9 .\/*]/g, '').trim() || 'BoxStat';
    }
  } catch (e) {}
  return 'BoxStat';
}

async function applyConnectChargeParams(
  sessionParams: any,
  organizationId: string,
  mode: 'payment' | 'subscription',
  applicationFeeAmount?: number,
  subscriptionSubtotalCents?: number,
): Promise<{ applied: boolean; connectedAccountId: string | null; stripeConnectStatus: string | null }> {
  const connectInfo = await getOrgConnectInfo(organizationId);
  if (!connectInfo.isConnected || !connectInfo.connectedAccountId) {
    console.log(`[Connect] Org ${organizationId} is not Connect-enabled — skipping Connect params (no routing applied)`);
    return { applied: false, connectedAccountId: null, stripeConnectStatus: connectInfo.stripeConnectStatus };
  }

  console.log(`[Connect] Applying ${mode} Connect params for org ${organizationId} → ${connectInfo.connectedAccountId}`, {
    applicationFeeAmount: applicationFeeAmount ?? null,
    mode,
    connectType: connectInfo.stripeConnectType ?? 'express',
  });

  if (mode === 'payment') {
    sessionParams.payment_intent_data = {
      ...(sessionParams.payment_intent_data || {}),
      transfer_data: {
        destination: connectInfo.connectedAccountId,
      },
    };
    if (applicationFeeAmount && applicationFeeAmount > 0) {
      sessionParams.payment_intent_data.application_fee_amount = applicationFeeAmount;
    }
    console.log(`[Connect] payment_intent_data applied:`, {
      transfer_data: sessionParams.payment_intent_data.transfer_data,
      application_fee_amount: sessionParams.payment_intent_data.application_fee_amount ?? null,
    });
  } else if (mode === 'subscription') {
    sessionParams.subscription_data = {
      ...(sessionParams.subscription_data || {}),
      transfer_data: {
        destination: connectInfo.connectedAccountId,
      },
    };
    if (applicationFeeAmount && applicationFeeAmount > 0 && subscriptionSubtotalCents && subscriptionSubtotalCents > 0) {
      const totalRecurringCents = subscriptionSubtotalCents + applicationFeeAmount;
      const feePercent = Math.round((applicationFeeAmount / totalRecurringCents) * 10000) / 100;
      sessionParams.subscription_data.application_fee_percent = feePercent;
    }
    console.log(`[Connect] subscription_data applied:`, {
      transfer_data: sessionParams.subscription_data.transfer_data,
      application_fee_percent: sessionParams.subscription_data.application_fee_percent ?? null,
    });
  }

  return { applied: true, connectedAccountId: connectInfo.connectedAccountId, stripeConnectStatus: connectInfo.stripeConnectStatus };
}

function verifyConnectRouting(
  sessionParams: Record<string, unknown>,
  mode: 'payment' | 'subscription',
  organizationId: string,
  connectResult: { applied: boolean; connectedAccountId: string | null; stripeConnectStatus: string | null },
  context?: { applicationFeeAmount?: number; checkoutType?: string },
): void {
  const decisionLog = {
    orgId: organizationId,
    connectedAccountId: connectResult.connectedAccountId,
    stripeConnectStatus: connectResult.stripeConnectStatus,
    connectApplied: connectResult.applied,
    mode,
    applicationFeeAmount: context?.applicationFeeAmount ?? null,
    checkoutType: context?.checkoutType ?? 'unknown',
  };

  if (!connectResult.applied) {
    console.log(`[Connect] Decision: Connect not applied (org not connected)`, decisionLog);
    return;
  }

  const paymentIntentData = sessionParams.payment_intent_data as { transfer_data?: { destination?: string } } | undefined;
  const subscriptionData = sessionParams.subscription_data as { transfer_data?: { destination?: string } } | undefined;
  const destination = mode === 'payment'
    ? paymentIntentData?.transfer_data?.destination
    : subscriptionData?.transfer_data?.destination;

  if (!destination) {
    console.error(`[Connect] ROUTING ERROR: Connect params were applied but transfer_data.destination is missing. Blocking checkout.`, decisionLog);
    throw new Error(`Connect routing verification failed for org ${organizationId}: transfer_data.destination is not set. Payment blocked to prevent funds misrouting.`);
  }

  if (destination !== connectResult.connectedAccountId) {
    console.error(`[Connect] ROUTING ERROR: transfer_data.destination mismatch. Expected ${connectResult.connectedAccountId}, got ${destination}. Blocking checkout.`, decisionLog);
    throw new Error(`Connect routing verification failed for org ${organizationId}: transfer_data.destination does not match expected connected account. Payment blocked to prevent funds misrouting.`);
  }

  console.log(`[Connect] Decision: routing verified`, { ...decisionLog, destination });
}

// Helper function to generate stable UUID for pricing options
function generateStablePricingOptionId(): string {
  return `po_${crypto.randomUUID()}`;
}

function billingIntervalDaysToStripe(days: number): { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } {
  if (days === 7) return { interval: 'week', interval_count: 1 };
  if (days === 14) return { interval: 'week', interval_count: 2 };
  if (days === 30) return { interval: 'month', interval_count: 1 };
  if (days === 60) return { interval: 'month', interval_count: 2 };
  if (days === 90) return { interval: 'month', interval_count: 3 };
  if (days === 180) return { interval: 'month', interval_count: 6 };
  if (days === 365) return { interval: 'year', interval_count: 1 };
  return { interval: 'day', interval_count: days };
}

function legacyBillingCycleToStripe(billingCycle: string): { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } {
  const cycle = billingCycle.toLowerCase();
  if (cycle === 'quarterly') return { interval: 'month', interval_count: 3 };
  if (cycle === '6-month' || cycle === '6 month' || cycle === 'semi-annual') return { interval: 'month', interval_count: 6 };
  if (cycle === 'yearly' || cycle === 'year' || cycle === 'annual') return { interval: 'year', interval_count: 1 };
  if (cycle === 'weekly' || cycle === 'week') return { interval: 'week', interval_count: 1 };
  if (cycle === 'daily' || cycle === 'day') return { interval: 'day', interval_count: 1 };
  if (cycle === '28-day' || cycle === '28 day') return { interval: 'day', interval_count: 28 };
  const dayMatch = cycle.match(/^(\d+)[- ]?day$/);
  if (dayMatch) return { interval: 'day', interval_count: parseInt(dayMatch[1]) };
  return { interval: 'month', interval_count: 1 };
}

function resolveStripeInterval(billingIntervalDays?: number, billingCycle?: string): { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } {
  if (billingIntervalDays && billingIntervalDays > 0) {
    return billingIntervalDaysToStripe(billingIntervalDays);
  }
  return legacyBillingCycleToStripe(billingCycle || 'Monthly');
}

// Deep clone helper that preserves types (unlike JSON.stringify which loses Dates/BigInt)
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    // Handle primitives including BigInt
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  const cloned: any = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as any)[key]);
  }
  return cloned;
}

// Helper function to ensure all pricing options have stable server-side IDs
function assignStablePricingOptionIds(pricingOptions: any[]): any[] {
  return pricingOptions.map((option: any) => ({
    ...option,
    // Only preserve IDs that are server-generated (start with 'po_')
    // Client-generated IDs get replaced with stable server IDs
    id: option.id && option.id.startsWith('po_') ? option.id : generateStablePricingOptionId(),
  }));
}

// Helper function to sync program pricing options with Stripe
// Creates/updates Stripe Products and Prices for each pricing option
// Note: Pricing options should already have stable IDs assigned before calling this function
async function syncProgramWithStripe(
  program: any,
  pricingOptions: any[] = []
): Promise<{ stripeProductId: string | null; updatedPricingOptions: any[] }> {
  if (!stripe) {
    console.log('Stripe not configured, skipping sync');
    // Just return options as-is (they should already have stable IDs)
    return { stripeProductId: program.stripeProductId || null, updatedPricingOptions: pricingOptions };
  }

  try {
    let stripeProductId = program.stripeProductId;

    // Create or get Stripe Product for this program
    if (!stripeProductId) {
      const stripeProduct = await stripe.products.create({
        name: program.name,
        description: program.description || undefined,
        metadata: {
          programId: program.id,
          organizationId: program.organizationId,
        },
      });
      stripeProductId = stripeProduct.id;
      console.log(`Created Stripe Product ${stripeProductId} for program ${program.name}`);
    } else {
      // Update existing product name/description if changed
      await stripe.products.update(stripeProductId, {
        name: program.name,
        description: program.description || undefined,
      });
    }

    // Create Stripe Prices for each pricing option that doesn't have one
    // Note: All options should already have stable IDs (po_ prefix) from the route handlers
    const updatedPricingOptions = await Promise.all(
      pricingOptions.map(async (option: any) => {
        const updatedOption = { ...option };

        // Skip price creation if a stripePriceId already exists (either auto-synced or linked from Stripe)
        if (option.stripePriceId) {
          console.log(`Using existing Stripe Price ${option.stripePriceId} for option "${option.name}"`);
          return updatedOption;
        }

        // Create main price for this option if not exists
        // Skip zero-price options as Stripe doesn't allow $0 prices for one-time charges
        if (option.price && option.price > 0) {
          try {
            // Determine if this is recurring or one-time based on billingCycle
            const isRecurring = option.optionType === 'subscription' || option.billingCycle || option.billingIntervalDays || 
                               (option.convertsToMonthly && option.durationDays && option.durationDays > 31);
            
            // For bundles that convert to monthly, create as one-time (the initial bundle payment)
            // The monthly conversion will use a separate price
            const priceParams: Stripe.PriceCreateParams = {
              product: stripeProductId!,
              unit_amount: option.price,
              currency: 'usd',
              metadata: {
                programId: program.id,
                pricingOptionId: option.id,
                pricingOptionName: option.name,
              },
            };

            // If it's a straight monthly subscription (not a bundle), make it recurring
            if ((option.billingCycle || option.billingIntervalDays || option.optionType === 'subscription') && !option.convertsToMonthly) {
              const optResolved = resolveStripeInterval(option.billingIntervalDays, option.billingCycle);
              priceParams.recurring = { interval: optResolved.interval, interval_count: optResolved.interval_count };
            }

            const stripePrice = await stripe.prices.create(priceParams);
            updatedOption.stripePriceId = stripePrice.id;
            console.log(`Created Stripe Price ${stripePrice.id} for option "${option.name}"`);
          } catch (error: any) {
            console.error(`Failed to create Stripe Price for option "${option.name}":`, error.message);
          }
        }

        // Create installment Stripe price for bundle installment plans
        if (option.allowInstallments && option.installmentPrice && option.installmentPrice > 0 && !option.installmentStripePriceId) {
          try {
            const instInterval = billingIntervalDaysToStripe(option.installmentIntervalDays || 30);
            const installmentPriceParams: Stripe.PriceCreateParams = {
              product: stripeProductId!,
              unit_amount: option.installmentPrice,
              currency: 'usd',
              recurring: { interval: instInterval.interval, interval_count: instInterval.interval_count },
              metadata: {
                programId: program.id,
                pricingOptionId: option.id,
                pricingOptionName: `${option.name} - Installment`,
                isInstallmentPlan: 'true',
                installmentCount: String(option.installmentCount || 3),
              },
            };

            const installmentStripePrice = await stripe.prices.create(installmentPriceParams);
            updatedOption.installmentStripePriceId = installmentStripePrice.id;
            console.log(`Created installment Stripe Price ${installmentStripePrice.id} for option "${option.name}"`);
          } catch (error: any) {
            console.error(`Failed to create installment Stripe Price for option "${option.name}":`, error.message);
          }
        }

        // Create monthly price for bundle-to-monthly conversion if needed
        if (option.convertsToMonthly && option.monthlyPrice > 0 && !option.monthlyStripePriceId) {
          try {
            const monthlyPriceParams: Stripe.PriceCreateParams = {
              product: stripeProductId!,
              unit_amount: option.monthlyPrice,
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: {
                programId: program.id,
                pricingOptionId: option.id,
                pricingOptionName: `${option.name} - Monthly`,
                isMonthlyConversion: 'true',
              },
            };

            const monthlyPrice = await stripe.prices.create(monthlyPriceParams);
            updatedOption.monthlyStripePriceId = monthlyPrice.id;
            console.log(`Created monthly Stripe Price ${monthlyPrice.id} for option "${option.name}"`);
          } catch (error: any) {
            console.error(`Failed to create monthly Stripe Price for option "${option.name}":`, error.message);
          }
        }

        return updatedOption;
      })
    );

    return { stripeProductId, updatedPricingOptions };
  } catch (error: any) {
    console.error('Error syncing program with Stripe:', error.message);
    return { stripeProductId: program.stripeProductId || null, updatedPricingOptions: pricingOptions };
  }
}

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const awardImageDir = path.join(process.cwd(), 'client', 'public', 'trophiesbadges');

// Ensure upload directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(awardImageDir)) {
  fs.mkdirSync(awardImageDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const awardImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, awardImageDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'award-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const uploadAwardImage = multer({ 
  storage: awardImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Simple password hashing for development (use bcrypt in production)
function hashPassword(password: string): string {
  // Very basic hashing - in production use bcrypt
  return Buffer.from(password).toString('base64');
}

// Auth middleware now imported from ./auth.ts - supports both session AND JWT tokens
const isAuthenticated = requireAuth;

async function sendPaymentReceiptEmail(session: Stripe.Checkout.Session) {
  try {
    const userId = session.metadata?.userId || session.metadata?.accountHolderId;
    if (!userId) return;
    
    const user = await storage.getUser(userId);
    if (!user?.email) return;

    const playerId = session.metadata?.playerId;
    let playerName: string | undefined;
    if (playerId && playerId !== userId) {
      const player = await storage.getUser(playerId);
      if (player) {
        playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || undefined;
      }
    }

    const lineItems = await (async () => {
      try {
        const orgStripe = await getStripeForOrg(user.organizationId);
        if (!orgStripe) return null;
        return await orgStripe.checkout.sessions.listLineItems(session.id);
      } catch {
        return null;
      }
    })();

    const items: { name: string; amount: number }[] = [];
    if (lineItems?.data?.length) {
      for (const item of lineItems.data) {
        items.push({
          name: item.description || 'Item',
          amount: item.amount_total || 0,
        });
      }
    } else {
      const packageId = session.metadata?.packageId;
      const program = packageId ? await storage.getProgram(packageId) : null;
      items.push({
        name: program?.name || 'Payment',
        amount: session.amount_total || 0,
      });
    }

    let orgName: string | undefined;
    try {
      const org = await storage.getOrganization(user.organizationId);
      orgName = org?.name || undefined;
    } catch {}

    await emailService.sendPaymentReceipt({
      email: user.email,
      firstName: user.firstName || '',
      items,
      totalAmount: session.amount_total || 0,
      playerName,
      organizationName: orgName,
    });
  } catch (err: any) {
    console.error('⚠️ Payment receipt email failed (non-fatal):', err.message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  setAuthStorage(storage);

  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', timestamp: Date.now() });
  });
  
  // Register object storage routes for persistent file uploads
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();
  
  // Initialize organizations (always, not just dev)
  await (storage as any).initializeOrganizations?.();

  // Migrate old award tier names to new ones
  await (storage as any).migrateAwardTierNames?.();

  // Backfill triggerCategory='manual' for coach-assigned award definitions
  await (storage as any).backfillManualAwardTriggerCategory?.();

  // Initialize test users and facilities in development
  if (process.env.NODE_ENV === 'development') {
    await (storage as any).initializeTestUsers?.();
    await (storage as any).initializeFacilities?.();
  }
  
  // =============================================
  // STATIC ASSETS ROUTES
  // =============================================
  
  // Apple App Site Association for Universal Links (magic link deep linking)
  app.get('/.well-known/apple-app-site-association', (req, res) => {
    const teamId = process.env.APNS_TEAM_ID || 'TEAMID';
    const bundleId = 'boxstat.app'; // Must match iOS app bundle ID exactly
    
    const aasa = {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${bundleId}`,
            paths: [
              "/magic-link-login",
              "/magic-link-login/*",
              "/claim-verify",
              "/claim-verify/*",
              "/invite/*"
            ]
          }
        ]
      },
      webcredentials: {
        apps: [`${teamId}.${bundleId}`]
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.json(aasa);
  });
  
  // Serve BoxStat logo for emails
  app.get('/assets/logo', (req, res) => {
    const logoPath = new URL('../attached_assets/light_1770352137773.png', import.meta.url).pathname;
    res.sendFile(logoPath);
  });

  // Serve BoxStat full logo for emails
  app.get('/assets/logo-full', (req, res) => {
    const logoPath = new URL('../attached_assets/logofull_light_1775785908348.png', import.meta.url).pathname;
    res.sendFile(logoPath);
  });

  app.get('/assets/org-logo/uyp', (req, res) => {
    const logoPath = new URL('../attached_assets/image_1770353179552.png', import.meta.url).pathname;
    res.sendFile(logoPath);
  });
  
  // =============================================
  // SEARCH ROUTES
  // =============================================
  
  app.use('/api/search', searchRoutes);
  app.use('/api/privacy', privacyRoutes);
  
  // =============================================
  // NOTIFICATION ROUTES
  // =============================================
  
  setupNotificationRoutes(app);
  setupAdminNotificationRoutes(app);
  
  // =============================================
  // APP VERSION ROUTES
  // =============================================
  
  // Get app version requirements for update prompts
  app.get('/api/app/version', (req, res) => {
    const platform = (req.query.platform as string) || 'ios';
    
    const versionConfig = {
      latestVersion: process.env.APP_LATEST_VERSION || '1.0.0',
      minimumVersion: process.env.APP_MINIMUM_VERSION || '1.0.0',
      showSoftPrompt: process.env.APP_SHOW_SOFT_PROMPT !== 'false',
      appStoreUrl: platform === 'android'
        ? (process.env.APP_PLAY_STORE_URL || '')
        : 'https://apps.apple.com/app/boxstat/id6742976949',
      updateMessage: process.env.APP_UPDATE_MESSAGE || 'A new version of BoxStat is available with improvements and bug fixes.',
      forceUpdateMessage: process.env.APP_FORCE_UPDATE_MESSAGE || 'This version of BoxStat is no longer supported. Please update to continue using the app.',
      platformSupported: platform === 'android' ? !!process.env.APP_PLAY_STORE_URL : true,
    };
    
    res.json(versionConfig);
  });
  
  // =============================================
  // AUTH ROUTES
  // =============================================
  
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    const user = await storage.getUser(req.user.id);
    
    // Note: activeProfileId is intentionally not set here so the frontend
    // can rely on the selectedPlayerId stored in localStorage for player selection.
    
    if (user) {
      (user as any).needsPassword = !user.password;
      
      // Include organization's platform subscription status for admin gating
      if (user.organizationId) {
        const org = await storage.getOrganization(user.organizationId);
        if (org) {
          (user as any).organizationPlatformSubscriptionStatus = (org as any).platformSubscriptionStatus ?? 'inactive';
          (user as any).organizationPlatformPlan = (org as any).platformPlan ?? null;
        }
      }
    }
    
    res.json(user);
  });
  
  // Update user's default dashboard preference
  app.patch('/api/auth/user/preferences', requireAuth, async (req: any, res) => {
    try {
      const { defaultDashboardView } = req.body;
      
      // Validate input
      if (defaultDashboardView !== undefined && typeof defaultDashboardView !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid dashboard view value" 
        });
      }
      
      // Update user's preference
      const updated = await storage.updateUser(req.user.id, {
        defaultDashboardView,
      });
      
      res.json({ 
        success: true, 
        user: updated
      });
    } catch (error: any) {
      console.error("Preference update error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update preferences" 
      });
    }
  });
  
  app.get('/api/organizations/public', async (req: any, res) => {
    try {
      const orgs = await storage.getAllOrganizations();
      res.json(orgs.map(org => ({
        id: org.id,
        name: org.name,
        subdomain: org.subdomain,
        sportType: org.sportType,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
      })));
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required" 
        });
      }
      
      const user = await storage.getUserByEmailAnyOrg(email);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
      
      // Check if user has no password (admin-created account)
      const userHasNoPassword = !user.password;
      
      if (userHasNoPassword && !password) {
        if (user.status === 'invited' || user.inviteToken) {
          return res.status(401).json({
            success: false,
            message: "Please check your email for an invite link to set your password and activate your account.",
            needsClaim: true
          });
        }
      } else if (userHasNoPassword && password) {
        // User trying to log in with a password but none is set
        return res.status(401).json({ 
          success: false, 
          message: "This account was created by an admin. Please use Magic Link to sign in and set your password.",
          needsPassword: true
        });
      } else {
        // Normal password check
        if (!password) {
          return res.status(400).json({ 
            success: false, 
            message: "Password is required" 
          });
        }
        const hashedPassword = hashPassword(password);
        if (user.password !== hashedPassword) {
          return res.status(401).json({ 
            success: false, 
            message: "Invalid email or password" 
          });
        }
      }
      
      // Check if email is verified
      if (!user.verified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email before logging in. Check your inbox for the verification link.",
          requiresVerification: true,
        });
      }
      
      // Set session (for web app compatibility)
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      // Generate JWT token (for mobile app)
      const token = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      // Check for unassigned subscriptions and create notification if needed
      const unassignedSubs = await storage.getUnassignedSubscriptionsByOwner(user.id);
      if (unassignedSubs.length > 0) {
        await createLegacySubscriptionNotification(user.id, unassignedSubs.length, user.organizationId);
      }
      
      res.json({ 
        success: true,
        token,
        needsPassword: userHasNoPassword,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          defaultDashboardView: user.defaultDashboardView
        } 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Login failed" 
      });
    }
  });
  
  app.post('/api/auth/switch-profile', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ success: false, message: "Role is required" });
      }

      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const accountHolderId = currentUser.accountHolderId || currentUser.id;
      const profiles = await storage.getAccountProfiles(accountHolderId);
      const targetProfile = profiles.find((p: any) => p.role === role && p.organizationId === currentUser.organizationId);

      if (!targetProfile) {
        return res.status(403).json({ success: false, message: "No profile found with that role" });
      }

      req.session.userId = targetProfile.id;
      req.session.organizationId = targetProfile.organizationId;
      req.session.role = targetProfile.role;

      const token = jwt.sign(
        {
          userId: targetProfile.id,
          organizationId: targetProfile.organizationId,
          role: targetProfile.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: targetProfile.id,
          email: targetProfile.email,
          role: targetProfile.role,
          firstName: targetProfile.firstName,
          lastName: targetProfile.lastName,
          organizationId: targetProfile.organizationId,
        },
      });
    } catch (error: any) {
      console.error("Switch profile error:", error);
      res.status(500).json({ success: false, message: "Failed to switch profile" });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
  
  // Send verification email (called at step 1 of registration)
  app.post('/api/auth/send-verification', async (req: any, res) => {
    try {
      const { email, organizationId = "default-org", sourcePlatform = "web" } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      // Check if user already exists (completed registration)
      const existingUser = await storage.getUserByEmail(email, organizationId);
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "This email is already registered. Please login instead." 
        });
      }
      
      // Get session ID for notifying original session when verified
      const sessionId = req.sessionID || crypto.randomBytes(16).toString('hex');
      
      // Check if there's a pending registration
      let pending = await storage.getPendingRegistration(email, organizationId);
      
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      if (pending) {
        // Update existing pending registration
        await storage.deletePendingRegistration(email, organizationId);
        pending = await storage.createPendingRegistration(email, organizationId, verificationToken, verificationExpiry, sourcePlatform, sessionId);
        
        await emailService.sendVerificationEmail({
          email,
          firstName: 'User',
          verificationToken,
          organizationId,
        });
        
        return res.json({ 
          success: true, 
          message: "Verification email re-sent. Please check your inbox.",
          exists: true,
          sessionId // Return session ID so frontend can poll for verification status
        });
      }
      
      // Create new pending registration
      pending = await storage.createPendingRegistration(email, organizationId, verificationToken, verificationExpiry, sourcePlatform, sessionId);
      
      await emailService.sendVerificationEmail({
        email,
        firstName: 'User',
        verificationToken,
        organizationId,
      });
      
      res.json({ 
        success: true, 
        message: "Verification email sent! Please check your inbox.",
        exists: false,
        sessionId // Return session ID so frontend can poll for verification status
      });
    } catch (error: any) {
      console.error("Send verification error:", error);
      res.status(500).json({ success: false, message: "Failed to send verification email" });
    }
  });
  
  // Email verification endpoint
  app.get('/api/auth/verify-email', async (req: any, res) => {
    try {
      const { token, email } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Verification token is required" });
      }
      
      const organizationId = (req.query.organizationId as string) || "";
      
      // Find pending registration - try org-specific first, then cross-org fallback
      let pendingReg: any = null;
      
      if (email && organizationId) {
        pendingReg = await storage.getPendingRegistration(email as string, organizationId);
        if (pendingReg && pendingReg.verificationToken !== token) {
          pendingReg = null;
        }
      }
      
      if (!pendingReg && organizationId) {
        pendingReg = await storage.getPendingRegistrationByToken(token as string, organizationId);
      }
      
      if (!pendingReg) {
        pendingReg = await storage.getPendingRegistrationByTokenAnyOrg(token as string);
      }
      
      if (!pendingReg) {
        return res.status(404).json({ success: false, message: "Invalid or expired verification token" });
      }
      
      const pendingOrgId = pendingReg.organizationId;
      
      if (new Date() > new Date(pendingReg.verificationExpiry)) {
        await storage.deletePendingRegistration(pendingReg.email, pendingOrgId);
        return res.status(400).json({ success: false, message: "Verification token has expired. Please request a new one." });
      }
      
      await storage.updatePendingRegistration(pendingReg.email, pendingOrgId, true);
      
      // Determine if user should check original session
      const sourcePlatform = pendingReg.sourcePlatform || 'web';
      const hasOriginalSession = !!pendingReg.sessionId;
      
      res.json({ 
        success: true, 
        message: hasOriginalSession 
          ? "Email verified! Return to your original session to continue registration."
          : "Email verified successfully! Continue with registration.",
        email: pendingReg.email,
        sourcePlatform,
        hasOriginalSession,
        // Indicate that user should NOT continue in this tab if they have an original session
        shouldRedirect: !hasOriginalSession
      });
    } catch (error: any) {
      console.error("Email verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed" });
    }
  });
  
  // Poll for verification status (used by original session to detect when email is verified)
  app.get('/api/auth/check-verification-status', async (req: any, res) => {
    try {
      const { email, organizationId } = req.query;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      let pendingReg = null;
      
      if (organizationId) {
        pendingReg = await storage.getPendingRegistration(email as string, organizationId as string);
      }
      
      if (!pendingReg) {
        const allOrgs = await storage.getAllOrganizations();
        for (const org of allOrgs) {
          const found = await storage.getPendingRegistration(email as string, org.id);
          if (found) {
            pendingReg = found;
            break;
          }
        }
      }
      
      if (!pendingReg) {
        return res.json({ 
          success: true, 
          verified: false,
          notFound: true,
          message: "No pending registration found for this email"
        });
      }
      
      res.json({ 
        success: true, 
        verified: pendingReg.verified,
        email: pendingReg.email,
        message: pendingReg.verified 
          ? "Email verified! You can continue with registration."
          : "Email not yet verified. Please check your inbox."
      });
    } catch (error: any) {
      console.error("Check verification status error:", error);
      res.status(500).json({ success: false, message: "Failed to check verification status" });
    }
  });
  
  // Test-only endpoint for automated testing
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    app.post('/api/test/verify-email', async (req: any, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        const organizationId = req.body.organizationId || "default-org";
        
        // Check for pending registration first (new flow)
        const pendingReg = await storage.getPendingRegistration(email, organizationId);
        
        if (pendingReg) {
          // Mark pending registration as verified
          await storage.updatePendingRegistration(email, organizationId, true);
          
          console.log(`[TEST] Pending registration for ${email} marked as verified for testing`);
          
          return res.json({ 
            success: true, 
            message: "Email verified for testing (pending registration)",
            email: email,
          });
        }
        
        // Fallback to checking existing user (for backwards compatibility)
        const user = await storage.getUserByEmail(email, organizationId);
        
        if (user) {
          // Mark user as verified
          await storage.updateUser(user.id, {
            verified: true,
            verificationToken: null as any,
            verificationExpiry: null as any,
          });
          
          console.log(`[TEST] User ${email} marked as verified for testing`);
          
          return res.json({ 
            success: true, 
            message: "Email verified for testing (existing user)",
            email: user.email,
          });
        }
        
        // Not found in either table
        return res.status(404).json({ 
          success: false, 
          message: "No pending registration or user found with this email" 
        });
      } catch (error: any) {
        console.error("Test verification error:", error);
        res.status(500).json({ success: false, message: "Test verification failed" });
      }
    });
  }
  
  // Request magic link
  app.post('/api/auth/request-magic-link', async (req: any, res) => {
    try {
      const { email, sourcePlatform = "web" } = req.body;
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      const user = await storage.getUserByEmailAnyOrg(email);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "No account found with that email. Please create an account first.", noAccount: true });
      }
      
      // Check if verified
      if (!user.verified) {
        return res.status(403).json({ success: false, message: "Please verify your email first before using magic link login." });
      }
      
      // Generate cryptographically secure magic link token (valid for 15 minutes)
      const magicLinkToken = crypto.randomBytes(32).toString('hex');
      const magicLinkExpiry = new Date(Date.now() + 15 * 60 * 1000);
      
      // Update user with magic link token and source platform
      await storage.updateUser(user.id, {
        magicLinkToken,
        magicLinkExpiry,
        magicLinkSourcePlatform: sourcePlatform, // Track where magic link was requested from
      });
      
      // Send magic link email
      await emailService.sendMagicLink({
        email: user.email,
        firstName: user.firstName,
        magicLinkToken,
      });
      
      res.json({ success: true, message: "If an account exists with that email, a magic link has been sent." });
    } catch (error: any) {
      console.error("Magic link request error:", error);
      res.status(500).json({ success: false, message: "Failed to send magic link" });
    }
  });
  
  // In-memory store for app redirect tokens (valid for 60 seconds)
  const appRedirectTokens = new Map<string, { userId: string; expires: Date }>();
  
  // Clean up expired tokens periodically
  setInterval(() => {
    const now = new Date();
    for (const [token, data] of appRedirectTokens.entries()) {
      if (data.expires < now) {
        appRedirectTokens.delete(token);
      }
    }
  }, 30000); // Clean every 30 seconds
  
  // Magic link login endpoint
  app.get('/api/auth/magic-link-login', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Magic link token is required" });
      }
      
      // Search across ALL organizations for the magic link token
      const tokenResults = await db.select().from(users).where(
        and(
          eq(users.magicLinkToken, token as string),
          eq(users.isActive, true)
        )
      );
      
      if (!tokenResults || tokenResults.length === 0) {
        return res.status(404).json({ success: false, message: "Invalid or expired magic link. Please request a new one." });
      }
      
      const dbUser = tokenResults[0];
      const user = await storage.getUser(dbUser.id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid magic link" });
      }
      
      // Check if token is expired (15 minutes)
      if (user.magicLinkExpiry && new Date() > user.magicLinkExpiry) {
        return res.status(400).json({ success: false, message: "Magic link has expired. Please request a new one." });
      }
      
      // Get source platform before clearing (so we know if it came from iOS app)
      const sourcePlatform = (user as any).magicLinkSourcePlatform || 'web';
      
      // Clear magic link token
      await storage.updateUser(user.id, {
        magicLinkToken: null as any,
        magicLinkExpiry: null as any,
        magicLinkSourcePlatform: null as any,
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      // Generate a one-time app redirect token (valid for 60 seconds)
      const appRedirectToken = crypto.randomBytes(32).toString('hex');
      appRedirectTokens.set(appRedirectToken, {
        userId: user.id,
        expires: new Date(Date.now() + 60000) // 60 seconds
      });
      
      // Generate JWT token for persistent auth on iOS
      const jwtToken = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );
      
      res.json({ 
        success: true, 
        message: "Logged in successfully!",
        needsPassword: !user.password,
        token: jwtToken,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          defaultDashboardView: user.defaultDashboardView
        },
        appRedirectToken, // Token for iOS app to use
        sourcePlatform, // Where the magic link was originally requested from
        shouldRedirectToApp: sourcePlatform === 'ios' // Indicate if user should be redirected to iOS app
      });
    } catch (error: any) {
      console.error("Magic link login error:", error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });
  
  // Exchange app redirect token for session (used by iOS app after browser auth)
  app.get('/api/auth/app-redirect', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }
      
      const tokenData = appRedirectTokens.get(token as string);
      
      if (!tokenData) {
        return res.status(404).json({ success: false, message: "Invalid or expired token" });
      }
      
      if (tokenData.expires < new Date()) {
        appRedirectTokens.delete(token as string);
        return res.status(400).json({ success: false, message: "Token has expired" });
      }
      
      // Delete the token (one-time use)
      appRedirectTokens.delete(token as string);
      
      // Get user and set session
      const user = await storage.getUser(tokenData.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.organizationId = user.organizationId;
      req.session.role = user.role;
      
      // Generate JWT token for persistent auth on iOS
      const jwtToken = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );
      
      res.json({ 
        success: true, 
        message: "Session created successfully!",
        token: jwtToken,
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          defaultDashboardView: user.defaultDashboardView
        }
      });
    } catch (error: any) {
      console.error("App redirect error:", error);
      res.status(500).json({ success: false, message: "Failed to create session" });
    }
  });
  
  // =============================================
  // PASSWORD RESET ROUTES
  // =============================================
  
  app.post('/api/auth/request-password-reset', async (req: any, res) => {
    try {
      const { email } = req.body;
      console.log(`[Password Reset] Request received for email: ${email}`);
      
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      
      const user = await storage.getUserByEmailAnyOrg(email);
      
      if (!user) {
        console.log(`[Password Reset] No user found for email: ${email}`);
        return res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
      }
      
      console.log(`[Password Reset] User found: ${user.id}, verified: ${user.verified}`);
      
      if (!user.verified) {
        return res.status(403).json({ success: false, message: "Please verify your email first before resetting your password." });
      }
      
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      });
      
      console.log(`[Password Reset] Token saved to database, sending email...`);
      
      try {
        await emailService.sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          resetToken,
        });
        console.log(`[Password Reset] Email sent successfully to ${user.email}`);
      } catch (emailError: any) {
        console.error(`[Password Reset] Email sending failed:`, emailError);
        throw emailError;
      }
      
      res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
    } catch (error: any) {
      console.error("Password reset request error:", error);
      res.status(500).json({ success: false, message: "Failed to process password reset request" });
    }
  });
  
  app.post('/api/auth/set-password', requireAuth, async (req: any, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const hashedPassword = hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ success: true, message: "Password created successfully!" });
    } catch (error: any) {
      console.error("Set password error:", error);
      res.status(500).json({ success: false, message: "Failed to set password" });
    }
  });
  
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: "Token and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
      }
      
      const allUsers = await storage.getUsersByOrganization(req.body.organizationId || req.query.organizationId || "default-org");
      const user = allUsers.find(u => u.passwordResetToken === token && u.isActive !== false);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "Invalid or expired reset link" });
      }
      
      if (user.passwordResetExpiry && new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ success: false, message: "Reset link has expired. Please request a new one." });
      }
      
      const hashedPassword = hashPassword(newPassword);
      
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null as any,
        passwordResetExpiry: null as any,
      });
      
      res.json({ success: true, message: "Password reset successfully! You can now log in with your new password." });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ success: false, message: "Failed to reset password" });
    }
  });
  
  app.get('/api/auth/verify-reset-token', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }
      
      const allUsers = await storage.getUsersByOrganization(req.body.organizationId || (req.query.organizationId as string) || "default-org");
      const user = allUsers.find(u => u.passwordResetToken === token && u.isActive !== false);
      
      if (!user) {
        return res.status(404).json({ success: false, valid: false, message: "Invalid or expired reset link" });
      }
      
      if (user.passwordResetExpiry && new Date() > new Date(user.passwordResetExpiry)) {
        return res.status(400).json({ success: false, valid: false, message: "Reset link has expired. Please request a new one." });
      }
      
      res.json({ success: true, valid: true, email: user.email });
    } catch (error: any) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ success: false, valid: false, message: "Failed to verify token" });
    }
  });
  
  // =============================================
  // STRIPE PAYMENT ROUTES
  // =============================================

  if (stripe) {
    const keyPrefix = stripeSecretKey!.substring(0, 8);
    const mode = keyPrefix.startsWith('sk_test') ? '🧪 TEST' : '🔴 LIVE';
    console.log(`Stripe initialized in ${mode} mode (key: ${keyPrefix}...)`);
  }
  
  app.post("/api/payments/checkout-session", requireAuth, async (req: any, res) => {
    const orgStripe = await getStripeForOrg(req.user.organizationId);
    if (!orgStripe) {
      return res.status(500).json({ error: "Stripe is not configured for this organization" });
    }
    
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { productId, productCategory } = req.body;
      
      // Build line items - either for a direct product purchase or from package selections
      const lineItems: any[] = [];
      let metadata: any = { userId: user.id };
      let mode: 'payment' | 'subscription' = 'payment';
      
      if (productId) {
        // Direct product purchase flow
        const product = await storage.getProgram(productId);
        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }
        if (!product.price || product.price <= 0) {
          return res.status(400).json({ error: "Product has no valid price" });
        }
        
        // Check if this is a subscription product
        if (product.type === 'Subscription' && (product.billingCycle || product.billingIntervalDays)) {
          // Create a subscription checkout
          mode = 'subscription';
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
              unit_amount: product.price,
              recurring: (() => {
                const r = resolveStripeInterval(product.billingIntervalDays, product.billingCycle);
                return { interval: r.interval, interval_count: r.interval_count };
              })(),
            },
            quantity: 1,
          });
        } else {
          // One-time payment
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
              unit_amount: product.price,
            },
            quantity: 1,
          });
        }
        
        metadata.productId = productId;
        metadata.productCategory = productCategory || product.productCategory || 'service';
      } else {
        // Legacy package selections flow
        const packageSelections = await storage.getPackageSelectionsByParent(req.user.id);
        const unpaidSelections = packageSelections.filter(selection => !selection.isPaid);
        
        if (unpaidSelections.length === 0) {
          return res.status(404).json({ error: "No unpaid package selections found" });
        }
        
        for (const selection of unpaidSelections) {
          const program = await storage.getProgram(selection.programId);
          if (program && program.price) {
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: program.name,
                },
                unit_amount: program.price,
              },
              quantity: 1,
            });
          }
        }
        
        if (lineItems.length === 0) {
          return res.status(404).json({ error: "No valid programs found for selections" });
        }
        
        metadata.packageSelectionIds = unpaidSelections.map(s => s.id).join(',');
      }
      
      // Add service fee
      const legacySubtotal = lineItems.reduce((sum: number, item: any) => sum + (item.price_data?.unit_amount || 0), 0);
      const recurringForFee = mode === 'subscription' ? lineItems[0]?.price_data?.recurring : undefined;
      const { lineItem: legacyFeeLineItem, feeCents: legacyServiceFeeCents } = await getServiceFeeLineItem(legacySubtotal, recurringForFee);
      lineItems.push(legacyFeeLineItem);

      const stripeCustomerId = await getOrCreateStripeCustomer(orgStripe, user);
      
      const origin = `${req.protocol}://${req.get('host')}`;
      const orgDisplayName = await getOrgDisplayName(req.user.organizationId);
      
      const sessionParams1: any = {
        customer: stripeCustomerId,
        line_items: lineItems,
        mode,
        success_url: `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/payments?canceled=true`,
        metadata,
        ...(mode === 'payment' ? { payment_intent_data: { statement_descriptor: orgDisplayName.substring(0, 22) } } : {}),
      };

      const connectResult1 = await applyConnectChargeParams(sessionParams1, req.user.organizationId, mode, legacyServiceFeeCents, mode === 'subscription' ? legacySubtotal : undefined);
      verifyConnectRouting(sessionParams1, mode, req.user.organizationId, connectResult1, { applicationFeeAmount: legacyServiceFeeCents, checkoutType: 'legacy_package' });

      console.log(`[Connect] legacy_package: creating session for org ${req.user.organizationId}`, {
        payment_intent_data: sessionParams1.payment_intent_data ?? null,
        subscription_data: sessionParams1.subscription_data ?? null,
      });

      const session = await orgStripe.checkout.sessions.create(sessionParams1);
      
      res.json({
        sessionUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: "Error creating checkout session",
        message: error.message,
      });
    }
  });
  
  // Create checkout session for a specific package and player
  app.post("/api/payments/create-checkout", requireAuth, async (req: any, res) => {
    const orgStripe2 = await getStripeForOrg(req.user.organizationId);
    if (!orgStripe2) {
      return res.status(500).json({ error: "Stripe is not configured for this organization" });
    }
    
    try {
      const { packageId, playerId, addOnIds, signedWaiverIds, selectedPricingOptionId, platform, couponCode } = req.body;
      const isNativeIOS = platform === 'ios';
      
      if (!packageId) {
        return res.status(400).json({ error: "Package ID is required" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get the program/package
      const program = await storage.getProgram(packageId);
      if (!program || !program.price) {
        return res.status(404).json({ error: "Package not found or has no price" });
      }
      
      // Find selected pricing option if provided
      let selectedPricingOption: any = null;
      let quoteCheckout: any = null;
      
      if (selectedPricingOptionId) {
        // Check if this is a quote selection
        if (selectedPricingOptionId.startsWith('quote_')) {
          const quoteId = selectedPricingOptionId.replace('quote_', '');
          quoteCheckout = await storage.getQuoteCheckout(quoteId);
          
          if (!quoteCheckout) {
            return res.status(400).json({ error: "Quote not found" });
          }
          
          if (quoteCheckout.status !== 'pending') {
            return res.status(400).json({ error: "Quote has already been used or expired" });
          }
          
          // Security: Validate organization - quote must be from the same org
          if (quoteCheckout.organizationId && quoteCheckout.organizationId !== req.user.organizationId) {
            return res.status(403).json({ error: "You are not authorized to use this quote" });
          }
          
          // Security: Validate quote ownership - quote must belong to the authenticated user
          // Check by userId, or by leadId matching user's email
          let isAuthorizedQuote = quoteCheckout.userId === req.user.id;
          
          if (!isAuthorizedQuote && quoteCheckout.leadId) {
            // Check if lead email matches user email
            const lead = await storage.getCrmLeadById(quoteCheckout.leadId);
            const currentUser = await storage.getUser(req.user.id);
            if (lead && currentUser && lead.email?.toLowerCase() === currentUser.email?.toLowerCase()) {
              isAuthorizedQuote = true;
            }
          }
          
          // Also check if the quote was created for any user with the same email
          if (!isAuthorizedQuote) {
            const currentUser = await storage.getUser(req.user.id);
            const allUsers = await storage.getUsersByOrganization(req.user.organizationId);
            const matchingUserIds = new Set<string>();
            if (currentUser?.email) {
              allUsers.forEach((u: any) => {
                if (u.email === currentUser.email) {
                  matchingUserIds.add(u.id);
                }
              });
            }
            if (quoteCheckout.userId && matchingUserIds.has(quoteCheckout.userId)) {
              isAuthorizedQuote = true;
            }
          }
          
          if (!isAuthorizedQuote) {
            return res.status(403).json({ error: "You are not authorized to use this quote" });
          }
          
          // Find the quote item for this program
          const quoteItem = quoteCheckout.items?.find((item: any) => item.productId === packageId);
          if (!quoteItem) {
            return res.status(400).json({ error: "Quote does not include this program" });
          }
          
          // Create a synthetic pricing option from the quote
          selectedPricingOption = {
            id: selectedPricingOptionId,
            name: 'Personalized Quote',
            price: quoteItem.quotedPrice || quoteItem.price,
            isQuote: true,
            quoteId: quoteId
          };
        } else if (selectedPricingOptionId.startsWith('installment_')) {
          // Handle installment plans (existing logic)
          const installmentId = selectedPricingOptionId.replace('installment_', '');
          const installmentPlans = await storage.getInstallmentPlansByProgram(packageId);
          const installmentPlan = installmentPlans.find((p: any) => p.id === installmentId);
          if (installmentPlan) {
            selectedPricingOption = {
              id: selectedPricingOptionId,
              name: installmentPlan.name || `${installmentPlan.numberOfPayments} Payment Plan`,
              price: installmentPlan.paymentAmount,
              isInstallment: true,
              installmentPlanId: installmentId,
              numberOfPayments: installmentPlan.numberOfPayments
            };
          }
        } else if (selectedPricingOptionId.endsWith('_installments')) {
          const baseOptionId = selectedPricingOptionId.replace('_installments', '');
          const pricingOptions = (program as any).pricingOptions;
          if (pricingOptions && Array.isArray(pricingOptions)) {
            const baseOption = pricingOptions.find((opt: any) => opt.id === baseOptionId);
            if (baseOption && baseOption.allowInstallments && baseOption.installmentCount && baseOption.installmentPrice) {
              const count = Math.max(2, Math.min(24, baseOption.installmentCount));
              const perPayment = Math.max(100, baseOption.installmentPrice); // min $1.00
              const intervalDays = Math.max(1, baseOption.installmentIntervalDays || 30);
              selectedPricingOption = {
                ...baseOption,
                id: selectedPricingOptionId,
                isInstallmentPlan: true,
                price: perPayment,
                originalPrice: baseOption.price,
                installmentCount: count,
                installmentIntervalDays: intervalDays,
                name: `${baseOption.name} (${count} Payment Plan)`,
              };
            }
          }
        } else {
          // Standard pricing option from program
          const pricingOptions = (program as any).pricingOptions;
          if (pricingOptions && Array.isArray(pricingOptions)) {
            selectedPricingOption = pricingOptions.find((opt: any) => opt.id === selectedPricingOptionId);
          }
        }
        
        // Validate: if pricing option ID is provided but not found, return error
        if (!selectedPricingOption) {
          return res.status(400).json({ error: "Invalid pricing option ID - option not found for this program" });
        }
      }
      
      // Validate playerId if provided
      if (playerId) {
        const player = await storage.getUser(playerId);
        if (!player) {
          return res.status(400).json({ error: "Invalid player ID" });
        }
        
        // Ensure player belongs to the paying user or is the paying user
        // Check both parentId and guardianId to handle all parent-child relationships
        const isValidPlayer = playerId === req.user.id || 
                             (player as any).parentId === req.user.id || 
                             (player as any).guardianId === req.user.id;
        
        if (!isValidPlayer) {
          return res.status(403).json({ error: "You can only make payments for yourself or your children" });
        }
      }
      
      const stripeCustomerId = await getOrCreateStripeCustomer(orgStripe2, user);
      
      // Get origin for URLs
      const origin = `${req.protocol}://${req.get('host')}`;
      
      // Determine if this is a subscription or one-time payment
      // Bundle pricing options are always one-time payments (may convert to subscription later)
      const isSubscription = !selectedPricingOption && program.type === 'Subscription' && (program.billingCycle || program.billingIntervalDays);
      const isBundleWithMonthlyConversion = selectedPricingOption?.convertsToMonthly;
      const isInstallmentPlan = selectedPricingOption?.isInstallmentPlan;
      
      // Build line items - start with main program
      const lineItems: any[] = [];
      
      // Determine the price to use (pricing option price or program base price)
      let priceToCharge = selectedPricingOption ? selectedPricingOption.price : program.price;
      // Apply pay-in-full discount when selecting the standard (non-installment) option
      // that has installments enabled with a discount
      if (selectedPricingOption && !isInstallmentPlan && selectedPricingOption.allowInstallments && selectedPricingOption.payInFullDiscount && selectedPricingOption.payInFullDiscount > 0) {
        priceToCharge = Math.round(priceToCharge * (1 - selectedPricingOption.payInFullDiscount / 100));
      }

      // Apply coupon discount if provided
      let appliedCouponId: number | null = null;
      if (couponCode) {
        const coupon = await storage.getCouponByCode(couponCode.toUpperCase(), req.user.organizationId);
        if (!coupon || !coupon.isActive) {
          return res.status(400).json({ error: "Invalid or inactive coupon code" });
        }
        if (new Date(coupon.expiresAt) < new Date()) {
          return res.status(400).json({ error: "Coupon has expired" });
        }
        if (coupon.maxUses && coupon.currentUses !== null && coupon.currentUses >= coupon.maxUses) {
          return res.status(400).json({ error: "Coupon has reached maximum uses" });
        }
        if (coupon.programId && coupon.programId !== packageId) {
          return res.status(400).json({ error: "Coupon is not valid for this program" });
        }
        if (coupon.discountType === 'percentage') {
          priceToCharge = Math.round(priceToCharge * (1 - coupon.discountValue / 100));
        } else {
          priceToCharge = Math.max(0, priceToCharge - coupon.discountValue);
        }
        if (priceToCharge < 50) priceToCharge = 50; // Stripe minimum is $0.50
        appliedCouponId = coupon.id;
      }
      const itemName = selectedPricingOption 
        ? `${program.name} - ${selectedPricingOption.name}`
        : program.name;
      const intervalLabel = isInstallmentPlan ? (() => {
        const d = selectedPricingOption.installmentIntervalDays;
        return d === 7 ? 'weekly' : d === 14 ? 'bi-weekly' : d === 30 ? 'monthly' : d === 90 ? 'quarterly' : `every ${d} days`;
      })() : '';
      const itemDescription = isInstallmentPlan
        ? `${selectedPricingOption.installmentCount} ${intervalLabel} payments of $${(selectedPricingOption.price / 100).toFixed(2)}`
        : selectedPricingOption?.durationDays 
          ? `${selectedPricingOption.durationDays} days${selectedPricingOption.convertsToMonthly ? ', then converts to monthly subscription' : ''}`
          : (program.description || undefined);
      
      // Main program line item
      const mainLineItem: any = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: itemName,
            description: itemDescription,
          },
          unit_amount: priceToCharge, // Price is already in cents
        },
        quantity: 1,
      };
      
      if (isSubscription) {
        const resolved = resolveStripeInterval(program.billingIntervalDays, program.billingCycle);
        
        mainLineItem.price_data.recurring = {
          interval: resolved.interval,
          interval_count: resolved.interval_count,
        };
      }
      
      // Installment plans use recurring billing with a fixed number of payments
      if (isInstallmentPlan) {
        const instInterval = resolveStripeInterval(selectedPricingOption.installmentIntervalDays);
        mainLineItem.price_data.recurring = {
          interval: instInterval.interval,
          interval_count: instInterval.interval_count,
        };
      }
      
      lineItems.push(mainLineItem);
      
      // Calculate subtotal for platform fee
      let subtotal = priceToCharge;
      
      // Add add-on line items (one-time purchases only, not subscriptions)
      const addOnProductIds: string[] = [];
      if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0 && !isSubscription) {
        for (const addOnId of addOnIds) {
          const addOn = await storage.getProgram(addOnId);
          if (addOn && addOn.price) {
            addOnProductIds.push(addOnId);
            subtotal += addOn.price;
            lineItems.push({
              price_data: {
                currency: 'usd',
                product_data: {
                  name: addOn.name,
                  description: addOn.description || undefined,
                },
                unit_amount: addOn.price,
              },
              quantity: 1,
            });
          }
        }
      }
      
      // Add service fee
      let packageServiceFeeCents: number;
      {
        let feeRecurring: any = undefined;
        if (isSubscription) {
          const feeResolved = resolveStripeInterval(program.billingIntervalDays, program.billingCycle);
          feeRecurring = { interval: feeResolved.interval, interval_count: feeResolved.interval_count };
        }
        if (isInstallmentPlan) {
          const feeInstInterval = resolveStripeInterval(selectedPricingOption.installmentIntervalDays);
          feeRecurring = { interval: feeInstInterval.interval, interval_count: feeInstInterval.interval_count };
        }
        const { lineItem: pkgFeeLineItem, feeCents: pkgFeeCents } = await getServiceFeeLineItem(subtotal, feeRecurring);
        packageServiceFeeCents = pkgFeeCents;
        lineItems.push(pkgFeeLineItem);
      }

      // Create Stripe Checkout Session
      // For iOS native app, use web URLs with auth token so the in-app browser
      // can redirect back and trigger payment verification
      let iosAuthToken = '';
      if (isNativeIOS) {
        iosAuthToken = jwt.sign(
          { 
            userId: user.id, 
            organizationId: user.organizationId, 
            role: user.role,
            purpose: 'stripe_success'
          },
          process.env.JWT_SECRET!,
          { expiresIn: '10m' }
        );
      }
      const successUrl = isNativeIOS 
        ? `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = isNativeIOS 
        ? `${origin}/payment-success?canceled=true`
        : `${origin}/unified-account?payment=canceled`;
        
      const checkoutMode = (isSubscription || isInstallmentPlan) ? 'subscription' : 'payment';
      
      const sessionParams: any = {
        customer: stripeCustomerId,
        line_items: lineItems,
        mode: checkoutMode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id,
          packageId: packageId,
          playerId: playerId || '',
          type: 'package_purchase',
          addOnIds: addOnProductIds.length > 0 ? JSON.stringify(addOnProductIds) : '',
          signedWaiverIds: signedWaiverIds && signedWaiverIds.length > 0 ? JSON.stringify(signedWaiverIds) : '',
          pricingOptionId: selectedPricingOptionId || '',
          pricingOptionName: selectedPricingOption?.name || '',
          convertsToMonthly: isBundleWithMonthlyConversion ? 'true' : '',
          monthlyPrice: selectedPricingOption?.monthlyPrice ? String(selectedPricingOption.monthlyPrice) : '',
          durationDays: selectedPricingOption?.durationDays ? String(selectedPricingOption.durationDays) : '',
          quoteId: selectedPricingOption?.quoteId || '',
          couponId: appliedCouponId ? String(appliedCouponId) : '',
          couponCode: couponCode || '',
          isInstallmentPlan: isInstallmentPlan ? 'true' : '',
          installmentCount: isInstallmentPlan ? String(selectedPricingOption.installmentCount) : '',
          installmentOriginalPrice: isInstallmentPlan ? String(selectedPricingOption.originalPrice) : '',
        },
      };
      
      // For installment plans, set the subscription to cancel after the specified number of payments
      if (isInstallmentPlan) {
        const intervalDays = selectedPricingOption.installmentIntervalDays;
        const count = selectedPricingOption.installmentCount;
        // Calculate cancel_at using proper date math for month-aligned intervals
        const now = new Date();
        let cancelDate: Date;
        if (intervalDays === 30 || intervalDays === 60 || intervalDays === 90 || intervalDays === 180) {
          // Month-based: add months instead of raw days to avoid drift
          const months = Math.round(intervalDays / 30) * count;
          cancelDate = new Date(now);
          cancelDate.setMonth(cancelDate.getMonth() + months);
          cancelDate.setDate(cancelDate.getDate() + 2); // 2-day buffer for billing anchor
        } else if (intervalDays === 365) {
          cancelDate = new Date(now);
          cancelDate.setFullYear(cancelDate.getFullYear() + count);
          cancelDate.setDate(cancelDate.getDate() + 2);
        } else {
          // Day-based: straightforward
          cancelDate = new Date(now.getTime() + (count * intervalDays * 86400000) + (2 * 86400000));
        }
        const cancelAt = Math.floor(cancelDate.getTime() / 1000);
        
        sessionParams.subscription_data = {
          ...(sessionParams.subscription_data || {}),
          metadata: {
            isInstallmentPlan: 'true',
            installmentCount: String(count),
            installmentIntervalDays: String(intervalDays),
            originalPrice: String(selectedPricingOption.originalPrice),
            programId: packageId,
            playerId: playerId || '',
          },
        };
        sessionParams.subscription_data.cancel_at = cancelAt;
      } else if (isSubscription && selectedPricingOption?.durationDays && selectedPricingOption.durationDays > 0) {
        const intervalDays = selectedPricingOption.billingIntervalDays || 30;
        const durationDays = selectedPricingOption.durationDays;
        const now = new Date();
        let cancelDate: Date;
        if (intervalDays === 30 || intervalDays === 60 || intervalDays === 90 || intervalDays === 180) {
          const months = Math.round(durationDays / 30);
          cancelDate = new Date(now);
          cancelDate.setMonth(cancelDate.getMonth() + months);
          cancelDate.setDate(cancelDate.getDate() + 2);
        } else if (intervalDays === 365) {
          const years = Math.round(durationDays / 365);
          cancelDate = new Date(now);
          cancelDate.setFullYear(cancelDate.getFullYear() + years);
          cancelDate.setDate(cancelDate.getDate() + 2);
        } else {
          cancelDate = new Date(now.getTime() + (durationDays * 86400000) + (2 * 86400000));
        }
        const cancelAt = Math.floor(cancelDate.getTime() / 1000);
        sessionParams.subscription_data = {
          ...(sessionParams.subscription_data || {}),
        };
        sessionParams.subscription_data.cancel_at = cancelAt;
      }

      if (checkoutMode === 'payment') {
        const orgName2 = await getOrgDisplayName(req.user.organizationId);
        sessionParams.payment_intent_data = {
          receipt_email: user.email,
          statement_descriptor: orgName2.substring(0, 22),
        };
      }

      const connectResult2 = await applyConnectChargeParams(sessionParams, req.user.organizationId, checkoutMode, packageServiceFeeCents, checkoutMode === 'subscription' ? subtotal : undefined);
      verifyConnectRouting(sessionParams, checkoutMode, req.user.organizationId, connectResult2, { applicationFeeAmount: packageServiceFeeCents, checkoutType: 'package_purchase' });

      console.log(`[Connect] package_purchase: creating session for org ${req.user.organizationId}`, {
        payment_intent_data: sessionParams.payment_intent_data ?? null,
        subscription_data: sessionParams.subscription_data ?? null,
      });

      const session = await orgStripe2.checkout.sessions.create(sessionParams);

      try {
        const playerUser = playerId ? await storage.getUser(playerId) : null;
        const playerFullName = playerUser ? `${playerUser.firstName || ''} ${playerUser.lastName || ''}`.trim() : undefined;
        await storage.createAbandonedCart({
          userId: user.id,
          organizationId: req.user.organizationId,
          stripeSessionId: session.id,
          productId: packageId,
          productName: program.name || program.title || 'Program',
          playerName: playerFullName || undefined,
          amount: lineItems.reduce((sum: number, item: any) => sum + (item.price_data?.unit_amount || 0) * (item.quantity || 1), 0),
          status: 'pending',
        });
      } catch (cartError: any) {
        console.error('⚠️ Abandoned cart tracking failed (non-fatal):', cartError.message);
      }
      
      res.json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: "Error creating checkout session",
        message: error.message,
      });
    }
  });
  
  async function resolveOrgId(session: any, userId?: string, programId?: string): Promise<string> {
    if (session?.metadata?.organizationId) return session.metadata.organizationId;
    if (userId) {
      const u = await storage.getUser(userId);
      if (u?.organizationId) return u.organizationId;
    }
    if (programId) {
      const p = await storage.getProgram(programId);
      if (p?.organizationId) return p.organizationId;
    }
    return "default-org";
  }
  
  // Stripe webhook endpoint (PUBLIC - no authentication)
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error("⚠️ STRIPE_WEBHOOK_SECRET is not configured");
      return res.status(400).json({ 
        error: "Webhook secret not configured",
        message: "Set STRIPE_WEBHOOK_SECRET environment variable for webhook verification" 
      });
    }
    
    let event: Stripe.Event;
    
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error("⚠️ Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    // Handle the event
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log("✅ Checkout session completed:", session.id);

        try {
          await storage.completeAbandonedCart(session.id);
        } catch (cartError: any) {
          console.error('⚠️ Abandoned cart completion failed (non-fatal):', cartError.message);
        }
        
        if (session.metadata?.type === 'platform_subscription') {
          const orgId = session.metadata.organizationId;
          const plan = session.metadata.plan;
          const subId = (session as any).subscription;
          console.log(`[Platform Subscription] Completed for org ${orgId}, plan: ${plan}, subscription: ${subId}`);

          if (orgId) {
            try {
              await storage.updateOrganization(orgId, {
                platformPlan: plan,
                platformSubscriptionStatus: 'active',
                platformSubscriptionId: subId || null,
              } as any);
              console.log(`[Platform Subscription] Updated org ${orgId} with plan ${plan}`);
            } catch (orgUpdateErr: any) {
              console.error(`[Platform Subscription] Failed to update org ${orgId}:`, orgUpdateErr.message);
            }
          }

          return res.json({ received: true, type: 'platform_subscription' });
        }

        // Check if this is an "add_player" payment
        if (session.metadata?.type === 'add_player') {
          const playerId = session.metadata.playerId;
          const accountHolderId = session.metadata.accountHolderId;
          const packageId = session.metadata.packageId;
          
          if (!playerId || !accountHolderId) {
            console.error("Missing required metadata for add_player:", { playerId, accountHolderId });
            return res.status(400).json({ 
              error: "Missing required metadata for add_player",
              received: { playerId, accountHolderId }
            });
          }
          
          // Update player to finalize registration
          const updatedPlayer = await storage.updateUser(playerId, {
            paymentStatus: "paid",
            hasRegistered: true,
            stripeCheckoutSessionId: session.id,
          });
          
          if (updatedPlayer) {
            console.log(`✅ Player ${playerId} registration finalized after payment`);
            
            // Send payment confirmation notification
            try {
              const amountCents = session.amount_total || 0;
              const amountDollars = amountCents / 100;
              const playerName = `${updatedPlayer.firstName || ''} ${updatedPlayer.lastName || ''}`.trim();
              
              // Notify parent/account holder
              if (accountHolderId) {
                await pushNotifications.parentPaymentSuccessful(storage, accountHolderId, playerName, amountCents);
              }
              
              // Notify admins about new payment
              const parent = await storage.getUser(accountHolderId);
              const parentName = parent ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : 'Unknown';
              await pushNotifications.notifyAllAdmins(storage, 
                '💰 Payment Received',
                `${parentName} paid $${amountDollars.toFixed(2)} for ${playerName}'s registration`,
                updatedPlayer.organizationId
              );
            } catch (notifError: any) {
              console.error('⚠️ Payment notification failed (non-fatal):', notifError.message);
            }
            
            // Create a payment record
            if (session.amount_total) {
              try {
                await storage.createPayment({
                  organizationId: updatedPlayer.organizationId,
                  userId: playerId,
                  amount: session.amount_total,
                  currency: 'usd',
                  paymentType: 'add_player',
                  status: 'completed',
                  description: `Player Registration: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`,
                  programId: packageId,
                  stripePaymentId: session.payment_intent as string,
                });
                console.log(`✅ Created payment record for player ${playerId}`);
              } catch (paymentError: any) {
                console.error("Error creating payment record:", paymentError);
                // Don't fail the webhook if payment record creation fails
              }
            }
            
            // Create program enrollment for the player
            if (packageId) {
              try {
                const program = await storage.getProgram(packageId);
                if (program) {
                  // Check for existing enrollment
                  const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
                  const hasEnrollment = existingEnrollments.some(e => e.programId === packageId);
                  
                  if (!hasEnrollment) {
                    await storage.createEnrollment({
                      organizationId: updatedPlayer.organizationId,
                      accountHolderId: accountHolderId,
                      profileId: playerId,
                      programId: packageId,
                      status: 'active',
                      source: 'payment',
                      remainingCredits: program.sessionCount ?? undefined,
                      totalCredits: program.sessionCount ?? undefined,
                    });
                    console.log(`✅ Created enrollment for player ${playerId} in program ${packageId}`);
                    
                    // Evaluate store awards for the player after purchase
                    try {
                      await evaluateAwardsForUser(playerId, storage, { category: 'store' });
                      console.log(`✅ Awards evaluated for player ${playerId} after store purchase`);
                    } catch (awardError: any) {
                      console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
                    }

                    // Notify admins: store purchase needs dispatch OR program enrollment needs team assignment
                    try {
                      if (program.productCategory === 'goods') {
                        await pushNotifications.notifyAllAdmins(storage,
                          '📦 New Store Order',
                          `${playerName} purchased ${program.name} — dispatch required`,
                          updatedPlayer.organizationId
                        );
                      } else {
                        await pushNotifications.notifyAllAdmins(storage,
                          '🏀 New Enrollment',
                          `${playerName} enrolled in ${program.name} — needs team/skill level assignment`,
                          updatedPlayer.organizationId
                        );
                      }
                    } catch (notifError: any) {
                      console.error('⚠️ Enrollment/purchase admin notification failed (non-fatal):', notifError.message);
                    }
                  } else {
                    console.log(`ℹ️ Player ${playerId} already has enrollment for program ${packageId}`);
                  }
                } else {
                  console.warn(`⚠️ Program ${packageId} not found, cannot create enrollment`);
                }
              } catch (enrollError: any) {
                console.error("Error creating enrollment:", enrollError);
                // Don't fail the webhook if enrollment creation fails
              }
            }
          } else {
            console.error(`⚠️ Could not find player ${playerId} to update`);
          }
          
          sendPaymentReceiptEmail(session).catch(() => {});
          return res.json({ received: true });
        }
        
        // Handle quote checkout payments
        if (session.metadata?.quoteId) {
          const quoteId = session.metadata.quoteId;
          const userId = session.metadata.userId;
          const playerId = session.metadata.playerId;
          const enrollmentIdsStr = session.metadata.enrollmentIds;
          
          console.log(`✅ Quote checkout payment completed for quote ${quoteId}`);
          
          // Activate all enrollments from the quote
          if (enrollmentIdsStr) {
            try {
              const enrollmentIds = JSON.parse(enrollmentIdsStr) as number[];
              for (const enrollmentId of enrollmentIds) {
                await storage.updateEnrollment(enrollmentId, { status: 'active' });
                console.log(`✅ Activated enrollment ${enrollmentId} for quote ${quoteId}`);
              }
            } catch (enrollError: any) {
              console.error("Error activating enrollments:", enrollError);
            }
          }
          
          // Create payment record
          if (session.amount_total && userId) {
            try {
              await storage.createPayment({
                organizationId: await resolveOrgId(session, userId),
                userId: userId,
                playerId: playerId || undefined,
                amount: session.amount_total,
                currency: 'usd',
                paymentType: 'quote_checkout',
                status: 'completed',
                description: `Quote Checkout Payment`,
                stripePaymentId: session.payment_intent as string,
              });
              console.log(`✅ Created payment record for quote ${quoteId}`);
            } catch (paymentError: any) {
              console.error("Error creating payment record:", paymentError);
            }
          }
          
          // Mark the quote as completed
          try {
            await storage.updateQuoteCheckout(quoteId, { status: 'completed' });
            console.log(`✅ Quote ${quoteId} marked as completed`);
          } catch (quoteError: any) {
            console.error("Error updating quote status:", quoteError);
          }
          
          sendPaymentReceiptEmail(session).catch(() => {});
          return res.json({ received: true });
        }
        
        // Handle new package purchase from unified account payments tab
        if (session.metadata?.type === 'package_purchase') {
          const userId = session.metadata.userId;
          const packageId = session.metadata.packageId;
          const playerId = session.metadata.playerId || null;
          
          if (!userId || !packageId) {
            console.error("Missing metadata for package purchase:", { userId, packageId });
            return res.status(400).json({ 
              error: "Missing required metadata for package purchase",
              received: { userId, packageId }
            });
          }
          
          const program = await storage.getProgram(packageId);
          
          // Create payment record with playerId
          if (session.amount_total) {
            try {
              await storage.createPayment({
                organizationId: await resolveOrgId(session, userId, packageId),
                userId: userId,
                playerId: playerId || undefined,
                amount: session.amount_total,
                currency: 'usd',
                paymentType: program?.type || 'package',
                status: 'completed',
                description: program?.name || `Package Purchase`,
                packageId: packageId,
                programId: packageId,
                stripePaymentId: session.payment_intent as string,
              });
              console.log(`✅ Created payment record for user ${userId}${playerId ? ` (player: ${playerId})` : ''}`);
            } catch (paymentError: any) {
              console.error("Error creating payment record:", paymentError);
            }
          }

          // Increment coupon usage on successful payment
          if (session.metadata?.couponId) {
            try {
              const couponId = parseInt(session.metadata.couponId);
              const coupon = await storage.getCoupon(couponId);
              if (coupon) {
                const newUses = (coupon.currentUses || 0) + 1;
                const updates: any = { currentUses: newUses };
                if (coupon.maxUses && newUses >= coupon.maxUses) {
                  updates.isActive = false;
                }
                await storage.updateCoupon(couponId, updates);
                console.log(`✅ Incremented coupon ${coupon.code} usage to ${newUses}${updates.isActive === false ? ' (auto-deactivated)' : ''}`);
              }
            } catch (couponError: any) {
              console.error("Error incrementing coupon usage:", couponError);
            }
          }
          
          // Update player's paymentStatus to "paid" and create enrollment
          if (playerId && typeof playerId === 'string' && playerId.length > 0) {
            try {
              // Verify player exists before updating
              const player = await storage.getUser(playerId);
              if (player) {
                // Update player's payment status
                await storage.updateUser(playerId, {
                  paymentStatus: "paid",
                });
                console.log(`✅ Updated player ${playerId} paymentStatus to paid`);
                
                // Check for existing enrollment for this player and program
                const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
                const hasEnrollment = existingEnrollments.some(e => e.programId === packageId);
                
                if (program) {
                  // Calculate enrollment end date from product duration
                  let enrollmentEndDate: string | undefined;
                  if (program.durationDays) {
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + program.durationDays);
                    enrollmentEndDate = endDate.toISOString();
                  } else if (program.billingCycle === 'monthly') {
                    const endDate = new Date();
                    endDate.setMonth(endDate.getMonth() + 1);
                    enrollmentEndDate = endDate.toISOString();
                  } else if (program.billingCycle === 'yearly') {
                    const endDate = new Date();
                    endDate.setFullYear(endDate.getFullYear() + 1);
                    enrollmentEndDate = endDate.toISOString();
                  }

                  if (!hasEnrollment) {
                    await storage.createEnrollment({
                      organizationId: player.organizationId || session.metadata?.organizationId || "default-org",
                      accountHolderId: userId,
                      profileId: playerId,
                      programId: packageId,
                      status: 'active',
                      source: 'payment',
                      endDate: enrollmentEndDate,
                      remainingCredits: program.sessionCount ?? undefined,
                      totalCredits: program.sessionCount ?? undefined,
                    });
                    console.log(`✅ Created enrollment for player ${playerId} in program ${packageId}`);
                  } else {
                    // Re-enrollment: expire old and create fresh active enrollment
                    const oldEnrollment = existingEnrollments.find(e => e.programId === packageId);
                    if (oldEnrollment) {
                      await storage.updateEnrollment(oldEnrollment.id, { status: 'expired' });
                    }
                    await storage.createEnrollment({
                      organizationId: player.organizationId || session.metadata?.organizationId || "default-org",
                      accountHolderId: userId,
                      profileId: playerId,
                      programId: packageId,
                      status: 'active',
                      source: 'payment',
                      endDate: enrollmentEndDate,
                      remainingCredits: program.sessionCount ?? undefined,
                      totalCredits: program.sessionCount ?? undefined,
                    });
                    console.log(`✅ Re-enrollment: created fresh enrollment for player ${playerId} in program ${packageId}`);
                  }

                  // Update player subscriptionEndDate if we have an end date
                  if (enrollmentEndDate) {
                    const endDateStr = enrollmentEndDate.split('T')[0];
                    await storage.updateUser(playerId, { subscriptionEndDate: endDateStr });
                    console.log(`✅ Updated player ${playerId} subscriptionEndDate to ${endDateStr}`);
                  }

                  // Restore team membership only if the player's stored teamId belongs to the program being re-enrolled in
                  try {
                    const playerTeamId = player.teamId;
                    if (playerTeamId) {
                      const [linkedTeam] = await db.select({ id: teams.id, programId: teams.programId })
                        .from(teams)
                        .where(eq(teams.id, playerTeamId));
                      const teamBelongsToProgram = linkedTeam && linkedTeam.programId === packageId;
                      if (teamBelongsToProgram) {
                        await db.insert(teamMemberships).values({
                          teamId: playerTeamId,
                          profileId: playerId,
                          role: 'player',
                          status: 'active',
                        }).onConflictDoNothing();
                        console.log(`✅ Restored team membership for player ${playerId} in team ${playerTeamId} (program: ${packageId})`);
                      } else {
                        console.log(`ℹ️ Skipped team membership restore for player ${playerId}: team ${playerTeamId} not in program ${packageId}`);
                      }
                    }
                  } catch (membershipError: any) {
                    console.error('⚠️ Team membership restore failed (non-fatal):', membershipError.message);
                  }

                  // Evaluate store awards for the player after purchase
                  try {
                    await evaluateAwardsForUser(playerId, storage, { category: 'store' });
                    console.log(`✅ Awards evaluated for player ${playerId} after store purchase`);
                  } catch (awardError: any) {
                    console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
                  }

                  // Notify admins: store purchase needs dispatch OR program enrollment needs team assignment
                  try {
                    const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
                    const orgId = player.organizationId || session.metadata?.organizationId;
                    if (program.productCategory === 'goods') {
                      await pushNotifications.notifyAllAdmins(storage,
                        '📦 New Store Order',
                        `${playerName} purchased ${program.name} — dispatch required`,
                        orgId
                      );
                    } else {
                      await pushNotifications.notifyAllAdmins(storage,
                        '🏀 New Enrollment',
                        `${playerName} enrolled in ${program.name} — needs team/skill level assignment`,
                        orgId
                      );
                    }
                  } catch (notifError: any) {
                    console.error('⚠️ Enrollment/purchase admin notification failed (non-fatal):', notifError.message);
                  }
                }
              } else {
                console.warn(`⚠️ Player ${playerId} not found, cannot update status`);
              }
            } catch (playerUpdateError: any) {
              console.error("Error updating player status or enrollment:", playerUpdateError);
            }
          } else {
            console.log(`ℹ️ No valid playerId provided in session metadata, skipping player status update`);
          }
          
          // Mark quote as completed if this was a quote-based payment
          if (session.metadata?.quoteId) {
            try {
              await storage.updateQuoteCheckout(session.metadata.quoteId, { status: 'completed' });
              console.log(`✅ Quote ${session.metadata.quoteId} marked as completed`);
            } catch (quoteError: any) {
              console.error("Error updating quote status:", quoteError);
            }
          }
          
          // For subscription mode checkouts, create a subscription record
          if (session.mode === 'subscription' && session.subscription) {
            try {
              const stripeSubscriptionId = typeof session.subscription === 'string' 
                ? session.subscription 
                : session.subscription.id;
              
              const user = await storage.getUser(userId);
              
              await storage.createSubscription({
                ownerUserId: userId,
                assignedPlayerId: playerId || undefined,
                stripeCustomerId: user?.stripeCustomerId || session.customer as string,
                stripeSubscriptionId: stripeSubscriptionId,
                productName: program?.name || 'Subscription',
                status: 'active',
                isMigrated: false,
              });
              console.log(`✅ Created subscription record for ${stripeSubscriptionId}`);
              
              // Update user's stripeSubscriptionId field with the latest subscription
              if (user?.stripeSubscriptionId !== stripeSubscriptionId) {
                await storage.updateUser(userId, { stripeSubscriptionId: stripeSubscriptionId });
                console.log(`✅ Updated user ${userId} with stripeSubscriptionId: ${stripeSubscriptionId}`);
              } else {
                console.log(`ℹ️ User ${userId} already has this stripeSubscriptionId: ${stripeSubscriptionId}`);
              }
            } catch (subError: any) {
              console.error("Error creating subscription record:", subError);
            }
          }
          
          sendPaymentReceiptEmail(session).catch(() => {});
          return res.json({ received: true });
        }
        
        // Handle package selection payments (existing family onboarding flow)
        const userId = session.metadata?.userId;
        const selectionIds = session.metadata?.packageSelectionIds;
        
        if (!userId || !selectionIds) {
          console.error("Missing metadata in checkout session:", { userId, selectionIds });
          return res.status(400).json({ 
            error: "Missing required metadata",
            received: { userId, selectionIds }
          });
        }
        
        // Mark each package selection as paid
        const selectionIdArray = selectionIds.split(',');
        for (const selectionId of selectionIdArray) {
          const updated = await storage.markPackageSelectionPaid(selectionId.trim());
          if (updated) {
            console.log(`✅ Marked package selection ${selectionId} as paid`);
          } else {
            console.error(`⚠️ Could not find package selection ${selectionId}`);
          }
        }
        
        // Create one consolidated payment record for the entire checkout
        if (session.amount_total) {
          try {
            await storage.createPayment({
              organizationId: await resolveOrgId(session, userId),
              userId,
              amount: session.amount_total,
              currency: 'usd',
              paymentType: 'stripe_checkout',
              status: 'completed',
              description: `Package Selections Payment`,
              stripePaymentId: session.payment_intent as string,
            });
            console.log(`✅ Created consolidated payment record for user ${userId}`);
          } catch (paymentError: any) {
            console.error("Error creating payment record:", paymentError);
            // Don't fail the webhook if payment record creation fails
          }
        }
        
        sendPaymentReceiptEmail(session).catch(() => {});
        return res.json({ received: true });
      }
      
      // Handle Stripe Connect account updates
      if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account;
        const connectedAccountId = account.id;

        try {
          const [org] = await db.select().from(organizations).where(eq(organizations.stripeConnectedId, connectedAccountId));

          if (org) {
            let newStatus = 'pending';
            if (account.charges_enabled && account.details_submitted) {
              newStatus = 'active';
            } else if (account.details_submitted && !account.charges_enabled) {
              newStatus = 'restricted';
            }

            if (org.stripeConnectStatus !== newStatus) {
              await storage.updateOrganization(org.id, {
                stripeConnectStatus: newStatus,
              });
              console.log(`✅ Updated Stripe Connect status for org ${org.id}: ${org.stripeConnectStatus} → ${newStatus}`);
            }
          } else {
            console.log(`ℹ️ account.updated for unknown Connect account: ${connectedAccountId}`);
          }
        } catch (connectError: any) {
          console.error('Error processing account.updated webhook:', connectError);
        }

        return res.json({ received: true });
      }

      // Handle refund status updates (reconcile pending refunds)
      if (event.type === 'charge.refund.updated') {
        const stripeRefund = event.data.object as Stripe.Refund;
        try {
          const refunds = await storage.getRefundsByStripeId(stripeRefund.id);
          for (const refund of refunds) {
            if (refund.status === stripeRefund.status) continue;
            const newStatus = stripeRefund.status as 'pending' | 'succeeded' | 'failed';
            const clearedAt = newStatus === 'succeeded' ? new Date().toISOString() : null;
            await storage.updateRefundStatus(refund.id, newStatus, clearedAt);
            if (newStatus === 'succeeded') {
              const allRefunds = await storage.getRefundsByPayment(refund.paymentId.toString());
              const totalRefunded = allRefunds
                .filter(r => r.status === 'succeeded')
                .reduce((sum, r) => sum + r.amount, 0);
              const payment = await storage.getPayment(refund.paymentId.toString());
              if (payment) {
                const isFullRefund = totalRefunded >= payment.amount;
                await storage.updatePayment(refund.paymentId.toString(), {
                  status: isFullRefund ? 'refunded' : 'partially_refunded',
                });
              }
            }
          }
        } catch (refundWebhookError: any) {
          console.error('Error processing charge.refund.updated:', refundWebhookError);
        }
        return res.json({ received: true });
      }

      // Handle other event types
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook event:", error);
      return res.status(500).json({ 
        error: "Error processing webhook",
        message: error.message 
      });
    }
  });

  // Tryout checkout - creates a Stripe checkout for tryout price
  app.post('/api/payments/create-tryout-checkout', requireAuth, async (req: any, res) => {
    const orgStripe = await getStripeForOrg(req.user.organizationId);
    if (!orgStripe) {
      return res.status(500).json({ error: "Stripe is not configured for this organization" });
    }

    try {
      const { programId, playerId, recommendedTeamId, successUrl, cancelUrl } = req.body;

      if (!programId || !playerId) {
        return res.status(400).json({ error: "programId and playerId are required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }

      if (!program.tryoutEnabled || program.tryoutPrice == null) {
        return res.status(400).json({ error: "This program does not have tryout enabled" });
      }

      const tryoutPrice: number = program.tryoutPrice!;

      // Validate player belongs to this user
      const player = await storage.getUser(playerId);
      if (!player) {
        return res.status(400).json({ error: "Invalid player ID" });
      }
      const isValidPlayer = playerId === req.user.id ||
        (player as any).parentId === req.user.id ||
        (player as any).guardianId === req.user.id;
      if (!isValidPlayer) {
        return res.status(403).json({ error: "You can only make payments for yourself or your children" });
      }

      // Reject tryout purchase if the player already has a qualifying active (non-tryout) enrollment for this program
      const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
      const hasActiveMemberEnrollment = existingEnrollments.some(
        (e: any) => e.programId === programId && e.status === 'active' && !e.isTryout
      );
      if (hasActiveMemberEnrollment) {
        return res.status(400).json({ error: "This player is already an active member of this program and is not eligible for a tryout" });
      }

      const stripeCustomerId = await getOrCreateStripeCustomer(orgStripe, user);
      const origin = `${req.protocol}://${req.get('host')}`;

      const session = await orgStripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tryout: ${program.name}`,
              description: 'Tryout fee — includes 1 session credit',
            },
            unit_amount: tryoutPrice,
          },
          quantity: 1,
        }],
        success_url: successUrl || `${origin}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${origin}/payments?canceled=true`,
        metadata: {
          userId: req.user.id,
          accountHolderId: req.user.id,
          profileId: playerId,
          programId,
          isTryout: 'true',
          recommendedTeamId: recommendedTeamId ? String(recommendedTeamId) : '',
          organizationId: req.user.organizationId,
        },
      });

      res.json({ sessionUrl: session.url });
    } catch (error: any) {
      console.error('Error creating tryout checkout:', error);
      res.status(500).json({ error: error.message || 'Failed to create tryout checkout' });
    }
  });

  // Payment success callback (for when webhooks don't fire in test mode)
  app.post('/api/payments/verify-session', requireAuth, async (req: any, res) => {
    try {
      console.log('🔍 verify-session request body:', req.body);
      
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Missing session ID' });
      }

      const orgStripe = await getStripeForOrg(req.user.organizationId);
      if (!orgStripe) {
        return res.status(500).json({ error: 'Stripe is not configured for this organization' });
      }

      console.log(`🔍 Verifying checkout session: ${sessionId}`);
      
      const session = await orgStripe.checkout.sessions.retrieve(sessionId);
      
      const sessionUserId = session.metadata?.userId || session.metadata?.accountHolderId;
      if (sessionUserId && sessionUserId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to verify this session' });
      }
      
      if (session.payment_status !== 'paid') {
        return res.json({ success: false, message: 'Payment not completed' });
      }

      console.log(`✅ Session verified: ${sessionId}, payment_status: ${session.payment_status}`);

      let paymentWasProcessed = false;

      try {
        await storage.completeAbandonedCart(session.id);
      } catch (cartError: any) {
        console.error('⚠️ Abandoned cart completion failed (non-fatal):', cartError.message);
      }

      if (session.metadata?.type === 'add_player') {
        const playerId = session.metadata.playerId;
        const accountHolderId = session.metadata.accountHolderId;
        const packageId = session.metadata.packageId;
        
        if (!playerId || !accountHolderId) {
          return res.status(400).json({ error: 'Missing required metadata' });
        }
        
        const existingPayments = await storage.getPaymentsByUser(playerId);
        const alreadyProcessed = existingPayments.some(p => 
          p.stripePaymentId === session.payment_intent && p.status === 'completed'
        );
        
        if (!alreadyProcessed) {
          const updatedPlayer = await storage.updateUser(playerId, {
            paymentStatus: "paid",
            hasRegistered: true,
            stripeCheckoutSessionId: session.id,
          });
          
          if (updatedPlayer && session.amount_total) {
            const amountCents = session.amount_total;
            const amountDollars = amountCents / 100;
            const playerName = `${updatedPlayer.firstName || ''} ${updatedPlayer.lastName || ''}`.trim();

            await storage.createPayment({
              organizationId: updatedPlayer.organizationId,
              userId: playerId,
              amount: amountCents,
              currency: 'usd',
              paymentType: 'add_player',
              status: 'completed',
              description: `Player Registration: ${playerName}`,
              stripePaymentId: session.payment_intent as string,
              programId: packageId,
            });
            console.log(`✅ Created add_player payment record via verify-session for player ${playerId}`);
            paymentWasProcessed = true;
            
            try {
              if (accountHolderId) {
                await pushNotifications.parentPaymentSuccessful(storage, accountHolderId, playerName, amountCents);
              }
              const parent = await storage.getUser(accountHolderId);
              const parentName = parent ? `${parent.firstName || ''} ${parent.lastName || ''}`.trim() : 'Unknown';
              await pushNotifications.notifyAllAdmins(storage,
                '💰 Payment Received',
                `${parentName} paid $${amountDollars.toFixed(2)} for ${playerName}'s registration`,
                updatedPlayer.organizationId
              );
            } catch (notifError: any) {
              console.error('⚠️ Payment notification failed (non-fatal):', notifError.message);
            }
            
            if (packageId) {
              try {
                const program = await storage.getProgram(packageId);
                if (program) {
                  const existingEnrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
                  const hasEnrollment = existingEnrollments.some(e => e.programId === packageId);
                  
                  if (!hasEnrollment) {
                    await storage.createEnrollment({
                      organizationId: updatedPlayer.organizationId,
                      accountHolderId: accountHolderId,
                      profileId: playerId,
                      programId: packageId,
                      status: 'active',
                      source: 'payment',
                      remainingCredits: program.sessionCount ?? undefined,
                      totalCredits: program.sessionCount ?? undefined,
                    });
                    console.log(`✅ Created enrollment for player ${playerId} in program ${packageId} via verify-session`);
                    
                    try {
                      await evaluateAwardsForUser(playerId, storage, { category: 'store' });
                    } catch (awardError: any) {
                      console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
                    }

                    try {
                      if (program.productCategory === 'goods') {
                        await pushNotifications.notifyAllAdmins(storage,
                          '📦 New Store Order',
                          `${playerName} purchased ${program.name} — dispatch required`,
                          updatedPlayer.organizationId
                        );
                      } else {
                        await pushNotifications.notifyAllAdmins(storage,
                          '🏀 New Enrollment',
                          `${playerName} enrolled in ${program.name} — needs team/skill level assignment`,
                          updatedPlayer.organizationId
                        );
                      }
                    } catch (notifError: any) {
                      console.error('⚠️ Admin notification failed (non-fatal):', notifError.message);
                    }
                  } else {
                    console.log(`ℹ️ Player ${playerId} already has enrollment for program ${packageId}`);
                  }
                }
              } catch (enrollError: any) {
                console.error("Error creating enrollment via verify-session:", enrollError);
              }
            }
          }
        } else {
          console.log(`ℹ️ Payment already processed for player ${playerId}`);
        }
      }
      
      if (session.metadata?.type === 'package_purchase') {
        const userId = session.metadata.userId;
        const packageId = session.metadata.packageId;
        const playerId = session.metadata.playerId || null;
        
        if (!userId || !packageId) {
          return res.status(400).json({ error: 'Missing required metadata' });
        }
        
        const existingPayments = await storage.getPaymentsByUser(userId);
        const alreadyProcessed = existingPayments.some(p => 
          p.stripePaymentId === session.payment_intent && p.status === 'completed'
        );
        
        if (!alreadyProcessed && session.amount_total) {
          const program = await storage.getProgram(packageId);
          const payment = await storage.createPayment({
            organizationId: await resolveOrgId(session, userId, packageId),
            userId: userId,
            playerId: playerId || undefined,
            amount: session.amount_total,
            currency: 'usd',
            paymentType: program?.type || 'package',
            status: 'completed',
            description: program?.name || `Package Purchase`,
            packageId: packageId,
            programId: packageId,
            stripePaymentId: session.payment_intent as string,
          });
          console.log(`✅ Created package_purchase payment record via verify-session for user ${userId}`);
          paymentWasProcessed = true;
          
          const amountCents = session.amount_total;
          const amountDollars = amountCents / 100;
          try {
            const payer = await storage.getUser(userId);
            const payerName = payer ? `${payer.firstName || ''} ${payer.lastName || ''}`.trim() : 'Unknown';
            const playerUser = playerId ? await storage.getUser(playerId) : payer;
            const playerName = playerUser ? `${playerUser.firstName || ''} ${playerUser.lastName || ''}`.trim() : payerName;
            
            await pushNotifications.parentPaymentSuccessful(storage, userId, playerName, amountCents);
            await pushNotifications.notifyAllAdmins(storage,
              '💰 Payment Received',
              `${payerName} paid $${amountDollars.toFixed(2)} for ${program?.name || 'a program'}`,
              payer?.organizationId || organizationId
            );
          } catch (notifError: any) {
            console.error('⚠️ Payment notification failed (non-fatal):', notifError.message);
          }
          
          if (program) {
            const enrollmentProfileId = playerId || userId;
            try {
              const isSubscription = program.type === 'Subscription';
              const isPack = program.type === 'Pack';
              const credits = isPack && program.sessionCount ? program.sessionCount : null;
              const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
              const now = new Date().toISOString();
              
              const enrollmentUser = await storage.getUser(enrollmentProfileId);
              await storage.createEnrollment({
                organizationId: enrollmentUser?.organizationId || program.organizationId || session.metadata?.organizationId || "default-org",
                programId: packageId,
                accountHolderId: userId,
                profileId: enrollmentProfileId,
                status: 'active',
                source: 'direct',
                paymentId: String(payment.id),
                stripeSubscriptionId: subscriptionId,
                startDate: now,
                endDate: null,
                totalCredits: credits,
                remainingCredits: credits,
                autoRenew: isSubscription,
                metadata: {},
              });
              console.log(`✅ Created enrollment via verify-session for ${enrollmentProfileId} in ${packageId}`);
              
              try {
                await evaluateAwardsForUser(enrollmentProfileId, storage, { category: 'store' });
              } catch (awardError: any) {
                console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
              }

              try {
                const enrolledPlayerName = enrollmentUser ? `${enrollmentUser.firstName || ''} ${enrollmentUser.lastName || ''}`.trim() : 'A player';
                if (program.productCategory === 'goods') {
                  await pushNotifications.notifyAllAdmins(storage,
                    '📦 New Store Order',
                    `${enrolledPlayerName} purchased ${program.name} — dispatch required`,
                    enrollmentUser?.organizationId
                  );
                } else {
                  await pushNotifications.notifyAllAdmins(storage,
                    '🏀 New Enrollment',
                    `${enrolledPlayerName} enrolled in ${program.name} — needs team/skill level assignment`,
                    enrollmentUser?.organizationId
                  );
                }
              } catch (notifError: any) {
                console.error('⚠️ Admin notification failed (non-fatal):', notifError.message);
              }
              
              if (playerId) {
                await storage.updateUser(playerId, { paymentStatus: 'paid' });
              }
              
              if (subscriptionId) {
                const existingUser = await storage.getUser(userId);
                if (existingUser?.stripeSubscriptionId !== subscriptionId) {
                  await storage.updateUser(userId, { stripeSubscriptionId: subscriptionId });
                }
              }
            } catch (enrollError) {
              console.error('Error creating enrollment:', enrollError);
            }
          }
        } else {
          console.log(`ℹ️ Payment already processed for user ${userId}`);
        }
      }

      // Handle tryout checkout
      if (session.metadata?.isTryout === 'true') {
        const accountHolderId = session.metadata.accountHolderId || session.metadata.userId;
        const profileId = session.metadata.profileId;
        const programId = session.metadata.programId;
        const recTeamId = session.metadata.recommendedTeamId ? parseInt(session.metadata.recommendedTeamId) : undefined;
        const orgId = session.metadata.organizationId;

        if (accountHolderId && profileId && programId) {
          const existingPayments = await storage.getPaymentsByUser(accountHolderId);
          const alreadyProcessed = existingPayments.some((p: any) =>
            p.stripePaymentId === session.payment_intent && p.status === 'completed'
          );

          if (!alreadyProcessed && session.amount_total) {
            try {
              const program = await storage.getProgram(programId);
              const playerUser = await storage.getUser(profileId);
              const playerName = playerUser ? `${playerUser.firstName || ''} ${playerUser.lastName || ''}`.trim() : 'Player';

              await storage.createPayment({
                organizationId: orgId || program?.organizationId || 'default-org',
                userId: accountHolderId,
                amount: session.amount_total,
                currency: 'usd',
                paymentType: 'stripe_checkout',
                status: 'completed',
                description: `Tryout: ${program?.name || programId}`,
                programId,
                stripePaymentId: session.payment_intent as string,
              });

              // Create tryout enrollment with 1 credit
              await storage.createEnrollment({
                organizationId: orgId || program?.organizationId || 'default-org',
                programId,
                accountHolderId,
                profileId,
                status: 'active',
                source: 'direct',
                totalCredits: 1,
                remainingCredits: 1,
                isTryout: true,
                recommendedTeamId: recTeamId || null,
                metadata: { tryout: true, recommendedTeamId: recTeamId },
              });

              paymentWasProcessed = true;
              console.log(`✅ Created tryout enrollment for ${profileId} in ${programId}`);

              try {
                await pushNotifications.parentPaymentSuccessful(storage, accountHolderId, playerName, session.amount_total);
                await pushNotifications.notifyAllAdmins(
                  storage,
                  '🏀 New Tryout',
                  `${playerName} paid for a tryout in ${program?.name || programId}`,
                  orgId || program?.organizationId || 'default-org'
                );
              } catch (notifError: any) {
                console.error('⚠️ Tryout notification failed (non-fatal):', notifError.message);
              }
            } catch (tryoutError: any) {
              console.error('Error creating tryout enrollment:', tryoutError);
            }
          }
        }
      }

      if (session.metadata?.packageSelectionIds) {
        const userId = session.metadata.userId;
        const selectionIds = session.metadata.packageSelectionIds;
        
        if (!userId || !selectionIds) {
          return res.status(400).json({ error: 'Missing required metadata for package selections' });
        }
        
        const existingPayments = await storage.getPaymentsByUser(userId);
        const alreadyProcessed = existingPayments.some(p => 
          p.stripePaymentId === session.payment_intent && p.status === 'completed'
        );
        
        if (!alreadyProcessed) {
          const selectionIdArray = selectionIds.split(',');
          for (const selectionId of selectionIdArray) {
            try {
              await storage.markPackageSelectionPaid(selectionId.trim());
              console.log(`✅ Marked package selection ${selectionId} as paid via verify-session`);
            } catch (err) {
              console.error(`Error marking selection ${selectionId} as paid:`, err);
            }
          }
          
          if (session.amount_total) {
            await storage.createPayment({
              organizationId: await resolveOrgId(session, userId),
              userId,
              amount: session.amount_total,
              currency: 'usd',
              paymentType: 'stripe_checkout',
              status: 'completed',
              description: `Package Selections Payment`,
              stripePaymentId: session.payment_intent as string,
            });
            console.log(`✅ Created consolidated payment record via verify-session for user ${userId}`);
            paymentWasProcessed = true;
          }
        } else {
          console.log(`ℹ️ Package selection payment already processed for session ${session.id}`);
        }
      }

      if (session.metadata?.couponId) {
        try {
          const couponId = parseInt(session.metadata.couponId);
          const coupon = await storage.getCoupon(couponId);
          if (coupon) {
            const newUses = (coupon.currentUses || 0) + 1;
            const updates: any = { currentUses: newUses };
            if (coupon.maxUses && newUses >= coupon.maxUses) {
              updates.isActive = false;
            }
            await storage.updateCoupon(couponId, updates);
            console.log(`✅ Incremented coupon ${coupon.code} usage to ${newUses} via verify-session`);
          }
        } catch (couponError: any) {
          console.error('⚠️ Coupon usage tracking failed (non-fatal):', couponError.message);
        }
      }

      if (paymentWasProcessed) {
        sendPaymentReceiptEmail(session).catch(() => {});
      }
      res.json({ success: true, message: 'Payment verified and processed' });
    } catch (error: any) {
      console.error('Error verifying session:', error);
      res.status(500).json({ error: 'Failed to verify session', message: error.message });
    }
  });
  
  // =============================================
  // ABANDONED CART ROUTES
  // =============================================

  app.get('/api/abandoned-carts', requireAuth, async (req: any, res) => {
    try {
      const carts = await storage.getAbandonedCartsByUser(req.user.id);
      res.json(carts);
    } catch (error: any) {
      console.error('Error fetching abandoned carts:', error);
      res.status(500).json({ error: 'Failed to fetch cart items' });
    }
  });

  app.post('/api/abandoned-carts/:id/dismiss', requireAuth, async (req: any, res) => {
    try {
      const cartId = parseInt(req.params.id);
      if (isNaN(cartId)) {
        return res.status(400).json({ error: 'Invalid cart ID' });
      }
      await storage.dismissAbandonedCart(cartId, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error dismissing abandoned cart:', error);
      res.status(500).json({ error: 'Failed to dismiss cart item' });
    }
  });

  app.post('/api/abandoned-carts/:id/resume', requireAuth, async (req: any, res) => {
    try {
      const cartId = parseInt(req.params.id);
      if (isNaN(cartId)) {
        return res.status(400).json({ error: 'Invalid cart ID' });
      }

      const cart = await storage.getAbandonedCartById(cartId);
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
      if (cart.userId !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const orgStripe = await getStripeForOrg(req.user.organizationId);
      if (!orgStripe) {
        return res.status(500).json({ error: 'Stripe is not configured for this organization' });
      }

      const { platform } = req.body || {};
      const isNativeIOS = platform === 'ios';

      // Try to retrieve the existing Stripe session
      if (cart.stripeSessionId) {
        try {
          const existingSession = await orgStripe.checkout.sessions.retrieve(cart.stripeSessionId);
          if (existingSession.status === 'open' && existingSession.url) {
            return res.json({ url: existingSession.url, sessionId: cart.stripeSessionId });
          }
        } catch (stripeErr: any) {
          console.warn('Could not retrieve existing Stripe session:', stripeErr.message);
        }
      }

      // Original session expired or unavailable — create a new one
      if (!cart.productId) {
        return res.status(400).json({ error: 'Cannot resume checkout: missing product information' });
      }

      const program = await storage.getProgram(cart.productId);
      if (!program || !program.price) {
        return res.status(404).json({ error: 'Product not found or has no price' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const customerId = await getOrCreateStripeCustomer(orgStripe, user);
      const origin = `${req.protocol}://${req.get('host')}`;

      let iosAuthToken = '';
      if (isNativeIOS) {
        iosAuthToken = jwt.sign(
          { 
            userId: user.id, 
            organizationId: user.organizationId, 
            role: user.role,
            purpose: 'stripe_success'
          },
          process.env.JWT_SECRET!,
          { expiresIn: '10m' }
        );
      }

      const successUrl = isNativeIOS
        ? `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = isNativeIOS
        ? `${origin}/payment-success?canceled=true`
        : `${origin}/unified-account?payment=canceled`;

      const cartLineItems: any[] = [{
        price_data: {
          currency: 'usd',
          product_data: { name: program.name || program.title || 'Program' },
          unit_amount: program.price,
        },
        quantity: 1,
      }];

      // Add service fee
      const { lineItem: cartFeeLineItem, feeCents: cartServiceFeeCents } = await getServiceFeeLineItem(program.price);
      cartLineItems.push(cartFeeLineItem);

      const cartOrgName = await getOrgDisplayName(req.user.organizationId);
      const cartSessionParams: any = {
        customer: customerId,
        line_items: cartLineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_intent_data: {
          receipt_email: user.email,
          statement_descriptor: cartOrgName.substring(0, 22),
        },
        metadata: {
          type: 'package_purchase',
          userId: req.user.id,
          packageId: cart.productId,
          playerId: '',
          organizationId: req.user.organizationId,
          addOnIds: '',
          signedWaiverIds: '',
          pricingOptionId: '',
          pricingOptionName: '',
        },
      };

      const connectResult3 = await applyConnectChargeParams(cartSessionParams, req.user.organizationId, 'payment', cartServiceFeeCents);
      verifyConnectRouting(cartSessionParams, 'payment', req.user.organizationId, connectResult3, { applicationFeeAmount: cartServiceFeeCents, checkoutType: 'cart_purchase' });

      console.log(`[Connect] cart_purchase: creating session for org ${req.user.organizationId}`, {
        payment_intent_data: cartSessionParams.payment_intent_data ?? null,
      });

      const newSession = await orgStripe.checkout.sessions.create(cartSessionParams);

      if (!newSession.url) {
        return res.status(500).json({ error: 'Failed to create checkout session' });
      }

      res.json({ url: newSession.url, sessionId: newSession.id });
    } catch (error: any) {
      console.error('Error resuming abandoned cart checkout:', error);
      res.status(500).json({ error: error.message || 'Failed to resume checkout' });
    }
  });

  // =============================================
  // REGISTRATION ROUTES
  // =============================================
  
  // Check if user exists by email (for pre-registration check)
  app.post('/api/registration/check-email', async (req: any, res) => {
    try {
      const { email, organizationId } = req.body;
      const user = await storage.getUserByEmail(email, organizationId || "default-org");
      
      let stripeData = null;
      let stripeCustomerId = user?.stripeCustomerId;
      
      // Search Stripe for customer by email (even if no user exists)
      if (stripe) {
        try {
          // First try to get customer by ID if user has one
          if (stripeCustomerId) {
            const customer = await stripe.customers.retrieve(stripeCustomerId, {
              expand: ['subscriptions'],
            });
            stripeData = customer;
          } else {
            // Search for customer by email
            const customers = await stripe.customers.list({
              email: email,
              limit: 1,
            });
            
            if (customers.data.length > 0) {
              stripeCustomerId = customers.data[0].id;
              const customer = await stripe.customers.retrieve(stripeCustomerId, {
                expand: ['subscriptions'],
              });
              stripeData = customer;
            }
          }
          
          if (stripeData) {
            // Fetch recent payment intents
            const paymentIntents = await stripe.paymentIntents.list({
              customer: stripeCustomerId,
              limit: 10,
            });
            
            const subscriptions = (stripeData as any).subscriptions?.data || [];
            const activeSubscriptions = subscriptions.filter((sub: any) => sub.status === 'active');
            
            // Find most recent successful payment
            const successfulPayments = paymentIntents.data.filter((pi: any) => pi.status === 'succeeded');
            const lastPayment = successfulPayments.length > 0 ? successfulPayments[0] : null;
            const lastPaymentDate = lastPayment ? new Date(lastPayment.created * 1000) : null;
            
            // Calculate next payment date (28 days from last payment)
            let nextPaymentDate = null;
            let paymentOverdue = false;
            if (lastPaymentDate) {
              nextPaymentDate = new Date(lastPaymentDate);
              nextPaymentDate.setDate(nextPaymentDate.getDate() + 28);
              paymentOverdue = new Date() > nextPaymentDate;
            }
            
            // Extract prefill data from Stripe customer
            const prefillData = {
              firstName: (stripeData as any).metadata?.firstName || (stripeData as any).name?.split(' ')[0] || '',
              lastName: (stripeData as any).metadata?.lastName || (stripeData as any).name?.split(' ').slice(1).join(' ') || '',
              phone: (stripeData as any).phone || '',
              email: (stripeData as any).email || email,
            };
            
            return res.json({
              exists: !!user,
              hasRegistered: user?.hasRegistered || false,
              stripeCustomer: {
                id: stripeCustomerId,
                prefillData,
                lastPaymentDate,
                nextPaymentDate,
                paymentOverdue,
                needsPayment: !lastPayment || paymentOverdue,
                subscriptions: activeSubscriptions.map((sub: any) => ({
                  id: sub.id,
                  status: sub.status,
                  currentPeriodEnd: sub.current_period_end,
                  priceId: sub.items.data[0]?.price.id,
                  amount: sub.items.data[0]?.price.unit_amount,
                  interval: sub.items.data[0]?.price.recurring?.interval,
                  productId: sub.items.data[0]?.price.product,
                })),
                payments: paymentIntents.data.map((pi: any) => ({
                  id: pi.id,
                  amount: pi.amount,
                  status: pi.status,
                  created: pi.created,
                  packageId: pi.metadata.packageId,
                  packageName: pi.metadata.packageName,
                })),
              },
            });
          }
        } catch (stripeError: any) {
          console.error("Error fetching Stripe data:", stripeError);
          if (user) {
            return res.json({
              exists: true,
              hasRegistered: user.hasRegistered || false,
              stripeError: "Could not fetch payment information",
            });
          }
        }
      }
      
      // No user and no Stripe data
      if (!user) {
        return res.json({ exists: false });
      }
      
      // User exists but no Stripe data
      return res.json({
        exists: true,
        hasRegistered: user.hasRegistered || false,
      });
    } catch (error: any) {
      console.error("Check email error:", error);
      res.status(500).json({ message: "Error checking email" });
    }
  });
  
  app.post('/api/signup/organization', async (req: any, res) => {
    try {
      const { organizationName, sportType, firstName, lastName, email, phoneNumber, password } = req.body;

      if (!organizationName || !firstName || !lastName || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9!@#$%^&*]/.test(password)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters with one uppercase letter and one number or symbol" });
      }

      const existingUsers = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);
      if (existingUsers.length > 0) {
        return res.status(400).json({ success: false, message: "This email is already registered. Please login instead." });
      }

      const org = await storage.createOrganization({
        name: organizationName,
        subdomain: organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30),
        sportType: sportType || 'basketball',
        primaryColor: '#1E40AF',
        secondaryColor: '#DC2626',
        terminology: { athlete: "Player", coach: "Coach", parent: "Parent", team: "Team", practice: "Practice", game: "Game" },
        features: { payments: true, awards: true, messaging: true, events: true, training: true },
      });

      const hashedPassword = hashPassword(password);

      let adminUser;
      try {
        adminUser = await storage.createUser({
          organizationId: org.id,
          email,
          role: "admin",
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          password: hashedPassword,
          hasRegistered: true,
          verified: true,
          isActive: true,
          awards: [],
          totalPractices: 0,
          totalGames: 0,
          consecutiveCheckins: 0,
          videosCompleted: 0,
          yearsActive: 0,
        });
      } catch (userError: any) {
        await db.delete(organizations).where(eq(organizations.id, org.id));
        throw userError;
      }

      req.session.userId = adminUser.id;
      req.session.organizationId = org.id;
      req.session.role = "admin";

      const token = jwt.sign(
        { userId: adminUser.id, organizationId: org.id, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      console.log(`[Org Signup] Created org "${org.name}" (${org.id}) with admin ${adminUser.email} (${adminUser.id})`);

      res.json({
        success: true,
        token,
        user: { id: adminUser.id, email: adminUser.email, role: "admin", firstName: adminUser.firstName, lastName: adminUser.lastName },
        organization: { id: org.id, name: org.name },
      });
    } catch (error: any) {
      console.error("[Org Signup] Error:", error);
      if (error.code === "23505") {
        return res.status(400).json({ success: false, message: "This email is already registered." });
      }
      res.status(500).json({ success: false, message: error.message || "Something went wrong" });
    }
  });

  const PLATFORM_PLANS: Record<string, { name: string; price: number; families: string }> = {
    starter: { name: 'Starter', price: 9900, families: 'Up to 100 families' },
    growth: { name: 'Growth', price: 24900, families: 'Up to 500 families' },
    pro: { name: 'Pro', price: 49900, families: 'Unlimited families' },
  };

  app.post('/api/platform/create-subscription-checkout', requireAuth, isAdmin, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ success: false, message: 'Payment processing is not configured' });
      }

      const { plan } = req.body;
      const planInfo = PLATFORM_PLANS[plan];
      if (!planInfo) {
        return res.status(400).json({ success: false, message: 'Invalid plan selected' });
      }

      const userId = req.user.id;
      const orgId = req.user.organizationId;
      const user = await storage.getUser(userId);
      const userEmail = user?.email;

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: userEmail,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `BoxStat ${planInfo.name} Plan`,
              description: `${planInfo.families} - Monthly platform subscription`,
            },
            unit_amount: planInfo.price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        metadata: {
          type: 'platform_subscription',
          plan,
          userId,
          organizationId: orgId,
        },
        success_url: `${baseUrl}/subscription-required?subscription=success&plan=${plan}`,
        cancel_url: `${baseUrl}/subscription-required?subscription=cancelled`,
      });

      console.log(`[Platform Subscription] Created checkout session for org ${orgId}, plan: ${plan}, session: ${session.id}`);
      res.json({ success: true, url: session.url });
    } catch (error: any) {
      console.error('[Platform Subscription] Error creating checkout:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create checkout session' });
    }
  });

  app.post('/api/platform/verify-subscription', requireAuth, async (req: any, res) => {
    try {
      if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

      const orgId = req.user.organizationId;
      if (!orgId) return res.status(400).json({ error: 'No organization' });

      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      if ((org as any).platformSubscriptionStatus === 'active') {
        return res.json({ status: 'active', plan: (org as any).platformPlan });
      }

      const sessions = await stripe.checkout.sessions.list({
        limit: 5,
      });

      const matchingSession = sessions.data.find(
        (s) => s.metadata?.type === 'platform_subscription' &&
               s.metadata?.organizationId === orgId &&
               s.status === 'complete' &&
               s.payment_status === 'paid'
      );

      if (matchingSession) {
        const plan = matchingSession.metadata?.plan || 'growth';
        const subId = (matchingSession as any).subscription;
        await storage.updateOrganization(orgId, {
          platformPlan: plan,
          platformSubscriptionStatus: 'active',
          platformSubscriptionId: subId || null,
        } as any);
        console.log(`[Platform Subscription] Verified and activated org ${orgId}, plan: ${plan}`);
        return res.json({ status: 'active', plan });
      }

      return res.json({ status: 'inactive' });
    } catch (error: any) {
      console.error('[Platform Subscription] Verify error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/registration/complete', async (req: any, res) => {
    try {
      const { registrationType, parentInfo, addressInfo, players, password, email } = req.body;
      
      console.log('[Registration] Received data:', {
        registrationType,
        parentInfo: parentInfo ? {
          firstName: parentInfo.firstName,
          lastName: parentInfo.lastName,
          email: parentInfo.email,
          phoneNumber: parentInfo.phoneNumber,
        } : null,
        playersCount: players?.length,
      });
      
      const organizationId = req.body.organizationId || req.user?.organizationId || "default-org";
      
      // Helper function to sanitize date strings (convert empty strings to null)
      const sanitizeDate = (date: any) => {
        if (!date || date === '') return null;
        return date;
      };
      
      // Determine the primary email (where verification was sent)
      const primaryEmail = registrationType === "my_child" 
        ? parentInfo?.email 
        : (email || players[0]?.email);
      
      if (!primaryEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Email is required to complete registration" 
        });
      }
      
      // Check for pending registration
      const pendingReg = await storage.getPendingRegistration(primaryEmail, organizationId);
      
      if (!pendingReg) {
        return res.status(400).json({ 
          success: false, 
          message: "No pending registration found. Please start registration again." 
        });
      }
      
      if (!pendingReg.verified) {
        return res.status(403).json({ 
          success: false, 
          message: "Please verify your email before completing registration. Check your inbox for the verification link." 
        });
      }
      
      // Check if user already exists (check ALL users including inactive ones)
      // This is important because the database has a global unique constraint on email
      const existingUserResults = await db.select({ id: users.id, email: users.email })
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${primaryEmail})`);
      
      if (existingUserResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "This email is already registered. Please login instead." 
        });
      }
      
      // Validate all required fields
      if (!password || password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: "Password is required and must be at least 8 characters" 
        });
      }
      
      if (registrationType === "my_child") {
        if (!parentInfo?.firstName || !parentInfo?.lastName) {
          return res.status(400).json({ 
            success: false, 
            message: "Parent/Guardian first and last name are required" 
          });
        }
        if (!players || players.length === 0) {
          return res.status(400).json({ 
            success: false, 
            message: "At least one player is required" 
          });
        }
      } else {
        if (!players || players.length === 0 || !players[0].firstName || !players[0].lastName) {
          return res.status(400).json({ 
            success: false, 
            message: "First and last name are required" 
          });
        }
      }
      
      // Hash the password
      const hashedPassword = hashPassword(password);
      
      // Create user account(s) - this is where the actual account is created
      let accountHolderId: string | undefined;
      let primaryUser: any = null;
      
      try {
        if (registrationType === "my_child" && parentInfo) {
          // Create parent user account
          primaryUser = await storage.createUser({
            organizationId,
            email: primaryEmail,
            role: "parent",
            firstName: parentInfo.firstName,
            lastName: parentInfo.lastName,
            phoneNumber: parentInfo.phoneNumber,
            dateOfBirth: sanitizeDate(parentInfo.dateOfBirth),
            address: addressInfo?.address || null,
            city: addressInfo?.city || null,
            state: addressInfo?.state || null,
            postalCode: addressInfo?.postalCode || null,
            password: hashedPassword,
            hasRegistered: true,
            verified: true,
            isActive: true,
            awards: [],
            totalPractices: 0,
            totalGames: 0,
            consecutiveCheckins: 0,
            videosCompleted: 0,
            yearsActive: 0,
          });
          accountHolderId = primaryUser.id;
          
          // Create player profiles for children - no email needed
          // Child players are managed through parent's account
          const createdPlayers = [];
          for (const player of players) {
            const playerUser = await storage.createUser({
              organizationId,
              email: null as any, // Child players don't need email - managed through parent account
              role: "player",
              firstName: player.firstName,
              lastName: player.lastName,
              dateOfBirth: sanitizeDate(player.dateOfBirth),
              gender: player.gender,
              skillLevel: player.skillLevel || null,
              accountHolderId,
              teamAssignmentStatus: "pending",
              hasRegistered: true,
              verified: true, // Child profiles are auto-verified through parent
              isActive: true,
              awards: [],
              totalPractices: 0,
              totalGames: 0,
              consecutiveCheckins: 0,
              videosCompleted: 0,
              yearsActive: 0,
            });
            createdPlayers.push(playerUser);
          }
        } else {
          // "myself" registration - create parent account first
          // User will add themselves as a player through the Add Player flow
          const player = players[0];
          primaryUser = await storage.createUser({
            organizationId,
            email: primaryEmail,
            role: "parent",
            firstName: player.firstName,
            lastName: player.lastName,
            dateOfBirth: sanitizeDate(player.dateOfBirth),
            gender: player.gender,
            skillLevel: player.skillLevel || null,
            address: addressInfo?.address || null,
            city: addressInfo?.city || null,
            state: addressInfo?.state || null,
            postalCode: addressInfo?.postalCode || null,
            password: hashedPassword,
            hasRegistered: true,
            verified: true,
            registrationType: "myself",
            isActive: true,
            awards: [],
            totalPractices: 0,
            totalGames: 0,
            consecutiveCheckins: 0,
            videosCompleted: 0,
            yearsActive: 0,
          });
          accountHolderId = primaryUser.id;
        }
      } catch (createError: any) {
        console.error("Error creating user:", createError);
        if (createError.message?.includes("duplicate key") || createError.code === '23505') {
          return res.status(400).json({ 
            success: false, 
            message: "This email is already registered. Please login instead." 
          });
        }
        throw createError;
      }
      
      // Delete the pending registration now that account is created
      await storage.deletePendingRegistration(primaryEmail, organizationId);
      
      res.json({
        success: true,
        message: "Registration complete! You can now login.",
        requiresVerification: false,
        email: primaryEmail,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Registration failed" 
      });
    }
  });
  
  // =============================================
  // SUBSCRIPTION WALLET ROUTES (Legacy Migration)
  // =============================================
  
  // Get unassigned subscriptions for current user
  app.get('/api/subscriptions/unassigned', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const unassignedSubs = await storage.getUnassignedSubscriptionsByOwner(userId);
      
      res.json({
        success: true,
        subscriptions: unassignedSubs,
        count: unassignedSubs.length,
      });
    } catch (error: any) {
      console.error("Error fetching unassigned subscriptions:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch unassigned subscriptions" 
      });
    }
  });
  
  // Get all subscriptions for current user
  app.get('/api/subscriptions', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const subs = await storage.getSubscriptionsByOwner(userId);
      
      res.json({
        success: true,
        subscriptions: subs,
        count: subs.length,
      });
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch subscriptions" 
      });
    }
  });
  
  // Assign subscription to player
  app.post('/api/subscriptions/assign', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { subscriptionId, playerId } = req.body;
      
      if (!subscriptionId || !playerId) {
        return res.status(400).json({ 
          success: false, 
          message: "Subscription ID and Player ID are required" 
        });
      }
      
      // Verify the subscription belongs to the current user
      const subscription = await storage.getSubscription(subscriptionId);
      
      if (!subscription) {
        return res.status(404).json({ 
          success: false, 
          message: "Subscription not found" 
        });
      }
      
      if (subscription.ownerUserId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You don't have permission to assign this subscription" 
        });
      }
      
      if (subscription.assignedPlayerId) {
        return res.status(400).json({ 
          success: false, 
          message: "This subscription is already assigned to a player" 
        });
      }
      
      // Verify the player belongs to the current user
      const player = await storage.getUser(playerId);
      
      if (!player) {
        return res.status(404).json({ 
          success: false, 
          message: "Player not found" 
        });
      }
      
      if (player.accountHolderId !== userId && player.id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only assign subscriptions to your own players" 
        });
      }
      
      // Assign the subscription
      const updatedSubscription = await storage.assignSubscriptionToPlayer(subscriptionId, playerId);
      
      if (!updatedSubscription) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to assign subscription" 
        });
      }
      
      console.log(`✅ Assigned subscription ${subscriptionId} to player ${playerId}`);
      
      // Check if user has any remaining unassigned subscriptions
      const remainingUnassigned = await storage.getUnassignedSubscriptionsByOwner(userId);
      if (remainingUnassigned.length === 0) {
        // Clear the legacy subscription notification
        await clearLegacySubscriptionNotification(userId);
      }
      
      res.json({
        success: true,
        message: `Successfully assigned "${subscription.productName}" to ${player.firstName} ${player.lastName}`,
        subscription: updatedSubscription,
      });
    } catch (error: any) {
      console.error("Error assigning subscription:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to assign subscription" 
      });
    }
  });
  
  // Get detailed subscription info with Stripe data (next payment date, etc.)
  app.get('/api/subscriptions/details', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Get all subscriptions for this account holder
      const subscriptions = await storage.getSubscriptionsByOwner(userId);
      
      // Get all child players
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      const childPlayers = allUsers.filter(u => u.accountHolderId === userId && u.role === "player");
      
      // Collect all unique Stripe subscription IDs
      const stripeSubIds = new Set<string>();
      for (const sub of subscriptions) {
        if (sub.stripeSubscriptionId) {
          stripeSubIds.add(sub.stripeSubscriptionId);
        }
      }
      
      // Also check for Stripe subscriptions in player_subscriptions table
      for (const player of childPlayers) {
        const playerSubs = await storage.getSubscriptionsByPlayerId(player.id);
        for (const sub of playerSubs) {
          if (sub.stripeSubscriptionId) {
            stripeSubIds.add(sub.stripeSubscriptionId);
          }
        }
      }
      
      // Fetch Stripe subscription details
      const stripeDetails: Record<string, any> = {};
      if (stripe) {
        for (const subId of stripeSubIds) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subId);
            // Get period data from items (Stripe SDK returns period data in items)
            const periodEnd = stripeSub.items?.data?.[0]?.current_period_end || (stripeSub as any).current_period_end;
            const periodStart = stripeSub.items?.data?.[0]?.current_period_start || (stripeSub as any).current_period_start;
            stripeDetails[subId] = {
              id: stripeSub.id,
              status: stripeSub.status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: (stripeSub as any).cancel_at_period_end,
              interval: stripeSub.items.data[0]?.price?.recurring?.interval || 'month',
              amount: stripeSub.items.data[0]?.price?.unit_amount || 0,
              currency: stripeSub.items.data[0]?.price?.currency || 'usd',
            };
          } catch (stripeError: any) {
            console.warn(`Could not fetch Stripe subscription ${subId}:`, stripeError.message);
          }
        }
      }
      
      // Enrich subscriptions with Stripe data and player info
      const enrichedSubscriptions = subscriptions.map(sub => {
        const stripeInfo = sub.stripeSubscriptionId ? stripeDetails[sub.stripeSubscriptionId] : null;
        const player = sub.assignedPlayerId ? childPlayers.find(p => p.id === sub.assignedPlayerId) : null;
        
        return {
          ...sub,
          playerName: player ? `${player.firstName} ${player.lastName}` : null,
          stripe: stripeInfo,
          nextPaymentDate: stripeInfo?.currentPeriodEnd ? new Date(stripeInfo.currentPeriodEnd * 1000).toISOString() : null,
        };
      });
      
      // Get upcoming payments summary
      const upcomingPayments = enrichedSubscriptions
        .filter(s => s.status === 'active' && s.stripe?.currentPeriodEnd)
        .map(s => ({
          subscriptionId: s.id,
          stripeSubscriptionId: s.stripeSubscriptionId,
          productName: s.productName,
          playerName: s.playerName,
          amount: s.stripe?.amount || 0,
          currency: s.stripe?.currency || 'usd',
          nextPaymentDate: s.nextPaymentDate,
          interval: s.stripe?.interval || 'month',
        }))
        .sort((a, b) => new Date(a.nextPaymentDate || 0).getTime() - new Date(b.nextPaymentDate || 0).getTime());
      
      res.json({
        success: true,
        subscriptions: enrichedSubscriptions,
        upcomingPayments,
        stripeCustomerId: user.stripeCustomerId,
      });
    } catch (error: any) {
      console.error("Error fetching subscription details:", error);
      res.status(500).json({ success: false, message: "Failed to fetch subscription details" });
    }
  });
  
  // Get all profiles associated with this account (for profile gateway role detection)
  app.get('/api/account/profiles', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.user;
      const currentUser = await storage.getUser(id);
      const accountHolderId = currentUser?.accountHolderId || id;
      const profiles = await storage.getAccountProfiles(accountHolderId);
      const orgProfiles = (profiles || []).filter((p: any) => p.organizationId === currentUser?.organizationId);
      res.json(orgProfiles);
    } catch (error: any) {
      console.error('Error fetching account profiles:', error);
      res.status(500).json({ message: 'Failed to fetch profiles' });
    }
  });
  
  // Get users by account holder (for unified account page)
  app.get('/api/account/players', requireAuth, async (req: any, res) => {
    const { id } = req.user;
    const user = await storage.getUser(id);
    
    let players: any[] = [];
    const accountHolderId = user?.accountHolderId || id;
    
    if (user?.role === "parent" || user?.role === "admin" || user?.role === "coach") {
      // Get all players linked to any profile in this account
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      players = allUsers.filter(u => (u.accountHolderId === accountHolderId || u.parentId === accountHolderId || u.accountHolderId === id || u.parentId === id) && u.role === "player");
    } else if (user?.role === "player") {
      // Return self
      players = [user];
    }
    
    // Fetch active subscriptions, status tags, and team info for each player
    const allTeams = await storage.getTeamsByOrganization(user.organizationId);
    
    const playersWithSubscriptions = await Promise.all(
      players.map(async (player: any) => {
        try {
          const subscriptions = await storage.getSubscriptionsByPlayerId(player.id);
          const statusTag = await storage.getPlayerStatusTag(player.id);
          
          // Get team memberships for this player
          const playerTeamMemberships = await storage.getTeamMembershipsByProfile(player.id);
          const activeTeamMemberships = playerTeamMemberships.filter((tm: any) => tm.status === 'active' && tm.role === 'player');
          const allTeamIds = activeTeamMemberships.map((tm: any) => tm.teamId);
          let teamInfo = null;
          const firstActive = activeTeamMemberships[0];
          if (firstActive) {
            const team = allTeams.find((t: any) => t.id === firstActive.teamId);
            if (team) {
              teamInfo = {
                teamId: team.id,
                teamName: team.name,
                coachId: team.coachId,
              };
              if (team.coachId) {
                const coach = await storage.getUser(team.coachId);
                if (coach) {
                  (teamInfo as any).coachName = `${coach.firstName} ${coach.lastName}`;
                }
              }
            }
          }
          
          return {
            ...player,
            ...teamInfo,
            allTeamIds,
            activeSubscriptions: (subscriptions || []).map(s => ({
              id: s.id,
              productName: s.productName,
              status: s.status,
            })),
            statusTag: statusTag.tag,
            remainingCredits: statusTag.remainingCredits,
            lowBalance: statusTag.lowBalance,
          };
        } catch (error) {
          console.error(`Error fetching subscriptions for player ${player.id}:`, error);
          return {
            ...player,
            activeSubscriptions: [],
            statusTag: player.paymentStatus === 'pending' ? 'payment_due' : 'none',
          };
        }
      })
    );
    
    res.json(playersWithSubscriptions);
  });
  
  // Get parent's team chatrooms (based on children's team memberships)
  app.get('/api/account/team-chatrooms', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.user;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Get all players linked to this user (mirrors /api/account/players logic)
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      let linkedPlayers: any[] = [];
      
      // Find linked players (for parents/admins)
      linkedPlayers = allUsers.filter(u => 
        (u.accountHolderId === id || u.parentId === id) && u.role === "player"
      );
      
      // If no linked players and user is a player themselves, include self
      if (linkedPlayers.length === 0 && user.role === "player") {
        linkedPlayers = [user];
      }
      
      if (linkedPlayers.length === 0) {
        return res.json([]);
      }
      
      // Get all team memberships for linked players
      const teamChatroomsMap = new Map<number, any>();
      const allTeams = await storage.getTeamsByOrganization(user.organizationId);
      const allPrograms = await storage.getProgramsByOrganization(user.organizationId);
      
      for (const player of linkedPlayers) {
        const memberships = await storage.getTeamMembershipsByProfile(player.id);
        const activeMemberships = memberships.filter((m: any) => m.status === 'active');
        
        for (const membership of activeMemberships) {
          const team = allTeams.find((t: any) => String(t.id) === String(membership.teamId));
          if (!team || !team.active) continue;
          
          // Check if the team's program has chat enabled
          const program = allPrograms.find((p: any) => String(p.id) === String(team.programId));
          const chatMode = program?.chatMode || 'two_way'; // Default to enabled if not specified
          
          if (chatMode === 'disabled') continue;
          
          // Add to map if not already present
          if (!teamChatroomsMap.has(team.id)) {
            let coachName = 'Coach';
            if (team.coachId) {
              const coach = await storage.getUser(team.coachId);
              if (coach) {
                coachName = `${coach.firstName} ${coach.lastName}`;
              }
            }
            
            teamChatroomsMap.set(team.id, {
              teamId: team.id,
              teamName: team.name,
              coachId: team.coachId,
              coachName,
              assistantCoachIds: team.assistantCoachIds || [],
              chatMode,
              playerNames: [],
            });
          }
          
          // Add player name to list
          const chatroom = teamChatroomsMap.get(team.id);
          const playerName = `${player.firstName} ${player.lastName}`;
          if (!chatroom.playerNames.includes(playerName)) {
            chatroom.playerNames.push(playerName);
          }
        }
      }
      
      res.json(Array.from(teamChatroomsMap.values()));
    } catch (error: any) {
      console.error('Error fetching team chatrooms:', error);
      res.status(500).json({ error: 'Failed to fetch team chatrooms' });
    }
  });
  
  // Add player to account (for parents and admins adding players)
  app.post('/api/account/players', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.user;
      const user = await storage.getUser(id);
      
      if (!user || (user.role !== "parent" && user.role !== "admin")) {
        return res.status(403).json({ 
          success: false, 
          message: "Only parent and admin accounts can add players" 
        });
      }
      
      const { firstName, lastName, dateOfBirth, gender, skillLevel, aauMembershipId, postalCode, concussionWaiverAcknowledged, clubAgreementAcknowledged, packageId, addOnIds, selectedPricingOptionId } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "First name and last name are required" 
        });
      }
      
      // Package selection is now optional - players can be added without enrolling in a program
      // Program enrollment happens separately in the Payments section
      
      // Child players don't need their own email - they're managed through parent's account
      // The unique email constraint only applies to parent accounts (account_holder_id IS NULL)
      
      // Create child player user
      const playerUser = await storage.createUser({
        organizationId: user.organizationId,
        email: null as any, // Child players don't need email - managed through parent account
        role: "player",
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        skillLevel: skillLevel || null,
        aauMembershipId: aauMembershipId || null,
        postalCode: postalCode || null,
        concussionWaiverAcknowledged: concussionWaiverAcknowledged || false,
        concussionWaiverDate: concussionWaiverAcknowledged ? new Date().toISOString() : null,
        clubAgreementAcknowledged: clubAgreementAcknowledged || false,
        clubAgreementDate: clubAgreementAcknowledged ? new Date().toISOString() : null,
        accountHolderId: id,
        packageSelected: packageId || null, // Optional now
        teamAssignmentStatus: "pending",
        hasRegistered: !packageId, // If no package, mark as registered immediately
        verified: true, // Child profiles are auto-verified through parent
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      // If no package selected, just return success with the new player
      if (!packageId) {
        return res.json({
          success: true,
          player: playerUser,
          message: "Player added successfully. You can enroll them in programs from the Payments section."
        });
      }
      
      // Get the selected program to check price (only if packageId provided)
      const program = await storage.getProgram(packageId);
      if (!program) {
        return res.status(404).json({ 
          success: false, 
          message: "Selected program not found" 
        });
      }
      
      // Determine the price to charge based on selected pricing option
      let priceToCharge = program.price || 0;
      let selectedPricingOption: any = null;
      let pricingOptionName = '';
      
      // Check if user selected a specific pricing option (bundle tier)
      if (selectedPricingOptionId && (program as any).pricingOptions && Array.isArray((program as any).pricingOptions)) {
        selectedPricingOption = (program as any).pricingOptions.find((opt: any) => opt.id === selectedPricingOptionId);
        if (selectedPricingOption && selectedPricingOption.price > 0) {
          priceToCharge = selectedPricingOption.price;
          pricingOptionName = selectedPricingOption.name || '';
        }
      }
      
      if (!priceToCharge || priceToCharge <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Selected program has no valid price" 
        });
      }
      
      // Create or retrieve Stripe customer using org-specific keys
      const playerOrgStripe = await getStripeForOrg(req.user.organizationId);
      if (!playerOrgStripe) {
        return res.status(500).json({ 
          success: false, 
          message: "Payment processing is not configured for this organization" 
        });
      }
      
      const stripeCustomerId = await getOrCreateStripeCustomer(playerOrgStripe, user);
      
      // Get origin for URLs
      const origin = `${req.protocol}://${req.get('host')}`;
      
      // Check if request is from iOS native app (needs auth token in redirect URL)
      const isIOSApp = req.headers['x-client-platform'] === 'ios';
      
      // Generate short-lived auth token for iOS Stripe redirects
      let iosAuthToken = '';
      if (isIOSApp) {
        iosAuthToken = jwt.sign(
          { 
            userId: user.id, 
            organizationId: user.organizationId, 
            role: user.role,
            purpose: 'stripe_success'
          },
          process.env.JWT_SECRET!,
          { expiresIn: '10m' } // Short-lived token
        );
      }
      
      // Determine if this is a bundle that converts to monthly
      const isConvertsToMonthly = selectedPricingOption?.convertsToMonthly && 
                                   selectedPricingOption?.monthlyPrice > 0 &&
                                   selectedPricingOption?.durationDays > 0;
      
      // Build success URL - include auth token for iOS to restore session after redirect
      const successUrl = isIOSApp 
        ? `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}&auth_token=${iosAuthToken}`
        : `${origin}/unified-account?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      
      let session: Stripe.Checkout.Session;
      
      if (isConvertsToMonthly) {
        // BUNDLE-TO-MONTHLY FLOW
        // Use subscription mode with the monthly price
        // Bundle payment added via add_invoice_items (only charged if checkout completes)
        // Trial period covers the bundle duration, then monthly billing begins
        
        const monthlyPriceId = selectedPricingOption.monthlyStripePriceId;
        const bundleDurationDays = selectedPricingOption.durationDays;
        
        // Calculate trial end date (bundle period)
        const trialEnd = Math.floor(Date.now() / 1000) + (bundleDurationDays * 24 * 60 * 60);
        
        // Build add_invoice_items array (items added to first invoice only if checkout completes)
        // This prevents orphaned charges if user abandons checkout
        const addInvoiceItems: Stripe.Checkout.SessionCreateParams.SubscriptionData.InvoiceItem[] = [];
        
        // Track subtotal for platform fee
        let bundleSubtotal = priceToCharge;
        
        // Add bundle payment as invoice item
        // Use product if available, otherwise use product_data
        if ((program as any).stripeProductId) {
          addInvoiceItems.push({
            price_data: {
              currency: 'usd',
              product: (program as any).stripeProductId,
              unit_amount: priceToCharge,
            },
            quantity: 1,
            description: `${program.name} - ${pricingOptionName} (Bundle Payment)`,
          });
        } else {
          addInvoiceItems.push({
            price_data: {
              currency: 'usd',
              product_data: { name: `${program.name} - ${pricingOptionName}` },
              unit_amount: priceToCharge,
            },
            quantity: 1,
            description: `${program.name} - ${pricingOptionName} (Bundle Payment)`,
          });
        }
        
        // Add any add-ons as invoice items
        if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0) {
          for (const addOnId of addOnIds) {
            const addOn = await storage.getProgram(addOnId);
            if (addOn && addOn.productCategory === 'goods' && addOn.price && addOn.price > 0) {
              bundleSubtotal += addOn.price;
              if ((addOn as any).stripeProductId) {
                addInvoiceItems.push({
                  price_data: {
                    currency: 'usd',
                    product: (addOn as any).stripeProductId,
                    unit_amount: addOn.price,
                  },
                  quantity: 1,
                  description: addOn.name,
                });
              } else {
                addInvoiceItems.push({
                  price_data: {
                    currency: 'usd',
                    product_data: { name: addOn.name },
                    unit_amount: addOn.price,
                  },
                  quantity: 1,
                  description: addOn.name,
                });
              }
            }
          }
        }
        
        // Add service fee to one-time bundle items
        const { lineItem: bundleFeeLineItem } = await getServiceFeeLineItem(bundleSubtotal);
        addInvoiceItems.push(bundleFeeLineItem);

        const subscriptionLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = monthlyPriceId
          ? [{ price: monthlyPriceId, quantity: 1 }]
          : [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${program.name} - Monthly`,
                  description: `Monthly subscription for ${firstName} ${lastName}`,
                },
                unit_amount: selectedPricingOption.monthlyPrice,
                recurring: { interval: 'month' },
              },
              quantity: 1,
            }];
        
        // Add service fee to monthly subscription
        const { lineItem: monthlyFeeLineItem, feeCents: monthlySubServiceFeeCents } = await getServiceFeeLineItem(selectedPricingOption.monthlyPrice || 0, { interval: 'month', interval_count: 1 });
        subscriptionLineItems.push(monthlyFeeLineItem);

        const addPlayerSubParams: any = {
          customer: stripeCustomerId,
          line_items: subscriptionLineItems,
          mode: 'subscription',
          subscription_data: {
            trial_end: trialEnd,
            add_invoice_items: addInvoiceItems,
            metadata: {
              type: 'add_player_subscription',
              playerId: playerUser.id,
              accountHolderId: id,
              packageId: packageId,
              bundlePricingOptionId: selectedPricingOptionId || '',
              bundleName: pricingOptionName || '',
            },
          },
          success_url: successUrl,
          cancel_url: `${origin}/add-player?step=5&payment=cancelled`,
          metadata: {
            type: 'add_player',
            playerId: playerUser.id,
            accountHolderId: id,
            packageId: packageId,
            selectedPricingOptionId: selectedPricingOptionId || '',
            pricingOptionName: pricingOptionName || '',
            convertsToMonthly: 'true',
            bundleDurationDays: String(bundleDurationDays),
            addOnIds: addOnIds ? JSON.stringify(addOnIds) : '',
          },
        };

        const connectResult4 = await applyConnectChargeParams(addPlayerSubParams, req.user.organizationId, 'subscription', monthlySubServiceFeeCents, selectedPricingOption.monthlyPrice || 0);
        verifyConnectRouting(addPlayerSubParams, 'subscription', req.user.organizationId, connectResult4, { applicationFeeAmount: monthlySubServiceFeeCents, checkoutType: 'add_player_subscription' });

        console.log(`[Connect] add_player_subscription: creating session for org ${req.user.organizationId}`, {
          subscription_data: addPlayerSubParams.subscription_data ?? null,
        });

        session = await playerOrgStripe.checkout.sessions.create(addPlayerSubParams);
        
        console.log(`Created subscription checkout for bundle-to-monthly: ${pricingOptionName} -> Monthly after ${bundleDurationDays} days`);
      } else {
        // STANDARD ONE-TIME PAYMENT FLOW
        // Build line items starting with the program
        const programLineItem: any = selectedPricingOption?.stripePriceId
          ? {
              price: selectedPricingOption.stripePriceId,
              quantity: 1,
            }
          : {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: pricingOptionName ? `${program.name} - ${pricingOptionName}` : program.name,
                  description: `Registration for ${firstName} ${lastName}`,
                },
                unit_amount: priceToCharge,
              },
              quantity: 1,
            };
        
        const lineItems: any[] = [programLineItem];
        let subtotal = priceToCharge;

        // Add any selected add-ons (validate they are goods products)
        if (addOnIds && Array.isArray(addOnIds) && addOnIds.length > 0) {
          for (const addOnId of addOnIds) {
            const addOn = await storage.getProgram(addOnId);
            if (addOn && addOn.productCategory === 'goods' && addOn.price && addOn.price > 0) {
              subtotal += addOn.price;
              lineItems.push({
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: addOn.name,
                    description: addOn.description || `Add-on for ${firstName} ${lastName}`,
                  },
                  unit_amount: addOn.price,
                },
                quantity: 1,
              });
            }
          }
        }
        
        // Add service fee
        const { lineItem: addPlayerFeeLineItem, feeCents: addPlayerServiceFeeCents } = await getServiceFeeLineItem(subtotal);
        lineItems.push(addPlayerFeeLineItem);

        const addPlayerOrgName = await getOrgDisplayName(req.user.organizationId);
        const addPlayerPayParams: any = {
          customer: stripeCustomerId,
          line_items: lineItems,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: `${origin}/add-player?step=5&payment=cancelled`,
          payment_intent_data: {
            statement_descriptor: addPlayerOrgName.substring(0, 22),
          },
          metadata: {
            type: 'add_player',
            playerId: playerUser.id,
            accountHolderId: id,
            packageId: packageId,
            selectedPricingOptionId: selectedPricingOptionId || '',
            pricingOptionName: pricingOptionName || '',
            addOnIds: addOnIds ? JSON.stringify(addOnIds) : '',
          },
        };

        const connectResult5 = await applyConnectChargeParams(addPlayerPayParams, req.user.organizationId, 'payment', addPlayerServiceFeeCents);
        verifyConnectRouting(addPlayerPayParams, 'payment', req.user.organizationId, connectResult5, { applicationFeeAmount: addPlayerServiceFeeCents, checkoutType: 'add_player_payment' });

        console.log(`[Connect] add_player_payment: creating session for org ${req.user.organizationId}`, {
          payment_intent_data: addPlayerPayParams.payment_intent_data ?? null,
        });

        session = await playerOrgStripe.checkout.sessions.create(addPlayerPayParams);
      }
      
      // Update player with checkout session ID
      await storage.updateUser(playerUser.id, {
        stripeCheckoutSessionId: session.id,
      });
      
      res.json({
        success: true,
        checkoutUrl: session.url,
        playerId: playerUser.id,
        message: "Player created. Please complete payment to finalize registration."
      });
    } catch (error: any) {
      console.error("Add player error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to add player" 
      });
    }
  });
  
  // Get child players for a user (for legacy migration claim flow)
  app.get('/api/users/:userId/children', requireAuth, async (req: any, res) => {
    try {
      const { id: requesterId, organizationId, role } = req.user;
      const { userId } = req.params;
      
      // Only allow parent role to access their own children - no admin bypass for security
      if (role !== 'parent' || userId !== requesterId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const children = allUsers.filter(u => 
        u.accountHolderId === requesterId || 
        u.linkedParentId === requesterId ||
        u.parentId === requesterId
      );
      
      // Return only minimal fields needed for selection
      res.json(children.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
      })));
    } catch (error: any) {
      console.error('Error fetching children:', error);
      res.status(500).json({ error: 'Failed to fetch children', message: error.message });
    }
  });
  
  // Simple create child player (for legacy migration claim flow)
  app.post('/api/users/create-child', requireAuth, async (req: any, res) => {
    try {
      const { id, organizationId, role } = req.user;
      
      if (role !== "parent" && role !== "admin") {
        return res.status(403).json({ 
          success: false, 
          message: "Only parent and admin accounts can add players" 
        });
      }
      
      const { firstName, lastName, dateOfBirth, gender } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false, 
          message: "First name and last name are required" 
        });
      }
      
      // Create child player without package selection
      const playerUser = await storage.createUser({
        organizationId,
        email: null as any,
        role: "player",
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        accountHolderId: id,
        hasRegistered: false,
        verified: true,
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      console.log(`✅ Created child player ${playerUser.id} for parent ${id}`);
      
      res.json({
        success: true,
        player: playerUser,
        message: "Player created successfully"
      });
    } catch (error: any) {
      console.error("Create child error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to create player" 
      });
    }
  });
  
  // Delete user account (self-deletion)
  app.post('/api/account/delete', requireAuth, async (req: any, res) => {
    try {
      const { id, organizationId } = req.user;
      const { confirmEmail } = req.body;
      
      // Get user info
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      // STRICTLY require email confirmation - not optional
      if (!confirmEmail) {
        return res.status(400).json({ 
          success: false, 
          message: "Email confirmation is required" 
        });
      }
      
      if (confirmEmail !== user.email) {
        return res.status(400).json({ 
          success: false, 
          message: "Email confirmation does not match your account email" 
        });
      }
      
      // Track Stripe cancellation issues
      const stripeErrors: string[] = [];
      
      // For parent accounts, delete all linked child players first
      if (user.role === "parent" || user.role === "admin") {
        const allUsers = await storage.getUsersByOrganization(organizationId);
        const linkedPlayers = allUsers.filter(u => u.accountHolderId === id);
        
        for (const player of linkedPlayers) {
          // Cancel Stripe subscriptions for child players if they have their own customer
          if (stripe && player.stripeCustomerId) {
            try {
              const subscriptions = await stripe.subscriptions.list({
                customer: player.stripeCustomerId,
              });
              
              for (const subscription of subscriptions.data) {
                if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
                  await stripe.subscriptions.cancel(subscription.id);
                }
              }
            } catch (stripeError: any) {
              console.error(`Error canceling Stripe subscriptions for player ${player.id}:`, stripeError);
              stripeErrors.push(`Player ${player.firstName}: ${stripeError.message}`);
            }
          }
          
          // Soft delete child players
          await storage.updateUser(player.id, {
            isActive: false,
            password: null,
            verificationToken: null,
            verificationExpiry: null,
            magicLinkToken: null,
            magicLinkExpiry: null,
            email: `deleted_${player.id}@deleted.local`,
          });
        }
      }
      
      // Cancel any active Stripe subscriptions for the main user
      if (stripe && user.stripeCustomerId) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
          });
          
          for (const subscription of subscriptions.data) {
            if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
              await stripe.subscriptions.cancel(subscription.id);
            }
          }
        } catch (stripeError: any) {
          console.error('Error canceling Stripe subscriptions:', stripeError);
          stripeErrors.push(`Main account: ${stripeError.message}`);
        }
      }
      
      // Soft delete the user account
      await storage.updateUser(id, {
        isActive: false,
        password: null,
        verificationToken: null,
        verificationExpiry: null,
        magicLinkToken: null,
        magicLinkExpiry: null,
        email: `deleted_${id}@deleted.local`,
      });
      
      // Clear session cookie and destroy session
      res.clearCookie('connect.sid', { path: '/' });
      
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
      }
      
      // Return success with any Stripe warnings
      res.json({ 
        success: true, 
        message: "Account deactivated successfully",
        warnings: stripeErrors.length > 0 ? stripeErrors : undefined
      });
    } catch (error: any) {
      console.error("Account deletion error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to delete account" 
      });
    }
  });
  
  app.get('/api/coach-profile/:id', requireAuth, async (req: any, res) => {
    try {
      const coachId = req.params.id;
      const coach = await storage.getUser(coachId);
      if (!coach || (coach.role !== 'coach' && coach.role !== 'head_coach' && coach.role !== 'assistant_coach')) {
        return res.status(404).json({ error: 'Coach not found' });
      }
      if (coach.organizationId !== req.user.organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const isHeadCoach = coach.role === 'head_coach' || coach.role === 'coach';

      const coachFields = ['bio', 'yearsExperience', 'previousTeams', 'playingExperience', 'philosophy', 'specialties', 'coachingLicense', 'coachingStyle'] as const;
      let source: any = coach;
      const hasCoachData = coachFields.some(f => !!(coach as any)[f] && (Array.isArray((coach as any)[f]) ? (coach as any)[f].length > 0 : true));

      if (!hasCoachData && (coach as any).accountHolderId) {
        const accountHolder = await storage.getUser((coach as any).accountHolderId);
        if (accountHolder) {
          const holderHasData = coachFields.some(f => !!(accountHolder as any)[f] && (Array.isArray((accountHolder as any)[f]) ? (accountHolder as any)[f].length > 0 : true));
          if (holderHasData) source = accountHolder;
        }
        if (source === coach) {
          const allOrgUsers = await storage.getUsersByOrganization(coach.organizationId);
          const siblings = allOrgUsers.filter(u => u.accountHolderId === (coach as any).accountHolderId && u.id !== coachId);
          for (const sib of siblings) {
            const sibHasData = coachFields.some(f => !!(sib as any)[f] && (Array.isArray((sib as any)[f]) ? (sib as any)[f].length > 0 : true));
            if (sibHasData) { source = sib; break; }
          }
        }
      }

      res.json({
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        profileImageUrl: coach.profileImageUrl || (source !== coach ? source.profileImageUrl : null),
        roleLabel: isHeadCoach ? 'HEAD COACH' : 'ASSISTANT COACH',
        bio: (source as any).bio,
        yearsExperience: (source as any).yearsExperience,
        previousTeams: (source as any).previousTeams,
        playingExperience: (source as any).playingExperience,
        philosophy: (source as any).philosophy,
        specialties: (source as any).specialties,
        coachingLicense: (source as any).coachingLicense,
        coachingStyle: (source as any).coachingStyle,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch coach profile' });
    }
  });

  // Get profile by ID
  app.get('/api/profile/:id', requireAuth, async (req: any, res) => {
    try {
      const profileId = req.params.id;
      const profile = await storage.getUser(profileId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
    }
  });

  // Upload profile photo
  app.post('/api/upload-profile-photo', requireAuth, upload.single('photo'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(uploadDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const requestingUserId = req.user.id;
      const targetUserId = req.query.profileId || req.body.profileId || requestingUserId;
      
      // Authorization: parent can update their children, or user can update self
      const requestingUser = await storage.getUser(requestingUserId);
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        // Delete uploaded file on authorization failure
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(404).json({ error: 'User not found' });
      }
      
      const isParentOfChild = requestingUser?.role === 'parent' && targetUser.accountHolderId === requestingUserId;
      const isUpdatingSelf = requestingUserId === targetUserId;
      const isAdmin = requestingUser?.role === 'admin';
      
      if (!isParentOfChild && !isUpdatingSelf && !isAdmin) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Not authorized to update this profile' });
      }
      
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      const fileBuffer = fs.readFileSync(uploadedFilePath!);
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: fileBuffer,
        headers: {
          'Content-Type': req.file.mimetype || 'image/jpeg',
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to object storage: ${uploadResponse.status}`);
      }
      
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: targetUserId,
        visibility: 'public',
      });
      
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      
      await storage.updateUser(targetUserId, { profileImageUrl: objectPath });
      
      res.json({ 
        success: true, 
        imageUrl: objectPath,
        message: 'Profile photo uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      // Delete uploaded file on any error
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ error: 'Failed to upload photo', message: error.message });
    }
  });

  // Upload award image
  app.post('/api/upload/award-image', requireAuth, uploadAwardImage.single('image'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(awardImageDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Only admins can upload award images - check all profiles with same email
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        // Delete uploaded file on authorization failure
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Only admins can upload award images' });
      }
      
      const filename = req.file.filename;
      const imageUrl = `/trophiesbadges/${filename}`;
      
      res.json({ 
        success: true, 
        imageUrl,
        message: 'Award image uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Award image upload error:', error);
      // Delete uploaded file on any error
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ error: 'Failed to upload award image', message: error.message });
    }
  });

  // Upload product image - uses Object Storage for persistence across deployments
  app.post('/api/upload/product-image', requireAuth, upload.single('image'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(uploadDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Only admins can upload product images - check all profiles with same email
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Only admins can upload product images' });
      }
      
      // Get a presigned URL for object storage upload
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Read the file and upload to object storage
      const fileBuffer = fs.readFileSync(uploadedFilePath!);
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: fileBuffer,
        headers: {
          'Content-Type': req.file.mimetype || 'image/jpeg',
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to object storage: ${uploadResponse.status}`);
      }
      
      // Set the ACL policy to make it public
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: req.user.id,
        visibility: 'public',
      });
      
      // Clean up local file
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      
      // Return the object path that can be served via /objects/* route
      res.json({ 
        success: true, 
        imageUrl: objectPath,
        message: 'Product image uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Product image upload error:', error);
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ error: 'Failed to upload product image', message: error.message });
    }
  });

  app.post('/api/upload/org-logo', requireAuth, upload.single('image'), async (req: any, res) => {
    const uploadedFilePath = req.file ? path.join(uploadDir, req.file.filename) : null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        return res.status(403).json({ error: 'Only admins can upload organization logos' });
      }
      
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      const fileBuffer = fs.readFileSync(uploadedFilePath!);
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: fileBuffer,
        headers: {
          'Content-Type': req.file.mimetype || 'image/png',
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to object storage: ${uploadResponse.status}`);
      }
      
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: req.user.id,
        visibility: 'public',
      });
      
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
      
      await storage.updateOrganization(req.user.organizationId, { logoUrl: objectPath });
      
      res.json({ 
        success: true, 
        imageUrl: objectPath,
        message: 'Organization logo uploaded successfully' 
      });
    } catch (error: any) {
      console.error('Org logo upload error:', error);
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
      }
      res.status(500).json({ error: 'Failed to upload organization logo', message: error.message });
    }
  });

  // Update player profile (for parents updating child profiles or players updating self)
  app.patch('/api/profile/:id', requireAuth, async (req: any, res) => {
    try {
      const profileId = req.params.id;
      const userId = req.user.id;
      
      // Get the user making the request and the profile being updated
      const requestingUser = await storage.getUser(userId);
      const profileToUpdate = await storage.getUser(profileId);
      
      if (!profileToUpdate) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      // Authorization: parent can update their children, or user can update self
      const isParentOfChild = requestingUser?.role === 'parent' && profileToUpdate.accountHolderId === userId;
      const isUpdatingSelf = userId === profileId;
      const isAdmin = requestingUser?.role === 'admin';
      
      if (!isParentOfChild && !isUpdatingSelf && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this profile' });
      }
      
      // Update the profile
      const updated = await storage.updateUser(profileId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });
  
  // =============================================
  // ORGANIZATION ROUTES
  // =============================================
  
  app.get('/api/organization', requireAuth, async (req: any, res) => {
    const org = await storage.getOrganization(req.user.organizationId);
    res.json(org);
  });
  
  app.patch('/api/organization', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    // Check all profiles with same email for admin access (multi-profile support)
    const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can update organization settings' });
    }
    
    const updated = await storage.updateOrganization(organizationId, req.body);
    res.json(updated);
  });

  app.get('/api/organization/stripe-settings', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can view Stripe settings' });
      }
      
      const org = await storage.getOrganization(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });
      
      res.json({
        stripeSecretKey: org.stripeSecretKey ? '••••' + org.stripeSecretKey.slice(-4) : null,
        stripePublishableKey: org.stripePublishableKey || null,
        stripeWebhookSecret: org.stripeWebhookSecret ? '••••' + org.stripeWebhookSecret.slice(-4) : null,
        hasStripeKeys: !!(org.stripeSecretKey && org.stripePublishableKey),
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch Stripe settings' });
    }
  });

  app.patch('/api/organization/stripe-settings', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can update Stripe settings' });
      }

      const { stripeSecretKey, stripePublishableKey, stripeWebhookSecret } = req.body;
      
      const updates: any = {};
      if (stripeSecretKey !== undefined) updates.stripeSecretKey = stripeSecretKey || null;
      if (stripePublishableKey !== undefined) updates.stripePublishableKey = stripePublishableKey || null;
      if (stripeWebhookSecret !== undefined) updates.stripeWebhookSecret = stripeWebhookSecret || null;
      
      await storage.updateOrganization(organizationId, updates);
      stripeOrgCache.delete(organizationId);
      
      res.json({ success: true, message: 'Stripe settings updated' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update Stripe settings' });
    }
  });

  // =============================================
  // Stripe Connect Routes
  // =============================================

  app.get('/api/stripe-connect/status', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can view Connect status' });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      let connectStatus = org.stripeConnectStatus || 'not_started';

      if (stripe && org.stripeConnectedId && connectStatus !== 'active') {
        try {
          const account = await stripe.accounts.retrieve(org.stripeConnectedId);
          if (account.charges_enabled && account.details_submitted) {
            connectStatus = 'active';
            await storage.updateOrganization(organizationId, {
              stripeConnectStatus: 'active',
            });
            console.log(`[Stripe Connect] Account ${org.stripeConnectedId} is now active for org ${organizationId}`);
          } else if (account.details_submitted) {
            connectStatus = 'pending_verification';
          }
        } catch (err: any) {
          console.error('[Stripe Connect] Error checking account status:', err.message);
        }
      }

      res.json({
        connectedAccountId: org.stripeConnectedId ? 'acct_••••' + org.stripeConnectedId.slice(-4) : null,
        status: connectStatus,
        isConnected: connectStatus === 'active',
        connectType: org.stripeConnectType ?? 'express',
      });
    } catch (error: any) {
      console.error('Error fetching Connect status:', error);
      res.status(500).json({ error: 'Failed to fetch Connect status' });
    }
  });

  app.post('/api/stripe-connect/onboard', requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Platform Stripe is not configured' });
    }

    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can set up Stripe Connect' });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      let accountId = org.stripeConnectedId;

      if (!accountId || org.stripeConnectType === 'standard') {
        if (org.stripeConnectType === 'standard') {
          accountId = null;
        }
        const account = await stripe.accounts.create({
          type: 'express',
          metadata: {
            organizationId: organizationId,
            organizationName: org.name || '',
          },
        });
        accountId = account.id;

        await storage.updateOrganization(organizationId, {
          stripeConnectedId: accountId,
          stripeConnectStatus: 'pending',
          stripeConnectType: 'express',
        });
        console.log(`✅ Created Stripe Connect Express account ${accountId} for org ${organizationId}`);
      } else {
        await storage.updateOrganization(organizationId, {
          stripeConnectType: 'express',
        });
      }

      const host = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${protocol}://${host}`;

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/admin?tab=settings&stripe=refresh`,
        return_url: `${baseUrl}/admin?tab=settings&stripe=connected`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error('Error creating Connect onboarding:', error);
      res.status(500).json({ error: 'Failed to create onboarding link', message: error.message });
    }
  });

  const OAUTH_STATE_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

  function createOAuthState(organizationId: string, userId: string): string {
    if (!OAUTH_STATE_SECRET) {
      throw new Error('OAuth state secret is not configured (JWT_SECRET or SESSION_SECRET required)');
    }
    const payload = `${organizationId}:${userId}:${Date.now()}`;
    const sig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  function verifyOAuthState(state: string): { organizationId: string; userId: string } | null {
    if (!OAUTH_STATE_SECRET) {
      console.error('[Stripe Connect Standard] Cannot verify OAuth state: secret not configured');
      return null;
    }
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length < 4) return null;
      const sig = parts.pop()!;
      const payload = parts.join(':');
      const expectedSig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
      if (sig.length !== expectedSig.length) return null;
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
      const [organizationId, userId, tsStr] = parts;
      if (Date.now() - parseInt(tsStr, 10) > OAUTH_STATE_TTL_MS) return null;
      return { organizationId, userId };
    } catch {
      return null;
    }
  }

  app.post('/api/stripe-connect/onboard-standard', requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Platform Stripe is not configured' });
    }

    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can set up Stripe Connect' });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      const stripeClientId = process.env.STRIPE_CLIENT_ID;
      if (!stripeClientId) {
        return res.status(500).json({ error: 'Stripe OAuth client ID is not configured' });
      }

      const host = req.headers.host || 'localhost:5000';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${protocol}://${host}`;

      const oauthState = createOAuthState(organizationId, req.user.id);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: stripeClientId,
        scope: 'read_write',
        redirect_uri: `${baseUrl}/api/stripe-connect/oauth/callback`,
        state: oauthState,
      });

      const oauthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
      res.json({ url: oauthUrl });
    } catch (error: any) {
      console.error('Error initiating Standard Connect OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate OAuth', message: error.message });
    }
  });

  app.get('/api/stripe-connect/oauth/callback', async (req: any, res) => {
    if (!stripe) {
      return res.status(500).send('Platform Stripe is not configured');
    }

    const host = req.headers.host || 'localhost:5000';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    try {
      const { code, state, error: oauthError, error_description } = req.query;

      if (oauthError) {
        console.error('[Stripe Connect Standard] OAuth error:', oauthError, error_description);
        return res.redirect(`${baseUrl}/admin?tab=settings&stripe=error`);
      }

      if (!code || !state) {
        console.error('[Stripe Connect Standard] Missing code or state in callback');
        return res.redirect(`${baseUrl}/admin?tab=settings&stripe=error`);
      }

      const stateData = verifyOAuthState(state as string);
      if (!stateData) {
        console.error('[Stripe Connect Standard] Invalid or expired OAuth state — possible CSRF/replay attack');
        return res.redirect(`${baseUrl}/admin?tab=settings&stripe=error`);
      }

      const { organizationId, userId } = stateData;

      const isAdminUser = await hasAdminProfile(userId, organizationId);
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && !isAdminUser)) {
        console.error(`[Stripe Connect Standard] Unauthorized callback for user ${userId} org ${organizationId}`);
        return res.redirect(`${baseUrl}/admin?tab=settings&stripe=error`);
      }

      const response = await stripe.oauth.token({
        grant_type: 'authorization_code',
        code: code as string,
      });

      const connectedAccountId = response.stripe_user_id;
      if (!connectedAccountId) {
        console.error('[Stripe Connect Standard] No stripe_user_id in OAuth response');
        return res.redirect(`${baseUrl}/admin?tab=settings&stripe=error`);
      }

      await storage.updateOrganization(organizationId, {
        stripeConnectedId: connectedAccountId,
        stripeConnectStatus: 'active',
        stripeConnectType: 'standard',
      });

      console.log(`[Stripe Connect Standard] Connected account ${connectedAccountId} for org ${organizationId} by user ${userId}`);
      return res.redirect(`${baseUrl}/admin?tab=settings&stripe=connected`);
    } catch (error: any) {
      console.error('[Stripe Connect Standard] OAuth callback error:', error);
      return res.redirect(`${baseUrl}/admin?tab=settings&stripe=error`);
    }
  });

  app.post('/api/stripe-connect/disconnect', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can disconnect Stripe Connect' });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      if (stripe && org.stripeConnectedId && org.stripeConnectType === 'standard') {
        try {
          await stripe.oauth.deauthorize({
            client_id: process.env.STRIPE_CLIENT_ID || '',
            stripe_user_id: org.stripeConnectedId,
          });
          console.log(`[Stripe Connect] Deauthorized Standard account ${org.stripeConnectedId} for org ${organizationId}`);
        } catch (err: any) {
          console.warn(`[Stripe Connect] Deauthorize failed (continuing disconnect): ${err.message}`);
        }
      }

      await storage.updateOrganization(organizationId, {
        stripeConnectedId: null,
        stripeConnectStatus: 'not_started',
        stripeConnectType: 'express',
      });

      console.log(`[Stripe Connect] Disconnected account for org ${organizationId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error disconnecting Stripe Connect:', error);
      res.status(500).json({ error: 'Failed to disconnect', message: error.message });
    }
  });

  app.get('/api/stripe-connect/login-link', requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Platform Stripe is not configured' });
    }

    try {
      const { organizationId, role } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can access this' });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org?.stripeConnectedId) {
        return res.status(400).json({ error: 'No connected Stripe account found' });
      }

      const loginLink = await stripe.accounts.createLoginLink(org.stripeConnectedId);
      res.json({ url: loginLink.url });
    } catch (error: any) {
      console.error('Error creating login link:', error);
      res.status(500).json({ error: 'Failed to create login link', message: error.message });
    }
  });

  app.get('/api/platform-settings/stripe', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.email !== 'jack@upyourperformance.org') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const results = await db.select().from(platformSettings);
      const settings: any = {};
      for (const row of results) {
        if (row.key === 'boxstat_stripe_secret_key') {
          settings.stripeSecretKey = row.value ? '••••' + row.value.slice(-4) : null;
        } else if (row.key === 'boxstat_stripe_publishable_key') {
          settings.stripePublishableKey = row.value || null;
        } else if (row.key === 'boxstat_stripe_webhook_secret') {
          settings.stripeWebhookSecret = row.value ? '••••' + row.value.slice(-4) : null;
        } else if (row.key === 'boxstat_technology_fee_percent') {
          settings.technologyFeePercent = row.value ? parseFloat(row.value) : null;
        }
      }
      settings.hasStripeKeys = !!(settings.stripeSecretKey && settings.stripePublishableKey);
      
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch platform settings' });
    }
  });

  app.patch('/api/platform-settings/stripe', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.email !== 'jack@upyourperformance.org') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { stripeSecretKey, stripePublishableKey, stripeWebhookSecret, technologyFeePercent } = req.body;
      
      const upsertSetting = async (key: string, value: string | null) => {
        const existing = await db.select().from(platformSettings)
          .where(eq(platformSettings.key, key));
        if (existing.length > 0) {
          await db.update(platformSettings)
            .set({ value, updatedAt: new Date().toISOString() })
            .where(eq(platformSettings.key, key));
        } else {
          await db.insert(platformSettings).values({
            key,
            value,
            updatedAt: new Date().toISOString(),
          });
        }
      };
      
      if (stripeSecretKey !== undefined) await upsertSetting('boxstat_stripe_secret_key', stripeSecretKey || null);
      if (stripePublishableKey !== undefined) await upsertSetting('boxstat_stripe_publishable_key', stripePublishableKey || null);
      if (stripeWebhookSecret !== undefined) await upsertSetting('boxstat_stripe_webhook_secret', stripeWebhookSecret || null);
      if (technologyFeePercent !== undefined) await upsertSetting('boxstat_technology_fee_percent', technologyFeePercent?.toString() || null);
      
      res.json({ success: true, message: 'Platform Stripe settings updated' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update platform settings' });
    }
  });

  // =============================================
  // USER MANAGEMENT ROUTES (Admin only)
  // =============================================
  
  app.get('/api/users', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const allUsers = await storage.getUsersByOrganization(organizationId);
    const allTeams = await storage.getTeamsByOrganization(organizationId);
    const allPrograms = await storage.getProgramsByOrganization(organizationId);
    
    // Create maps for quick lookup
    const teamMap = new Map(allTeams.map(t => [t.id, t]));
    const programMap = new Map(allPrograms.map(p => [p.id, p]));
    
    // Fetch active team memberships for all players
    const activeMemberships = await db.select({
      profileId: teamMemberships.profileId,
      teamId: teamMemberships.teamId,
    })
      .from(teamMemberships)
      .where(eq(teamMemberships.status, 'active'));
    
    // Group memberships by profileId
    const membershipsByUser = new Map<string, number[]>();
    for (const m of activeMemberships) {
      const existing = membershipsByUser.get(m.profileId) || [];
      existing.push(m.teamId);
      membershipsByUser.set(m.profileId, existing);
    }
    
    // Separate players from non-players
    const players = allUsers.filter((u: any) => u.role === 'player');
    const nonPlayers = allUsers.filter((u: any) => u.role !== 'player');
    
    // Fetch status tags for all players in a single bulk query
    const playerIds = players.map((p: any) => p.id);
    let statusTagsMap = new Map<string, {tag: string; remainingCredits?: number; lowBalance?: boolean}>();
    
    try {
      statusTagsMap = await storage.getPlayerStatusTagsBulk(playerIds);
    } catch (error) {
      console.error('Error fetching bulk status tags:', error);
    }
    
    // Enrich players with status tags and active team memberships
    const enrichedPlayers = players.map((player: any) => {
      const statusTag = statusTagsMap.get(player.id) || { tag: player.paymentStatus === 'pending' ? 'payment_due' : 'none' };
      const activeTeamIds = membershipsByUser.get(player.id) || [];
      const activeTeams = activeTeamIds.map(teamId => {
        const team = teamMap.get(teamId);
        if (!team) return null;
        const program = team.programId ? programMap.get(team.programId) : null;
        return {
          teamId: team.id,
          teamName: team.name,
          programId: team.programId,
          programName: program?.name || null,
        };
      }).filter(Boolean);
      
      return {
        ...player,
        statusTag: statusTag.tag || 'none',
        remainingCredits: statusTag.remainingCredits,
        lowBalance: statusTag.lowBalance,
        teamIds: activeTeamIds,
        activeTeams,
      };
    });
    
    // Add explicit null statusTag to non-players for consistent sorting
    const enrichedNonPlayers = nonPlayers.map((user: any) => ({
      ...user,
      statusTag: null,
      teamIds: [],
      activeTeams: [],
    }));
    
    // Combine and return all users
    res.json([...enrichedNonPlayers, ...enrichedPlayers]);
  });
  
  app.get('/api/users/role/:role', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const { role } = req.params;
    const users = await storage.getUsersByRole(organizationId, role);
    res.json(users);
  });
  
  app.post('/api/users', requireAuth, async (req: any, res) => {
    // Check all profiles with same email for admin access (multi-profile support)
    const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can create users' });
    }
    
    const userData = insertUserSchema.parse(req.body);
    // Normalize empty accountHolderId to undefined so standalone accounts aren't
    // accidentally linked (null vs empty string distinction matters for queries)
    if (!userData.accountHolderId) userData.accountHolderId = undefined;
    // Validate accountHolderId when provided: must be a parent-role account holder
    // in the same organization to prevent cross-tenant linking
    if (userData.accountHolderId) {
      const parentAccount = await storage.getUser(userData.accountHolderId);
      if (!parentAccount) {
        return res.status(400).json({ message: 'Parent account not found' });
      }
      if (parentAccount.organizationId !== userData.organizationId) {
        return res.status(400).json({ message: 'Parent account does not belong to this organization' });
      }
      if (parentAccount.role !== 'parent') {
        return res.status(400).json({ message: 'Linked account must be a parent-role user' });
      }
      if (parentAccount.accountHolderId) {
        return res.status(400).json({ message: 'Linked account must be a top-level account holder' });
      }
    }
    // Admin-created users are automatically verified so they can use magic link login
    userData.verified = true;

    // Generate invite token for account claim if user has an email
    if (userData.email) {
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const inviteExpiry = new Date();
      inviteExpiry.setDate(inviteExpiry.getDate() + 7);
      (userData as any).inviteToken = inviteToken;
      (userData as any).inviteTokenExpiry = inviteExpiry.toISOString();
      (userData as any).status = 'invited';
      (userData as any).hasRegistered = false;
    }

    const user = await storage.createUser(userData);

    // Send claim email in background (don't block response)
    if (userData.email && (userData as any).inviteToken) {
      const org = await storage.getOrganization(userData.organizationId || req.user.organizationId);
      emailService.sendAccountClaimEmail({
        email: userData.email,
        firstName: userData.firstName || '',
        inviteToken: (userData as any).inviteToken,
        organizationName: org?.name,
        role: userData.role || 'player',
      }).catch(err => console.error('Failed to send account claim email:', err));
    }

    res.json(user);
  });
  
  app.patch('/api/users/:id', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    const userId = req.params.id;
    const updateData = req.body;
    
    // Allow coaches to only update flag-related fields
    const flagOnlyUpdate = Object.keys(updateData).every(key => 
      ['flaggedForRosterChange', 'flagReason'].includes(key)
    );
    
    const isAdminUser = role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
    if (!isAdminUser && !(role === 'coach' && flagOnlyUpdate)) {
      return res.status(403).json({ message: 'Only admins can update users (coaches can only flag players)' });
    }
    
    if (updateData.role) {
      updateData.userType = updateData.role;
    } else {
      delete updateData.role;
      delete updateData.userType;
    }
    delete updateData.accountHolderId;
    delete updateData.organizationId;
    
    console.log(`[PATCH /api/users/${userId}] Update data:`, JSON.stringify(updateData, null, 2));
    
    // If updating a player's team(s), also update team_memberships and auto-enroll in programs
    // Handle both teamId (singular) and teamIds (array) for players
    if (updateData.teamId !== undefined || updateData.teamIds !== undefined) {
      const user = await storage.getUser(userId);
      if (user && (user.role === 'player' || user.role === 'parent')) {
        // Get the list of team IDs to process - prefer teamIds array, fall back to teamId
        let newTeamIds: number[] = [];
        if (updateData.teamIds && Array.isArray(updateData.teamIds)) {
          newTeamIds = updateData.teamIds.map((id: any) => parseInt(String(id), 10)).filter((id: number) => !isNaN(id));
        } else if (updateData.teamId) {
          const parsed = parseInt(String(updateData.teamId), 10);
          if (!isNaN(parsed)) newTeamIds = [parsed];
        }
        
        // Get current team memberships for this player
        const currentMemberships = await db.select({ teamId: teamMemberships.teamId })
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.profileId, userId),
              eq(teamMemberships.status, 'active')
            )
          );
        const currentTeamIds = currentMemberships.map(m => m.teamId);
        
        console.log(`[PATCH] Player ${userId}: current teams=${JSON.stringify(currentTeamIds)}, new teams=${JSON.stringify(newTeamIds)}`);
        
        // Mark removed teams as inactive and cancel associated enrollments
        for (const oldTeamId of currentTeamIds) {
          if (!newTeamIds.includes(oldTeamId)) {
            console.log(`[PATCH] Marking player ${userId} as inactive on team ${oldTeamId}`);
            await db.update(teamMemberships)
              .set({ status: 'inactive' })
              .where(
                and(
                  eq(teamMemberships.teamId, oldTeamId),
                  eq(teamMemberships.profileId, userId)
                )
              );
            
            // Cancel enrollment for this team's program if exists
            const removedTeam = await storage.getTeam(String(oldTeamId));
            if (removedTeam?.programId) {
              console.log(`[PATCH] Cancelling enrollment for player ${userId} in program ${removedTeam.programId}`);
              await db.update(productEnrollments)
                .set({ status: 'cancelled' })
                .where(
                  and(
                    eq(productEnrollments.profileId, userId),
                    eq(productEnrollments.programId, removedTeam.programId),
                    eq(productEnrollments.status, 'active')
                  )
                );
            }
          }
        }
        
        // Add to new teams and auto-enroll in programs
        for (const newTeamId of newTeamIds) {
          const team = await storage.getTeam(String(newTeamId));
          if (team) {
            console.log(`[PATCH] Adding player ${userId} to team ${newTeamId} (${team.name})`);
            try {
              await db.insert(teamMemberships)
                .values({
                  teamId: newTeamId,
                  profileId: userId,
                  role: 'player',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'player' },
                });
              
              // Also add parent to team_memberships so they receive team notifications
              // Use parentId (schema field) - the linked parent account for child players
              const parentId = user.parentId;
              if (parentId && parentId !== userId) {
                await db.insert(teamMemberships)
                  .values({
                    teamId: newTeamId,
                    profileId: parentId,
                    role: 'parent',
                    status: 'active',
                  })
                  .onConflictDoUpdate({
                    target: [teamMemberships.teamId, teamMemberships.profileId],
                    set: { status: 'active' },
                  });
                console.log(`[PATCH] Added parent ${parentId} to team ${newTeamId} memberships`);
              }
              
              // Auto-create product enrollment if team has a programId
              if (team.programId) {
                const accountHolderId = user.accountHolderId || userId;
                
                // Check if enrollment already exists to avoid duplicates
                const existingEnrollment = await db.select({ id: productEnrollments.id })
                  .from(productEnrollments)
                  .where(
                    and(
                      eq(productEnrollments.profileId, userId),
                      eq(productEnrollments.programId, team.programId),
                      eq(productEnrollments.status, 'active')
                    )
                  )
                  .limit(1);
                
                if (existingEnrollment.length === 0) {
                  console.log(`[PATCH] Team ${team.name} has programId ${team.programId}, auto-creating enrollment for player ${userId}`);
                  try {
                    await db.insert(productEnrollments)
                      .values({
                        organizationId: organizationId,
                        programId: team.programId,
                        accountHolderId: accountHolderId,
                        profileId: userId,
                        status: 'active',
                        source: 'admin',
                      });
                    console.log(`[PATCH] Created product enrollment for player ${userId} in program ${team.programId}`);
                  } catch (enrollErr) {
                    console.error(`[PATCH] Failed to create product enrollment:`, enrollErr);
                  }
                } else {
                  console.log(`[PATCH] Player ${userId} already enrolled in program ${team.programId}, skipping`);
                }
              }
            } catch (err) {
              console.error(`[PATCH] Failed to add player to team_memberships:`, err);
            }
          } else {
            console.warn(`[PATCH] Team ${newTeamId} does not exist, skipping`);
          }
        }
        
        // Update users.teamId to the first valid team (for backward compatibility)
        if (newTeamIds.length > 0) {
          updateData.teamId = newTeamIds[0];
        } else {
          updateData.teamId = null;
        }
        // Remove teamIds from updateData to avoid updating a non-existent column
        delete updateData.teamIds;
      }
    }
    
    // If updating a coach's teamIds, also update the team records and team_memberships
    if (updateData.teamIds !== undefined) {
      const user = await storage.getUser(userId);
      console.log(`[PATCH] User role: ${user?.role}, teamIds to set:`, updateData.teamIds);
      
      if (user && user.role === 'coach') {
        const newTeamIds = updateData.teamIds || [];
        const allTeams = await storage.getTeamsByOrganization(organizationId);
        console.log(`[PATCH] Found ${allTeams.length} teams in org, syncing coach ${userId} to teams:`, newTeamIds);
        
        // For each team in the organization, update coach assignments
        for (const team of allTeams) {
          const teamIdNum = team.id;
          const isInNewTeams = newTeamIds.includes(teamIdNum);
          const isCurrentlyHead = team.coachId === userId;
          const isCurrentlyAssistant = team.assistantCoachIds?.includes(userId) || false;
          
          console.log(`[PATCH] Team ${teamIdNum} "${team.name}": inNew=${isInNewTeams}, isHead=${isCurrentlyHead}, isAssistant=${isCurrentlyAssistant}`);
          
          if (isInNewTeams) {
            if (isCurrentlyHead) {
              // Coach is already head coach - ensure team_memberships has correct entry
              console.log(`[PATCH] Coach is head of team ${teamIdNum}, ensuring team_memberships entry`);
              await db.insert(teamMemberships)
                .values({
                  teamId: teamIdNum,
                  profileId: userId,
                  role: 'coach',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'coach' },
                });
            } else if (isCurrentlyAssistant) {
              // Coach is already assistant - ensure team_memberships has correct entry
              console.log(`[PATCH] Coach is assistant of team ${teamIdNum}, ensuring team_memberships entry`);
              await db.insert(teamMemberships)
                .values({
                  teamId: teamIdNum,
                  profileId: userId,
                  role: 'assistant_coach',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'assistant_coach' },
                });
            } else {
              // Add coach to this team as assistant (since head coach might already exist)
              const updatedAssistantIds = [...(team.assistantCoachIds || []), userId];
              console.log(`[PATCH] Adding coach to team ${teamIdNum} as assistant:`, updatedAssistantIds);
              await storage.updateTeam(String(teamIdNum), { assistantCoachIds: updatedAssistantIds });
              
              // Also add to team_memberships table
              await db.insert(teamMemberships)
                .values({
                  teamId: teamIdNum,
                  profileId: userId,
                  role: 'assistant_coach',
                  status: 'active',
                })
                .onConflictDoUpdate({
                  target: [teamMemberships.teamId, teamMemberships.profileId],
                  set: { status: 'active', role: 'assistant_coach' },
                });
            }
          } else if (!isInNewTeams && (isCurrentlyHead || isCurrentlyAssistant)) {
            // Remove coach from this team
            if (isCurrentlyHead) {
              console.log(`[PATCH] Removing coach as head from team ${teamIdNum}`);
              await storage.updateTeam(String(teamIdNum), { coachId: null });
            }
            if (isCurrentlyAssistant) {
              const updatedAssistantIds = (team.assistantCoachIds || []).filter((id: string) => id !== userId);
              console.log(`[PATCH] Removing coach as assistant from team ${teamIdNum}:`, updatedAssistantIds);
              await storage.updateTeam(String(teamIdNum), { assistantCoachIds: updatedAssistantIds });
            }
            
            // Mark membership as inactive instead of deleting
            await db.update(teamMemberships)
              .set({ status: 'inactive' })
              .where(
                and(
                  eq(teamMemberships.teamId, teamIdNum),
                  eq(teamMemberships.profileId, userId)
                )
              );
          }
        }
      }
    }
    
    // Handle program enrollment changes (enrollmentsToAdd and enrollmentsToRemove)
    if (updateData.enrollmentsToRemove && Array.isArray(updateData.enrollmentsToRemove)) {
      const user = await storage.getUser(userId);
      for (const enrollmentId of updateData.enrollmentsToRemove) {
        console.log(`[PATCH] Removing enrollment ${enrollmentId} for user ${userId}`);
        // Handle both numeric and string IDs
        const numericId = parseInt(String(enrollmentId).replace('new-', ''), 10);
        if (!isNaN(numericId) && !String(enrollmentId).startsWith('new-')) {
          await db.update(productEnrollments)
            .set({ status: 'cancelled' })
            .where(eq(productEnrollments.id, numericId));
        }
      }
    }
    
    if (updateData.enrollmentsToAdd && Array.isArray(updateData.enrollmentsToAdd)) {
      const user = await storage.getUser(userId);
      const accountHolderId = user?.accountHolderId || userId;
      
      for (const programId of updateData.enrollmentsToAdd) {
        console.log(`[PATCH] Adding enrollment for user ${userId} in program ${programId}`);
        
        // Check if enrollment already exists
        const existingEnrollment = await db.select({ id: productEnrollments.id })
          .from(productEnrollments)
          .where(
            and(
              eq(productEnrollments.profileId, userId),
              eq(productEnrollments.programId, programId),
              eq(productEnrollments.status, 'active')
            )
          )
          .limit(1);
        
        if (existingEnrollment.length === 0) {
          await db.insert(productEnrollments)
            .values({
              organizationId: organizationId,
              programId: programId,
              accountHolderId: accountHolderId,
              profileId: userId,
              status: 'active',
              source: 'admin',
            });
          console.log(`[PATCH] Created enrollment for user ${userId} in program ${programId}`);
        }
      }
    }
    
    if (updateData.enrollmentUpdates && typeof updateData.enrollmentUpdates === 'object') {
      for (const [enrollmentId, updates] of Object.entries(updateData.enrollmentUpdates)) {
        const numericId = parseInt(String(enrollmentId), 10);
        if (!isNaN(numericId)) {
          const updateFields: any = {};
          const u = updates as any;
          if (u.endDate !== undefined) updateFields.endDate = u.endDate ? new Date(u.endDate) : null;
          if (u.startDate !== undefined) updateFields.startDate = u.startDate ? new Date(u.startDate) : null;
          if (Object.keys(updateFields).length > 0) {
            updateFields.updatedAt = new Date();
            await db.update(productEnrollments)
              .set(updateFields)
              .where(
                and(
                  eq(productEnrollments.id, numericId),
                  eq(productEnrollments.profileId, userId)
                )
              );
            console.log(`[PATCH] Updated enrollment ${numericId} dates for user ${userId}:`, updateFields);
          }
        }
      }
    }

    if (updateData.newEnrollmentDates && typeof updateData.newEnrollmentDates === 'object') {
      for (const [programId, dates] of Object.entries(updateData.newEnrollmentDates)) {
        const d = dates as any;
        const updateFields: any = {};
        if (d.startDate) updateFields.startDate = new Date(d.startDate);
        if (d.endDate) updateFields.endDate = new Date(d.endDate);
        if (Object.keys(updateFields).length > 0) {
          updateFields.updatedAt = new Date();
          await db.update(productEnrollments)
            .set(updateFields)
            .where(
              and(
                eq(productEnrollments.profileId, userId),
                eq(productEnrollments.programId, programId),
                eq(productEnrollments.status, 'active')
              )
            );
        }
      }
    }

    delete updateData.enrollmentsToRemove;
    delete updateData.enrollmentsToAdd;
    delete updateData.enrollmentUpdates;
    delete updateData.newEnrollmentDates;
    delete updateData.pendingEnrollments;
    delete updateData.activeTeams;
    delete updateData.teamIds;
    delete updateData.statusTag;
    delete updateData.remainingCredits;
    delete updateData.lowBalance;
    
    // Sync userType with role to ensure consistency
    if (updateData.role) {
      updateData.userType = updateData.role;
    }
    
    const updated = await storage.updateUser(userId, updateData);
    console.log(`[PATCH] User ${userId} updated successfully`);
    res.json(updated);
  });
  
  // Add a new role profile for an existing account
  app.post('/api/users/:userId/add-role', requireAuth, async (req: any, res) => {
    const { role: adminRole, organizationId } = req.user;
    const isAdminUser = adminRole === 'admin' || await hasAdminProfile(req.user.id, organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can add roles' });
    }
    
    const { userId } = req.params;
    const { role: newRole, firstName, lastName } = req.body;
    
    // Validate role
    const validRoles = ['player', 'parent', 'coach', 'admin'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role. Must be one of: player, parent, coach, admin' });
    }
    
    try {
      // Get the target user (should be an account holder)
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Determine the account holder ID
      // If target user IS an account holder, use their ID
      // Otherwise, use their accountHolderId
      const accountHolderId = targetUser.accountHolderId || targetUser.id;
      const accountHolder = targetUser.accountHolderId 
        ? await storage.getUser(targetUser.accountHolderId) 
        : targetUser;
      
      if (!accountHolder) {
        return res.status(404).json({ message: 'Account holder not found' });
      }
      
      // Get all existing profiles for this account
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const existingProfiles = allUsers.filter((u: any) => 
        u.id === accountHolderId || u.accountHolderId === accountHolderId
      );
      
      // Check if this role already exists for this account
      // Player role allows multiple profiles (e.g. parent with multiple children)
      if (newRole !== 'player') {
        const roleExists = existingProfiles.some((u: any) => u.role === newRole);
        if (roleExists) {
          return res.status(400).json({ 
            message: `This account already has a ${newRole} profile` 
          });
        }
      }
      
      // Generate unique ID for new profile
      const newId = `${newRole}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Create the new role profile with the same email
      const newProfile = await storage.createUser({
        id: newId,
        organizationId: accountHolder.organizationId,
        email: accountHolder.email,
        role: newRole,
        userType: newRole, // Ensure userType is synced with role
        firstName: firstName || accountHolder.firstName,
        lastName: lastName || accountHolder.lastName,
        accountHolderId: accountHolderId,
        hasRegistered: true,
        verified: true,
        isActive: true,
        awards: [],
        totalPractices: 0,
        totalGames: 0,
        consecutiveCheckins: 0,
        videosCompleted: 0,
        yearsActive: 0,
      });
      
      res.json({ 
        success: true, 
        message: `${newRole} profile created successfully`,
        profile: newProfile 
      });
    } catch (error: any) {
      console.error('Error adding role:', error);
      res.status(500).json({ message: 'Failed to add role', error: error.message });
    }
  });
  
  app.delete('/api/users/:userId/remove-role', requireAuth, async (req: any, res) => {
    const { role: adminRole, organizationId } = req.user;
    const isAdminUser = adminRole === 'admin' || await hasAdminProfile(req.user.id, organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can remove roles' });
    }
    
    const { userId } = req.params;
    
    try {
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User profile not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot modify profiles outside your organization' });
      }
      
      if (!targetUser.accountHolderId) {
        return res.status(400).json({ message: 'Cannot remove the primary account profile. Use "Delete" to remove the entire account.' });
      }
      
      const accountHolderId = targetUser.accountHolderId;
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const accountProfiles = allUsers.filter((u: any) => 
        u.id === accountHolderId || u.accountHolderId === accountHolderId
      );
      
      if (!accountProfiles.some((u: any) => u.id === userId)) {
        return res.status(404).json({ message: 'Profile not found in this organization' });
      }
      
      if (accountProfiles.length <= 1) {
        return res.status(400).json({ message: 'Cannot remove the last profile on an account' });
      }
      
      await db.delete(teamMemberships).where(eq(teamMemberships.profileId, userId));
      
      await storage.deleteUser(userId);
      
      res.json({ 
        success: true, 
        message: `${targetUser.role} profile removed successfully` 
      });
    } catch (error: any) {
      console.error('Error removing role:', error);
      res.status(500).json({ message: 'Failed to remove role', error: error.message });
    }
  });

  // Update emergency contact and medical info for a player (parent can update their children)
  app.patch('/api/users/:id/emergency-medical', requireAuth, async (req: any, res) => {
    try {
      const { id: requesterId, role } = req.user;
      const targetUserId = req.params.id;
      const { emergencyContact, emergencyPhone, medicalInfo, allergies } = req.body;
      
      // Get the target user
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Authorization: parent can update their children, user can update themselves, admin can update anyone
      const isOwnProfile = requesterId === targetUserId;
      const isParentOfChild = targetUser.accountHolderId === requesterId;
      const isAdmin = role === 'admin';
      
      if (!isOwnProfile && !isParentOfChild && !isAdmin) {
        return res.status(403).json({ message: 'Not authorized to update this user' });
      }
      
      // Update only the emergency/medical fields
      const updated = await storage.updateUser(targetUserId, {
        emergencyContact,
        emergencyPhone,
        medicalInfo,
        allergies,
      });
      
      res.json({ success: true, user: updated });
    } catch (error: any) {
      console.error('Error updating emergency/medical info:', error);
      res.status(500).json({ message: 'Failed to update emergency/medical info', error: error.message });
    }
  });
  
  app.delete('/api/users/:id', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    // Check all profiles with same email for admin access (multi-profile support)
    const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }
    
    const userId = req.params.id;
    const profileOnly = req.query.profileOnly === 'true';
    
    // Get the user being deleted
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    try {
      const allUsers = await storage.getUsersByOrganization(user.organizationId);
      const deletedIds = new Set<string>();
      
      // Helper function to cascade delete related records for a user
      const cascadeDeleteRelatedRecords = async (userIdToDelete: string) => {
        console.log(`🗑️ Cascade deleting related records for user: ${userIdToDelete}`);
        
        await db.delete(productEnrollments).where(
          sql`${productEnrollments.profileId} = ${userIdToDelete} OR ${productEnrollments.accountHolderId} = ${userIdToDelete}`
        );
        
        await db.delete(waiverSignatures).where(
          sql`${waiverSignatures.profileId} = ${userIdToDelete} OR ${waiverSignatures.signedBy} = ${userIdToDelete}`
        );
        
        await db.update(userAwards)
          .set({ awardedBy: null })
          .where(eq(userAwards.awardedBy, userIdToDelete));
        
        await db.delete(teamMemberships).where(eq(teamMemberships.profileId, userIdToDelete));
        
        console.log(`✅ Cascade delete completed for user: ${userIdToDelete}`);
      };
      
      if (profileOnly) {
        // Profile-only deletion: only delete this single user record
        await cascadeDeleteRelatedRecords(userId);
        if (user.email) {
          await storage.deletePendingRegistration(user.email, user.organizationId);
        }
        await storage.deleteUser(userId);
        deletedIds.add(userId);
      } else {
        // Full account deletion: delete all profiles with the same email and their children
        const sameEmailUsers = user.email 
          ? allUsers.filter((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase())
          : [user];
        
        for (const emailUser of sameEmailUsers) {
          if (deletedIds.has(emailUser.id)) continue;
          
          const childUsers = allUsers.filter((u: any) => u.accountHolderId === emailUser.id);
          
          for (const child of childUsers) {
            if (deletedIds.has(child.id)) continue;
            await cascadeDeleteRelatedRecords(child.id);
            if (child.email) {
              await storage.deletePendingRegistration(child.email, child.organizationId);
            }
            await storage.deleteUser(child.id);
            deletedIds.add(child.id);
          }
          
          await cascadeDeleteRelatedRecords(emailUser.id);
          if (emailUser.email) {
            await storage.deletePendingRegistration(emailUser.email, emailUser.organizationId);
          }
          await storage.deleteUser(emailUser.id);
          deletedIds.add(emailUser.id);
        }
      }
      
      res.json({ success: true, deletedCount: deletedIds.size });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
  });
  
  // Get user's team information (returns single team for backward compatibility)
  app.get('/api/users/:userId/team', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { id: requesterId, organizationId: requesterOrgId, role: requesterRole } = req.user;
      
      // Get the user first to get their teamId
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Authorization: Allow user to view their own team, or users in same organization, or admins
      const isSameUser = requesterId === userId;
      const isSameOrg = requesterOrgId === user.organizationId;
      const isAdmin = requesterRole === 'admin';
      const isCoach = requesterRole === 'coach';
      
      if (!isSameUser && !isSameOrg && !isAdmin && !isCoach) {
        return res.status(403).json({ message: 'Unauthorized to view this user\'s team' });
      }
      
      let teamId = user.teamId;
      
      // If user.teamId is not set, check team_memberships table as fallback
      if (!teamId) {
        const activeMembership = await db.select({ teamId: teamMemberships.teamId })
          .from(teamMemberships)
          .where(
            and(
              eq(teamMemberships.profileId, userId),
              eq(teamMemberships.status, 'active')
            )
          )
          .limit(1);
        
        if (activeMembership.length > 0) {
          teamId = activeMembership[0].teamId;
        }
      }
      
      if (!teamId) {
        return res.json(null);
      }
      
      // Get the team details - ensure teamId is converted to string
      const teamIdString = String(teamId);
      const team = await storage.getTeam(teamIdString);
      
      if (!team) {
        return res.json(null);
      }
      
      // Return team info in the format expected by the frontend
      res.json({
        id: team.id,
        name: team.name,
        divisionId: team.divisionId, // Include divisionId for division lookup
        ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
        programType: team.programType || 'N/A',
        program: team.programType || 'N/A',
        coachId: team.coachId,
        color: '#d82428', // Default UYP red
      });
    } catch (error: any) {
      console.error('Error fetching user team:', error);
      res.status(500).json({ message: 'Failed to fetch user team' });
    }
  });
  
  // Get all teams for a user (supports multiple team assignments via team_memberships)
  app.get('/api/users/:userId/teams', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { id: requesterId, organizationId: requesterOrgId, role: requesterRole } = req.user;
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Authorization check
      const isSameUser = requesterId === userId;
      const isSameOrg = requesterOrgId === user.organizationId;
      const isAdmin = requesterRole === 'admin';
      const isCoach = requesterRole === 'coach';
      
      if (!isSameUser && !isSameOrg && !isAdmin && !isCoach) {
        return res.status(403).json({ message: 'Unauthorized to view this user\'s teams' });
      }
      
      // Query team_memberships table for this user's ACTIVE teams only
      const memberships = await db
        .select({
          teamId: teamMemberships.teamId,
          role: teamMemberships.role,
          status: teamMemberships.status,
        })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.profileId, userId),
            eq(teamMemberships.status, 'active')
          )
        );
      
      if (memberships.length === 0) {
        // Fallback to legacy teamId field for backwards compatibility
        if (user.teamId) {
          const team = await storage.getTeam(String(user.teamId));
          if (team) {
            return res.json([{
              id: team.id,
              name: team.name,
              ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
              program: team.programType || 'N/A',
              color: '#d82428',
            }]);
          }
        }
        return res.json([]);
      }
      
      // Fetch all teams from memberships
      const teams = await Promise.all(
        memberships.map(async (m) => {
          const team = await storage.getTeam(String(m.teamId));
          if (!team) return null;
          return {
            id: team.id,
            name: team.name,
            ageGroup: team.divisionId ? `Division ${team.divisionId}` : 'N/A',
            program: team.programType || 'N/A',
            color: '#d82428',
            membershipRole: m.role,
          };
        })
      );
      
      res.json(teams.filter(t => t !== null));
    } catch (error: any) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ message: 'Failed to fetch user teams' });
    }
  });
  
  // Get linked profiles for a user (other roles with same email)
  app.get('/api/users/:userId/linked-profiles', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { organizationId } = req.user;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Find all users with the same email in the same organization
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const linkedProfiles = allUsers.filter(u => 
        u.email === user.email && u.id !== userId
      ).map(u => ({
        id: u.id,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
      }));
      
      res.json(linkedProfiles);
    } catch (error: any) {
      console.error('Error fetching linked profiles:', error);
      res.status(500).json({ message: 'Failed to fetch linked profiles' });
    }
  });
  
  // =============================================
  // TEAM ROUTES
  // =============================================
  
  app.get('/api/teams', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const teams = await storage.getTeamsByOrganization(organizationId);
      const programs = await storage.getProgramsByOrganization(organizationId);
      
      // Create a map of program IDs to program names for quick lookup
      const programNameMap = new Map(programs.map(p => [p.id, p.name]));
      
      // Add roster count and program name to each team
      const teamsWithExtras = await Promise.all(
        teams.map(async (team) => {
          const roster = await storage.getUsersByTeam(String(team.id));
          return {
            ...team,
            rosterCount: roster.length,
            program: team.programId ? programNameMap.get(team.programId) || null : null,
          };
        })
      );
      
      res.json(teamsWithExtras);
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Failed to fetch teams' });
    }
  });
  
  app.get('/api/teams/coach/:coachId', requireAuth, async (req: any, res) => {
    const teams = await storage.getTeamsByCoach(req.params.coachId);
    res.json(teams);
  });
  
  app.post('/api/teams', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can create teams' });
      }
      
      const body = { ...req.body };
      if (body.coachId === null || body.coachId === '') delete body.coachId;
      const teamData = insertTeamSchema.parse(body);
      const team = await storage.createTeam(teamData);
      res.json(team);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        console.error('Error creating team (validation):', error.message);
        return res.status(400).json({ message: error.message });
      }
      console.error('Error creating team:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create team' });
    }
  });
  
  // Coordinator endpoint: Create team with player assignments and auto-enrollment
  app.post('/api/teams/with-assignments', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    // Check all profiles with same email for admin access (multi-profile support)
    const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can use this endpoint' });
    }
    
    const { teamData, playerIds = [] } = req.body;
    
    try {
      // 1. Create the team
      const parsedTeamData = insertTeamSchema.parse(teamData);
      const team = await storage.createTeam(parsedTeamData);
      
      if (!team?.id) {
        return res.status(500).json({ message: 'Failed to create team' });
      }
      
      const results = {
        team,
        assignments: { success: [] as string[], failed: [] as string[] },
        enrollments: { success: [] as string[], failed: [] as string[] },
      };
      
      // 2. Assign players and create enrollments
      for (const playerId of playerIds) {
        try {
          // Get the player to find their parent account
          const player = await storage.getUser(playerId);
          if (!player) {
            results.assignments.failed.push(playerId);
            continue;
          }
          
          // Create team membership
          await db.insert(teamMemberships)
            .values({
              teamId: team.id,
              profileId: playerId,
              role: 'player',
              status: 'active',
              jerseyNumber: player.jerseyNumber,
              position: player.position,
            })
            .onConflictDoUpdate({
              target: [teamMemberships.teamId, teamMemberships.profileId],
              set: { status: 'active', role: 'player' },
            });
          
          // Update legacy teamId field
          await storage.updateUser(playerId, { teamId: team.id } as any);
          results.assignments.success.push(playerId);
          
          // 3. Create product enrollment if team has a programId
          if (team.programId) {
            try {
              const accountHolderId = player.parentId || playerId;
              
              // Check if enrollment already exists
              const [existingEnrollment] = await db.select()
                .from(productEnrollments)
                .where(
                  and(
                    eq(productEnrollments.programId, team.programId),
                    eq(productEnrollments.profileId, playerId)
                  )
                );
              
              if (!existingEnrollment) {
                await db.insert(productEnrollments)
                  .values({
                    organizationId: organizationId || team.organizationId || 'default-org',
                    programId: team.programId,
                    accountHolderId: accountHolderId,
                    profileId: playerId,
                    status: 'active',
                    source: 'admin',
                    autoRenew: false,
                  });
                results.enrollments.success.push(playerId);
              } else {
                // Already enrolled, count as success
                results.enrollments.success.push(playerId);
              }
            } catch (enrollErr) {
              console.error(`Failed to enroll player ${playerId}:`, enrollErr);
              results.enrollments.failed.push(playerId);
            }
          }
        } catch (assignErr) {
          console.error(`Failed to assign player ${playerId}:`, assignErr);
          results.assignments.failed.push(playerId);
        }
      }
      
      res.json(results);
    } catch (error: any) {
      console.error('Error in team creation with assignments:', error);
      res.status(500).json({ message: error.message || 'Failed to create team with assignments' });
    }
  });
  
  app.patch('/api/teams/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can update teams' });
    }
    
    const teamId = parseInt(req.params.id);
    const updateData = req.body;
    
    // Get current team state to detect changes
    const currentTeam = await storage.getTeam(req.params.id);
    
    // Update the team in storage
    const updated = await storage.updateTeam(req.params.id, updateData);
    
    // Get the FINAL state of the team after update for syncing memberships
    const finalTeam = await storage.getTeam(req.params.id);
    const finalCoachId = finalTeam?.coachId;
    const finalAssistantIds = finalTeam?.assistantCoachIds || [];
    
    // Handle head coach changes - mark old coach as inactive if coach changed
    if (updateData.coachId !== undefined && currentTeam?.coachId && currentTeam.coachId !== finalCoachId) {
      await db.update(teamMemberships)
        .set({ status: 'inactive' })
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.profileId, currentTeam.coachId),
            eq(teamMemberships.role, 'coach')
          )
        );
    }
    
    // Always ensure head coach membership is active if there is a coachId
    // This runs on EVERY team update to ensure consistency
    if (finalCoachId) {
      try {
        await db.insert(teamMemberships)
          .values({
            teamId,
            profileId: finalCoachId,
            role: 'coach',
            status: 'active',
          })
          .onConflictDoUpdate({
            target: [teamMemberships.teamId, teamMemberships.profileId],
            set: { status: 'active', role: 'coach' },
          });
      } catch (e: any) {
        console.warn(`Skipping coach membership sync for ${finalCoachId}: ${e.message}`);
      }
    }
    
    // Handle assistant coach changes only when assistantCoachIds is in the payload
    if (updateData.assistantCoachIds !== undefined) {
      const oldAssistantIds = currentTeam?.assistantCoachIds || [];
      const newAssistantIdsSet = new Set(finalAssistantIds);
      
      // Upsert ALL assistants in the final array (reactivates previously inactive ones)
      for (const assistantId of finalAssistantIds) {
        try {
          await db.insert(teamMemberships)
            .values({
              teamId,
              profileId: assistantId,
              role: 'assistant_coach',
              status: 'active',
            })
            .onConflictDoUpdate({
              target: [teamMemberships.teamId, teamMemberships.profileId],
              set: { status: 'active', role: 'assistant_coach' },
            });
        } catch (e: any) {
          console.warn(`Skipping assistant coach membership sync for ${assistantId}: ${e.message}`);
        }
      }
      
      // Mark removed assistants as inactive
      for (const oldAssistantId of oldAssistantIds) {
        if (!newAssistantIdsSet.has(oldAssistantId)) {
          await db.update(teamMemberships)
            .set({ status: 'inactive' })
            .where(
              and(
                eq(teamMemberships.teamId, teamId),
                eq(teamMemberships.profileId, oldAssistantId),
                eq(teamMemberships.role, 'assistant_coach')
              )
            );
        }
      }
    }
    
    res.json(updated);
  });
  
  app.delete('/api/teams/:id', requireAuth, async (req: any, res) => {
    // Check all profiles with same email for admin access (multi-profile support)
    const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can delete teams' });
    }
    
    await storage.deleteTeam(req.params.id);
    res.json({ success: true });
  });

  // Get team roster (simple version for edit dialogs)
  app.get('/api/teams/:teamId/roster', requireAuth, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }

      // Get active team memberships for players
      const memberships = await db.select({
        playerId: teamMemberships.profileId,
        role: teamMemberships.role,
      })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.status, 'active'),
            eq(teamMemberships.role, 'player')
          )
        );

      res.json(memberships);
    } catch (error: any) {
      console.error('Error fetching team roster:', error);
      res.status(500).json({ message: 'Failed to fetch team roster' });
    }
  });

  app.get('/api/teams/:teamId/members-detail', requireAuth, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }

      const team = await storage.getTeam(String(teamId));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      const allMemberships = await db.select({
        playerId: teamMemberships.profileId,
        role: teamMemberships.role,
      })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.status, 'active')
          )
        );

      const players: any[] = [];
      const coaches: any[] = [];

      for (const m of allMemberships) {
        const profile = await storage.getUser(m.playerId);
        if (!profile) continue;
        const entry = {
          id: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profileImageUrl: profile.profileImageUrl,
          role: m.role,
          position: profile.position,
          jerseyNumber: profile.jerseyNumber,
        };
        if (m.role === 'coach' || m.role === 'assistant_coach' || m.role === 'head_coach') {
          coaches.push(entry);
        } else {
          players.push(entry);
        }
      }

      if (team.coachId && !coaches.find(c => c.id === team.coachId)) {
        const headCoach = await storage.getUser(team.coachId);
        if (headCoach) {
          coaches.unshift({
            id: headCoach.id,
            firstName: headCoach.firstName,
            lastName: headCoach.lastName,
            profileImageUrl: headCoach.profileImageUrl,
            role: 'coach',
            position: null,
            jerseyNumber: null,
          });
        }
      }

      res.json({ players, coaches, teamName: team.name });
    } catch (error: any) {
      console.error('Error fetching team members detail:', error);
      res.status(500).json({ message: 'Failed to fetch team members' });
    }
  });

  // Update team roster (bulk update)
  app.put('/api/teams/:teamId/roster', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can update rosters' });
      }

      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }

      const { playerIds } = req.body;
      if (!Array.isArray(playerIds)) {
        return res.status(400).json({ message: 'playerIds must be an array' });
      }

      // Get the team to verify it exists
      const team = await storage.getTeam(String(teamId));
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Get current player memberships
      const currentMemberships = await db.select({ playerId: teamMemberships.profileId })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamId),
            eq(teamMemberships.status, 'active'),
            eq(teamMemberships.role, 'player')
          )
        );
      const currentPlayerIds = currentMemberships.map(m => m.playerId);

      // Players to remove
      for (const oldPlayerId of currentPlayerIds) {
        if (!playerIds.includes(oldPlayerId)) {
          await db.update(teamMemberships)
            .set({ status: 'inactive' })
            .where(
              and(
                eq(teamMemberships.teamId, teamId),
                eq(teamMemberships.profileId, oldPlayerId),
                eq(teamMemberships.role, 'player')
              )
            );

          // Cancel enrollment if team has a program
          if (team.programId) {
            await db.update(productEnrollments)
              .set({ status: 'cancelled' })
              .where(
                and(
                  eq(productEnrollments.programId, team.programId),
                  eq(productEnrollments.profileId, oldPlayerId)
                )
              );
          }
        }
      }

      // Players to add
      for (const newPlayerId of playerIds) {
        if (!currentPlayerIds.includes(newPlayerId)) {
          const player = await storage.getUser(newPlayerId);
          if (!player) continue;

          // Add to team_memberships
          await db.insert(teamMemberships)
            .values({
              teamId,
              profileId: newPlayerId,
              role: 'player',
              status: 'active',
              jerseyNumber: player.jerseyNumber,
              position: player.position,
            })
            .onConflictDoUpdate({
              target: [teamMemberships.teamId, teamMemberships.profileId],
              set: { status: 'active', role: 'player' },
            });

          // Auto-enroll in program if team has one
          if (team.programId) {
            const accountHolderId = player.accountHolderId || player.id;
            const existingEnrollments = await storage.getEnrollmentsByAccountHolder(accountHolderId);
            const alreadyEnrolled = existingEnrollments.some(
              (e: any) => e.programId === team.programId && e.profileId === newPlayerId && e.status === 'active'
            );

            if (!alreadyEnrolled) {
              await storage.createEnrollment({
                organizationId: team.organizationId || organizationId,
                programId: team.programId,
                accountHolderId,
                profileId: newPlayerId,
                status: 'active',
              });
            }
          }
        }
      }

      // Invalidate caches by returning success
      res.json({ success: true, playerIds });
    } catch (error: any) {
      console.error('Error updating team roster:', error);
      res.status(500).json({ message: 'Failed to update team roster' });
    }
  });
  
  // Get team roster including Notion-synced players
  app.get('/api/teams/:teamId/roster-with-notion', requireAuth, async (req: any, res) => {
    try {
      const teamId = req.params.teamId;
      
      // Get the team from database
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Get users assigned to this team and filter to only players
      const allTeamUsers = await storage.getUsersByTeam(teamId);
      const appUsers = allTeamUsers.filter(u => u.role === 'player');
      
      // Get Notion players for this team if it has a notionSlug
      let notionPlayers: any[] = [];
      if (team.notionSlug) {
        const notionTeam = notionService.getTeam(team.notionSlug);
        notionPlayers = notionTeam?.roster || [];
      }
      
      // Build roster combining app users and notion players
      const roster: any[] = [];
      
      // Add app users
      for (const user of appUsers) {
        roster.push({
          appAccountId: user.id,
          notionId: null,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          jerseyNumber: user.jerseyNumber,
          position: user.position,
          grade: user.grade,
          hasAppAccount: true,
          flaggedForRosterChange: user.flaggedForRosterChange || false,
          flagReason: user.flagReason || null,
        });
      }
      
      // Add Notion players who don't have app accounts yet
      for (const notionPlayer of notionPlayers) {
        // Check if this Notion player already has an app account
        const existingUser = appUsers.find(u => 
          `${u.firstName} ${u.lastName}`.toLowerCase().trim() === notionPlayer.name.toLowerCase().trim()
        );
        
        if (!existingUser) {
          const nameParts = notionPlayer.name.split(' ');
          const firstName = nameParts.slice(0, -1).join(' ') || notionPlayer.name;
          const lastName = nameParts[nameParts.length - 1] || '';
          
          roster.push({
            appAccountId: null,
            notionId: notionPlayer.id,
            name: notionPlayer.name,
            firstName,
            lastName,
            profileImageUrl: notionPlayer.profileImageUrl,
            jerseyNumber: notionPlayer.jerseyNumber,
            position: notionPlayer.position,
            grade: notionPlayer.grade,
            hasAppAccount: false,
          });
        }
      }
      
      res.json(roster);
    } catch (error: any) {
      console.error('Error fetching team roster with notion:', error);
      res.status(500).json({ message: 'Failed to fetch team roster' });
    }
  });

  // Assign a player to a team (uses team_memberships table)
  app.post('/api/teams/:teamId/assign-player', requireAuth, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { playerId, role: memberRole = 'player' } = req.body;
      const { role } = req.user;

      const isAdminUser = role === 'admin' || role === 'coach' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only coaches and admins can assign players' });
      }

      if (!playerId) {
        return res.status(400).json({ message: 'playerId is required' });
      }

      // Validate teamId is a valid integer
      const teamIdNum = parseInt(teamId);
      if (!Number.isInteger(teamIdNum) || teamIdNum <= 0) {
        return res.status(400).json({ message: 'Invalid teamId' });
      }

      // Get the player
      const player = await storage.getUser(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Validate that the user being assigned has the "player" role
      if (player.role !== 'player') {
        return res.status(400).json({ message: 'Only users with the player role can be added to a team roster' });
      }

      // Get the team to verify it exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }

      // Add to team_memberships table (upsert to handle existing memberships)
      await db.insert(teamMemberships)
        .values({
          teamId: teamIdNum,
          profileId: playerId,
          role: memberRole,
          status: 'active',
          jerseyNumber: player.jerseyNumber,
          position: player.position,
        })
        .onConflictDoUpdate({
          target: [teamMemberships.teamId, teamMemberships.profileId],
          set: { status: 'active', role: memberRole },
        });
      
      // Also add parent to team_memberships so they receive team notifications
      // Use parentId (schema field) - the linked parent account for child players
      const parentId = player.parentId;
      if (parentId && parentId !== playerId) {
        await db.insert(teamMemberships)
          .values({
            teamId: teamIdNum,
            profileId: parentId,
            role: 'parent',
            status: 'active',
          })
          .onConflictDoUpdate({
            target: [teamMemberships.teamId, teamMemberships.profileId],
            set: { status: 'active' },
          });
        console.log(`Added parent ${parentId} to team ${teamId} memberships`);
      }
      
      // Auto-enroll player if team has a programId
      if (team.programId) {
        // Get the account holder ID
        const accountHolderId = player.accountHolderId || player.id;
        
        // Check if already enrolled in this program
        const existingEnrollments = await storage.getEnrollmentsByAccountHolder(accountHolderId);
        const alreadyEnrolled = existingEnrollments.some(
          (e: any) => e.programId === team.programId && e.profileId === playerId && e.status === 'active'
        );
        
        if (!alreadyEnrolled) {
          await storage.createEnrollment({
            organizationId: team.organizationId || organizationId,
            programId: team.programId,
            accountHolderId: accountHolderId,
            profileId: playerId,
            status: 'active',
            source: 'team_assignment',
          });
          console.log(`Auto-enrolled player ${playerId} in program ${team.programId}`);
        }
      }
      
      // Also update legacy teamId field for backwards compatibility
      const updatedPlayer = await storage.updateUser(playerId, { teamId: teamIdNum } as any);
      
      // Send notification about team assignment
      try {
        const teamName = team.name || 'a new team';
        const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Your player';
        
        // Notify parent about team assignment
        if (player.linkedParentId) {
          await pushNotifications.parentPlayerTeamAssignment(storage, player.linkedParentId, playerName, teamName);
        }
        
        // Notify coach about new player on team
        if (team.coachId) {
          await pushNotifications.coachNewPlayerAssigned(storage, team.coachId, playerName, teamName);
        }
      } catch (notifError: any) {
        console.error('⚠️ Team assignment notification failed (non-fatal):', notifError.message);
      }
      
      console.log(`Assigned player ${playerId} to team ${teamId} via team_memberships`);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: any) {
      console.error('Error assigning player to team:', error);
      res.status(500).json({ message: 'Failed to assign player to team' });
    }
  });

  // Remove a player from a team (uses team_memberships table)
  app.post('/api/teams/:teamId/remove-player', requireAuth, async (req: any, res) => {
    try {
      const { teamId } = req.params;
      const { playerId } = req.body;
      const { role, organizationId } = req.user;

      const isAdminUser = role === 'admin' || role === 'coach' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only coaches and admins can remove players' });
      }

      if (!playerId) {
        return res.status(400).json({ message: 'playerId is required' });
      }

      // Validate teamId is a valid integer
      const teamIdNum = parseInt(teamId);
      if (!Number.isInteger(teamIdNum) || teamIdNum <= 0) {
        return res.status(400).json({ message: 'Invalid teamId' });
      }

      // Get the player
      const player = await storage.getUser(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }

      // Security check: ensure player is in the same organization
      if (player.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot remove players from other organizations' });
      }

      // Get the team to check if it has a programId
      const team = await storage.getTeam(teamId);
      
      // Remove from team_memberships table
      await db.delete(teamMemberships)
        .where(
          and(
            eq(teamMemberships.teamId, teamIdNum),
            eq(teamMemberships.profileId, playerId)
          )
        );
      
      // Check if parent has other children on this team before removing parent membership
      if (player.parentId) {
        // Get all children of this parent in the same organization
        const parentChildren = await db.select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.parentId, player.parentId),
              eq(users.organizationId, organizationId)
            )
          );
        
        const childIds = parentChildren.map(c => c.id).filter(id => id !== playerId);
        
        // Check if any other children are still on this team (only if there are other children)
        let hasOtherChildrenOnTeam = false;
        if (childIds.length > 0) {
          const otherChildrenOnTeam = await db.select({ id: teamMemberships.id })
            .from(teamMemberships)
            .where(
              and(
                eq(teamMemberships.teamId, teamIdNum),
                inArray(teamMemberships.profileId, childIds)
              )
            )
            .limit(1);
          hasOtherChildrenOnTeam = otherChildrenOnTeam.length > 0;
        }
        
        // If no other children on this team, mark parent membership as inactive
        // Only update memberships with role='parent' to preserve any coach/admin roles
        if (!hasOtherChildrenOnTeam) {
          await db.update(teamMemberships)
            .set({ status: 'inactive' })
            .where(
              and(
                eq(teamMemberships.teamId, teamIdNum),
                eq(teamMemberships.profileId, player.parentId),
                eq(teamMemberships.role, 'parent')
              )
            );
          console.log(`Marked parent ${player.parentId} membership as inactive on team ${teamId}`);
        }
      }
      
      // Cancel enrollment for this player if team has a programId
      if (team && team.programId) {
        await db.update(productEnrollments)
          .set({ status: 'cancelled', autoRenew: false, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(productEnrollments.programId, team.programId),
              eq(productEnrollments.profileId, playerId)
            )
          );
        console.log(`Cancelled enrollment for player ${playerId} in program ${team.programId}`);
      }
      
      // Also clear legacy teamId field for backwards compatibility
      const updatedPlayer = await storage.updateUser(playerId, { teamId: null } as any);
      
      console.log(`Removed player ${playerId} from team ${teamId} via team_memberships`);
      res.json({ success: true, player: updatedPlayer });
    } catch (error: any) {
      console.error('Error removing player from team:', error);
      res.status(500).json({ message: 'Failed to remove player from team' });
    }
  });
  
  // Get teams for a specific coach
  app.get('/api/coaches/:coachId/teams', requireAuth, async (req: any, res) => {
    try {
      const teams = await storage.getTeamsByCoach(req.params.coachId);
      
      // Enrich teams with program information
      const enrichedTeams = await Promise.all(teams.map(async (team) => {
        let programName = null;
        if (team.programId) {
          const program = await storage.getProgram(String(team.programId));
          if (program) {
            programName = program.name;
          }
        }
        return {
          ...team,
          programName,
        };
      }));
      
      res.json(enrichedTeams);
    } catch (error: any) {
      console.error('Error fetching coach teams:', error);
      res.status(500).json({ message: 'Failed to fetch coach teams' });
    }
  });
  
  // Get all players from a coach's teams
  app.get('/api/coaches/:coachId/players', requireAuth, async (req: any, res) => {
    try {
      const teams = await storage.getTeamsByCoach(req.params.coachId);
      const allPlayers: any[] = [];
      
      for (const team of teams) {
        const players = await storage.getUsersByTeam(String(team.id));
        allPlayers.push(...players);
      }
      
      // Remove duplicates (if a player is on multiple teams)
      const uniquePlayers = allPlayers.filter((player, index, self) => 
        index === self.findIndex(p => p.id === player.id)
      );
      
      res.json(uniquePlayers);
    } catch (error: any) {
      console.error('Error fetching coach players:', error);
      res.status(500).json({ message: 'Failed to fetch coach players' });
    }
  });
  
  // Join a team (add coach to assistantCoachIds)
  app.post('/api/coaches/:coachId/teams/:teamId/join', requireAuth, async (req: any, res) => {
    try {
      const { coachId, teamId } = req.params;
      const { id: userId, role } = req.user;
      
      // Verify the user is a coach or admin
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ message: 'Only coaches can join teams' });
      }
      
      // Verify the coachId matches the authenticated user (unless admin)
      if (role !== 'admin' && userId !== coachId) {
        return res.status(403).json({ message: 'You can only join teams for yourself' });
      }
      
      // Get the team
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Check if coach is already assigned
      if (team.coachId === coachId) {
        return res.status(400).json({ message: 'You are already the head coach of this team' });
      }
      
      if (team.assistantCoachIds?.includes(coachId)) {
        return res.status(400).json({ message: 'You are already an assistant coach on this team' });
      }
      
      // Add coach to assistantCoachIds
      const updatedAssistantCoachIds = [...(team.assistantCoachIds || []), coachId];
      await storage.updateTeam(teamId, { assistantCoachIds: updatedAssistantCoachIds });
      
      res.json({ success: true, message: 'Successfully joined team' });
    } catch (error: any) {
      console.error('Error joining team:', error);
      res.status(500).json({ message: 'Failed to join team' });
    }
  });
  
  // =============================================
  // EVENT ROUTES
  // =============================================
  
  // Helper function to get team, division, and program IDs for a user based on their role
  async function getUserEventScope(userId: string, role: string, organizationId: string, childProfileId?: string) {
    let teamIds: (string | number)[] = [];
    let divisionIds: (string | number)[] = [];
    let programIds: (string | number)[] = [];
    let targetUserId = userId;
    
    if (childProfileId) {
      // Player Mode: Viewing as a specific child - only show that child's events
      const childProfile = await storage.getUser(childProfileId);
      if (childProfile) {
        // Check legacy teamId field
        if (childProfile.teamId) {
          teamIds.push(childProfile.teamId);
          const team = await storage.getTeam(String(childProfile.teamId));
          if (team?.programId) programIds.push(team.programId);
        }
        
        // Also check team_memberships table for active memberships
        const memberships = await storage.getTeamMembershipsByProfile(childProfileId);
        for (const membership of memberships) {
          if (membership.status === 'active' && membership.teamId) {
            teamIds.push(membership.teamId);
            const team = await storage.getTeam(String(membership.teamId));
            if (team?.programId) programIds.push(team.programId);
          }
        }
        
        if (childProfile.divisionId) divisionIds = [childProfile.divisionId];
        targetUserId = childProfileId;
        
        // Deduplicate
        teamIds = [...new Set(teamIds.map(String))];
        programIds = [...new Set(programIds.map(String))];
      }
    } else if (role === 'parent') {
      // Parent Mode: Show events from ALL children's teams + parent's own events
      const allUsersInOrg = await storage.getUsersByOrganization(organizationId);
      const childProfiles = allUsersInOrg.filter(u => u.parentId === userId || u.guardianId === userId);
      
      // Collect all team IDs, division IDs, and program IDs from children
      for (const child of childProfiles) {
        // Check legacy teamId field
        if (child.teamId) {
          teamIds.push(child.teamId);
          const team = await storage.getTeam(String(child.teamId));
          if (team?.programId) programIds.push(team.programId);
        }
        
        // Also check team_memberships table for active memberships
        const childMemberships = await storage.getTeamMembershipsByProfile(child.id);
        for (const membership of childMemberships) {
          if (membership.status === 'active' && membership.teamId) {
            teamIds.push(membership.teamId);
            const team = await storage.getTeam(String(membership.teamId));
            if (team?.programId) programIds.push(team.programId);
          }
        }
        
        if (child.divisionId) divisionIds.push(child.divisionId);
      }
      
      // Also include parent's own team/division if they have one
      const userProfile = await storage.getUser(userId);
      if (userProfile?.teamId) {
        teamIds.push(userProfile.teamId);
        const team = await storage.getTeam(String(userProfile.teamId));
        if (team?.programId) programIds.push(team.programId);
      }
      if (userProfile?.divisionId) divisionIds.push(userProfile.divisionId);
      
      // Deduplicate team, division, and program IDs
      teamIds = [...new Set(teamIds.map(String))];
      divisionIds = [...new Set(divisionIds.map(String))];
      programIds = [...new Set(programIds.map(String))];
    } else if (role === 'coach') {
      // Coach: Get all teams they're assigned to (as head coach or assistant)
      const coachTeams = await storage.getTeamsByCoach(userId);
      teamIds = coachTeams.map(team => team.id);
      
      // Also collect division IDs and program IDs from those teams
      for (const team of coachTeams) {
        if (team.divisionId) divisionIds.push(team.divisionId);
        if (team.programId) programIds.push(team.programId);
      }
      
      // Deduplicate
      teamIds = [...new Set(teamIds.map(String))];
      divisionIds = [...new Set(divisionIds.map(String))];
      programIds = [...new Set(programIds.map(String))];
    } else {
      // Regular user (player): Use their own team/division
      const userProfile = await storage.getUser(userId);
      if (userProfile) {
        // Check legacy teamId field
        if (userProfile.teamId) {
          teamIds.push(userProfile.teamId);
          const team = await storage.getTeam(String(userProfile.teamId));
          if (team?.programId) programIds.push(team.programId);
        }
        
        // Also check team_memberships table for active memberships
        const memberships = await storage.getTeamMembershipsByProfile(userId);
        for (const membership of memberships) {
          if (membership.status === 'active' && membership.teamId) {
            teamIds.push(membership.teamId);
            const team = await storage.getTeam(String(membership.teamId));
            if (team?.programId) programIds.push(team.programId);
          }
        }
        
        if (userProfile.divisionId) divisionIds = [userProfile.divisionId];
      }
      
      // Deduplicate
      teamIds = [...new Set(teamIds.map(String))];
      programIds = [...new Set(programIds.map(String))];
    }
    
    return { teamIds, divisionIds, programIds, targetUserId };
  }
  
  function hasTeamDivisionProgramScope(obj: any): boolean {
    return (obj.teams?.length > 0) || (obj.divisions?.length > 0) || (obj.programs?.length > 0);
  }

  function matchesTeamDivisionProgram(
    visibility: any,
    assignTo: any,
    teamIds: (string | number)[],
    divisionIds: (string | number)[],
    programIds: (string | number)[]
  ): boolean {
    for (const teamId of teamIds) {
      if (visibility.teams?.includes(String(teamId)) || assignTo.teams?.includes(String(teamId))) return true;
    }
    for (const divisionId of divisionIds) {
      if (visibility.divisions?.includes(String(divisionId)) || assignTo.divisions?.includes(String(divisionId))) return true;
    }
    for (const programId of programIds) {
      if (visibility.programs?.includes(String(programId)) || assignTo.programs?.includes(String(programId))) return true;
    }
    return false;
  }

  // Helper function to filter events based on visibility and assignment
  function filterEventsByScope(
    events: any[],
    role: string,
    teamIds: (string | number)[],
    divisionIds: (string | number)[],
    programIds: (string | number)[],
    targetUserId: string,
    debug = false,
    hasLinkedPlayers = false
  ) {
    return events.filter((event: any) => {
      const visibility = event.visibility || {};
      const assignTo = event.assignTo || {};
      
      if (debug) {
        console.log(`  📅 Event "${event.title}" (ID: ${event.id}) - assignTo: ${JSON.stringify(assignTo)}, visibility: ${JSON.stringify(visibility)}`);
      }

      // Check user-specific assignment first (most specific, always wins)
      const userIdStr = String(targetUserId);
      const assignToUsers = assignTo.users?.map((id: any) => String(id)) || [];
      const visibilityUsers = visibility.users?.map((id: any) => String(id)) || [];
      
      if (assignToUsers.includes(userIdStr) || visibilityUsers.includes(userIdStr)) {
        if (debug) console.log(`    ✅ MATCH: User ${targetUserId}`);
        return true;
      }

      const eventHasScope = hasTeamDivisionProgramScope(visibility) || hasTeamDivisionProgramScope(assignTo);
      const userMatchesScope = matchesTeamDivisionProgram(visibility, assignTo, teamIds, divisionIds, programIds);

      // Check role-based visibility
      const roleMatch = visibility.roles?.includes(role) || assignTo.roles?.includes(role);
      const parentPlayerMatch = role === 'parent' && hasLinkedPlayers && 
        (visibility.roles?.includes('player') || assignTo.roles?.includes('player'));

      if (roleMatch || parentPlayerMatch) {
        if (eventHasScope) {
          // Event targets a role AND specific teams/divisions/programs
          // User must also be on one of those teams/divisions/programs
          if (userMatchesScope) {
            if (debug) console.log(`    ✅ MATCH: Role + scope match`);
            return true;
          }
          if (debug) console.log(`    ❌ Role matches but user not in event's team/division/program scope`);
          return false;
        }
        // Role-only event (no team/division/program scoping) — show to everyone with that role
        if (debug) console.log(`    ✅ MATCH: Role "${role}" (no scope restriction)`);
        return true;
      }
      
      // Check team/division/program match without role targeting
      if (userMatchesScope) {
        if (debug) console.log(`    ✅ MATCH: Team/division/program scope`);
        return true;
      }
      
      // Event doesn't match any targeting criteria for this user
      if (debug) console.log(`    ❌ NO MATCH`);
      return false;
    });
  }
  
  app.get('/api/admin/crm-unread', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role, id: userId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const unreadMessages = await db.select({
        id: contactManagementMessages.id,
        senderName: contactManagementMessages.senderName,
        message: contactManagementMessages.message,
        createdAt: contactManagementMessages.createdAt,
      })
        .from(contactManagementMessages)
        .where(and(
          eq(contactManagementMessages.organizationId, organizationId),
          eq(contactManagementMessages.status, 'unread'),
          sql`${contactManagementMessages.isAdmin} IS NOT TRUE`
        ))
        .orderBy(desc(contactManagementMessages.createdAt));

      const unreadCount = unreadMessages.length;
      const latest = unreadMessages[0] || null;

      res.json({
        unreadCount,
        latestSenderName: latest?.senderName || null,
        latestMessage: latest?.message ? latest.message.substring(0, 80) : null,
        latestCreatedAt: latest?.createdAt || null,
      });
    } catch (error: any) {
      console.error('Error fetching CRM unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread messages' });
    }
  });

  app.get('/api/admin/pending-orders', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role, id: userId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const recentOrders = await db.select({
        paymentId: payments.id,
        userId: payments.userId,
        playerId: payments.playerId,
        amount: payments.amount,
        description: payments.description,
        programId: payments.programId,
        createdAt: payments.createdAt,
        status: payments.status,
        fulfillmentStatus: payments.fulfillmentStatus,
      })
        .from(payments)
        .innerJoin(products, eq(payments.programId, products.id))
        .where(and(
          eq(payments.organizationId, organizationId),
          eq(payments.status, 'completed'),
          eq(products.productCategory, 'goods'),
          gte(payments.createdAt, sql`NOW() - INTERVAL '90 days'`)
        ))
        .orderBy(desc(payments.createdAt))
        .limit(50);

      const enriched = await Promise.all(recentOrders.map(async (order: any) => {
        const buyer = await storage.getUser(order.playerId || order.userId);
        const product = await storage.getProgram(order.programId);
        return {
          ...order,
          buyerName: buyer ? `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() : 'Unknown',
          productName: product?.name || order.description || 'Store Item',
          shippingRequired: product?.shippingRequired ?? false,
        };
      }));

      const pendingOrders = enriched.filter(o => o.fulfillmentStatus !== 'delivered');

      res.json({
        pendingCount: pendingOrders.length,
        orders: enriched,
        latestBuyerName: pendingOrders[0]?.buyerName || null,
        latestDescription: pendingOrders[0]?.description || null,
        latestCreatedAt: pendingOrders[0]?.createdAt || null,
      });
    } catch (error: any) {
      console.error('Error fetching pending orders:', error);
      res.status(500).json({ error: 'Failed to fetch pending orders' });
    }
  });

  app.patch('/api/admin/payments/:id/fulfillment', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role, id: userId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const paymentId = parseInt(req.params.id);
      const { fulfillmentStatus } = req.body;
      if (!['pending', 'delivered'].includes(fulfillmentStatus)) {
        return res.status(400).json({ error: 'Invalid fulfillment status' });
      }
      await db.update(payments)
        .set({ fulfillmentStatus })
        .where(and(
          eq(payments.id, paymentId),
          eq(payments.organizationId, organizationId)
        ));
      res.json({ success: true, paymentId, fulfillmentStatus });
    } catch (error: any) {
      console.error('Error updating fulfillment status:', error);
      res.status(500).json({ error: 'Failed to update fulfillment status' });
    }
  });

  app.get('/api/admin/pending-assignments', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role, id: userId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const recentEnrollments = await db.select({
        enrollmentId: productEnrollments.id,
        profileId: productEnrollments.profileId,
        programId: productEnrollments.programId,
        status: productEnrollments.status,
        startDate: productEnrollments.startDate,
      })
        .from(productEnrollments)
        .innerJoin(products, eq(productEnrollments.programId, products.id))
        .innerJoin(users, eq(productEnrollments.profileId, users.id))
        .where(and(
          eq(productEnrollments.organizationId, organizationId),
          eq(productEnrollments.status, 'active'),
          sql`${products.productCategory} IS DISTINCT FROM 'goods'`,
          gte(productEnrollments.startDate, sql`NOW() - INTERVAL '30 days'`),
          sql`${users.role} IS DISTINCT FROM 'parent'`
        ))
        .orderBy(desc(productEnrollments.startDate));

      const unassigned = [];
      for (const enrollment of recentEnrollments) {
        if (!enrollment.profileId) continue;

        const program = await storage.getProgram(enrollment.programId);
        if (!program) continue;

        const programTeams = await db.select({ id: teams.id })
          .from(teams)
          .where(and(
            eq(teams.organizationId, organizationId),
            eq(teams.programId, enrollment.programId)
          ));

        if (programTeams.length === 0) {
          const player = await storage.getUser(enrollment.profileId);
          unassigned.push({
            ...enrollment,
            playerName: player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() : 'Unknown',
            programName: program.name || 'Unknown Program',
          });
          continue;
        }

        const programTeamIds = programTeams.map(t => t.id);
        const membershipInProgram = await db.select({ cnt: count() })
          .from(teamMemberships)
          .where(and(
            eq(teamMemberships.profileId, enrollment.profileId),
            eq(teamMemberships.status, 'active'),
            inArray(teamMemberships.teamId, programTeamIds)
          ));

        if (!membershipInProgram[0]?.cnt || membershipInProgram[0].cnt === 0) {
          const player = await storage.getUser(enrollment.profileId);
          unassigned.push({
            ...enrollment,
            playerName: player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() : 'Unknown',
            programName: program.name || 'Unknown Program',
          });
        }
      }

      res.json({
        pendingCount: unassigned.length,
        assignments: unassigned.slice(0, 5),
        latestPlayerName: unassigned[0]?.playerName || null,
        latestProgramName: unassigned[0]?.programName || null,
        latestStartDate: unassigned[0]?.startDate || null,
      });
    } catch (error: any) {
      console.error('Error fetching pending assignments:', error);
      res.status(500).json({ error: 'Failed to fetch pending assignments' });
    }
  });

  app.get('/api/admin/overview-stats', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role, id: userId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Use SQL aggregates instead of loading all user rows into JS
      const userCountsResult = await db.execute(
        sql`SELECT
              role,
              COUNT(*) as count
            FROM users
            WHERE organization_id = ${organizationId}
            GROUP BY role`
      );
      const userCountRows = (userCountsResult.rows || userCountsResult) as any[];
      const countByRole: Record<string, number> = {};
      for (const row of userCountRows) {
        countByRole[row.role] = parseInt(row.count) || 0;
      }

      // Fetch player IDs only (needed for enrollment cross-filter and awards)
      const orgPlayerRows = await db.select({ id: users.id }).from(users).where(
        and(eq(users.organizationId, organizationId), eq(users.role, 'player'))
      );
      const orgPlayerIds = orgPlayerRows.map(u => u.id);

      const activeEnrollments = await db.select().from(productEnrollments)
        .where(and(
          eq(productEnrollments.organizationId, organizationId),
          or(
            eq(productEnrollments.status, 'active'),
            eq(productEnrollments.status, 'pending')
          )
        ));
      const enrolledPlayerIds = new Set(
        activeEnrollments
          .map(e => e.profileId)
          .filter(Boolean)
      );

      const totalRsvpsResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM rsvp_responses r
            INNER JOIN events e ON e.id = r.event_id AND e.organization_id = ${organizationId}
            WHERE r.response = 'attending'`
      );

      const totalCheckinsResult = await db.execute(
        sql`SELECT COUNT(DISTINCT (a.event_id, a.user_id)) as count FROM attendances a
            INNER JOIN events e ON e.id = a.event_id AND e.organization_id = ${organizationId}`
      );

      const attendanceRateResult = await db.execute(
        sql`WITH past_events AS (
              SELECT id, team_id FROM events
              WHERE organization_id = ${organizationId} AND start_time < NOW()
            ),
            event_participants AS (
              SELECT pe.id as event_id, tm.profile_id as user_id
              FROM past_events pe
              INNER JOIN team_memberships tm ON tm.team_id = pe.team_id
              WHERE pe.team_id IS NOT NULL AND tm.status = 'active'
            ),
            event_checkins AS (
              SELECT DISTINCT a.event_id, a.user_id
              FROM attendances a
              INNER JOIN past_events pe ON pe.id = a.event_id
            )
            SELECT
              (SELECT COUNT(*) FROM event_participants) as total_invited,
              (SELECT COUNT(*) FROM event_checkins) as total_attended`
      );

      const orgPlayerIdsSet = new Set(orgPlayerIds);

      // Use SQL COUNT for awards instead of loading all rows
      const playerIdsArrayLiteral = `{${orgPlayerIds.map((id: string) => `"${id}"`).join(',')}}`;
      const awardsCountResult = await db.execute(
        orgPlayerIds.length > 0
          ? sql`SELECT
                  COUNT(*) as total,
                  COUNT(*) FILTER (WHERE awarded_at >= ${startOfMonth.toISOString()}) as this_month
                FROM user_awards
                WHERE user_id = ANY(${playerIdsArrayLiteral}::text[])`
          : sql`SELECT 0 as total, 0 as this_month`
      );
      const awardsCountRows = (awardsCountResult.rows || awardsCountResult) as any[];
      const awardsAllTime = parseInt(awardsCountRows[0]?.total) || 0;
      const awardsThisMonth = parseInt(awardsCountRows[0]?.this_month) || 0;

      const storeProducts = await db.select().from(products)
        .where(and(
          eq(products.organizationId, organizationId),
          eq(products.productCategory, 'goods')
        ));
      const activeStoreProducts = storeProducts.filter(p => p.isActive !== false);

      const storeProductIds = activeStoreProducts.map(p => p.id);
      let storeRevenue = 0;
      let storeOrderCount = 0;
      let pendingDispatchCount = 0;
      if (storeProductIds.length > 0) {
        const storePaymentsResult = await db.execute(
          sql`SELECT SUM(p.amount) as total_revenue, COUNT(*) as order_count
              FROM payments p
              INNER JOIN products pr ON p.program_id = pr.id AND pr.product_category = 'goods'
              WHERE p.organization_id = ${organizationId} AND p.status = 'completed'`
        );
        const storeRows = (storePaymentsResult.rows || storePaymentsResult) as any[];
        storeRevenue = parseInt(storeRows[0]?.total_revenue) || 0;
        storeOrderCount = parseInt(storeRows[0]?.order_count) || 0;

        const pendingResult = await db.execute(
          sql`SELECT COUNT(*) as count
              FROM payments p
              INNER JOIN products pr ON p.program_id = pr.id AND pr.product_category = 'goods'
              WHERE p.organization_id = ${organizationId} AND p.status = 'completed'
              AND (p.fulfillment_status IS NULL OR p.fulfillment_status = 'pending')`
        );
        const pendingRows = (pendingResult.rows || pendingResult) as any[];
        pendingDispatchCount = parseInt(pendingRows[0]?.count) || 0;
      }

      let lowStockCount = 0;
      let outOfStockCount = 0;
      const storeProductSummaries = activeStoreProducts.map(p => {
        const sizeStock = (p.sizeStock || {}) as Record<string, number>;
        const sizes = p.inventorySizes || [];
        const totalStock = p.inventoryCount ?? Object.values(sizeStock).reduce((sum, v) => sum + (v || 0), 0);
        let stockStatus: 'in_stock' | 'low' | 'out' = 'in_stock';
        if (totalStock <= 0) { stockStatus = 'out'; outOfStockCount++; }
        else if (totalStock <= 5) { stockStatus = 'low'; lowStockCount++; }
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          inventorySizes: sizes,
          sizeStock,
          totalStock,
          stockStatus,
          shippingRequired: p.shippingRequired ?? false,
          isActive: p.isActive !== false,
          coverImageUrl: p.coverImageUrl,
        };
      });

      // Move all revenue aggregation to SQL — single query handles total, monthly, yearly, and trend buckets
      const revenueSummaryResult = await db.execute(
        sql`SELECT
              COALESCE(SUM(amount), 0) as revenue_total,
              COALESCE(SUM(amount) FILTER (WHERE COALESCE(paid_at, created_at) >= ${startOfMonth.toISOString()}), 0) as revenue_this_month,
              COALESCE(SUM(amount) FILTER (WHERE COALESCE(paid_at, created_at) >= ${startOfYear.toISOString()}), 0) as revenue_this_year
            FROM payments
            WHERE organization_id = ${organizationId} AND status = 'completed'`
      );
      const revSummaryRows = (revenueSummaryResult.rows || revenueSummaryResult) as any[];
      const revenueTotal = parseInt(revSummaryRows[0]?.revenue_total) || 0;
      const revenueThisMonth = parseInt(revSummaryRows[0]?.revenue_this_month) || 0;
      const revenueThisYear = parseInt(revSummaryRows[0]?.revenue_this_year) || 0;

      // Build the 6-month trend using SQL GROUP BY
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const monthlyTrendResult = await db.execute(
        sql`SELECT
              TO_CHAR(DATE_TRUNC('month', COALESCE(paid_at, created_at)), 'YYYY-MM') as month_key,
              COALESCE(SUM(amount), 0) as amount
            FROM payments
            WHERE organization_id = ${organizationId}
              AND status = 'completed'
              AND COALESCE(paid_at, created_at) >= ${sixMonthsAgo.toISOString()}
            GROUP BY month_key
            ORDER BY month_key ASC`
      );
      // Build ordered 6-month bucket map (fill missing months with 0)
      const monthlyRevenue: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyRevenue[key] = 0;
      }
      for (const row of (monthlyTrendResult.rows || monthlyTrendResult) as any[]) {
        if (row.month_key && monthlyRevenue[row.month_key] !== undefined) {
          monthlyRevenue[row.month_key] = parseInt(row.amount) || 0;
        }
      }

      const rsvpRows = (totalRsvpsResult.rows || totalRsvpsResult) as any[];
      const checkinRows = (totalCheckinsResult.rows || totalCheckinsResult) as any[];
      const attendanceRows = (attendanceRateResult.rows || attendanceRateResult) as any[];

      const enrolledPlayerCount = [...enrolledPlayerIds].filter(id => orgPlayerIdsSet.has(id as string)).length;
      const totalPlayers = orgPlayerIds.length;
      const notEnrolledPlayers = totalPlayers - enrolledPlayerCount;

      const totalInvited = parseInt(attendanceRows[0]?.total_invited) || 0;
      const totalAttended = parseInt(attendanceRows[0]?.total_attended) || 0;

      const revenueByMonth = Object.entries(monthlyRevenue).map(([month, amount]) => ({
        month,
        label: new Date(month + '-01').toLocaleString('default', { month: 'short' }),
        amount,
      }));

      res.json({
        enrolledPlayers: enrolledPlayerCount,
        notEnrolledPlayers: notEnrolledPlayers,
        totalPlayers,
        totalAdmins: countByRole['admin'] || 0,
        totalCoaches: countByRole['coach'] || 0,
        totalParents: countByRole['parent'] || 0,
        revenueThisMonth,
        revenueThisYear,
        revenueTotal,
        revenueByMonth,
        totalRsvps: parseInt(rsvpRows[0]?.count) || 0,
        totalCheckins: parseInt(checkinRows[0]?.count) || 0,
        attendanceInvited: totalInvited,
        attendanceActual: totalAttended,
        awardsThisMonth,
        awardsAllTime,
        store: {
          totalProducts: activeStoreProducts.length,
          storeRevenue,
          storeOrderCount,
          pendingDispatchCount,
          lowStockCount,
          outOfStockCount,
          products: storeProductSummaries,
        },
      });
    } catch (error: any) {
      console.error('Error fetching overview stats:', error);
      res.status(500).json({ error: "Failed to fetch overview stats" });
    }
  });

  app.get('/api/admin/alerts', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role, id: userId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const alerts: any[] = [];

      // 1. Low credit balance (active enrollments with credits <= 2)
      const allEnrollments = await storage.getProductEnrollmentsByOrganization(organizationId);
      const lowCreditEnrollments = allEnrollments.filter(
        (e: any) => e.status === 'active' && e.totalCredits != null && e.remainingCredits != null && e.remainingCredits <= 2
      );
      if (lowCreditEnrollments.length > 0) {
        const details = [];
        for (const enrollment of lowCreditEnrollments) {
          const profile = enrollment.profileId ? await storage.getUser(enrollment.profileId) : null;
          const program = await storage.getProgram(enrollment.programId);
          details.push({
            enrollmentId: enrollment.id,
            profileName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Unknown',
            programName: program?.name || 'Unknown Program',
            remainingCredits: enrollment.remainingCredits,
            totalCredits: enrollment.totalCredits,
          });
        }
        alerts.push({
          type: 'low_credits',
          count: lowCreditEnrollments.length,
          message: `${lowCreditEnrollments.length} player${lowCreditEnrollments.length > 1 ? 's' : ''} with low credit balance`,
          details,
        });
      }

      // 2. Payment overdue (users with paymentStatus = 'pending')
      const orgUsers = await storage.getUsersByOrganization(organizationId);
      const overdueUsers = orgUsers.filter((u: any) => u.paymentStatus === 'pending');
      if (overdueUsers.length > 0) {
        alerts.push({
          type: 'payment_overdue',
          count: overdueUsers.length,
          message: `${overdueUsers.length} user${overdueUsers.length > 1 ? 's' : ''} with payment overdue`,
          details: overdueUsers.map((u: any) => ({
            userId: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            email: u.email,
          })),
        });
      }

      // 3. Pending schedule requests (events with scheduleRequestSource + status pending)
      const orgEvents = await storage.getEventsByOrganization(organizationId);
      const pendingRequests = orgEvents.filter(
        (e: any) => e.scheduleRequestSource && e.status === 'pending'
      );
      if (pendingRequests.length > 0) {
        const details = [];
        for (const event of pendingRequests) {
          const userIds = event.assignTo?.users || [];
          const names: string[] = [];
          for (const uid of userIds) {
            const u = await storage.getUser(String(uid));
            if (u) names.push(`${u.firstName || ''} ${u.lastName || ''}`.trim());
          }
          details.push({
            eventId: event.id,
            title: event.title,
            requestedFor: names.join(', ') || 'Unknown',
            startTime: event.startTime,
          });
        }
        alerts.push({
          type: 'pending_requests',
          count: pendingRequests.length,
          message: `${pendingRequests.length} session request${pendingRequests.length > 1 ? 's' : ''} awaiting confirmation`,
          details,
        });
      }

      // 4. Upcoming events missing location (next 7 days, active, no location/facility/meetingLink)
      const now = new Date();
      const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const missingLocationEvents = orgEvents.filter((e: any) => {
        if (e.status !== 'active' || !e.isActive) return false;
        const start = new Date(e.startTime);
        if (start <= now || start > sevenDaysOut) return false;
        const hasLocation = e.location && e.location.trim().length > 0;
        const hasFacility = !!e.facilityId;
        const hasMeetingLink = e.meetingLink && e.meetingLink.trim().length > 0;
        return !hasLocation && !hasFacility && !hasMeetingLink;
      });
      if (missingLocationEvents.length > 0) {
        alerts.push({
          type: 'missing_location',
          count: missingLocationEvents.length,
          message: `${missingLocationEvents.length} upcoming event${missingLocationEvents.length > 1 ? 's' : ''} need${missingLocationEvents.length === 1 ? 's' : ''} a location assigned`,
          details: missingLocationEvents.slice(0, 10).map((e: any) => ({
            eventId: e.id,
            title: e.title,
            startTime: e.startTime,
            eventType: e.eventType,
          })),
        });
      }

      res.json(alerts);
    } catch (error: any) {
      console.error('Error fetching admin alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts', error: error.message });
    }
  });

  async function enrichEventsWithFacility(events: any[]): Promise<any[]> {
    const facilityIds = [...new Set(events.filter(e => e.facilityId).map(e => e.facilityId))];
    if (facilityIds.length === 0) return events;
    const facilityMap = new Map<number, any>();
    for (const fId of facilityIds) {
      try {
        const fac = await storage.getFacility(fId);
        if (fac) facilityMap.set(fId, fac);
      } catch {}
    }
    return events.map(e => {
      if (e.facilityId && facilityMap.has(e.facilityId)) {
        const fac = facilityMap.get(e.facilityId)!;
        return { ...e, facilityName: fac.name };
      }
      return e;
    });
  }

  app.get('/api/events', requireAuth, async (req: any, res) => {
    const { organizationId, id: userId, role } = req.user;
    const { childProfileId, context } = req.query;
    const allEvents = await storage.getEventsByOrganization(organizationId);
    
    console.log('🔍 EVENT FILTERING DEBUG - Start');
    console.log('  userId:', userId);
    console.log('  role:', role);
    console.log('  childProfileId:', childProfileId);
    console.log('  context:', context);
    
    // Admins see all events ONLY when on the admin dashboard, NOT the parent/unified account page
    // If context=parent is passed, aggregate events for linked players instead
    if (role === 'admin' && !childProfileId && context !== 'parent') {
      console.log('  Admin viewing admin dashboard - showing all events');
      return res.json(await enrichEventsWithFacility(allEvents));
    }
    
    if (role !== 'admin' && !childProfileId && context !== 'parent') {
      const isAdmin = await hasAdminProfile(userId, organizationId);
      if (isAdmin) {
        console.log('  Parent role with admin profile viewing admin dashboard - showing all events');
        return res.json(await enrichEventsWithFacility(allEvents));
      }
    }
    
    // For admins in parent context (unified account page), aggregate events for all linked players
    if (role === 'admin' && !childProfileId && context === 'parent') {
      console.log('  Admin in parent context - aggregating events for linked players');
      
      // Get all linked players for this admin
      const linkedPlayers = await storage.getPlayersByParent(userId);
      
      if (linkedPlayers.length === 0) {
        console.log('  No linked players found - returning empty');
        return res.json([]);
      }
      
      // Aggregate events from all linked players
      const aggregatedEventIds = new Set<string>();
      const aggregatedEvents: typeof allEvents = [];
      
      for (const player of linkedPlayers) {
        // Get event scope for each player
        const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
          userId,
          'parent', // Use parent logic for each child
          organizationId,
          player.id
        );
        
        console.log(`  Child ${player.id} scope - teams: [${teamIds}], programs: [${programIds}]`);
        
        // Filter events for this player
        const playerEvents = filterEventsByScope(allEvents, 'parent', teamIds, divisionIds, programIds, targetUserId, false, true);
        
        // Add to aggregated list (dedupe by ID)
        for (const event of playerEvents) {
          const eventId = String(event.id);
          if (!aggregatedEventIds.has(eventId)) {
            aggregatedEventIds.add(eventId);
            aggregatedEvents.push(event);
          }
        }
      }
      
      console.log(`  Aggregated ${aggregatedEvents.length} unique events for ${linkedPlayers.length} players`);
      console.log('🔍 EVENT FILTERING DEBUG - End\n');
      return res.json(await enrichEventsWithFacility(aggregatedEvents));
    }
    
    // Verify user exists to prevent data leaks
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.json([]);
    }
    
    // Get user's event scope (teams, divisions, programs, target user ID)
    const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId,
      childProfileId as string | undefined
    );
    
    console.log('  teamIds collected:', teamIds);
    console.log('  divisionIds collected:', divisionIds);
    console.log('  programIds collected:', programIds);
    console.log('  targetUserId:', targetUserId);
    console.log('  Total events to filter:', allEvents.length);
    
    // For parents, check if they have linked players (to show player-targeted events)
    // Check both team/program membership AND direct player links
    let hasLinkedPlayers = false;
    if (role === 'parent') {
      // First check if there are teams/programs (players with assignments)
      hasLinkedPlayers = teamIds.length > 0 || programIds.length > 0 || divisionIds.length > 0;
      
      // Also check for linked players directly (even if they don't have team assignments yet)
      if (!hasLinkedPlayers) {
        const linkedPlayers = await storage.getPlayersByParent(userId);
        hasLinkedPlayers = linkedPlayers.length > 0;
      }
    }
    console.log('  hasLinkedPlayers:', hasLinkedPlayers);
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, programIds, targetUserId, true, hasLinkedPlayers);
    
    console.log('  Filtered result:', filteredEvents.length, 'events shown');
    console.log('🔍 EVENT FILTERING DEBUG - End\n');
    
    res.json(await enrichEventsWithFacility(filteredEvents));
  });
  
  app.get('/api/events/upcoming', requireAuth, async (req: any, res) => {
    const { organizationId, id: userId, role } = req.user;
    const { childProfileId } = req.query;
    const allEvents = await storage.getUpcomingEvents(organizationId);
    
    // Admins see all events ONLY when viewing their own dashboard (not a child's)
    if (role === 'admin' && !childProfileId) {
      return res.json(await enrichEventsWithFacility(allEvents));
    }
    
    if (role !== 'admin' && !childProfileId) {
      const isAdmin = await hasAdminProfile(userId, organizationId);
      if (isAdmin) {
        return res.json(await enrichEventsWithFacility(allEvents));
      }
    }
    
    // Get user's event scope (teams, divisions, programs, target user ID)
    const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
      userId,
      role,
      organizationId,
      childProfileId as string | undefined
    );
    
    // For parents, check if they have linked players (including those without team assignments)
    let hasLinkedPlayers = false;
    if (role === 'parent') {
      hasLinkedPlayers = teamIds.length > 0 || programIds.length > 0 || divisionIds.length > 0;
      if (!hasLinkedPlayers) {
        const linkedPlayers = await storage.getPlayersByParent(userId);
        hasLinkedPlayers = linkedPlayers.length > 0;
      }
    }
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, role, teamIds, divisionIds, programIds, targetUserId, false, hasLinkedPlayers);
    
    res.json(await enrichEventsWithFacility(filteredEvents));
  });
  
  // Get coach's primary team
  app.get('/api/coach/team', requireAuth, async (req: any, res) => {
    const { id: userId, role } = req.user;
    
    // Only coaches can access this endpoint
    if (role !== 'coach') {
      return res.status(403).json({ message: 'Only coaches can access this endpoint' });
    }
    
    try {
      // Get all teams the coach is assigned to
      const coachTeams = await storage.getTeamsByCoach(userId);
      
      if (coachTeams.length === 0) {
        return res.json(null);
      }
      
      // Return the first team as the "primary" team
      // Include program info if available
      const primaryTeam = coachTeams[0];
      let programName = null;
      
      if (primaryTeam.programId) {
        const program = await storage.getProgram(String(primaryTeam.programId));
        if (program) {
          programName = program.name;
        }
      }
      
      res.json({
        id: primaryTeam.id,
        name: primaryTeam.name,
        ageGroup: primaryTeam.ageGroup || null,
        programId: primaryTeam.programId,
        programName: programName,
        divisionId: primaryTeam.divisionId,
        coachId: primaryTeam.coachId,
        assistantCoachIds: primaryTeam.assistantCoachIds || [],
      });
    } catch (error: any) {
      console.error('Error fetching coach primary team:', error);
      res.status(500).json({ message: 'Failed to fetch coach team' });
    }
  });
  
  // Coach-specific events endpoint (delegates to shared filtering logic)
  app.get('/api/coach/events', requireAuth, async (req: any, res) => {
    const { organizationId, id: sessionUserId, role: sessionRole } = req.user;
    
    // Support profile switching: use profileId query param if provided, otherwise use session user
    const profileId = req.query.profileId as string | undefined;
    let effectiveUserId = sessionUserId;
    let effectiveRole = sessionRole;
    
    // If profileId is provided, validate it belongs to the current user's account
    if (profileId && profileId !== sessionUserId) {
      const profile = await storage.getUser(profileId);
      if (profile && profile.role === 'coach') {
        // Verify the profile belongs to this user (same email or is linked)
        const sessionUser = await storage.getUser(sessionUserId);
        if (sessionUser && (profile.email === sessionUser.email || 
            profile.accountHolderId === sessionUserId || 
            profile.parentId === sessionUserId)) {
          effectiveUserId = profileId;
          effectiveRole = 'coach';
        }
      }
    }
    
    // Only coaches can access this endpoint
    if (effectiveRole !== 'coach') {
      return res.status(403).json({ message: 'Only coaches can access this endpoint' });
    }
    
    const allEvents = await storage.getEventsByOrganization(organizationId);
    
    // Use shared helper to get coach's event scope
    const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
      effectiveUserId,
      effectiveRole,
      organizationId
    );
    
    console.log(`🔍 Coach events debug for ${effectiveUserId}:`);
    console.log(`   Teams: [${teamIds.join(', ')}]`);
    console.log(`   Divisions: [${divisionIds.join(', ')}]`);
    console.log(`   Programs: [${programIds.join(', ')}]`);
    console.log(`   Total events in org: ${allEvents.length}`);
    
    // Filter events using shared helper
    const filteredEvents = filterEventsByScope(allEvents, effectiveRole, teamIds, divisionIds, programIds, targetUserId, false);
    
    console.log(`   Filtered events: ${filteredEvents.length}`);
    
    res.json(filteredEvents);
  });
  
  app.get('/api/coach/career-stats', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, id: sessionUserId, role: sessionRole } = req.user;
      const profileId = req.query.profileId as string | undefined;
      let effectiveUserId = sessionUserId;
      let effectiveRole = sessionRole;

      if (profileId && profileId !== sessionUserId) {
        const profile = await storage.getUser(profileId);
        if (profile && profile.role === 'coach') {
          const sessionUser = await storage.getUser(sessionUserId);
          if (sessionUser && (profile.email === sessionUser.email ||
              profile.accountHolderId === sessionUserId ||
              profile.parentId === sessionUserId)) {
            effectiveUserId = profileId;
            effectiveRole = 'coach';
          }
        }
      }

      if (effectiveRole !== 'coach') {
        return res.status(403).json({ message: 'Only coaches can access this endpoint' });
      }

      const coachUser = await storage.getUser(effectiveUserId);
      const monthsWithOrg = coachUser?.createdAt
        ? Math.max(1, Math.floor((Date.now() - new Date(coachUser.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)))
        : 0;

      const allEvents = await storage.getEventsByOrganization(organizationId);
      const { teamIds, divisionIds, programIds, targetUserId } = await getUserEventScope(
        effectiveUserId, effectiveRole, organizationId
      );
      const coachEvents = filterEventsByScope(allEvents, effectiveRole, teamIds, divisionIds, programIds, targetUserId, false);

      const pastEvents = coachEvents.filter(e => new Date(e.startTime) < new Date());
      const totalInvited = pastEvents.length;

      const allAttendances = await storage.getAttendancesByUser(effectiveUserId);
      const coachEventIds = new Set(pastEvents.map(e => e.id));
      const attendedCount = allAttendances.filter(a => coachEventIds.has(a.eventId)).length;
      const attendancePct = totalInvited > 0 ? Math.round((attendedCount / totalInvited) * 100) : 0;

      res.json({
        monthsWithOrg,
        eventsAttended: attendedCount,
        totalEventsInvited: totalInvited,
        attendancePercentage: attendancePct,
      });
    } catch (err: any) {
      console.error('Error fetching coach career stats:', err);
      res.status(500).json({ message: 'Failed to fetch career stats' });
    }
  });

  app.get('/api/events/team/:teamId', requireAuth, async (req: any, res) => {
    const events = await storage.getEventsByTeam(req.params.teamId);
    res.json(events);
  });
  
  app.get('/api/events/:eventId/participants', requireAuth, async (req: any, res) => {
    const { role: userRole, organizationId, id: userId } = req.user;
    const { eventId } = req.params;
    
    // SECURITY: Always use the authenticated user's actual role - no client override allowed
    // The viewerRole query param is ignored for security reasons
    
    // Get the event to check its assignTo/visibility configuration
    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get all users in the organization
    const allUsers = await storage.getUsersByOrganization(organizationId);
    
    // Filter users based on event visibility configuration
    const assignTo = event.assignTo || {} as any;
    const visibility = event.visibility || {} as any;
    
    // Build a set of user IDs who are in targeted programs (via team_memberships or product_enrollments)
    let programMemberUserIds = new Set<string>();
    const targetedPrograms = [...(assignTo.programs || []), ...(visibility.programs || [])];
    
    if (targetedPrograms.length > 0) {
      // Get all teams that belong to the targeted programs
      const allTeams = await storage.getTeamsByOrganization(organizationId);
      const programTeamIds = allTeams
        .filter((t: any) => t.programId && targetedPrograms.includes(String(t.programId)))
        .map((t: any) => t.id);
      
      // Get all users who are members of teams in the targeted programs
      // Using getUsersByTeam for each team to get the members
      for (const teamId of programTeamIds) {
        const teamUsers = await storage.getUsersByTeam(String(teamId));
        teamUsers.forEach((user: any) => {
          programMemberUserIds.add(user.id);
        });
      }
      
      // Also check product_enrollments for direct program enrollment
      const enrollments = await storage.getProductEnrollmentsByOrganization(organizationId);
      enrollments.forEach((e: any) => {
        if (e.status === 'active' && targetedPrograms.includes(String(e.programId))) {
          if (e.profileId) {
            programMemberUserIds.add(e.profileId);
          }
        }
      });
    }
    
    // If event has a specific teamId, get that team's members + coaches
    let teamMemberIds = new Set<string>();
    if (event.teamId) {
      const teamUsers = await storage.getUsersByTeam(String(event.teamId));
      teamUsers.forEach((user: any) => teamMemberIds.add(user.id));
      const eventTeam = await storage.getTeam(String(event.teamId));
      if (eventTeam) {
        if (eventTeam.coachId) teamMemberIds.add(String(eventTeam.coachId));
        if (eventTeam.headCoachIds?.length) {
          eventTeam.headCoachIds.forEach((id: string) => teamMemberIds.add(String(id)));
        }
        if ((eventTeam as any).assistantCoachIds?.length) {
          (eventTeam as any).assistantCoachIds.forEach((id: any) => teamMemberIds.add(String(id)));
        }
      }
    }
    
    // Build a set of user IDs who are in targeted teams (via team_memberships + coach assignments)
    let targetedTeamMemberIds = new Set<string>();
    const targetedTeams = [...(assignTo.teams || []), ...(visibility.teams || [])];
    
    if (targetedTeams.length > 0) {
      const allTeams = await storage.getTeamsByOrganization(organizationId);
      for (const teamId of targetedTeams) {
        const teamUsers = await storage.getUsersByTeam(String(teamId));
        teamUsers.forEach((user: any) => {
          targetedTeamMemberIds.add(user.id);
        });
        const teamObj = allTeams.find((t: any) => String(t.id) === String(teamId));
        if (teamObj) {
          if (teamObj.coachId) targetedTeamMemberIds.add(String(teamObj.coachId));
          if (teamObj.headCoachIds?.length) {
            teamObj.headCoachIds.forEach((id: any) => targetedTeamMemberIds.add(String(id)));
          }
          if (teamObj.assistantCoachIds?.length) {
            teamObj.assistantCoachIds.forEach((id: any) => targetedTeamMemberIds.add(String(id)));
          }
        }
      }
    }
    
    // Check if event has any explicit targeting configured (must have non-empty arrays, not strings or other values)
    const hasNonEmptyArray = (val: any): boolean => {
      if (!val) return false;
      if (!Array.isArray(val)) return false;
      return val.length > 0;
    };
    const hasExplicitTargeting = 
        hasNonEmptyArray(assignTo?.users) || hasNonEmptyArray(assignTo?.teams) || 
        hasNonEmptyArray(assignTo?.divisions) || hasNonEmptyArray(assignTo?.roles) || hasNonEmptyArray(assignTo?.programs) ||
        hasNonEmptyArray(visibility?.users) || hasNonEmptyArray(visibility?.teams) || hasNonEmptyArray(visibility?.divisions) || 
        hasNonEmptyArray(visibility?.roles) || hasNonEmptyArray(visibility?.programs);
    
    console.log(`📋 Participants filter for event ${eventId}:`, {
      teamId: event.teamId,
      hasExplicitTargeting,
      assignTo,
      visibility,
      teamMemberCount: teamMemberIds.size,
      targetedTeams,
      targetedTeamMemberCount: targetedTeamMemberIds.size,
      allUsersCount: allUsers.length
    });
    
    // Filter users who are invited to the event
    let invitedUsers = allUsers.filter((user: any) => {
      // If event is linked to a specific team AND has no other targeting, show only team members
      if (event.teamId && !hasExplicitTargeting) {
        return teamMemberIds.has(user.id);
      }
      
      // If event has no targeting and no teamId, include all roles that are in participationRoles (or all players by default)
      if (!hasExplicitTargeting && !event.teamId) {
        // Default: show all players if no targeting specified
        const participationRoles = event.participationRoles || ['player'];
        return participationRoles.includes(user.role);
      }
      
      // When teams are targeted via assignTo.teams/visibility.teams, ONLY include team members
      // This is a strict filter - teams take precedence over roles
      if (targetedTeams.length > 0) {
        // User must be a member of one of the targeted teams (via team_memberships)
        return targetedTeamMemberIds.has(user.id);
      }
      
      // When programs are targeted, ONLY include users who are members of those programs
      // This is a strict filter - programs take precedence over roles
      if (targetedPrograms.length > 0) {
        // User must be a member of one of the targeted programs
        if (!programMemberUserIds.has(user.id)) {
          return false;
        }
        // If they're in the program, include them (don't need to check other criteria)
        return true;
      }
      
      // For non-program/team-based targeting, use OR logic for other filters
      // Check user-specific assignment
      if (assignTo.users?.includes(user.id)) {
        return true;
      }
      
      // Check division-based visibility
      if (user.divisionId && (assignTo.divisions?.includes(String(user.divisionId)) || visibility.divisions?.includes(String(user.divisionId)))) {
        return true;
      }
      
      // Check role-based visibility
      if (assignTo.roles?.includes(user.role) || visibility.roles?.includes(user.role)) {
        return true;
      }
      
      // Special case: For parent-targeted events, also include admins who have linked children
      // (admin accounts with children are effectively "parents" too)
      const targetedRoles = [...(assignTo.roles || []), ...(visibility.roles || [])];
      if (targetedRoles.includes('parent') && user.role === 'admin') {
        // Check if this admin has any linked children
        const hasChildren = allUsers.some((u: any) => 
          u.parentId === user.id || u.guardianId === user.id
        );
        if (hasChildren) {
          return true;
        }
      }
      
      return false;
    });
    
    // Role-based participant filtering based on authenticated user's ACTUAL role (not client-provided)
    if (userRole === 'player') {
      // Players can only see other players in the participant list
      invitedUsers = invitedUsers.filter((user: any) => user.role === 'player');
    } else if (userRole === 'parent') {
      // Parents see players (their children and others) and other parents
      // Filter out admins and coaches from parent view
      invitedUsers = invitedUsers.filter((user: any) => 
        user.role === 'player' || user.role === 'parent'
      );
    }
    // Admins and coaches see everyone
    
    // Return structured response with role groupings for admin/coach views
    if (userRole === 'admin' || userRole === 'coach') {
      const grouped = {
        players: invitedUsers.filter((u: any) => u.role === 'player'),
        parents: invitedUsers.filter((u: any) => u.role === 'parent'),
        coaches: invitedUsers.filter((u: any) => u.role === 'coach'),
        admins: invitedUsers.filter((u: any) => u.role === 'admin'),
        all: invitedUsers,
      };
      return res.json(grouped);
    }
    
    res.json(invitedUsers);
  });
  
  app.post('/api/events', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId, organizationId } = req.user;
      const isAdminUser = role === 'admin' || role === 'coach' || await hasAdminProfile(userId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins and coaches can create events' });
      }
      
      console.log('📍 CREATE EVENT - Received body:', JSON.stringify({
        location: req.body.location,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        assignTo: req.body.assignTo,
        visibility: req.body.visibility
      }, null, 2));
      
      // Handle both legacy (targetType/targetId) and new (assignTo/visibility) formats
      const { targetType, targetId, ...restData } = req.body;
      let visibility: any = restData.visibility || {};
      let assignTo: any = restData.assignTo || {};
      
      // Legacy format transformation (for backward compatibility)
      if (targetType && !restData.assignTo) {
        if (targetType === 'all') {
          visibility = { roles: ['player', 'coach', 'parent', 'admin'] };
          assignTo = { roles: ['player', 'coach', 'parent', 'admin'] };
        } else if (targetType === 'team' && targetId) {
          visibility = { teams: [targetId] };
          assignTo = { teams: [targetId] };
        } else if (targetType === 'program' && targetId) {
          visibility = { programs: [targetId] };
          assignTo = { programs: [targetId] };
        } else if (targetType === 'role' && targetId) {
          visibility = { roles: [targetId] };
          assignTo = { roles: [targetId] };
        }
      }
      
      // Remove assignTo/visibility from restData to avoid duplication
      const { assignTo: _, visibility: __, ...cleanData } = restData;
      
      const eventData = insertEventSchema.parse({
        ...cleanData,
        organizationId: cleanData.organizationId || req.user.organizationId,
        visibility,
        assignTo,
        createdBy: userId,
      });
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error: any) {
      console.error('Error creating event:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Invalid event data', 
          errors: error.errors 
        });
      }
      return res.status(500).json({ 
        message: 'Failed to create event',
        error: error.message 
      });
    }
  });
  
  app.patch('/api/events/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can update events' });
      }
      
      console.log('📍 UPDATE EVENT - Received body:', JSON.stringify({
        location: req.body.location,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        playerRsvpEnabled: req.body.playerRsvpEnabled
      }, null, 2));
      
      const existingEvent = await storage.getEvent(req.params.id);
      const wasScheduleRequest = existingEvent?.scheduleRequestSource && existingEvent?.status === 'pending';
      if (wasScheduleRequest) {
        req.body.scheduleRequestSource = null;
        req.body.status = 'active';
      }

      // Capture key fields before update to detect meaningful changes
      const preUpdateSnapshot = existingEvent ? {
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime,
        location: existingEvent.location,
        facilityId: existingEvent.facilityId,
        courtName: existingEvent.courtName,
        title: existingEvent.title,
        meetingLink: existingEvent.meetingLink,
      } : null;

      if (req.body.facilityId) {
        try {
          const facility = await storage.getFacility(req.body.facilityId);
          if (facility) {
            if (!req.body.location) {
              req.body.location = facility.address;
            }
            if (!req.body.latitude && facility.latitude) {
              req.body.latitude = facility.latitude;
            }
            if (!req.body.longitude && facility.longitude) {
              req.body.longitude = facility.longitude;
            }
          }
        } catch (e) {
          console.error('Error fetching facility for event:', e);
        }
      }
      
      const updated = await storage.updateEvent(req.params.id, req.body);
      console.log('📍 UPDATE EVENT - Result playerRsvpEnabled:', updated?.playerRsvpEnabled);

      if (wasScheduleRequest && existingEvent?.requestedByUserId) {
        try {
          let locationText = '';
          if (req.body.facilityId) {
            const facility = await storage.getFacility(req.body.facilityId);
            if (facility) {
              locationText = facility.name;
              if (req.body.courtName) locationText += ` — ${req.body.courtName}`;
              locationText += ` (${facility.address})`;
            }
          } else if (updated?.location) {
            locationText = updated.location;
            if (req.body.courtName) locationText += ` — ${req.body.courtName}`;
          }

          const startFormatted = updated?.startTime
            ? new Date(updated.startTime).toLocaleString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit',
                timeZone: updated.timezone || 'America/Los_Angeles'
              })
            : '';

          await storage.createNotification({
            organizationId: existingEvent.organizationId || 'default-org',
            userId: existingEvent.requestedByUserId,
            type: 'schedule_confirmed',
            title: 'Session Confirmed',
            message: `Your session "${updated?.title || existingEvent.title}" has been confirmed${startFormatted ? ` for ${startFormatted}` : ''}${locationText ? `. Location: ${locationText}` : ''}.`,
            data: {
              eventId: updated?.id || existingEvent.id,
              facilityId: req.body.facilityId || null,
              courtName: req.body.courtName || null,
            },
          });
        } catch (e) {
          console.error('Error sending schedule confirmation notification:', e);
        }
      }

      // Notify participants of meaningful event changes (skip for pending schedule requests being confirmed)
      if (!wasScheduleRequest && preUpdateSnapshot && updated && existingEvent?.status === 'active') {
        try {
          const tz = updated.timezone || existingEvent?.timezone || 'America/Los_Angeles';
          const changes: string[] = [];

          // Detect title change
          if (req.body.title !== undefined && req.body.title !== preUpdateSnapshot.title) {
            changes.push(`title changed to "${req.body.title}"`);
          }

          // Detect time changes using normalized epoch ms comparison to avoid string-format differences
          const toEpoch = (v: unknown): number | null => {
            if (v == null) return null;
            const t = new Date(v as string).getTime();
            return isNaN(t) ? null : t;
          };
          const oldStartMs = toEpoch(preUpdateSnapshot.startTime);
          const newStartMs = req.body.startTime !== undefined ? toEpoch(req.body.startTime) : oldStartMs;
          const oldEndMs = toEpoch(preUpdateSnapshot.endTime);
          const newEndMs = req.body.endTime !== undefined ? toEpoch(req.body.endTime) : oldEndMs;

          if (newStartMs !== null && newStartMs !== oldStartMs) {
            const startFormatted = new Date(newStartMs).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit', timeZone: tz,
            });
            changes.push(`new start time: ${startFormatted}`);
          }
          if (newEndMs !== null && newEndMs !== oldEndMs) {
            const endFormatted = new Date(newEndMs).toLocaleTimeString('en-US', {
              hour: 'numeric', minute: '2-digit', timeZone: tz,
            });
            changes.push(`new end time: ${endFormatted}`);
          }

          // Detect facility change
          if (req.body.facilityId !== undefined && req.body.facilityId !== preUpdateSnapshot.facilityId) {
            if (req.body.facilityId) {
              try {
                const facility = await storage.getFacility(req.body.facilityId);
                changes.push(`new location: ${facility?.name || req.body.facilityId}`);
              } catch {
                changes.push('location updated');
              }
            } else {
              // facilityId removed — report free-text location if provided, else generic
              changes.push(req.body.location ? `new location: ${req.body.location}` : 'facility location removed');
            }
          } else if (req.body.location !== undefined && req.body.location !== preUpdateSnapshot.location && !req.body.facilityId) {
            changes.push(`new location: ${req.body.location}`);
          }

          // Detect court change
          if (req.body.courtName !== undefined && req.body.courtName !== preUpdateSnapshot.courtName) {
            changes.push(req.body.courtName ? `court changed to ${req.body.courtName}` : 'court removed');
          }

          // Detect meeting link change
          if (req.body.meetingLink !== undefined && req.body.meetingLink !== preUpdateSnapshot.meetingLink) {
            changes.push(req.body.meetingLink ? 'meeting link updated' : 'meeting link removed');
          }

          if (changes.length > 0) {
            const eventTitle = updated.title || existingEvent.title || 'Event';
            const shortDate = oldStartMs !== null
              ? new Date(oldStartMs).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', timeZone: tz,
                })
              : '';
            const changeSummary = `${eventTitle}${shortDate ? ` on ${shortDate}` : ''} has been updated: ${changes.join(', ')}.`;

            // Resolve participants via the shared helper (mirrors scheduler's getEventParticipants)
            const participantList = await resolveEventParticipants(updated, storage);
            console.log(`📢 Event updated: notifying ${participantList.length} participant(s). Changes: ${changeSummary}`);
            const eventId = updated.id;
            for (const userId of participantList) {
              try {
                await notificationService.notifyEventUpdated(userId, eventId, eventTitle, changeSummary);
              } catch (e) {
                console.error(`Error sending event update notification to ${userId}:`, e);
              }
            }
          }
        } catch (e) {
          console.error('Error processing event update notifications:', e);
        }
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Error updating event:', error);
      return res.status(500).json({ 
        message: 'Failed to update event',
        error: error.message 
      });
    }
  });
  
  app.delete('/api/events/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can delete events' });
    }
    
    await storage.deleteEvent(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // ATTENDANCE ROUTES
  // =============================================
  
  // Get all attendances for a specific event
  app.get('/api/attendances/:eventId', requireAuth, async (req: any, res) => {
    try {
      const attendances = await storage.getAttendancesByEvent(req.params.eventId);
      res.json(attendances);
    } catch (error: any) {
      console.error('Error fetching attendances:', error);
      res.status(500).json({ error: 'Failed to fetch attendances' });
    }
  });
  
  // Create a new attendance/check-in
  app.post('/api/attendances', requireAuth, async (req: any, res) => {
    try {
      const { method, qr, ...restBody } = req.body;
      const attendanceData = insertAttendanceSchema.parse(restBody);
      
      // Get user role for location bypass check
      const userRole = req.user?.role;
      
      // Handle QR code check-in (bypasses location check)
      if (method === 'qr' && qr) {
        try {
          const qrData = typeof qr === 'string' ? JSON.parse(qr) : qr;
          const { event: qrEventId, nonce, exp } = qrData;
          
          // Validate QR code
          if (!qrEventId || !nonce || !exp) {
            return res.status(400).json({
              error: 'Invalid QR code',
              message: 'The QR code is missing required information.',
            });
          }
          
          // Check expiry (QR codes valid for 5 minutes)
          const expTime = parseInt(exp);
          if (isNaN(expTime) || Date.now() > expTime) {
            return res.status(400).json({
              error: 'QR code expired',
              message: 'This QR code has expired. Please ask your coach to generate a new one.',
            });
          }
          
          // Validate event ID matches
          if (String(qrEventId) !== String(attendanceData.eventId)) {
            return res.status(400).json({
              error: 'Wrong event',
              message: 'This QR code is for a different event.',
            });
          }
          
          // QR code is valid - proceed with check-in (skip location check)
          console.log(`✅ QR check-in validated for event ${attendanceData.eventId}, user ${attendanceData.userId}`);
        } catch (qrError) {
          return res.status(400).json({
            error: 'Invalid QR code',
            message: 'Failed to parse QR code data.',
          });
        }
      } else if (userRole !== 'admin' && userRole !== 'coach') {
        // Location validation (skip for admin/coach and QR check-ins)
        // Get event to check location requirements
        const event = await storage.getEvent(attendanceData.eventId.toString());
        
        // Check for GPS coordinates using null/undefined checks (not falsy)
        if (event && event.latitude != null && event.longitude != null) {
          // Event has GPS coordinates, location check required
          if (attendanceData.latitude == null || attendanceData.longitude == null) {
            return res.status(400).json({
              error: 'Location required',
              message: 'You must provide your location to check in to this event.',
            });
          }
          
          // Calculate distance using server-side geo utility
          const { distanceMeters } = await import('./utils/geo.js');
          const distance = distanceMeters(
            { lat: attendanceData.latitude, lng: attendanceData.longitude },
            { lat: event.latitude, lng: event.longitude }
          );
          
          // Use event's configured radius or default to 200m (use ?? to allow 0)
          const radiusMeters = event.checkInRadius ?? 200;
          
          if (distance > radiusMeters) {
            return res.status(403).json({
              error: 'Too far away',
              message: `You must be within ${radiusMeters}m of the event location to check in. You are currently ${Math.round(distance)}m away.`,
              distance: Math.round(distance),
              required: radiusMeters,
            });
          }
        }
      }
      
      const attendance = await storage.createAttendance(attendanceData);
      
      // Credit deduction for pack holders + tryout member upgrade
      try {
        if (attendanceData.userId) {
          // Get player's active enrollments with remaining credits
          const enrollments = await storage.getActiveEnrollmentsWithCredits(attendanceData.userId);
          
          // Find an enrollment with remaining credits (pack_holder type)
          const enrollmentWithCredits = enrollments.find((e: any) => 
            e.remainingCredits && e.remainingCredits > 0
          );
          
          if (enrollmentWithCredits) {
            // Deduct one credit
            await storage.deductEnrollmentCredit(enrollmentWithCredits.id);
            console.log(`💳 Deducted 1 credit from enrollment ${enrollmentWithCredits.id} for user ${attendanceData.userId}`);

            // Post-check-in tryout upgrade: only upgrade when the deducted credit came from a tryout enrollment
            if (enrollmentWithCredits.isTryout === true) {
              try {
                const tryoutEnrollment = enrollmentWithCredits;
                // Mark the tryout enrollment as consumed
                await storage.updateEnrollment(tryoutEnrollment.id, { status: 'completed' });

                // Create a new regular active enrollment so the player gains full member access
                await storage.createEnrollment({
                  organizationId: tryoutEnrollment.organizationId,
                  programId: tryoutEnrollment.programId,
                  accountHolderId: tryoutEnrollment.accountHolderId,
                  profileId: attendanceData.userId,
                  status: 'active',
                  source: 'tryout_upgrade',
                  isTryout: false,
                  metadata: { upgradedFromTryout: true, tryoutEnrollmentId: tryoutEnrollment.id },
                });

                // Mark the player's payment status as paid / registered member
                await storage.updateUser(attendanceData.userId, {
                  paymentStatus: 'paid',
                  hasRegistered: true,
                });
                console.log(`✅ Tryout check-in: upgraded player ${attendanceData.userId} to full member status`);
              } catch (upgradeError: any) {
                console.error('⚠️ Tryout member upgrade failed (non-fatal):', upgradeError.message);
              }
            }
          }
        }
      } catch (creditError: any) {
        // Log error but don't fail the attendance creation
        console.error('⚠️ Credit deduction failed (non-fatal):', creditError.message);
      }
      
      // Award engine integration - update tracking and evaluate awards
      try {
        // Get event details to determine event type
        const event = await storage.getEvent(attendanceData.eventId.toString());
        
        if (event && attendanceData.userId) {
          // Get current user to read existing values
          const user = await storage.getUser(attendanceData.userId);
          
          if (user) {
            // Prepare tracking updates based on event type
            const trackingUpdates: any = {
              consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
            };
            
            // Determine if it's a practice or game and update accordingly
            const eventType = event.eventType?.toLowerCase() || '';
            if (eventType.includes('practice') || eventType.includes('skills session')) {
              trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
            } else if (eventType.includes('game') || eventType.includes('tournament')) {
              trackingUpdates.totalGames = (user.totalGames || 0) + 1;
            }
            
            // Update user tracking fields
            await storage.updateUserAwardTracking(attendanceData.userId, trackingUpdates);
            
            // Evaluate and grant any newly earned awards
            await evaluateAwardsForUser(attendanceData.userId, storage);
            
            console.log(`✅ Awards evaluated for user ${attendanceData.userId} after check-in`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the attendance creation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      // Send check-in confirmation notification to player
      try {
        const eventId = typeof attendanceData.eventId === 'number' ? attendanceData.eventId : parseInt(String(attendanceData.eventId));
        if (!isNaN(eventId) && attendanceData.userId) {
          await pushNotifications.playerCheckedIn(storage, attendanceData.userId, eventId);
          
          // Also notify parent if player has a linked parent account
          const player = await storage.getUser(attendanceData.userId);
          if (player?.linkedParentId) {
            const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Your player';
            await pushNotifications.parentPlayerCheckedIn(storage, player.linkedParentId, playerName, eventId);
          }
        }
      } catch (notifError: any) {
        console.error('⚠️ Check-in notification failed (non-fatal):', notifError.message);
      }

      try {
        const orgId = req.user?.organizationId;
        if (orgId && attendanceData.userId) {
          await triggerRealTimeAttendanceNotifications(storage, attendanceData.userId, orgId);
        }
      } catch (attendanceNotifError: any) {
        console.error('⚠️ Attendance pattern notification failed (non-fatal):', attendanceNotifError.message);
      }
      
      res.json(attendance);
    } catch (error: any) {
      console.error("Attendance creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid attendance data", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to create attendance record" 
      });
    }
  });
  
  // Legacy routes (kept for backward compatibility)
  app.get('/api/attendance/event/:eventId', requireAuth, async (req: any, res) => {
    const attendances = await storage.getAttendancesByEvent(req.params.eventId);
    res.json(attendances);
  });
  
  app.get('/api/attendance/user/:userId', requireAuth, async (req: any, res) => {
    const attendances = await storage.getAttendancesByUser(req.params.userId);
    res.json(attendances);
  });
  
  // Proxy check-in: Parents can check in their linked players
  app.post('/api/attendances/proxy', requireAuth, async (req: any, res) => {
    try {
      const { id: parentId, role, organizationId } = req.user;
      const { playerId, eventId: rawEventId, latitude, longitude } = req.body;
      
      // Normalize eventId to number
      const eventId = typeof rawEventId === 'number' ? rawEventId : parseInt(String(rawEventId));
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Validate required fields
      if (!playerId) {
        return res.status(400).json({ error: 'Missing required field: playerId' });
      }
      
      // Validate parent role
      if (role !== 'parent' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only parents or admins can perform proxy check-ins' 
        });
      }
      
      // Get the event
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Check if proxy check-ins are allowed for this event
      const proxyRoles = event.proxyCheckinRoles || ['parent']; // Default: parents can proxy
      if (!proxyRoles.includes(role) && role !== 'admin') {
        return res.status(403).json({
          error: 'Proxy check-in not allowed',
          message: 'This event does not allow proxy check-ins from your role.'
        });
      }
      
      // Validate check-in window
      const eventWindows = await storage.getEventWindowsByEvent(eventId);
      const now = new Date();
      const eventStart = new Date(event.startTime);
      
      // Calculate check-in window times
      const checkinOpenWindow = eventWindows.find((w: any) => w.windowType === 'checkin' && w.openRole === 'open');
      const checkinCloseWindow = eventWindows.find((w: any) => w.windowType === 'checkin' && w.openRole === 'close');
      
      // Helper to calculate offset from event start
      const offsetFromStart = (amount: number, unit: string, direction: string) => {
        let ms = amount;
        if (unit === 'minutes') ms *= 60 * 1000;
        else if (unit === 'hours') ms *= 60 * 60 * 1000;
        else if (unit === 'days') ms *= 24 * 60 * 60 * 1000;
        return direction === 'before' 
          ? new Date(eventStart.getTime() - ms)
          : new Date(eventStart.getTime() + ms);
      };
      
      // Default: check-in opens 30 minutes before, closes far in future
      const checkinOpen = checkinOpenWindow 
        ? offsetFromStart(checkinOpenWindow.amount, checkinOpenWindow.unit, checkinOpenWindow.direction)
        : new Date(eventStart.getTime() - 30 * 60 * 1000);
      const checkinClose = checkinCloseWindow
        ? offsetFromStart(checkinCloseWindow.amount, checkinCloseWindow.unit, checkinCloseWindow.direction)
        : new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      
      // Check if check-in window is open (admins bypass window check)
      if (role !== 'admin' && (now < checkinOpen || now > checkinClose)) {
        const status = now < checkinOpen ? 'not yet open' : 'closed';
        return res.status(400).json({
          error: 'Check-in window ' + status,
          message: status === 'not yet open'
            ? `Check-in opens at ${checkinOpen.toLocaleTimeString()}`
            : `Check-in closed at ${checkinClose.toLocaleTimeString()}`,
          checkinOpen: checkinOpen.toISOString(),
          checkinClose: checkinClose.toISOString(),
        });
      }
      
      // Get the player to verify they exist and are a player
      const player = await storage.getUser(playerId);
      if (!player || player.role !== 'player') {
        return res.status(400).json({
          error: 'Invalid player',
          message: 'The specified player was not found.'
        });
      }
      
      // Verify parent-child relationship (skip for admins)
      if (role === 'parent') {
        // Check if player's accountHolderId matches parent's ID
        if (player.accountHolderId !== parentId) {
          return res.status(403).json({
            error: 'Unauthorized',
            message: 'You can only check in players linked to your account.'
          });
        }
      }
      
      // Check if player is already checked in
      const existingAttendances = await storage.getAttendancesByEvent(eventId);
      const alreadyCheckedIn = existingAttendances.some((a: any) => a.userId === playerId);
      if (alreadyCheckedIn) {
        return res.status(400).json({
          error: 'Already checked in',
          message: 'This player has already been checked in.'
        });
      }
      
      // Location validation for proxy check-ins (required when event has coordinates)
      // Admins can bypass location check
      if (role !== 'admin' && event.latitude != null && event.longitude != null) {
        // Require location coordinates for proxy check-in
        if (latitude == null || longitude == null) {
          return res.status(400).json({
            error: 'Location required',
            message: 'Your location is required to check in a player at this event. Please enable location access or use QR code check-in.',
          });
        }
        
        const { distanceMeters } = await import('./utils/geo.js');
        const distance = distanceMeters(
          { lat: latitude, lng: longitude },
          { lat: event.latitude, lng: event.longitude }
        );
        const radiusMeters = event.checkInRadius ?? 200;
        
        if (distance > radiusMeters) {
          return res.status(403).json({
            error: 'Too far away',
            message: `You must be within ${radiusMeters}m of the event to check in your player. You are ${Math.round(distance)}m away.`,
            distance: Math.round(distance),
            required: radiusMeters,
          });
        }
      }
      
      // Create the attendance record with proxy tracking
      const attendanceData = {
        userId: playerId,
        eventId: eventId,
        qrCodeData: `proxy-${parentId}-${Date.now()}`,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        checkedInByUserId: parentId,
        checkInMethod: 'proxy',
      };
      
      const attendance = await storage.createAttendance(attendanceData);
      
      // Credit deduction and award tracking (same as regular check-in)
      try {
        const enrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
        const enrollmentWithCredits = enrollments.find((e: any) => 
          e.remainingCredits && e.remainingCredits > 0
        );
        
        if (enrollmentWithCredits) {
          await storage.deductEnrollmentCredit(enrollmentWithCredits.id);
          console.log(`💳 Proxy check-in: Deducted 1 credit from enrollment ${enrollmentWithCredits.id} for player ${playerId}`);

          // Post-check-in tryout upgrade: if credit came from a tryout enrollment, upgrade to member
          if (enrollmentWithCredits.isTryout === true) {
            try {
              await storage.updateEnrollment(enrollmentWithCredits.id, { status: 'completed' });
              await storage.createEnrollment({
                organizationId: enrollmentWithCredits.organizationId,
                programId: enrollmentWithCredits.programId,
                accountHolderId: enrollmentWithCredits.accountHolderId,
                profileId: playerId,
                status: 'active',
                source: 'tryout_upgrade',
                isTryout: false,
                metadata: { upgradedFromTryout: true, tryoutEnrollmentId: enrollmentWithCredits.id },
              });
              await storage.updateUser(playerId, { paymentStatus: 'paid', hasRegistered: true });
              console.log(`✅ Proxy tryout check-in: upgraded player ${playerId} to full member status`);
            } catch (upgradeError: any) {
              console.error('⚠️ Tryout member upgrade failed (non-fatal):', (upgradeError as Error).message);
            }
          }
        }
      } catch (creditError: any) {
        console.error('⚠️ Credit deduction failed (non-fatal):', creditError.message);
      }
      
      // Award evaluation
      try {
        const eventData = await storage.getEvent(String(eventId));
        const user = await storage.getUser(playerId);
        
        if (eventData && user) {
          const trackingUpdates: any = {
            consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
          };
          
          const eventType = eventData.eventType?.toLowerCase() || '';
          if (eventType.includes('practice') || eventType.includes('skills session')) {
            trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
          } else if (eventType.includes('game') || eventType.includes('tournament')) {
            trackingUpdates.totalGames = (user.totalGames || 0) + 1;
          }
          
          await storage.updateUserAwardTracking(playerId, trackingUpdates);
          await evaluateAwardsForUser(playerId, storage);
          console.log(`✅ Awards evaluated for player ${playerId} after proxy check-in`);
        }
      } catch (awardError: any) {
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      try {
        if (organizationId && playerId) {
          await triggerRealTimeAttendanceNotifications(storage, playerId, organizationId);
        }
      } catch (attendanceNotifError: any) {
        console.error('⚠️ Attendance pattern notification failed (non-fatal):', attendanceNotifError.message);
      }

      res.json({ 
        success: true, 
        attendance,
        message: `${player.firstName} ${player.lastName} has been checked in.`
      });
    } catch (error: any) {
      console.error('Proxy check-in error:', error);
      res.status(500).json({ 
        error: 'Failed to check in player',
        message: error.message 
      });
    }
  });
  
  // Get linked players for parent (for proxy check-in UI)
  app.get('/api/parent/linked-players', requireAuth, async (req: any, res) => {
    try {
      const { id: parentId, role } = req.user;
      
      if (role !== 'parent' && role !== 'admin') {
        return res.status(403).json({ message: 'Only parents can access linked players' });
      }
      
      // Get all players linked to this parent
      const linkedPlayers = await storage.getPlayersByParent(parentId);
      res.json(linkedPlayers);
    } catch (error: any) {
      console.error('Error fetching linked players:', error);
      res.status(500).json({ error: 'Failed to fetch linked players' });
    }
  });
  
  // Proxy RSVP: Parents can RSVP on behalf of their linked players
  app.post('/api/rsvp/proxy', requireAuth, async (req: any, res) => {
    try {
      const { id: parentId, role } = req.user;
      const { playerId, eventId: rawEventId, response } = req.body;
      
      // Normalize eventId to number
      const eventId = typeof rawEventId === 'number' ? rawEventId : parseInt(String(rawEventId));
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Validate required fields
      if (!playerId || !response) {
        return res.status(400).json({ error: 'Missing required fields: playerId and response' });
      }
      
      // Validate parent role
      if (role !== 'parent' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only parents or admins can perform proxy RSVPs' 
        });
      }
      
      // Get the event
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Validate RSVP window
      const eventWindows = await storage.getEventWindowsByEvent(eventId);
      const now = new Date();
      const eventStart = new Date(event.startTime);
      
      // Calculate RSVP window times
      const rsvpOpenWindow = eventWindows.find((w: any) => w.windowType === 'rsvp' && w.openRole === 'open');
      const rsvpCloseWindow = eventWindows.find((w: any) => w.windowType === 'rsvp' && w.openRole === 'close');
      
      // Helper to calculate offset from event start
      const offsetFromStart = (amount: number, unit: string, direction: string) => {
        let ms = amount;
        if (unit === 'minutes') ms *= 60 * 1000;
        else if (unit === 'hours') ms *= 60 * 60 * 1000;
        else if (unit === 'days') ms *= 24 * 60 * 60 * 1000;
        return direction === 'before' 
          ? new Date(eventStart.getTime() - ms)
          : new Date(eventStart.getTime() + ms);
      };
      
      // Default: RSVP opens 3 days before, closes far in future
      const rsvpOpen = rsvpOpenWindow 
        ? offsetFromStart(rsvpOpenWindow.amount, rsvpOpenWindow.unit, rsvpOpenWindow.direction)
        : new Date(eventStart.getTime() - 3 * 24 * 60 * 60 * 1000);
      const rsvpClose = rsvpCloseWindow
        ? offsetFromStart(rsvpCloseWindow.amount, rsvpCloseWindow.unit, rsvpCloseWindow.direction)
        : new Date(eventStart.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
      
      // Check if RSVP window is open (admins bypass window check)
      if (role !== 'admin' && (now < rsvpOpen || now > rsvpClose)) {
        const status = now < rsvpOpen ? 'not yet open' : 'closed';
        return res.status(400).json({
          error: 'RSVP window ' + status,
          message: status === 'not yet open'
            ? `RSVP opens at ${rsvpOpen.toLocaleString()}`
            : `RSVP closed at ${rsvpClose.toLocaleString()}`,
          rsvpOpen: rsvpOpen.toISOString(),
          rsvpClose: rsvpClose.toISOString(),
        });
      }
      
      // Get the player to verify they exist and are a player
      const player = await storage.getUser(playerId);
      if (!player || player.role !== 'player') {
        return res.status(400).json({
          error: 'Invalid player',
          message: 'The specified player was not found.'
        });
      }
      
      // Verify parent-child relationship (skip for admins)
      if (role === 'parent') {
        if (player.accountHolderId !== parentId) {
          return res.status(403).json({
            error: 'Unauthorized',
            message: 'You can only RSVP for players linked to your account.'
          });
        }
      }
      
      // Check if RSVP already exists
      const existing = await storage.getRsvpResponseByUserAndEvent(playerId, eventId);
      
      let result;
      if (existing) {
        // Update existing response
        result = await storage.updateRsvpResponse(existing.id, { response });
      } else {
        // Create new response
        result = await storage.createRsvpResponse({
          userId: playerId,
          eventId: eventId,
          response,
        });
      }
      
      // Award engine integration - evaluate awards for 'attending' RSVPs (for the player, not parent)
      try {
        if (response === 'attending' && playerId) {
          // Update tracking for the player
          const playerData = await storage.getUser(playerId);
          
          if (playerData) {
            await storage.updateUserAwardTracking(playerId, {
              consecutiveCheckins: (playerData.consecutiveCheckins || 0) + 1,
            });
            
            // Evaluate and grant any newly earned awards for the PLAYER
            await evaluateAwardsForUser(playerId, storage, { category: 'rsvp' });
            
            console.log(`✅ Awards evaluated for player ${playerId} after proxy RSVP`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the RSVP operation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json({ 
        success: true, 
        rsvp: result,
        message: `${player.firstName} ${player.lastName}'s RSVP has been updated to "${response}".`
      });
    } catch (error: any) {
      console.error('Proxy RSVP error:', error);
      res.status(500).json({ 
        error: 'Failed to update RSVP',
        message: error.message 
      });
    }
  });
  
  // Coach roster check-in: Coaches can check in players from their roster
  app.post('/api/attendances/coach', requireAuth, async (req: any, res) => {
    try {
      const { id: coachId, role } = req.user;
      const { playerIds, eventId: rawEventId, action = 'checkin' } = req.body;
      
      // Normalize eventId to number
      const eventId = typeof rawEventId === 'number' ? rawEventId : parseInt(String(rawEventId));
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Validate required fields
      if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
        return res.status(400).json({ error: 'Missing required field: playerIds (must be an array)' });
      }
      
      // Validate coach/admin role
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only coaches or admins can perform roster check-ins' 
        });
      }
      
      // Get the event
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Get existing attendances
      const existingAttendances = await storage.getAttendancesByEvent(eventId);
      const checkedInPlayerIds = new Set(existingAttendances.map((a: any) => a.userId));
      
      const results: { playerId: string; success: boolean; action: string; playerName?: string; error?: string }[] = [];
      
      for (const playerId of playerIds) {
        try {
          const player = await storage.getUser(playerId);
          if (!player) {
            results.push({ playerId, success: false, action: 'error', error: 'Player not found' });
            continue;
          }
          
          const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Unknown Player';
          
          if (action === 'checkout') {
            // Remove check-in (undo)
            const attendance = existingAttendances.find((a: any) => a.userId === playerId);
            if (attendance) {
              await storage.deleteAttendance(attendance.id);
              results.push({ playerId, success: true, action: 'checkout', playerName });
            } else {
              results.push({ playerId, success: false, action: 'checkout', playerName, error: 'Not checked in' });
            }
          } else {
            // Check in
            if (checkedInPlayerIds.has(playerId)) {
              results.push({ playerId, success: false, action: 'checkin', playerName, error: 'Already checked in' });
              continue;
            }
            
            const attendanceData = {
              userId: playerId,
              eventId: eventId,
              qrCodeData: `coach-${coachId}-${Date.now()}`,
              checkedInByUserId: coachId,
              checkInMethod: 'coach_roster',
            };
            
            await storage.createAttendance(attendanceData);
            checkedInPlayerIds.add(playerId);
            
            // Credit deduction and award tracking
            try {
              const enrollments = await storage.getActiveEnrollmentsWithCredits(playerId);
              const enrollmentWithCredits = enrollments.find((e: any) => 
                e.remainingCredits && e.remainingCredits > 0
              );
              
              if (enrollmentWithCredits) {
                await storage.deductEnrollmentCredit(enrollmentWithCredits.id);
                console.log(`💳 Coach check-in: Deducted 1 credit from enrollment ${enrollmentWithCredits.id} for player ${playerId}`);

                // Post-check-in tryout upgrade: if credit came from a tryout enrollment, upgrade to member
                if (enrollmentWithCredits.isTryout === true) {
                  try {
                    await storage.updateEnrollment(enrollmentWithCredits.id, { status: 'completed' });
                    await storage.createEnrollment({
                      organizationId: enrollmentWithCredits.organizationId,
                      programId: enrollmentWithCredits.programId,
                      accountHolderId: enrollmentWithCredits.accountHolderId,
                      profileId: playerId,
                      status: 'active',
                      source: 'tryout_upgrade',
                      isTryout: false,
                      metadata: { upgradedFromTryout: true, tryoutEnrollmentId: enrollmentWithCredits.id },
                    });
                    await storage.updateUser(playerId, { paymentStatus: 'paid', hasRegistered: true });
                    console.log(`✅ Coach tryout check-in: upgraded player ${playerId} to full member status`);
                  } catch (upgradeError: any) {
                    console.error('⚠️ Tryout member upgrade failed (non-fatal):', (upgradeError as Error).message);
                  }
                }
              }
            } catch (creditError: any) {
              console.error('⚠️ Credit deduction failed (non-fatal):', creditError.message);
            }
            
            // Award evaluation
            try {
              const user = await storage.getUser(playerId);
              if (user) {
                const trackingUpdates: any = {
                  consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
                };
                
                const eventType = event.eventType?.toLowerCase() || '';
                if (eventType.includes('practice') || eventType.includes('skills session')) {
                  trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
                } else if (eventType.includes('game') || eventType.includes('tournament')) {
                  trackingUpdates.totalGames = (user.totalGames || 0) + 1;
                }
                
                await storage.updateUserAwardTracking(playerId, trackingUpdates);
                await evaluateAwardsForUser(playerId, storage);
              }
            } catch (awardError: any) {
              console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
            }
            
            try {
              const orgId = req.user?.organizationId;
              if (orgId) {
                await triggerRealTimeAttendanceNotifications(storage, playerId, orgId);
              }
            } catch (attendanceNotifError: any) {
              console.error('⚠️ Attendance pattern notification failed (non-fatal):', attendanceNotifError.message);
            }

            results.push({ playerId, success: true, action: 'checkin', playerName });
          }
        } catch (playerError: any) {
          results.push({ playerId, success: false, action: 'error', error: playerError.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      res.json({ 
        success: true, 
        results,
        summary: {
          total: playerIds.length,
          successful: successCount,
          failed: failCount,
        },
        message: action === 'checkout' 
          ? `Removed ${successCount} player(s) from attendance`
          : `Checked in ${successCount} player(s)`
      });
    } catch (error: any) {
      console.error('Coach roster check-in error:', error);
      res.status(500).json({ 
        error: 'Failed to process roster check-ins',
        message: error.message 
      });
    }
  });
  
  // Get event roster for coach check-in (players who should be at this event)
  app.get('/api/events/:eventId/roster', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      const eventId = parseInt(req.params.eventId);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId' });
      }
      
      // Only coaches and admins can see the full roster
      if (role !== 'coach' && role !== 'admin') {
        return res.status(403).json({ 
          error: 'Unauthorized', 
          message: 'Only coaches or admins can access the event roster' 
        });
      }
      
      const event = await storage.getEvent(String(eventId));
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Get all players who should be at this event based on targets
      const allPlayers: any[] = [];
      const eventTargets = await storage.getEventTargetsByEventId(eventId);
      
      // Get players from targeted teams
      for (const target of eventTargets) {
        if (target.targetType === 'team' && target.targetId) {
          const teamMembers = await storage.getTeamMembersByTeam(parseInt(target.targetId));
          for (const member of teamMembers) {
            if (member.role === 'player') {
              const player = await storage.getUser(member.userId);
              if (player && !allPlayers.find(p => p.id === player.id)) {
                allPlayers.push(player);
              }
            }
          }
        }
      }
      
      // Also get RSVP'd players
      const rsvpResponses = await storage.getRsvpResponsesByEvent(eventId);
      for (const rsvp of rsvpResponses) {
        const player = await storage.getUser(rsvp.userId);
        if (player && player.role === 'player' && !allPlayers.find(p => p.id === player.id)) {
          allPlayers.push(player);
        }
      }
      
      // Get current attendance status
      const attendances = await storage.getAttendancesByEvent(eventId);
      const checkedInIds = new Set(attendances.map((a: any) => a.userId));
      
      // Build roster with status
      const roster = allPlayers.map(player => ({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        profileImageUrl: player.profileImageUrl,
        isCheckedIn: checkedInIds.has(player.id),
        rsvpResponse: rsvpResponses.find((r: any) => r.userId === player.id)?.response || 'no_response',
      }));
      
      res.json({
        eventId,
        roster,
        checkedInCount: attendances.length,
        totalPlayers: roster.length,
      });
    } catch (error: any) {
      console.error('Event roster fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch event roster',
        message: error.message 
      });
    }
  });
  
  app.post('/api/attendance', requireAuth, async (req: any, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      
      // Award engine integration - update tracking and evaluate awards
      try {
        // Get event details to determine event type
        const event = await storage.getEvent(attendanceData.eventId.toString());
        
        if (event && attendanceData.userId) {
          // Get current user to read existing values
          const user = await storage.getUser(attendanceData.userId);
          
          if (user) {
            // Prepare tracking updates based on event type
            const trackingUpdates: any = {
              consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
            };
            
            // Determine if it's a practice or game and update accordingly
            const eventType = event.eventType?.toLowerCase() || '';
            if (eventType.includes('practice') || eventType.includes('skills session')) {
              trackingUpdates.totalPractices = (user.totalPractices || 0) + 1;
            } else if (eventType.includes('game') || eventType.includes('tournament')) {
              trackingUpdates.totalGames = (user.totalGames || 0) + 1;
            }
            
            // Update user tracking fields
            await storage.updateUserAwardTracking(attendanceData.userId, trackingUpdates);
            
            // Evaluate and grant any newly earned awards
            await evaluateAwardsForUser(attendanceData.userId, storage);
            
            console.log(`✅ Awards evaluated for user ${attendanceData.userId} after check-in`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the attendance creation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      res.json(attendance);
    } catch (error: any) {
      console.error("Attendance creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid attendance data", 
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to create attendance record" 
      });
    }
  });
  
  // =============================================
  // EVENT WINDOW ROUTES
  // =============================================
  
  app.get('/api/event-windows/event/:eventId', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const windows = await storage.getEventWindowsByEvent(eventId);
      res.json(windows);
    } catch (error: any) {
      console.error('Error fetching event windows:', error);
      res.status(500).json({ error: 'Failed to fetch event windows' });
    }
  });
  
  app.post('/api/event-windows', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can create event windows' });
    }
    
    try {
      const windowData = insertEventWindowSchema.parse(req.body);
      const window = await storage.createEventWindow(windowData);
      res.json(window);
    } catch (error: any) {
      console.error("Event window creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid event window data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create event window" });
    }
  });
  
  app.patch('/api/event-windows/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can update event windows' });
    }
    
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateEventWindow(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating event window:', error);
      res.status(500).json({ error: 'Failed to update event window' });
    }
  });
  
  app.delete('/api/event-windows/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can delete event windows' });
    }
    
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEventWindow(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting event window:', error);
      res.status(500).json({ error: 'Failed to delete event window' });
    }
  });

  app.delete('/api/event-windows/event/:eventId', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can delete event windows' });
    }
    
    try {
      const eventId = parseInt(req.params.eventId);
      await storage.deleteEventWindowsByEvent(eventId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting event windows:', error);
      res.status(500).json({ error: 'Failed to delete event windows' });
    }
  });
  
  // =============================================
  // RSVP RESPONSE ROUTES
  // =============================================
  
  app.get('/api/rsvp/event/:eventId', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const responses = await storage.getRsvpResponsesByEvent(eventId);
      res.json(responses);
    } catch (error: any) {
      console.error('Error fetching RSVP responses:', error);
      res.status(500).json({ error: 'Failed to fetch RSVP responses' });
    }
  });
  
  app.get('/api/rsvp/user/:userId/event/:eventId', requireAuth, async (req: any, res) => {
    try {
      const { userId, eventId } = req.params;
      const response = await storage.getRsvpResponseByUserAndEvent(userId, parseInt(eventId));
      res.json(response || null);
    } catch (error: any) {
      console.error('Error fetching RSVP response:', error);
      res.status(500).json({ error: 'Failed to fetch RSVP response' });
    }
  });
  
  app.post('/api/rsvp', requireAuth, async (req: any, res) => {
    try {
      // Players cannot RSVP - parent/guardian must do it for them
      if (req.user?.role === 'player') {
        return res.status(403).json({ 
          error: 'Players cannot RSVP directly. Your parent or guardian must RSVP for you from their account.' 
        });
      }
      
      const rsvpData = insertRsvpResponseSchema.parse(req.body);
      
      // Check if response already exists
      const existing = await storage.getRsvpResponseByUserAndEvent(rsvpData.userId, rsvpData.eventId);
      
      let result;
      if (existing) {
        // Update existing response
        result = await storage.updateRsvpResponse(existing.id, { response: rsvpData.response });
      } else {
        // Create new response
        result = await storage.createRsvpResponse(rsvpData);
      }
      
      // Award engine integration - evaluate awards for 'attending' RSVPs
      try {
        if (rsvpData.response === 'attending' && rsvpData.userId) {
          // Optionally increment consecutiveCheckins for positive RSVPs
          const user = await storage.getUser(rsvpData.userId);
          
          if (user) {
            await storage.updateUserAwardTracking(rsvpData.userId, {
              consecutiveCheckins: (user.consecutiveCheckins || 0) + 1,
            });
            
            // Evaluate and grant any newly earned RSVP awards
            await evaluateAwardsForUser(rsvpData.userId, storage, { category: 'rsvp' });
            
            console.log(`✅ Awards evaluated for user ${rsvpData.userId} after RSVP`);
          }
        }
      } catch (awardError: any) {
        // Log error but don't fail the RSVP operation
        console.error('⚠️ Award evaluation failed (non-fatal):', awardError.message);
      }
      
      // Send RSVP confirmation notification (only for 'attending')
      try {
        if (rsvpData.response === 'attending' && rsvpData.userId) {
          // Get event to notify coaches about RSVP summary
          const event = await storage.getEvent(rsvpData.eventId.toString());
          if (event?.teamId) {
            const team = await storage.getTeam(event.teamId);
            if (team?.coachId) {
              // Get count of attending responses
              const responses = await storage.getRsvpResponsesByEvent(rsvpData.eventId);
              const attendingCount = responses.filter((r: any) => r.response === 'attending').length;
              
              // Only notify if this brings attendance below threshold (e.g., 5 players)
              if (attendingCount < 5) {
                await pushNotifications.coachLowAttendanceWarning(storage, team.coachId, rsvpData.eventId, attendingCount);
              }
            }
          }
        }
      } catch (notifError: any) {
        console.error('⚠️ RSVP notification failed (non-fatal):', notifError.message);
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("RSVP creation error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid RSVP data", 
          details: error.errors 
        });
      }
      res.status(500).json({ error: "Failed to create/update RSVP response" });
    }
  });
  
  app.patch('/api/rsvp/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateRsvpResponse(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating RSVP response:', error);
      res.status(500).json({ error: 'Failed to update RSVP response' });
    }
  });
  
  app.delete('/api/rsvp/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRsvpResponse(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting RSVP response:', error);
      res.status(500).json({ error: 'Failed to delete RSVP response' });
    }
  });
  
  // =============================================
  // AWARD ROUTES
  // =============================================
  
  app.get('/api/awards', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const awards = await storage.getAwardsByOrganization(organizationId);
    res.json(awards);
  });
  
  app.post('/api/awards', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create awards' });
    }
    
    const awardData = insertAwardSchema.parse(req.body);
    const award = await storage.createAward(awardData);
    res.json(award);
  });
  
  app.patch('/api/awards/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update awards' });
    }
    
    const updated = await storage.updateAward(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/awards/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete awards' });
    }
    
    await storage.deleteAward(req.params.id);
    res.json({ success: true });
  });
  
  // User Awards (legacy endpoint - kept for backwards compatibility)
  // Alias endpoint for frontend compatibility: /api/users/:userId/awards
  app.get('/api/users/:userId/awards', requireAuth, async (req: any, res) => {
    // Disable HTTP caching to ensure React Query refetches get fresh data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { userId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Not authorized to view awards from other organizations' });
      }
      
      // Authorization: users can view their own awards, admins/coaches can view any user's awards
      // Parents can also view their linked children's awards
      let isAuthorized = userId === currentUserId || role === 'admin' || role === 'coach';
      
      if (!isAuthorized && role === 'parent') {
        // Check if target user is a linked child of the current parent
        const linkedPlayers = await storage.getPlayersByParent(currentUserId);
        isAuthorized = linkedPlayers.some(p => p.id === userId);
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view these awards' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      console.log(`[Awards API] User ${userId}: Found ${userAwardRecords.length} user award records`);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      console.log(`[Awards API] Org ${organizationId}: Found ${allAwardDefinitions.length} award definitions`);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich user awards with award definition data
      const enrichedAwards = userAwardRecords.map((ua: any) => {
        const def = awardDefMap.get(ua.awardId);
        return {
          ...ua,
          tier: def?.tier,
          name: def?.name,
          description: def?.description,
          imageUrl: def?.imageUrl,
          prestige: def?.prestige,
          xpReward: def?.xpReward ?? 50,
        };
      });
      
      const legendCount = enrichedAwards.filter((a: any) => a.tier === 'Legend').length;
      const diamondCount = enrichedAwards.filter((a: any) => a.tier === 'Diamond').length;
      const platinumCount = enrichedAwards.filter((a: any) => a.tier === 'Platinum').length;
      const goldCount = enrichedAwards.filter((a: any) => a.tier === 'Gold').length;
      const silverCount = enrichedAwards.filter((a: any) => a.tier === 'Silver').length;
      const bronzeCount = enrichedAwards.filter((a: any) => a.tier === 'Bronze').length;
      
      const legendTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Legend' && a.active).length;
      const diamondTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Diamond' && a.active).length;
      const platinumTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Platinum' && a.active).length;
      const goldTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Gold' && a.active).length;
      const silverTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Silver' && a.active).length;
      const bronzeTotal = allAwardDefinitions.filter((a: any) => a.tier === 'Bronze' && a.active).length;
      
      console.log(`[Awards API] Earned - Legend:${legendCount}, Diamond:${diamondCount}, Platinum:${platinumCount}, Gold:${goldCount}, Silver:${silverCount}, Bronze:${bronzeCount}`);
      console.log(`[Awards API] Totals - Legend:${legendTotal}, Diamond:${diamondTotal}, Platinum:${platinumTotal}, Gold:${goldTotal}, Silver:${silverTotal}, Bronze:${bronzeTotal}`);
      
      res.json({
        tierSummary: {
          legacy: { earned: legendCount, total: legendTotal || 1 },
          hof: { earned: diamondCount, total: diamondTotal || 1 },
          superstar: { earned: platinumCount, total: platinumTotal || 1 },
          allStar: { earned: goldCount, total: goldTotal || 1 },
          starter: { earned: silverCount, total: silverTotal || 1 },
          prospect: { earned: bronzeCount, total: bronzeTotal || 1 },
        },
        trophiesCount: legendCount,
        hallOfFameBadgesCount: diamondCount,
        superstarBadgesCount: platinumCount,
        allStarBadgesCount: goldCount,
        starterBadgesCount: silverCount,
        prospectBadgesCount: bronzeCount,
        rookieBadgesCount: 0,
        allAwards: enrichedAwards,
      });
    } catch (error: any) {
      console.error('Error fetching user awards:', error);
      res.status(500).json({ error: 'Failed to fetch user awards', message: error.message });
    }
  });

  // Badges endpoint
  app.get('/api/users/:userId/badges', requireAuth, async (req: any, res) => {
    // Disable HTTP caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { userId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      if (userId !== currentUserId && role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.organizationId !== organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich and filter badges
      const badges = userAwardRecords
        .map((ua: any) => {
          const def = awardDefMap.get(ua.awardId);
          return {
            ...ua,
            tier: def?.tier,
            name: def?.name,
            description: def?.description,
            imageUrl: def?.imageUrl,
            prestige: def?.prestige,
          };
        })
        .filter((a: any) => a.tier === 'Badge');
      
      res.json(badges);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges', message: error.message });
    }
  });

  // Trophies endpoint
  app.get('/api/users/:userId/trophies', requireAuth, async (req: any, res) => {
    // Disable HTTP caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { userId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      if (userId !== currentUserId && role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.organizationId !== organizationId) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(userId);
      
      // Fetch award definitions to get tier information
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich and filter trophies
      const trophies = userAwardRecords
        .map((ua: any) => {
          const def = awardDefMap.get(ua.awardId);
          return {
            ...ua,
            tier: def?.tier,
            name: def?.name,
            description: def?.description,
            imageUrl: def?.imageUrl,
            prestige: def?.prestige,
          };
        })
        .filter((a: any) => a.tier === 'Trophy');
      
      res.json(trophies);
    } catch (error: any) {
      console.error('Error fetching trophies:', error);
      res.status(500).json({ error: 'Failed to fetch trophies', message: error.message });
    }
  });

  app.get('/api/user-awards/:userId', requireAuth, async (req: any, res) => {
    const userAwards = await storage.getUserAwards(req.params.userId);
    res.json(userAwards);
  });
  
  // =============================================
  // ANNOUNCEMENT ROUTES
  // =============================================
  
  app.get('/api/announcements', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const announcements = await storage.getAnnouncementsByOrganization(organizationId);
    res.json(announcements);
  });
  
  app.get('/api/announcements/team/:teamId', requireAuth, async (req: any, res) => {
    const announcements = await storage.getAnnouncementsByTeam(req.params.teamId);
    res.json(announcements);
  });
  
  app.post('/api/announcements', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can create announcements' });
    }
    
    const announcementData = insertAnnouncementSchema.parse(req.body);
    const announcement = await storage.createAnnouncement(announcementData);
    res.json(announcement);
  });
  
  app.patch('/api/announcements/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can update announcements' });
    }
    
    const updated = await storage.updateAnnouncement(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/announcements/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
      return res.status(403).json({ message: 'Only admins and coaches can delete announcements' });
    }
    
    await storage.deleteAnnouncement(req.params.id);
    res.json({ success: true });
  });
  
  // =============================================
  // MESSAGE ROUTES (Team Chat)
  // =============================================
  
  app.get('/api/messages/unread-counts', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const since = req.query.since as string | undefined;
      
      const userTeamMemberships = await storage.getTeamMembershipsByProfile(userId);
      const activeTeamIds = userTeamMemberships
        .filter((tm: any) => tm.status === 'active')
        .map((tm: any) => tm.teamId);
      
      if (activeTeamIds.length === 0) {
        return res.json({ totalUnread: 0, teams: {} });
      }
      
      let totalUnread = 0;
      const teamCounts: Record<number, number> = {};
      
      const channels = ['players', 'parents'];
      for (const teamId of activeTeamIds) {
        let teamTotal = 0;
        for (const channel of channels) {
          const messages = await storage.getMessagesByTeam(String(teamId), channel);
          const newMessages = since
            ? messages.filter((m: any) => new Date(m.createdAt) > new Date(since) && m.senderId !== userId)
            : messages.filter((m: any) => m.senderId !== userId);
          teamTotal += newMessages.length;
        }
        teamCounts[teamId] = teamTotal;
        totalUnread += teamTotal;
      }
      
      res.json({ totalUnread, teams: teamCounts });
    } catch (error: any) {
      console.error('Error fetching unread message counts:', error);
      res.status(500).json({ error: 'Failed to fetch unread counts' });
    }
  });

  // Legacy route (kept for backwards compatibility) - now supports channel query param
  app.get('/api/messages/team/:teamId', requireAuth, async (req: any, res) => {
    const { channel = 'players' } = req.query;
    const messages = await storage.getMessagesByTeam(req.params.teamId, channel as string);
    res.json(messages);
  });
  
  // Team-scoped message routes (used by TeamChat component)
  app.get('/api/teams/:teamId/messages', requireAuth, async (req: any, res) => {
    const { channel = 'players' } = req.query; // Default to players channel
    const messages = await storage.getMessagesByTeam(req.params.teamId, channel as string);
    res.json(messages);
  });
  
  app.post('/api/teams/:teamId/messages', requireAuth, async (req: any, res) => {
    const { message, messageType = 'text', profileId, channel = 'players' } = req.body;
    const teamId = parseInt(req.params.teamId);

    if (!['players', 'parents'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }

    // Security: Resolve effective sender (profile or authenticated user) first
    let validatedSenderId = req.user.id;
    if (profileId) {
      // Check if profileId is the authenticated user
      if (profileId === req.user.id) {
        validatedSenderId = profileId;
      } else {
        // Check if profileId is a child profile of the authenticated user
        const accountProfiles = await storage.getAccountProfiles(req.user.id) || [];
        const isValidProfile = accountProfiles.some((profile: any) => profile.id === profileId);
        if (isValidProfile) {
          validatedSenderId = profileId;
        }
        // If not valid, fall back to req.user.id (don't allow spoofing)
      }
    }

    // Check if the effective sender is muted in this channel
    const isMuted = await storage.isUserMuted(validatedSenderId, teamId, channel);
    if (isMuted) {
      return res.status(403).json({ error: 'You are muted in this channel' });
    }
    
    const messageData = {
      teamId: parseInt(req.params.teamId),
      senderId: validatedSenderId,
      content: message, // Database field is 'content'
      messageType,
      chatChannel: channel, // 'players' or 'parents'
    };
    
    const newMessage = await storage.createMessage(messageData);
    
    // Broadcast to WebSocket clients if available
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ 
            type: 'new_team_message', 
            teamId: parseInt(req.params.teamId),
            channel: channel, // Include channel in broadcast
            message: newMessage 
          }));
        }
      });
    }
    
    // Send push notification + in-app notification to team members about new message
    try {
      const team = await storage.getTeam(req.params.teamId);
      const sender = await storage.getUser(validatedSenderId);
      const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : 'Someone';
      
      if (team) {
        // Push notification for coach about player/parent messages
        if (team.coachId && validatedSenderId !== team.coachId) {
          const isFromParent = channel === 'parents';
          await pushNotifications.coachNewMessage(storage, team.coachId, parseInt(req.params.teamId), senderName, isFromParent);
        }

        // In-app notification for all team members except the sender
        const { db: notifDb } = await import("./db");
        const teamSchema = await import("../shared/schema");
        const { eq: eqOp, and: andOp } = await import("drizzle-orm");
        const memberships = await notifDb.select({ profileId: teamSchema.teamMemberships.profileId })
          .from(teamSchema.teamMemberships)
          .where(andOp(
            eqOp(teamSchema.teamMemberships.teamId, teamId),
            eqOp(teamSchema.teamMemberships.status, 'active')
          ));
        const recipientIds: string[] = [];
        for (const tm of memberships) {
          if (tm.profileId && tm.profileId !== validatedSenderId) {
            recipientIds.push(tm.profileId);
          }
        }
        if (team.coachId && team.coachId !== validatedSenderId && !recipientIds.includes(team.coachId)) {
          recipientIds.push(team.coachId);
        }
        
        if (recipientIds.length > 0) {
          const truncatedMsg = message.length > 80 ? message.substring(0, 80) + '...' : message;
          await adminNotificationService.createNotification({
            organizationId: req.user.organizationId,
            title: `💬 ${senderName} in ${team.name}`,
            message: truncatedMsg,
            types: ['notification'],
            recipientTarget: 'users',
            recipientUserIds: recipientIds,
            status: 'sent',
            deliveryChannels: ['in_app'],
            sentBy: 'system',
          });
        }
      }
    } catch (notifError: any) {
      console.error('⚠️ Message notification failed (non-fatal):', notifError.message);
    }
    
    res.json(newMessage);
  });
  
  // Legacy route (kept for backwards compatibility)
  app.post('/api/messages', requireAuth, async (req: any, res) => {
    const messageData = insertMessageSchema.parse(req.body);
    
    // Check if user is muted in this channel
    if (messageData.teamId) {
      const teamId = parseInt(messageData.teamId);
      const channel = messageData.chatChannel || 'players';
      const isMuted = await storage.isUserMuted(req.user.id, teamId, channel);
      if (isMuted) {
        return res.status(403).json({ error: 'You are muted in this channel' });
      }
    }
    
    const message = await storage.createMessage(messageData);
    
    // Broadcast to WebSocket clients if available
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'new_message', data: message }));
        }
      });
    }
    
    res.json(message);
  });
  
  // Delete a message (admin only)
  app.delete('/api/messages/:messageId', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      
      // Only admins can delete messages
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete messages' });
      }
      
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }
      
      await storage.deleteMessage(messageId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // Pin/unpin a message (admin only)
  app.patch('/api/messages/:messageId/pin', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can pin messages' });
      }
      const messageId = parseInt(req.params.messageId);
      if (isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
      }
      const { isPinned } = req.body;
      // Look up message server-side before updating so broadcast uses verified metadata
      const [msgRecord] = await db.select({ teamId: messagesTable.teamId, chatChannel: messagesTable.chatChannel })
        .from(messagesTable)
        .where(eq(messagesTable.id, messageId))
        .limit(1);
      if (!msgRecord) {
        return res.status(404).json({ error: 'Message not found' });
      }
      await storage.pinMessage(messageId, !!isPinned);
      // Broadcast to WebSocket clients so active chat sessions update immediately
      if (wss) {
        const broadcastChannel = msgRecord.chatChannel ?? 'players';
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'message_pinned', teamId: msgRecord.teamId, channel: broadcastChannel, messageId, isPinned: !!isPinned }));
          }
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error pinning message:', error);
      res.status(500).json({ error: 'Failed to pin message' });
    }
  });

  // Clear all messages in a team channel (admin only)
  app.delete('/api/messages/team/:teamId/channel/:channel', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can clear channels' });
      }
      const teamId = parseInt(req.params.teamId);
      const { channel } = req.params;
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }
      if (!['players', 'parents'].includes(channel)) {
        return res.status(400).json({ error: 'Invalid channel' });
      }
      await storage.clearChannelMessages(teamId, channel);
      // Broadcast to WebSocket clients so active chat sessions update immediately
      if (wss) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'channel_cleared', teamId, channel }));
          }
        });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error clearing channel:', error);
      res.status(500).json({ error: 'Failed to clear channel' });
    }
  });

  // Mute a user in a team channel (admin only)
  app.post('/api/teams/:teamId/mute', requireAuth, async (req: any, res) => {
    try {
      const { role, id: adminId } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can mute users' });
      }
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }
      const { userId, channel } = req.body;
      if (!userId || !['players', 'parents'].includes(channel)) {
        return res.status(400).json({ error: 'userId and valid channel are required' });
      }
      const mute = await storage.muteUser({ userId, teamId, channel, mutedBy: adminId });
      res.json(mute);
    } catch (error: any) {
      console.error('Error muting user:', error);
      res.status(500).json({ error: 'Failed to mute user' });
    }
  });

  // Unmute a user in a team channel (admin only)
  app.delete('/api/teams/:teamId/mute', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can unmute users' });
      }
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }
      const { userId, channel } = req.body;
      if (!userId || !['players', 'parents'].includes(channel)) {
        return res.status(400).json({ error: 'userId and valid channel are required' });
      }
      await storage.unmuteUser(userId, teamId, channel);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error unmuting user:', error);
      res.status(500).json({ error: 'Failed to unmute user' });
    }
  });

  // Get muted users for a team channel (admin only)
  app.get('/api/teams/:teamId/mutes', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can view mutes' });
      }
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }
      const { channel } = req.query;
      if (!channel || !['players', 'parents'].includes(channel as string)) {
        return res.status(400).json({ error: 'Valid channel query param required' });
      }
      const mutes = await storage.getMutedUsers(teamId, channel as string);
      res.json(mutes);
    } catch (error: any) {
      console.error('Error fetching mutes:', error);
      res.status(500).json({ error: 'Failed to fetch mutes' });
    }
  });

  // Check if current user (or a profile) is muted in a channel
  app.get('/api/teams/:teamId/mute-status', requireAuth, async (req: any, res) => {
    try {
      const { id: authUserId } = req.user;
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }
      const { channel, profileId } = req.query;
      if (!channel || !['players', 'parents'].includes(channel as string)) {
        return res.status(400).json({ error: 'Valid channel query param required' });
      }
      // Resolve effective sender: if profileId is provided and belongs to this user, use it
      let effectiveSenderId = authUserId;
      if (profileId && profileId !== authUserId) {
        const accountProfiles = await storage.getAccountProfiles(authUserId) || [];
        const isValid = accountProfiles.some((p: any) => p.id === profileId);
        if (isValid) {
          effectiveSenderId = profileId as string;
        }
      } else if (profileId === authUserId) {
        effectiveSenderId = profileId as string;
      }
      const muted = await storage.isUserMuted(effectiveSenderId, teamId, channel as string);
      res.json({ muted });
    } catch (error: any) {
      console.error('Error checking mute status:', error);
      res.status(500).json({ error: 'Failed to check mute status' });
    }
  });

  // =============================================
  // PAYMENT ROUTES
  // =============================================
  
  // Stripe Products endpoint
  app.get('/api/stripe/products', requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    try {
      // Fetch all products with their default prices expanded
      const products = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
        limit: 100,
      });
      
      // Fetch all prices to get additional pricing info
      const prices = await stripe.prices.list({
        active: true,
        limit: 100,
      });
      
      // Group prices by product
      const pricesByProduct: any = {};
      prices.data.forEach(price => {
        const productId = typeof price.product === 'string' ? price.product : price.product?.id;
        if (productId) {
          if (!pricesByProduct[productId]) {
            pricesByProduct[productId] = [];
          }
          pricesByProduct[productId].push(price);
        }
      });
      
      // Map products to include all prices
      const productsWithPrices = products.data.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        images: product.images,
        metadata: product.metadata,
        active: product.active,
        defaultPrice: product.default_price,
        prices: pricesByProduct[product.id] || [],
      }));
      
      res.json(productsWithPrices);
    } catch (error: any) {
      console.error("Error fetching Stripe products:", error);
      res.status(500).json({
        error: "Error fetching products",
        message: error.message,
      });
    }
  });

  // Fetch Stripe price details by ID - for linking existing prices
  app.get('/api/stripe/prices/:priceId', requireAuth, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
      const { priceId } = req.params;
      
      // Validate price ID format
      if (!priceId || !priceId.startsWith('price_')) {
        return res.status(400).json({ error: 'Invalid price ID format. Must start with "price_"' });
      }
      
      // Fetch the price from Stripe
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product'],
      });
      
      if (!price) {
        return res.status(404).json({ error: 'Price not found' });
      }
      
      // Get product details
      const product = typeof price.product === 'object' ? price.product : null;
      
      // Determine billing cycle
      let billingCycle = 'One-Time';
      let durationDays = 0;
      if (price.recurring) {
        if (price.recurring.interval === 'month') {
          billingCycle = 'Monthly';
          durationDays = 30 * (price.recurring.interval_count || 1);
        } else if (price.recurring.interval === 'year') {
          billingCycle = 'Annual';
          durationDays = 365 * (price.recurring.interval_count || 1);
        } else if (price.recurring.interval === 'week') {
          durationDays = 7 * (price.recurring.interval_count || 1);
        } else if (price.recurring.interval === 'day') {
          durationDays = price.recurring.interval_count || 1;
        }
      }
      
      res.json({
        priceId: price.id,
        productId: typeof price.product === 'string' ? price.product : (product as any)?.id,
        productName: (product as any)?.name || '',
        productDescription: (product as any)?.description || '',
        unitAmount: price.unit_amount || 0,
        currency: price.currency,
        billingCycle,
        durationDays,
        recurring: price.recurring ? {
          interval: price.recurring.interval,
          intervalCount: price.recurring.interval_count,
        } : null,
        active: price.active,
        metadata: price.metadata,
      });
    } catch (error: any) {
      console.error("Error fetching Stripe price:", error);
      if (error.code === 'resource_missing') {
        return res.status(404).json({ error: 'Price not found in Stripe' });
      }
      res.status(500).json({
        error: "Error fetching price",
        message: error.message,
      });
    }
  });

  app.get('/api/payments', requireAuth, async (req: any, res) => {
    const { organizationId } = req.user;
    const payments = await storage.getPaymentsByOrganization(organizationId);
    const enriched = await Promise.all(payments.map(async (p: any) => {
      if (p.userId) {
        const user = await storage.getUser(p.userId);
        if (user) {
          return { ...p, userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || undefined };
        }
      }
      return p;
    }));
    res.json(enriched);
  });
  
  app.get('/api/payments/user/:userId', requireAuth, async (req: any, res) => {
    const payments = await storage.getPaymentsByUser(req.params.userId);
    res.json(payments);
  });
  
  // Get payment history with Stripe subscription details
  app.get('/api/payments/history', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get all child player IDs if user is a parent
      const allUsers = await storage.getUsersByOrganization(req.user.organizationId);
      const childPlayerIds = allUsers
        .filter(u => u.parentId === userId || u.guardianId === userId)
        .map(u => u.id);
      
      // Get payments for the user and all their children
      const userIds = [userId, ...childPlayerIds];
      const allPayments = await Promise.all(
        userIds.map(id => storage.getPaymentsByUser(id))
      );
      const payments = allPayments.flat();
      
      // Enrich with Stripe data
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          let stripeData: any = null;
          
          if (payment.stripePaymentId && stripe) {
            try {
              // Check if it's a subscription or payment intent
              if (payment.stripePaymentId.startsWith('sub_')) {
                // It's a subscription
                const subscription = await stripe.subscriptions.retrieve(payment.stripePaymentId);
                stripeData = {
                  type: 'subscription',
                  status: subscription.status,
                  currentPeriodEnd: subscription.current_period_end,
                  currentPeriodStart: subscription.current_period_start,
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                  interval: subscription.items.data[0]?.price?.recurring?.interval,
                };
              } else if (payment.stripePaymentId.startsWith('pi_')) {
                // It's a payment intent
                const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
                stripeData = {
                  type: 'one_time',
                  status: paymentIntent.status,
                };
              } else if (payment.stripePaymentId.startsWith('cs_')) {
                // It's a checkout session
                const session = await stripe.checkout.sessions.retrieve(payment.stripePaymentId);
                stripeData = {
                  type: session.mode === 'subscription' ? 'subscription' : 'one_time',
                  status: session.payment_status,
                };
                
                // If it's a subscription, try to get the subscription ID
                if (session.subscription && typeof session.subscription === 'string') {
                  const subscription = await stripe.subscriptions.retrieve(session.subscription);
                  stripeData.subscriptionDetails = {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end,
                    currentPeriodStart: subscription.current_period_start,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    interval: subscription.items.data[0]?.price?.recurring?.interval,
                  };
                }
              }
            } catch (error: any) {
              console.error(`Error fetching Stripe data for ${payment.stripePaymentId}:`, error.message);
            }
          }
          
          // Get player info if applicable
          let playerInfo = null;
          if (payment.playerId) {
            const player = await storage.getUser(payment.playerId);
            if (player) {
              playerInfo = {
                id: player.id,
                firstName: player.firstName,
                lastName: player.lastName,
              };
            }
          }
          
          return {
            ...payment,
            stripeData,
            playerInfo,
          };
        })
      );
      
      // Sort by creation date (newest first)
      enrichedPayments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(enrichedPayments);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });
  
  app.post('/api/payments', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create payments' });
    }
    
    const paymentData = insertPaymentSchema.parse(req.body);
    
    // Validate playerId if provided
    if (paymentData.playerId) {
      const player = await storage.getUser(paymentData.playerId);
      
      // Ensure player exists
      if (!player) {
        return res.status(400).json({ 
          message: 'Invalid playerId: player does not exist' 
        });
      }
      
      // For non-admin users, ensure playerId belongs to them or their children
      if (role !== 'admin') {
        const payingUser = await storage.getUser(paymentData.userId);
        if (!payingUser) {
          return res.status(400).json({ 
            message: 'Invalid userId: user does not exist' 
          });
        }
        
        // Check if playerId is the paying user or a child of the paying user
        // Check both parentId and guardianId to handle all parent-child relationships
        const isValidPlayer = paymentData.playerId === paymentData.userId || 
                             (player as any).parentId === paymentData.userId ||
                             (player as any).guardianId === paymentData.userId;
        
        if (!isValidPlayer) {
          return res.status(400).json({ 
            message: 'Invalid playerId: player must be the paying user or their child' 
          });
        }
      }
    }
    
    const payment = await storage.createPayment(paymentData);
    res.json(payment);
  });
  
  app.patch('/api/payments/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update payments' });
    }
    
    const updated = await storage.updatePayment(req.params.id, req.body);
    res.json(updated);
  });

  // Refund a payment
  app.post('/api/payments/:id/refund', requireAuth, async (req: any, res) => {
    try {
      const { role, id: adminId, organizationId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(adminId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins can issue refunds' });
      }

      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: 'Invalid payment ID' });
      }

      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Org scoping: ensure the payment belongs to the admin's organization
      if (!payment.organizationId || payment.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Access denied: payment does not belong to your organization' });
      }

      if (payment.status === 'refunded') {
        return res.status(400).json({ message: 'Payment has already been fully refunded' });
      }

      const { amount, reasonCode, notes, refundFee } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Invalid refund amount' });
      }

      if (!reasonCode) {
        return res.status(400).json({ message: 'Reason code is required' });
      }

      // Calculate cumulative refunded amount to prevent over-refunding
      const existingRefunds = await storage.getRefundsByPayment(paymentId);
      const alreadyRefunded = existingRefunds
        .filter(r => r.status === 'succeeded')
        .reduce((sum, r) => sum + r.amount, 0);
      const refundable = payment.amount - alreadyRefunded;

      if (amount > refundable) {
        return res.status(400).json({
          message: `Refund amount exceeds refundable balance. Max refundable: $${(refundable / 100).toFixed(2)}`,
        });
      }

      let stripeRefundId: string | undefined;
      let clearedAt: string | undefined;

      // Use org-aware Stripe client (handles connect accounts and org-specific keys)
      const orgStripe = await getStripeForOrg(organizationId);

      let refundStatus: string = 'succeeded';

      // Process Stripe refund if payment has a Stripe payment ID
      if (payment.stripePaymentId) {
        // If payment has a Stripe ID but no Stripe client is available, fail explicitly
        if (!orgStripe) {
          return res.status(500).json({ message: 'Stripe is not configured for this organization. Cannot process refund.' });
        }

        try {
          const refundParams: any = { amount };

          // Determine what to refund based on the stripe payment ID type
          if (payment.stripePaymentId.startsWith('pi_')) {
            refundParams.payment_intent = payment.stripePaymentId;
          } else if (payment.stripePaymentId.startsWith('ch_')) {
            refundParams.charge = payment.stripePaymentId;
          } else if (payment.stripePaymentId.startsWith('cs_')) {
            // Checkout session - retrieve to get the payment intent
            const session = await orgStripe.checkout.sessions.retrieve(payment.stripePaymentId);
            if (session.payment_intent && typeof session.payment_intent === 'string') {
              refundParams.payment_intent = session.payment_intent;
            } else {
              return res.status(400).json({ message: 'Cannot refund: no payment intent found for this checkout session' });
            }
          } else {
            return res.status(400).json({ message: 'Cannot refund this type of payment via Stripe' });
          }

          // Optionally refund the application fee
          if (refundFee) {
            refundParams.refund_application_fee = true;
          }

          const stripeRefund = await orgStripe.refunds.create(refundParams);
          stripeRefundId = stripeRefund.id;
          // Use actual Stripe refund status: 'pending', 'succeeded', or 'failed'
          refundStatus = stripeRefund.status || 'pending';
          // Only set clearedAt when Stripe confirms it succeeded
          if (refundStatus === 'succeeded') {
            clearedAt = new Date().toISOString();
          }
        } catch (stripeError: any) {
          console.error('Stripe refund error:', stripeError);
          return res.status(400).json({ message: `Stripe refund failed: ${stripeError.message}` });
        }
      } else {
        // No Stripe payment ID - record the refund internally as succeeded immediately
        refundStatus = 'succeeded';
        clearedAt = new Date().toISOString();
      }

      // Only update payment status when the refund has actually succeeded
      // (Stripe refunds can be 'pending' for bank transfers, etc.)
      if (refundStatus === 'succeeded') {
        const totalRefunded = alreadyRefunded + amount;
        const isFullRefund = totalRefunded >= payment.amount;
        const newStatus = isFullRefund ? 'refunded' : 'partially_refunded';
        await storage.updatePayment(req.params.id, { status: newStatus });
      }
      const updatedPayment = await storage.getPayment(req.params.id);

      // Record the refund
      const refundRecord = await storage.createRefund({
        paymentId,
        organizationId: payment.organizationId || organizationId,
        stripeRefundId,
        amount,
        reasonCode,
        notes: notes || null,
        initiatedBy: adminId,
        refundedFee: refundFee || false,
        status: refundStatus,
        clearedAt: clearedAt || null,
      });

      res.json({
        refund: refundRecord,
        payment: updatedPayment || payment,
      });
    } catch (error: any) {
      console.error('Refund error:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  });

  // Get refunds for a payment
  app.get('/api/payments/:id/refunds', requireAuth, async (req: any, res) => {
    try {
      const { role, id: adminId, organizationId } = req.user;
      const isAdminUser = role === 'admin' || await hasAdminProfile(adminId, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins can view refunds' });
      }

      const paymentId = parseInt(req.params.id);
      if (isNaN(paymentId)) {
        return res.status(400).json({ message: 'Invalid payment ID' });
      }

      // Org scoping: verify the payment belongs to the admin's organization
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      if (!payment.organizationId || payment.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Access denied: payment does not belong to your organization' });
      }

      const refunds = await storage.getRefundsByPayment(paymentId);
      res.json(refunds);
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      res.status(500).json({ message: 'Failed to fetch refunds' });
    }
  });
  
  // =============================================
  // WAIVER ROUTES
  // =============================================
  
  app.get('/api/waivers', optionalAuth, async (req: any, res) => {
    const organizationId = req.user?.organizationId || 'default-org';
    const waivers = await storage.getWaiversByOrganization(organizationId);
    res.json(waivers);
  });
  
  app.get('/api/waivers/:id', async (req: any, res) => {
    const waiver = await storage.getWaiver(req.params.id);
    if (!waiver) {
      return res.status(404).json({ message: 'Waiver not found' });
    }
    res.json(waiver);
  });
  
  app.post('/api/waivers', requireAuth, async (req: any, res) => {
    const { role, organizationId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create waivers' });
    }
    
    const waiverData = {
      ...req.body,
      organizationId,
    };
    const waiver = await storage.createWaiver(waiverData);
    res.json(waiver);
  });
  
  app.patch('/api/waivers/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update waivers' });
    }
    
    const updated = await storage.updateWaiver(req.params.id, req.body);
    res.json(updated);
  });
  
  app.delete('/api/waivers/:id', requireAuth, async (req: any, res) => {
    const { role } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete waivers' });
    }
    
    await storage.deleteWaiver(req.params.id);
    res.json({ success: true });
  });

  // =============================================
  // WAIVER VERSION ROUTES
  // =============================================

  // Get all versions for a waiver
  app.get('/api/waivers/:waiverId/versions', requireAuth, async (req: any, res) => {
    const versions = await db.select()
      .from(waiverVersions)
      .where(eq(waiverVersions.waiverId, req.params.waiverId))
      .orderBy(desc(waiverVersions.version));
    res.json(versions);
  });

  // Get active version of a waiver
  app.get('/api/waivers/:waiverId/active-version', async (req: any, res) => {
    const [version] = await db.select()
      .from(waiverVersions)
      .where(
        and(
          eq(waiverVersions.waiverId, req.params.waiverId),
          eq(waiverVersions.isActive, true)
        )
      )
      .limit(1);
    
    if (!version) {
      return res.status(404).json({ message: 'No active version found' });
    }
    res.json(version);
  });

  // Create a new version (draft)
  app.post('/api/waivers/:waiverId/versions', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create waiver versions' });
    }

    // Get the latest version number
    const [latestVersion] = await db.select({ maxVersion: sql<number>`MAX(version)` })
      .from(waiverVersions)
      .where(eq(waiverVersions.waiverId, req.params.waiverId));

    const newVersion = (latestVersion?.maxVersion || 0) + 1;

    const [version] = await db.insert(waiverVersions)
      .values({
        waiverId: req.params.waiverId,
        version: newVersion,
        title: req.body.title,
        content: req.body.content,
        requiresScroll: req.body.requiresScroll ?? true,
        requiresCheckbox: req.body.requiresCheckbox ?? true,
        checkboxLabel: req.body.checkboxLabel,
        isActive: false, // Draft by default
      })
      .returning();

    res.json(version);
  });

  // Publish a version (makes it active, deactivates others, supersedes old signatures)
  app.post('/api/waivers/:waiverId/versions/:versionId/publish', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can publish waiver versions' });
    }

    const versionId = parseInt(req.params.versionId);
    const waiverId = req.params.waiverId;

    // Get all version IDs for this waiver (to mark their signatures as superseded)
    const allVersions = await db.select({ id: waiverVersions.id })
      .from(waiverVersions)
      .where(eq(waiverVersions.waiverId, waiverId));
    
    const allVersionIds = allVersions.map(v => v.id);

    // Mark all existing signatures for this waiver as superseded
    // (users will need to re-sign the new version)
    if (allVersionIds.length > 0) {
      await db.update(waiverSignatures)
        .set({ status: 'superseded' })
        .where(
          and(
            inArray(waiverSignatures.waiverVersionId, allVersionIds),
            eq(waiverSignatures.status, 'valid')
          )
        );
    }

    // Deactivate all versions of this waiver
    await db.update(waiverVersions)
      .set({ isActive: false })
      .where(eq(waiverVersions.waiverId, waiverId));

    // Activate this version
    const [publishedVersion] = await db.update(waiverVersions)
      .set({ 
        isActive: true, 
        publishedAt: new Date().toISOString(),
        publishedBy: userId,
      })
      .where(eq(waiverVersions.id, versionId))
      .returning();

    res.json(publishedVersion);
  });

  // =============================================
  // WAIVER SIGNATURE ROUTES
  // =============================================

  // Get signatures for a profile
  app.get('/api/profiles/:profileId/waiver-signatures', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const profileId = req.params.profileId;

    // Users can view their own or their children's signatures
    // Admins can view anyone's
    if (role !== 'admin') {
      const profile = await storage.getUser(profileId);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const isOwnProfile = profile.id === userId;
      const isChildProfile = profile.accountHolderId === userId || profile.parentId === userId;
      if (!isOwnProfile && !isChildProfile) {
        return res.status(403).json({ message: 'Not authorized to view these signatures' });
      }
    }

    const signatures = await db.select({
      signature: waiverSignatures,
      version: waiverVersions,
      waiver: waivers,
    })
      .from(waiverSignatures)
      .innerJoin(waiverVersions, eq(waiverSignatures.waiverVersionId, waiverVersions.id))
      .innerJoin(waivers, eq(waiverVersions.waiverId, waivers.id))
      .where(
        and(
          eq(waiverSignatures.profileId, profileId),
          eq(waiverSignatures.status, 'valid')
        )
      );

    res.json(signatures);
  });

  // Sign a waiver (create signature)
  app.post('/api/waiver-signatures', requireAuth, async (req: any, res) => {
    const { id: userId } = req.user;
    const { waiverVersionId, profileId, metadata } = req.body;

    // Verify user can sign for this profile
    const profile = await storage.getUser(profileId);
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const isOwnProfile = profile.id === userId;
    const isChildProfile = profile.accountHolderId === userId || profile.parentId === userId;
    if (!isOwnProfile && !isChildProfile) {
      return res.status(403).json({ message: 'Not authorized to sign for this profile' });
    }

    // Mark any existing signatures for the same waiver as superseded
    const [version] = await db.select()
      .from(waiverVersions)
      .where(eq(waiverVersions.id, waiverVersionId));

    if (version) {
      // Get all version IDs for this waiver
      const allVersions = await db.select({ id: waiverVersions.id })
        .from(waiverVersions)
        .where(eq(waiverVersions.waiverId, version.waiverId));
      
      const allVersionIds = allVersions.map(v => v.id);

      // Mark old signatures as superseded
      if (allVersionIds.length > 0) {
        await db.update(waiverSignatures)
          .set({ status: 'superseded' })
          .where(
            and(
              eq(waiverSignatures.profileId, profileId),
              inArray(waiverSignatures.waiverVersionId, allVersionIds),
              eq(waiverSignatures.status, 'valid')
            )
          );
      }
    }

    // Create new signature
    const [signature] = await db.insert(waiverSignatures)
      .values({
        waiverVersionId,
        profileId,
        signedBy: userId,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        metadata: metadata || {},
        status: 'valid',
      })
      .returning();

    res.json(signature);
  });

  // Check if profile has signed required waivers
  app.get('/api/profiles/:profileId/waiver-status', requireAuth, async (req: any, res) => {
    const profileId = req.params.profileId;
    const organizationId = req.user?.organizationId || 'default-org';

    // Get all active waiver versions for the organization
    const activeWaivers = await db.select({
      waiver: waivers,
      version: waiverVersions,
    })
      .from(waivers)
      .innerJoin(waiverVersions, eq(waivers.id, waiverVersions.waiverId))
      .where(
        and(
          eq(waivers.organizationId, organizationId),
          eq(waivers.isActive, true),
          eq(waiverVersions.isActive, true)
        )
      );

    // Get profile's valid signatures
    const signatures = await db.select()
      .from(waiverSignatures)
      .where(
        and(
          eq(waiverSignatures.profileId, profileId),
          eq(waiverSignatures.status, 'valid')
        )
      );

    const signedVersionIds = new Set(signatures.map(s => s.waiverVersionId));

    const waiverStatus = activeWaivers.map(({ waiver, version }) => ({
      waiverId: waiver.id,
      waiverName: waiver.name,
      versionId: version.id,
      versionNumber: version.version,
      isSigned: signedVersionIds.has(version.id),
      isRequired: waiver.isBuiltIn, // Built-in waivers are required
    }));

    const allRequiredSigned = waiverStatus
      .filter(w => w.isRequired)
      .every(w => w.isSigned);

    res.json({
      waivers: waiverStatus,
      allRequiredSigned,
    });
  });

  // =============================================
  // PROGRAM ROUTES
  // =============================================
  
  app.get('/api/programs', optionalAuth, async (req: any, res) => {
    const organizationId = req.user?.organizationId || 'default-org';
    const programs = await storage.getProgramsByOrganization(organizationId);

    const hasMembersOnlyPrograms = programs.some((p: any) => p.visibility === 'members_only');
    if (!hasMembersOnlyPrograms) {
      return res.json(programs);
    }

    if (req.user) {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin' || await hasAdminProfile(userId, organizationId);
      if (isAdmin) {
        return res.json(programs);
      }

      const currentUser = await storage.getUser(userId);
      const rootAccountHolderId = currentUser?.accountHolderId || userId;
      const enrollments = await db.select()
        .from(productEnrollments)
        .where(
          or(
            eq(productEnrollments.accountHolderId, rootAccountHolderId),
            eq(productEnrollments.profileId, userId)
          )
        );
      // Only non-tryout active enrollments count as full membership (tryout enrollment does NOT unlock member pricing)
      const hasActiveEnrollment = enrollments.some((e: any) => e.status === 'active' && !e.isTryout);

      if (hasActiveEnrollment) {
        return res.json(programs);
      }

      // Non-member logged-in user: return all programs but hide pricing for members_only ones
      const programsWithVisibility = programs.map((p: any) => {
        if (p.visibility === 'members_only') {
          return { ...p, priceHidden: true, price: null, pricingOptions: [] };
        }
        return p;
      });
      return res.json(programsWithVisibility);
    }

    // Unauthenticated user: return all programs but hide pricing for members_only ones
    const programsWithVisibility = programs.map((p: any) => {
      if (p.visibility === 'members_only') {
        return { ...p, priceHidden: true, price: null, pricingOptions: [] };
      }
      return p;
    });
    res.json(programsWithVisibility);
  });
  
  // Store products endpoint - returns products with productCategory = 'goods'
  app.get('/api/store-products', optionalAuth, async (req: any, res) => {
    try {
      const organizationId = req.user?.organizationId || 'default-org';
      const allProducts = await storage.getProgramsByOrganization(organizationId);
      const storeProducts = allProducts.filter((p: any) => p.productCategory === 'goods');
      res.json(storeProducts);
    } catch (error: any) {
      console.error('Error fetching store products:', error);
      res.status(500).json({ message: 'Failed to fetch store products' });
    }
  });
  
  app.get('/api/store-product/:productId', async (req: any, res) => {
    try {
      const product = await storage.getProgram(req.params.productId);
      if (!product || product.productCategory !== 'goods') {
        return res.status(404).json({ error: 'Product not found' });
      }
      const totalStock = product.inventoryCount ?? null;
      const sizeStockMap = (product.sizeStock && typeof product.sizeStock === 'object') ? product.sizeStock as Record<string, number> : null;
      let inStock = true;
      if (totalStock !== null && totalStock <= 0) {
        inStock = false;
      }
      if (sizeStockMap && Object.keys(sizeStockMap).length > 0) {
        const totalSizeStock = Object.values(sizeStockMap).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
        if (totalSizeStock <= 0) inStock = false;
      }
      res.json({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        inventoryCount: totalStock,
        sizeStock: sizeStockMap,
        inventorySizes: product.inventorySizes || [],
        inStock,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch product', message: error.message });
    }
  });

  app.post('/api/store-checkout/:productId', async (req: any, res) => {
    try {
      const productId = req.params.productId;
      const product = await storage.getProgram(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (product.productCategory !== 'goods') {
        return res.status(400).json({ error: 'This endpoint is only for store items' });
      }
      if (!product.price || product.price <= 0) {
        return res.status(400).json({ error: 'Product has no valid price' });
      }

      const orgId = product.organizationId || 'default-org';
      const orgStripe = await getStripeForOrg(orgId);
      if (!orgStripe) {
        return res.status(500).json({ error: 'Stripe is not configured for this organization' });
      }

      const origin = `${req.protocol}://${req.get('host')}`;

      const storeLineItems: any[] = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ];

      // Add service fee
      const { lineItem: storeFeeLineItem, feeCents: storeServiceFeeCents } = await getServiceFeeLineItem(product.price);
      storeLineItems.push(storeFeeLineItem);

      const storeOrgName = await getOrgDisplayName(orgId);
      const sessionParams: any = {
        line_items: storeLineItems,
        mode: 'payment',
        success_url: `${origin}/store-checkout-success?product=${encodeURIComponent(product.name)}`,
        cancel_url: `${origin}/store-checkout-cancel`,
        payment_intent_data: {
          statement_descriptor: storeOrgName.substring(0, 22),
        },
        metadata: {
          productId,
          productCategory: 'goods',
          source: 'qr_code',
        },
      };

      const connectResult = await applyConnectChargeParams(sessionParams, orgId, 'payment', storeServiceFeeCents);
      verifyConnectRouting(sessionParams, 'payment', orgId, connectResult, { applicationFeeAmount: storeServiceFeeCents, checkoutType: 'qr_store_checkout' });

      console.log(`[Connect] qr_store_checkout: creating session for org ${orgId}`, {
        payment_intent_data: sessionParams.payment_intent_data ?? null,
      });

      const session = await orgStripe.checkout.sessions.create(sessionParams);
      res.json({ sessionUrl: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error('Error creating store checkout session:', error);
      res.status(500).json({ error: 'Failed to create checkout session', message: error.message });
    }
  });

  app.post('/api/programs', requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins can create programs' });
      }
      
      const parsedData = insertProgramSchema.parse(req.body);
      
      // Deep clone the parsed data to avoid mutating frozen Zod output
      // Use type-preserving deepClone instead of JSON.stringify to preserve Date types
      const programData = deepClone(parsedData);
      
      // Assign stable server-side IDs to pricing options BEFORE creating the program
      if (programData.pricingOptions && programData.pricingOptions.length > 0) {
        programData.pricingOptions = assignStablePricingOptionIds(programData.pricingOptions);
      }
      
      // Create the program with stable pricing option IDs
      let program = await storage.createProgram(programData);
      
      // Sync with Stripe if there are pricing options
      if (programData.pricingOptions && programData.pricingOptions.length > 0) {
        const { stripeProductId, updatedPricingOptions } = await syncProgramWithStripe(
          program,
          programData.pricingOptions // Use the already-ID'd options
        );
        
        // Update program with Stripe IDs (stable IDs are already preserved)
        if (stripeProductId || updatedPricingOptions.some((opt: any) => opt.stripePriceId)) {
          program = await storage.updateProgram(program.id, {
            stripeProductId,
            pricingOptions: updatedPricingOptions,
          }) || program;
        }
      }
      
      res.json(program);
    } catch (error: any) {
      console.error('Error creating program/product:', error);
      // Return 400 for Zod validation errors, 500 for server errors
      if (error.name === 'ZodError') {
        res.status(400).json({ message: error.errors?.[0]?.message || 'Validation error' });
      } else {
        res.status(500).json({ message: 'Failed to create product' });
      }
    }
  });
  
  app.patch('/api/programs/:id', requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins can update programs' });
      }
      
      // Get existing program for Stripe sync
      const existingProgram = await storage.getProgram(req.params.id);
      if (!existingProgram) {
        return res.status(404).json({ message: 'Program not found' });
      }
      
      let updateData = { ...req.body };
    
    // Handle pricing options with stable IDs and deep-merge
    if (req.body.pricingOptions && req.body.pricingOptions.length > 0) {
      // Map existing options by their stable ID for deep merging
      const existingOptionsById = new Map<string, any>();
      if (existingProgram.pricingOptions) {
        for (const opt of existingProgram.pricingOptions) {
          if (opt.id && opt.id.startsWith('po_')) {
            existingOptionsById.set(opt.id, opt);
          }
        }
      }
      
      // Deep-merge incoming options: use existing option as base, overlay only defined client changes
      const mergedOptions = req.body.pricingOptions.map((incomingOpt: any) => {
        // If incoming option has a stable ID that exists, deep-merge with existing
        if (incomingOpt.id && incomingOpt.id.startsWith('po_') && existingOptionsById.has(incomingOpt.id)) {
          const existingOpt = existingOptionsById.get(incomingOpt.id);
          
          // Build merged option: start with deep copy of existing option
          const merged: any = deepClone(existingOpt);
          
          // Overlay fields from incoming, but skip undefined and null
          // Empty arrays [] are valid and should be overlayed
          // This preserves nested collections unless explicitly cleared
          for (const key of Object.keys(incomingOpt)) {
            const value = incomingOpt[key];
            
            // Skip undefined - means "not provided"
            if (value === undefined) {
              continue;
            }
            
            // Skip null - means "not provided" in JSON/form serialization
            // Exception: if existing value is truthy and incoming is null, preserve existing
            if (value === null) {
              continue;
            }
            
            // Accept all other values including false, 0, empty string, empty arrays
            merged[key] = value;
          }
          
          return merged;
        }
        // New option - needs stable ID
        if (!incomingOpt.id || !incomingOpt.id.startsWith('po_')) {
          return {
            ...incomingOpt,
            id: generateStablePricingOptionId(),
          };
        }
        return incomingOpt;
      });
      
      const programForSync = {
        ...existingProgram,
        ...updateData,
        id: req.params.id,
      };
      
      const { stripeProductId, updatedPricingOptions } = await syncProgramWithStripe(
        programForSync,
        mergedOptions
      );
      
      // Include Stripe IDs in update
      updateData.stripeProductId = stripeProductId;
      updateData.pricingOptions = updatedPricingOptions;
    }
    
    const updated = await storage.updateProgram(req.params.id, updateData);
    res.json(updated);
    } catch (error: any) {
      console.error('Error updating program:', error);
      res.status(500).json({ message: 'Failed to update program', error: error.message });
    }
  });
  
  app.delete('/api/programs/:id', requireAuth, async (req: any, res) => {
    const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
    if (!isAdminUser) {
      return res.status(403).json({ message: 'Only admins can delete programs' });
    }
    
    try {
      // deleteProgram now automatically cancels all enrollments before deletion
      await storage.deleteProgram(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting program:', error);
      res.status(500).json({ message: 'Failed to delete program', error: error.message });
    }
  });

  app.get('/api/programs/:id', optionalAuth, async (req: any, res) => {
    try {
      const program = await storage.getProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: 'Program not found' });
      }

      if (program.visibility === 'members_only') {
        // Non-member users see the program but with price hidden (same behavior as list endpoint)
        let isMember = false;
        if (req.user) {
          const userId = req.user.id;
          const organizationId = req.user.organizationId;
          const isAdmin = req.user.role === 'admin' || await hasAdminProfile(userId, organizationId);
          if (isAdmin) {
            isMember = true;
          } else {
            const currentUser = await storage.getUser(userId);
            const rootAccountHolderId = currentUser?.accountHolderId || userId;
            const enrollments = await db.select()
              .from(productEnrollments)
              .where(
                or(
                  eq(productEnrollments.accountHolderId, rootAccountHolderId),
                  eq(productEnrollments.profileId, userId)
                )
              );
            // Tryout-only enrollments do not count as full member access for program visibility
            isMember = enrollments.some((e: any) => e.status === 'active' && !e.isTryout);
          }
        }
        if (!isMember) {
          // Return program with price hidden — do not 404, consistent with list endpoint behavior
          return res.json({ ...program, priceHidden: true, price: null, pricingOptions: [] });
        }
      }

      res.json(program);
    } catch (error: any) {
      console.error('Error fetching program:', error);
      res.status(500).json({ message: 'Failed to fetch program' });
    }
  });

  // Get suggested add-ons for a program
  app.get('/api/programs/:programId/suggested-add-ons', async (req: any, res) => {
    try {
      const { programId } = req.params;
      const addOnsWithProducts = await storage.getSuggestedAddOnsWithProducts(programId);
      res.json(addOnsWithProducts);
    } catch (error: any) {
      console.error('Error fetching suggested add-ons:', error);
      res.status(500).json({ message: 'Failed to fetch suggested add-ons' });
    }
  });
  
  // Set suggested add-ons for a program (admin only)
  app.put('/api/programs/:programId/suggested-add-ons', requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins can manage suggested add-ons' });
      }
      
      const { programId } = req.params;
      const { productIds } = req.body;
      
      if (!Array.isArray(productIds)) {
        return res.status(400).json({ message: 'productIds must be an array' });
      }
      
      await storage.setProgramSuggestedAddOns(programId, productIds);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error setting suggested add-ons:', error);
      res.status(500).json({ message: 'Failed to set suggested add-ons' });
    }
  });
  
  // Get programs that suggest a specific product as an add-on
  app.get('/api/products/:productId/suggested-for-programs', async (req: any, res) => {
    try {
      const { productId } = req.params;
      const programIds = await storage.getProductsWithSuggestedPrograms(productId);
      res.json({ programIds });
    } catch (error: any) {
      console.error('Error fetching suggested programs:', error);
      res.status(500).json({ message: 'Failed to fetch suggested programs' });
    }
  });
  
  // Update which programs suggest a product as an add-on (admin only)
  app.put('/api/products/:productId/suggested-for-programs', requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ message: 'Only admins can manage suggested add-ons' });
      }
      
      const { productId } = req.params;
      const { programIds } = req.body;
      
      if (!Array.isArray(programIds)) {
        return res.status(400).json({ message: 'programIds must be an array' });
      }
      
      // Remove this product from all programs first
      const currentPrograms = await storage.getProductsWithSuggestedPrograms(productId);
      for (const programId of currentPrograms) {
        await storage.removeSuggestedAddOn(programId, productId);
      }
      
      // Add to the new programs
      for (const programId of programIds) {
        await storage.addSuggestedAddOn({
          programId,
          productId,
          displayOrder: 0,
          isRequired: false,
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating suggested programs:', error);
      res.status(500).json({ message: 'Failed to update suggested programs' });
    }
  });

  // Get subgroups (teams/levels/groups) for a specific program
  app.get('/api/programs/:programId/subgroups', async (req: any, res) => {
    try {
      const { programId } = req.params;
      
      // Get the program to check if it has subgroups
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ message: 'Program not found' });
      }
      
      // If program doesn't have subgroups, return empty array
      if (program.hasSubgroups === false) {
        return res.json({ 
          program,
          subgroups: [],
          subgroupLabel: program.subgroupLabel || 'Team'
        });
      }
      
      // Get teams/groups linked to this program
      const subgroups = await db.select()
        .from(teams)
        .where(eq(teams.programId, programId));
      
      res.json({
        program,
        subgroups,
        subgroupLabel: program.subgroupLabel || 'Team'
      });
    } catch (error: any) {
      console.error('Error fetching program subgroups:', error);
      res.status(500).json({ message: 'Failed to fetch program subgroups' });
    }
  });

  // Get schedule availability for a program (time slots blocked by existing events)
  app.get('/api/programs/:id/schedule-availability', requireAuth, async (req: any, res) => {
    try {
      const { id: programId } = req.params;
      const { date, playerId: queryPlayerId } = req.query; // ISO date string like "2026-02-10"
      
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      if (!program.scheduleRequestEnabled) {
        return res.status(400).json({ error: 'Schedule request is not enabled for this program' });
      }
      
      const sessionLength = program.sessionLengthMinutes || 60;
      
      const targetDate = date ? new Date(date as string) : new Date();
      const orgId = program.organizationId;
      
      // Check if the requesting player has a tryout enrollment with a recommended team
      let checkPlayerId = req.user.id;
      if (queryPlayerId && queryPlayerId !== req.user.id) {
        // Verify the requesting user owns or manages the specified player
        const queriedPlayer = await storage.getUser(queryPlayerId as string);
        const isOwned = queriedPlayer &&
          ((queriedPlayer as any).parentId === req.user.id ||
           (queriedPlayer as any).guardianId === req.user.id ||
           (queriedPlayer as any).accountHolderId === req.user.id);
        if (isOwned) {
          checkPlayerId = queryPlayerId as string;
        }
        // If not owned, silently fall back to the requesting user's own context
      }
      const playerEnrollments = await storage.getActiveEnrollmentsWithCredits(checkPlayerId);
      const tryoutEnrollment = playerEnrollments.find((e: any) => e.programId === programId && e.isTryout === true);
      const recommendedTeamId = tryoutEnrollment?.recommendedTeamId ?? null;

      // Get all events for this organization
      const allEvents = await storage.getEventsByOrganization(orgId);

      // For tryout players with a recommended team: return team's upcoming practice/skills events
      // as selectable slots within the next 30 days (not game events, not past events)
      if (recommendedTeamId && tryoutEnrollment) {
        const now = new Date();
        const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const NON_GAME_TYPES = ['practice', 'skills', 'training', 'skill', 'clinic', 'workout'];
        
        const teamEvents = allEvents.filter((event: any) => {
          if (event.teamId !== recommendedTeamId) return false;
          if (event.isActive === false || event.status === 'cancelled') return false;
          const eventStart = new Date(event.startTime);
          if (eventStart <= now || eventStart > thirtyDaysOut) return false;
          // Exclude game events
          const type = (event.eventType || event.type || '').toLowerCase();
          if (type === 'game') return false;
          // Only include practice/skills events (if type is set), otherwise include non-game events
          if (type && !NON_GAME_TYPES.some(t => type.includes(t))) return false;
          return true;
        });

        // Sort by start time
        teamEvents.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        // Convert team events to selectable slots (all available by default for tryout)
        const slots: Array<{ startTime: string; endTime: string; available: boolean; eventTitle?: string; eventId?: number; eventType?: string }> = 
          teamEvents.map((event: any) => ({
            startTime: event.startTime,
            endTime: event.endTime,
            available: true,
            eventTitle: event.title,
            eventId: event.id,
            eventType: event.eventType || event.type || 'practice',
          }));

        return res.json({
          programId,
          programName: program.name,
          sessionLengthMinutes: sessionLength,
          date: targetDate.toISOString().split('T')[0],
          slots,
          blockedEvents: [],
          isTryoutMode: true,
          recommendedTeamId,
        });
      }

      // Non-tryout path: use admin-defined availability windows
      const availabilitySlots = await storage.getAvailabilitySlotsByProgram(programId);
      const dayOfWeek = targetDate.getDay(); // 0=Sunday, 6=Saturday
      
      // Filter windows matching this day of week
      const dayWindows = availabilitySlots.filter((s: any) => s.dayOfWeek === dayOfWeek);
      
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const blockedEvents = allEvents.filter((event: any) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return eventStart < dayEnd && eventEnd > dayStart && event.isActive !== false && event.status !== 'cancelled';
      });
      
      // Generate time slots from admin-defined availability windows
      const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];
      
      if (dayWindows.length === 0) {
        // No availability windows defined for this day - fallback to 8 AM - 8 PM
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(8, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(20, 0, 0, 0);
        
        let currentSlot = new Date(startOfDay);
        while (currentSlot.getTime() + sessionLength * 60 * 1000 <= endOfDay.getTime()) {
          const slotEnd = new Date(currentSlot.getTime() + sessionLength * 60 * 1000);
          const isBlocked = blockedEvents.some((event: any) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            return currentSlot < eventEnd && slotEnd > eventStart;
          });
          slots.push({ startTime: currentSlot.toISOString(), endTime: slotEnd.toISOString(), available: !isBlocked });
          currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000);
        }
      } else {
        // Use admin-defined windows
        for (const window of dayWindows) {
          const [startH, startM] = window.startTime.split(':').map(Number);
          const [endH, endM] = window.endTime.split(':').map(Number);
          
          const windowStart = new Date(targetDate);
          windowStart.setHours(startH, startM, 0, 0);
          const windowEnd = new Date(targetDate);
          windowEnd.setHours(endH, endM, 0, 0);
          
          let currentSlot = new Date(windowStart);
          while (currentSlot.getTime() + sessionLength * 60 * 1000 <= windowEnd.getTime()) {
            const slotEnd = new Date(currentSlot.getTime() + sessionLength * 60 * 1000);
            const isBlocked = blockedEvents.some((event: any) => {
              const eventStart = new Date(event.startTime);
              const eventEnd = new Date(event.endTime);
              return currentSlot < eventEnd && slotEnd > eventStart;
            });
            slots.push({ startTime: currentSlot.toISOString(), endTime: slotEnd.toISOString(), available: !isBlocked });
            currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000);
          }
        }
      }
      
      res.json({
        programId,
        programName: program.name,
        sessionLengthMinutes: sessionLength,
        date: targetDate.toISOString().split('T')[0],
        slots,
        blockedEvents: blockedEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching schedule availability:', error);
      res.status(500).json({ error: 'Failed to fetch schedule availability' });
    }
  });

  // Create a schedule request (single or recurring weekly sessions)
  app.post('/api/programs/:id/schedule-request', requireAuth, async (req: any, res) => {
    try {
      const { id: programId } = req.params;
      const { startTime, playerId, recurring } = req.body;
      const isRecurring = recurring !== false;
      
      if (!startTime) {
        return res.status(400).json({ error: 'Start time is required' });
      }
      
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      if (!program.scheduleRequestEnabled) {
        return res.status(400).json({ error: 'Schedule request is not enabled for this program' });
      }
      
      const sessionLength = program.sessionLengthMinutes || 60;
      const userId = req.user.id;
      const orgId = program.organizationId;
      
      // Validate the player belongs to the authenticated user
      const targetPlayerId = playerId || userId;
      if (playerId && playerId !== userId) {
        const player = await storage.getUser(playerId);
        if (!player) {
          return res.status(400).json({ error: 'Player not found' });
        }
        const isValidPlayer = (player as any).parentId === userId || 
                              (player as any).guardianId === userId ||
                              (player as any).accountHolderId === userId;
        if (!isValidPlayer) {
          return res.status(403).json({ error: 'Not authorized to schedule for this player' });
        }
      }
      
      // Check for active enrollment with available credits
      const enrollments = await storage.getActiveEnrollmentsWithCredits(targetPlayerId);
      const enrollment = enrollments.find((e: any) => e.programId === programId && e.status === 'active');
      if (!enrollment) {
        return res.status(403).json({ error: 'Active enrollment required to schedule a session' });
      }
      
      // Cancel any existing pending schedule requests for this enrollment (edit/replace flow)
      const allOrgEvents = await storage.getEventsByOrganization(orgId);
      const existingPending = allOrgEvents.filter((e: any) => 
        e.enrollmentId === enrollment.id && e.status === 'pending' && e.scheduleRequestSource
      );
      for (const pendingEvent of existingPending) {
        await storage.updateEvent(pendingEvent.id, { status: 'cancelled', isActive: false } as any);
      }

      // Check credit availability
      const totalCredits = enrollment.totalCredits || 0;
      const remainingCredits = enrollment.remainingCredits || 0;
      let creditsToBook = 1;
      if (totalCredits > 0) {
        if (remainingCredits <= 0) {
          return res.status(400).json({ error: 'No available credits.' });
        }
        creditsToBook = isRecurring ? remainingCredits : 1;
      }
      
      // Get player name for event title
      const player = await storage.getUser(targetPlayerId);
      const playerName = player ? `${player.firstName || ''} ${player.lastName || ''}`.trim() : 'Player';
      
      // Create recurring weekly sessions for all available credits
      const createdEvents: any[] = [];
      const skippedWeeks: string[] = [];
      // Tryout enrollments book into existing team events — no generic conflict checking
      const isTryoutEnrollment = !!(enrollment.isTryout && enrollment.recommendedTeamId);
      const availabilitySlots = await storage.getAvailabilitySlotsByProgram(programId);

      // For tryout enrollments: validate the submitted startTime matches an eligible
      // practice/skills/training team event (non-game, within 30 days) for the recommended team
      if (isTryoutEnrollment) {
        const now = new Date();
        const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const NON_GAME_TYPES = ['practice', 'skills', 'training', 'skill', 'clinic', 'workout'];
        const submittedStart = new Date(startTime);
        const recommendedTeamId = enrollment.recommendedTeamId;
        const eligibleEvent = allOrgEvents.find((event: any) => {
          if (event.teamId !== recommendedTeamId) return false;
          if (event.isActive === false || event.status === 'cancelled') return false;
          const eventStart = new Date(event.startTime);
          if (eventStart <= now || eventStart > thirtyDaysOut) return false;
          const type = (event.eventType || event.type || '').toLowerCase();
          if (type === 'game') return false;
          if (type && !NON_GAME_TYPES.some(t => type.includes(t))) return false;
          // Match by startTime (within 1 minute tolerance)
          return Math.abs(eventStart.getTime() - submittedStart.getTime()) < 60000;
        });
        if (!eligibleEvent) {
          return res.status(400).json({ error: 'Selected time does not match an eligible upcoming team practice or skills session.' });
        }
      }
      
      for (let week = 0; week < creditsToBook; week++) {
        const sessionStart = new Date(new Date(startTime).getTime() + week * 7 * 24 * 60 * 60 * 1000);
        const sessionEnd = new Date(sessionStart.getTime() + sessionLength * 60 * 1000);
        
        // For tryout enrollments: skip availability window and conflict checks — the selected
        // slot is an existing team practice/skills event so there's no window constraint and
        // the "conflict" would be the event itself. Just book one session (no recurring).
        if (!isTryoutEnrollment) {
          // Validate this week falls within admin-defined availability windows (non-tryout only)
          const dayOfWeek = sessionStart.getDay();
          const sessionHour = sessionStart.getHours();
          const sessionMinute = sessionStart.getMinutes();
          const sessionTimeStr = `${String(sessionHour).padStart(2, '0')}:${String(sessionMinute).padStart(2, '0')}`;
          const endHour = sessionEnd.getHours();
          const endMinute = sessionEnd.getMinutes();
          const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          if (availabilitySlots.length > 0) {
            const dayWindows = availabilitySlots.filter((s: any) => s.dayOfWeek === dayOfWeek);
            const fitsWindow = dayWindows.some((w: any) => sessionTimeStr >= w.startTime && endTimeStr <= w.endTime);
            if (!fitsWindow) {
              skippedWeeks.push(sessionStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
              continue;
            }
          }
          
          // Check for conflicts with existing events AND already-created events in this batch
          const hasConflict = allOrgEvents.some((event: any) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            return sessionStart < eventEnd && sessionEnd > eventStart && event.isActive !== false && event.status !== 'cancelled';
          }) || createdEvents.some((event: any) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            return sessionStart < eventEnd && sessionEnd > eventStart;
          });
          
          if (hasConflict) {
            skippedWeeks.push(sessionStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            continue;
          }
        }

        const newEvent = await storage.createEvent({
          organizationId: orgId,
          title: `${program.name} - ${playerName}`,
          description: `Scheduled session for ${playerName} via ${program.name}`,
          eventType: 'training',
          startTime: sessionStart.toISOString(),
          endTime: sessionEnd.toISOString(),
          location: '',
          assignTo: {
            users: [targetPlayerId, userId],
            programs: [programId],
          },
          visibility: {
            programs: [programId],
          },
          sendNotifications: false,
          createdBy: userId,
          status: 'pending',
          isActive: true,
          playerRsvpEnabled: true,
          scheduleRequestSource: 'parent',
          requestedByUserId: userId,
          enrollmentId: enrollment.id,
          programId: programId,
          // For tryout enrollments, tag event with the recommended team
          ...(enrollment.isTryout && enrollment.recommendedTeamId ? { teamId: enrollment.recommendedTeamId } : {}),
        } as any);
        
        createdEvents.push(newEvent);
        
        try {
          await storage.createRsvpResponse({
            eventId: newEvent.id,
            userId: targetPlayerId,
            response: 'attending',
          });
        } catch (rsvpErr: any) {
          console.error('Failed to create auto-RSVP (non-fatal):', rsvpErr.message);
        }
      }
      
      if (createdEvents.length === 0) {
        return res.status(409).json({ error: 'All weekly time slots have conflicts. Please choose another time.' });
      }
      
      // Send notifications
      try {
        const firstDate = new Date(createdEvents[0].startTime);
        const dateStr = firstDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const timeStr = firstDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        const sessionWord = createdEvents.length === 1 ? 'session' : 'sessions';
        const recurringText = createdEvents.length > 1 ? 'recurring weekly ' : '';
        await storage.createNotification({
          organizationId: orgId,
          title: '📅 Session Request Submitted',
          message: `${createdEvents.length} ${recurringText}${program.name} ${sessionWord} requested starting ${dateStr} at ${timeStr}. Pending admin approval.`,
          types: ['notification'],
          recipientTarget: 'users',
          recipientUserIds: [userId],
          status: 'sent',
          deliveryChannels: ['in_app'],
          sentBy: 'system',
        });
        
        await pushNotifications.notifyAllAdmins(storage,
          '📅 New Session Request',
          `${playerName} requested ${createdEvents.length} ${recurringText}${program.name} ${sessionWord} starting ${dateStr} at ${timeStr}. Needs approval.`,
          orgId
        );
      } catch (notifErr: any) {
        console.error('Schedule notification failed (non-fatal):', notifErr.message);
      }
      
      res.json({
        success: true,
        events: createdEvents,
        sessionsCreated: createdEvents.length,
        skippedWeeks,
        message: createdEvents.length > 1
          ? `${createdEvents.length} weekly sessions requested! Awaiting admin approval.`
          : `Session requested! Awaiting admin approval.`,
        status: 'pending',
      });
    } catch (error: any) {
      console.error('Error creating schedule request:', error?.message || error);
      console.error('Stack:', error?.stack);
      res.status(500).json({ error: 'Failed to schedule session', detail: error?.message });
    }
  });

  // Get player's program memberships with social settings and team info
  app.get('/api/users/:userId/program-memberships', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { id: requesterId, role: requesterRole } = req.user;
      
      // Authorization: users can view their own or admins/coaches can view any
      const isOwnProfile = requesterId === userId;
      const isAdminOrCoach = requesterRole === 'admin' || requesterRole === 'coach' || await hasAdminProfile(requesterId, req.user.organizationId);
      
      // Also allow parents to view their children's memberships
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const isParent = user.parentId === requesterId || user.accountHolderId === requesterId;
      
      if (!isOwnProfile && !isAdminOrCoach && !isParent) {
        return res.status(403).json({ message: 'Not authorized to view these memberships' });
      }
      
      // Get enrollments with product/program info
      const enrollments = await db.select({
        enrollment: productEnrollments,
        product: products,
      })
        .from(productEnrollments)
        .leftJoin(products, eq(productEnrollments.programId, products.id))
        .where(
          and(
            eq(productEnrollments.profileId, userId),
            eq(productEnrollments.status, 'active')
          )
        );
      
      // Get team memberships for this user
      const userTeamMemberships = await db.select({
        membership: teamMemberships,
        team: teams,
      })
        .from(teamMemberships)
        .leftJoin(teams, eq(teamMemberships.teamId, teams.id))
        .where(
          and(
            eq(teamMemberships.profileId, userId),
            eq(teamMemberships.status, 'active')
          )
        );
      
      // Get all team IDs the user is a member of (teams.id is serial/integer)
      const userTeamIds = userTeamMemberships
        .map(({ team }) => team?.id)
        .filter((id): id is number => !!id);
      
      // Fetch all members for all teams the user is in (for roster display)
      let allTeamMembers: Array<{membership: typeof teamMemberships.$inferSelect, user: typeof users.$inferSelect | null}> = [];
      if (userTeamIds.length > 0) {
        allTeamMembers = await db.select({
          membership: teamMemberships,
          user: users,
        })
          .from(teamMemberships)
          .leftJoin(users, eq(teamMemberships.profileId, users.id))
          .where(
            and(
              inArray(teamMemberships.teamId, userTeamIds),
              eq(teamMemberships.status, 'active')
            )
          );
      }
      
      // Build response combining enrollments with team info, social settings, and members
      const memberships = await Promise.all(enrollments.map(async ({ enrollment, product }) => {
        // Find teams linked to this program
        const programTeams = userTeamMemberships.filter(
          ({ team }) => team?.programId === enrollment.programId
        );
        
        return {
          enrollmentId: enrollment.id,
          programId: enrollment.programId,
          programName: product?.name || 'Unknown Program',
          programType: product?.type,
          // Social settings from program
          hasSubgroups: product?.hasSubgroups ?? true,
          subgroupLabel: product?.subgroupLabel || 'Team',
          rosterVisibility: product?.rosterVisibility || 'members',
          chatMode: product?.chatMode || 'two_way',
          status: enrollment.status,
          startDate: enrollment.startDate,
          endDate: enrollment.endDate,
          autoRenew: enrollment.autoRenew,
          stripeSubscriptionId: enrollment.stripeSubscriptionId,
          remainingCredits: enrollment.remainingCredits,
          totalCredits: enrollment.totalCredits,
          selectedPricingOptionId: enrollment.selectedPricingOptionId,
          pricingAmount: (() => {
            if (!product?.pricingOptions || !enrollment.selectedPricingOptionId) return null;
            const options = Array.isArray(product.pricingOptions) ? product.pricingOptions : [];
            const selected = options.find((o: any) => o.id === enrollment.selectedPricingOptionId);
            return selected?.price || null;
          })(),
          pricingOptionName: (() => {
            if (!product?.pricingOptions || !enrollment.selectedPricingOptionId) return null;
            const options = Array.isArray(product.pricingOptions) ? product.pricingOptions : [];
            const selected = options.find((o: any) => o.id === enrollment.selectedPricingOptionId);
            return selected?.name || null;
          })(),
          // Team/group assignments within this program, with member data
          teams: await Promise.all(programTeams.map(async ({ membership, team }) => {
            // Get members for this team (exclude admins from player-facing roster)
            const teamMembers = allTeamMembers
              .filter(m => m.membership.teamId === team?.id && m.user?.role !== 'admin')
              .map(({ membership: m, user }) => ({
                id: user?.id,
                name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email,
                role: m.role,
                profilePic: user?.profilePic,
              }));
            
            // Get head coach name
            let coachName: string | null = null;
            if (team?.coachId) {
              const coach = await storage.getUser(team.coachId);
              if (coach) {
                coachName = `${coach.firstName || ''} ${coach.lastName || ''}`.trim() || null;
              }
            }
            
            // Get assistant coach names
            const assistantCoaches: Array<{ id: string; name: string }> = [];
            if (team?.assistantCoachIds && team.assistantCoachIds.length > 0) {
              for (const assistantId of team.assistantCoachIds) {
                const assistant = await storage.getUser(assistantId);
                if (assistant) {
                  assistantCoaches.push({
                    id: assistantId,
                    name: `${assistant.firstName || ''} ${assistant.lastName || ''}`.trim(),
                  });
                }
              }
            }
            
            return {
              teamId: team?.id,
              teamName: team?.name,
              memberRole: membership.role,
              coachId: team?.coachId,
              coachName,
              assistantCoachIds: team?.assistantCoachIds || [],
              assistantCoaches,
              members: teamMembers,
            };
          })),
        };
      }));
      
      res.json(memberships);
    } catch (error: any) {
      console.error('Error fetching program memberships:', error);
      res.status(500).json({ message: 'Failed to fetch program memberships' });
    }
  });

  // =============================================
  // PRODUCT ENROLLMENT ROUTES
  // =============================================

  // Get all enrollments for a profile
  app.get('/api/profiles/:profileId/enrollments', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const profileId = req.params.profileId;

    // Users can view their own or their children's enrollments
    if (role !== 'admin') {
      const profile = await storage.getUser(profileId);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const isOwnProfile = profile.id === userId;
      const isChildProfile = profile.accountHolderId === userId || profile.parentId === userId;
      if (!isOwnProfile && !isChildProfile) {
        return res.status(403).json({ message: 'Not authorized to view these enrollments' });
      }
    }

    const enrollments = await db.select({
      enrollment: productEnrollments,
      product: products,
    })
      .from(productEnrollments)
      .leftJoin(products, eq(productEnrollments.programId, products.id))
      .where(eq(productEnrollments.profileId, profileId));

    res.json(enrollments);
  });

  // Get all enrollments for an account holder (parent)
  app.get('/api/accounts/:accountHolderId/enrollments', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const accountHolderId = req.params.accountHolderId;

    // Users can only view their own account enrollments
    if (role !== 'admin' && accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view these enrollments' });
    }

    const enrollments = await db.select({
      enrollment: productEnrollments,
      product: products,
    })
      .from(productEnrollments)
      .leftJoin(products, eq(productEnrollments.programId, products.id))
      .where(eq(productEnrollments.accountHolderId, accountHolderId));

    res.json(enrollments);
  });

  // Get ALL enrollments (admin only - for admin dashboard)
  app.get('/api/admin/enrollments', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId, organizationId } = req.user;
      
      if (role !== 'admin' && !(await hasAdminProfile(userId, organizationId))) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const enrollments = await db.select()
        .from(productEnrollments)
        .where(eq(productEnrollments.organizationId, organizationId));

      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching all enrollments:', error);
      res.status(500).json({ message: 'Failed to fetch enrollments' });
    }
  });

  // Get current user's enrollments (for parent dashboard)
  app.get('/api/enrollments', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;

      // Resolve the root account holder ID so enrollments are found regardless of
      // which role/profile the JWT was issued for (parent, admin, coach, etc.)
      const currentUser = await storage.getUser(userId);
      const rootAccountHolderId = currentUser?.accountHolderId || userId;

      // Get enrollments for the entire account: by root account holder or by any
      // profile whose own accountHolderId maps back to the root account holder.
      const enrollments = await db.select()
        .from(productEnrollments)
        .where(
          or(
            eq(productEnrollments.accountHolderId, rootAccountHolderId),
            eq(productEnrollments.profileId, userId)
          )
        );

      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ message: 'Failed to fetch enrollments' });
    }
  });

  // Create an enrollment (admin only for now)
  app.post('/api/enrollments', requireAuth, async (req: any, res) => {
    const { role, organizationId, id: userId } = req.user;
    
    const {
      programId,
      accountHolderId,
      profileId,
      status = 'active',
      source = 'direct',
      paymentId,
      stripeSubscriptionId,
      startDate,
      endDate,
      autoRenew = true,
      metadata = {},
    } = req.body;

    // Non-admins can only create enrollments for themselves
    if (role !== 'admin' && accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to create enrollment for another user' });
    }

    const [enrollment] = await db.insert(productEnrollments)
      .values({
        organizationId: organizationId || 'default-org',
        programId,
        accountHolderId: accountHolderId || userId,
        profileId,
        status,
        source,
        paymentId,
        stripeSubscriptionId,
        startDate: startDate || new Date().toISOString(),
        endDate,
        autoRenew,
        metadata,
      })
      .returning();

    res.json(enrollment);
  });

  // Update an enrollment
  app.patch('/api/enrollments/:id', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const enrollmentId = parseInt(req.params.id);

    // Get the enrollment first
    const [existingEnrollment] = await db.select()
      .from(productEnrollments)
      .where(eq(productEnrollments.id, enrollmentId));

    if (!existingEnrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Non-admins can only update their own enrollments
    if (role !== 'admin' && existingEnrollment.accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this enrollment' });
    }

    const updateData: any = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.profileId !== undefined) updateData.profileId = req.body.profileId;
    if (req.body.autoRenew !== undefined) updateData.autoRenew = req.body.autoRenew;
    if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;
    updateData.updatedAt = new Date().toISOString();

    const [updated] = await db.update(productEnrollments)
      .set(updateData)
      .where(eq(productEnrollments.id, enrollmentId))
      .returning();

    res.json(updated);
  });

  // Cancel an enrollment
  app.post('/api/enrollments/:id/cancel', requireAuth, async (req: any, res) => {
    const { role, id: userId } = req.user;
    const enrollmentId = parseInt(req.params.id);

    const [existingEnrollment] = await db.select()
      .from(productEnrollments)
      .where(eq(productEnrollments.id, enrollmentId));

    if (!existingEnrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (role !== 'admin' && existingEnrollment.accountHolderId !== userId) {
      return res.status(403).json({ message: 'Not authorized to cancel this enrollment' });
    }

    // Cascade: if this is a parent/account-holder enrollment, cancel all child player enrollments
    // and remove their team memberships for this program. Wrapped in a transaction for atomicity.
    let cancelled: any;
    let cascadedEnrollments = 0;
    let cascadedMemberships = 0;

    const isParentEnrollment = !existingEnrollment.profileId || 
      existingEnrollment.profileId === existingEnrollment.accountHolderId;

    await db.transaction(async (tx) => {
      // Cancel the primary enrollment
      const [cancelledRow] = await tx.update(productEnrollments)
        .set({ 
          status: 'cancelled',
          autoRenew: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(productEnrollments.id, enrollmentId))
        .returning();
      cancelled = cancelledRow;

      if (!isParentEnrollment) return;

      const programId = existingEnrollment.programId;
      const accountHolderId = existingEnrollment.accountHolderId;

      // Find all active player enrollments in the same program for this account holder
      // (players are those with a profileId different from the accountHolderId)
      const playerEnrollments = await tx.select()
        .from(productEnrollments)
        .where(
          and(
            eq(productEnrollments.programId, programId),
            eq(productEnrollments.accountHolderId, accountHolderId),
            eq(productEnrollments.status, 'active')
          )
        );

      const playerIds = playerEnrollments
        .filter(e => e.profileId && e.profileId !== accountHolderId)
        .map(e => e.profileId as string);

      if (playerIds.length > 0) {
        // Cancel child player enrollments; use .returning() for accurate count
        const cancelledPlayerEnrollments = await tx.update(productEnrollments)
          .set({
            status: 'cancelled',
            autoRenew: false,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(productEnrollments.programId, programId),
              eq(productEnrollments.accountHolderId, accountHolderId),
              eq(productEnrollments.status, 'active'),
              inArray(productEnrollments.profileId, playerIds)
            )
          )
          .returning();
        cascadedEnrollments = cancelledPlayerEnrollments.length;
      }

      // Find all teams associated with this program
      const programTeams = await tx.select({ id: teams.id })
        .from(teams)
        .where(eq(teams.programId, programId));

      if (programTeams.length === 0) return;

      const teamIds = programTeams.map(t => t.id);

      if (playerIds.length > 0) {
        // Remove player team memberships for all program teams; use .returning() for accurate count
        const removedMemberships = await tx.delete(teamMemberships)
          .where(
            and(
              inArray(teamMemberships.teamId, teamIds),
              inArray(teamMemberships.profileId, playerIds)
            )
          )
          .returning();
        cascadedMemberships = removedMemberships.length;
      }

      // For each program team, check if the parent still has any other children on that team.
      // Only deactivate the parent's 'parent'-role membership if no other children remain.
      // Look up all children of this parent (users whose parentId = accountHolderId),
      // then check which of those children are still active members on the team.
      const parentChildren = await tx.select({ id: users.id })
        .from(users)
        .where(eq(users.parentId, accountHolderId));
      const allChildIds = parentChildren.map(c => c.id);
      // remaining children = all children minus those we just cancelled
      const remainingChildIds = allChildIds.filter(id => !playerIds.includes(id));

      for (const teamId of teamIds) {
        let hasRemainingChildOnTeam = false;
        if (remainingChildIds.length > 0) {
          const stillOnTeam = await tx.select({ id: teamMemberships.id })
            .from(teamMemberships)
            .where(
              and(
                eq(teamMemberships.teamId, teamId),
                inArray(teamMemberships.profileId, remainingChildIds),
                eq(teamMemberships.status, 'active')
              )
            )
            .limit(1);
          hasRemainingChildOnTeam = stillOnTeam.length > 0;
        }

        if (!hasRemainingChildOnTeam) {
          // No remaining children on this team — deactivate the parent's membership
          const updatedParentMembership = await tx.update(teamMemberships)
            .set({ status: 'inactive' })
            .where(
              and(
                eq(teamMemberships.teamId, teamId),
                eq(teamMemberships.profileId, accountHolderId),
                eq(teamMemberships.role, 'parent')
              )
            )
            .returning();
          cascadedMemberships += updatedParentMembership.length;
        }
      }
    });

    res.json({
      ...cancelled,
      cascade: {
        playerEnrollmentsCancelled: cascadedEnrollments,
        teamMembershipsRemoved: cascadedMemberships,
      },
    });
  });
  
  // =============================================
  // DIVISION ROUTES
  // =============================================
  
  app.get('/api/divisions', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const divisions = await storage.getDivisionsByOrganization(organizationId);
      res.json(divisions);
    } catch (error: any) {
      console.error('Error fetching divisions:', error);
      res.status(500).json({ error: 'Failed to fetch divisions', message: error.message });
    }
  });
  
  app.get('/api/divisions/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid division ID' });
      }
      
      const division = await storage.getDivision(id);
      if (!division) {
        return res.status(404).json({ error: 'Division not found' });
      }
      
      res.json(division);
    } catch (error: any) {
      console.error('Error fetching division:', error);
      res.status(500).json({ error: 'Failed to fetch division', message: error.message });
    }
  });
  
  app.post('/api/divisions', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can create divisions' });
      }
      
      const divisionData = insertDivisionSchema.parse(req.body);
      const division = await storage.createDivision(divisionData);
      res.status(201).json(division);
    } catch (error: any) {
      console.error('Error creating division:', error);
      res.status(400).json({ error: 'Failed to create division', message: error.message });
    }
  });
  
  app.patch('/api/divisions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can update divisions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid division ID' });
      }
      
      const updated = await storage.updateDivision(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Division not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating division:', error);
      res.status(400).json({ error: 'Failed to update division', message: error.message });
    }
  });
  
  app.delete('/api/divisions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete divisions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid division ID' });
      }
      
      await storage.deleteDivision(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting division:', error);
      res.status(500).json({ error: 'Failed to delete division', message: error.message });
    }
  });
  
  // =============================================
  // SKILL ROUTES
  // =============================================
  
  app.get('/api/skills', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const { playerId } = req.query;
      
      let skills;
      if (playerId) {
        skills = await storage.getSkillsByPlayer(playerId as string);
      } else {
        skills = await storage.getSkillsByOrganization(organizationId);
      }
      
      res.json(skills);
    } catch (error: any) {
      console.error('Error fetching skills:', error);
      res.status(500).json({ error: 'Failed to fetch skills', message: error.message });
    }
  });
  
  app.get('/api/skills/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid skill ID' });
      }
      
      const skill = await storage.getSkill(id);
      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      
      res.json(skill);
    } catch (error: any) {
      console.error('Error fetching skill:', error);
      res.status(500).json({ error: 'Failed to fetch skill', message: error.message });
    }
  });
  
  app.post('/api/skills', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can create skills' });
      }
      
      const skillData = insertSkillSchema.parse(req.body);
      const skill = await storage.createSkill(skillData);
      res.status(201).json(skill);
    } catch (error: any) {
      console.error('Error creating skill:', error);
      res.status(400).json({ error: 'Failed to create skill', message: error.message });
    }
  });
  
  app.patch('/api/skills/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can update skills' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid skill ID' });
      }
      
      const updated = await storage.updateSkill(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Skill not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating skill:', error);
      res.status(400).json({ error: 'Failed to update skill', message: error.message });
    }
  });
  
  app.delete('/api/skills/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can delete skills' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid skill ID' });
      }
      
      await storage.deleteSkill(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting skill:', error);
      res.status(500).json({ error: 'Failed to delete skill', message: error.message });
    }
  });
  
  // =============================================
  // EVALUATION ROUTES (Coach Dashboard)
  // =============================================
  
  app.get('/api/coach/evaluations', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const { playerId, quarter, year } = req.query;
      
      // If specific player/quarter/year requested, return that evaluation
      if (playerId && quarter && year) {
        const evaluation = await storage.getEvaluationByPlayerQuarter(playerId as string, quarter as string, parseInt(year as string));
        return res.json(evaluation || null);
      }
      
      // If only playerId, return all evaluations for that player
      if (playerId) {
        const evaluations = await storage.getEvaluationsByPlayer(playerId as string);
        return res.json(evaluations);
      }
      
      // Otherwise return all evaluations for the organization
      const evaluations = await storage.getEvaluationsByOrganization(organizationId);
      res.json(evaluations);
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      res.status(500).json({ error: 'Failed to fetch evaluations', message: error.message });
    }
  });
  
  app.post('/api/coach/evaluations', requireAuth, async (req: any, res) => {
    try {
      const { role, id: coachId, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can create evaluations' });
      }
      
      const evaluationData = {
        ...req.body,
        organizationId,
        coachId,
      };
      
      const evaluation = await storage.createEvaluation(evaluationData);
      
      // Calculate OVR from scores and update player's rating
      if (evaluationData.playerId && evaluationData.scores) {
        try {
          const scores = evaluationData.scores;
          let totalScore = 0;
          let scoreCount = 0;
          
          // Flatten nested scores structure: { CATEGORY: { SKILL: score, ... }, ... }
          for (const category of Object.values(scores)) {
            if (category && typeof category === 'object') {
              for (const score of Object.values(category as Record<string, number>)) {
                if (typeof score === 'number' && score > 0) {
                  totalScore += score;
                  scoreCount++;
                }
              }
            }
          }
          
          // Calculate average OVR (scores are 1-5, multiply by 20 to get 0-100 scale)
          if (scoreCount > 0) {
            const avgScore = totalScore / scoreCount;
            const ovrRating = Math.round(avgScore * 20); // Convert 1-5 to 0-100
            
            // Capture old OVR before updating
            const playerBeforeUpdate = await storage.getUser(evaluationData.playerId);
            const oldOvr = playerBeforeUpdate?.rating ?? undefined;
            
            // Update player's rating
            await storage.updateUser(evaluationData.playerId, { 
              rating: ovrRating,
              skillsAssessments: scores // Also store latest skills on player record
            });
            console.log(`[Eval] Updated player ${evaluationData.playerId} OVR to ${ovrRating} (avg: ${avgScore.toFixed(2)} from ${scoreCount} skills)`);
            
            // Send notification to player and parent about skills evaluation
            try {
              const coach = await storage.getUser(coachId);
              const coachName = `${coach?.firstName || ''} ${coach?.lastName || ''}`.trim() || 'Your coach';
              
              await pushNotifications.playerSkillsEvaluated(storage, evaluationData.playerId, coachName, oldOvr, ovrRating);
              
              // Also notify parent
              const player = await storage.getUser(evaluationData.playerId);
              if (player?.linkedParentId) {
                const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Your player';
                await pushNotifications.parentPlayerSkillsUpdated(storage, player.linkedParentId, playerName, coachName);
              }
            } catch (notifError: any) {
              console.error('⚠️ Skills notification failed (non-fatal):', notifError.message);
            }
          }
        } catch (ovrError: any) {
          console.error('[Eval] Failed to update player OVR (non-fatal):', ovrError.message);
        }
      }
      
      res.status(201).json(evaluation);
    } catch (error: any) {
      console.error('Error creating evaluation:', error);
      res.status(400).json({ error: 'Failed to create evaluation', message: error.message });
    }
  });
  
  app.get('/api/evaluations', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const { playerId } = req.query;
      
      if (playerId) {
        const evaluations = await storage.getEvaluationsByPlayer(playerId as string);
        return res.json(evaluations);
      }
      
      const evaluations = await storage.getEvaluationsByOrganization(organizationId);
      res.json(evaluations);
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      res.status(500).json({ error: 'Failed to fetch evaluations', message: error.message });
    }
  });
  
  app.delete('/api/evaluations/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can delete evaluations' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid evaluation ID' });
      }
      
      await storage.deleteEvaluation(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      res.status(500).json({ error: 'Failed to delete evaluation', message: error.message });
    }
  });
  
  // Latest evaluation for a player (used by PlayerCard)
  app.get('/api/players/:playerId/latest-evaluation', requireAuth, async (req: any, res) => {
    try {
      const { playerId } = req.params;
      const { id: currentUserId, role, organizationId } = req.user;
      
      let authorized = playerId === currentUserId || role === 'admin' || role === 'coach';
      if (!authorized && role === 'parent') {
        const player = await storage.getUser(playerId);
        if (player && (player.accountHolderId === currentUserId || (player as any).parentId === currentUserId || (player as any).guardianId === currentUserId)) {
          authorized = true;
        }
      }
      if (!authorized) {
        return res.status(403).json({ message: 'Not authorized to view this evaluation' });
      }
      
      const evaluations = await storage.getEvaluationsByPlayer(playerId);
      console.log(`[Eval API] Player ${playerId}: Found ${evaluations?.length || 0} evaluations`);
      if (!evaluations || evaluations.length === 0) {
        return res.json(null);
      }
      
      // Sort by year and quarter descending to get latest
      const sorted = evaluations.sort((a: any, b: any) => {
        if (b.year !== a.year) return b.year - a.year;
        const quarterOrder: Record<string, number> = { Q4: 4, Q3: 3, Q2: 2, Q1: 1 };
        return (quarterOrder[b.quarter] || 0) - (quarterOrder[a.quarter] || 0);
      });
      
      const latest = sorted[0];
      console.log(`[Eval API] Latest: Q${latest.quarter} ${latest.year}, scores:`, latest.scores);
      res.json({
        id: latest.id,
        playerId: latest.playerId,
        coachId: latest.coachId,
        quarter: latest.quarter,
        year: latest.year,
        skillsData: latest.scores,
        previousScores: latest.previousScores || [],
        notes: latest.notes,
        createdAt: latest.createdAt,
      });
    } catch (error: any) {
      console.error('Error fetching latest evaluation:', error);
      res.status(500).json({ error: 'Failed to fetch latest evaluation', message: error.message });
    }
  });
  
  // =============================================
  // NOTIFICATION ROUTES
  // =============================================
  
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const { id: userId, organizationId } = req.user;
      const allNotifications = await storage.getNotificationsByOrganization(organizationId);
      
      // Filter notifications where current user is a recipient
      const userNotifications = allNotifications.filter(notification => 
        notification.recipientIds && notification.recipientIds.includes(userId)
      );
      
      res.json(userNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
    }
  });
  
  app.get('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json(notification);
    } catch (error: any) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ error: 'Failed to fetch notification', message: error.message });
    }
  });
  
  app.post('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can create notifications' });
      }
      
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error: any) {
      console.error('Error creating notification:', error);
      res.status(400).json({ error: 'Failed to create notification', message: error.message });
    }
  });
  
  app.patch('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId } = req.user;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      // Get the notification to check ownership
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Only admin can update any notification
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update notifications' });
      }
      
      const updated = await storage.updateNotification(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating notification:', error);
      res.status(400).json({ error: 'Failed to update notification', message: error.message });
    }
  });
  
  app.delete('/api/notifications/:id', requireAuth, async (req: any, res) => {
    try {
      const { role, id: userId } = req.user;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      // Get the notification to check ownership
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Admin or user who created the notification can delete it
      const isSender = notification.sentBy === userId;
      if (role !== 'admin' && !isSender) {
        return res.status(403).json({ message: 'You can only delete notifications you created or be an admin' });
      }
      
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification', message: error.message });
    }
  });
  
  app.patch('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }
      
      // Get the notification to check if user is a recipient
      const notification = await storage.getNotification(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      // Only recipients can mark as read
      const isRecipient = notification.recipientIds && notification.recipientIds.includes(userId);
      if (!isRecipient) {
        return res.status(403).json({ message: 'You can only mark your own notifications as read' });
      }
      
      const updated = await storage.markNotificationAsRead(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(400).json({ error: 'Failed to mark notification as read', message: error.message });
    }
  });
  
  // DEV ONLY: Test push notification to a specific user (no auth required)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/test-push/:userId', async (req: any, res) => {
      try {
        const { userId } = req.params;
        const { title, message } = req.body;
        
        console.log(`[DEV] Testing push notification to user ${userId}`);
        
        await notificationService.sendPushNotification(
          0,
          userId,
          title || 'Test Push Notification',
          message || `Testing push delivery - sent at ${new Date().toLocaleTimeString()}`
        );
        
        res.json({ success: true, message: 'Push notification sent' });
      } catch (error: any) {
        console.error('[DEV] Test push error:', error);
        res.status(500).json({ error: 'Failed to send push', message: error.message });
      }
    });

    // DEV ONLY: Trigger all notification scheduler jobs immediately
    app.post('/api/dev/trigger-all-notifications', async (req: any, res) => {
      try {
        console.log(`[DEV] Triggering all notification jobs...`);
        
        await notificationScheduler.triggerEventReminders();
        await notificationScheduler.triggerCheckInNotifications();
        await notificationScheduler.triggerRsvpClosingNotifications();
        
        res.json({ success: true, message: 'All notification jobs triggered' });
      } catch (error: any) {
        console.error('[DEV] Trigger notifications error:', error);
        res.status(500).json({ error: 'Failed to trigger notifications', message: error.message });
      }
    });
  }

  // Manually trigger event reminders (admin only, for testing)
  app.post('/api/notifications/trigger-event-reminders', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can trigger event reminders' });
      }
      await notificationScheduler.triggerEventReminders();
      res.json({ success: true, message: 'Event reminders triggered' });
    } catch (error: any) {
      console.error('Error triggering event reminders:', error);
      res.status(500).json({ error: 'Failed to trigger event reminders', message: error.message });
    }
  });

  // Mark all notifications as read for the current user
  app.post('/api/notifications/mark-all-read', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
    }
  });
  
  // =============================================
  // NOTIFICATION CAMPAIGN ROUTES (Scheduled Messaging)
  // =============================================
  
  app.get('/api/notification-campaigns', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const campaigns = await storage.getNotificationCampaignsByOrganization(organizationId);
      res.json(campaigns);
    } catch (error: any) {
      console.error('Error fetching notification campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns', message: error.message });
    }
  });
  
  app.get('/api/notification-campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      const campaign = await storage.getNotificationCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(campaign);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign', message: error.message });
    }
  });
  
  app.post('/api/notification-campaigns', requireAuth, async (req: any, res) => {
    try {
      const { id: userId, organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const campaignData = {
        ...req.body,
        organizationId,
        createdBy: userId,
        status: req.body.scheduleType === 'immediate' ? 'active' : 'draft',
      };
      
      // Calculate nextRunAt based on schedule type
      if (campaignData.scheduleType === 'immediate') {
        campaignData.nextRunAt = new Date().toISOString();
      } else if (campaignData.scheduleType === 'scheduled' && campaignData.scheduledAt) {
        campaignData.nextRunAt = campaignData.scheduledAt;
        campaignData.status = 'active';
      } else if (campaignData.scheduleType === 'recurring' && campaignData.recurrenceTime) {
        // Calculate first run based on recurrence settings
        const [hours, minutes] = campaignData.recurrenceTime.split(':').map(Number);
        const firstRun = new Date();
        firstRun.setHours(hours, minutes, 0, 0);
        if (firstRun <= new Date()) {
          firstRun.setDate(firstRun.getDate() + 1);
        }
        campaignData.nextRunAt = firstRun.toISOString();
        campaignData.status = 'active';
      }
      
      const campaign = await storage.createNotificationCampaign(campaignData);
      res.json(campaign);
    } catch (error: any) {
      console.error('Error creating notification campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign', message: error.message });
    }
  });
  
  app.patch('/api/notification-campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      const updated = await storage.updateNotificationCampaign(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign', message: error.message });
    }
  });
  
  app.delete('/api/notification-campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      await storage.deleteNotificationCampaign(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign', message: error.message });
    }
  });
  
  // Campaign runs history
  app.get('/api/notification-campaigns/:id/runs', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid campaign ID' });
      }
      const runs = await storage.getCampaignRunsByCampaign(id);
      res.json(runs);
    } catch (error: any) {
      console.error('Error fetching campaign runs:', error);
      res.status(500).json({ error: 'Failed to fetch runs', message: error.message });
    }
  });
  
  // =============================================
  // NOTIFICATION TRIGGER RULES ROUTES
  // =============================================
  
  app.get('/api/notification-trigger-rules', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const rules = await storage.getNotificationTriggerRulesByOrganization(organizationId);
      res.json(rules);
    } catch (error: any) {
      console.error('Error fetching trigger rules:', error);
      res.status(500).json({ error: 'Failed to fetch trigger rules', message: error.message });
    }
  });
  
  app.post('/api/notification-trigger-rules', requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const ruleData = {
        ...req.body,
        organizationId,
      };
      const rule = await storage.createNotificationTriggerRule(ruleData);
      res.json(rule);
    } catch (error: any) {
      console.error('Error creating trigger rule:', error);
      res.status(500).json({ error: 'Failed to create trigger rule', message: error.message });
    }
  });
  
  app.patch('/api/notification-trigger-rules/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      const updated = await storage.updateNotificationTriggerRule(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Trigger rule not found' });
      }
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating trigger rule:', error);
      res.status(500).json({ error: 'Failed to update trigger rule', message: error.message });
    }
  });
  
  app.delete('/api/notification-trigger-rules/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid rule ID' });
      }
      await storage.deleteNotificationTriggerRule(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting trigger rule:', error);
      res.status(500).json({ error: 'Failed to delete trigger rule', message: error.message });
    }
  });
  
  // =============================================
  // PACKAGE SELECTION ROUTES (Family Registration)
  // =============================================
  
  app.get('/api/family/package-selections', requireAuth, async (req: any, res) => {
    try {
      const { id: userId } = req.user;
      const selections = await storage.getPackageSelectionsByParent(userId);
      res.json(selections);
    } catch (error: any) {
      console.error("Error fetching package selections:", error);
      res.status(500).json({ error: "Failed to fetch package selections" });
    }
  });
  
  app.post('/api/family/package-selections', requireAuth, async (req: any, res) => {
    try {
      const { id: parentUserId, organizationId } = req.user;
      const { selections } = req.body;
      
      if (!Array.isArray(selections) || selections.length === 0) {
        return res.status(400).json({ error: "selections must be a non-empty array" });
      }
      
      // Validate and create each selection
      const createdSelections = [];
      for (const selection of selections) {
        const selectionData = insertPackageSelectionSchema.parse({
          organizationId,
          parentUserId,
          childUserId: selection.childUserId,
          programId: selection.programId,
          isPaid: false,
        });
        
        const created = await storage.createPackageSelection(selectionData);
        createdSelections.push(created);
      }
      
      res.json(createdSelections);
    } catch (error: any) {
      console.error("Error creating package selections:", error);
      res.status(500).json({ error: "Failed to create package selections", details: error.message });
    }
  });
  
  // =============================================
  // FACILITY ROUTES
  // =============================================
  
  app.get('/api/facilities', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const facilities = await storage.getFacilitiesByOrganization(organizationId);
      res.json(facilities);
    } catch (error: any) {
      console.error('Error fetching facilities:', error);
      res.status(500).json({ error: 'Failed to fetch facilities', message: error.message });
    }
  });
  
  app.get('/api/facilities/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid facility ID' });
      }
      
      const facility = await storage.getFacility(id);
      if (!facility) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      res.json(facility);
    } catch (error: any) {
      console.error('Error fetching facility:', error);
      res.status(500).json({ error: 'Failed to fetch facility', message: error.message });
    }
  });
  
  app.post('/api/facilities', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId, id } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create facilities' });
      }
      
      const facilityData = insertFacilitySchema.parse({
        ...req.body,
        organizationId,
        createdBy: id,
      });
      const facility = await storage.createFacility(facilityData);
      res.status(201).json(facility);
    } catch (error: any) {
      console.error('Error creating facility:', error);
      res.status(400).json({ error: 'Failed to create facility', message: error.message });
    }
  });
  
  app.patch('/api/facilities/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update facilities' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid facility ID' });
      }
      
      const updated = await storage.updateFacility(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Facility not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating facility:', error);
      res.status(400).json({ error: 'Failed to update facility', message: error.message });
    }
  });
  
  app.delete('/api/facilities/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete facilities' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid facility ID' });
      }
      
      await storage.deleteFacility(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting facility:', error);
      res.status(500).json({ error: 'Failed to delete facility', message: error.message });
    }
  });
  
  // =============================================
  // MIGRATION INVITE ROUTES (New parent/player invite wizard)
  // =============================================

  // Zod schemas for send-invites payload — IDs are numeric (frontend uses number keys)
  const migrationPlayerSchema = z.object({
    id: z.coerce.number().optional(),
    parentId: z.coerce.number().nullable().optional(),
    firstName: z.string().default(''),
    lastName: z.string().default(''),
    dateOfBirth: z.string().optional().nullable(),
    subscriptionEndDate: z.string().transform(v => v === '' ? null : v).pipe(z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be MM/DD/YYYY').nullable()).optional(),
    programId: z.string().nullable().optional(),
    teamId: z.coerce.number().nullable().optional(),
  });

  const migrationParentSchema = z.object({
    id: z.coerce.number().optional(),
    firstName: z.string().default(''),
    lastName: z.string().default(''),
    email: z.string().email('Invalid parent email'),
    phone: z.string().optional().nullable(),
  });

  const migrationProgramSchema = z.object({
    id: z.string(),
    name: z.string(),
    code: z.string().default(''),
    isNew: z.boolean().default(false),
  }).nullable().optional();

  const migrationTeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    programId: z.string(),
    isNew: z.boolean().default(false),
  });

  const migrationStaffSchema = z.object({
    id: z.coerce.number().optional(),
    firstName: z.string().default(''),
    lastName: z.string().default(''),
    email: z.string().email('Invalid staff email'),
    role: z.enum(['coach', 'admin']),
    teamIds: z.array(z.number()).optional().default([]),
  });

  const sendInvitesSchema = z.object({
    parents: z.array(migrationParentSchema).min(1, 'At least one parent is required'),
    players: z.array(migrationPlayerSchema).optional().default([]),
    staff: z.array(migrationStaffSchema).optional().default([]),
    program: migrationProgramSchema,
    teams: z.array(migrationTeamSchema).optional().default([]),
  });

  // POST /api/migration/send-invites
  // Creates shadow user records and sends Resend invite emails
  app.post('/api/migration/send-invites', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can send migration invites' });
      }

      const parseResult = sendInvitesSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parseResult.error.flatten() });
      }
      const { parents, players, staff: migrationStaff, program: migrationProgram, teams: migrationTeams } = parseResult.data;

      const org = await storage.getOrganization(organizationId);
      const orgName = org?.name || 'Your organization';

      const { sendMigrationInvite, sendPlayerAddedNotification } = await import('./emails/inviteEmail');

      // ── Step 1: Resolve or create program ────────────────────────────────────
      let resolvedProgramId: string | null = null;
      let resolvedProgramName: string | null = null;

      if (migrationProgram) {
        if (migrationProgram.isNew) {
          // Create new draft program
          const newProgram = await storage.createProgram({
            organizationId,
            name: migrationProgram.name,
            code: migrationProgram.code || undefined,
            isActive: false, // marked incomplete — admin fills in later
            productCategory: 'service',
          });
          resolvedProgramId = newProgram.id;
          resolvedProgramName = newProgram.name;
          console.log(`[Migration] Created new program: ${newProgram.id} (${newProgram.name})`);
        } else {
          // Verify the existing program belongs to this org
          const existingProg = await storage.getProgram(migrationProgram.id);
          if (!existingProg || existingProg.organizationId !== organizationId) {
            return res.status(403).json({ error: 'Program does not belong to your organization' });
          }
          resolvedProgramId = migrationProgram.id;
          resolvedProgramName = migrationProgram.name;
        }
      }

      // ── Step 2: Resolve or create teams ──────────────────────────────────────
      // Map from migration temp ID → real DB team ID
      const teamIdMap: Record<number, number> = {};
      // teamNameMap is keyed by REAL DB team IDs
      const teamNameMap: Record<number, string> = {};

      if (migrationTeams && migrationTeams.length > 0) {
        // Pre-fetch org teams once for ownership validation
        const orgTeams = await storage.getTeamsByOrganization(organizationId);
        const orgTeamIdSet = new Set(orgTeams.map((t: any) => t.id));

        for (const mt of migrationTeams) {
          if (mt.isNew) {
            const newTeam = await storage.createTeam({
              organizationId,
              name: mt.name,
              programId: resolvedProgramId || undefined,
              active: false, // marked incomplete — admin fills in later
            });
            teamIdMap[mt.id] = newTeam.id;
            teamNameMap[newTeam.id] = newTeam.name;
            console.log(`[Migration] Created new team: ${newTeam.id} (${newTeam.name})`);
          } else {
            // Verify the existing team belongs to this org
            if (!orgTeamIdSet.has(mt.id)) {
              return res.status(403).json({ error: `Team ${mt.id} does not belong to your organization` });
            }
            // Verify existing team is associated with the migration program (if program is resolved)
            if (resolvedProgramId) {
              const existingTeam = orgTeams.find((t: any) => t.id === mt.id);
              if (existingTeam && existingTeam.programId && existingTeam.programId !== resolvedProgramId) {
                return res.status(400).json({ error: `Team "${mt.name}" belongs to a different program` });
              }
            }
            teamIdMap[mt.id] = mt.id;
            teamNameMap[mt.id] = mt.name;
          }
        }
      }

      // ── Step 3: Process staff (coaches and admins) ────────────────────────────
      if (migrationStaff && migrationStaff.length > 0) {
        for (const staffMember of migrationStaff) {
          if (!staffMember.email?.trim()) continue;
          try {
            const existingStaff = await storage.getUserByEmail(staffMember.email.toLowerCase(), organizationId);
            let staffUserId: string;

            if (existingStaff) {
              staffUserId = existingStaff.id;
              console.log(`[Migration] Staff ${staffMember.email} already exists — skipping user creation`);
            } else {
              staffUserId = crypto.randomUUID();
              const inviteToken = crypto.randomBytes(32).toString('hex');
              const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

              await db.insert(users).values({
                id: staffUserId,
                email: staffMember.email.toLowerCase(),
                firstName: staffMember.firstName || null,
                lastName: staffMember.lastName || null,
                role: staffMember.role,
                userType: staffMember.role,
                organizationId,
                status: 'invited',
                isActive: true,
                hasRegistered: false,
                inviteToken,
                inviteTokenExpiry,
              });
              console.log(`[Migration] Created shadow staff user: ${staffUserId} (${staffMember.email}) role=${staffMember.role}`);
            }

            // Insert team memberships for coaches — only for teams that passed through
            // the validated teamIdMap (teams explicitly included in the migration payload)
            if (staffMember.role === 'coach' && staffMember.teamIds && staffMember.teamIds.length > 0) {
              for (const tempTeamId of staffMember.teamIds) {
                const realTeamId = teamIdMap[tempTeamId];
                if (!realTeamId) {
                  console.warn(`[Migration] Staff team assignment skipped: team ID ${tempTeamId} not in validated migration teams`);
                  continue;
                }
                await db.insert(teamMemberships).values({
                  teamId: realTeamId,
                  profileId: staffUserId,
                  role: 'coach',
                  status: 'active',
                }).onConflictDoNothing();
              }
            }
          } catch (staffErr) {
            console.error(`[Migration] Error processing staff ${staffMember.email}:`, staffErr);
          }
        }
      }

      let invited = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const parent of parents) {
        if (!parent.email?.trim()) {
          skipped++;
          errors.push(`Parent ${parent.firstName || '(unknown)'} has no email`);
          continue;
        }

        try {
          // Check if user already exists in this org
          const existing = await storage.getUserByEmail(parent.email.toLowerCase(), organizationId);
          let parentUserId: string;

          // Derive players linked to this parent by numeric parentId
          const linkedPlayers = Array.isArray(players) 
            ? players.filter(p => p.parentId === parent.id)
            : [];

          let inviteToken: string;

          const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          if (existing) {
            parentUserId = existing.id;
            const isAlreadyActive = existing.status !== 'invited';

            if (!isAlreadyActive) {
              inviteToken = crypto.randomBytes(32).toString('hex');
              await storage.updateUser(parentUserId, { inviteToken, inviteTokenExpiry: newExpiry });
            } else {
              inviteToken = '';
            }

            const existingPlayers = await storage.getPlayersByParent(parentUserId);
            for (const player of linkedPlayers) {
              const alreadyExists = existingPlayers.some(
                (ep: any) => ep.firstName === player.firstName && ep.lastName === player.lastName
              );
              if (!alreadyExists) {
                const playerUserId = crypto.randomUUID();
                let subEndDate: string | null = null;
                if (player.subscriptionEndDate) {
                  const parts = player.subscriptionEndDate.split('/');
                  if (parts.length === 3) {
                    subEndDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                  }
                }
                const resolvedTeamId = player.teamId != null ? (teamIdMap[player.teamId] ?? null) : null;
                await db.insert(users).values({
                  id: playerUserId,
                  firstName: player.firstName || null,
                  lastName: player.lastName || null,
                  email: parent.email.toLowerCase(),
                  role: 'player',
                  userType: 'player',
                  organizationId,
                  parentId: parentUserId,
                  accountHolderId: parentUserId,
                  parentEmail: parent.email.toLowerCase(),
                  subscriptionEndDate: subEndDate,
                  teamId: resolvedTeamId,
                  packageSelected: resolvedProgramId || null,
                  status: isAlreadyActive ? 'active' : 'invited',
                  isActive: true,
                  hasRegistered: isAlreadyActive,
                });

                if (resolvedProgramId && subEndDate) {
                  const endDateIso = new Date(subEndDate + 'T23:59:59Z').toISOString();
                  await storage.createEnrollment({
                    organizationId,
                    programId: resolvedProgramId,
                    accountHolderId: parentUserId,
                    profileId: playerUserId,
                    status: 'active',
                    source: 'migration',
                    endDate: endDateIso,
                    autoRenew: false,
                  });
                }

                if (resolvedTeamId) {
                  await db.insert(teamMemberships).values({
                    teamId: resolvedTeamId,
                    profileId: playerUserId,
                    role: 'player',
                    status: 'active',
                  }).onConflictDoNothing();
                }
              }
            }

            if (isAlreadyActive) {
              const newlyAddedPlayers = linkedPlayers.filter((player) => {
                return !existingPlayers.some(
                  (ep: any) => ep.firstName === player.firstName && ep.lastName === player.lastName
                );
              });
              if (newlyAddedPlayers.length > 0) {
                const resolvedNewPlayers = newlyAddedPlayers.map((p) => ({
                  ...p,
                  teamId: p.teamId != null ? (teamIdMap[p.teamId] ?? p.teamId) : p.teamId,
                }));
                const notifRecord = {
                  parent: { ...parent, id: parent.id },
                  players: resolvedNewPlayers,
                  programName: resolvedProgramName || undefined,
                  teamNames: teamNameMap,
                };
                const notifResult = await sendPlayerAddedNotification(notifRecord, orgName);
                if (notifResult.success) {
                  invited++;
                  console.log(`Migration: ${parent.email} already active — ${newlyAddedPlayers.length} player(s) added, notification sent`);
                } else {
                  invited++;
                  console.warn(`Migration: ${parent.email} players added but notification failed: ${notifResult.error}`);
                }
              } else {
                skipped++;
                errors.push(`${parent.email} already has an account — no new players to add`);
              }
              continue;
            }
          } else {
            // Create shadow parent user directly with invite fields
            parentUserId = crypto.randomUUID();
            inviteToken = crypto.randomBytes(32).toString('hex');

            await db.insert(users).values({
              id: parentUserId,
              email: parent.email.toLowerCase(),
              firstName: parent.firstName || null,
              lastName: parent.lastName || null,
              phoneNumber: parent.phone || null,
              role: 'parent',
              userType: 'parent',
              organizationId,
              inviteToken,
              inviteTokenExpiry: newExpiry,
              status: 'invited',
              isActive: true,
              hasRegistered: false,
            });

            // Create player child profiles linked to this parent.
            // accountHolderId = parentUserId so child lookups work correctly
            // with existing profile-resolution logic.
            for (const player of linkedPlayers) {
              const playerUserId = crypto.randomUUID();
              // Convert MM/DD/YYYY to YYYY-MM-DD for date column
              let subEndDate: string | null = null;
              if (player.subscriptionEndDate) {
                const parts = player.subscriptionEndDate.split('/');
                if (parts.length === 3) {
                  subEndDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
              }
              const resolvedTeamId = player.teamId != null ? (teamIdMap[player.teamId] ?? null) : null;
              await db.insert(users).values({
                id: playerUserId,
                firstName: player.firstName || null,
                lastName: player.lastName || null,
                email: parent.email.toLowerCase(),
                role: 'player',
                userType: 'player',
                organizationId,
                parentId: parentUserId,
                accountHolderId: parentUserId,
                parentEmail: parent.email.toLowerCase(),
                subscriptionEndDate: subEndDate,
                teamId: resolvedTeamId,
                packageSelected: resolvedProgramId || null,
                status: 'invited',
                isActive: true,
                hasRegistered: false,
              });

              // Create enrollment record if program assigned
              if (resolvedProgramId && subEndDate) {
                const endDateIso = new Date(subEndDate + 'T23:59:59Z').toISOString();
                await storage.createEnrollment({
                  organizationId,
                  programId: resolvedProgramId,
                  accountHolderId: parentUserId,
                  profileId: playerUserId,
                  status: 'active',
                  source: 'migration',
                  endDate: endDateIso,
                  autoRenew: false,
                });
              }

              // Create team membership if team assigned
              if (resolvedTeamId) {
                await db.insert(teamMemberships).values({
                  teamId: resolvedTeamId,
                  profileId: playerUserId,
                  role: 'player',
                  status: 'active',
                }).onConflictDoNothing();
              }
            }
          }

          // Send invite email for both new and re-invited parents
          // Transform players to use resolved (real DB) team IDs so email team lookup works
          const resolvedLinkedPlayers = linkedPlayers.map((p) => ({
            ...p,
            teamId: p.teamId != null ? (teamIdMap[p.teamId] ?? p.teamId) : p.teamId,
          }));
          const inviteRecord = {
            parent: { ...parent, id: parent.id },
            players: resolvedLinkedPlayers,
            programName: resolvedProgramName || undefined,
            teamNames: teamNameMap,
          };
          const result = await sendMigrationInvite(inviteRecord, inviteToken, orgName);

          if (result.success) {
            invited++;
          } else {
            skipped++;
            errors.push(`Email to ${parent.email} failed: ${result.error}. Account created — re-import to retry.`);
          }
        } catch (err: any) {
          skipped++;
          errors.push(`Failed to process ${parent.email}: ${err.message}`);
        }
      }

      res.json({ invited, skipped, errors });
    } catch (error: any) {
      console.error('Error in send-invites:', error);
      res.status(500).json({ error: 'Failed to send invites', message: error.message });
    }
  });

  // GET /api/migration/claim/:token — returns pre-filled user info for the claim page
  app.get('/api/migration/claim/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const user = await storage.getUserByInviteToken(token);
      if (!user) {
        return res.status(404).json({ error: 'Invalid or expired invite link' });
      }
      if (user.inviteTokenExpiry && new Date(user.inviteTokenExpiry) < new Date()) {
        return res.status(410).json({ error: 'Invite link has expired. Please contact your organization admin.' });
      }
      const org = user.organizationId ? await storage.getOrganization(user.organizationId) : null;
      const allUsers = user.organizationId ? await storage.getUsersByOrganization(user.organizationId) : [];
      const linkedPlayers = allUsers.filter((u: any) =>
        u.role === 'player' && (u.accountHolderId === user.id || u.parentId === user.id)
      );
      res.json({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organizationName: org?.name || null,
        players: linkedPlayers.map((p: any) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          teamId: p.teamId,
          packageSelected: p.packageSelected,
          subscriptionEndDate: p.subscriptionEndDate,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching claim info:', error);
      res.status(500).json({ error: 'Failed to fetch invite info', message: error.message });
    }
  });

  // POST /api/migration/claim/:token — sets password and activates account
  app.post('/api/migration/claim/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const { password, firstName, lastName, phoneNumber, skillLevel, address, city, state, postalCode } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const user = await storage.getUserByInviteToken(token);
      if (!user) {
        return res.status(404).json({ error: 'Invalid or expired invite link' });
      }
      if (user.hasRegistered && user.status === 'active') {
        return res.status(400).json({ error: 'This account has already been activated' });
      }
      if (user.inviteTokenExpiry && new Date(user.inviteTokenExpiry) < new Date()) {
        return res.status(410).json({ error: 'Invite link has expired. Please contact your organization admin.' });
      }

      // Require skill level for non-staff users
      const isStaffRole = user.role === 'coach' || user.role === 'admin';
      if (!isStaffRole && !skillLevel) {
        return res.status(400).json({ error: 'Skill level is required' });
      }

      const hashedPassword = hashPassword(password);

      const updateData: any = {
        password: hashedPassword,
        status: 'active',
        activatedAt: new Date().toISOString(),
        inviteToken: null,
        inviteTokenExpiry: null,
        hasRegistered: true,
        verified: true,
      };
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (skillLevel) updateData.skillLevel = skillLevel;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (postalCode) updateData.postalCode = postalCode;

      await storage.updateUser(user.id, updateData);

      // Also activate all same-email profiles in this org
      if (user.email && user.organizationId) {
        const allOrgUsers = await storage.getUsersByOrganization(user.organizationId);
        const sameEmailProfiles = allOrgUsers.filter((u: any) =>
          u.id !== user.id && u.email?.toLowerCase() === user.email!.toLowerCase() && u.status === 'invited'
        );
        for (const profile of sameEmailProfiles) {
          await storage.updateUser(profile.id, {
            status: 'active',
            hasRegistered: true,
            verified: true,
            inviteToken: null,
            inviteTokenExpiry: null,
          });
        }
      }

      res.json({ success: true, email: user.email });
    } catch (error: any) {
      console.error('Error claiming invite:', error);
      res.status(500).json({ error: 'Failed to activate account', message: error.message });
    }
  });

  // =============================================
  // AWARD DEFINITION ROUTES (Admin/Coach Only)
  // =============================================
  
  // Get all award definitions for organization
  app.get('/api/award-definitions', requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const awardDefinitions = await storage.getAwardDefinitions(organizationId);
      res.json(awardDefinitions);
    } catch (error: any) {
      console.error('Error fetching award definitions:', error);
      res.status(500).json({ error: 'Failed to fetch award definitions', message: error.message });
    }
  });

  // Get badges from registry (for coaches to award)
  app.get('/api/admin/badges', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can view badges' });
      }
      
      // Import the awards registry
      const { AWARDS } = await import('@shared/awards.registry');
      
      // Filter to only return badges (not trophies) that can be manually awarded
      const badges = AWARDS.filter((award: any) => 
        award.kind === 'Badge' && 
        award.triggerSources && 
        award.triggerSources.includes('coachAward')
      );
      
      res.json(badges);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges', message: error.message });
    }
  });
  
  // Get single award definition
  app.get('/api/award-definitions/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid award definition ID' });
      }
      
      const awardDefinition = await storage.getAwardDefinition(id);
      if (!awardDefinition) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      res.json(awardDefinition);
    } catch (error: any) {
      console.error('Error fetching award definition:', error);
      res.status(500).json({ error: 'Failed to fetch award definition', message: error.message });
    }
  });
  
  // Create new award definition (admin only)
  app.post('/api/award-definitions', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can create award definitions' });
      }
      
      const awardDefinitionData = insertAwardDefinitionSchema.parse({
        ...req.body,
        organizationId,
      });
      
      // Enforce XOR: for system trigger, require exactly one of targetTier or referenceId
      if (awardDefinitionData.triggerCategory === 'system') {
        const hasTier = !!awardDefinitionData.targetTier;
        const hasRef = !!awardDefinitionData.referenceId;
        if (!hasTier && !hasRef) {
          return res.status(400).json({ error: 'Collection awards require either a target tier or a specific award' });
        }
        if (hasTier && hasRef) {
          return res.status(400).json({ error: 'Collection awards cannot have both a target tier and a specific award' });
        }
      }
      
      const awardDefinition = await storage.createAwardDefinition(awardDefinitionData);
      res.status(201).json(awardDefinition);
    } catch (error: any) {
      console.error('Error creating award definition:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid award definition data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to create award definition', message: error.message });
    }
  });
  
  // Update award definition (admin only)
  app.put('/api/award-definitions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can update award definitions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid award definition ID' });
      }
      
      // Get existing record to merge with update for validation
      const existing = await storage.getAwardDefinition(id);
      if (!existing) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      // Pre-process: normalize null/"none"/empty values - track which fields to clear
      const preprocessed = { ...req.body };
      const clearTargetTier = preprocessed.targetTier === null || preprocessed.targetTier === 'none' || preprocessed.targetTier === '';
      const clearReferenceId = preprocessed.referenceId === null || preprocessed.referenceId === 'none' || preprocessed.referenceId === '';
      
      // Remove clearing fields before Zod parsing (Zod partial doesn't accept undefined values for present keys)
      if (clearTargetTier) delete preprocessed.targetTier;
      if (clearReferenceId) delete preprocessed.referenceId;
      
      // Validate request body after normalization
      const awardDefinitionData = insertAwardDefinitionSchema.partial().parse(preprocessed);
      
      // Re-add cleared fields as null for database update
      if (clearTargetTier) (awardDefinitionData as any).targetTier = null;
      if (clearReferenceId) (awardDefinitionData as any).referenceId = null;
      
      // Merge existing values with update for XOR validation
      // Check if fields were in original req.body or explicitly cleared
      const merged = {
        triggerCategory: awardDefinitionData.triggerCategory ?? existing.triggerCategory,
        targetTier: ('targetTier' in req.body || clearTargetTier) ? (clearTargetTier ? null : awardDefinitionData.targetTier) : existing.targetTier,
        referenceId: ('referenceId' in req.body || clearReferenceId) ? (clearReferenceId ? null : awardDefinitionData.referenceId) : existing.referenceId,
      };
      
      // Enforce XOR: for system trigger, require exactly one of targetTier or referenceId
      if (merged.triggerCategory === 'system') {
        const hasTier = !!merged.targetTier;
        const hasRef = !!merged.referenceId;
        if (!hasTier && !hasRef) {
          return res.status(400).json({ error: 'Collection awards require either a target tier or a specific award' });
        }
        if (hasTier && hasRef) {
          return res.status(400).json({ error: 'Collection awards cannot have both a target tier and a specific award' });
        }
      }
      
      const updated = await storage.updateAwardDefinition(id, awardDefinitionData);
      if (!updated) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating award definition:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid award definition data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to update award definition', message: error.message });
    }
  });
  
  // Delete award definition (admin only)
  app.delete('/api/award-definitions/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Only admins can delete award definitions' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid award definition ID' });
      }
      
      await storage.deleteAwardDefinition(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting award definition:', error);
      res.status(500).json({ error: 'Failed to delete award definition', message: error.message });
    }
  });
  
  // =============================================
  // USER AWARDS ROUTES
  // =============================================
  
  // Get user awards (for specific user or current user)
  app.get('/api/user-awards', requireAuth, async (req: any, res) => {
    // Disable HTTP caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
      const { id: currentUserId, role, organizationId } = req.user;
      const { userId} = req.query;
      
      // Determine which user's awards to fetch
      const targetUserId = userId || currentUserId;
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Not authorized to view awards from other organizations' });
      }
      
      // Authorization: users can view their own awards, admins/coaches can view any user's awards
      // Parents can also view their linked children's awards
      let isAuthorized = targetUserId === currentUserId || role === 'admin' || role === 'coach';
      
      if (!isAuthorized && role === 'parent') {
        // Check if target user is a linked child of the current parent
        const linkedPlayers = await storage.getPlayersByParent(currentUserId);
        isAuthorized = linkedPlayers.some(p => p.id === targetUserId);
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to view these awards' });
      }
      
      const userAwardRecords = await storage.getUserAwardRecords(targetUserId);
      
      // Fetch award definitions to enrich the data
      const allAwardDefinitions = await storage.getAwardDefinitions(organizationId);
      const awardDefMap = new Map(allAwardDefinitions.map(ad => [ad.id, ad]));
      
      // Enrich user awards with award definition data
      const enrichedAwards = userAwardRecords.map((ua: any) => {
        const def = awardDefMap.get(ua.awardId);
        return {
          ...ua,
          tier: def?.tier,
          name: def?.name,
          description: def?.description,
          imageUrl: def?.imageUrl,
          prestige: def?.prestige,
        };
      });
      
      res.json(enrichedAwards);
    } catch (error: any) {
      console.error('Error fetching user awards:', error);
      res.status(500).json({ error: 'Failed to fetch user awards', message: error.message });
    }
  });
  
  // Get all user awards for organization (admin/coach only)
  app.get('/api/user-awards/organization', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can view organization awards' });
      }
      
      const userAwards = await storage.getUserAwardsByOrganization(organizationId);
      res.json(userAwards);
    } catch (error: any) {
      console.error('Error fetching organization awards:', error);
      res.status(500).json({ error: 'Failed to fetch organization awards', message: error.message });
    }
  });
  
  // Coach award endpoint (alias for /api/user-awards with different parameter naming)
  app.post('/api/coach/award', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId, id: awardedById } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can award users' });
      }
      
      // Map frontend parameters to backend format
      const { playerId, awardId, category, year, notes } = req.body;
      const userId = playerId; // Frontend sends playerId, backend expects userId
      
      if (!userId || !awardId) {
        return res.status(400).json({ error: 'playerId and awardId are required' });
      }
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot award users from other organizations' });
      }
      
      let dbAwardId: number;
      
      // Check if awardId is already a number (new database-driven approach)
      if (typeof awardId === 'number') {
        // Verify the award definition exists
        const awardDefinition = await storage.getAwardDefinition(awardId);
        if (!awardDefinition) {
          return res.status(404).json({ error: 'Award definition not found' });
        }
        dbAwardId = awardId;
      } else {
        // awardId is a string from the registry (e.g., "game-mvp") - legacy fallback
        const { AWARDS } = await import('@shared/awards.registry');
        const registryAward = AWARDS.find((a: any) => a.id === awardId);
        if (!registryAward) {
          return res.status(404).json({ error: `Award not found in registry: ${awardId}` });
        }
        
        // Look up the database award definition by name
        const allAwardDefs = await storage.getAwardDefinitions(organizationId);
        const awardDefinition = allAwardDefs.find((a: any) => a.name === registryAward.name);
        if (!awardDefinition) {
          return res.status(404).json({ error: `Award definition not found in database: ${registryAward.name}` });
        }
        
        dbAwardId = awardDefinition.id; // This is the integer ID
      }
      
      // Check if user already has this award for the same year (only for non-manual awards)
      const currentYear = year || new Date().getFullYear();
      const awardDef = await storage.getAwardDefinition(dbAwardId);
      if (awardDef && awardDef.triggerCategory !== 'manual') {
        const hasAward = await storage.checkUserHasAward(userId, dbAwardId, currentYear);
        if (hasAward) {
          return res.status(400).json({ error: 'User already has this award for the specified year' });
        }
      }
      
      const userAwardData = insertUserAwardRecordSchema.parse({
        userId,
        awardId: dbAwardId,
        awardedBy: awardedById,
        year: currentYear,
        notes: notes || null,
        visible: true,
      });
      
      const userAward = await storage.createUserAward(userAwardData);
      
      // Trigger award evaluation to update user's cached awards array
      await evaluateAwardsForUser(userId, storage);

      // Send in-app + push notification to the recipient (fire-and-forget)
      try {
        const notifAwardId = typeof dbAwardId !== 'undefined' ? dbAwardId : awardId;
        const def = await storage.getAwardDefinition(notifAwardId);
        if (def) {
          await notificationService.notifyAwardReceived(userId, def.name, def.tier);
        }
      } catch (notifErr) {
        console.error('[Award] Failed to send award notification:', notifErr);
      }
      
      res.status(201).json(userAward);
    } catch (error: any) {
      console.error('Error awarding user:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid user award data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to award user', message: error.message });
    }
  });

  // Manually award to user (admin/coach only)
  app.post('/api/user-awards', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId, id: awardedById } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can award users' });
      }
      
      const { userId, awardId, year, notes } = req.body;
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot award users from other organizations' });
      }
      
      // Verify the award definition exists
      const awardDefinition = await storage.getAwardDefinition(awardId);
      if (!awardDefinition) {
        return res.status(404).json({ error: 'Award definition not found' });
      }
      
      // Check if user already has this award for the same year (only for non-manual awards)
      if (awardDefinition.triggerCategory !== 'manual') {
        const hasAward = await storage.checkUserHasAward(userId, awardId, year);
        if (hasAward) {
          return res.status(400).json({ error: 'User already has this award for the specified year' });
        }
      }
      
      const userAwardData = insertUserAwardRecordSchema.parse({
        userId,
        awardId,
        awardedBy: awardedById,
        year: year || null,
        notes: notes || null,
        visible: true,
      });
      
      const userAward = await storage.createUserAward(userAwardData);
      
      // Trigger award evaluation to update user's cached awards array
      await evaluateAwardsForUser(userId, storage);

      // Send in-app + push notification to the recipient (fire-and-forget)
      try {
        const notifAwardId = typeof dbAwardId !== 'undefined' ? dbAwardId : awardId;
        const def = await storage.getAwardDefinition(notifAwardId);
        if (def) {
          await notificationService.notifyAwardReceived(userId, def.name, def.tier);
        }
      } catch (notifErr) {
        console.error('[Award] Failed to send award notification:', notifErr);
      }
      
      res.status(201).json(userAward);
    } catch (error: any) {
      console.error('Error awarding user:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Invalid user award data', 
          details: error.errors 
        });
      }
      res.status(400).json({ error: 'Failed to award user', message: error.message });
    }
  });
  
  // Delete user award (admin/coach only)
  app.delete('/api/user-awards/:id', requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can delete user awards' });
      }
      
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid user award ID' });
      }
      
      await storage.deleteUserAward(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user award:', error);
      res.status(500).json({ error: 'Failed to delete user award', message: error.message });
    }
  });
  
  // =============================================
  // ADMIN USER BILLING DETAILS
  // =============================================
  
  // Get detailed billing info for a user (admin only)
  app.get('/api/admin/users/:userId/billing', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot view billing for users from other organizations' });
      }
      
      // Get child players if this is a parent account
      const allUsers = await storage.getUsersByOrganization(organizationId);
      const childPlayers = allUsers.filter(u => u.accountHolderId === userId && u.role === 'player');
      
      // Get all subscriptions for this user
      const subscriptions = await storage.getSubscriptionsByOwner(userId);
      console.log(`📊 Admin billing for ${userId}: Found ${subscriptions.length} owner subscriptions`);
      console.log(`📊 Admin billing: childPlayers count: ${childPlayers.length}`);
      
      // Get enrollments for each child player
      const playerEnrollments: Record<string, any[]> = {};
      const playerSubscriptions: Record<string, any[]> = {};
      
      for (const player of childPlayers) {
        const enrollments = await storage.getActiveEnrollmentsWithCredits(player.id);
        playerEnrollments[player.id] = enrollments;
        
        const playerSubs = await storage.getSubscriptionsByPlayerId(player.id);
        playerSubscriptions[player.id] = playerSubs;
      }
      
      // Collect unique Stripe subscription IDs
      const stripeSubIds = new Set<string>();
      for (const sub of subscriptions) {
        if (sub.stripeSubscriptionId) stripeSubIds.add(sub.stripeSubscriptionId);
      }
      for (const playerId in playerSubscriptions) {
        for (const sub of playerSubscriptions[playerId]) {
          if (sub.stripeSubscriptionId) stripeSubIds.add(sub.stripeSubscriptionId);
        }
      }
      
      // Fetch Stripe subscription details
      const stripeDetails: Record<string, any> = {};
      console.log(`📊 Admin billing: Found ${stripeSubIds.size} Stripe subscription IDs:`, Array.from(stripeSubIds));
      
      if (stripe) {
        for (const subId of stripeSubIds) {
          try {
            console.log(`📊 Fetching Stripe subscription: ${subId}`);
            const stripeSub = await stripe.subscriptions.retrieve(subId);
            // Log all keys and items.data[0] period info
            console.log(`📊 Stripe sub all keys:`, Object.keys(stripeSub).slice(0, 15));
            const itemPeriodEnd = stripeSub.items?.data?.[0]?.current_period_end;
            console.log(`📊 Stripe items[0] period_end:`, itemPeriodEnd);
            // Use items period data or subscription period data
            const periodEnd = itemPeriodEnd || (stripeSub as any).current_period_end || (stripeSub as any).currentPeriodEnd;
            const periodStart = stripeSub.items?.data?.[0]?.current_period_start || (stripeSub as any).current_period_start || (stripeSub as any).currentPeriodStart;
            const cancelEnd = (stripeSub as any).cancel_at_period_end || (stripeSub as any).cancelAtPeriodEnd;
            console.log(`📊 Stripe subscription ${subId} status: ${stripeSub.status}, period_end: ${periodEnd}`);
            stripeDetails[subId] = {
              id: stripeSub.id,
              status: stripeSub.status,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: cancelEnd,
              interval: stripeSub.items.data[0]?.price?.recurring?.interval || 'month',
              amount: stripeSub.items.data[0]?.price?.unit_amount || 0,
              currency: stripeSub.items.data[0]?.price?.currency || 'usd',
              productName: stripeSub.items.data[0]?.price?.product,
            };
          } catch (stripeError: any) {
            console.warn(`Could not fetch Stripe subscription ${subId}:`, stripeError.message);
          }
        }
      }
      
      console.log(`📊 Admin billing: stripeDetails keys:`, Object.keys(stripeDetails));
      
      // Build player details with their programs and subscriptions
      const playersWithDetails = await Promise.all(childPlayers.map(async (player) => {
        const enrollments = playerEnrollments[player.id] || [];
        const subs = playerSubscriptions[player.id] || [];
        
        // Enrich subscriptions with Stripe data
        const enrichedSubs = subs.map(sub => ({
          ...sub,
          stripe: sub.stripeSubscriptionId ? stripeDetails[sub.stripeSubscriptionId] : null,
          nextPaymentDate: sub.stripeSubscriptionId && stripeDetails[sub.stripeSubscriptionId]?.currentPeriodEnd 
            ? new Date(stripeDetails[sub.stripeSubscriptionId].currentPeriodEnd * 1000).toISOString()
            : null,
        }));
        
        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          programs: enrollments.map(e => ({
            programId: e.programId,
            programName: e.programName,
            status: e.status,
            remainingCredits: e.remainingCredits,
            source: e.source,
          })),
          subscriptions: enrichedSubs,
        };
      }));
      
      // Get all unique Stripe subscription IDs for display
      const allStripeSubIds = Array.from(stripeSubIds);
      
      // Calculate next payment date across all subscriptions
      let nextPaymentDate: string | null = null;
      let nextPaymentAmount = 0;
      
      for (const subId in stripeDetails) {
        const sub = stripeDetails[subId];
        if (sub.status === 'active' && sub.currentPeriodEnd) {
          const subNextDate = new Date(sub.currentPeriodEnd * 1000).toISOString();
          if (!nextPaymentDate || subNextDate < nextPaymentDate) {
            nextPaymentDate = subNextDate;
            nextPaymentAmount = sub.amount;
          }
        }
      }
      
      res.json({
        success: true,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionIds: allStripeSubIds,
        players: playersWithDetails,
        nextPaymentDate,
        nextPaymentAmount,
        stripeDetails,
      });
    } catch (error: any) {
      console.error('Error fetching admin user billing:', error);
      res.status(500).json({ error: 'Failed to fetch billing details', message: error.message });
    }
  });
  
  // =============================================
  // AWARD SYNC ROUTES
  // =============================================
  
  // Manually trigger award evaluation for a user (admin/coach only)
  app.post('/api/awards/sync/:userId', requireAuth, async (req: any, res) => {
    try {
      const { role, organizationId } = req.user;
      if (role !== 'admin' && role !== 'coach' && !(await hasCoachOrAdminProfile(req.user.id, req.user.organizationId))) {
        return res.status(403).json({ message: 'Only admins and coaches can sync awards' });
      }
      
      const { userId } = req.params;
      
      // Verify the target user exists and belongs to the same organization
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.organizationId !== organizationId) {
        return res.status(403).json({ message: 'Cannot sync awards for users from other organizations' });
      }
      
      // Trigger award evaluation
      const updatedAwards = await evaluateAwardsForUser(userId, storage);
      
      res.json({ 
        success: true, 
        message: 'Awards synced successfully',
        awardsCount: updatedAwards.length,
        awards: updatedAwards
      });
    } catch (error: any) {
      console.error('Error syncing awards:', error);
      res.status(500).json({ error: 'Failed to sync awards', message: error.message });
    }
  });
  
  // Awards are evaluated immediately after actions (check-in, RSVP, purchase, etc.)
  // No scheduled sync needed - awards are granted in real-time

  // =============================================
  // BUG REPORTS
  // =============================================
  
  app.post("/api/bug-reports", requireAuth, async (req: any, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
      }
      
      const userId = req.user?.id || 'anonymous';
      const organizationId = req.user?.organizationId || 'default-org';
      
      // Fetch full user details from storage
      const fullUser = userId !== 'anonymous' ? await storage.getUser(userId) : null;
      const userEmail = fullUser?.email || 'unknown';
      const userName = fullUser?.firstName && fullUser?.lastName 
        ? `${fullUser.firstName} ${fullUser.lastName}` 
        : 'Unknown User';
      
      const reportId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      
      // Save to database
      const bugReport = await storage.createBugReport({
        id: reportId,
        organizationId,
        userId,
        userEmail,
        userName,
        title,
        description,
        userAgent: req.headers['user-agent'] || 'unknown',
        platform: req.headers['sec-ch-ua-platform'] || 'unknown',
        status: 'open',
      });
      
      // Save as JSON file for easy download
      const bugReportsDir = './bug-reports';
      if (!fs.existsSync(bugReportsDir)) {
        fs.mkdirSync(bugReportsDir, { recursive: true });
      }
      
      const timestamp = createdAt.replace(/[:.]/g, '-');
      const filename = `bug-report_${timestamp}_${reportId.slice(0, 8)}.json`;
      const filePath = `${bugReportsDir}/${filename}`;
      
      const reportData = {
        id: reportId,
        title,
        description,
        userName,
        userEmail,
        userId,
        organizationId,
        userAgent: req.headers['user-agent'] || 'unknown',
        platform: req.headers['sec-ch-ua-platform'] || 'unknown',
        status: 'open',
        createdAt,
      };
      
      fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
      console.log(`🐛 Bug report saved to database: ${bugReport.id}`);
      console.log(`📁 Bug report saved to file: ${filePath}`);
      
      res.json({ success: true, message: "Bug report submitted successfully", id: bugReport.id });
    } catch (error: any) {
      console.error('Error saving bug report:', error);
      res.status(500).json({ error: "Failed to save bug report" });
    }
  });
  
  // Get all bug reports (admin only)
  app.get("/api/bug-reports", requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      
      if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can view bug reports" });
      }
      
      const reports = await storage.getBugReportsByOrganization(organizationId);
      res.json(reports);
    } catch (error: any) {
      console.error('Error fetching bug reports:', error);
      res.status(500).json({ error: "Failed to fetch bug reports" });
    }
  });
  
  // Download all bug reports as JSON file (admin only)
  app.get("/api/bug-reports/download", requireAuth, async (req: any, res) => {
    try {
      const { organizationId, role } = req.user;
      const user = await storage.getUser(req.user.id);
      
      if (role !== 'admin' || user?.email !== 'jack@upyourpeformance.org') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const reports = await storage.getBugReportsByOrganization(organizationId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bug-reports_${timestamp}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(reports);
    } catch (error: any) {
      console.error('Error downloading bug reports:', error);
      res.status(500).json({ error: "Failed to download bug reports" });
    }
  });
  
  // Update bug report status (admin only)
  app.patch("/api/bug-reports/:id", requireAuth, async (req: any, res) => {
    try {
      const { role } = req.user;
      const { id } = req.params;
      const { status } = req.body;
      
      if (role !== 'admin') {
        return res.status(403).json({ error: "Only admins can update bug reports" });
      }
      
      const updates: any = { status };
      if (status === 'resolved' || status === 'closed') {
        updates.resolvedAt = new Date().toISOString();
      }
      
      const updated = await storage.updateBugReport(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Bug report not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating bug report:', error);
      res.status(500).json({ error: "Failed to update bug report" });
    }
  });

  // =============================================
  // DIRECT MESSAGES (Parent-Coach 1-on-1)
  // =============================================
  
  app.get("/api/direct-messages/:userId", requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      // Users can only access their own DMs
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getDirectMessagesForUser(userId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.get("/api/direct-messages/:senderId/:receiverId", requireAuth, async (req: any, res) => {
    try {
      const { senderId, receiverId } = req.params;
      // Users can only access conversations they're part of
      if (req.user.id !== senderId && req.user.id !== receiverId && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getDirectMessagesBetweenUsers(senderId, receiverId);
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.post("/api/direct-messages", requireAuth, async (req: any, res) => {
    try {
      const { receiverId, message, teamId } = req.body;
      const dm = await storage.createDirectMessage({
        organizationId: req.user.organizationId,
        senderId: req.user.id,
        receiverId,
        message,
        teamId: teamId || null,
      });
      res.json(dm);
    } catch (error: any) {
      console.error('Error creating direct message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.patch("/api/direct-messages/:id/read", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.markDirectMessageRead(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error marking message read:', error);
      res.status(500).json({ error: "Failed to mark message read" });
    }
  });
  
  // =============================================
  // CONTACT MANAGEMENT MESSAGES
  // =============================================
  
  app.get("/api/contact-management", requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const messages = await storage.getContactManagementMessages(organizationId);
      
      const enrichedMessages = await Promise.all(messages.map(async (msg: any) => {
        const sender = await storage.getUser(msg.senderId);
        const replies = await storage.getContactManagementReplies(msg.id);
        return {
          ...msg,
          sender: sender ? {
            id: sender.id,
            firstName: sender.firstName,
            lastName: sender.lastName,
            email: sender.email,
          } : null,
          replies,
        };
      }));
      res.json(enrichedMessages);
    } catch (error: any) {
      console.error('Error fetching contact messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.get("/api/contact-management/my-messages", requireAuth, async (req: any, res) => {
    try {
      const messages = await storage.getContactManagementMessagesBySender(req.user.id);
      const parentMessages = messages.filter((m: any) => !m.parentMessageId);
      const enrichedMessages = await Promise.all(parentMessages.map(async (msg: any) => {
        const replies = await storage.getContactManagementReplies(msg.id);
        return { ...msg, replies };
      }));
      res.json(enrichedMessages);
    } catch (error: any) {
      console.error('Error fetching my contact messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.post("/api/contact-management", requireAuth, async (req: any, res) => {
    try {
      const { message } = req.body;
      const user = await storage.getUser(req.user.id);
      const senderName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      const msg = await storage.createContactManagementMessage({
        organizationId: req.user.organizationId,
        senderId: req.user.id,
        senderName,
        senderEmail: user?.email || null,
        message,
      });
      
      try {
        await adminNotificationService.createNotification({
          organizationId: req.user.organizationId,
          types: ['message'],
          title: `New message from ${senderName}`,
          message: `${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`,
          recipientTarget: 'roles',
          recipientRoles: ['admin'],
          deliveryChannels: ['push'],
          sentBy: req.user.id,
          status: 'sent',
        }, { url: '/admin-dashboard?tab=communications&subtab=messages' });
      } catch (notifyError) {
        console.error('Error sending admin contact notification:', notifyError);
      }
      
      res.json(msg);
    } catch (error: any) {
      console.error('Error creating contact message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.patch("/api/contact-management/:id", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const id = parseInt(req.params.id);
      const updated = await storage.updateContactManagementMessage(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating contact message:', error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });
  
  // =============================================
  // CRM LEADS
  // =============================================
  
  app.get("/api/crm/leads", requireAuth, async (req: any, res) => {
    try {
      // Allow both admins and coaches to view leads (coaches need it for evaluation form)
      // Check all profiles with same email for multi-profile accounts
      const isCoachOrAdminUser = req.user.role === 'admin' || req.user.role === 'coach' || 
        await hasCoachOrAdminProfile(req.user.id, req.user.organizationId);
      if (!isCoachOrAdminUser) {
        return res.status(403).json({ error: "Admin or coach access required" });
      }
      const leads = await storage.getCrmLeadsByOrganization(req.user.organizationId);
      res.json(leads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });
  
  app.get("/api/crm/leads/:id", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const lead = await storage.getCrmLead(parseInt(req.params.id));
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });
  
  app.post("/api/crm/leads", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const lead = await storage.createCrmLead({
        organizationId: req.user.organizationId,
        ...req.body,
      });
      res.json(lead);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });
  
  app.patch("/api/crm/leads/:id", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const updated = await storage.updateCrmLead(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });
  
  app.delete("/api/crm/leads/:id", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      await storage.deleteCrmLead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });
  
  // Save lead evaluation (coaches and admins can save)
  app.patch("/api/crm/leads/:id/evaluation", requireAuth, async (req: any, res) => {
    try {
      const isCoachOrAdminUser = req.user.role === 'admin' || req.user.role === 'coach' || 
        await hasCoachOrAdminProfile(req.user.id, req.user.organizationId);
      if (!isCoachOrAdminUser) {
        return res.status(403).json({ error: "Coach or admin access required" });
      }
      const leadId = parseInt(req.params.id);
      const evaluation = req.body;
      
      // Add metadata
      evaluation.savedBy = req.user.id;
      evaluation.savedAt = new Date().toISOString();
      
      const updated = await storage.updateCrmLead(leadId, { evaluation });
      res.json(updated);
    } catch (error: any) {
      console.error('Error saving lead evaluation:', error);
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });
  
  // =============================================
  // CRM NOTES
  // =============================================
  
  app.get("/api/crm/notes/lead/:leadId", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const notes = await storage.getCrmNotesByLead(parseInt(req.params.leadId));
      res.json(notes);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });
  
  app.get("/api/crm/notes/user/:userId", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const notes = await storage.getCrmNotesByUser(req.params.userId);
      res.json(notes);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });
  
  app.post("/api/crm/notes", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const note = await storage.createCrmNote({
        organizationId: req.user.organizationId,
        authorId: req.user.id,
        ...req.body,
      });
      res.json(note);
    } catch (error: any) {
      console.error('Error creating note:', error);
      res.status(500).json({ error: "Failed to create note" });
    }
  });
  
  app.delete("/api/crm/notes/:id", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      await storage.deleteCrmNote(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting note:', error);
      res.status(500).json({ error: "Failed to delete note" });
    }
  });
  
  // =============================================
  // COUPONS
  // =============================================
  
  app.post("/api/coupons", requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { programId, discountType, discountValue, maxUses } = req.body;
      
      if (!discountType || !discountValue) {
        return res.status(400).json({ error: "discountType and discountValue are required" });
      }
      if (!['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({ error: "discountType must be 'percentage' or 'fixed'" });
      }
      const parsedValue = parseInt(discountValue);
      if (isNaN(parsedValue) || parsedValue <= 0) {
        return res.status(400).json({ error: "discountValue must be a positive number" });
      }
      if (discountType === 'percentage' && parsedValue > 100) {
        return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
      }

      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const coupon = await storage.createCoupon({
        code,
        organizationId,
        programId: programId || null,
        discountType,
        discountValue: parsedValue,
        expiresAt,
        maxUses: maxUses ? parseInt(maxUses) : 1,
        isActive: true,
        createdBy: req.user.id,
      });

      res.json(coupon);
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/coupons", requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allCoupons = await storage.getCouponsByOrganization(organizationId);
      res.json(allCoupons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/coupons/program/:programId", requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const programCoupons = await storage.getCouponsByProgram(req.params.programId, organizationId);
      res.json(programCoupons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/coupons/validate", requireAuth, async (req: any, res) => {
    try {
      const { code, programId } = req.body;
      const { organizationId } = req.user;

      if (!code) {
        return res.status(400).json({ error: "Coupon code is required" });
      }

      const coupon = await storage.getCouponByCode(code.toUpperCase(), organizationId);
      
      if (!coupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }

      if (!coupon.isActive) {
        return res.status(400).json({ error: "This coupon is no longer active" });
      }

      if (new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This coupon has expired" });
      }

      if (coupon.maxUses && coupon.currentUses !== null && coupon.currentUses >= coupon.maxUses) {
        return res.status(400).json({ error: "This coupon has reached its maximum uses" });
      }

      if (coupon.programId && programId && coupon.programId !== programId) {
        return res.status(400).json({ error: "This coupon is not valid for this program" });
      }

      res.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          programId: coupon.programId,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/coupons/:id", requireAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.user;
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      await storage.deleteCoupon(parseInt(req.params.id), organizationId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // PROGRAM CATEGORIES (org-specific)
  // =============================================

  app.get("/api/program-categories", requireAuth, async (req: any, res) => {
    try {
      const cats = await storage.getProgramCategoriesByOrganization(req.user.organizationId);
      res.json(cats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/program-categories", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) return res.status(403).json({ error: "Admin access required" });
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }
      const normalizedName = name.trim();
      const existing = await storage.getProgramCategoriesByOrganization(req.user.organizationId);
      const duplicate = existing.some(c => c.name.toLowerCase() === normalizedName.toLowerCase());
      if (duplicate) {
        return res.status(409).json({ error: "Category already exists" });
      }
      const cat = await storage.createProgramCategory({ organizationId: req.user.organizationId, name: normalizedName });
      res.status(201).json(cat);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/program-categories/:id", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) return res.status(403).json({ error: "Admin access required" });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteProgramCategory(id, req.user.organizationId);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // QUOTE CHECKOUTS
  // =============================================
  
  app.get("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const quotes = await storage.getQuoteCheckoutsByOrganization(req.user.organizationId);
      res.json(quotes);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });
  
  app.get("/api/quotes/:id", async (req: any, res) => {
    try {
      const quote = await storage.getQuoteCheckout(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      // Check if expired
      if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Quote has expired" });
      }
      if (quote.status !== 'pending') {
        return res.status(410).json({ error: "Quote has already been used" });
      }
      res.json(quote);
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });
  
  app.post("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { nanoid } = await import('nanoid');
      const quoteId = nanoid(12);
      const quote = await storage.createQuoteCheckout({
        id: quoteId,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        ...req.body,
      });
      res.json(quote);
    } catch (error: any) {
      console.error('Error creating quote:', error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });
  
  app.patch("/api/quotes/:id", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const updated = await storage.updateQuoteCheckout(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating quote:', error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Alias for frontend consistency
  app.get("/api/quote-checkouts", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const quotes = await storage.getQuoteCheckoutsByOrganization(req.user.organizationId);
      const leads = await storage.getCrmLeadsByOrganization(req.user.organizationId);
      
      // Attach lead info and add checkoutId alias
      const enrichedQuotes = quotes.map((q: any) => ({
        ...q,
        checkoutId: q.id,
        lead: leads.find((l: any) => l.id === q.leadId) || null,
      }));
      res.json(enrichedQuotes);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.post("/api/quote-checkouts", requireAuth, async (req: any, res) => {
    try {
      // Check all profiles with same email for admin access (multi-profile support)
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { nanoid } = await import('nanoid');
      const quoteId = nanoid(12);
      
      // Build items array with prices from programs AND store products (use customPrice if provided)
      const allProducts = await storage.getProgramsByOrganization(req.user.organizationId);
      const items = (req.body.items || []).map((item: any) => {
        const product = allProducts.find((p: any) => p.id === item.productId);
        // Use customPrice if provided, otherwise use product's default price
        const price = item.customPrice !== undefined ? item.customPrice : (product?.price || 0);
        return {
          type: item.type || 'program',
          productId: item.productId,
          productName: product?.name || 'Unknown',
          price,
          originalPrice: product?.price || 0, // Store original for reference
          quantity: item.quantity || 1,
        };
      });
      
      const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      
      const quote = await storage.createQuoteCheckout({
        id: quoteId,
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        leadId: req.body.leadId ? parseInt(req.body.leadId) : null,
        userId: req.body.userId || null, // For quotes to existing members
        items,
        totalAmount,
        programIds: items.map((i: any) => i.productId),
      });
      res.json({ ...quote, checkoutId: quote.id });
    } catch (error: any) {
      console.error('Error creating quote:', error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Public quote checkout access (no auth required for lead checkout)
  app.get("/api/quote-checkouts/:checkoutId", async (req: any, res) => {
    try {
      const quote = await storage.getQuoteCheckout(req.params.checkoutId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Attach lead info if available
      let lead = null;
      if (quote.leadId) {
        lead = await storage.getCrmLead(quote.leadId);
      }
      
      // Attach user info if available (for quotes to existing members)
      let user = null;
      if (quote.userId) {
        user = await storage.getUser(quote.userId);
      }
      
      // Collect required waivers from all programs in the quote
      const requiredWaiverIds = new Set<string>();
      const programs: any[] = [];
      const addOns: any[] = [];
      
      if (quote.items && Array.isArray(quote.items)) {
        for (const item of quote.items) {
          if (item.type === 'program' && item.productId) {
            const program = await storage.getProgram(item.productId);
            if (program) {
              programs.push(program);
              if (program.requiredWaivers && Array.isArray(program.requiredWaivers)) {
                program.requiredWaivers.forEach((wid: string) => requiredWaiverIds.add(wid));
              }
              
              // Fetch configured add-ons for this program (from admin Store tab settings)
              const quoteItems = Array.isArray(quote.items) ? quote.items : [];
              const suggestedAddOnsWithProducts = await storage.getSuggestedAddOnsWithProducts(program.id);
              
              suggestedAddOnsWithProducts.forEach(({ product }: any) => {
                // Only include active products not already in the quote
                if (product && product.isActive && !quoteItems.some((qi: any) => qi.productId === product.id)) {
                  if (!addOns.some(a => a.id === product.id)) {
                    addOns.push(product);
                  }
                }
              });
            }
          }
        }
      }
      
      // Fetch waivers
      const allWaivers = await storage.getWaiversByOrganization(quote.organizationId);
      const waivers = allWaivers.filter((w: any) => requiredWaiverIds.has(w.id) && w.isActive);
      
      res.json({ 
        ...quote, 
        checkoutId: quote.id, 
        lead,
        user,
        waivers,
        suggestedAddOns: addOns.slice(0, 3),
        programs,
      });
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Fetch quotes for a specific user (for their payments tab)
  app.get("/api/account/quotes", requireAuth, async (req: any, res) => {
    try {
      const allQuotes = await storage.getQuoteCheckoutsByOrganization(req.user.organizationId);
      const currentUser = await storage.getUser(req.user.id);
      
      // Get all user IDs that share the same email (handles multi-account scenarios)
      const allUsers = await storage.getUsersByOrganization(req.user.organizationId);
      const matchingUserIds = new Set<string>();
      matchingUserIds.add(req.user.id);
      
      // Also add any user accounts with the same email
      if (currentUser?.email) {
        allUsers.forEach((u: any) => {
          if (u.email === currentUser.email) {
            matchingUserIds.add(u.id);
          }
        });
      }
      
      // Get all leads with the user's email to find quotes linked to those leads
      const allLeads = await storage.getCrmLeadsByOrganization(req.user.organizationId);
      const matchingLeadIds = new Set<number>();
      if (currentUser?.email) {
        allLeads.forEach((lead: any) => {
          if (lead.email && lead.email.toLowerCase() === currentUser.email.toLowerCase()) {
            matchingLeadIds.add(lead.id);
          }
        });
      }
      
      // Filter quotes that match by userId OR by leadId (for quotes created for leads before they registered)
      const userQuotes = allQuotes.filter((q: any) => 
        q.status === 'pending' && (
          matchingUserIds.has(q.userId) || 
          (q.leadId && matchingLeadIds.has(q.leadId))
        )
      );
      res.json(userQuotes);
    } catch (error: any) {
      console.error('Error fetching user quotes:', error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Complete quote checkout (creates account, player, and redirects to payment)
  app.post("/api/quote-checkouts/:checkoutId/complete", async (req: any, res) => {
    try {
      const quote = await storage.getQuoteCheckout(req.params.checkoutId);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      if (quote.status === 'completed') {
        return res.status(400).json({ error: "Quote has already been completed" });
      }
      if (quote.status === 'expired' || (quote.expiresAt && new Date(quote.expiresAt) < new Date())) {
        return res.status(400).json({ error: "Quote has expired" });
      }

      const { firstName, lastName, email, password, phone, playerFirstName, playerLastName, playerBirthDate, playerId } = req.body;
      const { nanoid } = await import('nanoid');
      
      let accountUser: any;
      let player: any;

      // Determine if this is an existing user checkout based on quote data (server-side, not client)
      const isExistingUserCheckout = !!quote.userId;

      // Security: For existing user checkouts, verify the authenticated user matches the quote's userId
      if (isExistingUserCheckout) {
        const authenticatedUserId = req.user?.id;
        if (!authenticatedUserId || authenticatedUserId !== quote.userId) {
          return res.status(403).json({ error: "You are not authorized to complete this checkout. Please log in with the correct account." });
        }
      }

      // Validate required fields based on checkout type
      if (!isExistingUserCheckout) {
        // New user checkout requires all account and player fields
        if (!email || !password || !firstName || !lastName) {
          return res.status(400).json({ error: "Account details (email, password, first name, last name) are required" });
        }
        if (!playerFirstName || !playerLastName) {
          return res.status(400).json({ error: "Player details (first name, last name) are required" });
        }
      }

      // Check if this is a quote for an existing user
      if (isExistingUserCheckout) {
        // Use existing user from quote
        accountUser = await storage.getUser(quote.userId);
        if (!accountUser) {
          return res.status(400).json({ error: "User associated with this quote not found" });
        }
        
        // Check if a specific player was selected
        if (playerId) {
          player = await storage.getUser(playerId);
          // Verify this player belongs to the account
          if (!player || (player.parentId !== accountUser.id && player.linkedParentId !== accountUser.id && player.accountHolderId !== accountUser.id)) {
            return res.status(400).json({ error: "Selected player not found or doesn't belong to this account" });
          }
        } else {
          // Get the first player linked to this account for enrollment
          const linkedPlayers = await storage.getPlayersByParent(accountUser.id);
          player = linkedPlayers[0]; // Use first player if available
        }
        
        if (!player) {
          // If no player exists, create one using provided or account holder's name
          const pFirstName = playerFirstName || accountUser.firstName || 'Player';
          const pLastName = playerLastName || accountUser.lastName || 'Profile';
          player = await storage.createUser({
            id: nanoid(21),
            firstName: pFirstName,
            lastName: pLastName,
            email: `${pFirstName.toLowerCase().replace(/\s+/g, '')}.${nanoid(6)}@player.local`,
            role: 'player',
            userType: 'player',
            dateOfBirth: playerBirthDate ? new Date(playerBirthDate) : null,
            parentId: accountUser.id,
            organizationId: quote.organizationId,
            isVerified: false,
          });
        }
      } else {
        // New user flow - create account
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: "An account with this email already exists. Please login instead." });
        }

        // Create parent account
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        
        accountUser = await storage.createUser({
          id: nanoid(21),
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'parent',
          userType: 'parent',
          organizationId: quote.organizationId,
          emailVerified: false,
          isVerified: false,
        });

        // Create player profile
        player = await storage.createUser({
          id: nanoid(21),
          firstName: playerFirstName,
          lastName: playerLastName,
          email: `${playerFirstName.toLowerCase()}.${nanoid(6)}@player.local`,
          role: 'player',
          userType: 'player',
          dateOfBirth: playerBirthDate ? new Date(playerBirthDate) : null,
          parentId: accountUser.id,
          organizationId: quote.organizationId,
          isVerified: false,
        });
      }

      // Update quote status
      await storage.updateQuoteCheckout(quote.id, { 
        status: 'completed',
        userId: accountUser.id,
        completedAt: new Date(),
      });

      // Create enrollments for program items (pending player assignment)
      const enrollmentIds: number[] = [];
      if (quote.items && Array.isArray(quote.items)) {
        for (const item of quote.items) {
          if (item.type === 'program' && item.productId) {
            const program = await storage.getProgram(item.productId);
            const enrollment = await storage.createEnrollment({
              organizationId: quote.organizationId,
              programId: item.productId,
              accountHolderId: accountUser.id,
              profileId: player.id, // Assign to the player created during checkout
              status: 'pending', // Will be activated after payment
              source: 'quote',
              totalCredits: program?.sessionCount || null,
              remainingCredits: program?.sessionCount || null,
              metadata: { quoteId: quote.id, quoteItemName: item.productName },
            });
            enrollmentIds.push(enrollment.id);
          }
        }
      }

      // If there are items that require payment, create a Stripe checkout session
      if (quote.totalAmount && quote.totalAmount > 0 && stripe) {
        const lineItems = quote.items?.map((item: any) => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.productName || item.name,
            },
            unit_amount: item.price,
          },
          quantity: item.quantity || 1,
        })) || [];

        const baseUrl = req.headers.origin || 'http://localhost:5000';
        const successUrl = isExistingUserCheckout 
          ? `${baseUrl}/account?tab=payments&checkout=success`
          : `${baseUrl}/login?checkout=success`;
        
        const quoteOrgStripe = await getStripeForOrg(quote.organizationId);
        if (!quoteOrgStripe) {
          return res.status(500).json({ error: "Payment processing is not configured for this organization" });
        }
        // Add service fee
        const { lineItem: quoteFeeLineItem, feeCents: quoteServiceFeeCents } = await getServiceFeeLineItem(quote.totalAmount || 0);
        lineItems.push(quoteFeeLineItem);

        const quoteOrgName = await getOrgDisplayName(quote.organizationId);
        const quoteSessionParams: any = {
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: `${baseUrl}/checkout/${req.params.checkoutId}?checkout=cancelled`,
          customer_email: email || accountUser.email,
          payment_intent_data: {
            statement_descriptor: quoteOrgName.substring(0, 22),
          },
          metadata: {
            userId: accountUser.id,
            playerId: player.id,
            quoteId: quote.id,
            enrollmentIds: JSON.stringify(enrollmentIds),
          },
        };

        const connectResult6 = await applyConnectChargeParams(quoteSessionParams, quote.organizationId, 'payment', quoteServiceFeeCents);
        verifyConnectRouting(quoteSessionParams, 'payment', quote.organizationId, connectResult6, { applicationFeeAmount: quoteServiceFeeCents, checkoutType: 'quote_checkout' });

        console.log(`[Connect] quote_checkout: creating session for org ${quote.organizationId}`, {
          payment_intent_data: quoteSessionParams.payment_intent_data ?? null,
        });

        const session = await quoteOrgStripe.checkout.sessions.create(quoteSessionParams);

        return res.json({ paymentUrl: session.url });
      }

      // No payment needed - activate enrollments immediately
      for (const enrollmentId of enrollmentIds) {
        await storage.updateEnrollment(enrollmentId, { status: 'active' });
      }

      res.json({ success: true, userId: accountUser.id });
    } catch (error: any) {
      console.error('Error completing quote checkout:', error);
      res.status(500).json({ error: error.message || "Failed to complete checkout" });
    }
  });

  // Reply to contact management message
  app.post("/api/contact-management/:id/reply", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const parentMessageId = parseInt(req.params.id);
      const allOrgMessages = await storage.getContactManagementMessages(req.user.organizationId);
      const parentMsg = allOrgMessages.find((m: any) => m.id === parentMessageId);
      if (!parentMsg) {
        return res.status(404).json({ error: "Message not found" });
      }
      const user = await storage.getUser(req.user.id);
      const senderName = user ? `${user.firstName} ${user.lastName}` : 'Admin';
      const reply = await storage.createContactManagementMessage({
        senderId: req.user.id,
        organizationId: req.user.organizationId,
        senderName,
        senderEmail: user?.email || null,
        message: req.body.message,
        parentMessageId,
        isAdmin: true,
      });
      await storage.updateContactManagementMessage(parentMessageId, {
        status: 'replied',
        repliedBy: req.user.id,
        repliedAt: new Date().toISOString(),
      });

      try {
        if (parentMsg.senderId && parentMsg.senderId !== req.user.id) {
          const org = await storage.getOrganization(req.user.organizationId);
          const orgName = org?.name || 'Your Organization';
          const recipientUser = await storage.getUser(parentMsg.senderId);
          const recipientRole = recipientUser?.role || 'parent';
          const targetUrl = recipientRole === 'admin' ? '/admin-dashboard?tab=communications&subtab=messages' : '/home?tab=messages';

          await adminNotificationService.createNotification({
            organizationId: req.user.organizationId,
            types: ['message'],
            title: `New message from ${orgName}`,
            message: `${senderName} replied to your message`,
            recipientTarget: 'users',
            recipientUserIds: [parentMsg.senderId],
            deliveryChannels: ['push'],
            sentBy: req.user.id,
            status: 'sent',
          }, { url: targetUrl });
        }
      } catch (notifError: any) {
        console.error('⚠️ Contact management reply notification failed (non-fatal):', notifError.message);
      }

      res.json(reply);
    } catch (error: any) {
      console.error('Error sending reply:', error);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  app.post("/api/contact-management/admin-initiate", requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const { recipientUserId, message } = req.body;
      if (!recipientUserId || !message?.trim()) {
        return res.status(400).json({ error: "recipientUserId and message are required" });
      }
      const recipient = await storage.getUser(recipientUserId);
      if (!recipient) {
        return res.status(404).json({ error: "User not found" });
      }
      const admin = await storage.getUser(req.user.id);
      const adminName = admin ? `${admin.firstName} ${admin.lastName}` : 'Admin';

      const org = await storage.getOrganization(req.user.organizationId);
      const orgName = org?.name || 'Your Organization';
      const recipientName = `${recipient.firstName} ${recipient.lastName}`;
      const existingMessages = await storage.getContactManagementMessagesBySender(recipientUserId);
      const existingThread = existingMessages.find((m: any) => !m.parentMessageId);

      let parentMessageId: number;

      if (existingThread) {
        parentMessageId = existingThread.id;
      } else {
        const threadStarter = await storage.createContactManagementMessage({
          organizationId: req.user.organizationId,
          senderId: recipientUserId,
          senderName: recipientName,
          senderEmail: recipient.email || null,
          message: `Conversation with ${recipientName}`,
          isAdmin: false,
        });
        parentMessageId = threadStarter.id;
      }

      const reply = await storage.createContactManagementMessage({
        organizationId: req.user.organizationId,
        senderId: req.user.id,
        senderName: adminName,
        senderEmail: admin?.email || null,
        message,
        parentMessageId,
        isAdmin: true,
      });

      try {
        const recipientUser = await storage.getUser(recipientUserId);
        const recipientRole = recipientUser?.role || 'parent';
        const targetUrl = recipientRole === 'admin' ? '/admin-dashboard?tab=communications&subtab=messages' : '/home?tab=messages';

        await adminNotificationService.createNotification({
          organizationId: req.user.organizationId,
          types: ['message'],
          title: `New message from ${orgName}`,
          message: `${adminName}: ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`,
          recipientTarget: 'users',
          recipientUserIds: [recipientUserId],
          deliveryChannels: ['push'],
          sentBy: req.user.id,
          status: 'sent',
        }, { url: targetUrl });
      } catch (notifError: any) {
        console.error('⚠️ Admin-initiated message notification failed (non-fatal):', notifError.message);
      }

      res.json(reply);
    } catch (error: any) {
      console.error('Error creating admin-initiated message:', error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // =============================================
  // SCHEDULE REQUEST & AVAILABILITY ROUTES
  // =============================================
  
  // Get availability slots for a program
  app.get('/api/programs/:programId/availability', async (req, res) => {
    try {
      const slots = await storage.getAvailabilitySlotsByProgram(req.params.programId);
      res.json(slots);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch availability slots" });
    }
  });
  
  // Save availability slots for a program (admin only - replaces all slots)
  app.put('/api/programs/:programId/availability', requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) return res.status(403).json({ error: "Admin access required" });
      const { programId } = req.params;
      const { slots } = req.body;
      
      if (!Array.isArray(slots)) {
        return res.status(400).json({ error: "slots must be an array" });
      }
      
      const program = await storage.getProgram(programId);
      if (!program) {
        return res.status(404).json({ error: "Program not found" });
      }
      
      // Delete existing slots and create new ones
      await storage.deleteAvailabilitySlotsByProgram(programId);
      
      const createdSlots = [];
      for (const slot of slots) {
        const created = await storage.createAvailabilitySlot({
          programId,
          organizationId: program.organizationId || req.user.organizationId,
          dayOfWeek: slot.dayOfWeek,
          specificDate: slot.specificDate || null,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: slot.isRecurring !== false,
          isActive: true,
        });
        createdSlots.push(created);
      }
      
      res.json(createdSlots);
    } catch (error: any) {
      console.error('Error saving availability slots:', error);
      res.status(500).json({ error: "Failed to save availability slots" });
    }
  });
  
  // Get existing booked sessions for a program (to show unavailable times)
  app.get('/api/programs/:programId/booked-sessions', requireAuth, async (req: any, res) => {
    try {
      const { programId } = req.params;
      const requests = await storage.getScheduleRequestsByProgram(programId);
      // Return only active/pending sessions (not cancelled) with minimal data
      const bookedSessions = requests
        .filter((e: any) => e.status === 'active' || e.status === 'pending')
        .map((e: any) => ({
          id: e.id,
          startTime: e.startTime,
          endTime: e.endTime,
          status: e.status,
        }));
      res.json(bookedSessions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch booked sessions" });
    }
  });
  
  // Create a schedule request (parent booking a session)
  app.post('/api/schedule-requests', requireAuth, async (req: any, res) => {
    try {
      const { programId, enrollmentId, playerId, startTime, endTime, note } = req.body;
      const userId = req.user.id;
      
      if (!programId || !enrollmentId || !playerId || !startTime || !endTime) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Verify enrollment exists and belongs to this user
      const enrollments = await storage.getEnrollmentsByAccountHolder(userId);
      const enrollment = enrollments.find((e: any) => e.id === enrollmentId);
      if (!enrollment) {
        return res.status(403).json({ error: "Enrollment not found" });
      }
      
      // Check remaining credits
      const remainingCredits = enrollment.remainingCredits || 0;
      
      // Count pending/active schedule requests for this enrollment
      const existingRequests = await storage.getScheduleRequestsByEnrollment(enrollmentId);
      const activeRequests = existingRequests.filter((e: any) => 
        e.status === 'pending' || e.status === 'active'
      );
      
      const effectiveRemaining = remainingCredits - activeRequests.length;
      
      if (effectiveRemaining <= 0) {
        return res.status(400).json({ 
          error: "No sessions available",
          remainingCredits: 0,
          pendingRequests: activeRequests.length,
        });
      }
      
      // Get program details for event title
      const program = await storage.getProgram(programId);
      const player = await storage.getUser(playerId);
      const playerName = player ? `${player.firstName} ${player.lastName}` : 'Player';
      
      // Create the event as pending
      const event = await storage.createEvent({
        title: `${program?.name || 'Session'} - ${playerName}`,
        description: note || `Session requested by parent`,
        eventType: 'training',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        location: '',
        status: 'pending',
        scheduleRequestSource: 'schedule_request',
        requestedByUserId: userId,
        enrollmentId,
        programId,
        playerId,
        isActive: true,
        createdBy: userId,
        scheduleRequestNote: note || null,
      });
      
      res.json({ 
        success: true, 
        event,
        remainingCredits: effectiveRemaining - 1,
      });
    } catch (error: any) {
      console.error('Error creating schedule request:', error);
      res.status(500).json({ error: "Failed to create schedule request" });
    }
  });
  
  
  // Get effective remaining credits for an enrollment (accounting for pending requests)
  app.get('/api/enrollments/:enrollmentId/available-credits', requireAuth, async (req: any, res) => {
    try {
      const enrollmentId = parseInt(req.params.enrollmentId);
      const enrollments = await storage.getEnrollmentsByAccountHolder(req.user.id);
      const enrollment = enrollments.find((e: any) => e.id === enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ error: "Enrollment not found" });
      }
      
      const existingRequests = await storage.getScheduleRequestsByEnrollment(enrollmentId);
      const pendingCount = existingRequests.filter((e: any) => e.status === 'pending').length;
      const approvedCount = existingRequests.filter((e: any) => e.status === 'active').length;
      const remainingCredits = enrollment.remainingCredits || 0;
      const effectiveRemaining = remainingCredits - pendingCount;
      
      res.json({
        totalCredits: enrollment.totalCredits || 0,
        remainingCredits,
        pendingRequests: pendingCount,
        approvedSessions: approvedCount,
        effectiveRemaining: Math.max(0, effectiveRemaining),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check credits" });
    }
  });

  // =============================================
  // BULK USER IMPORT ENDPOINT
  // =============================================

  app.post('/api/users/bulk-import', requireAuth, async (req: any, res) => {
    try {
      const isAdminUser = req.user.role === 'admin' || await hasAdminProfile(req.user.id, req.user.organizationId);
      if (!isAdminUser) {
        return res.status(403).json({ error: 'Only admins can bulk import users' });
      }

      const { organizationId } = req.user;
      const { users: rawUsersToImport, sendWelcomeEmails = true } = req.body;

      if (!Array.isArray(rawUsersToImport) || rawUsersToImport.length === 0) {
        return res.status(400).json({ error: 'No users provided' });
      }

      const VALID_ROLES = ['parent', 'player', 'coach', 'admin'];
      const VALID_STATUSES = ['active', 'inactive'];

      // Normalize role and status server-side (lowercase + allowlist) for consistency
      const usersToImport: BulkImportRow[] = rawUsersToImport.map((u: Record<string, unknown>) => {
        const role = (String(u.role || 'player')).toLowerCase().trim();
        const status = (String(u.status || 'active')).toLowerCase().trim();
        return {
          firstName: String(u.firstName || ''),
          lastName: String(u.lastName || ''),
          email: String(u.email || '').trim(),
          phone: String(u.phone || ''),
          role: (VALID_ROLES.includes(role) ? role : 'player') as BulkImportRow['role'],
          status: (VALID_STATUSES.includes(status) ? status : 'active') as BulkImportRow['status'],
          teamName: String(u.teamName || ''),
          teamCode: String(u.teamCode || ''),
          programName: String(u.programName || ''),
          programCode: String(u.programCode || ''),
          parentEmail: String(u.parentEmail || ''),
          startDate: String(u.startDate || ''),
          endDate: String(u.endDate || ''),
        };
      });

      // Fetch all teams and programs for this org for code/name matching
      const orgTeams = await storage.getTeamsByOrganization(organizationId);
      const orgPrograms = await storage.getProgramsByOrganization(organizationId);

      // Get the org name for welcome email
      const org = await storage.getOrganization(organizationId);
      const orgName = org?.name || 'your organization';

      let successCount = 0;
      let emailsSent = 0;
      const errors: string[] = [];

      // Track created parents by email for child linking (used when linking players to parents)
      const parentsByEmail: Record<string, { id: string; organizationId: string; accountHolderId?: string }> = {};

      // First pass: create parents
      const parents = usersToImport.filter((u: BulkImportRow) => u.role === 'parent');
      for (const userData of parents) {
        try {
          const email = userData.email?.trim() || '';
          if (!email && !userData.firstName) {
            errors.push(`Skipped user with no email or name`);
            continue;
          }

          // Check for existing user by email within this organization only
          let existingUser = null;
          if (email) {
            existingUser = await storage.getUserByEmail(email, organizationId);
          }

          if (existingUser) {
            // Track existing parent for child linking but do not count as created
            if (email) parentsByEmail[email.toLowerCase()] = { id: existingUser.id, organizationId: existingUser.organizationId || organizationId, accountHolderId: existingUser.accountHolderId };
            continue;
          } else {
            const magicLinkToken = crypto.randomBytes(32).toString('hex');
            const magicLinkExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const teamId = resolveTeamId(userData, orgTeams);
            const newId = crypto.randomUUID();

            await db.insert(users).values({
              id: newId,
              organizationId,
              email: email || null,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              role: 'parent',
              phoneNumber: userData.phone || null,
              teamId: teamId ?? null,
              isActive: userData.status === 'inactive' ? false : true,
              verified: true,
              magicLinkToken,
              magicLinkExpiry: magicLinkExpiry.toISOString(),
              needsLegacyClaim: false,
            });

            // Handle program enrollment (parent is their own accountHolder)
            await handleProgramEnrollment(newId, organizationId, userData, orgPrograms, newId);

            successCount++;

            // Cache for child linking
            if (email) {
              parentsByEmail[email.toLowerCase()] = { id: newId, organizationId };
            }

            // Send welcome email only to newly created users
            if (sendWelcomeEmails && email) {
              const emailResult = await emailService.sendWelcomeEmail({
                email,
                firstName: userData.firstName || '',
                magicLinkToken,
                organizationName: orgName,
              });
              if (emailResult.success) emailsSent++;
            }
          }
        } catch (err: any) {
          errors.push(`Failed to create parent ${userData.email || userData.firstName}: ${err.message}`);
        }
      }

      // Second pass: create players, coaches, and admins
      const nonParents = usersToImport.filter((u: BulkImportRow) => u.role !== 'parent');
      for (const userData of nonParents) {
        try {
          const email = userData.email?.trim() || '';
          if (!email && !userData.firstName) {
            errors.push(`Skipped user with no email or name`);
            continue;
          }

          // Check for existing user within this organization only
          let existingUser = null;
          if (email) {
            existingUser = await storage.getUserByEmail(email, organizationId);
          }
          if (existingUser) {
            // Skip without counting as created
            continue;
          }

          const magicLinkToken = crypto.randomBytes(32).toString('hex');
          const magicLinkExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

          const teamId = resolveTeamId(userData, orgTeams);

          // Link to parent by parentEmail — only within this organization
          let parentId: string | null = null;
          let accountHolderId: string | null = null;
          if (userData.parentEmail) {
            const parentEmail = userData.parentEmail.toLowerCase().trim();
            // Try cache first (populated from current import batch), then org-scoped DB lookup
            const parentUser = parentsByEmail[parentEmail] || await storage.getUserByEmail(userData.parentEmail, organizationId);
            if (parentUser && parentUser.organizationId === organizationId) {
              parentId = parentUser.id;
              accountHolderId = parentUser.accountHolderId || parentUser.id;
            }
          }

          const newId = crypto.randomUUID();
          await db.insert(users).values({
            id: newId,
            organizationId,
            email: email || null,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userData.role,
            phoneNumber: userData.phone || null,
            teamId: teamId ?? null,
            isActive: userData.status === 'inactive' ? false : true,
            verified: true,
            magicLinkToken,
            magicLinkExpiry: magicLinkExpiry.toISOString(),
            needsLegacyClaim: false,
            parentId: parentId,
            accountHolderId: accountHolderId,
          });
          // accountHolderId: use the resolved parent if available, otherwise the user is their own accountHolder
          const enrollmentAccountHolderId = accountHolderId || newId;
          await handleProgramEnrollment(newId, organizationId, userData, orgPrograms, enrollmentAccountHolderId);

          successCount++;

          if (sendWelcomeEmails && email) {
            const emailResult = await emailService.sendWelcomeEmail({
              email,
              firstName: userData.firstName || '',
              magicLinkToken,
              organizationName: orgName,
            });
            if (emailResult.success) emailsSent++;
          }
        } catch (err: any) {
          errors.push(`Failed to create ${userData.role || 'user'} ${userData.email || userData.firstName}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        created: successCount,
        emailsSent,
        errors,
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({ error: 'Bulk import failed', details: error.message });
    }
  });

  interface BulkImportRow {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'parent' | 'player' | 'coach' | 'admin';
    status: 'active' | 'inactive';
    teamName: string;
    teamCode: string;
    programName: string;
    programCode: string;
    parentEmail: string;
    startDate: string;
    endDate: string;
  }

  interface OrgTeam { id: number; name: string; code?: string | null }
  interface OrgProgram { id: string; name: string; code?: string | null; productCategory?: string | null }

  function resolveTeamId(userData: BulkImportRow, orgTeams: OrgTeam[]): number | null {
    // Try by code first, then by name
    if (userData.teamCode) {
      const t = orgTeams.find(t => t.code && t.code.toLowerCase() === userData.teamCode.toLowerCase());
      if (t) return t.id;
    }
    if (userData.teamName) {
      const t = orgTeams.find(t => t.name.toLowerCase() === userData.teamName.toLowerCase());
      if (t) return t.id;
    }
    return null;
  }

  async function handleProgramEnrollment(userId: string, organizationId: string, userData: BulkImportRow, orgPrograms: OrgProgram[], accountHolderId: string) {
    // Restrict to service/program products only (not physical goods) to avoid cross-category enrollment
    const servicePrograms = orgPrograms.filter(p => !p.productCategory || p.productCategory === 'service');

    // Resolve program by code, then name
    let programId: string | undefined;
    if (userData.programCode) {
      const p = servicePrograms.find(p => p.code && p.code.toLowerCase() === userData.programCode.toLowerCase());
      if (p) programId = p.id;
    }
    if (!programId && userData.programName) {
      const p = servicePrograms.find(p => p.name.toLowerCase() === userData.programName.toLowerCase());
      if (p) programId = p.id;
    }

    if (programId) {
      const existing = await db.select({ id: productEnrollments.id })
        .from(productEnrollments)
        .where(and(
          eq(productEnrollments.profileId, userId),
          eq(productEnrollments.programId, programId),
          eq(productEnrollments.status, 'active')
        ))
        .limit(1);

      if (existing.length === 0) {
        const parseDate = (raw: string | undefined): string | null => {
          if (!raw) return null;
          try {
            const d = new Date(raw);
            if (isNaN(d.getTime())) return null;
            return d.toISOString();
          } catch {
            return null;
          }
        };
        await db.insert(productEnrollments).values({
          organizationId,
          programId,
          profileId: userId,
          accountHolderId,
          status: 'active',
          source: 'admin',
          startDate: parseDate(userData.startDate),
          endDate: parseDate(userData.endDate),
        });
      }
    }
  }

  // =============================================
  // HTTP SERVER SETUP
  // =============================================
  
  const server = createServer(app);
  
  // Note: WebSocket server disabled to avoid conflicts with Vite HMR
  // Uncomment if you need WebSocket functionality for real-time updates
  // wss = new WebSocketServer({ server });
  // wss.on('connection', (ws) => {
  //   console.log('WebSocket client connected');
  //   ws.on('message', (message) => {
  //     console.log('Received:', message.toString());
  //   });
  //   ws.on('close', () => {
  //     console.log('WebSocket client disconnected');
  //   });
  // });
  
  return server;
}
