
import { Client } from "@notionhq/client";
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

function extractPlain(rich?: any[]): string {
  return (rich || []).map((r: any) => r.plain_text).join("") || "";
}

export async function syncNotionRoster() {
  if (!hasNotionCreds()) {
    throw new Error("Missing NOTION_TOKEN/NOTION_DATABASE_ID env vars");
  }
  const notion = new Client({ auth: NOTION_TOKEN });
  let cursor: string | undefined = undefined;
  const rows: any[] = [];

  do {
    const resp: any = await notion.databases.query({
      database_id: NOTION_DATABASE_ID!,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);

  // Parse
  const players: NotionPlayer[] = rows.map((page: any) => {
    const props = page.properties;
    const name = extractPlain(props?.Name?.title);
    const teamNames: string[] = props?.Team?.type === "select"
      ? [props.Team.select?.name].filter(Boolean)
      : (props?.Team?.multi_select || []).map((s: any) => s.name).filter(Boolean);
    const dob = props?.DOB?.date?.start || null;
    const claimCode = props?.["Claim Code"]?.rich_text ? extractPlain(props["Claim Code"].rich_text) : null;
    let imageUrl: string | null = null;
    if (page.cover?.external?.url) imageUrl = page.cover.external.url;
    if (page.cover?.file?.url) imageUrl = page.cover.file.url;

    return { id: page.id, name, teamNames, dob, claimCode, imageUrl };
  });

  // Upsert teams and profiles
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // cache teams
    const teamNameToId = new Map<string, number>();
    for (const p of players) {
      for (const tname of p.teamNames) {
        if (!tname) continue;
        if (!teamNameToId.has(tname)) {
          const ins = await client.query(
            `INSERT INTO teams (name, age_group, color) VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [tname, "unknown", "#1E40AF"],
          );
          teamNameToId.set(tname, ins.rows[0].id);
        }
      }
    }

    // Upsert profiles (players only)
    for (const p of players) {
      if (!p.name) continue;
      const [firstName, ...rest] = p.name.split(" ");
      const lastName = rest.join(" ");
      const teamId = p.teamNames[0] ? teamNameToId.get(p.teamNames[0]) ?? null : null;

      // Create a dedicated account for player if none; or store under a generic account?
      // Here we only upsert profile by a stable synthetic id derived from notion id.
      const profileId = `notion_${p.id}`;

      await client.query(
        `INSERT INTO profiles (id, account_id, profile_type, first_name, last_name, date_of_birth, team_id, profile_image_url)
         VALUES ($1, $2, 'player', $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           date_of_birth = EXCLUDED.date_of_birth,
           team_id = EXCLUDED.team_id,
           profile_image_url = EXCLUDED.profile_image_url`,
        [profileId, 'notion-sync', firstName || null, lastName || null, p.dob, teamId, p.imageUrl || null],
      );
    }

    await client.query("COMMIT");
    return { playersCount: players.length, teamsCount: teamNameToId.size };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
