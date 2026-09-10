# ThermoDispatch

## About

ThermoDispatch is a heat-aware route planning platform that answers one question: **"What time should we leave?"**

Traditional routing systems optimize for distance and time. They don't account for the heat you'll face at each point along the way — which changes depending on when you actually get there. ThermoDispatch solves this by performing **time-of-passage forecasting**: for every departure candidate, it calculates when you'll physically arrive at each waypoint along the route, then looks up the weather conditions at that specific hour. The result is a ranked comparison of route/departure combinations scored on composite heat risk, letting you pick the safest time to travel — not just the fastest route.

## Features

- **Departure-time optimization** — evaluates up to 97 departure candidates across a configurable window (default 12 hours, 60-min steps) and ranks them by heat exposure
- **Time-of-passage weather lookup** — heat data is fetched at each waypoint's expected arrival time, not at request time or the destination
- **Composite heat scoring** — temperature, heat index, humidity, AQI, and UV index weighted and normalized into a single 0–100 risk score per waypoint
- **Route alternatives** — OSRM returns up to 3 candidate routes; all are evaluated across all departure times
- **AI travel explanation** — LLM (via OpenRouter) receives the actual scores and departure table, then produces a GO / CAUTION / DELAY recommendation in plain language
- **AI trip parser** — chat widget accepts natural-language trip descriptions and auto-fills the form
- **Post-analysis Q&A** — ask follow-up questions about the route results in the chat widget
- **Cooling stop suggestions** — deterministic (no LLM) POI recommendations near high-risk segments
- **POIs along route** — gas stations, hospitals, parks, water points via Geoapify Places
- **Traffic-aware duration** — optional TomTom integration for live travel-time adjustment; falls back to time-of-day multipliers
- **Location autocomplete** — Geoapify-backed address search with coordinate resolution
- **Interactive map** — Leaflet with heat-colored waypoints and route polylines
- **Departure hours panel** — hour-by-hour temperature and risk bar chart
- **Heat intel tab** — per-departure temperature and score breakdown
- **Resilient heat data** — FortyGuard primary with transparent Open-Meteo fallback; no degradation visible to the user

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Framer Motion |
| UI Components | Radix UI, Lucide React |
| Map | Leaflet 1.9, leaflet.heat |
| HTTP client | Axios |
| Backend | Django 6.1, Django REST Framework |
| Python runtime | Python 3.14+, uv |
| AI package | heatops-ai (local editable package, `ai_layer/`) |
| LLM provider | OpenRouter (`openai/gpt-4o-mini` default) |
| Database | PostgreSQL (configured; analysis pipeline is stateless) |
| Routing | OSRM public server |
| Geocoding / POI | Geoapify |
| Heat data | FortyGuard (primary), Open-Meteo (fallback) |
| Traffic | TomTom Routing API (optional) |
| Containers | Docker, docker-compose |
| Orchestration | Helm chart, Argo CD |

## Getting Started

**Prerequisites:**

- Python 3.14+
- Node.js 20+ and npm 10+
- [uv](https://docs.astral.sh/uv/) — `pip install uv`
- PostgreSQL (optional — only needed if you want to use the database models)

**Clone the repo:**

```bash
git clone <repo-url>
cd thermoroute
```

## Installation

**Backend:**

```bash
cd backend
uv sync
```

`uv sync` installs all Python dependencies including the `ai_layer` package as an editable local install.

If you want to use the database models, run migrations:

```bash
uv run python manage.py migrate
```

**Frontend:**

```bash
cd frontend
npm install
```

## Environment Variables

**`backend/.env`** — copy from `backend/.env.example` and fill in your keys:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Database (optional for local development)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=thermoroute
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# Required
GEOAPIFY_API_KEY=your-geoapify-key
OPENROUTER_API_KEY=sk-or-v1-your-key

# Optional (app works without these — graceful fallbacks apply)
FORTYGUARD_API_KEY=your-fortyguard-key
FORTYGUARD_BASE_URL=https://api.fortyguard.com/v1
FORTYGUARD_TIMEOUT=100
TOMTOM_API_KEY=your-tomtom-key
```

**`ai_layer/.env`** — copy from `ai_layer/.env.example`:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_TEMPERATURE=0.3
OPENROUTER_MAX_TOKENS=1000
OPENROUTER_TIMEOUT=30
OPENROUTER_MAX_RETRIES=3

FORTYGUARD_API_KEY=your-fortyguard-key
FORTYGUARD_BASE_URL=https://api.fortyguard.com/v1

# Risk weights — must sum to 100
RISK_WEIGHT_TEMPERATURE=30.0
RISK_WEIGHT_HEAT_INDEX=35.0
RISK_WEIGHT_HUMIDITY=15.0
RISK_WEIGHT_AQI=20.0
```

**`frontend/.env`:**

```env
VITE_API_BASE_URL=http://localhost:8000
```

> Never commit `.env` files. Both `backend/.env` and `ai_layer/.env` are listed in `.gitignore`.

## Usage

**Start the backend:**

```bash
cd backend
uv run python manage.py runserver 8000
```

**Start the frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and navigate to `/plan`.

1. Type an origin city or address and select from the autocomplete suggestions
2. Type a destination and select from suggestions
3. Adjust the departure window, step size, and weather/time weight sliders if needed
4. Click **Find the best departure**
5. The results page shows the recommended departure time, a heat-scored map, the hour-by-hour departure comparison, route alternatives, AI explanation, and cooling stop suggestions

**Production build:**

```bash
cd frontend
npm run build
# serve the dist/ folder with any static file server
```

## Live Demo

Recommended demo route: **Phoenix, AZ → Tucson, AZ** (I-10 corridor). The route crosses desert terrain where a morning departure produces meaningfully lower heat scores than a midday one — making the departure-time comparison easy to see and explain.

Suggested walkthrough:
1. Enter Phoenix, AZ → Tucson, AZ
2. Leave the departure window at 12 h / 60-min steps
3. Click **Analyze** and wait for results (~14 s with Open-Meteo fallback, ~45 s with FortyGuard)
4. Point to the departure hours panel to show the temperature delta between 6 AM and 2 PM slots
5. Show the AI recommendation card (GO / CAUTION / DELAY badge + key factors)
6. Open the chat widget and ask: *"What's the worst stretch of the route?"*
