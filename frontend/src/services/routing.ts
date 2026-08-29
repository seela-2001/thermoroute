import axios from 'axios';

// OSRM public routing API - real road-following routes
const OSRM_BASE = 'https://router.project-osrm.org';

// Local proxy for FortyGuard API (run with: node proxy-server.js)
const PROXY_BASE = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RealRoute {
  geometry: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
}

// --- Routing (OSRM) ---

export async function fetchRoutes(
  origin: Coordinate,
  destination: Coordinate,
  maxRoutes: number = 3
): Promise<RealRoute[]> {
  const coordsStr = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const { data } = await axios.get(`${OSRM_BASE}/route/v1/driving/${coordsStr}`, {
    params: {
      alternatives: maxRoutes - 1,
      overview: 'full',
      geometries: 'geojson',
    },
    timeout: 15000,
  });

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found between these locations');
  }

  return data.routes.slice(0, maxRoutes).map((r: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }) => ({
    geometry: r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
    distanceMeters: r.distance,
    durationSeconds: r.duration,
  }));
}

// Decimate a dense geometry polyline down to `target` evenly spaced points
export function decimateGeometry(coords: Coordinate[], target: number = 60): Coordinate[] {
  if (coords.length <= target) return coords;
  const step = (coords.length - 1) / (target - 1);
  const out: Coordinate[] = [];
  for (let i = 0; i < target; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

// --- Heat data (FortyGuard heatmap job API via local proxy) ---
// FortyGuard works as async jobs: submit polygon -> poll status -> read cell temps.

interface JobStatusData {
  error?: boolean;
  status_code?: number;
  message?: string;
  data?: {
    activity_id?: string;
    status?: string;
    result?: HeatmapResult | null;
  };
  // Some responses may be flat
  activity_id?: string;
  result?: HeatmapResult | null;
}

interface HeatmapResult {
  map_data?: {
    features?: Array<{
      properties?: {
        average_temperature?: number;
        temperature?: number;
        min_temperature?: number;
        max_temperature?: number;
      };
    }>;
  };
}

function parseResultTemperature(result: HeatmapResult | null | undefined): number | null {
  const features = result?.map_data?.features ?? [];
  const temps: number[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    for (const key of ['average_temperature', 'temperature', 'min_temperature', 'max_temperature'] as const) {
      const v = p[key];
      if (typeof v === 'number' && !Number.isNaN(v)) {
        temps.push(v);
        break;
      }
    }
  }
  if (temps.length === 0) return null;
  return temps.reduce((a, b) => a + b, 0) / temps.length;
}

function buildPolygonPayload(lat: number, lng: number, radiusKm = 1.5, now = new Date()) {
  const latOffset = radiusKm / 111.0;
  const lonOffset = radiusKm / (111.0 * Math.max(0.2, Math.abs(Math.cos((lat * Math.PI) / 180))));

  const ring = [
    [lng - lonOffset, lat - latOffset],
    [lng + lonOffset, lat - latOffset],
    [lng + lonOffset, lat + latOffset],
    [lng - lonOffset, lat + latOffset],
    [lng - lonOffset, lat - latOffset],
  ];

  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    polygon_aoi: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [ring] },
        },
      ],
    },
    date_time: {
      start_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      start_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      filter_type: 1,
    },
    granularity: 100,
    analysis_type: 'tcm',
  };
}

export async function fetchPointTemperature(lat: number, lng: number): Promise<number | null> {
  try {
    // 1. Submit the heatmap job
    const submit = await axios.post<JobStatusData>(
      `${PROXY_BASE}/heatmap`,
      buildPolygonPayload(lat, lng),
      { timeout: 15000 }
    );

    const submitData = submit.data;
    const resultNow =
      submitData.result ?? submitData.data?.result ?? null;
    const immediate = parseResultTemperature(resultNow);
    if (immediate !== null) return Math.round(immediate * 10) / 10;

    const activityId = submitData.data?.activity_id ?? submitData.activity_id;
    if (!activityId) {
      console.error(`No activity_id for point ${lat},${lng}`, submitData);
      return null;
    }

    // 2. Poll status until Completed (max ~75s)
    const maxAttempts = 25;
    const intervalMs = 3000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const poll = await axios.get<JobStatusData>(`${PROXY_BASE}/status/${activityId}`, {
          timeout: 10000,
        });
        const d = poll.data.data;
        const status = (d?.status ?? '').toLowerCase();
        if (status === 'completed') {
          const temp = parseResultTemperature(d?.result);
          if (temp !== null) return Math.round(temp * 10) / 10;
          console.warn(`Job ${activityId} completed with no cells at ${lat},${lng}`);
          return null;
        }
        if (status === 'failed' || status === 'error') {
          console.error(`Job ${activityId} failed`);
          return null;
        }
      } catch {
        // transient poll errors - keep polling
      }
    }

    console.error(`Heat job timed out for ${lat},${lng}`);
    return null;
  } catch (error) {
    console.error(`Heat data failed for ${lat.toFixed(3)},${lng.toFixed(3)}:`, error);
    return null;
  }
}

// Fetch temperatures at sample points along a route and interpolate across all points.
// Returns per-point real-interpolated temps + route averages. Nulls only when API is unreachable.
export async function fetchRouteTemperatures(
  waypoints: Coordinate[],
  sampleCount: number = 5
): Promise<{
  pointTemps: number[] | null; // one per waypoint (interpolated), null if API unavailable
  avgTemp: number | null;
  maxTemp: number | null;
}> {
  const n = waypoints.length;
  const sampleIdx: number[] = [];
  for (let s = 0; s < sampleCount; s++) {
    sampleIdx.push(Math.min(n - 1, Math.round((s * (n - 1)) / (sampleCount - 1))));
  }
  const uniqueIdx = [...new Set(sampleIdx)];

  const results = await Promise.allSettled(
    uniqueIdx.map((i) => fetchPointTemperature(waypoints[i].lat, waypoints[i].lng))
  );

  const tempByIndex = new Map<number, number>();
  results.forEach((r, k) => {
    if (r.status === 'fulfilled' && r.value !== null) {
      tempByIndex.set(uniqueIdx[k], r.value);
    }
  });

  // If the heat API is entirely unavailable, report that to the caller
  if (tempByIndex.size === 0) {
    return { pointTemps: null, avgTemp: null, maxTemp: null };
  }

  // Fill unsampled indices by nearest-available linear interpolation
  const tempsAt = new Array<number>(n).fill(NaN);
  tempByIndex.forEach((t, i) => (tempsAt[i] = t));

  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(tempsAt[i])) continue;
    let prev = -1;
    let next = -1;
    for (let j = i - 1; j >= 0; j--) if (!Number.isNaN(tempsAt[j])) { prev = j; break; }
    for (let j = i + 1; j < n; j++) if (!Number.isNaN(tempsAt[j])) { next = j; break; }
    if (prev === -1 && next === -1) continue;
    if (prev === -1) { tempsAt[i] = tempsAt[next]; continue; }
    if (next === -1) { tempsAt[i] = tempsAt[prev]; continue; }
    const ratio = (i - prev) / (next - prev);
    tempsAt[i] = tempsAt[prev] + (tempsAt[next] - tempsAt[prev]) * ratio;
  }

  // Any remaining NaN edges get clamped to the closest known value
  const known = tempsAt.filter((t) => !Number.isNaN(t));
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(tempsAt[i])) tempsAt[i] = known.length ? known[0] : 0;
  }

  const valid = tempsAt.filter((t) => !Number.isNaN(t));
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return {
    pointTemps: tempsAt.map((t) => Math.round(t * 10) / 10),
    avgTemp: Math.round(avg * 10) / 10,
    maxTemp: Math.round(Math.max(...valid) * 10) / 10,
  };
}

export function riskFromTemp(temp: number): 'Low' | 'Medium' | 'High' {
  if (temp >= 40) return 'High';
  if (temp >= 35) return 'Medium';
  if (temp >= 32) return 'Medium';
  return 'Low';
}

// --- Formatting helpers ---

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km >= 100) return `${Math.round(km * 0.621371)} mi`;
  return `${km.toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

// --- Hourly forecast (Open-Meteo, no key required) ---

export interface ForecastHour {
  label: string;
  time: Date;
  tempValue: number;
  risk: string;
}

export async function fetchHourlyForecast(
  lat: number,
  lng: number,
  hoursCount: number = 9
): Promise<ForecastHour[]> {
  const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
    params: {
      latitude: lat,
      longitude: lng,
      hourly: 'temperature_2m',
      forecast_days: 2,
      timezone: 'auto',
    },
    timeout: 10000,
  });

  const times: string[] = data.hourly?.time ?? [];
  const temps: number[] = data.hourly?.temperature_2m ?? [];

  // Find first index at/after the current hour
  const now = new Date();
  let start = times.findIndex((t) => new Date(t) >= new Date(now.getTime() - 60 * 60 * 1000));
  if (start === -1) start = 0;

  const out: ForecastHour[] = [];
  for (let i = start; i < Math.min(start + hoursCount, times.length); i++) {
    const d = new Date(times[i]);
    const hour12 = d.getHours() % 12 || 12;
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    const temp = Math.round(temps[i]);
    const risk =
      temp >= 40 ? 'extreme' : temp >= 36 ? 'high' : temp >= 32 ? 'moderate' : 'low';
    out.push({ label: `${hour12}${ampm}`, time: d, tempValue: temp, risk });
  }
  return out;
}
