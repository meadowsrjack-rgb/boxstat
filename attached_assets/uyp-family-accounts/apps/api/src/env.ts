
import 'dotenv/config';

export const env = {
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:8787',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_secret',
  EMAIL_FROM: process.env.EMAIL_FROM || 'UYP <no-reply@uyp.app>',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  PRICE_FAMILY_MONTHLY: process.env.STRIPE_PRICE_FAMILY_MONTHLY || '',
  PRICE_FAMILY_ANNUAL: process.env.STRIPE_PRICE_FAMILY_ANNUAL || '',
  PRICE_SEASON_PASS: process.env.STRIPE_PRICE_SEASON_PASS || '',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./uyp.db',
};
