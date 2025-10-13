import { google } from 'googleapis';
import { storage } from './storage';

const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

if (!GOOGLE_CALENDAR_API_KEY || !GOOGLE_CALENDAR_ID) {
  console.warn('Google Calendar credentials not found. Calendar sync will be disabled.');
}

// Initialize Google Calendar API
const calendar = google.calendar({
  version: 'v3',
  auth: GOOGLE_CALENDAR_API_KEY
});

// Geocoding availability flag
let geocodingAvailable = true;
let geocodingCheckDone = false;

// Geocoding function to convert address to coordinates
export async function geocodeLocation(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address === 'TBD') {
    return null;
  }

  // Skip geocoding if we've already determined it's not available
  if (!geocodingAvailable) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_CALENDAR_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else if (data.status === 'REQUEST_DENIED') {
      // Disable geocoding if API access is denied
      if (!geocodingCheckDone) {
        console.warn('Google Maps Geocoding API is not enabled. Event location coordinates will not be available. To enable geocoding, add a Google Maps API key with Geocoding API enabled.');
        geocodingCheckDone = true;
      }
      geocodingAvailable = false;
      return null;
    } else {
      return null;
    }
  } catch (error) {
    if (!geocodingCheckDone) {
      console.error('Error accessing geocoding service:', error);
      geocodingCheckDone = true;
    }
    geocodingAvailable = false;
    return null;
  }
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  created: string;
  updated: string;
}

export async function syncGoogleCalendarEvents() {
  if (!GOOGLE_CALENDAR_API_KEY || !GOOGLE_CALENDAR_ID) {
    console.log('Google Calendar sync skipped - missing credentials');
    return;
  }

  try {
    console.log('Starting Google Calendar sync...');
    
    // Get events from Google Calendar (next 3 months)
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const response = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: threeMonthsFromNow.toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleEvents = response.data.items || [];
    console.log(`Found ${googleEvents.length} events in Google Calendar`);

    // Process each event
    for (const googleEvent of googleEvents) {
      await processGoogleCalendarEvent(googleEvent);
    }

    console.log('Google Calendar sync completed successfully');
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    throw error;
  }
}

async function processGoogleCalendarEvent(googleEvent: any) {
  try {
    // Skip events without proper time data
    if (!googleEvent.start || (!googleEvent.start.dateTime && !googleEvent.start.date)) {
      console.log(`Skipping event without start time: ${googleEvent.summary}`);
      return;
    }

    // Convert Google Calendar event to our event format
    const startTime = new Date(googleEvent.start.dateTime || googleEvent.start.date);
    const endTime = new Date(googleEvent.end?.dateTime || googleEvent.end?.date || startTime);
    
    // Determine event type based on summary/description - keeping legacy function for now
    const eventType = determineEventType(googleEvent.summary, googleEvent.description);
    
    // Extract team information if available
    let teamId = extractTeamId(googleEvent.summary, googleEvent.description);
    
    // Verify team exists in database, if not set to null
    if (teamId) {
      const team = await storage.getTeam(teamId);
      if (!team) {
        console.log(`Team ID ${teamId} not found for event "${googleEvent.summary}", setting to null`);
        teamId = null;
      }
    }

    // Geocode the location to get coordinates for check-in functionality
    const location = googleEvent.location || 'TBD';
    const coordinates = await geocodeLocation(location);
    
    // Extract tags from event description for visibility filtering
    const tags = extractTags(googleEvent.description || '');

    const eventData = {
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || '',
      eventType,
      startTime,
      endTime,
      location,
      latitude: coordinates?.lat || null,
      longitude: coordinates?.lng || null,
      teamId,
      playerId: null,
      opponentTeam: extractOpponentTeam(googleEvent.summary, googleEvent.description),
      isRecurring: false,
      googleEventId: googleEvent.id,
      tags: tags.length > 0 ? tags : null,
      lastSyncedAt: new Date(),
      // Store raw Google event data for client-side parsing
      rawGoogleEvent: JSON.stringify(googleEvent)
    };

    // Check if event already exists
    const existingEvent = await storage.getEventByGoogleId(googleEvent.id);
    
    if (existingEvent) {
      // Update existing event if it has changed
      const tagsChanged = JSON.stringify(existingEvent.tags?.sort()) !== JSON.stringify(eventData.tags?.sort());
      const hasChanged = 
        existingEvent.title !== eventData.title ||
        existingEvent.startTime.getTime() !== eventData.startTime.getTime() ||
        existingEvent.location !== eventData.location ||
        existingEvent.latitude !== eventData.latitude ||
        existingEvent.longitude !== eventData.longitude ||
        tagsChanged;

      if (hasChanged) {
        await storage.updateEvent(existingEvent.id, eventData);
        const tagInfo = tags.length > 0 ? ` [Tags: ${tags.join(', ')}]` : '';
        console.log(`Updated event: ${eventData.title}${coordinates ? ` (geocoded to ${coordinates.lat}, ${coordinates.lng})` : ''}${tagInfo}`);
      } else if (!existingEvent.latitude && !existingEvent.longitude && coordinates) {
        // Update events that don't have coordinates yet
        await storage.updateEvent(existingEvent.id, { 
          ...eventData, 
          latitude: coordinates.lat, 
          longitude: coordinates.lng 
        });
        console.log(`Added coordinates to existing event: ${eventData.title} (${coordinates.lat}, ${coordinates.lng})`);
      }
    } else {
      // Create new event
      await storage.createEvent(eventData);
      const tagInfo = tags.length > 0 ? ` [Tags: ${tags.join(', ')}]` : '';
      console.log(`Created new event: ${eventData.title}${tagInfo}`);
    }

  } catch (error) {
    console.error(`Error processing Google Calendar event ${googleEvent.id}:`, error);
  }
}

function determineEventType(summary: string, description: string): 'practice' | 'game' | 'tournament' | 'camp' | 'skills' {
  const text = `${summary} ${description}`.toLowerCase();
  
  if (text.includes('practice') || text.includes('training')) {
    return 'practice';
  } else if (text.includes('game') || text.includes('match') || text.includes('vs') || text.includes('against')) {
    return 'game';
  } else if (text.includes('tournament') || text.includes('championship')) {
    return 'tournament';
  } else if (text.includes('camp') || text.includes('clinic')) {
    return 'camp';
  } else if (text.includes('skills') || text.includes('drill')) {
    return 'skills';
  }
  
  return 'practice'; // Default to practice
}

function extractTeamId(summary: string, description: string): number | null {
  const text = `${summary} ${description}`.toLowerCase();
  
  // Look for specific age group + color patterns (new format)
  if (text.includes('9u black') || text.includes('9u-black') || text.includes('9ublack')) {
    return 6; // 9U Black
  }
  
  // Look for age group patterns (legacy format)
  if (text.includes('u10') || text.includes('under 10') || text.includes('10u')) {
    return 1; // U10 Thunder
  } else if (text.includes('u12') || text.includes('under 12') || text.includes('12u')) {
    return 2; // U12 Lightning  
  } else if (text.includes('u14') || text.includes('under 14') || text.includes('14u')) {
    return 3; // U14 Storm
  } else if (text.includes('u16') || text.includes('under 16') || text.includes('16u')) {
    return 4; // U16 Hurricanes
  } else if (text.includes('u18') || text.includes('under 18') || text.includes('18u')) {
    return 5; // U18 Tornadoes
  }
  
  // Look for specific team names (legacy format)
  if (text.includes('thunder')) {
    return 1;
  } else if (text.includes('lightning')) {
    return 2;
  } else if (text.includes('storm')) {
    return 3;
  } else if (text.includes('hurricanes')) {
    return 4;
  } else if (text.includes('tornadoes')) {
    return 5;
  } else if (text.includes('black') && (text.includes('9u') || text.includes('9 u'))) {
    return 6; // 9U Black (alternative pattern)
  }
  
  return null; // League-wide event
}

function extractOpponentTeam(summary: string, description: string): string | null {
  const text = `${summary} ${description}`;
  
  // Look for vs/against patterns
  const vsMatch = text.match(/(?:vs\.?|against|v\.?)\s+([^,\n\r]+)/i);
  if (vsMatch) {
    return vsMatch[1].trim();
  }
  
  return null;
}

// Tag definitions for event visibility filtering
const VALID_TAGS = {
  // Org-Level tags
  ORG: ['UYP', 'Leadership', 'Coaches', 'Parents', 'Players'],
  
  // Program-Level tags
  PROGRAM: [
    'Skills-Academy', 'SA-Special-Needs', 'SA-Rookies', 'SA-Beginner', 
    'SA-Intermediate', 'SA-Advanced', 'SA-Elite', 
    'High-School', 'Youth-Club', 'FNHTL'
  ],
  
  // Team-Level tags
  TEAM: [
    // FNHTL Teams
    'Wizards', 'Wolverines', 'Wildcats', 'Anteaters', 'Dolphins', 'Storm', 
    'Vikings', 'Silverswords', 'Bruins', 'Titans', 'Trojans', 'Eagles', 'Dragons',
    // Youth Club Teams
    'Black-Elite', '10u-Black', '12u-Red', '12u-Black', '13u-White', '13u-Black', 
    '14u-Black', '14u-Gray', '14u-Red', 'Youth-Girls-Red', 'Youth-Girls-Black',
    // High School Teams
    'High-School-Elite', 'High-School-Black', 'High-School-White', 'High-School-Red'
  ]
};

// Flatten all valid tags for easy lookup
const ALL_VALID_TAGS = [
  ...VALID_TAGS.ORG,
  ...VALID_TAGS.PROGRAM,
  ...VALID_TAGS.TEAM
];

function extractTags(description: string): string[] {
  if (!description) return [];
  
  const tags: string[] = [];
  const lines = description.split('\n');
  
  // Look for tags in the description (comma or newline separated)
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this line contains any valid tags
    for (const validTag of ALL_VALID_TAGS) {
      // Case-insensitive matching with word boundaries or commas
      const regex = new RegExp(`\\b${validTag}\\b`, 'i');
      if (regex.test(trimmedLine)) {
        // Store tags in their canonical form (as defined in VALID_TAGS)
        if (!tags.includes(validTag)) {
          tags.push(validTag);
        }
      }
    }
  }
  
  return tags;
}

// Export tag definitions for use in other modules
export { VALID_TAGS, ALL_VALID_TAGS };

// Scheduled sync function that can be called periodically
export async function scheduledCalendarSync() {
  try {
    console.log('Running scheduled Google Calendar sync...');
    await syncGoogleCalendarEvents();
  } catch (error) {
    console.error('Scheduled calendar sync failed:', error);
  }
}

// Event filtering logic based on profile and tags
export interface EventFilterContext {
  profileType: 'parent' | 'player' | 'coach';
  profileId: string;
  accountId: string;
  teamId?: string | null;
  teamName?: string | null;
  linkedPlayerProfiles?: Array<{ id: string; teamId?: string; teamName?: string }>;
  coachTeamIds?: number[];
  coachTeamNames?: string[];
}

export function shouldShowEventToProfile(event: any, context: EventFilterContext): boolean {
  // If event has no tags, hide it (strict filtering - only show tagged events)
  if (!event.tags || event.tags.length === 0) {
    return false;
  }
  
  const { profileType, teamName, linkedPlayerProfiles = [], coachTeamIds = [] } = context;
  
  // Check each tag
  for (const tag of event.tags) {
    // Org-Level tags
    if (tag === 'UYP') return true; // Everyone sees UYP events
    if (tag === 'Leadership' && profileType === 'coach') return true;
    if (tag === 'Coaches' && profileType === 'coach') return true;
    if (tag === 'Parents' && profileType === 'parent') return true;
    if (tag === 'Players' && profileType === 'player') return true;
    
    // Program-Level tags
    if (VALID_TAGS.PROGRAM.includes(tag)) {
      // Map program tags to teams
      const programTeamMapping: Record<string, string[]> = {
        'Skills-Academy': ['SA-Special-Needs', 'SA-Rookies', 'SA-Beginner', 'SA-Intermediate', 'SA-Advanced', 'SA-Elite'],
        'FNHTL': ['Wizards', 'Wolverines', 'Wildcats', 'Anteaters', 'Dolphins', 'Storm', 'Vikings', 'Silverswords', 'Bruins', 'Titans', 'Trojans', 'Eagles', 'Dragons'],
        'Youth-Club': ['Black-Elite', '10u-Black', '12u-Red', '12u-Black', '13u-White', '13u-Black', '14u-Black', '14u-Gray', '14u-Red', 'Youth-Girls-Red', 'Youth-Girls-Black'],
        'High-School': ['High-School-Elite', 'High-School-Black', 'High-School-White', 'High-School-Red']
      };
      
      // Handle specific Skills Academy sub-sessions
      if (tag.startsWith('SA-')) {
        if (profileType === 'player' && teamName && teamName.includes(tag.replace('SA-', ''))) return true;
        if (profileType === 'parent' && linkedPlayerProfiles.some(p => p.teamName?.includes(tag.replace('SA-', '')))) return true;
        if (profileType === 'coach') return true; // Coaches see all SA events
      } else if (programTeamMapping[tag]) {
        // Check if profile's team is in this program
        if (profileType === 'player' && teamName) {
          const matchesProgram = programTeamMapping[tag].some(team => 
            teamName.toLowerCase().includes(team.toLowerCase()) || team.toLowerCase().includes(teamName.toLowerCase())
          );
          if (matchesProgram) return true;
        }
        // Check if any linked player profiles are in this program
        if (profileType === 'parent') {
          const hasPlayerInProgram = linkedPlayerProfiles.some(p => 
            p.teamName && programTeamMapping[tag].some(team => 
              p.teamName!.toLowerCase().includes(team.toLowerCase()) || team.toLowerCase().includes(p.teamName!.toLowerCase())
            )
          );
          if (hasPlayerInProgram) return true;
        }
        // Coaches see all program events
        if (profileType === 'coach') return true;
      }
    }
    
    // Team-Level tags
    if (VALID_TAGS.TEAM.includes(tag)) {
      // Normalize tag for comparison (handle hyphens and spaces)
      const normalizedTag = tag.toLowerCase().replace(/[-\s]/g, '');
      const normalizedTeamName = teamName?.toLowerCase().replace(/[-\s]/g, '');
      
      // Player profiles: show if their team matches
      if (profileType === 'player' && normalizedTeamName) {
        // Match if normalized tag is in team name OR team name is in tag
        if (normalizedTeamName.includes(normalizedTag) || normalizedTag.includes(normalizedTeamName)) {
          return true;
        }
      }
      
      // Parent profiles: show if any linked player is on this team
      if (profileType === 'parent') {
        const hasPlayerOnTeam = linkedPlayerProfiles.some(p => {
          if (!p.teamName) return false;
          const pTeamName = p.teamName.toLowerCase().replace(/[-\s]/g, '');
          // Match if normalized tag is in team name OR team name is in tag
          return pTeamName.includes(normalizedTag) || normalizedTag.includes(pTeamName);
        });
        if (hasPlayerOnTeam) return true;
      }
      
      // Coach profiles: show if assigned to this team
      if (profileType === 'coach' && context.coachTeamNames && context.coachTeamNames.length > 0) {
        const isAssignedToTeam = context.coachTeamNames.some(coachTeam => {
          const normalizedCoachTeam = coachTeam.toLowerCase().replace(/[-\s]/g, '');
          // Match if normalized tag is in team name OR team name is in tag
          return normalizedCoachTeam.includes(normalizedTag) || normalizedTag.includes(normalizedCoachTeam);
        });
        if (isAssignedToTeam) return true;
      }
    }
  }
  
  return false; // No matching tags found
}