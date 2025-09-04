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

// Geocoding function to convert address to coordinates
async function geocodeLocation(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address === 'TBD') {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_CALENDAR_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`Geocoded "${address}" to coordinates: ${location.lat}, ${location.lng}`);
      return {
        lat: location.lat,
        lng: location.lng
      };
    } else {
      console.log(`Geocoding failed for "${address}": ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding location "${address}":`, error);
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
    const teamId = extractTeamId(googleEvent.summary, googleEvent.description);

    // Geocode the location to get coordinates for check-in functionality
    const location = googleEvent.location || 'TBD';
    const coordinates = await geocodeLocation(location);

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
      lastSyncedAt: new Date(),
      // Store raw Google event data for client-side parsing
      rawGoogleEvent: JSON.stringify(googleEvent)
    };

    // Check if event already exists
    const existingEvent = await storage.getEventByGoogleId(googleEvent.id);
    
    if (existingEvent) {
      // Update existing event if it has changed
      const hasChanged = 
        existingEvent.title !== eventData.title ||
        existingEvent.startTime.getTime() !== eventData.startTime.getTime() ||
        existingEvent.location !== eventData.location ||
        existingEvent.latitude !== eventData.latitude ||
        existingEvent.longitude !== eventData.longitude;

      if (hasChanged) {
        await storage.updateEvent(existingEvent.id, eventData);
        console.log(`Updated event: ${eventData.title}${coordinates ? ` (geocoded to ${coordinates.lat}, ${coordinates.lng})` : ''}`);
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
      console.log(`Created new event: ${eventData.title}`);
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

// Scheduled sync function that can be called periodically
export async function scheduledCalendarSync() {
  try {
    console.log('Running scheduled Google Calendar sync...');
    await syncGoogleCalendarEvents();
  } catch (error) {
    console.error('Scheduled calendar sync failed:', error);
  }
}