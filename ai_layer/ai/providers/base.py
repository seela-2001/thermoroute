import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional
import time


@dataclass
class LLMResponse:
    content: str
    model: str
    tokens_used: dict[str, int]
    latency_ms: float
    raw: dict[str, Any]


@dataclass
class LLMConfig:
    model: str = "openai/gpt-4o-mini"
    temperature: float = 0.3
    max_tokens: int = 1500
    timeout_seconds: int = 30
    json_mode: bool = True
    max_retries: int = 3

    @classmethod
    def from_env(cls) -> 'LLMConfig':
        return cls(
            model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
            temperature=float(os.getenv("OPENROUTER_TEMPERATURE", "0.3")),
            max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "1500")),
            timeout_seconds=int(os.getenv("OPENROUTER_TIMEOUT", "30")),
            json_mode=os.getenv("OPENROUTER_JSON_MODE", "true").lower() == "true",
            max_retries=int(os.getenv("OPENROUTER_MAX_RETRIES", "3"))
        )


class LLMProvider(ABC):

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
        pass

    @abstractmethod
    def _calculate_tokens(self, text: str) -> int:
        pass

    def _measure_latency(self, start_time: float) -> float:
        return (time.time() - start_time) * 1000
