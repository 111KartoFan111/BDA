"""
Analytics endpoints.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_current_admin_user
from app.services.analytics import AnalyticsService
from app.schemas.common import Response
from app.models.user import User

router = APIRouter()


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    """Get analytics service dependency."""
    from app.services.analytics import AnalyticsService
    return AnalyticsService(db)


@router.get("/dashboard", response_model=Response[dict])
async def get_dashboard_stats(
    period: str = Query("30d", description="Period: 7d, 30d, 90d, 1y"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get dashboard statistics (admin only).
    """
    stats = analytics_service.get_dashboard_stats(period)
    return Response(data=stats)


@router.get("/items/popular", response_model=Response[List[dict]])
async def get_popular_items(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    limit: int = Query(10, ge=1, le=50, description="Number of items"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Any:
    """
    Get popular items analytics.
    """
    items = analytics_service.get_popular_items(period, limit)
    return Response(data=items)


@router.get("/items/categories", response_model=Response[List[dict]])
async def get_categories_stats(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Any:
    """
    Get categories statistics.
    """
    stats = analytics_service.get_categories_stats(period)
    return Response(data=stats)


@router.get("/items/price-trends", response_model=Response[List[dict]])
async def get_price_trends(
    category_id: Optional[uuid.UUID] = Query(None, description="Category filter"),
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Any:
    """
    Get price trends analytics.
    """
    trends = analytics_service.get_price_trends(category_id, period)
    return Response(data=trends)


@router.get("/users/activity", response_model=Response[List[dict]])
async def get_user_activity(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get user activity statistics (admin only).
    """
    activity = analytics_service.get_user_activity(period)
    return Response(data=activity)


@router.get("/users/retention", response_model=Response[dict])
async def get_user_retention(
    period: str = Query("30d", description="Period: 30d, 90d"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get user retention analytics (admin only).
    """
    retention = analytics_service.get_user_retention(period)
    return Response(data=retention)


@router.get("/contracts/completion-rate", response_model=Response[dict])
async def get_contract_completion_rate(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get contract completion rate analytics (admin only).
    """
    rate = analytics_service.get_contract_completion_rate(period)
    return Response(data=rate)


@router.get("/revenue", response_model=Response[dict])
async def get_revenue_analytics(
    period: str = Query("30d", description="Period: 7d, 30d, 90d, 1y"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get revenue analytics (admin only).
    """
    revenue = analytics_service.get_revenue_analytics(period)
    return Response(data=revenue)


@router.get("/ml/predictions", response_model=Response[List[dict]])
async def get_ml_predictions(
    item_id: Optional[uuid.UUID] = Query(None, description="Specific item prediction"),
    category_id: Optional[uuid.UUID] = Query(None, description="Category predictions"),
    limit: int = Query(20, ge=1, le=100, description="Number of predictions"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get ML predictions for rental probability.
    """
    predictions = analytics_service.get_ml_predictions(item_id, category_id, limit)
    return Response(data=predictions)


@router.get("/ml/item-recommendations", response_model=Response[List[dict]])
async def get_item_recommendations(
    user_id: Optional[uuid.UUID] = Query(None, description="User for recommendations"),
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get ML-based item recommendations.
    """
    target_user_id = user_id if current_user.is_admin else current_user.id
    recommendations = analytics_service.get_item_recommendations(target_user_id, limit)
    return Response(data=recommendations)


@router.get("/geography", response_model=Response[List[dict]])
async def get_geography_analytics(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get geography-based analytics (admin only).
    """
    geo_stats = analytics_service.get_geography_analytics(period)
    return Response(data=geo_stats)


@router.get("/trends/search", response_model=Response[List[dict]])
async def get_search_trends(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    limit: int = Query(20, ge=1, le=100, description="Number of trends"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Get search trends analytics (admin only).
    """
    trends = analytics_service.get_search_trends(period, limit)
    return Response(data=trends)


@router.get("/my/stats", response_model=Response[dict])
async def get_my_analytics(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Any:
    """
    Get current user's analytics.
    """
    stats = analytics_service.get_user_analytics(current_user.id, period)
    return Response(data=stats)


@router.get("/my/items/performance", response_model=Response[List[dict]])
async def get_my_items_performance(
    period: str = Query("30d", description="Period: 7d, 30d, 90d"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Any:
    """
    Get current user's items performance analytics.
    """
    performance = analytics_service.get_user_items_performance(current_user.id, period)
    return Response(data=performance)


@router.post("/ml/retrain", response_model=Response[dict])
async def retrain_ml_models(
    model_type: str = Query("all", description="Model type: all, rental_prediction, recommendations"),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Retrain ML models (admin only).
    """
    result = analytics_service.retrain_ml_models(model_type)
    return Response(
        data=result,
        message="ML models retraining started"
    )