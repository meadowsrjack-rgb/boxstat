// Server-side geo utilities
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

export function withinWindow(startISO: string, endISO?: string, preMin = 15, postMin = 30): boolean {
  const now = Date.now();
  const start = new Date(startISO).getTime() - preMin * 60 * 1000;
  const end = (endISO ? new Date(endISO).getTime() : new Date(startISO).getTime()) + postMin * 60 * 1000;
  return now >= start && now <= end;
}

// Simple in-memory nonce store (in production, use Redis or database)
const usedNonces = new Map<string, number>();

// Clean up expired nonces every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of usedNonces.entries()) {
    if (now > expiry) {
      usedNonces.delete(nonce);
    }
  }
}, 10 * 60 * 1000);

export function validateAndConsumeNonce(nonce: string, expiration: string): boolean {
  const exp = parseInt(expiration);
  const now = Date.now();
  
  // Check if expired
  if (now > exp) {
    return false;
  }
  
  // Check if already used
  if (usedNonces.has(nonce)) {
    return false;
  }
  
  // Mark as used
  usedNonces.set(nonce, exp);
  return true;
}
