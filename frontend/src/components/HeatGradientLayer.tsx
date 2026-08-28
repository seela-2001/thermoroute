import L from 'leaflet';
import type { Control as LeafletControl, LayerGroup as LeafletLayerGroup, Polyline as LeafletPolyline } from 'leaflet';

interface HeatPoint {
  lat: number;
  lng: number;
  temperature: number;
  risk: 'low' | 'moderate' | 'high' | 'extreme';
}

interface HeatGradientOptions {
  segmentLength?: number;
  glowWidth?: number;
  glowOpacity?: number;
  routeWidth?: number;
}

const RISK_COLORS = {
  low: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.25)' },
  moderate: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)' },
  high: { color: '#f97316', glow: 'rgba(249, 115, 22, 0.25)' },
  extreme: { color: '#dc2626', glow: 'rgba(220, 38, 38, 0.25)' }
};

function getRiskFromTemperature(temp: number): 'low' | 'moderate' | 'high' | 'extreme' {
  if (temp < 32) return 'low';
  if (temp < 36) return 'moderate';
  if (temp < 40) return 'high';
  return 'extreme';
}

function interpolatePoints(p1: [number, number], p2: [number, number], numPoints: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const ratio = i / numPoints;
    points.push([
      p1[0] + (p2[0] - p1[0]) * ratio,
      p1[1] + (p2[1] - p1[1]) * ratio
    ]);
  }
  return points;
}

function interpolateTemperature(t1: number, t2: number, ratio: number): number {
  return t1 + (t2 - t1) * ratio;
}

/**
 * Create a heat gradient layer that follows the route geometry
 * Uses segmented polylines with color gradients based on temperature
 */
export function createHeatGradientLayer(
  waypoints: Array<{ lat: number; lng: number; temperature: number }>,
  options: HeatGradientOptions = {}
): LeafletLayerGroup {
  const {
    segmentLength = 20,
    glowWidth = 12,
    glowOpacity = 0.6
  } = options;

  const group = L.layerGroup();

  // Generate detailed points along the route with interpolated temperatures
  const heatPoints: HeatPoint[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    const intermediatePoints = interpolatePoints(
      [start.lat, start.lng],
      [end.lat, end.lng],
      segmentLength
    );

    intermediatePoints.forEach(([lat, lng], idx) => {
      const ratio = idx / segmentLength;
      const temp = interpolateTemperature(start.temperature, end.temperature, ratio);
      heatPoints.push({
        lat,
        lng,
        temperature: temp,
        risk: getRiskFromTemperature(temp)
      });
    });
  }

  // Add the last waypoint
  const lastWp = waypoints[waypoints.length - 1];
  heatPoints.push({
    lat: lastWp.lat,
    lng: lastWp.lng,
    temperature: lastWp.temperature,
    risk: getRiskFromTemperature(lastWp.temperature)
  });

  // Create glow segments (semi-transparent polylines underneath)
  for (let i = 0; i < heatPoints.length - 1; i++) {
    const p1 = heatPoints[i];
    const p2 = heatPoints[i + 1];

    L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
      color: RISK_COLORS[p1.risk].color,
      weight: glowWidth,
      opacity: glowOpacity,
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
      bubblingMouseEvents: false
    }).addTo(group);
  }

  return group;
}

/**
 * Create a main route line with gradient segments
 * This is the crisp line that sits on top of the glow
 */
export function createGradientRouteLine(
  waypoints: Array<{ lat: number; lng: number; temperature: number }>,
  isSelected: boolean,
  options: HeatGradientOptions = {}
): LeafletPolyline {
  const { routeWidth = 5 } = options;

  // For the main route line, we use a single polyline with the base color
  // The gradient effect comes from the glow layer underneath
  const latLngs = waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);

  return L.polyline(latLngs, {
    color: isSelected ? '#111827' : '#9CA3AF',
    weight: routeWidth,
    opacity: isSelected ? 1 : 0.4,
    smoothFactor: 1,
    lineCap: 'round',
    lineJoin: 'round'
  });
}

/**
 * Create small temperature markers at meaningful heat changes
 * Only adds markers where temperature changes significantly
 */
export function createHeatMarkers(
  waypoints: Array<{ lat: number; lng: number; temperature: number }>,
  options: { minChange?: number } = {}
): LeafletLayerGroup {
  const { minChange = 3 } = options;
  const group = L.layerGroup();

  // Find points with significant temperature changes
  const significantPoints: HeatPoint[] = [];

  // Always add first point
  significantPoints.push({
    lat: waypoints[0].lat,
    lng: waypoints[0].lng,
    temperature: waypoints[0].temperature,
    risk: getRiskFromTemperature(waypoints[0].temperature)
  });

  // Check for significant changes
  let prevTemp = waypoints[0].temperature;
  for (let i = 1; i < waypoints.length - 1; i++) {
    const wp = waypoints[i];
    const change = Math.abs(wp.temperature - prevTemp);

    if (change >= minChange) {
      significantPoints.push({
        lat: wp.lat,
        lng: wp.lng,
        temperature: wp.temperature,
        risk: getRiskFromTemperature(wp.temperature)
      });
      prevTemp = wp.temperature;
    }
  }

  // Always add last point
  const lastWp = waypoints[waypoints.length - 1];
  significantPoints.push({
    lat: lastWp.lat,
    lng: lastWp.lng,
    temperature: lastWp.temperature,
    risk: getRiskFromTemperature(lastWp.temperature)
  });

  // Create markers
  significantPoints.forEach(point => {
    const riskColor = RISK_COLORS[point.risk].color;

    const iconHtml = `
      <div style="
        background: white;
        border: 2px solid ${riskColor};
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 600;
        color: ${riskColor};
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      ">
        ${Math.round(point.temperature)}°C · ${point.risk.toUpperCase()}
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'heat-marker-icon',
      iconSize: [80, 24],
      iconAnchor: [40, 12],
      interactive: false
    });

    L.marker([point.lat, point.lng], { icon }).addTo(group);
  });

  return group;
}

/**
 * Create a compact floating legend for heat exposure
 */
export function createHeatLegend(): LeafletControl {
  const container = L.DomUtil.create('div', 'heat-legend-container');
  container.innerHTML = `
        <div style="
          background: white;
          border-radius: 10px;
          padding: 12px 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 8px;
          ">
            Heat Exposure
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 11px;
            font-weight: 600;
            color: #374151;
          ">
            <span>20°</span>
            <div style="
              flex: 1;
              height: 6px;
              background: linear-gradient(to right,
                #10b981 0%,
                #f59e0b 33%,
                #f97316 66%,
                #dc2626 100%
              );
              border-radius: 3px;
            "></div>
            <span>40°+</span>
          </div>
          <div style="
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
            font-size: 9px;
            font-weight: 600;
            color: #9ca3af;
            letter-spacing: 0.03em;
          ">
            <span>LOW</span>
            <span>HIGH</span>
          </div>
        </div>
      `;

  // Prevent map interaction events on the legend
  L.DomEvent.disableClickPropagation(container);
  L.DomEvent.disableScrollPropagation(container);

  const LegendControl = L.Control.extend({
    options: {
      position: 'bottomright'
    },

    onAdd: () => container
  });

  return new LegendControl();
}

/**
 * Generate mock temperature data along a route
 * Creates varying temperatures to demonstrate the gradient effect
 */
export function generateRouteHeatData(
  waypoints: Array<{ lat: number; lng: number }>,
  baseTemp: number,
  variance: number = 8
): Array<{ lat: number; lng: number; temperature: number }> {
  return waypoints.map((wp, index) => {
    // Create a sine wave pattern for natural variation
    const waveOffset = Math.sin(index * 0.8) * variance;
    const randomOffset = (Math.random() - 0.5) * (variance / 2);
    const temp = Math.max(28, Math.min(45, baseTemp + waveOffset + randomOffset));

    return {
      lat: wp.lat,
      lng: wp.lng,
      temperature: Math.round(temp * 10) / 10
    };
  });
}