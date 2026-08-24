export type RiskLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface Camera {
  id: string;
  name: string;
  location: Coordinate;
  roadName: string;
  direction: string;
  status: 'active' | 'inactive' | 'maintenance';
  lastUpdated: Date;
  streamUrl?: string;
  thumbnailUrl?: string;
  description?: string;
}

export interface Stop {
  id: string;
  name: string;
  type: 'fuel' | 'rest' | 'meal' | 'heat_break' | 'lodging';
  location: Coordinate;
  roadName: string;
  distanceFromOrigin: number;
  estimatedArrivalTime: number;
  isRecommended: boolean;
  isHeatAware: boolean;
  services?: string[];
  description?: string;
}

export interface TripPlan {
  routeId: string;
  tripDuration: number;
  stopStrategy: 'none' | 'optional' | 'recommended' | 'structured';
  recommendedStops: Stop[];
  allStops: Stop[];
  summary: {
    totalStops: number;
    estimatedTotalStopTime: number;
    fuelStops: number;
    mealStops: number;
    restStops: number;
  };
}

export interface Recommendation {
  action: 'leave_now' | 'wait' | 'avoid';
  routeId: string;
  departureHourOffset: number;
  departureTime: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';
  reasoning: string[];
  alternatives?: {
    routeId: string;
    reason: string;
  }[];
}

export interface DepartureOption {
  hourOffset: number;
  time: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';
  temperature: number;
  recommended: boolean;
  reason?: string;
}

export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Location {
  name: string;
  address?: string;
  coordinates: Coordinate;
  city: string;
  state: string;
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
  distance: number;
  duration: number;
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
    shadeCoverage: number;
    restStops: number;
    fuelStations: number;
    trafficLevel: 'light' | 'moderate' | 'heavy';
  };
}

export interface HeatRiskPoint {
  hourOffset: number;
  timestamp: Date;
  temperature: number;
  heatIndex: number;
  riskLevel: RiskLevel;
  humidity: number;
  uvIndex: number;
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

export interface RouteWithTripPlan extends Route {
  tripPlan?: TripPlan;
}
