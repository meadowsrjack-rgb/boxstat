import { useEffect, useState } from 'react';

export function useGeo(highAccuracy = true) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getOnce(timeout = 10000) {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        // Add timeout wrapper in case browser doesn't respect timeout option
        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timed out'));
        }, timeout);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            resolve(position);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: timeout - 1000, // Browser timeout slightly less than our wrapper
            maximumAge: 30000, // Allow cached location up to 30 seconds old
          }
        );
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e: any) {
      console.log('Geolocation error:', e);
      let errorMessage = 'Location access denied or unavailable';
      
      if (e.code === 1) {
        errorMessage = 'Location access denied. Please enable location permissions.';
      } else if (e.code === 2) {
        errorMessage = 'Location unavailable. Please try again.';
      } else if (e.code === 3 || e.message?.includes('timeout')) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { coords, error, loading, getOnce };
}
