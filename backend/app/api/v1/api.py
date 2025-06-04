from fastapi import APIRouter
from app.api.v1.endpoints import auth, items, contracts, users, analytics, categories, admin, pricing, blockchain, wallet

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(contracts.router, prefix="/contracts", tags=["contracts"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
api_router.include_router(blockchain.router, prefix="/blockchain", tags=["blockchain"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])