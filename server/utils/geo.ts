// Geo utility functions for server-side validation

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function distanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if current time is within the event check-in window
 * Window: 15 minutes before start to 30 minutes after start
 */
export function withinWindow(startTime: string, endTime?: string): boolean {
  const now = new Date();
  const start = new Date(startTime);
  const windowStart = new Date(start.getTime() - 15 * 60 * 1000); // 15 min before
  const windowEnd = new Date(start.getTime() + 30 * 60 * 1000); // 30 min after start

  return now >= windowStart && now <= windowEnd;
}

/**
 * Simple in-memory nonce validation for QR codes
 * In production, this should use Redis or database storage
 */
const usedNonces = new Set<string>();

export function validateAndConsumeNonce(nonce: string, expiration: number): boolean {
  // Check if nonce has already been used
  if (usedNonces.has(nonce)) {
    return false;
  }

  // Check if nonce has expired
  if (Date.now() > expiration) {
    return false;
  }

  // Mark nonce as used
  usedNonces.add(nonce);
  
  // Clean up old nonces (simple cleanup - in production use a proper cleanup strategy)
  if (usedNonces.size > 10000) {
    usedNonces.clear();
  }

  return true;
}