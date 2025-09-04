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

export function withinWindow(startISO: string, endISO?: string, preMin = 30, postMin = 30): boolean {
  const now = Date.now();
  const start = new Date(startISO).getTime() - preMin * 60 * 1000;
  const end = (endISO ? new Date(endISO).getTime() : new Date(startISO).getTime()) + postMin * 60 * 1000;
  return now >= start && now <= end;
}
