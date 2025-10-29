import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface PlaceResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function GooglePlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search for a location...',
  disabled = false,
  className,
  'data-testid': testId = 'input-location-autocomplete',
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function initAutocomplete() {
      try {
        // Load the Google Maps script using the Loader API
        await loadGoogleMapsScript(apiKey);

        if (!isMounted) return;

        // Wait a bit for the API to fully initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!isMounted || !inputRef.current) return;

        // Check if google.maps is available
        if (!(window as any).google?.maps?.places) {
          throw new Error('Google Maps Places library not loaded');
        }

        // Create autocomplete using the classic API (more reliable)
        const autocomplete = new (window as any).google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: { country: ['us', 'ca'] },
            fields: ['formatted_address', 'geometry', 'name'],
            types: ['geocode', 'establishment'],
          }
        );

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry || !place.geometry.location) {
            console.error('No geometry found for place');
            return;
          }

          const address = place.formatted_address || place.name || '';
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          // Update the input value
          onChange(address);

          // Call the callback with full place data
          if (onPlaceSelect) {
            onPlaceSelect({
              address,
              latitude: lat,
              longitude: lng,
            });
          }
        });

        if (isMounted) {
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Error initializing Google Places:', err);
        if (isMounted) {
          setError('Failed to load Google Places');
          setIsLoading(false);
        }
      }
    }

    initAutocomplete();

    return () => {
      isMounted = false;
      // Clean up the autocomplete
      if (autocompleteRef.current) {
        (window as any).google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
      }
    };
  }, [onChange, onPlaceSelect]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (error) {
    return (
      <div className="space-y-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          data-testid={testId}
        />
        <p className="text-xs text-orange-600" data-testid="text-maps-error">
          {error} - Using manual input instead
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Google Maps...</span>
        </div>
      )}
      
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={className}
        data-testid={testId}
      />
    </div>
  );
}

// Global promise to ensure we only load the script once
let scriptLoadPromise: Promise<void> | null = null;

// Helper function to load the Google Maps script dynamically
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Return existing promise if already loading
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  // Check if already loaded
  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      if ((window as any).google?.maps?.places) {
        resolve();
        return;
      }
      // Add a listener for when it loads
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load existing Google Maps script')));
      return;
    }

    // Create new script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=Function.prototype`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Give it a moment to initialize
      setTimeout(() => resolve(), 100);
    };
    script.onerror = () => {
      scriptLoadPromise = null; // Reset so it can be retried
      reject(new Error('Failed to load Google Maps script'));
    };
    
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}
