# ThermoRoute Backend API

ThermoRoute is a heat-aware route analysis backend that combines route generation, environmental data, heat exposure analysis, and nearby Points of Interest (POIs) to help users choose safer and more comfortable routes.

The backend is built with Django and Django REST Framework and integrates with external services for routing, heat/environmental data, and POI discovery.

---

## Tech Stack

- Python 3.14
- Django 6.1
- Django REST Framework
- PostgreSQL
- OSRM (routing)
- FortyGuard (heat/environmental data)
- Geoapify Places API (POIs)
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
     +----------------------+----------------------+
     |                      |                      |
     v                      v                      v
RouteProvider       HeatAnalysisService       POIService
     |                      |                      |
     v                      v                      v
    OSRM                FortyGuard             Geoapify
     |                      |                      |
     v                      v                      v
Route Geometry         Heat Data              Nearby POIs
     |                      |                      |
     +----------------------+----------------------+
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

## Project Structure

```text
backend/
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── ...
│
├── routes/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── services/
│   │   ├── route_analysis.py
│   │   ├── route_provider.py
│   │   └── ...
│   └── ...
│
├── heat/
│   ├── models.py
│   ├── serializers.py
│   ├── services/
│   │   ├── fortyguard.py
│   │   └── ...
│   └── ...
│
├── requirements/
├── Dockerfile
├── entrypoint.sh
├── pyproject.toml
└── manage.py
```

---

## Installation Guide

### Prerequisites

- Python 3.14+
- PostgreSQL 14+ (running locally or accessible remotely)
- Docker & Docker Compose (recommended, especially since OSRM typically runs as its own container)
- API keys for **Geoapify** and **FortyGuard**

### Option A — Run with Docker (recommended)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd thermoroute/backend
   ```

2. **Create your `.env` file** (see [Environment Variables](#environment-variables) below)
   ```bash
   cp .env.example .env
   # then edit .env with your real values
   ```

3. **Build and start the backend**
   ```bash
   docker compose up --build backend
   ```

   Or start the full stack (backend + database + OSRM, etc.):
   ```bash
   docker compose up --build
   ```

4. **Run database migrations** (if not handled automatically by `entrypoint.sh`)
   ```bash
   docker compose exec backend python manage.py migrate
   ```

5. **Create a superuser** (optional, for Django admin access)
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

6. **Verify the backend is running**
   ```bash
   curl http://localhost:8000/
   ```

7. **Check logs if something looks off**
   ```bash
   docker logs -f thermoroute_backend
   ```

The backend will be available at:
```
http://localhost:8000
```

### Option B — Run locally without Docker

1. **Clone the repository and enter the backend folder**
   ```bash
   git clone <your-repo-url>
   cd thermoroute/backend
   ```

2. **Install [uv](https://docs.astral.sh/uv/)** (if not already installed)
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh   # Linux / macOS
   # or on Windows (PowerShell):
   # powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

3. **Install dependencies and create the virtual environment**
   ```bash
   uv sync
   ```
   This reads `pyproject.toml` / `uv.lock`, creates a `.venv` automatically, and installs all dependencies with the exact locked versions.

   To run any command inside the environment, prefix it with `uv run`, e.g.:
   ```bash
   uv run python manage.py migrate
   ```
   Or activate the environment manually:
   ```bash
   source .venv/bin/activate      # Linux / macOS
   .venv\Scripts\activate         # Windows
   ```

4. **Set up PostgreSQL**
   - Create a database and user for the project.
   - Update the database connection settings via environment variables (see below).

5. **Create your `.env` file** in the project root (see [Environment Variables](#environment-variables))

6. **Apply migrations**
   ```bash
   uv run python manage.py migrate
   ```

7. **Run the development server**
   ```bash
   uv run python manage.py runserver
   ```

The backend will be available at:
```
http://localhost:8000
```

> **Note:** OSRM is expected to be reachable by the backend (either as a separate Docker container or a hosted OSRM instance). Make sure its URL is configured wherever the `RouteProvider` service expects it.

---

## Environment Variables

The backend requires API credentials for external services.

Example `.env`:

```env
# External services
GEOAPIFY_API_KEY=your_geoapify_api_key
FORTYGUARD_API_KEY=your_fortyguard_api_key

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

⚠️ **Never commit real API keys or secrets to Git.**

---

## Health Check

Verify that the Django backend is running:

```bash
curl http://localhost:8000/
```

Inspect container logs:

```bash
docker logs -f thermoroute_backend
```

---

## Main API Endpoint

### Analyze Routes

```
POST /api/routes/analyze/
```

This is the primary endpoint used by the frontend.

The frontend sends origin/destination coordinates. The backend then:

1. Gets available routes from OSRM.
2. Extracts route geometry.
3. Samples points from each route.
4. Retrieves heat/environmental data using FortyGuard.
5. Retrieves nearby POIs using Geoapify.
6. Calculates heat exposure risk.
7. Identifies critical route segments.
8. Returns the analyzed routes.

#### Request

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
| `origin_lat` | float | Yes | Origin latitude |
| `origin_lng` | float | Yes | Origin longitude |
| `destination_lat` | float | Yes | Destination latitude |
| `destination_lng` | float | Yes | Destination longitude |

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

> The coordinates above are example values only. In the actual application, the frontend gets the coordinates directly from the interactive map.

#### Successful Response — `200 OK`

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
      "pois": [
        {
          "id": "poi_123",
          "type": "shade",
          "name": "Example Park",
          "lat": 30.0439,
          "lon": 31.2349,
          "distance": 120,
          "address": "Example Address",
          "categories": ["leisure.park"]
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

#### Error Responses

If the backend cannot retrieve route, heat, or POI data:

```
502 Bad Gateway
```
```json
{
  "success": false,
  "errors": ["Failed to retrieve heat data"]
}
```

Invalid request data (DRF validation error):

```json
{
  "origin_lat": ["This field is required."]
}
```

The frontend should show a user-friendly message and avoid exposing raw Python/Django errors to the user.

---

## Response Structure

Top-level response:

```json
{
  "status": "success",
  "routes": []
}
```

Each `route` contains:

```
route
 ├── id
 ├── distance_km
 ├── duration_min
 ├── geometry
 ├── heat_data
 ├── pois
 └── risk
```

### Route Geometry

Coordinates use GeoJSON format: `[longitude, latitude]`

```json
"geometry": {
  "coordinates": [
    [31.2357, 30.0444],
    [31.2348, 30.0438],
    [31.2339, 30.0432]
  ]
}
```

> **Important:** The backend uses `[longitude, latitude]`, while Leaflet uses `[latitude, longitude]`. The frontend must convert coordinates before drawing the route:
> ```js
> const leafletCoordinates = route.geometry.coordinates.map(
>   ([lng, lat]) => [lat, lng]
> );
> ```

### Heat Data

| Field | Type | Description |
|---|---|---|
| `lat` | float | Latitude |
| `lon` | float | Longitude |
| `temperature` | float | Temperature in Celsius |
| `humidity` | float | Relative humidity percentage |
| `heat_index` | float | Heat index |
| `uv_index` | float | UV index |
| `aqi` | float | Air Quality Index |
| `risk_level` | string | Heat risk level |
| `timestamp` | string | Timestamp of the data |

### Nearby POIs

ThermoRoute uses the **Geoapify Places API** to identify useful locations near sampled route points, such as parks, water sources, cafes, restaurants, malls, supermarkets, libraries, and hospitals.

**Supported Geoapify categories:**

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

> `amenity.fountain` and `leisure.garden` are intentionally **not** used — they are not supported Geoapify Places categories.

**POI Classification**

The backend normalizes Geoapify categories into a smaller set of POI types:

| Type | Example categories |
|---|---|
| `water` | `amenity.drinking_water`, `natural.water` |
| `shade` | `leisure.park`, `natural.forest` |
| `indoor` | `catering.cafe`, `catering.restaurant`, `commercial.shopping_mall`, `commercial.supermarket`, `education.library`, `healthcare.hospital` |
| `other` | Anything that doesn't match the above |

**POI Object**

```json
{
  "id": "poi_123",
  "type": "shade",
  "name": "Example Park",
  "lat": 30.0439,
  "lon": 31.2349,
  "distance": 120,
  "address": "Example Address",
  "categories": ["leisure.park"]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string/null | Geoapify POI identifier |
| `type` | string | Normalized POI type |
| `name` | string | POI name |
| `lat` | float | POI latitude |
| `lon` | float | POI longitude |
| `distance` | float/null | Distance from the sampled route point |
| `address` | string/null | Formatted POI address |
| `categories` | array | Original Geoapify categories |

**POI Search Radius:** default is `500` meters (`DEFAULT_RADIUS = 500`), configurable internally.

Only a limited number of route points are used for POI discovery to reduce unnecessary external API requests.

### Route Sampling

The backend samples route geometry before requesting external environmental and POI data.

```
max_points = 20
```

A route may therefore be represented by up to 20 heat-analysis points. POI discovery uses a smaller subset of sampled points to reduce the number of external requests. The frontend does not need to know how sampling works — it only consumes `heat_data[]` and `pois[]`.

### Risk Calculation

The backend calculates a deterministic heat exposure score from Temperature, Heat Index, Humidity, and AQI.

**Current Weights**

| Metric | Weight |
|---|---|
| Temperature | 30% |
| Heat Index | 35% |
| Humidity | 15% |
| AQI | 20% |

**Risk Levels**

| Score | Risk Level |
|---|---|
| 0 – 19 | `LOW` |
| 20 – 39 | `MODERATE` |
| 40 – 59 | `HIGH` |
| 60 – 79 | `VERY_HIGH` |
| 80 – 100 | `EXTREME` |

**Risk Object**

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

- **Critical segments**: route segments with `HIGH`, `VERY_HIGH`, or `EXTREME` risk. The frontend can use this to highlight dangerous areas.
- **Metrics**: maximum environmental values detected along the route.

---

## External Services

| Service | Used for |
|---|---|
| **OSRM** | Route generation, geometry, distance, estimated duration |
| **FortyGuard** | Temperature, humidity, heat index, UV index, AQI, environmental risk data |
| **Geoapify** | Nearby parks, forest/natural areas, water sources, cafes, restaurants, malls, supermarkets, libraries, hospitals, drinking water |

---

## Complete API Flow

```text
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
                     Route Sampling
                            |
              +-------------+-------------+
              |                           |
              v                           v
        FortyGuard                    Geoapify
              |                           |
              v                           v
         Heat Data                    Nearby POIs
              |                           |
              +-------------+-------------+
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
```

---

## Performance Considerations

A single route analysis requires:

```
Route → Sample Points → FortyGuard Requests + Geoapify Requests → Risk Calculation
```

This can make the API request take several seconds depending on route length, number of sampled points, and external API response time (FortyGuard may require polling before heat data becomes available).

The frontend must:
- Display a loading state.
- Prevent duplicate submissions.
- Handle timeout/error responses.
- Avoid blocking the UI while analysis is running.

The backend should use an appropriate Gunicorn timeout and avoid unnecessary sequential external requests.

---

## Known Limitations

**External API Latency**

Route analysis depends on multiple external services. FortyGuard may require polling before heat data becomes available, while Geoapify requires additional requests for nearby POIs. As a result, the complete analysis can take several seconds depending on:

- Route length
- Number of sampled points
- External API response time
- FortyGuard polling duration

---

## Main Frontend Contract

The frontend only needs to know one main endpoint:

```
POST /api/routes/analyze/
```

**Send**
```json
{
  "origin_lat": "number",
  "origin_lng": "number",
  "destination_lat": "number",
  "destination_lng": "number"
}
```

**Receive**
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
    +-- risk
           |
           +-- score
           +-- level
           +-- critical_segments[]
           +-- metrics
```

---

## Frontend Integration Checklist

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
- [ ] Display nearby POIs
- [ ] Add POI markers
- [ ] Highlight risky areas
- [ ] Allow route selection

---

## Summary

ThermoRoute combines **Routing + Heat Analysis + Environmental Risk + Nearby POIs + Route Comparison** into Heat-Aware Route Planning. The goal is not simply to find the shortest route, but to help users understand the environmental conditions along each route and choose a safer and more comfortable option.
