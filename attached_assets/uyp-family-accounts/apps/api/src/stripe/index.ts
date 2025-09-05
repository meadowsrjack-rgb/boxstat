
import { Router } from 'express';
import Stripe from 'stripe';
import { env } from '../env.js';
import { db } from '../db.js';

export const stripeRouter = Router();
const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Auth required' });
  next();
}

stripeRouter.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });
  const { priceId, mode } = req.body || {};
  if (!priceId || !mode) return res.status(400).json({ error: 'Missing priceId/mode' });

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/onboarding`,
    customer_email: req.session.user.email,
    metadata: { userId: String(req.session.user.id) },
  });
  res.json({ url: session.url });
});

stripeRouter.post('/portal', requireAuth, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });
  const subs = db.prepare('SELECT * FROM subscriptions WHERE userId = ? ORDER BY id DESC').get(req.session.user.id);
  const customerId = subs?.stripeCustomerId;
  if (!customerId) return res.status(400).json({ error: 'No Stripe customer' });

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.APP_URL}/payments`,
  });
  res.json({ url: portal.url });
});

stripeRouter.post('/webhook', async (req, res) => {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) return res.status(200).send('[dev] webhook ok');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(await (req as any).rawBody, sig as string, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verify failed', err);
    return res.status(400).send(`Webhook Error: ${(err as any).message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = Number(s.metadata?.userId || 0);
      const customerId = typeof s.customer === 'string' ? s.customer : (s.customer as any)?.id;
      if (userId && customerId) {
        db.prepare('INSERT INTO subscriptions (userId, status, stripeCustomerId, plan, currentPeriodEnd) VALUES (?,?,?,?,?)')
          .run(userId, s.status || 'paid', customerId, 'family_monthly', null);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any)?.id;
      const status = sub.status;
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      db.prepare('INSERT INTO subscriptions (userId, status, stripeCustomerId, stripeSubId, plan, currentPeriodEnd) VALUES ((SELECT id FROM users WHERE email=(SELECT email FROM users LIMIT 1)),?,?,?,?,?)')
        .run(status, customerId, sub.id, 'family_monthly', currentPeriodEnd);
      break;
    }
    default: break;
  }

  res.json({ received: true });
});
