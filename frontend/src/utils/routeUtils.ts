import type {
  AnalyzeCamera,
  AnalyzeEvaluation,
  AnalyzeHeatPoint,
  AnalyzePoi,
  AnalyzeResponse,
  AnalyzeRoute,
  AnalyzeSegment,
} from "@/services/api";
import { decimateGeometry, riskFromTemp } from "@/services/routing";
import type { DepartureHourInfo } from "@/components/FloatingMapDock";

export interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  temperature?: number;
}

export interface RouteData {
  id: string;
  name: string;
  via: string;
  distance: string;
  duration: string;
  temperature: string;
  heatRisk: string;
  heatUnavailable?: boolean;
  durationSeconds: number;
  cameras: AnalyzeCamera[];
  pois: AnalyzePoi[];
  segments: AnalyzeSegment[];
  evaluations: AnalyzeEvaluation[];
  waypoints: Waypoint[];
}

export const US_STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

export function toStateCode(state: string): string {
  const trimmed = (state || "").trim();
  if (!trimmed) return "";
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return US_STATE_CODES[trimmed.toLowerCase()] || trimmed;
}

export function heatLevel(level: string | undefined): string {
  switch ((level || "").toUpperCase()) {
    case "LOW": return "Low";
    case "MODERATE": return "Medium";
    case "HIGH":
    case "VERY_HIGH":
    case "EXTREME": return "High";
    default: return "Medium";
  }
}

export function averageHeatTemp(heat: AnalyzeHeatPoint[] | undefined): number | null {
  const valid = (heat ?? []).filter((p) => typeof p.temperature === "number");
  if (valid.length === 0) return null;
  return valid.reduce((sum, p) => sum + p.temperature, 0) / valid.length;
}

export function pickEvaluation(route: AnalyzeRoute): AnalyzeEvaluation | null {
  const scored = route.evaluations.filter((ev) => ev.route_score !== null);
  if (scored.length > 0) {
    return scored.reduce((a, b) =>
      (a.route_score ?? Infinity) <= (b.route_score ?? Infinity) ? a : b
    );
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
    if (f <= pts[0].f) { out[i] = Math.round(pts[0].t * 10) / 10; continue; }
    if (f >= pts[pts.length - 1].f) { out[i] = Math.round(pts[pts.length - 1].t * 10) / 10; continue; }
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

export function mapBackendRoute(route: AnalyzeRoute, origin: string, destination: string): RouteData {
  const evaluation = pickEvaluation(route);
  const heat = evaluation?.heat_data ?? [];
  const avgTemp = averageHeatTemp(heat);
  const geometryCoords = (route.geometry?.coordinates ?? []).map(
    ([lng, lat]: [number, number]) => ({ lat, lng })
  );
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
    name: route.name || "Route",
    via: route.name || "",
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

function backendLevelToDockRisk(level: string): string {
  switch (level.toUpperCase()) {
    case "LOW": return "low";
    case "MODERATE": return "moderate";
    case "HIGH":
    case "VERY_HIGH": return "high";
    case "EXTREME": return "extreme";
    default: return "moderate";
  }
}

function formatDepartureLabel(iso: string): string {
  const d = new Date(iso);
  const hour12 = d.getHours() % 12 || 12;
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${hour12}${ampm}`;
}

export function buildDepartureHours(
  route: RouteData | undefined,
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
      const risk = ev.risk?.level
        ? backendLevelToDockRisk(ev.risk.level)
        : temp >= 40 ? "extreme" : temp >= 35 ? "high" : temp >= 30 ? "moderate" : "low";
      return {
        label: formatDepartureLabel(ev.departure_time),
        tempValue: Math.round(temp),
        risk,
        routeScore: rec?.route_score ?? ev.route_score ?? null,
        isBest: best ? ev.departure_time === best.departure_time : undefined,
        departureTime: ev.departure_time,
      };
    })
    .filter((h): h is DepartureHourInfo => h !== null);
}
