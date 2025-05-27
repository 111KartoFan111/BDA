"""
Item model for rental items.
"""

from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Integer, 
    Numeric, JSON, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum

from app.models.base import Base


class ItemStatus(str, enum.Enum):
    """Item status."""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    RENTED = "rented"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class ItemCondition(str, enum.Enum):
    """Item condition."""
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class Item(Base):
    """Item model for rental items."""
    
    __tablename__ = "items"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic information
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    
    # Owner
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Pricing
    price_per_day = Column(Numeric(20, 8), nullable=False)  # In ETH
    deposit = Column(Numeric(20, 8), default=0)  # Security deposit
    currency = Column(String(10), default="ETH")
    
    # Availability
    available_from = Column(DateTime(timezone=True))
    available_to = Column(DateTime(timezone=True))
    min_rental_days = Column(Integer, default=1)
    max_rental_days = Column(Integer, default=30)
    
    # Location
    location = Column(String(200))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    
    # Item details
    condition = Column(SQLEnum(ItemCondition), default=ItemCondition.GOOD)
    brand = Column(String(100))
    model = Column(String(100))
    year = Column(Integer)
    
    # Media
    images = Column(JSON, default=list)  # List of image URLs
    documents = Column(JSON, default=list)  # List of document URLs
    
    # Status and visibility
    status = Column(SQLEnum(ItemStatus), default=ItemStatus.DRAFT)
    is_featured = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    
    # SEO and search
    slug = Column(String(250), unique=True, index=True)
    tags = Column(JSON, default=list)  # Search tags
    
    # Statistics
    views_count = Column(Integer, default=0)
    favorites_count = Column(Integer, default=0)
    rentals_count = Column(Integer, default=0)
    rating = Column(Numeric(3, 2))  # Average rating
    total_reviews = Column(Integer, default=0)
    
    # Terms and conditions
    terms = Column(Text)  # Special terms for this item
    
    # Moderation
    is_approved = Column(Boolean, default=False)
    approved_at = Column(DateTime(timezone=True))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    rejection_reason = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    
    # Relationships - Fixed with explicit foreign_keys
    owner = relationship(
        "User", 
        foreign_keys=[owner_id], 
        back_populates="items"
    )
    
    # Admin who approved this item
    approver = relationship(
        "User",
        foreign_keys=[approved_by],
        back_populates="approved_items"
    )
    
    category = relationship("Category", back_populates="items")
    contracts = relationship("Contract", back_populates="item")
    reviews = relationship("Review", back_populates="item", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="item", cascade="all, delete-orphan")
    views = relationship("ItemView", back_populates="item", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Item(id={self.id}, title={self.title})>"
    
    @property
    def is_active(self):
        """Check if item is active and available."""
        return (
            self.status == ItemStatus.ACTIVE and 
            self.is_available and 
            self.is_approved
        )
    
    @property
    def primary_image(self):
        """Get primary image URL."""
        return self.images[0] if self.images else None
    
    @property
    def price_range(self):
        """Get price range for rental period."""
        min_price = self.price_per_day * self.min_rental_days
        max_price = self.price_per_day * self.max_rental_days
        return {"min": min_price, "max": max_price}


class Category(Base):
    """Category model for item categorization."""
    
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text)
    icon = Column(String(100))  # Icon name or URL
    image = Column(String(200))  # Category image URL
    
    # Hierarchy
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    level = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # SEO
    meta_title = Column(String(200))
    meta_description = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")
    items = relationship("Item", back_populates="category")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name={self.name})>"


class Favorite(Base):
    """User favorites model."""
    
    __tablename__ = "favorites"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    item = relationship("Item", back_populates="favorites")
    
    __table_args__ = (
        {"schema": None},
    )


class ItemView(Base):
    """Item view tracking model."""
    
    __tablename__ = "item_views"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))  # Optional for guests
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(String(500))
    referrer = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    item = relationship("Item", back_populates="views")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ItemView(id={self.id}, item_id={self.item_id})>"


class Review(Base):
    """Item review model."""
    
    __tablename__ = "reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id = Column(UUID(as_uuid=True), ForeignKey("items.id"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"))
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200))
    comment = Column(Text)
    
    # Review categories (optional detailed ratings)
    ratings = Column(JSON, default=dict)  # {"quality": 5, "description": 4, etc.}
    
    # Moderation
    is_approved = Column(Boolean, default=True)
    is_hidden = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    item = relationship("Item", back_populates="reviews")
    reviewer = relationship("User")
    contract = relationship("Contract")
    
    def __repr__(self):
        return f"<Review(id={self.id}, rating={self.rating})>"