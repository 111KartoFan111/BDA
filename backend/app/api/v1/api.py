from fastapi import APIRouter

from app.api.v1.endpoints import auth, items, contracts, users, analytics, categories, admin

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])