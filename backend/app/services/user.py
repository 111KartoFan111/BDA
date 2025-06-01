"""
User service for managing user operations.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
from datetime import datetime
import uuid

from app.models.user import User, UserStatus, UserRole
from app.models.item import Item, ItemStatus
from app.models.contract import Contract, ContractStatus
from app.schemas.user import UserUpdate, UserStats, UserProfile
from app.schemas.common import PaginatedResponse, PaginationMeta
from app.utils.exceptions import NotFoundError, ForbiddenError


class UserService:
    """Service for managing users."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        НОВЫЙ МЕТОД для поиска пользователя по email
        
        Args:
            email: User email
            
        Returns:
            User object or None
        """
        return self.db.query(User).filter(
            User.email == email.lower().strip(),
            User.status == UserStatus.ACTIVE
        ).first()
    
    def get_user_profile(self, user_id: uuid.UUID) -> UserProfile:
        """
        Get user profile with extended information.
        
        Args:
            user_id: User ID
            
        Returns:
            User profile
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        # Get additional stats
        items_count = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status != ItemStatus.ARCHIVED
        ).count()
        
        active_contracts = self.db.query(Contract).filter(
            or_(Contract.tenant_id == user_id, Contract.owner_id == user_id),
            Contract.status == ContractStatus.ACTIVE
        ).count()
        
        # Create profile
        profile = UserProfile(
            **user.__dict__,
            items_count=items_count,
            active_contracts=active_contracts,
            followers_count=0,  # TODO: implement followers system
            following_count=0   # TODO: implement following system
        )
        
        return profile
    
    def get_public_user_profile(self, user_id: uuid.UUID) -> Optional[UserProfile]:
        """
        Get public user profile (limited information).
        
        Args:
            user_id: User ID
            
        Returns:
            Public user profile or None
        """
        user = self.get_user_by_id(user_id)
        if not user or user.status != UserStatus.ACTIVE:
            return None
        
        # Only return public information
        items_count = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status == ItemStatus.ACTIVE,
            Item.is_approved == True
        ).count()
        
        profile = UserProfile(
            id=user.id,
            email="",  # Hide email for privacy
            first_name=user.first_name,
            last_name=user.last_name,
            avatar=user.avatar,
            bio=user.bio,
            location=user.location,
            is_verified=user.is_verified,
            rating=user.rating,
            total_reviews=user.total_reviews,
            completed_deals=user.completed_deals,
            created_at=user.created_at,
            items_count=items_count,
            active_contracts=0,  # Hide for privacy
            followers_count=0,
            following_count=0
        )
        
        return profile
    
    def update_user(self, user_id: uuid.UUID, user_data: UserUpdate) -> User:
        """
        Update user information.
        
        Args:
            user_id: User ID
            user_data: User update data
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_user_stats(self, user_id: uuid.UUID) -> UserStats:
        """
        Get user statistics.
        
        Args:
            user_id: User ID
            
        Returns:
            User statistics
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        # Count items
        total_items = self.db.query(Item).filter(Item.owner_id == user_id).count()
        active_items = self.db.query(Item).filter(
            Item.owner_id == user_id,
            Item.status == ItemStatus.ACTIVE
        ).count()
        
        # Count contracts
        total_contracts = self.db.query(Contract).filter(
            or_(Contract.tenant_id == user_id, Contract.owner_id == user_id)
        ).count()
        
        active_contracts = self.db.query(Contract).filter(
            or_(Contract.tenant_id == user_id, Contract.owner_id == user_id),
            Contract.status == ContractStatus.ACTIVE
        ).count()
        
        completed_contracts = self.db.query(Contract).filter(
            or_(Contract.tenant_id == user_id, Contract.owner_id == user_id),
            Contract.status == ContractStatus.COMPLETED
        ).count()
        
        # Calculate earnings (as owner)
        earnings_result = self.db.query(func.sum(Contract.total_price)).filter(
            Contract.owner_id == user_id,
            Contract.status == ContractStatus.COMPLETED
        ).scalar()
        
        total_earnings = float(earnings_result) if earnings_result else 0.0
        
        stats = UserStats(
            total_items=total_items,
            active_items=active_items,
            total_contracts=total_contracts,
            active_contracts=active_contracts,
            completed_contracts=completed_contracts,
            total_earnings=total_earnings,
            average_rating=float(user.rating) if user.rating else None,
            total_reviews=user.total_reviews
        )
        
        return stats
    
    def get_users(
        self, 
        page: int = 1, 
        size: int = 20, 
        search: Optional[str] = None
    ) -> PaginatedResponse:
        """
        Get users list with pagination and search.
        
        Args:
            page: Page number
            size: Page size
            search: Search query
            
        Returns:
            Paginated users
        """
        query = self.db.query(User)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Order by creation date
        query = query.order_by(desc(User.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        users = query.offset(offset).limit(size).all()
        
        # Calculate pagination meta
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=users,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def verify_user(self, user_id: uuid.UUID) -> User:
        """
        Verify user account.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        user.is_verified = True
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def suspend_user(self, user_id: uuid.UUID, reason: str) -> User:
        """
        Suspend user account.
        
        Args:
            user_id: User ID
            reason: Suspension reason
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        if user.role == UserRole.ADMIN:
            raise ForbiddenError("Cannot suspend admin user")
        
        user.status = UserStatus.SUSPENDED
        user.updated_at = datetime.utcnow()
        
        # Store suspension info in settings
        if not user.settings:
            user.settings = {}
        user.settings["suspension_reason"] = reason
        user.settings["suspended_at"] = datetime.utcnow().isoformat()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def unsuspend_user(self, user_id: uuid.UUID) -> User:
        """
        Unsuspend user account.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.utcnow()
        
        # Remove suspension info
        if user.settings:
            user.settings.pop("suspension_reason", None)
            user.settings.pop("suspended_at", None)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def update_user_rating(self, user_id: uuid.UUID, new_rating: float, review_count: int) -> User:
        """
        Update user rating based on new review.
        
        Args:
            user_id: User ID
            new_rating: New rating to add
            review_count: Current review count
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        # Calculate new average rating
        if user.rating and user.total_reviews > 0:
            total_rating = float(user.rating) * user.total_reviews + new_rating
            new_average = total_rating / (user.total_reviews + 1)
        else:
            new_average = new_rating
        
        user.rating = new_average
        user.total_reviews = (user.total_reviews or 0) + 1
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def increment_completed_deals(self, user_id: uuid.UUID) -> User:
        """
        Increment user's completed deals counter.
        
        Args:
            user_id: User ID
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        user.completed_deals = (user.completed_deals or 0) + 1
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def update_total_earnings(self, user_id: uuid.UUID, amount: float) -> User:
        """
        Update user's total earnings.
        
        Args:
            user_id: User ID
            amount: Amount to add to earnings
            
        Returns:
            Updated user
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))
        
        user.total_earnings = (user.total_earnings or 0) + amount
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_top_users(self, limit: int = 10, metric: str = "rating") -> List[User]:
        """
        Get top users by specified metric.
        
        Args:
            limit: Number of users to return
            metric: Metric to sort by (rating, deals, earnings)
            
        Returns:
            List of top users
        """
        query = self.db.query(User).filter(
            User.status == UserStatus.ACTIVE,
            User.is_verified == True
        )
        
        if metric == "rating":
            query = query.filter(User.rating.isnot(None)).order_by(desc(User.rating))
        elif metric == "deals":
            query = query.order_by(desc(User.completed_deals))
        elif metric == "earnings":
            query = query.order_by(desc(User.total_earnings))
        else:
            query = query.order_by(desc(User.created_at))
        
        return query.limit(limit).all()