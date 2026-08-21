"""
OpenRouter LLM Provider Implementation

Uses OpenRouter's API.
Supports multiple models including free options.

Environment Variables:
    OPENROUTER_API_KEY: API key (required)
    OPENROUTER_MODEL: Model to use (default: google/gemma-2-9b-it:free)
    OPENROUTER_TEMPERATURE: Temperature 0-1 (default: 0.3)
    OPENROUTER_MAX_TOKENS: Max response tokens (default: 1000)
    OPENROUTER_TIMEOUT: Request timeout in seconds (default: 30)
    OPENROUTER_MAX_RETRIES: Number of retries (default: 3)

Get your API key at: https://openrouter.ai/keys
"""
import os
import pathlib
import requests
import time
from typing import Any, Optional
from dotenv import load_dotenv

from .base import LLMProvider, LLMResponse, LLMConfig
from exceptions import LLMError


class OpenRouterProvider(LLMProvider):
    """
    OpenRouter API provider.

    Free models available:
    - google/gemma-2-9b-it:free (fast, good reasoning)
    - meta-llama/llama-3-8b-instruct:free
    - google/gemma-7b-it:free
    """

    BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1/chat/completions")
    DEFAULT_MODEL = "google/gemma-2-9b-it:free"

    def __init__(
        self,
        api_key: Optional[str] = None,
        config: Optional[LLMConfig] = None,
        load_from_parent_env: bool = True
    ):
        """
        Initialize OpenRouter provider.

        Args:
            api_key: OpenRouter API key (defaults to OPENROUTER_API_KEY env var)
            config: LLM configuration (defaults to env vars)
            load_from_parent_env: Load .env from parent directory (for Jupyter usage)
        """
        # Load .env from parent directory if requested
        if load_from_parent_env:
            parent_env = pathlib.Path.cwd().parent / '.env'
            if parent_env.exists():
                load_dotenv(parent_env)
            else:
                load_dotenv()

        # Get API key
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY", "")

        # Get or create config
        self.config = config or LLMConfig.from_env()

        if not self.api_key:
            raise LLMError("OpenRouter API key is required (set OPENROUTER_API_KEY env var)", "openrouter")

    def __str__(self):
        """String representation for debugging."""
        key_display = f"{self.api_key[:6]}…" if self.api_key else "(missing)"
        return f"OpenRouterProvider(model={self.config.model}, api_key={key_display})"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a response from OpenRouter.

        Args:
            system_prompt: System instructions with role, constraints, output schema
            user_prompt: Structured JSON context as string
            **kwargs: Override config parameters

        Returns:
            LLMResponse with structured content

        Raises:
            LLMError: On API failure after retries
        """
        start_time = time.time()

        # Merge config with kwargs
        model = kwargs.get("model", self.config.model)
        temperature = kwargs.get("temperature", self.config.temperature)
        max_tokens = kwargs.get("max_tokens", self.config.max_tokens)
        timeout = kwargs.get("timeout", self.config.timeout_seconds)
        json_mode = kwargs.get("json_mode", self.config.json_mode)
        max_retries = kwargs.get("max_retries", self.config.max_retries)

        # Build request
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        request_json = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Enable JSON mode if configured
        if json_mode:
            request_json["response_format"] = {"type": "json_object"}

        # Try with retry logic
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.BASE_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://github.com/heatops"),
                        "X-Title": os.getenv("OPENROUTER_APP_NAME", "HeatOps AI Layer"),
                    },
                    json=request_json,
                    timeout=timeout
                )
                response.raise_for_status()

                data = response.json()
                choice = data["choices"][0]
                content = choice["message"]["content"]

                # Extract token usage (OpenRouter format)
                usage = data.get("usage", {})
                tokens_used = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                # Add reasoning tokens if available
                if "completion_tokens_details" in usage:
                    tokens_used["reasoning_tokens"] = usage["completion_tokens_details"].get("reasoning_tokens", 0)

                return LLMResponse(
                    content=content,
                    model=model,
                    tokens_used=tokens_used,
                    latency_ms=self._measure_latency(start_time),
                    raw=data
                )

            except requests.HTTPError as e:
                status = e.response.status_code

                # Model not found
                if status == 404:
                    error_msg = f"Model {model} not found."
                    raise LLMError(error_msg, "openrouter", status)

                # Rate limit error - retry with backoff
                if status == 429:
                    retry_after = os.getenv("OPENROUTER_RETRY_AFTER", "30")
                    try:
                        retry_after = int(retry_after)
                        error_data = e.response.json()
                        if "error" in error_data and "metadata" in error_data["error"]:
                            retry_after = error_data["error"]["metadata"].get("retry_after_seconds", retry_after)
                    except:
                        pass

                    if attempt < max_retries - 1:
                        wait_time = retry_after * (attempt + 1)  # Exponential backoff
                        time.sleep(wait_time)
                        continue

                    error_msg = f"Rate limit exceeded. Try again later or use a different model."
                    raise LLMError(error_msg, "openrouter", status)
                else:
                    error_msg = f"OpenRouter API error: {e.response.text}"
                    raise LLMError(error_msg, "openrouter", status)

            except requests.Timeout:
                raise LLMError(
                    f"OpenRouter API request timed out after {timeout} seconds",
                    "openrouter"
                )
            except Exception as e:
                raise LLMError(f"OpenRouter API error: {str(e)}", "openrouter")

    def _calculate_tokens(self, text: str) -> int:
        """Estimate token count."""
        return len(text) // 4