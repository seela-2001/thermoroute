/**
 * Mock Route Data
 *
 * Realistic mock data for the Houston, TX to Dallas, TX route.
 * This simulates what will eventually come from the FortyGuard/route APIs.
 */

import type { Route, Location, RouteWaypoint, HeatRiskPoint, DepartureOption, Recommendation, Camera, Stop, TripPlan, StopType } from '@/types/route';

const now = new Date();
const currentHour = now.getHours();

// Create heat risk points for the next 12 hours
const createHeatRiskPoints = (baseTemp: number, peakHour: number, riskPattern: ('low' | 'moderate' | 'high' | 'extreme')[]): HeatRiskPoint[] => {
  return riskPattern.map((risk, index) => {
    const timestamp = new Date(now.getTime() + index * 60 * 60 * 1000);
    const tempOffset = Math.abs(index - peakHour) * -2;
    return {
      hourOffset: index,
      timestamp,
      temperature: Math.round(baseTemp + tempOffset + (Math.random() * 2 - 1)),
      heatIndex: Math.round(baseTemp + tempOffset + 3 + (Math.random() * 2 - 1)),
      riskLevel: risk,
      humidity: Math.round(45 + Math.random() * 20),
      uvIndex: Math.round(5 + Math.random() * 5),
    };
  });
};

// Locations
const houston: Location = {
  name: 'Houston, TX',
  coordinates: { lat: 29.7604, lng: -95.3698 },
  city: 'Houston',
  state: 'TX',
};

const dallas: Location = {
  name: 'Dallas, TX',
  coordinates: { lat: 32.7767, lng: -96.7970 },
  city: 'Dallas',
  state: 'TX',
};

// Cameras along routes
const cameras: Camera[] = [
  {
    id: 'cam-001',
    name: 'I-45 at FM 1960',
    location: { lat: 29.9514, lng: -95.4642 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: 'cam-002',
    name: 'I-45 at Spring Cypress',
    location: { lat: 30.0342, lng: -95.4815 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: 'cam-003',
    name: 'I-45 at Conroe',
    location: { lat: 30.3114, lng: -95.4567 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    id: 'cam-004',
    name: 'I-45 at Huntsville',
    location: { lat: 30.7231, lng: -95.5814 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 'cam-005',
    name: 'US-190 at Centerville',
    location: { lat: 31.2567, lng: -96.3214 },
    roadName: 'US-190 West',
    direction: 'Westbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    id: 'cam-006',
    name: 'I-45 at Buffalo',
    location: { lat: 31.4614, lng: -95.6819 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 1 * 60 * 1000),
  },
  {
    id: 'cam-007',
    name: 'I-45 at Corsicana',
    location: { lat: 32.0851, lng: -96.4617 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 4 * 60 * 1000),
  },
  {
    id: 'cam-008',
    name: 'I-45 at Ennis',
    location: { lat: 32.3299, lng: -96.6312 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 7 * 60 * 1000),
  },
  {
    id: 'cam-009',
    name: 'I-45 at I-635',
    location: { lat: 32.6814, lng: -96.7615 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: 'cam-010',
    name: 'I-45 at Downtown Dallas',
    location: { lat: 32.7714, lng: -96.7919 },
    roadName: 'I-45 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 1 * 60 * 1000),
  },
  {
    id: 'cam-011',
    name: 'I-35E at Waco',
    location: { lat: 31.5493, lng: -97.1467 },
    roadName: 'I-35E North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 6 * 60 * 1000),
  },
  {
    id: 'cam-012',
    name: 'US-77 at Temple',
    location: { lat: 31.0982, lng: -97.3421 },
    roadName: 'US-77 North',
    direction: 'Northbound',
    status: 'active',
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
  },
];

export { cameras };

// ============================================
// TRIP PLANNING & STOP INTELLIGENCE
// ============================================

/**
 * Generate intelligent stops along a route based on trip duration.
 * This function creates stop recommendations that adapt to trip length:
 * - < 4 hours: Minimal stops, optional
 * - 4-7 hours: A few recommended stops
 * - 7-10 hours: Active fuel/rest stop recommendations
 * - 10+ hours: Structured trip-stop plan
 */
export function generateTripPlan(
  routeId: string,
  duration: number, // minutes
  distance: number, // miles
  heatRiskPoints: HeatRiskPoint[],
  departureHourOffset: number = 0
): TripPlan {
  const hours = duration / 60;

  // Determine stop strategy based on trip length
  let stopStrategy: TripPlan['stopStrategy'];
  let recommendedStops: Stop[] = [];
  let allStops: Stop[] = [];

  if (hours < 4) {
    stopStrategy = 'none';
    // No mandatory stops for short trips
    recommendedStops = [];
    allStops = generateAllStops(routeId, distance, duration, 0.3); // Fewer stops
  } else if (hours < 7) {
    stopStrategy = 'optional';
    // 1-2 recommended stops
    recommendedStops = generateRecommendedStops(routeId, distance, duration, 2, heatRiskPoints, departureHourOffset);
    allStops = generateAllStops(routeId, distance, duration, 0.5);
  } else if (hours < 10) {
    stopStrategy = 'recommended';
    // 2-3 strategic stops
    recommendedStops = generateRecommendedStops(routeId, distance, duration, 3, heatRiskPoints, departureHourOffset);
    allStops = generateAllStops(routeId, distance, duration, 0.7);
  } else {
    stopStrategy = 'structured';
    // 3-4 structured stops for very long trips
    recommendedStops = generateRecommendedStops(routeId, distance, duration, 4, heatRiskPoints, departureHourOffset);
    allStops = generateAllStops(routeId, distance, duration, 1);
  }

  // Calculate summary
  const summary = {
    totalStops: recommendedStops.length,
    estimatedTotalStopTime: calculateTotalStopTime(recommendedStops),
    fuelStops: recommendedStops.filter(s => s.type === 'fuel').length,
    mealStops: recommendedStops.filter(s => s.type === 'meal' || s.type === 'rest').length,
    restStops: recommendedStops.filter(s => s.type === 'rest' || s.type === 'heat_break').length,
  };

  return {
    routeId,
    tripDuration: duration,
    stopStrategy,
    recommendedStops,
    allStops,
    summary,
  };
}

/**
 * Generate recommended stops at strategic points along the route.
 * Spacing logic:
 * - Fuel stop: ~2-3 hours into trip (or earlier if long trip)
 * - Meal/Rest stop: Around midpoint (4-5 hours)
 * - Additional stops: Every 2-3 hours for very long trips
 */
function generateRecommendedStops(
  routeId: string,
  distance: number,
  duration: number,
  maxStops: number,
  heatRiskPoints: HeatRiskPoint[],
  departureHourOffset: number
): Stop[] {
  const stops: Stop[] = [];
  const hours = duration / 60;

  // Find highest heat risk period during the trip
  const tripHeatRisk = heatRiskPoints.slice(0, Math.min(Math.ceil(hours), 12));
  const highestRiskHour = tripHeatRisk.reduce((max, point, idx) =>
    getRiskSeverity(point.riskLevel) > getRiskSeverity(tripHeatRisk[max].riskLevel) ? idx : max,
    0
  );

  // Stop 1: Fuel stop (if trip is 4+ hours)
  if (hours >= 4 && maxStops >= 1) {
    const fuelStopTime = Math.min(135, duration * 0.25); // ~2h 15m, but max 25% of trip
    const fuelStopDistance = (fuelStopTime / duration) * distance;
    const isHeatAware = Math.abs(fuelStopTime / 60 - highestRiskHour) < 1;

    stops.push(createStop({
      id: `${routeId}-stop-1`,
      type: isHeatAware ? 'heat_break' : 'fuel',
      name: isHeatAware
        ? 'Buc-ee\'s (Heat-Aware Stop)'
        : 'Buc-ee\'s',
      roadName: 'I-45 North',
      distanceFromOrigin: fuelStopDistance,
      estimatedArrivalTime: fuelStopTime,
      isRecommended: true,
      isHeatAware,
      services: isHeatAware ? ['fuel', 'food', 'restrooms', 'shaded_rest_area', 'indoor_seating'] : ['fuel', 'food', 'restrooms'],
      description: isHeatAware
        ? 'Recommended during peak heat. Air-conditioned rest area available.'
        : 'Full service travel center with fuel, food, and restrooms.',
    }));
  }

  // Stop 2: Meal/Rest stop around midpoint (if trip is 5+ hours)
  if (hours >= 5 && maxStops >= 2) {
    const mealStopTime = duration * 0.5; // Midpoint
    const mealStopDistance = distance * 0.5;
    const isHeatAware = Math.abs(mealStopTime / 60 - highestRiskHour) < 1.5;

    stops.push(createStop({
      id: `${routeId}-stop-2`,
      type: isHeatAware ? 'heat_break' : 'meal',
      name: isHeatAware
        ? 'Texas Roadhouse (Heat-Aware Break)'
        : 'Texas Roadhouse',
      roadName: 'I-45 North',
      distanceFromOrigin: mealStopDistance,
      estimatedArrivalTime: mealStopTime,
      isRecommended: true,
      isHeatAware,
      services: ['food', 'restrooms', 'indoor_seating'],
      description: isHeatAware
        ? 'Good meal stop with cool indoor dining. Break during warmest period.'
        : 'Full-service restaurant for a proper meal break.',
    }));
  }

  // Stop 3: Second fuel/short break (if trip is 7+ hours)
  if (hours >= 7 && maxStops >= 3) {
    const fuelStopTime = duration * 0.75; // 75% of trip
    const fuelStopDistance = distance * 0.75;
    const isHeatAware = Math.abs(fuelStopTime / 60 - highestRiskHour) < 1;

    stops.push(createStop({
      id: `${routeId}-stop-3`,
      type: isHeatAware ? 'heat_break' : 'fuel',
      name: isHeatAware
        ? 'Travel Center (Heat-Aware Stop)'
        : 'Travel Center',
      roadName: 'I-45 North',
      distanceFromOrigin: fuelStopDistance,
      estimatedArrivalTime: fuelStopTime,
      isRecommended: true,
      isHeatAware,
      services: isHeatAware ? ['fuel', 'restrooms', 'shaded_rest_area'] : ['fuel', 'restrooms'],
      description: isHeatAware
        ? 'Quick fuel and cool-down break before final stretch.'
        : 'Convenient fuel stop with restrooms.',
    }));
  }

  // Stop 4: Additional rest for very long trips (10+ hours)
  if (hours >= 10 && maxStops >= 4) {
    const restStopTime = duration * 0.4; // Before midpoint
    const restStopDistance = distance * 0.4;

    stops.push(createStop({
      id: `${routeId}-stop-4`,
      type: 'rest',
      name: 'Rest Area',
      roadName: 'I-45 North',
      distanceFromOrigin: restStopDistance,
      estimatedArrivalTime: restStopTime,
      isRecommended: true,
      isHeatAware: false,
      services: ['restrooms', 'picnic_area'],
      description: 'Texas DOT rest area with picnic tables.',
    }));
  }

  // Sort by time
  return stops.sort((a, b) => a.estimatedArrivalTime - b.estimatedArrivalTime);
}

/**
 * Generate all available stops along the route (for "view all" feature)
 */
function generateAllStops(
  routeId: string,
  distance: number,
  duration: number,
  density: number // 0-1, controls number of stops
): Stop[] {
  const stops: Stop[] = [];
  const numStops = Math.floor(8 + (density * 12)); // 8-20 stops

  for (let i = 0; i < numStops; i++) {
    const progress = (i + 1) / (numStops + 1);
    const stopTime = duration * progress;
    const stopDistance = distance * progress;

    // Vary stop types
    const stopType: StopType = ['fuel', 'rest', 'meal', 'fuel', 'rest'][i % 5];
    const isRecommended = false;

    stops.push(createStop({
      id: `${routeId}-all-${i}`,
      type: stopType,
      name: getStopName(stopType, i),
      roadName: 'I-45 North',
      distanceFromOrigin: stopDistance,
      estimatedArrivalTime: stopTime,
      isRecommended,
      isHeatAware: false,
      services: getServicesForType(stopType),
    }));
  }

  return stops;
}

/**
 * Create a Stop object
 */
function createStop(params: {
  id: string;
  type: StopType;
  name: string;
  roadName: string;
  distanceFromOrigin: number;
  estimatedArrivalTime: number;
  isRecommended: boolean;
  isHeatAware: boolean;
  services?: string[];
  description?: string;
}): Stop {
  return {
    id: params.id,
    name: params.name,
    type: params.type,
    location: {
      // Mock location along I-45 between Houston and Dallas
      lat: 29.76 + (params.distanceFromOrigin / 239.3) * (32.78 - 29.76),
      lng: -95.37 + (params.distanceFromOrigin / 239.3) * (-96.80 + 95.37),
    },
    roadName: params.roadName,
    distanceFromOrigin: params.distanceFromOrigin,
    estimatedArrivalTime: params.estimatedArrivalTime,
    isRecommended: params.isRecommended,
    isHeatAware: params.isHeatAware,
    services: params.services,
    description: params.description,
  };
}

/**
 * Get stop name based on type and index
 */
function getStopName(type: StopType, index: number): string {
  const names: Record<StopType, string[]> = {
    fuel: ['Shell', 'Exxon', 'Chevron', 'BP', 'Love\'s', 'Pilot', 'Flying J', 'Sheetz', 'Kum & Go', 'QuikTrip'],
    rest: ['Rest Area', 'Welcome Center', 'Scenic Overlook', 'Park & Ride'],
    meal: ['McDonald\'s', 'Subway', 'Chick-fil-A', 'Whataburger', 'Diner', 'Cafe'],
    heat_break: ['Cooling Station', 'Shaded Rest Area', 'Mall', 'Library'],
    lodging: ['Hampton Inn', 'Holiday Inn', 'Best Western', 'Motel 6'],
  };
  const typeNames = names[type] || names.fuel;
  return typeNames[index % typeNames.length];
}

/**
 * Get typical services for a stop type
 */
function getServicesForType(type: StopType): string[] {
  const services: Record<StopType, string[]> = {
    fuel: ['fuel'],
    rest: ['restrooms', 'picnic_area'],
    meal: ['food', 'restrooms'],
    heat_break: ['restrooms', 'shaded_rest_area', 'indoor_seating'],
    lodging: ['lodging', 'food', 'restrooms'],
  };
  return services[type] || [];
}

/**
 * Calculate total estimated stop time in minutes
 */
function calculateTotalStopTime(stops: Stop[]): number {
  return stops.reduce((total, stop) => {
    switch (stop.type) {
      case 'fuel': return total + 15;
      case 'rest': return total + 20;
      case 'meal': return total + 45;
      case 'heat_break': return total + 25;
      case 'lodging': return total + 0; // Not counted as quick stop
      default: return total + 15;
    }
  }, 0);
}

/**
 * Get numeric severity for risk level (for comparison)
 */
function getRiskSeverity(risk: string): number {
  const severity: Record<string, number> = {
    'low': 1,
    'moderate': 2,
    'high': 3,
    'extreme': 4,
  };
  return severity[risk] || 0;
}

// Routes
export const mockRoutes: Route[] = [
  {
    id: 'route-a',
    name: 'Route A',
    description: 'Direct via I-45 North',
    distance: 239.3,
    duration: 222, // 3h 42m - Short trip, minimal stops
    origin: houston,
    destination: dallas,
    highways: ['I-45 N'],
    cameras: cameras.slice(0, 10),
    currentRisk: 'low',
    currentTemperature: 85,
    heatRisk: createHeatRiskPoints(85, 3, ['low', 'low', 'moderate', 'moderate', 'high', 'high', 'high', 'moderate', 'moderate', 'low', 'low', 'low']),
    isRecommended: true,
    features: {
      shadeCoverage: 35,
      restStops: 8,
      fuelStations: 15,
      trafficLevel: 'moderate',
    },
    waypoints: [
      { id: 'wp-a-1', name: 'Houston, TX', location: houston.coordinates, type: 'origin' },
      { id: 'wp-a-2', name: 'Conroe, TX', location: { lat: 30.3114, lng: -95.4567 }, type: 'waypoint' },
      { id: 'wp-a-3', name: 'Huntsville, TX', location: { lat: 30.7231, lng: -95.5814 }, type: 'waypoint' },
      { id: 'wp-a-4', name: 'Corsicana, TX', location: { lat: 32.0851, lng: -96.4617 }, type: 'waypoint' },
      { id: 'wp-a-5', name: 'Dallas, TX', location: dallas.coordinates, type: 'destination' },
    ],
    tripPlan: generateTripPlan('route-a', 222, 239.3, createHeatRiskPoints(85, 3, ['low', 'low', 'moderate', 'moderate', 'high', 'high', 'high', 'moderate', 'moderate', 'low', 'low', 'low'])),
  },
  {
    id: 'route-b',
    name: 'Route B',
    description: 'Via US-290 and I-35E',
    distance: 254.7,
    duration: 215, // 3h 35m - Short trip
    origin: houston,
    destination: dallas,
    highways: ['US-290 W', 'TX-6 N', 'I-35E N'],
    cameras: cameras.slice(8, 12),
    currentRisk: 'moderate',
    currentTemperature: 92,
    heatRisk: createHeatRiskPoints(92, 2, ['moderate', 'high', 'high', 'high', 'high', 'extreme', 'high', 'moderate', 'moderate', 'moderate', 'low', 'low']),
    isRecommended: false,
    features: {
      shadeCoverage: 25,
      restStops: 6,
      fuelStations: 12,
      trafficLevel: 'light',
    },
    waypoints: [
      { id: 'wp-b-1', name: 'Houston, TX', location: houston.coordinates, type: 'origin' },
      { id: 'wp-b-2', name: 'Brenham, TX', location: { lat: 30.1667, lng: -96.3967 }, type: 'waypoint' },
      { id: 'wp-b-3', name: 'Waco, TX', location: { lat: 31.5493, lng: -97.1467 }, type: 'waypoint' },
      { id: 'wp-b-4', name: 'Dallas, TX', location: dallas.coordinates, type: 'destination' },
    ],
    tripPlan: generateTripPlan('route-b', 215, 254.7, createHeatRiskPoints(92, 2, ['moderate', 'high', 'high', 'high', 'high', 'extreme', 'high', 'moderate', 'moderate', 'moderate', 'low', 'low'])),
  },
  {
    id: 'route-c',
    name: 'Route C',
    description: 'Via TX-6 and I-35E (scenic)',
    distance: 261.2,
    duration: 242, // 4h 02m - Medium trip, optional stops
    origin: houston,
    destination: dallas,
    highways: ['TX-6 N', 'TX-31 W', 'I-35E N'],
    cameras: cameras.slice(4, 9),
    currentRisk: 'low',
    currentTemperature: 84,
    heatRisk: createHeatRiskPoints(84, 4, ['low', 'low', 'low', 'low', 'moderate', 'moderate', 'moderate', 'moderate', 'low', 'low', 'low', 'low']),
    isRecommended: false,
    features: {
      shadeCoverage: 45,
      restStops: 10,
      fuelStations: 8,
      trafficLevel: 'light',
    },
    waypoints: [
      { id: 'wp-c-1', name: 'Houston, TX', location: houston.coordinates, type: 'origin' },
      { id: 'wp-c-2', name: 'College Station, TX', location: { lat: 30.6280, lng: -96.3344 }, type: 'waypoint' },
      { id: 'wp-c-3', name: 'Waco, TX', location: { lat: 31.5493, lng: -97.1467 }, type: 'waypoint' },
      { id: 'wp-c-4', name: 'Dallas, TX', location: dallas.coordinates, type: 'destination' },
    ],
    tripPlan: generateTripPlan('route-c', 242, 261.2, createHeatRiskPoints(84, 4, ['low', 'low', 'low', 'low', 'moderate', 'moderate', 'moderate', 'moderate', 'low', 'low', 'low', 'low'])),
  },
  {
    id: 'route-long',
    name: 'Route D',
    description: 'Houston to El Paso - Long Route',
    distance: 746.5,
    duration: 612, // 10h 12m - Long trip, structured stops
    origin: {
      name: 'Houston, TX',
      coordinates: { lat: 29.7604, lng: -95.3698 },
      city: 'Houston',
      state: 'TX',
    },
    destination: {
      name: 'El Paso, TX',
      coordinates: { lat: 31.7619, lng: -106.4850 },
      city: 'El Paso',
      state: 'TX',
    },
    highways: ['I-10 W'],
    cameras: cameras.slice(0, 6),
    currentRisk: 'high',
    currentTemperature: 95,
    heatRisk: createHeatRiskPoints(95, 5, ['high', 'high', 'high', 'extreme', 'extreme', 'high', 'high', 'moderate', 'moderate', 'low', 'low', 'low']),
    isRecommended: false,
    features: {
      shadeCoverage: 15,
      restStops: 18,
      fuelStations: 35,
      trafficLevel: 'moderate',
    },
    waypoints: [
      { id: 'wp-long-1', name: 'Houston, TX', location: { lat: 29.7604, lng: -95.3698 }, type: 'origin' },
      { id: 'wp-long-2', name: 'San Antonio, TX', location: { lat: 29.4241, lng: -98.4936 }, type: 'waypoint' },
      { id: 'wp-long-3', name: 'Junction, TX', location: { lat: 30.4861, lng: -99.7717 }, type: 'waypoint' },
      { id: 'wp-long-4', name: 'Fort Stockton, TX', location: { lat: 30.8864, lng: -102.8775 }, type: 'waypoint' },
      { id: 'wp-long-5', name: 'El Paso, TX', location: { lat: 31.7619, lng: -106.4850 }, type: 'destination' },
    ],
    tripPlan: generateTripPlan('route-long', 612, 746.5, createHeatRiskPoints(95, 5, ['high', 'high', 'high', 'extreme', 'extreme', 'high', 'high', 'moderate', 'moderate', 'low', 'low', 'low'])),
  },
  {
    id: 'route-medium-long',
    name: 'Route E',
    description: 'Houston to Oklahoma City',
    distance: 498.3,
    duration: 468, // 7h 48m - Medium-long trip, recommended stops
    origin: {
      name: 'Houston, TX',
      coordinates: { lat: 29.7604, lng: -95.3698 },
      city: 'Houston',
      state: 'TX',
    },
    destination: {
      name: 'Oklahoma City, OK',
      coordinates: { lat: 35.4676, lng: -97.5164 },
      city: 'Oklahoma City',
      state: 'OK',
    },
    highways: ['US-75 N'],
    cameras: cameras.slice(0, 8),
    currentRisk: 'moderate',
    currentTemperature: 88,
    heatRisk: createHeatRiskPoints(88, 4, ['moderate', 'moderate', 'high', 'high', 'high', 'moderate', 'moderate', 'low', 'low', 'low', 'low', 'low']),
    isRecommended: false,
    features: {
      shadeCoverage: 25,
      restStops: 14,
      fuelStations: 22,
      trafficLevel: 'light',
    },
    waypoints: [
      { id: 'wp-med-1', name: 'Houston, TX', location: { lat: 29.7604, lng: -95.3698 }, type: 'origin' },
      { id: 'wp-med-2', name: 'Dallas, TX', location: { lat: 32.7767, lng: -96.7970 }, type: 'waypoint' },
      { id: 'wp-med-3', name: 'Oklahoma City, OK', location: { lat: 35.4676, lng: -97.5164 }, type: 'destination' },
    ],
    tripPlan: generateTripPlan('route-medium-long', 468, 498.3, createHeatRiskPoints(88, 4, ['moderate', 'moderate', 'high', 'high', 'high', 'moderate', 'moderate', 'low', 'low', 'low', 'low', 'low'])),
  },
];

// Departure options for next 12 hours
export const mockDepartureOptions: DepartureOption[] = [
  { hourOffset: 0, time: 'Now', riskLevel: 'low', temperature: 85, recommended: true, reason: 'Best current conditions' },
  { hourOffset: 1, time: '+1 Hour', riskLevel: 'low', temperature: 87, recommended: false },
  { hourOffset: 2, time: '+2 Hours', riskLevel: 'moderate', temperature: 90, recommended: false },
  { hourOffset: 3, time: '+3 Hours', riskLevel: 'moderate', temperature: 93, recommended: false },
  { hourOffset: 4, time: '+4 Hours', riskLevel: 'high', temperature: 95, recommended: false },
  { hourOffset: 5, time: '+5 Hours', riskLevel: 'high', temperature: 97, recommended: false, reason: 'Peak heat advisory' },
  { hourOffset: 6, time: '+6 Hours', riskLevel: 'high', temperature: 96, recommended: false },
  { hourOffset: 7, time: '+7 Hours', riskLevel: 'moderate', temperature: 94, recommended: false },
  { hourOffset: 8, time: '+8 Hours', riskLevel: 'moderate', temperature: 91, recommended: false },
  { hourOffset: 9, time: '+9 Hours', riskLevel: 'low', temperature: 88, recommended: false },
  { hourOffset: 10, time: '+10 Hours', riskLevel: 'low', temperature: 86, recommended: false },
  { hourOffset: 11, time: '+11 Hours', riskLevel: 'low', temperature: 84, recommended: false },
];

// Recommendation
export const mockRecommendation: Recommendation = {
  action: 'leave_now',
  routeId: 'route-a',
  departureHourOffset: 0,
  departureTime: 'Now',
  riskLevel: 'low',
  reasoning: [
    'Current heat risk is low (85°F)',
    'Route A has the best shade coverage (35%)',
    'Departing now avoids peak heat hours (3-6 PM)',
    'Moderate traffic levels expected',
    '12 cameras available for real-time monitoring',
  ],
  alternatives: [
    {
      routeId: 'route-c',
      reason: 'Even better shade coverage (45%) but 20 minutes longer',
    },
  ],
};

// Helper functions
export function getRouteById(id: string): Route | undefined {
  return mockRoutes.find(r => r.id === id);
}

export function getCameraById(id: string): Camera | undefined {
  return cameras.find(c => c.id === id);
}

export function formatDistance(miles: number): string {
  return `${Math.round(miles)} mi`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low': return '#10b981'; // green-500
    case 'moderate': return '#f59e0b'; // amber-500
    case 'high': return '#f97316'; // orange-500
    case 'extreme': return '#ef4444'; // red-500
    default: return '#6b7280';
  }
}

export function getRiskBgColor(risk: string): string {
  switch (risk) {
    case 'low': return 'bg-emerald-50';
    case 'moderate': return 'bg-amber-50';
    case 'high': return 'bg-orange-50';
    case 'extreme': return 'bg-red-50';
    default: return 'bg-gray-50';
  }
}

export function getRiskTextColor(risk: string): string {
  switch (risk) {
    case 'low': return 'text-emerald-700';
    case 'moderate': return 'text-amber-700';
    case 'high': return 'text-orange-700';
    case 'extreme': return 'text-red-700';
    default: return 'text-gray-700';
  }
}

// ============================================
// TRIP PLAN HELPERS
// ============================================

/**
 * Format stop time for display (e.g., "2h 15m into trip")
 */
export function formatStopTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m into trip`;
  if (mins === 0) return `${hours}h into trip`;
  return `${hours}h ${mins}m into trip`;
}

/**
 * Get stop type icon and label
 */
export function getStopTypeInfo(type: string): { icon: string; label: string; color: string } {
  const types: Record<string, { icon: string; label: string; color: string }> = {
    fuel: { icon: '⛽', label: 'Fuel stop', color: 'text-blue-600' },
    rest: { icon: '🛑', label: 'Rest stop', color: 'text-gray-600' },
    meal: { icon: '🍽️', label: 'Meal', color: 'text-orange-600' },
    heat_break: { icon: '🌡️', label: 'Heat-aware break', color: 'text-red-600' },
    lodging: { icon: '🏨', label: 'Overnight stay', color: 'text-purple-600' },
  };
  return types[type] || types.fuel;
}

/**
 * Get trip strategy description
 */
export function getTripStrategyDescription(strategy: string): string {
  const descriptions: Record<string, string> = {
    none: 'Short trip - no mandatory stops needed.',
    optional: 'Medium trip - a few stops available if needed.',
    recommended: 'Long trip - strategic fuel and rest stops recommended.',
    structured: 'Very long trip - structured stop plan for safety and comfort.',
  };
  return descriptions[strategy] || '';
}

/**
 * Get trip length category
 */
export function getTripLengthCategory(duration: number): 'short' | 'medium' | 'long' | 'very-long' {
  const hours = duration / 60;
  if (hours < 4) return 'short';
  if (hours < 7) return 'medium';
  if (hours < 10) return 'long';
  return 'very-long';
}
