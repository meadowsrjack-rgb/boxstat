import { Client } from '@notionhq/client';
import type { NotionPlayer, NotionTeam, NotionCoach } from '../shared/schema.js';
import { TEAM_COACHES } from './coaches.js';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Extract database ID from URL or use as-is if already an ID
const DATABASE_ID = (() => {
  const dbId = process.env.NOTION_DB_ID!;
  if (dbId.includes('notion.so')) {
    // Extract ID from URL: https://www.notion.so/2418bde4fb2c80289fbff19de6c7e53d?v=...
    const match = dbId.match(/\/([a-f0-9]{32})/);
    return match ? match[1] : dbId;
  }
  return dbId;
})();

// Helper function to safely extract property values
function getNotionProperty(properties: any, propertyName: string, type: string): any {
  const property = properties[propertyName];
  if (!property) return undefined;

  switch (type) {
    case 'title':
      return property.title?.[0]?.plain_text?.trim() || undefined;
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text?.trim() || property.rich_text?.[0]?.href?.trim() || undefined;
    case 'select':
      return property.select?.name?.trim() || undefined;
    case 'multi_select':
      return property.multi_select?.map((item: any) => item.name?.trim()).filter(Boolean) || [];
    case 'number':
      return property.number;
    case 'relation':
      // For relations, we'll use the first related item's title if available
      return property.relation?.[0]?.id || undefined;
    default:
      return undefined;
  }
}

// Slugify function
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// Sort players by last name, first name
function sortPlayersByName(players: NotionPlayer[]): NotionPlayer[] {
  return players.sort((a, b) => {
    const aLastName = a.name.split(' ').pop() || '';
    const bLastName = b.name.split(' ').pop() || '';
    const aFirstName = a.name.split(' ').slice(0, -1).join(' ') || '';
    const bFirstName = b.name.split(' ').slice(0, -1).join(' ') || '';
    
    if (aLastName !== bLastName) {
      return aLastName.localeCompare(bLastName);
    }
    return aFirstName.localeCompare(bFirstName);
  });
}

export class NotionPlayerService {
  private playersById: Record<string, NotionPlayer> = {};
  private teamsBySlug: Record<string, NotionTeam> = {};
  private lastSync: Date | null = null;

  async syncFromNotion(): Promise<{ players: NotionPlayer[]; teams: NotionTeam[] }> {
    console.log('Starting Notion sync...');
    
    try {
      // Fetch all pages from the database
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          property: 'Status',
          select: {
            equals: 'Active'
          }
        }
      });

      const players: NotionPlayer[] = [];
      
      for (const page of response.results) {
        if (!('properties' in page)) continue;
        
        const properties = page.properties;
        const name = getNotionProperty(properties, 'Name', 'title');
        
        if (!name) {
          console.log('Skipping row without name');
          continue;
        }

        const status = getNotionProperty(properties, 'Status', 'select') || 'Inactive';
        const currentProgram = getNotionProperty(properties, 'Current Program', 'select');
        const youthClubTeam = getNotionProperty(properties, 'Youth Club Team', 'select') || getNotionProperty(properties, 'Youth Club Team', 'relation');
        const hsTeam = getNotionProperty(properties, 'HS Team', 'rich_text');
        const grade = getNotionProperty(properties, 'Grade', 'number') || getNotionProperty(properties, 'Grade', 'select');
        const sessionTags = getNotionProperty(properties, 'Session', 'multi_select');
        const social = getNotionProperty(properties, 'Social Media', 'rich_text');

        const teamName = youthClubTeam || 'Unassigned';
        const teamSlug = slugify(teamName);

        const player: NotionPlayer = {
          id: page.id,
          name,
          status,
          currentProgram,
          team: teamName,
          teamSlug,
          hsTeam,
          grade,
          sessionTags: sessionTags || [],
          social,
          profileUrl: `/players/${page.id}`
        };

        players.push(player);
      }

      // Build players index
      this.playersById = {};
      players.forEach(player => {
        this.playersById[player.id] = player;
      });

      // Build teams index
      this.teamsBySlug = {};
      const teamMap = new Map<string, NotionPlayer[]>();

      // Group players by team
      players.forEach(player => {
        const slug = player.teamSlug!;
        if (!teamMap.has(slug)) {
          teamMap.set(slug, []);
        }
        teamMap.get(slug)!.push(player);
      });

      // Create team objects
      teamMap.forEach((roster, slug) => {
        const teamName = roster[0]?.team || 'Unassigned';
        const coachData = TEAM_COACHES[slug];
        
        const coach: NotionCoach | undefined = coachData ? {
          name: coachData.name,
          email: coachData.email,
          phone: coachData.phone,
          profileUrl: `/coaches/${slug}`
        } : undefined;

        const team: NotionTeam = {
          name: teamName,
          slug,
          program: 'Youth Club',
          coach,
          roster: sortPlayersByName(roster),
          profileUrl: `/teams/${slug}`
        };

        this.teamsBySlug[slug] = team;
      });

      // Add teams with no active players but have coaches
      Object.keys(TEAM_COACHES).forEach(slug => {
        if (!this.teamsBySlug[slug]) {
          const coachData = TEAM_COACHES[slug];
          const coach: NotionCoach = {
            name: coachData.name,
            email: coachData.email,
            phone: coachData.phone,
            profileUrl: `/coaches/${slug}`
          };

          this.teamsBySlug[slug] = {
            name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            slug,
            program: 'Youth Club',
            coach,
            roster: [],
            profileUrl: `/teams/${slug}`
          };
        }
      });

      this.lastSync = new Date();
      console.log(`Notion sync completed: ${players.length} players, ${Object.keys(this.teamsBySlug).length} teams`);
      
      return {
        players,
        teams: Object.values(this.teamsBySlug)
      };
    } catch (error) {
      console.error('Error syncing from Notion:', error);
      throw error;
    }
  }

  getPlayer(id: string): NotionPlayer | undefined {
    return this.playersById[id];
  }

  getTeam(slug: string): NotionTeam | undefined {
    return this.teamsBySlug[slug];
  }

  getAllPlayers(): NotionPlayer[] {
    return Object.values(this.playersById);
  }

  getAllTeams(): NotionTeam[] {
    return Object.values(this.teamsBySlug);
  }

  searchPlayers(query: string): NotionPlayer[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPlayers().filter(player => 
      player.name.toLowerCase().includes(lowerQuery) ||
      player.team?.toLowerCase().includes(lowerQuery) ||
      player.currentProgram?.toLowerCase().includes(lowerQuery) ||
      player.sessionTags.some(tag => tag.toLowerCase().includes(lowerQuery))
    ).slice(0, 10);
  }

  searchTeams(query: string): NotionTeam[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTeams().filter(team =>
      team.name.toLowerCase().includes(lowerQuery) ||
      team.coach?.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }

  getLastSync(): Date | null {
    return this.lastSync;
  }
}

export const notionService = new NotionPlayerService();