export * from './index';
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
