"""
Notification model for user notifications.
"""

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, JSON,
    ForeignKey, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.models.base import Base


class NotificationType(str, enum.Enum):
    """Notification types."""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    
    # Rental and contract notifications
    RENTAL_REQUEST = "rental_request"
    CONTRACT_SIGNED = "contract_signed"
    CONTRACT_UPDATE = "contract_update"  # Добавляем этот тип
    CONTRACT_ACTIVATED = "contract_activated"
    CONTRACT_COMPLETED = "contract_completed"
    CONTRACT_CANCELLED = "contract_cancelled"
    
    # Payment notifications
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_PENDING = "payment_pending"
    
    # Dispute notifications
    DISPUTE_CREATED = "dispute_created"
    DISPUTE_RESOLVED = "dispute_resolved"
    
    # Item notifications
    ITEM_APPROVED = "item_approved"
    ITEM_REJECTED = "item_rejected"
    ITEM_FEATURED = "item_featured"
    
    # User notifications
    USER_VERIFIED = "user_verified"
    WELCOME = "welcome"
    
    # System notifications
    SYSTEM_UPDATE = "system_update"
    MAINTENANCE = "maintenance"


class Notification(Base):
    """Notification model."""
    
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Notification content
    title = Column(String(200), nullable=False)
    message = Column(Text)
    type = Column(SQLEnum(NotificationType), default=NotificationType.INFO)
    
    # Action
    action_url = Column(String(500))  # URL for notification action
    action_text = Column(String(100))  # Text for action button
    
    # Status
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)  # For email/push notifications
    
    # meta_info
    data = Column(JSON, default=dict)  # Additional notification data
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True))
    sent_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type})>"