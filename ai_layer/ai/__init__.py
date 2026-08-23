"""
AI Layer for HeatOps + CoolRoutes

Architecture: Deterministic Services → Risk Scoring → Recommendation Engine → AI Agent (Optional) → Consumer

Single AI Agent:
1. Travel Explanation Agent - Natural language explanations for UX (optional, templates as fallback)

Design Principles:
- Deterministic before AI
- AI only explains, never calculates or recommends
- Stateless agents (no memory)
- Structured JSON inputs/outputs only
- AI never calls external APIs
- Graceful degradation to templates on failure
- OpenRouter as the only LLM provider
"""

from .providers import LLMProvider, OpenRouterProvider
from .agents import TravelExplanationAgent
from .schemas import (
    AIContext,
    TravelExplanationOutput,
    AIResponseStatus
)

from .fortyguard_service import FortyGuardService

__all__ = [
    "LLMProvider",
    "OpenRouterProvider",
    "TravelExplanationAgent",
    "AIContext",
    "TravelExplanationOutput",
    "AIResponseStatus",
    "FortyGuardService",
]