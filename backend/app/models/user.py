"""
User model for the application.
"""

from sqlalchemy import (
    Column, String, Boolean, DateTime, Integer, Text, 
    Enum as SQLEnum, Numeric, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.models.base import Base


class UserRole(str, enum.Enum):
    """User roles."""
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"


class UserStatus(str, enum.Enum):
    """User status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class User(Base):
    """User model."""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic information
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone = Column(String(20), unique=True, index=True)
    
    # Authentication
    password_hash = Column(String, nullable=False)
    is_email_verified = Column(Boolean, default=False)
    is_phone_verified = Column(Boolean, default=False)
    
    # Profile
    avatar = Column(String)  # URL to avatar image
    bio = Column(Text)
    location = Column(String(100))
    website = Column(String(200))
    
    # Status and role
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    is_verified = Column(Boolean, default=False)  # Platform verification
    
    # Blockchain
    wallet_address = Column(String(42))  # Ethereum address
    
    # Settings
    settings = Column(JSON, default=dict)  # User preferences
    
    # Statistics
    rating = Column(Numeric(3, 2))  # Average rating (0.00 to 5.00)
    total_reviews = Column(Integer, default=0)
    completed_deals = Column(Integer, default=0)
    total_earnings = Column(Numeric(20, 8), default=0)  # In ETH
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    email_verified_at = Column(DateTime(timezone=True))
    phone_verified_at = Column(DateTime(timezone=True))
    
    # Relationships
    items = relationship("Item", back_populates="owner", cascade="all, delete-orphan")
    tenant_contracts = relationship(
        "Contract", 
        foreign_keys="Contract.tenant_id", 
        back_populates="tenant"
    )
    owner_contracts = relationship(
        "Contract", 
        foreign_keys="Contract.owner_id", 
        back_populates="owner"
    )
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
    
    @property
    def full_name(self):
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_admin(self):
        """Check if user is admin."""
        return self.role == UserRole.ADMIN
    
    @property
    def is_moderator(self):
        """Check if user is moderator."""
        return self.role in (UserRole.ADMIN, UserRole.MODERATOR)
    
    @property
    def is_active(self):
        """Check if user is active."""
        return self.status == UserStatus.ACTIVE