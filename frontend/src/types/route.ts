/**
 * ThermoDispatch Type Definitions
 *
 * These interfaces define the data structure for route planning, heat risk analysis,
 * and camera inspection. They are designed to be compatible with future API responses.
 */

export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Location {
  name: string;
  address?: string;
  coordinates: Coordinate;
  city: string;
  state: string;
}

export interface Camera {
  id: string;
  name: string;
  location: Coordinate;
  roadName: string;
  direction: string;
  status: 'active' | 'inactive' | 'maintenance';
  lastUpdated: Date;
  imageUrl?: string;
  description?: string;
}

export interface HeatRiskPoint {
  hourOffset: number; // 0-12 hours from now
  timestamp: Date;
  temperature: number; // Fahrenheit
  heatIndex: number;
  riskLevel: RiskLevel;
  humidity: number;
  uvIndex: number;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  location: Coordinate;
  type: 'origin' | 'destination' | 'waypoint' | 'camera';
}

export interface Route {
  id: string;
  name: string;
  description: string;
  distance: number; // miles
  duration: number; // minutes
  origin: Location;
  destination: Location;
  waypoints: RouteWaypoint[];
  cameras: Camera[];
  highways: string[];
  currentRisk: RiskLevel;
  currentTemperature: number;
  heatRisk: HeatRiskPoint[];
  isRecommended: boolean;
  features: {
    shadeCoverage: number; // percentage
    restStops: number;
    fuelStations: number;
    trafficLevel: 'light' | 'moderate' | 'heavy';
  };
}

export interface DepartureOption {
  hourOffset: number;
  time: string;
  riskLevel: RiskLevel;
  temperature: number;
  recommended: boolean;
  reason?: string;
}

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

export interface RoutePlan {
  origin: Location;
  destination: Location;
  routes: Route[];
  recommendation: Recommendation;
  departureOptions: DepartureOption[];
  currentConditions: {
    temperature: number;
    humidity: number;
    heatIndex: number;
    uvIndex: number;
    riskLevel: RiskLevel;
  };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapStyle {
  showCameras: boolean;
  showAlternativeRoutes: boolean;
  showWeatherOverlay: boolean;
}

export type StopType = 'fuel' | 'rest' | 'meal' | 'heat_break' | 'lodging';

export interface Stop {
  id: string;
  name: string;
  type: StopType;
  location: Coordinate;
  roadName: string;
  distanceFromOrigin: number; // miles from start
  estimatedArrivalTime: number; // minutes from departure
  isRecommended: boolean;
  isHeatAware: boolean; // If true, this stop is recommended due to heat risk
  services?: string[]; // e.g., ['fuel', 'food', 'restrooms', 'shaded_rest_area']
  description?: string;
}

export interface TripPlan {
  routeId: string;
  tripDuration: number; // minutes
  stopStrategy: 'none' | 'optional' | 'recommended' | 'structured';
  recommendedStops: Stop[]; // Small set of key stops
  allStops: Stop[]; // All available stops for "view all"
  summary: {
    totalStops: number;
    estimatedTotalStopTime: number; // minutes
    fuelStops: number;
    mealStops: number;
    restStops: number;
  };
}

export interface RouteWithTripPlan extends Route {
  tripPlan?: TripPlan;
}
