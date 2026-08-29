import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface RouteRequest {
  origin: string;
  destination: string;
  stops?: string[];
}

export interface RouteResponse {
  id: string;
  name: string;
  distance: string;
  duration: string;
  temperature: string;
  heatRisk: 'Low' | 'Medium' | 'High';
  geometry?: unknown;
  waypoints: Array<{ lat: number; lng: number; name: string }>;
}

export interface RoutesAnalysisResponse {
  routes: RouteResponse[];
  origin: string;
  destination: string;
  stops: string[];
}

export interface AnalyzeRequest {
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  jurisdiction: string;
  departure_start?: string;
  departure_end?: string;
  step_minutes?: number;
  weather_weight?: number;
  time_weight?: number;
  traffic_aware?: boolean;
}

export interface AnalyzeHeatPoint {
  lat: number;
  lon: number;
  name?: string | null;
  temperature: number;
  humidity: number;
  heat_index: number;
  uv_index?: number | null;
  aqi?: number | null;
  precipitation_mm?: number | null;
  precipitation_probability?: number | null;
  wind_speed_ms?: number | null;
  risk_level: string;
  eta: string;
  distance_from_origin_m?: number | null;
  cumulative_duration_seconds?: number | null;
}

export interface AnalyzeCamera {
  id: string | null;
  name: string;
  lat: number;
  lon: number;
  road_name?: string | null;
  direction?: string | null;
  image_url?: string | null;
  stream_url?: string | null;
}

export interface AnalyzePoi {
  id: string | null;
  type: string;
  name: string;
  lat: number;
  lon: number;
  distance?: number | null;
  address?: string | null;
}

export interface AnalyzeEvaluation {
  departure_time: string;
  route_score: number | null;
  weather_score: number | null;
  time_score: number | null;
  risk: {
    score: number;
    level: string;
    critical_segments: Array<{ segment_id: number; risk_score: number; risk_level: string }>;
    metrics: { max_temperature?: number; max_humidity?: number; max_heat_index?: number; max_aqi?: number } | null;
  } | null;
  heat_data: AnalyzeHeatPoint[];
  errors: unknown[];
}

export interface AnalyzeSegment {
  lat: number;
  lon: number;
  distance_from_origin_m?: number | null;
  pois: AnalyzePoi[];
}

export interface AnalyzeRoute {
  id: string;
  name?: string | null;
  distance_km: number;
  duration_min: number;
  geometry?: {
    type: string;
    coordinates: [number, number][];
  } | null;
  evaluations: AnalyzeEvaluation[];
  pois: AnalyzePoi[];
  segments?: AnalyzeSegment[];
  cameras: AnalyzeCamera[];
}

export interface CriticalAlert {
  risk_level: string;
  risk_score: number;
  distance_km: number;
  temperature: number;
  temp_above_avg: number;
  eta_time: string;
  message: string;
}

export interface CoolingStop {
  type: string;
  name: string;
  lat: number | null;
  lon: number | null;
  distance_km: number;
  eta_time: string;
  message: string;
}

export interface AnalyzeResponse {
  status: string;
  recommended_route_id: string | null;
  routes_count: number;
  weights: { weather: number; time: number };
  departure_count: number;
  best_departure: {
    departure_time: string;
    recommended_route_id: string;
    route_score: number;
    weather_score: number;
    time_score: number;
  } | null;
  departure_recommendations: Array<{
    departure_time: string;
    recommended_route_id: string | null;
    route_score: number | null;
  }>;
  routes: AnalyzeRoute[];
  alternatives: unknown[];
  recommendation: {
    headline: string;
    decision: string;
    reason: string;
    key_factors: string[];
    safety_tip: string;
    alerts: CriticalAlert[];
    cooling_stops: CoolingStop[];
  } | null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const routesApi = {
  planRoute: async (request: RouteRequest): Promise<RouteResponse> => {
    const response = await api.post('/routes/plan/', request);
    return response.data;
  },

  analyzeRoutes: async (request: RouteRequest): Promise<RoutesAnalysisResponse> => {
    const response = await api.post('/routes/analyze/', request);
    return response.data;
  },

  analyze: async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await api.post('/routes/analyze/', request, { timeout: 600000 });
    return response.data;
  },

  getHeatData: async (lat: number, lon: number, radiusKm: number = 1) => {
    const response = await api.get('/heat/data/', {
      params: { lat, lon, radius_km: radiusKm },
    });
    return response.data;
  },
};

export default api;
