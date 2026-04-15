from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.models.user import SubscriptionType


class SubscriptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip for auth endpoints
        if request.url.path.startswith("/api/v1/auth"):
            return await call_next(request)

        # Get user from request state (set by auth dependency)
        user = getattr(request.state, "user", None)
        if user and user.subscription_type == SubscriptionType.FREE:
            # Add limits for free users
            pass  # Already handled in services

        response = await call_next(request)
        return response