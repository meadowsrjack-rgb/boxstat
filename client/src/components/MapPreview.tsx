import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapPreviewProps {
  lat: number;
  lng: number;
  locationName?: string;
  className?: string;
  height?: string;
  zoom?: number;
}

export function MapPreview({ 
  lat, 
  lng, 
  locationName = 'Event location',
  className = '',
  height = 'h-64',
  zoom = 15
}: MapPreviewProps) {
  if (!lat || !lng) {
    return (
      <div className={`${height} ${className} flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border`}>
        <p className="text-sm text-gray-500">Location not specified</p>
      </div>
    );
  }

  const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`${height} ${className} rounded-lg overflow-hidden border relative`} data-testid="map-preview">
        <MapContainer
          center={[lat, lng]}
          zoom={zoom}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          attributionControl={false}
          className="w-full h-full pointer-events-none"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]}>
            <Popup>{locationName}</Popup>
          </Marker>
        </MapContainer>
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-gray-600 shadow-sm">
          Open in Maps
        </div>
      </div>
    </a>
  );
}
