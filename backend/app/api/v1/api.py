from fastapi import APIRouter

from app.api.v1.endpoints import auth, charts, ai, subscriptions, invites

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(charts.router, prefix="/charts", tags=["charts"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(invites.router, prefix="/invites", tags=["invites"])