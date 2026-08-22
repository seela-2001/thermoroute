"""
Custom Exceptions
Structured error handling with context.
"""
from typing import Any, Optional


class HeatOpsException(Exception):
    """Base exception for HeatOps."""

    def __init__(
        self,
        message: str,
        code: str,
        context: Optional[dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.context = context or {}
        super().__init__(f"[{code}] {message}")

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": self.message,
            "code": self.code,
            "context": self.context
        }


class ValidationError(HeatOpsException):
    """Input validation failed."""

    def __init__(self, message: str, field: Optional[str] = None, context: Optional[dict] = None):
        ctx = context or {}
        if field:
            ctx["field"] = field
        super().__init__(message, "VALIDATION_ERROR", ctx)


class RouteNotFoundError(HeatOpsException):
    """No routes found for the request."""

    def __init__(self, origin: str, destination: str):
        super().__init__(
            f"No routes found from {origin} to {destination}",
            "ROUTES_NOT_FOUND",
            {"origin": origin, "destination": destination}
        )


class APIError(HeatOpsException):
    """External API call failed."""

    def __init__(self, message: str, api: str, status_code: Optional[int] = None):
        ctx = {"api": api}
        if status_code:
            ctx["status_code"] = status_code
        super().__init__(message, "API_ERROR", ctx)


class LLMError(HeatOpsException):
    """LLM provider error."""

    def __init__(self, message: str, provider: str = "openai", status_code: Optional[int] = None):
        ctx = {"provider": provider}
        if status_code:
            ctx["status_code"] = status_code
        super().__init__(message, "LLM_ERROR", ctx)