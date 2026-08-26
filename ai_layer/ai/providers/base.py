"""
LLM Provider Abstraction Layer

Never couple business logic to a specific LLM.
Backend depends only on the LLMProvider interface.
"""
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional
import time


@dataclass
class LLMResponse:
    """Standardized LLM response."""
    content: str
    model: str
    tokens_used: dict[str, int]
    latency_ms: float
    raw: dict[str, Any]


@dataclass
class LLMConfig:
    """Configuration for LLM provider."""
    model: str = "google/gemma-2-9b-it:free"
    temperature: float = 0.3
    max_tokens: int = 1000
    timeout_seconds: int = 30
    json_mode: bool = True
    max_retries: int = 3

    @classmethod
    def from_env(cls) -> 'LLMConfig':
        """Create from environment variables."""
        return cls(
            model=os.getenv("OPENROUTER_MODEL", "google/gemma-2-9b-it:free"),
            temperature=float(os.getenv("OPENROUTER_TEMPERATURE", "0.3")),
            max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "1000")),
            timeout_seconds=int(os.getenv("OPENROUTER_TIMEOUT", "30")),
            json_mode=os.getenv("OPENROUTER_JSON_MODE", "true").lower() == "true",
            max_retries=int(os.getenv("OPENROUTER_MAX_RETRIES", "3"))
        )


class LLMProvider(ABC):
    """
    Base interface for LLM providers.

    Implementations:
    - OpenRouterProvider
    """

    def __init__(self, api_key: str, config: Optional[LLMConfig] = None):
        self.api_key = api_key
        self.config = config or LLMConfig.from_env()

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a response from the LLM.

        Args:
            system_prompt: System instructions
            user_prompt: User input/context
            **kwargs: Additional parameters (may override config)

        Returns:
            LLMResponse with content, model info, tokens, latency

        Raises:
            LLMError: On provider failure
        """
        pass

    @abstractmethod
    def _calculate_tokens(self, text: str) -> int:
        """
        Estimate token count for observability.

        Args:
            text: Input text

        Returns:
            Estimated token count
        """
        pass

    def _measure_latency(self, start_time: float) -> float:
        """Calculate latency in milliseconds."""
        return (time.time() - start_time) * 1000