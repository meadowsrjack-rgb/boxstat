import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
          throw new Error('Google Maps importLibrary not available. Please ensure Places API (New) is enabled in Google Cloud Console.');
        }

        // Import the new Places library
        const { PlaceAutocompleteElement } = await (window as any).google.maps.importLibrary('places');
        
        if (!isMounted || !containerRef.current) return;

        // Create the new autocomplete element without 'fields' property
        const autocomplete = new PlaceAutocompleteElement({
          componentRestrictions: { country: ['us', 'ca'] },
        });

        autocompleteElementRef.current = autocomplete;

        // Style the autocomplete element
        autocomplete.style.width = '100%';
        autocomplete.placeholder = placeholder;
        
        if (disabled) {
          autocomplete.disabled = true;
        }

        // Clear container and add the autocomplete element
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(autocomplete);

        // Listen for place selection using the correct event name
        autocomplete.addEventListener('gmpx-placechange', async () => {
          const place = autocomplete.value;

          if (!place) {
            console.error('No place data received');
            return;
          }

          try {
            // Fetch place details with required fields
            await place.fetchFields({
              fields: ['formattedAddress', 'location', 'displayName'],
            });

            const address = place.formattedAddress || place.displayName || '';
            const location = place.location;

            if (!location) {
              console.error('No location data in place');
              return;
            }

            const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
            const lng = typeof location.lng === 'function' ? location.lng() : location.lng;

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
          } catch (fetchError) {
            console.error('Error fetching place details:', fetchError);
          }
        });

        if (isMounted) {
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error initializing Google Places:', err);
        if (isMounted) {
          // Provide helpful error messages
          if (err.message?.includes('ApiNotActivatedMapError') || err.message?.includes('Places API (New)')) {
            setError('Please enable "Places API (New)" in Google Cloud Console');
          } else if (err.message?.includes('importLibrary')) {
            setError('Places API (New) not available - please enable it in Google Cloud Console');
          } else {
            setError('Failed to load Google Places - using manual input');
          }
          setIsLoading(false);
        }
      }
    }

    initAutocomplete();

    return () => {
      isMounted = false;
      // Clean up
      if (autocompleteElementRef.current) {
        try {
          autocompleteElementRef.current.remove?.();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [placeholder, disabled]); // Removed onChange and onPlaceSelect from deps to prevent re-initialization

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
      <div className="space-y-3">
        <Alert variant="destructive" data-testid="alert-maps-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
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
        <p className="text-xs text-muted-foreground" data-testid="text-manual-input-help">
          Using manual input. Enter address and coordinates manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Google Maps...</span>
        </div>
      )}
      
      <div ref={containerRef} className="w-full">
        {/* PlaceAutocompleteElement will be inserted here */}
      </div>

      {!isLoading && !error && containerRef.current?.children.length === 0 && (
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
      )}
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
  if ((window as any).google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      if ((window as any).google?.maps?.importLibrary) {
        resolve();
        return;
      }
      // Add a listener for when it loads
      existingScript.addEventListener('load', () => {
        setTimeout(() => resolve(), 300);
      });
      existingScript.addEventListener('error', (e) => {
        console.error('Error loading existing Google Maps script:', e);
        scriptLoadPromise = null;
        reject(new Error('Failed to load existing Google Maps script'));
      });
      return;
    }

    // Create new script element with async loading and v=weekly
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Give it a moment to initialize
      setTimeout(() => resolve(), 300);
    };
    script.onerror = (e) => {
      console.error('Failed to load Google Maps script:', e);
      scriptLoadPromise = null; // Reset so it can be retried
      reject(new Error('Failed to load Google Maps script. Check API key and billing.'));
    };
    
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}
