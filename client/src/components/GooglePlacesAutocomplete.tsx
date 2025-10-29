import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState(value);

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
        // Load the Google Maps script with async
        await loadGoogleMapsScript(apiKey);

        if (!isMounted || !containerRef.current) return;

        // Check if the new API is available
        if (typeof (window as any).google?.maps?.importLibrary !== 'function') {
          console.warn('New Google Maps API not available, falling back to classic API');
          await initClassicAutocomplete();
          return;
        }

        // Try to use the new PlaceAutocompleteElement API
        try {
          const { PlaceAutocompleteElement } = await (window as any).google.maps.importLibrary('places');
          
          if (!isMounted || !containerRef.current) return;

          // Create the new autocomplete element
          const autocomplete = new PlaceAutocompleteElement({
            componentRestrictions: { country: ['us', 'ca'] },
            fields: ['formattedAddress', 'location', 'displayName'],
          });

          autocompleteElementRef.current = autocomplete;

          // Style the autocomplete element
          autocomplete.style.width = '100%';
          autocomplete.placeholder = placeholder;

          // Clear container and add the autocomplete element
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(autocomplete);

          // Listen for place selection
          autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
            const place = event.place;

            if (!place) {
              console.error('No place data received');
              return;
            }

            // Get place details
            await place.fetchFields({
              fields: ['formattedAddress', 'location', 'displayName'],
            });

            const address = place.formattedAddress || place.displayName || '';
            const location = place.location;

            if (!location) {
              console.error('No location data in place');
              return;
            }

            const lat = location.lat();
            const lng = location.lng();

            // Update state
            setManualInput(address);
            onChange(address);

            // Call callback with full place data
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
        } catch (newApiError) {
          console.warn('PlaceAutocompleteElement not available, using classic API:', newApiError);
          await initClassicAutocomplete();
        }
      } catch (err: any) {
        console.error('Error initializing Google Places:', err);
        if (isMounted) {
          // Check for specific API errors
          if (err.message?.includes('ApiNotActivatedMapError')) {
            setError('Google Maps API not enabled. Please enable Maps JavaScript API and Places API in Google Cloud Console.');
          } else {
            setError('Failed to load Google Places - using manual input');
          }
          setIsLoading(false);
        }
      }
    }

    // Fallback to classic Autocomplete API
    async function initClassicAutocomplete() {
      if (!isMounted || !containerRef.current) return;

      // Wait for places library
      if (!(window as any).google?.maps?.places?.Autocomplete) {
        throw new Error('Google Maps Places library not loaded');
      }

      // Create a hidden input for the classic API
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.value = value;
      input.className = className || 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
      input.setAttribute('data-testid', testId);

      const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: ['us', 'ca'] },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment'],
      });

      autocompleteElementRef.current = autocomplete;

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

        setManualInput(address);
        onChange(address);

        if (onPlaceSelect) {
          onPlaceSelect({
            address,
            latitude: lat,
            longitude: lng,
          });
        }
      });

      // Listen for manual input changes
      input.addEventListener('input', (e: any) => {
        const newValue = e.target.value;
        setManualInput(newValue);
        onChange(newValue);
      });

      // Clear container and add the input
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(input);

      if (isMounted) {
        setIsLoading(false);
        setError(null);
      }
    }

    initAutocomplete();

    return () => {
      isMounted = false;
      // Clean up
      if (autocompleteElementRef.current) {
        try {
          (window as any).google?.maps?.event?.clearInstanceListeners?.(autocompleteElementRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [placeholder, className, testId]); // Removed onChange and onPlaceSelect from deps to prevent re-initialization

  // Handle manual input changes when Google Maps fails
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setManualInput(newValue);
    onChange(newValue);
  };

  // Sync external value changes
  useEffect(() => {
    setManualInput(value);
  }, [value]);

  if (error) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={manualInput}
            onChange={handleManualInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-9 ${className || ''}`}
            data-testid={testId}
          />
        </div>
        <p className="text-xs text-orange-600" data-testid="text-maps-error">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Google Maps...</span>
        </div>
      )}
      
      <div ref={containerRef} className="w-full">
        {/* Google Places Autocomplete element will be inserted here */}
        {!isLoading && !error && (
          <Input
            value={manualInput}
            onChange={handleManualInputChange}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            data-testid={testId}
          />
        )}
      </div>
    </div>
  );
}

// Global promise to ensure we only load the script once
let scriptLoadPromise: Promise<void> | null = null;

// Helper function to load the Google Maps script dynamically with async
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Return existing promise if already loading
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  // Check if already loaded
  if ((window as any).google?.maps) {
    return Promise.resolve();
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      if ((window as any).google?.maps) {
        resolve();
        return;
      }
      // Add a listener for when it loads
      existingScript.addEventListener('load', () => {
        setTimeout(() => resolve(), 200);
      });
      existingScript.addEventListener('error', (e) => {
        console.error('Error loading existing Google Maps script:', e);
        reject(new Error('Failed to load existing Google Maps script'));
      });
      return;
    }

    // Create new script element with async loading and v=weekly
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Give it a moment to initialize
      setTimeout(() => resolve(), 200);
    };
    script.onerror = (e) => {
      console.error('Failed to load Google Maps script:', e);
      scriptLoadPromise = null; // Reset so it can be retried
      reject(new Error('Failed to load Google Maps script'));
    };
    
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}
