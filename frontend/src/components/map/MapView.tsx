import { useState, useEffect, useRef, useMemo, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

class JourneyErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { error: string | null }> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error("Journey visualizer crashed:", e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,11,0.65)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Journey Plan error</div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 16, wordBreak: "break-all" }}>{this.state.error}</div>
            <button onClick={this.props.onClose} style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: "#1C1917", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  ArrowLeft,
  Loader2,
  Thermometer,
  Map as MapIcon,
  Satellite,
  WifiOff,
  Plus,
  Minus,
  Crosshair,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingMapDock, type DepartureHourInfo } from "@/components/FloatingMapDock";
import { ChatWidget } from "@/components/ChatWidget";
import { HeatIntelTab } from "@/components/HeatIntelTab";
import { StopJourneyVisualizer } from "@/components/StopJourneyVisualizer";
import thermoLogo from "@/components/ui/images/fa492037-babd-45eb-b0a3-e2ee3fce2acb.png";
import {
  createHeatGradientLayer,
  createGradientRouteLine,

} from "@/components/HeatGradientLayer";
import type { RouteData } from "@/utils/routeUtils";
import { fmtDuration, buildRouteHours } from "@/utils/routeUtils";
import type { AnalyzePoi, CriticalAlert, CoolingStop } from "@/services/api";
import L from "leaflet";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
  LayerGroup as LeafletLayerGroup,
  TileLayer as LeafletTileLayer,
  Control as LeafletControl,
} from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ─── Heat color helpers ───────────────────────────────────────────

function heatColorForTemp(t: number): string {
  if (t <= 24) return "#7CC8E8";
  if (t <= 28) return "#90D9A8";
  if (t <= 32) return "#FAD675";
  if (t <= 36) return "#F59052";
  if (t <= 40) return "#E86433";
  return "#CC3320";
}

function heatInkForTemp(t: number): string {
  if (t <= 24) return "#0369A1";
  if (t <= 28) return "#166534";
  if (t <= 32) return "#92400E";
  if (t <= 36) return "#9A3412";
  return "#991B1B";
}

function riskLabelFromTemp(t: number): string {
  if (t <= 24) return "Easy";
  if (t <= 28) return "Mild";
  if (t <= 32) return "Warm";
  if (t <= 36) return "Hot";
  if (t <= 40) return "Severe";
  return "Extreme";
}

// Use real backend route_score (0–100, lower=better risk) when available.
// routeScore is the blended weather+time score; comfort = 100 - routeScore.
// Falls back to a risk-level estimate when the backend score is absent.
function comfortScore(hour: { routeScore?: number | null; risk: string; tempValue: number }): number {
  if (hour.routeScore != null) return Math.max(0, Math.min(100, Math.round(100 - hour.routeScore)));
  // Fallback estimate from risk level + temperature
  const lvl = hour.risk.toLowerCase().replace("very_high", "extreme").replace("medium", "moderate");
  const temp = hour.tempValue;
  if (temp <= 0) {
    switch (lvl) { case "low": return 84; case "moderate": return 62; case "high": return 40; default: return 18; }
  }
  switch (lvl) {
    case "low":      return Math.max(72, Math.min(98, Math.round(92 - Math.max(0, temp - 20) * 0.5)));
    case "moderate": return Math.max(50, Math.min(72, Math.round(70 - Math.max(0, temp - 28) * 0.6)));
    case "high":     return Math.max(28, Math.min(50, Math.round(50 - Math.max(0, temp - 28) * 1.2)));
    default:         return Math.max(8,  Math.min(28, Math.round(28 - Math.max(0, temp - 35) * 0.8)));
  }
}

function parseLabelToHours(label: string): number | null {
  const m = label.match(/^(\d+)(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const pm = m[2].toUpperCase() === "PM";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h;
}

function addMinutesToLabel(label: string, minutes: number): string {
  const h = parseLabelToHours(label);
  if (h === null) return "--";
  const totalMins = h * 60 + Math.round(minutes);
  const hh = Math.floor(totalMins / 60) % 24;
  const mm = totalMins % 60;
  const hour12 = hh % 12 || 12;
  const ampm = hh >= 12 ? "PM" : "AM";
  return mm === 0
    ? `${hour12}${ampm}`
    : `${hour12}:${String(mm).padStart(2, "0")}${ampm}`;
}

function displayTemp(temp: number, inF: boolean): string {
  if (inF) return `${Math.round(temp * 9 / 5 + 32)}°F`;
  return `${Math.round(temp)}°C`;
}

function formatEtaFromIso(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "--";
    const h = d.getHours();
    const m = d.getMinutes();
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? "PM" : "AM";
    return m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, "0")}${ampm}`;
  } catch {
    return "--";
  }
}

function parseTemp(t: string): number {
  return parseFloat(t.replace("°C", "").replace("°F", "").replace("--", "0")) || 0;
}

function parseDurationMin(d: string): number {
  const h = d.match(/(\d+)\s*h/);
  const m = d.match(/(\d+)\s*m/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function heatEmoji(temp: number): string {
  if (temp >= 40) return "🔥";
  if (temp >= 36) return "🥵";
  if (temp >= 32) return "☀️";
  if (temp >= 28) return "🌤️";
  return "😎";
}

function riskInfo(temp: number | null, risk?: string): { label: string; tip: string } {
  const lvl = (risk ?? "").toUpperCase();
  const byRisk: Record<string, { label: string; tip: string }> = {
    EXTREME:   { label: "Extreme Heat",   tip: "Dangerous. Avoid outdoor exposure" },
    VERY_HIGH: { label: "Very High Heat", tip: "High risk. Stay hydrated, limit time outside" },
    HIGH:      { label: "High Heat",      tip: "Elevated risk. Take regular breaks" },
    MODERATE:  { label: "Moderate Heat",  tip: "Use caution. Drink water regularly" },
    LOW:       { label: "Low Heat",       tip: "Comfortable driving conditions" },
  };
  if (byRisk[lvl]) return byRisk[lvl];
  if (temp === null) return { label: "Heat Condition", tip: "No temperature data available" };
  if (temp >= 45) return byRisk.EXTREME;
  if (temp >= 40) return byRisk.VERY_HIGH;
  if (temp >= 35) return byRisk.HIGH;
  if (temp >= 30) return byRisk.MODERATE;
  return byRisk.LOW;
}

// ─── Sub-types ────────────────────────────────────────────────────

interface RouteOption {
  id: string;
  name: string;
  description: string;
  label: string;
  duration: string;
  distance: string;
  temperature: string;
  heatRisk: string;
  color: string;
  weatherScore?: number | null;
  timeScore?: number | null;
}

interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

function computeRouteLabel(
  routeId: string,
  idx: number,
  total: number,
  recommendedId: string | null
): string {
  const isRec = routeId === recommendedId || (idx === 0 && !recommendedId);
  if (total === 1) return "BEST ROUTE";
  if (isRec) return "RECOMMENDED";
  return `OPTION ${idx + 1}`;
}

function computeRouteDescription(
  route: RouteOption,
  allRoutes: RouteOption[],
  recommendedId: string | null
): string {
  if (allRoutes.length === 1) return "Only route available";
  const isRec = route.id === recommendedId || (!recommendedId && route === allRoutes[0]);
  const recRoute = allRoutes.find((r) => r.id === recommendedId) ?? allRoutes[0];
  if (isRec) {
    const thisTemp = parseTemp(route.temperature);
    const otherTemps = allRoutes.filter((r) => r.id !== route.id).map((r) => parseTemp(r.temperature));
    const isCoolest = otherTemps.every((t) => thisTemp <= t);
    const thisDur = parseDurationMin(route.duration);
    const otherDurs = allRoutes.filter((r) => r.id !== route.id).map((r) => parseDurationMin(r.duration));
    const isFastest = otherDurs.every((d) => thisDur <= d);
    if (isCoolest && isFastest) return "Best balance of heat and time";
    if (isCoolest) return "Lowest heat exposure";
    if (isFastest) return "Fastest option";
    return "Best overall score";
  }
  const recTemp = parseTemp(recRoute.temperature);
  const thisTemp = parseTemp(route.temperature);
  const recDur = parseDurationMin(recRoute.duration);
  const thisDur = parseDurationMin(route.duration);
  const tempDiff = Math.round(thisTemp - recTemp);
  const durDiff = thisDur - recDur;
  const parts: string[] = [];
  if (Math.abs(tempDiff) >= 1)
    parts.push(tempDiff > 0 ? `+${tempDiff}°C warmer` : `${Math.abs(tempDiff)}°C cooler`);
  if (Math.abs(durDiff) >= 5)
    parts.push(durDiff > 0 ? `+${durDiff} min longer` : `${Math.abs(durDiff)} min faster`);
  return parts.length > 0 ? parts.join(", ") : "Similar conditions";
}

// ─── Map style toggle ─────────────────────────────────────────────

function MapStyleToggle({ satellite, onChange }: { satellite: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="absolute top-3 right-3" style={{ zIndex: 500 }}>
      <div
        className="rounded-xl p-1 flex items-center gap-0.5"
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid #EBE8E3",
          boxShadow: "0 1px 4px rgba(28,25,23,0.08)",
        }}
      >
        <button
          onClick={() => onChange(false)}
          className="h-[30px] px-2.5 rounded-lg flex items-center gap-1.5 transition-all"
          style={{
            background: !satellite ? "#F97316" : "transparent",
            color: !satellite ? "#fff" : "#6B6560",
          }}
        >
          <MapIcon className="w-3 h-3" />
          <span className="text-[11px] font-medium">Map</span>
        </button>
        <button
          onClick={() => onChange(true)}
          className="h-[30px] px-2.5 rounded-lg flex items-center gap-1.5 transition-all"
          style={{
            background: satellite ? "#F97316" : "transparent",
            color: satellite ? "#fff" : "#6B6560",
          }}
        >
          <Satellite className="w-3 h-3" />
          <span className="text-[11px] font-medium">Satellite</span>
        </button>
      </div>
    </div>
  );
}

// ─── Prop types ───────────────────────────────────────────────────

export interface MapViewProps {
  routes: RouteData[];
  recommendedRouteId: string | null;
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number } | null;
  departureHours: DepartureHourInfo[];
  isSubmitting: boolean;
  departureRangeHours: number;
  stepMinutes: number;
  onBack: () => void;
  heatWarning: string | null;
  onDismissWarning?: () => void;
  heatLoadingLive: boolean;
  recommendation?: {
    headline: string;
    decision: string;
    reason: string;
    key_factors: string[];
    safety_tip: string;
    alerts?: CriticalAlert[];
    cooling_stops?: CoolingStop[];
  } | null;
  passengerTypes?: string[];
  weatherWeightPct?: number;
  trafficAware?: boolean;
}

// ─── MapView ──────────────────────────────────────────────────────

function cityName(full: string): string {
  return full.split(",")[0].trim();
}

export function MapView({
  routes,
  recommendedRouteId,
  origin,
  destination,
  originCoords,
  departureHours,
  isSubmitting,
  departureRangeHours,
  stepMinutes,
  onBack,
  heatWarning,
  heatLoadingLive,
  recommendation,
  passengerTypes = [],
  weatherWeightPct = 70,
  trafficAware = false,
}: MapViewProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    () => recommendedRouteId ?? routes[0]?.id ?? ""
  );
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [departureHover, setDepartureHover] = useState<DepartureHourInfo | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState<"results" | "detail" | "ai">("results");
  const [unitF, setUnitF] = useState(false);
  const [selectedHourIdx, setSelectedHourIdx] = useState<number | null>(null);
  const [planApplied, setPlanApplied] = useState(false);
  const [poiFilter, setPoiFilter] = useState<string>("all");
  const [rainVisible, setRainVisible] = useState(false);
  const [windVisible, setWindVisible] = useState(false);
  const [showJourneyVisualizer, setShowJourneyVisualizer] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const routeLayersRef = useRef<Map<string, LeafletPolyline>>(new Map());
  const markersRef = useRef<LeafletMarker[]>([]);
  const heatGlowLayersRef = useRef<Map<string, LeafletLayerGroup>>(new Map());
  const selectedStopMarkerRef = useRef<LeafletMarker | null>(null);
  const heatLegendRef = useRef<LeafletControl | null>(null);
  const heatEmojiMarkersRef = useRef<LeafletMarker[]>([]);
  const deptGradientRef = useRef<LeafletLayerGroup | null>(null);
  const poiMarkerRef = useRef<LeafletMarker | null>(null);
  const coolingStopMarkersRef = useRef<LeafletMarker[]>([]);
  const rainLayerRef = useRef<LeafletLayerGroup | null>(null);
  const windLayerRef = useRef<LeafletLayerGroup | null>(null);
  const mapCardRef = useRef<HTMLDivElement | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const selectedRouteData = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  // Departure hours for the currently selected route — recalculated when route changes
  const activeRouteHours = useMemo(
    () => buildRouteHours(selectedRouteData),
    [selectedRouteData]
  );

  // Reset selected hour when the route changes so stale index doesn't carry over
  useEffect(() => {
    setSelectedHourIdx(null);
  }, [selectedRouteId]);

  // Best departure card is always pinned to the overall recommended route's best hour (prop)
  const bestDeparture: DepartureHourInfo | null =
    departureHours.find((h) => h.isBest) ??
    (departureHours.length > 0
      ? departureHours.reduce((a, b) => (a.tempValue <= b.tempValue ? a : b))
      : null);

  // ── Map init ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    try {
      const lat = originCoords?.lat ?? 40.7128;
      const lng = originCoords?.lng ?? -74.006;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: any = L.map(mapContainerRef.current, { center: [lat, lng], zoom: 10, zoomControl: false });
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      return () => {
        map.remove();
        mapRef.current = null;
        heatLegendRef.current = null;
      };
    } catch (err) {
      console.error("Error initializing map:", err);
    }
  }, [originCoords?.lat, originCoords?.lng]);

  // ── Offline detection ─────────────────────────────────────────
  useEffect(() => {
    const onOffline = () => setIsOffline(true);
    const onOnline = () => setIsOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // ── Tile layer ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const layer = isSatellite
      ? L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: "Tiles &copy; Esri", maxZoom: 19 }
        )
      : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        });
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [isSatellite]);

  // ── Routes & markers ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const routeLayers = routeLayersRef.current;
    const markers = markersRef.current;
    routeLayers.forEach((layer) => map.removeLayer(layer));
    routeLayers.clear();
    markers.forEach((marker) => map.removeLayer(marker));
    markers.length = 0;
    heatEmojiMarkersRef.current.forEach((m) => { try { map.removeLayer(m); } catch { /* stale */ } });
    heatEmojiMarkersRef.current = [];

    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const linePoints = route.waypoints.map((wp) => ({
        lat: wp.lat,
        lng: wp.lng,
        temperature: wp.temperature ?? 0,
      }));
      const routeLine = createGradientRouteLine(linePoints, isSelected, { routeWidth: isSelected ? 5 : 3 });
      routeLine.addTo(map);
      routeLine.on("click", () => setSelectedRouteId(route.id));
      routeLayers.set(route.id, routeLine);

      const originWp = route.waypoints[0];
      const destWp = route.waypoints[route.waypoints.length - 1];
      markers.push(
        L.marker([originWp.lat, originWp.lng], {
          icon: L.divIcon({
            html: '<div style="width:14px;height:14px;background:#0EA472;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>',
            className: "custom-marker",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        }).addTo(map),
        L.marker([destWp.lat, destWp.lng], {
          icon: L.divIcon({
            html: '<div style="width:14px;height:14px;background:#F97316;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2)"></div>',
            className: "custom-marker",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        }).addTo(map)
      );
      if (isSelected) {
        const latLngs = route.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);
        if (latLngs.length > 0)
          map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24] });
      }
    });

    return () => {
      routeLayers.forEach((layer) => map.removeLayer(layer));
      markers.forEach((marker) => map.removeLayer(marker));
    };
  }, [routes, selectedRouteId]);

  // ── Departure gradient: re-color selected route by selected hour ──
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (deptGradientRef.current) {
      try { map.removeLayer(deptGradientRef.current); } catch { /* stale */ }
      deptGradientRef.current = null;
    }

    const selRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
    if (!selRoute) return;

    const evals = selRoute.evaluations;
    const scoredWithHeat = evals.filter(ev => ev.route_score !== null && ev.heat_data.length > 0);
    const bestEval = scoredWithHeat.length > 0
      ? scoredWithHeat.reduce((a, b) => (a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b)
      : (evals.find(ev => ev.heat_data.length > 0) ?? evals[0] ?? null);

    const activeEval = selectedHourIdx !== null && activeRouteHours[selectedHourIdx]?.departureTime
      ? (evals.find(ev => ev.departure_time === activeRouteHours[selectedHourIdx]!.departureTime) ?? bestEval)
      : bestEval;

    const heatData = activeEval?.heat_data ?? [];
    const waypoints = selRoute.waypoints;
    if (heatData.length === 0 || waypoints.length < 2) return;

    const totalDistM = parseFloat(selRoute.distance) * 1000;

    const pts = [...heatData]
      .filter(p => typeof p.temperature === "number" && p.distance_from_origin_m != null)
      .sort((a, b) => (a.distance_from_origin_m ?? 0) - (b.distance_from_origin_m ?? 0));
    if (pts.length === 0) return;

    function interpTemp(f: number): number {
      const dist = f * totalDistM;
      if (dist <= (pts[0].distance_from_origin_m ?? 0)) return pts[0].temperature as number;
      const last = pts[pts.length - 1];
      if (dist >= (last.distance_from_origin_m ?? totalDistM)) return last.temperature as number;
      for (let j = 1; j < pts.length; j++) {
        const d0 = pts[j - 1].distance_from_origin_m ?? 0;
        const d1 = pts[j].distance_from_origin_m ?? 0;
        if (dist <= d1) {
          const ratio = d1 > d0 ? (dist - d0) / (d1 - d0) : 0;
          return (pts[j - 1].temperature as number) + ((pts[j].temperature as number) - (pts[j - 1].temperature as number)) * ratio;
        }
      }
      return pts[pts.length - 1].temperature as number;
    }

    const group = L.layerGroup();
    for (let i = 0; i < waypoints.length - 1; i++) {
      const f = i / (waypoints.length - 1);
      const temp = interpTemp(f);
      L.polyline(
        [[waypoints[i].lat, waypoints[i].lng], [waypoints[i + 1].lat, waypoints[i + 1].lng]],
        {
          color: heatColorForTemp(temp),
          weight: 5,
          opacity: 0.9,
          lineCap: "butt",
          lineJoin: "round",
          interactive: false,
          bubblingMouseEvents: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
      ).addTo(group);
    }
    group.addTo(map);
    deptGradientRef.current = group;

    return () => {
      try { map.removeLayer(group); } catch { /* stale */ }
      deptGradientRef.current = null;
    };
  }, [routes, selectedRouteId, selectedHourIdx, activeRouteHours]);

  // ── Heat emoji markers (re-render on departure change) ────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    heatEmojiMarkersRef.current.forEach((m) => { try { map.removeLayer(m); } catch { /* stale */ } });
    heatEmojiMarkersRef.current = [];

    const selRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
    if (!selRoute) return;

    const evals = selRoute.evaluations;
    const scoredWithHeat = evals.filter(ev => ev.route_score !== null && ev.heat_data.length > 0);
    const bestEval = scoredWithHeat.length > 0
      ? scoredWithHeat.reduce((a, b) => (a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b)
      : (evals.find(ev => ev.heat_data.length > 0) ?? evals[0] ?? null);

    // Use selected departure's eval when one is picked, else best
    const activeEvalForEmoji = selectedHourIdx !== null && activeRouteHours[selectedHourIdx]?.departureTime
      ? (evals.find(ev => ev.departure_time === activeRouteHours[selectedHourIdx]!.departureTime) ?? bestEval)
      : bestEval;

    for (const p of (activeEvalForEmoji?.heat_data ?? [])) {
      const safeTemp = typeof p.temperature === "number" && isFinite(p.temperature) ? p.temperature : null;
      const emoji = safeTemp !== null ? heatEmoji(safeTemp) : "🌡️";
      const { label: condLabel, tip } = riskInfo(safeTemp, p.risk_level || undefined);
      const etaLabel = p.eta ? formatEtaFromIso(p.eta) : null;
      const iconHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="background:rgba(255,255,255,0.93);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,0.12);box-shadow:0 1px 5px rgba(0,0,0,0.25);font-size:15px;cursor:pointer;">${emoji}</div>
        ${etaLabel ? `<div style="background:rgba(28,25,23,0.82);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:99px;white-space:nowrap;letter-spacing:0.02em;line-height:14px;">${etaLabel}</div>` : ""}
      </div>`;
      const dispTemp = safeTemp !== null ? (unitF ? Math.round(safeTemp * 9 / 5 + 32) : Math.round(safeTemp)) : null;
      const tempUnit = unitF ? "°F" : "°C";
      const tempLine = dispTemp !== null ? `<span class="heat-tip-temp">${dispTemp}${tempUnit}</span>` : "";
      const etaLine = etaLabel ? `<div style="margin-top:5px;font-size:10px;color:#a0c8e8;font-weight:600;">Arrives at ${etaLabel}</div>` : "";
      const tooltipHtml = `<div class="heat-tip-inner"><strong>${emoji} ${condLabel}</strong>${tempLine}<div class="heat-tip-desc">${tip}</div>${etaLine}</div>`;
      const m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          html: iconHtml,
          className: "custom-marker",
          iconSize: [26, 40],
          iconAnchor: [13, 8],
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m as any).bindTooltip(tooltipHtml, {
        direction: "top", offset: [0, -16], className: "heat-emoji-tooltip", sticky: false,
      });
      m.addTo(map);
      heatEmojiMarkersRef.current.push(m);
    }

    return () => {
      heatEmojiMarkersRef.current.forEach((m) => { try { map.removeLayer(m); } catch { /* stale */ } });
      heatEmojiMarkersRef.current = [];
    };
  }, [routes, selectedRouteId, selectedHourIdx, activeRouteHours, unitF]);

  // ── Heat glow ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedRouteData) return;
    const map = mapRef.current;
    heatGlowLayersRef.current.forEach((layer) => map.removeLayer(layer));
    heatGlowLayersRef.current.clear();

    const tempsKnown =
      selectedRouteData.waypoints.length > 1 &&
      selectedRouteData.waypoints.every((wp) => typeof wp.temperature === "number");
    if (!tempsKnown) return;

    let shift = 0;
    if (departureHover) shift = Math.round((departureHover.tempValue - 34) * 0.8);
    const points = selectedRouteData.waypoints.map((wp) => ({
      lat: wp.lat,
      lng: wp.lng,
      temperature: Math.round(Math.min(48, Math.max(22, (wp.temperature as number) + shift)) * 10) / 10,
    }));
    const layer = createHeatGradientLayer(points, {
      segmentLength: 25,
      glowWidth: 14,
      glowOpacity: heatmapVisible ? 0.5 : 0,
      routeWidth: 5,
    });
    if (!layer) return;
    layer.addTo(map);
    heatGlowLayersRef.current.set(selectedRouteData.id, layer);
  }, [selectedRouteId, heatmapVisible, routes, departureHover, selectedRouteData]);

  // ── Cooling stop markers ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    coolingStopMarkersRef.current.forEach(m => { try { map.removeLayer(m); } catch { /* stale */ } });
    coolingStopMarkersRef.current = [];

    const stops = recommendation?.cooling_stops ?? [];
    for (const stop of stops) {
      if (stop.lat == null || stop.lon == null) continue;
      const nameTrunc = stop.name.length > 14 ? stop.name.slice(0, 13) + "…" : stop.name;
      const iconHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
        <div style="background:#06B6D4;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 6px rgba(6,182,212,0.45);font-size:13px;">🧊</div>
        <div style="background:rgba(6,182,212,0.88);color:#fff;font-size:8px;font-weight:700;padding:1px 5px;border-radius:99px;white-space:nowrap;max-width:84px;overflow:hidden;text-overflow:ellipsis;">${nameTrunc}</div>
      </div>`;
      const m = L.marker([stop.lat, stop.lon], {
        icon: L.divIcon({ html: iconHtml, className: "custom-marker", iconSize: [26, 46], iconAnchor: [13, 8] }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m as any).bindTooltip(stop.message || stop.name, {
        direction: "top", offset: [0, -16], className: "heat-emoji-tooltip", sticky: false,
      });
      m.addTo(map);
      coolingStopMarkersRef.current.push(m);
    }

    return () => {
      coolingStopMarkersRef.current.forEach(m => { try { map.removeLayer(m); } catch { /* stale */ } });
      coolingStopMarkersRef.current = [];
    };
  }, [recommendation?.cooling_stops]);

  // ── Rain layer ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (rainLayerRef.current) {
      try { map.removeLayer(rainLayerRef.current); } catch { /* stale */ }
      rainLayerRef.current = null;
    }
    if (!rainVisible) return;

    const selRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
    if (!selRoute) return;
    const evals = selRoute.evaluations;
    const scoredWithHeat = evals.filter(ev => ev.route_score !== null && ev.heat_data.length > 0);
    const bestEval = scoredWithHeat.length > 0
      ? scoredWithHeat.reduce((a, b) => (a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b)
      : (evals.find(ev => ev.heat_data.length > 0) ?? evals[0] ?? null);
    const activeEval = selectedHourIdx !== null && activeRouteHours[selectedHourIdx]?.departureTime
      ? (evals.find(ev => ev.departure_time === activeRouteHours[selectedHourIdx]!.departureTime) ?? bestEval)
      : bestEval;
    const heatData = activeEval?.heat_data ?? [];

    const group = L.layerGroup();
    for (const p of heatData) {
      const prob = p.precipitation_probability;
      const mm = p.precipitation_mm;
      if ((prob == null || prob < 5) && (mm == null || mm < 0.1)) continue;
      const intensity = prob != null ? prob / 100 : Math.min(1, (mm ?? 0) / 5);
      const blueVal = Math.round(100 + intensity * 155);
      const color = `rgba(30,${Math.round(80 + intensity * 30)},${blueVal},0.85)`;
      const size = Math.round(14 + intensity * 14);
      const label = prob != null ? `${Math.round(prob)}%` : `${(mm ?? 0).toFixed(1)}mm`;
      const iconHtml = `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid rgba(30,80,200,0.4);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 5px rgba(30,80,200,0.3);font-size:9px;font-weight:700;color:#fff;line-height:1;">${label}</div>`;
      // Anchor so rain circle floats above the heat emoji (heat iconAnchor[1]=8, so top of heat is ~8px above point)
      const m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ html: iconHtml, className: "custom-marker", iconSize: [size, size], iconAnchor: [Math.round(size / 2), size + 12] }),
      });
      m.addTo(group);
    }
    group.addTo(map);
    rainLayerRef.current = group;
    return () => {
      try { map.removeLayer(group); } catch { /* stale */ }
      rainLayerRef.current = null;
    };
  }, [routes, selectedRouteId, selectedHourIdx, activeRouteHours, rainVisible]);

  // ── Wind layer ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (windLayerRef.current) {
      try { map.removeLayer(windLayerRef.current); } catch { /* stale */ }
      windLayerRef.current = null;
    }
    if (!windVisible) return;

    const selRoute = routes.find(r => r.id === selectedRouteId) ?? routes[0];
    if (!selRoute) return;
    const evals = selRoute.evaluations;
    const scoredWithHeat = evals.filter(ev => ev.route_score !== null && ev.heat_data.length > 0);
    const bestEval = scoredWithHeat.length > 0
      ? scoredWithHeat.reduce((a, b) => (a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b)
      : (evals.find(ev => ev.heat_data.length > 0) ?? evals[0] ?? null);
    const activeEval = selectedHourIdx !== null && activeRouteHours[selectedHourIdx]?.departureTime
      ? (evals.find(ev => ev.departure_time === activeRouteHours[selectedHourIdx]!.departureTime) ?? bestEval)
      : bestEval;
    const heatData = activeEval?.heat_data ?? [];

    const group = L.layerGroup();
    for (const p of heatData) {
      if (p.wind_speed_ms == null) continue;
      const kmh = p.wind_speed_ms * 3.6;
      const color = kmh >= 30 ? "#1e3a8a" : kmh >= 15 ? "#3b82f6" : "#93c5fd";
      const label = `${Math.round(kmh)}`;
      const iconHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;"><div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:5px solid ${color};"></div><div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:3px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 4px rgba(30,58,138,0.3);line-height:1.3;">${label}<span style="font-size:8px;opacity:0.85"> km/h</span></div></div>`;
      // Anchor so wind badge floats below the heat emoji (heat bottom is ~32px below point, so place wind top at ~36px below)
      const m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ html: iconHtml, className: "custom-marker", iconSize: [52, 28], iconAnchor: [26, -36] }),
      });
      m.addTo(group);
    }
    group.addTo(map);
    windLayerRef.current = group;
    return () => {
      try { map.removeLayer(group); } catch { /* stale */ }
      windLayerRef.current = null;
    };
  }, [routes, selectedRouteId, selectedHourIdx, activeRouteHours, windVisible]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleStopSelect = (stop: MapStop) => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedStopMarkerRef.current) {
      map.removeLayer(selectedStopMarkerRef.current);
      selectedStopMarkerRef.current = null;
    }
    selectedStopMarkerRef.current = L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({
        html: `<div style="position:relative"><div class="stop-pulse-ring"></div><div class="stop-pin-label">${stop.name}</div><div style="width:14px;height:14px;background:#F97316;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(249,115,22,0.4);position:relative;z-index:1"></div></div>`,
        className: "custom-marker",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    }).addTo(map);
    map.flyTo([stop.lat, stop.lng], 12, { duration: 1.2 });
  };

  const handleCenter = () => {
    if (mapRef.current && selectedRouteData) {
      const latLngs = selectedRouteData.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);
      if (latLngs.length > 0)
        mapRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24] });
    }
  };

  const handlePoiClick = (poi: AnalyzePoi, emoji: string, poiKey: string) => {
    const map = mapRef.current;
    if (!map || poi.lat == null || poi.lon == null) return;
    if (poiMarkerRef.current) {
      map.removeLayer(poiMarkerRef.current);
      poiMarkerRef.current = null;
    }
    if (selectedPoiId === poiKey) {
      setSelectedPoiId(null);
      return;
    }
    setSelectedPoiId(poiKey);
    mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const iconHtml = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="background:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid #F97316;box-shadow:0 2px 8px rgba(249,115,22,0.35);font-size:17px;">${emoji}</div>
      <div style="background:#1C1917;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:99px;white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;">${poi.name || emoji}</div>
    </div>`;
    poiMarkerRef.current = L.marker([poi.lat, poi.lon], {
      icon: L.divIcon({ html: iconHtml, className: "custom-marker", iconSize: [30, 48], iconAnchor: [15, 10] }),
    }).addTo(map);
    map.flyTo([poi.lat, poi.lon], 14, { duration: 1.0 });
  };

  const handleToggleRain = () => setRainVisible(v => !v);
  const handleToggleWind = () => setWindVisible(v => !v);

  const handleToggleHeatmap = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (heatmapVisible) {
      heatGlowLayersRef.current.forEach((layer) => map.removeLayer(layer));
      if (heatLegendRef.current) {
        try { (heatLegendRef.current as unknown as { remove(): void }).remove(); } catch { /* noop */ }
        heatLegendRef.current = null;
      }
    } else {
      if (selectedRouteData) {
        const tempsKnown =
          selectedRouteData.waypoints.length > 1 &&
          selectedRouteData.waypoints.every((wp) => typeof wp.temperature === "number");
        if (tempsKnown) {
          const points = selectedRouteData.waypoints.map((wp) => ({
            lat: wp.lat,
            lng: wp.lng,
            temperature: wp.temperature as number,
          }));
          const layer = createHeatGradientLayer(points, {
            segmentLength: 25,
            glowWidth: 14,
            glowOpacity: 0.5,
            routeWidth: 5,
          });
          if (layer) {
            layer.addTo(map);
            heatGlowLayersRef.current.set(selectedRouteData.id, layer);
          }
        }
      }
    }
    setHeatmapVisible((v) => !v);
  };

  // ── Route options ─────────────────────────────────────────────
  const routeOptions: RouteOption[] = routes.map((route, idx) => {
    const bestEv = [...route.evaluations]
      .filter(ev => ev.route_score !== null)
      .sort((a, b) => (a.route_score ?? Infinity) - (b.route_score ?? Infinity))[0]
      ?? route.evaluations[0];
    return {
      id: route.id,
      name: route.name,
      description: "",
      label: computeRouteLabel(route.id, idx, routes.length, recommendedRouteId),
      duration: route.duration,
      distance: route.distance,
      temperature: route.temperature,
      heatRisk: route.heatRisk,
      color:
        route.id === recommendedRouteId || (idx === 0 && !recommendedRouteId)
          ? "#F97316"
          : idx === 1
          ? "#0EA472"
          : "#D4A000",
      weatherScore: bestEv?.weather_score ?? null,
      timeScore: bestEv?.time_score ?? null,
    };
  });
  routeOptions.forEach((opt) => {
    opt.description = computeRouteDescription(opt, routeOptions, recommendedRouteId);
  });

  const selectedRouteOption = routeOptions.find((r) => r.id === selectedRouteId);

  // Keep dock POI state (used for stop markers)
  const segmentPois: AnalyzePoi[] = (selectedRouteData?.segments ?? []).flatMap((seg) =>
    (seg.pois ?? []).map((poi) => ({
      ...poi,
      address: [
        seg.distance_from_origin_m != null
          ? `${(seg.distance_from_origin_m / 1000).toFixed(1)} km along route`
          : null,
        poi.address,
      ]
        .filter(Boolean)
        .join(" · "),
    }))
  );
  const _dockPois = segmentPois.length > 0 ? segmentPois : selectedRouteData?.pois ?? [];

  // ── Along-the-way points ──────────────────────────────────────
  const evals = selectedRouteData?.evaluations ?? [];
  const scoredWithHeat = evals.filter(ev => ev.route_score !== null && (ev.heat_data?.length ?? 0) > 0);
  const defaultBestEval = scoredWithHeat.length > 0
    ? scoredWithHeat.reduce((a, b) => (a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b)
    : (evals.find(ev => (ev.heat_data?.length ?? 0) > 0) ?? evals[0] ?? null);
  // When user taps a departure bar, use that hour's evaluation
  const selectedHourEval = selectedHourIdx !== null && activeRouteHours[selectedHourIdx]?.departureTime
    ? (evals.find(ev => ev.departure_time === activeRouteHours[selectedHourIdx]!.departureTime) ?? null)
    : null;
  const bestEvalForPoints = selectedHourEval ?? defaultBestEval;
  const allHeatPoints = bestEvalForPoints?.heat_data ?? [];
  const alongTheWayPoints = (() => {
    if (allHeatPoints.length === 0) return [];
    const count = Math.min(6, allHeatPoints.length);
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / Math.max(1, count - 1)) * (allHeatPoints.length - 1));
      return allHeatPoints[idx];
    });
  })();

  // ── AI chat context summary ───────────────────────────────────
  const routeContextSummary = (() => {
    const metrics = bestEvalForPoints?.risk?.metrics;
    const bestDep = activeRouteHours.find(d => d.isBest);

    // Full departure schedule: every hour with temp + risk + comfort score
    const availableLabels = activeRouteHours.map(d => d.label);
    const departureSchedule = activeRouteHours.length
      ? `AVAILABLE departure hours (ONLY these times were analyzed — no data exists for any other time): ${availableLabels.join(", ")}.\n` +
        "Departure details: " +
        activeRouteHours.map(d =>
          `${d.label} → ${d.tempValue}°C, ${d.risk} risk, comfort ${comfortScore(d)}/100${d.isBest ? " (BEST)" : ""}`
        ).join("; ") + ".\n" +
        "RULE: If the user asks about a departure time NOT in the list above, explicitly say that time was not analyzed and is not available — do not estimate or guess."
      : "No departure time data available.";

    // Sample up to 8 evenly-spaced heat waypoints with real km/temp/index
    const heatSample = (() => {
      if (allHeatPoints.length === 0) return "";
      const count = Math.min(8, allHeatPoints.length);
      const pts = Array.from({ length: count }, (_, i) => {
        const idx = Math.round((i / Math.max(1, count - 1)) * (allHeatPoints.length - 1));
        const p = allHeatPoints[idx];
        const km = p.distance_from_origin_m != null
          ? `km ${(p.distance_from_origin_m / 1000).toFixed(0)}`
          : (p.name ?? `waypoint ${idx + 1}`);
        return `${km}: ${p.temperature.toFixed(0)}°C, heat index ${p.heat_index.toFixed(0)}°C, ${p.risk_level}`;
      });
      return "Heat data along route: " + pts.join("; ") + ".";
    })();

    // All POI stops (name + type + distance if available)
    const stopsList = _dockPois.length
      ? "Stops along the route: " +
        _dockPois.slice(0, 12).map(p => {
          const dist = p.distance != null
            ? ` (${p.distance < 1000 ? Math.round(p.distance) + "m" : (p.distance / 1000).toFixed(1) + "km"} from road)`
            : "";
          return `${p.name || p.type}${dist}`;
        }).join(", ") + "."
      : "";

    const parts: string[] = [
      `ROUTE ANALYSIS DATA — use these exact numbers in every answer:`,
      `Route: ${origin} → ${destination}.`,
      passengerTypes.length
        ? `Traveling with: ${passengerTypes.join(", ")}. Tailor stop advice accordingly.`
        : "",
      selectedRouteData
        ? `Distance: ${selectedRouteData.distance}. Duration: ${selectedRouteData.duration}.`
        : "",
      recommendation
        ? `AI Decision: ${recommendation.decision}. Reason: ${recommendation.reason}`
        : "",
      recommendation?.key_factors?.length
        ? `Key risk factors: ${recommendation.key_factors.join("; ")}.`
        : "",
      recommendation?.safety_tip
        ? `Safety tip: ${recommendation.safety_tip}`
        : "",
      bestDep
        ? `Best departure: ${bestDep.label} (${bestDep.tempValue}°C, ${bestDep.risk} risk, comfort score ${comfortScore(bestDep)}/100).`
        : "",
      metrics
        ? `Peak conditions: max ${metrics.max_temperature ?? "?"}°C, heat index ${metrics.max_heat_index ?? "?"}°C, humidity ${metrics.max_humidity ?? "?"}%, AQI ${metrics.max_aqi ?? "?"}.`
        : "",
      departureSchedule,
      heatSample,
      recommendation?.cooling_stops?.length
        ? "AI cooling stops: " + recommendation.cooling_stops.map(s =>
            `${s.name} at ${s.distance_km.toFixed(0)} km${s.eta_time ? ", ETA " + fmtTime(s.eta_time) : ""}${s.message ? " — " + s.message : ""}`
          ).join("; ") + "."
        : "",
      recommendation?.alerts?.length
        ? "Critical alerts: " + recommendation.alerts.map(a =>
            `${a.message} (km ${a.distance_km?.toFixed(0) ?? "?"}, ${a.temperature?.toFixed(0) ?? "?"}°C)`
          ).join("; ") + "."
        : "",
      stopsList,
    ];
    return parts.filter(Boolean).join("\n");
  })();

  // ── Watch-out items ───────────────────────────────────────────
  function alertStyle(riskLevel: string): { bg: string; color: string } {
    const lvl = riskLevel.toLowerCase();
    if (lvl.includes("extreme") || lvl.includes("critical") || lvl.includes("high"))
      return { bg: "rgba(239,68,68,0.08)", color: "#991B1B" };
    if (lvl.includes("medium") || lvl.includes("moderate"))
      return { bg: "rgba(249,115,22,0.08)", color: "#92400E" };
    if (lvl.includes("low"))
      return { bg: "rgba(212,160,0,0.08)", color: "#713F12" };
    return { bg: "#FAF8F2", color: "#44403C" };
  }

  const critSegsForAlert = bestEvalForPoints?.risk?.critical_segments ?? [];
  const riskMetrics = bestEvalForPoints?.risk?.metrics;
  const riskLevel = bestEvalForPoints?.risk?.level ?? "";

  const watchOutItems: Array<{ title: string; body: string; bg: string; color: string }> = [];

  // 1. API alerts (highest priority)
  (recommendation?.alerts ?? []).forEach((a) => {
    watchOutItems.push({
      title: a.message,
      body: [
        a.temperature > 0 && `${Math.round(a.temperature * 9 / 5 + 32)}°F`,
        a.risk_score > 0 && `Risk score ${a.risk_score}/100`,
        a.distance_km > 0 && `${a.distance_km.toFixed(0)} km from start`,
        a.eta_time && `ETA ${fmtTime(a.eta_time)}`,
      ].filter(Boolean).join(" · "),
      ...alertStyle(a.risk_level),
    });
  });

  // 2. Heat data notice
  if (heatWarning) {
    watchOutItems.push({ title: "Heat data notice", body: heatWarning, bg: "rgba(212,160,0,0.08)", color: "#713F12" });
  }

  // 3. Smart fallbacks from route data when no API alerts
  if (watchOutItems.length === 0) {
    // Critical segments
    if (critSegsForAlert.length > 0) {
      const worst = critSegsForAlert.reduce((a, b) => a.risk_score >= b.risk_score ? a : b);
      watchOutItems.push({
        title: `${critSegsForAlert.length} critical heat zone${critSegsForAlert.length > 1 ? "s" : ""} on this route`,
        body: `Worst segment: ${worst.risk_level.replace(/_/g, " ")} · risk score ${worst.risk_score}/100`,
        ...alertStyle(worst.risk_level),
      });
    }

    // Peak temperature
    const maxTemp = riskMetrics?.max_temperature
      ?? (allHeatPoints.length > 0 ? Math.max(...allHeatPoints.map(p => p.temperature)) : null);
    if (maxTemp != null && maxTemp > 32) {
      watchOutItems.push({
        title: `Peak temperature ${maxTemp.toFixed(0)}°C along route`,
        body: maxTemp > 40
          ? "Extreme heat. Plan cooling stops and off-peak departure."
          : "High heat expected. Stay hydrated and monitor crew.",
        ...alertStyle(maxTemp > 40 ? "high" : "medium"),
      });
    }

    // AQI concern
    const maxAqi = riskMetrics?.max_aqi
      ?? (allHeatPoints.length > 0 ? Math.max(...allHeatPoints.map(p => p.aqi ?? 0)) : null);
    if (maxAqi != null && maxAqi > 100) {
      watchOutItems.push({
        title: `Air quality concern: AQI ${maxAqi.toFixed(0)}`,
        body: maxAqi > 150 ? "Unhealthy air quality. Limit crew exposure during stops." : "Moderate air quality risk along route.",
        ...alertStyle(maxAqi > 150 ? "high" : "medium"),
      });
    }

    // Heat index vs temperature gap
    const maxHeatIndex = riskMetrics?.max_heat_index;
    if (maxTemp != null && maxHeatIndex != null && maxHeatIndex - maxTemp > 5) {
      watchOutItems.push({
        title: `Feels like ${maxHeatIndex.toFixed(0)}°C (+${(maxHeatIndex - maxTemp).toFixed(0)}° above air temp)`,
        body: "Humidity amplifies heat stress. Factor heat index into crew safety planning.",
        ...alertStyle(maxHeatIndex > 42 ? "high" : "medium"),
      });
    }

    // All clear
    if (watchOutItems.length === 0) {
      const lvlText = riskLevel ? riskLevel.replace(/_/g, " ") : "low";
      watchOutItems.push({
        title: "No significant heat alerts",
        body: `Overall risk: ${lvlText}. Conditions look safe for this departure window.`,
        bg: "#F0FDF4",
        color: "#166534",
      });
    }
  }

  // ── Departure / Arrival labels ────────────────────────────────
  // Best departure card always uses the best departure's own evaluation duration
  const bestDepartureEval = evals.find(ev => ev.departure_time === bestDeparture?.departureTime) ?? defaultBestEval;
  const bestDepartureDurationMin = bestDepartureEval?.duration_min ?? null;
  const heroDurationMin = bestDepartureDurationMin != null
    ? bestDepartureDurationMin
    : (selectedRouteOption ? parseDurationMin(selectedRouteOption.duration) : 0);
  const heroDurationLabel = bestDepartureDurationMin != null
    ? fmtDuration(bestDepartureDurationMin)
    : (selectedRouteOption?.duration ?? "--");
  const heroArrivalLabel = bestDeparture ? addMinutesToLabel(bestDeparture.label, heroDurationMin) : "--";

  // Selected hour (for other parts of the UI)
  const evalDurationMin = bestEvalForPoints?.duration_min ?? null;
  const durationMin = evalDurationMin != null ? evalDurationMin : (selectedRouteOption ? parseDurationMin(selectedRouteOption.duration) : 0);
  const durationLabel = evalDurationMin != null
    ? fmtDuration(evalDurationMin)
    : (selectedRouteOption?.duration ?? "--");
  const activeDeparture = selectedHourIdx !== null ? (activeRouteHours[selectedHourIdx] ?? bestDeparture) : bestDeparture;
  const departureLabel = activeDeparture?.label ?? "--";
  const arrivalLabel = activeDeparture ? addMinutesToLabel(activeDeparture.label, durationMin) : "--";

  // ── Hero pills (all fixed to best departure, never change on selection) ──
  const heroPills = [
    { k: "Arrive",    v: heroArrivalLabel },
    { k: "Duration",  v: heroDurationLabel },
    { k: "Peak temp", v: bestDepartureEval?.risk?.metrics?.max_temperature != null ? displayTemp(bestDepartureEval.risk.metrics.max_temperature, unitF) : (selectedRouteOption ? displayTemp(parseTemp(selectedRouteOption.temperature), unitF) : "--") },
    { k: "Rain risk", v: (() => {
        const pts = bestDepartureEval?.heat_data ?? [];
        const withProb = pts.filter(p => p.precipitation_probability != null);
        if (withProb.length > 0) {
          const avg = withProb.reduce((s, p) => s + (p.precipitation_probability ?? 0), 0) / withProb.length;
          return `${Math.round(avg)}%`;
        }
        const withMm = pts.filter(p => p.precipitation_mm != null);
        if (withMm.length === 0) return "--";
        const avgMm = withMm.reduce((s, p) => s + (p.precipitation_mm ?? 0), 0) / withMm.length;
        return `${Math.min(100, Math.round(avgMm * 5))}%`;
      })() },
  ];

  // ── Trip summary rows ─────────────────────────────────────────
  const tripSummaryRows: Array<{ label: string; value: string; color?: string; chip?: boolean }> = [
    { label: "Departure",      value: departureLabel },
    { label: "Arrival",        value: arrivalLabel },
    { label: "Duration",       value: durationLabel },
    { label: "Distance",       value: selectedRouteOption?.distance ?? "--" },
    {
      label: "Peak temp",
      value: bestEvalForPoints?.risk?.metrics?.max_temperature != null
        ? displayTemp(bestEvalForPoints.risk.metrics.max_temperature, unitF)
        : (selectedRouteOption ? displayTemp(parseTemp(selectedRouteOption.temperature), unitF) : "--"),
      color: bestEvalForPoints?.risk?.metrics?.max_temperature != null
        ? heatInkForTemp(bestEvalForPoints.risk.metrics.max_temperature)
        : (selectedRouteOption ? heatInkForTemp(parseTemp(selectedRouteOption.temperature)) : undefined),
    },
    { label: "Exposure rating", value: selectedRouteOption?.heatRisk ?? "--", chip: true },
  ];
  const bestMetrics = bestEvalForPoints?.risk?.metrics;
  if (bestMetrics?.max_heat_index && bestMetrics.max_heat_index > 0) {
    tripSummaryRows.push({
      label: "Max feels-like",
      value: displayTemp(bestMetrics.max_heat_index, unitF),
      color: heatInkForTemp(bestMetrics.max_heat_index),
    });
  }
  if (bestMetrics?.max_aqi && bestMetrics.max_aqi > 0) {
    const aqiColor = bestMetrics.max_aqi > 150 ? "#B91C1C" : bestMetrics.max_aqi > 100 ? "#C2410C" : bestMetrics.max_aqi > 50 ? "#92400E" : "#166534";
    tripSummaryRows.push({ label: "Max AQI", value: String(Math.round(bestMetrics.max_aqi)), color: aqiColor });
  }

  // ── Departure timeline best label ─────────────────────────────
  const bestDeptHour = activeRouteHours.find(h => h.isBest) ?? bestDeparture;
  const windowNote = bestDeptHour
    ? `Best window at ${bestDeptHour.label} · ${bestDeptHour.tempValue}°C avg heat exposure`
    : `${departureRangeHours}h window · ${stepMinutes} min steps`;

  // ── Departure insight: "also good" and delta vs best ─────────────
  const bestTemp = bestDeptHour?.tempValue ?? null;
  // Hours within 2°C of best (but not the best itself) are "also good"
  const alsoGoodHours = bestTemp !== null
    ? activeRouteHours.filter(h => !h.isBest && h.tempValue <= bestTemp + 2)
    : [];
  const selectedHour = selectedHourIdx !== null ? (activeRouteHours[selectedHourIdx] ?? null) : null;
  const selectedIsNonBest = selectedHour !== null && !selectedHour.isBest;
  const selectedDeltaC = (selectedHour && bestTemp !== null)
    ? selectedHour.tempValue - bestTemp
    : null;

  // ── Detail table rows ─────────────────────────────────────────
  const detailTableRows = alongTheWayPoints.map((point, i) => {
    const rawTemp = typeof point.temperature === "number" ? point.temperature : null;
    const distKm = point.distance_from_origin_m != null ? (point.distance_from_origin_m / 1000).toFixed(1) : null;

    // Prefer server-computed ETA, fall back to proportion math
    const eta = (() => {
      if (point.eta) return formatEtaFromIso(point.eta);
      const proportion = (() => {
        if (point.distance_from_origin_m == null || !selectedRouteOption)
          return i / Math.max(1, alongTheWayPoints.length - 1);
        const totalM = parseFloat(selectedRouteOption.distance) * 1000;
        return Math.min(1, point.distance_from_origin_m / Math.max(1, totalM));
      })();
      const minutesIn = Math.round(proportion * parseDurationMin(selectedRouteOption?.duration ?? "0 min"));
      return bestDeparture ? addMinutesToLabel(bestDeparture.label, minutesIn) : `+${minutesIn}m`;
    })();

    const heatIndexVal = typeof point.heat_index === "number" ? point.heat_index : null;
    const exposurePct = rawTemp != null ? Math.round(Math.min(100, Math.max(0, (rawTemp - 20) / 20 * 100))) : null;
    return {
      eta,
      name: point.name || (distKm ? `At ${distKm} km` : `Point ${i + 1}`),
      km: distKm ? `${distKm} km from origin` : "",
      rawTemp,
      temp: rawTemp != null ? displayTemp(rawTemp, unitF) : "--",
      feelsLike: heatIndexVal != null && rawTemp != null && Math.abs(heatIndexVal - rawTemp) >= 1 ? displayTemp(heatIndexVal, unitF) : null,
      condition: riskInfo(rawTemp, point.risk_level || undefined).tip,
      rain: point.precipitation_probability != null
        ? `${Math.round(point.precipitation_probability)}%`
        : point.precipitation_mm != null
          ? `${point.precipitation_mm.toFixed(1)} mm`
          : "--",
      wind: point.wind_speed_ms != null
        ? `${Math.round(point.wind_speed_ms * 3.6)} km/h`
        : "--",
      uv: point.uv_index != null ? String(Math.round(point.uv_index)) : "--",
      exposurePct,
      precip: point.precipitation_mm != null ? `${point.precipitation_mm.toFixed(1)} mm` : null,
    };
  });

  // ── Advice cards ─────────────────────────────────────────────
  const midPoint = alongTheWayPoints[Math.floor(alongTheWayPoints.length / 2)];
  const midTemp = typeof midPoint?.temperature === "number" ? midPoint.temperature : null;
  const adviceCards = [
    {
      tag: "Hydration",
      title: "Stop at the halfway point",
      body: `Around ${Math.round(parseDurationMin(selectedRouteOption?.duration ?? "0 min") / 2)} minutes in${midTemp ? `, where it reaches ${displayTemp(midTemp, unitF)}` : ""}. Plan a break and carry enough water.`,
    },
    {
      tag: "Timing",
      title: bestDeparture ? `${bestDeparture.label} is your sweet spot` : "Depart early",
      body: recommendation?.reason ?? `Leaving at ${bestDeparture?.label ?? "the best hour"} avoids peak afternoon heat. Every hour later increases exposure significantly.`,
    },
    {
      tag: "Best combo",
      title: selectedRouteOption
        ? `${selectedRouteOption.label === "RECOMMENDED" ? "Recommended" : selectedRouteOption.label} at ${bestDeparture?.label ?? "--"}`
        : "Optimal plan",
      body: `Comfort score ${bestDeparture ? comfortScore(bestDeparture) : "--"}: the highest-scoring combination of route and departure hour.`,
    },
  ];

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F2", fontFamily: "var(--font-body)", color: "#1C1917" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 40, height: 64,
          background: "rgba(250,248,242,0.92)", backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid #EBE8E3",
          display: "flex", alignItems: "center", gap: 16, padding: "0 28px",
        }}
      >
        {/* Brand */}
        <a
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0, textDecoration: "none" }}
        >
          <img
            src={thermoLogo}
            alt="ThermoDispatch"
            style={{ height: 40, width: "auto", borderRadius: 8, display: "block" }}
          />
        </a>

        {/* Tab navigation */}
        <nav style={{ display: "flex", gap: 3, padding: 4, background: "#F0EDE8", borderRadius: 12, flexShrink: 0 }}>
          {([ ["plan", "Plan"], ["results", "Results"], ["detail", "Along the route"], ["ai", "🔥 AI Report"] ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "plan") { onBack(); return; }
                setActiveTab(tab as "results" | "detail" | "ai");
                if (tab === "results") setTimeout(() => (mapRef.current as unknown as { invalidateSize(): void } | null)?.invalidateSize(), 50);
              }}
              style={{
                padding: "7px 14px", border: "none", borderRadius: 9, cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                background: activeTab === tab
                  ? (tab === "ai" ? "linear-gradient(100deg,#F97316,#EA580C)" : "#fff")
                  : "transparent",
                color: activeTab === tab ? (tab === "ai" ? "#fff" : "#1C1917") : "#6B6560",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(28,25,23,0.10)" : "none",
                transition: "all 120ms",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Trip label */}
        {origin && destination && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 10,
              background: "#F0EDE8",
              fontSize: 13, fontWeight: 600, color: "#44403C",
              flexShrink: 0, letterSpacing: "-0.01em",
            }}
          >
            <span>{cityName(origin)}</span>
            <span style={{ color: "#F97316", fontSize: 12 }}>→</span>
            <span>{cityName(destination)}</span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* °C / °F toggle */}
        <div style={{ display: "flex", gap: 3, padding: 4, background: "#F0EDE8", borderRadius: 10, flexShrink: 0 }}>
          {(["°C", "°F"] as const).map((u) => {
            const isActive = unitF ? u === "°F" : u === "°C";
            return (
              <button
                key={u}
                onClick={() => setUnitF(u === "°F")}
                style={{
                  padding: "4px 10px", border: "none", borderRadius: 7, cursor: "pointer",
                  fontFamily: "monospace", fontSize: 12, fontWeight: 500,
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? "#F97316" : "#6B6560",
                  boxShadow: isActive ? "0 1px 3px rgba(28,25,23,0.10)" : "none",
                  transition: "all 120ms",
                }}
              >
                {u}
              </button>
            );
          })}
        </div>

        {/* Routes count badge */}
        {routes.length > 0 && (
          <span
            style={{
              padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, flexShrink: 0,
              background: "rgba(249,115,22,0.08)", color: "#F97316", border: "1px solid rgba(249,115,22,0.2)",
            }}
          >
            {routes.length} route{routes.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Heat toggle */}
        <button
          onClick={handleToggleHeatmap}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 10,
            fontSize: 13, fontWeight: 500, flexShrink: 0, cursor: "pointer", transition: "all 140ms ease",
            border: heatmapVisible ? "1px solid rgba(249,115,22,0.3)" : "1px solid #EBE8E3",
            background: heatmapVisible ? "rgba(249,115,22,0.09)" : "transparent",
            color: heatmapVisible ? "#F97316" : "#6B6560",
          }}
        >
          <Thermometer style={{ width: 14, height: 14 }} />
          Heat
        </button>

        {/* Plan new route */}
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10,
            fontSize: 13, fontWeight: 500, border: "1px solid #EBE8E3", background: "transparent",
            color: "#6B6560", cursor: "pointer", flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#F97316"; (e.currentTarget as HTMLButtonElement).style.color = "#F97316"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#EBE8E3"; (e.currentTarget as HTMLButtonElement).style.color = "#6B6560"; }}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} />
          Plan New Route
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 1560, margin: "0 auto", padding: "24px 28px 72px",
          display: "flex", flexDirection: "column", gap: 24,
        }}
      >
        {/* ── Results tab: two-column grid ───────────────────── */}
        <div
          style={{
            display: activeTab === "results" ? "grid" : "none",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)",
            gap: 22,
            alignItems: "start",
          }}
        >
            {/* ── LEFT COLUMN ───────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>

              {/* 1 ── Best Plan Hero */}
              <section
                style={{
                  borderRadius: 24, padding: "30px 32px",
                  background: "linear-gradient(120deg, #4C1D6B 0%, #6D28A0 55%, #7C3AED 100%)",
                  color: "#fff", position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.72 }}>
                      {`Best plan for ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 56, lineHeight: 1, letterSpacing: "-0.035em" }}>
                        {bestDeparture?.label ?? "--"}
                      </span>
                      {selectedRouteOption && (
                        <span style={{ fontSize: 16, opacity: 0.88 }}>via {selectedRouteOption.name}</span>
                      )}
                    </div>
                    <p style={{ margin: "13px 0 0", fontSize: 15, lineHeight: 1.5, opacity: 0.88, maxWidth: 480 }}>
                      {recommendation?.reason ?? (bestDeparture ? `Departing at ${bestDeparture.label} gives you the best heat comfort score for this route. Waiting until midday significantly increases your heat exposure.` : "Run an analysis to see the optimal departure time for this route.")}
                    </p>
                  </div>

                  {/* Comfort score circle */}
                  <div
                    style={{
                      width: 116, height: 116, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.28)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 34, lineHeight: 1 }}>
                      {bestDeparture ? comfortScore(bestDeparture) : "--"}
                    </span>
                    <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.72, marginTop: 4 }}>
                      Comfort
                    </span>
                  </div>
                </div>

                {/* Pills row */}
                <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
                  {heroPills.map((p) => (
                    <div
                      key={p.k}
                      style={{
                        display: "flex", flexDirection: "column", gap: 2,
                        padding: "10px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.14)",
                      }}
                    >
                      <span style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", opacity: 0.72 }}>{p.k}</span>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600 }}>{p.v}</span>
                    </div>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => {
                      if (recommendedRouteId) setSelectedRouteId(recommendedRouteId);
                      const bestIdx = activeRouteHours.findIndex(h => h.isBest);
                      if (bestIdx >= 0) setSelectedHourIdx(bestIdx);
                      setActiveTab("detail");
                      setTimeout(() => handleCenter(), 100);
                      setPlanApplied(true);
                      setTimeout(() => setPlanApplied(false), 2500);
                    }}
                    style={{
                      alignSelf: "flex-end", padding: "13px 22px", borderRadius: 12, border: "none",
                      background: planApplied ? "rgba(14,164,114,0.9)" : "rgba(255,255,255,0.95)",
                      color: planApplied ? "#fff" : "#6D28A0",
                      fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "background 300ms, color 300ms",
                    }}
                    onMouseEnter={e => { if (!planApplied) e.currentTarget.style.background = "#fff"; }}
                    onMouseLeave={e => { if (!planApplied) e.currentTarget.style.background = "rgba(255,255,255,0.95)"; }}
                  >
                    {planApplied ? "✓ Plan applied" : "Use this plan"}
                  </button>
                </div>
              </section>

              {/* 2 ── Departure Timeline */}
              <section
                style={{
                  background: "#FEFCF8", border: "1px solid #EBE8E3", borderRadius: 24,
                  padding: "26px 28px 22px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", margin: 0, color: "#1C1917" }}>
                      Departure timeline
                    </h2>
                    <p style={{ margin: "5px 0 0", fontSize: 14, color: "#6B6560" }}>
                      Comfort score for each start hour on {selectedRouteOption?.name ?? "route"}. Tap a bar to re-time the trip.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#6B6560" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 22, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#7CC8E8,#FAD675,#F59052,#CC3320)", display: "inline-block" }} />
                      Cool → extreme
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(14,164,114,0.18)", display: "inline-block" }} />
                      Best window
                    </span>
                  </div>
                </div>

                {activeRouteHours.length === 0 ? (
                  <div style={{ height: 190, marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#9A948E" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80, opacity: 0.3 }}>
                      {[40,55,70,85,90,80,65,50,60,75,85,70,55].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "5px 5px 2px 2px", background: "#D4C5A9" }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 13 }}>Run an analysis to see departure hours</span>
                  </div>
                ) : (
                  <>
                    {/* Bar chart */}
                    {(() => {
                      const scores = activeRouteHours.map(h => comfortScore(h));
                      const maxScore = Math.max(...scores, 1);
                      return (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 190, marginTop: 24 }}>
                          {activeRouteHours.map((h, idx) => {
                            const score = scores[idx];
                            const barPct = Math.max(6, Math.round((score / maxScore) * 100));
                            const isBest = !!h.isBest;
                            const isSelected = idx === selectedHourIdx;
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedHourIdx(isSelected ? null : idx)}
                                title={`${h.label}: comfort ${score}, ${h.tempValue}°C`}
                                style={{
                                  flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end",
                                  alignItems: "center", gap: 5, height: "100%", cursor: "pointer",
                                  borderRadius: 10, padding: "4px 0",
                                  background: isBest ? "rgba(14,164,114,0.10)" : isSelected ? "rgba(249,115,22,0.06)" : "transparent",
                                  outline: isSelected ? "2px solid #F97316" : isBest ? "2px solid rgba(14,164,114,0.4)" : "none",
                                  outlineOffset: 1,
                                  transition: "background 150ms",
                                }}
                              >
                                <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: (isBest || isSelected) ? 600 : 400, color: isSelected ? "#F97316" : isBest ? "#0EA472" : "#9A948E" }}>
                                  {score}
                                </span>
                                <div
                                  style={{
                                    width: "100%", maxWidth: 28, height: `${barPct}%`,
                                    borderRadius: "7px 7px 3px 3px",
                                    background: heatColorForTemp(h.tempValue),
                                    opacity: (isBest || isSelected) ? 1 : 0.72,
                                    transition: "height 220ms ease",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Hour labels */}
                    <div style={{ display: "flex", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid #F0EDE8" }}>
                      {activeRouteHours.map((h, idx) => {
                        const isBest = !!h.isBest;
                        const isSelected = idx === selectedHourIdx;
                        return (
                          <div
                            key={idx}
                            style={{
                              flex: 1, textAlign: "center", fontFamily: "monospace", fontSize: 10,
                              color: isSelected ? "#F97316" : isBest ? "#0EA472" : "#9A948E",
                              fontWeight: (isBest || isSelected) ? 600 : 400,
                            }}
                          >
                            {h.label}
                          </div>
                        );
                      })}
                    </div>

                    {/* Info note — dynamic: delta when non-best selected, else best + also-good */}
                    {selectedIsNonBest && selectedDeltaC !== null ? (
                      <div style={{ marginTop: 16, borderRadius: 14, overflow: "hidden" }}>
                        {/* Selected vs best delta */}
                        <div
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "12px 16px",
                            background: selectedDeltaC > 0
                              ? "rgba(249,115,22,0.09)"
                              : "rgba(14,164,114,0.08)",
                          }}
                        >
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                            background: selectedDeltaC > 0 ? "#F97316" : "#0EA472",
                          }} />
                          <span style={{ fontSize: 13, color: selectedDeltaC > 0 ? "#92400E" : "#15653F", flex: 1 }}>
                            {selectedDeltaC > 0
                              ? `${selectedHour!.label} is ${selectedDeltaC}°C warmer than the ${bestDeptHour?.label ?? "best"} departure`
                              : selectedDeltaC < 0
                                ? `${selectedHour!.label} is ${Math.abs(selectedDeltaC)}°C cooler, even better than ${bestDeptHour?.label ?? "best"}`
                                : `${selectedHour!.label} matches the ${bestDeptHour?.label ?? "best"} departure in heat`}
                          </span>
                          <button
                            onClick={() => setSelectedHourIdx(null)}
                            style={{ fontSize: 11, color: "#9A948E", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}
                          >
                            reset
                          </button>
                        </div>
                        {/* Best reminder */}
                        {bestDeptHour && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 16px", background: "rgba(14,164,114,0.05)",
                            borderTop: "1px solid rgba(14,164,114,0.12)",
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0EA472", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#15653F" }}>
                              Best: {bestDeptHour.label} · {bestDeptHour.tempValue}°C avg
                              {alsoGoodHours.length > 0 && ` · also fine: ${alsoGoodHours.map(h => h.label).join(", ")}`}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 16, borderRadius: 14, overflow: "hidden" }}>
                        <div
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "12px 16px", background: "rgba(14,164,114,0.08)",
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0EA472", flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: "#15653F" }}>{windowNote}</span>
                        </div>
                        {alsoGoodHours.length > 0 && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 16px", background: "rgba(14,164,114,0.05)",
                            borderTop: "1px solid rgba(14,164,114,0.12)",
                          }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6EE7B7", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#15653F" }}>
                              Also comfortable:{" "}
                              {alsoGoodHours.map((h, i) => (
                                <span key={i}>
                                  <button
                                    onClick={() => setSelectedHourIdx(activeRouteHours.indexOf(h))}
                                    style={{
                                      fontWeight: 600, color: "#0EA472", background: "none",
                                      border: "none", cursor: "pointer", padding: "0 2px",
                                      fontSize: 12, textDecoration: "underline",
                                    }}
                                  >
                                    {h.label}
                                  </button>
                                  {i < alsoGoodHours.length - 1 ? ", " : ""}
                                </span>
                              ))}
                              {" "}(within 2°C of best)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* AI Report teaser — directs to AI tab */}
              {recommendation && (
                <button
                  onClick={() => setActiveTab("ai")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 16,
                    border: "1.5px solid rgba(249,115,22,0.35)",
                    background: "rgba(249,115,22,0.05)",
                    cursor: "pointer",
                    textAlign: "left",
                    marginBottom: 4,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(100deg,#F97316,#EA580C)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Sparkles style={{ width: 16, height: 16, color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "var(--color-accent)" }}>
                      AI Heat Report ready
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {recommendation.headline}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: "var(--color-accent)" }}>→</span>
                </button>
              )}

              {/* 3 ── Route Options */}
              {routeOptions.length > 0 && (
                <section>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", margin: 0, color: "#1C1917" }}>
                        Route options
                      </h2>
                      <span style={{ fontSize: 13, color: "#6B6560" }}>Scored for a {departureLabel} departure</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: "rgba(249,115,22,0.08)", color: "#C2410C", border: "1px solid rgba(249,115,22,0.18)" }}>
                        {weatherWeightPct >= 70 ? "Comfort priority" : weatherWeightPct <= 30 ? "Speed priority" : "Balanced"}
                        {" · "}{weatherWeightPct}% comfort
                      </span>
                      {trafficAware && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: "rgba(14,164,114,0.08)", color: "#0EA472", border: "1px solid rgba(14,164,114,0.18)" }}>
                          Traffic-aware
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${Math.min(routeOptions.length, 3)}, 1fr)`,
                      gap: 14,
                    }}
                  >
                    {routeOptions.map((opt, idx) => {
                      const isSelected = opt.id === selectedRouteId;
                      const isRec = opt.label === "RECOMMENDED" || opt.label === "BEST ROUTE";
                      const comfort = comfortScore({ risk: opt.heatRisk, tempValue: parseTemp(opt.temperature), routeScore: null });
                      const fastest = Math.min(...routes.map(r => parseDurationMin(r.duration)));
                      const thisDur = parseDurationMin(opt.duration);
                      const deltaLabel = thisDur === fastest ? "fastest" : `+${thisDur - fastest} min`;

                      const routeForStrip = routes.find(r => r.id === opt.id);
                      const waypointTemps = (routeForStrip?.waypoints ?? [])
                        .filter(wp => typeof wp.temperature === "number")
                        .map(wp => wp.temperature as number);
                      const stripSegments = waypointTemps.length > 0
                        ? Array.from({ length: 8 }, (_, i) => {
                            const si = Math.round(i / 7 * (waypointTemps.length - 1));
                            return waypointTemps[si];
                          })
                        : Array<number>(8).fill(32);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedRouteId(opt.id)}
                          style={{
                            padding: "18px 20px 20px", borderRadius: 20, cursor: "pointer",
                            background: "#fff",
                            border: isSelected ? "2px solid #F97316" : "1px solid #EBE8E3",
                            boxShadow: isSelected ? "0 6px 20px rgba(249,115,22,0.13)" : "0 1px 3px rgba(28,25,23,0.05)",
                            transition: "box-shadow 160ms ease, border-color 160ms ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 22 }}>
                            <span
                              style={{
                                padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
                                background: isRec ? "rgba(249,115,22,0.10)" : "#F4F0EB",
                                color: isRec ? "#C2410C" : "#6B6560",
                              }}
                            >
                              {opt.label}
                            </span>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#9A948E" }}>{deltaLabel}</span>
                          </div>

                          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em", marginTop: 11, color: "#1C1917" }}>
                            {opt.name || `Route ${idx + 1}`}
                          </div>

                          <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 9 }}>
                            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em", color: "#1C1917" }}>
                              {opt.duration}
                            </span>
                            <span style={{ fontSize: 13, color: "#6B6560" }}>{opt.distance}</span>
                          </div>

                          <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", marginTop: 14, gap: 2 }}>
                            {stripSegments.map((t, si) => (
                              <div key={si} style={{ flex: 1, background: heatColorForTemp(t) }} />
                            ))}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 13, paddingTop: 13, borderTop: "1px solid #F0EDE8" }}>
                            <div>
                              <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9A948E" }}>Comfort</div>
                              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, marginTop: 2, color: "#1C1917" }}>
                                {comfort}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9A948E" }}>Avg temp</div>
                              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, marginTop: 2, color: heatInkForTemp(parseTemp(opt.temperature)) }}>
                                {displayTemp(parseTemp(opt.temperature), unitF)}
                              </div>
                            </div>
                          </div>

                          {(opt.weatherScore != null || opt.timeScore != null) && (
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              {opt.weatherScore != null && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                                  <div style={{ fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9A948E" }}>Heat score</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#EBE8E3", overflow: "hidden" }}>
                                      <div style={{ width: `${Math.min(100, opt.weatherScore)}%`, height: "100%", background: heatColorForTemp(parseTemp(opt.temperature)) }} />
                                    </div>
                                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6B6560" }}>{Math.round(opt.weatherScore)}</span>
                                  </div>
                                </div>
                              )}
                              {opt.timeScore != null && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                                  <div style={{ fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9A948E" }}>Speed score</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#EBE8E3", overflow: "hidden" }}>
                                      <div style={{ width: `${Math.min(100, opt.timeScore)}%`, height: "100%", background: "#0EA472" }} />
                                    </div>
                                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6B6560" }}>{Math.round(opt.timeScore)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ fontSize: 12, lineHeight: 1.45, color: "#6B6560", marginTop: 8 }}>
                            {opt.description}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 4 ── Along the Way */}
              {alongTheWayPoints.length > 0 && (
                <section
                  style={{
                    background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24,
                    padding: "24px 26px",
                  }}
                >
                  <div style={{ marginBottom: 18 }}>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", margin: 0, color: "#1C1917" }}>
                      Along the way
                    </h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "#6B6560" }}>
                      Heat conditions at key points, timed to your estimated arrival.
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {alongTheWayPoints.map((point, idx) => {
                      const temp = typeof point.temperature === "number" ? point.temperature : null;
                      const distKm = point.distance_from_origin_m != null ? (point.distance_from_origin_m / 1000).toFixed(1) : "--";
                      const riskLabel = temp != null ? riskLabelFromTemp(temp) : "Unknown";
                      return (
                        <div
                          key={idx}
                          style={{
                            borderRadius: 16, background: "#FAF8F2",
                            border: "1px solid #EBE8E3",
                            borderLeft: `3px solid ${temp != null ? heatColorForTemp(temp) : "#D4CECE"}`,
                            padding: 15,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6B6560" }}>
                              {point.name || (distKm !== "--" ? `+${distKm} km` : `Point ${idx + 1}`)}
                            </span>
                            <span
                              style={{
                                padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                                background: temp != null ? heatColorForTemp(temp) : "#D4CECE",
                                color: (temp ?? 0) > 32 ? "#fff" : "#1C1917",
                              }}
                            >
                              {riskLabel}
                            </span>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: temp != null ? heatInkForTemp(temp) : "#6B6560" }}>
                              {temp != null ? displayTemp(temp, unitF) : "--"}
                            </div>
                            {typeof point.heat_index === "number" && temp != null && Math.abs(point.heat_index - temp) >= 1 && (
                              <div style={{ fontSize: 11, color: "#9A948E", marginTop: 1 }}>
                                feels {displayTemp(point.heat_index, unitF)}
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: 12, color: "#6B6560", marginTop: 3 }}>
                            {riskInfo(temp, point.risk_level || undefined).tip}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginTop: 12 }}>
                            {([
                              ["Rain", point.precipitation_mm != null ? `${point.precipitation_mm.toFixed(1)} mm` : "--", undefined],
                              ["Wind", point.wind_speed_ms != null ? `${Math.round(point.wind_speed_ms * 3.6)} km/h` : "--", undefined],
                              ["UV", point.uv_index != null ? String(Math.round(point.uv_index)) : "--", undefined],
                            ] as Array<[string, string, string | undefined]>).map(([k, v, c]) => (
                              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9A948E" }}>{k}</span>
                                <span style={{ fontFamily: "monospace", fontSize: 12, color: c ?? "#6B6560", fontWeight: c ? 600 : undefined }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 5 ── Stops & POIs */}
              {(() => {
                const allPois = segmentPois.length > 0 ? segmentPois : (selectedRouteData?.pois ?? []);
                const coolingStops = recommendation?.cooling_stops ?? [];
                if (allPois.length === 0 && coolingStops.length === 0) return null;

                function poiEmoji(type: string): string {
                  const t = (type || "").toLowerCase();
                  if (t === "gas_station" || t.includes("fuel")) return "⛽";
                  if (t === "hospital" || t.includes("medical") || t.includes("clinic")) return "🏥";
                  if (t === "restaurant" || t.includes("food") || t.includes("catering")) return "🍽️";
                  if (t === "rest_area" || t.includes("rest")) return "🅿️";
                  if (t === "supermarket" || t.includes("market")) return "🛒";
                  if (t.includes("water")) return "💧";
                  if (t.includes("library")) return "📚";
                  if (t.includes("hotel") || t.includes("lodging")) return "🏨";
                  return "📍";
                }
                function poiTypeLabel(type: string): string {
                  return (type || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                }

                const filterTypes = ["all", ...Array.from(new Set(allPois.map(p => p.type).filter(Boolean)))];
                const filteredPois = poiFilter === "all" ? allPois : allPois.filter(p => p.type === poiFilter);

                return (
                  <section style={{ background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24, padding: "18px 20px" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em", color: "#1C1917" }}>
                        Stops along the way
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => setShowJourneyVisualizer(true)}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "4px 11px", borderRadius: 999, border: "none",
                            background: "linear-gradient(135deg, #1C1917, #3C3533)",
                            color: "#fff", fontSize: 11, fontWeight: 700,
                            cursor: "pointer", fontFamily: "var(--font-heading)",
                            letterSpacing: "-0.01em",
                            boxShadow: "0 2px 8px rgba(28,25,23,0.22)",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #F97316, #EA580C)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, #1C1917, #3C3533)"; }}
                        >
                          <Sparkles style={{ width: 11, height: 11 }} />
                          Journey Plan
                        </button>
                        <span style={{ fontSize: 10, color: "#9A948E" }}>tap to show on map</span>
                        <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: "rgba(249,115,22,0.08)", color: "#F97316", border: "1px solid rgba(249,115,22,0.18)" }}>
                          {allPois.length}
                        </span>
                      </div>
                    </div>

                    {/* Cooling stops — compact rows */}
                    {coolingStops.length > 0 && (
                      <div style={{ marginBottom: 10, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(14,164,114,0.18)" }}>
                        {coolingStops.map((stop, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: i % 2 === 0 ? "rgba(14,164,114,0.05)" : "#FAFFFE", borderTop: i > 0 ? "1px solid rgba(14,164,114,0.10)" : undefined }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>🧊</span>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stop.name}</span>
                            {stop.eta_time && <span style={{ fontSize: 10, color: "#6B6560", flexShrink: 0 }}>{fmtTime(stop.eta_time)}</span>}
                            {stop.distance_km > 0 && <span style={{ fontSize: 10, color: "#9A948E", flexShrink: 0 }}>{stop.distance_km.toFixed(0)} km</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Filter chips */}
                    {filterTypes.length > 1 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                        {filterTypes.map(type => (
                          <button key={type} onClick={() => setPoiFilter(type)} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 120ms", background: poiFilter === type ? "#1C1917" : "#F0EDE8", color: poiFilter === type ? "#fff" : "#6B6560" }}>
                            {type === "all" ? `All · ${allPois.length}` : `${poiEmoji(type)} ${poiTypeLabel(type)}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 3-column grid */}
                    {filteredPois.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        {filteredPois.map((poi, i) => {
                          const emoji = poiEmoji(poi.type);
                          const key = poi.id ?? `${poi.lat}-${poi.lon}-${i}`;
                          const isActive = selectedPoiId === key;
                          return (
                            <button
                              key={key}
                              onClick={() => handlePoiClick(poi, emoji, String(key))}
                              style={{
                                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                                padding: "9px 11px", borderRadius: 12, border: "1px solid",
                                borderColor: isActive ? "rgba(249,115,22,0.4)" : "#EBE8E3",
                                cursor: "pointer", textAlign: "left",
                                background: isActive ? "rgba(249,115,22,0.06)" : "#FAF8F2",
                                transition: "all 120ms",
                              }}
                              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "#D4CCC4"; e.currentTarget.style.background = "#F5F2EC"; } }}
                              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "#EBE8E3"; e.currentTarget.style.background = "#FAF8F2"; } }}
                            >
                              <span style={{ fontSize: 18 }}>{emoji}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#C2410C" : "#1C1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                                {poi.name || poiTypeLabel(poi.type)}
                              </span>
                              {poi.distance != null && (
                                <span style={{ fontSize: 10, color: "#9A948E" }}>
                                  {poi.distance < 1000 ? `${Math.round(poi.distance)} m` : `${(poi.distance / 1000).toFixed(1)} km`}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "#9A948E", margin: "6px 0", textAlign: "center" }}>No stops of this type.</p>
                    )}
                  </section>
                );
              })()}
            </div>

            {/* ── RIGHT SIDEBAR ──────────────────────────────── */}
            <aside style={{ position: "sticky", top: 92, display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Map card */}
              <div
                ref={mapCardRef}
                style={{
                  position: "relative", borderRadius: 24, overflow: "hidden",
                  border: "1px solid #EBE8E3", background: "#E8E4DC",
                  boxShadow: "0 1px 3px rgba(28,25,23,0.07)",
                }}
              >
                <div ref={mapContainerRef} style={{ height: 380, width: "100%" }} />

                {/* Layer toggle (top-left) */}
                <div
                  style={{
                    position: "absolute", zIndex: 500, left: 12, top: 12,
                    display: "flex", gap: 4, padding: 5, borderRadius: 12,
                    background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 10px rgba(28,25,23,0.12)",
                  }}
                >
                  <button
                    onClick={handleToggleHeatmap}
                    style={{
                      padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                      background: heatmapVisible ? "#F97316" : "transparent",
                      color: heatmapVisible ? "#fff" : "#6B6560",
                      transition: "all 140ms",
                    }}
                  >
                    Heat
                  </button>
                  <button
                    onClick={handleToggleRain}
                    style={{
                      padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                      background: rainVisible ? "#3b82f6" : "transparent",
                      color: rainVisible ? "#fff" : "#6B6560",
                      transition: "all 140ms",
                    }}
                  >
                    Rain
                  </button>
                  <button
                    onClick={handleToggleWind}
                    style={{
                      padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                      background: windVisible ? "#1e3a8a" : "transparent",
                      color: windVisible ? "#fff" : "#6B6560",
                      transition: "all 140ms",
                    }}
                  >
                    Wind
                  </button>
                </div>

                {/* Map style toggle (top-right) */}
                <MapStyleToggle satellite={isSatellite} onChange={setIsSatellite} />

                {/* Zoom + center controls (right side) */}
                <div
                  style={{
                    position: "absolute", zIndex: 500, right: 12, bottom: 52,
                    display: "flex", flexDirection: "column", gap: 4,
                  }}
                >
                  <button
                    onClick={() => mapRef.current?.zoomIn()}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "1px solid #EBE8E3",
                      background: "rgba(255,255,255,0.95)", color: "#6B6560", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(28,25,23,0.08)",
                    }}
                    aria-label="Zoom in"
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                  </button>
                  <button
                    onClick={() => mapRef.current?.zoomOut()}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "1px solid #EBE8E3",
                      background: "rgba(255,255,255,0.95)", color: "#6B6560", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(28,25,23,0.08)",
                    }}
                    aria-label="Zoom out"
                  >
                    <Minus style={{ width: 13, height: 13 }} />
                  </button>
                  <button
                    onClick={() => handleCenter()}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "1px solid #EBE8E3",
                      background: "rgba(255,255,255,0.95)", color: "#6B6560", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(28,25,23,0.08)",
                    }}
                    aria-label="Fit route"
                  >
                    <Crosshair style={{ width: 13, height: 13 }} />
                  </button>
                </div>



                {/* Exposure legend (bottom-left) */}
                <div
                  style={{
                    position: "absolute", zIndex: 500, left: 12, bottom: 14,
                    padding: "8px 11px", borderRadius: 10,
                    background: "rgba(255,255,255,0.93)", backdropFilter: "blur(8px)",
                    boxShadow: "0 2px 8px rgba(28,25,23,0.10)",
                  }}
                >
                  <div style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6560", marginBottom: 5 }}>
                    Heat Exposure
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 80, height: 6, borderRadius: 4, background: "linear-gradient(90deg,#7CC8E8,#FAD675,#F59052,#CC3320)" }} />
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6B6560" }}>Low → Extreme</span>
                  </div>
                </div>

                {/* Loading overlay */}
                {heatLoadingLive && (
                  <div
                    style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 10,
                      background: "rgba(250,248,242,0.88)", zIndex: 1200,
                    }}
                  >
                    <Loader2 style={{ width: 24, height: 24, color: "#F97316" }} className="animate-spin" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1C1917" }}>Analyzing heat data…</span>
                  </div>
                )}

                {/* Offline overlay */}
                <AnimatePresence>
                  {isOffline && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 12,
                        background: "rgba(250,248,242,0.95)", zIndex: 1200,
                      }}
                    >
                      <WifiOff style={{ width: 28, height: 28, color: "#9A948E" }} />
                      <div style={{ textAlign: "center", maxWidth: 220 }}>
                        <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, margin: 0, color: "#1C1917" }}>No connection</p>
                        <p style={{ fontSize: 13, marginTop: 6, color: "#6B6560", lineHeight: 1.5 }}>Check your internet. Last route shown.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* No routes overlay */}
                {!heatLoadingLive && routes.length === 0 && (
                  <div
                    style={{
                      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 12,
                      background: "rgba(250,248,242,0.95)", zIndex: 1200,
                    }}
                  >
                    <p style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, color: "#1C1917", margin: 0 }}>No routes found</p>
                    <button
                      onClick={onBack}
                      style={{
                        padding: "9px 18px", borderRadius: 12, border: "none",
                        background: "#F97316", color: "#fff",
                        fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Try different locations
                    </button>
                  </div>
                )}
              </div>

              {/* Trip Summary card */}
              <div style={{ background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24, padding: "22px 24px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.015em", color: "#1C1917" }}>
                  Trip summary
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 14 }}>
                  {tripSummaryRows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 0",
                        borderBottom: i < tripSummaryRows.length - 1 ? "1px solid #F0EDE8" : "none",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#6B6560" }}>{row.label}</span>
                      {row.chip ? (
                        <span
                          style={{
                            padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: heatColorForTemp(parseTemp(selectedRouteOption?.temperature ?? "30")),
                            color: parseTemp(selectedRouteOption?.temperature ?? "30") > 32 ? "#fff" : "#1C1917",
                          }}
                        >
                          {row.value}
                        </span>
                      ) : (
                        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 500, color: row.color ?? "#1C1917" }}>
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Watch out for card */}
              <div style={{ background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24, padding: "22px 24px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.015em", color: "#1C1917" }}>
                  Watch out for
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                  {watchOutItems.map((item, i) => (
                    <div
                      key={i}
                      style={{ padding: "12px 14px", borderRadius: 14, background: item.bg, color: item.color }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                      {item.body && <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.85, marginTop: 3 }}>{item.body}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

        {/* ── Along the route detail tab ──────────────────────── */}
        <div style={{ display: activeTab === "detail" ? "block" : "none", marginTop: 8 }}>

            {/* Detail header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 38, letterSpacing: "-0.03em", margin: 0, color: "#1C1917" }}>
                  {selectedRouteData?.via || selectedRouteOption?.name || "Route"}
                </h1>
                <p style={{ margin: "8px 0 0", fontSize: 15, color: "#6B6560" }}>
                  Departing {departureLabel} · {selectedRouteOption?.duration ?? "--"} · {selectedRouteOption?.distance ?? "--"} · arriving {arrivalLabel}
                </p>
              </div>
              {/* Route selector tabs */}
              <div style={{ display: "flex", gap: 8 }}>
                {routeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedRouteId(opt.id)}
                    style={{
                      padding: "8px 15px", borderRadius: 11, cursor: "pointer",
                      fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                      border: opt.id === selectedRouteId ? "1px solid #F97316" : "1px solid #EBE8E3",
                      background: opt.id === selectedRouteId ? "rgba(249,115,22,0.08)" : "#fff",
                      color: opt.id === selectedRouteId ? "#C2410C" : "#6B6560",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Data table */}
            <div style={{ background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24, overflow: "hidden" }}>
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px minmax(0,1.4fr) 96px 1fr 72px 84px 60px 110px",
                  gap: 12, padding: "14px 24px",
                  background: "#FAF8F2", borderBottom: "1px solid #EBE8E3",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B6560",
                }}
              >
                <div>ETA</div>
                <div>Sample point</div>
                <div>Temp</div>
                <div>Condition</div>
                <div>Rain</div>
                <div>Wind</div>
                <div>UV</div>
                <div>Exposure</div>
              </div>

              {detailTableRows.length === 0 && (
                <div style={{ padding: "32px 22px", textAlign: "center", fontSize: 14, color: "#9A948E" }}>
                  No sample point data available for this route.
                </div>
              )}

              {detailTableRows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px minmax(0,1.4fr) 96px 1fr 72px 84px 60px 110px",
                    gap: 12, alignItems: "center", padding: "18px 24px",
                    borderBottom: i < detailTableRows.length - 1 ? "1px solid #F4F1ED" : "none",
                  }}
                >
                  <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 500, color: "#1C1917" }}>{row.eta}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#1C1917" }}>{row.name}</div>
                    {row.km && <div style={{ fontSize: 11, color: "#9A948E", marginTop: 2 }}>{row.km}</div>}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", color: row.rawTemp != null ? heatInkForTemp(row.rawTemp) : "#6B6560" }}>
                      {row.temp}
                    </div>
                    {row.feelsLike && (
                      <div style={{ fontSize: 10, color: "#9A948E", marginTop: 1 }}>feels {row.feelsLike}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: "#6B6560" }}>
                    {row.condition}
                    {row.precip && parseFloat(row.precip) > 0 && (
                      <div style={{ fontSize: 10, color: "#6B6560", marginTop: 2 }}>🌧 {row.precip}</div>
                    )}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#6B6560" }}>{row.rain}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#6B6560" }}>{row.wind}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#6B6560" }}>{row.uv}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 52, height: 6, borderRadius: 4, background: "#EBE8E3", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ width: `${row.exposurePct ?? 0}%`, height: "100%", borderRadius: 4, background: row.rawTemp != null ? heatColorForTemp(row.rawTemp) : "#D4CECE" }} />
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6B6560" }}>{row.exposurePct != null ? `${row.exposurePct}%` : "--"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Advice cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 20 }}>
              {adviceCards.map((card, i) => (
                <div key={i} style={{ padding: "18px 20px", border: "1px solid #EBE8E3", borderRadius: 18, background: "#fff" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "#F97316", fontWeight: 600 }}>{card.tag}</div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.015em", marginTop: 8, color: "#1C1917" }}>{card.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "#6B6560", marginTop: 6 }}>{card.body}</div>
                </div>
              ))}
            </div>
          </div>
      </main>

        {/* ── AI Report tab ────────────────────────────────────── */}
        {activeTab === "ai" && (
          <HeatIntelTab
            heatPoints={allHeatPoints}
            recommendation={recommendation ?? null}
            departureHours={activeRouteHours}
            shownDepartureTime={bestEvalForPoints?.departure_time ?? null}
            riskScore={bestEvalForPoints?.risk?.score ?? null}
            origin={origin}
            destination={destination}
            routeName={selectedRouteOption?.name ?? ""}
            routeDistance={selectedRouteOption?.distance ?? ""}
            routeDuration={selectedRouteOption?.duration ?? ""}
            riskLevel={riskLevel}
            riskMetrics={riskMetrics ?? null}
            unitF={unitF}
            weatherWeightPct={weatherWeightPct}
          />
        )}

      {/* FloatingMapDock kept hidden — handleStopSelect drives stop markers */}
      <div style={{ display: "none" }}>
        <FloatingMapDock
          onStopSelect={handleStopSelect}
          onDepartureHover={setDepartureHover}
          hours={activeRouteHours}
          hoursLoading={isSubmitting}
          windowLabel={`NEXT ${departureRangeHours} HRS · ${stepMinutes} MIN STEPS`}
          pois={_dockPois}
          coolingStops={recommendation?.cooling_stops ?? []}
        />
      </div>

      {/* AI chat — results mode with full route context */}
      <ChatWidget
        mode="results"
        routeContext={origin && destination ? { origin, destination, contextSummary: routeContextSummary } : undefined}
        onAutoSubmit={() => onBack()}
      />

      {/* Animated journey visualizer */}
      <JourneyErrorBoundary onClose={() => setShowJourneyVisualizer(false)}>
        <StopJourneyVisualizer
          open={showJourneyVisualizer}
          origin={origin}
          destination={destination}
          routeDistance={selectedRouteData?.distance ?? "0 km"}
          routeDuration={selectedRouteData?.duration ?? "0 min"}
          pois={_dockPois}
          coolingStops={recommendation?.cooling_stops ?? []}
          passengerTypes={passengerTypes}
          routeContext={routeContextSummary}
          decision={recommendation?.decision}
          onClose={() => setShowJourneyVisualizer(false)}
        />
      </JourneyErrorBoundary>
    </div>
  );
}
