import { pool } from "./db";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

export function hasNotionCreds() {
  return !!(NOTION_TOKEN && NOTION_DATABASE_ID);
}

type NotionPlayer = {
  id: string;
  name: string;
  teamNames: string[];
  dob?: string | null;
  claimCode?: string | null;
  imageUrl?: string | null;
};

function plain(rich: any[] | undefined) {
  return (rich || []).map((r: any) => r.plain_text).join("") || "";
}

async function getOrCreateTeamId(client: any, name: string): Promise<number> {
  const sel = await client.query(`SELECT id FROM teams WHERE name=$1 LIMIT 1`, [name]);
  if (sel.rowCount) return sel.rows[0].id;
  const ins = await client.query(`INSERT INTO teams (name) VALUES ($1) RETURNING id`, [name]);
  return ins.rows[0].id;
}

export async function syncNotionRoster() {
  if (!hasNotionCreds()) throw new Error("NOTION env missing");
  
  // Mock implementation since we don't have Notion client installed
  // This would need the @notionhq/client package to work properly
  throw new Error("Notion client not available - install @notionhq/client package");
}