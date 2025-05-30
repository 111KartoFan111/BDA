from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, Numeric, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base
import uuid


class PricingHistory(Base):
    """История изменения цен."""
    
    __tablename__ = "pricing_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Цены
    old_price = Column(Numeric(20, 8), nullable=False)
    new_price = Column(Numeric(20, 8), nullable=False)
    change_percentage = Column(Numeric(5, 2), nullable=False)
    
    # Причина изменения
    change_reason = Column(String(100), nullable=False)  # manual, automatic, recommendation
    recommendation_id = Column(UUID(as_uuid=True))  # Ссылка на рекомендацию
    confidence_score = Column(Numeric(3, 2))
    
    # Дополнительные данные
    market_factors = Column(JSON, default=dict)
    price_metadata = Column(JSON, default=dict)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    item = relationship("Item")
    user = relationship("User")
    
    def __repr__(self):
        return f"<PricingHistory(item_id={self.item_id}, old={self.old_price}, new={self.new_price})>"


class AutoPricingConfiguration(Base):
    """Конфигурация автоматического ценообразования."""
    
    __tablename__ = "auto_pricing_config"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=True)  # Null = для всех товаров
    
    # Настройки
    enabled = Column(Boolean, default=True)
    max_change_percentage = Column(Numeric(5, 2), default=15.0)
    min_confidence_score = Column(Numeric(3, 2), default=0.8)
    exclude_high_risk = Column(Boolean, default=True)
    notification_enabled = Column(Boolean, default=True)
    update_frequency_hours = Column(Integer, default=24)
    
    # Ограничения
    min_price = Column(Numeric(20, 8))
    max_price = Column(Numeric(20, 8))
    excluded_seasons = Column(JSON, default=list)  # Исключенные сезоны
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_applied_at = Column(DateTime(timezone=True))
    
    # Связи
    user = relationship("User")
    item = relationship("Item")
    
    def __repr__(self):
        return f"<AutoPricingConfig(user_id={self.user_id}, enabled={self.enabled})>"


class PricingModelMetrics(Base):
    """Метрики производительности моделей ценообразования."""
    
    __tablename__ = "pricing_model_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Информация о модели
    model_type = Column(String(50), nullable=False)  # demand_prediction, price_optimization
    model_version = Column(String(20), nullable=False)
    
    # Метрики качества
    accuracy_score = Column(Numeric(5, 4))
    precision_score = Column(Numeric(5, 4))
    recall_score = Column(Numeric(5, 4))
    f1_score = Column(Numeric(5, 4))
    mse = Column(Numeric(10, 6))
    mae = Column(Numeric(10, 6))
    
    # Данные обучения
    training_samples_count = Column(Integer)
    training_duration_seconds = Column(Integer)
    feature_count = Column(Integer)
    
    # Дополнительные метрики
    business_metrics = Column(JSON, default=dict)  # ROI, revenue impact, etc.
    
    # Временные метки
    trained_at = Column(DateTime(timezone=True), server_default=func.now())
    validated_at = Column(DateTime(timezone=True))
    
    def __repr__(self):
        return f"<PricingModelMetrics(type={self.model_type}, accuracy={self.accuracy_score})>"

