import { Client } from '@notionhq/client';
import { z } from 'zod';

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Field mapping for Notion properties - Updated for account claiming system
export const NOTION_FIELD_MAP = {
  playersDbId: process.env.NOTION_DB_ID!,
  teamsDbId: process.env.NOTION_DB_ID!, // Using same DB for now, can be split later
  person: {
    fullName: 'Name',            // Title - Name of the person (parent or player)
    email: 'Email',              // Email - The person's account email
    personType: 'Type',          // Select: Parent/Player/Coach
    registrationStatus: 'Registration Status', // Select: Pending/Active/Payment Required
    dob: 'DOB',                  // Date or text - Date of birth
    age: 'Age',                  // Number - Age (calculated or manual)
    jerseyNumber: 'Jersey',      // Number or text
    photoUrl: 'Photo',           // Files/URL (optional)
    teamRelation: 'Team',        // Relation → Teams DB
    guardianEmail: 'Guardian Email', // Email text - For legacy compatibility
    guardianPhone: 'Guardian Phone', // Phone text
    phoneNumber: 'Phone',        // Phone - The person's phone number
    status: 'Status'             // Select: Active/Inactive
  },
  team: {
    name: 'Name',                // Title
    division: 'Division',        // Select/Text
    coachNames: 'Coach',         // People/Text (stringify)
  }
} as const;

// Helper to extract text from Notion properties
function propText(p: any): string|undefined {
  if (!p) return undefined;
  if (p.type === 'title') return p.title?.[0]?.plain_text;
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text;
  if (p.type === 'select') return p.select?.name;
  if (p.type === 'number') return String(p.number ?? '');
  if (p.type === 'date') return p.date?.start ?? undefined;
  if (p.type === 'url') return p.url ?? undefined;
  if (p.type === 'files') return p.files?.[0]?.file?.url ?? p.files?.[0]?.external?.url;
  if (p.type === 'email') return p.email ?? undefined;
  if (p.type === 'phone_number') return p.phone_number ?? undefined;
  if (p.type === 'people') return p.people?.map((person: any) => person.name).join(', ');
  if (p.type === 'relation' && p.relation?.length > 0) {
    // Return the first relation ID for now
    return p.relation[0]?.id;
  }
  return undefined;
}

// Person data structure from Notion (can be parent, player, or coach)
export interface NotionPersonData {
  notionId: string;
  fullName: string;
  email?: string;
  personType: 'parent' | 'player' | 'coach';
  registrationStatus: 'pending' | 'active' | 'payment_required';
  dob?: string;
  age?: number;
  jerseyNumber?: string;
  photoUrl?: string;
  teamRelationId?: string;
  phoneNumber?: string;
  // Legacy fields for backward compatibility
  guardianEmail?: string;
  guardianPhone?: string;
  status: 'active' | 'inactive';
}

// Team data structure from Notion
export interface NotionTeamData {
  notionId: string;
  name: string;
  division?: string;
  coachNames?: string;
}

// Fetch all people (parents, players, coaches) from Notion
export async function fetchNotionPeople(): Promise<NotionPersonData[]> {
  try {
    const people: NotionPersonData[] = [];
    let cursor: string | undefined;

    do {
      const response = await notion.databases.query({
        database_id: NOTION_FIELD_MAP.playersDbId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const page of response.results as any[]) {
        const props = page.properties;
        
        const fullName = propText(props[NOTION_FIELD_MAP.person.fullName]);
        if (!fullName) continue; // Skip entries without names

        // Parse person type - default to 'player' for backward compatibility
        const personTypeRaw = propText(props[NOTION_FIELD_MAP.person.personType])?.toLowerCase();
        let personType: 'parent' | 'player' | 'coach' = 'player';
        if (personTypeRaw === 'parent' || personTypeRaw === 'coach') {
          personType = personTypeRaw;
        }

        // Parse registration status - default to 'pending'
        const regStatusRaw = propText(props[NOTION_FIELD_MAP.person.registrationStatus])?.toLowerCase();
        let registrationStatus: 'pending' | 'active' | 'payment_required' = 'pending';
        if (regStatusRaw === 'active' || regStatusRaw === 'payment_required') {
          registrationStatus = regStatusRaw;
        }

        // Parse age as number
        const ageRaw = propText(props[NOTION_FIELD_MAP.person.age]);
        const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

        const person: NotionPersonData = {
          notionId: page.id,
          fullName,
          email: propText(props[NOTION_FIELD_MAP.person.email]),
          personType,
          registrationStatus,
          dob: propText(props[NOTION_FIELD_MAP.person.dob]),
          age: age && !isNaN(age) ? age : undefined,
          jerseyNumber: propText(props[NOTION_FIELD_MAP.person.jerseyNumber]),
          photoUrl: propText(props[NOTION_FIELD_MAP.person.photoUrl]),
          teamRelationId: propText(props[NOTION_FIELD_MAP.person.teamRelation]),
          phoneNumber: propText(props[NOTION_FIELD_MAP.person.phoneNumber]),
          // Legacy fields for backward compatibility
          guardianEmail: propText(props[NOTION_FIELD_MAP.person.guardianEmail]),
          guardianPhone: propText(props[NOTION_FIELD_MAP.person.guardianPhone]),
          status: propText(props[NOTION_FIELD_MAP.person.status])?.toLowerCase() === 'active' ? 'active' : 'inactive'
        };

        people.push(person);
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

    console.log(`Fetched ${people.length} people from Notion`);
    return people;
  } catch (error) {
    console.error('Error fetching Notion people:', error);
    throw new Error('Failed to fetch people from Notion');
  }
}

// Legacy function for backward compatibility
export async function fetchNotionPlayers(): Promise<NotionPersonData[]> {
  const people = await fetchNotionPeople();
  // Return only players for backward compatibility
  return people.filter(p => p.personType === 'player');
}

// Fetch all teams from Notion (or from a separate teams database if configured)
export async function fetchNotionTeams(): Promise<NotionTeamData[]> {
  try {
    const teams: NotionTeamData[] = [];
    
    // For now, extract unique teams from players data since they're related
    const players = await fetchNotionPlayers();
    const teamIds = Array.from(new Set(players.map(p => p.teamRelationId).filter(Boolean) as string[]));
    
    for (const teamId of teamIds) {
      try {
        const page = await notion.pages.retrieve({ page_id: teamId as string });
        const props = (page as any).properties;
        
        const name = propText(props[NOTION_FIELD_MAP.team.name]);
        if (!name) continue;

        const team: NotionTeamData = {
          notionId: teamId as string,
          name,
          division: propText(props[NOTION_FIELD_MAP.team.division]),
          coachNames: propText(props[NOTION_FIELD_MAP.team.coachNames]),
        };

        teams.push(team);
      } catch (error) {
        console.warn(`Could not fetch team ${teamId}:`, error);
      }
    }

    console.log(`Fetched ${teams.length} teams from Notion`);
    return teams;
  } catch (error) {
    console.error('Error fetching Notion teams:', error);
    throw new Error('Failed to fetch teams from Notion');
  }
}

// Sync helper to get both players and teams
export async function fetchNotionData() {
  const [players, teams] = await Promise.all([
    fetchNotionPlayers(),
    fetchNotionTeams()
  ]);
  
  return { players, teams };
}

// Search functionality for claim system
export async function searchNotionPlayers(query: string, limit = 50): Promise<NotionPersonData[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const players = await fetchNotionPlayers();
    const searchTerm = query.toLowerCase();
    
    return players
      .filter(player => 
        player.status === 'active' && 
        player.fullName.toLowerCase().includes(searchTerm)
      )
      .slice(0, limit);
  } catch (error) {
    console.error('Error searching Notion players:', error);
    throw new Error('Failed to search players');
  }
}

// Rate limiting for API calls
const rateLimiter = {
  lastCall: 0,
  minInterval: 334, // ~3 requests per second (Notion limit is 3/sec)
  
  async wait() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastCall = Date.now();
  }
};

// Enhanced fetch with rate limiting
export async function fetchNotionPlayersWithRateLimit(): Promise<NotionPersonData[]> {
  await rateLimiter.wait();
  return fetchNotionPlayers();
}

export async function fetchNotionTeamsWithRateLimit(): Promise<NotionTeamData[]> {
  await rateLimiter.wait();
  return fetchNotionTeams();
}