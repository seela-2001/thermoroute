import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Loader2, Plus, Minus, Thermometer, Crosshair, Map as MapIcon, Satellite } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { FloatingMapDock, type DepartureHourInfo } from "@/components/FloatingMapDock";
import { createHeatGradientLayer, createGradientRouteLine } from "@/components/HeatGradientLayer";
import {
  decimateGeometry,
  riskFromTemp,
} from "@/services/routing";
import { routesApi, type AnalyzeCamera, type AnalyzeEvaluation, type AnalyzeHeatPoint, type AnalyzePoi, type AnalyzeResponse, type AnalyzeRoute, type AnalyzeSegment } from "@/services/api";
import L from "leaflet";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
  LayerGroup as LeafletLayerGroup,
  TileLayer as LeafletTileLayer,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Fix Leaflet default icon issues
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Stop {
  id: string;
  location: string;
  lat?: number;
  lng?: number;
}

interface RouteOption {
  id: string;
  name: string;
  via: string;
  duration: string;
  distance: string;
  temperature: string;
  heatRisk: string;
  heatUnavailable?: boolean;
  color: string;
  label: string;
}

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  temperature?: number;
}

interface RouteResponse {
  id: string;
  name: string;
  via: string;
  distance: string;
  duration: string;
  temperature: string;
  heatRisk: string;
  heatUnavailable?: boolean;
  waypoints: Waypoint[];
  cameras: AnalyzeCamera[];
  pois: AnalyzePoi[];
  segments: AnalyzeSegment[];
  evaluations: AnalyzeEvaluation[];
}

function heatLevel(level: string | undefined): string {
  switch ((level || "").toUpperCase()) {
    case "LOW": return "Low";
    case "MODERATE": return "Medium";
    case "HIGH":
    case "VERY_HIGH":
    case "EXTREME": return "High";
    default: return "Medium";
  }
}

const US_STATE_CODES: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
  "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
  "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
  "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
  "district of columbia": "DC",
};

function toStateCode(state: string): string {
  const trimmed = (state || "").trim();
  if (!trimmed) return "";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return US_STATE_CODES[trimmed.toLowerCase()] || trimmed;
}

function averageHeatTemp(heat: AnalyzeHeatPoint[] | undefined): number | null {
  const valid = (heat ?? []).filter((p) => typeof p.temperature === "number");
  if (valid.length === 0) return null;
  return valid.reduce((sum, p) => sum + p.temperature, 0) / valid.length;
}

function pickEvaluation(route: AnalyzeRoute): AnalyzeEvaluation | null {
  const scored = route.evaluations.filter((ev) => ev.route_score !== null);
  if (scored.length > 0) {
    return scored.reduce((a, b) => ((a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b));
  }
  const withHeat = route.evaluations.filter((ev) => ev.heat_data && ev.heat_data.length > 0);
  return withHeat[0] ?? route.evaluations[0] ?? null;
}

function tempsAlongRoute(
  pointCount: number,
  heat: AnalyzeHeatPoint[],
  distanceKm: number
): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(pointCount).fill(undefined);
  if (!heat || heat.length === 0) return out;

  const totalM = Math.max(distanceKm * 1000, 1);
  const pts = heat
    .filter((p) => typeof p.temperature === "number")
    .map((p) => ({
      f: Math.min(1, Math.max(0, (p.distance_from_origin_m ?? 0) / totalM)),
      t: p.temperature as number,
    }))
    .sort((a, b) => a.f - b.f);

  if (pts.length === 0) return out;

  for (let i = 0; i < pointCount; i++) {
    const f = pointCount === 1 ? 0 : i / (pointCount - 1);
    if (f <= pts[0].f) {
      out[i] = Math.round(pts[0].t * 10) / 10;
      continue;
    }
    if (f >= pts[pts.length - 1].f) {
      out[i] = Math.round(pts[pts.length - 1].t * 10) / 10;
      continue;
    }
    for (let j = 1; j < pts.length; j++) {
      if (f <= pts[j].f) {
        const ratio = (f - pts[j - 1].f) / (pts[j].f - pts[j - 1].f);
        out[i] = Math.round((pts[j - 1].t + (pts[j].t - pts[j - 1].t) * ratio) * 10) / 10;
        break;
      }
    }
  }

  return out;
}

function mapBackendRoute(route: AnalyzeRoute, origin: string, destination: string) {
  const evaluation = pickEvaluation(route);
  const heat = evaluation?.heat_data ?? [];
  const avgTemp = averageHeatTemp(heat);

  const geometryCoords = (route.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }));
  const waypoints = decimateGeometry(geometryCoords, 60);
  const temps = tempsAlongRoute(waypoints.length, heat, route.distance_km);

  const wps: Waypoint[] = waypoints.map((w, i) => ({
    lat: w.lat,
    lng: w.lng,
    name: i === 0 ? origin : i === waypoints.length - 1 ? destination : `${route.id} point ${i}`,
    temperature: temps[i],
  }));

  return {
    id: route.id,
    name: "Route",
    via:
      evaluation
        ? `Weather score ${evaluation.weather_score ?? "--"} · Time score ${evaluation.time_score ?? "--"}`
        : "Heat analysis unavailable",
    distance: `${route.distance_km.toFixed(1)} km`,
    duration: `${Math.round(route.duration_min)} min`,
    temperature: avgTemp !== null ? `${Math.round(avgTemp * 10) / 10}°C` : "--",
    heatRisk:
      evaluation?.risk?.level
        ? heatLevel(evaluation.risk.level)
        : avgTemp !== null
        ? riskFromTemp(avgTemp)
        : "Medium",
    heatUnavailable: avgTemp === null,
    durationSeconds: route.duration_min * 60,
    cameras: route.cameras ?? [],
    pois: route.pois ?? [],
    segments: route.segments ?? [],
    evaluations: route.evaluations ?? [],
    waypoints: wps,
  };
}

function formatDepartureLabel(iso: string): string {
  const d = new Date(iso);
  const hour12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${hour12}${ampm}`;
}

function buildDepartureHours(
  route: RouteResponse | undefined,
  recommendations: AnalyzeResponse["departure_recommendations"],
  best: AnalyzeResponse["best_departure"]
): DepartureHourInfo[] {
  if (!route) return [];
  const recsByTime = new Map(recommendations.map((rec) => [rec.departure_time, rec]));
  return route.evaluations
    .map((ev): DepartureHourInfo | null => {
      const temp = averageHeatTemp(ev.heat_data);
      if (temp === null) return null;
      const rec = recsByTime.get(ev.departure_time);
      return {
        label: formatDepartureLabel(ev.departure_time),
        tempValue: Math.round(temp),
        risk: temp >= 40 ? "extreme" : temp >= 36 ? "high" : temp >= 32 ? "moderate" : "low",
        routeScore: rec?.route_score ?? ev.route_score ?? null,
        isBest: best ? ev.departure_time === best.departure_time : undefined,
      };
    })
    .filter((h): h is DepartureHourInfo => h !== null);
}

// Route Card Component
function RouteCard({ route, selected, onClick }: { route: RouteOption; selected: boolean; onClick: () => void }) {
  const getHeatRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "text-green-600";
      case "Medium": return "text-yellow-600";
      case "High": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-[200px] rounded-[10px] p-3 pb-2.5 text-left transition-all
        ${selected
          ? 'bg-white border-2 border-gray-900 shadow-md'
          : 'bg-white/90 border border-gray-200 hover:bg-white hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${selected ? 'bg-gray-900' : 'bg-gray-400'}`}
            style={{ backgroundColor: selected ? route.color : undefined }}
          />
          <span className="text-[13px] font-semibold text-gray-900">{route.duration}</span>
        </div>
        <span className="text-[11px] font-bold text-gray-700 uppercase">{route.label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-gray-600">{route.distance}</span>
        <span className={`text-[11px] font-semibold ${getHeatRiskColor(route.heatRisk)}`}>
          {route.temperature} · {route.heatRisk.toUpperCase()}
        </span>
      </div>
      <div className="mt-1 pt-1 border-t border-gray-100 text-[10px] text-gray-500 truncate">
        {route.via}
      </div>
    </button>
  );
}

// Map Controls Component
function MapControls({ onZoomIn, onZoomOut, onCenter, heatmapVisible, onToggleHeatmap, heatmapLoading }: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  heatmapVisible: boolean;
  onToggleHeatmap: () => void;
  heatmapLoading: boolean;
}) {
  return (
    <div className="absolute right-5 bottom-5 z-[1000] flex flex-col gap-1">
      <button onClick={onZoomIn} className="w-[40px] h-[40px] bg-white rounded-[10px] shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
        <Plus className="w-5 h-5 text-gray-700" />
      </button>
      <button onClick={onZoomOut} className="w-[40px] h-[40px] bg-white rounded-[10px] shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
        <Minus className="w-5 h-5 text-gray-700" />
      </button>
      <button onClick={onCenter} className="w-[40px] h-[40px] bg-white rounded-[10px] shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
        <Crosshair className="w-5 h-5 text-gray-700" />
      </button>
      <div className="relative">
        <button
          onClick={onToggleHeatmap}
          disabled={heatmapLoading}
          className={`w-[40px] h-[40px] rounded-[10px] shadow-md flex items-center justify-center transition-colors mt-1 ${
            heatmapVisible ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'
          } ${heatmapLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={heatmapVisible ? "Heat exposure (on)" : "Heat exposure (off)"}
        >
          {heatmapLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Thermometer className="w-4 h-4" />
          )}
        </button>
        {heatmapVisible && (
          <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-2">
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap bg-white/90 px-2 py-1 rounded shadow">
              Heat exposure
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Selected Route Details Panel
function RouteDetailsPanel({ route }: { route: RouteOption | null }) {
  if (!route) return null;

  const getHeatRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "text-green-600";
      case "Medium": return "text-yellow-600";
      case "High": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="absolute bottom-5 left-5 z-[1000] bg-white rounded-[12px] shadow-md p-4 w-[240px] border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{route.label} · {route.name}</p>
      <p className="text-[11px] text-gray-400 mb-2">{route.via}</p>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-[20px] font-semibold text-gray-900">{route.duration}</span>
        <span className="text-sm text-gray-600">· {route.distance}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">{route.temperature}</span>
        <span className={`text-xs font-semibold ${getHeatRiskColor(route.heatRisk)}`}>
          {route.heatRisk.toUpperCase()} HEAT
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        {route.heatRisk === "High"
          ? "This route has higher heat exposure. Consider alternative timing or cooler route."
          : route.heatRisk === "Low"
          ? "This route offers the best heat protection for your crew."
          : "A balanced option considering both travel time and heat conditions."}
      </p>
    </div>
  );
}

// Map / Satellite Style Toggle (top right)
function MapStyleToggle({ satellite, onChange }: { satellite: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="absolute top-5 right-5 z-[1000]">
      <div className="bg-white rounded-[10px] shadow-md p-1 flex items-center">
        <button
          onClick={() => onChange(false)}
          className={`
            h-[36px] px-3 rounded-[7px] flex items-center justify-center gap-1.5 transition-all
            ${!satellite ? 'bg-[#111827] text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}
          `}
          title="Map view"
        >
          <MapIcon className="w-4 h-4" />
          <span className="text-[12px] font-medium">Map</span>
        </button>
        <button
          onClick={() => onChange(true)}
          className={`
            h-[36px] px-3 rounded-[7px] flex items-center justify-center gap-1.5 transition-all
            ${satellite ? 'bg-[#111827] text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}
          `}
          title="Satellite view"
        >
          <Satellite className="w-4 h-4" />
          <span className="text-[12px] font-medium">Satellite</span>
        </button>
      </div>
    </div>
  );
}

export function RoutePlanner() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationState, setDestinationState] = useState<string>("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Trip preferences
  const [departureRangeHours, setDepartureRangeHours] = useState(6);
  const [stepMinutes, setStepMinutes] = useState(30);
  const [weatherWeightPct, setWeatherWeightPct] = useState(70);
  const [trafficAware, setTrafficAware] = useState(false);

  // Map states
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [heatmapLoading] = useState(false); // kept for the loading indicator component
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [departureHover, setDepartureHover] = useState<DepartureHourInfo | null>(null);

  // Real data fetched from the backend analysis API
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [recommendedRouteId, setRecommendedRouteId] = useState<string | null>(null);
  const [departureHours, setDepartureHours] = useState<DepartureHourInfo[]>([]);
  const [heatWarning, setHeatWarning] = useState<string | null>(null);
  const [heatLoadingLive, setHeatLoadingLive] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const routeLayersRef = useRef<Map<string, LeafletPolyline>>(new Map());
  const markersRef = useRef<LeafletMarker[]>([]);
  // Heat visualization refs
  const heatGlowLayersRef = useRef<Map<string, LeafletLayerGroup>>(new Map());
  // Selected stop marker ref
  const selectedStopMarkerRef = useRef<LeafletMarker | null>(null);

  // Fly map to a selected stop and highlight it
  const handleStopSelect = (stop: { name: string; lat: number; lng: number }) => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous highlight marker
    if (selectedStopMarkerRef.current) {
      map.removeLayer(selectedStopMarkerRef.current);
      selectedStopMarkerRef.current = null;
    }

    const markerHtml = `
      <div style="position:relative">
        <div class="stop-pulse-ring"></div>
        <div class="stop-pin-label">${stop.name}</div>
        <div style="width:16px;height:16px;background:#111827;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);position:relative;z-index:1"></div>
      </div>
    `;

    const icon = L.divIcon({
      html: markerHtml,
      className: 'custom-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    selectedStopMarkerRef.current = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
    map.flyTo([stop.lat, stop.lng], 12, { duration: 1.2 });
  };

  const trip = {
    origin,
    destination,
    originCoords,
    destinationCoords,
    stops: stops.filter(s => s.location.trim().length > 0).map(s => ({
      name: s.location,
      lat: s.lat || 0,
      lng: s.lng || 0
    }))
  };

  // Initialize map when showMap becomes true
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || mapRef.current) return;

    try {
      console.log('Initializing map...');

      const originLat = originCoords?.lat || 40.7128;
      const originLng = originCoords?.lng || -74.0060;

      const map = L.map(mapContainerRef.current, {
        center: [originLat, originLng],
        zoom: 10,
        zoomControl: false,
      });

      console.log('Map created:', map);

      mapRef.current = map;

      console.log('Map initialized successfully');

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [showMap, originCoords?.lat, originCoords?.lng]);

  // Swap basemap tiles when Map/Satellite toggle changes
  useEffect(() => {
    if (!showMap || !mapRef.current) return;
    const map = mapRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layer = isSatellite
      ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19,
        })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        });

    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [showMap, isSatellite]);

  // Real routes are fetched from OSRM + FortyGuard in handleSubmit()
  // Backend order is kept as-is — alternatives are already ranked by route_score.
  const routeOptions: RouteOption[] = routes.map((route, idx) => {
    const isRecommended = route.id === recommendedRouteId || (idx === 0 && !recommendedRouteId);
    return {
      id: route.id,
      name: route.name,
      via: route.via,
      duration: route.duration,
      distance: route.distance,
      temperature: route.temperature,
      heatRisk: route.heatRisk,
      heatUnavailable: route.heatUnavailable,
      color: isRecommended ? "#111827" : idx === 0 ? "#059669" : "#D97706",
      label: isRecommended ? "RECOMMENDED" : idx === 0 ? "ALTERNATIVE" : "ALTERNATIVE 2"
    };
  });

  const selectedRoute = routeOptions.find(r => r.id === selectedRouteId) || routeOptions[0];
  const selectedRouteData = routes.find(r => r.id === selectedRouteId) ?? routes[0];

  // Build the heat glow layer from real fetched temperatures (shifted by hovered departure hour).
  // Returns null when live heat data is unavailable — no mock fallback.
  const buildGlowLayer = (routeData: RouteResponse, forceOpacity?: number): LeafletLayerGroup | null => {
    const tempsKnown =
      routeData.waypoints.length > 1 &&
      routeData.waypoints.every((wp) => typeof wp.temperature === "number");
    if (!tempsKnown) return null;

    // Shift applied by hovered departure hour; 34° is the neutral reference
    let shift = 0;
    if (departureHover) shift = Math.round((departureHover.tempValue - 34) * 0.8);

    const points = routeData.waypoints.map((wp) => ({
      lat: wp.lat,
      lng: wp.lng,
      temperature: Math.round(Math.min(48, Math.max(22, (wp.temperature as number) + shift)) * 10) / 10,
    }));

    return createHeatGradientLayer(points, {
      segmentLength: 25,
      glowWidth: 14,
      glowOpacity: forceOpacity ?? (heatmapVisible ? 0.5 : 0),
      routeWidth: 5,
    });
  };

  // Load heat visualization for selected route
  useEffect(() => {
    if (!showMap || !mapRef.current || !selectedRouteData) {
      return;
    }

    const map = mapRef.current;

    const loadHeatVisualization = () => {
      // Remove old heat visualization layers
      heatGlowLayersRef.current.forEach((layer) => map.removeLayer(layer));
      heatGlowLayersRef.current.clear();

      // Build glow from real FortyGuard temperatures (returns null when heat data unavailable)
      const heatGlowLayer = buildGlowLayer(selectedRouteData);
      if (!heatGlowLayer) return;

      heatGlowLayer.addTo(map);
      heatGlowLayersRef.current.set(selectedRouteData.id, heatGlowLayer);
    };

    loadHeatVisualization();
  }, [showMap, selectedRouteId, heatmapVisible, routes, departureHover]);

  // Draw routes on map
  useEffect(() => {
    if (!showMap || !mapRef.current) return;

    const map = mapRef.current;
    const routeLayers = routeLayersRef.current;
    const markers = markersRef.current;

    routeLayers.forEach((layer) => map.removeLayer(layer));
    routeLayers.clear();

    markers.forEach((marker) => map.removeLayer(marker));
    markers.length = 0;

    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;

      // Real OSRM geometry (decimated), drawn as the crisp line over the glow
      const linePoints = route.waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng, temperature: wp.temperature ?? 0 }));
      const routeLine = createGradientRouteLine(linePoints, isSelected, {
        routeWidth: isSelected ? 5 : 3
      });

      routeLine.addTo(map);
      routeLine.on('click', () => setSelectedRouteId(route.id));
      routeLine.setStyle?.({ cursor: 'pointer' });

      routeLayers.set(route.id, routeLine);

      // Add origin and destination markers
      const originWp = route.waypoints[0];
      const destWp = route.waypoints[route.waypoints.length - 1];

      const originIconHtml = '<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>';
      const destIconHtml = '<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>';

      const originIcon = L.divIcon({
        html: originIconHtml,
        className: 'custom-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const destIcon = L.divIcon({
        html: destIconHtml,
        className: 'custom-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const originMarker = L.marker([originWp.lat, originWp.lng], { icon: originIcon }).addTo(map);
      const destMarker = L.marker([destWp.lat, destWp.lng], { icon: destIcon }).addTo(map);

      markers.push(originMarker, destMarker);

      // Fit map to selected route
      if (isSelected) {
        const latLngs = route.waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);
        if (latLngs.length > 0) {
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    });

    return () => {
      routeLayers.forEach((layer) => map.removeLayer(layer));
      markers.forEach((marker) => map.removeLayer(marker));
    };
  }, [showMap, routes, selectedRouteId]);

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleCenter = () => {
    if (mapRef.current && selectedRouteData) {
      const latLngs = selectedRouteData.waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);
      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const handleToggleHeatmap = () => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (heatmapVisible) {
      // Turn off heat visualization
      heatGlowLayersRef.current.forEach((layer) => {
        map.removeLayer(layer);
      });
    } else {
      // Turn on heat visualization using real stored temperatures
      if (!selectedRouteData) return;

      const heatGlowLayer = buildGlowLayer(selectedRouteData, 0.5);
      if (heatGlowLayer) {
        heatGlowLayer.addTo(map);
        heatGlowLayersRef.current.set(selectedRouteData.id, heatGlowLayer);
      }
    }

    setHeatmapVisible(!heatmapVisible);
  };

  const addStop = () => {
    const newStop: Stop = {
      id: Date.now().toString(),
      location: ""
    };
    setStops([...stops, newStop]);
  };

  const removeStop = (id: string) => {
    setStops(stops.filter(stop => stop.id !== id));
  };

  const updateStop = (id: string, value: string) => {
    setStops(stops.map(stop =>
      stop.id === id ? { ...stop, location: value } : stop
    ));
  };

  const updateStopCoords = (id: string, coords: { lat: number; lng: number }) => {
    setStops(stops.map(stop =>
      stop.id === id ? { ...stop, lat: coords.lat, lng: coords.lng } : stop
    ));
  };

  const isFormValid = origin.trim().length > 0 && destination.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Real routing requires geocoded coordinates — pick locations from the suggestions
    if (!originCoords || !destinationCoords) {
      setError('Please select your origin and destination from the suggestions list so we can find real routes.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      setHeatLoadingLive(true);

      const departureStart = new Date();
      const departureEnd = new Date(departureStart.getTime() + departureRangeHours * 60 * 60 * 1000);

      const response = await routesApi.analyze({
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination_lat: destinationCoords.lat,
        destination_lng: destinationCoords.lng,
        jurisdiction: toStateCode(destinationState) || "MN",
        departure_start: departureStart.toISOString(),
        departure_end: departureEnd.toISOString(),
        step_minutes: stepMinutes,
        weather_weight: weatherWeightPct / 100,
        time_weight: 1 - weatherWeightPct / 100,
        traffic_aware: trafficAware,
      });

      const recommendedId =
        response.recommended_route_id ??
        response.best_departure?.recommended_route_id ??
        response.routes[0]?.id ??
        null;

      // Keep backend route order — alternatives are already ranked by route_score
      const finalRoutes: RouteResponse[] = response.routes.map((route, idx) => {
        const mapped = mapBackendRoute(route, origin, destination);
        return {
          id: mapped.id,
          name: route.id === recommendedId ? "Recommended Route" : `Alternative Route ${idx}`,
          via: mapped.via,
          distance: mapped.distance,
          duration: mapped.duration,
          temperature: mapped.temperature,
          heatRisk: mapped.heatRisk,
          heatUnavailable: mapped.heatUnavailable,
          waypoints: mapped.waypoints,
          cameras: mapped.cameras,
          pois: mapped.pois,
          segments: mapped.segments,
          evaluations: mapped.evaluations,
        };
      });

      setRoutes(finalRoutes);
      setRecommendedRouteId(recommendedId);

      const recommendedRoute =
        finalRoutes.find((r) => r.id === recommendedId) ?? finalRoutes[0];
      setDepartureHours(
        buildDepartureHours(recommendedRoute, response.departure_recommendations, response.best_departure)
      );

      if (recommendedId) {
        setSelectedRouteId(recommendedId);
      }

      const anyHeat = finalRoutes.some((r) => !r.heatUnavailable);
      setHeatWarning(anyHeat ? null : "Heat analysis unavailable for this route — no live temperature data was returned by the backend.");

      setShowMap(true);
    } catch (err) {
      console.error('Error planning route:', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Unknown error';
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? JSON.stringify((err as { response?: { data?: unknown } }).response?.data)
          : '';
      setError(`Failed to analyze routes: ${msg}${detail ? ` — ${detail}` : ''}`);
    } finally {
      setHeatLoadingLive(false);
      setIsSubmitting(false);
    }
  };

  const setErrorOnceProxyHint = () => {
    setHeatWarning('Heat analysis unavailable for this route — no live temperature data was returned by the backend.');
  };
  void setErrorOnceProxyHint;

  const handleBackToForm = () => {
    setShowMap(false);
  };

  // Flatten per-segment POIs into the dock stops list, tagging each with
  // how far along the route its segment sits. Falls back to the aggregate
  // POI list when the backend returned no per-segment data.
  const segmentStops: AnalyzePoi[] = (selectedRouteData?.segments ?? []).flatMap((seg) =>
    (seg.pois ?? []).map((poi) => ({
      ...poi,
      address: [
        seg.distance_from_origin_m != null
          ? `${(seg.distance_from_origin_m / 1000).toFixed(1)} km along route`
          : null,
        poi.address,
      ].filter(Boolean).join(" · "),
    }))
  );
  const dockPois = segmentStops.length > 0 ? segmentStops : selectedRouteData?.pois ?? [];

  // If showing map, return map view
  if (showMap) {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Map Layer */}
        <div className="absolute inset-0 bg-gray-200">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Heatmap loading indicator */}
        {heatmapLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl px-6 py-4 z-[2000]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-sm text-gray-700">Loading FortyGuard heat data...</span>
            </div>
          </div>
        )}

        {/* Live heat data warning */}
        {heatWarning && (
          <div className="absolute top-[84px] left-1/2 -translate-x-1/2 z-[1500] w-full max-w-[420px] px-3">
            <div className="bg-amber-50 border border-amber-200 rounded-[10px] shadow-md px-4 py-2.5 flex items-start justify-between gap-3">
              <p className="text-[12px] text-amber-700 leading-snug">{heatWarning}</p>
              <button onClick={() => setHeatWarning(null)} aria-label="Dismiss">
                <X className="w-4 h-4 text-amber-500 hover:text-amber-700" />
              </button>
            </div>
          </div>
        )}

        {heatLoadingLive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl px-6 py-4 z-[2000]">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              <span className="text-sm text-gray-700">Fetching real routes &amp; heat data...</span>
            </div>
          </div>
        )}

        {/* Floating: Back to Planning */}
        <div className="absolute top-5 left-5 z-[1000]">
          <button
            onClick={handleBackToForm}
            className="h-[44px] px-4 bg-white rounded-[10px] shadow-md flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">Back to Planning</span>
          </button>
        </div>

        {/* Floating: Map / Satellite Toggle */}
        <MapStyleToggle satellite={isSatellite} onChange={setIsSatellite} />

        {/* Floating: Trip Summary */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[999]">
          <div className="bg-white rounded-[10px] shadow-md px-5 py-3">
            <p className="text-sm font-semibold text-gray-900">
              <span className="text-gray-700">{trip.origin}</span>
              {trip.stops && trip.stops.length > 0 && (
                <>
                  <span className="mx-2 text-gray-300">→</span>
                  <span className="text-gray-700">{trip.stops.map((s) => s.name).join(" → ")}</span>
                </>
              )}
              <span className="mx-2 text-gray-300">→</span>
              <span className="text-gray-700">{trip.destination}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5 text-center">
              {routes.length} routes available
            </p>
          </div>
        </div>

        {/* Floating: Route Options Stack */}
        <div className="absolute left-5 top-[80px] z-[999] flex flex-col gap-2">
          {routeOptions.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              selected={route.id === selectedRouteId}
              onClick={() => setSelectedRouteId(route.id)}
            />
          ))}
        </div>

        {/* Floating: Map Controls */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onCenter={handleCenter}
          heatmapVisible={heatmapVisible}
          onToggleHeatmap={handleToggleHeatmap}
          heatmapLoading={heatmapLoading}
        />

        {/* Floating: Selected Route Details */}
        <RouteDetailsPanel route={selectedRoute} />

        {/* Floating: Bottom Map Dock */}
        <FloatingMapDock
          onCameraSelect={(id) => console.log('Camera selected:', id)}
          onStopSelect={handleStopSelect}
          onDepartureHover={setDepartureHover}
          hours={departureHours}
          hoursLoading={isSubmitting}
          windowLabel={`NEXT ${departureRangeHours} HOURS · ${stepMinutes} MIN STEPS`}
          cameras={selectedRouteData?.cameras ?? []}
          pois={dockPois}
        />
      </div>
    );
  }

  // Show planning form
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header - 60px height */}
      <header className="h-[60px] bg-white border-b border-gray-200">
        <div className="px-4 md:px-10 h-full flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="text-sm font-semibold text-gray-900">
            Thermo Dispatch
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-14 pb-16">
        {/* Page Heading */}
        <div className="text-center mb-10 max-w-xl mx-auto">
          <h1 className="text-[28px] md:text-[32px] font-[650] leading-[1.15] text-gray-900 mb-3">
            Plan your route
          </h1>
          <p className="text-[15px] leading-[1.5] text-gray-600">
            Tell us where you're going. We'll find the best route for the conditions.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-[680px] mx-auto w-[calc(100%-32px)] mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-8 max-w-[680px] mx-auto w-[calc(100%-32px)]">
            {/* Origin */}
            <div className="mb-7">
              <label className="block text-[11px] font-[650] tracking-[0.05em] uppercase text-gray-500 mb-2.5">
                From
              </label>
              <LocationAutocomplete
                value={origin}
                onChange={setOrigin}
                onLocationSelect={(location) => setOriginCoords({ lat: location.lat, lng: location.lng })}
                placeholder="Enter starting location"
                disabled={isSubmitting}
              />
            </div>

            {/* Stops */}
            {stops.map((stop, index) => (
              <div key={stop.id} className="mb-7">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-[11px] font-[650] tracking-[0.05em] uppercase text-gray-500">
                    Stop {index + 1}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    disabled={isSubmitting}
                    className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    aria-label="Remove stop"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <LocationAutocomplete
                  value={stop.location}
                  onChange={(value) => updateStop(stop.id, value)}
                  onLocationSelect={(location) => updateStopCoords(stop.id, { lat: location.lat, lng: location.lng })}
                  placeholder="Enter stop location"
                  disabled={isSubmitting}
                />
              </div>
            ))}

            {/* Add Stop Button */}
            <button
              type="button"
              onClick={addStop}
              disabled={isSubmitting}
              className="text-[14px] font-medium text-gray-600 hover:text-gray-900 hover:underline transition-all flex items-center gap-2 mb-8 py-1 disabled:opacity-50"
            >
              <span className="text-gray-400">+</span> Add stop
            </button>

            {/* Destination */}
            <div className="mb-6">
              <label className="block text-[11px] font-[650] tracking-[0.05em] uppercase text-gray-500 mb-2.5">
                To
              </label>
              <LocationAutocomplete
                value={destination}
                onChange={setDestination}
                onLocationSelect={(location) => {
                  setDestinationCoords({ lat: location.lat, lng: location.lng });
                  setDestinationState(location.state || "");
                }}
                placeholder="Enter destination"
                disabled={isSubmitting}
              />
            </div>

            {/* Trip Preferences */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <label className="block text-[11px] font-[650] tracking-[0.05em] uppercase text-gray-500 mb-4">
                Trip preferences
              </label>

              <div className="grid grid-cols-2 gap-4 mb-5">
                {/* Departure window */}
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                    Departure window
                  </label>
                  <select
                    value={departureRangeHours}
                    onChange={(e) => setDepartureRangeHours(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full h-[44px] px-3 bg-white border border-[#E5E7EB] rounded-[10px] text-[14px] text-gray-900 focus:outline-none focus:border-gray-400 disabled:opacity-50"
                  >
                    <option value={2}>Next 2 hours</option>
                    <option value={6}>Next 6 hours</option>
                    <option value={12}>Next 12 hours</option>
                  </select>
                </div>

                {/* Step interval */}
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                    Time step
                  </label>
                  <select
                    value={stepMinutes}
                    onChange={(e) => setStepMinutes(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full h-[44px] px-3 bg-white border border-[#E5E7EB] rounded-[10px] text-[14px] text-gray-900 focus:outline-none focus:border-gray-400 disabled:opacity-50"
                  >
                    <option value={30}>Every 30 min</option>
                    <option value={60}>Every 60 min</option>
                  </select>
                </div>
              </div>

              {/* Priority slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-gray-600">Priority</label>
                  <span className="text-[11px] text-gray-400">
                    {weatherWeightPct >= 60
                      ? "Heat avoidance favored"
                      : weatherWeightPct <= 40
                      ? "Speed favored"
                      : "Balanced"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">Fastest route</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weatherWeightPct}
                    onChange={(e) => setWeatherWeightPct(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="flex-1 accent-[#111827] disabled:opacity-50"
                  />
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">Coolest route</span>
                </div>
              </div>

              {/* Traffic-aware toggle */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[12px] font-medium text-gray-600">Traffic-aware</div>
                  <div className="text-[11px] text-gray-400">
                    Factor live traffic conditions into routing
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={trafficAware}
                  onClick={() => setTrafficAware(!trafficAware)}
                  disabled={isSubmitting}
                  className={`
                    relative w-[44px] h-[26px] rounded-full transition-colors flex-shrink-0
                    ${trafficAware ? 'bg-[#111827]' : 'bg-gray-200'}
                    disabled:opacity-50
                  `}
                >
                  <span
                    className={`
                      absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow transition-all
                      ${trafficAware ? 'left-[21px]' : 'left-[3px]'}
                    `}
                  />
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                We'll evaluate {Math.floor((departureRangeHours * 60) / stepMinutes)} departure times
                across your window — larger windows take longer to analyze.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full h-[52px] bg-[#111827] text-white text-[15px] font-medium rounded-[10px] hover:bg-[#1F2937] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing your route...
                </>
              ) : (
                <>
                  Find the best route
                  <span className="text-gray-400">→</span>
                </>
              )}
            </button>

            {/* Intelligence Hint */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-[13px] text-gray-500 text-center">
                Heat-aware routing · Weather · Traffic
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}