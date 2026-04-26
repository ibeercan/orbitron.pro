from fastapi import APIRouter

from app.api.v1.endpoints import auth, charts, subscriptions, invites, chat, persons, admin, electional, planner

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(charts.router, prefix="/charts", tags=["charts"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(invites.router, prefix="/invites", tags=["invites"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(persons.router, prefix="/persons", tags=["persons"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(electional.router, prefix="/electional", tags=["electional"])
api_router.include_router(planner.router, prefix="/planner", tags=["planner"])
