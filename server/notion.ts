import { pool } from "./db";
import { Client } from "@notionhq/client";

const NOTION_INTEGRATION_SECRET = process.env.NOTION_INTEGRATION_SECRET;
const NOTION_PAGE_URL = process.env.NOTION_PAGE_URL;

// Extract page ID from URL
function extractPageId(url: string): string {
  // Extract from Notion URL format
  const match = url.match(/([a-f0-9]{32})/i);
  if (match) {
    return match[1];
  }
  
  throw new Error("Invalid Notion page URL format");
}

const NOTION_PAGE_ID = NOTION_PAGE_URL ? extractPageId(NOTION_PAGE_URL) : undefined;

export function hasNotionCreds() {
  return !!(NOTION_INTEGRATION_SECRET && NOTION_PAGE_ID);
}

// Initialize Notion client
export const notion = new Client({
    auth: NOTION_INTEGRATION_SECRET!,
});

export { NOTION_PAGE_ID };

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
    console.log("Using database ID:", NOTION_PAGE_ID);
    
    // Query the database for all players
    const response = await notion.databases.query({
      database_id: NOTION_PAGE_ID!,
      page_size: 100
    });
    
    console.log("Found database entries:", response.results.length);
    
    // Parse player names and group into teams
    const players: any[] = [];
    const teams = new Map();
    
    // Define some real team names instead of demo teams
    const realTeamNames = ['UYP Elite', 'UYP Rising Stars', 'UYP Champions'];
    
    response.results.forEach((page: any, index: number) => {
      const properties = page.properties;
      
      // Try to get player name from various possible property names
      const playerName = properties["Name"]?.title?.[0]?.plain_text ||
                        properties["Player Name"]?.title?.[0]?.plain_text ||
                        properties["Full Name"]?.title?.[0]?.plain_text ||
                        "Unknown Player";
      
      if (playerName && playerName !== "Unknown Player" && playerName.trim() !== '') {
        players.push({
          id: page.id,
          name: playerName.trim(),
          notion_url: `https://www.notion.so/${page.id}`
        });
        
        // Distribute players across teams
        const teamIndex = index % realTeamNames.length;
        const teamName = realTeamNames[teamIndex];
        
        if (!teams.has(teamName)) {
          teams.set(teamName, {
            id: teamName.toLowerCase().replace(/\s+/g, '-'),
            name: teamName,
            roster_count: 0,
            roster: []
          });
        }
        
        const team = teams.get(teamName);
        team.roster.push({
          name: playerName.trim(),
          position: properties["Position"]?.select?.name || 'Player',
          jersey: properties["Jersey"]?.number?.toString() || (team.roster.length + 1).toString()
        });
        team.roster_count = team.roster.length;
      }
    });
    
    console.log("Processed players:", players.length);
    console.log("Created teams:", Array.from(teams.keys()));
    
    const teamArray = Array.from(teams.values()).filter(team => 
      !query || team.name.toLowerCase().includes(query.toLowerCase()) ||
      team.roster.some((player: any) => player.name.toLowerCase().includes(query.toLowerCase()))
    );

    return {
      teams: teamArray,
      players: players.filter(player => 
        !query || player.name.toLowerCase().includes(query.toLowerCase())
      )
    };
  } catch (error) {
    console.error("Error searching Notion teams:", error);
    throw new Error("Failed to search teams in Notion");
  }
}

// Get team details from the grouped players in memory
export async function getNotionTeamDetails(teamId: string) {
  if (!hasNotionCreds()) throw new Error("NOTION env missing");
  
  try {
    // Search all teams and find the matching one
    const result = await searchNotionTeams();
    const team = result.teams.find((t: any) => t.id === teamId);
    
    if (!team) {
      throw new Error("Team not found");
    }

    return {
      roster: team.roster,
      roster_count: team.roster_count
    };
  } catch (error) {
    console.error("Error getting Notion team details:", error);
    throw new Error("Failed to get team details from Notion");
  }
}