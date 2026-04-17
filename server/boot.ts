import { pool } from "./db";

/** Creates helper tables if they don't exist. Safe to call on every boot. */
export async function ensureAuxTables() {
  const client = await pool.connect();
  try {
    // Add grace_period_days to organizations if missing
    await client.query(`
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 14;
    `);

    // Add grace_period_end_date to product_enrollments if missing
    await client.query(`
      ALTER TABLE product_enrollments ADD COLUMN IF NOT EXISTS grace_period_end_date timestamp;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_privacy (
        profile_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamp DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS team_join_requests (
        id SERIAL PRIMARY KEY,
        profile_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        team_id integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        message text,
        status varchar NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_claims (
        profile_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        claim_code varchar UNIQUE NOT NULL,
        dob date,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);

    // Pending claim handoff store. See server/lib/pending-claim-store.ts and
    // task #191. Created here (in addition to the Drizzle schema) so a fresh
    // boot against an un-migrated database still works.
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_claims (
        code varchar PRIMARY KEY NOT NULL,
        email varchar NOT NULL,
        organization_id varchar,
        account_id varchar,
        created_at timestamp NOT NULL DEFAULT now(),
        expires_at timestamp NOT NULL
      );
    `);
    // Enforce one active handoff row per email so the "latest wins" replace
    // is atomic under concurrent mints. See storePendingClaim().
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS pending_claims_email_uniq ON pending_claims (email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS pending_claims_expires_at_idx ON pending_claims (expires_at);
    `);
  } finally {
    client.release();
  }
}