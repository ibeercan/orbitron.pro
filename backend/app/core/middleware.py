from fastapi import Request


class SubscriptionMiddleware:
    """Placeholder for subscription rate-limiting middleware.

    Subscription-level access control is handled in service layer
    (e.g., AIService._check_and_log_request). This middleware can
    be activated when endpoint-level enforcement is needed.
    """

    async def __call__(self, request: Request, call_next):
        response = await call_next(request)
        return response