/**
 * Route API Service
 * Handles communication with backend route analysis endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const ROUTE_ANALYZE_ENDPOINT = `${API_BASE_URL}/api/routes/analyze/`;
const LOCATION_AUTOCOMPLETE_ENDPOINT = `${API_BASE_URL}/api/routes/locations/autocomplete/`;

// ==================== TYPES ====================

export interface RouteAnalysisRequest {
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

export interface HeatDataPoint {
  lat: number;
  lon: number;
  temperature: number;
  humidity: number;
  heat_index: number;
  uv_index: number;
  aqi: number;
  risk_level: string;
  timestamp: string;
}

export interface POI {
  id: string | null;
  type: string;
  name: string;
  lat: number;
  lon: number;
  distance: number | null;
  address: string | null;
  categories: string[];
}

export interface RouteMetrics {
  max_temperature: number;
  max_humidity: number;
  max_heat_index: number;
  max_aqi: number;
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

export interface WeatherData {
  time?: string;
  temperature?: number;
  feels_like?: number;
  apparent_temperature?: number;
  heat_index?: number;
  humidity?: number;
  precipitation?: number;
  wind_speed?: number;
  uv_index?: number;
  weather_code?: number;
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
  traffic?: {
    traffic_level?: string;
    traffic_score?: number;
    congestion?: number;
    incidents?: { type?: string; description?: string; location?: string }[];
  };
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

export interface RouteAnalysisResponse {
  status: 'success' | 'error';
  recommended_route_id?: string;
  routes_count?: number;
  routes?: AnalyzedRoute[];
  alternatives?: AlternativeRoute[];
  errors?: string[];
}

export interface AutocompleteResult {
  name: string;
  city: string;
  state: string;
  state_name?: string;
  country?: string;
  lat: number;
  lon: number;
  formatted?: string;
  result_type?: string;
  confidence?: number;
}

export interface AutocompleteResponse {
  success: boolean;
  results: AutocompleteResult[];
  error?: string;
}

// ==================== API FUNCTIONS ====================

/**
 * Analyze route between two coordinates
 */
export async function analyzeRoute(
  request: RouteAnalysisRequest
): Promise<RouteAnalysisResponse> {
  try {
    const response = await fetch(ROUTE_ANALYZE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: 'error',
        errors: [
          errorData.errors?.[0] || errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        ],
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      status: 'error',
      errors: [
        error instanceof Error ? error.message : 'Failed to connect to the backend',
      ],
    };
  }
}

/**
 * Search for locations by name (autocomplete)
 */
export async function searchLocations(
  query: string,
  limit: number = 5
): Promise<AutocompleteResponse> {
  if (!query || query.length < 2) {
    return { success: true, results: [] };
  }

  try {
    const url = new URL(LOCATION_AUTOCOMPLETE_ENDPOINT);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        results: [],
        error: data.error || 'Autocomplete failed',
      };
    }

    // Transform backend response to frontend format
    const results: AutocompleteResult[] = (data.results || []).map((r: {
      name?: string;
      formatted?: string;
      city?: string;
      state?: string;
      state_name?: string;
      country_code?: string;
      lat: number;
      lon: number;
      result_type?: string;
      confidence?: number;
    }) => ({
      name: r.name || r.formatted,
      city: r.city || r.name || '',
      state: r.state || r.state_name || '',
      country: r.country_code || 'US',
      lat: r.lat,
      lon: r.lon,
      formatted: r.formatted,
      result_type: r.result_type,
      confidence: r.confidence,
    }));

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Autocomplete request failed',
    };
  }
}

/**
 * Geocode a city name to coordinates
 * Note: This is deprecated. Use searchLocations() instead.
 * @deprecated Use searchLocations() for geocoding
 */
export async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  if (!cityName) return null;

  const result = await searchLocations(cityName, 1);
  if (result.success && result.results.length > 0) {
    const location = result.results[0];
    return {
      lat: location.lat,
      lng: location.lon,
    };
  }

  return null;
}

// ==================== HELPERS ====================

/**
 * Validate route analysis request
 */
export function validateRouteRequest(request: RouteAnalysisRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request || typeof request !== 'object') {
    errors.push('Request object is required');
    return { valid: false, errors };
  }

  if (typeof request.origin_lat !== 'number' || isNaN(request.origin_lat)) {
    errors.push('origin_lat must be a valid number');
  }

  if (typeof request.origin_lng !== 'number' || isNaN(request.origin_lng)) {
    errors.push('origin_lng must be a valid number');
  }

  if (typeof request.destination_lat !== 'number' || isNaN(request.destination_lat)) {
    errors.push('destination_lat must be a valid number');
  }

  if (typeof request.destination_lng !== 'number' || isNaN(request.destination_lng)) {
    errors.push('destination_lng must be a valid number');
  }

  // Validate coordinate ranges
  if (request.origin_lat < -90 || request.origin_lat > 90) {
    errors.push('origin_lat must be between -90 and 90');
  }

  if (request.origin_lng < -180 || request.origin_lng > 180) {
    errors.push('origin_lng must be between -180 and 180');
  }

  if (request.destination_lat < -90 || request.destination_lat > 90) {
    errors.push('destination_lat must be between -90 and 90');
  }

  if (request.destination_lng < -180 || request.destination_lng > 180) {
    errors.push('destination_lng must be between -180 and 180');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format location name from autocomplete result
 */
export function formatLocationName(location: AutocompleteResult): string {
  if (location.formatted) {
    return location.formatted;
  }

  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }

  if (location.name) {
    return location.name;
  }

  return `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
}
