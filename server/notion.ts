import { pool } from "./db";
import { Client } from "@notionhq/client";

const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Extract database ID from URL if needed
function extractDatabaseId(input: string): string {
  // If it's already a clean ID (32 characters), return as is
  if (/^[a-f0-9]{32}$/i.test(input.replace(/-/g, ''))) {
    return input.replace(/-/g, '');
  }
  
  // Extract from Notion URL format
  const match = input.match(/([a-f0-9]{32})/i);
  if (match) {
    return match[1];
  }
  
  throw new Error("Invalid database ID format");
}

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID ? extractDatabaseId(process.env.NOTION_DATABASE_ID) : undefined;

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
    console.log("Using page ID:", NOTION_DATABASE_ID);
    
    // Get the page content that contains player links
    const page = await notion.pages.retrieve({
      page_id: NOTION_DATABASE_ID!
    });
    
    // Get all child blocks (which should contain the player links)
    const blocks = await notion.blocks.children.list({
      block_id: NOTION_DATABASE_ID!,
      page_size: 100
    });
    
    console.log("Found blocks:", blocks.results.length);
    
    // Parse player names from the blocks
    const players: any[] = [];
    const teams = new Map();
    
    blocks.results.forEach((block: any) => {
      if (block.type === 'paragraph' && block.paragraph?.rich_text?.length > 0) {
        const text = block.paragraph.rich_text[0];
        if (text.type === 'text' && text.href) {
          const playerName = text.plain_text.trim();
          if (playerName && playerName !== '#' && playerName !== '') {
            const playerId = text.href.split('/').pop()?.split('?')[0] || '';
            
            players.push({
              id: playerId,
              name: playerName,
              notion_url: text.href
            });
            
            // Group players into demo teams for now
            const teamIndex = players.length % 3;
            const teamNames = ['Blazers U12', 'Thunder U14', 'Hawks U16'];
            const teamName = teamNames[teamIndex];
            
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
              name: playerName,
              position: 'Player',
              jersey: (team.roster.length + 1).toString()
            });
            team.roster_count = team.roster.length;
          }
        }
      }
    });
    
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