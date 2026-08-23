/**
 * Centralized Type Definitions
 * Single source of truth for all shared types
 */

// ==================== RISK TYPES ====================

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

export interface RiskScore {
  score: number;
  level: RiskLevel;
}

// ==================== WEATHER TYPES ====================

export interface WeatherCondition {
  temperature: number; // Celsius
  humidity: number; // Percentage
  heatIndex: number; // Celsius
  uvIndex: number;
  windSpeed: number; // km/h
  condition: string;
  time: string; // ISO timestamp
}

// ==================== GEO TYPES ====================

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Location extends Coordinates {
  id?: string;
  name: string;
  formatted?: string;
  city: string;
  state: string;
  country?: string;
  confidence?: number;
}

// ==================== ROUTE TYPES ====================

export interface RouteSegment {
  id: number;
  temperature: number;
  humidity: number;
  heatIndex: number;
  aqi: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface RouteMetrics {
  max_temperature: number;
  max_humidity: number;
  max_heat_index: number;
  max_aqi: number;
  max_uv_index: number;
}

export interface CriticalSegment {
  segment_id: number;
  risk_score: number;
  risk_level: string;
}

export interface RouteRisk {
  score: number;
  level: string;
  critical_segments: CriticalSegment[];
  metrics: RouteMetrics;
}

export interface POI {
  id: string | null;
  type: POIType;
  name: string;
  lat: number;
  lon: number;
  distance: number | null;
  address: string | null;
  categories: string[];
}

export type POIType = 'rest' | 'fuel' | 'dining' | 'medical' | 'camera' | 'shelter' | 'water' | 'indoor' | 'other';

export interface TrafficData {
  success?: boolean;
  traffic_level?: string;
  traffic_score?: number;
  congestion?: number;
  current_speed?: number | null;
  free_flow_speed?: number | null;
  current_travel_time?: number | null;
  free_flow_travel_time?: number | null;
  confidence?: number | null;
  incidents?: TrafficIncident[];
  error?: string;
}

export interface TrafficIncident {
  id?: string;
  type?: string;
  icon_category?: string;
  magnitude?: number;
  delay_seconds?: number;
  length_meters?: number;
  start_time?: string;
  end_time?: string;
  from?: string;
  to?: string;
  road_numbers?: string[];
  probability_of_occurrence?: number;
  description?: string;
}

export interface AnalyzedRoute {
  id: string;
  route_id?: string;
  distance_km: number;
  duration_min: number;
  geometry: {
    coordinates: [number, number][];
  };
  heat_data: HeatDataPoint[];
  pois: POI[];
  risk: RouteRisk;
  weather: WeatherData;
  hourly_conditions: WeatherData[];
  traffic?: TrafficData;
}

export interface AlternativeRoute {
  route_id: string;
  risk_score: number;
  risk_level: string;
  distance_km: number;
  duration_min: number;
  traffic_level?: string;
  traffic_score?: number;
  congestion?: number;
}

export interface RouteAnalysisRequest {
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

export interface RouteAnalysisResponse {
  status: 'success' | 'error';
  recommended_route_id?: string;
  routes_count?: number;
  routes?: AnalyzedRoute[];
  alternatives?: AlternativeRoute[];
  errors?: string[];
}

// ==================== HEAT DATA TYPES ====================

export interface HeatDataPoint {
  lat: number;
  lon: number;
  temperature: number; // Celsius
  humidity: number; // Percentage
  heat_index: number; // Celsius
  uv_index: number;
  aqi: number;
  risk_level: string;
  timestamp: string;
}

// ==================== WEATHER DATA TYPES ====================

export interface WeatherData {
  time?: string;
  temperature?: number; // Celsius
  feels_like?: number;
  humidity?: number;
  precipitation?: number;
  wind_speed?: number;
  uv_index?: number;
  weather_code?: number;
}

// ==================== CAMERA TYPES ====================

export interface Camera {
  id: string;
  name: string;
  location: Coordinates;
  roadName: string;
  direction: string;
  status: CameraStatus;
  lastUpdated: Date;
  streamUrl?: string;
  thumbnailUrl?: string;
  description?: string;
}

export type CameraStatus = 'active' | 'inactive' | 'maintenance';

export interface CameraFeed {
  camera_id: string;
  stream_url: string;
  thumbnail_url?: string;
  is_available: boolean;
}

// ==================== FORECAST TYPES ====================

export interface HourlyForecast {
  hourOffset: number;
  time: Date;
  temperature: number; // Fahrenheit for UI
  heatIndex: number; // Fahrenheit for UI
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  isRecommended: boolean;
  reason: string;
}

export interface DepartureOption {
  hourOffset: number;
  time: string;
  riskLevel: RiskLevel;
  temperature: number;
  recommended: boolean;
  reason?: string;
}

// ==================== RECOMMENDATION TYPES ====================

export interface Recommendation {
  action: 'leave_now' | 'wait' | 'avoid';
  routeId: string;
  departureHourOffset: number;
  departureTime: string;
  riskLevel: RiskLevel;
  reasoning: string[];
  alternatives?: {
    routeId: string;
    reason: string;
  }[];
}

export interface RecommendationOutput {
  headline: string;
  decision: string;
  reason: string;
  key_factors: string[];
  tradeoffs: string[];
  safety_tip: string;
}

// ==================== PLAN TYPES ====================

export interface TripPlan {
  routeId: string;
  tripDuration: number; // minutes
  stopStrategy: 'none' | 'optional' | 'recommended' | 'structured';
  recommendedStops: Stop[];
  allStops: Stop[];
  summary: {
    totalStops: number;
    estimatedTotalStopTime: number; // minutes
    fuelStops: number;
    mealStops: number;
    restStops: number;
  };
}

export type StopType = 'fuel' | 'rest' | 'meal' | 'heat_break' | 'lodging';

export interface Stop {
  id: string;
  name: string;
  type: StopType;
  location: Coordinates;
  roadName: string;
  distanceFromOrigin: number; // miles from start
  estimatedArrivalTime: number; // minutes from departure
  isRecommended: boolean;
  isHeatAware: boolean;
  services?: string[];
  description?: string;
}

// ==================== UI TYPES ====================

export interface RouteCardProps {
  route: AnalyzedRoute;
  index: number;
  isSelected: boolean;
  isRecommended: boolean;
  color: { primary: string; secondary: string };
  onClick: () => void;
}

export interface RouteMapProps {
  routes: AnalyzedRoute[];
  selectedRouteId: string | null;
  onRouteClick: (routeId: string) => void;
  origin?: Coordinates;
  destination?: Coordinates;
  hourlyForecast?: HourlyForecast[];
}

export interface SegmentAnalysisProps {
  route: AnalyzedRoute | null;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  errors?: string[];
  error?: string;
}

export interface AutocompleteResponse {
  success: boolean;
  results: AutocompleteResult[];
  error?: string;
}

export interface AutocompleteResult {
  name: string;
  city: string;
  state: string;
  country?: string;
  lat: number;
  lon: number;
  formatted?: string;
  result_type?: string;
  confidence?: number;
}

// ==================== ERROR TYPES ====================

export interface ApiError {
  message: string;
  code: string;
  status?: number;
  details?: any;
}

export class RouteAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'RouteAnalysisError';
  }
}

export class GeocodingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'GeocodingError';
  }
}
