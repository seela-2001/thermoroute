# ThermoRoute Backend API

ThermoRoute is a heat-aware route analysis backend that combines route generation, environmental data, heat exposure analysis, weather conditions, traffic information, and nearby Points of Interest (POIs) to help users choose safer and more comfortable routes.

The backend is built with Django and Django REST Framework and integrates with external services for routing, heat/environmental data, weather, traffic, POI discovery, and location autocomplete.

---

## Tech Stack

- Python 3.14
- Django 6.1
- Django REST Framework
- PostgreSQL
- OSRM
- FortyGuard
- Open-Meteo
- Geoapify Places API
- Geoapify Geocoding API
- TomTom Traffic API
- Gunicorn
- Docker

---

## Backend Architecture

```text
Frontend
   |
   +------------------------------+
   |                              |
   | Location Search              | Route Analysis
   |                              |
   v                              v
GET /api/routes/             POST /api/routes/
locations/autocomplete/      analyze/
   |                              |
   v                              v
LocationService             RouteAnalysisService
   |                              |
   v                              |
Geoapify                      RouteProvider
Autocomplete                      |
   |                              v
   v                             OSRM
Location Suggestions              |
   |                              |
   v                              v
Frontend                    Route Geometry
                                  |
                                  v
                           Route Sampling
                                  |
             +--------------------+--------------------+
             |                    |                    |
             v                    v                    v
       HeatAnalysisService   WeatherService       POIService
             |                    |                    |
             v                    v                    v
        FortyGuard           Open-Meteo           Geoapify
             |                    |                    |
             v                    v                    v
        Heat Data            Weather Data          Nearby POIs
             |
             |
             +--------------------+
                                  |
                                  v
                           TrafficService
                                  |
                                  v
                              TomTom
                                  |
                                  v
                         Traffic + Incidents
                                  |
             +--------------------+--------------------+
                                  |
                                  v
                           Route Risk Analysis
                                  |
                                  v
                           Analyzed Routes
                                  |
                                  v
                               Frontend
```

---

## Project Structure

```text
backend/

├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── ...

├── routes/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   │
│   ├── services/
│   │   ├── route_analysis_service.py
│   │   ├── route_providers.py
│   │   ├── location_services.py
│   │   ├── weather_services.py
│   │   ├── poi_services.py
│   │   ├── traffic_services.py
│   │   └── ...
│   │
│   └── ...

├── heat/
│   ├── models.py
│   ├── serializers.py
│   │
│   ├── services/
│   │   ├── heat_data_services.py
│   │   ├── heat_analysis_services.py
│   │   └── ...
│   │
│   └── ...

├── requirements/
├── Dockerfile
├── entrypoint.sh
├── pyproject.toml
└── manage.py
```

---

# Installation Guide

## Prerequisites

- Python 3.14+
- PostgreSQL 14+
- Docker & Docker Compose
- OSRM instance
- Geoapify API key
- FortyGuard API key
- TomTom API key

Open-Meteo does not require an API key.

---

## Option A — Run with Docker

### 1. Clone the repository

```bash
git clone <your-repo-url>

cd thermoroute/backend
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Then configure the required environment variables.

### 3. Build and start the backend

```bash
docker compose up --build backend
```

Or start the full stack:

```bash
docker compose up --build
```

### 4. Run database migrations

If migrations are not handled automatically:

```bash
docker compose exec backend python manage.py migrate
```

### 5. Create a superuser

Optional:

```bash
docker compose exec backend python manage.py createsuperuser
```

### 6. Verify the backend

```bash
curl http://localhost:8000/
```

### 7. Check logs

```bash
docker logs -f thermoroute_backend
```

The backend will be available at:

```text
http://localhost:8000
```

---

## Option B — Run Locally Without Docker

### 1. Clone the repository

```bash
git clone <your-repo-url>

cd thermoroute/backend
```

### 2. Install `uv`

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 3. Install dependencies

```bash
uv sync
```

Run commands using:

```bash
uv run python manage.py migrate
```

Or activate the environment manually:

```bash
source .venv/bin/activate
```

### 4. Configure PostgreSQL

Create a PostgreSQL database and user.

Configure the connection through environment variables.

### 5. Create `.env`

Create a `.env` file in the project root.

### 6. Apply migrations

```bash
uv run python manage.py migrate
```

### 7. Run the development server

```bash
uv run python manage.py runserver
```

The backend will be available at:

```text
http://localhost:8000
```

> **Note:** OSRM must be reachable by the backend. It can run as a Docker service or as a hosted OSRM instance.

---

# Environment Variables

Example `.env`:

```env
# External Services

GEOAPIFY_API_KEY=your_geoapify_api_key
FORTYGUARD_API_KEY=your_fortyguard_api_key
TOMTOM_API_KEY=your_tomtom_api_key

# Database

POSTGRES_DB=thermoroute
POSTGRES_USER=thermoroute
POSTGRES_PASSWORD=your_db_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Django

DEBUG=True
SECRET_KEY=your_django_secret_key
ALLOWED_HOSTS=localhost,127.0.0.1
```

> **Important:** Never commit real API keys, passwords, or Django secrets to Git.

---

# API Endpoints

## 1. Location Autocomplete

```text
GET /api/routes/locations/autocomplete/
```

This endpoint provides location suggestions while the user is typing a location.

The backend uses the Geoapify Geocoding Autocomplete API.

### Example Request

```bash
curl "http://localhost:8000/api/routes/locations/autocomplete/?q=cairo"
```

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Location search text |
| `limit` | integer | No | Number of suggestions, maximum 10 |

The backend currently searches within Egypt using:

```text
filter=countrycode:eg
```

### Minimum Query Length

Queries shorter than two characters return an empty result:

```json
{
  "success": true,
  "results": []
}
```

### Successful Response

```json
{
  "success": true,
  "results": [
    {
      "name": "Cairo",
      "formatted": "Cairo, Cairo Governorate, Egypt",
      "lat": 30.0444,
      "lon": 31.2357,
      "result_type": "city",
      "city": "Cairo",
      "state": "Cairo Governorate",
      "country": "Egypt",
      "country_code": "eg",
      "postcode": null,
      "street": null,
      "housenumber": null,
      "address_line1": "Cairo",
      "address_line2": "Cairo Governorate, Egypt",
      "confidence": 1.0
    }
  ]
}
```

### Location Result Fields

| Field | Type | Description |
|---|---|---|
| `name` | string/null | Location name |
| `formatted` | string/null | Formatted address |
| `lat` | float | Latitude |
| `lon` | float | Longitude |
| `result_type` | string/null | Geoapify result type |
| `city` | string/null | City |
| `state` | string/null | State/governorate |
| `country` | string/null | Country |
| `country_code` | string/null | Country code |
| `postcode` | string/null | Postal code |
| `street` | string/null | Street |
| `housenumber` | string/null | House number |
| `address_line1` | string/null | First address line |
| `address_line2` | string/null | Second address line |
| `confidence` | float/null | Geoapify confidence score |

### Frontend Usage

When the user selects a suggestion, the frontend should store its coordinates:

```json
{
  "lat": 30.0444,
  "lon": 31.2357
}
```

The frontend should use these coordinates when calling the route analysis endpoint.

---

# 2. Analyze Routes

```text
POST /api/routes/analyze/
```

This is the primary route analysis endpoint.

The backend:

1. Gets available routes from OSRM.
2. Extracts route geometry.
3. Samples route points.
4. Retrieves heat/environmental data from FortyGuard.
5. Retrieves weather conditions from Open-Meteo.
6. Retrieves nearby POIs from Geoapify.
7. Retrieves traffic data from TomTom.
8. Retrieves traffic incidents from TomTom.
9. Calculates heat exposure risk.
10. Identifies critical route segments.
11. Compares available routes.
12. Selects the route with the lowest heat risk score.

---

## Request

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "origin_lat": 30.0444,
  "origin_lng": 31.2357,
  "destination_lat": 30.0131,
  "destination_lng": 31.2089
}
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `origin_lat` | float | Yes | Origin latitude |
| `origin_lng` | float | Yes | Origin longitude |
| `destination_lat` | float | Yes | Destination latitude |
| `destination_lng` | float | Yes | Destination longitude |

---

## Example cURL Request

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

---

# Response Structure

A successful response contains:

```json
{
  "status": "success",
  "recommended_route_id": "route_0",
  "routes_count": 2,
  "routes": [],
  "alternatives": []
}
```

---

# Route Object

Each analyzed route contains:

```text
route
 ├── id
 ├── distance_km
 ├── duration_min
 ├── geometry
 ├── heat_data
 ├── weather
 ├── hourly_conditions
 ├── pois
 ├── traffic
 └── risk
```

---

# Route Geometry

Coordinates use GeoJSON format:

```text
[longitude, latitude]
```

Example:

```json
{
  "geometry": {
    "coordinates": [
      [31.2357, 30.0444],
      [31.2348, 30.0438],
      [31.2339, 30.0432]
    ]
  }
}
```

> **Important:** The backend uses `[longitude, latitude]`, while Leaflet uses `[latitude, longitude]`.

The frontend should convert coordinates before drawing:

```javascript
const leafletCoordinates =
  route.geometry.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );
```

---

# Heat Data

ThermoRoute uses FortyGuard to retrieve environmental data for sampled route points.

Example:

```json
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
```

| Field | Type | Description |
|---|---|---|
| `lat` | float | Latitude |
| `lon` | float | Longitude |
| `temperature` | float | Temperature in Celsius |
| `humidity` | float | Relative humidity |
| `heat_index` | float | Heat index |
| `uv_index` | float | UV index |
| `aqi` | float | Air Quality Index |
| `risk_level` | string | Heat risk level |
| `timestamp` | string | Data timestamp |

---

# Weather Data

ThermoRoute uses Open-Meteo for current and hourly weather conditions.

The route response contains:

```json
{
  "weather": {
    "time": "2026-08-21T15:00",
    "temperature": 34.2,
    "feels_like": 38.1,
    "humidity": 48,
    "precipitation": 0.0,
    "wind_speed": 12.5,
    "uv_index": 8.2,
    "weather_code": 1
  },
  "hourly_conditions": []
}
```

### Current Weather Fields

| Field | Description |
|---|---|
| `time` | Current weather timestamp |
| `temperature` | Current temperature |
| `feels_like` | Apparent temperature |
| `humidity` | Relative humidity |
| `precipitation` | Current precipitation |
| `wind_speed` | Wind speed |
| `uv_index` | UV index |
| `weather_code` | Open-Meteo weather code |

### Hourly Conditions

The backend also provides hourly conditions including:

- Temperature
- Apparent temperature
- Humidity
- Precipitation probability
- Precipitation
- Wind speed
- UV index
- Weather code

---

# Nearby POIs

ThermoRoute uses the Geoapify Places API to identify useful locations near sampled route points.

Supported categories include:

```text
leisure.park
natural.forest
natural.water
catering.cafe
catering.restaurant
commercial.shopping_mall
commercial.supermarket
education.library
healthcare.hospital
amenity.drinking_water
```

---

## POI Classification

Geoapify categories are normalized into a smaller set of POI types.

| Type | Examples |
|---|---|
| `water` | Drinking water, natural water |
| `shade` | Parks, forests, natural areas |
| `indoor` | Cafes, restaurants, malls, supermarkets, libraries, hospitals |
| `other` | Anything that does not match the supported classifications |

---

## POI Object

```json
{
  "id": "poi_123",
  "type": "shade",
  "name": "Example Park",
  "lat": 30.0439,
  "lon": 31.2349,
  "distance": 120,
  "address": "Example Address",
  "categories": [
    "leisure.park"
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string/null | Geoapify POI identifier |
| `type` | string | Normalized POI type |
| `name` | string | POI name |
| `lat` | float | Latitude |
| `lon` | float | Longitude |
| `distance` | float/null | Distance from sampled point |
| `address` | string/null | Formatted address |
| `categories` | array | Original Geoapify categories |

### POI Search Radius

The default search radius is:

```text
500 meters
```

POI discovery uses a maximum of three representative route points to reduce unnecessary external API calls.

---

# Traffic Data

ThermoRoute uses the TomTom Traffic API for real-time traffic flow information.

Traffic is retrieved for representative sampled points along each route.

Example:

```json
{
  "traffic_level": "MODERATE",
  "traffic_score": 25,
  "congestion": 0.25,
  "current_speed": 15,
  "free_flow_speed": 20,
  "current_travel_time": 89,
  "free_flow_travel_time": 66,
  "confidence": 1,
  "incidents": []
}
```

## Traffic Fields

| Field | Type | Description |
|---|---|---|
| `traffic_level` | string | Traffic severity level |
| `traffic_score` | integer | Congestion score from 0 to 100 |
| `congestion` | float | Congestion ratio from 0 to 1 |
| `current_speed` | float | Current traffic speed |
| `free_flow_speed` | float | Expected speed without congestion |
| `current_travel_time` | integer | Current travel time in seconds |
| `free_flow_travel_time` | integer | Free-flow travel time in seconds |
| `confidence` | float | TomTom confidence value |
| `incidents` | array | Active traffic incidents |

---

## Traffic Levels

| Score | Level |
|---|---|
| `0 - 19` | `LOW` |
| `20 - 39` | `MODERATE` |
| `40 - 59` | `HIGH` |
| `60 - 79` | `VERY_HIGH` |
| `80 - 100` | `EXTREME` |

### Congestion Calculation

Traffic congestion is calculated from current and free-flow speeds:

```text
congestion = 1 - (current_speed / free_flow_speed)
```

The value is normalized between `0` and `1`.

The traffic score is:

```text
traffic_score = congestion × 100
```

---

# Traffic Incidents

TomTom traffic incidents are returned inside:

```json
{
  "incidents": []
}
```

An incident can contain:

```json
{
  "id": "incident-id",
  "type": "TrafficIncident",
  "description": "Traffic event description",
  "code": "event-code",
  "icon_category": 6,
  "magnitude": 2,
  "delay_seconds": 120,
  "length_meters": 500,
  "start_time": "2026-08-21T15:00:00Z",
  "end_time": "2026-08-21T16:00:00Z",
  "from": "Road A",
  "to": "Road B",
  "road_numbers": [],
  "time_validity": "present",
  "probability_of_occurrence": 1,
  "number_of_reports": 2,
  "last_report_time": "2026-08-21T15:10:00Z",
  "geometry": {
    "type": "LineString",
    "coordinates": []
  }
}
```

Traffic incidents can be displayed by the frontend as warnings or markers along the route.

---

# Risk Calculation

The backend calculates deterministic heat exposure risk using:

- Temperature
- Heat Index
- Humidity
- AQI

Current weights:

| Metric | Weight |
|---|---|
| Temperature | 30% |
| Heat Index | 35% |
| Humidity | 15% |
| AQI | 20% |

---

## Risk Levels

| Score | Risk Level |
|---|---|
| `0 - 19` | `LOW` |
| `20 - 39` | `MODERATE` |
| `40 - 59` | `HIGH` |
| `60 - 79` | `VERY_HIGH` |
| `80 - 100` | `EXTREME` |

---

## Risk Object

```json
{
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
```

### Critical Segments

Critical segments are route segments with:

```text
HIGH
VERY_HIGH
EXTREME
```

risk levels.

The frontend can use these segments to highlight dangerous areas.

---

# Route Recommendation

The backend currently recommends the route with the **lowest heat risk score**.

```text
recommended_route
        |
        v
lowest risk.score
```

The response contains:

```json
{
  "recommended_route_id": "route_0"
}
```

Alternative routes are returned separately:

```json
{
  "alternatives": [
    {
      "route_id": "route_1",
      "risk_score": 48,
      "risk_level": "HIGH",
      "distance_km": 7.2,
      "duration_min": 20.5,
      "traffic_level": "MODERATE",
      "congestion_score": 25
    }
  ]
}
```

---

# Route Sampling

The backend samples route geometry before requesting external environmental data.

The current maximum number of heat-analysis points per route is:

```text
5
```

For example:

```text
Route Geometry
      |
      v
Many coordinates
      |
      v
Sample up to 5 points
      |
      +-------------------+
      |                   |
      v                   v
 FortyGuard          Weather/Traffic
```

POI discovery uses an additional reduction and queries a maximum of **3 representative points**.

The frontend does not need to know how sampling works. It only consumes:

```text
heat_data[]
pois[]
traffic
weather
```

---

# External Services

| Service | Used For |
|---|---|
| **OSRM** | Route generation, geometry, distance, estimated duration |
| **FortyGuard** | Temperature, humidity, heat index, UV index, AQI, environmental risk |
| **Open-Meteo** | Current and hourly weather conditions |
| **Geoapify Places API** | Nearby parks, natural areas, water, cafes, restaurants, malls, supermarkets, libraries, hospitals, drinking water |
| **Geoapify Geocoding API** | Location autocomplete and coordinate lookup |
| **TomTom Traffic API** | Real-time traffic flow and traffic incidents |

---

# Complete API Flow

```text
                         FRONTEND
                            |
             +--------------+--------------+
             |                             |
             v                             v
      Location Search               Route Analysis
             |                             |
             v                             v
GET /locations/                 POST /routes/analyze/
autocomplete/                           |
             |                          |
             v                          v
         Geoapify                 RouteAnalysisService
             |                          |
             v                          v
      Suggestions                 RouteProvider
                                        |
                                        v
                                       OSRM
                                        |
                                        v
                                 Route Geometry
                                        |
                                        v
                                  Route Sampling
                                        |
              +-------------------------+-------------------------+
              |               |                 |                 |
              v               v                 v                 v
         FortyGuard       Open-Meteo        Geoapify           TomTom
              |               |                 |                 |
              v               v                 v                 v
          Heat Data      Weather Data       Nearby POIs      Traffic Data
                                                                |
                                                                v
                                                           Incidents
              |               |                 |                 |
              +---------------+-----------------+-----------------+
                                      |
                                      v
                                Route Analysis
                                      |
                                      v
                              Risk + Comparison
                                      |
                                      v
                               Recommended Route
                                      |
                                      v
                                  FRONTEND
```

---

# Performance Considerations

A route analysis requires multiple external service calls:

```text
Route
  |
  v
Sample Points
  |
  +--> FortyGuard
  |
  +--> Open-Meteo
  |
  +--> Geoapify
  |
  +--> TomTom
  |
  v
Risk Analysis
  |
  v
Response
```

This can make the request take several seconds depending on:

- Number of routes
- Number of sampled points
- FortyGuard processing time
- FortyGuard polling duration
- External API response time
- Network latency

The frontend should:

- Display a loading state.
- Prevent duplicate submissions.
- Handle timeout/error responses.
- Avoid blocking the UI.
- Display graceful fallback states when optional services fail.

The backend should use an appropriate Gunicorn timeout.

---

# Failure Handling

External services are treated differently depending on their importance.

### Route Provider

Route retrieval is required.

If no routes are returned:

```json
{
  "success": false,
  "errors": [
    "No routes found"
  ]
}
```

### Heat Analysis

Heat analysis is required for the current route recommendation.

If heat analysis fails, route analysis returns an error.

### Weather

Weather is supplementary.

If Open-Meteo fails, the route can still be returned with:

```json
{
  "weather": {},
  "hourly_conditions": []
}
```

### POIs

POIs are supplementary.

If Geoapify fails:

```json
{
  "pois": []
}
```

The route analysis continues.

### Traffic

Traffic is supplementary.

If TomTom fails:

```json
{
  "traffic": {
    "traffic_level": "UNKNOWN",
    "traffic_score": 0,
    "congestion": 0.0,
    "current_speed": null,
    "free_flow_speed": null,
    "current_travel_time": null,
    "free_flow_travel_time": null,
    "confidence": null,
    "incidents": []
  }
}
```

The route analysis continues.

---

# Error Responses

For backend/service failures:

```text
502 Bad Gateway
```

Example:

```json
{
  "success": false,
  "errors": [
    "Failed to retrieve heat data"
  ]
}
```

Invalid request data returns a DRF validation response:

```json
{
  "origin_lat": [
    "This field is required."
  ]
}
```

The frontend should show a user-friendly error message and avoid exposing raw Python/Django errors.

---

# Main Frontend Contract

The frontend primarily interacts with two endpoints.

## Location Search

```text
GET /api/routes/locations/autocomplete/?q=<search>
```

Example:

```text
GET /api/routes/locations/autocomplete/?q=Maadi
```

The frontend receives suggestions containing:

```text
name
formatted
lat
lon
city
state
country
```

The selected `lat` and `lon` are then used for route analysis.

---

## Route Analysis

```text
POST /api/routes/analyze/
```

### Send

```json
{
  "origin_lat": "number",
  "origin_lng": "number",
  "destination_lat": "number",
  "destination_lng": "number"
}
```

### Receive

```text
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
    +-- weather
    |
    +-- hourly_conditions[]
    |
    +-- pois[]
    |      |
    |      +-- id
    |      +-- type
    |      +-- name
    |      +-- lat
    |      +-- lon
    |      +-- distance
    |      +-- address
    |      +-- categories
    |
    +-- traffic
    |      |
    |      +-- traffic_level
    |      +-- traffic_score
    |      +-- congestion
    |      +-- current_speed
    |      +-- free_flow_speed
    |      +-- current_travel_time
    |      +-- free_flow_travel_time
    |      +-- confidence
    |      +-- incidents[]
    |
    +-- risk
           |
           +-- score
           +-- level
           +-- critical_segments[]
           +-- metrics
```

---

# Frontend Integration Checklist

- [ ] Interactive map
- [ ] Location autocomplete
- [ ] Origin search input
- [ ] Destination search input
- [ ] Origin selection from autocomplete
- [ ] Destination selection from autocomplete
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
- [ ] Display current weather
- [ ] Display hourly weather
- [ ] Display nearby POIs
- [ ] Add POI markers
- [ ] Display traffic level
- [ ] Display traffic congestion
- [ ] Display traffic incidents
- [ ] Highlight risky areas
- [ ] Allow route selection
- [ ] Highlight recommended route
- [ ] Display alternative routes

---

# Known Limitations

## External API Dependency

ThermoRoute depends on several external APIs:

- OSRM
- FortyGuard
- Open-Meteo
- Geoapify
- TomTom

Availability and response time depend on these services.

## Heat Data Latency

FortyGuard may require asynchronous processing and polling before heat data becomes available.

## Traffic Coverage

TomTom traffic data availability depends on the selected location and road coverage.

## Location Autocomplete

Location autocomplete currently filters results to Egypt:

```text
countrycode:eg
```

This can be changed later if ThermoRoute expands to additional countries.

## Route Recommendation

The current recommendation prioritizes the lowest heat risk score.

Traffic, distance, duration, and POI availability are currently returned as supporting information rather than being combined into the primary recommendation score.

---

# Summary

ThermoRoute combines:

```text
Routing
   +
Heat Analysis
   +
Weather
   +
Traffic
   +
Traffic Incidents
   +
Nearby POIs
   +
Location Autocomplete
   +
Route Comparison
```

into a heat-aware route planning system.

The goal is not simply to find the shortest route, but to help users understand the environmental and traffic conditions along available routes and choose a safer and more comfortable route.