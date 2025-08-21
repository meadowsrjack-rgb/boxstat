import { pool } from "./db";
import { Client } from "@notionhq/client";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

export function hasNotionCreds() {
  return !!(NOTION_TOKEN && NOTION_DATABASE_ID);
}

// Initialize Notion client
export const notion = new Client({
    auth: NOTION_TOKEN!,
});

export { NOTION_DATABASE_ID };

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
  
  // This function syncs roster data from Notion to local database
  // Implementation depends on your specific Notion database structure
  console.log("Syncing roster from Notion...");
}

// Search teams in Notion
export async function searchNotionTeams(query: string = "") {
  if (!hasNotionCreds()) throw new Error("NOTION env missing");
  
  try {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID!,
      filter: query ? {
        or: [
          {
            property: "Team Name",
            title: {
              contains: query
            }
          },
          {
            property: "Name",
            title: {
              contains: query
            }
          }
        ]
      } : undefined,
    });

    const teams: any[] = [];
    const teamMap = new Map();

    response.results.forEach((page: any) => {
      const properties = page.properties;
      
      // Extract team information
      const teamName = properties["Team Name"]?.title?.[0]?.plain_text || 
                      properties["Team"]?.select?.name || 
                      "Unknown Team";
      
      const playerName = properties["Name"]?.title?.[0]?.plain_text || 
                        properties["Player Name"]?.title?.[0]?.plain_text || 
                        "Unknown Player";
      
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, {
          id: teamName.replace(/\s+/g, '-').toLowerCase(),
          name: teamName,
          roster_count: 0,
          roster: []
        });
      }
      
      const team = teamMap.get(teamName);
      team.roster_count++;
      team.roster.push({
        id: page.id,
        first_name: playerName.split(' ')[0] || '',
        last_name: playerName.split(' ').slice(1).join(' ') || '',
        profile_image_url: properties["Profile Image"]?.files?.[0]?.file?.url || null
      });
    });

    return Array.from(teamMap.values());
  } catch (error) {
    console.error("Error searching Notion teams:", error);
    throw new Error("Failed to search teams in Notion");
  }
}

// Get team details from Notion
export async function getNotionTeamDetails(teamId: string) {
  if (!hasNotionCreds()) throw new Error("NOTION env missing");
  
  try {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID!,
      filter: {
        property: "Team Name",
        title: {
          contains: teamId.replace('-', ' ')
        }
      }
    });

    const roster = response.results.map((page: any) => {
      const properties = page.properties;
      const playerName = properties["Name"]?.title?.[0]?.plain_text || 
                        properties["Player Name"]?.title?.[0]?.plain_text || 
                        "Unknown Player";
      
      return {
        id: page.id,
        first_name: playerName.split(' ')[0] || '',
        last_name: playerName.split(' ').slice(1).join(' ') || '',
        profile_image_url: properties["Profile Image"]?.files?.[0]?.file?.url || null
      };
    });

    return {
      roster,
      roster_count: roster.length
    };
  } catch (error) {
    console.error("Error getting Notion team details:", error);
    throw new Error("Failed to get team details from Notion");
  }
}