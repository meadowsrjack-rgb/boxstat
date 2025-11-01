import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, Building2 } from 'lucide-react';

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
  onLocationSelect: (location: { name: string; lat: number; lng: number }) => void;
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
  const debounceRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Fetch saved facilities
  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['/api/facilities'],
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
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
          `format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&email=support@uypbasketball.com`
        );
        
        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }
        
        const data = await response.json();
        setResults(data);
        setShowResults(data.length > 0);
      } catch (error) {
        console.error('Error searching location:', error);
        setResults([]);
        setShowResults(false);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [query]);

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

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
          data-testid="input-location-search"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
        )}
      </div>
      
      {showResults && (
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
