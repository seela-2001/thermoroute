"""
Usage Examples for HeatOps AI Layer

This file demonstrates how to use the library with real API data.
"""
import sys
import pathlib
import os

# Make the repo root importable regardless of where Jupyter launched from
sys.path.insert(0, str(pathlib.Path.cwd().parent))

from dotenv import load_dotenv
load_dotenv(pathlib.Path.cwd().parent / '.env')

# ==================== EXAMPLE 1: FortyGuard Real Data ====================

print("=" * 60)
print("Example 1: FortyGuard Service with Real Data")
print("=" * 60)

from ai import FortyGuardService

# Initialize FortyGuard client
# Will automatically load FORTYGUARD_API_KEY from .env
client = FortyGuardService()

print(f'Base URL : {client.base_url}')
print(f'API key  : {client.api_key[:6]}…' if client.api_key else '(missing)')
print(f'Timeout  : {client.timeout}s')
print(f'Configured: {client.is_configured()}')
print()

if client.is_configured():
    # Get real heat data for a location
    # Note: Use a historical date since current date may not have data yet
    try:
        heat_data = client.get_heat_data(
            lat=40.7128,
            lon=-74.0060,
            radius_km=1.0,
            start_date='2024-07-15',
            start_time='14:00'
        )
        print(f"Location: {heat_data.location}")
        print(f"Temperature: {heat_data.temperature}°C")
        print(f"Humidity: {heat_data.humidity}%")
        print(f"Heat Index: {heat_data.heat_index}°C")
        print(f"Risk Level: {heat_data.risk_level}")
    except Exception as e:
        print(f"Error fetching real data: {e}")
        print("\nUsing mock data fallback...")
        mock_data = client.mock_heat_data(lat=40.7128, lon=-74.0060, base_temp=30.0)
        print(f"Mock Temperature: {mock_data.temperature}°C")
        print(f"Mock Risk Level: {mock_data.risk_level}")
else:
    print("API key not configured, using mock data...")
    mock_data = client.mock_heat_data(lat=40.7128, lon=-74.0060, base_temp=30.0)
    print(f"Mock Temperature: {mock_data.temperature}°C")
    print(f"Mock Risk Level: {mock_data.risk_level}")


# ==================== EXAMPLE 2: Route Heat Data ====================

print("\n" + "=" * 60)
print("Example 2: Get Heat Data for a Route")
print("=" * 60)

route_geometry = [
    {"lat": 40.7128, "lon": -74.0060},
    {"lat": 40.8000, "lon": -74.5000},
    {"lat": 41.0000, "lon": -75.0000},
]

if client.is_configured():
    # Use historical date for real data
    route_heat = client.get_route_heat(
        route_geometry,
        start_date='2024-07-15',
        start_time='14:00'
    )
    for point in route_heat:
        if "error" not in point:
            print(f"({point['lat']}, {point['lon']}): {point['temperature']}°C - {point['risk_level']}")
        else:
            print(f"({point['lat']}, {point['lon']}): Error - {point['error']}")
else:
    print("Skipping - API key not configured")


# ==================== EXAMPLE 3: OpenRouter Provider ====================

print("\n" + "=" * 60)
print("Example 3: OpenRouter Provider Configuration")
print("=" * 60)

from ai import OpenRouterProvider
from ai.providers.base import LLMConfig

# Check for API key
if os.getenv("OPENROUTER_API_KEY"):
    provider = OpenRouterProvider()
    print(f"Provider: {provider}")
    print(f"Model: {provider.config.model}")
    print(f"Temperature: {provider.config.temperature}")
    print(f"Max Tokens: {provider.config.max_tokens}")
    print(f"Timeout: {provider.config.timeout_seconds}s")
else:
    print("OPENROUTER_API_KEY not configured")


# ==================== EXAMPLE 4: Config from Environment ====================

print("\n" + "=" * 60)
print("Example 4: Configuration from Environment Variables")
print("=" * 60)

from config import Config, RiskWeights, OptimizationWeights

# Create config from environment variables
config = Config.from_env()

print("Risk Weights:")
print(f"  Temperature: {config.risk_weights.temperature}%")
print(f"  Heat Index: {config.risk_weights.heat_index}%")
print(f"  Humidity: {config.risk_weights.humidity}%")
print(f"  AQI: {config.risk_weights.aqi}%")

print("\nOptimization Weights:")
print(f"  Distance: {config.optimization_weights.distance}%")
print(f"  Duration: {config.optimization_weights.duration}%")
print(f"  Heat Risk: {config.optimization_weights.heat_risk}%")
print(f"  Environmental: {config.optimization_weights.environmental}%")

print("\nThresholds:")
print(f"  Extreme: {config.thresholds.EXTREME}")
print(f"  Very High: {config.thresholds.VERY_HIGH}")
print(f"  High: {config.thresholds.HIGH}")
print(f"  Moderate: {config.thresholds.MODERATE}")

print("\nNormalization Ranges:")
print(f"  Max Temperature: {config.normalization.temperature_max}°C")
print(f"  Max Heat Index: {config.normalization.heat_index_max}°C")
print(f"  Max AQI: {config.normalization.aqi_max}")
print(f"  Max Distance: {config.normalization.distance_max}km")
print(f"  Max Duration: {config.normalization.duration_max}min")


# ==================== EXAMPLE 5: Using Heat or Mock ====================

print("\n" + "=" * 60)
print("Example 5: Get Heat or Mock (Automatic Fallback)")
print("=" * 60)

# This will use real data if configured, otherwise mock
# Use historical date for real data
heat_data = client.get_heat_or_mock(
    lat=40.7128,
    lon=-74.0060,
    base_temp=30.0,
    start_date='2024-07-15',
    start_time='14:00'
)

source = "API" if client.is_configured() else "Mock"
print(f"Data source: {source}")
print(f"Temperature: {heat_data.temperature}°C")
print(f"Risk Level: {heat_data.risk_level}")


print("\n" + "=" * 60)
print("Examples complete")
print("=" * 60)