"""
Notification service for managing user notifications.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid

from app.models.notification import Notification, NotificationType
from app.schemas.common import PaginatedResponse, PaginationMeta


class NotificationService:
    """Service for managing notifications."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification(
        self,
        user_id: uuid.UUID,
        title: str,
        message: str,
        type: str = "info",
        action_url: Optional[str] = None,
        action_text: Optional[str] = None,
        data: Optional[dict] = None
    ) -> Notification:
        """
        Create new notification.
        
        Args:
            user_id: User ID
            title: Notification title
            message: Notification message
            type: Notification type
            action_url: Optional action URL
            action_text: Optional action text
            data: Optional additional data
            
        Returns:
            Created notification
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=NotificationType(type),
            action_url=action_url,
            action_text=action_text,
            data=data or {}
        )
        
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        
        return notification
    
    def get_user_notifications(
        self,
        user_id: uuid.UUID,
        unread_only: bool = False,
        page: int = 1,
        size: int = 20
    ) -> PaginatedResponse:
        """
        Get user notifications.
        
        Args:
            user_id: User ID
            unread_only: Whether to return only unread notifications
            page: Page number
            size: Page size
            
        Returns:
            Paginated notifications
        """
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        query = query.order_by(desc(Notification.created_at))
        
        total = query.count()
        offset = (page - 1) * size
        notifications = query.offset(offset).limit(size).all()
        
        pages = (total + size - 1) // size
        
        return PaginatedResponse(
            items=notifications,
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages,
                has_next=page < pages,
                has_prev=page > 1
            )
        )
    
    def mark_notification_read(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        """
        Mark notification as read.
        
        Args:
            notification_id: Notification ID
            user_id: User ID
            
        Returns:
            True if marked as read
        """
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if not notification:
            return False
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def mark_all_notifications_read(self, user_id: uuid.UUID) -> int:
        """
        Mark all user notifications as read.
        
        Args:
            user_id: User ID
            
        Returns:
            Number of notifications marked as read
        """
        count = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        })
        
        self.db.commit()
        return count
    
    def delete_notification(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> bool:
        """
        Delete notification.
        
        Args:
            notification_id: Notification ID
            user_id: User ID
            
        Returns:
            True if deleted
        """
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if not notification:
            return False
        
        self.db.delete(notification)
        self.db.commit()
        
        return True
    
    def get_unread_count(self, user_id: uuid.UUID) -> int:
        """
        Get count of unread notifications.
        
        Args:
            user_id: User ID
            
        Returns:
            Count of unread notifications
        """
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()