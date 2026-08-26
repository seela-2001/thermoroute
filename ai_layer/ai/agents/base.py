"""
Base Agent Class

Common functionality for all AI agents.
Section 3: Stateless Agents - No conversation history required.
Section 12: Observability - Logging execution metrics.
"""
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
    """Observability metrics for agent execution."""
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
    """
    Base class for all AI agents.

    Features:
    - Stateless execution (no memory between calls)
    - Structured JSON inputs/outputs only
    - Observability logging
    - Error handling with statuses
    - Confidence tracking
    """

    def __init__(self, llm_provider: LLMProvider):
        """
        Initialize agent with LLM provider.

        Args:
            llm_provider: Instance of LLMProvider (OpenAI, Anthropic, etc.)
        """
        self.llm_provider = llm_provider

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent."""
        pass

    @abstractmethod
    def get_prompt_version(self) -> str:
        """Get the version of the system prompt (for observability)."""
        pass

    @abstractmethod
    def get_model(self) -> str:
        """Get the model to use for this agent."""
        pass

    @abstractmethod
    def _build_user_prompt(self, context: AIContext) -> str:
        """Build user prompt from context."""
        pass

    @abstractmethod
    def _parse_response(self, raw_response: str, context: AIContext) -> dict[str, Any]:
        """Parse LLM response into structured output."""
        pass

    @abstractmethod
    def _calculate_confidence(self, context: AIContext) -> float:
        """Calculate confidence score based on input completeness."""
        pass

    async def execute(self, context: AIContext) -> dict[str, Any]:
        """
        Execute the agent with given context.

        Args:
            context: Validated AIContext with all required data

        Returns:
            Structured output with status and data
        """
        start_time = time.time()
        prompt_version = self.get_prompt_version()
        model = self.get_model()

        try:
            # Validate context
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

            # Calculate confidence based on data
            confidence = self._calculate_confidence(context)

            # Check minimum confidence threshold
            if confidence < 0.5:
                logger.warning(f"Low confidence: {confidence}")
                return self._error_response(
                    AIResponseStatus.INSUFFICIENT_DATA,
                    f"Insufficient data for recommendation (confidence: {confidence})",
                    start_time,
                    prompt_version,
                    model
                )

            # Build prompts
            system_prompt = self.get_system_prompt()
            user_prompt = self._build_user_prompt(context)

            # Call LLM
            response = await self.llm_provider.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model,
                json_mode=True,
                temperature=0.3
            )

            # Parse response
            parsed = self._parse_response(response.content, context)

            # Add observability data
            parsed.update({
                "model_used": response.model,
                "latency_ms": response.latency_ms,
                "tokens_used": response.tokens_used,
            })

            # Log execution
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
        """Generate error response."""
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
        """
        Section 12: Observability

        Log:
        - Execution time
        - Prompt version
        - Model version
        - Token count
        - Errors

        Never log API keys or personal data.
        """
        logger.info(
            f"Agent execution: "
            f"time={execution_time_ms:.0f}ms, "
            f"prompt={prompt_version}, "
            f"model={model_version}, "
            f"tokens={tokens_used.get('total_tokens', 0)}, "
            f"error={'YES' if error else 'NO'}"
        )