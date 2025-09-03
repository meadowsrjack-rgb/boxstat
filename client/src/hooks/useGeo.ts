import { useEffect, useState } from 'react';

export function useGeo(highAccuracy = true) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getOnce(timeout = 8000) {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: 0,
        });
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e: any) {
      setError(e?.message || 'Location unavailable');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { coords, error, loading, getOnce };
}
