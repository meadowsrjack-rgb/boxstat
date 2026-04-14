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
  } finally {
    client.release();
  }
}