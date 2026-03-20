import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface EmergencyMapProps {
  category: string;
  extractedIntent: string;
}

declare global {
  interface Window {
    initGoogleMap: () => void;
    google: typeof google;
  }
}

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY || '';

let mapsScriptLoadState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
const mapsReadyCallbacks: Array<() => void> = [];

const loadMapsScript = (): Promise<void> => {
  if (mapsScriptLoadState === 'loaded') return Promise.resolve();
  if (mapsScriptLoadState === 'loading') {
    return new Promise((resolve) => mapsReadyCallbacks.push(resolve));
  }

  mapsScriptLoadState = 'loading';
  return new Promise((resolve, reject) => {
    mapsReadyCallbacks.push(resolve);
    window.initGoogleMap = () => {
      mapsScriptLoadState = 'loaded';
      mapsReadyCallbacks.forEach(cb => cb());
      mapsReadyCallbacks.length = 0;
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&callback=initGoogleMap&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      mapsScriptLoadState = 'error';
      reject(new Error('Google Maps failed to load'));
    };
    document.head.appendChild(script);
  });
};

export const EmergencyMap: React.FC<EmergencyMapProps> = ({ category, extractedIntent }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<'loading' | 'locating' | 'ready' | 'no-key' | 'error'>('loading');
  const [locationName, setLocationName] = useState('Your Location');

  useEffect(() => {
    if (!MAPS_API_KEY) {
      setStatus('no-key');
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      try {
        await loadMapsScript();
        if (!isMounted || !mapRef.current) return;

        setStatus('locating');

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted || !mapRef.current) return;
            const { latitude: lat, longitude: lng } = pos.coords;

            const map = new window.google.maps.Map(mapRef.current!, {
              center: { lat, lng },
              zoom: 13,
              mapTypeId: 'roadmap',
              styles: [
                { elementType: 'geometry', stylers: [{ color: '#0a0f1e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#03040b' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2035' }] },
                { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
                { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
                { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#00bcd4' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1627' }] },
                { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              ],
              disableDefaultUI: true,
              zoomControl: true,
            });

            // Color the marker by category
            const markerColor = category === 'MEDICAL' ? '#ff2a5f'
              : category === 'EMERGENCY' ? '#ff8c00'
              : '#00bcd4';

            new window.google.maps.Marker({
              position: { lat, lng },
              map,
              title: extractedIntent,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: markerColor,
                fillOpacity: 0.95,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              animation: window.google.maps.Animation.DROP,
            });

            mapInstanceRef.current = map;
            setStatus('ready');
          },
          () => {
            // Fallback to world centre if geolocation denied
            if (!isMounted || !mapRef.current) return;
            const map = new window.google.maps.Map(mapRef.current!, {
              center: { lat: 20, lng: 0 },
              zoom: 2,
              styles: [],
              disableDefaultUI: true,
            });
            mapInstanceRef.current = map;
            setLocationName('Location unavailable');
            setStatus('ready');
          },
          { timeout: 6000 }
        );
      } catch {
        if (isMounted) setStatus('error');
      }
    };

    initMap();
    return () => { isMounted = false; };
  }, [category, extractedIntent]);

  if (status === 'no-key') {
    return (
      <div className="emergency-map-placeholder">
        <MapPin size={24} className="icon-pink" aria-hidden="true" />
        <span>
          Add <code>VITE_MAPS_API_KEY</code> to <code>.env</code> to enable live emergency dispatch map
        </span>
      </div>
    );
  }

  return (
    <div className="emergency-map-wrapper" aria-label="Emergency dispatch location map">
      {status !== 'ready' && (
        <div className="emergency-map-overlay">
          <Navigation size={20} className="icon-cyan animate-spin" aria-hidden="true" />
          <span>{status === 'locating' ? 'Acquiring location...' : 'Loading Google Maps...'}</span>
        </div>
      )}
      <div ref={mapRef} className="emergency-map" role="img" aria-label={`Google Map showing ${locationName}`} />
      {status === 'ready' && (
        <div className="emergency-map-label">
          <MapPin size={12} aria-hidden="true" />
          {locationName} · Powered by Google Maps
        </div>
      )}
    </div>
  );
};
