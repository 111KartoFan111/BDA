"""
Pricing service для интеграции динамического ценообразования в RentChain
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging
from celery import Celery

from app.services.dynamic_pricing_model import DynamicPricingModel, PricingRecommendation
from app.models.item import Item, ItemStatus
from app.models.user import User
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.utils.exceptions import NotFoundError, BadRequestError
from app.services.notification import NotificationService
from app.core.config import settings

logger = logging.getLogger(__name__)

# Celery для фоновых задач (если настроен)
try:
    celery_app = Celery('pricing_tasks')
    celery_app.config_from_object(settings, namespace='CELERY')
except:
    celery_app = None


class PricingService:
    """Сервис для управления динамическим ценообразованием."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pricing_model = DynamicPricingModel(db)
        self.notification_service = NotificationService(db)
        
        # Настройки сервиса
        self.config = {
            'auto_pricing_enabled': True,
            'max_auto_adjustment': 0.2,  # Максимальная автоматическая корректировка ±20%
            'min_confidence_threshold': 0.7,
            'notification_threshold': 0.1,  # Уведомлять при изменении >10%
            'update_frequency_hours': 24,
            'batch_size': 50
        }
    
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
            user_id: ID пользователя (владельца товара)
            target_date: Целевая дата для анализа
            
        Returns:
            Рекомендация по ценообразованию
        """
        # Проверяем права доступа
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        if item.owner_id != user_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_admin:
                raise BadRequestError("You can only get pricing recommendations for your own items")
        
        try:
            # Получаем рекомендацию от модели
            recommendation = self.pricing_model.get_pricing_recommendation(item_id, target_date)
            
            # Логируем запрос рекомендации
            self._log_pricing_request(item_id, user_id, recommendation)
            
            return recommendation
            
        except Exception as e:
            logger.error(f"Error getting pricing recommendation for item {item_id}: {e}")
            raise BadRequestError("Unable to generate pricing recommendation")
    
    def get_bulk_recommendations(
        self, 
        user_id: uuid.UUID,
        category_id: Optional[uuid.UUID] = None,
        limit: Optional[int] = None
    ) -> List[PricingRecommendation]:
        """
        Получить рекомендации для всех товаров пользователя.
        
        Args:
            user_id: ID пользователя
            category_id: Опциональный фильтр по категории
            limit: Максимальное количество рекомендаций
            
        Returns:
            Список рекомендаций
        """
        # Получаем товары пользователя
        query = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        )
        
        if category_id:
            query = query.filter(Item.category_id == category_id)
        
        if limit:
            query = query.limit(limit)
        
        items = query.all()
        item_ids = [item.id for item in items]
        
        if not item_ids:
            return []
        
        try:
            recommendations = self.pricing_model.get_bulk_recommendations(item_ids)
            
            # Фильтруем рекомендации по уровню доверия
            filtered_recommendations = [
                rec for rec in recommendations 
                if rec.confidence_score >= self.config['min_confidence_threshold']
            ]
            
            # Сортируем по потенциальному влиянию на выручку
            filtered_recommendations.sort(
                key=lambda x: abs(x.estimated_revenue_change), 
                reverse=True
            )
            
            return filtered_recommendations
            
        except Exception as e:
            logger.error(f"Error getting bulk recommendations for user {user_id}: {e}")
            return []
    
    def apply_pricing_recommendation(
        self, 
        item_id: uuid.UUID, 
        user_id: uuid.UUID,
        apply_automatic: bool = False
    ) -> Dict[str, Any]:
        """
        Применить ценовую рекомендацию к товару.
        
        Args:
            item_id: ID товара
            user_id: ID пользователя
            apply_automatic: Применить автоматически или только предложить
            
        Returns:
            Результат применения
        """
        # Получаем рекомендацию
        recommendation = self.get_pricing_recommendation(item_id, user_id)
        
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        # Проверяем ограничения
        if abs(recommendation.price_change_percentage) > self.config['max_auto_adjustment'] * 100:
            if apply_automatic:
                return {
                    "status": "rejected",
                    "reason": f"Price change exceeds maximum allowed ({self.config['max_auto_adjustment'] * 100}%)",
                    "recommendation": recommendation
                }
        
        if recommendation.confidence_score < self.config['min_confidence_threshold']:
            if apply_automatic:
                return {
                    "status": "rejected", 
                    "reason": "Confidence score too low for automatic application",
                    "recommendation": recommendation
                }
        
        if apply_automatic and recommendation.risk_assessment == 'high':
            return {
                "status": "rejected",
                "reason": "High risk assessment prevents automatic application",
                "recommendation": recommendation
            }
        
        old_price = float(item.price_per_day)
        new_price = recommendation.recommended_price
        
        if apply_automatic:
            # Применяем новую цену
            item.price_per_day = new_price
            item.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Записываем историю изменений
            self._log_price_change(item_id, user_id, old_price, new_price, recommendation)
            
            # Отправляем уведомление владельцу
            if abs(recommendation.price_change_percentage) >= self.config['notification_threshold'] * 100:
                self._send_price_change_notification(item, recommendation)
            
            return {
                "status": "applied",
                "old_price": old_price,
                "new_price": new_price,
                "change_percentage": recommendation.price_change_percentage,
                "recommendation": recommendation
            }
        else:
            return {
                "status": "recommendation_only",
                "recommendation": recommendation
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
            user_id: Опциональный ID пользователя для персонализации
            
        Returns:
            Инсайты по категории
        """
        try:
            insights = self.pricing_model.get_category_pricing_insights(category_id)
            
            # Если указан пользователь, добавляем персональные данные
            if user_id:
                user_items = self.db.query(Item).filter(
                    Item.owner_id == user_id,
                    Item.category_id == category_id,
                    Item.status == ItemStatus.ACTIVE
                ).all()
                
                if user_items:
                    user_avg_price = sum(float(item.price_per_day) for item in user_items) / len(user_items)
                    market_avg_price = insights['basic_stats']['average_price']
                    
                    insights['personal_stats'] = {
                        'items_count': len(user_items),
                        'average_price': user_avg_price,
                        'market_position': self._get_market_position(user_avg_price, market_avg_price),
                        'optimization_opportunities': self._find_optimization_opportunities(user_items)
                    }
            
            return insights
            
        except Exception as e:
            logger.error(f"Error getting category insights for {category_id}: {e}")
            raise BadRequestError("Unable to get category insights")
    
    def schedule_automatic_pricing_updates(self) -> Dict[str, Any]:
        """
        Запланировать автоматические обновления цен.
        
        Returns:
            Результат планирования
        """
        if not celery_app:
            return {"status": "error", "message": "Celery not configured"}
        
        try:
            # Планируем обновление цен для всех активных товаров
            task = update_all_prices_task.delay()
            
            return {
                "status": "scheduled",
                "task_id": task.id,
                "message": "Automatic pricing update scheduled"
            }
            
        except Exception as e:
            logger.error(f"Error scheduling pricing updates: {e}")
            return {"status": "error", "message": str(e)}
    
    def get_pricing_analytics(
        self, 
        user_id: uuid.UUID,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Получить аналитику по ценообразованию для пользователя.
        
        Args:
            user_id: ID пользователя
            period_days: Период анализа в днях
            
        Returns:
            Аналитика по ценообразованию
        """
        start_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Товары пользователя
        user_items = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status == ItemStatus.ACTIVE
        ).all()
        
        if not user_items:
            return {
                "period_days": period_days,
                "total_items": 0,
                "analytics": {}
            }
        
        # Получаем рекомендации для всех товаров
        recommendations = self.get_bulk_recommendations(user_id)
        
        # Анализируем потенциал оптимизации
        optimization_potential = sum(
            rec.estimated_revenue_change for rec in recommendations
            if rec.estimated_revenue_change > 0
        )
        
        # Распределение по уровню риска
        risk_distribution = {
            'low': len([r for r in recommendations if r.risk_assessment == 'low']),
            'medium': len([r for r in recommendations if r.risk_assessment == 'medium']),
            'high': len([r for r in recommendations if r.risk_assessment == 'high'])
        }
        
        # Категории с наибольшим потенциалом
        category_potential = {}
        for rec in recommendations:
            item = next((item for item in user_items if item.id == rec.item_id), None)
            if item:
                cat_id = str(item.category_id)
                if cat_id not in category_potential:
                    category_potential[cat_id] = {
                        'category_name': item.category.name,
                        'items_count': 0,
                        'total_potential': 0.0,
                        'avg_confidence': 0.0
                    }
                
                category_potential[cat_id]['items_count'] += 1
                category_potential[cat_id]['total_potential'] += rec.estimated_revenue_change
                category_potential[cat_id]['avg_confidence'] += rec.confidence_score
        
        # Рассчитываем средние значения
        for cat_data in category_potential.values():
            if cat_data['items_count'] > 0:
                cat_data['avg_confidence'] /= cat_data['items_count']
        
        return {
            "period_days": period_days,
            "total_items": len(user_items),
            "recommendations_count": len(recommendations),
            "optimization_potential": {
                "total_revenue_increase": optimization_potential,
                "avg_revenue_increase": optimization_potential / len(recommendations) if recommendations else 0
            },
            "risk_distribution": risk_distribution,
            "category_analysis": dict(sorted(
                category_potential.items(), 
                key=lambda x: x[1]['total_potential'], 
                reverse=True
            )),
            "top_recommendations": sorted(
                recommendations[:5], 
                key=lambda x: x.estimated_revenue_change, 
                reverse=True
            )
        }
    
    def enable_auto_pricing(
        self, 
        user_id: uuid.UUID, 
        item_id: Optional[uuid.UUID] = None,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Включить автоматическое ценообразование.
        
        Args:
            user_id: ID пользователя
            item_id: ID конкретного товара (если None, то для всех товаров)
            settings: Настройки автоматического ценообразования
            
        Returns:
            Результат включения
        """
        auto_settings = {
            'max_change_percentage': 15.0,  # Максимальное изменение ±15%
            'min_confidence_score': 0.8,
            'exclude_high_risk': True,
            'notification_enabled': True,
            'update_frequency_hours': 24
        }
        
        if settings:
            auto_settings.update(settings)
        
        # Обновляем настройки пользователя
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        if not user.settings:
            user.settings = {}
        
        user.settings['auto_pricing'] = {
            'enabled': True,
            'item_id': str(item_id) if item_id else None,
            **auto_settings,
            'enabled_at': datetime.utcnow().isoformat()
        }
        
        self.db.commit()
        
        return {
            "status": "enabled",
            "settings": auto_settings,
            "message": "Automatic pricing enabled successfully"
        }
    
    def disable_auto_pricing(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Отключить автоматическое ценообразование.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Результат отключения
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", str(user_id))
        
        if user.settings and 'auto_pricing' in user.settings:
            user.settings['auto_pricing']['enabled'] = False
            user.settings['auto_pricing']['disabled_at'] = datetime.utcnow().isoformat()
            self.db.commit()
        
        return {
            "status": "disabled",
            "message": "Automatic pricing disabled successfully"
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
            История изменений цен
        """
        # Проверяем права доступа
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise NotFoundError("Item", str(item_id))
        
        if item.owner_id != user_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_admin:
                raise BadRequestError("Access denied")
        
        # В реальном приложении здесь был бы запрос к таблице истории цен
        # Пока возвращаем заглушку
        return [
            {
                "date": (datetime.utcnow() - timedelta(days=i)).isoformat(),
                "old_price": 100.0 - i,
                "new_price": 100.0,
                "change_percentage": i,
                "reason": "automatic_optimization" if i % 2 == 0 else "manual_update",
                "confidence_score": 0.8 + (i * 0.01)
            }
            for i in range(min(limit, 10))
        ]
    
    def _log_pricing_request(
        self, 
        item_id: uuid.UUID, 
        user_id: uuid.UUID, 
        recommendation: PricingRecommendation
    ) -> None:
        """Логировать запрос рекомендации по ценообразованию."""
        logger.info(
            f"Pricing recommendation requested - "
            f"User: {user_id}, Item: {item_id}, "
            f"Current: {recommendation.current_price}, "
            f"Recommended: {recommendation.recommended_price}, "
            f"Change: {recommendation.price_change_percentage:.1f}%, "
            f"Confidence: {recommendation.confidence_score:.2f}"
        )
    
    def _log_price_change(
        self,
        item_id: uuid.UUID,
        user_id: uuid.UUID,
        old_price: float,
        new_price: float,
        recommendation: PricingRecommendation
    ) -> None:
        """Логировать изменение цены."""
        logger.info(
            f"Price changed automatically - "
            f"User: {user_id}, Item: {item_id}, "
            f"Old: {old_price}, New: {new_price}, "
            f"Change: {((new_price - old_price) / old_price * 100):.1f}%, "
            f"Confidence: {recommendation.confidence_score:.2f}"
        )
        
        # В реальном приложении здесь была бы запись в таблицу истории
        # self._save_price_history(item_id, user_id, old_price, new_price, recommendation)
    
    def _send_price_change_notification(
        self, 
        item: Item, 
        recommendation: PricingRecommendation
    ) -> None:
        """Отправить уведомление об изменении цены."""
        change_direction = "увеличена" if recommendation.price_change_percentage > 0 else "снижена"
        
        self.notification_service.create_notification(
            user_id=item.owner_id,
            title="Цена товара обновлена",
            message=f"Цена на товар '{item.title}' была автоматически {change_direction} "
                   f"на {abs(recommendation.price_change_percentage):.1f}% "
                   f"(с {recommendation.current_price} до {recommendation.recommended_price})",
            type="pricing_update",
            action_url=f"/items/{item.id}",
            data={
                "item_id": str(item.id),
                "old_price": recommendation.current_price,
                "new_price": recommendation.recommended_price,
                "change_percentage": recommendation.price_change_percentage,
                "reasoning": recommendation.reasoning
            }
        )
    
    def _get_market_position(self, user_price: float, market_avg: float) -> str:
        """Определить рыночную позицию пользователя."""
        if market_avg == 0:
            return "unknown"
        
        ratio = user_price / market_avg
        
        if ratio >= 1.2:
            return "premium"
        elif ratio <= 0.8:
            return "budget"
        else:
            return "competitive"
    
    def _find_optimization_opportunities(self, items: List[Item]) -> List[Dict[str, Any]]:
        """Найти возможности для оптимизации цен."""
        opportunities = []
        
        for item in items:
            try:
                recommendation = self.pricing_model.get_pricing_recommendation(item.id)
                
                if abs(recommendation.price_change_percentage) > 5 and recommendation.confidence_score > 0.7:
                    opportunities.append({
                        "item_id": str(item.id),
                        "item_title": item.title,
                        "current_price": recommendation.current_price,
                        "recommended_price": recommendation.recommended_price,
                        "potential_increase": recommendation.estimated_revenue_change,
                        "confidence": recommendation.confidence_score
                    })
            except Exception as e:
                logger.warning(f"Could not get recommendation for item {item.id}: {e}")
        
        return sorted(opportunities, key=lambda x: x["potential_increase"], reverse=True)[:5]


# Celery задачи для фонового обновления цен
if celery_app:
    
    @celery_app.task(bind=True)
    def update_all_prices_task(self):
        """Фоновая задача для обновления всех цен."""
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            pricing_service = PricingService(db)
            
            # Получаем всех пользователей с включенным автоматическим ценообразованием
            users_with_auto_pricing = db.query(User).filter(
                User.settings.contains({"auto_pricing": {"enabled": True}})
            ).all()
            
            total_updated = 0
            
            for user in users_with_auto_pricing:
                try:
                    auto_settings = user.settings.get('auto_pricing', {})
                    
                    # Получаем товары пользователя
                    items_query = db.query(Item).filter(
                        Item.owner_id == user.id,
                        Item.status == ItemStatus.ACTIVE,
                        Item.is_approved == True
                    )
                    
                    # Если указан конкретный товар
                    if auto_settings.get('item_id'):
                        items_query = items_query.filter(Item.id == auto_settings['item_id'])
                    
                    items = items_query.all()
                    
                    for item in items:
                        try:
                            result = pricing_service.apply_pricing_recommendation(
                                item.id, user.id, apply_automatic=True
                            )
                            
                            if result["status"] == "applied":
                                total_updated += 1
                                
                        except Exception as e:
                            logger.error(f"Error updating price for item {item.id}: {e}")
                
                except Exception as e:
                    logger.error(f"Error processing user {user.id}: {e}")
            
            logger.info(f"Automatic pricing update completed. Updated {total_updated} items.")
            return {"updated_count": total_updated}
            
        except Exception as e:
            logger.error(f"Error in automatic pricing update task: {e}")
            raise
        finally:
            db.close()
    
    @celery_app.task(bind=True)
    def retrain_pricing_models_task(self):
        """Фоновая задача для переобучения моделей ценообразования."""
        from app.core.database import SessionLocal
        
        db = SessionLocal()
        try:
            pricing_model = DynamicPricingModel(db)
            
            success = pricing_model.train_models()
            
            if success:
                logger.info("Pricing models retrained successfully")
                return {"status": "success"}
            else:
                logger.error("Failed to retrain pricing models")
                return {"status": "failed"}
                
        except Exception as e:
            logger.error(f"Error in model retraining task: {e}")
            raise
        finally:
            db.close()


# Планировщик для периодических задач
if celery_app:
    from celery.schedules import crontab
    
    celery_app.conf.beat_schedule = {
        'update-prices-daily': {
            'task': 'app.services.pricing_service.update_all_prices_task',
            'schedule': crontab(hour=2, minute=0),  # Каждый день в 2:00
        },
        'retrain-models-weekly': {
            'task': 'app.services.pricing_service.retrain_pricing_models_task',
            'schedule': crontab(hour=3, minute=0, day_of_week=1),  # Каждый понедельник в 3:00
        },
    }