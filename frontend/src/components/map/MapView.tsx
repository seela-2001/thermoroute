import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingMapDock, type DepartureHourInfo } from "@/components/FloatingMapDock";
import thermoLogo from "@/components/ui/images/fa492037-babd-45eb-b0a3-e2ee3fce2acb.png";
import {
  createHeatGradientLayer,
  createGradientRouteLine,
  createHeatLegend,
} from "@/components/HeatGradientLayer";
import type { RouteData } from "@/utils/routeUtils";
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

function comfortScoreFromRisk(risk: string, temp: number): number {
  switch (risk.toLowerCase()) {
    case "low":      return Math.max(72, Math.min(98, Math.round(92 - Math.max(0, temp - 20) * 0.5)));
    case "moderate": return Math.max(50, Math.min(72, Math.round(70 - Math.max(0, temp - 28) * 0.6)));
    case "high":     return Math.max(28, Math.min(50, Math.round(48 - Math.max(0, temp - 32) * 0.5)));
    default:         return Math.max(8,  Math.min(28, Math.round(24 - Math.max(0, temp - 38) * 0.4)));
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
  const totalMins = h * 60 + minutes;
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
    EXTREME:   { label: "Extreme Heat",   tip: "Dangerous — avoid outdoor exposure" },
    VERY_HIGH: { label: "Very High Heat", tip: "High risk — stay hydrated, limit time outside" },
    HIGH:      { label: "High Heat",      tip: "Elevated risk — take regular breaks" },
    MODERATE:  { label: "Moderate Heat",  tip: "Use caution — drink water regularly" },
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
}: MapViewProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    () => recommendedRouteId ?? routes[0]?.id ?? ""
  );
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);
  const [departureHover, setDepartureHover] = useState<DepartureHourInfo | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeTab, setActiveTab] = useState<"results" | "detail">("results");
  const [unitF, setUnitF] = useState(false);
  const [selectedHourIdx, setSelectedHourIdx] = useState<number | null>(null);

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

  const selectedRouteData = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

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
      const legend = createHeatLegend();
      legend.addTo(map);
      heatLegendRef.current = legend;
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

    const activeEval = selectedHourIdx !== null && departureHours[selectedHourIdx]?.departureTime
      ? (evals.find(ev => ev.departure_time === departureHours[selectedHourIdx]!.departureTime) ?? bestEval)
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
  }, [routes, selectedRouteId, selectedHourIdx, departureHours]);

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
    const activeEvalForEmoji = selectedHourIdx !== null && departureHours[selectedHourIdx]?.departureTime
      ? (evals.find(ev => ev.departure_time === departureHours[selectedHourIdx]!.departureTime) ?? bestEval)
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
      const tempLine = safeTemp !== null ? `<span class="heat-tip-temp">${Math.round(safeTemp)}°C</span>` : "";
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
  }, [routes, selectedRouteId, selectedHourIdx, departureHours]);

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
      const legend = createHeatLegend();
      legend.addTo(map);
      heatLegendRef.current = legend;
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
  const selectedHourEval = selectedHourIdx !== null && departureHours[selectedHourIdx]?.departureTime
    ? (evals.find(ev => ev.departure_time === departureHours[selectedHourIdx]!.departureTime) ?? null)
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

  // ── Watch-out items ───────────────────────────────────────────
  const watchOutItems: Array<{ title: string; body: string; bg: string; color: string }> = [];
  if (recommendation?.alerts && recommendation.alerts.length > 0) {
    recommendation.alerts.slice(0, 2).forEach((a, i) => {
      watchOutItems.push({
        title: a.message.length > 60 ? a.message.slice(0, 57) + "…" : a.message,
        body: a.temperature > 0 ? `${a.temperature}°C · Risk score ${a.risk_score}` : a.message,
        bg: i === 0 ? "rgba(249,115,22,0.08)" : "#FAF8F2",
        color: i === 0 ? "#92400E" : "#44403C",
      });
    });
  }
  if (heatWarning && watchOutItems.length < 3) {
    watchOutItems.push({ title: "Heat data notice", body: heatWarning, bg: "rgba(212,160,0,0.08)", color: "#713F12" });
  }
  const critSegsForAlert = bestEvalForPoints?.risk?.critical_segments ?? [];
  if (critSegsForAlert.length > 0 && watchOutItems.length < 3) {
    const worstCs = critSegsForAlert.reduce((a, b) => a.risk_score >= b.risk_score ? a : b);
    watchOutItems.push({
      title: `${critSegsForAlert.length} critical heat zone${critSegsForAlert.length > 1 ? "s" : ""} on route`,
      body: `Worst: ${worstCs.risk_level.replace(/_/g, " ")} · risk score ${worstCs.risk_score}/100 · shown as red circles on map`,
      bg: "rgba(239,68,68,0.08)",
      color: "#991B1B",
    });
  }
  if (watchOutItems.length === 0) {
    watchOutItems.push({ title: "All clear", body: "No significant heat or weather alerts for this route and departure time.", bg: "#F0FDF4", color: "#166534" });
  }

  // ── Departure / Arrival labels ────────────────────────────────
  const durationMin = selectedRouteOption ? parseDurationMin(selectedRouteOption.duration) : 0;
  const activeDeparture = selectedHourIdx !== null ? (departureHours[selectedHourIdx] ?? bestDeparture) : bestDeparture;
  const departureLabel = activeDeparture?.label ?? "--";
  const arrivalLabel = activeDeparture ? addMinutesToLabel(activeDeparture.label, durationMin) : "--";

  // ── Hero pills ────────────────────────────────────────────────
  const heroPills = [
    { k: "Arrive",    v: arrivalLabel },
    { k: "Duration",  v: selectedRouteOption?.duration ?? "--" },
    { k: "Peak temp", v: selectedRouteOption ? displayTemp(parseTemp(selectedRouteOption.temperature), unitF) : "--" },
    { k: "Rain risk", v: (() => {
        const pts = bestEvalForPoints?.heat_data ?? [];
        // Prefer precipitation_probability (%), fall back to mm→% conversion
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
    { label: "Duration",       value: selectedRouteOption?.duration ?? "--" },
    { label: "Distance",       value: selectedRouteOption?.distance ?? "--" },
    {
      label: "Peak temp",
      value: selectedRouteOption ? displayTemp(parseTemp(selectedRouteOption.temperature), unitF) : "--",
      color: selectedRouteOption ? heatInkForTemp(parseTemp(selectedRouteOption.temperature)) : undefined,
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
  const bestDeptHour = departureHours.find(h => h.isBest) ?? bestDeparture;
  const windowNote = bestDeptHour
    ? `Best window at ${bestDeptHour.label} · ${bestDeptHour.tempValue}°C avg heat exposure`
    : `${departureRangeHours}h window · ${stepMinutes} min steps`;

  // ── Departure insight: "also good" and delta vs best ─────────────
  const bestTemp = bestDeptHour?.tempValue ?? null;
  // Hours within 2°C of best (but not the best itself) are "also good"
  const alsoGoodHours = bestTemp !== null
    ? departureHours.filter(h => !h.isBest && h.tempValue <= bestTemp + 2)
    : [];
  const selectedHour = selectedHourIdx !== null ? (departureHours[selectedHourIdx] ?? null) : null;
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
      body: `Comfort score ${comfortScoreFromRisk(bestDeparture?.risk ?? "moderate", bestDeparture?.tempValue ?? 30)} — the highest-scoring combination of route and departure hour.`,
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
        <div
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", flexShrink: 0 }}
        >
          <img
            src={thermoLogo}
            alt="ThermoDispatch"
            style={{ height: 40, width: "auto", borderRadius: 8, display: "block" }}
          />
        </div>

        {/* Tab navigation */}
        <nav style={{ display: "flex", gap: 3, padding: 4, background: "#F0EDE8", borderRadius: 12, flexShrink: 0 }}>
          {([ ["plan", "Plan"], ["results", "Results"], ["detail", "Along the route"] ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "plan") { onBack(); return; }
                setActiveTab(tab as "results" | "detail");
                if (tab === "results") setTimeout(() => (mapRef.current as unknown as { invalidateSize(): void } | null)?.invalidateSize(), 50);
              }}
              style={{
                padding: "7px 14px", border: "none", borderRadius: 9, cursor: "pointer",
                fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                background: activeTab === tab ? "#fff" : "transparent",
                color: activeTab === tab ? "#1C1917" : "#6B6560",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(28,25,23,0.10)" : "none",
                transition: "all 120ms",
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
                      <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 52, lineHeight: 1, letterSpacing: "-0.035em" }}>
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
                      width: 108, height: 108, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.28)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 32, lineHeight: 1 }}>
                      {bestDeparture ? comfortScoreFromRisk(bestDeparture.risk, bestDeparture.tempValue) : "--"}
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
                        padding: "8px 14px", borderRadius: 12,
                        background: "rgba(255,255,255,0.14)",
                      }}
                    >
                      <span style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", opacity: 0.72 }}>{p.k}</span>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 600 }}>{p.v}</span>
                    </div>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => {
                      if (recommendedRouteId) setSelectedRouteId(recommendedRouteId);
                      setTimeout(() => handleCenter(), 100);
                    }}
                    style={{
                      alignSelf: "flex-end", padding: "11px 20px", borderRadius: 12, border: "none",
                      background: "rgba(255,255,255,0.95)", color: "#6D28A0",
                      fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.95)")}
                  >
                    Use this plan
                  </button>
                </div>
              </section>

              {/* 2 ── Departure Timeline */}
              <section
                style={{
                  background: "#FEFCF8", border: "1px solid #EBE8E3", borderRadius: 24,
                  padding: "24px 26px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", margin: 0, color: "#1C1917" }}>
                      Departure timeline
                    </h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "#6B6560" }}>
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

                {departureHours.length === 0 ? (
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
                      const scores = departureHours.map(h => comfortScoreFromRisk(h.risk, h.tempValue));
                      const maxScore = Math.max(...scores, 1);
                      return (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 190, marginTop: 24 }}>
                          {departureHours.map((h, idx) => {
                            const score = scores[idx];
                            const barPct = Math.max(6, Math.round((score / maxScore) * 100));
                            const isBest = !!h.isBest;
                            const isSelected = idx === selectedHourIdx;
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedHourIdx(isSelected ? null : idx)}
                                title={`${h.label} — comfort ${score}, ${h.tempValue}°C`}
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
                      {departureHours.map((h, idx) => {
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
                                ? `${selectedHour!.label} is ${Math.abs(selectedDeltaC)}°C cooler — even better than ${bestDeptHour?.label ?? "best"}`
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
                          <span style={{ fontSize: 13, color: "#15653F" }}>{windowNote}</span>
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
                                    onClick={() => setSelectedHourIdx(departureHours.indexOf(h))}
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
                              {" "}— within 2°C of best
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* 3 ── Route Options */}
              {routeOptions.length > 0 && (
                <section>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", margin: 0, color: "#1C1917" }}>
                      Route options
                    </h2>
                    <span style={{ fontSize: 13, color: "#6B6560" }}>Scored for a {departureLabel} departure</span>
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
                      const comfort = comfortScoreFromRisk(opt.heatRisk.toLowerCase(), parseTemp(opt.temperature));
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
            </div>

            {/* ── RIGHT SIDEBAR ──────────────────────────────── */}
            <aside style={{ position: "sticky", top: 92, display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Map card */}
              <div
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
                    style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "default", background: "transparent", color: "#9A948E" }}
                    title="Rain layer — coming soon"
                  >
                    Rain
                  </button>
                  <button
                    style={{ padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "default", background: "transparent", color: "#9A948E" }}
                    title="Wind layer — coming soon"
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
                      background: "rgba(250,248,242,0.88)", zIndex: 600,
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
                        background: "rgba(250,248,242,0.95)", zIndex: 600,
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
                      background: "rgba(250,248,242,0.95)", zIndex: 600,
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
              <div style={{ background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24, padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.015em", color: "#1C1917" }}>
                  Trip summary
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 14 }}>
                  {tripSummaryRows.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 0",
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
              <div style={{ background: "#fff", border: "1px solid #EBE8E3", borderRadius: 24, padding: "20px 22px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, letterSpacing: "-0.015em", color: "#1C1917" }}>
                  Watch out for
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                  {watchOutItems.map((item, i) => (
                    <div
                      key={i}
                      style={{ padding: "12px 14px", borderRadius: 14, background: item.bg, color: item.color }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.85, marginTop: 3 }}>{item.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

        {/* ── Along the route detail tab ──────────────────────── */}
        <div style={{ display: activeTab === "detail" ? "block" : "none", marginTop: 8 }}>

            {/* Detail header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 34, letterSpacing: "-0.03em", margin: 0, color: "#1C1917" }}>
                  {selectedRouteData?.via || selectedRouteOption?.name || "Route"}
                </h1>
                <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6B6560" }}>
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
                  gridTemplateColumns: "72px minmax(0,1.4fr) 80px 1fr 52px 72px 44px 110px",
                  gap: 6, padding: "10px 18px",
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
                    gridTemplateColumns: "72px minmax(0,1.4fr) 80px 1fr 52px 72px 44px 110px",
                    gap: 6, alignItems: "center", padding: "13px 18px",
                    borderBottom: i < detailTableRows.length - 1 ? "1px solid #F4F1ED" : "none",
                  }}
                >
                  <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 500, color: "#1C1917" }}>{row.eta}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1C1917" }}>{row.name}</div>
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
                  <div style={{ fontSize: 13, color: "#6B6560" }}>
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

      {/* FloatingMapDock kept hidden — handleStopSelect drives stop markers */}
      <div style={{ display: "none" }}>
        <FloatingMapDock
          onCameraSelect={(id) => console.log("Camera selected:", id)}
          onStopSelect={handleStopSelect}
          onDepartureHover={setDepartureHover}
          hours={departureHours}
          hoursLoading={isSubmitting}
          windowLabel={`NEXT ${departureRangeHours} HRS · ${stepMinutes} MIN STEPS`}
          cameras={selectedRouteData?.cameras ?? []}
          pois={_dockPois}
        />
      </div>
    </div>
  );
}
