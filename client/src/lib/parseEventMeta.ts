import { parseISO, format } from "date-fns";

export interface ParsedEvent {
  id: number;
  title: string;
  description: string;
  start: string; // ISO string
  end: string; // ISO string
  location: string;
  type: 'practice' | 'game' | 'tournament' | 'camp' | 'skills' | 'other';
  ageTags: string[];
  teamTags: string[];
  coaches: string[];
  originalEventType: string;
  googleEventId?: string;
}

export function parseEventMeta(event: any): ParsedEvent {
  const title = event.title || '';
  const description = event.description || '';
  
  // Parse event type from title and description
  const combinedText = `${title} ${description}`.toLowerCase();
  
  let type: ParsedEvent['type'] = 'other';
  if (combinedText.includes('practice') || combinedText.includes('training')) {
    type = 'practice';
  } else if (combinedText.includes('game') || combinedText.includes('match')) {
    type = 'game';
  } else if (combinedText.includes('tournament') || combinedText.includes('tourney')) {
    type = 'tournament';
  } else if (combinedText.includes('camp')) {
    type = 'camp';
  } else if (combinedText.includes('skills') || combinedText.includes('skill')) {
    type = 'skills';
  }

  // Parse age groups from title
  const ageTags: string[] = [];
  const ageMatches = title.match(/\b(\d+(?:st|nd|rd|th)?[-–]\d+(?:st|nd|rd|th)?|\d+(?:st|nd|rd|th)?|\d+U|U\d+|kindergarten|k)\b/gi);
  if (ageMatches) {
    ageMatches.forEach((match: string) => {
      const normalized = match.toLowerCase()
        .replace(/(\d+)(st|nd|rd|th)/g, '$1')
        .replace(/[-–]/g, '-');
      ageTags.push(normalized);
    });
  }

  // Parse team indicators from title
  const teamTags: string[] = [];
  const teamMatches = title.match(/\b(fnH|rookies|warriors|tigers|lions|eagles|hawks|storm|thunder|lightning|blazers|fire|heat|ice|frost|stars|comets|rockets|jets|bullets|arrows|swords|shields|knights|dragons|phoenixes|griffins|titans|giants|panthers|wolves|bears|bulls|rams|mustangs|stallions|colts|broncos|chargers|raiders|cowboys|chiefs|patriots|steelers|packers|vikings|saints|falcons|cardinals|seahawks|49ers|rams|dolphins|bills|jets|titans|jaguars|texans|colts|broncos|raiders|chargers|kings|lakers|warriors|clippers|suns|nuggets|timberwolves|thunder|trail blazers|jazz|spurs|mavericks|rockets|pelicans|grizzlies|heat|magic|hawks|hornets|pistons|pacers|cavaliers|bulls|bucks|raptors|celtics|nets|knicks|76ers|wizards)\b/gi);
  if (teamMatches) {
    teamTags.push(...teamMatches.map((match: string) => match.toLowerCase()));
  }

  // Parse coach names from title and description
  const coaches: string[] = [];
  const coachMatches = `${title} ${description}`.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  if (coachMatches) {
    // Filter for likely coach names (common first names)
    const commonNames = ['mary', 'john', 'sarah', 'mike', 'david', 'lisa', 'jennifer', 'robert', 'michael', 'william', 'james', 'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'frank', 'gregory', 'alexander', 'raymond', 'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose', 'henry', 'adam', 'douglas', 'nathan', 'peter', 'zachary', 'kyle', 'walter', 'harold', 'carl', 'arthur', 'gerald', 'roger', 'keith', 'jeremy', 'lawrence', 'sean', 'christian', 'ethan', 'austin', 'joe', 'albert', 'mason', 'roy', 'alan', 'wayne', 'eugene', 'louis', 'phillip', 'bobby', 'noah', 'ralph', 'mason', 'jordan', 'toffic', 'ahmad', 'jonathan', 'jack', 'hamed', 'jordan', 'sha'];
    
    coachMatches.forEach(match => {
      const firstName = match.split(' ')[0].toLowerCase();
      if (commonNames.includes(firstName) && !coaches.includes(match)) {
        coaches.push(match);
      }
    });
  }

  return {
    id: event.id,
    title: event.title || 'Untitled Event',
    description: event.description || '',
    start: event.startTime || event.startDate || new Date().toISOString(),
    end: event.endTime || event.endDate || new Date().toISOString(),
    location: event.location || 'Location TBD',
    type,
    ageTags,
    teamTags,
    coaches,
    originalEventType: event.eventType || 'other',
    googleEventId: event.googleEventId
  };
}

export function getEventTypeDotColor(type: ParsedEvent['type']): string {
  switch (type) {
    case 'practice':
      return 'bg-blue-500';
    case 'game':
      return 'bg-green-500';
    case 'tournament':
      return 'bg-purple-500';
    case 'camp':
      return 'bg-orange-500';
    case 'skills':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}