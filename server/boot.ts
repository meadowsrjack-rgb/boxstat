
import { pool } from "./db";

export async function ensureAuxTables() {
  const client = await pool.connect();
  try {
    // profile_privacy: per-profile privacy settings as JSON
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_privacy (
        profile_id varchar PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamp DEFAULT now()
      );
    `);

    // team_join_requests: track join requests from profiles to teams
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_join_requests (
        id SERIAL PRIMARY KEY,
        profile_id varchar NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        message text,
        status varchar NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'cancelled'
        created_at timestamp DEFAULT now(),
        UNIQUE (profile_id, team_id, status)
      );
    `);
  } finally {
    client.release();
  }
}
