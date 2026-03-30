CREATE TABLE IF NOT EXISTS "refunds" (
  "id" serial PRIMARY KEY NOT NULL,
  "payment_id" integer NOT NULL,
  "organization_id" varchar NOT NULL,
  "stripe_refund_id" varchar,
  "amount" integer NOT NULL,
  "reason_code" varchar NOT NULL,
  "notes" text,
  "initiated_by" varchar NOT NULL,
  "refunded_fee" boolean DEFAULT false,
  "status" varchar DEFAULT 'succeeded' NOT NULL,
  "requested_at" timestamp DEFAULT now(),
  "cleared_at" timestamp
);
