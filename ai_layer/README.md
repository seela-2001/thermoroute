# HeatOps AI Layer

AI-powered heat-aware route recommendation layer. A library providing deterministic risk calculation, route optimization, and optional AI-powered natural language explanations.

This is a pure AI/library layer - no frontend or backend included. Consume it from any application.

## Installation

```bash
pip install -e .
```

Or install dependencies:

```bash
pip install -r requirements.txt
```

## Quick Start

### Using with Environment Variables (Recommended)

```python
import sys, pathlib
from dotenv import load_dotenv

# Make the repo root importable regardless of where Jupyter launched from
sys.path.insert(0, str(pathlib.Path.cwd().parent))
load_dotenv(pathlib.Path.cwd().parent / '.env')

from ai import FortyGuardService

# Initialize FortyGuard client
client = FortyGuardService()
print('Base URL :', client.base_url)
print('API key  :', client.api_key[:6] + '…' if client.api_key else '(missing)')

# Get real heat data
heat_data = client.get_heat_or_mock(lat=40.7128, lon=-74.0060, base_temp=30.0)
print(f"Temperature: {heat_data.temperature}°C")
print(f"Risk Level: {heat_data.risk_level}")
```

### Using the Deterministic Core (No API Keys Required)

```python
from heatops import RouteRecommendationService, RecommendationRequest

# Initialize service (works without any API keys)
service = RouteRecommendationService()

# Create request
request = RecommendationRequest(
    origin="New York, NY",
    destination="Allentown, PA",
    temperature=35.0,
    humidity=65.0
)

# Get recommendation
result = service.get_recommendation(request)
print(result.recommendation["headline"])
```

### Using AI Explanations

```python
import asyncio
import sys, pathlib
from dotenv import load_dotenv

sys.path.insert(0, str(pathlib.Path.cwd().parent))
load_dotenv(pathlib.Path.cwd().parent / '.env')

from ai import OpenRouterProvider, TravelExplanationAgent, build_ai_context

async def main():
    # Initialize provider (loads OPENROUTER_API_KEY from .env)
    provider = OpenRouterProvider()

    # Create agent
    agent = TravelExplanationAgent(provider)

    # Build context from your route data
    context = build_ai_context({
        "trip": {
            "origin": "New York, NY",
            "destination": "Allentown, PA",
            "departure_time": "2024-08-20T14:00:00Z",
        },
        "routes": [
            {
                "id": "A",
                "name": "I-80 West - Direct Route",
                "distance_km": 150.0,
                "duration_min": 90.0,
                "road_identifiers": ["I-80", "I-76"]
            }
        ],
        "risk_scores": {
            "A": {
                "heat_risk_score": 35.0,
                "comfort_score": 75.0,
                "exposure_time_min": 90.0,
                "overall_score": 70.0,
                "risk_level": "MODERATE"
            }
        }
    })

    context.selected_route = context.candidate_routes[0]
    result = await agent.explain(context)

    print(result.headline)
    print(result.summary)

asyncio.run(main())
```

## Environment Variables

All configuration is done via environment variables. Copy `.env.example` to `.env` and configure.

### Required for AI Explanations

```env
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=google/gemma-2-9b-it:free
```

Get your API key at: https://openrouter.ai/keys

### Optional: For Real Heat Data

```env
FORTYGUARD_API_KEY=your-key
FORTYGUARD_BASE_URL=https://api.fortyguard.com/v1
FORTYGUARD_TIMEOUT=10
```

### Optional: Risk Weights (default values shown)

```env
# Must sum to 100
RISK_WEIGHT_TEMPERATURE=30.0
RISK_WEIGHT_HEAT_INDEX=35.0
RISK_WEIGHT_HUMIDITY=15.0
RISK_WEIGHT_AQI=20.0
```

### Optional: Optimization Weights (default values shown)

```env
# Must sum to 100
OPTIM_WEIGHT_DISTANCE=20.0
OPTIM_WEIGHT_DURATION=20.0
OPTIM_WEIGHT_HEAT_RISK=40.0
OPTIM_WEIGHT_ENVIRONMENTAL=20.0
```

### Optional: Risk Thresholds

```env
THRESHOLD_EXTREME=80
THRESHOLD_VERY_HIGH=60
THRESHOLD_HIGH=40
THRESHOLD_MODERATE=20
```

### Optional: Normalization Ranges

```env
NORM_MAX_TEMPERATURE=50.0
NORM_MAX_HEAT_INDEX=55.0
NORM_MAX_AQI=200.0
NORM_MAX_DISTANCE=50.0
NORM_MAX_DURATION=120.0
NORM_HUMIDITY_OPTIMAL=50.0
```

## API Reference

### FortyGuardService

```python
from ai import FortyGuardService

# Initialize (loads from .env)
client = FortyGuardService()

# Check configuration
print(f"Configured: {client.is_configured()}")
print(f"Base URL: {client.base_url}")
print(f"Timeout: {client.timeout}s")

# Get real heat data
heat_data = client.get_heat_data(lat=40.7128, lon=-74.0060, radius_km=1.0)

# Get heat data with automatic fallback to mock
heat_data = client.get_heat_or_mock(lat=40.7128, lon=-74.0060, base_temp=30.0)

# Get heat data for a route
route_heat = client.get_route_heat([
    {"lat": 40.7128, "lon": -74.0060},
    {"lat": 40.8000, "lon": -74.5000}
])

# Generate mock data
mock_data = client.mock_heat_data(lat=40.7128, lon=-74.0060, base_temp=30.0)
```

### OpenRouterProvider

```python
from ai import OpenRouterProvider
from ai.providers.base import LLMConfig

# Initialize (loads from .env)
provider = OpenRouterProvider()

# Or with custom config
config = LLMConfig(
    model="google/gemma-2-9b-it:free",
    temperature=0.3,
    max_tokens=1000,
    timeout_seconds=30,
    max_retries=3
)
provider = OpenRouterProvider(config=config)

# Generate response
response = await provider.generate(
    system_prompt="You are a helpful assistant.",
    user_prompt="Explain this route data."
)
```

### Config from Environment

```python
from config import Config

# Load all config from environment variables
config = Config.from_env()

# Access values
print(f"Heat risk weight: {config.optimization_weights.heat_risk}%")
print(f"Extreme threshold: {config.thresholds.EXTREME}")
print(f"Max temperature: {config.normalization.temperature_max}°C")
```

## Project Structure

```
heatops-ai/
├── setup.py              # Package setup
├── requirements.txt      # Dependencies
├── README.md             # This file
├── examples.py           # Usage examples
├── .env.example          # Environment template
├── .gitignore            # Git ignore
├── LICENSE               # MIT License
├── MANIFEST.in           # Package manifest
├── heatops.py            # Main service entry point
├── services.py           # Core services
├── config.py             # Configuration (env vars)
├── exceptions.py         # Custom exceptions
└── ai/                   # AI Layer
    ├── __init__.py       # Package exports
    ├── schemas.py        # Data structures
    ├── prompts.py        # AI system prompts
    ├── context_builder.py # AI context builder
    ├── fortyguard_service.py # Heat data (env vars)
    ├── agents/           # AI agents
    │   ├── __init__.py
    │   ├── base.py       # Base agent
    │   └── travel_explanation_agent.py
    └── providers/        # LLM providers
        ├── __init__.py
        ├── base.py       # Provider interface
        └── openrouter.py # OpenRouter (env vars)
```

## Design Principles

1. **Configuration via Environment** - All values configurable, no hardcoded constants
2. **Deterministic Before AI** - Core functionality works without AI
3. **AI Only Explains** - AI generates natural language, never makes decisions
4. **Graceful Degradation** - Mock data fallbacks when APIs unavailable
5. **Zero Dependencies for Core** - Deterministic core requires no external APIs
6. **Consumer Agnostic** - Works with Python, Node.js, or any HTTP consumer

## License

MIT