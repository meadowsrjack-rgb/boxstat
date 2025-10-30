export type LatLng = { lat: number; lng: number };

// Haversine distance in meters
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function withinWindow(startISO: string, endISO?: string, preMin = 180, postMin = 15): boolean {
  const now = Date.now();
  const start = new Date(startISO).getTime() - preMin * 60 * 1000;
  const end = (endISO ? new Date(endISO).getTime() : new Date(startISO).getTime()) + postMin * 60 * 1000;
  return now >= start && now <= end;
}

// Check if current time is within check-in window
export function isWithinCheckInWindow(
  eventStartISO: string, 
  eventEndISO?: string, 
  checkInOpensHoursBefore: number = 3, 
  checkInClosesMinutesAfter: number = 15
): boolean {
  const now = Date.now();
  const eventStart = new Date(eventStartISO).getTime();
  
  const checkInOpens = eventStart - (checkInOpensHoursBefore * 60 * 60 * 1000);
  const checkInCloses = eventStart + (checkInClosesMinutesAfter * 60 * 1000);
  
  return now >= checkInOpens && now <= checkInCloses;
}

// Check if current time is within RSVP window
export function isWithinRSVPWindow(
  eventStartISO: string,
  rsvpOpensHoursBefore: number = 72,
  rsvpClosesHoursBefore: number = 24
): boolean {
  const now = Date.now();
  const eventStart = new Date(eventStartISO).getTime();
  
  const rsvpOpens = eventStart - (rsvpOpensHoursBefore * 60 * 60 * 1000);
  const rsvpCloses = eventStart - (rsvpClosesHoursBefore * 60 * 60 * 1000);
  
  return now >= rsvpOpens && now <= rsvpCloses;
}
