# ThermoRoute Backend API

ThermoRoute is a heat-aware route analysis system that combines:

- Route generation
- Environmental / heat data
- Heat exposure risk calculation
- Route comparison
- Safety analysis

The backend is built with Django + Django REST Framework.

---

## Tech Stack

- Python 3.14
- Django 6.1
- Django REST Framework
- PostgreSQL
- OSRM
- FortyGuard
- Gunicorn
- Docker

---

## Backend Architecture

```text
Frontend Map
     |
     | Origin + Destination coordinates
     v
POST /api/routes/analyze/
     |
     v
RouteAnalysisService
     |
     +--------------------+
     |                    |
     v                    v
RouteProvider          HeatAnalysisService
     |                    |
     v                    v
    OSRM              FortyGuard
     |                    |
     v                    v
Route Geometry        Heat Data
     |                    |
     +---------+----------+
               |
               v
        RiskCalculator
               |
               v
       Heat Exposure Score
               |
               v
        Route Analysis
               |
               v
          Frontend
```

---

## Base URL

For local development:

```
http://localhost:8000
```

Main API:

```
/api/routes/analyze/
```

---

## Main API Endpoint

### Analyze Routes

```
POST /api/routes/analyze/
```

This is the main endpoint that the frontend should use.

The frontend sends the coordinates of:

- Origin
- Destination

The backend then:

1. Gets available routes from OSRM.
2. Extracts the route geometry.
3. Samples points from each route.
4. Retrieves heat/environmental data using FortyGuard.
5. Calculates heat exposure risk.
6. Returns the analyzed routes.

### Request

**Headers**

```
Content-Type: application/json
```

**Body**

```json
{
  "origin_lat": 30.0444,
  "origin_lng": 31.2357,
  "destination_lat": 30.0131,
  "destination_lng": 31.2089
}
```

**Request Fields**

| Field | Type | Required | Description |
|---|---|---|---|
| origin_lat | float | Yes | Origin latitude |
| origin_lng | float | Yes | Origin longitude |
| destination_lat | float | Yes | Destination latitude |
| destination_lng | float | Yes | Destination longitude |

**Example cURL Request**

```bash
curl -X POST http://localhost:8000/api/routes/analyze/ \
  -H "Content-Type: application/json" \
  -d '{
    "origin_lat": 30.0444,
    "origin_lng": 31.2357,
    "destination_lat": 30.0131,
    "destination_lng": 31.2089
  }'
```

The coordinates above are only example values. In the actual application, the frontend gets these coordinates from the map.

---

## Frontend Integration

The user should not manually enter latitude and longitude.

The expected frontend flow is:

```
User opens map
       |
       v
Select Origin
       |
       v
Select Destination
       |
       v
Frontend gets coordinates
       |
       v
POST /api/routes/analyze/
       |
       v
Backend analyzes routes
       |
       v
Frontend displays routes
```

For example:

```javascript
const origin = {
  lat: 30.0444,
  lng: 31.2357
};

const destination = {
  lat: 30.0131,
  lng: 31.2089
};
```

Then:

```javascript
const response = await fetch(
  "http://localhost:8000/api/routes/analyze/",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_lat: destination.lat,
      destination_lng: destination.lng
    })
  }
);

const data = await response.json();
```

---

## Successful Response

HTTP status: `200 OK`

Example response:

```json
{
  "status": "success",
  "routes": [
    {
      "id": "route_1",
      "distance_km": 6.2,
      "duration_min": 18.5,

      "geometry": {
        "coordinates": [
          [31.2357, 30.0444],
          [31.2348, 30.0438],
          [31.2339, 30.0432]
        ]
      },

      "heat_data": [
        {
          "lat": 30.0444,
          "lon": 31.2357,
          "temperature": 30.0,
          "humidity": 65.0,
          "heat_index": 30.75,
          "uv_index": 0.0,
          "aqi": 0.0,
          "risk_level": "MODERATE",
          "timestamp": "2026-08-21T22:33"
        }
      ],

      "risk": {
        "score": 42,
        "level": "HIGH",

        "critical_segments": [
          {
            "segment_id": 1,
            "risk_score": 42,
            "risk_level": "HIGH"
          }
        ],

        "metrics": {
          "max_temperature": 30.0,
          "max_humidity": 65.0,
          "max_heat_index": 30.75,
          "max_aqi": 0.0
        }
      }
    }
  ]
}
```

### Response Structure

The top-level response is:

```json
{
  "status": "success",
  "routes": []
}
```

The `routes` array contains all routes returned by the routing provider.

Each route contains:

```
route
 ├── id
 ├── distance_km
 ├── duration_min
 ├── geometry
 ├── heat_data
 └── risk
```

---

## Route Object

Example:

```json
{
  "id": "route_1",
  "distance_km": 6.2,
  "duration_min": 18.5,
  "geometry": {},
  "heat_data": [],
  "risk": {}
}
```

### Route ID

```json
"id": "route_1"
```

Unique identifier for the route.

### Distance

```json
"distance_km": 6.2
```

Distance in kilometers. Frontend can display: `6.2 km`

### Duration

```json
"duration_min": 18.5
```

Estimated travel time in minutes. Frontend can display: `18.5 min`

---

## Route Geometry

The geometry is returned by the routing provider.

Coordinates use GeoJSON format:

```
[longitude, latitude]
```

Example:

```json
"geometry": {
  "coordinates": [
    [31.2357, 30.0444],
    [31.2348, 30.0438],
    [31.2339, 30.0432]
  ]
}
```

**IMPORTANT:**

The backend uses `[longitude, latitude]`. Leaflet uses `[latitude, longitude]`.

Therefore, the frontend must convert them before drawing the route.

```javascript
const leafletCoordinates =
  route.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );
```

With React-Leaflet:

```jsx
<Polyline
  positions={leafletCoordinates}
/>
```

---

## Heat Data

Each route contains environmental data for sampled points.

Example:

```json
"heat_data": [
  {
    "lat": 30.0444,
    "lon": 31.2357,
    "temperature": 30.0,
    "humidity": 65.0,
    "heat_index": 30.75,
    "uv_index": 0.0,
    "aqi": 0.0,
    "risk_level": "MODERATE",
    "timestamp": "2026-08-21T22:33"
  }
]
```

**Heat Data Fields**

| Field | Type | Description |
|---|---|---|
| lat | float | Latitude |
| lon | float | Longitude |
| temperature | float | Temperature in Celsius |
| humidity | float | Relative humidity percentage |
| heat_index | float | Heat index |
| uv_index | float | UV index |
| aqi | float | Air Quality Index |
| risk_level | string | Heat risk level |
| timestamp | string | Timestamp of the data |

---

## Risk Calculation

The backend calculates a deterministic heat exposure score.

The current calculation uses:

```
Temperature
     +
Heat Index
     +
Humidity
     +
AQI
     |
     v
RiskCalculator
     |
     v
Risk Score 0 - 100
```

**Current weights:**

- Temperature = 30%
- Heat Index = 35%
- Humidity = 15%
- AQI = 20%

The score range is `0 - 100`. Higher score means higher environmental / heat risk.

### Risk Levels

The current thresholds are:

| Score | Risk Level |
|---|---|
| 0 - 19 | LOW |
| 20 - 39 | MODERATE |
| 40 - 59 | HIGH |
| 60 - 79 | VERY_HIGH |
| 80 - 100 | EXTREME |

Possible values: `LOW`, `MODERATE`, `HIGH`, `VERY_HIGH`, `EXTREME`

---

## Risk Object

Example:

```json
"risk": {
  "score": 42,
  "level": "HIGH",

  "critical_segments": [
    {
      "segment_id": 1,
      "risk_score": 42,
      "risk_level": "HIGH"
    }
  ],

  "metrics": {
    "max_temperature": 30.0,
    "max_humidity": 65.0,
    "max_heat_index": 30.75,
    "max_aqi": 0.0
  }
}
```

### Risk Score

```json
"score": 42
```

Range: `0 - 100`

Interpretation:

- `LOW` → lower exposure
- `MODERATE` → moderate exposure
- `HIGH` → high exposure
- `VERY_HIGH` → very high exposure
- `EXTREME` → extreme exposure

### Critical Segments

Critical segments are route segments with `HIGH`, `VERY_HIGH`, or `EXTREME` risk.

Example:

```json
"critical_segments": [
  {
    "segment_id": 1,
    "risk_score": 72,
    "risk_level": "VERY_HIGH"
  }
]
```

The frontend can use this information to highlight dangerous areas:

- `LOW` → safe
- `MODERATE` → caution
- `HIGH` → dangerous
- `VERY_HIGH` → very dangerous
- `EXTREME` → extreme risk

The exact visualization and colors are controlled by the frontend.

### Risk Metrics

The `metrics` object contains the maximum environmental values detected along the route.

Example:

```json
"metrics": {
  "max_temperature": 30.0,
  "max_humidity": 65.0,
  "max_heat_index": 30.75,
  "max_aqi": 0.0
}
```

Frontend can display:

```
Max Temperature: 30°C
Max Humidity: 65%
Max Heat Index: 30.75°C
Max AQI: 0
```

---

## Recommended Route Card

The frontend can display a route like:

```
┌─────────────────────────────────┐
│ Route 1                          │
│                                  │
│ Heat Risk: HIGH                  │
│ Score: 42 / 100                  │
│                                  │
│ Distance: 6.2 km                 │
│ Duration: 18.5 min               │
│                                  │
│ Max Temperature: 30°C            │
│ Max Heat Index: 30.75°C          │
│ Max Humidity: 65%                │
│ Max AQI: 0                       │
│                                  │
│ Critical Segments: 1             │
│                                  │
│        [ Select Route ]          │
└─────────────────────────────────┘
```

---

## Map Visualization

The frontend should display:

- Origin marker
- Destination marker
- Route geometry
- Heat/risk information
- Critical segments

Possible route risk visualization:

- `LOW` → green
- `MODERATE` → yellow
- `HIGH` → orange
- `VERY_HIGH` → red
- `EXTREME` → dark red

### Drawing Route With React-Leaflet

Convert backend coordinates:

```javascript
const coordinates =
  route.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );
```

Then:

```jsx
<Polyline
  positions={coordinates}
/>
```

### Displaying Heat Points

Example:

```javascript
route.heat_data.map((point) => {
  console.log(
    point.lat,
    point.lon,
    point.temperature,
    point.heat_index,
    point.risk_level
  );
});
```

The frontend can use these points to create:

- Heat markers
- Heatmap
- Risk-colored route segments
- Tooltips
- Environmental information cards

---

## Frontend State

A simple React state structure can be:

```javascript
const [origin, setOrigin] = useState(null);
const [destination, setDestination] = useState(null);
const [routes, setRoutes] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

### Selecting Origin and Destination

When the user clicks the map:

```javascript
const handleMapClick = (event) => {
  const { lat, lng } = event.latlng;

  if (!origin) {
    setOrigin({ lat, lng });
    return;
  }

  if (!destination) {
    setDestination({ lat, lng });
    return;
  }
};
```

A better UI can provide explicit buttons:

```
[ Select Origin ]
[ Select Destination ]
```

Then the map click sets the appropriate point.

### Calling the API

Example complete function:

```javascript
const analyzeRoutes = async () => {
  if (!origin || !destination) {
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const response = await fetch(
      "http://localhost:8000/api/routes/analyze/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          destination_lat: destination.lat,
          destination_lng: destination.lng
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Route analysis failed"
      );
    }

    setRoutes(data.routes);

  } catch (error) {
    setError(error.message);

  } finally {
    setLoading(false);
  }
};
```

### Loading State

Route analysis uses external services. The frontend should therefore display a loading state.

Example:

```
Analyzing your route...

Finding routes...
       ↓
Fetching heat data...
       ↓
Calculating heat exposure...
       ↓
Evaluating route safety...
```

Example React:

```jsx
{loading && (
  <div>
    Analyzing route...
  </div>
)}
```

The Analyze button should be disabled while the request is running:

```jsx
<button
  disabled={loading || !origin || !destination}
  onClick={analyzeRoutes}
>
  {loading ? "Analyzing..." : "Analyze Route"}
</button>
```

---

## Error Handling

If the backend cannot retrieve heat data or route data, the API may return:

`502 Bad Gateway`

Example:

```json
{
  "success": false,
  "errors": [
    "Failed to retrieve heat data"
  ]
}
```

Frontend should show a user-friendly message:

```
Unable to analyze the route.
Please try again.
```

Do not expose raw Python/Django errors to the user.

### Validation Errors

Invalid request data can return a DRF validation response.

Example:

```json
{
  "origin_lat": [
    "This field is required."
  ]
}
```

The frontend should make sure all four coordinates exist before sending the request:

- origin_lat
- origin_lng
- destination_lat
- destination_lng

---

## Complete API Flow

```
                         FRONTEND
                            |
                    User selects points
                            |
                            v
                    Origin + Destination
                            |
                            v
                POST /api/routes/analyze/
                            |
                            v
                    RouteAnalysisService
                            |
                            v
                      RouteProvider
                            |
                            v
                           OSRM
                            |
                            v
                     Route Geometry
                            |
                            v
                     Sample Points
                            |
                            v
                       FortyGuard
                            |
                            v
                        Heat Data
                            |
                            v
                     RiskCalculator
                            |
                            v
                  Heat Exposure Score
                            |
                            v
                     Analyzed Routes
                            |
                            v
                         FRONTEND
                            |
                +-----------+-----------+
                |                       |
                v                       v
             Map View              Route Cards
```

---

## Performance Considerations

The route analysis process depends on external APIs.

In particular, FortyGuard may require polling before returning heat data. Therefore:

```
One route
   ↓
Multiple sampled points
   ↓
Multiple external requests
```

can make the API request take several seconds.

The frontend must always display a loading state, and should also prevent duplicate submissions while a request is in progress.

> **ملاحظة مهمة:** الـ logs الحالية بتظهر `WORKER TIMEOUT` أثناء الـ polling مع FortyGuard. يعني الـ API contract الموصوف هنا صح، لكن الـ backend محتاج تعديل ليتحمّل مدة تحليل route أطول (زيادة الـ worker timeout) أو تقليل/موازاة طلبات FortyGuard، وإلا ممكن الفرونت يبعت request صحيح ويرجعله `Internal Server Error` بسبب الـ timeout. المشكلة دي لسه مفتوحة ولازم تتحل قبل الاعتماد النهائي على الـ API.

### Route Sampling

The backend samples route geometry before requesting heat data.

Current configuration:

```
max_points=20
```

This means a route may be represented by up to 20 heat-analysis points.

The frontend does not need to know how sampling works. It only consumes `"heat_data": []`.

---

## API Usage Example

Request:

```bash
curl -X POST http://localhost:8000/api/routes/analyze/ \
  -H "Content-Type: application/json" \
  -d '{
    "origin_lat": 30.0444,
    "origin_lng": 31.2357,
    "destination_lat": 30.0131,
    "destination_lng": 31.2089
  }'
```

Response structure:

```json
{
  "status": "success",
  "routes": [
    {
      "id": "route_1",
      "distance_km": 6.2,
      "duration_min": 18.5,
      "geometry": {
        "coordinates": []
      },
      "heat_data": [],
      "risk": {
        "score": 42,
        "level": "HIGH",
        "critical_segments": [],
        "metrics": {
          "max_temperature": 30.0,
          "max_humidity": 65.0,
          "max_heat_index": 30.75,
          "max_aqi": 0.0
        }
      }
    }
  ]
}
```

---

## Frontend Integration Checklist

The frontend needs to implement:

- [ ] Interactive map
- [ ] Origin selection
- [ ] Destination selection
- [ ] Origin marker
- [ ] Destination marker
- [ ] Call `/api/routes/analyze/`
- [ ] Loading state
- [ ] Error handling
- [ ] Draw route geometry
- [ ] Display distance
- [ ] Display duration
- [ ] Display heat risk score
- [ ] Display risk level
- [ ] Display heat metrics
- [ ] Display critical segments
- [ ] Highlight risky areas
- [ ] Allow route selection

---

## Important Coordinate Rules

Backend request uses `latitude + longitude`:

```json
{
  "origin_lat": 30.0444,
  "origin_lng": 31.2357
}
```

Route geometry uses `[longitude, latitude]`:

```json
[31.2357, 30.0444]
```

Leaflet uses `[latitude, longitude]`. Therefore:

```javascript
route.geometry.coordinates.map(
  ([lng, lat]) => [lat, lng]
);
```

This conversion is required when displaying the route with Leaflet.

---

## Main Frontend Contract

The frontend only needs to know one main endpoint:

```
POST /api/routes/analyze/
```

**Send:**

```json
{
  "origin_lat": "number",
  "origin_lng": "number",
  "destination_lat": "number",
  "destination_lng": "number"
}
```

**Receive:**

```
routes[]
    |
    +-- id
    +-- distance_km
    +-- duration_min
    +-- geometry
    |
    +-- heat_data[]
    |      |
    |      +-- lat
    |      +-- lon
    |      +-- temperature
    |      +-- humidity
    |      +-- heat_index
    |      +-- uv_index
    |      +-- aqi
    |      +-- risk_level
    |      +-- timestamp
    |
    +-- risk
           |
           +-- score
           +-- level
           +-- critical_segments[]
           +-- metrics
```

---

## Current Backend Status

The route analysis pipeline is implemented as:

```
Map Coordinates
       ↓
Route API
       ↓
OSRM
       ↓
Route Geometry
       ↓
Route Sampling
       ↓
FortyGuard Heat Data
       ↓
Risk Calculator
       ↓
Heat Exposure Score
       ↓
Route Analysis Response
```

The frontend should integrate with `POST /api/routes/analyze/` as the primary route-analysis endpoint.

> **Known issue:** FortyGuard polling can trigger `WORKER TIMEOUT` on longer route analyses. This needs to be fixed (increase worker timeout and/or parallelize/reduce FortyGuard requests) before the frontend fully relies on this API in production.
