
import { pool } from "./db";

export async function ensureAuxTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_privacy (
        profile_id varchar PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamp DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS team_join_requests (
        id SERIAL PRIMARY KEY,
        profile_id varchar NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        message text,
        status varchar NOT NULL DEFAULT 'pending',
        created_at timestamp DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_claims (
        profile_id varchar PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
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
