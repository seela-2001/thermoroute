import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional
import time

from ..providers import LLMProvider
from ..schemas import AIContext, AIResponseStatus


@dataclass
class AgentMetrics:
    execution_time_ms: float
    prompt_version: str
    model_version: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_estimate_usd: float
    error: Optional[str] = None


logger = logging.getLogger(__name__)


class BaseAgent(ABC):

    def __init__(self, llm_provider: LLMProvider):
        self.llm_provider = llm_provider

    @abstractmethod
    def get_system_prompt(self) -> str:
        pass

    @abstractmethod
    def get_prompt_version(self) -> str:
        pass

    @abstractmethod
    def get_model(self) -> str:
        pass

    @abstractmethod
    def _build_user_prompt(self, context: AIContext) -> str:
        pass

    @abstractmethod
    def _parse_response(self, raw_response: str, context: AIContext) -> dict[str, Any]:
        pass

    @abstractmethod
    def _calculate_confidence(self, context: AIContext) -> float:
        pass

    async def execute(self, context: AIContext) -> dict[str, Any]:
        start_time = time.time()
        prompt_version = self.get_prompt_version()
        model = self.get_model()

        try:
            is_valid, error = context.validate()
            if not is_valid:
                logger.warning(f"Context validation failed: {error}")
                return self._error_response(
                    AIResponseStatus.INSUFFICIENT_DATA,
                    f"Insufficient data: {error}",
                    start_time,
                    prompt_version,
                    model
                )

            confidence = self._calculate_confidence(context)

            if confidence < 0.5:
                logger.warning(f"Low confidence: {confidence}")
                return self._error_response(
                    AIResponseStatus.INSUFFICIENT_DATA,
                    f"Insufficient data for recommendation (confidence: {confidence})",
                    start_time,
                    prompt_version,
                    model
                )

            system_prompt = self.get_system_prompt()
            user_prompt = self._build_user_prompt(context)

            response = await self.llm_provider.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model,
                json_mode=True,
                temperature=0.3
            )

            parsed = self._parse_response(response.content, context)

            parsed.update({
                "model_used": response.model,
                "latency_ms": response.latency_ms,
                "tokens_used": response.tokens_used,
            })

            self._log_execution(
                execution_time_ms=(time.time() - start_time) * 1000,
                prompt_version=prompt_version,
                model_version=response.model,
                tokens_used=response.tokens_used,
                error=None
            )

            return parsed

        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            return self._error_response(
                AIResponseStatus.INTERNAL_ERROR,
                str(e),
                start_time,
                prompt_version,
                model
            )

    def _error_response(
        self,
        status: AIResponseStatus,
        error_message: str,
        start_time: float,
        prompt_version: str,
        model: str
    ) -> dict[str, Any]:
        execution_time = (time.time() - start_time) * 1000

        self._log_execution(
            execution_time_ms=execution_time,
            prompt_version=prompt_version,
            model_version=model,
            tokens_used={},
            error=error_message
        )

        return {
            "status": status.value,
            "error": error_message,
            "model_used": model,
            "latency_ms": execution_time,
            "tokens_used": {},
        }

    def _log_execution(
        self,
        execution_time_ms: float,
        prompt_version: str,
        model_version: str,
        tokens_used: dict[str, int],
        error: Optional[str] = None
    ) -> None:
        logger.info(
            f"Agent execution: "
            f"time={execution_time_ms:.0f}ms, "
            f"prompt={prompt_version}, "
            f"model={model_version}, "
            f"tokens={tokens_used.get('total_tokens', 0)}, "
            f"error={'YES' if error else 'NO'}"
        )
