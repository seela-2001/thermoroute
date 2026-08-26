import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AnalyzedRoute } from '@/services/routeApi';
import { TimeRiskBar, type HourlyForecast } from './TimeRiskBar';
import { routeColors } from './routeColors';

interface RouteMapProps {
  routes: AnalyzedRoute[];
  selectedRouteId: string | null;
  onRouteClick: (routeId: string) => void;
  origin?: { lat: number; lon: number };
  destination?: { lat: number; lon: number };
  hourlyForecast?: HourlyForecast[];
}

function MapBoundsController({ routes, selectedRouteId }: { routes: AnalyzedRoute[]; selectedRouteId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (routes.length === 0) return;

    const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];
    if (!selectedRoute || !selectedRoute.geometry?.coordinates) return;

    const coords = selectedRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    if (coords.length === 0) return;

    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, routes, selectedRouteId]);

  return null;
}

function RoutePolylines({ routes, selectedRouteId, onRouteClick }: {
  routes: AnalyzedRoute[];
  selectedRouteId: string | null;
  onRouteClick: (routeId: string) => void;
}) {
  return (
    <>
      {routes.map((route, index) => {
        const isSelected = route.id === selectedRouteId;
        const color = routeColors[index % routeColors.length];
        const geometry = route.geometry;

        if (!geometry?.coordinates || geometry.coordinates.length < 2) {
          return null;
        }

        const coords = geometry.coordinates.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);

        return (
          <Polyline
            key={route.id}
            positions={coords}
            pathOptions={{
              color: color.color,
              weight: isSelected ? 6 : 4,
              opacity: isSelected ? 1 : 0.6,
            }}
            eventHandlers={{
              click: () => onRouteClick(route.id),
            }}
          />
        );
      })}
    </>
  );
}

function POIMarkers({ pois }: { pois: { id: string | null; lat?: number; lon?: number; name?: string; type?: string; distance?: number | null; categories?: string[] }[] }) {
  const poiIcons = {
    rest: L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #10B981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    fuel: L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #3B82F6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    dining: L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #F59E0B; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    medical: L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    camera: L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #8B5CF6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
    default: L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: #6B7280; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }),
  };

  return (
    <>
      {pois.map((poi, index) => {
        if (!poi.lat || !poi.lon) return null;

        const poiType = (poi.type?.toLowerCase() || '') as keyof typeof poiIcons;
        const icon = poiIcons[poiType] || poiIcons.default;

        return (
          <Marker
            key={`${poi.id || index}`}
            position={[poi.lat, poi.lon]}
            icon={icon}
          >
            <Popup>
              <div className="p-2 min-w-[150px]">
                <h4 className="font-semibold text-gray-900">{poi.name || 'POI'}</h4>
                {poi.categories && poi.categories.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {poi.categories.join(', ')}
                  </p>
                )}
                {poi.distance && (
                  <p className="text-xs text-gray-500 mt-1">
                    {poi.distance.toFixed(1)} km from origin
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function RouteMap({ routes, selectedRouteId, onRouteClick, origin, destination, hourlyForecast }: RouteMapProps) {
  const originIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #3B82F6; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">A</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const destinationIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background: #EF4444; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">B</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];
  const pois = selectedRoute?.pois || [];

  return (
    <div className="relative w-full h-full">
      {hourlyForecast && <TimeRiskBar forecast={hourlyForecast} />}
      {routes.length > 0 ? (
        <MapContainer
          center={[32.7767, -96.7970]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsController routes={routes} selectedRouteId={routes[0]?.id || null} />

          <RoutePolylines routes={routes} selectedRouteId={routes[0]?.id || null} onRouteClick={onRouteClick} />

          <POIMarkers pois={pois} />

          {origin && (
            <Marker position={[origin.lat, origin.lon]} icon={originIcon}>
              <Popup>Origin</Popup>
            </Marker>
          )}

          {destination && (
            <Marker position={[destination.lat, destination.lon]} icon={destinationIcon}>
              <Popup>Destination</Popup>
            </Marker>
          )}
        </MapContainer>
      ) : (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
          <div className="text-center">
            <p className="text-gray-400">Plan a route to see the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
