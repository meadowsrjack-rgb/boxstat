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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteElementRef = useRef<any>(null);
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
        // Load the Google Maps script
        if (!(window as any).google?.maps) {
          await loadGoogleMapsScript(apiKey);
        }

        if (!isMounted) return;

        // Import the Places library
        await (window as any).google.maps.importLibrary('places');

        if (!isMounted) return;

        // Create the autocomplete element
        const autocomplete = new (window as any).google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: ['us', 'ca'] },
        });

        autocompleteElementRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addEventListener('gmp-placeselect', async (event: any) => {
          const place = event.place;

          try {
            // Fetch place details with required fields
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'location'],
            });

            const address = place.formattedAddress || place.displayName || '';
            const lat = place.location?.lat();
            const lng = place.location?.lng();

            // Update the input value
            onChange(address);

            // Call the callback with full place data
            if (onPlaceSelect && lat !== undefined && lng !== undefined) {
              onPlaceSelect({
                address,
                latitude: lat,
                longitude: lng,
              });
            }
          } catch (err) {
            console.error('Error fetching place details:', err);
            setError('Failed to fetch place details');
          }
        });

        // Append to container
        if (containerRef.current && isMounted) {
          containerRef.current.appendChild(autocomplete);
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
      // Clean up the autocomplete element
      if (autocompleteElementRef.current && containerRef.current?.contains(autocompleteElementRef.current)) {
        containerRef.current.removeChild(autocompleteElementRef.current);
      }
    };
  }, [onChange, onPlaceSelect]);

  // Handle manual input changes (when user types without selecting from dropdown)
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
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={handleInputChange}
            placeholder="Loading Google Maps..."
            disabled={true}
            className={className}
          />
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className={isLoading ? 'hidden' : 'w-full'}
        style={{
          display: isLoading ? 'none' : 'block',
        }}
      />
      
      {/* Hidden input to maintain form compatibility when autocomplete is visible */}
      {!isLoading && (
        <input
          type="hidden"
          value={value}
          data-testid={testId}
        />
      )}
    </div>
  );
}

// Helper function to load the Google Maps script dynamically
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    
    document.head.appendChild(script);
  });
}
