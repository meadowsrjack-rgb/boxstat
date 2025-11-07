import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Building2, Edit3 } from 'lucide-react';

interface LocationResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface Facility {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

interface LocationSearchProps {
  value?: string;
  onLocationSelect: (location: { name: string; lat: number | null; lng: number | null }) => void;
  placeholder?: string;
  className?: string;
}

export function LocationSearch({ 
  value = '', 
  onLocationSelect, 
  placeholder = "Search location",
  className = "" 
}: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Fetch saved facilities
  const { data: facilities = [], isLoading: facilitiesLoading } = useQuery<Facility[]>({
    queryKey: ['/api/facilities'],
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Show dropdown when facilities load and input is focused
  useEffect(() => {
    if (isFocused && !facilitiesLoading && facilities.length > 0 && query.length < 3) {
      setShowResults(true);
    }
  }, [isFocused, facilitiesLoading, facilities.length, query.length]);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      // Keep showResults true if there are facilities to show
      if (facilities.length === 0) {
        setShowResults(false);
      }
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Nominatim usage policy: add email parameter for identification
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&email=support@boxstat.com`
        );
        
        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }
        
        const data = await response.json();
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching location:', error);
        setResults([]);
        setShowResults(facilities.length > 0); // Keep open if facilities exist
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [query, facilities.length]);

  const handleSelect = (result: LocationResult) => {
    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);
    onLocationSelect({
      name: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
  };
  
  const handleFacilitySelect = (facility: Facility) => {
    setQuery(facility.address);
    setShowResults(false);
    setResults([]);
    onLocationSelect({
      name: facility.address,
      lat: facility.latitude,
      lng: facility.longitude,
    });
  };
  
  const handleManualSubmit = () => {
    if (manualAddress.trim()) {
      setQuery(manualAddress);
      onLocationSelect({
        name: manualAddress,
        lat: null,
        lng: null,
      });
      setManualMode(false);
      setManualAddress('');
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {!manualMode ? (
        <>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                if (facilities.length > 0 || results.length > 0) {
                  setShowResults(true);
                }
              }}
              placeholder={placeholder}
              className="pl-10 pr-10"
              data-testid="input-location-search"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
            )}
            {!isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setManualMode(true)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                data-testid="button-manual-entry"
              >
                <Edit3 className="h-3.5 w-3.5 text-gray-500" />
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="Enter address manually..."
              className="pl-10"
              data-testid="input-manual-address"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleManualSubmit();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleManualSubmit}
              className="flex-1"
              data-testid="button-submit-manual"
            >
              Use This Address
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setManualMode(false);
                setManualAddress('');
              }}
              data-testid="button-cancel-manual"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {!manualMode && showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {/* Saved Facilities Section */}
          {facilities.length > 0 && query.length < 3 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Saved Facilities
                </p>
              </div>
              <ul>
                {facilities.filter(f => f.isActive).map((facility) => (
                  <li
                    key={facility.id}
                    className="px-4 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-b-0"
                    onClick={() => handleFacilitySelect(facility)}
                    data-testid={`facility-option-${facility.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{facility.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{facility.address}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Search Results Section */}
          {results.length > 0 && (
            <div>
              {facilities.length > 0 && query.length >= 3 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Search Results
                  </p>
                </div>
              )}
              <ul>
                {results.map((result) => (
                  <li
                    key={result.place_id}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b last:border-b-0"
                    onClick={() => handleSelect(result)}
                    data-testid={`option-location-${result.place_id}`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{result.display_name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* No Results Message */}
          {!isLoading && results.length === 0 && query.length >= 3 && (
            <div className="p-4">
              <p className="text-sm text-gray-500">No locations found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
