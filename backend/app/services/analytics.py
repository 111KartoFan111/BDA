"""
Analytics service for data analysis and ML predictions.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
from datetime import datetime, timedelta
import uuid
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os

from app.models.user import User, UserStatus
from app.models.item import Item, ItemStatus, Category, ItemView
from app.models.contract import Contract, ContractStatus
from app.core.config import settings


class AnalyticsService:
    """Service for analytics and ML operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.model_path = settings.MODEL_PATH
        os.makedirs(self.model_path, exist_ok=True)
    
    def get_dashboard_stats(self, period: str = "30d") -> Dict[str, Any]:
        """
        Get dashboard statistics for admin panel.
        
        Args:
            period: Time period (7d, 30d, 90d, 1y)
            
        Returns:
            Dashboard statistics
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Total counts
        total_users = self.db.query(User).count()
        total_items = self.db.query(Item).count()
        total_contracts = self.db.query(Contract).count()
        
        # Period counts
        new_users = self.db.query(User).filter(User.created_at >= start_date).count()
        new_items = self.db.query(Item).filter(Item.created_at >= start_date).count()
        new_contracts = self.db.query(Contract).filter(Contract.created_at >= start_date).count()
        
        # Active counts
        active_users = self.db.query(User).filter(User.status == UserStatus.ACTIVE).count()
        active_items = self.db.query(Item).filter(
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).count()
        active_contracts = self.db.query(Contract).filter(
            Contract.status == ContractStatus.ACTIVE
        ).count()
        
        # Revenue calculation
        completed_contracts = self.db.query(Contract).filter(
            Contract.status == ContractStatus.COMPLETED,
            Contract.completed_at >= start_date
        ).all()
        
        total_revenue = sum(float(contract.total_price) for contract in completed_contracts)
        
        # Completion rate
        period_contracts = self.db.query(Contract).filter(
            Contract.created_at >= start_date
        ).count()
        
        completion_rate = (len(completed_contracts) / period_contracts * 100) if period_contracts > 0 else 0
        
        return {
            "total_stats": {
                "users": total_users,
                "items": total_items,
                "contracts": total_contracts
            },
            "period_stats": {
                "new_users": new_users,
                "new_items": new_items,
                "new_contracts": new_contracts,
                "revenue": total_revenue,
                "completion_rate": completion_rate
            },
            "active_stats": {
                "users": active_users,
                "items": active_items,
                "contracts": active_contracts
            }
        }
    
    def get_popular_items(self, period: str = "30d", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get most popular items by views and rentals.
        
        Args:
            period: Time period
            limit: Number of items to return
            
        Returns:
            List of popular items
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get items with view counts in period
        items = self.db.query(Item).filter(
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).order_by(desc(Item.views_count)).limit(limit).all()
        
        result = []
        for item in items:
            # Count rentals in period
            rentals_count = self.db.query(Contract).filter(
                Contract.item_id == item.id,
                Contract.created_at >= start_date
            ).count()
            
            result.append({
                "id": item.id,
                "title": item.title,
                "price_per_day": float(item.price_per_day),
                "views_count": item.views_count,
                "rentals_count": rentals_count,
                "rating": float(item.rating) if item.rating else None,
                "owner": {
                    "id": item.owner.id,
                    "name": f"{item.owner.first_name} {item.owner.last_name}"
                }
            })
        
        return result
    
    def get_categories_stats(self, period: str = "30d") -> List[Dict[str, Any]]:
        """
        Get statistics by categories.
        
        Args:
            period: Time period
            
        Returns:
            Category statistics
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Query categories with item and contract counts
        result = self.db.query(
            Category.id,
            Category.name,
            func.count(Item.id).label('items_count'),
            func.count(Contract.id).label('contracts_count'),
            func.avg(Item.price_per_day).label('avg_price')
        ).outerjoin(
            Item, and_(
                Item.category_id == Category.id,
                Item.status == ItemStatus.ACTIVE,
                Item.is_approved == True
            )
        ).outerjoin(
            Contract, and_(
                Contract.item_id == Item.id,
                Contract.created_at >= start_date
            )
        ).filter(
            Category.is_active == True
        ).group_by(Category.id, Category.name).all()
        
        return [
            {
                "id": cat_id,
                "name": name,
                "items_count": items_count,
                "contracts_count": contracts_count,
                "average_price": float(avg_price) if avg_price else 0.0
            }
            for cat_id, name, items_count, contracts_count, avg_price in result
        ]
    
    def get_price_trends(self, category_id: Optional[uuid.UUID] = None, period: str = "30d") -> List[Dict[str, Any]]:
        """
        Get price trends over time.
        
        Args:
            category_id: Optional category filter
            period: Time period
            
        Returns:
            Price trends data
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Build query
        query = self.db.query(
            func.date_trunc('day', Item.created_at).label('date'),
            func.avg(Item.price_per_day).label('avg_price'),
            func.count(Item.id).label('items_count')
        ).filter(
            Item.created_at >= start_date,
            Item.status == ItemStatus.ACTIVE
        )
        
        if category_id:
            query = query.filter(Item.category_id == category_id)
        
        result = query.group_by(
            func.date_trunc('day', Item.created_at)
        ).order_by('date').all()
        
        return [
            {
                "date": date.isoformat(),
                "average_price": float(avg_price),
                "items_count": items_count
            }
            for date, avg_price, items_count in result
        ]
    
    def get_user_activity(self, period: str = "30d") -> List[Dict[str, Any]]:
        """
        Get user activity statistics.
        
        Args:
            period: Time period
            
        Returns:
            User activity data
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Daily user registrations
        registrations = self.db.query(
            func.date_trunc('day', User.created_at).label('date'),
            func.count(User.id).label('registrations')
        ).filter(
            User.created_at >= start_date
        ).group_by(
            func.date_trunc('day', User.created_at)
        ).order_by('date').all()
        
        # Daily logins (if you track last_login)
        logins = self.db.query(
            func.date_trunc('day', User.last_login).label('date'),
            func.count(User.id).label('logins')
        ).filter(
            User.last_login >= start_date
        ).group_by(
            func.date_trunc('day', User.last_login)
        ).order_by('date').all()
        
        # Combine data
        activity_data = {}
        
        for date, count in registrations:
            date_str = date.isoformat()
            activity_data[date_str] = {"date": date_str, "registrations": count, "logins": 0}
        
        for date, count in logins:
            date_str = date.isoformat()
            if date_str in activity_data:
                activity_data[date_str]["logins"] = count
            else:
                activity_data[date_str] = {"date": date_str, "registrations": 0, "logins": count}
        
        return list(activity_data.values())
    
    def get_user_retention(self, period: str = "30d") -> Dict[str, Any]:
        """
        Calculate user retention rates.
        
        Args:
            period: Time period
            
        Returns:
            Retention data
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get users who registered in the period
        new_users = self.db.query(User).filter(
            User.created_at >= start_date
        ).all()
        
        if not new_users:
            return {"retention_rate": 0, "cohort_data": []}
        
        # Calculate retention for different periods
        retention_periods = [7, 14, 30]  # days
        cohort_data = []
        
        for days_after in retention_periods:
            retained_count = 0
            check_date = datetime.utcnow() - timedelta(days=days_after)
            
            for user in new_users:
                if user.created_at <= check_date and user.last_login and user.last_login >= check_date:
                    retained_count += 1
            
            retention_rate = (retained_count / len(new_users)) * 100
            cohort_data.append({
                "period": f"{days_after}d",
                "retention_rate": retention_rate,
                "retained_users": retained_count,
                "total_users": len(new_users)
            })
        
        overall_retention = sum(data["retention_rate"] for data in cohort_data) / len(cohort_data)
        
        return {
            "retention_rate": overall_retention,
            "cohort_data": cohort_data
        }
    
    def get_contract_completion_rate(self, period: str = "30d") -> Dict[str, Any]:
        """
        Get contract completion rate statistics.
        
        Args:
            period: Time period
            
        Returns:
            Completion rate data
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get contracts created in period
        contracts = self.db.query(Contract).filter(
            Contract.created_at >= start_date
        ).all()
        
        if not contracts:
            return {"completion_rate": 0, "status_breakdown": {}}
        
        # Count by status
        status_counts = {}
        for contract in contracts:
            status = contract.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        completed_count = status_counts.get(ContractStatus.COMPLETED.value, 0)
        completion_rate = (completed_count / len(contracts)) * 100
        
        return {
            "completion_rate": completion_rate,
            "total_contracts": len(contracts),
            "completed_contracts": completed_count,
            "status_breakdown": status_counts
        }
    
    def get_revenue_analytics(self, period: str = "30d") -> Dict[str, Any]:
        """
        Get revenue analytics.
        
        Args:
            period: Time period
            
        Returns:
            Revenue data
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Daily revenue
        daily_revenue = self.db.query(
            func.date_trunc('day', Contract.completed_at).label('date'),
            func.sum(Contract.total_price).label('revenue'),
            func.count(Contract.id).label('contracts')
        ).filter(
            Contract.status == ContractStatus.COMPLETED,
            Contract.completed_at >= start_date
        ).group_by(
            func.date_trunc('day', Contract.completed_at)
        ).order_by('date').all()
        
        # Calculate totals
        total_revenue = sum(float(revenue) for _, revenue, _ in daily_revenue)
        total_contracts = sum(contracts for _, _, contracts in daily_revenue)
        
        # Average contract value
        avg_contract_value = total_revenue / total_contracts if total_contracts > 0 else 0
        
        # Revenue by category
        category_revenue = self.db.query(
            Category.name,
            func.sum(Contract.total_price).label('revenue')
        ).join(
            Item, Item.category_id == Category.id
        ).join(
            Contract, and_(
                Contract.item_id == Item.id,
                Contract.status == ContractStatus.COMPLETED,
                Contract.completed_at >= start_date
            )
        ).group_by(Category.name).all()
        
        return {
            "total_revenue": total_revenue,
            "total_contracts": total_contracts,
            "average_contract_value": avg_contract_value,
            "daily_revenue": [
                {
                    "date": date.isoformat(),
                    "revenue": float(revenue),
                    "contracts": contracts
                }
                for date, revenue, contracts in daily_revenue
            ],
            "category_revenue": [
                {
                    "category": name,
                    "revenue": float(revenue)
                }
                for name, revenue in category_revenue
            ]
        }
    
    def get_ml_predictions(
        self, 
        item_id: Optional[uuid.UUID] = None, 
        category_id: Optional[uuid.UUID] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get ML predictions for rental probability.
        
        Args:
            item_id: Specific item prediction
            category_id: Category predictions
            limit: Number of predictions
            
        Returns:
            List of predictions
        """
        try:
            # Load trained model
            model_file = os.path.join(self.model_path, "rental_prediction_model.pkl")
            scaler_file = os.path.join(self.model_path, "rental_prediction_scaler.pkl")
            
            if not os.path.exists(model_file) or not os.path.exists(scaler_file):
                # Train model if not exists
                self._train_rental_prediction_model()
            
            model = joblib.load(model_file)
            scaler = joblib.load(scaler_file)
            
            # Get items to predict
            query = self.db.query(Item).filter(
                Item.status == ItemStatus.ACTIVE,
                Item.is_approved == True
            )
            
            if item_id:
                query = query.filter(Item.id == item_id)
            elif category_id:
                query = query.filter(Item.category_id == category_id)
            
            items = query.limit(limit).all()
            
            predictions = []
            for item in items:
                # Prepare features
                features = self._prepare_item_features(item)
                features_scaled = scaler.transform([features])
                
                # Make prediction
                prob = model.predict_proba(features_scaled)[0][1]  # Probability of being rented
                
                predictions.append({
                    "item_id": item.id,
                    "title": item.title,
                    "rental_probability": float(prob),
                    "confidence": "high" if prob > 0.7 else "medium" if prob > 0.4 else "low",
                    "features": {
                        "price_per_day": float(item.price_per_day),
                        "views_count": item.views_count,
                        "rating": float(item.rating) if item.rating else 0,
                        "days_since_created": (datetime.utcnow() - item.created_at).days
                    }
                })
            
            # Sort by probability
            predictions.sort(key=lambda x: x["rental_probability"], reverse=True)
            
            return predictions
            
        except Exception as e:
            print(f"ML prediction error: {e}")
            return []
    
    def get_item_recommendations(self, user_id: uuid.UUID, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get ML-based item recommendations for user.
        
        Args:
            user_id: User ID
            limit: Number of recommendations
            
        Returns:
            List of recommended items
        """
        # Simple recommendation based on user's view history and popular items
        # In production, you'd use more sophisticated algorithms
        
        # Get user's viewed categories
        viewed_items = self.db.query(ItemView).filter(ItemView.user_id == user_id).all()
        viewed_categories = set()
        
        for view in viewed_items:
            item = self.db.query(Item).filter(Item.id == view.item_id).first()
            if item:
                viewed_categories.add(item.category_id)
        
        # Get popular items from those categories
        if viewed_categories:
            recommended_items = self.db.query(Item).filter(
                Item.category_id.in_(viewed_categories),
                Item.status == ItemStatus.ACTIVE,
                Item.is_approved == True
            ).order_by(desc(Item.views_count)).limit(limit).all()
        else:
            # Fallback to overall popular items
            recommended_items = self.db.query(Item).filter(
                Item.status == ItemStatus.ACTIVE,
                Item.is_approved == True
            ).order_by(desc(Item.views_count)).limit(limit).all()
        
        return [
            {
                "id": item.id,
                "title": item.title,
                "price_per_day": float(item.price_per_day),
                "rating": float(item.rating) if item.rating else None,
                "views_count": item.views_count,
                "recommendation_score": 0.8,  # Placeholder score
                "reason": "Based on your viewing history"
            }
            for item in recommended_items
        ]
    
    def retrain_ml_models(self, model_type: str = "all") -> Dict[str, Any]:
        """
        Retrain ML models with latest data.
        
        Args:
            model_type: Type of model to retrain
            
        Returns:
            Training results
        """
        results = {}
        
        if model_type in ["all", "rental_prediction"]:
            try:
                accuracy = self._train_rental_prediction_model()
                results["rental_prediction"] = {
                    "status": "success",
                    "accuracy": accuracy,
                    "trained_at": datetime.utcnow().isoformat()
                }
            except Exception as e:
                results["rental_prediction"] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return results
    
    def _train_rental_prediction_model(self) -> float:
        """
        Train rental prediction model.
        
        Returns:
            Model accuracy
        """
        # Get training data
        items = self.db.query(Item).filter(Item.created_at <= datetime.utcnow() - timedelta(days=7)).all()
        
        if len(items) < 10:
            raise ValueError("Not enough data for training")
        
        # Prepare features and labels
        features = []
        labels = []
        
        for item in items:
            # Check if item was rented
            was_rented = self.db.query(Contract).filter(
                Contract.item_id == item.id,
                Contract.status.in_([ContractStatus.COMPLETED, ContractStatus.ACTIVE])
            ).count() > 0
            
            # Extract features
            item_features = self._prepare_item_features(item)
            
            features.append(item_features)
            labels.append(1 if was_rented else 0)
        
        # Convert to numpy arrays
        X = np.array(features)
        y = np.array(labels)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = LogisticRegression(random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Calculate accuracy
        accuracy = model.score(X_test_scaled, y_test)
        
        # Save model and scaler
        model_file = os.path.join(self.model_path, "rental_prediction_model.pkl")
        scaler_file = os.path.join(self.model_path, "rental_prediction_scaler.pkl")
        
        joblib.dump(model, model_file)
        joblib.dump(scaler, scaler_file)
        
        return accuracy
    
    def _prepare_item_features(self, item: Item) -> List[float]:
        """
        Prepare features for ML model.
        
        Args:
            item: Item object
            
        Returns:
            List of features
        """
        # Feature engineering
        days_since_created = (datetime.utcnow() - item.created_at).days
        price_normalized = float(item.price_per_day) / 100.0  # Normalize price
        rating_score = float(item.rating) if item.rating else 0.0
        views_normalized = min(item.views_count / 100.0, 10.0)  # Cap and normalize views
        
        # Boolean features
        has_images = 1.0 if item.images else 0.0
        is_featured = 1.0 if item.is_featured else 0.0
        has_description = 1.0 if item.description and len(item.description) > 50 else 0.0
        
        return [
            price_normalized,
            rating_score,
            views_normalized,
            days_since_created,
            has_images,
            is_featured,
            has_description,
            float(item.total_reviews) if item.total_reviews else 0.0
        ]
    
    def get_geography_analytics(self, period: str = "30d") -> List[Dict[str, Any]]:
        """
        Get geography-based analytics.
        
        Args:
            period: Time period
            
        Returns:
            Geography statistics
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get items by location
        location_stats = self.db.query(
            Item.location,
            func.count(Item.id).label('items_count'),
            func.avg(Item.price_per_day).label('avg_price')
        ).filter(
            Item.location.isnot(None),
            Item.created_at >= start_date,
            Item.status == ItemStatus.ACTIVE
        ).group_by(Item.location).all()
        
        return [
            {
                "location": location,
                "items_count": items_count,
                "average_price": float(avg_price) if avg_price else 0.0
            }
            for location, items_count, avg_price in location_stats
        ]
    
    def get_search_trends(self, period: str = "30d", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get search trends (mock implementation).
        
        Args:
            period: Time period
            limit: Number of trends
            
        Returns:
            Search trends data
        """
        # This would require implementing search tracking
        # For now, return popular categories as proxy
        return self.get_categories_stats(period)[:limit]
    
    def get_user_analytics(self, user_id: uuid.UUID, period: str = "30d") -> Dict[str, Any]:
        """
        Get analytics for specific user.
        
        Args:
            user_id: User ID
            period: Time period
            
        Returns:
            User analytics
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # User's items performance
        items = self.db.query(Item).filter(Item.owner_id == user_id).all()
        
        total_views = sum(item.views_count for item in items)
        total_favorites = sum(item.favorites_count for item in items)
        
        # Contracts as owner
        owner_contracts = self.db.query(Contract).filter(
            Contract.owner_id == user_id,
            Contract.created_at >= start_date
        ).all()
        
        # Contracts as tenant
        tenant_contracts = self.db.query(Contract).filter(
            Contract.tenant_id == user_id,
            Contract.created_at >= start_date
        ).all()
        
        # Revenue calculation
        completed_as_owner = [c for c in owner_contracts if c.status == ContractStatus.COMPLETED]
        revenue = sum(float(c.total_price) for c in completed_as_owner)
        
        return {
            "user_id": user_id,
            "period": period,
            "items_stats": {
                "total_items": len(items),
                "total_views": total_views,
                "total_favorites": total_favorites,
                "average_price": sum(float(i.price_per_day) for i in items) / len(items) if items else 0
            },
            "contracts_stats": {
                "as_owner": len(owner_contracts),
                "as_tenant": len(tenant_contracts),
                "completed_as_owner": len(completed_as_owner),
                "revenue": revenue
            }
        }
    
    def get_user_items_performance(self, user_id: uuid.UUID, period: str = "30d") -> List[Dict[str, Any]]:
        """
        Get performance analytics for user's items.
        
        Args:
            user_id: User ID
            period: Time period
            
        Returns:
            Items performance data
        """
        days = self._parse_period(period)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        items = self.db.query(Item).filter(Item.owner_id == user_id).all()
        
        performance = []
        for item in items:
            # Views in period
            period_views = self.db.query(ItemView).filter(
                ItemView.item_id == item.id,
                ItemView.created_at >= start_date
            ).count()
            
            # Contracts in period
            period_contracts = self.db.query(Contract).filter(
                Contract.item_id == item.id,
                Contract.created_at >= start_date
            ).count()
            
            # Revenue in period
            completed_contracts = self.db.query(Contract).filter(
                Contract.item_id == item.id,
                Contract.status == ContractStatus.COMPLETED,
                Contract.completed_at >= start_date
            ).all()
            
            period_revenue = sum(float(c.total_price) for c in completed_contracts)
            
            performance.append({
                "item_id": item.id,
                "title": item.title,
                "price_per_day": float(item.price_per_day),
                "period_views": period_views,
                "period_contracts": period_contracts,
                "period_revenue": period_revenue,
                "conversion_rate": (period_contracts / period_views * 100) if period_views > 0 else 0
            })
        
        # Sort by revenue
        performance.sort(key=lambda x: x["period_revenue"], reverse=True)
        
        return performance
    
    def _parse_period(self, period: str) -> int:
        """
        Parse period string to days.
        
        Args:
            period: Period string (e.g., "30d", "1y")
            
        Returns:
            Number of days
        """
        if period == "7d":
            return 7
        elif period == "30d":
            return 30
        elif period == "90d":
            return 90
        elif period == "1y":
            return 365
        else:
            return 30  # Default to 30 days