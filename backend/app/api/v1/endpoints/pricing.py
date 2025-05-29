"""
API endpoints for dynamic pricing functionality in RentChain
"""

from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.core.database import get_db
from app.utils.dependencies import get_current_user, get_current_admin_user
from app.services.pricing_service import PricingService
from app.schemas.common import Response
from app.models.user import User
from pydantic import BaseModel, Field

router = APIRouter()


# Pydantic модели для запросов/ответов
class PricingRecommendationResponse(BaseModel):
    """Ответ с рекомендацией по ценообразованию."""
    
    item_id: uuid.UUID
    current_price: float
    recommended_price: float
    price_change_percentage: float
    confidence_score: float
    reasoning: List[str]
    expected_demand_change: float
    market_position: str
    seasonal_adjustment: float
    competition_adjustment: float
    demand_adjustment: float
    estimated_bookings_increase: float
    estimated_revenue_change: float
    risk_assessment: str
    
    class Config:
        from_attributes = True


class AutoPricingSettings(BaseModel):
    """Настройки автоматического ценообразования."""
    
    max_change_percentage: float = Field(15.0, ge=1.0, le=50.0, description="Максимальное изменение цены в %")
    min_confidence_score: float = Field(0.8, ge=0.1, le=1.0, description="Минимальный уровень доверия")
    exclude_high_risk: bool = Field(True, description="Исключать изменения с высоким риском")
    notification_enabled: bool = Field(True, description="Включить уведомления")
    update_frequency_hours: int = Field(24, ge=1, le=168, description="Частота обновления в часах")


class PricingAnalyticsResponse(BaseModel):
    """Ответ с аналитикой по ценообразованию."""
    
    period_days: int
    total_items: int
    recommendations_count: int
    optimization_potential: Dict[str, float]
    risk_distribution: Dict[str, int]
    category_analysis: Dict[str, Any]
    top_recommendations: List[PricingRecommendationResponse]


def get_pricing_service(db: Session = Depends(get_db)) -> PricingService:
    """Get pricing service dependency."""
    return PricingService(db)


@router.get("/recommendation/{item_id}", response_model=Response[PricingRecommendationResponse])
async def get_item_pricing_recommendation(
    item_id: uuid.UUID,
    target_date: Optional[datetime] = Query(None, description="Целевая дата для анализа"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить рекомендацию по ценообразованию для товара.
    """
    try:
        recommendation = pricing_service.get_pricing_recommendation(
            item_id, current_user.id, target_date
        )
        
        return Response(
            data=PricingRecommendationResponse(**recommendation.__dict__),
            message="Pricing recommendation generated successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/recommendations/bulk", response_model=Response[List[PricingRecommendationResponse]])
async def get_bulk_pricing_recommendations(
    category_id: Optional[uuid.UUID] = Query(None, description="Фильтр по категории"),
    limit: Optional[int] = Query(50, ge=1, le=100, description="Максимальное количество"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить рекомендации по ценообразованию для всех товаров пользователя.
    """
    try:
        recommendations = pricing_service.get_bulk_recommendations(
            current_user.id, category_id, limit
        )
        
        recommendation_responses = [
            PricingRecommendationResponse(**rec.__dict__) 
            for rec in recommendations
        ]
        
        return Response(
            data=recommendation_responses,
            message=f"Generated {len(recommendation_responses)} pricing recommendations"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/apply/{item_id}", response_model=Response[Dict[str, Any]])
async def apply_pricing_recommendation(
    item_id: uuid.UUID,
    apply_automatic: bool = Body(False, description="Применить автоматически"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Применить рекомендацию по ценообразованию к товару.
    """
    try:
        result = pricing_service.apply_pricing_recommendation(
            item_id, current_user.id, apply_automatic
        )
        
        return Response(
            data=result,
            message="Pricing recommendation processed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/category/{category_id}/insights", response_model=Response[Dict[str, Any]])
async def get_category_pricing_insights(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить инсайты по ценообразованию для категории.
    """
    try:
        insights = pricing_service.get_category_insights(category_id, current_user.id)
        
        return Response(
            data=insights,
            message="Category pricing insights retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/analytics", response_model=Response[PricingAnalyticsResponse])
async def get_pricing_analytics(
    period_days: int = Query(30, ge=1, le=365, description="Период анализа в днях"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить аналитику по ценообразованию для пользователя.
    """
    try:
        analytics = pricing_service.get_pricing_analytics(current_user.id, period_days)
        
        # Преобразуем top_recommendations
        top_recommendations = []
        for rec in analytics.get('top_recommendations', []):
            if hasattr(rec, '__dict__'):
                top_recommendations.append(PricingRecommendationResponse(**rec.__dict__))
        
        analytics['top_recommendations'] = top_recommendations
        
        return Response(
            data=PricingAnalyticsResponse(**analytics),
            message="Pricing analytics retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/auto-pricing/enable", response_model=Response[Dict[str, Any]])
async def enable_auto_pricing(
    item_id: Optional[uuid.UUID] = Body(None, description="ID конкретного товара (опционально)"),
    settings: AutoPricingSettings = Body(..., description="Настройки автоматического ценообразования"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Включить автоматическое ценообразование.
    """
    try:
        result = pricing_service.enable_auto_pricing(
            current_user.id, item_id, settings.dict()
        )
        
        return Response(
            data=result,
            message="Automatic pricing enabled successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/auto-pricing/disable", response_model=Response[Dict[str, Any]])
async def disable_auto_pricing(
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Отключить автоматическое ценообразование.
    """
    try:
        result = pricing_service.disable_auto_pricing(current_user.id)
        
        return Response(
            data=result,
            message="Automatic pricing disabled successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/history/{item_id}", response_model=Response[List[Dict[str, Any]]])
async def get_pricing_history(
    item_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200, description="Максимальное количество записей"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить историю изменения цен для товара.
    """
    try:
        history = pricing_service.get_pricing_history(item_id, current_user.id, limit)
        
        return Response(
            data=history,
            message="Pricing history retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Админские эндпоинты
@router.post("/admin/schedule-updates", response_model=Response[Dict[str, Any]])
async def schedule_pricing_updates(
    current_user: User = Depends(get_current_admin_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Запланировать автоматические обновления цен (только для админов).
    """
    try:
        result = pricing_service.schedule_automatic_pricing_updates()
        
        return Response(
            data=result,
            message="Pricing updates scheduled successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/admin/category/{category_id}/insights", response_model=Response[Dict[str, Any]])
async def get_admin_category_insights(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_admin_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить полные инсайты по категории (только для админов).
    """
    try:
        insights = pricing_service.get_category_insights(category_id)
        
        return Response(
            data=insights,
            message="Admin category insights retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/admin/user/{user_id}/analytics", response_model=Response[PricingAnalyticsResponse])
async def get_user_pricing_analytics_admin(
    user_id: uuid.UUID,
    period_days: int = Query(30, ge=1, le=365, description="Период анализа в днях"),
    current_user: User = Depends(get_current_admin_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить аналитику по ценообразованию для конкретного пользователя (только для админов).
    """
    try:
        analytics = pricing_service.get_pricing_analytics(user_id, period_days)
        
        # Преобразуем top_recommendations
        top_recommendations = []
        for rec in analytics.get('top_recommendations', []):
            if hasattr(rec, '__dict__'):
                top_recommendations.append(PricingRecommendationResponse(**rec.__dict__))
        
        analytics['top_recommendations'] = top_recommendations
        
        return Response(
            data=PricingAnalyticsResponse(**analytics),
            message="User pricing analytics retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Дополнительные утилитарные эндпоинты
@router.get("/market-position/{item_id}", response_model=Response[Dict[str, Any]])
async def get_item_market_position(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить рыночную позицию товара.
    """
    try:
        recommendation = pricing_service.get_pricing_recommendation(item_id, current_user.id)
        
        market_data = {
            "item_id": item_id,
            "current_price": recommendation.current_price,
            "market_position": recommendation.market_position,
            "competition_analysis": {
                "seasonal_factor": recommendation.seasonal_adjustment,
                "competition_factor": recommendation.competition_adjustment,
                "demand_factor": recommendation.demand_adjustment
            },
            "positioning_advice": recommendation.reasoning[:3]  # Топ-3 рекомендации
        }
        
        return Response(
            data=market_data,
            message="Market position analysis completed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/competitive-analysis/{category_id}", response_model=Response[Dict[str, Any]])
async def get_competitive_analysis(
    category_id: uuid.UUID,
    price_range_min: Optional[float] = Query(None, description="Минимальная цена для анализа"),
    price_range_max: Optional[float] = Query(None, description="Максимальная цена для анализа"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить конкурентный анализ для категории.
    """
    try:
        insights = pricing_service.get_category_insights(category_id, current_user.id)
        
        # Фильтруем по ценовому диапазону если указан
        competitive_data = {
            "category_id": category_id,
            "market_overview": insights['basic_stats'],
            "demand_analysis": insights['demand_stats'],
            "top_performers": insights['top_performers'],
            "pricing_recommendations": insights['pricing_insights']
        }
        
        # Добавляем персональную позицию если есть данные
        if 'personal_stats' in insights:
            competitive_data['your_position'] = insights['personal_stats']
        
        return Response(
            data=competitive_data,
            message="Competitive analysis completed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/optimization-suggestions", response_model=Response[List[Dict[str, Any]]])
async def get_optimization_suggestions(
    limit: int = Query(10, ge=1, le=50, description="Максимальное количество предложений"),
    min_impact: float = Query(5.0, ge=0.0, le=100.0, description="Минимальное влияние на выручку в %"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить предложения по оптимизации цен.
    """
    try:
        recommendations = pricing_service.get_bulk_recommendations(current_user.id, limit=limit)
        
        # Фильтруем по минимальному воздействию
        optimization_suggestions = []
        
        for rec in recommendations:
            if abs(rec.estimated_revenue_change) >= min_impact:
                suggestion = {
                    "item_id": rec.item_id,
                    "priority": "high" if abs(rec.estimated_revenue_change) >= 20 else 
                              "medium" if abs(rec.estimated_revenue_change) >= 10 else "low",
                    "current_price": rec.current_price,
                    "recommended_price": rec.recommended_price,
                    "price_change_percentage": rec.price_change_percentage,
                    "revenue_impact": rec.estimated_revenue_change,
                    "confidence_level": rec.confidence_score,
                    "risk_level": rec.risk_assessment,
                    "key_reasons": rec.reasoning[:2],  # Топ-2 причины
                    "market_position": rec.market_position,
                    "action_recommended": "increase" if rec.price_change_percentage > 0 else "decrease"
                }
                optimization_suggestions.append(suggestion)
        
        # Сортируем по потенциальному влиянию
        optimization_suggestions.sort(key=lambda x: abs(x["revenue_impact"]), reverse=True)
        
        return Response(
            data=optimization_suggestions[:limit],
            message=f"Found {len(optimization_suggestions)} optimization opportunities"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/bulk-apply", response_model=Response[Dict[str, Any]])
async def bulk_apply_recommendations(
    item_ids: List[uuid.UUID] = Body(..., description="Список ID товаров"),
    apply_automatic: bool = Body(False, description="Применить автоматически"),
    max_risk_level: str = Body("medium", description="Максимальный уровень риска: low/medium/high"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Массовое применение рекомендаций по ценообразованию.
    """
    try:
        results = {
            "applied": [],
            "rejected": [],
            "errors": []
        }
        
        risk_levels = {"low": 1, "medium": 2, "high": 3}
        max_risk_score = risk_levels.get(max_risk_level, 2)
        
        for item_id in item_ids:
            try:
                # Получаем рекомендацию
                recommendation = pricing_service.get_pricing_recommendation(item_id, current_user.id)
                
                # Проверяем уровень риска
                item_risk_score = risk_levels.get(recommendation.risk_assessment, 3)
                
                if item_risk_score > max_risk_score:
                    results["rejected"].append({
                        "item_id": item_id,
                        "reason": f"Risk level too high: {recommendation.risk_assessment}"
                    })
                    continue
                
                # Применяем рекомендацию
                result = pricing_service.apply_pricing_recommendation(
                    item_id, current_user.id, apply_automatic
                )
                
                if result["status"] == "applied":
                    results["applied"].append({
                        "item_id": item_id,
                        "old_price": result["old_price"],
                        "new_price": result["new_price"],
                        "change_percentage": result["change_percentage"]
                    })
                else:
                    results["rejected"].append({
                        "item_id": item_id,
                        "reason": result.get("reason", "Application conditions not met")
                    })
                    
            except Exception as e:
                results["errors"].append({
                    "item_id": item_id,
                    "error": str(e)
                })
        
        return Response(
            data={
                "summary": {
                    "total_processed": len(item_ids),
                    "applied_count": len(results["applied"]),
                    "rejected_count": len(results["rejected"]),
                    "error_count": len(results["errors"])
                },
                "details": results
            },
            message=f"Bulk pricing update completed. Applied to {len(results['applied'])} items."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/trends/seasonal", response_model=Response[Dict[str, Any]])
async def get_seasonal_pricing_trends(
    category_id: Optional[uuid.UUID] = Query(None, description="Фильтр по категории"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить сезонные тренды ценообразования.
    """
    try:
        # Базовые сезонные факторы
        seasonal_data = {
            "current_season": pricing_service.pricing_model._get_season(datetime.utcnow()),
            "seasonal_factors": {
                "spring": 1.0,
                "summer": 1.2,
                "autumn": 0.9,
                "winter": 0.8
            },
            "recommendations": {
                "spring": "Стабильные цены, фокус на качестве",
                "summer": "Пиковый сезон - возможность повышения цен",
                "autumn": "Умеренное снижение для поддержания спроса",
                "winter": "Конкурентные цены для привлечения клиентов"
            }
        }
        
        # Если указана категория, добавляем специфичные данные
        if category_id:
            category_insights = pricing_service.get_category_insights(category_id, current_user.id)
            seasonal_data["category_specific"] = {
                "category_id": category_id,
                "current_trends": category_insights.get('pricing_insights', {})
            }
        
        return Response(
            data=seasonal_data,
            message="Seasonal pricing trends retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/performance/summary", response_model=Response[Dict[str, Any]])
async def get_pricing_performance_summary(
    period_days: int = Query(30, ge=7, le=365, description="Период анализа в днях"),
    current_user: User = Depends(get_current_user),
    pricing_service: PricingService = Depends(get_pricing_service)
) -> Any:
    """
    Получить сводку по эффективности ценообразования.
    """
    try:
        analytics = pricing_service.get_pricing_analytics(current_user.id, period_days)
        
        # Формируем сводку
        performance_summary = {
            "period": f"{period_days} days",
            "total_items": analytics["total_items"],
            "optimization_score": min(100, max(0, 
                (analytics["optimization_potential"]["avg_revenue_increase"] + 50) * 2
            )),  # Условный скор от 0 до 100
            "revenue_opportunity": {
                "total_potential": analytics["optimization_potential"]["total_revenue_increase"],
                "average_per_item": analytics["optimization_potential"]["avg_revenue_increase"]
            },
            "risk_profile": analytics["risk_distribution"],
            "action_required": {
                "high_impact_items": len([
                    r for r in analytics.get("top_recommendations", [])
                    if hasattr(r, 'estimated_revenue_change') and r.estimated_revenue_change > 15
                ]),
                "low_risk_optimizations": analytics["risk_distribution"].get("low", 0)
            },
            "market_position": self._analyze_overall_market_position(analytics),
            "next_steps": self._generate_next_steps(analytics)
        }
        
        return Response(
            data=performance_summary,
            message="Pricing performance summary generated successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


def _analyze_overall_market_position(analytics: Dict[str, Any]) -> Dict[str, Any]:
    """Анализ общей рыночной позиции пользователя."""
    
    # Анализируем позиции по категориям
    category_positions = {}
    premium_count = 0
    competitive_count = 0
    budget_count = 0
    
    for cat_id, cat_data in analytics.get("category_analysis", {}).items():
        # Здесь была бы логика определения позиции по категории
        # Пока используем заглушку
        position = "competitive"  # Упрощенно
        category_positions[cat_id] = position
        
        if position == "premium":
            premium_count += 1
        elif position == "competitive":
            competitive_count += 1
        else:
            budget_count += 1
    
    dominant_position = "competitive"
    if premium_count > competitive_count and premium_count > budget_count:
        dominant_position = "premium"
    elif budget_count > competitive_count and budget_count > premium_count:
        dominant_position = "budget"
    
    return {
        "dominant_position": dominant_position,
        "category_distribution": {
            "premium": premium_count,
            "competitive": competitive_count,
            "budget": budget_count
        },
        "positioning_advice": _get_positioning_advice(dominant_position)
    }


def _get_positioning_advice(position: str) -> List[str]:
    """Получить советы по позиционированию."""
    
    advice_map = {
        "premium": [
            "Поддерживайте высокое качество сервиса",
            "Подчеркивайте уникальные преимущества",
            "Инвестируйте в улучшение товаров"
        ],
        "competitive": [
            "Следите за действиями конкурентов",
            "Ищите возможности для дифференциации",
            "Оптимизируйте соотношение цена-качество"
        ],
        "budget": [
            "Фокусируйтесь на эффективности",
            "Ищите способы снижения затрат",
            "Рассмотрите возможность повышения ценности"
        ]
    }
    
    return advice_map.get(position, ["Проанализируйте свою рыночную позицию"])


def _generate_next_steps(analytics: Dict[str, Any]) -> List[str]:
    """Генерация следующих шагов для пользователя."""
    
    steps = []
    
    # На основе потенциала оптимизации
    if analytics["optimization_potential"]["total_revenue_increase"] > 10:
        steps.append("Рассмотрите применение ценовых рекомендаций для увеличения выручки")
    
    # На основе распределения рисков
    low_risk_count = analytics["risk_distribution"].get("low", 0)
    if low_risk_count > 0:
        steps.append(f"Примените {low_risk_count} низкорисковых оптимизаций")
    
    # На основе количества рекомендаций
    if analytics["recommendations_count"] > 5:
        steps.append("Включите автоматическое ценообразование для регулярной оптимизации")
    
    # Общие рекомендации
    if not steps:
        steps.append("Продолжайте мониторинг рыночных трендов")
    
    return steps