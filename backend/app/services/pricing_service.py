"""
Сервис динамического ценообразования для RentChain.
Использует ML модели для оптимизации цен на основе рыночных данных.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from datetime import datetime, timedelta
import uuid
import numpy as np
import logging
from decimal import Decimal

from app.models.item import Item, Category, ItemStatus
from app.models.contract import Contract, ContractStatus
from app.models.user import User
from app.models.pricing import PricingHistory, AutoPricingConfiguration, PricingModelMetrics
from app.utils.exceptions import NotFoundError, BadRequestError
from app.core.database import get_db

logger = logging.getLogger(__name__)


class PricingRecommendation:
    """Класс для рекомендации по ценообразованию."""
    
    def __init__(self, **kwargs):
        self.item_id = kwargs.get('item_id')
        self.current_price = kwargs.get('current_price', 0.0)
        self.recommended_price = kwargs.get('recommended_price', 0.0)
        self.price_change_percentage = kwargs.get('price_change_percentage', 0.0)
        self.confidence_score = kwargs.get('confidence_score', 0.0)
        self.reasoning = kwargs.get('reasoning', [])
        self.expected_demand_change = kwargs.get('expected_demand_change', 0.0)
        self.market_position = kwargs.get('market_position', 'competitive')
        self.seasonal_adjustment = kwargs.get('seasonal_adjustment', 1.0)
        self.competition_adjustment = kwargs.get('competition_adjustment', 1.0)
        self.demand_adjustment = kwargs.get('demand_adjustment', 1.0)
        self.estimated_bookings_increase = kwargs.get('estimated_bookings_increase', 0.0)
        self.estimated_revenue_change = kwargs.get('estimated_revenue_change', 0.0)
        self.risk_assessment = kwargs.get('risk_assessment', 'medium')


class PricingModel:
    """ML модель для ценообразования."""
    
    def __init__(self):
        self.seasonal_factors = {
            'spring': 1.0,
            'summer': 1.2,
            'autumn': 0.9,
            'winter': 0.8
        }
        
        self.category_multipliers = {
            'electronics': 1.1,
            'vehicles': 1.3,
            'tools': 0.9,
            'sports': 1.15,
            'home': 0.95
        }
    
    def _get_season(self, date: datetime) -> str:
        """Определяет сезон по дате."""
        month = date.month
        if month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        elif month in [9, 10, 11]:
            return 'autumn'
        else:
            return 'winter'
    
    def predict_optimal_price(self, item: Item, market_data: Dict) -> PricingRecommendation:
        """Предсказывает оптимальную цену для товара."""
        try:
            current_price = float(item.price_per_day)
            
            # Сезонные корректировки
            season = self._get_season(datetime.utcnow())
            seasonal_factor = self.seasonal_factors.get(season, 1.0)
            
            # Категорийные корректировки
            category_factor = self.category_multipliers.get(
                item.category.name.lower() if item.category else 'other', 1.0
            )
            
            # Анализ конкуренции (упрощенный)
            avg_category_price = market_data.get('avg_category_price', current_price)
            competition_factor = min(1.2, max(0.8, avg_category_price / current_price))
            
            # Анализ спроса (на основе просмотров и избранного)
            demand_score = (item.views_count or 0) + (item.favorites_count or 0) * 2
            demand_factor = min(1.3, max(0.7, 1 + (demand_score / 100) * 0.1))
            
            # Рейтинг товара
            rating_factor = 1.0
            if item.rating:
                rating_factor = 0.9 + (float(item.rating) / 5.0) * 0.2
            
            # Расчет рекомендуемой цены
            recommended_price = current_price * seasonal_factor * category_factor * competition_factor * demand_factor * rating_factor
            
            # Ограничиваем изменения
            max_change = 0.3  # Максимум 30% изменения
            price_change_ratio = recommended_price / current_price
            if price_change_ratio > 1 + max_change:
                recommended_price = current_price * (1 + max_change)
            elif price_change_ratio < 1 - max_change:
                recommended_price = current_price * (1 - max_change)
            
            price_change_percentage = ((recommended_price - current_price) / current_price) * 100
            
            # Формируем reasoning
            reasoning = []
            if abs(seasonal_factor - 1.0) > 0.05:
                reasoning.append(f"Сезонная корректировка: {season} ({seasonal_factor:.2f})")
            
            if abs(competition_factor - 1.0) > 0.05:
                reasoning.append(f"Конкурентная позиция: {competition_factor:.2f}")
            
            if abs(demand_factor - 1.0) > 0.05:
                reasoning.append(f"Спрос: {demand_score} взаимодействий ({demand_factor:.2f})")
            
            if abs(rating_factor - 1.0) > 0.05:
                reasoning.append(f"Рейтинг товара: {item.rating or 'нет'} ({rating_factor:.2f})")
            
            # Определяем рыночную позицию
            if recommended_price > avg_category_price * 1.2:
                market_position = 'premium'
            elif recommended_price < avg_category_price * 0.8:
                market_position = 'budget'
            else:
                market_position = 'competitive'
            
            # Оценка риска
            if abs(price_change_percentage) > 20:
                risk_assessment = 'high'
            elif abs(price_change_percentage) > 10:
                risk_assessment = 'medium'
            else:
                risk_assessment = 'low'
            
            # Оценка влияния на доходность
            estimated_revenue_change = price_change_percentage * 0.7  # Упрощенная модель
            
            return PricingRecommendation(
                item_id=item.id,
                current_price=current_price,
                recommended_price=round(recommended_price, 6),
                price_change_percentage=round(price_change_percentage, 2),
                confidence_score=0.8,  # Базовый уровень доверия
                reasoning=reasoning,
                expected_demand_change=round((demand_factor - 1) * 100, 1),
                market_position=market_position,
                seasonal_adjustment=seasonal_factor,
                competition_adjustment=competition_factor,
                demand_adjustment=demand_factor,
                estimated_bookings_increase=round(demand_factor * 10, 1),
                estimated_revenue_change=round(estimated_revenue_change, 1),
                risk_assessment=risk_assessment
            )
            
        except Exception as e:
            logger.error(f"Error predicting price for item {item.id}: {e}")
            # Возвращаем нейтральную рекомендацию
            return PricingRecommendation(
                item_id=item.id,
                current_price=float(item.price_per_day),
                recommended_price=float(item.price_per_day),
                price_change_percentage=0.0,
                confidence_score=0.0,
                reasoning=["Ошибка в расчете рекомендации"],
                market_position='competitive',
                risk_assessment='medium'
            )


class PricingService:
    """Сервис для управления динамическим ценообразованием."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pricing_model = PricingModel()
    
    def get_pricing_recommendation(
        self, 
        item_id: uuid.UUID, 
        user_id: uuid.UUID,
        target_date: Optional[datetime] = None
    ) -> PricingRecommendation:
        """
        Получить рекомендацию по ценообразованию для товара.
        
        Args:
            item_id: ID товара
            user_id: ID пользователя
            target_date: Целевая дата для анализа
            
        Returns:
            PricingRecommendation: Рекомендация по ценообразованию
        """
        # Проверяем, что товар принадлежит пользователю
        item = self.db.query(Item).filter(
            Item.id == item_id,
            Item.owner_id == user_id
        ).first()
        
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        # Собираем рыночные данные
        market_data = self._get_market_data(item)
        
        # Получаем рекомендацию от ML модели
        recommendation = self.pricing_model.predict_optimal_price(item, market_data)
        
        return recommendation
    
    def get_bulk_recommendations(
        self, 
        user_id: uuid.UUID, 
        category_id: Optional[uuid.UUID] = None,
        limit: Optional[int] = 50
    ) -> List[PricingRecommendation]:
        """
        Получить рекомендации для всех товаров пользователя.
        
        Args:
            user_id: ID пользователя
            category_id: Опциональный фильтр по категории
            limit: Максимальное количество рекомендаций
            
        Returns:
            List[PricingRecommendation]: Список рекомендаций
        """
        query = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status == ItemStatus.ACTIVE
        )
        
        if category_id:
            query = query.filter(Item.category_id == category_id)
        
        items = query.limit(limit).all()
        
        recommendations = []
        for item in items:
            try:
                market_data = self._get_market_data(item)
                recommendation = self.pricing_model.predict_optimal_price(item, market_data)
                recommendations.append(recommendation)
            except Exception as e:
                logger.error(f"Error getting recommendation for item {item.id}: {e}")
                continue
        
        # Сортируем по потенциальному влиянию на доходность
        recommendations.sort(key=lambda x: abs(x.estimated_revenue_change), reverse=True)
        
        return recommendations
    
    def apply_pricing_recommendation(
        self, 
        item_id: uuid.UUID, 
        user_id: uuid.UUID,
        apply_automatic: bool = False
    ) -> Dict[str, Any]:
        """
        Применить рекомендацию по ценообразованию.
        
        Args:
            item_id: ID товара
            user_id: ID пользователя
            apply_automatic: Применить автоматически без дополнительных проверок
            
        Returns:
            Dict с результатом применения
        """
        # Получаем рекомендацию
        recommendation = self.get_pricing_recommendation(item_id, user_id)
        
        # Проверяем условия применения
        if not apply_automatic:
            if recommendation.confidence_score < 0.7:
                return {
                    "status": "rejected",
                    "reason": "Низкий уровень доверия к рекомендации",
                    "confidence_score": recommendation.confidence_score
                }
            
            if recommendation.risk_assessment == 'high':
                return {
                    "status": "rejected",
                    "reason": "Высокий уровень риска",
                    "risk_assessment": recommendation.risk_assessment
                }
        
        # Применяем новую цену
        item = self.db.query(Item).filter(
            Item.id == item_id,
            Item.owner_id == user_id
        ).first()
        
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        old_price = float(item.price_per_day)
        new_price = recommendation.recommended_price
        
        # Сохраняем в истории
        pricing_history = PricingHistory(
            item_id=item_id,
            user_id=user_id,
            old_price=old_price,
            new_price=new_price,
            change_percentage=recommendation.price_change_percentage,
            change_reason='recommendation',
            confidence_score=recommendation.confidence_score,
            market_factors={
                'seasonal_adjustment': recommendation.seasonal_adjustment,
                'competition_adjustment': recommendation.competition_adjustment,
                'demand_adjustment': recommendation.demand_adjustment
            }
        )
        
        self.db.add(pricing_history)
        
        # Обновляем цену товара
        item.price_per_day = Decimal(str(new_price))
        item.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "status": "applied",
            "old_price": old_price,
            "new_price": new_price,
            "change_percentage": recommendation.price_change_percentage,
            "estimated_revenue_change": recommendation.estimated_revenue_change
        }
    
    def get_category_insights(
        self, 
        category_id: uuid.UUID, 
        user_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Получить инсайты по ценообразованию для категории.
        
        Args:
            category_id: ID категории
            user_id: Опциональный ID пользователя для персональной статистики
            
        Returns:
            Dict с инсайтами по категории
        """
        # Базовая статистика по категории
        category_stats = self.db.query(
            func.count(Item.id).label('total_items'),
            func.avg(Item.price_per_day).label('avg_price'),
            func.min(Item.price_per_day).label('min_price'),
            func.max(Item.price_per_day).label('max_price'),
            func.avg(Item.views_count).label('avg_views'),
            func.avg(Item.rating).label('avg_rating')
        ).filter(
            Item.category_id == category_id,
            Item.status == ItemStatus.ACTIVE
        ).first()
        
        # Статистика спроса (контракты)
        demand_stats = self.db.query(
            func.count(Contract.id).label('total_bookings'),
            func.avg(Contract.total_price).label('avg_booking_value')
        ).join(Item).filter(
            Item.category_id == category_id,
            Contract.status.in_([ContractStatus.COMPLETED, ContractStatus.ACTIVE])
        ).first()
        
        # Топ товары в категории
        top_performers = self.db.query(Item).filter(
            Item.category_id == category_id,
            Item.status == ItemStatus.ACTIVE
        ).order_by(
            desc(Item.rentals_count),
            desc(Item.rating)
        ).limit(5).all()
        
        insights = {
            'basic_stats': {
                'total_items': category_stats.total_items or 0,
                'avg_price': float(category_stats.avg_price or 0),
                'min_price': float(category_stats.min_price or 0),
                'max_price': float(category_stats.max_price or 0),
                'avg_views': category_stats.avg_views or 0,
                'avg_rating': float(category_stats.avg_rating or 0)
            },
            'demand_stats': {
                'total_bookings': demand_stats.total_bookings or 0,
                'avg_booking_value': float(demand_stats.avg_booking_value or 0)
            },
            'top_performers': [
                {
                    'id': item.id,
                    'title': item.title,
                    'price': float(item.price_per_day),
                    'rentals': item.rentals_count or 0,
                    'rating': float(item.rating or 0)
                }
                for item in top_performers
            ],
            'pricing_insights': {
                'recommended_price_range': {
                    'min': float(category_stats.avg_price or 0) * 0.8,
                    'max': float(category_stats.avg_price or 0) * 1.2
                },
                'market_saturation': 'medium',  # Упрощенная оценка
                'growth_potential': 'high' if (category_stats.avg_views or 0) > 100 else 'medium'
            }
        }
        
        # Персональная статистика пользователя
        if user_id:
            user_stats = self.db.query(
                func.count(Item.id).label('user_items'),
                func.avg(Item.price_per_day).label('user_avg_price'),
                func.avg(Item.views_count).label('user_avg_views')
            ).filter(
                Item.category_id == category_id,
                Item.owner_id == user_id,
                Item.status == ItemStatus.ACTIVE
            ).first()
            
            insights['personal_stats'] = {
                'user_items': user_stats.user_items or 0,
                'user_avg_price': float(user_stats.user_avg_price or 0),
                'user_avg_views': user_stats.user_avg_views or 0,
                'position_vs_market': 'competitive'  # Упрощенная оценка
            }
        
        return insights
    
    def get_pricing_analytics(self, user_id: uuid.UUID, period_days: int = 30) -> Dict[str, Any]:
        """
        Получить аналитику по ценообразованию для пользователя.
        
        Args:
            user_id: ID пользователя
            period_days: Период анализа в днях
            
        Returns:
            Dict с аналитикой ценообразования
        """
        start_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Получаем товары пользователя
        user_items = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status == ItemStatus.ACTIVE
        ).all()
        
        # Получаем рекомендации для всех товаров
        recommendations = self.get_bulk_recommendations(user_id)
        
        # Анализируем потенциал оптимизации
        total_revenue_increase = sum(r.estimated_revenue_change for r in recommendations if r.estimated_revenue_change > 0)
        avg_revenue_increase = total_revenue_increase / len(recommendations) if recommendations else 0
        
        # Распределение по рискам
        risk_distribution = {
            'low': len([r for r in recommendations if r.risk_assessment == 'low']),
            'medium': len([r for r in recommendations if r.risk_assessment == 'medium']),
            'high': len([r for r in recommendations if r.risk_assessment == 'high'])
        }
        
        # Анализ по категориям
        category_analysis = {}
        categories = self.db.query(Category).all()
        
        for category in categories:
            category_items = [item for item in user_items if item.category_id == category.id]
            if category_items:
                category_recs = [r for r in recommendations if any(item.id == r.item_id for item in category_items)]
                category_analysis[str(category.id)] = {
                    'items_count': len(category_items),
                    'avg_price_change': sum(r.price_change_percentage for r in category_recs) / len(category_recs) if category_recs else 0,
                    'revenue_potential': sum(r.estimated_revenue_change for r in category_recs if r.estimated_revenue_change > 0)
                }
        
        return {
            'period_days': period_days,
            'total_items': len(user_items),
            'recommendations_count': len(recommendations),
            'optimization_potential': {
                'total_revenue_increase': total_revenue_increase,
                'avg_revenue_increase': avg_revenue_increase,
                'items_with_potential': len([r for r in recommendations if r.estimated_revenue_change > 5])
            },
            'risk_distribution': risk_distribution,
            'category_analysis': category_analysis,
            'top_recommendations': recommendations[:5]  # Топ-5 рекомендаций
        }
    
    def enable_auto_pricing(
        self, 
        user_id: uuid.UUID, 
        item_id: Optional[uuid.UUID] = None,
        settings: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Включить автоматическое ценообразование.
        
        Args:
            user_id: ID пользователя
            item_id: ID конкретного товара (опционально)
            settings: Настройки автопрайсинга
            
        Returns:
            Dict с результатом
        """
        if settings is None:
            settings = {}
        
        config = AutoPricingConfiguration(
            user_id=user_id,
            item_id=item_id,
            enabled=True,
            max_change_percentage=settings.get('max_change_percentage', 15.0),
            min_confidence_score=settings.get('min_confidence_score', 0.8),
            exclude_high_risk=settings.get('exclude_high_risk', True),
            notification_enabled=settings.get('notification_enabled', True),
            update_frequency_hours=settings.get('update_frequency_hours', 24)
        )
        
        # Проверяем, есть ли уже конфигурация
        existing = self.db.query(AutoPricingConfiguration).filter(
            AutoPricingConfiguration.user_id == user_id,
            AutoPricingConfiguration.item_id == item_id
        ).first()
        
        if existing:
            # Обновляем существующую
            for key, value in settings.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            existing.enabled = True
            existing.updated_at = datetime.utcnow()
        else:
            # Создаем новую
            self.db.add(config)
        
        self.db.commit()
        
        return {
            'enabled': True,
            'settings': settings,
            'items_affected': 1 if item_id else len(self.db.query(Item).filter(Item.owner_id == user_id).all())
        }
    
    def disable_auto_pricing(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Отключить автоматическое ценообразование.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Dict с результатом
        """
        configs = self.db.query(AutoPricingConfiguration).filter(
            AutoPricingConfiguration.user_id == user_id
        ).all()
        
        for config in configs:
            config.enabled = False
            config.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            'disabled': True,
            'configs_updated': len(configs)
        }
    
    def get_pricing_history(
        self, 
        item_id: uuid.UUID, 
        user_id: uuid.UUID, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Получить историю изменения цен для товара.
        
        Args:
            item_id: ID товара
            user_id: ID пользователя
            limit: Максимальное количество записей
            
        Returns:
            List с историей изменений
        """
        # Проверяем доступ к товару
        item = self.db.query(Item).filter(
            Item.id == item_id,
            Item.owner_id == user_id
        ).first()
        
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        history = self.db.query(PricingHistory).filter(
            PricingHistory.item_id == item_id
        ).order_by(desc(PricingHistory.created_at)).limit(limit).all()
        
        return [
            {
                'id': entry.id,
                'old_price': float(entry.old_price),
                'new_price': float(entry.new_price),
                'change_percentage': float(entry.change_percentage),
                'reason': entry.change_reason,
                'confidence_score': float(entry.confidence_score) if entry.confidence_score else None,
                'created_at': entry.created_at,
                'market_factors': entry.market_factors
            }
            for entry in history
        ]
    
    def schedule_automatic_pricing_updates(self) -> Dict[str, Any]:
        """
        Запланировать автоматические обновления цен (для админов).
        
        Returns:
            Dict с результатом планирования
        """
        # Получаем все активные конфигурации автопрайсинга
        active_configs = self.db.query(AutoPricingConfiguration).filter(
            AutoPricingConfiguration.enabled == True
        ).all()
        
        updates_scheduled = 0
        
        for config in active_configs:
            # Проверяем, нужно ли обновление
            if config.last_applied_at:
                time_since_update = datetime.utcnow() - config.last_applied_at
                if time_since_update.total_seconds() < config.update_frequency_hours * 3600:
                    continue
            
            # Здесь должна быть логика постановки задачи в очередь (Celery)
            # Пока просто считаем
            updates_scheduled += 1
        
        return {
            'total_configs': len(active_configs),
            'updates_scheduled': updates_scheduled,
            'scheduled_at': datetime.utcnow()
        }
    
    def _get_market_data(self, item: Item) -> Dict[str, Any]:
        """
        Собрать рыночные данные для товара.
        
        Args:
            item: Товар
            
        Returns:
            Dict с рыночными данными
        """
        if not item.category_id:
            return {'avg_category_price': float(item.price_per_day)}
        
        # Средняя цена в категории
        avg_price_result = self.db.query(func.avg(Item.price_per_day)).filter(
            Item.category_id == item.category_id,
            Item.status == ItemStatus.ACTIVE,
            Item.id != item.id
        ).scalar()
        
        avg_category_price = float(avg_price_result) if avg_price_result else float(item.price_per_day)
        
        # Количество товаров в категории
        category_items_count = self.db.query(func.count(Item.id)).filter(
            Item.category_id == item.category_id,
            Item.status == ItemStatus.ACTIVE
        ).scalar() or 0
        
        # Активность в категории (контракты за последние 30 дней)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        category_activity = self.db.query(func.count(Contract.id)).join(Item).filter(
            Item.category_id == item.category_id,
            Contract.created_at >= thirty_days_ago
        ).scalar() or 0
        
        return {
            'avg_category_price': avg_category_price,
            'category_items_count': category_items_count,
            'category_activity': category_activity,
            'market_competition': 'high' if category_items_count > 100 else 'medium' if category_items_count > 20 else 'low'
        }