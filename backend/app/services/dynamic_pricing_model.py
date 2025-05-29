"""
Dynamic Pricing Model for RentChain
Модель динамического ценообразования для оптимизации цен на аренду
"""

from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
import logging
from dataclasses import dataclass
import uuid

from app.models.item import Item, Category, ItemStatus
from app.models.contract import Contract, ContractStatus
from app.models.user import User
from app.core.config import settings
from app.utils.exceptions import BadRequestError

logger = logging.getLogger(__name__)


@dataclass
class PricingFeatures:
    """Структура для хранения признаков ценообразования."""
    
    # Базовые характеристики товара
    item_id: uuid.UUID
    category_id: uuid.UUID
    current_price: float
    item_age_days: int
    item_condition_score: float
    has_images: bool
    description_length: int
    brand_popularity_score: float
    
    # Метрики популярности
    views_count: int
    favorites_count: int
    total_reviews: int
    average_rating: float
    rental_history_count: int
    
    # Временные факторы
    season: str  # spring, summer, autumn, winter
    month: int
    day_of_week: int
    is_holiday: bool
    is_weekend: bool
    
    # Рыночные факторы
    category_avg_price: float
    category_median_price: float
    similar_items_count: int
    competition_density: float
    location_demand_score: float
    
    # Факторы спроса
    recent_search_count: int
    booking_rate_7d: float
    booking_rate_30d: float
    cancellation_rate: float
    
    # Пользовательские факторы
    owner_rating: float
    owner_total_items: int
    owner_completion_rate: float
    owner_response_time_score: float


@dataclass 
class PricingRecommendation:
    """Рекомендация по ценообразованию."""
    
    item_id: uuid.UUID
    current_price: float
    recommended_price: float
    price_change_percentage: float
    confidence_score: float
    reasoning: List[str]
    expected_demand_change: float
    market_position: str  # 'premium', 'competitive', 'budget'
    
    # Дополнительные рекомендации
    seasonal_adjustment: float
    competition_adjustment: float
    demand_adjustment: float
    
    # Прогнозы
    estimated_bookings_increase: float
    estimated_revenue_change: float
    risk_assessment: str  # 'low', 'medium', 'high'


class DynamicPricingModel:
    """Модель динамического ценообразования."""
    
    def __init__(self, db: Session):
        self.db = db
        self.model_path = os.path.join(settings.MODEL_PATH, 'pricing')
        os.makedirs(self.model_path, exist_ok=True)
        
        # ML модели
        self.demand_model = None
        self.price_model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        
        # Кэш для оптимизации
        self._cache = {}
        self._cache_expiry = {}
        
        # Настройки модели
        self.model_config = {
            'min_training_samples': 100,
            'max_price_change': 0.5,  # Максимальное изменение цены: ±50%
            'confidence_threshold': 0.7,
            'update_frequency_hours': 24,
            'seasonal_factors': {
                'spring': 1.0,
                'summer': 1.2,
                'autumn': 0.9,
                'winter': 0.8
            }
        }
    
    def initialize_models(self) -> bool:
        """
        Инициализация и загрузка ML моделей.
        
        Returns:
            True если модели успешно инициализированы
        """
        try:
            model_files = {
                'demand_model': 'demand_prediction_model.pkl',
                'price_model': 'price_optimization_model.pkl',
                'scaler': 'feature_scaler.pkl',
                'encoders': 'label_encoders.pkl'
            }
            
            # Проверяем наличие файлов моделей
            missing_models = []
            for name, filename in model_files.items():
                filepath = os.path.join(self.model_path, filename)
                if not os.path.exists(filepath):
                    missing_models.append(name)
            
            if missing_models:
                logger.info(f"Missing models: {missing_models}. Training new models...")
                return self.train_models()
            
            # Загружаем существующие модели
            self.demand_model = joblib.load(os.path.join(self.model_path, model_files['demand_model']))
            self.price_model = joblib.load(os.path.join(self.model_path, model_files['price_model']))
            self.scaler = joblib.load(os.path.join(self.model_path, model_files['scaler']))
            self.label_encoders = joblib.load(os.path.join(self.model_path, model_files['encoders']))
            
            logger.info("Dynamic pricing models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing pricing models: {e}")
            return False
    
    def get_pricing_recommendation(
        self, 
        item_id: uuid.UUID,
        target_date: Optional[datetime] = None
    ) -> PricingRecommendation:
        """
        Получить рекомендацию по ценообразованию для товара.
        
        Args:
            item_id: ID товара
            target_date: Целевая дата (по умолчанию - текущая)
            
        Returns:
            Рекомендация по ценообразованию
        """
        if not self.demand_model or not self.price_model:
            if not self.initialize_models():
                raise BadRequestError("Pricing models not available")
        
        # Получаем товар
        item = self.db.query(Item).filter(Item.id == item_id).first()
        if not item:
            raise BadRequestError("Item not found")
        
        target_date = target_date or datetime.utcnow()
        
        # Извлекаем признаки
        features = self._extract_item_features(item, target_date)
        
        # Предсказываем спрос и оптимальную цену
        predicted_demand = self._predict_demand(features)
        recommended_price = self._predict_optimal_price(features, predicted_demand)
        
        # Анализируем конкуренцию
        competition_analysis = self._analyze_competition(item)
        
        # Применяем корректировки
        final_price = self._apply_pricing_adjustments(
            item, recommended_price, features, competition_analysis
        )
        
        # Рассчитываем метрики
        current_price = float(item.price_per_day)
        price_change_pct = ((final_price - current_price) / current_price) * 100
        
        # Определяем рыночную позицию
        market_position = self._determine_market_position(
            final_price, competition_analysis['avg_price']
        )
        
        # Генерируем объяснения
        reasoning = self._generate_pricing_reasoning(
            features, competition_analysis, price_change_pct
        )
        
        # Оцениваем риски
        risk_assessment = self._assess_pricing_risk(price_change_pct, features)
        
        return PricingRecommendation(
            item_id=item_id,
            current_price=current_price,
            recommended_price=final_price,
            price_change_percentage=price_change_pct,
            confidence_score=self._calculate_confidence_score(features),
            reasoning=reasoning,
            expected_demand_change=predicted_demand,
            market_position=market_position,
            seasonal_adjustment=self._get_seasonal_factor(target_date),
            competition_adjustment=competition_analysis.get('price_adjustment', 0),
            demand_adjustment=predicted_demand,
            estimated_bookings_increase=self._estimate_booking_increase(
                price_change_pct, predicted_demand
            ),
            estimated_revenue_change=self._estimate_revenue_change(
                current_price, final_price, predicted_demand
            ),
            risk_assessment=risk_assessment
        )
    
    def get_bulk_recommendations(
        self, 
        item_ids: List[uuid.UUID],
        target_date: Optional[datetime] = None
    ) -> List[PricingRecommendation]:
        """
        Получить рекомендации для нескольких товаров.
        
        Args:
            item_ids: Список ID товаров
            target_date: Целевая дата
            
        Returns:
            Список рекомендаций
        """
        recommendations = []
        
        for item_id in item_ids:
            try:
                recommendation = self.get_pricing_recommendation(item_id, target_date)
                recommendations.append(recommendation)
            except Exception as e:
                logger.error(f"Error getting recommendation for item {item_id}: {e}")
        
        return recommendations
    
    def get_category_pricing_insights(
        self, 
        category_id: uuid.UUID,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Получить инсайты по ценообразованию для категории.
        
        Args:
            category_id: ID категории
            period_days: Период анализа в днях
            
        Returns:
            Инсайты по категории
        """
        start_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Базовая статистика по категории
        category_stats = self.db.query(
            func.count(Item.id).label('total_items'),
            func.avg(Item.price_per_day).label('avg_price'),
            func.min(Item.price_per_day).label('min_price'),
            func.max(Item.price_per_day).label('max_price'),
            func.percentile_cont(0.5).within_group(Item.price_per_day).label('median_price')
        ).filter(
            Item.category_id == category_id,
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).first()
        
        # Анализ спроса
        demand_stats = self.db.query(
            func.count(Contract.id).label('total_bookings'),
            func.avg(Contract.total_price).label('avg_booking_value')
        ).join(Item).filter(
            Item.category_id == category_id,
            Contract.created_at >= start_date,
            Contract.status != ContractStatus.CANCELLED
        ).first()
        
        # Топ товары по производительности
        top_performers = self.db.query(Item).filter(
            Item.category_id == category_id,
            Item.status == ItemStatus.ACTIVE
        ).order_by(
            desc(Item.rentals_count), 
            desc(Item.rating)
        ).limit(5).all()
        
        # Ценовые рекомендации для категории
        price_recommendations = self._analyze_category_pricing_trends(
            category_id, period_days
        )
        
        return {
            'category_id': category_id,
            'period_days': period_days,
            'basic_stats': {
                'total_items': category_stats.total_items or 0,
                'average_price': float(category_stats.avg_price or 0),
                'min_price': float(category_stats.min_price or 0),
                'max_price': float(category_stats.max_price or 0),
                'median_price': float(category_stats.median_price or 0)
            },
            'demand_stats': {
                'total_bookings': demand_stats.total_bookings or 0,
                'average_booking_value': float(demand_stats.avg_booking_value or 0)
            },
            'top_performers': [
                {
                    'id': item.id,
                    'title': item.title,
                    'price_per_day': float(item.price_per_day),
                    'rentals_count': item.rentals_count,
                    'rating': float(item.rating) if item.rating else None
                }
                for item in top_performers
            ],
            'pricing_insights': price_recommendations
        }
    
    def train_models(self) -> bool:
        """
        Обучить модели ценообразования на исторических данных.
        
        Returns:
            True если обучение прошло успешно
        """
        try:
            logger.info("Starting dynamic pricing model training...")
            
            # Получаем обучающие данные
            training_data = self._prepare_training_data()
            
            if len(training_data) < self.model_config['min_training_samples']:
                logger.warning(f"Insufficient training data: {len(training_data)} samples")
                return False
            
            # Подготавливаем признаки
            X, y_demand, y_price = self._prepare_features_and_targets(training_data)
            
            # Разделяем на обучающую и тестовую выборки
            X_train, X_test, y_demand_train, y_demand_test, y_price_train, y_price_test = train_test_split(
                X, y_demand, y_price, test_size=0.2, random_state=42
            )
            
            # Масштабируем признаки
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Обучаем модель предсказания спроса
            self.demand_model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )
            self.demand_model.fit(X_train_scaled, y_demand_train)
            
            # Обучаем модель оптимизации цены
            self.price_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            self.price_model.fit(X_train_scaled, y_price_train)
            
            # Оцениваем качество моделей
            demand_score = self.demand_model.score(X_test_scaled, y_demand_test)
            price_score = self.price_model.score(X_test_scaled, y_price_test)
            
            logger.info(f"Model performance - Demand: {demand_score:.3f}, Price: {price_score:.3f}")
            
            # Сохраняем модели
            self._save_models()
            
            logger.info("Dynamic pricing models trained successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error training pricing models: {e}")
            return False
    
    def _extract_item_features(self, item: Item, target_date: datetime) -> PricingFeatures:
        """Извлечь признаки для товара."""
        
        # Базовые характеристики
        item_age_days = (datetime.utcnow() - item.created_at).days
        condition_scores = {
            'new': 1.0, 'like_new': 0.9, 'good': 0.7, 'fair': 0.5, 'poor': 0.3
        }
        condition_score = condition_scores.get(str(item.condition).lower(), 0.7)
        
        # Популярность бренда
        brand_popularity = self._calculate_brand_popularity(item.brand) if item.brand else 0.5
        
        # Категорийная статистика
        category_stats = self._get_category_stats(item.category_id)
        
        # Конкуренция
        competition_density = self._calculate_competition_density(item)
        
        # Временные факторы
        season = self._get_season(target_date)
        
        # Спрос
        demand_metrics = self._calculate_demand_metrics(item.id)
        
        # Владелец
        owner_metrics = self._calculate_owner_metrics(item.owner_id)
        
        return PricingFeatures(
            item_id=item.id,
            category_id=item.category_id,
            current_price=float(item.price_per_day),
            item_age_days=item_age_days,
            item_condition_score=condition_score,
            has_images=bool(item.images),
            description_length=len(item.description or ''),
            brand_popularity_score=brand_popularity,
            views_count=item.views_count or 0,
            favorites_count=item.favorites_count or 0,
            total_reviews=item.total_reviews or 0,
            average_rating=float(item.rating or 0),
            rental_history_count=item.rentals_count or 0,
            season=season,
            month=target_date.month,
            day_of_week=target_date.weekday(),
            is_holiday=self._is_holiday(target_date),
            is_weekend=target_date.weekday() >= 5,
            category_avg_price=category_stats['avg_price'],
            category_median_price=category_stats['median_price'],
            similar_items_count=category_stats['total_items'],
            competition_density=competition_density,
            location_demand_score=self._calculate_location_demand(item.location),
            recent_search_count=demand_metrics['search_count'],
            booking_rate_7d=demand_metrics['booking_rate_7d'],
            booking_rate_30d=demand_metrics['booking_rate_30d'],
            cancellation_rate=demand_metrics['cancellation_rate'],
            owner_rating=owner_metrics['rating'],
            owner_total_items=owner_metrics['total_items'],
            owner_completion_rate=owner_metrics['completion_rate'],
            owner_response_time_score=owner_metrics['response_score']
        )
    
    def _predict_demand(self, features: PricingFeatures) -> float:
        """Предсказать спрос на товар."""
        if not self.demand_model:
            return 0.5  # Базовое значение
        
        feature_vector = self._features_to_vector(features)
        feature_vector_scaled = self.scaler.transform([feature_vector])
        
        demand_prediction = self.demand_model.predict(feature_vector_scaled)[0]
        return max(0.0, min(1.0, demand_prediction))  # Ограничиваем от 0 до 1
    
    def _predict_optimal_price(self, features: PricingFeatures, predicted_demand: float) -> float:
        """Предсказать оптимальную цену."""
        if not self.price_model:
            return features.current_price
        
        feature_vector = self._features_to_vector(features)
        feature_vector.append(predicted_demand)  # Добавляем предсказанный спрос
        
        feature_vector_scaled = self.scaler.transform([feature_vector])
        price_prediction = self.price_model.predict(feature_vector_scaled)[0]
        
        return max(0.01, price_prediction)  # Минимальная цена
    
    def _analyze_competition(self, item: Item) -> Dict[str, Any]:
        """Анализ конкуренции для товара."""
        # Получаем похожие товары
        similar_items = self.db.query(Item).filter(
            Item.category_id == item.category_id,
            Item.id != item.id,
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).all()
        
        if not similar_items:
            return {
                'competitor_count': 0,
                'avg_price': float(item.price_per_day),
                'price_position': 'unique',
                'price_adjustment': 0
            }
        
        prices = [float(i.price_per_day) for i in similar_items]
        avg_price = np.mean(prices)
        median_price = np.median(prices)
        
        current_price = float(item.price_per_day)
        price_percentile = len([p for p in prices if p < current_price]) / len(prices)
        
        # Определяем позицию
        if price_percentile >= 0.8:
            position = 'premium'
            adjustment = -0.05  # Небольшое снижение для премиум сегмента
        elif price_percentile <= 0.2:
            position = 'budget'
            adjustment = 0.1   # Увеличение для бюджетного сегмента
        else:
            position = 'competitive'
            adjustment = 0.02  # Небольшое увеличение
        
        return {
            'competitor_count': len(similar_items),
            'avg_price': avg_price,
            'median_price': median_price,
            'price_position': position,
            'price_percentile': price_percentile,
            'price_adjustment': adjustment
        }
    
    def _apply_pricing_adjustments(
        self, 
        item: Item, 
        base_price: float, 
        features: PricingFeatures,
        competition: Dict[str, Any]
    ) -> float:
        """Применить корректировки к базовой цене."""
        
        adjusted_price = base_price
        current_price = float(item.price_per_day)
        
        # Сезонная корректировка
        seasonal_factor = self.model_config['seasonal_factors'].get(features.season, 1.0)
        adjusted_price *= seasonal_factor
        
        # Корректировка на основе конкуренции
        adjusted_price += adjusted_price * competition.get('price_adjustment', 0)
        
        # Корректировка на основе спроса
        if features.booking_rate_30d > 0.8:  # Высокий спрос
            adjusted_price *= 1.1
        elif features.booking_rate_30d < 0.3:  # Низкий спрос
            adjusted_price *= 0.95
        
        # Корректировка на основе рейтинга
        if features.average_rating >= 4.5:
            adjusted_price *= 1.05
        elif features.average_rating < 3.0:
            adjusted_price *= 0.9
        
        # Ограничиваем максимальное изменение цены
        max_change = self.model_config['max_price_change']
        min_price = current_price * (1 - max_change)
        max_price = current_price * (1 + max_change)
        
        adjusted_price = max(min_price, min(max_price, adjusted_price))
        
        return round(adjusted_price, 2)
    
    def _generate_pricing_reasoning(
        self, 
        features: PricingFeatures, 
        competition: Dict[str, Any],
        price_change_pct: float
    ) -> List[str]:
        """Генерировать объяснения рекомендации."""
        reasoning = []
        
        # Анализ изменения цены
        if abs(price_change_pct) < 2:
            reasoning.append("Текущая цена близка к оптимальной")
        elif price_change_pct > 0:
            reasoning.append(f"Рекомендуется повышение цены на {price_change_pct:.1f}%")
        else:
            reasoning.append(f"Рекомендуется снижение цены на {abs(price_change_pct):.1f}%")
        
        # Сезонные факторы
        seasonal_factor = self.model_config['seasonal_factors'].get(features.season, 1.0)
        if seasonal_factor > 1.0:
            reasoning.append(f"Сезон {features.season} благоприятен для повышения цен")
        elif seasonal_factor < 1.0:
            reasoning.append(f"Сезон {features.season} требует более конкурентных цен")
        
        # Конкуренция
        if competition['competitor_count'] > 10:
            reasoning.append("Высокая конкуренция в категории")
        elif competition['competitor_count'] < 3:
            reasoning.append("Низкая конкуренция дает преимущество в ценообразовании")
        
        # Спрос
        if features.booking_rate_30d > 0.7:
            reasoning.append("Высокий спрос позволяет увеличить цену")
        elif features.booking_rate_30d < 0.3:
            reasoning.append("Низкий спрос требует более привлекательных цен")
        
        # Рейтинг
        if features.average_rating >= 4.5:
            reasoning.append("Высокий рейтинг оправдывает премиальную цену")
        elif features.average_rating < 3.5:
            reasoning.append("Рейтинг ниже среднего ограничивает ценовые возможности")
        
        return reasoning
    
    def _prepare_training_data(self) -> pd.DataFrame:
        """Подготовить данные для обучения."""
        
        # Получаем исторические данные о контрактах
        contracts_query = """
        SELECT 
            c.id as contract_id,
            c.item_id,
            c.total_price,
            c.start_date,
            c.end_date,
            c.created_at,
            c.status,
            i.price_per_day,
            i.category_id,
            i.condition,
            i.views_count,
            i.favorites_count,
            i.rating,
            i.total_reviews,
            i.rentals_count,
            i.location,
            i.brand,
            i.created_at as item_created_at,
            u.rating as owner_rating,
            u.completed_deals
        FROM contracts c
        JOIN items i ON c.item_id = i.id
        JOIN users u ON i.owner_id = u.id
        WHERE c.created_at >= NOW() - INTERVAL '6 months'
        AND c.status IN ('completed', 'active')
        """
        
        result = self.db.execute(text(contracts_query))
        data = result.fetchall()
        
        return pd.DataFrame(data, columns=result.keys())
    
    def _save_models(self):
        """Сохранить обученные модели."""
        joblib.dump(self.demand_model, os.path.join(self.model_path, 'demand_prediction_model.pkl'))
        joblib.dump(self.price_model, os.path.join(self.model_path, 'price_optimization_model.pkl'))
        joblib.dump(self.scaler, os.path.join(self.model_path, 'feature_scaler.pkl'))
        joblib.dump(self.label_encoders, os.path.join(self.model_path, 'label_encoders.pkl'))
    
    # Вспомогательные методы
    def _get_season(self, date: datetime) -> str:
        """Определить сезон по дате."""
        month = date.month
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'autumn'
    
    def _is_holiday(self, date: datetime) -> bool:
        """Проверить, является ли дата праздником."""
        # Упрощенная проверка - можно расширить
        return date.month == 12 and date.day in [25, 31] or date.month == 1 and date.day == 1
    
    def _get_category_stats(self, category_id: uuid.UUID) -> Dict[str, float]:
        """Получить статистику по категории."""
        cache_key = f"category_stats_{category_id}"
        
        if cache_key in self._cache and self._cache_expiry.get(cache_key, 0) > datetime.utcnow().timestamp():
            return self._cache[cache_key]
        
        stats = self.db.query(
            func.count(Item.id).label('total_items'),
            func.avg(Item.price_per_day).label('avg_price'),
            func.percentile_cont(0.5).within_group(Item.price_per_day).label('median_price')
        ).filter(
            Item.category_id == category_id,
            Item.status == ItemStatus.ACTIVE
        ).first()
        
        result = {
            'total_items': stats.total_items or 0,
            'avg_price': float(stats.avg_price or 0),
            'median_price': float(stats.median_price or 0)
        }
        
        # Кешируем на 1 час
        self._cache[cache_key] = result
        self._cache_expiry[cache_key] = datetime.utcnow().timestamp() + 3600
        
        return result
    
    def _calculate_brand_popularity(self, brand: str) -> float:
        """Рассчитать популярность бренда."""
        if not brand:
            return 0.5
        
        brand_items = self.db.query(func.count(Item.id)).filter(
            Item.brand.ilike(f"%{brand}%"),
            Item.status == ItemStatus.ACTIVE
        ).scalar() or 0
        
        total_items = self.db.query(func.count(Item.id)).filter(
            Item.status == ItemStatus.ACTIVE
        ).scalar() or 1
        
        popularity = min(brand_items / total_items * 10, 1.0)  # Нормализуем от 0 до 1
        return popularity
    
    def _calculate_competition_density(self, item: Item) -> float:
        """Рассчитать плотность конкуренции."""
        # Конкуренты в той же категории и ценовом диапазоне
        price_range = float(item.price_per_day) * 0.3  # ±30% от цены
        min_price = float(item.price_per_day) - price_range
        max_price = float(item.price_per_day) + price_range
        
        competitors = self.db.query(func.count(Item.id)).filter(
            Item.category_id == item.category_id,
            Item.id != item.id,
            Item.price_per_day.between(min_price, max_price),
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).scalar() or 0
        
        # Нормализуем плотность (0-1, где 1 = очень высокая конкуренция)
        return min(competitors / 20.0, 1.0)
    
    def _calculate_location_demand(self, location: Optional[str]) -> float:
        """Рассчитать спрос по локации."""
        if not location:
            return 0.5
        
        # Подсчитываем активность в данной локации
        location_activity = self.db.query(func.count(Contract.id)).join(Item).filter(
            Item.location.ilike(f"%{location}%"),
            Contract.status.in_([ContractStatus.COMPLETED, ContractStatus.ACTIVE]),
            Contract.created_at >= datetime.utcnow() - timedelta(days=90)
        ).scalar() or 0
        
        # Нормализуем (предполагаем, что 50+ сделок = высокий спрос)
        return min(location_activity / 50.0, 1.0)
    
    def _calculate_demand_metrics(self, item_id: uuid.UUID) -> Dict[str, float]:
        """Рассчитать метрики спроса для товара."""
        
        # Букинги за последние 7 и 30 дней
        bookings_7d = self.db.query(func.count(Contract.id)).filter(
            Contract.item_id == item_id,
            Contract.created_at >= datetime.utcnow() - timedelta(days=7),
            Contract.status != ContractStatus.CANCELLED
        ).scalar() or 0
        
        bookings_30d = self.db.query(func.count(Contract.id)).filter(
            Contract.item_id == item_id,
            Contract.created_at >= datetime.utcnow() - timedelta(days=30),
            Contract.status != ContractStatus.CANCELLED
        ).scalar() or 0
        
        # Отмены
        cancellations = self.db.query(func.count(Contract.id)).filter(
            Contract.item_id == item_id,
            Contract.status == ContractStatus.CANCELLED,
            Contract.created_at >= datetime.utcnow() - timedelta(days=90)
        ).scalar() or 0
        
        total_contracts = self.db.query(func.count(Contract.id)).filter(
            Contract.item_id == item_id,
            Contract.created_at >= datetime.utcnow() - timedelta(days=90)
        ).scalar() or 1
        
        return {
            'search_count': 0,  # TODO: Implement search tracking
            'booking_rate_7d': min(bookings_7d / 7.0, 1.0),
            'booking_rate_30d': min(bookings_30d / 30.0, 1.0),
            'cancellation_rate': cancellations / total_contracts
        }
    
    def _calculate_owner_metrics(self, owner_id: uuid.UUID) -> Dict[str, float]:
        """Рассчитать метрики владельца."""
        owner = self.db.query(User).filter(User.id == owner_id).first()
        
        if not owner:
            return {
                'rating': 0.0,
                'total_items': 0,
                'completion_rate': 0.0,
                'response_score': 0.5
            }
        
        total_items = self.db.query(func.count(Item.id)).filter(
            Item.owner_id == owner_id,
            Item.status != ItemStatus.ARCHIVED
        ).scalar() or 0
        
        # Коэффициент завершения сделок
        total_contracts = self.db.query(func.count(Contract.id)).filter(
            Contract.owner_id == owner_id
        ).scalar() or 1
        
        completed_contracts = self.db.query(func.count(Contract.id)).filter(
            Contract.owner_id == owner_id,
            Contract.status == ContractStatus.COMPLETED
        ).scalar() or 0
        
        completion_rate = completed_contracts / total_contracts
        
        return {
            'rating': float(owner.rating or 0),
            'total_items': total_items,
            'completion_rate': completion_rate,
            'response_score': 0.8  # TODO: Implement response time tracking
        }
    
    def _features_to_vector(self, features: PricingFeatures) -> List[float]:
        """Преобразовать признаки в вектор для ML модели."""
        return [
            features.current_price,
            features.item_age_days,
            features.item_condition_score,
            1.0 if features.has_images else 0.0,
            features.description_length,
            features.brand_popularity_score,
            features.views_count,
            features.favorites_count,
            features.total_reviews,
            features.average_rating,
            features.rental_history_count,
            features.month,
            features.day_of_week,
            1.0 if features.is_holiday else 0.0,
            1.0 if features.is_weekend else 0.0,
            features.category_avg_price,
            features.category_median_price,
            features.similar_items_count,
            features.competition_density,
            features.location_demand_score,
            features.recent_search_count,
            features.booking_rate_7d,
            features.booking_rate_30d,
            features.cancellation_rate,
            features.owner_rating,
            features.owner_total_items,
            features.owner_completion_rate,
            features.owner_response_time_score
        ]
    
    def _prepare_features_and_targets(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Подготовить признаки и целевые переменные."""
        features = []
        demand_targets = []
        price_targets = []
        
        for _, row in data.iterrows():
            # Создаем объект PricingFeatures для каждой записи
            item_features = PricingFeatures(
                item_id=row['item_id'],
                category_id=row['category_id'],
                current_price=float(row['price_per_day']),
                item_age_days=(row['created_at'] - row['item_created_at']).days,
                item_condition_score=0.7,  # Упрощенно
                has_images=True,  # Упрощенно
                description_length=100,  # Упрощенно
                brand_popularity_score=0.5,  # Упрощенно
                views_count=row['views_count'] or 0,
                favorites_count=row['favorites_count'] or 0,
                total_reviews=row['total_reviews'] or 0,
                average_rating=float(row['rating'] or 0),
                rental_history_count=row['rentals_count'] or 0,
                season=self._get_season(row['created_at']),
                month=row['created_at'].month,
                day_of_week=row['created_at'].weekday(),
                is_holiday=self._is_holiday(row['created_at']),
                is_weekend=row['created_at'].weekday() >= 5,
                category_avg_price=float(row['price_per_day']),  # Упрощенно
                category_median_price=float(row['price_per_day']),  # Упрощенно
                similar_items_count=10,  # Упрощенно
                competition_density=0.5,  # Упрощенно
                location_demand_score=0.5,  # Упрощенно
                recent_search_count=0,
                booking_rate_7d=0.1,  # Упрощенно
                booking_rate_30d=0.3,  # Упрощенно
                cancellation_rate=0.1,  # Упрощенно
                owner_rating=float(row['owner_rating'] or 0),
                owner_total_items=1,  # Упрощенно
                owner_completion_rate=0.8,  # Упрощенно
                owner_response_time_score=0.7  # Упрощенно
            )
            
            feature_vector = self._features_to_vector(item_features)
            features.append(feature_vector)
            
            # Целевые переменные
            # Спрос (0-1, основанный на том, был ли товар арендован)
            demand = 1.0 if row['status'] == 'completed' else 0.5
            demand_targets.append(demand)
            
            # Оптимальная цена (используем общую цену сделки как ориентир)
            optimal_price = float(row['total_price']) / max((row['end_date'] - row['start_date']).days, 1)
            price_targets.append(optimal_price)
        
        return np.array(features), np.array(demand_targets), np.array(price_targets)
    
    def _determine_market_position(self, price: float, avg_market_price: float) -> str:
        """Определить рыночную позицию товара."""
        ratio = price / avg_market_price if avg_market_price > 0 else 1.0
        
        if ratio >= 1.2:
            return 'premium'
        elif ratio <= 0.8:
            return 'budget'
        else:
            return 'competitive'
    
    def _calculate_confidence_score(self, features: PricingFeatures) -> float:
        """Рассчитать уровень уверенности в рекомендации."""
        confidence = 0.5  # Базовый уровень
        
        # Увеличиваем уверенность на основе данных
        if features.total_reviews > 5:
            confidence += 0.1
        if features.rental_history_count > 3:
            confidence += 0.1
        if features.views_count > 50:
            confidence += 0.1
        if features.similar_items_count > 5:
            confidence += 0.1
        if features.owner_rating > 4.0:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _get_seasonal_factor(self, date: datetime) -> float:
        """Получить сезонный коэффициент."""
        season = self._get_season(date)
        return self.model_config['seasonal_factors'].get(season, 1.0)
    
    def _estimate_booking_increase(self, price_change_pct: float, demand: float) -> float:
        """Оценить увеличение букингов."""
        # Эластичность спроса по цене (упрощенная модель)
        price_elasticity = -1.5  # Эластичный спрос
        
        if price_change_pct == 0:
            return 0.0
        
        # Изменение спроса = эластичность * изменение цены
        demand_change = price_elasticity * (price_change_pct / 100)
        
        # Корректируем на текущий уровень спроса
        booking_increase = demand_change * demand
        
        return booking_increase
    
    def _estimate_revenue_change(self, current_price: float, new_price: float, demand: float) -> float:
        """Оценить изменение выручки."""
        price_change_pct = ((new_price - current_price) / current_price) * 100
        booking_change = self._estimate_booking_increase(price_change_pct, demand)
        
        # Новая выручка = новая цена * (текущие букинги * (1 + изменение букингов))
        current_bookings = 10  # Предполагаемое количество букингов в месяц
        new_bookings = current_bookings * (1 + booking_change)
        
        current_revenue = current_price * current_bookings
        new_revenue = new_price * new_bookings
        
        revenue_change_pct = ((new_revenue - current_revenue) / current_revenue) * 100
        return revenue_change_pct
    
    def _assess_pricing_risk(self, price_change_pct: float, features: PricingFeatures) -> str:
        """Оценить риск изменения цены."""
        risk_factors = 0
        
        # Высокое изменение цены
        if abs(price_change_pct) > 20:
            risk_factors += 2
        elif abs(price_change_pct) > 10:
            risk_factors += 1
        
        # Высокая конкуренция
        if features.competition_density > 0.7:
            risk_factors += 1
        
        # Низкий рейтинг
        if features.average_rating < 3.5:
            risk_factors += 1
        
        # Низкий спрос
        if features.booking_rate_30d < 0.3:
            risk_factors += 1
        
        if risk_factors >= 3:
            return 'high'
        elif risk_factors >= 1:
            return 'medium'
        else:
            return 'low'
    
    def _analyze_category_pricing_trends(self, category_id: uuid.UUID, period_days: int) -> Dict[str, Any]:
        """Анализ трендов ценообразования в категории."""
        start_date = datetime.utcnow() - timedelta(days=period_days)
        
        # Средние цены по периодам
        price_trends = self.db.execute(text("""
            SELECT 
                DATE_TRUNC('week', created_at) as week,
                AVG(price_per_day) as avg_price,
                COUNT(*) as items_count
            FROM items 
            WHERE category_id = :category_id 
            AND created_at >= :start_date
            AND status = 'active'
            GROUP BY DATE_TRUNC('week', created_at)
            ORDER BY week
        """), {
            'category_id': str(category_id),
            'start_date': start_date
        }).fetchall()
        
        trends_data = [
            {
                'week': row.week.isoformat(),
                'avg_price': float(row.avg_price),
                'items_count': row.items_count
            }
            for row in price_trends
        ]
        
        # Рекомендации по категории
        if len(trends_data) > 1:
            recent_avg = trends_data[-1]['avg_price']
            previous_avg = trends_data[-2]['avg_price']
            trend = 'increasing' if recent_avg > previous_avg else 'decreasing'
        else:
            trend = 'stable'
        
        return {
            'price_trends': trends_data,
            'trend_direction': trend,
            'recommendations': self._generate_category_recommendations(trend, trends_data)
        }
    
    def _generate_category_recommendations(self, trend: str, trends_data: List[Dict]) -> List[str]:
        """Генерировать рекомендации для категории."""
        recommendations = []
        
        if trend == 'increasing':
            recommendations.append("Цены в категории растут - рассмотрите повышение цен")
            recommendations.append("Высокий спрос позволяет устанавливать премиальные цены")
        elif trend == 'decreasing':
            recommendations.append("Цены в категории снижаются - будьте осторожны с повышением")
            recommendations.append("Рассмотрите конкурентное ценообразование")
        else:
            recommendations.append("Стабильный рынок - фокусируйтесь на качестве предложения")
        
        return recommendations