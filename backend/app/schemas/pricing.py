from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
import uuid


class PricingRecommendationBase(BaseModel):
    """Базовая схема рекомендации по ценообразованию."""
    
    item_id: uuid.UUID
    current_price: float
    recommended_price: float
    price_change_percentage: float
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    
    @validator('recommended_price')
    def validate_recommended_price(cls, v):
        if v <= 0:
            raise ValueError('Recommended price must be greater than 0')
        return v


class PricingRecommendationCreate(PricingRecommendationBase):
    """Схема создания рекомендации."""
    target_date: Optional[datetime] = None


class PricingRecommendation(PricingRecommendationBase):
    """Полная схема рекомендации."""
    
    reasoning: List[str]
    expected_demand_change: float
    market_position: str
    seasonal_adjustment: float
    competition_adjustment: float
    demand_adjustment: float
    estimated_bookings_increase: float
    estimated_revenue_change: float
    risk_assessment: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class AutoPricingSettingsBase(BaseModel):
    """Базовые настройки автоматического ценообразования."""
    
    max_change_percentage: float = Field(15.0, ge=1.0, le=50.0)
    min_confidence_score: float = Field(0.8, ge=0.1, le=1.0)
    exclude_high_risk: bool = True
    notification_enabled: bool = True
    update_frequency_hours: int = Field(24, ge=1, le=168)


class AutoPricingSettingsCreate(AutoPricingSettingsBase):
    """Схема создания настроек."""
    item_id: Optional[uuid.UUID] = None


class AutoPricingSettings(AutoPricingSettingsBase):
    """Полная схема настроек."""
    
    id: uuid.UUID
    user_id: uuid.UUID
    item_id: Optional[uuid.UUID] = None
    enabled: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PricingAnalyticsBase(BaseModel):
    """Базовая схема аналитики ценообразования."""
    
    period_days: int
    total_items: int
    recommendations_count: int


class PricingAnalytics(PricingAnalyticsBase):
    """Полная схема аналитики."""
    
    optimization_potential: Dict[str, float]
    risk_distribution: Dict[str, int]
    category_analysis: Dict[str, Any]
    top_recommendations: List[PricingRecommendation]
    
    class Config:
        from_attributes = True


class CategoryPricingInsights(BaseModel):
    """Инсайты по ценообразованию для категории."""
    
    category_id: uuid.UUID
    period_days: int
    basic_stats: Dict[str, Any]
    demand_stats: Dict[str, Any]
    top_performers: List[Dict[str, Any]]
    pricing_insights: Dict[str, Any]
    personal_stats: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class PricingHistoryEntry(BaseModel):
    """Запись в истории изменения цен."""
    
    id: uuid.UUID
    item_id: uuid.UUID
    old_price: float
    new_price: float
    change_percentage: float
    reason: str
    confidence_score: Optional[float] = None
    applied_by: uuid.UUID
    applied_at: datetime
    
    class Config:
        from_attributes = True


class BulkPricingRequest(BaseModel):
    """Запрос массового применения ценовых рекомендаций."""
    
    item_ids: List[uuid.UUID] = Field(..., min_items=1, max_items=100)
    apply_automatic: bool = False
    max_risk_level: str = Field("medium", regex="^(low|medium|high)$")
    
    @validator('item_ids')
    def validate_unique_items(cls, v):
        if len(v) != len(set(v)):
            raise ValueError('Item IDs must be unique')
        return v


class BulkPricingResult(BaseModel):
    """Результат массового применения."""
    
    summary: Dict[str, int]
    applied: List[Dict[str, Any]]
    rejected: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]


class MarketPosition(BaseModel):
    """Рыночная позиция товара."""
    
    item_id: uuid.UUID
    current_price: float
    market_position: str
    competition_analysis: Dict[str, float]
    positioning_advice: List[str]


class SeasonalTrends(BaseModel):
    """Сезонные тренды ценообразования."""
    
    current_season: str
    seasonal_factors: Dict[str, float]
    recommendations: Dict[str, str]
    category_specific: Optional[Dict[str, Any]] = None


class OptimizationSuggestion(BaseModel):
    """Предложение по оптимизации цены."""
    
    item_id: uuid.UUID
    priority: str
    current_price: float
    recommended_price: float
    price_change_percentage: float
    revenue_impact: float
    confidence_level: float
    risk_level: str
    key_reasons: List[str]
    market_position: str
    action_recommended: str


class PricingPerformanceSummary(BaseModel):
    """Сводка по эффективности ценообразования."""
    
    period: str
    total_items: int
    optimization_score: float = Field(..., ge=0, le=100)
    revenue_opportunity: Dict[str, float]
    risk_profile: Dict[str, int]
    action_required: Dict[str, int]
    market_position: Dict[str, Any]
    next_steps: List[str]
